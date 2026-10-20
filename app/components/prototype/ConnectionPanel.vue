<script setup lang="ts">
import { Plus, Trash2, Check, Pencil, PlugZap } from "lucide-vue-next";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { id } from "../../domain/chat";
const { state, tell } = useChat();
const editing = ref(false),
  editId = ref(""),
  name = ref(""),
  url = ref("https://example.invalid/v1"),
  model = ref("story-demo"),
  modelsFailed = ref(false);
const pendingDelete = ref("");
function start(cid = "") {
  const c = state.connections.find((c) => c.id === cid);
  editId.value = cid;
  name.value = c?.name || "";
  url.value = c?.url || "https://example.invalid/v1";
  model.value = c?.model || "story-demo";
  editing.value = true;
}
function save() {
  if (!name.value.trim() || !model.value.trim()) return;
  try {
    const u = new URL(url.value);
    if (!["https:", "http:"].includes(u.protocol)) throw Error();
  } catch {
    tell("请填写有效的 HTTP(S) 演示地址。");
    return;
  }
  const c = {
    id: editId.value || id(),
    name: name.value.trim(),
    url: url.value,
    model: model.value.trim(),
  };
  const i = state.connections.findIndex((x) => x.id === c.id);
  if (i >= 0) state.connections[i] = c;
  else state.connections.push(c);
  state.connection = c.id;
  editing.value = false;
  tell("演示连接已保存，不会发起真实请求。");
}
</script>
<template>
  <div class="info-note">
    <PlugZap :size="17" /><span
      >这是本地原型。地址和模型仅用于演示，不会联网调用，也不接收真实 API
      key。</span
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
            ><small>{{ c.model }} · 演示凭据 ••••</small></span
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
    /><label for="connection-url">API 地址（仅演示）</label
    ><Input id="connection-url" v-model="url" type="url" required /><label
      for="model-id"
      >模型 ID</label
    ><Input
      id="model-id"
      v-model="model"
      list="demo-models"
      required
    /><datalist v-if="!modelsFailed" id="demo-models">
      <option value="story-demo" />
      <option value="long-context-demo" />
    </datalist>
    <div class="row">
      <Button
        type="button"
        variant="outline"
        size="sm"
        @click="modelsFailed = !modelsFailed"
        >{{ modelsFailed ? "重试获取模型列表" : "模拟模型列表失败" }}</Button
      ><small class="muted">始终可手动填写</small>
    </div>
    <p v-if="modelsFailed" class="status-note warning">
      模型列表获取失败。请手动填写模型 ID，或点击重试。
    </p>
    <div class="row end">
      <Button type="button" variant="ghost" @click="editing = false"
        >取消</Button
      ><Button type="submit">保存连接</Button>
    </div>
  </form>
</template>
