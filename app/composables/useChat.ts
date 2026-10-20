import { useAppearance } from './useAppearance'
import { reactive, computed, ref, watch } from 'vue'
import { seed, parseState, send, begin, busy, touch, newSession, id, type Session, type Candidate, type ChatState } from '../domain/chat'
const state=reactive<ChatState>(seed())
const storageError=ref(''), notice=ref<{text:string;session?:string}|null>(null), disconnected=ref(false), truncated=ref(false)
const scenario=ref('normal'), accepting=reactive(new Set<string>())
const timers=new Map<string,ReturnType<typeof setTimeout>>()
let initialized=false
export function useChat(){
 if(import.meta.client&&!initialized){
  initialized=true
  try{const raw=localStorage.getItem('moderntavern.chat.v1');if(raw)Object.assign(state,parseState(raw))}catch{storageError.value='本地记录无法读取，正在显示演示数据。原记录暂未覆盖；可恢复初始数据。'}
  watch(state,()=>{try{localStorage.setItem('moderntavern.chat.v1',JSON.stringify(state))}catch{storageError.value='本地保存失败，刷新可能丢失本次修改。请检查浏览器存储空间。'}},{deep:true})
 }
 const current=computed(()=>state.sessions.find(s=>s.id===state.current))
 const connection=computed(()=>state.connections.find(c=>c.id===state.connection))
 const sorted=computed(()=>[...state.sessions].sort((a,b)=>b.updated-a.updated))
 function tell(text:string,session?:string){notice.value={text,session}}
 function select(sid:string){state.current=sid;const s=state.sessions.find(s=>s.id===sid);if(s)s.unread=false}
 function create(){const s=newSession();state.sessions.unshift(s);select(s.id);return s}
 function finish(s:Session,c:Candidate,status:Candidate['status'],error?:string){
  c.status=status;c.error=error;timers.delete(s.id);touch(s)
  const visible=state.current===s.id&&document.visibilityState==='visible'
  s.unread=!visible
  if(!visible)tell(`${s.name}：${status==='complete'?'回复已完成':status==='stopped'?'生成已停止':'生成已中断'}`,s.id)
 }
 function run(s:Session,c:Candidate,mode:string){
  // Snapshot: later configuration changes do not alter this simulated task.
  const taskModel=connection.value?.model||'story-demo'
  const text=`*窗外的雨渐渐轻了，檐下的水珠仍有一搭没一搭地落着。*\n\n他在你对面坐下来，指尖轻轻停在那张车票的边缘。\n\n“那是很久以前，一个客人留下的。”他望向窗外，像是在辨认一条已经走远的路，“他说，有些地方，只有错过一班车才会遇见。”\n\n茶杯上方升起一缕细细的热气。你翻开书页，看见页脚一行铅笔写的小字：\n\n> 不必急着抵达。故事会在途中等你。\n\n*他没有催促你，只把灯调得更暖了一点。*`
  let offset=0
  const tick=()=>{
   if(!state.sessions.includes(s)||!['waiting','streaming'].includes(c.status))return
   if(mode==='emptyfail'){finish(s,c,'failed','模拟供应商错误：未收到输出。可重新生成新候选。');return}
   c.status='streaming'
   const smooth=useAppearance().appearance.smooth
   offset+=smooth?14:56;c.text=text.slice(0,offset)
   if(mode==='partialfail'&&offset>120){finish(s,c,'failed',`模拟 ${taskModel} 连接中断，已保留部分回复。`);return}
   if(offset>=text.length){finish(s,c,'complete');return}
   timers.set(s.id,setTimeout(tick,smooth?55:190))
  }
  timers.set(s.id,setTimeout(tick,mode==='slow'?8000:900))
 }
 async function submit(){
  const s=current.value;if(!s||busy(s)||accepting.has(s.id))return
  if(!connection.value){tell('请先在“连接”中选择演示配置。');return}
  const text=s.draft;if(!text.trim())return
  const mode=scenario.value;accepting.add(s.id)
  await new Promise(r=>setTimeout(r,450))
  try{
   if(!state.sessions.includes(s))return
   if(mode==='sendfail'){tell('模拟发送未被接收，草稿已保留。');return}
   const newer=s.draft;const c=send(s,text);if(newer!==text)s.draft=newer
   run(s,c,mode)
  }catch(e){tell((e as Error).message)}finally{accepting.delete(s.id)}
 }
 function generate(regenerate=false){const s=current.value;if(!s||accepting.has(s.id))return;if(!connection.value){tell('请先选择演示连接。');return}try{run(s,begin(s,regenerate),scenario.value)}catch(e){tell((e as Error).message)}}
 async function stop(s=current.value){
  if(!s)return
  const c=s.messages.flatMap(m=>m.candidates).find(c=>['waiting','streaming','stopping'].includes(c.status))
  if(!c)return
  if(c.status==='stopping')return
  clearTimeout(timers.get(s.id));c.status='stopping'
  await new Promise(r=>setTimeout(r,250))
  if(state.sessions.includes(s))finish(s,c,'stopped')
 }
 async function remove(s:Session){await stop(s);state.sessions=state.sessions.filter(a=>a.id!==s.id);if(state.current===s.id)select(state.sessions[0]?.id||'')}
 function reset(){for(const timer of timers.values())clearTimeout(timer);timers.clear();accepting.clear();Object.assign(state,seed());Object.assign(useAppearance().appearance,defaults);scenario.value='normal';disconnected.value=false;truncated.value=false;storageError.value='';tell('已恢复初始演示数据。')}
 return {state,current,connection,sorted,storageError,notice,scenario,disconnected,truncated,accepting,select,create,submit,generate,stop,remove,reset,tell}
}
import { defaults } from '../domain/appearance'
