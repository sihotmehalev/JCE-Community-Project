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

export function EmergencyContacts() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-blue-800">אנשי קשר לשעת חירום</h3>
      
      {/* Professional Help */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h4 className="font-semibold text-blue-700 mb-3">עזרה מקצועית</h4>
        <ul className="space-y-3">
          {EMERGENCY_CONTACTS.map((contact, index) => (
            <li 
              key={index}
              className="p-3 border border-blue-100 rounded-lg hover:bg-blue-50"
            >
              <div className="font-medium">{contact.name}</div>
              {contact.phone && (
                <a 
                  href={`tel:${contact.phone}`}
                  className="text-blue-600 hover:underline block"
                >
                  📞 {contact.phone}
                </a>
              )}
              {contact.website && (
                <a 
                  href={contact.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline block"
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