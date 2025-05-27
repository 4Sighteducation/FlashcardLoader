// AI Coach Launcher Script (aiCoachLauncher.js)

// Guard to prevent re-initialization
if (window.aiCoachLauncherInitialized) {
    console.warn("[AICoachLauncher] Attempted to re-initialize. Skipping.");
} else {
    window.aiCoachLauncherInitialized = true;

    let AI_COACH_LAUNCHER_CONFIG = null; 
    let coachObserver = null;
    let coachUIInitialized = false;

    function logAICoach(message, data) {
        // Temporarily log unconditionally for debugging
        console.log(`[AICoachLauncher] ${message}`, data === undefined ? '' : data);
        // if (AI_COACH_LAUNCHER_CONFIG && AI_COACH_LAUNCHER_CONFIG.debugMode) {
        //     console.log(`[AICoachLauncher] ${message}`, data === undefined ? '' : data);
        // }
    }

    // Function to check if we are on the individual student report view
    function isIndividualReportView() {
        const reportContainer = document.querySelector('#view_2776 .kn-rich_text__content'); // Main VESPA report view
        const backButton = document.querySelector('a.kn-back-link'); // General Knack back link
        
        if (reportContainer && reportContainer.textContent && reportContainer.textContent.includes('STUDENT:')) {
            logAICoach("Individual report view confirmed by STUDENT: text.");
            return true;
        }
        if (backButton && document.body.contains(backButton)) { // Check if back button is visible
             logAICoach("Individual report view confirmed by BACK button presence.");
            return true;
        }
        // Add any other reliable indicators specific to your individual report page
        logAICoach("Not on individual report view.");
        return false;
    }

    // Function to initialize the UI elements (button and panel)
    function initializeCoachUI() {
        if (coachUIInitialized) return;

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

        const observerCallback = function(mutationsList, observer) {
            // We are looking for changes that indicate navigation to/from an individual report.
            // A simple check on each mutation might be too frequent.
            // Debounce or check specific conditions.
            logAICoach("MutationObserver detected DOM change.");
            if (isIndividualReportView()) {
                initializeCoachUI();
            } else {
                clearCoachUI();
            }
        };

        coachObserver = new MutationObserver(observerCallback);
        coachObserver.observe(targetNode, { childList: true, subtree: true });

        // Initial check in case the page loads directly on an individual report
        if (isIndividualReportView()) {
            initializeCoachUI();
        }
    }

    function addAICoachStyles() {
        const styleId = 'ai-coach-styles';
        if (document.getElementById(styleId)) return;

        const css = `
            body.ai-coach-active ${AI_COACH_LAUNCHER_CONFIG.mainContentSelector} {
                width: calc(100% - 400px);
                margin-right: 400px;
                transition: width 0.3s ease-in-out, margin-right 0.3s ease-in-out;
            }
            #${AI_COACH_LAUNCHER_CONFIG.mainContentSelector} {
                 transition: width 0.3s ease-in-out, margin-right 0.3s ease-in-out;
            }
            #${AI_COACH_LAUNCHER_CONFIG.aiCoachPanelId} {
                width: 0;
                opacity: 0;
                visibility: hidden;
                position: fixed;
                top: 0;
                right: 0;
                height: 100vh;
                background-color: #f4f6f8;
                border-left: 1px solid #ddd;
                padding: 20px;
                box-sizing: border-box;
                overflow-y: auto;
                z-index: 1050;
                transition: width 0.3s ease-in-out, opacity 0.3s ease-in-out, visibility 0.3s;
            }
            body.ai-coach-active #${AI_COACH_LAUNCHER_CONFIG.aiCoachPanelId} {
                width: 400px;
                opacity: 1;
                visibility: visible;
            }
            #${AI_COACH_LAUNCHER_CONFIG.aiCoachPanelId} .ai-coach-panel-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
            }
            #${AI_COACH_LAUNCHER_CONFIG.aiCoachPanelId} .ai-coach-panel-header h3 {
                margin: 0;
                font-size: 1.2em;
            }
            #${AI_COACH_LAUNCHER_CONFIG.aiCoachPanelId} .ai-coach-close-btn {
                background: none;
                border: none;
                font-size: 1.5em;
                cursor: pointer;
            }
            #aiCoachLauncherButtonContainer {
                 text-align: center; 
                 padding: 20px; 
                 border-top: 1px solid #eee;
            }
        `;
        const styleElement = document.createElement('style');
        styleElement.id = styleId;
        styleElement.type = 'text/css';
        styleElement.appendChild(document.createTextNode(css));
        document.head.appendChild(styleElement);
        logAICoach("AICoachLauncher styles added.");
    }

    function createAICoachPanel() {
        const panelId = AI_COACH_LAUNCHER_CONFIG.aiCoachPanelId;
        if (document.getElementById(panelId)) {
            logAICoach("AI Coach panel already exists.");
            return;
        }
        const panel = document.createElement('div');
        panel.id = panelId;
        panel.className = 'ai-coach-panel';
        panel.innerHTML = `
            <div class="ai-coach-panel-header">
                <h3>AI Coaching Assistant</h3>
                <button class="ai-coach-close-btn" aria-label="Close AI Coach Panel">&times;</button>
            </div>
            <div class="ai-coach-panel-content">
                <p>Loading AI Coach...</p>
            </div>
        `;
        document.body.appendChild(panel);
        logAICoach("AI Coach panel created.");
    }

    function addLauncherButton() {
        const targetElement = document.querySelector(AI_COACH_LAUNCHER_CONFIG.elementSelector);
        if (!targetElement) {
            console.error(`[AICoachLauncher] Launcher button target element '${AI_COACH_LAUNCHER_CONFIG.elementSelector}' not found.`);
            return;
        }
        if (document.getElementById(AI_COACH_LAUNCHER_CONFIG.aiCoachToggleButtonId)) {
            logAICoach("AI Coach launcher button already exists.");
            return;
        }
        const buttonContainerHTML = `
            <div id="aiCoachLauncherButtonContainer">
              <p>Get AI-powered insights and suggestions to enhance your coaching conversation.</p>
              <button id="${AI_COACH_LAUNCHER_CONFIG.aiCoachToggleButtonId}" class="p-button p-component">🚀 Activate AI Coach</button>
            </div>
        `;
        targetElement.innerHTML = buttonContainerHTML;
        logAICoach("Launcher button added to view: " + AI_COACH_LAUNCHER_CONFIG.viewKey);
    }

    function toggleAICoachPanel(show) {
        const panel = document.getElementById(AI_COACH_LAUNCHER_CONFIG.aiCoachPanelId);
        const toggleButton = document.getElementById(AI_COACH_LAUNCHER_CONFIG.aiCoachToggleButtonId);
        const panelContent = panel ? panel.querySelector('.ai-coach-panel-content') : null;

        if (show) {
            document.body.classList.add('ai-coach-active');
            if (toggleButton) toggleButton.textContent = '🙈 Hide AI Coach';
            logAICoach("AI Coach panel activated.");
            if (panelContent) {
                panelContent.innerHTML = '<p>AI Coach is active. Content would load here.</p>';
            }
        } else {
            document.body.classList.remove('ai-coach-active');
            if (toggleButton) toggleButton.textContent = '🚀 Activate AI Coach';
            logAICoach("AI Coach panel deactivated.");
        }
    }

    function setupEventListeners() {
        document.body.addEventListener('click', function(event) {
            if (event.target && event.target.id === AI_COACH_LAUNCHER_CONFIG.aiCoachToggleButtonId) {
                const isActive = document.body.classList.contains('ai-coach-active');
                toggleAICoachPanel(!isActive);
            }
            const panel = document.getElementById(AI_COACH_LAUNCHER_CONFIG.aiCoachPanelId);
            if (panel && event.target && event.target.classList.contains('ai-coach-close-btn') && panel.contains(event.target)) {
                toggleAICoachPanel(false);
            }
        });
        logAICoach("Event listeners set up.");
    }

    window.initializeAICoachLauncher = initializeAICoachLauncher;
} 
