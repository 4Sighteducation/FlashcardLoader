// Staff Homepage Integration Script for Knack - v1.0
// This script enables an enhanced homepage with staff profile and app hubs
(function() {
  // --- Constants and Configuration ---
  const KNACK_API_URL = 'https://api.knack.com/v1';
  const DEBUG_MODE = true; // Enable console logging

  // VESPA Colors for the dashboard
  const VESPA_COLORS = {
    VISION: '#e59437',
    EFFORT: '#86b4f0', 
    SYSTEMS: '#72cb44',
    PRACTICE: '#7f31a4',
    ATTITUDE: '#ff6b6b'  // Using a complementary color as it wasn't specified
  };
  
  // Theme Colors - Updated as requested
  const THEME = {
    PRIMARY: '#06206e',    // Main background color 
    ACCENT: '#00e5db',     // Accent color
    TEXT: '#ffffff',       // Text color
    CARD_BG: '#102983',    // Card background
    SECTION_BG: '#0d2274', // Section background
    BORDER: '#00e5db'      // Border color
  };

  // Staff profile field mappings
  const FIELD_MAPPING = {
    // Staff user fields
    userId: 'field_3064',         // User ID 
    userConnection: 'field_3070',  // User Account connection
    staffName: 'field_3066',      // Staff Name
    staffRole: 'field_73',        // Correct staff role field in Object_3 (was showing "profile#")
    schoolConnection: 'field_122', // School connection
    
    // VESPA results fields
    vision: 'field_147',
    effort: 'field_148',
    systems: 'field_149',
    practice: 'field_150',
    attitude: 'field_151',
    
    // Connection fields for staff
    tutor: 'field_145',
    headOfYear: 'field_429',
    subjectTeacher: 'field_2191',
    
    // School field for results lookup
    resultsSchool: 'field_133'
  };

  // App hub configurations
  const APP_SECTIONS = {
    group: [
      {
        name: "VESPA Results",
        url: "https://vespaacademy.knack.com/vespa-academy#mygroup-student-results/",
        icon: "https://www.vespa.academy/Icons/survey-results.png",
        description: "View detailed results from your students' VESPA questionnaires"
      },
      {
        name: "Coaching Reports",
        url: "https://vespaacademy.knack.com/vespa-academy#mygroup/mygroup-vespa-results2/",
        icon: "https://www.vespa.academy/Icons/conversation.png",
        description: "Access coaching reports and feedback for your student group"
      },
      {
        name: "Student Activities",
        url: "https://vespaacademy.knack.com/vespa-academy#my-vespa2/",
        icon: "https://www.vespa.academy/Icons/activities.png",
        description: "Browse and assign activities tailored to your students' needs"
      },
      {
        name: "Study Sessions",
        url: "https://vespaacademy.knack.com/vespa-academy#student-revision/",
        icon: "https://www.vespa.academy/Icons/study%20plans.png",
        description: "Monitor and manage student study sessions and revision plans"
      }
    ],
    resources: [
      {
        name: "Slide Decks",
        url: "https://vespaacademy.knack.com/vespa-academy#tutor-activities/",
        icon: "https://www.vespa.academy/Icons/slidedecks.png",
        description: "Access ready-to-use slide decks for classroom presentations"
      },
      {
        name: "Newsletter",
        url: "https://vespaacademy.knack.com/vespa-academy#vespa-newsletter/",
        icon: "https://www.vespa.academy/Icons/newsletter%20(1).png",
        description: "Read the latest VESPA newsletters with updates and best practices"
      },
      {
        name: "Curriculum",
        url: "https://vespaacademy.knack.com/vespa-academy#vespa-curriculum/suggested-curriculum/",
        icon: "https://www.vespa.academy/Icons/curriculum.png",
        description: "Explore the VESPA curriculum and implementation guides"
      },
      {
        name: "Worksheets",
        url: "https://vespaacademy.knack.com/vespa-academy#worksheets/",
        icon: "https://www.vespa.academy/Icons/pdf%20(1).png",
        description: "Download printable worksheets and activities for your students"
      }
    ],
    admin: [
      {
        name: "Students",
        url: "https://vespaacademy.knack.com/vespa-academy#manage/student-accounts/",
        icon: "https://www.vespa.academy/Icons/education.png",
        description: "Manage student accounts, groups, and permissions"
      },
      {
        name: "Staff",
        url: "https://vespaacademy.knack.com/vespa-academy#manage/managestaff/",
        icon: "https://www.vespa.academy/Icons/classroom.png",
        description: "Manage staff accounts, roles, and access controls"
      },
      {
        name: "Questionnaire",
        url: "https://vespaacademy.knack.com/vespa-academy#manage/manage-questionnaire/",
        icon: "https://www.vespa.academy/Icons/teacher-day.png",
        description: "Configure and customize VESPA questionnaires"
      },
      {
        name: "Account",
        url: "https://vespaacademy.knack.com/vespa-academy#manage/account-details2/",
        icon: "https://www.vespa.academy/Icons/university.png",
        description: "Manage school account details and subscription"
      }
    ]
  };

  // --- Helper Functions ---
  // Debug logging helper
  function debugLog(title, data) {
    if (!DEBUG_MODE) return;
    
    console.log(`%c[Staff Homepage] ${title}`, 'color: #7f31a4; font-weight: bold; font-size: 12px;');
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
      console.warn("[Staff Homepage] JSON parse failed:", error, "String:", String(jsonString).substring(0, 100));
      try {
        const cleanedString = String(jsonString).trim().replace(/^\uFEFF/, '');
        const recovered = cleanedString
          .replace(/\\"/g, '"')
          .replace(/,\s*([}\]])/g, '$1');
        const result = JSON.parse(recovered);
        console.log("[Staff Homepage] JSON recovery successful.");
        return result;
      } catch (secondError) {
        console.error("[Staff Homepage] JSON recovery failed:", secondError);
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
    
    console.log('[Staff Homepage] Extracting valid record ID from value type:', typeof value, value);

    // Handle objects (most common case in Knack connections)
    if (typeof value === 'object' && value !== null) {
      // Check for direct ID property
      if (value.id && isValidKnackId(value.id)) {
        console.log('[Staff Homepage] Found valid ID in object.id:', value.id);
        return value.id;
      }
      
      // Check for identifier property
      if (value.identifier && isValidKnackId(value.identifier)) {
        console.log('[Staff Homepage] Found valid ID in object.identifier:', value.identifier);
        return value.identifier;
      }
      
      // Handle arrays from connection fields
      if (Array.isArray(value)) {
        console.log('[Staff Homepage] Value is an array with length:', value.length);
        
        // Handle single item array
        if (value.length === 1) {
          if (typeof value[0] === 'object' && value[0].id) {
            console.log('[Staff Homepage] Found valid ID in array[0].id:', value[0].id);
            return isValidKnackId(value[0].id) ? value[0].id : null;
          }
          if (typeof value[0] === 'string' && isValidKnackId(value[0])) {
            console.log('[Staff Homepage] Found valid ID as string in array[0]:', value[0]);
            return value[0];
          }
        }
        
        // For debugging, log contents of larger arrays
        if (value.length > 1) {
          console.log('[Staff Homepage] Array contains multiple items, first few are:', 
                     value.slice(0, 3));
        }
      }
      
      // Check for '_id' property which is sometimes used
      if (value._id && isValidKnackId(value._id)) {
        console.log('[Staff Homepage] Found valid ID in object._id:', value._id);
        return value._id;
      }
    }

    // If it's a direct string ID
    if (typeof value === 'string') {
      if (isValidKnackId(value)) {
        console.log('[Staff Homepage] Value is a valid ID string:', value);
        return value;
      } else {
        console.log('[Staff Homepage] String is not a valid Knack ID:', value);
      }
    }

    console.log('[Staff Homepage] No valid record ID found in value');
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
    // Reading knackAppId and knackApiKey from config
    const config = window.STAFFHOMEPAGE_CONFIG;
    
    console.log("[Staff Homepage] Config for headers:", JSON.stringify(config));
    
    // Fallback to using Knack's global application ID if not in config
    const knackAppId = (config && config.knackAppId) ? config.knackAppId : Knack.application_id;
    // Use our known API key if not in config
    const knackApiKey = (config && config.knackApiKey) ? config.knackApiKey : '8f733aa5-dd35-4464-8348-64824d1f5f0d';
    
    console.log(`[Staff Homepage] Using AppID: ${knackAppId}`);
    
    if (typeof Knack === 'undefined' || typeof Knack.getUserToken !== 'function') {
      console.error("[Staff Homepage] Knack object or getUserToken function not available.");
      throw new Error("Knack authentication context not available.");
    }
    
    const token = Knack.getUserToken();
    if (!token) {
      console.warn("[Staff Homepage] Knack user token is null or undefined. API calls may fail.");
    }
    
    const headers = {
      'X-Knack-Application-Id': knackAppId,
      'X-Knack-REST-API-Key': knackApiKey,
      'Authorization': token || '',
      'Content-Type': 'application/json'
    };
    
    console.log("[Staff Homepage] Headers being used:", JSON.stringify(headers));
    
    return headers;
  }

  // --- Staff Profile Data Management ---
  // Get staff profile information
  async function getStaffProfileData() {
    const user = Knack.getUserAttributes();
    if (!user || !user.id) {
      console.error("[Staff Homepage] Cannot get staff profile: User is not logged in or missing ID");
      return null;
    }
    
    try {
      debugLog("Getting staff profile data for:", user);
      
      // Find the staff record based on user email
      const staffRecord = await findStaffRecord(user.email);
      if (!staffRecord) {
        console.error("[Staff Homepage] Staff record not found for email:", user.email);
        return {
          name: user.name || "Staff Member",
          roles: ["Unknown Role"],
          school: null,
          email: user.email,
          userId: user.id
        };
      }
      
      // Extract school ID for later use
      const schoolId = extractValidRecordId(staffRecord[FIELD_MAPPING.schoolConnection]);
      
      // Get school details if we have a school ID
      let schoolRecord = null;
      let schoolLogo = null;
      
      if (schoolId) {
        schoolRecord = await getSchoolRecord(schoolId);
        
        if (schoolRecord) {
          // Extract school logo URL
          schoolLogo = schoolRecord.field_61;
          if (schoolLogo && typeof schoolLogo === 'string') {
            debugLog("Found school logo URL:", schoolLogo);
          } else {
            console.warn("[Staff Homepage] No valid school logo found in school record");
            schoolLogo = null;
          }
        }
      }
      
      // Extract roles from staff record
      let roles = [];
      if (staffRecord[FIELD_MAPPING.staffRole]) {
        // Check if roles field is an array or string
        if (Array.isArray(staffRecord[FIELD_MAPPING.staffRole])) {
          // Process each role to convert "profile#" to actual role names
          roles = staffRecord[FIELD_MAPPING.staffRole].map(role => {
            // If role is like "profile5", convert to actual role name
            if (typeof role === 'string' && role.startsWith('profile')) {
              const roleMap = {
                'profile5': 'Staff Admin',
                'profile7': 'Tutor',
                'profile8': 'Subject Teacher',
                'profile9': 'Head of Year',
                'profile10': 'School Admin'
              };
              return sanitizeField(roleMap[role] || role);
            }
            return sanitizeField(role);
          });
        } else {
          // Handle single role value
          const role = staffRecord[FIELD_MAPPING.staffRole];
          if (typeof role === 'string' && role.startsWith('profile')) {
            const roleMap = {
              'profile5': 'Staff Admin',
              'profile7': 'Tutor',
              'profile8': 'Subject Teacher',
              'profile9': 'Head of Year',
              'profile10': 'School Admin'
            };
            roles = [sanitizeField(roleMap[role] || role)];
          } else {
            roles = [sanitizeField(role)];
          }
        }
      }
      
      // If no roles found, use a default
      if (roles.length === 0) {
        roles = ["Staff Member"];
      }
      
      // Create profile data object
      const profileData = {
        name: sanitizeField(user.name || staffRecord.field_129 || "Staff Member"),
        roles: roles,
        school: schoolRecord ? sanitizeField(schoolRecord.field_2 || "VESPA Academy") : "VESPA Academy",
        schoolId: schoolId,
        email: user.email,
        userId: user.id,
        schoolLogo: schoolLogo
      };
      
      debugLog("Compiled staff profile data:", profileData);
      return profileData;
    } catch (error) {
      console.error("[Staff Homepage] Error getting staff profile data:", error);
      return null;
    }
  }
  
  // Find the staff record for the user by email
  async function findStaffRecord(email) {
    if (!email) return null;
    
    const filters = encodeURIComponent(JSON.stringify({
      match: 'or',
      rules: [
        { field: 'field_91', operator: 'is', value: email },
        { field: 'field_70', operator: 'is', value: email }
      ]
    }));
    
    try {
      const response = await retryApiCall(() => {
        return new Promise((resolve, reject) => {
          $.ajax({
            url: `${KNACK_API_URL}/objects/object_3/records?filters=${filters}`,
            type: 'GET',
            headers: getKnackHeaders(),
            data: { format: 'raw' },
            success: resolve,
            error: reject
          });
        });
      });
      
      if (response && response.records && response.records.length > 0) {
        const staffRecord = response.records[0];
        debugLog("Found staff record:", staffRecord);
        return staffRecord;
      }
      
      return null;
    } catch (error) {
      console.error('[Staff Homepage] Error finding staff record:', error);
      return null;
    }
  }
  
  // Get school record by ID
  async function getSchoolRecord(schoolId) {
    if (!schoolId) return null;
    
    try {
      const response = await retryApiCall(() => {
        return new Promise((resolve, reject) => {
          $.ajax({
            url: `${KNACK_API_URL}/objects/object_2/records/${schoolId}`,
            type: 'GET',
            headers: getKnackHeaders(),
            data: { format: 'raw' },
            success: resolve,
            error: reject
          });
        });
      });
      
      if (response) {
        debugLog("Found school record:", response);
        return response;
      }
      
      return null;
    } catch (error) {
      console.error('[Staff Homepage] Error getting school record:', error);
      return null;
    }
  }
  
  // Get school name from school ID
  async function getSchoolName(schoolId) {
    if (!schoolId) return "VESPA Academy"; // Default fallback
    
    try {
      const schoolRecord = await getSchoolRecord(schoolId);
      if (schoolRecord && schoolRecord.field_2) {
        return schoolRecord.field_2;
      }
      return "VESPA Academy"; // Default fallback if record found but no name
    } catch (error) {
      console.error('[Staff Homepage] Error getting school name:', error);
      return "VESPA Academy"; // Default fallback on error
    }
  }
  
  // --- VESPA Results Data Management ---
  // Get VESPA results for the school
  async function getSchoolVESPAResults(schoolId) {
    if (!schoolId) {
      console.error("[Staff Homepage] Cannot get VESPA results: Missing schoolId");
      return null;
    }
    
    try {
      // Create filter to get all results for the school
      // For proper school identification based on the logged-in user's school
      const schoolName = sanitizeField(await getSchoolName(schoolId));
      
      debugLog(`Using school filter to get all students from school: ${schoolName}`);
      
      const filters = encodeURIComponent(JSON.stringify({
        match: 'and',
        rules: [
          { field: FIELD_MAPPING.resultsSchool, operator: 'contains', value: "VESPA" }
        ]
      }));
      
      console.log(`[Staff Homepage] Querying for VESPA results with filter:`, decodeURIComponent(filters));
      
      // Add limit parameter to handle large datasets better
      const response = await retryApiCall(() => {
        return new Promise((resolve, reject) => {
          $.ajax({
            url: `${KNACK_API_URL}/objects/object_10/records?filters=${filters}&limit=500&sort_field=id&sort_order=asc`,
            type: 'GET',
            headers: getKnackHeaders(),
            data: { format: 'raw' },
            success: resolve,
            error: reject
          });
        });
      });
      
      console.log(`[Staff Homepage] VESPA results API response status:`, 
                 response ? `Found ${response.records?.length || 0} records` : 'No response');
      
      if (response && response.records && response.records.length > 0) {
        debugLog(`Found ${response.records.length} VESPA results for school:`, schoolId);
        
      // Calculate averages for each VESPA category, excluding null or zero values
      const totals = {
        vision: { sum: 0, count: 0 },
        effort: { sum: 0, count: 0 },
        systems: { sum: 0, count: 0 },
        practice: { sum: 0, count: 0 },
        attitude: { sum: 0, count: 0 },
        totalCount: 0
      };
      
      // Function to safely parse and validate a VESPA value
      const getValidValue = (value) => {
        if (value === undefined || value === null) return null;
        const parsed = parseFloat(value);
        return (!isNaN(parsed) && parsed > 0) ? parsed : null;
      };
      
      for (const record of response.records) {
        // Get valid values for each category
        const vision = getValidValue(record[FIELD_MAPPING.vision]);
        const effort = getValidValue(record[FIELD_MAPPING.effort]);
        const systems = getValidValue(record[FIELD_MAPPING.systems]);
        const practice = getValidValue(record[FIELD_MAPPING.practice]);
        const attitude = getValidValue(record[FIELD_MAPPING.attitude]);
        
        // Only include record in total count if it has at least one valid VESPA value
        if (vision !== null || effort !== null || systems !== null || practice !== null || attitude !== null) {
          totals.totalCount++;
          
          // Add valid values to their respective totals
          if (vision !== null) {
            totals.vision.sum += vision;
            totals.vision.count++;
          }
          
          if (effort !== null) {
            totals.effort.sum += effort;
            totals.effort.count++;
          }
          
          if (systems !== null) {
            totals.systems.sum += systems;
            totals.systems.count++;
          }
          
          if (practice !== null) {
            totals.practice.sum += practice;
            totals.practice.count++;
          }
          
          if (attitude !== null) {
            totals.attitude.sum += attitude;
            totals.attitude.count++;
          }
        }
      }
        
      // Calculate averages - only divide by the count of valid values for that category
      const averages = {
        vision: totals.vision.count > 0 ? (totals.vision.sum / totals.vision.count).toFixed(2) : 0,
        effort: totals.effort.count > 0 ? (totals.effort.sum / totals.effort.count).toFixed(2) : 0,
        systems: totals.systems.count > 0 ? (totals.systems.sum / totals.systems.count).toFixed(2) : 0,
        practice: totals.practice.count > 0 ? (totals.practice.sum / totals.practice.count).toFixed(2) : 0,
        attitude: totals.attitude.count > 0 ? (totals.attitude.sum / totals.attitude.count).toFixed(2) : 0,
        count: totals.totalCount
      };
        
        debugLog("Calculated school VESPA averages:", averages);
        return averages;
      }
      
      return null;
    } catch (error) {
      console.error('[Staff Homepage] Error getting school VESPA results:', error);
      return null;
    }
  }
  
  // Get VESPA results for staff's connected students
  async function getStaffVESPAResults(staffEmail, schoolId, userRoles) {
    if (!staffEmail || !schoolId) {
      console.error("[Staff Homepage] Cannot get staff VESPA results: Missing email or schoolId");
      return null;
    }
    
    try {
      // Get school name for filtering
      const schoolName = sanitizeField(await getSchoolName(schoolId));
      debugLog(`Looking for staff (${staffEmail}) students in school: ${schoolName}`);
      
      // Check if user is only a Staff Admin (they should see only one graph)
      const isOnlyStaffAdmin = isStaffAdmin(userRoles) && 
                                userRoles.length === 1 && 
                                userRoles[0].toLowerCase().includes('admin');
      
      if (isOnlyStaffAdmin) {
        debugLog("User is only a Staff Admin - should not see second graph");
        return null;
      }
      
      // Role hierarchy for users with multiple roles:
      // 1. Tutor (highest priority)
      // 2. Head of Year 
      // 3. Subject Teacher (lowest priority)
      
      // First, check if the user is a tutor
      let useTutorRole = false;
      let useHeadOfYearRole = false;
      let useSubjectTeacherRole = false;
      
      for (const role of userRoles) {
        const normalizedRole = role.toLowerCase();
        if (normalizedRole.includes('tutor')) {
          useTutorRole = true;
          break; // Highest priority, no need to check further
        } else if (normalizedRole.includes('head of year') || normalizedRole.includes('headofyear')) {
          useHeadOfYearRole = true;
          // Don't break - continue checking for tutor role
        } else if (normalizedRole.includes('subject teacher') || normalizedRole.includes('subjectteacher')) {
          useSubjectTeacherRole = true;
          // Don't break - continue checking for higher priority roles
        }
      }
      
      // Based on role hierarchy, determine which students to show
      let resultsToUse = null;
      let roleUsed = "none";
      
      if (useTutorRole) {
        // Create filter for tutor records (highest priority)
        const tutorFilter = encodeURIComponent(JSON.stringify({
          match: 'and',
          rules: [
            { field: FIELD_MAPPING.tutor, operator: 'is', value: staffEmail },
            { field: FIELD_MAPPING.resultsSchool, operator: 'is', value: schoolName }
          ]
        }));
        
        const tutorResults = await retryApiCall(() => {
          return new Promise((resolve, reject) => {
            $.ajax({
              url: `${KNACK_API_URL}/objects/object_10/records?filters=${tutorFilter}`,
              type: 'GET',
              headers: getKnackHeaders(),
              data: { format: 'raw' },
              success: resolve,
              error: reject
            });
          });
        }).catch(error => {
          console.error('[Staff Homepage] Error getting tutor VESPA results:', error);
          return { records: [] };
        });
        
        if (tutorResults.records && tutorResults.records.length > 0) {
          resultsToUse = tutorResults.records;
          roleUsed = "Tutor";
        }
      }
      
      if (!resultsToUse && useHeadOfYearRole) {
        // Create filter for Head of Year records (medium priority)
        const headOfYearFilter = encodeURIComponent(JSON.stringify({
          match: 'and',
          rules: [
            { field: FIELD_MAPPING.headOfYear, operator: 'is', value: staffEmail },
            { field: FIELD_MAPPING.resultsSchool, operator: 'is', value: schoolName }
          ]
        }));
        
        const headOfYearResults = await retryApiCall(() => {
          return new Promise((resolve, reject) => {
            $.ajax({
              url: `${KNACK_API_URL}/objects/object_10/records?filters=${headOfYearFilter}`,
              type: 'GET',
              headers: getKnackHeaders(),
              data: { format: 'raw' },
              success: resolve,
              error: reject
            });
          });
        }).catch(error => {
          console.error('[Staff Homepage] Error getting head of year VESPA results:', error);
          return { records: [] };
        });
        
        if (headOfYearResults.records && headOfYearResults.records.length > 0) {
          resultsToUse = headOfYearResults.records;
          roleUsed = "Head of Year";
        }
      }
      
      if (!resultsToUse && useSubjectTeacherRole) {
        // Create filter for Subject Teacher records (lowest priority)
        const subjectTeacherFilter = encodeURIComponent(JSON.stringify({
          match: 'and',
          rules: [
            { field: FIELD_MAPPING.subjectTeacher, operator: 'is', value: staffEmail },
            { field: FIELD_MAPPING.resultsSchool, operator: 'is', value: schoolName }
          ]
        }));
        
        const subjectTeacherResults = await retryApiCall(() => {
          return new Promise((resolve, reject) => {
            $.ajax({
              url: `${KNACK_API_URL}/objects/object_10/records?filters=${subjectTeacherFilter}`,
              type: 'GET',
              headers: getKnackHeaders(),
              data: { format: 'raw' },
              success: resolve,
              error: reject
            });
          });
        }).catch(error => {
          console.error('[Staff Homepage] Error getting subject teacher VESPA results:', error);
          return { records: [] };
        });
        
        if (subjectTeacherResults.records && subjectTeacherResults.records.length > 0) {
          resultsToUse = subjectTeacherResults.records;
          roleUsed = "Subject Teacher";
        }
      }
      
      // If no connected students found based on role hierarchy, return null
      if (!resultsToUse || resultsToUse.length === 0) {
        return null;
      }
      
      debugLog(`Using ${roleUsed} role for staff results with ${resultsToUse.length} students`);
      
      // Calculate averages for each VESPA category, excluding null or zero values (same as school calculation)
      const totals = {
        vision: { sum: 0, count: 0 },
        effort: { sum: 0, count: 0 },
        systems: { sum: 0, count: 0 },
        practice: { sum: 0, count: 0 },
        attitude: { sum: 0, count: 0 },
        totalCount: 0
      };
      
      // Function to safely parse and validate a VESPA value
      const getValidValue = (value) => {
        if (value === undefined || value === null) return null;
        const parsed = parseFloat(value);
        return (!isNaN(parsed) && parsed > 0) ? parsed : null;
      };
      
      for (const record of resultsToUse) {
        // Get valid values for each category
        const vision = getValidValue(record[FIELD_MAPPING.vision]);
        const effort = getValidValue(record[FIELD_MAPPING.effort]);
        const systems = getValidValue(record[FIELD_MAPPING.systems]);
        const practice = getValidValue(record[FIELD_MAPPING.practice]);
        const attitude = getValidValue(record[FIELD_MAPPING.attitude]);
        
        // Only include record in total count if it has at least one valid VESPA value
        if (vision !== null || effort !== null || systems !== null || practice !== null || attitude !== null) {
          totals.totalCount++;
          
          // Add valid values to their respective totals
          if (vision !== null) {
            totals.vision.sum += vision;
            totals.vision.count++;
          }
          
          if (effort !== null) {
            totals.effort.sum += effort;
            totals.effort.count++;
          }
          
          if (systems !== null) {
            totals.systems.sum += systems;
            totals.systems.count++;
          }
          
          if (practice !== null) {
            totals.practice.sum += practice;
            totals.practice.count++;
          }
          
          if (attitude !== null) {
            totals.attitude.sum += attitude;
            totals.attitude.count++;
          }
        }
      }
      
      // Calculate averages - only divide by the count of valid values for that category
      const averages = {
        vision: totals.vision.count > 0 ? (totals.vision.sum / totals.vision.count).toFixed(2) : 0,
        effort: totals.effort.count > 0 ? (totals.effort.sum / totals.effort.count).toFixed(2) : 0,
        systems: totals.systems.count > 0 ? (totals.systems.sum / totals.systems.count).toFixed(2) : 0,
        practice: totals.practice.count > 0 ? (totals.practice.sum / totals.practice.count).toFixed(2) : 0,
        attitude: totals.attitude.count > 0 ? (totals.attitude.sum / totals.attitude.count).toFixed(2) : 0,
        count: totals.totalCount
      };
      
      debugLog("Calculated staff connected students VESPA averages:", averages);
      return averages;
    } catch (error) {
      console.error('[Staff Homepage] Error getting staff VESPA results:', error);
      return null;
    }
  }
  
  // Check if the user has staff admin role
  function isStaffAdmin(roles) {
    if (!roles || !Array.isArray(roles)) {
      return false;
    }
    
    // For debugging - log all roles
    console.log("[Staff Homepage] Checking admin roles in:", roles);
    
    // Direct check for profile5 (Staff Admin role)
    if (roles.includes('profile5')) {
      console.log("[Staff Homepage] Found direct Staff Admin role (profile5)");
      return true;
    }
    
    // Check if "Staff Admin" is in the roles array (case insensitive)
    // Also check for variations like "staffadmin" without a space
    return roles.some(role => {
      if (typeof role !== 'string') return false;
      
      const normalizedRole = role.toLowerCase().replace(/\s+/g, '');
      console.log(`[Staff Homepage] Checking role: ${role}, normalized: ${normalizedRole}`);
      
      return normalizedRole.includes('staffadmin') || 
             normalizedRole.includes('admin');
    });
  }
  
  // --- UI Rendering ---
  // Render the main homepage UI
  // Render the profile section
  function renderProfileSection(profileData, hasAdminRole) {
    let dashboardButton = '';
    if (hasAdminRole) {
      dashboardButton = `
        <div class="profile-item">
          <a href="https://vespaacademy.knack.com/vespa-academy#dashboard/" class="dashboard-button">
            <img src="https://www.vespa.academy/Icons/resultsdashboard.png" alt="VESPA Dashboard" class="dashboard-icon">
            <span>VESPA Dashboard</span>
          </a>
        </div>
      `;
    }
    
    return `
      <section class="vespa-section profile-section">
        <h2 class="vespa-section-title">Staff Profile</h2>
        <div class="profile-info">
          <div class="profile-details">
            ${profileData.schoolLogo ? `<img src="${profileData.schoolLogo}" alt="${profileData.school} Logo" class="school-logo">` : ''}
            <div class="profile-name">${sanitizeField(profileData.name)}</div>
            
            <div class="profile-item">
              <span class="profile-label">School:</span>
              <span class="profile-value">${sanitizeField(profileData.school)}</span>
            </div>
            
            <div class="profile-item">
              <span class="profile-label">Role(s):</span>
              <span class="profile-value">${profileData.roles.join(', ')}</span>
            </div>
            
            ${dashboardButton}
          </div>
        </div>
      </section>
    `;
  }
  
  // Render the group section
  function renderGroupSection() {
    return renderAppSection("GROUP", APP_SECTIONS.group);
  }
  
  // Render the resources section
  function renderResourcesSection() {
    return renderAppSection("RESOURCES", APP_SECTIONS.resources);
  }
  
  // Render the admin section (only for staff admin)
  function renderAdminSection() {
    return renderAppSection("MANAGE ACCOUNT", APP_SECTIONS.admin);
  }
  
  // Generic function to render an app section
  function renderAppSection(title, apps) {
    if (!apps || !apps.length) return '';
    
    let appsHTML = '';
    apps.forEach(app => {
      appsHTML += `
        <div class="app-card">
          <div class="app-card-header">
            <div class="app-info-icon" title="Click for details" data-description="${sanitizeField(app.description)}">i</div>
            <img src="${app.icon}" alt="${sanitizeField(app.name)}" class="app-icon">
            <div class="app-name">${sanitizeField(app.name)}</div>
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
  
  // Render the VESPA dashboard
  function renderVESPADashboard(schoolResults, staffResults, hasAdminRole) {
    if (!schoolResults) {
      return `
        <section class="vespa-section dashboard-section">
          <h2 class="vespa-section-title">VESPA Dashboard</h2>
          <div class="no-results">No VESPA results available for your school.</div>
        </section>
      `;
    }
    
    const showComparison = staffResults && !hasAdminRole;
    
    return `
      <section class="vespa-section dashboard-section">
        <h2 class="vespa-section-title">VESPA Dashboard</h2>
        <div class="charts-container ${showComparison ? 'dual-charts' : 'single-chart'}">
          <div class="chart-wrapper">
            <h3 class="chart-title">School VESPA Results</h3>
            <div class="result-count">${schoolResults.count} students</div>
            <canvas id="schoolChart"></canvas>
          </div>
          
          ${showComparison ? `
            <div class="chart-wrapper">
              <h3 class="chart-title">Your Students' VESPA Results</h3>
              <div class="result-count">${staffResults.count} students</div>
              <canvas id="staffChart"></canvas>
            </div>
          ` : ''}
        </div>
      </section>
    `;
  }
  
  // Initialize VESPA charts using Chart.js
  function initializeVESPACharts(schoolResults, staffResults, hasAdminRole) {
    try {
      // Load Chart.js if not already loaded
      if (typeof Chart === 'undefined') {
        debugLog("Loading Chart.js library...");
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js@3.7.1/dist/chart.min.js';
        script.onload = () => {
          debugLog("Chart.js loaded successfully");
          createCharts(schoolResults, staffResults, hasAdminRole);
        };
        script.onerror = (error) => {
          console.error("[Staff Homepage] Failed to load Chart.js:", error);
        };
        document.head.appendChild(script);
      } else {
        debugLog("Chart.js already loaded, creating charts...");
        createCharts(schoolResults, staffResults, hasAdminRole);
      }
    } catch (error) {
      console.error("[Staff Homepage] Error initializing VESPA charts:", error);
    }
  }
  
  // Create the actual charts once Chart.js is loaded
  function createCharts(schoolResults, staffResults, hasAdminRole) {
    if (!schoolResults) return;
    
    // Create school chart
    const schoolChartCtx = document.getElementById('schoolChart');
    if (schoolChartCtx) {
      new Chart(schoolChartCtx, {
        type: 'bar',
        data: {
          labels: ['Vision', 'Effort', 'Systems', 'Practice', 'Attitude'],
          datasets: [{
            label: 'School Average',
            data: [
              schoolResults.vision,
              schoolResults.effort,
              schoolResults.systems,
              schoolResults.practice,
              schoolResults.attitude
            ],
            backgroundColor: [
              VESPA_COLORS.VISION,
              VESPA_COLORS.EFFORT,
              VESPA_COLORS.SYSTEMS,
              VESPA_COLORS.PRACTICE,
              VESPA_COLORS.ATTITUDE
            ],
            borderColor: [
              VESPA_COLORS.VISION,
              VESPA_COLORS.EFFORT,
              VESPA_COLORS.SYSTEMS,
              VESPA_COLORS.PRACTICE,
              VESPA_COLORS.ATTITUDE
            ],
            borderWidth: 1
          }]
        },
        options: {
          scales: {
            y: {
              beginAtZero: true,
              max: 10,
              grid: {
                color: 'rgba(255, 255, 255, 0.1)'
              },
              ticks: {
                color: 'rgba(255, 255, 255, 0.7)'
              }
            },
            x: {
              grid: {
                color: 'rgba(255, 255, 255, 0.1)'
              },
              ticks: {
                color: 'rgba(255, 255, 255, 0.7)'
              }
            }
          },
          plugins: {
            legend: {
              display: false
            }
          },
          responsive: true,
          maintainAspectRatio: false
        }
      });
    }
    
    // Create staff chart if applicable
    if (staffResults && !hasAdminRole) {
      const staffChartCtx = document.getElementById('staffChart');
      if (staffChartCtx) {
        new Chart(staffChartCtx, {
          type: 'bar',
          data: {
            labels: ['Vision', 'Effort', 'Systems', 'Practice', 'Attitude'],
            datasets: [{
              label: 'Your Students',
              data: [
                staffResults.vision,
                staffResults.effort,
                staffResults.systems,
                staffResults.practice,
                staffResults.attitude
              ],
              backgroundColor: [
                VESPA_COLORS.VISION,
                VESPA_COLORS.EFFORT,
                VESPA_COLORS.SYSTEMS,
                VESPA_COLORS.PRACTICE,
                VESPA_COLORS.ATTITUDE
              ],
              borderColor: [
                VESPA_COLORS.VISION,
                VESPA_COLORS.EFFORT,
                VESPA_COLORS.SYSTEMS,
                VESPA_COLORS.PRACTICE,
                VESPA_COLORS.ATTITUDE
              ],
              borderWidth: 1
            }]
          },
          options: {
            scales: {
              y: {
                beginAtZero: true,
                max: 10,
                grid: {
                  color: 'rgba(255, 255, 255, 0.1)'
                },
                ticks: {
                  color: 'rgba(255, 255, 255, 0.7)'
                }
              },
              x: {
                grid: {
                  color: 'rgba(255, 255, 255, 0.1)'
                },
                ticks: {
                  color: 'rgba(255, 255, 255, 0.7)'
                }
              }
            },
            plugins: {
              legend: {
                display: false
              }
            },
            responsive: true,
            maintainAspectRatio: false
          }
        });
      }
    }
  }
  
  // Set up tooltips for app cards
  function setupTooltips() {
    // Track active tooltip for cleanup
    let activeTooltip = null;
    
    // Function to hide all tooltips
    function hideAllTooltips() {
      if (activeTooltip && activeTooltip.parentNode) {
        activeTooltip.parentNode.removeChild(activeTooltip);
        activeTooltip = null;
      }
    }
    
    // Add global click listener to close tooltips when clicking outside
    document.addEventListener('click', function(e) {
      if (activeTooltip && !e.target.closest('.app-info-icon')) {
        hideAllTooltips();
      }
    });
    
    // Get all info icons
    const infoIcons = document.querySelectorAll('.app-info-icon');
    console.log(`[Staff Homepage] Found ${infoIcons.length} info icons`);
    
    // Add click handlers to each icon
    infoIcons.forEach((icon) => {
      // Add click event
      icon.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Close any existing tooltip first
        hideAllTooltips();
        
        // Get description from attribute
        const description = this.getAttribute('data-description');
        if (!description) return;
        
        // Create tooltip element
        const tooltip = document.createElement('div');
        tooltip.className = 'app-tooltip';
        tooltip.innerHTML = description;
        
        // Position the tooltip
        const rect = this.getBoundingClientRect();
        const isMobile = window.innerWidth <= 768;
        
        if (isMobile) {
          // Center in screen on mobile
          tooltip.style.left = '50%';
          tooltip.style.top = '50%';
          tooltip.style.transform = 'translate(-50%, -50%)';
        } else {
          // Position below the icon on desktop
          tooltip.style.left = rect.left + (rect.width / 2) - 125 + 'px'; // 125px is half the tooltip width
          tooltip.style.top = rect.bottom + 10 + 'px';
        }
        
        // Add tooltip to body and save reference
        document.body.appendChild(tooltip);
        activeTooltip = tooltip;
        
        // Make visible with a small delay for animation
        setTimeout(() => {
          tooltip.classList.add('tooltip-active');
        }, 10);
      });
    });
  }
  
  // Get CSS styles for the homepage
  function getStyleCSS() {
    return `
      /* Main Container - Staff Theme */
      #staff-homepage {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        max-width: 1200px;
        margin: 0 auto;
        padding: 16px;
        color: #ffffff;
        background-color: ${THEME.PRIMARY};
        line-height: 1.4;
        overflow-x: hidden;
        border: 3px solid ${THEME.ACCENT};
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
        background-color: ${THEME.SECTION_BG};
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        padding: 20px;
        margin-bottom: 24px;
        animation: fadeIn 0.5s ease-out forwards;
        transition: transform 0.2s, box-shadow 0.2s;
        border: 2px solid ${THEME.ACCENT};
      }
      
      .vespa-section:hover {
        box-shadow: 0 6px 16px rgba(0, 229, 219, 0.35);
      }
      
      .vespa-section:nth-child(1) { animation-delay: 0.1s; }
      .vespa-section:nth-child(2) { animation-delay: 0.2s; }
      .vespa-section:nth-child(3) { animation-delay: 0.3s; }
      
      .vespa-section-title {
        color: #ffffff;  /* Changed from THEME.ACCENT to white as requested */
        font-size: 22px;
        font-weight: 600;
        margin-bottom: 16px;
        padding-bottom: 8px;
        border-bottom: 2px solid ${THEME.ACCENT};
        text-transform: uppercase;
        letter-spacing: 1px;
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
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        padding: 16px;
        background-color: ${THEME.CARD_BG};
        border-radius: 8px;
        border: 1px solid ${THEME.ACCENT};
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
      }
      
      .school-logo {
        max-width: 100px;
        height: auto;
        margin-bottom: 10px;
        align-self: center;
      }
      
      .profile-name {
        font-size: 24px;
        color: #ffffff;
        margin-bottom: 16px;
        font-weight: 700;
        text-align: center;
      }
      
      .profile-item {
        margin-bottom: 10px;
        padding: 8px;
        border-radius: 4px;
        transition: background-color 0.2s;
      }
      
      .profile-item:hover {
        background-color: #3a4b90;
      }
      
      .profile-label {
        font-weight: 600;
        color: ${THEME.ACCENT};
        margin-right: 8px;
      }
      
      .dashboard-button {
        display: flex;
        align-items: center;
        background-color: ${THEME.ACCENT};
        color: ${THEME.PRIMARY};
        padding: 8px 16px;
        border-radius: 4px;
        text-decoration: none;
        transition: all 0.3s;
        margin-top: 10px;
        font-weight: bold;
      }
      
      .dashboard-button:hover {
        background-color: rgba(0, 229, 219, 0.8);
        transform: translateY(-2px);
      }
      
      .dashboard-icon {
        width: 24px;
        height: 24px;
        margin-right: 8px;
      }
      
      /* Group Resources Container for side-by-side layout on desktop */
      .group-resources-container {
        display: flex;
        flex-direction: row;
        gap: 20px;
        margin-bottom: 24px;
      }
      
      .group-resources-container > section {
        flex: 1;
        margin-bottom: 0;
      }
      
      /* App Hubs - Fixed 2x2 grid */
      .app-hub {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        grid-template-rows: repeat(2, auto);
        gap: 16px;
      }
      
      .app-card {
        background-color: ${THEME.CARD_BG};
        border-radius: 8px;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.25);
        overflow: hidden;
        transition: transform 0.3s, box-shadow 0.3s;
        animation: fadeIn 0.5s ease-out forwards;
        border: 1px solid ${THEME.ACCENT};
        display: flex;
        flex-direction: column;
      }
      
      .app-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
        animation: pulseGlow 2s infinite;
      }
      
      .app-card-header {
        background-color: ${THEME.PRIMARY};
        padding: 16px;
        text-align: center;
        position: relative;
        border-bottom: 2px solid ${THEME.ACCENT};
      }
      
      .app-icon {
        width: 60px;
        height: 60px;
        object-fit: contain;
        margin-bottom: 10px;
        transition: transform 0.3s;
      }
      
      .app-card:hover .app-icon {
        transform: scale(1.1);
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
        background-color: ${THEME.ACCENT};
        color: ${THEME.PRIMARY};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .app-info-icon:hover {
        transform: scale(1.1);
        background-color: rgba(0, 229, 219, 0.8);
      }
      
      /* Tooltips */
      .app-tooltip {
        position: fixed;
        background-color: #1c2b5f;
        color: #ffffff;
        padding: 12px;
        border-radius: 8px;
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.6);
        width: 250px;
        z-index: 10000;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.3s;
        border: 2px solid ${THEME.ACCENT};
        font-size: 14px;
        text-align: center;
      }
      
      .tooltip-active {
        opacity: 1;
        visibility: visible;
      }
      
      .app-button {
        display: block;
        background-color: ${THEME.ACCENT};
        color: ${THEME.PRIMARY};
        text-align: center;
        padding: 12px;
        text-decoration: none;
        font-weight: 600;
        transition: all 0.3s;
        margin-top: auto;
      }
      
      .app-button:hover {
        background-color: rgba(0, 229, 219, 0.8);
        transform: translateY(-2px);
      }
      
      /* VESPA Dashboard */
      .dashboard-section {
        margin-top: 30px;
      }
      
      .charts-container {
        display: flex;
        flex-wrap: wrap;
        gap: 20px;
      }
      
      .chart-wrapper {
        flex: 1;
        min-width: 300px;
        background-color: ${THEME.CARD_BG};
        border-radius: 8px;
        padding: 16px;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        border: 1px solid ${THEME.ACCENT};
      }
      
      .chart-title {
        font-size: 18px;
        color: ${THEME.TEXT};
        margin-bottom: 10px;
        text-align: center;
      }
      
      .result-count {
        font-size: 14px;
        color: #cccccc;
        text-align: center;
        margin-bottom: 15px;
      }
      
      canvas {
        width: 100% !important;
        height: 180px !important; /* Reduced from 300px to make charts more compact */
      }
      
      .no-results {
        padding: 30px;
        text-align: center;
        color: #cccccc;
        font-style: italic;
      }
      
      /* Responsive adjustments */
      @media (max-width: 768px) {
        .app-hub {
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        }
        
        .profile-info {
          flex-direction: column;
        }
        
        .chart-wrapper {
          min-width: 100%;
        }
      }
    `;
  }
  
  // Render the main homepage UI
  async function renderHomepage() {
    const container = document.querySelector(window.STAFFHOMEPAGE_CONFIG.elementSelector);
    if (!container) {
      console.error('[Staff Homepage] Container element not found.');
      return;
    }
    
    // Clear the container
    container.innerHTML = '';
    
    // Show loading indicator with updated theme colors
    container.innerHTML = `
      <div style="padding: 30px; text-align: center; color: ${THEME.ACCENT}; background-color: ${THEME.PRIMARY}; border-radius: 8px; border: 2px solid ${THEME.ACCENT}; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);">
        <h3>Loading VESPA Staff Homepage...</h3>
        <div style="margin-top: 20px;">
          <svg width="60" height="60" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
            <circle cx="25" cy="25" r="20" fill="none" stroke="${THEME.ACCENT}" stroke-width="4">
              <animate attributeName="stroke-dasharray" dur="1.5s" values="1,150;90,150;90,150" repeatCount="indefinite"/>
              <animate attributeName="stroke-dashoffset" dur="1.5s" values="0;-35;-124" repeatCount="indefinite"/>
            </circle>
            <circle cx="25" cy="25" r="10" fill="none" stroke="rgba(0, 229, 219, 0.3)" stroke-width="2">
              <animate attributeName="r" dur="3s" values="10;15;10" repeatCount="indefinite"/>
              <animate attributeName="opacity" dur="3s" values="0.3;0.6;0.3" repeatCount="indefinite"/>
            </circle>
          </svg>
        </div>
      </div>
    `;
    
    try {
      // Get staff profile data
      const profileData = await getStaffProfileData();
      if (!profileData) {
        container.innerHTML = `
          <div style="padding: 30px; text-align: center; color: ${THEME.ACCENT}; background-color: ${THEME.PRIMARY}; border-radius: 8px; border: 2px solid ${THEME.ACCENT}; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);">
            <h3>Error Loading Staff Homepage</h3>
            <p style="color: #ffffff;">Unable to load your staff profile. Please try refreshing the page.</p>
            <button onclick="location.reload()" style="margin-top: 15px; background-color: ${THEME.ACCENT}; color: ${THEME.PRIMARY}; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold;">Refresh Page</button>
          </div>
        `;
        return;
      }
      
      // Get VESPA results data
      const schoolResults = await getSchoolVESPAResults(profileData.schoolId);
      
      // Get staff-specific results if applicable
      const staffResults = profileData.email ? 
        await getStaffVESPAResults(profileData.email, profileData.schoolId, profileData.roles) : null;
      
      // Check if user is a staff admin
      const hasAdminRole = isStaffAdmin(profileData.roles);
      
      // Build the homepage HTML with updated layout based on feedback
      const homepageHTML = `
        <div id="staff-homepage">
          ${renderProfileSection(profileData, hasAdminRole)}
          ${renderVESPADashboard(schoolResults, staffResults, hasAdminRole)}
          <div class="group-resources-container">
            ${renderGroupSection()}
            ${renderResourcesSection()}
          </div>
          ${hasAdminRole ? renderAdminSection() : ''}
        </div>
      `;
      
      // Add the CSS
      const styleElement = document.createElement('style');
      styleElement.textContent = getStyleCSS();
      
      // Add style and content to the container
      container.innerHTML = '';
      container.appendChild(styleElement);
      container.innerHTML += homepageHTML;
      
      // Initialize charts
      if (schoolResults) {
        initializeVESPACharts(schoolResults, staffResults, hasAdminRole);
      }
      
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
      
      debugLog("Staff homepage rendered successfully");
    } catch (error) {
      console.error("Error rendering staff homepage:", error);
      container.innerHTML = `
        <div style="padding: 30px; text-align: center; color: ${THEME.ACCENT}; background-color: ${THEME.PRIMARY}; border-radius: 8px; border: 2px solid ${THEME.ACCENT}; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);">
          <h3>Error Loading Staff Homepage</h3>
          <p style="color: #ffffff;">An unexpected error occurred. Please try refreshing the page.</p>
          <button onclick="location.reload()" style="margin-top: 15px; background-color: ${THEME.ACCENT}; color: ${THEME.PRIMARY}; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold;">Refresh Page</button>
        </div>
      `;
    }
  }
  
  // --- Main Initialization ---
  // Initialize the staff homepage
  window.initializeStaffHomepage = function() {
    debugLog("Initializing Staff Homepage...");
    
    // Verify Knack context and authentication
    if (typeof Knack === 'undefined' || typeof Knack.getUserToken !== 'function') {
      console.error("Staff Homepage Error: Knack context not available.");
      return;
    }
    
    const userToken = Knack.getUserToken();
    if (!userToken) {
      console.error("Staff Homepage Error: User is not authenticated (no token).");
      return;
    }
    
    // Render the homepage
    renderHomepage();
  };

})();

