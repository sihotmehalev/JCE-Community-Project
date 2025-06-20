import React, { useState } from 'react';
import { collection, addDoc, Timestamp, getDocs, writeBatch, serverTimestamp, doc, query } from 'firebase/firestore';
import { db } from '../../../config/firebaseConfig';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import CustomAlert from "../../ui/CustomAlert";

const AdminAddEvent = ({ onEventAdded }) => {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        location: '',
        Contact_info: '',
        mail: '', 
        scheduled_time: '',
        status: 'scheduled',
        image: ''
    });
    const [validationErrors, setValidationErrors] = useState({});
    const [alertMessage, setAlertMessage] = useState(null);

    const validateField = (field, value) => {
        const errors = {};
        
        switch (field) {
            case 'mail':
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!value.trim()) errors.mail = 'מייל הוא שדה חובה';
                else if (!emailRegex.test(value)) errors.mail = 'כתובת מייל לא תקינה';
                break;
            case 'Contact_info':
                const phoneRegex = /^\d{3}(?:-)?(?:\d{4})(?:-)?(?:\d{3})$/;
                if (!value.trim()) errors.Contact_info = 'טלפון הוא שדה חובה';
                else if (!phoneRegex.test(value.replace(/\s/g, ''))) errors.Contact_info = 'מספר טלפון לא תקין';
                break;
            case 'name':
                if (!value.trim()) errors.name = 'שם האירוע הוא שדה חובה';
                else if (value.trim().length < 2) errors.name = 'שם האירוע חייב להכיל לפחות 2 תווים';
                break;
            case 'location':
                if (!value.trim()) errors.location = 'מיקום הוא שדה חובה';
                else if (value.trim().length < 2) errors.location = 'מיקום חייב להכיל לפחות 2 תווים';
                break;
            case 'description':
                if (!value.trim()) errors.description = 'תיאור הוא שדה חובה';
                else if (value.trim().length < 5) errors.description = 'תיאור חייב להכיל לפחות 5 תווים';
                break;
            default:
                break;
        }
        
        return errors;
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        
        setValidationErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[name];
            return newErrors;
        });

        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const allErrors = {};
        const fieldsToValidate = ['name', 'description', 'location', 'Contact_info', 'mail'];
        
        fieldsToValidate.forEach(field => {
            const fieldErrors = validateField(field, formData[field] || '');
            Object.assign(allErrors, fieldErrors);
        });

        if (!formData.scheduled_time) {
            allErrors.scheduled_time = 'זמן האירוע הוא שדה חובה';
        }

        if (Object.keys(allErrors).length > 0) {
            setValidationErrors(allErrors);
            setAlertMessage({ message: 'יש למלא את כל השדות הנדרשים בצורה תקינה', type: 'error' });
            return;
        }

        try {
            const eventData = {
                ...formData,
                status: 'scheduled',
                Event_added_time: Timestamp.now(),
                scheduled_time: Timestamp.fromDate(new Date(formData.scheduled_time))
            };
            if (!eventData.scheduled_time || eventData.scheduled_time.toDate().getTime() < Date.now()) {
                setAlertMessage({ message: 'יש לבחור זמן עתידי לאירוע', type: 'error' });
                return;
            }
            
            await addDoc(collection(db, "Events"), eventData);
            
            const batch = writeBatch(db);
            const volunteersQuery = query(collection(db, "Users", "Info", "Volunteers"));
            const requestersQuery = query(collection(db, "Users", "Info", "Requesters"));
            
            const [volunteersSnapshot, requestersSnapshot] = await Promise.all([
                getDocs(volunteersQuery),
                getDocs(requestersQuery)
            ]);

            const notificationMessage = `אירוע חדש: ${eventData.name}`;
            const notificationLink = '/'; // Corrected link to homepage

            volunteersSnapshot.forEach(userDoc => {
                const notificationRef = doc(collection(db, "notifications"));
                batch.set(notificationRef, {
                    userId: userDoc.id,
                    message: notificationMessage,
                    link: notificationLink,
                    createdAt: serverTimestamp(),
                    read: false
                });
            });

            requestersSnapshot.forEach(userDoc => {
                const notificationRef = doc(collection(db, "notifications"));
                batch.set(notificationRef, {
                    userId: userDoc.id,
                    message: notificationMessage,
                    link: notificationLink,
                    createdAt: serverTimestamp(),
                    read: false
                });
            });

            await batch.commit();

            setAlertMessage({ message: 'אירוע נוצר ונוטיפיקציות נשלחו בהצלחה!', type: 'success' });
            
            setFormData({
                name: '',
                description: '',
                location: '',
                Contact_info: '',
                mail: '', 
                scheduled_time: '',
                status: 'scheduled',
                image: ''
            });
            if (onEventAdded) {
                onEventAdded();
            }
        } catch (error) {
            console.error("Error creating event or notifications:", error);
            setAlertMessage({ message: 'שגיאה ביצירת האירוע', type: 'error' });
        }
    };

    return (
        <Card>
            <CardContent>
                <h3 className="font-semibold mb-4 text-orange-700">יצירת אירוע חדש</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex gap-4 items-center">
                        <div className="flex flex-col w-1/5">
                            <label className="block font-medium text-gray-700 text-right">שם האירוע <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                className={`w-full p-2 border rounded-md ${
                                    validationErrors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : 'border-orange-100 focus:border-orange-500 focus:ring-orange-200'
                                }`}
                                dir="rtl"
                            />
                            {validationErrors.name && (
                                <p className="text-red-500 text-sm mt-1 text-right">{validationErrors.name}</p>
                            )}
                        </div>

                        <div className="flex flex-col w-1/5">
                            <label className="block font-medium text-gray-700 text-right">מיקום <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                name="location"
                                value={formData.location}
                                onChange={handleInputChange}
                                className={`w-full p-2 border rounded-md ${
                                    validationErrors.location ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : 'border-orange-100 focus:border-orange-500 focus:ring-orange-200'
                                }`}
                                dir="rtl"
                            />
                            {validationErrors.location && (
                                <p className="text-red-500 text-sm mt-1 text-right">{validationErrors.location}</p>
                            )}
                        </div>
                        <div className="flex flex-col w-1/5">
                            <label className="block font-medium text-gray-700 text-right">פרטי התקשרות <span className="text-red-500">*</span></label>
                            <input
                                type="tel"
                                name="Contact_info"
                                value={formData.Contact_info}
                                onChange={handleInputChange}
                                className={`w-full p-2 border rounded-md ${
                                    validationErrors.Contact_info ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : 'border-orange-100 focus:border-orange-500 focus:ring-orange-200'
                                }`}
                                dir="ltr"
                                placeholder="050-123-4567"
                            />
                            {validationErrors.Contact_info && (
                                <p className="text-red-500 text-sm mt-1 text-right">{validationErrors.Contact_info}</p>
                            )}
                        </div>
                        <div className="flex flex-col w-1/5">
                            <label className="block font-medium text-gray-700 text-right">דוא"ל <span className="text-red-500">*</span></label>
                            <input
                                type="email"
                                name="mail"
                                value={formData.mail}
                                onChange={handleInputChange}
                                className={`w-full p-2 border rounded-md ${
                                    validationErrors.mail ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : 'border-orange-100 focus:border-orange-500 focus:ring-orange-200'
                                }`}
                                dir="ltr"
                                placeholder="example@domain.com"
                            />
                            {validationErrors.mail && (
                                <p className="text-red-500 text-sm mt-1 text-right">{validationErrors.mail}</p>
                            )}
                        </div>
                        <div className="flex flex-col w-1/5">
                            <label className="block font-medium text-gray-700 text-right">תאריך ושעה <span className="text-red-500">*</span></label>
                            <input
                                type="datetime-local"
                                name="scheduled_time"
                                value={formData.scheduled_time}
                                onChange={handleInputChange}
                                className={`w-full p-2 border rounded-md ${
                                    validationErrors.scheduled_time ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : 'border-orange-100 focus:border-orange-500 focus:ring-orange-200'
                                }`}
                            />
                            {validationErrors.scheduled_time && (
                                <p className="text-red-500 text-sm mt-1 text-right">{validationErrors.scheduled_time}</p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block font-medium text-gray-700 text-right">תיאור <span className="text-red-500">*</span></label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            className={`w-full p-2 border rounded-md ${
                                validationErrors.description ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : 'border-orange-100 focus:border-orange-500 focus:ring-orange-200'
                            }`}
                            rows="4"
                            dir="rtl"
                        />
                        {validationErrors.description && (
                            <p className="text-red-500 text-sm mt-1 text-right">{validationErrors.description}</p>
                        )}
                    </div>

                    {/* Image Link Field (single image) */}
                    <div className="space-y-2">
                        <label className="block font-medium text-gray-700 text-right">קישור לתמונה (תמונה אחת בלבד)</label>
                        <input
                            type="text"
                            name="image"
                            value={formData.image}
                            onChange={handleInputChange}
                            className="w-full p-2 border rounded-md border-orange-100 focus:border-orange-500 focus:ring-orange-200"
                            dir="ltr"
                            placeholder="https://example.com/image.jpg"
                        />
                        <a
                            href="https://imgbb.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-sm text-right block"
                        >
                            העלה תמונה לשרת (imgbb.com) לקבלת קישור
                        </a>
                    </div>

                    <Button
                        type="submit"
                        className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded transition-colors"
                    >
                        צור אירוע
                    </Button>
                </form>
            </CardContent>
            <CustomAlert
                message={alertMessage?.message}
                onClose={() => setAlertMessage(null)}
                type={alertMessage?.type}
            />
        </Card>
    );
};

export default AdminAddEvent;