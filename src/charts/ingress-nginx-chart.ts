import { Chart, Helm } from 'cdk8s';
import { Construct } from 'constructs';

export class IngressNginxChart extends Chart {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new Helm(this, 'ingress-nginx', {
      chart: 'ingress-nginx',
      repo: 'https://kubernetes.github.io/ingress-nginx',
      version: '4.10.1',
      values: {
        controller: {
          publishService: { enabled: false },
          service: {
            type: 'NodePort',
            nodePorts: { http: 31080, https: 31443 },
          },
        },
      },
      namespace: 'ingress-nginx',
    });
  }
}