// Navbar.jsx - כולל קישורים לעמודי הרשמה נפרדים
import React from "react";
import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="bg-white shadow-md p-4 flex justify-between items-center">
      <div className="text-xl font-bold">שיחות מהלב</div>
      <div className="space-x-4 rtl:space-x-reverse">
        <Link to="/" className="hover:text-blue-600">דף הבית</Link>
        <Link to="/login" className="hover:text-blue-600">התחברות</Link>
        <Link to="/register-requester" className="hover:text-blue-600">הרשמה כפונה</Link>
        <Link to="/register-volunteer" className="hover:text-blue-600">הרשמה כמתנדב</Link>
      </div>
    </nav>
  );
}