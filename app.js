const DEFAULT_FILES = {
  'index.html': {
    content: `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>مشروعي الذكي</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <div class="card">
    <h1>مرحباً بك في <span>DevAI Studio</span></h1>
    <p>اكتب وصف موقعك أو تطبيقك في المحادثة ليقوم الذكاء الاصطناعي ببنائه وتحديثه مباشرة.</p>
    <button id="btn">تجربة التفاعل الحي</button>
    <div id="msg"></div>
  </div>
  <script src="app.js"><\/script>
</body>
</html>`
  },
  'style.css': {
    content: `body {
  background: linear-gradient(135deg, #0f172a, #1e1b4b);
  color: #fff;
  font-family: sans-serif;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
}
.card {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  padding: 36px;
  border-radius: 18px;
  text-align: center;
  max-width: 480px;
}
h1 span { color: #818cf8; }
p { color: #cbd5e1; line-height: 1.6; }
button {
  background: #6366f1;
  color: white;
  border: 0;
  padding: 12px 24px;
  border-radius: 10px;
  cursor: pointer;
  font-weight: bold;
}
#msg { margin-top: 16px; color: #34d399; font-weight: bold; }`
  },
  'app.js': {
    content: `document.getElementById('btn').addEventListener('click', () => {
  const time = new Date().toLocaleTimeString('ar-EG');
  document.getElementById('msg').textContent = 'تم التشغيل بنجاح في: ' + time;
  console.log('Interaction logged at', time);
});`
  },
  'firestore.rules': {
    content: `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/projects/{projectId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}`
  }
};

let projects = JSON.parse(localStorage.getItem('DEVAI_PROJECTS') || 'null') || [
  {
    id: 'proj-1',
    name: 'مشروع البداية الذكي',
    files: JSON.parse(JSON.stringify(DEFAULT_FILES)),
    history: [{ summary: 'النسخة الأولية', files: JSON.parse(JSON.stringify(DEFAULT_FILES)) }],
    messages: [
      {
        role: 'assistant',
        text: 'مرحباً بك في DevAI Studio! اضغط على أيقونة المفتاح بأعلى اليسار لإدخال مفتاح Gemini API الخاص بك، ثم اطلب إنشاء أو تعديل أي موقع أو تطبيق.',
        changedFiles: []
      }
    ]
  }
];

let currentProjectId = projects[0].id;
let activeFile = 'index.html';
let isGenerating = false;

function getCurrentProject() {
  return projects.find(p => p.id === currentProjectId) || projects[0];
}

function saveProjects() {
  localStorage.setItem('DEVAI_PROJECTS', JSON.stringify(projects));
}

function initApp() {
  lucide.createIcons();
  document.getElementById('geminiKeyInput').value = localStorage.getItem('DEVAI_GEMINI_KEY') || '';
  document.getElementById('githubTokenInput').value = localStorage.getItem('DEVAI_GITHUB_TOKEN') || '';
  updateApiKeyStatus();
  renderProjectsDropdown();
  renderFileList();
  renderHistory();
  renderChat();
  loadActiveFileInEditor();
  updateLivePreview();
  auditFirebaseRules();
}

function updateApiKeyStatus() {
  const key = localStorage.getItem('DEVAI_GEMINI_KEY');
  const badge = document.getElementById('aiStatusBadge');
  const btn = document.getElementById('apiKeyBtn');
  if (key) {
    badge.textContent = 'متصل بـ Gemini';
    badge.className = 'text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400';
    btn.className = 'p-2 rounded-lg border border-emerald-500/40 text-emerald-400 bg-emerald-500/10 transition';
  } else {
    badge.textContent = 'بانتظار المفتاح';
    badge.className = 'text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400';
  }
}

function toggleSettings(show) {
  document.getElementById('settingsModal').classList.toggle('hidden', !show);
}

function saveApiKeys() {
  const gKey = document.getElementById('geminiKeyInput').value.trim();
  const ghKey = document.getElementById('githubTokenInput').value.trim();
  localStorage.setItem('DEVAI_GEMINI_KEY', gKey);
  localStorage.setItem('DEVAI_GITHUB_TOKEN', ghKey);
  updateApiKeyStatus();
  toggleSettings(false);
}

function renderProjectsDropdown() {
  const select = document.getElementById('projectSelect');
  select.innerHTML = projects
    .map(p => `<option value="${p.id}" ${p.id === currentProjectId ? 'selected' : ''}>${p.name}</option>`)
    .join('');
}

function switchProject(id) {
  currentProjectId = id;
  const proj = getCurrentProject();
  activeFile = Object.keys(proj.files)[0] || 'index.html';
  renderFileList();
  renderHistory();
  renderChat();
  loadActiveFileInEditor();
  updateLivePreview();
  auditFirebaseRules();
}

function createNewProject() {
  const name = prompt('اسم المشروع الجديد:');
  if (!name || !name.trim()) return;
  const newProj = {
    id: 'proj-' + Date.now(),
    name: name.trim(),
    files: JSON.parse(JSON.stringify(DEFAULT_FILES)),
    history: [{ summary: 'إنشاء المشروع', files: JSON.parse(JSON.stringify(DEFAULT_FILES)) }],
    messages: [{ role: 'assistant', text: `تم إنشاء مشروع "${name.trim()}". كيف نبدأ؟`, changedFiles: [] }]
  };
  projects.unshift(newProj);
  saveProjects();
  renderProjectsDropdown();
  switchProject(newProj.id);
}

function renderFileList() {
  const proj = getCurrentProject();
  const query = (document.getElementById('fileSearch').value || '').toLowerCase();
  const container = document.getElementById('fileList');

  const files = Object.keys(proj.files).filter(
    f => f.toLowerCase().includes(query) || proj.files[f].content.toLowerCase().includes(query)
  );

  container.innerHTML = files
    .map(
      fileName => `
    <div onclick="selectFile('${fileName}')" class="group flex items-center justify-between px-2.5 py-2 rounded-lg text-xs cursor-pointer transition ${
        activeFile === fileName
          ? 'bg-indigo-600/15 text-indigo-400 font-bold border border-indigo-500/30'
          : 'hover:bg-slate-100 dark:hover:bg-slate-800'
      }">
      <span class="truncate" dir="ltr">${fileName}</span>
      <button onclick="event.stopPropagation(); deleteFile('${fileName}')" class="opacity-0 group-hover:opacity-100 text-rose-400 hover:underline text-[10px]">حذف</button>
    </div>`
    )
    .join('');
}

function selectFile(fileName) {
  activeFile = fileName;
  renderFileList();
  loadActiveFileInEditor();
  switchMobilePanel('workspace');
}

function loadActiveFileInEditor() {
  const proj = getCurrentProject();
  document.getElementById('activeFileName').textContent = activeFile;
  document.getElementById('codeEditor').value = proj.files[activeFile]?.content || '';
}

function onCodeChange(newVal) {
  const proj = getCurrentProject();
  if (proj.files[activeFile]) {
    proj.files[activeFile].content = newVal;
    saveProjects();
    updateLivePreview();
    auditFirebaseRules();
  }
}

function createNewFile() {
  const name = prompt('اسم الملف الجديد (مثال: about.html أو script.js):');
  if (!name || !name.trim()) return;
  const clean = name.trim();
  const proj = getCurrentProject();
  proj.files[clean] = { content: '' };
  saveProjects();
  selectFile(clean);
}

function deleteFile(fileName) {
  const proj = getCurrentProject();
  if (Object.keys(proj.files).length <= 1) return alert('لا يمكن حذف جميع الملفات.');
  if (!confirm(`حذف الملف ${fileName}؟`)) return;
  delete proj.files[fileName];
  activeFile = Object.keys(proj.files)[0];
  saveProjects();
  renderFileList();
  loadActiveFileInEditor();
  updateLivePreview();
}

function renderHistory() {
  const proj = getCurrentProject();
  const container = document.getElementById('historyList');
  container.innerHTML = proj.history
    .slice()
    .reverse()
    .map(
      (h, idx) => `
    <div class="flex items-center justify-between text-[11px] bg-slate-100 dark:bg-slate-800 px-2 py-1.5 rounded">
      <span class="truncate">${h.summary}</span>
      <button onclick="restoreHistory(${proj.history.length - 1 - idx})" class="text-indigo-400 hover:underline shrink-0">استعادة</button>
    </div>`
    )
    .join('');
}

function restoreHistory(index) {
  const proj = getCurrentProject();
  if (!proj.history[index]) return;
  proj.files = JSON.parse(JSON.stringify(proj.history[index].files));
  saveProjects();
  renderFileList();
  loadActiveFileInEditor();
  updateLivePreview();
}

function renderChat() {
  const proj = getCurrentProject();
  const box = document.getElementById('chatMessages');
  box.innerHTML = proj.messages
    .map(
      m => `
    <div class="p-3 rounded-xl text-xs leading-relaxed ${
      m.role === 'user'
        ? 'bg-indigo-600 text-white mr-6'
        : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 ml-4 border border-slate-200 dark:border-slate-700'
    }">
      <div class="whitespace-pre-wrap">${m.text}</div>
      ${
        m.changedFiles && m.changedFiles.length
          ? `<div class="mt-2 pt-2 border-t border-slate-300 dark:border-slate-700 flex flex-wrap gap-1">
              ${m.changedFiles
                .map(
                  f => `<button onclick="selectFile('${f}')" class="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded">${f}</button>`
                )
                .join('')}
            </div>`
          : ''
      }
    </div>`
    )
    .join('');
  box.scrollTop = box.scrollHeight;
}

function quickPrompt(text) {
  document.getElementById('promptInput').value = text;
  handleSendMessage();
}

async function handleSendMessage() {
  const input = document.getElementById('promptInput');
  const text = input.value.trim();
  if (!text || isGenerating) return;

  const apiKey = localStorage.getItem('DEVAI_GEMINI_KEY');
  const proj = getCurrentProject();

  if (!apiKey) {
    toggleSettings(true);
    proj.messages.push(
      { role: 'user', text },
      { role: 'assistant', text: '⚠️ يرجى إدخال مفتاح Gemini API في نافذة الإعدادات لتفعيل الذكاء الاصطناعي الحقيقي.', changedFiles: [] }
    );
    input.value = '';
    saveProjects();
    renderChat();
    return;
  }

  input.value = '';
  isGenerating = true;
  proj.messages.push({ role: 'user', text });
  proj.messages.push({ role: 'assistant', text: '⏳ جاري تحليل المشروع وكتابة الأكواد...', changedFiles: [] });
  renderChat();

  try {
    const filesContext = Object.entries(proj.files)
      .map(([name, obj]) => `--- FILE: ${name} ---\n${obj.content}`)
      .join('\n\n');

    const systemInstruction = `أنت مهندس برمجيات خبير داخل منصة DevAI Studio.
حلل طلب المستخدم وعدّل أو أنشئ الملفات اللازمة فقط دون إفساد الخصائص القديمة.
أرجع النتيجة بصيغة JSON فقط تحتوي على:
- explanation: شرح عربي واضح لما قمت به.
- files: مصفوفة بالملفات المعدلة أو الجديدة، كل عنصر يحتوي على path و content الكامل.`;

    const responseSchema = {
      type: 'OBJECT',
      properties: {
        explanation: { type: 'STRING' },
        files: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              path: { type: 'STRING' },
              content: { type: 'STRING' }
            },
            required: ['path', 'content']
          }
        }
      },
      required: ['explanation', 'files']
    };

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents: [{ role: 'user', parts: [{ text: `ملفات المشروع الحالية:\n${filesContext}\n\nطلب المستخدم:\n${text}` }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema
          }
        })
      }
    );

    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || 'خطأ في الاتصال بـ Gemini API');

    const parsed = JSON.parse(data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}');
    const changed = [];

    if (Array.isArray(parsed.files)) {
      parsed.files.forEach(f => {
        if (f.path && typeof f.content === 'string') {
          proj.files[f.path] = { content: f.content };
          changed.push(f.path);
        }
      });
    }

    if (changed.length > 0) {
      proj.history.push({ summary: text.slice(0, 35), files: JSON.parse(JSON.stringify(proj.files)) });
      activeFile = changed[0];
    }

    proj.messages.pop();
    proj.messages.push({
      role: 'assistant',
      text: parsed.explanation || 'تم تحديث ملفات المشروع بنجاح.',
      changedFiles: changed
    });

    saveProjects();
    renderFileList();
    renderHistory();
    renderChat();
    loadActiveFileInEditor();
    updateLivePreview();
    auditFirebaseRules();
  } catch (err) {
    proj.messages.pop();
    proj.messages.push({ role: 'assistant', text: '❌ خطأ: ' + err.message, changedFiles: [] });
    saveProjects();
    renderChat();
  } finally {
    isGenerating = false;
  }
}

function updateLivePreview() {
  const proj = getCurrentProject();
  const html = proj.files['index.html']?.content || '<h1>لا يوجد ملف index.html</h1>';
  const css = proj.files['style.css']?.content || '';
  const js = proj.files['app.js']?.content || '';

  const interceptor = `
    <script>
      (function(){
        const send = (level, args) => {
          window.parent.postMessage({
            type: 'DEVAI_CONSOLE',
            level,
            text: Array.from(args).map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')
          }, '*');
        };
        const oLog = console.log, oErr = console.error;
        console.log = function(){ send('info', arguments); oLog.apply(console, arguments); };
        console.error = function(){ send('error', arguments); oErr.apply(console, arguments); };
        window.addEventListener('error', e => send('error', [e.message]));
      })();
    <\/script>`;

  const finalDoc = html
    .replace('</head>', `<style>${css}</style>${interceptor}</head>`)
    .replace('</body>', `<script>${js}<\/script></body>`);

  document.getElementById('previewFrame').srcdoc = finalDoc;
}

window.addEventListener('message', e => {
  if (e.data?.type === 'DEVAI_CONSOLE') {
    const out = document.getElementById('consoleOutput');
    if (out.textContent === 'No console logs yet...') out.innerHTML = '';
    const div = document.createElement('div');
    div.className = e.data.level === 'error' ? 'text-rose-400' : 'text-emerald-300';
    div.textContent = `[${e.data.level.toUpperCase()}] ${e.data.text}`;
    out.appendChild(div);
    out.scrollTop = out.scrollHeight;
  }
});

function clearConsole() {
  document.getElementById('consoleOutput').innerHTML = 'No console logs yet...';
}

function switchTab(tab) {
  ['editor', 'preview', 'firebase', 'github'].forEach(t => {
    document.getElementById(`view-${t}`).classList.toggle('hidden', t !== tab);
    document.getElementById(`view-${t}`).classList.toggle('flex', t === tab);
    document.getElementById(`tab-${t}`).className =
      t === tab
        ? 'px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 text-white'
        : 'px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800';
  });
}

function setPreviewSize(mode) {
  switchTab('preview');
  const box = document.getElementById('previewContainer');
  box.style.width = mode === 'mobile' ? '375px' : '100%';
}

function copyActiveCode() {
  const proj = getCurrentProject();
  navigator.clipboard.writeText(proj.files[activeFile]?.content || '');
  alert('تم نسخ الكود بنجاح!');
}

async function downloadProjectZip() {
  const proj = getCurrentProject();
  const zip = new JSZip();
  Object.entries(proj.files).forEach(([path, obj]) => zip.file(path, obj.content));
  const blob = await zip.generateAsync({ type: 'blob' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${proj.name.replace(/\s+/g, '-')}.zip`;
  a.click();
}

async function handleImportZip(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const zip = await JSZip.loadAsync(file);
  const imported = {};
  for (const [path, entry] of Object.entries(zip.files)) {
    if (!entry.dir) {
      imported[path] = { content: await entry.async('string') };
    }
  }
  if (Object.keys(imported).length > 0) {
    const proj = getCurrentProject();
    proj.files = imported;
    proj.history.push({ summary: `استيراد ${file.name}`, files: JSON.parse(JSON.stringify(imported)) });
    activeFile = Object.keys(imported)[0];
    saveProjects();
    renderFileList();
    renderHistory();
    loadActiveFileInEditor();
    updateLivePreview();
  }
}

function auditFirebaseRules() {
  const proj = getCurrentProject();
  const rules = proj.files['firestore.rules']?.content || '';
  const box = document.getElementById('firebaseAuditBox');
  if (rules.includes('if true')) {
    box.innerHTML = `<p class="text-rose-400 font-bold">⚠️ خطر أمني في firestore.rules: القواعد مفتوحة للجميع (if true) وتسمح لأي شخص بتعديل بياناتك!</p>`;
  } else {
    box.innerHTML = `<p class="text-emerald-400 font-bold">✅ قواعد firestore.rules الحالية آمنة وتشترط مصادقة المستخدم (request.auth).</p>`;
  }
}

async function fetchGithubRepos() {
  const token = localStorage.getItem('DEVAI_GITHUB_TOKEN');
  if (!token) return toggleSettings(true);
  const status = document.getElementById('ghStatus');
  status.textContent = 'جاري جلب المستودعات...';
  try {
    const res = await fetch('https://api.github.com/user/repos?sort=updated&per_page=15', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('تأكد من صلاحية مفتاح GitHub Token');
    const repos = await res.json();
    const select = document.getElementById('ghRepoSelect');
    select.innerHTML = repos.map(r => `<option value="${r.full_name}">${r.full_name}</option>`).join('');
    document.getElementById('ghControls').classList.remove('hidden');
    status.textContent = `تم جلب ${repos.length} مستودع بنجاح.`;
  } catch (err) {
    status.textContent = '❌ ' + err.message;
  }
}

async function pushFileToGithub() {
  const token = localStorage.getItem('DEVAI_GITHUB_TOKEN');
  const repo = document.getElementById('ghRepoSelect').value;
  const message = document.getElementById('ghCommitMsg').value;
  const proj = getCurrentProject();
  if (!confirm(`هل توافق على رفع الملف (${activeFile}) إلى المستودع ${repo}؟`)) return;

  const status = document.getElementById('ghStatus');
  status.textContent = `جاري رفع ${activeFile}...`;
  try {
    const contentEncoded = btoa(unescape(encodeURIComponent(proj.files[activeFile].content)));
    let sha;
    const check = await fetch(`https://api.github.com/repos/${repo}/contents/${activeFile}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (check.ok) sha = (await check.json()).sha;

    const put = await fetch(`https://api.github.com/repos/${repo}/contents/${activeFile}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, content: contentEncoded, ...(sha ? { sha } : {}) })
    });
    if (!put.ok) throw new Error('فشل رفع الملف إلى GitHub');
    status.textContent = `✅ تم رفع ${activeFile} بنجاح إلى ${repo}!`;
  } catch (err) {
    status.textContent = '❌ ' + err.message;
  }
}

function toggleTheme() {
  document.documentElement.classList.toggle('dark');
}

function toggleLanguage() {
  const html = document.documentElement;
  html.dir = html.dir === 'rtl' ? 'ltr' : 'rtl';
}

function switchMobilePanel(panel) {
  ['projects', 'chat', 'workspace'].forEach(p => {
    const el = document.getElementById(`panel-${p}`);
    if (p === panel) {
      el.classList.remove('hidden');
      el.classList.add('flex');
    } else {
      el.classList.add('hidden');
      el.classList.remove('flex');
    }
  });
}

window.addEventListener('DOMContentLoaded', initApp);
