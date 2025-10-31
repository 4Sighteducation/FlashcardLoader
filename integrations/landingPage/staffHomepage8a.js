// Staff Homepage Integration Script for Knack - v1.0

(function() {
  window.STAFFHOMEPAGE_ACTIVE = false;
  // --- Constants and Configuration ---
  const KNACK_API_URL = 'https://api.knack.com/v1';
  const DEBUG_MODE = false; // Set to true for development/testing

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
// Add more sophisticated logging system with levels
const LOG_LEVELS = {
  NONE: 0,
  ERROR: 1, 
  WARN: 2,
  INFO: 3,
  DEBUG: 4
};
// Automatically detect if we're in a development environment
const IS_DEVELOPMENT = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1' ||
                     window.location.hostname.includes('dev') ||
                     window.location.hostname.includes('staging');
const CURRENT_LOG_LEVEL = IS_DEVELOPMENT ? LOG_LEVELS.DEBUG : LOG_LEVELS.ERROR;

(function() {
  // Save original console methods
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
    debug: console.debug
  };
  
  // Common patterns for sensitive data
  const sensitivePatterns = [
    /token/i, /key/i, /api[-_]?key/i, /auth/i, /password/i, /secret/i,
    /email/i, /field_[0-9]+/i, /X-Knack/i
  ];
  
  // Function to check if a string contains sensitive data
  function containsSensitiveData(str) {
    if (typeof str !== 'string') return false;
    return sensitivePatterns.some(pattern => pattern.test(str));
  }
  
  // Function to sanitize arguments
  function sanitizeArgs(args) {
    return Array.from(args).map(arg => {
      // Skip sanitization for simple strings without sensitive data
      if (typeof arg === 'string' && !containsSensitiveData(arg)) {
        return arg;
      }
      
      // Skip sanitization for simple numbers, booleans
      if (typeof arg !== 'object' || arg === null) {
        return arg;
      }
      
      // For objects, try to sanitize
      try {
        // Clone the object to avoid modifying the original
        const clone = JSON.parse(JSON.stringify(arg));
        
        // Recursively sanitize the object
        const sanitize = (obj) => {
          if (!obj || typeof obj !== 'object') return obj;
          
          Object.keys(obj).forEach(key => {
            // Check if key contains sensitive patterns
            if (sensitivePatterns.some(pattern => pattern.test(key))) {
              // Mask the value
              if (typeof obj[key] === 'string') {
                const val = obj[key];
                obj[key] = val.length > 6 ? 
                  `${val.substring(0, 3)}...${val.substring(val.length - 3)}` : 
                  '***MASKED***';
              } else {
                obj[key] = '***MASKED***';
              }
            } 
            // Recurse into nested objects
            else if (typeof obj[key] === 'object' && obj[key] !== null) {
              obj[key] = sanitize(obj[key]);
            }
          });
          
          return obj;
        };
        
        return sanitize(clone);
      } catch (e) {
        // If sanitization fails, return a safe placeholder
        return "[Complex Object]";
      }
    });
  }

  // Override console methods
  if (!DEBUG_MODE && CURRENT_LOG_LEVEL < LOG_LEVELS.DEBUG) {
    // In production, override all console methods except error
    console.log = function() {
      // Only allow Staff Homepage logs in production
      const firstArg = arguments[0];
      if (typeof firstArg === 'string' && firstArg.includes('[Staff Homepage]') && 
          CURRENT_LOG_LEVEL >= LOG_LEVELS.INFO) {
        originalConsole.log.apply(console, sanitizeArgs(arguments));
      }
    };
    
    console.warn = function() {
      if (CURRENT_LOG_LEVEL >= LOG_LEVELS.WARN) {
        originalConsole.warn.apply(console, sanitizeArgs(arguments));
      }
    };
    
    console.info = function() {
      if (CURRENT_LOG_LEVEL >= LOG_LEVELS.INFO) {
        originalConsole.info.apply(console, sanitizeArgs(arguments));
      }
    };
    
    console.debug = function() {
      // Suppress debug logs in production
    };
    
    // Keep error logging for troubleshooting
    console.error = function() {
      originalConsole.error.apply(console, sanitizeArgs(arguments));
    };
  }
})();

// Add data sanitization function for logging
function sanitizeDataForLogging(data) {
  if (!data) return data;
  
  // Don't modify the original data
  let result;
  try {
    result = JSON.parse(JSON.stringify(data));
  } catch (e) {
    // If can't deep clone, create a new object with basic properties
    return typeof data === 'object' ? {} : data;
  }
  
  // Define sensitive fields to mask
  const sensitiveFields = [
    'Authorization', 'X-Knack-REST-API-Key', 'X-Knack-Application-Id', 
    'token', 'email', 'password', 'knackApiKey', 'field_70'
  ];
  
  // Helper function to recursively sanitize an object
  function sanitizeObject(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    
    Object.keys(obj).forEach(key => {
      // Check if this is a sensitive field
      if (sensitiveFields.includes(key) || key.toLowerCase().includes('token') || 
          key.toLowerCase().includes('key') || key.toLowerCase().includes('auth')) {
        // Mask the value based on type
        if (typeof obj[key] === 'string') {
          const val = obj[key];
          obj[key] = val.length > 8 ? 
            `${val.substring(0, 3)}...${val.substring(val.length - 3)}` : 
            '***MASKED***';
        } else {
          obj[key] = '***MASKED***';
        }
      } 
      // Recursively process nested objects
      else if (typeof obj[key] === 'object' && obj[key] !== null) {
        obj[key] = sanitizeObject(obj[key]);
      }
    });
    
    return obj;
  }
  
  return sanitizeObject(result);
}

// --- API Queue for Rate Limiting ---
const KnackAPIQueue = (function() {
  // Private members
  const queue = [];
  const maxRequestsPerSecond = 6;  // Conservative limit (below Knack's 10/s)
  let processing = false;
  let requestsThisSecond = 0;
  let resetTime = Date.now() + 1000;
  // Add a timer ID for improved management
  let resetTimerId = null;

  // Add a function to properly reset the counter
  function resetRequestCounter() {
    requestsThisSecond = 0;
    resetTime = Date.now() + 1000;
    // Schedule the next reset
    clearTimeout(resetTimerId);
    resetTimerId = setTimeout(resetRequestCounter, 1000);
    // Update the indicator after resetting
    KnackAPIQueue.updateLoadingIndicator();
    console.log("[Staff Homepage] Request counter reset to 0");
  }

  // Start the reset timer immediately
  resetTimerId = setTimeout(resetRequestCounter, 1000);

  // Process the next request in the queue
  function processNextRequest() {
    if (queue.length === 0) {
      processing = false;
      // Additional check to force indicator update when queue is empty
      KnackAPIQueue.updateLoadingIndicator();
      return;
    }

    const now = Date.now();
    
    // Reset counter if we're in a new second
    if (now > resetTime) {
      requestsThisSecond = 0;
      resetTime = now + 1000;
      // Reset our timer to stay in sync
      clearTimeout(resetTimerId);
      resetTimerId = setTimeout(resetRequestCounter, 1000);
    }

    // Check if we've hit the rate limit
    if (requestsThisSecond >= maxRequestsPerSecond) {
      // Wait until the next second
      const delay = resetTime - now;
      setTimeout(processNextRequest, delay + 50); // Add 50ms buffer
      return;
    }

    // Process the next request in the queue
    const request = queue.shift();
    requestsThisSecond++;
    KnackAPIQueue.updateLoadingIndicator();
    
    $.ajax({
      url: request.url,
      type: request.type,
      headers: request.headers,
      data: request.data,
      success: function(response) {
        request.resolve(response);
        // Continue processing the queue
        processNextRequest();
        KnackAPIQueue.updateLoadingIndicator();
      },
      error: function(error) {
        // If it's a rate limit error (429), requeue with backoff
        if (error.status === 429) {
          console.log('[Staff Homepage] Rate limit hit, requeueing request with backoff');
          // Add to front of queue with exponential backoff
          setTimeout(() => {
            queue.unshift(request);
            processNextRequest();
            KnackAPIQueue.updateLoadingIndicator();
          }, 1000); // Wait at least 1 second
        } else {
          request.reject(error);
          // Continue processing the queue
          processNextRequest();
        }
      },
      // Add a complete handler that always runs
      complete: function() {
        // Update loading indicator status in all cases
        KnackAPIQueue.updateLoadingIndicator();
      }
    });
  }

  
  return {
    // Add request to the queue
    addRequest: function(options) {
      return new Promise((resolve, reject) => {
        queue.push({
          url: options.url,
          type: options.type || 'GET',
          headers: options.headers || {},
          data: options.data || null,
          resolve: resolve,
          reject: reject
        });
        
        // Update loading indicator after adding to queue
        this.updateLoadingIndicator();
  
        // Start processing if not already
        if (!processing) {
          processing = true;
          processNextRequest();
        }
      });
    },
    
    // Get current queue stats
    getStats: function() {
      return {
        queueLength: queue.length,
        requestsThisSecond,
        secondResetIn: resetTime - Date.now()
      };
    },
    
    // Update the loading indicator based on queue state
    updateLoadingIndicator: function() {
      const indicator = document.getElementById('api-loading-indicator');
      if (!indicator) return;
      
      const queueLength = queue.length;
      const stats = this.getStats();
      
      // Log current state for debugging
      console.log(`[Staff Homepage] Queue status: ${queueLength} in queue, ${requestsThisSecond} requests this second`);
      
      if (queueLength > 0 || requestsThisSecond > 0) {
        indicator.style.display = 'flex';
        const countElement = indicator.querySelector('.queue-count');
        if (countElement) {
          countElement.textContent = queueLength > 0 ? `(${queueLength} in queue)` : '';
        }
      } else {
        // Ensure the indicator is hidden when no requests are active
        indicator.style.display = 'none';
        console.log('[Staff Homepage] Hiding loading indicator - no active requests');
      }
    },
    
    // Add a method to manually reset the counter if needed
    forceReset: function() {
      requestsThisSecond = 0;
      clearTimeout(resetTimerId);
      resetTimerId = setTimeout(resetRequestCounter, 1000);
      this.updateLoadingIndicator();
      console.log('[Staff Homepage] Force reset request counter');
    }
  };
})();


  // Staff profile field mappings
  const FIELD_MAPPING = {
    // Staff user fields
    userId: 'field_3064',         // User ID 
    userConnection: 'field_3070',  // User Account connection
    staffName: 'field_3066',      // Staff Name
    staffRole: 'field_73',        // Correct staff role field in Object_3 (was showing "profile#")
    schoolConnection: 'field_122', // School connection
    staffAdmin: 'field_439',      // Staff Admin connection field
    
    // Verification fields - CORRECTED
    password: 'field_71',         // Password field
    privacyPolicy: 'field_127',   // Privacy Policy acceptance (Yes/No)
    verifiedUser: 'field_189',    // Verified User status (Yes/No) - CORRECTED FROM field_128
    passwordReset: 'field_539',   // Password Reset status (Yes/No)
    
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

  // App hub configurations - Aligned with GeneralHeader.js navigation
  const APP_SECTIONS = {
    // For normal staff (coaching) - matches staffCoaching navigation
    group: [
      {
        name: "Coaching",
        url: "#mygroup-vespa-results2/",
        scene: "scene_1095",
        icon: "fa-comments",
        description: "Access coaching reports and feedback for your student group"
      },
      {
        name: "Results",
        url: "#vesparesults",
        scene: "scene_1270",
        icon: "fa-bar-chart",
        description: "View detailed VESPA results and analytics"
      },
      {
        name: "Activities",
        url: "#activity-manage",
        scene: "scene_1256",
        icon: "fa-book",
        description: "Browse and manage student activities"
      },
      {
        name: "Study Plans",
        url: "#student-revision",
        scene: "scene_855",
        icon: "fa-graduation-cap",
        description: "Monitor and manage student study sessions and revision plans"
      }
    ],
    resources: [
      {
        name: "Resources",
        url: "#curriculum-resources/",
        scene: "scene_481",
        icon: "fa-folder-open",
        description: "Access teaching resources and materials"
      },
      {
        name: "Worksheets",
        url: "#worksheets",
        scene: "scene_1169",
        icon: "fa-files-o",
        description: "Download printable worksheets and activities"
      },
      {
        name: "Videos",
        url: "#vespa-videos",
        scene: "scene_1266",
        icon: "fa-book-open",
        description: "Watch VESPA instructional and training videos"
      },
      {
        name: "Curriculum",
        url: "#suggested-curriculum2",
        scene: "scene_1234",
        icon: "fa-calendar",
        description: "Explore the VESPA curriculum and implementation guides"
      }
    ],
    // For staff admins - matches staffAdminCoaching navigation
    admin: [
      {
        name: "Dashboard",
        url: "#dashboard",
        scene: "scene_1225",
        icon: "fa-tachometer-alt",
        description: "View comprehensive VESPA dashboard and analytics"
      },
      {
        name: "Results",
        url: "#vesparesults",
        scene: "scene_1270",
        icon: "fa-bar-chart",
        description: "Detailed results analysis for all students"
      },
      {
        name: "Manage",
        url: "#upload-manager",
        scene: "scene_1212",
        icon: "fa-cog",
        description: "Upload and manage staff & student accounts"
      },
      {
        name: "Print Reports",
        url: "#report-printing",
        scene: "scene_1227",
        icon: "fa-print",
        description: "Generate and print student reports"
      }
    ]
  };

  // Icon mapping - Now directly using icons from the navigation config
  const ICON_MAPPING = {
    // Group section - matching header icons
    "Coaching": "fa fa-comments",
    "Results": "fa fa-bar-chart",
    "Activities": "fa fa-book",
    "Study Plans": "fa fa-graduation-cap",
    
    // Resources section - matching header icons
    "Resources": "fa fa-folder-open",
    "Worksheets": "fa fa-files-o",
    "Videos": "fa fa-book-open",
    "Curriculum": "fa fa-calendar",
    
    // Admin section - matching header icons
    "Dashboard": "fa fa-tachometer-alt",
    "Manage": "fa fa-cog",
    "Print Reports": "fa fa-print",
    
    // Default fallback
    "default": "fa fa-circle-info"
  };

// --- Helper Functions ---
// Debug logging helper
function debugLog(title, data, level = LOG_LEVELS.DEBUG) {
  if (level > CURRENT_LOG_LEVEL) return;
  
  // Only log title for INFO level and below
  if (level <= LOG_LEVELS.INFO) {
    console.log(`%c[Staff Homepage] ${title}`, 'color: #7f31a4; font-weight: bold; font-size: 12px;');
    return data;
  }
  
  // Full data logging for DEBUG level
  console.log(`%c[Staff Homepage] ${title}`, 'color: #7f31a4; font-weight: bold; font-size: 12px;');
  try {
    if (data !== undefined) {
      // Sanitize sensitive data before logging
      const sanitizedData = sanitizeDataForLogging(data);
      console.log(sanitizedData);
    }
  } catch (e) {
    console.log("Data could not be fully serialized for logging");
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
  
  if (CURRENT_LOG_LEVEL >= LOG_LEVELS.DEBUG) {
    console.log('[Staff Homepage] Extracting valid record ID from value type:', typeof value);
  }

  // Handle objects (most common case in Knack connections)
  if (typeof value === 'object' && value !== null) {
    // Check for direct ID property
    if (value.id && isValidKnackId(value.id)) {
      if (CURRENT_LOG_LEVEL >= LOG_LEVELS.DEBUG) {
        console.log('[Staff Homepage] Found valid ID in object.id');
      }
      return value.id;
    }
    
    // Check for identifier property
    if (value.identifier && isValidKnackId(value.identifier)) {
      if (CURRENT_LOG_LEVEL >= LOG_LEVELS.DEBUG) {
        console.log('[Staff Homepage] Found valid ID in object.identifier');
      }
      return value.identifier;
    }
    
    // Handle arrays from connection fields
    if (Array.isArray(value)) {
      if (CURRENT_LOG_LEVEL >= LOG_LEVELS.DEBUG) {
        console.log('[Staff Homepage] Value is an array with length:', value.length);
      }
      
      // Handle single item array
      if (value.length === 1) {
        if (typeof value[0] === 'object' && value[0].id) {
          if (CURRENT_LOG_LEVEL >= LOG_LEVELS.DEBUG) {
            console.log('[Staff Homepage] Found valid ID in array[0].id');
          }
          return isValidKnackId(value[0].id) ? value[0].id : null;
        }
        if (typeof value[0] === 'string' && isValidKnackId(value[0])) {
          if (CURRENT_LOG_LEVEL >= LOG_LEVELS.DEBUG) {
            console.log('[Staff Homepage] Found valid ID as string in array[0]');
          }
          return value[0];
        }
      }
      
      // Handle arrays with multiple items
      if (value.length > 1) {
        if (CURRENT_LOG_LEVEL >= LOG_LEVELS.DEBUG) {
          console.log('[Staff Homepage] Processing multi-item array with length:', value.length);
        }
        
        // Process array logic - this stays the same but remove the detailed logging
        // of sensitive IDs
        
        // First try to find an object with an ID property
        for (let i = 0; i < value.length; i++) {
          const item = value[i];
          if (typeof item === 'object' && item !== null && item.id && isValidKnackId(item.id)) {
            if (CURRENT_LOG_LEVEL >= LOG_LEVELS.DEBUG) {
              console.log(`[Staff Homepage] Found valid ID in array[${i}].id`);
            }
            return item.id;
          }
        }
        
        // Then try to find a string that is a valid ID
        for (let i = 0; i < value.length; i++) {
          const item = value[i];
          if (typeof item === 'string' && isValidKnackId(item)) {
            if (CURRENT_LOG_LEVEL >= LOG_LEVELS.DEBUG) {
              console.log(`[Staff Homepage] Found valid ID as string in array[${i}]`);
            }
            return item;
          }
        }
        
        // If we have objects with identifiers, use the first one
        for (let i = 0; i < value.length; i++) {
          const item = value[i];
          if (typeof item === 'object' && item !== null && item.identifier && isValidKnackId(item.identifier)) {
            if (CURRENT_LOG_LEVEL >= LOG_LEVELS.DEBUG) {
              console.log(`[Staff Homepage] Found valid ID in array[${i}].identifier`);
            }
            return item.identifier;
          }
        }
        
        if (CURRENT_LOG_LEVEL >= LOG_LEVELS.DEBUG) {
          console.log('[Staff Homepage] No valid IDs found in multi-item array');
        }
      }
    }
    
    // Check for '_id' property which is sometimes used
    if (value._id && isValidKnackId(value._id)) {
      if (CURRENT_LOG_LEVEL >= LOG_LEVELS.DEBUG) {
        console.log('[Staff Homepage] Found valid ID in object._id');
      }
      return value._id;
    }
  }

  // If it's a direct string ID
  if (typeof value === 'string') {
    if (isValidKnackId(value)) {
      if (CURRENT_LOG_LEVEL >= LOG_LEVELS.DEBUG) {
        console.log('[Staff Homepage] Value is a valid ID string');
      }
      return value;
    } else {
      if (CURRENT_LOG_LEVEL >= LOG_LEVELS.DEBUG) {
        console.log('[Staff Homepage] String is not a valid Knack ID');
      }
    }
  }

  if (CURRENT_LOG_LEVEL >= LOG_LEVELS.DEBUG) {
    console.log('[Staff Homepage] No valid record ID found in value');
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

// Get the current user's school name - used for consistent display
function getCurrentSchoolName() {
  try {
    // Try to get from cache first for performance
    const cachedSchoolName = sessionStorage.getItem('current_school_name');
    if (cachedSchoolName) return cachedSchoolName;
    
    // If not in cache, get from current user attributes
    const user = Knack.getUserAttributes();
    if (!user) return "Unknown School";
    
    // Extract school ID from user attributes if available
    if (user.schoolConnection) {
      const schoolId = extractValidRecordId(user.schoolConnection);
      const schoolRecord = getSchoolRecord(schoolId);
      if (schoolRecord) {
        // Prioritize establishment name (field_44) over generic name (field_2)
        const schoolName = sanitizeField(schoolRecord.field_44 || schoolRecord.field_2);
        if (schoolName) {
          // Cache for future use
          sessionStorage.setItem('current_school_name', schoolName);
          return schoolName;
        }
      }
    }
    
    // Final fallback - check if we can find the school name elsewhere in the user data
    for (const key in user) {
      if (typeof user[key] === 'string' && 
          (key.toLowerCase().includes('school') || key.toLowerCase().includes('academy')) && 
          user[key].length > 0) {
        return sanitizeField(user[key]);
      }
    }
    
    return "Unknown School";
  } catch (e) {
    console.warn("[Staff Homepage] Error getting current school name:", e);
    return "Unknown School";
  }
}


// Generic retry function for API calls
function retryApiCall(apiCall, maxRetries = 3, delay = 1000) {
  return new Promise((resolve, reject) => {
    const attempt = (retryCount) => {
      apiCall()
        .then(resolve)
        .catch((error) => {
          const attemptsMade = retryCount + 1;
          
          // Only log limited error info, not full details that might contain sensitive data
          const safeError = {
            status: error.status,
            statusText: error.statusText,
            // Don't log responseText which might contain sensitive data
          };
          
          console.warn(`[Staff Homepage] API call failed (Attempt ${attemptsMade}/${maxRetries}):`, safeError);

          if (retryCount < maxRetries - 1) {
            const retryDelay = delay * Math.pow(2, retryCount);
            console.log(`[Staff Homepage] Retrying API call in ${retryDelay}ms...`);
            setTimeout(() => attempt(retryCount + 1), retryDelay);
          } else {
            console.error(`[Staff Homepage] API call failed after ${maxRetries} attempts.`);
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
  
  // Only log config availability, not contents
  if (CURRENT_LOG_LEVEL >= LOG_LEVELS.INFO) {
    console.log("[Staff Homepage] Config available:", !!config);
  }
  
  // Fallback to using Knack's global application ID if not in config
  const knackAppId = (config && config.knackAppId) ? config.knackAppId : Knack.application_id;
  // Use config API key if not in config
  const knackApiKey = (config && config.knackApiKey) ? config.knackApiKey : '';
  
  if (CURRENT_LOG_LEVEL >= LOG_LEVELS.INFO) {
    console.log(`[Staff Homepage] Using AppID: ${knackAppId ? (knackAppId.substring(0, 4) + '...') : 'undefined'}`);
  }
  
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
  
  // Only log non-sensitive parts of headers in debug mode
  if (CURRENT_LOG_LEVEL >= LOG_LEVELS.DEBUG) {
    const safeHeaders = {
      'X-Knack-Application-Id': knackAppId ? (knackAppId.substring(0, 4) + '...') : 'missing',
      'X-Knack-REST-API-Key': knackApiKey ? '***MASKED***' : 'missing',
      'Authorization': token ? '***TOKEN***' : 'missing',
      'Content-Type': headers['Content-Type']
    };
    console.log("[Staff Homepage] Headers prepared:", safeHeaders);
  }
  
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
        return KnackAPIQueue.addRequest({
          url: fullUrl,
          type: 'GET',
          headers: getKnackHeaders(),
          data: { format: 'raw' }
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

// Check if cache is disabled via URL parameter or localStorage
isCacheDisabled() {
  // Check URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('nocache') === 'true') {
    console.log('[Staff Homepage] Cache disabled via URL parameter');
    return true;
  }
  
  // Check localStorage setting
  if (localStorage.getItem('disableCache') === 'true') {
    console.log('[Staff Homepage] Cache disabled via localStorage setting');
    return true;
  }
  
  return false;
},

// Create a unique cache key - now includes user email for uniqueness
createKey(type, identifier, userSpecific = true) {
  // Only include user email for user-specific caches
  if (userSpecific) {
    const user = Knack.getUserAttributes();
    const userEmail = user?.email || 'anonymous';
    return `${type}_${identifier}_${userEmail}`;
  }
  
  // Otherwise, create a global cache key
  return `${type}_${identifier}`;
},

// Helper function to get UK-localized date (handles BST automatically)
getLocalizedDate() {
  // Create date in user's local timezone (browser automatically handles BST/GMT)
  const now = new Date();
  
  // Log the time difference for debugging
  const utcTime = new Date(now.toISOString());
  const timeDiff = (now - utcTime) / (60 * 1000); // difference in minutes
  console.log(`[Staff Homepage] Current timezone offset: ${timeDiff} minutes from UTC`);
  
  return now;
},

  // Retrieve cache from Knack
async get(cacheKey, type) {
  try {
    // Check if cache is disabled
    if (this.isCacheDisabled()) {
      console.log(`[Staff Homepage] Cache is disabled, skipping cache lookup for: ${cacheKey}`);
      return null;
    }
    
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
      return KnackAPIQueue.addRequest({
        url: `${KNACK_API_URL}/objects/${this.CACHE_OBJECT}/records?filters=${filters}`,
        type: 'GET',
        headers: getKnackHeaders(),
        data: { format: 'raw' }
      });
    });
    
    if (response && response.records && response.records.length > 0) {
      const cacheRecord = response.records[0];
      
      // Check if cache is expired
      const expiryDate = new Date(cacheRecord.field_3195);
      if (expiryDate < new Date()) {
        console.log(`[Staff Homepage] Cache expired for ${cacheKey}`);
        
      // Mark cache as invalid
      await KnackAPIQueue.addRequest({
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
    await KnackAPIQueue.addRequest({
      url: `${KNACK_API_URL}/objects/${this.CACHE_OBJECT}/records/${cacheRecord.id}`,
      type: 'PUT',
      headers: getKnackHeaders(),
      data: JSON.stringify({
        field_3193: (parseInt(cacheRecord.field_3193) || 0) + 1, // Access Count + 1
        field_3192: new Date().toISOString() // Last Accessed
      })
    });
      
      // Special handling for SchoolLogo type
      if (type === 'SchoolLogo') {
        // Get the URL from field_3205
        const logoUrl = cacheRecord.field_3205;
        
        // Validate the logo URL is actually a string and looks like a URL
        if (typeof logoUrl === 'string' && logoUrl.match(/^https?:\/\//i)) {
          console.log(`[Staff Homepage] Found valid school logo URL in cache: ${logoUrl}`);
          return logoUrl; // Return logo URL directly from field_3205
        } else {
          console.warn(`[Staff Homepage] Invalid logo URL in cache: ${typeof logoUrl}`, logoUrl);
        // Cache is invalid, mark it as such
        await KnackAPIQueue.addRequest({
          url: `${KNACK_API_URL}/objects/${this.CACHE_OBJECT}/records/${cacheRecord.id}`,
          type: 'PUT',
          headers: getKnackHeaders(),
          data: JSON.stringify({
            field_3194: 'No' // Is Valid = No
          })
        });
          return null; // Return null to trigger a fresh search
        }
      }
      
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
    // Check if cache is disabled
    if (this.isCacheDisabled()) {
      console.log(`[Staff Homepage] Cache is disabled, skipping cache storage for: ${cacheKey}`);
      return true; // Return true to indicate "success" even though we didn't store
    }
    
    const user = Knack.getUserAttributes();
    console.log(`[Staff Homepage] Storing data in cache: ${cacheKey} (${type})`);
    
    // Calculate expiry date using localized time
    const now = this.getLocalizedDate();
    const expiryDate = new Date(now);
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
      return KnackAPIQueue.addRequest({
        url: `${KNACK_API_URL}/objects/${this.CACHE_OBJECT}/records?filters=${filters}`,
        type: 'GET',
        headers: getKnackHeaders(),
        data: { format: 'raw' }
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
      
      // Build the update data object
      const updateData = {
        field_3188: JSON.stringify(data), // Data
        field_3192: this.getLocalizedDate().toISOString(), // Last Accessed
        field_3193: (parseInt(cacheRecord.field_3193) || 0) + 1, // Access Count + 1
        field_3194: 'Yes', // Is Valid
        field_3195: expiryDate.toISOString() // Expiry Date
      };
      
      // Add type-specific fields if applicable
      if (type === 'SchoolLogo') {
        updateData.field_3205 = data; // Logo URL field
      }
      
      await retryApiCall(() => {
        return KnackAPIQueue.addRequest({
          url: `${KNACK_API_URL}/objects/${this.CACHE_OBJECT}/records/${cacheRecord.id}`,
          type: 'PUT',
          headers: getKnackHeaders(),
          data: JSON.stringify(updateData)
        });
      });
    } 
    // Otherwise create a new cache entry
    else {
      console.log(`[Staff Homepage] Creating new cache entry for ${cacheKey}`);
      
      // Prepare the basic record data
      const recordData = {
        field_3187: cacheKey, // Cache Key
        field_3189: user?.email || 'unknown', // User Email
        field_3190: schoolName, // User Organisation (School)
        field_3191: this.getLocalizedDate().toISOString(), // First Login (Created Date)
        field_3192: this.getLocalizedDate().toISOString(), // Last Accessed
        field_3193: 1, // Access Count
        field_3194: 'Yes', // Is Valid
        field_3195: expiryDate.toISOString(), // Expiry Date
        field_3196: '', // User IP (could be captured if needed)
        field_3197: type // Cache Type
      };
      
      // Handle SchoolLogo type differently
      if (type === 'SchoolLogo') {
        // For SchoolLogo, store the URL directly in field_3205
        recordData.field_3205 = data; // Logo URL field
        recordData.field_3188 = JSON.stringify({}); // Empty object in data field to avoid null
      } else {
        // For all other types, store the data in the standard data field
        recordData.field_3188 = JSON.stringify(data); // Data
      }
      
      await retryApiCall(() => {
        return KnackAPIQueue.addRequest({
          url: `${KNACK_API_URL}/objects/${this.CACHE_OBJECT}/records`,
          type: 'POST',
          headers: getKnackHeaders(),
          data: JSON.stringify(recordData)
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
      return KnackAPIQueue.addRequest({
        url: `${KNACK_API_URL}/objects/${this.CACHE_OBJECT}/records?filters=${filters}`,
        type: 'GET',
        headers: getKnackHeaders(),
        data: { format: 'raw' }
      });
    });
    
    if (response && response.records && response.records.length > 0) {
      const cacheRecord = response.records[0];
      
      await retryApiCall(() => {
        return KnackAPIQueue.addRequest({
          url: `${KNACK_API_URL}/objects/${this.CACHE_OBJECT}/records/${cacheRecord.id}`,
          type: 'PUT',
          headers: getKnackHeaders(),
          data: JSON.stringify({
            field_3194: 'No' // Is Valid = No
          })
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
},

// Clean up expired or invalid cache entries
async cleanupExpiredCache() {
  try {
    console.log(`[Staff Homepage] Running cache cleanup`);
    
    // Find expired or invalid cache entries
    const now = new Date().toISOString();
    const filters = encodeURIComponent(JSON.stringify({
      match: 'or',
      rules: [
        { field: 'field_3195', operator: 'is before', value: now }, // Expired
        { field: 'field_3194', operator: 'is', value: 'No' }        // Invalid
      ]
    }));
    
    // Get expired/invalid records
    const response = await retryApiCall(() => {
      return KnackAPIQueue.addRequest({
        url: `${KNACK_API_URL}/objects/${this.CACHE_OBJECT}/records?filters=${filters}`,
        type: 'GET',
        headers: getKnackHeaders(),
        data: { format: 'raw' }
      });
    });
    
    if (response && response.records && response.records.length > 0) {
      console.log(`[Staff Homepage] Found ${response.records.length} expired cache records to clean up`);
      
      // Delete records in batches to avoid overloading the server
      const batchSize = 50;
      for (let i = 0; i < response.records.length; i += batchSize) {
        const batch = response.records.slice(i, i + batchSize);
        await Promise.all(batch.map(record => {
          return retryApiCall(() => {
            return KnackAPIQueue.addRequest({
              url: `${KNACK_API_URL}/objects/${this.CACHE_OBJECT}/records/${record.id}`,
              type: 'DELETE',
              headers: getKnackHeaders()
            });
          });
        }));
        console.log(`[Staff Homepage] Deleted batch ${i/batchSize + 1} of expired cache records`);
      }
    } else {
      console.log(`[Staff Homepage] No expired cache records found`);
    }
    
    return true;
  } catch (error) {
    console.error(`[Staff Homepage] Error cleaning up cache:`, error);
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
    
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.INFO) {
      // Log masked email
      const maskedEmail = user.email ? 
        user.email.substring(0, 3) + "..." + user.email.substring(user.email.indexOf('@')) :
        "[no email]";
      console.log(`[Staff Homepage] Tracking login for user: ${maskedEmail}`);
    }
  
  console.log(`[Staff Homepage] Tracking login for user: ${user.email}`);
  
  // Browser detection
  const browser = navigator.userAgent;
  
  // Device type detection (simplified)
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const isTablet = /iPad|Android(?!.*Mobile)/i.test(navigator.userAgent);
  const deviceType = isMobile ? (isTablet ? 'Tablet' : 'Mobile') : 'Desktop';
  
  // Find the user's record in Object_3
  const filters = encodeURIComponent(JSON.stringify({
    match: 'and',
    rules: [
      { field: 'field_70', operator: 'is', value: user.email }  // Staff email field only
    ]
  }));
  
  const response = await retryApiCall(() => {
    return KnackAPIQueue.addRequest({
      url: `${KNACK_API_URL}/objects/object_3/records?filters=${filters}`,
      type: 'GET',
      headers: getKnackHeaders(),
      data: { format: 'raw' }
    });
  });
  
  if (response && response.records && response.records.length > 0) {
    const userRecord = response.records[0];
    
    // Get current login count and increment it
    const currentLogins = parseInt(userRecord.field_3208) || 0;
    const newLoginCount = currentLogins + 1;
    console.log(`[Staff Homepage] Incrementing login count from ${currentLogins} to ${newLoginCount}`);
    
    // Update user record with login information
    await retryApiCall(() => {
      return KnackAPIQueue.addRequest({
        url: `${KNACK_API_URL}/objects/object_3/records/${userRecord.id}`,
        type: 'PUT',
        headers: getKnackHeaders(),
        data: JSON.stringify({
          field_3198: new Date().toISOString(), // Login Date
          field_3201: 0, // Page Views (reset on login) - CORRECTED FIELD
          field_3203: deviceType, // Device Type
          field_3204: browser.substring(0, 100), // Browser (truncated if too long)
          field_3208: newLoginCount // Number of Logins - INCREMENT THIS!
        })
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
    match: 'and',
    rules: [
      { field: 'field_70', operator: 'is', value: user.email }  // Staff email field only
    ]
  }));
  
  const response = await retryApiCall(() => {
    return KnackAPIQueue.addRequest({
      url: `${KNACK_API_URL}/objects/object_3/records?filters=${filters}`,
      type: 'GET',
      headers: getKnackHeaders(),
      data: { format: 'raw' }
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
      return KnackAPIQueue.addRequest({
        url: `${KNACK_API_URL}/objects/object_3/records/${userRecord.id}`,
        type: 'PUT',
        headers: getKnackHeaders(),
        data: JSON.stringify(updateData)
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
  console.log('[Staff Homepage - DEBUG] isStaffAdmin called with:', roles);
  
  if (!roles || !Array.isArray(roles)) {
    console.log('[Staff Homepage - DEBUG] isStaffAdmin: Invalid roles array, returning false');
    return false;
  }

  const result = roles.some(role => {
    if (typeof role !== 'string') return false;

    const normalizedRole = role.toLowerCase().replace(/\s+/g, '');
    const isAdmin = normalizedRole.includes('staffadmin') || normalizedRole === 'admin' || normalizedRole === 'profile_5';
    
    if (isAdmin) {
      console.log('[Staff Homepage - DEBUG] Found admin role match:', role, '-> normalized:', normalizedRole);
    }
    
    return isAdmin;
  });

  console.log(`[Staff Homepage - DEBUG] isStaffAdmin final result: ${result}`);
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
    console.log('[Staff Homepage - DEBUG] Looking for staff record with email:', user.email);
    const staffRecord = await findStaffRecord(user.email);
    if (!staffRecord) {
      console.error("[Staff Homepage] Staff record not found for email:", user.email);
      return {
        name: user.name || "Staff Member",
        roles: ["Unknown Role"],
        school: null,
        schoolId: null,  // DEBUG: Explicitly set to null
        email: user.email,
        userId: user.id
      };
    }
    console.log('[Staff Homepage - DEBUG] Found staff record:', staffRecord);
    
    // Extract school ID for later use
    console.log('[Staff Homepage - DEBUG] Extracting school ID from staffRecord:', staffRecord[FIELD_MAPPING.schoolConnection]);
    const schoolId = extractValidRecordId(staffRecord[FIELD_MAPPING.schoolConnection]);
    console.log('[Staff Homepage - DEBUG] Extracted schoolId:', schoolId);
    
    // Get school details if we have a school ID
    let schoolRecord = null;
    let schoolLogo = null;
    
    if (schoolId) {
      // Get school record just to get the school name
      schoolRecord = await getSchoolRecord(schoolId);
      
      if (schoolRecord) {
        // Get school name - prioritize field_44 (Establishment) over field_2
        const schoolName = sanitizeField(schoolRecord.field_44 || schoolRecord.field_2 || "Unknown School");
        console.log(`[Staff Homepage] Searching for logo for school: ${schoolName}`);
        
        // Skip looking in school record fields and go straight to AI search
        const onlineLogo = await findSchoolLogoOnline(schoolName, schoolId);
        
        if (onlineLogo && typeof onlineLogo === 'string' && onlineLogo.startsWith('http')) {
          console.log(`[Staff Homepage] Found school logo: ${onlineLogo}`);
          schoolLogo = onlineLogo;
        } else {
          console.warn(`[Staff Homepage] Logo search returned invalid result: ${typeof onlineLogo}`, onlineLogo);
          // Use default VESPA logo as fallback
          schoolLogo = "https://www.vespa.academy/assets/images/full-trimmed-transparent-customcolor-1-832x947.png";
          console.log(`[Staff Homepage] Using default VESPA logo as fallback`);
        }
      } else {
        // If no school record, use default VESPA logo
        schoolLogo = "https://www.vespa.academy/assets/images/full-trimmed-transparent-customcolor-1-832x947.png";
        console.log(`[Staff Homepage] No school record found, using default VESPA logo`);
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
      school: schoolRecord ? sanitizeField(schoolRecord.field_44 || schoolRecord.field_2 || "Unknown School") : (profileData?.school || "Unknown School"),
      schoolId: schoolId,
      email: user.email,
      userId: user.id,
      schoolLogo: schoolLogo
    };
    
    debugLog("Compiled staff profile data:", profileData);
    
    // Final validation check for critical fields
    if (!profileData.schoolId) {
      console.error('[Staff Homepage - CRITICAL] NO SCHOOL ID IN PROFILE DATA - Dashboard charts will not display!');
      console.error('[Staff Homepage - CRITICAL] Profile data:', profileData);
    } else {
      console.log('[Staff Homepage - DEBUG] Profile data contains valid schoolId:', profileData.schoolId);
    }
    
    return profileData;
  } catch (error) {
    console.error("[Staff Homepage] Error getting staff profile data:", error);
    return null;
  }
}

// Find the staff record for the user by email
async function findStaffRecord(email) {
  if (!email) {
    console.error('[Staff Homepage] findStaffRecord called with no email');
    return null;
  }
  
  // Don't expose actual email in filter logs
  const maskedEmail = email.substring(0, 3) + "..." + email.substring(email.indexOf('@'));
  console.log(`[Staff Homepage] Searching for staff record with email: ${maskedEmail}`);
  
  const filters = encodeURIComponent(JSON.stringify({
    match: 'and',
    rules: [
      { field: 'field_70', operator: 'is', value: email }
    ]
  }));
  
  try {
    const response = await retryApiCall(() => {
      return KnackAPIQueue.addRequest({
        url: `${KNACK_API_URL}/objects/object_3/records?filters=${filters}`,
        type: 'GET',
        headers: getKnackHeaders(),
        data: { format: 'raw' }
      });
    });
    
    if (response && response.records && response.records.length > 0) {
      const staffRecord = response.records[0];
      // Only log minimal info in production
      if (CURRENT_LOG_LEVEL >= LOG_LEVELS.DEBUG) {
        debugLog("Found staff record:", staffRecord, LOG_LEVELS.DEBUG);
      } else if (CURRENT_LOG_LEVEL >= LOG_LEVELS.INFO) {
        console.log(`[Staff Homepage] Found staff record with ID: ${staffRecord.id}`);
      }
      return staffRecord;
    }
    
    console.warn(`[Staff Homepage] No staff record found for email: ${maskedEmail}`);
    console.warn('[Staff Homepage] API response:', {
      recordsFound: response?.records?.length || 0,
      hasResponse: !!response
    });
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
      return KnackAPIQueue.addRequest({
        url: `${KNACK_API_URL}/objects/object_2/records/${schoolId}`,
        type: 'GET',
        headers: getKnackHeaders(),
        data: { format: 'raw' }
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
            return KnackAPIQueue.addRequest({
              url: `${KNACK_API_URL}/objects/object_2/records?filters=${filters}`,
              type: 'GET',
              headers: getKnackHeaders(),
              data: { format: 'raw' }
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
  if (!schoolId) return "No School Name Found"; // Default fallback
  
  try {
    const schoolRecord = await getSchoolRecord(schoolId);
    if (schoolRecord && schoolRecord.field_2) {
      return schoolRecord.field_2;
    }
    return "No School Name Found"; // Default fallback if record found but no name
  } catch (error) {
    console.error('[Staff Homepage] Error getting school name:', error);
    return "No School Name Found"; // Default fallback on error
  }
}

// Find school logo - simplified version
async function findSchoolLogoOnline(schoolName, schoolId) {
  if (!schoolName || !schoolId) {
    console.error("[Staff Homepage] Cannot search for logo without school name or ID");
    return "https://www.vespa.academy/assets/images/full-trimmed-transparent-customcolor-1-832x947.png";
  }
  
  // Default logo as fallback
  const defaultVespaLogo = "https://www.vespa.academy/assets/images/full-trimmed-transparent-customcolor-1-832x947.png";
  
  console.log(`[Staff Homepage] Getting logo for school: "${schoolName}" (ID: ${schoolId})`);
  
  try {
    // First, check if the school has a custom logo URL saved in field_3206
    const schoolRecord = await getSchoolRecord(schoolId);
    
    // Debug the school record to see what we're getting
    console.log("[Staff Homepage] School record for logo:", JSON.stringify({
      id: schoolRecord?.id,
      field_3206: typeof schoolRecord?.field_3206 === 'object' ? 'OBJECT_DATA' : schoolRecord?.field_3206,
      field_44: schoolRecord?.field_44
    }));
    
    if (schoolRecord && schoolRecord.field_3206) {
      const customLogoUrl = schoolRecord.field_3206;
      console.log(`[Staff Homepage] Found field_3206 content type: ${typeof customLogoUrl}`);
      
      // If it's an object, try to extract URL from it
      if (typeof customLogoUrl === 'object' && customLogoUrl !== null) {
        console.log(`[Staff Homepage] field_3206 contains an object:`, JSON.stringify(customLogoUrl));
        // Try to find a URL property in the object
        const possibleUrl = customLogoUrl.url || customLogoUrl.src || customLogoUrl.href || null;
        if (possibleUrl && typeof possibleUrl === 'string' && possibleUrl.startsWith('http')) {
          console.log(`[Staff Homepage] Extracted URL from object in field_3206: ${possibleUrl}`);
          return possibleUrl;
        }
      }
      // If it's a string, verify it's a valid URL
      else if (typeof customLogoUrl === 'string' && customLogoUrl.trim() !== '') {
        // Check if it's a valid URL
        if (customLogoUrl.startsWith('http')) {
          console.log(`[Staff Homepage] Using custom logo URL from field_3206: ${customLogoUrl}`);
          return customLogoUrl;
        } else {
          console.log(`[Staff Homepage] URL in field_3206 is not valid (doesn't start with http): ${customLogoUrl}`);
        }
      } else {
        console.log(`[Staff Homepage] Invalid logo URL in field_3206: ${typeof customLogoUrl}`, customLogoUrl);
      }
    } else {
      console.log(`[Staff Homepage] No custom logo URL found in field_3206 for school ${schoolId}`);
    }
    
    // If no custom logo found, use the default VESPA logo
    console.log(`[Staff Homepage] Using default VESPA logo for "${schoolName}"`);
    return defaultVespaLogo;
    
  } catch (error) {
    console.error(`[Staff Homepage] Error finding logo for ${schoolName}:`, error);
    return defaultVespaLogo;
  }
}
// --- VESPA Results Data Management ---
// Get VESPA results for the school
async function getSchoolVESPAResults(schoolId) {
console.log('[Staff Homepage - DEBUG] getSchoolVESPAResults called with schoolId:', schoolId);
if (!schoolId) {
  console.error("[Staff Homepage] Cannot get VESPA results: Missing schoolId");
  return null;
}

try {
  // Get current user
  const user = Knack.getUserAttributes();
  const userEmail = user?.email || 'anonymous';
  
  // Create a user-specific cache key for this school's VESPA results
  const cacheKey = `school_vespa_${schoolId}_${userEmail}`;
  
  // Try to get from cache first
  const cachedResults = await CacheManager.get(cacheKey, 'SchoolResults');
  if (cachedResults) {
    // Validate cached data - don't use if it has 0 results (likely stale/wrong)
    if (cachedResults.count && cachedResults.count > 0) {
      console.log(`[Staff Homepage] Using cached VESPA results for school ${schoolId} (${cachedResults.count} students)`);
      return cachedResults;
    } else {
      console.warn(`[Staff Homepage - DEBUG] Cached results had 0 students - clearing bad cache and fetching fresh data`);
      // Clear the bad cache entry
      await CacheManager.clear(cacheKey, 'SchoolResults');
    }
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
  console.log('[Staff Homepage - DEBUG] Fetching object_10 records with filter:', schoolIdFilter);
  let allRecords = await getAllRecordsWithPagination(
    `${KNACK_API_URL}/objects/object_10/records`,
    encodeURIComponent(schoolIdFilter),
    20 // Allow up to 20 pages = 20,000 student records with 1000 per page
  ).catch(error => {
    console.error('[Staff Homepage - DEBUG] Error with schoolId pagination:', error);
    return [];
  });
  
  console.log(`[Staff Homepage - DEBUG] getAllRecordsWithPagination returned ${allRecords.length} records`);
  
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
    
    // Store in cache for future use - but only if we have actual results
    if (averages.count > 0) {
      await CacheManager.set(cacheKey, averages, 'SchoolResults', 120); // 2 hour TTL
      console.log(`[Staff Homepage - DEBUG] Cached ${averages.count} school VESPA results`);
    } else {
      console.warn('[Staff Homepage - DEBUG] Not caching empty school results - will fetch fresh next time');
    }
    
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
    // Create a unique cache key for this staff member's students & VESPA results
    const staffCacheKey = `staff_students_vespa_${schoolId}_${staffEmail}`;
    
    // Try to get from cache first
    const cachedStaffResults = await CacheManager.get(staffCacheKey, 'StaffResults');
    if (cachedStaffResults) {
      console.log(`[Staff Homepage] Using cached staff VESPA results for ${staffEmail}`);
      return cachedStaffResults;
    }
    
    console.log(`[Staff Homepage] Cache miss for staff ${staffEmail}, fetching fresh data`);
    
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
    
    // For Staff Admin users, return all school results if no connected students
    if (useStaffAdminRole) {
      console.log('[Staff Homepage - DEBUG] Staff Admin user - will show all school results if no connected students');  
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
    
    // Store in cache for future use (120 minutes TTL = 2 hours) - but only if we have results
    if (averages.count > 0) {
      await CacheManager.set(staffCacheKey, averages, 'StaffResults', 120);
      console.log(`[Staff Homepage - DEBUG] Cached ${averages.count} staff VESPA results`);
    } else {
      console.warn('[Staff Homepage - DEBUG] Not caching empty staff results');
    }
    
    return averages;
  } catch (error) {
    console.error('[Staff Homepage] Error getting staff VESPA results:', error);
    return null;
  }
}

// Get questionnaire cycle data for the current user
async function getQuestionnaireCycleData(userId, schoolId, forceRefresh = false) {
  if (!userId) {
    console.error("[Staff Homepage] Cannot get cycle data: Missing userId");
    return null;
  }
  
  try {
    // DISABLED CACHE FOR CYCLES - Always fetch fresh data
    // Cycles are critical data that should always be current
    console.log(`[Staff Homepage] Fetching fresh cycle data (cache disabled for cycles)`);
    
    // Skip cache entirely for cycle data
    /*
    const cacheKey = `user_cycles_${userId}_school_${schoolId}`;
    if (!forceRefresh) {
      const cachedCycles = await CacheManager.get(cacheKey, 'UserCycles');
      if (cachedCycles) {
        console.log(`[Staff Homepage] Using cached cycle data for user ${userId}`);
        return cachedCycles;
      }
    }
    */
    
    console.log(`[Staff Homepage] Always fetching fresh cycle data (caching permanently disabled for cycles)`);
    
    // Get the current user record to find connected customer
    const user = Knack.getUserAttributes();
    const staffRecord = await findStaffRecord(user.email);
    
    if (!staffRecord) {
      console.error("[Staff Homepage] Staff record not found for fetching cycles");
      return null;
    }
    
    // First get the school name to use as an alternative search
let schoolName = "Fallibroome Academy"; // Default fallback
try {
  const schoolRecord = await getSchoolRecord(schoolId);
  if (schoolRecord) {
    schoolName = schoolRecord.field_44 || schoolRecord.field_2 || "Fallibroome Academy";
    console.log(`[Staff Homepage] Using school name for cycle search: ${schoolName}`);
  }
} catch (e) {
  console.log(`[Staff Homepage] Error getting school name for cycle search: ${e.message}`);
}

// Create multiple filters to try different approaches
const filters = encodeURIComponent(JSON.stringify({
  match: 'or',
  rules: [
    // ID-based searches with different operators
    { field: 'field_1585', operator: 'is', value: schoolId },
    { field: 'field_1585', operator: 'contains', value: schoolId },
    
    // Name-based searches
    { field: 'field_1585', operator: 'is', value: schoolName },
    { field: 'field_1585', operator: 'contains', value: schoolName },
    { field: 'field_1585', operator: 'contains', value: sanitizeField(schoolName) }
  ]
}));
console.log(`[Staff Homepage] Using expanded filters to find cycles: ${decodeURIComponent(filters)}`);
    
    // Query object_66 for cycle data
    const response = await retryApiCall(() => {
      return KnackAPIQueue.addRequest({
        url: `${KNACK_API_URL}/objects/object_66/records?filters=${filters}`,
        type: 'GET',
        headers: getKnackHeaders(),
        data: { format: 'raw' }
      });
    });
    
// Check the raw response to understand what's being returned
if (response) {
  console.log(`[Staff Homepage] Cycle API response received with ${response.records?.length || 0} records`);
  
  // Log the first record to see its structure
  if (response.records && response.records.length > 0) {
    const sampleRecord = response.records[0];
    console.log(`[Staff Homepage] Sample cycle record:`, JSON.stringify({
      id: sampleRecord.id,
      field_1585: sampleRecord.field_1585,  // Customer/School connection
      field_1584: sampleRecord.field_1584,  // Cycle number
      field_1678: sampleRecord.field_1678,  // Start date
      field_1580: sampleRecord.field_1580   // End date
    }));
  }
}

    if (!response || !response.records || response.records.length === 0) {
      console.log("[Staff Homepage] No cycle records found for this user");
      
      // Return empty cycle data structure with default values
      const emptyCycles = {
        cycle1: { number: 1, start: "No date set", end: "No date set" },
        cycle2: { number: 2, start: "No date set", end: "No date set" },
        cycle3: { number: 3, start: "No date set", end: "No date set" },
        currentCycle: 1
      };
      
      // DISABLED: Don't cache cycle data anymore
      // await CacheManager.set(cacheKey, emptyCycles, 'UserCycles', 30);
      
      return emptyCycles;
    }
    
    // Process the records to get cycle data
    const cycles = {
      cycle1: { number: 1, start: "No date set", end: "No date set" },
      cycle2: { number: 2, start: "No date set", end: "No date set" },
      cycle3: { number: 3, start: "No date set", end: "No date set" }
    };
    
    // Updated helper function to handle complex date objects
const formatDate = (dateObj) => {
  if (!dateObj) return "No date set";
  
  // If it's an object with a date_formatted property (in DD/MM/YYYY format)
  if (typeof dateObj === 'object' && dateObj.date_formatted) {
    return dateObj.date_formatted;
  }
  
  // If it's a string, use the original logic
  if (typeof dateObj === 'string') {
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateObj)) {
      const parts = dateObj.split('/');
      if (parts.length === 3) {
        return `${parts[1]}/${parts[0]}/${parts[2]}`;
      }
    }
    return dateObj;
  }
  
  return "No date set";
};

// First pass: Look for records with valid cycle numbers in field_1579
let assignedCycles = new Set();
let unassignedRecords = [];

for (const record of response.records) {
  // Try to get cycle number from field_1579
  const cycleNumber = parseInt(record.field_1579 || '0');
  
  // Handle complex date objects properly
  const startDate = formatDate(record.field_1678);
  const endDate = formatDate(record.field_1580);
  
  // If we have a valid cycle number (1-3), use it directly
  if (cycleNumber >= 1 && cycleNumber <= 3) {
    cycles[`cycle${cycleNumber}`] = { number: cycleNumber, start: startDate, end: endDate };
    assignedCycles.add(cycleNumber);
  } else {
    // Save for second pass if no valid cycle number
    unassignedRecords.push({ record, startDate, endDate });
  }
}

// Second pass: For records without cycle numbers, sort by date and fill in gaps
if (unassignedRecords.length > 0) {
  // Sort unassigned records by start date (earliest first)
  unassignedRecords.sort((a, b) => {
    if (a.startDate === "No date set") return 1;  // Push records without dates to the end
    if (b.startDate === "No date set") return -1; // Push records without dates to the end
    
    // Parse DD/MM/YYYY format to Date objects
    const parseDate = (dateStr) => {
      const parts = dateStr.split('/');
      return new Date(parts[2], parts[1] - 1, parts[0]); // Year, Month (0-11), Day
    };
    
    return parseDate(a.startDate) - parseDate(b.startDate);
  });
  
  // Find next available cycle slots and assign
  for (const { startDate, endDate } of unassignedRecords) {
    // Find the next available cycle slot (1, 2, or 3)
    for (let i = 1; i <= 3; i++) {
      if (!assignedCycles.has(i)) {
        cycles[`cycle${i}`] = { number: i, start: startDate, end: endDate };
        assignedCycles.add(i);
        break;
      }
    }
  }
}
    
    
    // Determine the current cycle
    cycles.currentCycle = determineCurrentCycle(cycles);
    
    // DISABLED: Don't cache cycle data anymore - always fetch fresh
    // await CacheManager.set(cacheKey, cycles, 'UserCycles', 60);
    console.log('[Staff Homepage] Returning fresh cycle data (cache disabled for cycles)');
    
    return cycles;
  } catch (error) {
    console.error('[Staff Homepage] Error getting cycle data:', error);
    return null;
  }
}

// Function to determine current academic year
function getCurrentAcademicYear() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth(); // 0-indexed (0 = January)
  const day = today.getDate();
  
  // Academic year starts September 1st
  // If we're in September or later, we're in the new academic year
  // If we're before September, we're in the previous academic year
  if (month >= 8) { // September (8) or later
    return `${year}-${year + 1}`;
  } else {
    return `${year - 1}-${year}`;
  }
}

// Function to fetch national benchmark data from object_120
async function getNationalBenchmarkData() {
  try {
    const academicYear = getCurrentAcademicYear();
    console.log('[Staff Homepage] Fetching national benchmark data for academic year:', academicYear);
    
    // Create cache key for national data
    const cacheKey = `national_benchmark_${academicYear}`;
    
    // Try cache first
    const cached = await CacheManager.get(cacheKey, 'NationalBenchmarks');
    if (cached) {
      console.log('[Staff Homepage] Using cached national benchmark data');
      return cached;
    }
    
    // Filter by academic year (field_3308)
    const filters = encodeURIComponent(JSON.stringify({
      match: 'and',
      rules: [
        { field: 'field_3308', operator: 'is', value: academicYear }
      ]
    }));
    
    const response = await KnackAPIQueue.addRequest({
      url: `${KNACK_API_URL}/objects/object_120/records?filters=${filters}`,
      type: 'GET',
      headers: getKnackHeaders()
    });
    
    if (!response.records || response.records.length === 0) {
      console.warn('[Staff Homepage] No national benchmark data found for', academicYear);
      return null;
    }
    
    // Extract the benchmark data for all cycles
    const record = response.records[0];
    const benchmarkData = {
      academicYear,
      cycle1: {
        vision: parseFloat(record.field_3292) || 0,
        effort: parseFloat(record.field_3293) || 0,
        systems: parseFloat(record.field_3294) || 0,
        practice: parseFloat(record.field_3295) || 0,
        attitude: parseFloat(record.field_3296) || 0,
        overall: parseFloat(record.field_3406) || 0
      },
      cycle2: {
        vision: parseFloat(record.field_3297) || 0,
        effort: parseFloat(record.field_3298) || 0,
        systems: parseFloat(record.field_3299) || 0,
        practice: parseFloat(record.field_3300) || 0,
        attitude: parseFloat(record.field_3301) || 0,
        overall: parseFloat(record.field_3407) || 0
      },
      cycle3: {
        vision: parseFloat(record.field_3302) || 0,
        effort: parseFloat(record.field_3303) || 0,
        systems: parseFloat(record.field_3304) || 0,
        practice: parseFloat(record.field_3305) || 0,
        attitude: parseFloat(record.field_3306) || 0,
        overall: parseFloat(record.field_3307) || 0
      }
    };
    
    console.log('[Staff Homepage] National benchmark data:', benchmarkData);
    
    // Cache for 24 hours
    await CacheManager.set(cacheKey, benchmarkData, 'NationalBenchmarks', 1440);
    
    return benchmarkData;
    
  } catch (error) {
    console.error('[Staff Homepage] Error fetching national benchmark data:', error);
    return null;
  }
}

// Helper function to determine the current cycle based on dates
function determineCurrentCycle(cycles) {
  // Get today's date
  const today = new Date();
  
  // Helper to parse date string (DD/MM/YYYY) to Date object
  const parseDate = (dateStr) => {
    if (dateStr === "No date set") return null;
    
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    
    // parts[0] is day, parts[1] is month (0-based), parts[2] is year
    return new Date(parts[2], parts[1] - 1, parts[0]);
  };
  
  // Check if today is within any cycle's date range
  for (let i = 1; i <= 3; i++) {
    const cycle = cycles[`cycle${i}`];
    const startDate = parseDate(cycle.start);
    const endDate = parseDate(cycle.end);
    
    // If both dates are valid, check if today is within range
    if (startDate && endDate) {
      if (today >= startDate && today <= endDate) {
        return i; // Today is within this cycle's range
      }
    }
  }
  
  // If today isn't within any cycle, find the most recently completed cycle
  let mostRecentCycle = 0;
  let mostRecentEndDate = null;
  
  for (let i = 1; i <= 3; i++) {
    const cycle = cycles[`cycle${i}`];
    const endDate = parseDate(cycle.end);
    
    // If end date is valid and in the past
    if (endDate && endDate < today) {
      // If this is the first valid end date we've found, or it's more recent
      if (!mostRecentEndDate || endDate > mostRecentEndDate) {
        mostRecentCycle = i;
        mostRecentEndDate = endDate;
      }
    }
  }
  
  // If we found a completed cycle, return it
  if (mostRecentCycle > 0) {
    return mostRecentCycle;
  }
  
  // Default to cycle 1 if no current or completed cycles found
  return 1;
}

// --- UI Rendering ---

function renderProfileSection(profileData, hasAdminRole) {
  // Initialize variables first to avoid the "Cannot access before initialization" error
  let dashboardButton = '';
  let logoControls = '';
  let featureToggles = '';
  
  if (hasAdminRole) {
    
    // Add logo controls for admin users
    logoControls = `
      <div class="logo-controls">
        <button id="admin-set-logo-btn" class="logo-button">Change Logo</button>
      </div>
    `;
    
    // Add feature toggles for admin users
    featureToggles = `
      <div class="toggles-container">
        <div class="feature-toggles">
          <div class="toggle-item">
            <span class="toggle-label">Productivity Hub</span>
            <div class="toggle-switch" id="toggle-productivity" data-field-obj2="field_3569" data-field-obj3="field_3647">
              <div class="toggle-slider"></div>
            </div>
          </div>
          <div class="toggle-item">
            <span class="toggle-label">Academic Profile</span>
            <div class="toggle-switch" id="toggle-academic" data-field-obj2="field_3575" data-field-obj3="field_3646">
              <div class="toggle-slider"></div>
            </div>
          </div>
          <div class="toggle-item">
            <span class="toggle-label">AI Coach</span>
            <div class="toggle-switch" id="toggle-coach" data-field-obj2="field_3570" data-field-obj3="field_3579">
              <div class="toggle-slider"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  return `
    <section class="vespa-section profile-section">
      <h2 class="vespa-section-title">Staff Profile</h2>
      <div class="profile-info">
        <div class="profile-details">
          <div class="logo-toggles-container">
            <div class="logo-container">
              ${profileData.schoolLogo ? `<img src="${profileData.schoolLogo}" alt="${profileData.school} Logo" class="school-logo">` : ''}
              ${logoControls}
            </div>
            ${featureToggles}
          </div>
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
          
          <div class="profile-item">
            <button id="student-emulator-btn" class="dashboard-button" style="width: 100%; justify-content: center;">
              <i class="fas fa-user-graduate" style="font-size: 20px; margin-right: 10px;"></i>
              <span>Student Experience Mode</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  `;
}

// Render the group section with role-appropriate coaching button
function renderGroupSection(hasAdminRole = false) {
  // Create a modified apps array with the correct coaching button
  const groupApps = APP_SECTIONS.group.map(app => {
    // If this is the Coaching button, return the appropriate version
    if (app.name === "Coaching") {
      console.log('[Staff Homepage - DEBUG] Configuring Coaching button, hasAdminRole:', hasAdminRole);
      if (hasAdminRole) {
        // Return admin coaching configuration
        return {
          name: "Coaching",
          url: "#admin-coaching",
          scene: "scene_1014",
          icon: "fa-comments",
          description: "Access admin coaching tools and student reports"
        };
      } else {
        // Return normal staff coaching configuration
        return {
          name: "Coaching",
          url: "#mygroup-vespa-results2/",
          scene: "scene_1095",
          icon: "fa-comments",
          description: "Access coaching reports and feedback for your student group"
        };
      }
    }
    // Return other apps unchanged
    return app;
  });
  
  return renderAppSection("MY GROUP", groupApps);
}

// Render the resources section
function renderResourcesSection() {
  return renderAppSection("MYRESOURCES", APP_SECTIONS.resources);
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
    // Use icon directly from app config, fallback to ICON_MAPPING if needed
    const iconClass = app.icon ? `fa ${app.icon}` : (ICON_MAPPING[app.name] || ICON_MAPPING.default);
    
    // SIMPLIFIED NAVIGATION:
    // - Use direct navigation for most buttons (full page reload)
    // - Only Coaching button needs special handling for dynamic URL
    let onclickHandler = '';
    let hrefUrl = app.url;
    
    if (app.name === 'Coaching') {
      // Coaching needs dynamic URL based on user role - keep special handling
      onclickHandler = `event.preventDefault(); handleCoachingNavigation();`;
      hrefUrl = '#'; // Placeholder, will be handled by JavaScript
    } else {
      // For all other buttons, use hash navigation (matching copyofHomepage.js)
      // Keep hash URLs as-is for consistent navigation with questionnaireValidator
      hrefUrl = app.url;
      // Simple onclick that tracks usage
      onclickHandler = `window.trackFeatureUse('${sanitizeField(app.name)}'); return true;`;
    }
    
    appsHTML += `
    <a href="${hrefUrl}" class="app-card" title="${sanitizeField(app.name)}" 
       data-scene="${app.scene || ''}"
       data-app-name="${app.name}"
       onclick="${onclickHandler}">
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

// Handle the Coaching button dynamically based on user role
window.handleCoachingNavigation = function() {
  // Track usage
  trackPageView('Coaching').catch(err => 
    console.warn(`[Staff Homepage] Feature tracking failed for Coaching:`, err)
  );
  
  // Determine the correct URL based on user role
  const userRoles = Knack.getUserRoles ? Knack.getUserRoles() : [];
  const hasAdminRole = isStaffAdmin(userRoles);
  
  // Choose the appropriate coaching scene and hash
  let coachingScene, coachingHash;
  if (hasAdminRole) {
    // Staff Admin goes to scene_1014
    coachingScene = 'scene_1014';
    coachingHash = '#admin-coaching';
    console.log('[Staff Homepage] Staff Admin detected, navigating to admin coaching');
  } else {
    // Regular staff goes to scene_1095
    coachingScene = 'scene_1095';
    coachingHash = '#mygroup-vespa-results2/';
    console.log('[Staff Homepage] Regular staff detected, navigating to staff coaching');
  }
  
  // Use the fixed navigateToScene function for consistent hash navigation
  navigateToScene(coachingScene, coachingHash, 'Coaching');
};

// Fixed navigation function to use hash routing like GeneralHeader
window.navigateToScene = function(scene, url, featureName) {
  // Track the feature usage
  if (featureName) {
    trackPageView(featureName).catch(err => 
      console.warn(`[Staff Homepage] Feature tracking failed for ${featureName}:`, err)
    );
  }
  
  // Log navigation for debugging
  debugLog('Homepage button navigation', {
    scene: scene,
    url: url,
    feature: featureName
  });
  
  // CRITICAL: Hide the dashboard immediately to prevent overlay issues
  const dashboardContainer = document.querySelector('.staff-dashboard-container');
  if (dashboardContainer) {
    console.log('[Staff Homepage] Hiding dashboard before navigation');
    dashboardContainer.style.display = 'none';
  }
  
  // Also hide the entire homepage view container
  const homepageView = document.querySelector('#view_3024');
  if (homepageView) {
    homepageView.style.display = 'none';
  }
  
  // CRITICAL: Set bypass flags to prevent Universal Redirect interference
  window._universalRedirectCompleted = true;
  window._bypassUniversalRedirect = true;
  window._navigationInProgress = true;
  window._headerNavigationActive = true;
  sessionStorage.setItem('universalRedirectCompleted', 'true');
  sessionStorage.setItem('navigationTarget', scene);
  sessionStorage.setItem('headerNavigationActive', 'true');
  
  // Signal the loader to force reload for this scene
  window._forceAppReload = scene;
  
  // Clear any cached app states for the target scene
  if (window.cleanupAppsForScene && typeof window.cleanupAppsForScene === 'function') {
    window.cleanupAppsForScene(scene);
  }
  
  // Load navigation fixes on-demand for specific scenes
  if (window.loadNavigationFixForScene && typeof window.loadNavigationFixForScene === 'function') {
    console.log(`[Staff Homepage] Loading navigation fix for scene ${scene}`);
    window.loadNavigationFixForScene(scene);
  }
  
  // Use hash navigation to stay within the SPA
  const hashUrl = url.startsWith('#') ? url : '#' + url;
  
  // Navigate using hash to avoid full page reload
  setTimeout(() => {
    window.location.hash = hashUrl;
    
    // Clear navigation flags after a delay
    setTimeout(() => {
      window._navigationInProgress = false;
      window._headerNavigationActive = false;
      sessionStorage.removeItem('headerNavigationActive');
    }, 500);
  }, 50);
};

// Add this global function for tracking feature usage
window.trackFeatureUse = function(featureName) {
  trackPageView(featureName).catch(err => 
    console.warn(`[Staff Homepage] Feature tracking failed for ${featureName}:`, err)
  );
};

// Render the VESPA dashboard
function renderVESPADashboard(schoolResults, staffResults, hasAdminRole, cycleData) {
  console.log('[Staff Homepage - DEBUG] renderVESPADashboard called with:');
  console.log('[Staff Homepage - DEBUG] - schoolResults:', schoolResults);
  console.log('[Staff Homepage - DEBUG] - hasAdminRole:', hasAdminRole);
  
  if (!schoolResults) {
    console.error('[Staff Homepage - DEBUG] NO SCHOOL RESULTS - Chart will not display!');
    return `
      <section class="vespa-section dashboard-section">
        <h2 class="vespa-section-title">VESPA Dashboard</h2>
        <div class="no-results">No VESPA results available for your school. (DEBUG: schoolResults is null/undefined)</div>
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

  // Render the chart section
  const chartSection = `
    <div class="chart-wrapper">
      <h3 class="chart-title">${chartTitle}</h3>
      <div class="result-count">${countDisplay}</div>
      <canvas id="vespaChart"></canvas>
    </div>
  `;

  // Render the cycle section if we have data
  const cycleSection = cycleData ? renderCycleSection(cycleData, hasAdminRole) : '';
  
  // Combine both sections
  return `
    <section class="vespa-section dashboard-section">
      <h2 class="vespa-section-title">VESPA Dashboard</h2>
      <div class="charts-container">
        ${chartSection}
      </div>
      ${cycleSection}
    </section>
  `;
}

// Render the cycles section
function renderCycleSection(cycleData, hasAdminRole) {
  if (!cycleData) {
    return `
      <div class="cycle-section-container">
        <div class="cycle-section">
          <h3 class="cycle-section-title">Questionnaire Cycles</h3>
          <div class="no-cycles">No cycle information available</div>
        </div>
      </div>
    `;
  }
  
  // Create the HTML for each cycle column
  const renderCycleColumn = (cycle, isCurrent) => {
    const currentClass = isCurrent ? 'current-cycle' : '';
    
    return `
      <div class="cycle-column ${currentClass}">
        <div class="cycle-header">
          <h4>Cycle ${cycle.number}</h4>
          ${isCurrent ? '<span class="current-badge">Current</span>' : ''}
        </div>
        <div class="cycle-dates">
          <div class="cycle-date">
            <span class="date-label">Start:</span>
            <span class="date-value">${cycle.start}</span>
          </div>
          <div class="cycle-date">
            <span class="date-label">End:</span>
            <span class="date-value">${cycle.end}</span>
          </div>
        </div>
      </div>
    `;
  };
  
  // Admin button HTML - only shown for staff admin users
  const adminButton = hasAdminRole ? `
    <button id="manage-cycles-btn"
       class="cycle-admin-button">
      <i class="fas fa-cog"></i> Manage Cycles
    </button>
  ` : '';
  
  // Render the complete section
  return `
    <div class="cycle-section-container">
      <div class="cycle-section">
        <div class="cycle-section-header">
          <h3 class="cycle-section-title">Questionnaire Cycles</h3>
          <div class="cycle-actions">
            <button id="refresh-cycles-btn" class="cycle-refresh-button" title="Refresh Data">
              <i class="fas fa-sync-alt"></i> Refresh
            </button>
            ${adminButton}
          </div>
        </div>
        
        <div class="cycle-columns">
          ${renderCycleColumn(cycleData.cycle1, cycleData.currentCycle === 1)}
          ${renderCycleColumn(cycleData.cycle2, cycleData.currentCycle === 2)}
          ${renderCycleColumn(cycleData.cycle3, cycleData.currentCycle === 3)}
        </div>
      </div>
    </div>
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
        createCharts(schoolResults, staffResults, hasAdminRole, nationalData, cycleData);
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

// Lazy load VESPA charts using Intersection Observer
function lazyLoadVESPACharts(schoolResults, staffResults, hasAdminRole, nationalData, cycleData) {
try {
  // Store chart data in window for when we need it
  window.chartData = {
    schoolResults,
    staffResults,
    hasAdminRole,
    nationalData,
    cycleData
  };
  
  // Add placeholder/loading indicator to chart wrapper
  const chartContainer = document.getElementById('vespaChart');
  if (!chartContainer) return;
  
  // Add class for targeting with IntersectionObserver
  chartContainer.parentElement.classList.add('chart-container-lazy');
  
  // Add loading indicator
  chartContainer.innerHTML = `
    <div class="chart-loading">
      <div class="chart-loading-spinner"></div>
      <div>Loading chart data...</div>
    </div>
  `;
  
  // Create IntersectionObserver to detect when chart is visible
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        // When chart container is visible in viewport
        if (entry.isIntersecting) {
          debugLog("Chart container is visible, loading Chart.js");
          
          // Lazy load Chart.js
          if (typeof Chart === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js@3.7.1/dist/chart.min.js';
            script.onload = () => {
              debugLog("Chart.js loaded successfully");
              // Create chart with stored data
              createCharts(
                window.chartData.schoolResults,
                window.chartData.staffResults,
                window.chartData.hasAdminRole,
                window.chartData.nationalData,
                window.chartData.cycleData
              );
            };
            script.onerror = (error) => {
              console.error("[Staff Homepage] Failed to load Chart.js:", error);
              // Show error in chart container
              chartContainer.innerHTML = `<div class="chart-error">Unable to load chart library</div>`;
            };
            document.head.appendChild(script);
          } else {
            // Chart.js already loaded, create charts immediately
              createCharts(
                window.chartData.schoolResults,
                window.chartData.staffResults,
                window.chartData.hasAdminRole,
                window.chartData.nationalData,
                window.chartData.cycleData
              );
          }
          
          // Disconnect observer after loading
          observer.disconnect();
        }
      });
    }, { threshold: 0.1 }); // Trigger when 10% of element is visible
    
    // Start observing chart containers
    const chartContainers = document.querySelectorAll('.chart-container-lazy');
    chartContainers.forEach(container => observer.observe(container));
  } else {
    // Fallback for browsers without IntersectionObserver
    debugLog("IntersectionObserver not supported, loading Chart.js immediately");
    
    // Load Chart.js normally
    if (typeof Chart === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js@3.7.1/dist/chart.min.js';
      script.onload = () => {
        createCharts(schoolResults, staffResults, hasAdminRole, nationalData, cycleData);
      };
      document.head.appendChild(script);
    } else {
      createCharts(schoolResults, staffResults, hasAdminRole);
    }
  }
} catch (error) {
  console.error("[Staff Homepage] Error initializing lazy loading for VESPA charts:", error);
}
}

// Create the actual charts once Chart.js is loaded
function createCharts(schoolResults, staffResults, hasAdminRole, nationalData, cycleData) {
  if (!schoolResults) return;
  
  // Determine current cycle for national data
  const currentCycle = cycleData?.currentCycle || 1;
  console.log('[Staff Homepage - DEBUG] Using cycle', currentCycle, 'for national benchmarks');
  
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
  
  // Prepare national benchmark data if available
  let nationalBenchmarks = null;
  if (nationalData && currentCycle) {
    const cycleKey = `cycle${currentCycle}`;
    const cycleBenchmarks = nationalData[cycleKey];
    
    if (cycleBenchmarks) {
      nationalBenchmarks = [
        cycleBenchmarks.vision,
        cycleBenchmarks.effort,
        cycleBenchmarks.systems,
        cycleBenchmarks.practice,
        cycleBenchmarks.attitude
      ];
      
      console.log('[Staff Homepage] National benchmarks for cycle', currentCycle, ':', nationalBenchmarks);
    }
  }
  
  // Create chart configuration with national benchmark plugin if available
  const chartConfig = {
    type: 'bar',
    data: {
      labels: ['Vision', 'Effort', 'Systems', 'Practice', 'Attitude'],
      datasets: datasets
    },
    plugins: nationalBenchmarks ? [{
      id: 'nationalBenchmarks',
      afterDatasetsDraw: function(chart) {
        const ctx = chart.ctx;
        const meta = chart.getDatasetMeta(0); // Use first dataset for positioning
        const yScale = chart.scales.y;
        
        // Draw benchmark lines for each VESPA category
        nationalBenchmarks.forEach((value, index) => {
          if (value > 0 && meta.data[index]) {
            const y = yScale.getPixelForValue(value);
            const barData = meta.data[index];
            const x = barData.x;
            const barWidth = barData.width || 60;
            
            // Draw horizontal line across the bar width
            ctx.save();
            ctx.strokeStyle = '#FFD700'; // Yellow/gold color for national average
            ctx.lineWidth = 2; // Narrower line
            ctx.setLineDash([4, 2]); // Smaller dashes
            ctx.beginPath();
            ctx.moveTo(x - barWidth/2 - 5, y);
            ctx.lineTo(x + barWidth/2 + 5, y);
            ctx.stroke();
            
            // Add label for the national average with better spacing
            ctx.fillStyle = '#FFD700';
            ctx.font = '600 11px Arial'; // Slightly bolder font
            ctx.textAlign = 'center';
            // Add background for better readability
            const text = `UK: ${value.toFixed(1)}`;
            const textWidth = ctx.measureText(text).width;
            ctx.fillStyle = 'rgba(10, 27, 80, 0.8)'; // Dark background
            ctx.fillRect(x - textWidth/2 - 3, y - 18, textWidth + 6, 14);
            ctx.fillStyle = '#FFD700';
            ctx.fillText(text, x, y - 7); // More spacing from line
            ctx.restore();
          }
        });
      }
    }] : [],
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
              const footer = [`Based on ${count} students`];
              
              // Add national benchmark to tooltip if available
              if (nationalBenchmarks) {
                const categoryIndex = tooltipItems[0].dataIndex;
                const nationalValue = nationalBenchmarks[categoryIndex];
                if (nationalValue > 0) {
                  footer.push(`UK Average: ${nationalValue.toFixed(1)}`);
                }
              }
              
              return footer;
            }
          }
        }
      },
      responsive: true,
      maintainAspectRatio: false
    }
  };
  
  // Create the chart
  new Chart(chartCtx, chartConfig);
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

// Setup refresh button for cycles
function setupCycleRefresh(userId, schoolId) {
  const refreshBtn = document.getElementById('refresh-cycles-btn');
  if (!refreshBtn) return;
  
  refreshBtn.addEventListener('click', async function() {
    // Show loading state
    refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
    refreshBtn.disabled = true;
    
    try {
      // Invalidate relevant caches
      const userCacheKey = `user_cycles_${userId}`;
      const schoolCacheKey = `school_vespa_${schoolId}`;
      const staffCacheKey = `staff_students_vespa_${schoolId}_${Knack.getUserAttributes().email}`;
      
      // Invalidate caches in parallel
      await Promise.all([
        CacheManager.invalidate(userCacheKey, 'UserCycles'),
        CacheManager.invalidate(schoolCacheKey, 'SchoolResults'),
        CacheManager.invalidate(staffCacheKey, 'StaffResults')
      ]);
      
      // Show success message briefly
      refreshBtn.innerHTML = '<i class="fas fa-check"></i> Refreshed!';
      setTimeout(() => {
        // Reload the page to show fresh data
        location.reload();
      }, 1000);
    } catch (error) {
      console.error('[Staff Homepage] Error refreshing data:', error);
      refreshBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error';
      
      // Reset after 3 seconds
      setTimeout(() => {
        refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
        refreshBtn.disabled = false;
      }, 3000);
    }
  });
}

// Set up feature toggles for admin users
async function setupFeatureToggles(schoolId, profileData) {
  if (!schoolId) return;
  
  try {
    // Get current toggle states from Object_2 (school/customer record)
    const schoolRecord = await getSchoolRecord(schoolId);
    if (!schoolRecord) {
      console.warn('[Staff Homepage] Could not load school record for toggles');
      return;
    }
    
    // Set initial toggle states based on Object_2 fields
    const toggles = [
      { id: 'toggle-productivity', field: 'field_3569', value: schoolRecord.field_3569 },
      { id: 'toggle-academic', field: 'field_3575', value: schoolRecord.field_3575 },
      { id: 'toggle-coach', field: 'field_3570', value: schoolRecord.field_3570 }
    ];
    
    toggles.forEach(toggle => {
      const toggleElement = document.getElementById(toggle.id);
      if (toggleElement) {
        // Set initial state (true = active)
        if (toggle.value === true || toggle.value === 'true') {
          toggleElement.classList.add('active');
        }
        
        // Add click event listener
        toggleElement.addEventListener('click', async () => {
          await handleToggleClick(toggle.id, schoolId, profileData);
        });
      }
    });
    
    console.log('[Staff Homepage] Feature toggles initialized');
    
  } catch (error) {
    console.error('[Staff Homepage] Error setting up feature toggles:', error);
  }
}

// Handle toggle click events
async function handleToggleClick(toggleId, schoolId, profileData) {
  const toggleElement = document.getElementById(toggleId);
  if (!toggleElement) return;
  
  try {
    // Toggle the visual state
    const isActive = toggleElement.classList.toggle('active');
    
    // Get field mappings from data attributes
    const obj2Field = toggleElement.dataset.fieldObj2;
    const obj3Field = toggleElement.dataset.fieldObj3;
    
    if (!obj2Field || !obj3Field) {
      console.error('[Staff Homepage] Missing field mappings on toggle');
      return;
    }
    
    console.log(`[Staff Homepage] Updating ${toggleId}: ${isActive ? 'enabled' : 'disabled'}`);
    
    // Get friendly name for the toggle
    const toggleNames = {
      'toggle-productivity': 'Productivity Hub',
      'toggle-academic': 'Academic Profile', 
      'toggle-coach': 'AI Coach'
    };
    const toggleName = toggleNames[toggleId] || toggleId.replace('toggle-', '');
    
    // Hide the API loading indicator to prevent user from feeling they need to wait
    const apiIndicator = document.getElementById('api-loading-indicator');
    if (apiIndicator) {
      apiIndicator.style.display = 'none';
    }
    
    // Show immediate success modal
    showToggleUpdateModal(toggleName, isActive);
    
    // Update Object_2 (school/customer record) - this is fast
    await updateSchoolToggleField(schoolId, obj2Field, isActive);
    
    // Update all connected Object_3 records (student accounts) in background - this might be slow
    updateConnectedStudentToggles(schoolId, obj3Field, isActive).catch(error => {
      console.error(`[Staff Homepage] Background error updating student accounts for ${toggleId}:`, error);
      // Don't show error to user since they already got success message
    });
    
    console.log(`[Staff Homepage] Toggle ${toggleId} updated successfully`);
    
  } catch (error) {
    console.error(`[Staff Homepage] Error handling toggle ${toggleId}:`, error);
    
    // Revert visual state on error
    toggleElement.classList.toggle('active');
    
    // Show error message
    showNotification(`Error updating ${toggleId.replace('toggle-', '')} setting. Please try again.`, 'error');
  }
}

// Update Object_2 field
async function updateSchoolToggleField(schoolId, fieldName, value) {
  const updateData = {};
  updateData[fieldName] = value;
  
  return await retryApiCall(() => {
    return KnackAPIQueue.addRequest({
      url: `${KNACK_API_URL}/objects/object_2/records/${schoolId}`,
      type: 'PUT',
      headers: getKnackHeaders(),
      data: JSON.stringify(updateData)
    });
  });
}

// Show notification to user
function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `vespa-notification ${type}`;
  notification.textContent = message;
  
  // Add styles
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 6px;
    color: white;
    font-weight: 500;
    z-index: 10000;
    max-width: 300px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    ${type === 'error' ? 'background-color: #ff6b6b;' : 'background-color: #00e5db;'}
  `;
  
  document.body.appendChild(notification);
  
  // Remove after 4 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 4000);
}

// Show toggle update success modal
function showToggleUpdateModal(toggleName, isEnabled) {
  // Remove any existing modal
  const existingModal = document.getElementById('toggle-update-modal');
  if (existingModal) {
    existingModal.remove();
  }
  
  const status = isEnabled ? 'enabled' : 'disabled';
  const statusColor = isEnabled ? '#00e5db' : '#ff6b6b';
  
  const modalHtml = `
    <div id="toggle-update-modal" class="vespa-modal" style="display: block; z-index: 10001;">
      <div class="vespa-modal-content" style="max-width: 400px; text-align: center;">
        <span class="vespa-modal-close" onclick="document.getElementById('toggle-update-modal').remove()">&times;</span>
        <div style="margin-bottom: 20px;">
          <div style="width: 60px; height: 60px; margin: 0 auto 15px; border-radius: 50%; background: ${statusColor}; display: flex; align-items: center; justify-content: center;">
            <i class="fas ${isEnabled ? 'fa-check' : 'fa-times'}" style="color: white; font-size: 24px;"></i>
          </div>
          <h3 style="color: ${statusColor}; margin-bottom: 10px;">${toggleName} ${isEnabled ? 'Enabled' : 'Disabled'}</h3>
        </div>
        
        <div style="background: rgba(0, 229, 219, 0.1); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 0 0 10px 0; font-weight: 500;">Update in Progress</p>
          <p style="margin: 0; font-size: 14px; color: #ccc;">
            The <strong>${toggleName}</strong> feature has been <strong>${status}</strong> for your school. 
            This change will be applied to all connected student accounts and may take a few minutes to process completely.
          </p>
        </div>
        
        <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 15px; color: #00e5db;">
          <div class="api-loading-spinner" style="width: 20px; height: 20px; margin-right: 10px;"></div>
          <span style="font-size: 14px;">Processing student accounts...</span>
        </div>
        
        <button onclick="document.getElementById('toggle-update-modal').remove()" 
                style="background: #00e5db; color: #0a2b8c; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-weight: 500;">
          Got it
        </button>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  // Auto-remove after 8 seconds
  setTimeout(() => {
    const modal = document.getElementById('toggle-update-modal');
    if (modal) {
      modal.remove();
    }
  }, 8000);
}

// Backend service configuration for bulk toggle operations
const BACKEND_SERVICE = {
  // Production URL for your Vercel backend
  PRODUCTION_URL: 'https://homepagebackend.vercel.app',
  
  // Get the appropriate URL
  getUrl() {
    return this.PRODUCTION_URL;
  }
};

// Update all connected Object_3 records using backend service
async function updateConnectedStudentToggles(schoolId, fieldName, value) {
  if (!schoolId) {
    console.warn('[Staff Homepage] No school ID provided for student updates');
    return;
  }
  
  try {
    console.log(`[Staff Homepage] Initiating bulk update via backend service`);
    console.log(`[Staff Homepage] School ID: ${schoolId}, Field: ${fieldName}, Value: ${value}`);
    
    // Single background notification - no more popups after this
    const fieldLabel = fieldName === 'field_3646' ? 'Academic Profile' :
                      fieldName === 'field_3647' ? 'Productivity Hub' :
                      fieldName === 'field_3579' ? 'AI Coach' : 'feature';
    
    showNotification(`${fieldLabel} update processing in background. This may take a few minutes for large cohorts.`, 'info');
    
    // Call backend service for bulk update
    const backendUrl = `${BACKEND_SERVICE.getUrl()}/api/toggle-bulk-update`;
    console.log(`[Staff Homepage] Calling backend at: ${backendUrl}`);
    
    // Get Knack credentials from config (same as getKnackHeaders function uses)
    const config = window.STAFFHOMEPAGE_CONFIG;
    const knackAppId = (config && config.knackAppId) ? config.knackAppId : Knack.application_id;
    const knackApiKey = (config && config.knackApiKey) ? config.knackApiKey : '';
    
    console.log(`[Staff Homepage] Using Knack App ID: ${knackAppId ? 'Found' : 'Missing'}`);
    console.log(`[Staff Homepage] Using Knack API Key: ${knackApiKey ? 'Found' : 'Missing'}`);
    
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Knack-Application-Id': knackAppId,
        'X-Knack-REST-API-Key': knackApiKey
      },
      body: JSON.stringify({
        schoolId: schoolId,
        fieldName: fieldName,
        value: value,
        schoolConnectionField: 'field_122',
        objectId: 'object_3'
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Staff Homepage] Backend error response (${response.status}):`, errorText);
      throw new Error(`Backend service error (${response.status}): ${errorText}`);
    }
    
    const result = await response.json();
    console.log('[Staff Homepage] Backend service response:', result);
    
    if (result.jobId) {
      // Silently monitor in background - no more notifications
      monitorToggleJobStatusSilently(result.jobId, fieldName, fieldLabel);
    }
    
    // No success notification here - let it process silently
    
  } catch (error) {
    console.error('[Staff Homepage] Error initiating bulk update - Full error:', error);
    console.error('[Staff Homepage] Error message:', error.message);
    console.error('[Staff Homepage] Error stack:', error.stack);
    
    // Fallback to client-side update if backend fails
    console.log('[Staff Homepage] Falling back to client-side update');
    await updateConnectedStudentTogglesFallback(schoolId, fieldName, value);
  }
}

// Monitor job status silently in background
async function monitorToggleJobStatusSilently(jobId, fieldName, fieldLabel) {
  const checkInterval = 10000; // Check every 10 seconds (less frequent)
  const maxChecks = 30; // Max 5 minutes
  let checkCount = 0;
  
  const checkStatus = async () => {
    try {
      const response = await fetch(`${BACKEND_SERVICE.getUrl()}/api/toggle-status/${jobId}`);
      
      if (!response.ok) {
        console.log('[Staff Homepage] Job status check failed - stopping monitor');
        return;
      }
      
      const status = await response.json();
      console.log(`[Staff Homepage] Job ${jobId} status:`, status);
      
      if (status.status === 'completed') {
        // Log success but don't show notification
        console.log(`[Staff Homepage] ✅ ${fieldLabel} update completed! ${status.processed} of ${status.total} accounts updated.`);
        
        // Log any errors
        if (status.errors && status.errors.length > 0) {
          console.warn('[Staff Homepage] Some updates failed:', status.errors);
        }
        
        return; // Stop monitoring
      }
      
      if (status.status === 'failed') {
        // Log failure but don't show notification
        console.error(`[Staff Homepage] Update failed: ${status.error || 'Unknown error'}`);
        return;
      }
      
      // Continue checking if still processing
      if (status.status === 'processing' && checkCount < maxChecks) {
        checkCount++;
        setTimeout(checkStatus, checkInterval);
      }
      
    } catch (error) {
      console.log('[Staff Homepage] Error checking job status:', error);
    }
  };
  
  // Start checking after a short delay
  setTimeout(checkStatus, 5000);
}

// Keep the old function for backward compatibility
async function monitorToggleJobStatus(jobId, fieldName) {
  const fieldLabel = fieldName === 'field_3646' ? 'Academic Profile' :
                    fieldName === 'field_3647' ? 'Productivity Hub' :
                    fieldName === 'field_3579' ? 'AI Coach' : 'feature';
  return monitorToggleJobStatusSilently(jobId, fieldName, fieldLabel);
}

// Fallback function for client-side updates (original implementation)
async function updateConnectedStudentTogglesFallback(schoolId, fieldName, value) {
  if (!schoolId) {
    console.warn('[Staff Homepage] No school ID provided for student updates');
    return;
  }
  
  try {
    console.log(`[Staff Homepage] Using fallback client-side update`);
    // Remove any loading indicators that might be stuck
    KnackAPIQueue.hideLoadingIndicator();
    
    // Find all Object_3 records connected by field_122 (school connection)
    const filters = encodeURIComponent(JSON.stringify({
      match: 'and',
      rules: [
        { field: 'field_122', operator: 'is', value: schoolId }
      ]
    }));
    
    const response = await retryApiCall(() => {
      return KnackAPIQueue.addRequest({
        url: `${KNACK_API_URL}/objects/object_3/records?filters=${filters}`,
        type: 'GET',
        headers: getKnackHeaders(),
        data: { format: 'raw' }
      });
    });
    
    if (response && response.records && response.records.length > 0) {
      console.log(`[Staff Homepage] Found ${response.records.length} connected student accounts to update`);
      
      // Batch process in smaller chunks to avoid overwhelming the API
      const batchSize = 10;
      const batches = [];
      
      for (let i = 0; i < response.records.length; i += batchSize) {
        batches.push(response.records.slice(i, i + batchSize));
      }
      
      console.log(`[Staff Homepage] Processing ${batches.length} batches of ${batchSize} records`);
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const updateData = {};
        updateData[fieldName] = value;
        
        const updatePromises = batch.map(record => {
          return retryApiCall(() => {
            return KnackAPIQueue.addRequest({
              url: `${KNACK_API_URL}/objects/object_3/records/${record.id}`,
              type: 'PUT',
              headers: getKnackHeaders(),
              data: JSON.stringify(updateData)
            });
          });
        });
        
        await Promise.all(updatePromises);
        console.log(`[Staff Homepage] Completed batch ${i + 1} of ${batches.length}`);
        
        // Add delay between batches to avoid rate limiting
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      console.log(`[Staff Homepage] Successfully updated ${response.records.length} student accounts`);
      showNotification(`Successfully updated ${response.records.length} student accounts`, 'success');
      
    } else {
      console.log(`[Staff Homepage] No connected student accounts found`);
      showNotification('No student accounts found to update', 'info');
    }
    
  } catch (error) {
    console.error('[Staff Homepage] Error updating connected student accounts:', error);
    showNotification('Failed to update student accounts. Please try again.', 'error');
    throw error;
  }
}

// Set up logo controls for admin users
function setupLogoControls(schoolId) {
  // Get modal elements
  const modal = document.getElementById('logo-modal');
  const closeBtn = document.querySelector('.vespa-modal-close');
  const logoInput = document.getElementById('logo-url-input');
  const logoPreview = document.getElementById('logo-preview');
  const saveBtn = document.getElementById('logo-save-btn');
  const resetBtn = document.getElementById('logo-reset-btn');
  const cancelBtn = document.getElementById('logo-cancel-btn');
  const setLogoBtn = document.getElementById('admin-set-logo-btn');
  
  // Default VESPA logo
  const defaultVespaLogo = "https://www.vespa.academy/assets/images/full-trimmed-transparent-customcolor-1-832x947.png";
  
  // Show modal when Set Logo button is clicked
  if (setLogoBtn) {
    setLogoBtn.addEventListener('click', async function() {
      // Get current logo URL from school record
      try {
        const schoolRecord = await getSchoolRecord(schoolId);
        console.log('[Staff Homepage] Setting up logo modal with school record:', JSON.stringify({
          id: schoolRecord?.id,
          field_3206: schoolRecord?.field_3206
        }));
        
        if (schoolRecord && schoolRecord.field_3206) {
          // Make sure we're getting a string, not an object
          const logoUrlValue = typeof schoolRecord.field_3206 === 'string' 
            ? schoolRecord.field_3206 
            : '';
          
          console.log('[Staff Homepage] Current logo URL from field_3206:', logoUrlValue);
          
          logoInput.value = logoUrlValue;
          logoPreview.src = logoUrlValue || defaultVespaLogo;
        } else {
          logoInput.value = '';
          logoPreview.src = defaultVespaLogo;
        }
      } catch (error) {
        console.error('[Staff Homepage] Error getting current logo:', error);
        logoInput.value = '';
        logoPreview.src = defaultVespaLogo;
      }
      
      // Show modal
      modal.style.display = 'block';
    });
  }
  
  // Close modal when X is clicked
  if (closeBtn) {
    closeBtn.addEventListener('click', function() {
      modal.style.display = 'none';
    });
  }
  
  // Close modal when clicking outside
  window.addEventListener('click', function(event) {
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  });
  
  // Update preview when URL is entered
  if (logoInput) {
    logoInput.addEventListener('input', function() {
      const url = logoInput.value.trim();
      if (url && isValidImageUrl(url)) {
        logoPreview.src = url;
      } else {
        logoPreview.src = defaultVespaLogo;
      }
    });
  }
  
  // Reset to default logo
  if (resetBtn) {
    resetBtn.addEventListener('click', async function() {
      try {
        // Update school record with empty logo URL
        await updateSchoolLogo(schoolId, '');
        
        // Show success message
        alert('School logo has been reset to default VESPA logo.');
        
        // Close modal and refresh page
        modal.style.display = 'none';
        
        // Log change for debugging
        console.log('[Staff Homepage] Logo reset to default. Reloading page for changes to take effect.');
        
        // Clear preview as visual feedback before reload 
        logoPreview.src = defaultVespaLogo;
        
        // Give time for console message to be shown, then reload
        setTimeout(() => location.reload(), 500);
      } catch (error) {
        console.error('[Staff Homepage] Error resetting logo:', error);
        alert('Error resetting logo. Please try again.');
      }
    });
  }
  
  // Cancel button closes modal without saving
  if (cancelBtn) {
    cancelBtn.addEventListener('click', function() {
      modal.style.display = 'none';
    });
  }
  
  // Save new logo URL
  if (saveBtn) {
    saveBtn.addEventListener('click', async function() {
      const url = logoInput.value.trim();
      
      // Validate URL
      if (!url || !isValidImageUrl(url)) {
        alert('Please enter a valid image URL (must start with http:// or https:// and end with an image extension like .jpg, .png, .gif, etc.)');
        return;
      }
      
      // Save URL to school record
      try {
        await updateSchoolLogo(schoolId, url);
        
        // Show success message
        alert('School logo has been updated successfully.');
        
        // Close modal and refresh page
        modal.style.display = 'none';
        
        // Log change for debugging
        console.log('[Staff Homepage] Logo updated to: ' + url + '. Reloading page for changes to take effect.');
        
        // Give time for console message to be shown, then reload
        setTimeout(() => location.reload(), 500);
      } catch (error) {
        console.error('[Staff Homepage] Error saving logo:', error);
        alert('Error saving logo. Please try again.');
      }
    });
  }
}

// Validate if URL is a valid image URL
function isValidImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  if (!url.startsWith('http')) return false;
  
  // Check for common image extensions
  const hasImageExtension = /\.(jpg|jpeg|png|gif|svg|webp|bmp)(\?.*)?$/i.test(url);
  
  // Also check for image paths in URLs (might not have extensions in some CDNs)
  const hasImagePath = url.includes('/image/') || 
                       url.includes('/logo/') || 
                       url.includes('/images/') || 
                       url.includes('/logos/');
                       
  return hasImageExtension || hasImagePath;
}

// Update school logo URL in Knack
async function updateSchoolLogo(schoolId, logoUrl) {
  if (!schoolId) {
    throw new Error('School ID is required to update logo');
  }
  
  try {
    // Update the school record field_3206 with the new logo URL
    const response = await retryApiCall(() => {
      return KnackAPIQueue.addRequest({
        url: `${KNACK_API_URL}/objects/object_2/records/${schoolId}`,
        type: 'PUT',
        headers: getKnackHeaders(),
        data: JSON.stringify({
          field_3206: logoUrl
        })
      });
    });
    
    console.log('[Staff Homepage] Successfully updated school logo:', response);
    
    // Invalidate any cached logos for this school
    const cacheKey = `SchoolLogo_${schoolId}`;
    await CacheManager.invalidate(cacheKey, 'SchoolLogo');
    
    // Also invalidate general school record cache if it exists
    await CacheManager.invalidate(`school_${schoolId}`, 'SchoolRecord');
    
    // Force reload to ensure all cached data is refreshed
    console.log('[Staff Homepage] Cache invalidated, changes will appear on page reload');
    
    return response;
  } catch (error) {
    console.error('[Staff Homepage] Error updating school logo:', error);
    throw error;
  }
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
  background: linear-gradient(135deg, #0a2b8c 0%, #061a54 100%);
  line-height: 1.4;
  overflow: hidden; /* Changed from overflow-x to prevent border overflow */
  border: 3px solid #00e5db;
  border-radius: 12px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
}

/* Top row layout containing profile and dashboard */
.top-row {
  display: flex;
  flex-direction: row;
  gap: 20px;
  margin-bottom: 20px;
  align-items: stretch; /* Make heights equal */
  min-height: 320px; /* Reduced height to fit desktop window */
}

/* Profile container takes 30% width */
.profile-container {
  flex: 1;
  max-width: 30%;
  display: flex;
  flex-direction: column;
}

/* Dashboard container takes 70% width */
.dashboard-container {
  flex: 2.5;
  display: flex;
  flex-direction: column;
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
  background: linear-gradient(135deg, #132c7a 0%, #0d2274 100%);
  border-radius: 10px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
  padding: 22px;
  margin-bottom: 26px;
  animation: fadeIn 0.5s ease-out forwards;
  transition: transform 0.2s, box-shadow 0.2s;
  border: 2px solid #00e5db;
  backdrop-filter: blur(5px);
  position: relative;
  overflow: hidden;
  height: auto; /* Changed from fixed height to auto */
  display: flex;
  flex-direction: column;
}

/* Create a subtle gradient overlay for top section edge */
.vespa-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 5px;
  background: linear-gradient(to right, #00e5db, #061a54);
  opacity: 0.7;
  z-index: 2;
}

/* Section background pattern overlay */
.vespa-section::after {
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

/* Profile section - updated to match cycle section border styling */
.profile-section {
  border-left: 4px solid #e59437;
  box-shadow: 0 4px 12px rgba(229, 148, 55, 0.2), 0 6px 16px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  height: 100%;
  box-sizing: border-box;
  position: relative;
  padding: 16px;
  border: 2px solid #00e5db;
  border-radius: 10px;
  overflow: hidden;
}

/* Eliminate the background color issues that create the blue rectangle */
.profile-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 5px;
  background: linear-gradient(to right, #00e5db, #061a54);
  opacity: 0.7;
  z-index: 2;
  width: 100%;
}

.dashboard-section {
  border-left: 4px solid #86b4f0;
  box-shadow: 0 4px 12px rgba(134, 180, 240, 0.2), 0 6px 16px rgba(0, 0, 0, 0.4);
  height: 100%; /* Fill the container height */
  display: flex;
  flex-direction: column;
}

/* Styling for MY GROUP section */
.group-resources-container section:first-child {
  border-left: 4px solid #72cb44;
  box-shadow: 0 4px 12px rgba(114, 203, 68, 0.2), 0 6px 16px rgba(0, 0, 0, 0.4);
}

/* Styling for MYRESOURCES section */
.group-resources-container section:last-child {
  border-left: 4px solid #7f31a4;
  box-shadow: 0 4px 12px rgba(127, 49, 164, 0.2), 0 6px 16px rgba(0, 0, 0, 0.4);
}

/* Styling for MANAGE ACCOUNT section */
.vespa-section:last-child:not(.dashboard-section):not(.profile-section):not(.group-resources-container section) {
  border-left: 4px solid #ff6b6b;
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.2), 0 6px 16px rgba(0, 0, 0, 0.4);
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
  border-bottom: 2px solid #00e5db;
  text-transform: uppercase;
  letter-spacing: 1px;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

/* Profile info container - ensure proper spacing */
.profile-info {
  display: flex;
  flex: 1;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* Profile details - match the appearance of cycle sections */
.profile-details {
  flex: 1;
  min-width: 250px;
  display: flex;
  flex-direction: column;
  padding: 20px;
  background: linear-gradient(135deg, #15348e 0%, #102983 100%);
  border-radius: 10px;
  border: 1px solid #00e5db;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  margin: 0;
  min-height: calc(100% - 40px);
}

/* Logo and toggles container - responsive grid */
.logo-toggles-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  align-items: start;
  margin-bottom: 15px;
}

.logo-container {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.toggles-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
}

.school-logo {
  max-width: 80px;
  max-height: 80px;
  width: auto;
  height: auto;
  margin-bottom: 10px;
  align-self: center;
  border-radius: 5px;
  padding: 4px;
  background: rgba(255, 255, 255, 0.1);
  object-fit: contain;
}

.logo-controls {
  margin-top: 8px;
}

/* Feature Toggle Switches */
.feature-toggles {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.toggle-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  font-size: 12px;
  color: #ffffff;
}

.toggle-label {
  flex: 1;
  text-align: left;
  font-weight: 500;
}

/* Toggle Switch Styling */
.toggle-switch {
  position: relative;
  width: 36px;
  height: 20px;
  background-color: #ccc;
  border-radius: 20px;
  cursor: pointer;
  transition: background-color 0.3s;
  margin-left: 8px;
}

.toggle-switch.active {
  background-color: #00e5db;
}

.toggle-slider {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  background-color: white;
  border-radius: 50%;
  transition: transform 0.3s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.toggle-switch.active .toggle-slider {
  transform: translateX(16px);
}

.toggle-switch:hover {
  box-shadow: 0 0 8px rgba(0, 229, 219, 0.3);
}

.logo-button {
  background-color: #00e5db;
  color: #0a2b8c;
  border: none;
  border-radius: 4px;
  padding: 6px 10px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s ease; /* Smoother transition to prevent flickering */
  transform: translateZ(0); /* Hardware acceleration */
  will-change: transform; /* Optimizes animations */
}

.logo-button:hover {
  background-color: #ffffff;
  transform: translateY(-2px);
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

/* Dashboard button styling */
.profile-item:last-child {
  margin-top: auto;
  margin-bottom: 0;
}

.profile-label {
  font-weight: 600;
  color: #00e5db;
  margin-right: 8px;
}

.dashboard-button {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #00e5db;
  color: #0a2b8c;
  padding: 10px 16px;
  border-radius: 6px;
  text-decoration: none;
  transition: all 0.3s ease; /* Smoother transition to prevent flickering */
  font-weight: bold;
  letter-spacing: 0.5px;
  transform: translateZ(0); /* Hardware acceleration */
  will-change: transform; /* Optimizes animations */
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
  gap: 20px;
  margin-bottom: 20px;
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
  background: linear-gradient(135deg, #15348e 0%, #102983 100%);
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  transition: transform 0.3s ease, box-shadow 0.3s ease; /* Smoother transitions */
  animation: fadeIn 0.5s ease-out forwards;
  border: 1px solid #00e5db;
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 1;
  transform: translateZ(0); /* Hardware acceleration */
  will-change: transform; /* Optimizes animations */
}

/* Subtle accent in the corners of app cards */
.app-card::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 20px;
  height: 20px;
  background: radial-gradient(circle at top right, rgba(0, 229, 219, 0.25), transparent 70%);
  z-index: 1;
}

.app-card::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 20px;
  height: 20px;
  background: radial-gradient(circle at bottom left, rgba(0, 229, 219, 0.18), transparent 70%);
  z-index: 1;
}

/* Different card styles for each section type */
.group-resources-container section:first-child .app-card {
  border-top: 3px solid #72cb44;
}

.group-resources-container section:last-child .app-card {
  border-top: 3px solid #7f31a4;
}

/* Manage Account section cards */
.vespa-section:last-child:not(.dashboard-section):not(.profile-section):not(.group-resources-container section) .app-card {
  border-top: 3px solid #ff6b6b;
}

.app-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
  animation: pulseGlow 2s infinite;
}

.app-card-header {
  background: linear-gradient(135deg, #0a2b8c 0%, #061a54 100%);
  padding: 18px;
  text-align: center;
  position: relative;
  border-bottom: 2px solid #00e5db;
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
  color: #00e5db;
  transition: transform 0.3s ease, color 0.3s ease; /* Smoother transition */
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
  transition: transform 0.3s ease; /* Smoother transition */
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
  background-color: #00e5db;
  color: #0a2b8c;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease; /* Smoother transition */
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
  transition: all 0.3s ease; /* Smoother transition */
  border: 2px solid #00e5db;
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
  background-color: #00e5db;
  color: #0a2b8c;
  text-align: center;
  padding: 14px;
  text-decoration: none;
  font-weight: 600;
  transition: all 0.3s ease; /* Smoother transition */
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
  flex-direction: column;
  gap: 16px;
}

.chart-wrapper {
  flex: 1;
  min-width: 300px;
  background: linear-gradient(135deg, #15348e 0%, #102983 100%);
  border-radius: 10px;
  padding: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  border: 1px solid #00e5db;
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
  margin-bottom: 12px;
}

canvas {
  width: 100% !important;
  height: 230px !important; /* Increased height for better data visibility */
}

.no-results {
  padding: 30px;
  text-align: center;
  color: #cccccc;
  font-style: italic;
}

/* Trend indicator styles */
.trend-positive {
  color: #4ade80;
  font-weight: bold;
}

.trend-negative {
  color: #f87171;
  font-weight: bold;
}

/* Chart loading styles */
.chart-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 220px;
  color: #cccccc;
}

.chart-loading-spinner {
  width: 40px;
  height: 40px;
  margin-bottom: 10px;
  border: 3px solid rgba(0, 229, 219, 0.3);
  border-top: 3px solid #00e5db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.chart-error {
  padding: 30px;
  text-align: center;
  color: #f87171;
  font-style: italic;
}

/* Cycle Section Styles - MORE COMPACT VERSION */
.cycle-section-container {
  margin-top: 16px;
}

/* Match the border styling with cycles */
.cycle-section {
  background: linear-gradient(135deg, #15348e 0%, #102983 100%);
  border-radius: 10px;
  padding: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  border: 1px solid #00e5db;
}

.cycle-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px; /* Reduced from 20px */
}

.cycle-section-title {
  font-size: 16px; /* Reduced from 18px */
  color: #ffffff !important;
  margin: 0;
  font-weight: 600;
}

.cycle-actions {
  display: flex;
  gap: 8px; /* Reduced from 10px */
}

.cycle-refresh-button,
.cycle-admin-button {
  background-color: #00e5db;
  color: #0a2b8c;
  border: none;
  border-radius: 5px;
  padding: 6px 10px; /* Reduced from 8px 12px */
  font-size: 12px; /* Reduced from 14px */
  cursor: pointer;
  transition: all 0.3s ease; /* Smoother transition to prevent flickering */
  display: flex;
  align-items: center;
  gap: 5px;
  font-weight: 500;
  text-decoration: none;
  transform: translateZ(0); /* Hardware acceleration */
  will-change: transform; /* Optimizes animations */
}

.cycle-refresh-button:hover,
.cycle-admin-button:hover {
  background-color: white;
  transform: translateY(-2px);
}

.cycle-columns {
  display: flex;
  justify-content: space-between;
  gap: 6px; /* Reduced from 15px */
}

.cycle-column {
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px; /* Reduced from 8px */
  padding: 8px; /* Reduced from 15px */
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.2s ease; /* Smoother transition */
}

.cycle-column:hover {
  background: rgba(255, 255, 255, 0.1);
}

.current-cycle {
  border: 2px solid #00e5db;
  background: rgba(0, 229, 219, 0.1);
}

.cycle-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px; /* Reduced from 12px */
  position: relative;
}

.cycle-header h4 {
  margin: 0;
  color: white;
  font-size: 14px; /* Reduced from 16px */
  font-weight: 600;
}

.current-badge {
  background-color: #00e5db;
  color: #0a2b8c;
  font-size: 10px; /* Reduced from 12px */
  padding: 2px 6px; /* Reduced from 3px 8px */
  border-radius: 10px;
  font-weight: bold;
}

.cycle-dates {
  display: flex;
  flex-direction: column;
  gap: 4px; /* Reduced from 8px */
}

.cycle-date {
  display: flex;
  justify-content: space-between;
  font-size: 12px; /* Reduced from 14px */
}

.date-label {
  color: #00e5db;
  font-weight: 500;
}

.date-value {
  color: white;
}

.no-cycles {
  padding: 12px; /* Reduced from 20px */
  text-align: center;
  color: #cccccc;
  font-style: italic;
}

/* Modal Styles */
.vespa-modal {
  display: none;
  position: fixed;
  z-index: 1000;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
}

.vespa-modal-content {
  background: linear-gradient(135deg, #132c7a 0%, #0d2274 100%);
  margin: 5% auto; /* Reduced from 10% to show more content */
  padding: 25px 25px 60px 25px; /* Increased bottom padding */
  border: 2px solid #00e5db;
  border-radius: 10px;
  width: 80%;
  max-width: 500px;
  color: #ffffff;
  position: relative;
  animation: modalFadeIn 0.3s;
  max-height: 80vh; /* Maximum height */
  overflow-y: auto; /* Enable scrolling */
}


@keyframes modalFadeIn {
  from {opacity: 0; transform: translateY(-20px);}
  to {opacity: 1; transform: translateY(0);}
}

.vespa-modal-close {
  color: #00e5db;
  float: right;
  font-size: 28px;
  font-weight: bold;
  cursor: pointer;
}

.vespa-modal-close:hover {
  color: #ffffff;
}

.vespa-modal input {
  width: 100%;
  padding: 10px;
  margin: 10px 0;
  border-radius: 5px;
  border: 1px solid #00e5db;
  background-color: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.logo-preview-container {
  margin: 15px 0;
  text-align: center;
}

#logo-preview {
  max-width: 100px;
  max-height: 100px;
  background: rgba(255, 255, 255, 0.1);
  padding: 5px;
  border-radius: 5px;
}

.vespa-modal-buttons {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
}

.vespa-btn {
  padding: 8px 16px;
  border-radius: 5px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.3s ease;
  border: none;
  margin-bottom: 5px; /* Add some bottom margin */
}

.vespa-btn-primary {
  background-color: #00e5db;
  color: #0a2b8c;
}

.vespa-btn-primary:hover {
  background-color: #ffffff;
  transform: translateY(-2px);
}

.vespa-btn-secondary {
  background-color: #ff6b6b;
  color: #ffffff;
}

.vespa-btn-neutral {
  background-color: rgba(255, 255, 255, 0.2);
  color: #ffffff;
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
  
  /* Stack logo and toggles vertically on mobile */
  .logo-toggles-container {
    grid-template-columns: 1fr;
    gap: 15px;
  }
  
  .toggles-container {
    align-items: center;
  }
  
  /* Charts take full width on mobile */
  .chart-wrapper {
    min-width: 100%;
  }
  
  /* Responsive adjustments for cycle section */
  .cycle-section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .cycle-actions {
    width: 100%;
    justify-content: flex-start;
  }
  
  .cycle-columns {
    flex-direction: column;
  }
  
  .cycle-column {
    margin-bottom: 8px; /* Reduced from 10px */
  }
}

/* Global API Loading Indicator */
.api-loading-indicator {
  position: fixed;
  top: 10px;
  right: 10px;
  background: rgba(0, 40, 100, 0.9);
  color: white;
  padding: 10px 15px;
  border-radius: 6px;
  border: 1px solid #00e5db;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
  display: none;
  align-items: center;
  z-index: 10000;
  font-size: 14px;
  transition: opacity 0.3s;
}

.api-loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(0, 229, 219, 0.3);
  border-top: 2px solid #00e5db;
  border-radius: 50%;
  margin-right: 10px;
  animation: spin 1s linear infinite;
}

/* Welcome Banner Styles */
.welcome-banner {
  background: linear-gradient(135deg, #15348e 0%, #102983 100%);
  color: white;
  padding: 15px 20px;
  margin-bottom: 20px;
  border-radius: 8px;
  position: relative;
  border: 2px solid #00e5db;
  animation: fadeIn 0.5s ease-out;
}

.banner-content {
  padding-right: 30px;
}

.banner-close {
  position: absolute;
  top: 10px;
  right: 10px;
  background: none;
  border: none;
  color: #00e5db;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

/* Feedback Button & Form */
.feedback-button {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: #00e5db;
  color: #0a2b8c;
  border: none;
  border-radius: 50px;
  padding: 12px 20px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
  z-index: 9999;
  transition: all 0.3s ease;
}

.feedback-button i {
  margin-right: 8px;
}

.feedback-button:hover {
  background: white;
  transform: translateY(-3px);
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.3);
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 600;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 10px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
  position: sticky; /* Makes button stay visible */
  bottom: 15px; /* Distance from bottom */
  background: inherit; /* Inherit parent's background */
  padding: 10px 0;
}

/* Enhanced Feedback Form Styles */
.form-group select {
  width: 100%;
  padding: 10px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.1);
  color: white;
  margin-bottom: 12px;
}

.form-group select option {
  background-color: #132c7a;
  color: white;
}

#feedback-type, #feedback-priority, #feedback-category {
  border-color: #00e5db;
}

/* Priority colors for visual feedback */
#feedback-priority option[value="Low"] {
  background-color: #5cb85c;
}
#feedback-priority option[value="Medium"] {
  background-color: #f0ad4e;
}
#feedback-priority option[value="High"] {
  background-color: #d9534f;
}
#feedback-priority option[value="Critical"] {
  background-color: #d43f3a;
}

/* Screenshot upload styling */
#screenshot-preview {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 10px;
  text-align: center;
  margin-top: 10px;
}

#screenshot-image {
  max-width: 100%;
  max-height: 200px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  margin-bottom: 8px;
}

#remove-screenshot {
  background-color: #ff6b6b;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 5px 10px;
  font-size: 12px;
  cursor: pointer;
}

#remove-screenshot:hover {
  background-color: #ff5252;
}

/* File input styling */
#feedback-screenshot {
  background: rgba(255, 255, 255, 0.1);
  width: 100%;
  padding: 10px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
}

/* Student Emulator Modal Styles */
.emulator-modal-content {
  width: 95% !important;
  max-width: 1200px !important;
  height: 90vh !important;
  max-height: 90vh !important;
  margin: 2.5% auto !important;
  padding: 0 !important;
  display: flex;
  flex-direction: column;
}

.emulator-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 2px solid #00e5db;
  background: linear-gradient(135deg, #0a2b8c 0%, #061a54 100%);
  border-radius: 10px 10px 0 0;
}

.emulator-header h3 {
  margin: 0;
  color: #ffffff;
  font-size: 18px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.emulator-header i {
  color: #00e5db;
}

.emulator-notice {
  background: #ffa726;
  padding: 10px 15px;
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid rgba(0,0,0,0.1);
}

.emulator-notice i {
  color: #fff;
  font-size: 20px;
  flex-shrink: 0;
}

.emulator-notice div {
  color: #fff;
  flex: 1;
  font-size: 14px;
  line-height: 1.4;
}

.emulator-body {
  flex: 1;
  position: relative;
  overflow: hidden;
  border-radius: 0 0 10px 10px;
}

#student-emulator-iframe {
  width: 100%;
  height: 100%;
  border: none;
  border-radius: 0 0 10px 10px;
}

/* Mobile responsive adjustments for emulator */
@media (max-width: 768px) {
  .emulator-modal-content {
    width: 98% !important;
    height: 95vh !important;
    margin: 1% auto !important;
  }
  
  .emulator-header h3 {
    font-size: 16px;
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

// Add cache status indicator if cache is disabled
const cacheStatusIndicator = CacheManager.isCacheDisabled() ? `
<div id="cache-disabled-indicator" style="position: fixed; top: 10px; right: 10px; background: #ff9800; color: white; padding: 8px 15px; border-radius: 5px; z-index: 9999; display: flex; align-items: center; gap: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.2);">
  <i class="fas fa-exclamation-triangle"></i>
  <div>
    <strong>Cache Disabled</strong>
    <div style="font-size: 12px;">Loading fresh data on each request</div>
  </div>
</div>` : '';

// Add loading indicator HTML to the document
const loadingIndicator = `
<div id="api-loading-indicator" class="api-loading-indicator">
  <div class="api-loading-spinner"></div>
  <div class="api-loading-text">
    <span class="requests-text">Processing requests...</span>
    <span class="queue-count"></span>
  </div>
</div>`;

// Welcome banner removed - going live for all users
const welcomeBanner = ``;

// Student Emulator Modal HTML
const studentEmulatorModal = `
<div id="student-emulator-modal" class="vespa-modal">
  <div class="vespa-modal-content emulator-modal-content">
    <div class="emulator-header">
      <h3><i class="fas fa-user-graduate"></i> Student Experience Mode</h3>
      <span class="vespa-modal-close" id="emulator-modal-close">&times;</span>
    </div>
    <div class="emulator-notice" style="background: #ffa726; padding: 10px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
      <i class="fas fa-info-circle" style="color: #fff; font-size: 20px;"></i>
      <div style="color: #fff; flex: 1; min-width: 250px;">
        <strong>This report shows a Level 3 (A-Level) student.</strong> 
        <span style="margin-left: 10px;">To view a Level 2 Student (GCSE):</span>
      </div>
      <button id="level-switcher-btn" class="level-switch-btn" style="background: #fff; color: #ffa726; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold; min-width: 120px;">
        Switch to Level 2
      </button>
    </div>
    <div class="emulator-body">
      <iframe id="student-emulator-iframe" 
              src="https://vespaacademy.knack.com/vespa-academy?student_emulator=true#landing-page/" 
              frameborder="0">
      </iframe>
    </div>
  </div>
</div>`;

// Enhanced feedback button and modal HTML
const feedbackSystem = `
<button id="feedback-button" class="feedback-button">
  <i class="fas fa-comment-alt"></i>
  Support & Feedback
</button>

<div id="feedback-modal" class="vespa-modal">
  <div class="vespa-modal-content">
    <span class="vespa-modal-close" id="feedback-modal-close">&times;</span>
    <h3>VESPA Academy Support / Contact Us</h3>
    <form id="feedback-form">
      <div class="form-group">
        <label for="feedback-name">Your Name</label>
        <input type="text" id="feedback-name" required>
      </div>
      <div class="form-group">
        <label for="feedback-email">Your Email</label>
        <input type="email" id="feedback-email" required>
      </div>
      <div class="form-group">
        <label for="feedback-type">Request Type</label>
        <select id="feedback-type" required>
          <option value="">Please select...</option>
          <option value="Support Request">Support Request</option>
          <option value="Feature Request">Feature Request</option>
          <option value="Bug Report">Bug Report</option>
          <option value="General Feedback">General Feedback</option>
          <option value="Question">Question</option>
        </select>
      </div>
      <div class="form-group">
        <label for="feedback-priority">Priority Level</label>
        <select id="feedback-priority" required>
          <option value="">Please select...</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
          <option value="Critical">Critical</option>
        </select>
      </div>
      <div class="form-group">
        <label for="feedback-category">Category</label>
        <select id="feedback-category" required>
          <option value="">Please select...</option>
          <option value="User Interface">User Interface</option>
          <option value="Data/Results">Data/Results</option>
          <option value="Performance">Performance</option>
          <option value="Account Access">Account Access</option>
          <option value="Documentation">Documentation</option>
          <option value="Other">Other</option>
        </select>
      </div>
      <div class="form-group">
        <label for="feedback-message">Description</label>
        <textarea id="feedback-message" rows="5" required></textarea>
      </div>
      <div class="form-group">
        <label for="feedback-context">Additional Context (optional)</label>
        <textarea id="feedback-context" rows="3" placeholder="Browser details, steps to reproduce, etc."></textarea>
      </div>
      <div class="form-group">
  <label for="feedback-screenshot">Screenshot (optional)</label>
  <input type="file" id="feedback-screenshot" accept="image/*">
  <div id="screenshot-preview" style="display:none; margin-top:10px;">
    <img id="screenshot-image" style="max-width:100%; max-height:200px; border:1px solid #ccc;">
    <button type="button" id="remove-screenshot" class="vespa-btn vespa-btn-secondary" style="margin-top:5px;">Remove</button>
  </div>
</div>
      <div class="form-actions">
        <button type="submit" class="vespa-btn vespa-btn-primary">Submit Request</button>
      </div>
    </form>
    <div id="feedback-success" style="display:none;">
      <p>Thank you for your feedback! Your request has been submitted successfully.</p>
      <p>A confirmation has been sent to your email address.</p>
    </div>
  </div>
</div>`;

// Add Font Awesome for professional icons
const fontAwesomeLink = document.createElement('link');
fontAwesomeLink.rel = 'stylesheet';
fontAwesomeLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
document.head.appendChild(fontAwesomeLink);

// Clear the container
container.innerHTML = '';

// Show universal loading screen
if (window.VespaLoadingScreen) {
  window.VespaLoadingScreen.showForPageLoad('scene_1215');
} else {
  // Fallback loading indicator
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
}

try {
  // Update loading progress
  if (window.VespaLoadingScreen && window.VespaLoadingScreen.isActive()) {
    window.VespaLoadingScreen.updateProgress('Loading your profile...');
  }
  
  // Get staff profile data
  const profileData = await getStaffProfileData();
  if (!profileData) {
    // Hide loading screen on error
    if (window.VespaLoadingScreen && window.VespaLoadingScreen.isActive()) {
      window.VespaLoadingScreen.hide();
    }
    
    container.innerHTML = `
      <div style="padding: 30px; text-align: center; color: ${THEME.ACCENT}; background-color: ${THEME.PRIMARY}; border-radius: 8px; border: 2px solid ${THEME.ACCENT}; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);">
        <h3>Error Loading Staff Homepage</h3>
        <p style="color: #ffffff;">Unable to load your staff profile. Please try refreshing the page.</p>
        <button onclick="location.reload()" style="margin-top: 15px; background-color: ${THEME.ACCENT}; color: ${THEME.PRIMARY}; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold;">Refresh Page</button>
      </div>
    `;
    return;
  }
  
  // Initialize student emulation setup if module is loaded
  // NOW WORKS FOR ALL STAFF INCLUDING STAFF ADMINS!
  const skipEmulation = false;  // FIXED: Never skip - works for all staff roles now
  console.log('[Staff Homepage - DEBUG] Skip student emulation for Staff Admin?', skipEmulation, '(Always false - emulation works for all roles)');
  
  if (window.StaffStudentEmulationSetup && profileData.email && !skipEmulation) {
    console.log('[Staff Homepage] Initializing student emulation setup for all staff users (including admins)...');
    
    try {
      const emulationResult = await window.StaffStudentEmulationSetup.setup(
        profileData.email,
        profileData.userId,
        profileData  // Pass the entire profileData object
      );
      
      if (emulationResult.success) {
        console.log('[Staff Homepage] Student emulation setup completed:', emulationResult.message);
        
        // Optionally refresh profile data if roles were updated
        if (emulationResult.message !== 'User already has Student role') {
          // Re-fetch profile data to get updated roles
          const updatedProfile = await getStaffProfileData();
          if (updatedProfile) {
            profileData.roles = updatedProfile.roles;
          }
        }
      } else {
        console.error('[Staff Homepage] Student emulation setup failed:', emulationResult.error);
      }
    } catch (setupError) {
      console.error('[Staff Homepage] Error during student emulation setup:', setupError);
      // Continue with homepage rendering even if setup fails
    }
  }
  
  // Check if user is a staff admin
  const hasAdminRole = isStaffAdmin(profileData.roles);
  console.log(`[Staff Homepage - DEBUG] User ${profileData.name} has roles: ${JSON.stringify(profileData.roles)}`);
  console.log(`[Staff Homepage - DEBUG] Has Admin Role: ${hasAdminRole}`);
  console.log(`[Staff Homepage - DEBUG] School ID: ${profileData.schoolId}`);
  console.log(`[Staff Homepage - DEBUG] User Email: ${profileData.email}`);
  
  // Update loading progress
  if (window.VespaLoadingScreen && window.VespaLoadingScreen.isActive()) {
    window.VespaLoadingScreen.updateProgress('Loading VESPA data...');
  }
  
  console.log('[Staff Homepage - DEBUG] About to fetch VESPA data...');
  const [schoolResults, staffResults, cycleData, nationalData] = await Promise.all([
    getSchoolVESPAResults(profileData.schoolId),
    profileData.email ? getStaffVESPAResults(profileData.email, profileData.schoolId, profileData.roles) : null,
    profileData.userId ? getQuestionnaireCycleData(profileData.userId, profileData.schoolId) : null,
    getNationalBenchmarkData() // Fetch national benchmark data
  ]);
  
  console.log('[Staff Homepage - DEBUG] VESPA Data Fetched:');
  console.log('[Staff Homepage - DEBUG] - schoolResults:', schoolResults ? `Found ${schoolResults.count} students` : 'NULL');
  console.log('[Staff Homepage - DEBUG] - staffResults:', staffResults ? `Found ${staffResults.count} students` : 'NULL');
  console.log('[Staff Homepage - DEBUG] - cycleData:', cycleData ? 'Available' : 'NULL');
  console.log('[Staff Homepage - DEBUG] - nationalData:', nationalData ? 'Available' : 'NULL');
  
  // Build the homepage HTML with updated layout
  const homepageHTML = `
    <div id="staff-homepage">
    ${welcomeBanner}
    ${cacheStatusIndicator}
    <div>
    <div class="top-row">
        <div class="profile-container">
          ${renderProfileSection(profileData, hasAdminRole)}
        </div>
        <div class="dashboard-container">
          ${renderVESPADashboard(schoolResults, staffResults, hasAdminRole, cycleData)}
        </div>
      </div>
      <div class="group-resources-container">
        ${renderGroupSection(hasAdminRole)}
        ${renderResourcesSection()}
      </div>
      ${hasAdminRole ? renderAdminSection() : '<!-- Management section not shown: user does not have Staff Admin role -->'} 
    </div>
  `;

  // Add loading indicator, student emulator, and feedback button to the body
document.body.insertAdjacentHTML('beforeend', loadingIndicator);
document.body.insertAdjacentHTML('beforeend', studentEmulatorModal);
document.body.insertAdjacentHTML('beforeend', feedbackSystem);
  
  // Add the CSS
  const styleElement = document.createElement('style');
  styleElement.textContent = getStyleCSS();
  
  // Add scene-level CSS overrides if we're in scene-level mode
  const isSceneLevel = container.id.startsWith('scene-level-container') || 
                      container.classList.contains('scene-level-dashboard-container');
  
  if (isSceneLevel) {
    const overrideStyleId = 'staff-homepage-scene-level-overrides';
    if (!document.getElementById(overrideStyleId)) {
      const overrideStyle = document.createElement('style');
      overrideStyle.id = overrideStyleId;
      overrideStyle.textContent = `
        /* Scene-level overrides for full-width display */
        #staff-homepage {
          max-width: none !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 20px !important;
          box-sizing: border-box !important;
        }
        
        /* Ensure top-row container is full width */
        #staff-homepage .top-row {
          max-width: none !important;
          width: 100% !important;
        }
        
        /* Ensure group-resources container is full width */
        #staff-homepage .group-resources-container {
          max-width: none !important;
          width: 100% !important;
        }
        
        /* Ensure admin section is full width */
        #staff-homepage .admin-section {
          max-width: none !important;
          width: 100% !important;
        }
        
        /* Responsive adjustments for larger screens */
        @media (min-width: 1440px) {
          #staff-homepage {
            padding: 30px !important;
          }
          
          #staff-homepage .top-row {
            grid-template-columns: 300px 1fr;
            gap: 30px;
          }
        }
        
        /* Ultra-wide screen adjustments */
        @media (min-width: 1920px) {
          #staff-homepage {
            padding: 40px !important;
          }
        }
      `;
      document.head.appendChild(overrideStyle);
    }
  }
  
  // OPTIMIZATION: Use DocumentFragment for better performance
  const fragment = document.createDocumentFragment();
  fragment.appendChild(styleElement);
  
  // Parse HTML string into DOM elements
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = homepageHTML;
  
  // Append all children to fragment
  while (tempDiv.firstChild) {
    fragment.appendChild(tempDiv.firstChild);
  }
  
  // Replace container content with fragment (single DOM operation)
  container.innerHTML = '';
  container.appendChild(fragment);
  
  // Initialize charts with lazy loading - pass national data
  if (schoolResults) {
    lazyLoadVESPACharts(schoolResults, staffResults, hasAdminRole, nationalData, cycleData);
  }
  
  // Initialize tooltips
  setupTooltips();
  
  // Track page view
  trackPageView('VESPA Dashboard').catch(err => console.warn('[Staff Homepage] Dashboard view tracking failed:', err));
  // Setup logo controls for admin users
  if (hasAdminRole) {
    // Define default logo
    const defaultVespaLogo = "https://www.vespa.academy/assets/images/full-trimmed-transparent-customcolor-1-832x947.png";
    // Add modal HTML to body
    const modalHtml = `
      <div id="logo-modal" class="vespa-modal">
        <div class="vespa-modal-content">
          <span class="vespa-modal-close">&times;</span>
          <h3>Update School Logo</h3>
          <p>Enter the URL of your school logo image:</p>
          <input type="text" id="logo-url-input" placeholder="https://example.com/school-logo.png">
          <div class="logo-preview-container">
            <p>Preview:</p>
            <img id="logo-preview" src="${defaultVespaLogo}" alt="Logo Preview">
          </div>
          <div class="vespa-modal-buttons">
            <button id="logo-save-btn" class="vespa-btn vespa-btn-primary">Save</button>
            <button id="logo-reset-btn" class="vespa-btn vespa-btn-secondary">Reset to Default</button>
            <button id="logo-cancel-btn" class="vespa-btn vespa-btn-neutral">Cancel</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
      // Add event listeners after modal is added
  setupLogoControls(profileData.schoolId);
  
  // Setup feature toggles for admin users
  if (hasAdminRole) {
    setupFeatureToggles(profileData.schoolId, profileData);
  }
}
// Setup cycle refresh button
if (profileData && profileData.userId) {
  setupCycleRefresh(profileData.userId, profileData.schoolId);
}

// Setup cycle management button for admins
if (hasAdminRole) {
  setTimeout(() => {
    const manageCyclesBtn = document.getElementById('manage-cycles-btn');
    if (manageCyclesBtn) {
      manageCyclesBtn.addEventListener('click', window.openCycleManagementModal);
      console.log('[Staff Homepage] Cycle management button initialized');
    }
  }, 100);
}

// Setup welcome banner close button
const bannerCloseBtn = document.querySelector('.banner-close');
if (bannerCloseBtn) {
  bannerCloseBtn.addEventListener('click', function() {
    const banner = document.getElementById('welcome-banner');
    if (banner) {
      banner.style.display = 'none';
      localStorage.setItem('welcome_banner_closed', 'true');
    }
  });
  
  // Check if we should hide banner based on localStorage
  if (localStorage.getItem('welcome_banner_closed') === 'true') {
    const banner = document.getElementById('welcome-banner');
    if (banner) banner.style.display = 'none';
  }
}

// Setup feedback button
const feedbackBtn = document.getElementById('feedback-button');
const feedbackModal = document.getElementById('feedback-modal');
const feedbackCloseBtn = document.getElementById('feedback-modal-close');
const feedbackForm = document.getElementById('feedback-form');

if (feedbackBtn && feedbackModal) {
  // Show modal when clicking feedback button
  feedbackBtn.addEventListener('click', function() {
    feedbackModal.style.display = 'block';
  });
  
  // Close modal when clicking X
  if (feedbackCloseBtn) {
    feedbackCloseBtn.addEventListener('click', function() {
      feedbackModal.style.display = 'none';
    });
  }
  
  // Close modal when clicking outside
  window.addEventListener('click', function(e) {
    if (e.target === feedbackModal) {
      feedbackModal.style.display = 'none';
    }
  });
  
  // Handle form submission
if (feedbackForm) {
  feedbackForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Show loading state
    const submitBtn = this.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Submitting...';
    
    try {
      // Collect all form data
      const name = document.getElementById('feedback-name').value;
      const email = document.getElementById('feedback-email').value;
      const type = document.getElementById('feedback-type').value;
      const priority = document.getElementById('feedback-priority').value;
      const category = document.getElementById('feedback-category').value;
      const message = document.getElementById('feedback-message').value;
      const context = document.getElementById('feedback-context').value;
      
      // Get screenshot if available
      let screenshotData = null;
      const screenshotInput = document.getElementById('feedback-screenshot');
      if (screenshotInput && screenshotInput.files && screenshotInput.files[0]) {
      try {
      // Get the screenshot as data URL
      screenshotData = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = e => reject(e);
      reader.readAsDataURL(screenshotInput.files[0]);
    });
  } catch (err) {
    console.error('[VESPA Support] Error reading screenshot:', err);
    // Continue without screenshot if there's an error
  }
}

      // Create feedback request object
      const feedbackRequest = {
        timestamp: new Date().toISOString(),
        submittedBy: {
          name: name,
          email: email
        },
        requestType: type,
        priority: priority,
        category: category,
        description: message,
        additionalContext: context || 'None provided',
        screenshot: screenshotData, // Add screenshot data
        status: 'New'
      };
      
      // First store in Knack
      const storedInKnack = await storeFeedbackInKnack(feedbackRequest);
      
      // Then try to send email
      let emailSent = false;
      try {
        emailSent = await sendFeedbackEmail(feedbackRequest);
      } catch (emailError) {
        console.error('[VESPA Support] Email sending failed:', emailError);
        // Continue - we've still saved the feedback
      }
      
      console.log('[VESPA Support] Feedback processed:', { 
        storedInKnack, 
        emailSent 
      });
      
      // Show success message even if email failed (feedback was saved)
      feedbackForm.style.display = 'none';
      const successDiv = document.getElementById('feedback-success');
      if (successDiv) {
        if (!emailSent) {
          // Modify success message if email failed
          successDiv.innerHTML = `
            <p>Thank you for your feedback! Your request has been saved successfully.</p>
            <p style="color: #ffa500;">Note: Email confirmation could not be sent at this time, but your request has been recorded and will be reviewed.</p>
          `;
        }
        successDiv.style.display = 'block';
      }
      
      // Close modal after 3 seconds
      setTimeout(function() {
        feedbackModal.style.display = 'none';
        // Reset form for next time
        setTimeout(function() {
          feedbackForm.reset();
          feedbackForm.style.display = 'block';
          document.getElementById('feedback-success').style.display = 'none';
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnText;
        }, 500);
      }, 3000);
    } catch (error) {
      console.error('[VESPA Support] Error processing feedback:', error);
      alert('There was an error submitting your request. Please try again later.');
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
    }
  });
  // Setup screenshot upload preview
const setupScreenshotUpload = function() {
  const screenshotInput = document.getElementById('feedback-screenshot');
  const screenshotPreview = document.getElementById('screenshot-preview');
  const screenshotImage = document.getElementById('screenshot-image');
  const removeScreenshotBtn = document.getElementById('remove-screenshot');
  
  if (!screenshotInput || !screenshotPreview || !screenshotImage || !removeScreenshotBtn) return;
  
  // Show preview when image is selected
  screenshotInput.addEventListener('change', function(e) {
    if (this.files && this.files[0]) {
      const file = this.files[0];
      
      // Check file size (limit to 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Screenshot too large. Please select an image smaller than 5MB.');
        this.value = '';
        return;
      }
      
      const reader = new FileReader();
      reader.onload = function(e) {
        screenshotImage.src = e.target.result;
        screenshotPreview.style.display = 'block';
      }
      reader.readAsDataURL(file);
    }
  });
  
  // Remove button functionality
  removeScreenshotBtn.addEventListener('click', function() {
    screenshotInput.value = '';
    screenshotPreview.style.display = 'none';
    screenshotImage.src = '';
  });
};

// Call setup function after modal is displayed
feedbackBtn.addEventListener('click', function() {
  // Existing code to show modal
  feedbackModal.style.display = 'block';
  // Setup screenshot handling after modal is shown
  setTimeout(setupScreenshotUpload, 100); 
});
}
}

// Setup Student Emulator button for ALL staff users
const emulatorBtn = document.getElementById('student-emulator-btn');
const emulatorModal = document.getElementById('student-emulator-modal');
const emulatorCloseBtn = document.getElementById('emulator-modal-close');
const levelSwitcherBtn = document.getElementById('level-switcher-btn');

if (emulatorBtn && emulatorModal) {
  // Show modal when clicking emulator button
  emulatorBtn.addEventListener('click', function() {
    emulatorModal.style.display = 'block';
    // Track feature usage
    trackPageView('Student Experience Mode').catch(err => 
      console.warn('[Staff Homepage] Emulator tracking failed:', err)
    );
  });
  
  // Close modal when clicking X
  if (emulatorCloseBtn) {
    emulatorCloseBtn.addEventListener('click', function() {
      emulatorModal.style.display = 'none';
    });
  }
  
  // Close modal when clicking outside
  window.addEventListener('click', function(e) {
    if (e.target === emulatorModal) {
      emulatorModal.style.display = 'none';
    }
  });
  
  // Level switcher functionality
  if (levelSwitcherBtn) {
    // Track current level in sessionStorage
    let currentLevel = sessionStorage.getItem('emulatedStudentLevel') || 'Level 3';
    
    // Update button text based on current level
    function updateLevelButton() {
      const strongElement = levelSwitcherBtn.parentElement.querySelector('strong');
      if (currentLevel === 'Level 3') {
        levelSwitcherBtn.textContent = 'Switch to Level 2';
        if (strongElement) strongElement.textContent = 'This report shows a Level 3 (A-Level) student.';
      } else {
        levelSwitcherBtn.textContent = 'Switch to Level 3';
        if (strongElement) strongElement.textContent = 'This report shows a Level 2 (GCSE) student.';
      }
    }
    
    // Initialize button state
    updateLevelButton();
    
    // Handle level switching
    levelSwitcherBtn.addEventListener('click', async function(e) {
      e.preventDefault();
      
      // Disable button during update
      levelSwitcherBtn.disabled = true;
      levelSwitcherBtn.textContent = 'Switching...';
      
      try {
        // Toggle level
        currentLevel = currentLevel === 'Level 3' ? 'Level 2' : 'Level 3';
        sessionStorage.setItem('emulatedStudentLevel', currentLevel);
        
        // Update Object_10 record via API
        const userEmail = Knack.getUserAttributes().email;
        
        // Find Object_10 record
        const filters = encodeURIComponent(JSON.stringify({
          match: 'and',
          rules: [{ field: 'field_197', operator: 'is', value: userEmail }]
        }));
        
        const findResponse = await $.ajax({
          url: `https://api.knack.com/v1/objects/object_10/records?filters=${filters}`,
          type: 'GET',
          headers: {
            'X-Knack-Application-Id': '5ee90912c38ae7001510c1a9',
            'X-Knack-REST-API-Key': '8f733aa5-dd35-4464-8348-64824d1f5f0d'
          }
        });
        
        if (findResponse.records && findResponse.records.length > 0) {
          const recordId = findResponse.records[0].id;
          
          // Update the Level field
          await $.ajax({
            url: `https://api.knack.com/v1/objects/object_10/records/${recordId}`,
            type: 'PUT',
            headers: {
              'X-Knack-Application-Id': '5ee90912c38ae7001510c1a9',
              'X-Knack-REST-API-Key': '8f733aa5-dd35-4464-8348-64824d1f5f0d',
              'Content-Type': 'application/json'
            },
            data: JSON.stringify({
              field_568: currentLevel  // Update Level field - field_568 is the correct Level field
            })
          });
          
          console.log('[Student Emulation] Level switched to:', currentLevel);
          
          // Update button text
          updateLevelButton();
          
          // Reload iframe to show new report
          const iframe = document.getElementById('student-emulator-iframe');
          if (iframe) {
            // Store current iframe location
            const currentSrc = iframe.src;
            // Force reload by changing and restoring src
            iframe.src = 'about:blank';
            setTimeout(() => {
              iframe.src = currentSrc;
            }, 100);
          }
        }
        
      } catch (error) {
        console.error('[Student Emulation] Error switching level:', error);
        alert('Unable to switch level. Please try again.');
        // Revert level on error
        currentLevel = currentLevel === 'Level 3' ? 'Level 2' : 'Level 3';
        sessionStorage.setItem('emulatedStudentLevel', currentLevel);
      } finally {
        // Re-enable button
        levelSwitcherBtn.disabled = false;
        updateLevelButton();
      }
    });
  }
}

  // Hide the loading screen on success
  if (window.VespaLoadingScreen && window.VespaLoadingScreen.isActive()) {
    window.VespaLoadingScreen.hide();
  }
  
  debugLog("Staff homepage rendered successfully");
} catch (error) {
  console.error("Error rendering staff homepage:", error);
  
  // Hide the loading screen on error
  if (window.VespaLoadingScreen && window.VespaLoadingScreen.isActive()) {
    window.VespaLoadingScreen.hide();
  }
  
  container.innerHTML = `
    <div style="padding: 30px; text-align: center; color: ${THEME.ACCENT}; background-color: ${THEME.PRIMARY}; border-radius: 8px; border: 2px solid ${THEME.ACCENT}; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);">
      <h3>Error Loading Staff Homepage</h3>
      <p style="color: #ffffff;">An unexpected error occurred. Please try refreshing the page.</p>
      <button onclick="location.reload()" style="margin-top: 15px; background-color: ${THEME.ACCENT}; color: ${THEME.PRIMARY}; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold;">Refresh Page</button>
    </div>
  `;
}
}

// --- User Verification Functions ---
// Check user verification status and show appropriate modals
async function checkUserVerificationStatus() {
  let user = null; // Define user outside try block
  try {
    user = Knack.getUserAttributes();
    if (!user || !user.email) {
      console.error("[Staff Homepage] Cannot check verification status: No user data");
      return true; // Allow access on error
    }
    
    // Find the staff record to check verification fields
    console.log("[Staff Homepage] Attempting to find staff record for email:", user.email);
    const staffRecord = await findStaffRecord(user.email);
    
    if (!staffRecord) {
      console.error("[Staff Homepage] Cannot find staff record for verification check for email:", user.email);
      
      // Special handling for test/admin accounts
      if (user.email === 'lucas@vespa.academy' || user.email.includes('@vespa.academy')) {
        console.log("[Staff Homepage] Test/admin account detected, allowing access without verification check");
        return true;
      }
      
      // For other users, redirect to regular homepage
      console.log("[Staff Homepage] No staff record found, redirecting to regular homepage");
      window.location.href = 'https://vespaacademy.knack.com/vespa-academy#landing-page/';
      return false; // Don't allow access to staff homepage
    }
    
    // Extract the boolean field values (they can be either boolean true/false or "Yes"/"No" strings)
    const isVerified = staffRecord.field_189 === "Yes" || staffRecord.field_189 === true;
    const hasAcceptedPrivacy = staffRecord.field_127 === "Yes" || staffRecord.field_127 === true;
    const hasResetPassword = staffRecord.field_539 === "Yes" || staffRecord.field_539 === true;
    
    console.log(`[Staff Homepage] User verification status:`, {
      verified: isVerified,
      privacyAccepted: hasAcceptedPrivacy,
      passwordReset: hasResetPassword,
      rawValues: {
        field_189: staffRecord.field_189,
        field_127: staffRecord.field_127,
        field_539: staffRecord.field_539
      }
    });
    
    // Determine what needs to be shown based on the correct logic
    let needsPrivacy = false;
    let needsPassword = false;
    
    // First time user: field_189="No", field_539="No", field_127="No" - show both privacy and password
    if (!isVerified && !hasAcceptedPrivacy && !hasResetPassword) {
      needsPrivacy = true;
      needsPassword = true;
      console.log("[Staff Homepage] First time user - showing both privacy and password modals");
    }
    // User has reset password but needs to accept privacy: field_189="Yes", field_539="Yes", field_127="No"
    else if (isVerified && hasResetPassword && !hasAcceptedPrivacy) {
      needsPrivacy = true;
      needsPassword = false;
      console.log("[Staff Homepage] User needs to accept privacy policy only");
    }
    // User accepted privacy but needs password reset: field_189="No", field_539="No", field_127="Yes"
    else if (!isVerified && !hasResetPassword && hasAcceptedPrivacy) {
      needsPrivacy = false;
      needsPassword = true;
      console.log("[Staff Homepage] User needs to reset password only");
    }
    // All complete: field_189="Yes", field_539="Yes", field_127="Yes"
    else if (isVerified && hasResetPassword && hasAcceptedPrivacy) {
      console.log("[Staff Homepage] User verification complete - allowing access");
      return true;
    }
    else {
      // Edge case - log the state and default to showing what's missing
      console.warn("[Staff Homepage] Unexpected verification state", {
        isVerified, hasAcceptedPrivacy, hasResetPassword
      });
      needsPrivacy = !hasAcceptedPrivacy;
      needsPassword = !hasResetPassword;
    }
    
    // Show appropriate modals if needed
    if (needsPrivacy || needsPassword) {
      return await showVerificationModals(needsPrivacy, needsPassword, staffRecord.id);
    }
    
    // All checks passed
    return true;
  } catch (error) {
    console.error("[Staff Homepage] Error in checkUserVerificationStatus:", error);
    console.error("[Staff Homepage] Error details:", {
      message: error.message,
      stack: error.stack,
      userEmail: user?.email || 'No email'
    });
    
    // If we can't verify, redirect to regular homepage as fallback
    if (window.location.href.includes('#dashboard3') || window.location.href.includes('#staff-landing-page')) {
      console.log("[Staff Homepage] Redirecting to regular homepage due to verification error");
      window.location.href = 'https://vespaacademy.knack.com/vespa-academy#landing-page/';
      return false; // Don't allow access to staff homepage
    }
    
    return true; // Allow access on error for other pages
  }
}

// Show verification modals based on what's needed
async function showVerificationModals(needsPrivacy, needsPassword, staffRecordId) {
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
          background: linear-gradient(135deg, #0a2b8c 0%, #061a54 100%);
          border: 3px solid #00e5db;
          border-radius: 10px;
          max-width: 600px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
        ">
          ${needsPrivacy ? getPrivacyPolicyModal() : ''}
          ${needsPassword ? getPasswordResetModal(!needsPrivacy) : ''}
        </div>
      </div>
    `;
    
    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Handle modal flow
    if (needsPrivacy) {
      setupPrivacyPolicyHandlers(staffRecordId, needsPassword, resolve);
    } else if (needsPassword) {
      setupPasswordResetHandlers(staffRecordId, resolve);
    }
  });
}

// Privacy Policy Modal HTML
function getPrivacyPolicyModal() {
  return `
    <div id="privacy-policy-modal" class="verification-modal" style="padding: 30px; color: white; position: relative;">
      <h2 style="color: #00e5db; margin-bottom: 20px; text-align: center;">Privacy Policy Agreement</h2>
      
      <div style="background: rgba(255, 255, 255, 0.1); padding: 20px; border-radius: 8px; margin-bottom: 20px; max-height: 400px; overflow-y: auto;">
        <iframe src="https://vespa.academy/assets/MVIMAGES/privacy-policy.html" 
                style="width: 100%; height: 350px; border: none; background: white; border-radius: 4px;"
                title="Privacy Policy">
        </iframe>
      </div>
      
      <div style="margin: 20px 0; position: relative; z-index: 10;">
        <label style="display: flex; align-items: center; cursor: pointer; font-size: 16px;">
          <input type="checkbox" id="privacy-accept-checkbox" style="margin-right: 10px; width: 20px; height: 20px; cursor: pointer; position: relative; z-index: 11;">
          <span style="cursor: pointer; user-select: none;">I have read and agree to the VESPA Academy Privacy Policy</span>
        </label>
      </div>
      
      <div style="text-align: center; margin-top: 20px; position: relative; z-index: 10;">
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
          position: relative;
          z-index: 11;
        ">
          Continue
        </button>
      </div>
    </div>
  `;
}

// Password Reset Modal HTML
function getPasswordResetModal(visibleByDefault = false) {
  return `
    <div id="password-reset-modal" class="verification-modal" style="padding: 30px; color: white; ${visibleByDefault ? '' : 'display: none;'}">
      <h2 style="color: #00e5db; margin-bottom: 20px; text-align: center;">Set Your Password</h2>
      
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
            border: 1px solid #00e5db;
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
            border: 1px solid #00e5db;
            background: rgba(255, 255, 255, 0.1);
            color: white;
            font-size: 16px;
          " placeholder="Confirm new password">
        </div>
        
        <div id="password-error" style="color: #ff6b6b; margin-bottom: 20px; display: none;"></div>
        
        <div style="text-align: center;">
          <button type="submit" id="password-submit-btn" style="
            background: #00e5db;
            color: #0a2b8c;
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
    function setupPrivacyPolicyHandlers(staffRecordId, needsPassword, resolve) {
      // Prevent multiple setups
      if (window._privacyHandlersSetup) {
        console.log('[Staff Homepage] Privacy policy handlers already set up, skipping...');
        return;
      }
      window._privacyHandlersSetup = true;
      
      // Add a small delay to ensure DOM is ready
      setTimeout(() => {
        const checkbox = document.getElementById('privacy-accept-checkbox');
        const continueBtn = document.getElementById('privacy-continue-btn');
        
        if (!checkbox || !continueBtn) {
          console.log('[Staff Homepage] Privacy policy elements not found, retrying...', { checkbox: !!checkbox, continueBtn: !!continueBtn });
          window._privacyHandlersSetup = false; // Reset flag for retry
          // Retry after another delay if elements not found
          setTimeout(() => setupPrivacyPolicyHandlers(staffRecordId, needsPassword, resolve), 100);
          return;
        }
        
        console.log('[Staff Homepage] Privacy policy handler setup', { 
          checkboxFound: !!checkbox, 
          buttonFound: !!continueBtn,
          checkboxId: checkbox?.id,
          buttonId: continueBtn?.id
        });
        
        // Ensure button starts in correct state
        if (checkbox && continueBtn) {
          continueBtn.disabled = true;
          continueBtn.style.background = '#666';
          continueBtn.style.color = 'white';
          continueBtn.style.cursor = 'not-allowed';
          
          // Function to update button state
          const updateButtonState = () => {
            const currentCheckbox = document.getElementById('privacy-accept-checkbox');
            const currentBtn = document.getElementById('privacy-continue-btn');
            
            if (currentCheckbox && currentBtn) {
              if (currentCheckbox.checked) {
                currentBtn.disabled = false;
                currentBtn.style.background = '#00e5db';
                currentBtn.style.color = '#0a2b8c';
                currentBtn.style.cursor = 'pointer';
                currentBtn.style.opacity = '1';
                console.log('[Staff Homepage] Checkbox checked - button enabled');
              } else {
                currentBtn.disabled = true;
                currentBtn.style.background = '#666';
                currentBtn.style.color = 'white';
                currentBtn.style.cursor = 'not-allowed';
                currentBtn.style.opacity = '0.6';
                console.log('[Staff Homepage] Checkbox unchecked - button disabled');
              }
            }
          };
          
          // Remove any existing event listeners by using a new approach
          // Instead of cloning, we'll use a named function and remove/add it
          const checkboxChangeHandler = (e) => {
            console.log('[Staff Homepage] Checkbox change event fired', { checked: e.target.checked });
            updateButtonState();
          };
          
          const checkboxClickHandler = (e) => {
            console.log('[Staff Homepage] Checkbox click event fired');
            // Small delay to ensure the checked state has updated
            setTimeout(updateButtonState, 20);
          };
          
          // Remove existing listeners if they exist
          checkbox.removeEventListener('change', checkboxChangeHandler);
          checkbox.removeEventListener('click', checkboxClickHandler);
          
          // Add fresh event listeners
          checkbox.addEventListener('change', checkboxChangeHandler);
          checkbox.addEventListener('click', checkboxClickHandler);
          
          // Also listen for input event as a fallback
          checkbox.addEventListener('input', (e) => {
            console.log('[Staff Homepage] Checkbox input event fired');
            updateButtonState();
          });
          
          // Check initial state
          updateButtonState();
          
          // Handle continue button click - MUST be inside setTimeout where continueBtn is defined
          continueBtn.addEventListener('click', async function() {
            // Need to reference the current checkbox
            const currentCheckbox = document.getElementById('privacy-accept-checkbox');
            if (!currentCheckbox || !currentCheckbox.checked) return;
            
            // Show loading state
            this.disabled = true;
            this.innerHTML = 'Updating...';
            
            try {
              // Update the privacy policy field
              await updateStaffVerificationFields(staffRecordId, { field_127: "Yes" });
              
              console.log('[Staff Homepage] Privacy policy acceptance updated successfully');
              
              // Hide privacy modal
              const privacyModal = document.getElementById('privacy-policy-modal');
              if (privacyModal) privacyModal.style.display = 'none';
              
              // Show password modal if needed
              if (needsPassword) {
                const passwordModal = document.getElementById('password-reset-modal');
                if (passwordModal) passwordModal.style.display = 'block';
                setupPasswordResetHandlers(staffRecordId, resolve);
              } else {
                // All done, close modal and proceed
                document.getElementById('verification-modal-overlay').remove();
                window._privacyHandlersSetup = false; // Reset flag
                resolve(true);
              }
            } catch (error) {
              console.error('[Staff Homepage] Error updating privacy policy acceptance:', error);
              alert('Error updating your preferences. Please try again.');
              this.disabled = false;
              this.innerHTML = 'Continue';
            }
          });
        } else {
          console.error('[Staff Homepage] Privacy policy elements not found:', {
            checkbox: checkbox,
            continueBtn: continueBtn
          });
        }
      }, 100); // 100ms delay to ensure DOM is ready
}

// Setup Password Reset Modal Handlers
function setupPasswordResetHandlers(staffRecordId, resolve) {
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
                await updateStaffVerificationFields(staffRecordId, { 
                    field_71: newPassword.value,   // Update the actual password field
                    field_539: "Yes",              // "Yes" means password HAS been reset (user doesn't need to reset)
                    field_189: "Yes"               // Mark user as verified
                });
                
                console.log('[Staff Homepage] Password and verification status updated successfully');
                
                                    // Success - close modal and proceed
                    document.getElementById('verification-modal-overlay').remove();
                    window._privacyHandlersSetup = false; // Reset flag
                    resolve(true);
                    
                    // Show success message
                    alert('Password set successfully! You can now access the platform.');
                
            } catch (error) {
                console.error('[Staff Homepage] Error setting password:', error);
                errorDiv.innerHTML = 'Error setting password. Please try again.';
                errorDiv.style.display = 'block';
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Set Password';
            }
  });
}

// Update staff verification fields
async function updateStaffVerificationFields(staffRecordId, updates) {
  return await retryApiCall(() => {
    return KnackAPIQueue.addRequest({
      url: `${KNACK_API_URL}/objects/object_3/records/${staffRecordId}`,
      type: 'PUT',
      headers: getKnackHeaders(),
      data: JSON.stringify(updates)
    });
  });
}

// Update user password
async function updateUserPassword(newPassword) {
  const user = Knack.getUserAttributes();
  
  // Use Knack's built-in API to update password
  return await $.ajax({
    url: `${KNACK_API_URL}/applications/${Knack.application_id}/session`,
    type: 'PUT',
    headers: {
      'X-Knack-Application-Id': Knack.application_id,
      'Authorization': Knack.getUserToken(),
      'Content-Type': 'application/json'
    },
    data: JSON.stringify({
      password: newPassword
    })
  });
}

// --- Main Initialization ---
// Initialize the staff homepage
window.initializeStaffHomepage = function() {
  debugLog("Initializing Staff Homepage...");
  
  // Run cleanup first in case any previous elements exist
  if (window.cleanupStaffHomepage) {
    window.cleanupStaffHomepage();
  }

  // Load the student emulation module
  if (window.staffHomepageInitQueue && window.staffHomepageInitQueue.length > 0) {
    window.staffHomepageInitQueue.forEach(fn => {
      if (typeof fn === 'function') {
        try {
          fn();
        } catch (error) {
          console.error('[Staff Homepage] Error loading module:', error);
        }
      }
    });
    // Clear the queue after loading
    window.staffHomepageInitQueue = [];
  }

 // Get current user from Knack
 const currentUser = Knack.getUserAttributes();
 if (currentUser && currentUser.id) {
   // Check if this is a different user than last time
   const previousUserId = localStorage.getItem('staffhomepage_user_id');
   
   if (previousUserId && previousUserId !== currentUser.id) {
     console.log("[Staff Homepage] User changed detected. Refreshing page...");
     // Store new user ID before refresh
     localStorage.setItem('staffhomepage_user_id', currentUser.id);
     // Force page refresh
     window.location.reload();
     return; // Stop further execution
   }
   
   // Store current user ID for next time
   localStorage.setItem('staffhomepage_user_id', currentUser.id);
   
   // Verify user account type
   let accountType = null;
   if (currentUser.values && currentUser.values.field_441) {
     accountType = currentUser.values.field_441;
   } else if (currentUser.field_441) {
     accountType = currentUser.field_441;
   }
   
   // If user has RESOURCES account type, redirect them
   if (accountType && accountType.toString().toUpperCase().includes('RESOURCE')) {
     console.log('[Staff Homepage] RESOURCE user detected on coaching page, redirecting...');
     console.error('[Staff Homepage] User account type:', accountType, '- redirecting to resources page');
     
     // Show redirect message
     const container = document.querySelector('#' + (window.STAFFHOMEPAGE_CONFIG?.elementSelector || 'view_3024').replace('#', ''));
     if (container) {
       container.innerHTML = '<div style="padding: 20px; text-align: center;">Redirecting to your dashboard...</div>';
     }
     
     // Redirect to resources page
     window.location.hash = '#resources-homepage/'; // Using correct Knack slug
     return;
   }
 }

  // First, explicitly check if we're on the login page by looking for login form elements
  if (document.querySelector('input[type="password"]') && 
      document.querySelector('form') && 
      (document.querySelector('button[type="submit"]') || 
       document.querySelector('input[type="submit"]') ||
       document.querySelector('button:contains("Sign In")') ||
       document.querySelector('button').textContent.includes('Sign In'))) {
    console.log("[Staff Homepage] Login form detected, skipping initialization");
    return; // Don't initialize on login pages
  }
  
  // First verify Knack context is available
  if (typeof Knack === 'undefined' || typeof Knack.getUserToken !== 'function') {
    console.error("[Staff Homepage] Knack context not available.");
    return;
  }
  
  // Check if user is authenticated via Knack token
  const userToken = Knack.getUserToken();
  if (!userToken) {
    console.log("[Staff Homepage] User not authenticated (no token), skipping initialization.");
    return;
  }
  
  // Additional check: see if we can get the user attributes (which should only be available when logged in)
  const userAttributes = Knack.getUserAttributes();
  if (!userAttributes || !userAttributes.id) {
    console.log("[Staff Homepage] User attributes not available, skipping initialization.");
    return;
  }
  
  // Check if we're on a page that has our target container
  const container = document.querySelector(window.STAFFHOMEPAGE_CONFIG?.elementSelector);
  if (!container) {
    console.log("[Staff Homepage] Target container not found on this page, skipping initialization.");
    return;
  }
  
  // At this point, we're confident the user is logged in and we're on the right page
  console.log("[Staff Homepage] User authenticated and container found. Proceeding with initialization.");
  
  // NEW: Check user verification status before proceeding
  checkUserVerificationStatus().then(canProceed => {
    if (canProceed) {
      // Track user login in the background
      trackUserLogin().catch(error => {
        console.warn("[Staff Homepage] Error tracking login:", error);
      });
      
      // Render the homepage
      renderHomepage();
    }
    // If canProceed is false, the modals are already being shown
  }).catch(error => {
    console.error("[Staff Homepage] Error checking user verification status:", error);
    // Still try to render the homepage on error
    renderHomepage();
  });
}; // Close initializeStaffHomepage function properly
// Add cleanup function to window object
window.cleanupStaffHomepage = function() {
  // Remove loading indicator
  const loadingIndicator = document.getElementById('api-loading-indicator');
  if (loadingIndicator) loadingIndicator.remove();
  
  // Remove feedback button & modal
  const feedbackBtn = document.getElementById('feedback-button');
  if (feedbackBtn) feedbackBtn.remove();
  const feedbackModal = document.getElementById('feedback-modal');
  if (feedbackModal) feedbackModal.remove();
  
  // Remove student emulator modal
  const emulatorModal = document.getElementById('student-emulator-modal');
  if (emulatorModal) emulatorModal.remove();
  
  // Remove logo modal
  const logoModal = document.getElementById('logo-modal');
  if (logoModal) logoModal.remove();
  
  // Clear any event listeners that might have been attached
  const bannerCloseBtn = document.querySelector('.banner-close');
  if (bannerCloseBtn) {
    bannerCloseBtn.removeEventListener('click', null);
  }
  
  // Remove any other elements added by the script
  const welcomeBanner = document.getElementById('welcome-banner');
  if (welcomeBanner) welcomeBanner.remove();

  if (KnackAPIQueue && typeof KnackAPIQueue.forceReset === 'function') {
    KnackAPIQueue.forceReset();
  }
  
  console.log('[Staff Homepage] Cleanup completed');
};

// Add listener for Knack scene change
document.addEventListener('knack-scene-render.any', function(event) {
  const currentSceneKey = event.detail.scene.key;
  const previousSceneKey = window.STAFFHOMEPAGE_CONFIG?.sceneKey;
  
  // Only clean up if we are navigating away from the staff homepage scene
  if (previousSceneKey && currentSceneKey !== previousSceneKey) {
    console.log('[Staff Homepage] Scene change detected, cleaning up...');
    if (window.cleanupStaffHomepage) {
      window.cleanupStaffHomepage();
    }
  }
});
// More robust cleanup mechanism
(function() {
  // Flag to check if we're on the staff homepage
  let onStaffHomepage = false;
  // Add initialization delay flag to prevent premature cleanup
  let isInitializing = true;
  
  // Create a more aggressive cleanup function
  window.cleanupStaffHomepageCompletely = function() {
    console.log('[Staff Homepage] Running complete cleanup');
    
    // Remove all modals and popups
    const elementsToRemove = [
      'api-loading-indicator',
      'feedback-button',
      'feedback-modal',
      'student-emulator-modal',
      'logo-modal',
      'toggle-update-modal',
      'welcome-banner',
      'staff-homepage' // Main container
    ];
    
    // Remove each element if it exists
    elementsToRemove.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        console.log(`[Staff Homepage] Removing element: ${id}`);
        element.remove();
      }
    });
    
    // Also try to find elements by class
    const classesToRemove = [
      'app-tooltip',
      'vespa-modal',
      'feedback-button',
      'api-loading-indicator'
    ];
    
    classesToRemove.forEach(className => {
      const elements = document.getElementsByClassName(className);
      while (elements.length > 0) {
        console.log(`[Staff Homepage] Removing element with class: ${className}`);
        elements[0].remove();
      }
    });
    
    // Set global state flag
    window.STAFFHOMEPAGE_ACTIVE = false;
    
    console.log('[Staff Homepage] Cleanup completed - all elements removed');
  };
  
  // Get the target container ID from config
  const targetElementSelector = window.STAFFHOMEPAGE_CONFIG?.elementSelector || '#view_3024';
  
  // Track view/scene from config
  const homepageSceneKey = window.STAFFHOMEPAGE_CONFIG?.sceneKey || 'scene_1215';
  const homepageViewKey = window.STAFFHOMEPAGE_CONFIG?.viewKey || 'view_3024';
  
  // Create MutationObserver to detect DOM changes
const observer = new MutationObserver(function(mutations) {
  // Skip during initialization phase
  if (isInitializing) return;
  
  // Check if we're currently on the homepage
  const targetElement = document.querySelector(targetElementSelector);
  const wasOnHomepage = onStaffHomepage;
  
  // Update current state
  onStaffHomepage = !!targetElement && targetElement.children.length > 0;
  
  // If we've navigated away from the homepage, clean up
  if (wasOnHomepage && !onStaffHomepage) {
    console.log('[Staff Homepage] Detected navigation away from staff homepage');
    window.cleanupStaffHomepageCompletely();
  }
  
  // MODIFIED: Only check body classes if element is missing AND we're sure we were on homepage
  if (wasOnHomepage && !onStaffHomepage) {
    const bodyHasHomepageClass = document.body.classList.contains('homepage-view') || 
                               document.body.id === 'knack-body_' + homepageViewKey;
    if (!bodyHasHomepageClass) {
      console.log('[Staff Homepage] Body classes changed, confirming navigation away from homepage');
      window.cleanupStaffHomepageCompletely();
    }
  }
});

// Observe the entire document for changes
observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Set a timeout to finish initialization and allow monitoring
setTimeout(function() {
  isInitializing = false;
  console.log('[Staff Homepage] Initialization complete, monitoring for navigation changes');
}, 1000); // 1 second delay
  
  // Observe the entire document for changes
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  // Also listen to Knack's navigation events as backup
  document.addEventListener('knack-scene-render.any', function(event) {
    // If new scene is not the homepage scene, clean up
    if (event.detail && event.detail.scene && 
        event.detail.scene.key !== homepageSceneKey) {
      console.log('[Staff Homepage] Scene changed to non-homepage scene, cleaning up');
      window.cleanupStaffHomepageCompletely();
    }
  });
  
  // Modify initialization function to set active flag
const originalInit = window.initializeStaffHomepage;
window.initializeStaffHomepage = function() {
  // Clean up first
  if (window.cleanupStaffHomepageCompletely) {
    window.cleanupStaffHomepageCompletely();
  }
  
  // Reset initialization flag
  isInitializing = true;
  
  // Set active flag
  window.STAFFHOMEPAGE_ACTIVE = true;
  onStaffHomepage = true;
  
  // Reset initialization flag after a delay
  setTimeout(function() {
    isInitializing = false;
  }, 1000);
  
  // Call original initialization
  return originalInit.apply(this, arguments);
};
})();
// Store feedback in Knack field_3207
async function storeFeedbackInKnack(feedbackRequest) {
  try {
    console.log('[VESPA Support] Storing feedback in Knack:', feedbackRequest);
    
    // Get the current user
    const user = Knack.getUserAttributes();
    if (!user || !user.id) {
      throw new Error('User not authenticated');
    }
    
    // Find the user's record in Object_3
    const filters = encodeURIComponent(JSON.stringify({
      match: 'and',
      rules: [
        { field: 'field_70', operator: 'is', value: user.email }  // Staff email field only
      ]
    }));
    
    const response = await retryApiCall(() => {
      return KnackAPIQueue.addRequest({
        url: `${KNACK_API_URL}/objects/object_3/records?filters=${filters}`,
        type: 'GET',
        headers: getKnackHeaders(),
        data: { format: 'raw' }
      });
    });
    
    if (!response || !response.records || response.records.length === 0) {
      throw new Error('User record not found');
    }
    
    const userRecord = response.records[0];
    
    // Get existing feedback data or initialize new structure
    let feedbackData = { feedbackRequests: [] };
    
    if (userRecord.field_3207) {
      try {
        feedbackData = JSON.parse(userRecord.field_3207);
        // Ensure feedbackRequests exists
        if (!feedbackData.feedbackRequests) {
          feedbackData.feedbackRequests = [];
        }
      } catch (e) {
        console.warn('[VESPA Support] Error parsing existing feedback data, initializing new array');
        feedbackData = { feedbackRequests: [] };
      }
    }
    
    // Add new request to the array
    feedbackData.feedbackRequests.push(feedbackRequest);
    
    // Update the record with new feedback data
    await retryApiCall(() => {
      return KnackAPIQueue.addRequest({
        url: `${KNACK_API_URL}/objects/object_3/records/${userRecord.id}`,
        type: 'PUT',
        headers: getKnackHeaders(),
        data: JSON.stringify({
          field_3207: JSON.stringify(feedbackData)
        })
      });
    });
    
    console.log('[VESPA Support] Successfully stored feedback in Knack');
    return true;
    
  } catch (error) {
    console.error('[VESPA Support] Error storing feedback in Knack:', error);
    throw error;
  }
}

// Send feedback email via SendGrid Proxy
async function sendFeedbackEmail(feedbackRequest) {
  try {
    console.log('[VESPA Support] Sending feedback email via SendGrid Proxy');
    
    // Get SendGrid config from the STAFFHOMEPAGE_CONFIG
    const config = window.STAFFHOMEPAGE_CONFIG || {};
    const sendGridConfig = config.sendGrid || {};
    
    // Check if proxy URL is configured
    if (!sendGridConfig.proxyUrl) {
      console.error('[VESPA Support] SendGrid proxy URL not configured');
      return false;
    }
    
    // Format timestamp for display
    const formattedTimestamp = new Date(feedbackRequest.timestamp).toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Send two separate emails: one to admin and one as confirmation to user
    
    // 1. Admin notification email
    const adminEmailData = {
      personalizations: [
        {
          to: [{ email: 'admin@vespa.academy' }],
          dynamic_template_data: {
            name: feedbackRequest.submittedBy.name,
            email: feedbackRequest.submittedBy.email,
            requestType: feedbackRequest.requestType,
            priority: feedbackRequest.priority,
            category: feedbackRequest.category,
            description: feedbackRequest.description,
            additionalContext: feedbackRequest.additionalContext,
            timestamp: formattedTimestamp
          }
        }
      ],
      from: {
        email: sendGridConfig.fromEmail || "noreply@notifications.vespa.academy",
        name: sendGridConfig.fromName || "VESPA Academy"
      },
      template_id: sendGridConfig.templateId
    };
    
    // 2. User confirmation email
    const userEmailData = {
      personalizations: [
        {
          to: [{ email: feedbackRequest.submittedBy.email }],
          dynamic_template_data: {
            name: feedbackRequest.submittedBy.name,
            requestType: feedbackRequest.requestType,
            priority: feedbackRequest.priority,
            category: feedbackRequest.category,
            description: feedbackRequest.description,
            timestamp: formattedTimestamp
          }
        }
      ],
      from: {
        email: sendGridConfig.fromEmail || "noreply@notifications.vespa.academy",
        name: sendGridConfig.fromName || "VESPA Academy"
      },
      template_id: sendGridConfig.confirmationtemplateId
    };
    
// Add screenshot attachment if available
if (feedbackRequest.screenshot) {
  // Extract base64 data from the data URL
  const base64Data = feedbackRequest.screenshot.split(',')[1];
  
  adminEmailData.attachments = [
    {
      content: base64Data,
      filename: 'screenshot.png',
      type: 'image/png',
      disposition: 'attachment'
    }
  ];
  
  // Include a reference in the dynamic template data
  adminEmailData.personalizations[0].dynamic_template_data.hasScreenshot = true;
} else {
  adminEmailData.personalizations[0].dynamic_template_data.hasScreenshot = false;
}

    // Log the request for debugging
    console.log('[VESPA Support] Sending request to proxy:', sendGridConfig.proxyUrl);
    console.log('[VESPA Support] Request data structure:', {
      personalizations: adminEmailData.personalizations?.length || 0,
      hasFrom: !!adminEmailData.from,
      hasTemplateId: !!adminEmailData.template_id,
      hasAttachments: !!adminEmailData.attachments
    });
    
    // Send admin email (proxy server has its own SendGrid API key)
    const adminResponse = await fetch(sendGridConfig.proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(adminEmailData)
    });
    
    // Check if admin email was successful
    if (!adminResponse.ok) {
      let errorDetails = 'Unknown error';
      try {
        const errorData = await adminResponse.json();
        errorDetails = errorData.details || errorData.error || 'No details provided';
      } catch (e) {
        errorDetails = `Status ${adminResponse.status}: ${adminResponse.statusText}`;
      }
      console.error('[VESPA Support] Proxy API error (admin email):', errorDetails);
      // Don't throw - we still saved to Knack successfully
      return false;
    }
    
    // Send user confirmation email
    const userResponse = await fetch(sendGridConfig.proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userEmailData)
    });
    
    // Check if user email was successful
    if (!userResponse.ok) {
      let errorDetails = 'Unknown error';
      try {
        const errorData = await userResponse.json();
        errorDetails = errorData.details || errorData.error || 'No details provided';
      } catch (e) {
        errorDetails = `Status ${userResponse.status}: ${userResponse.statusText}`;
      }
      console.error('[VESPA Support] Proxy API error (user email):', errorDetails);
      // Still return true if admin email worked but user email failed
      return adminResponse.ok;
    }
    
    console.log('[VESPA Support] Emails sent successfully via proxy');
    return true;
    
  } catch (error) {
    console.error('[VESPA Support] Error sending feedback email:', error);
    // Continue even if email fails - we've saved to Knack already
    return false;
  }
}

// --- Student Emulation Setup Module ---
// Integrated directly to avoid CDN loading issues
(function() {
  'use strict';
  
  console.log('[Student Emulation Setup] Module initializing...');
  
  // Configuration for student emulation
  const EMULATION_CONFIG = {
    KNACK_API_URL: 'https://api.knack.com/v1',
    get APP_ID() {
      if (window.Knack && window.Knack.application_id) {
        return window.Knack.application_id;
      }
      console.error('[Student Emulation Setup] No App ID found.');
      return null;
    },
    get API_KEY() {
      return '8f733aa5-dd35-4464-8348-64824d1f5f0d';
    },
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000
  };

  // Field mappings for student emulation
  const EMULATION_FIELDS = {
    OBJECT_3: {
      EMAIL: 'field_70',
      USER_ROLES: 'field_73',
      SCHOOL_CONNECTION: 'field_122'  // Staff's school/establishment connection (Connected VESPA Customer)
    },
    OBJECT_6: {
      EMAIL: 'field_20',
      ACCOUNT_STATUS: 'field_18',
      USER_ROLE: 'field_46',
      GROUP: 'field_565',
      OBJECT_10_CONNECTION: 'field_182',
      CONNECTED_CUSTOMER: 'field_179',  // Connected VESPA Customer in Object_6
      STAFF_ADMINS: 'field_190'         // Staff Admin connection
    },
    OBJECT_10: {
      EMAIL: 'field_197',
      GROUP: 'field_223',
      CONNECTED_CUSTOMER: 'field_133',  // Connected VESPA Customer in Object_10
      YEAR_GROUP: 'field_144',          // Year Group
      STAFF_ADMINS: 'field_439',        // Staff Admin connection in Object_10
      CYCLE_UNLOCKED: 'field_1679'      // Override field for questionnaire access
    },
    OBJECT_29: {
      EMAIL: 'field_2732',
      GROUP: 'field_1824',
      OBJECT_10_CONNECTION: 'field_792',
      YEAR_GROUP: 'field_1829',         // Year Group in Object_29
      STAFF_ADMINS: 'field_2069'        // Staff Admin connection in Object_29
    }
  };

  // Helper function to get API headers for emulation
  function getEmulationHeaders() {
    const appId = EMULATION_CONFIG.APP_ID;
    const apiKey = EMULATION_CONFIG.API_KEY;
    
    if (!appId || !apiKey) {
      throw new Error('API credentials not available for student emulation.');
    }
    
    console.log('[Student Emulation Setup] Using App ID:', appId);
    
    return {
      'X-Knack-Application-Id': appId,
      'X-Knack-REST-API-Key': apiKey,
      'Content-Type': 'application/json'
    };
  }

  // Helper function for API calls with retry logic
  async function emulationApiCall(options, retries = EMULATION_CONFIG.MAX_RETRIES) {
    if (typeof $ === 'undefined' || typeof $.ajax === 'undefined') {
      throw new Error('jQuery is not available for student emulation API calls.');
    }
    
    try {
      const response = await $.ajax({
        url: options.url,
        type: options.method || 'GET',
        headers: options.headers || getEmulationHeaders(),
        data: options.data ? JSON.stringify(options.data) : undefined,
        contentType: 'application/json',
        dataType: 'json'
      });
      return response;
    } catch (error) {
      console.error('[Student Emulation Setup] API call failed:', {
        status: error.status,
        statusText: error.statusText,
        responseText: error.responseText,
        url: options.url
      });
      
      if (retries > 0 && error.status !== 400) {
        console.log(`[Student Emulation Setup] Retrying API call, ${retries} attempts remaining`);
        await new Promise(resolve => setTimeout(resolve, EMULATION_CONFIG.RETRY_DELAY));
        return emulationApiCall(options, retries - 1);
      }
      throw error;
    }
  }

  // Check if user has Student role
  async function checkStudentRole(userEmail) {
    const filters = encodeURIComponent(JSON.stringify({
      match: 'and',
      rules: [{ field: EMULATION_FIELDS.OBJECT_3.EMAIL, operator: 'is', value: userEmail }]
    }));

    const response = await emulationApiCall({
      url: `${EMULATION_CONFIG.KNACK_API_URL}/objects/object_3/records?filters=${filters}`,
      method: 'GET'
    });

    if (!response.records || response.records.length === 0) {
      throw new Error('Staff record not found for student role check');
    }

    const staffRecord = response.records[0];
    const roles = staffRecord[EMULATION_FIELDS.OBJECT_3.USER_ROLES] || [];
    
    return roles.includes('Student') || roles.includes('profile_6');
  }

  // Get additional staff data from Object_3, Object_2, and Object_5
  async function getStaffAdditionalData(userEmail, profileData) {
    const staffData = {
      establishmentId: null,
      name: {
        prefix: '',
        firstName: '',
        lastName: ''
      },
      staffAdminIds: []  // Array for many-to-many relationship
    };

    try {
      // If we have profileData from the main app, use it first (avoid unnecessary API calls)
      if (profileData && profileData.schoolId) {
        staffData.establishmentId = profileData.schoolId;
        console.log('[Student Emulation Setup] Using establishment ID from profileData:', staffData.establishmentId);
        
        // Parse name from profileData if available
        if (profileData.name) {
          // Check if we have the full user data with field_69
          const user = Knack.getUserAttributes();
          if (user?.values?.field_69) {
            // Use the structured name data from field_69
            staffData.name.prefix = user.values.field_69.title || '';
            staffData.name.firstName = user.values.field_69.first || '';
            staffData.name.lastName = user.values.field_69.last || '';
          } else {
            // Fallback: split the name string
            const nameParts = profileData.name.split(' ');
            if (nameParts.length >= 2) {
              staffData.name.firstName = nameParts[0];
              staffData.name.lastName = nameParts.slice(1).join(' ');
            }
          }
        }
      } else {
        // Fallback: get the staff's Object_3 record if profileData not available
        const obj3Filters = encodeURIComponent(JSON.stringify({
          match: 'and',
          rules: [{ field: 'field_70', operator: 'is', value: userEmail }] // Email field in Object_3
        }));

        const obj3Response = await emulationApiCall({
          url: `${EMULATION_CONFIG.KNACK_API_URL}/objects/object_3/records?filters=${obj3Filters}&format=both`,
          method: 'GET'
        });

        if (obj3Response.records && obj3Response.records.length > 0) {
          const obj3Record = obj3Response.records[0];
          
          // Get establishment ID from field_122 (schoolConnection) - it's an array
          const establishmentConnection = obj3Record.field_122;
          
          // Extract the establishment ID (it's an array like ['603e9f97cb8481001b31183d'])
          if (establishmentConnection) {
            if (Array.isArray(establishmentConnection) && establishmentConnection.length > 0) {
              // The ID is the first element of the array
              staffData.establishmentId = establishmentConnection[0];
            } else if (typeof establishmentConnection === 'string') {
              staffData.establishmentId = establishmentConnection;
            }
          }
          
          console.log('[Student Emulation Setup] Found establishment ID from Object_3:', staffData.establishmentId);
          
          // Get name from Object_3 field_69 (structured object)
          if (obj3Record.field_69) {
            if (typeof obj3Record.field_69 === 'object') {
              staffData.name.prefix = obj3Record.field_69.title || '';
              staffData.name.firstName = obj3Record.field_69.first || '';
              staffData.name.lastName = obj3Record.field_69.last || '';
            }
          }
        }
      }

      // Get Object_2 data if we need additional name information
      const obj2Filters = encodeURIComponent(JSON.stringify({
        match: 'and',
        rules: [{ field: 'field_32', operator: 'is', value: userEmail }] // Email field in Object_2
      }));

      const obj2Response = await emulationApiCall({
        url: `${EMULATION_CONFIG.KNACK_API_URL}/objects/object_2/records?filters=${obj2Filters}`,
        method: 'GET'
      });

      if (obj2Response.records && obj2Response.records.length > 0) {
        const obj2Record = obj2Response.records[0];
        
        // Get name fields from Object_2 (override if available)
        if (obj2Record.field_309) staffData.name.prefix = obj2Record.field_309;
        if (obj2Record.field_17) staffData.name.firstName = obj2Record.field_17;
        if (obj2Record.field_18) staffData.name.lastName = obj2Record.field_18;
        
        // If we didn't get establishment from Object_3, obj2Record itself IS the establishment
        if (!staffData.establishmentId && obj2Record.id) {
          staffData.establishmentId = obj2Record.id;
          console.log('[Student Emulation Setup] Using Object_2 record as establishment:', staffData.establishmentId);
        }
      }

      // Get Object_5 data (Staff Admins for the same establishment)
      // Search by establishment/customer field_110, not by email
      if (staffData.establishmentId) {
        const obj5Filters = encodeURIComponent(JSON.stringify({
          match: 'and',
          rules: [{ field: 'field_110', operator: 'is', value: staffData.establishmentId }]
        }));

        const obj5Response = await emulationApiCall({
          url: `${EMULATION_CONFIG.KNACK_API_URL}/objects/object_5/records?filters=${obj5Filters}`,
          method: 'GET'
        });

        if (obj5Response.records && obj5Response.records.length > 0) {
          // Collect ALL staff admin IDs as an array (many-to-many relationship)
          staffData.staffAdminIds = obj5Response.records.map(record => record.id);
          console.log('[Student Emulation Setup] Found Staff Admin IDs for establishment:', staffData.staffAdminIds);
        } else {
          staffData.staffAdminIds = [];
          console.log('[Student Emulation Setup] No Staff Admins found for establishment:', staffData.establishmentId);
        }
      } else {
        staffData.staffAdminIds = [];
        console.log('[Student Emulation Setup] No establishment ID, cannot search for Staff Admins');
      }

      console.log('[Student Emulation Setup] Additional staff data collected:', staffData);

    } catch (error) {
      console.error('[Student Emulation Setup] Error fetching additional data:', error);
      // Continue with partial data rather than failing completely
    }

    return staffData;
  }

  // Add Student role to user
  async function addStudentRole(userEmail) {
    const filters = encodeURIComponent(JSON.stringify({
      match: 'and',
      rules: [{ field: EMULATION_FIELDS.OBJECT_3.EMAIL, operator: 'is', value: userEmail }]
    }));

    const response = await emulationApiCall({
      url: `${EMULATION_CONFIG.KNACK_API_URL}/objects/object_3/records?filters=${filters}&format=both`,
      method: 'GET'
    });

    if (!response.records || response.records.length === 0) {
      throw new Error('Staff record not found for role update');
    }

    const staffRecord = response.records[0];
    
    console.log('[Student Emulation Setup] Current roles:', staffRecord[EMULATION_FIELDS.OBJECT_3.USER_ROLES]);
    
    let currentRolesRaw = staffRecord[`${EMULATION_FIELDS.OBJECT_3.USER_ROLES}_raw`] || [];
    
    if (!currentRolesRaw || currentRolesRaw.length === 0) {
      currentRolesRaw = staffRecord[EMULATION_FIELDS.OBJECT_3.USER_ROLES] || [];
    }
    
    if (!Array.isArray(currentRolesRaw)) {
      currentRolesRaw = [currentRolesRaw];
    }
    
    if (currentRolesRaw.length === 0) {
      console.error('[Student Emulation Setup] No existing roles found - aborting to prevent role loss');
      throw new Error('Safety check failed: No existing roles found');
    }
    
    const hasStudentRole = currentRolesRaw.some(role => {
      if (typeof role === 'string') {
        return role === 'Student' || role === 'profile_6';
      }
      if (typeof role === 'object' && role.id) {
        return role.id === 'profile_6' || role.identifier === 'profile_6';
      }
      return false;
    });
    
    if (hasStudentRole) {
      console.log('[Student Emulation Setup] User already has Student role');
      return;
    }
    
    const updatedRoles = [...currentRolesRaw, 'profile_6'];
    
    console.log('[Student Emulation Setup] Updating roles to:', updatedRoles);
    
    if (updatedRoles.length <= currentRolesRaw.length) {
      throw new Error('Safety check failed: Role count did not increase');
    }

    await emulationApiCall({
      url: `${EMULATION_CONFIG.KNACK_API_URL}/objects/object_3/records/${staffRecord.id}`,
      method: 'PUT',
      data: {
        [EMULATION_FIELDS.OBJECT_3.USER_ROLES]: updatedRoles
      }
    });
    
    console.log('[Student Emulation Setup] Role update completed');
  }

  // Create Object_10 record
  async function createObject10Record(userEmail, staffData) {
    console.log('[Student Emulation Setup] Creating Object_10 record...');
    
    const filters = encodeURIComponent(JSON.stringify({
      match: 'and',
      rules: [{ field: EMULATION_FIELDS.OBJECT_10.EMAIL, operator: 'is', value: userEmail }]
    }));

    const existingResponse = await emulationApiCall({
      url: `${EMULATION_CONFIG.KNACK_API_URL}/objects/object_10/records?filters=${filters}`,
      method: 'GET'
    });

    if (existingResponse.records && existingResponse.records.length > 0) {
      console.log('[Student Emulation Setup] Object_10 record already exists - updating');
      
      // Update existing record with all required fields
      const recordId = existingResponse.records[0].id;
      const updateData = {
        [EMULATION_FIELDS.OBJECT_10.GROUP]: 'EMULATED',  // Ensure group is EMULATED
        [EMULATION_FIELDS.OBJECT_10.YEAR_GROUP]: '12',  // Year Group = 12
        [EMULATION_FIELDS.OBJECT_10.CYCLE_UNLOCKED]: 'Yes',  // Unlock questionnaire for staff
        field_568: 'Level 3',  // Default to Level 3 (A-Level) for report text matching - field_568 is the Level field
        field_187: {
          prefix: staffData.name.prefix,
          first: staffData.name.firstName,
          last: staffData.name.lastName
        }
      };
      
      // Add establishment connection if available (field_133)
      if (staffData.establishmentId) {
        updateData[EMULATION_FIELDS.OBJECT_10.CONNECTED_CUSTOMER] = [staffData.establishmentId];
      }
      
      // Add staff admin connections if available (field_439) - many-to-many
      if (staffData.staffAdminIds && staffData.staffAdminIds.length > 0) {
        updateData[EMULATION_FIELDS.OBJECT_10.STAFF_ADMINS] = staffData.staffAdminIds;
      }
      
      await emulationApiCall({
        url: `${EMULATION_CONFIG.KNACK_API_URL}/objects/object_10/records/${recordId}`,
        method: 'PUT',
        data: updateData
      });
      
      return existingResponse.records[0];
    }

    // Create new record with all required fields
    const recordData = {
      [EMULATION_FIELDS.OBJECT_10.EMAIL]: userEmail,
      [EMULATION_FIELDS.OBJECT_10.GROUP]: 'EMULATED',  // Changed from 'STAFF' to avoid filtering
      [EMULATION_FIELDS.OBJECT_10.YEAR_GROUP]: '12',  // Year Group = 12
      [EMULATION_FIELDS.OBJECT_10.CYCLE_UNLOCKED]: 'Yes',  // Unlock questionnaire for staff
      field_568: 'Level 3',  // Default to Level 3 (A-Level) for report text matching - field_568 is the Level field
      field_187: {  // Name field
        prefix: staffData.name.prefix,
        first: staffData.name.firstName,
        last: staffData.name.lastName
      }
    };
    
    // Add establishment connection if available (field_133)
    if (staffData.establishmentId) {
      recordData[EMULATION_FIELDS.OBJECT_10.CONNECTED_CUSTOMER] = [staffData.establishmentId];
    }
    
    // Add staff admin connections if available (field_439) - many-to-many
    if (staffData.staffAdminIds && staffData.staffAdminIds.length > 0) {
      recordData[EMULATION_FIELDS.OBJECT_10.STAFF_ADMINS] = staffData.staffAdminIds;
    }

    const response = await emulationApiCall({
      url: `${EMULATION_CONFIG.KNACK_API_URL}/objects/object_10/records`,
      method: 'POST',
      data: recordData
    });

    console.log('[Student Emulation Setup] Object_10 record created with all fields');
    return response;
  }

  // Create Object_29 record
  async function createObject29Record(userEmail, object10Id, staffData) {
    console.log('[Student Emulation Setup] Creating Object_29 record...');
    
    const filters = encodeURIComponent(JSON.stringify({
      match: 'and',
      rules: [{ field: EMULATION_FIELDS.OBJECT_29.EMAIL, operator: 'is', value: userEmail }]
    }));

    const existingResponse = await emulationApiCall({
      url: `${EMULATION_CONFIG.KNACK_API_URL}/objects/object_29/records?filters=${filters}`,
      method: 'GET'
    });

    if (existingResponse.records && existingResponse.records.length > 0) {
      console.log('[Student Emulation Setup] Object_29 record already exists - updating');
      
      // Update existing record with additional fields
      const recordId = existingResponse.records[0].id;
      const updateData = {
        [EMULATION_FIELDS.OBJECT_29.GROUP]: 'EMULATED',  // Ensure group is EMULATED
        [EMULATION_FIELDS.OBJECT_29.YEAR_GROUP]: '12',  // Year Group = 12
        [EMULATION_FIELDS.OBJECT_29.OBJECT_10_CONNECTION]: [object10Id],  // Ensure Object_10 connection (field_792)
        field_1823: {  // Name field
          prefix: staffData.name.prefix,
          first: staffData.name.firstName,
          last: staffData.name.lastName
        }
      };
      
      // Add connected establishment if available (field_1821)
      if (staffData.establishmentId) {
        updateData.field_1821 = [staffData.establishmentId];
      }
      
      // Add staff admin connections if available (field_2069) - many-to-many
      if (staffData.staffAdminIds && staffData.staffAdminIds.length > 0) {
        updateData[EMULATION_FIELDS.OBJECT_29.STAFF_ADMINS] = staffData.staffAdminIds;
      }
      
      await emulationApiCall({
        url: `${EMULATION_CONFIG.KNACK_API_URL}/objects/object_29/records/${recordId}`,
        method: 'PUT',
        data: updateData
      });
      
      return existingResponse.records[0];
    }

    // Create new record with all fields
    const recordData = {
      [EMULATION_FIELDS.OBJECT_29.EMAIL]: userEmail,
      [EMULATION_FIELDS.OBJECT_29.GROUP]: 'EMULATED',  // Changed from 'STAFF' to avoid filtering
      [EMULATION_FIELDS.OBJECT_29.YEAR_GROUP]: '12',  // Year Group = 12
      [EMULATION_FIELDS.OBJECT_29.OBJECT_10_CONNECTION]: [object10Id],  // field_792
      field_1823: {  // Name field
        prefix: staffData.name.prefix,
        first: staffData.name.firstName,
        last: staffData.name.lastName
      }
    };
    
    // Add connected establishment if available (field_1821)
    if (staffData.establishmentId) {
      recordData.field_1821 = [staffData.establishmentId];
    }
    
    // Add staff admin connections if available (field_2069) - many-to-many
    if (staffData.staffAdminIds && staffData.staffAdminIds.length > 0) {
      recordData[EMULATION_FIELDS.OBJECT_29.STAFF_ADMINS] = staffData.staffAdminIds;
    }

    const response = await emulationApiCall({
      url: `${EMULATION_CONFIG.KNACK_API_URL}/objects/object_29/records`,
      method: 'POST',
      data: recordData
    });

    console.log('[Student Emulation Setup] Object_29 record created with all fields');
    return response;
  }

  // Create or update Object_6 record
  async function setupObject6Record(userEmail, object10Id, staffData) {
    console.log('[Student Emulation Setup] Setting up Object_6 record...');
    
    const filters = encodeURIComponent(JSON.stringify({
      match: 'and',
      rules: [{ field: EMULATION_FIELDS.OBJECT_6.EMAIL, operator: 'is', value: userEmail }]
    }));

    const existingResponse = await emulationApiCall({
      url: `${EMULATION_CONFIG.KNACK_API_URL}/objects/object_6/records?filters=${filters}`,
      method: 'GET'
    });

    if (existingResponse.records && existingResponse.records.length > 0) {
      console.log('[Student Emulation Setup] Updating existing Object_6 record');
      const recordId = existingResponse.records[0].id;
      
      const updateData = {
        [EMULATION_FIELDS.OBJECT_6.GROUP]: 'EMULATED',  // Changed from 'STAFF' to avoid filtering
        [EMULATION_FIELDS.OBJECT_6.OBJECT_10_CONNECTION]: [object10Id]  // field_182
      };
      
      // Add connected establishment if available (field_179)
      if (staffData.establishmentId) {
        updateData[EMULATION_FIELDS.OBJECT_6.CONNECTED_CUSTOMER] = [staffData.establishmentId];
      }
      
      // Add connected staff admin if available (field_190) - many-to-many
      if (staffData.staffAdminIds && staffData.staffAdminIds.length > 0) {
        updateData[EMULATION_FIELDS.OBJECT_6.STAFF_ADMINS] = staffData.staffAdminIds;
      }
      
      await emulationApiCall({
        url: `${EMULATION_CONFIG.KNACK_API_URL}/objects/object_6/records/${recordId}`,
        method: 'PUT',
        data: updateData
      });
    } else {
      console.log('[Student Emulation Setup] Creating new Object_6 record');
      
      const createData = {
        [EMULATION_FIELDS.OBJECT_6.EMAIL]: userEmail,
        [EMULATION_FIELDS.OBJECT_6.ACCOUNT_STATUS]: 'Active',
        [EMULATION_FIELDS.OBJECT_6.USER_ROLE]: 'Student',
        [EMULATION_FIELDS.OBJECT_6.GROUP]: 'EMULATED',  // Changed from 'STAFF' to avoid filtering
        [EMULATION_FIELDS.OBJECT_6.OBJECT_10_CONNECTION]: [object10Id]  // field_182
      };
      
      // Add connected establishment if available (field_179)
      if (staffData.establishmentId) {
        createData[EMULATION_FIELDS.OBJECT_6.CONNECTED_CUSTOMER] = [staffData.establishmentId];
      }
      
      // Add connected staff admin if available (field_190) - many-to-many
      if (staffData.staffAdminIds && staffData.staffAdminIds.length > 0) {
        createData[EMULATION_FIELDS.OBJECT_6.STAFF_ADMINS] = staffData.staffAdminIds;
      }
      
      await emulationApiCall({
        url: `${EMULATION_CONFIG.KNACK_API_URL}/objects/object_6/records`,
        method: 'POST',
        data: createData
      });
    }
  }

  // Main setup function
  async function setupStudentEmulation(userEmail, userId, profileData) {
    console.log('[Student Emulation Setup] Starting setup for:', userEmail);
    
    try {
      const hasStudentRole = await checkStudentRole(userEmail);
      
      if (hasStudentRole) {
        console.log('[Student Emulation Setup] User already has Student role');
        return { success: true, message: 'User already has Student role' };
      }

      console.log('[Student Emulation Setup] User needs Student role - proceeding with setup...');

      // Get additional data needed for records (pass profileData if available)
      const staffData = await getStaffAdditionalData(userEmail, profileData);
      
      await addStudentRole(userEmail);
      const object10Record = await createObject10Record(userEmail, staffData);
      await createObject29Record(userEmail, object10Record.id, staffData);
      await setupObject6Record(userEmail, object10Record.id, staffData);

      console.log('[Student Emulation Setup] Setup completed successfully!');
      return { success: true, message: 'Student emulation setup completed' };

    } catch (error) {
      console.error('[Student Emulation Setup] Error during setup:', error);
      return { success: false, error: error.message || 'Unknown error occurred' };
    }
  }

  // Expose the setup function globally
  window.StaffStudentEmulationSetup = {
    setup: async function(userEmail, userId, profileData) {
      if (!userEmail) {
        console.error('[Student Emulation Setup] No user email provided');
        return { success: false, error: 'No user email provided' };
      }
      return await setupStudentEmulation(userEmail, userId, profileData);
    },
    config: EMULATION_CONFIG
  };

  console.log('[Student Emulation Setup] Module initialized and ready');
})();

// === CYCLE MANAGEMENT MODAL FUNCTIONS ===

// Define constants if not already available
const CYCLE_KNACK_API_URL = 'https://api.knack.com/v1';

// Helper function to get API headers for cycle management
function getCycleHeaders() {
  try {
    // Try to use global getKnackHeaders if available
    if (typeof getKnackHeaders === 'function') {
      return getKnackHeaders();
    }
  } catch (e) {
    // Continue to fallback
  }
  
  // Fallback to manual header construction
  const appId = window.Knack?.application_id || '5ee90912c38ae7001510c1a9';
  const apiKey = '8f733aa5-dd35-4464-8348-64824d1f5f0d';
  const userToken = typeof Knack !== 'undefined' ? Knack.getUserToken() : null;
  
  const headers = {
    'X-Knack-Application-Id': appId,
    'X-Knack-REST-API-Key': apiKey,
    'Content-Type': 'application/json'
  };
  
  // Add authorization if available
  if (userToken) {
    headers['Authorization'] = userToken;
  }
  
  return headers;
}

// Function to open the cycle management modal
window.openCycleManagementModal = async function() {
  console.log('[Staff Homepage] Opening cycle management modal...');
  
  try {
    // Get the current user and their school ID
    const user = Knack.getUserAttributes();
    if (!user || !user.email) {
      alert('Unable to verify user authentication');
      return;
    }
    
    // Get the staff record to find the connected customer
    let staffRecord;
    try {
      // Use the API directly since findStaffRecord might not be in global scope
      const filters = encodeURIComponent(JSON.stringify({
        match: 'and',
        rules: [
          { field: 'field_70', operator: 'is', value: user.email }
        ]
      }));
      
      const response = await $.ajax({
        url: `${CYCLE_KNACK_API_URL}/objects/object_3/records?filters=${filters}`,
        type: 'GET',
        headers: getCycleHeaders()
      });
      
      if (response && response.records && response.records.length > 0) {
        staffRecord = response.records[0];
      } else {
        alert('Unable to find staff record');
        return;
      }
    } catch (error) {
      console.error('[Staff Homepage] Error finding staff record:', error);
      alert('Unable to find staff record');
      return;
    }
    
    // Extract the customer ID from field_122
    const customerConnection = staffRecord.field_122;
    let customerId = null;
    
    if (customerConnection) {
      if (Array.isArray(customerConnection) && customerConnection.length > 0) {
        // Handle array of objects or strings
        const firstItem = customerConnection[0];
        if (typeof firstItem === 'object' && firstItem.id) {
          customerId = firstItem.id;
        } else if (typeof firstItem === 'string') {
          // Check if it's HTML and extract the class name (which contains the ID)
          if (firstItem.includes('class="')) {
            const match = firstItem.match(/class="([^"]+)"/);
            if (match && match[1]) {
              customerId = match[1];
            } else {
              customerId = firstItem;
            }
          } else {
            customerId = firstItem;
          }
        } else {
          customerId = firstItem;
        }
      } else if (typeof customerConnection === 'string') {
        // Check if it's HTML and extract the class name (which contains the ID)
        if (customerConnection.includes('class="')) {
          const match = customerConnection.match(/class="([^"]+)"/);
          if (match && match[1]) {
            customerId = match[1];
          } else {
            customerId = customerConnection;
          }
        } else {
          customerId = customerConnection;
        }
      } else if (typeof customerConnection === 'object' && customerConnection.id) {
        customerId = customerConnection.id;
      }
    }
    
    // Ensure customerId is a string, not an object or HTML
    if (customerId && typeof customerId === 'object' && customerId.id) {
      console.log('[Staff Homepage] Extracting ID from customer object:', customerId);
      customerId = customerId.id;
    } else if (customerId && typeof customerId === 'string' && customerId.includes('<')) {
      // Extract ID from HTML if it still contains HTML
      const match = customerId.match(/class="([^"]+)"/);
      if (match && match[1]) {
        customerId = match[1];
      }
    }
    
    if (!customerId) {
      alert('Unable to find your connected school/customer');
      return;
    }
    
    console.log('[Staff Homepage] Customer ID for cycles:', customerId);
    
    // Show loading state
    showCycleModal('loading');
    
    // Fetch existing cycle records from object_66
    const cycles = await fetchCycleRecords(customerId);
    
    // Show the modal with cycle data
    showCycleModal('loaded', cycles, customerId);
    
  } catch (error) {
    console.error('[Staff Homepage] Error opening cycle management:', error);
    alert('Error loading cycle management. Please try again.');
  }
};

// Function to fetch cycle records from object_66
async function fetchCycleRecords(customerId) {
  // Ensure customerId is a string and not HTML
  if (customerId && typeof customerId === 'object' && customerId.id) {
    customerId = customerId.id;
  } else if (customerId && typeof customerId === 'string' && customerId.includes('<')) {
    // Extract ID from HTML span if needed
    const match = customerId.match(/class="([^"]+)"/);
    if (match && match[1]) {
      customerId = match[1];
    }
  }
  
  console.log('[Staff Homepage] Fetching cycle records for customer ID:', customerId);
  
  // Validate customerId is a valid string and looks like a Knack ID
  if (!customerId || typeof customerId !== 'string' || customerId.includes('<')) {
    console.error('[Staff Homepage] Invalid customer ID:', customerId);
    throw new Error('Invalid customer ID');
  }
  
  const filters = encodeURIComponent(JSON.stringify({
    match: 'and',
    rules: [
      { field: 'field_1585', operator: 'is', value: customerId }
    ]
  }));
  
  try {
    // Use jQuery ajax directly for reliability
    const response = await $.ajax({
      url: `${CYCLE_KNACK_API_URL}/objects/object_66/records?filters=${filters}&rows_per_page=100`,
      type: 'GET',
      headers: getCycleHeaders()
    });
    
    console.log(`[Staff Homepage] Found ${response.records?.length || 0} cycle records`);
    
    // Process and validate cycles
    return processCycleRecords(response.records || [], customerId);
    
  } catch (error) {
    console.error('[Staff Homepage] Error fetching cycles:', error);
    // Return empty cycles instead of throwing
    return {
      1: { id: null, cycleNumber: 1, startDate: '', endDate: '', staffAdmins: [], isNew: true },
      2: { id: null, cycleNumber: 2, startDate: '', endDate: '', staffAdmins: [], isNew: true },
      3: { id: null, cycleNumber: 3, startDate: '', endDate: '', staffAdmins: [], isNew: true },
      extras: []
    };
  }
}

// Process and validate cycle records
function processCycleRecords(records, customerId) {
  const cycles = {
    1: null,
    2: null,
    3: null,
    extras: []
  };
  
  // Sort records into cycles
  records.forEach(record => {
    const cycleNum = parseInt(record.field_1579) || 0;
    
    if (cycleNum >= 1 && cycleNum <= 3) {
      if (cycles[cycleNum]) {
        // Duplicate cycle number - add to extras for cleanup
        cycles.extras.push(record);
      } else {
        cycles[cycleNum] = {
          id: record.id,
          cycleNumber: cycleNum,
          startDate: record.field_1678 || '',
          endDate: record.field_1580 || '',
          staffAdmins: record.field_2671 || []
        };
      }
    } else {
      // Invalid cycle number
      cycles.extras.push(record);
    }
  });
  
  // Log any issues found
  if (cycles.extras.length > 0) {
    console.warn(`[Staff Homepage] Found ${cycles.extras.length} extra/invalid cycle records that need cleanup`);
  }
  
  // Check for missing cycles
  const missingCycles = [];
  for (let i = 1; i <= 3; i++) {
    if (!cycles[i]) {
      missingCycles.push(i);
      // Initialize empty cycle
      cycles[i] = {
        id: null,
        cycleNumber: i,
        startDate: '',
        endDate: '',
        staffAdmins: [],
        isNew: true
      };
    }
  }
  
  if (missingCycles.length > 0) {
    console.log(`[Staff Homepage] Missing cycles: ${missingCycles.join(', ')} - will prompt to create`);
  }
  
  return cycles;
}

// Show the cycle management modal
function showCycleModal(state, cycles, customerId) {
  // Remove any existing modal
  const existingModal = document.getElementById('cycle-management-modal');
  if (existingModal) {
    existingModal.remove();
  }
  
  if (state === 'loading') {
    // Show loading modal
    const loadingModal = `
      <div id="cycle-management-modal" class="vespa-modal" style="display: block;">
        <div class="vespa-modal-content" style="max-width: 600px;">
          <h3>Loading Cycle Management...</h3>
          <div style="text-align: center; padding: 40px;">
            <div class="api-loading-spinner" style="margin: 0 auto;"></div>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', loadingModal);
    return;
  }
  
  // Helper function to convert DD/MM/YYYY to YYYY-MM-DD for date input
  const convertToInputDate = (dateStr) => {
    if (!dateStr || dateStr === '') return '';
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
    return '';
  };
  
  // Build the full modal with cycle data
  let cycleFormsHTML = '';
  
  for (let i = 1; i <= 3; i++) {
    const cycle = cycles[i];
    const isNew = cycle.isNew || false;
    
    // Convert UK dates to format needed for date input
    const startDateValue = convertToInputDate(cycle.startDate);
    const endDateValue = convertToInputDate(cycle.endDate);
    
    cycleFormsHTML += `
      <div class="cycle-form-section" data-cycle="${i}">
        <div style="display: flex; align-items: center; margin-bottom: 16px;">
          <div style="background: linear-gradient(135deg, #00e5db 0%, #00b8d4 100%); color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 12px;">${i}</div>
          <h4 style="color: #0a2b8c; margin: 0; flex: 1;">Cycle ${i} ${isNew ? '<span style="color: #ff6b6b; font-size: 14px; font-weight: normal;">(New - Not Yet Created)</span>' : ''}</h4>
        </div>
        <div class="cycle-form-row">
          <div class="cycle-form-group">
            <label style="display: block; margin-bottom: 8px; color: #555; font-weight: 500;">Start Date</label>
            <input type="date" 
                   id="cycle-${i}-start" 
                   class="cycle-date-input" 
                   value="${startDateValue}" 
                   min="2020-01-01"
                   max="2030-12-31"
                   data-original-value="${cycle.startDate}"
                   style="color: #333 !important; background: white !important;">
          </div>
          <div class="cycle-form-group">
            <label style="display: block; margin-bottom: 8px; color: #555; font-weight: 500;">End Date</label>
            <input type="date" 
                   id="cycle-${i}-end" 
                   class="cycle-date-input" 
                   value="${endDateValue}" 
                   min="2020-01-01"
                   max="2030-12-31"
                   data-original-value="${cycle.endDate}"
                   style="color: #333 !important; background: white !important;">
          </div>
        </div>
        <div id="cycle-${i}-validation" class="cycle-validation-message"></div>
      </div>
    `;
  }
  
  // Add extra records warning if needed
  let extraRecordsWarning = '';
  if (cycles.extras && cycles.extras.length > 0) {
    extraRecordsWarning = `
      <div class="cycle-warning" style="background-color: #fff3cd; border: 1px solid #ffc107; padding: 10px; margin-bottom: 20px; border-radius: 4px;">
        <strong>⚠️ Warning:</strong> Found ${cycles.extras.length} duplicate/invalid cycle records that will be cleaned up when you save.
      </div>
    `;
  }
  
  const modalHTML = `
    <div id="cycle-management-modal" class="vespa-modal" style="display: flex; align-items: center; justify-content: center; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; overflow-y: auto; padding: 20px;">
      <div class="vespa-modal-content" style="width: 100%; max-width: 700px; max-height: calc(100vh - 40px); display: flex; flex-direction: column; background: #ffffff; color: #333; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); margin: auto;">
        <div style="flex-shrink: 0; background: linear-gradient(135deg, #0a2b8c 0%, #15348e 100%); padding: 20px 25px; border-radius: 12px 12px 0 0; display: flex; justify-content: space-between; align-items: center;">
          <h3 style="margin: 0; color: white; font-size: 24px;">Manage Questionnaire Cycles</h3>
          <span class="vespa-modal-close" id="cycle-modal-close" style="color: white; font-size: 32px; cursor: pointer; line-height: 1; padding: 0 5px;">&times;</span>
        </div>
        <div style="flex: 1; overflow-y: auto; padding: 25px;">
        
        ${extraRecordsWarning}
        
        <div class="cycle-instructions" style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); padding: 18px; margin-bottom: 25px; border-radius: 8px; border-left: 4px solid #00e5db;">
          <p style="margin: 0 0 12px 0; color: #0a2b8c; font-weight: 600; font-size: 16px;">📋 Instructions:</p>
          <ul style="margin: 0; padding-left: 20px; color: #333; line-height: 1.6;">
            <li>Use the date pickers to select dates</li>
            <li>Cycles cannot overlap</li>
            <li>Recommended: Leave at least <strong>6 weeks</strong> between cycles</li>
            <li>All 3 cycles must have valid dates</li>
          </ul>
        </div>
        
        <div id="cycle-forms">
          ${cycleFormsHTML}
        </div>
        
        <div id="cycle-global-validation" class="cycle-validation-message" style="margin-top: 20px;"></div>
        
        <div class="vespa-modal-buttons" style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; display: flex; gap: 15px; justify-content: flex-end;">
          <button id="cycle-cancel-btn" style="padding: 12px 30px; background: #f5f5f5; color: #333; border: 1px solid #ddd; border-radius: 6px; font-size: 15px; font-weight: 500; cursor: pointer; transition: all 0.2s;">Cancel</button>
          <button class="vespa-btn vespa-btn-primary" id="cycle-save-btn" style="padding: 12px 30px; background: linear-gradient(135deg, #00e5db 0%, #00b8d4 100%); color: #0a2b8c; border: none; border-radius: 6px; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 8px rgba(0,229,219,0.3);">Save Cycles</button>
        </div>
        </div>
      </div>
    </div>
    
    <style>
      #cycle-management-modal * {
        box-sizing: border-box;
      }
      
      #cycle-management-modal .vespa-modal-close:hover {
        opacity: 0.8;
        transform: scale(1.1);
      }
      
      #cycle-management-modal button:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      }
      
      .cycle-form-section {
        background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%);
        padding: 20px;
        margin-bottom: 20px;
        border-radius: 10px;
        border: 1px solid #e0e0e0;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      }
      
      .cycle-form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
      }
      
      @media (max-width: 600px) {
        .cycle-form-row {
          grid-template-columns: 1fr;
          gap: 15px;
        }
        
        #cycle-management-modal {
          padding: 10px;
        }
        
        #cycle-management-modal .vespa-modal-content {
          width: 100%;
          max-width: none;
          max-height: calc(100vh - 20px);
        }
        
        #cycle-management-modal h3 {
          font-size: 18px !important;
        }
      }
      
      .cycle-form-group {
        display: flex;
        flex-direction: column;
      }
      
      .cycle-form-group label {
        font-weight: 600;
        margin-bottom: 5px;
        color: #333 !important;
      }
      
      .cycle-date-input {
        padding: 12px 14px;
        border: 2px solid #e0e0e0;
        border-radius: 6px;
        font-size: 15px;
        color: #333 !important;
        background-color: #ffffff !important;
        transition: all 0.2s;
        width: 100%;
      }
      
      .cycle-date-input:focus {
        outline: none;
        border-color: #00e5db;
        box-shadow: 0 0 0 3px rgba(0, 229, 219, 0.15);
        background-color: #ffffff !important;
      }
      
      .cycle-date-input::placeholder {
        color: #999 !important;
      }
      
      .cycle-validation-message {
        margin-top: 10px;
        padding: 8px;
        border-radius: 4px;
        font-size: 13px;
        display: none;
      }
      
      .cycle-validation-message.error {
        display: block;
        background-color: #ffebee;
        color: #c62828;
        border: 1px solid #ef5350;
      }
      
      .cycle-validation-message.warning {
        display: block;
        background-color: #fff3e0;
        color: #e65100;
        border: 1px solid #ff9800;
      }
      
      .cycle-validation-message.success {
        display: block;
        background-color: #e8f5e9;
        color: #2e7d32;
        border: 1px solid #66bb6a;
      }
    </style>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  // Add event listeners for close buttons
  const closeBtn = document.getElementById('cycle-modal-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeCycleModal);
  }
  
  const cancelBtn = document.getElementById('cycle-cancel-btn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', closeCycleModal);
  }
  
  // Add save button listener
  const saveBtn = document.getElementById('cycle-save-btn');
  if (saveBtn && customerId && cycles) {
    saveBtn.addEventListener('click', function() {
      saveCycles(customerId, cycles);
    });
  }
  
  // Add date input change listeners for HTML5 date inputs
  document.querySelectorAll('.cycle-date-input').forEach(input => {
    input.addEventListener('change', function(e) {
      // Date inputs automatically validate format
      const dateValue = e.target.value;
      if (dateValue) {
        e.target.style.borderColor = '#66bb6a';
      } else {
        e.target.style.borderColor = '#e0e0e0';
      }
    });
  });
}

// Convert YYYY-MM-DD to DD/MM/YYYY
function convertFromInputDate(dateValue) {
  if (!dateValue) return '';
  const parts = dateValue.split('-');
  if (parts.length === 3) {
    const year = parts[0];
    const month = parts[1];
    const day = parts[2];
    return `${day}/${month}/${year}`;
  }
  return '';
}

// Validate a date input (now using HTML5 date)
function validateSingleDate(input) {
  const dateValue = input.value;
  if (!dateValue) return false;
  
  // HTML5 date inputs handle validation automatically
  // Just check if a value exists
  if (dateValue) {
    input.style.borderColor = '#66bb6a';
    return true;
  }
  
  input.style.borderColor = '#ef5350';
  return false;
}

// Close the cycle modal
function closeCycleModal() {
  const modal = document.getElementById('cycle-management-modal');
  if (modal) {
    modal.remove();
  }
}
window.closeCycleModal = closeCycleModal;

// Update the cycle display in the DOM without page reload
function updateCycleDisplay(cycleData) {
  console.log('[Staff Homepage] Updating cycle display with fresh data:', cycleData);
  
  if (!cycleData) {
    console.error('[Staff Homepage] No cycle data to update display');
    return;
  }
  
  // Find the cycle section container
  const cycleSection = document.querySelector('.cycle-section-container');
  if (!cycleSection) {
    console.error('[Staff Homepage] Cycle section container not found in DOM');
    return;
  }
  
  // Determine current cycle
  const currentCycle = cycleData.currentCycle || determineCurrentCycle([
    cycleData.cycle1,
    cycleData.cycle2,
    cycleData.cycle3
  ]);
  
  // Update each cycle column
  const cycleColumns = cycleSection.querySelectorAll('.cycle-column');
  
  if (cycleColumns.length === 3) {
    // Update existing columns
    [cycleData.cycle1, cycleData.cycle2, cycleData.cycle3].forEach((cycle, index) => {
      const column = cycleColumns[index];
      if (column && cycle) {
        // Update dates
        const dateValues = column.querySelectorAll('.date-value');
        if (dateValues.length >= 2) {
          dateValues[0].textContent = cycle.start || 'No date set';
          dateValues[1].textContent = cycle.end || 'No date set';
        }
        
        // Update current badge
        const isCurrent = (index + 1) === currentCycle;
        column.classList.toggle('current-cycle', isCurrent);
        
        const header = column.querySelector('.cycle-header');
        let badge = header?.querySelector('.current-badge');
        
        if (isCurrent) {
          if (!badge) {
            // Add current badge if it doesn't exist
            header?.insertAdjacentHTML('beforeend', '<span class="current-badge">Current</span>');
          }
        } else {
          // Remove current badge if it exists
          badge?.remove();
        }
      }
    });
    
    console.log('[Staff Homepage] Cycle display updated successfully');
  } else {
    console.log('[Staff Homepage] Regenerating entire cycle section');
    
    // Get admin status
    const hasAdminRole = document.getElementById('manage-cycles-btn') !== null;
    
    // Regenerate the entire cycle section HTML
    const newCycleHTML = renderCycleSection(cycleData, hasAdminRole);
    
    // Replace the old content
    cycleSection.innerHTML = newCycleHTML;
    
    // Re-attach event listeners
    setupCycleRefresh(Knack.getUserAttributes().id, cycleData.schoolId);
    
    // Re-attach manage cycles button if admin
    if (hasAdminRole) {
      const manageCyclesBtn = document.getElementById('manage-cycles-btn');
      if (manageCyclesBtn) {
        manageCyclesBtn.addEventListener('click', async () => {
          console.log('[Staff Homepage] Manage Cycles button clicked');
          
          // Show loading modal first
          showCycleModal('loading', null, null);
          
          // Fetch the customer ID and cycles
          const profileData = await getStaffProfileData();
          const schoolId = profileData?.schoolId;
          
          if (schoolId) {
            const cycles = await fetchCycleRecords(schoolId);
            const processedCycles = processCycleRecords(cycles, schoolId);
            
            // Show the modal with data
            showCycleModal('data', processedCycles, schoolId);
          } else {
            console.error('[Staff Homepage] Could not determine school ID for cycles');
            closeCycleModal();
            alert('Unable to load cycle management. Please refresh and try again.');
          }
        });
      }
    }
  }
}
window.updateCycleDisplay = updateCycleDisplay;

// Save cycles function
window.saveCycles = async function(customerId, existingCycles) {
  console.log('[Staff Homepage] Saving cycles for customer:', customerId);
  
  // Collect and validate all cycle data
  const newCycles = {};
  const validationErrors = [];
  const warnings = [];
  
  // Collect all dates
  for (let i = 1; i <= 3; i++) {
    const startInput = document.getElementById(`cycle-${i}-start`);
    const endInput = document.getElementById(`cycle-${i}-end`);
    
    if (!startInput || !endInput) continue;
    
    const startDateValue = startInput.value.trim();
    const endDateValue = endInput.value.trim();
    
    // Validate required fields
    if (!startDateValue || !endDateValue) {
      validationErrors.push(`Cycle ${i}: Both start and end dates are required`);
      continue;
    }
    
    // Convert YYYY-MM-DD to DD/MM/YYYY for API
    const startDate = convertFromInputDate(startDateValue);
    const endDate = convertFromInputDate(endDateValue);
    
    // Parse dates for comparison (HTML5 date values are in YYYY-MM-DD format)
    const start = new Date(startDateValue);
    const end = new Date(endDateValue);
    
    if (start >= end) {
      validationErrors.push(`Cycle ${i}: End date must be after start date`);
      continue;
    }
    
    newCycles[i] = {
      startDate,
      endDate,
      start,
      end
    };
  }
  
  // Check for overlaps and proximity
  for (let i = 1; i <= 3; i++) {
    if (!newCycles[i]) continue;
    
    for (let j = i + 1; j <= 3; j++) {
      if (!newCycles[j]) continue;
      
      // Check for overlap
      if (
        (newCycles[i].start <= newCycles[j].end && newCycles[i].end >= newCycles[j].start) ||
        (newCycles[j].start <= newCycles[i].end && newCycles[j].end >= newCycles[i].start)
      ) {
        validationErrors.push(`Cycles ${i} and ${j} overlap. Please adjust the dates.`);
      }
      
      // Check proximity (6 weeks = 42 days)
      const gap = Math.abs(newCycles[j].start - newCycles[i].end) / (1000 * 60 * 60 * 24);
      if (gap < 42 && gap >= 0) {
        warnings.push(`Warning: Only ${Math.floor(gap)} days between Cycle ${i} end and Cycle ${j} start (recommended: 42+ days)`);
      }
    }
  }
  
  // Show validation errors
  const globalValidation = document.getElementById('cycle-global-validation');
  
  if (validationErrors.length > 0) {
    globalValidation.className = 'cycle-validation-message error';
    globalValidation.innerHTML = '<strong>Errors:</strong><br>' + validationErrors.join('<br>');
    return;
  }
  
  // Show warnings but allow save
  if (warnings.length > 0) {
    const proceed = confirm(warnings.join('\n\n') + '\n\nDo you want to continue anyway?');
    if (!proceed) return;
  }
  
  // Show saving state
  globalValidation.className = 'cycle-validation-message success';
  globalValidation.innerHTML = 'Saving cycles...';
  
  try {
    // Clean up extra records first
    if (existingCycles.extras && existingCycles.extras.length > 0) {
      await cleanupExtraCycles(existingCycles.extras);
    }
    
    // Save each cycle
    for (let i = 1; i <= 3; i++) {
      const cycle = newCycles[i];
      if (!cycle) continue;
      
      const existingCycle = existingCycles[i];
      
      if (existingCycle && !existingCycle.isNew) {
        // Update existing cycle
        await updateCycleRecord(existingCycle.id, {
          field_1678: cycle.startDate,
          field_1580: cycle.endDate
        });
      } else {
        // Create new cycle
        await createCycleRecord(customerId, i, cycle.startDate, cycle.endDate);
      }
    }
    
    globalValidation.className = 'cycle-validation-message success';
    globalValidation.innerHTML = 'Cycles saved successfully! Updating display...';
    
    // Clear the cycle cache before updating
    try {
      const user = Knack.getUserAttributes();
      if (user && user.id) {
        // Build cache keys to invalidate
        const userCacheKey = CacheManager.createKey('user_cycles', `${user.id}_school_${customerId}`);
        const schoolCacheKey = CacheManager.createKey('school_vespa', customerId, false);
        
        // Invalidate the caches
        await Promise.all([
          CacheManager.invalidate(userCacheKey, 'UserCycles'),
          CacheManager.invalidate(schoolCacheKey, 'SchoolResults')
        ]);
        
        console.log('[Staff Homepage] Cycle caches invalidated successfully');
      }
    } catch (cacheError) {
      console.error('[Staff Homepage] Error invalidating cache:', cacheError);
    }
    
    // Update the cycle display directly without page reload
    try {
      // Fetch fresh cycle data with force refresh to bypass cache
      const user = Knack.getUserAttributes();
      const profileData = await getStaffProfileData();
      
      // If schoolId is null, try to get it from the customerId we're using
      let schoolId = profileData?.schoolId || customerId;
      console.log('[Staff Homepage] Using schoolId for refresh:', schoolId);
      
      // Alternative approach: Build the cycle data from what we just saved
      // This is more reliable since we know exactly what we saved
      const savedCycleData = {
        cycle1: { 
          number: 1, 
          start: newCycles[1]?.startDate || 'No date set', 
          end: newCycles[1]?.endDate || 'No date set' 
        },
        cycle2: { 
          number: 2, 
          start: newCycles[2]?.startDate || 'No date set', 
          end: newCycles[2]?.endDate || 'No date set' 
        },
        cycle3: { 
          number: 3, 
          start: newCycles[3]?.startDate || 'No date set', 
          end: newCycles[3]?.endDate || 'No date set' 
        },
        currentCycle: determineCurrentCycle([
          newCycles[1] ? { start: newCycles[1].startDate, end: newCycles[1].endDate } : null,
          newCycles[2] ? { start: newCycles[2].startDate, end: newCycles[2].endDate } : null,
          newCycles[3] ? { start: newCycles[3].startDate, end: newCycles[3].endDate } : null
        ].filter(Boolean))
      };
      
      console.log('[Staff Homepage] Using saved data to update display:', savedCycleData);
      
      // Update the display with the saved data
      updateCycleDisplay(savedCycleData);
      
      // Close the modal
      closeCycleModal();
      
      // Show success message
      showNotification('Cycles updated successfully!', 'success');
      
      // Optionally, try to fetch fresh data in the background to update cache
      // But don't wait for it or let it block the UI update
      getQuestionnaireCycleData(user.id, schoolId, true).then(freshData => {
        if (freshData) {
          console.log('[Staff Homepage] Background refresh completed');
        }
      }).catch(err => {
        console.log('[Staff Homepage] Background refresh failed, but display already updated:', err);
      });
    } catch (updateError) {
      console.error('[Staff Homepage] Error updating cycle display:', updateError);
      // Fallback to page reload
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    }
    
  } catch (error) {
    console.error('[Staff Homepage] Error saving cycles:', error);
    globalValidation.className = 'cycle-validation-message error';
    globalValidation.innerHTML = 'Error saving cycles. Please try again.';
  }
};

// Parse UK date string to Date object
function parseUKDate(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
}

// Clean up extra cycle records
async function cleanupExtraCycles(extraRecords) {
  console.log(`[Staff Homepage] Cleaning up ${extraRecords.length} extra cycle records`);
  
  for (const record of extraRecords) {
    try {
      await $.ajax({
        url: `${CYCLE_KNACK_API_URL}/objects/object_66/records/${record.id}`,
        type: 'DELETE',
        headers: getCycleHeaders()
      });
      console.log(`[Staff Homepage] Deleted extra cycle record: ${record.id}`);
    } catch (error) {
      console.error(`[Staff Homepage] Error deleting record ${record.id}:`, error);
    }
  }
}

// Update existing cycle record
async function updateCycleRecord(recordId, data) {
  console.log(`[Staff Homepage] Updating cycle record: ${recordId}`);
  
  return await $.ajax({
    url: `${CYCLE_KNACK_API_URL}/objects/object_66/records/${recordId}`,
    type: 'PUT',
    headers: getCycleHeaders(),
    data: JSON.stringify(data),
    contentType: 'application/json'
  });
}

// Create new cycle record
async function createCycleRecord(customerId, cycleNumber, startDate, endDate) {
  console.log(`[Staff Homepage] Creating new cycle ${cycleNumber} for customer: ${customerId}`);
  
  const data = {
    field_1585: [customerId], // Connected customer
    field_1579: cycleNumber.toString(), // Cycle number
    field_1678: startDate, // Start date
    field_1580: endDate // End date
  };
  
  return await $.ajax({
    url: `${CYCLE_KNACK_API_URL}/objects/object_66/records`,
    type: 'POST',
    headers: getCycleHeaders(),
    data: JSON.stringify(data),
    contentType: 'application/json'
  });
}

})(); // Close main IIFE

