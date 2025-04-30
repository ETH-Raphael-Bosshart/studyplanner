let tasks = [];
let doneTasks = [];
let quotes = [];
let totalPlannedMinutes = 0;
let usedMinutes = 0;
let currentTimerId = null;
let currentRunningIndex = null;
let studentName = "";

document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("startSessionButton")
    .addEventListener("click", startSession);
  document
    .getElementById("uploadSession")
    .addEventListener("change", loadSessionFile);
  document.getElementById("addTaskButton").addEventListener("click", addTask);
  document
    .getElementById("downloadSessionButton")
    .addEventListener("click", downloadSession);
  document
    .getElementById("changePlanButton")
    .addEventListener("click", changePlan);
  document.getElementById("studentName").focus();
  loadQuotes();
  updateClock();
  setInterval(updateClock, 1000);
});

function loadQuotes() {
  Papa.parse("assets/data/quotes.csv", {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: function (results) {
      results.data.forEach((row) => {
        if (row.quote && row.author) {
          quotes.push({
            quote: row.quote.replace(/‚Äô/g, "'").replace(/‚Ä¶/g, "…").trim(),
            author: row.author.trim(),
          });
        }
      });
    },
  });
}

function showRandomQuote() {
  if (quotes.length > 0) {
    const random = quotes[Math.floor(Math.random() * quotes.length)];
    const modalBody = document.getElementById("quoteText");
    modalBody.innerHTML = `
      <p class="mb-2">"${random.quote}"</p>
      <p class="text-end text-muted fst-italic">— ${random.author}</p>
    `;
    const quoteModal = new bootstrap.Modal(
      document.getElementById("quoteModal")
    );
    quoteModal.show();
  }
}

function startSession() {
  const nameInput = document.getElementById("studentName");
  const hoursInput = document.getElementById("plannedHours");

  if (nameInput.value.trim() === "" || hoursInput.value.trim() === "") {
    alert("Please fill in your name and planned hours!");
    return;
  }

  const plannedHours = parseInt(hoursInput.value.trim());

  if (plannedHours <= 0 || isNaN(plannedHours)) {
    alert("Please enter a valid number of hours.");
    return;
  }

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const minutesLeftToday = 1440 - currentMinutes;

  if (plannedHours * 60 > minutesLeftToday) {
    alert(
      "Despite your effort, you cannot study this much today — not enough time left."
    );
    return;
  }

  studentName = nameInput.value.trim();
  totalPlannedMinutes = plannedHours * 60;

  document.getElementById("startModal").style.display = "none";
  document.getElementById("mainContent").style.display = "block";
  document.getElementById(
    "welcomeMessage"
  ).textContent = `Welcome, ${studentName}!`;
  updateRemainingTime();
}

function addTask() {
  const taskNameInput = document.getElementById("taskName");
  const taskMinutesInput = document.getElementById("taskMinutes");

  const name = taskNameInput.value.trim();
  const minutes = parseInt(taskMinutesInput.value);

  if (!name || !minutes || minutes <= 0) {
    alert("Please enter a task name and valid minutes.");
    return;
  }

  if (minutes > getAvailableMinutes()) {
    alert("Not enough remaining planned time for this task.");
    return;
  }

  tasks.push({
    name,
    minutes,
    remainingSeconds: minutes * 60,
    running: false,
    startTime: null,
  });
  usedMinutes += minutes;

  taskNameInput.value = "";
  taskMinutesInput.value = "";
  renderTasks();
  updateRemainingTime();
}

function renderTasks() {
  const list = document.getElementById("taskList");
  list.innerHTML = "";

  tasks.forEach((task, index) => {
    const li = document.createElement("li");
    li.className = "list-group-item task-item";

    const info = document.createElement("span");
    info.textContent = `${task.name} - ${task.minutes} min`;

    const timerDisplay = document.createElement("span");
    timerDisplay.id = `timer-${index}`;
    timerDisplay.className = "ms-3";
    timerDisplay.textContent = formatTime(task.remainingSeconds);

    const startButton = createIconButton("fas fa-play", "success", () =>
      startTimer(index)
    );
    const stopButton = createIconButton("fas fa-stop", "secondary", () =>
      stopTimer(index)
    );
    const editButton = createIconButton("fas fa-pen", "warning", () =>
      editTask(index)
    );
    const doneButton = createIconButton("fas fa-check", "primary", () =>
      markAsDone(index)
    );

    li.appendChild(info);
    li.appendChild(timerDisplay);
    li.appendChild(startButton);
    li.appendChild(stopButton);
    li.appendChild(editButton);
    li.appendChild(doneButton);

    list.appendChild(li);
  });
}

function createIconButton(iconClass, color, action) {
  const button = document.createElement("button");
  button.className = `btn btn-${color} btn-sm rounded-pill ms-2`;
  button.innerHTML = `<i class="${iconClass}"></i>`;
  button.onclick = action;
  return button;
}

function startTimer(index) {
  if (currentTimerId !== null) {
    alert("A task is already running.");
    return;
  }

  const task = tasks[index];
  const timerElement = document.getElementById(`timer-${index}`);
  task.running = true;
  task.startTime = Date.now();
  currentRunningIndex = index;

  currentTimerId = setInterval(() => {
    if (task.remainingSeconds > 0) {
      task.remainingSeconds--;
      timerElement.textContent = formatTime(task.remainingSeconds);
    } else {
      clearInterval(currentTimerId);
      currentTimerId = null;
      timerElement.classList.add("text-danger");
      task.running = false;
    }
  }, 1000);
}

function stopTimer(index) {
  if (currentRunningIndex !== index) {
    alert("This task is not running.");
    return;
  }
  clearInterval(currentTimerId);
  currentTimerId = null;
  tasks[index].running = false;
}

function editTask(index) {
  if (tasks[index].running) {
    alert("You can't edit a running task. Please stop it first.");
    return;
  }

  const newName = prompt("Edit task name:", tasks[index].name);
  const newMinutes = prompt("Edit planned minutes:", tasks[index].minutes);

  if (newName && newMinutes && !isNaN(newMinutes) && parseInt(newMinutes) > 0) {
    usedMinutes -= tasks[index].minutes;

    const oldMinutes = tasks[index].minutes;
    const minutesDiff = parseInt(newMinutes) - oldMinutes;

    if (minutesDiff > getAvailableMinutes()) {
      alert("Not enough remaining planned time to increase task.");
      usedMinutes += oldMinutes;
      return;
    }

    tasks[index].name = newName.trim();
    tasks[index].minutes = parseInt(newMinutes);
    tasks[index].remainingSeconds = tasks[index].minutes * 60;
    usedMinutes += tasks[index].minutes;

    renderTasks();
    updateRemainingTime();
  }
}

function markAsDone(index) {
  const task = tasks[index];

  if (task.running) {
    clearInterval(currentTimerId);
    currentTimerId = null;

    const actualUsedMinutes = Math.round(
      (Date.now() - task.startTime) / 1000 / 60
    );
    const plannedMinutes = task.minutes;
    const minutesSaved = Math.max(0, plannedMinutes - actualUsedMinutes);

    usedMinutes -= minutesSaved;
  }

  doneTasks.push(task);
  tasks.splice(index, 1);
  renderTasks();
  renderDoneTasks();
  updateRemainingTime();
  showRandomQuote();
}

function renderDoneTasks() {
  const doneList = document.getElementById("doneList");
  doneList.innerHTML = "";

  doneTasks.forEach((task) => {
    const li = document.createElement("li");
    li.className = "list-group-item";
    li.textContent = `${task.name} - ${task.minutes} min (Done)`;
    doneList.appendChild(li);
  });
}

function getAvailableMinutes() {
  return totalPlannedMinutes - usedMinutes;
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function updateRemainingTime() {
  const remainingDisplay = document.getElementById("remainingTime");
  const availableMinutes = getAvailableMinutes();
  const hours = Math.floor(availableMinutes / 60);
  const minutes = availableMinutes % 60;
  remainingDisplay.textContent = `Remaining Plan: ${hours}h ${minutes}min`;
}

function updateClock() {
  const clock = document.getElementById("clock");
  const now = new Date();
  const h = now.getHours().toString().padStart(2, "0");
  const m = now.getMinutes().toString().padStart(2, "0");
  const s = now.getSeconds().toString().padStart(2, "0");
  clock.textContent = `${h}:${m}:${s}`;
}

function downloadSession() {
  const data = [
    { Name: studentName },
    ...doneTasks.map((task) => ({
      Status: "Done",
      Task: task.name,
      Minutes: task.minutes,
    })),
    ...tasks.map((task) => ({
      Status: "Todo",
      Task: task.name,
      Minutes: task.minutes,
    })),
  ];

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "StudySession");

  XLSX.writeFile(workbook, "StudySession.xlsx");
}

function loadSessionFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const sessionData = XLSX.utils.sheet_to_json(sheet);

    if (
      sessionData.length === 0 ||
      (!sessionData[0].Name && !sessionData[0].Status)
    ) {
      alert(
        "Uploaded file has wrong format! It must contain Name, Status, Task, Minutes."
      );
      return;
    }

    if (sessionData[0].Name) {
      studentName = sessionData[0].Name;
      document.getElementById("studentName").value = studentName;
    }

    sessionData.forEach((item) => {
      if (item.Status === "Done") {
        doneTasks.push({ name: item.Task, minutes: item.Minutes });
      } else if (item.Status === "Todo") {
        tasks.push({
          name: item.Task,
          minutes: item.Minutes,
          remainingSeconds: item.Minutes * 60,
          running: false,
          startTime: null,
        });
        usedMinutes += item.Minutes;
      }
    });

    document.getElementById("startModal").style.display = "none";
    document.getElementById("mainContent").style.display = "block";
    document.getElementById(
      "welcomeMessage"
    ).textContent = `Welcome back, ${studentName}!`;
    renderTasks();
    renderDoneTasks();
    updateRemainingTime();
  };

  reader.readAsArrayBuffer(file);
}

function changePlan() {
  const newHours = prompt("Enter new planned study hours:");
  if (newHours && !isNaN(newHours) && parseInt(newHours) > 0) {
    totalPlannedMinutes = parseInt(newHours) * 60;
    updateRemainingTime();
  }
}
