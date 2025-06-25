// Resource Dashboard Script for Knack - v1.0
(function() {
    // --- Basic Setup ---
    const SCRIPT_CONFIG = {
        knackAppId: '5ee90912c38ae7001510c1a9', // Assuming same App ID
        knackApiKey: '8f733aa5-dd35-4464-8348-64824d1f5f0d', // Assuming same API Key
        elementSelector: '#view_3024',
        debugMode: true,
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
    
    async function getStaffProfileData() {
        const user = Knack.getUserAttributes();
        if (!user || !user.id) {
            errorLog("Cannot get staff profile: User not logged in.");
            return null;
        }

        log("Fetching staff profile data for:", user.email);
        const staffRecord = await findStaffRecord(user.email);
        if (!staffRecord) {
            return { name: user.name, roles: Knack.getUserRoles(), school: 'Unknown School', schoolLogo: null };
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
            roles: Knack.getUserRoles(),
            school: schoolName,
            schoolLogo: schoolLogo,
        };
    }

    // --- Core Logic ---
    async function getActivityOfTheWeek() {
        log('Fetching all activities from object_58...');
        const response = await makeKnackRequest('objects/object_58/records?rows_per_page=1000');
        if (!response || !response.records || response.records.length === 0) {
            errorLog('No activities found in object_58.');
            return null;
        }
        
        // Use the day of the year to select a "random" activity that changes daily.
        const today = new Date();
        const start = new Date(today.getFullYear(), 0, 0);
        const diff = today - start;
        const oneDay = 1000 * 60 * 60 * 24;
        const dayOfYear = Math.floor(diff / oneDay);
        
        const activityIndex = dayOfYear % response.records.length;
        const activity = response.records[activityIndex];
        log(`Activity of the week (index ${activityIndex}):`, activity);

        return {
            name: activity.field_1431,
            group: activity.field_1435,
            category: activity.field_1461,
            embedCode: activity.field_1448
        };
    }

    // --- Rendering Functions ---
    
    function renderProfileSection(profileData) {
        // Simplified profile section
        return `
            <section class="vespa-section profile-section">
                <h2 class="vespa-section-title">Staff Profile</h2>
                <div class="profile-info">
                    <div class="profile-details">
                         <div class="logo-container">
                            ${profileData.schoolLogo ? `<img src="${profileData.schoolLogo}" alt="${profileData.school} Logo" class="school-logo">` : ''}
                        </div>
                        <div class="profile-name">${profileData.name}</div>
                        <div class="profile-item">
                            <span class="profile-label">School:</span>
                            <span class="profile-value">${profileData.school}</span>
                        </div>
                        <div class="profile-item">
                            <span class="profile-label">Role(s):</span>
                            <span class="profile-value">${profileData.roles.join(', ')}</span>
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
                    <h2 class="vespa-section-title">Activity of the Week</h2>
                    <div class="activity-container">
                        <p>Could not load the activity of the week. Please check back later.</p>
                    </div>
                </section>
            `;
        }

        // A nicer embed frame
        return `
            <section class="vespa-section activity-section">
                <h2 class="vespa-section-title">Activity of the Week</h2>
                <div class="activity-container">
                    <div class="activity-header">
                        <h3>${activity.name || 'Untitled Activity'}</h3>
                        <div class="activity-meta">
                            <span><strong>Group:</strong> ${activity.group || 'N/A'}</span>
                            <span><strong>Category:</strong> ${activity.category || 'N/A'}</span>
                        </div>
                    </div>
                    <div class="activity-embed-frame">
                        ${activity.embedCode}
                    </div>
                </div>
            </section>
        `;
    }
    
    const MY_RESOURCES_APPS = [
       { name: "Slide Decks", url: "https://vespaacademy.knack.com/vespa-academy#tutor-activities/", icon: "fa-solid fa-display" },
       { name: "Newsletter", url: "https://vespaacademy.knack.com/vespa-academy#vespa-newsletter/", icon: "fa-solid fa-newspaper" },
       { name: "Curriculum", url: "https://vespaacademy.knack.com/vespa-academy#vespa-curriculum/suggested-curriculum/", icon: "fa-solid fa-book-open" },
       { name: "Worksheets", url: "https://vespaacademy.knack.com/vespa-academy#worksheets/", icon: "fa-solid fa-file-pdf" },
    ];

    function renderResourcesSection() {
        const appButtons = MY_RESOURCES_APPS.map(app => `
            <a href="${app.url}" class="app-button" target="_blank">
                <div class="app-icon"><i class="${app.icon}"></i></div>
                <div class="app-name">${app.name}</div>
            </a>
        `).join('');

        return `
            <section class="vespa-section resources-section">
                <h2 class="vespa-section-title">My Resources</h2>
                <div class="app-hub single-row">
                    ${appButtons}
                </div>
            </section>
        `;
    }
    
    function getDashboardCSS() {
        return `
            /* Basic styles */
            .main-container { display: flex; flex-direction: column; gap: 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
            .vespa-section { background: #0a2b8c; border: 1px solid #00e5db; border-radius: 8px; padding: 20px; color: #fff; }
            .vespa-section-title { font-size: 1.5em; margin-bottom: 20px; color: #00e5db; }

            /* Profile Section */
            .profile-section .profile-details { display: flex; flex-direction: column; gap: 10px; }
            .profile-name { font-size: 1.8em; font-weight: bold; }
            .profile-item .profile-label { font-weight: bold; color: #00e5db; }
            .school-logo { max-width: 150px; margin-bottom: 10px; }

            /* Activity Section */
            .activity-container { display: flex; flex-direction: column; gap: 15px; }
            .activity-header h3 { margin: 0; font-size: 1.4em; }
            .activity-meta { display: flex; gap: 20px; font-size: 0.9em; opacity: 0.9; }
            .activity-embed-frame { border: 2px solid #15348e; border-radius: 8px; overflow: hidden; }
            .activity-embed-frame iframe { width: 100%; height: 500px; border: none; }

            /* Resources Section */
            .app-hub.single-row { display: flex; justify-content: space-around; gap: 15px; flex-wrap: wrap; }
            .app-button {
                background: #15348e;
                color: #fff;
                text-decoration: none;
                padding: 20px;
                border-radius: 8px;
                text-align: center;
                transition: transform 0.2s, box-shadow 0.2s;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 10px;
                flex-basis: 200px; /* Adjust basis for single row */
            }
            .app-button:hover {
                transform: translateY(-5px);
                box-shadow: 0 5px 15px rgba(0, 229, 219, 0.4);
            }
            .app-icon i { font-size: 2.5em; color: #00e5db; }
            .app-name { font-size: 1.1em; font-weight: bold; }
        `;
    }


    // --- Initialization ---
    async function initializeResourceDashboard() {
        log('Initializing Resource Dashboard...');
        const $container = $(SCRIPT_CONFIG.elementSelector);
        if ($container.length === 0) {
            errorLog('Container element not found.');
            return;
        }

        // Add styles
        $('head').append(`<style>${getDashboardCSS()}</style>`);
         // Add Font Awesome
        if (!$('link[href*="font-awesome"]').length) {
            $('head').append('<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css">');
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
                <div class="main-container">
                    ${renderProfileSection(profileData)}
                    ${renderActivitySection(activity)}
                    ${renderResourcesSection()}
                </div>
            `;

            $container.html(dashboardHtml);
            log('Dashboard rendered.');

        } catch (err) {
            $container.html('<div class="error-state">Could not load dashboard. Please try again later.</div>');
            errorLog('Failed to initialize dashboard:', err);
        }
    }

    // Run initializer on document ready
    $(initializeResourceDashboard);

})();

