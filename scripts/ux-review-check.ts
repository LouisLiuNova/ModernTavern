import { chromium, expect, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { themes } from "../app/domain/appearance";
const base = process.env.MT_BASE_URL || "http://127.0.0.1:3101";
const artifacts = process.env.MT_ARTIFACTS || "/tmp/moderntavern-browser-check";
await mkdir(artifacts, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || "/opt/google/chrome/chrome",
  headless: true,
  args: ["--no-sandbox"],
});
const results: { name: string; passed: boolean; error?: string }[] = [];
const errors: string[] = [],
  external: string[] = [];
async function fresh(width = 1440) {
  const context = await browser.newContext({
    viewport: { width, height: 1000 },
    colorScheme: "light",
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (!r.url().startsWith(base) && !r.url().startsWith("data:"))
      external.push(r.url());
  });
  await page.goto(base);
  await expect(page.locator("h1")).toContainText("雨落在旧书店");
  return { page, context };
}
async function check(name: string, fn: () => Promise<void>) {
  if (
    process.env.MT_CHECK_FILTER &&
    !name.includes(process.env.MT_CHECK_FILTER)
  )
    return;
  try {
    await fn();
    results.push({ name, passed: true });
    console.log(`PASS ${name}`);
  } catch (e) {
    results.push({ name, passed: false, error: String(e) });
    console.log(`FAIL ${name}\n${e}`);
  }
}
async function closeModal(p: Page) {
  const count = await p.getByRole("dialog").count();
  await p
    .getByRole("dialog")
    .last()
    .getByRole("button", { name: "关闭", exact: true })
    .click();
  await expect(p.getByRole("dialog")).toHaveCount(count - 1);
}
async function scenario(p: Page, value: string) {
  await p.getByRole("button", { name: "演示场景", exact: true }).click();
  await p.getByLabel("下一次模拟生成").selectOption(value);
  await closeModal(p);
}
async function selectSession(p: Page, name: string) {
  await p.getByRole("button", { name: "打开会话列表", exact: true }).click();
  await p
    .locator(".session-main")
    .filter({ has: p.getByText(name, { exact: true }) })
    .click();
}
// 针对 2026-10-20 走查的行为回归；复用现有 Chrome 与独立上下文方式。
await check("UX-01/02/05：选择不生成、草稿保留、失败重试新增候选", async () => {
  const { page: p, context } = await fresh();
  const input = p.getByLabel("消息输入", { exact: true });
  await input.fill("保留在输入区的草稿");
  await p.getByRole("button", { name: "选择候选", exact: true }).click();
  await p.getByRole("menuitem").filter({ hasText: "候选 2" }).click();
  await expect(p.locator(".candidate-count")).toHaveText("2 / 2");
  await expect(p.locator(".message")).toHaveCount(4);
  await expect(p.getByLabel("停止生成", { exact: true })).toHaveCount(0);
  await scenario(p, "partialfail");
  await p.getByRole("button", { name: "让叙事者继续", exact: true }).click();
  await expect(p.locator(".message")).toHaveCount(5);
  await expect(input).toHaveValue("保留在输入区的草稿");
  await expect(p.getByRole("button", { name: "选择候选", exact: true })).toBeDisabled();
  await expect(p.getByRole("button", { name: "重试生成", exact: true })).toBeVisible({ timeout: 15000 });
  const partial = await p.locator(".message").last().locator(".prose-story").innerText();
  await scenario(p, "emptyfail");
  await p.getByRole("button", { name: "重试生成", exact: true }).click();
  await expect(p.locator(".candidate-count")).toHaveText("2 / 2");
  await expect(p.getByRole("button", { name: "重试生成", exact: true })).toBeVisible();
  await p.getByRole("button", { name: "选择候选", exact: true }).click();
  await p.getByRole("menuitem").filter({ hasText: "候选 1" }).click();
  await expect(p.locator(".message").last().locator(".prose-story")).toHaveText(partial);
  await expect(input).toHaveValue("保留在输入区的草稿");
  await p.screenshot({ path: `${artifacts}/ux-failure-recovery.png` });
  await p.getByLabel("外观设置", { exact: true }).click();
  await p.getByRole("button", { name: "暗色", exact: true }).click();
  await closeModal(p);
  await p.screenshot({ path: `${artifacts}/ux-failure-recovery-dark.png` });
  await context.close();
});
await check("UX-03/04：错误图标、顶部通知与全屏停止不重叠", async () => {
  for (const width of [1440, 390, 360]) {
    const { page: p, context } = await fresh(width);
    await scenario(p, "slow");
    await p.getByRole("button", { name: "让叙事者继续", exact: true }).click();
    await p.getByRole("button", { name: "演示场景", exact: true }).click();
    await p.getByRole("button", { name: "预览存储失败反馈", exact: true }).click();
    await closeModal(p);
    const toast = p.locator(".toast");
    await expect(toast).toHaveAttribute("role", "alert");
    await expect(toast).toHaveAttribute("data-kind", "error");
    await expect(toast.locator(".lucide-circle-alert-icon")).toBeVisible();
    const notice = await toast.boundingBox();
    const stop = await p.getByLabel("停止生成", { exact: true }).boundingBox();
    expect(notice!.y + notice!.height).toBeLessThan(stop!.y);
    await p.getByRole("button", { name: "全屏写作", exact: true }).click();
    await expect(p.getByLabel("全屏写作正文")).toBeFocused();
    expect(await p.getByRole("dialog").evaluate(el => {
      const r = el.getBoundingClientRect();
      return el.contains(document.elementFromPoint(r.x + 40, r.y + 90));
    })).toBe(true);
    await p.getByRole("dialog").getByRole("button", { name: "停止生成", exact: true }).click();
    await expect(p.getByRole("dialog").getByRole("button", { name: "停止生成", exact: true })).toHaveCount(0);
    await p.screenshot({ path: `${artifacts}/ux-full-writing-${width}.png` });
    await p.getByRole("button", { name: "收起写作", exact: true }).click();
    await expect(toast).toBeVisible();
    await expect(p.locator(".message").last()).toContainText("已停止");
    await p.screenshot({ path: `${artifacts}/ux-notice-${width}.png` });
    await context.close();
  }
});
await check("UX-06/07/09/10/11：导航焦点、纯文本片段、搜索与外观隔离", async () => {
  const { page: p, context } = await fresh(390);
  const list = p.getByRole("button", { name: "打开会话列表", exact: true });
  await list.click();
  await expect(p.locator(".session-preview").first()).not.toContainText("*");
  await p.getByLabel("搜索会话", { exact: true }).fill("没有这个名字");
  await p.getByRole("button", { name: "清空搜索", exact: true }).click();
  await expect(p.locator(".session-main")).toHaveCount(2);
  await closeModal(p);
  await expect(list).toBeFocused();
  await p.getByLabel("新建会话", { exact: true }).click();
  await p.locator(".prompt-card").click();
  const input = p.getByLabel("消息输入", { exact: true });
  await expect(input).toBeFocused();
  const draft = await input.inputValue();
  await input.fill("我自己的草稿");
  await p.locator(".prompt-card").click();
  await expect(input).toHaveValue("我自己的草稿");
  const before = await p.evaluate(() => JSON.parse(localStorage.getItem("moderntavern.chat.v1")!));
  await p.getByLabel("外观设置", { exact: true }).click();
  await p.getByRole("button", { name: "气泡式", exact: true }).click();
  await p.getByRole("button", { name: "恢复默认外观", exact: true }).click();
  await closeModal(p);
  const after = await p.evaluate(() => JSON.parse(localStorage.getItem("moderntavern.chat.v1")!));
  expect(after).toEqual(before);
  expect(draft).toContain("山间旅店");
  await selectSession(p, "雨落在旧书店");
  const trigger = p.getByLabel("第 1 条消息更多操作", { exact: true });
  await trigger.click();
  await p.getByRole("menuitem", { name: "编辑消息", exact: true }).click();
  await expect(p.getByLabel("编辑消息正文", { exact: true })).toBeFocused();
  await p.getByLabel("编辑消息正文", { exact: true }).press("Escape");
  await expect(trigger).toBeFocused();
  await trigger.click();
  await p.getByRole("menuitem", { name: "编辑消息", exact: true }).click();
  await p.getByLabel("编辑消息正文", { exact: true }).fill("需要确认的编辑");
  await p.getByRole("button", { name: "取消编辑", exact: true }).click();
  await p.getByRole("button", { name: "放弃修改", exact: true }).click();
  await expect(trigger).toBeFocused();
  await context.close();
});
await check("UX-03：真实本地存储失败提示与复制错误分别保留", async () => {
  const { page: p, context } = await fresh();
  await p.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (key === "moderntavern.chat.v1") throw new DOMException("测试存储配额", "QuotaExceededError");
      original.call(this, key, value);
    };
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async () => { throw new Error("测试拒绝剪贴板权限"); } } });
  });
  await p.getByLabel("消息输入", { exact: true }).fill("尚未保存的草稿");
  await expect(p.locator(".storage-warning")).toContainText("刷新可能丢失本次修改");
  await expect(p.getByLabel("消息输入", { exact: true })).toHaveValue("尚未保存的草稿");
  await p.getByLabel("复制第 1 条消息", { exact: true }).click();
  await expect(p.locator(".toast")).toHaveAttribute("data-kind", "error");
  await expect(p.locator(".toast")).toContainText("复制失败");
  await expect(p.locator(".storage-warning")).toBeVisible();
  await context.close();
});
await check("UX-12/13/14：十二色板×三尺寸×两布局实际表面与叠层", async () => {
  function luminance(rgb: number[]) {
    const [r, g, b] = rgb.map(x => { const v = x / 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });
    return r! * .2126 + g! * .7152 + b! * .0722;
  }
  for (const width of [1440, 390, 360]) {
    const { page: p, context } = await fresh(width);
    await p.emulateMedia({ reducedMotion: "no-preference" });
    const brand = await p.locator(".brand").boundingBox();
    const actions = await p.locator(".header-actions").boundingBox();
    expect(brand!.x + brand!.width).toBeLessThanOrEqual(actions!.x);
    for (const theme of themes) for (const mode of ["light", "dark"]) for (const layout of ["reading", "bubble"]) {
      await p.getByLabel("外观设置", { exact: true }).click();
      await p.getByRole("button", { name: `主题 ${theme.name}`, exact: true }).click();
      await p.getByRole("button", { name: mode === "light" ? "亮色" : "暗色", exact: true }).click();
      await p.getByRole("button", { name: layout === "reading" ? "阅读式" : "气泡式", exact: true }).click();
      await expect(p.getByRole("dialog")).toBeVisible();
      await closeModal(p);
      const samples = await p.evaluate(() => {
        // Canvas 将浏览器计算得到的 color-mix 色值解析为实际 sRGB。
        const ctx = document.createElement("canvas").getContext("2d")!;
        const rgb = (value: string) => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = value; ctx.fillRect(0, 0, 1, 1); return Array.from(ctx.getImageData(0, 0, 1, 1).data).slice(0, 3); };
        return [...document.querySelectorAll(".message")].map(el => {
          const style = getComputedStyle(el);
          return [rgb(style.backgroundColor), rgb(style.color), rgb(style.getPropertyValue("--muted-foreground"))];
        });
      });
      for (const [bg, ...fgs] of samples) for (const fg of fgs) {
        const x = luminance(bg!), y = luminance(fg);
        expect((Math.max(x, y) + .05) / (Math.min(x, y) + .05)).toBeGreaterThanOrEqual(4.5);
      }
      expect(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (theme.id === "seiji") await p.screenshot({ path: `${artifacts}/ux-${mode}-${layout}-${width}.png` });
    }
    await context.close();
  }
});
await browser.close();
await Bun.write(
  `${artifacts}/results.json`,
  JSON.stringify(
    {
      browser: "Google Chrome",
      version: browser.version(),
      base,
      results,
      errors,
      external,
    },
    null,
    2,
  ),
);
console.log(
  `${results.filter((x) => x.passed).length}/${results.length} suites passed`,
);
if (!results.length || results.some((x) => !x.passed)) process.exit(1);
