// AISuggestionsModal.jsx - Fixed import
import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from "./Modal";
import { Button } from './ui/button';
import { generateAIPrompt } from "./firebaseHelpers";
// Fix: Import as named exports, not default
import { 
  getAIMatchingSuggestionsWithRetry, 
  testGroqConnection 
} from "./aiService";

export default function AISuggestionsModal({
  isOpen,
  onClose,
  request,
  volunteers,
  onSelectVolunteer
}) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [error, setError] = useState(null);
  const [parsedSuggestions, setParsedSuggestions] = useState([]);
  const [connectionTested, setConnectionTested] = useState(false);

  const fetchAISuggestions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const availableVolunteers = volunteers.filter(v =>
        v.approved &&
        (v.isAvailable || v.isAvaliable) &&
        !v.personal
      );

      if (availableVolunteers.length === 0) {
        setError('אין מתנדבים זמינים להתאמה.');
        setLoading(false);
        return;
      }

      const prompt = generateAIPrompt(request, availableVolunteers);

      // Fix: Call directly, not through aiService object
      const aiResponse = await getAIMatchingSuggestionsWithRetry(prompt);
      // console.log("Raw AI Response:", aiResponse);
      setSuggestions(aiResponse);

      // console.log("Available Volunteers for parsing:", availableVolunteers);
      const parsed = parseAIResponse(aiResponse, availableVolunteers);

      setParsedSuggestions(parsed);

    } catch (err) {
      let errorMessage = 'Failed to get AI suggestions.';

      if (err.message.includes('API key')) {
        errorMessage = 'API key error. Please check your Groq configuration.';
      } else if (err.message.includes('Rate limit')) {
        errorMessage = 'Too many requests. Please wait a moment and try again.';
      }

      setError(errorMessage);
      console.error('AI Suggestions Error:', err);
    } finally {
      setLoading(false);
    }
  }, [request, volunteers]);

  const testConnection = useCallback(async () => {
    try {
      // Fix: Call directly, not through aiService object
      await testGroqConnection();
      setConnectionTested(true);
    } catch (err) {
      setError('Unable to connect to AI service. Please check your configuration.');
      console.error('Connection test failed:', err);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) { // When modal closes, reset relevant state
      setSuggestions(null);
      setParsedSuggestions([]);
      setError(null);
      // connectionTested should persist across modal openings in the same session
      return;
    }

    if (isOpen && request) {
      if (!connectionTested) {
        testConnection();
      } else {
        // If connection is already tested, and modal is open with a request, fetch suggestions.
        // This ensures suggestions are fetched/re-fetched if the request or volunteers change.
        fetchAISuggestions();
      }
    }
  }, [isOpen, request, connectionTested, fetchAISuggestions, testConnection]);

  const parseAIResponse = (response, volunteers) => {
    const rawSuggestions = [];
    const lines = response.split('\n');

    const suggestionStartRegex = /(ההתאמה הטובה ביותר|בחירה שנייה|בחירה שלישית):?\s*מתנדב #(\d+)/i;
    const reasoningStartRegex = /נימוק:(.*)/i;

    let currentSuggestion = null;
    let currentReasoningLines = []; // Buffer for reasoning lines

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const headerMatch = line.match(suggestionStartRegex);

      if (headerMatch) {
        // If we were collecting a previous suggestion's reasoning, push it now
        if (currentSuggestion) {
          currentSuggestion.reasoning = currentReasoningLines.join(' ').trim();
          rawSuggestions.push(currentSuggestion);
        }

        // Start a new suggestion
        const rankText = headerMatch[1];
        const volunteerNumber = parseInt(headerMatch[2]);
        currentSuggestion = {
          rankText: rankText,
          volunteerNumber: volunteerNumber,
          reasoning: '', // Will be filled from currentReasoningLines
        };
        currentReasoningLines = []; // Reset reasoning buffer for the new suggestion

      } else if (currentSuggestion) {
        // If we are currently processing a suggestion, try to collect its reasoning
        const reasoningMatch = line.match(reasoningStartRegex);
        if (reasoningMatch) {
          // If this line is the start of reasoning, take the captured group
          currentReasoningLines.push(reasoningMatch[1].trim());
        } else if (line.trim() && !line.match(/^(לאחר בדיקת הפרופילים|כל ההתאמות שלי|המלצות AI:|סיכום:)/i)) {
          // If not a new header and not an ignorable line, add to current reasoning
          currentReasoningLines.push(line.trim());
        }
      }
    }

    // Save the last suggestion after the loop
    if (currentSuggestion) {
      currentSuggestion.reasoning = currentReasoningLines.join(' ').trim();
      rawSuggestions.push(currentSuggestion);
    }

    const uniqueSuggestionsMap = new Map(); // Map<volunteerId, {volunteer: {}, reasoning: '', rank: number}>

    rawSuggestions.forEach(raw => {
      const volunteerIndex = raw.volunteerNumber - 1;
      const volunteer = volunteers[volunteerIndex];
      // console.log(`AI suggested volunteer #${raw.volunteerNumber}, found volunteer:`, volunteer);

      if (volunteer) {
        // Replace volunteer number with name in reasoning here
        const replacementName = volunteer.fullName || `מתנדב #${raw.volunteerNumber} (ללא שם)`; 
        const formattedReasoning = raw.reasoning.replace(
          new RegExp(`מתנדב #${raw.volunteerNumber}`, 'g'),
          replacementName
        );

        let rank = 99; // Default to low rank
        if (raw.rankText.includes("ההתאמה הטובה ביותר")) rank = 1;
        else if (raw.rankText.includes("בחירה שנייה")) rank = 2;
        else if (raw.rankText.includes("בחירה שלישית")) rank = 3;

        const existing = uniqueSuggestionsMap.get(volunteer.id);
        // Keep the higher ranked (lower number) suggestion or the first one encountered if ranks are equal
        if (!existing || rank < existing.rank) {
          uniqueSuggestionsMap.set(volunteer.id, {
            volunteer: volunteer,
            reasoning: formattedReasoning,
            rank: rank,
            aiVolunteerNumber: raw.volunteerNumber
          });
        }
      }
    });

    // Convert map values to array, sort by rank, and take top 3
    const finalParsedSuggestions = Array.from(uniqueSuggestionsMap.values())
      .sort((a, b) => a.rank - b.rank) // Sort by rank (1=best, 2=second, etc.)
      .map(s => ({ volunteer: s.volunteer, reasoning: s.reasoning, aiVolunteerNumber: s.aiVolunteerNumber }));

    // NEW STEP: Replace all volunteer numbers with names in reasoning
    finalParsedSuggestions.forEach(suggestion => {
      let currentReasoning = suggestion.reasoning;
      volunteers.forEach((v, index) => { // Iterate through all original available volunteers
        const volunteerNumberInAiResponse = index + 1; // AI's number for this volunteer
        const regex = new RegExp(`מתנדב #${volunteerNumberInAiResponse}`, 'g');
        // Ensure fullName is not null/undefined for replacement
        const replacementName = v.fullName || ''; 
        currentReasoning = currentReasoning.replace(regex, replacementName);
      });
      suggestion.reasoning = currentReasoning; // Update the reasoning
    });

    return finalParsedSuggestions.slice(0, 3);
  };

  const retryFetch = () => {
    setError(null);
    fetchAISuggestions();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      {!request || !request.requesterInfo ? (
        <div className="p-6 max-w-3xl mx-auto bg-white rounded-lg">
          <p className="text-center text-gray-600">ממתין לפרטי בקשה...</p>
          <div className="mt-4 flex justify-end">
            <Button variant="outline" onClick={onClose}>סגור</Button>
          </div>
        </div>
      ) : (
        <div className="p-6 max-w-3xl mx-auto bg-white rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-orange-800">
              הצעות התאמה חכמות - Groq AI
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
              <p className="mt-4 text-orange-600">מנתח נתונים ומחפש התאמות אופטימליות...</p>
              <p className="text-sm text-gray-500 mt-2">משתמש ב-Groq Mixtral AI</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
              <p className="text-red-800 font-semibold">שגיאה</p>
              <p className="text-red-700">{error}</p>
              <Button
                variant="outline"
                onClick={retryFetch}
                className="mt-3 border-red-300 text-red-700 hover:bg-red-100"
              >
                נסה שוב
              </Button>
            </div>
          )}

          {!loading && !error && parsedSuggestions.length > 0 && (
            <div className="space-y-4">
              {/* Request Summary */}
              {request && request.requesterInfo && (
              <div className="bg-orange-50 p-4 rounded border border-orange-200">
                <h3 className="font-semibold mb-2 text-orange-800">סיכום הבקשה:</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p><strong>גיל הפונה:</strong> {request.requesterInfo?.age}</p>
                  <p><strong>מגדר:</strong> {request.requesterInfo?.gender}</p>
                  <p className="col-span-2"><strong>סיבת פנייה:</strong> {request.requesterInfo?.reason}</p>
                  <p className="col-span-2"><strong>תיאור:</strong> {request.messageRequest}</p>
                </div>
              </div>
              )}
              <h3 className="font-semibold text-orange-700">המלצות AI:</h3>

              {parsedSuggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-4 ${
                    index === 0 ? 'bg-green-50 border-green-300' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`font-semibold ${
                          index === 0 ? 'text-green-700' : 'text-orange-800'
                        }`}>
                          {index === 0 ? '🏆 המלצה מובילה' : `המלצה #${index + 1}`}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                        <p><strong>שם:</strong> {suggestion.volunteer.fullName || 'מתנדב לא ידוע'}</p>
                        <p><strong>גיל:</strong> {suggestion.volunteer.age}</p>
                        <p><strong>מקצוע:</strong> {suggestion.volunteer.profession}</p>
                        <p><strong>ניסיון:</strong> {suggestion.volunteer.experience}</p>
                        <p className="col-span-2">
                          <strong>התאמות פעילות:</strong> {suggestion.volunteer.activeMatchIds?.length || 0}
                        </p>
                      </div>

                      {suggestion.reasoning && (
                        <div className="mt-2 p-3 bg-white rounded border border-gray-200">
                          <p className="text-sm font-semibold text-gray-700 mb-1">נימוק AI:</p>
                          <p className="text-sm text-gray-600">{suggestion.reasoning}</p>
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={() => {
                        onSelectVolunteer(suggestion.volunteer.id);
                        onClose();
                      }}
                      className={`ml-4 ${
                        index === 0
                          ? 'bg-green-600 hover:bg-green-700'
                          : 'bg-orange-600 hover:bg-orange-700'
                      } text-white`}
                    >
                      בחר
                    </Button>
                  </div>
                </div>
              ))}

              {/* Raw AI Response (collapsible) */}
              <details className="mt-6 text-sm text-gray-600">
                <summary className="cursor-pointer font-semibold hover:text-gray-800">
                  הצג תשובה גולמית מ-AI
                </summary>
                <pre className="mt-2 whitespace-pre-wrap bg-gray-100 p-3 rounded text-xs">
                  {suggestions}
                </pre>
              </details>
            </div>
          )}

          {!loading && !error && parsedSuggestions.length === 0 && suggestions && (
            <div className="text-center py-8">
              <p className="text-orange-600">לא הצלחנו לזהות המלצות ברורות.</p>
              <Button onClick={retryFetch} className="mt-4">
                נסה שוב
              </Button>
            </div>
          )}
          
          <div className="mt-6 flex justify-between items-center border-t pt-4">
            <div className="text-xs text-gray-500">
              Powered by Groq AI (Mixtral 8x7B)
            </div>
            <Button variant="outline" onClick={onClose}>
              סגור
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
