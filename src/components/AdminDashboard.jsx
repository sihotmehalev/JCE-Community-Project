// AdminDashboard.jsx - ניהול מתנדבים ופונים
import React, { useEffect, useState } from "react";
import { db } from "../firebaseConfig";
import { collection, getDocs, updateDoc, doc, setDoc, writeBatch } from "firebase/firestore";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { HoverCard } from "./ui/HoverCard"; //popup card for user info
import { AdminEventManager } from './EventAdminManger/AdminEventManager';

export default function AdminDashboard() {
  const [selectedRequester, setSelectedRequester] = useState(null);
  const [selectedVolunteer, setSelectedVolunteer] = useState(null);
  const [requesterSearch, setRequesterSearch] = useState("");
  const [volunteerSearch, setVolunteerSearch] = useState("");
  const [requesterFilter, setRequesterFilter] = useState("");
  const [volunteerFilter, setVolunteerFilter] = useState(""); 
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

        <AdminEventManager />

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

<Card> 
  <CardContent>
    <h3 className="font-semibold mb-2 text-orange-700">
      שיוך פונים למתנדבים
      <span className="ml-2 text-orange-500 text-base font-normal">
        ({requesters.length})
      </span>
    </h3> 
    <div className="flex gap-8">
      {/* Requesters List */}
      <div className="w-1/2 border rounded p-4 bg-orange-50/50">
        <div className="flex items-center gap-2 mb-2">
          <input
            type="text"
            placeholder="חיפוש פונה..."
            value={requesterSearch}
  
            onChange={e => setRequesterSearch(e.target.value)}
            className="border rounded px-2 py-1 w-full"
          />
          <select
            value={requesterFilter}
            onChange={e => setRequesterFilter(e.target.value)}
            className="border rounded px-2 py-1"
          >
            <option value="">סנן לפי</option>
            {/* Add filter options here in the future */}
          </select>
        </div>
        <h4 className="font-bold mb-2 text-orange-700">פונים ממתינים לשיוך</h4>
        <ul className="space-y-2">
          {requesters
            .filter(req =>
              req.fullName?.toLowerCase().includes(requesterSearch.toLowerCase()) ||
              req.email?.toLowerCase().includes(requesterSearch.toLowerCase())
            )
            .length === 0 ? (
            <li>אין פונים ממתינים לשיוך.</li>
          ) : (
            requesters
              .filter(req =>
                req.fullName?.toLowerCase().includes(requesterSearch.toLowerCase()) ||
                req.email?.toLowerCase().includes(requesterSearch.toLowerCase())
              )
              .map(req => (
                <li key={req.id} className="flex items-center gap-2 bg-white p-2 rounded shadow">
                  <input
                    type="checkbox"
                    checked={selectedRequester === req.id}
                    disabled={selectedRequester && selectedRequester !== req.id}
                    onChange={() => {
                      setSelectedRequester(req.id === selectedRequester ? null : req.id);
                      setSelectedVolunteer(null); // Reset volunteer selection on requester change
                    }}
                  />
                  <span>
                    <HoverCard user={req}>
                      <strong className="text-orange-800">{req.fullName}</strong> <span className="text-orange-600">({req.email})</span>
                    </HoverCard>
                  </span>
                </li>
              ))
          )}
        </ul>
      </div>
      {/* Volunteers List */}
      <div className="w-1/2 border rounded p-4 bg-orange-50/50">
        <div className="flex items-center gap-2 mb-2">
          <input
            type="text"
            placeholder="חיפוש מתנדב..."
            value={volunteerSearch}
            onChange={e => setVolunteerSearch(e.target.value)}
            className="border rounded px-2 py-1 w-full"
          />
          <select
            value={volunteerFilter}
            onChange={e => setVolunteerFilter(e.target.value)}
            className="border rounded px-2 py-1"
          >
            <option value="">סנן לפי</option>
            {/* Add filter options here in the future */}
          </select>
        </div>
        <h4 className="font-bold mb-2 text-orange-700">כל המתנדבים</h4>
        <ul className="space-y-2">
          {volunteers
            .filter(v => v.approved)
            .filter(v =>
              v.fullName?.toLowerCase().includes(volunteerSearch.toLowerCase()) ||
              v.email?.toLowerCase().includes(volunteerSearch.toLowerCase())
            )
            .length === 0 ? (
            <li>אין מתנדבים מאושרים.</li>
          ) : (
            volunteers
              .filter(v => v.approved)
              .filter(v =>
                v.fullName?.toLowerCase().includes(volunteerSearch.toLowerCase()) ||
                v.email?.toLowerCase().includes(volunteerSearch.toLowerCase())
              )
              .map(v => (
                <li key={v.id} className="flex items-center gap-2 bg-white p-2 rounded shadow">
                  <input
                    type="checkbox"
                    checked={selectedVolunteer === v.id}
                    disabled={
                      !selectedRequester ||
                      (selectedVolunteer && selectedVolunteer !== v.id)
                    }
                    onChange={() => setSelectedVolunteer(v.id === selectedVolunteer ? null : v.id)}
                  />
                  <span>
                    <HoverCard user={v}>
                      <strong className="text-orange-800">{v.fullName}</strong> <span className="text-orange-600">({v.email})</span>
                    </HoverCard>
                  </span>
                </li>
              ))
          )}
        </ul>
      </div>
    </div>
    <div className="mt-4 flex justify-center">
      <Button
        className={`${
          !(selectedRequester && selectedVolunteer)
            ? "bg-gray-400 text-white cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700 text-white"
        }`}
        disabled={!(selectedRequester && selectedVolunteer)}
        onClick={() => {
          if (selectedRequester && selectedVolunteer) {
            matchRequesterToVolunteer(selectedRequester, selectedVolunteer);
            setSelectedRequester(null);
            setSelectedVolunteer(null);
          }
        }}
      >
        התאמה
      </Button>
    </div>
  </CardContent>
</Card>

      {/* כל המשתמשים */}
      <Card> {/* Users Card */}
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
