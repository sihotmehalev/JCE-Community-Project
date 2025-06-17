// Script to create a test match between a volunteer and a requester
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBuXIZQb-c5N4_gnMrblt2Fw488a9nXkLI",
  authDomain: "talksfromtheheartbeta.firebaseapp.com",
  projectId: "talksfromtheheartbeta",
  storageBucket: "talksfromtheheartbeta.firebasestorage.app",
  messagingSenderId: "320132338131",
  appId: "1:320132338131:web:1ecadfdc23bd7e77731f26",
  measurementId: "G-QQQ4EW03S6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function createTestMatch() {
  try {
    // Volunteer ID (provided)
    const volunteerId = "313ZASUUWXddiD88RhfNRSLLOvG2";

    // 1. Create a test requester
    const requesterId = `req_${Math.random().toString(36).substring(2, 10)}`;
    await setDoc(doc(db, "users", requesterId), {
      fullName: "דוד כהן",
      email: "test.requester@example.com",
      phone: "050-1234567",
      gender: "זכר",
      age: 25,
      reason: "חרדה חברתית ולחץ בעבודה",
      role: "requester",
      createdAt: serverTimestamp()
    });

    console.log("✅ Created test requester:", requesterId);

    // 2. Create a match between volunteer and requester
    const matchRef = await addDoc(collection(db, "matches"), {
      volunteerId,
      requesterId,
      status: "pending", // Set as pending for the volunteer to accept
      createdAt: serverTimestamp(),
      scheduledTime: "יום ראשון, 18:00" // Default scheduled time
    });

    console.log("✅ Created match:", matchRef.id);
    console.log("Test data created successfully!");

  } catch (error) {
    console.error("Error creating test data:", error);
  }
}

// Run the function
createTestMatch(); 