"use client"
import { startTransition, useMemo, useEffect, useState, useRef } from "react"
import { usePathname } from "next/navigation"

import { saveChatModelAsCookie } from "@/app/(chat)/actions"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

import { CheckCircleFillIcon, ChevronDownIcon } from "./icons"
import { getProviderIcon } from "./icons/provider-icons"

// Define model types
const MODEL_TYPES = [
  { id: "chat", label: "Chat" },
  { id: "reasoning", label: "Reasoning" },
]

// Group models by type
const modelsByType = {
  chat: [
    {
      id: "openai-gpt4o",
      name: "GPT-4o",
      provider: "openai",
      description: "OpenAI's most capable model",
    },
    {
      id: "azure-gpt4",
      name: "GPT-4",
      provider: "azure",
      description: "Azure OpenAI GPT-4",
    },
    {
      id: "google-gemini",
      name: "Gemini Pro",
      provider: "google",
      description: "Google's advanced model",
    },
  ],
  reasoning: [
    {
      id: "anthropic-claude",
      name: "Claude 3.7 Sonnet",
      provider: "anthropic",
      description: "Anthropic's reasoning model",
    },
    {
      id: "openai-gpt4-reasoning",
      name: "GPT-4 Turbo",
      provider: "openai",
      description: "OpenAI's reasoning model",
    },
  ],
}

// Create a global state for model selection that all instances can share
let globalSelectedModelId = "openai-gpt4o"
const modelChangeListeners = new Set<(modelId: string) => void>()

function notifyModelChange(modelId: string) {
  globalSelectedModelId = modelId
  modelChangeListeners.forEach((listener) => listener(modelId))
}

export function ModelSelector({
  selectedModelId: propSelectedModelId,
  className,
  onModelChange,
}: {
  selectedModelId: string
  onModelChange?: (modelId: string) => void
  className?: string
}) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [selectedModelId, setSelectedModelId] = useState(propSelectedModelId || globalSelectedModelId)
  const [isSelecting, setIsSelecting] = useState(false)
  const initialRenderRef = useRef(true)
  const lastSelectedModelRef = useRef(selectedModelId)
  const savingRef = useRef(false)

  // Determine which tab should be active based on the selected model
  const initialTab = useMemo(() => {
    for (const type in modelsByType) {
      if (modelsByType[type as keyof typeof modelsByType].some((m) => m.id === selectedModelId)) {
        return type
      }
    }
    return "chat" // Default to chat tab
  }, [selectedModelId])

  const [activeTab, setActiveTab] = useState(initialTab)

  // Subscribe to global model changes
  useEffect(() => {
    const handleModelChange = (modelId: string) => {
      if (modelId !== selectedModelId) {
        setSelectedModelId(modelId)
        lastSelectedModelRef.current = modelId
      }
    }

    modelChangeListeners.add(handleModelChange)

    // Initialize with global state if available
    if (globalSelectedModelId && globalSelectedModelId !== selectedModelId) {
      setSelectedModelId(globalSelectedModelId)
      lastSelectedModelRef.current = globalSelectedModelId
    } else if (selectedModelId !== globalSelectedModelId) {
      // Update global state with our initial value
      globalSelectedModelId = selectedModelId
    }

    return () => {
      modelChangeListeners.delete(handleModelChange)
    }
  }, []) // Empty dependency array to run only once on mount

  // Update when prop changes, but only after initial render
  useEffect(() => {
    if (initialRenderRef.current) {
      initialRenderRef.current = false
      return
    }

    if (propSelectedModelId && propSelectedModelId !== selectedModelId) {
      setSelectedModelId(propSelectedModelId)
      lastSelectedModelRef.current = propSelectedModelId

      // Only notify others if we're not already saving
      if (!savingRef.current) {
        notifyModelChange(propSelectedModelId)
      }
    }
  }, [propSelectedModelId, selectedModelId])

  // Find the selected model
  const selectedModel = useMemo(() => {
    for (const type in modelsByType) {
      const model = modelsByType[type as keyof typeof modelsByType].find((m) => m.id === selectedModelId)
      if (model) return model
    }
    return modelsByType.chat[0]
  }, [selectedModelId])

  // Get the provider icon component
  const ProviderIcon = selectedModel?.provider ? getProviderIcon(selectedModel.provider) : getProviderIcon("openai")

  const handleModelSelect = (modelId: string) => {
    if (modelId === selectedModelId) {
      // If already selected, just close the dropdown
      setOpen(false)
      return
    }

    setIsSelecting(true)
    setSelectedModelId(modelId)
    lastSelectedModelRef.current = modelId

    // Notify other instances
    notifyModelChange(modelId)

    // Call the onModelChange callback if provided
    if (onModelChange) {
      onModelChange(modelId)
    }

    // Set saving flag to prevent re-entry
    savingRef.current = true

    // Save to cookie
    startTransition(() => {
      saveChatModelAsCookie(modelId).finally(() => {
        // Reset saving flag after completion
        savingRef.current = false
      })
    })

    // Keep dropdown open for a moment to prevent accidental closing
    setTimeout(() => {
      setIsSelecting(false)
      setOpen(false)
    }, 300) // Increased timeout to ensure selection is registered
  }

  // Ensure the selected model is properly reflected in the UI when changing tabs
  useEffect(() => {
    // Check if the selected model is in the current tab
    const isModelInCurrentTab = modelsByType[activeTab].some((m) => m.id === selectedModelId)

    // If not, we need to update the selected model to one from the current tab
    if (!isModelInCurrentTab && modelsByType[activeTab].length > 0) {
      // Find if we previously selected a model in this tab
      const previouslySelectedInTab =
        lastSelectedModelRef.current && modelsByType[activeTab].some((m) => m.id === lastSelectedModelRef.current)

      // If we had a previous selection in this tab, use that, otherwise use the first model
      const newModelId = previouslySelectedInTab ? lastSelectedModelRef.current : modelsByType[activeTab][0].id

      setSelectedModelId(newModelId)
      lastSelectedModelRef.current = newModelId

      // Only notify others if this is a real change and we're not already saving
      if (newModelId !== globalSelectedModelId && !savingRef.current) {
        notifyModelChange(newModelId)

        // Call the onModelChange callback if provided
        if (onModelChange) {
          onModelChange(newModelId)
        }

        // Set saving flag to prevent re-entry
        savingRef.current = true

        // Save to cookie
        startTransition(() => {
          saveChatModelAsCookie(newModelId).finally(() => {
            // Reset saving flag after completion
            savingRef.current = false
          })
        })
      }
    }
  }, [activeTab, onModelChange])

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(isOpen) => {
        // Prevent closing if we're in the middle of selecting
        if (!isOpen && isSelecting) return
        setOpen(isOpen)
      }}
    >
      <DropdownMenuTrigger
        asChild
        className={cn("w-fit data-[state=open]:bg-accent data-[state=open]:text-accent-foreground", className)}
      >
        <Button data-testid="model-selector" variant="outline" className="md:px-2 md:h-[34px] flex items-center gap-2">
          <ProviderIcon className="h-5 w-5 shrink-0" />
          <span className="truncate">{selectedModel?.name}</span>
          <ChevronDownIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[300px] p-0">
        <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            {MODEL_TYPES.map((type) => (
              <TabsTrigger key={type.id} value={type.id}>
                {type.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {MODEL_TYPES.map((type) => (
            <TabsContent key={type.id} value={type.id} className="p-0">
              <div className="py-2">
                {modelsByType[type.id as keyof typeof modelsByType].map((model) => {
                  const ModelIcon = getProviderIcon(model.provider)
                  const isActive = model.id === selectedModelId

                  return (
                    <DropdownMenuItem
                      key={model.id}
                      onSelect={(e) => {
                        e.preventDefault()
                        handleModelSelect(model.id)
                      }}
                      data-active={isActive ? "true" : "false"}
                      asChild
                      className="px-3 py-2"
                    >
                      <button
                        type="button"
                        className="gap-4 group/item flex flex-row justify-between items-center w-full"
                      >
                        <div className="flex items-center gap-2">
                          <ModelIcon className="h-5 w-5 shrink-0" />
                          <div className="flex flex-col gap-1 items-start">
                            <div>{model.name}</div>
                            <div className="text-xs text-muted-foreground">{model.description}</div>
                          </div>
                        </div>

                        <div
                          className={`text-foreground dark:text-foreground ${isActive ? "opacity-100" : "opacity-0"}`}
                        >
                          <CheckCircleFillIcon />
                        </div>
                      </button>
                    </DropdownMenuItem>
                  )
                })}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
