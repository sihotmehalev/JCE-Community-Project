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
import LoadingSpinner from "../components/LoadingSpinner";

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
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [selectedRequestForAI, setSelectedRequestForAI] = useState(null);
  const [aiLoadingRequesterId, setAiLoadingRequesterId] = useState(null);
  const [activeTab, setActiveTab] = useState("approvals");
  const [userSearch, setUserSearch] = useState("");
  const [sortColumn, setSortColumn] = useState(null);
  const [sortOrder, setSortOrder] = useState("asc"); // 'asc' or 'desc'
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all', 'approved', 'pending'
  const [personalFilter, setPersonalFilter] = useState("all"); // 'all', 'true', 'false'
  const [pendingRequestSearch, setPendingRequestSearch] = useState("");
  const [activeMatchesFilter, setActiveMatchesFilter] = useState("all"); // 'all', 'hasMatches', 'noMatches'

  // New states for hover info panels
  const [hoveredRequester, setHoveredRequester] = useState(null);
  const [hoveredVolunteer, setHoveredVolunteer] = useState(null);

  // useEffect for resetting currentPage (moved here to ensure unconditional call)
  useEffect(() => {
    setCurrentPage(1);
  }, [userSearch, roleFilter, statusFilter, personalFilter, activeMatchesFilter]);

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
        query(collection(db, "Requests"), where("status", "==", "waiting_for_admin_approval"))
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

      setVolunteers(v);
      setRequesters(r);
      setAllUsers([...v, ...r, ...a]);
      setPendingRequests(pending);
      
    } catch (error) {
      console.error("Error fetching data:", error);
    }
    setLoading(false);
  };

  const handleSort = (columnName) => {
    if (sortColumn === columnName) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(columnName);
      setSortOrder("asc");
    }
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

  const declineVolunteer = async (id) => {
    try {
      await updateDoc(doc(db, "Users", "Info", "Volunteers", id), { approved: false });
      alert("מתנדב נדחה בהצלחה.");
      fetchData();
    } catch (error) {
      console.error("Error declining volunteer:", error);
      alert("שגיאה בדחיית המתנדב");
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
      batch.update(doc(db, "Requests", requestId), {
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

      await updateDoc(doc(db, "Requests", requestId), updateData);
      
      if (suggestAnother) {
        // Find the request in pendingRequests
        const request = pendingRequests.find(r => r.id === requestId);
        if (request) {
          // Move to non-personal requests for reassignment
          setPendingRequests([...pendingRequests, {
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
    return <LoadingSpinner />;
  }

  // Filter and sort users for the All Users table
  const filteredAndSortedUsers = allUsers
    .filter(u =>
      u.fullName?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearch.toLowerCase())
    )
    .filter(u => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (statusFilter === "approved" && u.approved === false) return false;
      if (statusFilter === "pending" && (u.approved === true || u.approved === undefined)) return false;
      if (personalFilter === "true" && !u.personal) return false;
      if (personalFilter === "false" && u.personal) return false;
      if (activeMatchesFilter === "hasMatches" && (!u.activeMatchIds || u.activeMatchIds.length === 0)) return false;
      if (activeMatchesFilter === "noMatches" && (u.activeMatchIds && u.activeMatchIds.length > 0)) return false;
      return true;
    })
    .sort((a, b) => {
      if (!sortColumn) return 0;

      let aValue;
      let bValue;

      if (sortColumn === 'activeMatchIds') {
        aValue = a[sortColumn]?.length || 0;
        bValue = b[sortColumn]?.length || 0;
      } else if (sortColumn === 'approved') {
        aValue = a[sortColumn] === undefined ? true : a[sortColumn];
        bValue = b[sortColumn] === undefined ? true : b[sortColumn];
      } else if (sortColumn === 'personal') {
        aValue = a[sortColumn] === undefined ? false : a[sortColumn];
        bValue = b[sortColumn] === undefined ? false : b[sortColumn];
      } else {
        aValue = a[sortColumn];
        bValue = b[sortColumn];
      }

      if (aValue === undefined || aValue === null) return sortOrder === 'asc' ? 1 : -1;
      if (bValue === undefined || bValue === null) return sortOrder === 'asc' ? -1 : 1;

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      } else if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
        if (sortOrder === 'asc') {
          return aValue - bValue;
        } else {
          return bValue - aValue;
        }
      } else {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }
    });

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = filteredAndSortedUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAndSortedUsers.length / itemsPerPage);

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
                      <HoverCard user={v}>
                        <p className="font-semibold text-orange-800">{v.fullName}</p>
                      </HoverCard>
                      <p className="text-sm text-orange-600">{v.email} | {v.profession}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => approveVolunteer(v.id)}
                        className="bg-green-600 text-white hover:bg-green-800"
                      >
                        אשר מתנדב
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => declineVolunteer(v.id)}
                        className="bg-red-600 text-white hover:bg-red-700"
                      >
                        דחה מתנדב
                      </Button>
                    </div>
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
            <div className="mb-4">
              <input
                type="text"
                placeholder="חיפוש בקשה לפי שם פונה/מתנדב או תוכן בקשה..."
                value={pendingRequestSearch}
                onChange={e => setPendingRequestSearch(e.target.value)}
                className="border rounded px-3 py-2 w-full"
              />
            </div>
            {pendingRequests.length === 0 ? (
              <p className="text-orange-600/80">אין בקשות ממתינות.</p>
            ) : (
              <div className="space-y-4">
                {pendingRequests
                  .filter(request =>
                    request.requesterInfo?.fullName?.toLowerCase().includes(pendingRequestSearch.toLowerCase()) ||
                    request.requesterInfo?.email?.toLowerCase().includes(pendingRequestSearch.toLowerCase()) ||
                    request.volunteerInfo?.fullName?.toLowerCase().includes(pendingRequestSearch.toLowerCase()) ||
                    request.volunteerInfo?.email?.toLowerCase().includes(pendingRequestSearch.toLowerCase()) ||
                    request.messageRequest?.toLowerCase().includes(pendingRequestSearch.toLowerCase())
                  )
                  .map(request => (
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

      {/* General Matching */}
      {activeTab === "matching" && (
        <Card className="mt-[-2rem]">
          <CardContent>
            <h3 className="font-semibold mb-4 text-orange-700">
              שיוך פונים למתנדבים
            </h3>
            <div className="flex flex-grow gap-8">
              {/* Requester Info Panel */}
              <div className={`${requesterInfoWidth} border rounded p-4 bg-gray-50/50 min-h-[200px]`}>
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
              <div className={`${volunteerInfoWidth} border rounded p-4 bg-gray-50/50 min-h-[200px]`}>
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
            <div className="mb-4">
              <input
                type="text"
                placeholder="חיפוש משתמש לפי שם או אימייל..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="border rounded px-3 py-2 w-full"
              />
            </div>
            <div className="flex gap-4 mb-4">
              {/* Role Filter */}
              <div className="flex flex-col">
                <label htmlFor="roleFilter" className="text-sm font-medium text-gray-700 mb-1">סנן לפי תפקיד:</label>
                <select
                  id="roleFilter"
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value)}
                  className="border rounded px-3 py-2"
                >
                  <option value="all">כל התפקידים</option>
                  <option value="volunteer">מתנדב</option>
                  <option value="requester">פונה</option>
                  <option value="admin-first">מנהל רמה 1</option>
                  <option value="admin-second">מנהל רמה 2</option>
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex flex-col">
                <label htmlFor="statusFilter" className="text-sm font-medium text-gray-700 mb-1">סנן לפי סטטוס:</label>
                <select
                  id="statusFilter"
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="border rounded px-3 py-2"
                >
                  <option value="all">כל הסטטוסים</option>
                  <option value="approved">פעיל</option>
                  <option value="pending">ממתין לאישור</option>
                </select>
              </div>

              {/* Personal Filter */}
              <div className="flex flex-col">
                <label htmlFor="personalFilter" className="text-sm font-medium text-gray-700 mb-1">סנן לפי אישי:</label>
                <select
                  id="personalFilter"
                  value={personalFilter}
                  onChange={e => setPersonalFilter(e.target.value)}
                  className="border rounded px-3 py-2"
                >
                  <option value="all">הכל</option>
                  <option value="true">כן</option>
                  <option value="false">לא</option>
                </select>
              </div>

              {/* Active Matches Filter */}
              <div className="flex flex-col">
                <label htmlFor="activeMatchesFilter" className="text-sm font-medium text-gray-700 mb-1">סנן לפי התאמות פעילות:</label>
                <select
                  id="activeMatchesFilter"
                  value={activeMatchesFilter}
                  onChange={e => setActiveMatchesFilter(e.target.value)}
                  className="border rounded px-3 py-2"
                >
                  <option value="all">הכל</option>
                  <option value="hasMatches">עם התאמות</option>
                  <option value="noMatches">ללא התאמות</option>
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-orange-50">
                    <th className="border border-orange-100 p-2 text-orange-800 cursor-pointer" onClick={() => handleSort('fullName')}>שם{sortColumn === 'fullName' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}</th>
                    <th className="border border-orange-100 p-2 text-orange-800 cursor-pointer" onClick={() => handleSort('email')}>אימייל{sortColumn === 'email' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}</th>
                    <th className="border border-orange-100 p-2 text-orange-800 cursor-pointer" onClick={() => handleSort('role')}>תפקיד{sortColumn === 'role' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}</th>
                    <th className="border border-orange-100 p-2 text-orange-800 cursor-pointer" onClick={() => handleSort('approved')}>סטטוס{sortColumn === 'approved' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}</th>
                    <th className="border border-orange-100 p-2 text-orange-800 cursor-pointer" onClick={() => handleSort('personal')}>אישי{sortColumn === 'personal' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}</th>
                    <th className="border border-orange-100 p-2 text-orange-800 cursor-pointer" onClick={() => handleSort('activeMatchIds')}>התאמות פעילות{sortColumn === 'activeMatchIds' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}</th>
                  </tr>
                </thead>
                <tbody>
                  {currentUsers.map(u => (
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
                        {u.personal ? 'כן' : 'לא'}
                      </td>
                      <td className="border border-orange-100 p-2 text-center">
                        {u.activeMatchIds?.length || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between items-center mt-4">
              <Button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                variant="outline"
              >
                הקודם
              </Button>
              <span className="text-orange-700">
                עמוד {currentPage} מתוך {totalPages}
              </span>
              <Button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                variant="outline"
              >
                הבא
              </Button>
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