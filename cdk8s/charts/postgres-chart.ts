import { Chart, Size } from 'cdk8s';
import * as kplus from 'cdk8s-plus-30';
import { Construct } from 'constructs';

export class PostgresChart extends Chart {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const namespace = 'nextjs';

    const pvc = new kplus.PersistentVolumeClaim(this, 'pg-pvc', {
      metadata: { name: 'pg-data', namespace },
      accessModes: [kplus.PersistentVolumeAccessMode.READ_WRITE_ONCE],
      storage: Size.gibibytes(5),
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
            POSTGRES_USER: kplus.EnvValue.fromValue('postgres'),
            POSTGRES_PASSWORD: kplus.EnvValue.fromValue('postgres'),
            POSTGRES_DB: kplus.EnvValue.fromValue('postgres'),
            LANG: kplus.EnvValue.fromValue('en_US.utf8'),
            LC_ALL: kplus.EnvValue.fromValue('en_US.utf8'),
          },
          volumeMounts: [{ 
            path: '/var/lib/postgresql/data', 
            volume: kplus.Volume.fromPersistentVolumeClaim(this, 'pg-volume', pvc) 
          }],
        },
      ],
      podMetadata: { labels: { app: 'postgres' } },
    });

    deployment.exposeViaService({ name: 'postgres-service', ports: [{ port: 5432 }] });
  }
}