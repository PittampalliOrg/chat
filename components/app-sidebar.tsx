"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { PlusIcon, HomeIcon, BookIcon, FolderIcon, HelpCircleIcon, PanelLeftIcon, PanelRightIcon, ChartNetwork } from "lucide-react"

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
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { SidebarUserNav } from "@/components/sidebar-user-nav"
import { SidebarHistory } from "@/components/sidebar-history"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"

export function AppSidebar({ user }: { user?: any }) {
  const router = useRouter()
  const pathname = usePathname()
  const { state, toggleSidebar } = useSidebar()
  const isCollapsed = state === "collapsed"

  // Navigation items with icons - shown in both collapsed and expanded states
  const navItems = [
    { href: "/", icon: HomeIcon, label: "Home" },
    { href: "/workflow", icon: ChartNetwork, label: "Workflow" },
    { href: "/projects", icon: FolderIcon, label: "Projects" },
    { href: "/feedback", icon: HelpCircleIcon, label: "Feedback" },
  ]

  const handleNewChat = () => {
    router.push("/")
  }

  return (
    <Sidebar collapsible="icon" className="shadow-none border-r border-border z-50">
      {/* Logo and toggle button at the top */}
      <div className={`flex items-center py-3 px-4 ${isCollapsed ? "justify-center" : "justify-between"}`}>
        {!isCollapsed && (
          <div className="flex items-center">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-sidebar-foreground"
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
            <span className="ml-2 font-medium text-sm">v0</span>
          </div>
        )}

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => toggleSidebar()}
                className="sidebar-toggle-button"
                aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {isCollapsed ? (
                  <PanelRightIcon className="h-5 w-5 sidebar-toggle-icon" />
                ) : (
                  <PanelLeftIcon className="h-5 w-5 sidebar-toggle-icon" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{isCollapsed ? "Expand sidebar" : "Collapse sidebar"}</TooltipContent>
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
                {isCollapsed && <PlusIcon />}
              </Button>
            </TooltipTrigger>
            {isCollapsed && <TooltipContent side="right">New Chat</TooltipContent>}
          </Tooltip>
        </TooltipProvider>
      </SidebarHeader>

      <SidebarContent className={`px-1 ${isCollapsed ? "items-center" : ""}`}>
        {/* Navigation items - shown in both collapsed and expanded states */}
        <SidebarGroup className={isCollapsed ? "w-full flex flex-col items-center" : ""}>
          <SidebarGroupContent className={isCollapsed ? "w-full flex flex-col items-center" : ""}>
            <SidebarMenu className={isCollapsed ? "w-full items-center" : ""}>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href} className={isCollapsed ? "flex justify-center w-full" : ""}>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton
                          asChild
                          isActive={pathname === item.href}
                          className={`h-9 py-2 text-sm font-normal ${isCollapsed ? "justify-center w-10 px-0" : ""}`}
                        >
                          <Link href={item.href} className={isCollapsed ? "flex justify-center" : ""}>
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

        <div className={`h-px bg-border my-2 ${isCollapsed ? "w-10" : "mx-2"}`} />

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

      <SidebarFooter className={`p-3 mt-auto ${isCollapsed ? "flex justify-center" : ""}`}>
        {user && <SidebarUserNav user={user} showSymbolOnly={isCollapsed} />}
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
