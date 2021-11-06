(function () {
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

  const easyBestScoreOnLoad = window.getCookie("mnswpreasy");
  const medBestScoreOnLoad = window.getCookie("mnswprmed");
  const hardBestScoreOnLoad = window.getCookie("mnswprhard");
  const vhardBestScoreOnLoad = window.getCookie("mnswprvhard");

  const easySeconds = Number(window.getCookie("mnswpreasysec"));
  const medSeconds = Number(window.getCookie("mnswprmedsec"));
  const hardSeconds = Number(window.getCookie("mnswprhardsec"));
  const vhardSeconds = Number(window.getCookie("mnswprvhardsec"));

  const gameBoard = [];

  const bombCount = {
    easy: 12,
    medium: 35,
    hard: 62,
    veryhard: 107,
  };

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

    showFlagOrQuestionMark() {
      if (this.flag) {
        getCellElem(this.x, this.y).textContent = "?";
        getCellElem(this.x, this.y).classList.remove("flag");
        getCellElem(this.x, this.y).classList.add("question-mark");
        this.flag = false;
        this.questionMark = true;
        updateBombsLeft(1);
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
        updateBombsLeft(-1);
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

  function updateBombsLeft(change) {
    bombsLeft += change;
    document.getElementById("bombsLeft").textContent = bombsLeft;
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
    if (difficulty === 10) {
      if (timeSeconds < easySeconds || easySeconds === 0) {
        window.setCookie("mnswpreasy", time, 30);
        window.setCookie("mnswpreasysec", timeSeconds, 30);
      }
    } else if (difficulty === 15) {
      if (timeSeconds < medSeconds || medSeconds === 0) {
        window.setCookie("mnswprmed", time, 30);
        window.setCookie("mnswprmedsec", timeSeconds, 30);
      }
    } else if (difficulty === 20) {
      if (timeSeconds < hardSeconds || hardSeconds === 0) {
        window.setCookie("mnswprhard", time, 30);
        window.setCookie("mnswprhardsec", timeSeconds, 30);
      }
    } else if (difficulty === 30) {
      if (timeSeconds < vhardSeconds || vhardSeconds === 0) {
        window.setCookie("mnswprvhard", time, 30);
        window.setCookie("mnswprvhardsec", timeSeconds, 30);
      }
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
    clearTimeout(runningTimer);
    window.modal(message, 1200);
  }

  function checkForWin() {
    const bombCount = getBombCount();
    const cellCount = Math.pow(difficulty, 2);
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
    getCellElem(x, y).classList.add("flipped");
    getCellElem(x, y).classList.add("empty");
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
      timerContainer.classList.remove("hide");
      timerStart();
      bombsLeft = getBombCount();
      updateBombsLeft(0);
      toggleDisplay();
      document.getElementById("btns").classList.add("extraMargin");
      window.setCookie("mnswprprevdif", difficulty, 30);
    }
  }

  function toggleHeader() {
    if (difficulty === 10)
      document
        .getElementById("header-tag")
        .classList.add("header-after-start-e");
    else if (difficulty === 15)
      document
        .getElementById("header-tag")
        .classList.add("header-after-start-m");
    else if (difficulty === 20)
      document
        .getElementById("header-tag")
        .classList.add("header-after-start-h");
    if (difficulty === 30)
      document
        .getElementById("header-tag")
        .classList.add("header-after-start-vh");
  }

  function toggleDisplay() {
    document.getElementById("buildGrid").classList.add("hide");
    document.getElementById("reload").classList.remove("hide");
    document
      .getElementById("header-tag")
      .classList.remove("header-before-start");
    toggleHeader();
    document.getElementById("gameBoard_UI").scrollIntoView();
  }

  function buildGridInternal() {
    difficulty = getDifficulty();
    for (let x = 0; x < difficulty; x++) {
      gameBoard.push([]);
      const col = document.createElement("div");
      col.id = "col-" + x;
      col.classList.add("col");
      document.getElementById("gameBoard_UI").appendChild(col);
      for (let y = 0; y < difficulty; y++) {
        const newCell = new Cell(x, y);
        gameBoard[x].push(newCell);
        gameBoard[x][y].setNeighbors();
        const cell = document.createElement("div");
        cell.id = getCellId(x, y);
        cell.classList.add("cell");
        col.appendChild(cell);
        cell.addEventListener("mouseup", (e) => newCell.handleClick(e));
        if (difficulty === 10) {
          cell.classList.add("easyCell");
        } else if (difficulty === 15) {
          cell.classList.add("medCell");
        } else if (difficulty === 20) {
          cell.classList.add("hardCell");
        } else if (difficulty === 30) {
          cell.classList.add("vhardCell");
        }
      }
    }
    placeBombs();
  }

  function placeBombs() {
    let bombsToPlace = getBombCount();
    while (bombsToPlace > 0) {
      let x, y;
      do {
        x = window.randomIntFromInterval(0, difficulty);
        y = window.randomIntFromInterval(0, difficulty);
      } while (!validPosition(x, y) || getCell(x, y).bomb);
      getCell(x, y).setBomb();
      bombsToPlace--;
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

  function initializeHighScore() {
    document.getElementById("easyBestScore").textContent = easyBestScoreOnLoad;
    document.getElementById("medBestScore").textContent = medBestScoreOnLoad;
    document.getElementById("hardBestScore").textContent = hardBestScoreOnLoad;
    document.getElementById(
      "vhardBestScore"
    ).textContent = vhardBestScoreOnLoad;
  }

  function initializeDificulty() {
    const prevDif = Number(window.getCookie("mnswprprevdif"));
    if (prevDif === 10) {
      document.getElementById("difEasy").setAttribute("selected", "selected");
    } else if (prevDif === 15) {
      document.getElementById("difMed").setAttribute("selected", "selected");
    } else if (prevDif === 20) {
      document.getElementById("difHard").setAttribute("selected", "selected");
    } else if (prevDif === 30) {
      document.getElementById("difvHard").setAttribute("selected", "selected");
    }
  }

  (function () {
    document.getElementById("buildGrid").addEventListener("click", buildGrid);
    checkBox.addEventListener("click", toggleTimer);
    const hideTimer = window.getCookie("hideSudokuTimer") === "Y";
    checkBox.checked = hideTimer;
    if (!hideTimer) {
      document.getElementById("highScores").classList.remove("hide");
    }
    toggleTimer();
    document.oncontextmenu = () => false;
    initializeHighScore();
    initializeDificulty();
  })();
})();
