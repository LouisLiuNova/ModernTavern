<script setup lang="ts">
import {
  Search,
  Check,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  GitBranch,
  LoaderCircle,
} from "lucide-vue-next";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../ui/dropdown-menu";
import { markdownPreview } from "../../domain/markdown";
import { content, busy, type Session } from "../../domain/chat";
const { state, sorted } = useChat();
const emit = defineEmits<{
  select: [sid: string];
  create: [];
  remove: [s: Session];
}>();
const query = ref(""),
  renaming = ref(""),
  name = ref("");
const filtered = computed(() =>
  sorted.value.filter((s) =>
    s.name.toLowerCase().includes(query.value.toLowerCase()),
  ),
);
const duplicateNumbers = computed(() => {
  const groups = new Map<string, Session[]>();
  for (const s of state.sessions) {
    const group = groups.get(s.name);
    if (group) group.push(s);
    else groups.set(s.name, [s]);
  }
  const numbers = new Map<string, number>();
  for (const group of groups.values()) {
    if (group.length > 1) group.forEach((s, index) => numbers.set(s.id, index + 1));
  }
  return numbers;
});
const dateFormat = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
});
function startRename(s: Session) {
  renaming.value = s.id;
  name.value = s.name;
  nextTick(() => {
    const field = document.getElementById("session-rename-name") as HTMLInputElement | null;
    field?.focus();
    field?.select();
  });
}
function finishRename(s: Session) {
  renaming.value = "";
  nextTick(() => document.querySelector<HTMLButtonElement>(`[data-session-manage="${s.id}"]`)?.focus());
}
function rename(s: Session) {
  if (name.value.trim()) s.name = name.value.trim();
  finishRename(s);
}
</script>
<template>
  <div class="row session-toolbar">
    <div class="search-box">
      <Search :size="17" /><Input
        v-model="query"
        aria-label="搜索会话"
        placeholder="按会话名称搜索……"
      />
    </div>
    <Button @click="query = ''; emit('create')"><Plus />新建会话</Button>
  </div>
  <div class="session-list">
    <article
      v-for="s in filtered"
      :key="s.id"
      class="session-card"
      :class="{ selected: state.current === s.id }"
    >
      <form
        v-if="renaming === s.id"
        class="row p-3"
        @submit.prevent="rename(s)"
      >
        <Input
          id="session-rename-name"
          v-model="name"
          aria-label="会话新名称"
          maxlength="120"
          required
        /><Button size="sm" type="submit">保存名称</Button
        ><Button size="sm" variant="ghost" type="button" @click="finishRename(s)"
          >取消</Button
        >
      </form>
      <template v-else
        ><button class="session-main" :aria-current="state.current === s.id ? 'true' : undefined" @click="emit('select', s.id)">
          <span class="session-top"
            ><strong>{{ s.name }}</strong
            ><span v-if="state.current === s.id" class="session-current"><Check :size="12" />当前</span></span>
          <time class="session-time" :datetime="new Date(s.updated).toISOString()">{{ dateFormat.format(s.updated) }}</time>
          <span class="session-preview">{{
            s.messages.length
              ? markdownPreview(content(s.messages.at(-1)!)) || "此回复未收到文字。"
              : "尚未开始，故事在等你。"
          }}</span
          ><span class="session-meta"
            ><span v-if="duplicateNumbers.has(s.id)">同名会话 {{ duplicateNumbers.get(s.id) }}</span><LoaderCircle v-if="busy(s)" :size="12" class="spin" /><span
              v-if="busy(s)"
              >正在生成</span
            ><span v-else-if="s.unread" class="unread-dot" /><span
              v-if="s.unread && !busy(s)"
              >未读回复</span
            ><GitBranch v-if="s.name.includes('Branch #')" :size="12" /><span
              >{{ s.messages.length }} 条消息</span
            ></span
          ></button
        ><DropdownMenu
          ><DropdownMenuTrigger as-child
            ><Button
              variant="ghost"
              size="icon-sm"
              :aria-label="`管理会话 ${s.name}`"
              :data-session-manage="s.id"
              ><MoreHorizontal /></Button></DropdownMenuTrigger
          ><DropdownMenuContent class="menu" align="end" @close-auto-focus="renaming && $event.preventDefault()"
            ><DropdownMenuItem
              @select="startRename(s)"
              ><Pencil />重命名会话</DropdownMenuItem
            ><DropdownMenuItem class="danger-text" @select="emit('remove', s)"
              ><Trash2 />删除会话</DropdownMenuItem
            ></DropdownMenuContent
          ></DropdownMenu
        ></template
      >
    </article>
    <p v-if="!filtered.length" class="empty-note">
      {{ query ? "没有找到匹配的会话。" : "还没有会话，开始写下第一句吧。" }}
    </p>
    <div v-if="query && !filtered.length" class="row end"><Button variant="outline" @click="query = ''">清空搜索</Button></div>
  </div>
</template>
