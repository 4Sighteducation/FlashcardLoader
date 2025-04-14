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

  // Extract a valid record ID from various formats - enhanced to handle more edge cases
  function extractValidRecordId(value) {
    if (!value) return null;
    
    console.log('[Homepage] Extracting valid record ID from value type:', typeof value, value);

    // Handle objects (most common case in Knack connections)
    if (typeof value === 'object' && value !== null) {
      // Check for direct ID property
      if (value.id && isValidKnackId(value.id)) {
        console.log('[Homepage] Found valid ID in object.id:', value.id);
        return value.id;
      }
      
      // Check for identifier property (sometimes used by Knack)
      if (value.identifier && isValidKnackId(value.identifier)) {
        console.log('[Homepage] Found valid ID in object.identifier:', value.identifier);
        return value.identifier;
      }
      
      // Handle arrays from connection fields
      if (Array.isArray(value)) {
        console.log('[Homepage] Value is an array with length:', value.length);
        
        // Handle single item array
        if (value.length === 1) {
          if (typeof value[0] === 'object' && value[0].id) {
            console.log('[Homepage] Found valid ID in array[0].id:', value[0].id);
            return isValidKnackId(value[0].id) ? value[0].id : null;
          }
          if (typeof value[0] === 'string' && isValidKnackId(value[0])) {
            console.log('[Homepage] Found valid ID as string in array[0]:', value[0]);
            return value[0];
          }
        }
        
        // For debugging, log contents of larger arrays
        if (value.length > 1) {
          console.log('[Homepage] Array contains multiple items, first few are:', 
                     value.slice(0, 3));
        }
      }
      
      // Check for '_id' property which is sometimes used
      if (value._id && isValidKnackId(value._id)) {
        console.log('[Homepage] Found valid ID in object._id:', value._id);
        return value._id;
      }
    }

    // If it's a direct string ID
    if (typeof value === 'string') {
      if (isValidKnackId(value)) {
        console.log('[Homepage] Value is a valid ID string:', value);
        return value;
      } else {
        console.log('[Homepage] String is not a valid Knack ID:', value);
      }
    }

    console.log('[Homepage] No valid record ID found in value');
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
      
      let profileRecord = null;
      
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
        if (!profileRecord) {
          console.error('[Homepage] Failed to create user profile');
          return null;
        }
      }
      
      // New Authentication Flow: Check Object_113 for subject data
      if (profileRecord && userEmail) {
        try {
          // Get UPN from profile record if available
          const userUpn = profileRecord[FIELD_MAPPING.upn];
          
          debugLog(`Fetching subject data from Object_113 for email: ${userEmail}${userUpn ? ` and UPN: ${userUpn}` : ''}`);
          const subjectRecords = await fetchSubjectDataFromObject113(userEmail, userUpn);
          
          if (subjectRecords && subjectRecords.length > 0) {
            debugLog(`Found ${subjectRecords.length} subject records in Object_113`, subjectRecords);
            
            // Convert records to subject data format
            const subjectDataArray = buildSubjectDataFromObject113Records(subjectRecords);
            
            // Update the user profile with new subject data
            if (subjectDataArray.length > 0) {
              // Only update subject fields, don't refresh the entire profile to avoid losing connection fields
              await updateUserProfileSubjects(profileRecord.id, subjectDataArray);
              debugLog(`Updated user profile with ${subjectDataArray.length} subjects from Object_113`);
              
              // Update only subject fields in profile object rather than fetching entire profile again
              for (let i = 0; i < subjectDataArray.length && i < 15; i++) {
                const fieldId = `field_${3080 + i}`; // field_3080 for index 0, field_3081 for index 1, etc.
                profileRecord[fieldId] = JSON.stringify(subjectDataArray[i]);
              }
            }
          } else {
            debugLog(`No subject records found in Object_113 for user ${userEmail}, keeping existing data`);
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
    
    console.log(`[Homepage] DEBUG: Attempting to fetch subject data with Email:${userEmail}, UPN:${userUpn}`);
    
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
      
      console.log('[Homepage] DEBUG: Using filter:', JSON.stringify({ match: 'or', rules }));
      
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
      console.log(`[Homepage] DEBUG: Complete API Response from Object_113:`, response);
      
      if (response && response.records && response.records.length > 0) {
        debugLog(`Found ${response.records.length} subject records in Object_113`, response.records);
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
    
    return records.map(record => {
      return {
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
  }
  
  // Update subject fields in user profile
  async function updateUserProfileSubjects(recordId, subjectDataArray) {
    if (!recordId || !subjectDataArray || !Array.isArray(subjectDataArray)) {
      console.error('[Homepage] Cannot update subjects: Invalid parameters');
      return false;
    }
    
    // Limit to 15 subjects max
    const maxSubjects = Math.min(subjectDataArray.length, 15);
    
    // Prepare update data
    const updateData = {};
    
    for (let i = 0; i < maxSubjects; i++) {
      const fieldId = `field_${3080 + i}`; // field_3080 for index 0, field_3081 for index 1, etc.
      updateData[fieldId] = JSON.stringify(subjectDataArray[i]);
    }
    
    try {
      await retryApiCall(() => {
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
      
      return true;
    } catch (error) {
      console.error('[Homepage] Error updating user profile subjects:', error);
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
          console.log('[Homepage] Potential VESPA Customer fields:');
          console.log('- field_122_raw:', studentRecord.field_122_raw);
          console.log('- field_122:', studentRecord.field_122);
          console.log('- field_179:', studentRecord.field_179);
          
          // Try field_122_raw first
          if (studentRecord.field_122_raw) {
            schoolId = extractValidRecordId(studentRecord.field_122_raw);
            if (schoolId) {
              console.log(`[Homepage] Found VESPA Customer in field_122_raw: ${schoolId}`);
            }
          }
          
          // If not found, try field_179 (alternative field)
          if (!schoolId && studentRecord.field_179) {
            schoolId = extractValidRecordId(studentRecord.field_179);
            if (schoolId) {
              console.log(`[Homepage] Found VESPA Customer in field_179: ${schoolId}`);
            }
          }
          
          // If still not found, try non-raw field_122
          if (!schoolId && studentRecord.field_122) {
            if (typeof studentRecord.field_122 === 'string' && isValidKnackId(studentRecord.field_122)) {
              schoolId = studentRecord.field_122;
              console.log(`[Homepage] Found VESPA Customer in field_122: ${schoolId}`);
            }
          }
          
          // Set the school ID if found in any field
          if (schoolId) {
            data[FIELD_MAPPING.vespaCustomer] = schoolId;
            console.log(`[Homepage] Setting VESPA Customer from student record: ${schoolId}`);
          } else {
            console.log('[Homepage] Could not find valid VESPA Customer ID in any field');
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
      console.log('[Homepage] Connection fields in record creation:');
      console.log(`[Homepage] - VESPA Customer: ${data[FIELD_MAPPING.vespaCustomer]}`);
      console.log(`[Homepage] - Tutor: ${JSON.stringify(data[FIELD_MAPPING.tutorConnection])}`);
      console.log(`[Homepage] - Staff Admin: ${JSON.stringify(data[FIELD_MAPPING.staffAdminConnection])}`);
      
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
        console.log('[Homepage] COMPLETE STUDENT RECORD:', JSON.stringify(studentRecord, null, 2));
        
        // Check explicitly for the tutor and staff admin fields
        console.log('[Homepage] Checking for connection fields:');
        console.log('- Tutor field_1682 exists:', studentRecord.field_1682 !== undefined);
        console.log('- Tutor field_1682_raw exists:', studentRecord.field_1682_raw !== undefined);
        console.log('- Staff Admin field_190 exists:', studentRecord.field_190 !== undefined);
        console.log('- Staff Admin field_190_raw exists:', studentRecord.field_190_raw !== undefined);
        
        // Extract UPN (Unique Pupil Number) if available
        if (studentRecord.field_3129) {
          debugLog(`Found UPN for student: ${studentRecord.field_3129}`);
        } else {
          console.log('[Homepage] No UPN found in student record (field_3129)');
        }
        
        return studentRecord;
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
    
    // Create the main container with app hubs side-by-side
    const homepageHTML = `
      <div id="vespa-homepage">
        ${renderProfileSection(profileData)}
        <div class="app-hubs-container">
          ${renderAppHubSection('VESPA Hub', APP_HUBS.vespa)}
          ${renderAppHubSection('Productivity Hub', APP_HUBS.productivity)}
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
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 12px;
      }
      
      .subject-card {
        background-color: #334285;
        border-radius: 6px;
        padding: 8px;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
        transition: all 0.2s ease;
        border: 1px solid rgba(7, 155, 170, 0.3);
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
        overflow: hidden;
        transition: transform 0.3s, box-shadow 0.3s;
        animation: fadeIn 0.5s ease-out forwards;
        border: 1px solid rgba(7, 155, 170, 0.3);
        position: relative;
      }
      
      /* Tooltip/Popup Styles */
      .app-tooltip {
        position: fixed; /* Changed from absolute to fixed */
        background-color: #1c2b5f;
        color: #ffffff;
        padding: 12px;
        border-radius: 8px;
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.6);
        width: 250px;
        z-index: 9999; /* Much higher z-index */
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.3s, transform 0.3s, visibility 0.3s;
        border: 2px solid #00e5db;
        font-size: 14px;
        text-align: center;
        pointer-events: none;
        max-width: 90vw; /* Prevent overflow on mobile */
      }
      
      .app-tooltip::before {
        content: '';
        position: absolute;
        bottom: 100%;
        left: 50%;
        margin-left: -8px;
        border-width: 8px;
        border-style: solid;
        border-color: transparent transparent #1c2b5f transparent;
      }
      
      /* We'll manually position the tooltip via JavaScript */
      
      /* Stagger app card animations */
      .app-hub .app-card:nth-child(1) { animation-delay: 0.4s; }
      .app-hub .app-card:nth-child(2) { animation-delay: 0.5s; }
      .app-hub .app-card:nth-child(3) { animation-delay: 0.6s; }
      
      .app-card:hover {
        transform: translateY(-5px) scale(1.02);
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
        animation: pulseGlow 2s infinite;
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
  function renderProfileSection(profileData) {
    const name = sanitizeField(profileData.name);
    
    // Fix for school field - handle if it's an object - improved to handle connection fields better
    let schoolDisplay = 'N/A';
    if (profileData.school) {
      // Log the school field to debug
      console.log('[Homepage] School field value:', profileData.school);
      
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
    function getGradeColorClass(grade, minExpected) {
      // Handle cases where grades are not available
      if (!grade || !minExpected || grade === 'N/A' || minExpected === 'N/A') {
        return '';
      }
      
      // Simple comparison for letter grades (A, B, C, etc.)
      if (/^[A-E][*+-]?$/.test(grade) && /^[A-E][*+-]?$/.test(minExpected)) {
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
      
      // Numeric grade comparison (1-9, or percentages)
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
    
    // Render subjects
    let subjectsHTML = '';
    if (profileData.subjects && profileData.subjects.length > 0) {
      profileData.subjects.forEach(subject => {
        // Get color classes for current and target grades
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
      </section>
    `;
  }
  
  // Setup tooltips with proper positioning and click handling
  function setupTooltips() {
    const tooltips = document.querySelectorAll('.app-tooltip');
    const infoIcons = document.querySelectorAll('.app-info-icon');
    
    // Create a container for all tooltips at the body level
    const tooltipContainer = document.createElement('div');
    tooltipContainer.className = 'tooltip-container';
    document.body.appendChild(tooltipContainer);
    
    // Move all tooltips to the container for better positioning
    tooltips.forEach(tooltip => {
      tooltipContainer.appendChild(tooltip);
    });
    
    // Add click listeners to each info icon
    infoIcons.forEach((icon, index) => {
      icon.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Get the corresponding tooltip
        const tooltip = tooltips[index];
        
        // Hide all other tooltips first
        tooltips.forEach(tip => {
          if (tip !== tooltip) {
            tip.classList.remove('tooltip-active');
          }
        });
        
        // Toggle the current tooltip
        tooltip.classList.toggle('tooltip-active');
        
        if (tooltip.classList.contains('tooltip-active')) {
          // Position the tooltip relative to the info icon
          const iconRect = icon.getBoundingClientRect();
          const tooltipWidth = 250; // Match the width in CSS
          
          tooltip.style.top = (iconRect.bottom + window.scrollY + 15) + 'px';
          tooltip.style.left = (iconRect.left + (iconRect.width / 2) - (tooltipWidth / 2) + window.scrollX) + 'px';
          
          // Add a click event to the document to close the tooltip when clicking elsewhere
          setTimeout(() => {
            document.addEventListener('click', closeTooltip);
          }, 10);
        }
      });
    });
    
    // Function to close tooltip when clicking outside
    function closeTooltip(e) {
      const activeTooltips = document.querySelectorAll('.tooltip-active');
      if (activeTooltips.length) {
        activeTooltips.forEach(tooltip => {
          tooltip.classList.remove('tooltip-active');
        });
        document.removeEventListener('click', closeTooltip);
      }
    }
  }
  
  // Render an app hub section
  function renderAppHubSection(title, apps) {
    let appsHTML = '';
    let id = 0;
    
    apps.forEach(app => {
      const tooltipId = `tooltip-${title.replace(/\s+/g, '-').toLowerCase()}-${id++}`;
      appsHTML += `
        <div class="app-card">
          <div class="app-card-header">
            <div class="app-info-icon" title="Click for details" data-tooltip="${tooltipId}">i</div>
            <img src="${app.icon}" alt="${app.name}" class="app-icon">
            <div class="app-name">${sanitizeField(app.name)}</div>
          </div>
          <div id="${tooltipId}" class="app-tooltip">
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
        // Render the homepage UI
        renderHomepage(userProfile);
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

})(); // End of IIFE
