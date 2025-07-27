import { anthropic } from "@ai-sdk/anthropic"
import { isTestEnvironment } from "../constants"
import {
  artifactModel as testArtifactModel,
  chatModel as testChatModel,
  reasoningModel as testReasoningModel,
  titleModel as testTitleModel,
} from "./models.test"

// Define models directly without customProvider
export const chatModel = isTestEnvironment ? testChatModel : anthropic("claude-4-sonnet-20250514")

export const reasoningModel = isTestEnvironment ? testReasoningModel : anthropic("claude-4-sonnet-20250514") // Using Sonnet for reasoning with current version

export const titleModel = isTestEnvironment ? testTitleModel : anthropic("claude-4-sonnet-20250514")

export const artifactModel = isTestEnvironment ? testArtifactModel : anthropic("claude-4-sonnet-20250514")

// Model selector function
export function getModel(type: "chat" | "reasoning" | "title" | "artifact") {
  switch (type) {
    case "chat":
      return chatModel
    case "reasoning":
      return reasoningModel
    case "title":
      return titleModel
    case "artifact":
      return artifactModel
    default:
      return chatModel
  }
}

// Legacy provider interface for backward compatibility
export const myProvider = {
  languageModel: (id: string) => {
    switch (id) {
      case "chat-model":
        return chatModel
      case "chat-model-reasoning":
        return reasoningModel
      case "title-model":
        return titleModel
      case "artifact-model":
        return artifactModel
      default:
        return chatModel
    }
  },
}
