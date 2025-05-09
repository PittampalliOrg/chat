extension radius

@description('The Azure region to deploy Azure resource(s) into. Defaults to the region of the target Azure resource group.')
param azLocation string = resourceGroup().location

resource keyvault 'Microsoft.KeyVault/vaults@2021-10-01' = {
  name: 'qs-test-24624'
  location: azLocation
  properties: {
    enabledForTemplateDeployment: true
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    sku: {
      name: 'standard'
      family: 'A'
    }
  }
  resource mySecret 'secrets' = {
    name: 'mysecret'
    properties: {
      value: 'supersecret'
    }
  }
}
