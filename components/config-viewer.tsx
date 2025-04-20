"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Clock } from "lucide-react"

type ConfigItem = {
  key: string
  value: string
  version: number
  updatedAt?: string
}

type ConfigItems = Record<string, ConfigItem>

export default function ConfigViewer() {
  const [config, setConfig] = useState<ConfigItems>({})
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    const eventSource = new EventSource("/api/config/stream")

    eventSource.onmessage = (event) => {
      const updatedItems = JSON.parse(event.data)
      setConfig((prevConfig) => {
        // Merge the updated items with the existing config
        return { ...prevConfig, ...updatedItems }
      })
      setLastUpdated(new Date())
    }

    return () => eventSource.close()
  }, [])

  const formatTimeAgo = (dateString?: string): string => {
    if (!dateString) return "N/A"

    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return `${diffInSeconds} sec ago`
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
    return `${Math.floor(diffInSeconds / 86400)} days ago`
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>Active configuration variables and their versions</CardDescription>
          </div>
          {lastUpdated && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Clock className="mr-1 h-3 w-3" />
              Last updated: {formatTimeAgo(lastUpdated.toISOString())}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {Object.keys(config).length === 0 ? (
          <div className="flex h-24 items-center justify-center text-muted-foreground">
            Waiting for configuration data...
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30%]">Key</TableHead>
                <TableHead className="w-[45%]">Value</TableHead>
                <TableHead className="w-[15%]">Version</TableHead>
                <TableHead className="w-[10%]">Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.values(config).map((item) => (
                <TableRow key={item.key}>
                  <TableCell className="font-medium">{item.key}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {item.value.length > 40 ? `${item.value.substring(0, 40)}...` : item.value}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{item.version}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{formatTimeAgo(item.updatedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
