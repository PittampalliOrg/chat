import { cn } from "@/lib/utils"
import type { FileNode } from "@/types/code-viewer"

interface CodePaneProps {
  file: FileNode | null
  className?: string
}

export function CodePane({ file, className }: CodePaneProps) {
  if (!file) {
    return (
      <div className={cn("flex h-full items-center justify-center", className)}>
        <p className="text-muted-foreground">Select a file to view its content</p>
      </div>
    )
  }

  return (
    <div className={cn("h-full overflow-auto", className)}>
      <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-4 py-2">
        <h2 className="text-sm font-medium">{file.name}</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{file.language || "plain"}</span>
        </div>
      </div>
      <div className="p-4">
        <pre className="rounded-md bg-muted p-4 overflow-auto">
          <code className={`language-${file.language || "plaintext"}`}>{file.content || "No content available"}</code>
        </pre>
      </div>
    </div>
  )
}
