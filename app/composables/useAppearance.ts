import { reactive, watch, ref, effectScope } from "vue";
import { defaults, parseAppearance } from "../domain/appearance";
const appearance = reactive({ ...defaults });
let initialized = false;
const storageError = ref("");
export function useAppearance() {
  if (import.meta.client && !initialized) {
    initialized = true;
    try {
      const raw = localStorage.getItem("moderntavern.appearance.v1");
      if (raw) Object.assign(appearance, parseAppearance(raw));
    } catch {
      storageError.value = "外观设置无法恢复，已使用默认设置。";
    }
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark =
        appearance.mode === "dark" ||
        (appearance.mode === "system" && media.matches);
      document.documentElement.dataset.theme = appearance.theme;
      document.documentElement.classList.toggle("dark", dark);
      document.documentElement.classList.toggle("light", !dark);
      document.documentElement.style.setProperty(
        "--reading-size",
        `${appearance.fontSize}px`,
      );
      document.documentElement.style.setProperty(
        "--reading-width",
        `${appearance.width}px`,
      );
    };
    media.addEventListener("change", apply);
    effectScope(true).run(() =>
      watch(
        appearance,
        () => {
          apply();
          try {
            localStorage.setItem(
              "moderntavern.appearance.v1",
              JSON.stringify(appearance),
            );
          } catch {
            storageError.value = "外观设置未能保存，请检查浏览器存储空间。";
          }
        },
        { deep: true },
      ),
    );
    apply();
  }
  return { appearance, storageError };
}
