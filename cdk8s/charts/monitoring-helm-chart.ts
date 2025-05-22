import { Chart, Helm } from 'cdk8s';
import { Construct } from 'constructs';

export class MonitoringHelmChart extends Chart {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const ns = 'monitoring';

    // Loki
    new Helm(this, 'loki', {
      chart: 'loki',
      repo: 'https://grafana.github.io/helm-charts',
      version: '5.*',
      values: {
        singleBinary: { replicas: 1 },
        loki: { 
          auth_enabled: false,
          storage: {
            type: 'filesystem',
            bucketNames: {
              chunks: 'chunks',
              ruler: 'ruler',
              admin: 'admin'
            }
          }
        },
        gateway: { enabled: true, service: { type: 'NodePort', nodePort: 31000 } },
      },
      namespace: ns,
    });

    // Mimir - temporarily commented out due to configuration issues
    /*
    new Helm(this, 'mimir', {
      chart: 'mimir-distributed',
      repo: 'https://grafana.github.io/helm-charts',
      version: '5.*',
      values: {
        gateway: { service: { type: 'ClusterIP' } },
        ingester: { 
          replicas: 1,
          zoneAwareReplication: {
            enabled: false,
            migration: {
              enabled: false
            }
          }
        },
        alertmanager: { enabled: false },
      },
      namespace: ns,
    });
    */

    // Tempo
    new Helm(this, 'tempo', {
      chart: 'tempo',
      repo: 'https://grafana.github.io/helm-charts',
      version: '1.*',
      values: {
        mode: 'standalone',
        service: { type: 'ClusterIP', ports: [
          { name: 'http', port: 3100 },
          { name: 'otlp-grpc', port: 4317 },
          { name: 'otlp-http', port: 4318 },
        ]},
        traces: { otlp: { grpc: { enabled: true }, http: { enabled: true } } },
      },
      namespace: ns,
    });

    // Grafana
    new Helm(this, 'grafana', {
      chart: 'grafana',
      repo: 'https://grafana.github.io/helm-charts',
      version: '8.*',
      values: {
        service: { type: 'ClusterIP' },
        ingress: {
          enabled: true,
          ingressClassName: 'nginx',
          hosts: ['grafana.localtest.me'],
        },
        adminUser: 'admin',
        adminPassword: 'grafana',
      },
      namespace: ns,
    });

    // k8s-monitoring (Grafana Alloy + Beyla) - temporarily commented out due to configuration issues
    /*
    new Helm(this, 'k8s-monitoring', {
      chart: 'k8s-monitoring',
      repo: 'https://grafana.github.io/helm-charts',
      version: '2.*',
      values: { cluster: { name: 'local-kind' }, clusterMetrics: { enabled: true } },
      namespace: ns,
    });
    */
  }
}