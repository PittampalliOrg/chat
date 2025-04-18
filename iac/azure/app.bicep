extension radius

@description('AKS Workload‑Identity issuer URL')
param oidcIssuer string

param location string = resourceGroup().location

@secure()
param adminPassword string
param appName string = 'chat'

param image string = 'vpittamp.azurecr.io/chat-frontend:0.0.3'

resource environment 'Applications.Core/environments@2023-10-01-preview' = {
  name: 'azure'
  properties: {
    compute: {
      kind: 'kubernetes'
      resourceId: 'self'
      namespace: 'azure-chat'
      identity: { kind: 'azure.com.workload', oidcIssuer: oidcIssuer }
    }
    providers: { azure: { scope: resourceGroup().id } }
  }
}

resource application 'Applications.Core/applications@2023-10-01-preview' = {
  name: appName
  properties: {
    environment: environment.id
  }
}

resource web 'Applications.Core/containers@2023-10-01-preview' = {
  name: '${appName}-frontend'
  properties: {
    application: application.id
    environment: environment.id
    container: {
      image: image
      env: {
        POSTGRES_URL: {
          value: 'postgresql://pgadmin:${adminPassword}@${postgresServer.name}.private.postgres.database.azure.com:5432/postgres?sslmode=require'
        }
        OPENAI_API_KEY: {
          value: ''
        }
        AZURE_API_KEY: {
          value: ''
        }
        ANTHROPIC_API_KEY: {
          value: ''
        }
        NEXTAUTH_SECRET: { value: '***' }
        AUTH_TRUST_HOST: { value: 'true' }
      }
      ports: { web: { containerPort: 3000 } }
    }
    connections: { db: { source: postgresServer.id } }
  }
}

resource postgresServer 'Microsoft.DBforPostgreSQL/flexibleServers@2021-06-01' = {
  name: 'qs-${uniqueString(resourceGroup().id)}'
  location: location
  sku: {
    name: 'Standard_B1ms'
    tier: 'Burstable'
  }
  properties: {
    administratorLogin: 'myadmin'
    administratorLoginPassword: adminPassword
    version: '16'
    storage: { storageSizeGB: 128 }
  }
}
