"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, Home } from "lucide-react"

import { cn } from "@/lib/utils"

export function Breadcrumb() {
  const pathname = usePathname()
  const segments = React.useMemo(() => {
    const parts = pathname.split("/").filter(Boolean)
    return parts.map((part, i) => {
      const href = `/${parts.slice(0, i + 1).join("/")}`
      return {
        title: part.charAt(0).toUpperCase() + part.slice(1),
        href,
      }
    })
  }, [pathname])

  if (segments.length <= 1) return null

  return (
    <nav aria-label="Breadcrumb" className="mb-4 flex items-center text-sm text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-1.5">
        <li>
          <Link href="/" className="flex items-center gap-1 transition-colors hover:text-foreground">
            <Home className="size-4" />
            <span className="sr-only">Home</span>
          </Link>
        </li>
        {segments.map((segment, i) => (
          <React.Fragment key={segment.href}>
            <li>
              <ChevronRight className="size-4" />
            </li>
            <li>
              <Link
                href={segment.href}
                className={cn(
                  "transition-colors hover:text-foreground",
                  i === segments.length - 1 && "font-medium text-foreground",
                )}
                aria-current={i === segments.length - 1 ? "page" : undefined}
              >
                {segment.title}
              </Link>
            </li>
          </React.Fragment>
        ))}
      </ol>
    </nav>
  )
}

