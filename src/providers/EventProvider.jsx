import { collection, getDocs, query, orderBy, where } from "firebase/firestore";
import { db } from "../config/firebaseConfig";

// This function fetches all events from the Firestore database
export const fetchEvents = async () => {
    try {
        const eventsRef = collection(db, "Events");
        const now = new Date();
        const q = query(
            eventsRef,
            where("scheduled_time", ">=", now), // Filter out events that have already passed
            orderBy("scheduled_time", "asc") // Order events by scheduled_time in ascending order
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error("Error fetching events:", error);
        throw error;
    }
};