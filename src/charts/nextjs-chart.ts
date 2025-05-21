import { Chart, ApiObject } from 'cdk8s';
import * as kplus from 'cdk8s-plus-30';
import { Construct } from 'constructs';

export class NextJsChart extends Chart {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const namespace = 'nextjs';
    // ConfigMap
    new kplus.ConfigMap(this, 'config', {
      metadata: { name: 'myapp-config', namespace },
      data: {
        NEXTAUTH_URL: 'http://chat.localtest.me:31080',
        NEXT_PUBLIC_BASE_URL: 'http://chat.localtest.me:31080',
        NEXT_PUBLIC_SITE_URL: 'http://chat.localtest.me:31080',
        NEXT_PUBLIC_BASE_PATH: 'http://chat.localtest.me',
        OTEL_EXPORTER_OTLP_ENDPOINT: 'http://alloy.monitoring.svc.cluster.local:4318',
        OTEL_EXPORTER_OTLP_PROTOCOL: 'http/protobuf',
        OTEL_TRACES_EXPORTER: 'otlp',
        OTEL_METRICS_EXPORTER: 'otlp',
        OTEL_LOGS_EXPORTER: 'otlp',
        OTEL_SERVICE_NAME: 'nextjs',
        OTEL_RESOURCE_ATTRIBUTES: 'k8s.cluster.name=local-kind,service.namespace=nextjs',
        OTEL_LOG_LEVEL: 'debug',
        NEXT_RUNTIME: 'nodejs',
        NODE_ENV: 'development',
        REDIS_URL: 'redis://redis-service:6379',
        REDIS_AVAILABLE: 'true',
        TRUST_PROXY: '1',
      },
    });

    // Deployment
    const deploy = new kplus.Deployment(this, 'deployment', {
      metadata: { name: 'nextjs-deployment', namespace },
      replicas: 2,
      containers: [
        {
          name: 'nextjs',
          image: 'vpittamp.azurecr.io/chat-frontend:0.3.08',
          port: 3000,
          envFrom: [
            kplus.Env.fromConfigMap('myapp-config'),
            kplus.Env.fromSecret('app-env'),
          ],
          imagePullPolicy: kplus.ImagePullPolicy.ALWAYS,
        },
      ],
      podMetadata: {
        labels: { app: 'nextjs' },
      },
    });

    // Service
    deploy.exposeViaService({
      name: 'nextjs-service',
      serviceType: kplus.ServiceType.CLUSTER_IP,
      ports: [{ port: 3000 }],
    });

    // Ingress
    new kplus.Ingress(this, 'ingress', {
      metadata: { name: 'nextjs-ingress', namespace },
      ingressClassName: 'nginx',
      rules: [
        {
          host: 'chat.localtest.me',
          path: '/',
          backend: kplus.IngressBackend.fromService(deploy.service!),
        },
      ],
    });

    // ImagePullSecret reference that ESO will create
    kplus.Secret.fromSecretName(this, 'acr-dockercfg', 'vpittamp-acr-dockercfg');
  }
}
