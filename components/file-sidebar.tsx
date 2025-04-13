"use client"
import { ChevronRight, File, Folder, FolderOpen } from "lucide-react"
import { cn } from "@/lib/utils"
import type { FileNode } from "@/types/code-viewer"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

interface FileSidebarProps {
  files: FileNode[]
  selectedFilePath: string | null
  expandedDirs: Set<string>
  onSelectFile: (path: string) => void
  onToggleDirectory: (path: string) => void
  className?: string
}

export function FileSidebar({
  files,
  selectedFilePath,
  expandedDirs,
  onSelectFile,
  onToggleDirectory,
  className,
}: FileSidebarProps) {
  return (
    <div className={cn("h-full overflow-auto p-2", className)}>
      <div className="text-sm font-medium py-2 px-2">Files</div>
      <div className="mt-2">
        <FileTree
          nodes={files}
          selectedFilePath={selectedFilePath}
          expandedDirs={expandedDirs}
          onSelectFile={onSelectFile}
          onToggleDirectory={onToggleDirectory}
        />
      </div>
    </div>
  )
}

interface FileTreeProps {
  nodes: FileNode[]
  selectedFilePath: string | null
  expandedDirs: Set<string>
  onSelectFile: (path: string) => void
  onToggleDirectory: (path: string) => void
  level?: number
}

function FileTree({
  nodes,
  selectedFilePath,
  expandedDirs,
  onSelectFile,
  onToggleDirectory,
  level = 0,
}: FileTreeProps) {
  return (
    <ul className={cn("space-y-1", level > 0 && "ml-4")}>
      {nodes.map((node) => (
        <li key={node.id} className="relative">
          {node.type === "directory" ? (
            <Collapsible open={expandedDirs.has(node.path)} onOpenChange={() => onToggleDirectory(node.path)}>
              <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted text-sm">
                <ChevronRight
                  className={cn("h-4 w-4 shrink-0 transition-transform", expandedDirs.has(node.path) && "rotate-90")}
                />
                {expandedDirs.has(node.path) ? (
                  <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <span className="truncate">{node.name}</span>
              </CollapsibleTrigger>
              <CollapsibleContent>
                {node.children && node.children.length > 0 && (
                  <FileTree
                    nodes={node.children}
                    selectedFilePath={selectedFilePath}
                    expandedDirs={expandedDirs}
                    onSelectFile={onSelectFile}
                    onToggleDirectory={onToggleDirectory}
                    level={level + 1}
                  />
                )}
              </CollapsibleContent>
            </Collapsible>
          ) : (
            <button
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted text-sm",
                selectedFilePath === node.path && "bg-muted font-medium",
              )}
              onClick={() => onSelectFile(node.path)}
            >
              <span className="w-4" />
              <File className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{node.name}</span>
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}
