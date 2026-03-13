// ── State ──────────────────────────────────────────────────────────
let tasks = loadTasks();
let dragSrcId = null;

// ── Init ───────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  render();
  bindNav();
  bindModal();
  bindTracker();
  bindGroups();
  bindDateAutoAdvance();
});

// ── Theme ──────────────────────────────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem('kb_theme') || 'light';
  document.documentElement.dataset.theme = saved;
  document.getElementById('theme-toggle').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('kb_theme', next);
  });
}

// ── Segmented group helpers ─────────────────────────────────────────
function setGroupValue(groupId, value) {
  const group = document.getElementById(groupId);
  group.querySelectorAll('.seg-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.value === value);
  });
  document.getElementById(group.dataset.input).value = value;
}

function bindGroups() {
  document.querySelectorAll('.seg-group').forEach(group => {
    group.querySelectorAll('.seg-btn').forEach(btn => {
      btn.addEventListener('click', () => setGroupValue(group.id, btn.dataset.value));
    });
  });
}

// ── Date parts helpers ──────────────────────────────────────────────
function setDateParts(iso) {
  if (iso) {
    const [y, m, d] = iso.split('-');
    document.getElementById('task-due-day').value   = parseInt(d, 10);
    document.getElementById('task-due-month').value = parseInt(m, 10);
    document.getElementById('task-due-year').value  = y;
  } else {
    document.getElementById('task-due-day').value   = '';
    document.getElementById('task-due-month').value = '';
    document.getElementById('task-due-year').value  = '';
  }
}

function getDateFromParts() {
  const d = document.getElementById('task-due-day').value;
  const m = document.getElementById('task-due-month').value;
  const y = document.getElementById('task-due-year').value;
  if (!d || !m || !y) return '';
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}

function bindDateAutoAdvance() {
  const day   = document.getElementById('task-due-day');
  const month = document.getElementById('task-due-month');
  const year  = document.getElementById('task-due-year');
  day.addEventListener('input', () => { if (day.value.length >= 2) month.focus(); });
  month.addEventListener('input', () => { if (month.value.length >= 2) year.focus(); });
}

// ── Storage ────────────────────────────────────────────────────────
function loadTasks() {
  try { return JSON.parse(localStorage.getItem('kb_tasks')) || []; }
  catch { return []; }
}

function saveTasks() {
  localStorage.setItem('kb_tasks', JSON.stringify(tasks));
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ── Render ─────────────────────────────────────────────────────────
function render() {
  renderKanban();
  renderTracker();
  updateSidebar();
}

function renderKanban() {
  ['todo', 'inprocess', 'done'].forEach(status => {
    const list = document.getElementById('list-' + status);
    const badge = document.getElementById('badge-' + status);
    const col = tasks.filter(t => t.status === status);
    badge.textContent = col.length;
    list.innerHTML = '';
    col.forEach(t => list.appendChild(createCard(t)));
    bindDrop(list, status);
  });
}

function createCard(task) {
  const card = document.createElement('div');
  card.className = 'card';
  card.draggable = true;
  card.dataset.id = task.id;

  const dueHtml = task.due
    ? `<span class="card-due ${dueCls(task.due)}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        ${formatDate(task.due)}
      </span>`
    : '';

  const descHtml = task.desc
    ? `<p class="card-desc">${escHtml(task.desc)}</p>`
    : '';

  card.innerHTML = `
    <div class="card-top">
      <span class="card-title">${escHtml(task.title)}</span>
      <div class="card-actions">
        <button class="card-action-btn edit" title="Edit" data-id="${task.id}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="card-action-btn delete" title="Delete" data-id="${task.id}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
          </svg>
        </button>
      </div>
    </div>
    ${descHtml}
    <div class="card-footer">
      <span class="priority-badge priority-${task.priority}">${priorityIcon(task.priority)}${task.priority}</span>
      ${dueHtml}
    </div>
  `;

  card.addEventListener('dragstart', e => {
    dragSrcId = task.id;
    setTimeout(() => card.classList.add('dragging'), 0);
  });
  card.addEventListener('dragend', () => {
    card.classList.remove('dragging');
    dragSrcId = null;
    document.querySelectorAll('.card-list').forEach(l => l.classList.remove('drag-over'));
  });

  card.querySelector('.edit').addEventListener('click', () => openModal(task));
  card.querySelector('.delete').addEventListener('click', () => deleteTask(task.id));

  return card;
}

function bindDrop(list, status) {
  list.addEventListener('dragover', e => {
    e.preventDefault();
    list.classList.add('drag-over');
  });
  list.addEventListener('dragleave', () => list.classList.remove('drag-over'));
  list.addEventListener('drop', e => {
    e.preventDefault();
    list.classList.remove('drag-over');
    if (dragSrcId) {
      const t = tasks.find(t => t.id === dragSrcId);
      if (t && t.status !== status) {
        t.status = status;
        saveTasks();
        render();
      }
    }
  });
}

// ── Tracker ────────────────────────────────────────────────────────
function renderTracker(filter = {}) {
  const body = document.getElementById('tracker-body');
  const empty = document.getElementById('tracker-empty');

  let filtered = tasks.filter(t => {
    const q = (filter.query || '').toLowerCase();
    if (q && !t.title.toLowerCase().includes(q) && !(t.desc || '').toLowerCase().includes(q)) return false;
    if (filter.status && t.status !== filter.status) return false;
    if (filter.priority && t.priority !== filter.priority) return false;
    return true;
  });

  if (filtered.length === 0) {
    body.innerHTML = '';
    empty.style.display = 'flex';
    return;
  }

  empty.style.display = 'none';
  body.innerHTML = filtered.map(t => {
    const dueClass = dueCls(t.due);
    return `
      <tr>
        <td>
          <div class="task-name-cell">${escHtml(t.title)}</div>
          ${t.desc ? `<div class="task-desc-cell">${escHtml(t.desc)}</div>` : ''}
        </td>
        <td>
          <span class="status-badge status-${t.status}">
            <span class="status-dot" style="background:var(--${t.status})"></span>
            ${statusLabel(t.status)}
          </span>
        </td>
        <td><span class="priority-badge priority-${t.priority}">${priorityIcon(t.priority)}${t.priority}</span></td>
        <td class="due-cell ${dueClass}">${t.due ? formatDate(t.due) : '—'}</td>
        <td>
          <div class="table-actions">
            <button class="tbl-btn" title="Edit" onclick="openModal(tasks.find(x=>x.id==='${t.id}'))">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="tbl-btn delete" title="Delete" onclick="deleteTask('${t.id}')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
              </svg>
            </button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

function bindTracker() {
  const searchInput = document.getElementById('search-input');
  const filterStatus = document.getElementById('filter-status');
  const filterPriority = document.getElementById('filter-priority');

  function applyFilter() {
    renderTracker({
      query: searchInput.value,
      status: filterStatus.value,
      priority: filterPriority.value,
    });
  }

  searchInput.addEventListener('input', applyFilter);
  filterStatus.addEventListener('change', applyFilter);
  filterPriority.addEventListener('change', applyFilter);
}

function updateSidebar() {
  ['todo', 'inprocess', 'done'].forEach(s => {
    document.getElementById('count-' + s).textContent = tasks.filter(t => t.status === s).length;
  });
}

// ── Modal ──────────────────────────────────────────────────────────
function openModal(task = null) {
  const overlay = document.getElementById('modal-overlay');
  const title = document.getElementById('modal-title');
  const submit = document.getElementById('modal-submit');
  const form = document.getElementById('task-form');

  form.reset();
  if (task) {
    title.textContent = 'Edit Task';
    submit.textContent = 'Save Changes';
    document.getElementById('task-id').value    = task.id;
    document.getElementById('task-title').value = task.title;
    document.getElementById('task-desc').value  = task.desc || '';
    setGroupValue('status-group',   task.status);
    setGroupValue('priority-group', task.priority);
    setDateParts(task.due);
  } else {
    title.textContent = 'New Task';
    submit.textContent = 'Create Task';
    document.getElementById('task-id').value = '';
    setGroupValue('status-group',   'todo');
    setGroupValue('priority-group', 'medium');
    setDateParts('');
  }

  overlay.classList.add('open');
  document.getElementById('task-title').focus();
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
}

function bindModal() {
  document.getElementById('add-task-btn').addEventListener('click', () => openModal());
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-cancel').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });

  document.querySelectorAll('.add-card-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      openModal();
      setGroupValue('status-group', btn.dataset.status);
    });
  });

  document.getElementById('task-form').addEventListener('submit', e => {
    e.preventDefault();
    const id = document.getElementById('task-id').value;
    const data = {
      title:    document.getElementById('task-title').value.trim(),
      desc:     document.getElementById('task-desc').value.trim(),
      status:   document.getElementById('task-status').value,
      priority: document.getElementById('task-priority').value,
      due:      getDateFromParts(),
    };
    if (!data.title) return;

    if (id) {
      const t = tasks.find(t => t.id === id);
      if (t) Object.assign(t, data);
    } else {
      tasks.push({ id: genId(), ...data });
    }

    saveTasks();
    render();
    closeModal();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });
}

// ── Nav ────────────────────────────────────────────────────────────
function bindNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const view = btn.dataset.view;
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      document.getElementById('view-' + view).classList.add('active');
      document.getElementById('view-title').textContent = view === 'kanban' ? 'Kanban Board' : 'Task Tracker';
      document.getElementById('view-subtitle').textContent = view === 'kanban'
        ? 'Drag cards between columns to update status'
        : 'Filter, search and manage all tasks';
      if (view === 'tracker') renderTracker();
    });
  });
}

// ── Task actions ───────────────────────────────────────────────────
function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  render();
}

// ── Helpers ────────────────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function dueCls(iso) {
  if (!iso) return '';
  const today = new Date(); today.setHours(0,0,0,0);
  const due = new Date(iso);
  if (due < today) return 'overdue';
  const diff = (due - today) / (1000 * 60 * 60 * 24);
  if (diff <= 2) return 'soon';
  return '';
}

function statusLabel(s) {
  return { todo: 'To Do', inprocess: 'In Process', done: 'Done' }[s] || s;
}

function priorityIcon(p) {
  const icons = {
    high:   '<svg viewBox="0 0 10 10"><polygon points="5,1 9,9 1,9" fill="currentColor"/></svg>',
    medium: '<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="currentColor"/></svg>',
    low:    '<svg viewBox="0 0 10 10"><polygon points="5,9 9,1 1,1" fill="currentColor"/></svg>',
  };
  return icons[p] || '';
}

function escHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
