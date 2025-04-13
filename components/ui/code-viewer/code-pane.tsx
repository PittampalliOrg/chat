"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import Editor from "@monaco-editor/react"
import { cn } from "@/lib/utils"
import type { FileNode } from "@/types/code-viewer"
import { Skeleton } from "@/components/ui/skeleton"

interface CodePaneProps {
  file: FileNode | null
  className?: string
  readOnly?: boolean
  onContentChange?: (content: string) => void
}

export function CodePane({ file, className, readOnly = true, onContentChange }: CodePaneProps) {
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Monaco editor needs to be mounted client-side only
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!file) {
    return (
      <div className={cn("flex h-full items-center justify-center", className)}>
        <p className="text-muted-foreground">Select a file to view its content</p>
      </div>
    )
  }

  // Map file extensions to Monaco language IDs
  const getLanguageFromFile = (file: FileNode): string => {
    if (file.language) return file.language

    const extension = file.name.split(".").pop()?.toLowerCase()

    const languageMap: Record<string, string> = {
      js: "javascript",
      jsx: "javascript",
      ts: "typescript",
      tsx: "typescript",
      md: "markdown",
      html: "html",
      css: "css",
      json: "json",
      py: "python",
      rb: "ruby",
      go: "go",
      java: "java",
      php: "php",
      cs: "csharp",
      rs: "rust",
    }

    return languageMap[extension || ""] || "plaintext"
  }

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined && onContentChange) {
      onContentChange(value)
    }
  }

  return (
    <div className={cn("h-full overflow-hidden", className)}>
      <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-4 py-2">
        <h2 className="text-sm font-medium">{file.name}</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{getLanguageFromFile(file)}</span>
        </div>
      </div>
      <div className="h-[calc(100%-40px)]">
        {!mounted ? (
          <div className="p-4 h-full">
            <Skeleton className="h-full w-full" />
          </div>
        ) : (
          <Editor
            height="100%"
            language={getLanguageFromFile(file)}
            value={file.content || ""}
            theme={theme === "dark" ? "vs-dark" : "light"}
            options={{
              readOnly,
              minimap: { enabled: true },
              scrollBeyondLastLine: false,
              fontSize: 14,
              fontFamily: "var(--font-geist-mono)",
              wordWrap: "on",
              automaticLayout: true,
              lineNumbers: "on",
              scrollbar: {
                vertical: "visible",
                horizontal: "visible",
              },
            }}
            onChange={handleEditorChange}
          />
        )}
      </div>
    </div>
  )
}
