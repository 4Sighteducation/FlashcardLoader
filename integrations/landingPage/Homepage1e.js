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
        description: "Discover your learning superpowers! Quick quiz to unlock your V-E-S-P-A potential."
      },
      {
        name: "VESPA Coaching Report",
        url: "https://vespaacademy.knack.com/vespa-academy#vespa-results/",
        icon: "https://www.vespa.academy/Icons/coachingreport.png",
        description: "See your VESPA stats and get personalized tips to level up your learning game!"
      },
      {
        name: "VESPA Activities",
        url: "https://vespaacademy.knack.com/vespa-academy#my-vespa/",
        icon: "https://www.vespa.academy/Icons/myvespa.png",
        description: "Custom activities tailored to your VESPA profile. Fun challenges to boost your skills!"
      }
    ],
    productivity: [
      {
        name: "Study Planner",
        url: "https://vespaacademy.knack.com/vespa-academy#studyplanner/",
        icon: "https://www.vespa.academy/Icons/studyplanner.png",
        description: "Map out your study time like a pro! Simple calendar to keep you on track."
      },
      {
        name: "Flashcards",
        url: "https://vespaacademy.knack.com/vespa-academy#flashcards/",
        icon: "https://www.vespa.academy/Icons/flashcards.png",
        description: "Flashcards that adapt to you! Learn faster with cards that know when you need a review."
      },
      {
        name: "Taskboard",
        url: "https://vespaacademy.knack.com/vespa-academy#vespa-taskboard/",
        icon: "https://www.vespa.academy/Icons/taskboard.png",
        description: "Your digital to-do list! Drag, drop, and dominate your assignments with ease."
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

    // If it's an array, process each item
    if (Array.isArray(value)) {
      const validIds = value
        .map(item => extractValidRecordId(item))
        .filter(id => id !== null);
      
      return validIds.length > 0 ? (validIds.length === 1 ? validIds[0] : validIds) : null;
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

  // Process user data to extract connection fields - similar to StudyPlanner implementation
  function processUserConnectionFields(user) {
    if (!user) return user;

    debugLog("Processing user connection fields", user);
    
    // Extract and store connection field IDs safely
    if (user.id) {
      user.emailId = extractValidRecordId(user.id);
    }
    
    // For VESPA Customer ID (field_122/school) - Enhanced extraction
    // First try raw fields which contain the most complete data
    if (user.field_122_raw) {
      // It could be an array of objects or a single object
      if (Array.isArray(user.field_122_raw) && user.field_122_raw.length > 0) {
        // Extract from first item
        if (user.field_122_raw[0].id) {
          user.schoolId = extractValidRecordId(user.field_122_raw[0].id);
          debugLog("Found VESPA Customer ID from field_122_raw array", user.schoolId);
        } else {
          user.schoolId = extractValidRecordId(user.field_122_raw[0]);
          debugLog("Found VESPA Customer ID from field_122_raw array item", user.schoolId);
        }
      } else if (typeof user.field_122_raw === 'object') {
        // Direct object with ID
        if (user.field_122_raw.id) {
          user.schoolId = extractValidRecordId(user.field_122_raw.id);
          debugLog("Found VESPA Customer ID from field_122_raw.id", user.schoolId);
        } else {
          user.schoolId = extractValidRecordId(user.field_122_raw);
          debugLog("Found VESPA Customer ID from field_122_raw object", user.schoolId);
        }
      } else {
        // Direct value
        user.schoolId = extractValidRecordId(user.field_122_raw);
        debugLog("Found VESPA Customer ID from field_122_raw direct value", user.schoolId);
      }
    } else if (user.school_raw) {
      // It could be an array of objects or a single object
      if (Array.isArray(user.school_raw) && user.school_raw.length > 0) {
        // Extract from first item
        if (user.school_raw[0].id) {
          user.schoolId = extractValidRecordId(user.school_raw[0].id);
          debugLog("Found VESPA Customer ID from school_raw array", user.schoolId);
        } else {
          user.schoolId = extractValidRecordId(user.school_raw[0]);
          debugLog("Found VESPA Customer ID from school_raw array item", user.schoolId);
        }
      } else if (typeof user.school_raw === 'object') {
        // Direct object with ID
        if (user.school_raw.id) {
          user.schoolId = extractValidRecordId(user.school_raw.id);
          debugLog("Found VESPA Customer ID from school_raw.id", user.schoolId);
        } else {
          user.schoolId = extractValidRecordId(user.school_raw);
          debugLog("Found VESPA Customer ID from school_raw object", user.schoolId);
        }
      } else {
        // Direct value
        user.schoolId = extractValidRecordId(user.school_raw);
        debugLog("Found VESPA Customer ID from school_raw direct value", user.schoolId);
      }
    } else if (user.field_122 || user.school) {
      user.schoolId = extractValidRecordId(user.school || user.field_122);
      debugLog("Using fallback for VESPA Customer ID from field_122/school", user.schoolId);
    }
    
    // Set vespaCustomerId as a convenience alias - based on StudyPlanner approach
    user.vespaCustomerId = user.schoolId;
    if (user.vespaCustomerId) {
      debugLog("Set alias vespaCustomerId to use schoolId value", user.vespaCustomerId);
    }
    
    // For tutor connection(s) - handle as array
    if (user.field_1682_raw && Array.isArray(user.field_1682_raw) && user.field_1682_raw.length > 0) {
      // Get all tutor IDs
      const tutorIds = user.field_1682_raw
        .map(item => extractValidRecordId(item.id))
        .filter(id => id);
        
      if (tutorIds.length === 1) {
        user.teacherId = tutorIds[0];
        debugLog("Found single Tutor ID from field_1682_raw", user.teacherId);
      } else if (tutorIds.length > 1) {
        user.teacherId = tutorIds; // Store as array
        debugLog(`Found ${tutorIds.length} Tutor IDs from field_1682_raw`, tutorIds);
      }
    } else if (user.tutor_raw && Array.isArray(user.tutor_raw) && user.tutor_raw.length > 0) {
      // Get all tutor IDs from tutor_raw
      const tutorIds = user.tutor_raw
        .map(item => extractValidRecordId(item.id))
        .filter(id => id);
        
      if (tutorIds.length === 1) {
        user.teacherId = tutorIds[0];
        debugLog("Found single Tutor ID from tutor_raw", user.teacherId);
      } else if (tutorIds.length > 1) {
        user.teacherId = tutorIds; // Store as array
        debugLog(`Found ${tutorIds.length} Tutor IDs from tutor_raw`, tutorIds);
      }
    } else if (user.tutor || user.field_1682) {
      // Fallback for single tutor
      const singleTutorId = extractValidRecordId(user.tutor || user.field_1682);
      if (singleTutorId) {
        user.teacherId = singleTutorId;
        debugLog("Using fallback for Tutor ID", user.teacherId);
      }
    }
    
    // For role ID
    if (user.role) {
      user.roleId = extractValidRecordId(user.role);
    }
    
    // Staff admin connection (field_190) - handle as array
    if (user.field_190_raw && Array.isArray(user.field_190_raw) && user.field_190_raw.length > 0) {
      // Get all staff admin IDs
      const staffAdminIds = user.field_190_raw
        .map(item => extractValidRecordId(item.id))
        .filter(id => id);
        
      if (staffAdminIds.length === 1) {
        user.staffAdminId = staffAdminIds[0];
        debugLog("Found single Staff Admin ID from field_190_raw", user.staffAdminId);
      } else if (staffAdminIds.length > 1) {
        user.staffAdminId = staffAdminIds; // Store as array
        debugLog(`Found ${staffAdminIds.length} Staff Admin IDs from field_190_raw`, staffAdminIds);
      }
    } else if (user.staffAdmin_raw && Array.isArray(user.staffAdmin_raw) && user.staffAdmin_raw.length > 0) {
      // Get all staff admin IDs from staffAdmin_raw
      const staffAdminIds = user.staffAdmin_raw
        .map(item => extractValidRecordId(item.id))
        .filter(id => id);
        
      if (staffAdminIds.length === 1) {
        user.staffAdminId = staffAdminIds[0];
        debugLog("Found single Staff Admin ID from staffAdmin_raw", user.staffAdminId);
      } else if (staffAdminIds.length > 1) {
        user.staffAdminId = staffAdminIds; // Store as array
        debugLog(`Found ${staffAdminIds.length} Staff Admin IDs from staffAdmin_raw`, staffAdminIds);
      }
    } else if (user.staffAdmin || user.field_190) {
      // Fallback for direct field access
      const staffAdminId = extractValidRecordId(user.staffAdmin || user.field_190);
      if (staffAdminId) {
        user.staffAdminId = staffAdminId;
        debugLog("Using fallback for Staff Admin ID", user.staffAdminId);
      }
    }
    
    return user;
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
      
      // Enhanced connection field extraction for VESPA Customer
      let vespaCustomerId = null;
      
      // Try from user object first - prioritize pre-processed values
      if (user.schoolId) {
        vespaCustomerId = user.schoolId;
        debugLog('Found VESPA Customer ID from user.schoolId', vespaCustomerId);
      } else if (user.vespaCustomerId) {
        vespaCustomerId = user.vespaCustomerId;
        debugLog('Found VESPA Customer ID from user.vespaCustomerId', vespaCustomerId);
      }
      
      // Try student record with enhanced extraction if still not found
      if (!vespaCustomerId && studentRecord) {
        debugLog('Trying to extract VESPA Customer ID from student record', studentRecord);
        
        // Process all possible versions of field_122_raw
        if (studentRecord.field_122_raw) {
          // It could be an array of objects, a single object, or a direct ID
          if (Array.isArray(studentRecord.field_122_raw)) {
            // Try each item in the array
            for (const item of studentRecord.field_122_raw) {
              const id = extractValidRecordId(item);
              if (id) {
                vespaCustomerId = id;
                debugLog('Found VESPA Customer ID from field_122_raw array item', vespaCustomerId);
                break;
              }
            }
          } else if (typeof studentRecord.field_122_raw === 'object') {
            // Try to extract from object
            if (studentRecord.field_122_raw.id) {
              vespaCustomerId = extractValidRecordId(studentRecord.field_122_raw.id);
              debugLog('Found VESPA Customer ID from field_122_raw.id object property', vespaCustomerId);
            } else {
              vespaCustomerId = extractValidRecordId(studentRecord.field_122_raw);
              debugLog('Found VESPA Customer ID from field_122_raw object', vespaCustomerId);
            }
          } else {
            // Try direct value
            vespaCustomerId = extractValidRecordId(studentRecord.field_122_raw);
            debugLog('Found VESPA Customer ID from field_122_raw direct value', vespaCustomerId);
          }
        }
        
        // Try school_raw if field_122_raw didn't work
        if (!vespaCustomerId && studentRecord.school_raw) {
          // Similar logic for school_raw as field_122_raw
          if (Array.isArray(studentRecord.school_raw)) {
            for (const item of studentRecord.school_raw) {
              const id = extractValidRecordId(item);
              if (id) {
                vespaCustomerId = id;
                debugLog('Found VESPA Customer ID from school_raw array item', vespaCustomerId);
                break;
              }
            }
          } else if (typeof studentRecord.school_raw === 'object') {
            if (studentRecord.school_raw.id) {
              vespaCustomerId = extractValidRecordId(studentRecord.school_raw.id);
              debugLog('Found VESPA Customer ID from school_raw.id object property', vespaCustomerId);
            } else {
              vespaCustomerId = extractValidRecordId(studentRecord.school_raw);
              debugLog('Found VESPA Customer ID from school_raw object', vespaCustomerId);
            }
          } else {
            vespaCustomerId = extractValidRecordId(studentRecord.school_raw);
            debugLog('Found VESPA Customer ID from school_raw direct value', vespaCustomerId);
          }
        }
        
        // Try standard field values as last resort
        if (!vespaCustomerId) {
          // Try standard field values
          if (studentRecord.field_122) {
            vespaCustomerId = extractValidRecordId(studentRecord.field_122);
            debugLog('Found VESPA Customer ID from field_122 standard field', vespaCustomerId);
          } else if (studentRecord.school) {
            vespaCustomerId = extractValidRecordId(studentRecord.school);
            debugLog('Found VESPA Customer ID from school standard field', vespaCustomerId);
          }
        }
      }
      
      // Set VESPA Customer ID if found through any method
      if (vespaCustomerId) {
        data[FIELD_MAPPING.vespaCustomer] = vespaCustomerId;
        debugLog('Setting VESPA Customer connection field', vespaCustomerId);
      }
      
      // Use processed user fields
      // First try the teacherId we extracted in processUserConnectionFields
      let tutorIds = [];
      
      // Check for teacher/tutor IDs directly from processed user object
      if (user.teacherId) {
        // It might be a single ID or an array
        if (Array.isArray(user.teacherId)) {
          tutorIds = user.teacherId;
          debugLog('Using tutor IDs array from processed user object', tutorIds);
        } else {
          tutorIds = [user.teacherId];
          debugLog('Using single tutor ID from processed user object', user.teacherId);
        }
      }
      
      // If we still don't have tutor IDs, try from student record
      if (tutorIds.length === 0 && studentRecord) {
        // Tutor connections - enhanced extraction with fallbacks
        // Try field_1682_raw first (primary method)
        if (studentRecord.field_1682_raw && Array.isArray(studentRecord.field_1682_raw)) {
          tutorIds = studentRecord.field_1682_raw
            .map(item => extractValidRecordId(item))
            .filter(id => id);
            
          debugLog('Extracted tutor IDs from field_1682_raw', tutorIds);
        }
        // Fallback to field_1682 if available
        else if (studentRecord.field_1682) {
          if (Array.isArray(studentRecord.field_1682)) {
            tutorIds = studentRecord.field_1682
              .map(item => extractValidRecordId(item))
              .filter(id => id);
            
            debugLog('Extracted tutor IDs from field_1682 array fallback', tutorIds);
          } else {
            const tutorId = extractValidRecordId(studentRecord.field_1682);
            if (tutorId) {
              tutorIds = [tutorId];
              debugLog('Extracted tutor ID from field_1682 direct fallback', tutorId);
            }
          }
        }
      }
      
      // Add tutors if found
      if (tutorIds.length > 0) {
        data[FIELD_MAPPING.tutorConnection] = tutorIds.length === 1 ? tutorIds[0] : tutorIds;
        debugLog(`Setting ${tutorIds.length} tutor connection(s)`, data[FIELD_MAPPING.tutorConnection]);
      }
        
      // Check for staff admin IDs directly from processed user object
      let staffAdminIds = [];
      
      if (user.staffAdminId) {
        // It might be a single ID or an array
        if (Array.isArray(user.staffAdminId)) {
          staffAdminIds = user.staffAdminId;
          debugLog('Using staff admin IDs array from processed user object', staffAdminIds);
        } else {
          staffAdminIds = [user.staffAdminId];
          debugLog('Using single staff admin ID from processed user object', user.staffAdminId);
        }
      }
      
      // If we still don't have staff admin IDs, try from student record
      if (staffAdminIds.length === 0 && studentRecord) {
        // Staff Admin connections - enhanced extraction with fallbacks
        // Try field_190_raw first (primary method)
        if (studentRecord.field_190_raw && Array.isArray(studentRecord.field_190_raw)) {
          staffAdminIds = studentRecord.field_190_raw
            .map(item => extractValidRecordId(item))
            .filter(id => id);
            
          debugLog('Extracted staff admin IDs from field_190_raw', staffAdminIds);
        }
        // Fallback to field_190 if available
        else if (studentRecord.field_190) {
          if (Array.isArray(studentRecord.field_190)) {
            staffAdminIds = studentRecord.field_190
              .map(item => extractValidRecordId(item))
              .filter(id => id);
            
            debugLog('Extracted staff admin IDs from field_190 array fallback', staffAdminIds);
          } else {
            const staffAdminId = extractValidRecordId(studentRecord.field_190);
            if (staffAdminId) {
              staffAdminIds = [staffAdminId];
              debugLog('Extracted staff admin ID from field_190 direct fallback', staffAdminId);
            }
          }
        }
      }
      
      // Add staff admins if found
      if (staffAdminIds.length > 0) {
        data[FIELD_MAPPING.staffAdminConnection] = staffAdminIds.length === 1 ? staffAdminIds[0] : staffAdminIds;
        debugLog(`Setting ${staffAdminIds.length} staff admin connection(s)`, data[FIELD_MAPPING.staffAdminConnection]);
      }
      
      // Get additional data from student record if available
      if (studentRecord) {
        
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
    
    debugLog(`Looking up student record for email: ${email}`);
    
    // Enhanced filter to search for email using multiple possible fields and methods
    const filters = encodeURIComponent(JSON.stringify({
      match: 'or',
      rules: [
        // Exact matches
        { field: 'field_91', operator: 'is', value: email },
        { field: 'field_70', operator: 'is', value: email },
        // Contains matches (useful for emails embedded in other text)
        { field: 'field_91', operator: 'contains', value: email },
        { field: 'field_70', operator: 'contains', value: email }
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
        debugLog(`Found ${response.records.length} student record matches for ${email}`, response.records[0]);
        
        // If multiple records were found, try to find the best match
        if (response.records.length > 1) {
          let bestMatch = response.records[0];
          
          // Look for exact email match
          for (const record of response.records) {
            const recordEmail = sanitizeField(record.field_91 || record.field_70 || '');
            if (recordEmail.toLowerCase() === email.toLowerCase()) {
              debugLog(`Selected best matching student record by exact email match`, record);
              bestMatch = record;
              break;
            }
          }
          
          // Process the best match to extract connection fields
          processUserConnectionFields(bestMatch);
          return bestMatch;
        }
        
        // Process the single record to extract connection fields
        processUserConnectionFields(response.records[0]);
        return response.records[0];
      }
      
      debugLog(`No student record found for email: ${email}`);
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
      body {
        margin: 0;
        padding: 0;
        background-color: #1a1f2e;
        color: #e8ecf3;
        overflow-x: hidden;
      }
      
      #vespa-homepage {
        font-family: 'Segoe UI', 'Roboto', sans-serif;
        min-height: 100vh;
        padding: 2vh 3vw;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }
      
      .vespa-section {
        background-color: #232938;
        border-radius: 12px;
        box-shadow: 0 8px 15px rgba(0, 0, 0, 0.3);
        padding: 24px;
        margin-bottom: 2vh;
        transition: transform 0.3s, box-shadow 0.3s;
        border: 1px solid rgba(255, 255, 255, 0.05);
      }
      
      .vespa-section:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 20px rgba(0, 0, 0, 0.4);
      }
      
      .vespa-section-title {
        color: #00e5db;
        font-size: 26px;
        font-weight: 600;
        margin-bottom: 20px;
        padding-bottom: 10px;
        border-bottom: 2px solid #00e5db;
        letter-spacing: 0.5px;
      }
      
      /* Profile Section */
      .profile-info {
        display: flex;
        flex-wrap: wrap;
        gap: 24px;
      }
      
      .profile-details {
        flex: 1;
        min-width: 250px;
        background-color: rgba(35, 53, 111, 0.3);
        padding: 20px;
        border-radius: 10px;
        border: 1px solid rgba(0, 229, 219, 0.2);
      }
      
      .profile-name {
        font-size: 28px;
        color: #ffffff;
        margin-bottom: 15px;
        letter-spacing: 0.5px;
      }
      
      .profile-item {
        margin-bottom: 16px;
      }
      
      .profile-label {
        font-weight: 600;
        color: #00e5db;
        margin-bottom: 4px;
        display: block;
      }
      
      .profile-value {
        color: #e8ecf3;
        font-size: 16px;
      }
      
      .subjects-container {
        flex: 2;
        min-width: 300px;
      }
      
      .subjects-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: 18px;
      }
      
      .subject-card {
        background-color: rgba(255, 255, 255, 0.05);
        border-radius: 10px;
        padding: 16px;
        box-shadow: 0 3px 8px rgba(0, 0, 0, 0.2);
        border: 1px solid rgba(0, 229, 219, 0.15);
        transition: transform 0.2s, box-shadow 0.2s;
      }
      
      .subject-card:hover {
        transform: translateY(-3px);
        box-shadow: 0 5px 12px rgba(0, 0, 0, 0.3);
        border-color: rgba(0, 229, 219, 0.3);
      }
      
      .subject-name {
        font-weight: 600;
        color: #ffffff;
        margin-bottom: 8px;
        font-size: 16px;
      }
      
      .subject-meta {
        font-size: 0.85em;
        color: #b0b7c4;
        margin-bottom: 8px;
      }
      
      .grades-container {
        display: flex;
        justify-content: space-between;
        margin-top: 12px;
        background-color: rgba(0, 0, 0, 0.15);
        padding: 10px;
        border-radius: 6px;
      }
      
      .grade-item {
        text-align: center;
      }
      
      .grade-label {
        font-size: 0.75em;
        color: #b0b7c4;
        margin-bottom: 4px;
      }
      
      .grade-value {
        font-size: 1.3em;
        font-weight: 600;
      }
      
      .grade-meg {
        color: #ffd166;
      }
      
      .grade-current {
        color: #00e5db;
      }
      
      /* App Hubs */
      .app-hub {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 24px;
        justify-content: center;
      }
      
      .app-card {
        background: linear-gradient(145deg, #2a3142, #232938);
        border-radius: 12px;
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.25);
        overflow: hidden;
        transition: all 0.3s ease;
        height: 100%;
        display: flex;
        flex-direction: column;
        border: 1px solid rgba(255, 255, 255, 0.05);
      }
      
      .app-card:hover {
        transform: translateY(-5px) scale(1.02);
        box-shadow: 0 12px 20px rgba(0, 0, 0, 0.35);
        border-color: rgba(0, 229, 219, 0.3);
      }
      
      .app-card-header {
        background: linear-gradient(45deg, #23356f, #2a4494);
        padding: 20px;
        text-align: center;
      }
      
      .app-icon {
        width: 80px;
        height: 80px;
        object-fit: contain;
        margin-bottom: 15px;
        filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.2));
        transition: transform 0.3s;
      }
      
      .app-card:hover .app-icon {
        transform: scale(1.1);
      }
      
      .app-name {
        color: white;
        font-size: 20px;
        font-weight: 600;
        letter-spacing: 0.5px;
      }
      
      .app-description {
        padding: 20px;
        color: #d1d7e2;
        font-size: 15px;
        flex-grow: 1;
        display: flex;
        align-items: center;
        text-align: center;
        line-height: 1.5;
      }
      
      .app-button {
        display: block;
        background: linear-gradient(90deg, #00e5db, #00c2b8);
        color: #1a1f2e;
        text-align: center;
        padding: 12px;
        text-decoration: none;
        font-weight: 600;
        transition: all 0.3s;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        font-size: 14px;
      }
      
      .app-button:hover {
        background: linear-gradient(90deg, #00f7ec, #00d4c9);
        letter-spacing: 1px;
      }
      
      /* Responsive adjustments for full screen */
      @media screen and (min-width: 1024px) {
        #vespa-homepage {
          height: 100vh;
          overflow: hidden;
        }
        
        .app-hub {
          grid-template-columns: repeat(3, 1fr);
        }
      }
      
      @media (max-width: 768px) {
        .subjects-grid {
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        }
        
        .app-hub {
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        }
        
        #vespa-homepage {
          height: auto;
          overflow: auto;
        }
      }
      
      /* Custom scrollbar */
      ::-webkit-scrollbar {
        width: 8px;
      }
      
      ::-webkit-scrollbar-track {
        background: #1a1f2e;
      }
      
      ::-webkit-scrollbar-thumb {
        background: #00e5db;
        border-radius: 4px;
      }
      
      ::-webkit-scrollbar-thumb:hover {
        background: #00c2b8;
      }
      
      /* Animation for cards */
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      .vespa-section, .app-card, .subject-card {
        animation: fadeIn 0.5s ease-out forwards;
      }
      
      .no-subjects {
        color: #b0b7c4;
        text-align: center;
        padding: 20px;
        grid-column: 1 / -1;
        background-color: rgba(255, 255, 255, 0.05);
        border-radius: 10px;
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
      subjectsHTML = '<div class="no-subjects">No subjects added yet</div>';
    }
    
    return `
      <section class="vespa-section profile-section">
        <h2 class="vespa-section-title">Your Dashboard</h2>
        <div class="profile-info">
          <div class="profile-details">
            <div class="profile-name">${name}</div>
            
            <div class="profile-item">
              <span class="profile-label">School</span>
              <span class="profile-value">${school || 'N/A'}</span>
            </div>
            
            <div class="profile-item">
              <span class="profile-label">Year Group</span>
              <span class="profile-value">${yearGroup || 'N/A'}</span>
            </div>
            
            <div class="profile-item">
              <span class="profile-label">Tutor Group</span>
              <span class="profile-value">${tutorGroup || 'N/A'}</span>
            </div>
            
            <div class="profile-item">
              <span class="profile-label">Attendance</span>
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
    
    // Process and store user info globally
    // This enhances the user object with properly extracted connection fields
    window.currentKnackUser = processUserConnectionFields(user);
    debugLog("Processed user data with connection fields:", window.currentKnackUser);
    
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
      <div style="padding: 30px; text-align: center; color: #00e5db; background-color: #1a1f2e; border-radius: 12px; box-shadow: 0 8px 16px rgba(0, 0, 0, 0.25);">
        <h3 style="font-size: 24px; letter-spacing: 1px;">Loading Your Dashboard...</h3>
        <div style="margin-top: 20px;">
          <svg width="50" height="50" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
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

