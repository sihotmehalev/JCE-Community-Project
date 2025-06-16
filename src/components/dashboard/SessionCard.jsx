import React from 'react';
import { User } from 'lucide-react';
import { Button } from '../ui/button';

const SessionCard = ({
  title,
  status = 'upcoming', // 'upcoming', 'past', 'completed'
  time,
  duration,
  location,
  notes,
  summary,
  actions,
  userInfo,
  className = ""
}) => {
  const getStatusStyles = () => {
    switch (status) {
      case 'past':
        return 'bg-yellow-50 border-yellow-200';
      case 'completed':
        return 'bg-gray-50 border-gray-200';
      default: // upcoming
        return 'bg-orange-50 border-orange-200';
    }
  };

  const getTextStyles = () => {
    switch (status) {
      case 'completed':
        return 'text-gray-800';
      default:
        return 'text-orange-800';
    }
  };

  return (
    <div className={`rounded-lg py-3 px-4 ${getStatusStyles()} ${className}`}>
      {/* Header with User Info */}
      {userInfo && (
        <div className="flex items-center gap-3 mb-2 pb-2 border-b border-orange-100">
          <div className="w-10 h-10 bg-orange-200 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h3 className={`font-semibold ${getTextStyles()}`}>
              {userInfo.name}
            </h3>
            {userInfo.subtitle && (
              <p className="text-sm text-orange-600">{userInfo.subtitle}</p>
            )}
          </div>
        </div>
      )}

      {/* Session Details */}
      <div className="space-y-2">
        {/* Time and Duration */}
        {time && (
          <div className="flex items-start gap-2">
            <div className="shrink-0">
              <span className={`font-medium ${getTextStyles()}`}>מועד:</span>
            </div>
            <div className={getTextStyles()}>
              <div>{time}</div>
              {duration && <div className="text-sm">משך: {duration} דקות</div>}
            </div>
          </div>
        )}

        {/* Location */}
        {location && (
          <div className="flex items-start gap-2">
            <div className="shrink-0">
              <span className={`font-medium ${getTextStyles()}`}>מיקום:</span>
            </div>
            <div className={getTextStyles()}>{location}</div>
          </div>
        )}

        {/* Notes */}
        {notes && (
          <div className="flex items-start gap-2">
            <div className="shrink-0">
              <span className={`font-medium ${getTextStyles()}`}>הערות:</span>
            </div>
            <div className={getTextStyles()}>{notes}</div>
          </div>
        )}

        {/* Summary */}
        {summary && (
          <div className="flex items-start gap-2 mt-2 pt-2 border-t border-orange-100">
            <div className="shrink-0">
              <span className={`font-medium ${getTextStyles()}`}>סיכום:</span>
            </div>
            <div className={getTextStyles()}>{summary}</div>
          </div>
        )}
      </div>      {/* Actions */}
      {actions && actions.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3 pt-2 border-t border-orange-100">
          {actions.map((action, index) => (
            <Button
              key={index}
              onClick={action.onClick}
              variant={action.variant}
              className={action.className || ''}
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SessionCard;
