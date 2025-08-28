// Universal Redirect Controller for VESPA Academy
// Handles automatic routing of users to their appropriate landing pages

console.log('[Universal Redirect] Script loaded!');

(function() {
    'use strict';
    
    // Flag to prevent multiple redirects
    let hasRedirected = false;
    
    const REDIRECT_CONFIG = {
        debugMode: true, // TEMPORARILY ENABLED for debugging
        scenes: {
            student: 'scene_1210',
            staffCoaching: 'scene_1215', 
            staffResource: 'scene_1252', // New scene for resource staff
            staffAdminCoaching: 'scene_1215', // Staff admin coaching uses same scene as staff coaching
            staffAdminResource: 'scene_1252', // Staff admin resource uses same scene as staff resource
            superUser: 'scene_1268' // New scene for super users
        },
        // Map scenes to their URL hashes
        urls: {
            scene_1210: '#landing-page/',
            scene_1215: '#staff-landing-page/',
            scene_1252: '#resources-home', // Correct URL for resources page
            scene_1268: '#oversight-page/' // New URL for super users
        }
    };
    
    function log(message, data) {
        if (REDIRECT_CONFIG.debugMode) {
            console.log(`[Universal Redirect] ${message}`, data || '');
        }
    }
    
    function getUserType() {
        console.log('[Universal Redirect] getUserType called');
        const user = (typeof Knack !== 'undefined' && Knack.getUserAttributes) ? Knack.getUserAttributes() : null;
        
        console.log('[Universal Redirect] Raw user object:', user);
        
        if (!user) {
            log('No user found - showing default home page');
            console.log('[Universal Redirect] No user found, returning null');
            return null;
        }
        
        log('User found:', { 
            email: user.email, 
            roles: user.roles,
            field_73: user.values?.field_73,
            field_441: user.values?.field_441
        });

        // Check if user has super user role (profile_8)
        let hasSuperUserRole = false;
        let hasStaffAdminRole = false;
        let hasStaffRole = false;
        let hasStudentRole = false;
        
        console.log('[Universal Redirect] DEBUG - Raw field_73 value:', user.values?.field_73);
        console.log('[Universal Redirect] DEBUG - User values object:', user.values);
        
        if (user.values && (user.values.field_73 || user.values.profile_keys)) {
            // Check both field_73 (object_XX format) and profile_keys (profile_XX format)
            const field73Roles = user.values.field_73 ? (Array.isArray(user.values.field_73) ? user.values.field_73 : [user.values.field_73]) : [];
            const profileKeys = user.values.profile_keys ? (Array.isArray(user.values.profile_keys) ? user.values.profile_keys : [user.values.profile_keys]) : [];
            
            console.log('[Universal Redirect] DEBUG - field_73 roles:', field73Roles);
            console.log('[Universal Redirect] DEBUG - profile_keys:', profileKeys);
            
            // Check for different role types using both formats
            hasSuperUserRole = profileKeys.includes('profile_21') || field73Roles.includes('object_21');
            hasStaffAdminRole = profileKeys.includes('profile_5') || field73Roles.includes('object_5');
            hasStaffRole = profileKeys.includes('profile_7') || field73Roles.includes('object_7');
            hasStudentRole = profileKeys.includes('profile_6') || profileKeys.includes('profile_4') || 
                            field73Roles.includes('object_6') || field73Roles.includes('object_4');
            
            console.log('[Universal Redirect] DEBUG - Role detection results:', {
                hasSuperUserRole,
                hasStaffAdminRole,
                hasStaffRole,
                hasStudentRole,
                field73Roles,
                profileKeys
            });
            
            log('Role analysis:', {
                hasSuperUserRole,
                hasStaffAdminRole,
                hasStaffRole,
                hasStudentRole,
                field73Roles,
                profileKeys
            });
        } else {
            console.log('[Universal Redirect] DEBUG - No field_73 found in user.values');
        }
        
        // If user has super user role, check for session storage selection
        if (hasSuperUserRole) {
            const selectedRole = sessionStorage.getItem('selectedUserRole');
            
            if (selectedRole) {
                log('Super user has selected role:', selectedRole);
                // Return the selected role instead of super user
                return selectedRole;
            } else {
                log('Super user detected but no role selected - redirecting to super user page');
                return 'superUser';
            }
        }
        
        // Check if user is a student
        // Check profile_keys first (most reliable)
        if (user.values && user.values.profile_keys) {
            const profileKeys = user.values.profile_keys;
            // Check if they ONLY have student profile
            if (profileKeys.length === 1 && profileKeys.includes('profile_6')) {
                log('Detected as Student via profile_keys - has ONLY student profile');
                return 'student';
            }
        }
        
        // Legacy check for old role system
        if (user.roles && (user.roles.includes('object_4') || user.roles.includes('profile_4'))) {
            log('Detected as Student via legacy roles');
            return 'student';
        }
        
        // Check for staff admin role
        if (hasStaffAdminRole) {
            const accountType = user.values?.field_441;
            
            if (accountType && accountType.toString().toUpperCase().includes('RESOURCE')) {
                log('Detected as Staff Admin (Resource)');
                return 'staffAdminResource';
            } else {
                log('Detected as Staff Admin (Coaching)');
                return 'staffAdminCoaching';
            }
        }
        
        // Check for regular staff role
        if (hasStaffRole) {
            const accountType = user.values?.field_441;
            
            if (accountType && accountType.toString().toUpperCase().includes('RESOURCE')) {
                log('Detected as Staff (Resource)');
                return 'staffResource';
            } else {
                log('Detected as Staff (Coaching)');
                return 'staffCoaching';
            }
        }
        
        // Check if they ONLY have student role
        if (hasStudentRole) {
            log('Detected as Student');
            return 'student';
        }
        
        log('User type could not be determined');
        return null;
    }
    
    function redirectUser(userType) {
        console.log('[Universal Redirect] redirectUser called with userType:', userType);
        
        // CRITICAL: Check if navigation is in progress or redirect is bypassed
        if (window._bypassUniversalRedirect || window._universalRedirectCompleted || window._navigationInProgress) {
            console.log('[Universal Redirect] Redirect bypassed due to navigation flags');
            return;
        }
        
        // Check if there's a navigation target in session
        const navigationTarget = sessionStorage.getItem('navigationTarget');
        if (navigationTarget) {
            console.log('[Universal Redirect] Navigation target exists:', navigationTarget, '- skipping redirect');
            return;
        }
        
        // Prevent multiple redirects
        if (hasRedirected) {
            console.log('[Universal Redirect] Already redirected, skipping');
            return;
        }
        
        if (!userType) {
            log('No redirect needed - staying on home page');
            console.log('[Universal Redirect] No user type detected');
            // Don't show welcome page - let Knack handle the display
            return;
        }
        
        const targetScene = REDIRECT_CONFIG.scenes[userType];
        const targetUrl = REDIRECT_CONFIG.urls[targetScene];
        
        if (targetUrl) {
            log(`Redirecting ${userType} to ${targetUrl}`);
            hasRedirected = true; // Set flag before redirecting
            
            // Add a small loading indicator
            const container = document.querySelector('.kn-scene-content') || document.querySelector('#kn-scene_1'); 
            if (container) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 50px;">
                        <h2 style="color: #0a2b8c;">Welcome to VESPA Academy</h2>
                        <p style="color: #666;">Redirecting you to your dashboard...</p>
                        <div style="margin: 20px auto; width: 50px; height: 50px; 
                                    border: 3px solid #f3f3f3; border-top: 3px solid #00e5db; 
                                    border-radius: 50%; animation: spin 1s linear infinite;">
                        </div>
                    </div>
                    <style>
                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                    </style>
                `;
            }
            
            // Perform redirect after a brief delay
            setTimeout(() => {
                window.location.hash = targetUrl;
            }, 500);
        } else {
            log('No redirect URL found for user type:', userType);
            showWelcomePage();
        }
    }
    
    function showWelcomePage() {
        // Don't show welcome page if there's already a login form on the page
        const hasLoginForm = document.querySelector('.kn-login') || 
                           document.querySelector('form[id*="login"]') ||
                           document.querySelector('.login-form') ||
                           document.querySelector('input[type="password"]');
        
        if (hasLoginForm) {
            console.log('[Universal Redirect] Login form detected, not showing welcome page');
            return;
        }
        
        // Only show welcome page if container is empty or has default content
        const container = document.querySelector('.kn-scene-content') || document.querySelector('#kn-scene_1');
        if (container && container.children.length < 2) {
            console.log('[Universal Redirect] Showing welcome page');
            container.innerHTML = `
                <div style="text-align: center; padding: 50px;">
                    <h1 style="color: #0a2b8c;">Welcome to VESPA Academy</h1>
                    <p style="color: #666; margin: 20px 0;">Please log in to access your dashboard</p>
                    <div style="margin-top: 30px;">
                        <a href="#login" class="kn-button" style="background-color: #00e5db; 
                           color: #0a2b8c; padding: 12px 30px; text-decoration: none; 
                           border-radius: 5px; display: inline-block;">
                            Log In
                        </a>
                    </div>
                </div>
            `;
        }
    }
    
    function initializeUniversalRedirect() {
        console.log('[Universal Redirect] initializeUniversalRedirect called!');
        
        // CRITICAL: Check if Universal Redirect is bypassed
        if (window._bypassUniversalRedirect || window._universalRedirectCompleted) {
            console.log('[Universal Redirect] Bypass flag set, skipping redirect');
            return;
        }
        
        // Check if navigation is in progress
        if (window._navigationInProgress) {
            console.log('[Universal Redirect] Navigation in progress, skipping redirect');
            return;
        }
        
        // Check session storage flags
        if (sessionStorage.getItem('universalRedirectCompleted') === 'true') {
            console.log('[Universal Redirect] Session flag indicates redirect completed, skipping');
            return;
        }
        
        // Don't run if we've already redirected
        if (hasRedirected) {
            console.log('[Universal Redirect] Already redirected, skipping initialization');
            return;
        }
        
        console.log('[Universal Redirect] DEBUG - Starting initialization');
        log('Initializing Universal Redirect');
        
        // Multiple ways to check if we're on scene_1
        const currentScene = (typeof Knack !== 'undefined' && Knack.scene && Knack.scene.key) ? Knack.scene.key : null;
        const urlHash = window.location.hash;
        const isHomeUrl = urlHash === '#home' || urlHash === '#home/';
        
        // Also check the DOM for scene_1 elements
        const hasScene1Element = document.getElementById('kn-scene_1') || 
                                document.querySelector('[data-scene-key="scene_1"]');
        
        console.log('[Universal Redirect] Detection info:', {
            currentScene: currentScene,
            urlHash: urlHash,
            isHomeUrl: isHomeUrl,
            hasScene1Element: !!hasScene1Element
        });
        
        // If we can't detect scene from Knack but we're on #home URL, proceed
        if (!currentScene && !isHomeUrl && !hasScene1Element) {
            log('Not on home scene, skipping redirect logic');
            console.log('[Universal Redirect] Not on scene_1, exiting');
            return;
        }
        
        // If we detect we're on home by any method, proceed
        if (currentScene === 'scene_1' || isHomeUrl || hasScene1Element) {
            log('On home scene/page, proceeding with redirect check');
        } else {
            log('Not on home scene, skipping redirect logic');
            return;
        }
        
        console.log('[Universal Redirect] On scene_1, will check user after delay');
        
        // Increased delay to ensure Knack user data is loaded
        setTimeout(() => {
            console.log('[Universal Redirect] DEBUG - Timeout fired, checking user type...');
            
            // First check if user is logged in at all
            const user = (typeof Knack !== 'undefined' && Knack.getUserAttributes) ? Knack.getUserAttributes() : null;
            console.log('[Universal Redirect] DEBUG - User object from Knack:', user);
            
            if (!user || !user.email) {
                console.log('[Universal Redirect] No user logged in, not redirecting');
                // Don't show welcome page or do anything - let Knack handle the login
                return;
            }
            
            console.log('[Universal Redirect] DEBUG - User is logged in, proceeding with type detection');
            
            // Check if we're already on the correct page to avoid unnecessary redirects
            const userType = getUserType();
            console.log('[Universal Redirect] DEBUG - Detected user type:', userType);
            
            const currentUrl = window.location.hash;
            console.log('[Universal Redirect] DEBUG - Current URL hash:', currentUrl);
            
            // Don't redirect if user is already on their correct page
            if ((userType === 'student' && currentUrl.includes('#landing-page')) ||
                (userType === 'staffCoaching' && currentUrl.includes('#staff-landing-page')) ||
                (userType === 'staffResource' && (currentUrl.includes('#resources-home') || currentUrl.includes('#resource-staff-management'))) ||
                (userType === 'staffAdminCoaching' && currentUrl.includes('#staff-landing-page')) ||
                (userType === 'staffAdminResource' && (currentUrl.includes('#resources-home') || currentUrl.includes('#resource-staff-management'))) ||
                (userType === 'superUser' && currentUrl.includes('#oversight-page'))) {
                console.log('[Universal Redirect] User already on correct page, no redirect needed');
                return;
            }
            
            console.log('[Universal Redirect] User type detected:', userType);
            redirectUser(userType);
        }, 1500); // Slightly longer delay to let homepages load first
    }
    
    // Make function globally available BEFORE the IIFE closes
    window.initializeUniversalRedirect = initializeUniversalRedirect;
    
    // Auto-initialize on scene render
    $(document).on('knack-scene-render.scene_1', function(event, scene) {
        console.log('[Universal Redirect] Scene 1 render event fired!', scene);
        
        // Check if we should skip
        if (window._bypassUniversalRedirect || window._universalRedirectCompleted || 
            window._navigationInProgress || sessionStorage.getItem('universalRedirectCompleted') === 'true') {
            console.log('[Universal Redirect] Skipping auto-initialize due to bypass flags');
            return;
        }
        
        log('Scene 1 rendered, checking for redirect...');
        
        // Add a delay here too to ensure everything is ready
        setTimeout(() => {
            initializeUniversalRedirect();
        }, 500);
    });
    
    console.log('[Universal Redirect] Event listeners attached, initializeUniversalRedirect is available:', typeof window.initializeUniversalRedirect);
    
})(); 
