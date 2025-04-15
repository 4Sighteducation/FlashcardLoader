// ReportProfiles.js - Student Profile Integration for VESPA Reports
// This script displays student profile data above individual VESPA reports
// Adapted for Multi-App Loader system

// Global config variable - will be set by loader
let REPORTPROFILE_CONFIG = null;

// Constants
const KNACK_API_URL = 'https://api.knack.com/v1';
const HOMEPAGE_OBJECT = 'object_112'; // User Profile object for homepage
const DEBUG_MODE = true; // Enable console logging
const CHECK_INTERVAL = 500; // Check every 500ms
const MAX_CHECKS = 20; // Give up after 10 seconds (20 checks)

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
let currentStudentId = null;
let previousStudentId = null; // Track previous student ID for comparison
let reportObserver = null;
let activityButtonPollInterval = null; // For continuous polling
const BUTTON_POLL_INTERVAL = 1000; // Check every 1 second
const BUTTON_POLL_MAX_ATTEMPTS = 60; // Try for up to 60 seconds (1 minute)

// Request management
let activeRequests = {}; // Track active AJAX requests
let profileCache = {}; // Cache for student profile data
const CACHE_TTL = 5 * 60 * 1000; // Cache TTL: 5 minutes
const API_COOLDOWN = 1000; // 1 second cooldown between API requests for the same resource
let lastRequestTimes = {}; // Track timestamps of last requests by resource type
let isProcessingStudent = false; // Flag to prevent concurrent student processing

// DOM update management
let isUpdatingDOM = false; // Flag to prevent observer reactions to our own DOM changes
let lastRenderedProfileHash = null; // Hash of the last rendered profile data
let lastRenderTime = 0; // Timestamp of the last profile render
const RENDER_COOLDOWN = 1000; // Minimum time between renders in milliseconds

// Debounce helper function - prevents rapid repeated API calls
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

// Main initializer function that will be called by the loader
function initializeReportProfiles() {
  debugLog("ReportProfiles initializing...");
  
  // Add CSS styles
  addStyles();
  
  // Add a visual indicator that the script is loaded
  addDebugIndicator();
  
  // Start polling for the necessary DOM elements
  startPolling();
}

// Add a small debug indicator to the page to confirm the script is loaded
function addDebugIndicator() {
  const indicator = document.createElement('div');
  indicator.id = 'profile-debug-indicator';
  indicator.style.cssText = `
    position: fixed;
    bottom: 10px;
    right: 10px;
    background-color: #079baa;
    color: white;
    padding: 5px 10px;
    border-radius: 5px;
    font-size: 12px;
    font-family: monospace;
    z-index: 9999;
    opacity: 0.8;
    cursor: pointer;
  `;
  indicator.textContent = 'Profile Script Loaded';
  indicator.addEventListener('click', function() {
    // Log debug info when clicked
    debugLog("Debug indicator clicked", {
      'reportContainer': document.querySelector('#view_2776 .kn-rich_text__content') ? 'Found' : 'Not found',
      'profileContainer': document.querySelector('#view_3015 .kn-rich_text__content') ? 'Found' : 'Not found',
      'activityButton': document.querySelector('#view-activities-button a') ? 'Found' : 'Not found',
      'studentNameInReport': document.querySelector('#view_2776 .kn-rich_text__content')?.textContent.includes('STUDENT:') ? 'Found' : 'Not found',
      'currentStudent': currentStudentId,
      'cachedProfiles': Object.keys(profileCache)
    });
    
    // Dump the report content to console
    const reportContent = document.querySelector('#view_2776 .kn-rich_text__content')?.innerHTML || '';
    debugLog("Report content sample", reportContent.substring(0, 500));
  });
  document.body.appendChild(indicator);
}

// Poll for the necessary DOM elements
function startPolling() {
  debugLog("Starting to poll for report containers...");
  let checkCount = 0;
  
  const checkInterval = setInterval(function() {
    // Check if the report elements exist
    const reportContainer = document.querySelector('#view_2776 .kn-rich_text__content');
    const profileContainer = document.querySelector('#view_3015 .kn-rich_text__content');
    
    if (reportContainer && profileContainer) {
      // Elements found, clear the interval
      clearInterval(checkInterval);
      debugLog("Report containers found", { 
        reportContainer: '#view_2776 .kn-rich_text__content', 
        profileContainer: '#view_3015 .kn-rich_text__content' 
      });
      
      // Set up MutationObserver to watch for changes
      setupObservers(reportContainer, profileContainer);
      
      // Check immediately in case the report is already showing
      checkForIndividualReport(reportContainer, profileContainer);
    } else {
      checkCount++;
      if (checkCount >= MAX_CHECKS) {
        clearInterval(checkInterval);
        console.error("[ReportProfiles] Could not find report containers after maximum attempts");
      }
    }
  }, CHECK_INTERVAL);
}

// Debug logging helper
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

function setupObservers(reportContainer, profileContainer) {
  // Clean up any existing observer
  if (reportObserver) {
    reportObserver.disconnect();
  }
  
  // Create a new observer with debounced handler
  const debouncedHandler = debounce((mutations) => {
    // Skip handling if we're in the middle of updating the DOM ourselves
    if (isUpdatingDOM) {
      debugLog("Observer triggered while updating DOM - skipping");
      return;
    }
    handleReportChanges(reportContainer, profileContainer);
  }, 500); // Increased debounce time to prevent excessive triggering
  
  reportObserver = new MutationObserver(debouncedHandler);
  
  // Start observing the report container with more thorough options
  reportObserver.observe(reportContainer, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true
  });
  
  // Also observe the entire document body for navigation events and buttons
  const debouncedDocHandler = debounce((mutations) => {
    // Skip handling if we're in the middle of updating the DOM ourselves
    if (isUpdatingDOM) {
      debugLog("Document observer triggered while updating DOM - skipping");
      return;
    }
    
    // Check if our target button has appeared
    const activityButton = document.querySelector('#view-activities-button');
    
    // Check for navigation events (back button clicks)
    const backButton = document.querySelector('a.p-button[aria-label="BACK"]') || 
                       document.querySelector('button[aria-label="BACK"]');
    
    // Check if we're showing the group view table
    const groupViewTable = document.querySelector('#studentReports .p-datatable');
    
    if (groupViewTable && !backButton) {
      // We're likely back to the group view - clear the profile
      debugLog("Detected return to group view through DOM mutation");
      clearProfileView(profileContainer);
    } else if (activityButton) {
      debugLog("Found view-activities-button in document observation", activityButton);
      handleReportChanges(reportContainer, profileContainer);
    }
  }, 500); // Use same debounce time as main handler
  
  const docObserver = new MutationObserver(debouncedDocHandler);
  
  // Observe the document body for any changes
  docObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  debugLog("Report observers set up");
  
  // Start the activity button poller as a backup
  startActivityButtonPoller(reportContainer, profileContainer);
}

// Start polling for the activity button
function startActivityButtonPoller(reportContainer, profileContainer) {
  // Clear any existing interval
  if (activityButtonPollInterval) {
    clearInterval(activityButtonPollInterval);
  }
  
  // Start a new polling interval
  let attempts = 0;
  activityButtonPollInterval = setInterval(() => {
    attempts++;
    
    // Look for the button
    const activityButton = document.querySelector('#view-activities-button a') || 
                          document.querySelector('[data-v-7636e366] a');
    
    if (activityButton) {
      debugLog(`Activity button found after ${attempts} attempts!`, activityButton);
      // Process the report
      handleReportChanges(reportContainer, profileContainer);
      // Stop polling
      clearInterval(activityButtonPollInterval);
      activityButtonPollInterval = null;
    } else if (attempts >= BUTTON_POLL_MAX_ATTEMPTS) {
      // Give up after max attempts
      debugLog(`Activity button polling stopped after ${attempts} attempts without finding the button.`);
      clearInterval(activityButtonPollInterval);
      activityButtonPollInterval = null;
    }
  }, BUTTON_POLL_INTERVAL);
  
  debugLog(`Started activity button polling with ${BUTTON_POLL_INTERVAL}ms interval`);
}

function checkForIndividualReport(reportContainer, profileContainer) {
  // This checks if an individual report is already displayed when the script loads
  debugLog("Checking for existing student report...");
  
  // Look for student name element which would indicate we're on an individual report
  const reportContent = reportContainer.innerHTML || '';
  const hasStudentName = reportContent.includes('STUDENT:');
  
  // Check for the presence of the back button - another indicator of being on a student report
  const backButton = document.querySelector('a.p-button[aria-label="BACK"]') || 
                     document.querySelector('button[aria-label="BACK"]');
  
  // Check if we're showing the group view table
  const groupViewTable = document.querySelector('#studentReports .p-datatable');
  
  debugLog(`Report content check: contains "STUDENT:": ${hasStudentName}, Back button: ${backButton ? 'Found' : 'Not found'}, Group table: ${groupViewTable ? 'Found' : 'Not found'}`);
  
  // Clear any existing profile data if we're not on a student report or we're on the group view
  if ((!hasStudentName && !backButton) || groupViewTable) {
    debugLog("Not on an individual student report, clearing profile view");
    clearProfileView(profileContainer);
    return;
  }
  
  // If we find evidence of being on a student report, try to process it
  if (hasStudentName || backButton) {
    debugLog("Found evidence of student report, processing...");
    handleReportChanges(reportContainer, profileContainer);
  }
}

// Cancel any active requests for a specific student
function cancelActiveRequests(studentId = null) {
  // If studentId is provided, only cancel requests for that student
  // Otherwise, cancel all active requests
  Object.keys(activeRequests).forEach(key => {
    if (!studentId || key.includes(studentId)) {
      if (activeRequests[key] && activeRequests[key].abort) {
        debugLog(`Cancelling active request: ${key}`);
        activeRequests[key].abort();
      }
      delete activeRequests[key];
    }
  });
}

// Helper to create a simple hash of profile data for change detection
function hashProfileData(profileData) {
  if (!profileData) return "empty";
  const name = profileData[FIELD_MAPPING.studentName] || '';
  const id = profileData.id || '';
  return `${name}-${id}`;
}

function handleReportChanges(reportContainer, profileContainer) {
  // If we're already processing a student or updating the DOM, don't proceed
  if (isProcessingStudent || isUpdatingDOM) {
    debugLog("Already processing a student or updating DOM, skipping redundant processing");
    return;
  }
  
  // Enforce a minimum time between renderings to prevent flickering
  const now = Date.now();
  if (now - lastRenderTime < RENDER_COOLDOWN) {
    debugLog(`Skipping re-render - too soon (${now - lastRenderTime}ms since last render)`);
    return;
  }
  
  // First check if we're in the group view - enhanced with multiple detection methods
  const groupViewTable = document.querySelector('#studentReports .p-datatable');
  const backButton = document.querySelector('a.p-button[aria-label="BACK"]') || 
                    document.querySelector('button[aria-label="BACK"]');
  const reportText = reportContainer.textContent || '';
  const hasStudentText = reportText.includes('STUDENT:');
  
  // First, directly extract student name from the content if possible
  let studentNameFromReport = null;
  const studentNameMatch = reportText.match(/STUDENT:\s*([^\n]+)/);
  if (studentNameMatch && studentNameMatch[1]) {
    studentNameFromReport = studentNameMatch[1].trim();
    debugLog(`Directly extracted student name from report: "${studentNameFromReport}"`);
  }
  
  // Check for the VIEW STUDENT ACTIVITIES button (direct evidence we're on student view)
  const viewActivitiesButton = document.querySelector('#view-activities-button a') || 
                              document.querySelector('a.p-button[aria-label="VIEW STUDENT ACTIVITIES"]') ||
                              document.querySelector('button[aria-label="VIEW STUDENT ACTIVITIES"]') ||
                              document.querySelector('a[href*="view-student-details"]') ||
                              document.querySelector('a[href*="student-details"]');
                              
  // Determine if we're on student view or group view
  const isOnStudentView = studentNameFromReport || viewActivitiesButton || backButton || hasStudentText;
  let isGroupView = !isOnStudentView || !!groupViewTable;
  
  let studentId = null;
  
  // If we detect group view, clear any existing profile
  if (isGroupView) {
    debugLog("Detected group view, clearing profile");
    clearProfileView(profileContainer);
    return;
  }
  
  // If we're not in the group view, try to find a student ID
  if (!isGroupView) {
    debugLog("Not in group view, looking for student ID...");
    
    // Try multiple approaches to find the student ID
    
    // Approach 1: Try to find the activity button using multiple selectors and methods
    let activityButton = viewActivitiesButton;
    
    if (activityButton) {
      debugLog("Found activity button:", activityButton);
      const buttonHref = activityButton.getAttribute('href') || '';
      const idMatch = buttonHref.match(/\/([^\/]+)\/?$/);
      studentId = idMatch && idMatch[1];
      
      if (studentId) {
        debugLog(`Extracted student ID from button: ${studentId}`);
      } else {
        debugLog(`Could not extract ID from button URL: ${buttonHref}`);
      }
    } else {
      debugLog("Could not find activity button with any selector");
    }
    
    // Approach 2: Look for student name in the report content and parse it
    if (!studentId && studentNameMatch) {
      debugLog(`Found student name in report: "${studentNameFromReport}"`);
      
      // Use the name to find the student ID
      studentId = "USE_NAME:" + studentNameFromReport;
    }
    
    // If we found a student ID, process it
    if (studentId) {
      // Check if this is a new student (different from the current one)
      const isNewStudent = currentStudentId !== null && currentStudentId !== studentId;
      
      if (isNewStudent) {
        debugLog(`Student changed from ${currentStudentId} to ${studentId}`);
        previousStudentId = currentStudentId;
        
        // Cancel any active requests for the previous student
        cancelActiveRequests(previousStudentId);
        
        // Always clear the profile view when changing students
        clearProfileView(profileContainer);
      }
      
      // Update current student
      currentStudentId = studentId;
      
      // Set the processing flag
      isProcessingStudent = true;
      
      try {
        if (studentId.startsWith("USE_NAME:")) {
          // Special case: we found a name but not an ID
          const studentName = studentId.substr(9);
          debugLog(`Processing student by name: ${studentName}`);
          
          // Check if we have a cached profile for this name
          const cacheKey = `name_${studentName}`;
          if (profileCache[cacheKey] && (Date.now() - profileCache[cacheKey].timestamp < CACHE_TTL)) {
            debugLog(`Using cached profile for student name: ${studentName}`);
            renderStudentProfile(profileCache[cacheKey].data, profileContainer);
            isProcessingStudent = false;
          } else {
            processStudentProfile(studentName, profileContainer)
              .finally(() => {
                isProcessingStudent = false;
              });
          }
        } else {
          // Normal case: we found an ID
          debugLog(`Processing student by ID: ${studentId}`);
          
          // Check if we have a cached profile for this ID
          const cacheKey = `id_${studentId}`;
          if (profileCache[cacheKey] && (Date.now() - profileCache[cacheKey].timestamp < CACHE_TTL)) {
            debugLog(`Using cached profile for student ID: ${studentId}`);
            renderStudentProfile(profileCache[cacheKey].data, profileContainer);
            isProcessingStudent = false;
          } else {
            processStudentProfileById(studentId, profileContainer)
              .finally(() => {
                isProcessingStudent = false;
              });
          }
        }
      } catch (error) {
        console.error("[ReportProfiles] Error during student processing:", error);
        isProcessingStudent = false;
      }
    } else {
      debugLog("Could not determine student ID or name from the report");
      clearProfileView(profileContainer);
    }
  }
}

function clearProfileView(profileContainer) {
  if (profileContainer) {
    profileContainer.innerHTML = '';
    debugLog("Profile view cleared");
  }
}

// Helper function to manage API requests with throttling
async function makeRequest(url, options, cacheKey) {
  // Check if we should throttle this request
  const resourceType = url.split('/')[5] || url; // Extract resource type from URL for throttling
  const now = Date.now();
  const lastRequestTime = lastRequestTimes[resourceType] || 0;
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < API_COOLDOWN) {
    // We need to wait before making this request
    const waitTime = API_COOLDOWN - timeSinceLastRequest;
    debugLog(`Throttling request to ${resourceType} - waiting ${waitTime}ms`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  // Update the last request time for this resource
  lastRequestTimes[resourceType] = Date.now();
  
  // Create a request key to track this specific request
  const requestKey = cacheKey || `${url}_${Date.now()}`;
  
  try {
    // Make the actual request
    const jqXHR = $.ajax({
      url: url,
      ...options,
      // Add an abort handler
      beforeSend: function(jqXHR) {
        activeRequests[requestKey] = jqXHR;
      }
    });
    
    // Wait for the request to complete
    const response = await jqXHR;
    
    // Remove from active requests
    delete activeRequests[requestKey];
    
    return response;
  } catch (error) {
    // Remove from active requests
    delete activeRequests[requestKey];
    
    // Handle rate limiting with exponential backoff
    if (error.status === 429) {
      debugLog(`Rate limited on ${resourceType}, implementing backoff`);
      // Increase the cooldown for this resource type
      const currentCooldown = lastRequestTimes[`${resourceType}_cooldown`] || API_COOLDOWN;
      const newCooldown = Math.min(currentCooldown * 2, 10000); // Max 10 second cooldown
      lastRequestTimes[`${resourceType}_cooldown`] = newCooldown;
      
      // Wait for the new cooldown period
      await new Promise(resolve => setTimeout(resolve, newCooldown));
      
      // Retry the request once (note: in a production environment, you might want a more robust retry mechanism)
      debugLog(`Retrying request to ${resourceType} after backoff`);
      return makeRequest(url, options, cacheKey);
    }
    
    // Re-throw the error for other error types
    throw error;
  }
}

async function processStudentProfileById(studentId, profileContainer) {
  try {
    // Step 1: Get student record directly by ID
    debugLog(`Looking up student record with ID: ${studentId}`);
    
    const studentCacheKey = `student_${studentId}`;
    let studentRecord = null;
    
    // Check cache for student record
    if (profileCache[studentCacheKey] && (Date.now() - profileCache[studentCacheKey].timestamp < CACHE_TTL)) {
      studentRecord = profileCache[studentCacheKey].data;
      debugLog(`Using cached student record for ID: ${studentId}`);
    } else {
      studentRecord = await makeRequest(
        `${KNACK_API_URL}/objects/object_6/records/${studentId}`,
        {
          type: 'GET',
          headers: getKnackHeaders(),
          data: { format: 'raw' }
        },
        `student_get_${studentId}`
      );
      
      if (studentRecord && studentRecord.id) {
        // Cache the student record
        profileCache[studentCacheKey] = {
          data: studentRecord,
          timestamp: Date.now()
        };
      } else {
        console.error(`[ReportProfiles] Could not find student record with ID: ${studentId}`);
        return;
      }
    }
    
    // Step 2: Get student email and name - handling the complex object structure
    let studentEmail = '';
    if (studentRecord.field_91 && typeof studentRecord.field_91 === 'object') {
      studentEmail = studentRecord.field_91.email || studentRecord.field_91.label || '';
    } else {
      studentEmail = studentRecord.field_91 || '';
    }
    
    let studentName = '';
    if (studentRecord.field_90 && typeof studentRecord.field_90 === 'object') {
      studentName = studentRecord.field_90.full || 
                   (studentRecord.field_90.first + ' ' + studentRecord.field_90.last).trim() || '';
    } else {
      studentName = studentRecord.field_47 || '';
    }
    
    debugLog(`Found student record: ${studentName} (${studentEmail})`);
    
    // Step 3: Find profile using student email or name
    const profileCacheKey = `profile_${studentId}`;
    let profileRecord = null;
    
    // Check cache for profile record
    if (profileCache[profileCacheKey] && (Date.now() - profileCache[profileCacheKey].timestamp < CACHE_TTL)) {
      profileRecord = profileCache[profileCacheKey].data;
      debugLog(`Using cached profile for student ID: ${studentId}`);
    } else {
      // First try to get profile by direct student ID connection
      profileRecord = await findProfileByStudentId(studentId);
      
      // If not found by ID, try finding a profile by any method available
      if (!profileRecord) {
        // Try finding a profile using the email
        if (studentEmail) {
          profileRecord = await findProfileUsingEmail(studentEmail);
        }
        
        // If still not found, try finding a profile by the student name
        if (!profileRecord && studentName) {
          profileRecord = await findProfileByStudentName(studentName);
        }
        
        // Last resort: If no profile is found, create a simple temporary profile from the student record
        if (!profileRecord) {
          debugLog(`No profile found for student ID ${studentId} - creating a temporary profile display`);
          
          // Create a minimal profile with just the data from the student record
          profileRecord = {
            [FIELD_MAPPING.studentName]: studentName,
            [FIELD_MAPPING.yearGroup]: studentRecord.field_548 || '',
            [FIELD_MAPPING.tutorGroup]: studentRecord.field_565 || '',
            [FIELD_MAPPING.attendance]: studentRecord.field_3139 || '',
            // Add the student's school if available
            [FIELD_MAPPING.vespaCustomer]: studentRecord.field_179 || 
                                         (studentRecord.field_122 ? { name: studentRecord.field_122 } : '')
          };
        }
      }
      
      // Cache the profile
      if (profileRecord) {
        profileCache[profileCacheKey] = {
          data: profileRecord,
          timestamp: Date.now()
        };
        
        // Also cache by name for future lookups
        if (studentName) {
          profileCache[`name_${studentName}`] = {
            data: profileRecord,
            timestamp: Date.now()
          };
        }
      }
    }
    
    // Check if we actually have meaningful profile data before rendering
    const hasProfileData = profileRecord && (
      profileRecord[FIELD_MAPPING.studentName] || 
      profileRecord[FIELD_MAPPING.yearGroup] || 
      profileRecord[FIELD_MAPPING.tutorGroup]
    );
    
    if (hasProfileData) {
      // Step 4: Render the profile
      renderStudentProfile(profileRecord, profileContainer);
    } else {
      debugLog(`No valid profile data found for student ID: ${studentId} (${studentName})`);
      // Ensure the view is cleared if no data is found
      clearProfileView(profileContainer);
    }
  } catch (error) {
    console.error('[ReportProfiles] Error processing student profile by ID:', error);
  }
}

// Legacy function - updated with request management
async function processStudentProfile(studentName, profileContainer) {
  try {
    // Step 1: Find student record by name to get email
    debugLog(`Looking up student record for: ${studentName}`);
    
    const nameCacheKey = `student_name_${studentName}`;
    let studentRecord = null;
    
    // Check cache for student record
    if (profileCache[nameCacheKey] && (Date.now() - profileCache[nameCacheKey].timestamp < CACHE_TTL)) {
      studentRecord = profileCache[nameCacheKey].data;
      debugLog(`Using cached student record for name: ${studentName}`);
    } else {
      studentRecord = await findStudentRecordByName(studentName);
      
      if (studentRecord) {
        // Cache the student record
        profileCache[nameCacheKey] = {
          data: studentRecord,
          timestamp: Date.now()
        };
      } else {
        console.error(`[ReportProfiles] Could not find student record for: ${studentName}`);
        return;
      }
    }
    
    // Step 2: Get student email
    const studentEmail = studentRecord.field_91 || '';
    debugLog(`Found student email: ${studentEmail}`);
    
    // Step 3: Get profile data using the email or name
    const profileCacheKey = `profile_name_${studentName}`;
    let profileRecord = null;
    
    // Check cache for profile record
    if (profileCache[profileCacheKey] && (Date.now() - profileCache[profileCacheKey].timestamp < CACHE_TTL)) {
      profileRecord = profileCache[profileCacheKey].data;
      debugLog(`Using cached profile for student name: ${studentName}`);
    } else {
      profileRecord = await findProfileUsingEmail(studentEmail);
      
      if (!profileRecord) {
        profileRecord = await findProfileByStudentName(studentName);
      }
      
      if (profileRecord) {
        // Cache the profile
        profileCache[profileCacheKey] = {
          data: profileRecord,
          timestamp: Date.now()
        };
      }
    }
    
    if (profileRecord) {
      // Step 4: Render the profile
      renderStudentProfile(profileRecord, profileContainer);
    } else {
      debugLog(`No profile found for student: ${studentName} (${studentEmail})`);
      clearProfileView(profileContainer);
    }
  } catch (error) {
    console.error('[ReportProfiles] Error processing student profile:', error);
  }
}

// Get a student record directly by ID
async function getStudentRecordById(studentId) {
  if (!studentId) return null;
  
  try {
    const response = await makeRequest(
      `${KNACK_API_URL}/objects/object_6/records/${studentId}`,
      {
        type: 'GET',
        headers: getKnackHeaders(),
        data: { format: 'raw' }
      },
      `student_get_${studentId}`
    );
    
    if (response && response.id) {
      debugLog(`Found student record with ID ${studentId}:`, response);
      return response;
    }
    
    debugLog(`No student record found with ID: ${studentId}`);
    return null;
  } catch (error) {
    console.error(`[ReportProfiles] Error finding student record with ID ${studentId}:`, error);
    return null;
  }
}

// Find a profile linked to a student ID via connection field
async function findProfileByStudentId(studentId) {
  if (!studentId) return null;
  
  try {
    // Look for profiles where the student connection field matches the ID
    const profileFilters = encodeURIComponent(JSON.stringify({
      match: 'or',
      rules: [
        // Try various connection field possibilities
        { field: 'field_3070', operator: 'is', value: studentId },  // User account connection
        { field: 'field_3064', operator: 'is', value: studentId }   // User ID field
      ]
    }));
    
    const response = await makeRequest(
      `${KNACK_API_URL}/objects/${HOMEPAGE_OBJECT}/records?filters=${profileFilters}`,
      {
        type: 'GET',
        headers: getKnackHeaders(),
        data: { format: 'raw' }
      },
      `profile_find_${studentId}`
    );
    
    if (response && response.records && response.records.length > 0) {
      debugLog(`Found profile record using student ID ${studentId}:`, response.records[0]);
      return response.records[0];
    }
    
    debugLog(`No profile record found directly linked to student ID: ${studentId}`);
    return null;
  } catch (error) {
    console.error(`[ReportProfiles] Error finding profile for student ID ${studentId}:`, error);
    return null;
  }
}

// Helper to get standard Knack API headers
function getKnackHeaders() {
  // Fallback to using Knack's global application ID
  const knackAppId = Knack.application_id;
  // Use our known API key
  const knackApiKey = '8f733aa5-dd35-4464-8348-64824d1f5f0d';
  
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
    const response = await makeRequest(
      `${KNACK_API_URL}/objects/object_6/records?filters=${filters}`,
      {
        type: 'GET',
        headers: getKnackHeaders(),
        data: { format: 'raw' }
      },
      `student_name_${studentName}`
    );
    
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

// Find a profile record using the student's name
async function findProfileByStudentName(studentName) {
  if (!studentName) return null;
  
  debugLog(`Looking for profile with student name: ${studentName}`);
  
  try {
    // Try to find the profile directly using the student name field
    const profileFilters = encodeURIComponent(JSON.stringify({
      match: 'or',
      rules: [
        { field: 'field_3066', operator: 'is', value: studentName },
        { field: 'field_3066', operator: 'contains', value: studentName }
      ]
    }));
    
    const response = await makeRequest(
      `${KNACK_API_URL}/objects/${HOMEPAGE_OBJECT}/records?filters=${profileFilters}`,
      {
        type: 'GET',
        headers: getKnackHeaders(),
        data: { format: 'raw' }
      },
      `profile_name_${studentName}`
    );
    
    if (response && response.records && response.records.length > 0) {
      debugLog(`Found profile record using student name ${studentName}:`, response.records[0]);
      return response.records[0];
    }
    
    debugLog(`No profile found with exact name match. Trying partial match...`);
    return null;
  } catch (error) {
    console.error(`[ReportProfiles] Error finding profile for student name ${studentName}:`, error);
    return null;
  }
}

// Find a profile record using the student's email
async function findProfileUsingEmail(email) {
  if (!email) return null;
  
  debugLog(`Looking for profile with email: ${email}`);
  
  try {
    // First, find the student record by email
    const studentEmailFilters = encodeURIComponent(JSON.stringify({
      match: 'or',
      rules: [
        { field: 'field_91', operator: 'is', value: email },
        { field: 'field_91', operator: 'contains', value: email }
      ]
    }));
    
    // Step 1: Find the student record using email
    const studentRecordResponse = await makeRequest(
      `${KNACK_API_URL}/objects/object_6/records?filters=${studentEmailFilters}`,
      {
        type: 'GET',
        headers: getKnackHeaders(),
        data: { format: 'raw' }
      },
      `student_email_${email}`
    );
    
    // Extract student ID and name if found
    let studentId = null;
    let studentName = null;
    
    if (studentRecordResponse?.records?.length > 0) {
      const studentRecord = studentRecordResponse.records[0];
      studentId = studentRecord.id;
      studentName = studentRecord.field_47; // Student name field
      debugLog(`Found student record by email: ID=${studentId}, Name=${studentName}`);
    
      // Step 2: Now look for profile matching this student
      if (studentId || studentName) {
        const rules = [];
        
        if (studentId) {
          rules.push({ field: 'field_3064', operator: 'is', value: studentId });
          rules.push({ field: 'field_3070', operator: 'is', value: studentId });
        }
        
        if (studentName) {
          rules.push({ field: 'field_3066', operator: 'is', value: studentName });
        }
        
        const profileFilters = encodeURIComponent(JSON.stringify({
          match: 'or',
          rules: rules
        }));
        
        const profileResponse = await makeRequest(
          `${KNACK_API_URL}/objects/${HOMEPAGE_OBJECT}/records?filters=${profileFilters}`,
          {
            type: 'GET',
            headers: getKnackHeaders(),
            data: { format: 'raw' }
          },
          `profile_email_${email}`
        );
        
        if (profileResponse?.records?.length > 0) {
          debugLog(`Found profile record for student: ${studentName}`, profileResponse.records[0]);
          return profileResponse.records[0];
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

function renderStudentProfile(profileData, profileContainer) {
  if (!profileData) {
    debugLog("Cannot render profile: No profile data provided");
    return;
  }
  
  if (!profileContainer) {
    debugLog("Cannot render profile: Container element not found");
    return;
  }
  
  // Ensure the container is truly accessible and part of the DOM
  if (!document.contains(profileContainer)) {
    debugLog("Cannot render profile: Container element is no longer in the DOM");
    return;
  }
  
  // Calculate a hash of the current profile data to avoid redundant renders
  const profileHash = hashProfileData(profileData);
  
  // Check if we're trying to render the exact same content
  if (profileHash === lastRenderedProfileHash) {
    debugLog(`Skipping render: Profile data hasn't changed (hash: ${profileHash})`);
    return;
  }
  
  // Update the DOM update flag to prevent observer reactions
  isUpdatingDOM = true;
  
  // Update our timestamp and hash tracking
  lastRenderTime = Date.now();
  lastRenderedProfileHash = profileHash;
  
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
  profileContainer.innerHTML = profileHTML;
  
  // Reset the DOM update flag after a slight delay to ensure rendering completes
  setTimeout(() => {
    isUpdatingDOM = false;
    debugLog("DOM update lock released");
  }, 100);
  
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

// Expose initializer to global scope so the Multi-App Loader can access it
window.initializeReportProfiles = initializeReportProfiles;
