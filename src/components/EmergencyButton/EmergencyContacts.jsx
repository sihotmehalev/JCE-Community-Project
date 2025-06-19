import React from 'react';

const EMERGENCY_CONTACTS = [
  {
    name: 'ער"ן - עזרה ראשונה נפשית',
    phone: '1201',
    description: 'קו חירום 24/7',
    type: 'professional'
  },
  {
    name: 'סה"ר - סיוע והקשבה ברשת',
    website: 'https://sahar.org.il/',
    description: 'תמיכה מקוונת',
    type: 'professional'
  }
];

export function EmergencyContacts({ activeMatch }) {
  return (
    <div className="space-y-4">
      <h3 className="text font-bold text-orange-800">אנשי קשר לשעת חירום</h3>

      {/* Volunteer Help - only shown when there's an active match with volunteer info */}
      {activeMatch?.volunteer?.phone && (
        <div className="bg-white p-4 rounded-lg shadow border-2 border-orange-200">
          <h4 className="font-semibold text-orange-700 mb-3">המתנדב/ת שלך</h4>
          <div className="p-3 border border-orange-100 rounded-lg bg-orange-50">
            <div className="font-medium">{activeMatch.volunteer.fullName || "מתנדב/ת"}</div>
            <a 
              href={`tel:${activeMatch.volunteer.phone}`}
              className="text-orange-600 hover:underline block font-medium"
            >
              📞 {activeMatch.volunteer.phone}
            </a>
          </div>
        </div>
      )}

      {/* Professional Help */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h4 className="font-semibold text-orange-700 mb-3">עזרה מקצועית</h4>
        <ul className="space-y-3">
          {EMERGENCY_CONTACTS.map((contact, index) => (
            <li 
              key={index}
              className="p-3 border border-orange-100 rounded-lg hover:bg-orange-50"
            >
              <div className="font-medium">{contact.name}</div>
              {contact.phone && (
                <a 
                  href={`tel:${contact.phone}`}
                  className="text-orange-600 hover:underline block"
                >
                  📞 {contact.phone}
                </a>
              )}
              {contact.website && (
                <a 
                  href={contact.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-orange-600 hover:underline block"
                >
                  🌐 לאתר
                </a>
              )}
              <div className="text-sm text-gray-600">{contact.description}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}