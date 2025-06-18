import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react'; // Import necessary icons

const CustomAlert = ({ message, onClose, type = 'info', position = 'center' }) => {
  if (!message) return null;

  let icon;
  let iconColorClass;
  let bgColorClass;
  let borderColorClass;
  let textColorClass;
  let buttonBgClass;
  let buttonHoverClass;

  switch (type) {
    case 'success':
      icon = <CheckCircle className="w-12 h-12" />;
      iconColorClass = "text-green-600";
      bgColorClass = "bg-green-50";
      borderColorClass = "border-green-200";
      textColorClass = "text-green-800";
      buttonBgClass = "bg-green-600";
      buttonHoverClass = "hover:bg-green-700";
      break;
    case 'error':
      icon = <XCircle className="w-12 h-12" />;
      iconColorClass = "text-red-600";
      bgColorClass = "bg-red-50";
      borderColorClass = "border-red-200";
      textColorClass = "text-red-800";
      buttonBgClass = "bg-red-600";
      buttonHoverClass = "hover:bg-red-700";
      break;
    case 'info':
    default:
      icon = (
        <svg
          className="w-12 h-12"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.332 16c-.77 1.333.192 3 1.732 3z"
          ></path>
        </svg>
      );
      iconColorClass = "text-orange-600";
      bgColorClass = "bg-orange-50";
      borderColorClass = "border-orange-200";
      textColorClass = "text-orange-800";
      buttonBgClass = "bg-orange-600";
      buttonHoverClass = "hover:bg-orange-700";
      break;
  }

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex ${position === 'bottom' ? 'items-end' : 'items-center'} justify-center z-50 p-4`}>
      <div className={` ${bgColorClass} ${borderColorClass} rounded-lg shadow-xl p-6 max-w-sm w-full mx-auto text-center transform transition-all sm:my-8 sm:align-middle sm:max-w-md`}>
        <div className="flex justify-center items-center mb-4">
          <span className={iconColorClass}>{icon}</span>
        </div>
        <p className={`text-lg font-semibold ${textColorClass} mb-4`}>{message}</p>
        <button
          onClick={onClose}
          className={`${buttonBgClass} ${buttonHoverClass} text-white font-bold py-2 px-4 rounded transition-colors duration-200`}
        >
          הבנתי
        </button>
      </div>
    </div>
  );
};

export default CustomAlert; 