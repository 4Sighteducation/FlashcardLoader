// === Knack Multi-App Loader Script ===
// Version: 2.1-ALL (External Loader - Flashcards, Study Planner, Taskboards)
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
    }

    // Create central namespace if it doesn't exist
    window.VESPA_APPS = window.VESPA_APPS || {};

    // --- App Mappings & Script URLs ---
    // *** Update ALL Scene/View IDs and Script URLs as needed ***
    const APP_DEFINITIONS = {
        'flashcards': {
            // *** Replace with YOUR Flashcards Scene/View IDs ***
            mapping: { 'scene_1206': 'view_3005' },
            scriptUrl: 'https://cdn.jsdelivr.net/gh/4Sighteducation/FlashcardLoader@main/integrations/Flashcards1a.js', // Assumes 6a is the corrected version
            configBuilder: function(sharedConfig, sceneId, viewId) {
                const appUrl = 'https://vespa-flashcards-e7f31e9ff3c9.herokuapp.com/';
                return {
                    knackAppId: sharedConfig.appId,
                    knackApiKey: sharedConfig.apiKey,
                    appUrl: appUrl,
                    appConfig: {
                        [sceneId]: {
                            [viewId]: { appType: 'flashcard-app', elementSelector: '.kn-rich-text', appUrl: appUrl }
                        }
                    }
                };
            }
        },
        'studyplanner': {
             // *** Replace with YOUR Study Planner Scene/View IDs ***
            mapping: { 'scene_1208': 'view_3008' },
            scriptUrl: 'https://cdn.jsdelivr.net/gh/4Sighteducation/Flashcards2Javascript@main/sp2Javascript1c.js', // Assumes 1c is the corrected version
            configBuilder: function(sharedConfig, sceneId, viewId) {
                const appUrl = 'https://studyplanner2-fc98f9e231f4.herokuapp.com/';
                return {
                    knackAppId: sharedConfig.appId,
                    knackApiKey: sharedConfig.apiKey,
                    appUrl: appUrl,
                    appConfig: {
                        [sceneId]: {
                            [viewId]: { appType: 'study-planner', elementSelector: '.kn-rich-text', appUrl: appUrl }
                        }
                    }
                };
            }
        },
        'taskboards': {
             // *** Replace with YOUR Taskboards Scene/View IDs ***
            mapping: { 'scene_1118': 'view_3006' }, // <--- EXAMPLE IDs, PLEASE UPDATE!
            scriptUrl: 'https://cdn.jsdelivr.net/gh/4Sighteducation/VESPATASKBOARDSJS@main/vespataskboardsjs1d.js',
            configBuilder: function(sharedConfig, sceneId, viewId) {
                 const appUrl = 'https://vespataskboards-00affb61eb55.herokuapp.com/';
                 return {
                     knackAppId: sharedConfig.appId,
                     knackApiKey: sharedConfig.apiKey,
                     appUrl: appUrl,
                     // Add an appConfig structure for consistency
                     appConfig: {
                         [sceneId]: {
                             [viewId]: { appType: 'taskboard', elementSelector: '.kn-rich-text', appUrl: appUrl }
                         }
                     }
                 };
            }
        }
    };

    // --- Core Logic ---

    // Determines active app based on current scene/view and definitions
    function determineActiveApp() {
        const sceneId = typeof Knack !== 'undefined' ? Knack.scene_hash : null;
        const viewId = typeof Knack !== 'undefined' ? Knack.view_hash : null;

        if (!sceneId || !viewId) { return null; }

        for (const appName in APP_DEFINITIONS) {
            const appDef = APP_DEFINITIONS[appName];
            if (appDef.mapping && appDef.mapping[sceneId] === viewId) {
                return { name: appName, definition: appDef, sceneId: sceneId, viewId: viewId };
            }
        }
        return null; // No matching app found
    }

    // Loads configuration and script for the determined active app
    function loadApp(activeAppInfo) {
        return new Promise((resolve, reject) => {
            const { name, definition, sceneId, viewId } = activeAppInfo;

            if (window.VESPA_APPS[name]) {
                 console.log(`[Knack External Loader] Config for ${name} already exists. Assuming script loaded.`);
                 resolve();
                 return;
            }
            console.log(`[Knack External Loader] Configuring ${name} App...`);

            try {
                window.VESPA_APPS[name] = definition.configBuilder(KNACK_SHARED_CONFIG, sceneId, viewId);
                debugLog(`[Knack External Loader] ${name} Config Set:`, window.VESPA_APPS[name]);
            } catch (configError) {
                 console.error(`[Knack External Loader] Error building config for ${name}:`, configError);
                 reject(configError);
                 return;
            }

            const script = document.createElement('script');
            script.src = definition.scriptUrl;
            script.async = false;
            script.onload = () => {
                console.log(`[Knack External Loader] ${name} integration script loaded successfully from: ${definition.scriptUrl}`);
                resolve();
            };
            script.onerror = (error) => {
                console.error(`[Knack External Loader] CRITICAL - Failed to load ${name} integration script:`, definition.scriptUrl, error);
                if (window.VESPA_APPS && window.VESPA_APPS[name]) { delete window.VESPA_APPS[name]; }
                reject(new Error(`Failed to load script: ${definition.scriptUrl}`));
            };
            document.head.appendChild(script);
        });
    }

    // --- Initialization Trigger ---
    let appLoadedForView = {};

    function initializeActiveApp(view) {
         if (typeof Knack === 'undefined' || !Knack.scene_hash || !Knack.view_hash || !view || !view.key) { return; }
        const viewKey = `${Knack.scene_hash}-${view.key}`;
        const activeAppInfo = determineActiveApp();

        if (activeAppInfo && !appLoadedForView[viewKey]) {
            const appName = activeAppInfo.name;
            console.log(`[Knack External Loader] Trigger: View ${view.key} rendered. Active app determined: ${appName}. Loading...`);
            appLoadedForView[viewKey] = true;
            loadApp(activeAppInfo)
                .then(() => { console.log(`[Knack External Loader] Success: Script loading process initiated for ${appName} on view ${view.key}.`); })
                .catch(error => {
                    console.error(`[Knack External Loader] Error initiating script load for ${appName} on view ${view.key}:`, error);
                    appLoadedForView[viewKey] = false;
                });
        }
    }

    // --- Knack Event Listeners ---
    if (typeof $ !== 'undefined' && !window.KNACK_MULTI_APP_LISTENERS_ATTACHED) {
        console.log("[Knack External Loader] Attaching Knack event listeners...");
        $(document).on('knack-view-render.any', function(event, view) { initializeActiveApp(view); });
        $(document).on('knack-scene-render.any', function(event, scene) {
             if (!scene || !scene.key) return;
             const primaryViewElement = scene.$el ? scene.$el.find('.kn-view').first() : $();
             const viewKey = primaryViewElement.length ? primaryViewElement.attr('id') : scene.key;
             appLoadedForView = {}; // Reset flags on scene change
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
        let logData; try { logData = JSON.parse(JSON.stringify(data)); } catch (e) { logData = data; }
        console.log(`%c${title}`, 'color: #28a745; font-weight: bold;', logData);
    }

    // Initial check
     setTimeout(() => {
         if (typeof Knack !== 'undefined' && Knack.views && Object.keys(Knack.views).length > 0) {
             console.log("[Knack External Loader] Performing initial check for active app...");
             // Use view_hash if available, otherwise try to find the first view key
             const currentViewKey = Knack.view_hash || (Knack.views[Object.keys(Knack.views)[0]] ? Knack.views[Object.keys(Knack.views)[0]].key : null);
             if (currentViewKey) {
                  initializeActiveApp({ key: currentViewKey });
             } else {
                  console.warn("[Knack External Loader] Could not determine current view key for initial check.");
             }
         }
     }, 100); // Increased delay slightly

})();
