# CLAUDE.md

本文件为 Prompt Organizer Chrome 扩展项目的单一事实来源（SST），指导所有开发活动。

## 三条黄金法则
1. **不确定先问** (Ask-before-act)：任何不确定的操作必须先确认
2. **先计划后实施** (Plan→Apply)：复杂任务必须先制定计划
3. **人写测试是神圣的** (Tests are sacred)：新功能必须先写测试，TCR流程必须遵守

## 项目定位
Chrome 扩展提示管理器 MVP，提供快捷文本提示插入功能。  
**非目标**：云端同步、多用户协作、复杂AI集成、移动端支持

## Top-5 命令
```bash
# 安装依赖
pnpm i

# 开发模式
pnpm dev

# 完整构建 + 安全检查 + 打包
pnpm build && pnpm guard && pnpm zip

# 全量测试（单元 + E2E）
pnpm test && pnpm test:e2e

# 代码质量检查
pnpm typecheck && pnpm lint
```

## 版本快照（更新于：2025-08-26）
- Node.js: v22.18.0 / npm: 10.9.3 / pnpm: 10.15.0
- TypeScript: 5.4.5 / React: 18.3.1 / Vite: 5.3.1
- Zod: 3.23.8 / Vitest: 1.6.0 / Playwright: 1.46.0
- OS: Darwin 24.6.0 (macOS Sonoma, ARM64)

> 生成方式：`node -v`、`pnpm -v`、`npx tsc -v`、`npx vite -v`、`npx vitest --version`、`npx playwright --version`；每次发版或升级后更新此节。

## 目录地图与边界
```
extension/
├── src/
│   ├── background/    # AIDEV-BOUNDARY: 仅处理命令/策略，禁止直接操作UI
│   ├── content/       # AIDEV-BOUNDARY: 仅注入转发，禁止直接访问敏感数据  
│   ├── popup/         # UI层，必须通过background桥接
│   ├── options/       # UI层，必须通过background桥接
│   └── lib/storage/   # AIDEV-CONTRACT: 所有数据必须Zod验证
├── tests/
│   ├── unit/          # 单元测试（必须覆盖新功能）
│   └── e2e/           # E2E测试（覆盖用户流程）
└── scripts/           # 构建和安全脚本
```

## 代码风格硬规则
1. TypeScript严格模式，禁止any类型
2. React函数组件 + Hooks模式
3. ESLint + Prettier自动格式化
4. 存储操作必须通过Zod验证（AIDEV-CONTRACT）
5. 层间通信必须通过定义好的接口
6. 错误处理必须显式捕获和记录
7. 禁止提交调试代码和注释掉的代码
8. 组件命名使用PascalCase，工具函数使用camelCase
9. 导入顺序：第三方库 → 内部模块 → 相对路径
10. 单文件不超过300行，超出的必须拆分

## 测试神圣规则
**CI Gate必须通过**：`lint` → `typecheck` → `unit` → `e2e`
- 新功能必须先写失败测试
- 遵循TCR流程：测试 → 编码 → 重构
- 单元测试覆盖率必须 > 80%（行数）/ > 70%（分支）
- E2E测试覆盖主要用户流程
- 测试数据使用工厂函数生成
- 生成报表：`pnpm test -- --coverage`（CI与本地一致）

## 依赖与版本策略
- 使用pnpm锁版本，禁止手动修改pnpm-lock.yaml
- 主要依赖版本在package.json中精确锁定
- 升级依赖必须运行全量测试套件
- 破坏性升级需要创建迁移脚本

## 环境变量与密钥
- 暂无.env配置，需要时创建.env.example模板
- 禁止提交任何包含密钥的文件
- API密钥必须通过用户界面配置，不硬编码
- 秘密不进bundle、不进git；用UI → extension storage（Zod验证）

## 契约与版本化
- 存储key带版本后缀：`*_v1` (prompt_items_v1, site_policy_v1, feature_flags_v1)
- 破坏性变更需要：新key版本 + 迁移脚本 + 回滚方案
- API变更必须向后兼容或提供适配层

## 性能预算
- Overlay注入时间: < 100ms (AIDEV-PERF)
- 搜索响应时间: < 50ms  
- 存储操作: < 10ms
- 禁止：阻塞主线程操作、同步XHR、大内存占用

## 安全与权限
- Manifest权限最小化（storage, scripting, activeTab, commands）
- 内容脚本在隔离环境执行 (AIDEV-SEC)
- 禁止使用eval、new Function等动态代码执行
- 用户输入必须验证和转义

## 工具白名单
**始终允许**: File edit、Bash(pnpm|npm|git status|git add|git commit:*|pnpm build|pnpm test|pnpm lint|pnpm typecheck|playwright)  
**需询问**: 大规模重构、跨目录重命名、manifest权限调整  
**禁止**: `rm -rf`、任何密钥操作、直接修改`node_modules/`

## 文件冲突优先级
- 若规范冲突：**子域 CLAUDE.md > 根 CLAUDE.md**
- 若锚点与文件冲突：**AIDEV-* 锚点优先**
- 不确定时先询问（Ask-before-act）

## 常见任务食谱
```bash
# 本地复现线上bug
pnpm dev + 编写重现测试用例

# 生成发布包  
pnpm build && pnpm guard && pnpm zip

# 运行特定测试文件
pnpm test -- tests/unit/storage.spec.ts

# 检查类型和lint
pnpm typecheck && pnpm lint

# 安全验证manifest
pnpm guard

# 创建备份（schema验证失败时）
pnpm build && cp -r dist/ dist-backup/

# 本地跑CI对齐检查
pnpm typecheck && pnpm lint && pnpm test && pnpm test:e2e && pnpm build
```

## AIDEV锚点使用准则
在代码中插入注释标记关键位置：
```typescript
// AIDEV-BOUNDARY: background ↔ content 通信接口
// AIDEV-CONTRACT: Zod schema 验证点  
// AIDEV-PERF: 性能关键路径，需要监控
// AIDEV-SEC: 安全敏感操作，需要审计
```

### 建议锚点（示例）
- `src/background/index.ts`
  `// AIDEV-BOUNDARY: background 仅处理策略/桥接；UI 不得直连外部 API`
- `src/lib/storage/indexed.ts`
  `// AIDEV-CONTRACT: storage v1；破坏性变更需 v2 + 迁移 + 回滚`
- `src/content/index.ts` 
  `// AIDEV-SEC: 仅允许站点注入；禁止同步阻塞`
- `src/popup/App.tsx`
  `// AIDEV-PERF: 操作需在 50ms 内反馈；避免大型 re-render`

## ADR索引
- 目录：`docs/adr/`（需创建模板：`docs/adr/0000-template.md`）
- 需记录主题：Storage schema版本化、Permissions策略、注入性能预算、打包/发版流程
- 模板包含：Context、Options、Decision、Consequences、Date、Status

## CI/CD要求
- 启用GitHub Actions，事件：`pull_request`与`push`到`main`
- 工作流：`pnpm install` → `pnpm typecheck` → `pnpm lint` → `pnpm test` → `pnpm test:e2e` → `pnpm build && pnpm guard && pnpm zip`
- 所有步骤全绿才可并入

## 发布流程
- 建`docs/release.md`文档化流程
- 步骤：版本号规则 → `pnpm build && pnpm guard && pnpm zip` → 上传ZIP → 填写版本说明 → 提审 → 标记tag
- 目前手动确保安全检查完整，后续评估自动化

## 何时更新本文件
- 技术栈变更（框架/工具升级）
- 架构模式调整（新增分层/边界）
- 新增质量门禁（测试/lint规则）
- 安全策略更新（权限/漏洞）
- 开发流程变更（CI/CD调整）

## 关联文档
- @manifest.json - 扩展配置和权限
- @package.json - 依赖和脚本命令
- @tsconfig.json - TypeScript配置
- @vite.config.ts - 构建配置