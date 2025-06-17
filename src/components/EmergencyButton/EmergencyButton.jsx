import React, { useState } from 'react';
import { Dialog } from './Dialog';
import { BreathingTimer } from './BreathingTimer';
import { SafeSpace } from './SafeSpace';
import { EmergencyContacts } from './EmergencyContacts';
import { JournalEntry } from './JournalEntry';

export default function EmergencyButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('safe-space');

  return (
    <>
      {/* Emergency Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-red-500 hover:bg-red-600 text-white rounded-full p-4 shadow-lg transition-all"
        aria-label="כפתור מצוקה"
      >
        <span className="text-2xl">🆘</span>
      </button>

      {/* Emergency Dialog */}
      <Dialog isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <div className="bg-blue-50 p-6 rounded-lg max-w-2xl w-full">
          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            <TabButton
              active={activeTab === 'safe-space'}
              onClick={() => setActiveTab('safe-space')}
            >
              מרחב בטוח
            </TabButton>
            <TabButton
              active={activeTab === 'contacts'}
              onClick={() => setActiveTab('contacts')}
            >
              אנשי קשר
            </TabButton>
            <TabButton
              active={activeTab === 'journal'}
              onClick={() => setActiveTab('journal')}
            >
              יומן אישי
            </TabButton>
          </div>

          {/* Content */}
          <div className="mt-4">
            {activeTab === 'safe-space' && <SafeSpace />}
            {activeTab === 'contacts' && <EmergencyContacts />}
            {activeTab === 'journal' && <JournalEntry />}
          </div>
        </div>
      </Dialog>
    </>
  );
}

function TabButton({ children, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg transition-colors ${
        active 
          ? 'bg-blue-600 text-white' 
          : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
      }`}
    >
      {children}
    </button>
  );
}