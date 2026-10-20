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
  await p
    .getByRole("dialog")
    .last()
    .getByRole("button", { name: "关闭", exact: true })
    .click();
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
await check(
  "桌面与手机：24 个主题组合、系统模式、显式模式及无横向溢出",
  async () => {
    for (const width of [1440, 390]) {
      const { page: p, context } = await fresh(width);
      await p
        .getByLabel("消息输入", { exact: true })
        .fill("主题切换后保留的草稿");
      for (const t of themes)
        for (const mode of ["light", "dark"] as const) {
          await p
            .getByRole("button", { name: "外观设置", exact: true })
            .click();
          await p
            .getByRole("button", { name: `主题 ${t.name}`, exact: true })
            .click();
          await p
            .getByRole("button", {
              name: mode === "light" ? "亮色" : "暗色",
              exact: true,
            })
            .click();
          await closeModal(p);
          await expect(p.locator("html")).toHaveAttribute("data-theme", t.id);
          await expect(p.locator("html")).toHaveClass(mode);
          await expect(p.getByLabel("消息输入", { exact: true })).toHaveValue(
            "主题切换后保留的草稿",
          );
          expect(
            await p.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          ).toBe(true);
          await p.screenshot({
            path: `${artifacts}/${t.id}-${mode}-${width}.png`,
          });
          await p
            .getByRole("button", { name: "外观设置", exact: true })
            .click();
          await p
            .getByRole("button", { name: "跟随系统", exact: true })
            .click();
          await closeModal(p);
          await p.emulateMedia({ colorScheme: "dark" });
          await expect(p.locator("html")).toHaveClass("dark");
          await p.emulateMedia({ colorScheme: "light" });
          await expect(p.locator("html")).toHaveClass("light");
          await p
            .getByRole("button", { name: "外观设置", exact: true })
            .click();
          await p
            .getByRole("button", {
              name: mode === "light" ? "亮色" : "暗色",
              exact: true,
            })
            .click();
          await closeModal(p);
          await p.emulateMedia({
            colorScheme: mode === "light" ? "dark" : "light",
          });
          await expect(p.locator("html")).toHaveClass(mode);
        }
      await context.close();
    }
  },
);
await check("窄屏、浮框边界、键盘关闭与焦点返回", async () => {
  const { page: p, context } = await fresh(360);
  expect(
    await p
      .locator(".app-header")
      .evaluate((e) => e.scrollWidth <= e.clientWidth),
  ).toBe(true);
  expect(
    await p
      .locator(".story-container")
      .evaluate((e) => e.scrollWidth <= e.clientWidth),
  ).toBe(true);
  await p.screenshot({ path: `${artifacts}/narrow-360.png` });
  await p.getByRole("button", { name: "外观设置", exact: true }).click();
  const d = p.getByRole("dialog");
  await expect(d).toBeVisible();
  const box = await d.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(8);
  expect(box!.x + box!.width).toBeLessThanOrEqual(352);
  await p.keyboard.press("Tab");
  expect(await d.evaluate((e) => e.contains(document.activeElement))).toBe(
    true,
  );
  await p.keyboard.press("Escape");
  await expect(d).not.toBeVisible();
  await expect(
    p.getByRole("button", { name: "外观设置", exact: true }),
  ).toBeFocused();
  await context.close();
});
await check("会话创建搜索重命名、全屏写作、草稿刷新和布局切换", async () => {
  const { page: p, context } = await fresh(390);
  await p.getByRole("button", { name: "新建会话", exact: true }).click();
  await p.getByLabel("消息输入", { exact: true }).fill("草稿第一行\n第二行");
  await p.getByRole("button", { name: "全屏写作", exact: true }).click();
  await expect(p.getByLabel("全屏写作正文")).toHaveValue("草稿第一行\n第二行");
  await p.getByLabel("全屏写作正文").fill("展开后的草稿");
  await p.getByRole("button", { name: "收起写作", exact: true }).click();
  await expect(p.getByLabel("消息输入", { exact: true })).toHaveValue(
    "展开后的草稿",
  );
  await p.reload();
  await expect(p.getByLabel("消息输入", { exact: true })).toHaveValue(
    "展开后的草稿",
  );
  await p.getByRole("button", { name: "打开会话列表", exact: true }).click();
  const selected = p.locator(".session-card.selected");
  await selected.getByRole("button", { name: /管理会话/ }).click();
  await p.getByRole("menuitem", { name: "重命名", exact: true }).click();
  await p.getByLabel("会话新名称").fill("我的原型故事");
  await p.getByRole("button", { name: "保存名称", exact: true }).click();
  await p.getByLabel("搜索会话").fill("我的原型");
  await expect(p.locator(".session-main")).toHaveCount(1);
  await p.locator(".session-main").click();
  await expect(p.locator("h1")).toHaveText("我的原型故事");
  await p.getByRole("button", { name: "外观设置", exact: true }).click();
  await p.getByRole("button", { name: "气泡式", exact: true }).click();
  await closeModal(p);
  await expect(p.locator(".reading-scroll")).toHaveClass(/bubble/);
  await context.close();
});
await check(
  "发送确认保护、重复发送阻止、首字等待停止、候选与继续",
  async () => {
    const { page: p, context } = await fresh();
    await scenario(p, "slow");
    await p.getByLabel("消息输入", { exact: true }).fill("请继续讲述");
    await p.getByRole("button", { name: "发送消息", exact: true }).click();
    await expect(
      p.getByRole("button", { name: "发送消息", exact: true }),
    ).toBeDisabled();
    await expect(p.getByLabel("消息输入", { exact: true })).toHaveValue("");
    await expect(p.getByText("等待回复", { exact: true })).toBeVisible();
    await expect(
      p.getByRole("button", { name: "下一个候选", exact: true }),
    ).toBeDisabled();
    await p.getByRole("button", { name: "停止生成", exact: true }).click();
    await expect(p.getByText("已停止", { exact: true })).toBeVisible();
    await p.getByRole("button", { name: "重新生成", exact: true }).click();
    await expect(p.locator(".candidate-count").last()).toHaveText("2 / 2");
    await p.getByRole("button", { name: "停止生成", exact: true }).click();
    await expect(
      p.getByRole("button", { name: "下一个候选", exact: true }),
    ).toBeEnabled();
    await p.getByRole("button", { name: "下一个候选", exact: true }).click();
    await expect(p.locator(".candidate-count").last()).toHaveText("1 / 2");
    const count = await p.locator(".message").count();
    await p.getByRole("button", { name: "让叙事者继续", exact: true }).click();
    await expect(p.locator(".message")).toHaveCount(count + 1);
    await p.getByRole("button", { name: "停止生成", exact: true }).click();
    await context.close();
  },
);
await check(
  "失败发送保留草稿，空输出失败选中新候选，部分回复保留",
  async () => {
    const { page: p, context } = await fresh();
    await scenario(p, "sendfail");
    await p.getByLabel("消息输入", { exact: true }).fill("不能丢失的草稿");
    await p.getByRole("button", { name: "发送消息", exact: true }).click();
    await expect(
      p.getByRole("status").filter({ hasText: "模拟发送未被接收" }),
    ).toBeVisible();
    await expect(p.getByLabel("消息输入", { exact: true })).toHaveValue(
      "不能丢失的草稿",
    );
    await expect(p.locator(".message")).toHaveCount(4);
    await scenario(p, "emptyfail");
    await p.getByRole("button", { name: "重新生成", exact: true }).click();
    await expect(p.locator(".message").last()).toContainText("生成失败");
    await expect(p.locator(".candidate-count").last()).toHaveText("3 / 3");
    await scenario(p, "partialfail");
    await p.getByRole("button", { name: "重新生成", exact: true }).click();
    await expect(p.locator(".message").last()).toContainText(
      "模拟 story-demo 连接中断",
      { timeout: 15000 },
    );
    await expect(
      p.locator(".message").last().locator(".prose-story"),
    ).not.toBeEmpty();
    await context.close();
  },
);
await check("编辑跳转三选项、取消确认、分支隔离和候选删除", async () => {
  const { page: p, context } = await fresh();
  await p
    .getByRole("button", { name: "第 1 条消息更多操作", exact: true })
    .click();
  await p.getByRole("menuitem", { name: "编辑消息", exact: true }).click();
  await p.getByLabel("编辑消息正文").fill("未保存的新设定");
  await p.getByRole("button", { name: "打开会话列表", exact: true }).click();
  await p.locator(".session-main").filter({ hasText: "山间来信" }).click();
  await expect(p.getByRole("dialog").last()).toContainText(
    "有一段修改尚未保存",
  );
  await p
    .getByRole("dialog")
    .last()
    .getByRole("button", { name: "取消", exact: true })
    .click();
  await expect(p.getByLabel("编辑消息正文")).toHaveValue("未保存的新设定");
  await closeModal(p);
  await p.getByRole("button", { name: "取消编辑", exact: true }).click();
  await p.getByRole("button", { name: "放弃修改", exact: true }).click();
  await p
    .getByRole("button", { name: "第 4 条消息更多操作", exact: true })
    .click();
  await p.getByRole("menuitem", { name: "从这里分支", exact: true }).click();
  await expect(p.locator("h1")).toHaveText("雨落在旧书店 Branch #1");
  await p.getByRole("button", { name: "下一个候选", exact: true }).click();
  const chosen = await p
    .locator(".message")
    .last()
    .locator(".prose-story")
    .innerText();
  await p.getByRole("button", { name: "管理候选", exact: true }).click();
  await p
    .getByRole("menuitem", { name: "删除候选 1 · 未选中", exact: true })
    .click();
  await expect(p.getByRole("dialog")).toContainText("当前选中的回复保持不变");
  await p.getByRole("button", { name: "确认删除候选", exact: true }).click();
  await expect(p.locator(".candidate-count")).toHaveText("1 / 1");
  await expect(p.locator(".message").last().locator(".prose-story")).toHaveText(
    chosen,
  );
  await p.getByRole("button", { name: "删除当前候选", exact: true }).click();
  await expect(p.getByRole("dialog")).toContainText("同时移除该 AI 消息");
  await p.getByRole("button", { name: "确认删除候选", exact: true }).click();
  await expect(p.locator(".message")).toHaveCount(3);
  await selectSession(p, "雨落在旧书店");
  await expect(p.locator("h1")).toHaveText("雨落在旧书店");
  await expect(p.locator(".message")).toHaveCount(4);
  await expect(p.locator(".candidate-count")).toHaveText("1 / 2");
  await context.close();
});
await check("历史删除范围、会话删除保留独立分支与重置", async () => {
  const { page: p, context } = await fresh();
  await p
    .getByRole("button", { name: "第 2 条消息更多操作", exact: true })
    .click();
  await p.getByRole("menuitem", { name: "从这里分支", exact: true }).click();
  await expect(p.locator("h1")).toContainText("Branch #1");
  await p
    .getByRole("button", { name: "第 1 条消息更多操作", exact: true })
    .click();
  await p
    .getByRole("menuitem", { name: "删除消息及后续", exact: true })
    .click();
  await expect(p.getByRole("dialog")).toContainText("共 2 条消息");
  await p.getByRole("button", { name: "确认删除消息", exact: true }).click();
  await expect(p.locator(".message")).toHaveCount(0);
  await p.getByRole("button", { name: "打开会话列表", exact: true }).click();
  await p
    .getByRole("button", { name: "管理会话 雨落在旧书店", exact: true })
    .click();
  await p.getByRole("menuitem", { name: "删除会话", exact: true }).click();
  await p
    .getByRole("dialog")
    .last()
    .getByRole("button", { name: "删除会话", exact: true })
    .click();
  await expect(
    p.locator(".session-main").filter({ hasText: "Branch #1" }),
  ).toHaveCount(1);
  await closeModal(p);
  await p.getByRole("button", { name: "演示场景", exact: true }).click();
  await p
    .getByRole("button", { name: "恢复初始演示数据", exact: true })
    .click();
  await p.getByRole("button", { name: "恢复初始数据", exact: true }).click();
  await expect(p.locator("h1")).toHaveText("雨落在旧书店");
  await expect(p.locator(".message")).toHaveCount(4);
  await context.close();
});
await check("连接配置、无连接拦截、模型列表失败与手填", async () => {
  const { page: p, context } = await fresh();
  await p.getByRole("button", { name: "演示场景", exact: true }).click();
  await p.getByRole("button", { name: "模拟未选择连接", exact: true }).click();
  await closeModal(p);
  await p.getByLabel("消息输入", { exact: true }).fill("无连接时保留");
  await p.getByRole("button", { name: "发送消息", exact: true }).click();
  await expect(p.locator(".message")).toHaveCount(4);
  await expect(p.getByLabel("消息输入", { exact: true })).toHaveValue(
    "无连接时保留",
  );
  await p.locator(".connection-trigger").click();
  await p.getByRole("button", { name: "添加演示连接", exact: true }).click();
  await p.getByLabel("连接名称", { exact: true }).fill("第二套演示");
  await p.getByText("原型演示响应", { exact: true }).click();
  await p
    .getByLabel("GET /models 模拟结果", { exact: true })
    .selectOption("failure");
  await p
    .getByRole("button", { name: "测试连接（刷新模型）", exact: true })
    .click();
  await expect(p.getByRole("status", { name: "连接测试状态" })).toContainText(
    "模拟模型列表获取失败",
  );
  await p.getByLabel("模型 ID", { exact: true }).fill("manual-demo");
  await p.getByRole("button", { name: "保存连接", exact: true }).click();
  await expect(p.getByText("第二套演示", { exact: true })).toBeVisible();
  await closeModal(p);
  await expect(
    p.getByRole("button", { name: "连接配置", exact: true }),
  ).toHaveAttribute("title", /manual-demo/);
  await context.close();
});
await check(
  "API Key 可空且不持久化，模型刷新成功、失败重试与空列表",
  async () => {
    const { page: p, context } = await fresh(390);
    await p.locator(".connection-trigger").click();
    await p.getByRole("button", { name: "添加演示连接", exact: true }).click();
    await p.getByLabel("连接名称", { exact: true }).fill("连接测试演示");
    const key = p.getByLabel("API Key（可留空）", { exact: true });
    await expect(key).toHaveAttribute("type", "password");
    await expect(
      p.getByText("未填写 API Key，不发送 Authorization 请求头", {
        exact: false,
      }),
    ).toBeVisible();
    await key.fill("prototype-browser-key");
    await p.getByRole("button", { name: "显示 API Key", exact: true }).click();
    await expect(key).toHaveAttribute("type", "text");
    await p.getByRole("button", { name: "隐藏 API Key", exact: true }).click();
    await expect(key).toHaveAttribute("type", "password");
    await p
      .getByLabel("模型 ID", { exact: true })
      .fill("manual-stays-selected");
    await p
      .getByRole("button", { name: "测试连接（刷新模型）", exact: true })
      .click();
    await expect(
      p.getByRole("button", { name: "正在测试连接…", exact: true }),
    ).toBeDisabled();
    await expect(p.getByRole("status", { name: "连接测试状态" })).toContainText(
      "模型列表已刷新（3 个）",
    );
    await expect(p.locator("#demo-models option")).toHaveCount(3);
    await expect(p.getByLabel("模型 ID", { exact: true })).toHaveValue(
      "manual-stays-selected",
    );
    await p.getByText("原型演示响应", { exact: true }).click();
    await p
      .getByLabel("GET /models 模拟结果", { exact: true })
      .selectOption("failure");
    await p
      .getByRole("button", { name: "测试连接（刷新模型）", exact: true })
      .click();
    await expect(p.getByRole("status", { name: "连接测试状态" })).toContainText(
      "模拟模型列表获取失败",
    );
    await p
      .getByLabel("GET /models 模拟结果", { exact: true })
      .selectOption("empty");
    await p
      .getByRole("button", { name: "重试连接（刷新模型）", exact: true })
      .click();
    await expect(p.getByRole("status", { name: "连接测试状态" })).toContainText(
      "模型列表为空",
    );
    await expect(p.locator("#demo-models option")).toHaveCount(0);
    await p
      .getByLabel("GET /models 模拟结果", { exact: true })
      .selectOption("success");
    await p
      .getByRole("button", { name: "测试连接（刷新模型）", exact: true })
      .click();
    await expect(p.locator("#demo-models option")).toHaveCount(3);
    await p.getByRole("button", { name: "保存连接", exact: true }).click();
    expect(
      await p.evaluate(() =>
        JSON.stringify({
          local: { ...localStorage },
          session: { ...sessionStorage },
        }),
      ),
    ).not.toContain("prototype-browser-key");
    await p
      .getByRole("button", { name: "编辑连接 连接测试演示", exact: true })
      .click();
    await expect(key).toHaveValue("prototype-browser-key");
    await closeModal(p);
    await p.reload();
    await p.locator(".connection-trigger").click();
    await p
      .getByRole("button", { name: "编辑连接 连接测试演示", exact: true })
      .click();
    await expect(
      p.getByLabel("API Key（可留空）", { exact: true }),
    ).toHaveValue("");
    await p.getByRole("button", { name: "保存连接", exact: true }).click();
    await expect(p.getByText("连接测试演示", { exact: true })).toBeVisible();
    await context.close();
  },
);
await check("修改连接地址取消旧模型刷新，防止迟到列表覆盖", async () => {
  const { page: p, context } = await fresh();
  await p.locator(".connection-trigger").click();
  await p.getByRole("button", { name: "添加演示连接", exact: true }).click();
  await p.clock.install({ time: new Date("2026-10-20T08:00:00Z") });
  await p.clock.pauseAt(new Date("2026-10-20T08:00:01Z"));
  await p
    .getByRole("button", { name: "测试连接（刷新模型）", exact: true })
    .click();
  await p
    .getByLabel("API Base URL（仅演示）", { exact: true })
    .fill("https://other.example.invalid/v1");
  await p.clock.runFor(1000);
  await expect(p.locator("#demo-models option")).toHaveCount(0);
  await expect(
    p.getByRole("status", { name: "连接测试状态" }),
  ).not.toBeVisible();
  await expect(p.locator(".model-endpoint")).toContainText(
    "https://other.example.invalid/v1/models",
  );
  await context.close();
});
await check("刷新中断恢复、上滑不跟随与断线保留", async () => {
  const { page: p, context } = await fresh(390);
  await p.getByRole("button", { name: "演示场景", exact: true }).click();
  await p.getByRole("button", { name: "模拟浏览器断线", exact: true }).click();
  await closeModal(p);
  await expect(
    p.getByText("连接已断开，正在重连", { exact: false }),
  ).toBeVisible();
  // Freeze at a known point inside the task; a completed task must not become
  // interrupted merely because the browser reloads later.
  await p.clock.install({ time: new Date("2026-10-20T07:00:00Z") });
  await p.clock.pauseAt(new Date("2026-10-20T07:00:01Z"));
  await p.getByRole("button", { name: "让叙事者继续", exact: true }).click();
  await p.clock.runFor(1200);
  await expect(
    p.locator(".message").last().locator(".prose-story"),
  ).not.toBeEmpty();
  await p.getByLabel("消息输入", { exact: true }).fill("生成期间编辑的草稿");
  await p.locator(".reading-scroll").evaluate((e) => {
    e.scrollTop = 0;
    e.dispatchEvent(new Event("scroll"));
  });
  await expect(
    p.getByRole("button", { name: "回到底部", exact: true }),
  ).toBeVisible();
  await p.reload();
  await expect(p.locator(".message").last()).toContainText("已中断");
  await expect(p.getByLabel("消息输入", { exact: true })).toHaveValue(
    "生成期间编辑的草稿",
  );
  await p.clock.runFor(32);
  expect(
    await p.locator(".reading-scroll").evaluate((e) => e.scrollTop),
  ).toBeLessThan(100);
  await context.close();
});
await check("桌面换行和中文输入法确认不会误发送", async () => {
  const { page: p, context } = await fresh();
  const input = p.getByLabel("消息输入", { exact: true });
  await input.fill("第一行");
  await input.press("Shift+Enter");
  await expect(p.locator(".message")).toHaveCount(4);
  await input.dispatchEvent("compositionstart");
  await input.dispatchEvent("keydown", {
    key: "Enter",
    code: "Enter",
    isComposing: true,
    keyCode: 229,
    bubbles: true,
  });
  await input.dispatchEvent("compositionend");
  await expect(p.locator(".message")).toHaveCount(4);
  await context.close();
});
await check("其他会话完成通知只跳转，省略提示不删除历史", async () => {
  const { page: p, context } = await fresh();
  await p.getByRole("button", { name: "演示场景", exact: true }).click();
  await p.getByRole("button", { name: "模拟上下文省略", exact: true }).click();
  await p
    .getByRole("button", { name: "模拟其他会话完成", exact: true })
    .click();
  await closeModal(p);
  await expect(p.locator("h1")).toHaveText("雨落在旧书店");
  await expect(p.locator(".message")).toHaveCount(4);
  await expect(p.locator(".context-note")).toBeVisible();
  await p.locator(".toast-link").click();
  await expect(p.locator("h1")).toHaveText("一封刚刚抵达的信");
  await context.close();
});
await check("主题预览路由往返后，主题响应和数据保存仍有效", async () => {
  const { page: p, context } = await fresh();
  await p.getByRole("button", { name: "外观设置", exact: true }).click();
  await p
    .getByRole("link", { name: "查看完整主题色板 ↗", exact: true })
    .click();
  await expect(p.locator("[data-palette]")).toHaveCount(12);
  await p.getByRole("button", { name: "打开外观设置", exact: true }).click();
  await p.getByRole("button", { name: "主题 藤", exact: true }).click();
  await p.getByRole("button", { name: "暗色", exact: true }).click();
  await closeModal(p);
  await expect(p.locator("html")).toHaveAttribute("data-theme", "fuji");
  await expect(p.locator("html")).toHaveClass("dark");
  await p.getByRole("link", { name: "返回故事", exact: false }).click();
  await expect(p.locator("h1")).toHaveText("雨落在旧书店");
  await p.getByLabel("消息输入", { exact: true }).fill("路由往返后的草稿");
  await p.reload();
  await expect(p.getByLabel("消息输入", { exact: true })).toHaveValue(
    "路由往返后的草稿",
  );
  await expect(p.locator("html")).toHaveAttribute("data-theme", "fuji");
  await expect(p.locator("html")).toHaveClass("dark");
  await context.close();
});
await check("多会话并行、停止后不再追加文字", async () => {
  const { page: p, context } = await fresh();
  await scenario(p, "slow");
  await p.getByRole("button", { name: "让叙事者继续", exact: true }).click();
  await selectSession(p, "山间来信");
  await p.getByRole("button", { name: "让叙事者继续", exact: true }).click();
  await p.getByRole("button", { name: "打开会话列表", exact: true }).click();
  await expect(
    p.locator(".session-meta").filter({ hasText: "正在生成" }),
  ).toHaveCount(2);
  await p
    .locator(".session-main")
    .filter({ has: p.getByText("山间来信", { exact: true }) })
    .click();
  await p.getByRole("button", { name: "停止生成", exact: true }).click();
  await expect(p.locator(".message").last()).toContainText("已停止");
  const before = await p.locator(".message").last().innerText();
  await p.waitForTimeout(1100);
  expect(await p.locator(".message").last().innerText()).toBe(before);
  await selectSession(p, "雨落在旧书店");
  await expect(
    p.getByRole("button", { name: "停止生成", exact: true }),
  ).toBeVisible();
  await p.getByRole("button", { name: "停止生成", exact: true }).click();
  await context.close();
});
await check("手机回车只换行、原始 Markdown 复制", async () => {
  const { page: p, context } = await fresh(390);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const input = p.getByLabel("消息输入", { exact: true });
  await input.fill("第一行");
  await input.press("Enter");
  await expect(input).toHaveValue("第一行\n");
  await expect(p.locator(".message")).toHaveCount(4);
  await p.getByRole("button", { name: "复制第 2 条消息", exact: true }).click();
  const text = await p.evaluate(() => navigator.clipboard.readText());
  expect(text).toContain("*门上的铜铃轻轻晃了一下。*");
  await context.close();
});
await check("连接配置入口：清晰文案、窄屏完整显示和键盘焦点", async () => {
  for (const [width, height] of [
    [360, 800],
    [390, 844],
    [549, 668],
    [1440, 1000],
  ]) {
    const { page: p, context } = await fresh(width);
    await p.setViewportSize({ width, height });
    const trigger = p.locator(".connection-trigger");
    await expect(trigger).toHaveAccessibleName("连接配置");
    await expect(trigger).toHaveText("连接配置");
    await expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    expect(
      await p
        .locator(".app-header")
        .evaluate((e) => e.scrollWidth <= e.clientWidth),
    ).toBe(true);
    expect(
      await trigger
        .locator("span")
        .evaluate((e) => e.scrollWidth <= e.clientWidth),
    ).toBe(true);
    await trigger.click();
    await expect(
      p.getByRole("heading", { name: "连接配置", exact: true }),
    ).toBeVisible();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await p.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await p.getByRole("button", { name: "演示场景", exact: true }).click();
    await p
      .getByRole("button", { name: "模拟未选择连接", exact: true })
      .click();
    await closeModal(p);
    await expect(trigger).toHaveText("连接配置");
    await trigger.click();
    await expect(
      p.getByRole("heading", { name: "连接配置", exact: true }),
    ).toBeVisible();
    await closeModal(p);
    await expect(p.locator(".modal")).not.toBeVisible();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await p.screenshot({ path: `${artifacts}/connection-entry-${width}.png` });
    await context.close();
  }
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});
await check("回到底部平滑滚动、主动中断与减少动态效果", async () => {
  const { page: p, context } = await fresh(390);
  await p.emulateMedia({ reducedMotion: "no-preference" });
  const area = p.locator(".reading-scroll");
  const resetTop = async () => {
    await area.evaluate((el) => {
      el.scrollTop = 0;
      el.dispatchEvent(new Event("scroll"));
    });
    await expect(
      p.getByRole("button", { name: "回到底部", exact: true }),
    ).toBeVisible();
  };
  await resetTop();
  await p.getByRole("button", { name: "回到底部", exact: true }).click();
  const intermediate = await area.evaluate(async (el) => {
    for (let i = 0; i < 60; i++) {
      await new Promise(requestAnimationFrame);
      const max = el.scrollHeight - el.clientHeight;
      if (el.scrollTop > 0 && el.scrollTop < max - 10) return true;
    }
    return false;
  });
  expect(intermediate).toBe(true);
  await expect
    .poll(() =>
      area.evaluate((el) => el.scrollHeight - el.clientHeight - el.scrollTop),
    )
    .toBeLessThan(2);
  await expect(
    p.getByRole("button", { name: "回到底部", exact: true }),
  ).toHaveCount(0);
  await resetTop();
  await p.getByRole("button", { name: "回到底部", exact: true }).click();
  await area.dispatchEvent("wheel", { deltaY: -100 });
  const stopped = await area.evaluate((el) => el.scrollTop);
  await p.waitForTimeout(700);
  expect(await area.evaluate((el) => el.scrollTop)).toBeCloseTo(stopped, 0);
  await expect(
    p.getByRole("button", { name: "回到底部", exact: true }),
  ).toBeVisible();
  await p.emulateMedia({ reducedMotion: "reduce" });
  await resetTop();
  await p.getByRole("button", { name: "回到底部", exact: true }).click();
  expect(
    await area.evaluate(
      (el) => el.scrollHeight - el.clientHeight - el.scrollTop,
    ),
  ).toBeLessThan(2);
  await context.close();
});
await check("会话搜索栏边框对齐与无外扩焦点框", async () => {
  for (const width of [360, 549, 1440]) {
    const { page: p, context } = await fresh(width);
    await p.getByRole("button", { name: "打开会话列表", exact: true }).click();
    const input = p.getByRole("textbox", { name: "搜索会话", exact: true });
    const button = p.getByRole("button", { name: "新会话", exact: true });
    await input.focus();
    const a = await input.boundingBox(),
      b = await button.boundingBox();
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect(Math.abs(a!.y - b!.y)).toBeLessThan(1);
    expect(Math.abs(a!.height - b!.height)).toBeLessThan(1);
    expect(
      await input.evaluate((el) => getComputedStyle(el).outlineStyle),
    ).toBe("none");
    await expect
      .poll(() => input.evaluate((el) => getComputedStyle(el).boxShadow))
      .toBe("none");
    await p.screenshot({
      path: `${artifacts}/session-search-focused-${width}.png`,
    });
    await p.keyboard.press("Tab");
    await expect(button).toBeFocused();
    expect(
      await button.evaluate((el) => getComputedStyle(el).outlineStyle),
    ).toBe("none");
    expect(
      await button.evaluate((el) => getComputedStyle(el).boxShadow),
    ).not.toBe("none");
    await p.screenshot({ path: `${artifacts}/session-toolbar-${width}.png` });
    await context.close();
  }
});
await check("所有文本输入统一使用边线焦点，无外扩色框", async () => {
  const { page: p, context } = await fresh(549);
  const verify = async (locator: ReturnType<Page["locator"]>) => {
    await locator.focus();
    await expect(locator).toBeFocused();
    await expect
      .poll(() => locator.evaluate((el) => getComputedStyle(el).boxShadow))
      .toBe("none");
    expect(
      await locator.evaluate((el) => getComputedStyle(el).outlineStyle),
    ).toBe("none");
  };
  await verify(p.getByLabel("消息输入", { exact: true }));
  expect(
    await p
      .locator(".composer")
      .evaluate((el) => getComputedStyle(el).boxShadow),
  ).not.toContain("0px 0px 0px 2px");
  await p.getByRole("button", { name: "全屏写作", exact: true }).click();
  await verify(p.getByLabel("全屏写作正文", { exact: true }));
  await p.getByRole("button", { name: "收起写作", exact: true }).click();
  await p
    .getByRole("button", { name: "第 1 条消息更多操作", exact: true })
    .click();
  await p.getByRole("menuitem", { name: "编辑消息", exact: true }).click();
  await verify(p.getByLabel("编辑消息正文"));
  await p.getByRole("button", { name: "取消编辑", exact: true }).click();
  await p.locator(".connection-trigger").click();
  await p.getByRole("button", { name: "添加演示连接", exact: true }).click();
  for (const id of [
    "connection-name",
    "connection-url",
    "api-key",
    "model-id",
  ]) {
    await verify(p.locator(`#${id}`));
  }
  await p.getByText("原型演示响应", { exact: true }).click();
  await verify(p.getByLabel("GET /models 模拟结果", { exact: true }));
  await p.screenshot({ path: `${artifacts}/connection-input-focus.png` });
  await closeModal(p);
  await p.goto(`${base}/themes`);
  for (const preview of await p.getByLabel("预览输入框").all())
    await verify(preview);
  expect(errors).toEqual([]);
  await context.close();
});
await check("运行期间无页面异常与外部模型请求", async () => {
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
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
