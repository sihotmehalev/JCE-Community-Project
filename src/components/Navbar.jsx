// Navbar.jsx - כולל קישורים לעמודי הרשמה נפרדים
import React from "react";
import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="bg-white/20 backdrop-blur-sm shadow-lg p-4 flex justify-between items-center">
      <div className="text-xl font-bold text-orange-800">שיחות מהלב</div>
      <div className="space-x-4 rtl:space-x-reverse">
        <Link to="/" className="px-4 py-2 rounded-md border-2 border-orange-600 text-orange-700 hover:bg-orange-600 hover:text-white transition-all duration-200">דף הבית</Link>
        <Link to="/login" className="px-4 py-2 rounded-md border-2 border-orange-600 text-orange-700 hover:bg-orange-600 hover:text-white transition-all duration-200">התחברות</Link>
        <Link to="/register-requester" className="px-4 py-2 rounded-md border-2 border-orange-600 text-orange-700 hover:bg-orange-600 hover:text-white transition-all duration-200">הרשמה כפונה</Link>
        <Link to="/register-volunteer" className="px-4 py-2 rounded-md border-2 border-orange-600 text-orange-700 hover:bg-orange-600 hover:text-white transition-all duration-200">הרשמה כמתנדב</Link>
        <Link to="/about" className="px-4 py-2 rounded-md border-2 border-orange-600 text-orange-700 hover:bg-orange-600 hover:text-white transition-all duration-200">אודות</Link>
      </div>
    </nav>
  );
}