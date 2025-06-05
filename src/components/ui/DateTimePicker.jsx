import React, { useState } from 'react';

export default function DateTimePicker({ onSelect, onCancel, initialDateTime }) {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedDay, setSelectedDay] = useState('');

  const daysOfWeek = [
    'ראשון',
    'שני',
    'שלישי',
    'רביעי',
    'חמישי',
    'שישי',
    'שבת'
  ];

  const timeSlots = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0');
    return [`${hour}:00`, `${hour}:30`];
  }).flat();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedDay || !selectedTime) {
      alert('נא לבחור יום ושעה');
      return;
    }
    onSelect(`יום ${selectedDay}, ${selectedTime}`);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4 text-center">בחר זמן למפגש</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Day Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              יום בשבוע
            </label>
            <div className="grid grid-cols-4 gap-2">
              {daysOfWeek.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  className={`p-2 text-sm rounded-lg border ${
                    selectedDay === day
                      ? 'bg-violet-600 text-white border-violet-600'
                      : 'border-gray-300 hover:border-violet-500'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          {/* Time Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              שעה
            </label>
            <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto">
              {timeSlots.map((time) => (
                <button
                  key={time}
                  type="button"
                  onClick={() => setSelectedTime(time)}
                  className={`p-2 text-sm rounded-lg border ${
                    selectedTime === time
                      ? 'bg-violet-600 text-white border-violet-600'
                      : 'border-gray-300 hover:border-violet-500'
                  }`}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              ביטול
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700"
            >
              אישור
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 