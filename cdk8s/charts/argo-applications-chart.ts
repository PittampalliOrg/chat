import { Chart } from 'cdk8s';
import { Construct } from 'constructs';
import { ArgoCdApplication } from '@opencdk8s/cdk8s-argocd-resources';
import { KubeConfigMap } from '../imports/k8s';

export class ArgoApplicationsChart extends Chart {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Repository URL for the cdk8s project
    const repoURL = 'https://github.com/your-org/infra-cdk8s.git';
    
    // Define applications to be managed by ArgoCD
    const applications = [
      { 
        name: 'nextjs', 
        namespace: 'nextjs',
        path: 'dist/nextjs.k8s.yaml'
      },
      { 
        name: 'postgres', 
        namespace: 'postgres',
        path: 'dist/postgres.k8s.yaml'
      },
      { 
        name: 'redis', 
        namespace: 'redis',
        path: 'dist/redis.k8s.yaml'
      },
      { 
        name: 'ingress-nginx', 
        namespace: 'ingress-nginx',
        path: 'dist/ingress-nginx.k8s.yaml'
      },
      { 
        name: 'monitoring', 
        namespace: 'monitoring',
        path: 'dist/monitoring.k8s.yaml'
      },
      {
        name: 'external-secrets',
        namespace: 'external-secrets',
        path: 'dist/external-secrets.k8s.yaml'
      }
    ];

    // Create ArgoCD applications for each resource
    applications.forEach(app => {
      new ArgoCdApplication(this, `${app.name}-app`, {
        metadata: { 
          name: app.name, 
          namespace: 'argocd'
        },
        spec: {
          project: 'default',
          destination: { 
            name: 'in-cluster', 
            namespace: app.namespace 
          },
          source: {
            repoURL: repoURL,
            targetRevision: 'HEAD',
            path: app.path,
          },
          syncPolicy: {
            automated: { prune: true, selfHeal: true },
            syncOptions: ['CreateNamespace=true'],
          },
        },
      });
    });

    // Main cdk8s application that uses the plugin
    new ArgoCdApplication(this, 'cdk8s-app', {
      metadata: { 
        name: 'cdk8s-infra', 
        namespace: 'argocd' 
      },
      spec: {
        project: 'default',
        destination: { 
          name: 'in-cluster', 
          namespace: 'default' 
        },
        source: {
          repoURL: repoURL,
          targetRevision: 'HEAD',
          path: '.',
          plugin: { name: 'cdk8s' },
        },
        syncPolicy: {
          automated: { prune: true, selfHeal: true },
          syncOptions: ['CreateNamespace=true'],
        },
      },
    });
    
    // ArgoCD plugin configuration
    new KubeConfigMap(this, 'argocd-cm-plugin', {
      metadata: {
        name: 'argocd-cm',
        namespace: 'argocd',
        labels: {
          'app.kubernetes.io/name': 'argocd-cm',
          'app.kubernetes.io/part-of': 'argocd'
        }
      },
      data: {
        configManagementPlugins: `
- name: cdk8s
  init:
    command: ["/bin/sh", "-c"]
    args:
      - npm ci
  generate:
    command: ["/bin/sh", "-c"]
    args:
      - npx cdk8s synth
  discover:
    fileName: "cdk8s.yaml"
`
      }
    });
  }
}
