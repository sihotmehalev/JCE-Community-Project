// AdminDashboard.jsx - Full Implementation
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
  setDoc as setFirestoreDoc // Alias setDoc to avoid conflict
} from "firebase/firestore";
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
import CustomFieldEditor from '../admin/CustomFieldEditor'; // Import the new component

// Helper function to render custom fields for admin view
const renderCustomFieldsForAdmin = (user, config, title = "מידע נוסף:") => {
  if (!user || !config || !Array.isArray(config.customFields) || config.customFields.length === 0) {
    // console.log("[renderCustomFieldsForAdmin] No user, config, or customFields to render for title:", title, {userExists: !!user, configExists: !!config, customFields: config?.customFields});
    return null;
  }

  const fieldsToRender = config.customFields
    .filter(fieldDef => {
      const hasProp = user.hasOwnProperty(fieldDef.name);
      // console.log(`[renderCustomFieldsForAdmin] Field: ${fieldDef.name}, Label: ${fieldDef.label}, User has property: ${hasProp}`);
      return hasProp;
    })
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
    // console.log("[renderCustomFieldsForAdmin] No fields to render after filtering for title:", title);
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


export default function AdminDashboard() {
  // State Management
  const [selectedRequester, setSelectedRequester] = useState(null);
  const [selectedVolunteer, setSelectedVolunteer] = useState(null);
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
  const [itemsPerPage] = useState(10);
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all', 'approved', 'pending'
  const [personalFilter, setPersonalFilter] = useState("all"); // 'all', 'true', 'false'
  const [activeMatchesFilter, setActiveMatchesFilter] = useState("all"); // 'all', 'hasMatches', 'noMatches'
  const [activeMatches, setActiveMatches] = useState([]);
  const [activeMatchSearch, setActiveMatchSearch] = useState("");
  const [activeMatchCurrentPage, setActiveMatchCurrentPage] = useState(1);
  const [matchRequesterFilter] = useState("all"); // filter by requester ID
  const [matchVolunteerFilter] = useState("all"); // filter by volunteer ID
  const [matchSortColumn, setMatchSortColumn] = useState(null);
  const [matchSortOrder, setMatchSortOrder] = useState("asc"); // 'asc' or 'desc'

  // New states for session details
  const [showSessionDetails, setShowSessionDetails] = useState(false);
  const [selectedMatchForDetails, setSelectedMatchForDetails] = useState(null);
  const [matchSessions, setMatchSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // New states for hover info panels
  const [hoveredRequester, setHoveredRequester] = useState(null);
  const [hoveredVolunteer, setHoveredVolunteer] = useState(null);
  // Refs for managing hover timeouts
  const requesterHoverTimeoutRef = useRef(null);
  const volunteerHoverTimeoutRef = useRef(null);

  // New states for session summary
  const [selectedSessionForView, setSelectedSessionForView] = useState(null);
  const [alertMessage, setAlertMessage] = useState(null);

  // New state for cancel match modal
  const [showCancelMatchModal, setShowCancelMatchModal] = useState(false);

  // New state for delete user modal
  const [showDeleteUserModal, setshowDeleteUserModal] = useState(false);
  const [selectedUserForDelete, setSelectedUserForDelete] = useState(null);

  // State for Form Customization
  const [requesterFormConfig, setRequesterFormConfig] = useState({ hideNoteField: false, customFields: [] });
  const [volunteerFormConfig, setVolunteerFormConfig] = useState({ customFields: [] });
  const [loadingFormConfig, setLoadingFormConfig] = useState(true);
  const [showFieldEditor, setShowFieldEditor] = useState(false);
  const [editingField, setEditingField] = useState(null); // null for new, object for editing
  const [editingRoleType, setEditingRoleType] = useState(null); // 'requester' or 'volunteer'

  // useEffect for resetting currentPage (moved here to ensure unconditional call)
  useEffect(() => {
    setCurrentPage(1);
  }, [userSearch, roleFilter, statusFilter, personalFilter, activeMatchesFilter]);

  // useEffect for resetting activeMatchCurrentPage when filters or search change
  useEffect(() => {
    setActiveMatchCurrentPage(1);
  }, [activeMatchSearch, matchSortColumn, matchSortOrder]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch volunteers
      const volunteersSnap = await getDocs(collection(db, "Users", "Info", "Volunteers"));
      const v = volunteersSnap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          role: "volunteer"
        };
      });

      // Fetch requesters
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

        const requesterDerivedStatus = (
          data.agree1 === true && 
          data.agree2 === true && 
          data.agree3 === true && 
          isActiveByTime
        ) ? "פעיל" : "לא פעיל";

        return {
          id: doc.id,
          ...data,
          role: "requester",
          derivedDisplayStatus: requesterDerivedStatus,
          lastActivity: lastActivityTimestamp
        };
      });

      // Fetch pending requests (waiting_for_admin_approval)
      const pendingRequestsSnap = await getDocs(
        query(collection(db, "Requests"), where("status", "==", "waiting_for_admin_approval"))
      );
      
      const pending = await Promise.all(
        pendingRequestsSnap.docs.map(async (docSnap) => {
          const data = docSnap.data();
          // Fetch requester info
          let requesterInfo = null;
          if (data.requesterId && typeof data.requesterId === 'string' && data.requesterId.trim() !== '') {
            const requesterDoc = await getDoc(doc(db, "Users", "Info", "Requesters", data.requesterId));
            requesterInfo = requesterDoc.exists() ? requesterDoc.data() : null;
          } else {
            console.warn(`Skipping requester info for pending request ${docSnap.id}: requesterId is invalid or undefined. Value: ${data.requesterId}`);
          }
          
          // Fetch volunteer info if exists
          let volunteerInfo = null;
          if (data.volunteerId && typeof data.volunteerId === 'string' && data.volunteerId.trim() !== '') {
            const volunteerDoc = await getDoc(doc(db, "Users", "Info", "Volunteers", data.volunteerId));
            volunteerInfo = volunteerDoc.exists() ? volunteerDoc.data() : null;
          } else if (data.volunteerId === undefined || (typeof data.volunteerId === 'string' && data.volunteerId.trim() === '')) { 
            // Log only if it's truly undefined or an empty string, not null (which is valid for non-personal requests)
            console.warn(`Skipping volunteer info for pending request ${docSnap.id}: volunteerId is invalid or undefined. Value: ${data.volunteerId}`);
          }
          
          return {
            id: docSnap.id,
            ...data,
            requesterInfo,
            volunteerInfo
          };
        })
      );

      // Fetch all matches
      const matchesSnap = await getDocs(collection(db, "Matches"));
      const matches = await Promise.all(
        matchesSnap.docs.map(async (docSnap) => {
          const data = docSnap.data();
          // Fetch requester info
          let requesterInfo = null;
          if (data.requesterId && typeof data.requesterId === 'string' && data.requesterId.trim() !== '') {
            const requesterDoc = await getDoc(doc(db, "Users", "Info", "Requesters", data.requesterId));
            requesterInfo = requesterDoc.exists() ? requesterDoc.data() : null;
          } else {
            console.warn(`Skipping requester info for match ${docSnap.id}: requesterId is invalid or undefined. Value: ${data.requesterId}`);
          }
          
          // Fetch volunteer info
          let volunteerInfo = null;
          if (data.volunteerId && typeof data.volunteerId === 'string' && data.volunteerId.trim() !== '') {
            const volunteerDoc = await getDoc(doc(db, "Users", "Info", "Volunteers", data.volunteerId));
            volunteerInfo = volunteerDoc.exists() ? volunteerDoc.data() : null;
          } else {
            console.warn(`Skipping volunteer info for match ${docSnap.id}: volunteerId is invalid or undefined. Value: ${data.volunteerId}`);
          }
          
          return {
            id: docSnap.id,
            ...data,
            requesterInfo,
            volunteerInfo
          };
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
        if (vol.approved === "true" && isActiveByTime) {
            volunteerDerivedStatus = "פעיל";
        } else if (vol.approved === "true" && !isActiveByTime) {
            volunteerDerivedStatus = "לא פעיל";
        } else if (vol.approved === "pending") {
            volunteerDerivedStatus = "ממתין לאישור";
        } else if (vol.approved === "declined") {
            volunteerDerivedStatus = "נדחה";
        } else {
            volunteerDerivedStatus = "לא פעיל"; // Fallback for any other unexpected state
        }

        return {
            ...vol,
            derivedDisplayStatus: volunteerDerivedStatus,
            lastActivity: lastActivityTimestamp
        };
    });

      setVolunteers(processedVolunteers);
      setRequesters(r);
      setAllUsers([
        ...processedVolunteers,
        ...r
      ]);
      setPendingRequests(pending);
      setActiveMatches(matches);

      // Fetch Form Configurations
      setLoadingFormConfig(true);
      try {
        const reqConfDocRef = doc(db, "admin_form_configs", "requester_config");
        const reqConfSnap = await getDoc(reqConfDocRef);
        if (reqConfSnap.exists()) {
          const configData = reqConfSnap.data();
          console.log("[AdminDashboard] Fetched requester_config:", JSON.stringify(configData, null, 2));
          setRequesterFormConfig({
            hideNoteField: configData.hideNoteField || false,
            customFields: Array.isArray(configData.customFields) ? configData.customFields : []
          });
        } else {
          console.log("[AdminDashboard] requester_config not found, using default.");
          setRequesterFormConfig({ hideNoteField: false, customFields: [] }); // Default
        }

        const volConfDocRef = doc(db, "admin_form_configs", "volunteer_config");
        const volConfSnap = await getDoc(volConfDocRef);
        if (volConfSnap.exists()) {
          const configData = volConfSnap.data();
          console.log("[AdminDashboard] Fetched volunteer_config:", JSON.stringify(configData, null, 2));
          setVolunteerFormConfig({
            customFields: Array.isArray(configData.customFields) ? configData.customFields : []
          });
        } else {
          console.log("[AdminDashboard] volunteer_config not found, using default.");
          setVolunteerFormConfig({ customFields: [] }); // Default
        }
      } catch (configError) {
        console.error("Error fetching form configurations:", configError);
        setAlertMessage({ message: "שגיאה בטעינת הגדרות טפסים", type: "error" });
      }
      setLoadingFormConfig(false);

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
  }, [setLoadingSessions, setMatchSessions]);

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
      
      // Create match with random ID
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
      });      // Update requester's activeMatchId (single match)
      const requesterRef = doc(db, "Users", "Info", "Requesters", requestData.requesterId);
      batch.update(requesterRef, {
        activeMatchId: matchId
      });

      await batch.commit();
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
        declinedVolunteers: arrayUnion(docSnap.data().volunteerId), // Add to declined list
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
            volunteerId: volunteerId,
            matchId: matchId // Ensure volunteerId is set in case it was a reassignment
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
            personal: false,
            matchId: matchId
          });
        }
      } else {
        // Update existing request (when requestId is provided, e.g., from nonPersonalRequests)
        batch.update(doc(db, "Requests", requestId), {
          volunteerId: volunteerId,
          status: "matched",
          matchedAt: new Date(),
          matchId: matchId
        });
      }
      
      // Create match with random ID
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

      // Update users' activeMatchIds
      const volunteer = volunteers.find(v => v.id === volunteerId);
      const volunteerRef = doc(db, "Users", "Info", "Volunteers", volunteerId);
      batch.update(volunteerRef, {
        activeMatchIds: [...(volunteer?.activeMatchIds || []), matchId]
      });

      requesters.find(r => r.id === requesterId);
      const requesterRef = doc(db, "Users", "Info", "Requesters", requesterId);
      batch.update(requesterRef, {
        activeMatchId: matchId
      });

      await batch.commit();
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

  const cancelMatch = async (match_id) => {
    try {
      // Get match document first
      const matchDoc = await getDoc(doc(db, "Matches", match_id));
      if (!matchDoc.exists()) {
        throw new Error("Match not found");
      }
      
      const matchData = matchDoc.data();
      const vol_id = matchData.volunteerId;
      const request_id = matchData.requestId;

      // Get volunteer document to update their activeMatchIds
      const volunteerDoc = await getDoc(doc(db, "Users", "Info", "Volunteers", vol_id));
      const currentMatches = volunteerDoc.data().activeMatchIds || [];
      const updatedMatches = currentMatches.filter(id => id !== match_id);

      // Run all updates in parallel for better performance
      await Promise.all([
        // Delete match
        deleteDoc(doc(db, "Matches", match_id)),

        // Update request status
        updateDoc(doc(db, "Requests", request_id), {
          status: "waiting_for_first_approval",
          volunteerId: null
        }),

        // Clear requester's single match
        updateDoc(doc(db, "Users", "Info", "Requesters", matchData.requesterId), {
          activeMatchId: null
        }),

        // Update volunteer's active matches
        updateDoc(doc(db, "Users", "Info", "Volunteers", vol_id), {
          activeMatchIds: updatedMatches
        })
      ]);

      // Update UI
      setActiveMatches(prev => prev.filter(match => match.id !== match_id));
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
        // delete match if has one
        const requesterDocRef = doc(db, "Users", "Info", "Requesters", user.id);
        const requesterDocSnap = await getDoc(requesterDocRef);

        if (requesterDocSnap.exists()) {

          const req_data = requesterDocSnap.data();
          const match_id = req_data.activeMatchId;

          // if requester has match
          if (match_id) { 
            const matchesDocRef = doc(db, "Matches", match_id);
            const matchSnap = await getDoc(matchesDocRef);
            const matchData = matchSnap.data()
            // get Volunteer id
            const vol_id = matchData.volunteerId;

            // prepare Volunteer new list
            const volunteerDoc = await getDoc(doc(db, "Users", "Info", "Volunteers", vol_id));
            const currentMatches = volunteerDoc.data().activeMatchIds || [];
            const updatedMatches = currentMatches.filter(id => id !== match_id);

            // delete conversations, matches and match for Volunteer matches list
            batch.delete(doc(db, "conversations", match_id));
            batch.update(doc(db, "Users", "Info", "Volunteers", vol_id), {
              activeMatchIds: updatedMatches
            });
            batch.delete(matchesDocRef);
          }

          const requestsSnap = await getDocs(
            query(collection(db, "Requests"), where("requesterId", "==", user.id))
          );
          
          // delete request
          requestsSnap.forEach((docSnap) => {
              const docRef = doc(db, "Requests", docSnap.id);
              batch.delete(docRef);
          });

          // delete user
          batch.delete(requesterDocRef);

          await batch.commit();

        } 

      } else if (user.role === 'volunteer') {

          // 1. read volunteer
          const volunteerRef  = doc(db, "Users", "Info", "Volunteers", user.id);
          const volunteerSnap = await getDoc(volunteerRef);

          if (volunteerSnap.exists()) {
            const { activeMatchIds = [] } = volunteerSnap.data();

            // 2. loop over matches **sequentially**
            for (const matchId of activeMatchIds) {
              const convoRef = doc(db, "conversations", matchId);
              const matchRef  = doc(db, "Matches", matchId);
              const matchSnap = await getDoc(matchRef);
              if (!matchSnap.exists()) continue;

              const { requesterId } = matchSnap.data();

              batch.delete(convoRef);

              // queue deletions
              batch.delete(matchRef);

              // queue requester update
              batch.update(
                doc(db, "Users", "Info", "Requesters", requesterId),
                { activeMatchId: null }
              );

              // queue request updates
              const reqQS = await getDocs(
                query(collection(db, "Requests"), where("requesterId", "==", requesterId))
              );
              reqQS.forEach(r => batch.update(r.ref, {
                status: "waiting_for_first_approval",
                volunteerId: null,
                matchedAt: null,
                matchId: null
              }));
            }

            // 3. finally queue volunteer deletion
            batch.delete(volunteerRef);

            // 4. commit AFTER **all** writes have been queued
            await batch.commit();
          }
      }
  
      // Update UI state
      setAllUsers(prev => prev.filter(u => u.id !== user.id));
      if (user.role === 'volunteer') {
        setVolunteers(prev => prev.filter(v => v.id !== user.id));
      } else if (user.role === 'requester') {
        setRequesters(prev => prev.filter(r => r.id !== user.id));
      }
      
      // Update matches list if needed
      setActiveMatches(prev => prev.filter(m => 
        m.requesterId !== user.id && m.volunteerId !== user.id
      ));
  
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
      setRequesterFormConfig(newConfig);
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
    let currentConfig = editingRoleType === 'requester' ? { ...requesterFormConfig } : { ...volunteerFormConfig };
    let updatedFields;

    if (editingField) { // Editing existing field
      updatedFields = currentConfig.customFields.map(f => f.name === fieldData.name ? fieldData : f);
    } else { // Adding new field
      // Check for duplicate name (client-side check, server-side rules are better for production)
      if (currentConfig.customFields.some(f => f.name === fieldData.name)) {
        setAlertMessage({ message: `שדה עם המזהה '${fieldData.name}' כבר קיים.`, type: "error" });
        return;
      }
      updatedFields = [...currentConfig.customFields, fieldData];
    }
    const newConfig = { ...currentConfig, customFields: updatedFields }; // Ensure newConfig is created with updatedFields

    try {
      await setFirestoreDoc(doc(db, "admin_form_configs", `${editingRoleType}_config`), newConfig);
      if (editingRoleType === 'requester') {
        setRequesterFormConfig(newConfig);
      } else {
        setVolunteerFormConfig(newConfig);
      }
      setAlertMessage({ message: "שדה מותאם אישית נשמר בהצלחה.", type: "success" });
      setShowFieldEditor(false);
      setEditingField(null);
    } catch (error) {
      console.error("Error saving custom field:", error);
      setAlertMessage({ message: "שגיאה בשמירת שדה מותאם אישית.", type: "error" });
    }
  };

  const handleDeleteCustomField = async (roleType, fieldNameToDelete) => {
    if (!window.confirm(`האם אתה בטוח שברצונך למחוק את השדה '${fieldNameToDelete}'? פעולה זו אינה הפיכה.`)) return;

    let currentConfig = roleType === 'requester' ? { ...requesterFormConfig } : { ...volunteerFormConfig };
    const updatedFields = currentConfig.customFields.filter(f => f.name !== fieldNameToDelete);
    const newConfig = { ...currentConfig, customFields: updatedFields }; // Ensure newConfig is created with filteredFields

    try {
      await setFirestoreDoc(doc(db, "admin_form_configs", `${roleType}_config`), newConfig);
      if (roleType === 'requester') {
        setRequesterFormConfig(newConfig);
      } else {
        setVolunteerFormConfig(newConfig);
      }
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
          {field.shareWithPartner && (
            <span className="text-xs text-blue-500 ml-2 bg-blue-100 px-1.5 py-0.5 rounded-full border border-blue-200">משותף</span>
          )}
        </div>
        <div className="flex-shrink-0 flex gap-2">
          <Button variant="outline" size="sm" onClick={() => openFieldEditorModal(roleType, field)} className="text-blue-600 border-blue-300 hover:bg-blue-50">ערוך</Button>
          <Button variant="destructive" size="sm" onClick={() => handleDeleteCustomField(roleType, field.name)} className="bg-red-500 hover:bg-red-600 text-white">מחק</Button>
        </div>
      </div>
    ))
  );

  // Filter and sort users for the All Users table
  const filteredAndSortedUsers = allUsers
    .filter(u =>
      u.fullName?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearch.toLowerCase())
    )
    .filter(u => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (statusFilter !== "all" && u.derivedDisplayStatus !== statusFilter) return false;
      if (personalFilter === "true" && !u.personal) return false;
      if (personalFilter === "false" && u.personal) return false;
      if (activeMatchesFilter === "hasMatches" && (
        (u.role === 'requester' && !u.activeMatchId) || 
        (u.role === 'volunteer' && (!u.activeMatchIds || u.activeMatchIds.length === 0))
      )) return false;
      if (activeMatchesFilter === "noMatches" && (
        (u.role === 'requester' && u.activeMatchId) || 
        (u.role === 'volunteer' && u.activeMatchIds?.length > 0)
      )) return false;

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
        // Sort by derivedDisplayStatus, custom order: pending, declined, inactive, active
        const statusOrder = { "ממתין לאישור": 1, "נדחה": 2, "לא פעיל": 3, "פעיל": 4 };
        aValue = statusOrder[a.derivedDisplayStatus] || 99; // Assign a high value for unknown statuses
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
          variant={activeTab === "volunteers" ? "default" : "outline"}
          onClick={() => setActiveTab("volunteers")}
          className="py-3 px-6 text-lg"
        >
          מתנדבים לאישור ({volunteers.filter(v => v.approved === "pending").length})
        </Button>
        <Button
          variant={activeTab === "approvals" ? "default" : "outline"}
          onClick={() => setActiveTab("approvals")}
          className="py-3 px-6 text-lg"
        >
          התאמות ממתינות לאישור ({pendingRequests.length})
        </Button>
        <Button
          variant={activeTab === "matching" ? "default" : "outline"}
          onClick={() => setActiveTab("matching")}
          className="py-3 px-6 text-lg"
        >
          התאמה כללית
        </Button>
        <Button
          variant={activeTab === "matches" ? "default" : "outline"}
          onClick={() => setActiveTab("matches")}
          className="py-3 px-6 text-lg"
        >
          פיקוח התאמות ({activeMatches.length})
        </Button>
        <Button
          variant={activeTab === "users" ? "default" : "outline"}
          onClick={() => setActiveTab("users")}
          className="py-3 px-6 text-lg"
        >
          כל המשתמשים ({allUsers.length})
        </Button>
        <Button
            variant={activeTab === "EventCreation" ? "default" : "outline"}
            onClick={() => setActiveTab("EventCreation")}
            className="py-3 px-6 text-lg"
        >
            יצירת אירוע
        </Button>
        <Button
            variant={activeTab === "EventList" ? "default" : "outline"}
            onClick={() => setActiveTab("EventList")}
            className="py-3 px-6 text-lg"
        >
            רשימת אירועים
        </Button>
        <Button
          variant={activeTab === "formCustomization" ? "default" : "outline"}
          onClick={() => setActiveTab("formCustomization")}
          className="py-3 px-6 text-lg"
        >
          שינוי תנאי הרשמה
        </Button>
      </div>

      {/* Volunteers Awaiting Approval */}
      {activeTab === "volunteers" && (
        <Card>
          <CardContent>
            <h3 className="font-semibold mb-4 text-orange-700">
              מתנדבים ממתינים לאישור
            </h3>
            {volunteers.filter(v => v.approved === "pending").length === 0 ? (
              <p className="text-orange-600/80">אין מתנדבים בהמתנה.</p>
            ) : (
              <div className="space-y-2">
                {volunteers.filter(v => v.approved === "pending").map(v => (
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
                          {v.availableDays && v.availableDays.length > 0 && (
                            <p className="text-sm text-orange-600"><strong>ימים פנויים:</strong> {v.availableDays.join(", ")}</p>
                          )}
                          {v.availableHours && v.availableHours.length > 0 && (
                            <p className="text-sm text-orange-600"><strong>שעות פנויות:</strong> {v.availableHours.join(", ")}</p>
                          )}
                          {renderCustomFieldsForAdmin(v, volunteerFormConfig, "מידע מותאם אישית:")}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        onClick={() => approveVolunteer(v.id)}
                      >
                        אשר מתנדב
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => declineVolunteer(v.id)}
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
              התאמות ממתינות לאישור
            </h3>
            
            {pendingRequests.length === 0 ? (
              <p className="text-orange-600/80">אין התאמות ממתינות.</p>
            ) : (
              <div className="space-y-4">
                {pendingRequests
                  .map(request => (
                  <div key={request.id} className="flex justify-between items-start border rounded p-4 bg-orange-50/50">
                    <div className="grid grid-cols-2 gap-x-8 flex-grow">
                      <div>
                        <h4 className="font-semibold text-orange-800 mb-2">פרטי הפונה</h4>
                        <p className="text-sm text-orange-600"><strong>שם:</strong> {request.requesterInfo?.fullName}</p>
                        <p className="text-sm text-orange-600"><strong>אימייל:</strong> {request.requesterInfo?.email}</p>
                        <p className="text-sm text-orange-600"><strong>גיל:</strong> {request.requesterInfo?.age}</p>
                        {request.requesterInfo?.gender && <p className="text-sm text-orange-600"><strong>מגדר:</strong> {request.requesterInfo?.gender}</p>}
                        <p className="text-sm text-orange-600"><strong>סיבת פנייה:</strong> {request.requesterInfo?.reason}</p>
                        {request.requesterInfo?.needs && <p className="text-sm text-orange-600"><strong>צרכים:</strong> {request.requesterInfo?.needs}</p>}
                        {request.requesterInfo?.chatPref && <p className="text-sm text-orange-600"><strong>העדפת צ׳אט:</strong> {request.requesterInfo?.chatPref.join(', ')}</p>}
                        {request.requesterInfo?.frequency && <p className="text-sm text-orange-600"><strong>תדירות:</strong> {request.requesterInfo?.frequency.join(', ')}</p>}
                        {request.requesterInfo?.preferredTimes && <p className="text-sm text-orange-600"><strong>זמנים מועדפים:</strong> {request.requesterInfo?.preferredTimes}</p>}
                        {request.requesterInfo?.location && <p className="text-sm text-orange-600"><strong>מיקום:</strong> {request.requesterInfo?.location}</p>}
                        <p className="text-sm text-orange-600"><strong>התאמות פעילות:</strong> {request.requesterInfo?.activeMatchIds?.length || 0}</p>
                        {renderCustomFieldsForAdmin(request.requesterInfo, requesterFormConfig, "מידע מותאם אישית (פונה):")}
                      </div>
                      <div>
                        <h4 className="font-semibold text-orange-800 mb-2">פרטי המתנדב</h4>
                        <p className="text-sm text-orange-600"><strong>שם:</strong> {request.volunteerInfo?.fullName}</p>
                        <p className="text-sm text-orange-600"><strong>אימייל:</strong> {request.volunteerInfo?.email}</p>
                        <p className="text-sm text-orange-600"><strong>מקצוע:</strong> {request.volunteerInfo?.profession}</p>
                        <p className="text-sm text-orange-600"><strong>ניסיון:</strong> {request.volunteerInfo?.experience}</p>
                        {request.volunteerInfo?.age && <p className="text-sm text-orange-600"><strong>גיל:</strong> {request.volunteerInfo?.age}</p>}
                        {request.volunteerInfo?.gender && <p className="text-sm text-orange-600"><strong>מגדר:</strong> {request.volunteerInfo?.gender}</p>}
                        {request.volunteerInfo?.location && <p className="text-sm text-orange-600"><strong>מיקום:</strong> {request.volunteerInfo?.location}</p>}
                        {request.volunteerInfo?.maritalStatus && <p className="text-sm text-orange-600"><strong>מצב משפחתי:</strong> {request.volunteerInfo?.maritalStatus}</p>}
                        {request.volunteerInfo?.motivation && <p className="text-sm text-orange-600"><strong>מוטיבציה:</strong> {request.volunteerInfo?.motivation}</p>}
                        {request.volunteerInfo?.strengths && <p className="text-sm text-orange-600"><strong>חוזקות:</strong> {request.volunteerInfo?.strengths}</p>}
                        {request.volunteerInfo?.availableDays && request.volunteerInfo.availableDays.length > 0 && (
                          <p className="text-sm text-orange-600"><strong>ימים פנויים:</strong> {request.volunteerInfo.availableDays.join(", ")}</p>
                        )}
                        {request.volunteerInfo?.availableHours && request.volunteerInfo.availableHours.length > 0 && (
                          <p className="text-sm text-orange-600"><strong>שעות פנויות:</strong> {request.volunteerInfo.availableHours.join(", ")}</p>
                        )}
                        <p className="text-sm text-orange-600"><strong>התאמות פעילות:</strong> {request.volunteerInfo?.activeMatchIds?.length || 0}</p>
                        {renderCustomFieldsForAdmin(request.volunteerInfo, volunteerFormConfig, "מידע מותאם אישית (מתנדב):")}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        onClick={() => approveRequest(request.id, request)}
                      >
                        אשר התאמה
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => declineRequest(request.id, false)}
                      >
                        דחה התאמה
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
              <div
                className={`w-1/4 border rounded p-4 bg-gray-50/50 h-[510px] overflow-y-scroll`}
                onMouseEnter={() => {
                  if (requesterHoverTimeoutRef.current) {
                    clearTimeout(requesterHoverTimeoutRef.current);
                    requesterHoverTimeoutRef.current = null;
                  }
                }}
                onMouseLeave={() => {
                  if (!selectedRequester) {
                    requesterHoverTimeoutRef.current = setTimeout(() => {
                      setHoveredRequester(null);
                    }, 100); // Small delay to allow moving to panel
                  }
                }}
              >
                <h3 className="font-semibold mb-4 text-gray-700">פרטי פונה</h3>
                {(selectedRequester && requesters.find(r => r.id === selectedRequester)) ? (
                  <div className="space-y-2 text-base">
                    <p><strong>שם:</strong> {requesters.find(r => r.id === selectedRequester)?.fullName}</p>
                    <p><strong>אימייל:</strong> {requesters.find(r => r.id === selectedRequester)?.email}</p>
                    <p><strong>גיל:</strong> {requesters.find(r => r.id === selectedRequester)?.age}</p>
                    <p><strong>מגדר:</strong> {requesters.find(r => r.id === selectedRequester)?.gender}</p>
                    <p><strong>סיבת פנייה:</strong> {requesters.find(r => r.id === selectedRequester)?.reason}</p>
                    {requesters.find(r => r.id === selectedRequester)?.needs && <p><strong>צרכים:</strong> {requesters.find(r => r.id === selectedRequester)?.needs}</p>}
                    {requesters.find(r => r.id === selectedRequester)?.chatPref && <p><strong>העדפת צ׳אט:</strong> {requesters.find(r => r.id === selectedRequester)?.chatPref.join(', ')}</p>}
                    {requesters.find(r => r.id === selectedRequester)?.frequency && <p><strong>תדירות:</strong> {requesters.find(r => r.id === selectedRequester)?.frequency.join(', ')}</p>}
                    {requesters.find(r => r.id === selectedRequester)?.preferredTimes && <p><strong>זמנים מועדפים:</strong> {requesters.find(r => r.id === selectedRequester)?.preferredTimes}</p>}
                    {requesters.find(r => r.id === selectedRequester)?.location && <p><strong>מיקום:</strong> {requesters.find(r => r.id === selectedRequester)?.location}</p>}
                    <p><strong>התאמות פעילות:</strong> {requesters.find(r => r.id === selectedRequester)?.activeMatchIds?.length || 0}</p>
                    {renderCustomFieldsForAdmin(requesters.find(r => r.id === selectedRequester), requesterFormConfig)}
                  </div>
                ) : hoveredRequester ? (
                  <div className="space-y-2 text-base">
                    <p><strong>שם:</strong> {hoveredRequester.fullName}</p>
                    <p><strong>אימייל:</strong> {hoveredRequester.email}</p>
                    <p><strong>גיל:</strong> {hoveredRequester.age}</p>
                    <p><strong>מגדר:</strong> {hoveredRequester.gender}</p>
                    <p><strong>סיבת פנייה:</strong> {hoveredRequester.reason}</p>
                    {hoveredRequester.needs && <p><strong>צרכים:</strong> {hoveredRequester.needs}</p>}
                    {hoveredRequester.chatPref && <p><strong>העדפת צ׳אט:</strong> {hoveredRequester.chatPref.join(', ')}</p>}
                    {hoveredRequester.frequency && <p><strong>תדירות:</strong> {hoveredRequester.frequency.join(', ')}</p>}
                    {hoveredRequester.preferredTimes && <p><strong>זמנים מועדפים:</strong> {hoveredRequester.preferredTimes}</p>}
                    {hoveredRequester.location && <p><strong>מיקום:</strong> {hoveredRequester.location}</p>}
                    <p><strong>התאמות פעילות:</strong> {hoveredRequester.activeMatchIds?.length || 0}</p>
                    {renderCustomFieldsForAdmin(hoveredRequester, requesterFormConfig)}
                  </div>
                ) : (
                  <p className="text-gray-500">רחף על פונה או בחר אותו כדי לראות פרטים.</p>
                )}
              </div>

              {/* Requesters List */}
              <div className={`w-1/4 border rounded p-4 bg-orange-50/50`}>
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
                <ul className="space-y-2 h-[400px] overflow-y-scroll">
                  {requesters
                    .filter(req => !(req.activeMatchId))
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
                        onMouseEnter={() => {
                          if (requesterHoverTimeoutRef.current) {
                            clearTimeout(requesterHoverTimeoutRef.current);
                            requesterHoverTimeoutRef.current = null;
                          }
                          setHoveredRequester(req);
                        }}
                        onMouseLeave={() => {
                          if (!selectedRequester) {
                            requesterHoverTimeoutRef.current = setTimeout(() => {
                              setHoveredRequester(null);
                            }, 100); // Small delay to allow moving to panel
                          }
                        }}
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
              <div className={`w-1/4 border rounded p-4 bg-orange-50/50`}>
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
                <ul className="space-y-2 h-[400px] overflow-y-scroll">
                  {volunteers
                    .filter(v => v.approved === "true" && (v.isAvailable || v.isAvaliable) && !v.personal)
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
                        onMouseEnter={() => {
                          if (volunteerHoverTimeoutRef.current) {
                            clearTimeout(volunteerHoverTimeoutRef.current);
                            volunteerHoverTimeoutRef.current = null;
                          }
                          setHoveredVolunteer(v);
                        }}
                        onMouseLeave={() => {
                          if (!selectedVolunteer) {
                            volunteerHoverTimeoutRef.current = setTimeout(() => {
                              setHoveredVolunteer(null);
                            }, 100); // Small delay to allow moving to panel
                          }
                        }}
                      >
                        <strong className="text-orange-800">{v.fullName}</strong>
                        <span className="text-orange-600 text-sm"> ({v.profession})</span>
                      </li>
                    ))
                  }
                </ul>
              </div>

              {/* Volunteer Info Panel */}
              <div
                className={`w-1/4 border rounded p-4 bg-gray-50/50 h-[510px] overflow-y-scroll`}
                onMouseEnter={() => {
                  if (volunteerHoverTimeoutRef.current) {
                    clearTimeout(volunteerHoverTimeoutRef.current);
                    volunteerHoverTimeoutRef.current = null;
                  }
                }}
                onMouseLeave={() => {
                  if (!selectedVolunteer) {
                    volunteerHoverTimeoutRef.current = setTimeout(() => {
                      setHoveredVolunteer(null);
                    }, 100); // Small delay to allow moving to panel
                  }
                }}
              >
                <h3 className="font-semibold mb-4 text-gray-700">פרטי מתנדב</h3>
                {(selectedVolunteer && volunteers.find(v => v.id === selectedVolunteer)) ? (
                  <div className="space-y-2 text-base">
                    <p><strong>שם:</strong> {volunteers.find(v => v.id === selectedVolunteer)?.fullName}</p>
                    <p><strong>אימייל:</strong> {volunteers.find(v => v.id === selectedVolunteer)?.email}</p>
                    <p><strong>גיל:</strong> {volunteers.find(v => v.id === selectedVolunteer)?.age}</p>
                    <p><strong>מקצוע:</strong> {volunteers.find(v => v.id === selectedVolunteer)?.profession}</p>
                    <p><strong>ניסיון:</strong> {volunteers.find(v => v.id === selectedVolunteer)?.experience}</p>
                    {volunteers.find(v => v.id === selectedVolunteer)?.gender && <p><strong>מגדר:</strong> {volunteers.find(v => v.id === selectedVolunteer)?.gender}</p>}
                    {volunteers.find(v => v.id === selectedVolunteer)?.maritalStatus && <p><strong>מצב משפחתי:</strong> {volunteers.find(v => v.id === selectedVolunteer)?.maritalStatus}</p>}
                    {volunteers.find(v => v.id === selectedVolunteer)?.motivation && <p><strong>מוטיבציה:</strong> {volunteers.find(v => v.id === selectedVolunteer)?.motivation}</p>}
                    {volunteers.find(v => v.id === selectedVolunteer)?.strengths && <p><strong>חוזקות:</strong> {volunteers.find(v => v.id === selectedVolunteer)?.strengths}</p>}
                    {volunteers.find(v => v.id === selectedVolunteer)?.availableDays && volunteers.find(v => v.id === selectedVolunteer)?.availableDays.length > 0 && <p><strong>ימים פנויים:</strong> {volunteers.find(v => v.id === selectedVolunteer)?.availableDays.join(', ')}</p>}
                    {volunteers.find(v => v.id === selectedVolunteer)?.availableHours && volunteers.find(v => v.id === selectedVolunteer)?.availableHours.length > 0 && <p><strong>שעות פנויות:</strong> {volunteers.find(v => v.id === selectedVolunteer)?.availableHours.join(', ')}</p>}
                    <p><strong>התאמות פעילות:</strong> {volunteers.find(v => v.id === selectedVolunteer)?.activeMatchIds?.length || 0}</p>
                    {renderCustomFieldsForAdmin(volunteers.find(v => v.id === selectedVolunteer), volunteerFormConfig)}
                  </div>
                ) : hoveredVolunteer ? (
                  <div className="space-y-2 text-base">
                    <p><strong>שם:</strong> {hoveredVolunteer.fullName}</p>
                    <p><strong>אימייל:</strong> {hoveredVolunteer.email}</p>
                    <p><strong>גיל:</strong> {hoveredVolunteer.age}</p>
                    <p><strong>מקצוע:</strong> {hoveredVolunteer.profession}</p>
                    <p><strong>ניסיון:</strong> {hoveredVolunteer.experience}</p>
                    {hoveredVolunteer.gender && <p><strong>מגדר:</strong> {hoveredVolunteer.gender}</p>}
                    {hoveredVolunteer.maritalStatus && <p><strong>מצב משפחתי:</strong> {hoveredVolunteer.maritalStatus}</p>}
                    {hoveredVolunteer.motivation && <p><strong>מוטיבציה:</strong> {hoveredVolunteer.motivation}</p>}
                    {hoveredVolunteer.strengths && <p><strong>חוזקות:</strong> {hoveredVolunteer.strengths}</p>}
                    {hoveredVolunteer.availableDays && hoveredVolunteer.availableDays.length > 0 && <p><strong>ימים פנויים:</strong> {hoveredVolunteer.availableDays.join(', ')}</p>}
                    {hoveredVolunteer.availableHours && hoveredVolunteer.availableHours.length > 0 && <p><strong>שעות פנויות:</strong> {hoveredVolunteer.availableHours.join(', ')}</p>}
                    <p><strong>התאמות פעילות:</strong> {hoveredVolunteer.activeMatchIds?.length || 0}</p>
                    {renderCustomFieldsForAdmin(hoveredVolunteer, volunteerFormConfig)}
                  </div>
                ) : (
                  <p className="text-gray-500">רחף על מתנדב או בחר אותו כדי לראות פרטים.</p>
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

      {/* Matches Supervision Table */}
      {activeTab === "matches" && (
        <Card>
          <CardContent>
            <h3 className="font-semibold mb-4 text-orange-700">פיקוח התאמות פעילות</h3>
            {showSessionDetails ? (
              <div className="space-y-4">
                <Button onClick={() => {
                  setShowSessionDetails(false);
                  setSelectedMatchForDetails(null);
                }}>
                  חזור לרשימת ההתאמות
                </Button>
                <h4 className="text-xl font-semibold text-orange-800">פירוט פגישות עבור התאמה</h4>
                {loadingSessions ? (
                  <LoadingSpinner />
                ) : matchSessions.length === 0 ? (
                  <p className="text-orange-600/80">אין פגישות זמינות עבור התאמה זו.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-orange-50">
                          <th className="border border-orange-100 p-2 text-orange-800">תאריך ושעה</th>
                          <th className="border border-orange-100 p-2 text-orange-800">סטטוס</th>
                          <th className="border border-orange-100 p-2 text-orange-800">משך (דקות)</th>
                          <th className="border border-orange-100 p-2 text-orange-800">מיקום</th>
                          <th className="border border-orange-100 p-2 text-orange-800">הערה</th>
                          <th className="border border-orange-100 p-2 text-orange-800">סיכום</th>
                        </tr>
                      </thead>
                      <tbody>
                        {matchSessions.map(session => (
                          <tr key={session.id} className="hover:bg-orange-50/50">
                            <td className="border border-orange-100 p-2 text-orange-700">
                              {session.scheduledTime ? new Date(session.scheduledTime.seconds * 1000).toLocaleString() : 'N/A'}
                            </td>
                            <td className="border border-orange-100 p-2 text-orange-700">{session.status || 'N/A'}</td>
                            <td className="border border-orange-100 p-2 text-orange-700">{session.durationMinutes || 'N/A'}</td>
                            <td className="border border-orange-100 p-2 text-orange-700">{session.location || 'N/A'}</td>
                            <td className="border border-orange-100 p-2 text-orange-700">{session.notes || 'N/A'}</td>
                            <td className="border border-orange-100 p-2 text-orange-700">
                              <span
                                className="text-blue-600 hover:underline cursor-pointer"
                                onClick={() => setSelectedSessionForView(session.sessionSummary)}
                              >
                                צפייה
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="חיפוש התאמה לפי שם פונה/מתנדב..."
                    value={activeMatchSearch}
                    onChange={e => setActiveMatchSearch(e.target.value)}
                    className="border rounded px-3 py-2 w-full"
                  />
                </div>

                {activeMatches.length === 0 ? (
                  <p className="text-orange-600/80">אין התאמות פעילות.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-orange-50">
                          <th className="border border-orange-100 p-2 text-orange-800 cursor-pointer" onClick={() => handleMatchSort('requesterInfo.fullName')}>פונה{matchSortColumn === 'requesterInfo.fullName' && (matchSortOrder === 'asc' ? ' ▲' : ' ▼')}</th>
                          <th className="border border-orange-100 p-2 text-orange-800 cursor-pointer" onClick={() => handleMatchSort('volunteerInfo.fullName')}>מתנדב{matchSortColumn === 'volunteerInfo.fullName' && (matchSortOrder === 'asc' ? ' ▲' : ' ▼')}</th>
                          <th className="border border-orange-100 p-2 text-orange-800 cursor-pointer" onClick={() => handleMatchSort('meetingFrequency')}>תדירות פגישות{matchSortColumn === 'meetingFrequency' && (matchSortOrder === 'asc' ? ' ▲' : ' ▼')}</th>
                          <th className="border border-orange-100 p-2 text-orange-800">סיכום</th>
                          <th className="border border-orange-100 p-2 text-orange-800">ביטול התאמה</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeMatches
                          .filter(match =>
                            match.requesterInfo?.fullName?.toLowerCase().includes(activeMatchSearch.toLowerCase()) ||
                            match.volunteerInfo?.fullName?.toLowerCase().includes(activeMatchSearch.toLowerCase()) ||
                            match.requestId?.toLowerCase().includes(activeMatchSearch.toLowerCase())
                          )
                          .filter(match => {
                            if (matchRequesterFilter !== "all" && match.requesterId !== matchRequesterFilter) return false;
                            if (matchVolunteerFilter !== "all" && match.volunteerId !== matchVolunteerFilter) return false;
                            return true;
                          })
                          .sort((a, b) => {
                            if (!matchSortColumn) return 0;

                            let aValue;
                            let bValue;

                            if (matchSortColumn === 'requesterInfo.fullName') {
                              aValue = a.requesterInfo?.fullName || '';
                              bValue = b.requesterInfo?.fullName || '';
                            } else if (matchSortColumn === 'volunteerInfo.fullName') {
                              aValue = a.volunteerInfo?.fullName || '';
                              bValue = b.volunteerInfo?.fullName || '';
                            } else if (matchSortColumn === 'meetingFrequency') {
                              aValue = a[matchSortColumn] || '';
                              bValue = b[matchSortColumn] || '';
                            } else {
                              aValue = a[matchSortColumn];
                              bValue = b[matchSortColumn];
                            }

                            if (typeof aValue === 'string' && typeof bValue === 'string') {
                              return matchSortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
                            } else {
                              return matchSortOrder === 'asc' ? aValue - bValue : bValue - aValue;
                            }
                          })
                          .slice(
                            (activeMatchCurrentPage - 1) * itemsPerPage,
                            activeMatchCurrentPage * itemsPerPage
                          )
                          .map(match => (
                            <tr key={match.id} className="hover:bg-orange-50/50">
                              <td className="border border-orange-100 p-2 text-orange-700">
                                <HoverCard user={match.requesterInfo} adminConfig={requesterFormConfig}>
                                  {match.requesterInfo?.fullName || 'N/A'}
                                </HoverCard>
                              </td>
                              <td className="border border-orange-100 p-2 text-orange-700">
                                <HoverCard user={match.volunteerInfo} adminConfig={volunteerFormConfig}>
                                  {match.volunteerInfo?.fullName || 'N/A'}
                                </HoverCard>
                              </td>
                              <td className="border border-orange-100 p-2 text-orange-700">
                                {match.meetingFrequency || 'N/A'}
                              </td>
                              <td className="border border-orange-100 p-2 text-center">
                                <span
                                  className="text-blue-600 hover:underline cursor-pointer"
                                  onClick={() => {
                                    setSelectedMatchForDetails(match.id);
                                    setShowSessionDetails(true);
                                  }}
                                >
                                  פירוט
                                </span>
                              </td>
                              <td className="border border-orange-100 p-2 text-center">
                                <Button
                                  onClick={() => {
                                    setSelectedMatchForDetails(match.id);
                                    setShowSessionDetails(false);
                                    setShowCancelMatchModal(true);
                                  }}
                                  className="p-2 rounded-full text-red-600 hover:text-white hover:bg-red-600 focus:outline-none transition-colors duration-200 flex items-center justify-center mx-auto"
                                >
                                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </Button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="flex justify-between items-center mt-4">
                  <Button
                    onClick={() => setActiveMatchCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={activeMatchCurrentPage === 1}
                    variant="outline"
                  >
                    הקודם
                  </Button>
                  <span className="text-orange-700">
                    עמוד {activeMatchCurrentPage} מתוך {Math.ceil(activeMatches.length / itemsPerPage)}
                  </span>
                  <Button
                    onClick={() => setActiveMatchCurrentPage(prev => Math.min(Math.ceil(activeMatches.length / itemsPerPage), prev + 1))}
                    variant="outline"
                  >
                    הבא
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* All Users Table */}
      {activeTab === "users" && (
        <Card>
          <CardContent>
            <h3 className="font-semibold mb-4 text-orange-700">כל המשתמשים במערכת </h3>
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
                  <option value="פעיל">פעיל</option>
                  <option value="ממתין לאישור">ממתין לאישור</option>
                  <option value="נדחה">נדחה</option>
                  <option value="לא פעיל">לא פעיל</option>
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
                    <th className="w-24 border border-orange-100 p-2 text-orange-800 cursor-pointer">מחיקת משתמש</th>
                  </tr>
                </thead>
                <tbody>
                  {currentUsers.map(u => (
                    <tr key={`${u.id}-${u.role}`} className="hover:bg-orange-50/50">
                      <td className="border border-orange-100 p-2 text-orange-700">
                        <HoverCard 
                          user={u} 
                          adminConfig={u.role === 'requester' ? requesterFormConfig : u.role === 'volunteer' ? volunteerFormConfig : null}
                        >
                          {u.fullName}
                        </HoverCard>
                      </td>
                      <td className="border border-orange-100 p-2 text-orange-700">{u.email}</td>
                      <td className="border border-orange-100 p-2 text-orange-700">
                        {u.role === 'volunteer' && 'מתנדב'}
                        {u.role === 'requester' && 'פונה'}
                        {u.role === 'admin-first' && 'מנהל רמה 1'}
                        {u.role === 'admin-second' && 'מנהל רמה 2'}
                      </td>
                      <td className="border border-orange-100 p-2 text-center">
                        {u.derivedDisplayStatus === "ממתין לאישור" && (
                          <span className="text-red-600">ממתין לאישור</span>
                        )}
                        {u.derivedDisplayStatus === "פעיל" && (
                          <span className="text-green-600">פעיל</span>
                        )}
                        {u.derivedDisplayStatus === "נדחה" && (
                          <span className="text-gray-500">נדחה</span>
                        )}
                        {u.derivedDisplayStatus === "לא פעיל" && (
                          <span className="text-red-600">לא פעיל</span>
                        )}
                      </td>
                      <td className="border border-orange-100 p-2 text-center">
                        {u.personal ? 'כן' : 'לא'}
                      </td>
                      <td className="border border-orange-100 p-2 text-center">
                        {u.role === 'requester' 
                          ? (u.activeMatchId ? 1 : 0)
                          : (u.activeMatchIds?.length || 0)}
                      </td>
                      <td>                       
                         <button
                          className="p-2 rounded-full text-red-600 hover:text-white hover:bg-red-600 focus:outline-none transition-colors duration-200 flex items-center justify-center mx-auto"
                          onClick={() => { 
                            setshowDeleteUserModal(true);
                            setShowSessionDetails(false);
                            setSelectedUserForDelete(u);
                          }}
                          title="מחק משתמש"
                         >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                         </button>
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

      {activeTab === 'EventCreation' && (
        <EventCreation/>
      )}

      {activeTab === 'EventList' && (
        <AdminEventList/>
      )}

      {/* Form Customization Tab */}
      {activeTab === "formCustomization" && (
        <Card className="shadow-lg">
          <CardContent className="p-6 space-y-8">
            <h3 className="text-2xl font-bold text-orange-800 text-center border-b pb-4 mb-6">שינוי תנאי הרשמה</h3>
            
            <div className="bg-orange-50/30 p-4 rounded-lg border border-orange-200 mb-6">
              <h4 className="text-lg font-semibold text-orange-700 mb-2">אודות התאמה אישית של טפסים</h4>
              <p className="text-sm text-orange-600 leading-relaxed">
                כאן ניתן להתאים אישית את טפסי ההרשמה עבור פונים ומתנדבים. ניתן להוסיף שדות חדשים, לערוך קיימים,
                לקבוע אם שדה הוא חובה, ואף להחליט האם מידע משדה מסוים ישותף עם השותף להתאמה (לדוגמה, פונה יראה מידע מסוים על המתנדב ולהיפך).
                שינויים אלו ישפיעו על המידע הנאסף בעת ההרשמה ועל המידע המוצג למשתמשים בדשבורדים שלהם.
                השתמשו באפשרות זו בזהירות כדי לאסוף מידע רלוונטי ולשפר את תהליך ההתאמה.
              </p>
            </div>
            
            {/* Requester Form Configuration */}
            <div className="p-6 border border-orange-200 rounded-xl bg-orange-50/50 shadow-md">
              <h4 className="text-xl font-semibold text-orange-800 mb-4 border-b border-orange-200 pb-2">טופס פונים</h4>
              <div className="flex items-center mb-6 p-3 bg-white rounded-lg shadow-sm">
                <input
                  type="checkbox"
                  id="hideNoteField"
                  checked={requesterFormConfig.hideNoteField || false}
                  onChange={handleToggleHideNote}
                  className="h-5 w-5 text-orange-600 border-gray-300 rounded focus:ring-orange-500 cursor-pointer"
                />
                <label htmlFor="hideNoteField" className="ml-3 text-md font-medium text-gray-700 cursor-pointer">
                  הסתר את שדה "משהו מהלב..." (הערה) בטופס הפונים
                </label>
              </div>
              <h5 className="text-lg font-medium text-orange-700 mb-3">שדות מותאמים אישית לפונים:</h5>
              {loadingFormConfig ? <LoadingSpinner /> : 
                requesterFormConfig.customFields?.length > 0 ? renderCustomFieldsList('requester', requesterFormConfig) : <p className="text-gray-500 text-sm">אין שדות מותאמים אישית.</p>}
              <Button onClick={() => openFieldEditorModal('requester')} className="mt-4 bg-orange-500 hover:bg-orange-600 text-white">הוסף שדה לפונים</Button>
            </div>

            {/* Volunteer Form Configuration */}
            <div className="p-6 border border-blue-200 rounded-xl bg-blue-50/50 shadow-md">
              <h4 className="text-xl font-semibold text-blue-800 mb-4 border-b border-blue-200 pb-2">טופס מתנדבים</h4>
              <h5 className="text-lg font-medium text-blue-700 mb-3">שדות מותאמים אישית למתנדבים:</h5>
              {loadingFormConfig ? <LoadingSpinner /> : 
                volunteerFormConfig.customFields?.length > 0 ? renderCustomFieldsList('volunteer', volunteerFormConfig) : <p className="text-gray-500 text-sm">אין שדות מותאמים אישית.</p>}
              <Button onClick={() => openFieldEditorModal('volunteer')} className="mt-4 bg-blue-500 hover:bg-blue-600 text-white">הוסף שדה למתנדבים</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {showFieldEditor && (
        <CustomFieldEditor
          field={editingField}
          onSave={handleSaveCustomField}
          onCancel={() => { setShowFieldEditor(false); setEditingField(null); }}
        />
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

      {/* View Session Summary Modal */}
      <ViewSessionSummaryModal
        isOpen={!!selectedSessionForView}
        onClose={() => setSelectedSessionForView(null)}
        sessionSummary={selectedSessionForView}
      />

      {/* Custom Alert */}
      <CustomAlert
        message={alertMessage?.message}
        onClose={() => setAlertMessage(null)}
        type={alertMessage?.type}
      />

      <CancelMatchModal
        isOpen={showCancelMatchModal}
        onClose={() => setShowCancelMatchModal(false)}
        match={activeMatches.find(m => m.id === selectedMatchForDetails)}
        onConfirm={() => cancelMatch(selectedMatchForDetails)}
      />

      <DeleteUserModal
        isOpen={showDeleteUserModal}
        onClose={() => {
          setshowDeleteUserModal(false);
          setSelectedUserForDelete(null);
        }}
        user={selectedUserForDelete}
        onConfirm={() => deleteUser(selectedUserForDelete)}
      />
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
