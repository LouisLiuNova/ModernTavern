<script setup lang="ts">
import {
  Plus,
  Trash2,
  Check,
  Pencil,
  PlugZap,
  Eye,
  EyeOff,
  RefreshCw,
  LoaderCircle,
  ChevronDown,
} from "lucide-vue-next";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../ui/dropdown-menu";
import { id } from "../../domain/chat";
import { useConnectionKeys } from "../../composables/useConnectionKeys";
import {
  requestPrototypeModels,
  type ModelResponse,
} from "../../domain/model-request";
import { modelsEndpoint } from "../../domain/models";
const { state, tell } = useChat();
const { getKey, hasKey, setKey, forgetKey } = useConnectionKeys();
const apiKey = ref(""),
  showKey = ref(false);
const editing = ref(false),
  editId = ref(""),
  name = ref(""),
  url = ref("https://example.invalid/v1"),
  model = ref("story-demo");
const modelOptions = ref<string[]>([]),
  testStatus = ref<"idle" | "loading" | "success" | "error">("idle"),
  testMessage = ref(""),
  simulatedResponse = ref<ModelResponse>("success");
const endpoint = computed(() => {
  try {
    return modelsEndpoint(url.value);
  } catch {
    return "";
  }
});
let testController: AbortController | undefined;
let testVersion = 0;
function invalidateTest() {
  testVersion++;
  testController?.abort();
  testController = undefined;
  testStatus.value = "idle";
  testMessage.value = "";
  modelOptions.value = [];
}
watch([url, apiKey], invalidateTest);
onUnmounted(() => {
  testVersion++;
  testController?.abort();
  apiKey.value = "";
});
async function testConnection() {
  if (testStatus.value === "loading" || !validateUrl()) return;
  const version = ++testVersion;
  testController?.abort();
  testController = new AbortController();
  testStatus.value = "loading";
  testMessage.value = "正在模拟 GET /models…";
  try {
    const result = await requestPrototypeModels({
      base: url.value,
      apiKey: apiKey.value,
      response: simulatedResponse.value,
      signal: testController.signal,
    });
    if (version !== testVersion) return;
    modelOptions.value = result.ids;
    testStatus.value = "success";
    testMessage.value = result.ids.length
      ? `模拟测试成功，模型列表已刷新（${result.ids.length} 个）。`
      : "模拟测试成功，但模型列表为空；可手动填写模型 ID。";
  } catch (error) {
    if (
      version !== testVersion ||
      (error instanceof DOMException && error.name === "AbortError")
    )
      return;
    testStatus.value = "error";
    modelOptions.value = [];
    testMessage.value = (error as Error).message;
  }
}
const urlError = ref("");
watch(url, () => {
  if (endpoint.value) urlError.value = "";
});
function validateUrl() {
  if (endpoint.value) return true;
  urlError.value = "地址必须以 http:// 或 https:// 开头，并包含有效主机名。";
  nextTick(() => document.getElementById("connection-url")?.focus());
  return false;
}
const pendingDelete = ref("");
function start(cid = "") {
  urlError.value = "";
  invalidateTest();
  simulatedResponse.value = "success";
  const c = state.connections.find((c) => c.id === cid);
  editId.value = cid;
  apiKey.value = getKey(cid);
  showKey.value = false;
  name.value = c?.name || "";
  url.value = c?.url || "https://example.invalid/v1";
  model.value = c?.model || "story-demo";
  editing.value = true;
}
function save() {
  if (!name.value.trim() || !model.value.trim()) return;
  if (!validateUrl()) return;
  const c = {
    id: editId.value || id(),
    name: name.value.trim(),
    url: url.value,
    model: model.value.trim(),
  };
  const i = state.connections.findIndex((x) => x.id === c.id);
  if (i >= 0) state.connections[i] = c;
  else state.connections.push(c);
  setKey(c.id, apiKey.value);
  apiKey.value = "";
  state.connection = c.id;
  invalidateTest();
  editing.value = false;
  tell("演示连接已保存，不会发起真实请求。");
}
</script>
<template>
  <div class="info-note">
    <PlugZap :size="17" /><span
      >这是本地交互原型，聊天仍使用模拟回复。API Key
      仅保留在当前页面会话，不写入浏览器持久存储，刷新后需重新输入。</span
    >
  </div>
  <template v-if="!editing"
    ><div class="connection-list">
      <article
        v-for="c in state.connections"
        :key="c.id"
        class="connection-card"
        :class="{ selected: state.connection === c.id }"
      >
        <button
          class="connection-main"
          :aria-pressed="state.connection === c.id"
          @click="state.connection = c.id"
        >
          <span class="connection-icon"><PlugZap :size="20" /></span
          ><span
            ><strong>{{ c.name }}</strong
            ><small
              >{{ c.model }} ·
              {{ hasKey(c.id) ? "已填写 API Key" : "未填写 API Key" }}</small
            ></span
          ><Check v-if="state.connection === c.id" :size="18" />
        </button>
        <div class="connection-actions">
          <Button
            variant="ghost"
            size="icon-sm"
            :aria-label="`编辑连接 ${c.name}`"
            @click="start(c.id)"
            ><Pencil /></Button
          ><Button
            variant="ghost"
            size="icon-sm"
            :aria-label="`删除连接 ${c.name}`"
            @click="pendingDelete = c.id"
            ><Trash2
          /></Button>
        </div>
        <div v-if="pendingDelete === c.id" class="inline-confirm">
          <p>删除此连接？新任务需要重新选择配置，已启动的模拟任务继续运行。</p>
          <Button
            variant="destructive"
            size="sm"
            @click="
              state.connections = state.connections.filter(
                (x) => x.id !== c.id,
              );
              forgetKey(c.id);
              pendingDelete = '';
            "
            >确认删除连接</Button
          ><Button variant="ghost" size="sm" @click="pendingDelete = ''"
            >取消</Button
          >
        </div>
      </article>
    </div>
    <p v-if="!state.connections.length" class="empty-note">
      还没有连接，先添加一个演示配置吧。
    </p>
    <Button variant="outline" class="w-full" @click="start()"
      ><Plus />添加演示连接</Button
    ></template
  >
  <form v-else class="stack-form" @submit.prevent="save">
    <label for="connection-name">连接名称</label
    ><Input
      id="connection-name"
      v-model="name"
      placeholder="例如：我的故事连接"
      required
      maxlength="100"
    /><label for="connection-url">API Base URL（仅演示）</label
    ><Input id="connection-url" v-model="url" type="url" required
      :aria-invalid="urlError ? true : undefined"
      :aria-describedby="urlError ? 'connection-url-error' : undefined" />
    <p v-if="urlError" id="connection-url-error" class="text-destructive text-sm" role="alert">{{ urlError }}</p>
    <label for="api-key">API Key（可留空）</label>
    <div class="connection-key-field">
      <Input
        id="api-key"
        v-model="apiKey"
        :type="showKey ? 'text' : 'password'"
        autocomplete="off"
        :spellcheck="false"
        placeholder="sk-…（无需鉴权时留空）"
      /><Button
        type="button"
        variant="ghost"
        size="icon"
        :aria-label="showKey ? '隐藏 API Key' : '显示 API Key'"
        :aria-pressed="showKey"
        @click="showKey = !showKey"
        ><EyeOff v-if="showKey" /><Eye v-else
      /></Button>
    </div>
    <small class="muted"
      >仅用于当前连接。留空时不发送 Authorization 请求头。</small
    ><label for="model-id">模型 ID</label
    >
    <div class="model-picker">
      <Input id="model-id" v-model="model" required />
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="选择已加载模型"
            :disabled="testStatus === 'loading'"
          ><ChevronDown /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent class="menu model-menu" align="end">
          <DropdownMenuItem
            v-for="option in modelOptions"
            :key="option"
            class="model-option"
            @select="model = option"
          >
            <Check v-if="model === option" :size="14" />
            <span>{{ option }}</span>
            <span v-if="model === option" class="muted">当前</span>
          </DropdownMenuItem>
          <DropdownMenuItem v-if="!modelOptions.length" disabled>
            {{ testStatus === 'success' ? '模型列表为空，可手动填写模型 ID。' : testStatus === 'error' ? '模型加载失败，请重试或手动填写。' : '请先测试连接以加载模型列表。' }}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
    <div class="model-test-row">
      <Button
        type="button"
        variant="outline"
        :disabled="testStatus === 'loading'"
        @click="testConnection"
        ><LoaderCircle v-if="testStatus === 'loading'" class="spin" /><RefreshCw
          v-else
        />{{
          testStatus === "loading"
            ? "正在测试连接…"
            : testStatus === "error"
              ? "重试连接（刷新模型）"
              : "测试连接（刷新模型）"
        }}</Button
      ><small class="muted">始终可手填模型 ID</small>
    </div>
    <p class="model-endpoint muted">
      模拟请求：GET {{ endpoint || "请先填写有效的 API Base URL" }}<br />{{
        apiKey.trim()
          ? "携带 Bearer 鉴权（密钥不展示）"
          : "未填写 API Key，不发送 Authorization 请求头"
      }}
    </p>
    <p
      v-if="testStatus !== 'idle'"
      role="status"
      aria-label="连接测试状态"
      class="status-note"
      :class="
        testStatus === 'error'
          ? 'warning'
          : testStatus === 'success'
            ? 'connection-success'
            : ''
      "
    >
      {{ testMessage }}
    </p>
    <details class="prototype-response">
      <summary>原型演示响应</summary>
      <label for="models-response">GET /models 模拟结果</label
      ><select
        id="models-response"
        v-model="simulatedResponse"
        :disabled="testStatus === 'loading'"
      >
        <option value="success">成功返回模型列表</option>
        <option value="failure">模型列表获取失败</option>
        <option value="empty">成功但列表为空</option></select
      ><small class="muted">此处只选择演示结果；点击测试连接才刷新列表。</small>
    </details>
    <div class="row end">
      <Button
        type="button"
        variant="ghost"
        @click="
          invalidateTest();
          editing = false;
          apiKey = '';
          showKey = false;
        "
        >取消</Button
      ><Button type="submit">保存连接</Button>
    </div>
  </form>
</template>
