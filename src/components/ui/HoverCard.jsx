//made to display user information on hover for admin dashboard
import React, { useState, useRef, useEffect } from "react";
import ReactDOM from 'react-dom';

export function HoverCard({ user, children }) {
  const [show, setShow] = useState(false);
  const targetRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const updatePosition = () => {
    if (targetRef.current) {
      const rect = targetRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top + window.scrollY + (rect.height / 2),
        left: rect.right + window.scrollX + 10, // 10px to the right of the element
      });
    }
  };

  useEffect(() => {
    if (show) {
      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition);
    } else {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    }
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [show]);

  const hoverCardContent = (
    <div
      className="absolute z-[9999] w-64 bg-white border border-orange-200 rounded shadow-lg p-4 text-sm text-orange-900"
      style={{ top: position.top, left: position.left, transform: 'translateY(-50%)', minWidth: 220 }}
    >
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
      {user.gender && <div><span className="font-semibold">מין:</span> {user.gender}</div>}
      {user.location && <div><span className="font-semibold">מיקום:</span> {user.location}</div>}
      {user.experience && <div><span className="font-semibold">ניסיון:</span> {user.experience}</div>}
      {user.profession && <div><span className="font-semibold">מקצוע:</span> {user.profession}</div>}
      {user.maritalStatus && <div><span className="font-semibold">מצב משפחתי:</span> {user.maritalStatus}</div>}
      {user.motivation && <div><span className="font-semibold">מוטיבציה:</span> {user.motivation}</div>}
      {user.strengths && <div><span className="font-semibold">חוזקות:</span> {user.strengths}</div>}
      {user.availableDays && user.availableDays.length > 0 && (
        <div>
          <span className="font-semibold">ימים פנויים:</span> {user.availableDays.join(", ")}
        </div>
      )}
      {user.availableHours && user.availableHours.length > 0 && (
        <div>
          <span className="font-semibold">שעות פנויות:</span> {user.availableHours.join(", ")}
        </div>
      )}
    </div>
  );

  return (
    <span
      ref={targetRef}
      className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      tabIndex={0}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
      style={{ outline: "none" }}
    >
      <span className="cursor-pointer underline decoration-dotted">{children}</span>
      {show && ReactDOM.createPortal(hoverCardContent, document.body)}
    </span>
  );
}