// AdminDashboard.jsx - Full Implementation
import { useEffect, useState, useRef } from "react";
import { db } from "../../firebaseConfig";
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
  increment,
  deleteDoc
} from "firebase/firestore";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { HoverCard } from "../ui/HoverCard";
import AISuggestionModal from '../AISuggestionModal';
import { generateRandomId } from "../firebaseHelpers";
import LoadingSpinner from "../LoadingSpinner";
import EventCreation from "../EventAdminManger/AdminAddEvent";
import { AdminEventList } from '../EventAdminManger/AdminEventList';
import { CancelMatchModal } from '.././ui/CancelMatchModal';
import { DeleteUserModal } from '.././ui/DeleteUserModal'

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
  const [activeMatches, setActiveMatches] = useState([]);
  const [activeMatchSearch, setActiveMatchSearch] = useState("");
  const [activeMatchCurrentPage, setActiveMatchCurrentPage] = useState(1);
  const [matchRequesterFilter, setMatchRequesterFilter] = useState("all"); // filter by requester ID
  const [matchVolunteerFilter, setMatchVolunteerFilter] = useState("all"); // filter by volunteer ID
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

  // New state for cancel match modal
  const [showCancelMatchModal, setShowCancelMatchModal] = useState(false);

  // New state for delete user modal
  const [showDeleteUserModal, setshowDeleteUserModal] = useState(false);
  const [selectedUserForDelete, setSelectedUserForDelete] = useState(null);

  // useEffect for resetting currentPage (moved here to ensure unconditional call)
  useEffect(() => {
    setCurrentPage(1);
  }, [userSearch, roleFilter, statusFilter, personalFilter, activeMatchesFilter]);

  // useEffect for resetting activeMatchCurrentPage when filters or search change
  useEffect(() => {
    setActiveMatchCurrentPage(1);
  }, [activeMatchSearch, matchSortColumn, matchSortOrder]);

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

      // Fetch all matches
      const matchesSnap = await getDocs(collection(db, "Matches"));
      const matches = await Promise.all(
        matchesSnap.docs.map(async (docSnap) => {
          const data = docSnap.data();
          
          // Fetch requester info
          const requesterDoc = await getDoc(doc(db, "Users", "Info", "Requesters", data.requesterId));
          const requesterInfo = requesterDoc.exists() ? requesterDoc.data() : null;
          
          // Fetch volunteer info
          const volunteerDoc = await getDoc(doc(db, "Users", "Info", "Volunteers", data.volunteerId));
          const volunteerInfo = volunteerDoc.exists() ? volunteerDoc.data() : null;
          
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
      setActiveMatches(matches);
      
    } catch (error) {
      console.error("Error fetching data:", error);
    }
    setLoading(false);
  };

  const fetchSessions = async (matchId) => {
    setLoadingSessions(true);
    try {
      const sessionsSnap = await getDocs(query(collection(db, "Sessions"), where("matchId", "==", matchId)));
      const sessionsData = sessionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMatchSessions(sessionsData);
    } catch (error) {
      console.error("Error fetching sessions:", error);
    }
    setLoadingSessions(false);
  };

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
  }, []);

  useEffect(() => {
    if (selectedMatchForDetails && showSessionDetails) {
      fetchSessions(selectedMatchForDetails);
    } else if (!selectedMatchForDetails) {
      setMatchSessions([]);
    }
  }, [selectedMatchForDetails, showSessionDetails]);

  const approveVolunteer = async (id) => {
    try {
      await updateDoc(doc(db, "Users", "Info", "Volunteers", id), { approved: true });
      await setDoc(doc(db, "Users", "Info"), { Volunteers: increment(1) }, { merge: true });
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
        activeMatchId: matchId
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
      alert("ההתאמה בוטלה בהצלחה");

    } catch (error) {
      console.error("Error cancelling match:", error);
      alert("שגיאה בביטול ההתאמה");
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
      alert("המשתמש נמחק בהצלחה");
  
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("שגיאה במחיקת המשתמש");
    }
  };

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
          variant={activeTab === "volunteers" ? "default" : "outline"}
          onClick={() => setActiveTab("volunteers")}
          className="py-3 px-6 text-lg"
        >
          מתנדבים לאישור ({volunteers.filter(v => v.approved !== "true").length})
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
          כל המשתמשים
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
      </div>

      {/* Volunteers Awaiting Approval */}
      {activeTab === "volunteers" && (
        <Card>
          <CardContent>
            <h3 className="font-semibold mb-4 text-orange-700">
              מתנדבים ממתינים לאישור
            </h3>
            {volunteers.filter(v => v.approved !== "true").length === 0 ? (
              <p className="text-orange-600/80">אין מתנדבים בהמתנה.</p>
            ) : (
              <div className="space-y-2">
                {volunteers.filter(v => v.approved !== "true").map(v => (
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
                className={`w-1/4 border rounded p-4 bg-gray-50/50 h-[280px] overflow-y-scroll`}
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
                    <p><strong>התאמה פעילה:</strong> {requesters.find(r => r.id === selectedRequester)?.activeMatchId ? 'כן' : 'לא'}</p>
                  </div>
                ) : hoveredRequester ? (
                  <div className="space-y-2 text-base">
                    <p><strong>שם:</strong> {hoveredRequester.fullName}</p>
                    <p><strong>אימייל:</strong> {hoveredRequester.email}</p>
                    <p><strong>גיל:</strong> {hoveredRequester.age}</p>
                    <p><strong>מגדר:</strong> {hoveredRequester.gender}</p>
                    <p><strong>סיבת פנייה:</strong> {hoveredRequester.reason}</p>
                    <p><strong>התאמה פעילה:</strong> {hoveredRequester.activeMatchId ? 'כן' : 'לא'}</p>
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
                <ul className="space-y-2 h-[280px] overflow-y-scroll">
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
                <ul className="space-y-2 h-[280px] overflow-y-scroll">
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
                className={`w-1/4 border rounded p-4 bg-gray-50/50 h-[280px] overflow-y-scroll`}
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
                                <HoverCard user={match.requesterInfo}>
                                  {match.requesterInfo?.fullName || 'N/A'}
                                </HoverCard>
                              </td>
                              <td className="border border-orange-100 p-2 text-orange-700">
                                <HoverCard user={match.volunteerInfo}>
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
                                  className="text-red-600 hover:text-red-800"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedMatchForDetails(match.id);
                                    setShowSessionDetails(false);
                                    setShowCancelMatchModal(true);
                                  }}
                                >
                                  ביטול התאמה
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
                    עמוד {activeMatchCurrentPage} מתוך {Math.ceil(activeMatches
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
                      }).length / itemsPerPage)}
                  </span>
                  <Button
                    onClick={() => setActiveMatchCurrentPage(prev => Math.min(Math.ceil(activeMatches
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
                      }).length / itemsPerPage), prev + 1))}
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
                    <th className="w-24 border border-orange-100 p-2 text-orange-800 cursor-pointer">מחיקת משתמש</th>
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
                        {u.role === 'requester' 
                          ? (u.activeMatchId ? 1 : 0)
                          : (u.activeMatchIds?.length || 0)}
                      </td>
                      <td>                       
                         <button
                          className="px-4 py-2 text-orange-800 hover:bg-orange-50 border border-orange-200 rounded-md transition-colors duration-200 hover:border-orange-300 w-full"
                          onClick={() => { 
                            setshowDeleteUserModal(true);
                            setShowSessionDetails(false);
                            setSelectedUserForDelete(u);
                          }}
                        >
                          מחיקה
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
      <Card className="w-full max-w-lg bg-white p-6 rounded-lg shadow-xl">
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