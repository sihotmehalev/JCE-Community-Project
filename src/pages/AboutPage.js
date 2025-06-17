import React from "react";

export default function AboutPage() {
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h2 className="text-3xl font-bold mb-6 text-orange-800 text-center">אודות העמותה</h2>
      <div className="space-y-6 text-orange-700 text-lg leading-relaxed">
        <p className="bg-orange-50/50 p-6 rounded-lg border border-orange-100 shadow-sm">
          העמותה פועלת מתוך רצון להציע תמיכה רגשית לאנשים שזקוקים לשיחה. אנו עושים זאת בהתנדבות, באכפתיות ובאנושיות מלאה.
        </p>
        <p className="bg-orange-50/50 p-6 rounded-lg border border-orange-100 shadow-sm">
          המתנדבים שלנו עוברים הכשרה מקיפה ומחויבים לספק אוזן קשבת ותמיכה רגשית מתוך אמפתיה והבנה.
        </p>
        <p className="bg-orange-50/50 p-6 rounded-lg border border-orange-100 shadow-sm">
          אנחנו מאמינים שלכל אדם מגיעה הזכות לדבר ולהישמע, ללא שיפוטיות וללא עלות.
        </p>
      </div>
    </div>
  );
}