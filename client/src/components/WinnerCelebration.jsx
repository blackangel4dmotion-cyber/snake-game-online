import { useEffect } from 'react';

export default function WinnerCelebration({ winner, onClose }) {
  useEffect(() => {
    // Auto close after 10 seconds
    const timer = setTimeout(() => {
      onClose();
    }, 10000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="celebration-overlay">
      <div className="fireworks left">🎆</div>
      <div className="fireworks right">🎇</div>
      <div className="champagne left-bottom">🍾</div>
      <div className="champagne right-bottom">🥂</div>
      
      <div className="winner-content">
        <h1 className="bouncing-text">WINNER!</h1>
        <h2 className="winner-name">{winner}</h2>
        <button onClick={onClose} className="close-celebration-btn">
          Back to Lobby
        </button>
      </div>

      {/* Confetti particles */}
      {[...Array(50)].map((_, i) => (
        <div key={i} className={`confetti confetti-${i % 5}`} style={{
          left: `${Math.random() * 100}vw`,
          animationDelay: `${Math.random() * 3}s`,
          animationDuration: `${Math.random() * 2 + 2}s`
        }}></div>
      ))}
    </div>
  );
}
