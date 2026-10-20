<script setup lang="ts">
import {
  Check,
  Sun,
  Moon,
  Monitor,
  BookOpen,
  MessagesSquare,
  Palette,
  RotateCcw,
} from "lucide-vue-next";
import { themes } from "../../domain/appearance";
import { Button } from "../ui/button";
const { appearance: a } = useAppearance();
defineEmits<{ reset: [] }>();
</script>
<template>
  <div class="settings-section">
    <div class="section-label">
      <Palette :size="15" />日本传统色<span>六种心境，一段故事</span>
    </div>
    <div class="theme-grid">
      <button
        v-for="t in themes"
        :key="t.id"
        class="theme-option"
        :class="{ selected: a.theme === t.id }"
        :aria-pressed="a.theme === t.id"
        :aria-label="`主题 ${t.name}`"
        @click="a.theme = t.id"
      >
        <span class="theme-swatch" :style="{ background: t.color }"
          ><Check v-if="a.theme === t.id" :size="18" /></span
        ><span class="theme-name"
          >{{ t.name }}<small>{{ t.ruby }}</small></span
        ><span class="theme-note">{{ t.note }}</span>
      </button>
    </div>
  </div>
  <div class="settings-section">
    <label class="section-label">显示模式</label>
    <div class="segmented">
      <button
        v-for="m in [
          ['light', '亮色', Sun],
          ['dark', '暗色', Moon],
          ['system', '跟随系统', Monitor],
        ] as const"
        :key="m[0]"
        :class="{ selected: a.mode === m[0] }"
        :aria-pressed="a.mode === m[0]"
        @click="a.mode = m[0]"
      >
        <component :is="m[2]" :size="16" />{{ m[1] }}
      </button>
    </div>
  </div>
  <div class="settings-section">
    <label class="section-label">消息布局</label>
    <div class="segmented">
      <button
        :class="{ selected: a.layout === 'reading' }"
        :aria-pressed="a.layout === 'reading'"
        @click="a.layout = 'reading'"
      >
        <BookOpen :size="16" />阅读式</button
      ><button
        :class="{ selected: a.layout === 'bubble' }"
        :aria-pressed="a.layout === 'bubble'"
        @click="a.layout = 'bubble'"
      >
        <MessagesSquare :size="16" />气泡式
      </button>
    </div>
  </div>
  <div class="settings-section range-setting">
    <label for="font-size"
      >正文字号 <b>{{ a.fontSize }} px</b></label
    ><input
      id="font-size"
      v-model.number="a.fontSize"
      type="range"
      min="14"
      max="22"
    /><label for="body-width"
      >正文宽度 <b>{{ a.width }} px</b></label
    ><input
      id="body-width"
      v-model.number="a.width"
      type="range"
      min="640"
      max="1040"
      step="40"
    />
  </div>
  <div class="setting-row">
    <div>
      <b>平滑输出</b>
      <p class="muted">轻缓呈现文字，不让故事匆忙。</p>
    </div>
    <button
      class="toggle"
      role="switch"
      :aria-checked="a.smooth"
      aria-label="平滑输出"
      @click="a.smooth = !a.smooth"
    >
      <span />
    </button>
  </div>
  <div class="settings-footer">
    <NuxtLink to="/themes" class="text-link">查看完整主题色板 ↗</NuxtLink
    ><Button variant="ghost" size="sm" @click="$emit('reset')"
      ><RotateCcw />恢复初始数据</Button
    >
  </div>
</template>
