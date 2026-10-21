import { modelRequest, modelIds } from "./models";

export type ModelResponse = "success" | "failure" | "empty";
export interface ModelRequest {
  base: string;
  apiKey: string;
  response: ModelResponse;
  signal?: AbortSignal;
}

// Prototype adapter: describe GET /models but perform no network operation.
// The key is never returned, logged, or stored in the result.
export async function requestPrototypeModels(request: ModelRequest) {
  const { endpoint } = modelRequest(request.base, request.apiKey);
  await new Promise<void>((resolve, reject) => {
    if (request.signal?.aborted) {
      reject(new DOMException("Cancelled", "AbortError"));
      return;
    }
    const abort = () => {
      clearTimeout(timer);
      reject(new DOMException("Cancelled", "AbortError"));
    };
    const timer = setTimeout(() => {
      request.signal?.removeEventListener("abort", abort);
      resolve();
    }, 650);
    request.signal?.addEventListener("abort", abort, { once: true });
  });
  if (request.response === "failure") {
    throw Error(
      "模拟模型列表获取失败，请检查地址或 API Key 后重试；也可手动填写模型 ID。",
    );
  }
  return {
    endpoint,
    ids: modelIds({
      data:
        request.response === "empty"
          ? []
          : [
              { id: "story-demo" },
              { id: "long-context-demo" },
              { id: "creative-demo" },
            ],
    }),
  };
}
