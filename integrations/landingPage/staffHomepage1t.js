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
    
    // Theme Colors - Updated with gradients and refined colors
const THEME = {
    PRIMARY: 'linear-gradient(135deg, #0a2b8c 0%, #061a54 100%)',  // Gradient background
    ACCENT: '#00e5db',     // Keep accent color
    TEXT: '#ffffff',       // Keep text color
    CARD_BG: 'linear-gradient(135deg, #15348e 0%, #102983 100%)',  // Card gradient
    SECTION_BG: 'linear-gradient(135deg, #132c7a 0%, #0d2274 100%)', // Section gradient
    BORDER: '#00e5db',     // Keep border color
    POSITIVE: '#4ade80',   // Green for positive trends
    NEGATIVE: '#f87171'    // Red for negative trends
  };
  
    // Staff profile field mappings
    const FIELD_MAPPING = {
      // Staff user fields
      userId: 'field_3064',         // User ID 
      userConnection: 'field_3070',  // User Account connection
      staffName: 'field_3066',      // Staff Name
      staffRole: 'field_73',        // Correct staff role field in Object_3 (was showing "profile#")
      schoolConnection: 'field_122', // School connection
      staffAdmin: 'field_439',   // Staff Admin connection field
      
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

    // Professional icon mapping using Font Awesome classes
const ICON_MAPPING = {
    // Group section
    "VESPA Results": "fa-solid fa-chart-column",
    "Coaching Reports": "fa-solid fa-comments",
    "Student Activities": "fa-solid fa-list-check",
    "Study Sessions": "fa-solid fa-calendar-check",
    
    // Resources section
    "Slide Decks": "fa-solid fa-display", // Changed to fa-display which exists in Font Awesome
    "Newsletter": "fa-solid fa-newspaper",
    "Curriculum": "fa-solid fa-book-open",
    "Worksheets": "fa-solid fa-file-pdf",
    
    // Admin section
    "Students": "fa-solid fa-user-graduate",
    "Staff": "fa-solid fa-chalkboard-teacher",
    "Questionnaire": "fa-solid fa-clipboard-question",
    "Account": "fa-solid fa-building-user",
    
    // Default fallback
    "default": "fa-solid fa-circle-info"
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

  // Extract a valid record ID from various formats - improved version with array handling
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
        
        // IMPORTANT: Handle arrays with multiple items
        if (value.length > 1) {
          console.log('[Staff Homepage] Processing multi-item array with length:', value.length);
          
          // First try to find an object with an ID property
          for (let i = 0; i < value.length; i++) {
            const item = value[i];
            if (typeof item === 'object' && item !== null && item.id && isValidKnackId(item.id)) {
              console.log(`[Staff Homepage] Found valid ID in array[${i}].id:`, item.id);
              return item.id;
            }
          }
          
          // Then try to find a string that is a valid ID
          for (let i = 0; i < value.length; i++) {
            const item = value[i];
            if (typeof item === 'string' && isValidKnackId(item)) {
              console.log(`[Staff Homepage] Found valid ID as string in array[${i}]:`, item);
              return item;
            }
          }
          
          // If we have objects with identifiers, use the first one
          for (let i = 0; i < value.length; i++) {
            const item = value[i];
            if (typeof item === 'object' && item !== null && item.identifier && isValidKnackId(item.identifier)) {
              console.log(`[Staff Homepage] Found valid ID in array[${i}].identifier:`, item.identifier);
              return item.identifier;
            }
          }
          
          // Log that we couldn't find a valid ID in the array
          console.log('[Staff Homepage] No valid IDs found in multi-item array');
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
  
  // Helper function to paginate through all records in a Knack object
  async function getAllRecordsWithPagination(url, filters, maxPages = 10) {
    console.log(`[Staff Homepage] Starting pagination for ${url} with filters: ${filters}`);
    
    let allRecords = [];
    let currentPage = 1;
    let hasMoreRecords = true;
    
    try {
      // Use a higher rows_per_page to minimize API calls (Knack's max is 1000)
      const rowsPerPage = 1000;
      
      while (hasMoreRecords && currentPage <= maxPages) {
        console.log(`[Staff Homepage] Fetching page ${currentPage} of records...`);
        
        // Construct pagination parameters
        const paginationParams = `page=${currentPage}&rows_per_page=${rowsPerPage}`;
        const fullUrl = `${url}${filters ? `?filters=${filters}&${paginationParams}` : `?${paginationParams}`}`;
        
        const response = await retryApiCall(() => {
          return new Promise((resolve, reject) => {
            $.ajax({
              url: fullUrl,
              type: 'GET',
              headers: getKnackHeaders(),
              data: { format: 'raw' },
              success: resolve,
              error: reject
            });
          });
        });
        
        // Check if we got valid results
        if (response && response.records && response.records.length > 0) {
          console.log(`[Staff Homepage] Retrieved ${response.records.length} records from page ${currentPage}`);
          allRecords = [...allRecords, ...response.records];
          
          // If we got fewer records than the page size, we've reached the end
          if (response.records.length < rowsPerPage) {
            hasMoreRecords = false;
            console.log(`[Staff Homepage] Reached end of records with ${response.records.length} < ${rowsPerPage}`);
          } else {
            currentPage++;
          }
        } else {
          // No (more) records found
          hasMoreRecords = false;
          console.log(`[Staff Homepage] No more records found on page ${currentPage}`);
        }
      }
      
      console.log(`[Staff Homepage] Total records retrieved through pagination: ${allRecords.length}`);
      return allRecords;
    } catch (error) {
      console.error(`[Staff Homepage] Pagination error:`, error);
      return [];
    }
  }
  
// --- Cache Management System ---
// Cache manager implementation using Knack Object_115
const CacheManager = {
  // Default TTL in minutes
  DEFAULT_TTL: 60,
  CACHE_OBJECT: 'object_115',
  
  // Create a unique cache key
  createKey(type, identifier) {
    return `${type}_${identifier}`;
  },
  
  // Retrieve cache from Knack
  async get(cacheKey, type) {
    try {
      console.log(`[Staff Homepage] Checking cache for: ${cacheKey} (${type})`);
      
      // Create a filter to find the cache entry
      const filters = encodeURIComponent(JSON.stringify({
        match: 'and',
        rules: [
          { field: 'field_3187', operator: 'is', value: cacheKey },
          { field: 'field_3194', operator: 'is', value: 'Yes' }, // Is Valid
          { field: 'field_3197', operator: 'is', value: type }   // Cache Type
        ]
      }));
      
      // Query the cache object
      const response = await retryApiCall(() => {
        return new Promise((resolve, reject) => {
          $.ajax({
            url: `${KNACK_API_URL}/objects/${this.CACHE_OBJECT}/records?filters=${filters}`,
            type: 'GET',
            headers: getKnackHeaders(),
            data: { format: 'raw' },
            success: resolve,
            error: reject
          });
        });
      });
      
      if (response && response.records && response.records.length > 0) {
        const cacheRecord = response.records[0];
        
        // Check if cache is expired
        const expiryDate = new Date(cacheRecord.field_3195);
        if (expiryDate < new Date()) {
          console.log(`[Staff Homepage] Cache expired for ${cacheKey}`);
          
          // Mark cache as invalid
          await $.ajax({
            url: `${KNACK_API_URL}/objects/${this.CACHE_OBJECT}/records/${cacheRecord.id}`,
            type: 'PUT',
            headers: getKnackHeaders(),
            data: JSON.stringify({
              field_3194: 'No' // Is Valid = No
            })
          });
          
          return null;
        }
        
        // Update access count and last accessed date
        await $.ajax({
          url: `${KNACK_API_URL}/objects/${this.CACHE_OBJECT}/records/${cacheRecord.id}`,
          type: 'PUT',
          headers: getKnackHeaders(),
          data: JSON.stringify({
            field_3193: (parseInt(cacheRecord.field_3193) || 0) + 1, // Access Count + 1
            field_3192: new Date().toISOString() // Last Accessed
          })
        });
        
        console.log(`[Staff Homepage] Cache hit for ${cacheKey}, returning cached data`);
        // Return the cached data
        return JSON.parse(cacheRecord.field_3188); // Data field
      }
      
      console.log(`[Staff Homepage] Cache miss for ${cacheKey}`);
      return null;
    } catch (error) {
      console.error(`[Staff Homepage] Error retrieving cache for ${cacheKey}:`, error);
      return null;
    }
  },
  
  // Store data in cache
  async set(cacheKey, data, type, ttlMinutes = this.DEFAULT_TTL) {
    try {
      const user = Knack.getUserAttributes();
      console.log(`[Staff Homepage] Storing data in cache: ${cacheKey} (${type})`);
      
      // Calculate expiry date
      const expiryDate = new Date();
      expiryDate.setMinutes(expiryDate.getMinutes() + ttlMinutes);
      
      // Check if cache already exists
      const filters = encodeURIComponent(JSON.stringify({
        match: 'and',
        rules: [
          { field: 'field_3187', operator: 'is', value: cacheKey },
          { field: 'field_3197', operator: 'is', value: type }
        ]
      }));
      
      const response = await retryApiCall(() => {
        return new Promise((resolve, reject) => {
          $.ajax({
            url: `${KNACK_API_URL}/objects/${this.CACHE_OBJECT}/records?filters=${filters}`,
            type: 'GET',
            headers: getKnackHeaders(),
            data: { format: 'raw' },
            success: resolve,
            error: reject
          });
        });
      });
      
      // Get user's school information
      let schoolName = '';
      if (user && user.id) {
        try {
          // This assumes the staff record connected to user has a school name
          const staffRecord = await findStaffRecord(user.email);
          if (staffRecord && staffRecord[FIELD_MAPPING.schoolConnection]) {
            const schoolId = extractValidRecordId(staffRecord[FIELD_MAPPING.schoolConnection]);
            if (schoolId) {
              const schoolRecord = await getSchoolRecord(schoolId);
              if (schoolRecord) {
                schoolName = sanitizeField(schoolRecord.field_2 || '');
              }
            }
          }
        } catch (e) {
          console.warn('[Staff Homepage] Error getting school name:', e);
        }
      }
      
      // If cache exists, update it
      if (response && response.records && response.records.length > 0) {
        const cacheRecord = response.records[0];
        console.log(`[Staff Homepage] Updating existing cache for ${cacheKey}`);
        
        await retryApiCall(() => {
          return new Promise((resolve, reject) => {
            $.ajax({
              url: `${KNACK_API_URL}/objects/${this.CACHE_OBJECT}/records/${cacheRecord.id}`,
              type: 'PUT',
              headers: getKnackHeaders(),
              data: JSON.stringify({
                field_3188: JSON.stringify(data), // Data
                field_3192: new Date().toISOString(), // Last Accessed
                field_3193: (parseInt(cacheRecord.field_3193) || 0) + 1, // Access Count + 1
                field_3194: 'Yes', // Is Valid
                field_3195: expiryDate.toISOString() // Expiry Date
              }),
              success: resolve,
              error: reject
            });
          });
        });
      } 
      // Otherwise create a new cache entry
      else {
        console.log(`[Staff Homepage] Creating new cache entry for ${cacheKey}`);
        
        await retryApiCall(() => {
          return new Promise((resolve, reject) => {
            $.ajax({
              url: `${KNACK_API_URL}/objects/${this.CACHE_OBJECT}/records`,
              type: 'POST',
              headers: getKnackHeaders(),
              data: JSON.stringify({
                field_3187: cacheKey, // Cache Key
                field_3188: JSON.stringify(data), // Data
                field_3189: user?.email || 'unknown', // User Email - CORRECTED FIELD ID
                field_3190: schoolName, // User Organisation (School)
                field_3191: new Date().toISOString(), // First Login (Created Date)
                field_3192: new Date().toISOString(), // Last Accessed
                field_3193: 1, // Access Count
                field_3194: 'Yes', // Is Valid
                field_3195: expiryDate.toISOString(), // Expiry Date
                field_3196: '', // User IP (could be captured if needed)
                field_3197: type // Cache Type
              }),
              success: resolve,
              error: reject
            });
          });
        });
      }
      
      return true;
    } catch (error) {
      console.error(`[Staff Homepage] Error setting cache for ${cacheKey}:`, error);
      return false;
    }
  },
  
  // Invalidate a specific cache entry
  async invalidate(cacheKey, type) {
    try {
      console.log(`[Staff Homepage] Invalidating cache: ${cacheKey} (${type})`);
      
      const filters = encodeURIComponent(JSON.stringify({
        match: 'and',
        rules: [
          { field: 'field_3187', operator: 'is', value: cacheKey },
          { field: 'field_3197', operator: 'is', value: type }
        ]
      }));
      
      const response = await retryApiCall(() => {
        return new Promise((resolve, reject) => {
          $.ajax({
            url: `${KNACK_API_URL}/objects/${this.CACHE_OBJECT}/records?filters=${filters}`,
            type: 'GET',
            headers: getKnackHeaders(),
            data: { format: 'raw' },
            success: resolve,
            error: reject
          });
        });
      });
      
      if (response && response.records && response.records.length > 0) {
        const cacheRecord = response.records[0];
        
        await retryApiCall(() => {
          return new Promise((resolve, reject) => {
            $.ajax({
              url: `${KNACK_API_URL}/objects/${this.CACHE_OBJECT}/records/${cacheRecord.id}`,
              type: 'PUT',
              headers: getKnackHeaders(),
              data: JSON.stringify({
                field_3194: 'No' // Is Valid = No
              }),
              success: resolve,
              error: reject
            });
          });
        });
        
        console.log(`[Staff Homepage] Successfully invalidated cache: ${cacheKey}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`[Staff Homepage] Error invalidating cache for ${cacheKey}:`, error);
      return false;
    }
  }
};

// --- User Activity Tracking Functions ---
// Track user login activity
async function trackUserLogin() {
  try {
    const user = Knack.getUserAttributes();
    if (!user || !user.id) return;
    
    console.log(`[Staff Homepage] Tracking login for user: ${user.email}`);
    
    // Browser detection
    const browser = navigator.userAgent;
    
    // Device type detection (simplified)
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isTablet = /iPad|Android(?!.*Mobile)/i.test(navigator.userAgent);
    const deviceType = isMobile ? (isTablet ? 'Tablet' : 'Mobile') : 'Desktop';
    
    // Find the user's record in Object_3
    const filters = encodeURIComponent(JSON.stringify({
      match: 'or',
      rules: [
        { field: 'field_91', operator: 'is', value: user.email },
        { field: 'field_70', operator: 'is', value: user.email }
      ]
    }));
    
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
      const userRecord = response.records[0];
      
      // Update user record with login information
      await retryApiCall(() => {
        return new Promise((resolve, reject) => {
          $.ajax({
            url: `${KNACK_API_URL}/objects/object_3/records/${userRecord.id}`,
            type: 'PUT',
            headers: getKnackHeaders(),
            data: JSON.stringify({
              field_3198: new Date().toISOString(), // Login Date
              field_3201: 0, // Page Views (reset on login) - CORRECTED FIELD
              field_3203: deviceType, // Device Type
              field_3204: browser.substring(0, 100) // Browser (truncated if too long)
            }),
            success: resolve,
            error: reject
          });
        });
      });
      
      console.log(`[Staff Homepage] Successfully tracked login for user ${user.email}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('[Staff Homepage] Error tracking user login:', error);
    return false;
  }
}

// Track page views and feature usage
async function trackPageView(featureUsed = null) {
  try {
    const user = Knack.getUserAttributes();
    if (!user || !user.id) return;
    
    console.log(`[Staff Homepage] Tracking page view for user: ${user.email}`);
    
    // Find the user's record in Object_3
    const filters = encodeURIComponent(JSON.stringify({
      match: 'or',
      rules: [
        { field: 'field_91', operator: 'is', value: user.email },
        { field: 'field_70', operator: 'is', value: user.email }
      ]
    }));
    
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
      const userRecord = response.records[0];
      
      // Update fields for tracking
      const updateData = {
        // Increment page views using correct field
        field_3201: (parseInt(userRecord.field_3201) || 0) + 1
      };
      
      // Add feature used if provided
      if (featureUsed) {
        // Get current features (as array)
        let currentFeatures = userRecord.field_3202 || [];
        if (!Array.isArray(currentFeatures)) {
          currentFeatures = [currentFeatures];
        }
        
        // Add new feature if not already there
        if (!currentFeatures.includes(featureUsed)) {
          currentFeatures.push(featureUsed);
          updateData.field_3202 = currentFeatures;
        }
      }
      
      // Update user record
      await retryApiCall(() => {
        return new Promise((resolve, reject) => {
          $.ajax({
            url: `${KNACK_API_URL}/objects/object_3/records/${userRecord.id}`,
            type: 'PUT',
            headers: getKnackHeaders(),
            data: JSON.stringify(updateData),
            success: resolve,
            error: reject
          });
        });
      });
      
      console.log(`[Staff Homepage] Successfully tracked page view for ${user.email}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('[Staff Homepage] Error tracking page view:', error);
    return false;
  }
}


// Helper function to check if user has a Staff Admin role
function isStaffAdmin(roles) {
    if (!roles || !Array.isArray(roles)) {
      return false;
    }
    
    const result = roles.some(role => {
      if (typeof role !== 'string') return false;
      
      const normalizedRole = role.toLowerCase().replace(/\s+/g, '');
      return normalizedRole.includes('staffadmin') || normalizedRole === 'admin';
    });
    
    console.log(`[Staff Homepage] isStaffAdmin check with roles ${JSON.stringify(roles)} returned: ${result}`);
    return result;
  }

  // Helper function to check if user has a teaching role (tutor, HoY, subject teacher)
  function hasTeachingRole(roles) {
    if (!roles || !Array.isArray(roles)) {
      return false;
    }
    
    // Check for teaching roles
    return roles.some(role => {
      if (typeof role !== 'string') return false;
      
      const normalizedRole = role.toLowerCase().replace(/\s+/g, '');
      
      return normalizedRole.includes('tutor') || 
             normalizedRole.includes('headofyear') ||
             normalizedRole.includes('subjectteacher');
    });
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
      
      // First check if roles are in profile_keys_raw which is most reliable
      if (staffRecord.profile_keys_raw && Array.isArray(staffRecord.profile_keys_raw)) {
        console.log('[Staff Homepage] Profile keys raw detailed structure:', 
          JSON.stringify(staffRecord.profile_keys_raw, null, 2));
          
        // Also log the first item to see all its properties
        if (staffRecord.profile_keys_raw && staffRecord.profile_keys_raw.length > 0) {
          console.log('First profile key raw object properties:', 
            Object.keys(staffRecord.profile_keys_raw[0]));
        }
        
        // Map profile keys to readable role names
        const profileKeyMap = {
          'profile_5': 'Staff Admin',
          'profile_6': 'Student',
          'profile_7': 'Tutor',
          'profile_8': 'Subject Teacher',
          'profile_9': 'Head of Year',
          'profile_10': 'School Admin'
        };
        
        // FIX: Extract identifier property from each profile_keys_raw object
        roles = staffRecord.profile_keys_raw.map(key => {
          // Extract identifier from the object 
          const roleId = key.id || '';
          const roleIdentifier = key.identifier || '';
          
          // Use profileKeyMap for ID mapping, or use the identifier directly, or use the ID as fallback
          return profileKeyMap[roleId] || sanitizeField(roleIdentifier) || sanitizeField(roleId);
        });
        
        console.log('[Staff Homepage] Mapped roles from profile_keys_raw:', roles);
      } 
      // Fallback to staffRole field if no profile_keys_raw
      else if (staffRecord[FIELD_MAPPING.staffRole]) {
        console.log('[Staff Homepage] Using staffRole field:', staffRecord[FIELD_MAPPING.staffRole]);
        
        // Define role mapping
        const roleMap = {
          'profile5': 'Staff Admin',
          'profile6': 'Student',
          'profile7': 'Tutor',
          'profile8': 'Subject Teacher',
          'profile9': 'Head of Year',
          'profile10': 'School Admin'
        };
        
        // Check if roles field is an array or string
        if (Array.isArray(staffRecord[FIELD_MAPPING.staffRole])) {
          // Process each role to convert "profile#" to actual role names
          roles = staffRecord[FIELD_MAPPING.staffRole].map(role => {
            // If role is like "profile5", convert to actual role name
            if (typeof role === 'string' && role.startsWith('profile')) {
              return sanitizeField(roleMap[role] || role);
            }
            return sanitizeField(role);
          });
        } else {
          // Handle single role value
          const role = staffRecord[FIELD_MAPPING.staffRole];
          if (typeof role === 'string' && role.startsWith('profile')) {
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
      // First try by direct ID
      let response = await retryApiCall(() => {
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
      }).catch(error => {
        console.warn('[Staff Homepage] Error getting school record by ID:', error);
        return null;
      });
      
      if (response) {
        debugLog("Found school record by ID:", response);
        
        // Check if logo exists and is valid
        if (response.field_61 && typeof response.field_61 === 'string' && response.field_61.trim() !== '') {
          console.log("[Staff Homepage] Found valid school logo URL in field_61:", response.field_61);
        } else {
          console.warn("[Staff Homepage] No logo found in school record, will search by name");
          
          // Try to get school name from record
          const schoolName = response.field_44 || response.field_2;
          
          if (schoolName) {
            // Search for school by name to find a record with logo
            const filters = encodeURIComponent(JSON.stringify({
              match: 'or',
              rules: [
                { field: 'field_44', operator: 'is', value: schoolName },
                { field: 'field_2', operator: 'is', value: schoolName }
              ]
            }));
            
            const searchResponse = await retryApiCall(() => {
              return new Promise((resolve, reject) => {
                $.ajax({
                  url: `${KNACK_API_URL}/objects/object_2/records?filters=${filters}`,
                  type: 'GET',
                  headers: getKnackHeaders(),
                  data: { format: 'raw' },
                  success: resolve,
                  error: reject
                });
              });
            }).catch(error => {
              console.warn('[Staff Homepage] Error searching for school by name:', error);
              return null;
            });
            
            if (searchResponse && searchResponse.records && searchResponse.records.length > 0) {
              // Look for any record with a logo
              for (const record of searchResponse.records) {
                if (record.field_61 && typeof record.field_61 === 'string' && record.field_61.trim() !== '') {
                  console.log("[Staff Homepage] Found alternative record with logo:", record.id);
                  // Merge the logo into our existing record
                  response.field_61 = record.field_61;
                  break;
                }
              }
            }
          }
        }
        
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
    // Create a cache key for this school's VESPA results
    const cacheKey = `school_vespa_${schoolId}`;
    
    // Try to get from cache first
    const cachedResults = await CacheManager.get(cacheKey, 'SchoolResults');
    if (cachedResults) {
      console.log(`[Staff Homepage] Using cached VESPA results for school ${schoolId}`);
      return cachedResults;
    }
    
    console.log(`[Staff Homepage] Cache miss for school ${schoolId}, fetching fresh data`);
    
    // Get the school name for filtering
    const schoolName = await getSchoolName(schoolId);
    const sanitizedSchoolName = sanitizeField(schoolName);
    console.log(`[Staff Homepage] Getting VESPA results for school: "${sanitizedSchoolName}" with ID: ${schoolId}`);
    
    // Show loading indicator for pagination
    console.log("[Staff Homepage] Fetching ALL school VESPA results using pagination (this may take a moment)...");
    
    // First approach: Use the schoolId directly in a contains filter
    const schoolIdFilter = JSON.stringify({
      match: 'and',
      rules: [
        { field: FIELD_MAPPING.resultsSchool, operator: 'contains', value: schoolId }
      ]
    });
    
    console.log(`[Staff Homepage] Trying VESPA results filter with schoolId:`, schoolIdFilter);
    
    // Use pagination to get ALL records - not just the default 25 or limited 500
    let allRecords = await getAllRecordsWithPagination(
      `${KNACK_API_URL}/objects/object_10/records`, 
      encodeURIComponent(schoolIdFilter),
      20 // Allow up to 20 pages = 20,000 student records with 1000 per page
    ).catch(error => {
      console.warn('[Staff Homepage] Error with schoolId pagination:', error);
      return [];
    });
    
    // If we got results with the ID approach, use them
    if (allRecords && allRecords.length > 0) {
      console.log(`[Staff Homepage] VESPA results API schoolId filter pagination success: Found ${allRecords.length} total records`);
    }
    // If not, try the name approach
    else {
      console.log('[Staff Homepage] SchoolId filter returned no results, trying with name filter');
      
      // Alternative approach: Try using the school name with different operators
      const nameFilters = JSON.stringify({
        match: 'or',
        rules: [
          { field: FIELD_MAPPING.resultsSchool, operator: 'contains', value: sanitizedSchoolName },
          { field: FIELD_MAPPING.resultsSchool, operator: 'is', value: sanitizedSchoolName },
          { field: FIELD_MAPPING.resultsSchool, operator: 'contains', value: schoolName },
          { field: FIELD_MAPPING.resultsSchool, operator: 'is', value: schoolName },
          // Special case for VESPA ACADEMY / VESPA Academy
          { field: FIELD_MAPPING.resultsSchool, operator: 'contains', value: "VESPA ACADEMY" },
          { field: FIELD_MAPPING.resultsSchool, operator: 'contains', value: "VESPA Academy" }
        ]
      });
      
      console.log(`[Staff Homepage] Trying VESPA results filter with name approaches:`, nameFilters);
      
      // Use pagination with name filters
      allRecords = await getAllRecordsWithPagination(
        `${KNACK_API_URL}/objects/object_10/records`, 
        encodeURIComponent(nameFilters),
        20 // Allow up to 20 pages = 20,000 student records with 1000 per page
      ).catch(error => {
        console.error('[Staff Homepage] Error with name filter pagination:', error);
        return [];
      });
      
      console.log(`[Staff Homepage] VESPA results API name filter pagination response: Found ${allRecords.length} total records`);
    }
    
    // Process results if we found any with any approach
    if (allRecords && allRecords.length > 0) {
      debugLog(`Found ${allRecords.length} VESPA results for school:`, schoolId);
      
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
      
      for (const record of allRecords) {
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
        count: totals.totalCount,
        // Add data source info for the chart display
        label: "All Students"
      };
        
      debugLog("Calculated school VESPA averages:", averages);
      
      // Store in cache for future use
      await CacheManager.set(cacheKey, averages, 'SchoolResults', 120); // 2 hour TTL
      
      return averages;
    }
    
    return null;
  } catch (error) {
    console.error('[Staff Homepage] Error getting school VESPA results:', error);
    return null;
  }
}
  // Get VESPA results for staff's connected students
// Get VESPA results for staff's connected students
// Get VESPA results for staff's connected students
async function getStaffVESPAResults(staffEmail, schoolId, userRoles) {
    if (!staffEmail || !schoolId) {
      console.error("[Staff Homepage] Cannot get staff VESPA results: Missing email or schoolId");
      return null;
    }
    
    
    try {
      // Get school name for filtering
      const schoolName = sanitizeField(await getSchoolName(schoolId));
      console.log(`[Staff Homepage] Looking for staff (${staffEmail}) students in school: "${schoolName}"`);
      
      // Add extra debugging to help diagnose tutor connections
      console.log(`[Staff Homepage] DEBUG - Looking for records where connection fields contain email ${staffEmail}`);
      console.log(`[Staff Homepage] DEBUG - Staff roles: ${JSON.stringify(userRoles)}`);
      
      // Determine which roles the user has - check all roles without breaking
      let useTutorRole = false;
      let useHeadOfYearRole = false;
      let useSubjectTeacherRole = false;
      let useStaffAdminRole = false;
      
      for (const role of userRoles) {
        const normalizedRole = role.toLowerCase();
        if (normalizedRole.includes('tutor')) {
          useTutorRole = true;
        }
        if (normalizedRole.includes('head of year') || normalizedRole.includes('headofyear')) {
          useHeadOfYearRole = true;
        }
        if (normalizedRole.includes('subject teacher') || normalizedRole.includes('subjectteacher')) {
          useSubjectTeacherRole = true;
        }
        if (normalizedRole.includes('staff admin') || normalizedRole.includes('staffadmin')) {
          useStaffAdminRole = true;
        }
      }
      
      console.log(`[Staff Homepage] Detected roles - Tutor: ${useTutorRole}, HoY: ${useHeadOfYearRole}, SubjectTeacher: ${useSubjectTeacherRole}, StaffAdmin: ${useStaffAdminRole}`);
      
      // Get all school records
      const schoolFilter = JSON.stringify({
        match: 'and',
        rules: [
          { field: FIELD_MAPPING.resultsSchool, operator: 'contains', value: schoolId }
        ]
      });
      
      console.log("[Staff Homepage] Fetching ALL school records to filter locally");
      
      const allSchoolRecords = await getAllRecordsWithPagination(
        `${KNACK_API_URL}/objects/object_10/records`, 
        encodeURIComponent(schoolFilter),
        10 // Reasonable limit for pagination
      ).catch(error => {
        console.error('[Staff Homepage] Error getting school records:', error);
        return [];
      });
      
      console.log(`[Staff Homepage] Retrieved ${allSchoolRecords.length} total school records`);
      
      // Enhanced debugging of field structure
      if (allSchoolRecords.length > 0) {
        const sample = allSchoolRecords[0];
        console.log("[Staff Homepage] SAMPLE RECORD FIELDS:");
        if (sample[FIELD_MAPPING.tutor]) console.log(`Tutor field (${FIELD_MAPPING.tutor}):`, JSON.stringify(sample[FIELD_MAPPING.tutor]));
        if (sample[FIELD_MAPPING.headOfYear]) console.log(`HoY field (${FIELD_MAPPING.headOfYear}):`, JSON.stringify(sample[FIELD_MAPPING.headOfYear]));
        if (sample[FIELD_MAPPING.subjectTeacher]) console.log(`Subject field (${FIELD_MAPPING.subjectTeacher}):`, JSON.stringify(sample[FIELD_MAPPING.subjectTeacher]));
        if (sample[FIELD_MAPPING.staffAdmin]) console.log(`Admin field (${FIELD_MAPPING.staffAdmin}):`, JSON.stringify(sample[FIELD_MAPPING.staffAdmin]));
        
        // Search for the email in any record to confirm it exists
        let foundAnyMatch = false;
        for (let i = 0; i < Math.min(10, allSchoolRecords.length); i++) {
          const record = allSchoolRecords[i];
          const recordText = JSON.stringify(record);
          if (recordText.includes(staffEmail)) {
            console.log(`[Staff Homepage] Found email in record ${i}:`, record.id);
            foundAnyMatch = true;
            break;
          }
        }
        
        if (!foundAnyMatch) {
          console.log(`[Staff Homepage] WARNING: Could not find email in first 10 records - might not exist in data!`);
        }
      }
      
      // Improved function to check for email in connection fields
      const fieldContainsEmail = (field, email) => {
        // Handle null/undefined fields
        if (!field) return false;
        
        // If it's an array (which appears to be the case for these fields)
        if (Array.isArray(field)) {
          // For empty arrays, return false
          if (field.length === 0) return false;
          
          // Check each element in the array
          for (const item of field) {
            // If the item is directly a string matching our email
            if (typeof item === 'string' && item.trim() === email) {
              console.log(`[Staff Homepage] Found direct match in array item:`, item);
              return true;
            }
            
            // If the item is an object (with potential 'email' property)
            if (item && typeof item === 'object') {
              // Check if the item has an 'email' property matching our email
              if (item.email === email) {
                console.log(`[Staff Homepage] Found match in array object's email property:`, item);
                return true;
              }
              
              // Check all string properties for matches
              for (const key in item) {
                if (typeof item[key] === 'string' && item[key].trim() === email) {
                  console.log(`[Staff Homepage] Found match in array object's ${key} property:`, item[key]);
                  return true;
                }
              }
              
              // Try JSON stringifying as a last resort
              const itemStr = JSON.stringify(item);
              if (itemStr.includes(email)) {
                console.log(`[Staff Homepage] Found email in stringified object:`, item);
                return true;
              }
            }
          }
          return false;
        }
        
        // If it's a string, check if it contains or equals the email
        if (typeof field === 'string') {
          // Check for exact match
          if (field.trim() === email) return true;
          
          // Split by common delimiters
          const parts = field.split(/[\s,;|"\n]+/);
          return parts.some(part => part.trim() === email);
        }
        
        // If it's an object, stringify and check
        if (field && typeof field === 'object') {
          return JSON.stringify(field).includes(email);
        }
        
        return false;
      };
      
      // Enhanced debugging - look for specific student records
      console.log("[Staff Homepage] Running detailed email search on student records...");
      
      // Store all record IDs with matches for debugging
      let tutorMatches = [];
      let hoyMatches = [];
      let subjectMatches = [];
      let adminMatches = [];
      
      // Check each record with detailed logging
      for (let i = 0; i < Math.min(20, allSchoolRecords.length); i++) {
        const record = allSchoolRecords[i];
        
        // Check tutor field
        if (fieldContainsEmail(record[FIELD_MAPPING.tutor], staffEmail)) {
          tutorMatches.push(record.id);
        }
        
        // Check head of year field
        if (fieldContainsEmail(record[FIELD_MAPPING.headOfYear], staffEmail)) {
          hoyMatches.push(record.id);
        }
        
        // Check subject teacher field
        if (fieldContainsEmail(record[FIELD_MAPPING.subjectTeacher], staffEmail)) {
          subjectMatches.push(record.id);
        }
        
        // Check staff admin field
        if (fieldContainsEmail(record[FIELD_MAPPING.staffAdmin], staffEmail)) {
          adminMatches.push(record.id);
        }
      }
      
      console.log(`[Staff Homepage] Found matches in first 20 records:
        - Tutor: ${tutorMatches.length} matches
        - HoY: ${hoyMatches.length} matches
        - Subject: ${subjectMatches.length} matches
        - Admin: ${adminMatches.length} matches`);
      
      // Filter records by role with comprehensive matching
      let filteredRecords = [];
      let roleUsed = "none";
      
      // Check for each role type in priority order
      const searchAllRecords = (field, label) => {
        console.log(`[Staff Homepage] Searching all ${allSchoolRecords.length} records for ${label} connections...`);
        return allSchoolRecords.filter(record => {
          // Try deep searching through fields
          const fieldValue = record[field];
          
          // Last resort - use JSON.stringify to search for the email anywhere in the record
          if (fieldValue) {
            const fieldStr = JSON.stringify(fieldValue);
            return fieldStr.includes(staffEmail);
          }
          return false;
        });
      };
      
      // Tutor connections (highest priority)
      if (useTutorRole) {
        const tutorResults = searchAllRecords(FIELD_MAPPING.tutor, "tutor");
        if (tutorResults.length > 0) {
          filteredRecords = tutorResults;
          roleUsed = "Tutor";
          console.log(`[Staff Homepage] Found ${filteredRecords.length} students connected as Tutor`);
        }
      }
      
      // Head of Year connections (second priority)
      if (filteredRecords.length === 0 && useHeadOfYearRole) {
        const hoyResults = searchAllRecords(FIELD_MAPPING.headOfYear, "Head of Year");
        if (hoyResults.length > 0) {
          filteredRecords = hoyResults;
          roleUsed = "Head of Year";
          console.log(`[Staff Homepage] Found ${filteredRecords.length} students connected as Head of Year`);
        }
      }
      
      // Subject Teacher connections (third priority)
      if (filteredRecords.length === 0 && useSubjectTeacherRole) {
        const subjectResults = searchAllRecords(FIELD_MAPPING.subjectTeacher, "Subject Teacher");
        if (subjectResults.length > 0) {
          filteredRecords = subjectResults;
          roleUsed = "Subject Teacher";
          console.log(`[Staff Homepage] Found ${filteredRecords.length} students connected as Subject Teacher`);
        }
      }
      
      // If no connected students found, return null
      if (filteredRecords.length === 0) {
        console.log("[Staff Homepage] No connected students found for this staff member");
        return null;
      }
      
      console.log(`[Staff Homepage] Using ${roleUsed} role for staff results with ${filteredRecords.length} students`);
      
      // Rest of the function (calculating averages) remains unchanged
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
      
      for (const record of filteredRecords) {
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
        count: totals.totalCount,
        roleUsed: roleUsed
      };
      
      // Set role-specific label based on role hierarchy
      if (roleUsed === "Tutor") {
        averages.label = "My Tutor Group";
      } else if (roleUsed === "Head of Year") {
        averages.label = "My Year Group";
      } else if (roleUsed === "Subject Teacher") {
        averages.label = "My Students";
      } else {
        averages.label = `My ${roleUsed} Students`;
      }
      
      debugLog("Calculated staff connected students VESPA averages:", averages);
      return averages;
    } catch (error) {
      console.error('[Staff Homepage] Error getting staff VESPA results:', error);
      return null;
    }
  }

  // --- UI Rendering ---

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
  
  // Generic function to render an app section with Font Awesome icons
function renderAppSection(title, apps) {
    if (!apps || !apps.length) return '';
    
    let appsHTML = '';
    apps.forEach(app => {
      // Get Font Awesome icon or use default
      const iconClass = ICON_MAPPING[app.name] || ICON_MAPPING.default;
      
      appsHTML += `
      <a href="${app.url}" class="app-card" title="${sanitizeField(app.name)}" 
         onclick="window.trackFeatureUse('${sanitizeField(app.name)}')">
        <div class="app-card-header">
          <div class="app-info-icon" title="Click for details" data-description="${sanitizeField(app.description)}">i</div>
          <div class="app-icon-container">
            <i class="${iconClass} app-icon-fa"></i>
          </div>
          <div class="app-name">${sanitizeField(app.name)}</div>
        </div>
      </a>
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

  // Add this global function for tracking feature usage
window.trackFeatureUse = function(featureName) {
  trackPageView(featureName).catch(err => 
    console.warn(`[Staff Homepage] Feature tracking failed for ${featureName}:`, err)
  );
};
  
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
    
    // Get the appropriate title based on whether we have staff results
    let chartTitle = "School VESPA Results";
    let countDisplay = `${schoolResults.count} students`;
    
    if (staffResults) {
      // If we have both school and staff results, show a comparison title
      chartTitle = "VESPA Results Comparison";
      countDisplay = `School: ${schoolResults.count} students | ${staffResults.roleUsed}: ${staffResults.count} students`;
    }
    
    return `
      <section class="vespa-section dashboard-section">
        <h2 class="vespa-section-title">VESPA Dashboard</h2>
        <div class="charts-container">
          <div class="chart-wrapper">
            <h3 class="chart-title">${chartTitle}</h3>
            <div class="result-count">${countDisplay}</div>
            <canvas id="vespaChart"></canvas>
          </div>
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
    
    // Calculate percentage differences between staff and school results
    if (staffResults && schoolResults) {
      // Function to calculate percentage difference
      const calcPercentDiff = (staffVal, schoolVal) => {
        if (!schoolVal || schoolVal == 0) return 0;
        const staff = parseFloat(staffVal);
        const school = parseFloat(schoolVal);
        return ((staff - school) / school * 100).toFixed(1);
      };
      
      // Calculate differences for each VESPA category
      staffResults.differences = {
        vision: calcPercentDiff(staffResults.vision, schoolResults.vision),
        effort: calcPercentDiff(staffResults.effort, schoolResults.effort),
        systems: calcPercentDiff(staffResults.systems, schoolResults.systems),
        practice: calcPercentDiff(staffResults.practice, schoolResults.practice),
        attitude: calcPercentDiff(staffResults.attitude, schoolResults.attitude)
      };
      
      console.log("[Staff Homepage] Calculated trend differences:", staffResults.differences);
    }
    
    // Get the chart container
    const chartCtx = document.getElementById('vespaChart');
    if (!chartCtx) {
      console.error("[Staff Homepage] Chart canvas element not found");
      return;
    }
    
    // Prepare datasets for the chart
    const datasets = [];
    
    // School results dataset (always included)
    datasets.push({
      label: schoolResults.label || 'All Students',
      data: [
        schoolResults.vision,
        schoolResults.effort,
        schoolResults.systems,
        schoolResults.practice,
        schoolResults.attitude
      ],
      // Use lighter shades for school results
      backgroundColor: [
        VESPA_COLORS.VISION + '99', // Add transparency
        VESPA_COLORS.EFFORT + '99',
        VESPA_COLORS.SYSTEMS + '99',
        VESPA_COLORS.PRACTICE + '99',
        VESPA_COLORS.ATTITUDE + '99'
      ],
      borderColor: [
        VESPA_COLORS.VISION,
        VESPA_COLORS.EFFORT,
        VESPA_COLORS.SYSTEMS,
        VESPA_COLORS.PRACTICE,
        VESPA_COLORS.ATTITUDE
      ],
      borderWidth: 1
    });
    
    // Staff results dataset (if available)
    if (staffResults) {
      datasets.push({
        label: staffResults.label || `Your Students`,
        data: [
          staffResults.vision,
          staffResults.effort,
          staffResults.systems,
          staffResults.practice,
          staffResults.attitude
        ],
        // Use darker/more saturated colors for staff results
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
      });
    }
    
    // Create the grouped bar chart
    new Chart(chartCtx, {
      type: 'bar',
      data: {
        labels: ['Vision', 'Effort', 'Systems', 'Practice', 'Attitude'],
        datasets: datasets
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
            display: true, // Show legend to differentiate the datasets
            position: 'top',
            labels: {
              color: 'rgba(255, 255, 255, 0.9)',
              font: {
                size: 12
              },
              padding: 15
            }
          },
          tooltip: {
            backgroundColor: 'rgba(10, 27, 80, 0.9)',
            titleColor: '#ffffff',
            bodyColor: '#ffffff',
            padding: 12,
            borderColor: THEME.ACCENT,
            borderWidth: 1,
            displayColors: false,
            callbacks: {
              title: function(tooltipItems) {
                return tooltipItems[0].label; // e.g., "Vision"
              },
              label: function(context) {
                const label = context.dataset.label || '';
                const value = context.parsed.y;
                return `${label}: ${value}`;
              },
              afterLabel: function(context) {
                // Only show difference for staff results dataset (second dataset)
                if (staffResults && context.datasetIndex === 1 && staffResults.differences) {
                  const categoryIndex = context.dataIndex; // 0=vision, 1=effort, etc.
                  const categories = ['vision', 'effort', 'systems', 'practice', 'attitude'];
                  const category = categories[categoryIndex];
                  const diff = staffResults.differences[category];
                  
                  // Format with + sign for positive, and appropriate color/symbol
                  const sign = diff > 0 ? '+' : '';
                  const symbol = diff > 0 ? '▲' : diff < 0 ? '▼' : '■';
                  return [`${sign}${diff}% vs. school ${symbol}`];
                }
                return null;
              },
              footer: function(tooltipItems) {
                const datasetIndex = tooltipItems[0].datasetIndex;
                const count = datasetIndex === 0 ? schoolResults.count : staffResults?.count;
                return `Based on ${count} students`;
              }
            }
          }
        },
        responsive: true,
        maintainAspectRatio: false
      }
    });
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
  
  // Get CSS styles for the homepage with improved UI
function getStyleCSS() {
  return `
    /* Main Container - Staff Theme */
    #staff-homepage {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      color: #ffffff;
      background: ${THEME.PRIMARY};
      line-height: 1.4;
      overflow-x: hidden;
      border: 3px solid ${THEME.ACCENT};
      border-radius: 12px;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
    }
    
    /* Top row layout containing profile and dashboard */
    .top-row {
      display: flex;
      flex-direction: row;
      gap: 24px;
      margin-bottom: 28px;
    }
    
    /* Profile container takes 25% width */
    .profile-container {
      flex: 1;
      max-width: 25%;
    }
    
    /* Dashboard container takes 75% width */
    .dashboard-container {
      flex: 3;
    }
    
    /* Animation Keyframes */
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes pulseGlow {
      0% { box-shadow: 0 4px 12px rgba(0, 229, 219, 0.1); }
      50% { box-shadow: 0 4px 18px rgba(0, 229, 219, 0.3); }
      100% { box-shadow: 0 4px 12px rgba(0, 229, 219, 0.1); }
    }
    
    /* Sections */
    .vespa-section {
      background: ${THEME.SECTION_BG};
      border-radius: 10px;
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
      padding: 22px;
      margin-bottom: 26px;
      animation: fadeIn 0.5s ease-out forwards;
      transition: transform 0.2s, box-shadow 0.2s;
      border: 2px solid ${THEME.ACCENT};
      backdrop-filter: blur(5px);
      position: relative;
      overflow: hidden;
    }
    
    /* Section background pattern overlay */
    .vespa-section::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-image: radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px);
      background-size: 20px 20px;
      pointer-events: none;
      z-index: 1;
    }
    
    /* Section content above pattern */
    .vespa-section > * {
      position: relative;
      z-index: 2;
    }
    
    .vespa-section:hover {
      box-shadow: 0 8px 22px rgba(0, 229, 219, 0.4);
      transform: translateY(-2px);
    }
    
    .vespa-section:nth-child(1) { animation-delay: 0.1s; }
    .vespa-section:nth-child(2) { animation-delay: 0.2s; }
    .vespa-section:nth-child(3) { animation-delay: 0.3s; }
    
    .vespa-section-title {
      color: #ffffff !important;  /* Force white color */
      font-size: 22px;
      font-weight: 600;
      margin-bottom: 18px;
      padding-bottom: 10px;
      border-bottom: 2px solid ${THEME.ACCENT};
      text-transform: uppercase;
      letter-spacing: 1px;
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    }
    
    /* Profile Section */
    .profile-section {
      min-height: 350px; /* Match height with chart section */
    }
    
    .profile-info {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      height: 100%;
    }
    
    .profile-details {
      flex: 1;
      min-width: 250px;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      padding: 20px;
      background: ${THEME.CARD_BG};
      border-radius: 10px;
      border: 1px solid ${THEME.ACCENT};
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }
    
    .school-logo {
      max-width: 100px;
      height: auto;
      margin-bottom: 15px;
      align-self: center;
      border-radius: 5px;
      padding: 5px;
      background: rgba(255, 255, 255, 0.1);
    }
    
    .profile-name {
      font-size: 26px;
      color: #ffffff;
      margin-bottom: 18px;
      font-weight: 700;
      text-align: center;
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    }
    
    .profile-item {
      margin-bottom: 12px;
      padding: 10px;
      border-radius: 6px;
      transition: background-color 0.2s;
    }
    
    .profile-item:hover {
      background-color: rgba(255, 255, 255, 0.1);
    }
    
    .profile-label {
      font-weight: 600;
      color: ${THEME.ACCENT};
      margin-right: 8px;
    }
    
    .dashboard-button {
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: ${THEME.ACCENT};
      color: ${THEME.PRIMARY};
      padding: 10px 16px;
      border-radius: 6px;
      text-decoration: none;
      transition: all 0.3s;
      margin-top: 15px;
      font-weight: bold;
      letter-spacing: 0.5px;
    }
    
    .dashboard-button:hover {
      background-color: rgba(0, 229, 219, 0.8);
      transform: translateY(-3px);
      box-shadow: 0 4px 12px rgba(0, 229, 219, 0.3);
    }
    
    .dashboard-icon {
      width: 24px;
      height: 24px;
      margin-right: 10px;
    }
    
    /* Group Resources Container for side-by-side layout on desktop */
    .group-resources-container {
      display: flex;
      flex-direction: row;
      gap: 24px;
      margin-bottom: 28px;
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
      gap: 18px;
    }
    
    .app-card {
      background: ${THEME.CARD_BG};
      border-radius: 10px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      overflow: hidden;
      transition: transform 0.3s, box-shadow 0.3s;
      animation: fadeIn 0.5s ease-out forwards;
      border: 1px solid ${THEME.ACCENT};
      display: flex;
      flex-direction: column;
      position: relative;
      z-index: 1;
    }
    
    .app-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
      animation: pulseGlow 2s infinite;
    }
    
    .app-card-header {
      background: ${THEME.PRIMARY};
      padding: 18px;
      text-align: center;
      position: relative;
      border-bottom: 2px solid ${THEME.ACCENT};
    }
    
    /* Font Awesome Icon styling */
    .app-icon-container {
      display: flex;
      justify-content: center;
      align-items: center;
      margin-bottom: 12px;
    }
    
    .app-icon-fa {
      font-size: 2.5rem;
      color: ${THEME.ACCENT};
      transition: transform 0.3s, color 0.3s;
    }
    
    .app-card:hover .app-icon-fa {
      transform: scale(1.15);
      color: #ffffff;
    }
    
    /* Legacy image icons if needed */
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
      letter-spacing: 0.5px;
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
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }
    
    .app-info-icon:hover {
      transform: scale(1.2);
      background-color: white;
    }
    
    /* Tooltips */
    .app-tooltip {
      position: fixed;
      background: linear-gradient(135deg, #1c2b5f 0%, #0d1b45 100%);
      color: #ffffff;
      padding: 15px;
      border-radius: 10px;
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.6);
      width: 280px;
      z-index: 10000;
      opacity: 0;
      visibility: hidden;
      transition: all 0.3s;
      border: 2px solid ${THEME.ACCENT};
      font-size: 14px;
      text-align: center;
      backdrop-filter: blur(5px);
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
      padding: 14px;
      text-decoration: none;
      font-weight: 600;
      transition: all 0.3s;
      margin-top: auto;
      letter-spacing: 0.7px;
      text-transform: uppercase;
      font-size: 14px;
    }
    
    .app-button:hover {
      background-color: #ffffff;
      transform: translateY(-2px);
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
    }
    
    /* VESPA Dashboard */
    .dashboard-section {
      margin-top: 0; /* Changed from 30px since it's now in the top row */
      height: 100%; /* Fill the container height */
    }
    
    .charts-container {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
    }
    
    .chart-wrapper {
      flex: 1;
      min-width: 300px;
      background: ${THEME.CARD_BG};
      border-radius: 10px;
      padding: 20px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      border: 1px solid ${THEME.ACCENT};
    }
    
    .chart-title {
      font-size: 18px;
      color: #ffffff !important; /* Force white color */
      margin-bottom: 12px;
      text-align: center;
      font-weight: 600;
      letter-spacing: 0.5px;
    }
    
    .result-count {
      font-size: 14px;
      color: #cccccc;
      text-align: center;
      margin-bottom: 15px;
    }
    
    canvas {
      width: 100% !important;
      height: 220px !important; /* Increased from 180px for better visibility */
    }
    
    .no-results {
      padding: 30px;
      text-align: center;
      color: #cccccc;
      font-style: italic;
    }
    
    /* Trend indicator styles */
    .trend-positive {
      color: ${THEME.POSITIVE};
      font-weight: bold;
    }
    
    .trend-negative {
      color: ${THEME.NEGATIVE};
      font-weight: bold;
    }
    
    /* Responsive adjustments */
    @media (max-width: 768px) {
      /* Stack top row content vertically on mobile */
      .top-row {
        flex-direction: column;
      }
      
      /* Profile takes full width on mobile */
      .profile-container {
        max-width: 100%;
      }
      
      /* Dashboard takes full width on mobile */
      .dashboard-container {
        margin-top: 24px;
      }
      
      /* Group and Resources stack vertically on mobile */
      .group-resources-container {
        flex-direction: column;
      }
      
      /* Make app grid more responsive on mobile */
      .app-hub {
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      }
      
      /* Adjust profile layout for smaller screens */
      .profile-info {
        flex-direction: column;
      }
      
      /* Charts take full width on mobile */
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
    // Add Font Awesome for professional icons
const fontAwesomeLink = document.createElement('link');
fontAwesomeLink.rel = 'stylesheet';
fontAwesomeLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
document.head.appendChild(fontAwesomeLink);
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
      
      // Check if user is a staff admin (only users with Staff Admin role should see the Management section)
      const hasAdminRole = isStaffAdmin(profileData.roles);
      console.log(`[Staff Homepage] User ${profileData.name} has roles: ${JSON.stringify(profileData.roles)}`);
      console.log(`[Staff Homepage] Has Admin Role: ${hasAdminRole}, Management section will ${hasAdminRole ? 'be shown' : 'NOT be shown'}`);
      
      // Build the homepage HTML with updated layout based on feedback
      // The admin section is conditionally rendered only for staff admin users
      const homepageHTML = `
        <div id="staff-homepage">
          <div class="top-row">
            <div class="profile-container">
              ${renderProfileSection(profileData, hasAdminRole)}
            </div>
            <div class="dashboard-container">
              ${renderVESPADashboard(schoolResults, staffResults, hasAdminRole)}
            </div>
          </div>
          <div class="group-resources-container">
            ${renderGroupSection()}
            ${renderResourcesSection()}
          </div>
          ${hasAdminRole ? renderAdminSection() : '<!-- Management section not shown: user does not have Staff Admin role -->'} 
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
    
    // Track user login in the background
    trackUserLogin().catch(error => {
      console.warn("[Staff Homepage] Error tracking login:", error);
    });
    
    // Render the homepage
    renderHomepage();
  }; // Close initializeStaffHomepage function properly

})(); // Close IIFE properly

