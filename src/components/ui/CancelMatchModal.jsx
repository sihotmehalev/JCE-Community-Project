import React from 'react';

export const CancelMatchModal = ({ isOpen, onClose, match, onConfirm }) => {
  if (!isOpen) return null;

  const formatDate = (timestamp) => {
    if (!timestamp) return 'תאריך לא זמין';
    try {
      const date = timestamp.toDate();
      return new Intl.DateTimeFormat('he-IL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'תאריך לא תקין';
    }
  };

  return (
    <div 
      className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-start justify-center z-50 pt-8"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl w-[600px] max-h-[85vh] overflow-hidden shadow-2xl mx-4 relative border border-orange-100 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header */}
        <div className="sticky top-0 bg-white py-4 px-6 border-b border-orange-100 flex justify-between items-center z-10">
          <h3 className="text-xl font-semibold text-orange-800">ביטול התאמה</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100 p-1"
            title="סגור"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-4">
            <div className="bg-orange-50 p-4 rounded-lg space-y-3">
              <h4 className="font-medium text-orange-800 text-right">פרטי ההתאמה</h4>
              <div className="grid grid-cols-2 gap-4 text-right">
                <div>
                  <p className="text-sm text-gray-600">פונה</p>
                  <p className="font-medium">{match?.requesterInfo?.fullName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">מתנדב</p>
                  <p className="font-medium">{match?.volunteerInfo?.fullName}</p>
                </div>
                <div>                  <p className="text-sm text-gray-600">תאריך התאמה</p>
                  <p className="font-medium">{formatDate(match?.startDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">סטטוס נוכחי</p>
                  <p className="font-medium">פעיל</p>
                </div>
              </div>
            </div>

            <div className="bg-red-50 p-4 rounded-lg">
              <p className="text-red-600 text-sm text-right">
                <span className="font-medium">שים לב:</span> ביטול ההתאמה יסיים את הקשר בין המתנדב לפונה. 
                פעולה זו אינה ניתנת לביטול.
              </p>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white py-4 px-6 border-t border-orange-100">
          <div className="flex justify-end gap-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
            >
              ביטול
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 focus:ring-2 focus:ring-red-200 transition-colors"
            >
              אישור ביטול התאמה
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};