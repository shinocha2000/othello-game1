const BOARD_SIZE = 8;
const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;

let board = [];
let currentPlayer = BLACK;
let humanColor = BLACK;
let gameActive = true;
let isCpuThinking = false;

const boardElement = document.getElementById('board');
const statusElement = document.getElementById('status');
const humanScoreElement = document.getElementById('human-score');
const cpuScoreElement = document.getElementById('cpu-score');
const humanLabel = document.getElementById('human-label');
const cpuLabel = document.getElementById('cpu-label');
const cpuEmotion = document.getElementById('cpu-emotion');
const turnIndicator = document.getElementById('current-turn');
const resetBtn = document.getElementById('reset-btn');

const CPU_FEELINGS = {
    thinking: ["えーっと、どこにしようかな？", "ちょっとまってね！ ✨", "うーん、なやむなぁ...", "いいところ、あるかなー？"],
    happy: ["やったぁ！角っこゲット！", "たくさんひっくり返したよ！", "えへへ、いいかんじ！", "たのしーい！ ✨"],
    sad: ["あわわ...とられちゃった...", "きみ、とっても強いね！", "もういっかい考え直さなきゃ...", "負けないぞー！"],
    normal: ["きみのばんだよ！ ✨", "いい手だね！", "つぎはどこかなー？", "なるほどね！"],
    victory: ["やったー！ぼくの勝ち！ 👑", "いい勝負だったね！", "まほうのおかげかな？ ✨"],
    defeat: ["きみこそ、まじかるマスターだね！ 🏆", "つぎは負けないよ！", "あぁー、いい試合だった！"]
};

function initGame() {
    board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(EMPTY));

    // Initial setup
    board[3][3] = WHITE;
    board[3][4] = BLACK;
    board[4][3] = BLACK;
    board[4][4] = WHITE;

    currentPlayer = BLACK;
    gameActive = true;
    isCpuThinking = false;

    boardElement.innerHTML = ''; // Clear board only once on reset
    renderBoard(true); // true means initial setup, no animation
    humanColor = Math.random() < 0.5 ? BLACK : WHITE;

    // Update labels
    humanLabel.textContent = humanColor === BLACK ? "あなた (黒)" : "あなた (白)";
    cpuLabel.textContent = humanColor === BLACK ? "CPU (白)" : "CPU (黒)";

    setEmotion("魔法のデュエル、スタート！ ✨");

    updateStatus();

    // If CPU is Black, let it move first
    if (humanColor === WHITE) {
        isCpuThinking = true;
        setTimeout(cpuPlay, 1000);
    }
}

function setEmotion(text) {
    if (!cpuEmotion) return;
    cpuEmotion.textContent = text;
}

function getRandomFeeling(type) {
    const feelings = CPU_FEELINGS[type];
    return feelings[Math.floor(Math.random() * feelings.length)];
}

function renderBoard(isInitial = false) {
    const validMoves = getValidMoves(currentPlayer);

    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            // Find or create cell
            let cell = boardElement.querySelector(`[data-row="${r}"][data-col="${c}"]`);
            if (!cell) {
                cell = document.createElement('div');
                cell.classList.add('cell');
                cell.dataset.row = r;
                cell.dataset.col = c;
                cell.addEventListener('click', () => handleCellClick(r, c));
                boardElement.appendChild(cell);
            }

            // Update valid move indicator
            const isValid = validMoves.some(m => m.r === r && m.c === c);
            if (isValid && gameActive && currentPlayer === humanColor) {
                cell.classList.add('valid-move');
            } else {
                cell.classList.remove('valid-move');
            }

            // Update pieces
            if (board[r][c] !== EMPTY) {
                let piece = cell.querySelector('.piece');
                if (!piece) {
                    piece = document.createElement('div');
                    piece.classList.add('piece');
                    // New pieces should not slide/animate in from nowhere if isInitial
                    if (isInitial) piece.classList.add('no-anim');

                    const front = document.createElement('div');
                    front.classList.add('piece-front');
                    const back = document.createElement('div');
                    back.classList.add('piece-back');
                    piece.appendChild(front);
                    piece.appendChild(back);
                    cell.appendChild(piece);

                    // Force initial state based on board color
                    if (board[r][c] === WHITE) {
                        piece.classList.add('is-white');
                    }
                } else {
                    // This is an existing piece, only update class if color changed
                    // Removing no-anim if it was there from start
                    piece.classList.remove('no-anim');

                    const currentlyWhite = piece.classList.contains('is-white');
                    const shouldBeWhite = board[r][c] === WHITE;

                    if (currentlyWhite !== shouldBeWhite) {
                        if (shouldBeWhite) {
                            piece.classList.add('is-white');
                        } else {
                            piece.classList.remove('is-white');
                        }
                    }
                }
            } else {
                cell.innerHTML = '';
            }
        }
    }
}

function handleCellClick(r, c) {
    if (!gameActive || isCpuThinking || currentPlayer !== humanColor) return;

    executeMove(r, c);
}

async function executeMove(r, c) {
    const flipPieces = getFlips(r, c, currentPlayer);

    if (board[r][c] === EMPTY && flipPieces.length > 0) {
        board[r][c] = currentPlayer;
        renderBoard(); // Show the placed piece first

        // Sequential flip animation
        for (let i = 0; i < flipPieces.length; i++) {
            const p = flipPieces[i];
            await new Promise(resolve => setTimeout(resolve, 150)); // Delay between each piece
            board[p.r][p.c] = currentPlayer;
            renderBoard();
        }

        // Wait for all flip animations to complete
        await new Promise(resolve => setTimeout(resolve, 600));

        currentPlayer = (currentPlayer === BLACK) ? WHITE : BLACK;

        // Check if next player has moves
        if (getValidMoves(currentPlayer).length === 0) {
            currentPlayer = (currentPlayer === BLACK) ? WHITE : BLACK;
            // Check if both have no moves
            if (getValidMoves(currentPlayer).length === 0) {
                gameActive = false;
            } else {
                updateStatus();
                renderBoard();

                // If turn passed back to CPU
                if (currentPlayer !== humanColor && gameActive) {
                    isCpuThinking = true;
                    setTimeout(cpuPlay, 1000);
                }
                return;
            }
        }

        renderBoard();
        updateStatus();

        if (gameActive && currentPlayer !== humanColor) {
            isCpuThinking = true;
            updateStatus();
            setTimeout(cpuPlay, 1000);
        }
    }
}

function cpuPlay() {
    if (!gameActive) return;

    isCpuThinking = true;
    updateStatus();
    setEmotion(getRandomFeeling('thinking'));

    const validMoves = getValidMoves(currentPlayer);

    if (validMoves.length === 0) {
        isCpuThinking = false;
        return;
    }

    const corners = [
        { r: 0, c: 0 }, { r: 0, c: BOARD_SIZE - 1 },
        { r: BOARD_SIZE - 1, c: 0 }, { r: BOARD_SIZE - 1, c: BOARD_SIZE - 1 }
    ];

    const availableCorners = validMoves.filter(m =>
        corners.some(c => c.r === m.r && m.c === c.c)
    );

    let chosenMove;
    let grabbedCorner = false;

    if (availableCorners.length > 0) {
        chosenMove = availableCorners[Math.floor(Math.random() * availableCorners.length)];
        grabbedCorner = true;
    } else {
        let maxFlips = -1;
        let bestMoves = [];

        validMoves.forEach(m => {
            const flips = getFlips(m.r, m.c, currentPlayer).length;
            if (flips > maxFlips) {
                maxFlips = flips;
                bestMoves = [m];
            } else if (flips === maxFlips) {
                bestMoves.push(m);
            }
        });

        chosenMove = bestMoves[Math.floor(Math.random() * bestMoves.length)];
    }

    const flipsCount = getFlips(chosenMove.r, chosenMove.c, currentPlayer).length;

    setTimeout(() => {
        executeMove(chosenMove.r, chosenMove.c);
        isCpuThinking = false;

        // Post-move reaction
        if (grabbedCorner || flipsCount > 5) {
            setEmotion(getRandomFeeling('happy'));
        } else {
            setEmotion(getRandomFeeling('normal'));
        }

        updateStatus();
    }, 800);
}

function getFlips(r, c, player) {
    if (board[r][c] !== EMPTY) return [];

    let totalFlips = [];
    const opponent = (player === BLACK) ? WHITE : BLACK;

    const directions = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1], [0, 1],
        [1, -1], [1, 0], [1, 1]
    ];

    for (const [dr, dc] of directions) {
        let currentR = r + dr;
        let currentC = c + dc;
        let potentialFlips = [];

        while (
            currentR >= 0 && currentR < BOARD_SIZE &&
            currentC >= 0 && currentC < BOARD_SIZE &&
            board[currentR][currentC] === opponent
        ) {
            potentialFlips.push({ r: currentR, c: currentC });
            currentR += dr;
            currentC += dc;
        }

        if (
            currentR >= 0 && currentR < BOARD_SIZE &&
            currentC >= 0 && currentC < BOARD_SIZE &&
            board[currentR][currentC] === player &&
            potentialFlips.length > 0
        ) {
            totalFlips = totalFlips.concat(potentialFlips);
        }
    }

    return totalFlips;
}

function getValidMoves(player) {
    const moves = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (getFlips(r, c, player).length > 0) {
                moves.push({ r, c });
            }
        }
    }
    return moves;
}

function updateStatus() {
    let blackCount = 0;
    let whiteCount = 0;

    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (board[r][c] === BLACK) blackCount++;
            if (board[r][c] === WHITE) whiteCount++;
        }
    }

    const humanScore = humanColor === BLACK ? blackCount : whiteCount;
    const cpuScore = humanColor === BLACK ? whiteCount : blackCount;

    humanScoreElement.textContent = humanScore;
    cpuScoreElement.textContent = cpuScore;

    if (gameActive) {
        const isHumanTurn = currentPlayer === humanColor;
        const colorText = currentPlayer === BLACK ? "黒" : "白";
        statusElement.textContent = isHumanTurn ? `あなたのばん！ (${colorText})` : `CPUが考え中... (${colorText})`;
        turnIndicator.className = `current-turn-piece ${currentPlayer === BLACK ? 'black' : 'white'}`;

        const cpuScore = humanColor === BLACK ? whiteCount : blackCount;
        const humanScore = humanColor === BLACK ? blackCount : whiteCount;

        if (!isCpuThinking && !isHumanTurn) {
            // Reaction based on score if it's the start of CPU turn
            if (cpuScore < humanScore - 10) {
                setEmotion(getRandomFeeling('sad'));
            }
        }
    } else {
        let result = "ひきわけ！";
        if (blackCount > whiteCount) {
            if (humanColor === BLACK) {
                result = "あなたの勝ち！ 🏆";
                setEmotion(getRandomFeeling('defeat'));
            } else {
                result = "CPUの勝ち！ ✨";
                setEmotion(getRandomFeeling('victory'));
            }
        } else if (whiteCount > blackCount) {
            if (humanColor === WHITE) {
                result = "あなたの勝ち！ 🏆";
                setEmotion(getRandomFeeling('defeat'));
            } else {
                result = "CPUの勝ち！ ✨";
                setEmotion(getRandomFeeling('victory'));
            }
        }
        statusElement.textContent = result;
        statusElement.style.color = 'var(--accent-pink)';
    }
}

resetBtn.addEventListener('click', initGame);

// Load game
initGame();
