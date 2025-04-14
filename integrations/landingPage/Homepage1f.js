// Homepage Integration Script for Knack - v1.0
// This script enables an enhanced homepage with user profile and app hubs
(function() {
  // --- Constants and Configuration ---
  const KNACK_API_URL = 'https://api.knack.com/v1';
  const HOMEPAGE_OBJECT = 'object_112'; // User Profile object for homepage
  const DEBUG_MODE = true; // Enable console logging

  // Field mappings for the user profile object
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

  // App hub configuration
  const APP_HUBS = {
    vespa: [
      {
        name: "VESPA Questionnaire",
        url: "https://vespaacademy.knack.com/vespa-academy#add-q/",
        icon: "https://www.vespa.academy/Icons/vespaq.png",
        description: "Complete the VESPA Questionnaire to measure your mindset in Vision, Effort, Systems, Practice and Attitude."
      },
      {
        name: "VESPA Coaching Report",
        url: "https://vespaacademy.knack.com/vespa-academy#vespa-results/",
        icon: "https://www.vespa.academy/Icons/coachingreport.png",
        description: "View and reflect on your VESPA Scores and personalized coaching feedback."
      },
      {
        name: "VESPA Activities",
        url: "https://vespaacademy.knack.com/vespa-academy#my-vespa/",
        icon: "https://www.vespa.academy/Icons/myvespa.png",
        description: "Access your personalized programme of ideas and activities based on your VESPA scores."
      }
    ],
    productivity: [
      {
        name: "Study Planner",
        url: "https://vespaacademy.knack.com/vespa-academy#studyplanner/",
        icon: "https://www.vespa.academy/Icons/studyplanner.png",
        description: "Plan and organize your study sessions with this interactive calendar tool."
      },
      {
        name: "Flashcards",
        url: "https://vespaacademy.knack.com/vespa-academy#flashcards/",
        icon: "https://www.vespa.academy/Icons/flashcards.png",
        description: "Create and study with digital flashcards using our spaced repetition system."
      },
      {
        name: "Taskboard",
        url: "https://vespaacademy.knack.com/vespa-academy#task-board/",
        icon: "https://www.vespa.academy/Icons/taskboard.png",
        description: "Manage your tasks and assignments with this visual organization tool."
      }
    ]
  };

  // --- Helper Functions ---
  // Debug logging helper
  function debugLog(title, data) {
    if (!DEBUG_MODE) return;
    
    console.log(`%c[Homepage] ${title}`, 'color: #00e5db; font-weight: bold; font-size: 12px;');
    try {
      if (data !== undefined) {
        console.log(JSON.parse(JSON.stringify(data, null, 2)));
      }
    } catch (e) {
      console.log("Data could not be fully serialized for logging:", data);
    }
    return data;
  }

  // Safe JSON parsing function
  function safeParseJSON(jsonString, defaultVal = null) {
    if (!jsonString) return defaultVal;
    try {
      // If it's already an object, return it directly
      if (typeof jsonString === 'object' && jsonString !== null) return jsonString;
      return JSON.parse(jsonString);
    } catch (error) {
      console.warn("[Homepage] JSON parse failed:", error, "String:", String(jsonString).substring(0, 100));
      try {
        const cleanedString = String(jsonString).trim().replace(/^\uFEFF/, '');
        const recovered = cleanedString
          .replace(/\\"/g, '"')
          .replace(/,\s*([}\]])/g, '$1');
        const result = JSON.parse(recovered);
        console.log("[Homepage] JSON recovery successful.");
        return result;
      } catch (secondError) {
        console.error("[Homepage] JSON recovery failed:", secondError);
        return defaultVal;
      }
    }
  }

  // Check if a string is a valid Knack record ID
  function isValidKnackId(id) {
    if (!id) return false;
    return typeof id === 'string' && /^[0-9a-f]{24}$/i.test(id);
  }

  // Extract a valid record ID from various formats
  function extractValidRecordId(value) {
    if (!value) return null;

    // If it's already an object
    if (typeof value === 'object') {
      let idToCheck = null;
      if (value.id) {
        idToCheck = value.id;
      } else if (value.identifier) {
        idToCheck = value.identifier;
      } else if (Array.isArray(value) && value.length === 1 && value[0].id) {
        idToCheck = value[0].id;
      } else if (Array.isArray(value) && value.length === 1 && typeof value[0] === 'string') {
        idToCheck = value[0];
      }

      if (idToCheck) {
        return isValidKnackId(idToCheck) ? idToCheck : null;
      }
    }

    // If it's a string
    if (typeof value === 'string') {
      return isValidKnackId(value) ? value : null;
    }

    return null;
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

  // Generic retry function for API calls
  function retryApiCall(apiCall, maxRetries = 3, delay = 1000) {
    return new Promise((resolve, reject) => {
      const attempt = (retryCount) => {
        apiCall()
          .then(resolve)
          .catch((error) => {
            const attemptsMade = retryCount + 1;
            console.warn(`API call failed (Attempt ${attemptsMade}/${maxRetries}):`, error.status, error.statusText, error.responseText);

            if (retryCount < maxRetries - 1) {
              const retryDelay = delay * Math.pow(2, retryCount);
              console.log(`Retrying API call in ${retryDelay}ms...`);
              setTimeout(() => attempt(retryCount + 1), retryDelay);
            } else {
              console.error(`API call failed after ${maxRetries} attempts.`);
              reject(error);
            }
          });
      };
      attempt(0);
    });
  }

  // Helper to get standard Knack API headers
  function getKnackHeaders() {
    // Reading knackAppId and knackApiKey from HOMEPAGE_CONFIG
    const config = window.HOMEPAGE_CONFIG;
    
    console.log("[Homepage] Config for headers:", JSON.stringify(config));
    
    // Fallback to using Knack's global application ID if not in config
    const knackAppId = (config && config.knackAppId) ? config.knackAppId : Knack.application_id;
    // Use our known API key if not in config
    const knackApiKey = (config && config.knackApiKey) ? config.knackApiKey : '8f733aa5-dd35-4464-8348-64824d1f5f0d';
    
    console.log(`[Homepage] Using AppID: ${knackAppId}`);
    
    if (typeof Knack === 'undefined' || typeof Knack.getUserToken !== 'function') {
      console.error("[Homepage] Knack object or getUserToken function not available.");
      throw new Error("Knack authentication context not available.");
    }
    
    const token = Knack.getUserToken();
    if (!token) {
      console.warn("[Homepage] Knack user token is null or undefined. API calls may fail.");
    }
    
    const headers = {
      'X-Knack-Application-Id': knackAppId,
      'X-Knack-REST-API-Key': knackApiKey,
      'Authorization': token || '',
      'Content-Type': 'application/json'
    };
    
    console.log("[Homepage] Headers being used:", JSON.stringify(headers));
    
    return headers;
  }

  // --- User Profile Data Management ---
  // Find or create the user profile record
  async function findOrCreateUserProfile(userId, userName, userEmail) {
    if (!userId) {
      console.error("[Homepage] Cannot find or create user profile: userId is missing.");
      return null;
    }
    
    debugLog(`Finding or creating user profile for user ID: ${userId}`, { userName, userEmail });
    
    // First, try to find an existing profile
    const findFilters = encodeURIComponent(JSON.stringify({
      match: 'and',
      rules: [
        { field: FIELD_MAPPING.userId, operator: 'is', value: userId }
      ]
    }));
    
    try {
      const response = await retryApiCall(() => {
        return new Promise((resolve, reject) => {
          $.ajax({
            url: `${KNACK_API_URL}/objects/${HOMEPAGE_OBJECT}/records?filters=${findFilters}`,
            type: 'GET',
            headers: getKnackHeaders(),
            data: { format: 'raw' },
            success: resolve,
            error: reject
          });
        });
      });
      
      if (response && response.records && response.records.length > 0) {
        debugLog(`Found existing user profile record: ${response.records[0].id}`, response.records[0]);
        
        // Update the login count
        if (response.records[0][FIELD_MAPPING.numLogins] !== undefined) {
          const currentLogins = parseInt(response.records[0][FIELD_MAPPING.numLogins], 10) || 0;
          updateUserProfileField(response.records[0].id, FIELD_MAPPING.numLogins, currentLogins + 1);
        }
        
        return response.records[0];
      }
      
      // No profile found, create a new one
      debugLog(`No user profile found, creating new record for user: ${userId}`);
      return await createUserProfile(userId, userName, userEmail);
    } catch (error) {
      console.error('[Homepage] Error finding or creating user profile:', error);
      return null;
    }
  }
  
  // Create a new user profile record
  async function createUserProfile(userId, userName, userEmail) {
    const user = window.currentKnackUser;
    if (!user) {
      console.error("[Homepage] Cannot create user profile: currentKnackUser is missing.");
      return null;
    }
    
    try {
      debugLog('Creating user profile with data:', { userId, userName, userEmail });
      
      // Look up additional data for connection fields
      const studentRecord = await findStudentRecord(userEmail);
      debugLog('Found student record for connections:', studentRecord);
      
      // Prepare basic profile data
      const data = {
        [FIELD_MAPPING.userId]: userId,
        [FIELD_MAPPING.studentName]: sanitizeField(userName || ''),
        [FIELD_MAPPING.numLogins]: 1, // First login
      };
      
      // Connection fields - User Account (direct user ID)
      data[FIELD_MAPPING.userConnection] = userId;
      
      // Connection fields from user object
      if (user.schoolId) {
        data[FIELD_MAPPING.vespaCustomer] = user.schoolId;
      }
      
      // Extract connection fields from student record if available
      if (studentRecord) {
        // VESPA Customer (school) if not already set
        if (!data[FIELD_MAPPING.vespaCustomer] && studentRecord.field_122_raw) {
          const schoolId = extractValidRecordId(studentRecord.field_122_raw);
          if (schoolId) {
            data[FIELD_MAPPING.vespaCustomer] = schoolId;
          }
        }
        
        // Tutor connections - handle multiple
        if (studentRecord.field_1682_raw && Array.isArray(studentRecord.field_1682_raw)) {
          const tutorIds = studentRecord.field_1682_raw
            .map(item => extractValidRecordId(item))
            .filter(id => id);
            
          if (tutorIds.length > 0) {
            data[FIELD_MAPPING.tutorConnection] = tutorIds.length === 1 ? tutorIds[0] : tutorIds;
          }
        }
        
        // Staff Admin connections - handle multiple
        if (studentRecord.field_190_raw && Array.isArray(studentRecord.field_190_raw)) {
          const staffAdminIds = studentRecord.field_190_raw
            .map(item => extractValidRecordId(item))
            .filter(id => id);
            
          if (staffAdminIds.length > 0) {
            data[FIELD_MAPPING.staffAdminConnection] = staffAdminIds.length === 1 ? staffAdminIds[0] : staffAdminIds;
          }
        }
        
        // Get Tutor Group if available
        if (studentRecord.field_34) {
          data[FIELD_MAPPING.tutorGroup] = sanitizeField(studentRecord.field_34);
        }
        
        // Get Year Group if available
        if (studentRecord.field_32) {
          data[FIELD_MAPPING.yearGroup] = sanitizeField(studentRecord.field_32);
        }
      }
      
      debugLog('Creating user profile with prepared data:', data);
      
      // Create the record
      const response = await retryApiCall(() => {
        return new Promise((resolve, reject) => {
          $.ajax({
            url: `${KNACK_API_URL}/objects/${HOMEPAGE_OBJECT}/records`,
            type: 'POST',
            headers: getKnackHeaders(),
            data: JSON.stringify(data),
            contentType: 'application/json',
            success: resolve,
            error: reject
          });
        });
      });
      
      if (response && response.id) {
        debugLog(`Created new user profile record: ${response.id}`, response);
        return response;
      } else {
        console.error('[Homepage] Failed to create user profile: No ID returned', response);
        return null;
      }
    } catch (error) {
      console.error('[Homepage] Error creating user profile:', error);
      return null;
    }
  }
  
  // Update a specific field in the user profile
  async function updateUserProfileField(recordId, fieldId, value) {
    if (!recordId || !fieldId) {
      console.error('[Homepage] Cannot update profile: Missing recordId or fieldId');
      return false;
    }
    
    try {
      const data = { [fieldId]: value };
      
      await retryApiCall(() => {
        return new Promise((resolve, reject) => {
          $.ajax({
            url: `${KNACK_API_URL}/objects/${HOMEPAGE_OBJECT}/records/${recordId}`,
            type: 'PUT',
            headers: getKnackHeaders(),
            data: JSON.stringify(data),
            contentType: 'application/json',
            success: resolve,
            error: reject
          });
        });
      });
      
      return true;
    } catch (error) {
      console.error(`[Homepage] Error updating profile field ${fieldId}:`, error);
      return false;
    }
  }
  
  // Find the student record for the user by email
  async function findStudentRecord(email) {
    if (!email) return null;
    
    const filters = encodeURIComponent(JSON.stringify({
      match: 'or',
      rules: [
        { field: 'field_91', operator: 'is', value: email },
        { field: 'field_70', operator: 'is', value: email },
        { field: 'field_91', operator: 'contains', value: email }
      ]
    }));
    
    try {
      const response = await retryApiCall(() => {
        return new Promise((resolve, reject) => {
          $.ajax({
            url: `${KNACK_API_URL}/objects/object_6/records?filters=${filters}`,
            type: 'GET',
            headers: getKnackHeaders(),
            data: { format: 'raw' },
            success: resolve,
            error: reject
          });
        });
      });
      
      if (response && response.records && response.records.length > 0) {
        return response.records[0];
      }
      
      return null;
    } catch (error) {
      console.error('[Homepage] Error finding student record:', error);
      return null;
    }
  }
  
  // --- UI Rendering ---
  // Render the main homepage UI
  function renderHomepage(userProfile) {
    const container = document.querySelector(window.HOMEPAGE_CONFIG.elementSelector);
    if (!container) {
      console.error('[Homepage] Container element not found.');
      return;
    }
    
    // Clear the container
    container.innerHTML = '';
    
    // Parse subject data or initialize empty
    const subjectData = [];
    for (let i = 1; i <= 15; i++) {
      const fieldKey = `sub${i}`;
      const fieldId = FIELD_MAPPING[fieldKey];
      
      if (userProfile[fieldId]) {
        try {
          const subject = safeParseJSON(userProfile[fieldId]);
          if (subject && subject.subject) {
            subjectData.push(subject);
          }
        } catch (e) {
          console.warn(`[Homepage] Error parsing subject data for ${fieldKey}:`, e);
        }
      }
    }
    
    // Extract profile data
    const profileData = {
      name: userProfile[FIELD_MAPPING.studentName] || 'Student',
      school: userProfile[FIELD_MAPPING.vespaCustomer] || '',
      tutorGroup: userProfile[FIELD_MAPPING.tutorGroup] || '',
      yearGroup: userProfile[FIELD_MAPPING.yearGroup] || '',
      attendance: userProfile[FIELD_MAPPING.attendance] || '',
      subjects: subjectData
    };
    
    debugLog('Rendering homepage with profile data:', profileData);
    
    // Create the main container
    const homepageHTML = `
      <div id="vespa-homepage">
        ${renderProfileSection(profileData)}
        ${renderAppHubSection('VESPA Hub', APP_HUBS.vespa)}
        ${renderAppHubSection('Productivity Hub', APP_HUBS.productivity)}
      </div>
    `;
    
    // Add the CSS
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      #vespa-homepage {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px;
        color: #333;
      }
      
      .vespa-section {
        background-color: white;
        border-radius: 10px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        padding: 20px;
        margin-bottom: 30px;
      }
      
      .vespa-section-title {
        color: #23356f;
        font-size: 24px;
        font-weight: 600;
        margin-bottom: 20px;
        padding-bottom: 10px;
        border-bottom: 2px solid #00e5db;
      }
      
      /* Profile Section */
      .profile-info {
        display: flex;
        flex-wrap: wrap;
        gap: 20px;
      }
      
      .profile-details {
        flex: 1;
        min-width: 250px;
      }
      
      .profile-name {
        font-size: 28px;
        color: #23356f;
        margin-bottom: 15px;
      }
      
      .profile-item {
        margin-bottom: 10px;
      }
      
      .profile-label {
        font-weight: 600;
        color: #23356f;
      }
      
      .profile-value {
        color: #333;
      }
      
      .subjects-container {
        flex: 2;
        min-width: 300px;
      }
      
      .subjects-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 15px;
      }
      
      .subject-card {
        background-color: #f8f8f8;
        border-radius: 8px;
        padding: 12px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
      }
      
      .subject-name {
        font-weight: 600;
        color: #23356f;
        margin-bottom: 8px;
      }
      
      .subject-meta {
        font-size: 0.85em;
        color: #666;
        margin-bottom: 5px;
      }
      
      .grades-container {
        display: flex;
        justify-content: space-between;
        margin-top: 10px;
      }
      
      .grade-item {
        text-align: center;
      }
      
      .grade-label {
        font-size: 0.75em;
        color: #666;
      }
      
      .grade-value {
        font-size: 1.2em;
        font-weight: 600;
      }
      
      .grade-meg {
        color: #23356f;
      }
      
      .grade-current {
        color: #00e5db;
      }
      
      /* App Hubs */
      .app-hub {
        display: flex;
        flex-wrap: wrap;
        gap: 20px;
        justify-content: center;
      }
      
      .app-card {
        background-color: white;
        border-radius: 10px;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
        width: 250px;
        overflow: hidden;
        transition: transform 0.3s, box-shadow 0.3s;
      }
      
      .app-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 6px 15px rgba(0, 0, 0, 0.15);
      }
      
      .app-card-header {
        background-color: #23356f;
        padding: 15px;
        text-align: center;
      }
      
      .app-icon {
        width: 80px;
        height: 80px;
        object-fit: contain;
        margin-bottom: 10px;
      }
      
      .app-name {
        color: white;
        font-size: 18px;
        font-weight: 600;
      }
      
      .app-description {
        padding: 15px;
        color: #333;
        font-size: 14px;
        height: 100px;
        display: flex;
        align-items: center;
        text-align: center;
      }
      
      .app-button {
        display: block;
        background-color: #00e5db;
        color: #23356f;
        text-align: center;
        padding: 10px;
        text-decoration: none;
        font-weight: 600;
        transition: background-color 0.3s;
      }
      
      .app-button:hover {
        background-color: #00c2b8;
      }
      
      /* Responsive adjustments */
      @media (max-width: 768px) {
        .subjects-grid {
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        }
        
        .app-card {
          width: 100%;
          max-width: 300px;
        }
      }
    `;
    
    // Add style and content to the container
    container.appendChild(styleElement);
    container.innerHTML += homepageHTML;
    
    // Add event listeners to app cards
    document.querySelectorAll('.app-button').forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        const url = button.getAttribute('href');
        if (url) {
          window.location.href = url;
        }
      });
    });
  }
  
  // Render the profile section
  function renderProfileSection(profileData) {
    const name = sanitizeField(profileData.name);
    const school = sanitizeField(profileData.school);
    const tutorGroup = sanitizeField(profileData.tutorGroup);
    const yearGroup = sanitizeField(profileData.yearGroup);
    const attendance = sanitizeField(profileData.attendance);
    
    // Render subjects
    let subjectsHTML = '';
    if (profileData.subjects && profileData.subjects.length > 0) {
      profileData.subjects.forEach(subject => {
        subjectsHTML += `
          <div class="subject-card">
            <div class="subject-name">${sanitizeField(subject.subject || '')}</div>
            <div class="subject-meta">
              ${subject.examType ? sanitizeField(subject.examType) : 'N/A'}
              ${subject.examBoard ? ` • ${sanitizeField(subject.examBoard)}` : ''}
            </div>
            <div class="grades-container">
              <div class="grade-item">
                <div class="grade-label">Target</div>
                <div class="grade-value grade-meg">${sanitizeField(subject.minimumExpectedGrade || 'N/A')}</div>
              </div>
              <div class="grade-item">
                <div class="grade-label">Current</div>
                <div class="grade-value grade-current">${sanitizeField(subject.currentGrade || 'N/A')}</div>
              </div>
            </div>
          </div>
        `;
      });
    } else {
      subjectsHTML = '<div class="no-subjects">No subjects available</div>';
    }
    
    return `
      <section class="vespa-section profile-section">
        <h2 class="vespa-section-title">Student Profile</h2>
        <div class="profile-info">
          <div class="profile-details">
            <div class="profile-name">${name}</div>
            
            <div class="profile-item">
              <span class="profile-label">School:</span>
              <span class="profile-value">${school || 'N/A'}</span>
            </div>
            
            <div class="profile-item">
              <span class="profile-label">Year Group:</span>
              <span class="profile-value">${yearGroup || 'N/A'}</span>
            </div>
            
            <div class="profile-item">
              <span class="profile-label">Tutor Group:</span>
              <span class="profile-value">${tutorGroup || 'N/A'}</span>
            </div>
            
            <div class="profile-item">
              <span class="profile-label">Attendance:</span>
              <span class="profile-value">${attendance || 'N/A'}</span>
            </div>
          </div>
          
          <div class="subjects-container">
            <div class="subjects-grid">
              ${subjectsHTML}
            </div>
          </div>
        </div>
      </section>
    `;
  }
  
  // Render an app hub section
  function renderAppHubSection(title, apps) {
    let appsHTML = '';
    
    apps.forEach(app => {
      appsHTML += `
        <div class="app-card">
          <div class="app-card-header">
            <img src="${app.icon}" alt="${app.name}" class="app-icon">
            <div class="app-name">${sanitizeField(app.name)}</div>
          </div>
          <div class="app-description">
            ${sanitizeField(app.description)}
          </div>
          <a href="${app.url}" class="app-button">Launch</a>
        </div>
      `;
    });
    
    return `
      <section class="vespa-section">
        <h2 class="vespa-section-title">${sanitizeField(title)}</h2>
        <div class="app-hub">
          ${appsHTML}
        </div>
      </section>
    `;
  }

  // --- Entry Point Function ---
  // Main initialization function, exposed globally
  window.initializeHomepage = async function() {
    debugLog("Initializing Homepage...");
    
    // Get config from loader
    const config = window.HOMEPAGE_CONFIG;
    if (!config || !config.elementSelector) {
      console.error("Homepage Error: Missing configuration when initializeHomepage called.");
      return;
    }
    
    // Verify Knack context and authentication
    if (typeof Knack === 'undefined' || typeof Knack.getUserToken !== 'function') {
      console.error("Homepage Error: Knack context not available.");
      return;
    }
    
    const userToken = Knack.getUserToken();
    if (!userToken) {
      console.error("Homepage Error: User is not authenticated (no token).");
      return;
    }
    
    // Get user info from Knack
    const user = Knack.getUserAttributes();
    if (!user || !user.id) {
      console.error("Homepage Error: Cannot get user attributes.");
      return;
    }
    
    // Store user info globally
    window.currentKnackUser = user;
    debugLog("Current user:", user);
    
    // Find the target container - add more logging to troubleshoot
    console.log(`[Homepage] Looking for container with selector: ${config.elementSelector}`);
    
    // Try alternative selectors if the main one fails
    let container = document.querySelector(config.elementSelector);
    
    if (!container) {
      console.log(`[Homepage] Primary selector failed, trying alternatives...`);
      
      // Try alternative selectors
      const alternatives = [
        `.kn-view-${config.viewKey}`,         // Class based on view key
        `#${config.viewKey}`,                 // Direct ID
        `#kn-${config.viewKey}`,              // Knack prefixed ID
        `.kn-scene .kn-content`,              // Generic content area
        `.kn-form-view-${config.viewKey}`     // Form view class
      ];
      
      for (const altSelector of alternatives) {
        console.log(`[Homepage] Trying alternative selector: ${altSelector}`);
        container = document.querySelector(altSelector);
        if (container) {
          console.log(`[Homepage] Found container with alternative selector: ${altSelector}`);
          break;
        }
      }
    }
    
    // If still not found, report error
    if (!container) {
      console.error(`Homepage Error: Container not found using selector: ${config.elementSelector} or alternatives`);
      
      // Dump the DOM structure to help debug
      console.log(`[Homepage] DOM structure for debugging:`, 
        document.querySelector('.kn-content')?.innerHTML || 'No .kn-content found');
      
      // Last resort - just use the body
      container = document.body;
      console.warn(`[Homepage] Using document.body as last resort container`);
    }
    
    // Show loading indicator
    container.innerHTML = `
      <div style="padding: 30px; text-align: center; color: #23356f;">
        <h3>Loading VESPA Homepage...</h3>
        <div style="margin-top: 20px;">
          <svg width="40" height="40" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
            <circle cx="25" cy="25" r="20" fill="none" stroke="#00e5db" stroke-width="5">
              <animate attributeName="stroke-dasharray" dur="1.5s" values="1,150;90,150;90,150" repeatCount="indefinite"/>
              <animate attributeName="stroke-dashoffset" dur="1.5s" values="0;-35;-124" repeatCount="indefinite"/>
            </circle>
          </svg>
        </div>
      </div>
    `;
    
    try {
      // Find or create user profile
      const userProfile = await findOrCreateUserProfile(user.id, user.name, user.email);
      
      if (userProfile) {
        // Render the homepage UI
        renderHomepage(userProfile);
      } else {
        container.innerHTML = `
          <div style="padding: 30px; text-align: center; color: #23356f;">
            <h3>Error Loading Homepage</h3>
            <p>Unable to load or create your user profile. Please try refreshing the page.</p>
          </div>
        `;
      }
    } catch (error) {
      console.error("Homepage Error during initialization:", error);
      container.innerHTML = `
        <div style="padding: 30px; text-align: center; color: #23356f;">
          <h3>Error Loading Homepage</h3>
          <p>An unexpected error occurred. Please try refreshing the page.</p>
        </div>
      `;
    }
  };

})(); // End of IIFE
