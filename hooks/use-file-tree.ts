"use client"

import { useState, useCallback } from "react"
import type { FileNode } from "@/types/code-viewer"

export function useFileTree(initialFiles: FileNode[]) {
  const [files, setFiles] = useState<FileNode[]>(initialFiles)
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(findFirstFile(initialFiles)?.path || null)
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(getInitialExpandedDirs(initialFiles)))

  // Find the first file in the tree to select by default
  function findFirstFile(nodes: FileNode[]): FileNode | null {
    for (const node of nodes) {
      if (node.type === "file") {
        return node
      }
      if (node.type === "directory" && node.children?.length) {
        const found = findFirstFile(node.children)
        if (found) return found
      }
    }
    return null
  }

  // Get initial expanded directories to show the first file
  function getInitialExpandedDirs(nodes: FileNode[], path: string[] = []): string[] {
    const expandedDirs: string[] = []

    for (const node of nodes) {
      if (node.type === "directory") {
        const currentPath = [...path, node.path]
        expandedDirs.push(node.path)

        if (node.children?.length) {
          expandedDirs.push(...getInitialExpandedDirs(node.children, currentPath))
        }
      }
    }

    return expandedDirs
  }

  const toggleDirectory = useCallback((dirPath: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev)
      if (next.has(dirPath)) {
        next.delete(dirPath)
      } else {
        next.add(dirPath)
      }
      return next
    })
  }, [])

  const selectFile = useCallback((filePath: string) => {
    setSelectedFilePath(filePath)
  }, [])

  const getSelectedFile = useCallback(() => {
    if (!selectedFilePath) return null

    const findFile = (nodes: FileNode[]): FileNode | null => {
      for (const node of nodes) {
        if (node.path === selectedFilePath) {
          return node
        }
        if (node.type === "directory" && node.children?.length) {
          const found = findFile(node.children)
          if (found) return found
        }
      }
      return null
    }

    return findFile(files)
  }, [files, selectedFilePath])

  const updateFileContent = useCallback((path: string, content: string) => {
    const updateContent = (nodes: FileNode[]): FileNode[] => {
      return nodes.map((node) => {
        if (node.path === path) {
          return { ...node, content }
        }
        if (node.type === "directory" && node.children?.length) {
          return {
            ...node,
            children: updateContent(node.children),
          }
        }
        return node
      })
    }

    setFiles((prev) => updateContent(prev))
  }, [])

  return {
    files,
    selectedFilePath,
    expandedDirs,
    toggleDirectory,
    selectFile,
    getSelectedFile,
    updateFileContent,
  }
}
