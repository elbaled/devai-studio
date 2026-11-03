import { useEffect, useMemo, useState } from 'react'
import Editor from '@monaco-editor/react'
import JSZip from 'jszip'
import {
  Activity, Bot, Braces, Check, ChevronDown, ChevronRight, Code2, Copy,
  Download, File, FileCode2, Folder, FolderPlus, Github, Globe, LayoutDashboard,
  Menu, MessageSquare, Moon, Plus, Save, Send, Settings, ShieldCheck,
  Smartphone, Sparkles, Sun, Trash2, Upload, WandSparkles, X
} from 'lucide-react'
import { auth, db, firebaseReady } from './firebase'
import { createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signOut, User } from 'firebase/auth'
import { collection, doc, getDocs, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'

type ProjectFile = { path: string; content: string }
type ChatMessage = { role: 'user' | 'assistant'; content: string }
type Project = { id: string; name: string; files: ProjectFile[]; updatedAt?: number }

const starterFiles: ProjectFile[] = [
  { path: 'index.html', content: '<!doctype html>\\n<html lang="ar" dir="rtl">\\n<head>\\n  <meta charset="UTF-8">\\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\\n  <title>مشروعي الأول</title>\\n  <link rel="stylesheet" href="style.css">\\n</head>\\n<body>\\n  <main class="card">\\n    <span class="badge">تم بنجاح</span>\\n    <h1>مرحباً بك في مشروعي</h1>\\n    <p>ابدأ في تعديل هذا الموقع باستخدام DevAI Studio.</p>\\n    <button id="helloBtn">جرّبني</button>\\n  </main>\\n  <script src="script.js"></script>\\n</body>\\n</html>' },
  { path: 'style.css', content: '* { box-sizing: border-box; }\\nbody { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: Tahoma, Arial, sans-serif; background: linear-gradient(135deg,#10182d,#243b63); color: #172033; }\\n.card { width: min(90%,560px); padding: 42px; border-radius: 24px; background: white; text-align: center; box-shadow: 0 24px 80px #0004; }\\nh1 { color: #172b4d; }\\np { color: #65738b; line-height: 1.8; }\\n.badge { color: #087f5b; background: #d3f9e8; border-radius: 30px; padding: 7px 14px; }\\nbutton { border: 0; border-radius: 12px; padding: 12px 24px; background: #6658e8; color: white; cursor: pointer; font-size: 16px; }' },
  { path: 'script.js', content: "document.getElementById('helloBtn')?.addEventListener('click', () => {\\n  alert('أهلاً بك في DevAI Studio!');\\n});" },
  { path: 'README.md', content: '# مشروعي\\n\\nتم إنشاء هذا المشروع باستخدام DevAI Studio.\\n' }
]

const starterProject: Project = { id: 'starter', name: 'مشروعي الأول', files: starterFiles }
const languageFor = (path: string) => {
  const ext = path.split('.').pop()?.toLowerCase()
  const map: Record<string, string> = { html: 'html', css: 'css', js: 'javascript', ts: 'typescript', tsx: 'typescript', jsx: 'javascript', json: 'json', md: 'markdown', py: 'python', sql: 'sql', php: 'php' }
  return map[ext || ''] || 'plaintext'
}
const id = () => Math.random().toString(36).slice(2, 10)

export default function App() {
  const [project, setProject] = useState<Project>(starterProject)
  const [projects, setProjects] = useState<Project[]>([starterProject])
  const [activeFile, setActiveFile] = useState('index.html')
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: 'assistant', content: 'أهلاً بك في DevAI Studio! ✨\\nاكتب وصف الموقع أو الميزة التي تريد تنفيذها، وسأحوّل طلبك إلى ملفات مشروع حقيقية. يمكنك أيضاً اختيار نمط المهمة من القائمة.' }])
  const [prompt, setPrompt] = useState('')
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState<'editor' | 'preview'>('editor')
  const [mobilePanel, setMobilePanel] = useState<'files' | 'chat' | 'work'>('work')
  const [dark, setDark] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [apiUrl, setApiUrl] = useState(import.meta.env.VITE_AI_API_URL || '')
  const [showSettings, setShowSettings] = useState(false)
  const [status, setStatus] = useState('جاهز للعمل')
  const [user, setUser] = useState<User | null>(null)
  const [authForm, setAuthForm] = useState({ email: '', password: '' })
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [showAuth, setShowAuth] = useState(false)
  const [expanded, setExpanded] = useState(true)

  useEffect(() => {
    if (!auth) return
    return onAuthStateChanged(auth, setUser)
  }, [])

  const currentFile = project.files.find(f => f.path === activeFile) || project.files[0]
  const html = project.files.find(f => f.path === 'index.html')?.content || '<h1>لا يوجد index.html</h1>'
  const css = project.files.find(f => f.path === 'style.css')?.content || ''
  const js = project.files.find(f => f.path === 'script.js')?.content || ''
  const previewDoc = useMemo(() => {
    let doc = html
    if (doc.includes('</head>')) doc = doc.replace('</head>', `<style>${css.replace(/<\/style/gi, '<\\\\/style')}</style></head>`)
    else doc = `<style>${css}</style>${doc}`
    if (doc.includes('</body>')) doc = doc.replace('</body>', `<script>${js.replace(/<\/script/gi, '<\\\\/script')}</script></body>`)
    else doc += `<script>${js}</script>`
    return doc
  }, [html, css, js])

  function updateFile(path: string, content: string) {
    setProject(p => ({ ...p, files: p.files.map(f => f.path === path ? { ...f, content } : f) }))
    setProjects(ps => ps.map(p => p.id === project.id ? { ...p, files: p.files.map(f => f.path === path ? { ...f, content } : f) } : p))
  }
  function addFile() {
    const path = window.prompt('اكتب مسار الملف الجديد، مثال: assets/app.js')
    if (!path) return
    if (project.files.some(f => f.path === path)) return alert('هذا الملف موجود بالفعل')
    setProject(p => ({ ...p, files: [...p.files, { path, content: '' }] }))
    setActiveFile(path)
  }
  function removeFile(path: string) {
    if (path === 'index.html') return alert('لا يمكن حذف ملف الصفحة الرئيسية.')
    if (!confirm(`هل تريد حذف ${path}؟`)) return
    setProject(p => ({ ...p, files: p.files.filter(f => f.path !== path) }))
    if (activeFile === path) setActiveFile('index.html')
  }
  async function downloadZip() {
    const zip = new JSZip()
    project.files.forEach(f => zip.file(f.path, f.content))
    zip.file('README-DEVAI.txt', `Project: ${project.name}\\nCreated with DevAI Studio`)
    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `${project.name.replace(/[^a-z0-9-_]/gi, '-') || 'devai-project'}.zip`; a.click()
    URL.revokeObjectURL(url)
  }
  async function saveToCloud() {
    if (!db || !user) { localStorage.setItem('devai-projects', JSON.stringify(projects.map(p => p.id === project.id ? project : p))); setStatus('تم الحفظ على هذا الجهاز'); return }
    try {
      await setDoc(doc(db, 'users', user.uid, 'projects', project.id), { ...project, updatedAt: Date.now(), serverUpdatedAt: serverTimestamp() })
      setStatus('تم الحفظ في Firestore')
    } catch (e) { setStatus('تعذر الحفظ: تحقق من Firestore Rules'); console.error(e) }
  }
  async function loadCloudProjects() {
    if (!db || !user) return
    try {
      const snap = await getDocs(collection(db, 'users', user.uid, 'projects'))
      const loaded = snap.docs.map(d => d.data() as Project)
      if (loaded.length) { setProjects(loaded); setProject(loaded[0]); setActiveFile(loaded[0].files[0]?.path || 'index.html') }
    } catch (e) { console.error(e); setStatus('تعذر تحميل المشاريع') }
  }
  async function deleteCloudProject(p: Project) {
    if (!confirm(`حذف المشروع ${p.name}؟`)) return
    if (db && user) await deleteDoc(doc(db, 'users', user.uid, 'projects', p.id)).catch(console.error)
    const next = projects.filter(x => x.id !== p.id)
    setProjects(next.length ? next : [starterProject])
    if (project.id === p.id) setProject(next[0] || starterProject)

function newProject() {
    const name = window.prompt('اسم المشروع الجديد؟', 'مشروع جديد')
    if (!name) return
    const p = { ...starterProject, id: id(), name, files: starterFiles.map(f => ({ ...f })) }
    setProjects(ps => [p, ...ps])
    setProject(p)
    setActiveFile('index.html')
    setMessages([{ role: 'assistant', content: `تم إنشاء مشروع "${name}". أخبرني بما تريد بناءه.` }])
}

  async function sendMessage() {
    const text = prompt.trim()
    if (!text || busy) return
    setMessages(m => [...m, { role: 'user', content: text }]); setPrompt(''); setBusy(true); setStatus('جاري تحليل الطلب...')
    try {
      if (!apiUrl) throw new Error('لم يتم إعداد رابط خادم الذكاء الاصطناعي. افتح الإعدادات وأضف رابط Cloudflare Worker.')
      const response = await fetch(`${apiUrl.replace(/\/$/, '')}/api/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text, project: { name: project.name, files: project.files },
          history: messages.slice(-12), mode: 'code'
        })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`)
      if (Array.isArray(data.files)) {
        const map = new Map(project.files.map(f => [f.path, f]))
        data.files.forEach((f: ProjectFile) => { if (f.path && typeof f.content === 'string') map.set(f.path, f) })
        const updated = { ...project, files: [...map.values()] }
        setProject(updated); setProjects(ps => ps.map(p => p.id === project.id ? updated : p))
        if (data.files[0]?.path) setActiveFile(data.files[0].path)
      }
      setMessages(m => [...m, { role: 'assistant', content: data.message || 'تمت معالجة الطلب.' }])
      setStatus('اكتملت المهمة')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'حدث خطأ غير معروف'
      setMessages(m => [...m, { role: 'assistant', content: `تعذر تنفيذ الطلب: ${msg}\\n\\nتأكد من نشر Cloudflare Worker وضبط مفتاح مزود الذكاء الاصطناعي.` }])
      setStatus('تحتاج إلى إعداد الاتصال')
    } finally { setBusy(false) }
  }
  async function handleAuth() {
    if (!auth || !authForm.email || !authForm.password) return alert('أدخل البريد وكلمة المرور، وتأكد من إعداد Firebase.')
    try {
      if (authMode === 'signup') await createUserWithEmailAndPassword(auth, authForm.email, authForm.password)
      else await signInWithEmailAndPassword(auth, authForm.email, authForm.password)
      setShowAuth(false); setAuthForm({ email: '', password: '' })
    } catch (e) { alert(e instanceof Error ? e.message : 'تعذر تسجيل الدخول') }
  }
  async function importFiles(file?: globalThis.File) {
    if (!file) return
    if (file.name.endsWith('.zip')) {
      const zip = await JSZip.loadAsync(file)
      const entries: ProjectFile[] = []
      for (const [path, entry] of Object.entries(zip.files)) if (!entry.dir && !path.startsWith('__MACOSX/')) entries.push({ path, content: await entry.async('string') })
      if (entries.length) { setProject(p => ({ ...p, files: entries })); setActiveFile(entries.find(f => f.path.endsWith('index.html'))?.path || entries[0].path); setStatus('تم استيراد ملفات ZIP') }
    } else {
      const content = await file.text()
      setProject(p => ({ ...p, files: [...p.files.filter(f => f.path !== file.name), { path: file.name, content }] }))
      setActiveFile(file.name)
    }
  }

  return <div className={dark ? 'app dark' : 'app light'} dir="rtl">
    <header className="topbar">
      <button className="icon-btn mobile-only" onClick={() => setSidebarOpen(!sidebarOpen)}><Menu size={19}/></button>
      <div className="brand-mark"><Code2 size={21}/></div>
      <div className="brand"><b>DevAI <span>Studio</span></b><small>AI Website & App Builder</small></div>
      <div className="top-actions">
        <span className="connection"><i/> {status}</span>
        <button className="icon-btn" title="تبديل المظهر" onClick={() => setDark(!dark)}>{dark ? <Sun size={18}/> : <Moon size={18}/>}</button>
        <button className="btn btn-ghost" onClick={() => setShowSettings(true)}><Settings size={16}/> الإعدادات</button>
        {user ? <button className="btn btn-ghost" onClick={() => signOut(auth!)}>{user.email?.split('@')[0]} · خروج</button> : <button className="btn btn-primary" onClick={() => setShowAuth(true)}>تسجيل الدخول</button>}
      </div>
    </header>

    <div className="layout">
      <aside className={`sidebar ${sidebarOpen ? '' : 'closed'}`}>
        <button className="new-project" onClick={newProject}><Plus size={17}/> مشروع جديد</button>
        <div className="side-label">مساحة العمل</div>
        <button className="side-link active"><LayoutDashboard size={17}/> لوحة المشاريع</button>
        <button className="side-link" onClick={() => setShowSettings(true)}><Settings size={17}/> إعدادات الاتصال</button>
        <div className="side-label row-label"><span>مشاريعي</span><button onClick={newProject}><Plus size={15}/></button></div>
        <div className="project-list">{projects.map(p => <button key={p.id} className={`project-item ${project.id === p.id ? 'selected' : ''}`} onClick={() => { setProject(p); setActiveFile(p.files[0]?.path || 'index.html') }}><Folder size={16}/><span>{p.name}</span><button className="tiny-delete" onClick={e => { e.stopPropagation(); deleteCloudProject(p) }}><Trash2 size={13}/></button></button>)}</div>
        <div className="sidebar-bottom">
          <div className="plan-card"><Sparkles size={17}/><b>DevAI Workspace</b><p>مساحة تطويرك الذكية</p><small>{firebaseReady ? 'Firebase مُعدّ' : 'الحفظ المحلي متاح'}</small></div>
          <div className="user-row"><div className="avatar">A</div><div><b>{user?.email || 'مستخدم DevAI'}</b><small>{user ? 'حساب متصل' : 'وضع محلي'}</small></div></div>
        </div>
      </aside>

      <main className="main">
        <div className="workspace-head">
          <div><div className="breadcrumbs">مساحة العمل <ChevronRight size={14}/> <b>{project.name}</b></div><h1>{project.name}</h1><p>أنشئ وعدّل مشروعك بمساعدة الذكاء الاصطناعي.</p></div>
          <div className="head-actions">
            <label className="btn btn-ghost upload-btn"><Upload size={16}/> استيراد<input type="file" accept=".zip,.html,.css,.js,.ts,.json,.md,.py" onChange={e => importFiles(e.target.files?.[0])}/></label>
            <button className="btn btn-ghost" onClick={saveToCloud}><Save size={16}/> حفظ</button>
            <button className="btn btn-primary" onClick={downloadZip}><Download size={16}/> تنزيل ZIP</button>
          </div>
        </div>

        <div className="mobile-tabs">
          <button className={mobilePanel === 'files' ? 'chosen' : ''} onClick={() => setMobilePanel('files')}><Folder size={16}/> الملفات</button>
          <button className={mobilePanel === 'work' ? 'chosen' : ''} onClick={() => setMobilePanel('work')}><Code2 size={16}/> المحرر</button>
          <button className={mobilePanel === 'chat' ? 'chosen' : ''} onClick={() => setMobilePanel('chat')}><Bot size={16}/> AI Chat</button>
        </div>

        <div className="studio-grid">
          <section className={`panel files-panel ${mobilePanel === 'files' ? 'mobile-active' : ''}`}>
            <div className="panel-title"><span><Folder size={16}/> ملفات المشروع</span><button className="icon-btn small" onClick={addFile} title="ملف جديد"><Plus size={16}/></button></div>
            <div className="tree-root"><button className="tree-folder" onClick={() => setExpanded(!expanded)}>{expanded ? <ChevronDown size={15}/> : <ChevronRight size={15}/>} <Folder size={16}/> {project.name}</button>
              {expanded && project.files.map(f => <div className={`file-row ${activeFile === f.path ? 'file-active' : ''}`} key={f.path}><button onClick={() => setActiveFile(f.path)}><FileCode2 size={15}/><span>{f.path}</span></button><button className="file-delete" onClick={() => removeFile(f.path)}><Trash2 size={13}/></button></div>)}
            </div>
            <div className="files-foot"><ShieldCheck size={14}/> ملفاتك محفوظة داخل مساحة المشروع</div>
          </section>

          <section className={`panel editor-panel ${mobilePanel === 'work' ? 'mobile-active' : ''}`}>
            <div className="editor-toolbar">
              <div className="file-tab"><FileCode2 size={15}/>{activeFile || 'لا يوجد ملف'}</div>
              <div className="editor-actions"><button className="icon-btn small" title="نسخ الملف" onClick={() => navigator.clipboard.writeText(currentFile?.content || '')}><Copy size={15}/></button><button className="icon-btn small" title="تنزيل الملف" onClick={() => { const blob = new Blob([currentFile?.content || ''], {type:'text/plain'}); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = activeFile; a.click(); URL.revokeObjectURL(a.href) }}><Download size={15}/></button></div>
            </div>
            <div className="editor-body">{currentFile ? <Editor height="100%" language={languageFor(activeFile)} value={currentFile.content} theme={dark ? 'vs-dark' : 'light'} onChange={v => updateFile(activeFile, v || '')} options={{fontSize:13, minimap:{enabled:false}, automaticLayout:true, scrollBeyondLastLine:false, wordWrap:'on', padding:{top:14}, tabSize:2}}/> : <div className="empty">اختر ملفاً لبدء التحرير</div>}</div>
            <div className="preview-toolbar"><div className="preview-tabs"><button className={tab === 'editor' ? 'selected-tab' : ''} onClick={() => setTab('editor')}><Braces size={14}/> الكود</button><button className={tab === 'preview' ? 'selected-tab' : ''} onClick={() => setTab('preview')}><Globe size={14}/> المعاينة</button></div><span><Activity size={13}/> HTML Preview</span></div>
            {tab === 'preview' && <div className="preview-overlay"><iframe title="معاينة المشروع" sandbox="allow-scripts" srcDoc={previewDoc}/></div>}
          </section>

          <section className={`panel chat-panel ${mobilePanel === 'chat' ? 'mobile-active' : ''}`}>
            <div className="chat-heading"><div className="ai-avatar"><WandSparkles size={18}/></div><div><b>DevAI Assistant</b><small><i/> مساعد البرمجة الذكي</small></div><button className="icon-btn small" onClick={() => setMessages([{role:'assistant',content:'بدأت محادثة جديدة. كيف أساعدك في مشروعك؟'}])}><Plus size={16}/></button></div>
            <div className="mode-select"><label>نوع المهمة</label><select id="taskMode"><option value="code">إنشاء / تعديل مشروع</option><option value="debug">إصلاح خطأ برمجي</option><option value="feature">إضافة ميزة</option><option value="explain">شرح الكود</option><option value="firebase">مساعد Firebase</option><option value="review">مراجعة وتحسين الكود</option><option value="deploy">تجهيز للنشر</option></select></div>
            <div className="messages">{messages.map((m, i) => <div key={i} className={`message ${m.role}`}><div className="message-avatar">{m.role === 'assistant' ? <Bot size={15}/> : 'أ'}</div><div className="bubble"><div className="message-label">{m.role === 'assistant' ? 'DevAI' : 'أنت'}</div>{m.content}</div></div>)}{busy && <div className="typing"><span/><span/><span/> جاري التفكير وإنشاء التعديلات...</div>}</div>
            <div className="quick-prompts"><button onClick={() => setPrompt('أنشئ صفحة هبوط عربية احترافية ومتجاوبة مع الهاتف لهذا المشروع.')}> <Sparkles size={13}/> تصميم صفحة</button><button onClick={() => setPrompt('راجع ملفات المشروع واكتشف الأخطاء واقترح إصلاحها.')}> <ShieldCheck size={13}/> مراجعة الكود</button></div>
            <div className="composer"><textarea value={prompt} onChange={e => setPrompt(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }} placeholder="اكتب ما تريد بناءه أو تعديله... (Enter للإرسال)" rows={3}/><div className="composer-foot"><small>قد ينتج الذكاء الاصطناعي أكواداً تحتاج إلى اختبار.</small><button className="send-btn" disabled={busy || !prompt.trim()} onClick={sendMessage}>{busy ? '...' : <><Send size={16}/> إرسال</>}</button></div></div>
          </section>
        </div>
        <footer className="statusbar"><span><i/> {status}</span><span>DevAI Studio v1.0 · {project.files.length} ملفات</span></footer>
      </main>
    </div>

    {showSettings && <div className="modal-backdrop" onClick={() => setShowSettings(false)}><div className="modal" onClick={e => e.stopPropagation()}><div className="modal-head"><h2><Settings size={19}/> إعدادات المنصة</h2><button className="icon-btn" onClick={() => setShowSettings(false)}><X size={18}/></button></div><label>رابط خادم الذكاء الاصطناعي (Cloudflare Worker)</label><input value={apiUrl} onChange={e => setApiUrl(e.target.value)} placeholder="https://your-worker.workers.dev"/><p className="hint">يمكنك أيضاً ضبط VITE_AI_API_URL في ملف .env قبل البناء. لا تضع مفتاح OpenAI هنا.</p><div className="setting-status"><span className={apiUrl ? 'good' : 'warn'}>{apiUrl ? 'رابط API مضبوط' : 'لم يتم إعداد AI API'}</span><span>{firebaseReady ? 'Firebase جاهز' : 'Firebase غير مربوط'}</span></div><button className="btn btn-primary full" onClick={() => { localStorage.setItem('devai-api-url', apiUrl); setShowSettings(false); setStatus('تم حفظ إعدادات الاتصال محلياً') }}>حفظ الإعدادات</button><p className="hint">إعدادات الرابط تحفظ على هذا المتصفح فقط. مفاتيح المزود تحفظ على الخادم.</p></div></div>}
    {showAuth && <div className="modal-backdrop" onClick={() => setShowAuth(false)}><div className="modal auth-modal" onClick={e => e.stopPropagation()}><div className="modal-head"><h2>حساب DevAI Studio</h2><button className="icon-btn" onClick={() => setShowAuth(false)}><X size={18}/></button></div>{!firebaseReady && <p className="hint warning">Firebase غير مهيأ بعد. أضف بيانات Firebase في .env ثم أعد تشغيل البناء.</p>}<div className="auth-switch"><button className={authMode==='login'?'on':''} onClick={() => setAuthMode('login')}>دخول</button><button className={authMode==='signup'?'on':''} onClick={() => setAuthMode('signup')}>حساب جديد</button></div><label>البريد الإلكتروني</label><input type="email" value={authForm.email} onChange={e => setAuthForm({...authForm,email:e.target.value})}/><label>كلمة المرور</label><input type="password" value={authForm.password} onChange={e => setAuthForm({...authForm,password:e.target.value})}/><button className="btn btn-primary full" disabled={!firebaseReady} onClick={handleAuth}>{authMode==='login'?'تسجيل الدخول':'إنشاء الحساب'}</button></div></div>}
  </div>
}
