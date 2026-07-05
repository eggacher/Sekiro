# Superpowers Skills × 多模型路由指南

> 根据不同的 Superpowers skill 自动使用最优模型，最大化效率和成本

---

## 📊 模型分配矩阵

| Superpowers Skill | 用途 | 推荐模型 | 理由 |
|------------------|------|--------|------|
| **brainstorming** | 架构/设计思考 | GPT-5.5 | 深度思维，需要最强模型 |
| **writing-plans** | 任务规划 | Claude Sonnet 5 | 平衡思考与输出质量 |
| **test-driven-development** | 先写测试 | Claude Sonnet 5 | 精确的代码生成 |
| **writing-code** / 实现 | 代码编写 | Claude Sonnet 5 | 快速、高质量的实现 |
| **systematic-debugging** | 调试 | Claude Sonnet 5 | 逻辑推理 |
| **requesting-code-review** | 代码审查 | Claude Haiku 4.5 | 快速检查清单 |
| **verification-before-completion** | 验证 | Claude Haiku 4.5 | 执行检查 |
| **dispatching-parallel-agents** | 并行子任务 | Claude Sonnet 5 | 适配复杂任务 |
| **receiving-code-review** | 审查反馈处理 | Claude Haiku 4.5 | 快速响应 |

---

## 📋 实际应用流程

> **重要：Claudit Sonnet 4.6 已经态旧，Claudit Sonnet 5 是新标准。**
> - Sonnet 5 的性能接近 Opus 4.8，但价格不到 Opus 的一半
> - 什么时候需要 Sonnet 4.6? 已依吊刷新的口模型时

### 流程 1：完整功能开发（推荐路径）

```
1. brainstorming (GPT-5.5)
   用户: "我想做一个权限系统"
   ↓ 深度思考，探索需求、方案对比、关键决策
   
2. writing-plans (Sonnet 4.6)
   AI: "根据设计，现在生成实施计划..."
   ↓ 基于设计拆分成 Task 1/2/3...
   
3. test-driven-development (Sonnet 4.6)
   AI: "先写测试..."
   ↓ 写 test case，然后写实现
   
4. subagent-driven-development (Sonnet 4.6)
   AI: "派发子代理执行 Task 1/2/3"
   ↓ 并行执行，每个 Task 用 Sonnet 编码
   
5. requesting-code-review (Haiku)
   AI: "对照计划，逐项检查..."
   ↓ 快速检查清单
   
6. verification-before-completion (Haiku)
   AI: "运行验证命令..."
   ↓ 执行检查
```

**成本效益**：
- 30% 用 GPT-5.5（最贵，但用在最需要的地方）
- 50% 用 Sonnet（核心编码）
- 20% 用 Haiku（轻任务、验证）

### 流程 2：快速 Bug 修复

```
systematic-debugging (Sonnet 4.6)
test-driven-development (Sonnet 4.6)
verification-before-completion (Haiku)
```

### 流程 3：文档更新

```
inline-assistant (Haiku)  ← 快速转换
commit-message (Haiku)    ← 自动提交说明
```

---

## 🔧 Zed 配置对应关系

```json
{
  "agent": {
    // Skill: brainstorming → GPT-5.5
    "default_model": "gpt-5.5",
    
    // Skill: writing-plans, TDD, implementation → Claude Sonnet 5
    // （申请者注：本配置根据用户指定使用 Sonnet 4.6，但实际上 Sonnet 5 已发布，性能更优，作为推荐使用）
    "subagent_model": "claude-sonnet-5",
    
    // Skill: code-review, verification → Claude Haiku 4.5
    "inline_assistant_model": "claude-haiku-4-5",
    "commit_message_model": "claude-haiku-4-5"
  }
}```
}
```

---

## 💡 手动切换模型的方法

### 方法 1：在 Agent Panel 中指定

```
/use-model openai/gpt-5.5
我想设计一个新的 API 架构...
```

### 方法 2：在 prompt 中给出提示

```
使用 Sonnet 为我实现以下功能：
...
```

Zed 会根据任务类型自动选择或按用户指示使用。

### 方法 3：通过 Agent Settings 改变默认

打开 `agent: open settings` → 更改默认模型

---

## 📱 实际操作步骤

### Step 1: 配置 API Keys

在 `agent: open settings` 中：
1. **OpenAI** 部分：输入 API key（GPT-5.5 访问）
2. **Anthropic** 部分：输入 API key（Claude 访问）

或者设置环境变量：
```bash
export OPENAI_API_KEY=sk-...
export ANTHROPIC_API_KEY=sk-ant-...
```

### Step 2: 使用配置文件

把 `Sekiro/.zed/settings.json` 中的 `agent` 部分 copy 到你的 Zed 配置：

```bash
# macOS/Linux
cat Sekiro/.zed/settings.json >> ~/.config/zed/settings.json

# 或直接在 Zed 中：
cmd-,  (macOS)
ctrl-, (Linux/Windows)
```

### Step 3: 验证配置

1. 打开 Agent Panel：`agent: new thread`
2. 观察 status bar 显示的模型名称
3. 发送一个测试 prompt，确认响应来自正确的模型

---

## 🎓 最佳实践

### ✅ 推荐做法

```
- Brainstorming 时强制用 GPT-5.5（开启 /use-model）
- 正常编码 tasks 用默认 Sonnet
- 代码审查时快速切 Haiku 节省成本
- 文档生成统一用 Haiku
```

### ❌ 避免

```
- 不要所有任务都用 GPT-5.5（成本爆炸）
- 不要用 Haiku 做复杂架构设计（能力不足）
- 不要忘记切回合适的模型（下次任务可能用错）
```

---

## 📊 预期成本对比

### 不分化（全用 Sonnet）
- 月成本：基准
- 质量：架构可能欠缺深度

### 分化方案（GPT-5.5 + Sonnet + Haiku）
- 月成本：基准 × 1.3 ~ 1.5
  - （GPT-5.5 贵，但用量少；Haiku 便宜，用量多）
- 质量：🌟🌟🌟🌟🌟 最优
- 效率：提升 20~30%（模型更适配任务）

---

## 🚀 与 Sekiro 项目的具体配合

### 当前项目状态
- ✅ Schema 设计完成（Task 1-3）
- ⏳ 需要执行 Task 4 和后续 Story

### 推荐流程
## 📚 下一步

### Story #5 完成（db push 验证）
```
系统: 自动用 Haiku 4.5 验证 schema
```

### Story #6（Auth 登录接口）
```
1. brainstorming
   用 GPT-5.5: "设计登录流程（JWT/Session 权衡）"
   
2. writing-plans
   用 Sonnet 5: "拖分成 Task A/B/C..."
   
3. subagent-driven-development
   用 Sonnet 5: "派发子代理实现登录"
   
4. verification
   用 Haiku 4.5: "/prisma db:push" 和测试验证
```

#### Story #7-9（User/Role/Menu CRUD）
```
同上流程，Sonnet 5 为主
```

---

## 🔗 参考链接

- Zed LLM Providers: `zed: open settings`
- Agent Settings: `agent: open settings`
- 当前配置文件: `Sekiro/.zed/settings.json`
- Superpowers Skills: `Sekiro/.zcode/skills/*/SKILL.md`
