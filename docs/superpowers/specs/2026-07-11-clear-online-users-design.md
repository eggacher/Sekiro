# Design Spec - Clear Online User Records (One-Time Cleanup)

## 1. Background & Purpose
The objective is to clear all active online logged-in user records from the system. Active user sessions are stored as key-value pairs in the Redis instance (`sekiro-redis`) running locally via Docker Compose. Clearing these records will effectively log out all active users.

## 2. Target Database & Key Pattern
- **Database**: Local Redis container `sekiro-redis`
- **Key Pattern**: `sekiro:session:*`
- **Current Active Sessions**: 3 keys detected.

## 3. Selected Approach
We use targeted key deletion to ensure safety, avoiding destructive commands like `FLUSHALL` or `FLUSHDB` that would erase unrelated cached data or configuration keys.

### Command Execution
```bash
docker exec sekiro-redis sh -c 'redis-cli keys "sekiro:session:*" | xargs -r redis-cli del'
```

- `redis-cli keys "sekiro:session:*"`: Retrieves all keys matching the session pattern.
- `xargs -r redis-cli del`: Pass the list of retrieved keys to the delete command. `-r` (or `--no-run-if-empty`) prevents executing the command if no matching keys are found.

## 4. Verification Plan
After executing the cleanup command, run:
```bash
docker exec sekiro-redis redis-cli keys "sekiro:session:*"
```
Expected output: No keys returned (empty output).
