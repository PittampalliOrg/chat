import { Chart } from 'cdk8s';
import * as kplus from 'cdk8s-plus-30';
import { Construct } from 'constructs';

export class RedisChart extends Chart {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const namespace = 'nextjs';
    const deploy = new kplus.Deployment(this, 'redis-deploy', {
      metadata: { name: 'redis-deployment', namespace },
      containers: [
        {
          name: 'redis',
          image: 'redis/redis-stack:latest',
          port: 6379,
        },
      ],
      podMetadata: { labels: { app: 'redis' } },
    });

    deploy.exposeViaService({ name: 'redis-service', ports: [{ port: 6379 }] });
  }
}
