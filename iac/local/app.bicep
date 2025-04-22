// Import the set of Radius resource types
// (Applications.Core, Applications.Dapr, etc.)
extension radius

@description('The environment ID to deploy the application and its resourcs into. Passed in automatically by the rad CLI.')
param environment string

@description('FQDN served by the gateway')
param fqdn string = 'chat.pittampalli.com'

// @description('Base‑64‑encoded TLS cert (PEM)')
// @secure()
// param tlscrt string

// @description('Base‑64‑encoded TLS private key (PEM)')
// @secure()
// param tlskey string


resource application 'Applications.Core/applications@2023-10-01-preview' = {
  name: 'chat'
  properties: {
    environment: environment
  }
}

resource frontend 'Applications.Core/containers@2023-10-01-preview' = {
  name: 'frontend'
  properties: {
    application: application.id
    container: {
      image: 'vpittamp.azurecr.io/chat-frontend:0.0.8'
      ports: {
        web: {
          containerPort: 3000
        }
      }
      env: {
        POSTGRES_URL: { value: 'postgres://postgres:postgres@postgresql:5432/postgres' }
        AZURE_API_KEY: { value: '' }
        ANTHROPIC_API_KEY: {
          value: ''
        }
        OPENAI_API_KEY: {
          value: ''
        }
        NEXTAUTH_SECRET: { value: '' }
        AUTH_TRUST_HOST: { value: 'true' }
        AZURE_RESOURCE_NAME: { value: 'daprazureopenai' }
      }
    }
    
    connections: {
      statestore: {
        source: statestore.id
      }
      postgresql: {
        source: postgresql.id
      }
    }
    extensions: [
      {
        kind: 'daprSidecar'
        appId: 'frontend'
      }
    ]
  }
}

resource statestore 'Applications.Dapr/stateStores@2023-10-01-preview' = {
  name: 'statestore'
  properties: {
    environment: environment
    application: application.id
  }
}

resource postgresql 'Applications.Core/containers@2023-10-01-preview' = {
  name: 'postgresql'
  properties: {
    application: application.id
    container: {
      image: 'postgres:latest'
      ports: {
        db: {
          containerPort: 5432
        }
      }
      env: {
        POSTGRES_USER: { value: 'postgres' }
        POSTGRES_PASSWORD: { value: 'postgres' }
        POSTGRES_DB: { value: 'postgres' }
      }
      volumes: {
        migrations: {
          kind: 'ephemeral'
          managedStore: 'disk'
          mountPath: '/docker-entrypoint-initdb.d'
        }
      }
    }
  }
}

resource gateway 'Applications.Core/gateways@2023-10-01-preview' = {
  name: 'gateway'
  properties: {
    application: application.id
    hostname: { prefix: '401k' }
    routes: [
      {
        path: '/'
        destination: 'http://${frontend.name}:3000'
      }
    ]
  }
}

resource secretstore 'Applications.Dapr/secretStores@2023-10-01-preview' = {
  name: 'secretstore'
  properties: {
    environment: environment
    application: application.id
  }
}
