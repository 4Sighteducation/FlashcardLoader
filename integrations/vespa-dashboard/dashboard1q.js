// dashboard1f.js

// Ensure this matches the initializerFunctionName in WorkingBridge.js
function initializeDashboardApp() {
    // Get the configuration set by WorkingBridge.js
    const config = window.DASHBOARD_CONFIG;
    if (!config) {
        console.error("DASHBOARD_CONFIG not found. Dashboard cannot initialize.");
        return;
    }

    console.log("Initializing Dashboard App with config:", config);
    const {
        knackAppId,
        knackApiKey,
        debugMode,
        sceneKey,
        viewKey,
        elementSelector,
        herokuAppUrl, // Your Heroku backend URL
        objectKeys,
        themeColors,
        loggedInUserEmail
    } = config;

    // --- Helper Functions (General) ---
    function log(message, data) {
        if (debugMode) {
            console.log(`[Dashboard App] ${message}`, data === undefined ? '' : data);
        }
    }

    function errorLog(message, error) {
        console.error(`[Dashboard App ERROR] ${message}`, error);
    }

    // --- Knack API Helper ---
    // You'll need functions to fetch data from Knack.
    // These will typically use your Heroku app as a proxy to securely call the Knack API.
    // Example:
    async function fetchDataFromKnack(objectKey, filters = [], options = {}) {
        let url = `${config.herokuAppUrl}/api/knack-data?objectKey=${objectKey}&filters=${encodeURIComponent(JSON.stringify(filters))}`;
        
        // Append options to URL if they exist
        if (options.rows_per_page) {
            url += `&rows_per_page=${options.rows_per_page}`;
        }
        if (options.sort_field) {
            url += `&sort_field=${options.sort_field}`;
        }
        if (options.sort_order) {
            url += `&sort_order=${options.sort_order}`;
        }

        log("Fetching from backend URL:", url); 
        try {
            const response = await fetch(url);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `Knack API request via backend failed with status ${response.status}` }));
                throw new Error(errorData.message || `Knack API request via backend failed with status ${response.status}`);
            }
            const data = await response.json();
            return data.records; // The backend now wraps records in a 'records' key
        } catch (error) {
            errorLog(`Failed to fetch data for ${objectKey}`, error);
            throw error; // Re-throw to be handled by the caller
        }
    }

    // New function to get Staff Admin Record ID (from object_5) by User Email
    async function getStaffAdminRecordIdByEmail(userEmail) {
        if (!userEmail) {
            errorLog("User email not provided to getStaffAdminRecordIdByEmail.");
            return null;
        }
        if (!objectKeys.staffAdminRoles) {
            errorLog("staffAdminRoles object key not configured in DASHBOARD_CONFIG.objectKeys");
            return null;
        }

        const filters = [{
            field: 'field_86', // Email field in object_5 (Staff Admin Roles object)
            operator: 'is',
            value: userEmail
        }];

        try {
            log(`Fetching Staff Admin record from ${objectKeys.staffAdminRoles} for email: ${userEmail}`);
            const staffAdminRecords = await fetchDataFromKnack(objectKeys.staffAdminRoles, filters);
            if (staffAdminRecords && staffAdminRecords.length > 0) {
                if (staffAdminRecords.length > 1) {
                    log("Warning: Multiple Staff Admin records found for email:", userEmail, "Using the first one.");
                }
                log("Found Staff Admin record:", staffAdminRecords[0]);
                return staffAdminRecords[0].id; // Return the Record ID of the object_5 record
            } else {
                errorLog(`No Staff Admin record found in ${objectKeys.staffAdminRoles} for email: ${userEmail}`);
                return null;
            }
        } catch (error) {
            errorLog(`Error fetching Staff Admin record for email ${userEmail}:`, error);
            return null;
        }
    }

    // --- UI Rendering ---
    function renderDashboardUI(container) {
        log("Rendering Dashboard UI into:", container);
        
        // Add styles for the filters
        const style = document.createElement('style');
        style.textContent = `
            .filters-container {
                display: flex;
                flex-wrap: wrap;
                gap: 15px;
                margin: 20px 0;
                padding: 20px;
                background-color: rgba(255, 255, 255, 0.05);
                border-radius: 8px;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .filter-item {
                display: flex;
                flex-direction: column;
                min-width: 150px;
                flex: 1;
            }
            
            .filter-item label {
                color: #a8b2d1;
                font-size: 12px;
                margin-bottom: 5px;
                font-weight: 600;
            }
            
            .filter-item input,
            .filter-item select {
                padding: 8px 12px;
                border: 1px solid rgba(255, 255, 255, 0.2);
                background-color: rgba(0, 0, 0, 0.3);
                color: #ffffff;
                border-radius: 4px;
                font-size: 14px;
            }
            
            .filter-item input:focus,
            .filter-item select:focus {
                outline: none;
                border-color: #86b4f0;
                background-color: rgba(0, 0, 0, 0.5);
            }
            
            .filter-item button {
                padding: 8px 16px;
                margin-right: 10px;
                border: none;
                border-radius: 4px;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            #apply-filters-btn {
                background-color: #86b4f0;
                color: #0f0f23;
                font-weight: 600;
            }
            
            #apply-filters-btn:hover {
                background-color: #6a9bd8;
            }
            
            #clear-filters-btn {
                background-color: rgba(255, 255, 255, 0.1);
                color: #a8b2d1;
                border: 1px solid rgba(255, 255, 255, 0.2);
            }
            
            #clear-filters-btn:hover {
                background-color: rgba(255, 255, 255, 0.2);
            }
            
            .filter-item:last-child {
                flex-direction: row;
                align-items: flex-end;
                min-width: auto;
            }
        `;
        document.head.appendChild(style);
        
        container.innerHTML = `
            <div id="dashboard-container">
                <header>
                    <h1>VESPA Performance Dashboard</h1>
                </header>
                <section id="overview-section">
                    <h2>School Overview & Benchmarking</h2>
                    <div class="controls">
                        <label for="cycle-select">Select Cycle:</label>
                        <select id="cycle-select">
                            <option value="1">Cycle 1</option>
                            <option value="2">Cycle 2</option>
                            <option value="3">Cycle 3</option>
                        </select>
                    </div>
                    <div id="active-filters-display" style="display:none;">
                        <div class="active-filters-header">
                            <h3>Currently Viewing:</h3>
                            <div id="active-filters-list"></div>
                        </div>
                    </div>
                    <div class="filters-container">
                        <div class="filter-item">
                            <label for="student-search">Student:</label>
                            <input type="text" id="student-search" placeholder="Search by name..." />
                        </div>
                        <div class="filter-item">
                            <label for="group-filter">Group:</label>
                            <select id="group-filter">
                                <option value="">All Groups</option>
                            </select>
                        </div>
                        <div class="filter-item">
                            <label for="course-filter">Course:</label>
                            <select id="course-filter">
                                <option value="">All Courses</option>
                            </select>
                        </div>
                        <div class="filter-item">
                            <label for="year-group-filter">Year Group:</label>
                            <select id="year-group-filter">
                                <option value="">All Year Groups</option>
                            </select>
                        </div>
                        <div class="filter-item">
                            <label for="faculty-filter">Faculty:</label>
                            <select id="faculty-filter">
                                <option value="">All Faculties</option>
                            </select>
                        </div>
                        <div class="filter-item">
                            <button id="apply-filters-btn">Apply Filters</button>
                            <button id="clear-filters-btn">Clear Filters</button>
                        </div>
                    </div>
                   <div id="loading-indicator" style="display:none;">
                        <p>Loading chart data...</p>
                        <div class="spinner"></div>
                    </div>
                    <div class="dashboard-content-wrapper">
                        <div id="averages-summary-container" class="vespa-scores-grid">
                            <!-- Scorecards will be dynamically inserted here -->
                        </div>
                        <div id="distribution-charts-container">
                            <!-- Containers for Vision, Effort, Systems, Practice, Attitude, Overall -->
                            <div class="chart-wrapper">
                                <canvas id="vision-distribution-chart"></canvas>
                            </div>
                            <div class="chart-wrapper">
                                <canvas id="effort-distribution-chart"></canvas>
                            </div>
                            <div class="chart-wrapper">
                                <canvas id="systems-distribution-chart"></canvas>
                            </div>
                            <div class="chart-wrapper">
                                <canvas id="practice-distribution-chart"></canvas>
                            </div>
                            <div class="chart-wrapper">
                                <canvas id="attitude-distribution-chart"></canvas>
                            </div>
                            <div class="chart-wrapper">
                                <canvas id="overall-distribution-chart"></canvas>
                            </div>
                        </div>
                    </div>
                </section>
                <section id="qla-section">
                    <h2>Question Level Analysis</h2>
                    <div id="qla-controls">
                        <select id="qla-question-dropdown"></select>
                        <input type="text" id="qla-chat-input" placeholder="Ask about the question data...">
                        <button id="qla-chat-submit">Ask AI</button>
                    </div>
                    <div id="qla-ai-response"></div>
                    <div id="qla-top-bottom-questions">
                        <h3>Top 5 Questions</h3>
                        <ul id="qla-top-5"></ul>
                        <h3>Bottom 5 Questions</h3>
                        <ul id="qla-bottom-5"></ul>
                    </div>
                    <div id="qla-stats">
                        <!-- Other interesting statistical info -->
                    </div>
                </section>
                <section id="student-insights-section">
                    <h2>Student Comment Insights</h2>
                    <div id="word-cloud-container"></div>
                    <div id="common-themes-container"></div>
                </section>
            </div>
        `;
        // Add event listeners for UI elements (e.g., qla-chat-submit)
        document.getElementById('qla-chat-submit').addEventListener('click', handleQLAChatSubmit);
    }

    // --- Filter Management Functions ---
    function getActiveFilters() {
        const filters = [];
        const activeFilterDisplay = [];
        
        // Student search filter
        const studentSearch = document.getElementById('student-search')?.value.trim();
        if (studentSearch) {
            activeFilterDisplay.push({ type: 'Student', value: studentSearch, priority: true });
            // For name fields in Knack, we typically need to search both first and last name
            filters.push({
                match: 'or',
                rules: [
                    {
                        field: 'field_187', // Student name field
                        operator: 'contains',
                        value: studentSearch,
                        field_name: 'first' // Search in first name
                    },
                    {
                        field: 'field_187',
                        operator: 'contains', 
                        value: studentSearch,
                        field_name: 'last' // Search in last name
                    }
                ]
            });
        }
        
        // Group filter - could be text or connection field
        const groupFilter = document.getElementById('group-filter')?.value;
        const groupText = document.getElementById('group-filter')?.selectedOptions[0]?.textContent;
        if (groupFilter && groupText !== 'All Groups') {
            activeFilterDisplay.push({ type: 'Group', value: groupText });
            // Check if the value looks like an object ID (for connected fields)
            // Otherwise treat as text field
            const isObjectId = /^[a-f0-9]{24}$/i.test(groupFilter);
            filters.push({
                field: 'field_223',
                operator: isObjectId ? 'contains' : 'is',
                value: groupFilter
            });
        }
        
        // Course filter
        const courseFilter = document.getElementById('course-filter')?.value;
        const courseText = document.getElementById('course-filter')?.selectedOptions[0]?.textContent;
        if (courseFilter && courseText !== 'All Courses') {
            activeFilterDisplay.push({ type: 'Course', value: courseText });
            filters.push({
                field: 'field_2299',
                operator: 'is',
                value: courseFilter
            });
        }
        
        // Year Group filter
        const yearGroupFilter = document.getElementById('year-group-filter')?.value;
        const yearGroupText = document.getElementById('year-group-filter')?.selectedOptions[0]?.textContent;
        if (yearGroupFilter && yearGroupText !== 'All Year Groups') {
            activeFilterDisplay.push({ type: 'Year Group', value: yearGroupText });
            filters.push({
                field: 'field_144',
                operator: 'is',
                value: yearGroupFilter
            });
        }
        
        // Faculty filter
        const facultyFilter = document.getElementById('faculty-filter')?.value;
        const facultyText = document.getElementById('faculty-filter')?.selectedOptions[0]?.textContent;
        if (facultyFilter && facultyText !== 'All Faculties') {
            activeFilterDisplay.push({ type: 'Faculty', value: facultyText });
            filters.push({
                field: 'field_782',
                operator: 'is',
                value: facultyFilter
            });
        }
        
        // Update the active filters display
        updateActiveFiltersDisplay(activeFilterDisplay);
        
        return filters;
    }

    function updateActiveFiltersDisplay(activeFilters) {
        const displayContainer = document.getElementById('active-filters-display');
        const filtersList = document.getElementById('active-filters-list');
        
        if (!displayContainer || !filtersList) return;
        
        if (activeFilters.length === 0) {
            displayContainer.style.display = 'none';
            return;
        }
        
        displayContainer.style.display = 'block';
        filtersList.innerHTML = '';
        
        // Sort filters to show priority (student) first
        activeFilters.sort((a, b) => {
            if (a.priority && !b.priority) return -1;
            if (!a.priority && b.priority) return 1;
            return 0;
        });
        
        activeFilters.forEach(filter => {
            const filterTag = document.createElement('div');
            filterTag.className = 'active-filter-tag';
            if (filter.priority) filterTag.classList.add('priority');
            
            filterTag.innerHTML = `
                <span class="filter-type">${filter.type}:</span>
                <span class="filter-value">${filter.value}</span>
            `;
            
            filtersList.appendChild(filterTag);
        });
    }

    async function populateFilterDropdowns(staffAdminId) {
        log("Populating filter dropdowns");
        
        try {
            // Fetch all records for this staff admin to extract unique values
            let allRecords = [];
            if (staffAdminId) {
                const staffAdminFilter = [{
                    field: 'field_439',
                    operator: 'is',
                    value: staffAdminId
                }];
                allRecords = await fetchDataFromKnack(objectKeys.vespaResults, staffAdminFilter);
            }
            
            if (!allRecords || allRecords.length === 0) {
                log("No records found to populate filters");
                return;
            }
            
            log(`Processing ${allRecords.length} records for filter values`);
            
            // Extract unique values for each filter
            const groups = new Set();
            const courses = new Set();
            const yearGroups = new Set();
            const faculties = new Set();
            
            // Debug: Log first record to see field structure
            if (allRecords.length > 0) {
                log("Sample record for debugging:", {
                    field_223: allRecords[0].field_223,
                    field_223_raw: allRecords[0].field_223_raw,
                    field_2299: allRecords[0].field_2299,
                    field_2299_raw: allRecords[0].field_2299_raw,
                    field_144_raw: allRecords[0].field_144_raw,
                    field_782_raw: allRecords[0].field_782_raw
                });
            }
            
            allRecords.forEach((record, index) => {
                // Group (field_223) - Handle as text field
                // Try both field_223_raw and field_223 as Knack might store text fields differently
                const groupFieldValue = record.field_223_raw || record.field_223;
                if (groupFieldValue) {
                    if (index < 3) { // Log first few records for debugging
                        log(`Record ${index} - Group field_223_raw:`, record.field_223_raw, "field_223:", record.field_223);
                    }
                    // If it's an array (connected field), handle differently
                    if (Array.isArray(groupFieldValue)) {
                        groupFieldValue.forEach((groupId, idx) => {
                            if (groupId) {
                                // Try to get display value
                                let displayValue = record.field_223 || groupId;
                                if (Array.isArray(record.field_223)) {
                                    displayValue = record.field_223[idx] || groupId;
                                }
                                groups.add(JSON.stringify({ id: groupId, name: displayValue }));
                            }
                        });
                    } else if (typeof groupFieldValue === 'object' && groupFieldValue !== null) {
                        // Sometimes Knack returns objects for connected fields
                        if (groupFieldValue.id) {
                            groups.add(JSON.stringify({ 
                                id: groupFieldValue.id, 
                                name: groupFieldValue.identifier || groupFieldValue.value || groupFieldValue.id 
                            }));
                        }
                    } else {
                        // It's a text field - use the value directly
                        const groupValue = groupFieldValue.toString().trim();
                        if (groupValue && groupValue !== 'null' && groupValue !== 'undefined') {
                            groups.add(groupValue);
                        }
                    }
                }
                
                // Course (field_2299) - Handle both text and connected fields
                const courseFieldValue = record.field_2299_raw || record.field_2299;
                if (courseFieldValue) {
                    if (index < 3) { // Log first few records for debugging
                        log(`Record ${index} - Course field_2299_raw:`, record.field_2299_raw, "field_2299:", record.field_2299);
                    }
                    if (Array.isArray(courseFieldValue)) {
                        // Connected field
                        courseFieldValue.forEach((courseId, idx) => {
                            if (courseId) {
                                let displayValue = record.field_2299 || courseId;
                                if (Array.isArray(record.field_2299)) {
                                    displayValue = record.field_2299[idx] || courseId;
                                }
                                courses.add(JSON.stringify({ id: courseId, name: displayValue }));
                            }
                        });
                    } else if (typeof courseFieldValue === 'object' && courseFieldValue !== null) {
                        // Sometimes Knack returns objects for connected fields
                        if (courseFieldValue.id) {
                            courses.add(JSON.stringify({ 
                                id: courseFieldValue.id, 
                                name: courseFieldValue.identifier || courseFieldValue.value || courseFieldValue.id 
                            }));
                        }
                    } else {
                        // Text field
                        const courseValue = courseFieldValue.toString().trim();
                        if (courseValue && courseValue !== 'null' && courseValue !== 'undefined') {
                            courses.add(courseValue);
                        }
                    }
                }
                
                // Year Group (field_144)
                if (record.field_144_raw) {
                    const yearGroupValue = record.field_144_raw.toString().trim();
                    if (yearGroupValue) {
                        yearGroups.add(yearGroupValue);
                    }
                }
                
                // Faculty (field_782)
                if (record.field_782_raw) {
                    const facultyValue = record.field_782_raw.toString().trim();
                    if (facultyValue) {
                        faculties.add(facultyValue);
                    }
                }
            });
            
            // Debug: Log collected values
            log("Collected filter values:", {
                groups: Array.from(groups),
                courses: Array.from(courses),
                yearGroups: Array.from(yearGroups),
                faculties: Array.from(faculties)
            });
            
            // Populate dropdowns
            // Process groups - could be strings or JSON objects
            const groupItems = Array.from(groups).map(g => {
                try {
                    return JSON.parse(g);
                } catch (e) {
                    // It's a plain string, not JSON
                    return g;
                }
            }).sort((a, b) => {
                const aName = typeof a === 'object' ? a.name : a;
                const bName = typeof b === 'object' ? b.name : b;
                return aName.localeCompare(bName);
            });
            
            // Process courses - could be strings or JSON objects
            const courseItems = Array.from(courses).map(c => {
                try {
                    return JSON.parse(c);
                } catch (e) {
                    // It's a plain string, not JSON
                    return c;
                }
            }).sort((a, b) => {
                const aName = typeof a === 'object' ? a.name : a;
                const bName = typeof b === 'object' ? b.name : b;
                return aName.localeCompare(bName);
            });
            
            populateDropdown('group-filter', groupItems, 'name', 'id');
            populateDropdown('course-filter', courseItems, 'name', 'id');
            populateDropdown('year-group-filter', Array.from(yearGroups).sort());
            populateDropdown('faculty-filter', Array.from(faculties).sort());
            
        } catch (error) {
            errorLog("Failed to populate filter dropdowns", error);
        }
    }
    
    function populateDropdown(dropdownId, items, displayProperty = null, valueProperty = null) {
        const dropdown = document.getElementById(dropdownId);
        if (!dropdown) return;
        
        // Keep the "All" option
        const allOption = dropdown.querySelector('option[value=""]');
        dropdown.innerHTML = '';
        if (allOption) dropdown.appendChild(allOption);
        
        items.forEach(item => {
            const option = document.createElement('option');
            if (typeof item === 'object' && item !== null) {
                // It's an object
                if (displayProperty && item[displayProperty] !== undefined) {
                    option.textContent = item[displayProperty];
                    option.value = valueProperty && item[valueProperty] !== undefined ? item[valueProperty] : item[displayProperty];
                } else {
                    // Fallback if properties don't exist
                    option.value = JSON.stringify(item);
                    option.textContent = JSON.stringify(item);
                }
            } else {
                // It's a simple value (string/number)
                option.value = item;
                option.textContent = item;
            }
            dropdown.appendChild(option);
        });
        
        log(`Populated ${dropdownId} with ${items.length} items`);
    }

    // --- Section 1: Overview and Benchmarking ---
    async function loadOverviewData(staffAdminId, cycle = 1, additionalFilters = []) {
        log(`Loading overview data with Staff Admin ID: ${staffAdminId} for Cycle: ${cycle}`);
        const loadingIndicator = document.getElementById('loading-indicator');
        const averagesContainer = document.getElementById('averages-summary-container');
        const distributionContainer = document.getElementById('distribution-charts-container');

        if (loadingIndicator) loadingIndicator.style.display = 'block';
        if (averagesContainer) averagesContainer.style.display = 'none'; // Hide while loading
        if (distributionContainer) distributionContainer.style.display = 'none'; // Hide while loading

        try {
            let schoolVespaResults = [];
            if (staffAdminId) {
                const filters = [{
                    field: 'field_439',
                    operator: 'is',
                    value: staffAdminId
                }];
                
                // Add any additional filters
                if (additionalFilters && additionalFilters.length > 0) {
                    filters.push(...additionalFilters);
                }
                
                schoolVespaResults = await fetchDataFromKnack(objectKeys.vespaResults, filters);
                log("Fetched School VESPA Results (filtered):", schoolVespaResults ? schoolVespaResults.length : 0);
            } else {
                log("No Staff Admin ID provided to loadOverviewData. Cannot filter school-specific data.");
            }

            // Fetch National Benchmark Data from Object_120
            let nationalBenchmarkRecord = null;
            if (objectKeys.nationalBenchmarkData) {
                // Fetch only the latest record, sorted by field_3307 (Date Time) in descending order
                const nationalDataResults = await fetchDataFromKnack(
                    objectKeys.nationalBenchmarkData, 
                    [], // No specific filters for national data
                    { rows_per_page: 1, sort_field: 'field_3307', sort_order: 'desc' } // Options for fetching latest
                );

                if (nationalDataResults && nationalDataResults.length > 0) {
                    // No need to sort here anymore as we requested sorted data and only one record
                    nationalBenchmarkRecord = nationalDataResults[0];
                    log("Fetched latest National Benchmark Record (Object_120 - actually object_10 for national):", nationalBenchmarkRecord);
                } else {
                    log("No National Benchmark Data (Object_120 - object_10 for national) found or objectKey not configured.");
                }
            } else {
                log("nationalBenchmarkData object key not configured in DASHBOARD_CONFIG.objectKeys");
            }

            const schoolAverages = calculateSchoolVespaAverages(schoolVespaResults, cycle);
            log(`School Averages (Cycle ${cycle}):`, schoolAverages);

            let nationalAverages = { vision: 0, effort: 0, systems: 0, practice: 0, attitude: 0, overall: 0 };
            let nationalDistributions = null; // Will hold parsed JSON distribution data
            
            if (nationalBenchmarkRecord) {
                nationalAverages = getNationalVespaAveragesFromRecord(nationalBenchmarkRecord, cycle);
                log("Processed National Averages for charts:", nationalAverages);
                
                // Parse national distribution JSON data
                const distributionFieldMap = {
                    1: 'field_3409', // distribution_json_cycle1
                    2: 'field_3410', // distribution_json_cycle2
                    3: 'field_3411'  // distribution_json_cycle3
                };
                
                const distributionField = distributionFieldMap[cycle];
                if (distributionField && nationalBenchmarkRecord[distributionField + '_raw']) {
                    try {
                        nationalDistributions = JSON.parse(nationalBenchmarkRecord[distributionField + '_raw']);
                        log(`Parsed National Distribution data for Cycle ${cycle}:`, nationalDistributions);
                    } catch (e) {
                        errorLog(`Failed to parse national distribution JSON for cycle ${cycle}:`, e);
                    }
                }
            } else {
                log("National benchmark record was null, nationalAverages will be default/empty.");
            }
            log(`National Averages (Cycle ${cycle}):`, nationalAverages); // This log was already there, good.
            
            renderAveragesChart(schoolAverages, nationalAverages, cycle);
            renderDistributionCharts(schoolVespaResults, nationalAverages, themeColors, cycle, nationalDistributions);

        } catch (error) {
            errorLog("Failed to load overview data", error);
            const overviewSection = document.getElementById('overview-section');
            if(overviewSection) overviewSection.innerHTML = "<p>Error loading overview data. Please check console.</p>";
        } finally {
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            if (averagesContainer) averagesContainer.style.display = 'block'; // Show again
            if (distributionContainer) distributionContainer.style.display = 'block'; // Show again
        }
    }

    // Renamed to be specific for school data and to potentially handle cycles
    function calculateSchoolVespaAverages(results, cycle) {
        log(`Calculating School VESPA averages for Cycle ${cycle} using historical fields.`);
        
        const averages = { vision: 0, effort: 0, systems: 0, practice: 0, attitude: 0, overall: 0 };
        let validRecordsCount = 0;

        if (!Array.isArray(results) || results.length === 0) {
            log("calculateSchoolVespaAverages: Input is not a valid array or is empty", results);
            return averages;
        }

        const fieldMappings = {
            cycle1: { v: 'field_155', e: 'field_156', s: 'field_157', p: 'field_158', a: 'field_159', o: 'field_160' },
            cycle2: { v: 'field_161', e: 'field_162', s: 'field_163', p: 'field_164', a: 'field_165', o: 'field_166' },
            cycle3: { v: 'field_167', e: 'field_168', s: 'field_169', p: 'field_170', a: 'field_171', o: 'field_172' }
        };

        const currentCycleFields = fieldMappings[`cycle${cycle}`];

        if (!currentCycleFields) {
            errorLog(`Invalid cycle number ${cycle} for school VESPA averages field mapping.`);
            return averages; // Return default if cycle is invalid
        }

        results.forEach(record => {
            // Read scores from the specific historical fields for the given cycle
            const v = parseFloat(record[currentCycleFields.v + '_raw']);
            const e = parseFloat(record[currentCycleFields.e + '_raw']);
            const s = parseFloat(record[currentCycleFields.s + '_raw']);
            const p = parseFloat(record[currentCycleFields.p + '_raw']);
            const a = parseFloat(record[currentCycleFields.a + '_raw']);
            const o = parseFloat(record[currentCycleFields.o + '_raw']);

            if (!isNaN(o)) { // Using overall score to validate the record for this cycle
                if (!isNaN(v)) averages.vision += v;
                if (!isNaN(e)) averages.effort += e;
                if (!isNaN(s)) averages.systems += s;
                if (!isNaN(p)) averages.practice += p;
                if (!isNaN(a)) averages.attitude += a;
                averages.overall += o;
                validRecordsCount++;
            }
        });

        if (validRecordsCount > 0) {
            for (const key in averages) {
                averages[key] = parseFloat((averages[key] / validRecordsCount).toFixed(2));
            }
        }
        return averages;
    }

    function getNationalVespaAveragesFromRecord(record, cycle) {
        const nationalAverages = { vision: 0, effort: 0, systems: 0, practice: 0, attitude: 0, overall: 0 };
        if (!record) return nationalAverages;

        const fieldMappings = {
            cycle1: { v: 'field_3292', e: 'field_3293', s: 'field_3294', p: 'field_3295', a: 'field_3296', o: 'field_3406' },
            cycle2: { v: 'field_3297', e: 'field_3298', s: 'field_3299', p: 'field_3300', a: 'field_3301', o: 'field_3407' },
            cycle3: { v: 'field_3302', e: 'field_3303', s: 'field_3304', p: 'field_3305', a: 'field_3306', o: 'field_3408' }
        };

        const currentCycleFields = fieldMappings[`cycle${cycle}`];
        if (!currentCycleFields) {
            errorLog(`Invalid cycle number ${cycle} for national VESPA averages.`);
            return nationalAverages;
        }

        nationalAverages.vision = parseFloat(record[currentCycleFields.v + '_raw']) || 0;
        nationalAverages.effort = parseFloat(record[currentCycleFields.e + '_raw']) || 0;
        nationalAverages.systems = parseFloat(record[currentCycleFields.s + '_raw']) || 0;
        nationalAverages.practice = parseFloat(record[currentCycleFields.p + '_raw']) || 0;
        nationalAverages.attitude = parseFloat(record[currentCycleFields.a + '_raw']) || 0;
        nationalAverages.overall = parseFloat(record[currentCycleFields.o + '_raw']) || 0;
        
        log(`Parsed National Averages from Object_120 for Cycle ${cycle}:`, nationalAverages);
        return nationalAverages;
    }

    function renderAveragesChart(schoolData, nationalData, cycle) {
        const container = document.getElementById('averages-summary-container');
        if (!container) {
            errorLog("Averages summary container not found");
            return;
        }
        container.innerHTML = ''; // Clear previous content

        log(`Rendering averages scorecards for Cycle ${cycle}. School:`, schoolData, "National:", nationalData);

        const elementsToDisplay = [
            { key: 'vision', name: 'VISION' },
            { key: 'effort', name: 'EFFORT' },
            { key: 'systems', name: 'SYSTEMS' },
            { key: 'practice', name: 'PRACTICE' },
            { key: 'attitude', name: 'ATTITUDE' },
            { key: 'overall', name: 'OVERALL' } // Assuming 'overall' is available in schoolData and nationalData
        ];

        const defaultThemeColors = {
            vision: '#ff8f00',
            effort: '#86b4f0',
            systems: '#72cb44',
            practice: '#7f31a4',
            attitude: '#f032e6',
            overall: '#ffd93d'
        };

        const currentThemeColors = config.themeColors || defaultThemeColors;

        elementsToDisplay.forEach(element => {
            const schoolScore = schoolData[element.key];
            const nationalScore = nationalData[element.key];

            const card = document.createElement('div');
            card.className = 'vespa-score-card';
            // Remove inline backgroundColor style to let CSS handle the colors via nth-child

            let percentageDiffText = '';
            let arrow = '';
            let arrowClass = '';

            if (nationalScore !== null && typeof nationalScore !== 'undefined' && nationalScore > 0 && schoolScore !== null && typeof schoolScore !== 'undefined') {
                const diff = ((schoolScore - nationalScore) / nationalScore) * 100;
                arrow = diff >= 0 ? '↑' : '↓';
                arrowClass = diff >= 0 ? 'up' : 'down';
                percentageDiffText = `${diff.toFixed(1)}%`;
            } else if (schoolScore !== null && typeof schoolScore !== 'undefined') {
                if (nationalScore === 0) {
                    percentageDiffText = 'Nat Avg 0';
                } else {
                    percentageDiffText = 'Nat N/A';
                }
            }

            // Determine if overall score should have different decimal places (e.g., 1 vs 2 for others)
            // The image shows scores like 6, 6.3, 5.4, 6.1, 5.9 - mostly one decimal place.
            const scoreToDisplay = (typeof schoolScore === 'number') ? schoolScore.toFixed(1) : 'N/A';
            const nationalScoreToDisplay = (typeof nationalScore === 'number') ? nationalScore.toFixed(1) : 'N/A';

            card.innerHTML = `
                <h3>${element.name}</h3>
                <div class="score-value">${scoreToDisplay}</div>
                <div class="national-comparison">
                    National: ${nationalScoreToDisplay} <span class="arrow ${arrowClass}">${arrow}</span> ${percentageDiffText}
                </div>
                <button class="advanced-stats-btn" data-element="${element.key}" data-cycle="${cycle}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 3v18h18M9 17V9m4 8V5m4 12V11"/>
                    </svg>
                    Stats
                </button>
            `;
            container.appendChild(card);
        });
        
        // Add event listeners for advanced stats buttons
        container.querySelectorAll('.advanced-stats-btn').forEach(btn => {
            btn.addEventListener('click', handleAdvancedStatsClick);
        });
    }

    // --- Advanced Statistics Functions ---
    function calculateStatistics(values) {
        if (!values || values.length === 0) {
            return null;
        }

        // Sort values for percentile calculations
        const sorted = values.slice().sort((a, b) => a - b);
        const n = sorted.length;

        // Calculate mean
        const mean = values.reduce((sum, val) => sum + val, 0) / n;

        // Calculate standard deviation
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
        const stdDev = Math.sqrt(variance);

        // Calculate percentiles
        const percentile = (p) => {
            const index = (p / 100) * (n - 1);
            const lower = Math.floor(index);
            const upper = Math.ceil(index);
            const weight = index % 1;
            return sorted[lower] * (1 - weight) + sorted[upper] * weight;
        };

        // Calculate skewness (simplified)
        const skewness = n > 2 ? 
            (values.reduce((sum, val) => sum + Math.pow((val - mean) / stdDev, 3), 0) / n) : 0;

        // Calculate confidence intervals (95%)
        const confidenceInterval = 1.96 * (stdDev / Math.sqrt(n));

        return {
            mean: parseFloat(mean.toFixed(2)),
            std_dev: parseFloat(stdDev.toFixed(2)),
            min: Math.min(...values),
            max: Math.max(...values),
            percentile_25: parseFloat(percentile(25).toFixed(2)),
            percentile_50: parseFloat(percentile(50).toFixed(2)),
            percentile_75: parseFloat(percentile(75).toFixed(2)),
            confidence_interval_lower: parseFloat((mean - confidenceInterval).toFixed(2)),
            confidence_interval_upper: parseFloat((mean + confidenceInterval).toFixed(2)),
            skewness: parseFloat(skewness.toFixed(3)),
            count: n
        };
    }

    function calculateSchoolStatistics(schoolResults, cycle, elementKey) {
        const fieldMappings = {
            cycle1: { 
                vision: 'field_155', effort: 'field_156', systems: 'field_157', 
                practice: 'field_158', attitude: 'field_159', overall: 'field_160' 
            },
            cycle2: { 
                vision: 'field_161', effort: 'field_162', systems: 'field_163', 
                practice: 'field_164', attitude: 'field_165', overall: 'field_166' 
            },
            cycle3: { 
                vision: 'field_167', effort: 'field_168', systems: 'field_169', 
                practice: 'field_170', attitude: 'field_171', overall: 'field_172' 
            }
        };

        const cycleFields = fieldMappings[`cycle${cycle}`];
        if (!cycleFields || !cycleFields[elementKey]) {
            return null;
        }

        const fieldKey = cycleFields[elementKey] + '_raw';
        const values = [];

        schoolResults.forEach(record => {
            const value = parseFloat(record[fieldKey]);
            if (!isNaN(value)) {
                values.push(value);
            }
        });

        return calculateStatistics(values);
    }

    async function handleAdvancedStatsClick(event) {
        const button = event.currentTarget;
        const elementKey = button.dataset.element;
        const cycle = parseInt(button.dataset.cycle);

        log(`Opening advanced stats for ${elementKey} - Cycle ${cycle}`);

        // Show loading state
        showStatsPanel(elementKey, cycle, true);

        try {
            // Get current school results (filtered)
            const activeFilters = getActiveFilters();
            let schoolResults = [];
            
            const staffAdminId = await getStaffAdminRecordIdByEmail(loggedInUserEmail);
            if (staffAdminId) {
                const filters = [{
                    field: 'field_439',
                    operator: 'is',
                    value: staffAdminId
                }, ...activeFilters];
                
                schoolResults = await fetchDataFromKnack(objectKeys.vespaResults, filters);
            }

            // Calculate school statistics
            const schoolStats = calculateSchoolStatistics(schoolResults, cycle, elementKey);

            // Fetch national statistics
            let nationalStats = null;
            if (objectKeys.nationalBenchmarkData) {
                const nationalData = await fetchDataFromKnack(
                    objectKeys.nationalBenchmarkData, 
                    [], 
                    { rows_per_page: 1, sort_field: 'field_3307', sort_order: 'desc' }
                );

                if (nationalData && nationalData.length > 0) {
                    const statsFieldMap = {
                        1: 'field_3429',
                        2: 'field_3430',
                        3: 'field_3421'  // Note: You mentioned field_3421 for cycle 3
                    };
                    
                    const statsField = statsFieldMap[cycle];
                    if (statsField && nationalData[0][statsField + '_raw']) {
                        try {
                            const allStats = JSON.parse(nationalData[0][statsField + '_raw']);
                            // Get stats for the specific element (capitalize first letter)
                            const elementName = elementKey.charAt(0).toUpperCase() + elementKey.slice(1);
                            nationalStats = allStats[elementName];
                        } catch (e) {
                            errorLog(`Failed to parse national statistics for cycle ${cycle}:`, e);
                        }
                    }
                }
            }

            // Update panel with data
            updateStatsPanel(elementKey, cycle, schoolStats, nationalStats);

        } catch (error) {
            errorLog("Error loading advanced statistics:", error);
            updateStatsPanel(elementKey, cycle, null, null, error.message);
        }
    }

    function showStatsPanel(elementKey, cycle, isLoading = false) {
        // Create panel HTML if it doesn't exist
        let overlay = document.querySelector('.stats-panel-overlay');
        let panel = document.querySelector('.stats-panel');
        
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'stats-panel-overlay';
            overlay.addEventListener('click', hideStatsPanel);
            document.body.appendChild(overlay);
        }
        
        if (!panel) {
            panel = document.createElement('div');
            panel.className = 'stats-panel';
            document.body.appendChild(panel);
        }

        // Set initial content
        const elementColors = {
            vision: 'var(--vision-color)',
            effort: 'var(--effort-color)',
            systems: 'var(--systems-color)',
            practice: 'var(--practice-color)',
            attitude: 'var(--attitude-color)',
            overall: 'var(--overall-color)'
        };

        const elementName = elementKey.charAt(0).toUpperCase() + elementKey.slice(1);
        const color = elementColors[elementKey] || 'var(--accent-primary)';

        panel.innerHTML = `
            <div class="stats-panel-header">
                <div class="stats-panel-title">
                    <h3>
                        Advanced Statistics
                        <span class="stats-element-badge" style="background-color: ${color}">
                            ${elementName} - Cycle ${cycle}
                        </span>
                    </h3>
                    <button class="stats-close-btn" onclick="hideStatsPanel()">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="stats-panel-content">
                ${isLoading ? '<div class="stats-loading"><div class="spinner"></div><p>Calculating statistics...</p></div>' : ''}
            </div>
        `;

        // Show panel with animation
        requestAnimationFrame(() => {
            overlay.classList.add('active');
            panel.classList.add('active');
        });
    }

    function updateStatsPanel(elementKey, cycle, schoolStats, nationalStats, error = null) {
        const panel = document.querySelector('.stats-panel');
        const content = panel.querySelector('.stats-panel-content');
        
        if (error) {
            content.innerHTML = `
                <div class="stats-section">
                    <p style="color: var(--accent-danger); text-align: center;">
                        Error loading statistics: ${error}
                    </p>
                </div>
            `;
            return;
        }

        if (!schoolStats && !nationalStats) {
            content.innerHTML = `
                <div class="stats-section">
                    <p style="color: var(--text-muted); text-align: center;">
                        No statistical data available.
                    </p>
                </div>
            `;
            return;
        }

        // Generate comparison HTML
        content.innerHTML = `
            <div class="stats-comparison">
                ${schoolStats ? generateStatsSection('Your School', schoolStats, nationalStats, 'school') : ''}
                ${nationalStats ? generateStatsSection('National Benchmark', nationalStats, null, 'national') : ''}
                ${schoolStats && nationalStats ? generateInsights(schoolStats, nationalStats, elementKey) : ''}
            </div>
        `;

        // Add box plot visualization if both datasets exist
        if (schoolStats && nationalStats) {
            // You could add a box plot here using Chart.js or D3.js
        }
    }

    function generateStatsSection(title, stats, compareStats, type) {
        const formatDiff = (value, compareValue) => {
            if (!compareStats || compareValue === undefined) return '';
            const diff = value - compareValue;
            const percentage = compareValue !== 0 ? (diff / compareValue * 100).toFixed(1) : 0;
            const isPositive = diff > 0;
            return `<span class="stat-diff ${isPositive ? 'positive' : 'negative'}">
                ${isPositive ? '+' : ''}${percentage}%
            </span>`;
        };

        return `
            <div class="stats-section">
                <h4>${title}</h4>
                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="stat-label">Mean</div>
                        <div class="stat-value">
                            ${stats.mean}
                            ${formatDiff(stats.mean, compareStats?.mean)}
                        </div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Standard Deviation</div>
                        <div class="stat-value">
                            ${stats.std_dev}
                            ${formatDiff(stats.std_dev, compareStats?.std_dev)}
                        </div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">25th Percentile</div>
                        <div class="stat-value">${stats.percentile_25}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Median (50th)</div>
                        <div class="stat-value">${stats.percentile_50}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">75th Percentile</div>
                        <div class="stat-value">${stats.percentile_75}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Sample Size</div>
                        <div class="stat-value">${stats.count.toLocaleString()}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Range</div>
                        <div class="stat-value">${stats.min} - ${stats.max}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Confidence Interval</div>
                        <div class="stat-value" style="font-size: 1rem;">
                            ${stats.confidence_interval_lower} - ${stats.confidence_interval_upper}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function generateInsights(schoolStats, nationalStats, elementKey) {
        const insights = [];
        
        // Compare mean
        if (schoolStats.mean > nationalStats.mean) {
            const diff = ((schoolStats.mean - nationalStats.mean) / nationalStats.mean * 100).toFixed(1);
            insights.push({
                type: 'success',
                text: `Your school's average is ${diff}% above the national average`
            });
        } else if (schoolStats.mean < nationalStats.mean) {
            const diff = ((nationalStats.mean - schoolStats.mean) / nationalStats.mean * 100).toFixed(1);
            insights.push({
                type: 'warning',
                text: `Your school's average is ${diff}% below the national average`
            });
        }

        // Variability comparison
        if (schoolStats.std_dev > nationalStats.std_dev * 1.2) {
            insights.push({
                type: 'info',
                text: 'Higher variability than national - consider targeted interventions'
            });
        } else if (schoolStats.std_dev < nationalStats.std_dev * 0.8) {
            insights.push({
                type: 'success',
                text: 'More consistent scores than national average'
            });
        }

        // Percentile position
        if (schoolStats.mean > nationalStats.percentile_75) {
            insights.push({
                type: 'success',
                text: 'Performance in top quartile nationally'
            });
        } else if (schoolStats.mean < nationalStats.percentile_25) {
            insights.push({
                type: 'warning',
                text: 'Performance in bottom quartile nationally'
            });
        }

        // Sample size
        if (schoolStats.count < 30) {
            insights.push({
                type: 'info',
                text: 'Small sample size - interpret with caution'
            });
        }

        return `
            <div class="stats-insights">
                <h5>Key Insights</h5>
                ${insights.map(insight => `
                    <div class="insight-item">
                        <div class="insight-icon ${insight.type}">
                            ${insight.type === 'success' ? '✓' : insight.type === 'warning' ? '!' : 'i'}
                        </div>
                        <div class="insight-text">${insight.text}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // Make hideStatsPanel globally accessible
    window.hideStatsPanel = function() {
        const overlay = document.querySelector('.stats-panel-overlay');
        const panel = document.querySelector('.stats-panel');
        
        if (overlay) overlay.classList.remove('active');
        if (panel) panel.classList.remove('active');
        
        // Remove elements after animation
        setTimeout(() => {
            if (overlay && !overlay.classList.contains('active')) {
                overlay.remove();
            }
            if (panel && !panel.classList.contains('active')) {
                panel.remove();
            }
        }, 400);
    };

    let vespaDistributionChartInstances = {}; // To store multiple chart instances

    function renderDistributionCharts(schoolResults, nationalAveragesData, themeColorsConfig, cycle, nationalDistributions) {
        const container = document.getElementById('distribution-charts-container');
        if (!container) {
            errorLog("Distribution charts container not found");
            return;
        }
        log(`Rendering distribution charts for Cycle ${cycle}.`);

        // VESPA elements and their corresponding field prefixes in Object_10 for historical data
        const vespaElements = [
            { name: 'Vision', key: 'vision', color: themeColorsConfig?.vision || '#ff8f00', fieldCycle1: 'field_155', fieldCycle2: 'field_161', fieldCycle3: 'field_167' },
            { name: 'Effort', key: 'effort', color: themeColorsConfig?.effort || '#86b4f0', fieldCycle1: 'field_156', fieldCycle2: 'field_162', fieldCycle3: 'field_168' },
            { name: 'Systems', key: 'systems', color: themeColorsConfig?.systems || '#72cb44', fieldCycle1: 'field_157', fieldCycle2: 'field_163', fieldCycle3: 'field_169' },
            { name: 'Practice', key: 'practice', color: themeColorsConfig?.practice || '#7f31a4', fieldCycle1: 'field_158', fieldCycle2: 'field_164', fieldCycle3: 'field_170' },
            { name: 'Attitude', key: 'attitude', color: themeColorsConfig?.attitude || '#f032e6', fieldCycle1: 'field_159', fieldCycle2: 'field_165', fieldCycle3: 'field_171' },
            { name: 'Overall', key: 'overall', color: themeColorsConfig?.overall || '#ffd93d', fieldCycle1: 'field_160', fieldCycle2: 'field_166', fieldCycle3: 'field_172' }
        ];

        vespaElements.forEach(element => {
            const scoreDistribution = Array(11).fill(0); // For scores 0-10
            let scoreFieldKey = element[`fieldCycle${cycle}`] + '_raw';

            if (!schoolResults || schoolResults.length === 0) {
                log(`No school results to process for ${element.name} distribution.`);
            } else {
                schoolResults.forEach(record => {
                    const score = parseFloat(record[scoreFieldKey]);
                    if (!isNaN(score) && score >= 0 && score <= 10) {
                        scoreDistribution[Math.round(score)]++; // Round score in case of decimals, though they should be whole numbers
                    }
                });
            }
            
            const nationalAverageForElement = nationalAveragesData ? nationalAveragesData[element.key] : null;
            const canvasId = `${element.key}-distribution-chart`;
            let chartTitle = `${element.name} Score Distribution - Cycle ${cycle}`;
            if (nationalAverageForElement !== null && nationalAverageForElement !== undefined) {
                chartTitle += ` (Nat Avg: ${nationalAverageForElement.toFixed(2)})`;
            }

            log(`For ${element.name} Distribution - National Avg: ${nationalAverageForElement}`); // Log national average for this element

            createSingleHistogram(canvasId, chartTitle, scoreDistribution, nationalAverageForElement, element.color, cycle, element.key, nationalDistributions);
        });
    }

    function createSingleHistogram(canvasId, title, schoolScoreDistribution, nationalAverageScore, color, cycle, elementKey, nationalDistributions) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            errorLog(`Canvas element ${canvasId} not found for histogram.`);
            return;
        }
        const ctx = canvas.getContext('2d');

        // Destroy previous chart instance if it exists
        if (vespaDistributionChartInstances[canvasId]) {
            vespaDistributionChartInstances[canvasId].destroy();
        }

        const labels = Array.from({ length: 11 }, (_, i) => i.toString()); // Scores 0-10

        // Prepare national distribution data if available
        let nationalDistributionData = null;
        let nationalPatternData = null; // Scaled pattern for display
        if (nationalDistributions && elementKey) {
            // Map element key to the name used in the JSON (e.g., 'vision' -> 'Vision')
            const elementNameMap = {
                'vision': 'Vision',
                'effort': 'Effort',
                'systems': 'Systems',
                'practice': 'Practice',
                'attitude': 'Attitude',
                'overall': 'Overall'
            };
            
            const elementName = elementNameMap[elementKey];
            if (elementName && nationalDistributions[elementName]) {
                // Convert the distribution object to an array for Chart.js
                nationalDistributionData = labels.map(label => {
                    return nationalDistributions[elementName][label] || 0;
                });
                
                // Option 1: Scale national data to match school data range for pattern comparison
                const schoolMax = Math.max(...schoolScoreDistribution);
                const nationalMax = Math.max(...nationalDistributionData);
                
                // Option 2: Convert to percentages (uncomment to use this approach instead)
                // const schoolTotal = schoolScoreDistribution.reduce((sum, val) => sum + val, 0);
                // const nationalTotal = nationalDistributionData.reduce((sum, val) => sum + val, 0);
                // if (schoolTotal > 0 && nationalTotal > 0) {
                //     schoolScoreDistribution = schoolScoreDistribution.map(val => (val / schoolTotal) * 100);
                //     nationalPatternData = nationalDistributionData.map(val => (val / nationalTotal) * 100);
                //     // Would also need to update y-axis label to "Percentage of Students"
                // }
                
                // Using Option 1: Scale to match
                if (nationalMax > 0 && schoolMax > 0) {
                    // Scale national data to match school's maximum, preserving the pattern
                    const scaleFactor = schoolMax / nationalMax * 0.8; // 0.8 to keep it slightly below school max
                    nationalPatternData = nationalDistributionData.map(value => value * scaleFactor);
                    log(`Scaled national pattern for ${elementName} with factor ${scaleFactor}`);
                } else {
                    nationalPatternData = nationalDistributionData;
                }
            }
        }

        const datasets = [{
            label: 'School Score Distribution',
            data: schoolScoreDistribution,
            backgroundColor: color || 'rgba(75, 192, 192, 0.8)',
            borderColor: color || 'rgba(75, 192, 192, 1)',
            borderWidth: 2,
            order: 2 // Draw bars first
        }];

        // Add national distribution pattern as a line if data is available
        if (nationalPatternData) {
            datasets.push({
                label: 'National Pattern',
                data: nationalPatternData,
                type: 'line',
                borderColor: 'rgba(255, 217, 61, 0.5)', // More subtle golden yellow
                backgroundColor: 'rgba(255, 217, 61, 0.05)',
                borderWidth: 2,
                borderDash: [8, 4], // Longer dashes for pattern indication
                pointRadius: 2, // Smaller points
                pointBackgroundColor: 'rgba(255, 217, 61, 0.5)',
                pointBorderColor: 'rgba(255, 217, 61, 0.7)',
                tension: 0.4, // Smoother curve to emphasize pattern
                order: 1 // Draw line on top
            });
        }

        const chartConfig = {
            type: 'bar',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 1.5,
                plugins: {
                    title: {
                        display: true,
                        text: title,
                        color: '#ffffff',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    },
                    legend: {
                        display: nationalPatternData ? true : false, // Show legend only if we have national data
                        labels: {
                            color: '#a8b2d1',
                            usePointStyle: true,
                            padding: 10,
                            font: {
                                size: 11
                            },
                            generateLabels: function(chart) {
                                const defaultLabels = Chart.defaults.plugins.legend.labels.generateLabels(chart);
                                // Customize the national pattern label
                                defaultLabels.forEach(label => {
                                    if (label.text === 'National Pattern') {
                                        label.text = 'National Pattern (scaled for comparison)';
                                    }
                                });
                                return defaultLabels;
                            }
                        }
                    },
                    datalabels: {
                        display: false // Disable data labels on bars and line points
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: color,
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                const datasetLabel = context.dataset.label;
                                const value = context.raw;
                                if (datasetLabel === 'School Score Distribution') {
                                    return `Your School: ${value} students`;
                                } else if (datasetLabel === 'National Pattern') {
                                    // For national pattern, show it as a relative indicator
                                    const scoreIndex = parseInt(context.label);
                                    const nationalValue = nationalDistributionData ? nationalDistributionData[scoreIndex] : 0;
                                    return `National Pattern (${nationalValue.toLocaleString()} students nationally)`;
                                }
                                return `${datasetLabel}: ${value}`;
                            }
                        }
                    },
                    annotation: { // Annotation plugin configuration
                        annotations: {}
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)',
                            borderColor: 'rgba(255, 255, 255, 0.2)'
                        },
                        title: {
                            display: true,
                            text: 'Number of Students',
                            color: '#a8b2d1'
                        },
                        ticks: { // Ensure y-axis ticks are integers
                            color: '#a8b2d1',
                            stepSize: 1,
                            callback: function(value) { if (Number.isInteger(value)) { return value; } }
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)',
                            borderColor: 'rgba(255, 255, 255, 0.2)'
                        },
                        title: {
                            display: true,
                            text: 'Score (0-10)',
                            color: '#a8b2d1'
                        },
                        ticks: {
                            color: '#a8b2d1'
                        }
                    }
                }
            }
        };

        // Check for Annotation plugin specifically before trying to use its options
        let annotationPluginAvailable = false;
        if (typeof Annotation !== 'undefined') annotationPluginAvailable = true;
        else if (typeof Chart !== 'undefined' && Chart.Annotation) annotationPluginAvailable = true;
        else if (typeof window !== 'undefined' && window.ChartAnnotation) annotationPluginAvailable = true;

        if (nationalAverageScore !== null && typeof nationalAverageScore !== 'undefined' && annotationPluginAvailable) {
            chartConfig.options.plugins.annotation.annotations[`nationalAvgLine-${elementKey}`] = {
                type: 'line',
                xMin: nationalAverageScore,
                xMax: nationalAverageScore,
                borderColor: '#ffd93d',
                borderWidth: 3,
                borderDash: [8, 4], // Dashed line
                label: {
                    enabled: true,
                    content: `Nat Avg: ${nationalAverageScore.toFixed(1)}`,
                    position: 'start',
                    backgroundColor: 'rgba(255, 217, 61, 0.9)',
                    font: { 
                        weight: 'bold',
                        size: 12
                    },
                    color: '#0f0f23',
                    padding: 4
                }
            };
        } else if (nationalAverageScore !== null && typeof nationalAverageScore !== 'undefined'){
            log(`Annotation plugin not loaded or national average is null for ${elementKey}. Line will not be drawn.`);
            // As a fallback, add it to the title if annotation is not available
            chartConfig.options.plugins.title.text += ` (Nat Avg: ${nationalAverageScore.toFixed(2)})`;
        }

        log(`Creating histogram for ${canvasId} with title: '${chartConfig.options.plugins.title.text}'`); // Log final title

        try {
            vespaDistributionChartInstances[canvasId] = new Chart(ctx, chartConfig);
        } catch (e) {
            errorLog(`Error creating histogram for ${canvasId}:`, e);
        }
    }

    // --- Section 2: Question Level Analysis (QLA) ---
    let allQuestionResponses = []; // Cache for QLA data
    let questionMappings = { id_to_text: {}, psychometric_details: {} }; // Cache for mappings

    async function loadQLAData(staffAdminId) {
        log("Loading QLA data with Staff Admin ID:", staffAdminId);
        try {
            // Fetch question mappings first
            try {
                const mappingResponse = await fetch(`${config.herokuAppUrl}/api/question-mappings`);
                if (!mappingResponse.ok) {
                    const errorData = await mappingResponse.json().catch(() => ({}));
                    throw new Error(errorData.message || `Failed to fetch question mappings: ${mappingResponse.status}`);
                }
                questionMappings = await mappingResponse.json();
                log("Question mappings loaded:", questionMappings);
            } catch (mapError) {
                errorLog("Failed to load question mappings", mapError);
                // Proceeding without mappings might make QLA less user-friendly
                // but some parts might still work if IDs are used.
            }


            // Fetch all records from Object_29 (Questionnaire Qs)
            // Filter by the logged-in Staff Admin ID
            let qlaFilters = [];
            if (staffAdminId) {
                 // field_2069 in object_29 connects to Staff Admin (object_5) - this is an array connection
                qlaFilters.push({
                    field: 'field_2069', 
                    operator: 'is', // For array connections, 'is' often works like 'contains this ID' in Knack.
                                   // If specific 'is_any_of' or 'contains' is needed and not working, backend might need adjustment.
                    value: staffAdminId
                });
                 allQuestionResponses = await fetchDataFromKnack(objectKeys.questionnaireResponses, qlaFilters);
                 log("Fetched QLA Responses (filtered by Staff Admin ID):");
            } else {
                log("No Staff Admin ID provided to loadQLAData. Cannot filter QLA data.");
                // Fetch all if no specific filtering is possible, or show an error.
            }
            // log("QLA data loaded:", allQuestionResponses.length, "responses"); // Already logged above if filtered

            populateQLAQuestionDropdown();
            displayTopBottomQuestions(allQuestionResponses);
            displayQLAStats(allQuestionResponses);

        } catch (error) {
            errorLog("Failed to load QLA data", error);
            const qlaSection = document.getElementById('qla-section');
            if(qlaSection) qlaSection.innerHTML = "<p>Error loading Question Level Analysis data. Please check console.</p>";
        }
    }
    
    async function getQuestionTextMapping() {
        // Now uses the ached mappings from the backend
        return questionMappings.id_to_text || {};
    }


    async function populateQLAQuestionDropdown() {
        const dropdown = document.getElementById('qla-question-dropdown');
        if (!dropdown) return;

        try {
            const response = await fetch(`${config.herokuAppUrl}/api/interrogation-questions`); 
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to fetch interrogation questions');
            }
            const questions = await response.json(); 

            dropdown.innerHTML = '<option value="">Select a question...</option>'; // Clear previous/add default
            questions.forEach(qObj => { // Assuming backend sends array of {id, question}
                const option = document.createElement('option');
                option.value = qObj.question; // Use the question text itself as value, or qObj.id if you prefer
                option.textContent = qObj.question;
                dropdown.appendChild(option);
            });
            log("Populated QLA question dropdown.");
        } catch (error) {
            errorLog("Failed to populate QLA question dropdown", error);
            dropdown.innerHTML = "<option>Error loading questions</option>";
        }
    }
    
    function calculateAverageScoresForQuestions(responses) {
        const questionScores = {};
        const questionCounts = {};
        const currentQuestionTextMapping = questionMappings.id_to_text || {};

        if (!Array.isArray(responses) || responses.length === 0) {
            log("calculateAverageScoresForQuestions: Input is not a valid array or is empty", responses);
            return {}; // Return empty object if no valid responses
        }

        responses.forEach(record => {
            for (const fieldKeyInRecord in record) {
                // fieldKeyInRecord is like 'field_794_raw'
                if (fieldKeyInRecord.startsWith('field_') && fieldKeyInRecord.endsWith('_raw')) {
                    const baseFieldId = fieldKeyInRecord.replace('_raw', ''); // e.g., field_794
                    
                    // Check if this field is a known question from our mapping
                    if (currentQuestionTextMapping[baseFieldId] || (questionMappings.psychometric_details && isFieldInPsychometricDetails(baseFieldId, questionMappings.psychometric_details))) {
                        const score = parseInt(record[fieldKeyInRecord], 10);
                        if (!isNaN(score) && score >= 1 && score <= 5) { // Assuming 1-5 scale from README for Object_29
                            questionScores[baseFieldId] = (questionScores[baseFieldId] || 0) + score;
                            questionCounts[baseFieldId] = (questionCounts[baseFieldId] || 0) + 1;
                        }
                    }
                }
            }
        });

        const averageScores = {};
        for (const qId in questionScores) {
            if (questionCounts[qId] > 0) {
                averageScores[qId] = parseFloat((questionScores[qId] / questionCounts[qId]).toFixed(2));
            }
        }
        return averageScores; 
    }

    // Helper to check if a fieldId is part of the psychometric question details
    function isFieldInPsychometricDetails(fieldId, psychometricDetailsArray) {
        if (!psychometricDetailsArray || !Array.isArray(psychometricDetailsArray)) return false;
        // psychometric_question_details.json is an array of objects,
        // each object has a 'currentCycleFieldId' property.
        return psychometricDetailsArray.some(qDetail => qDetail.currentCycleFieldId === fieldId);
    }


    async function displayTopBottomQuestions(responses) {
        if (!responses || responses.length === 0) return;
        
        const averageScores = calculateAverageScoresForQuestions(responses);
        const questionTextMapping = await getQuestionTextMapping();

        const sortedQuestions = Object.entries(averageScores)
            .map(([fieldId, avgScore]) => ({
                id: fieldId,
                text: questionTextMapping[fieldId] || `Unknown Question (${fieldId})`,
                score: avgScore
            }))
            .sort((a, b) => b.score - a.score);

        const top5 = sortedQuestions.slice(0, 5);
        const bottom5 = sortedQuestions.slice(-5).reverse(); // Reverse to show lowest score first if desired

        const top5ul = document.getElementById('qla-top-5');
        const bottom5ul = document.getElementById('qla-bottom-5');

        if (top5ul) {
            top5ul.innerHTML = top5.map(q => `<li>${q.text} (Avg: ${q.score})</li>`).join('');
        }
        if (bottom5ul) {
            bottom5ul.innerHTML = bottom5.map(q => `<li>${q.text} (Avg: ${q.score})</li>`).join('');
        }
        log("Displayed Top/Bottom 5 questions.");
    }


    function displayQLAStats(responses) {
        // Calculate and display other stats:
        // - Overall response distribution for key questions
        // - Percentage agreement/disagreement for certain statements
        const statsContainer = document.getElementById('qla-stats');
        if (statsContainer) {
            statsContainer.innerHTML = "<p>Other QLA stats will go here.</p>";
        }
    }

    async function handleQLAChatSubmit() {
        const inputElement = document.getElementById('qla-chat-input');
        const dropdownElement = document.getElementById('qla-question-dropdown');
        const responseContainer = document.getElementById('qla-ai-response');

        if (!inputElement || !dropdownElement || !responseContainer) return;

        const userQuery = inputElement.value.trim();
        const selectedQuestion = dropdownElement.value;
        let queryForAI = userQuery;

        if (!queryForAI && selectedQuestion) {
            queryForAI = selectedQuestion; // Use dropdown question if input is empty
        }

        if (!queryForAI) {
            responseContainer.textContent = "Please type a question or select one from the dropdown.";
            return;
        }

        responseContainer.textContent = "Thinking...";
        log("Sending QLA query to AI:", queryForAI);

        try {
            // This is where you'd make a call to your Heroku backend
            // The backend would then use the OpenAI API with the relevant question data context.
            const aiResponse = await fetch(`${config.herokuAppUrl}/api/qla-chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // Send the query AND relevant context (e.g., data for the specific question or all QLA data)
                // Your Heroku app will need to be smart about how it uses this data with the OpenAI prompt.
                body: JSON.stringify({ query: queryForAI, questionData: allQuestionResponses /* or more filtered data */ })
            });

            if (!aiResponse.ok) {
                const errorData = await aiResponse.json();
                throw new Error(errorData.message || `AI request failed with status ${aiResponse.status}`);
            }

            const result = await aiResponse.json();
            responseContainer.textContent = result.answer; // Assuming your Heroku app returns { answer: "..." }
            log("AI Response for QLA:", result.answer);

        } catch (error) {
            errorLog("Error with QLA AI chat:", error);
            responseContainer.textContent = `Error: ${error.message}`;
        }
    }


    // --- Section 3: Student Comment Insights ---
    async function loadStudentCommentInsights(staffAdminId) {
        log("Loading student comment insights with Staff Admin ID:", staffAdminId);
        try {
            let vespaResults = []; // Initialize as empty array
            if (staffAdminId) {
                const staffAdminFilter = [{
                    field: 'field_439', 
                    operator: 'is',
                    value: staffAdminId
                }];
                vespaResults = await fetchDataFromKnack(objectKeys.vespaResults, staffAdminFilter);
                log("Fetched VESPA Results for comments (filtered by Staff Admin ID):");
            } else {
                 log("No Staff Admin ID provided to loadStudentCommentInsights. Cannot filter comments.");
            }
            
            if (!Array.isArray(vespaResults)) {
                errorLog("loadStudentCommentInsights: vespaResults is not an array after fetch.", vespaResults);
                vespaResults = []; // Ensure it's an array to prevent further errors
            }

            const allComments = [];
            if (vespaResults.length > 0) { // Only proceed if we have results
                vespaResults.forEach(record => {
                    if (record.field_2302_raw) allComments.push(record.field_2302_raw); // RRC1
                    if (record.field_2303_raw) allComments.push(record.field_2303_raw); // RRC2
                    if (record.field_2304_raw) allComments.push(record.field_2304_raw); // RRC3
                    if (record.field_2499_raw) allComments.push(record.field_2499_raw); // GOAL1
                    if (record.field_2493_raw) allComments.push(record.field_2493_raw); // GOAL2
                    if (record.field_2494_raw) allComments.push(record.field_2494_raw); // GOAL3
                });
            }

            log("Total comments extracted:", allComments.length);

            // Render Word Cloud
            renderWordCloud(allComments);

            // Identify and Display Common Themes (this is more complex, might need NLP on Heroku)
            identifyCommonThemes(allComments);

        } catch (error) {
            errorLog("Failed to load student comment insights", error);
        }
    }

    function renderWordCloud(comments) {
        const container = document.getElementById('word-cloud-container');
        if (!container) return;
        log("Rendering word cloud.");
        // Use a library like WordCloud.js (https://wordcloud2.js.org/) or similar.
        // You'll need to process the text: concatenate, remove stop words, count frequencies.
        // Example (conceptual):
        // const textBlob = comments.join(" ");
        // const wordFrequencies = calculateWordFrequencies(textBlob);
        // WordCloud(container, { list: wordFrequencies });
        container.innerHTML = "<p>Word cloud will go here.</p>";

    }

    function identifyCommonThemes(comments) {
        const container = document.getElementById('common-themes-container');
        if (!container) return;
        log("Identifying common themes.");
        // This is a more advanced NLP task.
        // Simplistic: Count occurrences of keywords.
        // Advanced: Use your Heroku backend + OpenAI to summarize themes.
        // Example:
        // Send comments to Heroku -> Heroku uses OpenAI to extract themes -> display themes.
        container.innerHTML = "<p>Common themes will be listed here.</p>";
    }

    // --- Initialization ---
    async function initializeFullDashboard() {
        const targetElement = document.querySelector(elementSelector);
        if (!targetElement) {
            errorLog(`Target element "${elementSelector}" not found for dashboard.`);
            return;
        }

        renderDashboardUI(targetElement); // Render main structure first

        // Attempt to register Chart.js plugins globally if they are loaded
        if (typeof Chart !== 'undefined') {
            if (typeof ChartDataLabels !== 'undefined') {
                Chart.register(ChartDataLabels);
                log("ChartDataLabels plugin registered globally.");
            } else {
                log("ChartDataLabels plugin not found globally during init.");
            }
            
            // Attempt to register Annotation plugin (checking common global names)
            let annotationPlugin = null;
            if (typeof Annotation !== 'undefined') { // Direct global name
                annotationPlugin = Annotation;
            } else if (typeof Chart !== 'undefined' && Chart.Annotation) { // Often attached to Chart object
                annotationPlugin = Chart.Annotation;
            } else if (typeof window !== 'undefined' && window.ChartAnnotation) { // Another common global pattern
                annotationPlugin = window.ChartAnnotation;
            }

            if (annotationPlugin) {
                try {
                    Chart.register(annotationPlugin);
                    log("Annotation plugin registered globally.");
                } catch (e) {
                    errorLog("Error registering Annotation plugin globally: ", e)
                }
            } else {
                log("Annotation plugin not found globally (checked Annotation, Chart.Annotation, window.ChartAnnotation) during init. National average lines on histograms may not appear.");
            }
        } else {
            log("Chart.js core (Chart) not found globally during init. All charts will fail.");
        }

        if (!loggedInUserEmail) {
            errorLog("No loggedInUserEmail found in config. Cannot fetch Staff Admin ID or dependent data.");
            document.getElementById('overview-section').innerHTML = "<p>Cannot load dashboard: User email not found.</p>";
            document.getElementById('qla-section').innerHTML = "<p>Cannot load dashboard: User email not found.</p>";
            document.getElementById('student-insights-section').innerHTML = "<p>Cannot load dashboard: User email not found.</p>";
            return;
        }

        const staffAdminRecordId = await getStaffAdminRecordIdByEmail(loggedInUserEmail);

        if (staffAdminRecordId) {
            log("Successfully obtained Staff Admin Record ID (from object_5):", staffAdminRecordId);
            
            // Populate filter dropdowns
            await populateFilterDropdowns(staffAdminRecordId);
            
            // Initial data load (defaulting to cycle 1 or what's selected)
            const cycleSelectElement = document.getElementById('cycle-select');
            const initialCycle = cycleSelectElement ? parseInt(cycleSelectElement.value, 10) : 1;
            loadOverviewData(staffAdminRecordId, initialCycle);
            loadQLAData(staffAdminRecordId); // QLA might also need cycle awareness later
            loadStudentCommentInsights(staffAdminRecordId); // Comments might also need cycle awareness

            // Add event listener for cycle selector
            if (cycleSelectElement) {
                cycleSelectElement.addEventListener('change', (event) => {
                    const selectedCycle = parseInt(event.target.value, 10);
                    log(`Cycle changed to: ${selectedCycle}`);
                    const activeFilters = getActiveFilters();
                    loadOverviewData(staffAdminRecordId, selectedCycle, activeFilters);
                    // Potentially re-load or filter QLA and Comment data too if they become cycle-dependent
                    // loadQLAData(staffAdminRecordId, selectedCycle);
                    // loadStudentCommentInsights(staffAdminRecordId, selectedCycle);
                });
            }
            
            // Add event listeners for filter buttons
            const applyFiltersBtn = document.getElementById('apply-filters-btn');
            if (applyFiltersBtn) {
                applyFiltersBtn.addEventListener('click', () => {
                    const selectedCycle = cycleSelectElement ? parseInt(cycleSelectElement.value, 10) : 1;
                    const activeFilters = getActiveFilters();
                    log("Applying filters:", activeFilters);
                    loadOverviewData(staffAdminRecordId, selectedCycle, activeFilters);
                });
            }
            
            const clearFiltersBtn = document.getElementById('clear-filters-btn');
            if (clearFiltersBtn) {
                clearFiltersBtn.addEventListener('click', () => {
                    // Clear all filter inputs
                    document.getElementById('student-search').value = '';
                    document.getElementById('group-filter').value = '';
                    document.getElementById('course-filter').value = '';
                    document.getElementById('year-group-filter').value = '';
                    document.getElementById('faculty-filter').value = '';
                    
                    // Clear the active filters display
                    updateActiveFiltersDisplay([]);
                    
                    // Reload data without filters
                    const selectedCycle = cycleSelectElement ? parseInt(cycleSelectElement.value, 10) : 1;
                    log("Clearing all filters");
                    loadOverviewData(staffAdminRecordId, selectedCycle, []);
                });
            }

        } else {
            errorLog("Failed to obtain Staff Admin Record ID. Dependent data will not be loaded.");
            document.getElementById('overview-section').innerHTML = "<p>Cannot load dashboard: Staff Admin role not found for your account email.</p>";
            document.getElementById('qla-section').innerHTML = "<p>Cannot load dashboard: Staff Admin role not found for your account email.</p>";
            document.getElementById('student-insights-section').innerHTML = "<p>Cannot load dashboard: Staff Admin role not found for your account email.</p>";
        }
    }

    initializeFullDashboard(); // Call the main async initialization function
}

// Defensive check: If jQuery is used by Knack/other scripts, ensure this script runs after.
// However, the loader script (WorkingBridge.js) should handle calling initializeDashboardApp
// at the appropriate time.
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // initializeDashboardApp(); // Not strictly necessary if WorkingBridge calls it
    });
} else {
    // initializeDashboardApp(); // Or call if DOM is already ready, though WorkingBridge is preferred.
}

// Make sure initializeDashboardApp is globally accessible if WorkingBridge.js calls it.
// If it's not already, you might need:
// window.initializeDashboardApp = initializeDashboardApp;
// However, since it's a top-level function in the script, it should be.
