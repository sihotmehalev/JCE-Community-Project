import React from 'react';

const LoadingSpinner = () => {
  return (
    <div className="p-6 flex justify-center items-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
    </div>
  );
};

export default LoadingSpinner; 