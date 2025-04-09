"use client"

import { useRouter } from "next/navigation"
import { useWindowSize } from "usehooks-ts"
import { useMemo, memo, useState, useCallback, useRef } from "react"
import { ModelSelector } from "@/components/model-selector"
import { SidebarToggle } from "@/components/sidebar-toggle"
import { Button } from "@/components/ui/button"
import { PlusIcon, Settings2 } from "lucide-react"
import { useSidebar } from "./ui/sidebar"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "./ui/tooltip"
import { type VisibilityType, VisibilitySelector } from "./visibility-selector"
import { MCPServerButton } from "./mcp-server-button"
import { useMcpManager } from "@/lib/contexts/McpManagerContext"
import { McpConnectionState, type Tool } from "@/lib/mcp/mcp.types"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"

type DisplayTool = Tool & { serverId: string; serverLabel: string }

function PureChatHeader({
  chatId,
  selectedModelId,
  selectedVisibilityType,
  isReadonly,
}: {
  chatId: string
  selectedModelId: string
  selectedVisibilityType: VisibilityType
  isReadonly: boolean
}) {
  const router = useRouter()
  const { open } = useSidebar()
  const { width: windowWidth } = useWindowSize()
  const { serverStates, selectedTools, setSelectedTools } = useMcpManager()
  // Add state to control dropdown open state
  const [dropdownOpen, setDropdownOpen] = useState(false)
  // Track if we're currently selecting items to prevent immediate closing
  const isSelectingRef = useRef(false)

  const availableTools = useMemo((): DisplayTool[] => {
    const toolsMap = new Map<string, DisplayTool>()
    Object.values(serverStates).forEach((server) => {
      if (server?.status === McpConnectionState.Running && server?.toolFetchStatus === "fetched" && server?.tools) {
        server.tools.forEach((tool) => {
          const uniqueToolId = `${server.id}/${tool.name}`
          if (!toolsMap.has(uniqueToolId)) {
            toolsMap.set(uniqueToolId, { ...tool, serverId: server.id, serverLabel: server.label })
          }
        })
      }
    })
    return Array.from(toolsMap.values()).sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""))
  }, [serverStates])

  const handleToolSelectionChange = useCallback(
    (toolId: string, checked: boolean) => {
      console.log(`[ChatHeader] handleToolSelectionChange called for ${toolId}, checked: ${checked}`)

      // Mark that we're in the process of selecting
      isSelectingRef.current = true

      // Update tool selection
      setSelectedTools((prev: string[]) => {
        const newSet = new Set(prev)
        if (checked) {
          newSet.add(toolId)
        } else {
          newSet.delete(toolId)
        }
        const newState = Array.from(newSet)
        console.debug("[ChatHeader] New selected tools:", newState)
        return newState
      })

      // Reset the selecting flag after a short delay
      setTimeout(() => {
        isSelectingRef.current = false
      }, 100)
    },
    [setSelectedTools],
  )

  const selectedToolsCount = selectedTools.length
  const totalAvailableTools = availableTools.length

  console.log("[ChatHeader] Rendering with tools:", {
    availableTools: availableTools.length,
    selectedToolsCount,
    dropdownOpen,
  })

  return (
    <TooltipProvider>
      <header className="flex sticky top-0 bg-background py-1.5 items-center px-2 md:px-2 gap-2 border-b z-10">
        <SidebarToggle />

        {(!open || windowWidth < 768) && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="order-2 md:order-1 md:h-9 md:w-9 ml-auto md:ml-0"
                onClick={() => {
                  router.push("/frontend")
                  router.refresh()
                }}
              >
                <PlusIcon className="h-4 w-4" />
                <span className="sr-only">New Chat</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>New Chat</TooltipContent>
          </Tooltip>
        )}

        {!isReadonly && <ModelSelector selectedModelId={selectedModelId} className="order-1 md:order-2" />}

        {/* --- Tool Selector Dropdown --- */}
        {!isReadonly && totalAvailableTools > 0 && (
          <DropdownMenu
            open={dropdownOpen}
            onOpenChange={(open) => {
              // Only allow closing if we're not in the middle of selecting
              if (!open && isSelectingRef.current) {
                return
              }
              setDropdownOpen(open)
            }}
          >
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="order-3 md:order-3 flex items-center gap-1.5 h-9 px-2.5">
                <Settings2 className="h-4 w-4" />
                <span>
                  {selectedToolsCount === totalAvailableTools
                    ? `${totalAvailableTools}`
                    : `${selectedToolsCount}/${totalAvailableTools}`}
                </span>
                <span className="sr-only">Select Tools</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-80 overflow-y-auto z-50">
              <DropdownMenuLabel>Available Tools</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {availableTools.map((tool: DisplayTool) => {
                const uniqueToolId = `${tool.serverId}/${tool.name}`
                const isChecked = selectedTools.includes(uniqueToolId)

                return (
                  <DropdownMenuCheckboxItem
                    key={uniqueToolId}
                    checked={isChecked}
                    onSelect={(e) => {
                      // Prevent default to avoid closing the dropdown
                      e.preventDefault()
                      // Set selecting flag to prevent dropdown from closing
                      isSelectingRef.current = true
                      console.log("Tool item selected:", uniqueToolId, !isChecked)
                      handleToolSelectionChange(uniqueToolId, !isChecked)
                    }}
                    className="cursor-pointer"
                  >
                    <span title={`${tool.serverLabel} - ${tool.description ?? "No description"}`}>{tool.name}</span>
                  </DropdownMenuCheckboxItem>
                )
              })}
              {availableTools.length === 0 && (
                <DropdownMenuItem disabled>No tools available from connected servers.</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {/* --- End Tool Selector --- */}

        {!isReadonly && (
          <VisibilitySelector
            chatId={chatId}
            selectedVisibilityType={selectedVisibilityType}
            className="order-4 md:order-4"
          />
        )}

        <div className="ml-auto order-last">
          <MCPServerButton />
        </div>
      </header>
    </TooltipProvider>
  )
}

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  // We need to modify the memo comparison logic to ensure it re-renders when needed
  return (
    prevProps.selectedModelId === nextProps.selectedModelId &&
    prevProps.selectedVisibilityType === nextProps.selectedVisibilityType &&
    prevProps.isReadonly === nextProps.isReadonly &&
    prevProps.chatId === nextProps.chatId
  )
})

