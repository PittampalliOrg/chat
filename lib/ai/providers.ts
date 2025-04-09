import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai';
import { groq } from '@ai-sdk/groq';
import { xai } from '@ai-sdk/xai';
import { isTestEnvironment } from '../constants';
import {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from './models.test';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { createAzure, azure } from '@ai-sdk/azure';

export const myProvider = customProvider({
      languageModels: {
        'chat-model': openai("gpt-4o-2024-11-20"),
        'chat-model-reasoning': wrapLanguageModel({
          model: anthropic('claude-3-7-sonnet-20250219'),
          middleware: extractReasoningMiddleware({ tagName: 'think' }),
        }),
        'title-model': openai("gpt-4o-2024-11-20"),
        'artifact-model': openai("gpt-4o-2024-11-20"),
      },
      imageModels: {
        'small-model': openai.image('dall-e-3'),
      },
    });
