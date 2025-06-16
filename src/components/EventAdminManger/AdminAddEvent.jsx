import React, { useState } from 'react';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../firebaseConfig';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';

const ImageDropZone = ({ onImageUpload, currentImage }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [preview, setPreview] = useState(currentImage || '');

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDragIn = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragOut = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = [...e.dataTransfer.files];
        if (files && files.length > 0) {
            const file = files[0];
            if (!file.type.startsWith('image/')) {
                alert('Please upload an image file');
                return;
            }
            await handleImageUpload(file);
        }
    };

    const handleImageUpload = async (file) => {
        try {
            const storageRef = ref(storage, `event-images/${Date.now()}-${file.name}`);
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);
            setPreview(downloadURL);
            onImageUpload(downloadURL);
        } catch (error) {
            console.error('Error uploading image:', error);
            alert('שגיאה בהעלאת התמונה');
        }
    };

    return (
        <div className="space-y-2">
            {preview ? (
                // Show image preview if we have one
                <div className="relative">
                    <img 
                        src={preview} 
                        alt="תצוגה מקדימה" 
                        className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                        type="button"
                        onClick={() => {
                            setPreview('');
                            onImageUpload('');
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                        title="הסר תמונה"
                    >
                        ✕
                    </button>
                </div>
            ) : (
                <div
                    onDragEnter={handleDragIn}
                    onDragLeave={handleDragOut}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={`w-full h-32 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer
                        ${isDragging ? 'border-orange-500 bg-orange-50' : 'border-gray-300'}`}
                >
                    <div className="text-center">
                        <p className="text-gray-600">גרור תמונה לכאן או</p>
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                                if (e.target.files?.[0]) {
                                    handleImageUpload(e.target.files[0]);
                                }
                            }}
                            id="imageUpload"
                        />
                        <label
                            htmlFor="imageUpload"
                            className="text-orange-600 hover:text-orange-700 cursor-pointer"
                        >
                            בחר קובץ
                        </label>
                    </div>
                </div>
            )}
        </div>
    );
};

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

    const validateField = (field, value) => {
        const errors = {};
        
        switch (field) {
            case 'mail':
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!value.trim()) {
                    errors.mail = 'מייל הוא שדה חובה';
                } else if (!emailRegex.test(value)) {
                    errors.mail = 'כתובת מייל לא תקינה';
                }
                break;
                
            case 'Contact_info':
                const phoneRegex = /^\d{3}(?:-)?(?:\d{4})(?:-)?(?:\d{3})$/;
                if (!value.trim()) {
                    errors.Contact_info = 'טלפון הוא שדה חובה';
                } else if (!phoneRegex.test(value.replace(/\s/g, ''))) {
                    errors.Contact_info = 'מספר טלפון לא תקין';
                }
                break;
                
            case 'name':
                if (!value.trim()) {
                    errors.name = 'שם האירוע הוא שדה חובה';
                } else if (value.trim().length < 2) {
                    errors.name = 'שם האירוע חייב להכיל לפחות 2 תווים';
                }
                break;

            case 'location':
                if (!value.trim()) {
                    errors.location = 'מיקום הוא שדה חובה';
                } else if (value.trim().length < 2) {
                    errors.location = 'מיקום חייב להכיל לפחות 2 תווים';
                }
                break;

            case 'description':
                if (!value.trim()) {
                    errors.description = 'תיאור הוא שדה חובה';
                } else if (value.trim().length < 5) {
                    errors.description = 'תיאור חייב להכיל לפחות 5 תווים';
                }
                break;
        }
        
        return errors;
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        
        // Clear validation error when field is edited
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
        
        // Validate all fields
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
            alert('יש למלא את כל השדות הנדרשים בצורה תקינה');
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
                alert('יש לבחור זמן עתידי לאירוע');
                return;
            }
            await addDoc(collection(db, "Events"), eventData);
            alert('אירוע נוצר בהצלחה!');
            
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
            console.error("Error creating event:", error);
            alert('שגיאה ביצירת האירוע');
        }
    };

    return (
        <Card>
            <CardContent>
                <h3 className="font-semibold mb-4 text-orange-700">יצירת אירוע חדש</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
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

                    <div className="space-y-2">
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

                    <div className="space-y-2">
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

                    <div className="space-y-2">
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

                    <div className="space-y-2">
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

                    <div className="space-y-2">
                        <label className="block font-medium text-gray-700 text-right">תמונה</label>
                        <ImageDropZone
                            onImageUpload={(url) => setFormData(prev => ({ ...prev, image: url }))}
                            currentImage={formData.image}
                        />
                    </div>

                    <Button
                        type="submit"
                        className="w-full py-3 px-6 text-lg"
                    >
                        צור אירוע
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
};

export default AdminAddEvent;