import { cookies, headers } from 'next/headers';
import { dedupe } from 'flags';
import type { EvaluationContext } from '@openfeature/server-sdk';
import { nanoid } from 'nanoid';

/**
 * Get or create a stable user ID from cookies
 * This ensures consistent feature flag targeting across requests
 */
async function getStableId(): Promise<string> {
  const cookieStore = await cookies();
  const COOKIE_NAME = 'user-id';
  
  // Check if we already have a user ID
  const existingId = cookieStore.get(COOKIE_NAME);
  if (existingId) {
    return existingId.value;
  }
  
  // Generate a new ID if none exists
  const newId = nanoid();
  
  // Note: In a real implementation, you'd set this cookie in middleware
  // or in a route handler. For now, we'll just return the generated ID.
  // The cookie should be set with appropriate options:
  // cookieStore.set(COOKIE_NAME, newId, {
  //   httpOnly: true,
  //   secure: process.env.NODE_ENV === 'production',
  //   sameSite: 'lax',
  //   maxAge: 60 * 60 * 24 * 365, // 1 year
  // });
  
  return newId;
}

/**
 * Identify function for feature flag evaluation context
 * This is called automatically by the flags SDK when evaluating flags
 */
export const identify = dedupe(async (): Promise<EvaluationContext> => {
  const userId = await getStableId();
  const headersList = await headers();
  
  // Get user tier from auth session or default to 'free'
  // In a real app, this would come from your auth system
  const userTier = headersList.get('x-user-tier') || 'free';
  
  // Build evaluation context for OpenFeature
  const context: EvaluationContext = {
    // Required for targeting
    targetingKey: userId,
    
    // Custom attributes for flag evaluation
    userId,
    userTier,
    environment: process.env.NODE_ENV || 'development',
    
    // Add request-specific context
    userAgent: headersList.get('user-agent') || 'unknown',
    
    // Add any other context that might be useful for targeting
    // Examples:
    // - User's subscription level
    // - Geographic location
    // - A/B test groups
    // - Feature rollout cohorts
  };
  
  return context;
});