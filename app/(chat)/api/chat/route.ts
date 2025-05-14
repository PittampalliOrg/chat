// /workspace/app/(chat)/api/chat/route.ts
import {
  appendClientMessage,
  createDataStream,
  smoothStream,
  streamText,
  convertToCoreMessages, // Using the SDK utility
  type CoreMessage,
  type Message, // This is the UI-centric Message type from 'ai'
  type ToolCallPart,
  type ToolResultPart,
  type AssistantMessage as CoreAssistantMessageSdk,
} from 'ai';
import { auth, type UserType } from '@/app/(auth)/auth';
import { type RequestHints, systemPrompt } from '@/lib/ai/prompts';
import {
  createStreamId,
  deleteChatById,
  getChatById,
  getMessageCountByUserId,
  getMessagesByChatId,
  getStreamIdsByChatId,
  saveChat,
  saveMessages,
} from '@/lib/db/queries';
import { generateUUID } from '@/lib/utils';
import { generateTitleFromUserMessage } from '../../actions'; // Assuming this is in app/(chat)/actions.ts
import { createDocument } from '@/lib/ai/tools/create-document';
import { updateDocument } from '@/lib/ai/tools/update-document';
import { requestSuggestions } from '@/lib/ai/tools/request-suggestions';
import { getWeather } from '@/lib/ai/tools/get-weather';
import { isProductionEnvironment, isDevelopmentEnvironment } from '@/lib/constants';
import { myProvider } from '@/lib/ai/providers';
import { entitlementsByUserType } from '@/lib/ai/entitlements';
import { postRequestBodySchema, type PostRequestBody } from './schema';
import { geolocation } from '@vercel/functions';
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from 'resumable-stream';
import { after } from 'next/server'; // Vercel AI SDK's 'after' for waitUntil
import type { Chat, message as DbMessageDrizzleSchema } from '@/lib/db/schema'; // Using Drizzle schema type
import { differenceInSeconds } from 'date-fns';

export const maxDuration = 60; // Vercel max duration

/**
 * Interface representing the structure of a message object from YOUR database.
 * !!! YOU MUST ADJUST THIS TO MATCH YOUR DRIZZLE 'messages' TABLE SCHEMA !!!
 * This example assumes 'parts' stores the primary content and you might have
 * separate JSONB or text fields for tool calls/results if you store them structured.
 */
interface DbMessage {
  id: string;
  chatId: string;
  role: 'user' | 'assistant' | 'system' | 'data';
  parts: string | any[] | null;
  createdAt: Date;
  attachments: any[];
}

/**
 * Converts an array of your database messages (DbMessage) into an array of
 * Vercel AI SDK `Message` objects (UI-centric message type).
 * !!! CUSTOMIZE THIS BASED ON YOUR DbMessage STRUCTURE !!!
 */
function mapDbMessagesToSdkMessages(dbMessages: DbMessage[]): Message[] {
  return dbMessages.map((dbMsg): Message => {
    let contentString = '';
    if (typeof dbMsg.parts === 'string') {
      contentString = dbMsg.parts;
    } else if (Array.isArray(dbMsg.parts)) {
      // If dbMsg.parts is MessageContentPart[], find the first text part or join them.
      const textPart = dbMsg.parts.find(p => p.type === 'text');
      contentString = textPart && 'text' in textPart ? textPart.text : JSON.stringify(dbMsg.parts);
    } else if (dbMsg.parts != null) { // Check for null or undefined
      contentString = JSON.stringify(dbMsg.parts); // Fallback
    }

    return {
      id: dbMsg.id,
      role: dbMsg.role,
      content: contentString,
      createdAt: dbMsg.createdAt,
    };
  });
}

// --- Resumable Stream Context Setup ---
let globalStreamContext: ResumableStreamContext | null = null;
function getStreamContext(): ResumableStreamContext | null {
  if (process.env.REDIS_URL && !globalStreamContext) {
    try {
      console.log('[STREAM CTX] Initializing ResumableStreamContext with Redis.');
      globalStreamContext = createResumableStreamContext({ waitUntil: after });
    } catch (error: any) {
      console.error('[STREAM CTX] Failed to initialize ResumableStreamContext:', error.message);
      globalStreamContext = null; // Ensure it's null if initialization failed
    }
  } else if (!process.env.REDIS_URL && isDevelopmentEnvironment) {
    console.warn('[STREAM CTX] REDIS_URL not set. Resumable streams will be disabled.');
  }
  return globalStreamContext;
}

// --- Environment Variable Check (Conceptual - logs on first load of this module if in dev) ---
if (isDevelopmentEnvironment) {
  console.log('[ENV CHECK API CHAT] Key Environment Variables Status:');
  console.log(`  POSTGRES_URL: ${process.env.POSTGRES_URL ? 'Set' : 'NOT SET (CRITICAL for DB ops)'}`);
  console.log(`  AUTH_SECRET: ${process.env.AUTH_SECRET ? 'Set' : 'NOT SET (CRITICAL for Auth)'}`);
  console.log(`  REDIS_URL: ${process.env.REDIS_URL ? 'Set (Resumable Streams Potentially Enabled)' : 'NOT SET (Resumable Streams Disabled)'}`);
  // Add checks for your AI provider API keys (e.g., OPENAI_API_KEY)
  console.log(`  MY_AI_PROVIDER_API_KEY: ${process.env.MY_AI_PROVIDER_API_KEY ? 'Set' : 'NOT SET (CRITICAL for AI)'}`);
}

// --- POST Handler for Chat Messages ---
export async function POST(request: Request) {
  const operationId = generateUUID().substring(0, 8);
  console.log(`[CHAT POST ${operationId}] Request received.`);

  let requestBody: PostRequestBody;
  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
    if (isDevelopmentEnvironment) {
      console.log(`[CHAT POST ${operationId}] Request body parsed. Chat ID: ${requestBody.id}, Model: ${requestBody.selectedChatModel}`);
    }
  } catch (validationError: any) {
    console.error(`[CHAT POST ${operationId}] Invalid request body:`, validationError.errors || validationError.message);
    return new Response(JSON.stringify({ error: 'Invalid request body', details: validationError.errors }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const session = await auth();
    if (!session?.user?.id) {
      console.warn(`[CHAT POST ${operationId}] Unauthorized: No session or user ID.`);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    const userId = session.user.id;
    const userType = session.user.type as UserType; // Type from session should be reliable

    console.log(`[CHAT POST ${operationId}] User: ${userId}, Type: ${userType}`);

    // --- Entitlement Check ---
    try {
      const messageCount = await getMessageCountByUserId({ id: userId, differenceInHours: 24 });
      const entitlement = entitlementsByUserType[userType];
      if (!entitlement) {
          console.error(`[CHAT POST ${operationId}] No entitlement found for userType: ${userType}`);
          return new Response(JSON.stringify({ error: 'User entitlement configuration error.' }), { status: 500 });
      }
      const maxMessages = entitlement.maxMessagesPerDay;
      if (maxMessages !== undefined && messageCount >= maxMessages) {
        console.warn(`[CHAT POST ${operationId}] User ${userId} exceeded message limit (count: ${messageCount}, max: ${maxMessages}).`);
        return new Response(JSON.stringify({ error: 'Message limit exceeded. Please try again later.' }), { status: 429 });
      }
      console.log(`[CHAT POST ${operationId}] User ${userId} message count: ${messageCount}/${maxMessages}.`);
    } catch (dbError: any) {
      console.error(`[CHAT POST ${operationId}] Database error during entitlement check for user ${userId}:`, dbError.message, dbError.stack);
      return new Response(JSON.stringify({ error: 'Server error during entitlement check.' }), { status: 500 });
    }
    // --- End Entitlement Check ---

    const { id: chatId, message: incomingUIMessage, selectedChatModel, selectedVisibilityType } = requestBody;

    // Chat Existence and Authorization Check / Creation
    let chatFromDb: Chat | null = null; // Type 'Chat' from your Drizzle schema
    try {
      const chatResult = await getChatById({ id: chatId }); // Assume returns Chat | null or Chat[]
      if (Array.isArray(chatResult) && chatResult.length > 0) {
        chatFromDb = chatResult[0];
      } else if (chatResult && !Array.isArray(chatResult)) {
        chatFromDb = chatResult as Chat; // Cast if necessary, ensure getChatById is typed
      }

      if (chatFromDb) {
        if (chatFromDb.userId !== userId) {
          console.warn(`[CHAT POST ${operationId}] Forbidden: User ${userId} attempted to access chat ${chatId} owned by ${chatFromDb.userId}.`);
          return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
        }
        console.log(`[CHAT POST ${operationId}] Existing chat ${chatId} loaded for user ${userId}.`);
      } else {
        console.log(`[CHAT POST ${operationId}] Chat ${chatId} not found. Creating new chat for user ${userId}.`);
        const title = await generateTitleFromUserMessage({ message: { ...incomingUIMessage, parts: incomingUIMessage.parts ?? [] } as any });
        const savedChatResult = await saveChat({ id: chatId, userId, title, visibility: selectedVisibilityType });
        
        if (Array.isArray(savedChatResult) && savedChatResult.length > 0) chatFromDb = savedChatResult[0];
        else if (savedChatResult && !Array.isArray(savedChatResult)) chatFromDb = savedChatResult as Chat;
        else throw new Error(`Failed to save or retrieve new chat with id ${chatId}.`);
        console.log(`[CHAT POST ${operationId}] New chat ${chatId} created with title: "${title}".`);
      }
    } catch (error: any) {
      console.error(`[CHAT POST ${operationId}] Error handling chat metadata for ${chatId} (User: ${userId}):`, error.message, error.stack);
      return new Response(JSON.stringify({ error: 'Server error handling chat metadata.' }), { status: 500 });
    }

    // Prepare messages for AI
    const previousDbMessages = await getMessagesByChatId({ id: chatId }) as DbMessage[];
    const previousSdkMessages = mapDbMessagesToSdkMessages(previousDbMessages);
    
    // The incomingUIMessage from PostRequestBody has `parts: any[]` and `content: string`
    // Map this to the AI SDK's `Message` type for appendClientMessage
    const currentSdkUserMessage: Message = {
      id: incomingUIMessage.id,
      role: 'user',
      content: incomingUIMessage.content, // Assuming `content` string is primary for new messages
      createdAt: new Date(incomingUIMessage.createdAt), // Ensure it's a Date object
    };

    const messagesForContext = appendClientMessage({ messages: previousSdkMessages, message: currentSdkUserMessage });
    const coreMessagesForAI = convertToCoreMessages(messagesForContext); // SDK utility

    const { longitude, latitude, city, country } = geolocation(request);
    const requestHints: RequestHints = { longitude, latitude, city, country };

    // Save user message to DB
    try {
      // This object MUST match your DbMessage structure for saving
      const userMessageToSaveInDb: DbMessage = {
          chatId: chatId,
          id: incomingUIMessage.id,
          role: 'user',
          parts: incomingUIMessage.parts as any[],
          attachments: [],
          createdAt: new Date(incomingUIMessage.createdAt),
      };
      await saveMessages({ messages: [userMessageToSaveInDb] });
      console.log(`[CHAT POST ${operationId}] User message ${incomingUIMessage.id} saved for chat ${chatId}.`);
    } catch (dbError: any) { 
        console.error(`[CHAT POST ${operationId}] DB error saving user message for chat ${chatId}:`, dbError.message, dbError.stack);
        return new Response(JSON.stringify({ error: 'Server error saving your message.' }), { status: 500 });
    }

    const streamId = generateUUID();
    try {
        await createStreamId({ streamId, chatId });
        console.log(`[CHAT POST ${operationId}] Stream ID ${streamId} created for chat ${chatId}.`);
    } catch (dbError: any) {
       console.error(`[CHAT POST ${operationId}] Database error creating stream ID for chat ${chatId}:`, dbError.message, dbError.stack);
       // This might be non-fatal if resumability isn't strictly required on first error
    }

    // AI SDK StreamText call
    const stream = createDataStream({
      execute: async (dataStream: any) => {
        try {
          console.log(`[CHAT POST ${operationId}] Initiating streamText for chat ${chatId}, stream ${streamId}.`);
          const result = streamText({
            model: myProvider.languageModel(selectedChatModel),
            system: systemPrompt({ selectedChatModel, requestHints }),
            messages: coreMessagesForAI,
            maxSteps: isProductionEnvironment ? 7 : 15, // Example
            experimental_activeTools: selectedChatModel === 'chat-model-reasoning' ? [] : ['getWeather', 'createDocument', 'updateDocument', 'requestSuggestions'],
            experimental_transform: smoothStream({ chunking: 'word' }),
            experimental_generateMessageId: generateUUID,
            tools: { getWeather, createDocument: createDocument({ session, dataStream }), updateDocument: updateDocument({ session, dataStream }), requestSuggestions: requestSuggestions({ session, dataStream })},
            onFinish: async (response: any) => {
              if (response && response.error) {
                console.error(`[CHAT POST ${operationId}] AI streamText for chat ${chatId} (stream ${streamId}) finished with error:`, response.error.message, response.error.stack);
                dataStream.append(JSON.stringify({ type: 'error', data: { message: "AI processing error.", details: response.error.message }}));
                dataStream.close();
                return;
              }
              console.log(`[CHAT POST ${operationId}] AI streamText for chat ${chatId} (stream ${streamId}) finished successfully.`);
              if (userId && response.messages) {
                try {
                  const newAssistantCoreMessages = Array.isArray(response.messages)
                    ? response.messages.filter((m: any) => m.role === 'assistant')
                    : [];
                  if (newAssistantCoreMessages.length > 0) {
                    const messagesToSaveDb: DbMessage[] = [];
                    for (const assistantMsg of newAssistantCoreMessages) {
                      messagesToSaveDb.push({
                        id: assistantMsg.id,
                        chatId: chatId,
                        role: 'assistant',
                        parts: assistantMsg.content,
                        attachments: [],
                        createdAt: new Date(),
                      });
                    }
                    if (messagesToSaveDb.length > 0) {
                      await saveMessages({ messages: messagesToSaveDb });
                    }
                  }
                } catch (dbError: any) {
                  console.error(`[CHAT POST ${operationId}] DB error saving assistant message(s) for chat ${chatId}:`, dbError.message, dbError.stack);
                }
              }
              dataStream.close();
            },
          });
          result.consumeStream();
          result.mergeIntoDataStream(dataStream, { sendReasoning: true });
        } catch (executionError: any) {
            console.error(`[CHAT POST ${operationId}] Error during streamText execution block for chat ${chatId}:`, executionError.message, executionError.stack);
            dataStream.append(JSON.stringify({ type: 'error', data: { message: "Error processing stream.", details: executionError.message }}));
            dataStream.close();
        }
      },
      onError: (error: unknown) => {
        const err = error instanceof Error ? error : new Error(String(error));
        return isProductionEnvironment ? 'An unexpected error occurred with the stream.' : `Stream Error: ${err.message}`;
      },
    });

    const currentStreamContext = getStreamContext();
    if (currentStreamContext) { 
        console.log(`[CHAT POST ${operationId}] Using resumable stream for stream ID ${streamId}.`);
        return new Response(await currentStreamContext.resumableStream(streamId, () => stream)); 
    } else { 
        console.log(`[CHAT POST ${operationId}] Using non-resumable stream for chat ID ${chatId}.`);
        return new Response(stream); 
    }

  } catch (error: any) {
    console.error(`[CHAT POST ${operationId}] Top-level unhandled error for chat ${requestBody?.id || 'UNKNOWN_CHAT'}:`, error.message, error.stack);
    return new Response(JSON.stringify({ error: 'An internal server error occurred while processing your chat request.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

// --- GET Handler for Resuming Streams ---
export async function GET(request: Request) {
  const operationId = generateUUID().substring(0, 8);
  console.log(`[CHAT GET ${operationId}] Request for stream resume received.`);
  const currentStreamContext = getStreamContext();
  if (!currentStreamContext) {
    console.warn(`[CHAT GET ${operationId}] ResumableStreamContext not available. Cannot resume.`);
    return new Response(null, { status: 204 }); 
  }

  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get('chatId');
  if (!chatId) { 
    return new Response(JSON.stringify({ error: 'chatId is required' }), { status: 400 });
  }

  const session = await auth();
  if (!session?.user?.id) { 
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }); 
  }

  try {
    const chatResult = await getChatById({ id: chatId });
    let chat: Chat | null = null;
    if (Array.isArray(chatResult) && chatResult.length > 0) chat = chatResult[0];
    else if (chatResult && !Array.isArray(chatResult)) chat = chatResult as Chat;

    if (!chat) {
      return new Response(JSON.stringify({ error: 'Chat not found' }), { status: 404 });
    }
    if (chat.visibility === 'private' && chat.userId !== session.user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }
  } catch (dbError: any) {
    console.error(`[CHAT GET ${operationId}] DB error fetching chat ${chatId} for stream resume:`, dbError.message);
    return new Response(JSON.stringify({ error: 'Server error fetching chat details.' }), { status: 500 });
  }
  
  let streamIdObjects: Array<{ streamId: string }>;
  try {
    const rawStreamIds = await getStreamIdsByChatId({ chatId }) as string[]; 
    streamIdObjects = rawStreamIds.map(id => ({ streamId: id }));
  } catch (dbError: any) {
    console.error(`[CHAT GET ${operationId}] DB error fetching stream IDs for chat ${chatId}:`, dbError.message);
    return new Response(JSON.stringify({ error: 'Server error fetching stream data' }), { status: 500 });
  }
  
  if (!streamIdObjects.length) { return new Response(JSON.stringify({ error: 'No streams found for this chat' }), { status: 404 }); }
  const recentStreamId = streamIdObjects.at(-1)?.streamId;
  if (!recentStreamId) { return new Response(JSON.stringify({ error: 'No recent stream found for this chat' }), { status: 404 }); }

  console.log(`[CHAT GET ${operationId}] Attempting to resume stream ID ${recentStreamId} for chat ${chatId}.`);
  const emptyDataStream = createDataStream({ execute: (ds: any) => { ds.close(); } });
  const stream = await currentStreamContext.resumableStream(recentStreamId, () => emptyDataStream);

  if (!stream) {
    console.log(`[CHAT GET ${operationId}] Stream ${recentStreamId} has already concluded or does not exist. Checking for recent messages for chat ${chatId}.`);
    try {
        const dbMessages = await getMessagesByChatId({ id: chatId }) as DbMessage[];
        const mostRecentDbMessage = dbMessages.at(-1);
        if (mostRecentDbMessage?.role === 'assistant' && differenceInSeconds(new Date(), new Date(mostRecentDbMessage.createdAt)) <= 30) {
          const coreMessageToRestore = mapDbMessagesToSdkMessages([mostRecentDbMessage])[0];
          if (coreMessageToRestore) {
            console.log(`[CHAT GET ${operationId}] Restoring most recent assistant message ${coreMessageToRestore.id} for chat ${chatId}.`);
            const restoredStream = createDataStream({
              execute: (buffer: any) => {
                buffer.append(JSON.stringify({ type: 'message', data: coreMessageToRestore })); 
                buffer.close();
              },
            });
            return new Response(restoredStream, { status: 200 });
          }
        }
        console.log(`[CHAT GET ${operationId}] No recent assistant message to restore for stream ${recentStreamId}. Sending empty response.`);
        return new Response(emptyDataStream, { status: 200 }); 
    } catch (dbError: any) {
        console.error(`[CHAT GET ${operationId}] DB error fetching recent messages for chat ${chatId} after stream not found:`, dbError.message);
        return new Response(emptyDataStream, { status: 200 }); // Still send empty stream on error here
    }
  }
  console.log(`[CHAT GET ${operationId}] Successfully resumed stream ID ${recentStreamId}.`);
  return new Response(stream, { status: 200 });
}

// --- DELETE Handler for Chat History ---
export async function DELETE(request: Request) {
  const operationId = generateUUID().substring(0,8);
  console.log(`[CHAT DELETE ${operationId}] Request received.`);

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id'); // This is chatId
  if (!id) {
    console.warn(`[CHAT DELETE ${operationId}] Chat ID missing.`);
    return new Response(JSON.stringify({ error: 'Chat ID is required' }), { status: 400 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    console.warn(`[CHAT DELETE ${operationId}] Unauthorized attempt to delete chat ${id}.`);
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const chatResult = await getChatById({ id });
    let chat: Chat | null = null;
    if (Array.isArray(chatResult) && chatResult.length > 0) chat = chatResult[0];
    else if (chatResult && !Array.isArray(chatResult)) chat = chatResult as Chat;
    
    if (!chat) {
      console.warn(`[CHAT DELETE ${operationId}] Chat ${id} not found for deletion.`);
      return new Response(JSON.stringify({ error: 'Chat not found' }), { status: 404 });
    }
    if (chat.userId !== session.user.id) {
      console.warn(`[CHAT DELETE ${operationId}] Forbidden: User ${session.user.id} attempted to delete chat ${id} owned by ${chat.userId}.`);
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }

    const deletedChat = await deleteChatById({ id }); 
    console.log(`[CHAT DELETE ${operationId}] Chat ${id} deleted successfully by user ${session.user.id}.`);
    // Consider what deleteChatById returns. If it's the deleted object or count:
    return Response.json(deletedChat || { message: "Delete successful", id }, { status: 200 }); 
    // Or return 204 No Content if nothing meaningful is returned by deleteChatById
    // return new Response(null, { status: 204 });

  } catch (error: any) {
    console.error(`[CHAT DELETE ${operationId}] Error deleting chat ${id}:`, error.message, error.stack);
    return new Response(JSON.stringify({ error: 'An error occurred while deleting the chat.' }), { status: 500 });
  }
}