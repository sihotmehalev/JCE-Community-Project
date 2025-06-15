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

  // New states for hover info panels
  const [hoveredRequester, setHoveredRequester] = useState(null);
  const [hoveredVolunteer, setHoveredVolunteer] = useState(null);

  // Function to determine panel widths dynamically
  const getPanelWidths = () => {
    let requesterInfoWidth = "w-[40%]"; // Default
    let requesterListWidth = "w-[20%]"; // Default
    let volunteerListWidth = "w-[20%]"; // Default
    let volunteerInfoWidth = "w-[20%]"; // Default

    if (selectedRequester && selectedVolunteer) {
      // Both requester and volunteer selected (volunteer takes precedence for info display)
      requesterInfoWidth = "w-[40%]"; // Shrink requester info
      requesterListWidth = "w-[20%]"; // Shrink requester list
      volunteerInfoWidth = "w-[40%]"; // Expand volunteer info
      volunteerListWidth = "w-[20%]"; // Shrink volunteer list
    } else if (selectedRequester && !selectedVolunteer) {
      // Only requester selected
      requesterInfoWidth = "w-[20%]"; // Expand requester info
      requesterListWidth = "w-[20%]"; // Shrink requester list
      volunteerListWidth = "w-[20%]"; // Shrink volunteer list for balance
      volunteerInfoWidth = "w-[40%]"; // Keep volunteer info same for balance
    }
    // If neither, all remain at default w-[25%]

    return {
      requesterInfoWidth,
      requesterListWidth,
      volunteerListWidth,
      volunteerInfoWidth,
    };
  };

  const { requesterInfoWidth, requesterListWidth, volunteerListWidth, volunteerInfoWidth } = getPanelWidths();

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
      
      // Create request if it doesn't exist, or update an existing one
      let finalRequestId = requestId;
      if (!requestId) {
        // Try to find an existing request that was declined or needs reassignment
        const q = query(
          collection(db, "Requests"),
          where("requesterId", "==", requesterId),
          where("status", "in", ["waiting_for_first_approval", "declined", "waiting_for_reassignment"])
        );
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          // Use the existing request
          finalRequestId = querySnapshot.docs[0].id;
          batch.update(doc(db, "Requests", finalRequestId), {
            status: "matched",
            matchedAt: new Date(),
            volunteerId: volunteerId // Ensure volunteerId is set in case it was a reassignment
          });
        } else {
          // No existing suitable request, create a new one
          finalRequestId = generateRandomId();
          const requestRef = doc(db, "Requests", finalRequestId);
          batch.set(requestRef, {
            requesterId: requesterId,
            volunteerId: volunteerId,
            status: "matched",
            createdAt: new Date(),
            messageRequest: "Manual match by admin",
            personal: false
          });
        }
      } else {
        // Update existing request (when requestId is provided, e.g., from nonPersonalRequests)
        batch.update(doc(db, "Requests", requestId), {
          volunteerId: volunteerId,
          status: "matched",
          matchedAt: new Date()
        });
      }
      
      // Create match with random ID
      const matchId = generateRandomId();
      const matchRef = doc(db, "Matches", matchId);
      
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
      if (selectedRequestForAI.status === "general_matching_ai") {
        // For general matching AI suggestions, just select the volunteer
        setSelectedVolunteer(volunteerId);
        setShowAISuggestions(false); // Close the modal
        setSelectedRequestForAI(null); // Clear the AI request
        setAiLoadingRequesterId(null); // Clear loading state if any
      } else {
        // For existing non-personal requests, create a match
        await createManualMatch(
          selectedRequestForAI.requesterId,
          volunteerId,
          selectedRequestForAI.id
        );
        setSelectedRequestForAI(null);
      }
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
    <div className="p-6 space-y-6 mt-[-2rem]">
      <h2 className="text-3xl font-bold text-orange-800 text-center">לוח ניהול</h2>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-4 justify-center flex-wrap">
        <Button
          variant={activeTab === "approvals" ? "default" : "outline"}
          onClick={() => setActiveTab("approvals")}
          className="py-3 px-6 text-lg"
        >
          אישורים ממתינים ({pendingRequests.length})
        </Button>
        <Button
          variant={activeTab === "nonPersonal" ? "default" : "outline"}
          onClick={() => setActiveTab("nonPersonal")}
          className="py-3 px-6 text-lg"
        >
          התאמות ידניות ({nonPersonalRequests.length})
        </Button>
        <Button
          variant={activeTab === "volunteers" ? "default" : "outline"}
          onClick={() => setActiveTab("volunteers")}
          className="py-3 px-6 text-lg"
        >
          מתנדבים לאישור ({volunteers.filter(v => !v.approved).length})
        </Button>
        <Button
          variant={activeTab === "matching" ? "default" : "outline"}
          onClick={() => setActiveTab("matching")}
          className="py-3 px-6 text-lg"
        >
          התאמה כללית
        </Button>
        <Button
          variant={activeTab === "users" ? "default" : "outline"}
          onClick={() => setActiveTab("users")}
          className="py-3 px-6 text-lg"
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
                          .filter(v => v.approved && (v.isAvailable || v.isAvaliable) && !v.personal)
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
        <Card className="mt-[-2rem]">
          <CardContent>
            <h3 className="font-semibold mb-4 text-orange-700">
              שיוך פונים למתנדבים
            </h3>
            <div className="flex flex-grow gap-8">
              {/* Requester Info Panel */}
              <div className={`${requesterInfoWidth} border rounded p-4 bg-gray-50/50`}>
                <h3 className="font-semibold mb-4 text-gray-700">פרטי פונה</h3>
                {(selectedRequester && requesters.find(r => r.id === selectedRequester)) ? (
                  <div className="space-y-2 text-base">
                    <p><strong>שם:</strong> {requesters.find(r => r.id === selectedRequester)?.fullName}</p>
                    <p><strong>אימייל:</strong> {requesters.find(r => r.id === selectedRequester)?.email}</p>
                    <p><strong>גיל:</strong> {requesters.find(r => r.id === selectedRequester)?.age}</p>
                    <p><strong>מגדר:</strong> {requesters.find(r => r.id === selectedRequester)?.gender}</p>
                    <p><strong>סיבת פנייה:</strong> {requesters.find(r => r.id === selectedRequester)?.reason}</p>
                    <p><strong>התאמות פעילות:</strong> {requesters.find(r => r.id === selectedRequester)?.activeMatchIds?.length || 0}</p>
                  </div>
                ) : hoveredRequester ? (
                  <div className="space-y-2 text-base">
                    <p><strong>שם:</strong> {hoveredRequester.fullName}</p>
                    <p><strong>אימייל:</strong> {hoveredRequester.email}</p>
                    <p><strong>גיל:</strong> {hoveredRequester.age}</p>
                    <p><strong>מגדר:</strong> {hoveredRequester.gender}</p>
                    <p><strong>סיבת פנייה:</strong> {hoveredRequester.reason}</p>
                    <p><strong>התאמות פעילות:</strong> {hoveredRequester.activeMatchIds?.length || 0}</p>
                  </div>
                ) : (
                  <p className="text-gray-500">רחף על פונה כדי לראות פרטים.</p>
                )}
              </div>

              {/* Requesters List */}
              <div className={`${requesterListWidth} border rounded p-4 bg-orange-50/50`}>
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
                <ul className="space-y-2 max-h-[48rem] overflow-y-auto">
                  {requesters
                    .filter(req => !(req.activeMatchIds && req.activeMatchIds.length > 0))
                    .filter(req =>
                      req.fullName?.toLowerCase().includes(requesterSearch.toLowerCase()) ||
                      req.email?.toLowerCase().includes(requesterSearch.toLowerCase())
                    )
                    .map(req => (
                      <li
                        key={req.id}
                        className={`flex items-center gap-2 bg-white p-2 rounded shadow cursor-pointer
                                    ${selectedRequester === req.id ? 'border-2 border-orange-500 ring-2 ring-orange-200' : ''}`}
                        onClick={() => {
                          if (selectedRequester === req.id) {
                            setSelectedRequester(null); // Deselect if already selected
                            setSelectedVolunteer(null); // Deselect volunteer if requester is unselected
                          } else {
                            setSelectedRequester(req.id);
                            setSelectedVolunteer(null); // Deselect volunteer when a new requester is chosen
                          }
                        }}
                        onMouseEnter={() => setHoveredRequester(req)}
                        onMouseLeave={() => { if (selectedRequester !== req.id) setHoveredRequester(null); }}
                      >
                        <span className="cursor-pointer">
                            <strong className="text-orange-800">{req.fullName}</strong>
                            <span className="text-orange-600 text-sm"> ({req.age} שנים)</span>
                          </span>
                        {selectedRequester === req.id && aiLoadingRequesterId === req.id && (
                          <span className="text-sm text-gray-500 mr-2"> (ממתין לתשובת AI...)</span>
                        )}
                      </li>
                    ))
                  }
                </ul>
              </div>

              {/* Volunteers List */}
              <div className={`${volunteerListWidth} border rounded p-4 bg-orange-50/50`}>
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
                <ul className="space-y-2 max-h-[48rem] overflow-y-auto">
                  {volunteers
                    .filter(v => v.approved && (v.isAvailable || v.isAvaliable) && !v.personal)
                    .filter(v =>
                      ((v.fullName || '').toLowerCase().includes(volunteerSearch.toLowerCase())) ||
                      ((v.email || '').toLowerCase().includes(volunteerSearch.toLowerCase()))
                    )
                    .map(v => (
                      <li
                        key={v.id}
                        className={`flex items-center gap-2 bg-white p-2 rounded shadow cursor-pointer
                                    ${selectedVolunteer === v.id ? 'border-2 border-orange-500 ring-2 ring-orange-200' : ''}
                                    ${!selectedRequester ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={() => {
                          if (selectedRequester) {
                            if (selectedVolunteer === v.id) {
                              setSelectedVolunteer(null); // Deselect if already selected
                            } else {
                              setSelectedVolunteer(v.id);
                            }
                          }
                        }}
                        onMouseEnter={() => setHoveredVolunteer(v)}
                        onMouseLeave={() => { if (selectedVolunteer !== v.id) setHoveredVolunteer(null); }}
                      >
                        <span className="cursor-pointer">
                            <strong className="text-orange-800">{v.fullName}</strong>
                            <span className="text-orange-600 text-sm"> ({v.profession})</span>
                          </span>
                      </li>
                    ))
                  }
                </ul>
              </div>

              {/* Volunteer Info Panel */}
              <div className={`${volunteerInfoWidth} border rounded p-4 bg-gray-50/50`}>
                <h3 className="font-semibold mb-4 text-gray-700">פרטי מתנדב</h3>
                {(selectedVolunteer && volunteers.find(v => v.id === selectedVolunteer)) ? (
                  <div className="space-y-2 text-base">
                    <p><strong>שם:</strong> {volunteers.find(v => v.id === selectedVolunteer)?.fullName}</p>
                    <p><strong>אימייל:</strong> {volunteers.find(v => v.id === selectedVolunteer)?.email}</p>
                    <p><strong>גיל:</strong> {volunteers.find(v => v.id === selectedVolunteer)?.age}</p>
                    <p><strong>מקצוע:</strong> {volunteers.find(v => v.id === selectedVolunteer)?.profession}</p>
                    <p><strong>ניסיון:</strong> {volunteers.find(v => v.id === selectedVolunteer)?.experience}</p>
                    <p><strong>התאמות פעילות:</strong> {volunteers.find(v => v.id === selectedVolunteer)?.activeMatchIds?.length || 0}</p>
                  </div>
                ) : hoveredVolunteer ? (
                  <div className="space-y-2 text-base">
                    <p><strong>שם:</strong> {hoveredVolunteer.fullName}</p>
                    <p><strong>אימייל:</strong> {hoveredVolunteer.email}</p>
                    <p><strong>גיל:</strong> {hoveredVolunteer.age}</p>
                    <p><strong>מקצוע:</strong> {hoveredVolunteer.profession}</p>
                    <p><strong>ניסיון:</strong> {hoveredVolunteer.experience}</p>
                    <p><strong>התאמות פעילות:</strong> {hoveredVolunteer.activeMatchIds?.length || 0}</p>
                  </div>
                ) : (
                  <p className="text-gray-500">רחף על מתנדב כדי לראות פרטים.</p>
                )}
              </div>
            </div>
            <div className="mt-4 flex justify-center gap-2 w-full">
              <Button
                className={`py-3 px-6 text-lg ${
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
                className={`py-3 px-6 text-lg ${!selectedRequester ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                      messageRequest: `הצעת AI להתאמה כללית עבור ${requesterData.fullName} (גיל: ${requesterData.age || 'לא ידוע'}, סיבה: ${requesterData.reason || 'בקשת תמיכה כללית'}). זוהי בקשה כללית להתאמה למתנדב תמיכה, ללא סיבה ספציפית מפורטת מהפונה.`,
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
                    <tr key={`${u.id}-${u.role}`} className="hover:bg-orange-50/50">
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