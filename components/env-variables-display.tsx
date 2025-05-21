"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EyeIcon, RefreshCwIcon } from "lucide-react"

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

  return (
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
      <PopoverContent className="w-80 md:w-96 max-h-[70vh] overflow-auto">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-medium">Environment Variables</h3>
          <Button variant="outline" size="sm" onClick={fetchEnvVariables} disabled={isLoading}>
            <RefreshCwIcon size={14} className={`mr-1 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 p-2 rounded mb-2 text-sm">
            Error: {error}
          </div>
        )}

        <Tabs defaultValue="client">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="client">Client (NEXT_PUBLIC_*)</TabsTrigger>
            <TabsTrigger value="server">Server</TabsTrigger>
          </TabsList>

          <TabsContent value="client" className="mt-2">
            {Object.keys(envVars.client).length > 0 ? (
              <div className="space-y-1">
                {Object.entries(envVars.client).map(([key, value]) => (
                  <div key={key} className="grid grid-cols-2 gap-2 py-1 border-b border-gray-100 dark:border-gray-800">
                    <span className="font-mono text-xs truncate">{key}</span>
                    <span className="font-mono text-xs truncate">{value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-2">No client environment variables found.</p>
            )}
          </TabsContent>

          <TabsContent value="server" className="mt-2">
            {Object.keys(envVars.server).length > 0 ? (
              <div className="space-y-1">
                {Object.entries(envVars.server).map(([key, value]) => (
                  <div key={key} className="grid grid-cols-2 gap-2 py-1 border-b border-gray-100 dark:border-gray-800">
                    <span className="font-mono text-xs truncate">{key}</span>
                    <span className="font-mono text-xs truncate">{value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground py-2">
                <p>No server environment variables found.</p>
                <p className="mt-1 text-xs">This could be due to server-side filtering or no variables being set.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  )
}
