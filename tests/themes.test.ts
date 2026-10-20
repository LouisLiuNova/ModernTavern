import { test, expect } from 'bun:test'
import { readFileSync } from 'node:fs'
import { themes, parseAppearance } from '../app/domain/appearance'
export function contrast(a:string,b:string){const lum=(h:string)=>{const c=h.match(/[a-f\d]{2}/gi)!.map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return c[0]!*.2126+c[1]!*.7152+c[2]!*.0722};const x=lum(a),y=lum(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
const css=readFileSync(new URL('../app/assets/css/themes.css',import.meta.url),'utf8')
for(const t of themes)for(const mode of ['light','dark'])test(`${t.id} ${mode}: 文字、按钮、焦点、边界与功能色对比度`,()=>{
 const block=css.split(`[data-theme="${t.id}"].${mode} {`)[1]!.split('}')[0]!
 const vars=Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[a-f\d]{6});/gi)].map(m=>[m[1],m[2]])) as Record<string,string>
 for(const bg of ['background','card','user-surface'])for(const fg of ['foreground','muted-foreground'])expect(contrast(vars[fg]!,vars[bg]!),`${fg}/${bg}`).toBeGreaterThanOrEqual(4.5)
 expect(contrast(vars.destructive!,vars['destructive-foreground']!),'danger button').toBeGreaterThanOrEqual(4.5)
 expect(contrast(vars.primary!,vars['primary-foreground']!),'primary text').toBeGreaterThanOrEqual(4.5)
 for(const bg of ['background','card'])for(const fg of ['border','ring'])expect(contrast(vars[fg]!,vars[bg]!),`${fg}/${bg}`).toBeGreaterThanOrEqual(3)
 for(const [fg,bg] of [['success','success-bg'],['info','info-bg'],['warning','warning-bg'],['destructive','danger-bg']])expect(contrast(vars[fg!]!,vars[bg!]!),`${fg}/${bg}`).toBeGreaterThanOrEqual(4.5)
})
test('损坏偏好按默认值恢复且限制字号宽度',()=>{const a=parseAppearance('{"theme":"unknown","mode":"bad","fontSize":100,"width":0}');expect(a.theme).toBe('seiji');expect(a.mode).toBe('system');expect(a.fontSize).toBe(22);expect(a.width).toBe(800)})
