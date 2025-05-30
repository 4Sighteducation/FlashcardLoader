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
        elementSelector,
        objectKeys
    } = config;

    const FIELD_KEYS = {
        studentEmail: 'field_197_raw.email',
        studentName: 'field_187_raw.full',
        studentLevel: 'field_568_raw',
        currentMCycle: 'field_146_raw',
        vision: 'field_147',
        effort: 'field_148',
        systems: 'field_149',
        practice: 'field_150',
        attitude: 'field_151',
        overall: 'field_152',
        currentReportResponse: 'field_2301',
        currentCoachComments: 'field_2489',
        currentGoalText: 'field_2499',
        goalFinishDate: 'field_2320',
    };

    const ROLE_CONFIGS = {
        'object_7': { // Was 'Tutor'
            roleNameForLog: 'Tutor', // Optional: for clearer logging
            roleObjectKey: 'object_7', 
            emailFieldKey: 'field_96', 
            object10ConnectionField: 'field_145' 
        },
        'object_5': { // Was 'Staff Admin'
            roleNameForLog: 'Staff Admin',
            roleObjectKey: 'object_5', 
            emailFieldKey: 'field_86', 
            object10ConnectionField: 'field_439' 
        },
        'object_25': { // Was 'Head of Year'
            roleNameForLog: 'Head of Year/Dept',
            roleObjectKey: 'object_25', 
            emailFieldKey: 'field_553', 
            object10ConnectionField: 'field_429' 
        },
        'object_78': { // Was 'Subject Teacher'
            roleNameForLog: 'Subject Teacher',
            roleObjectKey: 'object_78', 
            emailFieldKey: 'field_1879',
            object10ConnectionField: 'field_2191' 
        }
    };

    if (debugMode) {
        console.log('[CoachSummaryApp] Initializing with config:', config);
        console.log('[CoachSummaryApp] Using internal FIELD_KEYS:', FIELD_KEYS);
        console.log('[CoachSummaryApp] Using internal ROLE_CONFIGS:', ROLE_CONFIGS);
    }

    const targetElement = document.querySelector(elementSelector);
    if (!targetElement) {
        console.error(`[CoachSummaryApp] Target element '${elementSelector}' not found. Exiting.`);
        return;
    }
    targetElement.innerHTML = '';

    async function makeKnackApiRequest(urlPath, filters = null) {
        const headers = {
            'X-Knack-Application-Id': knackAppId,
            'X-Knack-REST-API-Key': knackApiKey,
            'Content-Type': 'application/json'
        };
        let fullUrl = `https://api.knack.com/v1/${urlPath}`;
        if (filters) {
            fullUrl += `?filters=${encodeURIComponent(JSON.stringify(filters))}&rows_per_page=1000`; // Increased rows_per_page
        }

        if (debugMode) console.log(`[CoachSummaryApp] API Request URL: ${fullUrl}`);
        if (filters && debugMode) console.log(`[CoachSummaryApp] API Request Filters:`, filters);

        const response = await fetch(fullUrl, { headers });
        if (!response.ok) {
            const errorData = await response.text();
            console.error('[CoachSummaryApp] Knack API Error:', response.status, errorData);
            throw new Error(`Knack API request failed: ${response.status} - ${urlPath}`);
        }
        return response.json();
    }

    async function getRoleRecordIds(userEmail, userRoles) {
        const roleRecordIdsMap = {}; 

        for (const roleObjectKeyFromKnack of userRoles) { // Iterate using the object key from Knack.getUserRoles()
            const roleConfig = ROLE_CONFIGS[roleObjectKeyFromKnack]; // Lookup using the object key
            if (roleConfig) {
                const roleNameToLog = roleConfig.roleNameForLog || roleObjectKeyFromKnack;
                if (debugMode) console.log(`[CoachSummaryApp] Checking role config for: ${roleNameToLog} (using key ${roleObjectKeyFromKnack})`);
                try {
                    const roleRecordData = await makeKnackApiRequest(
                        `objects/${roleConfig.roleObjectKey}/records`,
                        { match: 'and', rules: [{ field: roleConfig.emailFieldKey, operator: 'is', value: userEmail }] }
                    );
                    if (roleRecordData.records && roleRecordData.records.length > 0) {
                        const recordId = roleRecordData.records[0].id;
                        if (debugMode) console.log(`[CoachSummaryApp] Found ${roleNameToLog} record ID: ${recordId} for email ${userEmail}`);
                        
                        if (!roleRecordIdsMap[roleConfig.object10ConnectionField]) {
                            roleRecordIdsMap[roleConfig.object10ConnectionField] = [];
                        }
                        roleRecordIdsMap[roleConfig.object10ConnectionField].push(recordId);
                    } else {
                        if (debugMode) console.log(`[CoachSummaryApp] No record found for ${roleNameToLog} with email ${userEmail}`);
                    }
                } catch (error) {
                    console.error(`[CoachSummaryApp] Error fetching record ID for role ${roleNameToLog}:`, error);
                }
            }
        }
        return roleRecordIdsMap;
    }

    async function fetchConnectedStudents(roleRecordIdsMap) {
        if (Object.keys(roleRecordIdsMap).length === 0) {
            if (debugMode) console.log("[CoachSummaryApp] No role record IDs found for the logged-in user. Cannot fetch students.");
            return []; // No roles matched, so no students to fetch based on these connections
        }

        const studentApiRules = [];
        for (const connectionField in roleRecordIdsMap) {
            const idsForThisConnection = roleRecordIdsMap[connectionField];
            if (idsForThisConnection.length > 0) {
                // Knack's 'is any of' usually works with an array of IDs for connection fields
                // If 'is any of' is not supported directly for connection field types via API,
                // one might need to create multiple 'is' rules joined by 'or'.
                // For simplicity, assuming 'is any of' or that a single ID per role is typical.
                // If a role can have multiple records for the same user (unlikely for role objects),
                // this might need adjustment to an 'is any of' operator or multiple 'is' rules.
                idsForThisConnection.forEach(id => {
                    studentApiRules.push({ field: connectionField, operator: 'is', value: id });
                });
            }
        }

        if (studentApiRules.length === 0) {
            if (debugMode) console.log("[CoachSummaryApp] No valid rules constructed for fetching students.");
            return [];
        }

        const studentApiFilters = { match: 'or', rules: studentApiRules };
        
        const studentData = await makeKnackApiRequest(`objects/${objectKeys.vespaResults}/records`, studentApiFilters);
        return studentData.records || [];
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
        if (printButton) printButton.addEventListener('click', () => window.print());
    }

    function renderSummaryView(studentRecords) {
        let summaryHtml = '<div id="summaryReportContainer">';
        if (!studentRecords || studentRecords.length === 0) {
            summaryHtml += '<p>No students found connected to your account based on your roles.</p>';
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
        if (printStyleSheet) printStyleSheet.innerHTML = '';
        else {
            printStyleSheet = document.createElement('style');
            printStyleSheet.id = 'coachSummaryPrintStyle';
            document.head.appendChild(printStyleSheet);
        }
        printStyleSheet.innerHTML = `
            @media print {
                body * { visibility: hidden; }
                #${elementSelector.replace('#','')}, #${elementSelector.replace('#','')} * { visibility: visible; }
                #${elementSelector.replace('#','')} { position: absolute; left: 0; top: 0; width: 100%; margin: 20px; padding: 0; }
                .no-print { display: none !important; }
                .student-summary-card { page-break-inside: avoid; border: 1px solid #ccc; padding: 15px; margin-bottom: 20px; }
                .summary-divider { display: none; }
                .vespa-scores-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
                .vespa-scores-table th, .vespa-scores-table td { border: 1px solid #ddd; padding: 5px; text-align: center; }
                .text-block { border: 1px solid #eee; padding: 10px; margin-top: 5px; background-color: #f9f9f9; }
                .notes-section.print-only { margin-top: 15px; }
                .notes-box { border: 1px dashed #bbb; height: 100px; padding: 5px; margin-top: 5px; }
            }
        `;
    }

    async function main() {
        if (debugMode) console.log('[CoachSummaryApp] Starting main execution...');
        const loggedInUser = Knack.getUserAttributes();
        if (!loggedInUser || !loggedInUser.email) {
            targetElement.innerHTML = '<p class="error-message">Error: Could not identify logged-in user email.</p>';
            console.error('[CoachSummaryApp] Logged-in user email not found.');
            return;
        }
        const userEmail = loggedInUser.email;
        const userRoles = Knack.getUserRoles() || []; // Ensure it's an array
        if (debugMode) {
            console.log('[CoachSummaryApp] Logged-in User Email:', userEmail);
            console.log('[CoachSummaryApp] Logged-in User Roles:', userRoles);
        }

        renderFilterUI();

        try {
            const roleRecordIdsMap = await getRoleRecordIds(userEmail, userRoles);
            if (debugMode) console.log('[CoachSummaryApp] Map of role record IDs for connections:', roleRecordIdsMap);
            const studentRecords = await fetchConnectedStudents(roleRecordIdsMap);
            if (debugMode) console.log('[CoachSummaryApp] Fetched student records:', studentRecords);
            renderSummaryView(studentRecords);
        } catch (error) {
            targetElement.innerHTML = '<p class="error-message">Error loading coaching summary data.</p>';
            console.error('[CoachSummaryApp] Error in main execution flow:', error);
        }
    }

    main(); // Start the application logic
}

window.initializeCoachSummaryApp = initializeCoachSummaryApp;


