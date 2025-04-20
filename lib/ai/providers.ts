import {
  customProvider,
} from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY});

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY});

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
