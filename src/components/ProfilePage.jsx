import React, { useEffect, useState } from "react";
import { auth, db } from "../firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { Card, CardContent } from "./ui/card";

const roleTranslations = {
  volunteer: "מתנדב/ת",
  requester: "פונה",
  admin: "מנהל/ת"
};

export default function ProfilePage() {
  const [userData, setUserData] = useState(null);
  const user = auth.currentUser;

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        setUserData(userDoc.data());
      }
    };
    fetchUserData();
  }, [user]);

  if (!userData) return <div className="p-6">טוען...</div>;

  return (
    <div className="p-6">
      <div className="flex flex-col items-start gap-2 mb-6">
        <h1 className="text-2xl font-bold">הפרופיל שלי</h1>
        <span className="px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
          {roleTranslations[userData.role]}
        </span>
      </div>
      
      <div className="grid gap-6">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">פרטים אישיים</h2>
            <div className="space-y-2">
              <p><strong>שם מלא:</strong> {userData.fullName}</p>
              <p><strong>אימייל:</strong> {userData.email}</p>
              <p><strong>טלפון:</strong> {userData.phone || "לא צוין"}</p>
              <p><strong>מגדר:</strong> {userData.gender || "לא צוין"}</p>
              <p><strong>גיל:</strong> {userData.age || "לא צוין"}</p>
              <p><strong>מקום מגורים:</strong> {userData.location || "לא צוין"}</p>
              <p><strong>מצב משפחתי:</strong> {userData.maritalStatus || "לא צוין"}</p>
            </div>
          </CardContent>
        </Card>

        {userData.role === "volunteer" ? (
          <>
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4">פרטי התנדבות</h2>
                <div className="space-y-2">
                  <p><strong>מקצוע:</strong> {userData.profession || "לא צוין"}</p>
                  <p><strong>ניסיון קודם:</strong> {userData.experience || "לא צוין"}</p>
                  <p><strong>זמינות:</strong> {userData.availability || "לא צוין"}</p>
                  <p><strong>חוזקות:</strong> {userData.strengths || "לא צוין"}</p>
                  <p><strong>מוטיבציה להתנדבות:</strong> {userData.motivation || "לא צוין"}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4">סטטוס התנדבות</h2>
                <div className="space-y-2">
                  <p className={userData.approved ? "text-green-600" : "text-yellow-600"}>
                    <strong>סטטוס:</strong> {userData.approved ? "מאושר/ת" : "ממתין/ה לאישור"}
                  </p>
                  <p><strong>תאריך הצטרפות:</strong> {userData.createdAt?.toDate().toLocaleDateString('he-IL') || "לא ידוע"}</p>
                </div>
              </CardContent>
            </Card>
          </>
        ) : userData.role === "requester" && (
          <>
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4">העדפות</h2>
                <div className="space-y-2">
                  <p><strong>העדפות לשיחה:</strong> {userData.chatPref?.join(", ") || "לא צוין"}</p>
                  <p><strong>תדירות מועדפת:</strong> {userData.frequency?.join(", ") || "לא צוין"}</p>
                  <p><strong>זמנים נוחים:</strong> {userData.preferredTimes || "לא צוין"}</p>
                  <p><strong>העדפות למתנדב:</strong> {userData.volunteerPrefs || "לא צוין"}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4">פרטי פנייה</h2>
                <div className="space-y-2">
                  <p><strong>סיבת הפנייה:</strong> {userData.reason || "לא צוין"}</p>
                  <p><strong>צורך בתמיכה:</strong> {userData.needs || "לא צוין"}</p>
                  {userData.onBehalfOf !== "עצמי" && userData.onBehalfOf && (
                    <>
                      <p><strong>פונה עבור:</strong> {userData.onBehalfOf}</p>
                      <p><strong>פרטי האדם:</strong> {userData.behalfName || "לא צוין"}</p>
                      <p><strong>מידע נוסף:</strong> {userData.behalfDetails || "לא צוין"}</p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}