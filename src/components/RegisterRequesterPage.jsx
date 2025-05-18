import React, { useState } from "react";
import { auth, db } from "../firebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import RegisterLayout from "./RegisterLayout";

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

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? (checked ? [...prev[name], value] : prev[name].filter(v => v !== value)) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.agree1 || !formData.agree2 || !formData.agree3) {
      setMessage("יש לאשר את כל תנאי השימוש");
      return;
    }
    setLoading(true);
    try {
      const userCred = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const uid = userCred.user.uid;
      await setDoc(doc(db, "users", uid), {
        ...formData,
        role: "requester",
        approved: true,
        createdAt: new Date(),
      });
      setMessage("נרשמת בהצלחה! תועבר לדף ההתחברות.");
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              name="gender"
              placeholder="מגדר"
              value={formData.gender}
              onChange={handleChange}
              className={inputClassName}
            />
            <input
              name="age"
              placeholder="גיל"
              value={formData.age}
              onChange={handleChange}
              className={inputClassName}
            />
            <input
              name="maritalStatus"
              placeholder="מצב משפחתי"
              value={formData.maritalStatus}
              onChange={handleChange}
              className={inputClassName}
            />
            <input
              name="location"
              placeholder="מקום מגורים"
              value={formData.location}
              onChange={handleChange}
              className={inputClassName}
            />
            <input
              type="tel"
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
            <legend className="font-medium text-orange-700 mb-2">העדפות לשיחה:</legend>
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
          </fieldset>
          <fieldset>
            <legend className="font-medium text-orange-700 mb-2">העדפות תדירות:</legend>
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
          </fieldset>
          <input
            name="preferredTimes"
            placeholder="זמנים נוחים לשיחה"
            value={formData.preferredTimes}
            onChange={handleChange}
            className={inputClassName}
          />
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
            <span className="text-sm">ידוע לי שאין מדובר בטיפול מקצועי</span>
          </label>
          <label className="flex items-start gap-2 text-orange-700">
            <input
              type="checkbox"
              name="agree2"
              checked={formData.agree2}
              onChange={handleChange}
              className="mt-1 rounded border-orange-300 text-orange-600 focus:ring-orange-400"
            />
            <span className="text-sm">ידוע לי שלא תמיד יימצא מענה</span>
          </label>
          <label className="flex items-start gap-2 text-orange-700">
            <input
              type="checkbox"
              name="agree3"
              checked={formData.agree3}
              onChange={handleChange}
              className="mt-1 rounded border-orange-300 text-orange-600 focus:ring-orange-400"
            />
            <span className="text-sm">אני לוקח/ת אחריות על הפנייה</span>
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
