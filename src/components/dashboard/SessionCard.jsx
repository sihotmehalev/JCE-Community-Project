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
    <div className={`rounded-lg p-4 ${getStatusStyles()} ${className}`}>
      {/* Header with User Info */}
      {userInfo && (
        <div className="flex items-center gap-3 mb-3 pb-3 border-b border-orange-100">
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

      {/* Main Content */}
      <div className="space-y-2">
        {title && (
          <h4 className={`font-medium ${getTextStyles()}`}>{title}</h4>
        )}
        
        <div className="text-sm space-y-1">
          {time && (
            <p className={getTextStyles()}>
              {time}
            </p>
          )}
          
          {(location || duration) && (
            <p className="text-orange-600">
              {location && (
                <span>
                  {location === 'video' ? '🎥 שיחת וידאו' :
                   location === 'phone' ? '📱 שיחת טלפון' : '🤝 פגישה פיזית'}
                </span>
              )}
              {location && duration && ' • '}
              {duration && <span>{duration} דקות</span>}
            </p>
          )}

          {notes && (
            <p className="text-orange-500 mt-2 bg-white/50 p-2 rounded">
              {notes}
            </p>
          )}

          {summary && (
            <div className="mt-3 p-2 bg-white/80 rounded border border-gray-100">
              <span className="font-medium">סיכום: </span>
              <p className="text-gray-600 mt-1">{summary}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        {actions && actions.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-orange-100">
            {actions.map((action, index) => (
              <Button
                key={index}
                variant={action.variant || "default"}
                size={action.size || "sm"}
                onClick={action.onClick}
                className={action.className}
              >
                {action.icon && (
                  <span className="mr-1">{action.icon}</span>
                )}
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionCard;
