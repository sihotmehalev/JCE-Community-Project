import React from 'react';

const DashboardLayout = ({ 
  header,
  children,
  sideContent,
  className = "" 
}) => {
  return (
    <div className={`min-h-screen bg-orange-50/30 ${className}`}>
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-orange-100 p-4 sticky top-0 z-10">
        {header}
      </div>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-4rem)]">
        {/* Main Sections */}
        <div className="flex-1 p-4">
          <div className="flex flex-wrap -mx-4">
            {children}
          </div>
        </div>

        {/* Side Panel (if provided) */}
        {sideContent && (
          <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-r border-orange-100 bg-white p-4">
            {sideContent}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardLayout;
