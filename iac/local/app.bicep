extension radius

param image string = 'vpittamp.azurecr.io/chat-frontend:0.1.1'
param environment string
@description('Specifies the OIDC issuer URL')
param oidcIssuer string = 'https://eastus.oic.prod-aks.azure.com/0c4da9c5-40ea-4e7d-9c7a-e7308d4f8e38/a9bf2b89-5594-4bfb-a159-03516d161dbb/'
// param tenantId string = '0c4da9c5-40ea-4e7d-9c7a-e7308d4f8e38'
// param subscriptionId string = 'fa5b32b6-1d6d-4110-bea2-8ac0e3126a38'

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
      image: image
      ports: {
        web: {
          containerPort: 3000
        }
      }
      env: {
        AUTH_TRUST_HOST: {
          value: 'true'
        }
        NEXTAUTH_SECRET: {
          value: 'v0dZ03G4ECmMYMA4/Ht32mBeV1XR4znOTDffnyKxF5o='
        }
      }
    }
    connections: {
      postgresql: {
        source: postgresql.id
      }
    }
  }
}

resource postgresql 'Microsoft.DBforMySQL/flexibleServers@2024-10-01-preview' = {
  name: 'postgresql'
  properties: {
    dataEncryption:
  }
}

resource gateway 'Applications.Core/gateways@2023-10-01-preview' = {
  name: 'gateway'
  properties: {
    application: application.id
    hostname: { prefix: '401k' }
    routes: [
      {
        path: '/chat'
        destination: 'http://${frontend.name}:3000'
      }
      // {
      //   path: '/demo'
      //   destination: 'http://${demo.name}:3000'
      // }
    ]
  }
}

// param demoimage string = 'ghcr.io/radius-project/samples/demo:latest'

// resource demo 'Applications.Core/containers@2023-10-01-preview' = {
//   name: 'demo'
//   properties: {
//     application: application.id
//     container: {
//       image: demoimage
//       ports: {
//         web: {
//           containerPort: 3000
//         }
//       }
//       livenessProbe: {
//         kind: 'httpGet'
//         containerPort: 3000
//         path: '/healthz'
//         initialDelaySeconds: 10
//       }
//     }
//     extensions: [
//       {
//         kind: 'daprSidecar'
//         appId: 'demo'
//       }
//     ]
//     // connections: {
//     //   statestore: {
//     //     source: statestore.id
//     //   }
//     // }
//   }
// }

// resource statestore 'Applications.Dapr/stateStores@2023-10-01-preview' = {
//   name: 'statestore'
//   properties: {
//     application: application.id
//     environment: environment.id
//   }
// }
