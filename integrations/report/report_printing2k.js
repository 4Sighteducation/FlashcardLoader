/*
 * Bulk VESPA Report Printing
 * Version: 2g
 * Loaded by WorkingBridge.js as "bulkPrint" app (scene_1227, view_3062)
 * Required global: BULK_PRINT_CONFIG (injected by loader)
 *
 * Flow:
 *  1. Resolve logged-in Staff-Admin record ID(s).
 *  2. Fetch connected Object_10 student records (field_439 links).
 *  3. Fetch ALL Object_33 coaching-comment templates once.
 *  4. Build one-page HTML report per student (A4 portrait, fits single page).
 *  5. Inject printable DOM and call window.print().
 */
(function () {
    // Ensure single attachment
    if (window.VESPA_BULK_PRINT_INITIALISED) return;
    window.VESPA_BULK_PRINT_INITIALISED = true;

    // Helper – safe console
    const log = (...m) => console.log('[BulkPrint]', ...m);
    const err = (...m) => console.error('[BulkPrint]', ...m);

    // --- CONFIG ---
    // Don't read config here - it's not set yet!
    let cfg = {};

    const FIELD_MAP = {
        // Object_10
        email: 'field_197_raw.email',
        first: 'field_187_raw.first',
        last: 'field_187_raw.last',
        group: 'field_223',
        cycle: 'field_146_raw',
        dateCompleted: 'field_855', // dd/mm/YYYY
        scores: {
            vision: 'field_147',
            effort: 'field_148',
            systems: 'field_149',
            practice: 'field_150',
            attitude: 'field_151',
            overall: 'field_152'
        },
        reflections: {
            C1: 'field_2302',
            C2: 'field_2303',
            C3: 'field_2304'
        },
        goals: {
            C1: 'field_2499',
            C2: 'field_2493',
            C3: 'field_2494'
        }
    };
    const COMPONENT_COLORS = {
        vision: '#ff8f00',
        effort: '#86b4f0',
        systems: '#72cb44',
        practice: '#7f31a4',
        attitude: '#d56c91'
    };

    const COMPONENT_LABELS = {
        vision: 'VISION',
        effort: 'EFFORT',
        systems: 'SYSTEMS',
        practice: 'PRACTICE',
        attitude: 'ATTITUDE'
    };

    function addPrintStyles() {
        if (document.getElementById('vespaBulkPrintStyles')) return;
        const cssUrl = 'https://cdn.jsdelivr.net/gh/4Sighteducation/FlashcardLoader@main/integrations/report/report_printing2f.css';
        const link = document.createElement('link');
        link.id = 'vespaBulkPrintStyles';
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = cssUrl;
        document.head.appendChild(link);
        log('Print styles added.');
    }

    function removePrintStyles() {
        $('#vespaBulkPrintStyles').remove();
        log('Print styles removed.');
    }

    // Util: build Knack REST request
    async function knackRequest(path, params = {}) {
        const headers = {
            'X-Knack-Application-Id': cfg.knackAppId,
            'X-Knack-REST-API-Key': cfg.knackApiKey,
            'Content-Type': 'application/json'
        };
        const qs = new URLSearchParams({ rows_per_page: params.rows || 1000, page: params.page || 1 });
        if (params.filters) qs.append('filters', encodeURIComponent(JSON.stringify(params.filters)));
        const url = `https://api.knack.com/v1/${path}?${qs.toString()}`;
        
        log('Making API request to:', url);
        log('With headers:', headers);
        
        const res = await fetch(url, { headers });
        if (!res.ok) {
            const errorText = await res.text();
            err('API request failed:', { status: res.status, statusText: res.statusText, body: errorText });
            throw new Error(`${res.status} ${res.statusText}: ${errorText}`);
        }
        const data = await res.json();
        log('API response received:', data);
        return data;
    }

    // Step 1: Staff-Admin record IDs (object_5 field_86 = email)
    async function getStaffAdminRecordIds(email) {
        const data = await knackRequest('objects/object_5/records', {
            filters: { match: 'and', rules: [{ field: 'field_86', operator: 'is', value: email }] }, rows: 50
        });
        return (data.records || []).map(r => r.id);
    }

    // Step 1b: Get Tutor record ID from email (if provided)
    async function getTutorIdByEmail(email) {
        if (!email) return null;
        const data = await knackRequest('objects/object_7/records', {
            filters: { match: 'and', rules: [{ field: 'field_96', operator: 'is', value: email }] },
            rows: 1
        });
        return (data.records && data.records.length > 0) ? data.records[0].id : null;
    }

    // Step 2: Fetch students (with limit and filters)
    async function fetchStudents(staffIds, filters, maxStudents = 100) {
        if (!staffIds.length) return [];

        const baseRules = staffIds.map(id => ({ field: 'field_439', operator: 'is', value: id }));
        const studentApiFilters = { match: 'or', rules: baseRules };
        
        const uiFilterRules = [];

        // Apply UI filters
        if (filters.cycle) {
            uiFilterRules.push({ field: FIELD_MAP.cycle, operator: 'is', value: filters.cycle });
        }
        if (filters.yearGroup) {
            // field_144 is Year Group, which is a Short Text field.
            uiFilterRules.push({ field: 'field_144', operator: 'contains', value: filters.yearGroup });
        }
        if (filters.group) {
            // field_223 is Group, which is a Short Text field.
            uiFilterRules.push({ field: FIELD_MAP.group, operator: 'contains', value: filters.group });
        }
        if (filters.tutorId) {
            // field_145 is the connection to the Tutor object
            uiFilterRules.push({ field: 'field_145', operator: 'is', value: filters.tutorId });
        }

        // Combine base and UI filters
        const finalFilters = {
            match: 'and',
            rules: [studentApiFilters, ...uiFilterRules]
        };

        const allStudents = [];
        let page = 1;
        const rowsPerPage = Math.min(maxStudents, 500);
        
        while (allStudents.length < maxStudents) {
            log(`Fetching page ${page} of students...`);
            const resp = await knackRequest('objects/object_10/records', { 
                filters: finalFilters, 
                page, 
                rows: rowsPerPage 
            });
            
            allStudents.push(...resp.records);
            
            // Stop if we've reached the max or there are no more pages
            if (allStudents.length >= maxStudents || resp.current_page >= resp.total_pages) {
                break;
            }
            
            page++;
        }
        
        // Return only up to maxStudents
        return allStudents.slice(0, maxStudents);
    }

    // Step 3: Fetch coaching template records (Object_33)
    async function loadCoachingTemplates() {
        const data = await knackRequest('objects/object_33/records', { rows: 1000 });
        const map = {}; // {component}{bracket} = record
        (data.records || []).forEach(r => {
            const component = (r['field_844_raw'] || '').toLowerCase();
            const bracket = (r['field_842_raw'] || '').toLowerCase();
            if (!map[component]) map[component] = {};
            map[component][bracket] = r;
        });
        return map;
    }

    // Helpers
    function scoreBracket(score) {
        const n = Number(score);
        if (n <= 2) return 'very low';
        if (n <= 5) return 'low';
        if (n <= 7) return 'medium';
        return 'high';
    }

    function getCycleKey(raw) {
        // field_146_raw stores something like "C1" / "C2" / "C3"
        // It can be an array if it's a connection, so we'll handle that.
        if (Array.isArray(raw) && raw.length > 0) {
            return (raw[0].identifier || '').toUpperCase();
        }
        return (raw || '').toString().toUpperCase();
    }

    // Build report HTML per student
    function buildStudentHTML(student, templates) {
        const fullName = `${student[FIELD_MAP.first] || ''} ${student[FIELD_MAP.last] || ''}`.trim();
        const group = student[FIELD_MAP.group] || '';
        const date = student[FIELD_MAP.dateCompleted] || '';
        const cycle = getCycleKey(student[FIELD_MAP.cycle] || 'C1');

        // Reflection / goal fields
        const reflection = student[FIELD_MAP.reflections[cycle] || FIELD_MAP.reflections.C1] || '';
        const goal = student[FIELD_MAP.goals[cycle] || FIELD_MAP.goals.C1] || '';

        // Header with logo placeholder (img tag later replaced)
        let html = `<div class="vespa-report page">
            <div class="report-header">
                <img class="logo" src="" alt="Logo" />
                <div class="header-title">VESPA COACHING REPORT</div>
                <div class="header-right">
                    <img class="logo-right" src="https://cdn.jsdelivr.net/gh/4Sighteducation/assets@2a84920/vespa-logo-2.png" alt="Vespa Logo" />
                    <div class="meta">
                        <div><strong>STUDENT:</strong> ${fullName}</div>
                        <div><strong>DATE:</strong> ${date}</div>
                        <div><strong>CYCLE:</strong> ${cycle.replace('C','')}</div>
                    </div>
                </div>
            </div>`;
        
        // Introductory Questions & Chart placeholder
        html += `<div class="intro-section">
            <div class="intro-questions">
                <h4>INTRODUCTORY QUESTIONS</h4>
                <p>first, some general questions about your report:</p>
                <ul>
                    <li>To what extent is the report an accurate description of your current characteristics?</li>
                    <li>Does your highest score represent a personal strength? Your lowest an area for development?</li>
                    <li>If you had to challenge a score, or adjust it, which would it be, and why?</li>
                    <li>Think back over the last few weeks. What are you currently finding hard about study at this level?</li>
                    <li>Before we look at the rest of the report, remember it's quite normal to feel you don't know what you're trying to achieve or why you're studying. But by answering the questions below honestly, reflecting on this report, and making small, manageable changes, you could soon be feeling much more positive.</li>
                </ul>
            </div>
            <div class="chart-placeholder">
                <!-- Chart will be rendered here by Chart.js if we add it -->
            </div>
        </div>`;


        html += '<div class="vespa-grid-title"><div><p>VESPA REPORT</p></div><div><p>COACHING QUESTIONS</p></div></div>';

        // V-E-S-P-A blocks
        const components = ['vision', 'effort', 'systems', 'practice', 'attitude'];
        html += '<div class="vespa-grid">';
        components.forEach(key => {
            const score = student[FIELD_MAP.scores[key]] || '-';
            const bracket = scoreBracket(score);
            const templateRec = (templates[key] || {})[bracket] || {};
            const longComment = templateRec['field_845'] || '';
            const questionsRaw = (templateRec['field_853'] || '').split(/<br\s*\/?>|\n/).filter(Boolean).slice(0,3);
            const activities = templateRec['field_847'] || '';

            html += `<div class="vespa-block" style="border-left-color:${COMPONENT_COLORS[key]}">
                <div class="block-score" style="background:${COMPONENT_COLORS[key]}">
                    <p>${COMPONENT_LABELS[key]}</p>
                    <p>Score</p>
                    <p class="score-val">${score}</p>
                </div>
                <div class="block-body">
                    <p class="long-comment">${longComment}</p>
                </div>
                <div class="block-questions">
                    <ul>${questionsRaw.map(q=>`<li>${q}</li>`).join('')}</ul>
                    <p class="activities">Suggested Activities: <span>${activities}</span></p>
                </div>
            </div>`;
        });
        html += '</div>'; // grid

        // Student Comment & Study Goal
        html += `<div class="bottom-section">
            <h4>(COMMENTS / STUDY GOAL)</h4>
            <div class="comment-box">
                <p><strong>STUDENT RESPONSE</strong></p>
                <p>${reflection}</p>
            </div>
            <div class="comment-box">
                <p><strong>COACHING RECORD</strong> (Currently visible to student)</p>
                <p><em>Coach input will appear here...</em></p>
            </div>
            <div class="comment-box">
                <p><strong>STUDY GOAL/ACTION PLAN</strong></p>
                <p>${goal}</p>
            </div>
        </div>`;


        html += '</div>'; // report page
        return html;
    }

    // Add Filter UI
    function renderFilterUI() {
        const filterHtml = `
            <div id="bulkPrintFilters" style="padding: 15px; border: 1px solid #ccc; border-radius: 5px; margin-bottom: 15px; background: #f9f9f9;">
                <h3 style="margin-top: 0;">Filter Reports</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); grid-gap: 15px;">
                    <div>
                        <label for="filterCycle">Cycle:</label>
                        <select id="filterCycle" style="width:100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                            <option value="">All Cycles</option>
                            <option value="C1">Cycle 1</option>
                            <option value="C2">Cycle 2</option>
                            <option value="C3">Cycle 3</option>
                        </select>
                    </div>
                    <div>
                        <label for="filterYearGroup">Year Group:</label>
                        <input type="text" id="filterYearGroup" placeholder="e.g., Year 12" style="width:100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                    </div>
                    <div>
                        <label for="filterGroup">Group:</label>
                        <input type="text" id="filterGroup" placeholder="e.g., 12A/Sc1" style="width:100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                    </div>
                    <div>
                        <label for="filterTutorEmail">Tutor Email:</label>
                        <input type="email" id="filterTutorEmail" placeholder="e.g., tutor@example.com" style="width:100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                    </div>
                </div>
            </div>
        `;
        // Insert filters before the print button
        $('#bulkPrintbtn').before(filterHtml);
    }

    // Replace logo URLs after DOM build
    async function setLogos(container, establishmentFieldUrl) {
        const imgs = container.querySelectorAll('img.logo');
        if (!imgs.length) return;
        let logoUrl = establishmentFieldUrl || '';
        if (!logoUrl) logoUrl = 'https://cdn.jsdelivr.net/gh/4Sighteducation/assets@main/vespa-logo.png';
        imgs.forEach(img => { img.src = logoUrl; });
    }

    // Main execution when button clicked
    async function run() {
        const btn = $('#bulkPrintbtn');
        const originalText = btn.text();
        let overlay;
        const containerId = 'vespaBulkPrintContainer';

        try {
            // Show loading overlay and update button
            overlay = $('<div id="bulkPrintOverlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9998;display:flex;justify-content:center;align-items:center;color:white;font-size:20px;"></div>').appendTo('body');
            btn.text('Generating reports...').prop('disabled', true);
            overlay.text('Preparing reports...');
            
            addPrintStyles();

            // Read config when we actually need it
            cfg = window.BULK_PRINT_CONFIG || {};
            log('Config at run time:', cfg);

            if (!cfg.knackAppId || !cfg.knackApiKey) {
                throw new Error('Missing Knack credentials. Please contact support.');
            }
            
            const user = Knack.getUserAttributes();
            if (!user || !user.email) throw new Error('Cannot determine logged-in user');
            
            overlay.text('Fetching staff records...');
            const staffIds = await getStaffAdminRecordIds(user.email);
            if (!staffIds.length) throw new Error('No Staff-Admin record found for user');

            const tutorEmail = $('#filterTutorEmail').val();
            let tutorId = null;
            if (tutorEmail) {
                overlay.text('Fetching tutor record...');
                tutorId = await getTutorIdByEmail(tutorEmail);
                if (!tutorId) {
                    throw new Error(`No tutor found with email: ${tutorEmail}`);
                }
            }

            overlay.text('Fetching students...');
            // Lowered limit for faster testing. Can be increased later.
            const MAX_STUDENTS = 50;
            const filters = {
                cycle: $('#filterCycle').val(),
                yearGroup: $('#filterYearGroup').val(),
                group: $('#filterGroup').val(),
                tutorId: tutorId
            };
            const students = await fetchStudents(staffIds, filters, MAX_STUDENTS);
            log(`Fetched ${students.length} students (limit: ${MAX_STUDENTS}).`);

            if (!students.length) { 
                alert('No students found matching the selected criteria.'); 
                if (overlay) overlay.remove();
                btn.text(originalText).prop('disabled', false);
                return; 
            }

            if (students.length > 20) {
                const proceed = confirm(`This will generate ${students.length} reports. This may take some time. Continue?`);
                if (!proceed) {
                    if (overlay) overlay.remove();
                    btn.text(originalText).prop('disabled', false);
                    return;
                }
            }
            
            overlay.text('Loading report templates...');
            const templates = await loadCoachingTemplates();

            let container = document.getElementById(containerId);
            if (container) container.remove();
            container = document.createElement('div');
            container.id = containerId;
            // Position off-screen instead of hiding for print compatibility
            container.style.position = 'absolute';
            container.style.left = '-9999px';
            document.body.appendChild(container);

            for (let i = 0; i < students.length; i++) {
                const stu = students[i];
                container.insertAdjacentHTML('beforeend', buildStudentHTML(stu, templates));
                const progressText = `Building reports... ${i + 1}/${students.length}`;
                overlay.text(progressText);
                if ((i + 1) % 10 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 10));
                }
            }
            
            const estLogoUrl = students[0]?.field_3206 || students[0]?.field_61 || '';
            await setLogos(container, estLogoUrl);

            overlay.text('Preparing print view...');
            
            setTimeout(() => {
                window.print();
                if (overlay) overlay.remove();
                btn.text(originalText).prop('disabled', false);
                
                // Clean up DOM to prevent affecting other pages
                removePrintStyles();
                $('#' + containerId).remove();
                log('Print container removed.');
            }, 500);

        } catch (e) {
            err('Error in run function:', e);
            console.error('Full error object:', e);
            console.error('Error stack:', e.stack);
            alert('Error generating reports: ' + (e.message || 'Unknown error'));
            
            if (overlay) overlay.remove();
            btn.text(originalText).prop('disabled', false);

            // Clean up on error
            removePrintStyles();
            const container = document.getElementById(containerId);
            if (container) container.remove();
        }
    }

    // Expose init for loader (called by WorkingBridge)
    window.initializeBulkPrintApp = function () {
        cfg = window.BULK_PRINT_CONFIG || {};
        log('Config at initialization:', cfg);
        
        log('BulkPrint app initialised. Waiting for button click.');
        
        // Render filters only once
        if (!$('#bulkPrintFilters').length) {
            renderFilterUI();
        }
        
        // Debug: Check if we're on the right view
        console.log('[BulkPrint] Current scene:', Knack.scene?.key);
        console.log('[BulkPrint] Looking for button #bulkPrintbtn in view_3062');
        
        const btn = $('#view_3062 #bulkPrintbtn');
        if (btn.length && !btn.data('bulk-print-bound')) {
            console.log('[BulkPrint] Button found, binding click handler');
            btn.data('bulk-print-bound', true); // Mark as bound
            btn.off('click.bulk').on('click.bulk', function (e) {
                e.preventDefault();
                run();
            });
        }
    };
    
    // Also log when script loads
    console.log('[BulkPrint] Script loaded successfully (v2g)');
})();
