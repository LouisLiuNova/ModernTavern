<script setup lang="ts">
import MarkdownIt from "markdown-it";
import {
  Copy,
  MoreHorizontal,
  Pencil,
  GitBranch,
  Trash2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Check,
  UserRound,
  Feather,
  LoaderCircle,
  CircleAlert,
} from "lucide-vue-next";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "../ui/dropdown-menu";
import { Textarea } from "../ui/textarea";
import { candidate, content, active, type Message } from "../../domain/chat";
const props = defineProps<{
  message: Message;
  last: boolean;
  locked: boolean;
  editing: boolean;
  editText: string;
  index: number;
}>();
const emit = defineEmits<{
  action: [action: string, message: Message];
  "update:editText": [text: string];
}>();
const md = new MarkdownIt({ html: false, linkify: false, breaks: true });
const rendered = computed(() => md.render(content(props.message)));
const c = computed(() => candidate(props.message)),
  copied = ref(false);
const labels: Record<string, string> = {
  waiting: "等待回复",
  streaming: "正在生成",
  stopping: "正在停止并保存",
  complete: "",
  stopped: "已停止",
  failed: "生成失败",
  interrupted: "已中断",
};
async function copy() {
  try {
    await navigator.clipboard.writeText(content(props.message));
    copied.value = true;
    setTimeout(() => (copied.value = false), 1600);
  } catch {
    emit("action", "copy-failed", props.message);
  }
}
</script>
<template>
  <article
    :id="`message-${message.id}`"
    class="message"
    :class="[message.role, { 'is-editing': editing }]"
    :data-message-id="message.id"
  >
    <div class="message-heading">
      <span class="identity"
        ><span class="avatar" :class="message.role"
          ><UserRound v-if="message.role === 'user'" :size="14" /><Feather
            v-else
            :size="15" /></span
        >{{ message.role === "user" ? "你" : "叙事者" }}</span
      ><span class="message-number">{{
        String(index + 1).padStart(2, "0")
      }}</span>
    </div>
    <template v-if="editing"
      ><p class="edit-warning">修改历史内容不会重新计算后续回复。</p>
      <Textarea
        :model-value="editText"
        class="edit-textarea"
        aria-label="编辑消息正文"
        @update:model-value="emit('update:editText', String($event))"
      />
      <div class="row end">
        <Button
          variant="ghost"
          size="sm"
          @click="emit('action', 'cancel-edit', message)"
          >取消编辑</Button
        ><Button
          size="sm"
          :disabled="locked"
          @click="emit('action', 'save-edit', message)"
          >保存修改</Button
        >
      </div>
      <small v-if="locked" class="muted"
        >生成期间保留编辑文本，暂时不能保存。</small
      ></template
    >
    <template v-else
      ><div v-if="content(message)" class="prose-story" v-html="rendered" />
      <div v-else-if="c && active(c)" class="waiting-dots" aria-live="polite">
        <span /><span /><span />{{ labels[c.status] }}
      </div>
      <p v-else class="empty-candidate">
        此候选没有收到文字，已保留其状态。
      </p></template
    >
    <div
      v-if="
        c &&
        c.status !== 'complete' &&
        !(c.status === 'waiting' && !content(message))
      "
      class="generation-state"
      :class="{ danger: c.status === 'failed' || c.status === 'interrupted' }"
      role="status"
    >
      <LoaderCircle v-if="active(c)" :size="13" class="spin" /><CircleAlert
        v-else
        :size="13"
      />{{ labels[c.status] }}<span v-if="c.error"> · {{ c.error }}</span>
    </div>
    <footer v-if="!editing" class="message-tools">
      <div class="row gap-small">
        <Button
          variant="ghost"
          size="icon-sm"
          :aria-label="`复制第 ${index + 1} 条消息`"
          @click="copy"
          ><Check v-if="copied" /><Copy v-else /></Button
        ><DropdownMenu
          ><DropdownMenuTrigger as-child
            ><Button
              variant="ghost"
              size="icon-sm"
              :aria-label="`第 ${index + 1} 条消息更多操作`"
              ><MoreHorizontal /></Button></DropdownMenuTrigger
          ><DropdownMenuContent align="start" class="menu"
            ><DropdownMenuItem
              :disabled="locked"
              @select="emit('action', 'edit', message)"
              ><Pencil />编辑消息</DropdownMenuItem
            ><DropdownMenuItem
              :disabled="message.candidates.some(active)"
              @select="emit('action', 'branch', message)"
              ><GitBranch />从这里分支</DropdownMenuItem
            ><DropdownMenuSeparator /><DropdownMenuItem
              :disabled="locked"
              class="danger-text"
              @select="emit('action', 'delete', message)"
              ><Trash2 />删除消息及后续</DropdownMenuItem
            ></DropdownMenuContent
          ></DropdownMenu
        >
      </div>
      <div
        v-if="last && message.role === 'assistant'"
        class="candidate-controls"
      >
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="上一个候选"
          :disabled="locked"
          @click="emit('action', 'previous', message)"
          ><ChevronLeft /></Button
        ><DropdownMenu
          ><DropdownMenuTrigger as-child
            ><button
              class="candidate-count"
              aria-label="管理候选"
              :disabled="locked"
            >
              {{ message.selected + 1 }} / {{ message.candidates.length }}
            </button></DropdownMenuTrigger
          ><DropdownMenuContent class="menu" align="end"
            ><DropdownMenuItem
              v-for="(option, ci) in message.candidates"
              :key="option.id"
              class="danger-text"
              @select="emit('action', `delete-candidate:${ci}`, message)"
              ><Trash2 />删除候选 {{ ci + 1 }} ·
              {{
                ci === message.selected ? "当前" : "未选中"
              }}</DropdownMenuItem
            ></DropdownMenuContent
          ></DropdownMenu
        ><Button
          variant="ghost"
          size="icon-sm"
          aria-label="下一个候选"
          :disabled="locked"
          @click="emit('action', 'next', message)"
          ><ChevronRight /></Button
        ><span class="tool-divider" /><Button
          variant="ghost"
          size="sm"
          :disabled="locked"
          @click="emit('action', 'regenerate', message)"
          ><RefreshCw /><span class="regenerate-label">重新生成</span></Button
        ><Button
          variant="ghost"
          size="icon-sm"
          aria-label="删除当前候选"
          :disabled="locked"
          @click="emit('action', 'delete-candidate', message)"
          ><Trash2
        /></Button>
      </div>
    </footer>
  </article>
</template>
