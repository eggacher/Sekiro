# ⚡ Zed 多模型配置 - 快速设置

> 3 分钟完成设置 | 架构用 GPT-5.5 | 编码用 Sonnet 4.6 | 文档用 Haiku

---

## 🚀 第 1 步：配置 API Keys

### 打开 Agent Settings
```
cmd-shift-p (macOS) 或 ctrl-shift-p (Linux/Windows)
输入: agent: open settings
```

### 配置 OpenAI（GPT-5.5）

1. 点击 **LLM Providers** → **OpenAI**
2. 选择 **Use API Access**
3. 输入你的 OpenAI API Key
4. 选择模型：**gpt-5.5**（或最新可用模型）

### 配置 Anthropic（Claude Sonnet / Haiku）

1. 点击 **LLM Providers** → **Anthropic**
2. 选择 **Use API Access**
3. 输入你的 Anthropic API Key
4. 系统自动支持 Claude 3.5 Sonnet 和 Haiku

---

## 🎯 第 2 步：配置 settings.json

### 快速方式：复制粘贴

打开你的 Zed settings：
```
cmd-, (macOS) / ctrl-, (Linux/Windows)
```

找到 `"agent"` 部分，替换为：

```json
{
  "agent": {
    "default_model": "gpt-5.5",
    "inline_assistant_model": "claude-sonnet-5",
    "commit_message_model": "claude-haiku-4-5",
    "thread_summary_model": "claude-haiku-4-5",
    "subagent_model": "claude-sonnet-5",
    "commit_message_instructions": "使用 Conventional Commits 格式，50 字以内",
    "auto_compact": {
      "enabled": true,
      "threshold": "85%"
    }
  }
}```
}
```

### 完整配置（如果没有 agent 部分）

复制整个块到 `settings.json`：

```json
{
  "agent": {
    "default_model": "gpt-5.5",
    "inline_assistant_model": "claude-sonnet-5",
    "commit_message_model": "claude-haiku-4-5",
    "thread_summary_model": "claude-haiku-4-5",
    "subagent_model": "claude-sonnet-5",
    "commit_message_instructions": "简洁，Conventional Commits，≤50 字",
    "auto_compact": {
      "enabled": true,
      "threshold": "85%"
    },
    "tool_permissions": {
      "run_commands": true,
      "file_edit": true
    }
  }
}```
}
```

---

## ✅ 第 3 步：验证配置

### 打开 Agent Panel
```
cmd-shift-k (macOS) / ctrl-shift-k (Linux/Windows)
或点击右下角的 ✨ 图标
```

### 发送测试消息

在 Agent Panel 输入：
```
Hi, what model are you using right now?
```

应该看到回复说是 **GPT-5.5**。

---

## 🎮 第 4 步：使用指南

### 架构设计（自动用 GPT-5.5）

```
我想为 Sekiro 设计一个权限系统...
```
→ 自动使用 GPT-5.5（因为 default_model）

### 编码任务（自动用 Sonnet 4.6）

Inline Assistant：
```
选中代码 → cmd-k → "优化这个函数"
```
→ 自动使用 Sonnet（inline_assistant_model）

### 子任务执行

在 Agent Panel 使用 Superpowers：
```
/subagent-driven-development
根据计划执行 Task 1...
```
→ 自动派发子代理用 Sonnet（subagent_model）

### 提交消息生成（自动用 Haiku）

```
git add .
ctrl-enter / cmd-enter (生成提交消息)
```
→ 自动用 Haiku（commit_message_model）

---

## 🔀 手动切换模型

如果想临时用不同模型：

### 方法 1：显式指定

在 Agent Panel 输入：
```
/use-model openai/gpt-5.5
现在设计一个新模块的架构...
```

### 方法 2：通过 prompt 提示

```
用你最强的能力设计一下...
```

AI 会自动识别是架构任务，可能建议切换。

### 方法 3：改默认模型

```
agent: open settings → 改 default_model
```

---

## 📊 模型速查表

| 场景 | 用什么 | 命令 |
|------|--------|------|
| 🏗️ 架构设计 | GPT-5.5 | （默认）开始对话 |
| 💻 代码编写 | Sonnet 5 | Inline Assistant 或 Agent Panel |
| 📝 提交消息 | Haiku 4.5 | Git → Generate Commit Message |
| 🔍 代码审查 | Haiku 4.5 | 选代码 → `cmd-k` → 审查 |
| 🧪 测试编写 | Sonnet 5 | Agent Panel + TDD skill |
| 🐛 调试 | Sonnet 5 | Agent Panel + Systematic Debugging |
| 📚 文档 | Haiku 4.5 | Inline Assistant |

---

## 💰 成本预估（月度）

假设每个工作日 8 小时开发：

- **GPT-5.5**：每月 ~$60-120（用在架构设计，$5/$30 per M tokens）
- **Sonnet 5**：每月 ~$20-40（编码和复杂任务，$3/$15 per M tokens，6/30优惠价格）
- **Haiku 4.5**：每月 ~$5-15（轻任务，$1/$5 per M tokens）

**总计**：每月 ~$75-150（取决于使用频率）

相比全用 GPT-4 或 Claude 3 Opus，**成本降低 40%** 同时 **质量提升**。

---

## ⚠️ 常见问题

### Q1: 模型名称不对怎么办？

检查：
1. 你有没有访问权限（比如 GPT-5.5 可能需要特定的付费等级）
2. 模型名称是否正确，可以在 Agent Settings 中查看可用的确切名称

替代方案（如果 GPT-5.5 不可用）：
- 用 `gpt-5.4`（更便宜的推理模型）
- 用 `gpt-4o`（非推理，但快速）
- 用 `claude-opus-4-8`（最强的 Claude，比 Sonnet 5 更贵）

### Q2: 配置后没有生效

尝试：
1. 重启 Zed（`cmd-q` + 重新打开）
2. 检查 `agent: open settings` 中的 API key 是否正确
3. 查看 Zed 日志（Help → Open Logs）

### Q3: 怎样切换默认模型？

```
agent: open settings → 改 default_model
或直接改 settings.json 中的 agent.default_model
```

### Q4: 子代理执行时怎样用不同模型？

```json
{
  "agent": {
    "subagent_model": "claude-3.5-sonnet"
  }
}
```

子代理会自动用 Sonnet。

---

## 🎯 下一步

1. ✅ 配置 API Keys（第 1 步）
2. ✅ 复制 settings.json（第 2 步）
3. ✅ 验证配置（第 3 步）
4. 🚀 开始用 Superpowers 开发！

---

## 📞 需要帮助？

- Zed Docs: https://zed.dev/docs
- Agent Settings: `agent: open settings`
- 我的 Superpowers 配置: `Sekiro/.zed/superpowers-model-routing.md`
