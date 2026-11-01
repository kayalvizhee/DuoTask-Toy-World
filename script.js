
const $ = id => document.getElementById(id);
const today = () => new Date().toISOString().slice(0, 10);

const defaultData = {
  tasks: [],
  coins: 0,
  xp: 0,
  goal: 3,
  owned: [],
  sound: true,
  theme: "boy",
  dark: false
};

let data;
try {
  data = { ...defaultData, ...JSON.parse(localStorage.getItem("duotask-data") || "{}") };
  if (!Array.isArray(data.tasks) || !Array.isArray(data.owned)) throw new Error("Invalid data");
} catch {
  data = { ...defaultData };
}

let editingId = null;
let currentView = "tasks";
let calendarDate = new Date();
let selectedDate = today();
let toastTimer;

const toys = {
  boy: {
    name: "Robot World", avatar: "🤖", hero: "🤖",
    floating: ["🚀", "🧩"],
    title: "Ready for a super day?",
    text: "Complete your missions, earn XP and unlock exciting rewards!"
  },
  girl: {
    name: "Magical World", avatar: "🦄", hero: "🧸",
    floating: ["🦋", "🌈"],
    title: "Make today magical!",
    text: "Complete your missions, collect stars and unlock cute rewards!"
  }
};

const rewards = [
  { id: "rocket", name: "Rocket Ship", emoji: "🚀", price: 30, desc: "Your own space adventure." },
  { id: "teddy", name: "Teddy Bear", emoji: "🧸", price: 40, desc: "A cuddly virtual friend." },
  { id: "unicorn", name: "Magic Unicorn", emoji: "🦄", price: 60, desc: "A little bit of magic." },
  { id: "car", name: "Racing Car", emoji: "🏎️", price: 50, desc: "Ready, set, go!" },
  { id: "castle", name: "Dream Castle", emoji: "🏰", price: 80, desc: "Your magical kingdom." },
  { id: "dino", name: "Baby Dinosaur", emoji: "🦖", price: 70, desc: "A tiny prehistoric buddy." }
];

const achievements = [
  { id: "first", emoji: "🌟", title: "First Mission", desc: "Complete your first task.", check: t => t.length >= 1 },
  { id: "five", emoji: "🏅", title: "Super Starter", desc: "Complete 5 tasks.", check: t => t.length >= 5 },
  { id: "ten", emoji: "🏆", title: "Task Champion", desc: "Complete 10 tasks.", check: t => t.length >= 10 },
  { id: "twenty", emoji: "👑", title: "Task Superstar", desc: "Complete 20 tasks.", check: t => t.length >= 20 },
  { id: "coins", emoji: "🪙", title: "Coin Collector", desc: "Earn 100 coins in total.", check: () => data.xp >= 100 },
  { id: "streak", emoji: "🔥", title: "On Fire", desc: "Reach a 3-day streak.", check: () => getStreak() >= 3 }
];

function persist() {
  localStorage.setItem("duotask-data", JSON.stringify(data));
}

function notify(message) {
  $("toast").textContent = message;
  $("toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("toast").classList.remove("show"), 2600);
}

function playSound() {
  if (!data.sound) return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.frequency.value = 660;
    gain.gain.setValueAtTime(0.08, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.18);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.18);
    oscillator.onended = () => context.close();
  } catch {}
}

function setTheme(theme) {
  data.theme = theme;
  document.body.classList.toggle("girl", theme === "girl");

  document.querySelectorAll("[data-theme]").forEach(button => {
    button.classList.toggle("selected", button.dataset.theme === theme);
  });

  const world = toys[theme];
  $("worldAvatar").textContent = world.avatar;
  $("worldName").textContent = world.name;
  $("heroToy").textContent = world.hero;
  $("heroTitle").textContent = world.title;
  $("heroText").textContent = world.text;
  $("floatingToy1").textContent = world.floating[0];
  $("floatingToy2").textContent = world.floating[1];

  persist();
}

function setDark(enabled) {
  data.dark = enabled;
  document.body.classList.toggle("dark", enabled);
  $("darkToggle").textContent = enabled ? "☀️ Light Mode" : "🌙 Dark Mode";
  persist();
}

function getStreak() {
  const dates = [...new Set(
    data.tasks.filter(t => t.completed && t.completedAt).map(t => t.completedAt)
  )].sort().reverse();

  if (!dates.length) return 0;

  const date = new Date(today() + "T00:00:00");
  const yesterday = new Date(date);
  yesterday.setDate(yesterday.getDate() - 1);

  if (dates[0] !== today() && dates[0] !== yesterday.toISOString().slice(0, 10)) return 0;

  let streak = 0;
  const cursor = new Date(dates[0] + "T00:00:00");

  for (const item of dates) {
    if (item !== cursor.toISOString().slice(0, 10)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function updateDashboard() {
  const completed = data.tasks.filter(t => t.completed).length;
  const pending = data.tasks.length - completed;
  const level = Math.floor(data.xp / 100) + 1;
  const xpIntoLevel = data.xp % 100;
  const percent = data.tasks.length ? Math.round(completed / data.tasks.length * 100) : 0;

  $("totalCount").textContent = data.tasks.length;
  $("pendingCount").textContent = pending;
  $("completedCount").textContent = completed;
  $("streakCount").textContent = getStreak();
  $("coinCount").textContent = data.coins;
  $("shopCoins").textContent = data.coins;
  $("levelText").textContent = "Level " + level;
  $("xpText").textContent = `${xpIntoLevel} / 100 XP`;
  $("xpBar").style.width = xpIntoLevel + "%";
  $("dateLabel").textContent = new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  }).toUpperCase();

  const doneToday = data.tasks.filter(t => t.completed && t.completedAt === today()).length;
  $("goalInput").value = data.goal;
  $("goalText").textContent = `${doneToday} / ${data.goal} completed`;
  $("goalBar").style.width = Math.min(100, doneToday / data.goal * 100) + "%";
  $("goalMessage").textContent = doneToday >= data.goal
    ? "Goal achieved! You're amazing! 🎉"
    : "Keep going. You're doing great! 🌟";
}

function createTaskCard(task) {
  const card = document.createElement("article");
  card.className = "task-card" + (task.completed ? " done" : "");

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "task-check";
  checkbox.checked = task.completed;
  checkbox.setAttribute("aria-label", "Complete mission");
  checkbox.addEventListener("change", () => toggleTask(task.id));

  const info = document.createElement("div");
  info.className = "task-info";

  const title = document.createElement("h3");
  title.textContent = task.title;

  const description = document.createElement("p");
  description.textContent = task.description || "A new adventure awaits!";

  const meta = document.createElement("div");
  meta.className = "task-meta";

  const priority = document.createElement("span");
  priority.className = "priority " + task.priority;
  priority.textContent = task.priority + " priority";

  const due = document.createElement("span");
  due.className = "task-date";
  due.textContent = "📅 " + new Date(task.date + "T00:00:00").toLocaleDateString("en-IN");

  if (!task.completed && task.date < today()) {
    due.textContent += " · Overdue!";
  }

  meta.append(priority, due);
  info.append(title, description, meta);

  const actions = document.createElement("div");
  actions.className = "task-actions";

  const edit = document.createElement("button");
  edit.className = "action-btn";
  edit.textContent = "✏️";
  edit.title = "Edit mission";
  edit.addEventListener("click", () => openEdit(task.id));

  const remove = document.createElement("button");
  remove.className = "action-btn";
  remove.textContent = "🗑️";
  remove.title = "Delete mission";
  remove.addEventListener("click", () => deleteTask(task.id));

  actions.append(edit, remove);
  card.append(checkbox, info, actions);
  return card;
}

function renderTasks() {
  const search = $("searchInput").value.toLowerCase().trim();
  const status = $("statusFilter").value;
  const priority = $("priorityFilter").value;

  const visible = data.tasks.filter(task => {
    const matchesSearch = (task.title + " " + task.description).toLowerCase().includes(search);
    const matchesPriority = priority === "all" || task.priority === priority;

    let matchesStatus = true;
    if (status === "pending") matchesStatus = !task.completed;
    if (status === "completed") matchesStatus = task.completed;
    if (status === "today") matchesStatus = task.date === today();

    return matchesSearch && matchesPriority && matchesStatus;
  }).sort((a, b) => {
    if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);
    return a.date.localeCompare(b.date);
  });

  $("taskList").replaceChildren(...visible.map(createTaskCard));
  $("emptyState").classList.toggle("show", visible.length === 0);
  updateDashboard();
}

function openModal() {
  editingId = null;
  $("taskForm").reset();
  $("modalTitle").textContent = "✨ New Mission";
  $("saveTask").textContent = "Save Mission";
  $("taskDate").value = today();
  $("taskModal").classList.add("show");
  $("taskTitle").focus();
}

function closeModal() {
  $("taskModal").classList.remove("show");
}

function openEdit(id) {
  const task = data.tasks.find(t => t.id === id);
  if (!task) return;

  editingId = id;
  $("modalTitle").textContent = "✏️ Edit Mission";
  $("saveTask").textContent = "Update Mission";
  $("taskTitle").value = task.title;
  $("taskDescription").value = task.description;
  $("taskDate").value = task.date;
  $("taskPriority").value = task.priority;
  $("taskModal").classList.add("show");
}

$("taskForm").addEventListener("submit", event => {
  event.preventDefault();

  const title = $("taskTitle").value.trim();
  const date = $("taskDate").value;
  if (!title || !date) return;

  const details = {
    title,
    description: $("taskDescription").value.trim(),
    date,
    priority: $("taskPriority").value
  };

  if (editingId) {
    const task = data.tasks.find(t => t.id === editingId);
    if (task) Object.assign(task, details);
    notify("Mission updated! ✨");
  } else {
    data.tasks.push({
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      ...details,
      completed: false,
      completedAt: null
    });
    notify("New mission added! 🚀");
  }

  persist();
  closeModal();
  renderAll();
});

function toggleTask(id) {
  const task = data.tasks.find(t => t.id === id);
  if (!task) return;

  task.completed = !task.completed;
  task.completedAt = task.completed ? today() : null;

  if (task.completed) {
    data.coins += 10;
    data.xp += 20;
    notify("Mission completed! +10 coins and +20 XP 🎉");
    playSound();
  } else {
    data.coins = Math.max(0, data.coins - 10);
    data.xp = Math.max(0, data.xp - 20);
    notify("Mission reopened.");
  }

  persist();
  renderAll();
}

function deleteTask(id) {
  if (!confirm("Delete this mission permanently?")) return;
  data.tasks = data.tasks.filter(t => t.id !== id);
  persist();
  renderAll();
  notify("Mission deleted.");
}

function renderCalendar() {
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();

  $("monthLabel").textContent = calendarDate.toLocaleDateString("en-IN", {
    month: "long", year: "numeric"
  });

  const grid = $("calendarGrid");
  grid.replaceChildren();

  ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach(day => {
    const cell = document.createElement("div");
    cell.className = "calendar-cell heading";
    cell.textContent = day;
    grid.appendChild(cell);
  });

  for (let i = 0; i < firstDay; i++) {
    const blank = document.createElement("div");
    grid.appendChild(blank);
  }

  for (let day = 1; day <= days; day++) {
    const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const cell = document.createElement("button");
    cell.className = "calendar-cell day";
    cell.textContent = day;

    if (date === today()) cell.classList.add("today");
    if (date === selectedDate) cell.classList.add("selected");
    if (data.tasks.some(t => t.date === date)) cell.classList.add("has-task");

    cell.addEventListener("click", () => {
      selectedDate = date;
      renderCalendar();
      const dayTasks = data.tasks.filter(t => t.date === date);
      const details = $("calendarDetails");
      details.replaceChildren();

      const heading = document.createElement("strong");
      heading.textContent = new Date(date + "T00:00:00").toLocaleDateString("en-IN", {
        day: "numeric", month: "long", year: "numeric"
      });
      details.appendChild(heading);

      if (!dayTasks.length) {
        const p = document.createElement("p");
        p.textContent = "No missions scheduled for this day.";
        details.appendChild(p);
      } else {
        dayTasks.forEach(t => {
          const p = document.createElement("p");
          p.textContent = `${t.completed ? "✅" : "📝"} ${t.title} · ${t.priority}`;
          details.appendChild(p);
        });
      }
    });

    grid.appendChild(cell);
  }

  const existing = data.tasks.filter(t => t.date === selectedDate);
  $("calendarDetails").textContent = existing.length
    ? existing.map(t => `${t.completed ? "✅" : "📝"} ${t.title}`).join(" · ")
    : "Select a date to see your missions.";
}

function renderRewards() {
  $("rewardGrid").replaceChildren();

  rewards.forEach(reward => {
    const owned = data.owned.includes(reward.id);
    const card = document.createElement("article");
    card.className = "reward-card";

    const emoji = document.createElement("div");
    emoji.className = "toy";
    emoji.textContent = reward.emoji;

    const name = document.createElement("h3");
    name.textContent = reward.name;

    const desc = document.createElement("p");
    desc.textContent = reward.desc;

    const button = document.createElement("button");
    button.className = "primary-btn";
    button.textContent = owned ? "✓ Owned" : `🪙 ${reward.price} coins`;
    button.disabled = owned;
    if (owned) button.style.opacity = ".6";

    button.addEventListener("click", () => {
      if (data.coins < reward.price) {
        notify("Not enough coins yet. Complete more missions! 🪙");
        return;
      }
      data.coins -= reward.price;
      data.owned.push(reward.id);
      persist();
      renderAll();
      notify(`You unlocked ${reward.name}! 🎉`);
      playSound();
    });

    card.append(emoji, name, desc, button);
    $("rewardGrid").appendChild(card);
  });
}

function renderAchievements() {
  const completed = data.tasks.filter(t => t.completed).length;
  $("badgeGrid").replaceChildren();

  achievements.forEach(badge => {
    const unlocked = badge.check(data.tasks.filter(t => t.completed));
    const card = document.createElement("article");
    card.className = "badge-card" + (unlocked ? "" : " locked");

    const emoji = document.createElement("div");
    emoji.className = "toy";
    emoji.textContent = unlocked ? badge.emoji : "🔒";

    const name = document.createElement("h3");
    name.textContent = badge.title;

    const desc = document.createElement("p");
    desc.textContent = badge.desc;

    const status = document.createElement("strong");
    status.textContent = unlocked ? "UNLOCKED ✓" : "LOCKED";
    status.style.fontSize = "10px";
    status.style.color = "var(--primary)";

    card.append(emoji, name, desc, status);
    $("badgeGrid").appendChild(card);
  });
}

function renderAnalytics() {
  const total = data.tasks.length;
  const completed = data.tasks.filter(t => t.completed).length;
  const percent = total ? Math.round(completed / total * 100) : 0;

  $("analyticsPercent").textContent = percent + "%";
  $("analyticsBar").style.width = percent + "%";
  $("analyticsSummary").textContent = `${completed} completed out of ${total} missions.`;

  const counts = ["High", "Medium", "Low"].map(priority => ({
    priority,
    count: data.tasks.filter(t => t.priority === priority).length
  }));

  $("priorityChart").replaceChildren();

  counts.forEach(item => {
    const row = document.createElement("div");
    row.className = "chart-row";

    const label = document.createElement("span");
    label.textContent = item.priority;

    const track = document.createElement("div");
    track.className = "chart-track";

    const fill = document.createElement("div");
    fill.className = "chart-fill";
    fill.style.width = (total ? item.count / total * 100 : 0) + "%";
    track.appendChild(fill);

    const count = document.createElement("strong");
    count.textContent = item.count;

    row.append(label, track, count);
    $("priorityChart").appendChild(row);
  });
}

function showView(view) {
  currentView = view;

  document.querySelectorAll(".view").forEach(section => {
    section.classList.toggle("active", section.id === view + "View");
  });

  document.querySelectorAll(".nav").forEach(button => {
    button.classList.toggle("active", button.dataset.view === view);
  });

  const titles = {
    tasks: "Let's get things done! 🚀",
    calendar: "Plan your adventures! 📅",
    goals: "Dream big, achieve more! 🎯",
    rewards: "Your reward collection! 🎁",
    achievements: "Look how far you've come! 🏆",
    analytics: "Your progress report! 📊"
  };

  $("pageTitle").textContent = titles[view];

  if (view === "calendar") renderCalendar();
  if (view === "rewards") renderRewards();
  if (view === "achievements") renderAchievements();
  if (view === "analytics") renderAnalytics();
  if (view === "goals") updateDashboard();
}

function renderAll() {
  renderTasks();
  updateDashboard();

  if (currentView === "calendar") renderCalendar();
  if (currentView === "rewards") renderRewards();
  if (currentView === "achievements") renderAchievements();
  if (currentView === "analytics") renderAnalytics();
}

document.querySelectorAll(".nav").forEach(button => {
  button.addEventListener("click", () => showView(button.dataset.view));
});

document.querySelectorAll("[data-theme]").forEach(button => {
  button.addEventListener("click", () => {
    setTheme(button.dataset.theme);
    notify("Welcome to " + toys[data.theme].name + "! 🎉");
  });
});

$("darkToggle").addEventListener("click", () => setDark(!data.dark));
$("soundToggle").addEventListener("click", () => {
  data.sound = !data.sound;
  $("soundToggle").textContent = data.sound ? "🔊" : "🔇";
  persist();
  notify(data.sound ? "Sound enabled." : "Sound muted.");
});

$("addTaskBtn").addEventListener("click", openModal);
$("emptyAdd").addEventListener("click", openModal);
$("closeModal").addEventListener("click", closeModal);

$("taskModal").addEventListener("click", event => {
  if (event.target === $("taskModal")) closeModal();
});

$("searchInput").addEventListener("input", renderTasks);
$("statusFilter").addEventListener("change", renderTasks);
$("priorityFilter").addEventListener("change", renderTasks);

$("prevMonth").addEventListener("click", () => {
  calendarDate.setMonth(calendarDate.getMonth() - 1);
  renderCalendar();
});

$("nextMonth").addEventListener("click", () => {
  calendarDate.setMonth(calendarDate.getMonth() + 1);
  renderCalendar();
});

$("saveGoal").addEventListener("click", () => {
  const goal = Number($("goalInput").value);
  if (!Number.isInteger(goal) || goal < 1 || goal > 50) {
    notify("Choose a goal between 1 and 50.");
    return;
  }
  data.goal = goal;
  persist();
  updateDashboard();
  notify("Daily goal saved! 🎯");
});

$("goalInput").addEventListener("change", () => {
  $("goalInput").value = Math.max(1, Math.min(50, Number($("goalInput").value) || 1));
});

// Restore saved preferences and start the app.
setTheme(data.theme);
setDark(data.dark);
$("soundToggle").textContent = data.sound ? "🔊" : "🔇";

renderAll();

// Remind about today's unfinished tasks while the app is open.
const dueToday = data.tasks.filter(t => !t.completed && t.date === today());
if (dueToday.length) {
  setTimeout(() => notify(`You have ${dueToday.length} mission(s) due today! ⏰`), 900);
}
