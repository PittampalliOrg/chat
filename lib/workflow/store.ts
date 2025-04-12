import { create } from "zustand"
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from "reactflow"
import type { NodeData } from "./types"
import initialNodes from "./initial-nodes"
import initialEdges from "./initial-edges"

type FlowState = {
  nodes: Node<NodeData>[]
  edges: Edge[]
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
  addNode: (node: Node<NodeData>) => void
  updateNodeData: (nodeId: string, data: Partial<NodeData>) => void
  removeNode: (nodeId: string) => void
  removeEdge: (edgeId: string) => void
}

// Define your Zustand store without Liveblocks
const useStore = create<FlowState>((set, get) => ({
  // Initial values for nodes and edges
  nodes: initialNodes,
  edges: initialEdges,

  // Apply changes to React Flow when the flowchart is interacted with
  onNodesChange: (changes: NodeChange[]) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    })
  },
  onEdgesChange: (changes: EdgeChange[]) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    })
  },
  onConnect: (connection: Connection) => {
    set({
      edges: addEdge(
        {
          ...connection,
          type: "custom",
          animated: true,
        },
        get().edges,
      ),
    })
  },

  // Add a new node to the flow
  addNode: (node: Node<NodeData>) => {
    set({
      nodes: [...get().nodes, node],
    })
  },

  // Update node data
  updateNodeData: (nodeId: string, data: Partial<NodeData>) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: { ...node.data, ...data },
          }
        }
        return node
      }),
    })
  },

  // Remove a node
  removeNode: (nodeId: string) => {
    set({
      nodes: get().nodes.filter((node) => node.id !== nodeId),
      // Also remove any connected edges
      edges: get().edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
    })
  },

  // Remove an edge
  removeEdge: (edgeId: string) => {
    set({
      edges: get().edges.filter((edge) => edge.id !== edgeId),
    })
  },
}))

export default useStore
