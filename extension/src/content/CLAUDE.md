# content/ CLAUDE.md

本文件为内容脚本层的子域规范，重点关注安全隔离和注入策略。

## A) 子域定位与非目标
- 安全的内容脚本注入层，仅在允许站点执行
- 非目标：跨域访问、敏感数据存储、复杂业务逻辑

## B) Top-5 子域命令
```bash
# 运行content相关E2E测试
pnpm test:e2e -- tests/e2e/overlay.spec.ts

# 开发模式（加载unpacked扩展）
pnpm dev

# 其他命令参见根档〈Top-5 命令〉
```

## C) 目录地图与禁止跨越边界
```
content/
├── index.ts        # AIDEV-SEC: 主注入逻辑
└── overlay/
    └── App.tsx     # AIDEV-PERF: Overlay UI组件
```
- **禁止**: 访问跨源iframe、eval/new Function、同步XHR、操作跨源iframe DOM
- **必须**: 隔离世界执行、所有数据Zod验证、超时控制、检查document.origin/frameElement
- **必须**: 仅允许白名单站点注入

## D) 测试与品质
- E2E测试必须覆盖所有允许站点的注入场景
- 安全测试必须验证隔离和沙箱限制
- 性能测试：注入时间 p95 < 150ms（E2E记录Time to Overlay指标）

## E) 契约与版本化  
- 注入数据必须版本化和Zod验证
- 参见根档〈契约与版本化〉

## F) 性能与安全预算
### 安全硬规则（白名单）
- 仅通过`chrome.scripting`注入允许站点
- 所有数据必须Zod验证和超时控制
- 通过background service中介访问敏感存储

### 安全硬规则（禁止清单）
- 禁止动态插入第三方远程脚本
- 禁止eval/new Function等动态代码执行
- 禁止同步XHR和跨源iframe操作

### 性能预算
- 注入时间 p95: < 150ms (AIDEV-PERF)
- 内存使用: < 5MB

## G) Allowed tools
- **允许**: DOM调试、性能分析
- **需询问**: 注入策略变更、新增权限
- **禁止**: 绕过安全限制的操作

## H) 建议 AIDEV-* 锚点
- `src/content/index.ts:1` `// AIDEV-SEC: 仅允许清单站点注入；跨源 iframe 禁止操作`
- `src/content/index.ts` 注入函数 `// AIDEV-PERF: 首注入 p95 <150ms；避免同步阻塞`
- `src/content/overlay/App.tsx:1` `// AIDEV-BOUNDARY: 仅负责 UI；不得含业务/存取`

## I) ADR/文件索引
- @docs/adr/content-security.md - 安全注入策略
- @docs/adr/performance-budget.md - 性能预算

## J) 更新触发条件
- 注入策略变更
- 安全漏洞修复
- 性能预算调整

## 冲突优先级
若规范冲突：**锚点 > 子域 CLAUDE.md > 根 CLAUDE.md**