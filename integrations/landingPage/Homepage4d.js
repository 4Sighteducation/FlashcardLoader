// Homepage Integration Script for Knack - v1.0
// This script enables an enhanced homepage with user profile and app hubs
(function() {
  // --- Constants and Configuration ---
  const KNACK_API_URL = 'https://api.knack.com/v1';
  const HOMEPAGE_OBJECT = 'object_112'; // User Profile object for homepage
  const DEBUG_MODE = false; // Enable console logging

  // Flashcard specific constants
  const FLASHCARD_DATA_OBJECT = 'object_102';
  const FLASHCARD_USER_LINK_FIELD = 'field_2954'; // Field in object_102 that links to the user
  const FLASHCARD_BOX_FIELDS = {
    box1: 'field_2986',
    box2: 'field_2987',
    box3: 'field_2988',
    box4: 'field_2989',
    box5: 'field_2990'
  };

  // Study Planner specific constants
  const STUDY_PLANNER_OBJECT_ID = 'object_110';
  const STUDY_PLANNER_USER_LINK_FIELD = 'field_3040';
  const STUDY_PLANNER_JSON_FIELD = 'field_3042';

  // Taskboard specific constants
  const TASKBOARD_OBJECT_ID = 'object_111';
  const TASKBOARD_USER_LINK_FIELD = 'field_3048';
  const TASKBOARD_JSON_FIELD = 'field_3052';

  // VESPA Scores specific constants
  const VESPA_SCORES_OBJECT = 'object_10';
  const VESPA_SCORES_EMAIL_FIELD = 'field_197'; // Student Email in object_10
  const VESPA_SCORES_FIELDS = {
    vision: 'field_147',    // #ff8f00
    effort: 'field_148',    // #86b4f0
    systems: 'field_149',   // #72cb44
    practice: 'field_150',  // #7f31a4
    attitude: 'field_151',  // #f032e6
    overall: 'field_152'    // #f3f553
  };
  const VESPA_SCORE_COLORS = {
    vision: '#ff8f00',
    effort: '#86b4f0',
    systems: '#72cb44',
    practice: '#7f31a4',
    attitude: '#f032e6',
    overall: '#f3f553'
  };

  // Display preference fields
  const DISPLAY_PREFERENCE_FIELDS = {
    showVespaScores: 'field_3476',    // Boolean field for VESPA Scores display
    showAcademicProfile: 'field_3477'  // Boolean field for Academic Profile display
  };

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
    upn: 'field_3136',            // Unique Pupil Number (UPN)
    
    // Verification fields (in Object_6) - CORRECTED
    password: 'field_71',         // Password field
    privacyPolicy: 'field_127',   // Privacy Policy acceptance (Yes/No)
    verifiedUser: 'field_189',    // Verified User status (Yes/No) - CORRECTED FROM field_128
    passwordReset: 'field_539',   // Password Reset status (Yes/No)
    
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
        icon: "fa-solid fa-clipboard-list",
        iconType: "fontawesome",
        fallbackIcon: "📋",
        description: "Discover your learning superpowers with our questionnaire on Vision, Effort, Systems, Practice and Attitude!"
      },
      {
        name: "VESPA Coaching Report",
        url: "https://vespaacademy.knack.com/vespa-academy#vespa-results/",
        icon: "fa-solid fa-chart-column",
        iconType: "fontawesome",
        fallbackIcon: "📊",
        description: "See how awesome you can be! Your personal roadmap to success with tailored feedback just for you."
      },
      {
        name: "VESPA Activities",
        url: "https://vespaacademy.knack.com/vespa-academy#my-vespa/",
        icon: "fa-solid fa-list-check",
        iconType: "fontawesome",
        fallbackIcon: "✅",
        description: "Unlock fun activities and cool ideas perfectly matched to your unique learning style and VESPA scores!"
      }
    ],
    productivity: [
      {
        name: "Study Planner",
        url: "https://vespaacademy.knack.com/vespa-academy#studyplanner/",
        icon: "fa-solid fa-calendar-days",
        iconType: "fontawesome",
        fallbackIcon: "📅",
        description: "Take control of your time with this super-smart calendar that makes study planning a breeze!"
      },
      {
        name: "Flashcards",
        url: "https://vespaacademy.knack.com/vespa-academy#flashcards/",
        icon: "fa-solid fa-layer-group",
        iconType: "fontawesome",
        fallbackIcon: "🗂️",
        description: "Turn boring facts into brain-friendly flashcards that make remembering stuff actually fun!"
      },
      {
        name: "Taskboard",
        url: "https://vespaacademy.knack.com/vespa-academy#task-board/",
        icon: "fa-solid fa-table-columns",
        iconType: "fontawesome",
        fallbackIcon: "📌",
        description: "Zap your to-do list into an organized masterpiece with this colorful drag-and-drop task manager!"
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
        // Try to log a clone for better inspection in some consoles
        console.log(JSON.parse(JSON.stringify(data, null, 2)));
      }
    } catch (e) {
      // If stringify fails (e.g., circular references, though less likely for our data objects)
      // or if data is not easily stringifiable, log the raw data object.
      console.log("Data (raw, stringify failed or not applicable):", data);
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
      debugLog("[Homepage] JSON parse failed", { error: error.message, stringSample: String(jsonString).substring(0, 100) });
      try {
        const cleanedString = String(jsonString).trim().replace(/^\uFEFF/, '');
        const recovered = cleanedString
          .replace(/\\"/g, '"')
          .replace(/,\s*([}\]])/g, '$1');
        const result = JSON.parse(recovered);
        debugLog("[Homepage] JSON recovery successful", result);
        return result;
      } catch (secondError) {
        debugLog("[Homepage] JSON recovery failed", { error: secondError.message });
        return defaultVal;
      }
    }
  }

  // Check if a string is a valid Knack record ID
  function isValidKnackId(id) {
    if (!id) return false;
    return typeof id === 'string' && /^[0-9a-f]{24}$/i.test(id);
  }

  // Extract a valid record ID from various formats - enhanced to handle more edge cases
  function extractValidRecordId(value) {
    if (!value) return null;
    
    debugLog('Extracting valid record ID from value', { type: typeof value, value });

    // Handle objects (most common case in Knack connections)
    if (typeof value === 'object' && value !== null) {
      // Check for direct ID property
      if (value.id && isValidKnackId(value.id)) {
        debugLog('Found valid ID in object.id', value.id);
        return value.id;
      }
      
      // Check for identifier property (sometimes used by Knack)
      if (value.identifier && isValidKnackId(value.identifier)) {
        debugLog('Found valid ID in object.identifier', value.identifier);
        return value.identifier;
      }
      
      // Handle arrays from connection fields
      if (Array.isArray(value)) {
        debugLog('Value is an array', { length: value.length });
        
        // Handle single item array
        if (value.length === 1) {
          if (typeof value[0] === 'object' && value[0].id) {
            debugLog('Found valid ID in array[0].id', value[0].id);
            return isValidKnackId(value[0].id) ? value[0].id : null;
          }
          if (typeof value[0] === 'string' && isValidKnackId(value[0])) {
            debugLog('Found valid ID as string in array[0]', value[0]);
            return value[0];
          }
        }
        
        // For debugging, log contents of larger arrays
        if (value.length > 1) {
          debugLog('Array contains multiple items, first few are', value.slice(0, 3));
        }
      }
      
      // Check for '_id' property which is sometimes used
      if (value._id && isValidKnackId(value._id)) {
        debugLog('Found valid ID in object._id', value._id);
        return value._id;
      }
    }

    // If it's a direct string ID
    if (typeof value === 'string') {
      if (isValidKnackId(value)) {
        debugLog('Value is a valid ID string', value);
        return value;
      } else {
        debugLog('String is not a valid Knack ID', value);
      }
    }

    debugLog('No valid record ID found in value', value);
    return null;
  }

  // Safely remove HTML from strings
  function sanitizeField(value) {
    if (value === null || value === undefined) return "";
    const strValue = String(value);
    let sanitized = strValue.replace(/<[^>]*?>/g, "");
    sanitized = sanitized.replace(/[_~`#]/g, ""); 
    sanitized = sanitized
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&nbsp;/g, " ");
    return sanitized.trim();
  }

  // NEW HELPER: Format number as percentage string
  function formatAsPercentage(value) {
    if (value === null || value === undefined || String(value).trim() === '' || String(value).trim().toLowerCase() === 'n/a') return 'N/A';
    const num = parseFloat(String(value));
    if (isNaN(num)) {
      // If it's not a number but not empty/NA, return sanitized original (e.g., if it was some error text)
      return sanitizeField(String(value)); 
    }
    return `${Math.round(num * 100)}%`;
  }

  // Generic retry function for API calls
  function retryApiCall(apiCall, maxRetries = 3, delay = 1000) {
    return new Promise((resolve, reject) => {
      const attempt = (retryCount) => {
        apiCall()
          .then(resolve)
          .catch((error) => {
            const attemptsMade = retryCount + 1;
            debugLog(`API call failed (Attempt ${attemptsMade}/${maxRetries})`, { status: error.status, statusText: error.statusText, responseText: error.responseText });

            if (retryCount < maxRetries - 1) {
              const retryDelay = delay * Math.pow(2, retryCount);
              debugLog(`Retrying API call in ${retryDelay}ms...`);
              setTimeout(() => attempt(retryCount + 1), retryDelay);
            } else {
              debugLog(`API call failed after ${maxRetries} attempts.`);
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
    
    debugLog("Config for headers", config);
    
    // Fallback to using Knack's global application ID if not in config
    const knackAppId = (config && config.knackAppId) ? config.knackAppId : Knack.application_id;
    // Use our known API key if not in config
    const knackApiKey = (config && config.knackApiKey) ? config.knackApiKey : '8f733aa5-dd35-4464-8348-64824d1f5f0d';
    
    debugLog(`Using AppID ${knackAppId}`);
    
    if (typeof Knack === 'undefined' || typeof Knack.getUserToken !== 'function') {
      if (DEBUG_MODE) console.error("[Homepage] Knack object or getUserToken function not available.");
      throw new Error("Knack authentication context not available.");
    }
    
    const token = Knack.getUserToken();
    if (!token) {
      debugLog("[Homepage] Knack user token is null or undefined. API calls may fail.");
    }
    
    const headers = {
      'X-Knack-Application-Id': knackAppId,
      'X-Knack-REST-API-Key': knackApiKey,
      'Authorization': token || '',
      'Content-Type': 'application/json'
    };
    
    debugLog("Headers being used", headers);
    
    return headers;
  }

  // --- User Profile Data Management ---
  // Find or create the user profile record
  async function findOrCreateUserProfile(userId, userName, userEmail) {
    if (!userId) {
      debugLog("[Homepage] Cannot find or create user profile: userId is missing.");
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
      
      let profileRecord = null;
      let isNewProfile = false;
      
      if (response && response.records && response.records.length > 0) {
        profileRecord = response.records[0];
        debugLog(`Found existing user profile record: ${profileRecord.id}`, profileRecord);
        
        // Update the login count
        if (profileRecord[FIELD_MAPPING.numLogins] !== undefined) {
          const currentLogins = parseInt(profileRecord[FIELD_MAPPING.numLogins], 10) || 0;
          updateUserProfileField(profileRecord.id, FIELD_MAPPING.numLogins, currentLogins + 1);
        }
      } else {
        // No profile found, create a new one
        debugLog(`No user profile found, creating new record for user: ${userId}`);
        profileRecord = await createUserProfile(userId, userName, userEmail);
        isNewProfile = true;
        if (!profileRecord) {
          debugLog('[Homepage] Failed to create user profile');
          return null;
        }
      }
      
      // Check for UPN updates - compare with what we have
      const profileUpn = profileRecord[FIELD_MAPPING.upn];
      let studentRecord = null;
      
      // Always fetch the student record to check for UPN changes
      if (userEmail) {
        studentRecord = await findStudentRecord(userEmail);
        if (studentRecord && studentRecord.field_3129) {
          const latestUpn = sanitizeField(studentRecord.field_3129);
          // If UPN has changed or was missing and now available, update it
          if (latestUpn && (!profileUpn || profileUpn !== latestUpn)) {
            debugLog(`UPN changed or added: Old=${profileUpn}, New=${latestUpn}`);
            await updateUserProfileField(profileRecord.id, FIELD_MAPPING.upn, latestUpn);
            profileRecord[FIELD_MAPPING.upn] = latestUpn; // Update local copy
          }
        }
      }
      
      // ALWAYS refresh subject data on every login (fix for authentication record review issue)
      if (profileRecord && userEmail) {
        try {
          // Get UPN from profile record if available (use updated UPN if we just changed it)
          const userUpn = profileRecord[FIELD_MAPPING.upn];
          
          debugLog(`Fetching latest subject data from Object_113 for email: ${userEmail}${userUpn ? ` and UPN: ${userUpn}` : ''}`);
          const subjectRecords = await fetchSubjectDataFromObject113(userEmail, userUpn);
          
          if (subjectRecords && subjectRecords.length > 0) {
            debugLog(`Found ${subjectRecords.length} subject records in Object_113`, subjectRecords);
            
            // Convert records to subject data format
            const subjectDataArray = buildSubjectDataFromObject113Records(subjectRecords);
            
            // Update the user profile with new subject data
            if (subjectDataArray.length > 0) {
              // Always update subject fields on login to ensure fresh data
              await updateUserProfileSubjects(profileRecord.id, subjectDataArray);
              debugLog(`Updated user profile with ${subjectDataArray.length} subjects from Object_113`);
              
              // Update only subject fields in profile object rather than fetching entire profile again
              for (let i = 0; i < subjectDataArray.length && i < 15; i++) {
                const fieldId = `field_${3080 + i}`; // field_3080 for index 0, field_3081 for index 1, etc.
                profileRecord[fieldId] = JSON.stringify(subjectDataArray[i]);
              }
              
              // If there were no subjects before but there are now, log this recovery
              const hadNoSubjects = !isNewProfile && !Object.keys(profileRecord).some(key => 
                key.startsWith('field_308') && profileRecord[key]);
              
              if (hadNoSubjects) {
                console.log('[Homepage] Successfully recovered subject data for existing profile that had no subjects');
              }
            }
          } else {
            // If this is not a new profile and we couldn't find subjects, it might be an issue
            if (!isNewProfile) {
              debugLog(`[Homepage] No subject records found in Object_113 for returning user ${userEmail} with UPN=${userUpn}`);
            } else {
              debugLog(`No subject records found in Object_113 for new user ${userEmail}, profile will have no subjects`);
            }
          }
        } catch (error) {
          debugLog('[Homepage] Error processing subject data from Object_113', { error: error.message, stack: error.stack });
        }
      }
      
      // When returning profile, make sure connection fields are preserved from original creation
      debugLog(`Final user profile with connection fields and subjects:`, profileRecord);
      
      return profileRecord;
    } catch (error) {
      debugLog('[Homepage] Error finding or creating user profile', { error: error.message, stack: error.stack });
      return null;
    }
  }
  
  // Fetch a user profile record by ID
  async function getUserProfileRecord(recordId) {
    if (!recordId) {
      debugLog('[Homepage] Cannot get user profile: recordId is missing');
      return null;
    }
    
    try {
      const response = await retryApiCall(() => {
        return new Promise((resolve, reject) => {
          $.ajax({
            url: `${KNACK_API_URL}/objects/${HOMEPAGE_OBJECT}/records/${recordId}`,
            type: 'GET',
            headers: getKnackHeaders(),
            data: { format: 'raw' },
            success: resolve,
            error: reject
          });
        });
      });
      
      // Make sure the connection fields in the response are properly formatted
      debugLog(`Retrieved user profile record: ${recordId}`, response);
      
      return response;
    } catch (error) {
      debugLog(`[Homepage] Error getting user profile record ${recordId}`, { error: error.message, stack: error.stack });
      return null;
    }
  }
  
  // Fetch subject data from Object_113 using user email and/or UPN
  async function fetchSubjectDataFromObject113(userEmail, userUpn) {
    if (!userEmail && !userUpn) {
      debugLog("[Homepage] Cannot fetch subject data: Both userEmail and userUpn are missing.");
      return [];
    }
    
    debugLog(`Attempting to fetch subject data with Email:${userEmail}, UPN:${userUpn}`, null);
    
    try {
      const rules = [];
      
      // Prioritize UPN for more precise matching if available
      if (userUpn) {
        rules.push({ field: 'field_3126', operator: 'is', value: userUpn }); // FIXED: UPN field in Object_113 is field_3126
        debugLog(`Filtering Object_113 by UPN: ${userUpn}`);
      }
      
      // If no UPN, use email, or add email as fallback even with UPN
      if (!userUpn || (userUpn && userEmail)) {
        rules.push({ field: 'field_3130', operator: 'is', value: userEmail }); // FIXED: Email field in Object_113 is field_3130
        debugLog(`Filtering Object_113 by email: ${userEmail}`);
      }
      
      debugLog('Using filter for Object_113', { match: 'or', rules });
      
      // Create filter to find records by UPN and/or email
      const filters = encodeURIComponent(JSON.stringify({
        match: 'or', // Match either UPN or email
        rules: rules
      }));
      
      const response = await retryApiCall(() => {
        return new Promise((resolve, reject) => {
          $.ajax({
            url: `${KNACK_API_URL}/objects/object_113/records?filters=${filters}`,
            type: 'GET',
            headers: getKnackHeaders(),
            data: { format: 'raw' },
            success: resolve,
            error: reject
          });
        });
      });
      
      // Log the COMPLETE response for debugging
      debugLog(`Complete API Response from Object_113`, response);
      
      if (response && response.records && response.records.length > 0) {
        debugLog(`Found ${response.records.length} subject records in Object_113`, response.records);
        // ---- CONVERTED EXTRA LOGGING HERE ----
        debugLog('[Homepage DEBUG] Raw subject records fetched from object_113', response.records);
        // ---------------------------------
        return response.records;
      }
      
      return [];
    } catch (error) {
      debugLog('[Homepage] Error fetching subject data from Object_113', { error: error.message, stack: error.stack });
      return [];
    }
  }
  
  // Build subject data JSON objects from Object_113 records
  function buildSubjectDataFromObject113Records(records) {
    if (!records || !Array.isArray(records) || records.length === 0) {
      return [];
    }
    
    const builtRecords = records.map(record => {
      return {
        originalRecordId: record.id, 
        subject: sanitizeField(record.field_3109 || ''), // Corrected to field_3109 for subject name
        examType: sanitizeField(record.field_3103 || ''),
        examBoard: sanitizeField(record.field_3102 || ''),
        minimumExpectedGrade: sanitizeField(record.field_3269 || ''), // MEG from field_3269
        subjectTargetGrade: sanitizeField(record.field_3131 || ''), // STG (was minimumExpectedGrade)
        currentGrade: sanitizeField(record.field_3132 || ''),
        targetGrade: sanitizeField(record.field_3135 || ''),
        effortGrade: sanitizeField(record.field_3133 || ''), // Added Effort
        behaviourGrade: sanitizeField(record.field_3134 || ''), // Added Behaviour
        subjectAttendance: sanitizeField(record.field_3186 || '') // Added Subject Attendance
      };
    });

    // ---- CONVERTED EXTRA LOGGING HERE ----
    debugLog('[Homepage DEBUG] Built subject data for object_112 update', builtRecords); 
    // ---------------------------------
    return builtRecords; 
  }
  
  // Update subject fields in user profile
  async function updateUserProfileSubjects(recordId, subjectDataArray) {
    if (!recordId || !subjectDataArray || !Array.isArray(subjectDataArray)) {
      debugLog('[Homepage] Cannot update subjects: Invalid parameters');
      return false;
    }
    // ---- CONVERTED EXTRA LOGGING HERE ----
    debugLog('[Homepage DEBUG] updateUserProfileSubjects received subjectDataArray', subjectDataArray);
    // ---------------------------------
    
    // Limit to 15 subjects max
    const maxSubjects = Math.min(subjectDataArray.length, 15);
    
    // Prepare update data
    const updateData = {};
    
    for (let i = 0; i < maxSubjects; i++) {
      const fieldId = `field_${3080 + i}`; // field_3080 for index 0, field_3081 for index 1, etc.
      updateData[fieldId] = JSON.stringify(subjectDataArray[i]);
    }
    // ---- CONVERTED EXTRA LOGGING HERE ----
    debugLog('[Homepage DEBUG] Data prepared for PUT to object_112', updateData);
    // ---------------------------------
    
    try {
      const response = await retryApiCall(() => { // Capture the response
        return new Promise((resolve, reject) => {
          $.ajax({
            url: `${KNACK_API_URL}/objects/${HOMEPAGE_OBJECT}/records/${recordId}`,
            type: 'PUT',
            headers: getKnackHeaders(),
            data: JSON.stringify(updateData),
            contentType: 'application/json',
            success: resolve,
            error: reject
          });
        });
      });
      // ---- CONVERTED EXTRA LOGGING HERE ----
      debugLog('[Homepage DEBUG] Successfully updated subjects in object_112. Response', response);
      // ---------------------------------
      return true;
    } catch (error) {
      // ---- CONVERTED EXTRA LOGGING HERE ----
      debugLog('[Homepage DEBUG] Error updating user profile subjects in object_112', { error: error.message, responseText: error.responseText });
      // ---------------------------------
      return false;
    }
  }
  
  // Create a new user profile record
  async function createUserProfile(userId, userName, userEmail) {
    const user = window.currentKnackUser;
    if (!user) {
      debugLog("[Homepage] Cannot create user profile: currentKnackUser is missing.");
      return null;
    }
    
    try {
      debugLog('Creating user profile with data:', { userId, userName, userEmail });
      
      // Look up additional data for connection fields
      const studentRecord = await findStudentRecord(userEmail);
      debugLog('Found student record for connections:', studentRecord);
      
      // Log detailed information about ALL fields in student record
      if (studentRecord) {
        debugLog('[Homepage] Student record field data, VESPA Customer field', { customerField: studentRecord.field_122_raw });
        
        // Log ALL fields related to tutors to debug the issue
        debugLog('[Homepage] Tutor fields', { raw: studentRecord.field_1682_raw, nonRaw: studentRecord.field_1682 });
        
        // Log ALL fields related to staff admins to debug the issue
        debugLog('[Homepage] Staff Admin fields', { raw: studentRecord.field_190_raw, nonRaw: studentRecord.field_190 });
        
        // Log any other key fields that might contain connection info
        if (DEBUG_MODE) {
          let potentialConnections = {};
          for (const key in studentRecord) {
            if (key.includes('connect') || key.includes('tutor') || key.includes('admin') || key.includes('staff')) {
              potentialConnections[key] = studentRecord[key];
            }
          }
          debugLog('[Homepage] Potential connection fields in record', potentialConnections);
        }
      }
      
      // Prepare basic profile data
      const data = {
        [FIELD_MAPPING.userId]: userId,
        [FIELD_MAPPING.studentName]: sanitizeField(userName || ''),
        [FIELD_MAPPING.numLogins]: 1, // First login
      };
      
      // Connection fields - User Account (direct user ID) - Always set directly
      data[FIELD_MAPPING.userConnection] = userId;
      debugLog(`[Homepage] Setting User Connection: ${userId}`);
      
      // Connection fields from user object
      if (user.schoolId) {
        data[FIELD_MAPPING.vespaCustomer] = user.schoolId;
        debugLog(`[Homepage] Setting VESPA Customer from user: ${user.schoolId}`);
      }
      
      // Store UPN if available from student record
      if (studentRecord && studentRecord.field_3129) {
        data[FIELD_MAPPING.upn] = sanitizeField(studentRecord.field_3129);
        debugLog(`Adding UPN to user profile: ${studentRecord.field_3129}`);
      }
      
      // Extract connection fields from student record if available
      if (studentRecord) {
        // VESPA Customer (school) if not already set
        // First try field_122_raw (original field)
        if (!data[FIELD_MAPPING.vespaCustomer]) {
          let schoolId = null;
          
          // Log all potential VESPA Customer fields for debugging
          debugLog('Potential VESPA Customer fields', {
            field_122_raw: studentRecord.field_122_raw,
            field_122: studentRecord.field_122,
            field_179: studentRecord.field_179
          });
          
          // Try field_122_raw first
          if (studentRecord.field_122_raw) {
            schoolId = extractValidRecordId(studentRecord.field_122_raw);
            if (schoolId) {
              debugLog(`Found VESPA Customer in field_122_raw: ${schoolId}`);
            }
          }
          
          // If not found, try field_179 (alternative field)
          if (!schoolId && studentRecord.field_179) {
            schoolId = extractValidRecordId(studentRecord.field_179);
            if (schoolId) {
              debugLog(`Found VESPA Customer in field_179: ${schoolId}`);
            }
          }
          
          // If still not found, try non-raw field_122
          if (!schoolId && studentRecord.field_122) {
            if (typeof studentRecord.field_122 === 'string' && isValidKnackId(studentRecord.field_122)) {
              schoolId = studentRecord.field_122;
              debugLog(`Found VESPA Customer in field_122: ${schoolId}`);
            }
          }
          
          // Set the school ID if found in any field
          if (schoolId) {
            data[FIELD_MAPPING.vespaCustomer] = schoolId;
            debugLog(`[Homepage] Setting VESPA Customer from student record: ${schoolId}`);
          } else {
            debugLog('Could not find valid VESPA Customer ID in any field', null);
          }
        }
        
        // Tutor connections - handle multiple - try both raw and non-raw versions
        let tutorField = null;
        
        // First check the raw field (original)
        if (studentRecord.field_1682_raw) {
          tutorField = studentRecord.field_1682_raw;
          debugLog('[Homepage] Using field_1682_raw for tutors');
        } 
        // Then check the non-raw field as fallback
        else if (studentRecord.field_1682) {
          tutorField = studentRecord.field_1682;
          debugLog('[Homepage] Using field_1682 for tutors');
        }
        
        if (tutorField) {
          let tutorIds = [];
          
          // Handle array
          if (Array.isArray(tutorField)) {
            debugLog('[Homepage] Tutor field is an array with items', { length: tutorField.length });
            tutorIds = tutorField
              .map(item => extractValidRecordId(item))
              .filter(id => id);
          } 
          // Handle object
          else if (typeof tutorField === 'object') {
            debugLog('[Homepage] Tutor field is an object');
            const id = extractValidRecordId(tutorField);
            if (id) tutorIds.push(id);
          } 
          // Handle string (direct ID)
          else if (typeof tutorField === 'string' && isValidKnackId(tutorField)) {
            debugLog('[Homepage] Tutor field is a string ID');
            tutorIds.push(tutorField);
          }
          
          if (tutorIds.length > 0) {
            // For Knack connection fields, format depends on single vs multiple
            data[FIELD_MAPPING.tutorConnection] = tutorIds.length === 1 ? tutorIds[0] : tutorIds;
            debugLog(`[Homepage] Setting Tutor connection`, tutorIds);
          } else {
            debugLog('[Homepage] No valid tutor IDs found after processing');
          }
        } else {
          debugLog('[Homepage] No tutor field found in student record');
        }
        
        // Staff Admin connections - handle multiple - try both raw and non-raw versions
        let staffAdminField = null;
        
        // First check the raw field (original)
        if (studentRecord.field_190_raw) {
          staffAdminField = studentRecord.field_190_raw;
          debugLog('[Homepage] Using field_190_raw for staff admins');
        } 
        // Then check the non-raw field as fallback
        else if (studentRecord.field_190) {
          staffAdminField = studentRecord.field_190;
          debugLog('[Homepage] Using field_190 for staff admins');
        }
        
        if (staffAdminField) {
          let staffAdminIds = [];
          
          // Handle array
          if (Array.isArray(staffAdminField)) {
            debugLog('[Homepage] Staff Admin field is an array with items', { length: staffAdminField.length });
            staffAdminIds = staffAdminField
              .map(item => extractValidRecordId(item))
              .filter(id => id);
          } 
          // Handle object
          else if (typeof staffAdminField === 'object') {
            debugLog('[Homepage] Staff Admin field is an object');
            const id = extractValidRecordId(staffAdminField);
            if (id) staffAdminIds.push(id);
          } 
          // Handle string (direct ID)
          else if (typeof staffAdminField === 'string' && isValidKnackId(staffAdminField)) {
            debugLog('[Homepage] Staff Admin field is a string ID');
            staffAdminIds.push(staffAdminField);
          }
          
          if (staffAdminIds.length > 0) {
            // For Knack connection fields, format depends on single vs multiple
            data[FIELD_MAPPING.staffAdminConnection] = staffAdminIds.length === 1 ? staffAdminIds[0] : staffAdminIds;
            debugLog(`[Homepage] Setting Staff Admin connection`, staffAdminIds);
          } else {
            debugLog('[Homepage] No valid staff admin IDs found after processing');
          }
        } else {
          debugLog('[Homepage] No staff admin field found in student record');
        }
        
        // Get Tutor Group from field_565
        if (studentRecord.field_565) {
          data[FIELD_MAPPING.tutorGroup] = sanitizeField(studentRecord.field_565);
        }
        
        // Get Year Group from field_548
        if (studentRecord.field_548) {
          data[FIELD_MAPPING.yearGroup] = sanitizeField(studentRecord.field_548);
        }
        
        // Get Attendance from field_3139
        if (studentRecord.field_3139) {
          data[FIELD_MAPPING.attendance] = sanitizeField(studentRecord.field_3139);
        }
      }
      
      // Debug log the final data with explicit connection fields info
      debugLog('Connection fields in record creation', {
        vespaCustomer: data[FIELD_MAPPING.vespaCustomer],
        tutorConnection: data[FIELD_MAPPING.tutorConnection],
        staffAdminConnection: data[FIELD_MAPPING.staffAdminConnection]
      });
      
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
        debugLog('[Homepage] Failed to create user profile: No ID returned', response);
        return null;
      }
    } catch (error) {
      debugLog('[Homepage] Error creating user profile', { error: error.message, stack: error.stack });
      return null;
    }
  }
  
  // Update a specific field in the user profile
  async function updateUserProfileField(recordId, fieldId, value) {
    if (!recordId || !fieldId) {
      debugLog('[Homepage] Cannot update profile: Missing recordId or fieldId');
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
      debugLog(`[Homepage] Error updating profile field ${fieldId}`, { error: error.message, stack: error.stack });
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
        const studentRecord = response.records[0];
        
        // Log the entire student record structure to identify all available fields
        debugLog('COMPLETE STUDENT RECORD', studentRecord);
        
        // Check explicitly for the tutor and staff admin fields
        debugLog('Checking for connection fields in student record', {
          tutor_field_1682_exists: studentRecord.field_1682 !== undefined,
          tutor_field_1682_raw_exists: studentRecord.field_1682_raw !== undefined,
          staff_admin_field_190_exists: studentRecord.field_190 !== undefined,
          staff_admin_field_190_raw_exists: studentRecord.field_190_raw !== undefined
        });
        
        // Extract UPN (Unique Pupil Number) if available
        if (studentRecord.field_3129) {
          debugLog(`Found UPN for student: ${studentRecord.field_3129}`);
        } else {
          debugLog('No UPN found in student record (field_3129)', null);
        }
        
        return studentRecord;
      }
      
      return null;
    } catch (error) {
      debugLog('[Homepage] Error finding student record', { error: error.message, stack: error.stack });
      return null;
    }
  }
  
  // --- Flashcard Review Notification Functions ---
  async function fetchFlashcardReviewData(userId) {
    if (!userId) {
      debugLog("[Homepage] Cannot fetch flashcard data: userId is missing.");
      return null;
    }
    debugLog(`Fetching flashcard review data for user ID: ${userId}`);

    const findFilters = encodeURIComponent(JSON.stringify({
      match: 'and',
      rules: [
        { field: FLASHCARD_USER_LINK_FIELD, operator: 'is', value: userId }
      ]
    }));

    const fieldsToRequest = Object.values(FLASHCARD_BOX_FIELDS).join(',');

    try {
      const response = await retryApiCall(() => {
        return new Promise((resolve, reject) => {
          $.ajax({
            url: `${KNACK_API_URL}/objects/${FLASHCARD_DATA_OBJECT}/records?filters=${findFilters}&fields=${fieldsToRequest}`,
            type: 'GET',
            headers: getKnackHeaders(),
            data: { format: 'raw' },
            success: resolve,
            error: reject
          });
        });
      });

      if (response && response.records && response.records.length > 0) {
        debugLog(`Found flashcard data record for user ${userId}`, response.records[0]);
        return response.records[0];
      } else {
        debugLog(`No flashcard data record found for user ${userId}`);
        return null;
      }
    } catch (error) {
      debugLog('[Homepage] Error fetching flashcard review data', { error: error.message, stack: error.stack });
      return null;
    }
  }

  function processFlashcardData(flashcardRecord) {
    if (!flashcardRecord) {
      return { 
        totalDue: 0, 
        box1: { due: 0, total: 0 }, 
        box2: { due: 0, total: 0 }, 
        box3: { due: 0, total: 0 }, 
        box4: { due: 0, total: 0 }, 
        box5: { due: 0, total: 0 } 
      };
    }

    const counts = { 
      totalDue: 0, 
      box1: { due: 0, total: 0 }, 
      box2: { due: 0, total: 0 }, 
      box3: { due: 0, total: 0 }, 
      box4: { due: 0, total: 0 }, 
      box5: { due: 0, total: 0 } 
    };
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today to the start of the day

    for (const boxKey in FLASHCARD_BOX_FIELDS) { // boxKey will be "box1", "box2", etc.
      const fieldId = FLASHCARD_BOX_FIELDS[boxKey];
      let boxDataRaw = flashcardRecord[fieldId];
      let currentBoxDueCount = 0;
      let currentBoxTotalCount = 0;

      if (boxDataRaw && typeof boxDataRaw === 'string') {
        try {
          // Attempt to decode if it looks URL encoded (starts with %)
          if (boxDataRaw.startsWith('%')) {
            boxDataRaw = decodeURIComponent(boxDataRaw);
            debugLog(`Decoded ${fieldId} data:`, boxDataRaw.substring(0,100)); // Log first 100 chars
          }
        } catch (e) {
          debugLog(`[Homepage] Error decoding URI component for ${fieldId}`, { error: e.message, originalStringSample: boxDataRaw.substring(0,100) });
          // If decoding fails, proceed with the original string, maybe it wasn't encoded
        }
        
        const cardsArray = safeParseJSON(boxDataRaw, []);
        if (Array.isArray(cardsArray)) {
          currentBoxTotalCount = cardsArray.length;
          cardsArray.forEach(card => {
            if (card.nextReviewDate) {
              try {
                const nextReview = new Date(card.nextReviewDate);
                nextReview.setHours(0,0,0,0); // Normalize nextReviewDate to the start of its day
                
                if (nextReview <= today) {
                  currentBoxDueCount++;
                }
              } catch (dateError) {
                debugLog(`[Homepage] Error parsing nextReviewDate '${card.nextReviewDate}'`, { error: dateError.message });
              }
            }
          });
          counts[boxKey] = { due: currentBoxDueCount, total: currentBoxTotalCount };
          counts.totalDue += currentBoxDueCount;
        } else {
          debugLog(`Parsed data for ${fieldId} is not an array:`, cardsArray);
          counts[boxKey] = { due: 0, total: 0 }; // Initialize if parsing failed for this box
        }
      } else {
        counts[boxKey] = { due: 0, total: 0 }; // Initialize if no data for this box
      }
    }
    debugLog('Processed flashcard counts:', counts);
    return counts;
  }
  
  // --- Study Planner Notification Functions ---
  async function fetchStudyPlannerData(userId) {
    if (!userId) {
      debugLog("[Homepage] Cannot fetch Study Planner data: userId is missing.");
      return null;
    }
    debugLog(`Fetching Study Planner data for user ID: ${userId}`);
    const findFilters = encodeURIComponent(JSON.stringify({
      match: 'and',
      rules: [{ field: STUDY_PLANNER_USER_LINK_FIELD, operator: 'is', value: userId }]
    }));
    try {
      const response = await retryApiCall(() => {
        return new Promise((resolve, reject) => {
          $.ajax({
            url: `${KNACK_API_URL}/objects/${STUDY_PLANNER_OBJECT_ID}/records?filters=${findFilters}&fields=${STUDY_PLANNER_JSON_FIELD}`,
            type: 'GET',
            headers: getKnackHeaders(),
            data: { format: 'raw' },
            success: resolve,
            error: reject
          });
        });
      });
      if (response && response.records && response.records.length > 0) {
        debugLog(`Found Study Planner data for user ${userId}`, response.records[0]);
        return response.records[0][STUDY_PLANNER_JSON_FIELD];
      } else {
        debugLog(`No Study Planner data found for user ${userId}`);
        return null;
      }
    } catch (error) {
      debugLog('[Homepage] Error fetching Study Planner data', { error: error.message, stack: error.stack });
      return null;
    }
  }

  function processStudyPlannerData(plannerJsonString) {
    if (!plannerJsonString) {
      return { count: 0, sessionsDetails: [] };
    }
    const plannerData = safeParseJSON(plannerJsonString);
    if (!plannerData || !plannerData.weekStart || !plannerData.sessions) {
      debugLog('Study Planner data is invalid or missing weekStart/sessions', plannerData);
      return { count: 0, sessionsDetails: [] };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentDay = today.getDay(); // Sunday - 0, Monday - 1, ..., Saturday - 6
    const daysToSubtractForMonday = currentDay === 0 ? 6 : currentDay - 1;
    const currentWeekMonday = new Date(today);
    currentWeekMonday.setDate(today.getDate() - daysToSubtractForMonday);
    currentWeekMonday.setHours(0,0,0,0);

    let jsonWeekStartDate;
    try {
        jsonWeekStartDate = new Date(plannerData.weekStart);
        jsonWeekStartDate.setHours(0,0,0,0);
    } catch (e) {
        debugLog('Invalid weekStart date in Study Planner JSON', plannerData.weekStart);
        return { count: 0, sessionsDetails: [] };
    }

    if (currentWeekMonday.getTime() !== jsonWeekStartDate.getTime()) {
      debugLog(`Study Planner week (${jsonWeekStartDate.toDateString()}) does not match current week (${currentWeekMonday.toDateString()}). No notification.`);
      return { count: 0, sessionsDetails: [] };
    }

    let sessionCount = 0;
    const sessionsDetails = [];
    for (const dayKey in plannerData.sessions) { // dayKey is like "Mon Apr 21 2025"
      if (Array.isArray(plannerData.sessions[dayKey])) {
        plannerData.sessions[dayKey].forEach(session => {
          sessionCount++;
          sessionsDetails.push(`${session.startTime} - ${session.subject} (${session.studyLength})`);
        });
      }
    }
    debugLog(`Processed Study Planner: ${sessionCount} sessions for the current week.`, sessionsDetails);
    return { count: sessionCount, sessionsDetails };
  }

  // --- Taskboard Notification Functions ---
  async function fetchTaskboardData(userId) {
    if (!userId) {
      debugLog("[Homepage] Cannot fetch Taskboard data: userId is missing.");
      return null;
    }
    debugLog(`Fetching Taskboard data for user ID: ${userId}`);
    const findFilters = encodeURIComponent(JSON.stringify({
      match: 'and',
      rules: [{ field: TASKBOARD_USER_LINK_FIELD, operator: 'is', value: userId }]
    }));
    try {
      const response = await retryApiCall(() => {
        return new Promise((resolve, reject) => {
          $.ajax({
            url: `${KNACK_API_URL}/objects/${TASKBOARD_OBJECT_ID}/records?filters=${findFilters}&fields=${TASKBOARD_JSON_FIELD}`,
            type: 'GET',
            headers: getKnackHeaders(),
            data: { format: 'raw' },
            success: resolve,
            error: reject
          });
        });
      });
      if (response && response.records && response.records.length > 0) {
        debugLog(`Found Taskboard data for user ${userId}`, response.records[0]);
        return response.records[0][TASKBOARD_JSON_FIELD];
      } else {
        debugLog(`No Taskboard data found for user ${userId}`);
        return null;
      }
    } catch (error) {
      debugLog('[Homepage] Error fetching Taskboard data', { error: error.message, stack: error.stack });
      return null;
    }
  }

  function processTaskboardData(taskboardJsonString) {
    if (!taskboardJsonString) {
      return { doingCount: 0, pendingHot: 0, pendingWarm: 0, pendingCold: 0, doingTaskTitles: [] };
    }
    const taskboardData = safeParseJSON(taskboardJsonString);
    if (!taskboardData || !Array.isArray(taskboardData.tasks)) {
      debugLog('Taskboard data is invalid or missing tasks array', taskboardData);
      return { doingCount: 0, pendingHot: 0, pendingWarm: 0, pendingCold: 0, doingTaskTitles: [] };
    }

    let doingCount = 0;
    let pendingHot = 0;
    let pendingWarm = 0;
    let pendingCold = 0;
    const doingTaskTitles = [];

    taskboardData.tasks.forEach(task => {
      if (task.status === 'Doing') {
        doingCount++;
        doingTaskTitles.push(task.title);
      } else if (task.status === 'Pending') {
        if (task.priority === 'Hot') pendingHot++;
        else if (task.priority === 'Warm') pendingWarm++;
        else if (task.priority === 'Cold') pendingCold++;
      }
    });

    const result = { doingCount, pendingHot, pendingWarm, pendingCold, doingTaskTitles };
    debugLog('Processed Taskboard data:', result);
    return result;
  }

  // --- VESPA Scores Data Function ---
  async function fetchVespaScores(userEmail) {
    if (!userEmail) {
      debugLog("[Homepage] Cannot fetch VESPA scores: userEmail is missing.");
      return null;
    }
    debugLog(`Fetching VESPA scores for email: ${userEmail}`);

    const findFilters = encodeURIComponent(JSON.stringify({
      match: 'and',
      rules: [{ field: VESPA_SCORES_EMAIL_FIELD, operator: 'is', value: userEmail }]
    }));

    // Include display preference fields in the request
    const fieldsToRequest = [
      ...Object.values(VESPA_SCORES_FIELDS),
      ...Object.values(DISPLAY_PREFERENCE_FIELDS)
    ].join(',');

    try {
      const response = await retryApiCall(() => {
        return new Promise((resolve, reject) => {
          $.ajax({
            url: `${KNACK_API_URL}/objects/${VESPA_SCORES_OBJECT}/records?filters=${findFilters}&fields=${fieldsToRequest}`,
            type: 'GET',
            headers: getKnackHeaders(),
            data: { format: 'raw' },
            success: resolve,
            error: reject
          });
        });
      });

      if (response && response.records && response.records.length > 0) {
        const record = response.records[0];
        debugLog(`Found VESPA scores record for ${userEmail}`, record);
        const scores = {};
        for (const key in VESPA_SCORES_FIELDS) {
          scores[key] = sanitizeField(record[VESPA_SCORES_FIELDS[key]] || 'N/A');
        }
        
        // Extract display preferences
        const displayPreferences = {
          showVespaScores: record[DISPLAY_PREFERENCE_FIELDS.showVespaScores] !== false, // Show if yes or null
          showAcademicProfile: record[DISPLAY_PREFERENCE_FIELDS.showAcademicProfile] !== false // Show if yes or null
        };
        
        debugLog('Processed VESPA scores:', scores);
        debugLog('Display preferences:', displayPreferences);
        
        return { scores, displayPreferences };
      } else {
        debugLog(`No VESPA scores record found for ${userEmail}`);
        // Default to showing both if no record found
        return { 
          scores: null, 
          displayPreferences: { 
            showVespaScores: true, 
            showAcademicProfile: true 
          } 
        };
      }
    } catch (error) {
      debugLog('[Homepage] Error fetching VESPA scores', { error: error.message, stack: error.stack });
      // Default to showing both on error
      return { 
        scores: null, 
        displayPreferences: { 
          showVespaScores: true, 
          showAcademicProfile: true 
        } 
      };
    }
  }

  // --- UI Rendering ---
  // Render the main homepage UI
  function renderHomepage(userProfile, flashcardReviewCounts, studyPlannerData, taskboardData, vespaScoresData) {
    const container = document.querySelector(window.HOMEPAGE_CONFIG.elementSelector);
    if (!container) {
      if (DEBUG_MODE) console.error('[Homepage] Container element not found.');
      return;
    }
    
    // Clear the container
    container.innerHTML = '';
    
    // Add the CSS link
    const styleId = 'academic-profile-styles-link';
    if (!document.getElementById(styleId)) {
      const linkElement = document.createElement('link');
      linkElement.id = styleId;
      linkElement.rel = 'stylesheet';
      linkElement.type = 'text/css';
      linkElement.href = 'https://cdn.jsdelivr.net/gh/4Sighteducation/FlashcardLoader@main/integrations/landingPage/academicProfile1g.css'; // Verified CSS path
      document.head.appendChild(linkElement);
      debugLog("Linked central stylesheet: academicProfile1g.css");
    }
    
    // Add Font Awesome for professional icons - using same approach as staff homepage
    const fontAwesomeLink = document.createElement('link');
    fontAwesomeLink.rel = 'stylesheet';
    fontAwesomeLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
    document.head.appendChild(fontAwesomeLink);
    debugLog("Added Font Awesome 6.4.0 CDN link");
    
    // --- Reinstated subject parsing and profileData creation --- 
    const subjectData = [];
    if (userProfile) { // Check if userProfile is defined
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
                    debugLog(`[Homepage] Error parsing subject data for ${fieldKey}`, { error: e.message });
                }
            }
        }
    }

    const profileData = {
        name: userProfile ? (userProfile[FIELD_MAPPING.studentName] || 'Student') : 'Student',
        school: userProfile ? (userProfile[FIELD_MAPPING.vespaCustomer] || '') : '',
        tutorGroup: userProfile ? (userProfile[FIELD_MAPPING.tutorGroup] || '') : '',
        yearGroup: userProfile ? (userProfile[FIELD_MAPPING.yearGroup] || '') : '',
        attendance: userProfile ? (userProfile[FIELD_MAPPING.attendance] || '') : '',
        subjects: subjectData // This now contains the parsed subjects
    };
    debugLog('Processed profileData for rendering:', profileData);
    // --- End of reinstated logic ---

    // Extract display preferences
    const displayPreferences = vespaScoresData?.displayPreferences || { 
      showVespaScores: true, 
      showAcademicProfile: true 
    };
    const actualScores = vespaScoresData?.scores || null;

    // Add content to the container
    container.innerHTML += `
      <div id="vespa-homepage">
        ${displayPreferences.showAcademicProfile ? renderProfileSection(profileData, actualScores, displayPreferences.showVespaScores) : ''}
        ${!displayPreferences.showAcademicProfile && displayPreferences.showVespaScores ? renderStandaloneVespaSection(actualScores) : ''}
        <div class="app-hubs-container">
          ${renderAppHubSection('VESPA Hub', APP_HUBS.vespa)}
          ${renderAppHubSection('Productivity Hub', APP_HUBS.productivity, flashcardReviewCounts, studyPlannerData, taskboardData)}
        </div>
      </div>
    `;
    
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
    
    // Initialize tooltips
    setupTooltips();
    // Initialize profile info tooltip
    setupProfileInfoTooltip();
  }
  
  // New function to render VESPA Questionnaire section
  function renderVespaQuestionnaireSection() {
    return `
      <div class="vespa-questionnaire-inner">
        <h3 class="vespa-questionnaire-title">
          About the VESPA Questionnaire
          <span class="vespa-questionnaire-authors">
            <img src="https://vespa.academy/assets/martingriffin.jpg" alt="Martin Griffin" class="author-photo">
            <img src="https://vespa.academy/assets/stevoakes1.png" alt="Steve Oakes" class="author-photo">
          </span>
        </h3>
        <div class="vespa-questionnaire-content">
          <p class="vespa-quote">"Hi there! We're the creators of the VESPA Questionnaire, and we're delighted you've completed it and seen your personalized scores. Keep in mind that your results capture how you see yourself right now—an insightful snapshot, not a fixed verdict"</p>
          <div class="vespa-highlight-box">
            <p><strong>"Most importantly, the VESPA Questionnaire isn't just about measuring your current mindset—it's designed to motivate growth and spark meaningful change. Use these insights as the starting point for coaching conversations, team discussions, goal-setting, and your ongoing development."</strong></p>
          </div>
        </div>
      </div>
    `;
  }
  
  // Render VESPA sections when academic profile is hidden
  function renderStandaloneVespaSection(vespaScoresData) {
    return `
      <section class="vespa-section vespa-standalone-section">
        ${renderVespaQuestionnaireSection()}
        ${vespaScoresData ? renderVespaCirclesHTML(vespaScoresData) : ''}
      </section>
    `;
  }
  
  // Render the profile section
  function renderProfileSection(profileData, vespaScoresData, showVespaScores) {
    const name = sanitizeField(profileData.name);
    
    // Fix for school field - handle if it's an object - improved to handle connection fields better
    let schoolDisplay = 'N/A';
    if (profileData.school) {
      // Log the school field to debug
      debugLog('School field value for profile rendering', profileData.school);
      
      if (typeof profileData.school === 'object' && profileData.school !== null) {
        // Check for raw versions first
        if (profileData.school.field_122_raw) {
          schoolDisplay = sanitizeField(profileData.school.field_122_raw.identifier || 
                        profileData.school.field_122_raw.name || 'VESPA ACADEMY');
        }
        // For Knack connection fields, use the text property which often contains the display name
        else if (profileData.school.text) {
          schoolDisplay = sanitizeField(profileData.school.text);
        }
        // Try to get the display name from various properties
        else if (profileData.school.identifier) {
          schoolDisplay = sanitizeField(profileData.school.identifier);
        }
        else if (profileData.school.name) {
          schoolDisplay = sanitizeField(profileData.school.name);
        }
        // If all else fails, fall back to "VESPA ACADEMY" rather than showing the raw JSON
        else {
          schoolDisplay = "VESPA ACADEMY";
        }
      } else if (typeof profileData.school === 'string') {
        // If it's just a string, use it directly
        schoolDisplay = sanitizeField(profileData.school);
      }
    }
    
    const tutorGroup = sanitizeField(profileData.tutorGroup);
    const yearGroup = sanitizeField(profileData.yearGroup);
    const attendance = sanitizeField(profileData.attendance);
    
    // Helper function to compare grades and return appropriate CSS class
    function getGradeColorClass(grade, minExpected, examType) {
      if (!grade || !minExpected || grade === 'N/A' || minExpected === 'N/A') {
        return '';
      }

      const gradeStr = String(grade);
      const minExpectedStr = String(minExpected);

      // A-Level specific logic
      const gradeOrder = ['A*', 'A', 'B', 'C', 'D', 'E', 'U'];
      const gradeVal = gradeOrder.indexOf(gradeStr.toUpperCase());
      const minExpectedVal = gradeOrder.indexOf(minExpectedStr.toUpperCase());

      if (gradeVal !== -1 && minExpectedVal !== -1) { // A-Level style grades
        if (gradeVal < minExpectedVal) { // Grade is better than expected
          return (minExpectedVal - gradeVal >= 2) ? 'grade-significantly-above' : 'grade-above';
        }
        if (gradeVal === minExpectedVal) return 'grade-matching';
        // Grade is below expected
        if (gradeVal - minExpectedVal === 1) return 'grade-one-below';
        if (gradeVal - minExpectedVal === 2) return 'grade-two-below';
        if (gradeVal - minExpectedVal >= 3) return 'grade-far-below';
        return '';
      }

      // GCSE/Numerical specific logic
      const numGrade = parseFloat(gradeStr);
      const numMinExpected = parseFloat(minExpectedStr);

      if (!isNaN(numGrade) && !isNaN(numMinExpected)) {
        const diff = numGrade - numMinExpected;
        if (diff >= 2) return 'grade-significantly-above';
        if (diff === 1) return 'grade-above';
        if (diff === 0) return 'grade-matching';
        if (diff === -1) return 'grade-one-below';
        if (diff === -2) return 'grade-two-below';
        if (diff <= -3) return 'grade-far-below';
        return '';
      }
      
      // Vocational grades handling (reinstated and updated for 6-tier RAG)
      if (examType === 'Vocational') {
        const vocationGradeValues = {
          'D*': 4, 'D*D*': 8, 'D*D*D*': 12,
          'D': 3, 'DD': 6, 'DDD': 9,
          'M': 2, 'MM': 4, 'MMM': 6,
          'P': 1, 'PP': 2, 'PPP': 3,
          'D*D': 7, 'D*DD': 10, 
          'DM': 5, 'DMM': 7,
          'MP': 3, 'MPP': 4
          // Add any other combined grades if necessary
        };

        const currentGradeValue = vocationGradeValues[gradeStr.toUpperCase()] || 0;
        const expectedGradeValue = vocationGradeValues[minExpectedStr.toUpperCase()] || 0;

        if (currentGradeValue && expectedGradeValue) {
          const diff = currentGradeValue - expectedGradeValue;
          if (diff >= 2) return 'grade-significantly-above';
          if (diff === 1) return 'grade-above';
          if (diff === 0) return 'grade-matching';
          if (diff === -1) return 'grade-one-below';
          if (diff === -2) return 'grade-two-below';
          if (diff <= -3) return 'grade-far-below';
          return '';
        }
      }
      
      // Fallback if examType doesn't match or for other types not explicitly handled
      if (gradeStr === minExpectedStr) return 'grade-matching';
      // Basic comparison if no other rules hit - consider if this is too simple
      // For example, if grade > minExpected, it could be 'grade-above'
      // but without knowing the scale, it's hard to determine significance.
      // Defaulting to no class or a simple match is safer here.

      return ''; // Default no class
    }
    
    // Render all subjects in a single grid with color coding by type
    let subjectsHTML = '';
    if (profileData.subjects && profileData.subjects.length > 0) {
      profileData.subjects.forEach(subject => {
        // Determine the card type based on exam type
        let qualTypeClass = '';
        const examType = (subject.examType || '').trim().toLowerCase(); // Normalize to lowercase for easier matching

        // Map examType to a specific CSS class
        if (examType === 'a-level') {
          qualTypeClass = 'qual-a-level';
        } else if (examType === 'btec (2016)') {
          qualTypeClass = 'qual-btec-2016';
        } else if (examType === 'btec (2010)') {
          qualTypeClass = 'qual-btec-2010';
        } else if (examType === 'ib') {
          qualTypeClass = 'qual-ib';
        } else if (examType === 'pre-u') {
          qualTypeClass = 'qual-pre-u';
        } else if (examType === 'ual') {
          qualTypeClass = 'qual-ual';
        } else if (examType === 'wjec') {
          qualTypeClass = 'qual-wjec';
        } else if (examType === 'cache') {
          qualTypeClass = 'qual-cache';
        } else if (examType === 'gcse') {
          qualTypeClass = 'qual-gcse';
        } else if (examType === 'vocational') { // Fallback for generic vocational if still used
          qualTypeClass = 'qual-vocational-generic'; 
        } else if (examType) { // Fallback for any other non-empty examType
          qualTypeClass = 'qual-' + examType.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        }
        
        // Get color classes for current and target grades, passing the exam type for proper handling
        const currentGradeClass = getGradeColorClass(
          subject.currentGrade,
          subject.subjectTargetGrade || subject.minimumExpectedGrade, // Use STG for comparison, fallback to MEG
          examType
        );
        
        const targetGradeClass = getGradeColorClass(
          subject.targetGrade,
          subject.subjectTargetGrade || subject.minimumExpectedGrade, // Use STG for comparison, fallback to MEG
          examType
        );
        
        let optionalGradesHTML = '';
        if (subject.effortGrade && subject.effortGrade !== 'N/A') {
          optionalGradesHTML += `<div class="optional-grade-item"><span class="optional-grade-label">Eff:</span>${subject.effortGrade}</div>`;
        }
        if (subject.behaviourGrade && subject.behaviourGrade !== 'N/A') {
          optionalGradesHTML += `<div class="optional-grade-item"><span class="optional-grade-label">Beh:</span>${subject.behaviourGrade}</div>`;
        }
        if (subject.subjectAttendance && subject.subjectAttendance !== 'N/A') {
          optionalGradesHTML += `<div class="optional-grade-item"><span class="optional-grade-label">Att:</span>${formatAsPercentage(subject.subjectAttendance)}</div>`; // Format as percentage
        }
        
        subjectsHTML += `
          <div class="subject-card ${qualTypeClass}">
            <div class="subject-name">${sanitizeField(subject.subject || '')}</div>
            <div class="subject-meta">
              ${subject.examType ? sanitizeField(subject.examType) : 'N/A'}
              ${subject.examBoard ? ` • ${sanitizeField(subject.examBoard)}` : ''}
            </div>
            <div class="grades-container">
              <div class="grade-item">
                <div class="grade-label">MEG <span class="meg-info-button" title="Understanding MEG">i</span></div>
                <div class="grade-value grade-meg"><span class="grade-text">${sanitizeField(subject.minimumExpectedGrade || 'N/A')}</span></div>
              </div>
              <div class="grade-item">
                <div class="grade-label">STG</div>
                <div class="grade-value grade-stg"><span class="grade-text">${sanitizeField(subject.subjectTargetGrade || subject.minimumExpectedGrade || 'N/A')}</span></div>
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
            ${ optionalGradesHTML ? `<div class="optional-grades-container">${optionalGradesHTML}</div>` : '' }
          </div>
        `;
      });
    } 
    return `
      <section class="vespa-section profile-section">
        <h2 class="vespa-section-title">
          Student Profile
          <span class="profile-info-button" title="Understanding Your Grades">i</span>
        </h2>
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
        ${renderVespaQuestionnaireSection()}
        ${showVespaScores ? renderVespaCirclesHTML(vespaScoresData) : ''}
      </section>
    `;
  }

  // Helper to render VESPA score circles HTML (to be used within renderProfileSection)
  function renderVespaCirclesHTML(scoresData) {
    if (!scoresData) return '';

    let scoresCircleHTML = '';
    const scoreOrder = ['vision', 'effort', 'systems', 'practice', 'attitude', 'overall'];

    scoreOrder.forEach(key => {
      if (scoresData[key] && scoresData[key] !== 'N/A') { // Also check for 'N/A'
        const scoreValue = sanitizeField(scoresData[key]);
        const color = VESPA_SCORE_COLORS[key] || '#cccccc';
        const textColor = (key === 'overall' && color === '#f3f553') ? '#333333' : '#ffffff';
        scoresCircleHTML += `
          <div class="vespa-score-item">
            <div class="vespa-score-circle" style="background-color: ${color}; color: ${textColor};">
              <span>${scoreValue}</span>
            </div>
            <div class="vespa-score-label">${key.toUpperCase()}</div>
          </div>
        `;
      }
    });

    if (!scoresCircleHTML) {
      return ''; // Don't render section if no scores to show
    }

    return `
      <div class="profile-vespa-scores-container">
        <h3 class="profile-vespa-scores-title">Current VESPA Scores</h3>
        <div class="vespa-scores-grid">
          ${scoresCircleHTML}
        </div>
      </div>
    `;
  }
  
  // Keep track of tooltip elements for proper cleanup
  let tooltipElements = [];
  
  // Cleanup function to remove all tooltip elements when homepage is unloaded
  function cleanupTooltips() {
    // Remove any app data tooltips (our new hover tooltips)
    const existingAppDataTooltips = document.querySelectorAll('.app-data-tooltip');
    existingAppDataTooltips.forEach(tooltip => {
      if (tooltip && tooltip.parentNode) {
        tooltip.parentNode.removeChild(tooltip);
      }
    });
    // Remove other legacy tooltips if any were missed by specific class cleanup
    const legacyTooltips = document.querySelectorAll('.vespa-tooltip, .tooltip-overlay, .tooltip-container');
    legacyTooltips.forEach(el => el.remove());
  }
  
  // Enhanced tooltip setup with better styling
  function setupTooltips() {
    debugLog("Setting up tooltips (v3 - position debug)", null);
    
    cleanupTooltips(); 

    const appCardsWithData = document.querySelectorAll('.app-card[data-app-type]');
    let activeDataTooltip = null; 
    let tooltipHideTimeout = null;

    appCardsWithData.forEach(card => {
      card.addEventListener('mouseenter', function(e) {
        // e.preventDefault(); // Removed: Not necessary for mouseenter on a div
        e.stopPropagation();
        // console.log("[Homepage] Mouse enter on app card TYPE:", this.dataset.appType); 

        if (tooltipHideTimeout) {
          clearTimeout(tooltipHideTimeout);
          tooltipHideTimeout = null;
        }
        if (activeDataTooltip) { 
          activeDataTooltip.remove(); 
          activeDataTooltip = null;
        }

        const appType = this.dataset.appType;
        let tooltipContentHTML = '';

        if (appType === 'flashcards') {
          const totalBadge = this.querySelector('.flashcard-notification-badge');
          if (!totalBadge || parseInt(totalBadge.textContent || '0', 10) === 0) return;

          const box1Due = this.dataset.box1DueCount || '0';
          const box1Total = this.dataset.box1TotalCount || '0';
          const box2Due = this.dataset.box2DueCount || '0';
          const box2Total = this.dataset.box2TotalCount || '0';
          const box3Due = this.dataset.box3DueCount || '0';
          const box3Total = this.dataset.box3TotalCount || '0';
          const box4Due = this.dataset.box4DueCount || '0';
          const box4Total = this.dataset.box4TotalCount || '0';
          const box5Due = this.dataset.box5DueCount || '0';
          const box5Total = this.dataset.box5TotalCount || '0';
          
          tooltipContentHTML = `<h4>Flashcards:</h4>
            Box 1 (Daily):       ${box1Due} due / ${box1Total} total<br>
            Box 2 (Every Other): ${box2Due} due / ${box2Total} total<br>
            Box 3 (Every 3 Days):  ${box3Due} due / ${box3Total} total<br>
            Box 4 (Weekly):      ${box4Due} due / ${box4Total} total<br>
            Box 5 (3 Weeks):    ${box5Due} due / ${box5Total} total`;
        } else if (appType === 'study-planner') {
          const totalBadge = this.querySelector('.study-planner-notification-badge');
          if (!totalBadge || parseInt(totalBadge.textContent || '0', 10) === 0) return;
          const sessionsDetails = safeParseJSON(this.dataset.sessionsDetails || '[]');
          tooltipContentHTML = `<h4>This Week\'s Sessions:</h4>`;
          if (sessionsDetails.length > 0) {
            tooltipContentHTML += `<ul>${sessionsDetails.map(s => `<li>${s}</li>`).join('')}</ul>`;
          } else {
            tooltipContentHTML += `No sessions scheduled for this week.`;
          }
        } else if (appType === 'taskboard') {
          const totalBadge = this.querySelector('.taskboard-notification-badge');
          if (!totalBadge || parseInt(totalBadge.textContent || '0', 10) === 0) return;
          const pendingHot = parseInt(this.dataset.pendingHot || '0', 10);
          const pendingWarm = parseInt(this.dataset.pendingWarm || '0', 10);
          const pendingCold = parseInt(this.dataset.pendingCold || '0', 10);
          const doingTitles = safeParseJSON(this.dataset.doingTitles || '[]');
          tooltipContentHTML = '';
          if (pendingHot > 0 || pendingWarm > 0 || pendingCold > 0) {
            tooltipContentHTML += `<h4>Pending Tasks:</h4><ul>`;
            if (pendingHot > 0) tooltipContentHTML += `<li>🔥 Hot: ${pendingHot}</li>`;
            if (pendingWarm > 0) tooltipContentHTML += `<li>☀️ Warm: ${pendingWarm}</li>`;
            if (pendingCold > 0) tooltipContentHTML += `<li>❄️ Cold: ${pendingCold}</li>`;
            tooltipContentHTML += `</ul>`;
          }
          if (doingTitles.length > 0) {
            tooltipContentHTML += `${(pendingHot > 0 || pendingWarm > 0 || pendingCold > 0) ? '<hr style="border-color: rgba(0, 229, 219, 0.3); margin: 8px 0;">' : ''}<h4>Currently Doing:</h4><ul>${doingTitles.map(t => `<li>${t}</li>`).join('')}</ul>`;
          }
        }
        
        if (!tooltipContentHTML) return;

        activeDataTooltip = document.createElement('div'); 
        activeDataTooltip.id = 'activeAppDataTooltip'; 
        activeDataTooltip.className = 'app-data-tooltip';
        activeDataTooltip.innerHTML = tooltipContentHTML;
        document.body.appendChild(activeDataTooltip); 

        const cardRect = this.getBoundingClientRect();
        const tooltipRect = activeDataTooltip.getBoundingClientRect(); 
        
        debugLog("Tooltip Positioning Debug", {
            cardRect: { top: cardRect.top, left: cardRect.left, width: cardRect.width, height: cardRect.height },
            tooltipRect: { width: tooltipRect.width, height: tooltipRect.height },
            scrollY: window.scrollY,
            scrollX: window.scrollX,
            innerWidth: window.innerWidth
        });

        let top = cardRect.top + window.scrollY - tooltipRect.height - 10; // Default above the card
        let left = cardRect.left + window.scrollX + (cardRect.width / 2) - (tooltipRect.width / 2);

        if (top < window.scrollY) { 
          top = cardRect.bottom + window.scrollY + 10; 
        }
        if (left < window.scrollX) {
          left = window.scrollX + 5;
        }
        if (left + tooltipRect.width > window.scrollX + window.innerWidth) {
          left = window.scrollX + window.innerWidth - tooltipRect.width - 5;
        }
        debugLog("Calculated tooltip top, left", { top, left });

        activeDataTooltip.style.top = `${top}px`;
        activeDataTooltip.style.left = `${left}px`;
        
        void activeDataTooltip.offsetWidth; 
        activeDataTooltip.classList.add('visible');
      });

      card.addEventListener('mouseleave', function() {
        // console.log("[Homepage] Mouse leave on app card TYPE:", this.dataset.appType);
        if (tooltipHideTimeout) {
            clearTimeout(tooltipHideTimeout);
        }
        if (activeDataTooltip) {
          activeDataTooltip.classList.remove('visible');
          tooltipHideTimeout = setTimeout(() => {
              if (activeDataTooltip) { // Check if it wasn't replaced by another mouseenter
                  activeDataTooltip.remove();
                  activeDataTooltip = null; 
              }
              tooltipHideTimeout = null;
          }, 200); // Match CSS transition time for opacity
        }
      });
    });
  }
  
  // Render an app hub section
  function renderAppHubSection(title, apps, flashcardReviewCounts = null, studyPlannerData = null, taskboardData = null) {
    let appsHTML = '';
    
    apps.forEach(app => {
      let notificationBadgeHTML = '';
      let cardDataAttributes = '';

      if (app.name === "Flashcards" && flashcardReviewCounts && flashcardReviewCounts.totalDue > 0) {
        notificationBadgeHTML = `<span class="flashcard-notification-badge">${flashcardReviewCounts.totalDue}</span>`;
        cardDataAttributes = ` data-app-type="flashcards"
                               data-box1-due-count="${flashcardReviewCounts.box1.due}" 
                               data-box1-total-count="${flashcardReviewCounts.box1.total}" 
                               data-box2-due-count="${flashcardReviewCounts.box2.due}" 
                               data-box2-total-count="${flashcardReviewCounts.box2.total}" 
                               data-box3-due-count="${flashcardReviewCounts.box3.due}" 
                               data-box3-total-count="${flashcardReviewCounts.box3.total}" 
                               data-box4-due-count="${flashcardReviewCounts.box4.due}" 
                               data-box4-total-count="${flashcardReviewCounts.box4.total}" 
                               data-box5-due-count="${flashcardReviewCounts.box5.due}" 
                               data-box5-total-count="${flashcardReviewCounts.box5.total}"`;
      } else if (app.name === "Study Planner" && studyPlannerData && studyPlannerData.count > 0) {
        notificationBadgeHTML = `<span class="study-planner-notification-badge">${studyPlannerData.count}</span>`;
        cardDataAttributes = ` data-app-type="study-planner"
                               data-sessions-details=\'${JSON.stringify(studyPlannerData.sessionsDetails)}\'`; 
      } else if (app.name === "Taskboard" && taskboardData && taskboardData.doingCount > 0) {
        notificationBadgeHTML = `<span class="taskboard-notification-badge">${taskboardData.doingCount}</span>`;
        cardDataAttributes = ` data-app-type="taskboard"
                               data-pending-hot="${taskboardData.pendingHot}"
                               data-pending-warm="${taskboardData.pendingWarm}"
                               data-pending-cold="${taskboardData.pendingCold}"
                               data-doing-titles=\'${JSON.stringify(taskboardData.doingTaskTitles)}\'`;
      }

      // Ensure no title attribute on the link to prevent default browser tooltip
      appsHTML += `
        <div class="app-card"${cardDataAttributes}>
          <a href="${app.url}" class="app-card-link"> 
            <div class="app-card-header">
              ${notificationBadgeHTML}
              <div class="app-icon-container">
                ${app.iconType === 'fontawesome' ? 
                  `<i class="${app.icon} app-icon-fa"></i>` : 
                  `<img src="${app.icon}" alt="${app.name}" class="app-icon">`
                }
              </div>
              <div class="app-name">${sanitizeField(app.name)}</div>
            </div>
          </a>
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
  
  // --- User Verification Functions ---
  // Check user verification status and show appropriate modals
  async function checkUserVerificationStatus() {
    try {
      const user = Knack.getUserAttributes();
      if (!user || !user.email) {
        debugLog("Cannot check verification status: No user data");
        return true; // Allow access on error
      }
      
      // Find the student record to check verification fields
      const studentRecord = await findStudentRecord(user.email);
      if (!studentRecord) {
        debugLog("Cannot find student record for verification check");
        return true; // Allow access if we can't find the record
      }
      
      // Extract the boolean field values (they come as "Yes"/"No" strings in Knack)
      const isVerified = studentRecord.field_189 === "Yes";  // CORRECTED FIELD
      const hasAcceptedPrivacy = studentRecord.field_127 === "Yes";
      const hasResetPassword = studentRecord.field_539 === "No";  // CORRECTED LOGIC - "No" means they HAVE reset
      
      debugLog(`User verification status:`, {
        verified: isVerified,
        privacyAccepted: hasAcceptedPrivacy,
        passwordReset: hasResetPassword,
        rawValues: {
          field_189: studentRecord.field_189,
          field_127: studentRecord.field_127,
          field_539: studentRecord.field_539
        }
      });
      
      // Determine what needs to be shown based on the correct logic
      let needsPrivacy = false;
      let needsPassword = false;
      
      // First time user: All fields are "No" - show both privacy and password
      if (!isVerified && !hasAcceptedPrivacy && !hasResetPassword) {
        needsPrivacy = true;
        needsPassword = true;
        debugLog("First time user - showing both privacy and password modals");
      }
      // User has reset password but needs to accept privacy: field_189="Yes", field_539="No", field_127="No"
      else if (isVerified && hasResetPassword && !hasAcceptedPrivacy) {
        needsPrivacy = true;
        needsPassword = false;
        debugLog("User needs to accept privacy policy only");
      }
      // User accepted privacy but needs password reset: field_189="No", field_539="Yes", field_127="Yes"
      else if (!isVerified && !hasResetPassword && hasAcceptedPrivacy) {
        needsPrivacy = false;
        needsPassword = true;
        debugLog("User needs to reset password only");
      }
      // All complete: field_189="Yes", field_539="No", field_127="Yes"
      else if (isVerified && hasResetPassword && hasAcceptedPrivacy) {
        debugLog("User verification complete - allowing access");
        return true;
      }
      else {
        // Edge case - log the state and default to showing what's missing
        console.warn("[Homepage] Unexpected verification state", {
          isVerified, hasAcceptedPrivacy, hasResetPassword
        });
        needsPrivacy = !hasAcceptedPrivacy;
        needsPassword = !hasResetPassword;
      }
      
      // Show appropriate modals if needed
      if (needsPrivacy || needsPassword) {
        return await showVerificationModals(needsPrivacy, needsPassword, studentRecord.id);
      }
      
      // All checks passed
      return true;
    } catch (error) {
      debugLog("Error in checkUserVerificationStatus:", error);
      return true; // Allow access on error
    }
  }

  // Show verification modals based on what's needed
  async function showVerificationModals(needsPrivacy, needsPassword, studentRecordId) {
    return new Promise((resolve) => {
      // Create modal container
      const modalHTML = `
        <div id="verification-modal-overlay" style="
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.8);
          z-index: 100000;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div id="verification-modal-container" style="
            background: linear-gradient(135deg, #23356f 0%, #1a2754 100%);
            border: 3px solid #079baa;
            border-radius: 10px;
            max-width: 600px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
          ">
            ${needsPrivacy ? getPrivacyPolicyModal() : ''}
            ${needsPassword ? getPasswordResetModal() : ''}
          </div>
        </div>
      `;
      
      // Add modal to page
      document.body.insertAdjacentHTML('beforeend', modalHTML);
      
      // Handle modal flow
      if (needsPrivacy) {
        setupPrivacyPolicyHandlers(studentRecordId, needsPassword, resolve);
      } else if (needsPassword) {
        setupPasswordResetHandlers(studentRecordId, resolve);
      }
    });
  }

  // Privacy Policy Modal HTML - Using student privacy policy URL
  function getPrivacyPolicyModal() {
    return `
      <div id="privacy-policy-modal" class="verification-modal" style="padding: 30px; color: white;">
        <h2 style="color: #079baa; margin-bottom: 20px; text-align: center;">Privacy Policy Agreement</h2>
        
        <div style="background: rgba(255, 255, 255, 0.1); padding: 20px; border-radius: 8px; margin-bottom: 20px; max-height: 400px; overflow-y: auto;">
          <iframe src="https://vespa.academy/assets/MVIMAGES/student-privacy-policy.html" 
                  style="width: 100%; height: 350px; border: none; background: white; border-radius: 4px;"
                  title="Privacy Policy">
          </iframe>
        </div>
        
        <div style="margin: 20px 0;">
          <label style="display: flex; align-items: center; cursor: pointer; font-size: 16px;">
            <input type="checkbox" id="privacy-accept-checkbox" style="margin-right: 10px; width: 20px; height: 20px; cursor: pointer;">
            <span>I have read and agree to the VESPA Academy Privacy Policy</span>
          </label>
        </div>
        
        <div style="text-align: center; margin-top: 20px;">
          <button id="privacy-continue-btn" disabled style="
            background: #666;
            color: white;
            border: none;
            padding: 12px 30px;
            border-radius: 6px;
            font-size: 16px;
            font-weight: bold;
            cursor: not-allowed;
            transition: all 0.3s ease;
          ">
            Continue
          </button>
        </div>
      </div>
    `;
  }

  // Password Reset Modal HTML
  function getPasswordResetModal() {
    return `
      <div id="password-reset-modal" class="verification-modal" style="padding: 30px; color: white; display: none;">
        <h2 style="color: #079baa; margin-bottom: 20px; text-align: center;">Set Your Password</h2>
        
        <p style="text-align: center; margin-bottom: 20px; color: #ccc;">
          Please set a new password for your account to continue.
        </p>
        
        <form id="password-reset-form" style="max-width: 400px; margin: 0 auto;">
          <div style="margin-bottom: 20px;">
            <label for="new-password" style="display: block; margin-bottom: 5px; font-weight: bold;">
              New Password
            </label>
            <input type="password" id="new-password" required style="
              width: 100%;
              padding: 10px;
              border-radius: 4px;
              border: 1px solid #079baa;
              background: rgba(255, 255, 255, 0.1);
              color: white;
              font-size: 16px;
            " placeholder="Enter new password">
          </div>
          
          <div style="margin-bottom: 20px;">
            <label for="confirm-password" style="display: block; margin-bottom: 5px; font-weight: bold;">
              Confirm Password
            </label>
            <input type="password" id="confirm-password" required style="
              width: 100%;
              padding: 10px;
              border-radius: 4px;
              border: 1px solid #079baa;
              background: rgba(255, 255, 255, 0.1);
              color: white;
              font-size: 16px;
            " placeholder="Confirm new password">
          </div>
          
          <div id="password-error" style="color: #ff6b6b; margin-bottom: 20px; display: none;"></div>
          
          <div style="text-align: center;">
            <button type="submit" id="password-submit-btn" style="
              background: #079baa;
              color: white;
              border: none;
              padding: 12px 30px;
              border-radius: 6px;
              font-size: 16px;
              font-weight: bold;
              cursor: pointer;
              transition: all 0.3s ease;
            ">
              Set Password
            </button>
          </div>
        </form>
      </div>
    `;
  }

  // Setup Privacy Policy Modal Handlers
  function setupPrivacyPolicyHandlers(studentRecordId, needsPassword, resolve) {
    const checkbox = document.getElementById('privacy-accept-checkbox');
    const continueBtn = document.getElementById('privacy-continue-btn');
    
    // Ensure button starts in correct state
    if (checkbox && continueBtn) {
      continueBtn.disabled = true;
      continueBtn.style.background = '#666';
      continueBtn.style.cursor = 'not-allowed';
    }
    
    // Enable/disable continue button based on checkbox
    if (checkbox) {
      checkbox.addEventListener('change', function() {
        if (this.checked) {
          continueBtn.disabled = false;
          continueBtn.style.background = '#079baa';
          continueBtn.style.cursor = 'pointer';
        } else {
          continueBtn.disabled = true;
          continueBtn.style.background = '#666';
          continueBtn.style.cursor = 'not-allowed';
        }
      });
    }
    
    // Handle continue button click
    if (continueBtn) {
      continueBtn.addEventListener('click', async function() {
        if (!checkbox.checked) return;
        
        // Show loading state
        continueBtn.disabled = true;
        continueBtn.innerHTML = 'Updating...';
        
        try {
          // Update the privacy policy field
          await updateStudentVerificationFields(studentRecordId, { field_127: "Yes" });
          
          debugLog('Privacy policy acceptance updated successfully');
          
          // Hide privacy modal
          const privacyModal = document.getElementById('privacy-policy-modal');
          if (privacyModal) privacyModal.style.display = 'none';
          
          // Show password modal if needed
          if (needsPassword) {
            const passwordModal = document.getElementById('password-reset-modal');
            if (passwordModal) passwordModal.style.display = 'block';
            setupPasswordResetHandlers(studentRecordId, resolve);
          } else {
            // All done, close modal and proceed
            document.getElementById('verification-modal-overlay').remove();
            resolve(true);
          }
        } catch (error) {
          debugLog('Error updating privacy policy acceptance:', error);
          alert('Error updating your preferences. Please try again.');
          continueBtn.disabled = false;
          continueBtn.innerHTML = 'Continue';
        }
      });
    }
  }

  // Setup Password Reset Modal Handlers
  function setupPasswordResetHandlers(studentRecordId, resolve) {
    const form = document.getElementById('password-reset-form');
    const newPassword = document.getElementById('new-password');
    const confirmPassword = document.getElementById('confirm-password');
    const errorDiv = document.getElementById('password-error');
    const submitBtn = document.getElementById('password-submit-btn');
    
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      // Clear previous errors
      errorDiv.style.display = 'none';
      errorDiv.innerHTML = '';
      
      // Validate passwords
      if (newPassword.value.length < 8) {
        errorDiv.innerHTML = 'Password must be at least 8 characters long.';
        errorDiv.style.display = 'block';
        return;
      }
      
      if (newPassword.value !== confirmPassword.value) {
        errorDiv.innerHTML = 'Passwords do not match.';
        errorDiv.style.display = 'block';
        return;
      }
      
      // Show loading state
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Setting Password...';
      
      try {
        // Update password via Knack API
        await updateUserPassword(newPassword.value);
        
        // Update the password field and verification flags with CORRECTED logic
        await updateStudentVerificationFields(studentRecordId, { 
          field_71: newPassword.value,  // Update the actual password field
          field_539: "No",               // CORRECTED: "No" means password HAS been reset
          field_189: "Yes"               // CORRECTED: Mark user as verified using correct field
        });
        
        debugLog('Password and verification status updated successfully');
        
        // Success - close modal and proceed
        document.getElementById('verification-modal-overlay').remove();
        resolve(true);
        
        // Show success message
        alert('Password set successfully! You can now access the platform.');
        
      } catch (error) {
        debugLog('Error setting password:', error);
        errorDiv.innerHTML = 'Error setting password. Please try again.';
        errorDiv.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Set Password';
      }
    });
  }

  // Update student verification fields
  async function updateStudentVerificationFields(studentRecordId, updates) {
    return await retryApiCall(() => {
      return new Promise((resolve, reject) => {
        $.ajax({
          url: `${KNACK_API_URL}/objects/object_6/records/${studentRecordId}`,
          type: 'PUT',
          headers: getKnackHeaders(),
          data: JSON.stringify(updates),
          contentType: 'application/json',
          success: resolve,
          error: reject
        });
      });
    });
  }

  // Update user password
  async function updateUserPassword(newPassword) {
    const user = Knack.getUserAttributes();
    
    // Use Knack's built-in API to update password
    return new Promise((resolve, reject) => {
      $.ajax({
        url: `${KNACK_API_URL}/applications/${Knack.application_id}/session`,
        type: 'PUT',
        headers: {
          'X-Knack-Application-Id': Knack.application_id,
          'Authorization': Knack.getUserToken(),
          'Content-Type': 'application/json'
        },
        data: JSON.stringify({
          password: newPassword
        }),
        success: resolve,
        error: reject
      });
    });
  }

  // --- Entry Point Function ---
  // Main initialization function, exposed globally
  window.initializeHomepage = async function() {
    debugLog("Initializing Homepage...");
    
    // Clean up any existing tooltips from previous sessions
    cleanupTooltips();
    
    // Get config from loader
    const config = window.HOMEPAGE_CONFIG;
    if (!config || !config.elementSelector) {
      if (DEBUG_MODE) console.error("Homepage Error: Missing configuration when initializeHomepage called.");
      return;
    }
    
    // Verify Knack context and authentication
    if (typeof Knack === 'undefined' || typeof Knack.getUserToken !== 'function') {
      if (DEBUG_MODE) console.error("Homepage Error: Knack context not available.");
      return;
    }
    
    const userToken = Knack.getUserToken();
    if (!userToken) {
      if (DEBUG_MODE) console.error("Homepage Error: User is not authenticated (no token).");
      return;
    }
    
    // Get user info from Knack
    const user = Knack.getUserAttributes();
    if (!user || !user.id) {
      if (DEBUG_MODE) console.error("Homepage Error: Cannot get user attributes.");
      return;
    }
    
    // Store user info globally
    window.currentKnackUser = user;
    debugLog("Current user:", user);
    
    // Check user verification status before proceeding
    try {
      const canProceed = await checkUserVerificationStatus();
      if (!canProceed) {
        // User needs to complete verification steps
        // The modals are already being shown
        debugLog("User verification required, showing modals");
        return;
      }
    } catch (error) {
      debugLog("Error checking user verification status:", error);
      // Continue anyway on error
    }
    
    // Find the target container - add more logging to troubleshoot
    debugLog(`Looking for container with selector: ${config.elementSelector}`);
    
    // Try alternative selectors if the main one fails
    let container = document.querySelector(config.elementSelector);
    
    if (!container) {
      debugLog(`Primary selector failed, trying alternatives...`, null);
      
      // Try alternative selectors
      const alternatives = [
        `.kn-view-${config.viewKey}`,         // Class based on view key
        `#${config.viewKey}`,                 // Direct ID
        `#kn-${config.viewKey}`,              // Knack prefixed ID
        `.kn-scene .kn-content`,              // Generic content area
        `.kn-form-view-${config.viewKey}`     // Form view class
      ];
      
      for (const altSelector of alternatives) {
        debugLog(`Trying alternative selector: ${altSelector}`);
        container = document.querySelector(altSelector);
        if (container) {
          debugLog(`Found container with alternative selector: ${altSelector}`);
          break;
        }
      }
    }
    
    // If still not found, report error
    if (!container) {
      debugLog(`Homepage Error: Container not found using selector: ${config.elementSelector} or alternatives`);
      
      // Dump the DOM structure to help debug
      debugLog(`DOM structure for debugging`, 
        { html: document.querySelector('.kn-content')?.innerHTML || 'No .kn-content found' });
      
      // Last resort - just use the body
      container = document.body;
      debugLog(`Using document.body as last resort container`);
    }
    
    // Show loading indicator
    container.innerHTML = `
      <div style="padding: 30px; text-align: center; color: #079baa; background-color: #23356f; border-radius: 8px; border: 2px solid #079baa; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);">
        <h3>Loading VESPA Homepage...</h3>
        <div style="margin-top: 20px;">
          <svg width="60" height="60" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
            <circle cx="25" cy="25" r="20" fill="none" stroke="#079baa" stroke-width="4">
              <animate attributeName="stroke-dasharray" dur="1.5s" values="1,150;90,150;90,150" repeatCount="indefinite"/>
              <animate attributeName="stroke-dashoffset" dur="1.5s" values="0;-35;-124" repeatCount="indefinite"/>
            </circle>
            <circle cx="25" cy="25" r="10" fill="none" stroke="rgba(7, 155, 170, 0.3)" stroke-width="2">
              <animate attributeName="r" dur="3s" values="10;15;10" repeatCount="indefinite"/>
              <animate attributeName="opacity" dur="3s" values="0.3;0.6;0.3" repeatCount="indefinite"/>
            </circle>
          </svg>
        </div>
      </div>
    `;
    
    try {
      // Find or create user profile
      const userProfile = await findOrCreateUserProfile(user.id, user.name, user.email);
      
      if (userProfile) {
        // Fetch and process flashcard review data
        let flashcardReviewCounts = { 
          totalDue: 0, 
          box1: { due: 0, total: 0 }, 
          box2: { due: 0, total: 0 }, 
          box3: { due: 0, total: 0 }, 
          box4: { due: 0, total: 0 }, 
          box5: { due: 0, total: 0 } 
        }; // Default
        try {
          const flashcardDataRecord = await fetchFlashcardReviewData(user.id);
          if (flashcardDataRecord) {
            flashcardReviewCounts = processFlashcardData(flashcardDataRecord);
          }
          debugLog('Flashcard Counts After Processing:', flashcardReviewCounts); // Explicit log
        } catch (fcError) {
          debugLog("[Homepage] Error fetching or processing flashcard data", { error: fcError.message });
          // Keep default counts (all zeros) if there's an error
        }
        
        // Fetch and process Study Planner data
        let studyPlannerNotificationData = { count: 0, sessionsDetails: [] }; // Default
        try {
          const studyPlannerJson = await fetchStudyPlannerData(user.id);
          if (studyPlannerJson) {
            studyPlannerNotificationData = processStudyPlannerData(studyPlannerJson);
          }
          debugLog('Study Planner Data After Processing:', studyPlannerNotificationData); // Explicit log
        } catch (spError) {
          debugLog("[Homepage] Error fetching or processing Study Planner data", { error: spError.message });
        }
        
        // Fetch and process Taskboard data
        let taskboardNotificationData = { doingCount: 0, pendingHot: 0, pendingWarm: 0, pendingCold: 0, doingTaskTitles: [] }; // Default
        try {
          const taskboardJson = await fetchTaskboardData(user.id);
          if (taskboardJson) {
            taskboardNotificationData = processTaskboardData(taskboardJson);
          }
          debugLog('Taskboard Data After Processing:', taskboardNotificationData); // Explicit log
        } catch (tbError) {
          debugLog("[Homepage] Error fetching or processing Taskboard data", { error: tbError.message });
        }

        // Fetch VESPA Scores
        let vespaScoresData = null;
        try {
          vespaScoresData = await fetchVespaScores(user.email);
          debugLog('VESPA Scores Data After Processing:', vespaScoresData);
        } catch (vsError) {
          debugLog("[Homepage] Error fetching or processing VESPA scores", { error: vsError.message });
        }
        
        // Render the homepage UI with all data
        renderHomepage(userProfile, flashcardReviewCounts, studyPlannerNotificationData, taskboardNotificationData, vespaScoresData);
      } else {
        container.innerHTML = `
          <div style="padding: 30px; text-align: center; color: #079baa; background-color: #23356f; border-radius: 8px; border: 2px solid #079baa; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);">
            <h3>Error Loading Homepage</h3>
            <p style="color: #ffffff;">Unable to load or create your user profile. Please try refreshing the page.</p>
            <button onclick="location.reload()" style="margin-top: 15px; background-color: #079baa; color: #ffffff; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold;">Refresh Page</button>
          </div>
        `;
      }
    } catch (error) {
      debugLog("Homepage Error during initialization", { error: error.message, stack: error.stack });
      container.innerHTML = `
        <div style="padding: 30px; text-align: center; color: #079baa; background-color: #23356f; border-radius: 8px; border: 2px solid #079baa; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);">
          <h3>Error Loading Homepage</h3>
          <p style="color: #ffffff;">An unexpected error occurred. Please try refreshing the page.</p>
          <button onclick="location.reload()" style="margin-top: 15px; background-color: #079baa; color: #ffffff; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold;">Refresh Page</button>
        </div>
      `;
    }
  };

  // Listen for Knack page changes to clean up tooltips
  $(document).on('knack-page-render.any', function() {
    if (typeof cleanupTooltips === 'function') {
      debugLog("Knack page render detected (knack-page-render.any), cleaning up tooltips.");
      cleanupTooltips();
    }
    // Also remove profile info tooltip if it exists
    const profileTooltip = document.getElementById('profileGradeInfoTooltip');
    if (profileTooltip && profileTooltip.parentNode) {
        profileTooltip.parentNode.removeChild(profileTooltip);
    }
    // Remove MEG tooltip if it exists
    const megTooltip = document.getElementById('megInfoTooltip');
    if (megTooltip && megTooltip.parentNode) {
        megTooltip.parentNode.removeChild(megTooltip);
    }
    // Remove verification modal if it exists
    const verificationModal = document.getElementById('verification-modal-overlay');
    if (verificationModal && verificationModal.parentNode) {
        verificationModal.parentNode.removeChild(verificationModal);
    }
  });

  // NEW: Setup for profile information tooltip
  function setupProfileInfoTooltip() {
    const infoButton = document.querySelector('.profile-info-button');
    const container = document.querySelector(window.HOMEPAGE_CONFIG.elementSelector) || document.body;

    if (infoButton) {
      infoButton.addEventListener('click', () => {
        // Remove existing tooltip if any
        const existingTooltip = document.getElementById('profileGradeInfoTooltip');
        if (existingTooltip) {
          existingTooltip.remove();
        }

        const tooltipHTML = `
          <div id="profileGradeInfoTooltip" class="profile-info-tooltip">
            <span class="profile-info-tooltip-close">&times;</span>
            <h4>Understanding Your Grades:</h4>
            <p><strong>1) Subject Target Grade (STG):</strong><br>
            Your STG is a more personalized target that considers not just your GCSE results, but also the specific subject you're studying. Different subjects have different levels of difficulty and grade distributions - for example, some subjects tend to award higher grades than others. Your STG takes this into account by applying subject-specific adjustments to give you a more realistic and fair target. Your school may have chosen to set these targets at different levels of ambition to inspire you to achieve your best. This means your STG might be higher or lower than your MEG depending on both the subject and your school's approach to target-setting. The most meaningful targets are those that consider all aspects of your learning journey - your starting point, the subject challenges, and your individual circumstances. Use your STG as a motivating target to work towards, remembering that with dedication and good support, you can absolutely exceed it!</p>
            <p><strong>2) Current Grade:</strong><br>
            This is the grade you're working at right now, based on your recent work, tests, and classroom performance. Your teachers look at everything you've done so far in this subject to determine where you currently stand. This helps you see your progress and identify areas where you might need to focus.</p>
            <p><strong>3) Target Grade:</strong><br>
            This is the grade your teachers believe you can realistically achieve with consistent effort. It's challenging but possible, based on your teachers' experience with students like you and their understanding of your personal potential. This target gives you something specific to aim for as you continue your studies.</p>
          </div>
        `;
        
        // Append to the main container or body to ensure it's not clipped
        container.insertAdjacentHTML('beforeend', tooltipHTML);
        const tooltipElement = document.getElementById('profileGradeInfoTooltip');
        
        // Make it visible with a slight delay for transition
        setTimeout(() => {
          if (tooltipElement) tooltipElement.classList.add('visible');
        }, 10);

        const closeButton = tooltipElement.querySelector('.profile-info-tooltip-close');
        if (closeButton) {
          closeButton.addEventListener('click', () => {
            tooltipElement.classList.remove('visible');
            // Remove after transition
            setTimeout(() => {
              if (tooltipElement && tooltipElement.parentNode) {
                 tooltipElement.parentNode.removeChild(tooltipElement);
              }
            }, 300);
          });
        }
      });
    } else {
      debugLog("Profile info button not found for tooltip setup.");
    }
    
    // Setup MEG info buttons
    setupMEGInfoButtons();
  }
  
  // NEW: Setup for MEG information tooltips
  function setupMEGInfoButtons() {
    const megInfoButtons = document.querySelectorAll('.meg-info-button');
    const container = document.querySelector(window.HOMEPAGE_CONFIG.elementSelector) || document.body;
    
    megInfoButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent event bubbling
        
        // Remove existing MEG tooltip if any
        const existingTooltip = document.getElementById('megInfoTooltip');
        if (existingTooltip) {
          existingTooltip.remove();
        }
        
        const tooltipHTML = `
          <div id="megInfoTooltip" class="profile-info-tooltip meg-tooltip">
            <span class="profile-info-tooltip-close">&times;</span>
            <h4>Your Minimum Expected Grade (MEG)</h4>
            <p>Your MEG represents an aspirational grade based on how students with similar GCSE results have performed nationally. Think of it as a starting point - it shows what's typically achievable for someone with your academic background. Your school may set these targets at different levels of ambition - some schools choose highly aspirational targets to encourage you to aim high, while others may set more moderate goals. Remember, this is just one indicator and doesn't account for your individual strengths, interests, or the specific subjects you're studying. Many students exceed their MEG, while others may find it challenging to reach. Your actual potential is influenced by many factors including your effort, teaching quality, and personal circumstances. For a more personalized target, check your Subject Target Grade (STG), which considers the specific subject you're studying and provides a more tailored expectation.</p>
          </div>
        `;
        
        container.insertAdjacentHTML('beforeend', tooltipHTML);
        const tooltipElement = document.getElementById('megInfoTooltip');
        
        // Position the tooltip near the button
        const buttonRect = button.getBoundingClientRect();
        tooltipElement.style.position = 'fixed';
        tooltipElement.style.top = `${buttonRect.bottom + 5}px`;
        tooltipElement.style.left = `${buttonRect.left - 100}px`; // Center it roughly on the button
        
        // Make it visible with a slight delay for transition
        setTimeout(() => {
          if (tooltipElement) tooltipElement.classList.add('visible');
        }, 10);
        
        const closeButton = tooltipElement.querySelector('.profile-info-tooltip-close');
        if (closeButton) {
          closeButton.addEventListener('click', () => {
            tooltipElement.classList.remove('visible');
            setTimeout(() => {
              if (tooltipElement && tooltipElement.parentNode) {
                tooltipElement.parentNode.removeChild(tooltipElement);
              }
            }, 300);
          });
        }
        
        // Close on click outside
        setTimeout(() => {
          document.addEventListener('click', function closeMEGTooltip(event) {
            if (tooltipElement && !tooltipElement.contains(event.target) && event.target !== button) {
              tooltipElement.classList.remove('visible');
              setTimeout(() => {
                if (tooltipElement && tooltipElement.parentNode) {
                  tooltipElement.parentNode.removeChild(tooltipElement);
                }
              }, 300);
              document.removeEventListener('click', closeMEGTooltip);
            }
          });
        }, 100);
      });
    });
  }
})(); // End of IIFE
