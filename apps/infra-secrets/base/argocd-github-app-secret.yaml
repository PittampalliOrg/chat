spec:
  refreshInterval: 1h
  secretStoreRef:
    kind: ClusterSecretStore
    name: azure-keyvault-store
  target:
    name: github-app-creds
    creationPolicy: Owner
    template:
      type: Opaque
      metadata:
        labels:
          argocd.argoproj.io/secret-type: repository
      data:
        url: https://github.com/PittampalliOrg/chat.git
        type: git
        githubAppID: "1272071"
        githubAppInstallationID: "66754705"
  data:
    - secretKey: githubAppPrivateKey
      remoteRef:
        key: ARGOVP-PEM 
