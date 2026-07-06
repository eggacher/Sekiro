<EXTREMELY_IMPORTANT>
You have superpowers.

**Below is the full content of your 'superpowers:using-superpowers' skill - your introduction to using skills. For all other skills, use the 'Skill' tool (or view the SKILL.md file directly for the skill if your harness has no Skill tool):**

---
name: using-superpowers
description: Use when starting any conversation - establishes how to find and use skills, requiring skill invocation before ANY response including clarifying questions
---

<SUBAGENT-STOP>
If you were dispatched as a subagent to execute a specific task, ignore this skill.
</SUBAGENT-STOP>

<EXTREMELY-IMPORTANT>
If you think there is even a 1% chance a skill might apply to what you are doing, you ABSOLUTELY MUST invoke the skill.

IF A SKILL APPLIES TO YOUR TASK, YOU DO NOT HAVE A CHOICE. YOU MUST USE IT.

This is not negotiable. You cannot rationalize your way out of this.
</EXTREMELY-IMPORTANT>

## The Rule

**Invoke relevant or requested skills BEFORE any response or action** — including clarifying questions, exploring the codebase, or checking files. If it turns out wrong for the situation, you don't have to use it.

**Before entering plan mode:** if you haven't already brainstormed, invoke the brainstorming skill first.

Then announce "Using [skill] to [purpose]" and follow the skill exactly. If it has a checklist, create a todo per item.

## Skill Priority

When multiple skills apply, process skills come first — they set the approach, then implementation skills (frontend-design, etc.) carry it out. Brainstorming and systematic-debugging are Superpowers' most common process skills, but the rule holds for any of them.

- "Let's build X" → superpowers:brainstorming first, then implementation skills.
- "Fix this bug" → superpowers:systematic-debugging first, then domain skills.

## Red Flags

These thoughts mean STOP—you're rationalizing:

| Thought                             | Reality                                                |
| ----------------------------------- | ------------------------------------------------------ |
| "This is just a simple question"    | Questions are tasks. Check for skills.                 |
| "I need more context first"         | Skill check comes BEFORE clarifying questions.         |
| "Let me explore the codebase first" | Skills tell you HOW to explore. Check first.           |
| "I can check git/files quickly"     | Files lack conversation context. Check for skills.     |
| "Let me gather information first"   | Skills tell you HOW to gather information.             |
| "This doesn't need a formal skill"  | If a skill exists, use it.                             |
| "I remember this skill"             | Skills evolve. Read current version.                   |
| "This doesn't count as a task"      | Action = task. Check for skills.                       |
| "The skill is overkill"             | Simple things become complex. Use it.                  |
| "I'll just do this one thing first" | Check BEFORE doing anything.                           |
| "This feels productive"             | Undisciplined action wastes time. Skills prevent this. |
| "I know what that means"            | Knowing the concept ≠ using the skill. Invoke it.      |

## Platform Adaptation

If your harness appears here, read its reference file for special instructions:

- Antigravity: `references/antigravity-tools.md`

## User Instructions

User instructions (CLAUDE.md, AGENTS.md, GEMINI.md, etc, direct requests) take precedence over skills, which in turn override default behavior. Only skip skill workflows or instructions when your human partner has explicitly told you to.

### Antigravity CLI (`agy`) Tool Mapping

Skills speak in actions ("dispatch a subagent", "create a todo", "read a file"). On the Antigravity CLI (`agy`) these resolve to the tools below.

| Action skills request                                        | Antigravity CLI equivalent                                                                                                                                                                 |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Dispatch a subagent (`Subagent (general-purpose):` template) | `invoke_subagent` with a built-in `TypeName` — `self` for full-capability work, `research` for read-only (see [Subagent support](#subagent-support))                                       |
| Task tracking ("create a todo", "mark complete")             | a **task artifact** — `write_to_file` with `IsArtifact: true` and `ArtifactType: "task"` (see [Task tracking](#task-tracking)). **Not** `manage_task`, which manages background processes. |

### Task tracking

Antigravity has **no todo tool** (`manage_task` manages background processes — `list`/`kill`/`status`/`send_input` — it is *not* a checklist). When a skill says to create a todo list or track tasks, maintain a **task artifact**: a markdown checklist saved with `write_to_file` (`IsArtifact: true`, `ArtifactMetadata.ArtifactType: "task"`), edited with `replace_file_content` / `multi_replace_file_content` as you go.

At the start of any multi-step task, create the task artifact listing every step of your plan. As you complete each step, edit the artifact to mark it done (`- [x]`). If the plan changes, update the checklist. Keep it current — it is your source of truth for what remains; once the conversation gets long, re-read it before starting each step.
</EXTREMELY_IMPORTANT>

## Model Routing Guidelines (模型路由规则指引)

When planning and executing tasks under the Superpowers framework, you MUST adhere to the following model routing policies:

1. **Architecture & Design (重大设计与规划) — Claude Opus 4.6 (`claude-opus-4-6`)**
   - **Trigger / Skills**:
     * `superpowers:brainstorming` (设计规范编写与头脑风暴)
     * `superpowers:writing-plans` (编写多步骤的详细实施计划)
   - **Instruction**: Recommend using Claude Opus 4.6 for these phases to ensure architectural consistency.

2. **Core Coding & Implementation (主要编码工作) — Gemini 3.1 Pro (`gemini-3.5-flash`)**
   - **Trigger / Skills**:
     * `superpowers:subagent-driven-development` / `superpowers:executing-plans` (任务派发与代码编写)
     * `superpowers:test-driven-development` (测试驱动开发 TDD 循环)
     * `superpowers:systematic-debugging` (系统性 Debug 与 Bug 修复)
     * `superpowers:dispatching-parallel-agents` (并行子智能体分发)
   - **Instruction**: When dispatching implementer subagents via `invoke_subagent` for these tasks, explicitly specify the model parameter as `gemini-3.5-flash`.

3. **Routine Tasks, Reviews & Verification (日常、评审与验证) — Gemini 3.5 Flash (`gemini-3.5-flash`)**
   - **Trigger / Skills**:
     * `superpowers:verification-before-completion` (完成前的自动化测试与状态验证)
     * `superpowers:requesting-code-review` / `superpowers:receiving-code-review` (代码评审的发起与意见接收)
     * Running shell commands, code formatting, and simple queries.
   - **Instruction**: The main conversation loop and lightweight/review tasks use Gemini 3.5 Flash by default.

## Feature Development Workflow (功能开发工作流)

本项目的功能开发遵循 **dev 分支集成 + git worktree 隔离** 的工作流。

### 1. 分支模型

- **`main`**: 发布分支，仅接受来自 `dev` 的合并。
- **`dev`**: 活跃开发分支，所有新功能在此集成。
- **`feature/<name>`**: 从 `dev` 切出的功能分支，在独立 worktree 中开发。

### 2. 启动新功能

1. 确保当前在 `dev` 分支且工作区干净：
   ```bash
   git checkout dev
   git pull origin dev
   ```

2. 使用 `using-git-worktrees` skill 创建独立工作区。默认目录为 `.worktrees/`（已加入 `.gitignore`）：
   ```bash
   git worktree add .worktrees/feature/<name> -b feature/<name>
   cd .worktrees/feature/<name>
   ```

3. 在新工作区安装依赖并验证干净基线：
   ```bash
   pnpm install
   pnpm typecheck
   pnpm lint
   pnpm --filter @sekiro/api test
   ```

### 3. 开发与验证

- 遵循项目现有 skill：`superpowers:brainstorming` → `superpowers:writing-plans` → `superpowers:subagent-driven-development` / `superpowers:test-driven-development`。
- 开发完成后必须跑通全量验证：
  ```bash
  pnpm typecheck
  pnpm lint
  pnpm --filter @sekiro/api test
  ```

### 4. 验收与合并

功能完成后，向人类伙伴展示完整 diff 并请求验收。验收通过后，将功能分支合并回 `dev`：

```bash
git checkout dev
git pull origin dev
git merge --no-ff feature/<name>
git push origin dev
```

### 5. 清理

合并完成后移除 worktree 与本地功能分支：

```bash
git worktree remove .worktrees/feature/<name>
git branch -d feature/<name>
git push origin --delete feature/<name>
```

### 注意事项

- 不要直接在 `dev` 分支上提交功能代码。
- 不要在没有 worktree 隔离的情况下在 `main` 上开发。
- 合并前必须全量验证通过，测试失败不得合并。
