import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { EventSlider } from "./EventSlider/EventSlider";
import { fetchEvents } from "./providers/EventProvider"; 

export default function HomePage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);

  useEffect(() => {
        const loadEvents = async () => {
            try {
                const eventData = await fetchEvents();
                setEvents(eventData);
            } catch (error) {
                console.error("Error:", error);
            }

        };

        loadEvents();
    }, []);

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-xl p-32 mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center max-w-2xl mx-auto mb-10"
      >
        <h1 className="text-5xl font-bold text-orange-800 mb-6">
          שיחות מהלב
        </h1>
        <p className="text-lg text-orange-700 mb-10">
          מרחב בטוח להתחבר, להחלים ולצמוח. אם אתה זקוק לעזרה או רוצה לעזור לאחרים - אנחנו כאן בשבילך, באהבה ובדאגה.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={() => navigate("/register-requester")}
            className="text-lg px-6 py-4 rounded-2xl shadow-md"
          >
            אני צריך עזרה
          </Button>
          <Button
            onClick={() => navigate("/register-volunteer")}
            variant="outline"
            className="text-lg px-6 py-4 rounded-2xl"
          >
            אני רוצה להתנדב
          </Button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
        className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl"
      >
        <Card className="rounded-2xl shadow-lg transform hover:scale-105 transition-transform duration-200">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-2 text-orange-800">שמירה על אנונימיות</h2>
            <p className="text-orange-700">
              דברו בחופשיות וללא חשש. הזהות שלכם שמורה ומוגנת.
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-lg transform hover:scale-105 transition-transform duration-200">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-2 text-orange-800">מתנדבים אמיתיים</h2>
            <p className="text-orange-700">
              שיחות עם אנשים אמפתיים ומוכשרים שרוצים לעזור באמת.
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-lg transform hover:scale-105 transition-transform duration-200">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-2 text-orange-800">חינמי וזמין תמיד</h2>
            <p className="text-orange-700">
              השירות ניתן בחינם וזמין בכל זמן. אתם לא לבד.
            </p>
          </CardContent>
        </Card>
      </motion.div>

      <EventSlider events={events} />

    </div>
  );
}