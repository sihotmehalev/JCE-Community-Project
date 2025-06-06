// AdminDashboard.jsx - ניהול מתנדבים ופונים
import React, { useEffect, useState } from "react";
import { db } from "../firebaseConfig";
import { collection, getDocs, updateDoc, doc, setDoc, writeBatch } from "firebase/firestore";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";

export default function AdminDashboard() {
  const [volunteers, setVolunteers] = useState([]);
  const [requesters, setRequesters] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch volunteers
      const volunteersSnap = await getDocs(collection(db, "Users", "Info", "Volunteers"));
      const v = volunteersSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        role: "volunteer"
      }));

      // Fetch requesters
      const requestersSnap = await getDocs(collection(db, "Users", "Info", "Requesters"));
      const r = requestersSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        role: "requester"
      }));

      // Fetch admins (both levels)
      const adminsFirst = await getDocs(collection(db, "Users", "Info", "Admins", "Level", "FirstLevel"));
      const adminsSecond = await getDocs(collection(db, "Users", "Info", "Admins", "Level", "SecondLevel"));
      
      const a = [
        ...adminsFirst.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          role: "admin-first"
        })),
        ...adminsSecond.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          role: "admin-second"
        }))
      ];

      setVolunteers(v);
      setRequesters(r);
      setAllUsers([...v, ...r, ...a]);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const approveVolunteer = async (id) => {
    try {
      await updateDoc(doc(db, "Users", "Info", "Volunteers", id), { approved: true });
      fetchData();
    } catch (error) {
      console.error("Error approving volunteer:", error);
    }
  };

  const matchRequesterToVolunteer = async (requesterId, volunteerId) => {
    try {
      const batch = writeBatch(db);
      
      // Create the match document
      const matchRef = doc(db, "matches", requesterId);
      batch.set(matchRef, { 
        volunteerId,
        status: "active",
        startDate: new Date(),
        createdAt: new Date()
      });

      // Update the volunteer's activeMatchIds
      const volunteerRef = doc(db, "Users", "Info", "Volunteers", volunteerId);
      batch.update(volunteerRef, {
        activeMatchIds: [...(volunteers.find(v => v.id === volunteerId)?.activeMatchIds || []), requesterId]
      });

      // Update the requester's activeMatchIds
      const requesterRef = doc(db, "Users", "Info", "Requesters", requesterId);
      batch.update(requesterRef, {
        activeMatchIds: [volunteerId]
      });

      await batch.commit();
      alert("שויך בהצלחה!");
      fetchData();
    } catch (error) {
      console.error("Error matching users:", error);
      alert("שגיאה בשיוך: " + error.message);
    }
  };

  if (loading) {
    return <div className="p-6">טוען...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-orange-800">לוח ניהול</h2>

      {/* מתנדבים לא מאושרים */}
      <Card>
        <CardContent>
          <h3 className="font-semibold mb-2 text-orange-700">מתנדבים ממתינים לאישור</h3>
          {volunteers.filter(v => !v.approved).length === 0 ? (
            <p className="text-orange-600/80">אין מתנדבים בהמתנה.</p>
          ) : (
            <ul className="space-y-2">
              {volunteers.filter(v => !v.approved).map(v => (
                <li key={v.id} className="flex justify-between bg-orange-50/50 p-2 rounded border border-orange-100">
                  <span className="text-orange-800">{v.fullName} ({v.email})</span>
                  <Button variant="outline" onClick={() => approveVolunteer(v.id)}>אשר</Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* שיוך פונה למתנדב */}
      <Card>
        <CardContent>
          <h3 className="font-semibold mb-2 text-orange-700">שיוך פונים למתנדבים</h3>
          <ul className="space-y-4">
            {requesters.map(req => (
              <li key={req.id} className="border border-orange-100 bg-orange-50/50 p-4 rounded-lg">
                <p className="mb-2"><strong className="text-orange-800">{req.fullName}</strong> <span className="text-orange-600">({req.email})</span></p>
                <select 
                  onChange={(e) => matchRequesterToVolunteer(req.id, e.target.value)} 
                  defaultValue=""
                  className="w-full p-2 border border-orange-200 rounded-md bg-white text-orange-800 focus:border-orange-400 focus:ring-1 focus:ring-orange-400 outline-none"
                >
                  <option disabled value="">בחר מתנדב לשיוך</option>
                  {volunteers.filter(v => v.approved).map(v => (
                    <option key={v.id} value={v.id}>{v.fullName}</option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* כל המשתמשים */}
      <Card>
        <CardContent>
          <h3 className="font-semibold mb-2 text-orange-700">משתמשים רשומים</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-orange-50">
                  <th className="border border-orange-100 p-2 text-orange-800">שם</th>
                  <th className="border border-orange-100 p-2 text-orange-800">אימייל</th>
                  <th className="border border-orange-100 p-2 text-orange-800">תפקיד</th>
                  <th className="border border-orange-100 p-2 text-orange-800">מאושר?</th>
                </tr>
              </thead>
              <tbody>
                {allUsers.map(u => (
                  <tr key={u.id} className="hover:bg-orange-50/50">
                    <td className="border border-orange-100 p-2 text-orange-700">{u.fullName}</td>
                    <td className="border border-orange-100 p-2 text-orange-700">{u.email}</td>
                    <td className="border border-orange-100 p-2 text-orange-700">{u.role}</td>
                    <td className="border border-orange-100 p-2 text-center">{u.approved ? "✔️" : "❌"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
