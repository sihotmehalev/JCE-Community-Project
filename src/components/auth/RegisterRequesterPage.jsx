import React, { useState, useEffect } from "react";
import { auth, db } from "../../config/firebaseConfig";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, increment, writeBatch, collection, serverTimestamp, getDoc } from "firebase/firestore";
import RegisterLayout from "../layout/RegisterLayout"; // Assuming this is the correct layout
import { Eye, EyeOff } from 'lucide-react';
import CustomAlert from "../ui/CustomAlert";
import { useNavigate } from "react-router-dom";

export default function RegisterRequesterPage() {
  const navigate = useNavigate();
  const [alertMessage, setAlertMessage] = useState(null);
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
    agree4: false,
    note: ""
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // Ensure adminConfig is initialized correctly to avoid undefined errors before fetch
  const [adminConfig, setAdminConfig] = useState({
    hideNoteField: false,
    customFields: []
  });
  const [adminConfigLoading, setAdminConfigLoading] = useState(true);

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

  useEffect(() => {
    const fetchAdminConfig = async () => {
      setAdminConfigLoading(true);
      try {
        const configDocRef = doc(db, "admin_form_configs", "requester_config");
        const docSnap = await getDoc(configDocRef);
        if (docSnap.exists()) {
          const configData = docSnap.data() || {}; // Ensure configData is an object
          
          const customFields = Array.isArray(configData.customFields) ? configData.customFields : [];
          
          // Ensure customFields is always an array and hideNoteField has a default
          setAdminConfig({
            hideNoteField: configData.hideNoteField === true, // Explicitly check for true
            customFields: customFields,
          });

          // Initialize formData with default values for custom fields
          const initialCustomData = {};
          customFields.forEach(field => {
            if (field.name) { // Ensure field has a name
                if (field.type === 'checkbox' && !field.isArray) {
                    initialCustomData[field.name] = field.defaultValue || false;
                } else {
                    initialCustomData[field.name] = field.defaultValue || '';
                }
            }
          });
          setFormData(prev => ({ ...prev, ...initialCustomData }));

        } else {
          setAdminConfig({ hideNoteField: false, customFields: [] }); // Explicitly set defaults
        }
      } catch (error) {
        console.error("[RegisterRequesterPage] Error fetching requester admin config:", error);
      }
      setAdminConfigLoading(false);
    };
    fetchAdminConfig();
  }, []);

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

    if (name === "phone") {
        const numericValue = value.replace(/[^0-9]/g, '');
        setFormData(prev => ({ ...prev, [name]: numericValue }));
        return;
    }

    setFormData(prev => {
      // Handle admin-defined custom fields
      // Ensure adminConfig and customFields are defined before trying to find a field
      const adminField = adminConfig?.customFields?.find(field => field.name === name);
      if (adminField) {
        if (adminField.type === "checkbox" && !adminField.isArray) { // Simple boolean checkbox
             return { ...prev, [name]: checked };
        }
        return { ...prev, [name]: value };
      }

      if (type === "checkbox") {
        // Handle checkbox groups (chatPref and frequency)
        if (name === "chatPref" || name === "frequency") {
          const array = Array.isArray(prev[name]) ? prev[name] : [];
          
          if (value === "אחר") {
            setShowCustomInput(prevShow => ({
              ...prevShow,
              [name]: checked
            }));
            
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
        // Handle regular checkboxes (agree1, agree2, agree3, agree4)
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
            setCustomInputs(prevCustom => ({
              ...prevCustom,
              [name]: ''
            }));
            return {
              ...prev,
              [name]: value
            };
          } else {
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
    setAlertMessage(null);

    if (!formData.agree1 || !formData.agree2 || !formData.agree3 || !formData.agree4) {
      setAlertMessage({ message: "יש לאשר את כל התנאים כדי להמשיך", type: "error" });
      setLoading(false);
      return;
    }

    const phoneRegex = /^\d{3}(?:-)?(?:\d{4})(?:-)?(?:\d{3})$/;
    if (!formData.phone || !phoneRegex.test(formData.phone)) {
      setAlertMessage({ message: "יש להזין מספר טלפון תקין בעל 10 ספרות.", type: "error" });
      setLoading(false);
      return;
    }

    if (adminConfigLoading) {
      setAlertMessage({ message: "עדיין טוען הגדרות טופס, אנא המתן...", type: "info" });
      setLoading(false);
      return;
    }

    try {
      const userCred = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const uid = userCred.user.uid;
        const batch = writeBatch(db);

      const { password, ...formDataWithoutPasswordAndAdmin } = formData;

      const customFieldData = {};
      if (adminConfig?.customFields) {
        adminConfig.customFields.forEach(field => {
          if (formData[field.name] !== undefined) {
            customFieldData[field.name] = formData[field.name];
          } else if (field.type === 'checkbox' && !field.isArray && field.required === false) {
            customFieldData[field.name] = false; 
          }
        });
      }
      const finalData = {
        ...formDataWithoutPasswordAndAdmin,
        ...customFieldData,
        gender: formData.gender === "אחר" ? customInputs.gender : formData.gender,
        maritalStatus: formData.maritalStatus === "אחר" ? customInputs.maritalStatus : formData.maritalStatus,
        preferredTimes: formData.preferredTimes === "אחר" ? customInputs.preferredTimes : formData.preferredTimes,
        frequency: formData.frequency.includes("אחר") ? 
          formData.frequency.filter(f => f !== "אחר").concat(customInputs.frequency) : 
          formData.frequency,
        chatPref: formData.chatPref.includes("אחר") ? 
          formData.chatPref.filter(c => c !== "אחר").concat(customInputs.chatPref) : 
          formData.chatPref,
        personal: true,
        activeMatchId: null,
        approved: true,
        createdAt: serverTimestamp(),
        lastActivity: serverTimestamp(),
        role: "requester"
      };
      
      if (adminConfig?.hideNoteField === true) {
        delete finalData.note;
      }
      const userDocRef = doc(db, "Users", "Info", "Requesters", uid);
      batch.set(userDocRef, finalData);

      const requestRef = doc(collection(db, "Requests"));
      batch.set(requestRef, {
        requesterId: uid,
        volunteerId: null,
        matchId: null,
        reason: formData.reason,
        needs: formData.needs,
        status: "waiting_for_first_approval",
        createdAt: serverTimestamp(),
      });

      const counterRef = doc(db, "Users", "Info");
      batch.set(counterRef, {
        Requesters: increment(1)
      }, { merge: true });

      await batch.commit();
      
      await signOut(auth);

      setAlertMessage({ message: "נרשמת בהצלחה!", type: "success", onClose: () => navigate("/requester-dashboard") });
    } catch (error) {
      console.error("Registration error:", error);
      let specificMessage = "שגיאה ברישום: " + error.message;
      if (error.code === 'auth/email-already-in-use') {
        specificMessage = 'כתובת אימייל זו כבר רשומה במערכת.';
      } else if (error.code === 'auth/weak-password') {
        specificMessage = 'הסיסמה חלשה מדי. אנא בחר סיסמה באורך 6 תווים לפחות.';
      }
      setAlertMessage({ message: specificMessage, type: "error" });
    }
    setLoading(false);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  const inputClassName = "w-full px-4 py-3 border-2 border-orange-200 rounded-lg focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none text-sm transition-all duration-200 bg-white/70 backdrop-blur-sm hover:border-orange-300";

  const renderAdminFields = () => {
    if (adminConfigLoading) {
      return <p className="text-sm text-orange-600">טוען שדות נוספים...</p>;
    }
    // More robust check: ensure adminConfig exists, customFields is an array, and it's not empty.
    if (!adminConfig || !Array.isArray(adminConfig.customFields) || adminConfig.customFields.length === 0) {
      return null;
    }

    return adminConfig.customFields.map(field => {
      if (!field || typeof field !== 'object' || !field.name || !field.label || !field.type) { // Basic check for field validity
        console.warn("[RegisterRequesterPage] Invalid custom field object:", field);
        return null;
      }
      if (!['text', 'textarea', 'select', 'checkbox', 'number', 'date'].includes(field.type)) {
          console.warn(`[RegisterRequesterPage] Unsupported field type "${field.type}" for field "${field.name}". Skipping.`);
          return null;
      }

      const commonProps = {
        name: field.name,
        id: field.name,
        onChange: handleChange,
        required: field.required || false,
        className: inputClassName,
        placeholder: field.placeholder || field.label,
        value: formData[field.name] || "", // Ensure formData has this key or defaults to empty string
      };

      return (
        <div key={field.name} className="space-y-1">
          <label htmlFor={field.name} className="block text-sm font-medium text-orange-700">
            {field.label} {commonProps.required && <span className="text-red-500">*</span>}
          </label>
          {field.type === 'text' && <input type="text" {...commonProps} />}
          {field.type === 'textarea' && <textarea {...commonProps} rows={field.rows || 3} />}
          {field.type === 'select' && (
            <select {...commonProps} className={`${inputClassName} bg-white`}>
              <option value="">{field.placeholder || `בחר/י ${field.label}`}</option> {/* Allow unselecting */}
              {field.options?.map(opt => ( 
                <option key={opt.value || opt} value={opt.value || opt}>{opt.label || opt}</option>
              ))}
            </select>
          )}
          {field.type === 'checkbox' && !field.isArray && ( 
            <div className="flex items-center gap-2 mt-1">
              <input
                type="checkbox"
                name={field.name} 
                id={field.name}   
                checked={!!formData[field.name]} 
                onChange={handleChange}
                required={field.required || false} 
                className="h-4 w-4 rounded border-orange-300 text-orange-600 focus:ring-orange-400"
              />
            </div>
          )}
          {field.type === 'number' && <input type="number" {...commonProps} />}
          {field.type === 'date' && <input type="date" {...commonProps} />}
        </div>
      );
    });
  };

  return (
    <RegisterLayout
      title="הרשמה כפונה"
      onSubmit={handleSubmit}
      loading={loading || adminConfigLoading} 
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
        <div className="bg-orange-50/50 p-4 rounded-lg border border-orange-100 space-y-4">          <h3 className="font-semibold text-orange-800 mb-2">פרטים אישיים</h3>
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
          <label htmlFor="onBehalfOf" className="block text-sm font-medium text-orange-700">פונה עבור</label>
          <select
            name="onBehalfOf"
            id="onBehalfOf"
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
                id="behalfName"
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

          <div className="space-y-4">
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

            <label htmlFor="age" className="block text-sm font-medium text-orange-700">גיל</label>
            <input
              type="number"
              name="age"
              id="age"
              value={formData.age}
              onChange={handleChange}
              className={inputClassName}
            />

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

            <label htmlFor="location" className="block text-sm font-medium text-orange-700">מקום מגורים</label>
            <input
              name="location"
              id="location"
              value={formData.location}
              onChange={handleChange}
              className={inputClassName}
            />

            <label htmlFor="phone" className="block text-sm font-medium text-orange-700">טלפון</label>
            <input
              type="tel"
              name="phone"
              id="phone"
              required
              value={formData.phone}
              onChange={handleChange}
              pattern="[0-9]*"
              className={inputClassName}
            />
          </div>
        </div>        {/* Support Needs */}
        <div className="bg-orange-50/50 p-4 rounded-lg border border-orange-100 space-y-4">
          <h3 className="font-semibold text-orange-800 mb-2">פרטי הפנייה</h3>
          <label htmlFor="reason" className="block text-sm font-medium text-orange-700">סיבת הפנייה</label>
          <textarea
            name="reason"
            id="reason"
            value={formData.reason}
            onChange={handleChange}
            rows="3"
            className={inputClassName}
          />
          <label htmlFor="needs" className="block text-sm font-medium text-orange-700">מה הצורך שלך בתמיכה?</label>
          <textarea
            name="needs"
            id="needs"
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
            <legend className="font-medium text-orange-700 mb-2">העדפות לשיחה:</legend>
            <div className="space-y-2">
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
              </div>              {showCustomInput.chatPref && (
                <div className="mt-2">
                  <input
                    name="custom_chatPref"
                    id="custom_chatPref"
                    placeholder="פרט/י אפשרות נוספת"
                    value={customInputs.chatPref}
                    onChange={handleChange}
                    className={inputClassName}
                  />
                </div>
              )}
            </div>
          </fieldset>
          <fieldset>
            <legend className="font-medium text-orange-700 mb-2">העדפות תדירות:</legend>
            <div className="space-y-2">
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
              </div>              {showCustomInput.frequency && (
                <div className="mt-2">
                  <input
                    name="custom_frequency"
                    id="custom_frequency"
                    placeholder="פרט/י תדירות אחרת"
                    value={customInputs.frequency}
                    onChange={handleChange}
                    className={inputClassName}
                  />
                </div>
              )}
            </div>
          </fieldset>          <div className="space-y-2">
            <label htmlFor="preferredTimes" className="block text-sm font-medium text-orange-700">זמנים מועדפים</label>
            <select
              name="preferredTimes"
              id="preferredTimes"
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
              <div className="mt-2">
                <input
                  name="custom_preferredTimes"
                  id="custom_preferredTimes"
                  placeholder="פרט/י זמנים מועדפים"
                  value={customInputs.preferredTimes}
                  onChange={handleChange}
                  className={inputClassName}
                />
              </div>
            )}
          </div>
          <label htmlFor="volunteerPrefs" className="block text-sm font-medium text-orange-700">העדפות במתנדב/ת</label>
          <textarea
            name="volunteerPrefs"
            id="volunteerPrefs"
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
          <label className="flex items-start gap-2 text-orange-700">
            <input
              type="checkbox"
              name="agree4"
              checked={formData.agree4}
              onChange={handleChange}
              className="mt-1 rounded border-orange-300 text-orange-600 focus:ring-orange-400"
            />
            <span className="text-sm">ידוע לי כי הפלטפורמה מאפשרת שיחה עם בינה מלאכותית (AI), וכי השימוש באפשרות זו נעשה באחריותי בלבד. השיחה עם ה-AI אינה מהווה תחליף לייעוץ מקצועי.</span>
          </label>
        </div>

        {/* Admin Defined Custom Fields */}
        {/* Stricter check for rendering custom fields section */}
        {!adminConfigLoading && adminConfig && Array.isArray(adminConfig.customFields) && adminConfig.customFields.length > 0 && (
          <div className="bg-orange-50/50 p-4 rounded-lg border border-orange-100 space-y-4">
            <h3 className="font-semibold text-orange-800 mb-2">פרטים נוספים</h3>
            {renderAdminFields()}
          </div>
        )}

        {/* Note field - conditional rendering based on admin config. Ensure adminConfig is defined. */}
        {/* Stricter check for rendering note field */}
        {!adminConfigLoading && adminConfig && typeof adminConfig.hideNoteField === 'boolean' && adminConfig.hideNoteField === false && (
            <div className="space-y-1">
              <label htmlFor="note" className="block text-sm font-medium text-orange-700">משהו מהלב... (אופציונלי)</label>
              <textarea
                name="note"
                id="note"
                placeholder="כל דבר שתרצה/י להוסיף..."
                value={formData.note}
                onChange={handleChange}
                rows="3"
                className={inputClassName}
              />
            </div>
          )}
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
