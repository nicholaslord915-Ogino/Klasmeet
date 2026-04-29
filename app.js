// STATE 
let state = {
  currentUser: null,
  users: JSON.parse(localStorage.getItem('km_users') || '[]'),
  classes: JSON.parse(localStorage.getItem('km_classes') || '[]'),
  messages: JSON.parse(localStorage.getItem('km_messages') || '{}'),
  tasks: JSON.parse(localStorage.getItem('km_tasks') || '{}'),
  submissions: JSON.parse(localStorage.getItem('km_submissions') || '{}'),
  meetings: JSON.parse(localStorage.getItem('km_meetings') || '{}'),
  currentClassId: null,
  pendingSubmitTaskId: null,
};

function save() {
  localStorage.setItem('km_users', JSON.stringify(state.users));
  localStorage.setItem('km_classes', JSON.stringify(state.classes));
  localStorage.setItem('km_messages', JSON.stringify(state.messages));
  localStorage.setItem('km_tasks', JSON.stringify(state.tasks));
  localStorage.setItem('km_submissions', JSON.stringify(state.submissions));
  localStorage.setItem('km_meetings', JSON.stringify(state.meetings));
}

//  UTILS 
function genId() { return Math.random().toString(36).slice(2, 10); }
function genCode() { return Math.random().toString(36).slice(2, 8).toUpperCase(); }
function initials(name) { return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(); }
function timeNow() { return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}
function fmtDateTime(d) {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = (type === 'error' ? '❌ ' : '✅ ') + msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

//  AUTH 
function switchTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.auth-form').forEach(f => f.classList.toggle('active', f.id === tab + '-form'));
}

function login() {
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-password').value;
  if (!email || !pass) return showToast('Fill in all fields', 'error');
  const user = state.users.find(u => u.email === email && u.password === pass);
  if (!user) return showToast('Invalid email or password', 'error');
  state.currentUser = user;
  enterApp();
}

function signup() {
  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const pass = document.getElementById('signup-password').value;
  const role = document.getElementById('signup-role').value;
  if (!name || !email || !pass) return showToast('Fill in all fields', 'error');
  if (state.users.find(u => u.email === email)) return showToast('Email already registered', 'error');
  const user = { id: genId(), name, email, password: pass, role };
  state.users.push(user);
  save();
  state.currentUser = user;
  enterApp();
}

function logout() {
  state.currentUser = null;
  state.currentClassId = null;
  document.getElementById('auth-screen').classList.add('active');
  document.getElementById('dashboard-screen').classList.remove('active');
  showDashboard();
}

function enterApp() {
  const u = state.currentUser;
  document.getElementById('auth-screen').classList.remove('active');
  document.getElementById('dashboard-screen').classList.add('active');
  document.getElementById('sidebar-name').textContent = u.name;
  document.getElementById('sidebar-role').textContent = u.role;
  document.getElementById('sidebar-avatar').textContent = initials(u.name);
  document.getElementById('welcome-name').textContent = u.name.split(' ')[0];
  showDashboard();
  updateStats();
}

// NAVIGATION 
function showDashboard() {
  document.getElementById('home-view').classList.add('active');
  document.getElementById('class-view').classList.remove('active');
  document.querySelectorAll('.nav-item').forEach((b, i) => b.classList.toggle('active', i === 0));
  renderClasses();
  updateStats();
}

function showClasses() {
  document.querySelectorAll('.nav-item').forEach((b, i) => b.classList.toggle('active', i === 1));
  renderClasses();
}

//  CLASSES 
function myClasses() {
  if (!state.currentUser) return [];
  return state.classes.filter(c => c.members.some(m => m.id === state.currentUser.id));
}

function renderClasses() {
  const grid = document.getElementById('classes-grid');
  const classes = myClasses();
  if (classes.length === 0) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-icon">📚</div><p>No classes yet. Create or join one!</p></div>`;
    return;
  }
  grid.innerHTML = classes.map((c, i) => `
    <div class="class-card class-card-color-${i % 5}" onclick="openClass('${c.id}')">
      <div class="class-card-name">${c.name}</div>
      <div class="class-card-subject">${c.subject}</div>
      <div class="class-card-meta">
        <span class="class-card-code">${c.code}</span>
        <span class="class-card-members">👥 ${c.members.length} member${c.members.length !== 1 ? 's' : ''}</span>
      </div>
    </div>
  `).join('');
}

function updateStats() {
  const classes = myClasses();
  document.getElementById('stat-classes').textContent = classes.length;
  let pending = 0, totalMembers = 0;
  classes.forEach(c => {
    totalMembers += c.members.length;
    const tasks = state.tasks[c.id] || [];
    tasks.forEach(t => {
      const subs = state.submissions[t.id] || [];
      const mine = subs.find(s => s.userId === state.currentUser?.id);
      if (!mine) pending++;
    });
  });
  document.getElementById('stat-tasks').textContent = pending;
  document.getElementById('stat-members').textContent = totalMembers;
}

function createClass() {
  const name = document.getElementById('new-class-name').value.trim();
  const subject = document.getElementById('new-class-subject').value.trim();
  if (!name || !subject) return showToast('Fill in all fields', 'error');
  const cls = {
    id: genId(),
    name, subject,
    code: genCode(),
    creatorId: state.currentUser.id,
    members: [{ id: state.currentUser.id, name: state.currentUser.name, email: state.currentUser.email, role: state.currentUser.role }],
    createdAt: new Date().toISOString(),
  };
  state.classes.push(cls);
  save();
  closeModal('create-modal');
  document.getElementById('new-class-name').value = '';
  document.getElementById('new-class-subject').value = '';
  showToast(`Class "${name}" created!`);
  renderClasses();
  updateStats();
}

function joinClass() {
  const code = document.getElementById('join-code').value.trim().toUpperCase();
  if (!code) return showToast('Enter a class code', 'error');
  const cls = state.classes.find(c => c.code === code);
  if (!cls) return showToast('Class not found', 'error');
  if (cls.members.some(m => m.id === state.currentUser.id)) return showToast('Already in this class', 'error');
  cls.members.push({ id: state.currentUser.id, name: state.currentUser.name, email: state.currentUser.email, role: state.currentUser.role });
  save();
  closeModal('join-modal');
  document.getElementById('join-code').value = '';
  showToast(`Joined "${cls.name}"!`);
  renderClasses();
  updateStats();
}

//  CLASS VIEW 
function openClass(classId) {
  state.currentClassId = classId;
  const cls = state.classes.find(c => c.id === classId);
  document.getElementById('class-title').textContent = cls.name;
  document.getElementById('class-code-display').textContent = cls.code;
  document.getElementById('home-view').classList.remove('active');
  document.getElementById('class-view').classList.add('active');
  showTab('tasks');
}

function showTab(tab) {
  document.querySelectorAll('.class-tab').forEach((b, i) => {
    const tabs = ['tasks', 'meet', 'chat', 'members'];
    b.classList.toggle('active', tabs[i] === tab);
  });
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById(`tab-${tab}`).classList.add('active');
  if (tab === 'tasks') renderTasks();
  if (tab === 'meet') renderMeet();
  if (tab === 'chat') renderChat();
  if (tab === 'members') renderMembers();
}

// TASKS 
function renderTasks() {
  const cls = state.classes.find(c => c.id === state.currentClassId);
  const isTeacher = cls.creatorId === state.currentUser.id || state.currentUser.role === 'teacher';
  const actionsEl = document.getElementById('task-actions');
  actionsEl.innerHTML = isTeacher
    ? `<button class="btn-primary" onclick="openModal('task-modal')">+ Upload Task</button>`
    : '';
  const tasks = state.tasks[state.currentClassId] || [];
  const list = document.getElementById('tasks-list');
  if (tasks.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><p>No tasks yet.</p></div>`;
    return;
  }
  list.innerHTML = tasks.map(t => {
    const subs = state.submissions[t.id] || [];
    const mine = subs.find(s => s.userId === state.currentUser.id);
    const status = mine ? 'submitted' : 'pending';
    return `
      <div class="task-card">
        <div class="task-info">
          <div class="task-name">${t.title}</div>
          <div class="task-desc">${t.description}</div>
          <div class="task-due">Due: <span>${fmtDate(t.dueDate)}</span></div>
          ${mine ? `<div class="task-due" style="margin-top:4px">Submitted: <span>${mine.answer.slice(0, 50)}${mine.answer.length > 50 ? '…' : ''}</span></div>` : ''}
          ${!isTeacher && !mine ? `<button class="btn-submit" onclick="openSubmit('${t.id}')">Submit Task</button>` : ''}
          ${isTeacher ? `<div style="margin-top:8px;font-size:0.82rem;color:var(--text-2)">📥 ${subs.length} submission(s)</div>` : ''}
        </div>
        <span class="status-badge status-${status}">${status === 'submitted' ? '✓ Submitted' : '⏳ Pending'}</span>
      </div>
    `;
  }).join('');
}

function createTask() {
  const title = document.getElementById('task-title').value.trim();
  const desc = document.getElementById('task-desc').value.trim();
  const due = document.getElementById('task-due').value;
  if (!title || !desc) return showToast('Fill in all fields', 'error');
  const task = { id: genId(), title, description: desc, dueDate: due, classId: state.currentClassId, createdAt: new Date().toISOString() };
  if (!state.tasks[state.currentClassId]) state.tasks[state.currentClassId] = [];
  state.tasks[state.currentClassId].push(task);
  save();
  closeModal('task-modal');
  document.getElementById('task-title').value = '';
  document.getElementById('task-desc').value = '';
  document.getElementById('task-due').value = '';
  showToast('Task uploaded!');
  renderTasks();
  updateStats();
}

function openSubmit(taskId) {
  state.pendingSubmitTaskId = taskId;
  document.getElementById('submit-answer').value = '';
  openModal('submit-modal');
}

function submitTask() {
  const answer = document.getElementById('submit-answer').value.trim();
  if (!answer) return showToast('Write your answer or paste a link', 'error');
  const tid = state.pendingSubmitTaskId;
  if (!state.submissions[tid]) state.submissions[tid] = [];
  state.submissions[tid] = state.submissions[tid].filter(s => s.userId !== state.currentUser.id);
  state.submissions[tid].push({ userId: state.currentUser.id, answer, submittedAt: new Date().toISOString() });
  save();
  closeModal('submit-modal');
  showToast('Task submitted!');
  renderTasks();
  updateStats();
}

//  MEET 
function renderMeet() {
  const cls = state.classes.find(c => c.id === state.currentClassId);
  const isTeacher = cls.creatorId === state.currentUser.id || state.currentUser.role === 'teacher';
  const btns = document.getElementById('meet-buttons');
  btns.innerHTML = isTeacher
    ? `<button class="btn-meet" onclick="openModal('meeting-modal')">+ Create Meeting</button>`
    : '';
  const meetings = state.meetings[state.currentClassId] || [];
  const list = document.getElementById('meetings-list');
  if (meetings.length === 0) {
    list.innerHTML = '';
    return;
  }
  list.innerHTML = meetings.map(m => `
    <div class="meeting-card">
      <div class="meeting-info">
        <div class="meeting-title">🎥 ${m.title}</div>
        <div class="meeting-time">${fmtDateTime(m.datetime)}</div>
      </div>
      <a href="${m.link}" target="_blank" class="btn-join-meeting">Join →</a>
    </div>
  `).join('');
}

function createMeeting() {
  const title = document.getElementById('meeting-title').value.trim();
  const link = document.getElementById('meeting-link').value.trim();
  const datetime = document.getElementById('meeting-datetime').value;
  if (!title || !link) return showToast('Fill in all fields', 'error');
  const m = { id: genId(), title, link, datetime, classId: state.currentClassId, createdAt: new Date().toISOString() };
  if (!state.meetings[state.currentClassId]) state.meetings[state.currentClassId] = [];
  state.meetings[state.currentClassId].push(m);
  save();
  closeModal('meeting-modal');
  document.getElementById('meeting-title').value = '';
  document.getElementById('meeting-link').value = '';
  document.getElementById('meeting-datetime').value = '';
  showToast('Meeting created!');
  renderMeet();
}

// CHAT 
function renderChat() {
  const msgs = state.messages[state.currentClassId] || [];
  const container = document.getElementById('chat-messages');
  if (msgs.length === 0) {
    container.innerHTML = '<div class="chat-placeholder">Say hello to your class! 👋</div>';
    return;
  }
  container.innerHTML = msgs.map(m => {
    const isOwn = m.userId === state.currentUser.id;
    return `
      <div class="message-bubble ${isOwn ? 'own' : ''}">
        <div class="msg-avatar" style="background: ${isOwn ? 'linear-gradient(135deg,var(--teal),#00A0B2)' : 'linear-gradient(135deg,#6C47FF,#B47FFF)'}">
          ${initials(m.name)}
        </div>
        <div class="msg-content">
          <div class="msg-name">${isOwn ? 'You' : m.name}</div>
          <div class="msg-text">${escapeHtml(m.text)}</div>
          <div class="msg-time">${m.time}</div>
        </div>
      </div>
    `;
  }).join('');
  container.scrollTop = container.scrollHeight;
}

function sendMessage() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;
  if (!state.messages[state.currentClassId]) state.messages[state.currentClassId] = [];
  state.messages[state.currentClassId].push({
    id: genId(),
    userId: state.currentUser.id,
    name: state.currentUser.name,
    text,
    time: timeNow(),
  });
  save();
  input.value = '';
  renderChat();
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

//  MEMBERS 
function renderMembers() {
  const cls = state.classes.find(c => c.id === state.currentClassId);
  const list = document.getElementById('members-list');
  list.innerHTML = cls.members.map(m => `
    <div class="member-item">
      <div class="avatar">${initials(m.name)}</div>
      <div class="member-info">
        <div class="member-name">${m.name} ${m.id === cls.creatorId ? '👑' : ''}</div>
        <div class="member-email">${m.email}</div>
      </div>
      <span class="member-role-badge role-${m.role}">${m.role}</span>
    </div>
  `).join('');
}

//  MODALS 
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }