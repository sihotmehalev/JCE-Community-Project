import React from "react";

export default function AboutPage() {
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h2 className="text-3xl font-bold mb-6 text-orange-800 text-center">
        ברוכים הבאים לפרויקט "שיחות מהלב"!
      </h2>
      <div className="space-y-6 text-orange-700 text-lg leading-relaxed text-right">

        <div className="bg-orange-50/50 p-6 rounded-lg border border-orange-100 shadow-sm">
          <p>
            "שיחות מהלב" זה פרויקט תמיכה נפשית לא טיפולית, שמבוססת על קשר אישי. במסגרתו מתנדבים מדברים עם אנשים שצריכים תמיכה באופן קבוע, בדרך כלל פעם בשבוע, מרחוק, בטלפון, בשיחות וידאו או בהתכתבות, ובפגישות פרונטליות, אם זה מתאפשר ומתאים. במקרים מסויימים פותחים קבוצות תמיכה אישיות, בוואטסאפ, ומפתחים מודלים נוספים של תמיכה נפשית אנושית. כמו כן במסגרת הפרויקט מעבירים שיחות לקהל הרחב בנושאים שקשורים לנפש, תמיכה נפשית, מיצוי זכויות בעולם בריאות הנפש ועוד, בשאיפה לשים את הנפש במרכז ולהעלות מודעות לנושאים החיוניים, כתרומה לקהילה. בפרויקט הכל נעשה בהתנדבות, בלי התנהלות כספית בכלל, וזה לא עמותה. מאחורי הפרויקט עומדת קבוצת אנשים שמאמינים בחשיבות של תמיכה נפשית אנושית ופועלים ביחד, בשביל שלכל אדם תהיה אפשרות לקבל תמיכה כשצריך.
          </p>
        </div>

        <div className="bg-orange-50/50 p-6 rounded-lg border border-orange-100 shadow-sm">
          <p>
            במסגרת "שיחות מהלב" לא מציעים טיפול ושירותים מקצועיים, ובשביל להתנדב בפרויקט אין חובה להיות אנשי מקצוע, העיקר להיות אנשים עם לב ועם יכולת להקשיב ולתת תמיכה רגשית.
          </p>
        </div>

        <div className="bg-orange-50/50 p-6 rounded-lg border border-orange-100 shadow-sm">
          <p>
            הפרויקט פתוח לכולם, לכל אדם באשר הוא אדם, והחיבורים נעשים על בסיס התאמה ובחירה הדדית, בשאיפה שיהיה כמה שיותר מתאים וטוב לשני האנשים שבקשר. והכל בכבוד הדדי ובאהבת חינם, מהלב.
          </p>
          <p className="mt-4 font-semibold">
            כולנו יכולים להיות בשני הצדדים ובואו נהיה אחד בשביל השני ביחד!
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">

          <div className="bg-orange-50/50 p-6 rounded-lg border border-orange-100 shadow-sm">
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold mb-2 text-orange-800">לקבלת תמיכה או פנייה עבור אדם אחר:</h3>
                <a href="https://did.li/mehalev" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-bold break-all">
                  https://did.li/mehalev
                </a>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2 text-orange-800">להתנדבות במתן תמיכה:</h3>
                <a href="https://did.li/mitnadvim-mehalev" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-bold break-all">
                  https://did.li/mitnadvim-mehalev
                </a>
                <p className="text-sm mt-2">
                  כמו כן אפשר להתנדב בדרכים נוספות ומוזמנים לשמוע על אפשרויות ולהציע.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-orange-50/50 p-6 rounded-lg border border-orange-100 shadow-sm">
            <h3 className="text-xl font-semibold mb-2 text-orange-800">ליצירת קשר:</h3>
            <div className="space-y-2">
              <p className="font-semibold">055-9987759</p>
              <p className="text-sm -mt-2">(בוואטסאפ, טלגרם וסמס, וניתן להשאיר הודעות בתא הקולי)</p>
              <p className="font-semibold break-all">mehalev4u@gmail.com</p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}