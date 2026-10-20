# ModernTavern

面向长篇 RP 的现代聊天交互原型。六种日本传统色、亮暗主题、移动端阅读与写作，以及可独立探索的故事分支。

当前 `codex/interaction-prototype` 分支使用模拟数据与浏览器本地保存，不连接真实模型，不提供生产后端或认证。

## 本地运行

使用 Bun **1.3.13**：

```sh
bun install --frozen-lockfile
bun run dev --port 3100
```

打开 `http://127.0.0.1:3100/`；完整主题预览位于 `/themes`。开发服务只监听本机，不向公网暴露。

```sh
bun run typecheck
bun test
bun run build
HOST=127.0.0.1 PORT=3101 bun run preview
```

Nuxt CLI、类型检查、测试与生产预览均使用 Bun。运行细节与 Chrome 验收命令见原型说明。

## 文档

- [产品需求文档](docs/PRD.md)：MVP 范围、业务语义、主题与待决事项。
- [原型说明](docs/prototype.md)：运行方法、演示路线、本地保存与明确边界。
- [原型验收记录](docs/prototype-acceptance.md)：自动化、Chrome 浏览器及待验证事项。
- [模板来源](docs/template-source.md)：指定模板提交与 MIT 许可证。

本原型不宣称完成 SillyTavern 复刻、生产级后台任务、多设备一致性或 40 万 token 历史性能验收。
