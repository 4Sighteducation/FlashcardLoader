// === Knack Multi-App Loader Script ===
// Version: 2.0-FC (External Loader - Flashcards Only)
// Host this file on GitHub and load it via jsDelivr from Knack Builder.

(function() {
    // Prevent multiple executions of this loader script
    if (window.KNACK_MULTI_APP_LOADER_INITIALIZED) {
        console.log("[Knack External Loader] Loader already initialized. Skipping.");
        return;
    }
    window.KNACK_MULTI_APP_LOADER_INITIALIZED = true;
    console.log("[Knack External Loader] Initializing...");

    // --- Configuration (Read from Knack Builder) ---
    if (typeof KNACK_SHARED_CONFIG === 'undefined' || !KNACK_SHARED_CONFIG.appId || !KNACK_SHARED_CONFIG.apiKey) {
        console.error("[Knack External Loader] CRITICAL: KNACK_SHARED_CONFIG (with appId and apiKey) not found. Define it in Knack Builder before loading this script.");
        // Define fallbacks ONLY IF ABSOLUTELY necessary, but configure in Knack
        window.KNACK_SHARED_CONFIG = {
            appId: "YOUR_APP_ID_FALLBACK", // Replace if needed
            apiKey: "YOUR_API_KEY_FALLBACK" // Replace if needed
        };
         if (KNACK_SHARED_CONFIG.appId.includes("FALLBACK")) {
              console.warn("[Knack External Loader] Using fallback Knack credentials. Please configure KNACK_SHARED_CONFIG in Knack Builder.");
         }
    } else {
         console.log("[Knack External Loader] KNACK_SHARED_CONFIG found.");
         // Uncomment below to log keys - REMOVE IN PRODUCTION
         // debugLog("[Knack External Loader] Shared Config:", KNACK_SHARED_CONFIG);
    }

    // Create central namespace if it doesn't exist
    window.VESPA_APPS = window.VESPA_APPS || {};

    // --- App Mappings & Script URLs ---
    // *** Update Scene/View IDs and Script URLs as needed ***
    const APP_DEFINITIONS = {
        'flashcards': {
            // Map Scene ID to the required View ID for this app
            mapping: { 'scene_1206': 'view_3005' }, // Replace with YOUR Flashcards Scene/View IDs
            scriptUrl: 'https://cdn.jsdelivr.net/gh/4Sighteducation/KnackIntegration3@main/KnackJavascript6a.js', // Assumes 6a is the corrected version
            // Function to build the config object for this specific app
            configBuilder: function(sharedConfig, sceneId, viewId) {
                const appUrl = 'https://vespa-flashcards-e7f31e9ff3c9.herokuapp.com/';
                return {
                    knackAppId: sharedConfig.appId,
                    knackApiKey: sharedConfig.apiKey,
                    appUrl: appUrl,
                    // This structure should match what FLASHCARD_APP_CONFIG expects inside KnackJavascript6a.js
                    appConfig: {
                        [sceneId]: {
                            [viewId]: {
                                appType: 'flashcard-app',
                                elementSelector: '.kn-rich-text', // Or the specific selector needed
                                appUrl: appUrl
                            }
                        }
                    }
                };
            }
        }
        // --- Study Planner Definition (Will be added back here later) ---
        // 'studyplanner': { ... }
        // --- Taskboards Definition (Will be added back here later) ---
        // 'taskboards': { ... }
    };

    // --- Core Logic ---

    // Determines active app based on current scene/view and definitions
    function determineActiveApp() {
        const sceneId = typeof Knack !== 'undefined' ? Knack.scene_hash : null;
        const viewId = typeof Knack !== 'undefined' ? Knack.view_hash : null;

        if (!sceneId || !viewId) {
            // Don't log warning here, as Knack object might not be ready initially
            return null;
        }

        for (const appName in APP_DEFINITIONS) {
            const appDef = APP_DEFINITIONS[appName];
            // Check if the current scene exists in this app's mapping AND if the view matches
            if (appDef.mapping && appDef.mapping[sceneId] === viewId) {
                // Return all info needed to load the app
                return { name: appName, definition: appDef, sceneId: sceneId, viewId: viewId };
            }
        }
        // console.log(`[Knack External Loader] No app definition matches Scene: ${sceneId}, View: ${viewId}`);
        return null; // No matching app found
    }

    // Loads configuration and script for the determined active app
    function loadApp(activeAppInfo) {
        return new Promise((resolve, reject) => {
            const { name, definition, sceneId, viewId } = activeAppInfo;

            // Avoid re-configuring if already done (e.g., rapid re-renders)
            if (window.VESPA_APPS[name]) {
                 console.log(`[Knack External Loader] Config for ${name} already exists. Assuming script loaded.`);
                 resolve(); // Assume success as config is there
                 return;
            }

            console.log(`[Knack External Loader] Configuring ${name} App...`);

            // Generate and set the configuration in the namespace
            try {
                window.VESPA_APPS[name] = definition.configBuilder(KNACK_SHARED_CONFIG, sceneId, viewId);
                debugLog(`[Knack External Loader] ${name} Config Set:`, window.VESPA_APPS[name]);
            } catch (configError) {
                 console.error(`[Knack External Loader] Error building config for ${name}:`, configError);
                 reject(configError);
                 return;
            }

            // Create and load the script element
            const script = document.createElement('script');
            script.src = definition.scriptUrl;
            script.async = false; // Important for ensuring config is ready before script runs
            script.onload = () => {
                console.log(`[Knack External Loader] ${name} integration script loaded successfully from: ${definition.scriptUrl}`);
                resolve();
            };
            script.onerror = (error) => {
                console.error(`[Knack External Loader] CRITICAL - Failed to load ${name} integration script:`, definition.scriptUrl, error);
                // Clean up potentially bad config
                if (window.VESPA_APPS && window.VESPA_APPS[name]) {
                     delete window.VESPA_APPS[name];
                }
                reject(new Error(`Failed to load script: ${definition.scriptUrl}`));
            };
            document.head.appendChild(script);
        });
    }

    // --- Initialization Trigger ---
    let appLoadedForView = {}; // Prevent multiple loads per view render

    function initializeActiveApp(view) {
         // Ensure Knack context is available before proceeding
         if (typeof Knack === 'undefined' || !Knack.scene_hash || !Knack.view_hash) {
             // console.warn("[Knack External Loader] Knack context not fully available yet for initialization trigger.");
             return;
         }
         // Ensure view object is valid
         if (!view || !view.key) {
              // console.warn("[Knack External Loader] Invalid view object passed to initializeActiveApp.");
              return;
         }

        const viewKey = `${Knack.scene_hash}-${view.key}`;
        const activeAppInfo = determineActiveApp();

        if (activeAppInfo && !appLoadedForView[viewKey]) {
            const appName = activeAppInfo.name;
            console.log(`[Knack External Loader] Trigger: View ${view.key} rendered. Active app determined: ${appName}. Loading...`);
            appLoadedForView[viewKey] = true; // Mark as attempting load

            loadApp(activeAppInfo)
                .then(() => { console.log(`[Knack External Loader] Success: Script loading process initiated for ${appName} on view ${view.key}.`); })
                .catch(error => {
                    console.error(`[Knack External Loader] Error initiating script load for ${appName} on view ${view.key}:`, error);
                    // Allow potential retry on next render if loading failed
                    appLoadedForView[viewKey] = false;
                });
        } else if (activeAppInfo && appLoadedForView[viewKey]) {
             // console.log(`[Knack External Loader] App ${activeAppInfo.name} already loaded or loading for view ${viewKey}. Skipping.`);
        } else {
             // console.log(`[Knack External Loader] No active app determined for scene ${Knack.scene_hash}, view ${view.key}.`);
        }
    }

    // --- Knack Event Listeners ---
    // Use a flag to ensure listeners are attached only once
    if (typeof $ !== 'undefined' && !window.KNACK_MULTI_APP_LISTENERS_ATTACHED) {
        console.log("[Knack External Loader] Attaching Knack event listeners...");
        $(document).on('knack-view-render.any', function(event, view) { initializeActiveApp(view); });
        $(document).on('knack-scene-render.any', function(event, scene) {
             if (!scene || !scene.key) return;
             // On scene render, we might need to re-check the primary view
             const primaryViewElement = scene.$el ? scene.$el.find('.kn-view').first() : $();
             const viewKey = primaryViewElement.length ? primaryViewElement.attr('id') : scene.key;
             // Also reset the loaded view flags when scene fully renders/changes
             // console.log("[Knack External Loader] Scene changed. Resetting view load flags.");
             appLoadedForView = {};
             // Trigger initialization for the potentially new view/scene context
             initializeActiveApp({ key: viewKey });
        });
        window.KNACK_MULTI_APP_LISTENERS_ATTACHED = true;
    } else if (window.KNACK_MULTI_APP_LISTENERS_ATTACHED) {
         console.log("[Knack External Loader] Knack event listeners already attached.");
    } else {
         console.error("[Knack External Loader] jQuery ($) is not defined. Cannot attach Knack event listeners.");
    }

    // --- Utilities ---
    function debugLog(title, data) {
        let logData; try { logData = JSON.parse(JSON.stringify(data)); } catch (e) { logData = data; } // Deep clone safely
        console.log(`%c${title}`, 'color: #28a745; font-weight: bold;', logData);
    }

    // Initial check in case Knack events already fired or view is already rendered
    // Wrap in a small delay to give Knack time to potentially define scene/view hashes
     setTimeout(() => {
         if (typeof Knack !== 'undefined' && Knack.views && Object.keys(Knack.views).length > 0) {
             console.log("[Knack External Loader] Performing initial check for active app...");
             const currentViewKey = Knack.view_hash; // Use the hash available at load time
             if (currentViewKey) {
                  initializeActiveApp({ key: currentViewKey });
             }
         }
     }, 50); // Small delay

})();
