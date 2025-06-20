import React, { useState } from 'react';
import { Dialog } from './Dialog';
import { SafeSpace } from './SafeSpace';
import { EmergencyContacts } from './EmergencyContacts';
import { JournalEntry } from './JournalEntry';

export default function EmergencyButton({ activeMatch }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('safe-space');

  return (
    <>
      {/* Emergency Button */}      
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 text-white rounded-full p-4 shadow-lg transition-all z-[999999]"
        aria-label="כפתור מצוקה"
        style={{ 
          position: 'fixed', 
          isolation: 'isolate',
          background: 'radial-gradient(circle at 70% 10%,rgb(255, 136, 136) 0%, #f49b8c 50%,rgb(243, 20, 20) 100%)',
        }}
      >
        <span className="text-2xl">🆘</span>
      </button>

      {/* Emergency Dialog */}
      <Dialog isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <div className="p-6 rounded-lg max-w-2xl w-full" style={{ 
          background: 'radial-gradient(circle at 70% 10%, #ffd7bd 0%, #ffb488 50%, #f49b8c 100%)',
        }}>
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
            {activeTab === 'contacts' && <EmergencyContacts activeMatch={activeMatch} />}
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
          ? 'bg-orange-500 text-white shadow-md' 
          : 'bg-orange-100/50 backdrop-blur-sm text-orange-800 hover:bg-orange-200/50'
      }`}
    >
      {children}
    </button>
  );
}