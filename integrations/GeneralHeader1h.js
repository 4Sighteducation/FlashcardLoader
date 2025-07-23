// GeneralHeader.js - Universal header for all user types
// Version 1g - Added VESPA logo and complete Knack header hiding

(function() {
    'use strict';
    
    console.log('[General Header] Script loaded, waiting for initialization...');
    
    let isInitialized = false;
    let headerCheckInterval = null;
    
    function initializeGeneralHeader(config) {
        if (isInitialized) {
            console.log('[General Header] Already initialized, skipping');
            return;
        }
        
        isInitialized = true;
        console.log('[General Header] Initializing with config:', config);
        
        // Function to get user type
        function getUserType() {
            try {
                const user = Knack.getUserAttributes();
                if (!user || !user.values) {
                    if (config.debugMode) console.log('[General Header] No user logged in');
                    return null;
                }
                
                if (config.debugMode) {
                    console.log('[General Header] User attributes:', user);
                    console.log('[General Header] User role from field_73:', user.values.field_73);
                }
                
                // Get the role value(s) from field_73
                const roleField = user.values.field_73;
                let roles = [];
                
                // Handle array or single value
                if (Array.isArray(roleField)) {
                    roles = roleField;
                } else if (roleField) {
                    roles = [roleField];
                }
                
                if (config.debugMode) console.log('[General Header] Checking all roles:', roles);
                
                // Map profile IDs to role types
                const profileMapping = {
                    'profile_6': 'student',
                    'profile_7': 'staff',
                    'profile_8': 'staff',
                    'profile_17': 'staff',
                    'profile_15': 'staff',
                    'profile_1': 'admin',
                    'profile_4': 'admin',
                    'profile_2': 'admin'
                };
                
                // Check what types of roles the user has
                const roleTypes = roles.map(role => {
                    const roleStr = role.toString().toLowerCase();
                    return profileMapping[roleStr] || 'unknown';
                });
                
                const hasStudentRole = roleTypes.includes('student');
                const hasStaffRole = roleTypes.includes('staff') || roleTypes.includes('admin');
                
                // If user has ONLY student role, they're a student
                if (hasStudentRole && !hasStaffRole) {
                    if (config.debugMode) console.log('[General Header] User has ONLY student role');
                    return 'student';
                }
                
                // If user has any staff/admin role (even with student), they're staff
                if (hasStaffRole) {
                    if (config.debugMode) console.log('[General Header] User has staff/admin role');
                    
                    // Check field_441 for resource type
                    const accountType = user.values.field_441;
                    if (config.debugMode) console.log('[General Header] Field 441 (account type):', accountType);
                    
                    if (accountType && accountType.toString().toUpperCase().includes('RESOURCE')) {
                        return 'staffResources';
                    }
                    return 'staffCoaching';
                }
                
                // Default case
                if (config.debugMode) console.log('[General Header] Could not determine user type, defaulting to null');
                return null;
                
            } catch (error) {
                console.error('[General Header] Error determining user type:', error);
                return null;
            }
        }
        
        // Function to get current scene
        function getCurrentScene() {
            // Try multiple methods to get the current scene
            const hash = window.location.hash;
            
            // Method 1: Extract from URL hash
            const sceneMatch = hash.match(/scene_(\d+)/);
            if (sceneMatch) {
                return 'scene_' + sceneMatch[1];
            }
            
            // Method 2: Check if there's a scene in the Knack object
            if (window.Knack && Knack.scenes && Object.keys(Knack.scenes).length > 0) {
                const scenes = Object.keys(Knack.scenes);
                return scenes[0]; // Return the first (likely current) scene
            }
            
            // Method 3: Look for scene in the DOM
            const sceneElement = document.querySelector('[data-scene-key]');
            if (sceneElement) {
                return sceneElement.getAttribute('data-scene-key');
            }
            
            return null;
        }
        
        // Navigation configuration for different user types
        const navigationConfig = {
            student: {
                brand: 'VESPA Student',
                brandIcon: 'fa-graduation-cap',
                color: '#4A90E2',
                logoUrl: 'https://vespa.academy/_astro/vespalogo.BGrK1ARl.png',
                items: [
                    { label: 'Home', icon: 'fa-home', href: '#student-landing-page/', scene: 'scene_1210' },
                    { label: 'VESPA Questionnaire', icon: 'fa-question-circle', href: '#student-psychometric-questionnaire', scene: 'scene_1209' },
                    { label: 'MY Report', icon: 'fa-file-text-o', href: '#my-report-profile/', scene: 'scene_1181' },
                    { label: 'My Activities', icon: 'fa-tasks', href: '#tutor-activities/', scene: 'scene_499' },
                    { label: 'Study Planner', icon: 'fa-calendar', href: '#study-planner', scene: 'scene_1208' },
                    { label: 'Flashcards', icon: 'fa-clone', href: '#flashcards', scene: 'scene_1206' }
                ]
            },
            staffResources: {
                brand: 'VESPA Resources',
                brandIcon: 'fa-book',
                color: '#27AE60',
                logoUrl: 'https://vespa.academy/_astro/vespalogo.BGrK1ARl.png',
                items: [
                    { label: 'Home', icon: 'fa-home', href: '#staff-landing-page/', scene: 'scene_1215' },
                    { label: 'Students', icon: 'fa-users', href: '#students', scene: 'scene_488' },
                    { label: 'Resources', icon: 'fa-folder-open', href: '#tutor-activities/resources-levels', scene: 'scene_481' },
                    { label: 'Worksheets', icon: 'fa-files-o', href: '#worksheets', scene: 'scene_482' },
                    { label: 'Curriculum', icon: 'fa-calendar', href: '#tutor-activities/suggested-curriculum', scene: 'scene_499' },
                    { label: 'Newsletter', icon: 'fa-newspaper-o', href: '#vespa-newsletter', scene: 'scene_1177' }
                ]
            },
            staffCoaching: {
                brand: 'VESPA Coaching',
                brandIcon: 'fa-users',
                color: '#e74c3c',
                logoUrl: 'https://vespa.academy/_astro/vespalogo.BGrK1ARl.png',
                items: [
                    { label: 'Home', icon: 'fa-home', href: '#staff-landing-page/', scene: 'scene_1215' },
                    { label: 'Reports', icon: 'fa-bar-chart', href: '#vespa-report-profiles/', scene: 'scene_1095' },
                    { label: 'Students', icon: 'fa-users', href: '#students', scene: 'scene_488' },
                    { label: 'Resources', icon: 'fa-book', href: '#tutor-activities/resources-levels', scene: 'scene_481' },
                    { label: 'Analytics', icon: 'fa-line-chart', href: '#dashboard', scene: 'scene_1225' }
                ]
            }
        };
        
        // Create the header HTML
        function createHeaderHTML(userType, currentScene) {
            const navConfig = navigationConfig[userType];
            const isHomePage = currentScene === navConfig.items[0].scene;
            
            // Build navigation items
            const navItemsHTML = navConfig.items.map(item => {
                const isActive = currentScene === item.scene;
                return `
                    <a href="${item.href}" 
                       class="nav-button ${isActive ? 'active' : ''}" 
                       data-scene="${item.scene}">
                        <i class="fa ${item.icon}"></i>
                        <span>${item.label}</span>
                    </a>
                `;
            }).join('');
            
            return `
                <div id="vespaGeneralHeader" class="vespa-general-header ${userType}">
                    <div class="header-content">
                        <div class="header-brand">
                            <img src="${navConfig.logoUrl}" alt="VESPA Logo" class="header-logo">
                            <span>${navConfig.brand}</span>
                        </div>
                        <nav class="header-navigation">
                            ${navItemsHTML}
                        </nav>
                        <div class="header-actions">
                            <button class="mobile-menu-toggle" aria-label="Toggle menu">
                                <i class="fa fa-bars"></i>
                            </button>
                        </div>
                    </div>
                    ${!isHomePage ? `
                    <div class="header-breadcrumb">
                        <a href="${navConfig.items[0].href}" class="breadcrumb-back">
                            <i class="fa fa-arrow-left"></i>
                            Back to ${navConfig.items[0].label}
                        </a>
                    </div>
                    ` : ''}
                </div>
                <div class="mobile-nav-overlay"></div>
                <style>
                    /* Hide ALL Knack header elements */
                    .kn-info,
                    .kn-navigation-bar,
                    .kn-header,
                    #kn-app-header,
                    .kn-container header,
                    .kn-menu {
                        display: none !important;
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
                        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                        transition: all 0.3s ease;
                    }
                    
                    .header-content {
                        max-width: 1400px;
                        margin: 0 auto;
                        padding: 0 20px;
                        height: 60px;
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
                    }
                    
                    .header-logo {
                        height: 40px;
                        width: auto;
                        filter: brightness(0) invert(1);
                    }
                    
                    .header-navigation {
                        display: flex;
                        gap: 15px;
                        align-items: center;
                        flex: 1;
                        justify-content: center;
                    }
                    
                    .nav-button {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        padding: 8px 16px;
                        background-color: rgba(255,255,255,0.1);
                        color: white;
                        text-decoration: none;
                        border-radius: 6px;
                        transition: all 0.3s ease;
                        font-size: 14px;
                        font-weight: 500;
                        white-space: nowrap;
                    }
                    
                    .nav-button:hover {
                        background-color: rgba(255,255,255,0.2);
                        transform: translateY(-1px);
                    }
                    
                    .nav-button.active {
                        background-color: rgba(255,255,255,0.25);
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    }
                    
                    .nav-button i {
                        font-size: 16px;
                    }
                    
                    .header-actions {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    }
                    
                    .mobile-menu-toggle {
                        display: none;
                        background: none;
                        border: none;
                        color: white;
                        font-size: 24px;
                        cursor: pointer;
                        padding: 8px;
                    }
                    
                    .header-breadcrumb {
                        background-color: rgba(0,0,0,0.1);
                        padding: 8px 0;
                    }
                    
                    .breadcrumb-back {
                        display: inline-flex;
                        align-items: center;
                        gap: 8px;
                        color: white;
                        text-decoration: none;
                        font-size: 13px;
                        padding: 4px 20px;
                        max-width: 1400px;
                        margin: 0 auto;
                        opacity: 0.9;
                        transition: opacity 0.2s ease;
                    }
                    
                    .breadcrumb-back:hover {
                        opacity: 1;
                    }
                    
                    /* Adjust body and content for header */
                    body.has-general-header {
                        padding-top: 60px !important;
                        margin-top: 0 !important;
                    }
                    
                    body.has-general-header #knack-body,
                    body.has-general-header .kn-content {
                        margin-top: 0 !important;
                        padding-top: 20px !important;
                    }
                    
                    body.has-general-header:has(.header-breadcrumb) {
                        padding-top: 100px !important;
                    }
                    
                    /* Ensure content is visible */
                    .kn-scene {
                        min-height: calc(100vh - 100px);
                    }
                    
                    /* Mobile Styles */
                    @media (max-width: 768px) {
                        .header-brand span {
                            display: none;
                        }
                        
                        .header-navigation {
                            position: fixed;
                            top: 60px;
                            right: -300px;
                            width: 300px;
                            height: calc(100vh - 60px);
                            background-color: ${navConfig.color};
                            flex-direction: column;
                            justify-content: flex-start;
                            padding: 20px;
                            gap: 10px;
                            transition: right 0.3s ease;
                            box-shadow: -2px 0 8px rgba(0,0,0,0.15);
                        }
                        
                        .header-navigation.mobile-open {
                            right: 0;
                        }
                        
                        .nav-button {
                            width: 100%;
                            justify-content: flex-start;
                        }
                        
                        .mobile-menu-toggle {
                            display: block;
                        }
                        
                        .mobile-nav-overlay {
                            display: none;
                            position: fixed;
                            top: 60px;
                            left: 0;
                            right: 0;
                            bottom: 0;
                            background-color: rgba(0,0,0,0.5);
                            z-index: 9998;
                        }
                        
                        .mobile-nav-overlay.active {
                            display: block;
                        }
                    }
                </style>
            `;
        }
        
        // Function to inject header
        function injectHeader() {
            const userType = getUserType();
            if (!userType) {
                if (config.debugMode) console.log('[General Header] No valid user type, not showing header');
                removeHeader();
                return;
            }
            
            const currentScene = getCurrentScene();
            const existingHeader = document.getElementById('vespaGeneralHeader');
            
            if (existingHeader) {
                if (config.debugMode) console.log('[General Header] Header already exists');
                return;
            }
            
            const headerHTML = createHeaderHTML(userType, currentScene);
            document.body.insertAdjacentHTML('afterbegin', headerHTML);
            document.body.classList.add('has-general-header');
            
            // Add mobile menu functionality
            setupMobileMenu();
            
            // Track page view
            trackPageView(userType, currentScene);
            
            if (config.debugMode) console.log('[General Header] Header injected successfully');
        }
        
        // Function to setup mobile menu
        function setupMobileMenu() {
            const toggle = document.querySelector('.mobile-menu-toggle');
            const nav = document.querySelector('.header-navigation');
            const overlay = document.querySelector('.mobile-nav-overlay');
            
            if (toggle && nav && overlay) {
                toggle.addEventListener('click', function() {
                    nav.classList.toggle('mobile-open');
                    overlay.classList.toggle('active');
                });
                
                overlay.addEventListener('click', function() {
                    nav.classList.remove('mobile-open');
                    overlay.classList.remove('active');
                });
            }
        }
        
        // Function to remove header
        function removeHeader() {
            const header = document.getElementById('vespaGeneralHeader');
            const overlay = document.querySelector('.mobile-nav-overlay');
            
            if (header) header.remove();
            if (overlay) overlay.remove();
            
            document.body.classList.remove('has-general-header');
        }
        
        // Function to track page views
        function trackPageView(userType, scene) {
            if (config.debugMode) {
                console.log('[General Header] Page view tracked:', {
                    userType: userType,
                    scene: scene || 'unknown'
                });
            }
        }
        
        // Wait a moment for other apps to load first
        setTimeout(() => {
            if (config.debugMode) console.log('[General Header] Starting General Header initialization...');
            
            // Initial header injection
            injectHeader();
            
            // Listen for scene changes
            $(document).on('knack-scene-render.any', function(event, scene) {
                if (config.debugMode) console.log('[General Header] Scene rendered, checking header...', scene.key);
                
                // Check if header should be shown or removed
                const existingHeader = document.getElementById('vespaGeneralHeader');
                if (existingHeader) {
                    if (config.debugMode) console.log('[General Header] Header already exists, checking if it should be removed');
                    const userType = getUserType();
                    if (!userType) {
                        if (config.debugMode) console.log('[General Header] User logged out, removing header');
                        removeHeader();
                        return;
                    }
                    // Update active state
                    const currentScene = scene.key;
                    document.querySelectorAll('.nav-button').forEach(btn => {
                        if (btn.dataset.scene === currentScene) {
                            btn.classList.add('active');
                        } else {
                            btn.classList.remove('active');
                        }
                    });
                } else {
                    injectHeader();
                }
            });
            
            // Listen for login/logout
            $(document).on('knack-scene-render.scene_', function() {
                if (config.debugMode) console.log('[General Header] Login/logout scene detected');
                setTimeout(() => {
                    const userType = getUserType();
                    if (userType) {
                        injectHeader();
                    } else {
                        removeHeader();
                    }
                }, 1000);
            });
            
            // Listen for explicit logout
            $(document).on('knack-user-logout', function() {
                if (config.debugMode) console.log('[General Header] User logged out');
                removeHeader();
            });
            
        }, 500); // Small delay to let other apps initialize first
    }
    
    // Expose the initializer function globally
    window.initializeGeneralHeader = initializeGeneralHeader;
    console.log('[General Header] Script setup complete, initializer function ready');
})();
