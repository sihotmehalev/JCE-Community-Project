import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { motion } from "framer-motion";
import { EventSlider } from "../components/EventSlider/EventSlider";
import { 
  User, 
  Heart, 
  Bot,          
  MessageCircle, 
  Shield, 
  CalendarDays,
  HelpingHand, 
  Users,      
  Hourglass,    
  TrendingUp,   
  CheckCircle,
  // New icons for replacements:
  FileText,       // For repeated User
  ClipboardCheck, // For repeated HelpingHand
  Sparkles,       // For repeated CalendarDays (in howItWorks)
  Presentation,   // For repeated CalendarDays (in communityItems)
  MessagesSquare  // For repeated MessageCircle
} from "lucide-react";

// Animation variants for staggered appearance
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

// Animation variants for individual items
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
    }
  },
};


export default function HomePage() {
  const navigate = useNavigate();

  // Placeholder for your icon path - replace with your actual icon
  const headlineIconSrc = "/icons/sihot_mehalev_icon.svg";

  // Data for the "Why Choose Us" section - Expanded
  // Icons here are considered after Feature Section's User & CalendarDays
  const whyChooseUsItems = [
    {
      icon: <Heart className="w-8 h-8 text-orange-600" />, // New
      title: "תמיכה אנושית מהלב",
      description: "קשר אישי עם מתנדבים אמפתיים ומנוסים, שמקשיבים באמת ומעניקים תמיכה חמה ומכילה."
    },
    {
      icon: <Shield className="w-8 h-8 text-orange-600" />, // New
      title: "מרחב בטוח ומוגן",
      description: "סביבה דיסקרטית, מכבדת ותומכת, שבה תוכלו להיפתח בחופשיות ולשתף ללא חשש."
    },
    {
      icon: <Hourglass className="w-8 h-8 text-orange-600" />, // New
      title: "תהליך התאמה וסבלנות", 
      description: "אנו משקיעים מאמץ למצוא את החיבור הנכון. תהליך ההתאמה עשוי לקחת זמן, אנו מעריכים את סבלנותכם." 
    },
    {
      icon: <HelpingHand className="w-8 h-8 text-orange-600" />, // New
      title: "קהילה מחבקת",
      description: "הצטרפו לקהילה שמאמינה בכוחה של תמיכה הדדית, ערבות ואהבת חינם."
    },
    {
      icon: <Bot className="w-8 h-8 text-orange-600" />, // New
      title: "צ'אט AI וכלים לצמיחה", 
      description: "קבלו מענה ראשוני ותמיכה מיידית מצ'אט ה-AI שלנו, לצד תובנות וכלים מעשיים להתמודדות עם אתגרי החיים." 
    },
    {
      icon: <TrendingUp className="w-8 h-8 text-orange-600" />, // New
      title: "התפתחות מתמדת",
      description: "אנו שואפים תמיד להשתפר, להרחיב את השירותים ולהעניק את התמיכה הטובה ביותר."
    }
  ];

  // Data for the "How It Works" section - Descriptions slightly expanded
  const howItWorksSteps = [
    {
      step: 1,
      title: "הרשמה קצרה ומאובטחת",
      description: "מלאו טופס פשוט ודיסקרטי כדי שנוכל להבין את הצרכים שלכם או את רצונכם להתנדב. הפרטים שלכם שמורים.",
      icon: <FileText className="w-10 h-10 text-orange-600" /> // Was User (repeated from Feature Section)
    },
    {
      step: 2,
      title: "התאמה אישית וקפדנית",
      description: "המערכת או הצוות המסור שלנו יבחנו את פנייתכם וימצאו את ההתאמה הטובה ביותר עבורכם, בין אם כפונים או כמתנדבים.",
      icon: <ClipboardCheck className="w-10 h-10 text-orange-600" /> // Was HelpingHand (repeated from whyChooseUsItems)
    },
    {
      step: 3,
      title: "יצירת קשר ראשוני",
      description: "לאחר ההתאמה, תוכלו ליצור קשר עם השותף/ה שהותאם/הותאמה לכם ולהתחיל את מסע התמיכה והצמיחה המשותף.",
      icon: <MessageCircle className="w-10 h-10 text-orange-600" /> // New in this sequence
    },
    {
      step: 4,
      title: "מפגשים, תמיכה וצמיחה",
      description: "קיימו שיחות קבועות, קבעו מפגשים (במידת האפשר והרצון) והיעזרו במשאבים ובקהילה שלנו להמשך הדרך.",
      icon: <Sparkles className="w-10 h-10 text-orange-600" /> // Was CalendarDays (repeated from Feature Section)
    }
  ];


  // Data for "Join Our Community" section
  const communityItems = [
    {
      icon: <Users className="w-10 h-10 text-orange-600" />, // New in this sequence
      title: "קהילה תומכת ומכילה",
      description: "מעבר לקשר האישי, 'שיחות מהלב' היא קהילה של אנשים שאכפת להם. אנו מאמינים בכוחו של הביחד."
    },
    {
      icon: <Presentation className="w-10 h-10 text-orange-600" />, // Was CalendarDays (repeated)
      title: "אירועים וסדנאות",
      description: "אנו מארגנים מעת לעת מפגשים, סדנאות והרצאות (חלקם מוצגים למטה) להעשרה, למידה וחיבור קהילתי."
    },
    {
      icon: <MessagesSquare className="w-10 h-10 text-orange-600" />, // Was MessageCircle (repeated)
      title: "מרחבי שיח נוספים",
      description: "בעתיד, אנו שואפים להרחיב את אפשרויות התמיכה והשיח בפלטפורמות נוספות ובקבוצות ייעודיות."
    },
     {
      icon: <CheckCircle className="w-10 h-10 text-orange-600" />, // New in this sequence
      title: "התנדבות מגוונת",
      description: "מלבד שיחות אישיות, ישנן דרכים נוספות להתנדב ולתרום לפרויקט. כל עזרה מבורכת!"
    }
  ];


  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-32 max-w-screen-xl">

      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center max-w-4xl mx-auto mb-16 border-b border-gray-200 pb-12"
      >
        <div className="flex items-center justify-center gap-4 sm:gap-6 mb-8">
          <h1 className="text-4xl sm:text-6xl font-bold text-orange-800">
            שיחות מהלב
          </h1>
        </div>
        <p className="text-lg sm:text-xl text-orange-700 mb-6 leading-relaxed">
          ברוכים הבאים ל"שיחות מהלב" – מיזם חברתי המציע מרחב בטוח, אנונימי וללא עלות, להתחבר, להחלים ולצמוח.
        </p>
        <p className="text-lg sm:text-xl text-orange-700 mb-10 leading-relaxed">
          בין אם אתם זקוקים לאוזן קשבת, תמיכה רגשית, או רוצים להעניק מעצמכם ולעזור לאחרים - אנחנו כאן בשבילכם, באהבה ובדאגה.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center">
          <Button
            onClick={() => navigate("/register-requester")}
            className="text-lg px-10 py-4 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-200 w-full sm:w-auto"
          >
            אני צריך עזרה
          </Button>
          <Button
            onClick={() => navigate("/register-volunteer")}
            variant="outline"
            className="text-lg px-8 py-3 sm:py-4 rounded-xl w-full sm:w-auto"
          >
            אני רוצה להתנדב
          </Button>
          <Button
            onClick={() => navigate("/login")}
            variant="outline"
            className="text-lg px-8 py-3 sm:py-4 rounded-xl w-full sm:w-auto"
          >
            התחברות
          </Button>
        </div>
      </motion.div>

      {/* Feature Section */}
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={containerVariants}
        className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 w-full max-w-5xl mx-auto"
      >
        <motion.div variants={itemVariants}>
          <Card className="rounded-2xl shadow-xl transform hover:scale-105 transition-transform duration-300 ease-out border border-gray-100 h-full">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="mb-4 w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center border-2 border-orange-200">
                 <User className="w-8 h-8 text-orange-600" />
              </div>
              <h2 className="text-xl font-semibold mb-2 text-orange-800">מתנדבים אמיתיים</h2>
              <p className="text-orange-700 leading-relaxed">
                שיחות עם אנשים אמפתיים ומוכשרים שרוצים לעזור באמת. כל המתנדבים עוברים תהליך אישור קפדני.
              </p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={itemVariants}>
          <Card className="rounded-2xl shadow-xl transform hover:scale-105 transition-transform duration-300 ease-out border border-gray-100 h-full">
            <CardContent className="p-6 flex flex-col items-center text-center">
               <div className="mb-4 w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center border-2 border-orange-200">
                 <CalendarDays className="w-8 h-8 text-orange-600" />
              </div>
            <h2 className="text-xl font-semibold mb-2 text-orange-800">חינמי וזמין תמיד</h2>
            <p className="text-orange-700 leading-relaxed">
              השירות ניתן בחינם לחלוטין וזמין עבורכם בכל זמן שאתם זקוקים לתמיכה. אתם לא לבד בדרך.
            </p>
          </CardContent>
        </Card>
        </motion.div>
      </motion.div>

      {/* Why Choose Us Section */}
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={containerVariants}
        className="mt-24 text-center max-w-6xl mx-auto"
      >
        <h2 className="text-3xl font-bold text-orange-800 mb-4">קצת עלינו ב"שיחות מהלב"</h2>
        <p className="text-lg text-orange-700 mb-12 max-w-3xl mx-auto leading-relaxed">
          אנו מציעים יותר מסתם שיחה. אנו יוצרים חיבורים אנושיים משמעותיים, ובנוסף, מספקים גישה לצ'אט AI פנימי לתמיכה ראשונית ומידע. כל זאת במטרה להעניק תמיכה אמיתית, כלים לצמיחה ותחושת שייכות.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {whyChooseUsItems.map((item, index) => (
            <motion.div key={index} variants={itemVariants}>
              <Card className="rounded-xl shadow-lg border border-gray-100 h-full hover:shadow-xl transition-shadow duration-300">
                <CardContent className="p-6 flex flex-col items-center text-center">
                   <div className="mb-4 w-14 h-14 bg-orange-50 rounded-full flex items-center justify-center border-2 border-orange-100">
                     {item.icon}
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-orange-800">{item.title}</h3>
                  <p className="text-sm text-gray-700 leading-relaxed">{item.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* How It Works Section */}
       <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={containerVariants}
        className="mt-24 text-center max-w-6xl mx-auto"
      >
        <h2 className="text-3xl font-bold text-orange-800 mb-12">איך זה עובד? פשוט וקל</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {howItWorksSteps.map((step, index) => (
            <motion.div key={index} variants={itemVariants} className="flex flex-col items-center text-center p-4 bg-orange-50/30 rounded-lg border border-orange-100 shadow-sm hover:shadow-md transition-shadow duration-300">
              <div className="relative mb-6">
                 <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center border-4 border-orange-200 shadow-md">
                   {step.icon}
                </div>
                <span className="absolute -top-2 -right-2 w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-lg font-bold border-2 border-white shadow-sm">
                  {step.step}
                </span>
              </div>
              <h3 className="text-xl font-semibold mb-3 text-orange-800">{step.title}</h3>
              <p className="text-gray-700 leading-relaxed text-sm">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Join Our Community Section */}
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={containerVariants}
        className="mt-24 text-center max-w-6xl mx-auto"
      >
        <h2 className="text-3xl font-bold text-orange-800 mb-4">הצטרפו לקהילה שלנו</h2>
        <p className="text-lg text-orange-700 mb-12 max-w-3xl mx-auto leading-relaxed">
          "שיחות מהלב" היא יותר מפלטפורמה – היא קהילה חמה ותומכת. גלו כיצד תוכלו להיות חלק, לתרום ולהיתרם.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {communityItems.map((item, index) => (
            <motion.div key={index} variants={itemVariants}>
              <Card className="rounded-xl shadow-lg border border-gray-100 h-full hover:shadow-xl transition-shadow duration-300">
                <CardContent className="p-6 flex flex-col items-center text-center">
                   <div className="mb-4 w-14 h-14 bg-orange-50 rounded-full flex items-center justify-center border-2 border-orange-100">
                     {item.icon}
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-orange-800">{item.title}</h3>
                  <p className="text-sm text-gray-700 leading-relaxed">{item.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
         <Button
            onClick={() => navigate("/about")} // Or a dedicated community page if you create one
            variant="link"
            className="mt-12 text-lg text-orange-600 hover:text-orange-800"
          >
            למדו עוד על הפרויקט והקהילה שלנו
          </Button>
      </motion.div>

      {/* Event Slider Section */}
      <div className="mt-24 sm:mt-32">
        <EventSlider/>
      </div> 
    </div>
  );
}
