/// AI Coach Launcher Script (aiCoachLauncher.js)

// Guard to prevent re-initialization
if (window.aiCoachLauncherInitialized) {
    console.warn("[AICoachLauncher] Attempted to re-initialize. Skipping.");
} else {
    window.aiCoachLauncherInitialized = true;

    let AI_COACH_LAUNCHER_CONFIG = null;
    let coachObserver = null;
    let coachUIInitialized = false;
    let debouncedObserverCallback = null; // For debouncing mutation observer
    let eventListenersAttached = false; // ADDED: Module-scoped flag for event listeners
    let currentFetchAbortController = null; // ADD THIS
    let lastFetchedStudentId = null; // ADD THIS to track the ID for which data was last fetched
    let observerLastProcessedStudentId = null; // ADD THIS: Tracks ID processed by observer
    let currentlyFetchingStudentId = null; // ADD THIS
    let vespaChartInstance = null; // To keep track of the chart instance for updates/destruction
    let currentLLMInsightsForChat = null; // ADDED: To store insights for chat context
    let questionnairePieChartInstance = null; // Added from latest

    // --- Configuration ---
    const HEROKU_API_BASE_URL = 'https://vespa-coach-c64c795edaa7.herokuapp.com/api/v1'; // MODIFIED for base path
    const COACHING_SUGGESTIONS_ENDPOINT = `${HEROKU_API_BASE_URL}/coaching_suggestions`;
    const CHAT_TURN_ENDPOINT = `${HEROKU_API_BASE_URL}/chat_turn`;
    // Knack App ID and API Key are expected in AI_COACH_LAUNCHER_CONFIG if any client-side Knack calls were needed,
    // but with the new approach, getStudentObject10RecordId will primarily rely on a global variable.

    function logAICoach(message, data) {
        // Temporarily log unconditionally for debugging
        console.log(`[AICoachLauncher] ${message}`, data === undefined ? '' : data);
        // if (AI_COACH_LAUNCHER_CONFIG && AI_COACH_LAUNCHER_CONFIG.debugMode) {
        //     console.log(`[AICoachLauncher] ${message}`, data === undefined ? '' : data);
        // }
    }

    // Function to ensure Chart.js is loaded
    function ensureChartJsLoaded(callback) {
        if (typeof Chart !== 'undefined') {
            logAICoach("Chart.js already loaded.");
            if (callback) callback();
            return;
        }
        logAICoach("Chart.js not found, attempting to load from CDN...");
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js@3.7.1/dist/chart.min.js';
        script.onload = () => {
            logAICoach("Chart.js loaded successfully from CDN.");
            if (callback) callback();
        };
        script.onerror = () => {
            console.error("[AICoachLauncher] Failed to load Chart.js from CDN.");
            // Optionally, display an error in the chart container
            const chartContainer = document.getElementById('vespaComparisonChartContainer');
            if(chartContainer) chartContainer.innerHTML = '<p style="color:red; text-align:center;">Chart library failed to load.</p>';
        };
        document.head.appendChild(script);
    }

    // Function to check if we are on the individual student report view
    function isIndividualReportView() {
        const studentNameDiv = document.querySelector('#student-name p'); // More specific selector for the student name paragraph
        const backButton = document.querySelector('a.kn-back-link'); // General Knack back link
        
        if (studentNameDiv && studentNameDiv.textContent && studentNameDiv.textContent.includes('STUDENT:')) {
            logAICoach("Individual report view confirmed by STUDENT: text in #student-name.");
            return true;
        }
        // Fallback to back button if the #student-name structure changes or isn't specific enough
        if (backButton && document.body.contains(backButton)) { 
             logAICoach("Individual report view confirmed by BACK button presence.");
            return true;
        }
        logAICoach("Not on individual report view.");
        return false;
    }

    // Function to initialize the UI elements (button and panel)
    function initializeCoachUI() {
        if (coachUIInitialized && document.getElementById(AI_COACH_LAUNCHER_CONFIG.aiCoachToggleButtonId)) {
            logAICoach("Coach UI appears to be already initialized with a button. Skipping full re-initialization.");
            // If UI is marked initialized and button exists, critical parts are likely fine.
            // Data refresh is handled by observer logic or toggleAICoachPanel.
            return;
        }

        logAICoach("Conditions met. Initializing AI Coach UI (button and panel).");
        addAICoachStyles();
        createAICoachPanel();
        addLauncherButton();
        setupEventListeners();
        coachUIInitialized = true; // Mark as initialized
        logAICoach("AICoachLauncher UI initialization complete.");
    }
    
    // Function to clear/hide the UI elements when not on individual report
    function clearCoachUI() {
        if (!coachUIInitialized) return;
        logAICoach("Clearing AI Coach UI.");
        const launcherButtonContainer = document.getElementById('aiCoachLauncherButtonContainer');
        if (launcherButtonContainer) {
            launcherButtonContainer.innerHTML = ''; // Clear the button
        }
        toggleAICoachPanel(false); // Ensure panel is closed
        // Optionally, remove the panel from DOM if preferred when navigating away
        // const panel = document.getElementById(AI_COACH_LAUNCHER_CONFIG.aiCoachPanelId);
        // if (panel && panel.parentNode) panel.parentNode.removeChild(panel);
        coachUIInitialized = false; // Reset for next individual report view
        lastFetchedStudentId = null; 
        observerLastProcessedStudentId = null; // ADD THIS: Reset when UI is cleared
        currentlyFetchingStudentId = null; // ADD THIS: Clear if ID becomes null
        if (currentFetchAbortController) { 
            currentFetchAbortController.abort();
            currentFetchAbortController = null;
            logAICoach("Aborted ongoing fetch as UI was cleared (not individual report).");
        }
    }

    function initializeAICoachLauncher() {
        logAICoach("AICoachLauncher initializing and setting up observer...");

        if (typeof window.AI_COACH_LAUNCHER_CONFIG === 'undefined') {
            console.error("[AICoachLauncher] AI_COACH_LAUNCHER_CONFIG is not defined. Cannot initialize.");
            return;
        }
        AI_COACH_LAUNCHER_CONFIG = window.AI_COACH_LAUNCHER_CONFIG;
        logAICoach("Config loaded:", AI_COACH_LAUNCHER_CONFIG);

        if (!AI_COACH_LAUNCHER_CONFIG.elementSelector || 
            !AI_COACH_LAUNCHER_CONFIG.aiCoachPanelId ||
            !AI_COACH_LAUNCHER_CONFIG.aiCoachToggleButtonId ||
            !AI_COACH_LAUNCHER_CONFIG.mainContentSelector) {
            console.error("[AICoachLauncher] Essential configuration properties missing.");
            return;
        }

        const targetNode = document.querySelector('#kn-scene_1095'); // Observe the scene for changes

        if (!targetNode) {
            console.error("[AICoachLauncher] Target node for MutationObserver not found (#kn-scene_1095).");
            return;
        }

        // Debounce utility
        function debounce(func, wait) {
            let timeout;
            return function(...args) {
                const context = this;
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(context, args), wait);
            };
        }

        const observerCallback = function(mutationsList, observer) {
            logAICoach("MutationObserver detected DOM change (raw event).");
            const currentStudentIdFromWindow = window.currentReportObject10Id;

            if (isIndividualReportView()) {
                const panelIsActive = document.body.classList.contains('ai-coach-active');
                if (!coachUIInitialized) { 
                    initializeCoachUI();
                } else if (panelIsActive) { 
                    // Only refresh if the student ID has actually changed from the observer's last processed ID
                    if (currentStudentIdFromWindow && currentStudentIdFromWindow !== observerLastProcessedStudentId) {
                        logAICoach(`Observer: Student ID changed from ${observerLastProcessedStudentId} to ${currentStudentIdFromWindow}. Triggering refresh.`);
                        observerLastProcessedStudentId = currentStudentIdFromWindow; // Update before refresh
                        refreshAICoachData(); 
                    } else if (!currentStudentIdFromWindow && observerLastProcessedStudentId !== null) {
                        // Case: Student ID became null (e.g., navigating away from a specific student but still on a report page somehow)
                        logAICoach(`Observer: Student ID became null. Previously ${observerLastProcessedStudentId}. Clearing UI.`);
                        observerLastProcessedStudentId = null;
                        clearCoachUI(); // Or handle as appropriate, maybe refreshAICoachData will show error.
                    } else if (currentStudentIdFromWindow && currentStudentIdFromWindow === observerLastProcessedStudentId){
                        logAICoach(`Observer: Student ID ${currentStudentIdFromWindow} is the same as observerLastProcessedStudentId. No refresh from observer.`);
                    }
                }
            } else {
                if (observerLastProcessedStudentId !== null) { // Only clear if we were previously tracking a student
                    logAICoach("Observer: Not on individual report view. Clearing UI and resetting observer ID.");
                    observerLastProcessedStudentId = null;
                    clearCoachUI();
                }
            }
        };

        // Use a debounced version of the observer callback
        debouncedObserverCallback = debounce(function() {
            logAICoach("MutationObserver processing (debounced).");
            const currentStudentIdFromWindow = window.currentReportObject10Id;

            if (isIndividualReportView()) {
                const panelIsActive = document.body.classList.contains('ai-coach-active');
                if (!coachUIInitialized) { 
                    initializeCoachUI();
                } else if (panelIsActive) { 
                    // Only refresh if the student ID has actually changed from the observer's last processed ID
                    if (currentStudentIdFromWindow && currentStudentIdFromWindow !== observerLastProcessedStudentId) {
                        logAICoach(`Observer: Student ID changed from ${observerLastProcessedStudentId} to ${currentStudentIdFromWindow}. Triggering refresh.`);
                        observerLastProcessedStudentId = currentStudentIdFromWindow; // Update before refresh
                        refreshAICoachData(); 
                    } else if (!currentStudentIdFromWindow && observerLastProcessedStudentId !== null) {
                        // Case: Student ID became null (e.g., navigating away from a specific student but still on a report page somehow)
                        logAICoach(`Observer: Student ID became null. Previously ${observerLastProcessedStudentId}. Clearing UI.`);
                        observerLastProcessedStudentId = null;
                        clearCoachUI(); // Or handle as appropriate, maybe refreshAICoachData will show error.
                    } else if (currentStudentIdFromWindow && currentStudentIdFromWindow === observerLastProcessedStudentId){
                        logAICoach(`Observer: Student ID ${currentStudentIdFromWindow} is the same as observerLastProcessedStudentId. No refresh from observer.`);
                    }
                }
            } else {
                if (observerLastProcessedStudentId !== null) { // Only clear if we were previously tracking a student
                    logAICoach("Observer: Not on individual report view. Clearing UI and resetting observer ID.");
                    observerLastProcessedStudentId = null;
                    clearCoachUI();
                }
            }
        }, 750); // Debounce for 750ms

        coachObserver = new MutationObserver(observerCallback); // Use the raw, non-debounced one
        coachObserver.observe(targetNode, { childList: true, subtree: true });

        // Initial check in case the page loads directly on an individual report
        if (isIndividualReportView()) {
            initializeCoachUI();
        }
    }

    // MODIFIED: Links to external CSS
    function addAICoachStyles() {
        const styleId = 'ai-coach-external-styles'; 
        if (document.getElementById(styleId)) {
            logAICoach("AI Coach external styles already linked.");
            return;
        }
        const oldInlineStyleElement = document.getElementById('ai-coach-styles'); // ID used in original latestaiCoachLauncher.js
        if (oldInlineStyleElement) {
            oldInlineStyleElement.parentNode.removeChild(oldInlineStyleElement);
            logAICoach("Removed old inline AI Coach styles.");
        }
        const linkElement = document.createElement('link');
        linkElement.id = styleId;
        linkElement.rel = 'stylesheet';
        linkElement.type = 'text/css';
        linkElement.href = 'https://cdn.jsdelivr.net/gh/4Sighteducation/FlashcardLoader@main/integrations/report/aiCoachLauncher1a.css';
        document.head.appendChild(linkElement);
        logAICoach("AICoachLauncher external styles linked from: " + linkElement.href);
    }

    // MODIFIED: Includes #aiCoachPanelContentContainer wrapper and adds .ai-coach-panel-main class
    function createAICoachPanel() {
        const panelId = AI_COACH_LAUNCHER_CONFIG.aiCoachPanelId;
        if (document.getElementById(panelId)) {
            logAICoach("AI Coach panel already exists.");
            return;
        }
        const panel = document.createElement('div');
        panel.id = panelId; // Set the ID from config
        panel.classList.add('ai-coach-panel-main'); // Add the static class for CSS targeting
        panel.innerHTML = `
            <div class="ai-coach-panel-header">
                <h3>VESPA AI Coaching Assistant</h3>
                <button class="ai-coach-close-btn" aria-label="Close AI Coach Panel">&times;</button>
            </div>
            <div id="aiCoachPanelContentContainer"> 
                <div class="ai-coach-panel-content"> 
                    <p>Activate the AI Coach to get insights.</p>
                </div>
            </div>
        `;
        document.body.appendChild(panel);
        logAICoach("AI Coach panel created with content container.");
    }

    function addLauncherButton() {
        const targetElement = document.querySelector(AI_COACH_LAUNCHER_CONFIG.elementSelector);
        if (!targetElement) {
            console.error(`[AICoachLauncher] Launcher button target element '${AI_COACH_LAUNCHER_CONFIG.elementSelector}' not found.`);
            return;
        }

        let buttonContainer = document.getElementById('aiCoachLauncherButtonContainer');
        
        // If the main button container div doesn't exist within the targetElement, create it.
        if (!buttonContainer) {
            buttonContainer = document.createElement('div');
            buttonContainer.id = 'aiCoachLauncherButtonContainer';
            // Clear targetElement before appending to ensure it only contains our button container.
            // This assumes targetElement is designated EXCLUSIVELY for the AI Coach button.
            // If targetElement can have other dynamic content, this approach needs refinement.
            targetElement.innerHTML = ''; // Clear previous content from target
            targetElement.appendChild(buttonContainer);
            logAICoach("Launcher button container DIV created in target: " + AI_COACH_LAUNCHER_CONFIG.elementSelector);
        }

        // Now, populate/repopulate the buttonContainer if the button itself is missing.
        // clearCoachUI empties buttonContainer.innerHTML.
        if (!buttonContainer.querySelector(`#${AI_COACH_LAUNCHER_CONFIG.aiCoachToggleButtonId}`)) {
            const buttonContentHTML = `
                <p>Get AI-powered insights and suggestions to enhance your coaching conversation.</p>
                <button id="${AI_COACH_LAUNCHER_CONFIG.aiCoachToggleButtonId}" class="p-button p-component">🚀 Activate AI Coach</button>
            `;
            buttonContainer.innerHTML = buttonContentHTML;
            logAICoach("Launcher button content added/re-added to container.");
        } else {
            logAICoach("Launcher button content already present in container.");
        }
    }

    async function getStudentObject10RecordId(retryCount = 0) {
        logAICoach("Attempting to get student_object10_record_id from global variable set by ReportProfiles script...");

        if (window.currentReportObject10Id) {
            logAICoach("Found student_object10_record_id in window.currentReportObject10Id: " + window.currentReportObject10Id);
            return window.currentReportObject10Id;
        } else if (retryCount < 5) { // Retry up to 5 times (e.g., 5 * 500ms = 2.5 seconds)
            logAICoach(`student_object10_record_id not found. Retrying in 500ms (Attempt ${retryCount + 1}/5)`);
            await new Promise(resolve => setTimeout(resolve, 500));
            return getStudentObject10RecordId(retryCount + 1);
        } else {
            logAICoach("Warning: student_object10_record_id not found in window.currentReportObject10Id after multiple retries. AI Coach may not function correctly if ReportProfiles hasn't set this.");
            // Display a message in the panel if the ID isn't found.
            const panelContent = document.querySelector(`#${AI_COACH_LAUNCHER_CONFIG.aiCoachPanelId} .ai-coach-panel-content`);
            if(panelContent) {
                // Avoid overwriting a more specific error already shown by a failed Knack API call if we were to reinstate it.
                if (!panelContent.querySelector('.ai-coach-section p[style*="color:red"], .ai-coach-section p[style*="color:orange"] ')) {
                    panelContent.innerHTML = '<div class="ai-coach-section"><p style="color:orange;">Could not automatically determine the specific VESPA report ID for this student. Ensure student profile data is fully loaded.</p></div>';
                }
            }
            return null; // Important to return null so fetchAICoachingData isn't called with undefined.
        }
    }

    async function fetchAICoachingData(studentId) {
        const panelContent = document.querySelector(`#${AI_COACH_LAUNCHER_CONFIG.aiCoachPanelId} .ai-coach-panel-content`);
        if (!panelContent) return;

        if (!studentId) { 
             logAICoach("fetchAICoachingData called with no studentId. Aborting.");
             if(panelContent && !panelContent.querySelector('.ai-coach-section p[style*="color:red"], .ai-coach-section p[style*="color:orange"] ')) {
                panelContent.innerHTML = '<div class="ai-coach-section"><p style="color:orange;">Student ID missing, cannot fetch AI coaching data.</p></div>';
             }
             return;
        }

        // If already fetching for this specific studentId, don't start another one.
        if (currentlyFetchingStudentId === studentId) {
            logAICoach(`fetchAICoachingData: Already fetching data for student ID ${studentId}. Aborting duplicate call.`);
            return;
        }

        // If there's an ongoing fetch for a *different* student, abort it.
        if (currentFetchAbortController) {
            currentFetchAbortController.abort();
            logAICoach("Aborted previous fetchAICoachingData call for a different student.");
        }
        currentFetchAbortController = new AbortController(); 
        const signal = currentFetchAbortController.signal;

        currentlyFetchingStudentId = studentId; // Mark that we are now fetching for this student

        // Set loader text more judiciously
        if (!panelContent.innerHTML.includes('<div class="loader"></div>')) {
            panelContent.innerHTML = '<div class="loader"></div><p style="text-align:center;">Loading AI Coach insights...</p>';
        }

        try {
            logAICoach("Fetching AI Coaching Data for student_object10_record_id: " + studentId);
            const response = await fetch(COACHING_SUGGESTIONS_ENDPOINT, { // MODIFIED to use constant
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ student_object10_record_id: studentId }),
                signal: signal 
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: "An unknown error occurred."}));
                throw new Error(`API Error (${response.status}): ${errorData.error || errorData.message || response.statusText}`);
            }

            const data = await response.json();
            logAICoach("AI Coaching data received:", data);
            lastFetchedStudentId = studentId; 
            renderAICoachData(data);
            if (data && data.llm_generated_insights) { // Store insights for chat
                currentLLMInsightsForChat = data.llm_generated_insights;
            } else {
                currentLLMInsightsForChat = null;
            }

        } catch (error) {
            if (error.name === 'AbortError') {
                logAICoach('Fetch aborted for student ID: ' + studentId);
            } else {
                logAICoach("Error fetching AI Coaching data:", error);
                // Only update panel if this error wasn't for an aborted old fetch
                if (currentlyFetchingStudentId === studentId) { 
                    panelContent.innerHTML = `<div class="ai-coach-section"><p style="color:red;">Error loading AI Coach insights: ${error.message}</p></div>`;
                }
            }
        } finally {
            // If this fetch (for this studentId) was the one being tracked, clear the tracking flag.
            if (currentlyFetchingStudentId === studentId) {
                currentlyFetchingStudentId = null;
            }
            // If this specific fetch was the one associated with the current controller, nullify it
            if (currentFetchAbortController && currentFetchAbortController.signal === signal) {
                currentFetchAbortController = null;
            }
        }
    }

    // MODIFIED: renderAICoachData now appends to #aiCoachPanelContentContainer and calls checkAndResizeChat
    // The structure of how sections are built and appended is changed to use #aiCoachPanelContentContainer
    function renderAICoachData(data) {
        logAICoach("renderAICoachData CALLED. Data:", data?JSON.parse(JSON.stringify(data)):'No data');
        const panelContentContainer = document.getElementById('aiCoachPanelContentContainer');
        if (!panelContentContainer) {
            logAICoach("Error: aiCoachPanelContentContainer not found for rendering.");
            // Fallback to old panel content if container is missing for some reason, though it shouldn't be
            const oldPanelContent = document.querySelector(`#${AI_COACH_LAUNCHER_CONFIG.aiCoachPanelId} .ai-coach-panel-content`);
            if(oldPanelContent) oldPanelContent.innerHTML = '<p>Error: Panel structure incorrect.</p>';
            return;
        }
        panelContentContainer.innerHTML = ''; // Clear the new main content container

        // AI Student Snapshot part
        const snapshotSection = document.createElement('div');
        snapshotSection.className = 'ai-coach-section';
        snapshotSection.id = 'aiCoachSnapshotSection';
        let snapshotHtml = '<h4>AI Student Snapshot</h4>';
        if (data.llm_generated_insights && data.llm_generated_insights.student_overview_summary) {
            snapshotHtml += `<p>${data.llm_generated_insights.student_overview_summary}</p>`;
        } else if (data.student_name && data.student_name !== "N/A") { 
            snapshotHtml += '<p>AI summary is being generated or is not available for this student.</p>';
        } else {
             snapshotHtml += '<p>No detailed coaching data or student context available. Ensure the report is loaded.</p>';
        }
        snapshotSection.innerHTML = snapshotHtml;
        panelContentContainer.appendChild(snapshotSection);
        
        // Toggle Buttons part
        const toggleButtonsContainer = document.createElement('div');
        toggleButtonsContainer.className = 'ai-coach-section-toggles';
        // Styles for toggleButtonsContainer are in CSS now or can be set via class
        toggleButtonsContainer.innerHTML = `
            <button id="aiCoachToggleVespaButton" class="p-button p-component" aria-expanded="false" aria-controls="aiCoachVespaProfileContainer">
                View VESPA Profile Insights
            </button>
            <button id="aiCoachToggleAcademicButton" class="p-button p-component" aria-expanded="false" aria-controls="aiCoachAcademicProfileContainer">
                View Academic Profile Insights
            </button>
            <button id="aiCoachToggleQuestionButton" class="p-button p-component" aria-expanded="false" aria-controls="aiCoachQuestionAnalysisContainer">
                View Questionnaire Analysis
            </button>
        `;
        panelContentContainer.appendChild(toggleButtonsContainer);

        // Content Divs part (these will be direct children of panelContentContainer)
        const vespaProfileDiv = document.createElement('div');
        vespaProfileDiv.id = 'aiCoachVespaProfileContainer';
        vespaProfileDiv.className = 'ai-coach-details-section ai-coach-section'; 
        vespaProfileDiv.style.display = 'none';
        panelContentContainer.appendChild(vespaProfileDiv);

        const academicProfileDiv = document.createElement('div');
        academicProfileDiv.id = 'aiCoachAcademicProfileContainer';
        academicProfileDiv.className = 'ai-coach-details-section ai-coach-section'; 
        academicProfileDiv.style.display = 'none';
        panelContentContainer.appendChild(academicProfileDiv);

        const questionnaireAnalysisDiv = document.createElement('div');
        questionnaireAnalysisDiv.id = 'aiCoachQuestionAnalysisContainer';
        questionnaireAnalysisDiv.className = 'ai-coach-details-section ai-coach-section'; 
        questionnaireAnalysisDiv.style.display = 'none';
        panelContentContainer.appendChild(questionnaireAnalysisDiv);
        
        // Chat interface container will also be a direct child of panelContentContainer
        const chatInterfaceDiv = document.createElement('div');
        chatInterfaceDiv.id = 'aiCoachChatInterfaceContainer'; // For addChatInterface to target
        panelContentContainer.appendChild(chatInterfaceDiv);

        // --- Conditionally Populate Content Sections (using the divs created above) ---
        if (data.student_name && data.student_name !== "N/A") {
            // Populate VESPA Profile Section
            if (data.llm_generated_insights) { 
                const insights = data.llm_generated_insights;
                let vespaInsightsHtml = '';
                vespaInsightsHtml += '<div id="vespaChartComparativeSection"><h5>Chart & Comparative Data</h5><div id="vespaComparisonChartContainer" style="height: 250px; margin-bottom: 15px; background: #eee; display:flex; align-items:center; justify-content:center;"><p>Comparison Chart Area</p></div>';
                vespaInsightsHtml += insights.chart_comparative_insights ? `<p>${insights.chart_comparative_insights}</p>` : '<p><em>AI insights on chart data are currently unavailable.</em></p>';
                vespaInsightsHtml += '</div><hr style="border-top: 1px dashed #eee; margin: 15px 0;">';
                vespaInsightsHtml += '<div id="vespaCoachingQuestionsSection"><h5>Most Important Coaching Questions</h5>';
                if (insights.most_important_coaching_questions && insights.most_important_coaching_questions.length > 0) {
                    vespaInsightsHtml += '<ul>';
                    insights.most_important_coaching_questions.forEach(q => { vespaInsightsHtml += `<li>${q}</li>`; });
                    vespaInsightsHtml += '</ul>';
                } else { vespaInsightsHtml += '<p><em>AI-selected coaching questions are currently unavailable.</em></p>'; }
                vespaInsightsHtml += '</div><hr style="border-top: 1px dashed #eee; margin: 15px 0;">';
                vespaInsightsHtml += '<div id="vespaStudentCommentsGoalsSection"><h5>Student Comment & Goals Insights</h5>';
                vespaInsightsHtml += insights.student_comment_analysis ? `<p><strong>Comment Analysis:</strong> ${insights.student_comment_analysis}</p>` : '<p><em>AI analysis of student comments is currently unavailable.</em></p>';
                if (insights.suggested_student_goals && insights.suggested_student_goals.length > 0) {
                    vespaInsightsHtml += '<div style="margin-top:10px;"><strong>Suggested Goals:</strong><ul>';
                    insights.suggested_student_goals.forEach(g => { vespaInsightsHtml += `<li>${g}</li>`; });
                    vespaInsightsHtml += '</ul></div>';
                } else { vespaInsightsHtml += '<p style="margin-top:10px;"><em>Suggested goals are currently unavailable.</em></p>'; }
                vespaInsightsHtml += '</div>';
                vespaProfileDiv.innerHTML = vespaInsightsHtml;
                ensureChartJsLoaded(() => { renderVespaComparisonChart(data.vespa_profile, data.school_vespa_averages); });
            } else { 
                vespaProfileDiv.innerHTML = '<p>VESPA insights data not available.</p>';
            }

            // Populate Academic Profile Section (academicContainer is academicProfileDiv)
            let academicHtml = '';
            // ... (rest of the academic profile HTML construction from latestaiCoachLauncher.js, targeting academicProfileDiv.innerHTML) ...
            // Ensure all class="ai-coach-section" are applied if needed for consistent styling within this div
            academicHtml += '<h5>Overall Academic Benchmarks</h5>';
            if (data.academic_megs) {
                academicHtml += `<p><strong>GCSE Prior Attainment Score:</strong> ${data.academic_megs.prior_attainment_score !== undefined && data.academic_megs.prior_attainment_score !== null ? data.academic_megs.prior_attainment_score : 'N/A'}</p>`;
                const hasRelevantALevelMegs = ['aLevel_meg_grade_60th', 'aLevel_meg_grade_75th', 'aLevel_meg_grade_90th', 'aLevel_meg_grade_100th']
                                            .some(key => data.academic_megs[key] && data.academic_megs[key] !== 'N/A');
                if (hasRelevantALevelMegs) {
                    academicHtml += `<h6>A-Level Percentile MEGs (Minimum Expected Grades):</h6>
                                     <ul>
                                         <li><strong>Top 40% (60th):</strong> <strong>${data.academic_megs.aLevel_meg_grade_60th || 'N/A'}</strong> (${data.academic_megs.aLevel_meg_points_60th !== undefined ? data.academic_megs.aLevel_meg_points_60th : 0} pts)</li>
                                         <li><strong>Top 25% (75th - Standard MEG):</strong> <strong>${data.academic_megs.aLevel_meg_grade_75th || 'N/A'}</strong> (${data.academic_megs.aLevel_meg_points_75th !== undefined ? data.academic_megs.aLevel_meg_points_75th : 0} pts)</li>
                                         <li><strong>Top 10% (90th):</strong> <strong>${data.academic_megs.aLevel_meg_grade_90th || 'N/A'}</strong> (${data.academic_megs.aLevel_meg_points_90th !== undefined ? data.academic_megs.aLevel_meg_points_90th : 0} pts)</li>
                                         <li><strong>Top 1% (100th):</strong> <strong>${data.academic_megs.aLevel_meg_grade_100th || 'N/A'}</strong> (${data.academic_megs.aLevel_meg_points_100th !== undefined ? data.academic_megs.aLevel_meg_points_100th : 0} pts)</li>
                                     </ul>`;
                } else { academicHtml += '<p><em>A-Level percentile MEG data not available or not applicable.</em></p>'; }
            } else { academicHtml += '<p><em>Overall academic benchmark data not available.</em></p>'; }
            academicHtml += '<hr style="margin: 15px 0;"><h5>Subject-Specific Benchmarks</h5>';
            if (data.academic_profile_summary && data.academic_profile_summary.length > 0 && 
                !(data.academic_profile_summary.length === 1 && data.academic_profile_summary[0].subject.includes("not found")) &&
                !(data.academic_profile_summary.length === 1 && data.academic_profile_summary[0].subject.includes("No academic subjects parsed"))) {
                let validSubjectsFoundForScales = 0;
                data.academic_profile_summary.forEach((subject, index) => {
                    if (subject && subject.subject && !subject.subject.includes("not found by any method") && !subject.subject.includes("No academic subjects parsed")) {
                        validSubjectsFoundForScales++;
                        const studentFirstName = data.student_name ? data.student_name.split(' ')[0] : "Current";
                        academicHtml += `<div class="subject-benchmark-item">
                                    <div class="subject-benchmark-header"><h5>${subject.subject || 'N/A'} (${subject.normalized_qualification_type || 'Qual Type N/A'})</h5></div>
                                    <p class="subject-grades-info">Current: <strong>${subject.currentGrade || 'N/A'}</strong> (${subject.currentGradePoints !== undefined ? subject.currentGradePoints : 'N/A'} pts) | 
                                        ${subject.normalized_qualification_type === 'A Level' ? 'Top 25% (MEG)' : 'Standard MEG'}: <strong>${subject.standard_meg || 'N/A'}</strong> (${subject.standardMegPoints !== undefined ? subject.standardMegPoints : 'N/A'} pts)
                                    </p>${createSubjectBenchmarkScale(subject, index, studentFirstName)}</div>`; 
                    }
                });
                if (validSubjectsFoundForScales === 0) academicHtml += '<p>No detailed academic subjects with point data found.</p>';
            } else { academicHtml += '<p>No detailed academic profile subjects available.</p>';}
            academicHtml += '<hr style="margin: 15px 0;"><h5>AI Academic Benchmark Analysis</h5>';
            academicHtml += (data.llm_generated_insights && data.llm_generated_insights.academic_benchmark_analysis) ? `<p>${data.llm_generated_insights.academic_benchmark_analysis}</p>` : '<p><em>AI analysis of academic benchmarks is currently unavailable.</em></p>';
            academicProfileDiv.innerHTML = academicHtml;

            // Populate Questionnaire Analysis Section (questionnaireAnalysisDiv)
            let questionHtml = '';
            // ... (rest of the questionnaire analysis HTML construction from latestaiCoachLauncher.js, targeting questionnaireAnalysisDiv.innerHTML) ...
            questionHtml += '<h4>VESPA Questionnaire Analysis</h4><p style="font-size:0.8em; margin-bottom:10px;">(Scale: 1=Strongly Disagree, 5=Strongly Agree)</p>';
            if (data.object29_question_highlights && (data.object29_question_highlights.top_3 || data.object29_question_highlights.bottom_3)) {
                const highlights = data.object29_question_highlights;
                if (highlights.top_3 && highlights.top_3.length > 0) {
                    questionHtml += '<h5>Highest Scoring Responses:</h5><ul>';
                    highlights.top_3.forEach(q => { questionHtml += `<li>"${q.text}" (${q.category}): Response ${q.score}/5</li>`; });
                    questionHtml += '</ul>';
                }
                if (highlights.bottom_3 && highlights.bottom_3.length > 0) {
                    questionHtml += '<h5 style="margin-top:15px;">Lowest Scoring Responses:</h5><ul>';
                    highlights.bottom_3.forEach(q => { questionHtml += `<li>"${q.text}" (${q.category}): Response ${q.score}/5</li>`; });
                    questionHtml += '</ul>';
                }
            } else { questionHtml += "<p>No specific top/bottom statement response highlights processed.</p>"; }
            questionHtml += '<div id="questionnaireResponseDistributionChartContainer" style="height: 300px; margin-top:20px; margin-bottom: 20px; background: #f9f9f9; display:flex; align-items:center; justify-content:center;"><p>Chart loading...</p></div>';
            if (data.llm_generated_insights && data.llm_generated_insights.questionnaire_interpretation_and_reflection_summary) {
                questionHtml += `<div style='margin-top:15px;'><h5>Reflections on the VESPA Questionnaire</h5><p>${data.llm_generated_insights.questionnaire_interpretation_and_reflection_summary}</p></div>`;
            } else { questionHtml += "<div style='margin-top:15px;'><h5>Reflections on the VESPA Questionnaire</h5><p><em>AI analysis is currently unavailable.</em></p></div>";}
            questionnaireAnalysisDiv.innerHTML = questionHtml;
            const chartDiv = document.getElementById('questionnaireResponseDistributionChartContainer');
            if (data.all_scored_questionnaire_statements && data.all_scored_questionnaire_statements.length > 0) {
                ensureChartJsLoaded(() => { renderQuestionnaireDistributionChart(data.all_scored_questionnaire_statements); });
            } else if (chartDiv) {
                chartDiv.innerHTML = '<p style="text-align:center;">Questionnaire data not available for chart.</p>';
            }

        } else { // Handle case where student_name is N/A or data is incomplete
            vespaProfileDiv.innerHTML = '<div class="ai-coach-section"><p>Student data not fully available.</p></div>';
            academicProfileDiv.innerHTML = '<div class="ai-coach-section"><p>Student data not fully available.</p></div>';
            questionnaireAnalysisDiv.innerHTML = '<div class="ai-coach-section"><p>Student data not fully available.</p></div>';
        }

        // Add Event Listeners for Toggle Buttons
        const toggleButtons = [
            { id: 'aiCoachToggleVespaButton', containerId: 'aiCoachVespaProfileContainer' },
            { id: 'aiCoachToggleAcademicButton', containerId: 'aiCoachAcademicProfileContainer' },
            { id: 'aiCoachToggleQuestionButton', containerId: 'aiCoachQuestionAnalysisContainer' }
        ];
        toggleButtons.forEach(btnConfig => {
            const button = document.getElementById(btnConfig.id);
            const detailsContainer = document.getElementById(btnConfig.containerId);
            if (button && detailsContainer) {
                button.addEventListener('click', () => {
                    const allDetailSections = panelContentContainer.querySelectorAll('.ai-coach-details-section');
                    const isCurrentlyVisible = detailsContainer.style.display === 'block';
                    allDetailSections.forEach(section => {
                        if (section.id !== btnConfig.containerId) section.style.display = 'none';
                    });
                    toggleButtons.forEach(b => { // Reset other buttons
                        if (b.id !== btnConfig.id) {
                            const otherBtn = document.getElementById(b.id);
                            if (otherBtn) {
                                otherBtn.textContent = `View ${b.id.replace('aiCoachToggle', '').replace('Button','')} Insights`;
                                otherBtn.setAttribute('aria-expanded', 'false');
                            }
                        }
                    });
                    if (isCurrentlyVisible) {
                        detailsContainer.style.display = 'none';
                        button.textContent = `View ${btnConfig.id.replace('aiCoachToggle', '').replace('Button','')} Insights`;
                        button.setAttribute('aria-expanded', 'false');
                    } else {
                        detailsContainer.style.display = 'block';
                        button.textContent = `Hide ${btnConfig.id.replace('aiCoachToggle', '').replace('Button','')} Insights`;
                        button.setAttribute('aria-expanded', 'true');
                    }
                    checkAndResizeChat(); // Call resize function here
                });
            }
        });

        // Add Chat Interface (now targets chatInterfaceDiv inside panelContentContainer)
        if (data.student_name && data.student_name !== "N/A") {
            addChatInterface(chatInterfaceDiv, data.student_name);
        } else {
            chatInterfaceDiv.innerHTML = '<div class="ai-coach-section"><p>Chat unavailable: Student data missing.</p></div>';
            logAICoach("Chat interface not added due to missing student context.");
        }
        checkAndResizeChat(); // Initial call after everything is rendered
    }

    // MODIFIED: toggleAICoachPanel now also adds/removes .ai-coach-main-content-area
    async function toggleAICoachPanel(show) { 
        const panel = document.getElementById(AI_COACH_LAUNCHER_CONFIG.aiCoachPanelId);
        const toggleButton = document.getElementById(AI_COACH_LAUNCHER_CONFIG.aiCoachToggleButtonId);
        // Panel content container might not exist if panel itself doesn't
        const panelContentContainer = panel ? document.getElementById('aiCoachPanelContentContainer') : null; 
        const mainContent = document.querySelector(AI_COACH_LAUNCHER_CONFIG.mainContentSelector);

        if (show) {
            document.body.classList.add('ai-coach-active');
            if (mainContent) mainContent.classList.add('ai-coach-main-content-area');
            if (toggleButton) toggleButton.textContent = '🙈 Hide AI Coach';
            logAICoach("AI Coach panel activated.");
            await refreshAICoachData(); 
        } else {
            document.body.classList.remove('ai-coach-active');
            if (mainContent) mainContent.classList.remove('ai-coach-main-content-area');
            if (toggleButton) toggleButton.textContent = '🚀 Activate AI Coach';
            if (panelContentContainer) { // Clear new container
                panelContentContainer.innerHTML = '<div class="ai-coach-panel-content"><p>Activate the AI Coach to get insights.</p></div>';
            } else if (panel && panel.querySelector('.ai-coach-panel-content')) { // Fallback for old structure if needed
                 panel.querySelector('.ai-coach-panel-content').innerHTML = '<p>Activate AI Coach.</p>';
            }
            logAICoach("AI Coach panel deactivated.");
            lastFetchedStudentId = null; 
            observerLastProcessedStudentId = null; 
            currentlyFetchingStudentId = null; 
            if (currentFetchAbortController) currentFetchAbortController.abort();
            currentFetchAbortController = null;
            currentLLMInsightsForChat = null;
        }
    }
    
    // ADDED: New function to check visibility of sections and resize chat
    function checkAndResizeChat() {
        const vespaContainer = document.getElementById('aiCoachVespaProfileContainer');
        const academicContainer = document.getElementById('aiCoachAcademicProfileContainer');
        const questionContainer = document.getElementById('aiCoachQuestionAnalysisContainer');
        const chatContainer = document.getElementById('aiCoachChatContainer'); // This is the actual chat section
        const chatDisplay = document.getElementById('aiCoachChatDisplay'); // The scrollable message area

        if (!chatContainer || !chatDisplay) {
            logAICoach("checkAndResizeChat: Chat container or display not found.");
            return;
        }

        const vespaVisible = vespaContainer && vespaContainer.style.display === 'block';
        const academicVisible = academicContainer && academicContainer.style.display === 'block';
        const questionVisible = questionContainer && questionContainer.style.display === 'block';

        if (!vespaVisible && !academicVisible && !questionVisible) {
            logAICoach("All insight sections are hidden. Expanding chat.");
            chatContainer.classList.add('expanded-chat');
            chatDisplay.classList.add('expanded-chat-display');
        } else {
            logAICoach("At least one insight section is visible. Reverting chat size.");
            chatContainer.classList.remove('expanded-chat');
            chatDisplay.classList.remove('expanded-chat-display');
        }
    }

    // --- addChatInterface: Ensure it targets the new #aiCoachChatInterfaceContainer for appending ---
    function addChatInterface(targetContainerElement, studentNameForContext) {
        if (!targetContainerElement) {
             logAICoach("addChatInterface: Target container element is missing.");
             return;
        }
        targetContainerElement.innerHTML = ''; // Clear placeholder before adding chat

        const chatContainer = document.createElement('div');
        chatContainer.id = 'aiCoachChatContainer'; // The actual chat section
        chatContainer.className = 'ai-coach-section expanded-chat'; // Start expanded if no other sections show initially
        chatContainer.style.marginTop = '20px';

        chatContainer.innerHTML = `
            <h4>AI Chat with ${studentNameForContext}</h4>
            <div id="aiCoachChatDisplay" style="height: 200px; border: 1px solid #ccc; overflow-y: auto; padding: 10px; margin-bottom: 10px; background-color: #fff;">
                <p class="ai-chat-message ai-chat-message-bot" data-role="assistant"><em>AI Coach:</em> Hello! How can I help you with ${studentNameForContext} today?</p>
            </div>
            <div style="display: flex;">
                <input type="text" id="aiCoachChatInput" style="flex-grow: 1; padding: 8px; border: 1px solid #ccc;" placeholder="Type your message...">
                <button id="aiCoachChatSendButton" class="p-button p-component" style="margin-left: 10px; padding: 8px 15px;">Send</button>
            </div>
            <div id="aiCoachChatThinkingIndicator" style="font-size:0.8em; color: #777; text-align:center; margin-top:5px; display:none;">AI Coach is thinking...</div>
        `;
        targetContainerElement.appendChild(chatContainer);
        // ... (rest of sendChatMessage and event listeners from latestaiCoachLauncher.js) ...
        const chatInput = document.getElementById('aiCoachChatInput');
        const chatSendButton = document.getElementById('aiCoachChatSendButton');
        const chatDisplay = document.getElementById('aiCoachChatDisplay');
        const thinkingIndicator = document.getElementById('aiCoachChatThinkingIndicator');

        async function sendChatMessage() {
            if (!chatInput || !chatDisplay || !thinkingIndicator) return;
            const messageText = chatInput.value.trim();
            if (messageText === '') return;

            const currentStudentId = lastFetchedStudentId; 
            if (!currentStudentId) {
                logAICoach("Cannot send chat: student ID missing.");
                const errorMessageElement = document.createElement('p');
                errorMessageElement.className = 'ai-chat-message ai-chat-message-bot';
                errorMessageElement.innerHTML = `<em>AI Coach:</em> Student context missing.`;
                chatDisplay.appendChild(errorMessageElement);
                chatDisplay.scrollTop = chatDisplay.scrollHeight;
                return;
            }
            const userMessageElement = document.createElement('p');
            userMessageElement.className = 'ai-chat-message ai-chat-message-user';
            userMessageElement.setAttribute('data-role', 'user');
            userMessageElement.textContent = `You: ${messageText}`;
            chatDisplay.appendChild(userMessageElement);
            const originalInput = chatInput.value;
            chatInput.value = ''; 
            chatDisplay.scrollTop = chatDisplay.scrollHeight;
            thinkingIndicator.style.display = 'block';
            chatSendButton.disabled = true;
            chatInput.disabled = true;

            const chatHistory = [];
            const messages = chatDisplay.querySelectorAll('.ai-chat-message');
            messages.forEach(msgElement => {
                if (msgElement === userMessageElement) return; 
                let role = msgElement.getAttribute('data-role');
                let content = msgElement.textContent.replace(/^(You:|<em>AI Coach:<\/em>\s*)/, '');
                if(role) chatHistory.push({ role: role, content: content });
            });

            try {
                const payload = {
                    student_object10_record_id: currentStudentId,
                    chat_history: chatHistory, 
                    current_tutor_message: originalInput,
                    initial_ai_context: currentLLMInsightsForChat ? { // Send the stored insights
                        student_overview_summary: currentLLMInsightsForChat.student_overview_summary,
                        academic_benchmark_analysis: currentLLMInsightsForChat.academic_benchmark_analysis,
                        questionnaire_interpretation_and_reflection_summary: currentLLMInsightsForChat.questionnaire_interpretation_and_reflection_summary
                    } : null
                };
                const response = await fetch(CHAT_TURN_ENDPOINT, { 
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                thinkingIndicator.style.display = 'none';
                chatSendButton.disabled = false;
                chatInput.disabled = false;
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: "Unknown AI chat error."}));
                    throw new Error(errorData.error || `Chat API Error: ${response.status}`);
                }
                const data = await response.json();
                const botMessageElement = document.createElement('p');
                botMessageElement.className = 'ai-chat-message ai-chat-message-bot';
                botMessageElement.setAttribute('data-role', 'assistant');
                botMessageElement.innerHTML = `<em>AI Coach:</em> ${data.ai_response}`;
                chatDisplay.appendChild(botMessageElement);
            } catch (error) {
                logAICoach("Error sending chat message:", error);
                const errorMessageElement = document.createElement('p');
                errorMessageElement.className = 'ai-chat-message ai-chat-message-bot';
                errorMessageElement.innerHTML = `<em>AI Coach:</em> Error: ${error.message}`;
                chatDisplay.appendChild(errorMessageElement);
                thinkingIndicator.style.display = 'none';
                chatSendButton.disabled = false;
                chatInput.disabled = false;
            }
            chatDisplay.scrollTop = chatDisplay.scrollHeight;
        }
        if (chatSendButton) chatSendButton.addEventListener('click', sendChatMessage);
        if (chatInput) chatInput.addEventListener('keypress', function(e) { if (e.key === 'Enter') sendChatMessage(); });
        logAICoach("Chat interface added.");
        checkAndResizeChat();
    }

    // --- Helper function to determine max points for visual scale ---
    function getMaxPointsForScale(subject) {
        const normalizedType = subject.normalized_qualification_type;
        let maxPoints = 140; // Default for A-Level like scales

        const allPoints = [
            typeof subject.currentGradePoints === 'number' ? subject.currentGradePoints : 0,
            typeof subject.standardMegPoints === 'number' ? subject.standardMegPoints : 0
        ];

        if (normalizedType === "A Level") {
            if (typeof subject.megPoints60 === 'number') allPoints.push(subject.megPoints60);
            if (typeof subject.megPoints90 === 'number') allPoints.push(subject.megPoints90);
            if (typeof subject.megPoints100 === 'number') allPoints.push(subject.megPoints100);
            maxPoints = 140;
        } else if (normalizedType === "AS Level") maxPoints = 70;
        else if (normalizedType === "IB HL") maxPoints = 140;
        else if (normalizedType === "IB SL") maxPoints = 70;
        else if (normalizedType === "Pre-U Principal Subject") maxPoints = 150;
        else if (normalizedType === "Pre-U Short Course") maxPoints = 75;
        else if (normalizedType && normalizedType.includes("BTEC")) {
            if (normalizedType === "BTEC Level 3 Extended Diploma") maxPoints = 420;
            else if (normalizedType === "BTEC Level 3 Diploma") maxPoints = 280;
            else if (normalizedType === "BTEC Level 3 Subsidiary Diploma") maxPoints = 140;
            else if (normalizedType === "BTEC Level 3 Extended Certificate") maxPoints = 140;
            else maxPoints = 140; 
        } else if (normalizedType && normalizedType.includes("UAL")) {
            if (normalizedType === "UAL Level 3 Extended Diploma") maxPoints = 170;
            else if (normalizedType === "UAL Level 3 Diploma") maxPoints = 90;
            else maxPoints = 90;
        } else if (normalizedType && normalizedType.includes("CACHE")) {
            if (normalizedType === "CACHE Level 3 Extended Diploma") maxPoints = 210;
            else if (normalizedType === "CACHE Level 3 Diploma") maxPoints = 140;
            else if (normalizedType === "CACHE Level 3 Certificate") maxPoints = 70;
            else if (normalizedType === "CACHE Level 3 Award") maxPoints = 35;
            else maxPoints = 70;
        }

        const highestSubjectPoint = Math.max(0, ...allPoints.filter(p => typeof p === 'number'));
        if (highestSubjectPoint > maxPoints) {
            return highestSubjectPoint + Math.max(20, Math.floor(highestSubjectPoint * 0.1));
        }
        return maxPoints;
    }

    // --- Helper function to create a single subject's benchmark scale ---
    function createSubjectBenchmarkScale(subject, subjectIndex, studentFirstName) {
        if (!subject || typeof subject.currentGradePoints !== 'number' || typeof subject.standardMegPoints !== 'number') {
            return '<p style="font-size:0.8em; color: #777;">Benchmark scale cannot be displayed due to missing point data.</p>';
        }

        const maxScalePoints = getMaxPointsForScale(subject);
        if (maxScalePoints === 0) return '<p style="font-size:0.8em; color: #777;">Max scale points is zero, cannot render scale.</p>';

        let scaleHtml = `<div class="subject-benchmark-scale-container" id="scale-container-${subjectIndex}">
            <div class="scale-labels"><span>0 pts</span><span>${maxScalePoints} pts</span></div>
            <div class="scale-bar-wrapper"><div class="scale-bar">`;

        const createMarker = (points, grade, type, label, percentile = null, specificClass = '') => {
            if (typeof points !== 'number') return '';
            const percentage = (points / maxScalePoints) * 100;
            let titleText = `${type}: ${grade || 'N/A'} (${points} pts)`;
            if (percentile) titleText += ` - ${percentile}`;
            const leftPosition = Math.max(0, Math.min(percentage, 100));
            const markerClass = type.toLowerCase().replace(/ /g, '-') + '-marker' + (specificClass ? ' ' + specificClass : '');

            // Updated Label Logic
            let displayLabel = label;
            let titleType = type;
            if (specificClass === 'p60') { displayLabel = 'Top40%'; titleType = 'Top 40% MEG (60th)'; }
            else if (label === 'MEG' && subject.normalized_qualification_type === 'A Level') { displayLabel = 'Top25%'; titleType = 'Top 25% MEG (75th)'; }
            else if (specificClass === 'p90') { displayLabel = 'Top10%'; titleType = 'Top 10% MEG (90th)'; }
            else if (specificClass === 'p100') { displayLabel = 'Top1%'; titleType = 'Top 1% MEG (100th)'; }
            else if (label === 'CG') { 
                displayLabel = studentFirstName || "Current"; 
                titleType = `${studentFirstName || "Current"}'s Grade`;
            }

            // Add a specific class for percentile markers to style them differently
            const isPercentileMarker = ['p60', 'p90', 'p100'].includes(specificClass) || (label === 'MEG' && subject.normalized_qualification_type === 'A Level');
            const finalMarkerClass = `${markerClass} ${isPercentileMarker ? 'percentile-line-marker' : 'current-grade-dot-marker'}`;

            // Update titleText to use titleType for more descriptive tooltips
            titleText = `${titleType}: ${grade || 'N/A'} (${points} pts)`;
            if (percentile && !titleType.includes("Percentile")) titleText += ` - ${percentile}`;

            return `<div class="scale-marker ${finalMarkerClass}" style="left: ${leftPosition}%;" title="${titleText}">
                        <span class="marker-label">${displayLabel}</span>
                    </div>`;
        };
        
        // For A-Levels, standard MEG is 75th (Top25%). For others, it's just MEG.
        let standardMegLabel = "MEG";
        if (subject.normalized_qualification_type === "A Level") {
            standardMegLabel = "Top25%"; // This will be used by the updated displayLabel logic inside createMarker
        }

        // Use studentFirstName for the Current Grade marker label
        scaleHtml += createMarker(subject.currentGradePoints, subject.currentGrade, "Current Grade", "CG", null, 'cg-student'); 
        scaleHtml += createMarker(subject.standardMegPoints, subject.standard_meg, "Standard MEG", "MEG"); // Label will be adjusted by logic in createMarker

        if (subject.normalized_qualification_type === "A Level") {
            if (typeof subject.megPoints60 === 'number') {
                scaleHtml += createMarker(subject.megPoints60, null, "A-Level MEG", "P60", "60th Percentile", "p60");
            }
            // 75th is standardMegPoints, already marked with updated label
            if (typeof subject.megPoints90 === 'number') {
                scaleHtml += createMarker(subject.megPoints90, null, "A-Level MEG", "P90", "90th Percentile", "p90");
            }
            if (typeof subject.megPoints100 === 'number') {
                scaleHtml += createMarker(subject.megPoints100, null, "A-Level MEG", "P100", "100th Percentile", "p100");
            }
        }

        scaleHtml += `</div></div></div>`;
        return scaleHtml;
    }

    window.initializeAICoachLauncher = initializeAICoachLauncher;

    // --- NEW FUNCTION to render Questionnaire Response Distribution Pie Chart ---
    function renderQuestionnaireDistributionChart(allStatements) {
        logAICoach("renderQuestionnaireDistributionChart called with statements:", allStatements);
        const chartContainer = document.getElementById('questionnaireResponseDistributionChartContainer');
        if (!chartContainer) {
            logAICoach("Questionnaire response distribution chart container not found.");
            return;
        }

        if (typeof Chart === 'undefined') {
            logAICoach("Chart.js is not loaded. Cannot render questionnaire distribution chart.");
            chartContainer.innerHTML = '<p style="color:red; text-align:center;">Chart library not loaded.</p>';
            return;
        }

        if (questionnairePieChartInstance) {
            questionnairePieChartInstance.destroy();
            questionnairePieChartInstance = null;
            logAICoach("Previous questionnaire pie chart instance destroyed.");
        }

        chartContainer.innerHTML = '<canvas id="questionnaireDistributionPieChartCanvas"></canvas>';
        const ctx = document.getElementById('questionnaireDistributionPieChartCanvas').getContext('2d');

        if (!allStatements || allStatements.length === 0) {
            logAICoach("No statements data for questionnaire pie chart.");
            chartContainer.innerHTML = '<p style="text-align:center;">No questionnaire statement data available for chart.</p>';
            return;
        }

        const responseCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        const responseDetailsByScore = { 
            1: {}, 2: {}, 3: {}, 4: {}, 5: {}
        };
        const vespaCategories = ['VISION', 'EFFORT', 'SYSTEMS', 'PRACTICE', 'ATTITUDE'];
        vespaCategories.forEach(cat => {
            for (let score = 1; score <= 5; score++) {
                responseDetailsByScore[score][cat.toUpperCase()] = { count: 0, statements: [] };
            }
        });

        allStatements.forEach(stmt => {
            const score = stmt.score;
            const category = stmt.vespa_category ? stmt.vespa_category.toUpperCase() : 'UNKNOWN';
            if (score >= 1 && score <= 5) {
                responseCounts[score]++;
                if (responseDetailsByScore[score][category]) {
                    responseDetailsByScore[score][category].count++;
                    responseDetailsByScore[score][category].statements.push(stmt.question_text);
                } else if (category === 'UNKNOWN') {
                     if (!responseDetailsByScore[score]['UNKNOWN']) responseDetailsByScore[score]['UNKNOWN'] = { count: 0, statements: [] };
                     responseDetailsByScore[score]['UNKNOWN'].count++;
                     responseDetailsByScore[score]['UNKNOWN'].statements.push(stmt.question_text);
                }
            }
        });

        const chartData = {
            labels: [
                'Strongly Disagree',
                'Disagree',
                'Neutral',
                'Agree',
                'Strongly Agree'
            ],
            datasets: [{
                label: 'Questionnaire Response Distribution',
                data: Object.values(responseCounts),
                backgroundColor: [
                    'rgba(255, 99, 132, 0.7)', // Score 1
                    'rgba(255, 159, 64, 0.7)', // Score 2
                    'rgba(255, 205, 86, 0.7)', // Score 3
                    'rgba(75, 192, 192, 0.7)', // Score 4
                    'rgba(54, 162, 235, 0.7)'  // Score 5
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(255, 159, 64, 1)',
                    'rgba(255, 205, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(54, 162, 235, 1)'
                ],
                borderWidth: 1
            }]
        };

        const vespaColors = {
            VISION: '#ff8f00',
            EFFORT: '#86b4f0',
            SYSTEMS: '#72cb44',
            PRACTICE: '#7f31a4',
            ATTITUDE: '#f032e6',
            UNKNOWN: '#808080' // Grey for unknown
        };

        questionnairePieChartInstance = new Chart(ctx, {
            type: 'pie',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Distribution of Questionnaire Statement Responses',
                        font: { size: 14, weight: 'bold' },
                        padding: { top: 10, bottom: 15 }
                    },
                    legend: {
                        position: 'bottom',
                    },
                    tooltip: {
                        yAlign: 'bottom', // Position tooltip above the mouse point
                        caretPadding: 15, // Add more space between cursor and tooltip
                        callbacks: {
                            label: function(context) {
                                let label = context.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                const scoreValue = context.parsed;
                                if (scoreValue !== null) {
                                    label += scoreValue + ' statement(s)';
                                }
                                return label;
                            },
                            afterLabel: function(context) {
                                const scoreIndex = context.dataIndex; // 0 for score 1, 1 for score 2, etc.
                                const score = scoreIndex + 1;
                                const detailsForThisScore = responseDetailsByScore[score];
                                let tooltipLines = [];

                                let totalInScore = 0;
                                vespaCategories.forEach(cat => {
                                   if(detailsForThisScore[cat]) totalInScore += detailsForThisScore[cat].count;
                                });
                                if (detailsForThisScore['UNKNOWN'] && detailsForThisScore['UNKNOWN'].count > 0) totalInScore += detailsForThisScore['UNKNOWN'].count;


                                if (totalInScore > 0) {
                                    tooltipLines.push('\nBreakdown by VESPA Element:');
                                    vespaCategories.forEach(cat => {
                                        if (detailsForThisScore[cat] && detailsForThisScore[cat].count > 0) {
                                            const percentage = ((detailsForThisScore[cat].count / totalInScore) * 100).toFixed(1);
                                            tooltipLines.push(`  ${cat}: ${percentage}% (${detailsForThisScore[cat].count} statement(s))`);
                                        }
                                    });
                                    if (detailsForThisScore['UNKNOWN'] && detailsForThisScore['UNKNOWN'].count > 0){
                                        const percentage = ((detailsForThisScore['UNKNOWN'].count / totalInScore) * 100).toFixed(1);
                                        tooltipLines.push(`  UNKNOWN: ${percentage}% (${detailsForThisScore['UNKNOWN'].count} statement(s))`);
                                    }
                                }
                                return tooltipLines;
                            }
                        },
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        titleFont: { size: 14 },
                        bodyFont: { size: 12 },
                        footerFont: { size: 10 },
                        padding: 10
                    }
                }
            }
        });
        logAICoach("Questionnaire response distribution pie chart rendered.");
    }

    function renderVespaComparisonChart(studentVespaProfile, schoolVespaAverages) {
        const chartContainer = document.getElementById('vespaComparisonChartContainer');
        if (!chartContainer) {
            logAICoach("VESPA comparison chart container not found.");
            return;
        }

        if (typeof Chart === 'undefined') {
            logAICoach("Chart.js is not loaded. Cannot render VESPA comparison chart.");
            chartContainer.innerHTML = '<p style="color:red; text-align:center;">Chart library not loaded.</p>';
            return;
        }

        // Destroy previous chart instance if it exists
        if (vespaChartInstance) {
            vespaChartInstance.destroy();
            vespaChartInstance = null;
            logAICoach("Previous VESPA chart instance destroyed.");
        }
        
        // Ensure chartContainer is empty before creating a new canvas
        chartContainer.innerHTML = '<canvas id="vespaStudentVsSchoolChart"></canvas>';
        const ctx = document.getElementById('vespaStudentVsSchoolChart').getContext('2d');

        if (!studentVespaProfile) {
            logAICoach("Student VESPA profile data is missing. Cannot render chart.");
            chartContainer.innerHTML = '<p style="text-align:center;">Student VESPA data not available for chart.</p>';
            return;
        }

        const labels = ['Vision', 'Effort', 'Systems', 'Practice', 'Attitude'];
        const studentScores = labels.map(label => {
            const elementData = studentVespaProfile[label];
            return elementData && elementData.score_1_to_10 !== undefined && elementData.score_1_to_10 !== "N/A" ? parseFloat(elementData.score_1_to_10) : 0;
        });

        const datasets = [
            {
                label: 'Student Scores',
                data: studentScores,
                backgroundColor: 'rgba(54, 162, 235, 0.6)', // Blue
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }
        ];

        let chartTitle = 'Student VESPA Scores';

        if (schoolVespaAverages) {
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
            chartTitle = 'Student VESPA Scores vs. School Average';
            logAICoach("School averages available, adding to chart.", {studentScores, schoolScores});
        } else {
            logAICoach("School averages not available for chart.");
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
            logAICoach("VESPA comparison chart rendered successfully.");
        } catch (error) {
            console.error("[AICoachLauncher] Error rendering Chart.js chart:", error);
            chartContainer.innerHTML = '<p style="color:red; text-align:center;">Error rendering chart.</p>';
        }
    }
} 
