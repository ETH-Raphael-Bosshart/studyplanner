// ==============================
// INITIALIZATION OF GLOBAL VARIABLES
// ==============================

let tasks = []; // List of all pending tasks
let doneTasks = []; // List of all completed tasks
let quotes = []; // List of motivational quotes
let totalPlannedMinutes = 0; // Total study minutes planned by the user
let usedMinutes = 0; // Sum of all planned minutes for current tasks
let currentTimerId = null; // ID of the currently running timer (for setInterval)
let currentRunningIndex = null; // Index of the currently running task
let studentName = ""; // Name of the user
let studyChart = null; // Reference to the bar chart object (Chart.js)

// ==============================
// WHEN THE PAGE LOADS
// ==============================

// When the entire HTML page is fully loaded (DOM ready), the following code executes:
document.addEventListener("DOMContentLoaded", () => {
  // Add a click listener to the "Start Session" button,
  // which triggers the `startSession` function when clicked.
  document
    .getElementById("startSessionButton")
    .addEventListener("click", startSession);

  // When the user selects a file to upload (Excel),
  // the `loadSessionFile` function is executed.
  document
    .getElementById("uploadSession")
    .addEventListener("change", loadSessionFile);

  // Add a click listener to the "Add Task" button,
  // to create a new task using `addTask()`.
  document.getElementById("addTaskButton").addEventListener("click", addTask);

  // Clicking "Download Session" will export the current session via `downloadSession()`.
  document
    .getElementById("downloadSessionButton")
    .addEventListener("click", downloadSession);

  // Automatically sets focus to the name input field when the page loads.
  document.getElementById("studentName").focus();

  // Loads motivational quotes from a CSV file (for later use after completing tasks).
  loadQuotes();

  // Initializes the clock (displays current time in the top right).
  updateClock();

  // Continuously updates the clock every second (1000 ms) using `updateClock()`.
  setInterval(updateClock, 1000);
});

function loadQuotes() {
  // Use PapaParse to read and parse the CSV file located at 'assets/data/quotes.csv'
  Papa.parse("assets/data/quotes.csv", {
    download: true, // Tells PapaParse to download the file from the given path
    header: true, // Indicates that the CSV file contains a header row
    skipEmptyLines: true, // Skips any empty lines in the CSV

    // When the file has been successfully parsed, this callback function is executed
    complete: function (results) {
      // Loop through every row in the parsed CSV data
      results.data.forEach((row) => {
        // If both 'quote' and 'author' fields are present in the row
        if (row.quote && row.author) {
          // Add the quote to the global 'quotes' array, cleaning up special characters
          quotes.push({
            quote: row.quote
              .replace(/‚Äô/g, "'") // Replace encoding error for apostrophes
              .replace(/‚Ä¶/g, "…") // Replace encoding error for ellipses
              .trim(), // Trim any whitespace
            author: row.author.trim(), // Trim any whitespace from author name
          });
        }
      });
    },
  });
}

function showRandomQuote() {
  // We want to avoid trying to access a random quote if the array is empty.
  if (quotes.length > 0) {
    // Math.random() generates a number between 0 and 1.
    // Multiplying by quotes.length gives a number between 0 and the last index.
    // Math.floor() rounds it down to get a valid array index.
    const random = quotes[Math.floor(Math.random() * quotes.length)];
    // This is a <div> inside the modal that has the id="quoteText".
    const modalBody = document.getElementById("quoteText");
    // We use innerHTML to insert styled HTML that includes:
    // - the quote itself in a <p> with some margin below
    // - the author name right-aligned and in italic
    modalBody.innerHTML = `
      <p class="mb-2">"${random.quote}"</p> <!-- Display the quote -->
      <p class="text-end text-muted fst-italic">— ${random.author}</p> <!-- Show author -->
    `;
    // This is necessary to programmatically show the modal.
    // Bootstrap 5 provides this via bootstrap.Modal
    const quoteModal = new bootstrap.Modal(
      document.getElementById("quoteModal") // Reference to the modal element
    );
    // Open the modal so the user sees the quote
    quoteModal.show();
  }
}

function startSession() {
  // Fetch the input elements for student name and planned study hours
  const nameInput = document.getElementById("studentName");
  const hoursInput = document.getElementById("plannedHours");
  // If either the name or the planned hours fields are empty (after trimming whitespace),
  // show an alert and stop the function early
  if (nameInput.value.trim() === "" || hoursInput.value.trim() === "") {
    alert("Please fill in your name and planned hours!");
    return; // Exit the function
  }
  // Use parseInt() to convert the input string to a number
  const plannedHours = parseInt(hoursInput.value.trim());
  // If the input is not a valid number or less than or equal to zero,
  // show an error and exit
  if (plannedHours <= 0 || isNaN(plannedHours)) {
    alert("Please enter a valid number of hours.");
    return; // Exit the function
  }
  // Calculate how many minutes are left in the current day
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const minutesLeftToday = 1440 - currentMinutes; // 1440 = 24 * 60

  // If user input exceeds the time remaining in the day, show an error
  if (plannedHours * 60 > minutesLeftToday) {
    alert(
      "Despite your effort, you cannot study this much today — not enough time left."
    );
    return;
  }

  // Save the user name and total planned study minutes
  studentName = nameInput.value.trim();
  totalPlannedMinutes = plannedHours * 60;

  // Hide the start modal and show the main study interface
  document.getElementById("startModal").style.display = "none";
  document.getElementById("mainContent").style.display = "block";

  // Display a personalized welcome message
  document.getElementById(
    "welcomeMessage"
  ).textContent = `Welcome, ${studentName}!`;

  // Update the display for remaining planned time
  updateRemainingTime();
}

function addTask() {
  const taskNameInput = document.getElementById("taskName");
  const taskMinutesInput = document.getElementById("taskMinutes");
  const taskDescriptionInput = document.getElementById("taskDescription");

  const name = taskNameInput.value.trim();
  const minutes = parseInt(taskMinutesInput.value);
  const description = taskDescriptionInput?.value?.trim() || "";

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
    description,
    remainingSeconds: minutes * 60,
    running: false,
    startTime: null,
    startTimeFormatted: "",
    completedTimeFormatted: "",
    usedMinutes: 0,
  });

  usedMinutes += minutes;

  taskNameInput.value = "";
  taskMinutesInput.value = "";
  if (taskDescriptionInput) taskDescriptionInput.value = "";
  renderTasks();
  updateRemainingTime();
}

function renderTasks() {
  const list = document.getElementById("taskList");
  list.innerHTML = "";

  tasks.forEach((task, index) => {
    const li = document.createElement("li");
    li.className = "list-group-item task-item flex-column align-items-start";

    const topRow = document.createElement("div");
    topRow.className =
      "d-flex w-100 justify-content-between align-items-center";

    const name = document.createElement("span");
    name.textContent = `${task.name} - ${task.minutes} min`;

    const timerDisplay = document.createElement("span");
    timerDisplay.id = `timer-${index}`;
    timerDisplay.className = "ms-3";
    timerDisplay.textContent = formatTime(task.remainingSeconds);

    const buttons = document.createElement("div");
    buttons.className = "d-flex";

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

    buttons.append(startButton, stopButton, editButton, doneButton);
    topRow.append(name, timerDisplay, buttons);

    li.appendChild(topRow);

    if (task.description) {
      const desc = document.createElement("div");
      desc.className = "text-muted mt-1 small";
      desc.textContent = task.description;
      li.appendChild(desc);
    }

    list.appendChild(li);
  });
}

function renderDoneTasks() {
  const doneList = document.getElementById("doneList");
  doneList.innerHTML = "";

  doneTasks.forEach((task) => {
    const li = document.createElement("li");
    li.className = "list-group-item";

    const main = document.createElement("div");
    main.textContent = `${task.name} - ${task.minutes} min (Done)`;
    li.appendChild(main);

    if (task.description) {
      const desc = document.createElement("div");
      desc.className = "text-muted mt-1 small";
      desc.textContent = task.description;
      li.appendChild(desc);
    }

    doneList.appendChild(li);
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
  task.startTimeFormatted = new Date().toISOString();
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

// Fix: ensure usedMinutes is always populated for marked-as-done tasks

function markAsDone(index) {
  const task = tasks[index];

  if (task.running) {
    clearInterval(currentTimerId);
    currentTimerId = null;

    const actualUsedMinutes = Math.round(
      (Date.now() - task.startTime) / 1000 / 60
    );
    task.usedMinutes = actualUsedMinutes;
    task.completedTimeFormatted = new Date().toISOString();
  } else if (task.startTimeFormatted) {
    // If the task was started and stopped manually
    const now = new Date();
    const started = new Date(task.startTimeFormatted);
    const diffMs = now - started;
    task.usedMinutes = Math.round(diffMs / 1000 / 60);
    task.completedTimeFormatted = now.toISOString();
  } else {
    // Not started at all → usedMinutes stays 0
    task.usedMinutes = 0;
    task.completedTimeFormatted = new Date().toISOString();
  }

  task.running = false;
  doneTasks.push(task);
  tasks.splice(index, 1);

  renderTasks();
  renderDoneTasks();
  updateRemainingTime();
  showRandomQuote();
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
      UsedMinutes: task.usedMinutes || "",
      StartTime: task.startTimeFormatted || "",
      CompletedTime: task.completedTimeFormatted || "",
      Description: task.description || "",
    })),
    ...tasks.map((task) => ({
      Status: "Todo",
      Task: task.name,
      Minutes: task.minutes,
      UsedMinutes: "",
      StartTime: "",
      CompletedTime: "",
      Description: task.description || "",
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
      const task = {
        name: item.Task,
        minutes: item.Minutes,
        description: item.Description || "",
        usedMinutes: item.UsedMinutes || 0,
        startTimeFormatted: item.StartTime || "",
        completedTimeFormatted: item.CompletedTime || "",
        remainingSeconds: item.Minutes * 60,
        running: false,
        startTime: null,
      };

      if (item.Status === "Done") {
        doneTasks.push(task);
      } else if (item.Status === "Todo") {
        tasks.push(task);
        usedMinutes += task.minutes;
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
