export function modelsEndpoint(base: string): string {
  let url: URL;
  try {
    url = new URL(base.trim());
  } catch {
    throw Error("请填写有效的 API 地址。");
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  ) {
    throw Error("请使用 HTTP(S) API 地址，并在 API Key 输入框填写凭据。");
  }
  url.pathname = `${url.pathname.replace(/\/+$/, "")}/models`;
  url.hash = "";
  return url.toString();
}
export function modelIds(payload: unknown): string[] {
  if (
    !payload ||
    typeof payload !== "object" ||
    !("data" in payload) ||
    !Array.isArray(payload.data)
  ) {
    throw Error("模型列表格式不兼容：需要 data 数组。");
  }
  const ids: string[] = [];
  for (const entry of payload.data) {
    if (
      !entry ||
      typeof entry !== "object" ||
      typeof entry.id !== "string" ||
      !entry.id.trim()
    ) {
      throw Error("模型列表格式不兼容：模型缺少有效的 ID。");
    }
    if (!ids.includes(entry.id)) ids.push(entry.id);
  }
  return ids;
}

export function modelRequest(base: string, apiKey: string) {
  const headers: Record<string, string> = { Accept: "application/json" };
  const key = apiKey.trim();
  if (key) headers.Authorization = `Bearer ${key}`;
  return { endpoint: modelsEndpoint(base), method: "GET" as const, headers };
}
