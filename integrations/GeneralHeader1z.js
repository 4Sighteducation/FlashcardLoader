/**
 * VESPA Universal Header System - Phase 1
 * Loads on all pages and provides context-aware navigation
 */

(function() {
    'use strict';
    
    console.log('[General Header] Script loaded, waiting for initialization...');
    
    function initializeGeneralHeader() {
        const config = window.GENERAL_HEADER_CONFIG;
        
        if (!config) {
            console.error('[General Header] Configuration not found');
            return;
        }
        
        console.log('[General Header] Initializing with config:', config);
        
        // Configuration
        const DEBUG = true; // TEMPORARILY ENABLED for debugging resource button issue
        const currentScene = config.sceneKey;
        const currentView = config.viewKey;
        const userRoles = config.userRoles || [];
        const userAttributes = config.userAttributes || {};
        
        // Helper function for debug logging
        function log(message, data) {
            if (DEBUG) {
                console.log(`[General Header] ${message}`, data || '');
            }
        }
        
        // Detect user type
        function getUserType() {
            log('User attributes:', userAttributes);
            
            // Check if user is logged in at all
            if (!userAttributes || (!userAttributes.email && !userAttributes.id)) {
                log('No user attributes found - user might not be logged in');
                return null; // Don't show header if not logged in
            }
            
            // Get the user role from field_73
            let userRole = userAttributes.values?.field_73 || userAttributes.field_73;
            log('User role from field_73:', userRole);
            
            // If no role found, user might not be logged in properly
            if (!userRole) {
                log('No role found in field_73');
                return null;
            }
            
            // Handle different field formats
            let roleText = '';
            
            // If it's an array (like ['profile_6']), get the first element
            if (Array.isArray(userRole) && userRole.length > 0) {
                userRole = userRole[0];
            }
            
            // Check if we have raw field data
            const rawRole = userAttributes.values?.field_73_raw || userAttributes.field_73_raw;
            if (rawRole && rawRole.length > 0) {
                // Try to get the identifier from raw data
                const roleIdentifier = rawRole[0]?.identifier || rawRole[0];
                log('Role identifier from raw:', roleIdentifier);
                roleText = roleIdentifier;
            } else {
                roleText = userRole.toString();
            }
            
            // Profile mapping - map profile IDs to user types
            const profileMapping = {
                'profile_6': 'student',      // Student profile
                'profile_7': 'staff',        // Tutor profile
                'profile_5': 'staffAdmin',   // Staff Admin profile
                'profile_4': 'student',      // Alternative student profile
                'profile_8': 'staff',        // Super User profile
                // Add more mappings as needed
            };
            
            // Check ALL roles if it's an array (staff might have multiple roles including student)
            let hasStaffRole = false;
            let hasStudentRole = false;
            let hasStaffAdminRole = false;
            
            // If field_73 contains multiple roles
            if (Array.isArray(userAttributes.values?.field_73)) {
                const allRoles = userAttributes.values.field_73;
                log('Checking all roles:', allRoles);
                
                for (const role of allRoles) {
                    const roleStr = role.toString();
                    if (profileMapping[roleStr] === 'staff') {
                        hasStaffRole = true;
                    } else if (profileMapping[roleStr] === 'student') {
                        hasStudentRole = true;
                    } else if (profileMapping[roleStr] === 'staffAdmin') {
                        hasStaffAdminRole = true;
                    }
                }
            } else {
                // Single role
                const mappedRole = profileMapping[roleText];
                if (mappedRole === 'staff') hasStaffRole = true;
                if (mappedRole === 'student') hasStudentRole = true;
                if (mappedRole === 'staffAdmin') hasStaffAdminRole = true;
            }
            
            // Get account type from field_441
            const accountType = userAttributes.values?.field_441 || userAttributes.field_441;
            log('Account type field_441:', accountType);
            
            // Check if account type contains "RESOURCE" (case-insensitive)
            const isResourceOnly = accountType && accountType.toString().toUpperCase().includes('RESOURCE');
            
            // PRIORITY: Staff Admin takes precedence, then regular staff, then student
            if (hasStaffAdminRole) {
                log('User has staff admin role');
                if (isResourceOnly) {
                    log('Detected as staffAdminResource');
                    return 'staffAdminResource';
                }
                log('Detected as staffAdminCoaching');
                return 'staffAdminCoaching';
            } else if (hasStaffRole) {
                log('User has staff role');
                if (isResourceOnly) {
                    log('Detected as staffResource');
                    return 'staffResource';
                }
                log('Detected as staffCoaching');
                return 'staffCoaching';
            } else if (hasStudentRole) {
                log('User has ONLY student role');
                return 'student';
            }
            
            // Fallback to text comparison if we have actual role text
            if (roleText.toLowerCase() === 'student') {
                log('Detected as student');
                return 'student';
            } else if (roleText.toLowerCase().includes('admin')) {
                log('Detected as staff admin via text');
                if (isResourceOnly) {
                    return 'staffAdminResource';
                }
                return 'staffAdminCoaching';
            } else if (roleText.toLowerCase().includes('staff') || roleText.toLowerCase().includes('tutor') || 
                      roleText.toLowerCase().includes('super')) {
                log(`Detected as staff with role: ${roleText}`);
                if (isResourceOnly) {
                    return 'staffResource';
                }
                return 'staffCoaching';
            }
            
            // Default based on which landing page they can access
            log('Could not determine role from field_73, checking current page');
            const currentUrl = window.location.href;
            if (currentUrl.includes('landing-page') && !currentUrl.includes('staff-landing-page')) {
                log('On student landing page, assuming student');
                return 'student';
            }
            
            log('Defaulting to staff');
            return 'staffCoaching';
        }
        
        // Navigation configurations for different user types
        // All configurations now have Settings and Log Out buttons at the end
        const navigationConfig = {
            student: {
                brand: 'VESPA Student',
                brandIcon: 'fa-graduation-cap',
                color: '#079baa', // Using main teal color
                accentColor: '#06206e', // Dark blue for accents
                items: [
                    { label: 'VESPA Questionnaire', icon: 'fa-question-circle', href: '#add-q', scene: 'scene_358' },
                    { label: 'Coaching Report', icon: 'fa-comments', href: '#vespa-results', scene: 'scene_43' },
                    { label: 'My Activities', icon: 'fa-book', href: '#my-vespa', scene: 'scene_437' },
                    { label: 'Study Planner', icon: 'fa-calendar', href: '#studyplanner', scene: 'scene_1208' },
                    { label: 'Flashcards', icon: 'fa-clone', href: '#flashcards', scene: 'scene_1206' },
                    { label: 'Taskboard', icon: 'fa-clipboard-list-chart', href: '#task-board', scene: 'scene_1188' },
                    { label: 'Settings', icon: 'fa-cog', href: '#account-settings', scene: 'scene_settings', isSettings: true },
                    { label: 'Log Out', icon: 'fa-sign-out', href: '#', scene: 'logout', isLogout: true }
                ]
            },
            staffResource: {
                brand: 'VESPA Resources',
                brandIcon: 'fa-book',
                color: '#72cb44', // Green (VESPA color)
                accentColor: '#06206e',
                items: [
                    { label: 'Resources', icon: 'fa-folder-open', href: '#tutor-activities/resources-levels', scene: 'scene_481' },
                    { label: 'Worksheets', icon: 'fa-files-o', href: '#worksheets', scene: 'scene_1169' },
                    { label: 'Curriculum', icon: 'fa-calendar', href: '#suggested-curriculum2', scene: 'scene_1234' },
                    { label: 'Newsletter', icon: 'fa-newspaper-o', href: '#vespa-newsletter', scene: 'scene_1214' },
                    { label: 'Videos', icon: 'fa-book-open', href: '#study-guides', scene: 'scene_1241' },
                    { label: 'FAQ', icon: 'fa-graduation-cap', href: '#staff-training', scene: 'scene_1242' },
                    { label: 'Settings', icon: 'fa-cog', href: '#account-settings', scene: 'scene_settings', isSettings: true },
                    { label: 'Log Out', icon: 'fa-sign-out', href: '#', scene: 'logout', isLogout: true }
                ]
            },
            staffCoaching: {
                brand: 'VESPA Coaching',
                brandIcon: 'fa-users',
                color: '#ff8f00', // Orange (VESPA color)
                accentColor: '#06206e',
                items: [
                    { label: 'Coaching', icon: 'fa-comments', href: '#mygroup-vespa-results2/', scene: 'scene_1095' },
                    { label: 'Results', icon: 'fa-bar-chart', href: '#mygroup-student-results', scene: 'scene_1094' },
                    { label: 'Resources', icon: 'fa-folder-open', href: '#tutor-activities/resources-levels', scene: 'scene_481' },
                    { label: 'Worksheets', icon: 'fa-files-o', href: '#worksheets', scene: 'scene_1169' },
                    { label: 'Study Plans', icon: 'fa-graduation-cap', href: '#student-revision', scene: 'scene_855' },
                    { label: 'Reports', icon: 'fa-file-text', href: '#coaching-reports', scene: 'scene_1243' },
                    { label: 'Settings', icon: 'fa-cog', href: '#account-settings', scene: 'scene_settings', isSettings: true },
                    { label: 'Log Out', icon: 'fa-sign-out', href: '#', scene: 'logout', isLogout: true }
                ]
            },
            staffAdminResource: {
                brand: 'VESPA Admin',
                brandIcon: 'fa-shield',
                color: '#7f31a4', // Purple (VESPA color)
                accentColor: '#06206e',
                items: [
                    { label: 'Manage', icon: 'fa-cog', href: '#accounts', scene: 'scene_68' },
                    { label: 'Resources', icon: 'fa-folder-open', href: '#tutor-activities/resources-levels', scene: 'scene_481' },
                    { label: 'Worksheets', icon: 'fa-files-o', href: '#worksheets', scene: 'scene_1169' },
                    { label: 'Curriculum', icon: 'fa-calendar', href: '#suggested-curriculum2', scene: 'scene_1234' },
                    { label: 'Newsletter', icon: 'fa-newspaper-o', href: '#vespa-newsletter', scene: 'scene_1214' },
                    { label: 'Analytics', icon: 'fa-line-chart', href: '#resource-analytics', scene: 'scene_1244' },
                    { label: 'Settings', icon: 'fa-cog', href: '#account-settings', scene: 'scene_settings', isSettings: true },
                    { label: 'Log Out', icon: 'fa-sign-out', href: '#', scene: 'logout', isLogout: true }
                ]
            },
            staffAdminCoaching: {
                brand: 'VESPA Admin',
                brandIcon: 'fa-shield',
                color: '#7f31a4', // Purple (VESPA color)
                accentColor: '#06206e',
                items: [
                    { label: 'Dashboard', icon: 'fa-tachometer-alt', href: '#dashboard', scene: 'scene_1225' },
                    { label: 'Results', icon: 'fa-bar-chart', href: '#mygroup-student-results', scene: 'scene_1094' },
                    { label: 'Coaching', icon: 'fa-comments', href: '#mygroup-vespa-results2/', scene: 'scene_1095' },
                    { label: 'Manage', icon: 'fa-cog', href: '#upload-manager', scene: 'scene_1212' },
                    { label: 'Curriculum', icon: 'fa-calendar', href: '#suggested-curriculum2', scene: 'scene_1234' },
                    { label: 'Reports', icon: 'fa-file-text', href: '#admin-reports', scene: 'scene_1245' },
                    { label: 'Settings', icon: 'fa-cog', href: '#account-settings', scene: 'scene_settings', isSettings: true },
                    { label: 'Log Out', icon: 'fa-sign-out', href: '#', scene: 'logout', isLogout: true }
                ]
            }
        };
        
        // Create the header HTML
        function createHeaderHTML(userType, currentScene) {
            const navConfig = navigationConfig[userType];
            
            // Debug log for resource type detection
            log(`Creating header for userType: ${userType}, isResource: ${userType.includes('Resource')}`);
            
            // Determine home page based on user type
            const homeHref = userType === 'student' ? '#landing-page/' : '#staff-landing-page/';
            const homeScene = userType === 'student' ? 'scene_1210' : 'scene_1215';
            const isHomePage = currentScene === homeScene;
            
            // Build navigation items
            const navItemsHTML = navConfig.items.map(item => {
                const isActive = currentScene === item.scene && !item.isLogout && !item.isSettings;
                let buttonClass = 'header-nav-button';
                
                // Add special classes for settings and logout buttons
                if (item.isSettings) buttonClass += ' header-settings-button';
                if (item.isLogout) buttonClass += ' header-logout-button';
                if (isActive) buttonClass += ' active';
                
                // Add data attributes for special buttons
                const dataAttrs = item.isLogout ? 'data-logout="true"' : '';
                
                return `
                    <a href="${item.href}" 
                       class="${buttonClass}" 
                       data-scene="${item.scene}"
                       ${dataAttrs}>
                        <i class="fa ${item.icon}"></i>
                        <span>${item.label}</span>
                    </a>
                `;
            }).join('');
            
            return `
                <div id="vespaGeneralHeader" class="vespa-general-header ${userType}">
                    <div class="header-content">
                        <div class="header-top-row">
                            <div class="header-brand">
                                <a href="https://www.vespa.academy" target="_blank" class="logo-link">
                                    <img src="https://vespa.academy/_astro/vespalogo.BGrK1ARl.png" alt="VESPA Academy" class="vespa-logo">
                                </a>
                                <span>${navConfig.brand}</span>
                            </div>
                            <nav class="header-navigation">
                                ${navItemsHTML}
                            </nav>
                            <button class="mobile-menu-toggle" aria-label="Toggle menu">
                                <i class="fa fa-bars"></i>
                            </button>
                        </div>
                    </div>
                    ${!isHomePage ? `
                    <div class="header-breadcrumb">
                        <a href="${homeHref}" class="breadcrumb-back">
                            <i class="fa fa-arrow-left"></i>
                            Back to Home
                        </a>
                    </div>
                    ` : ''}
                </div>
                <div class="mobile-nav-overlay"></div>
                <style>
                    /* Hide entire Knack header */
                    .knHeader {
                        display: none !important;
                    }
                    
                    /* Hide original user info container */
                    body.has-general-header .kn-info,
                    body.has-general-header .kn-current_user {
                        display: none !important;
                        visibility: hidden !important;
                    }
                    
                    /* Base Header Styles */
                    .vespa-general-header {
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        background-color: ${navConfig.color};
                        color: white;
                        z-index: 9999;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                        transition: all 0.3s ease;
                    }
                    
                    .header-content {
                        max-width: 1400px;
                        margin: 0 auto;
                        padding: 0 20px;
                    }
                    
                    .header-top-row {
                        height: 65px;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                    }
                    
                    .header-brand {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        font-size: 20px;
                        font-weight: 600;
                        letter-spacing: -0.5px;
                    }
                    
                    .logo-link {
                        display: flex;
                        align-items: center;
                        text-decoration: none;
                        transition: opacity 0.2s ease;
                    }
                    
                    .logo-link:hover {
                        opacity: 0.85;
                    }
                    
                    .vespa-logo {
                        height: 45px;
                        width: auto;
                    }
                    
                    .header-navigation {
                        display: flex;
                        gap: 8px;
                        align-items: center;
                        flex: 1;
                        justify-content: center;
                        max-width: 1100px;
                        margin: 0 20px;
                    }
                    
                    .header-nav-button {
                        display: flex;
                        align-items: center;
                        gap: 6px;
                        padding: 8px 14px;
                        background: rgba(255,255,255,0.15);
                        color: white;
                        text-decoration: none;
                        border-radius: 6px;
                        transition: all 0.2s ease;
                        font-size: 13px;
                        font-weight: 500;
                        white-space: nowrap;
                        border: 1px solid rgba(255,255,255,0.1);
                        position: relative;
                        overflow: hidden;
                        text-transform: none;
                        letter-spacing: 0.2px;
                        min-width: 90px;
                        justify-content: center;
                    }
                    
                    .header-nav-button:hover {
                        background: rgba(255,255,255,0.25);
                        transform: translateY(-1px);
                        box-shadow: 0 3px 12px rgba(0,0,0,0.2);
                        border-color: rgba(255,255,255,0.25);
                    }
                    
                    .header-nav-button.active {
                        background: rgba(255,255,255,0.3);
                        box-shadow: 0 2px 10px rgba(0,0,0,0.15);
                        border-color: rgba(255,255,255,0.35);
                        color: white;
                        font-weight: 600;
                    }
                    
                    .header-nav-button i {
                        font-size: 16px;
                        opacity: 0.95;
                    }
                    
                    /* Special styling for settings and logout buttons */
                    .header-settings-button,
                    .header-logout-button {
                        background: rgba(0,0,0,0.15);
                        border-color: rgba(255,255,255,0.08);
                        min-width: auto;
                        padding: 8px 12px;
                    }
                    
                    .header-settings-button:hover,
                    .header-logout-button:hover {
                        background: rgba(0,0,0,0.25);
                        border-color: rgba(255,255,255,0.15);
                    }
                    
                    .header-logout-button {
                        margin-left: auto;
                    }
                    
                    /* Mobile menu toggle */
                    .mobile-menu-toggle {
                        display: none;
                        background: none;
                        border: none;
                        color: white;
                        font-size: 22px;
                        cursor: pointer;
                        padding: 8px;
                        border-radius: 6px;
                        transition: background-color 0.2s ease;
                    }
                    
                    .mobile-menu-toggle:hover {
                        background-color: rgba(255,255,255,0.1);
                    }
                    
                    /* Breadcrumb styles */
                    .header-breadcrumb {
                        background-color: rgba(0,0,0,0.08);
                        padding: 8px 0;
                    }
                    
                    .breadcrumb-back {
                        display: inline-flex;
                        align-items: center;
                        gap: 8px;
                        color: rgba(255,255,255,0.9);
                        text-decoration: none;
                        font-size: 13px;
                        padding: 4px 20px;
                        max-width: 1400px;
                        margin: 0 auto;
                        transition: all 0.2s ease;
                    }
                    
                    .breadcrumb-back:hover {
                        color: white;
                    }
                    
                    .breadcrumb-back i {
                        font-size: 12px;
                    }
                    
                    /* Adjust body for header */
                    body.has-general-header {
                        padding-top: 65px !important;
                    }
                    
                    body.has-general-header:has(.header-breadcrumb) {
                        padding-top: 105px !important;
                    }
                    
                    /* Hide Knack's default navigation but keep user info initially */
                    body.has-general-header .kn-menu.kn-view {
                        display: none !important;
                    }
                    
                    /* Ensure content is visible */
                    .kn-scene {
                        min-height: calc(100vh - 97px);
                    }
                    
                    /* Mobile Styles */
                    @media (max-width: 992px) {
                        .header-navigation {
                            gap: 4px;
                            margin: 0 10px;
                        }
                        
                        .header-nav-button {
                            padding: 5px 8px;
                            font-size: 11px;
                        }
                        
                        .header-nav-button i {
                            font-size: 12px;
                        }
                        
                        .header-brand {
                            font-size: 18px;
                        }
                        
                        .vespa-logo {
                            height: 40px;
                        }
                        

                    }
                    
                    @media (max-width: 768px) {
                        .header-top-row {
                            height: 56px;
                        }
                        
                        .header-brand span {
                            font-size: 16px;
                        }
                        
                        .vespa-logo {
                            height: 36px;
                        }
                        
                        .header-navigation {
                            position: fixed;
                            top: 56px;
                            right: -280px;
                            width: 280px;
                            height: calc(100vh - 56px);
                            background-color: ${navConfig.color};
                            flex-direction: column;
                            justify-content: flex-start;
                            padding: 16px;
                            gap: 8px;
                            transition: right 0.3s ease;
                            box-shadow: -2px 0 10px rgba(0,0,0,0.2);
                            margin: 0;
                            overflow-y: auto;
                        }
                        
                        .header-navigation.mobile-open {
                            right: 0;
                        }
                        
                        .header-nav-button {
                            width: 100%;
                            justify-content: flex-start;
                            padding: 12px 16px;
                            font-size: 15px;
                            background: rgba(255,255,255,0.08);
                            min-width: auto;
                        }
                        
                        .header-nav-button i {
                            font-size: 18px;
                            width: 24px;
                            text-align: center;
                        }
                        
                        .header-settings-button,
                        .header-logout-button {
                            margin-left: 0;
                            margin-top: auto;
                        }
                        
                        .mobile-menu-toggle {
                            display: block;
                        }
                        
                        .mobile-nav-overlay {
                            display: none;
                            position: fixed;
                            top: 56px;
                            left: 0;
                            right: 0;
                            bottom: 0;
                            background-color: rgba(0,0,0,0.4);
                            z-index: 9998;
                            backdrop-filter: blur(2px);
                        }
                        
                        .mobile-nav-overlay.active {
                            display: block;
                        }
                        
                        body.has-general-header {
                            padding-top: 56px !important;
                        }
                        
                        body.has-general-header:has(.header-breadcrumb) {
                            padding-top: 96px !important;
                        }
                        
                        .header-breadcrumb {
                            padding: 6px 0;
                        }
                        
                        .breadcrumb-back {
                            font-size: 12px;
                            padding: 4px 16px;
                        }
                    }
                    
                    @media (max-width: 480px) {
                        .header-brand span {
                            display: none;
                        }
                    }
                    
                    /* Specific background colors for different user types */
                    .vespa-general-header.student {
                        background-color: ${navigationConfig.student.color};
                    }
                    
                    .vespa-general-header.staffResource {
                        background-color: ${navigationConfig.staffResource.color};
                    }
                    
                    .vespa-general-header.staffCoaching {
                        background-color: ${navigationConfig.staffCoaching.color};
                    }
                    
                    .vespa-general-header.staffAdminResource,
                    .vespa-general-header.staffAdminCoaching {
                        background-color: ${navigationConfig.staffAdminResource.color};
                    }
                    
                    /* Smooth transitions */
                    * {
                        -webkit-font-smoothing: antialiased;
                        -moz-osx-font-smoothing: grayscale;
                    }
                    
                    /* Focus styles for accessibility */
                    .header-nav-button:focus,
                    #vespaGeneralHeader .mobile-menu-toggle:focus,
                    #vespaGeneralHeader .breadcrumb-back:focus {
                        outline: 2px solid rgba(255,255,255,0.5);
                        outline-offset: 2px;
                    }
                    
                    /* SIMPLIFIED STYLING APPROACH
                     * With uniform button count (7 buttons), all account types now use the same clean styling.
                     * No special cases or overrides needed - just consistent, maintainable CSS!
                     * Using unique class name .header-nav-button to prevent conflicts with other components.
                     */
                </style>
            `;
        }
        
        // Function to inject the header
        function injectHeader() {
            // Check if header already exists
            if (document.getElementById('vespaGeneralHeader')) {
                log('Header already exists, checking if it should be removed');
                const userType = getUserType();
                if (!userType) {
                    // User is not logged in, remove header
                    log('User not logged in, removing header');
                    const existingHeader = document.getElementById('vespaGeneralHeader');
                    if (existingHeader) existingHeader.remove();
                    // Reset body padding
                    document.body.classList.remove('has-general-header');
                    document.body.style.paddingTop = '';
                }
                return;
            }
            
            const userType = getUserType();
            log('Detected user type:', userType);
            
            // Don't show header if user is not logged in
            if (!userType) {
                log('User not logged in, not showing header');
                return;
            }
            
            // Create and inject the header
            const headerHTML = createHeaderHTML(userType, currentScene);
            document.body.insertAdjacentHTML('afterbegin', headerHTML);
            document.body.classList.add('has-general-header');
            
            log('Header injected successfully');
            
            // Setup event listeners
            setupEventListeners();
            
            // Track current page
            trackPageView(userType, currentScene);
            
            // DEBUG: Watch for style changes on nav buttons
            const navButtons = document.querySelectorAll('#vespaGeneralHeader .header-nav-button');
            navButtons.forEach((button, index) => {
                const observer = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                            log(`DEBUG: Style attribute changed on nav button ${index}:`, {
                                oldValue: mutation.oldValue,
                                newValue: button.getAttribute('style'),
                                userType: getUserType()
                            });
                        }
                    });
                });
                
                observer.observe(button, {
                    attributes: true,
                    attributeOldValue: true,
                    attributeFilter: ['style']
                });
            });
        }
        
        // Setup event listeners
        function setupEventListeners() {
            // Mobile menu toggle
            const mobileToggle = document.querySelector('.mobile-menu-toggle');
            const navigation = document.querySelector('.header-navigation');
            const overlay = document.querySelector('.mobile-nav-overlay');
            
            // DEBUG: Log nav button styles after setup
            setTimeout(() => {
                const navButtons = document.querySelectorAll('#vespaGeneralHeader .header-nav-button');
                if (navButtons.length > 0) {
                    const firstButton = navButtons[0];
                    const computedStyle = window.getComputedStyle(firstButton);
                    log('DEBUG: Nav button computed styles after setup:', {
                        padding: computedStyle.padding,
                        fontSize: computedStyle.fontSize,
                        width: firstButton.offsetWidth,
                        userType: getUserType()
                    });
                }
            }, 100);
            
            if (mobileToggle) {
                mobileToggle.addEventListener('click', function() {
                    navigation.classList.toggle('mobile-open');
                    overlay.classList.toggle('active');
                });
            }
            
            if (overlay) {
                overlay.addEventListener('click', function() {
                    navigation.classList.remove('mobile-open');
                    overlay.classList.remove('active');
                });
            }
            
            // Navigation click handling
            const navLinks = document.querySelectorAll('#vespaGeneralHeader .header-nav-button, #vespaGeneralHeader .breadcrumb-back');
            navLinks.forEach(link => {
                link.addEventListener('click', function(e) {
                    e.preventDefault();
                    
                    // Check if this is the logout button
                    if (this.getAttribute('data-logout') === 'true') {
                        // Trigger Knack logout
                        const logoutLink = document.querySelector('.kn-log-out');
                        if (logoutLink) {
                            logoutLink.click();
                        } else {
                            // Fallback: try to find and click any logout link
                            const altLogout = document.querySelector('a[href*="logout"]');
                            if (altLogout) altLogout.click();
                        }
                        return;
                    }
                    
                    const href = this.getAttribute('href');
                    if (href && href.startsWith('#')) {
                        // Close mobile menu if open
                        navigation.classList.remove('mobile-open');
                        overlay.classList.remove('active');
                        // Navigate using Knack
                        window.location.hash = href;
                    }
                });
            });
        }
        
        // Track page views for analytics
        function trackPageView(userType, scene) {
            log('Page view tracked:', { userType, scene });
            // You can add analytics tracking here if needed
        }
        
        // Initialize the header
        function init() {
            log('Starting General Header initialization...');
            
            // Check if we're on a login page
            const loginScenes = ['scene_1', 'scene_2', 'scene_3', 'scene_4', 'scene_5']; // Add your actual login scene IDs
            const loginPages = ['login', 'sign-in', 'register', 'forgot-password'];
            const currentUrl = window.location.href.toLowerCase();
            
            const isLoginPage = loginScenes.includes(currentScene) || 
                               loginPages.some(page => currentUrl.includes(page));
            
            if (isLoginPage) {
                log('On login page, not showing header');
                return;
            }
            
            // Inject header with slight delay to allow other apps to load
            setTimeout(() => {
                injectHeader();
            }, 250);
            
            // Re-inject on scene changes in case it gets removed
            $(document).on('knack-scene-render.any', function(event, scene) {
                log('Scene rendered, checking header...', scene.key);
                
                // Check if this is a login scene
                const isNowLoginPage = loginScenes.includes(scene.key) || 
                                      loginPages.some(page => window.location.href.toLowerCase().includes(page));
                
                if (isNowLoginPage) {
                    log('Navigated to login page, removing header');
                    const existingHeader = document.getElementById('vespaGeneralHeader');
                    if (existingHeader) existingHeader.remove();
                    document.body.classList.remove('has-general-header');
                    document.body.style.paddingTop = '';
                    // Clear the global loaded flag
                    window._generalHeaderLoaded = false;
                    return;
                }
                
                // Longer delay for scene changes to ensure other apps load first
                setTimeout(() => {
                    injectHeader(); // This will handle both injection and removal based on login state
                }, 300);
            });
            
            // Listen for logout events
            $(document).on('knack-user-logout.any', function() {
                log('User logged out, removing header and clearing flag');
                const existingHeader = document.getElementById('vespaGeneralHeader');
                if (existingHeader) existingHeader.remove();
                document.body.classList.remove('has-general-header');
                document.body.style.paddingTop = '';
                // Clear the global loaded flag
                window._generalHeaderLoaded = false;
            });
        }
        
        // Start initialization
        init();
    }
    
    // Export the initializer function
    window.initializeGeneralHeader = initializeGeneralHeader;
    
    console.log('[General Header] Script setup complete, initializer function ready');
})();
