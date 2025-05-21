# Argo Workflows in the Development Environment

This document describes how to use Argo Workflows in the development environment.

## Accessing the Argo Workflows UI

There are several ways to access the Argo Workflows UI:

### Option 1: Use the make target

The easiest way to access the Argo Workflows UI is to use the `argo-ui` make target:

```bash
make argo-ui
```

This will set up a port-forward to the Argo Workflows UI and display the URLs you can use to access it.

### Option 2: Use the dedicated script

You can also use the dedicated script to access the Argo Workflows UI:

```bash
/workspace/scripts/access-argo-ui.sh
```

This script will run the port-forward in the foreground and maintain it until you press Ctrl+C.

### Option 3: Direct NodePort access

You can also access the Argo Workflows UI directly via the NodePort service:

```bash
# Access via localhost (from within the dev container)
curl http://localhost:32746

# Access via the Kind control plane node IP
kubectl get nodes -o wide  # Get the internal IP
curl http://<INTERNAL_IP>:32746
```

### Option 4: Domain name access

If you've set up the port-forward using one of the methods above, you can access the Argo Workflows UI using the domain name:

```bash
# Access via the domain name (requires port-forward to be running)
http://argo.localtest.me:8080
```

## Working with Argo Workflows

For more information on using Argo Workflows, see the [official documentation](https://argoproj.github.io/argo-workflows/).

### Submitting workflows

To submit a workflow:

```bash
kubectl apply -f /workspace/resources/dagger-workflow/dagger-workflow.yaml
```

### Viewing workflow logs

To view the logs of a workflow:

```bash
kubectl logs -n argo -l app=<workflow-name> -f
```

### Managing workflows

To list all workflows:

```bash
kubectl get workflows -n argo
```

To delete a workflow:

```bash
kubectl delete workflow -n argo <workflow-name>
```

## Troubleshooting

If you're having trouble accessing the Argo Workflows UI, see the detailed [troubleshooting guide](/workspace/docs/argo-workflows-access.md).
