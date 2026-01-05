(function () {
  // ===========================================
  // CONFIGURATION
  // ===========================================
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

  const LONG_PRESS_DURATION = 400; // ms for touch flag

  // ===========================================
  // STORAGE (localStorage wrapper)
  // ===========================================
  const storage = {
    get(key) {
      try {
        return localStorage.getItem(key);
      } catch (e) {
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
      } catch (e) {}
    },
  };

  // ===========================================
  // GAME STATE (Pure logic, no DOM)
  // ===========================================
  class Cell {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.bomb = false;
      this.bombNeighborCount = 0;
      this.revealed = false;
      this.flagged = false;
      this.questionMark = false;
    }
  }

  class GameState {
    constructor(size, bombCount) {
      this.size = size;
      this.bombCount = bombCount;
      this.board = [];
      this.gameOver = false;
      this.won = false;
      this.bombsPlaced = false;
      this.revealedCount = 0;
      this.flaggedCount = 0;

      // Initialize empty board
      for (let x = 0; x < size; x++) {
        this.board[x] = [];
        for (let y = 0; y < size; y++) {
          this.board[x][y] = new Cell(x, y);
        }
      }
    }

    getCell(x, y) {
      if (x >= 0 && x < this.size && y >= 0 && y < this.size) {
        return this.board[x][y];
      }
      return null;
    }

    getNeighbors(x, y) {
      const neighbors = [];
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          const cell = this.getCell(x + dx, y + dy);
          if (cell) neighbors.push(cell);
        }
      }
      return neighbors;
    }

    // Fisher-Yates shuffle for bomb placement, excluding safe zone
    placeBombs(safeX, safeY) {
      if (this.bombsPlaced) return;

      const safeZone = new Set();
      safeZone.add(`${safeX},${safeY}`);
      this.getNeighbors(safeX, safeY).forEach((n) =>
        safeZone.add(`${n.x},${n.y}`)
      );

      // Collect all valid positions
      const positions = [];
      for (let x = 0; x < this.size; x++) {
        for (let y = 0; y < this.size; y++) {
          if (!safeZone.has(`${x},${y}`)) {
            positions.push([x, y]);
          }
        }
      }

      // Fisher-Yates partial shuffle
      for (let i = 0; i < this.bombCount && i < positions.length; i++) {
        const j = i + Math.floor(Math.random() * (positions.length - i));
        [positions[i], positions[j]] = [positions[j], positions[i]];
      }

      // Place bombs
      for (let i = 0; i < this.bombCount && i < positions.length; i++) {
        const [x, y] = positions[i];
        this.board[x][y].bomb = true;
      }

      // Calculate neighbor counts
      for (let x = 0; x < this.size; x++) {
        for (let y = 0; y < this.size; y++) {
          if (!this.board[x][y].bomb) {
            this.board[x][y].bombNeighborCount = this.getNeighbors(x, y).filter(
              (n) => n.bomb
            ).length;
          }
        }
      }

      this.bombsPlaced = true;
    }

    reveal(x, y) {
      if (this.gameOver) return { changed: [], gameOver: false, won: false };

      const cell = this.getCell(x, y);
      if (!cell || cell.revealed || cell.flagged)
        return { changed: [], gameOver: false, won: false };

      // First click safety - place bombs after first reveal
      if (!this.bombsPlaced) {
        this.placeBombs(x, y);
      }

      const changed = [];

      if (cell.bomb) {
        cell.revealed = true;
        changed.push({ cell, type: "explosion" });

        // Reveal all bombs
        for (let bx = 0; bx < this.size; bx++) {
          for (let by = 0; by < this.size; by++) {
            const c = this.board[bx][by];
            if (c.bomb && !c.flagged && !(c.x === x && c.y === y)) {
              changed.push({ cell: c, type: "bomb" });
            }
            if (c.flagged && c.bomb) {
              changed.push({ cell: c, type: "correct" });
            }
            if (c.flagged && !c.bomb) {
              changed.push({ cell: c, type: "incorrect" });
            }
          }
        }

        this.gameOver = true;
        this.won = false;
        return { changed, gameOver: true, won: false };
      }

      // Flood fill for empty cells
      this._revealCell(cell, changed);

      // Check win condition
      if (this._checkWin()) {
        this.gameOver = true;
        this.won = true;
        return { changed, gameOver: true, won: true };
      }

      return { changed, gameOver: false, won: false };
    }

    _revealCell(cell, changed) {
      if (cell.revealed || cell.flagged || cell.bomb) return;

      cell.revealed = true;
      this.revealedCount++;
      changed.push({ cell, type: "revealed" });

      if (cell.bombNeighborCount === 0) {
        this.getNeighbors(cell.x, cell.y).forEach((n) =>
          this._revealCell(n, changed)
        );
      }
    }

    // Chord click - reveal neighbors if flag count matches number
    chord(x, y) {
      if (this.gameOver) return { changed: [], gameOver: false, won: false };

      const cell = this.getCell(x, y);
      if (!cell || !cell.revealed || cell.bombNeighborCount === 0) {
        return { changed: [], gameOver: false, won: false };
      }

      const neighbors = this.getNeighbors(x, y);
      const flaggedNeighbors = neighbors.filter((n) => n.flagged).length;

      if (flaggedNeighbors !== cell.bombNeighborCount) {
        return { changed: [], gameOver: false, won: false };
      }

      // Reveal all unflagged neighbors
      let allChanged = [];
      let finalGameOver = false;
      let finalWon = false;

      neighbors
        .filter((n) => !n.flagged && !n.revealed)
        .forEach((n) => {
          const result = this.reveal(n.x, n.y);
          allChanged = allChanged.concat(result.changed);
          if (result.gameOver) {
            finalGameOver = true;
            finalWon = result.won;
          }
        });

      return { changed: allChanged, gameOver: finalGameOver, won: finalWon };
    }

    toggleFlag(x, y) {
      if (this.gameOver) return { changed: [], flagChange: 0 };

      const cell = this.getCell(x, y);
      if (!cell || cell.revealed) return { changed: [], flagChange: 0 };

      let flagChange = 0;

      if (cell.flagged) {
        cell.flagged = false;
        cell.questionMark = true;
        this.flaggedCount--;
        flagChange = 1;
      } else if (cell.questionMark) {
        cell.questionMark = false;
      } else {
        cell.flagged = true;
        this.flaggedCount++;
        flagChange = -1;
      }

      const changed = [{ cell, type: "flag-update" }];

      // Check win after flagging
      if (this._checkWin()) {
        this.gameOver = true;
        this.won = true;
        return { changed, flagChange, gameOver: true, won: true };
      }

      return { changed, flagChange, gameOver: false, won: false };
    }

    _checkWin() {
      // Win by revealing all non-bombs
      const totalNonBombs = this.size * this.size - this.bombCount;
      if (this.revealedCount === totalNonBombs) {
        return true;
      }

      // Win by correctly flagging all bombs (and only bombs)
      if (this.flaggedCount !== this.bombCount) return false;

      for (let x = 0; x < this.size; x++) {
        for (let y = 0; y < this.size; y++) {
          const cell = this.board[x][y];
          if (cell.flagged && !cell.bomb) return false;
          if (cell.bomb && !cell.flagged) return false;
        }
      }
      return true;
    }

    getBombsRemaining() {
      return this.bombCount - this.flaggedCount;
    }
  }

  // ===========================================
  // GAME RENDERER (DOM handling)
  // ===========================================
  class GameRenderer {
    constructor(container, config) {
      this.container = container;
      this.config = config;
      this.cellElements = {};
      this.onCellAction = null; // callback for cell interactions
    }

    render(gameState) {
      this.container.innerHTML = "";
      this.cellElements = {};

      for (let x = 0; x < gameState.size; x++) {
        const col = document.createElement("div");
        col.id = "col-" + x;
        col.classList.add("col");
        col.setAttribute("role", "row");
        this.container.appendChild(col);

        for (let y = 0; y < gameState.size; y++) {
          const cellElem = this._createCellElement(x, y, gameState);
          col.appendChild(cellElem);
          this.cellElements[`${x},${y}`] = cellElem;
        }
      }

      // Focus first cell
      const first = this.cellElements["0,0"];
      if (first) first.focus();
    }

    _createCellElement(x, y, gameState) {
      const cell = document.createElement("div");
      cell.id = `cell-${x}-${y}`;
      cell.classList.add("cell", this.config.cellClass);
      cell.setAttribute("role", "gridcell");
      cell.setAttribute("tabindex", "0");
      cell.setAttribute("aria-label", `Cell ${x + 1}, ${y + 1}: hidden`);

      // Mouse events
      cell.addEventListener("mouseup", (e) => this._handleMouseUp(e, x, y, gameState));
      cell.addEventListener("contextmenu", (e) => e.preventDefault());

      // Keyboard events
      cell.addEventListener("keydown", (e) => this._handleKeyDown(e, x, y, gameState));

      // Touch events (long press for flag)
      let touchTimer = null;
      let touchMoved = false;

      cell.addEventListener("touchstart", (e) => {
        touchMoved = false;
        touchTimer = setTimeout(() => {
          touchTimer = null;
          if (this.onCellAction) {
            this.onCellAction("flag", x, y);
          }
        }, LONG_PRESS_DURATION);
      }, { passive: true });

      cell.addEventListener("touchmove", () => {
        touchMoved = true;
        if (touchTimer) {
          clearTimeout(touchTimer);
          touchTimer = null;
        }
      }, { passive: true });

      cell.addEventListener("touchend", (e) => {
        if (touchTimer) {
          clearTimeout(touchTimer);
          touchTimer = null;
          // Short tap = reveal
          if (!touchMoved && this.onCellAction) {
            e.preventDefault();
            const cellData = gameState.getCell(x, y);
            if (cellData && cellData.revealed && cellData.bombNeighborCount > 0) {
              this.onCellAction("chord", x, y);
            } else {
              this.onCellAction("reveal", x, y);
            }
          }
        }
      });

      return cell;
    }

    _handleMouseUp(e, x, y, gameState) {
      if (!this.onCellAction) return;

      const cell = gameState.getCell(x, y);

      if (e.button === 0) {
        // Left click
        if (cell && cell.revealed && cell.bombNeighborCount > 0) {
          this.onCellAction("chord", x, y);
        } else {
          this.onCellAction("reveal", x, y);
        }
      } else if (e.button === 2) {
        // Right click
        this.onCellAction("flag", x, y);
      }
    }

    _handleKeyDown(e, x, y, gameState) {
      // Arrow navigation
      let newX = x,
        newY = y;
      switch (e.key) {
        case "ArrowUp":
          newY = Math.max(0, y - 1);
          break;
        case "ArrowDown":
          newY = Math.min(gameState.size - 1, y + 1);
          break;
        case "ArrowLeft":
          newX = Math.max(0, x - 1);
          break;
        case "ArrowRight":
          newX = Math.min(gameState.size - 1, x + 1);
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          if (this.onCellAction) {
            const cell = gameState.getCell(x, y);
            if (cell && cell.revealed && cell.bombNeighborCount > 0) {
              this.onCellAction("chord", x, y);
            } else {
              this.onCellAction("reveal", x, y);
            }
          }
          return;
        case "f":
        case "F":
          e.preventDefault();
          if (this.onCellAction) {
            this.onCellAction("flag", x, y);
          }
          return;
        default:
          return;
      }

      e.preventDefault();
      const target = this.cellElements[`${newX},${newY}`];
      if (target) target.focus();
    }

    updateCells(changes) {
      changes.forEach(({ cell, type }) => {
        const elem = this.cellElements[`${cell.x},${cell.y}`];
        if (!elem) return;

        switch (type) {
          case "revealed":
            elem.classList.add("flipped");
            if (cell.bombNeighborCount > 0) {
              elem.textContent = cell.bombNeighborCount;
              elem.classList.add(`number-${cell.bombNeighborCount}`);
              elem.setAttribute(
                "aria-label",
                `Cell ${cell.x + 1}, ${cell.y + 1}: ${cell.bombNeighborCount} adjacent bombs`
              );
            } else {
              elem.classList.add("empty");
              elem.setAttribute(
                "aria-label",
                `Cell ${cell.x + 1}, ${cell.y + 1}: empty`
              );
            }
            elem.setAttribute("tabindex", "-1");
            break;

          case "explosion":
            elem.classList.add("explosion");
            elem.setAttribute(
              "aria-label",
              `Cell ${cell.x + 1}, ${cell.y + 1}: bomb exploded`
            );
            break;

          case "bomb":
            elem.classList.add("bomb");
            break;

          case "correct":
            elem.classList.remove("flag");
            elem.classList.add("correct");
            break;

          case "incorrect":
            elem.classList.remove("flag");
            elem.classList.add("incorrect");
            break;

          case "flag-update":
            elem.classList.remove("flag", "question-mark");
            elem.textContent = "";
            if (cell.flagged) {
              elem.classList.add("flag");
              elem.setAttribute(
                "aria-label",
                `Cell ${cell.x + 1}, ${cell.y + 1}: flagged`
              );
            } else if (cell.questionMark) {
              elem.classList.add("question-mark");
              elem.textContent = "?";
              elem.setAttribute(
                "aria-label",
                `Cell ${cell.x + 1}, ${cell.y + 1}: question mark`
              );
            } else {
              elem.setAttribute(
                "aria-label",
                `Cell ${cell.x + 1}, ${cell.y + 1}: hidden`
              );
            }
            break;
        }
      });
    }

    clear() {
      this.container.innerHTML = "";
      this.cellElements = {};
    }
  }

  // ===========================================
  // GAME CONTROLLER (Orchestrates everything)
  // ===========================================
  class GameController {
    constructor() {
      this.gameState = null;
      this.renderer = null;
      this.difficulty = 0;
      this.config = null;

      // Timer state
      this.timerRunning = false;
      this.timerInterval = null;
      this.seconds = 0;
      this.minutes = 0;
      this.hours = 0;

      // DOM elements
      this.timerElem = document.getElementById("timer");
      this.bombsLeftElem = document.getElementById("bombsLeft");
      this.gameBoardUI = document.getElementById("gameBoard_UI");
      this.checkBox = document.getElementById("hideTimer");

      this._bindEvents();
      this._initializeFromStorage();
    }

    _bindEvents() {
      document.getElementById("buildGrid").addEventListener("click", (e) => this.startGame(e));
      document.getElementById("buildGrid").addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          this.startGame(e);
        }
      });

      document.getElementById("reload").addEventListener("click", () => this.resetGame());
      document.getElementById("reload").addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          this.resetGame();
        }
      });

      this.checkBox.addEventListener("click", () => this._toggleTimerVisibility());
      document.oncontextmenu = () => false;
    }

    _initializeFromStorage() {
      // Load high scores
      Object.keys(DIFFICULTY_CONFIG).forEach((key) => {
        const config = DIFFICULTY_CONFIG[key];
        const elemId =
          config.name === "veryhard"
            ? "vhardBestScore"
            : config.name === "medium"
            ? "medBestScore"
            : config.name + "BestScore";
        const elem = document.getElementById(elemId);
        if (elem) {
          elem.textContent = storage.get(config.storageKey + "_time") || "";
        }
      });

      // Load previous difficulty
      const prevDif = storage.getNumber(STORAGE_KEYS.PREV_DIFFICULTY);
      const elemMap = { 10: "difEasy", 15: "difMed", 20: "difHard", 30: "difvHard" };
      if (elemMap[prevDif]) {
        document.getElementById(elemMap[prevDif]).setAttribute("selected", "selected");
      }

      // Load timer visibility
      const hideTimer = storage.get(STORAGE_KEYS.HIDE_TIMER) === "Y";
      this.checkBox.checked = hideTimer;
      if (!hideTimer) {
        document.getElementById("highScores").classList.remove("hide");
      }
      this._toggleTimerVisibility();
    }

    _toggleTimerVisibility() {
      if (this.checkBox.checked) {
        this.timerElem.classList.add("notShown");
        storage.set(STORAGE_KEYS.HIDE_TIMER, "Y");
      } else {
        this.timerElem.classList.remove("notShown");
        storage.set(STORAGE_KEYS.HIDE_TIMER, "N");
      }
    }

    _getDifficulty() {
      return Number(
        Array.from(document.getElementById("difficulty").options).find(
          (d) => d.selected
        ).value
      );
    }

    startGame(e) {
      if (this.gameState) return;

      this.difficulty = this._getDifficulty();
      this.config = DIFFICULTY_CONFIG[this.difficulty];

      // Hide setup UI
      document.getElementById("updateText").classList.add("hide");
      document.getElementById("difForm").classList.add("hidden");
      document.getElementById("highScores").classList.add("hide");
      e.target.disabled = true;
      e.target.classList.add("hidden");

      // Create game state
      this.gameState = new GameState(this.difficulty, this.config.bombCount);

      // Create renderer
      this.renderer = new GameRenderer(this.gameBoardUI, this.config);
      this.renderer.onCellAction = (action, x, y) => this._handleCellAction(action, x, y);
      this.renderer.render(this.gameState);

      // Show game UI
      this.timerElem.classList.remove("hide");
      document.getElementById("timerContainer").classList.remove("hide");
      document.getElementById("buildGrid").classList.add("hide");
      document.getElementById("reload").classList.remove("hide");
      document.getElementById("btns").classList.add("extraMargin");

      // Update header
      document.getElementById("header-tag").classList.remove("header-before-start");
      document.getElementById("header-tag").classList.add(this.config.headerClass);

      // Start timer
      this._startTimer();

      // Update bombs left
      this._updateBombsLeft();

      // Save difficulty preference
      storage.set(STORAGE_KEYS.PREV_DIFFICULTY, this.difficulty);

      // Scroll to game
      this.gameBoardUI.scrollIntoView();

      // Announce
      this._announce(
        `Game started. ${this.config.name} difficulty with ${this.config.bombCount} bombs. Use arrow keys to navigate, Enter or Space to reveal, F to flag. Long press on touch devices to flag.`
      );
    }

    _handleCellAction(action, x, y) {
      if (!this.gameState || this.gameState.gameOver) return;

      let result;

      switch (action) {
        case "reveal":
          result = this.gameState.reveal(x, y);
          break;
        case "chord":
          result = this.gameState.chord(x, y);
          break;
        case "flag":
          result = this.gameState.toggleFlag(x, y);
          if (result.flagChange !== undefined) {
            this._updateBombsLeft();
          }
          break;
      }

      if (result && result.changed.length > 0) {
        this.renderer.updateCells(result.changed);
      }

      if (result && result.gameOver) {
        this._endGame(result.won);
      }
    }

    _updateBombsLeft() {
      this.bombsLeftElem.textContent = this.gameState.getBombsRemaining();
    }

    _startTimer() {
      this.seconds = 0;
      this.minutes = 0;
      this.hours = 0;
      this.timerRunning = true;
      this.timerElem.textContent = "00:00:00";

      this.timerInterval = setInterval(() => {
        if (!this.timerRunning) return;

        this.seconds++;
        if (this.seconds >= 60) {
          this.seconds = 0;
          this.minutes++;
          if (this.minutes >= 60) {
            this.minutes = 0;
            this.hours++;
          }
        }

        this.timerElem.textContent =
          (this.hours > 9 ? this.hours : "0" + this.hours) +
          ":" +
          (this.minutes > 9 ? this.minutes : "0" + this.minutes) +
          ":" +
          (this.seconds > 9 ? this.seconds : "0" + this.seconds);
      }, 1000);
    }

    _stopTimer() {
      this.timerRunning = false;
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
    }

    _getTotalSeconds() {
      return this.seconds + this.minutes * 60 + this.hours * 3600;
    }

    _endGame(won) {
      this._stopTimer();

      if (won) {
        const time = this.timerElem.textContent;
        const totalSeconds = this._getTotalSeconds();
        const storedSeconds = storage.getNumber(this.config.storageKey + "_seconds");

        if (totalSeconds < storedSeconds || storedSeconds === 0) {
          storage.set(this.config.storageKey + "_time", time);
          storage.set(this.config.storageKey + "_seconds", totalSeconds);
        }

        this._showModal("You Win!");
        this._announce("Congratulations! You won!");
      } else {
        this._showModal("You Lose!");
        this._announce("Game over. You hit a bomb.");
      }
    }

    _showModal(message) {
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

      setTimeout(() => modalBox.remove(), 1200);
    }

    _announce(message) {
      const elem = document.getElementById("sr-announcements");
      if (elem) {
        elem.textContent = message;
      }
    }

    resetGame() {
      this._stopTimer();

      // Clear game state
      this.gameState = null;
      this.renderer = null;
      this.difficulty = 0;
      this.config = null;

      // Clear board
      this.gameBoardUI.innerHTML = "";

      // Reset UI
      document.getElementById("updateText").classList.remove("hide");
      document.getElementById("difForm").classList.remove("hidden");
      document.getElementById("highScores").classList.remove("hide");
      document.getElementById("btns").classList.remove("extraMargin");

      const buildGridBtn = document.getElementById("buildGrid");
      buildGridBtn.disabled = false;
      buildGridBtn.classList.remove("hidden", "hide");

      document.getElementById("reload").classList.add("hide");
      this.timerElem.classList.add("hide");
      this.timerElem.textContent = "00:00:00";
      document.getElementById("timerContainer").classList.add("hide");

      // Reset header
      const header = document.getElementById("header-tag");
      header.classList.add("header-before-start");
      Object.keys(DIFFICULTY_CONFIG).forEach((key) => {
        header.classList.remove(DIFFICULTY_CONFIG[key].headerClass);
      });

      // Reload high scores
      this._initializeFromStorage();

      // Focus play button
      buildGridBtn.focus();

      this._announce("Game reset. Select difficulty and press Play to start a new game.");
    }
  }

  // ===========================================
  // INITIALIZATION
  // ===========================================
  new GameController();
})();
