// // pipeline.ts – end-to-end dev‑cluster bootstrap with Dagger
// import {
//   dag,
//   object,
//   func,
//   Container,
//   Directory,
//   Secret,
//   CacheVolume,
//   Service,
//   connect,
//   Client
// } from "@dagger.io/dagger";

// /* ------------------------------------------------------------------ *
//  * Shared helpers                                                     *
//  * ------------------------------------------------------------------ */
// function baseAzureCli(): Container {
//   return dag
//     .container()
//     .from("mcr.microsoft.com/azure-cli:latest")
//     .withEnvVariable("AZURE_HTTP_USER_AGENT", "wi-kind-dagger")
//     .withMountedDirectory("/workspace", dag.host().directory("."))
//     .withWorkdir("/workspace");
// }

// interface Ctx {
//   subId: string;
//   rg: string;
//   loc: string;
//   spId: Secret;
//   spSecret: Secret;
//   tenantId: Secret;
// }

// export class Pipeline {
//   constructor(private readonly ctx: Ctx) {}

//   /* ------------------------------------------------------------------ *
//    * 01 – Storage: create Blob account that will serve as OIDC issuer   *
//    * ------------------------------------------------------------------ */
//   async storage(): Promise<string /* account name */> {
//     const az = baseAzureCli()
//       .withSecretVariable("SP_CLIENT_ID", this.ctx.spId)
//       .withSecretVariable("SP_CLIENT_SECRET", this.ctx.spSecret)
//       .withSecretVariable("SP_TENANT_ID", this.ctx.tenantId)
//       .withExec([
//         "bash",
//         "-euc",
//         `
// az login --service-principal -u $SP_CLIENT_ID -p $SP_CLIENT_SECRET --tenant $SP_TENANT_ID
// az group create -n ${this.ctx.rg} -l ${this.ctx.loc}
// acct=oidcissuer$(openssl rand -hex 4)
// az storage account create -n $acct -g ${this.ctx.rg} --allow-blob-public-access true
// echo -n $acct`,
//       ]);

//     return (await az.stdout()).trim();
//   }

//   /* --------------------------------------------------- *
//    * 02 – KinD cluster running in a DinD side‑car         *
//    * --------------------------------------------------- */
//   async kind(issuer: string): Promise<void> {
//     const dindCache = dag.cacheVolume("dind-lib");

//     const dindService: Service = dag
//       .container()
//       .from("docker:dind")
//       .withMountedCache("/var/lib/docker", dindCache)
//       .withExec([
//         "dockerd-entrypoint.sh",
//         "--host=unix:///var/run/docker.sock",
//         "--experimental",
//       ])
//       .asService();

//     await dag
//       .container()
//       .from("docker.io/rancher/kind:v0.20.0")
//       .withServiceBinding("docker", dindService)
//       .withMountedCache("/var/lib/docker", dindCache)
//       .withExec([
//         "bash",
//         "-euc",
//         `
// cat <<EOF > kind.yaml
// kind: Cluster
// apiVersion: kind.x-k8s.io/v1alpha4
// nodes:
//   - role: control-plane
// kubeadmConfigPatches:
//   - |
//     kind: ClusterConfiguration
//     apiServer:
//       extraArgs:
//         service-account-issuer: ${issuer}
// EOF
// kind delete cluster --name rg4 || true
// kind create cluster --name rg4 --config kind.yaml
// `,
//       ])
//       .stdout();
//   }

//   /* ----------------------------------------- *
//    * 03 – Upload discovery docs (well‑known)    *
//    * ----------------------------------------- */
//   async oidc(acct: string, issuer: string): Promise<void> {
//     const jwks = await dag
//       .container()
//       .from("bitnami/kubectl:latest")
//       .withExec([
//         "kubectl",
//         "--context",
//         "kind-rg4",
//         "get",
//         "--raw",
//         "/openid/v1/jwks",
//       ])
//       .stdout();

//     const cfg = `{
//   "issuer": "${issuer}",
//   "jwks_uri": "${issuer}openid/v1/jwks",
//   "response_types_supported":["id_token"],
//   "subject_types_supported":["public"],
//   "id_token_signing_alg_values_supported":["RS256"]
// }`;

//     const docs: Directory = dag
//       .directory()
//       .withNewFile(".well-known/openid-configuration", cfg)
//       .withNewFile("openid/v1/jwks", jwks);

//     await baseAzureCli()
//       .withMountedDirectory("/docs", docs)
//       .withExec([
//         "az",
//         "storage",
//         "blob",
//         "upload-batch",
//         "-d",
//         "$web",
//         "--account-name",
//         acct,
//         "-s",
//         "/docs",
//         "--overwrite",
//       ])
//       .stdout();
//   }

//   /* ---------------------------------------------- *
//    * 04 – Azure Workload‑Identity webhook via Helm   *
//    * ---------------------------------------------- */
//   async wiWebhook(): Promise<void> {
//     await dag
//       .container()
//       .from("alpine/helm:3.14.4")
//       .withExec([
//         "sh",
//         "-ec",
//         `
// helm repo add azure-workload-identity https://azure.github.io/azure-workload-identity/charts
// helm repo update
// helm upgrade --install workload-identity-webhook \
//   azure-workload-identity/workload-identity-webhook \
//   --namespace azure-workload-identity-system --create-namespace \
//   --set azureTenantID=${await this.ctx.tenantId.plaintext()}
// `,
//       ])
//       .stdout();
//   }

//   /* ---------------------------------------------- *
//    * 05 – Radius control‑plane install + AAD wiring  *
//    * ---------------------------------------------- */
//   async radius(issuer: string): Promise<void> {
//     // delete drifted app if issuer mismatch, then run helper script inside tool‑container
//     await baseAzureCli()
//       .withSecretVariable("SP_CLIENT_ID", this.ctx.spId)
//       .withSecretVariable("SP_CLIENT_SECRET", this.ctx.spSecret)
//       .withSecretVariable("SP_TENANT_ID", this.ctx.tenantId)
//       .withExec([
//         "bash",
//         "-euc",
//         `
// appid=$(az ad app list --display-name rg4-radius-app --query '[0].appId' -otsv || true)
// if [ -n "$appid" ]; then
//   obj=$(az ad app show --id $appid --query id -otsv)
//   iss=$(az ad app federated-credential list --id $obj --query '[0].issuer' -otsv || echo "")
//   if [ "$iss" != "${issuer}" ]; then
//     echo "Issuer drift – deleting $appid";
//     az ad sp delete --id $appid || true
//     az ad app delete --id $appid || true
//   fi
// fi
// `,
//       ])
//       .stdout();

//     // run the legacy rad‑identity helper from repo
//     await dag
//       .container()
//       .from("ghcr.io/radius-project/devcontainer:latest")
//       .withMountedDirectory("/workspace", dag.host().directory("."))
//       .withWorkdir("/workspace")
//       .withExec([
//         "bash",
//         "scripts/rad-identity.sh",
//         "rg4",
//         this.ctx.rg,
//         this.ctx.subId,
//         issuer,
//       ])
//       .stdout();
//   }

//   /* ---------------------------------------------- *
//    * 06 – Key Vault, ESO, ServiceAccounts, RBAC      *
//    * ---------------------------------------------- */
//   async infra(): Promise<void> {
//     // install external‑secrets
//     await dag
//       .container()
//       .from("alpine/helm:3.14.4")
//       .withExec([
//         "helm",
//         "repo",
//         "add",
//         "external-secrets",
//         "https://charts.external-secrets.io",
//       ])
//       .withExec(["helm", "repo", "update"]) // refresh index
//       .withExec([
//         "helm",
//         "upgrade",
//         "--install",
//         "external-secrets",
//         "external-secrets/external-secrets",
//         "-n",
//         "external-secrets",
//         "--create-namespace",
//         "--wait",
//       ])
//       .stdout();

//     // reuse existing azwi bash logic (mounted)
//     await dag
//       .container()
//       .from("mcr.microsoft.com/azure-cli")
//       .withMountedDirectory("/workspace", dag.host().directory("."))
//       .withWorkdir("/workspace")
//       .withExec(["bash", "scripts/azwi-wrapper.sh"])
//       .stdout();
//   }

//   /* ---------------------------------------------- *
//    * 07 – Render + kubectl apply ./deployments       *
//    * ---------------------------------------------- */
//   async deploy(): Promise<void> {
//     const rendered: Directory = await dag
//       .container()
//       .from("alpine")
//       .withMountedDirectory("/src", dag.host().directory("deployments"))
//       .withWorkdir("/src")
//       .withExec([
//         "sh",
//         "-ec",
//         "apk add --no-cache gettext >/dev/null && find . -name '*.tpl' -print0 | xargs -0 -I{} sh -c 'envsubst < {} > ${0%.tpl}'"],
//       )
//       .directory("/src");

//     await dag
//       .container()
//       .from("bitnami/kubectl:latest")
//       .withMountedDirectory("/m", rendered)
//       .withExec(["kubectl", "apply", "-f", "/m"])
//       .stdout();
//   }

//   /* ---------------------------------------------- *
//    * 08 – Install Argo CD + NodePort expose          *
//    * ---------------------------------------------- */
//   async argocd(): Promise<void> {
//     const k = dag
//       .container()
//       .from("bitnami/kubectl:latest");

//     await k.withExec([
//       "kubectl",
//       "create",
//       "namespace",
//       "argocd",
//       "--dry-run=client",
//       "-o",
//       "yaml",
//     ]).withExec(["kubectl", "apply", "-f", "-"]).stdout();

//     await k.withExec([
//       "kubectl",
//       "apply",
//       "-n",
//       "argocd",
//       "-f",
//       "https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml",
//     ]).stdout();

//     // patch service type
//     await k.withExec([
//       "kubectl",
//       "-n",
//       "argocd",
//       "patch",
//       "svc",
//       "argocd-server",
//       "--type=json",
//       "-p",
//       '[{"op":"replace","path":"/spec/type","value":"NodePort"}]',
//     ]).stdout();
//   }

//   /* ---------------------------------------------- *
//    * 09 – Apply app‑of‑apps manifest                 *
//    * ---------------------------------------------- */
//   async bootstrap(): Promise<void> {
//     await dag
//       .container()
//       .from("bitnami/kubectl:latest")
//       .withMountedDirectory("/b", dag.host().directory("bootstrap"))
//       .withExec(["kubectl", "apply", "-f", "/b/app-of-apps.yaml"])
//       .stdout();
//   }

//   /* ---------------------------------------------- *
//    * Orchestration helper                            *
//    * ---------------------------------------------- */
//   async full(): Promise<void> {
//     const acct = await this.storage();
//     const issuer = `https://${acct}.z13.web.core.windows.net/`;
//     await this.kind(issuer);
//     await this.oidc(acct, issuer);
//     await this.wiWebhook();
//     await this.radius(issuer);
//     await this.infra();
//     await this.deploy();
//     await this.argocd();
//     await this.bootstrap();
//   }
// }

// /* ---------- CLI entry‑point ---------- */
// (async () => {
//   await connect(async () => {
//     const pipeline = new Pipeline({
//       subId: process.env["SUBSCRIPTION_ID"]!,
//       rg: process.env["RESOURCE_GROUP"]!,
//       loc: process.env["LOCATION"] ?? "eastus",
//       spId: dag.setSecret("SP_CLIENT_ID", process.env["SP_CLIENT_ID"]!),
//       spSecret: dag.setSecret("SP_CLIENT_SECRET", process.env["SP_CLIENT_SECRET"]!),
//       tenantId: dag.setSecret("SP_TENANT_ID", process.env["SP_TENANT_ID"]!),
//     });

//     const step = (process.argv[2] ?? "full") as keyof Pipeline;
//     // @ts-expect-error dynamic dispatch is intentional
//     await pipeline[step]();
//   });
// })();
