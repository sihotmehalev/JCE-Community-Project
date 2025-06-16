import React, { useState } from 'react';
import AdminAddEvent from './AdminAddEvent';
import { AdminEventList } from './AdminEventList';
import { DropdownSection } from './DropdownSection';

export const AdminEventManager = () => {
    const [key, setKey] = useState(0); // Used to force refresh the event list

    const handleEventAdded = () => {
        setKey(prev => prev + 1); // Force a refresh of the event list
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col w-full space-y-4">
                <DropdownSection title="יצירת אירוע חדש">
                    <AdminAddEvent onEventAdded={handleEventAdded} />
                </DropdownSection>
                <DropdownSection title="ניהול אירועים">
                    <AdminEventList key={key} />
                </DropdownSection>
            </div>
        </div>
    );
};