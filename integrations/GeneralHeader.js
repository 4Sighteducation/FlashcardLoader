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
            // Check if user is a student
            if (userRoles.includes('object_4') || userRoles.includes('Student')) {
                return 'student';
            }
            
            // Check if user is staff
            if (userRoles.includes('object_3') || userRoles.includes('Staff') || 
                userRoles.includes('object_5') || userRoles.includes('Staff Admin')) {
                
                // Check for Resources-only staff using field_441
                const accountType = userAttributes.values?.field_441 || userAttributes.field_441;
                if (accountType && accountType.toString().toUpperCase().includes('RESOURCE')) {
                    return 'staffResource';
                }
                return 'staffCoaching';
            }
            
            // Default to student if unknown
            return 'student';
        }
        
        // Navigation configurations for different user types
        const navigationConfig = {
            student: {
                brand: 'VESPA Student',
                brandIcon: 'fa-graduation-cap',
                color: '#2c3e50',
                items: [
                    { label: 'Home', icon: 'fa-home', href: '#landing-page/', scene: 'scene_43' },
                    { label: 'My Profile', icon: 'fa-user', href: '#my-academic-profile', scene: 'scene_43' },
                    { label: 'Resources', icon: 'fa-book', href: '#student-resources', scene: 'scene_1206' },
                    { label: 'Study Planner', icon: 'fa-calendar', href: '#study-planner', scene: 'scene_1208' },
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
                log('Header already exists, updating if needed');
                return;
            }
            
            const userType = getUserType();
            log('Detected user type:', userType);
            
            // Create and inject the header
            const headerHTML = createHeaderHTML(userType, currentScene);
            document.body.insertAdjacentHTML('afterbegin', headerHTML);
            
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
            
            // Inject header immediately
            injectHeader();
            
            // Re-inject on scene changes in case it gets removed
            $(document).on('knack-scene-render.any', function(event, scene) {
                log('Scene rendered, checking header...', scene.key);
                setTimeout(() => {
                    if (!document.getElementById('vespaGeneralHeader')) {
                        log('Header missing after scene render, re-injecting');
                        injectHeader();
                    }
                }, 100);
            });
        }
        
        // Start initialization
        init();
    }
    
    // Export the initializer function
    window.initializeGeneralHeader = initializeGeneralHeader;
    
    console.log('[General Header] Script setup complete, initializer function ready');
})();
