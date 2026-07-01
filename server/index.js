const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { registerUser, loginUser, incrementWins, getTopPlayers, getAllUsers, deleteUser, resetPassword, resetAllWins } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../client/dist')));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // allow all LAN connections
        methods: ["GET", "POST"]
    }
});

app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
        
        const userId = await registerUser(username, password);
        res.json({ success: true, userId, username });
    } catch (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Username already exists' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
        
        const user = await loginUser(username, password);
        if (user) {
            res.json({ success: true, userId: user.id, username: user.username });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put('/api/users/forgot-password', async (req, res) => {
    try {
        const { username, newPassword } = req.body;
        if (!username || !newPassword) {
            return res.status(400).json({ error: 'Username and new password are required' });
        }
        await resetPassword(username, newPassword);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

// Admin routes
app.post('/api/admin/verify', (req, res) => {
    const { username } = req.body;
    if (username === 'admin') {
        res.json({ success: true });
    } else {
        res.status(403).json({ error: 'Not authorized' });
    }
});

app.get('/api/admin/users', async (req, res) => {
    try {
        const users = await getAllUsers();
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

app.delete('/api/admin/users/:username', async (req, res) => {
    try {
        const username = req.params.username;
        if (username === 'admin') return res.status(403).json({ error: 'Cannot delete admin' });
        await deleteUser(username);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

app.put('/api/admin/users/reset-scores', async (req, res) => {
    try {
        await resetAllWins();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to reset scores' });
    }
});

app.put('/api/admin/users/:username/password', async (req, res) => {
    try {
        const username = req.params.username;
        const { newPassword } = req.body;
        if (!newPassword) return res.status(400).json({ error: 'New password required' });
        await resetPassword(username, newPassword);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

// Game state
const games = {}; // roomId -> { players: [{id, username, position, color}], turnIndex: 0, status: 'waiting'|'playing'|'finished' }
const colors = ['#FF5733', '#33FF57', '#3357FF', '#F3FF33', '#FF33F3', '#33FFFF', '#FFAA33', '#AA33FF', '#33FFAA', '#FFFFFF'];

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    socket.on('join_lobby', ({ username }) => {
        socket.username = username;
        socket.emit('lobby_update', getWaitingGames());
    });

    socket.on('request_lobby_update', () => {
        socket.emit('lobby_update', getWaitingGames());
    });

    socket.on('request_top_players', async () => {
        try {
            const topPlayers = await getTopPlayers();
            socket.emit('top_players_update', topPlayers);
        } catch (err) {
            console.error(err);
        }
    });

    socket.on('create_game_with_bot', () => {
        const roomId = 'game_' + Math.random().toString(36).substr(2, 9);
        games[roomId] = {
            players: [
                { id: socket.id, username: socket.username, position: 0, color: colors[0] },
                { id: 'bot', username: 'PC (Bot)', position: 0, color: colors[1] }
            ],
            turnIndex: 0,
            status: 'playing',
            isAnimating: false,
            isBotGame: true
        };
        socket.join(roomId);
        socket.roomId = roomId;
        socket.emit('game_created', { roomId, gameState: games[roomId] });
        io.to(roomId).emit('game_update', games[roomId]);
        io.emit('lobby_update', getWaitingGames());
    });

    socket.on('create_game', () => {
        const roomId = 'game_' + Math.random().toString(36).substr(2, 9);
        games[roomId] = {
            players: [{ id: socket.id, username: socket.username, position: 0, color: colors[0] }],
            turnIndex: 0,
            status: 'waiting',
            isAnimating: false
        };
        socket.join(roomId);
        socket.roomId = roomId;
        socket.emit('game_created', { roomId, gameState: games[roomId] });
        io.emit('lobby_update', getWaitingGames());
    });

    socket.on('start_game', () => {
        const roomId = socket.roomId;
        const game = games[roomId];
        if (game && game.players.length > 1 && game.players[0].id === socket.id) {
            game.status = 'playing';
            io.to(roomId).emit('game_update', game);
            io.emit('lobby_update', getWaitingGames());
        }
    });

    socket.on('join_game', ({ roomId }) => {
        const game = games[roomId];
        if (game && game.status === 'waiting' && game.players.length < 10) {
            const playerColor = colors[game.players.length];
            game.players.push({ id: socket.id, username: socket.username, position: 0, color: playerColor });
            socket.join(roomId);
            socket.roomId = roomId;
            
            io.to(roomId).emit('game_update', game);
            io.emit('lobby_update', getWaitingGames());
        } else {
            socket.emit('error', 'Cannot join game (Room might be full up to 10 players)');
        }
    });

    function processRoll(roomId, playerId) {
        const game = games[roomId];
        if (game && game.status === 'playing' && !game.isAnimating) {
            const currentPlayer = game.players[game.turnIndex];
            if (currentPlayer.id === playerId) {
                const diceRoll = Math.floor(Math.random() * 6) + 1;
                game.isAnimating = true;
                
                io.to(roomId).emit('dice_rolled', { roll: diceRoll, player: currentPlayer.username });
                
                let targetPos = currentPlayer.position + diceRoll;
                if (targetPos > 100) targetPos = currentPlayer.position; // Exact roll needed to win

                // Check snakes and ladders
                const boardMap = {
                    43: 18, 40: 3, 27: 5, 28: 9, 29: 9, 54: 31, 66: 45, 89: 53, 95: 77, 99: 41, // Snakes
                    4: 25, 13: 46, 42: 63, 62: 81, 50: 69, 74: 92, 10: 12 // Ladders
                };
                
                let currentPos = currentPlayer.position;
                
                // Wait for 3s dice animation to finish before moving token
                setTimeout(() => {
                    const moveInterval = setInterval(() => {
                        if (currentPos < targetPos) {
                            currentPos++;
                            currentPlayer.position = currentPos;
                            io.to(roomId).emit('game_update', game);
                        } else {
                            clearInterval(moveInterval);
                            
                            if (diceRoll !== 6 && boardMap[currentPos]) {
                                if (boardMap[currentPos] < currentPos) {
                                    // It's a snake!
                                    currentPlayer.snakeBites = (currentPlayer.snakeBites || 0) + 1;
                                    
                                    io.to(roomId).emit('snake_bitten', { position: currentPos });
                                    setTimeout(() => {
                                        if (currentPlayer.snakeBites === 6) {
                                            currentPlayer.position = 1; // 6th snake drop drops to 1!
                                            currentPlayer.snakeBites = 0; // Reset counter
                                        } else {
                                            currentPlayer.position = boardMap[currentPos];
                                        }
                                        io.to(roomId).emit('game_update', game);
                                        finishTurn();
                                    }, 1500); // Wait longer for blood splash
                                } else {
                                    // It's a ladder!
                                    setTimeout(() => {
                                        currentPlayer.position = boardMap[currentPos];
                                        io.to(roomId).emit('game_update', game);
                                        finishTurn();
                                    }, 800); // Normal pause before sliding up
                                }
                            } else {
                                finishTurn();
                            }
                        }
                    }, 600); // 600ms per square
                }, 3000);
                
                function finishTurn() {
                    if (currentPlayer.position === 100) {
                        game.status = 'finished';
                        game.winner = currentPlayer.username;
                        io.to(roomId).emit('game_update', game);
                        io.to(roomId).emit('game_over', { winner: currentPlayer.username, game });
                        if (currentPlayer.id !== 'bot') {
                            incrementWins(currentPlayer.username).catch(console.error);
                        }
                    } else {
                        if (diceRoll !== 6) {
                            game.turnIndex = (game.turnIndex + 1) % game.players.length;
                        }
                        game.isAnimating = false;
                        io.to(roomId).emit('game_update', game);
                        
                        // Check if next player is bot
                        if (game.players[game.turnIndex].id === 'bot') {
                            setTimeout(() => {
                                processRoll(roomId, 'bot');
                            }, 1500);
                        }
                    }
                }
            }
        }
    }

    socket.on('roll_dice', () => {
        processRoll(socket.roomId, socket.id);
    });

    socket.on('leave_game', () => {
        const roomId = socket.roomId;
        if (roomId && games[roomId]) {
            games[roomId].players = games[roomId].players.filter(p => p.id !== socket.id);
            socket.roomId = null;
            socket.leave(roomId);
            if (games[roomId].players.length === 0) {
                delete games[roomId];
            } else {
                if (games[roomId].turnIndex >= games[roomId].players.length) {
                    games[roomId].turnIndex = 0;
                }
                io.to(roomId).emit('game_update', games[roomId]);
            }
            io.emit('lobby_update', getWaitingGames());
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        const roomId = socket.roomId;
        if (roomId && games[roomId]) {
            games[roomId].players = games[roomId].players.filter(p => p.id !== socket.id);
            if (games[roomId].players.length === 0) {
                delete games[roomId];
            } else {
                if (games[roomId].turnIndex >= games[roomId].players.length) {
                    games[roomId].turnIndex = 0;
                }
                io.to(roomId).emit('game_update', games[roomId]);
            }
            io.emit('lobby_update', getWaitingGames());
        }
    });
});

function getWaitingGames() {
    return Object.keys(games)
        .filter(roomId => games[roomId].status === 'waiting')
        .map(roomId => ({
            roomId,
            players: games[roomId].players.map(p => p.username)
        }));
}

app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist', 'index.html'));
});

const PORT = 3001;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
