#!/bin/bash
# filepath: /workspace/resources/dagger-workflow/update-nginx-config.sh

# Copy the new config into the container
docker cp /workspace/resources/dagger-workflow/nginx-http-config.conf 1e9640b8343ff67167fba5dbfbb18206add8e78576d83f8aceefd88cf47b9fe0:/etc/nginx/nginx.conf

# Test the nginx configuration
docker exec 1e9640b8343ff67167fba5dbfbb18206add8e78576d83f8aceefd88cf47b9fe0 nginx -t

# If the test is successful, reload nginx
if [ $? -eq 0 ]; then
  echo "Nginx configuration is valid. Reloading nginx..."
  docker exec 1e9640b8343ff67167fba5dbfbb18206add8e78576d83f8aceefd88cf47b9fe0 nginx -s reload
else
  echo "Nginx configuration is invalid. Please check the configuration and try again."
fi
