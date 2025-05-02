// RegisterRequesterPage.jsx - טופס הרשמה מעודכן לפי Google Form
import React, { useState } from "react";
import { auth, db } from "../firebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";

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
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox" && name.startsWith("agree")) {
      setFormData({ ...formData, [name]: checked });
    } else if (type === "checkbox") {
      setFormData({
        ...formData,
        [name]: formData[name].includes(value)
          ? formData[name].filter((v) => v !== value)
          : [...formData[name], value],
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.agree1 || !formData.agree2 || !formData.agree3) {
      setMessage("יש לאשר את כל ההצהרות.");
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
      setMessage("נרשמת בהצלחה! תוכל להתחבר כעת.");
    } catch (error) {
      console.error(error);
      setMessage("שגיאה: " + error.message);
    }
    setLoading(false);
  };

  return (
    <div className="flex justify-center py-8">
      <Card className="w-full max-w-3xl shadow-xl">
        <CardContent>
          <h2 className="text-2xl font-bold text-center mb-6 text-orange-800">טופס הרשמה כפונה</h2>
          <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleSubmit}>
            {/* Basic Information */}
            <div className="col-span-2 bg-orange-50/50 p-4 rounded-lg border border-orange-100 space-y-4">
              <h3 className="font-semibold text-orange-800 mb-2">פרטי התחברות</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input 
                  name="email" 
                  type="email" 
                  required 
                  placeholder="אימייל" 
                  value={formData.email} 
                  onChange={handleChange} 
                  className="border border-orange-200 p-2 rounded-md focus:border-orange-400 focus:ring-1 focus:ring-orange-400 outline-none" 
                />
                <input 
                  name="password" 
                  type="password" 
                  required 
                  placeholder="סיסמה" 
                  value={formData.password} 
                  onChange={handleChange} 
                  className="border border-orange-200 p-2 rounded-md focus:border-orange-400 focus:ring-1 focus:ring-orange-400 outline-none" 
                />
              </div>
            </div>

            {/* Personal Information */}
            <div className="col-span-2 bg-orange-50/50 p-4 rounded-lg border border-orange-100 space-y-4">
              <h3 className="font-semibold text-orange-800 mb-2">פרטים אישיים</h3>
              <input 
                name="fullName" 
                required 
                placeholder="שם מלא" 
                value={formData.fullName} 
                onChange={handleChange} 
                className="w-full border border-orange-200 p-2 rounded-md focus:border-orange-400 focus:ring-1 focus:ring-orange-400 outline-none" 
              />
              <select 
                name="onBehalfOf" 
                value={formData.onBehalfOf} 
                onChange={handleChange} 
                className="w-full border border-orange-200 p-2 rounded-md focus:border-orange-400 focus:ring-1 focus:ring-orange-400 outline-none bg-white text-orange-700"
              >
                <option value="עצמי">פונה עבור עצמי</option>
                <option value="אדם אחר בידיעתו">פונה עבור אחר בידיעתו</option>
                <option value="אדם אחר ללא ידיעתו">פונה עבור אחר ללא ידיעתו</option>
              </select>
              {formData.onBehalfOf !== "עצמי" && (
                <div className="space-y-4">
                  <input 
                    name="behalfDetails" 
                    placeholder="רקע ומספר טלפון (אם מדובר באחר)" 
                    value={formData.behalfDetails} 
                    onChange={handleChange} 
                    className="w-full border border-orange-200 p-2 rounded-md focus:border-orange-400 focus:ring-1 focus:ring-orange-400 outline-none" 
                  />
                  <input 
                    name="behalfName" 
                    placeholder="שם האדם שעבורו הפנייה" 
                    value={formData.behalfName} 
                    onChange={handleChange} 
                    className="w-full border border-orange-200 p-2 rounded-md focus:border-orange-400 focus:ring-1 focus:ring-orange-400 outline-none" 
                  />
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input name="gender" placeholder="מגדר" value={formData.gender} onChange={handleChange} className="border border-orange-200 p-2 rounded-md focus:border-orange-400 focus:ring-1 focus:ring-orange-400 outline-none" />
                <input name="age" placeholder="גיל" value={formData.age} onChange={handleChange} className="border border-orange-200 p-2 rounded-md focus:border-orange-400 focus:ring-1 focus:ring-orange-400 outline-none" />
                <input name="maritalStatus" placeholder="מצב משפחתי" value={formData.maritalStatus} onChange={handleChange} className="border border-orange-200 p-2 rounded-md focus:border-orange-400 focus:ring-1 focus:ring-orange-400 outline-none" />
                <input name="location" placeholder="מקום מגורים" value={formData.location} onChange={handleChange} className="border border-orange-200 p-2 rounded-md focus:border-orange-400 focus:ring-1 focus:ring-orange-400 outline-none" />
                <input name="phone" placeholder="טלפון" value={formData.phone} onChange={handleChange} className="border border-orange-200 p-2 rounded-md focus:border-orange-400 focus:ring-1 focus:ring-orange-400 outline-none" />
              </div>
            </div>

            {/* Support Needs */}
            <div className="col-span-2 bg-orange-50/50 p-4 rounded-lg border border-orange-100 space-y-4">
              <h3 className="font-semibold text-orange-800 mb-2">פרטי הפנייה</h3>
              <textarea name="reason" placeholder="סיבת הפנייה" value={formData.reason} onChange={handleChange} className="w-full border border-orange-200 p-2 rounded-md focus:border-orange-400 focus:ring-1 focus:ring-orange-400 outline-none" rows="3" />
              <textarea name="needs" placeholder="מה הצורך שלך בתמיכה?" value={formData.needs} onChange={handleChange} className="w-full border border-orange-200 p-2 rounded-md focus:border-orange-400 focus:ring-1 focus:ring-orange-400 outline-none" rows="3" />
            </div>

            {/* Preferences */}
            <div className="col-span-2 bg-orange-50/50 p-4 rounded-lg border border-orange-100 space-y-4">
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
                        className="text-orange-600 focus:ring-orange-400" 
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
                        className="text-orange-600 focus:ring-orange-400" 
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
                className="w-full border border-orange-200 p-2 rounded-md focus:border-orange-400 focus:ring-1 focus:ring-orange-400 outline-none" 
              />
              <textarea 
                name="volunteerPrefs" 
                placeholder="העדפות במתנדב/ת (מגדר, גיל, רקע וכו')" 
                value={formData.volunteerPrefs} 
                onChange={handleChange} 
                className="w-full border border-orange-200 p-2 rounded-md focus:border-orange-400 focus:ring-1 focus:ring-orange-400 outline-none" 
              />
            </div>

            {/* Agreements */}
            <div className="col-span-2 space-y-2">
              {['agree1', 'agree2', 'agree3'].map((name, index) => (
                <label key={name} className="flex items-start gap-2 text-orange-700">
                  <input 
                    type="checkbox" 
                    name={name} 
                    checked={formData[name]} 
                    onChange={handleChange}
                    className="mt-1" 
                  />
                  <span>
                    {index === 0 && "ידוע לי שאין מדובר בטיפול מקצועי"}
                    {index === 1 && "ידוע לי שלא תמיד יימצא מענה"}
                    {index === 2 && "אני לוקח/ת אחריות על הפנייה"}
                  </span>
                </label>
              ))}
            </div>

            <textarea 
              name="note" 
              placeholder="משהו מהלב..." 
              value={formData.note} 
              onChange={handleChange} 
              className="col-span-2 border border-orange-200 p-2 rounded-md focus:border-orange-400 focus:ring-1 focus:ring-orange-400 outline-none" 
            />

            <Button className="col-span-2" disabled={loading}>
              {loading ? "נרשם..." : "הירשם כפונה"}
            </Button>

            {message && (
              <p className={`text-center text-sm col-span-2 ${message.includes("בהצלחה") ? "text-orange-600" : "text-red-600"}`}>
                {message}
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
