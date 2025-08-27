# lib/storage/ CLAUDE.md

本文件为数据存储层的子域规范，重点关注数据契约和版本管理。

## A) 子域定位与非目标
- 数据存储和验证核心，Zod契约管理
- 非目标：UI逻辑、业务规则、外部通信

## B) Top-5 子域命令
```bash
# 运行storage相关测试
pnpm test -- tests/unit/storage.*

# 其他命令参见根档〈Top-5 命令〉
```

## C) 目录地图与禁止跨越边界
```
storage/
├── indexed.ts      # AIDEV-CONTRACT: IndexedDB适配器
└── (未来 migrations.ts) # AIDEV-CONTRACT: 数据迁移
```
- **禁止**: 绕过Zod验证、直接操作底层存储
- **必须**: 所有数据操作经过验证和版本控制

## D) 测试与品质
- 单元测试覆盖率：行数 ≥ 80%，分支 ≥ 70%
- 必须包含回滚测试场景
- 性能测试：存储操作 < 10ms

## E) 契约与版本化
- **Key版本后缀**: `prompt_items_v1` → `prompt_items_v2`
- **迁移流程**: backup(oldKey) → migrate(oldKey→newKey) → validate(Zod) → switch → mark v2
- **回滚机制**: 失败时restore(backup)
- 所有变更需要ADR文档记录

## F) 性能与安全预算
- 存储操作: < 10ms (AIDEV-PERF)
- 内存使用: 合理缓存，避免内存泄漏
- **安全硬规则**:
  - 所有输入必须Zod验证
  - 敏感数据加密存储（如必要）
  - 迁移操作原子性保证（双写/临时key + 切换）

## G) Allowed tools
- **允许**: IndexedDB调试、数据验证工具
- **需询问**: Schema变更、迁移策略调整
- **禁止**: 直接操作原始数据

## H) 建议 AIDEV-* 锚点
- `src/lib/storage/indexed.ts:1` `// AIDEV-CONTRACT: schema v1；破坏性变更需 v2 + 迁移 + 回滚（ADR-001）`
- `src/lib/storage/indexed.ts` `validateData()` `// AIDEV-CONTRACT: Zod 验证入口`
- `(未来) src/lib/storage/migrations.ts:1` `// AIDEV-CONTRACT: 迁移/回滚策略`

## I) ADR/文件索引
- @docs/adr/storage-versioning.md - 版本化管理
- @docs/adr/migration-strategy.md - 迁移策略

## J) 更新触发条件
- Schema变更
- 存储引擎更换
- 性能优化需求

## 冲突优先级
若规范冲突：**锚点 > 子域 CLAUDE.md > 根 CLAUDE.md**