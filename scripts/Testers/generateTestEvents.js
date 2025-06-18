const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');
const { faker } = require('@faker-js/faker');

// It's recommended to store your service account key securely
// For local development, you can place it in the project root
const serviceAccount = require('../../scripts/Testers/talksfromtheheartbeta-firebase-adminsdk-fbsvc-e0bbd8598c.json'); 

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

const hebrewEventNames = [
  "אירוע תמיכה קהילתי",
  "מפגש חברים ושיח",
  "יום כיף למתנדבים",
  "הרצאה מעוררת השראה",
  "סדנת העצמה אישית",
  "ערב שירה ונגינה",
  "הליכה משותפת בטבע",
  "פעילות יצירה ופנאי",
  "מפגש קפה ועוגה",
  "ערב סיפורים אישיים",
  "שיח פתוח על קשיים",
  "טיול יום ברחבי הארץ",
  "ארוחת ערב קהילתית",
  "יום התרמה למען הקהילה",
  "מפגש ייעוץ והכוונה"
];

const hebrewEventDescriptions = [
  "בואו לקחת חלק באירוע מרגש של תמיכה הדדית וחיבור קהילתי. נשמח לראותכם!",
  "מפגש חמים ונעים עם חברים חדשים וישנים, לשיח פתוח ומהנה על נושאים שונים.",
  "יום הערכה מיוחד למתנדבים המסורים שלנו, עם פעילויות כיף והפתעות.",
  "הרצאה מרתקת מפי מומחה בתחומו, שתעניק לכם כלים ותובנות חדשות לחיים.",
  "סדנה מעשית שתעצים אתכם ותעניק לכם כלים להתמודדות עם אתגרי היום-יום.",
  "ערב קסום של שירה ונגינה, עם אמנים מקומיים וכיבוד קל. בואו ליהנות מהאווירה!",
  "הצטרפו אלינו להליכה מרעננת בטבע, בלב הנוף הירוק, לנשימה עמוקה ורוגע.",
  "פעילות יצירה מהנה ומקורית, שתפתח את הדמיון ותאפשר לכם לבטא את עצמכם.",
  "מפגש קליל באווירה נעימה, עם כוס קפה ועוגה, לשיחות חולין והיכרות.",
  "ערב מרגש בו כל אחד מוזמן לשתף סיפור אישי, באווירה של הקשבה ותמיכה.",
  "בואו לדבר על כל מה שמטריד אתכם, במרחב בטוח ומכיל, ללא שיפוטיות.",
  "טיול מהנה באחד מהמקומות היפים בארץ, עם הדרכה ופעילויות מיוחדות.",
  "ארוחת ערב משותפת שתפגיש את הקהילה סביב שולחן אחד, עם מטעמים ואווירה טובה.",
  "יום התרמה מיוחד בו כל הכנסות יוקדשו למען פעילות העמותה והקהילה.",
  "מפגש ייעוץ אישי עם מומחים בתחומים שונים, שיעניקו לכם כלים והכוונה."
];

const getRandomDate = () => {
  const now = new Date();
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(now.getMonth() - 3);
  const threeMonthsAhead = new Date();
  threeMonthsAhead.setMonth(now.getMonth() + 3);

  const randomTime = threeMonthsAgo.getTime() + Math.random() * (threeMonthsAhead.getTime() - threeMonthsAgo.getTime());
  return new Date(randomTime);
};

async function generateTestEvents(numEvents = 5) {
  const eventsCollection = db.collection('Events');
  const events = [];

  for (let i = 0; i < numEvents; i++) {
    const eventDate = getRandomDate();
    
    const event = {
      name: faker.helpers.arrayElement(hebrewEventNames),
      description: faker.helpers.arrayElement(hebrewEventDescriptions),
      location: `Location ${i + 1}`,
      Contact_info: `050-${faker.string.numeric(7)}`,
      mail: `event${i + 1}@example.com`,
      scheduled_time: Timestamp.fromDate(eventDate),
      status: 'scheduled',
      image: `https://example.com/image${i + 1}.jpg`,
      Event_added_time: Timestamp.now()
    };
    events.push(event);
  }

  const batch = db.batch();
  events.forEach(event => {
    const docRef = eventsCollection.doc(); // Automatically generates a new ID
    batch.set(docRef, event);
  });

  try {
    await batch.commit();
    console.log(`Successfully added ${numEvents} test events.`);
  } catch (error) {
    console.error('Error adding test events:', error);
  }
}

// Call the function to generate events
generateTestEvents(10).then(() => {
  console.log('Test event generation complete.');
  process.exit(0);
}).catch((error) => {
  console.error('Unhandled error during test event generation:', error);
  process.exit(1);
}); 