import React, { useEffect, useState } from "react";
import { auth, db } from "../config/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { User, Edit3, Save, X, Phone, Mail, MapPin, Calendar, Briefcase, Star, Clock, MessageCircle, Info } from "lucide-react";
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

const ProfileField = ({ label, name, value, isEditing, onChange, type = "text", options = [], icon, isReadOnly = false }) => {
  let displayValue = value;
  if (Array.isArray(value)) {
    displayValue = value.join(", ");
  } else if (typeof value === 'boolean') {
    displayValue = value ? "כן" : "לא";
  } else if (value instanceof Date) {
    displayValue = value.toLocaleDateString('he-IL');
  } else if (value && typeof value.toDate === 'function') {
    try {
      displayValue = value.toDate().toLocaleDateString('he-IL');
    } catch (e) {
      console.error("Error converting timestamp to date:", value, e);
      displayValue = String(value);
    }
  } else if (value === null || value === undefined || value === '') {
    displayValue = "לא צוין";
  } else {
    displayValue = String(value);
  }

  const isEditableField = isEditing && !isReadOnly;

  return (
    <div className="group flex justify-between items-center p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-gray-100 hover:bg-white/80 hover:shadow-md transition-all duration-200 min-h-[70px]">
      <div className="flex items-center gap-3">
        {icon && <div className="flex-shrink-0 w-5 h-5 text-orange-600">{icon}</div>}
        <span className="text-gray-700 font-medium">{label}:</span>
      </div>
      {isEditableField ? (
        type === 'textarea' ? (
          <textarea 
            name={name} 
            value={value || ""} 
            onChange={onChange} 
            rows={3} 
            className="bg-white border-2 border-orange-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200 text-right min-w-48 w-full" 
            dir="rtl"
          />
        ) : type === 'select' ? (
          <select 
            name={name} 
            value={value || ""} 
            onChange={onChange} 
            className="bg-white border-2 border-orange-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200 text-right min-w-48 w-full" 
            dir="rtl"
          >
            <option value="">בחר...</option>
            {options.map(opt => (
              <option key={opt.value || opt} value={opt.value || opt}>
                {opt.label || opt}
              </option>
            ))}
          </select>
        ) : type === 'multicheckbox' ? (
            <div className="flex flex-wrap gap-x-4 gap-y-2" dir="rtl">
                {options.map(opt => {
                    const optionValue = opt.value || opt;
                    const isChecked = Array.isArray(value) && value.includes(optionValue);
                    return (
                        <label key={optionValue} className="flex items-center gap-2 cursor-pointer text-sm">
                            <input
                                type="checkbox"
                                name={name}
                                value={optionValue}
                                checked={isChecked}
                                onChange={onChange}
                                className="form-checkbox h-4 w-4 text-orange-600 border-orange-300 rounded focus:ring-orange-500 cursor-pointer"
                            />
                            <span>{opt.label || opt}</span>
                        </label>
                    );
                })}
            </div>
        ) : type === 'checkbox' ? (
          <input 
            type="checkbox" 
            name={name} 
            checked={!!value} 
            onChange={onChange} 
            className="form-checkbox h-5 w-5 text-orange-600 border-orange-300 rounded focus:ring-orange-500 cursor-pointer"
          />
        ) : type === 'date' ? (
          <input 
            type="date" 
            name={name} 
            value={value instanceof Date ? value.toISOString().split('T')[0] : (value && typeof value.toDate === 'function' ? value.toDate().toISOString().split('T')[0] : '')} 
            onChange={onChange} 
            className="bg-white border-2 border-orange-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200 text-right min-w-48 w-full" 
            dir="ltr"
          />
        ) : (
          <input 
            type={type} 
            name={name} 
            value={value || ""} 
            onChange={onChange} 
            className="bg-white border-2 border-orange-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200 text-right min-w-48 w-full" 
            dir="rtl"
          />
        )
      ) : (
        <span className={`text-gray-800 font-medium text-right break-words max-w-[60%]`}>
          {displayValue}
        </span>
      )}
    </div>
  );
};

export default function ProfilePage() {
  const [userData, setUserData] = useState(null);
  const [role, setRole] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(null);
  const [message, setMessage] = useState("");
  const [adminConfig, setAdminConfig] = useState({ customFields: [] });
  const [loading, setLoading] = useState(true);
  const user = auth.currentUser;

  const startEditing = () => {
    setEditData({ ...userData });
    setIsEditing(true);
    setMessage("");
  };

  const cancelEditing = () => {
    setEditData(null);
    setIsEditing(false);
    setMessage("");
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const fieldDef = getFieldDefinition(name);

    if (fieldDef && fieldDef.type === 'multicheckbox') {
        setEditData(prev => {
            const existingValues = Array.isArray(prev[name]) ? prev[name] : [];
            if (checked) {
                // Add value if it's not already there
                return { ...prev, [name]: existingValues.includes(value) ? existingValues : [...existingValues, value] };
            } else {
                // Remove value
                return { ...prev, [name]: existingValues.filter(v => v !== value) };
            }
        });
    } else if (type === 'checkbox' || (fieldDef && fieldDef.type === 'checkbox')) {
      setEditData(prev => ({ ...prev, [name]: checked }));
    } else {
      setEditData(prev => ({ ...prev, [name]: value }));
    }
  };

  const saveChanges = async () => {
    if (!user || !role || !collectionForRole[role]) {
      setMessage("שגיאה: לא ניתן לקבוע את תפקיד המשתמש או נתיב השמירה.");
      return;
    }

    // Validate phone number
    if (editData.phone && !/^\d{10}$/.test(editData.phone)) {
      setMessage("מספר הטלפון חייב להכיל 10 ספרות בדיוק.");
      setTimeout(() => setMessage(""), 4000);
      return; // Stop the save process
    }

    setLoading(true);
    try {
      let pathSegments = ["Users", "Info"];
      const rolePath = collectionForRole[role];
      if (Array.isArray(rolePath)) {
        pathSegments.push(...rolePath, user.uid);
      } else {
        pathSegments.push(rolePath, user.uid);
      }
      const docRef = doc(db, ...pathSegments);

      const dataToSave = { ...editData };
      delete dataToSave.email;
      delete dataToSave.role;
      delete dataToSave.createdAt;
      delete dataToSave.approved;
      delete dataToSave.activeMatchId;
      delete dataToSave.activeMatchIds;
      delete dataToSave.lastActivity;
      delete dataToSave.agree1;
      delete dataToSave.agree2;
      delete dataToSave.agree3;
      delete dataToSave.personal;
      delete dataToSave.isAvailable;
      delete dataToSave.requestIds;

      await updateDoc(docRef, dataToSave);
      setUserData(dataToSave);
      setIsEditing(false);
      setMessage("הפרטים עודכנו בהצלחה");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Error updating profile:", error);
      setMessage("שגיאה בעדכון הפרטים: " + error.message);
    }
    setLoading(false);
  };

  const getFieldDefinition = (fieldName) => {
    const standardFieldDefinitions = {
      fullName: { label: "שם מלא", icon: <User />, type: "text" },
      email: { label: "אימייל", icon: <Mail />, type: "email", readOnly: true },
      phone: { label: "טלפון", icon: <Phone />, type: "tel" },
      gender: { label: "מגדר", icon: <User />, type: "select", options: ['זכר', 'נקבה', 'אחר'] },
      age: { label: "גיל", icon: <Calendar />, type: "number" },
      location: { label: "מקום מגורים", icon: <MapPin />, type: "text" },
      maritalStatus: { label: "מצב משפחתי", icon: <User />, type: "select", options: ['רווק/ה', 'נשוי/אה', 'גרוש/ה', 'אלמן/ה', 'אחר'] },
      reason: { label: "סיבת הפנייה", icon: <MessageCircle />, type: "textarea", roles: ["requester"] },
      needs: { label: "צורך בתמיכה", icon: <MessageCircle />, type: "textarea", roles: ["requester"] },
      chatPref: { label: "העדפות לשיחה", icon: <MessageCircle />, type: "multicheckbox", roles: ["requester"], options: ['טלפון', 'וידאו', 'בהתכתבות', 'פרונטלית', 'אחר'] },
      frequency: { label: "תדירות מועדפת", icon: <Clock />, type: "multicheckbox", roles: ["requester"], options: ['פעם בשבוע', 'פעם בשבועיים', 'אחר'] },
      preferredTimes: { label: "זמנים נוחים", icon: <Clock />, type: "select", options: ['בוקר', 'צהריים', 'ערב', 'גמיש', 'אחר'], roles: ["requester"] },
      volunteerPrefs: { label: "העדפות למתנדב", icon: <User />, type: "textarea", roles: ["requester"] },
      note: { label: "הערה", icon: <MessageCircle />, type: "textarea", roles: ["requester"] },
      onBehalfOf: { label: "פונה עבור", type: "text", roles: ["requester"] },
      behalfName: { label: "שם האדם (עבורו הפנייה)", type: "text", roles: ["requester"] },
      behalfDetails: { label: "פרטי הפנייה (עבור אחר)", type: "textarea", roles: ["requester"] },
      profession: { 
        label: "מקצוע", 
        icon: <Briefcase />, 
        type: "select", 
        roles: ["volunteer"],
        options: [
          'עובד/ת סוציאלי/ת', 'פסיכולוג/ית', 'פסיכותרפיסט/ית', 'יועץ/ת חינוכי/ת', 'מטפל/ת באומנות',
          'מטפל/ת CBT', 'מטפל/ת משפחתי/ת', 'מטפל/ת זוגי/ת', 'מאמן/ת אישי/ת', 'מחנך/ת', 'רב/נית',
          'יועץ/ת רוחני/ת', 'סטודנט/ית למקצועות הטיפול', 'מתנדב/ת בעל/ת ניסיון בהקשבה והכלה', 'אחר'
        ] 
      },
      experience: { 
        label: "ניסיון קודם", 
        icon: <Star />, 
        type: "select", 
        roles: ["volunteer"],
        options: [
          'אין ניסיון קודם', 'התנדבות קודמת בתחום דומה', 'עבודה מקצועית בתחום הטיפול',
          'ניסיון בהקשבה והכלה', 'אחר'
        ]
      },
      availableDays: { label: "ימים פנויים", icon: <Calendar />, type: "multicheckbox", roles: ["volunteer"], options: ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'] },
      availableHours: { label: "שעות פנויות", icon: <Clock />, type: "multicheckbox", roles: ["volunteer"], options: ['בוקר (8:00-12:00)', 'צהריים (12:00-16:00)', 'אחה"צ (16:00-20:00)', 'ערב (20:00-24:00)', 'אחר'] },
      strengths: { label: "חוזקות", icon: <Star />, type: "textarea", roles: ["volunteer"] },
      motivation: { label: "מוטיבציה להתנדבות", icon: <MessageCircle />, type: "textarea", roles: ["volunteer"] },
      approved: { label: "סטטוס אישור", type: "text", readOnly: true },
      createdAt: { label: "תאריך הצטרפות", type: "date", readOnly: true },
    };

    if (standardFieldDefinitions[fieldName]) return standardFieldDefinitions[fieldName];
    if (adminConfig?.customFields) {
      const customDef = adminConfig.customFields.find(f => f.name === fieldName);
      if (customDef) return { ...customDef, icon: <Info /> };
    }
    return { label: fieldName, type: 'text', icon: <Info /> };
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);

      const checkAdminRole = async (uid) => {
        const firstLevelRef = doc(db, "Users", "Info", "Admins", "Level", "FirstLevel", uid);
        const snapFirst = await getDoc(firstLevelRef);
        if (snapFirst.exists()) return { role: "admin-first", data: snapFirst.data() };

        const secondLevelRef = doc(db, "Users", "Info", "Admins", "Level", "SecondLevel", uid);
        const snapSecond = await getDoc(secondLevelRef);
        if (snapSecond.exists()) return { role: "admin-second", data: snapSecond.data() };
        return null;
      };

      let userRole = null;
      let fetchedUserData = null;

      const adminInfo = await checkAdminRole(user.uid);
      if (adminInfo) {
        userRole = adminInfo.role;
        fetchedUserData = adminInfo.data;
      } else {
        for (const roleType of ["volunteer", "requester"]) {
          const collectionName = collectionForRole[roleType];
          const userDocRef = doc(db, "Users", "Info", collectionName, user.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            userRole = roleType;
            fetchedUserData = userDocSnap.data();
            break;
          }
        }
      }

      if (userRole && fetchedUserData) {
        setUserData({ ...fetchedUserData, role: userRole });
        setRole(userRole);

        if (userRole === "requester" || userRole === "volunteer") {
          try {
            const configDocRef = doc(db, "admin_form_configs", `${userRole}_config`);
            const configSnap = await getDoc(configDocRef);
            if (configSnap.exists()) {
              const configData = configSnap.data() || {};
              setAdminConfig({
                customFields: Array.isArray(configData.customFields) ? configData.customFields : []
              });
            } else {
              setAdminConfig({ customFields: [] });
            }
          } catch (configError) {
            console.error(`Error fetching admin config for ${userRole}:`, configError);
            setAdminConfig({ customFields: [] });
          }
        }
      } else {
        console.error("User data or role not found.");
        setMessage("שגיאה בטעינת נתוני משתמש.");
      }
      setLoading(false);
    };

    fetchInitialData();
  }, [user]);

  const getRoleBadgeColor = (currentRole) => {
    switch (currentRole) {
      case 'volunteer': return 'bg-green-100 text-green-800 border-green-200';
      case 'requester': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'admin-first': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'admin-second': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const excludedFields = new Set([
    'role', 'createdAt', 'approved', 'activeMatchId', 'activeMatchIds',
    'lastActivity', 'personal', 'isAvailable', 'agree1', 'agree2', 'agree3', 'agree',
    'requestIds', 'declinedVolunteers', 'conversationsWithAdminId',
  ]);

  // Define which fields go into which card
  const personalInfoFields = ['fullName', 'email', 'phone', 'gender', 'age', 'location', 'maritalStatus'];
  const volunteerSpecificFields = ['profession', 'experience', 'availableDays', 'availableHours', 'strengths', 'motivation'];
  const requesterPreferenceFields = ['chatPref', 'frequency', 'preferredTimes', 'volunteerPrefs'];
  const requesterRequestFields = ['reason', 'needs', 'onBehalfOf', 'behalfName', 'behalfDetails', 'note'];
  const statusFields = ['approved', 'createdAt'];

  const renderFieldsForCard = (fieldKeys) => {
    if (!userData) return null;
    return fieldKeys.map(key => {
      if (userData.hasOwnProperty(key) && !excludedFields.has(key)) {
        const fieldDef = getFieldDefinition(key);
        return (
          <ProfileField
            key={key}
            label={fieldDef.label}
            name={key}
            value={isEditing ? editData?.[key] : userData[key]}
            onChange={handleInputChange}
            isEditing={isEditing}
            isReadOnly={fieldDef?.readOnly}
            type={fieldDef.type}
            options={fieldDef.options || []}
            icon={fieldDef.icon}
          />
        );
      }
      return null;
    }).filter(Boolean);
  };
  
  // Collect all custom fields that are not standard and not excluded
  const customAndOrphanedFieldsToRender = [];
  if (userData) {
    Object.keys(userData).forEach(key => {
      if (
        !excludedFields.has(key) &&
        !personalInfoFields.includes(key) &&
        !volunteerSpecificFields.includes(key) &&
        !requesterPreferenceFields.includes(key) &&
        !requesterRequestFields.includes(key) &&
        !statusFields.includes(key)
      ) {
        const fieldDef = getFieldDefinition(key);
        customAndOrphanedFieldsToRender.push(
          <ProfileField
            key={key}
            label={fieldDef.label}
            name={key}
            value={isEditing ? editData?.[key] : userData[key]}
            onChange={handleInputChange}
            isEditing={isEditing}
            isReadOnly={fieldDef?.readOnly}
            type={fieldDef.type}
            options={fieldDef.options || []}
            icon={fieldDef.icon || <Info />}
          />
        );
      }
    });
  }

  if (loading || !userData || !role) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
      {/* Fixed Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-gray-200 shadow-sm">
        <div className="px-4 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center shadow-lg">
                <User className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800 mb-1">הפרופיל שלי</h1>
                <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold border ${getRoleBadgeColor(role)}`}>
                  {roleTranslations[role] || role}
                </div>
              </div>
            </div>
            <div className="flex gap-3 items-center">
              {isEditing ? (
                <>
                  <Button 
                    onClick={saveChanges} 
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2" 
                    disabled={loading}
                  >
                    <Save className="w-4 h-4" /> {loading ? "שומר..." : "שמור שינויים"}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={cancelEditing} 
                    className="border-2 border-gray-300 hover:border-gray-400 px-6 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200 flex items-center gap-2" 
                    disabled={loading}
                  >
                    <X className="w-4 h-4" /> בטל
                  </Button>
                </>
              ) : (
                <Button 
                  onClick={startEditing} 
                  className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
                >
                  <Edit3 className="w-4 h-4" /> ערוך פרופיל
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
            message.includes("בהצלחה") ? "bg-green-50 text-green-800 border-green-500" : "bg-red-50 text-red-800 border-red-500"
          }`}>
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Personal Information Card */}
          <Card className="border-0 bg-white/70 backdrop-blur-sm hover:shadow-2xl transition-all duration-300">
            <CardContent className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-orange-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800">פרטים אישיים</h2>
              </div>
              <div className="space-y-4">
                {renderFieldsForCard(personalInfoFields)}
              </div>
            </CardContent>
          </Card>

          {/* Role-Specific Cards */}
          {role === "volunteer" && (
            <Card className="border-0 bg-white/70 backdrop-blur-sm hover:shadow-2xl transition-all duration-300">
              <CardContent className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <Briefcase className="w-5 h-5 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800">פרטי התנדבות</h2>
                </div>
                <div className="space-y-4">
                  {renderFieldsForCard(volunteerSpecificFields)}
                </div>
              </CardContent>
            </Card>
          )}

          {role === "requester" && (
            <>
              <Card className="border-0 bg-white/70 backdrop-blur-sm hover:shadow-2xl transition-all duration-300">
                <CardContent className="p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <MessageCircle className="w-5 h-5 text-blue-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">העדפות ופרטי פנייה</h2>
                  </div>
                  <div className="space-y-4">
                    {renderFieldsForCard(requesterPreferenceFields)}
                    {renderFieldsForCard(requesterRequestFields)}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
          
          {/* Custom and Orphaned Fields Card */}
          {customAndOrphanedFieldsToRender.length > 0 && (
            <Card className="border-0 bg-white/70 backdrop-blur-sm hover:shadow-2xl transition-all duration-300 xl:col-span-2">
              <CardContent className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Info className="w-5 h-5 text-purple-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800">מידע נוסף</h2>
                </div>
                <div className="space-y-4">
                  {customAndOrphanedFieldsToRender}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}