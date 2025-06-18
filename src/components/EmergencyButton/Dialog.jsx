import React from 'react';

export function Dialog({ isOpen, onClose, children }) {
  if (!isOpen) return null;

  return (    <div className="fixed inset-0 z-[999999] overflow-y-auto" style={{ isolation: 'isolate' }}>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
        style={{ position: 'fixed', zIndex: -1 }}
      />
      
      {/* Dialog Content */}
      <div className="relative min-h-screen flex items-center justify-center p-4">        <div className="relative rounded-lg shadow-xl max-w-2xl w-full backdrop-blur-sm bg-orange-100/30" 
             style={{ 
               position: 'relative', 
               zIndex: 999999,
             }}>
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 left-4 text-orange-600 hover:text-orange-800"
            aria-label="סגור"
          >
            ✕
          </button>
          
          {children}
        </div>
      </div>
    </div>
  );
}