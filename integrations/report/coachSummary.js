/*
 * Coach Summary Application for Knack
 * Loaded by WorkingBridge.js
 * Target: scene_1224, view_3049
 */

// Ensure the global namespace for initializers if it doesn't exist
window.VESPA_APPS = window.VESPA_APPS || {};

function initializeCoachSummaryApp() {
    const config = window.COACH_SUMMARY_CONFIG;
    if (!config) {
        console.error('[CoachSummaryApp] Configuration not found. Exiting.');
        return;
    }

    const {
        knackAppId,
        knackApiKey,
        debugMode,
        sceneKey,
        viewKey,
        elementSelector,
        objectKeys
    } = config;

    // Internal field key definitions for Object_10
    const FIELD_KEYS = {
        // Student Info
        studentEmail: 'field_197_raw.email',
        studentName: 'field_187_raw.full',
        studentLevel: 'field_568_raw',
        currentMCycle: 'field_146_raw',
        // Current VESPA Scores
        vision: 'field_147',
        effort: 'field_148',
        systems: 'field_149',
        practice: 'field_150',
        attitude: 'field_151',
        overall: 'field_152',
        // Current Report Response & Coach Comments
        currentReportResponse: 'field_2301',
        currentCoachComments: 'field_2489',
        // Current Goal & Dates
        currentGoalText: 'field_2499', // The actual text of the goal (GOAL1)
        goalFinishDate: 'field_2320',  // The deadline date for the goal
        // Connection fields for filtering by logged-in staff
        tutorConnection: 'field_145',
        staffAdminConnection: 'field_439',
        hoyConnection: 'field_429',
        subjectTeacherConnection: 'field_2191'
    };

    if (debugMode) {
        console.log('[CoachSummaryApp] Initializing with config:', config);
        console.log('[CoachSummaryApp] Using internal field keys:', FIELD_KEYS);
    }

    const targetElement = document.querySelector(elementSelector);
    if (!targetElement) {
        console.error(`[CoachSummaryApp] Target element '${elementSelector}' not found. Exiting.`);
        return;
    }

    targetElement.innerHTML = '';

    async function loadAndDisplaySummary() {
        if (debugMode) {
            console.log('[CoachSummaryApp] Starting to load and display summary...');
        }

        const loggedInUser = Knack.getUserAttributes();
        if (!loggedInUser || !loggedInUser.id) {
            targetElement.innerHTML = '<p class="error-message">Error: Could not identify logged-in user.</p>';
            console.error('[CoachSummaryApp] Logged-in user ID not found.');
            return;
        }
        const loggedInUserId = loggedInUser.id;
        if (debugMode) {
            console.log('[CoachSummaryApp] Logged-in User ID:', loggedInUserId);
        }

        renderFilterUI();

        try {
            const studentRecords = await fetchConnectedStudents(loggedInUserId);
            if (debugMode) {
                console.log('[CoachSummaryApp] Fetched student records:', studentRecords);
            }
            renderSummaryView(studentRecords);
        } catch (error) {
            targetElement.innerHTML = '<p class="error-message">Error loading coaching summary data.</p>';
            console.error('[CoachSummaryApp] Error fetching or rendering student data:', error);
        }
    }

    function renderFilterUI() {
        const filterHtml = `
            <div id="coachSummaryFilters" class="no-print">
                <h3>Filter Options</h3>
                <p><em>Filter controls will go here. For now, showing all connected students.</em></p>
                <button id="printSummaryBtn" class="action-button">Print Summary</button>
            </div>
            <hr class="no-print">
        `;
        targetElement.insertAdjacentHTML('beforeend', filterHtml);

        const printButton = document.getElementById('printSummaryBtn');
        if (printButton) {
            printButton.addEventListener('click', () => window.print());
        }
    }

    async function fetchConnectedStudents(userId) {
        const apiFilters = {
            match: 'or',
            rules: [
                { field: FIELD_KEYS.tutorConnection, operator: 'is', value: userId },
                { field: FIELD_KEYS.staffAdminConnection, operator: 'is', value: userId },
                { field: FIELD_KEYS.hoyConnection, operator: 'is', value: userId },
                { field: FIELD_KEYS.subjectTeacherConnection, operator: 'is', value: userId }
            ]
        };

        const headers = {
            'X-Knack-Application-Id': knackAppId,
            'X-Knack-REST-API-Key': knackApiKey,
            'Content-Type': 'application/json'
        };

        const url = `https://api.knack.com/v1/objects/${objectKeys.vespaResults}/records?filters=${encodeURIComponent(JSON.stringify(apiFilters))}&rows_per_page=1000`;

        if (debugMode) {
            console.log('[CoachSummaryApp] Fetching students with URL:', url);
            console.log('[CoachSummaryApp] API Filters:', apiFilters);
        }

        const response = await fetch(url, { headers: headers });
        if (!response.ok) {
            const errorData = await response.text();
            console.error('[CoachSummaryApp] API Error:', response.status, errorData);
            throw new Error(`Knack API request failed: ${response.status}`);
        }
        const data = await response.json();
        return data.records || [];
    }

    function renderSummaryView(studentRecords) {
        let summaryHtml = '<div id="summaryReportContainer">';

        if (!studentRecords || studentRecords.length === 0) {
            summaryHtml += '<p>No students found connected to your account.</p>';
        } else {
            studentRecords.forEach(student => {
                const getField = (fieldKey, defaultValue = '<em>Not provided</em>') => student[fieldKey] || defaultValue;

                summaryHtml += `
                    <div class="student-summary-card">
                        <h4>${getField(FIELD_KEYS.studentName, 'N/A')} (${getField(FIELD_KEYS.studentLevel, 'N/A')})</h4>
                        <p><strong>Email:</strong> ${getField(FIELD_KEYS.studentEmail, 'N/A')}</p>
                        
                        <h5>Latest VESPA Scores (Cycle: ${getField(FIELD_KEYS.currentMCycle, 'N/A')})</h5>
                        <table class="vespa-scores-table">
                            <thead><tr><th>V</th><th>E</th><th>S</th><th>P</th><th>A</th><th>O</th></tr></thead>
                            <tbody><tr>
                                <td>${getField(FIELD_KEYS.vision, '-')}</td>
                                <td>${getField(FIELD_KEYS.effort, '-')}</td>
                                <td>${getField(FIELD_KEYS.systems, '-')}</td>
                                <td>${getField(FIELD_KEYS.practice, '-')}</td>
                                <td>${getField(FIELD_KEYS.attitude, '-')}</td>
                                <td>${getField(FIELD_KEYS.overall, '-')}</td>
                            </tr></tbody>
                        </table>

                        <h5>Current Student Report Response</h5>
                        <div class="text-block">${getField(FIELD_KEYS.currentReportResponse)}</div>

                        <h5>Current Coach's Comments</h5>
                        <div class="text-block">${getField(FIELD_KEYS.currentCoachComments)}</div>
                        
                        <h5>Current Goal</h5>
                        <div class="text-block">
                            <p><strong>Goal:</strong> ${getField(FIELD_KEYS.currentGoalText)}</p>
                            <p><strong>Deadline Date:</strong> ${getField(FIELD_KEYS.goalFinishDate)}</p>
                        </div>

                        <div class="notes-section print-only">
                            <h5>Tutor Notes:</h5>
                            <div class="notes-box"></div>
                        </div>
                    </div>
                    <hr class="summary-divider">
                `;
            });
        }
        summaryHtml += '</div>';
        targetElement.insertAdjacentHTML('beforeend', summaryHtml);
        addPrintStyles();
    }

    function addPrintStyles() {
        let printStyleSheet = document.getElementById('coachSummaryPrintStyle');
        if (printStyleSheet) {
            printStyleSheet.innerHTML = '';
        } else {
            printStyleSheet = document.createElement('style');
            printStyleSheet.id = 'coachSummaryPrintStyle';
            document.head.appendChild(printStyleSheet);
        }
        printStyleSheet.innerHTML = `
            @media print {
                body * {
                    visibility: hidden;
                }
                #${elementSelector.replace('#','')},
                #${elementSelector.replace('#','')} * {
                    visibility: visible;
                }
                #${elementSelector.replace('#','')} {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                    margin: 20px;
                    padding: 0;
                }
                .no-print {
                    display: none !important;
                }
                .student-summary-card {
                    page-break-inside: avoid;
                    border: 1px solid #ccc;
                    padding: 15px;
                    margin-bottom: 20px;
                }
                .summary-divider {
                    display: none;
                }
                .vespa-scores-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 10px;
                }
                .vespa-scores-table th, .vespa-scores-table td {
                    border: 1px solid #ddd;
                    padding: 5px;
                    text-align: center;
                }
                .text-block {
                    border: 1px solid #eee;
                    padding: 10px;
                    margin-top: 5px;
                    background-color: #f9f9f9;
                }
                .notes-section.print-only {
                    margin-top: 15px;
                }
                .notes-box {
                    border: 1px dashed #bbb;
                    height: 100px;
                    padding: 5px;
                    margin-top: 5px;
                }
            }
        `;
    }

    loadAndDisplaySummary();
}

window.initializeCoachSummaryApp = initializeCoachSummaryApp;

