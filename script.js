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

// ==============================
// WHEN THE PAGE LOADS
// ==============================

// When the entire HTML page is fully loaded (DOM ready), the following code executes:
document.addEventListener("DOMContentLoaded", () => {
  // Adds a click listener to the "Start Session" button,
  // which triggers the `startSession` function when clicked.
  document
    .getElementById("startSessionButton")
    .addEventListener("click", startSession);

  // Adds a click listener to the "Add Task" button,
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

// ==============================
// QUOTES AND MOTIVATION
// ==============================

// It loads and parses motivational quotes from a CSV file
function loadQuotes() {
  // Use PapaParse to read and parse the CSV file located at 'assets/data/quotes.csv'
  Papa.parse("assets/data/quotes.csv", {
    download: true, // Tells PapaParse to download the file from the given path
    header: true, // Indicates that the CSV file contains a header row
    skipEmptyLines: true, // Skips any empty lines in the CSV

    // When the file has been successfully parsed, this callback function is executed
    complete: function (results) {
      // Loops through every row in the parsed CSV data
      results.data.forEach((row) => {
        // If both 'quote' and 'author' fields are present in the row
        if (row.quote && row.author) {
          // Adds the quote to the global 'quotes' array, cleaning up special characters
          quotes.push({
            quote: row.quote
              .replace(/‚Äô/g, "'") // Replaces encoding error for apostrophes
              .replace(/‚Ä¶/g, "…") // Replaces encoding error for ellipses
              .trim(), // Trims any whitespace
            author: row.author.trim(), // Trims any whitespace from author name
          });
        }
      });
    },
  });
}

// It displays a random motivational quote in a Bootstrap modal
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
    // Opens the modal so the user sees the quote
    quoteModal.show();
  }
}

// ==============================
// SESSION AND TASK MANAGEMENT
// ==============================

// It initializes the study session based on the user input and shows the main interface
function startSession() {
  // Fetches the input elements for student name and planned study hours
  const nameInput = document.getElementById("studentName");
  const hoursInput = document.getElementById("plannedHours");
  // If either the name or the planned hours fields are empty (after trimming whitespace),
  // it shows an alert and stops the function early
  if (nameInput.value.trim() === "" || hoursInput.value.trim() === "") {
    alert("Please fill in your name and planned hours!");
    return; // Exits the function
  }
  // Uses parseInt() to convert the input string to a number
  const plannedHours = parseInt(hoursInput.value.trim());
  // If the input is not a valid number or less than or equal to zero,
  // it shows an error and exits
  if (plannedHours <= 0 || isNaN(plannedHours)) {
    alert("Please enter a valid number of hours.");
    return; // Exits the function
  }
  // Calculates how many minutes are left in the current day
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const minutesLeftToday = 1440 - currentMinutes; // 1440 = 24 * 60

  // If user input exceeds the time remaining in the day, it shows an error
  if (plannedHours * 60 > minutesLeftToday) {
    alert(
      "Despite your effort, you cannot study this much today — not enough time left."
    );
    return;
  }

  // Saves the user name and total planned study minutes
  studentName = nameInput.value.trim();
  totalPlannedMinutes = plannedHours * 60;

  // Hides the start modal and shows the main study interface
  document.getElementById("startModal").style.display = "none";
  document.getElementById("mainContent").style.display = "block";

  // Displays a personalized welcome message
  document.getElementById(
    "welcomeMessage"
  ).textContent = `Welcome ${studentName}!`;

  // Updates the display for remaining planned time
  updateRemainingTime();
}

// It adds a new task to the active task list based on user input
function addTask() {
  // Gets references to the task name, duration, and description input fields
  const taskNameInput = document.getElementById("taskName");
  const taskMinutesInput = document.getElementById("taskMinutes");
  const taskDescriptionInput = document.getElementById("taskDescription");

  // Extracts and sanitizes user input
  const name = taskNameInput.value.trim(); // Removes whitespace from task name
  const minutes = parseInt(taskMinutesInput.value); // Converts input string to number
  const description = taskDescriptionInput?.value?.trim() || ""; // Gets optional description or use empty string

  // Validates that task name and minutes are provided and reasonable
  if (!name || !minutes || minutes <= 0) {
    alert("Please enter a task name and valid minutes.");
    return; // Exits if validation fails
  }

  // Checks if the planned minutes exceed the remaining planned time
  if (minutes > getAvailableMinutes()) {
    alert("Not enough remaining planned time for this task.");
    return; // Exits if over budget
  }

  // Adds the new task to the global 'tasks' array
  tasks.push({
    name, // Task name
    minutes, // Planned duration
    description, // Optional description
    remainingSeconds: minutes * 60, // Initial time left in seconds
    running: false, // Not running yet
    startTime: null, // No start timestamp yet
    startTimeFormatted: "", // Will store ISO string of start
    completedTimeFormatted: "", // Will store ISO string of completion
    usedMinutes: 0, // Minutes actually spent
  });

  // Updates total used minutes to reflect new task
  usedMinutes += minutes;

  // Clears the input fields for the next task entry
  taskNameInput.value = "";
  taskMinutesInput.value = "";
  if (taskDescriptionInput) taskDescriptionInput.value = "";

  // Re-renders the task list and remaining time display
  renderTasks();
  updateRemainingTime();
}

// Allows users to edit a task’s name, duration, and description — if the task is not currently running
function editTask(index) {
  const task = tasks[index];

  // Prevent editing while the task is running
  if (task.running) {
    alert("Please stop the task before editing.");
    return;
  }

  // Prompt the user for updated values
  const newName = prompt("Edit task name:", task.name);
  const newMinutesInput = prompt("Edit planned minutes:", task.minutes);
  const newDescription = prompt("Edit description:", task.description || "");

  const newMinutes = parseInt(newMinutesInput);

  // Validate inputs: name must be non-empty and minutes must be a positive number
  if (!newName || isNaN(newMinutes) || newMinutes <= 0) {
    alert("Invalid input. Task was not updated.");
    return;
  }

  const timeDiff = newMinutes - task.minutes;

  // Check if the new duration would exceed the available remaining plan
  if (timeDiff > getAvailableMinutes()) {
    alert("Not enough remaining planned time for this change.");
    return;
  }

  // Update task
  usedMinutes += timeDiff;
  task.name = newName.trim();
  task.minutes = newMinutes;
  task.description = newDescription.trim();
  task.remainingSeconds = newMinutes * 60;

  // Refresh UI and remaining time tracker
  renderTasks();
  updateRemainingTime();
}

// It renders all active tasks in the user interface
function renderTasks() {
  // Gets the HTML element that will hold the list of tasks to be completed
  const list = document.getElementById("taskList");

  // Clears all current tasks in the list before re-rendering
  list.innerHTML = "";

  // Loops through each task stored in the global 'tasks' array
  tasks.forEach((task, index) => {
    // Creates the <li> list item for the task
    const li = document.createElement("li");
    li.className = "list-group-item task-item flex-column align-items-start";

    // Creates a top row <div> to hold the task name, timer, and buttons
    const topRow = document.createElement("div");
    topRow.className =
      "d-flex w-100 justify-content-between align-items-center";

    // Creates a <span> to display the task name and its planned duration in minutes
    const name = document.createElement("span");
    name.textContent = `${task.name} - ${task.minutes} min`;

    // Creates a <span> to show the countdown timer for the task
    const timerDisplay = document.createElement("span");
    timerDisplay.id = `timer-${index}`; // Gives it a unique ID to update it later
    timerDisplay.className = "ms-3"; // Bootstrap margin start
    timerDisplay.textContent = formatTime(task.remainingSeconds); // Converts seconds to mm:ss format

    // Creates a <div> to hold the control buttons for the task
    const buttons = document.createElement("div");
    buttons.className = "d-flex"; // Use flex layout for horizontal alignment

    // Creates control buttons using the helper function `createIconButton()`
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

    // Appends the four control buttons to the button container
    buttons.append(startButton, stopButton, editButton, doneButton);

    // Adds the task name, timer, and buttons to the top row
    topRow.append(name, timerDisplay, buttons);

    // Adds the top row to the list item
    li.appendChild(topRow);

    // If the task has a description, adds it as a muted subtext below
    if (task.description) {
      const desc = document.createElement("div");
      desc.className = "text-muted mt-1 small"; // Light gray text with margin
      desc.textContent = task.description;
      li.appendChild(desc); // Adds the description below the top row
    }

    // Finally, adds the fully assembled list item to the task list on the page
    list.appendChild(li);
  });
}

// It renders all completed tasks in the user interface
function renderDoneTasks() {
  // Gets the HTML element that holds the list of completed tasks
  const doneList = document.getElementById("doneList");

  // Clears the current contents before rendering
  doneList.innerHTML = "";

  // Loops over each task in the global 'doneTasks' array
  doneTasks.forEach((task) => {
    // Creates a new list item element for the completed task
    const li = document.createElement("li");
    li.className = "list-group-item"; // Bootstrap class for styled list items

    // Creates the main text element showing task name and minutes
    const main = document.createElement("div");
    main.textContent = `${task.name} - ${task.minutes} min (Done)`;
    li.appendChild(main); // Adds it to the list item

    // If a description exists, adds it as muted subtext below the main title
    if (task.description) {
      const desc = document.createElement("div");
      desc.className = "text-muted mt-1 small"; // Muted color, top margin, and small font
      desc.textContent = task.description;
      li.appendChild(desc); // Adds it below the main task name
    }

    // Appends the fully constructed list item to the done task list
    doneList.appendChild(li);
  });
}

// ==============================
// TASK CONTROLS AND TIMING
// ==============================

// It creates a Bootstrap-styled button element with an icon and action
function createIconButton(iconClass, color, action) {
  // Creates a new <button> element
  const button = document.createElement("button");

  // Assigns Bootstrap classes to style the button:
  // - btn-sm for small size
  // - rounded-pill for pill shape
  // - ms-2 for spacing to the left (margin start)
  // - btn-${color} for contextual coloring (e.g., success, danger)
  button.className = `btn btn-${color} btn-sm rounded-pill ms-2`;

  // Inserts the icon using a <i> tag with the specified Font Awesome class
  button.innerHTML = `<i class="${iconClass}"></i>`;

  // Attaches the provided action (callback function) to run when the button is clicked
  button.onclick = action;

  // Returns the fully configured button element
  return button;
}

// It starts the countdown timer for a specific task
function startTimer(index) {
  // If a timer is already running, prevent starting another task
  if (currentTimerId !== null) {
    alert("A task is already running.");
    return; // Exits early to avoid running multiple timers at once
  }

  // Retrieves the task object from the 'tasks' array based on its index
  const task = tasks[index];

  // Gets the DOM element where the countdown will be displayed
  const timerElement = document.getElementById(`timer-${index}`);

  // Marks the task as running and store the current timestamp
  task.running = true;
  task.startTime = Date.now(); // For calculating actual used time later
  task.startTimeFormatted = new Date().toISOString(); // Saves readable timestamp
  currentRunningIndex = index; // Tracks which task is currently running

  // Starts a countdown interval that updates every second (1000 ms)
  currentTimerId = setInterval(() => {
    if (task.remainingSeconds > 0) {
      task.remainingSeconds--; // Decreases remaining time by 1 second
      timerElement.textContent = formatTime(task.remainingSeconds); // Updates UI
    } else {
      // If the countdown reaches zero, stop the timer
      clearInterval(currentTimerId); // Clears the interval
      currentTimerId = null;
      timerElement.classList.add("text-danger"); // Makes timer text red to indicate time is up
      task.running = false; // Marks task as no longer running
    }
  }, 1000); // 1000 ms = 1 second
}

// It stops the currently running timer, if it matches the given task index
function stopTimer(index) {
  // Checks if the task the user is trying to stop is the one currently running
  if (currentRunningIndex !== index) {
    alert("This task is not running.");
    return; // Exits if trying to stop a task that isn't active
  }

  // Stops the interval that is updating the countdown timer
  clearInterval(currentTimerId); // Clears the running timer
  currentTimerId = null; // Resets the global timer ID

  // Marks the task as no longer running
  tasks[index].running = false;
}

// It marks a task as completed, calculates the time used, and updates the UI
function markAsDone(index) {
  const task = tasks[index]; // Gets the task to be marked as completed

  if (task.running) {
    // If the task is currently running, stop the timer
    clearInterval(currentTimerId); // Stops the countdown
    currentTimerId = null; // Resets global timer ID

    // Calculates the actual time spent on the task (in minutes)
    const actualUsedMinutes = Math.round(
      (Date.now() - task.startTime) / 1000 / 60 // Converts milliseconds to minutes
    );
    task.usedMinutes = actualUsedMinutes; // Saves time used
    task.completedTimeFormatted = new Date().toISOString(); // Records completion time
  } else if (task.startTimeFormatted) {
    // If the task was started but is currently not running (stopped manually)
    const now = new Date(); // Current time
    const started = new Date(task.startTimeFormatted); // Converts start time string to Date
    const diffMs = now - started; // Calculates duration in milliseconds
    task.usedMinutes = Math.round(diffMs / 1000 / 60); // Converts to minutes
    task.completedTimeFormatted = now.toISOString(); // Saves current time as completion
  } else {
    // If the task was never started
    task.usedMinutes = 0; // No time spent
    task.completedTimeFormatted = new Date().toISOString(); // Still records completion time
  }

  task.running = false; // Marks task as no longer running

  doneTasks.push(task); // Moves it to the 'done' list
  tasks.splice(index, 1); // Removes it from the active task list

  renderTasks(); // Refreshes the task list UI
  renderDoneTasks(); // Refreshs the done tasks UI
  updateRemainingTime(); // Recalculates and displays remaining planned time
  showRandomQuote(); // Displays a motivational quote for encouragement
}

// ==============================
// GENERAL UTILITY FUNCTIONS
// ==============================

// Returns the number of minutes that are still available for planning tasks
function getAvailableMinutes() {
  return totalPlannedMinutes - usedMinutes; // Total time - already assigned time
}

// Converts seconds into a MM:SS string format for display
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60); // Whole minutes
  const secs = seconds % 60; // Remaining seconds
  return `${mins}:${secs.toString().padStart(2, "0")}`; // Ensure 2-digit seconds (e.g. 05)
}

// Updates the text showing how many planned minutes are still free
function updateRemainingTime() {
  const remainingDisplay = document.getElementById("remainingTime"); // Reference to UI element
  const availableMinutes = getAvailableMinutes(); // Call helper function
  const hours = Math.floor(availableMinutes / 60); // Converts minutes to hours
  const minutes = availableMinutes % 60; // Remaining minutes after hours
  remainingDisplay.textContent = `Remaining Plan: ${hours}h ${minutes}min`; // Updates UI
}

// Continuously updates the live clock in the top right corner
function updateClock() {
  const clock = document.getElementById("clock"); // Reference to UI element
  const now = new Date(); // Get current time

  // Extracts hours, minutes, and seconds and pad with zeros if needed
  const h = now.getHours().toString().padStart(2, "0");
  const m = now.getMinutes().toString().padStart(2, "0");
  const s = now.getSeconds().toString().padStart(2, "0");

  // Displays in format HH:MM:SS
  clock.textContent = `${h}:${m}:${s}`;
}

// It compiles session data into an Excel file and triggers a download
function downloadSession() {
  // Creates an array of objects representing the session:
  // - First row contains the user's name
  // - Then each "done" task is added with its metadata
  // - Then each remaining "to-do" task is added (without completion time)
  const data = [
    { Name: studentName }, // First row for user identification
    ...doneTasks.map((task) => ({
      Status: "Completed tasks", // Mark as completed
      Task: task.name, // Task title
      Minutes: task.minutes, // Planned minutes
      CompletedTime: task.completedTimeFormatted || "", // ISO string of when it was completed
      Description: task.description || "", // Optional task notes
    })),
    ...tasks.map((task) => ({
      Status: "Pending tasks", // Task still pending
      Task: task.name,
      Minutes: task.minutes,
      CompletedTime: "", // Not yet completed
      Description: task.description || "",
    })),
  ];

  // Converts the data into a worksheet format that Excel understands
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Creates a new Excel workbook and add the worksheet to it
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "StudySession");

  // Triggers the download of the file as "StudySession.xlsx"
  XLSX.writeFile(workbook, "StudySession.xlsx");
}
