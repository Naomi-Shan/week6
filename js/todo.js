/* ============================================
   To-do list app — Projects page
   Calendar date picker + task list with done/delete
   Tasks persist to Supabase (todos table), with localStorage fallback
   ============================================ */

document.addEventListener('DOMContentLoaded', function () {
  var form = document.getElementById('todoForm');
  if (!form) return; // only run on the projects page

  var calGrid = document.getElementById('calGrid');
  var calTitle = document.getElementById('calTitle');
  var prevBtn = document.getElementById('prevMonth');
  var nextBtn = document.getElementById('nextMonth');
  var taskInput = document.getElementById('taskInput');
  var todoList = document.getElementById('todoList');
  var todoEmpty = document.getElementById('todoEmpty');
  var selectedDateEl = document.getElementById('selectedDate');
  var taskPrioritySelect = document.getElementById('taskPriority');

  var STORAGE_KEY = 'sq-todo-tasks';
  var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  var viewDate = new Date();      // first of the currently-viewed month
  viewDate.setDate(1);
  var selectedDate = toISO(new Date()); // ISO yyyy-mm-dd, defaults to today

  var tasks = [];

  /* ---------- Supabase ---------- */
  var SUPABASE_URL = 'https://npsgqdewaplxngcmwtbr.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_1PDCWQPGR78_YsWZIIklCA_U1zzfwgt';
  var supabase = null;
  var supabaseReady = false;

  function initSupabase() {
    if (typeof window.supabase === 'undefined') {
      console.warn('Supabase CDN not loaded — falling back to localStorage.');
      return;
    }
    try {
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      supabaseReady = true;
    } catch (e) {
      console.warn('Supabase init failed:', e.message);
    }
  }

  /* ---------- Storage helpers (localStorage fallback) ---------- */
  function loadTasksLocal() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }
  function saveTasksLocal() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); } catch (e) {}
  }

  /* ---------- Date helpers ---------- */
  function toISO(d) {
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }
  function parseISO(iso) {
    var p = iso.split('-').map(Number);
    return new Date(p[0], p[1] - 1, p[2]);
  }
  function formatLong(iso) {
    if (!iso) return 'No date selected';
    var d = parseISO(iso);
    return DAY_NAMES[d.getDay()] + ', ' + MONTHS[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  }
  function isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear() &&
           a.getMonth() === b.getMonth() &&
           a.getDate() === b.getDate();
  }
  function tasksOnDate(iso) {
    return tasks.filter(function (t) { return t.date === iso; });
  }
  function makeId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  /* ---------- Calendar rendering ---------- */
  function renderCalendar() {
    calTitle.textContent = MONTHS[viewDate.getMonth()] + ' ' + viewDate.getFullYear();
    calGrid.innerHTML = '';

    var year = viewDate.getFullYear();
    var month = viewDate.getMonth();
    var startDay = new Date(year, month, 1).getDay();        // 0=Sun
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var today = new Date();

    for (var i = 0; i < startDay; i++) {
      var blank = document.createElement('span');
      blank.className = 'cal-day empty';
      calGrid.appendChild(blank);
    }

    for (var d = 1; d <= daysInMonth; d++) {
      var cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'cal-day';
      cell.textContent = d;
      var cellDate = new Date(year, month, d);
      var iso = toISO(cellDate);
      if (isSameDay(cellDate, today)) cell.classList.add('today');
      if (selectedDate === iso) cell.classList.add('selected');
      if (tasksOnDate(iso).length > 0) cell.classList.add('has-task');
      cell.addEventListener('click', (function (isoVal) {
        return function () { selectDate(isoVal); };
      })(iso));
      calGrid.appendChild(cell);
    }
  }

  function selectDate(iso) {
    selectedDate = iso;
    var d = parseISO(iso);
    viewDate = new Date(d.getFullYear(), d.getMonth(), 1);
    renderCalendar();
    renderSelected();
    renderList();
    taskInput.focus();
  }

  function renderSelected() {
    selectedDateEl.textContent = formatLong(selectedDate);
  }

  /* ---------- Task list rendering ---------- */
  function renderList() {
    todoList.innerHTML = '';
    var items = selectedDate ? tasksOnDate(selectedDate) : [];
    todoEmpty.style.display = items.length ? 'none' : 'block';

    items.forEach(function (t) {
      var li = document.createElement('li');
      var isOverdue = t.date < toISO(new Date());
      li.className = 'todo-item' + (t.done ? ' done' : '') + (isOverdue ? ' overdue' : '');

      var check = document.createElement('button');
      check.type = 'button';
      check.className = 'todo-check';
      check.setAttribute('aria-label', t.done ? 'Mark as not done' : 'Mark as done');
      check.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
      check.addEventListener('click', function () { toggleTask(t.id); });

      var content = document.createElement('div');
      content.className = 'todo-content';
      var text = document.createElement('div');
      text.className = 'todo-text';
      text.textContent = t.title;
      content.appendChild(text);

      var priority = document.createElement('span');
      var pLevel = (t.priority === 'Low' || t.priority === 'Medium' || t.priority === 'High') ? t.priority : 'Medium';
      priority.className = 'todo-priority p-' + pLevel.toLowerCase();
      priority.textContent = pLevel;
      content.appendChild(priority);

      var del = document.createElement('button');
      del.type = 'button';
      del.className = 'todo-delete';
      del.setAttribute('aria-label', 'Delete task');
      del.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
      del.addEventListener('click', function () { deleteTask(t.id); });

      li.appendChild(check);
      li.appendChild(content);
      li.appendChild(del);
      todoList.appendChild(li);
    });
    renderCounter();
  }

  /* ---------- Counter ---------- */
  function renderCounter() {
    var items = selectedDate ? tasksOnDate(selectedDate) : [];
    var total = items.length;
    var done = items.filter(function (t) { return t.done; }).length;
    var counterEl = document.getElementById('todoCounter');
    var barEl = document.getElementById('todoProgressBar');
    if (counterEl) counterEl.textContent = done + ' of ' + total + ' tasks completed';
    if (barEl) barEl.style.width = (total === 0 ? 0 : Math.round(done / total * 100)) + '%';
  }

  /* ---------- Task operations (Supabase + localStorage fallback) ----------
     Table schema (Supabase):
       id          int (auto-generated, primary key)
       task        text  (the task title)
       is_complete bool  (done flag)
       date        date  (due date as yyyy-mm-dd string)
       created_at  timestamptz (auto-set)
       priority    text  (OPTIONAL — run ALTER TABLE to add it, see note below)
     -------------------------------------------------------------- */
  async function addTask(title, priority) {
    var task = {
      id: null,
      title: title.trim(),
      date: selectedDate,
      priority: priority || 'Medium',
      done: false,
      created: Date.now()
    };
    tasks.push(task);
    saveTasksLocal();
    renderCalendar();
    renderList();

    if (supabaseReady) {
      try {
        var payload = { task: task.title, date: task.date, is_complete: false, priority: task.priority };
        var res = await supabase.from('todos').insert(payload).select('id');
        if (res.error && res.error.message && res.error.message.indexOf('priority') !== -1) {
          // priority column doesn't exist yet — retry without it
          res = await supabase.from('todos').insert({ task: task.title, date: task.date, is_complete: false }).select('id');
        }
        if (!res.error && res.data && res.data.length) {
          task.id = res.data[0].id;
          saveTasksLocal();
        } else if (res.error) {
          console.warn('Supabase insert failed:', res.error.message);
        }
      } catch (e) {
        console.warn('Supabase insert failed:', e.message);
      }
    }
  }

  async function toggleTask(id) {
    tasks.forEach(function (t) { if (t.id === id) t.done = !t.done; });
    var target = tasks.find(function (t) { return t.id === id; });
    saveTasksLocal();
    renderList();

    if (supabaseReady && target && target.id != null) {
      try {
        await supabase.from('todos').update({ is_complete: target.done }).eq('id', target.id);
      } catch (e) {
        console.warn('Supabase update failed:', e.message);
      }
    }
  }

  async function deleteTask(id) {
    var target = tasks.find(function (t) { return t.id === id; });
    tasks = tasks.filter(function (t) { return t.id !== id; });
    saveTasksLocal();
    renderCalendar();
    renderList();

    if (supabaseReady && target && target.id != null) {
      try {
        await supabase.from('todos').delete().eq('id', target.id);
      } catch (e) {
        console.warn('Supabase delete failed:', e.message);
      }
    }
  }

  /* ---------- Load tasks from Supabase on page load ---------- */
  async function loadTasks() {
    if (supabaseReady) {
      try {
        var res = await supabase.from('todos').select('*').order('created_at', { ascending: true });
        if (res.error) {
          console.warn('Supabase select failed:', res.error.message);
          tasks = loadTasksLocal();
        } else {
          tasks = (res.data || []).map(function (row) {
            return {
              id: row.id,
              title: row.task,
              date: row.date,
              done: row.is_complete,
              priority: row.priority || 'Medium',
              created: row.created_at ? new Date(row.created_at).getTime() : Date.now()
            };
          });
          saveTasksLocal();
        }
      } catch (e) {
        console.warn('Supabase load failed:', e.message);
        tasks = loadTasksLocal();
      }
    } else {
      tasks = loadTasksLocal();
    }
  }

  /* ---------- Events ---------- */
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    var val = taskInput.value.trim();
    if (!val) return;
    var priority = taskPrioritySelect ? taskPrioritySelect.value : 'Medium';
    await addTask(val, priority);
    taskInput.value = '';
    if (taskPrioritySelect) taskPrioritySelect.value = 'Medium';
    taskInput.focus();
  });

  prevBtn.addEventListener('click', function () {
    viewDate.setMonth(viewDate.getMonth() - 1);
    renderCalendar();
  });
  nextBtn.addEventListener('click', function () {
    viewDate.setMonth(viewDate.getMonth() + 1);
    renderCalendar();
  });

  /* ---------- Init ---------- */
  initSupabase();
  loadTasks().then(function () {
    renderCalendar();
    renderSelected();
    renderList();
  });
});
