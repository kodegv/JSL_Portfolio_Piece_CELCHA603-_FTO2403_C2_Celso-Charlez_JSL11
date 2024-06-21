// Importing utility functions
import {
  getTasks as fetchTasks,
  createNewTask as addTaskToDb,
  patchTask as modifyTask,
  putTask as updateTask,
  deleteTask as removeTask,
} from "/utils/taskFunctions.js";

// Importing initial data
import { initialData as defaultData } from "/initialData.js";

// Function to initialize local storage with default data if not present
function initializeStorage() {
  if (!localStorage.getItem("tasks")) {
    localStorage.setItem("tasks", JSON.stringify(defaultData));
    localStorage.setItem("sidebarVisible", "true");
  } else {
    console.log("Local storage already contains data");
  }
}

// Getting DOM elements
const domElements = {
  boardNameHeader: document.getElementById("header-board-name"),
  newTaskButton: document.getElementById("add-new-task-btn"),
  overlayDiv: document.getElementById("filterDiv"),
  taskColumns: document.querySelectorAll(".column-div"),
  taskModal: document.getElementById("new-task-modal-window"),
  editModal: document.querySelector(".edit-task-modal-window"),
  hideSidebarButton: document.getElementById("hide-side-bar-btn"),
  showSidebarButton: document.getElementById("show-side-bar-btn"),
  themeToggleSwitch: document.getElementById("switch"),
};

// Current active board
let currentBoard = "";

// Function to fetch and display boards and tasks
function loadBoardsAndTasks() {
  const tasks = fetchTasks();
  const boards = [...new Set(tasks.map((task) => task.board).filter(Boolean))];
  renderBoards(boards);
  if (boards.length > 0) {
    const savedBoard = JSON.parse(localStorage.getItem("activeBoard"));
    currentBoard = savedBoard ? savedBoard : boards[0];
    domElements.boardNameHeader.textContent = currentBoard;
    highlightActiveBoard(currentBoard);
    updateTasksUI();
  }
}

// Function to render boards in the DOM
function renderBoards(boards) {
  const boardContainer = document.getElementById("boards-nav-links-div");
  boardContainer.innerHTML = "";
  boards.forEach((board) => {
    const boardButton = document.createElement("button");
    boardButton.textContent = board;
    boardButton.classList.add("board-btn");
    boardButton.addEventListener("click", () => {
      domElements.boardNameHeader.textContent = board;
      showTasksByBoard(board);
      currentBoard = board;
      localStorage.setItem("activeBoard", JSON.stringify(currentBoard));
      highlightActiveBoard(currentBoard);
    });
    boardContainer.appendChild(boardButton);
  });
}

// Function to filter and display tasks by board
function showTasksByBoard(boardName) {
  const tasks = fetchTasks();
  const filteredTasks = tasks.filter((task) => task.board === boardName);

  domElements.taskColumns.forEach((column) => {
    const status = column.getAttribute("data-status");
    column.innerHTML = `<div class="column-head-div">
                          <span class="dot" id="${status}-dot"></span>
                          <h4 class="columnHeader">${status.toUpperCase()}</h4>
                        </div>`;

    const taskContainer = document.createElement("div");
    column.appendChild(taskContainer);

    filteredTasks
      .filter((task) => task.status === status)
      .forEach((task) => {
        const taskElement = document.createElement("div");
        taskElement.classList.add("task-div");
        taskElement.textContent = task.title;
        taskElement.setAttribute("data-task-id", task.id);

        taskElement.addEventListener("click", () => {
          openTaskEditModal(task);
        });

        taskContainer.appendChild(taskElement);
      });
  });
}

// Function to refresh the UI with current tasks
function updateTasksUI() {
  showTasksByBoard(currentBoard);
}

// Function to highlight the active board
function highlightActiveBoard(boardName) {
  document.querySelectorAll(".board-btn").forEach((button) => {
    button.classList.toggle("active", button.textContent === boardName);
  });
}

// Function to add a task to the UI
function insertTaskToUI(task) {
  const column = document.querySelector(
    `.column-div[data-status="${task.status}"]`
  );

  if (!column) {
    console.error(`Column not found for status: ${task.status}`);
    return;
  }

  let taskContainer = column.querySelector(".tasks-container");
  if (!taskContainer) {
    console.warn(`Tasks container not found for status: ${task.status}, creating one.`);
    taskContainer = document.createElement("div");
    taskContainer.className = "tasks-container";
    column.appendChild(taskContainer);
  }

  const taskElement = document.createElement("div");
  taskElement.className = "task-div";
  taskElement.textContent = task.title;
  taskElement.setAttribute("data-task-id", task.id);

  taskContainer.appendChild(taskElement);
}

// Function to set up event listeners
function initializeEventListeners() {
  const cancelEditButton = document.getElementById("cancel-edit-btn");
  cancelEditButton.addEventListener("click", () => toggleModalVisibility(false, domElements.editModal));

  const cancelAddTaskButton = document.getElementById("cancel-add-task-btn");
  cancelAddTaskButton.addEventListener("click", () => {
    toggleModalVisibility(false);
    domElements.overlayDiv.style.display = "none";
  });

  domElements.overlayDiv.addEventListener("click", () => {
    toggleModalVisibility(false);
    domElements.overlayDiv.style.display = "none";
  });

  domElements.hideSidebarButton.addEventListener("click", () => toggleSidebarVisibility(false));
  domElements.showSidebarButton.addEventListener("click", () => toggleSidebarVisibility(true));

  domElements.themeToggleSwitch.addEventListener("change", switchTheme);

  domElements.newTaskButton.addEventListener("click", () => {
    toggleModalVisibility(true);
    domElements.overlayDiv.style.display = "block";
  });

  domElements.taskModal.addEventListener("submit", (event) => {
    handleNewTaskSubmission(event);
  });
}

// Function to toggle modal visibility
function toggleModalVisibility(show, modal = domElements.taskModal) {
  modal.style.display = show ? "block" : "none";
}

// Function to handle new task submission
function handleNewTaskSubmission(event) {
  event.preventDefault();

  const task = {
    title: document.getElementById("title-input").value,
    description: document.getElementById("desc-input").value,
    status: document.getElementById("select-status").value,
    board: currentBoard,
  };

  const newTask = addTaskToDb(task);
  if (newTask) {
    insertTaskToUI(newTask);
    toggleModalVisibility(false);
    domElements.overlayDiv.style.display = "none";
    event.target.reset();
    updateTasksUI();
  }
}

// Function to toggle sidebar visibility
function toggleSidebarVisibility(show) {
  document.getElementById("side-bar-div").style.display = show ? "flex" : "none";
  document.getElementById("show-side-bar-btn").style.display = !show ? "flex" : "none";

  localStorage.setItem("sidebarVisible", show);
}

// Function to switch between light and dark themes
function switchTheme() {
  document.body.classList.toggle("light-theme");

  const logo = document.getElementById("logo");
  const isDarkTheme = logo.src.endsWith("logo-dark.svg");

  logo.src = isDarkTheme ? "./assets/logo-light.svg" : "./assets/logo-dark.svg";
  logo.alt = isDarkTheme ? "logo-light" : "logo-dark";

  localStorage.setItem("light-theme", isDarkTheme ? "enabled" : "disabled");
}

// Function to open the edit task modal and populate fields
function openTaskEditModal(task) {
  document.getElementById("edit-task-title-input").value = task.title;
  document.getElementById("edit-task-desc-input").value = task.description;
  document.getElementById("edit-select-status").value = task.status;

  const saveChangesButton = document.getElementById("save-task-changes-btn");
  const deleteButton = document.getElementById("delete-task-btn");

  saveChangesButton.addEventListener("click", () => saveTaskChanges(task.id));
  deleteButton.addEventListener("click", () => {
    removeTask(task.id);
    toggleModalVisibility(false, domElements.editModal);
    updateTasksUI();
  });

  toggleModalVisibility(true, domElements.editModal);
}

// Function to save task changes
function saveTaskChanges(taskId) {
  const updatedTitle = document.getElementById("edit-task-title-input").value;
  const updatedDescription = document.getElementById("edit-task-desc-input").value;
  const updatedStatus = document.getElementById("edit-select-status").value;

  const updatedTask = {
    id: taskId,
    title: updatedTitle,
    description: updatedDescription,
    status: updatedStatus,
    board: currentBoard,
  };

  updateTask(taskId, updatedTask);
  toggleModalVisibility(false, domElements.editModal);
  updateTasksUI();
}

// Initialization function
document.addEventListener("DOMContentLoaded", () => {
  initialize();
});

function initialize() {
  initializeStorage();
  initializeEventListeners();
  const sidebarVisible = localStorage.getItem("sidebarVisible") === "true";
  toggleSidebarVisibility(sidebarVisible);
  const lightThemeEnabled = localStorage.getItem("light-theme") === "enabled";
  document.body.classList.toggle("light-theme", lightThemeEnabled);
  domElements.themeToggleSwitch.checked = lightThemeEnabled;
  domElements.logo.src = lightThemeEnabled ? "./assets/logo-light.svg" : "./assets/logo-dark.svg";
  loadBoardsAndTasks();
}

// I'm aware that my commits don't align with timestamps, but using a SFPT extension for other lua projects and caused 
// multiple issues with this project :)