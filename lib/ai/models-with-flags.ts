import { enableReasoningModel } from '@/lib/feature-flags/flags';

export const DEFAULT_CHAT_MODEL: string = 'chat-model';

export interface ChatModel {
  id: string;
  name: string;
  description: string;
}

/**
 * Get available chat models based on feature flags
 * This is an example of how to integrate feature flags with model selection
 * Note: User context is handled automatically by the identify function
 */
export async function getAvailableChatModels(): Promise<ChatModel[]> {
  const isReasoningEnabled = await enableReasoningModel();
  
  const models: ChatModel[] = [
    {
      id: 'chat-model',
      name: 'Chat model',
      description: 'Primary model for all-purpose chat',
    },
  ];
  
  // Only add reasoning model if feature flag is enabled
  if (isReasoningEnabled) {
    models.push({
      id: 'chat-model-reasoning',
      name: 'Reasoning model',
      description: 'Uses advanced reasoning',
    });
  }
  
  return models;
}

/**
 * Original static export for backward compatibility
 * Consider migrating to getAvailableChatModels() for dynamic model selection
 */
export const chatModels: Array<ChatModel> = [
  {
    id: 'chat-model',
    name: 'Chat model',
    description: 'Primary model for all-purpose chat',
  },
  {
    id: 'chat-model-reasoning',
    name: 'Reasoning model',
    description: 'Uses advanced reasoning',
  },
];