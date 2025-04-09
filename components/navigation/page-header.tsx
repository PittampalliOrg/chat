import type * as React from "react"
import { cn } from "@/lib/utils"
import { Breadcrumb } from "./breadcrumb"

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  heading: string
  description?: string
  children?: React.ReactNode
}

export function PageHeader({ heading, description, children, className, ...props }: PageHeaderProps) {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      <Breadcrumb />
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{heading}</h1>
          {description && <p className="text-muted-foreground">{description}</p>}
        </div>
        {children}
      </div>
    </div>
  )
}

