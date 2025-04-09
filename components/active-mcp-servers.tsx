"use client"

import { ServerIcon, XCircleIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { useMcpManager } from "@/lib/contexts/McpManagerContext"; // Use the new context
import { McpConnectionState, McpServerDefinition } from "@/lib/mcp/mcp.types"; // Import types

// Helper to get config details (assuming they might be needed for tooltip)
const getServerConfigDetails = (state: any): string => {
    // The state object from the backend currently only includes id, label, status, error.
    // If we need command/url in the tooltip, the backend needs to send the full definition.
    // For now, return a generic string or rely on label.
    return state.label || state.id;
}

export function ActiveMCPServers() {
  const { serverStates, disconnectFromServer } = useMcpManager(); // Get state and actions

  const activeServerEntries = Object.values(serverStates).filter(
      (state) => state.status === McpConnectionState.Running
  );

  if (activeServerEntries.length === 0) {
    return null; // Don't render if no servers are actively running
  }

  return (
    <TooltipProvider>
      <div className="flex flex-wrap gap-2 mb-4 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
        <div className="w-full text-xs font-medium text-green-800 dark:text-green-300 mb-1 flex items-center">
          <div className="relative mr-2">
            {/* Static green dot indicating at least one server is active */}
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </div>
           Connected MCP Servers:
        </div>
        {activeServerEntries.map((serverState) => {
          if (!serverState) return null; // Should not happen with filter, but good practice

          const serverId = serverState.id;
          const serverLabel = serverState.label || serverId; // Fallback to ID if label missing
          const tooltipContent = getServerConfigDetails(serverState); // Get details for tooltip

          return (
            <Tooltip key={serverId}>
              <TooltipTrigger asChild>
                <Badge
                  variant="secondary"
                  className="flex items-center gap-1 pl-1.5 pr-1 py-1 group bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 text-green-800 dark:text-green-300 cursor-default" // No hover effect needed?
                >
                  <div className="h-2 w-2 rounded-full bg-green-500 mr-1.5 flex-shrink-0"></div>
                  <ServerIcon className="h-3 w-3 mr-1 flex-shrink-0" />
                  <span className="truncate" title={serverLabel}>{serverLabel}</span>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      disconnectFromServer(serverId); // Use context action
                    }}
                    className="ml-1 opacity-50 hover:opacity-100 group-hover:opacity-100 transition-opacity" // Always show slightly, full on group hover
                    title={`Disconnect ${serverLabel}`}
                  >
                    <XCircleIcon className="h-3.5 w-3.5 text-green-700/70 dark:text-green-400/70 hover:text-red-500 dark:hover:text-red-400" />
                  </button>
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">
                  <p className="font-medium">{serverLabel}</p>
                  {/* Display more details if available and needed */}
                  <p className="text-muted-foreground">{tooltipContent}</p>
                  <p className="text-muted-foreground">Status: Running</p>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}