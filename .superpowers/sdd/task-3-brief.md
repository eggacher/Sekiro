## Task 3: Internationalize Dashboard

**Files:**
- Modify: `apps/web/app/(dashboard)/page.tsx`

**Interfaces:**
- Consumes: `useTranslation`
- Produces: dashboard strings via `t()`

- [ ] **Step 1: Read file and identify hardcoded strings**

```bash
cat apps/web/app/(dashboard)/page.tsx
```

- [ ] **Step 2: Add missing keys to `zh/dashboard.ts` and `en/dashboard.ts`**

- [ ] **Step 3: Replace strings with `t()`**

For chart labels, pass values:
```tsx
{t("dashboard.revenueTrend")}
```

- [ ] **Step 4: Run typecheck and build**

```bash
pnpm typecheck
pnpm --filter @sekiro/web build
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/(dashboard)/page.tsx apps/web/lib/i18n/dictionaries/
git commit -m "feat(i18n): translate dashboard page"
```

---

