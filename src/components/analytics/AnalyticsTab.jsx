import React from 'react';
import UnifiedAnalyticsBarChart from './UnifiedAnalyticsBarChart';

export const AdminAnalyticsTab = () => {
    console.log('AdminAnalyticsTab rendered');
    return (
        <div >
            <h3 className="font-semibold mb-4 text-orange-700">
            סטטיסטיקה
            </h3>
            <div className="flex flex-col w-full space-y-4">
                    <div className="bg-white rounded-lg shadow p-6 text-center">
                        <UnifiedAnalyticsBarChart />
                    </div>
            </div>
        </div>
    );
};