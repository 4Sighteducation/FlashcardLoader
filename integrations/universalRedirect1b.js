// Universal Redirect Controller for VESPA Academy
// Handles automatic routing of users to their appropriate landing pages

console.log('[Universal Redirect] Script loaded!');

(function() {
    'use strict';
    
    const REDIRECT_CONFIG = {
        debugMode: true, // TEMPORARILY ENABLED for debugging
        scenes: {
            student: 'scene_1210',
            staffCoaching: 'scene_1215', 
            staffResource: 'scene_1252' // New scene for resource staff
        },
        // Map scenes to their URL hashes
        urls: {
            scene_1210: '#landing-page/',
            scene_1215: '#staff-landing-page/',
            scene_1252: '#resource-landing-page/' // You'll need to create this page
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
        
        // Check if user is a student
        // Students typically have role 'object_4' in the roles array
        if (user.roles && (user.roles.includes('object_4') || user.roles.includes('profile_4'))) {
            log('Detected as Student');
            return 'student';
        }
        
        // Also check profile_keys for students
        if (user.values && user.values.profile_keys && user.values.profile_keys.includes('profile_4')) {
            log('Detected as Student via profile_keys');
            return 'student';
        }
        
        // Check if user is staff
        if (user.values && user.values.field_73) {
            const staffRoles = ['profile_5', 'profile_7', 'profile_6'];
            const userRole = Array.isArray(user.values.field_73) ? user.values.field_73[0] : user.values.field_73;
            
            if (staffRoles.includes(userRole)) {
                // Check account type for staff
                const accountType = user.values.field_441;
                
                if (accountType && accountType.toString().toUpperCase().includes('RESOURCE')) {
                    log('Detected as Staff (Resource)');
                    return 'staffResource';
                } else {
                    log('Detected as Staff (Coaching)');
                    return 'staffCoaching';
                }
            }
        }
        
        log('User type could not be determined');
        return null;
    }
    
    function redirectUser(userType) {
        console.log('[Universal Redirect] redirectUser called with userType:', userType);
        
        if (!userType) {
            log('No redirect needed - staying on home page');
            console.log('[Universal Redirect] No user type, showing welcome page');
            showWelcomePage();
            return;
        }
        
        const targetScene = REDIRECT_CONFIG.scenes[userType];
        const targetUrl = REDIRECT_CONFIG.urls[targetScene];
        
        if (targetUrl) {
            log(`Redirecting ${userType} to ${targetUrl}`);
            
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
        // Show default welcome content for users who can't be identified
        const container = document.querySelector('.kn-scene-content') || document.querySelector('#kn-scene_1');
        if (container) {
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
        log('Initializing Universal Redirect');
        
        // Check if we're on the home scene (scene_1)
        const currentScene = (typeof Knack !== 'undefined' && Knack.scene) ? Knack.scene.key : null;
        console.log('[Universal Redirect] Current scene:', currentScene);
        
        if (currentScene !== 'scene_1') {
            log('Not on home scene, skipping redirect logic');
            console.log('[Universal Redirect] Not on scene_1, exiting');
            return;
        }
        
        console.log('[Universal Redirect] On scene_1, will check user after delay');
        
        // Increased delay to ensure Knack user data is loaded
        setTimeout(() => {
            console.log('[Universal Redirect] Checking user type...');
            const userType = getUserType();
            console.log('[Universal Redirect] User type detected:', userType);
            redirectUser(userType);
        }, 500); // Increased delay
    }
    
    // Make function globally available BEFORE the IIFE closes
    window.initializeUniversalRedirect = initializeUniversalRedirect;
    
    // Auto-initialize on scene render
    $(document).on('knack-scene-render.scene_1', function() {
        console.log('[Universal Redirect] Scene 1 render event fired!');
        log('Scene 1 rendered, checking for redirect...');
        initializeUniversalRedirect();
    });
    
    console.log('[Universal Redirect] Event listeners attached, initializeUniversalRedirect is available:', typeof window.initializeUniversalRedirect);
    
})(); 
