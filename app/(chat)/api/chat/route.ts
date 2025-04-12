import {
  UIMessage,
  createDataStreamResponse,
  streamText,
  smoothStream,
  appendResponseMessages,
} from 'ai';
import { auth } from '@/app/(auth)/auth';
import {
  deleteChatById,
  getChatById,
  saveChat,
  saveMessages,
} from '@/lib/db/queries';
import {
  getMostRecentUserMessage,
  generateUUID,
  getTrailingMessageId,
} from '@/lib/utils';
import { generateTitleFromUserMessage } from '../../actions';
import { myProvider } from '@/lib/ai/providers';
import { z } from 'zod';
import { generateObject } from 'ai';
import { ManagedServerState } from '@/lib/mcp/mcp.types';
import { systemPrompt } from '@/lib/ai/prompts';
import { isProductionEnvironment } from '@/lib/constants';

export const maxDuration = 60
export const dynamic = "force-dynamic"

// --- Use Environment Variable for Bridge URL
const bridgeUrl = process.env.BACKEND_BRIDGE_URL || `http://registry:6279/api/bridge/chat`
console.info(`[API Route] Using bridge URL: ${bridgeUrl}`)

export async function POST(request: Request) {
  try {
    const {
      id,
      messages,
      selectedChatModel,
      primaryServerId,
      selectedTools,
      filteredServerStates,
    }: {
      id: string;
      messages: Array<UIMessage>;
      selectedChatModel: string;
      primaryServerId: string | null
      selectedTools?: string[]
      filteredServerStates: ManagedServerState[]
    } = await request.json();

    const session = await auth();

    if (!session || !session.user || !session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    const userMessage = getMostRecentUserMessage(messages);

    if (!userMessage) {
      return new Response('No user message found', { status: 400 });
    }

    const chat = await getChatById({ id });

    if (!chat) {
      const title = await generateTitleFromUserMessage({
        message: userMessage,
      });

      await saveChat({ id, userId: session.user.id, title });
    } else {
      if (chat.userId !== session.user.id) {
        return new Response('Unauthorized', { status: 401 });
      }
    }

    await saveMessages({
      messages: [
        {
          chatId: id,
          id: userMessage.id,
          role: 'user',
          parts: userMessage.parts,
          attachments: userMessage.experimental_attachments ?? [],
          createdAt: new Date(),
        },
      ],
    });

    // Classify the query to determine routing
    const { object: classification } = await generateObject({
      model: myProvider.languageModel("chat-model"),
      schema: z.object({
        // More granular classification with both category and target server
        category: z.enum(['general', 'tools']),
        // If category is 'tools', specify which server should handle it
        // If 'general', this will be null
        targetServer: z.string().nullable(),
        // Reasoning for the classification decision
        reasoning: z.string(),
      }),
      prompt: `Classify this user query:
      "${typeof userMessage.content === 'string' ? userMessage.content : 'User query'}"
  
      Determine how this message should be routed:
      
      1. If the user's intent can be satisfied with a general response without any specific tools, classify it as:
         - category: "general"
         - targetServer: null
      
      2. If the user's intent requires a specific tool, classify it as:
         - category: "tools"
         - targetServer: [specific server ID that has the required tool]
      
      Here are the available servers and their respective tools:
      ${Object.entries(filteredServerStates)
        .map(([serverId, state]) => {
          const toolNames = state.tools?.map(t => t.name).join(', ') || '';
          return `- Server ID: "${serverId}", Name: "${state.label}", Tools: [${toolNames}]`;
        })
        .join('\n')}
      
      Provide your reasoning for why you chose this classification.`,
    });

    console.log('Classification:', classification);

    // Based on classification, route the query
    if (classification.category === 'tools') {
      console.info(`[API Route] Routing to bridge for tool processing, target server: ${classification.targetServer}`);
      
      // Forward to bridge
      const bridgeRequestPayload = {
        prompt: typeof userMessage.content === "string" ? userMessage.content : "",
        history: messages.slice(0, -1),
        selectedTools: selectedTools ?? [],
        sessionId: id,
        // Pass the suggested server if available
        targetServer: classification.targetServer,
      }

      console.debug(`[API Route] Bridge Payload:`, JSON.stringify(bridgeRequestPayload))

      const bridgeResponse = await fetch(bridgeUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bridgeRequestPayload),
      })

      if (!bridgeResponse.ok) {
        const errorText = await bridgeResponse.text()
        console.error(
          `[API Route] Bridge request failed. Status: ${bridgeResponse.status}. Error: ${errorText}`,
        )
        return new Response(
          JSON.stringify({ error: `Backend bridge request failed: Status ${bridgeResponse.status} - ${errorText}` }),
          {
            status: 502,
            headers: { "Content-Type": "application/json" },
          },
        )
      }

      if (!bridgeResponse.body) {
        console.error(`[API Route] Bridge response body is null. Status: ${bridgeResponse.status}.`)
        throw new Error("Backend bridge returned empty response body.")
      }

      console.info(`[API Route] Received streaming response from bridge.`)

      return createDataStreamResponse({
        execute: async (dataWriter) => {
          try {
            const reader = bridgeResponse.body!.getReader()
            const decoder = new TextDecoder()
            let buffer = ""
            let assistantMessage = ""

            function processBuffer() {
              let boundary = buffer.indexOf("\n\n")
              while (boundary >= 0) {
                const message = buffer.substring(0, boundary)
                buffer = buffer.substring(boundary + 2)
                if (message.startsWith("data:")) {
                  const jsonData = message.substring("data:".length).trim()
                  if (jsonData) {
                    try {
                      const bridgeChunk = JSON.parse(jsonData)

                      // Map the bridge chunk types to AI SDK format
                      switch (bridgeChunk.type) {
                        case "text":
                          assistantMessage += bridgeChunk.value
                          dataWriter.write(`0:${JSON.stringify(bridgeChunk.value)}\n`)
                          break
                        case "tool_call":
                          dataWriter.write(
                            `2:${JSON.stringify([
                              {
                                type: "toolCall",
                                payload: {
                                  toolCallId: bridgeChunk.toolCallId,
                                  toolName: bridgeChunk.toolName,
                                  toolInput: bridgeChunk.args,
                                },
                              },
                            ])}\n`,
                          )
                          break
                        case "tool_result":
                          dataWriter.write(
                            `2:${JSON.stringify([
                              {
                                type: "toolResult",
                                payload: {
                                  toolCallId: bridgeChunk.toolCallId,
                                  output: bridgeChunk.content,
                                  isError: bridgeChunk.isError,
                                },
                              },
                            ])}\n`,
                          )
                          break
                        case "chatError":
                          dataWriter.write(
                            `2:${JSON.stringify([
                              {
                                type: "chatError",
                                payload: { message: bridgeChunk.message || "An error occurred" },
                              },
                            ])}\n`,
                          )
                          break
                        case "chatEnd":
                          dataWriter.write(
                            `2:${JSON.stringify([
                              {
                                type: "chatEnd",
                              },
                            ])}\n`,
                          )
                          break
                        default:
                          console.warn(`[API Route] Unknown chunk type from bridge: ${bridgeChunk.type}`)
                      }
                    } catch (parseError: any) {
                      console.error(
                        `[API Route] Failed to parse JSON from bridge stream: ${parseError.message}. Data: "${jsonData}"`,
                      )
                      throw new Error("Failed to parse stream data from backend.")
                    }
                  }
                }
                boundary = buffer.indexOf("\n\n")
              }
              return true
            }

            while (true) {
              const { done, value } = await reader.read()
              if (done) {
                console.info(`[API Route] Bridge stream finished.`)
                if (buffer.trim()) {
                  processBuffer()
                }
                break
              }
              buffer += decoder.decode(value, { stream: true })
              if (!processBuffer()) break
            }
          } catch (streamError: any) {
            console.error(`[API Route] Error reading stream from bridge: ${streamError.message}`)
            throw streamError
          }
        },
        onError: (error) => {
          console.error(
            `[API Route] Stream error: ${error instanceof Error ? error.message : String(error)}`,
          )
          return `Error processing request: ${error instanceof Error ? error.message : "Unknown error"}`
        },
      })
    } else {
      // General classification - process with local streamText
      console.info(`[API Route] Handling general query with local streamText`);
      
      return createDataStreamResponse({
        execute: (dataStream) => {
          const result = streamText({
            model: myProvider.languageModel(selectedChatModel),
            system: systemPrompt({ selectedChatModel }),
            messages,
            maxSteps: 1, // No tools for general queries
            experimental_transform: smoothStream({ chunking: 'word' }),
            experimental_generateMessageId: generateUUID,
            onFinish: async ({ response }) => {
              if (session.user?.id) {
                try {
                  const assistantId = getTrailingMessageId({
                    messages: response.messages.filter(
                      (message) => message.role === 'assistant',
                    ),
                  });

                  if (!assistantId) {
                    throw new Error('No assistant message found!');
                  }

                  const [, assistantMessage] = appendResponseMessages({
                    messages: [userMessage],
                    responseMessages: response.messages,
                  });

                  await saveMessages({
                    messages: [
                      {
                        id: assistantId,
                        chatId: id,
                        role: assistantMessage.role,
                        parts: assistantMessage.parts,
                        attachments:
                          assistantMessage.experimental_attachments ?? [],
                        createdAt: new Date(),
                      },
                    ],
                  });
                } catch (error) {
                  console.error('Failed to save chat:', error);
                }
              }
            },
            experimental_telemetry: {
              isEnabled: isProductionEnvironment,
              functionId: 'stream-text',
            },
          });

          result.consumeStream();

          result.mergeIntoDataStream(dataStream, {
            sendReasoning: false,
          });
        },
        onError: (error) => {
          console.error(
            `[API Route] Stream error: ${error instanceof Error ? error.message : String(error)}`,
          )
          return `Error processing request: ${error instanceof Error ? error.message : "Unknown error"}`
        },
      });
    }
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response('An error occurred while processing your request!', {
      status: 404,
    });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('Not Found', { status: 404 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const chat = await getChatById({ id });

    if (chat.userId !== session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    await deleteChatById({ id });

    return new Response('Chat deleted', { status: 200 });
  } catch (error) {
    return new Response('An error occurred while processing your request!', {
      status: 500,
    });
  }
}
