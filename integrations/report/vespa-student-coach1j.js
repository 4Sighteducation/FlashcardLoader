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

    // --- Configuration ---
    const STUDENT_COACH_API_BASE_URL = 'https://vespa-student-coach.herokuapp.com/api/v1'; // Ensure this is correct
    const COACHING_DATA_ENDPOINT = `${STUDENT_COACH_API_BASE_URL}/student_coaching_data`; 
    const CHAT_TURN_ENDPOINT = `${STUDENT_COACH_API_BASE_URL}/chat_turn`; 

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
            logStudentCoach("Student Coach UI appears to be already initialized. Skipping full re-initialization.");
            return;
        }

        logStudentCoach("Conditions met. Initializing Student Coach UI (button and panel).");
        loadExternalStyles(); // This will load CSS. Ensure it's adapted or a new student-specific CSS is created
        createAICoachPanel(); // Re-check IDs used inside this function
        addPanelResizeHandler(); 
        addLauncherButton(); // Re-check IDs used inside this function
        setupEventListeners(); // Re-check IDs used inside this function
        coachUIInitialized = true;
        logStudentCoach("StudentCoachLauncher UI initialization complete.");
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
            // logStudentCoach("MutationObserver detected DOM change (raw event)."); // Can be noisy
            
            if (isStudentCoachPageView()) { // Check if we are on the correct page
                if (!coachUIInitialized) { // Only initialize UI if not already done
                    initializeCoachUI();
                }
                // If UI is initialized and panel is active, you might want to refresh data
                // This part is similar to the tutor coach, adapt as needed
                const panelIsActive = document.body.classList.contains('ai-coach-active'); 
                if (coachUIInitialized && panelIsActive) {
                    const currentStudentUser = Knack.getUserAttributes();
                    const studentKnackId = currentStudentUser ? currentStudentUser.id : null;
                    if (studentKnackId && studentKnackId !== observerLastProcessedStudentKnackId) {
                        logStudentCoach(`Observer: Student Knack ID changed or identified: ${studentKnackId}. Triggering refresh.`);
                        observerLastProcessedStudentKnackId = studentKnackId;
                        refreshAICoachData(); 
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
        
        debouncedObserverCallback = debounce(observerCallback, 300); // Reduced debounce slightly

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
        link.href = 'https://cdn.jsdelivr.net/gh/4Sighteducation/FlashcardLoader@main/integrations/report/vespa-student-coach1a.css'; // Placeholder
        
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
        // Simplified: Assume CSS handles resize handle display. Logic is similar.
        // Implement actual resize logic if needed, adapting from tutor coach.
        // For now, this function can be a placeholder or copy the logic, ensuring IDs are correct.
        logStudentCoach("Panel resize handler setup (adapt from tutor version if needed).");
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
             if(panelContent) panelContent.innerHTML = '<div class="ai-coach-section"><p style="color:orange;">Your user ID is missing, cannot fetch AI coaching data.</p></div>';
             return;
        }

        if (currentlyFetchingStudentKnackId === studentObject3Id) {
            logStudentCoach(`fetchAICoachingData: Already fetching data for student Object_3 ID ${studentObject3Id}. Aborting.`);
            return;
        }

        if (currentFetchAbortController) {
            currentFetchAbortController.abort();
            logStudentCoach("Aborted previous fetchAICoachingData call.");
        }
        currentFetchAbortController = new AbortController(); 
        const signal = currentFetchAbortController.signal;
        currentlyFetchingStudentKnackId = studentObject3Id; // Track by Object_3 ID

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
    }
    
    // Note: renderVespaComparisonChart, createSubjectBenchmarkScale, renderQuestionnaireDistributionChart
    // might be reused if students see similar charts, or adapted/removed if not.

    async function refreshAICoachData() {
        const panel = document.getElementById(STUDENT_COACH_LAUNCHER_CONFIG.aiCoachPanelId);
        const panelContent = panel ? panel.querySelector('.ai-coach-panel-content') : null;
        if (!panel || !panelContent) return;

        if (!document.body.classList.contains('ai-coach-active')) { // Ensure classname is consistent or namespaced
            logStudentCoach("Student AI Coach panel is not active, refresh not needed.");
            return;
        }

        logStudentCoach("refreshAICoachData (Student): Attempting to get student data...");
        const studentObject3Id = await getLoggedInStudentDataForCoach(); 
        
        if (studentObject3Id) {
            if (studentObject3Id !== lastFetchedStudentKnackId || lastFetchedStudentKnackId === null) {
                logStudentCoach(`refreshAICoachData (Student): ID ${studentObject3Id}. Last fetched: ${lastFetchedStudentKnackId}. Fetching data.`);
                if (currentlyFetchingStudentKnackId !== studentObject3Id && panelContent.innerHTML.indexOf('loader') === -1 ){
                    panelContent.innerHTML = '<div class="loader"></div><p style="text-align:center;">Loading your AI Coach...</p>';
                }
                fetchAICoachingData(studentObject3Id); 
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
            currentlyFetchingStudentKnackId = null;
            if (panelContent && panelContent.innerHTML.includes('loader') && !panelContent.innerHTML.includes('ai-coach-section')){
                 panelContent.innerHTML = '<div class="ai-coach-section"><p style="color:orange;">Could not load your profile for the AI Coach. Please ensure you are logged in and on the correct page.</p></div>';
            }
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
        const oldChatContainer = document.getElementById('studentCoachChatContainer'); // Unique ID
        if (oldChatContainer) oldChatContainer.remove();

        const chatContainer = document.createElement('div');
        chatContainer.id = 'studentCoachChatContainer'; // Unique ID
        chatContainer.className = 'ai-coach-section';
        chatContainer.style.marginTop = '20px';

        chatContainer.innerHTML = `
            <h4>Chat with ${chatWithTitle}</h4>
            <div id="studentCoachChatStats" style="font-size: 0.85em; color: #666; margin-bottom: 10px;">
                <span id="studentCoachChatCount">Loading chat...</span>
            </div>
            <div id="studentCoachChatDisplay" style="max-height: 300px; overflow-y: auto; border: 1px solid #ccc; padding: 10px; margin-bottom:10px; background:#fff;">
                <p class="ai-chat-message ai-chat-message-bot"><em>${chatWithTitle}:</em> Hello! I'm here to help you explore your VESPA profile. What's on your mind?</p>
            </div>
            <!-- Problem selector might be different for students -->
            <!-- <button id="studentCoachProblemButton" class="p-button p-component">What area to focus on?</button> -->
            <div style="display: flex; gap: 10px;">
                <input type="text" id="studentCoachChatInput" placeholder="Ask me anything about VESPA...">
                <button id="studentCoachChatSendButton" class="p-button p-component">Send</button>
            </div>
            <div id="studentCoachChatThinkingIndicator" style="display: none; text-align:center; margin-top:5px;">${chatWithTitle} is thinking...</div>
        `;
        panelContentElement.appendChild(chatContainer);

        const chatInput = document.getElementById('studentCoachChatInput');
        const chatSendButton = document.getElementById('studentCoachChatSendButton');
        const chatDisplay = document.getElementById('studentCoachChatDisplay');
        const thinkingIndicator = document.getElementById('studentCoachChatThinkingIndicator');
        // Simplified stats for student, add back if needed:
        // const chatCountElement = document.getElementById('studentCoachChatCount');
        // const likedCountElement = document.getElementById('likedCountNumber'); // If liking is implemented

        // TODO: loadChatHistory for student (will need a new backend endpoint or adapt existing)
        // loadStudentChatHistory(); 

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
                .filter(el => el !== userMessageElement) // Exclude the one just added
                .map(el => ({
                    role: el.classList.contains('ai-chat-message-bot') ? 'assistant' : 'user',
                    content: el.textContent.replace(/^(My AI Coach:|You:)\s*/, '')
                }));
            
            try {
                // Ensure CHAT_TURN_ENDPOINT points to the student coach backend
                const response = await fetch(CHAT_TURN_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        student_knack_id: lastFetchedStudentKnackId, // Send student's Object_3 ID
                        chat_history: chatHistory,
                        current_user_message: originalInput, 
                        // Backend needs to know this is a student context for different prompting
                        context_type: 'student' 
                    }),
                });

                if (!response.ok) throw new Error(`Chat API Error: ${response.status}`);
                const data = await response.json();

                const botMessageElement = document.createElement('p');
                botMessageElement.className = 'ai-chat-message ai-chat-message-bot';
                // Student-facing activities might not have PDF links or detailed modals initially
                botMessageElement.innerHTML = `<em>${chatWithTitle}:</em> ${data.ai_response}`;
                chatDisplay.appendChild(botMessageElement);

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
}
