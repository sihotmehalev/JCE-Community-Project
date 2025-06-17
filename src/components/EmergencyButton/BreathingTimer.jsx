import React, { useState, useEffect } from 'react';

export function BreathingTimer() {
  const [phase, setPhase] = useState('inhale');
  const [count, setCount] = useState(4);

  useEffect(() => {
    const timer = setInterval(() => {
      setCount(c => {
        if (c === 0) {
          setPhase(p => p === 'inhale' ? 'hold' : p === 'hold' ? 'exhale' : 'inhale');
          return phase === 'hold' ? 4 : 4;
        }
        return c - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase]);

  return (
    <div className="bg-white p-6 rounded-lg shadow text-center">
      <h3 className="text-lg font-bold text-blue-800 mb-4">תרגיל נשימה</h3>
      <div className="text-3xl font-bold text-blue-600 mb-2">
        {phase === 'inhale' ? 'שאיפה' : phase === 'hold' ? 'החזק' : 'נשיפה'}
      </div>
      <div className="text-2xl text-blue-500">{count}</div>
    </div>
  );
}