# Accessing the Grafana UI

There are multiple ways to access the Grafana UI in this development environment:

## Option 1: Domain-Based Access (Recommended)

The Grafana UI is configured with Ingress for domain-based access:

```bash
# Access via domain name (requires DNS or hosts file setup)
http://grafana.localtest.me
```

The domain `grafana.localtest.me` automatically resolves to 127.0.0.1, so no hosts file modification is needed.

## Option 2: Direct NodePort Access

The Grafana UI is exposed via a NodePort service on port 30001.

```bash
# Access via localhost (from within the dev container)
curl http://localhost:30001

# Access via the Kind control plane node IP
kubectl get nodes -o wide  # Get the internal IP
curl http://<INTERNAL_IP>:30001
```

## Option 3: Port-Forward with Domain Name

For a cleaner experience, you can use the provided script to set up port-forward and domain name access:

```bash
# Run the script to set up port-forward and hosts entry
sudo /workspace/scripts/access-grafana-ui.sh

# Access via:
# - http://localhost:3001
# - http://grafana.localtest.me:3001
```

When you're done, press `Ctrl+C` to stop the port-forward process.

## Option 4: Use the Make Target

You can use the provided Make target for quick access:

```bash
make grafana-ui
```

This will set up port-forwarding to access Grafana and provide you with the URLs.

## Option 5: Use the nginx Proxy with Host Header

If you want to use the domain with the standard port 80, you can access it through the nginx proxy:

```bash
# Get the proxy container's IP
PROXY_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' kind-nginx-proxy-rg4)

# Access via the proxy with Host header
curl -H "Host: grafana.localtest.me" http://$PROXY_IP:80
```

## Default Credentials

The default credentials for Grafana are:
- Username: `admin`
- Password: `prom-operator`

## Troubleshooting

If you're having trouble accessing the Grafana UI, try these steps:

1. Verify the Grafana pods are running:
   ```bash
   kubectl get pods -n monitoring | grep grafana
   ```

2. Check the NodePort service configuration:
   ```bash
   kubectl get svc -n monitoring grafana-nodeport
   ```

3. Check the Ingress configuration:
   ```bash
   kubectl get ingress -n monitoring
   ```

4. Check the nginx proxy configuration:
   ```bash
   docker exec kind-nginx-proxy-rg4 cat /etc/nginx/nginx.conf
   ```

5. If using WSL2, port binding on hosts may sometimes have issues. In that case, use the port-forward option described above.

## Accessing Dashboards

Once you're logged into Grafana, you can access the pre-configured dashboards by:

1. Click on "Dashboards" in the left sidebar
2. Choose "General" or other dashboard folders
3. Select one of the available Kubernetes or application dashboards
