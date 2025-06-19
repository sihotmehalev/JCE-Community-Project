// AdminDashboard.jsx - Full Implementation
import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
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
  onSnapshot,
  orderBy,
  limit,
  addDoc,
  setDoc as setFirestoreDoc // Alias setDoc to avoid conflict
} from "firebase/firestore";
import emailjs from 'emailjs-com'; // Import emailjs
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { HoverCard } from "../ui/HoverCard";
import AISuggestionModal from '../modals/AISuggestionModal';
import { generateRandomId } from "../../utils/firebaseHelpers";
import LoadingSpinner from "../ui/LoadingSpinner";
import EventCreation from "../admin/event-management/AdminAddEvent";
import { AdminEventList } from '../admin/event-management/AdminEventList'
import CustomAlert from "../ui/CustomAlert";
import { CancelMatchModal } from '.././ui/CancelMatchModal';
import { DeleteUserModal } from '.././ui/DeleteUserModal'
import ChatPanel from "../ui/ChatPanel";
import { serverTimestamp } from "firebase/firestore";
import CustomFieldEditor from '../admin/CustomFieldEditor'; // Import the new component

// Helper function to render custom fields for admin view
const renderCustomFieldsForAdmin = (user, config, title = "מידע נוסף:") => {
  if (!user || !config || !Array.isArray(config.customFields) || config.customFields.length === 0) {
    return null;
  }

  const fieldsToRender = config.customFields
    .filter(fieldDef => user.hasOwnProperty(fieldDef.name))
    .map(fieldDef => {
      let displayValue = user[fieldDef.name];
      if (Array.isArray(displayValue)) {
        displayValue = displayValue.join(", ");
      } else if (typeof displayValue === 'boolean') {
        displayValue = displayValue ? "כן" : "לא";
      } else if (displayValue === null || displayValue === undefined || displayValue === '') {
        displayValue = "—";
      }
      return (
        <p key={fieldDef.name} className="text-sm text-orange-600">
          <strong>{fieldDef.label}:</strong> {String(displayValue)}
        </p>
      );
    });

  if (fieldsToRender.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 pt-3 border-t border-orange-200">
      <h5 className="font-semibold text-orange-700 mb-1">{title}</h5>
      <div className="space-y-1">
        {fieldsToRender}
      </div>
    </div>
  );
};

// Helper function for displaying fullName with behalf info
const getRequesterDisplayName = (requester) => {
  if (!requester) return '';
  const { fullName, behalfName, behalfDetails } = requester;
  let extra = [];
  if (behalfName && behalfName.trim() !== "") extra.push(behalfName);
  if (behalfDetails && behalfDetails.trim() !== "") extra.push(behalfDetails);
  if (extra.length > 0) {
    return `${fullName} (עבור: ${extra.join(', ')})`;
  }
  return fullName;
};


export default function AdminDashboard() {
  // State Management
  const [selectedRequester, setSelectedRequester] = useState(null);
  const [selectedVolunteer, setSelectedVolunteer] = useState(null);
  
  useEffect(() => {
    emailjs.init(process.env.REACT_APP_EMAILJS_PUBLIC_KEY);
  }, []);

  const [requesterSearch, setRequesterSearch] = useState("");
  const [volunteerSearch, setVolunteerSearch] = useState("");
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
  const [volunteerCurrentPage, setVolunteerCurrentPage] = useState(1);
  const [approvalCurrentPage, setApprovalCurrentPage] = useState(1);
  const [activeMatchCurrentPage, setActiveMatchCurrentPage] = useState(1);
  const [matchSessionCurrentPage, setMatchSessionCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [volunteersPerPage] = useState(3);
  const [approvalsPerPage] = useState(2);
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [personalFilter, setPersonalFilter] = useState("all");
  const [activeMatchesFilter, setActiveMatchesFilter] = useState("all");
  const [activeMatches, setActiveMatches] = useState([]);
  const [activeMatchSearch, setActiveMatchSearch] = useState("");
  const [matchRequesterFilter] = useState("all");
  const [matchVolunteerFilter] = useState("all");
  const [matchSortColumn, setMatchSortColumn] = useState(null);
  const [matchSortOrder, setMatchSortOrder] = useState("asc");

  // Session details states
  const [showSessionDetails, setShowSessionDetails] = useState(false);
  const [selectedMatchForDetails, setSelectedMatchForDetails] = useState(null);
  const [matchSessions, setMatchSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Hover info panels states
  const [hoveredRequester, setHoveredRequester] = useState(null);
  const [hoveredVolunteer, setHoveredVolunteer] = useState(null);
  const requesterHoverTimeoutRef = useRef(null);
  const volunteerHoverTimeoutRef = useRef(null);

  // Session summary states
  const [selectedSessionForView, setSelectedSessionForView] = useState(null);
  const [alertMessage, setAlertMessage] = useState(null);

  // Modal states
  const [showCancelMatchModal, setShowCancelMatchModal] = useState(false);
  const [showDeleteUserModal, setshowDeleteUserModal] = useState(false);
  const [selectedUserForDelete, setSelectedUserForDelete] = useState(null);

  // Chat panel states
  const [showChatPanel, setShowChatPanel] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const [userSelectedForChat, setUserSelectedForChat] = useState(null);
  const [userLastChatTimestamps, setUserLastChatTimestamps] = useState({});
  
  // Form Customization states
  const [requesterFormConfig, setRequesterFormConfig] = useState({ hideNoteField: false, customFields: [] });
  const [volunteerFormConfig, setVolunteerFormConfig] = useState({ customFields: [] });
  const [loadingFormConfig, setLoadingFormConfig] = useState(true);
  const [showFieldEditor, setShowFieldEditor] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [editingRoleType, setEditingRoleType] = useState(null);

  // Listen for last chat messages
  useEffect(() => {
    const fetchLastMessages = async () => {
      const timestamps = {};
      for (const user of allUsers) {
        if (user.conversationsWithAdminId) {
          const messagesRef = collection(db, "conversations", user.conversationsWithAdminId, "messages");
          const q = query(messagesRef, orderBy("timestamp", "desc"), limit(1));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const ts = snap.docs[0].data().timestamp;
            timestamps[user.id] = ts?.toMillis ? ts.toMillis() : (ts?.seconds ? ts.seconds * 1000 : 0);
          } else {
            timestamps[user.id] = 0;
          }
        } else {
          timestamps[user.id] = 0;
        }
      }
      setUserLastChatTimestamps(timestamps);
    };
    if (allUsers.length > 0) fetchLastMessages();
  }, [allUsers]);

  // Memoized calculations for pagination and filtering
  const filteredAndSortedUsers = useMemo(() => {
    return allUsers
      .filter(u =>
        (roleFilter === "all" || u.role === roleFilter) &&
        (statusFilter === "all" || u.derivedDisplayStatus === statusFilter) &&
        (personalFilter === "all" || String(u.personal) === personalFilter) &&
        (activeMatchesFilter === "all" ||
          (activeMatchesFilter === "hasMatches" && (u.activeMatchId || u.activeMatchIds?.length > 0)) ||
          (activeMatchesFilter === "noMatches" && !u.activeMatchId && !(u.activeMatchIds?.length > 0)))
      )
      .filter(u =>
        userSearch.toLowerCase() === '' ||
        u.fullName.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearch.toLowerCase())
      )
      .sort((a, b) => {
        if (!sortColumn) return 0;
        let aValue = a[sortColumn];
        let bValue = b[sortColumn];
        if (sortColumn === 'activeMatchIds') {
          aValue = a.activeMatchIds?.length || 0;
          bValue = b.activeMatchIds?.length || 0;
        }
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
        } else {
          return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
        }
      });
  }, [allUsers, userSearch, roleFilter, statusFilter, personalFilter, activeMatchesFilter, sortColumn, sortOrder]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = filteredAndSortedUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAndSortedUsers.length / itemsPerPage);

  const filteredVolunteers = useMemo(() => {
    return volunteers.filter(v => v.approved === "pending")
      .sort((a, b) => (a.createdAt?.toDate() || 0) - (b.createdAt?.toDate() || 0));
  }, [volunteers]);

  const indexOfLastVolunteer = volunteerCurrentPage * volunteersPerPage;
  const indexOfFirstVolunteer = indexOfLastVolunteer - volunteersPerPage;
  const currentVolunteers = filteredVolunteers.slice(indexOfFirstVolunteer, indexOfLastVolunteer);
  const totalVolunteerPages = Math.ceil(filteredVolunteers.length / volunteersPerPage);

  const filteredPendingRequests = useMemo(() => {
    return pendingRequests.sort((a, b) => (a.createdAt?.toDate() || 0) - (b.createdAt?.toDate() || 0));
  }, [pendingRequests]);

  const indexOfLastApproval = approvalCurrentPage * approvalsPerPage;
  const indexOfFirstApproval = indexOfLastApproval - approvalsPerPage;
  const currentApprovals = filteredPendingRequests.slice(indexOfFirstApproval, indexOfLastApproval);
  const totalApprovalPages = Math.ceil(filteredPendingRequests.length / approvalsPerPage);

  const filteredMatchSessions = useMemo(() => matchSessions, [matchSessions]);
  const indexOfLastMatchSession = matchSessionCurrentPage * itemsPerPage;
  const indexOfFirstMatchSession = indexOfLastMatchSession - itemsPerPage;
  const currentMatchSessions = filteredMatchSessions.slice(indexOfFirstMatchSession, indexOfLastMatchSession);
  const totalMatchSessionPages = Math.ceil(filteredMatchSessions.length / itemsPerPage);

  // useEffect for resetting pagination
  useEffect(() => { setCurrentPage(1); }, [userSearch, roleFilter, statusFilter, personalFilter, activeMatchesFilter]);
  useEffect(() => { setActiveMatchCurrentPage(1); }, [activeMatchSearch, matchSortColumn, matchSortOrder]);

  // useEffect for real-time data listeners
  useEffect(() => {
    setLoading(true);
    setLoadingFormConfig(true);
    const unsubscribes = [];

    try {
      // Volunteers listener
      unsubscribes.push(onSnapshot(collection(db, "Users", "Info", "Volunteers"), (snapshot) => {
        const v = snapshot.docs.map(doc => {
          const data = doc.data();
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          const lastActivityTimestamp = data.lastActivity || data.lastLogin || data.createdAt;
          let isActiveByTime = false;
          if (lastActivityTimestamp?.toDate) {
              isActiveByTime = lastActivityTimestamp.toDate() >= thirtyDaysAgo;
          }
          let volunteerDerivedStatus = "לא פעיל";
          if (data.approved === "true") {
            volunteerDerivedStatus = isActiveByTime ? "פעיל" : "לא פעיל";
          } else if (data.approved === "pending") {
            volunteerDerivedStatus = "ממתין לאישור";
          } else if (data.approved === "declined") {
            volunteerDerivedStatus = "נדחה";
          }
          return { id: doc.id, ...data, role: "volunteer", derivedDisplayStatus: volunteerDerivedStatus, lastActivity: lastActivityTimestamp };
        });
        setVolunteers(v);
        setAllUsers(prev => [...prev.filter(u => u.role !== 'volunteer'), ...v]);
      }));

      // Requesters listener
      unsubscribes.push(onSnapshot(collection(db, "Users", "Info", "Requesters"), (snapshot) => {
        const r = snapshot.docs.map(doc => {
          const data = doc.data();
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          const lastActivityTimestamp = data.lastActivity || data.lastLogin || data.createdAt;
          let isActiveByTime = false;
          if (lastActivityTimestamp?.toDate) {
            isActiveByTime = lastActivityTimestamp.toDate() >= thirtyDaysAgo;
          }
          const requesterDerivedStatus = (data.agree1 && data.agree2 && data.agree3 && isActiveByTime) ? "פעיל" : "לא פעיל";
          return { id: doc.id, ...data, role: "requester", derivedDisplayStatus: requesterDerivedStatus, lastActivity: lastActivityTimestamp };
        });
        setRequesters(r);
        setAllUsers(prev => [...prev.filter(u => u.role !== 'requester'), ...r]);
      }));

      // Pending Requests listener
      const requestsRef = query(collection(db, "Requests"), where("status", "==", "waiting_for_admin_approval"));
      unsubscribes.push(onSnapshot(requestsRef, async (snapshot) => {
        const pending = await Promise.all(snapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();
          const requesterDoc = data.requesterId ? await getDoc(doc(db, "Users", "Info", "Requesters", data.requesterId)) : null;
          const volunteerDoc = data.volunteerId ? await getDoc(doc(db, "Users", "Info", "Volunteers", data.volunteerId)) : null;
          return { id: docSnap.id, ...data, requesterInfo: requesterDoc?.data(), volunteerInfo: volunteerDoc?.data() };
        }));
        setPendingRequests(pending);
      }));

      // Matches listener
      unsubscribes.push(onSnapshot(collection(db, "Matches"), async (snapshot) => {
        const matches = await Promise.all(snapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();
          const requesterDoc = data.requesterId ? await getDoc(doc(db, "Users", "Info", "Requesters", data.requesterId)) : null;
          const volunteerDoc = data.volunteerId ? await getDoc(doc(db, "Users", "Info", "Volunteers", data.volunteerId)) : null;
          return { id: docSnap.id, ...data, requesterInfo: requesterDoc?.data(), volunteerInfo: volunteerDoc?.data() };
        }));
        setActiveMatches(matches);
        setLoading(false);
      }));

      // Form Config listeners
      unsubscribes.push(onSnapshot(doc(db, "admin_form_configs", "requester_config"), (snap) => {
        const configData = snap.exists() ? snap.data() : {};
        setRequesterFormConfig({ hideNoteField: !!configData.hideNoteField, customFields: configData.customFields || [] });
        setLoadingFormConfig(false);
      }));
      unsubscribes.push(onSnapshot(doc(db, "admin_form_configs", "volunteer_config"), (snap) => {
        const configData = snap.exists() ? snap.data() : {};
        setVolunteerFormConfig({ customFields: configData.customFields || [] });
      }));

    } catch (error) {
      console.error("Error setting up listeners:", error);
      setAlertMessage({ message: "שגיאה בטעינת המידע", type: "error" });
      setLoading(false);
      setLoadingFormConfig(false);
    }

    return () => unsubscribes.forEach(unsub => unsub && unsub());
  }, []);

  // useEffect for session details
  useEffect(() => {
    if (selectedMatchForDetails && showSessionDetails) {
      setLoadingSessions(true);
      const sessionsRef = query(collection(db, `Matches/${selectedMatchForDetails}/Sessions`), orderBy("scheduledTime"));
      const unsubscribe = onSnapshot(sessionsRef, (snapshot) => {
        setMatchSessions(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoadingSessions(false);
      }, (error) => {
        console.error("Error fetching sessions:", error);
        setLoadingSessions(false);
      });
      return () => unsubscribe();
    }
  }, [selectedMatchForDetails, showSessionDetails]);

  const sendMatchConfirmationEmail = (userName, matchedUserName, userEmail) => {
    console.log("Service ID:", process.env.REACT_APP_EMAILJS_SERVICE_ID);
    console.log("Template ID:", process.env.REACT_APP_EMAILJS_TEMPLATE_ID_MATCH);
    const serviceID = process.env.REACT_APP_EMAILJS_SERVICE_ID;
    const templateID = process.env.REACT_APP_EMAILJS_TEMPLATE_ID_MATCH; 

    const templateParams = {
      userName: userName,
      matchedUserName: matchedUserName,
      userEmail: userEmail,
    };

    console.log('Sending match confirmation email:', serviceID);
    emailjs.send(serviceID, templateID, templateParams)
      .then((response) => {
        console.log('Match confirmation email successfully sent!', response.status, response.text);
      })
      .catch((err) => {
        console.error('Failed to send match confirmation email. Error: ', err);
      });
  };

  const sendMatchDeclineEmail = (userName, matchedUserName, userEmail) => {
    const serviceID = process.env.REACT_APP_EMAILJS_SERVICE_ID;
    const templateID = process.env.REACT_APP_EMAILJS_TEMPLATE_ID_DECLINE; 

    const templateParams = {
      userName: userName,
      matchedUserName: matchedUserName,
      userEmail: userEmail,
    };

    emailjs.send(serviceID, templateID, templateParams)
      .then((response) => {
        console.log('Match decline email successfully sent!', response.status, response.text);
      })
      .catch((err) => {
        console.error('Failed to send match decline email. Error: ', err);
      });
  };

  const handleSort = (columnName) => {
    setSortOrder(sortColumn === columnName && sortOrder === "asc" ? "desc" : "asc");
    setSortColumn(columnName);
  };

  const handleMatchSort = (columnName) => {
    setMatchSortOrder(matchSortColumn === columnName && matchSortOrder === "asc" ? "desc" : "asc");
    setMatchSortColumn(columnName);
  };

  const approveVolunteer = async (id) => {
    try {
      await updateDoc(doc(db, "Users", "Info", "Volunteers", id), { approved: "true" });
      await setDoc(doc(db, "Users", "Info"), { Volunteers: increment(1) }, { merge: true });
      setAlertMessage({ message: "מתנדב אושר בהצלחה!", type: "success" });
    } catch (error) {
      console.error("Error approving volunteer:", error);
      setAlertMessage({ message: "שגיאה באישור המתנדב", type: "error" });
    }
  };

  const declineVolunteer = async (id) => {
    try {
      await updateDoc(doc(db, "Users", "Info", "Volunteers", id), { approved: "declined" });
      setAlertMessage({ message: "מתנדב נדחה בהצלחה.", type: "info" });
    } catch (error) {
      console.error("Error declining volunteer:", error);
      setAlertMessage({ message: "שגיאה בדחיית המתנדב", type: "error" });
    }
  };

  const approveRequest = async (requestId, requestData) => {
    try {
      const batch = writeBatch(db);
      const matchId = generateRandomId();
      
      batch.set(doc(db, "Matches", matchId), {
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
      batch.update(doc(db, "Requests", requestId), { status: "matched", matchId: matchId, matchedAt: new Date() });
      batch.update(doc(db, "Users", "Info", "Volunteers", requestData.volunteerId), { activeMatchIds: arrayUnion(matchId) });
      batch.update(doc(db, "Users", "Info", "Requesters", requestData.requesterId), { activeMatchId: matchId });

      await batch.commit();
      setAlertMessage({ message: "הבקשה אושרה והתאמה נוצרה בהצלחה!", type: "success" });

      const requester = requesters.find(r => r.id === requestData.requesterId);
      const matchedVolunteer = volunteers.find(v => v.id === requestData.volunteerId);
      if (requester && matchedVolunteer) {
        sendMatchConfirmationEmail(requester.fullName, matchedVolunteer.fullName, requester.email);
        sendMatchConfirmationEmail(matchedVolunteer.fullName, requester.fullName, matchedVolunteer.email);
      }
    } catch (error) {
      console.error("Error approving request:", error);
      setAlertMessage({ message: "שגיאה באישור הבקשה", type: "error" });
    }
  };

  const declineRequest = async (requestId) => {
    try {
      const requestRef = doc(db, "Requests", requestId);
      const requestSnap = await getDoc(requestRef);
      const requestData = requestSnap.data();

      await updateDoc(requestRef, {
        status: "waiting_for_first_approval",
        declinedVolunteers: arrayUnion(requestData.volunteerId),
        declinedAt: new Date()
      });
      
      setAlertMessage({ message: "הבקשה נדחתה.", type: "info" });

      const requester = requesters.find(r => r.id === requestData.requesterId);
      const declinedVolunteer = volunteers.find(v => v.id === requestData.volunteerId);
      if (requester && declinedVolunteer) {
        sendMatchDeclineEmail(requester.fullName, declinedVolunteer.fullName, requester.email);
        sendMatchDeclineEmail(declinedVolunteer.fullName, requester.fullName, declinedVolunteer.email);
      }
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

      if (!finalRequestId) {
        const q = query(collection(db, "Requests"), where("requesterId", "==", requesterId), where("status", "in", ["waiting_for_first_approval", "declined", "waiting_for_reassignment"]));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          finalRequestId = querySnapshot.docs[0].id;
          batch.update(doc(db, "Requests", finalRequestId), { status: "matched", matchedAt: new Date(), volunteerId: volunteerId, matchId: matchId });
        } else {
          finalRequestId = generateRandomId();
          batch.set(doc(db, "Requests", finalRequestId), { requesterId, volunteerId, status: "matched", createdAt: new Date(), messageRequest: "Manual match by admin", personal: false, matchId });
        }
      } else {
        batch.update(doc(db, "Requests", requestId), { volunteerId, status: "matched", matchedAt: new Date(), matchId: matchId });
      }
      
      batch.set(doc(db, "Matches", matchId), { volunteerId, requesterId, requestId: finalRequestId, status: "active", startDate: new Date(), endDate: null, meetingFrequency: "weekly", totalSessions: 0, notes: "Manual match by admin" });
      batch.update(doc(db, "Users", "Info", "Volunteers", volunteerId), { activeMatchIds: arrayUnion(matchId) });
      batch.update(doc(db, "Users", "Info", "Requesters", requesterId), { activeMatchId: matchId });

      await batch.commit();
      setAlertMessage({ message: "התאמה נוצרה בהצלחה!", type: "success" });

      const requester = requesters.find(r => r.id === requesterId);
      const matchedVolunteer = volunteers.find(v => v.id === volunteerId);
      if (requester && matchedVolunteer) {
        sendMatchConfirmationEmail(requester.fullName, matchedVolunteer.fullName, requester.email);
        sendMatchConfirmationEmail(matchedVolunteer.fullName, requester.fullName, matchedVolunteer.email);
      }
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
      if (!matchDoc.exists()) throw new Error("Match not found");
      
      const matchData = matchDoc.data();
      const vol_id = matchData.volunteerId;
      const volunteerDoc = await getDoc(doc(db, "Users", "Info", "Volunteers", vol_id));
      const updatedMatches = (volunteerDoc.data()?.activeMatchIds || []).filter(id => id !== match_id);

      await Promise.all([
        deleteDoc(doc(db, "Matches", match_id)),
        updateDoc(doc(db, "Requests", matchData.requestId), { status: "waiting_for_first_approval", volunteerId: null }),
        updateDoc(doc(db, "Users", "Info", "Requesters", matchData.requesterId), { activeMatchId: null }),
        updateDoc(doc(db, "Users", "Info", "Volunteers", vol_id), { activeMatchIds: updatedMatches })
      ]);

      setShowCancelMatchModal(false);
      setAlertMessage({ message: "ההתאמה בוטלה בהצלחה", type: "success" });
    } catch (error) {
      console.error("Error cancelling match:", error);
      setAlertMessage({ message: "שגיאה בביטול ההתאמה", type: "error" });
    }
  }

  const deleteUser = async (user) => {
    try {
      const batch = writeBatch(db);
      
      if (user.role === 'requester') {
        const requesterDocRef = doc(db, "Users", "Info", "Requesters", user.id);
        const requesterDocSnap = await getDoc(requesterDocRef);
        if (requesterDocSnap.exists()) {
          const { activeMatchId } = requesterDocSnap.data();
          if (activeMatchId) { 
            const matchRef = doc(db, "Matches", activeMatchId);
            const matchSnap = await getDoc(matchRef);
            if(matchSnap.exists()) {
              const { volunteerId } = matchSnap.data();
              const volDoc = await getDoc(doc(db, "Users", "Info", "Volunteers", volunteerId));
              const updatedMatches = (volDoc.data()?.activeMatchIds || []).filter(id => id !== activeMatchId);
              batch.delete(doc(db, "conversations", activeMatchId));
              batch.update(doc(db, "Users", "Info", "Volunteers", volunteerId), { activeMatchIds: updatedMatches });
              batch.delete(matchRef);
            }
          }
          const requestsSnap = await getDocs(query(collection(db, "Requests"), where("requesterId", "==", user.id)));
          requestsSnap.forEach(docSnap => batch.delete(docSnap.ref));
          batch.delete(requesterDocRef);
        } 
      } else if (user.role === 'volunteer') {
          const volunteerRef  = doc(db, "Users", "Info", "Volunteers", user.id);
          const volunteerSnap = await getDoc(volunteerRef);
          if (volunteerSnap.exists()) {
            const { activeMatchIds = [] } = volunteerSnap.data();
            for (const matchId of activeMatchIds) {
              const matchRef = doc(db, "Matches", matchId);
              const matchSnap = await getDoc(matchRef);
              if (!matchSnap.exists()) continue;
              const { requesterId } = matchSnap.data();
              batch.delete(doc(db, "conversations", matchId));
              batch.delete(matchRef);
              batch.update(doc(db, "Users", "Info", "Requesters", requesterId), { activeMatchId: null });
              const reqQS = await getDocs(query(collection(db, "Requests"), where("requesterId", "==", requesterId)));
              reqQS.forEach(r => batch.update(r.ref, { status: "waiting_for_first_approval", volunteerId: null, matchedAt: null, matchId: null }));
            }
            batch.delete(volunteerRef);
          }
      }
      await batch.commit();
      setshowDeleteUserModal(false);
      setAlertMessage({ message: "המשתמש נמחק בהצלחה", type: "success" });
    } catch (error) {
      console.error("Error deleting user:", error);
      setAlertMessage({ message: "שגיאה במחיקת המשתמש", type: "error" });
    }
  };

  // --- Form Customization Handlers ---
  const handleToggleHideNote = async () => {
    const newConfig = { ...requesterFormConfig, hideNoteField: !requesterFormConfig.hideNoteField };
    try {
      await setFirestoreDoc(doc(db, "admin_form_configs", "requester_config"), newConfig);
      setAlertMessage({ message: "הגדרת שדה 'הערה' עודכנה.", type: "success" });
    } catch (error) {
      console.error("Error updating hideNoteField:", error);
      setAlertMessage({ message: "שגיאה בעדכון הגדרת שדה 'הערה'.", type: "error" });
    }
  };

  const openFieldEditorModal = (roleType, field = null) => {
    setEditingRoleType(roleType);
    setEditingField(field);
    setShowFieldEditor(true);
  };

  const handleSaveCustomField = async (fieldData) => {
    const roleConfig = editingRoleType === 'requester' ? requesterFormConfig : volunteerFormConfig;
    const setRoleConfig = editingRoleType === 'requester' ? setRequesterFormConfig : setVolunteerFormConfig;
    
    if (!editingField && roleConfig.customFields.some(f => f.name === fieldData.name)) {
      setAlertMessage({ message: `שדה עם המזהה '${fieldData.name}' כבר קיים.`, type: "error" });
      return;
    }

    const updatedFields = editingField
      ? roleConfig.customFields.map(f => f.name === editingField.name ? fieldData : f)
      : [...roleConfig.customFields, fieldData];
    
    const newConfig = { ...roleConfig, customFields: updatedFields };

    try {
      await setFirestoreDoc(doc(db, "admin_form_configs", `${editingRoleType}_config`), newConfig);
      setRoleConfig(newConfig);
      setAlertMessage({ message: "שדה מותאם אישית נשמר בהצלחה.", type: "success" });
      setShowFieldEditor(false);
      setEditingField(null);
    } catch (error) {
      console.error("Error saving custom field:", error);
      setAlertMessage({ message: "שגיאה בשמירת שדה מותאם אישית.", type: "error" });
    }
  };

  const handleDeleteCustomField = async (roleType, fieldNameToDelete) => {
    if (!window.confirm(`האם אתה בטוח שברצונך למחוק את השדה '${fieldNameToDelete}'?`)) return;

    const roleConfig = roleType === 'requester' ? requesterFormConfig : volunteerFormConfig;
    const setRoleConfig = roleType === 'requester' ? setRequesterFormConfig : setVolunteerFormConfig;
    const updatedFields = roleConfig.customFields.filter(f => f.name !== fieldNameToDelete);
    const newConfig = { ...roleConfig, customFields: updatedFields };

    try {
      await setFirestoreDoc(doc(db, "admin_form_configs", `${roleType}_config`), newConfig);
      setRoleConfig(newConfig);
      setAlertMessage({ message: "שדה מותאם אישית נמחק.", type: "success" });
    } catch (error) {
      console.error("Error deleting custom field:", error);
      setAlertMessage({ message: "שגיאה במחיקת שדה מותאם אישית.", type: "error" });
    }
  };

  const renderCustomFieldsList = (roleType, fieldsConfig) => (
    fieldsConfig.customFields.map(field => (
      <div key={field.name} className="flex justify-between items-center p-3 border rounded-md mb-2 bg-gray-50 shadow-sm">
         <div className="flex-grow flex items-center">
          <span className="font-medium text-gray-700">{field.label}</span>
          <span className="text-xs text-gray-500 ml-2">({field.name})</span>
          <span className="text-xs text-gray-500 ml-2">- {field.type}</span>
          {field.required && <span className="text-red-500 text-xs ml-1">*חובה</span>}
          {field.shareWithPartner && <span className="text-xs text-blue-500 ml-2 bg-blue-100 px-1.5 py-0.5 rounded-full border border-blue-200">משותף</span>}
        </div>
        <div className="flex-shrink-0 flex gap-2">
          <Button variant="outline" size="sm" onClick={() => openFieldEditorModal(roleType, field)} className="text-blue-600 border-blue-300 hover:bg-blue-50">ערוך</Button>
          <Button variant="destructive" size="sm" onClick={() => handleDeleteCustomField(roleType, field.name)} className="bg-red-500 hover:bg-red-600 text-white">מחק</Button>
        </div>
      </div>
    ))
  );

  // Chat handlers
  const openChat = async (chatter) => {
    setUserSelectedForChat(chatter);
    setMessages([]);
    if (chatter.conversationsWithAdminId) {
      const msgs = await getDocs(query(collection(db, "conversations", chatter.conversationsWithAdminId, "messages"), orderBy("timestamp")));
      setMessages(msgs.docs.map((d) => ({ id: d.id, ...d.data() })));
    }
    setShowChatPanel(true);
  };

  const closeChat = () => {
    setUserSelectedForChat(null);
    setShowChatPanel(false);
    setNewMsg("");
    setMessages([]);
  };

  const sendMessage = async () => {
    if (!newMsg.trim() || !userSelectedForChat) return;
    try {
      let convoId = userSelectedForChat.conversationsWithAdminId;
      if (!convoId) {
        convoId = generateRandomId();
        const userRoleDoc = userSelectedForChat.role === "volunteer" ? "Volunteers" : "Requesters";
        await updateDoc(doc(db, "Users", "Info", userRoleDoc, userSelectedForChat.id), { conversationsWithAdminId: convoId });
        setUserSelectedForChat(prev => ({ ...prev, conversationsWithAdminId: convoId }));
      }
      const messageData = { text: newMsg.trim(), senderId: "1", timestamp: serverTimestamp() };
      await addDoc(collection(db, "conversations", convoId, "messages"), messageData);
      setNewMsg("");
    } catch (error) {
      setAlertMessage({ message: "שגיאה בשליחת ההודעה", type: "error" });
    }
  };

  if (loading || loadingFormConfig) {
    return <LoadingSpinner />;
  }

  return (
    <div className="p-6 space-y-6 mt-[-2rem]">
      <h2 className="text-3xl font-bold text-orange-800 text-center">לוח ניהול</h2>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-4 justify-center flex-wrap">
        <Button variant={activeTab === "volunteers" ? "default" : "outline"} onClick={() => setActiveTab("volunteers")} className="py-3 px-6 text-lg">מתנדבים לאישור ({volunteers.filter(v => v.approved === "pending").length})</Button>
        <Button variant={activeTab === "approvals" ? "default" : "outline"} onClick={() => setActiveTab("approvals")} className="py-3 px-6 text-lg">התאמות ממתינות לאישור ({pendingRequests.length})</Button>
        <Button variant={activeTab === "matching" ? "default" : "outline"} onClick={() => setActiveTab("matching")} className="py-3 px-6 text-lg">התאמה כללית ({requesters.filter(req => !req.activeMatchId).length})</Button>
        <Button variant={activeTab === "matches" ? "default" : "outline"} onClick={() => setActiveTab("matches")} className="py-3 px-6 text-lg">פיקוח התאמות ({activeMatches.length})</Button>
        <Button variant={activeTab === "users" ? "default" : "outline"} onClick={() => setActiveTab("users")} className="py-3 px-6 text-lg">כל המשתמשים ({allUsers.length})</Button>
        <Button variant={activeTab === "EventCreation" ? "default" : "outline"} onClick={() => setActiveTab("EventCreation")} className="py-3 px-6 text-lg">יצירת אירוע</Button>
        <Button variant={activeTab === "EventList" ? "default" : "outline"} onClick={() => setActiveTab("EventList")} className="py-3 px-6 text-lg">רשימת אירועים</Button>
        <Button variant={activeTab === "formCustomization" ? "default" : "outline"} onClick={() => setActiveTab("formCustomization")} className="py-3 px-6 text-lg">שינוי תנאי הרשמה</Button>
      </div>

      {/* Volunteers Awaiting Approval */}
      {activeTab === "volunteers" && (
        <Card>
          <CardContent>
            <h3 className="font-semibold mb-4 text-orange-700">מתנדבים ממתינים לאישור</h3>
            {filteredVolunteers.length === 0 ? <p className="text-orange-600/80">אין מתנדבים בהמתנה.</p> : (
              <div className="space-y-2">
                {currentVolunteers.map(v => (
                <div key={v.id} className="flex justify-between items-start bg-orange-50/50 p-3 rounded border border-orange-100">
                  <div className="flex-grow">
                    <div className="grid grid-cols-2 gap-x-8 w-full">
                      <div>
                        <h4 className="font-semibold text-orange-800 mb-2">פרטי מתנדב</h4>
                        <p className="text-sm text-orange-600"><strong>שם:</strong> {v.fullName}</p>
                        <p className="text-sm text-orange-600"><strong>אימייל:</strong> {v.email}</p>
                        <p className="text-sm text-orange-600"><strong>מקצוע:</strong> {v.profession}</p>
                        {v.age && <p className="text-sm text-orange-600"><strong>גיל:</strong> {v.age}</p>}
                        {v.gender && <p className="text-sm text-orange-600"><strong>מגדר:</strong> {v.gender}</p>}
                        {v.location && <p className="text-sm text-orange-600"><strong>מיקום:</strong> {v.location}</p>}
                      </div>
                      <div>
                        <h4 className="font-semibold text-orange-800 mb-2">פרטים נוספים</h4>
                        {v.experience && <p className="text-sm text-orange-600"><strong>ניסיון:</strong> {v.experience}</p>}
                        {v.maritalStatus && <p className="text-sm text-orange-600"><strong>מצב משפחתי:</strong> {v.maritalStatus}</p>}
                        {v.motivation && <p className="text-sm text-orange-600"><strong>מוטיבציה:</strong> {v.motivation}</p>}
                        {v.strengths && <p className="text-sm text-orange-600"><strong>חוזקות:</strong> {v.strengths}</p>}
                        {v.availableDays?.length > 0 && <p className="text-sm text-orange-600"><strong>ימים פנויים:</strong> {v.availableDays.join(", ")}</p>}
                        {v.availableHours?.length > 0 && <p className="text-sm text-orange-600"><strong>שעות פנויות:</strong> {v.availableHours.join(", ")}</p>}
                        {renderCustomFieldsForAdmin(v, volunteerFormConfig, "מידע מותאם אישית:")}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button variant="outline" onClick={() => approveVolunteer(v.id)}>אשר מתנדב</Button>
                    <Button variant="outline" onClick={() => declineVolunteer(v.id)}>דחה מתנדב</Button>
                  </div>
                </div>
                ))}
                <div className="flex justify-between items-center mt-4">
                  <Button onClick={() => setVolunteerCurrentPage(p => Math.max(1, p - 1))} disabled={volunteerCurrentPage === 1} variant="outline">הקודם</Button>
                  <span className="text-orange-700">עמוד {volunteerCurrentPage} מתוך {totalVolunteerPages}</span>
                  <Button onClick={() => setVolunteerCurrentPage(p => Math.min(totalVolunteerPages, p + 1))} disabled={volunteerCurrentPage === totalVolunteerPages} variant="outline">הבא</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pending Approval Requests */}
      {activeTab === "approvals" && (
        <Card>
          <CardContent>
            <h3 className="font-semibold mb-4 text-orange-700">התאמות ממתינות לאישור</h3>
            {filteredPendingRequests.length === 0 ? <p className="text-orange-600/80">אין התאמות ממתינות.</p> : (
              <div className="space-y-4">
                {currentApprovals.map(request => (
                  <div key={request.id} className="flex justify-between items-start border rounded p-4 bg-orange-50/50">
                    <div className="grid grid-cols-2 gap-x-8 flex-grow">
                      <div>
                        <h4 className="font-semibold text-orange-800 mb-2">פרטי הפונה</h4>
                        <p className="text-sm text-orange-600"><strong>שם:</strong> {getRequesterDisplayName(request.requesterInfo)}</p>
                        <p className="text-sm text-orange-600"><strong>אימייל:</strong> {request.requesterInfo?.email}</p>
                        <p className="text-sm text-orange-600"><strong>גיל:</strong> {request.requesterInfo?.age}</p>
                        {request.requesterInfo?.gender && <p className="text-sm text-orange-600"><strong>מגדר:</strong> {request.requesterInfo.gender}</p>}
                        <p className="text-sm text-orange-600"><strong>סיבת פנייה:</strong> {request.requesterInfo?.reason}</p>
                        {renderCustomFieldsForAdmin(request.requesterInfo, requesterFormConfig, "מידע מותאם אישית (פונה):")}
                      </div>
                      <div>
                        <h4 className="font-semibold text-orange-800 mb-2">פרטי המתנדב</h4>
                        <p className="text-sm text-orange-600"><strong>שם:</strong> {request.volunteerInfo?.fullName}</p>
                        <p className="text-sm text-orange-600"><strong>אימייל:</strong> {request.volunteerInfo?.email}</p>
                        <p className="text-sm text-orange-600"><strong>מקצוע:</strong> {request.volunteerInfo?.profession}</p>
                        <p className="text-sm text-orange-600"><strong>התאמות פעילות:</strong> {request.volunteerInfo?.activeMatchIds?.length || 0}</p>
                        {renderCustomFieldsForAdmin(request.volunteerInfo, volunteerFormConfig, "מידע מותאם אישית (מתנדב):")}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button variant="outline" onClick={() => approveRequest(request.id, request)}>אשר התאמה</Button>
                      <Button variant="outline" onClick={() => declineRequest(request.id)}>דחה התאמה</Button>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between items-center mt-4">
                  <Button onClick={() => setApprovalCurrentPage(p => Math.max(1, p - 1))} disabled={approvalCurrentPage === 1} variant="outline">הקודם</Button>
                  <span className="text-orange-700">עמוד {approvalCurrentPage} מתוך {totalApprovalPages}</span>
                  <Button onClick={() => setApprovalCurrentPage(p => Math.min(totalApprovalPages, p + 1))} disabled={approvalCurrentPage === totalApprovalPages} variant="outline">הבא</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* General Matching */}
      {activeTab === "matching" && (
        <Card className="mt-[-2rem]">
          <CardContent>
            <h3 className="font-semibold mb-4 text-orange-700">שיוך פונים למתנדבים</h3>
            <div className="flex flex-grow gap-8">
              {/* Requester Info Panel */}
              <div className="w-1/4 border rounded p-4 bg-gray-50/50 h-[510px] overflow-y-scroll">
                <h3 className="font-semibold mb-4 text-gray-700">פרטי פונה</h3>
                {selectedRequester && requesters.find(r => r.id === selectedRequester) ? (
                  <div className="space-y-2 text-base">
                    <p><strong>שם:</strong> {getRequesterDisplayName(requesters.find(r => r.id === selectedRequester))}</p>
                    <p><strong>אימייל:</strong> {requesters.find(r => r.id === selectedRequester)?.email}</p>
                    <p><strong>סיבת פנייה:</strong> {requesters.find(r => r.id === selectedRequester)?.reason}</p>
                    {renderCustomFieldsForAdmin(requesters.find(r => r.id === selectedRequester), requesterFormConfig)}
                  </div>
                ) : <p className="text-gray-500">בחר פונה כדי לראות פרטים.</p>}
              </div>

              {/* Requesters List */}
              <div className="w-1/4 border rounded p-4 bg-orange-50/50">
                <input type="text" placeholder="חיפוש פונה..." value={requesterSearch} onChange={e => setRequesterSearch(e.target.value)} className="border rounded px-2 py-1 w-full mb-2" />
                <h4 className="font-bold mb-2 text-orange-700">פונים</h4>
                <ul className="space-y-2 h-[400px] overflow-y-scroll">
                  {requesters.filter(r => !r.activeMatchId && (r.fullName?.toLowerCase().includes(requesterSearch.toLowerCase()) || r.email?.toLowerCase().includes(requesterSearch.toLowerCase()))).map(req => (
                    <li key={req.id} className={`p-2 rounded shadow cursor-pointer ${selectedRequester === req.id ? 'border-2 border-orange-500' : 'bg-white'}`} onClick={() => setSelectedRequester(selectedRequester === req.id ? null : req.id)}>
                      <strong className="text-orange-800">{req.fullName}</strong>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Volunteers List */}
              <div className="w-1/4 border rounded p-4 bg-orange-50/50">
                <input type="text" placeholder="חיפוש מתנדב..." value={volunteerSearch} onChange={e => setVolunteerSearch(e.target.value)} className="border rounded px-2 py-1 w-full mb-2" />
                <h4 className="font-bold mb-2 text-orange-700">מתנדבים</h4>
                <ul className="space-y-2 h-[400px] overflow-y-scroll">
                  {volunteers.filter(v => v.approved === "true" && (v.isAvailable || v.isAvaliable) && !v.personal && (v.fullName?.toLowerCase().includes(volunteerSearch.toLowerCase()) || v.email?.toLowerCase().includes(volunteerSearch.toLowerCase()))).map(v => (
                    <li key={v.id} className={`p-2 rounded shadow cursor-pointer ${selectedVolunteer === v.id ? 'border-2 border-orange-500' : 'bg-white'} ${!selectedRequester ? 'opacity-50 cursor-not-allowed' : ''}`} onClick={() => selectedRequester && setSelectedVolunteer(selectedVolunteer === v.id ? null : v.id)}>
                      <strong className="text-orange-800">{v.fullName}</strong>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Volunteer Info Panel */}
              <div className="w-1/4 border rounded p-4 bg-gray-50/50 h-[510px] overflow-y-scroll">
                <h3 className="font-semibold mb-4 text-gray-700">פרטי מתנדב</h3>
                {selectedVolunteer && volunteers.find(v => v.id === selectedVolunteer) ? (
                  <div className="space-y-2 text-base">
                    <p><strong>שם:</strong> {volunteers.find(v => v.id === selectedVolunteer)?.fullName}</p>
                    <p><strong>מקצוע:</strong> {volunteers.find(v => v.id === selectedVolunteer)?.profession}</p>
                    <p><strong>התאמות פעילות:</strong> {volunteers.find(v => v.id === selectedVolunteer)?.activeMatchIds?.length || 0}</p>
                    {renderCustomFieldsForAdmin(volunteers.find(v => v.id === selectedVolunteer), volunteerFormConfig)}
                  </div>
                ) : <p className="text-gray-500">בחר מתנדב כדי לראות פרטים.</p>}
              </div>
            </div>
            <div className="mt-4 flex justify-center gap-2 w-full">
              <Button onClick={() => { if (selectedRequester && selectedVolunteer) { createManualMatch(selectedRequester, selectedVolunteer); setSelectedRequester(null); setSelectedVolunteer(null); } }} disabled={!selectedRequester || !selectedVolunteer} className="py-3 px-6 text-lg">צור התאמה</Button>
              <Button variant="outline" disabled={!selectedRequester} onClick={() => { const req = requesters.find(r => r.id === selectedRequester); if(req) { setSelectedRequestForAI({ ...req, requesterInfo: req }); setShowAISuggestions(true); } }} className="py-3 px-6 text-lg">הצעות AI</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Matches Supervision Table */}
      {activeTab === "matches" && (
        <Card>
          <CardContent>
            <h3 className="font-semibold mb-4 text-orange-700">פיקוח התאמות פעילות</h3>
            {showSessionDetails ? (
              <div>
                <Button onClick={() => { setShowSessionDetails(false); setSelectedMatchForDetails(null); }}>חזור לרשימת ההתאמות</Button>
                <h4 className="text-xl font-semibold text-orange-800">פירוט פגישות</h4>
                {loadingSessions ? <LoadingSpinner /> : !matchSessions.length ? <p>אין פגישות.</p> : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead><tr className="bg-orange-50"><th className="border p-2">תאריך</th><th className="border p-2">סטטוס</th><th className="border p-2">סיכום</th></tr></thead>
                      <tbody>
                        {currentMatchSessions.map(s => (
                          <tr key={s.id} className="hover:bg-orange-50/50">
                            <td className="border p-2">{s.scheduledTime?.toDate().toLocaleString()}</td>
                            <td className="border p-2">{s.status}</td>
                            <td className="border p-2"><span className="text-blue-600 cursor-pointer" onClick={() => setSelectedSessionForView(s.sessionSummary)}>צפייה</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="flex justify-between items-center mt-4">
                      <Button onClick={() => setMatchSessionCurrentPage(p => Math.max(1, p - 1))} disabled={matchSessionCurrentPage === 1}>הקודם</Button>
                      <span>עמוד {matchSessionCurrentPage} מתוך {totalMatchSessionPages}</span>
                      <Button onClick={() => setMatchSessionCurrentPage(p => Math.min(totalMatchSessionPages, p + 1))} disabled={matchSessionCurrentPage === totalMatchSessionPages}>הבא</Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <input type="text" placeholder="חיפוש התאמה..." value={activeMatchSearch} onChange={e => setActiveMatchSearch(e.target.value)} className="border rounded px-3 py-2 w-full mb-4" />
                {!activeMatches.length ? <p>אין התאמות פעילות.</p> : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-orange-50">
                          <th className="border p-2 cursor-pointer" onClick={() => handleMatchSort('requesterInfo.fullName')}>פונה</th>
                          <th className="border p-2 cursor-pointer" onClick={() => handleMatchSort('volunteerInfo.fullName')}>מתנדב</th>
                          <th className="border p-2">פגישות</th>
                          <th className="border p-2">ביטול</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeMatches.filter(m => m.requesterInfo?.fullName.toLowerCase().includes(activeMatchSearch.toLowerCase()) || m.volunteerInfo?.fullName.toLowerCase().includes(activeMatchSearch.toLowerCase())).slice((activeMatchCurrentPage - 1) * itemsPerPage, activeMatchCurrentPage * itemsPerPage).map(match => (
                          <tr key={match.id} className="hover:bg-orange-50/50">
                            <td className="border p-2"><HoverCard user={match.requesterInfo} adminConfig={requesterFormConfig}>{match.requesterInfo?.fullName || 'N/A'}</HoverCard></td>
                            <td className="border p-2"><HoverCard user={match.volunteerInfo} adminConfig={volunteerFormConfig}>{match.volunteerInfo?.fullName || 'N/A'}</HoverCard></td>
                            <td className="border p-2 text-center"><span className="text-blue-600 cursor-pointer" onClick={() => { setSelectedMatchForDetails(match.id); setShowSessionDetails(true); }}>צפייה</span></td>
                            <td className="border p-2 text-center"><button onClick={() => { setSelectedMatchForDetails(match.id); setShowCancelMatchModal(true); }} className="text-red-600">ביטול</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="flex justify-between items-center mt-4">
                      <Button onClick={() => setActiveMatchCurrentPage(p => Math.max(1, p - 1))} disabled={activeMatchCurrentPage === 1}>הקודם</Button>
                      <span>עמוד {activeMatchCurrentPage} מתוך {Math.ceil(activeMatches.length / itemsPerPage)}</span>
                      <Button onClick={() => setActiveMatchCurrentPage(p => Math.min(Math.ceil(activeMatches.length / itemsPerPage), p + 1))}>הבא</Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* All Users Table */}
      {activeTab === "users" && (
        <Card>
          <CardContent>
            <h3 className="font-semibold mb-4 text-orange-700">כל המשתמשים</h3>
            <div className="mb-4">
              <input type="text" placeholder="חיפוש..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className="border rounded px-3 py-2 w-full" />
            </div>
            <div className="flex gap-4 mb-4">
              <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="border rounded p-2"><option value="all">כל התפקידים</option><option value="volunteer">מתנדב</option><option value="requester">פונה</option></select>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border rounded p-2"><option value="all">כל הסטטוסים</option><option value="פעיל">פעיל</option><option value="לא פעיל">לא פעיל</option><option value="ממתין לאישור">ממתין</option><option value="נדחה">נדחה</option></select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-orange-50">
                    <th className="border p-2 cursor-pointer" onClick={() => handleSort('fullName')}>שם</th>
                    <th className="border p-2 cursor-pointer" onClick={() => handleSort('email')}>אימייל</th>
                    <th className="border p-2 cursor-pointer" onClick={() => handleSort('role')}>תפקיד</th>
                    <th className="border p-2 cursor-pointer" onClick={() => handleSort('derivedDisplayStatus')}>סטטוס</th>
                    <th className="border p-2">צאט</th>
                    <th className="border p-2">מחיקה</th>
                  </tr>
                </thead>
                <tbody>
                  {currentUsers.map(u => (
                    <tr key={u.id} className="hover:bg-orange-50/50">
                      <td className="border p-2"><HoverCard user={u} adminConfig={u.role === 'requester' ? requesterFormConfig : volunteerFormConfig}>{u.fullName}</HoverCard></td>
                      <td className="border p-2">{u.email}</td>
                      <td className="border p-2">{u.role === 'volunteer' ? 'מתנדב' : 'פונה'}</td>
                      <td className="border p-2">{u.derivedDisplayStatus}</td>
                      <td className="border p-2 text-center"><button onClick={() => openChat(u)} className="text-blue-600">פתח צ'אט</button></td>
                      <td className="border p-2 text-center"><button onClick={() => { setSelectedUserForDelete(u); setshowDeleteUserModal(true); }} className="text-red-600">מחק</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between items-center mt-4">
              <Button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>הקודם</Button>
              <span>עמוד {currentPage} מתוך {totalPages}</span>
              <Button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>הבא</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'EventCreation' && <EventCreation/>}
      {activeTab === 'EventList' && <AdminEventList/>}

      {/* Form Customization Tab */}
      {activeTab === "formCustomization" && (
        <Card className="shadow-lg">
          <CardContent className="p-6 space-y-8">
            <h3 className="text-2xl font-bold text-orange-800 text-center border-b pb-4 mb-6">שינוי תנאי הרשמה</h3>
            <div className="p-6 border border-orange-200 rounded-xl bg-orange-50/50 shadow-md">
              <h4 className="text-xl font-semibold text-orange-800 mb-4">טופס פונים</h4>
              <div className="flex items-center mb-6 p-3 bg-white rounded-lg shadow-sm">
                <input type="checkbox" id="hideNoteField" checked={requesterFormConfig.hideNoteField} onChange={handleToggleHideNote} className="h-5 w-5 text-orange-600" />
                <label htmlFor="hideNoteField" className="ml-3 text-md font-medium text-gray-700">הסתר את שדה "משהו מהלב..."</label>
              </div>
              <h5 className="text-lg font-medium text-orange-700 mb-3">שדות מותאמים אישית לפונים:</h5>
              {requesterFormConfig.customFields?.length > 0 ? renderCustomFieldsList('requester', requesterFormConfig) : <p>אין שדות מותאמים.</p>}
              <Button onClick={() => openFieldEditorModal('requester')} className="mt-4 bg-orange-500">הוסף שדה לפונים</Button>
            </div>
            <div className="p-6 border border-blue-200 rounded-xl bg-blue-50/50 shadow-md">
              <h4 className="text-xl font-semibold text-blue-800 mb-4">טופס מתנדבים</h4>
              <h5 className="text-lg font-medium text-blue-700 mb-3">שדות מותאמים אישית למתנדבים:</h5>
              {volunteerFormConfig.customFields?.length > 0 ? renderCustomFieldsList('volunteer', volunteerFormConfig) : <p>אין שדות מותאמים.</p>}
              <Button onClick={() => openFieldEditorModal('volunteer')} className="mt-4 bg-blue-500">הוסף שדה למתנדבים</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {showFieldEditor && <CustomFieldEditor field={editingField} onSave={handleSaveCustomField} onCancel={() => { setShowFieldEditor(false); setEditingField(null); }} />}
      <AISuggestionModal isOpen={showAISuggestions} onClose={() => { setShowAISuggestions(false); setSelectedRequestForAI(null); }} request={selectedRequestForAI} volunteers={volunteers} onSelectVolunteer={handleAIVolunteerSelection} />
      <ViewSessionSummaryModal isOpen={!!selectedSessionForView} onClose={() => setSelectedSessionForView(null)} sessionSummary={selectedSessionForView} />
      <CustomAlert message={alertMessage?.message} onClose={() => setAlertMessage(null)} type={alertMessage?.type} />
      <CancelMatchModal isOpen={showCancelMatchModal} onClose={() => setShowCancelMatchModal(false)} match={activeMatches.find(m => m.id === selectedMatchForDetails)} onConfirm={() => cancelMatch(selectedMatchForDetails)} />
      <DeleteUserModal isOpen={showDeleteUserModal} onClose={() => { setshowDeleteUserModal(false); setSelectedUserForDelete(null); }} user={selectedUserForDelete} onConfirm={() => deleteUser(selectedUserForDelete)} />
      <ChatPanel isOpen={showChatPanel} onClose={closeChat} messages={messages} newMsg={newMsg} setNewMsg={setNewMsg} onSend={sendMessage} chatPartnerName={userSelectedForChat?.fullName || 'שיחה'} />
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
          <p className="text-gray-700 whitespace-pre-wrap">{sessionSummary}</p>
          <div className="flex justify-end mt-6">
            <Button onClick={onClose}>סגור</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
