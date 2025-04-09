"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"
import { SettingsDrawer } from "@/components/settings-drawer"

interface NavBarProps {
  className?: string
}

export function NavBar({ className }: NavBarProps) {
  const pathname = usePathname()
  const [chatId, setChatId] = useState<string | null>(null)
  const [selectedModelId, setSelectedModelId] = useState<string>("")
  const [selectedVisibilityType, setSelectedVisibilityType] = useState<string>("private")
  const [isReadonly, setIsReadonly] = useState<boolean>(false)

  // Extract chat ID from pathname
  useEffect(() => {
    const match = pathname.match(/\/chat\/([^/]+)/)
    if (match && match[1]) {
      setChatId(match[1])
    } else if (pathname === "/") {
      // For the root path, we're in a new chat
      setChatId("new")
    } else {
      setChatId(null)
    }
  }, [pathname])

  // Get model from cookies on client side
  useEffect(() => {
    const modelFromCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("chat-model="))
      ?.split("=")[1]

    if (modelFromCookie) {
      setSelectedModelId(modelFromCookie)
    } else {
      // Set default model if no cookie exists
      setSelectedModelId("gpt-4o")
    }
  }, [])

  return (
    <header
      className={cn("sticky top-0 z-50 flex items-center justify-between px-4 border-b bg-background", className)}
    >
      <div className="flex items-center">
        <Link href="/" className="flex items-center">
          <span className="font-bold text-xl">Chatbot</span>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        {chatId && (
          <SettingsDrawer
            chatId={chatId}
            selectedModelId={selectedModelId}
            selectedVisibilityType={selectedVisibilityType}
            isReadonly={isReadonly}
          />
        )}
      </div>
    </header>
  )
}
