//made to display user information on hover for admin dashboard
import React, { useState, useRef, useEffect } from "react";
import ReactDOM from 'react-dom';

const formatDisplayValue = (value) => {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === 'boolean') return value ? "כן" : "לא";
  if (value === null || value === undefined || value === '') return "—";
  return String(value);
};

export function HoverCard({ user, children, adminConfig }) { // Added adminConfig prop
  const [show, setShow] = useState(false);
  const targetRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const updatePosition = () => {
    if (!targetRef.current) { // Added check for targetRef.current
      return;
    }
    if (targetRef.current) {
      const rect = targetRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;

      // Calculate desired position to the right
      let newLeft = rect.right + window.scrollX + 10;
      let newTop = rect.top + window.scrollY + (rect.height / 2);

      // Check if there's enough space on the right for the card (assuming card width of 220px + 10px padding)
      const cardWidth = 220; // minWidth of the card
      if (newLeft + cardWidth > viewportWidth + window.scrollX) {
        // Not enough space on the right, position to the left
        newLeft = rect.left + window.scrollX - cardWidth - 10; // 10px to the left
      }

      setPosition({
        top: newTop,
        left: newLeft,
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
      <div className="font-bold text-orange-700 mb-1">
        {(() => {
          if (user.role === 'requester') {
            const { fullName, behalfName, behalfDetails } = user;
            let extra = [];
            if (behalfName && behalfName.trim() !== "") extra.push(behalfName);
            if (behalfDetails && behalfDetails.trim() !== "") extra.push(behalfDetails);
            if (extra.length > 0) {
              return `${fullName} (עבור: ${extra.join(', ')})`;
            }
          }
          return user.fullName;
        })()}
      </div>
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
      {user.chatPref && user.chatPref.length > 0 && <div><span className="font-semibold">העדפות שיחה:</span> {user.chatPref.join(', ')}</div>}
      {user.frequency && user.frequency.length > 0 && <div><span className="font-semibold">תדירות:</span> {user.frequency.join(', ')}</div>}
      {user.needs && <div><span className="font-semibold">צרכים:</span> {user.needs}</div>}
      {user.onBehalfOf && <div><span className="font-semibold">פונה עבור:</span> {user.onBehalfOf}</div>}
      {user.preferredTimes && <div><span className="font-semibold">זמנים מועדפים:</span> {user.preferredTimes}</div>}
      {user.reason && <div><span className="font-semibold">סיבת הפנייה:</span> {user.reason}</div>}
      {user.volunteerPrefs && <div><span className="font-semibold">העדפות למתנדב:</span> {user.volunteerPrefs}</div>}
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
      {/* Display Custom Fields from adminConfig */}
      {adminConfig && adminConfig.customFields && Array.isArray(adminConfig.customFields) && adminConfig.customFields.length > 0 && (
        <>
          <div className="mt-2 pt-2 border-t border-orange-100">
            <div className="font-bold text-orange-700 mb-1">מידע נוסף:</div>
          </div>
          {adminConfig.customFields.map(fieldDef => {
            // Log each field definition and whether the user has this property
            
            if (user && user.hasOwnProperty(fieldDef.name)) {
              const displayValue = formatDisplayValue(user[fieldDef.name]);
              return (
                <div key={fieldDef.name} className="text-sm">
                  <span className="font-semibold">{fieldDef.label}:</span> {displayValue}
                </div>
              );
            }
            return null;
          })}
        </>
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