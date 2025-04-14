// VespaReportEnhancer.js
// This script adds student profile information to the individual VESPA report view

// Global configuration variable that will be set by the loader
let VESPA_REPORT_CONFIG = null;

// Main initialization function called by the loader
function initializeVespaReportEnhancer() {
  console.log("[VESPA Report Enhancer] Initializing...");
  
  if (!VESPA_REPORT_CONFIG) {
    console.error("[VESPA Report Enhancer] No configuration found!");
    return;
  }

  // Start observer to detect when individual student reports are shown
  setupReportObserver();
  
  // Also listen for Knack view render events as backup detection method
  $(document).on('knack-view-render.view_2776', function(event, view) {
    console.log("[VESPA Report Enhancer] Report view rendered");
    setTimeout(checkForIndividualReport, 500); // Small delay to let the Vue app render
  });
}

// Set up observer to detect changes in the report container
function setupReportObserver() {
  // Target the container where reports appear
  const targetNode = document.querySelector('#view_2776 .kn-rich_text__content');
  
  if (!targetNode) {
    console.log("[VESPA Report Enhancer] Target container not found, will retry in 1 second");
    setTimeout(setupReportObserver, 1000);
    return;
  }
  
  console.log("[VESPA Report Enhancer] Setting up observer on report container");
  
  // Create observer instance
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      // Only proceed if DOM nodes were added or removed
      if (mutation.type === 'childList') {
        checkForIndividualReport();
      }
    });
  });
  
  // Configuration of the observer
  const config = { childList: true, subtree: true };
  
  // Start observing
  observer.observe(targetNode, { childList: true, subtree: true });
  console.log("[VESPA Report Enhancer] Observer set up successfully");
}

// Check if we're viewing an individual report
function checkForIndividualReport() {
  // Look for elements that indicate an individual report view
  const reportContainer = document.querySelector('#studentReports [data-v-7afa4eb2]');
  const backButton = document.querySelector('#studentReports button.p-button-text');
  
  if (reportContainer && backButton) {
    // We're in individual report view
    console.log("[VESPA Report Enhancer] Individual report detected");
    extractStudentInfoAndEnhance();
  } else {
    // We're in group report view
    console.log("[VESPA Report Enhancer] Group view or no report detected");
    clearProfileView();
  }
}

// Clear the profile view when not showing individual report
function clearProfileView() {
  const profileContainer = document.querySelector('#view_3015 .kn-rich_text__content');
  if (profileContainer) {
    profileContainer.innerHTML = '';
  }
}

// Extract student info from the report and enhance with profile
function extractStudentInfoAndEnhance() {
  // Look for student name in the report
  const studentNameElement = document.querySelector('#report-container .student-name'); 
  
  // If element doesn't exist yet, the specific selector may be different
  // We need to find the actual element showing student name in the report UI
  if (!studentNameElement) {
    // Try a more generic approach to find student name in visible text
    const allTextElements = document.querySelectorAll('#studentReports h1, #studentReports h2, #studentReports h3, #studentReports p');
    
    let studentName = null;
    for (const element of allTextElements) {
      const text = element.textContent;
      // Look for patterns like "Student: Name" or just a name that looks like a full name
      if (text.includes('Student:')) {
        studentName = text.split('Student:')[1].trim();
        break;
      }
      // This is a fallback - might need adjustment based on actual text patterns
      if (/^[A-Z][a-z]+ [A-Z][a-z]+$/.test(text.trim())) {
        studentName = text.trim();
        break;
      }
    }
    
    if (!studentName) {
      console.error("[VESPA Report Enhancer] Could not determine student name");
      return;
    }
    
    fetchStudentProfileByName(studentName);
  } else {
    // If we found the element, extract the name
    const studentName = studentNameElement.textContent.replace('Student:', '').trim();
    fetchStudentProfileByName(studentName);
  }
}

// Fetch student profile by name
async function fetchStudentProfileByName(studentName) {
  console.log(`[VESPA Report Enhancer] Fetching profile for student: ${studentName}`);
  
  try {
    // First find the student record to get the user ID
    const student = await findStudentRecord(studentName);
    
    if (!student) {
      console.error(`[VESPA Report Enhancer] No student record found for: ${studentName}`);
      return;
    }
    
    // Now fetch the profile data
    const profileData = await getUserProfileRecord(student.id);
    
    if (profileData) {
      renderProfileSection(profileData);
    } else {
      console.error(`[VESPA Report Enhancer] No profile data found for student: ${studentName}`);
    }
  } catch (error) {
    console.error(`[VESPA Report Enhancer] Error fetching profile: ${error.message}`);
  }
}

// Find a student record by name
async function findStudentRecord(name) {
  const headers = getKnackHeaders();
  
  // API URL for the Student object (assuming object_6)
  const apiUrl = `https://api.knack.com/v1/objects/object_6/records?filters=${encodeURIComponent(JSON.stringify([{
    "field":"field_90", // Assuming field_90 is Name
    "operator":"is",
    "value": name
  }]))}`;
  
  try {
    const response = await fetch(apiUrl, { headers });
    const data = await response.json();
    
    if (data.records && data.records.length > 0) {
      return data.records[0];
    }
    return null;
  } catch (error) {
    console.error(`[VESPA Report Enhancer] Error finding student record: ${error.message}`);
    return null;
  }
}

// Get Knack API headers
function getKnackHeaders() {
  return {
    'X-Knack-Application-Id': VESPA_REPORT_CONFIG.knackAppId,
    'X-Knack-REST-API-Key': VESPA_REPORT_CONFIG.knackApiKey,
    'Content-Type': 'application/json'
  };
}

// Get user profile record 
async function getUserProfileRecord(studentId) {
  const headers = getKnackHeaders();
  
  // API URL for the Homepage profile object (object_112)
  const apiUrl = `https://api.knack.com/v1/objects/object_112/records?filters=${encodeURIComponent(JSON.stringify([{
    "field":"field_70", // Connection field to Student
    "operator":"is",
    "value": studentId
  }]))}`;
  
  try {
    const response = await fetch(apiUrl, { headers });
    const data = await response.json();
    
    if (data.records && data.records.length > 0) {
      return data.records[0];
    }
    return null;
  } catch (error) {
    console.error(`[VESPA Report Enhancer] Error getting profile record: ${error.message}`);
    return null;
  }
}

// Render profile section (adapted from Homepage.js)
function renderProfileSection(profileData) {
  if (!profileData) return;
  
  // Target our placeholder view
  const targetElement = document.querySelector('#view_3015 .kn-rich_text__content');
  if (!targetElement) {
    console.error("[VESPA Report Enhancer] Target element not found");
    return;
  }
  
  // Extract profile information
  const name = profileData.field_90_raw?.identifier || "Unknown Name";
  const tutorGroup = profileData.field_92 || "Unknown Group";
  const yearGroup = profileData.field_91 || "Unknown Year";
  const attendance = profileData.field_96 || "N/A";
  
  // Create Profile HTML
  const html = `
    <div class="student-profile">
      <h2>${name}</h2>
      <div class="profile-details">
        <div class="detail-item">
          <strong>Year Group:</strong> ${yearGroup}
        </div>
        <div class="detail-item">
          <strong>Tutor Group:</strong> ${tutorGroup}
        </div>
        <div class="detail-item">
          <strong>Attendance:</strong> ${attendance}%
        </div>
      </div>
      <hr>
    </div>
  `;
  
  // Insert into the view
  targetElement.innerHTML = html;
  
  // Add some basic styling
  const style = document.createElement('style');
  style.textContent = `
    .student-profile {
      padding: 15px;
      margin-bottom: 20px;
      background-color: #f9f9f9;
      border-radius: 5px;
      border-left: 4px solid #4CAF50;
    }
    .profile-details {
      display: flex;
      flex-wrap: wrap;
      gap: 15px;
      margin-top: 10px;
    }
    .detail-item {
      flex: 1;
      min-width: 150px;
    }
  `;
  document.head.appendChild(style);
}
