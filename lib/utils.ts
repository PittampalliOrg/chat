import type { CoreAssistantMessage, CoreToolMessage, UIMessage } from 'ai';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Document } from '@/lib/db/schema';
import { ChatSDKError, type ErrorCode } from './errors';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const fetcher = async (url: string) => {
  const response = await fetch(url);

  if (!response.ok) {
    const { code, cause } = await response.json();
    throw new ChatSDKError(code as ErrorCode, cause);
  }

  return response.json();
};

export async function fetchWithErrorHandlers(
  input: RequestInfo | URL,
  init?: RequestInit,
) {
  console.log('[fetchWithErrorHandlers] Making request to:', input);
  console.log('[fetchWithErrorHandlers] Request init:', init);
  
  try {
    const response = await fetch(input, init);
    console.log('[fetchWithErrorHandlers] Response status:', response.status);
    console.log('[fetchWithErrorHandlers] Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      console.error('[fetchWithErrorHandlers] Response not OK');
      const text = await response.text();
      console.error('[fetchWithErrorHandlers] Response body:', text);
      
      try {
        const { code, cause } = JSON.parse(text);
        throw new ChatSDKError(code as ErrorCode, cause);
      } catch (parseError) {
        console.error('[fetchWithErrorHandlers] Failed to parse error response:', parseError);
        throw new Error(`HTTP ${response.status}: ${text}`);
      }
    }

    return response;
  } catch (error: unknown) {
    console.error('[fetchWithErrorHandlers] Caught error:', error);
    
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      console.error('[fetchWithErrorHandlers] User is offline');
      throw new ChatSDKError('offline:chat');
    }

    throw error;
  }
}

export function getLocalStorage(key: string) {
  if (typeof window !== 'undefined') {
    return JSON.parse(localStorage.getItem(key) || '[]');
  }
  return [];
}

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

type ResponseMessageWithoutId = CoreToolMessage | CoreAssistantMessage;
type ResponseMessage = ResponseMessageWithoutId & { id: string };

export function getMostRecentUserMessage(messages: Array<UIMessage>) {
  const userMessages = messages.filter((message) => message.role === 'user');
  return userMessages.at(-1);
}

export function getDocumentTimestampByIndex(
  documents: Array<Document>,
  index: number,
) {
  if (!documents) return new Date();
  if (index > documents.length) return new Date();

  return documents[index].createdAt;
}

export function getTrailingMessageId({
  messages,
}: {
  messages: Array<ResponseMessage>;
}): string | null {
  const trailingMessage = messages.at(-1);

  if (!trailingMessage) return null;

  return trailingMessage.id;
}

export function sanitizeText(text: string) {
  return text.replace('<has_function_call>', '');
}
