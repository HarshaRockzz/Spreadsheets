# Google Sheets Mimic Web Application

## Overview
This project is a web application designed to closely replicate the user interface and core functionalities of Google Sheets. Developed as part of Assignment 1, it focuses on creating an intuitive spreadsheet tool with mathematical and data quality functions, robust data entry, and key UI interactions. The application is built using vanilla HTML, CSS, and JavaScript, with additional libraries for enhanced features like charts.

## Features

### 1. Spreadsheet Interface
- **Google Sheets UI Mimicry**: The application mirrors Google Sheets' visual design with a teal menu bar, gray toolbar, formula bar, grid layout, and sheet tabs. It uses a familiar color scheme and layout for usability.
- **Drag Functions**: Users can drag cell content or formulas to fill adjacent cells, with support for relative and absolute references.
- **Cell Dependencies**: Formulas automatically update when dependent cells change, ensuring real-time accuracy.
- **Cell Formatting**: Supports bold, italic, underline, font size, text color, alignment, and background color.
- **Row/Column Operations**: Allows adding, deleting, and resizing rows and columns via toolbar buttons and draggable headers.

### 2. Mathematical Functions
The following functions are implemented for calculations across cell ranges:
- **SUM**: Sums values in a range (e.g., `=SUM(A1:A5)`).
- **AVERAGE**: Calculates the average of a range.
- **MAX**: Returns the maximum value in a range.
- **MIN**: Returns the minimum value in a range.
- **COUNT**: Counts numeric values in a range.

### 3. Data Quality Functions
These functions enhance data consistency:
- **TRIM**: Removes leading/trailing whitespace (e.g., `=TRIM(A1)`).
- **UPPER**: Converts text to uppercase (e.g., `=UPPER(A1)`).
- **LOWER**: Converts text to lowercase (e.g., `=LOWER(A1)`).
- **REMOVE_DUPLICATES**: Removes duplicate values in a range (e.g., `=REMOVE_DUPLICATES(A1:A5)`).
- **FIND_AND_REPLACE**: Replaces text in a range (e.g., `=FIND_AND_REPLACE(A1:A5, "old", "new")`).

### 4. Data Entry and Validation
- **Data Types**: Supports numbers, text, and dates via contenteditable cells or the formula bar.
- **Validation**: Enforces rules (e.g., "number", "text", "date") to ensure data integrity, with alerts for invalid input.

### 5. Testing
- Users can input data and test functions directly in the grid, with results displayed in cells (e.g., `#ERROR` for invalid formulas).

### Bonus Features
- **Complex Formulas**: Supports basic arithmetic (e.g., `=A1+B1`) and absolute/relative references (e.g., `=$A$1+B1`).
- **Save/Load**: Persists spreadsheet data in localStorage for saving and loading.
- **Data Visualization**: Generates bar charts from grid data using Chart.js.
- **Additional Features**: Includes undo/redo (up to 20 steps), cell merging, comments, conditional formatting, and copy/paste.

## Data Structures
The application relies on the following data structures:
- **`gridData` (Object)**:
  - **Purpose**: Stores all cell data, including values, formulas, formatting, validation rules, comments, and conditional formatting.
  - **Structure**: Key-value pairs where keys are cell IDs (e.g., `"0-0"` for A1) and values are objects like `{ value: "5", formula: "=SUM(A1:A2)", format: { fontWeight: "bold" }, ... }`.
  - **Why**: An object provides fast lookups by cell ID, is flexible for storing multiple properties per cell, and integrates well with JSON for save/load functionality.
- **`history` (Array)**:
  - **Purpose**: Tracks states for undo/redo functionality.
  - **Structure**: Array of JSON strings representing the entire spreadsheet state (`rows`, `cols`, `gridData`) at each change, limited to 20 entries.
  - **Why**: An array allows sequential storage and easy navigation through history steps, with JSON.stringify for deep copying to avoid reference issues.

## Tech Stack
- **HTML**: Defines the structure of the UI, including the menu bar, toolbar, grid, and chart canvas.
- **CSS**: Styles the application to match Google Sheets’ look and feel, using flexbox and grid for layout, and custom properties for interactivity (e.g., resize handles).
- **JavaScript**: Implements all logic, including grid creation, formula evaluation, event handling, and data persistence.
- **Material Icons**: Provides scalable icons for the toolbar (e.g., undo, bold), chosen for its lightweight integration and familiarity.
- **Chart.js**: Adds data visualization (bar charts), selected for its simplicity and robust charting capabilities.

### Justification for Tech Stack
- **HTML/CSS/JS**: Core web technologies ensure browser compatibility, simplicity, and no dependency on heavy frameworks, aligning with a lightweight assignment scope.
- **Material Icons**: Enhances UI with recognizable icons, reducing development time for custom graphics.
- **Chart.js**: Offers an easy-to-use API for charts, fitting the bonus visualization requirement without overcomplicating the codebase.

## How to Run
1. Clone or download the repository.
2. Ensure you have an internet connection for CDN dependencies (Material Icons, Chart.js), or replace with local files.
3. Open `index.html` in a modern web browser (e.g., Chrome, Firefox).
4. Interact with the spreadsheet:
   - Enter data/formulas in cells or the formula bar (press Enter to apply).
   - Use toolbar buttons for formatting, row/column operations, and saving/loading.
   - Drag row/column headers to resize, or drag cells to fill ranges.
   - Test functions like `=SUM(A1:A5)` or `=UPPER(A1)`.

## Implementation Details
- **Grid Creation**: `createGrid()` dynamically builds the grid with resizable headers and cells, storing sizes in `gridData`.
- **Formula Evaluation**: `evaluateFormula()` parses and computes formulas, supporting absolute (`$A$1`) and relative (`A1`) references via `getCellCoords()` and `adjustFormula()`.
- **Resizing**: `startResize()` uses mouse events to adjust row/column sizes, persisting changes in `gridData`.
- **History**: `saveToHistory()` maintains an undo/redo stack, with `undo()` and `redo()` restoring states.
- **Persistence**: `saveSheet()` and `loadSheet()` use localStorage with error handling for robust data management.

## Non-Functional Considerations
To enhance the application beyond functional requirements, the following non-functional aspects have been addressed:

- **Security**:
  - **Input Sanitization**: The `eval()` function used in `evaluateFormula()` is wrapped in a try-catch block to prevent execution errors from malicious input. While this is a basic measure, it mitigates risks in a client-side context. For production, replacing `eval()` with a custom parser would further secure formula evaluation.
  - **LocalStorage Safety**: Data saved to localStorage is JSON-stringified without sensitive information, reducing exposure. Error handling in `saveSheet()` and `loadSheet()` ensures corrupted data doesn’t crash the app.
  - **Contenteditable Security**: Cells use `contentEditable` with validation checks (e.g., `validateInput()`) to prevent unexpected data types, adding a layer of input control.

- **Performance**:
  - **Efficient Rendering**: `createGrid()` minimizes DOM updates by building the grid in memory before appending, reducing reflows. However, for large grids (e.g., 100x100), performance could be optimized further with virtual scrolling.
  - **History Optimization**: The `history` array is capped at 20 entries to prevent memory bloat, with older states discarded using `shift()`.
  - **Formula Updates**: `updateDependencies()` recalculates only cells with formulas, avoiding unnecessary computations across the entire grid.

- **Scalability**:
  - **Grid Size**: The grid defaults to 100x100 but can scale by adjusting `rows` and `cols`. Resizing logic adapts to dynamic sizes stored in `gridData`.
  - **Modular Design**: Functions are separated (e.g., `formatCell()`, `evaluateFormula()`) for easy extension, such as adding new functions or features.
  - **Data Structure**: `gridData` as an object scales well for sparse data, avoiding the overhead of a full array for unused cells.

- **Usability Enhancements**:
  - **Error Feedback**: Clear error messages (e.g., `#ERROR`, validation alerts) improve user experience.
  - **Smooth Interactions**: CSS transitions (e.g., `transition: background 0.2s`) and responsive resizing enhance perceived performance.

## Evaluation Criteria Fulfillment
- **Fidelity to Google Sheets UI**: Closely matches layout, colors, and interactions (drag, resize, toolbar).
- **Functionality**: Implements all required features and most bonuses.
- **Accuracy**: Mathematical and data quality functions work correctly with range support.
- **Usability**: Intuitive controls and real-time feedback enhance user experience.
- **Code Quality**: Modular functions, clear separation of concerns (HTML structure, CSS style, JS logic), and error handling.
- **Bonus Features**: Fully implemented except for multi-sheet support (currently single-sheet).

## Potential Improvements
- **Security**: Replace `eval()` with a custom formula parser for safer execution.
- **Performance**: Implement virtual scrolling for larger grids to reduce DOM overhead.
- **Scalability**: Add multi-sheet support with dynamic tab creation.
- **Features**: Enhance chart customization (e.g., line charts, colors) and add keyboard shortcuts (e.g., Ctrl+Z for undo).

## Conclusion
This application delivers a functional, user-friendly spreadsheet tool that meets the assignment’s objectives while incorporating advanced features and non-functional considerations. It balances simplicity with extensibility, making it a strong foundation for production-grade enhancements.

---