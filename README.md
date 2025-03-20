# Minesweeper Web Game

A browser-based implementation of the classic Minesweeper game. This project offers multiple difficulty levels, a running timer, cookie-based high score tracking, and responsive design—providing a seamless experience on desktop and mobile devices.

---

## Features

• Play classic Minesweeper with four difficulty settings: Easy, Medium, Hard, and Very Hard.  
• Interactive interface with a timer and bomb counter.  
• Visual feedback for game events (e.g., explosions, flagged cells, correct/incorrect selections).  
• High score tracking stored via cookies.  
• Option to hide or show the timer during gameplay.  
• Two versions of scripts and styles (minified and unminified) for optimized performance and easier debugging.

---

## Installation

1. **Download or Clone the Repository**  
   Clone the repo using:
   • Git: `git clone https://github.com/ShaneMarusczak/Minesweeper.git`  
   Or download the source as a ZIP and extract it.

2. **Directory Structure**  
   The project is organized as follows:
   • `index.html` – Main entry point of the game.  
   • `css/` – Contains both `style.css` and `style.min.css` for styling.  
   • `js/` – Contains `mineSweeper.js` (readable version) and `mineSweeper.min.js` (optimized version) for game logic.  
   • `images/` – Icons and images for bombs, explosions, houses, GitHub, etc.

3. **Dependencies**  
   • The game loads custom fonts from Google Fonts (Roboto Mono and Roboto).  
   • No additional installations or server setups are required—the project runs purely in the browser.

Simply open `index.html` in your web browser to start playing.

---

## Usage Guide

1. **Launch the Game**  
   Open `index.html` in your preferred browser.

2. **Select Difficulty**  
   Use the dropdown labeled *Difficulty* to choose among Easy (10x10 grid), Medium (15x15), Hard (20x20), or Very Hard (30x30).

3. **Start Game**  
   Click the "Play" button. The game board will generate based on your selected difficulty, the timer will start, and your bomb count will be displayed.

4. **Gameplay**  
   • **Left-Click:** Reveal a cell.  
  – Revealing a bomb ends the game with a loss.  
  – Revealing a number shows how many bombs are adjacent.  
  – Empty cells auto-expand their neighboring safe cells.
   
   • **Right-Click:** Cycle through flag (to mark a cell as having a bomb), question-mark (if unsure), or clear any marks.
   
5. **Game End**  
   When you win or lose, a modal message will display ("You Win!" or "You Lose!") and high scores will update if a new best time is achieved.

6. **Additional Options**  
   • Use the "Start Over" button to restart the game after completion.  
   • Toggle the timer’s visibility using the checkbox provided.

---

## File and Structure Overview

• **index.html:**  
  – Sets up the document structure including the header, game board, buttons, and forms.  
  – Imports stylesheets and JavaScript files.

• **css/style.css & css/style.min.css:**  
  – Define the look and feel of the game, including layout, animations, and responsive behavior.

• **js/mineSweeper.js & js/mineSweeper.min.js:**  
  – Contain the main game logic (grid creation, bomb placement, cell interactions) and timer functionality.  
  – The minified version is optimized for faster load times.

• **images/:**  
  – Contains visual assets such as the bomb icon, explosion image, flag icon, and navigation icons.

---

## Configuration Details

• **Difficulty Setting:**  
  – The selected difficulty (grid size) is stored in cookies under `mnswprprevdif` for a persistent user experience.

• **High Scores and Timing:**  
  – The best times per difficulty are saved via cookies (`mnswpreasy`, `mnswprmed`, `mnswprhard`, `mnswprvhard` and corresponding seconds cookies).  
  – Timer visibility preference is saved with cookies (e.g., `hideSudokuTimer`).

• **Meta Settings in index.html:**  
  – Uses standard meta tags for responsive design and cross-browser compatibility.

Review the cookie-setting code in JavaScript files for further customizations if needed.

---

## Contribution Guidelines

Contributions are welcome! To contribute:

1. Fork the repository and create your feature branch.  
2. Make your changes and ensure code clarity, consistency, and adequate commenting.  
3. Open a pull request with a detailed description of your changes.  

See the [CONTRIBUTING.md](CONTRIBUTING.md) file (if available) for complete guidelines.

---

## License

This project is licensed under terms described in the [LICENSE](LICENSE) file. By contributing or modifying this code, you agree to abide by these licensing terms.

---

Enjoy playing Minesweeper or feel free to contribute enhancements to create an even better gaming experience!
