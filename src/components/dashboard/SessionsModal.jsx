import React from 'react';
import ReactDOM from 'react-dom';
import { X } from 'lucide-react';
import { Button } from '../ui/button';
import SessionCard from './SessionCard';

const SessionsModal = ({
  title,
  sessions,
  formatSessionTime,
  onClose,
  type = 'upcoming', // 'upcoming', 'past', 'completed'
  onSessionAction,
  actionLabel
}) => {
  const modalContent = (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 w-screen h-screen bg-black/50 z-[9999]"
        style={{ margin: 0, padding: 0 }}
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[10000] w-full max-w-md"
        style={{ margin: 0, padding: 0 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-white rounded-lg border-2 border-orange-300 shadow-lg flex flex-col h-[500px]">
          {/* Header */}
          <div className="flex justify-between items-center py-3 px-4 border-b border-orange-200 shrink-0">
            <h3 className="text-xl font-semibold text-orange-800">{title}</h3>
            <button 
              onClick={onClose}
              className="text-orange-400 hover:text-orange-600 rounded-lg p-1 hover:bg-orange-50 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="px-4 py-3 flex-1 overflow-y-auto">
            {sessions.length === 0 ? (
              <div className="bg-orange-50 text-orange-600 p-3 rounded-md text-center">
                אין מפגשים להצגה
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map(session => (
                  <SessionCard
                    key={session.id}
                    status={type}
                    time={formatSessionTime(session.scheduledTime)}
                    location={session.location}
                    duration={session.durationMinutes}
                    notes={session.notes}
                    summary={session.sessionSummary}
                    actions={onSessionAction && actionLabel ? [{
                      label: actionLabel,
                      onClick: () => onSessionAction(session),
                      variant: "outline",
                      className: "h-8 px-3 text-sm"
                    }] : undefined}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="py-3 px-4 border-t border-orange-200 shrink-0">
          </div>
        </div>
      </div>
    </>
  );

  return ReactDOM.createPortal(
    modalContent,
    document.body
  );
};

export default SessionsModal;
