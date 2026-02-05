/**
 * VESPA Activity Hub (v1a)
 * Replaces the legacy "Worksheets" + "Curriculum" pages with a single improved hub.
 *
 * Runs on Knack scenes:
 * - scene_1169 (Worksheets)
 * - scene_1234 (Curriculum)
 *
 * Data source:
 * - Supabase `public.activity_kb` (AI KB table) for library + curriculum generation.
 *   We prefer fields: activity_code, name, vespa_element, level, short_summary, long_summary, pdf_link, pathway
 *
 * Notes:
 * - This file is intentionally framework-free (no React) to match Knack integration style.
 * - It gracefully degrades if `activity_kb.pathway` column doesn't exist yet (defaults to "both").
 */
(function () {
  'use strict';

  const BUILD = 'activityHub1a';
  const SCENES = new Set(['scene_1169', 'scene_1234', 'scene_1294']);

  // Supabase (public anon) — same project used by the other VESPA apps.
  const SUPABASE_URL_DEFAULT = 'https://qcdcdzfanrlvdcagmwmg.supabase.co';
  const SUPABASE_ANON_DEFAULT =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjZGNkemZhbnJsdmRjYWdtd21nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5MDc4MjYsImV4cCI6MjA2OTQ4MzgyNn0.ahntO4OGSBfR2vnP_gMxfaRggP4eD5mejzq5sZegmME';

  const MONTHS = [
    'September', 'October', 'November', 'December',
    'January', 'February', 'March', 'April', 'May', 'June', 'July'
  ];
  const TERMS = {
    'Autumn 1': ['September', 'October'],
    'Autumn 2': ['November', 'December'],
    'Spring 1': ['January', 'February'],
    'Spring 2': ['March'],
    'Summer 1': ['April', 'May'],
    'Summer 2': ['June', 'July'],
  };
  const PROFILES = ['Low', 'Low-Mid', 'Mid', 'Mid-High', 'High'];

  const VESPA = {
    VISION:   { label: 'Vision',   color: '#ff8f00', bg: '#FFF3E0' },
    EFFORT:   { label: 'Effort',   color: '#86b4f0', bg: '#E3F2FD' },
    SYSTEMS:  { label: 'Systems',  color: '#72cb44', bg: '#E8F5E9' },
    PRACTICE: { label: 'Practice', color: '#7f31a4', bg: '#F3E5F5' },
    ATTITUDE: { label: 'Attitude', color: '#f032e6', bg: '#FCE4EC' },
  };

  function pick(obj, key, fallback) {
    try {
      const v = obj && obj[key];
      return (v === undefined || v === null || v === '') ? fallback : v;
    } catch (_) {
      return fallback;
    }
  }

  function escapeHtml(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function qsa(sel, root) {
    return Array.from((root || document).querySelectorAll(sel));
  }

  function el(tag, attrs, children) {
    const n = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach((k) => {
        const v = attrs[k];
        if (k === 'class') n.className = v;
        else if (k === 'style') n.setAttribute('style', v);
        else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
        else if (v === false || v === null || v === undefined) return;
        else n.setAttribute(k, String(v));
      });
    }
    if (children) {
      (Array.isArray(children) ? children : [children]).forEach((c) => {
        if (c === null || c === undefined) return;
        if (typeof c === 'string') n.appendChild(document.createTextNode(c));
        else n.appendChild(c);
      });
    }
    return n;
  }

  async function supabaseFetch({ url, anon, path, query }) {
    const u = `${url.replace(/\/$/, '')}${path}${query || ''}`;
    const r = await fetch(u, {
      method: 'GET',
      headers: {
        'apikey': anon,
        'Authorization': `Bearer ${anon}`,
        'Accept': 'application/json',
      },
    });
    const text = await r.text();
    const json = text ? (() => { try { return JSON.parse(text); } catch (_) { return null; } })() : null;
    return { ok: r.ok, status: r.status, text, json };
  }

  async function loadActivityKb(cfg) {
    const url = pick(cfg, 'supabaseUrl', SUPABASE_URL_DEFAULT);
    const anon = pick(cfg, 'supabaseAnon', SUPABASE_ANON_DEFAULT);

    // Prefer selecting `pathway` if it exists.
    const baseSelect = 'activity_code,name,vespa_element,level,short_summary,long_summary,keywords,pdf_link,updated_at';
    const withPathway = `${baseSelect},pathway`;

    const try1 = await supabaseFetch({
      url,
      anon,
      path: '/rest/v1/activity_kb',
      query: `?select=${encodeURIComponent(withPathway)}&order=${encodeURIComponent('vespa_element.asc,name.asc')}`,
    });

    if (try1.ok && Array.isArray(try1.json)) {
      return try1.json.map((r) => ({
        id: String(r.activity_code || '').trim(),
        name: r.name || '',
        element: (r.vespa_element || '').toUpperCase(),
        level: String(r.level || ''),
        pathway: (r.pathway || 'both'),
        summary: r.short_summary || '',
        guidance: r.long_summary || r.short_summary || '',
        pdf: r.pdf_link || '',
        keywords: r.keywords,
      })).filter((a) => a.id);
    }

    // If `pathway` doesn't exist yet, Supabase returns 400 with message about column.
    const try2 = await supabaseFetch({
      url,
      anon,
      path: '/rest/v1/activity_kb',
      query: `?select=${encodeURIComponent(baseSelect)}&order=${encodeURIComponent('vespa_element.asc,name.asc')}`,
    });

    if (try2.ok && Array.isArray(try2.json)) {
      return try2.json.map((r) => ({
        id: String(r.activity_code || '').trim(),
        name: r.name || '',
        element: (r.vespa_element || '').toUpperCase(),
        level: String(r.level || ''),
        pathway: 'both',
        summary: r.short_summary || '',
        guidance: r.long_summary || r.short_summary || '',
        pdf: r.pdf_link || '',
        keywords: r.keywords,
      })).filter((a) => a.id);
    }

    const errMsg = `[ActivityHub] Failed to load activity_kb. try1=${try1.status} try2=${try2.status}`;
    // eslint-disable-next-line no-console
    console.error(errMsg, { try1, try2 });
    throw new Error(errMsg);
  }

  function weightsForProfile(profile, pathway) {
    const base = {
      'Low':      { EFFORT: 3,   SYSTEMS: 2.5, ATTITUDE: 2,   VISION: 1.5, PRACTICE: 1 },
      'Low-Mid':  { EFFORT: 2.5, SYSTEMS: 2,   ATTITUDE: 2,   VISION: 1.5, PRACTICE: 1.5 },
      'Mid':      { VISION: 2,   PRACTICE: 2,  SYSTEMS: 2,    EFFORT: 1.5, ATTITUDE: 1.5 },
      'Mid-High': { PRACTICE: 2.5, VISION: 2,  SYSTEMS: 2,    EFFORT: 1.5, ATTITUDE: 1.5 },
      'High':     { PRACTICE: 3, VISION: 2.5,  SYSTEMS: 1.5,  EFFORT: 1,   ATTITUDE: 2 },
    }[profile] || {};

    // Override for vocational.
    if (pathway === 'vocational') return { SYSTEMS: 3, EFFORT: 2.5, ATTITUDE: 1.5, VISION: 1.5, PRACTICE: 1 };
    if (pathway === 'academic') return { PRACTICE: 3, VISION: 2, SYSTEMS: 1.5, EFFORT: 1.5, ATTITUDE: 1.5 };
    return base;
  }

  function generateCurriculum({ allActivities, yearGroup, profile, pathway, includeQuestionnaire, activitiesPerMonth }) {
    const isKS4 = Number(yearGroup) <= 11;
    const level = isKS4 ? '2' : '3';
    const w = weightsForProfile(profile, pathway);

    const pool = allActivities.filter((a) => {
      const lvlOk = (a.level === level || a.level === '' || a.level == null);
      const pwOk = (a.pathway === 'both' || a.pathway === pathway || a.pathway === '' || a.pathway == null);
      return lvlOk && pwOk;
    });

    const qSessions = includeQuestionnaire ? [
      { month: 'September', name: 'Questionnaire Cycle 1', element: 'VISION', qType: 'QUESTIONNAIRE', guidance: 'Allow at least 20 minutes. Students discuss results and print report. Emphasize no right/wrong answers.' },
      { month: 'September', name: 'Reflection & Coaching 1', element: 'VISION', qType: 'COACHING', guidance: 'Tutor-led coaching using questionnaire report. Students produce reflections and commitments across VESPA.' },
      { month: 'January', name: 'Questionnaire Cycle 2', element: 'VISION', qType: 'QUESTIONNAIRE', guidance: 'Second cycle. Compare with Cycle 1. Celebrate improvements and discuss strategies.' },
      { month: 'January', name: 'Reflection & Coaching 2', element: 'VISION', qType: 'COACHING', guidance: 'Review progress since Cycle 1. Update commitments. Peer coaching works well.' },
      { month: 'April', name: 'Questionnaire Cycle 3', element: 'VISION', qType: 'QUESTIONNAIRE', guidance: 'Final cycle. Celebrate growth. Compare all results; evidence for portfolios/personal statements.' },
      { month: 'April', name: 'Reflection & Coaching 3', element: 'VISION', qType: 'COACHING', guidance: 'Final reflection. Summarise VESPA journey and strategies that worked.' },
    ] : [];

    const qm = {};
    qSessions.forEach((q) => { qm[q.month] = (qm[q.month] || 0) + 1; });

    let seq = 1;
    const used = new Set();
    const curriculum = [];

    qSessions.forEach((q) => {
      curriculum.push({
        id: `Q${seq}`,
        isQ: true,
        qType: q.qType,
        sequence: seq++,
        month: q.month,
        name: q.name,
        element: q.element,
        guidance: q.guidance,
        summary: '',
        pdf: '',
        book: isKS4 ? 'GCSE Mindset' : 'A Level Mindset',
        yearGroup,
        profile,
        pathway,
      });
    });

    MONTHS.forEach((month) => {
      const avail = Math.max(0, Number(activitiesPerMonth) - (qm[month] || 0));
      if (avail <= 0) return;

      const already = curriculum.filter((c) => c.month === month).map((c) => c.element);
      const scored = pool
        .filter((a) => !used.has(a.id))
        .map((a) => {
          let score = (w[a.element] || 1);
          if (!already.includes(a.element)) score += 1.5; // encourage variety within month
          score += Math.random() * 0.5; // small jitter for distribution
          return { a, score };
        })
        .sort((x, y) => y.score - x.score);

      for (let i = 0; i < Math.min(avail, scored.length); i++) {
        const a = scored[i].a;
        used.add(a.id);
        curriculum.push({
          id: a.id,
          isQ: false,
          qType: null,
          sequence: seq++,
          month,
          name: a.name,
          element: a.element,
          guidance: a.guidance,
          summary: a.summary,
          pdf: a.pdf,
          book: a.level === '3' ? 'A Level Mindset' : a.level === '2' ? 'GCSE Mindset' : 'VESPA Handbook',
          yearGroup,
          profile,
          pathway,
        });
      }
    });

    return curriculum.sort((a, b) => {
      const d = MONTHS.indexOf(a.month) - MONTHS.indexOf(b.month);
      if (d !== 0) return d;
      if (a.isQ && !b.isQ) return -1;
      if (!a.isQ && b.isQ) return 1;
      return a.sequence - b.sequence;
    });
  }

  function downloadCsv(filename, rows) {
    const csv = rows.map((r) => r.map((c) => {
      const s = String(c ?? '');
      // wrap if contains comma or quote or newline
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    }).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function ensureStyles() {
    const id = 'vespa-activity-hub-styles';
    if (document.getElementById(id)) return;
    const css = `
      @import url('https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@400;600;700;800;900&display=swap');
      #vespa-activity-hub-root{font-family:'Nunito Sans',system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif}
      #vespa-activity-hub-root *{box-sizing:border-box}
      #vespa-activity-hub-root ::-webkit-scrollbar{width:6px}
      #vespa-activity-hub-root ::-webkit-scrollbar-thumb{background:#CBD5E1;border-radius:99px}

      .vah-shell{background:#F1F5F9;min-height:100vh}
      .vah-hero{background:linear-gradient(135deg,#0F172A 0%,#1E3A5F 50%,#1E40AF 100%);color:#fff;padding:20px 28px 0}
      .vah-hero-inner{max-width:1200px;margin:0 auto}
      .vah-hero h1{font-size:23px;font-weight:900;margin:0}
      .vah-hero p{margin:2px 0 0;color:#93C5FD;font-size:12px}
      .vah-hero-top{display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;margin-bottom:12px}

      .vah-content{max-width:1200px;margin:0 auto;padding:0 28px 60px}

      .vah-tabs{display:flex;gap:3}
      .vah-tab{border:none;border-radius:12px 12px 0 0;padding:9px 18px;font-size:12px;font-weight:800;cursor:pointer}
      .vah-tab.is-active{background:#fff;color:#1E293B}
      .vah-tab:not(.is-active){background:rgba(255,255,255,0.08);color:#93C5FD}
      .vah-panel{background:#F8FAFC;border-radius:0 16px 16px 16px;padding:20px 22px;animation:vahFadeUp 0.3s ease}
      .vah-row{display:flex;gap:10;flex-wrap:wrap;align-items:center}
      .vah-card{background:#fff;border:1px solid #E2E8F0;border-radius:20px;padding:26px;box-shadow:0 2px 8px rgba(0,0,0,0.06)}
      .vah-btn{border:none;border-radius:10px;padding:8px 12px;font-weight:800;font-size:12px;cursor:pointer}
      .vah-btn.primary{background:linear-gradient(135deg,#1E40AF,#3B82F6);color:#fff}
      .vah-btn.ghost{background:#fff;border:1px solid #E2E8F0;color:#475569}
      .vah-input{background:#fff;border:1px solid #E2E8F0;border-radius:10px;padding:8px 10px;font-size:13px;min-width:220px;flex:1}
      .vah-pill{display:inline-flex;align-items:center;gap:6;border-radius:999px;padding:2px 10px;font-size:11px;font-weight:800;border:1px solid #E2E8F0;background:#fff;color:#475569}
      .vah-pill.is-on{background:#1E40AF;color:#fff;border-color:#1E40AF}
      .vah-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:10px}
      .vah-item{background:#fff;border:1px solid #E2E8F0;border-left:4px solid #CBD5E1;border-radius:12px;padding:10px 12px;cursor:pointer}
      .vah-item:hover{box-shadow:0 4px 16px rgba(0,0,0,0.08);transform:translateY(-1px)}
      .vah-item h3{margin:0 0 3px;font-size:13px;font-weight:900;color:#0F172A}
      .vah-item .meta{display:flex;gap:6;flex-wrap:wrap;align-items:center;margin-bottom:6px}
      .vah-item .desc{color:#64748B;font-size:12px;line-height:1.45}
      .vah-badge{display:inline-flex;align-items:center;border-radius:999px;padding:2px 9px;font-size:10px;font-weight:900;white-space:nowrap}
      .vah-badge.q{background:#DBEAFE;color:#1D4ED8}
      .vah-badge.c{background:#FEF3C7;color:#92400E}
      .vah-drawer-mask{position:fixed;inset:0;background:rgba(15,23,42,0.45);backdrop-filter:blur(4px);z-index:10000}
      .vah-drawer{position:fixed;top:0;right:0;bottom:0;width:min(540px,92vw);background:#fff;z-index:10001;box-shadow:-8px 0 30px rgba(0,0,0,0.15);display:flex;flex-direction:column}
      .vah-drawer .hd{padding:16px 18px;border-bottom:1px solid #E2E8F0}
      .vah-drawer .bd{padding:14px 18px;overflow:auto;flex:1}
      .vah-drawer .x{border:none;background:none;cursor:pointer;font-size:18px;color:#94A3B8}
      .vah-kv{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0 14px}
      .vah-kv > div{background:#F8FAFC;border-radius:10px;padding:8px 10px;border:1px solid #E2E8F0}
      .vah-kv .k{font-size:10px;font-weight:900;color:#94A3B8;text-transform:uppercase;letter-spacing:0.06em}
      .vah-kv .v{font-size:13px;font-weight:800;color:#334155}
      .vah-muted{color:#94A3B8;font-size:12px}
      .vah-month{margin:14px 0}
      .vah-month-hd{display:flex;align-items:center;gap:10px;margin-bottom:8px}
      .vah-month-tag{width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,#1E40AF,#3B82F6);color:#fff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900}
      .vah-actions{display:flex;gap:8px;flex-wrap:wrap}

      @keyframes vahFadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
    `;
    document.head.appendChild(el('style', { id }, css));
  }

  function render(root, state) {
    root.innerHTML = '';
    ensureStyles();

    const shell = el('div', { class: 'vah-shell' });
    const hero = el('div', { class: 'vah-hero' }, [
      el('div', { class: 'vah-hero-inner' }, [
        el('div', { class: 'vah-hero-top' }, [
        el('div', null, [
          el('div', { style: 'font-size:10px;font-weight:900;color:#60A5FA;text-transform:uppercase;letter-spacing:0.15em' }, 'VESPA Academy'),
          el('h1', null, 'Activities & Curriculum'),
          el('p', null, `${state.allActivities.length} real activities • Build, edit, and export bespoke programmes`),
        ]),
        el('div', { class: 'vah-row', style: 'gap:4px;flex-wrap:wrap;justify-content:flex-end' },
          Object.keys(VESPA).map((k) => el('span', {
            class: 'vah-pill',
            style: `background:rgba(255,255,255,0.10);border-color:rgba(255,255,255,0.12);color:#E5E7EB;font-size:10px;font-weight:700;padding:3px 9px 3px 6px`,
          }, [
            el('span', { style: `display:inline-block;width:7px;height:7px;border-radius:99px;background:${VESPA[k].color}` }),
            VESPA[k].label,
          ]))
        ),
        ]),
        el('div', { class: 'vah-tabs' }, [
          el('button', {
            class: `vah-tab ${state.mode === 'builder' ? 'is-active' : ''}`,
            onclick: () => { state.mode = 'builder'; state.drawerItem = null; render(root, state); },
          }, '📋 Curriculum Builder'),
          el('button', {
            class: `vah-tab ${state.mode === 'library' ? 'is-active' : ''}`,
            onclick: () => { state.mode = 'library'; state.drawerItem = null; render(root, state); },
          }, '📚 Activity Library'),
        ]),
      ])
    ]);

    const content = el('div', { class: 'vah-content' });
    const panel = el('div', { class: 'vah-panel' });

    if (state.mode === 'library') {
      const filters = el('div', { class: 'vah-row', style: 'margin-bottom:12px' }, [
        el('input', {
          class: 'vah-input',
          placeholder: `Search ${state.allActivities.length} activities...`,
          value: state.search,
          oninput: (e) => { state.search = e.target.value || ''; render(root, state); },
        }),
        el('div', { class: 'vah-row', style: 'gap:6px' },
          Object.keys(VESPA).map((k) => el('button', {
            class: `vah-pill ${state.filterEl === k ? 'is-on' : ''}`,
            style: state.filterEl === k
              ? 'border-color:#1E40AF'
              : `border-color:${VESPA[k].color}30;background:${VESPA[k].bg};color:${VESPA[k].color}`,
            onclick: () => { state.filterEl = (state.filterEl === k ? null : k); render(root, state); },
          }, VESPA[k].label))
        ),
        el('div', { class: 'vah-row', style: 'gap:6px' }, [
          el('button', {
            class: `vah-pill ${state.filterLevel === '2' ? 'is-on' : ''}`,
            onclick: () => { state.filterLevel = (state.filterLevel === '2' ? null : '2'); render(root, state); },
          }, 'KS4'),
          el('button', {
            class: `vah-pill ${state.filterLevel === '3' ? 'is-on' : ''}`,
            onclick: () => { state.filterLevel = (state.filterLevel === '3' ? null : '3'); render(root, state); },
          }, 'KS5'),
          el('button', {
            class: `vah-pill ${state.filterPw === 'academic' ? 'is-on' : ''}`,
            onclick: () => { state.filterPw = (state.filterPw === 'academic' ? null : 'academic'); render(root, state); },
          }, 'Academic'),
          el('button', {
            class: `vah-pill ${state.filterPw === 'vocational' ? 'is-on' : ''}`,
            onclick: () => { state.filterPw = (state.filterPw === 'vocational' ? null : 'vocational'); render(root, state); },
          }, 'Vocational'),
        ]),
      ]);

      const filtered = state.allActivities.filter((a) => {
        if (state.search) {
          const s = state.search.toLowerCase();
          if (!a.name.toLowerCase().includes(s) &&
              !a.element.toLowerCase().includes(s) &&
              !(a.summary || '').toLowerCase().includes(s)) return false;
        }
        if (state.filterEl && a.element !== state.filterEl) return false;
        if (state.filterLevel && a.level !== state.filterLevel && a.level !== '') return false;
        if (state.filterPw) {
          const pw = a.pathway || 'both';
          if (!(pw === 'both' || pw === state.filterPw)) return false;
        }
        return true;
      });

      panel.appendChild(filters);
      panel.appendChild(el('div', { class: 'vah-muted', style: 'margin-bottom:10px' }, `Showing ${filtered.length} of ${state.allActivities.length}`));

      const grid = el('div', { class: 'vah-grid' });
      filtered.forEach((item) => {
        const v = VESPA[item.element] || VESPA.VISION;
        const card = el('div', { class: 'vah-item', style: `border-left-color:${v.color}` });
        card.appendChild(el('div', { class: 'meta' }, [
          el('span', { class: 'vah-pill', style: `background:${v.bg};border-color:${v.color}25;color:${v.color}` }, v.label),
          item.level ? el('span', { class: 'vah-pill' }, `Level ${item.level}`) : null,
          (item.pathway && item.pathway !== 'both') ? el('span', { class: 'vah-pill' }, item.pathway) : null,
        ].filter(Boolean)));
        card.appendChild(el('h3', null, item.name));
        card.appendChild(el('div', { class: 'desc' }, item.summary || item.guidance || ''));
        card.addEventListener('click', () => { state.drawerItem = item; render(root, state); });
        grid.appendChild(card);
      });
      panel.appendChild(grid);
    } else {
      // Builder
      if (!state.settings) {
        panel.appendChild(el('div', { class: 'vah-card', style: 'max-width:660px;margin:0 auto' }, [
          el('div', { style: 'text-align:center;margin-bottom:10px' }, [
            el('div', { style: 'font-size:34px;margin-bottom:6px' }, '🎯'),
            el('div', { style: 'font-size:18px;font-weight:900;color:#0F172A' }, 'Build Your Annual Programme'),
            el('div', { class: 'vah-muted' }, 'Answer a few questions, then edit freely'),
          ]),
          el('div', { class: 'vah-row', style: 'justify-content:center;margin:10px 0' }, [
            el('span', { class: 'vah-pill' }, 'Year Group'),
            el('select', {
              class: 'vah-input',
              style: 'max-width:180px;min-width:180px;flex:0',
              onchange: (e) => { state.tmp.yearGroup = e.target.value; },
            }, [
              el('option', { value: '' }, 'Select...'),
              ...[9, 10, 11, 12, 13].map((y) => el('option', { value: String(y) }, `Year ${y}`)),
            ]),
            el('span', { class: 'vah-pill' }, 'Pathway'),
            el('select', {
              class: 'vah-input',
              style: 'max-width:180px;min-width:180px;flex:0',
              onchange: (e) => { state.tmp.pathway = e.target.value; },
            }, [
              el('option', { value: '' }, 'Select...'),
              el('option', { value: 'academic' }, 'Academic'),
              el('option', { value: 'vocational' }, 'Vocational'),
              el('option', { value: 'both' }, 'Mixed'),
            ]),
            el('span', { class: 'vah-pill' }, 'Profile'),
            el('select', {
              class: 'vah-input',
              style: 'max-width:180px;min-width:180px;flex:0',
              onchange: (e) => { state.tmp.profile = e.target.value; },
            }, [
              el('option', { value: '' }, 'Select...'),
              ...PROFILES.map((p) => el('option', { value: p }, p)),
            ]),
          ]),
          el('div', { class: 'vah-row', style: 'justify-content:center;margin:10px 0' }, [
            el('label', { class: 'vah-pill', style: 'cursor:pointer' }, [
              el('input', {
                type: 'checkbox',
                checked: state.tmp.includeQuestionnaire,
                onchange: (e) => { state.tmp.includeQuestionnaire = !!e.target.checked; },
                style: 'margin-right:6px',
              }),
              'Include Questionnaire cycles',
            ]),
            el('span', { class: 'vah-pill' }, 'Activities / month'),
            el('select', {
              class: 'vah-input',
              style: 'max-width:120px;min-width:120px;flex:0',
              onchange: (e) => { state.tmp.activitiesPerMonth = Number(e.target.value || 2); },
            }, [1, 2, 3, 4].map((n) => el('option', { value: String(n), selected: n === state.tmp.activitiesPerMonth }, String(n)))),
          ]),
          el('div', { class: 'vah-row', style: 'justify-content:center;margin-top:14px' }, [
            el('button', {
              class: 'vah-btn primary',
              onclick: () => {
                const yearGroup = Number(state.tmp.yearGroup || 0);
                const pathway = state.tmp.pathway || '';
                const profile = state.tmp.profile || '';
                if (!yearGroup || !pathway || !profile) return;
                const settings = {
                  yearGroup,
                  pathway,
                  profile,
                  includeQuestionnaire: !!state.tmp.includeQuestionnaire,
                  activitiesPerMonth: Number(state.tmp.activitiesPerMonth || 2),
                };
                state.settings = settings;
                state.curriculum = generateCurriculum({ allActivities: state.allActivities, ...settings });
                render(root, state);
              },
            }, '✨ Generate'),
            el('button', {
              class: 'vah-btn ghost',
              onclick: () => { state.mode = 'library'; render(root, state); },
            }, 'Browse Library'),
          ]),
          el('div', { class: 'vah-muted', style: 'text-align:center;margin-top:10px' },
            'Tip: this is deterministic-ish but uses a small random jitter for variety.'
          ),
        ]));
      } else {
        const s = state.settings;
        const top = el('div', { class: 'vah-row', style: 'justify-content:space-between;margin-bottom:12px' }, [
          el('div', null, [
            el('div', { style: 'font-weight:900;color:#0F172A' }, `Year ${s.yearGroup} — ${s.profile} — ${s.pathway}`),
            el('div', { class: 'vah-muted' }, `${state.curriculum.length} sessions${s.includeQuestionnaire ? ' • questionnaire included' : ''}`),
          ]),
          el('div', { class: 'vah-actions' }, [
            el('button', {
              class: 'vah-btn ghost',
              onclick: () => {
                const rows = [['Sequence', 'Month', 'Activity', 'VESPA Element', 'Pathway', 'Profile', 'Tutor Guidance']];
                state.curriculum.forEach((i) => {
                  rows.push([
                    i.sequence,
                    i.month,
                    i.name,
                    (VESPA[i.element] ? VESPA[i.element].label : i.element),
                    i.isQ ? (i.qType || '') : (s.pathway || ''),
                    s.profile,
                    i.guidance || i.summary || '',
                  ]);
                });
                downloadCsv(`VESPA_Curriculum_Y${s.yearGroup}_${s.profile}.csv`, rows);
              },
            }, '📥 CSV'),
            el('button', { class: 'vah-btn ghost', onclick: () => window.print() }, '🖨 Print'),
            el('button', {
              class: 'vah-btn ghost',
              onclick: () => { state.settings = null; state.curriculum = []; render(root, state); },
            }, '↻ Rebuild'),
          ]),
        ]);
        panel.appendChild(top);

        // Group by month
        MONTHS.forEach((month) => {
          const items = state.curriculum.filter((c) => c.month === month);
          if (!items.length) return;
          const monthBox = el('div', { class: 'vah-month' });
          monthBox.appendChild(el('div', { class: 'vah-month-hd' }, [
            el('div', { class: 'vah-month-tag' }, month.slice(0, 3).toUpperCase()),
            el('div', null, [
              el('div', { style: 'font-weight:900;color:#1E293B' }, month),
              el('div', { class: 'vah-muted' }, `${items.length} session${items.length === 1 ? '' : 's'}`),
            ]),
          ]));
          const list = el('div', { style: 'display:flex;flex-direction:column;gap:8px;padding-left:44px' });
          items.forEach((item) => {
            const v = VESPA[item.element] || VESPA.VISION;
            const card = el('div', { class: 'vah-item', style: `border-left-color:${v.color};cursor:pointer` });
            card.appendChild(el('div', { class: 'meta' }, [
              el('span', { class: 'vah-pill', style: `background:${v.bg};border-color:${v.color}25;color:${v.color}` }, v.label),
              item.isQ ? el('span', { class: `vah-badge ${item.qType === 'QUESTIONNAIRE' ? 'q' : 'c'}` }, item.qType === 'QUESTIONNAIRE' ? '📋 Questionnaire' : '🗣 Coaching') : null,
              item.book ? el('span', { class: 'vah-pill' }, item.book) : null,
            ].filter(Boolean)));
            card.appendChild(el('h3', null, `${item.sequence}. ${item.name}`));
            card.appendChild(el('div', { class: 'desc' }, item.guidance || item.summary || ''));
            card.addEventListener('click', () => { state.drawerItem = item; render(root, state); });
            list.appendChild(card);
          });
          monthBox.appendChild(list);
          panel.appendChild(monthBox);
        });
      }
    }

    content.appendChild(panel);
    shell.appendChild(hero);
    shell.appendChild(content);
    root.appendChild(shell);

    // Drawer
    if (state.drawerItem) {
      const item = state.drawerItem;
      const v = VESPA[item.element] || VESPA.VISION;
      const mask = el('div', { class: 'vah-drawer-mask', onclick: () => { state.drawerItem = null; render(root, state); } });
      const drawer = el('div', { class: 'vah-drawer' });
      const hd = el('div', { class: 'hd', style: `background:linear-gradient(135deg,${v.bg},#fff)` }, [
        el('div', { class: 'vah-row', style: 'justify-content:space-between;align-items:flex-start' }, [
          el('div', null, [
            el('div', { class: 'vah-row', style: 'gap:6px;margin-bottom:6px' }, [
              el('span', { class: 'vah-pill', style: `background:${v.bg};border-color:${v.color}25;color:${v.color}` }, v.label),
              item.isQ ? el('span', { class: `vah-badge ${item.qType === 'QUESTIONNAIRE' ? 'q' : 'c'}` }, item.qType === 'QUESTIONNAIRE' ? '📋 Questionnaire' : '🗣 Coaching') : null,
              item.level ? el('span', { class: 'vah-pill' }, `Level ${item.level}`) : null,
              item.book ? el('span', { class: 'vah-pill' }, item.book) : null,
            ].filter(Boolean)),
            el('div', { style: 'font-size:18px;font-weight:900;color:#0F172A' }, item.name || ''),
          ]),
          el('button', { class: 'x', onclick: (e) => { e.stopPropagation(); state.drawerItem = null; render(root, state); } }, '✕'),
        ]),
      ]);
      const bd = el('div', { class: 'bd' }, [
        item.summary ? el('div', {
          style: `font-size:13px;color:#475569;line-height:1.7;margin-bottom:12px;font-style:italic;border-left:3px solid ${v.color}55;padding-left:12px`,
        }, item.summary) : null,
        el('div', { class: 'vah-kv' }, [
          item.month ? el('div', null, [el('div', { class: 'k' }, 'Month'), el('div', { class: 'v' }, item.month)]) : null,
          item.sequence ? el('div', null, [el('div', { class: 'k' }, 'Sequence'), el('div', { class: 'v' }, `#${item.sequence}`)]) : null,
          item.profile ? el('div', null, [el('div', { class: 'k' }, 'Profile'), el('div', { class: 'v' }, item.profile)]) : null,
          item.yearGroup ? el('div', null, [el('div', { class: 'k' }, 'Year Group'), el('div', { class: 'v' }, `Year ${item.yearGroup}`)]) : null,
        ].filter(Boolean)),
        el('div', { style: 'font-size:11px;font-weight:900;color:#94A3B8;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px' }, 'Tutor guidance'),
        el('div', { style: `background:linear-gradient(135deg,${v.bg}88,#F8FAFC);border:1px solid #E2E8F0;border-radius:12px;padding:12px 12px;font-size:13px;line-height:1.75;color:#334155` }, item.guidance || ''),
        el('div', { class: 'vah-row', style: 'margin-top:12px;gap:8px;flex-wrap:wrap' }, [
          item.pdf ? el('a', {
            class: 'vah-btn primary',
            href: item.pdf,
            target: '_blank',
            rel: 'noopener noreferrer',
            style: 'text-decoration:none;display:inline-flex;align-items:center;gap:6px',
          }, '⬇ Open PDF') : null,
        ].filter(Boolean)),
      ].filter(Boolean));
      drawer.appendChild(hd);
      drawer.appendChild(bd);
      document.body.appendChild(mask);
      document.body.appendChild(drawer);

      // Clean up any previous drawer nodes (keep only latest)
      qsa('.vah-drawer-mask').slice(0, -1).forEach((n) => n.remove());
      qsa('.vah-drawer').slice(0, -1).forEach((n) => n.remove());
    } else {
      qsa('.vah-drawer-mask').forEach((n) => n.remove());
      qsa('.vah-drawer').forEach((n) => n.remove());
    }
  }

  async function mountForScene(sceneKey, cfg) {
    if (!SCENES.has(sceneKey)) return;

    const sceneId = `kn-${sceneKey}`;
    const sceneEl = document.getElementById(sceneId);
    if (!sceneEl) return;

    // Redirect legacy pages to the new combined Curriculum page (so old bookmarks still work)
    // Only do this if we're on the old routes and not already on the new one.
    try {
      const hash = String(window.location.hash || '');
      const isLegacy = (sceneKey === 'scene_1169' || sceneKey === 'scene_1234');
      const isAlreadyNew = hash.includes('curriculum-builder');
      if (isLegacy && !isAlreadyNew) {
        window.location.hash = '#curriculum-builder/';
        return;
      }
    } catch (_) {}

    // Mount point
    // - New loader page: mount into rich text content (same pattern as other custom apps)
    // - Legacy scenes: fall back to the scene element (but typically redirected above)
    const defaultSelector = (sceneKey === 'scene_1294')
      ? '#view_3280 .kn-rich_text__content'
      : null;
    const preferredSelector = pick(cfg, 'elementSelector', defaultSelector);
    const preferredMount = preferredSelector ? qs(preferredSelector) : null;

    // On the new hub scene, never mount into the whole scene as a fallback.
    // The loader may fire on an earlier view render; wait until the rich text view exists.
    if (sceneKey === 'scene_1294' && !preferredMount) return;

    // Idempotency guard per scene (set only once we're sure we can mount).
    const guardKey = `__VESPA_ACTIVITY_HUB_${sceneKey}_${BUILD}`;
    if (window[guardKey]) return;
    window[guardKey] = true;

    const mountRoot = preferredMount || sceneEl;

    // Hide Knack-rendered views in the scene (only on the legacy replacement scenes).
    // On the new loader scene, we render inside the rich text view and don't need to hide the whole scene.
    if (sceneKey !== 'scene_1294') {
      try {
        qsa('.kn-view, .view, .kn-form, .kn-asset, .kn-entries', sceneEl).forEach((n) => {
          if (n && n.id !== 'vespa-activity-hub-root') n.style.display = 'none';
        });
      } catch (_) {}
    }

    // Root container
    let root = qs('#vespa-activity-hub-root', mountRoot);
    if (!root) {
      root = el('div', { id: 'vespa-activity-hub-root' });
      mountRoot.appendChild(root);
    }

    root.innerHTML = '<div style="padding:14px;color:#64748B;font-weight:700">Loading Activities Hub…</div>';

    const state = {
      mode: 'builder',
      allActivities: [],
      search: '',
      filterEl: null,
      filterLevel: null,
      filterPw: null,
      drawerItem: null,
      settings: null,
      curriculum: [],
      tmp: { yearGroup: '', pathway: '', profile: '', includeQuestionnaire: true, activitiesPerMonth: 2 },
    };

    try {
      state.allActivities = await loadActivityKb(cfg);
      render(root, state);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[ActivityHub] Failed to initialise', e);
      root.innerHTML = `
        <div style="padding:14px;background:#FEF2F2;border:1px solid #FCA5A5;border-radius:12px;color:#991B1B">
          <div style="font-weight:900;margin-bottom:6px">Activities Hub failed to load</div>
          <div style="font-size:12px;line-height:1.5">
            This page needs Supabase access to <code>public.activity_kb</code>.
            Check RLS/read access + network, then refresh.
          </div>
        </div>`;
    }
  }

  // Initializer for the multi-app loader
  function initializeVespaActivityHub() {
    const cfg = window.VESPA_ACTIVITY_HUB_CONFIG || {};
    const sceneKey = cfg.sceneKey || (window.Knack && Knack.scene && Knack.scene.key) || null;
    if (!sceneKey) return;
    mountForScene(sceneKey, cfg);
  }

  // Expose initializer (loader calls this)
  window.initializeVespaActivityHub = initializeVespaActivityHub;

  // Also hook scene renders for navigation within the same session.
  if (typeof $ !== 'undefined' && $.on) {
    // (jQuery in Knack) - no-op; .on is not a function on $
  }
  try {
    if (typeof jQuery !== 'undefined') {
      jQuery(document).on('knack-scene-render.any', function (_e, scene) {
        if (!scene || !scene.key) return;
        const cfg = window.VESPA_ACTIVITY_HUB_CONFIG || {};
        mountForScene(scene.key, cfg);
      });
    }
  } catch (_) {}
})();

