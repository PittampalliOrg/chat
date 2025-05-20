// .dagger/src/storage.ts
import { dag, object, func, Secret, Container } from "@dagger.io/dagger";

/**
 * Build an Azure‑CLI container with common settings. Re‑exported so
 * other modules (e.g. Workspace.oidc) can reuse it without having to
 * instantiate the Storage class.
 */
export function baseAzureCli(): Container {
  return dag
    .container()
    .from("mcr.microsoft.com/azure-cli:2.62.1") // deterministic image
    .withEnvVariable("AZURE_HTTP_USER_AGENT", "wi-kind-dagger")
    .withMountedDirectory("/workspace", dag.directory())
    .withWorkdir("/workspace");
}

/**
 * Storage utilities – create / reuse a static‑website Storage Account
 * that will serve as the OIDC issuer for the KinD cluster.
 */
@object()
export class Storage {
  /**
   * Same base container but logged‑in and scoped to a subscription.
   */
  private azBase(
    subId: string,
    spId: Secret,
    spSecret: Secret,
    tenantId: Secret,
  ): Container {
    return baseAzureCli()
      .withSecretVariable("SP_CLIENT_ID", spId)
      .withSecretVariable("SP_CLIENT_SECRET", spSecret)
      .withSecretVariable("SP_TENANT_ID", tenantId)
      .withExec([
        "az", "login",
        "--service-principal",
        "-u", "$SP_CLIENT_ID",
        "-p", "$SP_CLIENT_SECRET",
        "--tenant", "$SP_TENANT_ID",
        "--allow-no-subscriptions",
      ])
      .withExec(["az", "account", "set", "--subscription", subId]);
  }

  /**
   * Create (or reuse) a Storage Account and return its name.
   */
  @func()
  async create(
    subId: string,
    rg: string,
    loc: string,
    spId: Secret,
    spSecret: Secret,
    tenantId: Secret,
  ): Promise<string> {
    const accountPrefix = "oidcissuer";

    const acctName = await this.azBase(subId, spId, spSecret, tenantId)
      .withExec(["az", "group", "create", "--name", rg, "--location", loc])
      .withExec([
        "bash", "-euc",
        `acct=${accountPrefix}$(openssl rand -hex 4); echo -n $acct`,
      ])
      .stdout();

    const acct = acctName.trim();

    // Idempotent create – ok if it already exists
    await this.azBase(subId, spId, spSecret, tenantId)
      .withExec([
        "az", "storage", "account", "create",
        "--name", acct,
        "--resource-group", rg,
        "--location", loc,
        "--kind", "StorageV2",
        "--sku", "Standard_LRS",
        "--allow-blob-public-access", "true",
      ]);

    return acct;
  }
}
