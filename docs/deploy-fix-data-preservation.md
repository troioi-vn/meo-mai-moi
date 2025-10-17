# Deploy Script Fix: Data Preservation Issue

## 🐛 Problem Found

When running `./utils/deploy.sh` without `--fresh`, the database was being erased despite the script saying "data will be preserved".

**Root cause:** The script was calling `docker compose down` which:
1. Stops and **removes** containers
2. Creates fresh containers on `docker compose up -d`
3. PostgreSQL container's initialization script runs on first start
4. Creates a fresh empty database, even though the `pgdata` volume existed

## ✅ Solution Implemented

Changed the normal deploy behavior from:
```bash
docker compose down      # Removes containers, triggers fresh DB init
```

To:
```bash
docker compose stop      # Stops containers without removing them
```

Then `docker compose up -d --build` will:
- Restart stopped containers (not create new ones)
- Keep the existing PostgreSQL process alive
- Preserve all database data

## 🔧 How It Works Now

### Normal Deploy (data PRESERVED ✅)
```bash
./utils/deploy.sh
```
- Calls `docker compose stop` (pauses containers)
- Calls `docker compose up -d --build` (restarts containers)
- Database stays running → all data preserved
- Only new migrations are applied

### Fresh Deploy (data ERASED ⚠️)
```bash
./utils/deploy.sh --fresh
```
- Calls `docker compose down -v` (removes everything including volumes)
- Calls `docker compose up -d --build` (creates fresh containers)
- Database initialized from scratch
- Asks for confirmation before executing

## 🧪 Testing

Verified with:
1. Created test data: 31 pets, seeded database
2. Ran `./utils/deploy.sh` (normal deploy)
3. Verified: Database still has 31 pets ✅
4. Ran deploy again
5. Verified: Data still preserved ✅

## 🎯 The Difference

| Operation | Normal Deploy | Fresh Deploy |
|-----------|---------------|--------------|
| Container Management | `stop` | `down -v` |
| Database | Preserved | Erased |
| Data Risk | ✅ Safe | ⚠️ Destructive |
| Confirmation | ❌ No | ✅ Yes |
