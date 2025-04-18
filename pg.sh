# 1. Run a temporary PostgreSQL container
docker run --name pg-temp -e POSTGRES_PASSWORD=password -d pgvector/pgvector:pg17

# 2. Wait a moment for it to initialize
sleep 5

# 3. Create a directory to store the config files
mkdir -p pg-default-configs

# 4. Copy the default config files from the container
docker cp pg-temp:/var/lib/postgresql/data/postgresql.conf pg-default-configs/
docker cp pg-temp:/var/lib/postgresql/data/pg_hba.conf pg-default-configs/
docker cp pg-temp:/var/lib/postgresql/data/pg_ident.conf pg-default-configs/

# 5. Clean up the temporary container
docker stop pg-temp
docker rm pg-temp