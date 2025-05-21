import { Chart } from 'cdk8s';
import * as kplus from 'cdk8s-plus-30';
import { Construct } from 'constructs';

export class PostgresChart extends Chart {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const namespace = 'nextjs';

    const pvc = new kplus.PersistentVolumeClaim(this, 'pg-pvc', {
      metadata: { name: 'pg-data', namespace },
      accessModes: [kplus.PersistentVolumeAccessMode.READ_WRITE_ONCE],
      storage: kplus.Size.gibibytes(5),
    });

    const deployment = new kplus.Deployment(this, 'pg-deploy', {
      metadata: { name: 'postgres', namespace },
      replicas: 1,
      containers: [
        {
          image: 'postgres:16',
          name: 'postgres',
          port: 5432,
          envVariables: {
            POSTGRES_USER: { value: 'postgres' },
            POSTGRES_PASSWORD: { value: 'postgres' },
            POSTGRES_DB: { value: 'postgres' },
            LANG: { value: 'en_US.utf8' },
            LC_ALL: { value: 'en_US.utf8' },
          },
          volumeMounts: [{ path: '/var/lib/postgresql/data', volume: kplus.Volume.fromPersistentVolumeClaim(pvc) }],
        },
      ],
      podMetadata: { labels: { app: 'postgres' } },
    });

    deployment.exposeViaService({ name: 'postgres-service', ports: [{ port: 5432 }] });
  }
}