# Superpowers Skills（项目级 AI 方法论）

本项目集成了 [obra/superpowers](https://github.com/obra/superpowers) —— 一套面向 AI 编码代理的 skills 框架，为开发流程提供**方法论约束**（brainstorming、规划、TDD、调试、代码审查等），让 AI 在做创造性工作前先思考、在声称完成前先验证。

## 工作原理

每个 skill 是一个 `SKILL.md`，描述"**何时触发**"和"**该怎么做**"。ZCode 扫描 `.zcode/skills/` 自动发现它们：
- **自动触发**：当对话匹配 skill 的 description 时，AI 自行加载对应方法论
- **手动触发**：在输入框输入 `/skill-name`（如 `/brainstorming`）

skills 通过软链挂载，源文件在 `vendor/superpowers/`，便于统一更新。

## 已启用的 13 个 skill

### 创造性工作前置
| Skill | 触发时机 | 作用 |
| --- | --- | --- |
| `brainstorming` | 任何创造性工作前（建功能、改行为） | 探索意图、需求、设计，**先想清楚再动手** |

### 规划与执行
| Skill | 触发时机 | 作用 |
| --- | --- | --- |
| `writing-plans` | 有 spec/需求、动代码前 | 把多步任务写成实施计划 |
| `executing-plans` | 有写好的计划要执行 | 带评审检查点地执行计划 |
| `subagent-driven-development` | 计划含独立任务、当前会话执行 | 子代理驱动开发 |

### 质量保障
| Skill | 触发时机 | 作用 |
| --- | --- | --- |
| `test-driven-development` | 实现功能/修 bug 前 | 先写测试再写实现 |
| `systematic-debugging` | 遇到 bug/测试失败/异常行为 | 系统化调试，**不瞎猜** |
| `verification-before-completion` | 声称工作完成前 | 必须跑验证命令，禁止假完成 |
| `requesting-code-review` | 完成任务/合并前 | 主动请求代码审查 |
| `receiving-code-review` | 收到审查反馈时 | 评估反馈再实现 |

### 协作与流程
| Skill | 触发时机 | 作用 |
| --- | --- | --- |
| `dispatching-parallel-agents` | 有 2+ 独立任务时 | 并行派发子代理 |
| `using-git-worktrees` | 需要隔离工作区时 | 用 git worktree 隔离 |
| `finishing-development-branch` | 实现完成、测试通过 | 决策如何集成（合并/PR） |
| `writing-skills` | 创建/编辑 skill 时 | 编写新的方法论 skill |

## 为什么禁用了 `using-superpowers`

superpowers 官方的 `using-superpowers` 会**强制要求每次对话开始都先调用 skill**（其 description 写着 "requiring skill invocation before ANY response"）。这在 ZCode 里会过度触发、劫持正常对话——ZCode 已有自己的 skill 自动发现机制，无需这个"总入口"。所以本项目不软链它。

如果你确实想要这个强制行为，可以手动加回：
```bash
ln -s ../../vendor/superpowers/skills/using-superpowers .zcode/skills/using-superpowers
```

## 如何更新 superpowers

```bash
cd vendor/superpowers
git pull
cd -
# 软链会自动指向新版本，无需重建
```

## 如何增删 skill

- **禁用某 skill**：`rm .zcode/skills/<name>`（删软链，不影响 vendor 源）
- **重新启用**：
  ```bash
  ln -s ../../vendor/superpowers/skills/<name> .zcode/skills/<name>
  ```

## 如何查看 skill 是否生效

- 在 ZCode 输入框输入 **`/`**，打开 **Skills** 分组查看可用 skill
- 或在 **Settings → Skills** 查看完整列表

## 注意事项

1. **软链是相对路径**（`../../vendor/...`），整个项目目录移动后仍有效，但单独移动 `.zcode/` 会失效
2. **vendor/superpowers 不应改**，要定制请在 `.zcode/skills/` 下新建自己的 skill（参考 `writing-skills`）
3. 部分 skill（如 `using-git-worktrees`、`dispatching-parallel-agents`）依赖 git 仓库与多代理能力，在本项目尚未 git init 时部分功能不可用
4. 这些 skill 是**方法论约束**，不是工具——它们让 AI 按规范流程工作，但不提供新的执行能力

## 与项目文档的关系

superpowers 提供的是**通用的开发方法论**（怎么想、怎么规划、怎么验证）。项目的具体业务规范在：
- `docs/SPEC.md` —— 接口与数据契约
- `docs/PRD.md` —— 产品需求
- `docs/DOMAIN_MODEL.md` —— 领域模型
- `AGENTS.md` ——（如有）项目级 AI 指令

两者互补：superpowers 管"怎么做才靠谱"，项目文档管"做什么、做成什么样"。
