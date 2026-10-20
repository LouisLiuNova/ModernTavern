export type Status = 'waiting' | 'streaming' | 'stopping' | 'complete' | 'stopped' | 'failed' | 'interrupted'
export interface Candidate { id: string; text: string; status: Status; error?: string }
export interface Message { id: string; role: 'user' | 'assistant'; text: string; candidates: Candidate[]; selected: number }
export interface Session { id: string; name: string; messages: Message[]; updated: number; unread: boolean; branches: number; draft: string; position: number }
export interface Connection { id: string; name: string; url: string; model: string }
export interface ChatState { version: 1; sessions: Session[]; current: string; connections: Connection[]; connection: string }
export const id = () => crypto.randomUUID()
export const active = (c?: Candidate) => !!c && ['waiting', 'streaming', 'stopping'].includes(c.status)
export const candidate = (m: Message) => m.candidates[m.selected]
export const content = (m: Message) => m.role === 'user' ? m.text : candidate(m)?.text || ''
export const busy = (s: Session) => s.messages.some(m => m.candidates.some(active))
export function message(role: Message['role'], text: string): Message {
  return { id: id(), role, text: role === 'user' ? text : '', candidates: role === 'assistant' ? [{ id: id(), text, status: 'complete' }] : [], selected: 0 }
}
export function newSession(name = `会话 ${new Date().toLocaleString('sv-SE')}`): Session {
  return { id: id(), name, messages: [], updated: Date.now(), unread: false, branches: 0, draft: '', position: 0 }
}
export function seed(): ChatState {
  const s = newSession('雨落在旧书店');
  s.messages = [message('user', '我们来写一段慢节奏的故事。\n\n你是街角旧书店的店主。我在一场突如其来的雨里，推开了你的门。请留意环境和人物的细微动作。'), message('assistant', '*门上的铜铃轻轻晃了一下。*\n\n雨水顺着你的伞尖落在石板上，留下几颗深色的圆点。店里比外面暖一些，空气中有纸张、木头和刚煮好的焙茶的味道。\n\n柜台后的人抬起头，把手里的书签夹回书页。\n\n“进来躲一会儿吧。”他指了指门边的陶罐，“伞可以放在那里。”\n\n窗边留着一把空椅子。窗玻璃被水汽蒙得模糊，街上的人和车，都成了缓缓移动的色块。'), message('user', '我收好伞，走向窗边。\n\n“你这里，有没有一本适合在雨天读的书？”'), message('assistant', '*他没有立刻回答，而是沿着书架，慢慢走进靠窗的那束光里。*\n\n“雨天的书，要看你想听见什么。”\n\n他抽出一本深绿色封面的旧书。书脊有一点磨损，夹页间露出一张淡淡褪色的车票。\n\n“如果想听雨，就读这一本。它不太热闹，但每一页之间，都留了足够的空白。”\n\n他把书轻轻放到桌上，又将茶杯推近了些。\n\n“如果你不急着走，我可以给你讲讲，那张车票的来历。”')];
  s.messages.at(-1)!.candidates.push({ id: id(), text: '*他笑了笑，取下窗边那本薄薄的诗集。*\n\n“也许是这本。你可以先读一页，等雨小一些，再决定要不要带走它。”', status: 'complete' });
  const b = newSession('山间来信'); b.messages = [message('user', '写一封来自山间小屋的信。'), message('assistant', '亲爱的旅人：\n\n今天山里起了雾。院子里的绣球开了，风翻过篱笆时，带来一点松木的气息。\n\n如果你来，门前的灯会一直亮着。')]; b.updated -= 3600000; b.unread = true;
  return { version: 1, sessions: [s,b], current: s.id, connections: [{ id:'demo', name:'故事演示连接', url:'https://example.invalid/v1', model:'story-demo' }], connection:'demo' }
}
export function touch(s: Session) { s.updated = Date.now() }
export function requireIdle(s: Session) { if (busy(s)) throw Error('此会话正在生成，请先停止或等待结束。') }
export function begin(s: Session, regenerate = false): Candidate {
  requireIdle(s)
  let m = s.messages.at(-1)
  if (regenerate && m?.role !== 'assistant') throw Error('只有末尾 AI 消息可以重新生成。')
  if (!regenerate) { m = message('assistant',''); m.candidates = []; s.messages.push(m) }
  const c: Candidate = { id:id(), text:'', status:'waiting' }
  m!.candidates.push(c); m!.selected = m!.candidates.length-1
  return c
}
export function send(s: Session, text: string): Candidate {
  requireIdle(s); if (!text.trim()) throw Error('请输入内容。')
  s.messages.push(message('user',text)); s.draft=''; touch(s); return begin(s)
}
export function switchCandidate(s: Session, delta: number) {
  requireIdle(s); const m=s.messages.at(-1)
  if (m?.role !== 'assistant' || !m.candidates.length) return
  m.selected=(m.selected+delta+m.candidates.length)%m.candidates.length; touch(s)
}
export function deleteCandidate(s: Session, index: number) {
  requireIdle(s);const m=s.messages.at(-1)
  if (m?.role !== 'assistant' || index<0 || index>=m.candidates.length) throw Error('候选不存在。')
  const old=m.selected; m.candidates.splice(index,1)
  if (!m.candidates.length) s.messages.pop()
  else if (index===old) m.selected=index%m.candidates.length
  else if (index<old) m.selected--
  touch(s)
}
export function edit(s: Session, mid: string, text: string) {
  requireIdle(s); const m=s.messages.find(m=>m.id===mid); if(!m) throw Error('消息已不存在。')
  if(m.role==='user')m.text=text;else candidate(m)!.text=text; touch(s)
}
export function deleteFrom(s: Session, mid: string) {
  requireIdle(s); const i=s.messages.findIndex(m=>m.id===mid); if(i<0)throw Error('消息已不存在。');s.messages.splice(i);touch(s)
}
export function branch(s: Session, mid: string) {
  const i=s.messages.findIndex(m=>m.id===mid);if(i<0)throw Error('消息已不存在。')
  if(s.messages.slice(0,i+1).some(m=>m.candidates.some(active)))throw Error('正在生成的消息暂不能分支。')
  s.branches++; const b=newSession(`${s.name} Branch #${s.branches}`)
  b.messages=JSON.parse(JSON.stringify(s.messages.slice(0,i+1)))
  for(const m of b.messages){m.id=id();for(const c of m.candidates)c.id=id()}
  b.position=Number.MAX_SAFE_INTEGER;return b
}
export function recover(state: ChatState) {
  for(const s of state.sessions)for(const m of s.messages)for(const c of m.candidates)if(active(c)){c.status='interrupted';c.error='页面已刷新，模拟任务已中断。'}
  return state
}
export function parseState(raw: string): ChatState {
  const s=JSON.parse(raw)
  const str=(x: unknown)=>typeof x==='string'
  if(s?.version!==1 || !Array.isArray(s.sessions)||!Array.isArray(s.connections)||!str(s.current)||!str(s.connection))throw Error('本地数据格式不兼容。')
  const statuses=['waiting','streaming','stopping','complete','stopped','failed','interrupted']
  for(const a of s.sessions){
    if(!str(a.id)||!str(a.name)||!str(a.draft)||!Number.isFinite(a.updated)||!Number.isFinite(a.position)||!Number.isInteger(a.branches)||a.branches<0||typeof a.unread!=='boolean'||!Array.isArray(a.messages))throw Error('会话数据损坏。')
    for(const m of a.messages){
      if(!str(m.id)||!['user','assistant'].includes(m.role)||!str(m.text)||!Array.isArray(m.candidates)||!Number.isInteger(m.selected))throw Error('消息数据损坏。')
      if(m.role==='assistant'&&(!m.candidates.length||m.selected<0||m.selected>=m.candidates.length))throw Error('候选选择损坏。')
      for(const c of m.candidates)if(!str(c.id)||!str(c.text)||!statuses.includes(c.status)||(c.error!==undefined&&!str(c.error)))throw Error('候选数据损坏。')
    }
  }
  for(const c of s.connections)if(!str(c.id)||!str(c.name)||!str(c.url)||!str(c.model))throw Error('连接数据损坏。')
  if(!s.sessions.some((a:Session)=>a.id===s.current))s.current=s.sessions[0]?.id||''
  return recover(s)
}
