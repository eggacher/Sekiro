# 🤖 Zed 多模型配置 - Sekiro 项目

> **架构设计用 GPT-5.5** | **编码用 Sonnet 5** | **文档用 Haiku 4.5**

---

## 📁 本目录文件说明

| 文件 | 用途 | 快速使用 |
|------|------|---------|
| **`settings.json`** | ✅ **直接用这个** | 复制内容到你的 Zed 配置 |
| `quick-model-setup.md` | 3 分钟快速开始 | 新手看这个 |
| `superpowers-model-routing.md` | 完整指南 + Superpowers 工作流 | 深入了解 |
| `MODEL_VERSIONS_UPDATE.md` | 模型版本信息 | 查询最新版本 |

---

## ⚡ 快速开始（30 秒）

### 1️⃣ 打开 Zed 配置
```
cmd-, (macOS) / ctrl-, (Linux/Windows)
```

### 2️⃣ 复制这个到 `settings.json`
```json
{
  "agent": {
    "default_model": "gpt-5.5",
    "inline_assistant_model": "claude-sonnet-5",
    "commit_message_model": "claude-haiku-4-5",
    "thread_summary_model": "claude-haiku-4-5",
    "subagent_model": "claude-sonnet-5",
    "commit_message_instructions": "简洁，Conventional Commits，≤50字",
    "auto_compact": {
      "enabled": true,
      "threshold": "85%"
    }
  }
}
```

### 3️⃣ 配置 API Keys
```
agent: open settings
→ LLM Providers → OpenAI / Anthropic
→ Use API Access → 输入 API Key
```

### 4️⃣ 验证
```
agent: new thread
发消息：What model are you using?
→ 应该说 GPT-5.5
```

---

## 🎯 模型分配

| 任务类型 | 模型 | 成本 | 用途 |
|---------|------|------|------|
| 🏗️ **架构设计** | GPT-5.5 | 💰💰💰 | brainstorming, 深度思考 |
| 💻 **代码编写** | Claude Sonnet 5 | 💰💰 | coding, TDD, 调试 |
| 📝 **文档/验证** | Claude Haiku 4.5 | 💰 | 提交消息, 审查, 验证 |

---

## 🔄 与 Superpowers Skills 配合

```
brainstorming (GPT-5.5)
  ↓ 深度设计
writing-plans (Sonnet 5)
  ↓ 规划任务
subagent-driven-development (Sonnet 5)
  ↓ 并行执行
verification-before-completion (Haiku 4.5)
  ↓ 快速验证
✅ 完成
```

详见 `superpowers-model-routing.md`

---

## 📊 模型对比

### 最新版本（2026-06-30）

```
┌─────────────────────┬──────────────┬─────────┐
│ 模型                 │ API 名称      │ 用途    │
├─────────────────────┼──────────────┼─────────┤
│ GPT-5.5             │ gpt-5.5      │ 架构    │
│ Claude Sonnet 5     │ claude-...5  │ 编码    │
│ Claude Haiku 4.5    │ claude-...45 │ 文档    │
└─────────────────────┴──────────────┴─────────┘
```

**不要用**：
- ❌ `claude-3.5-sonnet` (已过时，用 `claude-sonnet-5`)
- ❌ `claude-3.5-haiku` (已过时，用 `claude-haiku-4-5`)
- ❌ `openai/gpt-5.5` (无需前缀，直接 `gpt-5.5`)

---

## 🚀 常用命令

```bash
# 在 Zed 中

# 打开 Agent Panel
agent: new thread

# 打开 Agent Settings（配置 API Key）
agent: open settings

# 打开 Zed Settings（配置 agent 部分）
zed: open settings

# 强制用特定模型
/use-model gpt-5.5
现在设计一个新功能...
```

---

## 💡 最佳实践

### ✅ 推荐

```
✅ Brainstorming 时用 GPT-5.5（开启深度思考）
✅ 日常编码用 Sonnet 5（快速、高质量）
✅ 代码审查快速切 Haiku（节省成本）
✅ 文档生成统一用 Haiku（最便宜）
✅ 子任务并行执行用 Sonnet 5（平衡）
```

### ❌ 避免

```
❌ 所有任务都用 GPT-5.5（成本爆炸）
❌ 用 Haiku 做复杂架构设计（能力不足）
❌ 用错了模型版本号（API 会报错）
```

---

## 📚 更多信息

- **快速开始**：`quick-model-setup.md`（3 分钟教程）
- **完整指南**：`superpowers-model-routing.md`（包含工作流）
- **版本信息**：`MODEL_VERSIONS_UPDATE.md`（最新模型对比）
- **官方文档**：https://zed.dev/docs/ai
- **Agent Settings**：`agent: open settings`

---

## 💬 问题排查

### "模型名称不存在" 错误？

检查：
1. 是否最新版本？
   - Sonnet 4.6 → `claude-sonnet-5`（新）
   - Haiku → `claude-haiku-4-5`（新）
2. API Key 是否配置正确？
   - `agent: open settings` → LLM Providers

### "API 返回 401"？

```bash
# 检查环境变量
echo $OPENAI_API_KEY
echo $ANTHROPIC_API_KEY

# 或在 Agent Settings 中重新输入 API Key
```

### 切不了模型？

```
# 重启 Zed
cmd-q (macOS) / ctrl-q (Linux)

# 或者强制切换
/use-model gpt-5.5
你的 prompt...
```

---

## 📞 链接

- Zed 官网：https://zed.dev
- Claude 模型：https://platform.claude.com/docs/models
- GPT-5.5 文档：https://developers.openai.com/api/docs/models/gpt-5.5
- 当前配置：`Sekiro/.zed/settings.json`
- Superpowers Skills：`Sekiro/.zcode/skills/`

---

**状态**：✅ 所有配置已更新到最新模型版本（2026-06-30）

**最后更新**：2026-07-05
