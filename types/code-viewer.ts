export interface FileNode {
  id: string
  name: string
  path: string
  type: "file" | "directory"
  language?: string
  content?: string
  children?: FileNode[]
}

export interface CodeViewerProps {
  initialFiles: FileNode[]
  defaultSelectedFile?: string
  className?: string
  readOnly?: boolean
  onFileChange?: (path: string, content: string) => void
}
