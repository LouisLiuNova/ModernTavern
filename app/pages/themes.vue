<script setup lang="ts">
import {
  CircleCheck,
  Info,
  TriangleAlert,
  CircleAlert,
  ArrowLeft,
} from "lucide-vue-next";
import { themes } from "../domain/appearance";
import AppearancePanel from "../components/prototype/AppearancePanel.vue";
import Modal from "../components/prototype/Modal.vue";
import { Button } from "../components/ui/button";
useAppearance();
const showSettings = ref(false);
</script>
<template>
  <main class="theme-preview">
    <NuxtLink to="/" class="text-link row"
      ><ArrowLeft :size="15" />返回故事</NuxtLink
    >
    <h1>十二种光线，六种心境。</h1>
    <p class="muted">开发预览 · 日本传统色的亮暗色板，文字、表面与功能状态。</p>
    <Button variant="outline" class="mt-4" @click="showSettings = true"
      >打开外观设置</Button
    >
    <div class="preview-grid">
      <template v-for="t in themes" :key="t.id"
        ><section
          v-for="mode in ['light', 'dark'] as const"
          :key="`${t.id}-${mode}`"
          class="palette-preview"
          :class="mode"
          :data-theme="t.id"
          :data-palette="`${t.id}-${mode}`"
        >
          <h2>
            {{ t.name }}
            <small
              >{{ t.ruby }} · {{ mode === "light" ? "亮色" : "暗色" }}</small
            >
          </h2>
          <p>主题基准 {{ t.color }} · 正文与辅助文字</p>
          <div class="sample-message user">你：我推开了旧书店的门。</div>
          <div class="sample-message">叙事者：雨声渐远，故事正缓缓展开。</div>
          <div class="preview-buttons">
            <Button>主要操作</Button><Button variant="outline">次要操作</Button
            ><Button variant="ghost">轻量操作</Button
            ><Button disabled>已禁用</Button>
          </div>
          <input aria-label="预览输入框" placeholder="在此检查输入与键盘焦点" />
          <div class="semantic-samples">
            <span class="status-success"
              ><CircleCheck :size="13" class="inline" /> 已保存</span
            ><span class="status-info"
              ><Info :size="13" class="inline" /> 正在同步</span
            ><span class="status-warning"
              ><TriangleAlert :size="13" class="inline" /> 上下文省略</span
            ><span class="status-danger"
              ><CircleAlert :size="13" class="inline" /> 生成失败</span
            >
          </div>
          <Button variant="destructive">危险操作</Button>
        </section></template
      >
    </div>
    <Modal v-model:open="showSettings" title="阅读与外观" wide
      ><AppearancePanel @reset="showSettings = false"
    /></Modal>
  </main>
</template>
