import {
  appendClientMessage,
  appendResponseMessages,
  createDataStream,
  smoothStream,
  streamText,
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
import { generateUUID, getTrailingMessageId } from '@/lib/utils';
import { generateTitleFromUserMessage } from '../../actions';
import { createDocument } from '@/lib/ai/tools/create-document';
import { updateDocument } from '@/lib/ai/tools/update-document';
import { requestSuggestions } from '@/lib/ai/tools/request-suggestions';
import { getWeather } from '@/lib/ai/tools/get-weather';
import { isProductionEnvironment } from '@/lib/constants';
import { myProvider } from '@/lib/ai/providers';
import { entitlementsByUserType } from '@/lib/ai/entitlements';
import { postRequestBodySchema, type PostRequestBody } from './schema';
import { geolocation } from '@vercel/functions';
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from 'resumable-stream';
import { after } from 'next/server';
import { differenceInSeconds } from 'date-fns';

export const maxDuration = 60;

let globalStreamContext: ResumableStreamContext | null = null;

function getStreamContext() {
  if (!globalStreamContext) {
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
      });
    } catch (error: any) {
      if (error.message.includes('REDIS_URL')) {
        console.log(' > Resumable streams are disabled due to missing REDIS_URL');
      } else {
        console.error(error);
      }
    }
  }

  return globalStreamContext;
}

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  // 1️⃣  Validate body early --------------------------------------------------
  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch (err) {
    return new Response('Invalid request body', { status: 400 });
  }

  try {
    const { id, message, selectedChatModel, selectedVisibilityType } = requestBody;

    // 2️⃣  Auth ----------------------------------------------------------------
    const session = await auth();
    if (!session?.user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const userType: UserType = session.user.type;

    // 3️⃣  Rate‑limit per‑day ---------------------------------------------------
    const messageCount = await getMessageCountByUserId({
      id: session.user.id,
      differenceInHours: 24,
    });

    if (messageCount >= entitlementsByUserType[userType].maxMessagesPerDay) {
      return new Response('Daily message quota exceeded. Try again tomorrow.', {
        status: 429,
      });
    }

    // 4️⃣  Chat existence / ownership -----------------------------------------
    const chat = await getChatById({ id });
    if (!chat) {
      const title = await generateTitleFromUserMessage({ message });
      await saveChat({ id, userId: session.user.id, title, visibility: selectedVisibilityType });
    } else if (chat.userId !== session.user.id) {
      return new Response('Forbidden', { status: 403 });
    }

    // 5️⃣  Build UI message list ----------------------------------------------
    const previousMessages = await getMessagesByChatId({ id });
    /* @ts-expect-error – DB→UI message conversion not yet typed */
    const messages = appendClientMessage({ messages: previousMessages, message });

    // 6️⃣  Geo hints (only on Vercel) ------------------------------------------
    let longitude: number | undefined;
    let latitude: number | undefined;
    let city: string | undefined;
    let country: string | undefined;

    if (process.env.VERCEL === '1') {
      const geo = geolocation(request) ?? {};
      ({ longitude, latitude, city, country } = geo as any);
    }

    const requestHints: RequestHints = { longitude, latitude, city, country } as RequestHints;

    // 7️⃣  Persist the user message -------------------------------------------
    await saveMessages({
      messages: [
        {
          chatId: id,
          id: message.id,
          role: 'user',
          parts: message.parts,
          attachments: message.experimental_attachments ?? [],
          createdAt: new Date(),
        },
      ],
    });

    // 8️⃣  Streaming setup ------------------------------------------------------
    const streamId = generateUUID();
    await createStreamId({ streamId, chatId: id });

    const stream = createDataStream({
      execute: (dataStream) => {
        const llmStream = streamText({
          model: myProvider.languageModel(selectedChatModel),
          system: systemPrompt({ selectedChatModel, requestHints }),
          messages,
          maxSteps: 5,
          experimental_activeTools:
            selectedChatModel === 'chat-model-reasoning'
              ? []
              : ['getWeather', 'createDocument', 'updateDocument', 'requestSuggestions'],
          experimental_transform: smoothStream({ chunking: 'word' }),
          experimental_generateMessageId: generateUUID,
          tools: {
            getWeather,
            createDocument: createDocument({ session, dataStream }),
            updateDocument: updateDocument({ session, dataStream }),
            requestSuggestions: requestSuggestions({ session, dataStream }),
          },
          onFinish: async ({ response }) => {
            if (!session.user?.id) return;
            try {
              const assistantId = getTrailingMessageId({
                messages: response.messages.filter((m) => m.role === 'assistant'),
              });
              if (!assistantId) throw new Error('No assistant message found');

              const [, assistantMessage] = appendResponseMessages({
                messages: [message],
                responseMessages: response.messages,
              });

              await saveMessages({
                messages: [
                  {
                    id: assistantId,
                    chatId: id,
                    role: assistantMessage.role,
                    parts: assistantMessage.parts,
                    attachments: assistantMessage.experimental_attachments ?? [],
                    createdAt: new Date(),
                  },
                ],
              });
            } catch (err) {
              console.error('Failed saving assistant message', err);
            }
          },
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: 'stream-text',
          },
        });

        llmStream.consumeStream();
        llmStream.mergeIntoDataStream(dataStream, { sendReasoning: true });
      },
      onError: () => 'Oops, an internal error occurred!',
    });

    // 9️⃣  Return (optionally resumable) stream --------------------------------
    const streamContext = getStreamContext();
    if (streamContext) {
      const resumable = await streamContext.resumableStream(streamId, () => stream);
      return new Response(resumable);
    }
    return new Response(stream);
  } catch (err) {
    console.error('POST /api/chat failed', err);
    return new Response('Internal Server Error', { status: 500 });
  }
}

// -----------------------------------------------------------------------------
// GET  – resume an in‑flight stream
// -----------------------------------------------------------------------------
export async function GET(request: Request) {
  const streamContext = getStreamContext();
  if (!streamContext) return new Response(null, { status: 204 });

  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get('chatId');
  if (!chatId) return new Response('chatId is required', { status: 400 });

  const session = await auth();
  if (!session?.user) return new Response('Unauthorized', { status: 401 });

  // Validate chat ownership / visibility
  const chat = await getChatById({ id: chatId });
  if (!chat) return new Response('Not found', { status: 404 });
  if (chat.visibility === 'private' && chat.userId !== session.user.id) {
    return new Response('Forbidden', { status: 403 });
  }

  // Find the most recent stream id for this chat
  const streamIds = await getStreamIdsByChatId({ chatId });
  if (!streamIds.length) return new Response('No streams found', { status: 404 });
  const recentStreamId = streamIds.at(-1);
  if (!recentStreamId) return new Response('No streams found', { status: 404 });

  const emptyDataStream = createDataStream({ execute: () => {} });
  const stream = await streamContext.resumableStream(recentStreamId, () => emptyDataStream);

  // If the resumable stream has finished already, try to replay the last assistant msg
  if (!stream) {
    const messages = await getMessagesByChatId({ id: chatId });
    const mostRecent = messages.at(-1);
    if (!mostRecent || mostRecent.role !== 'assistant') return new Response(emptyDataStream);

    const now = Date.now();
    const deltaSec = differenceInSeconds(new Date(now), new Date(mostRecent.createdAt));
    if (deltaSec > 15) return new Response(emptyDataStream);

    const restored = createDataStream({
      execute: (buffer) => {
        buffer.writeData({
          type: 'append-message',
          message: JSON.stringify(mostRecent),
        });
      },
    });
    return new Response(restored);
  }

  return new Response(stream);
}

// -----------------------------------------------------------------------------
// DELETE – remove chat and all its data
// -----------------------------------------------------------------------------
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return new Response('Not Found', { status: 404 });

  const session = await auth();
  if (!session?.user?.id) return new Response('Unauthorized', { status: 401 });

  try {
    const chat = await getChatById({ id });
    if (!chat || chat.userId !== session.user.id) return new Response('Forbidden', { status: 403 });

    const deleted = await deleteChatById({ id });
    return Response.json(deleted, { status: 200 });
  } catch (err) {
    console.error('DELETE /api/chat failed', err);
    return new Response('Internal Server Error', { status: 500 });
  }
}
