# Clear Online User Records (One-Time Cleanup) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Perform a targeted one-time cleanup of active online login session records in Redis (`sekiro-redis`) to log out all users.

**Architecture:** Use `redis-cli` in the local docker container to query and delete all session keys matching `sekiro:session:*`.

**Tech Stack:** Redis CLI, Docker

## Global Constraints

- Database: Local Redis container `sekiro-redis`
- Key Pattern: `sekiro:session:*`

---

### Task 1: Clean up Redis session keys

**Files:**
- Modify: None (This is a data-only operation)

**Interfaces:**
- Consumes: None
- Produces: None

- [ ] **Step 1: Verify current keys exist**

Run: `docker exec sekiro-redis redis-cli keys "sekiro:session:*"`
Expected: Prints a list of active session keys (e.g., `sekiro:session:0509f615-c21a-4950-8b26-23a19ab8531e` etc.).

- [ ] **Step 2: Execute targeted deletion command**

Run: `docker exec sekiro-redis sh -c 'redis-cli keys "sekiro:session:*" | xargs -r redis-cli del'`
Expected: Prints the number of keys deleted (e.g., `(integer) 3`).

- [ ] **Step 3: Verify keys are successfully deleted**

Run: `docker exec sekiro-redis redis-cli keys "sekiro:session:*"`
Expected: No keys returned (empty output).
