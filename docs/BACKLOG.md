# Backlog(想法池)

> **定位**:低摩擦的"想法暂存区"。还没想清楚验收、不确定要不要做的,先记这里。
> **不是任务清单**——确定要做、想清楚验收了,再升级为 GitHub issue。
>
> 工作流:`想法 → BACKLOG.md → 成熟 → GitHub issue(带验收) → 动手`

---

## 📌 升级为 issue 的判断标准

一个 backlog 条目"成熟"了,当且仅当**三条都满足**:
1. ✅ 能用一句话说清"做完是什么样"(有验收标准)
2. ✅ 能对应到 SPEC/PRD 的某个章节(有溯源)
3. ✅ 排得上近期里程碑(不放进 issue 就会忘)

满足就剪贴到 GitHub issue,不满足就继续躺这里。

---

## 💡 想法列表

> 格式:`- [ ] 简述 | 为什么 | 可能关联`
> 不用写太正式,这里就是草稿区。

### 后端
- [ ] 接口限流用 NestJS 的 @Throttle 还是自研 Redis 计数?需要对比 | v0.5 要做限流,先调研 | SPEC §7 SEC-3
- [ ] 操作日志要不要存请求 body?可能含敏感数据 | 需要脱敏策略 | SPEC §3.3

### 前端
- [ ] 表格组件 CrudTable 的"分配角色"弹窗能否抽成通用 SchemaForm? | 复用价值大 | PRD F-COMP-02
- [ ] 暗色主题下 recharts 图表颜色对比度需调 | 体验问题 | 无

### 工程/DevOps
- [ ] 加 gitleaks pre-commit hook 防密钥泄漏 | 上次敏感检查时想到的 | 无
- [ ] CI 跑 typecheck + lint + build 三件套 | 基础质量门禁 | PRD F-OPS-03
- [ ] monorepo 用 changesets 管版本号? | 多包发版需要 | 无

### 产品/未来
- [ ] 多租户要不要做?做了所有表加 tenant_id,成本大 | SPEC OP-2 待决 | DOMAIN_MODEL §7.2 Q4


---

## 🗄️ 墓地区(放弃的想法,留档说明为什么不做)

> 避免"三个月后又想到同一个 idea,重新考虑一遍"。

- **代码生成器（Story #25）** | 已关闭
  - 原定位：根据数据库表自动生成 CRUD 前后端代码，号称"脚手架杀手锏"。
  - 放弃原因：Vibe Coding / AI 辅助开发已成为主流，AI 可根据 schema + prompt 直接生成符合项目规范的代码，更灵活且维护成本更低。手动维护模板化的代码生成器投入产出比不佳。
  - 替代方案：需要生成 CRUD 时，直接向 AI 提供 `docs/SPEC.md` + Prisma schema + 目标模块说明。

---

## 📊 与 GitHub issue 的关系

| 维度 | BACKLOG.md(本文件) | GitHub issue |
| --- | --- | --- |
| 定位 | 想法池,草稿 | 确定要做的任务 |
| 验收标准 | 不要求 | 必须 |
| 与代码关联 | 无 | commit 写 `closes #NN` |
| 进度跟踪 | 手动 | milestone/label/看板 |
| 适合 | 灵感、调研、待定 | 已规划、可执行 |

当前 GitHub 已建立的结构:
- **4 Epic**: #1 基础设施 / #2 v0.1 MVP / #3 v0.5 / #4 v1.0
- **5 Story**(v0.1): #5 DB / #6 Auth / #7 User / #8 Role / #9 Menu
- **3 Milestone**: v0.1 MVP / v0.5 生产就绪 / v1.0 GA
- **Label 体系**: epic/story/task · P0/P1/P2 · module/*

详见 [GitHub Issues](https://github.com/eggacher/Sekiro/issues)。
