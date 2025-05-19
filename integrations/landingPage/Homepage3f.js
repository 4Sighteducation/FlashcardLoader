// Homepage Integration Script for Knack - v1.0
// This script enables an enhanced homepage with user profile and app hubs
(function() {
  // --- Constants and Configuration ---
  const KNACK_API_URL = 'https://api.knack.com/v1';
  const HOMEPAGE_OBJECT = 'object_112'; // User Profile object for homepage
  const DEBUG_MODE = true; // Enable console logging

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
        description: "Discover your learning superpowers with our questionnaire on Vision, Effort, Systems, Practice and Attitude!"
      },
      {
        name: "VESPA Coaching Report",
        url: "https://vespaacademy.knack.com/vespa-academy#vespa-results/",
        icon: "https://www.vespa.academy/Icons/coachingreport.png",
        description: "See how awesome you can be! Your personal roadmap to success with tailored feedback just for you."
      },
      {
        name: "VESPA Activities",
        url: "https://vespaacademy.knack.com/vespa-academy#my-vespa/",
        icon: "https://www.vespa.academy/Icons/myvespa.png",
        description: "Unlock fun activities and cool ideas perfectly matched to your unique learning style and VESPA scores!"
      }
    ],
    productivity: [
      {
        name: "Study Planner",
        url: "https://vespaacademy.knack.com/vespa-academy#studyplanner/",
        icon: "https://www.vespa.academy/Icons/studyplanner.png",
        description: "Take control of your time with this super-smart calendar that makes study planning a breeze!"
      },
      {
        name: "Flashcards",
        url: "https://vespaacademy.knack.com/vespa-academy#flashcards/",
        icon: "https://www.vespa.academy/Icons/flashcards.png",
        description: "Turn boring facts into brain-friendly flashcards that make remembering stuff actually fun!"
      },
      {
        name: "Taskboard",
        url: "https://vespaacademy.knack.com/vespa-academy#task-board/",
        icon: "https://www.vespa.academy/Icons/taskboard.png",
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
    
    debugLog("Config for headers", config);
    
    // Fallback to using Knack's global application ID if not in config
    const knackAppId = (config && config.knackAppId) ? config.knackAppId : Knack.application_id;
    // Use our known API key if not in config
    const knackApiKey = (config && config.knackApiKey) ? config.knackApiKey : '8f733aa5-dd35-4464-8348-64824d1f5f0d';
    
    debugLog(`Using AppID ${knackAppId}`);
    
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
    
    debugLog("Headers being used", headers);
    
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
          console.error('[Homepage] Failed to create user profile');
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
              console.warn(`[Homepage] No subject records found in Object_113 for returning user ${userEmail} with UPN=${userUpn}`);
            } else {
              debugLog(`No subject records found in Object_113 for new user ${userEmail}, profile will have no subjects`);
            }
          }
        } catch (error) {
          console.error('[Homepage] Error processing subject data from Object_113:', error);
        }
      }
      
      // When returning profile, make sure connection fields are preserved from original creation
      debugLog(`Final user profile with connection fields and subjects:`, profileRecord);
      
      return profileRecord;
    } catch (error) {
      console.error('[Homepage] Error finding or creating user profile:', error);
      return null;
    }
  }
  
  // Fetch a user profile record by ID
  async function getUserProfileRecord(recordId) {
    if (!recordId) {
      console.error('[Homepage] Cannot get user profile: recordId is missing');
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
      console.error(`[Homepage] Error getting user profile record ${recordId}:`, error);
      return null;
    }
  }
  
  // Fetch subject data from Object_113 using user email and/or UPN
  async function fetchSubjectDataFromObject113(userEmail, userUpn) {
    if (!userEmail && !userUpn) {
      console.error("[Homepage] Cannot fetch subject data: Both userEmail and userUpn are missing.");
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
        // ---- ADD EXTRA LOGGING HERE ----
        console.log('[Homepage DEBUG] Raw subject records fetched from object_113:', JSON.parse(JSON.stringify(response.records)));
        // ---------------------------------
        return response.records;
      }
      
      return [];
    } catch (error) {
      console.error('[Homepage] Error fetching subject data from Object_113:', error);
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
        minimumExpectedGrade: sanitizeField(record.field_3131 || ''),
        currentGrade: sanitizeField(record.field_3132 || ''),
        targetGrade: sanitizeField(record.field_3135 || ''),
        effortGrade: sanitizeField(record.field_3133 || ''),
        behaviourGrade: sanitizeField(record.field_3134 || '')
      };
    });

    // ---- ADD EXTRA LOGGING HERE ----
    console.log('[Homepage DEBUG] Built subject data for object_112 update:', JSON.parse(JSON.stringify(builtRecords))); 
    // ---------------------------------
    return builtRecords; 
  }
  
  // Update subject fields in user profile
  async function updateUserProfileSubjects(recordId, subjectDataArray) {
    if (!recordId || !subjectDataArray || !Array.isArray(subjectDataArray)) {
      console.error('[Homepage] Cannot update subjects: Invalid parameters');
      return false;
    }
    // ---- ADD EXTRA LOGGING HERE ----
    console.log('[Homepage DEBUG] updateUserProfileSubjects received subjectDataArray:', JSON.parse(JSON.stringify(subjectDataArray)));
    // ---------------------------------
    
    // Limit to 15 subjects max
    const maxSubjects = Math.min(subjectDataArray.length, 15);
    
    // Prepare update data
    const updateData = {};
    
    for (let i = 0; i < maxSubjects; i++) {
      const fieldId = `field_${3080 + i}`; // field_3080 for index 0, field_3081 for index 1, etc.
      updateData[fieldId] = JSON.stringify(subjectDataArray[i]);
    }
    // ---- ADD EXTRA LOGGING HERE ----
    console.log('[Homepage DEBUG] Data prepared for PUT to object_112:', JSON.parse(JSON.stringify(updateData)));
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
      // ---- ADD EXTRA LOGGING HERE ----
      console.log('[Homepage DEBUG] Successfully updated subjects in object_112. Response:', response);
      // ---------------------------------
      return true;
    } catch (error) {
      // ---- ADD EXTRA LOGGING HERE ----
      console.error('[Homepage DEBUG] Error updating user profile subjects in object_112:', error);
      if (error.responseText) {
        console.error('[Homepage DEBUG] Error responseText:', error.responseText);
      }
      // ---------------------------------
      return false;
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
      
      // Log detailed information about ALL fields in student record
      if (studentRecord) {
        console.log('[Homepage] Student record field data:');
        console.log('[Homepage] VESPA Customer field:', studentRecord.field_122_raw);
        
        // Log ALL fields related to tutors to debug the issue
        console.log('[Homepage] Tutor field raw:', studentRecord.field_1682_raw);
        console.log('[Homepage] Tutor field non-raw:', studentRecord.field_1682);
        
        // Log ALL fields related to staff admins to debug the issue
        console.log('[Homepage] Staff Admin field raw:', studentRecord.field_190_raw);
        console.log('[Homepage] Staff Admin field non-raw:', studentRecord.field_190);
        
        // Log any other key fields that might contain connection info
        console.log('[Homepage] Connection fields in record:');
        for (const key in studentRecord) {
          if (key.includes('connect') || key.includes('tutor') || key.includes('admin') || key.includes('staff')) {
            console.log(`[Homepage] Found potential connection field: ${key}:`, studentRecord[key]);
          }
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
      console.log(`[Homepage] Setting User Connection: ${userId}`);
      
      // Connection fields from user object
      if (user.schoolId) {
        data[FIELD_MAPPING.vespaCustomer] = user.schoolId;
        console.log(`[Homepage] Setting VESPA Customer from user: ${user.schoolId}`);
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
            console.log(`[Homepage] Setting VESPA Customer from student record: ${schoolId}`);
          } else {
            debugLog('Could not find valid VESPA Customer ID in any field', null);
          }
        }
        
        // Tutor connections - handle multiple - try both raw and non-raw versions
        let tutorField = null;
        
        // First check the raw field (original)
        if (studentRecord.field_1682_raw) {
          tutorField = studentRecord.field_1682_raw;
          console.log('[Homepage] Using field_1682_raw for tutors');
        } 
        // Then check the non-raw field as fallback
        else if (studentRecord.field_1682) {
          tutorField = studentRecord.field_1682;
          console.log('[Homepage] Using field_1682 for tutors');
        }
        
        if (tutorField) {
          let tutorIds = [];
          
          // Handle array
          if (Array.isArray(tutorField)) {
            console.log('[Homepage] Tutor field is an array with', tutorField.length, 'items');
            tutorIds = tutorField
              .map(item => extractValidRecordId(item))
              .filter(id => id);
          } 
          // Handle object
          else if (typeof tutorField === 'object') {
            console.log('[Homepage] Tutor field is an object');
            const id = extractValidRecordId(tutorField);
            if (id) tutorIds.push(id);
          } 
          // Handle string (direct ID)
          else if (typeof tutorField === 'string' && isValidKnackId(tutorField)) {
            console.log('[Homepage] Tutor field is a string ID');
            tutorIds.push(tutorField);
          }
          
          if (tutorIds.length > 0) {
            // For Knack connection fields, format depends on single vs multiple
            data[FIELD_MAPPING.tutorConnection] = tutorIds.length === 1 ? tutorIds[0] : tutorIds;
            console.log(`[Homepage] Setting Tutor connection: ${JSON.stringify(tutorIds)}`);
          } else {
            console.log('[Homepage] No valid tutor IDs found after processing');
          }
        } else {
          console.log('[Homepage] No tutor field found in student record');
        }
        
        // Staff Admin connections - handle multiple - try both raw and non-raw versions
        let staffAdminField = null;
        
        // First check the raw field (original)
        if (studentRecord.field_190_raw) {
          staffAdminField = studentRecord.field_190_raw;
          console.log('[Homepage] Using field_190_raw for staff admins');
        } 
        // Then check the non-raw field as fallback
        else if (studentRecord.field_190) {
          staffAdminField = studentRecord.field_190;
          console.log('[Homepage] Using field_190 for staff admins');
        }
        
        if (staffAdminField) {
          let staffAdminIds = [];
          
          // Handle array
          if (Array.isArray(staffAdminField)) {
            console.log('[Homepage] Staff Admin field is an array with', staffAdminField.length, 'items');
            staffAdminIds = staffAdminField
              .map(item => extractValidRecordId(item))
              .filter(id => id);
          } 
          // Handle object
          else if (typeof staffAdminField === 'object') {
            console.log('[Homepage] Staff Admin field is an object');
            const id = extractValidRecordId(staffAdminField);
            if (id) staffAdminIds.push(id);
          } 
          // Handle string (direct ID)
          else if (typeof staffAdminField === 'string' && isValidKnackId(staffAdminField)) {
            console.log('[Homepage] Staff Admin field is a string ID');
            staffAdminIds.push(staffAdminField);
          }
          
          if (staffAdminIds.length > 0) {
            // For Knack connection fields, format depends on single vs multiple
            data[FIELD_MAPPING.staffAdminConnection] = staffAdminIds.length === 1 ? staffAdminIds[0] : staffAdminIds;
            console.log(`[Homepage] Setting Staff Admin connection: ${JSON.stringify(staffAdminIds)}`);
          } else {
            console.log('[Homepage] No valid staff admin IDs found after processing');
          }
        } else {
          console.log('[Homepage] No staff admin field found in student record');
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
      console.error('[Homepage] Error finding student record:', error);
      return null;
    }
  }
  
  // --- Flashcard Review Notification Functions ---
  async function fetchFlashcardReviewData(userId) {
    if (!userId) {
      console.error("[Homepage] Cannot fetch flashcard data: userId is missing.");
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
      console.error('[Homepage] Error fetching flashcard review data:', error);
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
          console.warn(`[Homepage] Error decoding URI component for ${fieldId}:`, e, "Original string:", boxDataRaw.substring(0,100));
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
                console.warn(`[Homepage] Error parsing nextReviewDate '${card.nextReviewDate}':`, dateError);
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
      console.error("[Homepage] Cannot fetch Study Planner data: userId is missing.");
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
      console.error('[Homepage] Error fetching Study Planner data:', error);
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
      console.error("[Homepage] Cannot fetch Taskboard data: userId is missing.");
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
      console.error('[Homepage] Error fetching Taskboard data:', error);
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
      console.warn("[Homepage] Cannot fetch VESPA scores: userEmail is missing.");
      return null;
    }
    debugLog(`Fetching VESPA scores for email: ${userEmail}`);

    const findFilters = encodeURIComponent(JSON.stringify({
      match: 'and',
      rules: [{ field: VESPA_SCORES_EMAIL_FIELD, operator: 'is', value: userEmail }]
    }));

    const fieldsToRequest = Object.values(VESPA_SCORES_FIELDS).join(',');

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
        debugLog('Processed VESPA scores:', scores);
        return scores;
      } else {
        debugLog(`No VESPA scores record found for ${userEmail}`);
        return null;
      }
    } catch (error) {
      console.error('[Homepage] Error fetching VESPA scores:', error);
      return null;
    }
  }

  // --- UI Rendering ---
  // Render the main homepage UI
  function renderHomepage(userProfile, flashcardReviewCounts, studyPlannerData, taskboardData, vespaScoresData) {
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
    
    // Create the main container with app hubs side-by-side
    const homepageHTML = `
      <div id="vespa-homepage">
        ${renderProfileSection(profileData, vespaScoresData)}
        <div class="app-hubs-container">
          ${renderAppHubSection('VESPA Hub', APP_HUBS.vespa)}
          ${renderAppHubSection('Productivity Hub', APP_HUBS.productivity, flashcardReviewCounts, studyPlannerData, taskboardData)}
        </div>
      </div>
    `;
    
    // Add the CSS
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      /* Main Container - VESPA Theme */
      #vespa-homepage {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        max-width: 1200px;
        margin: 0 auto;
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
      .vespa-section {
        background-color: #2a3c7a;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        padding: 16px;
        margin-bottom: 24px;
        animation: fadeIn 0.5s ease-out forwards;
        transition: transform 0.2s, box-shadow 0.2s;
        border: 2px solid #079baa;
      }
      
      .vespa-section:hover {
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35);
      }
      
      .vespa-section:nth-child(1) { animation-delay: 0.1s; }
      .vespa-section:nth-child(2) { animation-delay: 0.2s; }
      .vespa-section:nth-child(3) { animation-delay: 0.3s; }
      
      .vespa-section-title {
        color: #00e5db !important; /* Added !important to override any competing styles */
        font-size: 22px;
        font-weight: 600;
        margin-bottom: 16px;
        padding-bottom: 8px;
        border-bottom: 2px solid #079baa;
        position: relative;
        overflow: hidden;
      }
      
      .vespa-section-title::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: -100%;
        width: 100%;
        height: 2px;
        background: linear-gradient(90deg, transparent, rgba(7, 155, 170, 0.8), transparent);
        animation: shimmer 2.5s infinite;
      }
      
      @keyframes shimmer {
        0% { left: -100%; }
        100% { left: 100%; }
      }
      
      /* App hubs container for side-by-side layout */
      .app-hubs-container {
        display: flex;
        gap: 20px;
        margin-bottom: 20px;
      }
      
      .app-hubs-container .vespa-section {
        flex: 1;
        margin-bottom: 0;
        min-width: 0; /* Allow flex items to shrink below content size */
      }
      
      /* Profile Section - more compact */
      .profile-info {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }
      
      .profile-details {
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
      
      .profile-name {
        font-size: 22px;
        color: #00e5db;
        margin-bottom: 8px;
        font-weight: 700;
        padding: 4px 8px;
        border-bottom: 1px solid rgba(7, 155, 170, 0.3);
      }
      
      .profile-item {
        margin-bottom: 3px;
        padding: 3px 8px;
        border-radius: 4px;
        transition: background-color 0.2s;
        display: flex;
        align-items: center;
      }
      
      .profile-item:hover {
        background-color: #3a4b90;
      }
      
      .profile-label {
        font-weight: 600;
        color: #00e5db;
        margin-right: 4px;
        min-width: 80px;
      }
      
      .profile-value {
        color: #f0f0f0;
      }
      
      .subjects-container {
        flex: 2;
        min-width: 280px;
      }
      
      .subjects-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
        gap: 10px;
      }
      
      /* Add GCSE grid - 4 columns for smaller cards */
      .subjects-grid.gcse-grid {
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 10px;
      }
      
      .subject-card {
        background-color: #334285;
        border-radius: 6px;
        padding: 8px;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
        transition: all 0.2s ease;
        border: 1px solid rgba(7, 155, 170, 0.3);
      }
      
      /* GCSE subject styling - matching the screenshot */
      .subject-card.gcse {
        background-color: #4B7F3D; /* Green background for GCSE as seen in screenshot */
        padding: 8px;
        border: 1px solid rgba(170, 185, 7, 0.3);
      }
      
      /* Vocational subject styling */
      .subject-card.vocational {
        background-color: #742a85; /* Purple background for Vocational */
        padding: 8px;
        border: 1px solid rgba(170, 7, 185, 0.3);
      }
      
      .subject-card:hover {
        transform: translateY(-3px);
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
      }
      
      .subject-name {
        font-weight: 600;
        color: #ffffff;
        margin-bottom: 4px;
        font-size: 0.95em;
      }
      
      .subject-meta {
        font-size: 0.75em;
        color: #ffffff;
        margin-bottom: 3px;
      }
      
      .grades-container {
        display: flex;
        justify-content: space-between;
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid #3d3d3d;
      }
      
      .grade-item {
        text-align: center;
        flex: 1;
        padding: 4px;
        border-radius: 4px;
        transition: background-color 0.2s;
      }
      
      .grade-item:hover {
        background-color: #3a3a3a;
      }
      
      .grade-label {
        font-size: 0.7em;
        color: #ffffff;
        margin-bottom: 3px;
      }
      
      .grade-value {
        font-size: 1.1em;
        font-weight: 600;
        transition: transform 0.2s;
      }
      
      .grade-item:hover .grade-value {
        transform: scale(1.1);
      }
      
      .grade-meg {
        color: #00e5db;
      }
      
      /* Grade indicators - will be dynamically applied in the rendering function */
      .grade-exceeding {
        color: #4caf50;
      }
      
      .grade-exceeding-high {
        color: #2e7d32;
      }
      
      .grade-matching {
        color: #ff9800;
      }
      
      .grade-below {
        color: #f44336;
      }
      
      .grade-below-far {
        color: #b71c1c;
      }
      
      /* App Hubs */
      .app-hub {
        display: flex;
        flex-wrap: wrap;
        gap: 16px;
        justify-content: center;
      }
      
      .app-card {
        background-color: #334285;
        border-radius: 8px;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.25);
        width: 100%;
        max-width: 210px;
        /* overflow: hidden; // Allow link to manage this if needed */
        transition: transform 0.3s, box-shadow 0.3s;
        animation: fadeIn 0.5s ease-out forwards;
        border: 1px solid rgba(7, 155, 170, 0.3);
        position: relative; /* Ensure positioning context for badge */
        display: flex; /* Added to help link fill the card */
        flex-direction: column; /* Added to stack header and (removed) button */
      }

      /* App Card Link (replaces Launch button and makes header clickable) */
      .app-card-link {
        text-decoration: none;
        color: inherit;
        display: block; /* Make the link take up available space */
        flex-grow: 1; /* Allow link to grow and fill card, useful if app-card has a fixed height or uses flex */
        cursor: pointer; /* Indicate it's clickable */
      }
      
      .app-card-header {
        background-color: #1c2b5f;
        padding: 10px;
        text-align: center;
        position: relative;
        overflow: hidden;
        border-bottom: 2px solid #079baa;
      }
      
      .app-card-header::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 50%;
        height: 100%;
        background: linear-gradient(
          90deg,
          transparent,
          rgba(255, 255, 255, 0.05),
          transparent
        );
        transform: skewX(-25deg);
        transition: 0.7s;
      }
      
      .app-card:hover .app-card-header::before {
        left: 125%;
      }
      
      .app-icon {
        width: 60px;
        height: 60px;
        object-fit: contain;
        margin-bottom: 6px;
        transition: transform 0.3s;
      }
      
      .app-card:hover .app-icon {
        transform: scale(1.1) rotate(5deg);
      }
      
      .app-name {
        color: white;
        font-size: 16px;
        font-weight: 600;
      }
      
      /* Info icon for tooltip trigger */
      .app-info-icon {
        position: absolute;
        top: 10px;
        right: 10px;
        width: 24px;
        height: 24px;
        background-color: #00e5db;
        color: #1c2b5f;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 14px;
        cursor: pointer; /* Changed from help to pointer */
        transition: all 0.2s;
        z-index: 10;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
      }
      
      .app-info-icon:hover,
      .app-info-icon:focus {
        transform: scale(1.1);
        box-shadow: 0 0 8px rgba(0, 229, 219, 0.8);
      }
      
      /* Active state for the tooltip to show it */
      .tooltip-active {
        opacity: 1 !important;
        visibility: visible !important;
      }
      
      .app-button {
        display: block;
        background-color: #079baa;
        color: #ffffff;
        text-align: center;
        padding: 8px;
        text-decoration: none;
        font-weight: 600;
        transition: all 0.3s;
        position: relative;
        overflow: hidden;
        z-index: 1;
        font-size: 0.9em;
      }
      
      .app-button::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
        transition: 0.5s;
        z-index: -1;
      }
      
      .app-button:hover {
        background-color: #00c2b8;
        transform: translateY(-2px);
      }
      
      .app-button:hover::before {
        left: 100%;
      }
      
      /* Loading Indicator */
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      /* Responsive adjustments */
      @media (max-width: 992px) {
        #vespa-homepage {
          padding: 12px;
        }
        
        .vespa-section {
          padding: 14px;
        }
        
        .subjects-grid {
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        }
      }
      
      @media (max-width: 768px) {
        .profile-info {
          flex-direction: column;
        }
        
        .subjects-grid {
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 10px;
        }
        
        .app-hubs-container {
          flex-direction: column;
          gap: 16px;
        }
        
        .app-card {
          max-width: 100%;
          width: 100%;
        }
        
        .app-description {
          height: auto;
          min-height: 70px;
        }
        
        .vespa-section-title {
          font-size: 20px;
        }
      }
      
      @media (max-width: 480px) {
        #vespa-homepage {
          padding: 10px;
        }
        
        .vespa-section {
          padding: 12px;
          margin-bottom: 16px;
        }
        
        .subjects-grid {
          grid-template-columns: 1fr;
        }
        
        .profile-name {
          font-size: 22px;
        }
        
        .app-card {
          max-width: 100%;
        }
        
        .grade-item {
          padding: 2px;
        }
        
        .grade-value {
          font-size: 1em;
        }
      }
      
      /* Flashcard Notification Badge */
      .flashcard-notification-badge {
        position: absolute;
        top: 5px;
        right: 8px; /* Adjusted from 30px */
        background-color: red;
        color: white;
        border-radius: 50%;
        width: 22px;
        height: 22px;
        font-size: 12px;
        font-weight: bold;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 15;
        box-shadow: 0 0 5px rgba(0,0,0,0.5);
      }
      
      /* Study Planner Notification Badge */
      .study-planner-notification-badge {
        position: absolute;
        top: 5px;
        right: 8px; /* Adjusted from 30px */
        background-color: #28a745; /* Green */
        color: white;
        border-radius: 50%;
        width: 22px;
        height: 22px;
        font-size: 12px;
        font-weight: bold;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 15;
        box-shadow: 0 0 5px rgba(0,0,0,0.5);
      }
      
      /* Taskboard Notification Badge */
      .taskboard-notification-badge {
        position: absolute;
        top: 5px;
        right: 8px; /* Adjusted from 30px */
        background-color: #ffc107; /* Yellow */
        color: #212529; /* Dark text for yellow bg */
        border-radius: 50%;
        width: 22px;
        height: 22px;
        font-size: 12px;
        font-weight: bold;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 15;
        box-shadow: 0 0 5px rgba(0,0,0,0.5);
      }
      
      /* VESPA Scores Section (within Profile) */
      .profile-vespa-scores-container {
        padding: 15px 0px 10px 0px; /* Adjusted padding to be mostly top/bottom */
        margin-top: 15px; /* Space between subjects and VESPA scores title */
        /* border-top: 1px solid rgba(7, 155, 170, 0.2); */ /* Removed faint top border */
      }
      .profile-vespa-scores-title {
        font-size: 16px; /* Smaller title */
        font-weight: 600;
        color: #00e5db !important; /* Changed to #00e5db and added !important */
        margin-bottom: 15px; /* Space below title */
        text-align: left; /* Align with profile content */
        padding-left: 8px; /* Align with profile item labels */
        padding-bottom: 5px; /* Space for the border */
        border-bottom: 2px solid #079baa; /* Matched to main section title border */
      }
      .vespa-scores-grid {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-around; /* Distribute items evenly */
        gap: 10px; /* Reduced gap for tighter packing if needed */
        padding: 0px 8px; /* Padding to align with profile items */
      }
      .vespa-score-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        min-width: 70px; /* Adjusted min-width */
        flex-basis: calc(100% / 6 - 10px); /* Aim for 6 items per row, adjust gap accordingly */
        max-width: 90px;
      }
      .vespa-score-circle {
        width: 55px; /* Adjusted size */
        height: 55px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 6px; /* Reduced margin */
        font-weight: bold;
        font-size: 1.2em; /* Adjusted font size */
        color: #ffffff; /* Default text color */
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        transition: transform 0.2s ease-out;
      }
      .vespa-score-circle:hover {
        transform: scale(1.1);
      }
      .vespa-score-label {
        font-size: 0.7em; /* Adjusted label size */
        color: #00e5db;
        text-transform: uppercase;
        font-weight: 500;
        text-align: center;
      }

      /* Custom App Data Tooltip */
      .app-data-tooltip {
        position: absolute; 
        background-color: #1c2b5f; 
        color: #ffffff; 
        border: 1px solid #00e5db; 
        border-radius: 6px;
        padding: 10px 15px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.4);
        z-index: 10000; 
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.2s ease-out, visibility 0.2s ease-out;
        max-width: 300px; 
        font-size: 0.9em;
        pointer-events: none; /* Prevents tooltip from interfering with mouse events */
      }

      .app-data-tooltip.visible {
        opacity: 1;
        visibility: visible;
      }

      .app-data-tooltip h4 {
        color: #00e5db;
        font-size: 1.1em;
        margin-top: 0;
        margin-bottom: 8px;
        border-bottom: 1px solid rgba(0, 229, 219, 0.3);
        padding-bottom: 5px;
      }

      .app-data-tooltip ul {
        list-style-type: none;
        padding-left: 0;
        margin-bottom: 0;
      }

      .app-data-tooltip ul li {
        margin-bottom: 4px;
        line-height: 1.4;
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
    
    // Initialize tooltips
    setupTooltips();
  }
  
  // Render the profile section
  function renderProfileSection(profileData, vespaScoresData) {
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
      // Handle cases where grades are not available
      if (!grade || !minExpected || grade === 'N/A' || minExpected === 'N/A') {
        return '';
      }
      
      // GCSE grades are numeric 1-9 (9 is highest)
      if (examType === 'GCSE') {
        // GCSE uses numeric grades 1-9 where 9 is highest
        const numGrade = parseInt(grade, 10);
        const numMinExpected = parseInt(minExpected, 10);
        
        if (!isNaN(numGrade) && !isNaN(numMinExpected)) {
          const diff = numGrade - numMinExpected;
          
          if (diff >= 2) {
            return 'grade-exceeding-high';
          } else if (diff === 1) {
            return 'grade-exceeding';
          } else if (diff === 0) {
            return 'grade-matching';
          } else if (diff === -1) {
            return 'grade-below';
          } else {
            return 'grade-below-far';
          }
        }
      }
      
      // Vocational grades handling (Distinction*, Distinction, Merit, Pass)
      else if (examType === 'Vocational') {
        const vocationGradeValues = {
          'D*': 4, 'D*D*': 8, 'D*D*D*': 12,
          'D': 3, 'DD': 6, 'DDD': 9,
          'M': 2, 'MM': 4, 'MMM': 6,
          'P': 1, 'PP': 2, 'PPP': 3,
          'D*D': 7, 'D*DD': 10, 
          'DM': 5, 'DMM': 7,
          'MP': 3, 'MPP': 4
        };
        
        const gradeValue = vocationGradeValues[grade] || 0;
        const minExpectedValue = vocationGradeValues[minExpected] || 0;
        
        if (gradeValue && minExpectedValue) {
          const diff = gradeValue - minExpectedValue;
          
          if (diff >= 2) {
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
      }
      
      // A-Level letter grades (A, B, C, etc.) handling
      else if (/^[A-E][*+-]?$/.test(grade) && /^[A-E][*+-]?$/.test(minExpected)) {
        // Extract the base grade letter
        const gradeValue = grade.charAt(0);
        const minExpectedValue = minExpected.charAt(0);
        
        // Compare (A is better than B, etc.)
        if (gradeValue < minExpectedValue) {
          return 'grade-exceeding-high'; // Much better (e.g. A vs C expected)
        } else if (gradeValue === minExpectedValue) {
          // Check for + or - modifiers
          if (grade.includes('+') || minExpected.includes('-')) {
            return 'grade-exceeding';
          } else if (grade.includes('-') || minExpected.includes('+')) {
            return 'grade-below';
          }
          return 'grade-matching';
        } else {
          // Grade is below expected
          const diff = gradeValue.charCodeAt(0) - minExpectedValue.charCodeAt(0);
          return diff > 1 ? 'grade-below-far' : 'grade-below';
        }
      }
      
      // Fallback numeric grade comparison (percentages or other numerical formats)
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
      
      // For other formats, just do a basic string comparison
      return grade >= minExpected ? 'grade-exceeding' : 'grade-below';
    }
    
    // Render all subjects in a single grid with color coding by type
    let subjectsHTML = '';
    if (profileData.subjects && profileData.subjects.length > 0) {
      profileData.subjects.forEach(subject => {
        // Determine the card type based on exam type
        let cardType = '';
        const examType = (subject.examType || '').trim();
        if (examType === 'GCSE') {
          cardType = 'gcse';
        } else if (examType === 'Vocational') {
          cardType = 'vocational';
        }
        
        // Get color classes for current and target grades, passing the exam type for proper handling
        const currentGradeClass = getGradeColorClass(
          subject.currentGrade,
          subject.minimumExpectedGrade,
          examType
        );
        
        const targetGradeClass = getGradeColorClass(
          subject.targetGrade,
          subject.minimumExpectedGrade,
          examType
        );
        
        subjectsHTML += `
          <div class="subject-card ${cardType}">
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
    
    return `
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
        ${vespaScoresData ? renderVespaCirclesHTML(vespaScoresData) : ''}
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
              <img src="${app.icon}" alt="${app.name}" class="app-icon">
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
  
  // --- Entry Point Function ---
  // Main initialization function, exposed globally
  window.initializeHomepage = async function() {
    debugLog("Initializing Homepage...");
    
    // Clean up any existing tooltips from previous sessions
    cleanupTooltips();
    
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
      console.error(`Homepage Error: Container not found using selector: ${config.elementSelector} or alternatives`);
      
      // Dump the DOM structure to help debug
      debugLog(`DOM structure for debugging`, 
        { html: document.querySelector('.kn-content')?.innerHTML || 'No .kn-content found' });
      
      // Last resort - just use the body
      container = document.body;
      console.warn(`Using document.body as last resort container`);
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
          console.error("[Homepage] Error fetching or processing flashcard data:", fcError);
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
          console.error("[Homepage] Error fetching or processing Study Planner data:", spError);
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
          console.error("[Homepage] Error fetching or processing Taskboard data:", tbError);
        }

        // Fetch VESPA Scores
        let vespaScoresData = null;
        try {
          vespaScoresData = await fetchVespaScores(user.email);
          debugLog('VESPA Scores Data After Processing:', vespaScoresData);
        } catch (vsError) {
          console.error("[Homepage] Error fetching or processing VESPA scores:", vsError);
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
      console.error("Homepage Error during initialization:", error);
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
  });

})(); // End of IIFE
