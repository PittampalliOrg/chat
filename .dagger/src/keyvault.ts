import {
  dag,
  object,
  func,
  Directory,
  Secret,
} from "@dagger.io/dagger";

@object()
export class KeyVault {
@func()
async example(keyVaultName: string, secretName: string, tenantId: Secret, clientId: Secret, clientSecret: Secret): Promise<string> {
	return dag
		.azureKeyVault()
		.getSecret(keyVaultName, secretName, tenantId, clientId, clientSecret)
}
}

