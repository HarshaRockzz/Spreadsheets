let rows = 100, cols = 100;
let gridData = {};
let selectedCell = null;
let history = [];
let historyIndex = -1;
let clipboard = null;

function createGrid() {
    const grid = document.getElementById('grid');
    grid.style.gridTemplateColumns = `repeat(${cols}, minmax(50px, auto))`;
    grid.innerHTML = '';

    const colHeaders = document.getElementById('col-headers');
    colHeaders.style.width = `${cols * 100}px`;
    colHeaders.innerHTML = '';
    for (let j = 0; j < cols; j++) {
        const header = document.createElement('div');
        header.className = 'header-cell';
        header.style.width = `${gridData[`colWidth-${j}`] || 100}px`;
        header.textContent = String.fromCharCode(65 + j);
        
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'resize-handle col';
        resizeHandle.onmousedown = (e) => startResize(e, 'col', j);
        header.appendChild(resizeHandle);
        
        colHeaders.appendChild(header);
    }

    const rowHeaders = document.getElementById('row-headers');
    rowHeaders.innerHTML = '';
    for (let i = 0; i < rows; i++) {
        const header = document.createElement('div');
        header.className = 'row-header';
        header.style.height = `${gridData[`rowHeight-${i}`] || 25}px`;
        header.textContent = i + 1;
        
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'resize-handle row';
        resizeHandle.onmousedown = (e) => startResize(e, 'row', i);
        header.appendChild(resizeHandle);
        
        rowHeaders.appendChild(header);
    }

    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.id = `${i}-${j}`;
            cell.style.width = `${gridData[`colWidth-${j}`] || 100}px`;
            cell.style.height = `${gridData[`rowHeight-${i}`] || 25}px`;
            cell.contentEditable = true;
            cell.onfocus = () => selectCell(i, j);
            cell.onblur = () => updateCellFromGrid(i, j);
            cell.onmousedown = (e) => startDragFill(e, i, j);
            cell.textContent = gridData[`${i}-${j}`]?.value || '';
            applyFormatting(cell, gridData[`${i}-${j}`]?.format);
            if (gridData[`${i}-${j}`]?.merged) cell.classList.add('merged');
            if (gridData[`${i}-${j}`]?.validation) cell.dataset.validation = JSON.stringify(gridData[`${i}-${j}`].validation);
            if (gridData[`${i}-${j}`]?.conditional) applyConditionalFormatting(cell, gridData[`${i}-${j}`].conditional);
            grid.appendChild(cell);
        }
    }
    saveToHistory();
}

function selectCell(row, col) {
    selectedCell = `${row}-${col}`;
    const formulaBar = document.getElementById('formula-bar');
    const cellRef = document.getElementById('cell-ref');
    cellRef.textContent = `${String.fromCharCode(65 + col)}${row + 1}`;
    formulaBar.value = gridData[selectedCell]?.formula || gridData[selectedCell]?.value || '';
}

function updateCell() {
    if (!selectedCell) return;
    const [row, col] = selectedCell.split('-').map(Number);
    const formulaBar = document.getElementById('formula-bar');
    let input = formulaBar.value.trim();
    let value = input;

    if (input.startsWith('=')) {
        value = evaluateFormula(input.slice(1));
        gridData[selectedCell] = { formula: input, value, format: gridData[selectedCell]?.format, validation: gridData[selectedCell]?.validation, conditional: gridData[selectedCell]?.conditional };
    } else {
        if (gridData[selectedCell]?.validation) {
            if (!validateInput(value, gridData[selectedCell].validation)) {
                alert('Invalid input for data validation rules.');
                return;
            }
        }
        gridData[selectedCell] = { value, format: gridData[selectedCell]?.format, validation: gridData[selectedCell]?.validation, conditional: gridData[selectedCell]?.conditional };
    }
    document.getElementById(selectedCell).textContent = value;
    applyConditionalFormatting(document.getElementById(selectedCell), gridData[selectedCell]?.conditional);
    updateDependencies();
    renderChart();
    saveToHistory();
}

function updateCellFromGrid(row, col) {
    const cell = document.getElementById(`${row}-${col}`);
    const value = cell.textContent.trim();
    if (value.startsWith('=')) {
        gridData[`${row}-${col}`] = { formula: value, value: evaluateFormula(value.slice(1)), format: gridData[`${row}-${col}`]?.format, validation: gridData[`${row}-${col}`]?.validation, conditional: gridData[`${row}-${col}`]?.conditional };
    } else {
        if (gridData[`${row}-${col}`]?.validation) {
            if (!validateInput(value, gridData[`${row}-${col}`].validation)) {
                alert('Invalid input for data validation rules.');
                cell.textContent = gridData[`${row}-${col}`]?.value || '';
                return;
            }
        }
        gridData[`${row}-${col}`] = { value, format: gridData[`${row}-${col}`]?.format, validation: gridData[`${row}-${col}`]?.validation, conditional: gridData[`${row}-${col}`]?.conditional };
    }
    cell.textContent = gridData[`${row}-${col}`].value;
    applyConditionalFormatting(cell, gridData[`${row}-${col}`]?.conditional);
    updateDependencies();
    renderChart();
    saveToHistory();
}

function evaluateFormula(formula) {
    formula = formula.toUpperCase();
    if (formula.startsWith('SUM')) return calculateRange(formula, (arr) => arr.reduce((a, b) => a + b, 0));
    if (formula.startsWith('AVERAGE')) return calculateRange(formula, (arr) => arr.reduce((a, b) => a + b, 0) / arr.length);
    if (formula.startsWith('MAX')) return calculateRange(formula, (arr) => Math.max(...arr));
    if (formula.startsWith('MIN')) return calculateRange(formula, (arr) => Math.min(...arr));
    if (formula.startsWith('COUNT')) return calculateRange(formula, (arr) => arr.filter(v => !isNaN(v)).length);
    if (formula.startsWith('TRIM')) return getCellValue(formula.match(/\((.+)\)/)[1]).trim();
    if (formula.startsWith('UPPER')) return getCellValue(formula.match(/\((.+)\)/)[1]).toUpperCase();
    if (formula.startsWith('LOWER')) return getCellValue(formula.match(/\((.+)\)/)[1]).toLowerCase();
    if (formula.startsWith('REMOVE_DUPLICATES')) return removeDuplicates(formula);
    if (formula.startsWith('FIND_AND_REPLACE')) return findAndReplace(formula);
    try {
        return eval(formula.replace(/\$?[A-Z]+\$?\d+/g, (match) => getCellValue(match)));
    } catch (e) {
        return '#ERROR';
    }
}

function calculateRange(formula, fn) {
    const range = formula.match(/\((.+):(.+)\)/);
    if (!range) return '#ERROR';
    const [start, end] = [range[1], range[2]].map(getCellCoords);
    const values = [];
    for (let i = start.row; i <= end.row; i++) {
        for (let j = start.col; j <= end.col; j++) {
            values.push(Number(gridData[`${i}-${j}`]?.value) || 0);
        }
    }
    return fn(values);
}

function getCellCoords(ref) {
    const [, colPrefix, col, rowPrefix, row] = ref.match(/(\$?)([A-Z]+)(\$?)(\d+)/);
    return {
        row: Number(row) - 1,
        col: col.charCodeAt(0) - 65,
        absoluteRow: rowPrefix === '$',
        absoluteCol: colPrefix === '$'
    };
}

function getCellValue(ref) {
    const coords = getCellCoords(ref);
    const key = `${coords.row}-${coords.col}`;
    return gridData[key]?.value || 0;
}

function updateDependencies() {
    for (let key in gridData) {
        if (gridData[key].formula) {
            const value = evaluateFormula(gridData[key].formula.slice(1));
            gridData[key].value = value;
            document.getElementById(key).textContent = value;
            applyConditionalFormatting(document.getElementById(key), gridData[key]?.conditional);
        }
    }
}

function formatCell(type, value) {
    if (!selectedCell) return;
    const cell = document.getElementById(selectedCell);
    gridData[selectedCell] = gridData[selectedCell] || {};
    gridData[selectedCell].format = gridData[selectedCell].format || {};
    if (type === 'bold') gridData[selectedCell].format.fontWeight = gridData[selectedCell].format.fontWeight === 'bold' ? '' : 'bold';
    if (type === 'italic') gridData[selectedCell].format.fontStyle = gridData[selectedCell].format.fontStyle === 'italic' ? '' : 'italic';
    if (type === 'underline') gridData[selectedCell].format.textDecoration = gridData[selectedCell].format.textDecoration === 'underline' ? '' : 'underline';
    if (type === 'fontSize') gridData[selectedCell].format.fontSize = `${value}px`;
    if (type === 'color') gridData[selectedCell].format.color = value;
    if (type === 'align') gridData[selectedCell].format.textAlign = value;
    if (type === 'backgroundColor') {
        const color = prompt('Enter background color (hex or name):', '#ffffff');
        gridData[selectedCell].format.backgroundColor = color;
    }
    applyFormatting(cell, gridData[selectedCell].format);
    saveToHistory();
}

function applyFormatting(cell, format) {
    if (!format) return;
    cell.style.fontWeight = format.fontWeight || '';
    cell.style.fontStyle = format.fontStyle || '';
    cell.style.textDecoration = format.textDecoration || '';
    cell.style.fontSize = format.fontSize || '';
    cell.style.color = format.color || '';
    cell.style.textAlign = format.textAlign || 'left';
    cell.style.backgroundColor = format.backgroundColor || '';
}

function mergeCells() {
    if (!selectedCell) return;
    const [row, col] = selectedCell.split('-').map(Number);
    const range = prompt('Enter range to merge (e.g., A1:B2):');
    if (range) {
        const [start, end] = range.split(':').map(getCellCoords);
        for (let i = start.row; i <= end.row; i++) {
            for (let j = start.col; j <= end.col; j++) {
                gridData[`${i}-${j}`] = gridData[`${i}-${j}`] || {};
                gridData[`${i}-${j}`].merged = true;
            }
        }
        createGrid();
    }
    saveToHistory();
}

function addRow() { rows++; createGrid(); }
function deleteRow() { if (rows > 1) rows--; createGrid(); }
function addColumn() { cols++; createGrid(); }
function deleteColumn() { if (cols > 1) cols--; createGrid(); }

function saveSheet() {
    try {
        const sheetData = {
            rows,
            cols,
            gridData: JSON.parse(JSON.stringify(gridData))
        };
        localStorage.setItem('sheet', JSON.stringify(sheetData));
        alert('Sheet saved successfully!');
    } catch (error) {
        alert('Error saving sheet: ' + error.message);
    }
}

function loadSheet() {
    try {
        const savedData = localStorage.getItem('sheet');
        if (savedData) {
            const sheetData = JSON.parse(savedData);
            rows = sheetData.rows;
            cols = sheetData.cols;
            gridData = sheetData.gridData;
            createGrid();
            renderChart();
            alert('Sheet loaded successfully!');
        } else {
            alert('No saved sheet found.');
        }
    } catch (error) {
        alert('Error loading sheet: ' + error.message);
        rows = 10;
        cols = 10;
        gridData = {};
        createGrid();
    }
}

function renderChart() {
    const ctx = document.getElementById('chart').getContext('2d');
    const data = Object.values(gridData).map(d => Number(d.value) || 0).filter(v => v);
    new Chart(ctx, {
        type: 'bar',
        data: { labels: Object.keys(gridData).map(k => k.split('-').map(n => String.fromCharCode(65 + Number(n[1])) + (Number(n[0]) + 1)).join('')), datasets: [{ label: 'Values', data, backgroundColor: '#1a73e8' }] },
        options: { scales: { y: { beginAtZero: true } } }
    });
}

function removeDuplicates(formula) {
    const range = formula.match(/\((.+):(.+)\)/);
    const [start, end] = [range[1], range[2]].map(getCellCoords);
    const seen = new Set();
    for (let i = start.row; i <= end.row; i++) {
        for (let j = start.col; j <= end.col; j++) {
            const key = `${i}-${j}`;
            const value = gridData[key]?.value || '';
            if (seen.has(value)) delete gridData[key];
            else seen.add(value);
        }
    }
    createGrid();
    return 'Done';
}

function findAndReplace(formula) {
    const [range, find, replace] = formula.match(/\((.+):(.+),\s*"(.+)",\s*"(.+)"\)/).slice(1);
    const [start, end] = [range, range[1]].map(getCellCoords);
    for (let i = start.row; i <= end.row; i++) {
        for (let j = start.col; j <= end.col; j++) {
            const key = `${i}-${j}`;
            if (gridData[key]?.value) {
                gridData[key].value = gridData[key].value.replace(find, replace);
                document.getElementById(key).textContent = gridData[key].value;
            }
        }
    }
    return 'Done';
}

function saveToHistory() {
    history = history.slice(0, historyIndex + 1);
    history.push(JSON.stringify({ rows, cols, gridData }));
    historyIndex++;
    if (history.length > 20) history.shift();
}

function undo() {
    if (historyIndex > 0) {
        historyIndex--;
        const state = JSON.parse(history[historyIndex]);
        rows = state.rows;
        cols = state.cols;
        gridData = state.gridData;
        createGrid();
        renderChart();
    }
}

function redo() {
    if (historyIndex < history.length - 1) {
        historyIndex++;
        const state = JSON.parse(history[historyIndex]);
        rows = state.rows;
        cols = state.cols;
        gridData = state.gridData;
        createGrid();
        renderChart();
    }
}

function addComment() {
    if (!selectedCell) return;
    const comment = prompt('Enter comment:');
    if (comment) {
        gridData[selectedCell] = gridData[selectedCell] || {};
        gridData[selectedCell].comment = comment;
        alert(`Comment added to ${selectedCell}: ${comment}`);
    }
}

function addDataValidation() {
    if (!selectedCell) return;
    const rules = prompt('Enter validation rules (e.g., "number", "text", "date"):');
    if (rules) {
        gridData[selectedCell] = gridData[selectedCell] || {};
        gridData[selectedCell].validation = { type: rules };
        document.getElementById(selectedCell).dataset.validation = JSON.stringify(gridData[selectedCell].validation);
    }
}

function validateInput(value, rules) {
    if (!rules) return true;
    switch (rules.type) {
        case 'number': return !isNaN(value) && value !== '';
        case 'text': return typeof value === 'string';
        case 'date': return !isNaN(Date.parse(value));
        default: return true;
    }
}

function addConditionalFormatting() {
    if (!selectedCell) return;
    const rule = prompt('Enter conditional rule (e.g., "value > 10, red"):');
    if (rule) {
        const [condition, color] = rule.split(', ');
        gridData[selectedCell] = gridData[selectedCell] || {};
        gridData[selectedCell].conditional = { condition, color: color.trim() };
        applyConditionalFormatting(document.getElementById(selectedCell), gridData[selectedCell].conditional);
    }
}

function applyConditionalFormatting(cell, rule) {
    if (!rule) return;
    const value = Number(gridData[cell.id]?.value) || 0;
    const [condition, color] = rule.condition.split(' ');
    switch (condition) {
        case '>':
            if (value > Number(rule.color)) cell.style.backgroundColor = rule.color;
            else cell.style.backgroundColor = '';
            break;
        case '<':
            if (value < Number(rule.color)) cell.style.backgroundColor = rule.color;
            else cell.style.backgroundColor = '';
            break;
        case '=':
            if (value === Number(rule.color)) cell.style.backgroundColor = rule.color;
            else cell.style.backgroundColor = '';
            break;
    }
}

function startDragFill(e, startRow, startCol) {
    if (e.button !== 0) return;
    let isDragging = true;
    let dragStart = { row: startRow, col: startCol };
    const cell = document.getElementById(`${startRow}-${startCol}`);
    const value = cell.textContent.trim();

    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', () => {
        isDragging = false;
        document.removeEventListener('mousemove', handleDrag);
    });

    function handleDrag(e) {
        if (!isDragging) return;
        const rect = grid.getBoundingClientRect();
        const col = Math.floor((e.clientX - rect.left - 30) / 100);
        const row = Math.floor((e.clientY - rect.top - 30) / 25);
        if (col >= 0 && col < cols && row >= 0 && row < rows) {
            fillRange(dragStart, { row, col }, value);
        }
    }
}

function fillRange(start, end, value) {
    for (let i = Math.min(start.row, end.row); i <= Math.max(start.row, end.row); i++) {
        for (let j = Math.min(start.col, end.col); j <= Math.max(start.col, end.col); j++) {
            const key = `${i}-${j}`;
            let adjustedValue = value;
            if (value.startsWith('=')) {
                adjustedValue = adjustFormula(value, start, { row: i, col: j });
            }
            gridData[key] = { value: adjustedValue };
            document.getElementById(key).textContent = adjustedValue.startsWith('=') ? evaluateFormula(adjustedValue.slice(1)) : adjustedValue;
        }
    }
    updateDependencies();
    renderChart();
    saveToHistory();
}

function adjustFormula(formula, start, current) {
    return formula.replace(/\$?[A-Z]+\$?\d+/g, (ref) => {
        const coords = getCellCoords(ref);
        if (coords.absoluteRow && coords.absoluteCol) return ref;
        let newCol = coords.col;
        let newRow = coords.row;
        if (!coords.absoluteCol) newCol += current.col - start.col;
        if (!coords.absoluteRow) newRow += current.row - start.row;
        return `${coords.absoluteCol ? '$' : ''}${String.fromCharCode(65 + newCol)}${coords.absoluteRow ? '$' : ''}${newRow + 1}`;
    });
}

function startResize(e, type, index) {
    e.preventDefault();
    const isColumn = type === 'col';
    const header = isColumn ? document.querySelectorAll(`.header-cell`)[index] : document.querySelectorAll(`.row-header`)[index];
    const initialSize = isColumn ? header.offsetWidth : header.offsetHeight;
    const initialX = e.clientX;
    const initialY = e.clientY;

    function onMouseMove(e) {
        const delta = isColumn ? e.clientX - initialX : e.clientY - initialY;
        const newSize = Math.max(20, initialSize + delta);
        if (isColumn) {
            header.style.width = `${newSize}px`;
            document.querySelectorAll(`.cell[id*="-${index}"]`).forEach(cell => cell.style.width = `${newSize}px`);
            gridData[`colWidth-${index}`] = newSize;
        } else {
            header.style.height = `${newSize}px`;
            document.querySelectorAll(`.cell[id^="${index}-"]`).forEach(cell => cell.style.height = `${newSize}px`);
            gridData[`rowHeight-${index}`] = newSize;
        }
    }

    function onMouseUp() {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        saveToHistory();
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
}

document.addEventListener('copy', (e) => {
    if (selectedCell) {
        clipboard = gridData[selectedCell]?.value || document.getElementById(selectedCell).textContent;
        e.preventDefault();
    }
});

document.addEventListener('paste', (e) => {
    if (selectedCell && clipboard) {
        gridData[selectedCell] = { value: clipboard, format: gridData[selectedCell]?.format, validation: gridData[selectedCell]?.validation, conditional: gridData[selectedCell]?.conditional };
        document.getElementById(selectedCell).textContent = clipboard;
        applyConditionalFormatting(document.getElementById(selectedCell), gridData[selectedCell]?.conditional);
        updateDependencies();
        renderChart();
        saveToHistory();
        e.preventDefault();
    }
});

createGrid();