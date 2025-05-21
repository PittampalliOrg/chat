import { Chart } from 'cdk8s';
import { Construct } from 'constructs';
import { Application } from 'cdk8s-argocd-resources';

export class ArgoApplicationsChart extends Chart {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Example Argo Application for Grafana helm release managed above
    new Application(this, 'grafana-app', {
      metadata: { name: 'grafana', namespace: 'argocd' },
      spec: {
        project: 'default',
        destination: { name: 'in-cluster', namespace: 'monitoring' },
        source: {
          repoUrl: 'https://github.com/your-org/infra-cdk8s.git', // THIS REPO
          targetRevision: 'HEAD',
          path: 'dist',
          plugin: { name: 'cdk8s' },
        },
        syncPolicy: {
          automated: { prune: true, selfHeal: true },
          syncOptions: ['CreateNamespace=true'],
        },
      },
    });
  }
}
