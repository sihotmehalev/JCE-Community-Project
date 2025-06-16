import React from 'react';

const DashboardSection = ({ 
  title, 
  empty, 
  children, 
  className = "", 
  fullWidth = false,
  collapsible = false 
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  return (
    <div className={`dashboard-section ${fullWidth ? 'w-full' : 'w-full lg:w-1/2 xl:w-1/3'} p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-semibold text-orange-800">{title}</h2>
        {collapsible && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-orange-600 hover:text-orange-800"
          >
            {isCollapsed ? '🔽' : '🔼'}
          </button>
        )}
      </div>
      
      {!isCollapsed && (
        <div className="bg-white rounded-lg shadow-sm border border-orange-100 p-4">
          {React.Children.count(children) === 0 ? (
            <p className="bg-orange-50 text-orange-700 rounded-lg py-4 px-6">
              {empty}
            </p>
          ) : (
            <div className="space-y-4">{children}</div>
          )}
        </div>
      )}
    </div>
  );
};

export default DashboardSection;
