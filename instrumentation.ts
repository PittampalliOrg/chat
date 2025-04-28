/**
 * instrumentation.ts
 * Runs once at server bootstrap (Next.js App Router ≥ 15).
 * Loads every secret from the Dapr secret-store `azurekeyvault`
 * and injects them into process.env, converting - → _ in the key.
 */

type BulkSecret = Record<string, Record<string, string>>;

// Helper function to load secrets from Dapr
async function loadDaprSecrets() {
  const DAPR_HOST = process.env.DAPR_HOST ?? "localhost";
  const DAPR_HTTP_PORT = process.env.DAPR_HTTP_PORT ?? "3500";
  const SECRET_STORE = "azurekeyvault";
  const url = `http://${DAPR_HOST}:${DAPR_HTTP_PORT}/v1.0/secrets/${SECRET_STORE}/bulk`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      console.error(
        `[instrumentation] Dapr bulk-secret fetch failed → ${res.status}`,
        await res.text(),
      );
      return null;
    }
    return (await res.json()) as BulkSecret;
  } catch (err) {
    console.error("[instrumentation] fetch error", err);
    return null;
  }
}

// Main register function that Next.js calls
export async function register() {
  // Only run in Node.js environment, not in Edge runtime
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      // Load secrets from Dapr
      const body = await loadDaprSecrets();
      if (!body) {
        console.warn("[instrumentation] No secrets loaded from Dapr");
        return;
      }

      const report: string[] = [];
      let injected = 0;

      for (const [secretName, kv] of Object.entries(body ?? {})) {
        // Key Vault → one key/value per secret
        const value = kv ? kv[Object.keys(kv)[0]] : undefined;
        const envKey = secretName.replace(/-/g, "_").toUpperCase();

        if (envKey in process.env) {
          report.push(`✘ ${envKey} (skipped, already set)`);
          continue;
        }

        if (typeof value === "string" && value.length) {
          process.env[envKey] = value;
          report.push(`✓ ${envKey}`);
          injected++;
        } else {
          report.push(`⚠︎ ${envKey} (empty)`);
        }
      }

      // Log auth-related environment variables specifically for debugging
      const authSecretStatus = process.env.NEXTAUTH_SECRET 
        ? "✓ NEXTAUTH_SECRET (available)" 
        : "✘ NEXTAUTH_SECRET (missing)";
      
      const authSecret = process.env.AUTH_SECRET 
        ? "✓ AUTH_SECRET (available)" 
        : "✘ AUTH_SECRET (missing)";
      
        console.info(
          `[instrumentation] Loaded ${injected}/${Object.keys(body).length} secrets:
        ${report.join("\n")}
        ${authSecretStatus}
        ${authSecret}`
        );
    } catch (error) {
      console.error("[instrumentation] Error in register function:", error);
    }
  } else if (process.env.NEXT_RUNTIME === 'edge') {
    // Edge runtime doesn't have access to Node.js APIs
    console.info("[instrumentation] Running in Edge runtime - skipping Dapr secret loading");
  }
}