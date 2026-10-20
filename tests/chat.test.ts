import { test, expect } from "bun:test";
import {
  seed,
  newSession,
  message,
  send,
  begin,
  busy,
  candidate,
  content,
  deleteCandidate,
  switchCandidate,
  branch,
  edit,
  deleteFrom,
  parseState,
} from "../app/domain/chat";
test("接收确认后清空草稿，新增用户与空 AI 候选", () => {
  const s = newSession();
  s.draft = "第一句";
  const c = send(s, s.draft);
  expect(s.draft).toBe("");
  expect(s.messages).toHaveLength(2);
  expect(content(s.messages[0]!)).toBe("第一句");
  expect(c.status).toBe("waiting");
  expect(c.text).toBe("");
});
test("同会话互斥，禁止修改、切换、删除和再次生成", () => {
  const s = seed().sessions[0]!;
  begin(s, true);
  expect(busy(s)).toBe(true);
  for (const fn of [
    () => send(s, "重复"),
    () => begin(s),
    () => edit(s, s.messages[0]!.id, "改"),
    () => deleteFrom(s, s.messages[0]!.id),
    () => switchCandidate(s, 1),
    () => deleteCandidate(s, 0),
  ])
    expect(fn).toThrow();
});
test("不同会话可以独立生成", () => {
  const a = newSession(),
    b = newSession();
  send(a, "甲");
  send(b, "乙");
  expect(busy(a) && busy(b)).toBe(true);
});
test("重新生成保留旧候选，失败空候选仍选中", () => {
  const s = seed().sessions[0]!;
  const m = s.messages.at(-1)!;
  const before = m.candidates.length;
  const c = begin(s, true);
  c.status = "failed";
  expect(m.candidates).toHaveLength(before + 1);
  expect(candidate(m)).toBe(c);
  expect(content(m)).toBe("");
  switchCandidate(s, -1);
  expect(m.selected).toBe(before - 1);
});
test("候选循环切换不新增内容", () => {
  const s = seed().sessions[0]!;
  const m = s.messages.at(-1)!;
  switchCandidate(s, -1);
  expect(m.selected).toBe(1);
  switchCandidate(s, 1);
  expect(m.selected).toBe(0);
  expect(m.candidates).toHaveLength(2);
});
test("删除选中项后循环选下一个，删到最后移除 AI 消息", () => {
  const s = seed().sessions[0]!;
  const m = s.messages.at(-1)!;
  m.selected = 1;
  deleteCandidate(s, 1);
  expect(m.selected).toBe(0);
  expect(m.candidates).toHaveLength(1);
  deleteCandidate(s, 0);
  expect(s.messages.at(-1)!.role).toBe("user");
});
test("删除未选中候选保持原选择的对象", () => {
  const s = seed().sessions[0]!;
  const m = s.messages.at(-1)!;
  m.selected = 1;
  const chosen = candidate(m);
  deleteCandidate(s, 0);
  expect(candidate(m)).toBe(chosen);
});
test("继续新增一条 AI，不追加原回复", () => {
  const s = seed().sessions[0]!;
  const m = s.messages.at(-1)!;
  const old = content(m),
    count = s.messages.length;
  begin(s);
  expect(s.messages).toHaveLength(count + 1);
  expect(content(m)).toBe(old);
  expect(s.messages.at(-1)).not.toBe(m);
});
test("分支包含全部候选、保留选择，两侧修改互不影响", () => {
  const s = seed().sessions[0]!;
  const m = s.messages.at(-1)!;
  m.selected = 1;
  const b = branch(s, m.id);
  expect(b.messages.at(-1)!.selected).toBe(1);
  expect(b.messages.at(-1)!.candidates).toHaveLength(2);
  edit(b, b.messages.at(-1)!.id, "另一种可能");
  expect(content(m)).not.toBe("另一种可能");
  deleteFrom(b, b.messages[0]!.id);
  expect(s.messages).toHaveLength(4);
});
test("分支编号按源递增，分支再分支独立计数", () => {
  const s = seed().sessions[0]!;
  const a = branch(s, s.messages[0]!.id);
  const b = branch(s, s.messages[0]!.id);
  expect(a.name).toEndWith("Branch #1");
  expect(b.name).toEndWith("Branch #2");
  expect(branch(a, a.messages[0]!.id).name).toEndWith("Branch #1");
});
test("生成中可从已完成历史分支，不能从进行中消息分支", () => {
  const s = seed().sessions[0]!;
  begin(s);
  expect(() => branch(s, s.messages[0]!.id)).not.toThrow();
  expect(() => branch(s, s.messages.at(-1)!.id)).toThrow();
});
test("历史编辑保留后续，范围删除移除对应消息及后续", () => {
  const s = seed().sessions[0]!;
  edit(s, s.messages[0]!.id, "修改");
  expect(s.messages).toHaveLength(4);
  deleteFrom(s, s.messages[2]!.id);
  expect(s.messages).toHaveLength(2);
});
test("刷新恢复保留文字与草稿，并中断未完成任务", () => {
  const state = seed(),
    s = state.sessions[0]!;
  const c = begin(s, true);
  c.text = "收到一半";
  c.status = "streaming";
  s.draft = "下一段";
  s.position = 123;
  const r = parseState(JSON.stringify(state));
  const rs = r.sessions[0]!;
  expect(candidate(rs.messages.at(-1)!)!.status).toBe("interrupted");
  expect(content(rs.messages.at(-1)!)).toBe("收到一半");
  expect(rs.draft).toBe("下一段");
  expect(rs.position).toBe(123);
  expect(busy(rs)).toBe(false);
});
test("损坏嵌套数据拒绝恢复，不将无效候选带入界面", () => {
  const state = seed();
  state.sessions[0]!.messages.at(-1)!.selected = 99;
  expect(() => parseState(JSON.stringify(state))).toThrow();
  expect(() => parseState('{"version":1}')).toThrow();
});
test("无会话可恢复，当前会话不存在时选首个", () => {
  const s = seed();
  s.current = "不存在";
  expect(parseState(JSON.stringify(s)).current).toBe(s.sessions[0]!.id);
  s.sessions = [];
  expect(parseState(JSON.stringify(s)).current).toBe("");
});
test("空输入和非法历史操作不会产生新消息", () => {
  const s = newSession();
  expect(() => send(s, "  ")).toThrow();
  expect(s.messages).toHaveLength(0);
  expect(() => begin(s, true)).toThrow();
  s.messages.push(message("user", "hi"));
  expect(() => deleteCandidate(s, 0)).toThrow();
  expect(() => deleteFrom(s, "none")).toThrow();
});

test("模拟任务返回可观察的候选，文字和终态即时通知界面", async () => {
  const { reactive, watch } = await import("vue");
  const s = reactive(seed().sessions[0]!);
  let observed = "";
  const c = begin(s, true);
  const stop = watch(
    () =>
      `${candidate(s.messages.at(-1)!)!.status}:${content(s.messages.at(-1)!)}`,
    (v) => (observed = v),
    { flush: "sync" },
  );
  c.status = "streaming";
  c.text = "新文字";
  expect(observed).toBe("streaming:新文字");
  c.status = "failed";
  expect(observed).toBe("failed:新文字");
  stop();
  const fresh = reactive(newSession());
  const nc = send(fresh, "开场");
  let text = "";
  const unwatch = watch(
    () => content(fresh.messages.at(-1)!),
    (v) => (text = v),
    { flush: "sync" },
  );
  nc.text = "第一段";
  expect(text).toBe("第一段");
  unwatch();
});
