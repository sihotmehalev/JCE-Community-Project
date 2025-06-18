// RegisterVolunteerPage.jsx - טופס הרשמה למתנדבים ברמה מקצועית
import React, { useState } from "react";
import { auth, db } from "../../config/firebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, increment, writeBatch, serverTimestamp } from "firebase/firestore";
import RegisterLayout from "../layout/RegisterLayout";
import { Eye, EyeOff } from 'lucide-react';
import CustomAlert from "../ui/CustomAlert";
import { useNavigate } from "react-router-dom";

export default function RegisterVolunteerPage() {
  const genderOptions = ['זכר', 'נקבה', 'אחר'];
  const maritalStatusOptions = ['רווק/ה', 'נשוי/אה', 'גרוש/ה', 'אלמן/ה', 'אחר'];
  const professionOptions = [
    'עובד/ת סוציאלי/ת',
    'פסיכולוג/ית',
    'פסיכותרפיסט/ית',
    'יועץ/ת חינוכי/ת',
    'מטפל/ת באומנות',
    'מטפל/ת CBT',
    'מטפל/ת משפחתי/ת',
    'מטפל/ת זוגי/ת',
    'מאמן/ת אישי/ת',
    'מחנך/ת',
    'רב/נית',
    'יועץ/ת רוחני/ת',
    'סטודנט/ית למקצועות הטיפול',
    'מתנדב/ת בעל/ת ניסיון בהקשבה והכלה',
    'אחר'
  ];
  
  const availableDaysOptions = [
    'ראשון',
    'שני',
    'שלישי',
    'רביעי',
    'חמישי',
    'שישי',
    'שבת'
  ];
  
  const availableHoursOptions = [
    'בוקר (8:00-12:00)',
    'צהריים (12:00-16:00)',
    'אחה"צ (16:00-20:00)',
    'ערב (20:00-24:00)',
    'אחר'
  ];
  
  const experienceOptions = [
    'אין ניסיון קודם',
    'התנדבות קודמת בתחום דומה',
    'עבודה מקצועית בתחום הטיפול',
    'ניסיון בהקשבה והכלה',
    'אחר'
  ];

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    phone: "",
    location: "",
    age: "",
    gender: "",
    maritalStatus: "",
    profession: "",
    experience: "",
    availableDays: [],
    availableHours: [],
    strengths: "",
    motivation: "",
    agree: false
  });

  const [customInputs, setCustomInputs] = useState({
    gender: '',
    maritalStatus: '',
    profession: '',
    experience: '',
    availableHours: ''
  });

  const [showCustomInput, setShowCustomInput] = useState({
    gender: false,
    maritalStatus: false,
    profession: false,
    experience: false,
    availableHours: false
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Alert state
  const [alertMessage, setAlertMessage] = useState(null);

  // Navigation
  const navigate = useNavigate();

  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('custom_')) {
      const originalField = name.replace('custom_', '');
      setCustomInputs(prev => ({
        ...prev,
        [originalField]: value
      }));
      return;
    }
    
    setFormData(prev => {
      if (type === "checkbox") {
        // Handle arrays for availableDays and availableHours
        if (name === "availableDays" || name === "availableHours") {
          const array = Array.isArray(prev[name]) ? prev[name] : [];
          return {
            ...prev,
            [name]: checked ? [...array, value] : array.filter(v => v !== value)
          };
        }
        // Handle regular checkboxes
        return {
          ...prev,
          [name]: checked
        };
      }
      
      // Handle select inputs
      if (type === "select-one") {
        if (["gender", "maritalStatus", "profession", "experience"].includes(name)) {
          setShowCustomInput(prevShow => ({
            ...prevShow,
            [name]: value === "אחר"
          }));
          
          if (value !== "אחר") {
            // Clear custom input when a regular option is selected
            setCustomInputs(prevCustom => ({
              ...prevCustom,
              [name]: ''
            }));
            return {
              ...prev,
              [name]: value
            };
          } else {
            // Keep "אחר" as the field value when custom input is enabled
            return {
              ...prev,
              [name]: "אחר"
            };
          }
        }
        
        return {
          ...prev,
          [name]: value
        };
      }
      
      return {
        ...prev,
        [name]: value
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!formData.agree) {
      setAlertMessage({ message: "יש לאשר את ההצהרה כדי להמשיך", type: "error" });
      setLoading(false);
      return;
    }

    try {
      const userCred = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const uid = userCred.user.uid;
      
      const batch = writeBatch(db);
      
      const { password, ...formDataWithoutPassword } = formData;

      // Merge custom input values for fields with "אחר"
      const finalData = {
        ...formDataWithoutPassword,
        gender: formData.gender === "אחר" ? customInputs.gender : formData.gender,
        maritalStatus: formData.maritalStatus === "אחר" ? customInputs.maritalStatus : formData.maritalStatus,
        profession: formData.profession === "אחר" ? customInputs.profession : formData.profession,
        experience: formData.experience === "אחר" ? customInputs.experience : formData.experience,
        availableHours: formData.availableHours.includes('אחר') 
          ? [...formData.availableHours.filter(h => h !== 'אחר'), customInputs.availableHours] 
          : formData.availableHours,
        approved: "pending",
        personal: true,
        isAvailable: true,
        activeMatchIds: [],
        requestIds: [],
        createdAt: new Date(),
        lastActivity: serverTimestamp(),
      };

      // Add user data to Users/Info/Volunteers collection
      const userDocRef = doc(db, "Users", "Info", "Volunteers", uid);
      batch.set(userDocRef, finalData);

      // Increment the Volunteers counter in Users/Info
      const counterRef = doc(db, "Users", "Info");
      batch.set(counterRef, {
        Volunteers: increment(1)
      }, { merge: true });

      await batch.commit();
      
      setAlertMessage({ message: "נרשמת בהצלחה! בקשתך תיבדק על ידי מנהל המערכת.", type: "success", onClose: () => navigate("/") });
    } catch (error) {
      console.error(error);
      setAlertMessage({ message: "שגיאה: " + error.message, type: "error" });
    }
    setLoading(false);
  };

  const inputClassName = "w-full px-4 py-3 border-2 border-orange-200 rounded-lg focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none text-sm transition-all duration-200 bg-white/70 backdrop-blur-sm hover:border-orange-300";

  return (
    <RegisterLayout
      title="הרשמה כמתנדב"
      onSubmit={handleSubmit}
      loading={loading}
    >
      <div className="max-w-[400px] mx-auto space-y-4">
        {/* Basic Information */}
        <div className="space-y-4">
          <label htmlFor="email" className="block text-sm font-medium text-orange-700">אימייל</label>
          <input
            type="email"
            name="email"
            id="email"
            value={formData.email}
            onChange={handleChange}
            required
            className={inputClassName}
          />
          <label htmlFor="password" className="block text-sm font-medium text-orange-700">סיסמה</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              id="password"
              value={formData.password}
              onChange={handleChange}
              required
              className={`${inputClassName} pl-10`}
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 opacity-40 hover:opacity-80 transition-opacity duration-200"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        {/* Personal Information */}
        <div className="bg-orange-50/50 p-4 rounded-lg border border-orange-100 space-y-4">
          <h3 className="font-semibold text-orange-800 mb-2">פרטים אישיים</h3>
          <label htmlFor="fullName" className="block text-sm font-medium text-orange-700">שם מלא</label>
          <input
            type="text"
            name="fullName"
            id="fullName"
            value={formData.fullName}
            onChange={handleChange}
            required
            className={inputClassName}
          />
          
          {/* Stack all fields vertically */}
          <div className="space-y-4">
            {/* Gender Field */}
            <div>
              <label htmlFor="gender" className="block text-sm font-medium text-orange-700">מגדר</label>
              <select
                name="gender"
                id="gender"
                value={formData.gender || ""}
                onChange={handleChange}
                required
                className={`${inputClassName} bg-white`}
              >
                <option value="" disabled>בחר/י מגדר</option>
                {genderOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              {showCustomInput.gender && (
                <div className="mt-2">
                  {/* <label htmlFor="custom_gender" className="block text-sm font-medium text-orange-700">פרט/י מגדר</label> */}
                  <input
                    name="custom_gender"
                    id="custom_gender"
                    placeholder="פרט/י מגדר"
                    value={customInputs.gender}
                    onChange={handleChange}
                    className={inputClassName}
                  />
                </div>
              )}
            </div>

            {/* Age Field */}
            <label htmlFor="age" className="block text-sm font-medium text-orange-700">גיל</label>
            <input
              type="number"
              name="age"
              id="age"
              value={formData.age}
              onChange={handleChange}
              className={inputClassName}
            />

            {/* Marital Status Field */}
            <div>
              <label htmlFor="maritalStatus" className="block text-sm font-medium text-orange-700">מצב משפחתי</label>
              <select
                name="maritalStatus"
                id="maritalStatus"
                value={formData.maritalStatus || ""}
                onChange={handleChange}
                required
                className={`${inputClassName} bg-white`}
              >
                <option value="" disabled>בחר/י מצב משפחתי</option>
                {maritalStatusOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              {showCustomInput.maritalStatus && (
                <div className="mt-2">
                  <input
                    name="custom_maritalStatus"
                    id="custom_maritalStatus"
                    placeholder="פרט/י מצב משפחתי"
                    value={customInputs.maritalStatus}
                    onChange={handleChange}
                    className={inputClassName}
                  />
                </div>
              )}
            </div>

            {/* Profession Field */}
            <div>
              <label htmlFor="profession" className="block text-sm font-medium text-orange-700">מקצוע</label>
              <select
                name="profession"
                id="profession"
                value={formData.profession || ""}
                onChange={handleChange}
                required
                className={`${inputClassName} bg-white`}
              >
                <option value="" disabled>בחר/י מקצוע</option>
                {professionOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              {showCustomInput.profession && (
                <div className="mt-2">
                  <input
                    name="custom_profession"
                    id="custom_profession"
                    placeholder="פרט/י מקצוע"
                    value={customInputs.profession}
                    onChange={handleChange}
                    className={inputClassName}
                  />
                </div>
              )}
            </div>

            {/* Phone Field */}
            <label htmlFor="phone" className="block text-sm font-medium text-orange-700">טלפון</label>
            <input
              name="phone"
              id="phone"
              required
              value={formData.phone}
              onChange={handleChange}
              className={inputClassName}
            />

            {/* Location Field */}
            <label htmlFor="location" className="block text-sm font-medium text-orange-700">מקום מגורים</label>
            <input
              name="location"
              id="location"
              value={formData.location}
              onChange={handleChange}
              className={inputClassName}
            />
          </div>
        </div>

        {/* Experience and Availability */}
        <div className="bg-orange-50/50 p-4 rounded-lg border border-orange-100 space-y-4">
          <h3 className="font-semibold text-orange-800 mb-2">ניסיון וזמינות</h3>
          
          {/* Experience Field */}
          <div>
            <label htmlFor="experience" className="block text-sm font-medium text-orange-700">רמת ניסיון</label>
            <select
              name="experience"
              id="experience"
              value={formData.experience || ""}
              onChange={handleChange}
              required
              className={`${inputClassName} bg-white`}
            >
              <option value="" disabled>בחר/י רמת ניסיון</option>
              {experienceOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            {showCustomInput.experience && (
              <div className="mt-2">
                <label htmlFor="custom_experience" className="block text-sm font-medium text-orange-700">פרט/י את הניסיון שלך</label>
                <textarea
                  name="custom_experience"
                  id="custom_experience"
                  value={customInputs.experience}
                  onChange={handleChange}
                  rows="3"
                  className={inputClassName}
                />
              </div>
            )}
          </div>
          
          {/* Available Days */}
          <div>
            <label className="block text-sm font-medium text-orange-700 mb-2">
              ימים זמינים בשבוע
            </label>
            <div className="grid grid-cols-2 gap-2">
              {availableDaysOptions.map(day => (
                <label key={day} className="inline-flex items-center">
                  <input
                    type="checkbox"
                    name="availableDays"
                    value={day}
                    checked={formData.availableDays.includes(day)}
                    onChange={handleChange}
                    className="rounded border-orange-300 text-orange-600 focus:ring-orange-400"
                  />
                  <span className="mr-2 text-sm">{day}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Available Hours */}
          <div>
            <label className="block text-sm font-medium text-orange-700 mb-2">
              שעות זמינות
            </label>
            <div className="space-y-2">
              {availableHoursOptions.map(hour => (
                <label key={hour} className="inline-flex items-center w-full">
                  <input
                    type="checkbox"
                    name="availableHours"
                    value={hour}
                    checked={formData.availableHours.includes(hour)}
                    onChange={handleChange}
                    className="rounded border-orange-300 text-orange-600 focus:ring-orange-400"
                  />
                  <span className="mr-2 text-sm">{hour}</span>
                </label>
              ))}
            </div>
            {formData.availableHours.includes('אחר') && (
              <div className="mt-2">
                <input
                  name="custom_availableHours"
                  id="custom_availableHours"
                  placeholder="פרט/י שעות זמינות"
                  value={customInputs.availableHours}
                  onChange={handleChange}
                  className={inputClassName}
                />
              </div>
            )}
          </div>
        </div>

        {/* Motivation and Strengths */}
        <div className="bg-orange-50/50 p-4 rounded-lg border border-orange-100 space-y-4">
          <h3 className="font-semibold text-orange-800 mb-2">מוטיבציה וחוזקות</h3>
          <label htmlFor="strengths" className="block text-sm font-medium text-orange-700">מהם החוזקות שלך כאדם / כמתנדב?</label>
          <textarea
            name="strengths"
            id="strengths"
            value={formData.strengths}
            onChange={handleChange}
            rows="3"
            className={inputClassName}
          />
          <label htmlFor="motivation" className="block text-sm font-medium text-orange-700">מה מביא אותך להתנדב במסגרת כזו?</label>
          <textarea
            name="motivation"
            id="motivation"
            value={formData.motivation}
            onChange={handleChange}
            rows="3"
            className={inputClassName}
          />
        </div>

        <label className="flex items-start gap-2 text-orange-700">
          <input
            type="checkbox"
            name="agree"
            checked={formData.agree}
            onChange={handleChange}
            className="mt-1 rounded border-orange-300 text-orange-600 focus:ring-orange-400"
          />
          <span className="text-sm">
            אני מצהיר/ה כי כל הפרטים נכונים ואני מעוניין/ת להתנדב במסגרת "שיחות מהלב"
          </span>
        </label>
      </div>

      {/* Custom Alert */}
      <CustomAlert
        message={alertMessage?.message}
        onClose={alertMessage?.onClose || (() => setAlertMessage(null))}
        type={alertMessage?.type}
        position="bottom"
      />
    </RegisterLayout>
  );
}