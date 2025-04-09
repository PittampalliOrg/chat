"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { PlusIcon, HomeIcon, BookIcon, FolderIcon, HelpCircleIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { SidebarUserNav } from "@/components/sidebar-user-nav"
import { SidebarHistory } from "@/components/sidebar-history"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"

export function AppSidebar({ user }: { user?: any }) {
  const router = useRouter()
  const pathname = usePathname()
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"

  // Navigation items with icons - shown in both collapsed and expanded states
  const navItems = [
    { href: "/community", icon: HomeIcon, label: "Community" },
    { href: "/library", icon: BookIcon, label: "Library" },
    { href: "/projects", icon: FolderIcon, label: "Projects" },
    { href: "/feedback", icon: HelpCircleIcon, label: "Feedback" },
  ]

  const handleNewChat = () => {
    router.push("/")
  }

  return (
    <Sidebar collapsible="icon" className="shadow-md">
      {/* Logo placeholder at the top */}
      <div className="flex justify-center items-center py-4 px-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="cursor-pointer">
                <svg
                  width={isCollapsed ? "28" : "32"}
                  height={isCollapsed ? "28" : "32"}
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M5.5 8C5.5 6.34315 6.84315 5 8.5 5H15.5C17.1569 5 18.5 6.34315 18.5 8V16C18.5 17.6569 17.1569 19 15.5 19H8.5C6.84315 19 5.5 17.6569 5.5 16V8Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M10.5 9L13.5 12L10.5 15"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </TooltipTrigger>
            {isCollapsed && <TooltipContent side="right">v0</TooltipContent>}
          </Tooltip>
        </TooltipProvider>
      </div>

      <SidebarHeader className="px-3 pt-1 pb-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleNewChat}
                className="w-full h-10 bg-background text-foreground border border-border hover:bg-accent/50 font-normal text-sm"
                variant="outline"
              >
                {!isCollapsed && <span>New Chat</span>}
                {isCollapsed && <PlusIcon className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            {isCollapsed && <TooltipContent side="right">New Chat</TooltipContent>}
          </Tooltip>
        </TooltipProvider>
      </SidebarHeader>

      <SidebarContent className="px-1">
        {/* Navigation items - shown in both collapsed and expanded states */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton
                          asChild
                          isActive={pathname === item.href}
                          className="h-9 py-2 text-sm font-normal"
                        >
                          <Link href={item.href}>
                            <item.icon className="h-4 w-4" />
                            {!isCollapsed && <span className="ml-3">{item.label}</span>}
                          </Link>
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      {isCollapsed && <TooltipContent side="right">{item.label}</TooltipContent>}
                    </Tooltip>
                  </TooltipProvider>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="h-px bg-border my-2 mx-2" />

        {/* Projects Section */}
        {!isCollapsed && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sm font-normal text-muted-foreground px-3 py-1">
              Projects
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton className="h-9 py-2 text-sm font-normal">
                    <HomeIcon className="h-4 w-4" />
                    <span className="ml-3">Chat Interface like v0</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton className="h-9 py-2 text-sm font-normal">
                    <HomeIcon className="h-4 w-4" />
                    <span className="ml-3">Action Search Bar</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
              <div className="px-3 py-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs text-muted-foreground h-8 font-normal"
                >
                  View All <span className="ml-1">→</span>
                </Button>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Recent Chats Section - only shown when sidebar is expanded */}
        {!isCollapsed && (
          <>
            <SidebarGroupLabel className="text-sm font-normal text-muted-foreground px-3 py-1">
              Recent Chats
            </SidebarGroupLabel>
            <SidebarHistory user={user} />
            <div className="px-3 py-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs text-muted-foreground h-8 font-normal"
              >
                View All <span className="ml-1">→</span>
              </Button>
            </div>
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="p-2 mt-auto">
        {user && <SidebarUserNav user={user} showSymbolOnly={isCollapsed} />}
      </SidebarFooter>
    </Sidebar>
  )
}
