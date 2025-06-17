import React, { useState } from 'react';

export const DropdownSection = ({ title, children }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="w-full mb-4">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-white p-4 rounded-lg shadow-md flex justify-between items-center hover:bg-gray-50"
            >
                <h2 className="text-xl font-bold">{title}</h2>
                <svg
                    className={`w-6 h-6 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                    />
                </svg>
            </button>
            <div
                className={`transition-all duration-200 overflow-hidden ${
                    isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                }`}
            >
                <div className="mt-2">
                    {children}
                </div>
            </div>
        </div>
    );
};
