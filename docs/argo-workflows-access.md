# Accessing the Argo Workflows UI

There are multiple ways to access the Argo Workflows UI in this development environment:

## Option 1: Direct NodePort Access

The Argo Workflows UI is exposed via a NodePort service on port 32746.

```bash
# Access via localhost (from within the dev container)
curl http://localhost:32746

# Access via the Kind control plane node IP
kubectl get nodes -o wide  # Get the internal IP
curl http://<INTERNAL_IP>:32746
```

## Option 2: Port-Forward with Domain Name

For a cleaner experience, you can use the provided script to set up port-forward and domain name access:

```bash
# Run the script to set up port-forward and hosts entry
sudo /workspace/scripts/argo-ui-access.sh

# Access via:
# - http://localhost:8080
# - http://argo.localtest.me:8080
```

When you're done, press `Ctrl+C` to stop the port-forward process.

## Option 3: Use the nginx Proxy with Host Header

If you want to use the domain with the standard port 80, you can access it through the nginx proxy:

```bash
# Get the proxy container's IP
PROXY_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' kind-nginx-proxy-rg4)

# Access via the proxy with Host header
curl -H "Host: argo.localtest.me" http://$PROXY_IP:80
```

## Troubleshooting

If you're having trouble accessing the Argo Workflows UI, try these steps:

1. Verify the Argo Workflows pods are running:
   ```bash
   kubectl get pods -n argo
   ```

2. Check the NodePort service configuration:
   ```bash
   kubectl get svc -n argo argo-workflows-server-nodeport
   ```

3. Check the nginx proxy configuration:
   ```bash
   docker exec kind-nginx-proxy-rg4 cat /etc/nginx/nginx.conf
   ```

4. If using WSL2, port binding on hosts may sometimes have issues. In that case, use the port-forward option described above.
