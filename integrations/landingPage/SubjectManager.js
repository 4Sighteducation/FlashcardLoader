// Subject Manager - Helper script for adding/updating subjects in user profiles
// This is a standalone script for demonstration/reference purposes

/**
 * Function to add or update a subject in a user's profile
 * @param {string} userId - The user's ID
 * @param {string} recordId - The user profile record ID (object_112)
 * @param {object} subjectData - The subject data object
 * @param {number} subjectIndex - The subject slot (1-15) to use
 * @returns {Promise} - Promise that resolves with the update result
 */
async function addOrUpdateSubject(userId, recordId, subjectData, subjectIndex) {
  if (!userId || !recordId) {
    console.error("Missing required userId or recordId");
    return { success: false, error: "Missing required parameters" };
  }
  
  if (!subjectData || !subjectData.subject) {
    console.error("Subject data missing required 'subject' property");
    return { success: false, error: "Invalid subject data" };
  }
  
  // Ensure subjectIndex is within valid range (1-15)
  if (subjectIndex < 1 || subjectIndex > 15) {
    console.error("Invalid subject index. Must be between 1 and 15");
    return { success: false, error: "Invalid subject index" };
  }
  
  // Create a complete subject data object with all possible fields
  const completeSubjectData = {
    subject: subjectData.subject,
    examType: subjectData.examType || "",
    examBoard: subjectData.examBoard || "",
    minimumExpectedGrade: subjectData.minimumExpectedGrade || "",
    currentGrade: subjectData.currentGrade || "",
    targetGrade: subjectData.targetGrade || "",
    effortGrade: subjectData.effortGrade || "",
    behaviourGrade: subjectData.behaviourGrade || ""
  };
  
  // Convert to JSON string
  const subjectJson = JSON.stringify(completeSubjectData);
  
  // Determine the field ID to update based on the index
  const fieldId = `field_${3079 + subjectIndex}`; // field_3080 for index 1, field_3081 for index 2, etc.
  
  try {
    // Make the API call to update the subject field
    const response = await $.ajax({
      url: `https://api.knack.com/v1/objects/object_112/records/${recordId}`,
      type: 'PUT',
      headers: {
        'X-Knack-Application-Id': Knack.application_id,
        'X-Knack-REST-API-Key': '8f733aa5-dd35-4464-8348-64824d1f5f0d',
        'Authorization': Knack.getUserToken(),
        'Content-Type': 'application/json'
      },
      data: JSON.stringify({
        [fieldId]: subjectJson
      })
    });
    
    console.log(`Subject "${completeSubjectData.subject}" saved to slot ${subjectIndex}`);
    return { success: true, response };
  } catch (error) {
    console.error(`Error updating subject at index ${subjectIndex}:`, error);
    return { success: false, error };
  }
}

/**
 * Example usage:
 * 
 * addOrUpdateSubject('user123', 'record456', {
 *   subject: 'Mathematics',
 *   examType: 'GCSE',
 *   examBoard: 'AQA',
 *   minimumExpectedGrade: 'B',
 *   currentGrade: 'C'
 * }, 1);
 */

/**
 * Function to clear a subject slot
 * @param {string} recordId - The user profile record ID
 * @param {number} subjectIndex - The subject slot (1-15) to clear
 * @returns {Promise} - Promise that resolves with the update result
 */
async function clearSubject(recordId, subjectIndex) {
  if (!recordId) {
    console.error("Missing required recordId");
    return { success: false, error: "Missing record ID" };
  }
  
  // Ensure subjectIndex is within valid range (1-15)
  if (subjectIndex < 1 || subjectIndex > 15) {
    console.error("Invalid subject index. Must be between 1 and 15");
    return { success: false, error: "Invalid subject index" };
  }
  
  // Determine the field ID to update based on the index
  const fieldId = `field_${3079 + subjectIndex}`;
  
  try {
    // Make the API call to clear the subject field
    const response = await $.ajax({
      url: `https://api.knack.com/v1/objects/object_112/records/${recordId}`,
      type: 'PUT',
      headers: {
        'X-Knack-Application-Id': Knack.application_id,
        'X-Knack-REST-API-Key': '8f733aa5-dd35-4464-8348-64824d1f5f0d',
        'Authorization': Knack.getUserToken(),
        'Content-Type': 'application/json'
      },
      data: JSON.stringify({
        [fieldId]: null
      })
    });
    
    console.log(`Subject at slot ${subjectIndex} has been cleared`);
    return { success: true, response };
  } catch (error) {
    console.error(`Error clearing subject at index ${subjectIndex}:`, error);
    return { success: false, error };
  }
}

/**
 * Helper function to find available subject slots in a user profile
 * @param {object} userProfile - The user profile record
 * @returns {array} - Array of available slot indices (1-15)
 */
function findAvailableSubjectSlots(userProfile) {
  const availableSlots = [];
  
  for (let i = 1; i <= 15; i++) {
    const fieldId = `field_${3079 + i}`;
    if (!userProfile[fieldId]) {
      availableSlots.push(i);
    }
  }
  
  return availableSlots;
}

/**
 * Example of how to add multiple subjects
 * @param {string} recordId - The user profile record ID
 * @param {array} subjects - Array of subject data objects
 */
async function addMultipleSubjects(recordId, subjects) {
  if (!recordId || !subjects || !Array.isArray(subjects)) {
    console.error("Invalid parameters for adding multiple subjects");
    return { success: false };
  }
  
  // First, get the user profile to find available slots
  try {
    const profile = await $.ajax({
      url: `https://api.knack.com/v1/objects/object_112/records/${recordId}`,
      type: 'GET',
      headers: {
        'X-Knack-Application-Id': Knack.application_id,
        'X-Knack-REST-API-Key': '8f733aa5-dd35-4464-8348-64824d1f5f0d',
        'Authorization': Knack.getUserToken()
      }
    });
    
    const availableSlots = findAvailableSubjectSlots(profile);
    console.log(`Found ${availableSlots.length} available subject slots`);
    
    if (availableSlots.length < subjects.length) {
      console.warn(`Not enough available slots (${availableSlots.length}) for all subjects (${subjects.length})`);
    }
    
    const results = [];
    const userId = profile.field_3064; // Get user ID from profile
    
    // Add subjects using available slots
    for (let i = 0; i < subjects.length && i < availableSlots.length; i++) {
      const result = await addOrUpdateSubject(userId, recordId, subjects[i], availableSlots[i]);
      results.push({
        subject: subjects[i].subject,
        slot: availableSlots[i],
        success: result.success
      });
    }
    
    return { success: true, results };
  } catch (error) {
    console.error("Error adding multiple subjects:", error);
    return { success: false, error };
  }
}

// Example subject data
const exampleSubjects = [
  {
    subject: "Mathematics",
    examType: "GCSE",
    examBoard: "AQA",
    minimumExpectedGrade: "7",
    currentGrade: "6"
  },
  {
    subject: "English Literature",
    examType: "GCSE",
    examBoard: "Edexcel",
    minimumExpectedGrade: "8",
    currentGrade: "7"
  },
  {
    subject: "Physics",
    examType: "A-Level",
    examBoard: "OCR",
    minimumExpectedGrade: "B",
    currentGrade: "C"
  }
];

// To use this script, you would call:
// addMultipleSubjects('record_id_here', exampleSubjects);
