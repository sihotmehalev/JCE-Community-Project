import React from 'react';
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
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg border-2 border-orange-300 shadow-lg w-full max-w-2xl">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-orange-200">
          <h3 className="text-xl font-semibold text-orange-800">{title}</h3>
          <button 
            onClick={onClose}
            className="text-orange-400 hover:text-orange-600 rounded-lg p-1 hover:bg-orange-50 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[calc(80vh-10rem)] overflow-y-auto">
          {sessions.length === 0 ? (
            <div className="bg-orange-50 text-orange-600 p-3 rounded-md text-center">
              אין מפגשים להצגה
            </div>
          ) : (
            <div className="space-y-4">
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
                    variant: "outline"
                  }] : undefined}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-orange-200">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="w-full"
          >
            סגור
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SessionsModal;
