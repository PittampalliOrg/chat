/* ------------------------------------------------------------------ *
 * .dagger/tests/integration.test.ts                                 *
 * ------------------------------------------------------------------ *
 * Minimal integration tests for the Dagger helpers.                  *
 *                                                                    *
 * The tests expect Azure credentials in the environment (they’re      *
 * already present via your `.devcontainer/*.env` files).              *
 *                                                                    *
 * Run with:                                                           *
 *   pnpm dlx tsx .dagger/tests/integration.test.ts                    *
 *                                                                    *
 * ------------------------------------------------------------------ */

import "dotenv/config"; // preload env vars in the dev‑container
import * as assert from "node:assert";
import { connect } from "@dagger.io/dagger";

import { Storage } from "../src/storage";
import { KindCluster } from "../src/kind";
import { Workspace } from "../src/index";

// Helper to fetch required env vars
function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

async function main() {
  await connect(async (client) => {
    console.log("🔗 Connected to Dagger engine\n");

    // Secret helpers (cast so type-checker is happy – we only care at runtime)
    // The cast bridges the slightly different Secret types generated for the
    // test file vs. the SDK runtime.
    const spClientId    = client.setSecret("spClientId", env("SP_CLIENT_ID")) as unknown as import("@dagger.io/dagger").Secret;
    const spClientSecret= client.setSecret("spClientSecret", env("SP_CLIENT_SECRET")) as unknown as import("@dagger.io/dagger").Secret;
    const spTenantId    = client.setSecret("spTenantId", env("SP_TENANT_ID")) as unknown as import("@dagger.io/dagger").Secret;

    /* ------------------------------------------------- *
     * 1️⃣  Storage.create                               *
     * ------------------------------------------------- */
    const storage = new Storage();
    const acct = await storage.create(
      env("SUBSCRIPTION_ID"),
      env("RESOURCE_GROUP"),
      env("LOCATION"),
      spClientId,
      spClientSecret,
      spTenantId,
    );
    console.log("✅ storage.create →", acct);
    assert.ok(/^oidcissuer/.test(acct), "storage account should start with 'oidcissuer'");

    /* ------------------------------------------------- *
     * 2️⃣  KindCluster.create                           *
     * ------------------------------------------------- */
    const kind = new KindCluster();
    await kind.create(env("SERVICE_ACCOUNT_ISSUER"));
    console.log("✅ kindcluster.create completed\n");

    /* ------------------------------------------------- *
     * 3️⃣  Workspace.oidc                               *
     * ------------------------------------------------- */
    const ws = new Workspace();
    await ws.oidc(acct, env("SERVICE_ACCOUNT_ISSUER"));
    console.log("✅ workspace.oidc uploaded docs\n");

    /* ------------------------------------------------- *
     * 4️⃣  Workspace.full (optional smoke test)         *
     * ------------------------------------------------- */
    if (process.env.RUN_FULL_PIPELINE === "true") {
      console.log("⚙️  RUN_FULL_PIPELINE=true → invoking workspace.full (slow)…\n");
      await ws.full(
        env("SUBSCRIPTION_ID"),
        env("RESOURCE_GROUP"),
        env("LOCATION"),
        spClientId,
        spClientSecret,
        spTenantId,
      );
      console.log("✅ workspace.full completed\n");
    }

    console.log("🎉  Integration tests finished without assertions errors");
  });
}

// Execute the test runner
main().catch((err) => {
  console.error("❌  Integration tests failed:\n", err);
  process.exit(1);
});
