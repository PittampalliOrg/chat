import { cookies } from "next/headers"
import { notFound } from "next/navigation"
import { Server, Database, Cpu, FileText } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { EnvVariableSearch } from "./env-variable-search"

// Import local CSS
import "./status.css"

interface ContainerInfo {
  process: { args: string[]; pwd: string }
  env: Record<string, string>
  network: { hostname: string; ips: string[]; port: string }
}

async function fetchInfo(): Promise<ContainerInfo> {
  const cookieStore = await cookies()
  const cookieHeader = cookieStore
    .getAll()
    .map(({ name, value }: { name: string; value: string }) => `${name}=${value}`)
    .join("; ")

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? ""
  const res = await fetch(`${base}/api/container-info`, {
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
    cache: "no-store",
  })

  if (!res.ok) notFound()
  return res.json()
}

// Helper function to categorize environment variables
function categorizeEnvVars(env: Record<string, string>) {
  const categories = {
    connection: [] as [string, string][],
    nextjs: [] as [string, string][],
    vercel: [] as [string, string][],
    node: [] as [string, string][],
    system: [] as [string, string][],
    other: [] as [string, string][],
  }

  // System variables that are commonly found
  const systemVarPrefixes = ["PATH", "HOME", "USER", "SHELL", "LANG", "PWD", "TERM", "HOSTNAME"]

  Object.entries(env).forEach((entry) => {
    const [key] = entry

    if (key.startsWith("CONNECTION_")) {
      categories.connection.push(entry)
    } else if (key.startsWith("NEXT_")) {
      categories.nextjs.push(entry)
    } else if (key.startsWith("VERCEL_")) {
      categories.vercel.push(entry)
    } else if (key.startsWith("NODE_")) {
      categories.node.push(entry)
    } else if (systemVarPrefixes.some((prefix) => key.startsWith(prefix))) {
      categories.system.push(entry)
    } else {
      categories.other.push(entry)
    }
  })

  return categories
}

export default async function Status() {
  const data = await fetchInfo()

  const connections = Object.entries(data.env).filter(([k]) => k.startsWith("CONNECTION_"))
  const unique = [...new Set(connections.map(([k]) => k.split("_")[1]))]

  // Categorize environment variables
  const categorizedEnv = categorizeEnvVars(data.env)

  // Count variables in each category
  const counts = {
    all: Object.keys(data.env).length,
    connection: categorizedEnv.connection.length,
    nextjs: categorizedEnv.nextjs.length,
    vercel: categorizedEnv.vercel.length,
    node: categorizedEnv.node.length,
    system: categorizedEnv.system.length,
    other: categorizedEnv.other.length,
  }

  return (
    <main className="container mx-auto py-4 max-w-5xl">
      {/* Compact header with metadata cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <Card className="metadata-card">
          <CardHeader className="py-3">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Runtime Status</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="py-2">
            <div className="grid grid-cols-[80px_1fr] gap-1 text-sm">
              <span className="font-medium">Hostname:</span>
              <span className="font-mono text-xs truncate" title={data.network.hostname}>
                {data.network.hostname}
              </span>
              <span className="font-medium">IPs:</span>
              <div className="flex flex-wrap gap-1">
                {data.network.ips.map((ip) => (
                  <Badge key={ip} variant="outline" className="font-mono text-xs">
                    {ip}
                  </Badge>
                ))}
              </div>
              <span className="font-medium">Port:</span>
              <span className="font-mono text-xs">{data.network.port}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="metadata-card">
          <CardHeader className="py-3">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Process</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="py-2">
            <div className="grid grid-cols-[80px_1fr] gap-1 text-sm">
              <span className="font-medium">Command:</span>
              <span className="font-mono text-xs truncate" title={data.process.args.join(" ")}>
                {data.process.args.join(" ")}
              </span>
              <span className="font-medium">Working dir:</span>
              <span className="font-mono text-xs truncate" title={data.process.pwd}>
                {data.process.pwd}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="metadata-card">
          <CardHeader className="py-3">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Connections</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="py-2">
            {unique.length === 0 ? (
              <p className="text-muted-foreground italic text-sm">No connections defined</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {unique.map((c) => (
                  <Badge key={c} variant="outline" className="font-medium">
                    {c}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main environment variables section */}
      <Card className="env-variables-card">
        <CardHeader className="py-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle>Environment Variables</CardTitle>
              <Badge variant="secondary" className="ml-2">
                {counts.all}
              </Badge>
            </div>

            {/* Optional: Add connection details toggle */}
            {unique.length > 0 && (
              <Accordion type="single" collapsible className="w-auto">
                <AccordionItem value="connections" className="border-none">
                  <AccordionTrigger className="py-0 hover:no-underline">
                    <span className="text-sm font-medium text-muted-foreground">Connection Details</span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="mt-2 space-y-2">
                      {unique.map((c) => (
                        <div key={c} className="rounded-md bg-muted/50 p-2">
                          <div className="font-medium text-sm mb-1">{c} Connection</div>
                          <ul className="space-y-1">
                            {connections
                              .filter(([k]) => k.startsWith(`CONNECTION_${c}_`))
                              .map(([k, v]) => (
                                <li key={k} className="grid grid-cols-[1fr_2fr] gap-2">
                                  <span className="font-mono text-xs text-muted-foreground">{k}</span>
                                  <span className="font-mono text-xs">{v}</span>
                                </li>
                              ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <EnvVariableSearch envVars={data.env} categorizedEnv={categorizedEnv} counts={counts} />
        </CardContent>
      </Card>
    </main>
  )
}
