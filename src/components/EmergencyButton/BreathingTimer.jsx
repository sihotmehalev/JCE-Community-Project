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

  const getPhaseText = () => {
    switch (phase) {
      case 'inhale':
        return 'שאיפה';
      case 'hold':
        return 'החזק';
      case 'exhale':
        return 'נשיפה';
      default:
        return '';
    }
  };

  return (
    <div className="p-8 rounded-lg text-center relative" 
         style={{ background: 'radial-gradient(circle at 70% 10%, #ffd7bd 0%,rgb(240, 155, 106) 50%, #f49b8c 100%)' }}>
      <h3 className="text-lg font-semibold text-orange-800 mb-6">תרגיל נשימה מרגיע</h3>
      
      {/* Breathing Circles */}
      <div className="relative w-64 h-64 mx-auto">
        {/* Outer glowing circle */}
        <div className="absolute inset-0 rounded-full animate-gentle-glow"
             style={{
               background: 'radial-gradient(circle at center, rgba(255,180,136,0.3) 0%, rgba(244,155,140,0.1) 70%)',
             }}
        />
        
        {/* Animated breathing circle */}
        <div 
          className={`absolute inset-0 rounded-full transition-all duration-[4000ms] ease-in-out`}
          style={{
            background: 'radial-gradient(circle at center, rgba(235, 75, 11, 0.7) 0%, rgba(190, 118, 34, 0.3) 100%)',
            boxShadow: '0 0 40px rgba(244,155,140,0.4)',
            transform: `scale(${
              phase === 'inhale' ? 1.5 : 
              phase === 'exhale' ? 0.8 : 
              phase === 'hold' ? 1.5 : 1
            })`
          }}
        />
        
        {/* Center static circle with text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-40 h-40 rounded-full bg-orange-100/30 backdrop-blur-sm flex flex-col items-center justify-center shadow-lg">
            <span className="text-2xl font-bold text-orange-800">{getPhaseText()}</span>
            <span className="text-xl text-orange-700 mt-2">{count}</span>
          </div>
        </div>
      </div>
      
      <p className="mt-6 text-orange-800 text-lg">
        עקבו אחר תנועת העיגול ונשמו בקצב איטי ורגוע
      </p>
    </div>
  );
}