import MarkdownIt from "markdown-it";
const parser = new MarkdownIt({ html: false, linkify: false });
/** 只读取解析后的文本 token，不渲染 HTML，也不修改原文。 */
export function markdownPreview(source: string): string {
  const pieces: string[] = [];
  function visit(tokens: ReturnType<typeof parser.parse>) {
    for (const token of tokens) {
      if (token.children) visit(token.children);
      else if (["text", "code_inline", "code_block", "fence", "image"].includes(token.type)) pieces.push(token.content);
      else if (["softbreak", "hardbreak"].includes(token.type) || token.block) pieces.push(" ");
    }
  }
  visit(parser.parse(source, {}));
  return pieces.join("").replace(/\s+/g, " ").trim();
}
