import { useState, useEffect } from 'react';
import WinnerCelebration from './WinnerCelebration';

export default function GameBoard({ socket, gameState, username, onLeaveGame }) {
  const [rollAnim, setRollAnim] = useState(false);
  const [currentRoll, setCurrentRoll] = useState(1);
  const [winner, setWinner] = useState(null);
  
  const [diceTransform, setDiceTransform] = useState('rotateX(0deg) rotateY(0deg)');
  const [diceRotationCount, setDiceRotationCount] = useState({ x: 0, y: 0 });
  const [bloodSplash, setBloodSplash] = useState(null);

  useEffect(() => {
    socket.on('snake_bitten', ({ position }) => {
      setBloodSplash(position);
      setTimeout(() => setBloodSplash(null), 1500);
    });

    socket.on('dice_rolled', ({ roll }) => {
      setCurrentRoll(roll);
      
      setDiceRotationCount(prev => {
        let newX = prev.x + 1080; // 3 full spins
        let newY = prev.y + 1080; 
        
        let targetX = 0; let targetY = 0;
        switch(roll) {
          case 1: targetX = 0; targetY = 0; break;
          case 6: targetX = 180; targetY = 0; break;
          case 3: targetX = 0; targetY = -90; break;
          case 4: targetX = 0; targetY = 90; break;
          case 5: targetX = -90; targetY = 0; break;
          case 2: targetX = 90; targetY = 0; break;
          default: break;
        }
        
        newX = newX - (newX % 360) + targetX;
        newY = newY - (newY % 360) + targetY;
        
        setDiceTransform(`rotateX(${newX}deg) rotateY(${newY}deg)`);
        return { x: newX, y: newY };
      });

      setRollAnim(true);
      setTimeout(() => setRollAnim(false), 3000);
    });



    return () => {
      socket.off('dice_rolled');
      socket.off('snake_bitten');
    };
  }, [socket]);

  if (!gameState) return null;

  const isMyTurn = gameState.status === 'playing' && gameState.players[gameState.turnIndex]?.username === username;
  
  const handleRoll = () => {
    if (isMyTurn && !rollAnim) {
      socket.emit('roll_dice');
    }
  };

  const startGame = () => {
    socket.emit('start_game');
  };

  // Convert 1-100 position to x,y coordinates
  const getCoordinates = (pos) => {
    if (pos === 0) return { x: -100, y: -100 }; 
    pos = pos - 1; 
    const row = Math.floor(pos / 10);
    let col = pos % 10;
    
    if (row % 2 !== 0) col = 9 - col;
    
    // Board is 600x600, padding is 30px, inner size is 540x540. Cell size is 54px.
    // Start drawing from padding.
    return { 
      x: col * 54 + 27 + 30, 
      y: (9 - row) * 54 + 27 + 30 
    };
  };

  const snakes = [
    { head: 43, tail: 18 }, { head: 40, tail: 3 }, { head: 27, tail: 5 },
    { head: 28, tail: 9 }, { head: 29, tail: 13 }, { head: 54, tail: 31 },
    { head: 66, tail: 45 }, { head: 89, tail: 53 }, { head: 95, tail: 77 }, { head: 99, tail: 41 }
  ];

  return (
    <div className="game-container" style={{display: 'flex', gap: '20px', alignItems: 'flex-start'}}>
      {gameState.status === 'finished' && gameState.winner && (
        <WinnerCelebration winner={gameState.winner} onClose={onLeaveGame} />
      )}
      <button 
        onClick={onLeaveGame}
        style={{
          position: 'absolute', 
          top: '20px', 
          left: '20px', 
          background: '#c0392b',
          padding: '8px 16px',
          zIndex: 1000
        }}
      >
        🚪 Leave Game
      </button>
      <div className="board">
        <svg width="0" height="0" style={{ position: 'absolute', pointerEvents: 'none' }}>
          <filter id="cursed-distortion">
            <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="2" result="noise">
              <animate attributeName="baseFrequency" values="0.015;0.02;0.015" dur="12s" repeatCount="indefinite" />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </svg>

        <div className="slither-overlay"></div>

        {/* Cells */}
        {Array.from({length: 100}, (_, i) => {
          const rowFromTop = Math.floor(i / 10);
          const colFromLeft = i % 10;
          return (
            <div key={i} className="cell">
            </div>
          );
        })}

        {/* Players */}
        {gameState.players.map((p, index) => {
          if (p.position === 0) return null;
          
          const isActivePlayer = index === gameState.turnIndex;
          
          const playersOnThisCell = gameState.players.filter(player => player.position === p.position);
          const indexOfPlayerOnCell = playersOnThisCell.findIndex(player => player.id === p.id);
          
          let offsetX = 0;
          let offsetY = 0;
          
          if (playersOnThisCell.length > 1) {
             const offsets = [
               {x: -12, y: -12}, 
               {x: 12, y: 12},   
               {x: 12, y: -12},  
               {x: -12, y: 12}
             ];
             const offset = offsets[indexOfPlayerOnCell % offsets.length];
             offsetX = offset.x;
             offsetY = offset.y;
          }

          const baseCoords = getCoordinates(p.position);
          
          return (
            <div
              key={p.id}
              className={`player-token-wrapper ${isActivePlayer ? 'active-wrapper' : ''}`}
              style={{
                left: `${baseCoords.x + offsetX}px`,
                top: `${baseCoords.y + offsetY}px`,
                zIndex: isActivePlayer ? 50 : (indexOfPlayerOnCell + 10)
              }}
            >
              <img 
                className={`player-token custom-token ${isActivePlayer ? 'active-token' : ''}`}
                src={`/token${index + 1}.png`}
                style={{ '--player-color': p.color }}
                title={p.username}
                alt={`Player ${index + 1}`}
              />
            </div>
          );
        })}

        {bloodSplash && (
          <div 
            className="blood-splash"
            style={{
              left: `${getCoordinates(bloodSplash).x}px`,
              top: `${getCoordinates(bloodSplash).y}px`
            }}
          />
        )}
      </div>

      <div className="glass-panel side-panel" style={{zIndex: 100}}>
        <h3>Players</h3>
        <div className="players-list">
          {gameState.players.map((p, i) => (
            <div key={p.id} className="player-info" style={{border: i === gameState.turnIndex ? `2px solid ${p.color}` : '2px solid transparent'}}>
              <img 
                className="color-indicator custom-token" 
                src={`/token${i + 1}.png`}
                style={{ '--player-color': p.color }}
                alt="token"
              />
              <div>
                <strong>{p.username} {p.username === username ? '(You)' : ''}</strong>
                <div style={{fontSize: '0.8rem'}}>Pos: {p.position}</div>
              </div>
            </div>
          ))}
        </div>
        
        {gameState.status === 'waiting' && (
            <div style={{textAlign: 'center'}}>
              <h3>{gameState.players.length > 1 ? 'Ready to Start!' : 'Waiting for players...'}</h3>
              {gameState.players[0].username === username && gameState.players.length > 1 && (
                <button onClick={startGame} style={{marginTop: '15px'}}>Start Game</button>
              )}
              {gameState.players[0].username !== username && gameState.players.length > 1 && (
                <p style={{marginTop: '15px', opacity: 0.8}}>Waiting for host to start...</p>
              )}
            </div>
          )}
        {gameState.status !== 'waiting' && (
          <div className="dice-container" style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
            <div className="scene">
              <div className="dice-3d" style={{ transform: diceTransform }}>
                <div className="side front"><span className="dot"></span></div>
                <div className="side bottom"><span className="dot"></span><span className="dot"></span></div>
                <div className="side right"><span className="dot"></span><span className="dot"></span><span className="dot"></span></div>
                <div className="side left"><span className="dot"></span><span className="dot"></span><span className="dot"></span><span className="dot"></span></div>
                <div className="side top"><span className="dot"></span><span className="dot"></span><span className="dot"></span><span className="dot"></span><span className="dot"></span></div>
                <div className="side back"><span className="dot"></span><span className="dot"></span><span className="dot"></span><span className="dot"></span><span className="dot"></span><span className="dot"></span></div>
              </div>
            </div>
            
            {isMyTurn ? (
              <button onClick={handleRoll} disabled={rollAnim}>Roll Dice</button>
            ) : (
              <p style={{opacity: 0.7}}>Waiting for {gameState.players[gameState.turnIndex]?.username}...</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
