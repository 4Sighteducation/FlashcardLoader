/**
 * VESPA Universal Header System - DEBUG VERSION
 * Enhanced with mobile debugging capabilities
 */

(function() {
    'use strict';
    
    // Mobile debug helper - safer console logging
    const mobileLog = function(message, data) {
        try {
            if (typeof console !== 'undefined' && console.log) {
                const timestamp = new Date().toISOString().substr(11, 12);
                const logMessage = `[${timestamp}] [GH-Debug] ${message}`;
                if (data !== undefined) {
                    console.log(logMessage, data);
                } else {
                    console.log(logMessage);
                }
            }
        } catch (e) {
            // Silently fail if console is not available
        }
        
        // Also store in a debug array for later retrieval
        if (!window._headerDebugLog) {
            window._headerDebugLog = [];
        }
        window._headerDebugLog.push({
            time: Date.now(),
            message: message,
            data: data
        });
        
        // Keep only last 100 entries
        if (window._headerDebugLog.length > 100) {
            window._headerDebugLog.shift();
        }
    };
    
    // Detection helper
    const detectEnvironment = function() {
        const ua = navigator.userAgent || '';
        const platform = navigator.platform || '';
        const vendor = navigator.vendor || '';
        
        const env = {
            userAgent: ua,
            platform: platform,
            vendor: vendor,
            isMobile: /iPhone|iPod|iPad|Android|BlackBerry|Opera Mini|IEMobile/i.test(ua),
            isIOS: /iPhone|iPod|iPad/i.test(ua),
            isAndroid: /Android/i.test(ua),
            isSafari: /Safari/i.test(ua) && /Apple Computer/i.test(vendor),
            isChrome: /Chrome/i.test(ua) && /Google Inc/i.test(vendor),
            screenWidth: window.innerWidth || document.documentElement.clientWidth || 0,
            screenHeight: window.innerHeight || document.documentElement.clientHeight || 0,
            touchSupported: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
            jQueryAvailable: typeof jQuery !== 'undefined' || typeof $ !== 'undefined',
            knackReady: typeof Knack !== 'undefined'
        };
        
        mobileLog('Environment detected', env);
        return env;
    };
    
    // Store environment globally for debugging
    window._headerEnvironment = detectEnvironment();
    
    mobileLog('GeneralHeader Debug script loaded');
    mobileLog('Window location', {
        href: window.location.href,
        hash: window.location.hash,
        pathname: window.location.pathname
    });
    
    function initializeGeneralHeader() {
        mobileLog('initializeGeneralHeader called');
        
        const config = window.GENERAL_HEADER_CONFIG;
        
        if (!config) {
            mobileLog('ERROR: Configuration not found', window.GENERAL_HEADER_CONFIG);
            
            // Try to show a visible error on the page
            try {
                const errorDiv = document.createElement('div');
                errorDiv.style.cssText = 'position:fixed;top:0;left:0;right:0;background:red;color:white;padding:10px;z-index:99999;text-align:center;';
                errorDiv.textContent = 'Header Config Missing - Check Console';
                document.body.appendChild(errorDiv);
                setTimeout(() => errorDiv.remove(), 5000);
            } catch (e) {
                mobileLog('Could not show error div', e.message);
            }
            
            return;
        }
        
        mobileLog('Config found', {
            sceneKey: config.sceneKey,
            viewKey: config.viewKey,
            userRoles: config.userRoles,
            hasUserAttributes: !!config.userAttributes
        });
        
        const DEBUG = true; // Force debug mode for this version
        const currentScene = config.sceneKey;
        const currentView = config.viewKey;
        const userRoles = config.userRoles || [];
        const userAttributes = config.userAttributes || {};
        
        let lastScene = null;
        
        // Helper function for debug logging
        function log(message, data) {
            if (DEBUG) {
                mobileLog(message, data);
            }
        }
        
        // [Keep all the existing helper functions like determineAvailableRoles, showRoleSelectionModal, etc.]
        // I'll include just the key parts that need modification
        
        function getUserType() {
            log('getUserType called');
            log('User attributes:', userAttributes);
            
            try {
                // [Include all the existing getUserType logic]
                // ... existing code ...
                
                // For now, let's add extra debugging
                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.get('student_emulator') === 'true' || 
                    window.location.hash.includes('student_emulator=true')) {
                    log('Student emulator mode detected');
                    window._isStudentEmulatorMode = true;
                    return 'student';
                }
                
                window._isStudentEmulatorMode = false;
                
                if (!userAttributes || (!userAttributes.email && !userAttributes.id)) {
                    log('No user attributes - not logged in');
                    return null;
                }
                
                // Simplified for debugging - return a default type
                log('Returning default staff type for debugging');
                return 'staffCoaching';
                
            } catch (e) {
                log('ERROR in getUserType', e.message);
                return null;
            }
        }
        
        // Navigation configurations (keep existing)
        const navigationConfig = {
            student: {
                brand: 'VESPA Student',
                brandIcon: 'fa-graduation-cap',
                color: '#079baa',
                accentColor: '#06206e',
                items: [
                    { label: 'Home', icon: 'fa-home', href: '#landing-page/', scene: 'scene_1210' },
                    { label: 'Settings', icon: 'fa-cog', href: '#account-settings', scene: 'scene_2', isSettings: true }
                ]
            },
            staffCoaching: {
                brand: 'VESPA Staff',
                brandIcon: 'fa-users',
                color: '#2f8dcb',
                accentColor: '#06206e',
                items: [
                    { label: 'Home', icon: 'fa-home', href: '#staff-landing-page/', scene: 'scene_1215' },
                    { label: 'Settings', icon: 'fa-cog', href: '#account-settings', scene: 'scene_2', isSettings: true }
                ]
            }
        };
        
        function createHeaderHTML(userType, currentScene) {
            log('createHeaderHTML called', { userType, currentScene });
            
            const navConfig = navigationConfig[userType] || navigationConfig.staffCoaching;
            
            // Simplified header for debugging
            return `
                <div id="vespaGeneralHeader" class="vespa-general-header ${userType}" data-debug="true">
                    <div class="header-debug-info" style="background:yellow;color:black;padding:5px;font-size:10px;">
                        Debug: ${userType} | Scene: ${currentScene} | Mobile: ${window._headerEnvironment.isMobile}
                    </div>
                    <div class="header-content">
                        <div class="header-top-row">
                            <div class="header-brand">
                                <span>${navConfig.brand}</span>
                            </div>
                            <nav class="header-navigation">
                                ${navConfig.items.map(item => `
                                    <a href="${item.href}" class="header-nav-button" data-scene="${item.scene}">
                                        <i class="fa ${item.icon}"></i>
                                        <span>${item.label}</span>
                                    </a>
                                `).join('')}
                            </nav>
                            <button class="mobile-menu-toggle" aria-label="Toggle menu">
                                <i class="fa fa-bars"></i>
                            </button>
                        </div>
                    </div>
                </div>
                <style>
                    .vespa-general-header {
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        background-color: ${navConfig.color};
                        color: white;
                        z-index: 9999;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    }
                    
                    .header-debug-info {
                        font-family: monospace;
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
                        font-size: 20px;
                        font-weight: 600;
                    }
                    
                    .header-navigation {
                        display: flex;
                        gap: 10px;
                    }
                    
                    .header-nav-button {
                        padding: 8px 16px;
                        background: rgba(255,255,255,0.2);
                        color: white;
                        text-decoration: none;
                        border-radius: 4px;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }
                    
                    .mobile-menu-toggle {
                        display: none;
                        background: none;
                        border: none;
                        color: white;
                        font-size: 24px;
                        cursor: pointer;
                    }
                    
                    body.has-general-header {
                        padding-top: 100px !important;
                    }
                    
                    @media (max-width: 768px) {
                        .header-navigation {
                            display: none;
                        }
                        
                        .mobile-menu-toggle {
                            display: block;
                        }
                    }
                </style>
            `;
        }
        
        function injectHeader() {
            log('injectHeader called');
            
            try {
                // Check if header already exists
                if (document.getElementById('vespaGeneralHeader')) {
                    log('Header already exists');
                    return;
                }
                
                const userType = getUserType();
                log('User type detected', userType);
                
                if (!userType) {
                    log('No user type, not showing header');
                    return;
                }
                
                // Create and inject the header
                const headerHTML = createHeaderHTML(userType, currentScene);
                
                // Try different injection methods for mobile compatibility
                if (document.body) {
                    document.body.insertAdjacentHTML('afterbegin', headerHTML);
                    document.body.classList.add('has-general-header');
                    log('Header injected successfully using insertAdjacentHTML');
                } else {
                    log('ERROR: document.body not available');
                    // Try again after DOMContentLoaded
                    document.addEventListener('DOMContentLoaded', function() {
                        log('Retrying after DOMContentLoaded');
                        if (!document.getElementById('vespaGeneralHeader')) {
                            document.body.insertAdjacentHTML('afterbegin', headerHTML);
                            document.body.classList.add('has-general-header');
                        }
                    });
                }
                
                // Setup basic event listeners
                setTimeout(function() {
                    setupEventListeners();
                }, 100);
                
            } catch (e) {
                log('ERROR in injectHeader', e.message);
                
                // Try to show error visually
                try {
                    const errorDiv = document.createElement('div');
                    errorDiv.style.cssText = 'position:fixed;top:50px;left:0;right:0;background:orange;color:black;padding:10px;z-index:99999;text-align:center;';
                    errorDiv.textContent = 'Header Injection Error: ' + e.message;
                    document.body.appendChild(errorDiv);
                    setTimeout(() => errorDiv.remove(), 5000);
                } catch (e2) {
                    // Silent fail
                }
            }
        }
        
        function setupEventListeners() {
            log('setupEventListeners called');
            
            try {
                const mobileToggle = document.querySelector('.mobile-menu-toggle');
                const navigation = document.querySelector('.header-navigation');
                
                if (mobileToggle) {
                    // Use both click and touch events
                    const toggleMenu = function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        log('Menu toggle clicked');
                        
                        if (navigation) {
                            navigation.style.display = navigation.style.display === 'flex' ? 'none' : 'flex';
                        }
                    };
                    
                    mobileToggle.addEventListener('click', toggleMenu, false);
                    mobileToggle.addEventListener('touchend', toggleMenu, false);
                    
                    log('Mobile toggle listeners added');
                } else {
                    log('Mobile toggle button not found');
                }
                
                // Add navigation link handlers
                const navLinks = document.querySelectorAll('#vespaGeneralHeader .header-nav-button');
                navLinks.forEach(function(link, index) {
                    link.addEventListener('click', function(e) {
                        log('Nav link clicked', { href: this.href, index: index });
                    });
                });
                
                log('Event listeners setup complete');
                
            } catch (e) {
                log('ERROR in setupEventListeners', e.message);
            }
        }
        
        function init() {
            log('init called');
            
            try {
                // Check for jQuery/Knack availability
                if (!window.jQuery && !window.$) {
                    log('jQuery not available, waiting...');
                    
                    // Wait for jQuery with timeout
                    let jQueryWaitCount = 0;
                    const jQueryWaitInterval = setInterval(function() {
                        jQueryWaitCount++;
                        
                        if (window.jQuery || window.$) {
                            log('jQuery now available after ' + (jQueryWaitCount * 100) + 'ms');
                            clearInterval(jQueryWaitInterval);
                            injectHeader();
                        } else if (jQueryWaitCount > 50) { // 5 second timeout
                            log('jQuery wait timeout, proceeding without it');
                            clearInterval(jQueryWaitInterval);
                            injectHeader();
                        }
                    }, 100);
                    
                } else {
                    log('jQuery available immediately');
                    
                    // Inject header with small delay
                    setTimeout(function() {
                        injectHeader();
                    }, 250);
                }
                
                // Also listen for Knack events if available
                if (window.$ || window.jQuery) {
                    const $ = window.$ || window.jQuery;
                    
                    $(document).on('knack-scene-render.any', function(event, scene) {
                        log('Knack scene rendered', scene.key);
                        
                        // Re-inject if missing
                        setTimeout(function() {
                            if (!document.getElementById('vespaGeneralHeader')) {
                                log('Header missing after scene change, re-injecting');
                                injectHeader();
                            }
                        }, 100);
                    });
                    
                    log('Knack event listeners attached');
                } else {
                    log('Could not attach Knack event listeners - jQuery not available');
                }
                
            } catch (e) {
                log('ERROR in init', e.message);
                
                // Last resort - try to inject anyway
                setTimeout(function() {
                    injectHeader();
                }, 1000);
            }
        }
        
        // Start initialization
        init();
    }
    
    // Export the initializer function
    window.initializeGeneralHeader = initializeGeneralHeader;
    
    // Also create a debug function to retrieve logs
    window.getHeaderDebugLog = function() {
        return window._headerDebugLog || [];
    };
    
    // Create a visible debug panel
    window.showHeaderDebugPanel = function() {
        const logs = window.getHeaderDebugLog();
        const panel = document.createElement('div');
        panel.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:white;z-index:999999;overflow:auto;padding:20px;font-family:monospace;font-size:12px;';
        
        panel.innerHTML = '<h3>Header Debug Log</h3><button onclick="this.parentElement.remove()">Close</button><hr>';
        panel.innerHTML += '<div>Environment: ' + JSON.stringify(window._headerEnvironment, null, 2) + '</div><hr>';
        
        logs.forEach(function(entry) {
            const div = document.createElement('div');
            div.textContent = new Date(entry.time).toISOString().substr(11, 8) + ' - ' + entry.message;
            if (entry.data) {
                div.textContent += ' - ' + JSON.stringify(entry.data);
            }
            panel.appendChild(div);
        });
        
        document.body.appendChild(panel);
    };
    
    mobileLog('GeneralHeader Debug setup complete');
})();
