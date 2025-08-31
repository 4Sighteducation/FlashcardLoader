// Coaching Navigation Fix - Ensures proper loading of coaching pages
// This module handles navigation to/from coaching scenes (1014 & 1095)
// Version: 1.0

(function() {
    'use strict';
    
    const DEBUG = true;
    const log = (msg, data) => {
        if (DEBUG) console.log(`[CoachingNavFix] ${msg}`, data || '');
    };
    
    // Configuration
    const COACHING_SCENES = ['scene_1014', 'scene_1095'];
    const COACHING_URLS = ['#admin-coaching', '#mygroup-vespa-results2'];
    
    // Track current state
    let currentScene = null;
    let isCoachingScene = false;
    let cleanupFunctions = [];
    
    // Detect if we're on a coaching scene
    function detectCoachingScene() {
        const scene = window.Knack?.scene?.key;
        if (!scene) return false;
        return COACHING_SCENES.includes(scene);
    }
    
    // Detect if URL is coaching related
    function isCoachingUrl(url) {
        if (!url) return false;
        return COACHING_URLS.some(coachingUrl => url.includes(coachingUrl));
    }
    
    // Clean up when leaving coaching scene
    function cleanupCoachingScene() {
        log('Cleaning up coaching scene');
        
        // Stop all intervals and timeouts
        if (window.enhancementCheckInterval) {
            clearInterval(window.enhancementCheckInterval);
            window.enhancementCheckInterval = null;
        }
        
        if (window.tableUpdateTimeout) {
            clearTimeout(window.tableUpdateTimeout);
            window.tableUpdateTimeout = null;
        }
        
        // Remove any mutation observers
        if (window.coachingTableObserver) {
            window.coachingTableObserver.disconnect();
            window.coachingTableObserver = null;
        }
        
        // Clear any cached states
        if (window._forceAppReload) {
            delete window._forceAppReload;
        }
        
        // Reset DOM modifications
        const modalElement = document.getElementById('vue-table-modal');
        if (modalElement) {
            modalElement.remove();
        }
        
        // Clear background styles that might persist
        document.body.style.backgroundColor = '';
        document.body.style.background = '';
        document.body.style.backgroundImage = '';
        
        // Run any registered cleanup functions
        cleanupFunctions.forEach(fn => {
            try {
                fn();
            } catch (e) {
                console.error('[CoachingNavFix] Cleanup function error:', e);
            }
        });
        cleanupFunctions = [];
        
        log('Cleanup complete');
    }
    
    // Prepare for coaching scene load
    function prepareCoachingScene(sceneKey) {
        log('Preparing coaching scene:', sceneKey);
        
        // Set flags for loader
        window._forceAppReload = sceneKey;
        window._coachingSceneLoading = true;
        
        // Clear any existing app states for this scene
        if (window.cleanupAppsForScene && typeof window.cleanupAppsForScene === 'function') {
            window.cleanupAppsForScene(sceneKey);
        }
        
        // Signal to table enhancer to reinitialize
        window._tableEnhancerReset = true;
        
        // Clear any cached Vue table states
        if (window.vueTableCache) {
            delete window.vueTableCache;
        }
        
        log('Preparation complete');
    }
    
    // Enhanced navigation function for both header and homepage
    window.navigateToCoachingScene = function(scene, url, source = 'unknown') {
        log(`Navigation to coaching scene from ${source}`, { scene, url });
        
        // If we're currently on a coaching scene, clean it up first
        if (isCoachingScene) {
            cleanupCoachingScene();
        }
        
        // Prepare for new coaching scene
        if (COACHING_SCENES.includes(scene)) {
            prepareCoachingScene(scene);
        }
        
        // Set navigation flags
        window._universalRedirectCompleted = true;
        window._bypassUniversalRedirect = true;
        window._navigationInProgress = true;
        sessionStorage.setItem('universalRedirectCompleted', 'true');
        sessionStorage.setItem('navigationTarget', scene);
        
        // Perform navigation with delay for cleanup
        setTimeout(() => {
            window.location.hash = url.startsWith('#') ? url : '#' + url;
            
            // Verify navigation and clear flags
            setTimeout(() => {
                const currentScene = window.Knack?.scene?.key;
                if (currentScene === scene) {
                    log('Navigation successful');
                    window._coachingSceneLoading = false;
                } else {
                    log('Navigation may have failed, attempting reload');
                    window.location.reload();
                }
                window._navigationInProgress = false;
            }, 1000);
        }, 100);
    };
    
    // Register cleanup function (for external scripts to use)
    window.registerCoachingCleanup = function(fn) {
        if (typeof fn === 'function') {
            cleanupFunctions.push(fn);
        }
    };
    
    // Monitor scene changes
    function monitorSceneChanges() {
        const checkScene = () => {
            const newScene = window.Knack?.scene?.key;
            
            if (newScene !== currentScene) {
                log(`Scene changed: ${currentScene} → ${newScene}`);
                
                // If leaving a coaching scene
                if (currentScene && COACHING_SCENES.includes(currentScene) && 
                    !COACHING_SCENES.includes(newScene)) {
                    cleanupCoachingScene();
                    isCoachingScene = false;
                }
                
                // If entering a coaching scene
                if (newScene && COACHING_SCENES.includes(newScene)) {
                    isCoachingScene = true;
                    // Give time for table to load
                    setTimeout(() => {
                        window._tableEnhancerReset = false;
                    }, 2000);
                }
                
                currentScene = newScene;
            }
        };
        
        // Check periodically
        setInterval(checkScene, 500);
        
        // Also listen to Knack events
        if (window.$ && window.Knack) {
            $(document).on('knack-scene-render.any', function(event, scene) {
                setTimeout(checkScene, 100);
            });
        }
    }
    
    // Override the original navigateToScene function if it exists
    const originalNavigateToScene = window.navigateToScene;
    window.navigateToScene = function(scene, url, featureName) {
        // Check if this is a coaching scene
        if (COACHING_SCENES.includes(scene) || isCoachingUrl(url)) {
            log('Intercepting coaching navigation from homepage');
            return window.navigateToCoachingScene(scene, url, 'homepage');
        }
        
        // Otherwise use original function if it exists
        if (originalNavigateToScene) {
            return originalNavigateToScene.call(this, scene, url, featureName);
        } else {
            // Fallback to simple navigation
            window.location.hash = url.startsWith('#') ? url : '#' + url;
        }
    };
    
    // Patch GeneralHeader navigation
    function patchHeaderNavigation() {
        log('Patching header navigation for coaching scenes');
        
        // Wait for header to be ready
        const waitForHeader = setInterval(() => {
            const navButtons = document.querySelectorAll('.header-nav-button');
            
            if (navButtons.length > 0) {
                clearInterval(waitForHeader);
                
                navButtons.forEach(button => {
                    const originalClick = button.onclick;
                    const targetScene = button.dataset.scene;
                    const targetHref = button.getAttribute('href');
                    
                    // If this button navigates to a coaching scene
                    if (COACHING_SCENES.includes(targetScene) || isCoachingUrl(targetHref)) {
                        log(`Patching button for ${targetScene}`);
                        
                        // Remove existing listeners
                        button.onclick = null;
                        const newButton = button.cloneNode(true);
                        button.parentNode.replaceChild(newButton, button);
                        
                        // Add enhanced listener
                        newButton.addEventListener('click', function(e) {
                            e.preventDefault();
                            e.stopPropagation();
                            log('Header coaching navigation clicked');
                            window.navigateToCoachingScene(targetScene, targetHref, 'header');
                        });
                    }
                });
                
                log('Header navigation patched');
            }
        }, 500);
        
        // Stop checking after 10 seconds
        setTimeout(() => clearInterval(waitForHeader), 10000);
    }
    
    // Initialize
    function initialize() {
        log('Initializing Coaching Navigation Fix');
        
        // Detect initial state
        currentScene = window.Knack?.scene?.key;
        isCoachingScene = detectCoachingScene();
        
        // Start monitoring
        monitorSceneChanges();
        
        // Patch header navigation
        setTimeout(patchHeaderNavigation, 1000);
        
        // Re-patch if header gets re-rendered
        if (window.$ && window.Knack) {
            $(document).on('knack-scene-render.any', function() {
                setTimeout(patchHeaderNavigation, 500);
            });
        }
        
        log('Initialization complete');
    }
    
    // Start when ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        setTimeout(initialize, 100);
    }
    
})();
