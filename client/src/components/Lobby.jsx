import { useState, useEffect } from 'react';
import AdminPanel from './AdminPanel';

export default function Lobby({ socket, username }) {
  const [waitingGames, setWaitingGames] = useState([]);
  const [topPlayers, setTopPlayers] = useState([]);
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  useEffect(() => {
    socket.emit('request_lobby_update');
    socket.emit('request_top_players');

    socket.on('lobby_update', (games) => {
      setWaitingGames(games);
    });

    socket.on('top_players_update', (players) => {
      setTopPlayers(players);
    });
    
    return () => {
      socket.off('lobby_update');
      socket.off('top_players_update');
    };
  }, [socket]);

  const createGame = () => {
    socket.emit('create_game');
  };

  const joinGame = (roomId) => {
    socket.emit('join_game', { roomId });
  };

  const createGameWithBot = () => {
    socket.emit('create_game_with_bot');
  };

  return (
    <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-start' }}>
      <div className="glass-panel" style={{ width: '400px' }}>
        <h2>Hello, {username}!</h2>
        
        {username === 'admin' ? (
          <div>
            <p style={{textAlign: 'center', opacity: 0.8}}>Welcome to the Admin Dashboard. You cannot play games.</p>
            <button 
              onClick={() => setShowAdminPanel(true)} 
              style={{ width: '100%', marginTop: '10px', background: '#e67e22' }}
            >
              ⚙️ Open Admin Panel
            </button>
            <button 
              onClick={() => window.location.reload()} 
              style={{ width: '100%', marginTop: '10px', background: '#c0392b' }}
            >
              🚪 Logout
            </button>
          </div>
        ) : (
          <>
            <p style={{textAlign: 'center', opacity: 0.8}}>Join an existing game, create a new one, or play with the PC.</p>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={createGame} style={{ flex: 1 }}>Create New Game</button>
              <button onClick={createGameWithBot} style={{ flex: 1, background: '#2980b9' }}>Play vs PC</button>
            </div>
            <button 
              onClick={() => window.location.reload()} 
              style={{ width: '100%', marginTop: '10px', background: '#c0392b' }}
            >
              🚪 Logout
            </button>
          
            <h3 style={{marginTop: '20px'}}>Waiting Games</h3>
            
            <div className="lobby-list">
              {waitingGames.length === 0 ? (
                <p style={{textAlign: 'center', opacity: 0.5}}>No games available.</p>
              ) : (
                waitingGames.map(game => (
                  <div key={game.roomId} className="lobby-item">
                    <div>
                      <strong>Game {game.roomId.substring(0,8)}</strong>
                      <div style={{fontSize: '0.8rem', opacity: 0.8}}>
                        Players: {game.players.join(', ')} ({game.players.length}/4)
                      </div>
                    </div>
                    <button onClick={() => joinGame(game.roomId)} style={{padding: '8px 16px', fontSize: '0.9rem'}}>
                      Join
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {username !== 'admin' && (
        <div className="glass-panel" style={{ width: '300px' }}>
          <h3>🏆 Top Rated Players</h3>
        <div className="lobby-list" style={{ marginTop: '15px' }}>
          {topPlayers.length === 0 ? (
            <p style={{textAlign: 'center', opacity: 0.5}}>No players yet.</p>
          ) : (
            topPlayers.map((p, i) => (
              <div key={p.username} className="lobby-item" style={{ padding: '10px' }}>
                <div>
                  <strong>#{i + 1} {p.username}</strong>
                </div>
                <div style={{ color: '#f1c40f', fontWeight: 'bold' }}>
                  {p.wins} Wins
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      )}

      {showAdminPanel && (
        <AdminPanel onClose={() => setShowAdminPanel(false)} />
      )}
    </div>
  );
}
