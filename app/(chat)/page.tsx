// app/(chat)/page.tsx
import { cookies } from 'next/headers';
import { Chat } from '@/components/chat'; // Adjust path if needed
import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models'; // Adjust path if needed
import { generateUUID } from '@/lib/utils'; // Adjust path if needed
import { DataStreamHandler } from '@/components/data-stream-handler'; // Adjust path if needed
import { auth } from '../(auth)/auth'; // Adjust path if needed
// import { redirect } from 'next/navigation'; // Removing page-level redirect for now

export default async function Page() {
  const session = await auth(); // Get session on the server component

  // Log the session state as seen by the page component
  console.log(`[app/(chat)/page.tsx] Session state:`, session ? JSON.stringify(session, null, 2) : 'null');

  // The middleware should have already handled redirection if there's no token at all.
  // If we reach here and `session` is null, it means there's a discrepancy between
  // `getToken` in middleware and `auth()` in the server component, or the session
  // wasn't properly established/propagated after the /api/auth/guest flow.
  if (!session?.user) { // Check for session.user as well
    console.error("[app/(chat)/page.tsx] CRITICAL: Reached page without a valid session after middleware should have handled it. Rendering fallback.");
    return (
      <div>
        <h1>Authentication Error</h1>
        <p>Could not establish a user session. Please try refreshing or check server logs.</p>
        <p>If this persists, there might be an issue with cookie propagation or session handling after guest login.</p>
      </div>
    );
  }

  const id = generateUUID(); // Generate a new ID for a new chat session on the main page
  const cookieStore = await cookies();
  const modelIdFromCookie = cookieStore.get('chat-model');
  const initialChatModel = modelIdFromCookie?.value || DEFAULT_CHAT_MODEL;

  console.log(`[app/(chat)/page.tsx] Rendering Chat component with id: ${id}, model: ${initialChatModel}, userType: ${session.user.type}`);

  return (
    <>
      <Chat
        key={id} // Ensure re-render if id changes, though for main page it's new each time
        id={id}
        initialMessages={[]}
        initialChatModel={initialChatModel}
        initialVisibilityType="private"
        isReadonly={false} // New chats are not readonly
        session={session}
        autoResume={false} // Typically false for a new chat page
      />
      <DataStreamHandler id={id} />
    </>
  );
}