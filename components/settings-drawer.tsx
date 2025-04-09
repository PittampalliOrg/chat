"use client"

import { useState, useRef, useCallback } from "react"
import { Settings2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { ModelSelector } from "@/components/model-selector"
import { VisibilitySelector } from "@/components/visibility-selector"
import { MCPServerButton } from "@/components/mcp-server-button"
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

interface SettingsDrawerProps {
  chatId: string
  selectedModelId: string
  selectedVisibilityType: string
  isReadonly: boolean
}

export function SettingsDrawer({ chatId, selectedModelId, selectedVisibilityType, isReadonly }: SettingsDrawerProps) {
  const [open, setOpen] = useState(false)
  const { serverStates, selectedTools, setSelectedTools } = useMcpManager()

  // Add state to control dropdown open state
  const [dropdownOpen, setDropdownOpen] = useState(false)
  // Track if we're currently selecting items to prevent immediate closing
  const isSelectingRef = useRef(false)

  const availableTools = Object.values(serverStates)
    .filter(
      (server) =>
        server?.status === McpConnectionState.Running && server?.toolFetchStatus === "fetched" && server?.tools,
    )
    .flatMap(
      (server) =>
        server.tools?.map((tool) => ({
          ...tool,
          serverId: server.id,
          serverLabel: server.label,
        })) || [],
    )
    .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""))

  const handleToolSelectionChange = useCallback(
    (toolId: string, checked: boolean) => {
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
        return Array.from(newSet)
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

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Settings2 className="h-5 w-5" />
          <span className="sr-only">Settings</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[300px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle>Chat Settings</SheetTitle>
          <SheetDescription>Configure your chat experience</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {!isReadonly && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Model</h3>
              <ModelSelector selectedModelId={selectedModelId} className="w-full" />
            </div>
          )}

          {!isReadonly && totalAvailableTools > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Tools</h3>
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
                  <Button variant="outline" size="sm" className="w-full flex items-center justify-between">
                    <span>Available Tools</span>
                    <span>
                      {selectedToolsCount === totalAvailableTools
                        ? `${totalAvailableTools}`
                        : `${selectedToolsCount}/${totalAvailableTools}`}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="max-h-80 overflow-y-auto w-[300px]">
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
            </div>
          )}

          {!isReadonly && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Visibility</h3>
              <VisibilitySelector chatId={chatId} selectedVisibilityType={selectedVisibilityType} className="w-full" />
            </div>
          )}

          <div className="space-y-2">
            <h3 className="text-sm font-medium">MCP Servers</h3>
            <MCPServerButton className="w-full" />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
