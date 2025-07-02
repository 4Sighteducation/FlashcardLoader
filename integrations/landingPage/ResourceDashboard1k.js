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
        passwordReset: 'field_539'    // Password Reset status (Yes/No)
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
        if (!roles || roles.length === 0) return 'No Role Assigned';
        
        // If roles are objects, extract the name/title
        const formattedRoles = roles.map(role => {
            if (typeof role === 'object' && role !== null) {
                // Try different possible property names
                return role.name || role.title || role.identifier || role.value || 'Unknown Role';
            }
            // If it's a string like "object_5", try to map it to a friendly name
            if (typeof role === 'string') {
                // Common role mappings
                const roleMap = {
                    'object_5': 'Tutor',
                    'object_7': 'Staff Admin',
                    'object_6': 'Administrator',
                    'object_8': 'Manager',
                    'object_9': 'Teacher',
                    'object_10': 'Support Staff'
                };
                return roleMap[role] || role.replace(/object_\d+/, 'Staff Member');
            }
            return role;
        });
        
        return formattedRoles.join(', ');
    }
    
    // Add admin role checking function
    function isStaffAdmin(roles) {
        if (!roles) return false;
        
        // Check if roles is an array
        if (Array.isArray(roles)) {
            return roles.some(role => {
                const roleStr = typeof role === 'object' ? (role.identifier || role.name || '') : String(role);
                return roleStr.toLowerCase().includes('admin') || 
                       roleStr.includes('object_7') || 
                       roleStr.toLowerCase().includes('administrator');
            });
        }
        
        // Check if it's a single role string
        const roleStr = String(roles).toLowerCase();
        return roleStr.includes('admin') || roleStr.includes('object_7');
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
            return { 
                name: user.name, 
                roles: formatRoles(Knack.getUserRoles()), 
                school: 'Unknown School', 
                schoolLogo: null,
                hasAdminRole: isStaffAdmin(Knack.getUserRoles())
            };
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
            hasAdminRole: isStaffAdmin(Knack.getUserRoles())
        };
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
            
            // Enhance embed code for kiosk mode
            const enhancedEmbedCode = enhanceEmbedForKioskMode(activity.html_content);

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

            /* PDF Download Button */
            .activity-buttons {
                display: flex;
                gap: 10px;
                align-items: center;
                flex-shrink: 0;
            }

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

                .activity-embed-frame iframe {
                    height: 400px;
                }
            }
        `;
    }

    // --- Initialization ---
    
    // --- User Verification Functions ---
    // Check user verification status and show appropriate modals
    async function checkUserVerificationStatus() {
        let user = null; // Define user outside try block
        try {
            user = Knack.getUserAttributes();
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
            const isVerified = staffRecord.field_189 === "Yes" || staffRecord.field_189 === true;
            const hasAcceptedPrivacy = staffRecord.field_127 === "Yes" || staffRecord.field_127 === true;
            const hasResetPassword = staffRecord.field_539 === "Yes" || staffRecord.field_539 === true;
            
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
            
            // Determine what needs to be shown based on the correct logic
            let needsPrivacy = false;
            let needsPassword = false;
            
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
                // Edge case - log the state and default to showing what's missing
                console.warn("[Resource Dashboard] Unexpected verification state", {
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
            errorLog("Error in checkUserVerificationStatus:", error);
            errorLog("Error details:", {
                message: error.message,
                stack: error.stack,
                userEmail: user?.email || 'No email'
            });
            
            // Show error message to user
            if (document.querySelector(SCRIPT_CONFIG.elementSelector)) {
                document.querySelector(SCRIPT_CONFIG.elementSelector).innerHTML = 
                    '<div class="error-state">Could not verify user account. Please contact support if this issue persists.</div>';
            }
            
            return false; // Don't allow access on error
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
                
                <div style="background: rgba(255, 255, 255, 0.1); padding: 20px; border-radius: 8px; margin-bottom: 20px; max-height: 400px; overflow-y: auto; position: relative;">
                    <iframe src="https://vespa.academy/assets/MVIMAGES/privacy-policy.html" 
                            style="width: 100%; height: 350px; border: none; background: white; border-radius: 4px; pointer-events: none;"
                            title="Privacy Policy">
                    </iframe>
                    <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1; pointer-events: auto; overflow-y: auto;">
                        <!-- Invisible overlay to allow scrolling but prevent iframe interaction -->
                    </div>
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
                            log('Checkbox checked - button enabled');
                        } else {
                            currentBtn.disabled = true;
                            currentBtn.style.background = '#666';
                            currentBtn.style.color = 'white';
                            currentBtn.style.cursor = 'not-allowed';
                            currentBtn.style.opacity = '0.6';
                            log('Checkbox unchecked - button disabled');
                        }
                    }
                };
                
                // Remove any existing event listeners by using a new approach
                // Instead of cloning, we'll use a named function and remove/add it
                const checkboxChangeHandler = (e) => {
                    log('Checkbox change event fired', { checked: e.target.checked });
                    updateButtonState();
                };
                
                const checkboxClickHandler = (e) => {
                    log('Checkbox click event fired');
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
                    log('Checkbox input event fired');
                    updateButtonState();
                });
                
                // Check initial state
                updateButtonState();
            } else {
                errorLog('Privacy policy elements not found:', {
                    checkbox: checkbox,
                    continueBtn: continueBtn
                });
            }
        }, 100); // 100ms delay to ensure DOM is ready
        
        // Handle continue button click
        if (continueBtn) {
            continueBtn.addEventListener('click', async function() {
                // Need to reference the current checkbox
                const currentCheckbox = document.getElementById('privacy-accept-checkbox');
                if (!currentCheckbox || !currentCheckbox.checked) return;
                
                // Show loading state
                continueBtn.disabled = true;
                continueBtn.innerHTML = 'Updating...';
                
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
                    continueBtn.disabled = false;
                    continueBtn.innerHTML = 'Continue';
                }
            });
        }
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
                    ${renderProfileSection(profileData)}
                    ${renderNavigationSection()}
                    ${renderActivitySection(activity)}
                    ${profileData.hasAdminRole ? renderAdminSection() : ''}
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
