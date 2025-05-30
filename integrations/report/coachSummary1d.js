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
        studentNameFilterKey: 'field_187', // For filtering
        studentFirstName: 'field_187_raw.first', // For display
        studentLastName: 'field_187_raw.last', // For display
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

    const VESPA_CYCLE_FIELDS = {
        'C1': {
            vision: 'field_155', effort: 'field_156', systems: 'field_157',
            practice: 'field_158', attitude: 'field_159', overall: 'field_160'
        },
        'C2': {
            vision: 'field_161', effort: 'field_162', systems: 'field_163',
            practice: 'field_164', attitude: 'field_165', overall: 'field_166'
        },
        'C3': {
            vision: 'field_167', effort: 'field_168', systems: 'field_169',
            practice: 'field_170', attitude: 'field_171', overall: 'field_172'
        }
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

    async function makeKnackApiRequest(urlPath, filters = null, page = 1, rowsPerPage = 1000) {
        const headers = {
            'X-Knack-Application-Id': knackAppId,
            'X-Knack-REST-API-Key': knackApiKey,
            'Content-Type': 'application/json'
        };
        let fullUrl = `https://api.knack.com/v1/${urlPath}`;
        const params = new URLSearchParams();
        params.append('rows_per_page', rowsPerPage);
        params.append('page', page);

        if (filters) {
            params.append('filters', encodeURIComponent(JSON.stringify(filters)));
        }
        fullUrl += `?${params.toString()}`;

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

    async function fetchConnectedStudents(roleRecordIdsMap, filters = {}, page = 1) {
        if (Object.keys(roleRecordIdsMap).length === 0) {
            if (debugMode) console.log("[CoachSummaryApp] No role record IDs found for the logged-in user. Cannot fetch students.");
            // Return structure consistent with paginated response
            return { records: [], currentPage: 1, totalPages: 0 }; 
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
            return { records: [], currentPage: 1, totalPages: 0 }; 
        }

        const baseStudentFilters = { match: 'or', rules: studentApiRules };
        let finalFilters = baseStudentFilters;

        const uiFilterRules = [];
        if (filters.studentLevel) {
            uiFilterRules.push({ field: FIELD_KEYS.studentLevel, operator: 'is', value: filters.studentLevel });
        }
        if (filters.studentName) {
            uiFilterRules.push({ field: FIELD_KEYS.studentNameFilterKey, operator: 'contains', value: filters.studentName });
        }
        if (filters.goalDeadline) {
            uiFilterRules.push({ field: FIELD_KEYS.goalFinishDate, operator: 'is after', value: filters.goalDeadline });
        }

        if (uiFilterRules.length > 0) {
            if (baseStudentFilters.rules.length > 0) {
                finalFilters = {
                    match: 'and',
                    rules: [
                        baseStudentFilters, 
                        ...uiFilterRules     
                    ]
                };
            } else {
                finalFilters = { match: 'and', rules: uiFilterRules };
            }
        }
        
        // Pass page to makeKnackApiRequest
        const studentData = await makeKnackApiRequest(`objects/${objectKeys.vespaResults}/records`, finalFilters, page);
        // Return records along with pagination info from Knack's response
        return {
            records: studentData.records || [],
            currentPage: studentData.current_page || 1,
            totalPages: studentData.total_pages || 0
        }; 
    }

    function renderFilterUI() {
        const filterHtml = `
            <div id="coachSummaryFilters" class="no-print">
                <h3>Filter Options</h3>
                <div class="filter-controls-grid">
                    <div class="filter-control">
                        <label for="filterStudentLevel">Student Level:</label>
                        <select id="filterStudentLevel">
                            <option value="">All Levels</option>
                            <option value="Year 7">Year 7</option>
                            <option value="Year 8">Year 8</option>
                            <option value="Year 9">Year 9</option>
                            <option value="Year 10">Year 10</option>
                            <option value="Year 11">Year 11</option>
                            <option value="Year 12">Year 12</option>
                            <option value="Year 13">Year 13</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div class="filter-control">
                        <label for="filterStudentName">Student Name:</label>
                        <input type="text" id="filterStudentName" placeholder="Enter name...">
                    </div>
                    <div class="filter-control">
                        <label for="filterGoalDeadline">Goal Deadline After:</label>
                        <input type="date" id="filterGoalDeadline">
                    </div>
                </div>
                <div class="filter-actions">
                    <button id="applyFiltersBtn" class="action-button">Apply Filters</button>
                    <button id="resetFiltersBtn" class="action-button secondary-action">Reset Filters</button>
                    <button id="printSummaryBtn" class="action-button">Print Summary</button>
                </div>
            </div>
            <hr class="no-print">
        `;
        targetElement.insertAdjacentHTML('afterbegin', filterHtml);
        const printButton = document.getElementById('printSummaryBtn');
        if (printButton) printButton.addEventListener('click', () => window.print());

        const applyButton = document.getElementById('applyFiltersBtn');
        if (applyButton) applyButton.addEventListener('click', applyStudentFiltersAndRefreshData);

        const resetButton = document.getElementById('resetFiltersBtn');
        if (resetButton) resetButton.addEventListener('click', resetFiltersAndRefreshData);
    }

    async function applyStudentFiltersAndRefreshData() {
        if (debugMode) console.log('[CoachSummaryApp] Applying filters and refreshing data...');
        const filters = {
            studentLevel: document.getElementById('filterStudentLevel').value,
            studentName: document.getElementById('filterStudentName').value,
            goalDeadline: document.getElementById('filterGoalDeadline').value
        };

        // Show loading state
        renderSummaryView(null); 

        try {
            // Assuming roleRecordIdsMap is relatively static or we want to filter *within* the initially determined set of students.
            // If filters should impact which *roles* are relevant (less likely for these filters), getRoleRecordIds would need to be re-run.
            // For now, we'll assume roleRecordIdsMap is fetched once on load or is passed/accessible here.
            // Let's ensure it's available, perhaps by fetching it if not already populated.
            if (!window.VESPA_APPS.coachSummaryRoleRecordIdsMap) {
                 if (debugMode) console.log('[CoachSummaryApp] roleRecordIdsMap not found on window, re-fetching for filter application.');
                 const loggedInUser = Knack.getUserAttributes();
                 const userEmail = loggedInUser.email;
                 const userRoles = Knack.getUserRoles() || [];
                 window.VESPA_APPS.coachSummaryRoleRecordIdsMap = await getRoleRecordIds(userEmail, userRoles);
            }
            
            const studentRecords = await fetchConnectedStudents(window.VESPA_APPS.coachSummaryRoleRecordIdsMap, filters);
            if (debugMode) console.log('[CoachSummaryApp] Fetched student records with filters:', studentRecords);
            renderSummaryView(studentRecords); // This will replace the 'Loading...' message
        } catch (error) {
            const summaryContainer = document.getElementById('summaryReportContainer');
            if(summaryContainer) {
                 //Instead of directly setting innerHTML, let renderSummaryView handle error display
                renderSummaryView([]); // Pass empty array to indicate error or no data after error
            }
            console.error('[CoachSummaryApp] Error applying filters and refreshing data:', error);
        }
    }

    async function resetFiltersAndRefreshData() {
        if (debugMode) console.log('[CoachSummaryApp] Resetting filters and refreshing data...');
        document.getElementById('filterStudentLevel').value = '';
        document.getElementById('filterStudentName').value = '';
        document.getElementById('filterGoalDeadline').value = '';
        await applyStudentFiltersAndRefreshData(); // Re-fetch and render with cleared filters
    }

    function renderSummaryView(studentRecords) {
        const summaryContainer = document.getElementById('summaryReportContainer');
        if (!summaryContainer) {
            console.error("[CoachSummaryApp] Summary container 'summaryReportContainer' not found. Cannot render.");
            return;
        }
        summaryContainer.innerHTML = ''; // Clear previous content

        if (studentRecords === null) { // Loading state
            summaryContainer.innerHTML = '<div class="loading-spinner"></div><p class="status-message">Loading student data...</p>';
            return;
        }

        if (!studentRecords || studentRecords.length === 0) {
            summaryContainer.innerHTML = '<p class="status-message">No students found matching your criteria or connected to your account.</p>';
        } else {
            let summaryHtml = ''; // Build HTML string for students
            studentRecords.forEach(student => {
                const getField = (fieldKey, defaultValue = '<em>Not provided</em>') => student[fieldKey] || defaultValue;
                
                const firstName = getField(FIELD_KEYS.studentFirstName, '');
                const lastName = getField(FIELD_KEYS.studentLastName, '');
                let fullName = (firstName + ' ' + lastName).trim();
                if (!fullName) fullName = 'N/A';

                const studentNameForLog = fullName !== 'N/A' ? fullName : 'Unknown Student';

                const currentCycleValue = student[FIELD_KEYS.currentMCycle]; // Raw value of currentMCycle, e.g., "C1"

                let vespaScoreFieldsToUse = { // Default to the 'current' fields (147-152)
                    vision: FIELD_KEYS.vision,
                    effort: FIELD_KEYS.effort,
                    systems: FIELD_KEYS.systems,
                    practice: FIELD_KEYS.practice,
                    attitude: FIELD_KEYS.attitude,
                    overall: FIELD_KEYS.overall
                };
                let cycleNameForDisplay = getField(FIELD_KEYS.currentMCycle, 'N/A'); // For the H5 heading

                if (currentCycleValue && VESPA_CYCLE_FIELDS[currentCycleValue]) {
                    vespaScoreFieldsToUse = VESPA_CYCLE_FIELDS[currentCycleValue];
                    if (debugMode) console.log(`[CoachSummaryApp] Student ${studentNameForLog}: Using VESPA scores for cycle ${currentCycleValue} from mapped fields.`);
                } else if (currentCycleValue) {
                    // Cycle value from field_146_raw exists but doesn't match C1, C2, C3 in VESPA_CYCLE_FIELDS
                    if (debugMode) console.log(`[CoachSummaryApp] Student ${studentNameForLog}: Cycle '${currentCycleValue}' (from field_146_raw) not found in VESPA_CYCLE_FIELDS. Defaulting to fields ${FIELD_KEYS.vision}-${FIELD_KEYS.overall}.`);
                    // cycleNameForDisplay is already correctly set from field_146_raw via getField
                } else {
                    // No currentMCycle value in student data
                    if (debugMode) console.log(`[CoachSummaryApp] Student ${studentNameForLog}: No currentMCycle value (field_146_raw). Defaulting to fields ${FIELD_KEYS.vision}-${FIELD_KEYS.overall}. Displaying '${cycleNameForDisplay}' for cycle.`);
                }

                const scores = {
                    vision: getField(vespaScoreFieldsToUse.vision, '-'),
                    effort: getField(vespaScoreFieldsToUse.effort, '-'),
                    systems: getField(vespaScoreFieldsToUse.systems, '-'),
                    practice: getField(vespaScoreFieldsToUse.practice, '-'),
                    attitude: getField(vespaScoreFieldsToUse.attitude, '-'),
                    overall: getField(vespaScoreFieldsToUse.overall, '-')
                };

                summaryHtml += `
                    <div class="student-summary-card">
                        <h4>${fullName} (${getField(FIELD_KEYS.studentLevel, 'N/A')})</h4>
                        <p><strong>Email:</strong> ${getField(FIELD_KEYS.studentEmail, 'N/A')}</p>
                        <h5>Latest VESPA Scores (Cycle: ${cycleNameForDisplay})</h5>
                        <table class="vespa-scores-table">
                            <thead><tr><th>V</th><th>E</th><th>S</th><th>P</th><th>A</th><th>O</th></tr></thead>
                            <tbody><tr>
                                <td>${scores.vision}</td>
                                <td>${scores.effort}</td>
                                <td>${scores.systems}</td>
                                <td>${scores.practice}</td>
                                <td>${scores.attitude}</td>
                                <td>${scores.overall}</td>
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
            summaryHtml += '</div>';
            summaryContainer.insertAdjacentHTML('beforeend', summaryHtml);
        }
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
                #${elementSelector.replace('#','')} { 
                    position: absolute; 
                    left: 0; 
                    top: 0; 
                    width: 100%; 
                    margin: 0; /* Remove default margin for print */
                    padding: 0; /* Remove default padding for print */
                    font-family: serif; /* Use a serif font for print */
                    font-size: 10pt; /* Adjust base font size for print */
                }
                .no-print { display: none !important; }
                .student-summary-card {
                    page-break-inside: avoid;
                    border: 1px solid #666; /* Darker border for print */
                    padding: 10px;
                    margin-bottom: 15px;
                    box-shadow: none; /* Remove shadow for print */
                    background-color: #fff !important; /* Ensure white background */
                }
                .student-summary-card h4, .student-summary-card h5 {
                    color: #000 !important; /* Black text for print */
                    border-bottom: 1px solid #ccc; /* Lighter border for headings in print */
                    padding-bottom: 3px;
                    margin-top: 10px;
                    margin-bottom: 5px;
                }
                .student-summary-card h4 { font-size: 12pt; }
                .student-summary-card h5 { font-size: 11pt; }
                .student-summary-card p { 
                    line-height: 1.4; /* Adjust line height for print */
                    color: #000 !important; 
                    font-size: 10pt;
                }
                .summary-divider { display: none; } /* Keep this if it was intentional to hide these lines for print */
                .vespa-scores-table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin-bottom: 8px; 
                }
                .vespa-scores-table th, .vespa-scores-table td { 
                    border: 1px solid #999; /* Slightly lighter table borders for print */
                    padding: 4px; 
                    text-align: center; 
                    font-size: 9pt;
                    color: #000 !important;
                }
                .text-block { 
                    border: 1px solid #ccc; 
                    padding: 8px; 
                    margin-top: 5px; 
                    background-color: #f9f9f9 !important; /* Keep light background or make white if preferred */
                    font-size: 9pt;
                    color: #000 !important;
                }
                .notes-section.print-only { 
                    margin-top: 10px; 
                }
                .notes-box { 
                    border: 1px dashed #999; /* Lighter dashed border for print */
                    height: 80px; /* Adjust height if necessary */
                    padding: 5px; 
                    margin-top: 5px; 
                }
                /* Hide filter UI and other on-screen specific styles from print */
                .filter-controls-grid, .filter-actions, #coachSummaryFilters h3 {
                    display: none !important;
                }
                 #printSummaryBtn { /* Explicitly hide print button in print view */
                    display: none !important;
                }
            }
            /* Additional styles for filter UI - can be moved to a CSS file eventually */
            .filter-controls-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 15px;
                margin-bottom: 15px;
            }
            .filter-control {
                display: flex;
                flex-direction: column;
            }
            .filter-control label {
                margin-bottom: 5px;
                font-weight: bold;
            }
            .filter-control select, .filter-control input {
                padding: 8px;
                border: 1px solid #ccc;
                border-radius: 4px;
            }
            .filter-actions {
                margin-top: 20px;
                display: flex;
                gap: 10px;
            }
            .action-button {
                padding: 10px 15px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                background-color: #007bff; /* Primary button color */
                color: white;
            }
            .action-button.secondary-action {
                background-color: #6c757d; /* Secondary button color */
            }
            .error-message {
                color: #dc3545; /* Bootstrap danger color for errors */
                font-weight: bold;
            }
            .status-message {
                font-style: italic;
                color: #555;
                text-align: center;
                padding: 20px;
            }
            .loading-spinner {
                border: 5px solid #f3f3f3; /* Light grey */
                border-top: 5px solid #007bff; /* Blue */
                border-radius: 50%;
                width: 40px;
                height: 40px;
                animation: spin 1s linear infinite;
                margin: 20px auto;
            }
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            /* On-screen styles for summary cards and layout */
            #summaryReportContainer {
                padding-top: 20px; /* Space below filters */
            }
            .student-summary-card {
                background-color: #fff;
                border: 1px solid #e0e0e0;
                border-radius: 8px;
                padding: 20px;
                margin-bottom: 25px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            }
            .student-summary-card h4 {
                margin-top: 0;
                color: #333;
                font-size: 1.25em;
            }
            .student-summary-card h5 {
                color: #555;
                font-size: 1.1em;
                margin-top: 15px;
                margin-bottom: 8px;
                border-bottom: 1px solid #eee;
                padding-bottom: 5px;
            }
            .student-summary-card p {
                line-height: 1.6;
                color: #444;
            }
            .student-summary-card .text-block {
                background-color: #f9f9f9;
                border: 1px solid #eee;
                padding: 12px;
                border-radius: 4px;
                margin-top: 5px;
                font-size: 0.95em;
            }
            .vespa-scores-table {
                margin-bottom: 15px;
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

        // Show initial loading state for the summary view
        const summaryContainer = document.getElementById('summaryReportContainer');
        if (summaryContainer) { // Check if it exists, though renderFilterUI might not have created it yet
             // renderSummaryView(null); // Call this AFTER summaryReportContainer is guaranteed to be on the page.
        } else {
            // If summaryReportContainer is not yet on the page (e.g. because renderFilterUI hasn't added it, or it's part of renderSummaryView's job)
            // we might need to ensure a placeholder is there or that renderSummaryView creates it.
            // For now, let's assume renderSummaryView will handle creating/finding the container if it should be called here.
            // Let's create the container if it doesn't exist before calling renderSummaryView(null)
            let container = document.getElementById('summaryReportContainer');
            if (!container) {
                targetElement.insertAdjacentHTML('beforeend', '<div id="summaryReportContainer"></div>');
            }
            renderSummaryView(null); // Now show loading in the newly created/verified container
        }

        try {
            const roleRecordIdsMap = await getRoleRecordIds(userEmail, userRoles);
            window.VESPA_APPS.coachSummaryRoleRecordIdsMap = roleRecordIdsMap; // Store for use by filters
            if (debugMode) console.log('[CoachSummaryApp] Map of role record IDs for connections:', roleRecordIdsMap);
            
            // Initial fetch without UI filters (or pass empty filters object)
            const studentRecords = await fetchConnectedStudents(roleRecordIdsMap, {}); 
            if (debugMode) console.log('[CoachSummaryApp] Fetched student records:', studentRecords);
            renderSummaryView(studentRecords);
        } catch (error) {
            // targetElement.innerHTML = '<p class="error-message">Error loading coaching summary data.</p>'; // Old error handling
            renderSummaryView([]); // Use new way to display error/no data state
            console.error('[CoachSummaryApp] Error in main execution flow:', error);
        }
    }

    main(); // Start the application logic
}

window.initializeCoachSummaryApp = initializeCoachSummaryApp;

