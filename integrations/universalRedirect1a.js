
// Universal Redirect Controller for VESPA Academy
// Handles automatic routing of users to their appropriate landing pages

(function() {
    'use strict';
    
    const REDIRECT_CONFIG = {
        debugMode: false, // Set to true for console logging
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
        const user = (typeof Knack !== 'undefined' && Knack.getUserAttributes) ? Knack.getUserAttributes() : null;
        
        if (!user) {
            log('No user found - showing default home page');
            return null;
        }
        
        log('User found:', { 
            email: user.email, 
            roles: user.roles,
            field_73: user.values?.field_73,
            field_441: user.values?.field_441
        });
        
        // Check if user is a student (profile_4)
        if (user.roles && user.roles.includes('object_4')) {
            log('Detected as Student');
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
        if (!userType) {
            log('No redirect needed - staying on home page');
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
        log('Initializing Universal Redirect');
        
        // Check if we're on the home scene (scene_1)
        const currentScene = (typeof Knack !== 'undefined' && Knack.scene) ? Knack.scene.key : null;
        
        if (currentScene !== 'scene_1') {
            log('Not on home scene, skipping redirect logic');
            return;
        }
        
        // Small delay to ensure Knack user data is loaded
        setTimeout(() => {
            const userType = getUserType();
            redirectUser(userType);
        }, 100);
    }
    
    // Make function globally available
    window.initializeUniversalRedirect = initializeUniversalRedirect;
    
    // Auto-initialize on scene render
    $(document).on('knack-scene-render.scene_1', function() {
        log('Scene 1 rendered, checking for redirect...');
        initializeUniversalRedirect();
    });
    
})(); 
