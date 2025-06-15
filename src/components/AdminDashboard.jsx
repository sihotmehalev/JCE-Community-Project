// AdminDashboard.jsx - Full Implementation
import React, { useEffect, useState } from "react";
import { db } from "../firebaseConfig";
import { 
  collection, 
  getDocs, 
  updateDoc, 
  doc, 
  setDoc, 
  writeBatch, 
  query, 
  where, 
  addDoc,
  getDoc 
} from "firebase/firestore";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { HoverCard } from "./ui/HoverCard";
import AISuggestionModal from './AISuggestionModal';
import { generateRandomId } from "./firebaseHelpers";
import {
  timestamp,
  auth,
  emailAuthProvider,
  requestPasswordReset,
  logInWithEmailAndPassword,
  registerWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordReset,
  signInWithGoogle,
  logout,
  checkAuthStatus,
  getCurrentUser,
  uploadFile,
  getImageURL,
  addDocument,
  setDocument,
  getDocument,
  updateDocument,
  deleteDocument,
  getDocuments,
  addVolunteer,
  addRequest,
  getRequests,
  getVolunteer,
  getVolunteers,
  updateRequest,
  updateVolunteer,
  updateUser,
  sendRequestChat,
  getVolunteerRequests,
  getRequesterRequests,
  fetchChatMessages,
  addChatMessage,
  listenForChatMessages,
  monitorAuthState,
} from "./firebaseHelpers";

export default function AdminDashboard() {
  // State Management
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
  
  // New States
  const [pendingRequests, setPendingRequests] = useState([]);
  const [nonPersonalRequests, setNonPersonalRequests] = useState([]);
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [selectedRequestForAI, setSelectedRequestForAI] = useState(null);
  const [aiLoadingRequesterId, setAiLoadingRequesterId] = useState(null);
  const [activeTab, setActiveTab] = useState("approvals");

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

      // Fetch admins
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

      // Fetch pending requests (waiting_for_admin_approval)
      const pendingRequestsSnap = await getDocs(
        query(collection(db, "requests"), where("status", "==", "waiting_for_admin_approval"))
      );
      
      const pending = await Promise.all(
        pendingRequestsSnap.docs.map(async (docSnap) => {
          const data = docSnap.data();
          
          // Fetch requester info
          const requesterDoc = await getDoc(doc(db, "Users", "Info", "Requesters", data.requesterId));
          const requesterInfo = requesterDoc.exists() ? requesterDoc.data() : null;
          
          // Fetch volunteer info if exists
          let volunteerInfo = null;
          if (data.volunteerId) {
            const volunteerDoc = await getDoc(doc(db, "Users", "Info", "Volunteers", data.volunteerId));
            volunteerInfo = volunteerDoc.exists() ? volunteerDoc.data() : null;
          }
          
          return {
            id: docSnap.id,
            ...data,
            requesterInfo,
            volunteerInfo
          };
        })
      );

      // Fetch non-personal requests
      const allRequestersWithRequests = await Promise.all(
        r.filter(requester => !requester.personal).map(async (requester) => {
          // Check if this requester has any unmatched requests
          const requestsQuery = query(
            collection(db, "requests"),
            where("requesterId", "==", requester.id),
            where("status", "in", ["waiting_for_first_approval", "declined"])
          );
          const requestsSnap = await getDocs(requestsQuery);
          
          return requestsSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            requesterInfo: requester
          }));
        })
      );
      
      const nonPersonal = allRequestersWithRequests.flat();

      setVolunteers(v);
      setRequesters(r);
      setAllUsers([...v, ...r, ...a]);
      setPendingRequests(pending);
      setNonPersonalRequests(nonPersonal);
      
    } catch (error) {
      console.error("Error fetching data:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const approveVolunteer = async (id) => {
    try {
      await updateDoc(doc(db, "Users", "Info", "Volunteers", id), { approved: true });
      alert("מתנדב אושר בהצלחה!");
      fetchData();
    } catch (error) {
      console.error("Error approving volunteer:", error);
      alert("שגיאה באישור המתנדב");
    }
  };

  const approveRequest = async (requestId, requestData) => {
    try {
      const batch = writeBatch(db);
      
      // Create match with random ID
      const matchId = generateRandomId();
      const matchRef = doc(db, "matches", matchId);
      
      batch.set(matchRef, {
        volunteerId: requestData.volunteerId,
        requesterId: requestData.requesterId,
        requestId: requestId,
        status: "active",
        startDate: new Date(),
        endDate: null,
        meetingFrequency: "weekly",
        lastSessionId: null,
        totalSessions: 0,
        notes: ""
      });

      // Update request
      batch.update(doc(db, "requests", requestId), {
        status: "matched",
        matchId: matchId,
        matchedAt: new Date()
      });

      // Update volunteer's activeMatchIds
      const volunteer = volunteers.find(v => v.id === requestData.volunteerId);
      const volunteerRef = doc(db, "Users", "Info", "Volunteers", requestData.volunteerId);
      batch.update(volunteerRef, {
        activeMatchIds: [...(volunteer?.activeMatchIds || []), matchId]
      });

      // Update requester's activeMatchIds
      const requester = requesters.find(r => r.id === requestData.requesterId);
      const requesterRef = doc(db, "Users", "Info", "Requesters", requestData.requesterId);
      batch.update(requesterRef, {
        activeMatchIds: [...(requester?.activeMatchIds || []), matchId]
      });

      await batch.commit();
      alert("הבקשה אושרה והתאמה נוצרה בהצלחה!");
      fetchData();
    } catch (error) {
      console.error("Error approving request:", error);
      alert("שגיאה באישור הבקשה");
    }
  };

  const declineRequest = async (requestId, suggestAnother = false) => {
    try {
      const updateData = {
        status: "declined",
        declinedAt: new Date()
      };

      await updateDoc(doc(db, "requests", requestId), updateData);
      
      if (suggestAnother) {
        // Find the request in pendingRequests
        const request = pendingRequests.find(r => r.id === requestId);
        if (request) {
          // Move to non-personal requests for reassignment
          setNonPersonalRequests([...nonPersonalRequests, {
            ...request,
            status: "waiting_for_reassignment"
          }]);
        }
      }
      
      alert(suggestAnother ? "הבקשה נדחתה. ניתן לבחור מתנדב אחר." : "הבקשה נדחתה.");
      fetchData();
    } catch (error) {
      console.error("Error declining request:", error);
      alert("שגיאה בדחיית הבקשה");
    }
  };

  const createManualMatch = async (requesterId, volunteerId, requestId = null) => {
    try {
      const batch = writeBatch(db);
      
      // Create request if it doesn't exist
      let finalRequestId = requestId;
      if (!requestId) {
        finalRequestId = generateRandomId();
        const requestRef = doc(db, "requests", finalRequestId);
        batch.set(requestRef, {
          requesterId: requesterId,
          volunteerId: volunteerId,
          status: "matched",
          createdAt: new Date(),
          messageRequest: "Manual match by admin",
          personal: false
        });
      } else {
        // Update existing request
        batch.update(doc(db, "requests", requestId), {
          volunteerId: volunteerId,
          status: "matched",
          matchedAt: new Date()
        });
      }
      
      // Create match with random ID
      const matchId = generateRandomId();
      const matchRef = doc(db, "matches", matchId);
      
      batch.set(matchRef, {
        volunteerId: volunteerId,
        requesterId: requesterId,
        requestId: finalRequestId,
        status: "active",
        startDate: new Date(),
        endDate: null,
        meetingFrequency: "weekly",
        lastSessionId: null,
        totalSessions: 0,
        notes: "Manual match by admin"
      });

      // Update users' activeMatchIds
      const volunteer = volunteers.find(v => v.id === volunteerId);
      const volunteerRef = doc(db, "Users", "Info", "Volunteers", volunteerId);
      batch.update(volunteerRef, {
        activeMatchIds: [...(volunteer?.activeMatchIds || []), matchId]
      });

      const requester = requesters.find(r => r.id === requesterId);
      const requesterRef = doc(db, "Users", "Info", "Requesters", requesterId);
      batch.update(requesterRef, {
        activeMatchIds: [...(requester?.activeMatchIds || []), matchId]
      });

      await batch.commit();
      alert("התאמה נוצרה בהצלחה!");
      fetchData();
    } catch (error) {
      console.error("Error creating match:", error);
      alert("שגיאה ביצירת התאמה");
    }
  };

  const handleAIVolunteerSelection = async (volunteerId) => {
    if (selectedRequestForAI) {
      await createManualMatch(
        selectedRequestForAI.requesterId, 
        volunteerId, 
        selectedRequestForAI.id
      );
      setSelectedRequestForAI(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-orange-800">לוח ניהול</h2>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-4">
        <Button
          variant={activeTab === "approvals" ? "default" : "outline"}
          onClick={() => setActiveTab("approvals")}
        >
          אישורים ממתינים ({pendingRequests.length})
        </Button>
        <Button
          variant={activeTab === "nonPersonal" ? "default" : "outline"}
          onClick={() => setActiveTab("nonPersonal")}
        >
          התאמות ידניות ({nonPersonalRequests.length})
        </Button>
        <Button
          variant={activeTab === "volunteers" ? "default" : "outline"}
          onClick={() => setActiveTab("volunteers")}
        >
          מתנדבים לאישור ({volunteers.filter(v => !v.approved).length})
        </Button>
        <Button
          variant={activeTab === "matching" ? "default" : "outline"}
          onClick={() => setActiveTab("matching")}
        >
          התאמה כללית
        </Button>
        <Button
          variant={activeTab === "users" ? "default" : "outline"}
          onClick={() => setActiveTab("users")}
        >
          כל המשתמשים
        </Button>
      </div>

      {/* Volunteers Awaiting Approval */}
      {activeTab === "volunteers" && (
        <Card>
          <CardContent>
            <h3 className="font-semibold mb-4 text-orange-700">
              מתנדבים ממתינים לאישור
            </h3>
            {volunteers.filter(v => !v.approved).length === 0 ? (
              <p className="text-orange-600/80">אין מתנדבים בהמתנה.</p>
            ) : (
              <div className="space-y-2">
                {volunteers.filter(v => !v.approved).map(v => (
                  <div key={v.id} className="flex justify-between items-center bg-orange-50/50 p-3 rounded border border-orange-100">
                    <div>
                      <p className="font-semibold text-orange-800">{v.fullName}</p>
                      <p className="text-sm text-orange-600">{v.email} | {v.profession}</p>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => approveVolunteer(v.id)}
                      className="bg-green-600 text-white hover:bg-green-700"
                    >
                      אשר מתנדב
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pending Approval Requests */}
      {activeTab === "approvals" && (
        <Card>
          <CardContent>
            <h3 className="font-semibold mb-4 text-orange-700">
              בקשות ממתינות לאישור מנהל
            </h3>
            {pendingRequests.length === 0 ? (
              <p className="text-orange-600/80">אין בקשות ממתינות.</p>
            ) : (
              <div className="space-y-4">
                {pendingRequests.map(request => (
                  <div key={request.id} className="border rounded p-4 bg-orange-50/50">
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <h4 className="font-semibold text-orange-800 mb-2">פרטי הפונה</h4>
                        <p><strong>שם:</strong> {request.requesterInfo?.fullName}</p>
                        <p><strong>גיל:</strong> {request.requesterInfo?.age}</p>
                        <p><strong>סיבת פנייה:</strong> {request.requesterInfo?.reason}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-orange-800 mb-2">פרטי המתנדב</h4>
                        <p><strong>שם:</strong> {request.volunteerInfo?.fullName}</p>
                        <p><strong>מקצוע:</strong> {request.volunteerInfo?.profession}</p>
                        <p><strong>ניסיון:</strong> {request.volunteerInfo?.experience}</p>
                      </div>
                    </div>
                    <div className="border-t pt-3">
                      <p className="mb-3"><strong>תוכן הבקשה:</strong> {request.messageRequest}</p>
                      <div className="flex gap-2">
                        <Button 
                          className="bg-green-600 text-white hover:bg-green-700"
                          onClick={() => approveRequest(request.id, request)}
                        >
                          אשר התאמה
                        </Button>
                        <Button 
                          className="bg-red-600 text-white hover:bg-red-700"
                          onClick={() => declineRequest(request.id, false)}
                        >
                          דחה
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Non-Personal Requests */}
      {activeTab === "nonPersonal" && (
        <Card>
          <CardContent>
            <h3 className="font-semibold mb-4 text-orange-700">
              בקשות להתאמה ידנית (לא אישי)
            </h3>
            {nonPersonalRequests.length === 0 ? (
              <p className="text-orange-600/80">אין בקשות להתאמה ידנית.</p>
            ) : (
              <div className="space-y-4">
                {nonPersonalRequests.map(request => (
                  <div key={request.id} className="border rounded p-4 bg-orange-50/50">
                    <div className="mb-3">
                      <p><strong>פונה:</strong> {request.requesterInfo?.fullName}</p>
                      <p><strong>גיל:</strong> {request.requesterInfo?.age} | <strong>סיבה:</strong> {request.requesterInfo?.reason}</p>
                      <p><strong>הודעה:</strong> {request.messageRequest}</p>
                    </div>
                    <div className="flex gap-2 items-center">
                      <select 
                        onChange={(e) => setSelectedVolunteer(e.target.value)}
                        className="border rounded px-3 py-2 flex-1"
                        defaultValue=""
                      >
                        <option value="">בחר מתנדב...</option>
                        {volunteers
                          .filter(v => v.approved && v.isAvailable && !v.personal)
                          .map(v => (
                            <option key={v.id} value={v.id}>
                              {v.fullName} - {v.profession} ({v.experience})
                            </option>
                          ))
                        }
                      </select>
                      <Button
                        disabled={!selectedVolunteer}
                        onClick={() => {
                          createManualMatch(request.requesterId, selectedVolunteer, request.id);
                          setSelectedVolunteer(null);
                        }}
                      >
                        שייך
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedRequestForAI(request);
                          setShowAISuggestions(true);
                        }}
                      >
                        הצעות AI
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* General Matching */}
      {activeTab === "matching" && (
        <Card>
          <CardContent>
            <h3 className="font-semibold mb-4 text-orange-700">
              שיוך פונים למתנדבים
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
                </div>
                <h4 className="font-bold mb-2 text-orange-700">פונים</h4>
                <ul className="space-y-2 max-h-96 overflow-y-auto">
                  {requesters
                    .filter(req =>
                      req.fullName?.toLowerCase().includes(requesterSearch.toLowerCase()) ||
                      req.email?.toLowerCase().includes(requesterSearch.toLowerCase())
                    )
                    .map(req => (
                      <li key={req.id} className="flex items-center gap-2 bg-white p-2 rounded shadow">
                        <input
                          type="radio"
                          name="requester"
                          checked={selectedRequester === req.id}
                          onChange={() => {
                            setSelectedRequester(req.id);
                            setSelectedVolunteer(null);
                          }}
                        />
                        <HoverCard user={req}>
                          <span className="cursor-pointer">
                            <strong className="text-orange-800">{req.fullName}</strong>
                            <span className="text-orange-600 text-sm"> ({req.age} שנים)</span>
                          </span>
                        </HoverCard>
                        {selectedRequester === req.id && aiLoadingRequesterId === req.id && (
                          <span className="text-sm text-gray-500 mr-2"> (ממתין לתשובת AI...)</span>
                        )}
                      </li>
                    ))
                  }
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
                </div>
                <h4 className="font-bold mb-2 text-orange-700">מתנדבים</h4>
                <ul className="space-y-2 max-h-96 overflow-y-auto">
                  {volunteers
                    .filter(v => v.approved)
                    .filter(v =>
                      v.fullName?.toLowerCase().includes(volunteerSearch.toLowerCase()) ||
                      v.email?.toLowerCase().includes(volunteerSearch.toLowerCase())
                    )
                    .map(v => (
                      <li key={v.id} className="flex items-center gap-2 bg-white p-2 rounded shadow">
                        <input
                          type="radio"
                          name="volunteer"
                          checked={selectedVolunteer === v.id}
                          disabled={!selectedRequester}
                          onChange={() => setSelectedVolunteer(v.id)}
                        />
                        <HoverCard user={v}>
                          <span className="cursor-pointer">
                            <strong className="text-orange-800">{v.fullName}</strong>
                            <span className="text-orange-600 text-sm"> ({v.profession})</span>
                          </span>
                        </HoverCard>
                      </li>
                    ))
                  }
                </ul>
              </div>
            </div>
            <div className="mt-4 flex justify-center gap-2">
              <Button
                className={`${
                  !(selectedRequester && selectedVolunteer)
                    ? "bg-gray-400 text-white cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
                disabled={!(selectedRequester && selectedVolunteer)}
                onClick={() => {
                  if (selectedRequester && selectedVolunteer) {
                    createManualMatch(selectedRequester, selectedVolunteer);
                    setSelectedRequester(null);
                    setSelectedVolunteer(null);
                  }
                }}
              >
                צור התאמה
              </Button>
              <Button
                variant="outline"
                disabled={!selectedRequester}
                onClick={() => {
                  const requesterData = requesters.find(req => req.id === selectedRequester);
                  if (requesterData) {
                    setAiLoadingRequesterId(requesterData.id);
                    setSelectedRequestForAI({
                      id: generateRandomId(),
                      requesterId: requesterData.id,
                      requesterInfo: {
                        ...requesterData,
                        reason: requesterData.reason || "בקשת תמיכה כללית",
                        gender: requesterData.gender || "לא ידוע"
                      },
                      messageRequest: `AI suggestion for general matching for ${requesterData.fullName} (age: ${requesterData.age || 'לא ידוע'}, reason: ${requesterData.reason || 'בקשת תמיכה כללית'}). זוהי בקשה כללית להתאמה למתנדב תמיכה, ללא סיבה ספציפית מפורטת מהפונה.`,
                      status: "general_matching_ai"
                    });
                    setShowAISuggestions(true);
                  }
                }}
              >
                הצעות AI
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Users Table */}
      {activeTab === "users" && (
        <Card>
          <CardContent>
            <h3 className="font-semibold mb-4 text-orange-700">כל המשתמשים במערכת</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-orange-50">
                    <th className="border border-orange-100 p-2 text-orange-800">שם</th>
                    <th className="border border-orange-100 p-2 text-orange-800">אימייל</th>
                    <th className="border border-orange-100 p-2 text-orange-800">תפקיד</th>
                    <th className="border border-orange-100 p-2 text-orange-800">סטטוס</th>
                    <th className="border border-orange-100 p-2 text-orange-800">התאמות פעילות</th>
                  </tr>
                </thead>
                <tbody>
                  {allUsers.map(u => (
                    <tr key={u.id} className="hover:bg-orange-50/50">
                      <td className="border border-orange-100 p-2 text-orange-700">{u.fullName}</td>
                      <td className="border border-orange-100 p-2 text-orange-700">{u.email}</td>
                      <td className="border border-orange-100 p-2 text-orange-700">
                        {u.role === 'volunteer' && 'מתנדב'}
                        {u.role === 'requester' && 'פונה'}
                        {u.role === 'admin-first' && 'מנהל רמה 1'}
                        {u.role === 'admin-second' && 'מנהל רמה 2'}
                      </td>
                      <td className="border border-orange-100 p-2 text-center">
                        {u.approved === false ? (
                          <span className="text-red-600">ממתין לאישור</span>
                        ) : (
                          <span className="text-green-600">פעיל</span>
                        )}
                      </td>
                      <td className="border border-orange-100 p-2 text-center">
                        {u.activeMatchIds?.length || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Suggestions Modal */}
      <AISuggestionModal
        isOpen={showAISuggestions}
        onClose={() => {
          setShowAISuggestions(false);
          setSelectedRequestForAI(null);
          setAiLoadingRequesterId(null);
        }}
        request={selectedRequestForAI}
        volunteers={volunteers}
        onSelectVolunteer={handleAIVolunteerSelection}
      />
    </div>
  );
}