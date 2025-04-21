extension radius

@description('AKS Workload Identity issuer URL')
param oidcIssuer  string = 'https://eastus.oic.prod-aks.azure.com/0c4da9c5-40ea-4e7d-9c7a-e7308d4f8e38/5898faec-c53c-4cca-af70-caa1a71ebbd4/'
param location    string = resourceGroup().location
@description('Existing Key Vault name')
param keyVaultName string = 'qs-ygl2zollxkbc6'

@secure()
param adminPassword string
param appName string = 'chat'
param image   string = 'vpittamp.azurecr.io/chat-frontend:0.0.5'

@description('Client‑ID of the Entra ID app used for Workload Identity')
param clientId string = '01b7cf4a-4d35-45c3-861a-8210dab19a60'   // ★ updated                       // same tenant

//───────────────── Radius environment ─────────────────
resource environment 'Applications.Core/environments@2023-10-01-preview' = {
  name: 'azure'
  properties: {
    compute: {
      kind: 'kubernetes'
      resourceId: 'self'
      namespace:  'azure'
      identity: { kind: 'azure.com.workload', oidcIssuer: oidcIssuer }
    }
    providers: { azure: { scope: resourceGroup().id } }
  }
}

//───────────────── Radius application ─────────────────
resource application 'Applications.Core/applications@2023-10-01-preview' = {
  name: appName
  properties: { environment: environment.id }
}

//───────────────── Generic SecretStore (K8s secret) ─────────────────
resource envsecrets 'Applications.Core/secretStores@2023-10-01-preview' = {
  name: 'envsecrets'
  properties: {
    application: application.id
    // resource:  (omit – Radius will infer "<env>-<app>/envsecrets")
    data: {
      POSTGRES_URL:      {}
      ANTHROPIC_API_KEY: {}
      AZURE_API_KEY:     {}
      OPENAI_API_KEY:    {}
      NEXTAUTH_SECRET:   {}
    }
  }
}

//───────────────── Dapr‑Key Vault SecretStore ─────────────────
resource kvDapr 'Applications.Dapr/secretStores@2023-10-01-preview' = {
  name: 'kvstore'
  properties: {
    application:          application.id
    environment:          environment.id
    type:                 'secretstores.azure.keyvault'
    version:              'v1'
  }
}

//───────────────── PostgreSQL flexible‑server ─────────────────
resource postgresServer 'Microsoft.DBforPostgreSQL/flexibleServers@2021-06-01' = {
  name: 'qs-${uniqueString(resourceGroup().id)}'
  location: location
  sku: { name: 'Standard_B1ms', tier: 'Burstable' }
  properties: {
    administratorLogin: 'myadmin'
    administratorLoginPassword: adminPassword
    version: '16'
    storage: { storageSizeGB: 128 }
  }
}

//───────────────── Front‑end container ─────────────────
resource web 'Applications.Core/containers@2023-10-01-preview' = {
  name: '${appName}-frontend'
  properties: {
    application: application.id
    environment: environment.id
    container: {
      image: image
      imagePullPolicy: 'Always'
      ports: { web: { containerPort: 3000 } }
      env: {
        POSTGRES_URL:      { valueFrom: { secretRef: { source: envsecrets.id, key: 'POSTGRES_URL' } } }
        AZURE_API_KEY:     { valueFrom: { secretRef: { source: envsecrets.id, key: 'AZURE_API_KEY' } } }
        ANTHROPIC_API_KEY: { valueFrom: { secretRef: { source: envsecrets.id, key: 'ANTHROPIC_API_KEY' } } }
        OPENAI_API_KEY:    { valueFrom: { secretRef: { source: envsecrets.id, key: 'OPENAI_API_KEY' } } }
        NEXTAUTH_SECRET:   { valueFrom: { secretRef: { source: envsecrets.id, key: 'NEXTAUTH_SECRET' } } }
        AUTH_TRUST_HOST:   { value: 'true' }
        AZURE_CLIENT_ID:   { value: clientId }
      }
      livenessProbe:  { kind: 'httpGet', path: '/api/health', containerPort: 3000 }
      readinessProbe: { kind: 'httpGet', path: '/api/health', containerPort: 3000 }
    }
    connections: {
      db:         { source: postgresServer.id }
      envsecrets: { source: envsecrets.id }
      kvstore:    { source: kvDapr.id }
    }
    extensions: [
      { kind: 'daprSidecar', appId: 'frontend', appPort: 3000, protocol: 'http' }
    ]
  }
}
