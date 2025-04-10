import type React from "react"
import { OpenAISVG } from "./openai-svg"
import { AnthropicSVG } from "./anthropic-svg" // Import AnthropicSVG
import { GoogleSVG } from "./google-svg" // Import GoogleSVG

// Wrapper for OpenAI icon
export const OpenAIIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <div className={className}>
    <OpenAISVG className="text-[#10a37f] h-full w-full" />
  </div>
)

// Wrapper for Anthropic icon
export const AnthropicIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <div className={className}>
    <AnthropicSVG className="text-[#d9288a] h-full w-full" />
  </div>
)

// Wrapper for Google icon
export const GoogleIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <div className={className}>
    <GoogleSVG className="h-full w-full" />
  </div>
)

// Wrapper for Azure OpenAI icon
export const AzureOpenAIIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M13.25 4.75L16.25 2L19.75 5.5L17 8.5L13.25 4.75ZM8.5 9.5L11.5 6.75L15.25 10.5L12.5 13.5L8.5 9.5ZM3.75 14.25L6.75 11.5L10.5 15.25L7.75 18.25L3.75 14.25ZM9.5 20L12.25 17.25L16 21L13.25 23.75L9.5 20Z"
      fill="#0078d4" // Azure blue
    />
     {/* Optional: Add OpenAI swirl within Azure shape or nearby if desired for clarity */}
     {/* <OpenAISVG className="absolute top-1 right-1 h-2 w-2 text-[#10a37f]" /> */}
  </svg>
)

// Wrapper for Groq icon (placeholder - replace with actual SVG if available)
export const GroqIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Placeholder Groq-like logo */}
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="#F56502"/>
    <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0 8c-1.65 0-3-1.35-3-3s1.35-3 3-3 3 1.35 3 3-1.35 3-3 3z" fill="#F56502"/>
  </svg>
)

// Wrapper for XAI icon (placeholder - replace with actual SVG if available)
export const XAIIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
   // Using a simple X as placeholder
   <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
     <path d="M18.71,7.71,13.41,13l5.3,5.29a1,1,0,0,1-1.42,1.42L12,14.41l-5.29,5.3a1,1,0,0,1-1.42-1.42L10.59,13,5.29,7.71A1,1,0,0,1,6.71,6.29L12,11.59l5.29-5.3a1,1,0,0,1,1.42,1.42Z"/>
   </svg>
)

// Map provider names (lowercase) to their icons
export const getProviderIcon = (provider: string): React.FC<{ className?: string }> => {
  const providerMap: Record<string, React.FC<{ className?: string }>> = {
    openai: OpenAIIcon,
    anthropic: AnthropicIcon,
    azure: AzureOpenAIIcon, // Maps 'azure' provider id to the Azure icon
    groq: GroqIcon,
    xai: XAIIcon,
    google: GoogleIcon,
  }

  // Return the specific icon or default to OpenAI icon if provider not found
  return providerMap[provider?.toLowerCase() || 'openai'] || OpenAIIcon
}