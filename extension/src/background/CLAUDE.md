# background/ CLAUDE.md

本文件为 Service Worker 层的子域规范，相对根档的差异化和细化。

## A) 子域定位与非目标
- Chrome Extension Service Worker，处理命令和策略检查
- 非目标：直接操作UI、存储业务逻辑、外部API直连

## B) Top-5 子域命令
```bash
# 运行background相关测试
pnpm test -- tests/unit/*.spec.ts

# 开发模式（观察SW日志）
pnpm dev

# 其他命令参见根档〈Top-5 命令〉
```

## C) 目录地图与禁止跨越边界
```
background/
└── index.ts    # AIDEV-BOUNDARY: 核心消息处理
```
- **禁止**: 直接访问DOM、操作UI组件、直接调用外部API
- **必须**: 所有外部通信通过background service中转（Zod验证）
- **必须**: >5ms任务使用setTimeout/queueMicrotask避免阻塞

## D) 测试与品质
- 单元测试必须覆盖所有消息处理函数
- 错误处理测试必须包含超时和重试场景（3s超时，重试2次，指数退避100/200ms）
- 性能测试：消息响应时间 < 50ms

## E) 契约与版本化
- 消息协议格式：`{version: '1.0', type: 'SAVE_PROMPT', payload: {...}}`
- 所有消息必须Zod验证
- 破坏性变更需要新消息类型+适配层
- 参见根档〈契约与版本化〉

## F) 性能与安全预算
- 消息处理时间: < 50ms (AIDEV-PERF) - 量测方式：unit测试测量handler执行时间
- 内存使用: < 10MB - 量测方式：Chrome Task Manager观察SW内存
- 禁止: 同步阻塞操作、大内存数据结构

## G) Allowed tools
- **允许**: TypeScript调试、Chrome DevTools
- **需询问**: 消息协议变更、新增权限
- **禁止**: 直接操作其他层状态

## H) 建议 AIDEV-* 锚点
- `src/background/index.ts:1` `// AIDEV-BOUNDARY: SW 只桥接/策略，不得直连外部 API/DOM`
- `src/background/index.ts` `handleMessage()` `// AIDEV-CONTRACT: Zod 验证 message {version,type}`
- `src/background/index.ts` 错误拦截段 `// AIDEV-SEC: 超时/重试/白名单`

## I) ADR/文件索引
- @docs/adr/background-messaging.md - 消息协议设计
- @docs/adr/security-policies.md - 安全策略

## J) 更新触发条件
- 消息协议变更
- Chrome API版本更新
- 性能预算调整

## 冲突优先级
若规范冲突：**锚点 > 子域 CLAUDE.md > 根 CLAUDE.md**