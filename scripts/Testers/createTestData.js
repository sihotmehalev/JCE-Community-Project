// This script helps populate test data for the VolunteerDashboard
// Run this in your browser console when logged in as a volunteer

async function createTestData() {
  try {
    const { auth, db } = firebase;
    const { 
      collection, 
      doc, 
      setDoc, 
      addDoc, 
      serverTimestamp 
    } = firebase.firestore;

    if (!auth.currentUser) {
      console.error("You need to be logged in to run this script");
      return;
    }

    const volunteerId = auth.currentUser.uid;
    console.log("Creating test data for volunteer ID:", volunteerId);

    // 1. Make sure the volunteer has a user profile
    await setDoc(doc(db, "users", volunteerId), {
      fullName: "מתנדב לדוגמה",
      email: auth.currentUser.email,
      role: "volunteer",
      phone: "050-1234567",
      gender: "זכר",
      age: 35,
      profession: "יועץ נפשי",
      experience: "5 שנים",
      approved: true,
      createdAt: serverTimestamp()
    }, { merge: true });
    console.log("✅ Volunteer profile updated");

    // 2. Create test requesters
    const requesters = [
      {
        id: "req1_" + Math.random().toString(36).substring(2, 10),
        fullName: "אבי כהן",
        email: "avi.cohen@example.com",
        phone: "052-1111111",
        gender: "זכר",
        age: 27,
        reason: "חרדה חברתית",
        role: "requester"
      },
      {
        id: "req2_" + Math.random().toString(36).substring(2, 10),
        fullName: "שרה לוי",
        email: "sarah.levy@example.com",
        phone: "054-2222222",
        gender: "נקבה",
        age: 42,
        reason: "דיכאון קליני",
        role: "requester"
      },
      {
        id: "req3_" + Math.random().toString(36).substring(2, 10),
        fullName: "יוסי אברהם",
        email: "yossi.a@example.com",
        phone: "058-3333333",
        gender: "זכר",
        age: 19,
        reason: "קשיי הסתגלות",
        role: "requester"
      }
    ];

    // Add requesters to users collection
    for (const requester of requesters) {
      const { id, ...userData } = requester;
      await setDoc(doc(db, "users", id), {
        ...userData,
        createdAt: serverTimestamp()
      });
    }
    console.log("✅ Created test requesters");

    // 3. Create matches between volunteer and requesters
    const matches = [
      {
        volunteerId,
        requesterId: requesters[0].id,
        status: "active",
        createdAt: serverTimestamp(),
        scheduledTime: "יום ראשון, 18:00"
      },
      {
        volunteerId,
        requesterId: requesters[1].id,
        status: "active",
        createdAt: serverTimestamp(),
        scheduledTime: "יום שלישי, 17:30"
      },
      {
        volunteerId,
        requesterId: requesters[2].id,
        status: "canceled",
        createdAt: serverTimestamp(),
        canceledAt: serverTimestamp(),
        canceledBy: volunteerId,
        scheduledTime: "יום רביעי, 19:00"
      }
    ];

    for (const match of matches) {
      await addDoc(collection(db, "matches"), match);
    }
    console.log("✅ Created test matches");

    // 4. Create test messages
    const messages = [
      {
        senderId: volunteerId,
        text: "שלום, איך אני יכול לעזור?",
        timestamp: new Date(Date.now() - 100000)
      },
      {
        senderId: requesters[0].id,
        text: "תודה שהסכמת לדבר איתי. אני מרגיש מאוד לחוץ לאחרונה.",
        timestamp: new Date(Date.now() - 90000)
      },
      {
        senderId: volunteerId,
        text: "אני מבין. בוא נתחיל בלדבר על מה שגורם לך להרגיש כך.",
        timestamp: new Date(Date.now() - 80000)
      }
    ];

    // Add messages to the conversations collection
    for (const message of messages) {
      await addDoc(
        collection(db, "messages", requesters[0].id, volunteerId), 
        message
      );
    }
    console.log("✅ Created test messages");

    // 5. Create waiting requests
    const waitingRequests = [
      {
        requesterId: "waiting1_" + Math.random().toString(36).substring(2, 10),
        status: "waiting",
        createdAt: serverTimestamp(),
        preferredTimes: "ערב",
        reason: "בעיות בעבודה"
      },
      {
        requesterId: "waiting2_" + Math.random().toString(36).substring(2, 10),
        status: "waiting",
        createdAt: serverTimestamp(),
        preferredTimes: "בוקר",
        reason: "מתח במשפחה"
      }
    ];

    // Add waiting requesters' profiles
    await setDoc(doc(db, "users", waitingRequests[0].requesterId), {
      fullName: "דני ישראלי",
      email: "dani@example.com", 
      phone: "050-4444444",
      gender: "זכר",
      age: 31,
      reason: "בעיות בעבודה",
      role: "requester"
    });

    await setDoc(doc(db, "users", waitingRequests[1].requesterId), {
      fullName: "מיכל דוד",
      email: "michal@example.com", 
      phone: "050-5555555",
      gender: "נקבה",
      age: 45,
      reason: "מתח במשפחה",
      role: "requester"
    });

    // Add waiting requests
    for (const request of waitingRequests) {
      await addDoc(collection(db, "requests"), request);
    }
    console.log("✅ Created waiting requests");

    console.log("✅ All test data created successfully! Refresh the page to see the changes.");
  } catch (error) {
    console.error("Error creating test data:", error);
  }
}

// Run the function
createTestData().then(() => console.log("Test data creation completed")); 