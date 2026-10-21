import { expect, test } from "bun:test";
import { useChat } from "../app/composables/useChat";
test("通知显式保留类型与跳转目标，不从文案猜测", () => {
  const { tell, notice } = useChat();
  tell("模拟保存失败", undefined, "error");
  expect(notice.value).toEqual({ text: "模拟保存失败", kind: "error", session: undefined });
  tell("故事已完成", "story-id", "success");
  expect(notice.value?.kind).toBe("success");
  expect(notice.value?.session).toBe("story-id");
  tell("这段信息含有失败二字");
  expect(notice.value?.kind).toBe("info");
});
