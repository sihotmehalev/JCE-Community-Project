// scripts/migrate_requester_approved_status.js
// This script updates all existing requester documents in Firestore
// to set their 'approved' field to "true".
//
// To run this script:
// 1. Make sure you have Node.js installed.
// 2. Install Firebase Admin SDK: `npm install firebase-admin`
// 3. Create a service account key file from your Firebase project settings
//    (Project settings -> Service accounts -> Generate new private key).
//    Save it as `serviceAccountKey.json` in the `scripts` directory.
// 4. Run the script: `node scripts/migrate_requester_approved_status.js`

const admin = require('firebase-admin');
const serviceAccount = require('./Testers/talksfromtheheartbeta-firebase-adminsdk-fbsvc-e0bbd8598c.json'); // Make sure this path is correct

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrateRequesterApprovedStatus() {
  console.log('Starting migration for requester approved status...');

  try {
    const requestersRef = db.collection('Users').doc('Info').collection('Requesters');
    const snapshot = await requestersRef.get();

    if (snapshot.empty) {
      console.log('No requester documents found to update.');
      return;
    }

    const batch = db.batch();
    let updateCount = 0;

    snapshot.forEach(doc => {
      const data = doc.data();
      // Only update if 'approved' field is not already "true" or is missing
      if (data.approved !== "true") {
        batch.update(doc.ref, { approved: "true" });
        updateCount++;
      }
    });

    if (updateCount > 0) {
      await batch.commit();
      console.log(`Successfully updated ${updateCount} requester(s) to approved: "true".`);
    } else {
      console.log('No requesters needed an update.');
    }

  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    console.log('Migration script finished.');
  }
}

migrateRequesterApprovedStatus(); 