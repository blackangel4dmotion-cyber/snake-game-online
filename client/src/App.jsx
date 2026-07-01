import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Login from './components/Login';
import Lobby from './components/Lobby';
import GameBoard from './components/GameBoard';

function App() {
  const [view, setView] = useState('login');
  const [user, setUser] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!socket) return;
    
    socket.on('game_created', ({ roomId, gameState }) => {
      setRoomId(roomId);
      setGameState(gameState);
      setView('game');
    });

    socket.on('game_update', (state) => {
      setGameState(state);
      setView('game');
    });

    socket.on('game_over', ({ game }) => {
      setGameState(game);
    });

    socket.on('error', (msg) => {
      alert(msg);
    });

    return () => {
      socket.off('game_created');
      socket.off('game_update');
      socket.off('game_over');
      socket.off('error');
    };
  }, [socket]);

  const handleLogin = (userData, activeServerUrl) => {
    const newSocket = io(activeServerUrl);
    setSocket(newSocket);
    setUser(userData);
    newSocket.emit('join_lobby', { username: userData.username });
    setView('lobby');
  };

  return (
    <div className="app-container">
      {view === 'login' && <Login onLogin={handleLogin} />}
      {view === 'lobby' && <Lobby socket={socket} username={user?.username} />}
      {view === 'game' && (
        <GameBoard 
          socket={socket} 
          gameState={gameState} 
          username={user?.username} 
          onLeaveGame={() => {
            socket.emit('leave_game');
            setGameState(null);
            setView('lobby');
          }}
        />
      )}
    </div>
  );
}

export default App;
