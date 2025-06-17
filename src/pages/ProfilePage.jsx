import React, { useEffect, useState } from "react";
import { auth, db } from "../config/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { User, Edit3, Save, X, Phone, Mail, MapPin, Calendar, Briefcase, Star, Clock, MessageCircle } from "lucide-react";
import LoadingSpinner from "../components/ui/LoadingSpinner";

const roleTranslations = {
  volunteer: "מתנדב/ת",
  requester: "פונה",
  "admin-first": "מנהל/ת דרג א",
  "admin-second": "מנהל/ת דרג ב"
};

const collectionForRole = {
  volunteer: "Volunteers",
  requester: "Requesters",
  "admin-first": ["Admins", "Level", "FirstLevel"],
  "admin-second": ["Admins", "Level", "SecondLevel"]
};

export default function ProfilePage() {
  const [userData, setUserData] = useState(null);
  const [role, setRole] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(null);
  const [message, setMessage] = useState("");
  const user = auth.currentUser;

  const startEditing = () => {
    setEditData({ ...userData });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setEditData(null);
    setIsEditing(false);
    setMessage("");
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const saveChanges = async () => {
    try {
      const docRef = doc(db, "Users", "Info", 
        Array.isArray(collectionForRole[role]) 
          ? [...collectionForRole[role], user.uid].join("/")
          : [collectionForRole[role], user.uid].join("/")
      );
      
      await updateDoc(docRef, editData);
      setUserData(editData);
      setIsEditing(false);
      setMessage("הפרטים עודכנו בהצלחה");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Error updating profile:", error);
      setMessage("שגיאה בעדכון הפרטים");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  useEffect(() => {
    const checkAdminRole = async (uid) => {
      // Check FirstLevel admins
      const firstLevelRef = doc(db, "Users", "Info", "Admins", "Level", "FirstLevel", uid);
      let snapFirst = await getDoc(firstLevelRef);
      if (snapFirst.exists()) return "admin-first";

      // Check SecondLevel admins
      const secondLevelRef = doc(db, "Users", "Info", "Admins", "Level", "SecondLevel", uid);
      let snapSecond = await getDoc(secondLevelRef);
      if (snapSecond.exists()) return "admin-second";

      return null;
    };

    const fetchUserData = async () => {
      if (!user) return;

      // First check if user is an admin
      const adminRole = await checkAdminRole(user.uid);
      if (adminRole) {
        const pathParts = collectionForRole[adminRole];
        const userDoc = await getDoc(doc(db, "Users", "Info", ...pathParts, user.uid));
        if (userDoc.exists()) {
          setUserData({ ...userDoc.data(), role: adminRole });
          setRole(adminRole);
        }
        return;
      }

      // Check Volunteers and Requesters collections
      for (const roleType of ["volunteer", "requester"]) {
        const collection = collectionForRole[roleType];
        const userDoc = await getDoc(doc(db, "Users", "Info", collection, user.uid));
        if (userDoc.exists()) {
          setUserData({ ...userDoc.data(), role: roleType });
          setRole(roleType);
          break;
        }
      }
    };

    fetchUserData();
  }, [user]);

  if (!userData) {
    return <LoadingSpinner />;
  }

  const getIconForField = (fieldName) => {
    switch (fieldName) {
      case 'phone': return <Phone className="w-4 h-4 text-blue-600" />;
      case 'email': return <Mail className="w-4 h-4 text-blue-600" />;
      case 'location': return <MapPin className="w-4 h-4 text-blue-600" />;
      case 'profession': return <Briefcase className="w-4 h-4 text-blue-600" />;
      case 'availability': return <Clock className="w-4 h-4 text-blue-600" />;
      default: return <User className="w-4 h-4 text-blue-600" />;
    }
  };

  const ProfileField = ({ label, name, value, colored, isEditing, onChange, icon }) => (
    <div className="group flex justify-between items-center p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-gray-100 hover:bg-white/80 hover:shadow-md transition-all duration-200">
      <div className="flex items-center gap-3">
        {icon && <div className="flex-shrink-0">{icon}</div>}
        <span className="text-gray-700 font-medium">{label}</span>
      </div>
      {isEditing ? (
        <input
          type="text"
          name={name}
          value={value || ""}
          onChange={onChange}
          className="bg-white border-2 border-blue-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 text-right min-w-48"
          dir="rtl"
        />
      ) : (
        <span className={`${colored || "text-gray-800 font-medium"} text-right`}>
          {value || "לא צוין"}
        </span>
      )}
    </div>
  );

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'volunteer': return 'bg-green-100 text-green-800 border-green-200';
      case 'requester': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'admin-first': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'admin-second': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      {/* Fixed Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-gray-200 shadow-sm">
        <div className="px-4 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                <User className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800 mb-1">הפרופיל שלי</h1>
                <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold border ${getRoleBadgeColor(userData.role)}`}>
                  {roleTranslations[userData.role]}
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              {isEditing ? (
                <>
                  <Button 
                    onClick={saveChanges}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    שמור שינויים
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={cancelEditing}
                    className="border-2 border-gray-300 hover:border-gray-400 px-6 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200 flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    בטל
                  </Button>
                </>
              ) : (
                <Button 
                  onClick={startEditing}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
                >
                  <Edit3 className="w-4 h-4" />
                  ערוך פרופיל
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 lg:px-8 py-8">
        {message && (
          <div className={`mb-6 p-4 rounded-xl font-medium shadow-lg border-l-4 ${
            message.includes("בהצלחה") 
              ? "bg-green-50 text-green-800 border-green-500" 
              : "bg-red-50 text-red-800 border-red-500"
          }`}>
            {message}
          </div>
        )}
        
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Personal Information Card */}
          <Card className="shadow-xl border-0 bg-white/70 backdrop-blur-sm hover:shadow-2xl transition-all duration-300">
            <CardContent className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800">פרטים אישיים</h2>
              </div>
              <div className="space-y-4">
                <ProfileField 
                  label="שם מלא:" 
                  name="fullName"
                  value={isEditing ? editData.fullName : userData.fullName}
                  onChange={handleInputChange}
                  isEditing={isEditing}
                  icon={<User className="w-4 h-4 text-blue-600" />}
                />
                <ProfileField 
                  label="אימייל:" 
                  name="email"
                  value={userData.email}
                  isEditing={false}
                  icon={<Mail className="w-4 h-4 text-blue-600" />}
                />
                <ProfileField 
                  label="טלפון:" 
                  name="phone"
                  value={isEditing ? editData.phone : userData.phone}
                  onChange={handleInputChange}
                  isEditing={isEditing}
                  icon={<Phone className="w-4 h-4 text-blue-600" />}
                />
                <ProfileField 
                  label="מגדר:" 
                  name="gender"
                  value={isEditing ? editData.gender : userData.gender}
                  onChange={handleInputChange}
                  isEditing={isEditing}
                />
                <ProfileField 
                  label="גיל:" 
                  name="age"
                  value={isEditing ? editData.age : userData.age}
                  onChange={handleInputChange}
                  isEditing={isEditing}
                  icon={<Calendar className="w-4 h-4 text-blue-600" />}
                />
                <ProfileField 
                  label="מקום מגורים:" 
                  name="location"
                  value={isEditing ? editData.location : userData.location}
                  onChange={handleInputChange}
                  isEditing={isEditing}
                  icon={<MapPin className="w-4 h-4 text-blue-600" />}
                />
                <ProfileField 
                  label="מצב משפחתי:" 
                  name="maritalStatus"
                  value={isEditing ? editData.maritalStatus : userData.maritalStatus}
                  onChange={handleInputChange}
                  isEditing={isEditing}
                />
              </div>
            </CardContent>
          </Card>

          {userData.role === "volunteer" ? (
            <>
              {/* Volunteer Information Card */}
              <Card className="shadow-xl border-0 bg-white/70 backdrop-blur-sm hover:shadow-2xl transition-all duration-300">
                <CardContent className="p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <Briefcase className="w-5 h-5 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">פרטי התנדבות</h2>
                  </div>
                  <div className="space-y-4">
                    <ProfileField 
                      label="מקצוע:" 
                      name="profession"
                      value={isEditing ? editData.profession : userData.profession}
                      onChange={handleInputChange}
                      isEditing={isEditing}
                      icon={<Briefcase className="w-4 h-4 text-green-600" />}
                    />
                    <ProfileField 
                      label="ניסיון קודם:" 
                      name="experience"
                      value={isEditing ? editData.experience : userData.experience}
                      onChange={handleInputChange}
                      isEditing={isEditing}
                      icon={<Star className="w-4 h-4 text-green-600" />}
                    />
                    <ProfileField 
                      label="זמינות:" 
                      name="availability"
                      value={isEditing ? editData.availability : userData.availability}
                      onChange={handleInputChange}
                      isEditing={isEditing}
                      icon={<Clock className="w-4 h-4 text-green-600" />}
                    />
                    <ProfileField 
                      label="חוזקות:" 
                      name="strengths"
                      value={isEditing ? editData.strengths : userData.strengths}
                      onChange={handleInputChange}
                      isEditing={isEditing}
                    />
                    <ProfileField 
                      label="מוטיבציה להתנדבות:" 
                      name="motivation"
                      value={isEditing ? editData.motivation : userData.motivation}
                      onChange={handleInputChange}
                      isEditing={isEditing}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Volunteer Status Card */}
              <Card className="shadow-xl border-0 bg-white/70 backdrop-blur-sm hover:shadow-2xl transition-all duration-300 xl:col-span-2">
                <CardContent className="p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Star className="w-5 h-5 text-purple-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">סטטוס התנדבות</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ProfileField 
                      label="סטטוס:" 
                      value={userData.approved ? "מאושר/ת" : "ממתין/ה לאישור"} 
                      colored={userData.approved ? "text-green-600 font-bold text-lg" : "text-amber-600 font-bold text-lg"}
                    />
                    <ProfileField 
                      label="תאריך הצטרפות:" 
                      value={userData.createdAt?.toDate().toLocaleDateString('he-IL')} 
                      icon={<Calendar className="w-4 h-4 text-purple-600" />}
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          ) : userData.role === "requester" && (
            <>
              {/* Requester Preferences Card */}
              <Card className="shadow-xl border-0 bg-white/70 backdrop-blur-sm hover:shadow-2xl transition-all duration-300">
                <CardContent className="p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                      <MessageCircle className="w-5 h-5 text-orange-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">העדפות</h2>
                  </div>
                  <div className="space-y-4">
                    <ProfileField 
                      label="העדפות לשיחה:" 
                      value={userData.chatPref?.join(", ")}
                      icon={<MessageCircle className="w-4 h-4 text-orange-600" />}
                      isEditing={isEditing}
                    />
                    <ProfileField 
                      label="תדירות מועדפת:" 
                      value={userData.frequency?.join(", ")}
                      icon={<Clock className="w-4 h-4 text-orange-600" />}
                      isEditing={isEditing}
                    />
                    <ProfileField 
                      label="זמנים נוחים:" 
                      value={userData.preferredTimes}
                      isEditing={isEditing}
                    />
                    <ProfileField 
                      label="העדפות למתנדב:" 
                      value={userData.volunteerPrefs}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Request Details Card */}
              <Card className="shadow-xl border-0 bg-white/70 backdrop-blur-sm hover:shadow-2xl transition-all duration-300">
                <CardContent className="p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                      <User className="w-5 h-5 text-red-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">פרטי פנייה</h2>
                  </div>
                  <div className="space-y-4">
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
    </div>
  );
}