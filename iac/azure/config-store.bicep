@description('Radius-provided object containing information about the resource calling the Recipe')
param context object

@description('The geo-location where the resource lives.')
param location string = resourceGroup().location

extension kubernetes with {
  kubeConfig: ''
  namespace: context.runtime.kubernetes.namespace
} as kubernetes

var uniqueName = 'daprconfig-${uniqueString(context.resource.id)}b'

resource appConfig 'Microsoft.AppConfiguration/configurationStores@2022-05-01' = {
  name: uniqueName
  location: location
  sku: {
    name: 'Standard'
  }
  properties: {
    publicNetworkAccess: 'Enabled'
  }
}

var daprType = 'configuration.azure.appconfig'
var daprVersion = 'v1'

resource daprComponent 'dapr.io/Component@v1alpha1' = {
  metadata: {
    name: context.resource.name
  }

  spec: {
    type: daprType
    version: daprVersion
    metadata: [
      {
        name: 'connectionString'
        value: appConfig.listKeys().value[0].connectionString
      }
      {
        name: 'subscribePollInterval'
        value: '1s'
      }
    ]
  }
}
