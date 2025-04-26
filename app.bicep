extension radius

@description('The ID of your Radius Environment. Automatically injected by the rad CLI.')
param environment string

@description('The ID of your Radius Application. Automatically injected by the rad CLI.')
param application string

param image string = 'vpittamp.azurecr.io/chat-frontend:0.1.1'

// Postgres container resource
resource db 'Applications.Core/containers@2023-10-01-preview' = {
  name: 'db'
  properties: {
    application: application
    container: {
      image: 'postgres:latest'
      env: {
        POSTGRES_USER: { value: 'postgres' }
        POSTGRES_PASSWORD: { value: 'postgres' }
        POSTGRES_DB: { value: 'postgres' }
      }
      ports: {
        db: {
          containerPort: 5432
          protocol: 'TCP'
        }
      }
    }
    extensions: [
      {
        kind: 'kubernetesMetadata'
        labels: {
          'team.contact.name': 'backend'
        }
      }
    ]
  }
}

resource frontend 'Applications.Core/containers@2023-10-01-preview' = {
  name: 'frontend'
  properties: {
    application: application
    container: {
      image: image
      env: {
        AZURE_RESOURCE_NAME: {
          valueFrom: {
            secretRef: {
              source: 'dapr-app-secrets'
              key: 'AZURE_RESOURCE_NAME'
            }
          }
        }
        ANTHROPIC_API_KEY: {
          valueFrom: {
            secretRef: {
              source: 'dapr-app-secrets'
              key: 'ANTHROPIC_API_KEY'
            }
          }
        }
        NODE_ENV: {
          valueFrom: {
            secretRef: {
              source: 'dapr-app-secrets'
              key: 'NODE_ENV'
            }
          }
        }
        AZURE_API_KEY: {
          valueFrom: {
            secretRef: {
              source: 'dapr-app-secrets'
              key: 'AZURE_API_KEY'
            }
          }
        }
        OPENAI_API_KEY: {
          valueFrom: {
            secretRef: {
              source: 'dapr-app-secrets'
              key: 'OPENAI_API_KEY'
            }
          }
        }
        NEXTAUTH_SECRET: {
          valueFrom: {
            secretRef: {
              source: 'dapr-app-secrets'
              key: 'NEXTAUTH_SECRET'
            }
          }
        }
        AUTH_TRUST_HOST: {
          valueFrom: {
            secretRef: {
              source: 'dapr-app-secrets'
              key: 'AUTH_TRUST_HOST'
            }
          }
        }
      }
      ports: {
        http: {
          containerPort: 3000
          protocol: 'TCP'
        }
      }
      imagePullPolicy: 'Always'
    }
    connections: {
      db: {
        source: db.id
      }
      secretstore: {
        source: secretstore.id
      }
      statestore: {
        source: statestore.id
      }
      configstore: {
        source: config.id
      }
    }
    extensions: [
      {
        kind: 'kubernetesMetadata'
        labels: {
          'team.contact.name': 'frontend'
        }
      }
      {
        kind: 'daprSidecar'
        appId: 'frontend'
        protocol: 'grpc'
      }
    ]
    runtimes: {
      kubernetes: {
        pod: {
          imagePullSecrets: [
            {
              name: 'acr-auth'
            }
          ]
        }
      }
    }
  }
}

resource statestore 'Applications.Dapr/stateStores@2023-10-01-preview' = {
  name: 'statestore'
  properties: {
    auth: {
      secretStore: secretstore.name
    }
    environment: environment
    application: application
    resourceProvisioning: 'manual'
    type: 'state.redis'
    metadata: {
      redisHost: {
        value: '${redis.properties.host}:${redis.properties.port}'
      }
    }
    version: 'v1'
  }
}

resource secretstore 'Applications.Dapr/secretStores@2023-10-01-preview' = {
  name: 'secretstore'
  properties: {
    environment: environment
    application: application
    resourceProvisioning: 'manual'
    type: 'configuration.redis'
    metadata: {
      redisHost: {
        value: '${redis.properties.host}:${redis.properties.port}'
      }
    }
    version: 'v1'
  }
}

resource redis 'Applications.Datastores/redisCaches@2023-10-01-preview'= {
  name: 'redis'
  properties: {
    environment: environment
    application: application
  }
}

resource config 'Applications.Dapr/configurationStores@2023-10-01-preview' = {
  name: 'configstore'
  properties: {
    environment: environment
    application: application
    resourceProvisioning: 'manual'
    type: 'configuration.redis'
    metadata: {
      redisHost: {
        value: '${redis.properties.host}:${redis.properties.port}'
      }
    }
    version: 'v1'
  }
}
