"use client"

import * as React from "react"
import { PanelLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import type { CodeViewerProps } from "@/types/code-viewer"
import { useFileTree } from "@/hooks/use-file-tree"
import { FileSidebar } from "./file-sidebar"
import { CodePane } from "./code-pane"
import { Button } from "@/components/ui/button"
import { useMediaQuery } from "@/hooks/use-media-query"
import { Sheet, SheetContent } from "@/components/ui/sheet"

export function CodeViewer({
  initialFiles,
  defaultSelectedFile,
  className,
  readOnly = true,
  onFileChange,
}: CodeViewerProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(true)
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const isDesktop = useMediaQuery("(min-width: 768px)")

  const { files, selectedFilePath, expandedDirs, toggleDirectory, selectFile, getSelectedFile, updateFileContent } =
    useFileTree(initialFiles)

  // Set default selected file if provided
  React.useEffect(() => {
    if (defaultSelectedFile) {
      selectFile(defaultSelectedFile)
    }
  }, [defaultSelectedFile, selectFile])

  const selectedFile = getSelectedFile()

  const toggleSidebar = () => {
    if (isDesktop) {
      setSidebarOpen(!sidebarOpen)
    } else {
      setMobileOpen(!mobileOpen)
    }
  }

  const handleContentChange = (content: string) => {
    if (selectedFilePath) {
      updateFileContent(selectedFilePath, content)
      if (onFileChange) {
        onFileChange(selectedFilePath, content)
      }
    }
  }

  return (
    <div className={cn("flex h-full overflow-hidden rounded-lg border", className)}>
      {isDesktop ? (
        <div
          className={cn("border-r bg-background transition-all duration-300 ease-in-out", sidebarOpen ? "w-64" : "w-0")}
        >
          {sidebarOpen && (
            <FileSidebar
              files={files}
              selectedFilePath={selectedFilePath}
              expandedDirs={expandedDirs}
              onSelectFile={selectFile}
              onToggleDirectory={toggleDirectory}
            />
          )}
        </div>
      ) : (
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-[80%] sm:w-[350px] p-0">
            <FileSidebar
              files={files}
              selectedFilePath={selectedFilePath}
              expandedDirs={expandedDirs}
              onSelectFile={(path) => {
                selectFile(path)
                setMobileOpen(false)
              }}
              onToggleDirectory={toggleDirectory}
              className="h-full"
            />
          </SheetContent>
        </Sheet>
      )}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex h-10 items-center border-b px-4">
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="mr-2" aria-label="Toggle sidebar">
            <PanelLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 truncate text-sm font-medium">{selectedFile?.path || "No file selected"}</div>
        </div>
        <CodePane file={selectedFile} className="flex-1" readOnly={readOnly} onContentChange={handleContentChange} />
      </div>
    </div>
  )
}
