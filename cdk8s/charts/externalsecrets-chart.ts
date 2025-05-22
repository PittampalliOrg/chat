import { Chart, ApiObject } from 'cdk8s';
import { Construct } from 'constructs';

export class ExternalSecretsChart extends Chart {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // ESO ClusterSecretStore example (keep YAML shape)
    new ApiObject(this, 'azure-keyvault-store', {
      apiVersion: 'external-secrets.io/v1',
      kind: 'ClusterSecretStore',
      metadata: { name: 'azure-keyvault-store' },
      spec: {
        provider: {
          azurekv: {
            authType: 'WorkloadIdentity',
            vaultUrl: 'https://keyvault-thcmfmoo5oeow.vault.azure.net',
            serviceAccountRef: { name: 'keyvault', namespace: 'external-secrets' },
          },
        },
      },
    });

    // Demo ExternalSecret mapping (kv-vault)
    new ApiObject(this, 'kv-vault', {
      apiVersion: 'external-secrets.io/v1',
      kind: 'ExternalSecret',
      metadata: { name: 'kv-vault', namespace: 'nextjs' },
      spec: {
        refreshInterval: '1m',
        secretStoreRef: { kind: 'ClusterSecretStore', name: 'azure-keyvault-store' },
        target: { name: 'kv-vault', creationPolicy: 'Owner' },
        dataFrom: [{ find: { name: { regexp: '.*' } } }],
      },
    });
  }
}
