import { App } from 'cdk8s';
import { NextJsChart } from './charts/nextjs-chart';
import { PostgresChart } from './charts/postgres-chart';
import { RedisChart } from './charts/redis-chart';
import { IngressNginxChart } from './charts/ingress-nginx-chart';
import { MonitoringHelmChart } from './charts/monitoring-helm-chart';
import { ArgoApplicationsChart } from './charts/argo-applications-chart';
import { ExternalSecretsChart } from './charts/externalsecrets-chart';

const app = new App();

new NextJsChart(app, 'nextjs');
new PostgresChart(app, 'postgres');
new RedisChart(app, 'redis');
new IngressNginxChart(app, 'ingress-nginx');
new MonitoringHelmChart(app, 'monitoring');
new ExternalSecretsChart(app, 'external-secrets');
new ArgoApplicationsChart(app, 'argo-apps');

app.synth();