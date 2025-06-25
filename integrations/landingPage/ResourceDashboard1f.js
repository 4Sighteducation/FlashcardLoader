// Resource Dashboard Script for Knack - v1.0
(function() {
    console.log('[Resource Dashboard] Script loaded and executing');
    
    // --- Basic Setup ---
    // Use config from loader if available, otherwise use defaults
    const loaderConfig = window.STAFFHOMEPAGE_CONFIG || {};
    const SCRIPT_CONFIG = {
        knackAppId: loaderConfig.knackAppId || '5ee90912c38ae7001510c1a9',
        knackApiKey: loaderConfig.knackApiKey || '8f733aa5-dd35-4464-8348-64824d1f5f0d',
        elementSelector: loaderConfig.elementSelector || '#view_3024',
        debugMode: loaderConfig.debugMode !== undefined ? loaderConfig.debugMode : true,
    };

    const KNACK_API_URL = 'https://api.knack.com/v1';

    function log(message, ...args) {
        if (SCRIPT_CONFIG.debugMode) {
            console.log('[Resource Dashboard]', message, ...args);
        }
    }

    function errorLog(message, ...args) {
        console.error('[Resource Dashboard]', message, ...args);
    }
    
    const FIELD_MAPPING = {
        staffLoginEmail: 'field_91', // Or field_70
        staffToCustomerConnection: 'field_122',
        customerAccountType: 'field_63',
        schoolConnection: 'field_122',
        schoolName: 'field_2',
        schoolEstablishmentName: 'field_44',
        schoolLogo: 'field_45'
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
            match: 'or', rules: [
                { field: FIELD_MAPPING.staffLoginEmail, operator: 'is', value: email },
                { field: 'field_70', operator: 'is', value: email } // Fallback email field
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
        if (!roles || roles.length === 0) return 'No Role Assigned';
        
        // If roles are objects, extract the name/title
        const formattedRoles = roles.map(role => {
            if (typeof role === 'object' && role !== null) {
                // Try different possible property names
                return role.name || role.title || role.identifier || role.value || 'Unknown Role';
            }
            return role;
        });
        
        return formattedRoles.join(', ');
    }
    
    async function getStaffProfileData() {
        const user = Knack.getUserAttributes();
        if (!user || !user.id) {
            errorLog("Cannot get staff profile: User not logged in.");
            return null;
        }

        log("Fetching staff profile data for:", user.email);
        const staffRecord = await findStaffRecord(user.email);
        if (!staffRecord) {
            return { name: user.name, roles: formatRoles(Knack.getUserRoles()), school: 'Unknown School', schoolLogo: null };
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

        return {
            name: user.name,
            roles: formatRoles(Knack.getUserRoles()),
            school: schoolName,
            schoolLogo: schoolLogo,
        };
    }

    // --- Core Logic ---
    
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
                url: 'https://cdn.jsdelivr.net/gh/4Sighteducation/FlashcardLoader@main/integrations/tutor_activities.json',
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
            
            // Filter activities by current month
            let monthActivities = response.records.filter(activity => {
                const activityMonth = extractMonthFromIdentifier(activity.group_info?.identifier);
                return activityMonth === currentMonth;
            });
            
            // If no activities for current month, use all activities
            if (monthActivities.length === 0) {
                log(`No activities found for ${currentMonth}, using all activities`);
                monthActivities = response.records;
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

            // Extract PDF link from embed code
            let pdfLink = null;
            const pdfMatch = activity.html_content.match(/href="([^"]+\.pdf[^"]*)"/i);
            if (pdfMatch) {
                pdfLink = pdfMatch[1];
                log('Found PDF link:', pdfLink);
            }

            return {
                name: activity.title,
                group: activity.group_info?.identifier || 'N/A',
                category: activity.category,
                embedCode: activity.html_content,
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
    
    function renderNavigationSection() {
        const navButtons = MY_RESOURCES_APPS.map(app => `
            <a href="${app.url}" class="nav-button" target="_blank">
                <i class="${app.icon}"></i>
                <span>${app.name}</span>
            </a>
        `).join('');

        return `
            <nav class="vespa-navigation">
                <div class="nav-container">
                    ${navButtons}
                </div>
            </nav>
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

        // Remove PDF link from embed code if it exists
        let cleanedEmbedCode = activity.embedCode;
        if (activity.pdfLink) {
            // Remove the entire PDF section (hr tags and link)
            cleanedEmbedCode = cleanedEmbedCode.replace(/<hr[^>]*>[\s\S]*?<\/hr>/gi, '');
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
                        ${activity.pdfLink ? `
                            <div class="pdf-download-container">
                                <a href="${activity.pdfLink}" target="_blank" class="pdf-download-button">
                                    <i class="fas fa-file-pdf"></i>
                                    <span>DOWNLOAD PDF</span>
                                </a>
                            </div>
                        ` : ''}
                    </div>
                    <div class="activity-embed-frame">
                        ${cleanedEmbedCode || '<p style="text-align:center; color:#999;">No embed content available</p>'}
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
            .vespa-navigation {
                background: linear-gradient(135deg, #0d2274 0%, #061a54 100%);
                border-radius: 8px;
                padding: 15px;
                margin-bottom: 20px;
                border: 2px solid #00e5db;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
            }

            .nav-container {
                display: flex;
                gap: 15px;
                flex-wrap: wrap;
                justify-content: center;
            }

            .nav-button {
                background: linear-gradient(135deg, #15348e 0%, #102983 100%);
                color: #ffffff;
                text-decoration: none;
                padding: 12px 24px;
                border-radius: 6px;
                display: flex;
                align-items: center;
                gap: 10px;
                transition: all 0.3s ease;
                border: 1px solid #00e5db;
                font-weight: 600;
                font-size: 14px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            }

            .nav-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 16px rgba(0, 229, 219, 0.4);
                background: linear-gradient(135deg, #1a3ea0 0%, #153494 100%);
            }

            .nav-button i {
                font-size: 18px;
                color: #00e5db;
            }

            .nav-button:hover i {
                color: #ffffff;
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

            /* PDF Download Button */
            .pdf-download-container {
                flex: 0 0 auto;
            }

            .pdf-download-button {
                display: inline-flex;
                align-items: center;
                gap: 10px;
                background: linear-gradient(135deg, #e59437 0%, #d88327 100%);
                color: #ffffff;
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
            }

            .pdf-download-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(229, 148, 55, 0.5);
                background: linear-gradient(135deg, #f0a040 0%, #e59437 100%);
            }

            .pdf-download-button i {
                font-size: 18px;
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
            }

            .activity-embed-frame iframe {
                width: 100%;
                height: 450px;
                border: none;
                display: block;
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

            /* Responsive adjustments */
            @media (max-width: 768px) {
                #resource-dashboard-container {
                    padding: 15px;
                }

                .nav-container {
                    flex-direction: column;
                }

                .nav-button {
                    width: 100%;
                    justify-content: center;
                }

                .activity-header {
                    flex-direction: column;
                    align-items: flex-start;
                }

                .pdf-download-button {
                    width: 100%;
                    justify-content: center;
                }

                .profile-details {
                    flex-direction: column;
                    gap: 10px;
                }

                .activity-embed-frame iframe {
                    height: 400px;
                }
            }
        `;
    }

    // --- Initialization ---
    async function initializeResourceDashboard() {
        console.log('[Resource Dashboard] initializeResourceDashboard function called!');
        log('Initializing Resource Dashboard...');
        
        // Extra debug info
        console.log('[Resource Dashboard] Config:', SCRIPT_CONFIG);
        console.log('[Resource Dashboard] Looking for container:', SCRIPT_CONFIG.elementSelector);
        
        const $container = $(SCRIPT_CONFIG.elementSelector);
        
        if ($container.length === 0) {
            errorLog('Container element not found:', SCRIPT_CONFIG.elementSelector);
            return;
        }
        
        console.log('[Resource Dashboard] Container found, proceeding with initialization');

        // Add styles - with debugging
        const cssContent = getDashboardCSS();
        console.log('[Resource Dashboard] CSS content length:', cssContent.length);
        const styleElement = $(`<style id="resource-dashboard-styles">${cssContent}</style>`);
        $('head').append(styleElement);
        console.log('[Resource Dashboard] Style element added to head:', $('#resource-dashboard-styles').length > 0);
        
        // Add Font Awesome
        if (!$('link[href*="font-awesome"]').length) {
            console.log('[Resource Dashboard] Adding Font Awesome...');
            $('head').append('<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css">');
        } else {
            console.log('[Resource Dashboard] Font Awesome already loaded');
        }

        // Show a loading state
        $container.html('<div class="loading-state">Loading Resource Dashboard...</div>');

        // Fetch all data in parallel
        try {
            const [profileData, activity] = await Promise.all([
                getStaffProfileData(),
                getActivityOfTheWeek()
            ]);

            if (!profileData) {
                throw new Error("Failed to load user profile data.");
            }

            const dashboardHtml = `
                <div id="resource-dashboard-container">
                    ${renderNavigationSection()}
                    ${renderProfileSection(profileData)}
                    ${renderActivitySection(activity)}
                </div>
            `;

            $container.html(dashboardHtml);
            log('Dashboard rendered.');

        } catch (err) {
            $container.html('<div class="error-state">Could not load dashboard. Please try again later.</div>');
            errorLog('Failed to initialize dashboard:', err);
        }
    }

    try {
        // Expose the initializer function globally for the loader
        window.initializeResourceDashboard = initializeResourceDashboard;
        console.log('[Resource Dashboard] Exposed initializeResourceDashboard to window');
        console.log('[Resource Dashboard] Type check:', typeof window.initializeResourceDashboard);
        
        // Only auto-run if not being loaded by the loader
        if (!window.STAFFHOMEPAGE_CONFIG) {
            console.log('[Resource Dashboard] No loader config found, auto-initializing');
            $(initializeResourceDashboard);
        } else {
            console.log('[Resource Dashboard] Loader config found, waiting for loader to call initialize');
        }
    } catch (error) {
        console.error('[Resource Dashboard] Error during script initialization:', error);
        console.error('[Resource Dashboard] Stack trace:', error.stack);
    }

})();
