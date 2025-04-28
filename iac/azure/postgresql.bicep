@description('Radius‑injected metadata')
param context object

@description('Admin username (cannot be postgres)')
param adminUsername string = 'postgres'

@secure()
@description('Admin password')
param adminPassword string

@description('PostgreSQL major version')
@allowed([
  '13'
  '14'
  '15'
  '16'
])
param serverVersion string = '16'

param storageGB int    = 32
param skuName   string = 'Standard_B1ms'
@allowed([
  'Burstable'
  'GeneralPurpose'
  'MemoryOptimized'
])
param skuTier   string = 'Burstable'

// ─── helper vars ─────────────────────────────────────────────
var uniqueSuffix = uniqueString('${context.resource.id}-${context.environment.name}')
var serverName   = 'pg-${uniqueSuffix}'
var fqdn         = '${serverName}.postgres.database.azure.com'
var connString   = 'postgresql://${adminUsername}:${adminPassword}@${fqdn}:5432/postgres'

// ─── Flexible Server ─────────────────────────────────────────
resource pg 'Microsoft.DBforPostgreSQL/flexibleServers@2021-06-01-preview' = {
  name:   serverName
  location: context.environment.location
  sku: {
    name: skuName
    tier: skuTier
  }
  properties: {
    version: serverVersion
    administratorLogin: adminUsername
    administratorLoginPassword: adminPassword
    storage: { storageSizeGB: storageGB }
    backup:  { backupRetentionDays: 7, geoRedundantBackup: 'Disabled' }
    highAvailability: { mode: 'Disabled' }
    network: {}   // public access; swap with delegated subnet for VNet
  }
}

// ─── Recipe result ───────────────────────────────────────────
@description('Values, secrets and resource IDs returned to the caller')
output result object = {
  values: {
    host: fqdn
    port: 5432
    username: adminUsername
  }
  #disable-next-line outputs-should-not-contain-secrets
  secrets: {
    password: adminPassword
    connectionString: connString
  }
  resources: [
    pg.id
  ]
}
