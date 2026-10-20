export const themes = [
  {
    id: "kohbai",
    name: "紅梅",
    ruby: "KOHBAI",
    color: "#E16B8C",
    note: "春日的一抹温柔",
  },
  {
    id: "kikuchiba",
    name: "黄朽葉",
    ruby: "KIKUCHIBA",
    color: "#D9AB42",
    note: "纸页里的秋日微光",
  },
  {
    id: "matsuba",
    name: "松葉",
    ruby: "MATSUBA",
    color: "#42602D",
    note: "山间，安静的绿意",
  },
  {
    id: "seiji",
    name: "青磁",
    ruby: "SEIJI",
    color: "#69B0AC",
    note: "如雨后般清透",
  },
  {
    id: "hanada",
    name: "縹",
    ruby: "HANADA",
    color: "#006284",
    note: "暮色与远处的海",
  },
  {
    id: "fuji",
    name: "藤",
    ruby: "FUJI",
    color: "#8B81C3",
    note: "晚风里的淡紫花影",
  },
] as const;
export type Theme = (typeof themes)[number]["id"];
export interface Appearance {
  theme: Theme;
  mode: "light" | "dark" | "system";
  layout: "reading" | "bubble";
  fontSize: number;
  width: number;
  smooth: boolean;
}
export const defaults: Appearance = {
  theme: "seiji",
  mode: "system",
  layout: "reading",
  fontSize: 17,
  width: 800,
  smooth: true,
};
export function parseAppearance(raw: string): Appearance {
  const x = JSON.parse(raw);
  return {
    theme: themes.some((t) => t.id === x.theme) ? x.theme : defaults.theme,
    mode: ["light", "dark", "system"].includes(x.mode) ? x.mode : "system",
    layout: x.layout === "bubble" ? "bubble" : "reading",
    fontSize: Math.max(14, Math.min(22, Number(x.fontSize) || 17)),
    width: Math.max(640, Math.min(1040, Number(x.width) || 800)),
    smooth: typeof x.smooth === "boolean" ? x.smooth : true,
  };
}
