import {
  dag, object, func,
  Secret, Directory, Container,
} from "@dagger.io/dagger";

async function choosePM(src: Directory) {
  // Helper to probe for a file without File.exists()
  const has = async (p: string): Promise<boolean> => {
    try { await src.file(p).id(); return true; }  // succeeds only if file exists
    catch { return false; }                       // path not found -> false
  };

  if (await has("yarn.lock"))
    return { cmd: "yarn",
      install: ["yarn", "--frozen-lockfile"],
      build:   ["yarn", "run", "build"],
      cacheDir: "/root/.yarn",
    };

  if (await has("pnpm-lock.yaml"))
    return { cmd: "pnpm",
      install: ["sh", "-c", "corepack enable pnpm && pnpm i --frozen-lockfile"],
      build:   ["sh", "-c", "corepack enable pnpm && pnpm run build"],
      cacheDir: "/root/.pnpm-store",
    };

  if (await has("package-lock.json"))
    return { cmd: "npm",
      install: ["npm", "ci"],
      build:   ["npm", "run", "build"],
      cacheDir: "/root/.npm",
    };

  throw new Error(
    "No lock‑file found (yarn.lock, pnpm-lock.yaml, package-lock.json)",
  );
}

/* ---------------------------------------------------------------- *  
 * Constants                                                         *
 * ---------------------------------------------------------------- */
const NODE_VERSION = "22-alpine";
const APP_PORT     = 3000;

/* ---------------------------------------------------------------- *  
 * Main Dagger object                                                *
 * ---------------------------------------------------------------- */
@object()
export class Dag {

  /**
   * Build the Next.js application and return a production‑ready
   * container image.
   *
   * @param srcDir   Project source – **must be passed from the CLI**.
   *                 Example: `--src-dir=.` when calling `dagger call`.
   */
  @func()
  async build(
    srcDir: Directory,                           // ← no more dag.host() dependency
    postgresUrl:   Secret,
    authSecret:    Secret,
    xaiKey:        Secret,
    blobToken:     Secret,
    redisUrl:      Secret,
    tzdbKey:       Secret,
    neonApiKey:    Secret,
    neonProjectId: Secret,
    nextPublicBasePath = "http://chat.localtest.me",
    // Build metadata parameters
    gitCommitSha = "",
    gitCommitShort = "",
    gitBranch = "",
    buildTime = "",
    buildVersion = "",
    gitCommitMessage = "",
    gitCommitAuthor = "",
    buildNumber = "",
    gitRepository = "",
  ): Promise<Container> {

    /* Detect PM & create cache volume ----------------------------------- */
    const pm         = await choosePM(srcDir);
    const depsCache  = dag.cacheVolume(`${pm.cmd}-cache`);  // :contentReference[oaicite:2]{index=2}

    /* deps layer -------------------------------------------------------- */
    const deps = dag.container()
      .from(`node:${NODE_VERSION}`)
      .withExec(["apk", "add", "--no-cache", "libc6-compat"])
      .withWorkdir("/app")
      .withDirectory("/app", srcDir, {
        include: ["package.json", "yarn.lock*", "package-lock.json*", "pnpm-lock.yaml*", ".npmrc*"],
      })
      .withMountedCache(pm.cacheDir, depsCache)
      .withExec(pm.install);

    /* builder layer ----------------------------------------------------- */
    const builder = dag.container()
      .from(`node:${NODE_VERSION}`)
      .withExec(["apk", "add", "--no-cache", "git", "jq"])
      .withWorkdir("/app")
      .withDirectory("/app/node_modules", deps.directory("/app/node_modules"))
      .withDirectory("/app", srcDir, { exclude: ["**/node_modules/**", "**/.next/**"] })
      .withExec([
        "sh", "-c",
        `# Create .env.production.local with build metadata
         echo "NEXT_PUBLIC_DEPLOYMENT_ID=${gitCommitShort || 'unknown'}" > .env.production.local &&
         echo "DEPLOYMENT_ID=${gitCommitShort || 'unknown'}" >> .env.production.local &&
         echo "NEXT_PUBLIC_GIT_COMMIT=${gitCommitSha}" >> .env.production.local &&
         echo "NEXT_PUBLIC_GIT_COMMIT_SHORT=${gitCommitShort}" >> .env.production.local &&
         echo "NEXT_PUBLIC_GIT_BRANCH=${gitBranch}" >> .env.production.local &&
         echo "NEXT_PUBLIC_BUILD_TIME=${buildTime}" >> .env.production.local &&
         echo "NEXT_PUBLIC_BUILD_VERSION=${buildVersion}" >> .env.production.local &&
         echo "NEXT_PUBLIC_GIT_COMMIT_MESSAGE=${gitCommitMessage}" >> .env.production.local &&
         echo "NEXT_PUBLIC_GIT_COMMIT_AUTHOR=${gitCommitAuthor}" >> .env.production.local &&
         echo "NEXT_PUBLIC_BUILD_NUMBER=${buildNumber}" >> .env.production.local &&
         echo "NEXT_PUBLIC_GIT_REPOSITORY=${gitRepository}" >> .env.production.local`,
      ])
      // Fix OpenTelemetry by finding and patching the problematic file
      .withExec(["sh", "-c", `
        # Find and patch the problematic OpenTelemetry file
        find node_modules -name "OTLPMetricExporterBase.js" -path "*/exporter-metrics-otlp-http/*" | while read file; do
          echo "Found file: $file"
          # Replace the problematic line with a safe default
          sed -i 's/sdk_metrics_1\\.AggregationType\\.DEFAULT/0/g' "$file"
          echo "Patched: $file"
        done
        echo "OpenTelemetry patching complete"
      `])
      // Build‑time secrets
      .withSecretVariable("POSTGRES_URL",          postgresUrl)
      .withSecretVariable("AUTH_SECRET",           authSecret)
      .withSecretVariable("XAI_API_KEY",           xaiKey)
      .withSecretVariable("BLOB_READ_WRITE_TOKEN", blobToken)
      .withSecretVariable("REDIS_URL",             redisUrl)
      .withSecretVariable("TIMEZONE_DB_API_KEY",   tzdbKey)
      .withSecretVariable("NEON_API_KEY",          neonApiKey)
      .withSecretVariable("NEON_PROJECT_ID",       neonProjectId)
      .withEnvVariable("NODE_ENV", "production")
      .withEnvVariable("NEXT_PUBLIC_BASE_PATH", nextPublicBasePath)
      .withEnvVariable("NEXT_PUBLIC_BASE_URL", nextPublicBasePath)
      .withEnvVariable("NEXT_PUBLIC_SITE_URL", nextPublicBasePath)
      .withEnvVariable("REDIS_AVAILABLE", "true")
      .withEnvVariable("OTEL_SDK_DISABLED", "true")
      // Build metadata as environment variables
      .withEnvVariable("NEXT_PUBLIC_GIT_COMMIT", gitCommitSha)
      .withEnvVariable("NEXT_PUBLIC_GIT_COMMIT_SHORT", gitCommitShort)
      .withEnvVariable("NEXT_PUBLIC_GIT_BRANCH", gitBranch)
      .withEnvVariable("NEXT_PUBLIC_BUILD_TIME", buildTime)
      .withEnvVariable("NEXT_PUBLIC_BUILD_VERSION", buildVersion)
      .withEnvVariable("NEXT_PUBLIC_GIT_COMMIT_MESSAGE", gitCommitMessage)
      .withEnvVariable("NEXT_PUBLIC_GIT_COMMIT_AUTHOR", gitCommitAuthor)
      .withEnvVariable("NEXT_PUBLIC_BUILD_NUMBER", buildNumber)
      .withEnvVariable("NEXT_PUBLIC_GIT_REPOSITORY", gitRepository)
      // Clear NODE_OPTIONS to prevent OpenTelemetry auto-instrumentation during build
      .withEnvVariable("NODE_OPTIONS", "")
      .withExec(pm.build);

    /* runtime layer ----------------------------------------------------- */
    const runtime = dag.container()
      .from(`node:${NODE_VERSION}`)
      .withWorkdir("/app")
      .withExec(["addgroup", "--system", "--gid", "1001", "nodejs"])
      .withExec(["adduser", "--system", "--uid", "1001", "nextjs"])
      .withFile("/app/.env.production.local", builder.file("/app/.env.production.local"))
      .withDirectory("/app/public",         builder.directory("/app/public"))
      .withDirectory("/app",                builder.directory("/app/.next/standalone"))
      .withDirectory("/app/.next/static",   builder.directory("/app/.next/static"))
      .withExec(["mkdir", "-p", "/workspace"])
      .withExec(["chown", "-R", "nextjs:nodejs", "/workspace"])
      .withExec(["chmod", "775", "/workspace"])
      .withEnvVariable("PORT", `${APP_PORT}`)
      .withEnvVariable("NODE_ENV", "production")
      .withEnvVariable("NEXT_PUBLIC_BASE_PATH", nextPublicBasePath)
      .withEnvVariable("NEXT_PUBLIC_BASE_URL", nextPublicBasePath)
      .withEnvVariable("NEXT_PUBLIC_SITE_URL", nextPublicBasePath)
      .withEnvVariable("REDIS_AVAILABLE", "true")
      .withSecretVariable("POSTGRES_URL",          postgresUrl)
      .withSecretVariable("AUTH_SECRET",           authSecret)
      .withSecretVariable("XAI_API_KEY",           xaiKey)
      .withSecretVariable("BLOB_READ_WRITE_TOKEN", blobToken)
      .withSecretVariable("REDIS_URL",             redisUrl)
      .withSecretVariable("TIMEZONE_DB_API_KEY",   tzdbKey)
      .withSecretVariable("NEON_API_KEY",          neonApiKey)
      .withSecretVariable("NEON_PROJECT_ID",       neonProjectId)
      .withUser("nextjs")
      .withExposedPort(APP_PORT)
      .withEntrypoint(["node", "server.js"]);

    return runtime;  // ready to export or run
  }

    /**
   * Build the app *and* push it to Azure Container Registry (ACR).
   *
   * @param srcDir  Project directory (same as build()).
   * @param acrName myregistry (without .azurecr.io)
   * @param repo    Repository name inside ACR, e.g. "chatbot-ui"
   * @param tag     Image tag, e.g. "latest" or a git SHA
   * @param username Registry user (often the ACR name itself, or
   *                 "00000000‑0000‑0000‑0000‑000000000000" for token auth)
   * @param password Registry password or access token (Secret) */
  @func()
  async pushToAcr(
    srcDir: Directory,
    acrName: string,
    repo: string,
    tag: string,
    username: string,
    password: Secret,
    /* ── all the secrets build() already needs ── */
    postgresUrl:   Secret,
    authSecret:    Secret,
    xaiKey:        Secret,
    blobToken:     Secret,
    redisUrl:      Secret,
    tzdbKey:       Secret,
    neonApiKey:    Secret,
    neonProjectId: Secret,
    nextPublicBasePath = "http://chat.localtest.me",
    // Build metadata parameters
    gitCommitSha = "",
    gitCommitShort = "",
    gitBranch = "",
    buildTime = "",
    buildVersion = "",
    gitCommitMessage = "",
    gitCommitAuthor = "",
    buildNumber = "",
    gitRepository = "",
  ): Promise<string> {

    // 1. Build the production image using the existing pipeline
    const ctr = await this.build(
      srcDir, postgresUrl, authSecret, xaiKey, blobToken, redisUrl,
      tzdbKey, neonApiKey, neonProjectId, nextPublicBasePath,
      gitCommitSha, gitCommitShort, gitBranch, buildTime, buildVersion,
      gitCommitMessage, gitCommitAuthor, buildNumber, gitRepository
    )

    // 2. Publish it to ACR
    // Handle case where acrName might already include .azurecr.io
    const registryName = acrName.replace('.azurecr.io', '');
    const registry = `${registryName}.azurecr.io`;
    const address  = `${registry}/${repo}:${tag}`;

    // Debug logging
    console.log(`[DEBUG] ACR Name input: ${acrName}`);
    console.log(`[DEBUG] Registry Name: ${registryName}`);
    console.log(`[DEBUG] Registry URL: ${registry}`);
    console.log(`[DEBUG] Username: ${username}`);
    console.log(`[DEBUG] Full address: ${address}`);

    try {
      return await ctr
        .withRegistryAuth(registry, username, password)  // attach creds
        .publish(address)                                // push & return digest
    } catch (error) {
      console.error(`[ERROR] Failed to push to ACR: ${error}`);
      console.error(`[ERROR] Registry: ${registry}`);
      console.error(`[ERROR] Address: ${address}`);
      console.error(`[ERROR] Username: ${username}`);
      throw error;
    }
  }
}
