import React, { useState } from 'react';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../firebaseConfig';

const ImageDropZone = ({ onImageUpload }) => {
    const [isDragging, setIsDragging] = useState(false);

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
            onImageUpload(downloadURL);
        } catch (error) {
            console.error('Error uploading image:', error);
            alert('שגיאה בהעלאת התמונה');
        }
    };

    return (
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
    );
};

const AdminAddEvent = ({ onEventAdded }) => {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        location: '',
        Contact_info: '',
        scheduled_time: '',
        status: 'scheduled',
        image: ''
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.description) {
            alert('יש למלא את שם האירוע ואת התיאור');
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
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-4 text-right">יצירת אירוע חדש</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <label className="block text-right">שם האירוע</label>
                    <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="w-full p-2 border rounded-md"
                        dir="rtl"
                    />
                </div>
                <div className="space-y-2">
                    <label className="block text-right">תיאור</label>
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        className="w-full p-2 border rounded-md"
                        rows="4"
                        dir="rtl"
                    />
                </div>
                <div className="space-y-2">
                    <label className="block text-right">מיקום</label>
                    <input
                        type="text"
                        name="location"
                        value={formData.location}
                        onChange={handleInputChange}
                        className="w-full p-2 border rounded-md"
                        dir="rtl"
                    />
                </div>
                <div className="space-y-2">
                    <label className="block text-right">פרטי התקשרות</label>
                    <input
                        type="text"
                        name="Contact_info"
                        value={formData.Contact_info}
                        onChange={handleInputChange}
                        className="w-full p-2 border rounded-md"
                        dir="rtl"
                    />
                </div>
                <div className="space-y-2">
                    <label className="block text-right">תאריך ושעה</label>
                    <input
                        type="datetime-local"
                        name="scheduled_time"
                        value={formData.scheduled_time}
                        onChange={handleInputChange}
                        className="w-full p-2 border rounded-md"
                    />
                </div>
                <div className="space-y-2">
                    <label className="block text-right">תמונה</label>
                    <ImageDropZone
                        onImageUpload={(url) => setFormData(prev => ({ ...prev, image: url }))}
                    />
                </div>
                <button
                    type="submit"
                    className="w-full bg-orange-500 text-white py-2 px-4 rounded-md hover:bg-orange-600"
                >
                    צור אירוע
                </button>
            </form>
        </div>
    );
};

export default AdminAddEvent;