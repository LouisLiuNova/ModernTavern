# 模板来源与运行基线

- 来源：https://github.com/dianprata/nuxt-shadcn-dashboard
- 来源提交：`54988681e50feaa4935828882da93faff06cf042`
- 许可证：MIT，原文保留在 `docs/licenses/nuxt-shadcn-dashboard.LICENSE`。
- 复用：Nuxt 4／Tailwind 4 配置基础、shadcn-vue 的 button、dialog、dropdown-menu、input、textarea、label、badge 组件与语义 token 约定。
- 按产品需要移除 dashboard 演示页面、常驻侧栏、图表、表格、认证演示和托管服务依赖；不混用 Nuxt UI。
- Bun：`1.3.13`，安装 `bun install --frozen-lockfile`；开发 `bun run dev`；构建 `bun run build`；本地预览 `bun run preview`。Nuxt CLI、Vue 类型检查和 Nitro 预览均显式使用 Bun。
- 模板依赖范围保留，实际解析版本以 `bun.lock` 为准；只有 Bun 锁文件，无其他包管理器锁文件。
