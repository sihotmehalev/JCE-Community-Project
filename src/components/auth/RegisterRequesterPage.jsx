import React, { useState } from "react";
import { auth, db } from "../../config/firebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, increment, writeBatch, collection, serverTimestamp } from "firebase/firestore";
import RegisterLayout from "../layout/RegisterLayout";

export default function RegisterRequesterPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    onBehalfOf: "עצמי",
    behalfDetails: "",
    behalfName: "",
    gender: "",
    age: "",
    maritalStatus: "",
    location: "",
    phone: "",
    reason: "",
    needs: "",
    chatPref: [],
    frequency: [],
    preferredTimes: "",
    volunteerPrefs: "",
    agree1: false,
    agree2: false,
    agree3: false,
    note: ""
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const genderOptions = ['זכר', 'נקבה', 'אחר'];
  const maritalStatusOptions = ['רווק/ה', 'נשוי/אה', 'גרוש/ה', 'אלמן/ה', 'אחר'];
  const preferredTimesOptions = ['בוקר', 'צהריים', 'ערב', 'גמיש', 'אחר'];
  const [customInputs, setCustomInputs] = useState({
    gender: '',
    maritalStatus: '',
    preferredTimes: '',
    frequency: '',
    chatPref: ''
  });

  const [showCustomInput, setShowCustomInput] = useState({
    gender: false,
    maritalStatus: false,
    preferredTimes: false,
    frequency: false,
    chatPref: false
  });

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
    
    setFormData(prev => {      if (type === "checkbox") {
        // Handle checkbox groups (chatPref and frequency)
        if (name === "chatPref" || name === "frequency") {
          const array = Array.isArray(prev[name]) ? prev[name] : [];
          
          // Handle showing/hiding custom input when "אחר" is checked/unchecked
          if (value === "אחר") {
            setShowCustomInput(prevShow => ({
              ...prevShow,
              [name]: checked
            }));
            
            // Clear custom input when unchecking "אחר"
            if (!checked) {
              setCustomInputs(prevCustom => ({
                ...prevCustom,
                [name]: ''
              }));
            }
          }
          
          return {
            ...prev,
            [name]: checked ? [...array, value] : array.filter(v => v !== value)
          };
        }
        // Handle regular checkboxes (agree1, agree2, agree3)
        return {
          ...prev,
          [name]: checked
        };
      }
        // Handle select inputs
      if (type === "select-one") {
        if (name === "gender" || name === "maritalStatus" || name === "preferredTimes") {
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
            // Use the selected value directly
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
      
      // Handle all other input types
      return {
        ...prev,
        [name]: value
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Check if all agreements are checked
    if (!formData.agree1 || !formData.agree2 || !formData.agree3) {
      setMessage("יש לאשר את כל התנאים כדי להמשיך");
      setLoading(false);
      return;
    }

    try {
      const userCred = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const uid = userCred.user.uid;
        const batch = writeBatch(db);
        // Merge custom input values for fields with "אחר"

      const { password, ...formDataWithoutPassword } = formData;
      
      const finalData = {
        ...formDataWithoutPassword,
        gender: formData.gender === "אחר" ? customInputs.gender : formData.gender,
        maritalStatus: formData.maritalStatus === "אחר" ? customInputs.maritalStatus : formData.maritalStatus,
        preferredTimes: formData.preferredTimes === "אחר" ? customInputs.preferredTimes : formData.preferredTimes,
        // Add custom inputs for checkbox groups if "אחר" is selected
        frequency: formData.frequency.includes("אחר") ? 
          formData.frequency.filter(f => f !== "אחר").concat(customInputs.frequency) : 
          formData.frequency,
        chatPref: formData.chatPref.includes("אחר") ? 
          formData.chatPref.filter(c => c !== "אחר").concat(customInputs.chatPref) : 
          formData.chatPref,
        personal: true,
        activeMatchId: null,
        createdAt: new Date(),
      };      // Add user data to Users/Info/Requesters collection
      const userDocRef = doc(db, "Users", "Info", "Requesters", uid);
      batch.set(userDocRef, finalData);

      // Create initial request document
      const requestRef = doc(collection(db, "Requests"));
      batch.set(requestRef, {
        requesterId: uid,
        volunteerId: null,
        matchId: null,
        status: "waiting_for_first_approval",
        createdAt: serverTimestamp(),
      });

      // Increment the Requesters counter in Users/Info
      const counterRef = doc(db, "Users", "Info");
      batch.set(counterRef, {
        Requesters: increment(1)
      }, { merge: true });

      await batch.commit();
      
      setMessage("נרשמת בהצלחה!");
    } catch (error) {
      console.error(error);
      setMessage("שגיאה: " + error.message);
    }
    setLoading(false);
  };

  const inputClassName = "w-full px-4 py-3 border-2 border-orange-200 rounded-lg focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none text-sm transition-all duration-200 bg-white/70 backdrop-blur-sm hover:border-orange-300";

  return (
    <RegisterLayout
      title="הרשמה כפונה"
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
          <select
            name="onBehalfOf"
            value={formData.onBehalfOf}
            onChange={handleChange}
            className={`${inputClassName} bg-white`}
          >
            <option value="עצמי">פונה עבור עצמי</option>
            <option value="אדם אחר בידיעתו">פונה עבור אחר בידיעתו</option>
            <option value="אדם אחר ללא ידיעתו">פונה עבור אחר ללא ידיעתו</option>
          </select>

          {formData.onBehalfOf !== "עצמי" && (
            <div className="space-y-4">
              <input
                name="behalfName"
                placeholder="שם האדם שעבורו הפנייה"
                value={formData.behalfName}
                onChange={handleChange}
                className={inputClassName}
              />
              <textarea
                name="behalfDetails"
                placeholder="רקע ומספר טלפון (אם מדובר באחר)"
                value={formData.behalfDetails}
                onChange={handleChange}
                rows="2"
                className={inputClassName}
              />
            </div>
          )}

          {/* Fixed layout - each field in separate row to prevent shifts */}
          <div className="space-y-4">
            {/* Gender field */}
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

            {/* Age field */}
            <input
              name="age"
              placeholder="גיל"
              value={formData.age}
              onChange={handleChange}
              className={inputClassName}
            />

            {/* Marital Status field */}
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

            {/* Location field */}
            <input
              name="location"
              placeholder="מקום מגורים"
              value={formData.location}
              onChange={handleChange}
              className={inputClassName}
            />

            {/* Phone field */}
            <input
              name="phone"
              placeholder="טלפון"
              value={formData.phone}
              onChange={handleChange}
              className={inputClassName}
            />
          </div>
        </div>

        {/* Support Needs */}
        <div className="bg-orange-50/50 p-4 rounded-lg border border-orange-100 space-y-4">
          <h3 className="font-semibold text-orange-800 mb-2">פרטי הפנייה</h3>
          <textarea
            name="reason"
            placeholder="סיבת הפנייה"
            value={formData.reason}
            onChange={handleChange}
            rows="3"
            className={inputClassName}
          />
          <textarea
            name="needs"
            placeholder="מה הצורך שלך בתמיכה?"
            value={formData.needs}
            onChange={handleChange}
            rows="3"
            className={inputClassName}
          />
        </div>

        {/* Preferences */}
        <div className="bg-orange-50/50 p-4 rounded-lg border border-orange-100 space-y-4">
          <h3 className="font-semibold text-orange-800 mb-2">העדפות</h3>
          <fieldset>
            <legend className="font-medium text-orange-700 mb-2">העדפות לשיחה:</legend>            <div className="space-y-2">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {['טלפון', 'וידאו', 'בהתכתבות', 'פרונטלית', 'אחר'].map((opt) => (
                  <label key={opt} className="flex items-center gap-2 text-orange-700">
                    <input
                      type="checkbox"
                      name="chatPref"
                      value={opt}
                      checked={formData.chatPref.includes(opt)}
                      onChange={handleChange}
                      className="rounded border-orange-300 text-orange-600 focus:ring-orange-400"
                    />
                    {opt}
                  </label>
                ))}
              </div>
              {showCustomInput.chatPref && (
                <input
                  name="custom_chatPref"
                  placeholder="פרט/י אפשרות נוספת"
                  value={customInputs.chatPref}
                  onChange={handleChange}
                  className={inputClassName}
                />
              )}
            </div>
          </fieldset>
          <fieldset>
            <legend className="font-medium text-orange-700 mb-2">העדפות תדירות:</legend>            <div className="space-y-2">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {['פעם בשבוע', 'פעם בשבועיים', 'אחר'].map((opt) => (
                  <label key={opt} className="flex items-center gap-2 text-orange-700">
                    <input
                      type="checkbox"
                      name="frequency"
                      value={opt}
                      checked={formData.frequency.includes(opt)}
                      onChange={handleChange}
                      className="rounded border-orange-300 text-orange-600 focus:ring-orange-400"
                    />
                    {opt}
                  </label>
                ))}
              </div>
              {showCustomInput.frequency && (
                <input
                  name="custom_frequency"
                  placeholder="פרט/י תדירות אחרת"
                  value={customInputs.frequency}
                  onChange={handleChange}
                  className={inputClassName}
                />
              )}
            </div>
          </fieldset>
          <div className="space-y-2">
            <select
              name="preferredTimes"
              value={formData.preferredTimes || ""}
              onChange={handleChange}
              required
              className={`${inputClassName} bg-white`}
            >
              <option value="" disabled>בחר/י זמנים מועדפים</option>
              {preferredTimesOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            {showCustomInput.preferredTimes && (
              <input
                name="custom_preferredTimes"
                placeholder="פרט/י זמנים מועדפים"
                value={customInputs.preferredTimes}
                onChange={handleChange}
                className={inputClassName}
              />
            )}
          </div>
          <textarea
            name="volunteerPrefs"
            placeholder="העדפות במתנדב/ת (מגדר, גיל, רקע וכו')"
            value={formData.volunteerPrefs}
            onChange={handleChange}
            rows="2"
            className={inputClassName}
          />
        </div>

        {/* Agreements */}
        <div className="space-y-2">
          <label className="flex items-start gap-2 text-orange-700">
            <input
              type="checkbox"
              name="agree1"
              checked={formData.agree1}
              onChange={handleChange}
              className="mt-1 rounded border-orange-300 text-orange-600 focus:ring-orange-400"
            />
            <span className="text-sm">ידוע לי שבמסגרת הפרויקט לא ניתנים טיפול פסיכולוגי וייעוץ מקצועי ומתנדבים לא נושאים באחריות של אנשי מקצוע</span>
          </label>
          <label className="flex items-start gap-2 text-orange-700">
            <input
              type="checkbox"
              name="agree2"
              checked={formData.agree2}
              onChange={handleChange}
              className="mt-1 rounded border-orange-300 text-orange-600 focus:ring-orange-400"
            />
            <span className="text-sm">ידוע לי שתהליך טיפול בפנייה והתאמת מענה יכול לקחת זמן ויכול להיות שלא יהיה מענה מתאים</span>
          </label>
          <label className="flex items-start gap-2 text-orange-700">
            <input
              type="checkbox"
              name="agree3"
              checked={formData.agree3}
              onChange={handleChange}
              className="mt-1 rounded border-orange-300 text-orange-600 focus:ring-orange-400"
            />
            <span className="text-sm">ידוע לי שפנייה לפרויקט הינה מתוך בחירה, לפי שיקול דעת ובאחריות הפונים בלבד</span>
          </label>
        </div>

        <textarea
          name="note"
          placeholder="משהו מהלב..."
          value={formData.note}
          onChange={handleChange}
          rows="2"
          className={inputClassName}
        />
      </div>
    </RegisterLayout>
  );
}