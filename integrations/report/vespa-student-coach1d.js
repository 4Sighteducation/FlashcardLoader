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
    const STUDENT_COACH_API_BASE_URL = 'https://vespa-student-coach.herokuapp.com/api/v1'; // UPDATED for student backend
    const COACHING_DATA_ENDPOINT = `${STUDENT_COACH_API_BASE_URL}/student_coaching_data`; // UPDATED
    const CHAT_TURN_ENDPOINT = `${STUDENT_COACH_API_BASE_URL}/chat_turn`; // UPDATED

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
        if (!STUDENT_COACH_LAUNCHER_CONFIG || !STUDENT_COACH_LAUNCHER_CONFIG.sceneKey || !STUDENT_COACH_LAUNCHER_CONFIG.views || !STUDENT_COACH_LAUNCHER_CONFIG.views[0]) {
            logStudentCoach("isStudentCoachPageView: Config not fully available (sceneKey or views missing).");
            return false;
        }

        // Check for the primary view container associated with this app from its config.
        // Example: If config.views[0] is 'view_3055', this will check for '#view_3055'.
        const primaryViewContainerSelector = `#${STUDENT_COACH_LAUNCHER_CONFIG.views[0]}`;
        const viewContainerElement = document.querySelector(primaryViewContainerSelector);

        if (viewContainerElement) {
            logStudentCoach(`Student Coach page context confirmed: Primary View Container '${primaryViewContainerSelector}' exists.`);
            // We can also verify if Knack.scene.key matches the configured sceneKey for extra robustness if Knack.scene is available.
            if (typeof Knack !== 'undefined' && Knack.scene && Knack.scene.key) {
                if (Knack.scene.key !== STUDENT_COACH_LAUNCHER_CONFIG.sceneKey) {
                    logStudentCoach(`Warning: Knack.scene.key ('${Knack.scene.key}') differs from configured sceneKey ('${STUDENT_COACH_LAUNCHER_CONFIG.sceneKey}'), but view container was found.`);
                }
            }
            return true; // View container found, proceed.
        }
        
        // logStudentCoach(`isStudentCoachPageView: Primary View Container '${primaryViewContainerSelector}' not found.`);
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

        const link = document.createElement('link');
        link.id = styleId;
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = 'https://cdn.jsdelivr.net/gh/4Sighteducation/FlashcardLoader@main/integrations/report/vespa-student-coach.css'; // Ensure this is the correct CSS file for students
        
        // Dynamic CSS for config-specific IDs
        // Uses STUDENT_COACH_LAUNCHER_CONFIG.mainContentSelector (e.g., #kn-scene_43)
        // and STUDENT_COACH_LAUNCHER_CONFIG.aiCoachPanelId (e.g., studentCoachSlidePanel)
        const dynamicCss = `
            body.ai-coach-active ${STUDENT_COACH_LAUNCHER_CONFIG.mainContentSelector} {
                width: calc(100% - var(--ai-coach-panel-width, 400px)); /* Default to 400px if var not set */
                margin-right: var(--ai-coach-panel-width, 400px);
                transition: width var(--ai-coach-transition-duration, 0.3s), 
                            margin-right var(--ai-coach-transition-duration, 0.3s);
            }
            
            ${STUDENT_COACH_LAUNCHER_CONFIG.mainContentSelector} {
                transition: width var(--ai-coach-transition-duration, 0.3s), 
                            margin-right var(--ai-coach-transition-duration, 0.3s);
            }
            
            #${STUDENT_COACH_LAUNCHER_CONFIG.aiCoachPanelId} {
                /* Basic panel styles - some are in external CSS, these ensure core functionality */
                width: 0; opacity: 0; visibility: hidden;
                position: fixed !important; top: 0; right: 0; height: 100vh;
                background-color: #f4f6f8; /* Default, can be overridden by external CSS */
                border-left: 1px solid #ddd; /* Default, can be overridden by external CSS */
                padding: 20px; box-sizing: border-box; overflow-y: auto;
                z-index: 1050; 
                transition: width var(--ai-coach-transition-duration, 0.3s), 
                            opacity var(--ai-coach-transition-duration, 0.3s), 
                            visibility var(--ai-coach-transition-duration, 0.3s);
                font-family: Arial, sans-serif; display: flex; flex-direction: column;
            }
            
            body.ai-coach-active #${STUDENT_COACH_LAUNCHER_CONFIG.aiCoachPanelId} {
                width: var(--ai-coach-panel-width, 400px); 
                opacity: 1; visibility: visible;
            }
            
            /* Ensure panel content section and header are styled if external CSS doesn't catch them by ID */
            #${STUDENT_COACH_LAUNCHER_CONFIG.aiCoachPanelId} .ai-coach-panel-header {
                display: flex; justify-content: space-between; align-items: center;
                margin-bottom: 15px; border-bottom: 1px solid #ccc; padding-bottom: 10px;
                flex-shrink: 0;
            }
            #${STUDENT_COACH_LAUNCHER_CONFIG.aiCoachPanelId} .ai-coach-panel-header h3 { margin: 0; font-size: 1.2em;}
            #${STUDENT_COACH_LAUNCHER_CONFIG.aiCoachPanelId} .ai-coach-close-btn { background:none; border:none; font-size:1.5em; cursor:pointer; }

            #${STUDENT_COACH_LAUNCHER_CONFIG.aiCoachPanelId} .ai-coach-panel-content {
                flex: 1; display: flex; flex-direction: column;
                overflow-y: auto; min-height: 0;
            }
            
            .loader { border: 3px solid #f3f3f3; border-top: 3px solid #3498db; border-radius: 50%; width: 30px; height: 30px; animation: spin 1s linear infinite; margin: 20px auto; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

            /* Basic styles for the new toggle buttons if not fully covered by external CSS */
            .ai-coach-section-toggles { display: flex; gap: 10px; margin: 15px 0; }
            .ai-coach-section-toggles .p-button { flex: 1; padding: 10px; font-size: 0.9em; border-radius: 4px; cursor: pointer; }
        `;
        
        const styleElement = document.createElement('style');
        styleElement.textContent = dynamicCss;
        
        // Set CSS variables (these are defaults, can be overridden by the loaded CSS file)
        document.documentElement.style.setProperty('--ai-coach-panel-width', '400px'); 
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
            // The backend will take this, find the email, then find the Object_10 record.
            return user.id; 
        } else {
            logStudentCoach("Knack user attributes (Object_3 ID) not available.");
            const panelContent = document.querySelector(`#${STUDENT_COACH_LAUNCHER_CONFIG.aiCoachPanelId} .ai-coach-panel-content`);
            if (panelContent) {
                 panelContent.innerHTML = '<div class="ai-coach-section"><p style="color:orange;">Could not identify you. Please ensure you are logged in correctly.</p></div>';
            }
            stopLoadingMessageRotator();
            return null;
        }
    }

    async function fetchAICoachingData(studentObject3Id) { // Renamed parameter
        const panelContent = document.querySelector(`#${STUDENT_COACH_LAUNCHER_CONFIG.aiCoachPanelId} .ai-coach-panel-content`);
        if (!panelContent) return;

        if (!studentObject3Id) { 
             logStudentCoach("fetchAICoachingData called with no studentObject3Id. Aborting.");
             if(panelContent) panelContent.innerHTML = '<div class="ai-coach-section"><p style="color:orange;">Your user ID is missing, cannot fetch AI coaching data.</p></div>';
             return;
        }

        // Using studentObject3Id for these checks now
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
                // Backend will expect student_object3_id
                body: JSON.stringify({ student_object3_id: studentObject3Id }), 
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
        logStudentCoach("renderAICoachData (Student) CALLED. Data:", JSON.parse(JSON.stringify(data)));
        const panelContent = document.querySelector(`#${STUDENT_COACH_LAUNCHER_CONFIG.aiCoachPanelId} .ai-coach-panel-content`);
        stopLoadingMessageRotator();
        if (!panelContent) return;
        panelContent.innerHTML = ''; 

        let htmlShell = '';

        // AI Student Snapshot section
        htmlShell += '<div class="ai-coach-section">';
        htmlShell += '<h4>My AI Snapshot</h4>';
        if (data.llm_generated_insights && data.llm_generated_insights.student_overview_summary) {
            htmlShell += `<p>${data.llm_generated_insights.student_overview_summary}</p>`;
        } else if (data.student_name && data.student_name !== "N/A") {
            htmlShell += '<p>AI summary is being generated or is not available for you at this moment.</p>';
        } else {
            htmlShell += '<p>Welcome! Activate the coach to see your insights.</p>';
        }
        htmlShell += '</div>';

        // Toggle Buttons for different insight sections
        // Using IDs that match the tutor CSS for styling consistency
        htmlShell += `
            <div class="ai-coach-section-toggles">
                <button id="aiCoachToggleVespaButton" class="p-button" aria-expanded="false">My VESPA Insights</button>
                <button id="aiCoachToggleAcademicButton" class="p-button" aria-expanded="false">My Academic Insights</button>
                <button id="aiCoachToggleQuestionButton" class="p-button" aria-expanded="false">My Questionnaire Insights</button>
            </div>
        `;

        // Content Divs for each toggle button - initially hidden
        // Use unique IDs for student coach, but common class for styling
        htmlShell += '<div id="studentCoachVespaProfileContainer" class="ai-coach-details-section" style="display: none;"><div class="ai-coach-section"><p>Your VESPA profile insights will appear here.</p></div></div>';
        htmlShell += '<div id="studentCoachAcademicProfileContainer" class="ai-coach-details-section" style="display: none;"><div class="ai-coach-section"><p>Your academic insights will appear here.</p></div></div>';
        htmlShell += '<div id="studentCoachQuestionAnalysisContainer" class="ai-coach-details-section" style="display: none;"><div class="ai-coach-section"><p>Your questionnaire analysis will appear here.</p></div></div>';
        
        panelContent.innerHTML = htmlShell;

        // Add Chat Interface (always add the container, content conditional on student_name)
        addChatInterface(panelContent, data.student_name || "My AI Coach");

        // Add event listeners for the new toggle buttons
        const toggleButtonsConfig = [
            { buttonId: 'aiCoachToggleVespaButton',          containerId: 'studentCoachVespaProfileContainer',       defaultText: 'My VESPA Insights' },
            { buttonId: 'aiCoachToggleAcademicButton',       containerId: 'studentCoachAcademicProfileContainer',    defaultText: 'My Academic Insights' },
            { buttonId: 'aiCoachToggleQuestionButton',       containerId: 'studentCoachQuestionAnalysisContainer', defaultText: 'My Questionnaire Insights' }
        ];

        toggleButtonsConfig.forEach(config => {
            const button = document.getElementById(config.buttonId);
            const container = document.getElementById(config.containerId);

            if (button && container) {
                button.addEventListener('click', () => {
                    const isVisible = container.style.display === 'block';
                    
                    // Hide all detail sections first
                    document.querySelectorAll('.ai-coach-details-section').forEach(section => {
                        section.style.display = 'none';
                    });
                     // Reset all button texts and ARIA states
                    toggleButtonsConfig.forEach(btnConf => {
                        const btn = document.getElementById(btnConf.buttonId);
                        if (btn && btn.id !== config.buttonId) { // Don't reset the clicked button yet
                            btn.textContent = btnConf.defaultText;
                            btn.setAttribute('aria-expanded', 'false');
                        }
                    });

                    if (isVisible) {
                        container.style.display = 'none';
                        button.textContent = config.defaultText;
                        button.setAttribute('aria-expanded', 'false');
                    } else {
                        container.style.display = 'block';
                        button.textContent = `Hide ${config.defaultText.replace('View ', '')}`;
                        button.setAttribute('aria-expanded', 'true');
                        // TODO: Populate these sections with actual data from `data` object later
                        // For now, they just show placeholders.
                        // Example: if (config.containerId === 'studentCoachVespaProfileContainer') { populateVespaSection(container, data); }
                    }
                });
            }
        });
        logStudentCoach("Student AI Coach data rendered with toggle buttons.");
    }
    
    // Note: renderVespaComparisonChart, createSubjectBenchmarkScale, renderQuestionnaireDistributionChart
    // might be reused if students see similar charts, or adapted/removed if not.

    async function refreshAICoachData() {
        const panel = document.getElementById(STUDENT_COACH_LAUNCHER_CONFIG.aiCoachPanelId);
        const panelContent = panel ? panel.querySelector('.ai-coach-panel-content') : null;
        if (!panel || !panelContent) return;

        if (!document.body.classList.contains('ai-coach-active')) { 
            logStudentCoach("Student AI Coach panel is not active, refresh not needed.");
            return;
        }

        logStudentCoach("refreshAICoachData (Student): Attempting to get student data...");
        const studentObject3Id = await getLoggedInStudentDataForCoach(); // Now gets Object_3 ID
        
        if (studentObject3Id) {
            // lastFetchedStudentKnackId now stores the studentObject3Id
            if (studentObject3Id !== lastFetchedStudentKnackId || lastFetchedStudentKnackId === null) {
                logStudentCoach(`refreshAICoachData (Student): ID ${studentObject3Id}. Last fetched: ${lastFetchedStudentKnackId}. Fetching data.`);
                if (currentlyFetchingStudentKnackId !== studentObject3Id && panelContent.innerHTML.indexOf('loader') === -1 ){
                    // panelContent.innerHTML = '<div class="loader"></div><p style="text-align:center;">Loading your AI Coach...</p>';
                     startLoadingMessageRotator(panelContent, "student"); // Use rotator
                }
                fetchAICoachingData(studentObject3Id); 
            } else {
                logStudentCoach(`refreshAICoachData (Student): ID ${studentObject3Id} is same as last fetched. Data likely current.`);
                stopLoadingMessageRotator();
                if (panelContent && panelContent.querySelector('.loader') && !panelContent.querySelector('.ai-coach-section')) {
                    panelContent.innerHTML = '<p>Activate My AI Coach to get personalized insights!</p>';
                }
            }
        } else {
            logStudentCoach("refreshAICoachData (Student): Student Object_3 ID not available.");
            lastFetchedStudentKnackId = null; 
            observerLastProcessedStudentKnackId = null; 
            currentlyFetchingStudentKnackId = null;
            stopLoadingMessageRotator();
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
    function startLoadingMessageRotator(panelContentElement, context = "student") { // Default context to student
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
