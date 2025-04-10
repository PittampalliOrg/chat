"use client";

import { useState, useEffect, useCallback } from "react";
import { ServerIcon, CheckCircle, XCircle, Loader, PlugZap, ServerOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
// MCPConfigDialog import removed as frontend editing is disabled
import { cn } from "@/lib/utils";
import { useMcpManager } from "@/lib/contexts/McpManagerContext"; // Use the new hook
import { McpConnectionState } from "@/lib/mcp/mcp.types"; // Import state enum
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Tool } from "@modelcontextprotocol/sdk/types.js"; // Assuming older SDK Tool type for now

// Placeholder for fetching tools for a specific server (needs implementation)
const useServerTools = (serverId: string | null): Tool[] => {
    // TODO: Implement logic to get tools for the specified server ID
    // This might involve:
    // 1. Sending a 'tools/list' request via useMcpManager.sendMcpRequest when the server connects.
    // 2. Storing the results in the McpManagerContext state alongside server status.
    // 3. Retrieving the tools here based on serverId.
    // For now, returning an empty array.
    const { serverStates } = useMcpManager();
    const server = serverId ? serverStates[serverId] : null;
    // Example placeholder - replace with actual tool fetching/retrieval
    return server?.status === McpConnectionState.Running ? (server as any).tools || [] : [];
};


export function MCPServerButton() {
  const {
    wsStatus,
    serverStates,
    connectToServer,
    disconnectFromServer,
  } = useMcpManager(); // Use the new hook

  // Local state to track which server is "selected" for primary interaction
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);

  // Sync selectedServerId if the server disconnects or disappears
  useEffect(() => {
      if (selectedServerId && (!serverStates[selectedServerId] || serverStates[selectedServerId].status === McpConnectionState.Stopped || serverStates[selectedServerId].status === McpConnectionState.Failed )) {
          // If the selected server disconnects/fails/disappears, deselect it
          setSelectedServerId(null);
      }
  }, [serverStates, selectedServerId]);


  const handleServerSelection = useCallback(async (id: string | null) => {
    if (id === null) {
       // Disconnect the currently selected server if any
       if(selectedServerId) {
           console.log(`[MCPServerButton] User chose disconnect for ${selectedServerId}`);
           disconnectFromServer(selectedServerId);
           setSelectedServerId(null); // Deselect in UI
       }
    } else {
        const currentStatus = serverStates[id]?.status;
        // If already selected and running, do nothing? Or maybe allow re-select?
        if (selectedServerId === id && currentStatus === McpConnectionState.Running) {
            console.log(`[MCPServerButton] Server ${id} already selected and running.`);
            return;
        }

        // If selecting a server that is stopped or failed, attempt connection
        if (currentStatus === McpConnectionState.Stopped || currentStatus === McpConnectionState.Failed) {
             console.log(`[MCPServerButton] User selected server ${id}, attempting connect...`);
             connectToServer(id); // Request connection
             setSelectedServerId(id); // Tentatively select in UI
        } else if (currentStatus === McpConnectionState.Running) {
            // If selecting a running server that wasn't the currently selected one
             console.log(`[MCPServerButton] Selecting already running server ${id}`);
             setSelectedServerId(id); // Just update UI selection
        } else {
             // If connecting or starting, maybe just select it in the UI
             console.log(`[MCPServerButton] Selecting server ${id} (currently ${McpConnectionState[currentStatus ?? McpConnectionState.Stopped]})`);
             setSelectedServerId(id);
        }
    }
  }, [serverStates, selectedServerId, connectToServer, disconnectFromServer]);

  const selectedServerState = selectedServerId ? serverStates[selectedServerId] : null;
  const status = selectedServerState?.status ?? McpConnectionState.Stopped;
  const errorMsg = selectedServerState?.error;
  // Placeholder: Fetch tools for the selected server
  const tools = useServerTools(selectedServerId);

  const isConnecting = status === McpConnectionState.Starting;
  const isConnected = status === McpConnectionState.Running;
  const isError = status === McpConnectionState.Failed;
  const hasConfigs = Object.keys(serverStates).length > 0;
  const wsConnecting = wsStatus === 'connecting';
  const wsDisconnected = wsStatus === 'closed' || wsStatus === 'error';

  const getStatusColor = () => {
    if (wsDisconnected) return "bg-gray-400";
    if (wsConnecting) return "bg-yellow-500 animate-pulse";
    // If WS is connected, show server status
    if (isConnected) return "bg-green-500";
    if (isConnecting) return "bg-yellow-500 animate-pulse";
    if (isError) return "bg-red-500";
    return "bg-gray-400"; // Default / Stopped
  };

  const getButtonVariant = () => {
      if (wsDisconnected || wsConnecting) return "outline";
      if (isConnected) return "default";
      if (isConnecting || isError) return "secondary";
      return "outline";
  }

  const getButtonText = () => {
      if (wsDisconnected) return "WS Disconnected";
      if (wsConnecting) return "WS Connecting...";
      if (isConnected && selectedServerId) return serverStates[selectedServerId]?.label || selectedServerId;
      if (isConnecting && selectedServerId) return `Connecting: ${serverStates[selectedServerId]?.label || selectedServerId}...`;
      if (isError && selectedServerId) return `Error: ${serverStates[selectedServerId]?.label || selectedServerId}`;
      if (selectedServerId && status === McpConnectionState.Stopped) return `Connect: ${serverStates[selectedServerId]?.label || selectedServerId}`;
      return "Select MCP Server";
  }

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={getButtonVariant()}
            size="sm"
            className={cn(
              "flex items-center gap-2 h-9 px-3 min-w-[150px] justify-between", // Increased min-width
              !hasConfigs && "border-dashed"
            )}
            disabled={wsConnecting} // Disable only if WS itself is connecting
          >
            <div className="flex items-center gap-2 truncate">
              <div className={`relative flex h-2 w-2 mr-1`}>
                  <span className={cn("relative inline-flex rounded-full h-2 w-2", getStatusColor())} />
                  {(isConnecting || wsConnecting) && <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", getStatusColor())} />}
              </div>
              <span className="truncate">{getButtonText()}</span>
               {isConnecting && <Loader className="h-4 w-4 animate-spin ml-1 flex-shrink-0" />}
            </div>
             {isConnected && <Badge variant="outline" className="ml-auto flex-shrink-0 text-xs">{tools.length} tools</Badge>}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[250px]">
          <DropdownMenuLabel>Available MCP Servers</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {Object.values(serverStates).map((state) => {
             const sId = state.id;
             const sStatus = state.status;
             const sError = state.error;
             const sConnecting = sStatus === McpConnectionState.Starting;
             const sConnected = sStatus === McpConnectionState.Running;
             const sFailed = sStatus === McpConnectionState.Failed;

             return (
                 <DropdownMenuItem
                     key={sId}
                     onSelect={() => handleServerSelection(sId)}
                     disabled={wsConnecting || sConnecting} // Disable if WS connecting or server connecting
                     className="flex justify-between items-center"
                 >
                     <span className={cn(selectedServerId === sId && "font-semibold")}>{state.label || sId}</span>
                     <div className="flex items-center gap-1 ml-2">
                         {sConnected && <CheckCircle className="h-4 w-4 text-green-500" />}
                         {sFailed && <span title={sError}><XCircle className="h-4 w-4 text-red-500" /></span>}
                         {sConnecting && <Loader className="h-4 w-4 animate-spin" />}
                         {/* Add icon for stopped? */}
                     </div>
                 </DropdownMenuItem>
            )
          })}
          {!hasConfigs && wsStatus === 'open' && <DropdownMenuItem disabled>No servers configured</DropdownMenuItem>}
          {(wsStatus === 'closed' || wsStatus === 'error') && <DropdownMenuItem disabled>WebSocket Disconnected</DropdownMenuItem>}
          {wsConnecting && <DropdownMenuItem disabled>Connecting WebSocket...</DropdownMenuItem>}

          <DropdownMenuSeparator />
           <DropdownMenuItem
               onSelect={() => handleServerSelection(null)}
               disabled={wsConnecting || !selectedServerId || !isConnected} // Disable if nothing connected
            >
              <ServerOff className="h-4 w-4 mr-2"/> Disconnect Current
           </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}