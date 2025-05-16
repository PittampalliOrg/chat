apiVersion: generators.external-secrets.io/v1alpha1
kind: GithubAccessToken
metadata:
  name: github-auth-token
  namespace: argocd
spec:
  appID: "1272071"
  installID: "66754705"
  permissions:
    contents: read 
  auth:
    privateKey:
      secretRef: 
        name: kv-github-pem 
        key: key 
