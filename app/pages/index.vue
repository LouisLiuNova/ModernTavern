<script setup lang="ts">
import {
  BookOpen,
  ChevronDown,
  PlugZap,
  Palette,
  FlaskConical,
  ArrowDown,
  Plus,
  X,
  CircleAlert,
  WifiOff,
  Feather,
  Sparkles,
  Circle,
} from "lucide-vue-next";
import { useAppearance } from "../composables/useAppearance";
import { useChat } from "../composables/useChat";
import { Button } from "../components/ui/button";
import Modal from "../components/prototype/Modal.vue";
import AppearancePanel from "../components/prototype/AppearancePanel.vue";
import ConnectionPanel from "../components/prototype/ConnectionPanel.vue";
import SessionPanel from "../components/prototype/SessionPanel.vue";
import MessageCard from "../components/prototype/MessageCard.vue";
import Composer from "../components/prototype/Composer.vue";
import {
  busy,
  content,
  candidate,
  switchCandidate,
  deleteCandidate,
  edit,
  deleteFrom,
  branch,
  newSession,
  message,
  type Message,
  type Session,
} from "../domain/chat";
const { appearance, storageError: appearanceError } = useAppearance();
const {
  state,
  current,
  connection,
  storageError,
  notice,
  scenario,
  disconnected,
  truncated,
  accepting,
  select,
  create,
  submit,
  generate,
  stop,
  remove,
  reset,
  tell,
} = useChat();
const panel = ref<
  "sessions" | "connection" | "appearance" | "scenarios" | null
>(null);
const scroller = ref<HTMLElement>(),
  following = ref(true),
  editing = ref(""),
  editText = ref("");
const locked = computed(
  () =>
    !!current.value && (busy(current.value) || accepting.has(current.value.id)),
);
const confirmation = ref<{
  title: string;
  detail: string;
  label: string;
  run: () => void | Promise<void>;
  alternate?: () => void;
  danger?: boolean;
  save?: boolean;
} | null>(null);
const confirmRunning = ref(false);
function attempt(fn: () => void) {
  try {
    fn();
  } catch (e) {
    tell((e as Error).message);
  }
}
function clearEdit() {
  editing.value = "";
  editText.value = "";
}
function original() {
  return current.value?.messages.find((m) => m.id === editing.value);
}
function saveEdit() {
  const m = original();
  if (!m || !current.value) throw Error("消息已不存在。");
  edit(current.value, m.id, editText.value);
  clearEdit();
}
function guard(next: () => void) {
  const m = original();
  if (m && editText.value !== content(m)) {
    confirmation.value = {
      title: "有一段修改尚未保存",
      detail:
        "你可以保存后继续、放弃修改，或取消本次跳转。后续回复不会重新计算。",
      label: "保存并继续",
      save: true,
      run: () => {
        saveEdit();
        next();
      },
      alternate: () => {
        clearEdit();
        next();
      },
    };
  } else {
    clearEdit();
    next();
  }
}
function jumpBottom() {
  following.value = true;
  nextTick(() => {
    const el = scroller.value;
    if (el) el.scrollTop = el.scrollHeight;
  });
}
function switchSession(sid: string) {
  guard(() => {
    select(sid);
    panel.value = null;
  });
}
function createSession() {
  guard(() => {
    create();
    panel.value = null;
    following.value = true;
  });
}
function askDeleteSession(s: Session) {
  confirmation.value = {
    title: "删除这段会话？",
    detail: `“${s.name}”的消息、候选和本地草稿将被删除。${busy(s) ? "正在进行的生成会先停止。" : ""}已创建的独立分支会保留。`,
    label: "删除会话",
    danger: true,
    run: async () => {
      await remove(s);
      clearEdit();
    },
  };
}
async function confirm() {
  const c = confirmation.value;
  if (!c || confirmRunning.value) return;
  confirmRunning.value = true;
  try {
    await c.run();
    confirmation.value = null;
  } catch (e) {
    tell((e as Error).message);
  } finally {
    confirmRunning.value = false;
  }
}
function action(a: string, m: Message) {
  const s = current.value;
  if (!s) return;
  attempt(() => {
    if (a === "copy-failed") {
      tell("复制失败，请检查浏览器剪贴板权限。");
      return;
    }
    if (a === "edit") {
      guard(() => {
        editing.value = m.id;
        editText.value = content(m);
      });
      return;
    }
    if (a === "save-edit") {
      saveEdit();
      return;
    }
    if (a === "cancel-edit") {
      if (editText.value !== content(m))
        confirmation.value = {
          title: "放弃这次修改？",
          detail: "未保存的编辑将被丢弃，消息恢复为原文。",
          label: "放弃修改",
          danger: true,
          run: clearEdit,
        };
      else clearEdit();
      return;
    }
    if (a === "branch") {
      guard(() => {
        const b = branch(s, m.id);
        state.sessions.unshift(b);
        select(b.id);
        tell("已进入独立分支，原会话保持完整。");
      });
      return;
    }
    if (a === "delete") {
      const i = s.messages.findIndex((x) => x.id === m.id);
      confirmation.value = {
        title: "删除消息及其后续？",
        detail: `将删除第 ${i + 1} 条消息及其后续，共 ${s.messages.length - i} 条消息，包含这些消息的全部候选。此操作不可撤销，独立分支不受影响。`,
        label: "确认删除消息",
        danger: true,
        run: () => {
          deleteFrom(s, m.id);
          clearEdit();
        },
      };
      return;
    }
    if (a === "delete-candidate" || a.startsWith("delete-candidate:")) {
      const index =
        a === "delete-candidate" ? m.selected : Number(a.split(":")[1]);
      confirmation.value = {
        title:
          s.messages.at(-1)!.candidates.length === 1
            ? "删除最后一个候选？"
            : `删除候选 ${index + 1}？`,
        detail:
          s.messages.at(-1)!.candidates.length === 1
            ? "这会同时移除该 AI 消息，相当于这层 AI 回复未发生过。"
            : index === m.selected
              ? "删除当前候选后会循环选择下一个候选，不会请求模型。"
              : "只删除此未选中候选，当前选中的回复保持不变。",
        label: "确认删除候选",
        danger: true,
        run: () => deleteCandidate(s, index),
      };
      return;
    }
    if (a === "previous" || a === "next")
      switchCandidate(s, a === "previous" ? -1 : 1);
    if (a === "regenerate") {
      guard(() => {
        generate(true);
        jumpBottom();
      });
    }
  });
}
function askReset() {
  panel.value = null;
  confirmation.value = {
    title: "恢复初始演示数据？",
    detail:
      "将清除本原型中的会话、草稿、连接与外观设置，重新载入示例。此操作不可撤销。",
    label: "恢复初始数据",
    danger: true,
    run: () => {
      clearEdit();
      reset();
      jumpBottom();
    },
  };
}
function onScroll() {
  const el = scroller.value;
  if (!el || restoring) return;
  following.value = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  if (current.value) current.value.position = el.scrollTop;
}
let restoring = false;
async function restore() {
  restoring = true;
  await nextTick();
  const el = scroller.value;
  if (el) {
    el.scrollTop = current.value?.position || 0;
    following.value = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }
  requestAnimationFrame(() => {
    restoring = false;
  });
}
watch(() => state.current, restore);
watch(
  () => current.value?.messages.map((m) => content(m)).join(""),
  () => {
    if (following.value && !restoring) jumpBottom();
  },
);
onMounted(() => {
  restore();
  const read = () => {
    if (document.visibilityState === "visible" && current.value)
      current.value.unread = false;
  };
  read();
  document.addEventListener("visibilitychange", read);
  onUnmounted(() => document.removeEventListener("visibilitychange", read));
});
function sendMessage() {
  guard(() => {
    following.value = true;
    void submit();
    jumpBottom();
  });
}
function continueStory() {
  guard(() => {
    generate();
    jumpBottom();
  });
}
function completeElsewhere() {
  const s = newSession("一封刚刚抵达的信");
  s.messages = [
    message(
      "assistant",
      "*信封上有一枚蓝色的邮票。*\n\n“山里的花开了。若你有空，来坐坐吧。”",
    ),
  ];
  s.unread = true;
  state.sessions.unshift(s);
  tell(`${s.name}：回复已完成`, s.id);
}
</script>
<template>
  <div class="app-shell">
    <header class="app-header">
      <button
        class="brand"
        aria-label="打开会话列表"
        @click="panel = 'sessions'"
      >
        <span class="brand-mark"
          ><BookOpen :size="21" :stroke-width="1.5" /></span
        ><span
          >Modern<span class="brand-light">Tavern</span
          ><small>留白之间，故事发生</small></span
        >
      </button>
      <div class="header-actions">
        <Button
          variant="outline"
          class="connection-trigger"
          aria-label="连接配置"
          aria-haspopup="dialog"
          :aria-expanded="panel === 'connection'"
          :title="
            connection
              ? `管理 API 地址、密钥与模型 · 当前模型：${connection.model}`
              : '添加和管理 API 地址、密钥与模型'
          "
          @click="panel = 'connection'"
          ><PlugZap :size="16" /><span>连接配置</span
          ><ChevronDown class="connection-chevron" :size="13" /></Button
        ><span class="header-divider" /><Button
          variant="ghost"
          size="icon"
          aria-label="外观设置"
          @click="panel = 'appearance'"
          ><Palette /></Button
        ><Button
          variant="ghost"
          size="icon"
          aria-label="演示场景"
          @click="panel = 'scenarios'"
          ><FlaskConical
        /></Button>
      </div>
    </header>
    <div
      v-if="storageError || appearanceError"
      class="storage-warning"
      role="alert"
    >
      <CircleAlert :size="16" />{{ storageError || appearanceError }}
    </div>
    <div v-if="disconnected" class="connection-banner" role="status">
      <WifiOff :size="15" />连接已断开，正在重连 · 已有文字与草稿保留<Button
        variant="ghost"
        size="sm"
        @click="
          disconnected = false;
          tell('连接已恢复，已同步模拟任务状态。');
        "
        >恢复连接</Button
      >
    </div>
    <main
      ref="scroller"
      class="reading-scroll"
      :class="appearance.layout"
      @scroll.passive="onScroll"
    >
      <div class="story-container">
        <div class="story-heading">
          <div class="story-eyebrow">
            <span class="tiny-rule" /> YOUR STORY, UNFOLDING
          </div>
          <div class="story-title-row">
            <button class="story-title" @click="panel = 'sessions'">
              <h1>{{ current?.name || "故事，从这里开始" }}</h1>
              <ChevronDown :size="18" /></button
            ><Button
              variant="ghost"
              size="icon"
              aria-label="新建会话"
              @click="createSession"
              ><Plus
            /></Button>
          </div>
          <div class="story-subtitle">
            <BookOpen :size="13" /><span>{{
              appearance.layout === "reading" ? "阅读式" : "气泡式"
            }}</span
            ><span>·</span
            ><span>{{ current?.messages.length || 0 }} 条消息</span
            ><span class="story-subtitle-right">一段对话，无限可能</span>
          </div>
        </div>
        <div v-if="truncated" class="context-note">
          <CircleAlert :size="15" />上下文已省略最早的 2
          条消息，完整历史仍保留。<button
            class="text-link"
            @click="
              tell('演示省略范围：第 1–2 条消息。本原型不执行真实 token 估算。')
            "
          >
            查看范围
          </button>
        </div>
        <template v-if="current?.messages.length"
          ><MessageCard
            v-for="(m, i) in current.messages"
            :key="m.id"
            :message="m"
            :index="i"
            :last="i === current.messages.length - 1"
            :locked="locked"
            :editing="editing === m.id"
            :edit-text="editText"
            @update:edit-text="editText = $event"
            @action="action" />
          <div class="story-end"><span /><Feather :size="14" /><span /></div
        ></template>
        <div v-else class="empty-story">
          <span class="empty-illustration"
            ><Feather :size="40" :stroke-width="1"
          /></span>
          <p class="story-eyebrow">A NEW CHAPTER</p>
          <h2>每个故事，都始于一句话。</h2>
          <p>写下一个场景、一位旅人，<br />或只是此刻，掠过脑海的想象。</p>
          <Button v-if="!current" variant="outline" @click="createSession"
            ><Plus />开始新的会话</Button
          ><button
            v-else
            class="prompt-card"
            @click="
              current.draft =
                '夜色渐深，我推开了山间旅店的门。请从店主的视角，慢慢讲述这个故事。'
            "
          >
            “夜色渐深，我推开了山间旅店的门……”<Sparkles :size="16" />
          </button>
        </div>
      </div>
    </main>
    <div class="composer-dock">
      <Button
        v-if="!following && current?.messages.length"
        class="jump-bottom"
        variant="outline"
        size="sm"
        @click="jumpBottom"
        ><ArrowDown />回到底部</Button
      ><Composer
        v-if="current"
        :model-value="current.draft"
        :locked="busy(current)"
        :accepting="accepting.has(current.id)"
        :has-messages="!!current.messages.length"
        :last-role="current.messages.at(-1)?.role"
        @update:model-value="current.draft = $event"
        @send="sendMessage"
        @generate="continueStory"
        @stop="stop()"
      />
      <div v-else class="empty-composer">
        <Button @click="createSession"><Plus />新建会话，开始写作</Button>
      </div>
      <p class="prototype-footnote">
        <Circle :size="6" fill="currentColor" />本地交互原型 · 不会调用真实模型
      </p>
    </div>
    <Transition name="toast"
      ><aside v-if="notice" class="toast" role="status">
        <span class="toast-icon"><CheckIcon /></span
        ><button
          v-if="notice.session"
          class="toast-link"
          @click="
            switchSession(notice.session);
            notice = null;
          "
        >
          {{ notice.text }}<span>查看会话 →</span></button
        ><span v-else>{{ notice.text }}</span
        ><Button
          variant="ghost"
          size="icon-sm"
          aria-label="关闭通知"
          @click="notice = null"
          ><X
        /></Button></aside
    ></Transition>
    <Modal
      :open="panel === 'sessions'"
      title="你的故事"
      description="每一种可能，都值得留下。"
      wide
      @update:open="panel = $event ? 'sessions' : null"
      ><SessionPanel
        @select="switchSession"
        @create="createSession"
        @remove="askDeleteSession"
    /></Modal>
    <Modal
      :open="panel === 'connection'"
      title="连接配置"
      description="管理 API 地址、密钥与模型。当前配置仅供模拟演示。"
      @update:open="panel = $event ? 'connection' : null"
      ><ConnectionPanel
    /></Modal>
    <Modal
      :open="panel === 'appearance'"
      title="阅读与外观"
      description="选一种心境，让文字有自己的温度。"
      wide
      @update:open="panel = $event ? 'appearance' : null"
      ><AppearancePanel @reset="askReset"
    /></Modal>
    <Modal
      :open="panel === 'scenarios'"
      title="演示场景"
      description="以下控件仅用于验收模拟状态，不代表真实服务能力。"
      @update:open="panel = $event ? 'scenarios' : null"
      ><div class="stack-form">
        <label for="scenario">下一次模拟生成</label
        ><select id="scenario" v-model="scenario">
          <option value="normal">正常回复</option>
          <option value="slow">等待首字（8 秒，可停止）</option>
          <option value="sendfail">发送未被接收（保留草稿）</option>
          <option value="emptyfail">无输出失败（保留空候选）</option>
          <option value="partialfail">部分输出后失败</option>
        </select>
        <p class="muted">选择只影响之后启动的任务，不自动触发生成。</p>
        <Button variant="outline" @click="disconnected = !disconnected">{{
          disconnected ? "恢复连接" : "模拟浏览器断线"
        }}</Button
        ><Button variant="outline" @click="completeElsewhere"
          >模拟其他会话完成</Button
        ><Button variant="outline" @click="truncated = !truncated">{{
          truncated ? "隐藏上下文提示" : "模拟上下文省略"
        }}</Button
        ><Button
          variant="outline"
          @click="
            state.connection = '';
            tell('未选择连接，新任务将被阻止。');
          "
          >模拟未选择连接</Button
        ><Button
          variant="outline"
          @click="tell('模拟本地保存失败：本次仅展示错误，未破坏浏览器数据。')"
          >预览存储失败反馈</Button
        ><Button variant="ghost" @click="askReset">恢复初始演示数据</Button>
      </div></Modal
    >
    <Modal
      :open="!!confirmation"
      :title="confirmation?.title || '确认操作'"
      :description="confirmation?.detail"
      @update:open="
        (value) => {
          if (!value && !confirmRunning) confirmation = null;
        }
      "
      ><div class="confirm-actions">
        <Button
          variant="ghost"
          :disabled="confirmRunning"
          @click="confirmation = null"
          >取消</Button
        ><Button
          v-if="confirmation?.alternate"
          variant="outline"
          :disabled="confirmRunning"
          @click="
            confirmation.alternate();
            confirmation = null;
          "
          >放弃并继续</Button
        ><Button
          :variant="confirmation?.danger ? 'destructive' : 'default'"
          :disabled="confirmRunning || !!(confirmation?.save && locked)"
          @click="confirm"
          >{{ confirmRunning ? "处理中…" : confirmation?.label }}</Button
        >
      </div>
      <p v-if="confirmation?.save && locked" class="muted">
        当前会话正在生成，暂时不能保存修改；可以放弃修改或取消跳转。
      </p></Modal
    >
  </div>
</template>
<script lang="ts">
import { Check as CheckIcon } from "lucide-vue-next";
</script>
