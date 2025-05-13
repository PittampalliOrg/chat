# produces a Secret that Argo CD recognises
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: github-repo-credentials
  namespace: argocd
spec:
  refreshInterval: 15m
  target:
    name: github-repo-credentials
    creationPolicy: Owner
    template:
      type: kubernetes.io/basic-auth
      metadata:
        labels:
          argocd.argoproj.io/secret-type: repository
      engineVersion: v2
      data:
        username: "x-access-token"
        password: "{{ .token }}"
  dataFrom:
  - sourceRef:
      generatorRef:
        apiVersion: generators.external-secrets.io/v1alpha1
        kind: GithubAccessToken
        name: github-auth-token
