'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useWindowSize } from 'usehooks-ts';

import { ModelSelector } from '@/components/model-selector';
import { SidebarToggle } from '@/components/sidebar-toggle';
import { Button } from '@/components/ui/button';
import { PlusIcon, VercelIcon } from './icons';
import { useSidebar } from './ui/sidebar';
import { memo } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { type VisibilityType, VisibilitySelector } from './visibility-selector';
import { MCPServerButton } from "./mcp-server-button"
import { useChatSettings } from "@/lib/contexts/ChatSettingsContext"
import useSWR from "swr"
import { fetcher } from "@/lib/utils"
import { SettingsDrawer } from "./settings-drawer"
import { ChevronRight } from 'lucide-react';

function PureChatHeader({
  chatId,
  selectedModelId,
  selectedVisibilityType,
  isReadonly,
}: {
  chatId: string;
  selectedModelId: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { open } = useSidebar();

  const { width: windowWidth } = useWindowSize();

  // Fetch chat title if we have a chat ID
  const { data: chatData, isLoading } = useSWR(chatId ? `/api/chat/${chatId}/info` : null, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000, // Cache for 1 minute
  })

  // Use the fetched title or a default
  const chatTitle = chatData?.title || (chatId ? `Chat ${chatId.slice(0, 8)}...` : "New Chat")

  // Extract breadcrumb segments from pathname with chat title
  const getBreadcrumbs = () => {
    const segments = pathname?.split("/").filter(Boolean) || []

    // If no segments, we're on the home page
    if (segments.length === 0) {
      return [{ label: "Home", path: "/" }]
    }

    // Build breadcrumb items
    return segments.map((segment, index) => {
      const path = `/${segments.slice(0, index + 1).join("/")}`

      // If this is a chat segment and we have a chat ID
      if (segment === "chat" && index === 0) {
        return { label: "Chat", path }
      }
      // If this is a chat ID segment (the last segment in a /chat/[id] path)
      else if (index > 0 && segments[index - 1] === "chat" && segment === chatId) {
        return {
          label: isLoading ? "Loading..." : chatTitle,
          path,
        }
      }
      // For all other segments, just capitalize the first letter
      else {
        const label = segment.charAt(0).toUpperCase() + segment.slice(1)
        return { label, path }
      }
    })
  }

  const breadcrumbs = getBreadcrumbs()

  return (
    <header className="flex h-12 min-h-[48px] w-full bg-background/80 backdrop-blur-md border-b border-border items-center px-3 gap-2 shadow-sm z-30">
      <div className="flex items-center gap-2 min-w-0">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center text-sm font-medium overflow-hidden">
          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.path} className="flex items-center">
              {index > 0 && <ChevronRight className="h-4 w-4 mx-1 text-muted-foreground flex-shrink-0" />}
              <Link
                href={crumb.path}
                className={`truncate ${index === breadcrumbs.length - 1 ? "text-foreground" : "text-muted-foreground hover:text-foreground"} flex-shrink-0`}
              >
                {crumb.label}
              </Link>
            </div>
          ))}
        </div>
      </div>

      <div className="ml-auto flex items-center gap-3">

        {/* Only show model selector on chat pages and when not readonly */}
        {pathname?.includes("/chat/") && !isReadonly && selectedModelId && (
          <div className="w-[160px] md:w-[180px]">
            <ModelSelector selectedModelId={selectedModelId} className="h-8 w-full" />
          </div>
        )}

        {/* MCP Server Button */}
        <MCPServerButton />
        {/* Settings Drawer */}
        <SettingsDrawer
          chatId={chatId}
          selectedModelId={selectedModelId}
          selectedVisibilityType={selectedVisibilityType}
          isReadonly={isReadonly}
        />
      </div>
    </header>
  );
}

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  return prevProps.selectedModelId === nextProps.selectedModelId;
});
