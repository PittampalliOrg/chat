# Grafana Access Solution Summary

This document summarizes the current working solution for accessing the Grafana UI in our Kubernetes Kind cluster.

## Current Configuration

### 1. Domain-Based Access (Recommended)

The Grafana UI is accessible through the domain name:
```
http://grafana.localtest.me
```

This works because:
- We have a Grafana Ingress resource (`/workspace/resources/monitoring/grafana-ui-ingress.yaml`) that routes traffic from `grafana.localtest.me` to the `grafana` service.
- Our nginx proxy container (`kind-nginx-proxy-rg4`) has a configured virtual host for `grafana.localtest.me` in its nginx configuration.
- The domain `grafana.localtest.me` automatically resolves to `127.0.0.1` thanks to the `.localtest.me` wildcard DNS service.

### 2. NodePort Access

The Grafana UI is also accessible through a NodePort service:
```
http://localhost:30001
```

This works because:
- We have a NodePort service (`/workspace/resources/monitoring/grafana-nodeport.yaml`) that exposes the Grafana UI on port 30001.
- The nginx proxy forwards traffic from port 30001 to the Kubernetes cluster's NodePort.

### 3. Port-Forwarding Access

For convenience, we also have scripts to set up port-forwarding:
```
make grafana-ui
# or
./scripts/access-grafana-ui.sh
```

This sets up port-forwarding to access Grafana at `http://localhost:3001`.

## Key Components

1. **Ingress Resource**: `/workspace/resources/monitoring/grafana-ui-ingress.yaml`
2. **NodePort Service**: `/workspace/resources/monitoring/grafana-nodeport.yaml`
3. **NGINX Proxy Configuration**: `/workspace/scripts/kind-proxy.sh` includes the virtual host configuration for `grafana.localtest.me`
4. **Helper Scripts**: 
   - `/workspace/scripts/access-grafana-ui.sh` for port-forwarding setup
   - `/workspace/scripts/wi-kind-lib.sh` contains the `setup_grafana_ui_access()` function
5. **Makefile Target**: `make grafana-ui` for easy access

## Authentication

The default credentials for Grafana are:
- Username: `admin`
- Password: `prom-operator`

## Troubleshooting

If you're having trouble accessing Grafana:

1. Make sure the Grafana pods are running:
   ```
   kubectl get pods -n monitoring | grep grafana
   ```

2. Check that the Ingress is correctly configured:
   ```
   kubectl get ingress -n monitoring
   ```

3. Verify the NodePort service is correctly created:
   ```
   kubectl get svc -n monitoring grafana-nodeport
   ```

4. Check that the nginx proxy container is running:
   ```
   docker ps | grep kind-nginx-proxy
   ```

5. Try direct access through port-forwarding:
   ```
   kubectl port-forward -n monitoring svc/grafana 3001:80
   curl http://localhost:3001
   ```
