"use client"

import { useArtifact } from "@/hooks/use-artifact"
import { useEffect, useState } from "react"
import { Badge } from "./ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip"
import { cn } from "@/lib/utils"
import { MinusCircle, PlusCircle, Trash2 } from "lucide-react"
import { Button } from "./ui/button"

export function ArtifactTypeDebugger() {
  const { artifact } = useArtifact()
  const [typeChanges, setTypeChanges] = useState<Array<{ type: string; timestamp: number }>>([])
  const [flash, setFlash] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    // Track type changes with timestamps
    if (artifact?.kind) {
      setTypeChanges((prev) => [...prev, { type: artifact.kind, timestamp: Date.now() }])

      // Trigger flash animation on type change
      setFlash(true)
      const timer = setTimeout(() => setFlash(false), 500)
      return () => clearTimeout(timer)
    }
  }, [artifact?.kind])

  const clearHistory = () => {
    setTypeChanges([])
  }

  if (!artifact) return null

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2 p-3 bg-black/20 backdrop-blur-md rounded-lg border border-zinc-700/50 shadow-lg transition-all duration-200",
        isCollapsed ? "w-auto" : "w-auto max-w-[250px]",
      )}
    >
      <div className="flex items-center justify-between w-full">
        <div className="text-xs text-zinc-400 flex items-center gap-1">{!isCollapsed && "Artifact Debugger"}</div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setIsCollapsed(!isCollapsed)}>
            {isCollapsed ? (
              <PlusCircle className="h-3 w-3 text-zinc-400" />
            ) : (
              <MinusCircle className="h-3 w-3 text-zinc-400" />
            )}
          </Button>
        </div>
      </div>

      {!isCollapsed && (
        <>
          <div className="flex items-center gap-2 w-full">
            <span className="text-xs text-zinc-400">Current Type:</span>
            <Badge
              className={cn(
                "font-mono text-xs",
                flash ? "animate-pulse bg-amber-500" : "",
                artifact.kind === "text" && "bg-blue-600",
                artifact.kind === "code" && "bg-green-600",
                artifact.kind === "image" && "bg-purple-600",
                artifact.kind === "sheet" && "bg-orange-600",
              )}
            >
              {artifact.kind || "unspecified"}
            </Badge>
          </div>

          <div className="flex items-center gap-2 w-full">
            <span className="text-xs text-zinc-400">Status:</span>
            <Badge
              variant="outline"
              className={cn(
                "text-xs",
                artifact.status === "streaming" && "text-yellow-400 border-yellow-400",
                artifact.status === "idle" && "text-green-400 border-green-400",
              )}
            >
              {artifact.status}
            </Badge>
          </div>

          {typeChanges.length > 0 && (
            <div className="flex items-center justify-between w-full">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-xs text-zinc-400 cursor-help underline decoration-dotted">
                    {typeChanges.length} type change{typeChanges.length !== 1 ? "s" : ""}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-h-60 overflow-y-auto">
                  <div className="flex flex-col gap-1">
                    {typeChanges.map((change, i) => (
                      <div key={i} className="flex gap-2 text-xs">
                        <span className="text-zinc-400">
                          {new Date(change.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                          :
                        </span>
                        <span className="font-mono">{change.type}</span>
                      </div>
                    ))}
                  </div>
                </TooltipContent>
              </Tooltip>
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={clearHistory} title="Clear history">
                <Trash2 className="h-3 w-3 text-zinc-400" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
