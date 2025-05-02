// Navbar.jsx - כולל קישורים לעמודי הרשמה נפרדים
import React from "react";
import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="bg-white/10 backdrop-blur-sm shadow-lg p-4 flex justify-between items-center">
      <div className="text-xl font-bold text-white">שיחות מהלב</div>
      <div className="space-x-4 rtl:space-x-reverse">
        <Link to="/" className="bg-white text-black px-3 py-2 rounded-md transition-all duration-200 hover:border-2 hover:border-black">דף הבית</Link>
        <Link to="/login" className="bg-white text-black px-3 py-2 rounded-md transition-all duration-200 hover:border-2 hover:border-black">התחברות</Link>
        <Link to="/register-requester" className="bg-white text-black px-3 py-2 rounded-md transition-all duration-200 hover:border-2 hover:border-black">הרשמה כפונה</Link>
        <Link to="/register-volunteer" className="bg-white text-black px-3 py-2 rounded-md transition-all duration-200 hover:border-2 hover:border-black">הרשמה כמתנדב</Link>
        <Link to="/about" className="bg-white text-black px-3 py-2 rounded-md transition-all duration-200 hover:border-2 hover:border-black">אודות העמותה</Link>
      </div>
    </nav>
  );
}