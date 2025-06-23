import Link from "next/link"
import { Button } from "@/components/ui/button"
import { TriangleAlert } from "lucide-react"

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-md text-center">
        <TriangleAlert className="mx-auto size-12 text-primary" />
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">404 - Page Not Found</h1>
        <p className="mt-4 text-muted-foreground">
          {
            "Oops... The page you&apos;re looking for doesn&apos;t seem to exist. It might have been moved, deleted, or you may have mistyped the URL."
          }
        </p>
        <div className="mt-6">
          <Button asChild>
            <Link href="/">Go Back Home</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
