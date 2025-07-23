/// == Knack Builder Multi-App Loader v3.16 ==
// == Knack Builder Multi-App Loader v3.16 ==
// Goal: Load different JS apps based on Knack Scene/View event data, regardless of order.
// Strategy: Store the latest scene AND view keys. After each event, check if the
//           current combination matches an app. Load script, set specific config, call initializer.
// Changes from v3.15: Added configGlobalVar/initializerFunctionName, explicit call after load.

(function () {
    // --- Configuration ---
    const VERSION = "3.16"; // Updated version
    const DEBUG_MODE = true; // TEMPORARILY ENABLED for debugging resourcePageHeader

    if (DEBUG_MODE) console.log(`[Knack Builder Loader v${VERSION}] Script start.`);

    // --- App Configuration ---
    const APPS = {
        'myAcademicProfile': {
  scenes: ['scene_43'], // Load on scene_43
  views: ['view_3046'],  // Specifically for view_3046
  scriptUrl: 'https://cdn.jsdelivr.net/gh/4Sighteducation/FlashcardLoader@main/integrations/report/MyAcademicProfilePage2d.js', // Ensure this URL is correct and points to your script
  configBuilder: (baseConfig, sceneKey, viewKey) => ({
    ...baseConfig, // Includes knackAppId, knackApiKey, debugMode, etc.
    appType: 'myAcademicProfile',
    sceneKey: sceneKey, // Will be 'scene_43' in this case
    viewKey: viewKey,   // Will be 'view_3046' in this case
    elementSelector: '#view_3046', // Target for rendering the profile
  }),
  configGlobalVar: 'MY_ACADEMIC_PROFILE_CONFIG', // Matches the global variable used in your script
  initializerFunctionName: 'initializeMyAcademicProfilePage' // Matches the function name in your script
},
        'studentCoachLauncher': { // New entry for the Student Coach Launcher
            scenes: ['scene_43'], // Targets scene_43
            views: ['view_3055'],   // Specifically for view_3055
            scriptUrl: 'https://cdn.jsdelivr.net/gh/4Sighteducation/FlashcardLoader@main/integrations/report/vespa-student-coach3j.js', // UPDATED URL
            configBuilder: (baseConfig, sceneKey, viewKey) => ({
                ...baseConfig,
                appType: 'studentCoachLauncher',
                debugMode: false, // Enable debugging for studentCoachLauncher
                sceneKey: sceneKey,
                viewKey: viewKey, // Will be 'view_3055'
                elementSelector: '#view_3055 .kn-rich_text__content', // Target for the button/launcher
                aiCoachPanelId: 'studentCoachSlidePanel', // Unique ID for the student panel
                aiCoachToggleButtonId: 'activateStudentCoachBtn', // Unique ID for the student toggle button
                mainContentSelector: '#kn-scene_43' // Selector for the main content area to resize on this scene
            }),
            configGlobalVar: 'STUDENT_COACH_LAUNCHER_CONFIG',
            initializerFunctionName: 'initializeStudentCoachLauncher'
        },
        'reportProfiles': {
            scenes: ['scene_1095'],
            views: ['view_2776', 'view_3015'],
            scriptUrl: 'https://cdn.jsdelivr.net/gh/4Sighteducation/FlashcardLoader@main/integrations/report/ReportProfiles3b.js',
            configBuilder: (baseConfig, sceneKey, viewKey) => ({
                ...baseConfig,
                appType: 'reportProfiles',
                debugMode: false,
                sceneKey: sceneKey,
                viewKey: viewKey,
                elementSelectors: {
                    reportContainer: '#view_2776 .kn-rich_text__content',
                    profileContainer: '#view_3015 .kn-rich_text__content'
                }
            }),
            configGlobalVar: 'REPORTPROFILE_CONFIG',
            initializerFunctionName: 'initializeReportProfiles'
        },
        'aiCoachLauncher': { // New entry for the AI Coach Launcher
            scenes: ['scene_1095'], // Same scene as reportProfiles
            views: ['view_3047'],   // The new rich text view
            scriptUrl: 'https://cdn.jsdelivr.net/gh/4Sighteducation/FlashcardLoader@main/integrations/report/aiCoachLauncher4c.js', // Updated to point to the new dedicated script
            configBuilder: (baseConfig, sceneKey, viewKey) => ({
                ...baseConfig,
                appType: 'aiCoachLauncher',
                debugMode: false, // Enable debugging for aiCoachLauncher
                sceneKey: sceneKey,
                viewKey: viewKey, // Will be 'view_3047'
                elementSelector: '#view_3047 .kn-rich_text__content', // Target for the button
                aiCoachPanelId: 'aiCoachSlidePanel', // ID for the panel we'll create
                aiCoachToggleButtonId: 'activateAICoachBtn', // ID for the toggle button
                mainContentSelector: '#kn-scene_1095' // Selector for the main content area to resize
            }),
            configGlobalVar: 'AI_COACH_LAUNCHER_CONFIG',
            initializerFunctionName: 'initializeAICoachLauncher' // New function to create in ReportProfiles2k.js
        },
        'flashcards': {
            scenes: ['scene_1206'],
            views: ['view_3005'],
            scriptUrl: 'https://cdn.jsdelivr.net/gh/4Sighteducation/FlashcardLoader@main/integrations/Flashcards4z.js',
            configBuilder: (baseConfig, sceneKey, viewKey) => ({
                ...baseConfig,
                appType: 'flashcards',
                sceneKey: sceneKey,
                viewKey: viewKey,
                elementSelector: '.kn-rich-text',
                appUrl: 'https://vespa-flashcards-e7f31e9ff3c9.herokuapp.com/'
            }),
            configGlobalVar: 'VESPA_CONFIG',
            initializerFunctionName: 'initializeFlashcardApp'
        },
        'studyPlanner': {
            scenes: ['scene_1208'],
            views: ['view_3008'],
            scriptUrl: 'https://cdn.jsdelivr.net/gh/4Sighteducation/FlashcardLoader@main/integrations/studyPlanner2m.js',
            configBuilder: (baseConfig, sceneKey, viewKey) => ({
                ...baseConfig,
                appType: 'studyPlanner',
                sceneKey: sceneKey,
                viewKey: viewKey,
                elementSelector: '.kn-rich-text',
                appUrl: 'https://studyplanner2-fc98f9e231f4.herokuapp.com/'
            }),
            configGlobalVar: 'STUDYPLANNER_CONFIG',
            initializerFunctionName: 'initializeStudyPlannerApp'
        },
        'taskboards': {
            scenes: ['scene_1188'], 
            views: ['view_3009'],   
            scriptUrl: 'https://cdn.jsdelivr.net/gh/4Sighteducation/FlashcardLoader@main/integrations/taskboard1c.js', 
            configBuilder: (baseConfig, sceneKey, viewKey) => ({
                ...baseConfig,
                appType: 'taskboards',
                sceneKey: sceneKey,
                viewKey: viewKey,
                elementSelector: '.kn-rich-text',
                appUrl: 'https://vespataskboards-00affb61eb55.herokuapp.com/' 
            }),
            configGlobalVar: 'TASKBOARD_CONFIG', 
            initializerFunctionName: 'initializeTaskboardApp' 
        },
        'homepage': {
            scenes: ['scene_1210'],
            views: ['view_3013'],
            scriptUrl: 'https://cdn.jsdelivr.net/gh/4Sighteducation/FlashcardLoader@main/integrations/landingPage/Homepage4p.js', 
            configBuilder: (baseConfig, sceneKey, viewKey) => ({
                ...baseConfig,
                appType: 'homepage',
                sceneKey: sceneKey,
                viewKey: viewKey,
                elementSelector: '#view_3013', 
            }),
            configGlobalVar: 'HOMEPAGE_CONFIG',
            initializerFunctionName: 'initializeHomepage'
        },
        'uploadSystem': {
            scenes: ['scene_1212'],
            views: ['view_3020'],
            scriptUrl: 'https://cdn.jsdelivr.net/gh/4Sighteducation/vespa-upload-bridge@main/src/index9k.js',
            configBuilder: (baseConfig, sceneKey, viewKey) => ({
                ...baseConfig,
                appType: 'uploadSystem',
                sceneKey: sceneKey,
                viewKey: viewKey,
                elementSelector: '#view_3020 .kn-rich_text__content',
                apiUrl: 'https://vespa-upload-api-07e11c285370.herokuapp.com',
                userRole: Knack.getUserRoles()[0] || 'Staff Admin', 
            }),
            configGlobalVar: 'VESPA_UPLOAD_CONFIG',
            initializerFunctionName: 'initializeUploadBridge'
        },

        'staffHomepageCoaching': {
            scenes: ['scene_1215'],
            views: ['view_3024'],
            scriptUrl: 'https://cdn.jsdelivr.net/gh/4Sighteducation/FlashcardLoader@main/integrations/landingPage/staffHomepage5t.js',
            configBuilder: (baseConfig, sceneKey, viewKey) => ({
                ...baseConfig,
                appType: 'staffHomepage',
                sceneKey: sceneKey,
                viewKey: viewKey,
                elementSelector: '#view_3024',
                sendGrid: {
                    proxyUrl: 'https://vespa-sendgrid-proxy-660b8a5a8d51.herokuapp.com/api/send-email',
                    fromEmail: 'noreply@notifications.vespa.academy',
                    fromName: 'VESPA Academy',
                    templateId: 'd-6a6ac61c9bab43e28706dbb3da4acdcf', 
                    confirmationtemplateId: 'd-2e21f98579f947b08f2520c567b43c35',
                }
            }),
            configGlobalVar: 'STAFFHOMEPAGE_CONFIG',
            initializerFunctionName: 'initializeStaffHomepage'
        },
        'generalHeader': {
            scenes: ['all'], // Special flag to load on all scenes
            views: ['any'],  // Special flag to load on any view
            scriptUrl: 'https://cdn.jsdelivr.net/gh/4Sighteducation/FlashcardLoader@main/integrations/GeneralHeader1y.js',
            configBuilder: (baseConfig, sceneKey, viewKey) => ({
                ...baseConfig,
                appType: 'generalHeader',
                debugMode: true, // Enable during development
                sceneKey: sceneKey,
                viewKey: viewKey,
                // User detection
                userRoles: (typeof Knack !== 'undefined' && Knack.getUserRoles) ? Knack.getUserRoles() : [],
                userAttributes: (typeof Knack !== 'undefined' && Knack.getUserAttributes) ? Knack.getUserAttributes() : {},
                // Navigation elements to potentially hide/modify
                knackElements: {
                    menu: '.kn-menu',
                    tabs: '.kn-tab-menu'
                }
            }),
            configGlobalVar: 'GENERAL_HEADER_CONFIG',
            initializerFunctionName: 'initializeGeneralHeader'
        },
        'staffHomepageResource': {
            scenes: ['scene_1215'],
            views: ['view_3024'],
            scriptUrl: 'https://cdn.jsdelivr.net/gh/4Sighteducation/FlashcardLoader@main/integrations/landingPage/ResourceDashboard1w.js',
            configBuilder: (baseConfig, sceneKey, viewKey) => ({
                ...baseConfig,
                appType: 'resourceDashboard',
                sceneKey: sceneKey,
                viewKey: viewKey,
                elementSelector: '#view_3024',
                sendGrid: {
                    proxyUrl: 'https://vespa-sendgrid-proxy-660b8a5a8d51.herokuapp.com/api/send-email',
                    fromEmail: 'noreply@notifications.vespa.academy',
                    fromName: 'VESPA Academy',
                    templateId: 'd-6a6ac61c9bab43e28706dbb3da4acdcf', 
                    confirmationtemplateId: 'd-2e21f98579f947b08f2520c567b43c35',
                }
            }),
            configGlobalVar: 'STAFFHOMEPAGE_CONFIG',
            initializerFunctionName: 'initializeResourceDashboard'
        },
        'coachSummary': { // New App: Coach Summary
            scenes: ['scene_1224'],
            views: ['view_3054'],
            // IMPORTANT: Replace with your actual GitHub URL for coachSummary.js when ready
            scriptUrl: 'https://cdn.jsdelivr.net/gh/4Sighteducation/FlashcardLoader@main/integrations/report/coachSummary.js',
            configBuilder: (baseConfig, sceneKey, viewKey) => ({
                ...baseConfig, // Includes knackAppId, knackApiKey from sharedConfig
                appType: 'coachSummary',
                debugMode: false, // Enable debugging during development
                sceneKey: sceneKey,
                viewKey: viewKey,
                elementSelector: '#view_3054', // Target the entire view_3049 for app content
                objectKeys: {
                    vespaResults: 'object_10' // From your README
                }
                // Field keys will be managed within coachSummary.js itself
            }),
            configGlobalVar: 'COACH_SUMMARY_CONFIG',
            initializerFunctionName: 'initializeCoachSummaryApp'
        },
                 'scene481Fix': { // Scene 481 Resources Page Fix
            scenes: ['scene_481'],
            views: ['any'], // Load on any view within scene_481
            scriptUrl: 'https://cdn.jsdelivr.net/gh/4Sighteducation/FlashcardLoader@main/integrations/resourcesFix1p.js', // Local file for now
            configBuilder: (baseConfig, sceneKey, viewKey) => ({
                ...baseConfig,
                appType: 'scene481Fix',
                debugMode: true,
                sceneKey: sceneKey,
                viewKey: viewKey
            }),
            configGlobalVar: 'SCENE_481_FIX_CONFIG',
            initializerFunctionName: null // This script self-initializes
        },
        'bulkPrint': { // Bulk Print App
            scenes: ['scene_1227'],
            views: ['view_3062'],
            scriptUrl: 'https://cdn.jsdelivr.net/gh/4Sighteducation/FlashcardLoader@main/integrations/report/report_printing4h.js',
            configBuilder: (baseConfig, sceneKey, viewKey) => {
                // Debug log to check what's in baseConfig
                if (DEBUG_MODE) {
                    console.log('[BulkPrint ConfigBuilder] baseConfig:', baseConfig);
                    console.log('[BulkPrint ConfigBuilder] baseConfig keys:', Object.keys(baseConfig));
                }
                
                // Explicitly include the credentials
                const config = {
                    knackAppId: baseConfig.knackAppId || '5ee90912c38ae7001510c1a9',
                    knackApiKey: baseConfig.knackApiKey || '8f733aa5-dd35-4464-8348-64824d1f5f0d',
                    appType: 'bulkPrint',
                    debugMode: false, // production
                    sceneKey: sceneKey,
                    viewKey: viewKey,
                    elementSelector: '#view_3062', // Target the correct view
                    objectKeys: {
                        vespaResults: 'object_10' // From your README
                    }
                    // Field keys will be managed within report_printing.js itself
                };
                
                if (DEBUG_MODE) console.log('[BulkPrint ConfigBuilder] Final config:', config);
                return config;
            },
            configGlobalVar: 'BULK_PRINT_CONFIG',
            initializerFunctionName: 'initializeBulkPrintApp'
        },


        'dashboard': { // DASHBOARD App Configuration
            scenes: ['scene_1225'],
            views: ['view_3058'],
            scriptUrl: 'https://cdn.jsdelivr.net/gh/4Sighteducation/vespa-dashboard@main/src/dashboard3u.js', // Your versioned file
            configBuilder: (baseConfig, sceneKey, viewKey) => {
                const userAttributes = (typeof Knack !== 'undefined' && Knack.getUserAttributes) ? Knack.getUserAttributes() : {};
                const loggedInUserEmail = userAttributes.email || null; // Get user's email

                return {
                    ...baseConfig,
                    appType: 'dashboard',
                    debugMode: false,
                    sceneKey: sceneKey,
                    viewKey: viewKey,
                    elementSelector: '#view_3058',
                    herokuAppUrl: 'https://vespa-dashboard-9a1f84ee5341.herokuapp.com',
                    loggedInUserEmail: loggedInUserEmail, // Pass the logged-in user's email
                    objectKeys: {
                        vespaResults: 'object_10',
                        questionnaireResponses: 'object_29',
                        staffAdminRoles: 'object_5', // Object key for Staff Admin Roles
                        superUserRoles: 'object_21', // Object key for Super User Roles
                        nationalBenchmarkData: 'object_120' // Key for national data (also object_10)
                    },
                    themeColors: {
                        vision: '#ff8f00',
                        effort: '#86b4f0',
                        systems: '#72cb44',
                        practice: '#7f31a4',
                        attitude: '#f032e6'
                    }
                };
            },
            configGlobalVar: 'DASHBOARD_CONFIG',
            initializerFunctionName: 'initializeDashboardApp'
        }
    };

    // --- Shared Configuration --- (Optional: Can be merged by configBuilder if needed)
    const sharedConfig = {
        knackAppId: '5ee90912c38ae7001510c1a9',
        knackApiKey: '8f733aa5-dd35-4464-8348-64824d1f5f0d',
        // Add SendGrid configuration
        sendGrid: {
            apiKey: "SG.ZI-0OuNSQfivFrKL-9c5rA.5NH3fJXq04fblt2iMxCT8yWzJ_Sy9ZM2r", // ......jLY0RwyOh0 add before deploy
            fromEmail: 'noreply@notifications.vespa.academy',
            fromName: 'VESPA Academy'
        }
    };

    // --- State ---
    let loadedAppKey = null;
    let lastRenderedSceneKey = null; // Store the latest scene key
    let lastRenderedViewKey = null;  // Store the latest view key

    // --- Helper Functions ---
    function log(message, data) {
        if (DEBUG_MODE) {
            let logData = data;
            // Avoid circular structure issues in logging complex objects
            if (typeof data === 'object' && data !== null) {
                try { logData = JSON.parse(JSON.stringify(data)); } catch (e) { logData = "[Data non-serializable for logging]"; }
            }
            console.log(`[Loader v${VERSION}] ${message}`, logData === undefined ? '' : logData);
        }
    }

    function errorLog(message, data) {
        console.error(`[Loader v${VERSION} ERROR] ${message}`, data === undefined ? '' : data);
        // Optionally, include more details or context if DEBUG_MODE is true
        if (DEBUG_MODE && typeof data === 'object' && data !== null && data.exception) {
            console.error("[Loader Detailed Exception]:", data.exception);
        }
    }

    // Adjusted loadScript: Resolves AFTER success, easier chaining
    function loadScript(url) {
        return new Promise((resolve, reject) => {
            if (typeof $ === 'undefined' || typeof $.getScript === 'undefined') {
                const errorMsg = "jQuery ($) or $.getScript is not defined.";
                errorLog(errorMsg, { scriptUrl: url });
                return reject(new Error(errorMsg));
            }
            log("loadScript: Attempting to load script via jQuery:", url);
            $.getScript(url)
                .done(() => {
                    log("loadScript: Script loaded successfully via getScript:", url);
                    // Add a check to see if we're loading ResourceDashboard
                    if (url.includes('ResourceDashboard')) {
                        log("loadScript: ResourceDashboard.js loaded - checking for initializer");
                        if (typeof window.initializeResourceDashboard === 'function') {
                            log("loadScript: initializeResourceDashboard function found!");
                        } else {
                            log("loadScript: initializeResourceDashboard function NOT found");
                        }
                    }
                    resolve(); // Resolve *after* script execution succeeded
                })
                .fail((jqxhr, settings, exception) => {
                    errorLog("loadScript: Failed to load script via jQuery.", { scriptUrl: url, status: jqxhr?.status, settings: settings, exception: exception });
                    reject(new Error(`Failed to load script: ${url} - ${exception || 'Unknown reason'}`));
                });
        });
    }

    // New helper function to load scripts sequentially
    async function loadScriptsSequentially(urls) {
        for (const url of urls) {
            log(`loadScriptsSequentially: Attempting to load ${url}`);
            try {
                await loadScript(url); // Assumes loadScript returns a Promise that resolves on success
                log(`loadScriptsSequentially: Successfully loaded ${url}`);
            } catch (error) {
                errorLog(`loadScriptsSequentially: Failed to load ${url}`, error);
                throw new Error(`Failed to load essential script: ${url}`); // Stop if a critical script fails
            }
        }
    }

    // New helper function to load CSS dynamically
    function loadCSS(url) {
        return new Promise((resolve, reject) => {
            log("loadCSS: Attempting to load stylesheet:", url);
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.type = 'text/css';
            link.href = url;
            link.onload = () => {
                log("loadCSS: Stylesheet loaded successfully:", url);
                resolve();
            };
            link.onerror = () => {
                errorLog("loadCSS: Failed to load stylesheet.", { stylesheetUrl: url });
                reject(new Error(`Failed to load stylesheet: ${url}`)); // Reject promise on error
            };
            document.getElementsByTagName('head')[0].appendChild(link);
        });
    }

    // Simplified findAppToLoad: DOM check for reportProfiles, standard loop for others.
    function findAppToLoad(sceneKey, viewKey) {
        let appsFound = []; // Store multiple apps if applicable

        // DOM check for myAcademicProfile
        if (APPS.myAcademicProfile && sceneKey === APPS.myAcademicProfile.scenes[0]) { // Checks if current scene is scene_43
            const appConfig = APPS.myAcademicProfile;
            const viewElement = document.querySelector(`#${appConfig.views[0]}`); // Check for #view_3046 container
            if (viewElement) {
                log(`findAppToLoad: [myAcademicProfile] DOM Match on ${sceneKey}: View Container #${appConfig.views[0]} exists.`);
                lastRenderedViewKey = appConfig.views[0]; 
                if (!appsFound.includes('myAcademicProfile')) appsFound.push('myAcademicProfile');
            }
        }
        
        // DOM check for studentCoachLauncher
        if (APPS.studentCoachLauncher && sceneKey === APPS.studentCoachLauncher.scenes[0]) { // Checks if current scene is scene_43
            const appConfig = APPS.studentCoachLauncher;
            const viewElement = document.querySelector(`#${appConfig.views[0]}`); // Check for #view_3055 container
            if (viewElement) {
                log(`findAppToLoad: [studentCoachLauncher] DOM Match on ${sceneKey}: View Container #${appConfig.views[0]} exists.`);
                lastRenderedViewKey = appConfig.views[0]; 
                if (!appsFound.includes('studentCoachLauncher')) appsFound.push('studentCoachLauncher');
            }
        }

        // DOM checks for scene_1095 (reportProfiles and aiCoachLauncher)
        if (sceneKey === 'scene_1095') { 
            if (APPS.reportProfiles) {
                const reportContainerSelector = APPS.reportProfiles.configBuilder(sharedConfig, sceneKey, APPS.reportProfiles.views[0]).elementSelectors.reportContainer;
                const profileContainerSelector = APPS.reportProfiles.configBuilder(sharedConfig, sceneKey, APPS.reportProfiles.views[1]).elementSelectors.profileContainer;
                if (document.querySelector(reportContainerSelector) && document.querySelector(profileContainerSelector)) {
                    log(`findAppToLoad: [reportProfiles] DOM Match on ${sceneKey}: Both required views/elements found.`);
                    if (!appsFound.includes('reportProfiles')) appsFound.push('reportProfiles');
                }
            }
            if (APPS.aiCoachLauncher) {
                const aiCoachAppConfig = APPS.aiCoachLauncher;
                const elementSelectorToCheck = aiCoachAppConfig.configBuilder(sharedConfig, sceneKey, aiCoachAppConfig.views[0]).elementSelector;
                if (document.querySelector(elementSelectorToCheck)) {
                    log(`findAppToLoad: [aiCoachLauncher] DOM Match on ${sceneKey}: Element '${elementSelectorToCheck}' exists.`);
                    lastRenderedViewKey = aiCoachAppConfig.views[0]; 
                    if (!appsFound.includes('aiCoachLauncher')) appsFound.push('aiCoachLauncher');
                } 
            }
        }

        // DOM check for coachSummary when its scene is active
        if (sceneKey === 'scene_1224' && APPS.coachSummary) {
            const coachSummaryAppConfig = APPS.coachSummary;
            const elementSelectorToCheck = coachSummaryAppConfig.configBuilder(sharedConfig, sceneKey, coachSummaryAppConfig.views[0]).elementSelector;
            if (document.querySelector(elementSelectorToCheck)) {
                log(`findAppToLoad: [coachSummary] DOM Match on ${sceneKey}: Element '${elementSelectorToCheck}' (view_3049 container) exists.`);
                lastRenderedViewKey = coachSummaryAppConfig.views[0]; 
                if (!appsFound.includes('coachSummary')) appsFound.push('coachSummary'); // Ensure it's added if found
            }
        }
        
        // Check for generalHeader (loads on all pages)
        if (APPS.generalHeader && sceneKey) {
            log(`findAppToLoad: Checking if generalHeader should load on ${sceneKey}`);
            const generalHeaderConfig = APPS.generalHeader;
            // Check if scenes includes 'all' flag
            if (generalHeaderConfig.scenes.includes('all')) {
                log(`findAppToLoad: [generalHeader] Universal load enabled - will load on any scene`);
                if (!appsFound.includes('generalHeader')) appsFound.push('generalHeader');
            }
        }
        
        // Special check for scene_1215 (staff homepage) to determine which dashboard to load
        if (sceneKey === 'scene_1215' && viewKey === 'view_3024') {
            log(`findAppToLoad: Special check for scene_1215 - checking user account type`);
            
            // Store a reference to decide later after potential async operation
            window._pendingDashboardDecision = true;
            
            // Check if the user record contains field_441 with "RESOURCE"
            const user = (typeof Knack !== 'undefined' && Knack.getUserAttributes) ? Knack.getUserAttributes() : null;
            
            // Debug logging to see what's in the user object
            if (user) {
                log(`findAppToLoad: User object found. Keys: ${Object.keys(user).join(', ')}`);
                if (user.values) {
                    log(`findAppToLoad: User.values keys: ${Object.keys(user.values).join(', ')}`);
                }
                // Also check top-level field
                if (user.field_441) {
                    log(`findAppToLoad: Found field_441 at top level: ${user.field_441}`);
                }
                // Check for role field
                if (user.values && user.values.field_73) {
                    log(`findAppToLoad: Found field_73 (role): ${user.values.field_73}`);
                }
            }
            
            // Check multiple possible locations for the field
            let accountType = null;
            if (user && user.values && user.values.field_441) {
                accountType = user.values.field_441;
                log(`findAppToLoad: Found field_441 in user.values: ${accountType}`);
                
            } else if (user && user.field_441) {
                accountType = user.field_441;
                log(`findAppToLoad: Found field_441 at user top level: ${accountType}`);
            }
            
            // Check if user is a Staff Admin (profile_5)
            let isStaffAdmin = false;
            if (user && user.values && user.values.field_73) {
                const roles = Array.isArray(user.values.field_73) ? user.values.field_73 : [user.values.field_73];
                for (const role of roles) {
                    if (role === 'profile_5' || role.toString() === 'profile_5') {
                        isStaffAdmin = true;
                        log(`findAppToLoad: User is Staff Admin`);
                        break;
                    }
                }
            }
            
            // Make the decision based on accountType and role
            if (accountType) {
                if (accountType.toString().toUpperCase().includes('RESOURCE')) {
                    log(`findAppToLoad: User has RESOURCE account type`);
                    // Staff Admin with Resources gets the same Resources dashboard as regular staff
                    appsFound.push('staffHomepageResource');
                } else {
                    log(`findAppToLoad: User account type '${accountType}' does not contain RESOURCE`);
                    // Staff Admin with Coaching gets the same Coaching dashboard as regular staff
                    appsFound.push('staffHomepageCoaching');
                }
            } else {
                log(`findAppToLoad: Could not find field_441 in user attributes, defaulting to staffHomepageCoaching`);
                log(`findAppToLoad: Full user object for debugging:`, user);
                appsFound.push('staffHomepageCoaching');
            }
        }
                
        // Standard scene/view matching for all other apps (should always run to find page-specific apps)
        if (sceneKey && viewKey && typeof sceneKey === 'string' && typeof viewKey === 'string') {
            log(`findAppToLoad: Standard Search: Searching for app matching Scene Key: ${sceneKey}, View Key: ${viewKey}`);
            for (const key in APPS) {
                // Avoid re-processing apps already handled by DOM checks (or intended for DOM checks)
                if ((sceneKey === APPS.myAcademicProfile?.scenes[0] && key === 'myAcademicProfile') ||
                    (sceneKey === APPS.studentCoachLauncher?.scenes[0] && key === 'studentCoachLauncher') || 
                    (sceneKey === 'scene_1095' && (key === 'reportProfiles' || key === 'aiCoachLauncher')) ||
                    (sceneKey === 'scene_1224' && key === 'coachSummary') ||
                    (key === 'generalHeader') || // Skip generalHeader as it uses special 'all' flag
                    (sceneKey === 'scene_1215' && (key === 'staffHomepageCoaching' || key === 'staffHomepageResource'))) {
                    continue; 
                }
                const app = APPS[key];
                const sceneMatch = app.scenes.includes(sceneKey);
                const viewMatch = app.views.includes(viewKey) || app.views.includes('any');
                if (sceneMatch && viewMatch) {
                    log(`findAppToLoad: Standard Match found for app '${key}'.`);
                    if (!appsFound.includes(key)) {
                        appsFound.push(key);
                    }
                }
            }
        }

        if (appsFound.length > 0) {
            // Remove duplicates just in case (though current logic should prevent it)
            const uniqueAppsFound = [...new Set(appsFound)];
            log(`findAppToLoad: Apps identified for loading: ${uniqueAppsFound.join(', ')}`);
            return uniqueAppsFound;
        }
        
        log(`findAppToLoad: No app configuration found for Scene '${sceneKey}', View '${viewKey}'.`);
        return null;
    }

    // Central function to check conditions and load the app
    async function tryLoadApp() {
        let effectiveSceneKey = (typeof Knack !== 'undefined' && Knack.scene && Knack.scene.key) ? Knack.scene.key : lastRenderedSceneKey;
        
        log(`tryLoadApp: Checking load conditions. Effective Scene: ${effectiveSceneKey}, Last Rendered View: ${lastRenderedViewKey}`);
        
        let appKeysToLoad = findAppToLoad(effectiveSceneKey, lastRenderedViewKey);

        if (!appKeysToLoad || appKeysToLoad.length === 0) {
            log("tryLoadApp: No app matches current scene/view with effectiveSceneKey.");
             if (effectiveSceneKey !== lastRenderedSceneKey && lastRenderedSceneKey) {
                log(`tryLoadApp: Retrying findAppToLoad with lastRenderedSceneKey: ${lastRenderedSceneKey}`);
                const fallbackAppKeys = findAppToLoad(lastRenderedSceneKey, lastRenderedViewKey);
                if (fallbackAppKeys && fallbackAppKeys.length > 0) {
                    log(`tryLoadApp: Found apps with fallback scene key: ${fallbackAppKeys.join(', ')}`);
                    appKeysToLoad = fallbackAppKeys;
                } else {
                    log("tryLoadApp: No app matches with fallback scene key either.");
                    return;
                }
            } else if (!lastRenderedSceneKey && !effectiveSceneKey) {
                 log("tryLoadApp: No scene key available to attempt loading.");
                return;
            } else {
                return; 
            }
        }
        
        const finalAppKeysToLoad = Array.isArray(appKeysToLoad) ? appKeysToLoad : (appKeysToLoad ? [appKeysToLoad] : []);

        for (const appKey of finalAppKeysToLoad) { 
            // Skip if this app is already loaded
            if (loadedAppKey === appKey) {
                log(`tryLoadApp: App '${appKey}' is already loaded, skipping`);
                continue;
            }
            
            // Special check for generalHeader - it should only load once per session
            if (appKey === 'generalHeader' && window._generalHeaderLoaded) {
                // But check if the header actually exists in the DOM
                if (document.getElementById('vespaGeneralHeader')) {
                    log(`tryLoadApp: GeneralHeader already loaded and exists in DOM, skipping`);
                    continue;
                } else {
                    log(`tryLoadApp: GeneralHeader flag set but header not in DOM, clearing flag and reloading`);
                    window._generalHeaderLoaded = false;
                }
            }
            
            const appConfigDef = APPS[appKey]; 
            if (!appConfigDef || !appConfigDef.scriptUrl || !appConfigDef.configBuilder || !appConfigDef.configGlobalVar) {
                errorLog(`tryLoadApp: Configuration error for app (missing required properties): ${appKey}`, appConfigDef);
                continue; 
            }
            try {
                let currentViewForConfig = lastRenderedViewKey; 
                if (appConfigDef.views.includes(lastRenderedViewKey)) {
                    currentViewForConfig = lastRenderedViewKey;
                } else if (appConfigDef.views.length > 0) {
                    currentViewForConfig = appConfigDef.views[0];
                } else {
                    log(`tryLoadApp: No suitable view found for ${appKey} in its configuration. Using empty string.`);
                    currentViewForConfig = ''; 
                }

                let sceneKeyForConfig = (typeof Knack !== 'undefined' && Knack.scene && appConfigDef.scenes.includes(Knack.scene.key)) 
                                        ? Knack.scene.key 
                                        : (appConfigDef.scenes.includes(effectiveSceneKey) 
                                            ? effectiveSceneKey 
                                            : (lastRenderedSceneKey && appConfigDef.scenes.includes(lastRenderedSceneKey) 
                                                ? lastRenderedSceneKey 
                                                : appConfigDef.scenes[0]));
                
                if (!sceneKeyForConfig) {
                     errorLog(`tryLoadApp: Critical - Cannot determine sceneKeyForConfig for app ${appKey}. App configured scenes: ${appConfigDef.scenes.join('/')}. Runtime effective: ${effectiveSceneKey}, lastRendered: ${lastRenderedSceneKey}. Skipping load.`);
                    continue;
                }
                log(`tryLoadApp: Using sceneKey '${sceneKeyForConfig}' and viewKey '${currentViewForConfig}' for ${appKey} config.`);
                const instanceConfig = appConfigDef.configBuilder(sharedConfig, sceneKeyForConfig, currentViewForConfig); 
                log(`tryLoadApp: Built instance config for ${appKey}`, instanceConfig);

                // --- >> NEW SECTION FOR DEPENDENCY LOADING FOR 'dashboard' APP << ---
                if (appKey === 'dashboard') {
                    const dashboardStylesUrl = 'https://cdn.jsdelivr.net/gh/4Sighteducation/vespa-dashboard@main/src/dashboard3q.css';
                    const dashboardJSDependencies = [
                        'https://cdn.jsdelivr.net/npm/chart.js', // Chart.js core
                        'https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.0.0', // Datalabels plugin
                        'https://cdnjs.cloudflare.com/ajax/libs/chartjs-plugin-annotation/1.4.0/chartjs-plugin-annotation.min.js', // Annotation plugin
                        'https://cdn.jsdelivr.net/npm/wordcloud@1.2.2/src/wordcloud2.js' // WordCloud2.js for word cloud visualization
                    ];
                    try {
                        log(`tryLoadApp: Loading CSS for ${appKey} from ${dashboardStylesUrl}...`);
                        await loadCSS(dashboardStylesUrl); // Load CSS
                        log(`tryLoadApp: CSS for ${appKey} loaded successfully.`);

                        log(`tryLoadApp: Loading JS dependencies for ${appKey}...`);
                        await loadScriptsSequentially(dashboardJSDependencies);
                        log(`tryLoadApp: All JS dependencies for ${appKey} loaded successfully.`);
                    } catch (depError) {
                        errorLog(`tryLoadApp: Critical - Failed to load one or more dependencies for ${appKey}. Dashboard will likely not function correctly. Skipping app load.`, depError);
                        window[appConfigDef.configGlobalVar] = undefined; // Clear any partial config
                        continue; // Skip loading this app if dependencies failed
                    }
                }
                // --- >> END NEW SECTION << ---

                log(`tryLoadApp: Attempting to load script for ${appKey} from URL: ${appConfigDef.scriptUrl}`);
                try {
                    await loadScript(appConfigDef.scriptUrl);
                    log(`tryLoadApp: Script successfully loaded for app '${appKey}'.`);
                } catch (loadError) {
                    errorLog(`tryLoadApp: Failed to load script for ${appKey}:`, loadError);
                    continue;
                }

                window[appConfigDef.configGlobalVar] = instanceConfig;
                log(`tryLoadApp: Set global config variable '${appConfigDef.configGlobalVar}' for ${appKey}`);

                // Check if there's an initializer function to call
                if (appConfigDef.initializerFunctionName !== null) {
                    if (typeof window[appConfigDef.initializerFunctionName] === 'function') {
                        log(`tryLoadApp: Calling initializer function: ${appConfigDef.initializerFunctionName} for ${appKey}`); 
                        try {
                            window[appConfigDef.initializerFunctionName](); 
                        } catch (initError) {
                            errorLog(`tryLoadApp: Error calling initializer function ${appConfigDef.initializerFunctionName} for ${appKey}:`, initError);
                            window[appConfigDef.configGlobalVar] = undefined; 
                            continue; // Try next app
                        }
                        log(`tryLoadApp: Initializer function ${appConfigDef.initializerFunctionName} called successfully for ${appKey}.`);
                    } else {
                        errorLog(`tryLoadApp: Initializer function '${appConfigDef.initializerFunctionName}' not found after loading script for app '${appKey}'.`);
                        window[appConfigDef.configGlobalVar] = undefined; 
                        continue; // Try next app
                    }
                } else {
                    log(`tryLoadApp: No initializer function configured for ${appKey} (self-executing script).`);
                }

                // Update loadedAppKey only on successful initialization
                if (!['reportProfiles', 'aiCoachLauncher'].includes(appKey)) {
                    loadedAppKey = appKey;
                }
                
                // Set global flag for generalHeader
                if (appKey === 'generalHeader') {
                    window._generalHeaderLoaded = true;
                    log(`tryLoadApp: Set global flag _generalHeaderLoaded = true`);
                }
                
                // Clear the pending decision flag for dashboard apps
                if (appKey === 'staffHomepageResource' || appKey === 'staffHomepageCoaching') {
                    window._pendingDashboardDecision = false;
                }

            } catch (error) {
                errorLog(`tryLoadApp: Failed during load/init process for app ${appKey}:`, error);
                if (appConfigDef && appConfigDef.configGlobalVar) {
                    window[appConfigDef.configGlobalVar] = undefined;
                }
            }
        }
    }

    // --- Main Execution (jQuery Document Ready) ---
    $(function () {
        // ... (DOM ready and event listener attachment remains the same) ...
        log("DOM ready. Attaching Knack event listeners.");

        if (typeof $ === 'undefined' || typeof $.ajax === 'undefined') {
            errorLog("Critical Error: jQuery ($) is not available at DOM ready.");
            return;
        }
        log("jQuery confirmed available.");
        
        // ENSURE jQuery IS GLOBALLY AVAILABLE FOR ALL APPS
        if (typeof jQuery === 'undefined' && typeof $ !== 'undefined') {
            window.jQuery = $;
            log("Assigned $ to window.jQuery for compatibility with libraries expecting jQuery global.");
        }

        // Listener 1: Store scene key and then check if conditions are met
        $(document).on('knack-scene-render.any', function (event, scene) {
            if (scene && scene.key) {
                // If the scene is changing, reset loadedAppKey to allow reinitialization if needed
                // This is important if navigating back and forth between scenes that use different apps
                // or the same app that needs a fresh start.
                // EXCEPT for generalHeader which should persist across scenes
                if (lastRenderedSceneKey && lastRenderedSceneKey !== scene.key) {
                    log(`Scene changed from ${lastRenderedSceneKey} to ${scene.key}.`);
                    if (loadedAppKey === 'generalHeader') {
                        log(`Keeping generalHeader loaded across scene change.`);
                    } else {
                        log(`Resetting loadedAppKey.`);
                        loadedAppKey = null; // Reset to allow the new scene's app (or same app) to load/re-initialize
                    }
                }

                log(`Scene rendered: Storing scene key '${scene.key}'`);
                lastRenderedSceneKey = scene.key;
                // Check if this completes the required pair OR if a special DOM condition is met
                tryLoadApp();
            } else {
                log("Scene render event fired, but no scene key found.");
            }
        });

        // Listener 2: Store view key and then check if conditions are met
        $(document).on('knack-view-render.any', function (event, view) {
            if (view && view.key) {
                // Do not reset loadedAppKey on mere view render, as a scene can have multiple views
                // and we might be loading an app that spans multiple views or depends on a specific scene-view combo.
                // The scene change logic above is better suited for resetting loadedAppKey.
                log(`View rendered: Storing view key '${view.key}'`);
                lastRenderedViewKey = view.key;
                // Check if this completes the required pair OR if a special DOM condition is met
                tryLoadApp();
            } else {
                log("View render event fired, but no view key found.");
            }
        });

        log("Knack render event listeners attached.");
        log("Loader setup complete. Waiting for render events.");

    });

    log("Knack Builder Loader setup registered. Waiting for DOM ready.");

})(); // end IIFE


    })();
