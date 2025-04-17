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

  // Staff profile field mappings
  const FIELD_MAPPING = {
    // Staff user fields
    userId: 'field_3064',         // User ID 
    userConnection: 'field_3070',  // User Account connection
    staffName: 'field_3066',      // Staff Name
    staffRole: 'field_73',        // Staff Role(s)
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
          roles = staffRecord[FIELD_MAPPING.staffRole].map(role => sanitizeField(role));
        } else {
          roles = [sanitizeField(staffRecord[FIELD_MAPPING.staffRole])];
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
  
  // --- VESPA Results Data Management ---
  // Get VESPA results for the school
  async function getSchoolVESPAResults(schoolId) {
    if (!schoolId) {
      console.error("[Staff Homepage] Cannot get VESPA results: Missing schoolId");
      return null;
    }
    
    try {
      // Create filter to get all results for the school
      const filters = encodeURIComponent(JSON.stringify({
        match: 'and',
        rules: [
          { field: FIELD_MAPPING.resultsSchool, operator: 'is', value: schoolId }
        ]
      }));
      
      const response = await retryApiCall(() => {
        return new Promise((resolve, reject) => {
          $.ajax({
            url: `${KNACK_API_URL}/objects/object_10/records?filters=${filters}`,
            type: 'GET',
            headers: getKnackHeaders(),
            data: { format: 'raw' },
            success: resolve,
            error: reject
          });
        });
      });
      
      if (response && response.records && response.records.length > 0) {
        debugLog(`Found ${response.records.length} VESPA results for school:`, schoolId);
        
        // Calculate averages for each VESPA category
        const totals = {
          vision: 0,
          effort: 0,
          systems: 0,
          practice: 0,
          attitude: 0,
          count: 0
        };
        
        for (const record of response.records) {
          // Only count records that have at least one valid VESPA value
          if (
            record[FIELD_MAPPING.vision] !== undefined ||
            record[FIELD_MAPPING.effort] !== undefined ||
            record[FIELD_MAPPING.systems] !== undefined ||
            record[FIELD_MAPPING.practice] !== undefined ||
            record[FIELD_MAPPING.attitude] !== undefined
          ) {
            if (record[FIELD_MAPPING.vision] !== undefined) {
              totals.vision += parseFloat(record[FIELD_MAPPING.vision]) || 0;
            }
            if (record[FIELD_MAPPING.effort] !== undefined) {
              totals.effort += parseFloat(record[FIELD_MAPPING.effort]) || 0;
            }
            if (record[FIELD_MAPPING.systems] !== undefined) {
              totals.systems += parseFloat(record[FIELD_MAPPING.systems]) || 0;
            }
            if (record[FIELD_MAPPING.practice] !== undefined) {
              totals.practice += parseFloat(record[FIELD_MAPPING.practice]) || 0;
            }
            if (record[FIELD_MAPPING.attitude] !== undefined) {
              totals.attitude += parseFloat(record[FIELD_MAPPING.attitude]) || 0;
            }
            
            totals.count++;
          }
        }
        
        // Calculate averages
        const averages = {
          vision: totals.count > 0 ? (totals.vision / totals.count).toFixed(2) : 0,
          effort: totals.count > 0 ? (totals.effort / totals.count).toFixed(2) : 0,
          systems: totals.count > 0 ? (totals.systems / totals.count).toFixed(2) : 0,
          practice: totals.count > 0 ? (totals.practice / totals.count).toFixed(2) : 0,
          attitude: totals.count > 0 ? (totals.attitude / totals.count).toFixed(2) : 0,
          count: totals.count
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
  async function getStaffVESPAResults(staffEmail, schoolId) {
    if (!staffEmail || !schoolId) {
      console.error("[Staff Homepage] Cannot get staff VESPA results: Missing email or schoolId");
      return null;
    }
    
    try {
      // Create filters for each staff connection field, but still filter by the same school
      const tutorFilter = encodeURIComponent(JSON.stringify({
        match: 'and',
        rules: [
          { field: FIELD_MAPPING.tutor, operator: 'is', value: staffEmail },
          { field: FIELD_MAPPING.resultsSchool, operator: 'is', value: schoolId }
        ]
      }));
      
      const headOfYearFilter = encodeURIComponent(JSON.stringify({
        match: 'and',
        rules: [
          { field: FIELD_MAPPING.headOfYear, operator: 'is', value: staffEmail },
          { field: FIELD_MAPPING.resultsSchool, operator: 'is', value: schoolId }
        ]
      }));
      
      const subjectTeacherFilter = encodeURIComponent(JSON.stringify({
        match: 'and',
        rules: [
          { field: FIELD_MAPPING.subjectTeacher, operator: 'is', value: staffEmail },
          { field: FIELD_MAPPING.resultsSchool, operator: 'is', value: schoolId }
        ]
      }));
      
      // Make separate queries for each role
      const [tutorResults, headOfYearResults, subjectTeacherResults] = await Promise.all([
        retryApiCall(() => {
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
        }),
        
        retryApiCall(() => {
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
        }),
        
        retryApiCall(() => {
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
        })
      ]);
      
      // Combine all results, but avoid duplicates by using a Map with record ID as key
      const allResults = new Map();
      
      const addRecordsToMap = (records) => {
        if (records && Array.isArray(records)) {
          for (const record of records) {
            if (record.id) {
              allResults.set(record.id, record);
            }
          }
        }
      };
      
      addRecordsToMap(tutorResults.records);
      addRecordsToMap(headOfYearResults.records);
      addRecordsToMap(subjectTeacherResults.records);
      
      const combinedResults = Array.from(allResults.values());
      debugLog(`Found ${combinedResults.length} unique VESPA results for staff email ${staffEmail}`, {
        tutorCount: tutorResults.records?.length || 0,
        headOfYearCount: headOfYearResults.records?.length || 0,
        subjectTeacherCount: subjectTeacherResults.records?.length || 0
      });
      
      // If no connected students found, return null
      if (combinedResults.length === 0) {
        return null;
      }
      
      // Calculate averages for each VESPA category
      const totals = {
        vision: 0,
        effort: 0,
        systems: 0,
        practice: 0,
        attitude: 0,
        count: 0
      };
      
      for (const record of combinedResults) {
        // Only count records that have at least one valid VESPA value
        if (
          record[FIELD_MAPPING.vision] !== undefined ||
          record[FIELD_MAPPING.effort] !== undefined ||
          record[FIELD_MAPPING.systems] !== undefined ||
          record[FIELD_MAPPING.practice] !== undefined ||
          record[FIELD_MAPPING.attitude] !== undefined
        ) {
          if (record[FIELD_MAPPING.vision] !== undefined) {
            totals.vision += parseFloat(record[FIELD_MAPPING.vision]) || 0;
          }
          if (record[FIELD_MAPPING.effort] !== undefined) {
            totals.effort += parseFloat(record[FIELD_MAPPING.effort]) || 0;
          }
          if (record[FIELD_MAPPING.systems] !== undefined) {
            totals.systems += parseFloat(record[FIELD_MAPPING.systems]) || 0;
          }
          if (record[FIELD_MAPPING.practice] !== undefined) {
            totals.practice += parseFloat(record[FIELD_MAPPING.practice]) || 0;
          }
          if (record[FIELD_MAPPING.attitude] !== undefined) {
            totals.attitude += parseFloat(record[FIELD_MAPPING.attitude]) || 0;
          }
          
          totals.count++;
        }
      }
      
      // Calculate averages
      const averages = {
        vision: totals.count > 0 ? (totals.vision / totals.count).toFixed(2) : 0,
        effort: totals.count > 0 ? (totals.effort / totals.count).toFixed(2) : 0,
        systems: totals.count > 0 ? (totals.systems / totals.count).toFixed(2) : 0,
        practice: totals.count > 0 ? (totals.practice / totals.count).toFixed(2) : 0,
        attitude: totals.count > 0 ? (totals.attitude / totals.count).toFixed(2) : 0,
        count: totals.count
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
    
    // Check if "Staff Admin" is in the roles array
    return roles.some(role => 
      typeof role === 'string' && 
      role.toLowerCase().includes('staff admin')
    );
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
        background-color: #23356f;
        line-height: 1.4;
        overflow-x: hidden;
        border: 3px solid #7f31a4;
        border-radius: 10px;
      }
      
      /* Animation Keyframes */
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      @keyframes pulseGlow {
        0% { box-shadow: 0 4px 12px rgba(127, 49, 164, 0.1); }
        50% { box-shadow: 0 4px 18px rgba(127, 49, 164, 0.25); }
        100% { box-shadow: 0 4px 12px rgba(127, 49, 164, 0.1); }
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
        border: 2px solid #7f31a4;
      }
      
      .vespa-section:hover {
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35);
      }
      
      .vespa-section:nth-child(1) { animation-delay: 0.1s; }
      .vespa-section:nth-child(2) { animation-delay: 0.2s; }
      .vespa-section:nth-child(3) { animation-delay: 0.3s; }
      
      .vespa-section-title {
        color: #7f31a4;
        font-size: 22px;
        font-weight: 600;
        margin-bottom: 16px;
        padding-bottom: 8px;
        border-bottom: 2px solid #7f31a4;
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
        background-color: #334285;
        border-radius: 8px;
        border: 1px solid rgba(127, 49, 164, 0.3);
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
        color: #7f31a4;
        margin-right: 8px;
      }
      
      .dashboard-button {
        display: flex;
        align-items: center;
        background-color: #7f31a4;
        color: white;
        padding: 8px 16px;
        border-radius: 4px;
        text-decoration: none;
        transition: all 0.3s;
        margin-top: 10px;
      }
      
      .dashboard-button:hover {
        background-color: #9c4bc1;
        transform: translateY(-2px);
      }
      
      .dashboard-icon {
        width: 24px;
        height: 24px;
        margin-right: 8px;
      }
      
      /* App sections container */
      .app-sections-container {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }
      
      /* App Hubs */
      .app-hub {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
      }
      
      .app-card {
        background-color: #334285;
        border-radius: 8px;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.25);
        overflow: hidden;
        transition: transform 0.3s, box-shadow 0.3s;
        animation: fadeIn 0.5s ease-out forwards;
        border: 1px solid rgba(127, 49, 164, 0.3);
        display: flex;
        flex-direction: column;
      }
      
      .app-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
        animation: pulseGlow 2s infinite;
      }
      
      .app-card-header {
        background-color: #1c2b5f;
        padding: 16px;
        text-align: center;
        position: relative;
        border-bottom: 2px solid #7f31a4;
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
        background-color: #7f31a4;
        color: white;
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
        background-color: #9c4bc1;
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
        border: 2px solid #7f31a4;
        font-size: 14px;
        text-align: center;
      }
      
      .tooltip-active {
        opacity: 1;
        visibility: visible;
      }
      
      .app-button {
        display: block;
        background-color: #7f31a4;
        color: #ffffff;
        text-align: center;
        padding: 12px;
        text-decoration: none;
        font-weight: 600;
        transition: all 0.3s;
        margin-top: auto;
      }
      
      .app-button:hover {
        background-color: #9c4bc1;
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
        background-color: #334285;
        border-radius: 8px;
        padding: 16px;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        border: 1px solid rgba(127, 49, 164, 0.3);
      }
      
      .chart-title {
        font-size: 18px;
        color: #ffffff;
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
        height: 300px !important;
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
    
    // Show loading indicator
    container.innerHTML = `
      <div style="padding: 30px; text-align: center; color: #7f31a4; background-color: #23356f; border-radius: 8px; border: 2px solid #7f31a4; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);">
        <h3>Loading VESPA Staff Homepage...</h3>
        <div style="margin-top: 20px;">
          <svg width="60" height="60" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
            <circle cx="25" cy="25" r="20" fill="none" stroke="#7f31a4" stroke-width="4">
              <animate attributeName="stroke-dasharray" dur="1.5s" values="1,150;90,150;90,150" repeatCount="indefinite"/>
              <animate attributeName="stroke-dashoffset" dur="1.5s" values="0;-35;-124" repeatCount="indefinite"/>
            </circle>
            <circle cx="25" cy="25" r="10" fill="none" stroke="rgba(127, 49, 164, 0.3)" stroke-width="2">
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
          <div style="padding: 30px; text-align: center; color: #7f31a4; background-color: #23356f; border-radius: 8px; border: 2px solid #7f31a4; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);">
            <h3>Error Loading Staff Homepage</h3>
            <p style="color: #ffffff;">Unable to load your staff profile. Please try refreshing the page.</p>
            <button onclick="location.reload()" style="margin-top: 15px; background-color: #7f31a4; color: #ffffff; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold;">Refresh Page</button>
          </div>
        `;
        return;
      }
      
      // Get VESPA results data
      const schoolResults = await getSchoolVESPAResults(profileData.schoolId);
      
      // Get staff-specific results if applicable
      const staffResults = profileData.email ? 
        await getStaffVESPAResults(profileData.email, profileData.schoolId) : null;
      
      // Check if user is a staff admin
      const hasAdminRole = isStaffAdmin(profileData.roles);
      
      // Build the homepage HTML
      const homepageHTML = `
        <div id="staff-homepage">
          ${renderProfileSection(profileData, hasAdminRole)}
          <div class="app-sections-container">
            ${renderGroupSection()}
            ${renderResourcesSection()}
            ${hasAdminRole ? renderAdminSection() : ''}
          </div>
          ${renderVESPADashboard(schoolResults, staffResults, hasAdminRole)}
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
        <div style="padding: 30px; text-align: center; color: #7f31a4; background-color: #23356f; border-radius: 8px; border: 2px solid #7f31a4; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);">
          <h3>Error Loading Staff Homepage</h3>
          <p style="color: #ffffff;">An unexpected error occurred. Please try refreshing the page.</p>
          <button onclick="location.reload()" style="margin-top: 15px; background-color: #7f31a4; color: #ffffff; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold;">Refresh Page</button>
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
