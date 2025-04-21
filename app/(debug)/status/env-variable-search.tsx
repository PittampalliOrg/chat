"use client"

import { useState, useEffect, useMemo } from "react"
import { Search, Copy, Check } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface EnvVariableSearchProps {
  envVars: Record<string, string>
  categorizedEnv: {
    connection: [string, string][]
    nextjs: [string, string][]
    vercel: [string, string][]
    node: [string, string][]
    system: [string, string][]
    other: [string, string][]
  }
  counts: {
    all: number
    connection: number
    nextjs: number
    vercel: number
    node: number
    system: number
    other: number
  }
}

export function EnvVariableSearch({ envVars, categorizedEnv, counts }: EnvVariableSearchProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  // Filter environment variables based on search term
  const filteredVars = useMemo(() => {
    if (!searchTerm) {
      return Object.entries(envVars)
    }

    const lowerSearchTerm = searchTerm.toLowerCase()
    return Object.entries(envVars).filter(
      ([key, value]) => key.toLowerCase().includes(lowerSearchTerm) || value.toLowerCase().includes(lowerSearchTerm),
    )
  }, [envVars, searchTerm])

  // Get the variables to display based on active tab and search
  const displayVars = useMemo(() => {
    if (searchTerm) {
      // When searching, we want to show results from all categories
      return filteredVars
    }

    // When not searching, show based on selected tab
    switch (activeTab) {
      case "connection":
        return categorizedEnv.connection
      case "nextjs":
        return categorizedEnv.nextjs
      case "vercel":
        return categorizedEnv.vercel
      case "node":
        return categorizedEnv.node
      case "system":
        return categorizedEnv.system
      case "other":
        return categorizedEnv.other
      default:
        return Object.entries(envVars)
    }
  }, [activeTab, categorizedEnv, envVars, filteredVars, searchTerm])

  // Reset copied state after 2 seconds
  useEffect(() => {
    if (copiedKey) {
      const timer = setTimeout(() => {
        setCopiedKey(null)
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [copiedKey])

  // Copy value to clipboard
  const copyToClipboard = (key: string, value: string) => {
    navigator.clipboard.writeText(value)
    setCopiedKey(key)
  }

  // Highlight matching text in search results
  const highlightMatch = (text: string) => {
    if (!searchTerm) return text

    const regex = new RegExp(`(${searchTerm})`, "gi")
    const parts = text.split(regex)

    return parts.map((part, i) =>
      regex.test(part) ? (
        <span key={i} className="search-highlight">
          {part}
        </span>
      ) : (
        part
      ),
    )
  }

  return (
    <div className="env-search-container">
      <div className="p-4 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search environment variables..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="px-4">
        <TabsList className="grid grid-cols-7">
          <TabsTrigger value="all" className="flex items-center gap-1">
            All
            <Badge variant="secondary" className="ml-1">
              {counts.all}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="connection" className="flex items-center gap-1">
            Connection
            <Badge variant="secondary" className="ml-1">
              {counts.connection}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="nextjs" className="flex items-center gap-1">
            Next.js
            <Badge variant="secondary" className="ml-1">
              {counts.nextjs}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="vercel" className="flex items-center gap-1">
            Vercel
            <Badge variant="secondary" className="ml-1">
              {counts.vercel}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="node" className="flex items-center gap-1">
            Node
            <Badge variant="secondary" className="ml-1">
              {counts.node}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-1">
            System
            <Badge variant="secondary" className="ml-1">
              {counts.system}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="other" className="flex items-center gap-1">
            Other
            <Badge variant="secondary" className="ml-1">
              {counts.other}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-2">
          <div className="env-table-container scrollbar-stable">
            <Table>
              <TableHeader className="env-table-header">
                <TableRow>
                  <TableHead className="w-[40%]">Variable</TableHead>
                  <TableHead className="w-[55%]">Value</TableHead>
                  <TableHead className="w-[5%]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="env-table-body">
                {displayVars.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                      No environment variables found
                    </TableCell>
                  </TableRow>
                ) : (
                  displayVars
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([key, value]) => (
                      <TableRow key={key}>
                        <TableCell className="font-mono text-xs">{searchTerm ? highlightMatch(key) : key}</TableCell>
                        <TableCell className="text-sm break-all">
                          {searchTerm ? highlightMatch(value) : value}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyToClipboard(key, value)}
                            title="Copy to clipboard"
                          >
                            {copiedKey === key ? (
                              <Check className="h-4 w-4 copy-success" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="px-4 py-2 text-xs text-muted-foreground">
            {searchTerm ? (
              <p>
                Showing {displayVars.length} of {counts.all} environment variables
              </p>
            ) : (
              <p>Showing {displayVars.length} environment variables</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
