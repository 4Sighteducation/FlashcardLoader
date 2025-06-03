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
                   <div id="loading-indicator" style="display:none;">
                        <p>Loading chart data...</p>
                        <div class="spinner"></div>
                    </div>
                    <div class="dashboard-content-wrapper">
                        <div id="averages-summary-container" class="vespa-scores-grid">
                            <!-- Scorecards will be dynamically inserted here -->
                        </div>
                        <div id="distribution-charts-container">
                            <!-- Containers for Vision, Effort, Systems, Practice, Attitude -->
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

    // --- Section 1: Overview and Benchmarking ---
    async function loadOverviewData(staffAdminId, cycle = 1) {
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
                const staffAdminFilter = [{
                    field: 'field_439',
                    operator: 'is',
                    value: staffAdminId
                }];
                schoolVespaResults = await fetchDataFromKnack(objectKeys.vespaResults, staffAdminFilter);
                log("Fetched School VESPA Results (filtered by Staff Admin ID):", schoolVespaResults ? schoolVespaResults.length : 0);
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

            let nationalAverages = { vision: 0, effort: 0, systems: 0, practice: 0, attitude: 0 };
            if (nationalBenchmarkRecord) {
                nationalAverages = getNationalVespaAveragesFromRecord(nationalBenchmarkRecord, cycle);
                log("Processed National Averages for charts:", nationalAverages); // Log processed national averages
            } else {
                log("National benchmark record was null, nationalAverages will be default/empty.");
            }
            log(`National Averages (Cycle ${cycle}):`, nationalAverages); // This log was already there, good.
            
            // The old nationalAverages from allVespaResultsForBenchmark is removed for now.
            // If you need a "all your schools average" vs "national average from object_120", 
            // that would be a separate calculation.

            renderAveragesChart(schoolAverages, nationalAverages, cycle);
            renderDistributionCharts(schoolVespaResults, nationalAverages, themeColors, cycle);

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
        const nationalAverages = { vision: 0, effort: 0, systems: 0, practice: 0, attitude: 0 };
        if (!record) return nationalAverages;

        const fieldMappings = {
            cycle1: { v: 'field_3292', e: 'field_3293', s: 'field_3294', p: 'field_3295', a: 'field_3296' },
            cycle2: { v: 'field_3297', e: 'field_3298', s: 'field_3299', p: 'field_3300', a: 'field_3301' },
            cycle3: { v: 'field_3302', e: 'field_3303', s: 'field_3304', p: 'field_3305', a: 'field_3306' }
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
            `;
            container.appendChild(card);
        });
    }

    let vespaDistributionChartInstances = {}; // To store multiple chart instances

    function renderDistributionCharts(schoolResults, nationalAveragesData, themeColorsConfig, cycle) {
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
            { name: 'Attitude', key: 'attitude', color: themeColorsConfig?.attitude || '#f032e6', fieldCycle1: 'field_159', fieldCycle2: 'field_165', fieldCycle3: 'field_171' }
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
            const chartTitle = `${element.name} Score Distribution - Cycle ${cycle}`;

            log(`For ${element.name} Distribution - National Avg: ${nationalAverageForElement}`); // Log national average for this element

            createSingleHistogram(canvasId, chartTitle, scoreDistribution, nationalAverageForElement, element.color, cycle, element.key);
        });
    }

    function createSingleHistogram(canvasId, title, schoolScoreDistribution, nationalAverageScore, color, cycle, elementKey) {
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

        const chartConfig = {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'School Score Distribution',
                    data: schoolScoreDistribution,
                    backgroundColor: color || 'rgba(75, 192, 192, 0.8)',
                    borderColor: color || 'rgba(75, 192, 192, 1)',
                    borderWidth: 2
                }]
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
                        display: false // Typically hide legend for a simple histogram
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: color,
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                return `Score ${context.label}: ${context.raw} students`;
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
            const response = await fetch(`${herokuAppUrl}/api/interrogation-questions`); 
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
            const aiResponse = await fetch(`${herokuAppUrl}/api/qla-chat`, {
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
                    loadOverviewData(staffAdminRecordId, selectedCycle);
                    // Potentially re-load or filter QLA and Comment data too if they become cycle-dependent
                    // loadQLAData(staffAdminRecordId, selectedCycle);
                    // loadStudentCommentInsights(staffAdminRecordId, selectedCycle);
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

