// RegisterVolunteerPage.jsx - טופס הרשמה למתנדבים ברמה מקצועית
import React, { useState } from "react";
import { auth, db } from "../firebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, getDoc, increment, writeBatch } from "firebase/firestore";
import RegisterLayout from "./RegisterLayout";

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
  const [message, setMessage] = useState("");

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
      setMessage("יש לאשר את ההצהרה כדי להמשיך");
      setLoading(false);
      return;
    }

    try {
      const userCred = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const uid = userCred.user.uid;
      
      const batch = writeBatch(db);
      
      // Merge custom input values for fields with "אחר"
      const finalData = {
        ...formData,
        gender: formData.gender === "אחר" ? customInputs.gender : formData.gender,
        maritalStatus: formData.maritalStatus === "אחר" ? customInputs.maritalStatus : formData.maritalStatus,
        profession: formData.profession === "אחר" ? customInputs.profession : formData.profession,
        experience: formData.experience === "אחר" ? customInputs.experience : formData.experience,
        availableHours: formData.availableHours.includes('אחר') 
          ? [...formData.availableHours.filter(h => h !== 'אחר'), customInputs.availableHours] 
          : formData.availableHours,
        approved: false,
        isAvailable: true,
        activeMatchIds: [],
        requestIds: [],
        createdAt: new Date(),
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
      
      setMessage("נרשמת בהצלחה! בקשתך תיבדק על ידי מנהל המערכת.");
    } catch (error) {
      console.error(error);
      setMessage("שגיאה: " + error.message);
    }
    setLoading(false);
  };

  const inputClassName = "w-full px-4 py-3 border-2 border-orange-200 rounded-lg focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none text-sm transition-all duration-200 bg-white/70 backdrop-blur-sm hover:border-orange-300";

  return (
    <RegisterLayout
      title="הרשמה כמתנדב"
      onSubmit={handleSubmit}
      loading={loading}
      message={message}
    >
      <div className="max-w-[400px] mx-auto space-y-4">
        {/* Basic Information */}
        <div className="space-y-4">
          <input
            type="email"
            name="email"
            placeholder="אימייל"
            value={formData.email}
            onChange={handleChange}
            required
            className={inputClassName}
          />
          <input
            type="password"
            name="password"
            placeholder="סיסמה"
            value={formData.password}
            onChange={handleChange}
            required
            className={inputClassName}
          />
        </div>

        {/* Personal Information */}
        <div className="bg-orange-50/50 p-4 rounded-lg border border-orange-100 space-y-4">
          <h3 className="font-semibold text-orange-800 mb-2">פרטים אישיים</h3>
          <input
            type="text"
            name="fullName"
            placeholder="שם מלא"
            value={formData.fullName}
            onChange={handleChange}
            required
            className={inputClassName}
          />
          
          {/* Stack all fields vertically */}
          <div className="space-y-4">
            {/* Gender Field */}
            <div>
              <select
                name="gender"
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
                  <input
                    name="custom_gender"
                    placeholder="פרט/י מגדר"
                    value={customInputs.gender}
                    onChange={handleChange}
                    className={inputClassName}
                  />
                </div>
              )}
            </div>

            {/* Age Field */}
            <input
              name="age"
              placeholder="גיל"
              value={formData.age}
              onChange={handleChange}
              className={inputClassName}
            />

            {/* Marital Status Field */}
            <div>
              <select
                name="maritalStatus"
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
              <select
                name="profession"
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
                    placeholder="פרט/י מקצוע"
                    value={customInputs.profession}
                    onChange={handleChange}
                    className={inputClassName}
                  />
                </div>
              )}
            </div>

            {/* Phone Field */}
            <input
              name="phone"
              placeholder="טלפון"
              value={formData.phone}
              onChange={handleChange}
              className={inputClassName}
            />

            {/* Location Field */}
            <input
              name="location"
              placeholder="מקום מגורים"
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
            <select
              name="experience"
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
                <textarea
                  name="custom_experience"
                  placeholder="פרט/י את הניסיון שלך"
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
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
          <textarea
            name="strengths"
            placeholder="מהם החוזקות שלך כאדם / כמתנדב?"
            value={formData.strengths}
            onChange={handleChange}
            rows="3"
            className={inputClassName}
          />
          <textarea
            name="motivation"
            placeholder="מה מביא אותך להתנדב במסגרת כזו?"
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
    </RegisterLayout>
  );
}