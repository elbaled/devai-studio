const DEFAULT_FILES = {
  'index.html': {
    content: `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>تطبيقي الذكي — DevAI Studio</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <div class="card">
    <span class="badge">الجيل الجديد من البرمجة الذكية</span>
    <h1>مرحباً بك في <span>DevAI Studio Pro</span></h1>
    <p>اطلب من المساعد الذكي بناء متجر إلكتروني، لوحة تحكم، خريطة خدمات، أو تطبيق PWA متكامل، وسيقوم بوضع خطة هندسية وتوليد الملفات فوراً.</p>
    <div class="actions">
      <button id="btn">تشغيل الاختبار التفاعلي</button>
    </div>
    <div id="msg"></div>
  </div>
  <script src="app.js"><\/script>
</body>
</html>`
  },
  'style.css': {
    content: `* { box-sizing: border-box; }
body {
  background: radial-gradient(circle at top, #1e1b4b, #0f172a 70%);
  color: #f8fafc;
  font-family: system-ui, -apple-system, sans-serif;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 20px;
}
.card {
  background: rgba(255,255,255,0.05);
  backdrop-filter: blur(14px);
  border: 1px solid rgba(255,255,255,0.12);
  padding: 40px;
  border-radius: 24px;
  text-align: center;
  max-width: 540px;
  box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
}
.badge {
  background: rgba(99, 102, 241, 0.2);
  color: #a5b4fc;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
}
h1 { font-size: 2rem; margin: 18px 0 12px; }
h1 span { color: #818cf8; }
p { color: #cbd5e1; line-height: 1.7; margin-bottom: 24px; }
button {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  border: 0;
  padding: 13px 28px;
  border-radius: 12px;
  cursor: pointer;
  font-weight: bold;
  font-size: 0.95rem;
  transition: transform 0.2s;
}
button:hover { transform: translateY(-2px); }
#msg { margin-top: 18px; color: #34d399; font-weight: bold; }`
  },
  'app.js': {
    content: `document.getElementById('btn').addEventListener('click', () => {
  const time = new Date().toLocaleTimeString('ar-EG');
  document.getElementById('msg').textContent = '✓ النظام التفاعلي يعمل بكفاءة — التوقيت: ' + time;
  console.log('DevAI Studio Pro Runtime Checked at', time);
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

let projects = JSON.parse(localStorage.getItem('DEVAI_PROJECTS_PRO') || 'null') || [
  {
    id: 'proj-1',
    name: 'مشروع البداية الاحترافي',
    memory: 'مشروع ويب عربي متجاوب.',
    files: JSON.parse(JSON.stringify(DEFAULT_FILES)),
    history: [{ summary: 'النسخة الأولية', files: JSON.parse(JSON.stringify(DEFAULT_FILES)) }],
    messages: [
      {
        role: 'assistant',
        plan: ['تحليل متطلبات المستخدم بدقة', 'إنشاء وتعديل الملفات المعنية فقط مع الحفاظ على الميزات السابقة', 'فحص الأمان وتحديث المعاينة الحية'],
        text: 'مرحباً بك في **DevAI Studio Pro**! أنا مهندس البرمجيات الذكي الخاص بك.\nاكتب لي أي موقع أو تطبيق تريده وسأقوم بتحليله، وضع خطة هندسية، وكتابة الأكواد كاملة باحترافية.',
        changedFiles: []
      }
    ]
  }
];

let currentProjectId = projects[0].id;
let activeFile = 'index.html';
let isGenerating = false;
let lastRuntimeError = '';

function getCurrentProject() {
  return projects.find(p => p.id === currentProjectId) || projects[0];
}

function saveProjects() {
  localStorage.setItem('DEVAI_PROJECTS_PRO', JSON.stringify(projects));
}

function initApp() {
  lucide.createIcons();
  document.getElementById('geminiKeyInput').value = localStorage.getItem('DEVAI_GEMINI_KEY') || '';
  document.getElementById('githubTokenInput').value = localStorage.getItem('DEVAI_GITHUB_TOKEN') || '';
  document.getElementById('geminiModelSelect').value = localStorage.getItem('DEVAI_GEMINI_MODEL') || 'gemini-2.5-flash';

  if (window.innerWidth < 1024) {
    document.getElementById('panel-projects').classList.add('hidden');
  }

  updateApiKeyStatus();
  renderProjectsDropdown();
  renderFileList();
  renderHistory();
  renderChat();
  loadActiveFileInEditor();
  updateLivePreview();
  auditFirebaseRules();
}

function toggleDrawer(panelName) {
  const el = document.getElementById(`panel-${panelName}`);
  el.classList.toggle('hidden');
}

function updateApiKeyStatus() {
  const key = localStorage.getItem('DEVAI_GEMINI_KEY');
  const model = localStorage.getItem('DEVAI_GEMINI_MODEL') || 'gemini-2.5-flash';
  const badge = document.getElementById('aiStatusBadge');
  const btn = document.getElementById('apiKeyBtn');
  if (key) {
    badge.textContent = `متصل (${model.replace('gemini-', '')})`;
    badge.className = 'text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-semibold';
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
  localStorage.setItem('DEVAI_GEMINI_KEY', document.getElementById('geminiKeyInput').value.trim());
  localStorage.setItem('DEVAI_GITHUB_TOKEN', document.getElementById('githubTokenInput').value.trim());
  localStorage.setItem('DEVAI_GEMINI_MODEL', document.getElementById('geminiModelSelect').value);
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
    memory: '',
    files: JSON.parse(JSON.stringify(DEFAULT_FILES)),
    history: [{ summary: 'إنشاء المشروع', files: JSON.parse(JSON.stringify(DEFAULT_FILES)) }],
    messages: [{ role: 'assistant', plan: [], text: `تم إنشاء مشروع "${name.trim()}". صف لي المواصفات المطلوبة لنبدأ البناء فوراً.`, changedFiles: [] }]
  };
  projects.unshift(newProj);
  saveProjects();
  renderProjectsDropdown();
  switchProject(newProj.id);
}

function deleteCurrentProject() {
  if (projects.length <= 1) return alert('يجب بقاء مشروع واحد على الأقل.');
  const proj = getCurrentProject();
  if (!confirm(`هل أنت متأكد من حذف المشروع "${proj.name}" بالكامل؟`)) return;
  projects = projects.filter(p => p.id !== proj.id);
  currentProjectId = projects[0].id;
  saveProjects();
  renderProjectsDropdown();
  switchProject(currentProjectId);
}

function renderFileList() {
  const proj = getCurrentProject();
  const query = (document.getElementById('fileSearch').value || '').toLowerCase();
  const container = document.getElementById('fileList');

  const files = Object.keys(proj.files).filter(
    f => f.toLowerCase().includes(query) || (proj.files[f].content || '').toLowerCase().includes(query)
  );

  container.innerHTML = files
    .map(
      fileName => `
    <div onclick="selectFile('${fileName}')" class="group flex items-center justify-between px-2.5 py-2 rounded-lg text-xs cursor-pointer transition ${
        activeFile === fileName
          ? 'bg-indigo-600/20 text-indigo-400 font-bold border border-indigo-500/30'
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
  renderDiffView();
}

function loadActiveFileInEditor() {
  const proj = getCurrentProject();
  const content = proj.files[activeFile]?.content || '';
  document.getElementById('activeFileName').textContent = activeFile;
  document.getElementById('codeEditor').value = content;
  updateLineNumbersAndDiagnostics(content);
}

function updateLineNumbersAndDiagnostics(content) {
  const lines = content.split('\n').length;
  document.getElementById('lineCountInfo').textContent = `Lines: ${lines} | Chars: ${content.length}`;
  const nums = Array.from({ length: lines }, (_, i) => i + 1).join('<br>');
  document.getElementById('lineNumbers').innerHTML = nums;

  const diag = document.getElementById('diagnosticsText');
  if (activeFile.endsWith('.js')) {
    try {
      new Function(content);
      diag.textContent = '✓ JavaScript Syntax Valid';
      diag.className = 'text-emerald-400';
    } catch (err) {
      diag.textContent = `⚠ Syntax Warning: ${err.message}`;
      diag.className = 'text-amber-400';
    }
  } else {
    diag.textContent = `✓ Editing ${activeFile}`;
    diag.className = 'text-emerald-400';
  }
}

function syncEditorScroll() {
  const editor = document.getElementById('codeEditor');
  document.getElementById('lineNumbers').scrollTop = editor.scrollTop;
}

function onCodeChange(newVal) {
  const proj = getCurrentProject();
  if (proj.files[activeFile]) {
    proj.files[activeFile].content = newVal;
    updateLineNumbersAndDiagnostics(newVal);
    saveProjects();
    updateLivePreview();
    auditFirebaseRules();
  }
}

function createNewFile() {
  const name = prompt('أدخل مسار واسم الملف الجديد (مثال: pages/about.html أو components/navbar.js):');
  if (!name || !name.trim()) return;
  const clean = name.trim();
  const proj = getCurrentProject();
  proj.files[clean] = { content: '' };
  saveProjects();
  selectFile(clean);
}

function deleteFile(fileName) {
  const proj = getCurrentProject();
  if (Object.keys(proj.files).length <= 1) return alert('لا يمكن حذف جميع ملفات المشروع.');
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
    <div class="flex items-center justify-between text-[11px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 rounded-lg">
      <span class="truncate">${h.summary}</span>
      <button onclick="restoreHistory(${proj.history.length - 1 - idx})" class="text-indigo-400 hover:underline font-semibold shrink-0 ml-2">استعادة</button>
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
  renderDiffView();
}

function renderDiffView() {
  const proj = getCurrentProject();
  document.getElementById('diffFileName').textContent = activeFile;
  const currentContent = (proj.files[activeFile]?.content || '').split('\n');
  const prevHistory = proj.history.length > 1 ? proj.history[proj.history.length - 2] : proj.history[0];
  const oldContent = (prevHistory?.files?.[activeFile]?.content || '').split('\n');

  const maxLines = Math.max(currentContent.length, oldContent.length);
  const rows = [];

  for (let i = 0; i < maxLines; i++) {
    const oldLine = oldContent[i];
    const newLine = currentContent[i];
    if (oldLine === newLine) {
      rows.push(`<div class="text-slate-400 px-2">  ${escapeHtml(newLine ?? '')}</div>`);
    } else {
      if (oldLine !== undefined) {
        rows.push(`<div class="bg-rose-950/60 text-rose-300 px-2">- ${escapeHtml(oldLine)}</div>`);
      }
      if (newLine !== undefined) {
        rows.push(`<div class="bg-emerald-950/60 text-emerald-300 px-2">+ ${escapeHtml(newLine)}</div>`);
      }
    }
  }
  document.getElementById('diffOutput').innerHTML = rows.join('');
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderChat() {
  const proj = getCurrentProject();
  const box = document.getElementById('chatMessages');
  box.innerHTML = proj.messages
    .map(
      m => `
    <div class="p-3 rounded-2xl text-xs leading-relaxed ${
      m.role === 'user'
        ? 'bg-indigo-600 text-white mr-6 shadow-md'
        : 'bg-slate-100 dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 ml-3 border border-slate-200 dark:border-slate-700'
    }">
      ${
        m.plan && m.plan.length
          ? `<div class="mb-2 p-2 rounded-lg bg-indigo-950/40 border border-indigo-500/30">
              <div class="font-bold text-indigo-300 text-[11px] mb-1">📋 خطة التنفيذ الهندسية:</div>
              <ul class="list-disc list-inside space-y-0.5 text-[11px] text-slate-300">
                ${m.plan.map(step => `<li>${step}</li>`).join('')}
              </ul>
            </div>`
          : ''
      }
      <div class="whitespace-pre-wrap">${m.text}</div>
      ${
        m.changedFiles && m.changedFiles.length
          ? `<div class="mt-2.5 pt-2 border-t border-slate-300 dark:border-slate-700">
              <span class="text-[10px] text-emerald-400 font-bold block mb-1">✓ الملفات التي تم إنشاؤها أو تحديثها:</span>
              <div class="flex flex-wrap gap-1">
                ${m.changedFiles
                  .map(
                    f => `<button onclick="selectFile('${f}'); switchTab('editor');" class="text-[10px] bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded">${f}</button>`
                  )
                  .join('')}
              </div>
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

function explainCurrentFile() {
  document.getElementById('aiModeSelect').value = 'explainer';
  quickPrompt(`اشرح لي كود الملف (${activeFile}) بالتفصيل باللغة العربية، ووضح كيف يعمل وأي تحسينات مقترحة للأداء أو الأمان.`);
}

async function handleSendMessage() {
  const input = document.getElementById('promptInput');
  const text = input.value.trim();
  if (!text || isGenerating) return;

  const apiKey = localStorage.getItem('DEVAI_GEMINI_KEY');
  const model = localStorage.getItem('DEVAI_GEMINI_MODEL') || 'gemini-2.5-flash';
  const mode = document.getElementById('aiModeSelect').value;
  const proj = getCurrentProject();

  if (!apiKey) {
    toggleSettings(true);
    proj.messages.push(
      { role: 'user', text },
      { role: 'assistant', plan: [], text: '⚠️ يرجى إدخال مفتاح Gemini API في نافذة الإعدادات لتفعيل المهندس الذكي.', changedFiles: [] }
    );
    input.value = '';
    saveProjects();
    renderChat();
    return;
  }

  input.value = '';
  isGenerating = true;
  proj.messages.push({ role: 'user', text });
  proj.messages.push({
    role: 'assistant',
    plan: ['قراءة سياق المشروع والملفات الحالية', 'تصميم الحل البرمجي المتكامل', 'توليد وتحديث الأكواد'],
    text: '⏳ جاري هندسة الحل وكتابة الأكواد البرمجية المتقدمة...',
    changedFiles: []
  });
  renderChat();

  try {
    const filesContext = Object.entries(proj.files)
      .map(([name, obj]) => `=== FILE: ${name} ===\n${obj.content}`)
      .join('\n\n');

    const recentHistory = proj.messages
      .slice(-6, -2)
      .map(m => `${m.role === 'user' ? 'المستخدم' : 'المساعد'}: ${m.text}`)
      .join('\n');

    const systemInstruction = `أنت "DevAI Studio Chief Architect"، مهندس برمجيات خبير في بناء المواقع والتطبيقات الكاملة (HTML5, CSS3, Modern JavaScript, TailwindCSS, React, Next.js, PWA, Firebase, REST APIs).
الوضع المختار حالياً: ${mode}.
ذاكرة المشروع: ${proj.memory || 'مشروع متطور قيد البناء'}.

قواعد الهندسة الصارمة:
1. عندما يطلب المستخدم بناء موقع أو ميزة، اكتب كوداً كاملاً، غنياً، تفاعلياً، بتصميم عصري فائق الجودة ومتجاوب مع الجوال والكمبيوتر، ولا تترك أبداً أجزاء ناقصة أو تعليقات مثل "أكمل الكود هنا".
2. إذا كان الطلب تعديلاً أو إضافة ميزة، حافظ تماماً على الميزات السابقة في الملفات وعدّل أو أضف ما يلزم بذكاء دون إفساد الكود القديم.
3. تأكد أن ملف index.html يعمل مباشرة في المعاينة الحية ويستدعي التنسيقات والسكربتات بشكل صحيح (يمكنك استخدام Tailwind CDN أو Google Fonts أو أيقونات عند الحاجة لتحسين التصميم).
4. أخرج النتيجة حصرياً بصيغة JSON مطابقة للـ Schema المحدد تحتوي على:
   - plan: مصفوفة خطوات هندسية واضحة بالعربية.
   - explanation: شرح عربي وافٍ للتعديلات والميزات المضافة أو المراجعة الأمنية.
   - projectMemory: ملخص قصير يحدث ذاكرة المشروع ليبقى السياق محفوظاً.
   - files: مصفوفة بالملفات التي أنشأتها أو عدلتها فقط مع محتواها الكامل (content).`;

    const responseSchema = {
      type: 'OBJECT',
      properties: {
        plan: { type: 'ARRAY', items: { type: 'STRING' } },
        explanation: { type: 'STRING' },
        projectMemory: { type: 'STRING' },
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
      required: ['plan', 'explanation', 'files']
    };

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `سجل المحادثة الأخير:\n${recentHistory}\n\nملفات المشروع الحالية:\n${filesContext}\n\nالطلب الجديد من المستخدم:\n${text}`
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.4,
            responseMimeType: 'application/json',
            responseSchema
          }
        })
      }
    );

    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || 'تعذر الاتصال بـ Gemini API');

    const parsed = JSON.parse(data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}');
    const changed = [];

    if (parsed.projectMemory) {
      proj.memory = parsed.projectMemory;
    }

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
      activeFile = changed.includes('index.html') ? 'index.html' : changed[0];
    }

    proj.messages.pop();
    proj.messages.push({
      role: 'assistant',
      plan: parsed.plan || [],
      text: parsed.explanation || 'تم تنفيذ الخطة وتحديث الملفات بنجاح.',
      changedFiles: changed
    });

    saveProjects();
    renderFileList();
    renderHistory();
    renderChat();
    loadActiveFileInEditor();
    updateLivePreview();
    auditFirebaseRules();
    renderDiffView();
  } catch (err) {
    proj.messages.pop();
    proj.messages.push({ role: 'assistant', plan: [], text: '❌ حدث خطأ: ' + err.message, changedFiles: [] });
    saveProjects();
    renderChat();
  } finally {
    isGenerating = false;
  }
}

function updateLivePreview() {
  const proj = getCurrentProject();
  let html = proj.files['index.html']?.content || '<h2 style="font-family:sans-serif;text-align:center;margin-top:40px;">لا يوجد ملف index.html في المشروع</h2>';
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
        const oLog = console.log, oErr = console.error, oWarn = console.warn;
        console.log = function(){ send('info', arguments); oLog.apply(console, arguments); };
        console.warn = function(){ send('warn', arguments); oWarn.apply(console, arguments); };
        console.error = function(){ send('error', arguments); oErr.apply(console, arguments); };
        window.addEventListener('error', e => send('error', [e.message + ' (Line ' + e.lineno + ')']));
      })();
    <\/script>`;

  // إزالة روابط الملفات المحلية لتعويضها بالمحتوى المدمج مباشرة
  html = html.replace(/<link[^>]*href=["']style\.css["'][^>]*>/gi, '');
  html = html.replace(/<script[^>]*src=["']app\.js["'][^>]*><\/script>/gi, '');

  if (html.includes('</head>')) {
    html = html.replace('</head>', `<style>${css}</style>${interceptor}</head>`);
  } else {
    html = `<style>${css}</style>${interceptor}` + html;
  }

  if (html.includes('</body>')) {
    html = html.replace('</body>', `<script>${js}<\/script></body>`);
  } else {
    html = html + `<script>${js}<\/script>`;
  }

  document.getElementById('previewFrame').srcdoc = html;
}

window.addEventListener('message', e => {
  if (e.data?.type === 'DEVAI_CONSOLE') {
    const out = document.getElementById('consoleOutput');
    if (out.textContent === 'No console logs yet...') out.innerHTML = '';
    const div = document.createElement('div');
    div.className = e.data.level === 'error' ? 'text-rose-400 font-bold' : e.data.level === 'warn' ? 'text-amber-300' : 'text-emerald-300';
    div.textContent = `[${e.data.level.toUpperCase()}] ${e.data.text}`;
    out.appendChild(div);
    out.scrollTop = out.scrollHeight;

    if (e.data.level === 'error') {
      lastRuntimeError = e.data.text;
      document.getElementById('autoFixBtn').classList.remove('hidden');
    }
  }
});

function autoFixConsoleError() {
  if (!lastRuntimeError) return;
  document.getElementById('aiModeSelect').value = 'debugger';
  quickPrompt(`ظهر هذا الخطأ أثناء تشغيل المشروع في المعاينة الحية:\n${lastRuntimeError}\nيرجى تحليل سبب الخطأ وإصلاحه فوراً في الكود.`);
  document.getElementById('autoFixBtn').classList.add('hidden');
}

function clearConsole() {
  lastRuntimeError = '';
  document.getElementById('autoFixBtn').classList.add('hidden');
  document.getElementById('consoleOutput').innerHTML = 'No console logs yet...';
}

function switchTab(tab) {
  ['editor', 'preview', 'diff', 'firebase', 'github'].forEach(t => {
    document.getElementById(`view-${t}`).classList.toggle('hidden', t !== tab);
    document.getElementById(`view-${t}`).classList.toggle('flex', t === tab);
    document.getElementById(`tab-${t}`).className =
      t === tab
        ? 'px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 text-white'
        : 'px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800';
  });
  if (tab === 'diff') renderDiffView();
}

function setPreviewSize(mode) {
  switchTab('preview');
  const box = document.getElementById('previewContainer');
  box.style.width = mode === 'mobile' ? '375px' : mode === 'tablet' ? '768px' : '100%';
}

function copyActiveCode() {
  const proj = getCurrentProject();
  navigator.clipboard.writeText(proj.files[activeFile]?.content || '');
  alert('تم نسخ كود الملف بنجاح!');
}

function downloadActiveFile() {
  const proj = getCurrentProject();
  const blob = new Blob([proj.files[activeFile]?.content || ''], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = activeFile.split('/').pop();
  a.click();
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
  const proj = getCurrentProject();

  if (file.name.endsWith('.zip')) {
    const zip = await JSZip.loadAsync(file);
    const imported = {};
    for (const [path, entry] of Object.entries(zip.files)) {
      if (!entry.dir) {
        imported[path] = { content: await entry.async('string') };
      }
    }
    if (Object.keys(imported).length > 0) {
      proj.files = imported;
      proj.history.push({ summary: `استيراد ${file.name}`, files: JSON.parse(JSON.stringify(imported)) });
      activeFile = Object.keys(imported)[0];
    }
  } else {
    const text = await file.text();
    proj.files[file.name] = { content: text };
    proj.history.push({ summary: `رفع ${file.name}`, files: JSON.parse(JSON.stringify(proj.files)) });
    activeFile = file.name;
  }

  saveProjects();
  renderFileList();
  renderHistory();
  loadActiveFileInEditor();
  updateLivePreview();
}

function auditFirebaseRules() {
  const proj = getCurrentProject();
  const rules = proj.files['firestore.rules']?.content || '';
  const box = document.getElementById('firebaseAuditBox');
  const warnings = [];

  if (rules.includes('if true')) {
    warnings.push('🚨 خطر أمني حرج: القاعدة تحتوي على (allow read, write: if true) مما يسمح لأي شخص باختراق أو مسح قاعدة البيانات.');
  }
  if (!rules.includes('request.auth')) {
    warnings.push('⚠️ تنبيه: لا يوجد تحقق من هوية المستخدم (request.auth != null).');
  }

  if (warnings.length > 0) {
    box.innerHTML = warnings.map(w => `<div class="text-rose-400 font-bold mb-1">${w}</div>`).join('');
  } else {
    box.innerHTML = `<div class="text-emerald-400 font-bold">✅ قواعد أمان Firebase الحالية محكمة وتعزل بيانات كل مستخدم بأمان (request.auth.uid == userId).</div>`;
  }
}

async function fetchGithubRepos() {
  const token = localStorage.getItem('DEVAI_GITHUB_TOKEN');
  if (!token) return toggleSettings(true);
  const status = document.getElementById('ghStatus');
  status.textContent = 'جاري جلب المستودعات من GitHub...';
  try {
    const res = await fetch('https://api.github.com/user/repos?sort=updated&per_page=25', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('تأكد من صلاحية مفتاح GitHub Token');
    const repos = await res.json();
    const select = document.getElementById('ghRepoSelect');
    select.innerHTML = repos.map(r => `<option value="${r.full_name}">${r.full_name}</option>`).join('');
    document.getElementById('ghControls').classList.remove('hidden');
    status.textContent = `✓ تم الاتصال وجلب ${repos.length} مستودع بنجاح.`;
  } catch (err) {
    status.textContent = '❌ ' + err.message;
  }
}

async function importRepoFromGithub() {
  const token = localStorage.getItem('DEVAI_GITHUB_TOKEN');
  const repo = document.getElementById('ghRepoSelect').value;
  const status = document.getElementById('ghStatus');
  status.textContent = `جاري استيراد ملفات ${repo}...`;
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/contents`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('تعذر قراءة محتويات المستودع');
    const items = await res.json();
    const proj = getCurrentProject();
    let count = 0;

    for (const item of items) {
      if (item.type === 'file' && item.size < 200000) {
        const fileRes = await fetch(item.download_url);
        proj.files[item.path] = { content: await fileRes.text() };
        count++;
      }
    }

    proj.history.push({ summary: `استيراد من ${repo}`, files: JSON.parse(JSON.stringify(proj.files)) });
    saveProjects();
    renderFileList();
    renderHistory();
    loadActiveFileInEditor();
    updateLivePreview();
    status.textContent = `✅ تم استيراد ${count} ملف من ${repo} بنجاح!`;
  } catch (err) {
    status.textContent = '❌ ' + err.message;
  }
}

async function pushAllFilesToGithub() {
  const token = localStorage.getItem('DEVAI_GITHUB_TOKEN');
  const repo = document.getElementById('ghRepoSelect').value;
  const message = document.getElementById('ghCommitMsg').value;
  const proj = getCurrentProject();
  const files = Object.keys(proj.files);

  if (!confirm(`هل توافق على رفع (${files.length} ملفات) إلى المستودع ${repo}؟`)) return;

  const status = document.getElementById('ghStatus');
  try {
    for (const filePath of files) {
      status.textContent = `جاري رفع ${filePath}...`;
      const contentEncoded = btoa(unescape(encodeURIComponent(proj.files[filePath].content)));
      let sha;
      const check = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (check.ok) sha = (await check.json()).sha;

      const put = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, content: contentEncoded, ...(sha ? { sha } : {}) })
      });
      if (!put.ok) throw new Error(`فشل رفع الملف ${filePath}`);
    }
    status.textContent = `✅ تم رفع جميع ملفات المشروع (${files.length}) بنجاح إلى ${repo}!`;
  } catch (err) {
    status.textContent = '❌ ' + err.message;
  }
}

function toggleTheme() {
  document.documentElement.classList.toggle('dark');
}

window.addEventListener('DOMContentLoaded', initApp);
