import {
  type UIMessage,
  appendResponseMessages,
  createDataStreamResponse,
  smoothStream,
  streamText,
} from 'ai';
import { auth } from '@/app/(auth)/auth';
import { systemPrompt } from '@/lib/ai/prompts';
import {
  deleteChatById,
  getChatById,
  getMessageCountByUserId,
  saveChat,
  saveMessages,
} from '@/lib/db/queries';
import {
  generateUUID,
  getMostRecentUserMessage,
  getTrailingMessageId,
} from '@/lib/utils';
import { generateTitleFromUserMessage } from '../../actions';
import { createDocument } from '@/lib/ai/tools/create-document';
import { updateDocument } from '@/lib/ai/tools/update-document';
import { requestSuggestions } from '@/lib/ai/tools/request-suggestions';
import { getWeather } from '@/lib/ai/tools/get-weather';
import { anonymousRegex, isProductionEnvironment } from '@/lib/constants';
import { myProvider } from '@/lib/ai/providers';
import {
  entitlementsByMembershipTier,
  type MembershipTier,
} from '@/lib/ai/capabilities';

export const maxDuration = 60;
export const dynamic = "force-dynamic"

// --- Use Environment Variable for Bridge URL - Ensure Correct Port (6279) ---
// Example for Docker Compose: BACKEND_BRIDGE_URL=http://mcp-manager:6279/api/bridge/chat
// Example for same machine: BACKEND_BRIDGE_URL=http://localhost:6279/api/bridge/chat
const bridgeUrl = process.env.BACKEND_BRIDGE_URL || `http://registry:6279/api/bridge/chat` // Default to localhost and HTTP port
console.info(`[API Route] Using bridge URL: ${bridgeUrl}`)

export async function POST(request: Request) {
  try {
    const {
      id,
      messages,
      selectedChatModel,
      primaryServerId,
      selectedTools
    }: {
      id: string;
      messages: Array<UIMessage>;
      selectedChatModel: string;
      primaryServerId: string | null
      selectedTools?: string[]
    } = await request.json();

    const session = await auth();

    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    const membershipTier: MembershipTier = anonymousRegex.test(
      session.user.email ?? '',
    )
      ? 'guest'
      : 'free';

    const messageCount = await getMessageCountByUserId({
      id: session.user.id,
      differenceInHours: 24,
    });

    if (
      messageCount >
      entitlementsByMembershipTier[membershipTier].maxMessagesPerDay
    ) {
      return new Response(
        'You have exceeded your maximum number of messages for the day',
        {
          status: 429,
        },
      );
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


    console.info(`[API Route] Forwarding chat request for to bridge: ${bridgeUrl}`)
    const bridgeRequestPayload = {
      prompt: typeof userMessage.content === "string" ? userMessage.content : "",
      history: messages.slice(0, -1),
      selectedTools: selectedTools ?? [],
      sessionId: id,
    }

    console.debug(`[API Route] Bridge Payload for chat:`, JSON.stringify(bridgeRequestPayload))

    // --- Fetch from Backend Bridge ---
    const bridgeResponse = await fetch(bridgeUrl, {
      // Use the configured bridgeUrl
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bridgeRequestPayload),
    })

    if (!bridgeResponse.ok) {
      const errorText = await bridgeResponse.text()
      console.error(
        `[API Route] Bridge request failed for chat. Status: ${bridgeResponse.status}. Error: ${errorText}`,
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
      console.error(`[API Route] Bridge response body is null for chat. Status: ${bridgeResponse.status}.`)
      throw new Error("Backend bridge returned empty response body.")
    }

    console.info(`[API Route] Received streaming response from bridge for chat.`)



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
                        // This is text content from the LLM
                        assistantMessage += bridgeChunk.value
                        // Write text content in AI SDK format - properly JSON stringified
                        dataWriter.write(`0:${JSON.stringify(bridgeChunk.value)}\n`)
                        break
                      case "tool_call":
                        // Format tool call for AI SDK - as a data array
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
                        // Format tool result for AI SDK - as a data array
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
                        // Format error as data array
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
                        // Format chat end as data array
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
                      `[API Route] Failed to parse JSON from bridge stream for: ${parseError.message}. Data: "${jsonData}"`,
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
              console.info(`[API Route] Bridge stream finished for chat.`)
              if (buffer.trim()) {
                processBuffer()
              }
              break
            }
            buffer += decoder.decode(value, { stream: true })
            if (!processBuffer()) break
          }
        } catch (streamError: any) {
          console.error(`[API Route] Error reading stream from bridge for chat: ${streamError.message}`)
          throw streamError
        }
      },
      onError: (error) => {
        console.error(
          `[API Route] Stream error for chat: ${error instanceof Error ? error.message : String(error)}`,
        )
        return `Error processing chat: ${error instanceof Error ? error.message : "Unknown error"}`
      },
    })
  } catch (error: unknown) {
    console.error("[API Route] Unhandled error in POST /api/chat:", error)
    const errorMessage = error instanceof Error ? error.message : "An internal server error occurred."
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
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
