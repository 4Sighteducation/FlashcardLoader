/**
 * DirectReportProfiles.js - Student Profile Integration for VESPA Reports
 * GitHub version for loading via jsDelivr
 */

// ===== CONFIGURATION DEFAULTS =====
var DEFAULT_CONFIG = {
    KNACK_API_URL: 'https://api.knack.com/v1',
    HOMEPAGE_OBJECT: 'object_112', // User Profile object for homepage
    DEBUG_MODE: true, // Enable console logging
    CHECK_INTERVAL: 500, // Check every 500ms
    MAX_CHECKS: 20, // Give up after 10 seconds (20 checks)
    CACHE_TTL: 5 * 60 * 1000, // Cache TTL: 5 minutes
    API_COOLDOWN: 1000, // 1 second cooldown between API requests
    RENDER_COOLDOWN: 1000, // Minimum time between renders
    BUTTON_POLL_INTERVAL: 1000, // Check every 1 second
    BUTTON_POLL_MAX_ATTEMPTS: 60, // Try for up to 60 seconds
    reportSelector: '#view_2776 .kn-rich_text__content',
    profileSelector: '#view_3015 .kn-rich_text__content',
    
    // Field mappings for the user profile object
    FIELD_MAPPING: {
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
    }
};
// DirectReportProfilesModule.js - Core module for DirectReportProfiles
var DirectReportProfilesModule = {
    // State variables
    observers: null,
    cache: {},
    activeRequests: {},
    lastRequestTimes: {},
    currentStudentId: null,
    previousStudentId: null,
    reportObserver: null,
    activityButtonPollInterval: null,
    isProcessingStudent: false,
    isUpdatingDOM: false,
    lastRenderedProfileHash: null,
    lastRenderTime: 0,
    isInitialized: false,
    
    // Configuration (will be populated from DEFAULT_CONFIG)
    config: {},
    
    // Main initialization function that the loader will call
    initialize: function(customConfig) {
        // Prevent multiple initializations
        if (this.isInitialized) {
            this.debugLog("DirectReportProfiles already initialized, skipping");
            return;
        }
        
        // Store the configuration
        this.config = customConfig || {};
        
        this.debugLog("DirectReportProfiles initializing with config", this.config);
        
        // Check for Vue compatibility mode
        if (this.config.vueCompatMode) {
            this.debugLog("Vue compatibility mode enabled");
            this.setupVueCompatibility();
        }
        
        // Add CSS styles
        this.addStyles();
        
        // Add a visual indicator that the script is loaded
        this.addDebugIndicator();
        
        // Start polling for the necessary DOM elements
        this.startPolling();
        
        this.isInitialized = true;
        this.debugLog("DirectReportProfiles initialization complete");
    },
    
    // Setup function for Vue compatibility mode
    setupVueCompatibility: function() {
        // Adjust timings to let Vue render first
        this.config.CHECK_INTERVAL = Math.max(this.config.CHECK_INTERVAL || 500, 800);
        this.config.RENDER_COOLDOWN = Math.max(this.config.RENDER_COOLDOWN || 1000, 1500);
        
        // Add Vue detection to window if not already there
        window._vueDetected = window._vueDetected || !!document.querySelector('[data-v-]');
        
        this.debugLog("Vue compatibility adjustments applied", {
            CHECK_INTERVAL: this.config.CHECK_INTERVAL,
            RENDER_COOLDOWN: this.config.RENDER_COOLDOWN,
            vueDetected: window._vueDetected
        });
    },
    
    // Helper function to check if an element is controlled by Vue
    isVueControlled: function(element) {
        if (!element) return false;
        
        // Check for Vue attributes on this element or parents
        let current = element;
        let depth = 0;
        const maxDepth = 5; // Only check 5 levels up to avoid performance issues
        
        while (current && depth < maxDepth) {
            // Check various Vue indicators
            if (current.hasAttribute && (
                current.hasAttribute('data-v-') || 
                (current.getAttribute && current.getAttribute('class') && 
                 current.getAttribute('class').includes('vue-')) ||
                (current && typeof current.__vue__ !== 'undefined') // Vue instance reference
            )) {
                return true;
            }
            current = current.parentElement;
            depth++;
        }
        return false;
    },
    
    // Cleanup method for when navigating away
    dispose: function() {
        this.debugLog("Disposing DirectReportProfiles...");
        
        // Clean up observers
        if (this.observers) {
            if (this.observers.reportObserver) {
                this.observers.reportObserver.disconnect();
            }
            if (this.observers.docObserver) {
                this.observers.docObserver.disconnect();
            }
            this.observers = null;
        }
        
        // Clear intervals
        if (this.activityButtonPollInterval) {
            clearInterval(this.activityButtonPollInterval);
            this.activityButtonPollInterval = null;
        }
        
        // Cancel all active requests
        this.cancelActiveRequests();
        
        // Remove the debug indicator
        const indicator = document.getElementById('profile-debug-indicator');
        if (indicator) {
            indicator.remove();
        }
        
        // Reset state
        this.currentStudentId = null;
        this.previousStudentId = null;
        this.lastRenderedProfileHash = null;
        this.lastRenderTime = 0;
        this.isProcessingStudent = false;
        this.isUpdatingDOM = false;
        this.isInitialized = false;
        
        this.debugLog("DirectReportProfiles disposed successfully");
    },
    
    // Debug logging helper
    debugLog: function(title, data) {
        if (!this.config.DEBUG_MODE) return;
        
        console.log(`%c[DirectReportProfiles] ${title}`, 'color: #00e5db; font-weight: bold; font-size: 12px;');
        try {
            if (data !== undefined) {
                console.log(JSON.parse(JSON.stringify(data, null, 2)));
            }
        } catch (e) {
            console.log("Data could not be fully serialized for logging:", data);
        }
        return data;
    },
    
    // Debounce helper function - prevents rapid repeated calls
    debounce: function(func, wait) {
        let timeout;
        const self = this;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(self, args), wait);
        };
    },
    
    // Add CSS styles to the page
    addStyles: function() {
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
        
        this.debugLog("Added styles to the page");
    },
    
    // Add a small debug indicator to the page
    addDebugIndicator: function() {
        // Remove any existing indicator first
        const existingIndicator = document.getElementById('profile-debug-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }
        
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
        
        // Use a bound method to ensure 'this' refers to the module
        indicator.addEventListener('click', this.handleDebugIndicatorClick.bind(this));
        
        document.body.appendChild(indicator);
        this.debugLog("Added debug indicator to page");
    },
    
    // Handle clicks on the debug indicator
    handleDebugIndicatorClick: function() {
        // Log debug info when clicked
        this.debugLog("Debug indicator clicked", {
            'reportContainer': document.querySelector(this.config.reportSelector) ? 'Found' : 'Not found',
            'profileContainer': document.querySelector(this.config.profileSelector) ? 'Found' : 'Not found',
            'activityButton': document.querySelector('#view-activities-button a') ? 'Found' : 'Not found',
            'studentNameInReport': document.querySelector(this.config.reportSelector)?.textContent.includes('STUDENT:') ? 'Found' : 'Not found',
            'currentStudent': this.currentStudentId,
            'cachedProfiles': Object.keys(this.cache)
        });
        
        // Dump the report content to console
        const reportContent = document.querySelector(this.config.reportSelector)?.innerHTML || '';
        this.debugLog("Report content sample", reportContent.substring(0, 500));
    },
    
    // Poll for the necessary DOM elements
    startPolling: function() {
        const self = this;
        this.debugLog("Starting to poll for report containers...");
        let checkCount = 0;
        
        const checkInterval = setInterval(function() {
            // Check if the report elements exist
            const reportContainer = document.querySelector(self.config.reportSelector);
            const profileContainer = document.querySelector(self.config.profileSelector);
            
            if (reportContainer && profileContainer) {
                // Elements found, clear the interval
                clearInterval(checkInterval);
                self.debugLog("Report containers found", { 
                    reportContainer: self.config.reportSelector, 
                    profileContainer: self.config.profileSelector 
                });
                
                // Set up MutationObserver to watch for changes
                self.setupObservers(reportContainer, profileContainer);
                
                // Check immediately in case the report is already showing
                self.checkForIndividualReport(reportContainer, profileContainer);
            } else {
                checkCount++;
                if (checkCount >= self.config.MAX_CHECKS) {
                    clearInterval(checkInterval);
                    console.error("[DirectReportProfiles] Could not find report containers after maximum attempts");
                }
            }
        }, this.config.CHECK_INTERVAL);
    },
    
    // Cancel any active requests for a specific student
    cancelActiveRequests: function(studentId = null) {
        // If studentId is provided, only cancel requests for that student
        // Otherwise, cancel all active requests
        Object.keys(this.activeRequests).forEach(key => {
            if (!studentId || key.includes(studentId)) {
                if (this.activeRequests[key] && this.activeRequests[key].abort) {
                    this.debugLog(`Cancelling active request: ${key}`);
                    this.activeRequests[key].abort();
                }
                delete this.activeRequests[key];
            }
        });
    },
    
    // Set up mutation observers for detecting changes to the report
    setupObservers: function(reportContainer, profileContainer) {
        // Store observers for later cleanup
        this.observers = this.observers || {};
        
        // Clean up any existing observer
        if (this.observers.reportObserver) {
            this.observers.reportObserver.disconnect();
        }
        
        // Create a new observer with debounced handler and enhanced Vue compatibility
        const debouncedHandler = this.debounce((mutations) => {
            // Skip handling if we're in the middle of updating the DOM ourselves
            if (this.isUpdatingDOM) {
                this.debugLog("Observer triggered while updating DOM - skipping");
                return;
            }
            
            // Improved Vue change detection with better tolerance
            if (this.config.vueCompatMode) {
                // Skip if this is a Vue-initiated change
                const isOurOwnVueWrapper = mutations.some(mutation => {
                    // Check if any affected nodes are our own wrappers
                    if (mutation.type === 'childList') {
                        const addedNodes = Array.from(mutation.addedNodes || []);
                        return addedNodes.some(node => 
                            node.nodeType === 1 && 
                            node.hasAttribute && 
                            node.hasAttribute('data-vespa-profile')
                        );
                    }
                    return false;
                });

                if (isOurOwnVueWrapper) {
                    this.debugLog("Detected our own profile wrapper being added - skipping");
                    return;
                }
                
                // Check for Vue-initiated changes to avoid handling those
                const isVueChange = mutations.some(mutation => {
                    const target = mutation.target;
                    return target && (
                        // Check for Vue specific attributes
                        (target.hasAttribute && target.hasAttribute('data-v-')) || 
                        // Check for Vue classes
                        (target.classList && 
                         typeof target.classList.contains === 'function' && 
                         (target.classList.contains('vue-') || target.classList.contains('v-'))) ||
                        // Check for Vue attributes on parent
                        (target.parentElement && target.parentElement.hasAttribute && 
                         (target.parentElement.hasAttribute('data-v-') || 
                          target.parentElement.hasAttribute('data-nonvue')))
                    );
                });
                
                if (isVueChange) {
                    this.debugLog("Detected Vue-initiated DOM changes - ignoring");
                    return;
                }
            }
            
            // Look for specific changes that indicate a report is being shown
            const significantChange = mutations.some(mutation => {
                // Report content has changed substantially
                return mutation.type === 'childList' && 
                       mutation.addedNodes.length > 0 &&
                       (mutation.target.textContent || '').includes('STUDENT:');
            });
            
            // Process changes with extra logging in Vue mode
            if (this.config.vueCompatMode) {
                this.debugLog("Processing mutation in Vue compatibility mode", 
                    { mutationCount: mutations.length, significantChange });
            }
            
            this.handleReportChanges(reportContainer, profileContainer);
        }, this.config.vueCompatMode ? 750 : 500); // Even longer debounce time in Vue mode
        
        this.observers.reportObserver = new MutationObserver(debouncedHandler);
        
        // Start observing the report container with options adjusted for Vue compatibility
        const observerOptions = {
            childList: true,   // Keep watching for added/removed elements
            subtree: this.config.vueCompatMode ? false : true, // Only watch direct children in Vue mode
            attributes: this.config.vueCompatMode ? false : true, // Don't watch all attributes in Vue mode
            characterData: this.config.vueCompatMode ? false : true // Don't watch all text in Vue mode
        };
        
        this.observers.reportObserver.observe(reportContainer, observerOptions);
        
        // Also observe the entire document body for navigation events and buttons
        const debouncedDocHandler = this.debounce((mutations) => {
            // Skip handling if we're in the middle of updating the DOM ourselves
            if (this.isUpdatingDOM) {
                this.debugLog("Document observer triggered while updating DOM - skipping");
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
                this.debugLog("Detected return to group view through DOM mutation");
                this.clearProfileView(profileContainer);
            } else if (activityButton) {
                this.debugLog("Found view-activities-button in document observation", activityButton);
                this.handleReportChanges(reportContainer, profileContainer);
            }
        }, 500); // Use same debounce time as main handler
        
        this.observers.docObserver = new MutationObserver(debouncedDocHandler);
        
        // Observe the document body for any changes
        this.observers.docObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        this.debugLog("Report observers set up");
        
        // Start the activity button poller as a backup
        this.startActivityButtonPoller(reportContainer, profileContainer);
    },
    
    // Start polling for the activity button
    startActivityButtonPoller: function(reportContainer, profileContainer) {
        const self = this;
        
        // Clear any existing interval
        if (this.activityButtonPollInterval) {
            clearInterval(this.activityButtonPollInterval);
        }
        
        // Start a new polling interval
        let attempts = 0;
        this.activityButtonPollInterval = setInterval(() => {
            attempts++;
            
            // Look for the button
            const activityButton = document.querySelector('#view-activities-button a') || 
                                document.querySelector('[data-v-7636e366] a');
            
            if (activityButton) {
                self.debugLog(`Activity button found after ${attempts} attempts!`, activityButton);
                // Process the report
                self.handleReportChanges(reportContainer, profileContainer);
                // Stop polling
                clearInterval(self.activityButtonPollInterval);
                self.activityButtonPollInterval = null;
            } else if (attempts >= self.config.BUTTON_POLL_MAX_ATTEMPTS) {
                // Give up after max attempts
                self.debugLog(`Activity button polling stopped after ${attempts} attempts without finding the button.`);
                clearInterval(self.activityButtonPollInterval);
                self.activityButtonPollInterval = null;
            }
        }, this.config.BUTTON_POLL_INTERVAL);
        
        this.debugLog(`Started activity button polling with ${this.config.BUTTON_POLL_INTERVAL}ms interval`);
    },
    
    // Check if an individual report is already displayed when the script loads
    checkForIndividualReport: function(reportContainer, profileContainer) {
        this.debugLog("Checking for existing student report...");
        
        // Look for student name element which would indicate we're on an individual report
        const reportContent = reportContainer.innerHTML || '';
        const hasStudentName = reportContent.includes('STUDENT:');
        
        // Check for the presence of the back button - another indicator of being on a student report
        const backButton = document.querySelector('a.p-button[aria-label="BACK"]') || 
                         document.querySelector('button[aria-label="BACK"]');
        
        // Check if we're showing the group view table
        const groupViewTable = document.querySelector('#studentReports .p-datatable');
        
        this.debugLog(`Report content check: contains "STUDENT:": ${hasStudentName}, Back button: ${backButton ? 'Found' : 'Not found'}, Group table: ${groupViewTable ? 'Found' : 'Not found'}`);
        
        // Clear any existing profile data if we're not on a student report or we're on the group view
        if ((!hasStudentName && !backButton) || groupViewTable) {
            this.debugLog("Not on an individual student report, clearing profile view");
            this.clearProfileView(profileContainer);
            return;
        }
        
        // If we find evidence of being on a student report, try to process it
        if (hasStudentName || backButton) {
            this.debugLog("Found evidence of student report, processing...");
            this.handleReportChanges(reportContainer, profileContainer);
        }
    },
    
    // Clear the profile view
    clearProfileView: function(profileContainer) {
        if (profileContainer) {
            profileContainer.innerHTML = '';
            this.debugLog("Profile view cleared");
        }
    },
    
    // Helper to create a simple hash of profile data for change detection
    hashProfileData: function(profileData) {
        if (!profileData) return "empty";
        const name = profileData[this.config.FIELD_MAPPING.studentName] || '';
        const id = profileData.id || '';
        return `${name}-${id}`;
    },
    
    // Core logic for handling report changes and processing student profiles
    handleReportChanges: function(reportContainer, profileContainer) {
        // If we're already processing a student or updating the DOM, don't proceed
        if (this.isProcessingStudent || this.isUpdatingDOM) {
            this.debugLog("Already processing a student or updating DOM, skipping redundant processing");
            return;
        }
        
        // Enforce a minimum time between renderings to prevent flickering
        const now = Date.now();
        if (now - this.lastRenderTime < this.config.RENDER_COOLDOWN) {
            this.debugLog(`Skipping re-render - too soon (${now - this.lastRenderTime}ms since last render)`);
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
            this.debugLog(`Directly extracted student name from report: "${studentNameFromReport}"`);
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
            this.debugLog("Detected group view, clearing profile");
            this.clearProfileView(profileContainer);
            return;
        }
        
        // If we're not in the group view, try to find a student ID
        if (!isGroupView) {
            this.debugLog("Not in group view, looking for student ID...");
            
            // Try multiple approaches to find the student ID
            
            // Approach 1: Try to find the activity button using multiple selectors and methods
            let activityButton = viewActivitiesButton;
            
            if (activityButton) {
                this.debugLog("Found activity button:", activityButton);
                const buttonHref = activityButton.getAttribute('href') || '';
                const idMatch = buttonHref.match(/\/([^\/]+)\/?$/);
                studentId = idMatch && idMatch[1];
                
                if (studentId) {
                    this.debugLog(`Extracted student ID from button: ${studentId}`);
                } else {
                    this.debugLog(`Could not extract ID from button URL: ${buttonHref}`);
                }
            } else {
                this.debugLog("Could not find activity button with any selector");
            }
            
            // Approach 2: Look for student name in the report content and parse it
            if (!studentId && studentNameMatch) {
                this.debugLog(`Found student name in report: "${studentNameFromReport}"`);
                
                // Use the name to find the student ID
                studentId = "USE_NAME:" + studentNameFromReport;
            }
            
            // If we found a student ID, process it
            if (studentId) {
                // Check if this is a new student (different from the current one)
                const isNewStudent = this.currentStudentId !== null && this.currentStudentId !== studentId;
                
                if (isNewStudent) {
                    this.debugLog(`Student changed from ${this.currentStudentId} to ${studentId}`);
                    this.previousStudentId = this.currentStudentId;
                    
                    // Cancel any active requests for the previous student
                    this.cancelActiveRequests(this.previousStudentId);
                    
                    // Always clear the profile view when changing students
                    this.clearProfileView(profileContainer);
                }
                
                // Update current student
                this.currentStudentId = studentId;
                
                // Set the processing flag
                this.isProcessingStudent = true;
                
                try {
                    if (studentId.startsWith("USE_NAME:")) {
                        // Special case: we found a name but not an ID
                        const studentName = studentId.substr(9);
                        this.debugLog(`Processing student by name: ${studentName}`);
                        
                        // Check if we have a cached profile for this name
                        const cacheKey = `name_${studentName}`;
                        if (this.cache[cacheKey] && (Date.now() - this.cache[cacheKey].timestamp < this.config.CACHE_TTL)) {
                            this.debugLog(`Using cached profile for student name: ${studentName}`);
                            this.renderStudentProfile(this.cache[cacheKey].data, profileContainer);
                            this.isProcessingStudent = false;
                        } else {
                            this.processStudentProfile(studentName, profileContainer)
                                .finally(() => {
                                    this.isProcessingStudent = false;
                                });
                        }
                    } else {
                        // Normal case: we found an ID
                        this.debugLog(`Processing student by ID: ${studentId}`);
                        
                        // Check if we have a cached profile for this ID
                        const cacheKey = `id_${studentId}`;
                        if (this.cache[cacheKey] && (Date.now() - this.cache[cacheKey].timestamp < this.config.CACHE_TTL)) {
                            this.debugLog(`Using cached profile for student ID: ${studentId}`);
                            this.renderStudentProfile(this.cache[cacheKey].data, profileContainer);
                            this.isProcessingStudent = false;
                        } else {
                            this.processStudentProfileById(studentId, profileContainer)
                                .finally(() => {
                                    this.isProcessingStudent = false;
                                });
                        }
                    }
                } catch (error) {
                    console.error("[DirectReportProfiles] Error during student processing:", error);
                    this.isProcessingStudent = false;
                }
            } else {
                this.debugLog("Could not determine student ID or name from the report");
                this.clearProfileView(profileContainer);
            }
        }
    },
    
    // Helper function to manage API requests with throttling
    makeRequest: async function(url, options, cacheKey) {
        // Check if we should throttle this request
        const resourceType = url.split('/')[5] || url; // Extract resource type from URL for throttling
        const now = Date.now();
        const lastRequestTime = this.lastRequestTimes[resourceType] || 0;
        const timeSinceLastRequest = now - lastRequestTime;
        
        if (timeSinceLastRequest < this.config.API_COOLDOWN) {
            // We need to wait before making this request
            const waitTime = this.config.API_COOLDOWN - timeSinceLastRequest;
            this.debugLog(`Throttling request to ${resourceType} - waiting ${waitTime}ms`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        // Update the last request time for this resource
        this.lastRequestTimes[resourceType] = Date.now();
        
        // Create a request key to track this specific request
        const requestKey = cacheKey || `${url}_${Date.now()}`;
        
        try {
            // Make the actual request
            const jqXHR = $.ajax({
                url: url,
                ...options,
                // Add an abort handler
                beforeSend: (jqXHR) => {
                    this.activeRequests[requestKey] = jqXHR;
                }
            });
            
            // Wait for the request to complete
            const response = await jqXHR;
            
            // Remove from active requests
            delete this.activeRequests[requestKey];
            
            return response;
        } catch (error) {
            // Remove from active requests
            delete this.activeRequests[requestKey];
            
            // Handle rate limiting with exponential backoff
            if (error.status === 429) {
                this.debugLog(`Rate limited on ${resourceType}, implementing backoff`);
                // Increase the cooldown for this resource type
                const currentCooldown = this.lastRequestTimes[`${resourceType}_cooldown`] || this.config.API_COOLDOWN;
                const newCooldown = Math.min(currentCooldown * 2, 10000); // Max 10 second cooldown
                this.lastRequestTimes[`${resourceType}_cooldown`] = newCooldown;
                
                // Wait for the new cooldown period
                await new Promise(resolve => setTimeout(resolve, newCooldown));
                
                // Retry the request once
                this.debugLog(`Retrying request to ${resourceType} after backoff`);
                return this.makeRequest(url, options, cacheKey);
            }
            
            // Re-throw the error for other error types
            throw error;
        }
    },
    
    // Helper to get standard Knack API headers
    getKnackHeaders: function() {
        // Fallback to using Knack's global application ID
        const knackAppId = Knack.application_id;
        // Use API key from config if provided, otherwise use default
        const knackApiKey = this.config.knackApiKey || '8f733aa5-dd35-4464-8348-64824d1f5f0d';
        
        if (typeof Knack === 'undefined' || typeof Knack.getUserToken !== 'function') {
            console.error("[DirectReportProfiles] Knack object or getUserToken function not available.");
            throw new Error("Knack authentication context not available.");
        }
        
        const token = Knack.getUserToken();
        if (!token) {
            console.warn("[DirectReportProfiles] Knack user token is null or undefined. API calls may fail.");
        }
        
        const headers = {
            'X-Knack-Application-Id': knackAppId,
            'X-Knack-REST-API-Key': knackApiKey,
            'Authorization': token || '',
            'Content-Type': 'application/json'
        };
        
        return headers;
    },
    
    // Helper function to sanitize fields for display
    sanitizeField: function(value) {
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
    },
    
    // Safe JSON parsing function
    safeParseJSON: function(jsonString, defaultVal = null) {
        if (!jsonString) return defaultVal;
        try {
            // If it's already an object, return it directly
            if (typeof jsonString === 'object' && jsonString !== null) return jsonString;
            return JSON.parse(jsonString);
        } catch (error) {
            console.warn("[DirectReportProfiles] JSON parse failed:", error, "String:", String(jsonString).substring(0, 100));
            try {
                const cleanedString = String(jsonString).trim().replace(/^\uFEFF/, '');
                const recovered = cleanedString
                    .replace(/\\"/g, '"')
                    .replace(/,\s*([}\]])/g, '$1');
                const result = JSON.parse(recovered);
                console.log("[DirectReportProfiles] JSON recovery successful.");
                return result;
            } catch (secondError) {
                console.error("[DirectReportProfiles] JSON recovery failed:", secondError);
                return defaultVal;
            }
        }
    },
    
    // Find a student record by ID
    getStudentRecordById: async function(studentId) {
        if (!studentId) return null;
        
        try {
            const response = await this.makeRequest(
                `${this.config.KNACK_API_URL}/objects/object_6/records/${studentId}`,
                {
                    type: 'GET',
                    headers: this.getKnackHeaders(),
                    data: { format: 'raw' }
                },
                `student_get_${studentId}`
            );
            
            if (response && response.id) {
                this.debugLog(`Found student record with ID ${studentId}:`, response);
                return response;
            }
            
            this.debugLog(`No student record found with ID: ${studentId}`);
            return null;
        } catch (error) {
            console.error(`[DirectReportProfiles] Error finding student record with ID ${studentId}:`, error);
            return null;
        }
    },
    
    // Find a student record by name
    findStudentRecordByName: async function(studentName) {
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
            const response = await this.makeRequest(
                `${this.config.KNACK_API_URL}/objects/object_6/records?filters=${filters}`,
                {
                    type: 'GET',
                    headers: this.getKnackHeaders(),
                    data: { format: 'raw' }
                },
                `student_name_${studentName}`
            );
            
            if (response && response.records && response.records.length > 0) {
                this.debugLog(`Found student record for ${studentName}:`, response.records[0]);
                return response.records[0];
            }
            
            this.debugLog(`No student record found for ${studentName}`);
            return null;
        } catch (error) {
            console.error(`[DirectReportProfiles] Error finding student record for ${studentName}:`, error);
            return null;
        }
    },
    
    // Process a student profile by ID - the main lookup function
    processStudentProfileById: async function(studentId, profileContainer) {
        try {
            // Step 1: Get student record directly by ID
            this.debugLog(`Looking up student record with ID: ${studentId}`);
            
            const studentCacheKey = `student_${studentId}`;
            let studentRecord = null;
            
            // Check cache for student record
            if (this.cache[studentCacheKey] && (Date.now() - this.cache[studentCacheKey].timestamp < this.config.CACHE_TTL)) {
                studentRecord = this.cache[studentCacheKey].data;
                this.debugLog(`Using cached student record for ID: ${studentId}`);
            } else {
                studentRecord = await this.getStudentRecordById(studentId);
                
                if (studentRecord && studentRecord.id) {
                    // Cache the student record
                    this.cache[studentCacheKey] = {
                        data: studentRecord,
                        timestamp: Date.now()
                    };
                } else {
                    console.error(`[DirectReportProfiles] Could not find student record with ID: ${studentId}`);
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
            
            this.debugLog(`Found student record: ${studentName} (${studentEmail})`);
            
            // Step 3: Find profile using student email or name
            const profileCacheKey = `profile_${studentId}`;
            let profileRecord = null;
            
            // Check cache for profile record
            if (this.cache[profileCacheKey] && (Date.now() - this.cache[profileCacheKey].timestamp < this.config.CACHE_TTL)) {
                profileRecord = this.cache[profileCacheKey].data;
                this.debugLog(`Using cached profile for student ID: ${studentId}`);
            } else {
                // First try to get profile by direct student ID connection
                profileRecord = await this.findProfileByStudentId(studentId);
                
                // If not found by ID, try finding a profile by any method available
                if (!profileRecord) {
                    // Try finding a profile using the email
                    if (studentEmail) {
                        profileRecord = await this.findProfileUsingEmail(studentEmail);
                    }
                    
                    // If still not found, try finding a profile by the student name
                    if (!profileRecord && studentName) {
                        profileRecord = await this.findProfileByStudentName(studentName);
                    }
                    
                    // Last resort: If no profile is found, create a simple temporary profile from the student record
                    if (!profileRecord) {
                        this.debugLog(`No profile found for student ID ${studentId} - creating a temporary profile display`);
                        
                        // Create a minimal profile with just the data from the student record
                        profileRecord = {
                            [this.config.FIELD_MAPPING.studentName]: studentName,
                            [this.config.FIELD_MAPPING.yearGroup]: studentRecord.field_548 || '',
                            [this.config.FIELD_MAPPING.tutorGroup]: studentRecord.field_565 || '',
                            [this.config.FIELD_MAPPING.attendance]: studentRecord.field_3139 || '',
                            // Add the student's school if available
                            [this.config.FIELD_MAPPING.vespaCustomer]: studentRecord.field_179 || 
                                                                     (studentRecord.field_122 ? { name: studentRecord.field_122 } : '')
                        };
                    }
                }
                
                // Cache the profile
                if (profileRecord) {
                    this.cache[profileCacheKey] = {
                        data: profileRecord,
                        timestamp: Date.now()
                    };
                    
                    // Also cache by name for future lookups
                    if (studentName) {
                        this.cache[`name_${studentName}`] = {
                            data: profileRecord,
                            timestamp: Date.now()
                        };
                    }
                }
            }
            
            // Check if we actually have meaningful profile data before rendering
            const hasProfileData = profileRecord && (
                profileRecord[this.config.FIELD_MAPPING.studentName] || 
                profileRecord[this.config.FIELD_MAPPING.yearGroup] || 
                profileRecord[this.config.FIELD_MAPPING.tutorGroup]
            );
            
            if (hasProfileData) {
                // Step 4: Render the profile
                this.renderStudentProfile(profileRecord, profileContainer);
            } else {
                this.debugLog(`No valid profile data found for student ID: ${studentId} (${studentName})`);
                // Ensure the view is cleared if no data is found
                this.clearProfileView(profileContainer);
            }
        } catch (error) {
            console.error('[DirectReportProfiles] Error processing student profile by ID:', error);
        }
    },
    
    // Process a student profile by name - fallback method
    processStudentProfile: async function(studentName, profileContainer) {
        try {
            // Step 1: Find student record by name to get email
            this.debugLog(`Looking up student record for: ${studentName}`);
            
            const nameCacheKey = `student_name_${studentName}`;
            let studentRecord = null;
            
            // Check cache for student record
            if (this.cache[nameCacheKey] && (Date.now() - this.cache[nameCacheKey].timestamp < this.config.CACHE_TTL)) {
                studentRecord = this.cache[nameCacheKey].data;
                this.debugLog(`Using cached student record for name: ${studentName}`);
            } else {
                studentRecord = await this.findStudentRecordByName(studentName);
                
                if (studentRecord) {
                    // Cache the student record
                    this.cache[nameCacheKey] = {
                        data: studentRecord,
                        timestamp: Date.now()
                    };
                } else {
                    console.error(`[DirectReportProfiles] Could not find student record for: ${studentName}`);
                    return;
                }
            }
            
            // Step 2: Get student email
            const studentEmail = studentRecord.field_91 || '';
            this.debugLog(`Found student email: ${studentEmail}`);
            
            // Step 3: Get profile data using the email or name
            const profileCacheKey = `profile_name_${studentName}`;
            let profileRecord = null;
            
            // Check cache for profile record
            if (this.cache[profileCacheKey] && (Date.now() - this.cache[profileCacheKey].timestamp < this.config.CACHE_TTL)) {
                profileRecord = this.cache[profileCacheKey].data;
                this.debugLog(`Using cached profile for student name: ${studentName}`);
            } else {
                profileRecord = await this.findProfileUsingEmail(studentEmail);
                
                if (!profileRecord) {
                    profileRecord = await this.findProfileByStudentName(studentName);
                }
                
                if (profileRecord) {
                    // Cache the profile
                    this.cache[profileCacheKey] = {
                        data: profileRecord,
                        timestamp: Date.now()
                    };
                }
            }
            
            if (profileRecord) {
                // Step 4: Render the profile
                this.renderStudentProfile(profileRecord, profileContainer);
            } else {
                this.debugLog(`No profile found for student: ${studentName} (${studentEmail})`);
                this.clearProfileView(profileContainer);
            }
        } catch (error) {
            console.error('[DirectReportProfiles] Error processing student profile:', error);
        }
    },
    
    // Find a profile linked to a student ID via connection field
    findProfileByStudentId: async function(studentId) {
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
            
            const response = await this.makeRequest(
                `${this.config.KNACK_API_URL}/objects/${this.config.HOMEPAGE_OBJECT}/records?filters=${profileFilters}`,
                {
                    type: 'GET',
                    headers: this.getKnackHeaders(),
                    data: { format: 'raw' }
                },
                `profile_find_${studentId}`
            );
            
            if (response && response.records && response.records.length > 0) {
                this.debugLog(`Found profile record using student ID ${studentId}:`, response.records[0]);
                return response.records[0];
            }
            
            this.debugLog(`No profile record found directly linked to student ID: ${studentId}`);
            return null;
        } catch (error) {
            console.error(`[DirectReportProfiles] Error finding profile for student ID ${studentId}:`, error);
            return null;
        }
    },
    
    // Find a profile record using the student's name
    findProfileByStudentName: async function(studentName) {
        if (!studentName) return null;
        
        this.debugLog(`Looking for profile with student name: ${studentName}`);
        
        try {
            // Try to find the profile directly using the student name field
            const profileFilters = encodeURIComponent(JSON.stringify({
                match: 'or',
                rules: [
                    { field: 'field_3066', operator: 'is', value: studentName },
                    { field: 'field_3066', operator: 'contains', value: studentName }
                ]
            }));
            
            const response = await this.makeRequest(
                `${this.config.KNACK_API_URL}/objects/${this.config.HOMEPAGE_OBJECT}/records?filters=${profileFilters}`,
                {
                    type: 'GET',
                    headers: this.getKnackHeaders(),
                    data: { format: 'raw' }
                },
                `profile_name_${studentName}`
            );
            
            if (response && response.records && response.records.length > 0) {
                this.debugLog(`Found profile record using student name ${studentName}:`, response.records[0]);
                return response.records[0];
            }
            
            this.debugLog(`No profile found with exact name match. Trying partial match...`);
            return null;
        } catch (error) {
            console.error(`[DirectReportProfiles] Error finding profile for student name ${studentName}:`, error);
            return null;
        }
    },
    
    // Find a profile record using the student's email
    findProfileUsingEmail: async function(email) {
        if (!email) return null;
        
        this.debugLog(`Looking for profile with email: ${email}`);
        
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
            const studentRecordResponse = await this.makeRequest(
                `${this.config.KNACK_API_URL}/objects/object_6/records?filters=${studentEmailFilters}`,
                {
                    type: 'GET',
                    headers: this.getKnackHeaders(),
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
                this.debugLog(`Found student record by email: ID=${studentId}, Name=${studentName}`);
            
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
                    
                    const profileResponse = await this.makeRequest(
                        `${this.config.KNACK_API_URL}/objects/${this.config.HOMEPAGE_OBJECT}/records?filters=${profileFilters}`,
                        {
                            type: 'GET',
                            headers: this.getKnackHeaders(),
                            data: { format: 'raw' }
                        },
                        `profile_email_${email}`
                    );
                    
                    if (profileResponse?.records?.length > 0) {
                        this.debugLog(`Found profile record for student: ${studentName}`, profileResponse.records[0]);
                        return profileResponse.records[0];
                    }
                }
            }
            
            this.debugLog(`No profile record found for ${email} after all attempts.`);
            return null;
        } catch (error) {
            console.error(`[DirectReportProfiles] Error finding profile for ${email}:`, error);
            return null;
        }
    },
    
    // Render the student profile in the container
    renderStudentProfile: function(profileData, profileContainer) {
        if (!profileData) {
            this.debugLog("Cannot render profile: No profile data provided");
            return;
        }
        
        if (!profileContainer) {
            this.debugLog("Cannot render profile: Container element not found");
            return;
        }
        
        // Ensure the container is truly accessible and part of the DOM
        if (!document.contains(profileContainer)) {
            this.debugLog("Cannot render profile: Container element is no longer in the DOM");
            return;
        }
        
        // Check if Vue compatibility mode is enabled
        const useVueSafeRendering = !!this.config.vueCompatMode;
        
        // Also check if the container itself is Vue-controlled
        const isVueElement = useVueSafeRendering && this.isVueControlled(profileContainer);
        
        if (isVueElement) {
            this.debugLog("Profile container appears to be Vue-controlled, using cautious render approach");
        } else if (useVueSafeRendering) {
            this.debugLog("Vue compatibility mode enabled, using enhanced rendering approach");
        }
        
        // Calculate a hash of the current profile data to avoid redundant renders
        const profileHash = this.hashProfileData(profileData);
        
        // Check if we're trying to render the exact same content
        if (profileHash === this.lastRenderedProfileHash) {
            this.debugLog(`Skipping render: Profile data hasn't changed (hash: ${profileHash})`);
            return;
        }
        
        // Update the DOM update flag to prevent observer reactions
        this.isUpdatingDOM = true;
        
        // Update our timestamp and hash tracking
        this.lastRenderTime = Date.now();
        this.lastRenderedProfileHash = profileHash;
        
        // Extract profile data using the field mapping from config
        const name = this.sanitizeField(profileData[this.config.FIELD_MAPPING.studentName]) || 'Student';
        
        // Handle school field (connection field)
        let schoolDisplay = 'N/A';
        if (profileData[this.config.FIELD_MAPPING.vespaCustomer]) {
            const schoolField = profileData[this.config.FIELD_MAPPING.vespaCustomer];
            
            if (typeof schoolField === 'object' && schoolField !== null) {
                // Extract school name from connection field
                if (schoolField.field_122_raw) {
                    schoolDisplay = this.sanitizeField(schoolField.field_122_raw.identifier || 
                                  schoolField.field_122_raw.name || 'VESPA ACADEMY');
                } else if (schoolField.text) {
                    schoolDisplay = this.sanitizeField(schoolField.text);
                } else if (schoolField.identifier) {
                    schoolDisplay = this.sanitizeField(schoolField.identifier);
                } else if (schoolField.name) {
                    schoolDisplay = this.sanitizeField(schoolField.name);
                } else {
                    schoolDisplay = "VESPA ACADEMY";
                }
            } else if (typeof schoolField === 'string') {
                schoolDisplay = this.sanitizeField(schoolField);
            }
        }
        
        const tutorGroup = this.sanitizeField(profileData[this.config.FIELD_MAPPING.tutorGroup]);
        const yearGroup = this.sanitizeField(profileData[this.config.FIELD_MAPPING.yearGroup]);
        const attendance = this.sanitizeField(profileData[this.config.FIELD_MAPPING.attendance]);
        
        // Parse subject data
        const subjectData = [];
        for (let i = 1; i <= 15; i++) {
            const fieldKey = `sub${i}`;
            const fieldId = this.config.FIELD_MAPPING[fieldKey];
            
            if (profileData[fieldId]) {
                try {
                    const subject = this.safeParseJSON(profileData[fieldId]);
                    if (subject && subject.subject) {
                        subjectData.push(subject);
                    }
                } catch (e) {
                    console.warn(`[DirectReportProfiles] Error parsing subject data for ${fieldKey}:`, e);
                }
            }
        }
        
        // Helper function to compare grades and return appropriate CSS class
        const getGradeColorClass = (grade, minExpected) => {
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
        };
        
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
                        <div class="subject-name">${this.sanitizeField(subject.subject || '')}</div>
                        <div class="subject-meta">
                            ${subject.examType ? this.sanitizeField(subject.examType) : 'N/A'}
                            ${subject.examBoard ? ` • ${this.sanitizeField(subject.examBoard)}` : ''}
                        </div>
                        <div class="grades-container">
                            <div class="grade-item">
                                <div class="grade-label">MEG</div>
                                <div class="grade-value grade-meg">${this.sanitizeField(subject.minimumExpectedGrade || 'N/A')}</div>
                            </div>
                            <div class="grade-item">
                                <div class="grade-label">Current</div>
                                <div class="grade-value ${currentGradeClass}">${this.sanitizeField(subject.currentGrade || 'N/A')}</div>
                            </div>
                            <div class="grade-item">
                                <div class="grade-label">Target</div>
                                <div class="grade-value ${targetGradeClass}">${this.sanitizeField(subject.targetGrade || 'N/A')}</div>
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
        
        // Clear container and add content - special handling for Vue
        try {
            if (isVueElement || useVueSafeRendering) {
                this.debugLog("Using Vue-safe DOM insertion");
                
                // For Vue-controlled containers, use a more careful approach
                // Create a wrapper that Vue won't re-render
                const wrapper = document.createElement('div');
                wrapper.className = 'vespa-profile-wrapper';
                wrapper.setAttribute('data-nonvue', 'true'); // Mark as not controlled by Vue
                wrapper.setAttribute('data-vespa-profile', 'true'); // Extra marker for our own identification
                
                // Set inner HTML of our wrapper
                wrapper.innerHTML = profileHTML;
                
                // Empty the container carefully using a safer approach
                this.debugLog("Safely clearing container before insertion");
                profileContainer.innerHTML = '';
                
                // Small delay before inserting to avoid Vue rendering collisions
                setTimeout(() => {
                    // Append our wrapper to the container
                    profileContainer.appendChild(wrapper);
                    this.debugLog("Profile element inserted with Vue-safe wrapper");
                }, 50);
            } else {
                // Standard approach for non-Vue elements
                profileContainer.innerHTML = profileHTML;
                this.debugLog("Profile rendered with standard approach");
            }
        } catch (error) {
            console.error('[DirectReportProfiles] Error during profile rendering:', error);
            // Fallback rendering as last resort
            try {
                profileContainer.innerHTML = profileHTML;
            } catch (fallbackError) {
                console.error('[DirectReportProfiles] Even fallback rendering failed:', fallbackError);
            }
        }
        
        // Reset the DOM update flag after a slight delay to ensure rendering completes
        setTimeout(() => {
            this.isUpdatingDOM = false;
            this.debugLog("DOM update lock released");
        }, 100);
        
        this.debugLog("Profile rendered successfully", { name, subjects: subjectData.length });
    }
};
// ===== GLOBAL INITIALIZER FUNCTIONS =====
// These functions are called by the Multi-App Loader

// Global initializer function for the Multi-App Loader
window.initializeDirectReportProfiles = function(config) {
    try {
        // Log version and initialization start
        console.log('[DirectReportProfiles v1.4] Initializing...');
        
        // Check for configurations in various locations:
        // 1. Direct parameter passed to this function
        // 2. Global window variable that might be set by the loader
        // 3. Look for any object with a matching name pattern in window
        let effectiveConfig = config;
        
        if (!effectiveConfig) {
            // Try the standard global config variable
            if (window.DIRECT_REPORT_PROFILES_CONFIG) {
                console.log('[DirectReportProfiles] Using global DIRECT_REPORT_PROFILES_CONFIG variable');
                effectiveConfig = window.DIRECT_REPORT_PROFILES_CONFIG;
            } 
            // Look for any other possible naming variations in the global scope
            else if (window.directReportProfilesConfig) {
                console.log('[DirectReportProfiles] Using global directReportProfilesConfig variable');
                effectiveConfig = window.directReportProfilesConfig;
            }
            // If we have Knack.scene and view information, create a basic config
            else if (typeof Knack !== 'undefined' && Knack.scene_hash && Knack.view_hash) {
                console.log('[DirectReportProfiles] Creating config from Knack scene/view context');
                effectiveConfig = {
                    sceneKey: Knack.scene_hash,
                    viewKey: Knack.view_hash,
                    vueCompatMode: true  // Default to Vue compatibility mode for safety
                };
            }
            // Last resort - create a new empty config
            else {
                console.warn('[DirectReportProfiles] No configuration found, using defaults only');
                effectiveConfig = {};
            }
        }
        
        // Set a reference to the effective config for diagnostic purposes
        window._directReportProfilesEffectiveConfig = effectiveConfig;
        
        console.log('[DirectReportProfiles] Initializing with config:', effectiveConfig);
        console.log('[DirectReportProfiles] Vue compatibility mode:', effectiveConfig?.vueCompatMode);
        
        // Merge default config with provided config
        const mergedConfig = {};
        
        // First copy all default config
        if (DEFAULT_CONFIG) {
            // Handle field mappings separately
            if (DEFAULT_CONFIG.FIELD_MAPPING) {
                mergedConfig.FIELD_MAPPING = { ...DEFAULT_CONFIG.FIELD_MAPPING };
            }
            
            // Copy other properties
            Object.keys(DEFAULT_CONFIG).forEach(key => {
                if (key !== 'FIELD_MAPPING') {
                    mergedConfig[key] = DEFAULT_CONFIG[key];
                }
            });
        }
        
        // Then merge in the provided config
        if (config) {
            // Handle nested FIELD_MAPPING from provided config
            if (config.FIELD_MAPPING) {
                mergedConfig.FIELD_MAPPING = {
                    ...mergedConfig.FIELD_MAPPING,
                    ...config.FIELD_MAPPING
                };
            }
            
            // Merge top-level config
            Object.keys(config).forEach(key => {
                if (key !== 'FIELD_MAPPING') {
                    mergedConfig[key] = config[key];
                }
            });
        }
        
        // Always ensure Vue compatibility mode is set correctly
        if (mergedConfig.vueCompatMode === undefined && config?.vueCompatMode !== undefined) {
            mergedConfig.vueCompatMode = !!config.vueCompatMode;
        }
        
        // Save the final config for debugging
        window._directReportProfilesConfig = mergedConfig;
        
        // Verify required selectors are set
        if (!mergedConfig.reportSelector || !mergedConfig.profileSelector) {
            console.error('[DirectReportProfiles] Missing required selectors in config. Using defaults.');
            mergedConfig.reportSelector = mergedConfig.reportSelector || '#view_2776 .kn-rich_text__content';
            mergedConfig.profileSelector = mergedConfig.profileSelector || '#view_3015 .kn-rich_text__content';
        }
        
        // Initialize the module with merged config
        DirectReportProfilesModule.initialize(mergedConfig);
        
        console.log('[DirectReportProfiles] Initialization complete');
        
        // Return true to indicate successful initialization
        return true;
    } catch (error) {
        console.error('[DirectReportProfiles] Initialization failed:', error);
        return false;
    }
};

// Global cleanup function 
window.disposeDirectReportProfiles = function() {
    console.log('[DirectReportProfiles] Disposing...');
    
    // Call the module's dispose method
    DirectReportProfilesModule.dispose();
    
    console.log('[DirectReportProfiles] Disposal complete');
};

// Additional helper function to check if the module is initialized
window.isDirectReportProfilesInitialized = function() {
    return DirectReportProfilesModule.isInitialized === true;
};
