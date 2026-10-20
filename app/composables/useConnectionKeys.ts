import { reactive } from "vue";

// Credentials are deliberately separate from the persisted chat/config state.
// Only the current page session owns them; never serialize this map.
const keys = reactive(new Map<string, string>());
export function useConnectionKeys() {
  return {
    getKey: (id: string) => keys.get(id) || "",
    hasKey: (id: string) => keys.has(id),
    setKey(id: string, value: string) {
      const key = value.trim();
      if (key) keys.set(id, key);
      else keys.delete(id);
    },
    forgetKey: (id: string) => keys.delete(id),
    clearKeys: () => keys.clear(),
  };
}
