<script setup lang="ts">
import {
  Search,
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
function rename(s: Session) {
  if (name.value.trim()) s.name = name.value.trim();
  renaming.value = "";
}
</script>
<template>
  <div class="row">
    <div class="search-box">
      <Search :size="17" /><Input
        v-model="query"
        aria-label="搜索会话"
        placeholder="寻找一段故事……"
      />
    </div>
    <Button @click="emit('create')"><Plus />新会话</Button>
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
          v-model="name"
          aria-label="会话新名称"
          maxlength="120"
          required
        /><Button size="sm" type="submit">保存名称</Button
        ><Button size="sm" variant="ghost" type="button" @click="renaming = ''"
          >取消</Button
        >
      </form>
      <template v-else
        ><button class="session-main" @click="emit('select', s.id)">
          <span class="session-top"
            ><strong>{{ s.name }}</strong
            ><time>{{
              new Date(s.updated).toLocaleTimeString("zh-CN", {
                hour: "2-digit",
                minute: "2-digit",
              })
            }}</time></span
          ><span class="session-preview">{{
            s.messages.length
              ? content(s.messages.at(-1)!)
              : "尚未开始，故事在等你。"
          }}</span
          ><span class="session-meta"
            ><LoaderCircle v-if="busy(s)" :size="12" class="spin" /><span
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
              ><MoreHorizontal /></Button></DropdownMenuTrigger
          ><DropdownMenuContent class="menu" align="end"
            ><DropdownMenuItem
              @select="
                renaming = s.id;
                name = s.name;
              "
              ><Pencil />重命名</DropdownMenuItem
            ><DropdownMenuItem class="danger-text" @select="emit('remove', s)"
              ><Trash2 />删除会话</DropdownMenuItem
            ></DropdownMenuContent
          ></DropdownMenu
        ></template
      >
    </article>
    <p v-if="!filtered.length" class="empty-note">
      {{ query ? "没有找到这段故事。" : "还没有会话，开始写下第一句吧。" }}
    </p>
  </div>
</template>
