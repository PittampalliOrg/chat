"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import { Button } from "@/components/ui/button"
import { Menu, MessageSquare, Terminal, Home } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { MobileNav } from "./mobile-nav"

interface NavItem {
  title: string
  href: string
  description?: string
  icon?: React.ElementType
  isExternal?: boolean
}

interface NavSection {
  title: string
  items: NavItem[]
}

const mainNavItems: NavItem[] = [
  {
    title: "Home",
    href: "/",
    description: "Return to the home page",
    icon: Home,
  },
  {
    title: "Chat",
    href: "/chat",
    description: "Interact with the AI assistant",
    icon: MessageSquare,
  },
  {
    title: "MCP",
    href: "/mcp",
    description: "Access MCP servers",
    icon: Terminal,
  },
]

const resourceNavItems: NavSection[] = [
  {
    title: "Resources",
    items: [
      {
        title: "Documentation",
        href: "/docs",
        description: "Learn how to use the platform",
      },
      {
        title: "Settings",
        href: "/settings",
        description: "Configure your preferences",
      },
    ],
  },
  {
    title: "External",
    items: [
      {
        title: "GitHub",
        href: "https://github.com/vercel/ai-chatbot",
        description: "View the source code on GitHub",
        isExternal: true,
      },
      {
        title: "Vercel",
        href: "https://vercel.com",
        description: "Deploy your own chatbot",
        isExternal: true,
      },
    ],
  },
]

export function NavBar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <div
      className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      style={{ height: "var(--navbar-height)" }}
    >
      <div className="flex size-full items-center px-4 md:px-6 lg:px-8">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="font-bold">AI Chatbot</span>
          </Link>
          <NavigationMenu>
            <NavigationMenuList>
              {mainNavItems.map((item) => (
                <NavigationMenuItem key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      navigationMenuTriggerStyle(),
                      pathname === item.href && "bg-accent text-accent-foreground",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      {item.icon && <item.icon className="size-4" />}
                      {item.title}
                    </span>
                  </Link>
                </NavigationMenuItem>
              ))}
              <NavigationMenuItem>
                <NavigationMenuTrigger>More</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2">
                    {resourceNavItems.map((section) => (
                      <div key={section.title} className="space-y-2">
                        <h4 className="text-sm font-medium leading-none">{section.title}</h4>
                        <div className="grid gap-1">
                          {section.items.map((item) => (
                            <Link
                              key={item.href}
                              href={item.href}
                              target={item.isExternal ? "_blank" : undefined}
                              rel={item.isExternal ? "noopener noreferrer" : undefined}
                              className={cn(
                                "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                                pathname === item.href && "bg-accent text-accent-foreground",
                              )}
                            >
                              <div className="text-sm font-medium leading-none">{item.title}</div>
                              {item.description && (
                                <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                                  {item.description}
                                </p>
                              )}
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              className="mr-2 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:hidden"
            >
              <Menu className="size-5" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="pr-0">
            <MobileNav items={mainNavItems} sections={resourceNavItems} setIsOpen={setIsOpen} />
          </SheetContent>
        </Sheet>

        <div className="flex flex-1 items-center justify-end space-x-2">
          <div className="flex-1 md:grow-0" />
          {/* Add user profile or additional actions here if needed */}
        </div>
      </div>
    </div>
  )
}
