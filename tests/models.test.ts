import { test, expect } from "bun:test";
import { modelsEndpoint, modelIds } from "../app/domain/models";
import { useConnectionKeys } from "../app/composables/useConnectionKeys";
import { seed } from "../app/domain/chat";
test("在配置的 Base URL 后追加 /models，并保留 /v1 路径", () => {
  expect(modelsEndpoint("https://example.invalid/v1/")).toBe(
    "https://example.invalid/v1/models",
  );
  expect(modelsEndpoint("http://localhost:9000")).toBe(
    "http://localhost:9000/models",
  );
  expect(() => modelsEndpoint("file:///tmp/test")).toThrow();
  expect(() => modelsEndpoint("https://user:pass@example.invalid")).toThrow();
});
test("解析模型 ID 列表并去重，不改变服务商顺序", () => {
  expect(
    modelIds({
      data: [{ id: "model-b" }, { id: "model-a" }, { id: "model-b" }],
    }),
  ).toEqual(["model-b", "model-a"]);
  expect(modelIds({ data: [] })).toEqual([]);
  expect(() => modelIds({ models: [] })).toThrow();
  expect(() => modelIds({ data: [{}] })).toThrow();
});
test("API Key 可留空，仅存于独立内存，不进入持久化配置对象", () => {
  const keys = useConnectionKeys();
  keys.clearKeys();
  const state = seed();
  keys.setKey(state.connection, "prototype-test-key");
  expect(keys.getKey(state.connection)).toBe("prototype-test-key");
  expect(JSON.stringify(state)).not.toContain("prototype-test-key");
  keys.setKey(state.connection, "");
  expect(keys.hasKey(state.connection)).toBe(false);
  keys.setKey("other", "prototype-test-key");
  keys.clearKeys();
  expect(keys.getKey("other")).toBe("");
});

test("可空 API Key：GET /models 仅在非空时携带 Bearer 头", async () => {
  const { modelRequest } = await import("../app/domain/models");
  expect(
    modelRequest("https://example.invalid/v1", "").headers,
  ).not.toHaveProperty("Authorization");
  const request = modelRequest(
    "https://example.invalid/v1",
    " prototype-test-key ",
  );
  expect(request.method).toBe("GET");
  expect(request.headers.Authorization).toBe("Bearer prototype-test-key");
});
test("模拟 /models 成功、空列表与失败，不回传凭据", async () => {
  const { requestPrototypeModels } = await import(
    "../app/domain/model-request"
  );
  const input = {
    base: "https://example.invalid/v1",
    apiKey: "prototype-test-key",
    response: "success" as const,
  };
  const result = await requestPrototypeModels(input);
  expect(result.ids).toHaveLength(3);
  expect(JSON.stringify(result)).not.toContain("prototype-test-key");
  expect(
    (await requestPrototypeModels({ ...input, response: "empty" })).ids,
  ).toEqual([]);
  await expect(
    requestPrototypeModels({ ...input, response: "failure" }),
  ).rejects.toThrow("模拟模型列表获取失败");
});
test("已取消的模型刷新不返回迟到列表", async () => {
  const { requestPrototypeModels } = await import(
    "../app/domain/model-request"
  );
  const controller = new AbortController();
  const pending = requestPrototypeModels({
    base: "https://example.invalid",
    apiKey: "",
    response: "success",
    signal: controller.signal,
  });
  controller.abort();
  await expect(pending).rejects.toHaveProperty("name", "AbortError");
});
