import React, { useEffect, useState } from 'react';

const FlyingHearts = () => {
  const [hearts, setHearts] = useState([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setHearts(prevHearts => [
        ...prevHearts,
        {
          id: Date.now(),
          left: Math.random() * 100 + 'vw',
          animationDuration: Math.random() * 5 + 10 + 's', // 10-15 seconds
          opacity: Math.random() * 0.5 + 0.5, // 0.5-1
        },
      ]);

      // Remove hearts after their animation is likely finished to prevent memory issues
      setTimeout(() => {
        setHearts(prevHearts => prevHearts.slice(1));
      }, 5000);
    }, 600); // Add a new heart every 600ms

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flying-hearts-container" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      overflow: 'hidden',
      zIndex: 0,
    }}>
      {hearts.map(heart => (
        <span
          key={heart.id}
          style={{
            position: 'absolute',
            left: heart.left,
            top: '100%',
            fontSize: '2em',
            color: '#ff6b81', // A nice pink/red color for hearts
            opacity: heart.opacity,
            animation: `fly ${heart.animationDuration} linear forwards`,
            transform: 'translateY(0)',
          }}
        >
          ❤️
        </span>
      ))}
    </div>
  );
};

export default FlyingHearts; 