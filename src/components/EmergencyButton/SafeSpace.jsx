import React from 'react';
import { BreathingTimer } from './BreathingTimer';

export function SafeSpace() {
  const positiveMessages = [
    "אתה לא לבד",
    "זה יעבור",
    "אתה חזק יותר ממה שאתה חושב",
    // Add more messages
  ];

  return (
    <div className="space-y-6">
      {/* Breathing Timer */}
      <BreathingTimer />

      {/* Positive Messages */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-bold text-blue-800 mb-3">משפטי חיזוק</h3>
        <ul className="space-y-2">
          {positiveMessages.map((msg, i) => (
            <li 
              key={i}
              className="text-blue-700 p-2 border border-blue-100 rounded"
            >
              {msg}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}