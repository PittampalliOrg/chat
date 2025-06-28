# Accessing the Flagd UI

## Current Working Methods:

### 1. Direct NodePort Access (No hosts file needed)
```bash
# The flagd UI is accessible at:
http://localhost:30080/feature

# This works because nginx-ingress controller is exposed on NodePort 30080
```

### 2. Using curl with Host header (No hosts file needed)
```bash
curl -H "Host: flagd.localtest.me" http://localhost:30080/feature
```

### 3. Port Forwarding (Alternative)
```bash
# Forward the service directly
kubectl port-forward -n nextjs svc/flagd-ui-nextjs 8080:80

# Then access at:
http://localhost:8080/feature
```

## To Enable Domain-based Access:

### Option 1: Add to /etc/hosts
```bash
# Run the provided script with sudo:
sudo ./add-flagd-host.sh

# Then access at:
http://flagd.localtest.me:30080/feature
```

### Option 2: Use Browser Extension
Install a browser extension like "Virtual Hosts" or "ModHeader" to add the Host header automatically.

## Quick Test Commands:

### Check if the service is running:
```bash
kubectl get pods -n nextjs | grep flagd
kubectl get svc -n nextjs flagd-ui-nextjs
```

### Test the endpoint:
```bash
# Test with curl
curl -H "Host: flagd.localtest.me" http://localhost:30080/feature

# Should return HTML content
```

## Feature Flag Management:

Once you access the UI, you can:
- View all feature flags in the cluster
- Toggle flags on/off
- Edit targeting rules
- See the raw YAML configuration
- Monitor flag evaluations

The UI automatically refreshes to show changes made to FeatureFlag CRDs.