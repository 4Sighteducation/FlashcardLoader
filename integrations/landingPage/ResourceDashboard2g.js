// Resource Dashboard Script for Knack - v1.0
(function() {
    // IMMEDIATE DEBUG - Commented out for production
    // console.log('==========================================');
    // console.log('[Resource Dashboard] SCRIPT FILE LOADED!');
    // console.log('[Resource Dashboard] Window location:', window.location.href);
    // console.log('[Resource Dashboard] Checking for STAFFHOMEPAGE_CONFIG:', !!window.STAFFHOMEPAGE_CONFIG);
    // if (window.STAFFHOMEPAGE_CONFIG) {
    //     console.log('[Resource Dashboard] Config found:', window.STAFFHOMEPAGE_CONFIG);
    // }
    // console.log('==========================================');
    
    // console.log('[Resource Dashboard] Script loaded and executing');
    
    // --- Basic Setup ---
    // Declare SCRIPT_CONFIG at script level but don't initialize it yet
    let SCRIPT_CONFIG;
    
    const KNACK_API_URL = 'https://api.knack.com/v1';
    
    // Initialize configuration inside the function instead of at script load
    function initializeConfig() {
        // Use config from loader if available, otherwise use defaults
        const loaderConfig = window.STAFFHOMEPAGE_CONFIG || {};
        SCRIPT_CONFIG = {
            knackAppId: loaderConfig.knackAppId || '5ee90912c38ae7001510c1a9',
            knackApiKey: loaderConfig.knackApiKey || '8f733aa5-dd35-4464-8348-64824d1f5f0d',
            elementSelector: loaderConfig.elementSelector || '#view_3024',
            debugMode: loaderConfig.debugMode !== undefined ? loaderConfig.debugMode : false,
            sendGrid: loaderConfig.sendGrid || {
                proxyUrl: 'https://vespa-sendgrid-proxy-660b8a5a8d51.herokuapp.com/api/send-email',
                fromEmail: 'noreply@notifications.vespa.academy',
                fromName: 'VESPA Academy',
                templateId: 'd-6a6ac61c9bab43e28706dbb3da4acdcf',
                confirmationtemplateId: 'd-2e21f98579f947b08f2520c567b43c35'
            }
        };
    }

    function log(message, ...args) {
        if (SCRIPT_CONFIG && SCRIPT_CONFIG.debugMode) {
            console.log('[Resource Dashboard]', message, ...args);
        }
    }

    function errorLog(message, ...args) {
        console.error('[Resource Dashboard]', message, ...args);
    }
    
    const FIELD_MAPPING = {
        staffLoginEmail: 'field_70', // Email field in object_3
        staffToCustomerConnection: 'field_122',
        customerAccountType: 'field_63',
        schoolConnection: 'field_122',
        schoolName: 'field_2',
        schoolEstablishmentName: 'field_44',
        schoolLogo: 'field_45',
        
        // Verification fields - CORRECTED
        password: 'field_71',         // Password field
        privacyPolicy: 'field_127',   // Privacy Policy acceptance (Yes/No)
        verifiedUser: 'field_189',    // Verified User status (Yes/No) - CORRECTED FROM field_128
        passwordReset: 'field_539',   // Password Reset status (Yes/No)
        
        // Role field
        staffRoles: 'field_73'        // Staff roles field in object_3
    };

    const OBJECT_KEYS = {
        staff: 'object_3',
        customers: 'object_2',
        schools: 'object_2' // Schools are also in object_2
    };
    
    function isValidKnackId(id) {
        if (!id) return false;
        return typeof id === 'string' && /^[0-9a-f]{24}$/i.test(id);
    }

    function extractValidRecordId(value) {
        if (!value) return null;
        if (typeof value === 'object' && value !== null) {
            if (value.id && isValidKnackId(value.id)) return value.id;
            if (Array.isArray(value) && value.length > 0 && value[0].id && isValidKnackId(value[0].id)) return value[0].id;
        }
        if (typeof value === 'string' && isValidKnackId(value)) return value;
        return null;
    }
    
    function sanitizeField(value) {
        if (value === null || value === undefined) return "";
        const strValue = String(value);
        return strValue.replace(/<[^>]*?>/g, "").trim();
    }

    // --- API Helper ---
    async function makeKnackRequest(endpoint, method = 'GET') {
        try {
            const response = await $.ajax({
                url: `${KNACK_API_URL}/${endpoint}`,
                type: method,
                headers: {
                    'X-Knack-Application-Id': SCRIPT_CONFIG.knackAppId,
                    'X-Knack-REST-API-Key': SCRIPT_CONFIG.knackApiKey,
                    'Authorization': Knack.getUserToken(),
                }
            });
            return response;
        } catch (err) {
            errorLog(`API request to ${endpoint} failed:`, err);
            throw err;
        }
    }

    // --- Data Fetching Functions ---

    async function findStaffRecord(email) {
        const filters = encodeURIComponent(JSON.stringify({
            match: 'and', rules: [
                { field: 'field_70', operator: 'is', value: email } // Email field in object_3
            ]
        }));
        const response = await makeKnackRequest(`objects/${OBJECT_KEYS.staff}/records?filters=${filters}`);
        if (!response || !response.records || response.records.length === 0) {
            errorLog('Could not find staff record for email:', email);
            return null;
        }
        return response.records[0];
    }

    async function getSchoolRecord(schoolId) {
        if (!schoolId) return null;
        try {
            return await makeKnackRequest(`objects/${OBJECT_KEYS.schools}/records/${schoolId}`);
        } catch (error) {
            errorLog(`Failed to fetch school record for ID ${schoolId}`, error);
            return null;
        }
    }
    
    // Helper function to format roles properly
    function formatRoles(roles) {
        log('formatRoles called with:', roles, 'Type:', typeof roles, 'Is Array:', Array.isArray(roles));
        
        if (!roles || (Array.isArray(roles) && roles.length === 0)) {
            log('formatRoles: No roles or empty array');
            return 'No Role Assigned';
        }
        
        // Handle non-array roles
        if (!Array.isArray(roles)) {
            log('formatRoles: Converting non-array to array');
            roles = [roles];
        }
        
        // If roles are objects, extract the name/title
        const formattedRoles = roles.map((role, index) => {
            log(`formatRoles: Processing role ${index}:`, role);
            
            if (typeof role === 'object' && role !== null) {
                log('formatRoles: Role is object, properties:', Object.keys(role));
                // Try different possible property names
                const roleName = role.name || role.title || role.identifier || role.value || 'Unknown Role';
                log('formatRoles: Extracted role name:', roleName);
                return roleName;
            }
            // If it's a string like "object_5", try to map it to a friendly name
            if (typeof role === 'string') {
                log('formatRoles: Role is string:', role);
                // Common role mappings
                const roleMap = {
                    'object_5': 'Tutor',
                    'object_7': 'Staff Admin',
                    'object_6': 'Administrator',
                    'object_8': 'Manager',
                    'object_9': 'Teacher',
                    'object_10': 'Support Staff'
                };
                const mapped = roleMap[role] || role.replace(/object_\d+/, 'Staff Member');
                log('formatRoles: Mapped to:', mapped);
                return mapped;
            }
            log('formatRoles: Role is neither object nor string, returning as-is');
            return role;
        });
        
        const result = formattedRoles.join(', ');
        log('formatRoles: Final result:', result);
        return result;
    }
    
    // Add admin role checking function
    function isStaffAdmin(roles) {
        if (!roles) {
            log('isStaffAdmin: No roles provided');
            return false;
        }
        
        // Debug log the roles
        log('isStaffAdmin checking roles:', roles);
        
        // Check if roles is an array
        if (Array.isArray(roles)) {
            const isAdmin = roles.some(role => {
                // Handle different role formats
                let roleStr = '';
                if (typeof role === 'object' && role !== null) {
                    // Check for various possible properties
                    roleStr = role.identifier || role.name || role.title || role.value || '';
                    // Also check if it's a connection object
                    if (role.id && role.identifier) {
                        roleStr = role.identifier;
                    }
                } else {
                    roleStr = String(role);
                }
                
                log('Checking role:', role, 'roleStr:', roleStr);
                return roleStr.toLowerCase().includes('admin') || 
                       roleStr.toLowerCase().includes('staff admin') ||
                       roleStr.includes('object_7') || 
                       roleStr.toLowerCase().includes('administrator');
            });
            log('isStaffAdmin result (array):', isAdmin);
            return isAdmin;
        }
        
        // Check if it's a single role string
        const roleStr = String(roles).toLowerCase();
        const isAdmin = roleStr.includes('admin') || 
                       roleStr.includes('staff admin') ||
                       roleStr.includes('object_7') ||
                       roleStr.includes('administrator');
        log('isStaffAdmin result (string):', isAdmin, 'roleStr:', roleStr);
        return isAdmin;
    }

    async function getStaffProfileData() {
        const user = Knack.getUserAttributes();
        if (!user || !user.id) {
            errorLog("Cannot get staff profile: User not logged in.");
            return null;
        }

        log("Fetching staff profile data for:", user.email);
        const knackRoles = Knack.getUserRoles();
        log("User roles from Knack.getUserRoles():", knackRoles);
        log("Raw Knack roles JSON:", JSON.stringify(knackRoles));
        
        // Also check the user attributes for role information
        log("Full user attributes:", Knack.getUserAttributes());
        log("User object:", user);
        
        const staffRecord = await findStaffRecord(user.email);
        if (!staffRecord) {
            log("No staff record found, using Knack user data");
            return { 
                name: user.name, 
                roles: formatRoles(knackRoles), 
                school: 'Unknown School', 
                schoolLogo: null,
                hasAdminRole: isStaffAdmin(knackRoles)
            };
        }
        
        // Log the entire staff record to see what fields are available
        log("Staff record fields:", Object.keys(staffRecord));
        log("Staff record field_73:", staffRecord.field_73);
        log("Staff record field_73_raw:", staffRecord.field_73_raw);
        
        // Check for roles in staff record (field_73)
        let actualRoles = knackRoles;
        if (staffRecord[FIELD_MAPPING.staffRoles]) {
            log("Found roles in staff record field_73:", staffRecord[FIELD_MAPPING.staffRoles]);
            actualRoles = staffRecord[FIELD_MAPPING.staffRoles];
        } else if (staffRecord[FIELD_MAPPING.staffRoles + '_raw']) {
            log("Found roles in staff record field_73_raw:", staffRecord[FIELD_MAPPING.staffRoles + '_raw']);
            actualRoles = staffRecord[FIELD_MAPPING.staffRoles + '_raw'];
        } else {
            log("No roles found in staff record, using Knack roles");
        }

        const schoolId = extractValidRecordId(staffRecord[FIELD_MAPPING.schoolConnection + '_raw']);
        let schoolName = 'Unknown School';
        let schoolLogo = null;

        if (schoolId) {
            const schoolRecord = await getSchoolRecord(schoolId);
            if (schoolRecord) {
                schoolName = sanitizeField(schoolRecord[FIELD_MAPPING.schoolEstablishmentName] || schoolRecord[FIELD_MAPPING.schoolName]);
                schoolLogo = schoolRecord[FIELD_MAPPING.schoolLogo + '_raw']?.url || null;
                log(`Found school: ${schoolName}`, `Logo: ${schoolLogo}`);
            }
        }
        
        // Use a default logo if none is found
        if (!schoolLogo) {
            schoolLogo = "https://www.vespa.academy/assets/images/full-trimmed-transparent-customcolor-1-832x947.png";
            log("Using default VESPA logo.");
        }

        log("Staff record found, building profile data");
        const profileData = {
            name: user.name,
            roles: formatRoles(actualRoles),
            school: schoolName,
            schoolLogo: schoolLogo,
            hasAdminRole: isStaffAdmin(actualRoles)
        };
        log("Profile data:", profileData);
        return profileData;
    }

    // --- Core Logic ---
    
    // Helper to modify embed code for kiosk mode
    function enhanceEmbedForKioskMode(embedCode) {
        if (!embedCode) return embedCode;
        
        // Create a temporary div to parse the HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = embedCode;
        
        // Find all iframes
        const iframes = tempDiv.querySelectorAll('iframe');
        
        iframes.forEach(iframe => {
            let src = iframe.getAttribute('src');
            if (!src) return;
            
            // Google Slides
            if (src.includes('docs.google.com/presentation')) {
                // Add parameters for auto-play, loop, and no controls
                if (src.includes('/embed?')) {
                    src += '&rm=minimal'; // Remove menu
                } else {
                    src = src.replace('/embed', '/embed?start=true&loop=true&delayms=30000&rm=minimal');
                }
                iframe.setAttribute('src', src);
                iframe.setAttribute('allowfullscreen', 'true');
                iframe.setAttribute('mozallowfullscreen', 'true');
                iframe.setAttribute('webkitallowfullscreen', 'true');
            }
            // Slides.com
            else if (src.includes('slides.com') && src.includes('/embed')) {
                // Slides.com embeds - add style parameters
                if (!src.includes('style=')) {
                    src += (src.includes('?') ? '&' : '?') + 'style=light&autoSlide=30000';
                }
                iframe.setAttribute('src', src);
                iframe.setAttribute('scrolling', 'no');
                iframe.setAttribute('allowfullscreen', 'true');
            }
            // Local VESPA slides
            else if (src.includes('vespa.academy/assets')) {
                // For local slides, add fullscreen parameters if the slide viewer supports them
                if (!src.includes('?')) {
                    src += '?fullscreen=1&autoplay=1';
                } else {
                    src += '&fullscreen=1&autoplay=1';
                }
                iframe.setAttribute('src', src);
                iframe.setAttribute('allowfullscreen', 'true');
            }
            
            // Set minimum dimensions for better viewing
            if (!iframe.style.width || iframe.style.width !== '100%') {
                iframe.style.width = '100%';
            }
            if (!iframe.style.height || parseInt(iframe.style.height) < 500) {
                iframe.style.height = '500px';
            }
            
            // Add fullscreen attributes
            iframe.setAttribute('allowfullscreen', 'true');
            iframe.setAttribute('webkitallowfullscreen', 'true');
            iframe.setAttribute('mozallowfullscreen', 'true');
            iframe.setAttribute('msallowfullscreen', 'true');
        });
        
        return tempDiv.innerHTML;
    }
    
    // Helper to add fullscreen button to activity
    function addFullscreenButton(activitySection) {
        // Add a fullscreen toggle button
        const fullscreenBtn = `
            <button class="fullscreen-toggle" onclick="toggleActivityFullscreen(this)" title="Toggle Fullscreen">
                <i class="fas fa-expand"></i>
            </button>
        `;
        return fullscreenBtn;
    }
    
    // Global function for fullscreen toggle
    window.toggleActivityFullscreen = function(button) {
        const activityFrame = button.closest('.activity-section').querySelector('.activity-embed-frame');
        const iframe = activityFrame.querySelector('iframe');
        
        if (!document.fullscreenElement) {
            // Enter fullscreen
            if (iframe && iframe.requestFullscreen) {
                iframe.requestFullscreen();
            } else if (iframe && iframe.webkitRequestFullscreen) {
                iframe.webkitRequestFullscreen();
            } else if (iframe && iframe.mozRequestFullScreen) {
                iframe.mozRequestFullScreen();
            } else if (iframe && iframe.msRequestFullscreen) {
                iframe.msRequestFullscreen();
            }
            button.innerHTML = '<i class="fas fa-compress"></i>';
        } else {
            // Exit fullscreen
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
            button.innerHTML = '<i class="fas fa-expand"></i>';
        }
    };
    
    // Helper to get current month name
    function getCurrentMonthName() {
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
        return months[new Date().getMonth()];
    }
    
    // Helper to extract month from identifier
    function extractMonthFromIdentifier(identifier) {
        if (!identifier) return null;
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
        
        for (const month of months) {
            if (identifier.includes(month)) {
                return month;
            }
        }
        return null;
    }
    
    // Helper to get recent activity history from localStorage
    function getActivityHistory() {
        try {
            const history = localStorage.getItem('vespa_activity_history');
            return history ? JSON.parse(history) : [];
        } catch (e) {
            return [];
        }
    }
    
    // Helper to save activity to history
    function saveActivityToHistory(activityId) {
        try {
            let history = getActivityHistory();
            const now = new Date().getTime();
            
            // Add new activity
            history.push({ id: activityId, timestamp: now });
            
            // Keep only last 30 days
            const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
            history = history.filter(item => item.timestamp > thirtyDaysAgo);
            
            localStorage.setItem('vespa_activity_history', JSON.stringify(history));
        } catch (e) {
            log('Failed to save activity history:', e);
        }
    }
    
    async function getActivityOfTheWeek() {
        log('Fetching activities from CDN...');
        try {
            // Use the CDN URL provided by the user
            const response = await $.ajax({
                url: 'https://cdn.jsdelivr.net/gh/4Sighteducation/FlashcardLoader@main/integrations/tutor_activities1h.json',
                type: 'GET',
                dataType: 'json'
            });
            
            if (!response || !response.records || response.records.length === 0) {
                errorLog('No activities found in CDN.');
                return null;
            }
            
            const currentMonth = getCurrentMonthName();
            const history = getActivityHistory();
            const recentActivityIds = history.map(h => h.id);
            
            // Filter out Welsh activities (where field_1924 is "Yes" OR is_welsh is true)
            const nonWelshActivities = response.records.filter(activity => {
                // Check both field_1924 and is_welsh property
                const hasWelshField = activity.field_1924 === "Yes";
                const isWelshFlag = activity.is_welsh === true;
                const isWelsh = hasWelshField || isWelshFlag;
                
                if (isWelsh) {
                    log(`Filtering out Welsh activity: ${activity.title}`);
                }
                
                return !isWelsh;
            });
            
            log(`Total activities: ${response.records.length}, Non-Welsh activities: ${nonWelshActivities.length}`);
            
            // Filter activities by current month
            let monthActivities = nonWelshActivities.filter(activity => {
                const activityMonth = extractMonthFromIdentifier(activity.group_info?.identifier);
                return activityMonth === currentMonth;
            });
            
            // If no activities for current month, use all non-Welsh activities
            if (monthActivities.length === 0) {
                log(`No activities found for ${currentMonth}, using all non-Welsh activities`);
                monthActivities = nonWelshActivities;
            }
            
            // Filter out recently shown activities
            let availableActivities = monthActivities.filter(activity => 
                !recentActivityIds.includes(activity.id)
            );
            
            // If all activities have been shown recently, reset and use all month activities
            if (availableActivities.length === 0) {
                log('All activities shown recently, resetting pool');
                availableActivities = monthActivities;
            }
            
            // Select an activity based on day of year
            const today = new Date();
            const start = new Date(today.getFullYear(), 0, 0);
            const diff = today - start;
            const oneDay = 1000 * 60 * 60 * 24;
            const dayOfYear = Math.floor(diff / oneDay);
            
            const activityIndex = dayOfYear % availableActivities.length;
            const activity = availableActivities[activityIndex];
            
            // Save to history
            saveActivityToHistory(activity.id);
            
            log(`Selected activity for ${currentMonth}:`, activity.title);

            // Extract PDF link from the full HTML content first
            let pdfLink = null;
            if (activity.html_content) {
                const pdfMatch = activity.html_content.match(/href="([^"]+\.pdf[^"]*)"/i);
                if (pdfMatch) {
                    pdfLink = pdfMatch[1];
                    log('Found PDF link:', pdfLink);
                }
            }

            // Extract only the iframe from html_content (field_1448)
            let embedCode = '';
            if (activity.html_content) {
                // Extract iframe using regex
                const iframeMatch = activity.html_content.match(/<iframe[^>]*>[\s\S]*?<\/iframe>/i);
                if (iframeMatch) {
                    embedCode = iframeMatch[0];
                    log('Extracted iframe from activity HTML');
                    
                    // Debug: Log the full HTML content to see what we're dealing with
                    log('Full HTML content:', activity.html_content);
                    log('Extracted iframe:', embedCode);
                } else {
                    // If no iframe found, use the full content as fallback
                    embedCode = activity.html_content;
                    log('No iframe found, using full HTML content');
                }
            }
            
            // Enhance embed code for kiosk mode
            const enhancedEmbedCode = enhanceEmbedForKioskMode(embedCode);

            return {
                name: activity.title,
                group: activity.group_info?.identifier || 'N/A',
                category: activity.category,
                embedCode: enhancedEmbedCode,
                pdfLink: pdfLink
            };
        } catch (error) {
            errorLog('Failed to fetch activities from CDN:', error);
            return null;
        }
    }

    // --- Rendering Functions ---
    
    const MY_RESOURCES_APPS = [
       { name: "Slide Decks", url: "https://vespaacademy.knack.com/vespa-academy#tutor-activities/", icon: "fa-solid fa-display" },
       { name: "Newsletter", url: "https://vespaacademy.knack.com/vespa-academy#vespa-newsletter/", icon: "fa-solid fa-newspaper" },
       { name: "Curriculum", url: "https://vespaacademy.knack.com/vespa-academy#vespa-curriculum/suggested-curriculum/", icon: "fa-solid fa-book-open" },
       { name: "Worksheets", url: "https://vespaacademy.knack.com/vespa-academy#worksheets/", icon: "fa-solid fa-file-pdf" },
    ];
    
    const ADMIN_APPS = [
       { name: "Manage Schools", url: "https://vespaacademy.knack.com/vespa-academy#manage-schools/", icon: "fa-solid fa-school" },
       { name: "Manage Staff", url: "https://vespaacademy.knack.com/vespa-academy#manage-staff/", icon: "fa-solid fa-users-cog" },
       { name: "Manage Students", url: "https://vespaacademy.knack.com/vespa-academy#students/", icon: "fa-solid fa-user-graduate" },
       { name: "Import Data", url: "https://vespaacademy.knack.com/vespa-academy#import-data/", icon: "fa-solid fa-file-import" },
    ];

    // --- User Activity Tracking Functions ---
    
    // Track user login activity
    async function trackUserLogin() {
        try {
            const user = Knack.getUserAttributes();
            if (!user || !user.id) return;
            
            log(`Tracking login for user: ${user.email}`);
            
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
            
            const response = await makeKnackRequest(`objects/object_3/records?filters=${filters}`);
            
            if (response && response.records && response.records.length > 0) {
                const userRecord = response.records[0];
                
                // Get current login count and increment it
                const currentLogins = parseInt(userRecord.field_3208) || 0;
                const newLoginCount = currentLogins + 1;
                log(`Incrementing login count from ${currentLogins} to ${newLoginCount}`);
                
                // Update user record with login information
                await $.ajax({
                    url: `${KNACK_API_URL}/objects/object_3/records/${userRecord.id}`,
                    type: 'PUT',
                    headers: {
                        'X-Knack-Application-Id': SCRIPT_CONFIG.knackAppId,
                        'X-Knack-REST-API-Key': SCRIPT_CONFIG.knackApiKey,
                        'Authorization': Knack.getUserToken(),
                    },
                    data: JSON.stringify({
                        field_3198: new Date().toISOString(), // Login Date
                        field_3201: 0, // Page Views (reset on login)
                        field_3203: deviceType, // Device Type
                        field_3204: browser.substring(0, 100), // Browser (truncated if too long)
                        field_3208: newLoginCount // Number of Logins - INCREMENT THIS!
                    })
                });
                
                log(`Successfully tracked login for user ${user.email}`);
                return true;
            }
            
            return false;
        } catch (error) {
            errorLog('Error tracking user login:', error);
            return false;
        }
    }
    
    // Track page views and feature usage
    async function trackPageView(featureUsed = null) {
        try {
            const user = Knack.getUserAttributes();
            if (!user || !user.id) return;
            
            log(`Tracking page view for user: ${user.email}`);
            
            // Find the user's record in Object_3
            const filters = encodeURIComponent(JSON.stringify({
                match: 'and',
                rules: [
                    { field: 'field_70', operator: 'is', value: user.email }  // Staff email field only
                ]
            }));
            
            const response = await makeKnackRequest(`objects/object_3/records?filters=${filters}`);
            
            if (response && response.records && response.records.length > 0) {
                const userRecord = response.records[0];
                
                // Update fields for tracking
                const updateData = {
                    // Increment page views
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
                await $.ajax({
                    url: `${KNACK_API_URL}/objects/object_3/records/${userRecord.id}`,
                    type: 'PUT',
                    headers: {
                        'X-Knack-Application-Id': SCRIPT_CONFIG.knackAppId,
                        'X-Knack-REST-API-Key': SCRIPT_CONFIG.knackApiKey,
                        'Authorization': Knack.getUserToken(),
                    },
                    data: JSON.stringify(updateData)
                });
                
                log(`Successfully tracked page view for ${user.email}`);
                return true;
            }
            
            return false;
        } catch (error) {
            errorLog('Error tracking page view:', error);
            return false;
        }
    }

    function renderNavigationSection() {
        const navButtons = MY_RESOURCES_APPS.map(app => `
            <a href="${app.url}" class="nav-button" target="_blank">
                <i class="${app.icon}"></i>
                <span>${app.name}</span>
            </a>
        `).join('');

        return `
            <section class="vespa-section navigation-section">
                <h2 class="vespa-section-title">MY RESOURCES</h2>
                <div class="nav-container">
                    ${navButtons}
                </div>
            </section>
        `;
    }
    
    function renderAdminSection() {
        const adminButtons = ADMIN_APPS.map(app => `
            <a href="${app.url}" class="admin-button" target="_blank">
                <i class="${app.icon}"></i>
                <span>${app.name}</span>
            </a>
        `).join('');

        return `
            <section class="vespa-section admin-section">
                <h2 class="vespa-section-title">ADMINISTRATION</h2>
                <div class="admin-container">
                    ${adminButtons}
                </div>
            </section>
        `;
    }
    
    function renderProfileSection(profileData) {
        // Enhanced profile section matching coaching dashboard
        return `
            <section class="vespa-section profile-section">
                <h2 class="vespa-section-title">STAFF PROFILE</h2>
                <div class="profile-content">
                    ${profileData.schoolLogo ? `
                        <div class="school-logo-container">
                            <img src="${profileData.schoolLogo}" alt="${profileData.school} Logo" class="school-logo">
                        </div>
                    ` : ''}
                    <div class="profile-info">
                        <div class="profile-name">${profileData.name}</div>
                        <div class="profile-details">
                            <div class="profile-item">
                                <span class="profile-label">School:</span>
                                <span class="profile-value">${profileData.school}</span>
                            </div>
                            <div class="profile-item">
                                <span class="profile-label">Roles:</span>
                                <span class="profile-value">${profileData.roles}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        `;
    }

    function renderActivitySection(activity) {
        if (!activity || !activity.embedCode) {
            return `
                <section class="vespa-section activity-section">
                    <h2 class="vespa-section-title">ACTIVITY OF THE DAY</h2>
                    <div class="activity-container">
                        <div class="no-activity">
                            <i class="fas fa-calendar-times" style="font-size: 3em; margin-bottom: 15px; color: #cccccc;"></i>
                            <p style="color: #cccccc; font-size: 16px;">No activity available today.</p>
                            <p style="color: #999; font-size: 14px;">Please check back later.</p>
                        </div>
                    </div>
                </section>
            `;
        }

        return `
            <section class="vespa-section activity-section">
                <h2 class="vespa-section-title">ACTIVITY OF THE DAY</h2>
                <div class="activity-container">
                    <div class="activity-header">
                        <div class="activity-info">
                            <h3>${activity.name || 'Untitled Activity'}</h3>
                            <div class="activity-meta">
                                <span><strong>Group:</strong> ${activity.group || 'N/A'}</span>
                                <span><strong>Category:</strong> ${activity.category || 'N/A'}</span>
                            </div>
                        </div>
                        <div class="activity-buttons">
                            ${activity.pdfLink ? `
                                <a href="${activity.pdfLink}" target="_blank" class="pdf-download-button" title="Download PDF">
                                    <i class="fas fa-file-pdf"></i>
                                    <span>DOWNLOAD PDF</span>
                                </a>
                            ` : ''}
                            <button class="fullscreen-toggle" onclick="toggleActivityFullscreen(this)" title="Toggle Fullscreen">
                                <i class="fas fa-expand"></i>
                            </button>
                        </div>
                    </div>
                    <div class="activity-embed-frame">
                        ${activity.embedCode || '<p style="text-align:center; color:#999;">No embed content available</p>'}
                    </div>
                </div>
            </section>
        `;
    }
    
    function getDashboardCSS() {
        return `
            /* Main Container - Resource Theme */
            #resource-dashboard-container {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                max-width: 1200px;
                margin: 0 auto;
                padding: 15px;
                color: #ffffff;
                background: linear-gradient(135deg, #0a2b8c 0%, #061a54 100%);
                line-height: 1.3;
                border: 2px solid #00e5db;
                border-radius: 10px;
                box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
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

            /* Navigation Section */
            .navigation-section {
                background: linear-gradient(135deg, #0d2274 0%, #061a54 100%);
                border-left: 4px solid #00e5db;
                box-shadow: 0 4px 12px rgba(0, 229, 219, 0.2), 0 6px 16px rgba(0, 0, 0, 0.4);
            }

            .nav-container {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                gap: 20px;
                margin-top: 15px;
            }

            .nav-button {
                background: linear-gradient(135deg, #15348e 0%, #102983 100%);
                color: #00e5db !important;
                text-decoration: none;
                padding: 20px;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 12px;
                transition: all 0.3s ease;
                border: 2px solid #00e5db;
                font-weight: 700;
                font-size: 16px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                min-height: 80px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .nav-button span {
                color: #00e5db !important;
                text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
            }

            .nav-button:hover {
                transform: translateY(-3px);
                box-shadow: 0 8px 20px rgba(0, 229, 219, 0.4);
                background: linear-gradient(135deg, #1a3ea0 0%, #153494 100%);
            }

            .nav-button i {
                font-size: 24px;
                color: #00e5db !important;
            }

            .nav-button:hover i {
                color: #ffffff !important;
            }

            .nav-button:hover span {
                color: #ffffff !important;
            }

            /* Sections */
            .vespa-section {
                background: linear-gradient(135deg, #132c7a 0%, #0d2274 100%);
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
                padding: 18px;
                margin-bottom: 20px;
                animation: fadeIn 0.5s ease-out forwards;
                transition: transform 0.2s, box-shadow 0.2s;
                border: 2px solid #00e5db;
                backdrop-filter: blur(5px);
                position: relative;
                overflow: hidden;
            }

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

            .vespa-section > * {
                position: relative;
                z-index: 2;
            }

            .vespa-section:hover {
                box-shadow: 0 8px 22px rgba(0, 229, 219, 0.4);
                transform: translateY(-2px);
            }

            .vespa-section-title {
                color: #ffffff !important;
                font-size: 18px;
                font-weight: 600;
                margin-bottom: 15px;
                padding-bottom: 8px;
                border-bottom: 2px solid #00e5db;
                text-transform: uppercase;
                letter-spacing: 1px;
                text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
            }

            /* Profile Section */
            .profile-section {
                border-left: 4px solid #e59437;
                box-shadow: 0 4px 12px rgba(229, 148, 55, 0.2), 0 6px 16px rgba(0, 0, 0, 0.4);
            }

            .profile-content {
                display: flex;
                gap: 20px;
                align-items: center;
            }

            .school-logo-container {
                flex: 0 0 auto;
            }

            .school-logo {
                width: 80px;
                height: 80px;
                object-fit: contain;
                border-radius: 8px;
                padding: 8px;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(0, 229, 219, 0.3);
            }

            .profile-info {
                flex: 1;
            }

            .profile-name {
                font-size: 24px;
                color: #00e5db;
                margin-bottom: 10px;
                font-weight: 700;
                text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
            }

            .profile-details {
                display: flex;
                gap: 30px;
                flex-wrap: wrap;
            }

            .profile-item {
                display: flex;
                align-items: center;
                gap: 5px;
            }

            .profile-label {
                font-weight: 600;
                color: #00e5db;
                font-size: 14px;
            }
            
            .profile-value {
                color: #ffffff;
                font-size: 14px;
            }

            /* Activity Section */
            .activity-section {
                border-left: 4px solid #72cb44;
                box-shadow: 0 4px 12px rgba(114, 203, 68, 0.2), 0 6px 16px rgba(0, 0, 0, 0.4);
            }

            .activity-container {
                display: flex;
                flex-direction: column;
                gap: 20px;
            }

            .activity-header {
                background: linear-gradient(135deg, #15348e 0%, #102983 100%);
                padding: 15px;
                border-radius: 8px;
                border: 1px solid #00e5db;
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-wrap: wrap;
                gap: 15px;
            }

            .activity-info {
                flex: 1;
            }

            .activity-header h3 {
                margin: 0 0 10px 0;
                color: #ffffff;
                font-size: 20px;
            }

            .activity-meta {
                display: flex;
                gap: 30px;
                font-size: 14px;
                color: #cccccc;
            }

            .activity-meta span {
                display: flex;
                align-items: center;
                gap: 5px;
            }

            .activity-meta strong {
                color: #00e5db;
            }

            /* Activity Buttons Container */
            .activity-buttons {
                display: flex;
                gap: 10px;
                align-items: center;
                flex-shrink: 0;
            }

            /* PDF Download Button */
            .pdf-download-button {
                display: inline-flex;
                align-items: center;
                gap: 10px;
                background: linear-gradient(135deg, #e59437 0%, #d88327 100%);
                color: #ffffff !important;
                text-decoration: none;
                padding: 12px 24px;
                border-radius: 6px;
                font-weight: 600;
                font-size: 14px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                transition: all 0.3s ease;
                box-shadow: 0 4px 12px rgba(229, 148, 55, 0.3);
                border: 1px solid rgba(255, 255, 255, 0.2);
                white-space: nowrap;
            }

            .pdf-download-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(229, 148, 55, 0.5);
                background: linear-gradient(135deg, #f0a040 0%, #e59437 100%);
                color: #ffffff !important;
            }

            .pdf-download-button i {
                font-size: 18px;
            }
            
            .pdf-download-button span {
                color: #ffffff !important;
            }
            
            /* Fullscreen Button */
            .fullscreen-toggle {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 44px;
                height: 44px;
                background: linear-gradient(135deg, #00e5db 0%, #00c5c0 100%);
                color: #061a54;
                border: none;
                border-radius: 6px;
                font-size: 18px;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 4px 12px rgba(0, 229, 219, 0.3);
            }

            .fullscreen-toggle:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(0, 229, 219, 0.5);
                background: linear-gradient(135deg, #00f5eb 0%, #00d5d0 100%);
            }

            .fullscreen-toggle i {
                transition: transform 0.3s ease;
            }

            .fullscreen-toggle:hover i {
                transform: scale(1.2);
            }

            .activity-embed-frame {
                background: #ffffff;
                border: 2px solid #00e5db;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                padding: 0;
                min-height: 450px;
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
            }
            
            /* Hide any Knack-generated PDF download buttons within the embed */
            .activity-embed-frame a[href*=".pdf"],
            .activity-embed-frame a[download],
            .activity-embed-frame .download-button,
            .activity-embed-frame .pdf-button,
            .activity-embed-frame a[title*="Download"],
            .activity-embed-frame a[title*="download"],
            .activity-embed-frame a[title*="PDF"],
            .activity-embed-frame a[title*="pdf"],
            /* Target Knack-specific elements */
            .activity-embed-frame .kn-asset-download,
            .activity-embed-frame .kn-download-link,
            .activity-embed-frame .field_1448 a[href*=".pdf"],
            .activity-embed-frame [data-field-key="field_1448"] a[href*=".pdf"] {
                display: none !important;
            }
            
            /* Also hide any overlaid download elements */
            .activity-embed-frame > a,
            .activity-embed-frame > div > a[href*=".pdf"] {
                display: none !important;
            }

            .activity-embed-frame iframe {
                width: 100%;
                height: 500px;
                border: none;
                display: block;
            }
            
            /* Fullscreen mode styles */
            .activity-embed-frame iframe:fullscreen {
                width: 100vw;
                height: 100vh;
            }
            
            .activity-embed-frame iframe:-webkit-full-screen {
                width: 100vw;
                height: 100vh;
            }
            
            .activity-embed-frame iframe:-moz-full-screen {
                width: 100vw;
                height: 100vh;
            }
            
            .activity-embed-frame iframe:-ms-fullscreen {
                width: 100vw;
                height: 100vh;
            }

            /* Loading state */
            .loading-state {
                padding: 60px;
                text-align: center;
                color: #00e5db;
                font-size: 18px;
            }

            /* Error state */
            .error-state {
                padding: 40px;
                text-align: center;
                color: #ff6b6b;
                font-size: 16px;
                background: linear-gradient(135deg, #132c7a 0%, #0d2274 100%);
                border-radius: 10px;
                border: 2px solid #ff6b6b;
            }

            /* No activity state */
            .no-activity {
                text-align: center;
                padding: 40px;
            }

            /* Ensure iframes scale properly */
            .activity-embed-frame > * {
                max-width: 100%;
            }

            /* Common iframe styles for various embed types */
            .activity-embed-frame iframe,
            .activity-embed-frame embed,
            .activity-embed-frame object {
                width: 100% !important;
                max-width: 100%;
                min-height: 500px;
            }

            /* Admin Section */
            .admin-section {
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border-left: 4px solid #ff4757;
                box-shadow: 0 4px 12px rgba(255, 71, 87, 0.2), 0 6px 16px rgba(0, 0, 0, 0.4);
                margin-top: 30px;
            }

            .admin-container {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                gap: 20px;
                margin-top: 15px;
            }

            .admin-button {
                background: linear-gradient(135deg, #2d3561 0%, #1e2549 100%);
                color: #ff4757 !important;
                text-decoration: none;
                padding: 20px;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 12px;
                transition: all 0.3s ease;
                border: 2px solid #ff4757;
                font-weight: 700;
                font-size: 16px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                min-height: 80px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .admin-button span {
                color: #ff4757 !important;
                text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
            }

            .admin-button:hover {
                transform: translateY(-3px);
                box-shadow: 0 8px 20px rgba(255, 71, 87, 0.4);
                background: linear-gradient(135deg, #3a4270 0%, #2a3157 100%);
            }

            .admin-button i {
                font-size: 24px;
                color: #ff4757 !important;
            }

            .admin-button:hover i {
                color: #ffffff !important;
            }

            .admin-button:hover span {
                color: #ffffff !important;
            }

            /* Feedback Button & Modal Styles */
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

            /* Modal Styles */
            .vespa-modal {
                display: none;
                position: fixed;
                z-index: 10000;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.7);
            }

            .vespa-modal-content {
                background: linear-gradient(135deg, #132c7a 0%, #0d2274 100%);
                margin: 5% auto;
                padding: 25px 25px 60px 25px;
                border: 2px solid #00e5db;
                border-radius: 10px;
                width: 80%;
                max-width: 500px;
                color: #ffffff;
                position: relative;
                animation: modalFadeIn 0.3s;
                max-height: 80vh;
                overflow-y: auto;
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

            .vespa-modal h3 {
                color: #00e5db;
                margin-bottom: 20px;
                text-align: center;
            }

            .form-group {
                margin-bottom: 15px;
            }

            .form-group label {
                display: block;
                margin-bottom: 5px;
                font-weight: 600;
                color: #00e5db;
            }

            .form-group input,
            .form-group textarea,
            .form-group select {
                width: 100%;
                padding: 10px;
                border-radius: 4px;
                border: 1px solid rgba(255, 255, 255, 0.2);
                background: rgba(255, 255, 255, 0.1);
                color: white;
                font-size: 14px;
            }

            .form-group select option {
                background-color: #132c7a;
                color: white;
            }

            .form-actions {
                display: flex;
                justify-content: flex-end;
                margin-top: 20px;
                position: sticky;
                bottom: 15px;
                background: inherit;
                padding: 10px 0;
            }

            .vespa-btn {
                padding: 8px 16px;
                border-radius: 5px;
                cursor: pointer;
                font-weight: bold;
                transition: all 0.3s ease;
                border: none;
                margin-bottom: 5px;
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

            .vespa-btn-secondary:hover {
                background-color: #ff5252;
                transform: translateY(-2px);
            }

            #feedback-success {
                text-align: center;
                padding: 20px;
            }

            #feedback-success p {
                margin: 10px 0;
            }

            /* Screenshot preview styling */
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

            /* Responsive adjustments */
            /* Feedback button styles */
            .feedback-button {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background-color: #ea5a2a;
                color: white;
                border: none;
                border-radius: 50px;
                padding: 12px 20px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 8px;
                box-shadow: 0 4px 12px rgba(234, 90, 42, 0.3);
                transition: all 0.3s ease;
                z-index: 9999;
            }
            
            .feedback-button:hover {
                background-color: #d54a1a;
                transform: translateY(-2px);
                box-shadow: 0 6px 16px rgba(234, 90, 42, 0.4);
            }
            
            .feedback-button i {
                font-size: 16px;
            }
            
            /* Modal styles */
            .vespa-modal {
                position: fixed;
                z-index: 10000;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                overflow: auto;
                background-color: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }
            
            .vespa-modal-content {
                background-color: #ffffff;
                margin: auto;
                padding: 30px;
                border: none;
                border-radius: 12px;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
                max-width: 600px;
                width: 100%;
                max-height: 90vh;
                overflow-y: auto;
                position: relative;
            }
            
            .vespa-modal-close {
                color: #333;
                position: absolute;
                top: 15px;
                right: 20px;
                font-size: 32px;
                font-weight: bold;
                cursor: pointer;
                line-height: 1;
                transition: all 0.3s ease;
            }
            
            .vespa-modal-close:hover,
            .vespa-modal-close:focus {
                color: #ea5a2a;
                text-decoration: none;
                transform: scale(1.1);
            }
            
            .vespa-modal-content h3 {
                margin-top: 0;
                color: #1e3a5f;
                font-size: 24px;
                font-weight: 600;
                margin-bottom: 20px;
            }
            
            /* Ensure modal content has proper styling with blue background */
            #feedback-modal {
                z-index: 999999 !important;
            }
            
            #feedback-modal .vespa-modal-content {
                background-color: #1e3a5f !important;
                color: #ffffff !important;
            }
            
            #feedback-modal .form-group label {
                color: #ffffff !important;
                font-weight: 600 !important;
            }
            
            #feedback-modal h3 {
                color: #ffffff !important;
            }
            
            #feedback-form {
                background-color: transparent !important;
            }
            
            #feedback-modal .vespa-modal-close {
                color: #ffffff !important;
            }
            
            #feedback-modal .vespa-modal-close:hover {
                color: #ea5a2a !important;
            }
            
            /* Form styles */
            .form-group {
                margin-bottom: 20px;
            }
            
            .form-group label {
                display: block;
                margin-bottom: 5px;
                font-weight: 600;
                color: #1e3a5f;
                font-size: 14px;
            }
            
            .form-group input,
            .form-group select,
            .form-group textarea {
                width: 100%;
                padding: 12px;
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-radius: 6px;
                font-size: 14px;
                font-family: inherit;
                transition: all 0.3s;
                background-color: rgba(255, 255, 255, 0.95);
                color: #1e3a5f;
            }
            
            .form-group input:focus,
            .form-group select:focus,
            .form-group textarea:focus {
                outline: none;
                border-color: #ea5a2a;
                background-color: #ffffff;
                box-shadow: 0 0 0 3px rgba(234, 90, 42, 0.3);
            }
            
            .form-group input::placeholder,
            .form-group textarea::placeholder {
                color: #666;
                opacity: 0.8;
            }
            
            .form-group textarea {
                resize: vertical;
            }
            
            .form-actions {
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                margin-top: 30px;
            }
            
            .vespa-btn {
                padding: 10px 20px;
                border: none;
                border-radius: 4px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s;
            }
            
            .vespa-btn-primary {
                background-color: #ea5a2a;
                color: white;
            }
            
            .vespa-btn-primary:hover {
                background-color: #d54a1a;
            }
            
            .vespa-btn-secondary {
                background-color: #6c757d;
                color: white;
            }
            
            .vespa-btn-secondary:hover {
                background-color: #5a6268;
            }
            
            #feedback-success {
                text-align: center;
                padding: 20px;
            }
            
            #feedback-success p {
                margin: 10px 0;
                color: #ffffff;
                font-size: 16px;
                font-weight: 500;
            }
            
            #feedback-modal .vespa-btn-primary {
                background-color: #ea5a2a;
                color: white;
                border: none;
            }
            
            #feedback-modal .vespa-btn-primary:hover {
                background-color: #d54a1a;
                transform: translateY(-1px);
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            }
            
            #feedback-modal .vespa-btn-secondary {
                background-color: rgba(255, 255, 255, 0.2);
                color: white;
                border: 2px solid rgba(255, 255, 255, 0.3);
            }
            
            #feedback-modal .vespa-btn-secondary:hover {
                background-color: rgba(255, 255, 255, 0.3);
            }

            /* Responsive adjustments */
            @media (max-width: 768px) {
                #resource-dashboard-container {
                    padding: 15px;
                }

                .nav-container,
                .admin-container {
                    grid-template-columns: 1fr;
                }

                .nav-button,
                .admin-button {
                    width: 100%;
                    justify-content: center;
                }

                .activity-header {
                    flex-direction: column;
                    align-items: flex-start;
                }

                .activity-buttons {
                    width: 100%;
                    justify-content: space-between;
                }

                .pdf-download-button {
                    flex: 1;
                    justify-content: center;
                }

                .profile-details {
                    flex-direction: column;
                    gap: 10px;
                }
                
                .feedback-button {
                    bottom: 10px;
                    right: 10px;
                    padding: 10px 15px;
                    font-size: 13px;
                }
                
                .vespa-modal-content {
                    padding: 20px;
                    margin: auto;
                    max-width: calc(100% - 20px);
                }
                
                .vespa-modal {
                    padding: 10px;
                }

                .activity-embed-frame iframe {
                    height: 400px;
                }

                .vespa-modal-content {
                    width: 95%;
                    margin: 2% auto;
                }
            }
        `;
    }

    // --- Initialization ---
    
    // --- User Verification Functions ---
    // Check user verification status and show appropriate modals
    async function checkUserVerificationStatus() {
        let user = null; // Define user outside try block
        let userEmail = 'Unknown'; // Define userEmail for error logging
        try {
            user = Knack.getUserAttributes();
            if (user && user.email) {
                userEmail = user.email; // Store email for error logging
            }
            
            log("Starting verification check for user:", userEmail);
            
            if (!user || !user.email) {
                errorLog("Cannot check verification status: No user data");
                return true; // Allow access on error
            }
            
            // Find the staff record to check verification fields
            const staffRecord = await findStaffRecord(user.email);
            if (!staffRecord) {
                errorLog("Cannot find staff record for verification check for email:", user.email);
                
                // Special handling for test/admin accounts
                if (user.email === 'lucas@vespa.academy' || user.email.includes('@vespa.academy')) {
                    log("Test/admin account detected, allowing access without verification check");
                    return true;
                }
                
                // For other users, show error
                errorLog("No staff record found, cannot proceed with resource dashboard");
                return false; // Don't allow access to resource dashboard
            }
            
            // Extract the boolean field values (they can be either boolean true/false or "Yes"/"No" strings)
            // Handle null/undefined values gracefully
            const isVerified = staffRecord.field_189 === "Yes" || staffRecord.field_189 === true || staffRecord.field_189 === null || staffRecord.field_189 === undefined;
            const hasAcceptedPrivacy = staffRecord.field_127 === "Yes" || staffRecord.field_127 === true;
            const hasResetPassword = staffRecord.field_539 === "Yes" || staffRecord.field_539 === true || staffRecord.field_539 === null || staffRecord.field_539 === undefined;
            
            log(`User verification status:`, {
                verified: isVerified,
                privacyAccepted: hasAcceptedPrivacy,
                passwordReset: hasResetPassword,
                rawValues: {
                    field_189: staffRecord.field_189,
                    field_127: staffRecord.field_127,
                    field_539: staffRecord.field_539
                }
            });
            
            // Check if this is a RESOURCE account (RESOURCE PORTAL, RESOURCES, RESOURCE ONLY, etc.) - they may have different requirements
            const accountType = staffRecord.field_441;
            const isResourcesAccount = accountType && accountType.toString().toUpperCase().includes('RESOURCE');
            
            // Log account type for debugging
            log(`Account type detected: ${accountType} (isResourcesAccount: ${isResourcesAccount})`);
            
            // Determine what needs to be shown based on the verification logic
            let needsPrivacy = false;
            let needsPassword = false;
            
            // For RESOURCE accounts, handle null/undefined verification fields more gracefully
            if (isResourcesAccount) {
                log("RESOURCE account detected - checking verification status");
                
                // RESOURCE accounts might have null/undefined verification fields
                // Only require privacy acceptance and password if explicitly needed
                if (!hasAcceptedPrivacy) {
                    needsPrivacy = true;
                    log("RESOURCE user needs to accept privacy policy");
                }
                
                // Only require password reset if field_539 is explicitly "No" (not null/undefined)
                if (staffRecord.field_539 === "No" || staffRecord.field_539 === false) {
                    needsPassword = true;
                    log("RESOURCE user needs to reset password");
                }
                
                // If neither is needed, allow access
                if (!needsPrivacy && !needsPassword) {
                    log("RESOURCE user verification complete - allowing access");
                    return true;
                }
            }
            // For non-RESOURCE accounts, use the original strict verification logic
            else {
                // First time user: field_189="No", field_539="No", field_127="No" - show both privacy and password
                if (!isVerified && !hasAcceptedPrivacy && !hasResetPassword) {
                    needsPrivacy = true;
                    needsPassword = true;
                    log("First time user - showing both privacy and password modals");
                }
                // User has reset password but needs to accept privacy: field_189="Yes", field_539="Yes", field_127="No"
                else if (isVerified && hasResetPassword && !hasAcceptedPrivacy) {
                    needsPrivacy = true;
                    needsPassword = false;
                    log("User needs to accept privacy policy only");
                }
                // User accepted privacy but needs password reset: field_189="No", field_539="No", field_127="Yes"
                else if (!isVerified && !hasResetPassword && hasAcceptedPrivacy) {
                    needsPrivacy = false;
                    needsPassword = true;
                    log("User needs to reset password only");
                }
                // All complete: field_189="Yes", field_539="Yes", field_127="Yes"
                else if (isVerified && hasResetPassword && hasAcceptedPrivacy) {
                    log("User verification complete - allowing access");
                    return true;
                }
                else {
                    // Edge case - for non-RESOURCE users, be strict
                    log("Unexpected verification state", {
                        isVerified, hasAcceptedPrivacy, hasResetPassword,
                        accountType: staffRecord.field_441,
                        email: user.email
                    });
                    
                    // Show what's missing
                    needsPrivacy = !hasAcceptedPrivacy;
                    needsPassword = !hasResetPassword;
                }
            }
            
            // Show appropriate modals if needed
            if (needsPrivacy || needsPassword) {
                return await showVerificationModals(needsPrivacy, needsPassword, staffRecord.id);
            }
            
            // All checks passed
            return true;
        } catch (error) {
            errorLog("Error in checkUserVerificationStatus:", error);
            errorLog("Error details:", {
                message: error.message,
                stack: error.stack,
                userEmail: userEmail
            });
            
            // Special handling for RESOURCE accounts - allow access on error
            try {
                if (user && user.email) {
                    const staffRecord = await findStaffRecord(user.email);
                    if (staffRecord && staffRecord.field_441) {
                        const accountType = staffRecord.field_441;
                        if (accountType && accountType.toString().toUpperCase().includes('RESOURCE')) {
                            log("RESOURCE account detected in error handler - allowing access");
                            return true;
                        }
                    }
                }
            } catch (innerError) {
                errorLog("Error checking account type in error handler:", innerError);
            }
            
            // Show error message to user for non-RESOURCE accounts
            if (document.querySelector(SCRIPT_CONFIG.elementSelector)) {
                document.querySelector(SCRIPT_CONFIG.elementSelector).innerHTML = 
                    '<div class="error-state">Could not verify user account. Please contact support if this issue persists.</div>';
            }
            
            return false; // Don't allow access on error for non-RESOURCE accounts
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
                
                <div style="margin: 20px 0; position: relative; z-index: 20;">
                    <label style="display: flex; align-items: center; cursor: pointer; font-size: 16px; position: relative;">
                        <input type="checkbox" id="privacy-accept-checkbox" style="margin-right: 10px; width: 20px; height: 20px; cursor: pointer; position: relative; z-index: 21; flex-shrink: 0;">
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
                        opacity: 0.6;
                        transform: scale(1);
                        box-shadow: none;
                        min-width: 150px;
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
            log('Privacy policy handlers already set up, skipping...');
            return;
        }
        window._privacyHandlersSetup = true;
        
        // Add a small delay to ensure DOM is ready
        setTimeout(() => {
            const checkbox = document.getElementById('privacy-accept-checkbox');
            const continueBtn = document.getElementById('privacy-continue-btn');
            
            if (!checkbox || !continueBtn) {
                log('Privacy policy elements not found, retrying...', { checkbox: !!checkbox, continueBtn: !!continueBtn });
                window._privacyHandlersSetup = false; // Reset flag for retry
                // Retry after another delay if elements not found
                setTimeout(() => setupPrivacyPolicyHandlers(staffRecordId, needsPassword, resolve), 100);
                return;
            }
            
            log('Privacy policy handler setup', { 
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
                            currentBtn.style.transform = 'scale(1)';
                            currentBtn.style.boxShadow = '0 4px 8px rgba(0, 229, 219, 0.3)';
                            // Add hover effect
                            currentBtn.onmouseover = function() {
                                this.style.background = '#00f5eb';
                                this.style.transform = 'scale(1.05)';
                                this.style.boxShadow = '0 6px 12px rgba(0, 229, 219, 0.5)';
                            };
                            currentBtn.onmouseout = function() {
                                this.style.background = '#00e5db';
                                this.style.transform = 'scale(1)';
                                this.style.boxShadow = '0 4px 8px rgba(0, 229, 219, 0.3)';
                            };
                            log('Checkbox checked - button enabled');
                        } else {
                            currentBtn.disabled = true;
                            currentBtn.style.background = '#666';
                            currentBtn.style.color = 'white';
                            currentBtn.style.cursor = 'not-allowed';
                            currentBtn.style.opacity = '0.6';
                            currentBtn.style.transform = 'scale(1)';
                            currentBtn.style.boxShadow = 'none';
                            currentBtn.onmouseover = null;
                            currentBtn.onmouseout = null;
                            log('Checkbox unchecked - button disabled');
                        }
                    }
                };
                
                // Remove any existing event listeners by using a new approach
                // Clone the checkbox to remove all event listeners
                const oldCheckbox = checkbox;
                const newCheckbox = oldCheckbox.cloneNode(true);
                oldCheckbox.parentNode.replaceChild(newCheckbox, oldCheckbox);
                
                // Get reference to the new checkbox
                const finalCheckbox = document.getElementById('privacy-accept-checkbox');
                
                if (finalCheckbox) {
                    // Add event listeners to the fresh checkbox
                    finalCheckbox.addEventListener('change', (e) => {
                        log('Checkbox change event fired', { checked: e.target.checked });
                        updateButtonState();
                    });
                    
                    finalCheckbox.addEventListener('click', (e) => {
                        log('Checkbox click event fired', { checked: e.target.checked });
                        // Small delay to ensure the checked state has updated
                        setTimeout(() => {
                            log('Updating button state after click');
                            updateButtonState();
                        }, 10);
                    });
                    
                    // Also listen for input event as a fallback
                    finalCheckbox.addEventListener('input', (e) => {
                        log('Checkbox input event fired', { checked: e.target.checked });
                        updateButtonState();
                    });
                    
                    log('Event listeners attached successfully');
                } else {
                    errorLog('Failed to get checkbox after cloning');
                }
                
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
                        
                        log('Privacy policy acceptance updated successfully');
                        
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
                        errorLog('Error updating privacy policy acceptance:', error);
                        alert('Error updating your preferences. Please try again.');
                        this.disabled = false;
                        this.innerHTML = 'Continue';
                    }
                });
            } else {
                errorLog('Privacy policy elements not found:', {
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
                    
                    log('Password and verification status updated successfully');
                    
                    // Success - close modal and proceed
                    document.getElementById('verification-modal-overlay').remove();
                    window._privacyHandlersSetup = false; // Reset flag
                    resolve(true);
                    
                    // Show success message
                    alert('Password set successfully! You can now access the platform.');
                    
                } catch (error) {
                errorLog('Error setting password:', error);
                errorDiv.innerHTML = 'Error setting password. Please try again.';
                errorDiv.style.display = 'block';
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Set Password';
            }
        });
    }

    // Update staff verification fields
    async function updateStaffVerificationFields(staffRecordId, updates) {
        const response = await $.ajax({
            url: `${KNACK_API_URL}/objects/object_3/records/${staffRecordId}`,
            type: 'PUT',
            headers: {
                'X-Knack-Application-Id': SCRIPT_CONFIG.knackAppId,
                'X-Knack-REST-API-Key': SCRIPT_CONFIG.knackApiKey,
                'Authorization': Knack.getUserToken(),
                'Content-Type': 'application/json'
            },
            data: JSON.stringify(updates)
        });
        return response;
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

    // --- Feedback System Functions ---
    
    // Setup feedback system event handlers
    function setupFeedbackSystem() {
        const feedbackBtn = document.getElementById('feedback-button');
        const feedbackModal = document.getElementById('feedback-modal');
        const feedbackCloseBtn = document.getElementById('feedback-modal-close');
        const feedbackForm = document.getElementById('feedback-form');
        
        if (!feedbackBtn || !feedbackModal) {
            log('Feedback elements not found');
            return;
        }
        
        // Pre-populate form with user data
        const user = Knack.getUserAttributes();
        if (user) {
            const nameInput = document.getElementById('feedback-name');
            const emailInput = document.getElementById('feedback-email');
            
            if (nameInput && user.name) {
                nameInput.value = user.name;
            }
            if (emailInput && user.email) {
                emailInput.value = user.email;
            }
        }
        
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
                            errorLog('Error reading screenshot:', err);
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
                        screenshot: screenshotData,
                        status: 'New'
                    };
                    
                    // First store in Knack
                    const storedInKnack = await storeFeedbackInKnack(feedbackRequest);
                    
                    // Then try to send email
                    let emailSent = false;
                    try {
                        emailSent = await sendFeedbackEmail(feedbackRequest);
                    } catch (emailError) {
                        errorLog('Email sending failed:', emailError);
                        // Continue - we've still saved the feedback
                    }
                    
                    log('Feedback processed:', { 
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
                            // Re-populate user data
                            if (user) {
                                const nameInput = document.getElementById('feedback-name');
                                const emailInput = document.getElementById('feedback-email');
                                if (nameInput && user.name) nameInput.value = user.name;
                                if (emailInput && user.email) emailInput.value = user.email;
                            }
                            feedbackForm.style.display = 'block';
                            document.getElementById('feedback-success').style.display = 'none';
                            submitBtn.disabled = false;
                            submitBtn.innerHTML = originalBtnText;
                            // Clear screenshot preview
                            const screenshotPreview = document.getElementById('screenshot-preview');
                            const screenshotInput = document.getElementById('feedback-screenshot');
                            if (screenshotPreview) screenshotPreview.style.display = 'none';
                            if (screenshotInput) screenshotInput.value = '';
                        }, 500);
                    }, 3000);
                } catch (error) {
                    errorLog('Error processing feedback:', error);
                    alert('There was an error submitting your request. Please try again later.');
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalBtnText;
                }
            });
        }
        
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
        
        // Initialize screenshot upload handling
        setupScreenshotUpload();
        
        log('Feedback system initialized');
    }
    
    // Store feedback in Knack field_3207
    async function storeFeedbackInKnack(feedbackRequest) {
        try {
            log('Storing feedback in Knack:', feedbackRequest);
            
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
            
            const response = await makeKnackRequest(`objects/object_3/records?filters=${filters}`);
            
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
                    errorLog('Error parsing existing feedback data, initializing new array');
                    feedbackData = { feedbackRequests: [] };
                }
            }
            
            // Add new request to the array
            feedbackData.feedbackRequests.push(feedbackRequest);
            
            // Update the record with new feedback data
            await $.ajax({
                url: `${KNACK_API_URL}/objects/object_3/records/${userRecord.id}`,
                type: 'PUT',
                headers: {
                    'X-Knack-Application-Id': SCRIPT_CONFIG.knackAppId,
                    'X-Knack-REST-API-Key': SCRIPT_CONFIG.knackApiKey,
                    'Authorization': Knack.getUserToken(),
                    'Content-Type': 'application/json'
                },
                data: JSON.stringify({
                    field_3207: JSON.stringify(feedbackData)
                })
            });
            
            log('Successfully stored feedback in Knack');
            return true;
            
        } catch (error) {
            errorLog('Error storing feedback in Knack:', error);
            throw error;
        }
    }

    // Send feedback email via SendGrid Proxy
    async function sendFeedbackEmail(feedbackRequest) {
        try {
            log('Sending feedback email via SendGrid Proxy');
            
            // Get SendGrid config from the loader config or use defaults
            const sendGridConfig = SCRIPT_CONFIG.sendGrid || {
                proxyUrl: 'https://vespa-sendgrid-proxy-660b8a5a8d51.herokuapp.com/api/send-email',
                fromEmail: 'noreply@notifications.vespa.academy',
                fromName: 'VESPA Academy',
                templateId: 'd-6a6ac61c9bab43e28706dbb3da4acdcf',
                confirmationtemplateId: 'd-2e21f98579f947b08f2520c567b43c35'
            };
            
            // Check if proxy URL is configured
            if (!sendGridConfig.proxyUrl) {
                errorLog('SendGrid proxy URL not configured');
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
            log('Sending request to proxy:', sendGridConfig.proxyUrl);
            log('Request data structure:', {
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
                errorLog('Proxy API error (admin email):', errorDetails);
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
                errorLog('Proxy API error (user email):', errorDetails);
                // Still return true if admin email worked but user email failed
                return adminResponse.ok;
            }
            
            log('Emails sent successfully via proxy');
            return true;
            
        } catch (error) {
            errorLog('Error sending feedback email:', error);
            // Continue even if email fails - we've saved to Knack already
            return false;
        }
    }

    async function initializeResourceDashboard() {
        // Initialize configuration first
        initializeConfig();
        
        log('initializeResourceDashboard function called!');
        log('Initializing Resource Dashboard...');
        
        // Verify user type before proceeding
        const user = (typeof Knack !== 'undefined' && Knack.getUserAttributes) ? Knack.getUserAttributes() : null;
        if (user) {
            let accountType = null;
            if (user.values && user.values.field_441) {
                accountType = user.values.field_441;
            } else if (user.field_441) {
                accountType = user.field_441;
            }
            
            // If user doesn't have RESOURCES account type, redirect them
            if (accountType && !accountType.toString().toUpperCase().includes('RESOURCE')) {
                log('Non-RESOURCE user detected on resources page, redirecting...');
                errorLog('User account type:', accountType, '- redirecting to appropriate page');
                
                // Clear any partial initialization
                const container = document.querySelector(SCRIPT_CONFIG.elementSelector);
                if (container) {
                    container.innerHTML = '<div style="padding: 20px; text-align: center;">Redirecting to your dashboard...</div>';
                }
                
                // Redirect based on user type
                if (accountType.toString().toUpperCase().includes('COACHING')) {
                    window.location.hash = '#staff-landing-page/';
                } else {
                    // Default to home for unknown types
                    window.location.hash = '#home/';
                }
                return;
            }
        }
        
        // Extra debug info
        log('Config:', SCRIPT_CONFIG);
        log('Looking for container:', SCRIPT_CONFIG.elementSelector);
        
        const $container = $(SCRIPT_CONFIG.elementSelector);
        
        if ($container.length === 0) {
            errorLog('Container element not found:', SCRIPT_CONFIG.elementSelector);
            return;
        }
        
        log('Container found, proceeding with initialization');

        // NEW: Check user verification status before proceeding
        try {
            const canProceed = await checkUserVerificationStatus();
            if (!canProceed) {
                // User needs to complete verification steps
                // The modals are already being shown
                return;
            }
        } catch (error) {
            errorLog('Error checking user verification status:', error);
            // Continue anyway on error
        }

        // Add styles - with debugging
        const cssContent = getDashboardCSS();
        log('CSS content length:', cssContent.length);
        const styleElement = $(`<style id="resource-dashboard-styles">${cssContent}</style>`);
        $('head').append(styleElement);
        log('Style element added to head:', $('#resource-dashboard-styles').length > 0);
        
        // Add scene-level CSS overrides if we're in scene-level mode
        const container = document.querySelector(SCRIPT_CONFIG.elementSelector);
        const isSceneLevel = container && (container.id.startsWith('scene-level-container') || 
                            container.classList.contains('scene-level-dashboard-container'));
        
        if (isSceneLevel) {
            const overrideStyleId = 'resource-dashboard-scene-level-overrides';
            if (!document.getElementById(overrideStyleId)) {
                const overrideStyle = document.createElement('style');
                overrideStyle.id = overrideStyleId;
                overrideStyle.textContent = `
                    /* Scene-level overrides for full-width display */
                    #resource-dashboard {
                        max-width: none !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 20px !important;
                        box-sizing: border-box !important;
                    }
                    
                    /* Ensure navigation is full width */
                    #resource-dashboard .navigation-section {
                        max-width: none !important;
                        width: 100% !important;
                    }
                    
                    /* Ensure profile section is properly sized */
                    #resource-dashboard .profile-section {
                        max-width: none !important;
                    }
                    
                    /* Ensure activity section is full width */
                    #resource-dashboard .activity-section {
                        max-width: none !important;
                        width: 100% !important;
                    }
                    
                    /* Ensure admin section is full width */
                    #resource-dashboard .admin-section {
                        max-width: none !important;
                        width: 100% !important;
                    }
                    
                    /* Ensure activity iframe is responsive */
                    #resource-dashboard .activity-iframe {
                        max-width: 100% !important;
                    }
                    
                    /* Responsive adjustments for larger screens */
                    @media (min-width: 1440px) {
                        #resource-dashboard {
                            padding: 30px !important;
                        }
                    }
                    
                    /* Ultra-wide screen adjustments */
                    @media (min-width: 1920px) {
                        #resource-dashboard {
                            padding: 40px !important;
                        }
                    }
                `;
                document.head.appendChild(overrideStyle);
            }
            log('Scene-level CSS overrides added');
        }
        
        // Add Font Awesome
        if (!$('link[href*="font-awesome"]').length) {
            log('Adding Font Awesome...');
            $('head').append('<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css">');
        } else {
            log('Font Awesome already loaded');
        }

        // Show a loading state
        $container.html('<div class="loading-state">Loading Resource Dashboard...</div>');

        // Fetch all data in parallel
        try {
            let profileData, activity;
            
            try {
                profileData = await getStaffProfileData();
                log('Profile data retrieved:', profileData);
                
                // Track user login after successful profile load
                trackUserLogin().catch(error => {
                    errorLog("Error tracking login:", error);
                });
            } catch (profileError) {
                errorLog('Error getting profile data:', profileError);
                // Set default profile data on error
                profileData = {
                    name: Knack.getUserAttributes()?.name || 'User',
                    roles: 'Unknown',
                    school: 'Unknown School',
                    schoolLogo: null,
                    hasAdminRole: false
                };
            }
            
            try {
                activity = await getActivityOfTheWeek();
            } catch (activityError) {
                errorLog('Error getting activity:', activityError);
                activity = null;
            }

            if (!profileData) {
                throw new Error("Failed to load user profile data.");
            }

            // Feedback button and modal HTML
            const feedbackHTML = `
                <button id="feedback-button" class="feedback-button">
                    <i class="fas fa-comment-alt"></i>
                    Support & Feedback
                </button>

                <div id="feedback-modal" class="vespa-modal" style="display: none;">
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
                </div>
            `;

            const dashboardHtml = `
                <div id="resource-dashboard-container">
                    ${renderProfileSection(profileData)}
                    ${renderNavigationSection()}
                    ${renderActivitySection(activity)}
                    ${profileData.hasAdminRole ? renderAdminSection() : ''}
                </div>
            `;

            $container.html(dashboardHtml);
            
            // Add feedback elements to body
            $('body').append(feedbackHTML);
            
            log('Dashboard rendered.');
            
            // Track page view for Resource Dashboard
            trackPageView('Resource Dashboard').catch(err => 
                errorLog('Page view tracking failed:', err)
            );
            
            // Setup feedback functionality
            setupFeedbackSystem();
            
            // Setup navigation button click tracking
            $(document).on('click', '.nav-button, .admin-button', function(e) {
                const buttonText = $(this).find('span').text();
                trackPageView(buttonText).catch(err => 
                    errorLog(`Feature tracking failed for ${buttonText}:`, err)
                );
            });
            
            // Remove any Knack-generated PDF download links after render
            setTimeout(() => {
                // Remove PDF links within the activity embed frame
                $('.activity-embed-frame a[href*=".pdf"]').remove();
                $('.activity-embed-frame .kn-asset-download').remove();
                $('.activity-embed-frame .kn-download-link').remove();
                
                // Also check for any Knack-specific download buttons
                $('.activity-embed-frame').find('a:contains("DOWNLOAD"), a:contains("Download"), a:contains("PDF")').each(function() {
                    const $link = $(this);
                    // Only remove if it's not our header button
                    if (!$link.hasClass('pdf-download-button')) {
                        $link.remove();
                    }
                });
                
                log('Cleaned up any Knack-generated PDF download elements');
            }, 500); // Wait for Knack to finish rendering

        } catch (err) {
            $container.html('<div class="error-state">Could not load dashboard. Please try again later.</div>');
            errorLog('Failed to initialize dashboard:', err);
        }
    }

    try {
        // Expose the initializer function globally for the loader
        window.initializeResourceDashboard = initializeResourceDashboard;
        // Can't use SCRIPT_CONFIG here as it's not initialized yet
        // console.log('[Resource Dashboard] Exposed initializeResourceDashboard to window');
        
        // Only auto-run if not being loaded by the loader
        if (!window.STAFFHOMEPAGE_CONFIG) {
            // console.log('[Resource Dashboard] No loader config found, auto-initializing');
            $(initializeResourceDashboard);
        } else {
            // console.log('[Resource Dashboard] Loader config found, waiting for loader to call initialize');
        }
    } catch (error) {
        errorLog('Error during script initialization:', error);
        errorLog('Stack trace:', error.stack);
    }

})();
