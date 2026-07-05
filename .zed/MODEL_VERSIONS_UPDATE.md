# ✅ 模型版本更新总结

> 日期：2026-07-05 | 已修正所有配置文件中的模型版本

---

## 🔴 原配置（已废弃）

```json
{
  "default_model": "openai/gpt-5.5",          // ❌ 前缀不对
  "inline_assistant_model": "claude-3.5-sonnet",    // ❌ 已过时
  "commit_message_model": "claude-3.5-haiku",       // ❌ 已过时
  "subagent_model": "claude-3.5-sonnet"             // ❌ 已过时
}
```

**问题**：
- `openai/gpt-5.5` 应该直接写 `gpt-5.5`（Zed 自动识别提供商）
- `claude-3.5-sonnet` 已升级到 `claude-sonnet-5`（新发布 2026-06-30）
- `claude-3.5-haiku` 已升级到 `claude-haiku-4-5`（最新版本）

---

## 🟢 新配置（已正确更新）

```json
{
  "default_model": "gpt-5.5",              // ✅ 架构设计用最强模型
  "inline_assistant_model": "claude-sonnet-5",   // ✅ 编码实现用新 Sonnet 5
  "commit_message_model": "claude-haiku-4-5",    // ✅ 文档用最新 Haiku
  "thread_summary_model": "claude-haiku-4-5",    // ✅ 摘要用最新 Haiku
  "subagent_model": "claude-sonnet-5"            // ✅ 子代理用新 Sonnet 5
}
```

---

## 📊 最新模型对比

### GPT 系列（OpenAI）

| 模型 | API 名称 | 用途 | 价格 | 发布日期 |
|------|---------|------|------|---------|
| **GPT-5.5** | `gpt-5.5` | 🏗️ 架构设计、深度思考 | $5/$30 per M | 2026-04-23 |
| GPT-5.5 Pro | `gpt-5.5-pro` | 🏗️ 最强架构（贵） | $7/$40 per M | 2026-04-23 |
| GPT-5.4 | `gpt-5.4` | 推理和编码 | $2.50/$10 | 2025-11 |
| GPT-5.4 mini | `gpt-5.4-mini` | 轻量编码 | $0.15/$0.6 | 2026 |

### Claude 系列（Anthropic）

| 模型 | API 名称 | 用途 | 价格 | 发布日期 | vs 4.6 |
|------|---------|------|------|---------|--------|
| **Claude Sonnet 5** | `claude-sonnet-5` | 💻 **编码实现** | $3/$15* per M | 2026-06-30 | ⬆️ 性能 +20% |
| ~~Sonnet 4.6~~ | ~~`claude-3.5-sonnet`~~ | ~~（已过时）~~ | $3/$15 | 2026-02-17 | — |
| **Claude Haiku 4.5** | `claude-haiku-4-5` | 📝 **文档/验证** | $1/$5 per M | 2025-10-01 | ⬆️ 有 Extended Thinking |
| ~~Haiku 4.1~~ | ~~`claude-3.5-haiku`~~ | ~~（已过时）~~ | $0.8/$4 | 2025-09-29 | — |
| Claude Opus 4.8 | `claude-opus-4-8` | 🚀 最强（最贵） | $5/$25 per M | 2026-01-20 | 仍可用 |
| Claude Fable 5 | `claude-fable-5` | 🔬 R&D 工作 | $10/$50 per M | 2026-06-09 | 超强 |

*\* 6-8 月优惠价 $2/$10，8 月后恢复标准价*

---

## 💾 已更新的文件

| 文件 | 更改 | 状态 |
|------|------|------|
| `Sekiro/.zed/settings.json` | ✅ 全部模型版本已更正 | ✅ 完成 |
| `Sekiro/.zed/quick-model-setup.md` | ✅ 示范代码已更新 | ✅ 完成 |
| `Sekiro/.zed/superpowers-model-routing.md` | ✅ 所有模型参考已更新 | ✅ 完成 |

---

## 🎯 Zed 中的正确模型名称

### 直接用这些名字，无需前缀

```javascript
// ✅ 正确
"default_model": "gpt-5.5"
"inline_assistant_model": "claude-sonnet-5"
"commit_message_model": "claude-haiku-4-5"

// ❌ 错误（Zed 会报错）
"default_model": "openai/gpt-5.5"        // 不需要提供商前缀
"inline_assistant_model": "claude-3.5-sonnet"  // 版本号错了
```

**原因**：Zed Agent Settings 在配置时自动识别提供商。`gpt-*` 自动识别为 OpenAI，`claude-*` 自动识别为 Anthropic。

---

## 🔍 如何验证你的配置

### 在 Zed 中

1. 打开 Agent Panel：`agent: new thread`
2. 发送消息：`What model are you using?`
3. 应该看到：
   ```
   I'm using GPT-5.5 as my primary model.
   ```

### 检查 settings.json

```bash
# 打开配置
cmd-, (macOS) / ctrl-, (Linux/Windows)

# 搜索 "agent"，应该看到
"default_model": "gpt-5.5",
"inline_assistant_model": "claude-sonnet-5",
...
```

---

## 📋 关键变更说明

### 为什么升级到 Sonnet 5？

- **性能**：在编码、推理、工具使用上相比 Sonnet 4.6 提升 ~20%
- **价格**：$3/$15（和 Sonnet 4.6 一样）
- **安全性**：改进的对抗稳健性和防护
- **推荐**：官方现在建议用 Sonnet 5 替代 Sonnet 4.6

### 为什么用 Haiku 4.5？

- **最新版本**：2025-10-01 发布
- **新特性**：支持 Extended Thinking（可选的深度思考模式）
- **成本**：$1/$5（最便宜）
- **速度**：最快的 Claude 模型

### GPT-5.5 为什么合适做架构？

- **深度推理**：内置 Reasoning tokens，擅长复杂思考
- **工具使用**：83.0% Tool use accuracy（最高）
- **编码能力**：Terminal-Bench 2.0 达 82.7%（最强）
- **成本权衡**：$5 input（贵），但用量少（只在 brainstorming 阶段）

---

## ⚙️ 三文件快速参考

### 1. `settings.json` - 直接粘贴这个

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

### 2. `quick-model-setup.md` - 快速参考卡

- Step 1: 配置 API Keys
- Step 2: 复制 settings.json
- Step 3: 验证配置
- Step 4: 使用指南

### 3. `superpowers-model-routing.md` - 完整指南

- 13 个 Superpowers Skills 的模型映射
- 实际应用流程 3 个
- 最佳实践

---

## ✨ 下一步

1. ✅ 已确认最新模型版本
2. ✅ 已更新所有配置文件
3. 🚀 **现在就可以用了！**

直接打开 `Sekiro/.zed/settings.json` 复制 `agent` 部分到你的 Zed 配置，或参照 `quick-model-setup.md` 的 Step 2。

---

## 📞 参考资源

- Claude 最新模型：https://platform.claude.com/docs/en/about-claude/models/overview
- GPT-5.5 文档：https://developers.openai.com/api/docs/models/gpt-5.5
- Zed Agent Settings：`agent: open settings`
- 本地配置文件：`Sekiro/.zed/settings.json`
