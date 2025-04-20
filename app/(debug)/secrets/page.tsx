// app/debug/page.tsx  (server component)
import 'server-only';

export default function DebugSecrets() {
  // Show only variables that originate from the Dapr secret store
  const interesting = Object.fromEntries(
    Object.entries(process.env).filter(([key]) =>
      /^(POSTGRES|OPENAI|AZURE|ANTHROPIC|NEXTAUTH_SECRET)/.test(key),
    ),
  );

  return (
    <main style={{ padding: 32 }}>
      <h1>Runtime secrets</h1>
      <pre>{JSON.stringify(interesting, null, 2)}</pre>
    </main>
  );
}
