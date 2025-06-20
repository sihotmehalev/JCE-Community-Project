import { collection, getDocs, query, orderBy, where, limit } from "firebase/firestore";
import { db } from "../config/firebaseConfig";

// This function fetches upcoming events from the Firestore database
export const fetchUpcomingEvents = async () => {
    try {
        const eventsRef = collection(db, "Events");
        const now = new Date();
        const q = query(
            eventsRef,
            where("scheduled_time", ">=", now), // Filter out events that have already passed
            orderBy("scheduled_time", "asc") // Order upcoming events from soonest to latest
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error("Error fetching upcoming events:", error);
        throw error;
    }
};

// This function fetches past events from the Firestore database
export const fetchPastEvents = async (lim = 9) => { // Default limit to 9 past events for performance
    try {
        const eventsRef = collection(db, "Events");
        const now = new Date();
        const q = query(
            eventsRef,
            where("scheduled_time", "<", now),
            orderBy("scheduled_time", "desc"), // Order past events from most recent to oldest
            limit(lim)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error("Error fetching past events:", error);
        throw error;
    }
};

// This function fetches all events from the Firestore database (no time filtering)
export const fetchAllEvents = async () => {
    try {
        const eventsRef = collection(db, "Events");
        const q = query(
            eventsRef,
            orderBy("scheduled_time", "desc") // Order by scheduled time, newest first
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error("Error fetching all events:", error);
        throw error;
    }
};

// Keep fetchEvents for backward compatibility with other components like EventSlider
export const fetchEvents = fetchUpcomingEvents;
