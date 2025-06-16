const admin = require("firebase-admin");
const serviceAccount = require("./talksfromtheheartbeta-firebase-adminsdk-fbsvc-e0bbd8598c.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const auth = admin.auth();
const db = admin.firestore();

function isTestUser(email) {
  return /^(req|vol)\d+t@test\.com$/.test(email);
}

async function deleteFirestoreData(uid, isRequester) {
  const userPath = isRequester
    ? `Users/Info/Requesters/${uid}`
    : `Users/Info/Volunteers/${uid}`;

  // Delete user profile document
  await db.doc(userPath).delete();
  console.log(`🗑️ Deleted Firestore document: ${userPath}`);

  // If requester — delete all related Requests
  if (isRequester) {
    const requests = await db
      .collection("Requests")
      .where("requesterId", "==", uid)
      .get();

    for (const doc of requests.docs) {
      await doc.ref.delete();
      console.log(`🗑️ Deleted related request: ${doc.id}`);
    }
  }
}

async function deleteTestUsers() {
  let nextPageToken;

  do {
    const result = await auth.listUsers(1000, nextPageToken);
    const testUsers = result.users.filter((user) => isTestUser(user.email));

    for (const user of testUsers) {
      const isRequester = user.email.startsWith("req");

      console.log(`🔍 Deleting: ${user.email}`);
      await deleteFirestoreData(user.uid, isRequester);
      await auth.deleteUser(user.uid);
      console.log(`✅ Deleted Auth user: ${user.email}`);
    }

    nextPageToken = result.pageToken;
  } while (nextPageToken);

  console.log("✅ All test users and related Firestore data deleted.");
}

deleteTestUsers().catch(console.error);
