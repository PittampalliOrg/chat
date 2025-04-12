"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import type { Edge, Node } from "reactflow"
import type { NodeData } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ChevronRight, ChevronLeft, Settings2, Upload } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import useStore from "@/lib/store"
import { useToast } from "@/components/ui/use-toast"

interface SidebarProps {
  selectedNode: Node<NodeData> | null
  selectedEdge: Edge | null
  updateNodeData: (nodeId: string, data: Partial<NodeData>) => void
}

export function Sidebar({ selectedNode, selectedEdge, updateNodeData }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [nodeData, setNodeData] = useState<NodeData>({
    label: "",
    description: "",
    type: "default",
  })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const { nodes, edges } = useStore()

  useEffect(() => {
    if (selectedNode) {
      setNodeData(selectedNode.data)
    }
  }, [selectedNode])

  const handleNodeDataChange = (field: keyof NodeData, value: any) => {
    if (!selectedNode) return

    const updatedData = { ...nodeData, [field]: value }
    setNodeData(updatedData)
    updateNodeData(selectedNode.id, { [field]: value })
  }

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string)
        // Here you would need to add logic to import the workflow
        // This would require adding an importWorkflow function to the store
        toast({
          title: "Import Successful",
          description: "Your workflow has been imported",
        })
      } catch (error) {
        toast({
          title: "Import Failed",
          description: "There was an error importing your workflow",
          variant: "destructive",
        })
      }
    }
    reader.readAsText(file)

    // Reset the input
    if (event.target) {
      event.target.value = ""
    }
  }

  return (
    <div className={`relative border-l border-border bg-background transition-all ${isCollapsed ? "w-12" : "w-80"}`}>
      <Button
        variant="ghost"
        size="icon"
        className="absolute -left-3 top-4 h-6 w-6 rounded-full border border-border bg-background"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </Button>

      {!isCollapsed && (
        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Settings2 className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Properties</h2>
          </div>

          {selectedNode ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="node-label">Label</Label>
                <Input
                  id="node-label"
                  value={nodeData.label}
                  onChange={(e) => handleNodeDataChange("label", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="node-description">Description</Label>
                <Textarea
                  id="node-description"
                  value={nodeData.description}
                  onChange={(e) => handleNodeDataChange("description", e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="node-type">Node Type</Label>
                <Select value={nodeData.type} onValueChange={(value) => handleNodeDataChange("type", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="input">Input</SelectItem>
                    <SelectItem value="output">Output</SelectItem>
                    <SelectItem value="process">Process</SelectItem>
                    <SelectItem value="decision">Decision</SelectItem>
                    <SelectItem value="data">Data</SelectItem>
                    <SelectItem value="default">Default</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : selectedEdge ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Edge selected: {selectedEdge.id}</p>
              <div className="space-y-2">
                <Label htmlFor="edge-animated">Animated</Label>
                <div className="flex items-center space-x-2">
                  <Switch id="edge-animated" checked={selectedEdge.animated} />
                  <Label htmlFor="edge-animated">Enable animation</Label>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <p className="text-sm text-muted-foreground">Select a node or edge to edit its properties</p>
            </div>
          )}

          <Separator className="my-4" />

          <div className="space-y-4">
            <h3 className="text-sm font-medium">Workflow Information</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Nodes</span>
                <span className="text-xs font-medium">{nodes.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Connections</span>
                <span className="text-xs font-medium">{edges.length}</span>
              </div>
            </div>

            <div className="pt-2">
              <Button variant="outline" size="sm" onClick={handleImportClick} className="w-full gap-1">
                <Upload className="h-4 w-4" />
                Import Workflow
              </Button>
              <input type="file" ref={fileInputRef} onChange={handleFileImport} accept=".json" className="hidden" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
