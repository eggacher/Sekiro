# 数据字典类型状态视觉标识实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在数据字典管理页面，为字典类型列表项和详情区头部添加明确的启用/停用状态视觉标识。

**Tech Stack:** React, Next.js, Tailwind CSS, TypeScript

## Global Constraints
- 所有操作必须在 `feature/dict-status-indicator` 工作区分支下进行。
- 界面风格需与 Shadcn UI 整体设计语言及系统现有 `StatusBadge` 高度一致。

---

### Task 1: 优化字典管理页面的字典类型状态视觉显示

**Files:**
- Modify: `apps/web/app/(dashboard)/system/dict/page.tsx`

**Interfaces:**
- Refers: `d.status`, `active.status`
- Renders: Badge, StatusBadge

- [ ] **Step 1: 修改左侧字典类型列表项渲染样式**

修改 `apps/web/app/(dashboard)/system/dict/page.tsx` 的左侧列表渲染部分（约 204-219 行），增加 `status === "disabled"` 的样式判定和 `[停用]` 徽章：
```typescript
                filteredTypes.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setActiveId(d.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors",
                      activeId === d.id ? "bg-primary/10 text-primary" : "hover:bg-accent",
                      d.status === "disabled" && "opacity-60"
                    )}
                  >
                    <BookMarked className={cn(
                      "h-4 w-4 shrink-0",
                      d.status === "disabled" ? "text-muted-foreground" : "text-primary"
                    )} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <div className="truncate font-medium">{d.name}</div>
                        {d.status === "disabled" && (
                          <Badge variant="outline" className="h-4 px-1 py-0 text-[10px] border-destructive/30 bg-destructive/5 text-destructive shrink-0 font-normal scale-90 origin-right">
                            {t("system.status.disabled")}
                          </Badge>
                        )}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">{d.code}</div>
                    </div>
                  </button>
                ))
```

- [ ] **Step 2: 修改右侧详情面板头部状态显示**

修改右侧面板头部标题区（约 235-238 行），在 `Badge` 旁引入 `<StatusBadge status={active.status} />`：
```typescript
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{active.name}</span>
                    <Badge variant="secondary" className="text-[10px]">{active.code}</Badge>
                    <StatusBadge status={active.status} />
                  </div>
```

- [ ] **Step 3: 运行类型检查验证**

Run: `pnpm typecheck`
Expected: 编译完全成功，无任何 TS 报错。

- [ ] **Step 4: 手动启动验证**

1. 启动服务并登录进入系统。
2. 打开“数据字典”页面，创建一个状态为“停用”的字典类型。
3. 检查左侧该类型的条目是否处于淡化（`opacity-60`）状态，且名称右侧是否有红色的 `[停用]` 徽章。
4. 点击该类型，查看详情页头部是否渲染了正确的 `StatusBadge`（红色“停用”）。
5. 将该类型编辑启用，查看状态是否同步变为正常的绿色“启用”标签且淡化样式消失。

- [ ] **Step 5: 提交代码**

```bash
git add apps/web/app/(dashboard)/system/dict/page.tsx
git commit -m "feat(web): add status visual indicators for dictionary types in dict page"
```
