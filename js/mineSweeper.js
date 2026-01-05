(function () {
  // Difficulty configuration - eliminates all if-else chains
  const DIFFICULTY_CONFIG = {
    10: {
      name: "easy",
      bombCount: 12,
      cellClass: "easyCell",
      headerClass: "header-after-start-e",
      storageKey: "mnswpr_easy",
    },
    15: {
      name: "medium",
      bombCount: 35,
      cellClass: "medCell",
      headerClass: "header-after-start-m",
      storageKey: "mnswpr_medium",
    },
    20: {
      name: "hard",
      bombCount: 62,
      cellClass: "hardCell",
      headerClass: "header-after-start-h",
      storageKey: "mnswpr_hard",
    },
    30: {
      name: "veryhard",
      bombCount: 107,
      cellClass: "vhardCell",
      headerClass: "header-after-start-vh",
      storageKey: "mnswpr_veryhard",
    },
  };

  const STORAGE_KEYS = {
    PREV_DIFFICULTY: "mnswpr_prev_difficulty",
    HIDE_TIMER: "mnswpr_hide_timer",
  };

  // localStorage wrapper (replaces cookies)
  const storage = {
    get(key) {
      try {
        return localStorage.getItem(key);
      } catch (e) {
        console.warn("localStorage not available:", e);
        return null;
      }
    },
    getNumber(key) {
      const value = this.get(key);
      return value ? Number(value) : 0;
    },
    set(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch (e) {
        console.warn("localStorage not available:", e);
      }
    },
    remove(key) {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.warn("localStorage not available:", e);
      }
    },
  };

  let gameStarted = false;
  let gameOver = false;
  let gridBuilt = false;
  let difficulty = 0;

  let runningTimer;
  let seconds = 0;
  let minutes = 0;
  let hours = 0;
  let timeSeconds = 0;

  let bombsLeft;

  const gameBoard = [];

  const checkBox = document.getElementById("hideTimer");
  const timer = document.getElementById("timer");
  const gameBoardUI = document.getElementById("gameBoard_UI");

  function getConfig() {
    return DIFFICULTY_CONFIG[difficulty];
  }

  function getBombCount() {
    return getConfig().bombCount;
  }

  function getHighScore() {
    const key = getConfig().storageKey;
    return {
      time: storage.get(key + "_time") || "",
      seconds: storage.getNumber(key + "_seconds"),
    };
  }

  function setHighScore(time, totalSeconds) {
    const key = getConfig().storageKey;
    storage.set(key + "_time", time);
    storage.set(key + "_seconds", totalSeconds);
  }

  function timerTick() {
    seconds++;
    if (seconds >= 60) {
      seconds = 0;
      minutes++;
      if (minutes >= 60) {
        minutes = 0;
        hours++;
      }
    }
    timeSeconds = seconds + minutes * 60 + hours * 3600;
    timer.textContent =
      (hours ? (hours > 9 ? hours : "0" + hours) : "00") +
      ":" +
      (minutes ? (minutes > 9 ? minutes : "0" + minutes) : "00") +
      ":" +
      (seconds > 9 ? seconds : "0" + seconds);
    timerStart();
  }

  function timerStart() {
    runningTimer = setTimeout(timerTick, 1000);
  }

  function timerStop() {
    if (runningTimer) {
      clearTimeout(runningTimer);
      runningTimer = null;
    }
  }

  function timerReset() {
    timerStop();
    seconds = 0;
    minutes = 0;
    hours = 0;
    timeSeconds = 0;
    timer.textContent = "00:00:00";
  }

  class Cell {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.neighbors = [];
      this.bomb = false;
      this.bombNeighborCount = 0;
      this.checked = false;
      this.clickable = true;
      this.flag = false;
      this.questionMark = false;
      this.flipped = false;
    }

    setNeighbors() {
      const dirs = [-1, 0, 1];
      for (let dirx of dirs) {
        for (let diry of dirs) {
          if (validPosition(this.x + dirx, this.y + diry)) {
            if (dirx === 0 && diry === 0) {
              continue;
            }
            this.neighbors.push([this.x + dirx, this.y + diry]);
          }
        }
      }
    }

    setBomb() {
      this.bomb = true;
      for (let n of this.neighbors) {
        getCell(n[0], n[1]).bombNeighborCount++;
      }
    }

    handleClick(e) {
      if (!gameStarted || gameOver || this.flipped) {
        return;
      }
      if (e.button === 0 && this.clickable) {
        if (this.bomb) {
          lossHandler(this);
        } else if (this.bombNeighborCount > 0) {
          this.showNumber();
        } else {
          for (let x = 0; x < difficulty; x++) {
            for (let y = 0; y < difficulty; y++) {
              getCell(x, y).checked = false;
            }
          }
          showNonBombNeighbors(this.x, this.y);
        }
      } else if (e.button === 2) {
        this.showFlagOrQuestionMark();
      }
      if (checkForWin()) {
        winHandler();
      }
    }

    handleKeyboard(e) {
      if (!gameStarted || gameOver || this.flipped) {
        return;
      }
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (this.clickable) {
          if (this.bomb) {
            lossHandler(this);
          } else if (this.bombNeighborCount > 0) {
            this.showNumber();
          } else {
            for (let x = 0; x < difficulty; x++) {
              for (let y = 0; y < difficulty; y++) {
                getCell(x, y).checked = false;
              }
            }
            showNonBombNeighbors(this.x, this.y);
          }
        }
        if (checkForWin()) {
          winHandler();
        }
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        this.showFlagOrQuestionMark();
        if (checkForWin()) {
          winHandler();
        }
      }
    }

    showFlagOrQuestionMark() {
      const elem = getCellElem(this.x, this.y);
      if (this.flag) {
        elem.textContent = "?";
        elem.classList.remove("flag");
        elem.classList.add("question-mark");
        elem.setAttribute("aria-label", `Cell ${this.x + 1}, ${this.y + 1}: question mark`);
        this.flag = false;
        this.questionMark = true;
        updateBombsLeft(1);
      } else if (this.questionMark) {
        elem.textContent = "";
        this.flag = false;
        this.questionMark = false;
        this.clickable = true;
        elem.classList.remove("flag");
        elem.classList.remove("question-mark");
        elem.setAttribute("aria-label", `Cell ${this.x + 1}, ${this.y + 1}: hidden`);
      } else {
        this.flag = true;
        this.clickable = false;
        updateBombsLeft(-1);
        elem.classList.add("flag");
        elem.classList.remove("question-mark");
        elem.setAttribute("aria-label", `Cell ${this.x + 1}, ${this.y + 1}: flagged`);
      }
    }

    showNumber() {
      this.flipped = true;
      this.clickable = false;
      const elem = getCellElem(this.x, this.y);
      elem.textContent = this.bombNeighborCount;
      elem.classList.add("flipped");
      elem.setAttribute("aria-label", `Cell ${this.x + 1}, ${this.y + 1}: ${this.bombNeighborCount} adjacent bombs`);
      elem.setAttribute("tabindex", "-1");
    }
  }

  function updateBombsLeft(change) {
    bombsLeft += change;
    const bombsLeftElem = document.getElementById("bombsLeft");
    bombsLeftElem.textContent = bombsLeft;
    bombsLeftElem.setAttribute("aria-live", "polite");
  }

  function lossHandler(cell) {
    cell.flipped = true;
    cell.clickable = false;
    getCellElem(cell.x, cell.y).classList.add("explosion");
    for (let x = 0; x < difficulty; x++) {
      for (let y = 0; y < difficulty; y++) {
        const isClickedCell = cell.x === x && cell.y === y;
        if (!isClickedCell && getCell(x, y).bomb && !getCell(x, y).flag) {
          getCellElem(x, y).classList.add("bomb");
        }
      }
    }
    gameOverHandler("You Lose!");
  }

  function winHandler() {
    const time = timer.textContent;
    const highScore = getHighScore();
    if (timeSeconds < highScore.seconds || highScore.seconds === 0) {
      setHighScore(time, timeSeconds);
      initializeHighScore();
    }
    gameOverHandler("You Win!");
  }

  function gameOverHandler(message) {
    for (let x = 0; x < difficulty; x++) {
      for (let y = 0; y < difficulty; y++) {
        if (getCell(x, y).bomb && getCell(x, y).flag) {
          getCellElem(x, y).classList.remove("flag");
          getCellElem(x, y).classList.add("correct");
        } else if (!getCell(x, y).bomb && getCell(x, y).flag) {
          getCellElem(x, y).classList.remove("flag");
          getCellElem(x, y).classList.add("incorrect");
        }
      }
    }
    gameOver = true;
    timerStop();
    modal(message, 1200);
  }

  function checkForWin() {
    const bombCount = getBombCount();
    let flaggedAndBombCount = 0;
    let flaggedCount = 0;
    for (let x = 0; x < difficulty; x++) {
      for (let y = 0; y < difficulty; y++) {
        if (getCell(x, y).flag) {
          flaggedCount++;
        }
        if (getCell(x, y).bomb && getCell(x, y).flag) {
          flaggedAndBombCount++;
        }
      }
    }
    return flaggedAndBombCount === bombCount && flaggedCount === bombCount;
  }

  function showNonBombNeighbors(x, y) {
    const cell = getCell(x, y);
    if (cell.questionMark || cell.flag || cell.bomb || cell.checked) {
      return;
    } else if (cell.bombNeighborCount > 0) {
      cell.showNumber();
      return;
    }
    cell.flipped = true;
    cell.clickable = false;
    const elem = getCellElem(x, y);
    elem.classList.add("flipped");
    elem.classList.add("empty");
    elem.setAttribute("aria-label", `Cell ${x + 1}, ${y + 1}: empty`);
    elem.setAttribute("tabindex", "-1");
    cell.checked = true;
    for (let n of getCell(x, y).neighbors) {
      showNonBombNeighbors(n[0], n[1]);
    }
  }

  function getDifficulty() {
    return Number(
      Array.from(document.getElementById("difficulty").options).find(
        (d) => d.selected
      ).value
    );
  }

  function getCellId(x, y) {
    return "cell-" + x + "-" + y;
  }

  function getCell(x, y) {
    return gameBoard[x][y];
  }

  function getCellElem(x, y) {
    return document.getElementById(getCellId(x, y));
  }

  function validPosition(x, y) {
    return x >= 0 && x < difficulty && y >= 0 && y < difficulty;
  }

  function buildGrid(e) {
    if (!gameStarted && !gridBuilt) {
      document.getElementById("updateText").classList.add("hide");
      document.getElementById("difForm").classList.add("hidden");
      document.getElementById("highScores").classList.add("hide");
      e.target.disabled = true;
      e.target.classList.add("hidden");
      buildGridInternal();
      gridBuilt = true;
      gameStarted = true;
      timer.classList.remove("hide");
      document.getElementById("timerContainer").classList.remove("hide");
      timerStart();
      bombsLeft = getBombCount();
      updateBombsLeft(0);
      toggleDisplay();
      document.getElementById("btns").classList.add("extraMargin");
      storage.set(STORAGE_KEYS.PREV_DIFFICULTY, difficulty);

      // Announce game start for screen readers
      announceToScreenReader(`Game started. ${getConfig().name} difficulty with ${getBombCount()} bombs. Use arrow keys to navigate, Enter or Space to reveal, F to flag.`);
    }
  }

  function announceToScreenReader(message) {
    const announcement = document.getElementById("sr-announcements");
    if (announcement) {
      announcement.textContent = message;
    }
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function toggleHeader() {
    const headerClass = getConfig().headerClass;
    document.getElementById("header-tag").classList.add(headerClass);
  }

  function toggleDisplay() {
    document.getElementById("buildGrid").classList.add("hide");
    document.getElementById("reload").classList.remove("hide");
    document
      .getElementById("header-tag")
      .classList.remove("header-before-start");
    toggleHeader();
    gameBoardUI.scrollIntoView();
  }

  function buildGridInternal() {
    difficulty = getDifficulty();
    const config = getConfig();

    for (let x = 0; x < difficulty; x++) {
      gameBoard.push([]);
      const col = document.createElement("div");
      col.id = "col-" + x;
      col.classList.add("col");
      col.setAttribute("role", "row");
      gameBoardUI.appendChild(col);

      for (let y = 0; y < difficulty; y++) {
        const newCell = new Cell(x, y);
        gameBoard[x].push(newCell);
        gameBoard[x][y].setNeighbors();

        const cell = document.createElement("div");
        cell.id = getCellId(x, y);
        cell.classList.add("cell");
        cell.classList.add(config.cellClass);
        cell.setAttribute("role", "gridcell");
        cell.setAttribute("tabindex", "0");
        cell.setAttribute("aria-label", `Cell ${x + 1}, ${y + 1}: hidden`);

        col.appendChild(cell);
        cell.addEventListener("mouseup", (e) => newCell.handleClick(e));
        cell.addEventListener("keydown", (e) => newCell.handleKeyboard(e));
        cell.addEventListener("keydown", (e) => handleArrowNavigation(e, x, y));
      }
    }
    placeBombs();

    // Focus the first cell for keyboard users
    const firstCell = getCellElem(0, 0);
    if (firstCell) {
      firstCell.focus();
    }
  }

  function handleArrowNavigation(e, x, y) {
    let newX = x;
    let newY = y;

    switch (e.key) {
      case "ArrowUp":
        newY = Math.max(0, y - 1);
        break;
      case "ArrowDown":
        newY = Math.min(difficulty - 1, y + 1);
        break;
      case "ArrowLeft":
        newX = Math.max(0, x - 1);
        break;
      case "ArrowRight":
        newX = Math.min(difficulty - 1, x + 1);
        break;
      default:
        return;
    }

    e.preventDefault();
    const targetCell = getCellElem(newX, newY);
    if (targetCell) {
      targetCell.focus();
    }
  }

  function modal(message, duration) {
    const modalBox = document.createElement("div");
    modalBox.id = "modal-box";
    modalBox.setAttribute("role", "dialog");
    modalBox.setAttribute("aria-modal", "true");
    modalBox.setAttribute("aria-labelledby", "modal-message");

    const innerModalBox = document.createElement("div");
    innerModalBox.id = "inner-modal-box";

    const modalMessage = document.createElement("span");
    modalMessage.id = "modal-message";
    modalMessage.innerText = message;

    innerModalBox.appendChild(modalMessage);
    modalBox.appendChild(innerModalBox);
    document.body.appendChild(modalBox);

    announceToScreenReader(message);

    sleep(duration).then(() => modalBox.remove());
  }

  // Fisher-Yates shuffle for efficient bomb placement
  function placeBombs() {
    const totalCells = difficulty * difficulty;
    const bombCount = getBombCount();

    // Create array of all cell positions
    const positions = [];
    for (let x = 0; x < difficulty; x++) {
      for (let y = 0; y < difficulty; y++) {
        positions.push([x, y]);
      }
    }

    // Fisher-Yates shuffle - only shuffle first bombCount elements
    for (let i = 0; i < bombCount; i++) {
      const j = i + Math.floor(Math.random() * (totalCells - i));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }

    // Place bombs at first bombCount positions
    for (let i = 0; i < bombCount; i++) {
      const [x, y] = positions[i];
      getCell(x, y).setBomb();
    }
  }

  function toggleTimer() {
    if (checkBox.checked) {
      timer.classList.add("notShown");
      storage.set(STORAGE_KEYS.HIDE_TIMER, "Y");
    } else {
      timer.classList.remove("notShown");
      storage.set(STORAGE_KEYS.HIDE_TIMER, "N");
    }
  }

  function initializeHighScore() {
    Object.keys(DIFFICULTY_CONFIG).forEach((key) => {
      const config = DIFFICULTY_CONFIG[key];
      const elemId = config.name === "veryhard" ? "vhardBestScore" :
                     config.name === "medium" ? "medBestScore" :
                     config.name + "BestScore";
      const elem = document.getElementById(elemId);
      if (elem) {
        const time = storage.get(config.storageKey + "_time") || "";
        elem.textContent = time;
      }
    });
  }

  function initializeDifficulty() {
    const prevDif = storage.getNumber(STORAGE_KEYS.PREV_DIFFICULTY);
    const elemMap = {
      10: "difEasy",
      15: "difMed",
      20: "difHard",
      30: "difvHard",
    };
    const elemId = elemMap[prevDif];
    if (elemId) {
      document.getElementById(elemId).setAttribute("selected", "selected");
    }
  }

  // Proper game reset without page reload
  function resetGame() {
    // Stop timer
    timerStop();
    timerReset();

    // Reset game state
    gameStarted = false;
    gameOver = false;
    gridBuilt = false;
    difficulty = 0;
    bombsLeft = 0;

    // Clear game board array
    gameBoard.length = 0;

    // Remove all grid elements
    gameBoardUI.innerHTML = "";

    // Reset UI visibility
    document.getElementById("updateText").classList.remove("hide");
    document.getElementById("difForm").classList.remove("hidden");
    document.getElementById("highScores").classList.remove("hide");
    document.getElementById("btns").classList.remove("extraMargin");

    const buildGridBtn = document.getElementById("buildGrid");
    buildGridBtn.disabled = false;
    buildGridBtn.classList.remove("hidden");
    buildGridBtn.classList.remove("hide");

    document.getElementById("reload").classList.add("hide");
    timer.classList.add("hide");
    document.getElementById("timerContainer").classList.add("hide");

    // Reset header
    const header = document.getElementById("header-tag");
    header.classList.add("header-before-start");
    Object.keys(DIFFICULTY_CONFIG).forEach((key) => {
      header.classList.remove(DIFFICULTY_CONFIG[key].headerClass);
    });

    // Reinitialize high scores display
    initializeHighScore();

    // Focus the play button for accessibility
    buildGridBtn.focus();

    announceToScreenReader("Game reset. Select difficulty and press Play to start a new game.");
  }

  (function () {
    document.getElementById("buildGrid").addEventListener("click", buildGrid);
    document.getElementById("buildGrid").addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        buildGrid(e);
      }
    });

    document.getElementById("reload").addEventListener("click", resetGame);
    document.getElementById("reload").addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        resetGame();
      }
    });

    checkBox.addEventListener("click", toggleTimer);
    const hideTimer = storage.get(STORAGE_KEYS.HIDE_TIMER) === "Y";
    checkBox.checked = hideTimer;
    if (!hideTimer) {
      document.getElementById("highScores").classList.remove("hide");
    }
    toggleTimer();
    document.oncontextmenu = () => false;
    initializeHighScore();
    initializeDifficulty();
  })();
})();
