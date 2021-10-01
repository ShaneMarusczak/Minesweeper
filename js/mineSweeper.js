(function () {
  let gameStarted = false;
  let gameOver = false;
  let gridBuilt = false;
  let difficulty = 0;

  let runningTimer;
  let seconds = 0;
  let minutes = 0;
  let hours = 0;

  const gameBoard = [];

  const bombCount = {
    easy: 20,
    medium: 45,
    hard: 75,
    veryhard: 125,
  };

  const gameBoard_UI = document.getElementById("gameBoard_UI");
  const checkBox = document.getElementById("hideTimer");
  const timer = document.getElementById("timer");

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

  function getBombCount() {
    if (difficulty === 10) return bombCount.easy;
    else if (difficulty === 15) return bombCount.medium;
    else if (difficulty === 20) return bombCount.hard;
    if (difficulty === 30) return bombCount.veryhard;
  }

  class Cell {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.neighbors = [];
      this.bomb = false;
      this.hasBombNeighbor = false;
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
        getCell(n[0], n[1]).hasBombNeighbor = true;
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
        } else if (this.hasBombNeighbor) {
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
        handleWin();
      }
    }

    showFlagOrQuestionMark() {
      if (this.flag) {
        getCellElem(this.x, this.y).textContent = "?";
        getCellElem(this.x, this.y).classList.remove("flag");
        getCellElem(this.x, this.y).classList.add("question-mark");
        this.flag = false;
        this.questionMark = true;
      } else if (this.questionMark) {
        getCellElem(this.x, this.y).textContent = "";
        this.flag = false;
        this.questionMark = false;
        this.clickable = true;
        getCellElem(this.x, this.y).classList.remove("flag");
        getCellElem(this.x, this.y).classList.remove("question-mark");
      } else {
        this.flag = true;
        this.clickable = false;
        getCellElem(this.x, this.y).classList.add("flag");
        getCellElem(this.x, this.y).classList.remove("question-mark");
      }
    }

    showNumber() {
      this.flipped = true;
      this.clickable = false;
      getCellElem(this.x, this.y).textContent = this.bombNeighborCount;
      getCellElem(this.x, this.y).classList.add("flipped");
    }
  }

  function lossHandler(cell) {
    cell.flipped = true;
    gameOver = true;
    cell.clickable = false;
    getCellElem(cell.x, cell.y).classList.add("explosion");
    for (let x = 0; x < difficulty; x++) {
      for (let y = 0; y < difficulty; y++) {
        if (
          getCell(x, y).bomb &&
          cell.x !== x &&
          cell.y !== y &&
          !getCell(x, y).flag
        ) {
          getCellElem(x, y).classList.add("bomb");
        } else if (getCell(x, y).bomb && getCell(x, y).flag) {
          getCellElem(x, y).classList.remove("flag");
          getCellElem(x, y).classList.add("correct");
        } else if (!getCell(x, y).bomb && getCell(x, y).flag) {
          getCellElem(x, y).classList.remove("flag");
          getCellElem(x, y).classList.add("incorrect");
        }
      }
    }
    clearTimeout(runningTimer);
    window.modal("You Lose!", 2000);
  }

  function checkForWin() {
    const bombCount = getBombCount();
    const cellCount = Math.pow(difficulty, 2);
    let flippedCount = 0;
    let flaggedAndBombCount = 0;
    let flaggedCount = 0;
    for (let x = 0; x < difficulty; x++) {
      for (let y = 0; y < difficulty; y++) {
        if (getCell(x, y).flipped) {
          flippedCount++;
        }
        if (getCell(x, y).flag) {
          flaggedCount++;
        }
        if (getCell(x, y).bomb && getCell(x, y).flag) {
          flaggedAndBombCount++;
        }
      }
    }
    return (
      (flaggedAndBombCount === bombCount && flippedCount === bombCount) ||
      cellCount - flippedCount === bombCount
    );
  }

  function handleWin() {
    gameOver = true;
    clearTimeout(runningTimer);
    window.modal("You Win!", 2000);
  }

  function showNonBombNeighbors(x, y) {
    if (
      getCell(x, y).questionMark ||
      getCell(x, y).flag ||
      getCell(x, y).bomb ||
      getCell(x, y).checked
    ) {
      return;
    } else if (getCell(x, y).hasBombNeighbor) {
      getCell(x, y).showNumber();
      return;
    }
    getCell(x, y).flipped = true;
    getCell(x, y).clickable = false;
    getCellElem(x, y).classList.add("flipped");
    getCellElem(x, y).classList.add("empty");
    getCell(x, y).checked = true;
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
      document.getElementById("difForm").classList.add("hidden");
      e.target.disabled = true;
      e.target.classList.add("hidden");
      buildGridInternal();
      gridBuilt = true;
      gameStarted = true;
      timer.classList.remove("hide");
      timerContainer.classList.remove("hide");
      timerStart();
    }
  }

  function buildGridInternal() {
    difficulty = getDifficulty();
    for (let x = 0; x < difficulty; x++) {
      gameBoard.push([]);
      const col = document.createElement("div");
      col.id = "col-" + x;
      col.classList.add("col");
      gameBoard_UI.appendChild(col);
      for (let y = 0; y < difficulty; y++) {
        const newCell = new Cell(x, y);
        gameBoard[x].push(newCell);
        gameBoard[x][y].setNeighbors();
        const cell = document.createElement("div");
        cell.id = getCellId(x, y);
        cell.classList.add("cell");
        col.appendChild(cell);
        cell.addEventListener("mouseup", (e) => newCell.handleClick(e));
      }
    }
    placeBombs();
  }

  function placeBombs() {
    let bombs = getBombCount();
    let range = difficulty - 1;
    while (bombs > 0) {
      let x, y;
      do {
        x = window.randomIntFromInterval(0, range);
        y = window.randomIntFromInterval(0, range);
      } while (getCell(x, y).bomb);
      getCell(x, y).setBomb();
      bombs--;
    }
  }

  function toggleTimer() {
    if (checkBox.checked) {
      timer.classList.add("notShown");
      window.setCookie("hideSudokuTimer", "Y", 30);
    } else {
      timer.classList.remove("notShown");
      window.setCookie("hideSudokuTimer", "N", 30);
    }
  }

  (function () {
    document.getElementById("buildGrid").addEventListener("click", buildGrid);
    checkBox.addEventListener("click", toggleTimer);
    checkBox.checked = window.getCookie("hideSudokuTimer") === "Y";
    toggleTimer();
    document.oncontextmenu = () => false;
  })();
})();
