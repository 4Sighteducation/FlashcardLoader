/// Student Coach Launcher Script (vespa-student-coach.js)

// Guard to prevent re-initialization
if (window.studentCoachLauncherInitialized) {
    console.warn("[StudentCoachLauncher] Attempted to re-initialize. Skipping.");
} else {
    window.studentCoachLauncherInitialized = true;

    let STUDENT_COACH_LAUNCHER_CONFIG = null;
    let coachObserver = null;
    let coachUIInitialized = false;
    let debouncedObserverCallback = null; 
    let eventListenersAttached = false; 
    let currentFetchAbortController = null; 
    let lastFetchedStudentKnackId = null; // For student's own Knack user ID or related unique ID
    let observerLastProcessedStudentKnackId = null;
    let currentlyFetchingStudentKnackId = null;
    let vespaChartInstance = null; 
    let currentLLMInsightsForChat = null; 
    let loadingMessageIntervalId = null; 
    let questionnairePieChartInstance = null; // Added for questionnaire chart
    let uiCurrentlyInitializing = false; // Flag to prevent re-entrant UI initialization
    let coachDataCurrentlyRefreshing = false; // Flag to prevent re-entrant data refresh

    // --- Configuration ---
    const STUDENT_COACH_API_BASE_URL = 'https://vespa-student-coach-8116bb380fbd.herokuapp.com/api/v1'; // UPDATED to new Heroku app URL
    const COACHING_DATA_ENDPOINT = `${STUDENT_COACH_API_BASE_URL}/student_coaching_data`; 
    const CHAT_TURN_ENDPOINT = `${STUDENT_COACH_API_BASE_URL}/chat_turn`; 
    const CHAT_HISTORY_ENDPOINT = `${STUDENT_COACH_API_BASE_URL}/chat_history`; // Added for student chat history

    function logStudentCoach(message, data) {
        if (STUDENT_COACH_LAUNCHER_CONFIG && STUDENT_COACH_LAUNCHER_CONFIG.debugMode) {
             console.log(`[StudentCoachLauncher] ${message}`, data === undefined ? '' : data);
        }
    }

    function ensureChartJsLoaded(callback) {
        if (typeof Chart !== 'undefined') {
            logStudentCoach("Chart.js already loaded.");
            if (callback) callback();
            return;
        }
        logStudentCoach("Chart.js not found, attempting to load from CDN...");
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js@3.7.1/dist/chart.min.js';
        script.onload = () => {
            logStudentCoach("Chart.js loaded successfully from CDN.");
            if (callback) callback();
        };
        script.onerror = () => {
            console.error("[StudentCoachLauncher] Failed to load Chart.js from CDN.");
            const chartContainer = document.getElementById('vespaComparisonChartContainer'); // Keep generic ID for now
            if(chartContainer) chartContainer.innerHTML = '<p style="color:red; text-align:center;">Chart library failed to load.</p>';
        };
        document.head.appendChild(script);
    }

    // Function to check if we are on the correct student coach page
    function isStudentCoachPageView() {
        if (!STUDENT_COACH_LAUNCHER_CONFIG || !STUDENT_COACH_LAUNCHER_CONFIG.sceneKey || !STUDENT_COACH_LAUNCHER_CONFIG.elementSelector) {
            logStudentCoach("isStudentCoachPageView: Config not fully available.");
            return false;
        }

        // WorkingBridge.js has already determined this script should run for the scene specified 
        // in STUDENT_COACH_LAUNCHER_CONFIG.sceneKey.
        // So, we primarily check if the target element (where the button should go) exists.
        const targetViewElement = document.querySelector(STUDENT_COACH_LAUNCHER_CONFIG.elementSelector);

        if (targetViewElement) {
            // For robustness, we can log Knack's current scene if available, but the presence
            // of targetViewElement is the key indicator since WorkingBridge made the call to load this script.
            if (typeof Knack !== 'undefined' && Knack.scene && Knack.scene.key) {
                if (Knack.scene.key === STUDENT_COACH_LAUNCHER_CONFIG.sceneKey) {
                    logStudentCoach(`Student Coach page view confirmed: Config Scene '${STUDENT_COACH_LAUNCHER_CONFIG.sceneKey}', Knack Scene '${Knack.scene.key}', Element '${STUDENT_COACH_LAUNCHER_CONFIG.elementSelector}' found.`);
                } else {
                    // This is an edge case: element found, but Knack.scene.key reports a different scene.
                    // This might happen during very rapid Knack view/scene transitions.
                    // We'll trust that WorkingBridge loaded us for the correct configured scene.
                    logStudentCoach(`Student Coach page view: Element '${STUDENT_COACH_LAUNCHER_CONFIG.elementSelector}' found. Knack.scene.key ('${Knack.scene.key}') currently differs from config scene ('${STUDENT_COACH_LAUNCHER_CONFIG.sceneKey}'). Proceeding based on element presence.`);
                }
            } else {
                // Knack.scene not fully available yet, but the target element exists.
                logStudentCoach(`Student Coach page view confirmed: Element '${STUDENT_COACH_LAUNCHER_CONFIG.elementSelector}' found (Knack.scene not checked/fully ready).`);
            }
            return true; // Element found, proceed.
        }
        
        // logStudentCoach("isStudentCoachPageView: Target element for button not found.");
        return false;
    }

    function initializeCoachUI() {
        logStudentCoach("StudentCoachLauncher: initializeCoachUI START");
        if (coachUIInitialized && document.getElementById(STUDENT_COACH_LAUNCHER_CONFIG.aiCoachToggleButtonId)) {
            logStudentCoach("Student Coach UI appears to be already initialized. Skipping.");
            return;
        }
        if (uiCurrentlyInitializing) {
            logStudentCoach("Student Coach UI is already in the process of initializing. Skipping.");
            return;
        }
        uiCurrentlyInitializing = true;

        logStudentCoach("Conditions met. Initializing Student Coach UI (button and panel).");
        loadExternalStyles(); 
        createAICoachPanel(); 
        addPanelResizeHandler(); // ADDED from tutor coach
        addLauncherButton(); 
        setupEventListeners(); 
        coachUIInitialized = true;
        logStudentCoach("StudentCoachLauncher UI initialization complete.");
        uiCurrentlyInitializing = false;
    }
    
    function clearCoachUI() {
        if (!coachUIInitialized) return;
        logStudentCoach("Clearing Student Coach UI.");
        const launcherButtonContainer = document.getElementById('studentCoachLauncherButtonContainer'); // Needs unique ID
        if (launcherButtonContainer) {
            launcherButtonContainer.innerHTML = ''; 
        }
        toggleAICoachPanel(false); 
        coachUIInitialized = false; 
        lastFetchedStudentKnackId = null; 
        observerLastProcessedStudentKnackId = null; 
        currentlyFetchingStudentKnackId = null;
        if (currentFetchAbortController) { 
            currentFetchAbortController.abort();
            currentFetchAbortController = null;
            logStudentCoach("Aborted ongoing fetch as UI was cleared.");
        }
    }

    function initializeStudentCoachLauncher() {
        logStudentCoach("StudentCoachLauncher: initializeStudentCoachLauncher START");

        if (typeof window.STUDENT_COACH_LAUNCHER_CONFIG === 'undefined') {
            console.error("[StudentCoachLauncher] STUDENT_COACH_LAUNCHER_CONFIG is not defined. Cannot initialize.");
            return;
        }
        STUDENT_COACH_LAUNCHER_CONFIG = window.STUDENT_COACH_LAUNCHER_CONFIG;
        logStudentCoach("Student Coach Config loaded:", STUDENT_COACH_LAUNCHER_CONFIG);

        if (!STUDENT_COACH_LAUNCHER_CONFIG.elementSelector || 
            !STUDENT_COACH_LAUNCHER_CONFIG.aiCoachPanelId ||
            !STUDENT_COACH_LAUNCHER_CONFIG.aiCoachToggleButtonId ||
            !STUDENT_COACH_LAUNCHER_CONFIG.mainContentSelector) {
            console.error("[StudentCoachLauncher] Essential configuration properties missing.");
            return;
        }

        const targetNode = document.querySelector('#kn-scene_43'); 

        if (!targetNode) {
            console.error("[StudentCoachLauncher] Target node for MutationObserver not found (#kn-scene_43).");
            return;
        }

        function debounce(func, wait) {
            let timeout;
            return function(...args) {
                const context = this;
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(context, args), wait);
            };
        }

        const observerCallback = function(mutationsList, observer) {
            // logStudentCoach("MutationObserver detected DOM change (raw event)."S); // Can be noisy
            
            if (isStudentCoachPageView()) { // Check if we are on the correct page
                if (!coachUIInitialized && !uiCurrentlyInitializing) { // Only initialize UI if not already done and not in process
                    initializeCoachUI();
                }
                const panelIsActive = document.body.classList.contains('ai-coach-active'); 
                if (coachUIInitialized && panelIsActive) {
                    const currentStudentUser = Knack.getUserAttributes();
                    const studentKnackId = currentStudentUser ? currentStudentUser.id : null;
                    if (studentKnackId && studentKnackId !== observerLastProcessedStudentKnackId) {
                        logStudentCoach(`Observer: Student Knack ID changed or identified: ${studentKnackId}. Triggering refresh.`);
                        observerLastProcessedStudentKnackId = studentKnackId; // Update last processed ID *before* refresh call
                        refreshAICoachData(); 
                    } else if (studentKnackId && studentKnackId === observerLastProcessedStudentKnackId){
                        // logStudentCoach(`Observer: Student Knack ID ${studentKnackId} is same as observerLastProcessedStudentKnackId. No refresh needed from observer.`);
                    }
                }
            } else { // Not on the student coach page (or Knack.scene not ready)
                if (coachUIInitialized) { // If UI was initialized, clear it
                    logStudentCoach("Observer: Not on Student Coach page view or Knack.scene not ready. Clearing UI if initialized.");
                    clearCoachUI();
                    observerLastProcessedStudentKnackId = null; 
                }
            }
        };
        
        debouncedObserverCallback = debounce(observerCallback, 500); // Increased debounce slightly to 500ms

        coachObserver = new MutationObserver(debouncedObserverCallback);
        coachObserver.observe(targetNode, { childList: true, subtree: true });

        // REMOVED: Initial direct call to initializeCoachUI via isStudentCoachPageView()
        // We now rely on the MutationObserver to make the first call when ready.
        // if (isStudentCoachPageView()) {
        //     initializeCoachUI();
        // }
        logStudentCoach("StudentCoachLauncher: Initializer setup complete. Observer is active.");
    }

    function loadExternalStyles() {
        const styleId = 'student-coach-external-styles'; // Unique ID
        if (document.getElementById(styleId)) {
            logStudentCoach("Student Coach external styles already loaded.");
            return;
        }

        // TODO: Update this to the CDN path of your vespa-student-coach.css
        const link = document.createElement('link');
        link.id = styleId;
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = 'https://cdn.jsdelivr.net/gh/4Sighteducation/FlashcardLoader@main/integrations/report/vespa-student-coach1b.css'; // Placeholder
        
        // Dynamic CSS for config-specific IDs
        const dynamicCss = `
            body.ai-coach-active ${STUDENT_COACH_LAUNCHER_CONFIG.mainContentSelector} {
                /* Adjust main content if panel is on the side */
            }
            
            #${STUDENT_COACH_LAUNCHER_CONFIG.aiCoachPanelId} {
                /* Basic panel styles - copy from aiCoachLauncher1f.css and adapt IDs */
                width: 0; opacity: 0; visibility: hidden;
                position: fixed !important; top: 0; right: 0; height: 100vh;
                background-color: #f4f6f8; border-left: 1px solid #ddd;
                padding: 20px; box-sizing: border-box; overflow-y: auto;
                z-index: 1050; transition: width 0.3s, opacity 0.3s, visibility 0.3s;
                font-family: Arial, sans-serif; display: flex; flex-direction: column;
            }
            
            body.ai-coach-active #${STUDENT_COACH_LAUNCHER_CONFIG.aiCoachPanelId} {
                width: var(--ai-coach-panel-width, 450px); /* Use CSS var or default */
                opacity: 1; visibility: visible;
            }
            
            #${STUDENT_COACH_LAUNCHER_CONFIG.aiCoachPanelId} .ai-coach-panel-header {
                /* Styles for panel header */
                display: flex; justify-content: space-between; align-items: center;
                margin-bottom: 15px; border-bottom: 1px solid #ccc; padding-bottom: 10px;
                flex-shrink: 0;
            }
            
            #${STUDENT_COACH_LAUNCHER_CONFIG.aiCoachPanelId} .ai-coach-panel-content {
                 /* Styles for panel content area */
                flex: 1; display: flex; flex-direction: column;
                overflow-y: auto; min-height: 0;
            }
            
            .loader { /* Keep loader styles */ }
            @keyframes spin { /* Keep spin animation */ }
        `;
        
        const styleElement = document.createElement('style');
        styleElement.textContent = dynamicCss;
        
        document.documentElement.style.setProperty('--ai-coach-panel-width', '400px'); // Student panel might be narrower
        document.documentElement.style.setProperty('--ai-coach-panel-min-width', '280px');
        document.documentElement.style.setProperty('--ai-coach-panel-max-width', '600px');
        document.documentElement.style.setProperty('--ai-coach-transition-duration', '0.3s');
        
        document.head.appendChild(link);
        document.head.appendChild(styleElement);
        
        logStudentCoach("Student Coach external styles loading...");
        link.onload = () => logStudentCoach("Student Coach external styles loaded successfully.");
        link.onerror = () => console.error("[StudentCoachLauncher] Failed to load external styles for student coach.");
    }

    function addPanelResizeHandler() {
        const panel = document.getElementById(STUDENT_COACH_LAUNCHER_CONFIG.aiCoachPanelId);
        if (!panel) return;

        let isResizing = false;
        let startX = 0;
        let startWidth = 0;
        // Use student-specific CSS variable or default
        let currentWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--student-coach-panel-width'), 10) || 400; 

        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'ai-coach-resize-handle'; // Generic class for styling
        resizeHandle.style.cssText = `
            position: absolute; left: 0; top: 0; bottom: 0; width: 10px;
            cursor: ew-resize; background: transparent; z-index: 1051;
            transition: background-color 0.2s;
        `; // Basic styles for functionality
        panel.appendChild(resizeHandle);

        resizeHandle.addEventListener('mouseenter', () => { resizeHandle.style.backgroundColor = 'rgba(0, 0, 0, 0.1)'; });
        resizeHandle.addEventListener('mouseleave', () => { if (!isResizing) resizeHandle.style.backgroundColor = 'transparent'; });

        const startResize = (e) => {
            e.preventDefault();
            isResizing = true;
            startX = e.clientX;
            startWidth = panel.offsetWidth;
            document.body.classList.add('ai-coach-resizing'); // Class for global cursor/selection style
            resizeHandle.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
            currentWidth = startWidth;
            logStudentCoach(`Starting student panel resize from width: ${startWidth}px`);
        };

        const doResize = (e) => {
            if (!isResizing) return;
            const diff = startX - e.clientX;
            // Use student-specific min/max width CSS variables
            const minW = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--student-coach-panel-min-width'), 10) || 280;
            const maxW = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--student-coach-panel-max-width'), 10) || 600;
            const newWidth = Math.max(minW, Math.min(maxW, startWidth + diff));
            
            document.documentElement.style.setProperty('--student-coach-panel-width', newWidth + 'px');
            panel.style.width = newWidth + 'px';
            
            const mainContent = document.querySelector(STUDENT_COACH_LAUNCHER_CONFIG.mainContentSelector);
            if (mainContent && document.body.classList.contains('ai-coach-active')) {
                mainContent.style.width = `calc(100% - ${newWidth}px)`
                mainContent.style.marginRight = `${newWidth}px`;
            }
            currentWidth = newWidth;
        };

        const stopResize = () => {
            if (!isResizing) return;
            isResizing = false;
            document.body.classList.remove('ai-coach-resizing');
            resizeHandle.style.backgroundColor = 'transparent';
            if (window.localStorage) {
                localStorage.setItem('studentCoachPanelWidth', currentWidth); // Student specific key
                logStudentCoach(`Saved student panel width: ${currentWidth}px`);
            }
        };

        resizeHandle.addEventListener('mousedown', startResize);
        document.addEventListener('mousemove', doResize);
        document.addEventListener('mouseup', stopResize);
        resizeHandle.addEventListener('touchstart', (e) => { startResize({ preventDefault: () => e.preventDefault(), clientX: e.touches[0].clientX }); });
        document.addEventListener('touchmove', (e) => { if (isResizing) doResize({ clientX: e.touches[0].clientX }); });
        document.addEventListener('touchend', stopResize);

        const savedWidth = localStorage.getItem('studentCoachPanelWidth');
        if (savedWidth) {
            const width = parseInt(savedWidth, 10);
            const minW = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--student-coach-panel-min-width'), 10) || 280;
            const maxW = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--student-coach-panel-max-width'), 10) || 600;
            if (!isNaN(width) && width >= minW && width <= maxW) {
                document.documentElement.style.setProperty('--student-coach-panel-width', width + 'px');
                panel.style.width = width + 'px';
                currentWidth = width;
            }
        }
        logStudentCoach("Student panel resize handler added.");
    }

    function createAICoachPanel() {
        const panelId = STUDENT_COACH_LAUNCHER_CONFIG.aiCoachPanelId;
        if (document.getElementById(panelId)) {
            logStudentCoach("Student Coach panel already exists.");
            return;
        }
        const panel = document.createElement('div');
        panel.id = panelId;
        panel.className = 'ai-coach-panel'; // Generic class, specific styles via ID
        panel.innerHTML = `
            <div class="ai-coach-panel-header">
                <h3>My VESPA AI Coach</h3>
                <div class="ai-coach-text-controls">
                    <button class="ai-coach-text-control-btn" data-action="decrease" title="Decrease text size">A-</button>
                    <span class="ai-coach-text-size-indicator">100%</span>
                    <button class="ai-coach-text-control-btn" data-action="increase" title="Increase text size">A+</button>
                </div>
                <button class="ai-coach-close-btn" aria-label="Close My AI Coach Panel">&times;</button>
            </div>
            <div class="ai-coach-panel-content">
                <p>Activate My AI Coach to get personalized insights!</p>
            </div>
        `;
        document.body.appendChild(panel);
        logStudentCoach("Student Coach panel created.");
        setupTextSizeControls(panelId); // Pass panelId
    }
    
    function setupTextSizeControls(panelIdToQuery) { // Accept panelId
        const panel = document.getElementById(panelIdToQuery);
        if (!panel) return;
        
        let currentZoom = 100;
        const zoomStep = 10;
        const minZoom = 70;
        const maxZoom = 150;
        
        const savedZoom = localStorage.getItem('studentCoachTextZoom'); // Use unique storage key
        if (savedZoom) {
            currentZoom = parseInt(savedZoom, 10);
            applyTextZoom(currentZoom);
        }
        
        panel.addEventListener('click', (e) => {
            if (e.target.classList.contains('ai-coach-text-control-btn')) {
                const action = e.target.getAttribute('data-action');
                if (action === 'increase' && currentZoom < maxZoom) currentZoom += zoomStep;
                else if (action === 'decrease' && currentZoom > minZoom) currentZoom -= zoomStep;
                applyTextZoom(currentZoom);
            }
        });
        
        function applyTextZoom(zoom) {
            panel.style.fontSize = `${zoom * 14 / 100}px`;
            const indicator = panel.querySelector('.ai-coach-text-size-indicator');
            if (indicator) indicator.textContent = `${zoom}%`;
            // Also apply to modals if they exist for student coach
            // const modals = document.querySelectorAll('.student-coach-modal-content'); // Use specific class
            // modals.forEach(modal => modal.style.fontSize = `${zoom * 14 / 100}px`);
            localStorage.setItem('studentCoachTextZoom', zoom);
            logStudentCoach(`Text zoom set to ${zoom}%`);
        }
    }

    function addLauncherButton() {
        const targetElement = document.querySelector(STUDENT_COACH_LAUNCHER_CONFIG.elementSelector);
        if (!targetElement) {
            console.error(`[StudentCoachLauncher] Launcher button target '${STUDENT_COACH_LAUNCHER_CONFIG.elementSelector}' not found.`);
            return;
        }

        let buttonContainer = document.getElementById('studentCoachLauncherButtonContainer'); // Unique ID
        if (!buttonContainer) {
            buttonContainer = document.createElement('div');
            buttonContainer.id = 'studentCoachLauncherButtonContainer';
            targetElement.innerHTML = ''; 
            targetElement.appendChild(buttonContainer);
        }

        if (!buttonContainer.querySelector(`#${STUDENT_COACH_LAUNCHER_CONFIG.aiCoachToggleButtonId}`)) {
            buttonContainer.innerHTML = `
                <p>Ready to explore your VESPA profile with AI guidance?</p>
                <button id="${STUDENT_COACH_LAUNCHER_CONFIG.aiCoachToggleButtonId}" class="p-button p-component">🚀 Activate My AI Coach</button>
            `;
        }
    }

    async function getLoggedInStudentDataForCoach() {
        logStudentCoach("Attempting to get logged-in student data for coach...");
        const user = Knack.getUserAttributes();
        if (user && user.id) { 
            logStudentCoach("Logged-in Knack User (Object_3) ID:", user.id);
            // This user.id is the student's Object_3 record ID.
            // The backend will take this, find the email, then find the Object_10 record if needed.
            return user.id; 
        } else {
            logStudentCoach("Knack user attributes (Object_3 ID) not available.");
            const panelContent = document.querySelector(`#${STUDENT_COACH_LAUNCHER_CONFIG.aiCoachPanelId} .ai-coach-panel-content`);
            if (panelContent) {
                 panelContent.innerHTML = '<div class="ai-coach-section"><p style="color:orange;">Could not identify you. Please ensure you are logged in correctly.</p></div>';
            }
            stopLoadingMessageRotator(); // Stop rotator if user ID can't be found
            return null;
        }
    }

    async function fetchAICoachingData(studentObject3Id) { // Parameter is student's Object_3 ID
        const panelContent = document.querySelector(`#${STUDENT_COACH_LAUNCHER_CONFIG.aiCoachPanelId} .ai-coach-panel-content`);
        if (!panelContent) return;

        if (!studentObject3Id) { 
             logStudentCoach("fetchAICoachingData called with no studentObject3Id. Aborting.");
             if(panelContent && !panelContent.innerHTML.includes("color:red")) { // Avoid overwriting existing error
                panelContent.innerHTML = '<div class="ai-coach-section"><p style="color:orange;">Your user ID is missing, cannot fetch AI coaching data.</p></div>';
             }
             stopLoadingMessageRotator();
             return;
        }

        // ***** Start Critical Section for preventing duplicate fetches *****
        if (currentlyFetchingStudentKnackId === studentObject3Id) {
            logStudentCoach(`fetchAICoachingData: Already fetching data for student Object_3 ID ${studentObject3Id}. Aborting duplicate.`);
            return; // Already fetching for this ID, so exit.
        }
        // If there's an ongoing fetch for a *different* student, abort it.
        if (currentFetchAbortController) {
            logStudentCoach("fetchAICoachingData: Aborting previous fetch call for a different student.");
            currentFetchAbortController.abort();
        }
        currentFetchAbortController = new AbortController(); 
        const signal = currentFetchAbortController.signal;
        currentlyFetchingStudentKnackId = studentObject3Id; // Set the ID we are now fetching for
        // ***** End Critical Section *****

        startLoadingMessageRotator(panelContent, "student"); 

        try {
            logStudentCoach("Fetching Student AI Coaching Data for student_object3_id: " + studentObject3Id);
            const response = await fetch(COACHING_DATA_ENDPOINT, { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ student_object3_id: studentObject3Id }), // Send Object_3 ID
                signal: signal 
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: "An unknown error occurred."}));
                throw new Error(`API Error (${response.status}): ${errorData.error || errorData.message || response.statusText}`);
            }

            const data = await response.json();
            logStudentCoach("Student AI Coaching data received:", data);
            lastFetchedStudentKnackId = studentObject3Id; // Store the Object_3 ID
            renderAICoachData(data); 
            if (data && data.llm_generated_insights) { 
                currentLLMInsightsForChat = data.llm_generated_insights;
            } else {
                currentLLMInsightsForChat = null;
            }

        } catch (error) {
            if (error.name === 'AbortError') {
                logStudentCoach('Fetch aborted for student Object_3 ID: ' + studentObject3Id);
            } else {
                logStudentCoach("Error fetching Student AI Coaching data:", error);
                if (currentlyFetchingStudentKnackId === studentObject3Id && panelContent) { 
                    panelContent.innerHTML = `<div class="ai-coach-section"><p style="color:red;">Error loading your AI Coach insights: ${error.message}</p></div>`;
                }
            }
        } finally {
            stopLoadingMessageRotator();
            if (currentlyFetchingStudentKnackId === studentObject3Id) {
                currentlyFetchingStudentKnackId = null;
            }
            if (currentFetchAbortController && currentFetchAbortController.signal === signal) {
                currentFetchAbortController = null;
            }
        }
    }

    function renderAICoachData(data) {
        logStudentCoach("renderAICoachData (Student) CALLED. Input data:", data ? JSON.parse(JSON.stringify(data)) : 'No data (fetch likely failed)');
        const panelContent = document.querySelector(`#${STUDENT_COACH_LAUNCHER_CONFIG.aiCoachPanelId} .ai-coach-panel-content`);
        
        if (!panelContent) {
            logStudentCoach("CRITICAL ERROR in renderAICoachData: panelContent element not found. Cannot render UI.");
            return;
        }
        logStudentCoach("renderAICoachData: panelContent found. Clearing existing content.");
        panelContent.innerHTML = ''; // Clear previous content
        stopLoadingMessageRotator();

        let htmlShell = '';

        // --- AI Student Snapshot section --- 
        htmlShell += '<div class="ai-coach-section" id="studentCoachSnapshotSection">'; // Added ID for debugging
        htmlShell += '<h4>My AI Snapshot</h4>';
        if (data && data.llm_generated_insights && data.llm_generated_insights.student_overview_summary) {
            htmlShell += `<p>${data.llm_generated_insights.student_overview_summary}</p>`;
        } else if (data && data.student_name && data.student_name !== "N/A") {
            htmlShell += '<p>Your AI summary is being prepared. Please check back shortly!</p>';
        } else if (!data) { 
            htmlShell += '<p style="color:red;">Error loading your AI Coach insights: Failed to fetch</p>';
        } else {
            htmlShell += '<p>Welcome! Activate the coach to see your insights. (Content will load once backend is ready)</p>';
        }
        htmlShell += '</div>';
        logStudentCoach("renderAICoachData: HTML for snapshot built.", htmlShell);

        // --- Toggle Buttons for different insight sections --- 
        htmlShell += `
            <div class="student-coach-section-toggles ai-coach-section-toggles"> 
                <button id="aiCoachToggleVespaButton" class="p-button" aria-expanded="false">My VESPA Insights</button>
                <button id="aiCoachToggleAcademicButton" class="p-button" aria-expanded="false">My Academic Insights</button>
                <button id="aiCoachToggleQuestionButton" class="p-button" aria-expanded="false">My Questionnaire Insights</button>
            </div>
        `;
        logStudentCoach("renderAICoachData: HTML for toggle buttons appended.", htmlShell);

        // --- Content Divs for each toggle button - initially hidden --- 
        htmlShell += '<div id="studentCoachVespaProfileContainer" class="student-coach-details-section ai-coach-details-section" style="display: none;"><div class="ai-coach-section"><p>Your VESPA profile insights will appear here when available.</p></div></div>';
        htmlShell += '<div id="studentCoachAcademicProfileContainer" class="student-coach-details-section ai-coach-details-section" style="display: none;"><div class="ai-coach-section"><p>Your academic insights will appear here when available.</p></div></div>';
        htmlShell += '<div id="studentCoachQuestionAnalysisContainer" class="student-coach-details-section ai-coach-details-section" style="display: none;"><div class="ai-coach-section"><p>Your questionnaire analysis will appear here when available.</p></div></div>';
        logStudentCoach("renderAICoachData: HTML for content divs appended.", htmlShell);
        
        // --- Set the combined HTML to the panel content --- 
        logStudentCoach("renderAICoachData: About to set panelContent.innerHTML. Current panelContent outerHTML:", panelContent.outerHTML);
        panelContent.innerHTML = htmlShell;
        logStudentCoach("renderAICoachData: panelContent.innerHTML has been set. Checking for buttons in DOM...");
        
        // Verify buttons are in DOM immediately after setting innerHTML
        if (!document.getElementById('aiCoachToggleVespaButton')) {
            logStudentCoach("CRITICAL CHECK FAILED: aiCoachToggleVespaButton NOT in DOM after setting innerHTML.");
        } else {
            logStudentCoach("CHECK PASSED: aiCoachToggleVespaButton IS in DOM after setting innerHTML.");
        }

        // --- Add Chat Interface --- 
        // addChatInterface expects panelContent to already exist and be the parent.
        logStudentCoach("renderAICoachData: Calling addChatInterface.");
        addChatInterface(panelContent, (data && data.student_name) ? data.student_name : "My AI Coach");
        logStudentCoach("renderAICoachData: Returned from addChatInterface.");

        // --- Add event listeners for the new toggle buttons --- 
        const toggleButtonsConfig = [
            { buttonId: 'aiCoachToggleVespaButton',          containerId: 'studentCoachVespaProfileContainer',       defaultText: 'My VESPA Insights' },
            { buttonId: 'aiCoachToggleAcademicButton',       containerId: 'studentCoachAcademicProfileContainer',    defaultText: 'My Academic Insights' },
            { buttonId: 'aiCoachToggleQuestionButton',       containerId: 'studentCoachQuestionAnalysisContainer', defaultText: 'My Questionnaire Insights' }
        ];

        toggleButtonsConfig.forEach(config => {
            const button = document.getElementById(config.buttonId);
            const container = document.getElementById(config.containerId);

            if (button && container) {
                logStudentCoach(`Setting up toggle for: ${config.buttonId}`);
                button.addEventListener('click', () => {
                    logStudentCoach(`Toggle button clicked: ${config.buttonId}`);
                    const isVisible = container.style.display === 'block';
                    
                    document.querySelectorAll('.student-coach-details-section').forEach(section => {
                        section.style.display = 'none';
                    });
                    
                    toggleButtonsConfig.forEach(btnConf => {
                        const btn = document.getElementById(btnConf.buttonId);
                        if (btn && btn.id !== config.buttonId) { 
                            btn.textContent = btnConf.defaultText;
                            btn.setAttribute('aria-expanded', 'false');
                        }
                    });

                    if (isVisible) {
                        button.textContent = config.defaultText;
                        button.setAttribute('aria-expanded', 'false');
                    } else {
                        container.style.display = 'block';
                        button.textContent = `Hide ${config.defaultText.replace('My ', '')}`;
                        button.setAttribute('aria-expanded', 'true');
                    }
                });
            } else {
                logStudentCoach(`Error setting up toggle: Button '${config.buttonId}' or Container '${config.containerId}' not found after UI setup.`);
            }
        });
        logStudentCoach("Student AI Coach UI rendered and event listeners attached (or attempted). Final panelContent innerHTML length: ", panelContent.innerHTML.length);

        // Populate dynamic content sections if data is available
        if (data && data.student_name && data.student_name !== "N/A") {
            ensureChartJsLoaded(() => { // Ensure Chart.js is loaded before trying to render charts
                if (data.vespa_profile) { // Assuming vespa_profile contains data for the chart
                    renderVespaComparisonChart(data.vespa_profile, data.school_vespa_averages); // New function to render chart
                }
                // Placeholder for academic chart/scales
                const academicContainer = document.getElementById('studentCoachAcademicProfileContainer');
                if (academicContainer && data.academic_profile_summary) {
                    let academicHtml = '';
                    const studentFirstName = data.student_name ? data.student_name.split(' ')[0] : "My";
                    if (data.academic_megs) { // Display overall MEGs if available
                        academicHtml += '<h5>Overall Academic Benchmarks (MEGs)</h5>';
                        academicHtml += `<p>Prior Attainment Score: ${data.academic_megs.prior_attainment_score || 'N/A'}</p>`;
                        // Add more MEG details if relevant for students
                    }
                    academicHtml += '<h5>My Subject Benchmarks</h5>';
                    if (data.academic_profile_summary && data.academic_profile_summary.length > 0 && !(data.academic_profile_summary.length === 1 && data.academic_profile_summary[0].subject.includes("not found"))){
                        data.academic_profile_summary.forEach((subject, index) => {
                            if (subject && subject.subject && !subject.subject.includes("not found")) {
                                academicHtml += `<div class="subject-benchmark-item"><h5>${subject.subject}</h5>`;
                                // Render scale if points are available
                                if (typeof subject.currentGradePoints === 'number' && typeof subject.standardMegPoints === 'number') {
                                   academicHtml += createSubjectBenchmarkScale(subject, index, studentFirstName);
                                } else {
                                   academicHtml += '<p><em>Benchmark scale data not available for this subject.</em></p>';
                                }
                                academicHtml += '</div>';
                            }
                        });
                    } else {
                         academicHtml += '<p>My detailed academic subject benchmarks are not yet available.</p>';
                    }
                    academicContainer.innerHTML = academicHtml;
                }

                // Placeholder for questionnaire chart/analysis
                const questionnaireContainer = document.getElementById('studentCoachQuestionAnalysisContainer');
                if (questionnaireContainer && data.all_scored_questionnaire_statements) {
                    renderQuestionnaireDistributionChart(data.all_scored_questionnaire_statements); // New function
                    if (data.llm_generated_insights && data.llm_generated_insights.questionnaire_interpretation_and_reflection_summary) {
                         questionnaireContainer.innerHTML += `<div class="ai-coach-section"><h5>Reflections on My Questionnaire</h5><p>${data.llm_generated_insights.questionnaire_interpretation_and_reflection_summary}</p></div>`;
                    } else {
                        // questionnaireContainer.innerHTML += '<div class="ai-coach-section"><p>Further insights on your questionnaire will appear here.</p></div>';
                    }
                } else if (questionnaireContainer) {
                     questionnaireContainer.innerHTML = '<div class="ai-coach-section" id="studentCoachQuestionnaireChartPlaceholder"><div id="studentQuestionnaireDistributionChartContainer" style="height: 250px; margin-bottom: 15px; background: #eee; display:flex; align-items:center; justify-content:center;"><p>My Questionnaire Insights Area</p></div><p>My questionnaire analysis will appear here when available.</p></div>';
                }
            });
        } else { // Data not fully available, ensure placeholders are in the content divs
            const vespaContainer = document.getElementById('studentCoachVespaProfileContainer');
            if (vespaContainer) vespaContainer.innerHTML = '<div class="ai-coach-section" id="studentCoachVespaChartPlaceholder"><div id="studentVespaComparisonChartContainer" style="height: 250px; margin-bottom: 15px; background: #eee; display:flex; align-items:center; justify-content:center;"><p>My VESPA Chart Area</p></div><p>My VESPA profile insights will appear here.</p></div>';
            
            const academicContainer = document.getElementById('studentCoachAcademicProfileContainer');
            if (academicContainer) academicContainer.innerHTML = '<div class="ai-coach-section"><p>My academic insights and benchmarks will appear here.</p></div>';

            const questionnaireContainer = document.getElementById('studentCoachQuestionAnalysisContainer');
            if (questionnaireContainer) questionnaireContainer.innerHTML = '<div class="ai-coach-section" id="studentCoachQuestionnaireChartPlaceholder"><div id="studentQuestionnaireDistributionChartContainer" style="height: 250px; margin-bottom: 15px; background: #eee; display:flex; align-items:center; justify-content:center;"><p>My Questionnaire Insights Area</p></div><p>My questionnaire analysis will appear here.</p></div>';
        }
    }
    
    // Note: renderVespaComparisonChart, createSubjectBenchmarkScale, renderQuestionnaireDistributionChart
    // might be reused if students see similar charts, or adapted/removed if not.

    async function refreshAICoachData() {
        const panel = document.getElementById(STUDENT_COACH_LAUNCHER_CONFIG.aiCoachPanelId);
        const panelContent = panel ? panel.querySelector('.ai-coach-panel-content') : null;
        if (!panel || !panelContent) return;

        if (coachDataCurrentlyRefreshing) {
            logStudentCoach("refreshAICoachData: Already refreshing. Skipping duplicate call.");
            return;
        }

        if (!document.body.classList.contains('ai-coach-active')) { // Ensure classname is consistent or namespaced
            logStudentCoach("Student AI Coach panel is not active, refresh not needed.");
            return;
        }

        logStudentCoach("refreshAICoachData (Student): Attempting to get student data...");
        const studentObject3Id = await getLoggedInStudentDataForCoach(); 
        
        coachDataCurrentlyRefreshing = true; // Set flag

        try {
            if (studentObject3Id) {
                if (studentObject3Id !== lastFetchedStudentKnackId || lastFetchedStudentKnackId === null) {
                    logStudentCoach(`refreshAICoachData (Student): ID ${studentObject3Id}. Last fetched: ${lastFetchedStudentKnackId}. Fetching data.`);
                    // Only set loader here if not already fetching this specific ID and no existing loader/error message
                    if (currentlyFetchingStudentKnackId !== studentObject3Id && 
                        panelContent.innerHTML.indexOf('loader') === -1 && 
                        !panelContent.innerHTML.includes("color:red") && 
                        !panelContent.innerHTML.includes("color:orange")) {
                        panelContent.innerHTML = '<div class="loader"></div><p style="text-align:center;">Loading your AI Coach...</p>';
                    }
                    await fetchAICoachingData(studentObject3Id); // Await this call
                } else {
                    logStudentCoach(`refreshAICoachData (Student): ID ${studentObject3Id} is same as last fetched. Data likely current.`);
                    if (panelContent && panelContent.querySelector('.loader') && !panelContent.querySelector('.ai-coach-section')) {
                        panelContent.innerHTML = '<p>Activate My AI Coach to get personalized insights!</p>';
                    }
                }
            } else {
                logStudentCoach("refreshAICoachData (Student): Student Object_3 ID not available.");
                lastFetchedStudentKnackId = null; 
                observerLastProcessedStudentKnackId = null; 
                // currentlyFetchingStudentKnackId should be cleared by fetchAICoachingData's finally block if a fetch was attempted
                if (panelContent && panelContent.innerHTML.includes('loader') && !panelContent.innerHTML.includes('ai-coach-section')){
                     panelContent.innerHTML = '<div class="ai-coach-section"><p style="color:orange;">Could not load your profile for the AI Coach. Please ensure you are logged in and on the correct page.</p></div>';
                }
            }
        } finally {
            coachDataCurrentlyRefreshing = false; // Clear flag
        }
    }

    async function toggleAICoachPanel(show) { 
        const panel = document.getElementById(STUDENT_COACH_LAUNCHER_CONFIG.aiCoachPanelId);
        const toggleButton = document.getElementById(STUDENT_COACH_LAUNCHER_CONFIG.aiCoachToggleButtonId);
        const panelContent = panel ? panel.querySelector('.ai-coach-panel-content') : null;

        if (show) {
            document.body.classList.add('ai-coach-active'); // Use a generic or namespaced class
            if (toggleButton) toggleButton.textContent = '🙈 Hide My AI Coach';
            logStudentCoach("Student AI Coach panel activated.");
            await refreshAICoachData(); 
        } else {
            document.body.classList.remove('ai-coach-active');
            if (toggleButton) toggleButton.textContent = '🚀 Activate My AI Coach';
            if (panelContent) panelContent.innerHTML = '<p>Activate My AI Coach to get personalized insights!</p>';
            logStudentCoach("Student AI Coach panel deactivated.");
            stopLoadingMessageRotator();
            lastFetchedStudentKnackId = null; 
            observerLastProcessedStudentKnackId = null; 
            currentlyFetchingStudentKnackId = null;
            if (currentFetchAbortController) { 
                currentFetchAbortController.abort();
                currentFetchAbortController = null;
            }
        }
    }

    function setupEventListeners() {
        logStudentCoach("StudentCoachLauncher: setupEventListeners START");
        if (eventListenersAttached) {
            logStudentCoach("Student Coach event listeners already attached. Skipping.");
            return;
        }
        
        document.body.addEventListener('click', function(event) {
            if (!STUDENT_COACH_LAUNCHER_CONFIG) return; 

            const toggleButtonId = STUDENT_COACH_LAUNCHER_CONFIG.aiCoachToggleButtonId;
            const panelId = STUDENT_COACH_LAUNCHER_CONFIG.aiCoachPanelId;
            
            if (event.target && event.target.id === toggleButtonId) {
                const isActive = document.body.classList.contains('ai-coach-active');
                toggleAICoachPanel(!isActive);
            }
            
            const panel = document.getElementById(panelId);
            if (panel && event.target && event.target.classList.contains('ai-coach-close-btn') && panel.contains(event.target)) {
                toggleAICoachPanel(false);
            }
        });
        eventListenersAttached = true;
        logStudentCoach("Student Coach event listeners set up.");
    }
    
    // --- CHAT INTERFACE (Adapted for Student) ---
    function addChatInterface(panelContentElement, chatWithTitle) {
        logStudentCoach("Adding student chat interface with title: " + chatWithTitle);
        const oldChatContainer = document.getElementById('studentCoachChatContainer'); 
        if (oldChatContainer) oldChatContainer.remove();

        const chatContainer = document.createElement('div');
        chatContainer.id = 'studentCoachChatContainer'; 
        chatContainer.className = 'ai-coach-section'; // Re-use class for consistent section styling
        chatContainer.style.marginTop = '20px';
        // Make chat container flexible to fill available space in the panel
        chatContainer.style.display = 'flex';
        chatContainer.style.flexDirection = 'column';
        chatContainer.style.flexGrow = '1'; 
        chatContainer.style.minHeight = '0'; // Important for flex children to not overflow


        chatContainer.innerHTML = `
            <h4>Chat with ${chatWithTitle}</h4>
            <div id="studentCoachChatStats" style="font-size: 0.85em; color: #666; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                <span id="studentCoachChatCount">Loading chat...</span>
                <div style="display: flex; gap: 10px;">
                    <span id="studentCoachLikedCount" style="color: #e74c3c; display:none;"> <!-- Hidden for now, needs backend -->
                        ❤️ <span id="studentLikedCountNumber">0</span> liked
                    </span>
                    <button id="studentCoachClearOldChatsBtn" class="p-button p-component p-button-sm p-button-text" style="display:none;">Clear Old Chats</button> <!-- Hidden for now, needs backend -->
                </div>
            </div>
            <div id="studentCoachChatDisplay" style="flex-grow:1; min-height: 200px; max-height: 400px; overflow-y: auto; border: 1px solid #ccc; padding: 10px; margin-bottom:10px; background:#fff;">
                <p class="ai-chat-message ai-chat-message-bot"><em>${chatWithTitle}:</em> Hello! I'm here to help you explore your VESPA profile. What's on your mind?</p>
            </div>
            <div style="margin: 10px 0;">
                 <button id="studentCoachProblemButton" class="p-button p-component" style="width:100%; font-size:0.9em;">🤔 What area to focus on?</button>
            </div>
            <div style="display: flex; gap: 10px; margin-top:auto;"> <!-- margin-top:auto to push to bottom of flex container -->
                <input type="text" id="studentCoachChatInput" placeholder="Ask me anything about VESPA..." style="flex-grow:1; padding:10px; border-radius:4px; border:1px solid #ccc;">
                <button id="studentCoachChatSendButton" class="p-button p-component">Send</button>
            </div>
            <div id="studentCoachChatThinkingIndicator" class="thinking-pulse" style="display: none; text-align:center; margin-top:5px; color:#3498db;">${chatWithTitle} is thinking<span class="thinking-dots"><span>.</span><span>.</span><span>.</span></span></div>
        `;
        panelContentElement.appendChild(chatContainer);

        const chatInput = document.getElementById('studentCoachChatInput');
        const chatSendButton = document.getElementById('studentCoachChatSendButton');
        const chatDisplay = document.getElementById('studentCoachChatDisplay');
        const thinkingIndicator = document.getElementById('studentCoachChatThinkingIndicator');
        const problemButton = document.getElementById('studentCoachProblemButton');
        const chatCountElement = document.getElementById('studentCoachChatCount');
        // const likedCountNumberElement = document.getElementById('studentLikedCountNumber'); // For future use with backend
        // const clearOldChatsBtn = document.getElementById('studentCoachClearOldChatsBtn'); // For future use with backend
        
        if (problemButton) {
            problemButton.addEventListener('click', () => {
                showProblemSelectorModal(studentCommonProblems, chatInput); // studentCommonProblems defined elsewhere
            });
        }
        
        // loadStudentChatHistory(); // Placeholder: This will require a new backend endpoint

        async function sendChatMessage() {
            const messageText = chatInput.value.trim();
            // lastFetchedStudentKnackId now holds student's Object_3 ID
            if (messageText === '' || !lastFetchedStudentKnackId) return; 

            const userMessageElement = document.createElement('p');
            userMessageElement.className = 'ai-chat-message ai-chat-message-user';
            userMessageElement.textContent = `You: ${messageText}`;
            chatDisplay.appendChild(userMessageElement);
            const originalInput = chatInput.value;
            chatInput.value = '';
            chatDisplay.scrollTop = chatDisplay.scrollHeight;
            
            chatSendButton.disabled = true;
            chatInput.disabled = true;
            thinkingIndicator.style.display = 'block';

            const chatHistory = Array.from(chatDisplay.querySelectorAll('.ai-chat-message'))
                .filter(el => el !== userMessageElement && el.id !== 'studentCoachTempInlineThinkingMessage') // Exclude current input and any temporary thinking message
                .map(el => ({
                    role: el.classList.contains('ai-chat-message-bot') ? 'assistant' : 'user',
                    content: el.textContent.replace(/^(My AI Coach:|You:)\s*/, '') // Strip prefix for history
                }));
            
            // Add inline thinking message (similar to tutor coach)
            const inlineThinkingMessage = document.createElement('div');
            inlineThinkingMessage.id = 'studentCoachTempInlineThinkingMessage'; // Student-specific ID
            inlineThinkingMessage.className = 'ai-chat-message ai-chat-message-bot'; // Style like a bot message
            inlineThinkingMessage.style.opacity = '0.7'; // Make it look less prominent
            inlineThinkingMessage.innerHTML = `<em>${chatWithTitle}:</em> 🤔 Thinking...`;
            chatDisplay.appendChild(inlineThinkingMessage);
            chatDisplay.scrollTop = chatDisplay.scrollHeight; // Scroll to show it
            
            try {
                // Ensure CHAT_TURN_ENDPOINT points to the student coach backend
                const response = await fetch(CHAT_TURN_ENDPOINT, { // Uses STUDENT_COACH_API_BASE_URL implicitly
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        student_knack_id: lastFetchedStudentKnackId, // Send student's Object_3 ID (or other unique ID)
                        chat_history: chatHistory,
                        current_user_message: originalInput, 
                        context_type: 'student', // Crucial for backend to use student-specific prompts
                        initial_ai_context: currentLLMInsightsForChat // Send any existing LLM insights for context
                    }),
                });

                if (inlineThinkingMessage) inlineThinkingMessage.remove(); // Remove the temporary thinking message

                if (!response.ok) throw new Error(`Chat API Error: ${response.statusText} (${response.status})`);
                const data = await response.json();

                const botMessageElement = document.createElement('p');
                botMessageElement.className = 'ai-chat-message ai-chat-message-bot';
                botMessageElement.setAttribute('data-role', 'assistant'); // For potential history reconstruction
                botMessageElement.style.position = 'relative'; // For potential like button positioning
                
                // Process the AI response to make activity references clickable (like tutor coach)
                let processedResponse = data.ai_response;
                const suggestedActivities = data.suggested_activities_in_chat || []; // Expect this from student backend

                // Create a map of activity names to their data for easy lookup
                // const activityMap = {};
                // suggestedActivities.forEach(activity => { activityMap[activity.name] = activity; });
                
                // Replace activity mentions with clickable links (similar logic to tutor coach)
                suggestedActivities.forEach(activity => {
                    // Simpler regex for student version for now, can be refined
                    const activityPattern = new RegExp(activity.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'); // Escape name for regex
                    processedResponse = processedResponse.replace(activityPattern, 
                        // Using student-coach-activity-link class for styling
                        `<a href="#" class="student-coach-activity-link" data-activity='${JSON.stringify(activity).replace(/'/g, '&apos;')}'>${activity.name}</a>`
                    );
                });
                botMessageElement.innerHTML = `<em>${chatWithTitle}:</em> ${processedResponse}`;
                chatDisplay.appendChild(botMessageElement);

                // Add like button if backend provides ID (placeholder for now)
                if (data.ai_message_knack_id) {
                    // const likeButton = createLikeButton(data.ai_message_knack_id, false, 'student'); // Future function
                    // botMessageElement.appendChild(likeButton);
                }
                
                // Add click handlers to activity links
                const activityLinks = botMessageElement.querySelectorAll('.student-coach-activity-link');
                activityLinks.forEach(link => {
                    link.addEventListener('click', (e) => {
                        e.preventDefault();
                        try {
                            const activityData = JSON.parse(link.getAttribute('data-activity'));
                            showActivityModal(activityData); // Uses the newly added function
                        } catch (error) { logStudentCoach("Error parsing activity data for modal:", error); }
                    });
                });
                 // If there are suggested activities, also add a quick links section (like tutor coach)
                 if (suggestedActivities.length > 0) {
                    const quickLinksElement = document.createElement('div');
                    quickLinksElement.style.cssText = `margin-top: 10px; padding: 10px; background: #f0f8ff; border-radius: 5px; border-left: 3px solid #3498db;`;
                    quickLinksElement.innerHTML = '<strong style="color: #2c3e50; font-size: 0.9em;">Explore these activities:</strong>';
                    const linksList = document.createElement('ul');
                    linksList.style.cssText = 'margin: 5px 0 0 0; padding-left: 20px;';
                    suggestedActivities.forEach(activity => {
                        const listItem = document.createElement('li');
                        // Style link like other activity links
                        listItem.innerHTML = `<a href="#" class="student-coach-activity-link" data-activity='${JSON.stringify(activity).replace(/'/g, '&apos;')}'>${activity.name} <span style="color:#666;">(${activity.vespa_element})</span></a>`;
                        linksList.appendChild(listItem);
                    });
                    quickLinksElement.appendChild(linksList);
                    chatDisplay.appendChild(quickLinksElement);
                    // Re-attach listeners for these new links as they are added after initial scan
                    quickLinksElement.querySelectorAll('.student-coach-activity-link').forEach(link => {
                        link.addEventListener('click', (e) => {
                            e.preventDefault();
                            try {
                                const activityData = JSON.parse(link.getAttribute('data-activity'));
                                showActivityModal(activityData);
                            } catch (err) { logStudentCoach("Error parsing activity from quicklink", err); }
                        });
                    });
                }


            } catch (error) {
                logStudentCoach("Error sending student chat message:", error);
                const errorMsgEl = document.createElement('p');
                errorMsgEl.className = 'ai-chat-message ai-chat-message-bot';
                errorMsgEl.innerHTML = `<em>${chatWithTitle}:</em> Sorry, I had trouble responding. ${error.message}`;
                chatDisplay.appendChild(errorMsgEl);
            } finally {
                thinkingIndicator.style.display = 'none';
                chatSendButton.disabled = false;
                chatInput.disabled = false;
                chatInput.focus();
                chatDisplay.scrollTop = chatDisplay.scrollHeight;
            }
        }

        if (chatSendButton) chatSendButton.addEventListener('click', sendChatMessage);
        if (chatInput) chatInput.addEventListener('keypress', e => e.key === 'Enter' && sendChatMessage());
        logStudentCoach("Student chat interface added.");
    }

    // Placeholder for student-specific loading messages if different from tutor's
    function startLoadingMessageRotator(panelContentElement, context = "tutor") {
        if (loadingMessageIntervalId) clearInterval(loadingMessageIntervalId);
        if (!panelContentElement) return;

        let messages;
        if (context === "student") {
            messages = [
                "Getting your AI Coach ready...",
                "Analyzing your VESPA profile for insights...",
                "Just a moment, preparing your personalized coaching experience!"
            ];
        } else {
            messages = [ // Tutor messages
                "Please wait while I analyse the student data...",
                "While I complete this please read through the report on the left.....",
                "Once my chat field has opened please ask me any questions about the student or report...",
                "Or add a 'specific Problem' and I can help you find a solution." // Changed to single quotes
            ];
        }
        let messageIndex = 0;

        const updateMessage = () => {
            if (panelContentElement && panelContentElement.querySelector('.loader')) { // Only update if loader is still there
                const pTag = panelContentElement.querySelector('p');
                if (pTag) pTag.textContent = messages[messageIndex];
                else panelContentElement.innerHTML = `<div class="loader"></div><p style="text-align:center; min-height: 40px;">${messages[messageIndex]}</p>`;
                messageIndex = (messageIndex + 1) % messages.length;
            } else {
                stopLoadingMessageRotator(); // Stop if loader is gone (data rendered or error)
            }
        };
        updateMessage(); // Initial message
        loadingMessageIntervalId = setInterval(updateMessage, 3500);
        logStudentCoach(`Started loading message rotator for ${context}.`);
    }

    function stopLoadingMessageRotator() {
        if (loadingMessageIntervalId) {
            clearInterval(loadingMessageIntervalId);
            loadingMessageIntervalId = null;
            logStudentCoach("Stopped loading message rotator.");
        }
    }

    // Expose the initializer function to be called by the Knack Bridge
    window.initializeStudentCoachLauncher = initializeStudentCoachLauncher;

    // --- NEW: renderVespaComparisonChart (adapted from tutor) ---
    function renderVespaComparisonChart(studentVespaProfile, schoolVespaAverages) {
        const chartContainerId = 'studentVespaComparisonChartContainer'; // Student specific ID for the div
        const chartCanvasId = 'studentVespaVsSchoolChart'; // Student specific ID for the canvas
        const chartContainer = document.getElementById(chartContainerId);

        if (!chartContainer) {
            logStudentCoach(`VESPA comparison chart container #${chartContainerId} not found.`);
            return;
        }
        // Ensure Chart.js is loaded (can be called here or earlier via ensureChartJsLoaded)
        if (typeof Chart === 'undefined') {
            logStudentCoach("Chart.js is not loaded. Cannot render VESPA comparison chart.");
            chartContainer.innerHTML = '<p style="color:red; text-align:center;">Chart library not loaded.</p>';
            return;
        }
        // Destroy previous chart instance if it exists
        if (vespaChartInstance) {
            vespaChartInstance.destroy();
            vespaChartInstance = null;
        }
        
        // Ensure chartContainer is empty before creating a new canvas
        chartContainer.innerHTML = `<canvas id="${chartCanvasId}"></canvas>`;
        const ctx = document.getElementById(chartCanvasId).getContext('2d');

        if (!studentVespaProfile) {
            logStudentCoach("Student VESPA profile data is missing. Cannot render chart.");
            chartContainer.innerHTML = '<p style="text-align:center;">Your VESPA data not available for chart.</p>';
            return;
        }

        const labels = ['Vision', 'Effort', 'Systems', 'Practice', 'Attitude'];
        const studentScores = labels.map(label => {
            // Assuming studentVespaProfile structure matches tutor's data.llm_generated_insights.vespa_profile or data.vespa_profile
            // For student, it might be data.vespa_profile directly from their own record.
            const elementData = studentVespaProfile[label]; 
            return elementData && elementData.score_1_to_10 !== undefined && elementData.score_1_to_10 !== "N/A" ? parseFloat(elementData.score_1_to_10) : 0;
        });

        const datasets = [
            {
                label: 'My Scores', // Student-facing label
                data: studentScores,
                backgroundColor: 'rgba(54, 162, 235, 0.6)', // Blue
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }
        ];
        let chartTitle = 'My VESPA Scores';

        if (schoolVespaAverages) { // Students might also see school averages for context
            const schoolScores = labels.map(label => {
                return schoolVespaAverages[label] !== undefined && schoolVespaAverages[label] !== "N/A" ? parseFloat(schoolVespaAverages[label]) : 0;
            });
            datasets.push({
                label: 'School Average',
                data: schoolScores,
                backgroundColor: 'rgba(255, 159, 64, 0.6)', // Orange
                borderColor: 'rgba(255, 159, 64, 1)',
                borderWidth: 1
            });
            chartTitle = 'My VESPA Scores vs. School Average';
        }

        try {
            vespaChartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: chartTitle,
                            font: { size: 16, weight: 'bold' },
                            padding: { top: 10, bottom: 20 }
                        },
                        legend: {
                            position: 'top',
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 10,
                            title: {
                                display: true,
                                text: 'Score (1-10)'
                            }
                        }
                    }
                }
            });
            logStudentCoach("Student VESPA comparison chart rendered successfully.");
        } catch (error) {
            console.error("[StudentCoachLauncher] Error rendering Chart.js chart:", error);
            chartContainer.innerHTML = '<p style="color:red; text-align:center;">Error rendering chart.</p>';
        }
    }

    // --- NEW: getMaxPointsForScale (from tutor) ---
    // This function determines the maximum value for the y-axis of a benchmark scale.
    // It needs to be adapted if student qualification types or point systems differ.
    function getMaxPointsForScale(subject) {
        // This function is mostly generic, but might need student-specific qualification types if they differ
        const normalizedType = subject.normalized_qualification_type; // Assumes backend provides this
        let maxPoints = 140; // Default for A-Level like scales

        const allPoints = [
            typeof subject.currentGradePoints === 'number' ? subject.currentGradePoints : 0,
            typeof subject.standardMegPoints === 'number' ? subject.standardMegPoints : 0 // Assuming student data might have a standard MEG
        ];

        // Add points from different MEG percentiles if they exist (mainly for A-Level type benchmarks)
        if (normalizedType === "A Level") { // Or whatever equivalent for students
            if (typeof subject.megPoints60 === 'number') allPoints.push(subject.megPoints60);
            if (typeof subject.megPoints90 === 'number') allPoints.push(subject.megPoints90);
            if (typeof subject.megPoints100 === 'number') allPoints.push(subject.megPoints100);
        }
        // Example for other qualification types seen in tutor version
        if (normalizedType === "AS Level") maxPoints = 70;
        else if (normalizedType === "IB HL") maxPoints = 140; // Max points for IB HL is usually 7 per subject * 20 for UCAS tariff = 140 (example)
        // ... other qualification types if applicable to students
        
        const highestSubjectPoint = Math.max(0, ...allPoints.filter(p => typeof p === 'number'));
        if (highestSubjectPoint > maxPoints) {
            // Adjust maxPoints dynamically if a subject score exceeds the default max for that type
            return highestSubjectPoint + Math.max(20, Math.floor(highestSubjectPoint * 0.1)); 
        }
        return maxPoints;
    }

    // --- NEW: createSubjectBenchmarkScale (adapted from tutor) ---
    // This function creates HTML for a subject's benchmark scale.
    // The studentFirstName parameter is used for labeling the student's current grade.
    function createSubjectBenchmarkScale(subject, subjectIndex, studentFirstName) {
        if (!subject || typeof subject.currentGradePoints !== 'number' || typeof subject.standardMegPoints !== 'number') {
            return '<p style="font-size:0.8em; color: #777;">My benchmark scale cannot be displayed due to missing point data.</p>';
        }

        const maxScalePoints = getMaxPointsForScale(subject);
        if (maxScalePoints === 0) return '<p style="font-size:0.8em; color: #777;">Max scale points is zero, cannot render scale.</p>';

        let scaleHtml = `<div class="subject-benchmark-scale-container" id="student-scale-container-${subjectIndex}">
            <div class="scale-labels"><span>0 pts</span><span>${maxScalePoints} pts</span></div>
            <div class="scale-bar-wrapper"><div class="scale-bar">`;

        // Inner helper to create markers on the scale
        const createMarker = (points, grade, type, label, percentile = null, specificClass = '') => {
            if (typeof points !== 'number') return '';
            const percentage = (points / maxScalePoints) * 100;
            let titleText = `${type}: ${grade || 'N/A'} (${points} pts)`;
            if (percentile) titleText += ` - ${percentile}`;
            const leftPosition = Math.max(0, Math.min(percentage, 100));
            const markerClass = type.toLowerCase().replace(/ /g, '-') + '-marker' + (specificClass ? ' ' + specificClass : '');
            let displayLabel = label;
            // Logic for A-Level percentile labels (Top40%, Top25%, etc.) copied from tutor
            // This might need simplification or adjustment based on what benchmarks students see.
            if (specificClass === 'p60') { displayLabel = 'Top40%';} // Example
            else if (label === 'MEG' && subject.normalized_qualification_type === 'A Level') { displayLabel = 'Top25%';} // Example
            else if (specificClass === 'p90') { displayLabel = 'Top10%';} // Example
            else if (specificClass === 'p100') { displayLabel = 'Top1%';} // Example
            else if (label === 'CG') { displayLabel = studentFirstName || "My Grade"; }

            const isPercentileMarker = ['p60', 'p90', 'p100'].includes(specificClass) || (label === 'MEG' && subject.normalized_qualification_type === 'A Level');
            const finalMarkerClass = `${markerClass} ${isPercentileMarker ? 'percentile-line-marker' : 'current-grade-dot-marker'}`;
            
            return `<div class="scale-marker ${finalMarkerClass}" style="left: ${leftPosition}%;\" title="${titleText}">
                        <span class="marker-label">${displayLabel}</span>
                    </div>`;
        };
        
        // Add marker for student's current grade
        scaleHtml += createMarker(subject.currentGradePoints, subject.currentGrade, "My Current Grade", "CG", null, 'cg-student'); 
        // Add marker for standard MEG (if applicable to students)
        scaleHtml += createMarker(subject.standardMegPoints, subject.standard_meg, "Standard Expected Grade", "MEG");

        // Add other percentile markers if students see these (e.g., for A-Levels)
        if (subject.normalized_qualification_type === "A Level") { // Assuming students might see A-Level benchmarks too
            if (typeof subject.megPoints60 === 'number') scaleHtml += createMarker(subject.megPoints60, null, "A-Level MEG", "P60", "60th Percentile", "p60");
            // Standard MEG (75th) for A-Level is already covered by the "MEG" marker above with displayLabel logic
            if (typeof subject.megPoints90 === 'number') scaleHtml += createMarker(subject.megPoints90, null, "A-Level MEG", "P90", "90th Percentile", "p90");
            if (typeof subject.megPoints100 === 'number') scaleHtml += createMarker(subject.megPoints100, null, "A-Level MEG", "P100", "100th Percentile", "p100");
        }
        scaleHtml += `</div></div></div>`;
        return scaleHtml;
    }
    
    // --- NEW: renderQuestionnaireDistributionChart (adapted from tutor) ---
    // This function renders a pie chart for questionnaire response distribution.
    function renderQuestionnaireDistributionChart(allStatements) {
        // Student-specific IDs for chart container and canvas
        const chartContainerId = 'studentQuestionnaireDistributionChartContainer'; 
        const chartCanvasId = 'studentQuestionnaireDistributionPieChartCanvas'; 
        const chartContainer = document.getElementById(chartContainerId);

        if (!chartContainer) {
            logStudentCoach(`Questionnaire chart container #${chartContainerId} not found.`);
            return;
        }
        if (typeof Chart === 'undefined') { // Check if Chart.js is loaded
            logStudentCoach("Chart.js is not loaded. Cannot render questionnaire chart.");
            chartContainer.innerHTML = '<p style="color:red; text-align:center;">Chart library not loaded.</p>';
            return;
        }
        if (questionnairePieChartInstance) { // Use the student-specific chart instance
            questionnairePieChartInstance.destroy();
            questionnairePieChartInstance = null;
        }

        chartContainer.innerHTML = `<canvas id="${chartCanvasId}"></canvas>`;
        const ctx = document.getElementById(chartCanvasId).getContext('2d');

        if (!allStatements || allStatements.length === 0) {
            logStudentCoach("No statements data for questionnaire pie chart.");
            chartContainer.innerHTML = '<p style="text-align:center;">Your questionnaire data not available for chart.</p>';
            return;
        }

        // Process statements to count responses (1-5)
        const responseCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        allStatements.forEach(stmt => { // Assuming 'stmt.score' is available from backend for student
            const score = stmt.score;
            if (score >= 1 && score <= 5) responseCounts[score]++;
        });

        const chartData = {
            labels: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'], // Standard labels
            datasets: [{
                label: 'My Questionnaire Responses', // Student-facing label
                data: Object.values(responseCounts),
                backgroundColor: [ // Standard colors, can be themed
                    'rgba(255, 99, 132, 0.7)', 'rgba(255, 159, 64, 0.7)', 
                    'rgba(255, 205, 86, 0.7)', 'rgba(75, 192, 192, 0.7)', 
                    'rgba(54, 162, 235, 0.7)'
                ],
                borderColor: ['rgba(255, 99, 132, 1)', 'rgba(255, 159, 64, 1)', 'rgba(255, 205, 86, 1)', 'rgba(75, 192, 192, 1)', 'rgba(54, 162, 235, 1)'],
                borderWidth: 1
            }]
        };
        try {
            questionnairePieChartInstance = new Chart(ctx, { // Use student-specific instance
                type: 'pie', 
                data: chartData,
                options: { // Options can be adapted from tutor's or simplified
                    responsive: true, maintainAspectRatio: false,
                    plugins: {
                        title: { display: true, text: 'Distribution of My Questionnaire Responses', font: { size: 14, weight: 'bold' }, padding: { top: 10, bottom: 15 } },
                        legend: { position: 'bottom' },
                        tooltip: { callbacks: { label: function(context) { return `${context.label}: ${context.parsed} statement(s)`; } } }
                    }
                }
            });
            logStudentCoach("Student questionnaire distribution chart rendered.");
        } catch (error) {
             console.error("[StudentCoachLauncher] Error rendering questionnaire chart:", error);
            chartContainer.innerHTML = '<p style="color:red; text-align:center;">Error rendering chart.</p>';
        }
    }

    // --- NEW: showProblemSelectorModal (adapted from tutor) ---
    // For students, the common problems and the modal's appearance might be different.
    // Using a simplified version of tutor's problems for now.
    const studentCommonProblems = { // Example, can be refined based on student needs
        "Vision": [
            { id: "svision_1", text: "I'm unsure about my future goals" },
            { id: "svision_2", text: "I'm not feeling motivated for my studies" },
        ],
        "Effort": [
            { id: "seffort_1", text: "I struggle to complete my homework on time" },
            { id: "seffort_2", text: "I find it hard to keep trying when things get difficult" },
        ],
        "Systems": [
            { id: "ssystems_1", text: "I'm not very organized with my notes and deadlines" },
            { id: "ssystems_2", text: "I don't have a good revision plan" },
        ],
        "Practice": [
            { id: "spractice_1", text: "I don't review my work regularly" },
            { id: "spractice_2", text: "I tend to cram before tests" },
        ],
        "Attitude": [
            { id: "sattitude_1", text: "I worry I'm not smart enough" },
            { id: "sattitude_2", text: "I get easily discouraged by setbacks" },
        ]
    };

    function showProblemSelectorModal(commonProblems, chatInput) {
        const modalId = 'studentCoachProblemModal'; // Student specific ID
        const existingModal = document.getElementById(modalId);
        if (existingModal) existingModal.remove();
        
        const modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'student-coach-modal-overlay'; // student specific class from CSS
        
        const modalContent = document.createElement('div');
        modalContent.className = 'student-coach-modal-content'; // student specific class from CSS
        
        const savedZoom = localStorage.getItem('studentCoachTextZoom'); // Use student-specific zoom key
        if (savedZoom) modalContent.style.fontSize = `${parseInt(savedZoom, 10) * 14 / 100}px`;
        
        // Modal Header - simplified for student
        modalContent.innerHTML = `
            <div class="ai-coach-problem-modal-header"> <!-- Using generic class from tutor CSS, can be student-specific -->
                <h3>What's on your mind?</h3>
                <p>Select a challenge you're facing, or type your own question in the chat.</p>
                <button class="ai-coach-modal-close">&times;</button>
            </div>
            <div class="ai-coach-problem-modal-body"></div> <!-- Generic class from tutor CSS -->
        `;
        const modalBody = modalContent.querySelector('.ai-coach-problem-modal-body');

        // Populate with problems
        Object.entries(commonProblems).forEach(([vespaElement, problems]) => {
            const categoryDiv = document.createElement('div');
            // Class for styling based on VESPA element (e.g., .vespa-vision)
            categoryDiv.className = `ai-coach-problem-category vespa-${vespaElement.toLowerCase()}`;
            categoryDiv.innerHTML = `<h4>${vespaElement}</h4>`; // Title for the category
            problems.forEach(problem => {
                const problemItem = document.createElement('div');
                problemItem.className = 'ai-coach-problem-item'; // For styling individual problems
                problemItem.textContent = problem.text;
                problemItem.addEventListener('click', () => {
                    if (chatInput) { // Ensure chatInput element exists
                        chatInput.value = `I'd like to discuss: ${problem.text}`; // Pre-fill chat
                        chatInput.focus();
                    }
                    closeModal(); // Close modal after selection
                });
                categoryDiv.appendChild(problemItem);
            });
            modalBody.appendChild(categoryDiv);
        });
        
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        // Animation triggers (can be reused from tutor if CSS animations are similar)
        setTimeout(() => { modal.style.opacity = '1'; modalContent.style.transform = 'scale(1)'; }, 10);

        // Close handlers (can be reused)
        const closeModal = () => {
            modal.style.opacity = '0'; modalContent.style.transform = 'scale(0.9)';
            setTimeout(() => modal.remove(), 300);
            document.removeEventListener('keydown', escHandler); // Clean up listener
        };
        modalContent.querySelector('.ai-coach-modal-close').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
        const escHandler = (e) => { if (e.key === 'Escape') closeModal(); };
        document.addEventListener('keydown', escHandler);
    }

    // --- NEW: showActivityModal (adapted from tutor) ---
    // This function displays a modal for a VESPA activity, potentially with a PDF.
    function showActivityModal(activity) { // Activity object is expected from backend
        const modalId = 'studentCoachActivityModal'; // Student specific ID
        const existingModal = document.getElementById(modalId);
        if (existingModal) existingModal.remove();

        const modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'student-coach-modal-overlay'; // student specific class
        // Basic styling for overlay - detailed styling in CSS
        modal.style.cssText = ` 
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.7); z-index: 2000; display: flex;
            align-items: center; justify-content: center; opacity: 0; transition: opacity 0.3s ease;
        `;
        const modalContent = document.createElement('div');
        modalContent.className = 'student-coach-modal-content'; // student specific class
        // Basic styling for content - detailed styling in CSS
        modalContent.style.cssText = `
            background: white; width: 90%; max-width: 800px; height: 80vh; border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3); display: flex; flex-direction: column;
            position: relative; transform: scale(0.9); transition: transform 0.3s ease;
        `;
        const savedZoom = localStorage.getItem('studentCoachTextZoom'); // Student zoom key
        if (savedZoom) modalContent.style.fontSize = `${parseInt(savedZoom, 10) * 14 / 100}px`;
        
        // Modal Header
        modalContent.innerHTML = `
            <div style="padding: 20px; border-bottom: 1px solid #ddd; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;">
                <div>
                    <h3 style="margin:0; color:#333;">${activity.name}</h3>
                    <p style="margin:5px 0 0 0; color:#666; font-size:0.9em;">VESPA Element: <strong>${activity.vespa_element}</strong></p>
                </div>
                <button class="ai-coach-modal-close" style="background:none; border:none; font-size:1.5em; cursor:pointer;">&times;</button>
            </div>
            <div class="activity-modal-body" style="flex:1; overflow-y:auto; padding:20px; display:flex; flex-direction:column; gap:15px;">
                ${activity.short_summary && activity.short_summary !== 'N/A' ? `<div style="background:#f8f9fa; padding:15px; border-radius:5px; border-left:4px solid #3498db;"><h4>Summary:</h4><p>${activity.short_summary}</p></div>` : ''}
                <div class="pdf-section" style="flex:1; border:1px solid #ddd; border-radius:5px; overflow:hidden; min-height:300px; background:#f5f5f5; position:relative;">
                    <!-- PDF will be loaded here -->
                </div>
            </div>
        `;
        const pdfSection = modalContent.querySelector('.pdf-section');

        if (activity.pdf_link && activity.pdf_link !== '#') {
            const loadingDiv = document.createElement('div'); // Loading indicator
            loadingDiv.innerHTML = '<div class="loader" style="margin: auto;"></div><p style="text-align:center;">Loading resource...</p>';
            pdfSection.appendChild(loadingDiv);

            const pdfEmbed = document.createElement('iframe');
            pdfEmbed.src = activity.pdf_link; // Ensure this link allows embedding
            pdfEmbed.style.cssText = "width:100%; height:100%; border:none;";
            pdfEmbed.title = `Resource: ${activity.name}`;
            pdfEmbed.onload = () => { loadingDiv.style.display = 'none'; };
            pdfEmbed.onerror = () => { 
                loadingDiv.remove(); // Remove loader on error
                pdfSection.innerHTML = `<div style="text-align:center; padding:20px;"><p>Could not load the resource directly.</p><a href="${activity.pdf_link}" target="_blank" class="p-button">Open Resource in New Tab</a></div>`;
            };
            pdfSection.appendChild(pdfEmbed);
        } else {
            pdfSection.innerHTML = '<p style="text-align:center; padding:20px;">No viewable resource provided for this activity.</p>';
        }

        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        setTimeout(() => { modal.style.opacity = '1'; modalContent.style.transform = 'scale(1)'; }, 10); // Animation trigger

        // Close handlers (reused logic)
        const closeModal = () => {
            modal.style.opacity = '0'; modalContent.style.transform = 'scale(0.9)';
            setTimeout(() => modal.remove(), 300);
            document.removeEventListener('keydown', escHandler);
        };
        modalContent.querySelector('.ai-coach-modal-close').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
        const escHandler = (e) => { if (e.key === 'Escape') closeModal(); };
        document.addEventListener('keydown', escHandler);
    }
}
