/* ------------------------------------------------------------------ *
 * .dagger/src/kind.ts – KinD cluster helper                          *
 * ------------------------------------------------------------------ */

import { dag, object, func, CacheVolume, Service } from "@dagger.io/dagger";

@object()
export class KindCluster {
  /**
   * Spin up (or replace) a KinD cluster with the given issuer URL.
   */
  @func()
  async create(issuer: string, name = "rg4"): Promise<void> {
    const dindCache = dag.cacheVolume("dind-lib");

    const dind: Service = dag
      .container()
      .from("docker:dind")
      .withMountedCache("/var/lib/docker", dindCache)
      .withExec([
        "dockerd-entrypoint.sh",
        "--host=unix:///var/run/docker.sock",
        "--experimental",
      ])
      .asService();

    await dag
      .container()
      .from("docker.io/rancher/kind:v0.20.0")
      .withServiceBinding("docker", dind)
      .withMountedCache("/var/lib/docker", dindCache)
      .withExec([
        "bash", "-c",
        `set -euo pipefail
cat <<EOF > kind.yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
kubeadmConfigPatches:
  - |
    kind: ClusterConfiguration
    apiServer:
      extraArgs:
        service-account-issuer: ${issuer}
EOF
kind delete cluster --name ${name} || true
kind create cluster --name ${name} --config kind.yaml`,
      ]);
  }
}
