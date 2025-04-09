"use client"

import { memo, useState } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { useWindowSize } from "usehooks-ts"
import { ChevronRight, Settings, MessageSquare, Command, PlusIcon } from "lucide-react"

import { ModelSelector } from "@/components/model-selector"
import { SidebarToggle } from "@/components/sidebar-toggle"
import { Button } from "@/components/ui/button"
import { useSidebar } from "./ui/sidebar"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "./ui/tooltip"
import { type VisibilityType, VisibilitySelector } from "./visibility-selector"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

function PureChatHeader({
  chatId,
  chatTitle,
  selectedModelId,
  selectedVisibilityType,
  isReadonly,
}: {
  chatId: string
  chatTitle?: string
  selectedModelId: string
  selectedVisibilityType: VisibilityType
  isReadonly: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { open } = useSidebar()
  const { width: windowWidth } = useWindowSize()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  // Extract project name from pathname or use a default
  const projectName = pathname?.split("/")[1] === "chat" ? "Chat Interface" : "Project"

  // Use provided chat title or a default
  const title = chatTitle || "Untitled Chat"

  return (
    <header className="flex sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border h-12 items-center px-3 gap-2 shadow-sm">
      <div className="flex items-center gap-2">
        <SidebarToggle className="text-foreground" />

        {/* Breadcrumb Navigation */}
        <div className="flex items-center text-sm font-medium ml-2">
          <Link href="/" className="text-muted-foreground hover:text-foreground">
            {projectName}
          </Link>
          <ChevronRight className="h-4 w-4 mx-1 text-muted-foreground" />
          <span className="truncate max-w-[200px]">{title}</span>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {(!open || windowWidth < 768) && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    router.push("/")
                    router.refresh()
                  }}
                >
                  <PlusIcon className="h-4 w-4" />
                  <span className="sr-only">New Chat</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>New Chat</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {!isReadonly && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MessageSquare className="h-4 w-4" />
                  <span className="sr-only">Model</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Select Model</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Placeholder Icon */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Command className="h-4 w-4" />
                <span className="sr-only">Commands</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Commands</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Settings Sheet */}
        <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Settings className="h-4 w-4" />
              <span className="sr-only">Settings</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] sm:w-[400px]">
            <SheetHeader>
              <SheetTitle>Settings</SheetTitle>
              <SheetDescription>Configure your chat preferences and settings.</SheetDescription>
            </SheetHeader>
            <div className="py-4">
              {/* Settings content would go here */}
              <p className="text-sm text-muted-foreground">Settings panel content</p>
            </div>
          </SheetContent>
        </Sheet>

        {!isReadonly && <ModelSelector selectedModelId={selectedModelId} className="h-8" />}

        {!isReadonly && (
          <VisibilitySelector chatId={chatId} selectedVisibilityType={selectedVisibilityType} className="h-8" />
        )}
      </div>
    </header>
  )
}

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  return prevProps.selectedModelId === nextProps.selectedModelId
})
