"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EyeIcon, RefreshCwIcon, SearchIcon, CopyIcon, MaximizeIcon, CopyCheckIcon, X } from "lucide-react"
import { useCopyToClipboard } from "usehooks-ts"
import { toast } from "sonner"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

type EnvVariables = {
  client: Record<string, string>
  server: Record<string, string>
}

export function EnvVariablesDisplay() {
  const [envVars, setEnvVars] = useState<EnvVariables>({
    client: {},
    server: {},
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedVar, setSelectedVar] = useState<{ key: string; value: string } | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [_, copyToClipboard] = useCopyToClipboard()

  const fetchEnvVariables = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/env-variables")
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      setEnvVars(data)
    } catch (error) {
      console.error("Failed to fetch environment variables:", error)
      setError(error instanceof Error ? error.message : "Unknown error")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchEnvVariables()
  }, [])

  // Filter variables based on search query
  const filteredVars = useMemo(() => {
    if (!searchQuery.trim()) return envVars

    const query = searchQuery.toLowerCase()
    return {
      client: Object.fromEntries(
        Object.entries(envVars.client).filter(
          ([key, value]) =>
            key.toLowerCase().includes(query) || value.toLowerCase().includes(query)
        )
      ),
      server: Object.fromEntries(
        Object.entries(envVars.server).filter(
          ([key, value]) =>
            key.toLowerCase().includes(query) || value.toLowerCase().includes(query)
        )
      ),
    }
  }, [envVars, searchQuery])

  const handleCopy = async (key: string, value: string) => {
    try {
      await copyToClipboard(value)
      setCopiedKey(key)
      toast.success(`Copied ${key} value to clipboard`)
      setTimeout(() => setCopiedKey(null), 2000)
    } catch (error) {
      toast.error("Failed to copy to clipboard")
    }
  }

  const handleCopyAll = async (vars: Record<string, string>, type: string) => {
    try {
      const text = Object.entries(vars)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n')
      await copyToClipboard(text)
      toast.success(`Copied all ${type} variables to clipboard`)
    } catch (error) {
      toast.error("Failed to copy to clipboard")
    }
  }

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault()
        const searchInput = document.getElementById('env-search-input')
        searchInput?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const renderVariables = (vars: Record<string, string>, type: string) => {
    const entries = Object.entries(vars)
    
    if (entries.length === 0) {
      return (
        <div className="text-sm text-muted-foreground py-4 text-center">
          {searchQuery ? (
            <p>No {type} variables match your search.</p>
          ) : (
            <>
              <p>No {type} environment variables found.</p>
              {type === "server" && (
                <p className="mt-1 text-xs">This could be due to server-side filtering or no variables being set.</p>
              )}
            </>
          )}
        </div>
      )
    }

    return (
      <div className="space-y-1">
        {entries.map(([key, value]) => (
          <div
            key={key}
            className="group flex items-start gap-2 py-2 px-2 -mx-2 rounded hover:bg-muted/50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2">
                <span className="font-mono text-xs font-medium text-foreground/90 break-all">
                  {searchQuery && key.toLowerCase().includes(searchQuery.toLowerCase()) ? (
                    <HighlightText text={key} highlight={searchQuery} />
                  ) : (
                    key
                  )}
                </span>
              </div>
              <div className="mt-1 font-mono text-xs text-muted-foreground break-all">
                {searchQuery && value.toLowerCase().includes(searchQuery.toLowerCase()) ? (
                  <HighlightText text={value} highlight={searchQuery} />
                ) : (
                  value
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => handleCopy(key, value)}
                  >
                    {copiedKey === key ? (
                      <CopyCheckIcon className="h-3.5 w-3.5 text-green-600" />
                    ) : (
                      <CopyIcon className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy value</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setSelectedVar({ key, value })}
                  >
                    <MaximizeIcon className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>View full value</TooltipContent>
              </Tooltip>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const clientCount = Object.keys(filteredVars.client).length
  const serverCount = Object.keys(filteredVars.server).length

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            className="bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-zinc-50 dark:text-zinc-900 flex py-1.5 px-2 h-fit md:h-[34px] order-4 md:ml-auto"
            aria-label="View Environment Variables"
          >
            <EyeIcon size={16} className="mr-2" />
            Env Variables
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] md:w-[500px] max-h-[80vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h3 className="font-medium">Environment Variables</h3>
            <Button variant="outline" size="sm" onClick={fetchEnvVariables} disabled={isLoading}>
              <RefreshCwIcon size={14} className={`mr-1 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          <div className="relative mb-3">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="env-search-input"
              type="text"
              placeholder="Search variables... (⌘F)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn("pl-9 h-9", searchQuery ? "pr-9" : "pr-3")}
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery("")}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-transparent"
              >
                <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                <span className="sr-only">Clear search</span>
              </Button>
            )}
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 p-2 rounded mb-2 text-sm">
              Error: {error}
            </div>
          )}

          <Tabs defaultValue="client" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="client">
                Client {clientCount > 0 && <span className="ml-1 text-xs">({clientCount})</span>}
              </TabsTrigger>
              <TabsTrigger value="server">
                Server {serverCount > 0 && <span className="ml-1 text-xs">({serverCount})</span>}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="client" className="mt-3 flex-1 overflow-auto">
              {clientCount > 0 && (
                <div className="flex justify-end mb-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyAll(filteredVars.client, "client")}
                  >
                    <CopyIcon className="h-3.5 w-3.5 mr-1" />
                    Copy All
                  </Button>
                </div>
              )}
              {renderVariables(filteredVars.client, "client")}
            </TabsContent>

            <TabsContent value="server" className="mt-3 flex-1 overflow-auto">
              {serverCount > 0 && (
                <div className="flex justify-end mb-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyAll(filteredVars.server, "server")}
                  >
                    <CopyIcon className="h-3.5 w-3.5 mr-1" />
                    Copy All
                  </Button>
                </div>
              )}
              {renderVariables(filteredVars.server, "server")}
            </TabsContent>
          </Tabs>
        </PopoverContent>
      </Popover>

      <Dialog open={!!selectedVar} onOpenChange={() => setSelectedVar(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm pr-8">
              {selectedVar?.key}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            <pre className="font-mono text-xs bg-muted p-4 rounded-md whitespace-pre-wrap break-all">
              {selectedVar?.value}
            </pre>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => selectedVar && handleCopy(selectedVar.key, selectedVar.value)}
            >
              <CopyIcon className="h-4 w-4 mr-2" />
              Copy Value
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Helper component to highlight search matches
function HighlightText({ text, highlight }: { text: string; highlight: string }) {
  if (!highlight.trim()) return <>{text}</>

  const parts = text.split(new RegExp(`(${highlight})`, 'gi'))
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === highlight.toLowerCase() ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-900/50 text-inherit rounded px-0.5">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  )
}