import {
  customProvider,
} from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';

export const myProvider = customProvider({
      languageModels: {
        'chat-model': openai("gpt-4o-2024-11-20"),
        'chat-model-reasoning': anthropic('claude-3-7-sonnet-20250219'),
        'title-model': openai("gpt-4o-2024-11-20"),
        'artifact-model': openai("gpt-4o-2024-11-20"),
      },
      imageModels: {
        'small-model': openai.image('dall-e-3'),
      },
    });
