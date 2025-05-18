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

  if (!userData) return <div className="max-w-5xl mx-auto p-6">טוען...</div>;

  const ProfileField = ({ label, value, colored }) => (
    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
      <span className="text-gray-700"><strong>{label}</strong></span>
      <span className={colored ? colored : "font-medium"}>
        {value || "לא צוין"}
      </span>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <h1 className="text-2xl font-bold">הפרופיל שלי</h1>
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium self-start">
            {roleTranslations[userData.role]}
          </span>
        </div>
      </div>
      
      <div className="grid gap-6">
        {/* Personal Information Card */}
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <h2 className="text-xl font-semibold mb-4">פרטים אישיים</h2>
            <div className="space-y-3">
              <ProfileField label="שם מלא:" value={userData.fullName} />
              <ProfileField label="אימייל:" value={userData.email} />
              <ProfileField label="טלפון:" value={userData.phone} />
              <ProfileField label="מגדר:" value={userData.gender} />
              <ProfileField label="גיל:" value={userData.age} />
              <ProfileField label="מקום מגורים:" value={userData.location} />
              <ProfileField label="מצב משפחתי:" value={userData.maritalStatus} />
            </div>
          </CardContent>
        </Card>

        {userData.role === "volunteer" ? (
          <>
            {/* Volunteer Information Card */}
            <Card className="shadow-sm">
              <CardContent className="p-4">
                <h2 className="text-xl font-semibold mb-4">פרטי התנדבות</h2>
                <div className="space-y-3">
                  <ProfileField label="מקצוע:" value={userData.profession} />
                  <ProfileField label="ניסיון קודם:" value={userData.experience} />
                  <ProfileField label="זמינות:" value={userData.availability} />
                  <ProfileField label="חוזקות:" value={userData.strengths} />
                  <ProfileField label="מוטיבציה להתנדבות:" value={userData.motivation} />
                </div>
              </CardContent>
            </Card>

            {/* Volunteer Status Card */}
            <Card className="shadow-sm">
              <CardContent className="p-4">
                <h2 className="text-xl font-semibold mb-4">סטטוס התנדבות</h2>
                <div className="space-y-3">
                  <ProfileField 
                    label="סטטוס:" 
                    value={userData.approved ? "מאושר/ת" : "ממתין/ה לאישור"} 
                    colored={userData.approved ? "text-green-600 font-medium" : "text-yellow-600 font-medium"}
                  />
                  <ProfileField 
                    label="תאריך הצטרפות:" 
                    value={userData.createdAt?.toDate().toLocaleDateString('he-IL')} 
                  />
                </div>
              </CardContent>
            </Card>
          </>
        ) : userData.role === "requester" && (
          <>
            {/* Requester Preferences Card */}
            <Card className="shadow-sm">
              <CardContent className="p-4">
                <h2 className="text-xl font-semibold mb-4">העדפות</h2>
                <div className="space-y-3">
                  <ProfileField label="העדפות לשיחה:" value={userData.chatPref?.join(", ")} />
                  <ProfileField label="תדירות מועדפת:" value={userData.frequency?.join(", ")} />
                  <ProfileField label="זמנים נוחים:" value={userData.preferredTimes} />
                  <ProfileField label="העדפות למתנדב:" value={userData.volunteerPrefs} />
                </div>
              </CardContent>
            </Card>

            {/* Request Details Card */}
            <Card className="shadow-sm">
              <CardContent className="p-4">
                <h2 className="text-xl font-semibold mb-4">פרטי פנייה</h2>
                <div className="space-y-3">
                  <ProfileField label="סיבת הפנייה:" value={userData.reason} />
                  <ProfileField label="צורך בתמיכה:" value={userData.needs} />
                  {userData.onBehalfOf !== "עצמי" && userData.onBehalfOf && (
                    <>
                      <ProfileField label="פונה עבור:" value={userData.onBehalfOf} />
                      <ProfileField label="פרטי האדם:" value={userData.behalfName} />
                      <ProfileField label="מידע נוסף:" value={userData.behalfDetails} />
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