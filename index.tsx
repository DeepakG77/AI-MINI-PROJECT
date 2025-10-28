import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

const App = () => {
    const [board, setBoard] = React.useState<number[][]>([]);
    const [initialBoard, setInitialBoard] = React.useState<number[][]>([]);
    const [difficulty, setDifficulty] = React.useState('easy');
    const [isSolving, setIsSolving] = React.useState(false);
    const [time, setTime] = React.useState(0);
    const [timerOn, setTimerOn] = React.useState(false);
    const [gameWon, setGameWon] = React.useState(false);
    const [errorCells, setErrorCells] = React.useState<[number, number][]>([]);

    // --- Timer Logic ---

    React.useEffect(() => {
        let interval: number | null = null;
        if (timerOn) {
            interval = window.setInterval(() => {
                setTime(prevTime => prevTime + 1);
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [timerOn]);

    const formatTime = (timeInSeconds: number) => {
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = timeInSeconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    // --- Sudoku Logic ---

    const isValid = (board: number[][], row: number, col: number, k: number) => {
        for (let i = 0; i < 9; i++) {
            if (board[row][i] === k) return false;
            if (board[i][col] === k) return false;
            const boxRow = 3 * Math.floor(row / 3);
            const boxCol = 3 * Math.floor(col / 3);
            if (board[boxRow + Math.floor(i / 3)][boxCol + i % 3] === k) return false;
        }
        return true;
    };
    
    const solveSudoku = (board: number[][]): boolean => {
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                if (board[i][j] === 0) {
                    for (let k = 1; k <= 9; k++) {
                        if (isValid(board, i, j, k)) {
                            board[i][j] = k;
                            if (solveSudoku(board)) {
                                return true;
                            } else {
                                board[i][j] = 0;
                            }
                        }
                    }
                    return false;
                }
            }
        }
        return true;
    };

    const generateFullBoard = (board: number[][]) => {
        const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                if (board[i][j] === 0) {
                    numbers.sort(() => Math.random() - 0.5); // Shuffle
                    for (const num of numbers) {
                        if (isValid(board, i, j, num)) {
                            board[i][j] = num;
                            if (generateFullBoard(board)) {
                                return true;
                            }
                            board[i][j] = 0;
                        }
                    }
                    return false;
                }
            }
        }
        return true;
    };
    
    const createPuzzle = (difficulty: string) => {
        setIsSolving(false);
        setGameWon(false);
        const newBoard: number[][] = Array(9).fill(0).map(() => Array(9).fill(0));
        generateFullBoard(newBoard);

        let holes = 0;
        if (difficulty === 'easy') holes = 35;
        else if (difficulty === 'medium') holes = 45;
        else if (difficulty === 'hard') holes = 55;
        
        while (holes > 0) {
            const row = Math.floor(Math.random() * 9);
            const col = Math.floor(Math.random() * 9);
            if (newBoard[row][col] !== 0) {
                newBoard[row][col] = 0;
                holes--;
            }
        }
        
        setBoard(JSON.parse(JSON.stringify(newBoard)));
        setInitialBoard(JSON.parse(JSON.stringify(newBoard)));
        setErrorCells([]);
        setTime(0);
        setTimerOn(true);
    };

    React.useEffect(() => {
        createPuzzle(difficulty);
    }, [difficulty]);

    // Check for user-input errors and highlight them
    React.useEffect(() => {
        if (isSolving || gameWon) {
            setErrorCells([]);
            return;
        }

        const newErrorSet = new Set<string>();

        // Check rows for duplicates
        for (let r = 0; r < 9; r++) {
            const seen = new Map<number, number[]>();
            for (let c = 0; c < 9; c++) {
                const val = board[r]?.[c];
                if (!val) continue;
                if (!seen.has(val)) seen.set(val, []);
                seen.get(val)!.push(c);
            }
            for (const cols of seen.values()) {
                if (cols.length > 1) {
                    cols.forEach(c => newErrorSet.add(`${r},${c}`));
                }
            }
        }

        // Check columns for duplicates
        for (let c = 0; c < 9; c++) {
            const seen = new Map<number, number[]>();
            for (let r = 0; r < 9; r++) {
                const val = board[r]?.[c];
                if (!val) continue;
                if (!seen.has(val)) seen.set(val, []);
                seen.get(val)!.push(r);
            }
            for (const rows of seen.values()) {
                if (rows.length > 1) {
                    rows.forEach(r => newErrorSet.add(`${r},${c}`));
                }
            }
        }
        
        // Check 3x3 boxes for duplicates
        for (let boxRow = 0; boxRow < 3; boxRow++) {
            for (let boxCol = 0; boxCol < 3; boxCol++) {
                const seen = new Map<number, [number, number][]>();
                for (let i = 0; i < 9; i++) {
                    const r = boxRow * 3 + Math.floor(i / 3);
                    const c = boxCol * 3 + (i % 3);
                    const val = board[r]?.[c];
                    if (!val) continue;
                    if (!seen.has(val)) seen.set(val, []);
                    seen.get(val)!.push([r, c]);
                }
                for (const coords of seen.values()) {
                    if (coords.length > 1) {
                        coords.forEach(([r, c]) => newErrorSet.add(`${r},${c}`));
                    }
                }
            }
        }

        const newErrors = Array.from(newErrorSet).map(s => s.split(',').map(Number) as [number, number]);
        setErrorCells(newErrors);

    }, [board, isSolving, gameWon]);
    
    // Check for win condition
    React.useEffect(() => {
        if (!board || board.length === 0 || isSolving || gameWon) return;

        const isBoardFull = !board.flat().includes(0);
        if (!isBoardFull) return;

        const isBoardValid = (b: number[][]) => {
            for(let r=0; r<9; r++) {
                for(let c=0; c<9; c++) {
                    const val = b[r][c];
                    const tempBoard = JSON.parse(JSON.stringify(b));
                    tempBoard[r][c] = 0;
                    if (!isValid(tempBoard, r, c, val)) {
                        return false;
                    }
                }
            }
            return true;
        }

        if (isBoardValid(board)) {
            setTimerOn(false);
            setGameWon(true);
        }

    }, [board, isSolving, gameWon]);
    

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, row: number, col: number) => {
        if (isSolving || gameWon) return;
        const value = parseInt(e.target.value, 10);
        const newBoard = JSON.parse(JSON.stringify(board));

        if (isNaN(value) || value < 1 || value > 9) {
            newBoard[row][col] = 0;
        } else {
            newBoard[row][col] = value;
        }
        setBoard(newBoard);
    };

    const handleSolve = () => {
        setTimerOn(false);
        setIsSolving(true);
        const newBoard = JSON.parse(JSON.stringify(board));
        solveSudoku(newBoard);
        setBoard(newBoard);
        setIsSolving(false);
    };

    const visualizeSolve = async () => {
        setTimerOn(false);
        setIsSolving(true);
        const newBoard = JSON.parse(JSON.stringify(initialBoard));

        const visualize = async (boardToSolve: number[][]): Promise<boolean> => {
            for (let i = 0; i < 9; i++) {
                for (let j = 0; j < 9; j++) {
                    if (boardToSolve[i][j] === 0) {
                        for (let k = 1; k <= 9; k++) {
                            if (isValid(boardToSolve, i, j, k)) {
                                boardToSolve[i][j] = k;
                                setBoard(JSON.parse(JSON.stringify(boardToSolve)));
                                await new Promise(resolve => setTimeout(resolve, 20));

                                if (await visualize(boardToSolve)) {
                                    return true;
                                } else {
                                    boardToSolve[i][j] = 0;
                                    setBoard(JSON.parse(JSON.stringify(boardToSolve)));
                                    await new Promise(resolve => setTimeout(resolve, 20));
                                }
                            }
                        }
                        return false;
                    }
                }
            }
            return true;
        }
        await visualize(newBoard);
        setIsSolving(false);
    };

    const handleClear = () => {
        setIsSolving(false);
        setGameWon(false);
        setBoard(JSON.parse(JSON.stringify(initialBoard)));
        setErrorCells([]);
        setTime(0);
        setTimerOn(false);
    };
    
    const renderCell = (row: number, col: number) => {
        const value = board[row]?.[col];
        const isInitial = initialBoard[row] && initialBoard[row][col] !== 0;
        const isError = errorCells.some(([r, c]) => r === row && c === col);

        return (
            <input
                key={`${row}-${col}`}
                type="number"
                min="1"
                max="9"
                value={value === 0 ? '' : value}
                onChange={(e) => handleInputChange(e, row, col)}
                readOnly={isInitial || isSolving || gameWon}
                className={`cell ${isInitial ? 'initial' : ''} ${isError ? 'error' : ''}`}
                aria-label={`Sudoku cell row ${row + 1} column ${col + 1}`}
            />
        );
    };

    return (
        <div className="container">

            <header>
                <h1>Interactive Sudoku Solver</h1>
            </header>
            {gameWon && <div className="win-message">Congratulations! You solved it in {formatTime(time)}!</div>}
            <div className="main-content">
                <div className={`board ${gameWon ? 'game-won' : ''}`}>
                    {board.length > 0 && board.map((row, rowIndex) =>
                        row.map((_, colIndex) => renderCell(rowIndex, colIndex))
                    )}
                </div>
                <div className="controls">
                    <div className="timer-container">
                        <span className="timer-label">Time</span>
                        <div className="timer">{formatTime(time)}</div>
                    </div>
                    <div className="difficulty-selector">
                        <label htmlFor="difficulty">Difficulty</label>
                        <select 
                            id="difficulty" 
                            value={difficulty} 
                            onChange={(e) => setDifficulty(e.target.value)}
                            disabled={isSolving}
                        >
                            <option value="easy">Easy</option>
                            <option value="medium">Medium</option>
                            <option value="hard">Hard</option>
                        </select>
                    </div>
                    <button onClick={() => createPuzzle(difficulty)} disabled={isSolving} className="btn secondary-btn">New Game</button>
                    <button onClick={handleSolve} disabled={isSolving || gameWon} className="btn primary-btn">Solve</button>
                    <button onClick={visualizeSolve} disabled={isSolving || gameWon} className="btn primary-btn">Visualize Solve</button>
                    <button onClick={handleClear} disabled={isSolving} className="btn secondary-btn">Clear</button>
                </div>
            </div>
            <section className="info-box">
                <h2>How Backtracking Works</h2>
                <p>This Sudoku solver uses a powerful AI search technique called <strong>Backtracking</strong>. It's a recursive, depth-first search algorithm.</p>
                <ol>
                    <li><strong>Find:</strong> It scans the grid to find the next empty cell.</li>
                    <li><strong>Try:</strong> It tries to place a valid number (1-9) in that cell. A number is valid if it doesn't already exist in the same row, column, or 3x3 sub-grid.</li>
                    <li><strong>Recurse:</strong> If a valid number is placed, it recursively calls itself to solve for the next empty cell.</li>
                    <li><strong>Backtrack:</strong> If it reaches a point where no valid number can be placed in a cell, it means a previous choice was wrong. It "backtracks" to the previous cell, erases its number, and tries the next valid number.</li>
                </ol>
                <p>The "Visualize Solve" button shows this process in action, highlighting cells as the algorithm tries numbers and backtracks from dead ends until the final solution is found.</p>
            </section>
        </div>
    );
};

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);