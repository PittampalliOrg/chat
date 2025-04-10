"use client"

import type React from "react"

import { createContext, useContext, useState } from "react"
import type { VisibilityType } from "@/components/visibility-selector"
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models"

interface ChatSettingsContextType {
  // Chat identification
  chatId: string | null
  setChatId: (id: string | null) => void
  chatTitle: string
  setChatTitle: (title: string) => void

  // Model selection
  selectedModelId: string
  setSelectedModelId: (modelId: string) => void

  // Visibility settings
  selectedVisibilityType: VisibilityType
  setSelectedVisibilityType: (type: VisibilityType) => void

  // Permissions
  isReadonly: boolean
  setIsReadonly: (readonly: boolean) => void
}

const ChatSettingsContext = createContext<ChatSettingsContextType>({
  chatId: null,
  setChatId: () => {},
  chatTitle: "",
  setChatTitle: () => {},
  selectedModelId: DEFAULT_CHAT_MODEL,
  setSelectedModelId: () => {},
  selectedVisibilityType: "private",
  setSelectedVisibilityType: () => {},
  isReadonly: false,
  setIsReadonly: () => {},
})

export const ChatSettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [chatId, setChatId] = useState<string | null>(null)
  const [chatTitle, setChatTitle] = useState<string>("")
  const [selectedModelId, setSelectedModelId] = useState<string>(DEFAULT_CHAT_MODEL)
  const [selectedVisibilityType, setSelectedVisibilityType] = useState<VisibilityType>("private")
  const [isReadonly, setIsReadonly] = useState<boolean>(false)

  return (
    <ChatSettingsContext.Provider
      value={{
        chatId,
        setChatId,
        chatTitle,
        setChatTitle,
        selectedModelId,
        setSelectedModelId,
        selectedVisibilityType,
        setSelectedVisibilityType,
        isReadonly,
        setIsReadonly,
      }}
    >
      {children}
    </ChatSettingsContext.Provider>
  )
}

export const useChatSettings = () => useContext(ChatSettingsContext)
