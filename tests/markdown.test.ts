import { expect, test } from "bun:test";
import { markdownPreview } from "../app/domain/markdown";
test("片段复用 Markdown 解析并保留原始正文", () => {
  const source = '*旅人* **来了**\n\n> [一封信](https://example.com)\n\n`代码`\n\n```ts\nconst x = 1\n```';
  expect(markdownPreview(source)).toBe("旅人 来了 一封信 代码 const x = 1");
  expect(source).toContain("https://example.com");
});
test("未闭合标记、HTML 与空回复安全降级为文本", () => {
  expect(markdownPreview("*未闭合\n下一行")).toBe("*未闭合 下一行");
  expect(markdownPreview('<script>alert(1)</script>')).toBe('<script>alert(1)</script>');
  expect(markdownPreview("![山](image.png)")).toBe("山");
  expect(markdownPreview("")).toBe("");
});
