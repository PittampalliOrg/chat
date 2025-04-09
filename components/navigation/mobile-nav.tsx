"use client"

import type * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

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

interface MobileNavProps {
  items: NavItem[]
  sections: NavSection[]
  setIsOpen: (open: boolean) => void
}

export function MobileNav({ items, sections, setIsOpen }: MobileNavProps) {
  const pathname = usePathname()

  return (
    <div className="grid gap-6 p-4 text-popover-foreground">
      <Link href="/" className="flex items-center space-x-2" onClick={() => setIsOpen(false)}>
        <span className="font-bold">AI Chatbot</span>
      </Link>
      <div className="grid gap-2">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setIsOpen(false)}
            className={cn(
              "flex items-center gap-2 text-sm font-medium transition-colors hover:text-foreground/80",
              pathname === item.href ? "text-foreground" : "text-foreground/60",
            )}
          >
            {item.icon && <item.icon className="size-4" />}
            {item.title}
          </Link>
        ))}
      </div>
      <Accordion type="single" collapsible className="w-full">
        {sections.map((section, i) => (
          <AccordionItem key={section.title} value={`section-${i}`}>
            <AccordionTrigger className="text-sm">{section.title}</AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-2">
                {section.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    target={item.isExternal ? "_blank" : undefined}
                    rel={item.isExternal ? "noopener noreferrer" : undefined}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center gap-2 text-sm font-medium transition-colors hover:text-foreground/80",
                      pathname === item.href ? "text-foreground" : "text-foreground/60",
                    )}
                  >
                    {item.icon && <item.icon className="size-4" />}
                    {item.title}
                  </Link>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}

