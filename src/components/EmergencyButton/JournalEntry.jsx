import React, { useState } from 'react';

export function JournalEntry() {
  const [entry, setEntry] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    // Here you would typically save to your database
    // For now, we'll just show a success message
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-blue-800">יומן אישי</h3>
      
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
        
        <div className="mt-4 flex justify-end gap-3">
          <button
            onClick={handleSave}
            disabled={!entry.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
          >
            שמור
          </button>
        </div>

        {isSaved && (
          <div className="mt-2 text-green-600 text-sm">
            ✓ נשמר בהצלחה
          </div>
        )}
      </div>
    </div>
  );
}