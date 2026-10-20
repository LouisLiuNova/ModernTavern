import tailwindcss from "@tailwindcss/vite";
export default defineNuxtConfig({
  compatibilityDate: "2026-10-20",
  ssr: false,
  components: [{ path: "~/components", extensions: [".vue"] }],
  devtools: { enabled: false },
  css: ["~/assets/css/main.css"],
  vite: { plugins: [tailwindcss()] },
  nitro: { preset: "bun" },
  app: {
    head: {
      htmlAttrs: { lang: "zh-CN" },
      title: "ModernTavern · 续写每一种可能",
      script: [{ src: "/theme-init.js", tagPosition: "head" }],
      meta: [
        {
          name: "description",
          content: "日本传统色与长文阅读交互原型，仅使用本地模拟数据。",
        },
      ],
    },
  },
});
