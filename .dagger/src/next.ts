import {
  dag, object, func, Secret, Directory, Container, CacheVolume,
} from "@dagger.io/dagger";
import * as fs from 'fs';

const NODE_VERSION = "22-alpine";
const APP_PORT     = "3000";


function choosePM() {
  if (fs.existsSync("yarn.lock"))       // yarn
    return { cmd: "yarn",
      install: ["yarn", "--frozen-lockfile"],
      build:   ["yarn", "run", "build"] };

  if (fs.existsSync("pnpm-lock.yaml"))  // pnpm
    return { cmd: "pnpm",
      install: ["pnpm", "i", "--frozen-lockfile"],
      build:   ["pnpm", "run", "build"] };

  // default to npm
  if (fs.existsSync("package-lock.json"))
    return { cmd: "npm",
      install: ["npm", "ci"],
      build:   ["npm", "run", "build"] };

  throw new Error("No lock-file found (yarn.lock, pnpm-lock.yaml, package-lock.json)");
}


@object()
export class NextApp {
  /** Build the app and return a production-ready container */
  @func()
  async build(
    srcDir: Directory = dag.directory().directory("."),
    postgresUrl: Secret,
    authSecret: Secret,
    xaiKey: Secret,
    blobToken: Secret,
    redisUrl: Secret,
    tzdbKey: Secret
  ): Promise<Container> {
    const pm = choosePM();

    /* ---------- deps layer ------------------------------------------------ */
    const cache = dag.cacheVolume(`${pm.cmd}-cache`);
    const deps = dag.container()
      .from(`node:${NODE_VERSION}`)
      .withMountedCache(`/root/.${pm.cmd}`, cache)            // reuse package-manager cache:contentReference[oaicite:1]{index=1}
      .withWorkdir("/app")
      .withDirectory("/app", srcDir, { exclude: ["**/node_modules/**", "**/.next/**"] })
      .withExec(pm.install);

    /* ---------- builder layer -------------------------------------------- */
    const builderEnv = {
      POSTGRES_URL: postgresUrl,
      AUTH_SECRET: authSecret,
      XAI_API_KEY: xaiKey,
      BLOB_READ_WRITE_TOKEN: blobToken,
      REDIS_URL: redisUrl,
      TIMEZONE_DB_API_KEY: tzdbKey,
      REDIS_AVAILABLE: "true",
      NODE_OPTIONS: "--require @opentelemetry/auto-instrumentations-node/register",
    };

    const build = dag.container()
      .from(`node:${NODE_VERSION}`)
      .withWorkdir("/app")
      .withMountedDirectory("/app", srcDir)
      .withDirectory("/app/node_modules", deps.directory("/app/node_modules"))
      // stream secrets so they never hit disk layers:contentReference[oaicite:2]{index=2}
      .withSecretVariable("POSTGRES_URL", postgresUrl)
      .withSecretVariable("AUTH_SECRET", authSecret)
      .withSecretVariable("XAI_API_KEY", xaiKey)
      .withSecretVariable("BLOB_READ_WRITE_TOKEN", blobToken)
      .withSecretVariable("REDIS_URL", redisUrl)
      .withSecretVariable("TIMEZONE_DB_API_KEY", tzdbKey)
      .withEnvVariable("REDIS_AVAILABLE", "true")
      .withEnvVariable("NODE_OPTIONS", builderEnv.NODE_OPTIONS)
      .withExec(pm.build);

    /* ---------- runtime layer -------------------------------------------- */
    const runtime = dag.container()
      .from(`node:${NODE_VERSION}`)
      .withUser("1001:1001")                                  // nextjs user
      .withWorkdir("/app")
      .withDirectory("/app/public", build.directory("/app/public"))
      .withDirectory("/app/.next",  build.directory("/app/.next"))
      .withDirectory("/app/node_modules", build.directory("/app/node_modules"))
      .withFile("/app/server.js",   build.file("/app/server.js"))
      .withEnvVariable("PORT",       APP_PORT)
      .withEnvVariable("HOSTNAME",  "0.0.0.0")
      .withSecretVariable("POSTGRES_URL", postgresUrl)
      .withSecretVariable("AUTH_SECRET", authSecret)
      .withSecretVariable("XAI_API_KEY", xaiKey)
      .withSecretVariable("BLOB_READ_WRITE_TOKEN", blobToken)
      .withSecretVariable("REDIS_URL", redisUrl)
      .withSecretVariable("TIMEZONE_DB_API_KEY", tzdbKey)
      .withEnvVariable("REDIS_AVAILABLE", "true")
      .withEnvVariable("NODE_OPTIONS", builderEnv.NODE_OPTIONS)
      .withExposedPort(parseInt(APP_PORT, 10))
      .withEntrypoint(["node", "server.js"]);

    return runtime;
  }
}
