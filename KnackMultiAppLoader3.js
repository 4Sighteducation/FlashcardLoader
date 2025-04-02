  // === Knack Multi-App Loader Script ===
    // Version: 2.2-ALL (External Loader - Event Driven Only)

    (function() {
        if (window.KNACK_MULTI_APP_LOADER_INITIALIZED) { /* ... */ return; }
        window.KNACK_MULTI_APP_LOADER_INITIALIZED = true;
        console.log("[Knack External Loader] Initializing...");

        // --- Configuration (Read from Knack Builder) ---
        if (typeof KNACK_SHARED_CONFIG === 'undefined' /* ... */) { /* ... */ } else { /* ... */ }
        window.VESPA_APPS = window.VESPA_APPS || {};

        // --- App Mappings & Script URLs ---
        // *** Ensure Scene/View IDs are correct for ALL apps ***
        const APP_DEFINITIONS = {
            'flashcards': {
                mapping: { 'scene_1206': 'view_3005' }, // Your Flashcards IDs
                scriptUrl: 'https://cdn.jsdelivr.net/gh/4Sighteducation/FlashcardLoader@main/Flashcards1b.js', // Corrected Flashcards Script
                configBuilder: function(sharedConfig, sceneId, viewId) { /* ... */ }
            },
            'studyplanner': {
                mapping: { 'scene_1208': 'view_3008' }, // Your Study Planner IDs
                scriptUrl: 'https://cdn.jsdelivr.net/gh/4Sighteducation/FlashcardLoader@main/sp2Javascript1c.js', // Corrected Study Planner Script
                configBuilder: function(sharedConfig, sceneId, viewId) { /* ... */ }
            },
            'taskboards': {
                mapping: { 'scene_1118': 'view_3006' }, // Your Taskboards IDs
                scriptUrl: 'https://cdn.jsdelivr.net/gh/4Sighteducation/FlashcardLoader@main/vespataskboardsjs1d.js', // Corrected Taskboards Script
                configBuilder: function(sharedConfig, sceneId, viewId) { /* ... */ }
            }
        };
        // (Keep the full configBuilder functions as they were in v2.1-ALL)


        // --- Core Logic (determineActiveApp, loadApp remain the same) ---
        function determineActiveApp() { /* ... same as before ... */ }
        function loadApp(activeAppInfo) { /* ... same as before ... */ }

        // --- Initialization Trigger (Event Driven ONLY) ---
        let appLoadedForView = {};
        function initializeActiveApp(view) {
            // Add extra guard for Knack context readiness INSIDE the handler
            if (typeof Knack === 'undefined' || !Knack.scene_hash || !Knack.view_hash || !view || !view.key) {
                console.warn("[Knack External Loader] Knack context/view info not ready inside event handler for view:", view ? view.key : 'N/A');
                return;
            }
            const viewKey = `${Knack.scene_hash}-${view.key}`;
            const activeAppInfo = determineActiveApp(); // determineActiveApp already checks Knack context

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
        // Function to attach listeners once jQuery is ready
        function attachKnackListeners() {
            if (typeof $ === 'undefined') {
                 console.warn("[Knack External Loader] jQuery ($) not ready yet. Retrying listener attachment...");
                 setTimeout(attachKnackListeners, 100); // Retry after 100ms
                 return;
            }

            if (!window.KNACK_MULTI_APP_LISTENERS_ATTACHED) {
                console.log("[Knack External Loader] Attaching Knack event listeners...");
                $(document).on('knack-view-render.any', function(event, view) {
                     console.log("[Knack External Loader] Event: knack-view-render.any detected for view:", view ? view.key : 'N/A');
                     initializeActiveApp(view);
                });
                $(document).on('knack-scene-render.any', function(event, scene) {
                     if (!scene || !scene.key) return;
                     console.log("[Knack External Loader] Event: knack-scene-render.any detected for scene:", scene.key);
                     const primaryViewElement = scene.$el ? scene.$el.find('.kn-view').first() : $();
                     const viewKey = primaryViewElement.length ? primaryViewElement.attr('id') : scene.key;
                     appLoadedForView = {}; // Reset flags on scene change
                     initializeActiveApp({ key: viewKey });
                });
                window.KNACK_MULTI_APP_LISTENERS_ATTACHED = true;
                 // Trigger an initial check *after* listeners are attached, in case view already rendered
                 console.log("[Knack External Loader] Attempting initial check after attaching listeners...");
                 if (typeof Knack !== 'undefined' && Knack.view_hash) {
                      initializeActiveApp({ key: Knack.view_hash });
                 }
            } else {
                 console.log("[Knack External Loader] Knack event listeners already attached.");
            }
        }
        // Start the process of attaching listeners
        attachKnackListeners();


        // --- Utilities ---
        function debugLog(title, data) { /* ... */ }

        // --- REMOVED Manual Trigger Function ---
        // --- REMOVED setTimeout Initial Check ---

    })();
