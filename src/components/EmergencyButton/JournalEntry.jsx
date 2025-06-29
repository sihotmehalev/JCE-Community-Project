import React, { useState } from 'react';

export function JournalEntry() {
  const [entry, setEntry] = useState('');

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-orange-800">כתוב את שעל ליבך</h3>

      <div className="bg-white p-4 rounded-lg shadow">
        <p className="text-gray-600 mb-3">
          מה עובר עליך עכשיו? לא חייב לשתף, אפשר פשוט להוציא את המחשבות החוצה.
        </p>
        
        <textarea
          value={entry}
          onChange={(e) => setEntry(e.target.value)}
          className="w-full h-32 p-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="כתוב כאן..."
        />
        
        

        
      </div>
    </div>
  );
}