"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import type { VisibilityType } from "@/components/visibility-selector"

interface ChatSettingsContextType {
  chatId: string | null
  selectedModelId: string
  selectedVisibilityType: VisibilityType
  isReadonly: boolean
  setChatId: (id: string | null) => void
  setSelectedModelId: (id: string) => void
  setSelectedVisibilityType: (type: VisibilityType) => void
  setIsReadonly: (readonly: boolean) => void
}

const ChatSettingsContext = createContext<ChatSettingsContextType | undefined>(undefined)

export function ChatSettingsProvider({ children }: { children: ReactNode }) {
  const [chatId, setChatId] = useState<string | null>(null)
  const [selectedModelId, setSelectedModelId] = useState<string>("gpt-4o")
  const [selectedVisibilityType, setSelectedVisibilityType] = useState<VisibilityType>("private")
  const [isReadonly, setIsReadonly] = useState<boolean>(false)

  return (
    <ChatSettingsContext.Provider
      value={{
        chatId,
        selectedModelId,
        selectedVisibilityType,
        isReadonly,
        setChatId,
        setSelectedModelId,
        setSelectedVisibilityType,
        setIsReadonly,
      }}
    >
      {children}
    </ChatSettingsContext.Provider>
  )
}

export function useChatSettings() {
  const context = useContext(ChatSettingsContext)
  if (context === undefined) {
    throw new Error("useChatSettings must be used within a ChatSettingsProvider")
  }
  return context
}
