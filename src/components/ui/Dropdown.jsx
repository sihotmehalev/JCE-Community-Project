import React, { useState, useRef, useEffect } from 'react';

export const Dropdown = ({ title, children, customButton, icon, activeTab, tabsInDropdown }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const isActive = tabsInDropdown && activeTab && tabsInDropdown.includes(activeTab);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [dropdownRef]);

    const handleItemClick = () => {
        setIsOpen(false);
    };

    const buttonClasses = `rounded transition-all duration-200 flex items-center justify-between h-12 sm:h-14 px-4
        ${isActive ? 'bg-orange-600 text-white hover:bg-orange-700 border-2 border-transparent' : 'border-2 border-orange-600 text-orange-700 hover:bg-orange-600 hover:text-white'}
        text-sm sm:text-base
    `;

    return (
        <div className="relative inline-block text-right mb-2" ref={dropdownRef}>
            <div>
                {customButton ? (
                    React.cloneElement(customButton, { onClick: () => setIsOpen(!isOpen) })
                ) : (
                    <button
                        type="button"
                        className={buttonClasses}
                        onClick={() => setIsOpen(!isOpen)}
                        aria-haspopup="true"
                        aria-expanded={isOpen}
                    >
                        <span>{title}</span>
                        <svg
                            className="mr-2 h-5 w-5"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            aria-hidden="true"
                        >
                            <path
                                fillRule="evenodd"
                                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                clipRule="evenodd"
                            />
                        </svg>
                    </button>
                )}
            </div>

            {isOpen && (
                <div
                    className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10"
                    role="menu"
                    aria-orientation="vertical"
                    aria-labelledby="options-menu"
                >
                    <div className="py-1" role="none">
                        {React.Children.map(children, child => {
                            if (React.isValidElement(child)) {
                                return React.cloneElement(child, { className: `w-full text-right ${child.props.className || ''}`, onClick: (...args) => { handleItemClick(); if (child.props.onClick) child.props.onClick(...args); } });
                            }
                            return child;
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}; 