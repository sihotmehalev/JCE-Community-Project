import React from "react";
import { Link } from "react-router-dom";
import { useState, useRef, useEffect } from 'react'

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className="bg-white/20 backdrop-blur-sm shadow-lg p-4 flex justify-between items-center sticky top-0 z-50">
      <div className="text-xl font-bold text-orange-800">שיחות מהלב</div>
      <div className="space-x-4 rtl:space-x-reverse">
        <Link to="/" className="px-4 py-2 rounded-md border-2 border-orange-600 text-orange-700 hover:bg-orange-600 hover:text-white transition-all duration-200">דף הבית</Link>
        <Link to="/login" className="px-4 py-2 rounded-md border-2 border-orange-600 text-orange-700 hover:bg-orange-600 hover:text-white transition-all duration-200">התחברות</Link>
        <div className="relative inline-block" ref={dropdownRef}>
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="px-4 py-2 rounded-md border-2 border-orange-600 text-orange-700 hover:bg-orange-600 hover:text-white transition-all duration-200"
          >
            הרשמה
          </button>
          {isOpen && (
            <div className="absolute right-0 mt-2 bg-white shadow-lg rounded-md p-2 z-[9999] min-w-[150px]">
              <Link 
                to="/register-requester"
                className="block px-4 py-2 text-orange-700 hover:bg-orange-600 hover:text-white transition-all duration-200 rounded-md whitespace-nowrap"
                onClick={() => setIsOpen(false)}
              >
                הרשמה כפונה
              </Link>
              <div className="my-1 border-t border-orange-200/60"></div>
              <Link 
                to="/register-volunteer"
                className="block px-4 py-2 text-orange-700 hover:bg-orange-600 hover:text-white transition-all duration-200 rounded-md whitespace-nowrap"
                onClick={() => setIsOpen(false)}
              >
                הרשמה כמתנדב
              </Link>
            </div>
          )}
        </div>
        <Link to="/about" className="px-4 py-2 rounded-md border-2 border-orange-600 text-orange-700 hover:bg-orange-600 hover:text-white transition-all duration-200">אודות</Link>
      </div>
    </nav>
  );
}