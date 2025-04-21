extension radius

param application string
param environment string
param image string = 'vpittamp.azurecr.io/chat-frontend:0.0.6'

resource frontend 'Applications.Core/containers@2023-10-01-preview' = {
  name: 'frontend'
  properties: {
    application: application
    environment: environment
    container: {
      image: image
      ports: {
        web: {
          containerPort: 3000
        }
      }
      livenessProbe: {
        kind: 'httpGet'
        containerPort: 3000
        path: '/healthz'
        initialDelaySeconds: 10
      }
      env: {
        POSTGRES_URL:      { value: 'postgres://postgres:postgres@postgresql:5432/postgres' }
        AZURE_API_KEY:     { value: '' }
        ANTHROPIC_API_KEY: { value: '' }
        OPENAI_API_KEY:    { value: '' }
        NEXTAUTH_SECRET:   { value: '' }
        AUTH_TRUST_HOST:   { value: 'true' }
        AZURE_RESOURCE_NAME: { value: 'daprazureopenai' }
      }
    }
    extensions: [
      {
        kind: 'daprSidecar'
        appId: 'frontend'
      }
    ]
    connections: {
      statestore:       { source: statestore.id }
      localsecretstore: { source: secrets.id }
      postgresql:       { source: postgresql.id }
    }
  }
}

resource statestore 'Applications.Dapr/stateStores@2023-10-01-preview' = {
  name: 'statestore'
  properties: {
    application: application
    environment: environment
  }
}

resource secrets 'Applications.Core/secretStores@2023-10-01-preview' = {
  name: 'secretstore'
  properties: {
    application: application
    environment: environment
    type: 'generic'
    data: {
      POSTGRES_URL:      { value: 'postgres://postgres:postgres@db:5432/postgres' }
      AZURE_API_KEY:     { value: '' }
      ANTHROPIC_API_KEY: { value: '' }
      OPENAI_API_KEY:    { value: '' }
      NEXTAUTH_SECRET:   { value: '' }
      AUTH_TRUST_HOST:   { value: 'true' }
    }
  }
}

resource secretstore 'Applications.Dapr/secretStores@2023-10-01-preview' = {
  name: 'localsecretstore'
  properties: {
    application: application
    environment: environment
  }
}

resource postgresql 'Applications.Core/containers@2023-10-01-preview' = {
  name: 'postgresql'
  properties: {
    application: application
    environment: environment
    container: {
      image: 'postgres:latest'
      ports: {
        db: {
          containerPort: 5432
        }
      }
      env: {
        POSTGRES_USER:     { value: 'postgres' }
        POSTGRES_PASSWORD: { value: 'postgres' }
        POSTGRES_DB:       { value: 'postgres' }
      }
      volumes: {
        migrations: {
          kind: 'ephemeral'
          managedStore: 'disk'
          mountPath: '/docker-entrypoint-initdb.d'
        }
      }
    }
    connections: {
      statestore:       { source: statestore.id }
      localsecretstore: { source: secrets.id }
    }
  }
}
