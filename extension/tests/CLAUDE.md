# tests/ CLAUDE.md

本文件为测试层的子域规范，统一管理单元测试和E2E测试。

## A) 子域定位与非目标
- 测试代码质量和执行标准
- 非目标：生产代码、业务逻辑、用户界面

## B) Top-5 子域命令
```bash
# 单元测试
pnpm test:unit

# E2E测试  
pnpm test:e2e

# 覆盖率报告
pnpm test -- --coverage

# 运行特定测试文件
pnpm test -- tests/unit/storage.spec.ts
pnpm test:e2e -- tests/e2e/overlay.spec.ts

# 其他命令参见根档〈Top-5 命令〉
```

## C) 目录地图与禁止跨越边界
```
tests/
├── unit/           # 单元测试（Vitest）
│   ├── storage.spec.ts
│   ├── schemas.spec.ts
│   └── ...
└── e2e/            # E2E测试（Playwright）
    └── overlay.spec.ts
```
- **禁止**: 测试代码包含业务逻辑、硬编码敏感数据
- **必须**: 使用工厂函数生成测试数据、清理测试状态

## D) 测试与品质
### 单元测试 (unit/)
- 覆盖率目标: 行数 ≥ 80%，分支 ≥ 70%
- 必须包含错误边界测试
- 遵循TCR流程：先写红测试 → 最小实作 → 绿后提交
- 使用Vitest + jsdom环境

### E2E测试 (e2e/)
- 覆盖主要用户流程
- 测试数据隔离和清理
- 使用隔离浏览器设定档，测试结束清理storage
- 遵循TCR流程：先写红测试 → 最小实作 → 绿后提交
- 使用Playwright + 真实浏览器

## E) 契约与版本化
- 测试必须与生产代码版本同步
- 破坏性变更需要更新对应测试
- 参见根档〈契约与版本化〉

## F) 性能与安全预算
- 单元测试运行时间: < 30秒
- E2E测试运行时间: < 2分钟
- **安全硬规则**:
  - 测试数据不得包含真实密钥
  - E2E测试使用隔离环境

## G) Allowed tools
- **允许**: Vitest、Playwright、覆盖率工具
- **需询问**: 测试框架变更、覆盖率阈值调整
- **禁止**: 修改生产代码满足测试

## H) 建议 AIDEV-* 锚点
- `tests/unit/storage.spec.ts:1` `// AIDEV-CONTRACT: 覆盖所有 schema 分支；含错误路径`
- `tests/e2e/overlay.spec.ts:1` `// AIDEV-PERF: TTI/Overlay 出现 ≤150ms；记录 Lighthouse/trace（若可）`
- 测试文件应包含对应被测文件的契约锚点引用

## I) ADR/文件索引
- @docs/adr/testing-strategy.md - 测试策略
- @vitest.config.ts - 单元测试配置
- @playwright.config.ts - E2E测试配置

## J) 更新触发条件
- 测试框架升级
- 覆盖率阈值调整
- 新增测试类型需求

## 冲突优先级
若规范冲突：**锚点 > 子域 CLAUDE.md > 根 CLAUDE.md**