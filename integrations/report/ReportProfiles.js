// ReportProfiles.js - Student Profile Integration for VESPA Reports
// This script displays student profile data above individual VESPA reports
(function() {
  // Constants
  const KNACK_API_URL = 'https://api.knack.com/v1';
  const HOMEPAGE_OBJECT = 'object_112'; // User Profile object for homepage
  const DEBUG_MODE = true; // Enable console logging
  
  // Field mappings for the user profile object (copied from Homepage.js)
  const FIELD_MAPPING = {
    userId: 'field_3064',         // User ID
    userConnection: 'field_3070',  // User Account connection
    vespaCustomer: 'field_3069',   // VESPA Customer (User School)
    studentName: 'field_3066',     // Student Name
    tutorConnection: 'field_3071', // Student Tutors
    staffAdminConnection: 'field_3072', // Staff Admins
    attendance: 'field_3076',      // Attendance
    tutorGroup: 'field_3077',      // Tutor Group
    yearGroup: 'field_3078',       // Year Group
    numLogins: 'field_3079',       // NumLogins
    upn: 'field_3136',            // Unique Pupil Number (UPN)
    // Subject fields
    sub1: 'field_3080',
    sub2: 'field_3081',
    sub3: 'field_3082',
    sub4: 'field_3083',
    sub5: 'field_3084',
    sub6: 'field_3085',
    sub7: 'field_3086',
    sub8: 'field_3087',
    sub9: 'field_3088',
    sub10: 'field_3089',
    sub11: 'field_3090',
    sub12: 'field_3091',
    sub13: 'field_3092',
    sub14: 'field_3093',
    sub15: 'field_3094'
  };

  // Store state
  let currentStudentName = null;
  let profileObserver = null;
  let reportObserver = null;
  
  // Main initialization function (called by the loader)
  window.initializeReportProfiles = function() {
    debugLog("Initializing ReportProfiles integration...");
    
    // Add CSS styles
    addStyles();
    
    // Setup observers
    setupObservers();
  };
  
  // Debug logging helper (copied from Homepage.js)
  function debugLog(title, data) {
    if (!DEBUG_MODE) return;
    
    console.log(`%c[ReportProfiles] ${title}`, 'color: #00e5db; font-weight: bold; font-size: 12px;');
    try {
      if (data !== undefined) {
        console.log(JSON.parse(JSON.stringify(data, null, 2)));
      }
    } catch (e) {
      console.log("Data could not be fully serialized for logging:", data);
    }
    return data;
  }
  
  function setupObservers() {
    // Set up observer for the report container
    const reportContainer = document.querySelector('#view_2776 .kn-rich_text__content');
    if (reportContainer) {
      reportObserver = new MutationObserver(handleReportChanges);
      reportObserver.observe(reportContainer, {
        childList: true,
        subtree: true
      });
      debugLog("Report observer set up");
      
      // Check immediately in case the report is already showing
      setTimeout(checkForIndividualReport, 1000);
    } else {
      debugLog("Report container not found", { selector: '#view_2776 .kn-rich_text__content' });
    }
  }
  
  function checkForIndividualReport() {
    // This checks if an individual report is already displayed when the script loads
    const studentNameElement = document.querySelector('#student-name p');
    if (studentNameElement) {
      handleReportChanges([{ type: 'childList', target: document.querySelector('#studentReports') }]);
    }
  }
  
  function handleReportChanges(mutations) {
    // We need to determine if we're looking at a group view or individual report
    const groupViewTable = document.querySelector('#studentReports .p-datatable');
    const studentNameElement = document.querySelector('#student-name p');
    
    if (!groupViewTable && studentNameElement) {
      // Individual report is showing
      const fullText = studentNameElement.textContent || '';
      if (fullText.includes('STUDENT:')) {
        const studentName = fullText.replace('STUDENT:', '').trim();
        
        // Only process if this is a different student than currently showing
        if (studentName !== currentStudentName) {
          currentStudentName = studentName;
          debugLog(`Student report detected: ${studentName}`);
          processStudentProfile(studentName);
        }
      }
    } else {
      // Likely back to group view or no report showing
      if (currentStudentName) {
        debugLog("Returning to group view or no report showing");
        currentStudentName = null;
        clearProfileView();
      }
    }
  }
  
  function clearProfileView() {
    const profileContainer = document.querySelector('#view_3015 .kn-rich_text__content');
    if (profileContainer) {
      profileContainer.innerHTML = '';
      debugLog("Profile view cleared");
    }
  }
  
  async function processStudentProfile(studentName) {
    try {
      // Step 1: Find student record by name to get email
      debugLog(`Looking up student record for: ${studentName}`);
      const studentRecord = await findStudentRecordByName(studentName);
      
      if (!studentRecord) {
        console.error(`[ReportProfiles] Could not find student record for: ${studentName}`);
        return;
      }
      
      // Step 2: Get student email
      const studentEmail = studentRecord.field_91;
      debugLog(`Found student email: ${studentEmail}`);
      
      // Step 3: Get profile data using the email
      const profileRecord = await findProfileUsingEmail(studentEmail);
      
      if (profileRecord) {
        // Step 4: Render the profile
        renderStudentProfile(profileRecord);
      } else {
        debugLog(`No profile found for student: ${studentName} (${studentEmail})`);
      }
    } catch (error) {
      console.error('[ReportProfiles] Error processing student profile:', error);
    }
  }
  
  // Helper to get standard Knack API headers
  function getKnackHeaders() {
    // Reading knackAppId and knackApiKey from config
    const config = window.REPORT_PROFILES_CONFIG;
    
    // Fallback to using Knack's global application ID if not in config
    const knackAppId = (config && config.knackAppId) ? config.knackAppId : Knack.application_id;
    // Use our known API key if not in config
    const knackApiKey = (config && config.knackApiKey) ? config.knackApiKey : '8f733aa5-dd35-4464-8348-64824d1f5f0d';
    
    if (typeof Knack === 'undefined' || typeof Knack.getUserToken !== 'function') {
      console.error("[ReportProfiles] Knack object or getUserToken function not available.");
      throw new Error("Knack authentication context not available.");
    }
    
    const token = Knack.getUserToken();
    if (!token) {
      console.warn("[ReportProfiles] Knack user token is null or undefined. API calls may fail.");
    }
    
    const headers = {
      'X-Knack-Application-Id': knackAppId,
      'X-Knack-REST-API-Key': knackApiKey,
      'Authorization': token || '',
      'Content-Type': 'application/json'
    };
    
    debugLog("Using API headers:", headers);
    
    return headers;
  }
  
  // Find a student record by name
  async function findStudentRecordByName(studentName) {
    if (!studentName) return null;
    
    // Create filters to search by name (field_47 is the name field in object_6)
    const filters = encodeURIComponent(JSON.stringify({
      match: 'or',
      rules: [
        { field: 'field_47', operator: 'is', value: studentName },
        { field: 'field_47', operator: 'contains', value: studentName }
      ]
    }));
    
    try {
      const response = await $.ajax({
        url: `${KNACK_API_URL}/objects/object_6/records?filters=${filters}`,
        type: 'GET',
        headers: getKnackHeaders(),
        data: { format: 'raw' }
      });
      
      if (response && response.records && response.records.length > 0) {
        debugLog(`Found student record for ${studentName}:`, response.records[0]);
        return response.records[0];
      }
      
      debugLog(`No student record found for ${studentName}`);
      return null;
    } catch (error) {
      console.error(`[ReportProfiles] Error finding student record for ${studentName}:`, error);
      return null;
    }
  }
  
  // Find a profile record using the student's email
  async function findProfileUsingEmail(email) {
    if (!email) return null;
    
    try {
      // First try to find the profile directly using the email field (field_91)
      const profileFilters = encodeURIComponent(JSON.stringify({
        match: 'and',
        rules: [
          { field: 'field_3066', operator: 'contains', value: email }
        ]
      }));
      
      const response = await $.ajax({
        url: `${KNACK_API_URL}/objects/${HOMEPAGE_OBJECT}/records?filters=${profileFilters}`,
        type: 'GET',
        headers: getKnackHeaders(),
        data: { format: 'raw' }
      });
      
      if (response && response.records && response.records.length > 0) {
        debugLog(`Found profile record using email ${email}:`, response.records[0]);
        return response.records[0];
      }
      
      // If not found, use the email to find the student record first, then look for profile using student ID
      debugLog(`No profile found directly. Trying alternative lookup approaches for ${email}.`);
      
      // Find the student record by email
      const studentFilters = encodeURIComponent(JSON.stringify({
        match: 'or',
        rules: [
          { field: 'field_91', operator: 'is', value: email },
          { field: 'field_70', operator: 'is', value: email }
        ]
      }));
      
      const studentResponse = await $.ajax({
        url: `${KNACK_API_URL}/objects/object_6/records?filters=${studentFilters}`,
        type: 'GET',
        headers: getKnackHeaders(),
        data: { format: 'raw' }
      });
      
      if (studentResponse && studentResponse.records && studentResponse.records.length > 0) {
        const studentRecord = studentResponse.records[0];
        debugLog(`Found student record by email:`, studentRecord);
        
        // Try to find profile using student name
        if (studentRecord.field_47) {
          const nameFilters = encodeURIComponent(JSON.stringify({
            match: 'and',
            rules: [
              { field: 'field_3066', operator: 'is', value: studentRecord.field_47 }
            ]
          }));
          
          const nameResponse = await $.ajax({
            url: `${KNACK_API_URL}/objects/${HOMEPAGE_OBJECT}/records?filters=${nameFilters}`,
            type: 'GET',
            headers: getKnackHeaders(),
            data: { format: 'raw' }
          });
          
          if (nameResponse && nameResponse.records && nameResponse.records.length > 0) {
            debugLog(`Found profile record using student name:`, nameResponse.records[0]);
            return nameResponse.records[0];
          }
        }
      }
      
      debugLog(`No profile record found for ${email} after all attempts.`);
      return null;
    } catch (error) {
      console.error(`[ReportProfiles] Error finding profile for ${email}:`, error);
      return null;
    }
  }
  
  // Safely remove HTML from strings
  function sanitizeField(value) {
    if (value === null || value === undefined) return "";
    const strValue = String(value);
    let sanitized = strValue.replace(/<[^>]*?>/g, "");
    sanitized = sanitized.replace(/[*_~`#]/g, "");
    sanitized = sanitized
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&nbsp;/g, " ");
    return sanitized.trim();
  }
  
  // Safe JSON parsing function
  function safeParseJSON(jsonString, defaultVal = null) {
    if (!jsonString) return defaultVal;
    try {
      // If it's already an object, return it directly
      if (typeof jsonString === 'object' && jsonString !== null) return jsonString;
      return JSON.parse(jsonString);
    } catch (error) {
      console.warn("[ReportProfiles] JSON parse failed:", error, "String:", String(jsonString).substring(0, 100));
      try {
        const cleanedString = String(jsonString).trim().replace(/^\uFEFF/, '');
        const recovered = cleanedString
          .replace(/\\"/g, '"')
          .replace(/,\s*([}\]])/g, '$1');
        const result = JSON.parse(recovered);
        console.log("[ReportProfiles] JSON recovery successful.");
        return result;
      } catch (secondError) {
        console.error("[ReportProfiles] JSON recovery failed:", secondError);
        return defaultVal;
      }
    }
  }
  
  function renderStudentProfile(profileData) {
    if (!profileData) {
      debugLog("Cannot render profile: No profile data provided");
      return;
    }
    
    const container = document.querySelector('#view_3015 .kn-rich_text__content');
    if (!container) {
      debugLog("Cannot render profile: Container element not found", { selector: '#view_3015 .kn-rich_text__content' });
      return;
    }
    
    // Extract profile data
    const name = sanitizeField(profileData[FIELD_MAPPING.studentName]) || 'Student';
    
    // Handle school field (connection field)
    let schoolDisplay = 'N/A';
    if (profileData[FIELD_MAPPING.vespaCustomer]) {
      const schoolField = profileData[FIELD_MAPPING.vespaCustomer];
      
      if (typeof schoolField === 'object' && schoolField !== null) {
        // Extract school name from connection field
        if (schoolField.field_122_raw) {
          schoolDisplay = sanitizeField(schoolField.field_122_raw.identifier || 
                        schoolField.field_122_raw.name || 'VESPA ACADEMY');
        } else if (schoolField.text) {
          schoolDisplay = sanitizeField(schoolField.text);
        } else if (schoolField.identifier) {
          schoolDisplay = sanitizeField(schoolField.identifier);
        } else if (schoolField.name) {
          schoolDisplay = sanitizeField(schoolField.name);
        } else {
          schoolDisplay = "VESPA ACADEMY";
        }
      } else if (typeof schoolField === 'string') {
        schoolDisplay = sanitizeField(schoolField);
      }
    }
    
    const tutorGroup = sanitizeField(profileData[FIELD_MAPPING.tutorGroup]);
    const yearGroup = sanitizeField(profileData[FIELD_MAPPING.yearGroup]);
    const attendance = sanitizeField(profileData[FIELD_MAPPING.attendance]);
    
    // Parse subject data
    const subjectData = [];
    for (let i = 1; i <= 15; i++) {
      const fieldKey = `sub${i}`;
      const fieldId = FIELD_MAPPING[fieldKey];
      
      if (profileData[fieldId]) {
        try {
          const subject = safeParseJSON(profileData[fieldId]);
          if (subject && subject.subject) {
            subjectData.push(subject);
          }
        } catch (e) {
          console.warn(`[ReportProfiles] Error parsing subject data for ${fieldKey}:`, e);
        }
      }
    }
    
    // Helper function to compare grades and return appropriate CSS class
    function getGradeColorClass(grade, minExpected) {
      if (!grade || !minExpected || grade === 'N/A' || minExpected === 'N/A') {
        return '';
      }
      
      if (/^[A-E][*+-]?$/.test(grade) && /^[A-E][*+-]?$/.test(minExpected)) {
        const gradeValue = grade.charAt(0);
        const minExpectedValue = minExpected.charAt(0);
        
        if (gradeValue < minExpectedValue) {
          return 'grade-exceeding-high';
        } else if (gradeValue === minExpectedValue) {
          if (grade.includes('+') || minExpected.includes('-')) {
            return 'grade-exceeding';
          } else if (grade.includes('-') || minExpected.includes('+')) {
            return 'grade-below';
          }
          return 'grade-matching';
        } else {
          const diff = gradeValue.charCodeAt(0) - minExpectedValue.charCodeAt(0);
          return diff > 1 ? 'grade-below-far' : 'grade-below';
        }
      }
      
      const numGrade = parseFloat(grade);
      const numMinExpected = parseFloat(minExpected);
      
      if (!isNaN(numGrade) && !isNaN(numMinExpected)) {
        const diff = numGrade - numMinExpected;
        
        if (diff > 1) {
          return 'grade-exceeding-high';
        } else if (diff > 0) {
          return 'grade-exceeding';
        } else if (diff === 0) {
          return 'grade-matching';
        } else if (diff > -2) {
          return 'grade-below';
        } else {
          return 'grade-below-far';
        }
      }
      
      return grade >= minExpected ? 'grade-exceeding' : 'grade-below';
    }
    
    // Render subjects
    let subjectsHTML = '';
    if (subjectData && subjectData.length > 0) {
      subjectData.forEach(subject => {
        const currentGradeClass = getGradeColorClass(
          subject.currentGrade, 
          subject.minimumExpectedGrade
        );
        
        const targetGradeClass = getGradeColorClass(
          subject.targetGrade,
          subject.minimumExpectedGrade
        );
        
        subjectsHTML += `
          <div class="subject-card">
            <div class="subject-name">${sanitizeField(subject.subject || '')}</div>
            <div class="subject-meta">
              ${subject.examType ? sanitizeField(subject.examType) : 'N/A'}
              ${subject.examBoard ? ` • ${sanitizeField(subject.examBoard)}` : ''}
            </div>
            <div class="grades-container">
              <div class="grade-item">
                <div class="grade-label">MEG</div>
                <div class="grade-value grade-meg">${sanitizeField(subject.minimumExpectedGrade || 'N/A')}</div>
              </div>
              <div class="grade-item">
                <div class="grade-label">Current</div>
                <div class="grade-value ${currentGradeClass}">${sanitizeField(subject.currentGrade || 'N/A')}</div>
              </div>
              <div class="grade-item">
                <div class="grade-label">Target</div>
                <div class="grade-value ${targetGradeClass}">${sanitizeField(subject.targetGrade || 'N/A')}</div>
              </div>
            </div>
          </div>
        `;
      });
    } else {
      subjectsHTML = '<div class="no-subjects">No subjects available</div>';
    }
    
    // Create the profile HTML
    const profileHTML = `
      <div id="vespa-profile">
        <section class="vespa-section profile-section">
          <h2 class="vespa-section-title">Student Profile</h2>
          <div class="profile-info">
            <div class="profile-details">
              <div class="profile-name">${name}</div>
              
              <div class="profile-item">
                <span class="profile-label">School:</span>
                <span class="profile-value">${schoolDisplay}</span>
              </div>
              
            ${yearGroup ? `
            <div class="profile-item">
              <span class="profile-label">Year Group:</span>
              <span class="profile-value">${yearGroup}</span>
            </div>
            ` : ''}
            
            ${tutorGroup ? `
            <div class="profile-item">
              <span class="profile-label">Tutor Group:</span>
              <span class="profile-value">${tutorGroup}</span>
            </div>
            ` : ''}
            
            ${attendance ? `
            <div class="profile-item">
              <span class="profile-label">Attendance:</span>
              <span class="profile-value">${attendance}</span>
            </div>
            ` : ''}
            </div>
            
            <div class="subjects-container">
              <div class="subjects-grid">
                ${subjectsHTML}
              </div>
            </div>
          </div>
        </section>
      </div>
    `;
    
    // Clear container and add content
    container.innerHTML = profileHTML;
    debugLog("Profile rendered successfully", { name, subjects: subjectData.length });
  }
  
  function addStyles() {
    // Create the style element if it doesn't exist
    let styleElement = document.getElementById('report-profiles-styles');
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'report-profiles-styles';
      document.head.appendChild(styleElement);
    }
    
    // Add the CSS
    styleElement.textContent = `
      /* Main Container - VESPA Theme */
      #vespa-profile {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        max-width: 1200px;
        margin: 0 auto 20px auto;
        padding: 16px;
        color: #ffffff;
        background-color: #23356f;
        line-height: 1.4;
        overflow-x: hidden;
        border: 3px solid #2a3c7a;
        border-radius: 10px;
      }
      
      /* Animation Keyframes */
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      @keyframes pulseGlow {
        0% { box-shadow: 0 4px 12px rgba(0, 229, 219, 0.1); }
        50% { box-shadow: 0 4px 18px rgba(0, 229, 219, 0.25); }
        100% { box-shadow: 0 4px 12px rgba(0, 229, 219, 0.1); }
      }
      
      /* Sections */
      #vespa-profile .vespa-section {
        background-color: #2a3c7a;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        padding: 16px;
        margin-bottom: 24px;
        animation: fadeIn 0.5s ease-out forwards;
        transition: transform 0.2s, box-shadow 0.2s;
        border: 2px solid #079baa;
      }
      
      #vespa-profile .vespa-section:hover {
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35);
      }
      
      #vespa-profile .vespa-section-title {
        color: #00e5db !important; /* Added !important to override any competing styles */
        font-size: 22px;
        font-weight: 600;
        margin-bottom: 16px;
        padding-bottom: 8px;
        border-bottom: 2px solid #079baa;
        position: relative;
        overflow: hidden;
      }
      
      /* Profile Section - more compact */
      #vespa-profile .profile-info {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }
      
      #vespa-profile .profile-details {
        flex: 1;
        min-width: 200px;
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        padding: 4px;
        background-color: #334285;
        border-radius: 8px;
        border: 1px solid rgba(7, 155, 170, 0.3);
      }
      
      #vespa-profile .profile-name {
        font-size: 22px;
        color: #00e5db;
        margin-bottom: 8px;
        font-weight: 700;
        padding: 4px 8px;
        border-bottom: 1px solid rgba(7, 155, 170, 0.3);
      }
      
      #vespa-profile .profile-item {
        margin-bottom: 3px;
        padding: 3px 8px;
        border-radius: 4px;
        transition: background-color 0.2s;
        display: flex;
        align-items: center;
      }
      
      #vespa-profile .profile-item:hover {
        background-color: #3a4b90;
      }
      
      #vespa-profile .profile-label {
        font-weight: 600;
        color: #00e5db;
        margin-right: 4px;
        min-width: 80px;
      }
      
      #vespa-profile .profile-value {
        color: #f0f0f0;
      }
      
      #vespa-profile .subjects-container {
        flex: 2;
        min-width: 280px;
      }
      
      #vespa-profile .subjects-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 12px;
      }
      
      #vespa-profile .subject-card {
        background-color: #334285;
        border-radius: 6px;
        padding: 8px;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
        transition: all 0.2s ease;
        border: 1px solid rgba(7, 155, 170, 0.3);
      }
      
      #vespa-profile .subject-card:hover {
        transform: translateY(-3px);
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
      }
      
      #vespa-profile .subject-name {
        font-weight: 600;
        color: #ffffff;
        margin-bottom: 4px;
        font-size: 0.95em;
      }
      
      #vespa-profile .subject-meta {
        font-size: 0.75em;
        color: #ffffff;
        margin-bottom: 3px;
      }
      
      #vespa-profile .grades-container {
        display: flex;
        justify-content: space-between;
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid #3d3d3d;
      }
      
      #vespa-profile .grade-item {
        text-align: center;
        flex: 1;
        padding: 4px;
        border-radius: 4px;
        transition: background-color 0.2s;
      }
      
      #vespa-profile .grade-label {
        font-size: 0.7em;
        color: #ffffff;
        margin-bottom: 3px;
      }
      
      #vespa-profile .grade-value {
        font-size: 1.1em;
        font-weight: 600;
        transition: transform 0.2s;
      }
      
      #vespa-profile .grade-meg {
        color: #00e5db;
      }
      
      /* Grade indicators */
      #vespa-profile .grade-exceeding {
        color: #4caf50;
      }
      
      #vespa-profile .grade-exceeding-high {
        color: #2e7d32;
      }
      
      #vespa-profile .grade-matching {
        color: #ff9800;
      }
      
      #vespa-profile .grade-below {
        color: #f44336;
      }
      
      #vespa-profile .grade-below-far {
        color: #b71c1c;
      }
      
      /* Responsive adjustments */
      @media (max-width: 992px) {
        #vespa-profile {
          padding: 12px;
        }
        
        #vespa-profile .vespa-section {
          padding: 14px;
        }
        
        #vespa-profile .subjects-grid {
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        }
      }
      
      @media (max-width: 768px) {
        #vespa-profile .profile-info {
          flex-direction: column;
        }
        
        #vespa-profile .subjects-grid {
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 10px;
        }
        
        #vespa-profile .vespa-section-title {
          font-size: 20px;
        }
      }
      
      @media (max-width: 480px) {
        #vespa-profile {
          padding: 10px;
        }
        
        #vespa-profile .vespa-section {
          padding: 12px;
          margin-bottom: 16px;
        }
        
        #vespa-profile .subjects-grid {
          grid-template-columns: 1fr;
        }
        
        #vespa-profile .profile-name {
          font-size: 22px;
        }
        
        #vespa-profile .grade-item {
          padding: 2px;
        }
        
        #vespa-profile .grade-value {
          font-size: 1em;
        }
      }
    `;
  }
})();
