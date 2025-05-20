/* ------------------------------------------------------------------ *
 * .dagger/src/index.ts – Workspace orchestrator module               *
 * ------------------------------------------------------------------ */

import {
  dag,
  object,
  func,
  Directory,
  Secret,
} from "@dagger.io/dagger";

/* Shared helpers & sub‑modules */
import { baseAzureCli, Storage } from "./storage";
import { KindCluster } from "./kind";

@object()
export class Workspace {
  /* 01 – Provision storage account */
  @func()
  async storage(
    subId: string,
    rg: string,
    loc: string,
    spId: Secret,
    spSecret: Secret,
    tenantId: Secret,
  ): Promise<string> {
    return await new Storage().create(subId, rg, loc, spId, spSecret, tenantId);
  }

  /* 02 – Create KinD cluster */
  @func()
  async kind(issuer: string): Promise<void> {
    await new KindCluster().create(issuer);
  }

  /* 03 – Upload OIDC discovery docs (unchanged) */
  @func()
  async oidc(acct: string, issuer: string): Promise<void> {
    const jwks = await dag
      .container()
      .from("bitnami/kubectl:latest")
      .withExec([
        "kubectl",
        "--context",
        "kind-rg4",
        "get",
        "--raw",
        "/openid/v1/jwks",
      ])
      .stdout();

    const cfg = `{
  "issuer": "${issuer}",
  "jwks_uri": "${issuer}openid/v1/jwks",
  "response_types_supported":["id_token"],
  "subject_types_supported":["public"],
  "id_token_signing_alg_values_supported":["RS256"]
}`;

    const docs: Directory = dag
      .directory()
      .withNewFile(".well-known/openid-configuration", cfg)
      .withNewFile("openid/v1/jwks", jwks);

    await baseAzureCli()
      .withMountedDirectory("/docs", docs)
      .withExec([
        "az", "storage", "blob", "upload-batch",
        "-d", "$web", "--account-name", acct,
        "-s", "/docs", "--overwrite",
      ]);
  }

  // … phases 04‑08 unchanged (wiWebhook → bootstrap) …

  /* Orchestration helper */
  @func()
  async full(
    subId: string,
    rg: string,
    loc: string,
    spId: Secret,
    spSecret: Secret,
    tenantId: Secret,
  ): Promise<void> {
    const acct = await this.storage(subId, rg, loc, spId, spSecret, tenantId);
    const issuer = `https://${acct}.z13.web.core.windows.net/`;

    await this.kind(issuer);
    await this.oidc(acct, issuer);
    // …call other unchanged phases in sequence…
  }
}

/* Re‑export helpers so `dagger functions` shows them */
export * from "./storage";
export * from "./kind";
