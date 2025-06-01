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
    const STUDENT_COACH_API_BASE_URL = 'https://vespa-student-coach-8116bb380fbd.herokuapp.com/api/v1'; // Corrected to the deployed Heroku app URL
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
            const chartContainer = document.getElementById('vespaComparisonChartContainer'); // Changed ID
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

        const link = document.createElement('link');
        link.id = styleId;
        link.rel = 'stylesheet';
        link.type = 'text/css';
        // Reverted to the CDN path as per user clarification that vespa-student-coach1g.css is the active, copied file.
        link.href = 'https://cdn.jsdelivr.net/gh/4Sighteducation/FlashcardLoader@main/integrations/report/vespa-student-coach1i.css'; 
        logStudentCoach("Attempting to load CSS from: " + link.href);
        
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
                z-index: 1050; transition: width var(--student-coach-transition-duration, 0.3s), opacity var(--student-coach-transition-duration, 0.3s), visibility var(--student-coach-transition-duration, 0.3s);
                font-family: Arial, sans-serif; display: flex; flex-direction: column;
            }
            
            body.ai-coach-active #${STUDENT_COACH_LAUNCHER_CONFIG.aiCoachPanelId} {
                width: var(--student-coach-panel-width, 400px); /* Use CSS var or default */
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
            const minW = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--student-coach-panel-min-width'), 10) || 350;
            const maxW = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--student-coach-panel-max-width'), 10) || 1200;
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
            const minW = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--student-coach-panel-min-width'), 10) || 350;
            const maxW = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--student-coach-panel-max-width'), 10) || 1200;
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
        // const targetElement = document.querySelector(STUDENT_COACH_LAUNCHER_CONFIG.elementSelector);
        // if (!targetElement) {
        //     console.error(`[StudentCoachLauncher] Launcher button target '${STUDENT_COACH_LAUNCHER_CONFIG.elementSelector}' not found.`);
        //     return;
        // }

        let buttonContainer = document.getElementById('aiCoachLauncherButtonContainer'); 
        if (!buttonContainer) {
            buttonContainer = document.createElement('div');
            buttonContainer.id = 'aiCoachLauncherButtonContainer';
            document.body.appendChild(buttonContainer); 
            logStudentCoach("Launcher button container DIV created and appended to document.body.");
        }

        // Ensure the paragraph is not re-added if only button is missing
        if (!buttonContainer.querySelector(`#${STUDENT_COACH_LAUNCHER_CONFIG.aiCoachToggleButtonId}`)) {
            // New structure with a flex container for main button and info button
            buttonContainer.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: flex-end; gap: 10px;">
                    <button id="${STUDENT_COACH_LAUNCHER_CONFIG.aiCoachToggleButtonId}" class="p-button p-component">🚀 Activate My AI Coach</button>
                    <button id="aiCoachInfoBtn" title="About My AI Coach" 
                            style="width: 40px; height: 40px; border-radius: 50%; 
                                   background-color: #e9ecef; /* Light grey, adjust with CSS variables later */ 
                                   border: 1px solid #ced4da; 
                                   font-size: 20px; font-weight: bold; color: #495057; 
                                   cursor: pointer; display: flex; align-items: center; 
                                   justify-content: center; transition: background-color 0.2s, box-shadow 0.2s;"
                            aria-label="Information about the AI Coach">
                        i
                    </button>
                </div>
            `;
        }
        
        // Add event listener for the new info button
        const infoButton = document.getElementById('aiCoachInfoBtn');
        if (infoButton) {
            infoButton.addEventListener('click', () => {
                logStudentCoach("Info button clicked");
                showInfoModal(); // This function will be created next
            });
        } else {
            // This might happen if innerHTML was set but button isn't found immediately (less likely with direct innerHTML)
            // Or if the button container already existed with different content.
            // For robustness, try querying again after a tiny delay if critical, or ensure idempotent re-creation.
            logStudentCoach("Info button not found immediately after innerHTML set. This might be an issue if container was not empty.");
        }
    }

    function createInfoModalHTML() {
        // Content for the info modal
        // Adjust title and content as needed
        const title = "About My VESPA AI Coach";
        const content = `
            <p>Hello! I'm your VESPA AI Coach, here to help you understand your VESPA profile and make the most of your learning journey.</p>
            <h4>What can I help with?</h4>
            <ul>
                <li><strong>Understanding Your Scores:</strong> I can help you interpret your VESPA (Vision, Effort, Systems, Practice, Attitude) scores.</li>
                <li><strong>Academic Insights:</strong> Explore your academic performance in relation to benchmarks like your Minimum Expected Grades (MEGs).</li>
                <li><strong>Questionnaire Analysis:</strong> Reflect on your questionnaire responses and what they suggest about your learning habits and mindset.</li>
                <li><strong>Setting Goals:</strong> I can help you think about S.M.A.R.T. goals based on your profile.</li>
                <li><strong>Finding Strategies:</strong> If you're facing a challenge (e.g., motivation, organization), I can suggest relevant VESPA activities and resources.</li>
            </ul>
            <h4>How does it work?</h4>
            <p>I use the data from your VESPA profile, academic results, and questionnaire responses (if available) to provide personalized insights and suggestions. Our conversation is designed to help you take ownership of your learning.</p>
            <h4>Tips for chatting:</h4>
            <ul>
                <li>Be specific! The more details you give me about a challenge, the better I can help.</li>
                <li>Ask questions about any part of your VESPA report or your learning.</li>
                <li>Use the "What area to focus on?" button if you're unsure where to start.</li>
            </ul>
            <p>Let's work together to help you succeed!</p>
        `;

        return {
            title: title,
            bodyHtml: content
        };
    }

    function showInfoModal() {
        logStudentCoach("Showing AI Coach Info Modal");
        const modalId = 'aiCoachInfoModal'; // Specific ID for this modal
        const existingModal = document.getElementById(modalId);
        if (existingModal) existingModal.remove(); // Remove if already exists

        const modalData = createInfoModalHTML();

        const modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'ai-coach-modal-overlay'; // Use a generic class for overlay styling

        const modalContent = document.createElement('div');
        modalContent.className = 'ai-coach-modal-content'; // Generic class for content box styling

        const savedZoom = localStorage.getItem('studentCoachTextZoom'); // Reuse student zoom preference
        if (savedZoom) {
            modalContent.style.fontSize = `${parseInt(savedZoom, 10) * 14 / 100}px`;
        }

        modalContent.innerHTML = `
            <div class="ai-coach-modal-header" style="background-color: #f0f8ff; border-bottom: 1px solid #cfe2f3;"> 
                <h3 style="color: #0056b3;">${modalData.title}</h3>
                <button class="ai-coach-modal-close" aria-label="Close information modal">&times;</button>
            </div>
            <div class="ai-coach-modal-body" style="padding: 20px 25px;">
                ${modalData.bodyHtml}
            </div>
        `;

        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        // Trigger CSS animations for entry
        setTimeout(() => {
            modal.style.opacity = '1';
            modalContent.style.transform = 'scale(1) translateY(0)';
        }, 10);

        // Close handlers
        const closeModal = () => {
            modal.style.opacity = '0';
            modalContent.style.transform = 'scale(0.95) translateY(10px)';
            setTimeout(() => {
                if (modal.parentNode) {
                    modal.remove();
                }
            }, 300); // Match CSS transition duration
            document.removeEventListener('keydown', escKeyHandler);
        };

        modalContent.querySelector('.ai-coach-modal-close').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal(); // Close if overlay is clicked
        });

        const escKeyHandler = (e) => {
            if (e.key === 'Escape') closeModal();
        };
        document.addEventListener('keydown', escKeyHandler);
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
            
            // Add suggested goals if available
            if (data.llm_generated_insights.suggested_student_goals && data.llm_generated_insights.suggested_student_goals.length > 0) {
                htmlShell += '<h5 style="margin-top: 15px;">My Suggested Goals:</h5>';
                htmlShell += '<ul>';
                data.llm_generated_insights.suggested_student_goals.forEach(goal => {
                    htmlShell += `<li>${goal}</li>`;
                });
                htmlShell += '</ul>';
            }
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
                <button id="aiCoachToggleVespaButton" class="p-button" aria-expanded="false" aria-controls="aiCoachVespaProfileContainer">My VESPA Insights</button> 
                <button id="aiCoachToggleAcademicButton" class="p-button" aria-expanded="false" aria-controls="aiCoachAcademicProfileContainer">My Academic Insights</button>
                <button id="aiCoachToggleQuestionButton" class="p-button" aria-expanded="false" aria-controls="aiCoachQuestionAnalysisContainer">My Questionnaire Insights</button>
            </div>
        `;
        logStudentCoach("renderAICoachData: HTML for toggle buttons appended.", htmlShell);

        // --- Content Divs for each toggle button - initially hidden --- 
        htmlShell += '<div id="aiCoachVespaProfileContainer" class="student-coach-details-section ai-coach-details-section" style="display: none;"><div class="ai-coach-section"><p>Your VESPA profile insights will appear here when available.</p></div></div>';
        htmlShell += '<div id="aiCoachAcademicProfileContainer" class="student-coach-details-section ai-coach-details-section" style="display: none;"><div class="ai-coach-section"><p>Your academic insights will appear here when available.</p></div></div>';
        htmlShell += '<div id="aiCoachQuestionAnalysisContainer" class="student-coach-details-section ai-coach-details-section" style="display: none;"><div class="ai-coach-section"><p>Your questionnaire analysis will appear here when available.</p></div></div>';
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
        addChatInterface(panelContent, (data && data.student_name) ? data.student_name : "My AI Coach"); // panelContent is the direct parent for chat.
        logStudentCoach("renderAICoachData: Returned from addChatInterface.");

        // --- Add event listeners for the new toggle buttons --- 
        const toggleButtonsConfig = [
            { buttonId: 'aiCoachToggleVespaButton',          containerId: 'aiCoachVespaProfileContainer',       defaultText: 'My VESPA Insights' },
            { buttonId: 'aiCoachToggleAcademicButton',       containerId: 'aiCoachAcademicProfileContainer',    defaultText: 'My Academic Insights' },
            { buttonId: 'aiCoachToggleQuestionButton',       containerId: 'aiCoachQuestionAnalysisContainer', defaultText: 'My Questionnaire Insights' }
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
            // Ensure parent containers for charts and other content exist and are prepared
            const vespaSection = document.getElementById('aiCoachVespaProfileContainer'); // Changed ID
            if (vespaSection) {
                vespaSection.innerHTML = ''; // Clear previous content
                // VESPA Insights - Chart and Text
                const vespaChartDiv = document.createElement('div');
                vespaChartDiv.id = 'vespaComparisonChartContainer'; // Changed ID, Matches CSS
                vespaChartDiv.style.height = '250px';
                vespaChartDiv.style.marginBottom = '15px';
                vespaChartDiv.innerHTML = '<p style="text-align:center;">VESPA Chart Area</p>'; 
                vespaSection.appendChild(vespaChartDiv);

                const vespaTextDiv = document.createElement('div');
                vespaTextDiv.className = 'ai-coach-section'; 
                vespaTextDiv.id = 'vespa-insights-text-content'; 
                // Placeholder text will be replaced by LLM insights if available
                vespaTextDiv.innerHTML = '<h5>Understanding My VESPA Scores</h5><p><em>Loading insights...</em></p>';
                vespaSection.appendChild(vespaTextDiv);
            } else {
                logStudentCoach("Error: aiCoachVespaProfileContainer not found before preparing for VESPA content."); // Changed ID
            }

            const academicSection = document.getElementById('aiCoachAcademicProfileContainer'); // Changed ID
            if (academicSection) {
                // Populate Academic Insights
                const academicContainer = document.getElementById('aiCoachAcademicProfileContainer'); // Changed ID, Re-fetch for safety
                if (academicContainer) { // Check if academicContainer still exists
                    let academicHtml = '';
                    const studentFirstName = data.student_name ? data.student_name.split(' ')[0] : "My";

                    // --- NEW: AI Generated Quote --- 
                    if (data.llm_generated_insights && data.llm_generated_insights.academic_quote) {
                        academicHtml += `<div class="ai-coach-section quote-section" style="border-left-color: var(--accent-color); background-color: color-mix(in srgb, var(--accent-color) 8%, transparent);">
                            <p style="font-style: italic; font-size: 1.1em; text-align: center; margin:0;">"${data.llm_generated_insights.academic_quote}"</p>
                        </div>`;
                    }

                    // --- NEW: MEG Explainer Text --- 
                    academicHtml += '<div class="ai-coach-section meg-explainer-section">';
                    academicHtml += '<h5>Understanding Your Minimum Expected Grade (MEG)</h5>';
                    academicHtml += `<p>
                        Your MEG represents an aspirational grade based on how students with similar GCSE results have performed nationally. 
                        Think of it as a starting point - it shows what's typically achievable for someone with your academic background. 
                        Your school may set these targets at different levels of ambition - some schools choose highly aspirational targets to encourage you to aim high, 
                        while others may set more moderate goals. Remember, this is just one indicator and doesn't account for your individual strengths, interests, 
                        or the specific subjects you're studying. Many students exceed their MEG, while others may find it challenging to reach. 
                        Your actual potential is influenced by many factors including your effort, teaching quality, and personal circumstances. 
                        For a more personalized target, check your Subject Target Grade (STG) in the 'My Subject Benchmarks' section below, 
                        which considers the specific subject you're studying and provides a more tailored expectation.
                    </p>`;
                    academicHtml += '</div>';
                    
                    // --- Subject Benchmarks Section (Remains) ---
                    academicHtml += '<div class="ai-coach-section subject-benchmarks-display"><h5>My Subject Benchmarks</h5>'; // Added class for potential styling
                    if (data.academic_profile_summary && data.academic_profile_summary.length > 0 && !(data.academic_profile_summary.length === 1 && data.academic_profile_summary[0].subject.includes("not found"))){
                        data.academic_profile_summary.forEach((subject, index) => {
                            if (subject && subject.subject && !subject.subject.includes("not found")) {
                                academicHtml += `<div class="subject-benchmark-item"><h5>${subject.subject}</h5>`;
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
                    academicHtml += '</div>'; // End subject benchmarks section
                    
                    // --- LLM Academic Benchmark Analysis (Existing - REMAINS for now, might be superseded or combined with new summary) ---
                    if (data.llm_generated_insights && data.llm_generated_insights.academic_benchmark_analysis) {
                        academicHtml += `<div class="ai-coach-section existing-ai-analysis"><h5>AI Analysis of My Academic Performance</h5>
                            <p>${data.llm_generated_insights.academic_benchmark_analysis}</p></div>`;
                    } else {
                         academicHtml += '<div class="ai-coach-section existing-ai-analysis"><h5>AI Analysis of My Academic Performance</h5><p><em>AI analysis of your academic performance is currently unavailable.</em></p></div>';
                    }

                    // --- NEW: AI Generated Encouraging Summary & Recommendation ---
                    if (data.llm_generated_insights && data.llm_generated_insights.academic_performance_ai_summary) {
                        academicHtml += `<div class="ai-coach-section encouraging-ai-summary" style="border-left-color: var(--secondary-color); background-color: color-mix(in srgb, var(--secondary-color) 8%, transparent);">
                            <h5>Your AI Academic Mentor's Thoughts 💭</h5>
                            <p>${data.llm_generated_insights.academic_performance_ai_summary}</p>
                        </div>`;
                    } else {
                        academicHtml += `<div class="ai-coach-section encouraging-ai-summary"><h5>Your AI Academic Mentor's Thoughts 💭</h5>
                            <p><em>Your personalized academic summary is being prepared by your AI Mentor...</em></p>
                        </div>`;
                    }
                    
                    academicContainer.innerHTML = academicHtml; // Set all academic content
                }
            } else {
                logStudentCoach("Error: aiCoachAcademicProfileContainer not found before preparing for Academic content."); // Changed ID
            }

            const questionnaireSection = document.getElementById('aiCoachQuestionAnalysisContainer'); // Changed ID
            if (questionnaireSection) {
                // Questionnaire Insights - Chart and Text
                questionnaireSection.innerHTML = ''; // Clear previous content
                const questionnaireChartDiv = document.createElement('div');
                questionnaireChartDiv.id = 'questionnaireResponseDistributionChartContainer'; // Changed ID, Matches CSS
                questionnaireChartDiv.style.height = '250px';
                questionnaireChartDiv.style.marginBottom = '15px';
                questionnaireChartDiv.innerHTML = '<p style="text-align:center;">Questionnaire Chart Area</p>';
                questionnaireSection.appendChild(questionnaireChartDiv);

                const questionnaireTextDiv = document.createElement('div');
                questionnaireTextDiv.className = 'ai-coach-section';
                questionnaireTextDiv.id = 'questionnaire-insights-text-content';
                // Placeholder text will be replaced by LLM insights if available
                questionnaireTextDiv.innerHTML = '<h5>Reflections on My Questionnaire</h5><p><em>Loading analysis...</em></p>';
                questionnaireSection.appendChild(questionnaireTextDiv);
            } else {
                logStudentCoach("Error: aiCoachQuestionAnalysisContainer not found before preparing for Questionnaire content."); // Changed ID
            }

            ensureChartJsLoaded(() => { 
                // Render VESPA Chart
                if (data.vespa_profile) { 
                    renderVespaComparisonChart(data.vespa_profile, data.school_vespa_averages); 
                    const vespaTextDiv = document.getElementById('vespa-insights-text-content');
                    if (vespaTextDiv && data.llm_generated_insights && data.llm_generated_insights.chart_comparative_insights) {
                        vespaTextDiv.innerHTML = `<h5>Understanding My VESPA Scores</h5><p>${data.llm_generated_insights.chart_comparative_insights}</p>`;
                    } else if (vespaTextDiv) {
                        vespaTextDiv.innerHTML = '<h5>Understanding My VESPA Scores</h5><p><em>Detailed insights on your VESPA scores are not available at this moment.</em></p>';
                    }
                }
                
                // Populate Academic Insights
                const academicContainer = document.getElementById('aiCoachAcademicProfileContainer'); // Changed ID, Re-fetch for safety
                if (academicContainer) { // Check if academicContainer still exists
                    let academicHtml = '';
                    const studentFirstName = data.student_name ? data.student_name.split(' ')[0] : "My";

                    // --- NEW: AI Generated Quote --- 
                    if (data.llm_generated_insights && data.llm_generated_insights.academic_quote) {
                        academicHtml += `<div class="ai-coach-section quote-section" style="border-left-color: var(--accent-color); background-color: color-mix(in srgb, var(--accent-color) 8%, transparent);">
                            <p style="font-style: italic; font-size: 1.1em; text-align: center; margin:0;">"${data.llm_generated_insights.academic_quote}"</p>
                        </div>`;
                    }

                    // --- NEW: MEG Explainer Text --- 
                    academicHtml += '<div class="ai-coach-section meg-explainer-section">';
                    academicHtml += '<h5>Understanding Your Minimum Expected Grade (MEG)</h5>';
                    academicHtml += `<p>
                        Your MEG represents an aspirational grade based on how students with similar GCSE results have performed nationally. 
                        Think of it as a starting point - it shows what's typically achievable for someone with your academic background. 
                        Your school may set these targets at different levels of ambition - some schools choose highly aspirational targets to encourage you to aim high, 
                        while others may set more moderate goals. Remember, this is just one indicator and doesn't account for your individual strengths, interests, 
                        or the specific subjects you're studying. Many students exceed their MEG, while others may find it challenging to reach. 
                        Your actual potential is influenced by many factors including your effort, teaching quality, and personal circumstances. 
                        For a more personalized target, check your Subject Target Grade (STG) in the 'My Subject Benchmarks' section below, 
                        which considers the specific subject you're studying and provides a more tailored expectation.
                    </p>`;
                    academicHtml += '</div>';
                    
                    // --- Subject Benchmarks Section (Remains) ---
                    academicHtml += '<div class="ai-coach-section subject-benchmarks-display"><h5>My Subject Benchmarks</h5>'; // Added class for potential styling
                    if (data.academic_profile_summary && data.academic_profile_summary.length > 0 && !(data.academic_profile_summary.length === 1 && data.academic_profile_summary[0].subject.includes("not found"))){
                        data.academic_profile_summary.forEach((subject, index) => {
                            if (subject && subject.subject && !subject.subject.includes("not found")) {
                                academicHtml += `<div class="subject-benchmark-item"><h5>${subject.subject}</h5>`;
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
                    academicHtml += '</div>'; // End subject benchmarks section
                    
                    // --- LLM Academic Benchmark Analysis (Existing - REMAINS for now, might be superseded or combined with new summary) ---
                    if (data.llm_generated_insights && data.llm_generated_insights.academic_benchmark_analysis) {
                        academicHtml += `<div class="ai-coach-section existing-ai-analysis"><h5>AI Analysis of My Academic Performance</h5>
                            <p>${data.llm_generated_insights.academic_benchmark_analysis}</p></div>`;
                    } else {
                         academicHtml += '<div class="ai-coach-section existing-ai-analysis"><h5>AI Analysis of My Academic Performance</h5><p><em>AI analysis of your academic performance is currently unavailable.</em></p></div>';
                    }

                    // --- NEW: AI Generated Encouraging Summary & Recommendation ---
                    if (data.llm_generated_insights && data.llm_generated_insights.academic_performance_ai_summary) {
                        academicHtml += `<div class="ai-coach-section encouraging-ai-summary" style="border-left-color: var(--secondary-color); background-color: color-mix(in srgb, var(--secondary-color) 8%, transparent);">
                            <h5>Your AI Academic Mentor's Thoughts 💭</h5>
                            <p>${data.llm_generated_insights.academic_performance_ai_summary}</p>
                        </div>`;
                    } else {
                        academicHtml += `<div class="ai-coach-section encouraging-ai-summary"><h5>Your AI Academic Mentor's Thoughts 💭</h5>
                            <p><em>Your personalized academic summary is being prepared by your AI Mentor...</em></p>
                        </div>`;
                    }
                    
                    academicContainer.innerHTML = academicHtml; // Set all academic content
                }


                // Populate Questionnaire Insights
                const questionnaireTextContentDiv = document.getElementById('questionnaire-insights-text-content');
                if (questionnaireTextContentDiv) {
                    let questionnaireHtml = '';
                    // Highlights
                    if (data.object29_question_highlights) {
                        const highlights = data.object29_question_highlights;
                        questionnaireHtml += '<div class="ai-coach-section"><h5>My Questionnaire Response Highlights</h5>';
                        questionnaireHtml += '<p style="font-size:0.9em; margin-bottom:10px;"><em>(Response Scale: 1=Strongly Disagree, 5=Strongly Agree)</em></p>';
                        if (highlights.top_3 && highlights.top_3.length > 0) {
                            questionnaireHtml += '<h6>Strongest Agreement (Top 3):</h6><ul>';
                            highlights.top_3.forEach(q => {
                                questionnaireHtml += `<li>"${q.text}" <br><strong>Score: ${q.score}/5</strong> (${q.category})</li>`;
                            });
                            questionnaireHtml += '</ul>';
                        }
                        if (highlights.bottom_3 && highlights.bottom_3.length > 0) {
                            questionnaireHtml += '<h6 style="margin-top:15px;">Areas for Growth (Bottom 3):</h6><ul>';
                            highlights.bottom_3.forEach(q => {
                                questionnaireHtml += `<li>"${q.text}" <br><strong>Score: ${q.score}/5</strong> (${q.category})</li>`;
                            });
                            questionnaireHtml += '</ul>';
                        }
                        questionnaireHtml += '</div>';
                    }
                    // LLM Reflections
                    if (data.llm_generated_insights && data.llm_generated_insights.questionnaire_interpretation_and_reflection_summary) {
                        questionnaireHtml += `<div class="ai-coach-section"><h5>Reflections on My Questionnaire</h5><p>${data.llm_generated_insights.questionnaire_interpretation_and_reflection_summary}</p></div>`;
                    } else {
                        questionnaireHtml += '<div class="ai-coach-section"><h5>Reflections on My Questionnaire</h5><p><em>AI reflections on your questionnaire are currently unavailable.</em></p></div>';
                    }
                    questionnaireTextContentDiv.innerHTML = questionnaireHtml; // Set text content
                }
                // Render Questionnaire Chart
                if (data.all_scored_questionnaire_statements) {
                    renderQuestionnaireDistributionChart(data.all_scored_questionnaire_statements);
                }
            });
        } 
        else { 
            // Data not fully available, ensure placeholders are in the content divs
            const vespaContainer = document.getElementById('aiCoachVespaProfileContainer'); // Changed ID
            if (vespaContainer && !vespaContainer.querySelector('#vespaComparisonChartContainer')) { // Changed ID
                 vespaContainer.innerHTML = '<div class="ai-coach-section"><div id="vespaComparisonChartContainer" style="height: 250px; margin-bottom: 15px; background: #eee; display:flex; align-items:center; justify-content:center;"><p>My VESPA Chart Area (No Data)</p></div><p>My VESPA profile insights will appear here.</p></div>'; // Changed ID
            }
            
            const academicContainer = document.getElementById('aiCoachAcademicProfileContainer'); // Changed ID
            if (academicContainer && academicContainer.innerHTML.trim() === '') { 
                academicContainer.innerHTML = '<div class="ai-coach-section"><p>My academic insights and benchmarks will appear here.</p></div>';
            }

            const questionnaireContainer = document.getElementById('aiCoachQuestionAnalysisContainer'); // Changed ID
            if (questionnaireContainer && !questionnaireContainer.querySelector('#questionnaireResponseDistributionChartContainer')) { // Changed ID
                 questionnaireContainer.innerHTML = '<div class="ai-coach-section"><div id="questionnaireResponseDistributionChartContainer" style="height: 250px; margin-bottom: 15px; background: #eee; display:flex; align-items:center; justify-content:center;"><p>My Questionnaire Insights Area (No Data)</p></div><p>My questionnaire analysis will appear here.</p></div>'; // Changed ID
            }
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
        const oldChatContainer = document.getElementById('aiCoachChatContainer'); // Changed ID
        if (oldChatContainer) oldChatContainer.remove();

        const chatContainer = document.createElement('div');
        chatContainer.id = 'aiCoachChatContainer'; // Changed ID, Matches CSS
        chatContainer.className = 'ai-coach-section'; 
        chatContainer.style.marginTop = '20px';
        chatContainer.style.display = 'flex';
        // Make chat container flexible to fill available space in the panel
        chatContainer.style.flexDirection = 'column';
        chatContainer.style.flexGrow = '1'; 
        chatContainer.style.minHeight = '0'; // Important for flex children to not overflow


        chatContainer.innerHTML = `
            <h4>Chat with ${chatWithTitle}</h4>
            <div id="aiCoachChatStats" style="font-size: 0.85em; color: #666; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                <span id="aiCoachChatCount">Loading chat...</span>
                <div style="display: flex; gap: 10px;">
                    <span id="aiCoachLikedCount" style="color: #e74c3c; display: inline-flex; align-items:center;"> 
                        <span class="like-icon">❤️</span> <span id="likedCountNumber">0</span> liked
                    </span>
                    <button id="aiCoachClearOldChatsBtn" class="p-button p-component p-button-sm p-button-text" style="display:none;">Clear Old Chats</button>
                </div>
            </div>
            <div id="aiCoachChatDisplay" style="flex-grow:1; min-height: 200px; overflow-y: auto; border: 1px solid #ccc; padding: 10px; margin-bottom:10px; background:#fff;">
                <p class="ai-chat-message ai-chat-message-bot" data-message-id="initial-bot-message"><em>${chatWithTitle}:</em> Hello! I'm here to help you explore your VESPA profile. What's on your mind?</p>
            </div>
            <div style="margin: 10px 0;">
                 <button id="aiCoachProblemButton" class="p-button p-component" style="width:100%; font-size:0.9em;">🤔 What area to focus on?</button>
            </div>
            <div style="display: flex; gap: 10px; margin-top:auto;"> 
                <input type="text" id="aiCoachChatInput" placeholder="Ask me anything about VESPA..." style="flex-grow:1; padding:10px; border-radius:4px; border:1px solid #ccc;">
                <button id="aiCoachChatSendButton" class="p-button p-component">Send</button>
            </div>
            <div id="aiCoachChatThinkingIndicator" class="thinking-pulse" style="display: none; text-align:center; margin-top:5px; color:#3498db;">${chatWithTitle} is thinking<span class="thinking-dots"><span>.</span><span>.</span><span>.</span></span></div>
        `;
        panelContentElement.appendChild(chatContainer);

        const chatInput = document.getElementById('aiCoachChatInput'); // Changed ID
        const chatSendButton = document.getElementById('aiCoachChatSendButton'); // Changed ID
        const chatDisplay = document.getElementById('aiCoachChatDisplay'); // Changed ID
        const thinkingIndicator = document.getElementById('aiCoachChatThinkingIndicator'); // Changed ID
        const problemButton = document.getElementById('aiCoachProblemButton'); // Changed ID
        const chatCountElement = document.getElementById('aiCoachChatCount'); // Changed ID
        const likedCountNumberElement = document.getElementById('likedCountNumber'); // Changed ID 
        // const clearOldChatsBtn = document.getElementById('aiCoachClearOldChatsBtn'); // Changed ID
        
        if (problemButton) {
            problemButton.addEventListener('click', () => {
                showProblemSelectorModal(studentCommonProblems, chatInput); // studentCommonProblems defined elsewhere
            });
        }
        
        // Function to create and add like button to a message element
        function addLikeButtonToMessage(messageElement, messageId, isLikedInitially) {
            if (!messageId || messageElement.querySelector('.ai-chat-like-btn')) return; // Don't add if no ID or button exists

            const likeButton = document.createElement('button');
            likeButton.className = 'ai-chat-like-btn';
            likeButton.setAttribute('aria-label', isLikedInitially ? 'Unlike message' : 'Like message');
            likeButton.innerHTML = `<span class="like-icon ${isLikedInitially ? 'liked' : 'unliked'}">❤️</span>`; // Heart emoji
            
            likeButton.addEventListener('click', () => handleLikeButtonClick(messageId, likeButton, messageElement));
            messageElement.appendChild(likeButton);
        }

        // Add like button to the initial bot message (if it should be likeable)
        const initialBotMsgElement = chatDisplay.querySelector('[data-message-id="initial-bot-message"]');
        if (initialBotMsgElement) {
            // For initial message, we don't have a Knack ID, so liking won't persist unless we create one for it.
            // For now, let's assume initial messages are not likeable or handle differently.
            // addLikeButtonToMessage(initialBotMsgElement, 'initial-bot-message', false);
        }
        
        loadStudentChatHistory();

        async function sendChatMessage() {
            const messageText = chatInput.value.trim();
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
                .filter(el => el !== userMessageElement && el.id !== 'aiCoachTempInlineThinkingMessage') // Exclude current input and any temporary thinking message
                .map(el => ({
                    role: el.classList.contains('ai-chat-message-bot') ? 'assistant' : 'user',
                    content: el.textContent.replace(/^(My AI Coach:|You:|${chatWithTitle}:)\s*/, '') // Strip prefix for history
                }));
            
            // Add inline thinking message (similar to tutor coach)
            const inlineThinkingMessage = document.createElement('div');
            inlineThinkingMessage.id = 'aiCoachTempInlineThinkingMessage'; // Changed ID
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
                botMessageElement.setAttribute('data-message-id', data.ai_message_knack_id || `bot-${Date.now()}`); // Use Knack ID if available
                
                let processedResponse = data.ai_response;
                const suggestedActivities = data.suggested_activities_in_chat || [];
                
                suggestedActivities.forEach(activity => {
                    const activityPattern = new RegExp(activity.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'); // Escape name for regex
                    processedResponse = processedResponse.replace(activityPattern, 
                        // Using student-coach-activity-link class for styling
                        `<a href="#" class="student-coach-activity-link" data-activity='${JSON.stringify(activity).replace(/'/g, '&apos;')}'>${activity.name}</a>`
                    );
                });
                botMessageElement.innerHTML = `<em>${chatWithTitle}:</em> ${processedResponse}`;
                chatDisplay.appendChild(botMessageElement);

                if (data.ai_message_knack_id) {
                    addLikeButtonToMessage(botMessageElement, data.ai_message_knack_id, false); // Add like button, initially unliked
                }
                
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

    // --- NEW: Function to handle like button clicks ---
    async function handleLikeButtonClick(messageKnackId, likeButtonElement, messageElement) {
        if (!messageKnackId || messageKnackId.startsWith('initial-') || messageKnackId.startsWith('bot-')) {
            logStudentCoach("Like button clicked for a message without a persistent Knack ID. Cannot save like.");
            // Optionally, provide some visual feedback even if it can't be saved
            const icon = likeButtonElement.querySelector('.like-icon');
            if (icon) {
                icon.classList.toggle('liked');
                icon.classList.toggle('unliked');
                likeButtonElement.setAttribute('aria-label', icon.classList.contains('liked') ? 'Unlike message' : 'Like message');
            }
            return;
        }

        const icon = likeButtonElement.querySelector('.like-icon');
        const currentlyLiked = icon.classList.contains('liked');
        const newLikeStatus = !currentlyLiked;

        // Optimistically update UI
        icon.classList.toggle('liked', newLikeStatus);
        icon.classList.toggle('unliked', !newLikeStatus);
        likeButtonElement.setAttribute('aria-label', newLikeStatus ? 'Unlike message' : 'Like message');
        if (newLikeStatus) {
            icon.style.transform = 'scale(1.2) rotate(5deg)'; setTimeout(() => icon.style.transform = 'scale(1.1)', 150);
        } else {
            icon.style.transform = 'scale(1)';
        }
        updateOverallLikedCount(newLikeStatus ? 1 : -1); // Adjust overall count

        try {
            logStudentCoach(`Toggling like for message ${messageKnackId} to ${newLikeStatus}`);
            const response = await fetch(`${STUDENT_COACH_API_BASE_URL}/chat_message_like_toggle`, { // New endpoint
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    message_knack_id: messageKnackId, 
                    like_status: newLikeStatus
                }),
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`API Error (${response.status}): ${errorData.error || 'Failed to toggle like'}`);
            }
            const result = await response.json();
            logStudentCoach("Like status updated successfully in backend:", result);
            // Update data attribute on message element for persistence if needed for other logic
            messageElement.setAttribute('data-is-liked', newLikeStatus.toString());

        } catch (error) {
            logStudentCoach("Error toggling like status:", error);
            // Revert optimistic UI update on error
            icon.classList.toggle('liked', !newLikeStatus); // Revert to original state
            icon.classList.toggle('unliked', newLikeStatus);
            likeButtonElement.setAttribute('aria-label', !newLikeStatus ? 'Unlike message' : 'Like message');
            icon.style.transform = 'scale(1)';
            updateOverallLikedCount(newLikeStatus ? -1 : 1); // Revert count adjustment
            // Optionally, inform the user
            // alert("Sorry, couldn't save your preference for this message.");
        }
    }

    // --- NEW: Function to update the overall liked count in the UI ---
    function updateOverallLikedCount(change) { // change is +1 or -1
        const likedCountNumberElement = document.getElementById('likedCountNumber');
        if (likedCountNumberElement) {
            let currentCount = parseInt(likedCountNumberElement.textContent, 10) || 0;
            currentCount += change;
            if (currentCount < 0) currentCount = 0; // Ensure count doesn't go below zero
            likedCountNumberElement.textContent = currentCount;
            // Show/hide the liked count span if needed (e.g., hide if 0)
            const likedCountSpan = document.getElementById('aiCoachLikedCount');
            if(likedCountSpan) likedCountSpan.style.display = currentCount > 0 ? 'inline-flex' : 'inline-flex'; // Always show for now
        }
    }

    // --- NEW: Function to load and display student chat history ---
    async function loadStudentChatHistory() {
        const chatDisplay = document.getElementById('aiCoachChatDisplay'); // Changed ID
        const chatCountElement = document.getElementById('aiCoachChatCount'); // Changed ID
        const likedCountNumberElement = document.getElementById('likedCountNumber'); // Changed ID
        const likedCountSpan = document.getElementById('aiCoachLikedCount'); // Changed ID

        // Derive chatWithTitle from available data, defaulting if necessary
        const studentNameForTitle = (currentLLMInsightsForChat && currentLLMInsightsForChat.student_name && currentLLMInsightsForChat.student_name !== "N/A") 
            ? currentLLMInsightsForChat.student_name 
            : (STUDENT_COACH_LAUNCHER_CONFIG && STUDENT_COACH_LAUNCHER_CONFIG.studentNameForChat) 
                ? STUDENT_COACH_LAUNCHER_CONFIG.studentNameForChat
                : "My AI Coach";
        const chatWithTitle = studentNameForTitle.split(' ')[0] || "My AI Coach";

        logStudentCoach("loadStudentChatHistory: Called", { 
            hasChatDisplay: !!chatDisplay, 
            hasStudentId: !!lastFetchedStudentKnackId, 
            chatWithTitle: chatWithTitle 
        });

        if (!chatDisplay || !lastFetchedStudentKnackId) {
            logStudentCoach("loadStudentChatHistory: Aborting - chatDisplay or lastFetchedStudentKnackId missing.");
            if (chatCountElement) chatCountElement.textContent = 'Chat context unavailable.';
            if (likedCountNumberElement) likedCountNumberElement.textContent = '0';
            if (likedCountSpan) likedCountSpan.style.display = 'inline-flex'; // Keep it visible but with 0
            return;
        }

        chatDisplay.innerHTML = '<div class="loader"></div><p style="text-align:center;">Loading your chat history...</p>';
        if (chatCountElement) chatCountElement.textContent = 'Loading history...';
        if (likedCountNumberElement) likedCountNumberElement.textContent = '-';
        if (likedCountSpan) likedCountSpan.style.display = 'inline-flex'; // Show loading state

        try {
            logStudentCoach(`loadStudentChatHistory: Fetching for student ID: ${lastFetchedStudentKnackId}`);
            const response = await fetch(CHAT_HISTORY_ENDPOINT, { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    student_knack_id: lastFetchedStudentKnackId,
                    max_messages: 50, 
                    initial_ai_context: currentLLMInsightsForChat 
                })
            });

            chatDisplay.innerHTML = ''; // Clear loader/previous messages

            if (!response.ok) {
                const errorText = await response.text();
                logStudentCoach("loadStudentChatHistory: API Error", { status: response.status, text: errorText });
                throw new Error(`Chat History API Error (${response.status}): ${errorText || response.statusText}`);
            }
            const data = await response.json();
            logStudentCoach("loadStudentChatHistory: Successfully loaded history", data);

            let totalLikesInHistory = 0;

            if (data.chat_history && data.chat_history.length > 0) {
                data.chat_history.forEach(msg => {
                    const messageElement = document.createElement('p');
                    messageElement.className = `ai-chat-message ai-chat-message-${msg.role === 'assistant' ? 'bot' : 'user'}`;
                    messageElement.setAttribute('data-message-id', msg.id || `${msg.role}-${Date.now()}-${Math.random()}`);
                    messageElement.setAttribute('data-is-liked', msg.is_liked ? msg.is_liked.toString() : 'false');
                    
                    const authorPrefix = msg.role === 'assistant' ? (chatWithTitle) : "You";
                    messageElement.innerHTML = `<em>${authorPrefix}:</em> ${msg.content}`;
                    chatDisplay.appendChild(messageElement);

                    if (msg.role === 'assistant' && msg.id) { 
                        addLikeButtonToMessage(messageElement, msg.id, msg.is_liked || false);
                        if (msg.is_liked) totalLikesInHistory++;
                    }
                });
            } else {
                logStudentCoach("loadStudentChatHistory: No chat history messages found in response data.");
                const initialBotMsgElement = document.createElement('p');
                initialBotMsgElement.className = 'ai-chat-message ai-chat-message-bot';
                initialBotMsgElement.setAttribute('data-message-id', 'initial-bot-message');
                initialBotMsgElement.innerHTML = `<em>${chatWithTitle}:</em> Hello! I'm here to help you explore your VESPA profile. What's on your mind?`;
                chatDisplay.appendChild(initialBotMsgElement);
            }
            
            if (chatCountElement) chatCountElement.textContent = `${data.total_count || 0} messages`;
            const finalLikedCount = data.liked_count !== undefined ? data.liked_count : totalLikesInHistory;
            if (likedCountNumberElement) likedCountNumberElement.textContent = finalLikedCount;
            if (likedCountSpan) likedCountSpan.style.display = 'inline-flex'; // Always show after loading

            chatDisplay.scrollTop = chatDisplay.scrollHeight;
            logStudentCoach("loadStudentChatHistory: UI updated with history.");

        } catch (error) {
            logStudentCoach("loadStudentChatHistory: Error during fetch or processing", error);
            chatDisplay.innerHTML = '<p style="color:red; text-align:center;">Could not load your chat history. Please try again later.</p>';
            if (chatCountElement) chatCountElement.textContent = 'History unavailable';
            if (likedCountNumberElement) likedCountNumberElement.textContent = '0';
            if (likedCountSpan) likedCountSpan.style.display = 'inline-flex'; // Keep visible with 0
        }
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
        const chartContainerId = 'vespaComparisonChartContainer'; // Changed ID
        const chartCanvasId = 'vespaStudentVsSchoolChart'; // Changed ID
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
        const chartContainerId = 'questionnaireResponseDistributionChartContainer'; // Changed ID
        const chartCanvasId = 'questionnaireDistributionPieChartCanvas'; // Changed ID
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
        const modalId = 'aiCoachProblemModal'; // Changed ID
        const existingModal = document.getElementById(modalId);
        if (existingModal) existingModal.remove();
        
        const modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'ai-coach-modal-overlay'; // Changed Class
        
        const modalContent = document.createElement('div');
        modalContent.className = 'ai-coach-modal-content'; // Changed Class
        
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
        const modalId = 'aiCoachActivityModal'; // Changed ID
        const existingModal = document.getElementById(modalId);
        if (existingModal) existingModal.remove();

        const modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'ai-coach-modal-overlay'; // Changed Class
        // Basic styling for overlay - detailed styling in CSS
        modal.style.cssText = ` 
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.7); z-index: 2000; display: flex;
            align-items: center; justify-content: center; opacity: 0; transition: opacity 0.3s ease;
        `;
        const modalContent = document.createElement('div');
        modalContent.className = 'ai-coach-modal-content'; // Changed Class
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
