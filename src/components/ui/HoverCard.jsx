//made to display user information on hover for admin dashboard
import React, { useState } from "react";

export function HoverCard({ user, children }) {
  const [show, setShow] = useState(false);

  return (
    <span
      className="relative"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      tabIndex={0}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
      style={{ outline: "none" }}
    >
      <span className="cursor-pointer underline decoration-dotted">{children}</span>
      {show && (
        <div className="absolute z-50 left-1/2 -translate-x-1/2 mt-2 w-64 bg-white border border-orange-200 rounded shadow-lg p-4 text-sm text-orange-900"
             style={{ minWidth: 220 }}>
          <div className="font-bold text-orange-700 mb-1">{user.fullName}</div>
          <div><span className="font-semibold">אימייל:</span> {user.email}</div>
          {user.phone && <div><span className="font-semibold">טלפון:</span> {user.phone}</div>}
          {user.role && <div><span className="font-semibold">תפקיד:</span> {user.role}</div>}
          {/*{"approved" in user && (
            <div>
              <span className="font-semibold">מאושר:</span> {user.approved ? "✔️" : "❌"}
            </div>
          )}*/}
          {/* Add more fields as needed */}
          {user.age && <div><span className="font-semibold">גיל:</span> {user.age}</div>}

        </div>
      )}
    </span>
  );
}