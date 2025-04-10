"use client"

import { ChevronUp } from "lucide-react"
import type { User } from "next-auth"
import { signOut, useSession } from "next-auth/react"
import { useTheme } from "next-themes"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar"
import { anonymousRegex } from "@/lib/constants"
import { useRouter } from "next/navigation"
import { toast } from "./toast"
import { LoaderIcon } from "./icons"

export function SidebarUserNav({
  user,
  showSymbolOnly = false,
}: {
  user: User
  showSymbolOnly?: boolean
}) {
  const router = useRouter()
  const { data, status } = useSession()
  const { setTheme, theme } = useTheme()
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"

  const isGuest = anonymousRegex.test(data?.user?.email ?? "")
  const userEmail = user?.email || "user"
  const userName = user?.name?.split(" ")[0] || userEmail.split("@")[0]

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {status === "loading" ? (
              <SidebarMenuButton className="data-[state=open]:bg-sidebar-accent bg-background data-[state=open]:text-sidebar-accent-foreground h-9 justify-between">
                <div className="flex items-center">
                  <div className="size-7 bg-zinc-500/30 rounded-md animate-pulse" />
                  {!showSymbolOnly && (
                    <span className="ml-3 bg-zinc-500/30 text-transparent rounded-md animate-pulse">
                      Loading auth status
                    </span>
                  )}
                </div>
                {!showSymbolOnly && (
                  <div className="animate-spin text-zinc-500">
                    <LoaderIcon size={16} />
                  </div>
                )}
              </SidebarMenuButton>
            ) : (
              <SidebarMenuButton className="data-[state=open]:bg-sidebar-accent bg-background data-[state=open]:text-sidebar-accent-foreground h-9 py-1.5 px-2">
                <div className="flex items-center">
                  <div className="flex items-center justify-center size-6 rounded-md bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs font-medium">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                  {!showSymbolOnly && (
                    <>
                      <div className="flex flex-col items-start ml-3">
                        <span className="text-sm font-normal">{userName}</span>
                        <span className="text-xs text-muted-foreground">Premium</span>
                      </div>
                      <ChevronUp className="ml-auto h-4 w-4" />
                    </>
                  )}
                </div>
              </SidebarMenuButton>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" className="w-[--radix-popper-anchor-width]">
            <DropdownMenuItem className="cursor-pointer" onSelect={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {`Toggle ${theme === "light" ? "dark" : "light"} mode`}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <button
                type="button"
                className="w-full cursor-pointer"
                onClick={() => {
                  if (status === "loading") {
                    toast({
                      type: "error",
                      description: "Checking authentication status, please try again!",
                    })

                    return
                  }

                  if (isGuest) {
                    router.push("/login")
                  } else {
                    signOut({
                      redirectTo: "/",
                    })
                  }
                }}
              >
                {isGuest ? "Login to your account" : "Sign out"}
              </button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
