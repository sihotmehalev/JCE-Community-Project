import React, { useEffect, useState, useRef, useCallback } from "react";
import { db } from "../../config/firebaseConfig";
import { 
  collection, 
  getDocs, 
  updateDoc, 
  doc, 
  setDoc, 
  writeBatch, 
  query, 
  where, 
  getDoc, 
  arrayUnion,
  increment,
  deleteDoc,
  addDoc,
  serverTimestamp
} from "firebase/firestore";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { HoverCard } from "../ui/HoverCard";
import AISuggestionModal from '../modals/AISuggestionModal';
import { generateRandomId } from "../../utils/firebaseHelpers";
import LoadingSpinner from "../ui/LoadingSpinner";
import EventCreation from "../admin/event-management/AdminAddEvent";
import { AdminEventList } from '../admin/event-management/AdminEventList';
import CustomAlert from "../ui/CustomAlert";
import { CancelMatchModal } from '.././ui/CancelMatchModal';
import { DeleteUserModal } from '.././ui/DeleteUserModal';

const createNotification = async (userId, message, link) => {
  if (!userId) return;
  try {
    await addDoc(collection(db, "notifications"), {
      userId,
      message,
      link,
      createdAt: serverTimestamp(),
      read: false,
    });
  } catch (error) {
    console.error("Error creating notification:", error);
  }
};

export default function AdminDashboard() {
  const [selectedRequester, setSelectedRequester] = useState(null);
  const [selectedVolunteer, setSelectedVolunteer] = useState(null);
  const [requesterSearch, setRequesterSearch] = useState("");
  const [volunteerSearch, setVolunteerSearch] = useState("");
  const [volunteers, setVolunteers] = useState([]);
  const [requesters, setRequesters] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [selectedRequestForAI, setSelectedRequestForAI] = useState(null);
  const [aiLoadingRequesterId, setAiLoadingRequesterId] = useState(null);
  const [activeTab, setActiveTab] = useState("approvals");
  const [userSearch, setUserSearch] = useState("");
  const [sortColumn, setSortColumn] = useState(null);
  const [sortOrder, setSortOrder] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [personalFilter, setPersonalFilter] = useState("all");
  const [activeMatchesFilter, setActiveMatchesFilter] = useState("all");
  const [activeMatches, setActiveMatches] = useState([]);
  const [activeMatchSearch, setActiveMatchSearch] = useState("");
  const [activeMatchCurrentPage, setActiveMatchCurrentPage] = useState(1);
  const [matchRequesterFilter] = useState("all");
  const [matchVolunteerFilter] = useState("all");
  const [matchSortColumn, setMatchSortColumn] = useState(null);
  const [matchSortOrder, setMatchSortOrder] = useState("asc");
  const [showSessionDetails, setShowSessionDetails] = useState(false);
  const [selectedMatchForDetails, setSelectedMatchForDetails] = useState(null);
  const [matchSessions, setMatchSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [hoveredRequester, setHoveredRequester] = useState(null);
  const [hoveredVolunteer, setHoveredVolunteer] = useState(null);
  const requesterHoverTimeoutRef = useRef(null);
  const volunteerHoverTimeoutRef = useRef(null);
  const [selectedSessionForView, setSelectedSessionForView] = useState(null);
  const [alertMessage, setAlertMessage] = useState(null);
  const [showCancelMatchModal, setShowCancelMatchModal] = useState(false);
  const [showDeleteUserModal, setshowDeleteUserModal] = useState(false);
  const [selectedUserForDelete, setSelectedUserForDelete] = useState(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [userSearch, roleFilter, statusFilter, personalFilter, activeMatchesFilter]);

  useEffect(() => {
    setActiveMatchCurrentPage(1);
  }, [activeMatchSearch, matchSortColumn, matchSortOrder]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const volunteersSnap = await getDocs(collection(db, "Users", "Info", "Volunteers"));
      const v = volunteersSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), role: "volunteer" }));
      const requestersSnap = await getDocs(collection(db, "Users", "Info", "Requesters"));
      const r = requestersSnap.docs.map(doc => {
        const data = doc.data();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const lastActivityTimestamp = data.lastActivity || data.lastLogin || data.createdAt;
        let isActiveByTime = false;
        if (lastActivityTimestamp && typeof lastActivityTimestamp.toDate === 'function') {
          const lastActivityDate = lastActivityTimestamp.toDate ? lastActivityTimestamp.toDate() : new Date(lastActivityTimestamp.seconds * 1000);
          isActiveByTime = lastActivityDate >= thirtyDaysAgo;
        }
        const requesterDerivedStatus = (data.agree1 === true && data.agree2 === true && data.agree3 === true && isActiveByTime) ? "פעיל" : "לא פעיל";
        return { id: doc.id, ...data, role: "requester", derivedDisplayStatus: requesterDerivedStatus, lastActivity: lastActivityTimestamp };
      });
      const pendingRequestsSnap = await getDocs(query(collection(db, "Requests"), where("status", "==", "waiting_for_admin_approval")));
      const pending = await Promise.all(
        pendingRequestsSnap.docs.map(async (docSnap) => {
          const data = docSnap.data();
          let requesterInfo = null;
          if (data.requesterId && typeof data.requesterId === 'string' && data.requesterId.trim() !== '') {
            const requesterDoc = await getDoc(doc(db, "Users", "Info", "Requesters", data.requesterId));
            requesterInfo = requesterDoc.exists() ? requesterDoc.data() : null;
          } else {
            console.warn(`Skipping requester info for pending request ${docSnap.id}: requesterId is invalid or undefined. Value: ${data.requesterId}`);
          }
          let volunteerInfo = null;
          if (data.volunteerId && typeof data.volunteerId === 'string' && data.volunteerId.trim() !== '') {
            const volunteerDoc = await getDoc(doc(db, "Users", "Info", "Volunteers", data.volunteerId));
            volunteerInfo = volunteerDoc.exists() ? volunteerDoc.data() : null;
          } else if (data.volunteerId === undefined || (typeof data.volunteerId === 'string' && data.volunteerId.trim() === '')) {
            console.warn(`Skipping volunteer info for pending request ${docSnap.id}: volunteerId is invalid or undefined. Value: ${data.volunteerId}`);
          }
          return { id: docSnap.id, ...data, requesterInfo, volunteerInfo };
        })
      );
      const matchesSnap = await getDocs(collection(db, "Matches"));
      const matches = await Promise.all(
        matchesSnap.docs.map(async (docSnap) => {
          const data = docSnap.data();
          let requesterInfo = null;
          if (data.requesterId && typeof data.requesterId === 'string' && data.requesterId.trim() !== '') {
            const requesterDoc = await getDoc(doc(db, "Users", "Info", "Requesters", data.requesterId));
            requesterInfo = requesterDoc.exists() ? requesterDoc.data() : null;
          } else {
            console.warn(`Skipping requester info for match ${docSnap.id}: requesterId is invalid or undefined. Value: ${data.requesterId}`);
          }
          let volunteerInfo = null;
          if (data.volunteerId && typeof data.volunteerId === 'string' && data.volunteerId.trim() !== '') {
            const volunteerDoc = await getDoc(doc(db, "Users", "Info", "Volunteers", data.volunteerId));
            volunteerInfo = volunteerDoc.exists() ? volunteerDoc.data() : null;
          } else {
            console.warn(`Skipping volunteer info for match ${docSnap.id}: volunteerId is invalid or undefined. Value: ${data.volunteerId}`);
          }
          return { id: docSnap.id, ...data, requesterInfo, volunteerInfo };
        })
      );
      const processedVolunteers = v.map(vol => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const lastActivityTimestamp = vol.lastActivity || vol.lastLogin || vol.createdAt;
        let isActiveByTime = false;
        if (lastActivityTimestamp && typeof lastActivityTimestamp.toDate === 'function') {
          const lastActivityDate = lastActivityTimestamp.toDate ? lastActivityTimestamp.toDate() : new Date(lastActivityTimestamp.seconds * 1000);
          isActiveByTime = lastActivityDate >= thirtyDaysAgo;
        }
        let volunteerDerivedStatus;
        if (vol.approved === "true" && isActiveByTime) volunteerDerivedStatus = "פעיל";
        else if (vol.approved === "true" && !isActiveByTime) volunteerDerivedStatus = "לא פעיל";
        else if (vol.approved === "pending") volunteerDerivedStatus = "ממתין לאישור";
        else if (vol.approved === "declined") volunteerDerivedStatus = "נדחה";
        else volunteerDerivedStatus = "לא פעיל";
        return { ...vol, derivedDisplayStatus: volunteerDerivedStatus, lastActivity: lastActivityTimestamp };
      });
      setVolunteers(processedVolunteers);
      setRequesters(r);
      setAllUsers([...processedVolunteers, ...r]);
      setPendingRequests(pending);
      setActiveMatches(matches);
    } catch (error) {
      console.error("Error fetching data:", error);
      console.error("Full error object:", error);
    }
    setLoading(false);
  }, []);

  const fetchSessions = useCallback(async (matchId) => {
    setLoadingSessions(true);
    try {
      const sessionsSnap = await getDocs(query(collection(db, "Sessions"), where("matchId", "==", matchId)));
      const sessionsData = sessionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMatchSessions(sessionsData);
    } catch (error) {
      console.error("Error fetching sessions:", error);
    }
    setLoadingSessions(false);
  }, []);

  const handleSort = (columnName) => {
    if (sortColumn === columnName) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(columnName);
      setSortOrder("asc");
    }
  };

  const handleMatchSort = (columnName) => {
    if (matchSortColumn === columnName) {
      setMatchSortOrder(matchSortOrder === "asc" ? "desc" : "asc");
    } else {
      setMatchSortColumn(columnName);
      setMatchSortOrder("asc");
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (selectedMatchForDetails && showSessionDetails) {
      fetchSessions(selectedMatchForDetails);
    } else if (!selectedMatchForDetails) {
      setMatchSessions([]);
    }
  }, [selectedMatchForDetails, showSessionDetails, fetchSessions]);

  const approveVolunteer = async (id) => {
    try {
      await updateDoc(doc(db, "Users", "Info", "Volunteers", id), { approved: "true" });
      await setDoc(doc(db, "Users", "Info"), { Volunteers: increment(1) }, { merge: true });
      setAlertMessage({ message: "מתנדב אושר בהצלחה!", type: "success" });
      fetchData();
    } catch (error) {
      console.error("Error approving volunteer:", error);
      setAlertMessage({ message: "שגיאה באישור המתנדב", type: "error" });
    }
  };

  const declineVolunteer = async (id) => {
    try {
      await updateDoc(doc(db, "Users", "Info", "Volunteers", id), { approved: "declined" });
      setAlertMessage({ message: "מתנדב נדחה בהצלחה.", type: "info" });
      fetchData();
    } catch (error) {
      console.error("Error declining volunteer:", error);
      setAlertMessage({ message: "שגיאה בדחיית המתנדב", type: "error" });
    }
  };

  const approveRequest = async (requestId, requestData) => {
    try {
      const batch = writeBatch(db);
      const matchId = generateRandomId();
      const matchRef = doc(db, "Matches", matchId);
      
      batch.set(matchRef, {
        volunteerId: requestData.volunteerId,
        requesterId: requestData.requesterId,
        requestId: requestId,
        status: "active",
        startDate: new Date(),
        endDate: null,
        meetingFrequency: "weekly",
        totalSessions: 0,
        notes: ""
      });

      batch.update(doc(db, "Requests", requestId), {
        status: "matched",
        matchId: matchId,
        matchedAt: new Date()
      });

      const volunteer = volunteers.find(v => v.id === requestData.volunteerId);
      const volunteerRef = doc(db, "Users", "Info", "Volunteers", requestData.volunteerId);
      batch.update(volunteerRef, {
        activeMatchIds: [...(volunteer?.activeMatchIds || []), matchId]
      });
      const requesterRef = doc(db, "Users", "Info", "Requesters", requestData.requesterId);
      batch.update(requesterRef, {
        activeMatchId: matchId
      });

      await batch.commit();

      const requester = requesters.find(r => r.id === requestData.requesterId);
      await createNotification(
        requestData.requesterId,
        `נוצרה עבורך התאמה חדשה עם ${volunteer?.fullName || 'מתנדב/ת'}!`,
        "/requester-dashboard"
      );
      await createNotification(
        requestData.volunteerId,
        `נוצרה עבורך התאמה חדשה עם ${requester?.fullName || 'פונה'}!`,
        "/volunteer-dashboard"
      );

      setAlertMessage({ message: "הבקשה אושרה והתאמה נוצרה בהצלחה!", type: "success" });
      fetchData();
    } catch (error) {
      console.error("Error approving request:", error);
      setAlertMessage({ message: "שגיאה באישור הבקשה", type: "error" });
    }
  };

  const declineRequest = async (requestId, suggestAnother = false) => {
    const docRef = doc(db, "Requests", requestId);
    const docSnap = await getDoc(docRef);
    try {
      const updateData = {
        status: "waiting_for_first_approval",
        declinedVolunteers: arrayUnion(docSnap.data().volunteerId),
        declinedAt: new Date()
      };
      await updateDoc(doc(db, "Requests", requestId), updateData);
      
      if (suggestAnother) {
        const request = pendingRequests.find(r => r.id === requestId);
        if (request) {
          setPendingRequests([...pendingRequests, { ...request, status: "waiting_for_reassignment" }]);
        }
      }
      
      setAlertMessage({ message: suggestAnother ? "הבקשה נדחתה. ניתן לבחור מתנדב אחר." : "הבקשה נדחתה.", type: "info" });
      fetchData();
    } catch (error) {
      console.error("Error declining request:", error);
      setAlertMessage({ message: "שגיאה בדחיית הבקשה", type: "error" });
    }
  };

  const createManualMatch = async (requesterId, volunteerId, requestId = null) => {
    try {
      const batch = writeBatch(db);
      const matchId = generateRandomId();
      let finalRequestId = requestId;

      if (!requestId) {
        const q = query(collection(db, "Requests"), where("requesterId", "==", requesterId), where("status", "in", ["waiting_for_first_approval", "declined", "waiting_for_reassignment"]));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          finalRequestId = querySnapshot.docs[0].id;
          batch.update(doc(db, "Requests", finalRequestId), { status: "matched", matchedAt: new Date(), volunteerId: volunteerId, matchId: matchId });
        } else {
          finalRequestId = generateRandomId();
          const requestRef = doc(db, "Requests", finalRequestId);
          batch.set(requestRef, { requesterId: requesterId, volunteerId: volunteerId, status: "matched", createdAt: new Date(), messageRequest: "Manual match by admin", personal: false, matchId: matchId });
        }
      } else {
        batch.update(doc(db, "Requests", requestId), { volunteerId: volunteerId, status: "matched", matchedAt: new Date(), matchId: matchId });
      }
      
      const matchRef = doc(db, "Matches", matchId);
      batch.set(matchRef, {
        volunteerId: volunteerId,
        requesterId: requesterId,
        requestId: finalRequestId,
        status: "active",
        startDate: new Date(),
        endDate: null,
        meetingFrequency: "weekly",
        totalSessions: 0,
        notes: "Manual match by admin"
      });

      const volunteer = volunteers.find(v => v.id === volunteerId);
      const volunteerRef = doc(db, "Users", "Info", "Volunteers", volunteerId);
      batch.update(volunteerRef, {
        activeMatchIds: [...(volunteer?.activeMatchIds || []), matchId]
      });

      const requesterRef = doc(db, "Users", "Info", "Requesters", requesterId);
      batch.update(requesterRef, {
        activeMatchId: matchId
      });

      await batch.commit();

      const requester = requesters.find(r => r.id === requesterId);
      await createNotification(
        requesterId,
        `נוצרה עבורך התאמה חדשה עם ${volunteer?.fullName || 'מתנדב/ת'}!`,
        "/requester-dashboard"
      );
      await createNotification(
        volunteerId,
        `נוצרה עבורך התאמה חדשה עם ${requester?.fullName || 'פונה'}!`,
        "/volunteer-dashboard"
      );

      setAlertMessage({ message: "התאמה נוצרה בהצלחה!", type: "success" });
      fetchData();
    } catch (error) {
      console.error("Error creating match:", error);
      setAlertMessage({ message: "שגיאה ביצירת התאמה", type: "error" });
    }
  };

  const handleAIVolunteerSelection = async (volunteerId) => {
    if (selectedRequestForAI) {
      if (selectedRequestForAI.status === "general_matching_ai") {
        setSelectedVolunteer(volunteerId);
        setShowAISuggestions(false);
        setSelectedRequestForAI(null);
        setAiLoadingRequesterId(null);
      } else {
        await createManualMatch(selectedRequestForAI.requesterId, volunteerId, selectedRequestForAI.id);
        setSelectedRequestForAI(null);
      }
    }
  };

  const cancelMatch = async (match_id) => {
    try {
      const matchDoc = await getDoc(doc(db, "Matches", match_id));
      if (!matchDoc.exists()) {
        throw new Error("Match not found");
      }
      
      const matchData = matchDoc.data();
      const vol_id = matchData.volunteerId;
      const request_id = matchData.requestId;

      const volunteerDoc = await getDoc(doc(db, "Users", "Info", "Volunteers", vol_id));
      const currentMatches = volunteerDoc.data().activeMatchIds || [];
      const updatedMatches = currentMatches.filter(id => id !== match_id);

      await Promise.all([
        deleteDoc(doc(db, "Matches", match_id)),
        updateDoc(doc(db, "Requests", request_id), {
          status: "waiting_for_first_approval",
          volunteerId: null
        }),
        updateDoc(doc(db, "Users", "Info", "Requesters", matchData.requesterId), {
          activeMatchId: null
        }),
        updateDoc(doc(db, "Users", "Info", "Volunteers", vol_id), {
          activeMatchIds: updatedMatches
        })
      ]);

      setActiveMatches(prev => prev.filter(match => match.id !== match_id));
      setShowCancelMatchModal(false);
      setAlertMessage({ message: "ההתאמה בוטלה בהצלחה", type: "success" });

    } catch (error) {
      console.error("Error cancelling match:", error);
      setAlertMessage({ message: "שגיאה בביטול ההתאמה", type: "error" });
    }
  };

  const deleteUser = async (user) => {
    try {
      const batch = writeBatch(db);
      
      if (user.role === 'requester') {
        const requesterDocRef = doc(db, "Users", "Info", "Requesters", user.id);
        const requesterDocSnap = await getDoc(requesterDocRef);

        if (requesterDocSnap.exists()) {
          const req_data = requesterDocSnap.data();
          const match_id = req_data.activeMatchId;
          if (match_id) {
            const matchesDocRef = doc(db, "Matches", match_id);
            const matchSnap = await getDoc(matchesDocRef);
            const matchData = matchSnap.data()
            const vol_id = matchData.volunteerId;
            const volunteerDoc = await getDoc(doc(db, "Users", "Info", "Volunteers", vol_id));
            const currentMatches = volunteerDoc.data().activeMatchIds || [];
            const updatedMatches = currentMatches.filter(id => id !== match_id);

            batch.delete(doc(db, "conversations", match_id));
            batch.update(doc(db, "Users", "Info", "Volunteers", vol_id), {
              activeMatchIds: updatedMatches
            });
            batch.delete(matchesDocRef);
          }
          const requestsSnap = await getDocs(query(collection(db, "Requests"), where("requesterId", "==", user.id)));
          requestsSnap.forEach((docSnap) => {
            const docRef = doc(db, "Requests", docSnap.id);
            batch.delete(docRef);
          });
          batch.delete(requesterDocRef);
          await batch.commit();
        }
      } else if (user.role === 'volunteer') {
          const volunteerRef = doc(db, "Users", "Info", "Volunteers", user.id);
          const volunteerSnap = await getDoc(volunteerRef);
          if (volunteerSnap.exists()) {
            const { activeMatchIds = [] } = volunteerSnap.data();
            for (const matchId of activeMatchIds) {
              const convoRef = doc(db, "conversations", matchId);
              const matchRef = doc(db, "Matches", matchId);
              const matchSnap = await getDoc(matchRef);
              if (!matchSnap.exists()) continue;

              const { requesterId } = matchSnap.data();
              batch.delete(convoRef);
              batch.delete(matchRef);
              batch.update(doc(db, "Users", "Info", "Requesters", requesterId), { activeMatchId: null });
              const reqQS = await getDocs(query(collection(db, "Requests"), where("requesterId", "==", requesterId)));
              reqQS.forEach(r => batch.update(r.ref, {
                status: "waiting_for_first_approval",
                volunteerId: null,
                matchedAt: null,
                matchId: null
              }));
            }
            batch.delete(volunteerRef);
            await batch.commit();
          }
      }
      
      setAllUsers(prev => prev.filter(u => u.id !== user.id));
      if (user.role === 'volunteer') {
        setVolunteers(prev => prev.filter(v => v.id !== user.id));
      } else if (user.role === 'requester') {
        setRequesters(prev => prev.filter(r => r.id !== user.id));
      }
      
      setActiveMatches(prev => prev.filter(m => m.requesterId !== user.id && m.volunteerId !== user.id));
      setshowDeleteUserModal(false);
      setAlertMessage({ message: "המשתמש נמחק בהצלחה", type: "success" });
    } catch (error) {
      console.error("Error deleting user:", error);
      setAlertMessage({ message: "שגיאה במחיקת המשתמש", type: "error" });
    }
  };

  const filteredAndSortedUsers = allUsers
    .filter(u => u.fullName?.toLowerCase().includes(userSearch.toLowerCase()) || u.email?.toLowerCase().includes(userSearch.toLowerCase()))
    .filter(u => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (statusFilter !== "all" && u.derivedDisplayStatus !== statusFilter) return false;
      if (personalFilter === "true" && !u.personal) return false;
      if (personalFilter === "false" && u.personal) return false;
      if (activeMatchesFilter === "hasMatches" && ((u.role === 'requester' && !u.activeMatchId) || (u.role === 'volunteer' && (!u.activeMatchIds || u.activeMatchIds.length === 0)))) return false;
      if (activeMatchesFilter === "noMatches" && ((u.role === 'requester' && u.activeMatchId) || (u.role === 'volunteer' && u.activeMatchIds?.length > 0))) return false;
      return true;
    })
    .sort((a, b) => {
      if (!sortColumn) return 0;
      let aValue, bValue;
      if (sortColumn === 'activeMatchIds') {
        aValue = a[sortColumn]?.length || 0;
        bValue = b[sortColumn]?.length || 0;
      } else if (sortColumn === 'approved') {
        const statusOrder = { "ממתין לאישור": 1, "נדחה": 2, "לא פעיל": 3, "פעיל": 4 };
        aValue = statusOrder[a.derivedDisplayStatus] || 99;
        bValue = statusOrder[b.derivedDisplayStatus] || 99;
      } else if (sortColumn === 'personal') {
        aValue = a[sortColumn] === undefined ? false : a[sortColumn];
        bValue = b[sortColumn] === undefined ? false : b[sortColumn];
      } else {
        aValue = a[sortColumn];
        bValue = b[sortColumn];
      }
      if (aValue === undefined || aValue === null) return sortOrder === 'asc' ? 1 : -1;
      if (bValue === undefined || bValue === null) return sortOrder === 'asc' ? -1 : 1;
      if (typeof aValue === 'string' && typeof bValue === 'string') return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      else if (typeof aValue === 'boolean' && typeof bValue === 'boolean') return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      else return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = filteredAndSortedUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAndSortedUsers.length / itemsPerPage);

  return (
    <div className="p-6 space-y-6 mt-[-2rem]">
      <h2 className="text-3xl font-bold text-orange-800 text-center">לוח ניהול</h2>
      <div className="flex gap-2 mb-4 justify-center flex-wrap">
        <Button variant={activeTab === "volunteers" ? "default" : "outline"} onClick={() => setActiveTab("volunteers")} className="py-3 px-6 text-lg">מתנדבים לאישור ({volunteers.filter(v => v.approved === "pending").length})</Button>
        <Button variant={activeTab === "approvals" ? "default" : "outline"} onClick={() => setActiveTab("approvals")} className="py-3 px-6 text-lg">התאמות ממתינות לאישור ({pendingRequests.length})</Button>
        <Button variant={activeTab === "matching" ? "default" : "outline"} onClick={() => setActiveTab("matching")} className="py-3 px-6 text-lg">התאמה כללית ({requesters.filter(req => !(req.activeMatchId)).filter(req => req.fullName?.toLowerCase().includes(requesterSearch.toLowerCase()) || req.email?.toLowerCase().includes(requesterSearch.toLowerCase())).length})</Button>
        <Button variant={activeTab === "matches" ? "default" : "outline"} onClick={() => setActiveTab("matches")} className="py-3 px-6 text-lg">פיקוח התאמות ({activeMatches.length})</Button>
        <Button variant={activeTab === "users" ? "default" : "outline"} onClick={() => setActiveTab("users")} className="py-3 px-6 text-lg">כל המשתמשים ({allUsers.length})</Button>
        <Button variant={activeTab === "EventCreation" ? "default" : "outline"} onClick={() => setActiveTab("EventCreation")} className="py-3 px-6 text-lg">יצירת אירוע</Button>
        <Button variant={activeTab === "EventList" ? "default" : "outline"} onClick={() => setActiveTab("EventList")} className="py-3 px-6 text-lg">רשימת אירועים</Button>
      </div>
      {activeTab === "volunteers" && (
        <Card><CardContent><h3 className="font-semibold mb-4 text-orange-700">מתנדבים ממתינים לאישור</h3>{volunteers.filter(v => v.approved === "pending").length === 0 ? (<p className="text-orange-600/80">אין מתנדבים בהמתנה.</p>) : (<div className="space-y-2">{volunteers.filter(v => v.approved === "pending").map(v => (<div key={v.id} className="flex justify-between items-start bg-orange-50/50 p-3 rounded border border-orange-100"><div className="flex-grow"><div className="grid grid-cols-2 gap-x-8 w-full"><div><h4 className="font-semibold text-orange-800 mb-2">פרטי מתנדב</h4><p className="text-sm text-orange-600"><strong>שם:</strong> {v.fullName}</p><p className="text-sm text-orange-600"><strong>אימייל:</strong> {v.email}</p><p className="text-sm text-orange-600"><strong>מקצוע:</strong> {v.profession}</p>{v.age && <p className="text-sm text-orange-600"><strong>גיל:</strong> {v.age}</p>}{v.gender && <p className="text-sm text-orange-600"><strong>מגדר:</strong> {v.gender}</p>}{v.location && <p className="text-sm text-orange-600"><strong>מיקום:</strong> {v.location}</p>}</div><div><h4 className="font-semibold text-orange-800 mb-2">פרטים נוספים</h4>{v.experience && <p className="text-sm text-orange-600"><strong>ניסיון:</strong> {v.experience}</p>}{v.maritalStatus && <p className="text-sm text-orange-600"><strong>מצב משפחתי:</strong> {v.maritalStatus}</p>}{v.motivation && <p className="text-sm text-orange-600"><strong>מוטיבציה:</strong> {v.motivation}</p>}{v.strengths && <p className="text-sm text-orange-600"><strong>חוזקות:</strong> {v.strengths}</p>}{v.availableDays && v.availableDays.length > 0 && (<p className="text-sm text-orange-600"><strong>ימים פנויים:</strong> {v.availableDays.join(", ")}</p>)}{v.availableHours && v.availableHours.length > 0 && (<p className="text-sm text-orange-600"><strong>שעות פנויות:</strong> {v.availableHours.join(", ")}</p>)}</div></div></div><div className="flex flex-col gap-2"><Button variant="outline" onClick={() => approveVolunteer(v.id)}>אשר מתנדב</Button><Button variant="outline" onClick={() => declineVolunteer(v.id)}>דחה מתנדב</Button></div></div>))}</div>)}</CardContent></Card>
      )}
      {activeTab === "approvals" && (
        <Card><CardContent><h3 className="font-semibold mb-4 text-orange-700">התאמות ממתינות לאישור</h3>{pendingRequests.length === 0 ? (<p className="text-orange-600/80">אין התאמות ממתינות.</p>) : (<div className="space-y-4">{pendingRequests.map(request => (<div key={request.id} className="flex justify-between items-start border rounded p-4 bg-orange-50/50"><div className="grid grid-cols-2 gap-x-8 flex-grow"><div><h4 className="font-semibold text-orange-800 mb-2">פרטי הפונה</h4><p className="text-sm text-orange-600"><strong>שם:</strong> {request.requesterInfo?.fullName}</p><p className="text-sm text-orange-600"><strong>אימייל:</strong> {request.requesterInfo?.email}</p><p className="text-sm text-orange-600"><strong>גיל:</strong> {request.requesterInfo?.age}</p>{request.requesterInfo?.gender && <p className="text-sm text-orange-600"><strong>מגדר:</strong> {request.requesterInfo?.gender}</p>}<p className="text-sm text-orange-600"><strong>סיבת פנייה:</strong> {request.requesterInfo?.reason}</p>{request.requesterInfo?.needs && <p className="text-sm text-orange-600"><strong>צרכים:</strong> {request.requesterInfo?.needs}</p>}{request.requesterInfo?.chatPref && <p className="text-sm text-orange-600"><strong>העדפת צ׳אט:</strong> {request.requesterInfo?.chatPref.join(', ')}</p>}{request.requesterInfo?.frequency && <p className="text-sm text-orange-600"><strong>תדירות:</strong> {request.requesterInfo?.frequency.join(', ')}</p>}{request.requesterInfo?.preferredTimes && <p className="text-sm text-orange-600"><strong>זמנים מועדפים:</strong> {request.requesterInfo?.preferredTimes}</p>}{request.requesterInfo?.location && <p className="text-sm text-orange-600"><strong>מיקום:</strong> {request.requesterInfo?.location}</p>}<p className="text-sm text-orange-600"><strong>התאמות פעילות:</strong> {request.requesterInfo?.activeMatchIds?.length || 0}</p></div><div><h4 className="font-semibold text-orange-800 mb-2">פרטי המתנדב</h4><p className="text-sm text-orange-600"><strong>שם:</strong> {request.volunteerInfo?.fullName}</p><p className="text-sm text-orange-600"><strong>אימייל:</strong> {request.volunteerInfo?.email}</p><p className="text-sm text-orange-600"><strong>מקצוע:</strong> {request.volunteerInfo?.profession}</p><p className="text-sm text-orange-600"><strong>ניסיון:</strong> {request.volunteerInfo?.experience}</p>{request.volunteerInfo?.age && <p className="text-sm text-orange-600"><strong>גיל:</strong> {request.volunteerInfo?.age}</p>}{request.volunteerInfo?.gender && <p className="text-sm text-orange-600"><strong>מגדר:</strong> {request.volunteerInfo?.gender}</p>}{request.volunteerInfo?.location && <p className="text-sm text-orange-600"><strong>מיקום:</strong> {request.volunteerInfo?.location}</p>}{request.volunteerInfo?.maritalStatus && <p className="text-sm text-orange-600"><strong>מצב משפחתי:</strong> {request.volunteerInfo?.maritalStatus}</p>}{request.volunteerInfo?.motivation && <p className="text-sm text-orange-600"><strong>מוטיבציה:</strong> {request.volunteerInfo?.motivation}</p>}{request.volunteerInfo?.strengths && <p className="text-sm text-orange-600"><strong>חוזקות:</strong> {request.volunteerInfo?.strengths}</p>}{request.volunteerInfo?.availableDays && request.volunteerInfo.availableDays.length > 0 && (<p className="text-sm text-orange-600"><strong>ימים פנויים:</strong> {request.volunteerInfo.availableDays.join(", ")}</p>)}{request.volunteerInfo?.availableHours && request.volunteerInfo.availableHours.length > 0 && (<p className="text-sm text-orange-600"><strong>שעות פנויות:</strong> {request.volunteerInfo.availableHours.join(", ")}</p>)}<p className="text-sm text-orange-600"><strong>התאמות פעילות:</strong> {request.volunteerInfo?.activeMatchIds?.length || 0}</p></div></div><div className="flex flex-col gap-2"><Button variant="outline" onClick={() => approveRequest(request.id, request)}>אשר התאמה</Button><Button variant="outline" onClick={() => declineRequest(request.id, false)}>דחה התאמה</Button></div></div>))}</div>)}</CardContent></Card>
      )}
      {activeTab === "matching" && (
        <Card className="mt-[-2rem]"><CardContent><h3 className="font-semibold mb-4 text-orange-700">שיוך פונים למתנדבים</h3><div className="flex flex-grow gap-8"><div className="w-1/4 border rounded p-4 bg-gray-50/50 h-[510px] overflow-y-scroll" onMouseEnter={() => {if (requesterHoverTimeoutRef.current) { clearTimeout(requesterHoverTimeoutRef.current); requesterHoverTimeoutRef.current = null; }}} onMouseLeave={() => {if (!selectedRequester) { requesterHoverTimeoutRef.current = setTimeout(() => { setHoveredRequester(null); }, 100); }}}><h3 className="font-semibold mb-4 text-gray-700">פרטי פונה</h3>{(selectedRequester && requesters.find(r => r.id === selectedRequester)) ? <div className="space-y-2 text-base"><p><strong>שם:</strong> {requesters.find(r => r.id === selectedRequester)?.fullName}</p><p><strong>אימייל:</strong> {requesters.find(r => r.id === selectedRequester)?.email}</p><p><strong>גיל:</strong> {requesters.find(r => r.id === selectedRequester)?.age}</p><p><strong>מגדר:</strong> {requesters.find(r => r.id === selectedRequester)?.gender}</p><p><strong>סיבת פנייה:</strong> {requesters.find(r => r.id === selectedRequester)?.reason}</p>{requesters.find(r => r.id === selectedRequester)?.needs && <p><strong>צרכים:</strong> {requesters.find(r => r.id === selectedRequester)?.needs}</p>}{requesters.find(r => r.id === selectedRequester)?.chatPref && <p><strong>העדפת צ׳אט:</strong> {requesters.find(r => r.id === selectedRequester)?.chatPref.join(', ')}</p>}{requesters.find(r => r.id === selectedRequester)?.frequency && <p><strong>תדירות:</strong> {requesters.find(r => r.id === selectedRequester)?.frequency.join(', ')}</p>}{requesters.find(r => r.id === selectedRequester)?.preferredTimes && <p><strong>זמנים מועדפים:</strong> {requesters.find(r => r.id === selectedRequester)?.preferredTimes}</p>}{requesters.find(r => r.id === selectedRequester)?.location && <p><strong>מיקום:</strong> {requesters.find(r => r.id === selectedRequester)?.location}</p>}<p><strong>התאמות פעילות:</strong> {requesters.find(r => r.id === selectedRequester)?.activeMatchIds?.length || 0}</p></div> : hoveredRequester ? <div className="space-y-2 text-base"><p><strong>שם:</strong> {hoveredRequester.fullName}</p><p><strong>אימייל:</strong> {hoveredRequester.email}</p><p><strong>גיל:</strong> {hoveredRequester.age}</p><p><strong>מגדר:</strong> {hoveredRequester.gender}</p><p><strong>סיבת פנייה:</strong> {hoveredRequester.reason}</p>{hoveredRequester.needs && <p><strong>צרכים:</strong> {hoveredRequester.needs}</p>}{hoveredRequester.chatPref && <p><strong>העדפת צ׳אט:</strong> {hoveredRequester.chatPref.join(', ')}</p>}{hoveredRequester.frequency && <p><strong>תדירות:</strong> {hoveredRequester.frequency.join(', ')}</p>}{hoveredRequester.preferredTimes && <p><strong>זמנים מועדפים:</strong> {hoveredRequester.preferredTimes}</p>}{hoveredRequester.location && <p><strong>מיקום:</strong> {hoveredRequester.location}</p>}<p><strong>התאמות פעילות:</strong> {hoveredRequester.activeMatchIds?.length || 0}</p></div> : <p className="text-gray-500">רחף על פונה או בחר אותו כדי לראות פרטים.</p>}</div><div className="w-1/4 border rounded p-4 bg-orange-50/50"><div className="flex items-center gap-2 mb-2"><input type="text" placeholder="חיפוש פונה..." value={requesterSearch} onChange={e => setRequesterSearch(e.target.value)} className="border rounded px-2 py-1 w-full" /></div><h4 className="font-bold mb-2 text-orange-700">פונים</h4><ul className="space-y-2 h-[400px] overflow-y-scroll">{requesters.filter(req => !(req.activeMatchId)).filter(req => req.fullName?.toLowerCase().includes(requesterSearch.toLowerCase()) || req.email?.toLowerCase().includes(requesterSearch.toLowerCase())).map(req => (<li key={req.id} className={`flex items-center gap-2 bg-white p-2 rounded shadow cursor-pointer ${selectedRequester === req.id ? 'border-2 border-orange-500 ring-2 ring-orange-200' : ''}`} onClick={() => { if (selectedRequester === req.id) { setSelectedRequester(null); setSelectedVolunteer(null); } else { setSelectedRequester(req.id); setSelectedVolunteer(null); } }} onMouseEnter={() => { if (requesterHoverTimeoutRef.current) { clearTimeout(requesterHoverTimeoutRef.current); requesterHoverTimeoutRef.current = null; } setHoveredRequester(req); }} onMouseLeave={() => { if (!selectedRequester) { requesterHoverTimeoutRef.current = setTimeout(() => { setHoveredRequester(null); }, 100); } }}><span className="cursor-pointer"><strong className="text-orange-800">{req.fullName}</strong><span className="text-orange-600 text-sm"> ({req.age} שנים)</span></span>{selectedRequester === req.id && aiLoadingRequesterId === req.id && (<span className="text-sm text-gray-500 mr-2"> (ממתין לתשובת AI...)</span>)}</li>))}</ul></div><div className="w-1/4 border rounded p-4 bg-orange-50/50"><div className="flex items-center gap-2 mb-2"><input type="text" placeholder="חיפוש מתנדב..." value={volunteerSearch} onChange={e => setVolunteerSearch(e.target.value)} className="border rounded px-2 py-1 w-full" /></div><h4 className="font-bold mb-2 text-orange-700">מתנדבים</h4><ul className="space-y-2 h-[400px] overflow-y-scroll">{volunteers.filter(v => v.approved === "true" && (v.isAvailable || v.isAvaliable) && !v.personal).filter(v => ((v.fullName || '').toLowerCase().includes(volunteerSearch.toLowerCase())) || ((v.email || '').toLowerCase().includes(volunteerSearch.toLowerCase()))).map(v => (<li key={v.id} className={`flex items-center gap-2 bg-white p-2 rounded shadow cursor-pointer ${selectedVolunteer === v.id ? 'border-2 border-orange-500 ring-2 ring-orange-200' : ''} ${!selectedRequester ? 'opacity-50 cursor-not-allowed' : ''}`} onClick={() => { if (selectedRequester) { if (selectedVolunteer === v.id) { setSelectedVolunteer(null); } else { setSelectedVolunteer(v.id); } } }} onMouseEnter={() => { if (volunteerHoverTimeoutRef.current) { clearTimeout(volunteerHoverTimeoutRef.current); volunteerHoverTimeoutRef.current = null; } setHoveredVolunteer(v); }} onMouseLeave={() => { if (!selectedVolunteer) { volunteerHoverTimeoutRef.current = setTimeout(() => { setHoveredVolunteer(null); }, 100); } }}><strong className="text-orange-800">{v.fullName}</strong><span className="text-orange-600 text-sm"> ({v.profession})</span></li>))}</ul></div><div className="w-1/4 border rounded p-4 bg-gray-50/50 h-[510px] overflow-y-scroll" onMouseEnter={() => {if (volunteerHoverTimeoutRef.current) { clearTimeout(volunteerHoverTimeoutRef.current); volunteerHoverTimeoutRef.current = null; }}} onMouseLeave={() => {if (!selectedVolunteer) { volunteerHoverTimeoutRef.current = setTimeout(() => { setHoveredVolunteer(null); }, 100); }}}><h3 className="font-semibold mb-4 text-gray-700">פרטי מתנדב</h3>{(selectedVolunteer && volunteers.find(v => v.id === selectedVolunteer)) ? <div className="space-y-2 text-base"><p><strong>שם:</strong> {volunteers.find(v => v.id === selectedVolunteer)?.fullName}</p><p><strong>אימייל:</strong> {volunteers.find(v => v.id === selectedVolunteer)?.email}</p><p><strong>גיל:</strong> {volunteers.find(v => v.id === selectedVolunteer)?.age}</p><p><strong>מקצוע:</strong> {volunteers.find(v => v.id === selectedVolunteer)?.profession}</p><p><strong>ניסיון:</strong> {volunteers.find(v => v.id === selectedVolunteer)?.experience}</p>{volunteers.find(v => v.id === selectedVolunteer)?.gender && <p><strong>מגדר:</strong> {volunteers.find(v => v.id === selectedVolunteer)?.gender}</p>}{volunteers.find(v => v.id === selectedVolunteer)?.maritalStatus && <p><strong>מצב משפחתי:</strong> {volunteers.find(v => v.id === selectedVolunteer)?.maritalStatus}</p>}{volunteers.find(v => v.id === selectedVolunteer)?.motivation && <p><strong>מוטיבציה:</strong> {volunteers.find(v => v.id === selectedVolunteer)?.motivation}</p>}{volunteers.find(v => v.id === selectedVolunteer)?.strengths && <p><strong>חוזקות:</strong> {volunteers.find(v => v.id === selectedVolunteer)?.strengths}</p>}{volunteers.find(v => v.id === selectedVolunteer)?.availableDays && volunteers.find(v => v.id === selectedVolunteer)?.availableDays.length > 0 && <p><strong>ימים פנויים:</strong> {volunteers.find(v => v.id === selectedVolunteer)?.availableDays.join(', ')}</p>}{volunteers.find(v => v.id === selectedVolunteer)?.availableHours && volunteers.find(v => v.id === selectedVolunteer)?.availableHours.length > 0 && <p><strong>שעות פנויות:</strong> {volunteers.find(v => v.id === selectedVolunteer)?.availableHours.join(', ')}</p>}<p><strong>התאמות פעילות:</strong> {volunteers.find(v => v.id === selectedVolunteer)?.activeMatchIds?.length || 0}</p></div> : hoveredVolunteer ? <div className="space-y-2 text-base"><p><strong>שם:</strong> {hoveredVolunteer.fullName}</p><p><strong>אימייל:</strong> {hoveredVolunteer.email}</p><p><strong>גיל:</strong> {hoveredVolunteer.age}</p><p><strong>מקצוע:</strong> {hoveredVolunteer.profession}</p><p><strong>ניסיון:</strong> {hoveredVolunteer.experience}</p>{hoveredVolunteer.gender && <p><strong>מגדר:</strong> {hoveredVolunteer.gender}</p>}{hoveredVolunteer.maritalStatus && <p><strong>מצב משפחתי:</strong> {hoveredVolunteer.maritalStatus}</p>}{hoveredVolunteer.motivation && <p><strong>מוטיבציה:</strong> {hoveredVolunteer.motivation}</p>}{hoveredVolunteer.strengths && <p><strong>חוזקות:</strong> {hoveredVolunteer.strengths}</p>}{hoveredVolunteer.availableDays && hoveredVolunteer.availableDays.length > 0 && <p><strong>ימים פנויים:</strong> {hoveredVolunteer.availableDays.join(', ')}</p>}{hoveredVolunteer.availableHours && hoveredVolunteer.availableHours.length > 0 && <p><strong>שעות פנויות:</strong> {hoveredVolunteer.availableHours.join(', ')}</p>}<p><strong>התאמות פעילות:</strong> {hoveredVolunteer.activeMatchIds?.length || 0}</p></div> : <p className="text-gray-500">רחף על מתנדב או בחר אותו כדי לראות פרטים.</p>}</div></div><div className="mt-4 flex justify-center gap-2 w-full"><Button className={`py-3 px-6 text-lg ${!(selectedRequester && selectedVolunteer) ? "bg-gray-400 text-white cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 text-white"}`} disabled={!(selectedRequester && selectedVolunteer)} onClick={() => { if (selectedRequester && selectedVolunteer) { createManualMatch(selectedRequester, selectedVolunteer); setSelectedRequester(null); setSelectedVolunteer(null); } }}>צור התאמה</Button><Button variant="outline" className={`py-3 px-6 text-lg ${!selectedRequester ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={!selectedRequester} onClick={() => { const requesterData = requesters.find(req => req.id === selectedRequester); if (requesterData) { setAiLoadingRequesterId(requesterData.id); setSelectedRequestForAI({ id: generateRandomId(), requesterId: requesterData.id, requesterInfo: { ...requesterData, reason: requesterData.reason || "בקשת תמיכה כללית", gender: requesterData.gender || "לא ידוע" }, messageRequest: `הצעת AI להתאמה כללית עבור ${requesterData.fullName} (גיל: ${requesterData.age || 'לא ידוע'}, סיבה: ${requesterData.reason || 'בקשת תמיכה כללית'}). זוהי בקשה כללית להתאמה למתנדב תמיכה, ללא סיבה ספציפית מפורטת מהפונה.`, status: "general_matching_ai" }); setShowAISuggestions(true); } }}>הצעות AI</Button></div></CardContent></Card>
      )}
      {activeTab === "matches" && (
        <Card><CardContent><h3 className="font-semibold mb-4 text-orange-700">פיקוח התאמות פעילות</h3>{showSessionDetails ? (<div className="space-y-4"><Button onClick={() => { setShowSessionDetails(false); setSelectedMatchForDetails(null); }}>חזור לרשימת ההתאמות</Button><h4 className="text-xl font-semibold text-orange-800">פירוט פגישות עבור התאמה</h4>{loadingSessions ? <LoadingSpinner /> : matchSessions.length === 0 ? <p className="text-orange-600/80">אין פגישות זמינות עבור התאמה זו.</p> : (<div className="overflow-x-auto"><table className="w-full text-sm border-collapse"><thead><tr className="bg-orange-50"><th className="border border-orange-100 p-2 text-orange-800">תאריך ושעה</th><th className="border border-orange-100 p-2 text-orange-800">סטטוס</th><th className="border border-orange-100 p-2 text-orange-800">משך (דקות)</th><th className="border border-orange-100 p-2 text-orange-800">מיקום</th><th className="border border-orange-100 p-2 text-orange-800">הערה</th><th className="border border-orange-100 p-2 text-orange-800">סיכום</th></tr></thead><tbody>{matchSessions.map(session => (<tr key={session.id} className="hover:bg-orange-50/50"><td className="border border-orange-100 p-2 text-orange-700">{session.scheduledTime ? new Date(session.scheduledTime.seconds * 1000).toLocaleString() : 'N/A'}</td><td className="border border-orange-100 p-2 text-orange-700">{session.status || 'N/A'}</td><td className="border border-orange-100 p-2 text-orange-700">{session.durationMinutes || 'N/A'}</td><td className="border border-orange-100 p-2 text-orange-700">{session.location || 'N/A'}</td><td className="border border-orange-100 p-2 text-orange-700">{session.notes || 'N/A'}</td><td className="border border-orange-100 p-2 text-orange-700"><span className="text-blue-600 hover:underline cursor-pointer" onClick={() => setSelectedSessionForView(session.sessionSummary)}>צפייה</span></td></tr>))}</tbody></table></div>)}</div>) : (<><div className="mb-4"><input type="text" placeholder="חיפוש התאמה לפי שם פונה/מתנדב..." value={activeMatchSearch} onChange={e => setActiveMatchSearch(e.target.value)} className="border rounded px-3 py-2 w-full" /></div>{activeMatches.length === 0 ? <p className="text-orange-600/80">אין התאמות פעילות.</p> : (<div className="overflow-x-auto"><table className="w-full text-sm border-collapse"><thead><tr className="bg-orange-50"><th className="border border-orange-100 p-2 text-orange-800 cursor-pointer" onClick={() => handleMatchSort('requesterInfo.fullName')}>פונה{matchSortColumn === 'requesterInfo.fullName' && (matchSortOrder === 'asc' ? ' ▲' : ' ▼')}</th><th className="border border-orange-100 p-2 text-orange-800 cursor-pointer" onClick={() => handleMatchSort('volunteerInfo.fullName')}>מתנדב{matchSortColumn === 'volunteerInfo.fullName' && (matchSortOrder === 'asc' ? ' ▲' : ' ▼')}</th><th className="border border-orange-100 p-2 text-orange-800 cursor-pointer" onClick={() => handleMatchSort('meetingFrequency')}>תדירות פגישות{matchSortColumn === 'meetingFrequency' && (matchSortOrder === 'asc' ? ' ▲' : ' ▼')}</th><th className="border border-orange-100 p-2 text-orange-800">סיכום</th><th className="border border-orange-100 p-2 text-orange-800">ביטול התאמה</th></tr></thead><tbody>{activeMatches.filter(match => match.requesterInfo?.fullName?.toLowerCase().includes(activeMatchSearch.toLowerCase()) || match.volunteerInfo?.fullName?.toLowerCase().includes(activeMatchSearch.toLowerCase()) || match.requestId?.toLowerCase().includes(activeMatchSearch.toLowerCase())).filter(match => {if (matchRequesterFilter !== "all" && match.requesterId !== matchRequesterFilter) return false; if (matchVolunteerFilter !== "all" && match.volunteerId !== matchVolunteerFilter) return false; return true;}).sort((a, b) => {if (!matchSortColumn) return 0; let aValue, bValue; if (matchSortColumn === 'requesterInfo.fullName') { aValue = a.requesterInfo?.fullName || ''; bValue = b.requesterInfo?.fullName || ''; } else if (matchSortColumn === 'volunteerInfo.fullName') { aValue = a.volunteerInfo?.fullName || ''; bValue = b.volunteerInfo?.fullName || ''; } else if (matchSortColumn === 'meetingFrequency') { aValue = a[matchSortColumn] || ''; bValue = b[matchSortColumn] || ''; } else { aValue = a[matchSortColumn]; bValue = b[matchSortColumn]; } if (typeof aValue === 'string' && typeof bValue === 'string') return matchSortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue); else return matchSortOrder === 'asc' ? aValue - bValue : bValue - aValue; }).slice((activeMatchCurrentPage - 1) * itemsPerPage, activeMatchCurrentPage * itemsPerPage).map(match => (<tr key={match.id} className="hover:bg-orange-50/50"><td className="border border-orange-100 p-2 text-orange-700"><HoverCard user={match.requesterInfo}>{match.requesterInfo?.fullName || 'N/A'}</HoverCard></td><td className="border border-orange-100 p-2 text-orange-700"><HoverCard user={match.volunteerInfo}>{match.volunteerInfo?.fullName || 'N/A'}</HoverCard></td><td className="border border-orange-100 p-2 text-orange-700">{match.meetingFrequency || 'N/A'}</td><td className="border border-orange-100 p-2 text-center"><span className="text-blue-600 hover:underline cursor-pointer" onClick={() => { setSelectedMatchForDetails(match.id); setShowSessionDetails(true); }}>פירוט</span></td><td className="border border-orange-100 p-2 text-center"><Button onClick={() => { setSelectedMatchForDetails(match.id); setShowSessionDetails(false); setShowCancelMatchModal(true); }} className="p-2 rounded-full text-red-600 hover:text-white hover:bg-red-600 focus:outline-none transition-colors duration-200 flex items-center justify-center mx-auto"><svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></Button></td></tr>))}</tbody></table></div>)}<div className="flex justify-between items-center mt-4"><Button onClick={() => setActiveMatchCurrentPage(prev => Math.max(1, prev - 1))} disabled={activeMatchCurrentPage === 1} variant="outline">הקודם</Button><span className="text-orange-700">עמוד {activeMatchCurrentPage} מתוך {Math.ceil(activeMatches.length / itemsPerPage)}</span><Button onClick={() => setActiveMatchCurrentPage(prev => Math.min(Math.ceil(activeMatches.length / itemsPerPage), prev + 1))} variant="outline">הבא</Button></div></>)}</CardContent></Card>
      )}
      {activeTab === 'EventCreation' && (<EventCreation/>)}
      {activeTab === 'EventList' && (<AdminEventList/>)}
      <AISuggestionModal isOpen={showAISuggestions} onClose={() => { setShowAISuggestions(false); setSelectedRequestForAI(null); setAiLoadingRequesterId(null); }} request={selectedRequestForAI} volunteers={volunteers} onSelectVolunteer={handleAIVolunteerSelection} />
      <ViewSessionSummaryModal isOpen={!!selectedSessionForView} onClose={() => setSelectedSessionForView(null)} sessionSummary={selectedSessionForView} />
      <CustomAlert message={alertMessage?.message} onClose={() => setAlertMessage(null)} type={alertMessage?.type} />
      <CancelMatchModal isOpen={showCancelMatchModal} onClose={() => setShowCancelMatchModal(false)} match={activeMatches.find(m => m.id === selectedMatchForDetails)} onConfirm={() => cancelMatch(selectedMatchForDetails)} />
      <DeleteUserModal isOpen={showDeleteUserModal} onClose={() => { setshowDeleteUserModal(false); setSelectedUserForDelete(null); }} user={selectedUserForDelete} onConfirm={() => deleteUser(selectedUserForDelete)} />
    </div>
  );
}

const ViewSessionSummaryModal = ({ isOpen, onClose, sessionSummary }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg bg-white p-6">
        <CardContent>
          <h2 className="text-2xl font-bold mb-4 text-orange-800">סיכום פגישה</h2>
          <div className="space-y-4">
            <p className="text-gray-700 whitespace-pre-wrap">{sessionSummary}</p>
            <div className="flex justify-end gap-3 mt-6">
              <Button onClick={onClose}>סגור</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};