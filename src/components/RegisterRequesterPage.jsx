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
    <div className="flex justify-center py-8 bg-gradient-to-br from-blue-50 to-violet-100">
      <Card className="w-full max-w-3xl p-6 shadow-xl">
        <CardContent>
          <h2 className="text-2xl font-bold text-center mb-4">טופס הרשמה כפונה</h2>
          <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleSubmit}>
            <input name="email" type="email" required placeholder="אימייל" value={formData.email} onChange={handleChange} className="border p-2 rounded" />
            <input name="password" type="password" required placeholder="סיסמה" value={formData.password} onChange={handleChange} className="border p-2 rounded" />
            <input name="fullName" required placeholder="שם מלא" value={formData.fullName} onChange={handleChange} className="border p-2 rounded col-span-2" />
            <select name="onBehalfOf" value={formData.onBehalfOf} onChange={handleChange} className="border p-2 rounded col-span-2">
              <option value="עצמי">פונה עבור עצמי</option>
              <option value="אדם אחר בידיעתו">פונה עבור אחר בידיעתו</option>
              <option value="אדם אחר ללא ידיעתו">פונה עבור אחר ללא ידיעתו</option>
            </select>
            <input name="behalfDetails" placeholder="רקע ומספר טלפון (אם מדובר באחר)" value={formData.behalfDetails} onChange={handleChange} className="border p-2 rounded col-span-2" />
            <input name="behalfName" placeholder="שם האדם שעבורו הפנייה" value={formData.behalfName} onChange={handleChange} className="border p-2 rounded col-span-2" />
            <input name="gender" placeholder="מגדר" value={formData.gender} onChange={handleChange} className="border p-2 rounded" />
            <input name="age" placeholder="גיל" value={formData.age} onChange={handleChange} className="border p-2 rounded" />
            <input name="maritalStatus" placeholder="מצב משפחתי" value={formData.maritalStatus} onChange={handleChange} className="border p-2 rounded" />
            <input name="location" placeholder="מקום מגורים" value={formData.location} onChange={handleChange} className="border p-2 rounded" />
            <input name="phone" placeholder="טלפון" value={formData.phone} onChange={handleChange} className="border p-2 rounded" />
            <textarea name="reason" placeholder="סיבת הפנייה" value={formData.reason} onChange={handleChange} className="border p-2 rounded col-span-2" />
            <textarea name="needs" placeholder="מה הצורך שלך בתמיכה?" value={formData.needs} onChange={handleChange} className="border p-2 rounded col-span-2" />
            <fieldset className="col-span-2">
              <legend className="font-medium">העדפות לשיחה:</legend>
              {['טלפון', 'וידאו', 'בהתכתבות', 'פרונטלית', 'אחר'].map((opt) => (
                <label key={opt} className="mr-4">
                  <input type="checkbox" name="chatPref" value={opt} checked={formData.chatPref.includes(opt)} onChange={handleChange} /> {opt}
                </label>
              ))}
            </fieldset>
            <fieldset className="col-span-2">
              <legend className="font-medium">העדפות תדירות:</legend>
              {['פעם בשבוע', 'פעם בשבועיים', 'אחר'].map((opt) => (
                <label key={opt} className="mr-4">
                  <input type="checkbox" name="frequency" value={opt} checked={formData.frequency.includes(opt)} onChange={handleChange} /> {opt}
                </label>
              ))}
            </fieldset>
            <input name="preferredTimes" placeholder="זמנים נוחים לשיחה" value={formData.preferredTimes} onChange={handleChange} className="border p-2 rounded col-span-2" />
            <textarea name="volunteerPrefs" placeholder="העדפות במתנדב/ת (מגדר, גיל, רקע וכו')" value={formData.volunteerPrefs} onChange={handleChange} className="border p-2 rounded col-span-2" />
            <label className="col-span-2"><input type="checkbox" name="agree1" checked={formData.agree1} onChange={handleChange} /> ידוע לי שאין מדובר בטיפול מקצועי</label>
            <label className="col-span-2"><input type="checkbox" name="agree2" checked={formData.agree2} onChange={handleChange} /> ידוע לי שלא תמיד יימצא מענה</label>
            <label className="col-span-2"><input type="checkbox" name="agree3" checked={formData.agree3} onChange={handleChange} /> אני לוקח/ת אחריות על הפנייה</label>
            <textarea name="note" placeholder="משהו מהלב..." value={formData.note} onChange={handleChange} className="border p-2 rounded col-span-2" />
            <Button className="col-span-2" disabled={loading}>{loading ? "נרשם..." : "הירשם כפונה"}</Button>
            {message && <p className="text-center text-sm text-gray-700 col-span-2">{message}</p>}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
