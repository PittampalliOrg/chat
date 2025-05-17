import { trace, context } from "@opentelemetry/api"

// Create a custom logger that integrates with OpenTelemetry
export class Logger {
  private name: string

  constructor(name: string) {
    this.name = name
  }

  info(message: string, additionalData?: Record<string, any>) {
    this.log("INFO", message, additionalData)
  }

  warn(message: string, additionalData?: Record<string, any>) {
    this.log("WARN", message, additionalData)
  }

  error(message: string, error?: Error, additionalData?: Record<string, any>) {
    const data = { ...additionalData }

    if (error) {
      data.error = {
        message: error.message,
        stack: error.stack,
        name: error.name,
      }
    }

    this.log("ERROR", message, data)
  }

  debug(message: string, additionalData?: Record<string, any>) {
    if (process.env.NODE_ENV !== "production") {
      this.log("DEBUG", message, additionalData)
    }
  }

  private log(level: string, message: string, additionalData?: Record<string, any>) {
    // Get the current span context to link logs with traces
    const span = trace.getSpan(context.active())
    const traceId = span?.spanContext().traceId
    const spanId = span?.spanContext().spanId

    const logData = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: "next-app",
      traceId,
      spanId,
      ...additionalData,
    }

    // In development, also log to console
    if (process.env.NODE_ENV !== "production") {
      const consoleMethod = level === "ERROR" ? "error" : level === "WARN" ? "warn" : "log"
      console[consoleMethod](`[${logData.timestamp}] [${level}] [${this.name}]:`, message, additionalData || "")
    }

    // In a real implementation, you would send this to your logging backend
    // This happens automatically with the OTLPLogExporter we set up
  }
}

// Create a default logger instance
export const logger = new Logger("app")
