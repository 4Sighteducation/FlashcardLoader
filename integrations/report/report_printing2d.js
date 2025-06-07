/*
 * Bulk VESPA Report Printing
 *
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

    // Step 2: Fetch students
    async function fetchStudents(staffIds, page = 1, accum = []) {
        if (!staffIds.length) return [];
        const rules = staffIds.map(id => ({ field: 'field_439', operator: 'is', value: id }));
        const filters = { match: 'or', rules };
        const resp = await knackRequest('objects/object_10/records', { filters, page, rows: 500 });
        const next = resp.current_page < resp.total_pages ? await fetchStudents(staffIds, page + 1, []) : [];
        return [...accum, ...resp.records, ...next];
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
        return (raw || '').toUpperCase();
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
                <div class="meta">
                    <div><strong>STUDENT:</strong> ${fullName}</div>
                    <div><strong>GROUP:</strong> ${group}</div>
                    <div><strong>DATE:</strong> ${date}</div>
                    <div><strong>CYCLE:</strong> ${cycle.replace('C','')}</div>
                </div>
            </div>`;

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

            html += `<div class="vespa-block" style="border-color:${COMPONENT_COLORS[key]}">
                <div class="block-header" style="background:${COMPONENT_COLORS[key]}">${COMPONENT_LABELS[key]}<br/><span class="score">${score}</span></div>
                <div class="block-body">
                    <p class="long-comment">${longComment}</p>
                    <ul class="coach-qs">${questionsRaw.map(q=>`<li>${q}</li>`).join('')}</ul>
                    <p class="activities"><strong>Activities:</strong> ${activities}</p>
                </div>
            </div>`;
        });
        html += '</div>'; // grid

        // Reflection & Goal boxes
        html += `<div class="bottom-section">
            <div class="reflection"><strong>STUDENT COMMENT / STUDY GOAL:</strong><br/>${reflection}</div>
            <div class="action-plan"><strong>ACTION PLAN:</strong><br/>${goal}<br/><br/>Action Plan Review Date: ____________</div>
        </div>`;

        html += '</div>'; // report page
        return html;
    }

    // Inject CSS once
    function injectStyles() {
        if (document.getElementById('vespaBulkPrintStyles')) return;
        const css = `
            @media print { body { -webkit-print-color-adjust: exact; } }
            .vespa-report { width: 210mm; height: 297mm; padding: 12mm; box-sizing: border-box; font-family: Arial, Helvetica, sans-serif; }
            .report-header { display:flex; align-items:center; justify-content:space-between; border-bottom:2px solid #444; margin-bottom:8px; }
            .report-header .logo { height:38px; }
            .report-header .header-title { font-size:18px; font-weight:bold; flex:1; text-align:center; }
            .report-header .meta { font-size:10px; text-align:right; }
            .vespa-grid { display:grid; grid-template-columns: repeat(2,1fr); grid-gap:6px; margin-top:6px; }
            .vespa-block { border:2px solid; padding:4px; font-size:9px; display:flex; flex-direction:column; }
            .block-header { color:#fff; font-weight:bold; text-align:center; padding:2px 0; font-size:10px; }
            .block-header .score { font-size:20px; display:block; }
            .block-body { flex:1; overflow:hidden; }
            .long-comment { margin:2px 0; }
            .coach-qs { padding-left:14px; margin:2px 0; }
            .coach-qs li { margin-bottom:2px; }
            .activities { margin-top:2px; font-style:italic; }
            .bottom-section { margin-top:4px; display:flex; gap:6px; font-size:9px; }
            .reflection, .action-plan { border:1px solid #888; padding:4px; flex:1; min-height:40mm; }
            .page { page-break-after: always; }
        `;
        const style = document.createElement('style');
        style.id = 'vespaBulkPrintStyles';
        style.innerHTML = css;
        document.head.appendChild(style);
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
        try {
            log('Run function started');
            
            // Show loading indicator
            const btn = $('#bulkPrintbtn');
            const originalText = btn.text();
            btn.text('Generating reports...').prop('disabled', true);
            
            // Read config when we actually need it
            cfg = window.BULK_PRINT_CONFIG || {};
            log('Config at run time:', cfg);
            
            // Check config before running
            if (!cfg.knackAppId || !cfg.knackApiKey) {
                err('Missing Knack credentials in BULK_PRINT_CONFIG', cfg);
                alert('Configuration error: Missing Knack credentials. Please contact support.');
                btn.text(originalText).prop('disabled', false);
                return;
            }
            
            injectStyles();
            const user = Knack.getUserAttributes();
            log('User attributes:', user);
            if (!user || !user.email) throw new Error('Cannot determine logged-in user');
            
            log('Fetching Staff-Admin records for email:', user.email);
            const staffIds = await getStaffAdminRecordIds(user.email);
            log('Staff IDs found:', staffIds);
            if (!staffIds.length) throw new Error('No Staff-Admin record found for user');

            const students = await fetchStudents(staffIds);
            log(`Fetched ${students.length} students.`);

            if (!students.length) { alert('No students linked to your account.'); return; }
            const templates = await loadCoachingTemplates();

            const containerId = 'vespaBulkPrintContainer';
            let container = document.getElementById(containerId);
            if (container) container.remove();
            container = document.createElement('div');
            container.id = containerId;
            document.body.appendChild(container);

            students.forEach(stu => {
                container.insertAdjacentHTML('beforeend', buildStudentHTML(stu, templates));
            });

            // Attempt to fetch establishment logo URL from first student (field_3206)
            const estLogoUrl = students[0]?.field_3206 || students[0]?.field_61 || '';
            await setLogos(container, estLogoUrl);

            window.print();
            
            // Restore button
            btn.text(originalText).prop('disabled', false);
            
            // Optionally remove container afterwards
            // setTimeout(()=>container.remove(), 1000);
        } catch (e) {
            err(e);
            alert('Error generating reports: ' + e.message);
            
            // Restore button on error
            const btn = $('#bulkPrintbtn');
            if (btn.length) {
                btn.text('Print All Reports').prop('disabled', false);
            }
        }
    }

    // Bind click handler when view_3062 renders (already exists but we override)
    $(document).on('knack-view-render.view_3062', function (event, view) {
        $('#' + view.key + ' #bulkPrintbtn').off('click.bulk').on('click.bulk', function (e) {
            e.preventDefault();
            run();
        });
    });

    // Expose init for loader (called immediately by WorkingBridge)
    window.initializeBulkPrintApp = function () {
        // Read config when initializer is called
        cfg = window.BULK_PRINT_CONFIG || {};
        log('Config at initialization:', cfg);
        
        log('BulkPrint app initialised. Waiting for button click.');
        injectStyles();
        
        // Debug: Check if we're on the right view
        console.log('[BulkPrint] Current scene:', Knack.scene?.key);
        console.log('[BulkPrint] Looking for button #bulkPrintbtn in view_3062');
        
        // Try to bind immediately if view already rendered
        const btn = $('#view_3062 #bulkPrintbtn');
        if (btn.length) {
            console.log('[BulkPrint] Button found immediately, binding click handler');
            btn.off('click.bulk').on('click.bulk', function (e) {
                e.preventDefault();
                console.log('[BulkPrint] Button clicked via immediate binding');
                run();
            });
        }
    };
    
    // Also log when script loads
    console.log('[BulkPrint] Script loaded successfully');
})();
