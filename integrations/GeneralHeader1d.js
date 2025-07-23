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
        const DEBUG = config.debugMode || false;
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
            const userRole = userAttributes.values?.field_73 || userAttributes.field_73;
            log('User role from field_73:', userRole);
            
            // If no role found, user might not be logged in properly
            if (!userRole) {
                log('No role found in field_73');
                return null;
            }
            
            // Convert to string and check if it's "Student"
            const roleText = userRole.toString();
            
            if (roleText === 'Student') {
                log('Detected as student');
                return 'student';
            } else {
                // Any role that is NOT "Student" is staff
                log(`Detected as staff with role: ${roleText}`);
                
                // Check for Resources-only staff using field_441
                const accountType = userAttributes.values?.field_441 || userAttributes.field_441;
                log('Account type field_441:', accountType);
                
                if (accountType && accountType.toString().toUpperCase().includes('RESOURCE')) {
                    log('Detected as staffResource');
                    return 'staffResource';
                }
                log('Detected as staffCoaching');
                return 'staffCoaching';
            }
        }
        
        // Navigation configurations for different user types
        const navigationConfig = {
            student: {
                brand: 'VESPA Student',
                brandIcon: 'fa-graduation-cap',
                color: '#7f31a4',
                items: [
                    { label: 'Home', icon: 'fa-home', href: '#landing-page/', scene: 'scene_1210' },
                    { label: 'VESPA Questionnaire', icon: 'fa-question-circle', href: '#add-q', scene: 'scene_358' },
                    { label: 'MY Report', icon: 'fa-book', href: '#vespa-results', scene: 'scene_43' },
                    { label: 'My Activities', icon: 'fa-clone', href: '#my-vespa2', scene: 'scene_572' },
                    { label: 'Study Planner', icon: 'fa-calendar', href: '#studyplanner', scene: 'scene_1208' },
                    { label: 'Flashcards', icon: 'fa-clone', href: '#flashcards', scene: 'scene_1206' }
                ]
            },
            staffResource: {
                brand: 'VESPA Resources',
                brandIcon: 'fa-book',
                color: '#27ae60',
                items: [
                    { label: 'Home', icon: 'fa-home', href: '#staff-landing-page/', scene: 'scene_1215' },
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
                            <i class="fa ${navConfig.brandIcon}"></i>
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
                        gap: 10px;
                        font-size: 20px;
                        font-weight: 600;
                    }
                    
                    .header-brand i {
                        font-size: 24px;
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
                    
                    /* Adjust body for header */
                    body {
                        padding-top: 60px !important;
                    }
                    
                    body:has(.header-breadcrumb) {
                        padding-top: 100px !important;
                    }
                    
                    /* Hide Knack's default navigation if desired */
                    .kn-menu.kn-view {
                        display: none !important;
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
                    
                    /* Specific adjustments for different user types */
                    .vespa-general-header.student {
                        background-color: #3498db;
                    }
                    
                    .vespa-general-header.staffResource {
                        background-color: #27ae60;
                    }
                    
                    .vespa-general-header.staffCoaching {
                        background-color: #e74c3c;
                    }
                    
                    /* Smooth transitions */
                    * {
                        -webkit-font-smoothing: antialiased;
                        -moz-osx-font-smoothing: grayscale;
                    }
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
        }
        
        // Setup event listeners
        function setupEventListeners() {
            // Mobile menu toggle
            const mobileToggle = document.querySelector('.mobile-menu-toggle');
            const navigation = document.querySelector('.header-navigation');
            const overlay = document.querySelector('.mobile-nav-overlay');
            
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
            const navLinks = document.querySelectorAll('#vespaGeneralHeader .nav-button, #vespaGeneralHeader .breadcrumb-back');
            navLinks.forEach(link => {
                link.addEventListener('click', function(e) {
                    e.preventDefault();
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
            
            // Inject header immediately
            injectHeader();
            
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
                
                setTimeout(() => {
                    injectHeader(); // This will handle both injection and removal based on login state
                }, 100);
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
