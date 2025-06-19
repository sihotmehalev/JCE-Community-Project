import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button'; // Assuming you have a Button component

const fieldTypes = [
  { value: 'text', label: 'טקסט קצר' },
  { value: 'textarea', label: 'טקסט ארוך (תיאור)' },
  { value: 'select', label: 'בחירה מרובה (רשימה נפתחת)' },
  { value: 'checkbox', label: 'תיבת סימון (כן/לא)' },
  { value: 'number', label: 'מספר' },
  { value: 'date', label: 'תאריך' },
];

export default function CustomFieldEditor({ field, onSave, onCancel }) {
  const [currentField, setCurrentField] = useState({
    name: '', // Will be auto-generated or manually set carefully
    label: '',
    type: 'text',
    required: false,
    placeholder: '',
    shareWithPartner: false, // New property
    options: [], // For select type
    rows: 3, // For textarea
  });

  useEffect(() => {
    if (field) {
      setCurrentField({
        ...field,
        options: field.options || [], // Ensure options is an array
        shareWithPartner: field.shareWithPartner || false, // Ensure it exists
        rows: field.rows || 3,
      });
    } else {
      // Reset for new field
      setCurrentField({
        name: `custom_${Date.now()}`, // Simple unique name generation
        label: '',
        type: 'text',
        required: false,
        placeholder: '',
        shareWithPartner: false,
        options: [],
        rows: 3,
      });
    }
  }, [field]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCurrentField(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...currentField.options];
    newOptions[index] = value;
    setCurrentField(prev => ({ ...prev, options: newOptions }));
  };

  const addOption = () => {
    setCurrentField(prev => ({ ...prev, options: [...prev.options, ''] }));
  };

  const removeOption = (index) => {
    setCurrentField(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!currentField.label.trim()) {
      alert("יש להזין תווית לשדה.");
      return;
    }
    // Basic name validation (should be more robust in a real app)
    if (!/^[a-zA-Z0-9_]+$/.test(currentField.name)) {
        alert("מזהה השדה יכול להכיל רק אותיות באנגלית, מספרים וקווים תחתונים.");
        return;
    }
    onSave(currentField);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[100000]">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-semibold mb-4 text-orange-800">
          {field ? 'עריכת שדה מותאם אישית' : 'הוספת שדה מותאם אישית'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">תווית השדה (מה שהמשתמש רואה)</label>
            <input type="text" name="label" value={currentField.label} onChange={handleChange} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">מזהה השדה (באנגלית, ללא רווחים, לדוגמה: `my_custom_field`)</label>
            <input type="text" name="name" value={currentField.name} onChange={handleChange} required disabled={!!field} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2 bg-gray-100 disabled:cursor-not-allowed" />
            {field && <p className="text-xs text-gray-500">לא ניתן לשנות מזהה של שדה קיים.</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">סוג השדה</label>
            <select name="type" value={currentField.type} onChange={handleChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2">
              {fieldTypes.map(ft => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
            </select>
          </div>
          {currentField.type === 'textarea' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">מספר שורות (לתיאור)</label>
              <input type="number" name="rows" value={currentField.rows} onChange={handleChange} min="1" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2" />
            </div>
          )}
          {currentField.type === 'select' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">אפשרויות (לרשימה נפתחת)</label>
              {currentField.options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input type="text" value={option} onChange={(e) => handleOptionChange(index, e.target.value)} className="flex-grow border-gray-300 rounded-md shadow-sm p-2" />
                  <Button type="button" variant="outline" onClick={() => removeOption(index)} className="text-red-500">מחק</Button>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addOption}>הוסף אפשרות</Button>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700">טקסט מציין מקום (Placeholder)</label>
            <input type="text" name="placeholder" value={currentField.placeholder} onChange={handleChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2" />
          </div>
          <div className="flex items-center">
            <input type="checkbox" name="required" checked={currentField.required} onChange={handleChange} className="h-4 w-4 text-orange-600 border-gray-300 rounded" />
            <label className="ml-2 block text-sm text-gray-900">שדה חובה</label>
          </div>
          <div className="flex items-center">
            <input type="checkbox" name="shareWithPartner" checked={currentField.shareWithPartner} onChange={handleChange} className="h-4 w-4 text-orange-600 border-gray-300 rounded" />
            <label className="ml-2 block text-sm text-gray-900">שתף שדה זה עם המשתמש המותאם (פונה/מתנדב)</label>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>ביטול</Button>
            <Button type="submit">שמור שדה</Button>
          </div>
        </form>
      </div>
    </div>
  );
}