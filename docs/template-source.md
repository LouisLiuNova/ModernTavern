# 模板来源与运行基线

- 来源：https://github.com/dianprata/nuxt-shadcn-dashboard
- 来源提交：`54988681e50feaa4935828882da93faff06cf042`
- 许可证：MIT，原文保留在 `docs/licenses/nuxt-shadcn-dashboard.LICENSE`。
- 复用：Nuxt 4／Tailwind 4 配置基础、shadcn-vue 的 button、dialog、dropdown-menu、input、textarea、label、badge 组件与语义 token 约定。
- 按产品需要移除 dashboard 演示页面、常驻侧栏、图表、表格、认证演示和托管服务依赖；不混用 Nuxt UI。
- Bun：`1.3.13`，安装 `bun install --frozen-lockfile`；开发 `bun run dev`；构建 `bun run build`；本地预览 `bun run preview`。Nuxt CLI、Vue 类型检查和 Nitro 预览均显式使用 Bun。
- 仅保留原型所需依赖；Nuxt 固定为模板声明范围内的 4.1.3，实际解析版本以 `bun.lock` 为准；只有 Bun 锁文件，无其他包管理器锁文件。

## 源码复用核验

已逐文件比对上述来源提交：保留 36 个 UI 源文件，其中 34 个与上游逐字节一致；2 个适配文件为 `button/index.ts`（暗色危险按钮前景色）和 `dialog/DialogContent.vue`（关闭按钮中文名称）。这些文件均可找到上游对应文件。

聊天、会话、连接、外观与写作界面实际引用 Button、Dialog、DropdownMenu、Input、Textarea。label 与 badge 作为同源基础组件保留。Nuxt／Tailwind 配置基于模板裁剪；原型按 PRD 重组聊天布局，不保留 dashboard 演示外壳，也未将模板登录演示视为认证能力。
