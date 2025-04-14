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

  // Get logged-in user information
  const loggedInUserId = Knack.getUserAttributes().id;
  const loggedInUserEmail = Knack.getUserAttributes().email;
  console.log(`[VESPA Report Enhancer] Logged in user: ${loggedInUserEmail} (${loggedInUserId})`);
  
  // Start observation of the report table and buttons
  setupReportObserver();
  
  // Also handle Knack view events
  $(document).on('knack-view-render.view_2776', function(event, view) {
    console.log("[VESPA Report Enhancer] Report view rendered");
    setTimeout(monitorReportButtons, 500);
  });
}

// Set up monitoring of the student reports table
function setupReportObserver() {
  console.log("[VESPA Report Enhancer] Setting up observers");
  
  // Initial check for the table
  monitorReportButtons();
  
  // Create MutationObserver to watch for changes
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function() {
      // When DOM changes, check if we need to monitor report buttons
      monitorReportButtons();
    });
  });
  
  // Start observing the document body for changes
  observer.observe(document.body, { 
    childList: true, 
    subtree: true 
  });
  
  console.log("[VESPA Report Enhancer] Observer setup complete");
}

// Monitor the report buttons to capture clicks
function monitorReportButtons() {
  const reportButtons = document.querySelectorAll('button.view-report-button');
  
  if (reportButtons.length > 0) {
    console.log(`[VESPA Report Enhancer] Found ${reportButtons.length} report buttons`);
    
    // Add click handlers to buttons if they don't already have them
    reportButtons.forEach(button => {
      if (!button.hasAttribute('data-vespa-enhanced')) {
        button.setAttribute('data-vespa-enhanced', 'true');
        
        button.addEventListener('click', function() {
          // Find the student name from the row
          const row = this.closest('tr');
          const nameCell = row.querySelector('td:first-child');
          const studentName = nameCell.textContent.trim();
          
          console.log(`[VESPA Report Enhancer] Report button clicked for: ${studentName}`);
          
          // Wait for the report to load, then enhance it
          setTimeout(() => {
            fetchAndShowStudentProfile(studentName);
          }, 1000);
        });
      }
    });
    
    // Also look for back button to clear profile when returning to list
    const backButton = document.querySelector('#studentReports button.p-button-text');
    if (backButton && !backButton.hasAttribute('data-vespa-enhanced')) {
      backButton.setAttribute('data-vespa-enhanced', 'true');
      backButton.addEventListener('click', function() {
        clearProfileView();
        console.log("[VESPA Report Enhancer] Back button clicked, cleared profile");
      });
    }
  }
}

// Clear the profile view
function clearProfileView() {
  const profileContainer = document.querySelector('#view_3015 .kn-rich_text__content');
  if (profileContainer) {
    profileContainer.innerHTML = '';
  }
}

// Fetch and show student profile based on name
async function fetchAndShowStudentProfile(studentName) {
  console.log(`[VESPA Report Enhancer] Fetching profile for: ${studentName}`);
  clearProfileView();
  
  try {
    // Find student record by name
    const studentRecord = await findStudentRecord(studentName);
    
    if (!studentRecord) {
      console.error(`[VESPA Report Enhancer] No student record found for: ${studentName}`);
      showErrorMessage(`Unable to find student record for ${studentName}`);
      return;
    }
    
    console.log(`[VESPA Report Enhancer] Found student record:`, studentRecord.id);
    
    // Fetch user profile data
    const profileData = await fetchUserProfileByStudentId(studentRecord.id);
    
    if (!profileData) {
      console.error(`[VESPA Report Enhancer] No profile data found for student: ${studentName}`);
      showErrorMessage(`No profile data found for ${studentName}`);
      return;
    }
    
    // Display the profile
    renderStudentProfile(profileData);
    
  } catch (error) {
    console.error(`[VESPA Report Enhancer] Error:`, error);
    showErrorMessage(`Error loading profile: ${error.message}`);
  }
}

// Find a student record by name
async function findStudentRecord(name) {
  // Use Knack's API to find the student record
  const headers = {
    'X-Knack-Application-Id': VESPA_REPORT_CONFIG.knackAppId,
    'X-Knack-REST-API-Key': VESPA_REPORT_CONFIG.knackApiKey,
    'Content-Type': 'application/json'
  };
  
  // API URL for the Student object (object_6)
  const apiUrl = `https://api.knack.com/v1/objects/object_6/records?filters=${encodeURIComponent(JSON.stringify({
    "match": "and",
    "rules": [
      {
        "field": "field_12", // Name field - adjust field number if needed
        "operator": "is",
        "value": name
      }
    ]
  }))}`;
  
  try {
    const response = await fetch(apiUrl, { headers });
    const data = await response.json();
    
    if (data.records && data.records.length > 0) {
      return data.records[0];
    }
    return null;
  } catch (error) {
    console.error(`[VESPA Report Enhancer] API error:`, error);
    return null;
  }
}

// Fetch user profile by student ID
async function fetchUserProfileByStudentId(studentId) {
  const headers = {
    'X-Knack-Application-Id': VESPA_REPORT_CONFIG.knackAppId,
    'X-Knack-REST-API-Key': VESPA_REPORT_CONFIG.knackApiKey,
    'Content-Type': 'application/json'
  };
  
  // API URL for the Profile object (object_112)
  const apiUrl = `https://api.knack.com/v1/objects/object_112/records?filters=${encodeURIComponent(JSON.stringify({
    "match": "and",
    "rules": [
      {
        "field": "field_70", // Connection to student - adjust field number if needed
        "operator": "is",
        "value": studentId
      }
    ]
  }))}`;
  
  try {
    const response = await fetch(apiUrl, { headers });
    const data = await response.json();
    
    if (data.records && data.records.length > 0) {
      return data.records[0];
    }
    return null;
  } catch (error) {
    console.error(`[VESPA Report Enhancer] API error:`, error);
    return null;
  }
}

// Show an error message in the profile view
function showErrorMessage(message) {
  const profileContainer = document.querySelector('#view_3015 .kn-rich_text__content');
  if (profileContainer) {
    profileContainer.innerHTML = `
      <div class="student-profile-error">
        <p>${message}</p>
      </div>
    `;
  }
}

// Render the student profile
function renderStudentProfile(profileData) {
  const profileContainer = document.querySelector('#view_3015 .kn-rich_text__content');
  if (!profileContainer) {
    console.error("[VESPA Report Enhancer] Profile container not found");
    return;
  }
  
  // Extract data from the profile record
  const name = profileData.field_12 || profileData.field_12_raw?.identifier || "Unknown Name";
  const email = profileData.field_13 || profileData.field_13_raw?.email || "";
  const yearGroup = profileData.field_91 || "N/A";
  const tutorGroup = profileData.field_92 || "N/A";
  const attendance = profileData.field_96 || "N/A";
  
  // Create the HTML
  const html = `
    <div class="student-profile">
      <h2>${name}</h2>
      <div class="profile-details">
        <div class="detail-item">
          <strong>Email:</strong> ${email}
        </div>
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
  
  // Add the HTML to the page
  profileContainer.innerHTML = html;
  
  // Add some styling
  const styleId = 'vespa-report-enhancer-style';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .student-profile {
        padding: 15px;
        margin-bottom: 15px;
        background-color: #f9f9f9;
        border-radius: 5px;
        border-left: 4px solid #4CAF50;
      }
      .student-profile h2 {
        margin-top: 0;
        color: #333;
      }
      .profile-details {
        display: flex;
        flex-wrap: wrap;
        gap: 15px;
      }
      .detail-item {
        flex: 1;
        min-width: 150px;
      }
      .student-profile-error {
        padding: 15px;
        margin-bottom: 15px;
        background-color: #fff0f0;
        border-radius: 5px;
        border-left: 4px solid #ff5252;
        color: #d32f2f;
      }
    `;
    document.head.appendChild(style);
  }
}
