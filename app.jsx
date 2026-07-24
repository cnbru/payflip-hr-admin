// ── Payflip HR Admin — Desktop Prototype ──────────────────────────────────

const { useState, useEffect, useRef, useCallback, useMemo } = React;

// ── Design tokens ──────────────────────────────────────────────────────────
const P = {
  ink:         '#0f0d28',
  inkSoft:     '#50545e',
  inkFaint:    '#9ca3af',
  border:      '#eaeaeb',
  borderStrong:'#d9dadd',
  bg:          '#f7f7f8',
  white:       '#ffffff',
  accent:      '#6366f1',
  action:      '#220A35',
};

const StatusMeta = {
  pending:  { dot: '#f59e0b', label: 'Pending',  icon: 'Clock', color: '#92400e', bg: '#fde68a' },
  approved: { dot: '#22c55e', label: 'Approved', icon: 'Check', color: '#14532d', bg: '#bbf7d0' },
  rejected: { dot: '#ef4444', label: 'Declined', icon: 'X',     color: '#7f1d1d', bg: '#fecaca' },
  ended:    { dot: '#9ca3af', label: 'Ended',    icon: 'Minus', color: '#374151', bg: '#f3f4f6' },
};

const avatarUrl = (name, gender) => {
  const hash = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const img = gender === 'f' ? (hash % 35) + 1 : (hash % 35) + 36;
  return `https://i.pravatar.cc/64?img=${img}`;
};

const LEAVE_COLORS = {
  'Time off':           '#c5dcfd',
  'ADV / RTT':          '#fef3c7',
  'Extra-legal leave':  '#ede9fe',
  'Sick leave':         '#fbd0e4',
  'Special leave':      '#fde9c8',
  'Funeral leave':      '#d8d3e3',
  'Paternity leave':    '#ddd8fb',
  'Maternity leave':    '#ddd8fb',
  'Paid absence':       '#c0eef3',
  'Unpaid absence':     '#e2e8ec',
};
const LEAVE_BORDER_COLORS = {
  'Time off':           '#7aafe8',
  'ADV / RTT':          '#e5c87a',
  'Extra-legal leave':  '#a899e0',
  'Sick leave':         '#e698b8',
  'Special leave':      '#e0b97a',
  'Funeral leave':      '#a99dba',
  'Paternity leave':    '#a9a0e0',
  'Maternity leave':    '#a9a0e0',
  'Paid absence':       '#7ac8d1',
  'Unpaid absence':     '#a8b4be',
};


const LEAVE_ICONS = {
  'Time off':          'Palmtree',
  'ADV / RTT':         'Clock',
  'Extra-legal leave': 'Star',
  'Sick leave':        'Stethoscope',
  'Special leave':     'Heart',
  'Funeral leave':     'Flower2',
  'Paternity leave':   'Baby',
  'Maternity leave':   'Baby',
  'Paid absence':      'Briefcase',
  'Unpaid absence':    'Briefcase',
};

const ALL_LEAVE_TYPES = [
  'Time off', 'ADV / RTT', 'Extra-legal leave',
  'Sick leave', 'Special leave',
  'Paternity leave', 'Maternity leave',
];

const ADMIN_ONLY_TYPES = new Set(['Paternity leave', 'Maternity leave', 'Paid absence', 'Unpaid absence']);

const SPECIAL_LEAVE_REASONS = [
  { id: 'wedding',   label: 'Wedding',      hasWho: true,  entitlement: null },
  { id: 'moving',    label: 'Moving',        hasWho: false, entitlement: '1 day' },
  { id: 'funeral',   label: 'Funeral leave', hasWho: true,  entitlement: null },
  { id: 'ceremony',  label: 'Ceremony',      hasWho: false, entitlement: '1 day' },
  { id: 'civic',     label: 'Civic duty',    hasWho: false, entitlement: 'Up to 5 days' },
];
const SPECIAL_WEDDING_WHO = [
  { id: 'own',    label: "Employee's own wedding",         days: 2 },
  { id: 'family', label: "Child, sibling, or parent of the employee", days: 1 },
];
const SPECIAL_FUNERAL_WHO = [
  { id: 'partner',  label: 'Partner or spouse',           days: 10, note: '3 around the funeral, 7 more within the year' },
  { id: 'child',    label: 'Child',                       days: 10, note: '3 around the funeral, 7 more within the year' },
  { id: 'parent',   label: 'Parent or parent-in-law',     days: 3  },
  { id: 'sibling',  label: 'Sibling or grandparent',      days: 2  },
  { id: 'other',    label: 'Other family member',         days: 1  },
];

const ATTACHMENT_RULES = {
  'Sick leave':      { label: 'Medical certificate', note: 'Required for absences of 2 or more consecutive days' },
  'Special leave':   { label: 'Supporting document', note: 'Marriage/birth certificate or official event proof' },
  'Funeral leave':   { label: 'Death certificate', note: 'Required to process bereavement leave' },
  'Paternity leave': { label: 'Birth certificate', note: 'Required to activate paternity leave entitlement' },
  'Maternity leave': { label: 'Medical certificate', note: 'Required to activate maternity leave entitlement' },
};

// ── Lucide icon helper ─────────────────────────────────────────────────────
function Icon({ name, size = 16, color = P.inkSoft, strokeWidth = 1.75, style }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || !window.lucide) return;
    ref.current.innerHTML = '';
    const el = document.createElement('i');
    el.setAttribute('data-lucide', name);
    ref.current.appendChild(el);
    lucide.createIcons({ elements: [el] });
    const svg = ref.current.querySelector('svg');
    if (svg) {
      svg.setAttribute('width', size);
      svg.setAttribute('height', size);
      svg.setAttribute('stroke', color);
      svg.setAttribute('stroke-width', strokeWidth);
      svg.style.display = 'block';
      svg.style.flexShrink = '0';
    }
  }, [name, size, color, strokeWidth]);
  return <span ref={ref} style={{ display: 'inline-flex', alignItems: 'center', ...style }} />;
}

// ── Motion tokens ────────────────────────────────────────────────────────────
const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';
const EASE_DRAWER = 'cubic-bezier(0.32, 0.72, 0, 1)';
const EASE_BOUNCE = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
const PREFERS_REDUCED_MOTION = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const MODAL_CLOSE_DUR = 150;
const SHEET_CLOSE_DUR = 220;

// Drives a modal's mount-in / close-out transition. Returns `visible` (drive
// opacity/transform from this) and `close` (call instead of the raw onClose —
// it animates out, then fires the real onClose after MODAL_CLOSE_DUR).
function useModalTransition(onClose, closeDur = MODAL_CLOSE_DUR) {
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const close = useCallback(() => {
    setClosing(true);
    setTimeout(onClose, closeDur);
  }, [onClose, closeDur]);
  return { visible: mounted && !closing, close, closing };
}
function modalBackdropStyle(visible) {
  return { opacity: visible ? 1 : 0, transition: `opacity ${MODAL_CLOSE_DUR}ms ${EASE_OUT}` };
}

// Drives a popover/dropdown/menu's grow-in / shrink-out transition from a
// plain `open` boolean. Keeps the panel mounted for `duration` after `open`
// flips false so the shrink-out can play instead of an instant unmount.
function usePopoverTransition(open, duration = 150) {
  const [rendered, setRendered] = useState(open);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (open) {
      setRendered(true);
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    }
    setVisible(false);
    const t = setTimeout(() => setRendered(false), duration);
    return () => clearTimeout(t);
  }, [open, duration]);
  return { rendered, visible };
}
function popoverStyle(visible, origin = 'top') {
  return {
    opacity: visible ? 1 : 0,
    transform: visible ? 'scale(1)' : 'scale(0.97)',
    transformOrigin: origin,
    transition: `opacity 150ms ${EASE_OUT}, transform 150ms ${EASE_OUT}`,
  };
}

// Measures the active item in a tab/segmented-control strip and returns a ref
// to attach to the container plus a left/width rect to position a sliding
// indicator behind/under the items. First measurement is applied with no
// transition (so it doesn't animate in from 0,0); subsequent moves animate.
function useSlidingIndicator(activeKey) {
  const containerRef = useRef(null);
  const [rect, setRect] = useState(null);
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const el = container.querySelector(`[data-key="${CSS.escape(String(activeKey))}"]`);
    if (el) setRect({ left: el.offsetLeft, width: el.offsetWidth });
  }, [activeKey]);
  useEffect(() => {
    if (rect && !animate) {
      const id = requestAnimationFrame(() => setAnimate(true));
      return () => cancelAnimationFrame(id);
    }
  }, [rect, animate]);
  return [containerRef, rect || { left: 0, width: 0 }, animate];
}
function modalPanelStyle(visible) {
  return {
    transform: visible ? 'scale(1)' : 'scale(0.96)',
    opacity: visible ? 1 : 0,
    transition: `transform 200ms ${EASE_OUT}, opacity 200ms ${EASE_OUT}`,
  };
}
function sheetPanelStyle(visible, closing) {
  const transDur = closing ? SHEET_CLOSE_DUR : 340;
  const opacDur  = closing ? SHEET_CLOSE_DUR : 180;
  return {
    transform: visible ? 'translateX(0)' : 'translateX(100%)',
    opacity:   visible ? 1 : 0,
    transition: `transform ${transDur}ms ${EASE_DRAWER}, opacity ${opacDur}ms ${EASE_OUT}`,
  };
}

// ── Shared toggle switch ─────────────────────────────────────────────────────
function Switch({ checked, onChange, size = 'md' }) {
  const dims = size === 'sm' ? { w: 28, h: 16, knob: 12, pad: 2 } : { w: 34, h: 20, knob: 16, pad: 2 };
  return (
    <div onClick={onChange} style={{
      width: dims.w, height: dims.h, borderRadius: dims.h / 2, flexShrink: 0, cursor: 'pointer',
      background: checked ? P.action : '#d1d5db',
      position: 'relative', transition: `background 150ms ${EASE_OUT}`,
    }}>
      <div style={{
        position: 'absolute', top: dims.pad,
        left: checked ? dims.w - dims.knob - dims.pad : dims.pad,
        width: dims.knob, height: dims.knob, borderRadius: dims.knob / 2,
        background: '#fff', transition: `left 200ms ${EASE_BOUNCE}`,
      }} />
    </div>
  );
}

function WeekCard({ entry, requestId, requests, isPending }) {
  const req = requests.find(function(rr) { return rr.id === requestId; });
  return (
    <React.Fragment>
      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, color: P.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}>
        {entry.type}
      </span>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: P.inkSoft, whiteSpace: 'nowrap', lineHeight: 1.3 }}>
        {isPending ? 'Pending' : req ? (req.days + ' ' + (req.days === 1 ? 'day' : 'days')) : ''}
      </span>
    </React.Fragment>
  );
}

// ── Belgian calendar constants (ported from employee app) ──────────────────
const BELGIAN_HOLIDAYS_2026 = [
  '2026-01-01','2026-04-06','2026-05-01','2026-05-14',
  '2026-05-25','2026-07-21','2026-08-15','2026-11-01',
  '2026-11-11','2026-12-25',
];
const _holidaySet = new Set(BELGIAN_HOLIDAYS_2026);
const BELGIAN_HOLIDAY_NAMES = {
  '2026-01-01': "New Year's Day",      '2026-04-06': 'Easter Monday',
  '2026-05-01': 'Labour Day',          '2026-05-14': 'Ascension Day',
  '2026-05-25': 'Whit Monday',         '2026-07-21': 'Belgian National Day',
  '2026-08-15': 'Assumption of Mary',  '2026-11-01': "All Saints' Day",
  '2026-11-11': 'Armistice Day',       '2026-12-25': 'Christmas Day',
};
const COLLECTIVE_HOLIDAYS = [];
const _collectiveSet = new Set(COLLECTIVE_HOLIDAYS);
const HOLIDAY_ICON = {
  "New Year's Day":    { emoji: '🎆' },
  'Easter Monday':     { emoji: '🐣' },
  'Labour Day':        { lucide: 'Hammer' },
  'Ascension Day':     { lucide: 'Church' },
  'Whit Monday':       { lucide: 'Church' },
  'Belgian National Day': { emoji: '🇧🇪' },
  'Assumption of Mary':   { lucide: 'Church' },
  "All Saints' Day":   { emoji: '🕯️' },
  'Armistice Day':     { lucide: 'Shield' },
  'Christmas Day':     { emoji: '🎄' },
};

// ── Employee data ──────────────────────────────────────────────────────────
const DEPARTMENTS = ['Design','Engineering','Marketing'];
const AVATAR_COLORS = ['#bfdbfe','#ddd6fe','#fde68a','#a7f3d0','#fecdd3','#fed7aa','#c7d2fe','#fca5a5','#d9f99d','#99f6e4'];

const EMPLOYEES = {
  // Design
  'bram-goossens':     { name: 'Bram Goossens',     initials: 'BG', color: '#bfdbfe', entitlement: 23, department: 'Design',       email: 'bram.goossens@lumiogroup.be',     entity: 'Lumio Group', budget: 3750,  role: 'Employee', status: 'Active', gender: 'm' },
  'emma-martens':      { name: 'Emma Martens',       initials: 'EM', color: '#ddd6fe', entitlement: 29, department: 'Design',       email: 'emma.martens@lumiogroup.be',      entity: 'Lumio Group', budget: 0,     role: 'Employee', status: 'Active', gender: 'f', photo: true },
  'mathias-de-smedt':  { name: 'Mathias De Smedt',  initials: 'MD', color: '#fde68a', entitlement: 23, department: 'Design',       email: 'mathias.de-smedt@lumiogroup.be', entity: 'Lumio Group', budget: 6250,  role: 'Employee', status: 'Active', gender: 'm' },
  'thomas-vandenberghe': { name: 'Thomas Vandenberghe', initials: 'TV', color: '#99f6e4', entitlement: 20, department: 'Design',    email: 'thomas.vandenberghe@lumiogroup.be', entity: 'Lumio Group', budget: 0, role: 'Employee', status: 'Active', gender: 'm' },
  'thomas-janssens':     { name: 'Thomas Janssens',    initials: 'TJ', color: '#d9f99d', entitlement: 23, department: 'Design',    email: 'thomas.janssens@lumiogroup.be', entity: 'Lumio Group', budget: 3000, role: 'Employee', status: 'Active', gender: 'm' },
  'charlotte-pieters':   { name: 'Charlotte Pieters',  initials: 'CP', color: '#fecdd3', entitlement: 20, department: 'Design',    email: 'charlotte.pieters@lumiogroup.be', entity: 'Lumio Group', budget: 2500, role: 'Employee', status: 'Active', gender: 'f' },
  'lasse-willems':       { name: 'Lasse Willems',      initials: 'LW', color: '#c7d2fe', entitlement: 23, department: 'Design',    email: 'lasse.willems@lumiogroup.be',   entity: 'Lumio Group', budget: 4000, role: 'Employee', status: 'Active', gender: 'm' },
  'nathalie-cox':        { name: 'Nathalie Cox',        initials: 'NC', color: '#a7f3d0', entitlement: 20, department: 'Design',    email: 'nathalie.cox@lumiogroup.be',    entity: 'Lumio Group', budget: 3200, role: 'Employee', status: 'Active', gender: 'f' },
  'ruben-declercq':      { name: 'Ruben Declercq',     initials: 'RD', color: '#fed7aa', entitlement: 25, department: 'Design',    email: 'ruben.declercq@lumiogroup.be',  entity: 'Lumio Group', budget: 5500, role: 'Employee', status: 'Active', gender: 'm' },
  'ines-baert':          { name: 'Inès Baert',          initials: 'IB', color: '#ddd6fe', entitlement: 20, department: 'Design',    email: 'ines.baert@lumiogroup.be',      entity: 'Lumio Group', budget: 2800, role: 'Employee', status: 'Active', gender: 'f' },
  'joachim-nijs':        { name: 'Joachim Nijs',        initials: 'JN', color: '#fde68a', entitlement: 23, department: 'Design',    email: 'joachim.nijs@lumiogroup.be',    entity: 'Lumio Group', budget: 4800, role: 'Employee', status: 'Active', gender: 'm' },
  'sara-verbeke':        { name: 'Sara Verbeke',        initials: 'SV', color: '#bfdbfe', entitlement: 20, department: 'Design',    email: 'sara.verbeke@lumiogroup.be',    entity: 'Lumio Group', budget: 3100, role: 'Employee', status: 'Active', gender: 'f' },
  'wout-desmet':         { name: 'Wout Desmet',         initials: 'WD', color: '#99f6e4', entitlement: 22, department: 'Design',    email: 'wout.desmet@lumiogroup.be',     entity: 'Lumio Group', budget: 4200, role: 'Employee', status: 'Active', gender: 'm' },
  'amber-claes':         { name: 'Amber Claes',         initials: 'AC', color: '#fca5a5', entitlement: 20, department: 'Design',    email: 'amber.claes@lumiogroup.be',     entity: 'Lumio Group', budget: 2900, role: 'Employee', status: 'Active', gender: 'f' },
  'pieter-verheyen':     { name: 'Pieter Verheyen',     initials: 'PV', color: '#d9f99d', entitlement: 25, department: 'Design',    email: 'pieter.verheyen@lumiogroup.be', entity: 'Lumio Group', budget: 6000, role: 'Manager',  status: 'Active', gender: 'm' },
  // Engineering
  'david':             { name: 'David Laurent',      initials: 'DL', color: '#fecdd3', entitlement: 20, department: 'Engineering', email: 'david.laurent@lumiogroup.be',     entity: 'Lumio Group', budget: 4500,  role: 'Employee', status: 'Active', gender: 'm', photo: true },
  'stijn-laurent':     { name: 'Stijn Laurent',      initials: 'SL', color: '#a7f3d0', entitlement: 29, department: 'Engineering', email: 'stijn.laurent@lumiogroup.be',     entity: 'Lumio Group', budget: 1500,  role: 'Employee', status: 'Active', gender: 'm' },
  'jana-goossens':     { name: 'Jana Goossens',      initials: 'JG', color: '#c7d2fe', entitlement: 20, department: 'Engineering', email: 'jana.goossens@lumiogroup.be',     entity: 'Lumio Group', budget: 2000,  role: 'Employee', status: 'Active', gender: 'f' },
  'laura-mertens':     { name: 'Laura Mertens',      initials: 'LM', color: '#fca5a5', entitlement: 20, department: 'Engineering', email: 'laura.mertens@lumiogroup.be',     entity: 'Lumio Group', budget: 750,   role: 'Employee', status: 'Active', gender: 'f' },
  // Marketing
  'pieter-mertens':    { name: 'Pieter Mertens',     initials: 'PM', color: '#a7f3d0', entitlement: 29, department: 'Marketing',   email: 'pieter.mertens@lumiogroup.be',    entity: 'Lumio Group', budget: 8500,  role: 'Manager',  status: 'Active', gender: 'm' },
  'sarah-de-smedt':    { name: 'Sarah De Smedt',     initials: 'SD', color: '#fecdd3', entitlement: 23, department: 'Marketing',   email: 'sarah.de-smedt@lumiogroup.be',   entity: 'Lumio Group', budget: 2750,  role: 'Employee', status: 'Active', gender: 'f' },
  'julie-goossens':    { name: 'Julie Goossens',     initials: 'JG', color: '#fed7aa', entitlement: 20, department: 'Marketing',   email: 'julie.goossens@lumiogroup.be',    entity: 'Lumio Group', budget: 5000,  role: 'Manager',  status: 'Active', gender: 'f' },
  'noor-de-smedt':     { name: 'Noor De Smedt',      initials: 'ND', color: '#fde68a', entitlement: 20, department: 'Marketing',   email: 'noor.de-smedt@lumiogroup.be',    entity: 'Lumio Group', budget: 0,     role: 'Employee', status: 'Active', gender: 'f' },
};

// ── Per-employee supplemental data ────────────────────────────────────────
const EMP_EXTRA = {
  'bram-goossens':       { payrollId: '000041', hireDate: '15/03/2023', lang: 'Dutch',   admin: false },
  'emma-martens':        { payrollId: '000040', hireDate: '12/05/2025', lang: 'English', admin: false },
  'mathias-de-smedt':    { payrollId: '000032', hireDate: '01/09/2022', lang: 'Dutch',   admin: false },
  'thomas-vandenberghe': { payrollId: '000028', hireDate: '04/02/2022', lang: 'Dutch',   admin: false },
  'thomas-janssens':     { payrollId: '000044', hireDate: '10/01/2023', lang: 'Dutch',   admin: false },
  'david':               { payrollId: '000015', hireDate: '07/11/2020', lang: 'French',  admin: true  },
  'stijn-laurent':       { payrollId: '000019', hireDate: '14/04/2021', lang: 'Dutch',   admin: false },
  'jana-goossens':       { payrollId: '000033', hireDate: '02/11/2022', lang: 'Dutch',   admin: false },
  'laura-mertens':       { payrollId: '000038', hireDate: '07/03/2024', lang: 'Dutch',   admin: false },
  'pieter-mertens':      { payrollId: '000009', hireDate: '01/06/2019', lang: 'Dutch',   admin: true  },
  'sarah-de-smedt':      { payrollId: '000025', hireDate: '16/08/2021', lang: 'French',  admin: false },
  'julie-goossens':      { payrollId: '000011', hireDate: '03/09/2019', lang: 'Dutch',   admin: true  },
  'noor-de-smedt':       { payrollId: '000043', hireDate: '22/09/2025', lang: 'Dutch',   admin: false },
};
function _eseed(id, s) { let h = 0; const k = id + s; for (let i = 0; i < k.length; i++) h = ((h * 31) + k.charCodeAt(i)) >>> 0; return h; }
function _eur(n) { const [i, d] = (n / 100).toFixed(2).split('.'); return i.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ',' + d + ' EUR'; }
function genSalary(id) {
  const h = _eseed(id, 'sal'), base = 3100 + (h % 2300), p1 = base - 50 - (h >> 4 & 127), p2 = p1 - 40 - (h >> 6 & 95);
  const regime = (h & 1) ? '40:00' : '38:00', hd = (EMP_EXTRA[id] || {}).hireDate || '01/01/2022';
  const allC = [
    { type: 'PC', icon: 'Laptop', end: 'N/A' },
    { type: 'Smartphone', icon: 'Smartphone', end: '04/11/2027' },
    { type: 'Tablet', icon: 'Tablet', end: '13/05/2028' },
    { type: 'Internet', icon: 'Wifi', end: 'N/A' },
    { type: 'Company car', icon: 'Car', end: '01/01/2029' },
  ];
  const nC = 1 + (h & 3), off = (h >> 8) % allC.length;
  const comps = allC.slice(off).concat(allC).slice(0, nC).map((c, i) => ({ ...c, start: i === 0 ? hd : '01/01/2026' }));
  return {
    history: [
      { gross: _eur(base * 100), regime, start: '01/05/2026', end: '—', active: true },
      { gross: _eur(p1 * 100), regime, start: '01/01/2026', end: '01/05/2026', active: false },
      { gross: _eur(p2 * 100), regime, start: hd, end: '01/01/2026', active: false },
    ],
    components: comps,
  };
}
function genBudgets(id) {
  const h = _eseed(id, 'bud');
  return [
    { name: 'End of year premium', balance: '+' + _eur(50000 + (h & 0xFF) * 1000), topUp: '+' + _eur(580000 + (h & 0x1FF) * 500), topUpDate: '01/01/2026', cashOut: '17/12/2026' },
    { name: 'Mobility budget', balance: '+' + _eur(12 + (h & 0x3FFF) * 10), topUp: '+' + _eur(900000 + (h >> 4 & 0xFFF) * 100), topUpDate: '22/01/2026', cashOut: '08/01/2027' },
    { name: 'Home office budget', balance: '+0,00 EUR', topUp: '+450,00 EUR', topUpDate: '06/05/2025', cashOut: 'None' },
    { name: 'L&D budget', balance: '+' + _eur(5000 + (h >> 8 & 0x7FF) * 100), topUp: '+' + _eur(10000 + (h >> 12 & 0xFF) * 100), topUpDate: '22/01/2026', cashOut: 'None' },
    { name: 'Remote working budget', balance: '+450,00 EUR', topUp: '+450,00 EUR', topUpDate: '06/05/2025', cashOut: 'None' },
  ];
}
const _CPOOL = [
  { name: 'Smartphone accessories via Coolblue', price: '249,00 EUR', cDate: '24/06/2026', sDate: '24/06/2026', eDate: '24/06/2028' },
  { name: 'L&D expenses (Payflip)', price: '158,60 EUR', cDate: '19/06/2026', sDate: '19/06/2026', eDate: '—' },
  { name: 'Tablet via Coolblue', price: '369,00 EUR', cDate: '13/05/2026', sDate: '13/05/2026', eDate: '13/05/2028' },
  { name: 'Individual pension savings', price: '939,96 EUR', cDate: '02/03/2026', sDate: '05/03/2026', eDate: '01/01/2027' },
  { name: 'Alan', price: '1 467,60 EUR', cDate: '26/01/2026', sDate: '01/01/2026', eDate: '31/12/2026' },
  { name: 'L&D expenses (Payflip)', price: '21,78 EUR', cDate: '23/01/2026', sDate: '23/01/2026', eDate: '—' },
  { name: 'Mortgage', price: '844,90 EUR', cDate: '01/01/2026', sDate: '01/01/2026', eDate: '31/12/2026' },
  { name: 'Bike lease via Cowboy', price: '89,00 EUR', cDate: '01/04/2026', sDate: '01/04/2026', eDate: '01/04/2028' },
  { name: 'Company car (Tesla Model 3)', price: '620,00 EUR', cDate: '01/01/2026', sDate: '01/01/2026', eDate: '01/01/2029' },
  { name: 'Public transport pass', price: '285,40 EUR', cDate: '01/02/2026', sDate: '01/02/2026', eDate: '—' },
];
function genChoices(id) {
  const h = _eseed(id, 'cho');
  const items = _CPOOL.filter((_, i) => (h >> i) & 1);
  const base = items.length >= 2 ? items : _CPOOL.slice(0, 2 + (h & 3));
  return base.map((c, i) => {
    const s = (h >> (i * 3 + 10)) & 7;
    const status = s === 0 ? 'pending' : s === 1 ? 'declined' : 'approved';
    return { ...c, status };
  });
}
const CHOICES_SEED = (() => {
  const hardcoded = [
    { id: 'tablet-coolblue-approved', empId: 'charlotte-pieters', name: 'Tablet via Coolblue', price: '369,00 EUR', cDate: '13/05/2026', sDate: '13/05/2026', eDate: '13/05/2028', status: 'approved', illustration: '../assets/benefit-tablet.png', productName: 'Apple iPad (2025) 11 Pouces 128 Go Wifi Argent', productUrl: 'https://www.coolblue.be/nl/product/960489', productNumber: '960489', orderId: '97190251', orderDate: '13/05/2026', depreciation: 24, transactions: [{ label: 'Home office budget', amount: '233,73 EUR', date: '13/05/2026' }, { label: 'End of year premium', amount: '180,55 EUR', date: '13/05/2026' }] },
  ];
  const generated = Object.entries(EMPLOYEES).flatMap(([empId]) =>
    genChoices(empId).map((c, i) => ({ ...c, empId, id: `${empId}-cho-${i}` }))
  );
  const all = [...hardcoded, ...generated];
  let pendingCount = 0;
  return all.map(c => {
    if (c.status === 'pending') {
      if (pendingCount < 6) { pendingCount++; return c; }
      return { ...c, status: 'approved' };
    }
    return c;
  });
})();

// ── Employee detail tab components ─────────────────────────────────────────
const CHOICES_STATUS_OPTS = [['all', 'All statuses'], ['approved', 'Approved'], ['pending', 'Pending'], ['declined', 'Declined']];

function ChoicesTab({ empId }) {
  const items = genChoices(empId);
  const [statusFilter, setStatusFilter] = useState('all');
  const filtered = statusFilter === 'all' ? items : items.filter(i => i.status?.toLowerCase() === statusFilter);
  const th = { textAlign: 'left', padding: '9px 16px', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 11, color: P.inkFaint, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' };
  const td = { padding: '14px 16px', color: P.ink, verticalAlign: 'middle' };
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: P.ink }}>Choices</span>
        <button style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 8, border: 'none', background: P.action, color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12 }}>
          <Icon name="Plus" size={12} color="#fff" />Add
        </button>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <FilterDropdown label="All statuses" active={statusFilter} opts={CHOICES_STATUS_OPTS} onSelect={setStatusFilter} minWidth={150} />
      </div>
      <div style={{ background: P.white, border: `1px solid ${P.border}`, borderRadius: 12, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '32px 20px', textAlign: 'center', color: P.inkFaint, fontFamily: 'var(--font-body)', fontSize: 13 }}>No choices recorded yet</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-body)', fontSize: 13 }}>
            <thead><tr style={{ borderBottom: `1px solid ${P.border}` }}>
              <th style={{ ...th, paddingLeft: 20 }}>Name</th>
              <th style={th}>Price</th>
              <th style={th}>Choice date</th>
              <th style={th}>Start date</th>
              <th style={th}>End date</th>
              <th style={th}>Status</th>
              <th style={th}></th>
            </tr></thead>
            <tbody>{filtered.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: idx < filtered.length - 1 ? `1px solid ${P.border}` : 'none' }}>
                <td style={{ ...td, paddingLeft: 20, maxWidth: 220 }}><div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div></td>
                <td style={{ ...td, whiteSpace: 'nowrap' }}>{item.price}</td>
                <td style={{ ...td, color: P.inkSoft }}>{item.cDate}</td>
                <td style={{ ...td, color: P.inkSoft }}>{item.sDate}</td>
                <td style={{ ...td, color: P.inkSoft }}>{item.eDate}</td>
                <td style={td}><StatusPill status={item.status || 'approved'} /></td>
                <td style={{ padding: '8px 16px', textAlign: 'right' }}><button style={{ border: `1px solid ${P.border}`, background: 'transparent', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontFamily: 'var(--font-display)', fontWeight: 600, color: P.inkSoft, cursor: 'pointer' }}>Details</button></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}
function BudgetsTab({ empId }) {
  const items = genBudgets(empId);
  const th = { textAlign: 'left', padding: '9px 16px', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 11, color: P.inkFaint, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' };
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: P.ink }}>Budgets</span>
        <button style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 8, border: 'none', background: P.action, color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12 }}>
          <Icon name="Plus" size={12} color="#fff" />Add budget
        </button>
      </div>
      <div style={{ background: P.white, border: `1px solid ${P.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-body)', fontSize: 13 }}>
          <thead><tr style={{ borderBottom: `1px solid ${P.border}` }}>
            <th style={{ ...th, paddingLeft: 20 }}>Name budget</th>
            <th style={th}>Budget balance</th>
            <th style={th}>Last top-up amount</th>
            <th style={th}>Top-up date</th>
            <th style={th}>Cash-out date</th>
            <th style={th}></th>
          </tr></thead>
          <tbody>{items.map((item, idx) => (
            <tr key={idx} style={{ borderBottom: idx < items.length - 1 ? `1px solid ${P.border}` : 'none' }}>
              <td style={{ padding: '14px 20px', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: P.ink }}>{item.name}</td>
              <td style={{ padding: '14px 16px', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: P.ink }}>{item.balance}</td>
              <td style={{ padding: '14px 16px', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: P.ink }}>{item.topUp}</td>
              <td style={{ padding: '14px 16px', color: P.inkSoft, fontSize: 13 }}>{item.topUpDate}</td>
              <td style={{ padding: '14px 16px', color: P.inkSoft, fontSize: 13 }}>{item.cashOut}</td>
              <td style={{ padding: '8px 16px', textAlign: 'right' }}>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button style={{ border: `1px solid ${P.border}`, background: 'transparent', borderRadius: 6, padding: '5px 10px', fontSize: 11, fontFamily: 'var(--font-display)', fontWeight: 600, color: P.inkSoft, cursor: 'pointer', whiteSpace: 'nowrap' }}>See transactions</button>
                  <button style={{ border: 'none', background: P.action, borderRadius: 6, padding: '5px 12px', fontSize: 11, fontFamily: 'var(--font-display)', fontWeight: 600, color: '#fff', cursor: 'pointer' }}>Edit</button>
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}
function SalaryTab({ empId }) {
  const { history, components } = genSalary(empId);
  const th = { textAlign: 'left', padding: '9px 16px', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 11, color: P.inkFaint, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' };
  const SalSecHead = ({ title, onAdd }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: P.ink }}>{title}</span>
      <button onClick={onAdd} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 8, border: 'none', background: P.action, color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12 }}>
        <Icon name="Plus" size={12} color="#fff" />Add
      </button>
    </div>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
      <div>
        <SalSecHead title="Salary" onAdd={() => {}} />
        <div style={{ background: P.white, border: `1px solid ${P.border}`, borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-body)', fontSize: 13 }}>
            <thead><tr style={{ borderBottom: `1px solid ${P.border}` }}>
              <th style={{ ...th, paddingLeft: 20 }}>Gross amount</th>
              <th style={th}>Working regime</th>
              <th style={th}>Start date</th>
              <th style={th}>End date</th>
              <th style={th}>Status</th>
              <th style={th}></th>
            </tr></thead>
            <tbody>{history.map((row, idx) => (
              <tr key={idx} style={{ borderBottom: idx < history.length - 1 ? `1px solid ${P.border}` : 'none' }}>
                <td style={{ padding: '12px 20px' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: P.ink }}>{row.gross}</div>
                  <div style={{ fontSize: 11, color: P.inkFaint, marginTop: 2 }}>per month</div>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ color: P.ink }}>{row.regime}</div>
                  <div style={{ fontSize: 11, color: P.inkFaint, marginTop: 2 }}>per week</div>
                </td>
                <td style={{ padding: '12px 16px', color: P.inkSoft }}>{row.start}</td>
                <td style={{ padding: '12px 16px', color: P.inkSoft }}>{row.end}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ background: row.active ? '#dcfce7' : P.bg, color: row.active ? '#16a34a' : P.inkSoft, borderRadius: 6, padding: '3px 8px', fontSize: 11, fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                    {row.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={{ padding: '8px 16px', textAlign: 'right' }}><button style={{ border: `1px solid ${P.border}`, background: 'transparent', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontFamily: 'var(--font-display)', fontWeight: 600, color: P.inkSoft, cursor: 'pointer' }}>Details</button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
      <div>
        <SalSecHead title="Salary components" onAdd={() => {}} />
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkSoft, margin: '-8px 0 14px' }}>
          Components are benefits offered as part of the employee's remuneration where a benefit in kind is charged for. <AppLink onClick={e => e.preventDefault()}>Learn more</AppLink>
        </p>
        <div style={{ background: P.white, border: `1px solid ${P.border}`, borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-body)', fontSize: 13 }}>
            <thead><tr style={{ borderBottom: `1px solid ${P.border}` }}>
              <th style={{ ...th, paddingLeft: 20 }}>Type</th>
              <th style={th}>Start date</th>
              <th style={th}>End date</th>
              <th style={th}></th>
            </tr></thead>
            <tbody>{components.map((c, idx) => (
              <tr key={idx} style={{ borderBottom: idx < components.length - 1 ? `1px solid ${P.border}` : 'none' }}>
                <td style={{ padding: '12px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: P.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon name={c.icon} size={14} color={P.inkSoft} />
                    </div>
                    <span style={{ color: P.ink, fontFamily: 'var(--font-display)', fontWeight: 600 }}>{c.type}</span>
                  </div>
                </td>
                <td style={{ padding: '12px 16px', color: P.inkSoft }}>{c.start}</td>
                <td style={{ padding: '12px 16px', color: P.inkSoft }}>{c.end}</td>
                <td style={{ padding: '8px 16px', textAlign: 'right' }}><button style={{ border: `1px solid ${P.border}`, background: 'transparent', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontFamily: 'var(--font-display)', fontWeight: 600, color: P.inkSoft, cursor: 'pointer' }}>Details</button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
function DetailsTab({ emp, empId }) {
  const ex = EMP_EXTRA[empId] || {};
  const parts = emp.name.split(' ');
  const first = parts[0], last = parts.slice(1).join(' ');
  const fieldStyle = { background: P.white, border: `1px solid ${P.border}`, borderRadius: 8, padding: '10px 14px', fontFamily: 'var(--font-body)', fontSize: 13, color: P.ink };
  const labelStyle = { display: 'block', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: P.ink, marginBottom: 6 };
  return (
    <div style={{ maxWidth: 740 }}>
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: P.ink, margin: '0 0 20px' }}>Basic info</h3>
        <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
          <div style={{ flex: 1 }}><label style={labelStyle}>First name *</label><div style={fieldStyle}>{first}</div></div>
          <div style={{ flex: 1 }}><label style={labelStyle}>Last name *</label><div style={fieldStyle}>{last}</div></div>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: 1 }}><label style={labelStyle}>Email *</label><div style={fieldStyle}>{emp.email}</div></div>
          <div style={{ flex: 1 }}><label style={labelStyle}>Language *</label><div style={fieldStyle}>{ex.lang || 'Dutch'}</div></div>
        </div>
      </div>
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: P.ink, margin: '0 0 20px' }}>Employment data</h3>
        <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
          <div style={{ flex: 1 }}><label style={labelStyle}>Entity</label><div style={fieldStyle}>{emp.entity}</div></div>
          <div style={{ flex: 1 }}><label style={labelStyle}>Start date at company *</label><div style={fieldStyle}>{ex.hireDate || '—'}</div></div>
        </div>
        <div style={{ maxWidth: 'calc(50% - 8px)' }}>
          <label style={labelStyle}>Employee Payroll ID *</label><div style={fieldStyle}>{ex.payrollId || '—'}</div>
        </div>
      </div>
      <div>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: P.ink, margin: '0 0 20px' }}>Admin settings</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 18, height: 18, borderRadius: 4, background: ex.admin ? P.accent : P.white, border: ex.admin ? 'none' : `1.5px solid ${P.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {ex.admin && <Icon name="Check" size={12} color="#fff" strokeWidth={3} />}
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: P.ink }}>Admin</span>
        </div>
      </div>
    </div>
  );
}

const generatedRequests = [
  { id: 'gen-1', employee: 'david', type: 'Time off', startDate: 'Mon 1 Jun', endDate: 'Thu 11 Jun', days: 9, status: 'approved', submittedAt: '12 May', note: 'Summer holiday', _selectedDates: ['2026-06-01','2026-06-02','2026-06-03','2026-06-04','2026-06-05','2026-06-08','2026-06-09','2026-06-10','2026-06-11'] },
  { id: 'gen-2', employee: 'emma-martens', type: 'Time off', startDate: 'Mon 13 Jul', endDate: 'Fri 17 Jul', days: 5, status: 'pending', submittedAt: '20 Jun', note: '' },
  { id: 'gen-3', employee: 'mathias-de-smedt', type: 'Time off', startDate: 'Wed 8 Jul', endDate: 'Wed 8 Jul', days: 1, status: 'approved', submittedAt: '10 Jun', note: '', _selectedDates: ['2026-07-08'] },
  { id: 'gen-4', employee: 'stijn-laurent', type: 'Special leave', startDate: 'Fri 3 Jul', endDate: 'Fri 3 Jul', days: 1, status: 'approved', submittedAt: '25 Jun', note: 'Wedding', _selectedDates: ['2026-07-03'] },
  { id: 'gen-5', employee: 'laura-mertens', type: 'Sick leave', startDate: 'Tue 7 Jul', endDate: 'Tue 7 Jul', days: 1, status: 'approved', submittedAt: '7 Jul', note: '', _selectedDates: ['2026-07-07'] },
  { id: 'gen-11', employee: 'laura-mertens', type: 'Sick leave', startDate: 'Tue 14 Jul', endDate: 'Tue 14 Jul', days: 1, status: 'approved', submittedAt: '14 Jul', note: '', _selectedDates: ['2026-07-14'] },
  { id: 'gen-6c', employee: 'bram-goossens', type: 'Special leave', startDate: 'Thu 19 Mar', endDate: 'Thu 19 Mar', days: 1, status: 'approved', submittedAt: '10 Mar', note: 'Wedding', document: 'wedding_certificate.pdf', _selectedDates: ['2026-03-19'] },
  { id: 'gen-6d', employee: 'bram-goossens', type: 'Sick leave', startDate: 'Mon 5 May', endDate: 'Tue 6 May', days: 2, status: 'approved', submittedAt: '5 May', document: 'medical_certificate.pdf', note: '', _selectedDates: ['2026-05-05','2026-05-06'] },
  { id: 'gen-6b', employee: 'bram-goossens', type: 'Time off', startDate: 'Fri 19 Jun', endDate: 'Fri 19 Jun', days: 0.5, halfDay: 'PM', status: 'approved', submittedAt: '18 Jun', note: '', _selectedDates: ['2026-06-19'], _halfDay: { '2026-06-19': 'pm' } },
  { id: 'gen-6', employee: 'bram-goossens', type: 'ADV / RTT', startDate: 'Mon 22 Jun', endDate: 'Tue 23 Jun', days: 2, status: 'approved', submittedAt: '15 Jun', note: '', _selectedDates: ['2026-06-22','2026-06-23'] },
  { id: 'gen-7', employee: 'jana-goossens', type: 'Time off', startDate: 'Thu 25 Jun', endDate: 'Fri 27 Jun', days: 3, status: 'approved', submittedAt: '10 Jun', note: 'Long weekend', _selectedDates: ['2026-06-25','2026-06-26','2026-06-27'] },
  { id: 'gen-8', employee: 'pieter-mertens', type: 'Extra-legal leave', startDate: 'Wed 1 Jul', endDate: 'Wed 1 Jul', days: 1, status: 'approved', submittedAt: '28 Jun', note: '', _selectedDates: ['2026-07-01'] },
  { id: 'gen-12', employee: 'pieter-mertens', type: 'Time off', startDate: 'Mon 13 Jul', endDate: 'Wed 15 Jul', days: 3, status: 'approved', submittedAt: '1 Jul', note: '', _selectedDates: ['2026-07-13','2026-07-14','2026-07-15'] },
  { id: 'gen-13', employee: 'sarah-de-smedt', type: 'Time off', startDate: 'Tue 14 Jul', endDate: 'Thu 16 Jul', days: 3, status: 'approved', submittedAt: '3 Jul', note: '', _selectedDates: ['2026-07-14','2026-07-15','2026-07-16'] },
  { id: 'gen-14', employee: 'jana-goossens', type: 'Time off', startDate: 'Thu 16 Jul', endDate: 'Fri 17 Jul', days: 2, status: 'approved', submittedAt: '5 Jul', note: '', _selectedDates: ['2026-07-16','2026-07-17'] },
  { id: 'gen-15', employee: 'julie-goossens', type: 'Time off', startDate: 'Wed 22 Jul', endDate: 'Fri 24 Jul', days: 3, status: 'approved', submittedAt: '9 Jul', note: '', _selectedDates: ['2026-07-22','2026-07-23','2026-07-24'] },
  { id: 'gen-9', employee: 'thomas-janssens', type: 'Time off', startDate: 'Mon 20 Jul', endDate: 'Fri 24 Jul', days: 5, status: 'pending', submittedAt: '8 Jul', note: 'Family trip', _selectedDates: ['2026-07-20','2026-07-21','2026-07-22','2026-07-23','2026-07-24'] },
  { id: 'gen-10', employee: 'bram-goossens', type: 'Time off', startDate: 'Thu 23 Jul', endDate: 'Fri 24 Jul', days: 2, status: 'pending', submittedAt: '10 Jul', note: '', _selectedDates: ['2026-07-23','2026-07-24'] },
  { id: 'gen-16', employee: 'mathias-de-smedt', type: 'Time off', startDate: 'Mon 4 Aug', endDate: 'Wed 6 Aug', days: 3, status: 'pending', submittedAt: '14 Jul', note: '', _selectedDates: ['2026-08-04','2026-08-05','2026-08-06'] },
  // Pending: sick leave with medical certificate
  { id: 'req-sick-tv', employee: 'thomas-vandenberghe', type: 'Sick leave', startDate: 'Mon 28 Jul', endDate: 'Wed 30 Jul', days: 3, status: 'pending', submittedAt: '17 Jul', note: '', document: 'medical_certificate.pdf', _selectedDates: ['2026-07-28','2026-07-29','2026-07-30'] },
  // Pending: special leave wedding with many colleagues off
  { id: 'req-wedding-lm', employee: 'laura-mertens', type: 'Special leave', startDate: 'Thu 30 Jul', endDate: 'Fri 1 Aug', days: 2, status: 'pending', submittedAt: '17 Jul', note: "Sister's wedding", document: 'wedding_invitation.pdf', _selectedDates: ['2026-07-30','2026-07-31'] },
  // Approved: Design colleagues off same week as TV sick leave (create conflict)
  { id: 'gen-17', employee: 'emma-martens', type: 'Time off', startDate: 'Mon 28 Jul', endDate: 'Wed 30 Jul', days: 3, status: 'approved', submittedAt: '12 Jul', note: '', _selectedDates: ['2026-07-28','2026-07-29','2026-07-30'] },
  // Approved: Engineering colleagues off same days as Laura's wedding (create overlap)
  { id: 'gen-18', employee: 'david', type: 'Time off', startDate: 'Mon 28 Jul', endDate: 'Fri 1 Aug', days: 5, status: 'approved', submittedAt: '5 Jul', note: 'Summer break', _selectedDates: ['2026-07-27','2026-07-28','2026-07-29','2026-07-30','2026-07-31'] },
  { id: 'gen-19', employee: 'stijn-laurent', type: 'Time off', startDate: 'Mon 27 Jul', endDate: 'Fri 1 Aug', days: 6, status: 'approved', submittedAt: '8 Jul', note: '', _selectedDates: ['2026-07-27','2026-07-28','2026-07-29','2026-07-30','2026-07-31'] },
  { id: 'gen-20', employee: 'jana-goossens', type: 'ADV / RTT', startDate: 'Thu 30 Jul', endDate: 'Fri 31 Jul', days: 2, status: 'approved', submittedAt: '11 Jul', note: '', _selectedDates: ['2026-07-30','2026-07-31'] },
];

const EXPENSE_CATEGORIES_SEED = ['Taxi', 'Restaurants', 'Travel'];

const EXPENSES_SEED = [
  { id: 'exp-1', employee: 'thomas-janssens', category: 'Travel', amount: 124.50, currency: 'EUR', submittedAt: '14 Jul', description: 'Train Brussels–Ghent client visit', receipt: 'sncb_ticket.pdf', status: 'pending' },
  { id: 'exp-2', employee: 'sarah-de-smedt', category: 'Restaurants', amount: 87.00, currency: 'EUR', submittedAt: '10 Jul', description: 'Team lunch — 4 people', receipt: '', status: 'pending' },
  { id: 'exp-3', employee: 'bram-goossens', category: 'Taxi', amount: 34.00, currency: 'EUR', submittedAt: '7 Jul', description: 'Taxi to Brussels airport — client meeting', receipt: 'taxi_receipt.pdf', status: 'pending' },
  { id: 'exp-4', employee: 'emma-martens', category: 'Restaurants', amount: 15.00, currency: 'EUR', submittedAt: '1 Jul', description: 'Working lunch with design team', receipt: '', status: 'approved' },
  { id: 'exp-5', employee: 'david', category: 'Travel', amount: 212.00, currency: 'EUR', submittedAt: '25 Jun', description: 'Brussels–London for product workshop', receipt: 'eurostar.pdf', status: 'approved' },
  { id: 'exp-6', employee: 'pieter-mertens', category: 'Restaurants', amount: 43.50, currency: 'EUR', submittedAt: '22 Jun', description: 'Client dinner', receipt: '', status: 'rejected', rejectReason: 'No client approval on record for this dinner.' },
  { id: 'exp-7', employee: 'jana-goossens', category: 'Taxi', amount: 19.00, currency: 'EUR', submittedAt: '18 Jun', description: 'Taxi home after late client event', receipt: 'taxi_receipt.pdf', status: 'approved' },
  { id: 'exp-8', employee: 'stijn-laurent', category: 'Travel', amount: 31.00, currency: 'EUR', submittedAt: '15 Jun', description: 'Monthly transit pass — June', receipt: '', status: 'pending' },
  { id: 'exp-9', employee: 'laura-mertens', category: 'Restaurants', amount: 27.50, currency: 'EUR', submittedAt: '10 Jun', description: 'Lunch with new hire onboarding', receipt: '', status: 'approved' },
  { id: 'exp-10', employee: 'mathias-de-smedt', category: 'Taxi', amount: 22.00, currency: 'EUR', submittedAt: '3 Jun', description: 'Taxi to Ghent office — missed last train', receipt: '', status: 'pending' },
];

// ── localStorage bridge ────────────────────────────────────────────────────
const LS_KEY = 'payflip_hr_requests';
function readLS() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
}
function writeLS(reqs) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(reqs.filter(r => r.employee === 'david' && r.id.startsWith('req-')))); } catch {}
}
function mergeRequests(seed, live) {
  const merged = [...seed];
  for (const r of live) {
    if (!merged.find(m => m.id === r.id)) merged.unshift(r);
  }
  return merged;
}

// ── Date helpers ───────────────────────────────────────────────────────────
const _MONTHS = { Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11 };
function parseDisplayDate(str) {
  const m = str?.match(/(\d+)\s+(\w+)/);
  if (!m || !_MONTHS.hasOwnProperty(m[2])) return null;
  return new Date(2026, _MONTHS[m[2]], +m[1]);
}
function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function weekStart(d) {
  const day = d.getDay() || 7;
  const out = new Date(d); out.setDate(d.getDate() - day + 1); out.setHours(0,0,0,0); return out;
}
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function startOfMonth(d) {
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  return weekStart(first);
}
function daysInMonthView(d) {
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const last  = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const ws = weekStart(first);
  const lastDay = last.getDay() || 7;
  const we = addDays(last, 7 - lastDay);
  const count = Math.round((we - ws) / 86400000);
  return count;
}

const DAY_LABELS = ['MO','TU','WE','TH','FR','SA','SU'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// ── Avatar ─────────────────────────────────────────────────────────────────
function Avatar({ employeeId, size = 28, bg, style: extraStyle }) {
  const emp = EMPLOYEES[employeeId] || { initials: '?', color: '#e5e7eb' };
  if (emp.photo) {
    return <img src={avatarUrl(emp.name, emp.gender)} alt={emp.initials} style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, objectFit: 'cover', ...extraStyle }} />;
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: bg || '#e5e7eb',
      flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-display)', fontWeight: 700,
      fontSize: size * 0.34, color: P.ink, letterSpacing: '0.01em',
      ...extraStyle,
    }}>{emp.initials}</div>
  );
}

// ── Status dot ─────────────────────────────────────────────────────────────
function StatusDot({ status }) {
  const m = StatusMeta[status] || StatusMeta.pending;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: m.dot, flexShrink: 0 }} />
      <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.ink }}>{m.label}</span>
    </div>
  );
}

function StatusBadge({ status }) {
  const m = StatusMeta[status] || StatusMeta.pending;
  return (
    <span style={{ background: m.bg, color: m.color, borderRadius: 6, padding: '3px 8px', fontSize: 11, fontFamily: 'var(--font-display)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <Icon name={m.icon} size={10} color={m.color} strokeWidth={2.5} />
      {m.label}
    </span>
  );
}

function DotPill({ bg, color, children }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: bg, color, borderRadius: 20, padding: '2px 8px', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12 }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', flexShrink: 0 }} />
      {children}
    </span>
  );
}
function StatusPill({ status }) {
  const m = StatusMeta[status] || StatusMeta.pending;
  return <DotPill bg={m.bg} color={m.color}>{m.label}</DotPill>;
}

// ── Sidebar ────────────────────────────────────────────────────────────────
function SidebarItem({ icon, label, isActive, onClick, badgeDot, chevron, chevronOpen, disabled }) {
  return (
    <button onClick={disabled ? undefined : onClick} style={{
      display: 'flex', alignItems: 'center', gap: 9,
      padding: '7px 20px', borderRadius: 0,
      border: 'none', background: isActive ? P.bg : 'transparent',
      cursor: disabled ? 'default' : 'pointer', width: '100%', textAlign: 'left',
      transition: `background 120ms ${EASE_OUT}`,
    }}>
      {icon && <Icon name={icon} size={14} color={disabled ? P.inkFaint : isActive ? P.ink : P.inkSoft} strokeWidth={1.75} />}
      <span style={{ fontFamily: 'var(--font-display)', fontWeight: isActive ? 700 : 500, fontSize: 13, color: disabled ? P.inkFaint : isActive ? P.ink : P.inkSoft, flex: 1 }}>
        {label}
      </span>
      {badgeDot && <span style={{ minWidth: 17, height: 17, borderRadius: 9, padding: '0 4px', background: P.border, color: P.inkSoft, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{typeof badgeDot === 'number' ? badgeDot : '!'}</span>}
      {chevron && (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={P.ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{
          flexShrink: 0, transform: chevronOpen ? 'scaleY(-1)' : 'scaleY(1)', transition: `transform 200ms ${EASE_OUT}`,
        }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      )}
    </button>
  );
}

// Grid-rows accordion — padding lives on the inner wrapper, never on the
// 0fr/1fr track itself, or the panel never fully collapses.
function SidebarAccordion({ open, children }) {
  return (
    <div style={{
      display: 'grid', gridTemplateRows: open ? '1fr' : '0fr',
      transition: `grid-template-rows 250ms ${EASE_OUT}`, overflow: 'hidden',
    }}>
      <div style={{ minHeight: 0 }}>{children}</div>
    </div>
  );
}

function SidebarSub({ items, active, onNav }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginBottom: 4 }}>
      {items.map(({ id, label, badge }) => {
        const isActive = active === id;
        return (
          <button key={id} onClick={() => onNav(id)} style={{
            display: 'flex', alignItems: 'center', gap: 0,
            padding: '5px 20px 5px 43px', borderRadius: 0,
            border: 'none', background: 'transparent', position: 'relative',
            cursor: 'pointer', width: '100%', textAlign: 'left',
          }}>
            <div style={{ position: 'absolute', left: 26, top: 0, bottom: 0, width: 1, background: isActive ? '#C42BFC' : P.border }} />
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: isActive ? 600 : 400, fontSize: 13, color: isActive ? '#C42BFC' : P.inkSoft, flex: 1 }}>{label}</span>
            {badge > 0 && (
              <span style={{ minWidth: 17, height: 17, borderRadius: 9, padding: '0 4px', background: P.border, color: P.inkSoft, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{badge}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function SidebarSectionHeader({ label }) {
  return (
    <div style={{
      padding: '16px 20px 4px',
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 11,
      color: P.inkFaint,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    }}>
      {label}
    </div>
  );
}

function AdminProfileFooter() {
  return (
    <div style={{ borderTop: `1px solid ${P.border}`, padding: '10px 20px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%', background: '#ddd6fe', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 10, color: P.ink,
      }}>BC</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 13, color: P.ink }}>Bruno Coen</span>
        <button style={{
          border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', textAlign: 'left',
          fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 11, color: P.inkFaint,
          transition: `color 120ms ${EASE_OUT}`,
        }}
        onMouseEnter={e => { e.currentTarget.style.color = P.inkSoft; }}
        onMouseLeave={e => { e.currentTarget.style.color = P.inkFaint; }}>
          Log out
        </button>
      </div>
    </div>
  );
}

function AppModeSidebar({ active, onNav, pendingCount, onEnterSettings }) {
  const [timeoffOpen, setTimeoffOpen] = useState(active === 'requests' || active === 'team-absences');
  const [payrollOpen, setPayrollOpen] = useState(active === 'payroll-overview' || active === 'payroll-reports');

  return (
    <React.Fragment>
      <button onClick={() => {}} style={{
        padding: '10px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        width: '100%', border: 'none', borderBottom: `1px solid ${P.border}`,
        background: 'transparent', cursor: 'pointer', textAlign: 'left',
      }}>
        <div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: P.inkFaint }}>Entity view for</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 14, color: P.ink, letterSpacing: '-0.01em' }}>Payflip</div>
        </div>
        <Icon name="chevrons-up-down" size={14} color={P.inkFaint} />
      </button>

      <nav style={{ flex: 1, padding: '10px 0', display: 'flex', flexDirection: 'column', gap: 3, overflow: 'auto' }}>
        <SidebarItem icon="house" label="Home" isActive={active === 'dashboard'} onClick={() => onNav('dashboard')} />
        <SidebarItem icon="users" label="People" isActive={active === 'employees' || active?.startsWith('employee-detail')} onClick={() => onNav('employees')} />
        <SidebarItem icon="list-checks" label="Choices" isActive={active === 'choices'} onClick={() => onNav('choices')} badgeDot={pendingCount?.choices || null} />

        <SidebarItem icon="calendar-days" label="Time off" onClick={() => setTimeoffOpen(o => !o)} chevron chevronOpen={timeoffOpen} isActive={active === 'requests' || active === 'team-absences'} badgeDot={!timeoffOpen && (pendingCount?.requests ?? pendingCount) > 0 ? (pendingCount?.requests ?? pendingCount) : null} />
        <SidebarAccordion open={timeoffOpen}>
          <SidebarSub active={active} onNav={onNav} items={[
            { id: 'requests', label: 'Requests', badge: pendingCount?.requests ?? pendingCount },
            { id: 'team-absences', label: 'Team calendar' },
          ]} />
        </SidebarAccordion>

        <SidebarItem icon="wallet" label="Payroll" onClick={() => setPayrollOpen(o => !o)} chevron chevronOpen={payrollOpen} />
        <SidebarAccordion open={payrollOpen}>
          <SidebarSub active={active} onNav={onNav} items={[
            { id: 'payroll-overview', label: 'Overview' },
            { id: 'payroll-reports', label: 'Reports' },
          ]} />
        </SidebarAccordion>

        <SidebarItem icon="receipt" label="Expenses" isActive={active === 'expenses'} onClick={() => onNav('expenses')} badgeDot={pendingCount?.expenses || null} />

        <SidebarItem icon="settings" label="Settings" onClick={onEnterSettings} />
      </nav>
    </React.Fragment>
  );
}

const PERSONAL_IDS = ['settings-notifications', 'settings-account'];
const COMPANY_IDS  = ['settings-entities','settings-budgets','settings-benefits','settings-packages','settings-documents','settings-timeoff','settings-payroll','settings-expenses','settings-cardrules','settings-integrations','settings-team'];

function SettingsModeSidebar({ active, onNav, onBack }) {
  const [personalOpen, setPersonalOpen] = useState(() => PERSONAL_IDS.includes(active));
  const [companyOpen,  setCompanyOpen]  = useState(() => COMPANY_IDS.includes(active));

  return (
    <React.Fragment>
      <button onClick={onBack} style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '7px 20px', width: '100%', border: 'none',
        borderBottom: `1px solid ${P.border}`,
        background: 'transparent', cursor: 'pointer', textAlign: 'left',
        transition: `background 120ms ${EASE_OUT}`,
      }}>
        <Icon name="arrow-left" size={14} color={P.inkSoft} strokeWidth={1.75} />
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 13, color: P.inkSoft, flex: 1 }}>Back to app</span>
      </button>

      <nav style={{ flex: 1, padding: '10px 0', display: 'flex', flexDirection: 'column', gap: 3, overflow: 'auto' }}>
        <SidebarItem icon="user" label="Personal" onClick={() => setPersonalOpen(o => !o)} chevron chevronOpen={personalOpen} isActive={PERSONAL_IDS.includes(active)} />
        <SidebarAccordion open={personalOpen}>
          <SidebarSub active={active} onNav={onNav} items={[
            { id: 'settings-notifications', label: 'Notifications' },
            { id: 'settings-account',       label: 'Account settings' },
          ]} />
        </SidebarAccordion>

        <SidebarItem icon="building-2" label="Company" onClick={() => setCompanyOpen(o => !o)} chevron chevronOpen={companyOpen} isActive={COMPANY_IDS.includes(active)} />
        <SidebarAccordion open={companyOpen}>
          <SidebarSub active={active} onNav={onNav} items={[
            { id: 'settings-entities',     label: 'Entities' },
            { id: 'settings-budgets',      label: 'Budgets' },
            { id: 'settings-benefits',     label: 'Benefits' },
            { id: 'settings-packages',     label: 'Packages' },
            { id: 'settings-documents',    label: 'Documents' },
            { id: 'settings-timeoff',      label: 'Time off' },
            { id: 'settings-payroll',      label: 'Payroll' },
            { id: 'settings-expenses',     label: 'Expenses' },
            { id: 'settings-cardrules',    label: 'Card rules' },
            { id: 'settings-integrations', label: 'Integrations' },
            { id: 'settings-team',         label: 'Team & access' },
            { id: 'settings-billing',      label: 'Billing' },
          ]} />
        </SidebarAccordion>
      </nav>
    </React.Fragment>
  );
}

const PANEL_DUR = 280;
function Sidebar({ active, onNav, pendingCount, sidebarMode, onSetSidebarMode }) {
  const inSettings = sidebarMode === 'settings';
  const panelStyle = (offset) => ({
    position: 'absolute', inset: 0,
    display: 'flex', flexDirection: 'column',
    transform: `translateX(${offset})`,
    transition: `transform ${PANEL_DUR}ms ${EASE_DRAWER}`,
  });

  return (
    <div style={{
      width: 216, flexShrink: 0, background: P.white,
      borderRight: `1px solid ${P.border}`,
      display: 'flex', flexDirection: 'column',
      height: '100vh', position: 'sticky', top: 0,
    }}>
      <div style={{ padding: '16px 20px 14px', borderBottom: `1px solid ${P.border}`, flexShrink: 0 }}>
        <svg width="90" height="22" viewBox="0 0 115 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M45.753 5.26971C48.8202 5.29294 51.0277 7.91867 51.0277 10.5909C51.0277 13.2631 48.8202 15.8888 45.753 15.912H41.8725V22H39.1074V5.26971H45.753ZM45.7065 13.1236C47.1937 13.1236 48.2393 11.8921 48.2393 10.5909C48.2393 9.26639 47.1937 8.03485 45.7065 8.03485H41.8725V13.1236H45.7065ZM60.7159 10.01H63.481V22H60.7159V20.3502C59.8329 21.4656 58.6014 22.1394 57.0677 22.1394C54.1864 22.1394 51.8628 19.4207 51.8628 16.005C51.8628 12.5892 54.1864 9.87054 57.0677 9.87054C58.6014 9.87054 59.8794 10.5909 60.7159 11.683V10.01ZM57.6951 19.3975C59.4146 19.3975 60.7159 17.8871 60.7159 16.005C60.7159 14.1228 59.4146 12.6124 57.6951 12.6124C55.9524 12.6124 54.6511 14.1228 54.6511 16.005C54.6511 17.8871 55.9524 19.3975 57.6951 19.3975ZM77.1976 10.01V21.7444C77.1976 25.2299 74.7346 27.7162 71.4815 27.7162C67.8798 27.7162 65.9512 25.2066 65.8118 22.9062H68.6931C68.879 24.2075 69.8781 25.1369 71.5279 25.1369C73.3404 25.1369 74.4325 23.7195 74.4325 21.8141V20.4432C73.6192 21.4191 72.318 22.1394 70.9238 22.1394C68.1819 22.1394 66.6947 19.9784 66.6947 17.2365V10.01H69.4599V16.8183C69.4599 18.2357 70.552 19.3975 71.9462 19.3975C73.3404 19.3975 74.4325 18.2124 74.4325 16.8183V10.01H77.1976ZM87.1382 10.01V12.4266H84.1639V22H81.3987V12.4266H79.4701V10.01H81.3987V9.12697C81.3987 6.75684 82.9091 5.13029 85.1631 5.13029C86.046 5.13029 86.6037 5.26971 86.9755 5.36265V7.8722C86.7664 7.80249 86.2552 7.6863 85.7672 7.6863C84.8842 7.6863 84.1639 8.01162 84.1639 9.0805V10.01H87.1382ZM92.108 5.26971V22H89.3429V5.26971H92.108ZM96.8158 8.49958C95.7702 8.49958 94.9104 7.66307 94.9104 6.59419C94.9104 5.52531 95.7702 4.66556 96.8158 4.66556C97.9312 4.66556 98.7909 5.52531 98.7909 6.59419C98.7909 7.66307 97.8847 8.49958 96.8158 8.49958ZM98.1868 22H95.4216V10.01H98.1868V22ZM101.595 26.7402V10.01H104.361V11.7295C105.197 10.4282 106.452 9.87054 107.985 9.87054C110.797 9.87054 113.214 12.4498 113.214 16.005C113.214 19.5602 110.797 22.1394 107.985 22.1394C106.452 22.1394 105.127 21.3494 104.361 20.2573V26.7402H101.595ZM107.358 12.5892C105.592 12.5892 104.361 14.1228 104.361 16.005C104.361 17.8871 105.592 19.3975 107.358 19.3975C109.124 19.3975 110.449 17.8871 110.449 16.005C110.449 14.1228 109.124 12.5892 107.358 12.5892Z" fill={P.ink}/>
          <path d="M4.33203 5.57666C6.05531 5.57671 7.54249 7.51885 8.24023 10.3306C8.49527 9.9639 8.77641 9.60597 9.08301 9.26025C12.4138 5.50467 17.5161 4.59001 20.4785 7.21729C21.4856 8.11046 22.1146 9.29844 22.377 10.6245C24.205 7.2415 26.4713 5.13629 27.8652 5.72314C28.6853 6.06841 29.0487 7.28097 28.9775 8.96826C29.5959 6.87093 30.4348 5.53748 31.2529 5.60596C32.5914 5.71859 33.3628 9.54023 32.9756 14.1411C32.5884 18.7414 31.1899 22.3791 29.8516 22.2671C28.5131 22.1545 27.7418 18.3338 28.1289 13.7329C28.1475 13.5121 28.1702 13.2937 28.1934 13.0776C27.9732 13.7849 27.7085 14.514 27.3984 15.2505C25.4779 19.8119 22.573 22.9418 20.9102 22.2417C20.055 21.8815 19.6963 20.5784 19.8096 18.7769C16.4787 22.5311 11.378 23.4448 8.41602 20.8179C8.04583 20.4895 7.72679 20.1213 7.45801 19.7212C6.66956 21.3081 5.56123 22.2963 4.33203 22.2964C1.93956 22.2964 7.5582e-05 18.554 0 13.937C0 9.31987 1.93951 5.57666 4.33203 5.57666Z" fill={P.ink}/>
        </svg>
      </div>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <div style={panelStyle(inSettings ? '-100%' : '0%')}>
          <AppModeSidebar
            active={active}
            onNav={onNav}
            pendingCount={pendingCount}
            onEnterSettings={() => { onSetSidebarMode('settings'); onNav('settings-notifications'); }}
          />
        </div>
        <div style={panelStyle(inSettings ? '0%' : '100%')}>
          <SettingsModeSidebar
            active={active}
            onNav={onNav}
            onBack={() => { onSetSidebarMode('app'); onNav('dashboard'); }}
          />
        </div>
      </div>
      <AdminProfileFooter />
    </div>
  );
}

// ── Action menu (···) ──────────────────────────────────────────────────────
function ActionMenu({ req, onApprove, onDecline, onViewDetails, onEdit, onCancel, onViewInCalendar }) {
  const [open, setOpen] = useState(false);
  const { rendered: menuRendered, visible: menuVisible } = usePopoverTransition(open);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const items = [
    req?.status === 'pending' && onApprove && { icon: 'CheckCircle', label: 'Approve', fn: onApprove, color: '#166534' },
    req?.status === 'pending' && onDecline && { icon: 'XCircle', label: 'Decline', fn: onDecline, color: '#b91c1c' },
    onViewDetails && { icon: 'Eye', label: 'View details', fn: onViewDetails, color: P.ink },
    onViewInCalendar && { icon: 'Calendar', label: 'View in calendar', fn: () => onViewInCalendar(req), color: P.ink },
    onEdit && { icon: 'Pencil', label: 'Edit', fn: onEdit, color: P.ink },
    req?.document && { icon: 'Download', label: 'Download document', fn: () => {}, color: P.ink },
    req?.status === 'approved' && { icon: 'Trash2', label: 'Cancel absence', fn: onCancel, color: '#b91c1c' },
  ].filter(Boolean);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }} style={{
        width: 30, height: 30, borderRadius: 6,
        border: `1px solid ${open ? P.ink : P.border}`,
        background: open ? '#eff3ff' : 'transparent',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name="Ellipsis" size={14} color={open ? P.ink : P.inkSoft} />
      </button>
      {menuRendered && (
        <div style={{
          position: 'absolute', right: 0, top: 36, zIndex: 50,
          background: P.white, border: `1px solid ${P.border}`, borderRadius: 10,
          boxShadow: '0 4px 20px rgba(0,0,0,0.10)', width: 164, overflow: 'hidden',
          ...popoverStyle(menuVisible, 'top right'),
        }}>
          {items.map(({ icon, label, fn, color }) => (
            <button key={label} onClick={(e) => { e.stopPropagation(); setOpen(false); fn(); }} style={{
              display: 'flex', alignItems: 'center', gap: 9,
              width: '100%', padding: '9px 12px', border: 'none', background: 'transparent',
              cursor: 'pointer', textAlign: 'left',
            }}
            onMouseEnter={e => e.currentTarget.style.background = P.bg}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <Icon name={icon} size={14} color={color} strokeWidth={1.75} />
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: label === 'Cancel absence' ? '#b91c1c' : P.ink }}>{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Reason modal (decline / cancel) ───────────────────────────────────────
function ReasonModal({ title, description, confirmLabel, confirmColor = '#b91c1c', onConfirm, onClose }) {
  const [reason, setReason] = useState('');
  const { visible, close } = useModalTransition(onClose);
  return (
    <div onClick={close} style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(15,13,40,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      ...modalBackdropStyle(visible),
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: P.white, borderRadius: 14, width: 420,
        boxShadow: '0 8px 40px rgba(15,13,40,0.2)',
        display: 'flex', flexDirection: 'column',
        ...modalPanelStyle(visible),
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: `1px solid ${P.border}` }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: P.ink }}>{title}</span>
          <button onClick={close} style={{
            border: 'none', cursor: 'pointer',
            width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(60,60,67,0.1)',
            backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
          }}>
            <Icon name="X" size={14} color={P.ink} strokeWidth={2.5} />
          </button>
        </div>
        <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {description && (
            <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkSoft, lineHeight: 1.5 }}>{description}</p>
          )}
          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: P.inkSoft, marginBottom: 6 }}>
              Reason <span style={{ fontWeight: 400, color: P.inkFaint }}>(required)</span>
            </label>
            <textarea
              autoFocus
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
              placeholder="Explain why this absence is being declined or cancelled…"
              style={{
                width: '100%', padding: '8px 10px', borderRadius: 7,
                border: `1px solid ${reason.trim() ? P.border : P.border}`,
                fontFamily: 'var(--font-body)', fontSize: 13, color: P.ink,
                outline: 'none', resize: 'none', lineHeight: 1.5,
              }}
            />
          </div>
        </div>
        <div style={{ padding: '14px 22px', borderTop: `1px solid ${P.border}`, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={close} style={{
            padding: '8px 18px', borderRadius: 8, border: `1px solid ${P.border}`, background: 'transparent',
            color: P.ink, cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13,
          }}>Back</button>
          <button
            disabled={!reason.trim()}
            onClick={() => { onConfirm(reason.trim()); close(); }}
            style={{
              padding: '8px 20px', borderRadius: 8, border: 'none',
              background: reason.trim() ? confirmColor : P.border,
              color: reason.trim() ? '#fff' : P.inkFaint,
              cursor: reason.trim() ? 'pointer' : 'not-allowed',
              fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13,
            }}
          >{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ── Calendar right-side drawer ────────────────────────────────────────────
// A no-overlay panel anchored to the right edge. Two states (detail / edit)
// slide horizontally within a fixed header and scrollable content area.
function CalendarDrawer({ req, requests, onClose, onApprove, onDecline, onCancel, onSave, initialDeclineMode }) {
  const emp = EMPLOYEES[req.employee] || { name: req.employee, entitlement: 25, department: '' };
  const isPending = req.status === 'pending';
  const overlapping = getOverlapping(req, requests).filter(r => EMPLOYEES[r.employee]?.department === emp.department);
  const teamSize = Object.values(EMPLOYEES).filter(e => e.department === emp.department).length;
  const teamRisk = overlapping.length >= 2;

  const { visible, close, closing } = useModalTransition(onClose, SHEET_CLOSE_DUR);
  const [avatarTip, setAvatarTip] = React.useState(null);
  const [teamExpanded, setTeamExpanded] = React.useState(false);
  const [editMode, setEditMode] = React.useState(false);
  const [cancelMode, setCancelMode] = React.useState(false);
  const [cancelReason, setCancelReason] = React.useState('');
  const [declineMode, setDeclineMode] = React.useState(!!initialDeclineMode);
  const [declineReason, setDeclineReason] = React.useState('');

  // Edit form state — initialized lazily via enterEdit()
  const [editType, setEditType] = React.useState(req.type);
  const [editNote, setEditNote] = React.useState(req.note || '');
  const [editRangeFrom, setEditRangeFrom] = React.useState(() => {
    const d = parseDisplayDate(req.startDate); return d ? isoDate(d) : '';
  });
  const [editRangeTo, setEditRangeTo] = React.useState(() => {
    const d = parseDisplayDate(req.endDate || req.startDate); return d ? isoDate(d) : '';
  });
  const [editPickedDates, setEditPickedDates] = React.useState(() =>
    req._selectedDates ? new Set(req._selectedDates) : new Set()
  );
  const [editHalfDay, setEditHalfDay] = React.useState(req._halfDay || {});
  const [editErrors, setEditErrors] = React.useState({});

  React.useEffect(() => {
    if (!editRangeFrom || !editRangeTo) return;
    const from = new Date(editRangeFrom + 'T00:00:00');
    const to   = new Date(editRangeTo   + 'T00:00:00');
    if (from > to) return;
    const dates = new Set();
    for (let d = new Date(from); d <= to; d = addDays(d, 1)) {
      if (d.getDay() === 0 || d.getDay() === 6) continue;
      if (_collectiveSet.has(isoDate(d))) continue;
      if (_holidaySet.has(isoDate(d))) continue;
      dates.add(isoDate(d));
    }
    setEditPickedDates(dates);
    setEditErrors({});
  }, [editRangeFrom, editRangeTo]);

  const sortedPicked = [...editPickedDates].sort();
  const halfDayDeduction = Object.entries(editHalfDay)
    .filter(([iso, v]) => editPickedDates.has(iso) && (v === 'am' || v === 'pm')).length * 0.5;
  const editDays = editPickedDates.size - halfDayDeduction;

  const enterEdit = () => {
    setEditType(req.type);
    setEditNote(req.note || '');
    const from = parseDisplayDate(req.startDate);
    const to   = parseDisplayDate(req.endDate || req.startDate);
    setEditRangeFrom(from ? isoDate(from) : '');
    setEditRangeTo(to ? isoDate(to) : '');
    setEditPickedDates(req._selectedDates ? new Set(req._selectedDates) : new Set());
    setEditHalfDay(req._halfDay || {});
    setEditErrors({});
    setEditMode(true);
  };
  const exitEdit = () => { setEditMode(false); setCancelMode(false); };
  const enterCancel = () => { setCancelReason(''); setCancelMode(true); };
  const exitCancel = () => setCancelMode(false);
  const enterDecline = () => { setDeclineReason(''); setDeclineMode(true); };
  const exitDecline = () => setDeclineMode(false);

  const handleSaveEdit = () => {
    if (editPickedDates.size === 0) { setEditErrors({ dates: 'Please select dates' }); return; }
    setEditErrors({});
    const fmtD = (d) => d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    const startD = new Date(sortedPicked[0] + 'T00:00:00');
    const endD   = new Date(sortedPicked[sortedPicked.length - 1] + 'T00:00:00');
    const activeHD = Object.fromEntries(Object.entries(editHalfDay).filter(([k]) => editPickedDates.has(k)));
    const updatedReq = {
      ...req,
      type: editType,
      startDate: fmtD(startD),
      endDate:   fmtD(endD),
      days: editDays,
      note: editNote || undefined,
      _selectedDates: sortedPicked,
      ...(Object.keys(activeHD).length > 0 ? { _halfDay: activeHD } : {}),
    };
    onSave(updatedReq);
    exitEdit();
  };

  // Status pill (must be before detailItems)
  const pillData = {
    approved: { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0', label: 'Approved' },
    rejected: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca', label: 'Declined' },
    pending:  { bg: '#fef9c3', color: '#92400e', border: '#fde68a', label: 'Pending'  },
  };
  const pill = pillData[req.status] || pillData.pending;

  // Detail content helpers
  const heroDateStr = req.startDate === req.endDate ? req.startDate : `${req.startDate} – ${req.endDate}`;
  const durationStr = req.days === 0.5 ? '½ day' : req.days === 1 ? '1 day' : `${req.days} days`;

  const labelStyle = { flexShrink: 0, fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 14, color: P.ink, whiteSpace: 'nowrap' };
  const valueStyle = { flex: 1, minWidth: 0, fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 14, color: P.inkSoft, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 };
  const TableRow = ({ label, icon, children }) => (
    <div style={{ display: 'flex', alignItems: 'center', padding: '16px 24px', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
        {icon && <Icon name={icon} size={14} color={P.inkSoft} strokeWidth={1.75} style={{ flexShrink: 0 }} />}
        <div style={labelStyle}>{label}</div>
      </div>
      <div style={valueStyle}>{children}</div>
    </div>
  );

  const SectionHeader = ({ children }) => (
    <div style={{ padding: '24px 24px 6px', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 10, color: P.inkFaint, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
      {children}
    </div>
  );

  const Group = ({ children }) => {
    const items = React.Children.toArray(children).filter(Boolean);
    return (
      <div>
        {items.map((child, i) => (
          <React.Fragment key={i}>
            {i > 0 && <div style={{ height: 1, background: P.border, marginLeft: 24, marginRight: 24 }} />}
            {child}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const hasOverlap = overlapping.length > 0;
  const allTeamMemberIds = Object.entries(EMPLOYEES)
    .filter(([, e]) => e.department === emp.department)
    .map(([id]) => id);

  // Overlap banner name list: "Sara L., Jonas G., and 1 other"
  const overlapPeers = overlapping.slice(0, 2).map(r => {
    const e = EMPLOYEES[r.employee];
    if (!e) return r.employee;
    const [first, ...rest] = e.name.split(' ');
    return first + (rest[0] ? ' ' + rest[0][0] + '.' : '');
  });
  const overlapExtra = overlapping.length - overlapPeers.length;
  const overlapNamesStr = overlapPeers.length === 0 ? '' :
    overlapExtra > 0 ? overlapPeers.join(', ') + `, and ${overlapExtra} other${overlapExtra > 1 ? 's' : ''}` :
    overlapPeers.length === 2 ? `${overlapPeers[0]} and ${overlapPeers[1]}` :
    overlapPeers[0];

  const detailContent = (
    <div>
      <SectionHeader>Request</SectionHeader>
      <Group>
        <TableRow label="Requested by" icon="user">
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.name}</span>
          <Avatar employeeId={req.employee} size={22} />
        </TableRow>
        <TableRow label="When" icon="calendar">
          {heroDateStr} · {durationStr}
        </TableRow>
        <TableRow label="Type" icon="tag">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: LEAVE_COLORS[req.type] || P.inkFaint, border: `1.5px solid ${LEAVE_BORDER_COLORS[req.type] || P.border}`, flexShrink: 0 }} />
            {req.type}
          </span>
        </TableRow>
        <TableRow label="Department" icon="building-2">
          {emp.department}
        </TableRow>
      </Group>

      {(req.note || ATTACHMENT_RULES[req.type]) && <>
        <SectionHeader>Supporting info</SectionHeader>
        <Group>
          {ATTACHMENT_RULES[req.type] && (
            <TableRow label="Document" icon="paperclip">
              {req.document ? (
                <AppLink>{req.document}</AppLink>
              ) : (
                <>
                  <span style={{ fontWeight: 600, fontSize: 12, color: '#92400e', background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 20, padding: '2px 8px' }}>Missing</span>
                  <span style={{ fontWeight: 400, color: P.inkSoft }}>{ATTACHMENT_RULES[req.type].label}</span>
                </>
              )}
            </TableRow>
          )}
          {req.note && (
            <TableRow label="Note" icon="message-square">
              <span style={{ fontStyle: 'italic', lineHeight: 1.4, textAlign: 'right' }}>"{req.note}"</span>
            </TableRow>
          )}
        </Group>
      </>}

      <SectionHeader>Team impact</SectionHeader>
      {(() => {
        const offIds = new Set(overlapping.map(r => r.employee));
        const sorted = [
          ...allTeamMemberIds.filter(id => offIds.has(id)),
          ...allTeamMemberIds.filter(id => !offIds.has(id)),
        ];
        const MAX_STACK = 3;
        const stackIds = sorted.slice(0, MAX_STACK);
        const hidden = sorted.length - MAX_STACK;
        return (
          <div>
            {/* Collapsed row */}
            <div onClick={hasOverlap ? () => setTeamExpanded(x => !x) : undefined} style={{ display: 'flex', alignItems: 'center', padding: '16px 24px', gap: 16, cursor: hasOverlap ? 'pointer' : 'default' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
                <Icon name="users" size={14} color={P.inkSoft} strokeWidth={1.75} style={{ flexShrink: 0 }} />
                <div style={{ flexShrink: 0, fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 14, color: P.ink, whiteSpace: 'nowrap' }}>Team availability</div>
              </div>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                {hasOverlap
                  ? <DotPill bg="#fef9c3" color="#92400e">{overlapping.length} of {teamSize} away</DotPill>
                  : <span style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 13, color: P.inkSoft }}>All available</span>
                }
                {hasOverlap && (
                  <span style={{ flexShrink: 0, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="chevron-down" size={14} color={P.inkSoft} strokeWidth={2} style={{ transition: 'transform 200ms ease', transform: teamExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                  </span>
                )}
              </div>
            </div>

            {/* Expanded member list */}
            {teamExpanded && (
              <div style={{ margin: '0 16px 12px', background: '#f9f9fa', borderRadius: 10, overflow: 'hidden' }}>
                {sorted.filter(id => offIds.has(id)).map((empId, i) => {
                  const oe = EMPLOYEES[empId];
                  const offReq = overlapping.find(r => r.employee === empId);
                  const dateStr = offReq.startDate === offReq.endDate ? offReq.startDate : `${offReq.startDate} – ${offReq.endDate}`;
                  return (
                    <React.Fragment key={empId}>
                    {i > 0 && <div style={{ height: 1, background: P.border, margin: '0 12px' }} />}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px' }}>
                      <span style={{ borderRadius: '50%', border: '2px solid #fcd34d', display: 'flex', lineHeight: 0, flexShrink: 0 }}>
                        <Avatar employeeId={empId} size={18} />
                      </span>
                      <span style={{ flex: 1, fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: P.ink }}>{oe?.name}</span>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: P.inkSoft }}>{dateStr}</span>
                    </div>
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      <SectionHeader>Admin</SectionHeader>
      <Group>
        <TableRow label="Status" icon="circle-dot">
          <DotPill bg={pill.bg} color={pill.color}>{pill.label}</DotPill>
        </TableRow>
        {req.submittedAt && (
          <TableRow label="Requested on" icon="clock">
            {req.submittedAt}
          </TableRow>
        )}
      </Group>
      <div style={{ height: 16 }} />
    </div>
  );

  // Slide transforms
  const SLIDE_DUR = 300;
  const secondPanel = editMode || cancelMode || declineMode;
  const detailSlide = secondPanel ? 'translateX(-100%)' : 'translateX(0)';
  const editSlide   = secondPanel ? 'translateX(0)'     : 'translateX(100%)';
  const slideTransition = `transform ${SLIDE_DUR}ms ${EASE_DRAWER}`;

  const editInputStyle = {
    width: '100%', padding: '8px 10px', borderRadius: 7, border: `1px solid ${P.border}`,
    fontFamily: 'var(--font-body)', fontSize: 13, color: P.ink, outline: 'none', background: P.white,
    boxSizing: 'border-box',
  };
  const editLabelStyle = {
    display: 'block', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 11,
    color: P.inkSoft, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6,
  };
  const editDurStr = editDays === 0.5 ? '½ day' : editDays === 1 ? '1 day' : `${editDays} days`;

  return (
    <React.Fragment>
      <div onClick={close} style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(15,13,40,0.25)',
        ...modalBackdropStyle(visible),
      }}>
      <div onClick={e => e.stopPropagation()} style={{
        position: 'absolute', top: 16, bottom: 16, right: 16, width: 480,
        background: P.white,
        borderRadius: 20,
        boxShadow: '0 24px 64px rgba(15,13,40,0.22), 0 0 0 1px rgba(15,13,40,0.06)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        ...sheetPanelStyle(visible, closing),
      }}>

        {/* Pinned header — stays fixed across both states */}
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: `1px solid ${P.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {secondPanel && (
              <button onClick={editMode ? exitEdit : cancelMode ? exitCancel : exitDecline} style={{ flexShrink: 0, width: 30, height: 30, borderRadius: '50%', background: 'rgba(60,60,67,0.1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="arrow-left" size={15} color={P.ink} strokeWidth={2} />
              </button>
            )}
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: P.ink }}>
              {editMode ? 'Edit request' : cancelMode ? 'Cancel absence' : declineMode ? 'Decline request' : 'Request details'}
            </span>
          </div>
          <button onClick={close} style={{ border: 'none', cursor: 'pointer', width: 30, height: 30, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(60,60,67,0.1)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}>
            <Icon name="X" size={14} color={P.ink} strokeWidth={2.5} />
          </button>
        </div>

        {/* Clipping window for the two sliding panels */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

          {/* Detail panel */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', transform: detailSlide, transition: slideTransition }}>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {detailContent}
            </div>
            {(isPending || req.status === 'approved') && (
              <div style={{ flexShrink: 0, padding: '12px 20px', borderTop: `1px solid ${P.border}`, display: 'flex', gap: 10 }}>
                {isPending && <>
                  <button onClick={enterDecline} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <Icon name="X" size={13} color="#dc2626" strokeWidth={2.5} /> Decline
                  </button>
                  <button onClick={() => onApprove(req.id)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: P.ink, color: P.white, cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <Icon name="Check" size={13} color={P.white} strokeWidth={2.5} /> Approve
                  </button>
                </>}
                {req.status === 'approved' && <>
                  <button onClick={enterEdit} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: `1px solid ${P.border}`, background: 'transparent', color: P.inkSoft, cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13 }}>Edit</button>
                  <button onClick={enterCancel} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13 }}>Cancel absence</button>
                </>}
              </div>
            )}
          </div>

          {/* Edit / Cancel / Decline panel */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', transform: editSlide, transition: slideTransition }}>
            {declineMode ? (
              <>
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 14, color: P.inkSoft, lineHeight: 1.5 }}>
                    You're declining <strong style={{ color: P.ink }}>{emp.name}</strong>'s {req.type} ({heroDateStr}).
                  </p>
                  <div>
                    <label style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 10, color: P.inkFaint, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Reason <span style={{ textTransform: 'none', fontWeight: 400 }}>(optional)</span></label>
                    <textarea value={declineReason} onChange={e => setDeclineReason(e.target.value)} placeholder="Explain why this request is being declined…" rows={3} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${P.border}`, background: P.bg, fontFamily: 'var(--font-body)', fontSize: 14, color: P.ink, resize: 'none', lineHeight: 1.5, boxSizing: 'border-box', outline: 'none' }} />
                  </div>
                </div>
                <div style={{ flexShrink: 0, padding: '12px 20px', borderTop: `1px solid ${P.border}`, display: 'flex', gap: 10 }}>
                  <button onClick={exitDecline} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: `1px solid ${P.border}`, background: 'transparent', color: P.inkSoft, cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13 }}>Go back</button>
                  <button onClick={() => { onDecline(req.id, declineReason); close(); }} style={{ flex: 2, padding: '10px 0', borderRadius: 10, border: 'none', background: '#dc2626', color: P.white, cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13 }}>Confirm decline</button>
                </div>
              </>
            ) : cancelMode ? (
              <>
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 14, color: P.inkSoft, lineHeight: 1.5 }}>
                    You're cancelling <strong style={{ color: P.ink }}>{emp.name}</strong>'s {req.type} ({heroDateStr}). This cannot be undone.
                  </p>
                  <div>
                    <label style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 10, color: P.inkFaint, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Reason <span style={{ textTransform: 'none', fontWeight: 400 }}>(optional)</span></label>
                    <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="Add a reason…" rows={3} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${P.border}`, background: P.bg, fontFamily: 'var(--font-body)', fontSize: 14, color: P.ink, resize: 'none', lineHeight: 1.5, boxSizing: 'border-box', outline: 'none' }} />
                  </div>
                </div>
                <div style={{ flexShrink: 0, padding: '12px 20px', borderTop: `1px solid ${P.border}`, display: 'flex', gap: 10 }}>
                  <button onClick={exitCancel} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: `1px solid ${P.border}`, background: 'transparent', color: P.inkSoft, cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13 }}>Go back</button>
                  <button onClick={() => { onCancel(req.id, cancelReason); close(); }} style={{ flex: 2, padding: '10px 0', borderRadius: 10, border: 'none', background: '#dc2626', color: P.white, cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13 }}>Confirm cancellation</button>
                </div>
              </>
            ) : (
            <>
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Leave type */}
              <div>
                <label style={editLabelStyle}>Leave type</label>
                <SelectField value={editType} onChange={e => setEditType(e.target.value)} style={{ ...editInputStyle }}>
                  {ALL_LEAVE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </SelectField>
              </div>
              {/* Date range */}
              <div>
                <label style={editLabelStyle}>Dates</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: P.inkFaint, marginBottom: 4 }}>From</div>
                    <input type="date" value={editRangeFrom} onChange={e => setEditRangeFrom(e.target.value)} style={editInputStyle} />
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: P.inkFaint, marginBottom: 4 }}>To</div>
                    <input type="date" value={editRangeTo} onChange={e => setEditRangeTo(e.target.value)} style={editInputStyle} />
                  </div>
                </div>
                {editPickedDates.size > 0 && !editErrors.dates && (
                  <div style={{ marginTop: 8, fontFamily: 'var(--font-body)', fontSize: 12, color: P.inkSoft }}>
                    {editDurStr} — {editPickedDates.size} working {editPickedDates.size === 1 ? 'day' : 'days'}
                  </div>
                )}
                {editErrors.dates && (
                  <div style={{ marginTop: 6, fontFamily: 'var(--font-body)', fontSize: 12, color: '#dc2626' }}>{editErrors.dates}</div>
                )}
              </div>
              {/* Note */}
              <div>
                <label style={editLabelStyle}>Note <span style={{ textTransform: 'none', fontWeight: 400, color: P.inkFaint }}>(optional)</span></label>
                <textarea value={editNote} onChange={e => setEditNote(e.target.value)} placeholder="Add a note…" rows={3} style={{ ...editInputStyle, resize: 'none', lineHeight: 1.5 }} />
              </div>
            </div>
            <div style={{ flexShrink: 0, padding: '12px 20px', borderTop: `1px solid ${P.border}`, display: 'flex', gap: 10 }}>
              <button onClick={exitEdit} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: `1px solid ${P.border}`, background: 'transparent', color: P.inkSoft, cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13 }}>Cancel</button>
              <button onClick={handleSaveEdit} style={{ flex: 2, padding: '10px 0', borderRadius: 10, border: 'none', background: P.ink, color: P.white, cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13 }}>Save changes</button>
            </div>
            </>
            )}
          </div>

        </div>
      </div>
      </div>

      {avatarTip && ReactDOM.createPortal(
        <div style={{ position: 'fixed', zIndex: 9999, left: avatarTip.x, top: avatarTip.y - 8, transform: 'translate(-50%, -100%)', background: P.ink, color: P.white, fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12, padding: '6px 10px', borderRadius: 8, pointerEvents: 'none', whiteSpace: 'nowrap', lineHeight: 1.5 }}>
          <div>{avatarTip.name}</div>
          {avatarTip.offReq ? (
            <div style={{ fontWeight: 400, color: 'rgba(255,255,255,0.65)', fontSize: 11, marginTop: 1 }}>
              {avatarTip.offReq.type} · {avatarTip.offReq.startDate === avatarTip.offReq.endDate ? avatarTip.offReq.startDate : `${avatarTip.offReq.startDate} – ${avatarTip.offReq.endDate}`}
            </div>
          ) : (
            <div style={{ fontWeight: 400, color: 'rgba(255,255,255,0.65)', fontSize: 11, marginTop: 1 }}>Available</div>
          )}
        </div>,
        document.body
      )}
    </React.Fragment>
  );
}

// ── Select with chevron ────────────────────────────────────────────────────
function SelectField({ value, onChange, children, style }) {
  return (
    <div style={{ position: 'relative' }}>
      <select value={value} onChange={onChange} style={{ ...style, appearance: 'none', paddingRight: 30 }}>
        {children}
      </select>
      <svg style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
        width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={P.inkFaint} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </div>
  );
}

function EmployeeCombobox({ value, onChange, employees, error, autoFocus }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const { rendered: listRendered, visible: listVisible } = usePopoverTransition(open);
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = React.useRef(null);
  const listRef = React.useRef(null);

  const selectedEmp = employees.find(([id]) => id === value)?.[1];

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter(([, emp]) =>
      emp.name.toLowerCase().includes(q) || emp.department.toLowerCase().includes(q)
    );
  }, [query, employees]);

  React.useEffect(() => {
    if (!listRef.current) return;
    const items = listRef.current.children;
    if (items[highlighted]) items[highlighted].scrollIntoView({ block: 'nearest' });
  }, [highlighted]);

  const handleSelect = (id) => { onChange(id); setQuery(''); setOpen(false); };
  const handleFocus = () => { setQuery(''); setOpen(true); setHighlighted(0); };
  const handleBlur = () => { setTimeout(() => { setOpen(false); setQuery(''); }, 150); };
  const handleKeyDown = (e) => {
    if (!open) { setOpen(true); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted(h => Math.min(h + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlighted(h => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (filtered[highlighted]) handleSelect(filtered[highlighted][0]); }
    else if (e.key === 'Escape') { setOpen(false); setQuery(''); }
  };

  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 7, padding: '8px 10px', borderRadius: 7,
        border: `1px solid ${error ? '#dc2626' : open ? P.borderStrong : P.border}`,
        background: P.white, boxSizing: 'border-box',
      }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={P.inkFaint} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          ref={inputRef} autoFocus={autoFocus}
          value={open ? query : (selectedEmp?.name || '')}
          onChange={e => { setQuery(e.target.value); setHighlighted(0); if (!open) setOpen(true); if (!e.target.value) onChange(''); }}
          onFocus={handleFocus} onBlur={handleBlur} onKeyDown={handleKeyDown}
          placeholder="Search by name or department…"
          style={{ flex: 1, border: 'none', outline: 'none', padding: 0, fontFamily: 'var(--font-body)', fontSize: 13, color: P.ink, background: 'transparent', minWidth: 0 }}
        />
        {value && !open ? (
          <button onMouseDown={e => { e.preventDefault(); onChange(''); inputRef.current?.focus(); }}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, display: 'flex', flexShrink: 0 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={P.inkFaint} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={P.inkFaint} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        )}
      </div>
      {listRendered && (
        <div ref={listRef} style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 400,
          background: P.white, borderRadius: 8, border: `1px solid ${P.border}`,
          boxShadow: '0 4px 20px rgba(15,13,40,0.12)', maxHeight: 220, overflowY: 'auto',
          ...popoverStyle(listVisible, 'top'),
        }}>
          {filtered.length > 0 ? filtered.map(([id, emp], idx) => (
            <div key={id} onMouseDown={() => handleSelect(id)} onMouseEnter={() => setHighlighted(idx)}
              style={{ padding: '8px 12px', cursor: 'pointer', background: idx === highlighted ? P.bg : 'transparent', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.ink, flex: 1 }}>{emp.name}</span>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: P.inkFaint, flexShrink: 0 }}>{emp.department}</span>
            </div>
          )) : (
            <div style={{ padding: '14px 12px', fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkFaint, textAlign: 'center' }}>No employees found</div>
          )}
        </div>
      )}
    </div>
  );
}

function DateInput({ value, onChange, min, placeholder = 'Select date', borderColor }) {
  const ref = React.useRef(null);
  const fmt = (iso) => {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return new Date(+y, +m - 1, +d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };
  const open = () => { try { ref.current?.showPicker(); } catch(e) { ref.current?.focus(); } };
  return (
    <div onClick={open} style={{
      position: 'relative', display: 'flex', alignItems: 'center', gap: 7,
      padding: '8px 10px', borderRadius: 7, border: `1px solid ${borderColor || P.border}`,
      background: P.white, cursor: 'pointer', userSelect: 'none', minHeight: 36,
    }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={value ? P.inkSoft : P.inkFaint} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
      <span style={{ flex: 1, fontFamily: 'var(--font-body)', fontSize: 13, color: P.ink, lineHeight: 1 }}>
        {value ? fmt(value) : placeholder}
      </span>
      <input
        ref={ref} type="date" value={value} min={min} onChange={onChange}
        style={{ position: 'absolute', width: 0, height: 0, opacity: 0, border: 'none', padding: 0, pointerEvents: 'none' }}
      />
    </div>
  );
}

// ── Half-day segmented picker ─────────────────────────────────────────────
const ADMIN_HALF_OPTS = ['full', 'am', 'pm'];
const ADMIN_HALF_LABELS = { full: 'Full', am: 'AM', pm: 'PM' };
function HalfDayPickerAdmin({ value, onChange }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', padding: 3, background: '#EBEBED', borderRadius: 14, gap: 2 }}>
      {ADMIN_HALF_OPTS.map(opt => {
        const active = value === opt;
        return (
          <button key={opt} onClick={() => onChange(opt)} style={{
            padding: '3px 10px', borderRadius: 11, border: 'none',
            background: active ? '#fff' : 'transparent',
            boxShadow: active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            fontFamily: 'var(--font-display)', fontWeight: active ? 700 : 500,
            fontSize: 11, color: active ? P.ink : P.inkSoft,
            cursor: 'pointer',
          }}>{ADMIN_HALF_LABELS[opt]}</button>
        );
      })}
    </div>
  );
}

// ── Inline calendar for date range picking ────────────────────────────────
function ModalCalendar({ startDate, endDate, focusedField, onDateTap, pickedDates, selectionMode, halfDay }) {
  const today = new Date(); today.setHours(0,0,0,0);
  const initial = startDate || today;
  const [month, setMonth] = useState(initial.getMonth());
  const [year, setYear]   = useState(initial.getFullYear());
  const isPick = selectionMode === 'pick';
  const rangeBg = '#EAD6F7';

  const dayNames = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  const first = new Date(year, month, 1);
  let startCol = first.getDay() - 1;
  if (startCol < 0) startCol = 6;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startCol; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  const sameDay = (a, b) => a && b && isoDate(a) === isoDate(b);
  const isWeekend = (d) => d.getDay() === 0 || d.getDay() === 6;
  const isHoliday = (d) => _holidaySet.has(isoDate(d));
  const isCollective = (d) => _collectiveSet.has(isoDate(d));
  const isDisabled = (d) => isWeekend(d) || isHoliday(d) || isCollective(d);
  const isInRange = (d) => !isPick && startDate && endDate && d > startDate && d < endDate;
  const isStart = (d) => !isPick && sameDay(d, startDate);
  const isEnd = (d) => !isPick && sameDay(d, endDate);
  const isPicked = (d) => isPick && pickedDates && pickedDates.has(isoDate(d));
  const isToday = (d) => sameDay(d, today);

  const findWork = (d, dir) => {
    for (let step = 1; step <= 4; step++) {
      const nd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + dir * step);
      if (!isWeekend(nd) && !isHoliday(nd) && !isCollective(nd)) return isoDate(nd);
    }
    return null;
  };

  const prevMonth = () => { setMonth(m => m === 0 ? (setYear(y => y - 1), 11) : m - 1); };
  const nextMonth = () => { setMonth(m => m === 11 ? (setYear(y => y + 1), 0) : m + 1); };

  return (
    <div style={{ borderRadius: 8, border: `1px solid ${P.border}`, padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
        <button onClick={prevMonth} style={{ width: 28, height: 28, border: 'none', background: 'transparent', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={P.ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span style={{ flex: 1, textAlign: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: P.ink }}>
          {MONTH_NAMES[month]} {year}
        </span>
        <button onClick={nextMonth} style={{ width: 28, height: 28, border: 'none', background: 'transparent', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={P.ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
        {dayNames.map(dn => (
          <div key={dn} style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 10, color: P.inkFaint, padding: '3px 0', textTransform: 'uppercase' }}>{dn}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} />;
          const disabled = isDisabled(d);
          const picked = isPicked(d);
          const selStart = isStart(d);
          const selEnd = isEnd(d);
          const sel = picked || selStart || selEnd;
          const inRange = isInRange(d) && !sel;
          const hasRange = !isPick && startDate && endDate && !sameDay(startDate, endDate);

          // Pick mode: adjacency + weekend bridging for range highlight
          let prevAdj = false, nextAdj = false, bridged = false;
          if (isPick) {
            const prevIso = isoDate(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1));
            const nextIso = isoDate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1));
            if (picked) {
              const pw = findWork(d, -1);
              const nw = findWork(d, 1);
              prevAdj = !!(pickedDates.has(prevIso) || (pw && pw !== prevIso && pickedDates.has(pw)));
              nextAdj = !!(pickedDates.has(nextIso) || (nw && nw !== nextIso && pickedDates.has(nw)));
            }
            if (disabled && pickedDates) {
              const pw = findWork(d, -1);
              const nw = findWork(d, 1);
              bridged = !!(pw && nw && pickedDates.has(pw) && pickedDates.has(nw));
            }
          }
          const isMidRange = isPick && picked && prevAdj && nextAdj;

          const halfDayVal = isPick && picked && halfDay ? halfDay[isoDate(d)] : null;

          let btnBg = 'transparent';
          let color = P.ink;
          let fontWeight = 500;
          if (halfDayVal === 'am') {
            btnBg = `linear-gradient(to bottom, ${P.action} 50%, rgba(34,10,53,0.45) 50%)`;
            color = '#fff'; fontWeight = 700;
          } else if (halfDayVal === 'pm') {
            btnBg = `linear-gradient(to bottom, rgba(34,10,53,0.45) 50%, ${P.action} 50%)`;
            color = '#fff'; fontWeight = 700;
          } else if (isMidRange) { fontWeight = 700; }
          else if (sel) { btnBg = P.action; color = '#fff'; fontWeight = 700; }
          else if (disabled) { color = '#c5c9d0'; }
          else if (inRange) { fontWeight = 600; }

          let wrapBg = 'transparent';
          if (isPick) {
            if (bridged) wrapBg = rangeBg;
            else if (picked) {
              if (prevAdj && nextAdj) wrapBg = rangeBg;
              else if (!prevAdj && nextAdj) wrapBg = `linear-gradient(to right, transparent 50%, ${rangeBg} 50%)`;
              else if (prevAdj && !nextAdj) wrapBg = `linear-gradient(to left, transparent 50%, ${rangeBg} 50%)`;
            }
          } else {
            if (inRange) wrapBg = rangeBg;
            else if (selStart && hasRange) wrapBg = `linear-gradient(to right, transparent 50%, ${rangeBg} 50%)`;
            else if (selEnd && hasRange) wrapBg = `linear-gradient(to left, transparent 50%, ${rangeBg} 50%)`;
          }

          return (
            <div key={isoDate(d)} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', background: wrapBg }}>
              <button onClick={() => !disabled && onDateTap(d)} style={{
                width: 32, height: 32, border: 'none', background: btnBg,
                borderRadius: (sel && !isMidRange) || halfDayVal ? '50%' : 6, cursor: disabled ? 'default' : 'pointer',
                fontFamily: 'var(--font-display)', fontWeight, fontSize: 12, color,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative',
                boxShadow: isToday(d) && !sel ? `inset 0 0 0 1.5px ${P.action}` : 'none',
              }}>
                {d.getDate()}
                {isHoliday(d) && !sel && (
                  <span style={{ position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, borderRadius: 2, background: '#e89a3c' }} />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Add / Edit time off modal ──────────────────────────────────────────────
function AddTimeOffModal({ existing, onClose, onSave, requests = [], defaultDate, defaultEmployee, defaultHalfDay }) {
  const isEdit = !!existing?.id;
  const lockEmployee = existing?._lockEmployee;
  const [empId, setEmpId]     = useState(existing?.employee || defaultEmployee || '');
  const [type, setType]       = useState(existing?.type || 'Time off');
  const [specialReason, setSpecialReason] = useState(existing?._specialReason || '');
  const [specialWho, setSpecialWho]       = useState(existing?._specialWho || '');
  const [note, setNote]       = useState(existing?.note || '');
  const [holidayName, setHolidayName] = useState(existing?.name || '');
  const [errors, setErrors] = useState({});
  const [halfDay, setHalfDay] = useState(existing?._halfDay || (defaultDate && defaultHalfDay ? { [defaultDate]: defaultHalfDay } : {}));
  const [showEditSelection, setShowEditSelection] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const [notifyEmployee, setNotifyEmployee] = useState(false);
  const [scope, setScope] = useState(existing?._isCompanyEvent ? 'collective' : 'one');
  const [rangeFrom, setRangeFrom] = useState(() => existing?.startDate ? (toISOInput(existing.startDate) || '') : defaultDate || '');
  const [rangeTo, setRangeTo]     = useState(() => existing ? (toISOInput(existing.endDate || existing.startDate) || '') : defaultDate || '');
  const [pickedDates, setPickedDates] = useState(() => {
    if (existing?._selectedDates) return new Set(existing._selectedDates);
    if (existing?.startDate) {
      const start = parseDisplayDate(existing.startDate);
      const end = parseDisplayDate(existing.endDate || existing.startDate);
      if (!start || !end) return new Set();
      const dates = new Set();
      for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
        if (d.getDay() !== 0 && d.getDay() !== 6 && !_holidaySet.has(isoDate(d)) && !_collectiveSet.has(isoDate(d))) {
          dates.add(isoDate(d));
        }
      }
      return dates;
    }
    if (defaultDate) return new Set([defaultDate]);
    return new Set();
  });
  const allEmployees = scope === 'collective';

  useEffect(() => {
    setAttachment(null);
    setNotifyEmployee(false);
    if (type !== 'Special leave') { setSpecialReason(''); setSpecialWho(''); }
  }, [type]);

  useEffect(() => { setSpecialWho(''); }, [specialReason]);

  useEffect(() => {
    if (!rangeFrom || !rangeTo) return;
    const from = new Date(rangeFrom + 'T00:00:00');
    const to   = new Date(rangeTo   + 'T00:00:00');
    if (from > to) return;
    const dates = new Set();
    let blockedByCollective = 0;
    let blockedByHoliday = 0;
    for (let d = new Date(from); d <= to; d = addDays(d, 1)) {
      if (d.getDay() === 0 || d.getDay() === 6) continue;
      if (_collectiveSet.has(isoDate(d))) { blockedByCollective++; continue; }
      if (_holidaySet.has(isoDate(d))) { blockedByHoliday++; continue; }
      dates.add(isoDate(d));
    }
    setPickedDates(dates);
    if (dates.size === 0 && (blockedByCollective > 0 || blockedByHoliday > 0)) {
      const reason = blockedByCollective > 0 ? 'collective closure days' : 'public holidays';
      setErrors(p => ({ ...p, dates: `This range only contains ${reason} — pick different dates` }));
    } else {
      setErrors(p => ({ ...p, dates: null }));
    }
  }, [rangeFrom, rangeTo]);

  const handleDateTap = (d) => {
    const iso = isoDate(d);
    if (pickedDates.has(iso)) {
      setPickedDates(prev => { const n = new Set(prev); n.delete(iso); return n; });
      setHalfDay(hd => { const c = { ...hd }; delete c[iso]; return c; });
    } else {
      setPickedDates(prev => new Set([...prev, iso]));
    }
  };

  function toISOInput(displayStr) {
    const d = parseDisplayDate(displayStr);
    return d ? isoDate(d) : '';
  }

  function countWeekdays(from, to) {
    let count = 0;
    for (let d = new Date(from); d <= to; d = addDays(d, 1)) {
      if (d.getDay() !== 0 && d.getDay() !== 6) count++;
    }
    return count;
  }

  const sortedPicked = [...pickedDates].sort();
  const startD = sortedPicked.length > 0 ? new Date(sortedPicked[0] + 'T00:00:00') : null;
  const endD = sortedPicked.length > 0 ? new Date(sortedPicked[sortedPicked.length - 1] + 'T00:00:00') : null;
  const halfDayDeduction = Object.entries(halfDay).filter(([iso, v]) => pickedDates.has(iso) && (v === 'am' || v === 'pm')).length * 0.5;
  const days = pickedDates.size - halfDayDeduction;

  const fmtDisplay = (d) => d ? d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : '';

  const handleSave = () => {
    const errs = {};
    if (!allEmployees && !empId) errs.employee = 'Please select an employee';
    if (pickedDates.size === 0) errs.dates = 'Please select dates';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});

    const startD2 = new Date(sortedPicked[0] + 'T00:00:00');
    const endD2 = new Date(sortedPicked[sortedPicked.length - 1] + 'T00:00:00');
    const activeHalfDay = Object.fromEntries(Object.entries(halfDay).filter(([k]) => pickedDates.has(k)));
    const base = {
      type,
      startDate: fmtDisplay(startD2),
      endDate: fmtDisplay(endD2),
      days,
      status: existing?.status || 'approved',
      submittedAt: existing?.submittedAt || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      note,
      _selectedDates: sortedPicked,
      ...(Object.keys(activeHalfDay).length > 0 ? { _halfDay: activeHalfDay } : {}),
      ...(type === 'Special leave' && specialReason ? { _specialReason: specialReason } : {}),
      ...(type === 'Special leave' && specialWho ? { _specialWho: specialWho } : {}),
    };
    if (allEmployees) {
      onSave({ ...base, id: existing?.id || `ce-${Date.now()}`, _isCompanyEvent: true, name: holidayName || type });
    } else {
      onSave({ ...base, id: existing?.id || `manual-${Date.now()}`, employee: empId });
    }
    close();
  };

  const empList = Object.entries(EMPLOYEES).sort((a, b) => a[1].name.localeCompare(b[1].name));

  const inputStyle = {
    width: '100%', padding: '8px 10px', borderRadius: 7, border: `1px solid ${P.border}`,
    fontFamily: 'var(--font-body)', fontSize: 13, color: P.ink, outline: 'none', background: P.white,
  };

  const { visible, close, closing } = useModalTransition(onClose, SHEET_CLOSE_DUR);

  React.useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [close]);

  return (
    <div onClick={close} style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(15,13,40,0.25)',
      ...modalBackdropStyle(visible),
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        position: 'absolute', top: 16, bottom: 16, right: 16, width: 480,
        background: P.white,
        borderRadius: 20,
        boxShadow: '0 24px 64px rgba(15,13,40,0.22), 0 0 0 1px rgba(15,13,40,0.06)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        ...sheetPanelStyle(visible, closing),
      }}>
        {/* Header */}
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: `1px solid ${P.border}` }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: P.ink }}>
            {isEdit ? (allEmployees ? 'Edit company closure' : 'Edit time off') : (allEmployees ? 'Add company closure' : 'Add time off')}
          </span>
          <button onClick={close} style={{
            border: 'none', cursor: 'pointer',
            width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(60,60,67,0.1)',
            backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
          }}>
            <Icon name="X" size={14} color={P.ink} strokeWidth={2.5} />
          </button>
        </div>

        {/* Past-record warning — only in edit mode for past absences */}
        {isEdit && (() => {
          const today = new Date(); today.setHours(0,0,0,0);
          const endD = existing?._selectedDates?.length
            ? (() => { const p = existing._selectedDates[existing._selectedDates.length-1].split('-'); return new Date(+p[0],+p[1]-1,+p[2]); })()
            : null;
          const thirtyDaysAgo = new Date(today); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          if (!endD || endD >= today || endD < thirtyDaysAgo) return null;
          return (
            <div style={{ flexShrink: 0, padding: '16px 24px 4px' }}>
              <div style={{ padding: '14px 16px', borderRadius: 10, background: '#fdf6ec', display: 'flex', alignItems: 'center', gap: 10 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: '#92400e', lineHeight: 1.4 }}>Changes to past absences may affect payroll records.</span>
              </div>
            </div>
          );
        })()}

        {/* Form — scrollable */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Scope selector */}
          {!lockEmployee && !isEdit && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                ['one', 'One employee', 'User', 'Choose a specific person'],
                ['collective', 'All employees', 'Users', 'Apply to your entire team'],
              ].map(([val, label, icon, sublabel]) => {
                const active = scope === val;
                return (
                  <button key={val} onClick={() => setScope(val)} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4,
                    padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                    border: `1.5px solid ${active ? P.ink : P.border}`,
                    background: active ? P.bg : P.white,
                    transition: 'border-color 120ms, background 120ms',
                  }}>
                    <Icon name={icon} size={14} color={active ? P.ink : P.inkSoft} strokeWidth={2} />
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: P.ink }}>{label}</span>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: P.inkSoft, lineHeight: 1.3 }}>{sublabel}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Employee / Holiday name — same slot, same height, no jump */}
          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: P.inkSoft, marginBottom: 6 }}>
              {scope === 'collective' ? 'Reason' : 'Employee'}
            </label>
            {scope === 'collective' ? (
              <input value={holidayName} onChange={e => setHolidayName(e.target.value)} placeholder="e.g. Belgian National Day" style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
            ) : (lockEmployee || isEdit) ? (
              <div style={{ ...inputStyle, display: 'flex', alignItems: 'center', background: '#f7f8f7', color: P.ink }}>
                {EMPLOYEES[empId]?.name || empId}
              </div>
            ) : (
              <EmployeeCombobox
                value={empId}
                onChange={(id) => { setEmpId(id); setErrors(p => ({...p, employee: null})); }}
                employees={empList}
                error={errors.employee}
                autoFocus={false}
              />
            )}
            {errors.employee && <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: '#dc2626', marginTop: 4 }}>{errors.employee}</div>}
          </div>

          {/* Leave type — hidden for collective holidays */}
          {!allEmployees && (
            <div>
              <label style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: P.inkSoft, marginBottom: 6 }}>Leave type</label>
              <SelectField value={type} onChange={e => setType(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                {ALL_LEAVE_TYPES.map(t => (
                  <option key={t} value={t}>{t}{ADMIN_ONLY_TYPES.has(t) ? ' (Admin)' : ''}</option>
                ))}
              </SelectField>
            </div>
          )}

          {/* Special leave cascading selects */}
          {!allEmployees && type === 'Special leave' && (() => {
            const reasonObj = SPECIAL_LEAVE_REASONS.find(r => r.id === specialReason);
            const whoList = specialReason === 'wedding' ? SPECIAL_WEDDING_WHO : specialReason === 'funeral' ? SPECIAL_FUNERAL_WHO : [];
            const whoObj = whoList.find(w => w.id === specialWho);

            // Compute entitlement note
            let entitlementNote = null;
            if (reasonObj && !reasonObj.hasWho) entitlementNote = `Legal entitlement: ${reasonObj.entitlement}`;
            else if (whoObj) {
              entitlementNote = `Legal entitlement: ${whoObj.days} day${whoObj.days !== 1 ? 's' : ''}${whoObj.note ? ` — ${whoObj.note}` : ''}`;
            }

            return (
              <>
                <div>
                  <label style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: P.inkSoft, marginBottom: 6 }}>Reason</label>
                  <SelectField value={specialReason} onChange={e => setSpecialReason(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                    <option value="">Select a reason…</option>
                    {SPECIAL_LEAVE_REASONS.map(r => (
                      <option key={r.id} value={r.id}>{r.label}</option>
                    ))}
                  </SelectField>
                </div>

                {reasonObj?.hasWho && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: P.inkSoft, marginBottom: 6 }}>
                      {specialReason === 'wedding' ? 'Wedding type' : 'Relationship to deceased'}
                    </label>
                    <SelectField value={specialWho} onChange={e => setSpecialWho(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                      <option value="">Select…</option>
                      {whoList.map(w => (
                        <option key={w.id} value={w.id}>{w.label}</option>
                      ))}
                    </SelectField>
                    {entitlementNote && (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, padding: '8px 10px', borderRadius: 7, background: P.bg, border: `1px solid ${P.border}` }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={P.inkSoft} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 1, flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: P.inkSoft, lineHeight: 1.4 }}>{entitlementNote}</span>
                      </div>
                    )}
                  </div>
                )}

                {!reasonObj?.hasWho && entitlementNote && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, padding: '8px 10px', borderRadius: 7, background: P.bg, border: `1px solid ${P.border}` }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={P.inkSoft} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 1, flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: P.inkSoft, lineHeight: 1.4 }}>{entitlementNote}</span>
                  </div>
                )}
              </>
            );
          })()}


          {/* Date range inputs */}
          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: P.inkSoft, marginBottom: 6 }}>Dates</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 11, color: P.inkFaint, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>From</div>
                <DateInput value={rangeFrom} placeholder="Start date" borderColor={errors.dates ? '#dc2626' : P.border} onChange={e => { setRangeFrom(e.target.value); if (rangeTo && e.target.value > rangeTo) setRangeTo(e.target.value); }} />
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 11, color: P.inkFaint, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>To</div>
                <DateInput value={rangeTo} placeholder="End date" min={rangeFrom || undefined} borderColor={errors.dates ? '#dc2626' : P.border} onChange={e => { setRangeTo(e.target.value); }} />
              </div>
            </div>
            {errors.dates && <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: '#dc2626', marginTop: 4 }}>{errors.dates}</div>}
          </div>

          {/* Duration + edit selection */}
          {pickedDates.size > 0 && (
            <div style={{ borderRadius: 8, overflow: 'hidden', background: P.bg, border: `1px solid ${P.border}` }}>
              <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="CalendarDays" size={13} color={P.inkSoft} />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: P.inkSoft, flex: 1 }}>
                  {days === 0.5 ? '½ working day' : days === 1 ? '1 working day' : `${days} working days`}
                  {startD && endD && startD.getTime() !== endD.getTime() && (
                    <span style={{ color: P.inkFaint }}> · {fmtDisplay(startD)} – {fmtDisplay(endD)}</span>
                  )}
                </span>
                <button onClick={() => setShowEditSelection(v => !v)} style={{
                  border: 'none', background: 'transparent', cursor: 'pointer', padding: 0,
                  fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12, color: P.ink,
                  textDecoration: 'underline', textUnderlineOffset: 2,
                }}>
                  {showEditSelection ? 'Done' : 'Edit days'}
                </button>
              </div>
              {showEditSelection && (
                <div style={{ borderTop: `1px solid ${P.border}`, padding: '0 12px' }}>
                  {sortedPicked.map((iso, idx) => {
                    const p = iso.split('-');
                    const d = new Date(+p[0], +p[1]-1, +p[2]);
                    const label = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
                    const hv = halfDay[iso] || 'full';
                    const isLast = idx === sortedPicked.length - 1;
                    return (
                      <div key={iso} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: isLast ? 'none' : `1px solid ${P.border}` }}>
                        <span style={{ flex: 1, fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12, color: P.ink }}>{label}</span>
                        <HalfDayPickerAdmin value={hv} onChange={(v) => setHalfDay(hd => {
                          const c = { ...hd };
                          if (v === 'full') delete c[iso]; else c[iso] = v;
                          return c;
                        })} />
                        <button onClick={() => handleDateTap(d)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 4, display: 'flex', lineHeight: 1 }}>
                          <Icon name="Trash2" size={13} color={P.inkSoft} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Note — always shown */}
          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: P.inkSoft, marginBottom: 6 }}>Notes <span style={{ fontWeight: 400 }}>(optional)</span></label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder={scope === 'collective' ? 'e.g. Replacement for Christmas Day which fell on a Sunday…' : 'Reason or additional context…'} style={{ ...inputStyle, resize: 'none', lineHeight: 1.5 }} />
          </div>

          {/* Document upload + notify toggle — non-blocking */}
          {(() => {
            const rule = ATTACHMENT_RULES[type];
            if (!rule) return null;
            return (
              <div>
                <label style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: P.inkSoft, marginBottom: 6 }}>{rule.label}</label>
                <p style={{ margin: '0 0 8px', fontFamily: 'var(--font-body)', fontSize: 11, color: P.inkFaint }}>{rule.note}</p>
                {attachment ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 7, border: `1px solid ${P.border}`, background: P.bg }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={P.inkSoft} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                    </svg>
                    <span style={{ flex: 1, fontFamily: 'var(--font-body)', fontSize: 12, color: P.ink }}>{attachment}</span>
                    <button onClick={() => setAttachment(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 2, display: 'flex' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={P.inkFaint} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setAttachment(`${rule.label.toLowerCase().replace(/ /g, '_')}.pdf`)} style={{
                    width: '100%', padding: '11px 16px', borderRadius: 7,
                    border: `1.5px dashed ${P.border}`, background: 'transparent', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12, color: P.inkSoft,
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={P.inkSoft} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    Upload {rule.label}
                  </button>
                )}
                {!attachment && (
                  <div onClick={() => setNotifyEmployee(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, padding: '10px 12px', borderRadius: 8, border: `1px solid ${P.border}`, background: P.bg, cursor: 'pointer', userSelect: 'none' }}>
                    <Switch checked={notifyEmployee} size="sm" />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.ink }}>Request {rule.label.toLowerCase()} from employee</div>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: P.inkSoft, marginTop: 2 }}>Sends an email asking the employee to upload the document</div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Footer — pinned */}
        <div style={{ flexShrink: 0, padding: '14px 24px', borderTop: `1px solid ${P.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={close} style={{
            padding: '8px 18px', borderRadius: 8, border: `1px solid ${P.borderStrong}`, background: 'transparent',
            color: P.ink, cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13,
          }}>Cancel</button>
          <div style={{ flex: 1 }} />
          <button onClick={handleSave} style={{
            padding: '8px 20px', borderRadius: 8, border: 'none',
            background: P.action, color: '#fff', cursor: 'pointer',
            fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13,
          }}>{isEdit ? (allEmployees ? 'Save closure' : 'Save changes') : (allEmployees ? 'Add closure' : 'Confirm absence')}</button>
        </div>
      </div>
    </div>
  );
}

// ── Shared overlap helper ──────────────────────────────────────────────────
function getOverlapping(req, requests) {
  const _d = (r, last) => {
    if (r._selectedDates?.length) {
      const iso = last ? r._selectedDates[r._selectedDates.length-1] : r._selectedDates[0];
      const p = iso.split('-'); return new Date(+p[0],+p[1]-1,+p[2]);
    }
    return parseDisplayDate(last ? (r.endDate || r.startDate) : r.startDate);
  };
  const s = _d(req, false), e = _d(req, true);
  if (!s || !e) return [];
  return requests.filter(r => {
    if (r.id === req.id || r.employee === req.employee) return false;
    if (r.status !== 'approved' && r.status !== 'pending') return false;
    const rs = _d(r, false), re = _d(r, true);
    return rs && re && rs <= e && re >= s;
  });
}

// ── Avatar stack with hover-expand ─────────────────────────────────────────
const AVATAR_SIZE = 24;
const AVATAR_OVERLAP = -9;
const AVATAR_EXPAND = 4;

function AvatarStack({ people }) {
  const [activeIdx, setActiveIdx] = useState(null);
  const [tooltipPos, setTooltipPos] = useState(null);
  const shown = people.slice(0, 4);
  const extra = people.length - 4;
  return (
    <span
      onMouseLeave={() => { setActiveIdx(null); setTooltipPos(null); }}
      style={{ display: 'inline-flex', alignItems: 'flex-end', position: 'relative', height: AVATAR_SIZE + 8, paddingTop: 8 }}
    >
      {shown.map((p, i) => {
        const e2 = EMPLOYEES[p.employee];
        const initials = e2?.initials || '?';
        const name = e2?.name || p.employee;
        const isActive = activeIdx === i;
        const lift = isActive ? -2 : 0;
        return (
          <span
            key={p.id}
            onMouseEnter={(e) => {
              setActiveIdx(i);
              const r = e.currentTarget.getBoundingClientRect();
              setTooltipPos({ x: r.left + r.width / 2, y: r.top });
            }}
            onMouseLeave={() => { setActiveIdx(null); setTooltipPos(null); }}
            style={{
              width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: '50%',
              background: '#e5e7eb',
              border: '2px solid #fff', boxSizing: 'content-box',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontWeight: 700, color: P.ink, letterSpacing: '0.02em',
              marginLeft: i > 0 ? AVATAR_OVERLAP : 0,
              position: 'relative', zIndex: isActive ? 20 : shown.length - i,
              fontFamily: 'var(--font-display)', flexShrink: 0,
              overflow: 'hidden',
              transition: `transform 350ms ${EASE_OUT}`,
              transform: `translateY(${lift}px)${isActive ? ' scale(1.03)' : ''}`,
              cursor: 'default',
            }}
          >
            {e2?.photo
              ? <img src={avatarUrl(e2.name, e2.gender)} alt={initials} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              : initials}
            {isActive && tooltipPos && ReactDOM.createPortal(
              <span style={{
                position: 'fixed',
                left: tooltipPos.x, top: tooltipPos.y - 6,
                transform: 'translateX(-50%) translateY(-100%)',
                padding: '4px 8px', borderRadius: 6,
                background: P.action, color: '#fff',
                fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-display)',
                whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 9999,
                display: 'flex', alignItems: 'baseline', gap: 5,
              }}>
                {name}
                <span style={{ opacity: 0.45, fontWeight: 400 }}>·</span>
                <span style={{ fontSize: 12, fontWeight: 500, opacity: 0.7 }}>
                  {p.days === 1 ? p.startDate : `${p.startDate} – ${p.endDate}`}
                </span>
                <span style={{ opacity: 0.45, fontWeight: 400 }}>·</span>
                <span style={{ fontSize: 12, fontWeight: 500, opacity: 0.7 }}>
                  {p.days} {p.days === 1 ? 'day' : 'days'}
                </span>
              </span>,
              document.body
            )}
          </span>
        );
      })}
      {extra > 0 && (
        <span style={{
          width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: '50%',
          background: P.bg, border: '2px solid #fff', boxSizing: 'content-box',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9, fontWeight: 700, color: P.inkSoft,
          marginLeft: AVATAR_OVERLAP,
          position: 'relative', zIndex: 0,
          fontFamily: 'var(--font-display)', flexShrink: 0,
          transition: `transform 250ms ${EASE_OUT}`,
          transform: 'translateY(0)',
        }}>+{extra}</span>
      )}
    </span>
  );
}

// ── Overlap popover ────────────────────────────────────────────────────────
function OverlapPopover({ req, overlapping, empDept }) {
  const [open, setOpen] = useState(false);
  const { rendered, visible } = usePopoverTransition(open);
  const [pos, setPos] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const sameDept = overlapping.filter(r => EMPLOYEES[r.employee]?.department === empDept);
  const otherDept = overlapping.filter(r => EMPLOYEES[r.employee]?.department !== empDept);

  const calcOverlapDays = (r) => {
    if (!req._selectedDates || !r._selectedDates) return null;
    const reqSet = new Set(req._selectedDates);
    return r._selectedDates.filter(d => reqSet.has(d)).length;
  };

  const handleClick = (e) => {
    e.stopPropagation();
    if (!open && ref.current) {
      const r = ref.current.getBoundingClientRect();
      setPos({ x: Math.max(8, r.left), y: r.bottom + 6 });
    }
    setOpen(o => !o);
  };

  if (sameDept.length === 0) {
    return <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: P.inkFaint }}>—</span>;
  }

  return (
    <span ref={ref} style={{ display: 'inline-flex', alignItems: 'center' }}>
      <span onClick={handleClick} style={{ cursor: 'pointer', borderRadius: 6, padding: '2px 0' }}>
        <AvatarStack people={sameDept} />
      </span>
      {rendered && pos && ReactDOM.createPortal(
        <div style={{
          position: 'fixed', left: pos.x, top: pos.y, zIndex: 400,
          width: 304,
          background: P.white, borderRadius: 12,
          border: `1px solid ${P.border}`,
          boxShadow: '0 8px 32px rgba(15,13,40,0.13), 0 0 0 1px rgba(15,13,40,0.04)',
          overflow: 'hidden',
          ...popoverStyle(visible, 'top left'),
        }}>
          {sameDept.length > 0 && <>
            <div style={{ padding: '10px 14px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: P.inkFaint }}>
                {empDept} also off
              </span>
              {sameDept.length >= 2 && (
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 20, padding: '1px 7px' }}>
                  ⚠ {sameDept.length} overlaps
                </span>
              )}
            </div>
            {sameDept.map(r => {
              const e2 = EMPLOYEES[r.employee];
              const period = r.startDate === r.endDate ? r.startDate : `${r.startDate} – ${r.endDate}`;
              const od = calcOverlapDays(r);
              return (
                <div key={r.id} style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 9, borderTop: `1px solid ${P.border}` }}>
                  <Avatar employeeId={r.employee} size={28} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 400, color: P.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e2?.name || r.employee}</div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: P.inkSoft, marginTop: 1 }}>{period}</div>
                  </div>
                  {od > 0 && <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: P.inkSoft, flexShrink: 0 }}>{od}d overlap</span>}
                </div>
              );
            })}
          </>}
        </div>,
        document.body
      )}
    </span>
  );
}

// ── Expense drawer ─────────────────────────────────────────────────────────
function ExpenseDrawer({ expense, onClose, onApprove, onReject }) {
  const emp = EMPLOYEES[expense.employee] || { name: expense.employee, initials: '?', color: '#e5e7eb' };
  const isPending = expense.status === 'pending';

  const { visible, close, closing } = useModalTransition(onClose, SHEET_CLOSE_DUR);
  const [rejectMode, setRejectMode] = React.useState(false);
  const [rejectReason, setRejectReason] = React.useState('');

  const SLIDE_DUR = 300;
  const secondPanel = rejectMode;
  const detailSlide = secondPanel ? 'translateX(-100%)' : 'translateX(0)';
  const editSlide   = secondPanel ? 'translateX(0)'     : 'translateX(100%)';
  const slideTransition = `transform ${SLIDE_DUR}ms ${EASE_DRAWER}`;

  const labelStyle = { flexShrink: 0, fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 14, color: P.ink, whiteSpace: 'nowrap' };
  const valueStyle = { flex: 1, minWidth: 0, fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 14, color: P.inkSoft, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 };

  const TableRow = ({ label, icon, children }) => (
    <div style={{ display: 'flex', alignItems: 'center', padding: '16px 24px', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
        {icon && <Icon name={icon} size={14} color={P.inkSoft} strokeWidth={1.75} style={{ flexShrink: 0 }} />}
        <div style={labelStyle}>{label}</div>
      </div>
      <div style={valueStyle}>{children}</div>
    </div>
  );
  const SectionHeader = ({ children }) => (
    <div style={{ padding: '24px 24px 6px', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 10, color: P.inkFaint, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
      {children}
    </div>
  );
  const Group = ({ children }) => {
    const items = React.Children.toArray(children).filter(Boolean);
    return (
      <div>
        {items.map((child, i) => (
          <React.Fragment key={i}>
            {i > 0 && <div style={{ height: 1, background: P.border, marginLeft: 24, marginRight: 24 }} />}
            {child}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const amountStr = `€ ${expense.amount.toFixed(2).replace('.', ',')}`;
  const sm = StatusMeta[expense.status] || StatusMeta.pending;

  const detailContent = (
    <div>
      <SectionHeader>Expense</SectionHeader>
      <Group>
        <TableRow label="Submitted by" icon="user">
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.name}</span>
          <Avatar employeeId={expense.employee} size={22} />
        </TableRow>
        <TableRow label="Amount" icon="coins">
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: P.ink }}>{amountStr}</span>
        </TableRow>
        <TableRow label="Category" icon="tag">
          {expense.category}
        </TableRow>
      </Group>

      <SectionHeader>Supporting</SectionHeader>
      <Group>
        <TableRow label="Description" icon="file-text">
          <span style={{ textAlign: 'right', whiteSpace: 'normal', lineHeight: 1.4 }}>{expense.description || '—'}</span>
        </TableRow>
        <TableRow label="Receipt" icon="paperclip">
          {expense.receipt
            ? <AppLink>{expense.receipt}</AppLink>
            : <span style={{ color: P.inkFaint }}>No receipt attached</span>
          }
        </TableRow>
      </Group>

      <SectionHeader>Admin</SectionHeader>
      <Group>
        <TableRow label="Status" icon="circle-dot">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: sm.bg, color: sm.color, borderRadius: 20, padding: '2px 8px', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', flexShrink: 0 }} />
            {sm.label}
          </span>
        </TableRow>
        <TableRow label="Submitted" icon="calendar">
          {expense.submittedAt}
        </TableRow>
        {expense.status === 'rejected' && expense.rejectReason && (
          <TableRow label="Reject reason" icon="message-square">
            <span style={{ textAlign: 'right', whiteSpace: 'normal', lineHeight: 1.4, color: '#dc2626' }}>{expense.rejectReason}</span>
          </TableRow>
        )}
      </Group>
    </div>
  );

  return (
    <React.Fragment>
      <div onClick={close} style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(15,13,40,0.25)',
        ...modalBackdropStyle(visible),
      }}>
      <div onClick={e => e.stopPropagation()} style={{
        position: 'absolute', top: 16, bottom: 16, right: 16, width: 480,
        background: P.white,
        borderRadius: 20,
        boxShadow: '0 24px 64px rgba(15,13,40,0.22), 0 0 0 1px rgba(15,13,40,0.06)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        ...sheetPanelStyle(visible, closing),
      }}>
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: `1px solid ${P.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {secondPanel && (
              <button onClick={() => setRejectMode(false)} style={{ flexShrink: 0, width: 30, height: 30, borderRadius: '50%', background: 'rgba(60,60,67,0.1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="arrow-left" size={15} color={P.ink} strokeWidth={2} />
              </button>
            )}
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: P.ink }}>
              {rejectMode ? 'Reject expense' : 'Expense details'}
            </span>
          </div>
          <button onClick={close} style={{ border: 'none', cursor: 'pointer', width: 30, height: 30, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(60,60,67,0.1)' }}>
            <Icon name="X" size={14} color={P.ink} strokeWidth={2.5} />
          </button>
        </div>

        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', transform: detailSlide, transition: slideTransition }}>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {detailContent}
            </div>
            {isPending && (
              <div style={{ flexShrink: 0, padding: '12px 20px', borderTop: `1px solid ${P.border}`, display: 'flex', gap: 10 }}>
                <button onClick={() => { setRejectReason(''); setRejectMode(true); }} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Icon name="X" size={13} color="#dc2626" strokeWidth={2.5} /> Reject
                </button>
                <button onClick={() => { onApprove(expense.id); close(); }} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: P.ink, color: P.white, cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Icon name="Check" size={13} color={P.white} strokeWidth={2.5} /> Approve
                </button>
              </div>
            )}
          </div>

          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', transform: editSlide, transition: slideTransition }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 14, color: P.inkSoft, lineHeight: 1.5 }}>
                You're rejecting <strong style={{ color: P.ink }}>{emp.name}</strong>'s {expense.category} expense ({amountStr}).
              </p>
              <div>
                <label style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 10, color: P.inkFaint, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Reason <span style={{ textTransform: 'none', fontWeight: 400 }}>(optional)</span></label>
                <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Explain why this expense is being rejected…" rows={3} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${P.border}`, background: P.bg, fontFamily: 'var(--font-body)', fontSize: 14, color: P.ink, resize: 'none', lineHeight: 1.5, boxSizing: 'border-box', outline: 'none' }} />
              </div>
            </div>
            <div style={{ flexShrink: 0, padding: '12px 20px', borderTop: `1px solid ${P.border}`, display: 'flex', gap: 10 }}>
              <button onClick={() => setRejectMode(false)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: `1px solid ${P.border}`, background: 'transparent', color: P.inkSoft, cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13 }}>Go back</button>
              <button onClick={() => { onReject(expense.id, rejectReason); close(); }} style={{ flex: 2, padding: '10px 0', borderRadius: 10, border: 'none', background: '#dc2626', color: P.white, cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13 }}>Confirm rejection</button>
            </div>
          </div>
        </div>
      </div>
      </div>
    </React.Fragment>
  );
}

// ── Choice drawer ─────────────────────────────────────────────────────────
function ChoiceDrawer({ choice, onClose, onApprove, onDecline }) {
  const emp = EMPLOYEES[choice.empId] || { name: choice.empId, initials: '?', color: '#e5e7eb' };
  const isPending = choice.status === 'pending';
  const { visible, close, closing } = useModalTransition(onClose, SHEET_CLOSE_DUR);
  const [declineMode, setDeclineMode] = React.useState(false);
  const [declineReason, setDeclineReason] = React.useState('');

  const SLIDE_DUR = 300;
  const detailSlide = declineMode ? 'translateX(-100%)' : 'translateX(0)';
  const editSlide   = declineMode ? 'translateX(0)'     : 'translateX(100%)';
  const slideTransition = `transform ${SLIDE_DUR}ms ${EASE_DRAWER}`;

  const labelStyle = { flexShrink: 0, fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 14, color: P.ink, whiteSpace: 'nowrap' };
  const valueStyle = { flex: 1, minWidth: 0, fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 14, color: P.inkSoft, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 };
  const TableRow = ({ label, icon, children }) => (
    <div style={{ display: 'flex', alignItems: 'center', padding: '16px 24px', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
        {icon && <Icon name={icon} size={14} color={P.inkSoft} strokeWidth={1.75} style={{ flexShrink: 0 }} />}
        <div style={labelStyle}>{label}</div>
      </div>
      <div style={valueStyle}>{children}</div>
    </div>
  );
  const SectionHeader = ({ children }) => (
    <div style={{ padding: '24px 24px 6px', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 10, color: P.inkFaint, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
      {children}
    </div>
  );
  const Group = ({ children }) => {
    const items = React.Children.toArray(children).filter(Boolean);
    return (
      <div>
        {items.map((child, i) => (
          <React.Fragment key={i}>
            {i > 0 && <div style={{ height: 1, background: P.border, marginLeft: 24, marginRight: 24 }} />}
            {child}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const sm = StatusMeta[choice.status] || StatusMeta.pending;

  return (
    <React.Fragment>
      <div onClick={close} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(15,13,40,0.25)', ...modalBackdropStyle(visible) }}>
      <div onClick={e => e.stopPropagation()} style={{
        position: 'absolute', top: 16, bottom: 16, right: 16, width: 480,
        background: P.white, borderRadius: 20,
        boxShadow: '0 24px 64px rgba(15,13,40,0.22), 0 0 0 1px rgba(15,13,40,0.06)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        ...sheetPanelStyle(visible, closing),
      }}>
        {/* Header */}
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: `1px solid ${P.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {declineMode && (
              <button onClick={() => setDeclineMode(false)} style={{ flexShrink: 0, width: 30, height: 30, borderRadius: '50%', background: 'rgba(60,60,67,0.1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="arrow-left" size={15} color={P.ink} strokeWidth={2} />
              </button>
            )}
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: P.ink }}>
              {declineMode ? 'Decline choice' : 'Choice details'}
            </span>
          </div>
          <button onClick={close} style={{ border: 'none', cursor: 'pointer', width: 30, height: 30, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(60,60,67,0.1)' }}>
            <Icon name="X" size={14} color={P.ink} strokeWidth={2.5} />
          </button>
        </div>

        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {/* Panel 1 — Detail */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', transform: detailSlide, transition: slideTransition }}>
            <div style={{ flex: 1, overflowY: 'auto' }}>

              {/* Hero */}
              <div style={{ padding: '20px 24px 16px' }}>
                <div style={{ background: P.bg, borderRadius: 16, padding: '20px 20px 20px', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
                    {/* Text */}
                    <div style={{ flex: 1, minWidth: 0, paddingBottom: 20, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ marginBottom: 32 }}>
                        <StatusPill status={choice.status || 'approved'} />
                      </div>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: P.ink, lineHeight: 1.35, marginBottom: 8 }}>
                        {choice.productName || choice.name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                        <span style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: 12, color: P.inkSoft }}>via</span>
                        <img src="../assets/coolblue-logo.png" alt="Coolblue" style={{ height: 14, objectFit: 'contain', display: 'block' }} />
                        <span style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: 12, color: P.inkSoft }}>Coolblue</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26, color: P.ink, letterSpacing: '-0.02em' }}>{choice.price.replace(' EUR', '')}</span>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: P.inkSoft }}>EUR</span>
                      </div>
                    </div>
                    {/* Illustration */}
                    {choice.illustration
                      ? <img src={choice.illustration} alt="" style={{ width: 110, height: 110, objectFit: 'contain', flexShrink: 0, display: 'block' }} />
                      : <div style={{ width: 90, height: 90, flexShrink: 0, background: P.white, borderRadius: 14, border: `1px solid ${P.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                          <Icon name="gift" size={36} color={P.inkFaint} strokeWidth={1.25} />
                        </div>
                    }
                  </div>
                  {/* Divider */}
                  <div style={{ height: 1, background: P.border, margin: '16px -20px 0 -20px' }} />
                  {/* Employee strip */}
                  <div style={{ display: 'flex', alignItems: 'center', padding: '12px 0', marginTop: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Avatar employeeId={choice.empId} size={28} />
                      <div>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: P.ink }}>{emp.name}</div>
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: P.inkSoft }}>Requested by</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {choice.productName && (<>
                <SectionHeader>Product</SectionHeader>
                <Group>
                  <TableRow label="Product" icon="package">
                    {choice.productUrl
                      ? <a href={choice.productUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: P.ink, fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, textDecoration: 'underline', textAlign: 'right' }}>
                          <span style={{ whiteSpace: 'normal', lineHeight: 1.4 }}>{choice.productName}</span>
                          <Icon name="ExternalLink" size={12} color={P.inkSoft} strokeWidth={2} style={{ flexShrink: 0 }} />
                        </a>
                      : <span style={{ textAlign: 'right', whiteSpace: 'normal', lineHeight: 1.4 }}>{choice.productName}</span>
                    }
                  </TableRow>
                  {choice.productNumber && <TableRow label="Product number" icon="hash">{choice.productNumber}</TableRow>}
                  {choice.orderId && <TableRow label="Order ID" icon="receipt">{choice.orderId}</TableRow>}
                  {choice.orderDate && <TableRow label="Order date" icon="calendar">{choice.orderDate}</TableRow>}
                  {choice.depreciation && <TableRow label="Depreciation" icon="trending-down">{choice.depreciation} months</TableRow>}
                </Group>
              </>)}
              <SectionHeader>Dates</SectionHeader>
              <Group>
                <TableRow label="Start date" icon="calendar">{choice.sDate}</TableRow>
                <TableRow label="End date" icon="calendar-x">{choice.eDate}</TableRow>
                <TableRow label="Date of choice" icon="clock">{choice.cDate}</TableRow>
              </Group>
              {choice.transactions?.length > 0 && (<>
                <SectionHeader>Future transactions</SectionHeader>
                <Group>
                  {choice.transactions.map((t, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '10px 24px', gap: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
                        <Icon name="arrow-right-left" size={14} color={P.inkSoft} strokeWidth={1.75} style={{ flexShrink: 0 }} />
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 14, color: P.ink, whiteSpace: 'nowrap' }}>{t.label}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: P.ink }}>{t.amount}</span>
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: P.inkFaint }}>{t.date}</span>
                      </div>
                    </div>
                  ))}
                </Group>
              </>)}
              {choice.status === 'declined' && choice.declineReason && (<>
                <SectionHeader>Admin</SectionHeader>
                <Group>
                  <TableRow label="Decline reason" icon="message-square">
                    <span style={{ textAlign: 'right', whiteSpace: 'normal', lineHeight: 1.4, color: '#dc2626' }}>{choice.declineReason}</span>
                  </TableRow>
                </Group>
              </>)}
            </div>
            {isPending && (
              <div style={{ flexShrink: 0, padding: '12px 20px', borderTop: `1px solid ${P.border}`, display: 'flex', gap: 10 }}>
                <button onClick={() => { setDeclineReason(''); setDeclineMode(true); }} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Icon name="X" size={13} color="#dc2626" strokeWidth={2.5} /> Decline
                </button>
                <button onClick={() => { onApprove(choice.id); close(); }} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: P.ink, color: P.white, cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Icon name="Check" size={13} color={P.white} strokeWidth={2.5} /> Approve
                </button>
              </div>
            )}
          </div>

          {/* Panel 2 — Decline with reason */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', transform: editSlide, transition: slideTransition }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 14, color: P.inkSoft, lineHeight: 1.5 }}>
                You're declining <strong style={{ color: P.ink }}>{emp.name}</strong>'s request for {choice.name}.
              </p>
              <div>
                <label style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 10, color: P.inkFaint, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Reason <span style={{ textTransform: 'none', fontWeight: 400 }}>(optional)</span></label>
                <textarea value={declineReason} onChange={e => setDeclineReason(e.target.value)} placeholder="Explain why this choice is being declined…" rows={3} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${P.border}`, background: P.bg, fontFamily: 'var(--font-body)', fontSize: 14, color: P.ink, resize: 'none', lineHeight: 1.5, boxSizing: 'border-box', outline: 'none' }} />
              </div>
            </div>
            <div style={{ flexShrink: 0, padding: '12px 20px', borderTop: `1px solid ${P.border}`, display: 'flex', gap: 10 }}>
              <button onClick={() => setDeclineMode(false)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: `1px solid ${P.border}`, background: 'transparent', color: P.inkSoft, cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13 }}>Go back</button>
              <button onClick={() => { onDecline(choice.id, declineReason); close(); }} style={{ flex: 2, padding: '10px 0', borderRadius: 10, border: 'none', background: '#dc2626', color: P.white, cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13 }}>Confirm decline</button>
            </div>
          </div>
        </div>
      </div>
      </div>
    </React.Fragment>
  );
}

// ── Table row ──────────────────────────────────────────────────────────────
const TH = ({ children, style }) => (
  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 11, color: P.inkSoft, textTransform: 'uppercase', letterSpacing: '0.06em', ...style }}>{children}</div>
);

const AppLink = ({ children, onClick, style }) => (
  <span onClick={onClick} style={{ color: P.ink, textDecoration: 'underline', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', ...style }}>{children}</span>
);

function RequestRow({ req, requests, onApprove, onDecline, onDetail, onDeclineDirectly, onEdit, onCancel, selected, onToggle, onViewInCalendar, showStatus, removing }) {
  const emp = EMPLOYEES[req.employee] || { name: req.employee, initials: '?', color: '#e5e7eb', entitlement: 20 };
  const [hover, setHover] = useState(false);
  const usedDays = requests
    .filter(r => r.employee === req.employee && r.id !== req.id && (r.status === 'approved' || r.status === 'pending'))
    .reduce((s, r) => s + r.days, 0);
  const remaining = Math.max(0, emp.entitlement - usedDays - req.days);
  const overlapping = getOverlapping(req, requests);
  const gridCols = showStatus ? '32px 1.8fr 1fr 0.9fr 0.7fr 0.7fr 1fr 1fr 96px' : '32px 1.8fr 0.9fr 0.7fr 0.7fr 1fr 1fr 96px';
  return (
    <div style={{
      display: 'grid',
      gridTemplateRows: removing ? '0fr' : '1fr',
      transition: PREFERS_REDUCED_MOTION ? 'none' : `grid-template-rows 200ms ${EASE_OUT}`,
      overflow: removing ? 'hidden' : 'visible',
    }}>
      <div style={{ minHeight: 0 }}>
        <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onClick={() => { if (!removing) onDetail(req); }}
          style={{
            display: 'grid', gridTemplateColumns: gridCols,
            alignItems: 'center', gap: 12, padding: '0 20px', minHeight: 52,
            borderBottom: `1px solid ${P.border}`,
            background: selected ? '#f5f3ff' : hover ? P.bg : P.white,
            cursor: removing ? 'default' : 'pointer',
            transition: PREFERS_REDUCED_MOTION ? 'background 0.1s, opacity 100ms linear' : `background 0.1s, opacity 150ms ${EASE_OUT}`,
            opacity: removing ? 0 : 1,
            pointerEvents: removing ? 'none' : 'auto',
          }}>
          <input type="checkbox" checked={selected} onClick={e => e.stopPropagation()} onChange={() => onToggle(req.id)} style={{ cursor: 'pointer', accentColor: P.action }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
            <Avatar employeeId={req.employee} size={24} style={{ border: '2px solid #fff', boxSizing: 'content-box' }} />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500, color: P.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.name}</span>
          </div>
          {showStatus && <StatusDot status={req.status} />}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: LEAVE_COLORS[req.type] || P.inkFaint, border: `1.5px solid ${LEAVE_BORDER_COLORS[req.type] || P.border}`, flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: P.ink }}>{req.type}</span>
            {req.document && <Icon name="paperclip" size={12} color={P.inkFaint} strokeWidth={1.75} style={{ flexShrink: 0 }} />}
          </span>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: P.ink }}>{req.days} {req.days === 1 ? 'day' : 'days'}</span>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: P.ink }}>{req.startDate}</span>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: req.startDate === req.endDate ? P.inkFaint : P.ink }}>
            {req.startDate === req.endDate ? '—' : req.endDate}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center' }}>
            <OverlapPopover req={req} overlapping={overlapping} empDept={emp.department} />
          </span>
          <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
            {req.status === 'pending' && (<>
              <button title="Decline" onClick={e => { e.stopPropagation(); onDeclineDirectly ? onDeclineDirectly(req) : onDetail(req); }}
                onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.borderColor = '#fca5a5'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.borderColor = '#fecaca'; }}
                style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name="X" size={14} color="#dc2626" strokeWidth={2.5} />
              </button>
              <button title="Approve" onClick={() => onApprove(req.id)}
                onMouseEnter={e => { e.currentTarget.style.background = '#dcfce7'; e.currentTarget.style.borderColor = '#86efac'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#f0fdf4'; e.currentTarget.style.borderColor = '#bbf7d0'; }}
                style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #bbf7d0', background: '#f0fdf4', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name="Check" size={14} color="#16a34a" strokeWidth={2.5} />
              </button>
            </>)}
            <ActionMenu req={req} onViewDetails={() => onDetail(req)} onViewInCalendar={onViewInCalendar} onEdit={() => onEdit(req)} onCancel={() => onCancel(req.id)} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Add expense modal ──────────────────────────────────────────────────────
function AddExpenseModal({ categories, onClose, onSave }) {
  const { visible, closing, close } = useModalTransition(onClose, SHEET_CLOSE_DUR);
  const [empId, setEmpId] = useState('');
  const [category, setCategory] = useState(categories[0] || '');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptLeaving, setReceiptLeaving] = useState(false);
  const [dropAccepted, setDropAccepted] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);
  const [errors, setErrors] = useState({});

  const acceptFile = (f) => {
    setDropAccepted(true);
    setTimeout(() => { setDropAccepted(false); setReceiptFile(f); }, 180);
  };
  const removeFile = () => {
    setReceiptLeaving(true);
    setTimeout(() => { setReceiptLeaving(false); setReceiptFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }, 150);
  };

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [close]);

  const validate = () => {
    const errs = {};
    if (!empId) errs.empId = true;
    if (!category) errs.category = true;
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) errs.amount = true;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = () => {
    if (!validate()) return;
    const today = new Date();
    const day = today.getDate();
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    onSave({ employee: empId, category, amount: parseFloat(amount), currency: 'EUR', description: note, receipt: receiptFile ? receiptFile.name : '', submittedAt: `${day} ${months[today.getMonth()]}` });
    close();
  };

  const selectStyle = (hasErr) => ({
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: `1px solid ${hasErr ? '#ef4444' : P.border}`,
    background: P.bg, fontFamily: 'var(--font-body)', fontSize: 14,
    color: P.ink, outline: 'none', appearance: 'none', cursor: 'pointer',
  });
  const inputStyle = (hasErr) => ({
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: `1px solid ${hasErr ? '#ef4444' : P.border}`,
    background: P.bg, fontFamily: 'var(--font-body)', fontSize: 14,
    color: P.ink, outline: 'none', boxSizing: 'border-box',
  });
  const labelStyle = { fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12, color: P.inkSoft, marginBottom: 6, display: 'block' };
  const sortedEmps = Object.entries(EMPLOYEES).sort((a,b) => a[1].name.localeCompare(b[1].name));

  return (
    <div onClick={close} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(15,13,40,0.25)', ...modalBackdropStyle(visible) }}>
      <div onClick={e => e.stopPropagation()} style={{
        position: 'absolute', top: 16, bottom: 16, right: 16, width: 480,
        background: P.white, borderRadius: 20,
        boxShadow: '0 24px 64px rgba(15,13,40,0.22), 0 0 0 1px rgba(15,13,40,0.06)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        ...sheetPanelStyle(visible, closing),
      }}>
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: `1px solid ${P.border}` }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: P.ink }}>Add expense</span>
          <button onClick={close} style={{ border: 'none', cursor: 'pointer', width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(60,60,67,0.1)' }}>
            <Icon name="X" size={14} color={P.ink} strokeWidth={2.5} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label style={labelStyle}>Employee <span style={{ color: '#ef4444' }}>*</span></label>
            <div style={{ position: 'relative' }}>
              <select value={empId} onChange={e => { setEmpId(e.target.value); setErrors(prev => ({ ...prev, empId: false })); }} style={selectStyle(errors.empId)}>
                <option value="">Select employee…</option>
                {sortedEmps.map(([id, emp]) => <option key={id} value={id}>{emp.name}</option>)}
              </select>
              <Icon name="chevron-down" size={14} color={P.inkFaint} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Category <span style={{ color: '#ef4444' }}>*</span></label>
              <div style={{ position: 'relative' }}>
                <select value={category} onChange={e => setCategory(e.target.value)} style={selectStyle(errors.category)}>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <Icon name="chevron-down" size={14} color={P.inkFaint} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Amount (EUR) <span style={{ color: '#ef4444' }}>*</span></label>
              <input type="number" min="0" step="0.01" value={amount} onChange={e => { setAmount(e.target.value); setErrors(prev => ({ ...prev, amount: false })); }} placeholder="0.00" style={inputStyle(errors.amount)} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Note / description</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="What was this expense for?" rows={3} style={{ ...inputStyle(false), resize: 'none', lineHeight: 1.5 }} />
          </div>
          <div>
            <label style={labelStyle}>Receipt <span style={{ fontWeight: 400, color: P.inkFaint }}>(optional)</span></label>
            <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) acceptFile(e.target.files[0]); }} />
            {receiptFile ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, border: `1px solid ${P.border}`, background: P.bg, opacity: receiptLeaving ? 0 : 1, transform: receiptLeaving ? 'translateX(6px)' : 'translateX(0)', transition: `opacity 150ms ${EASE_OUT}, transform 150ms ${EASE_OUT}`, animation: `fileRowIn 220ms ${EASE_OUT}` }}>
                <Icon name="paperclip" size={14} color={P.inkFaint} />
                <span style={{ flex: 1, fontFamily: 'var(--font-body)', fontSize: 13, color: P.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{receiptFile.name}</span>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: P.inkFaint, flexShrink: 0 }}>{(receiptFile.size / 1024).toFixed(0)} KB</span>
                <button onClick={removeFile} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center', color: P.inkFaint }}>
                  <Icon name="x" size={14} strokeWidth={2} />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current.click()}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) acceptFile(f); }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '20px 16px', borderRadius: 8, border: `1.5px dashed ${dragging || dropAccepted ? P.action : P.border}`, background: dragging ? '#f5f3ff' : dropAccepted ? '#ede9fe' : P.bg, cursor: 'pointer', transform: dropAccepted ? 'scale(1.02)' : 'scale(1)', transition: `border-color 120ms, background 120ms, transform 180ms ${EASE_OUT}` }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', transform: dragging ? 'translateY(-3px)' : 'translateY(0)', transition: `transform ${dragging ? `200ms ${EASE_OUT}` : `150ms ${EASE_BOUNCE}`}` }}>
                  <Icon name="upload" size={18} color={dragging || dropAccepted ? P.action : P.inkFaint} />
                </span>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: dragging || dropAccepted ? P.action : P.inkSoft, transition: `color 120ms` }}>
                  Drop a file or <span style={{ color: P.action, fontWeight: 600 }}>browse</span>
                </span>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: P.inkFaint }}>PDF, PNG, JPG up to 10 MB</span>
              </div>
            )}
          </div>
        </div>
        <div style={{ flexShrink: 0, display: 'flex', gap: 10, padding: '16px 24px', borderTop: `1px solid ${P.border}` }}>
          <button onClick={close} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: `1px solid ${P.border}`, background: P.white, cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: P.inkSoft }}>Cancel</button>
          <button onClick={submit} style={{ flex: 2, padding: '10px 0', borderRadius: 8, border: 'none', background: P.action, cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: '#fff' }}>Add expense</button>
        </div>
      </div>
    </div>
  );
}

// ── Expense row ────────────────────────────────────────────────────────────
function ExpenseRow({ exp, onApprove, onDetail, showStatus, selected, onToggle }) {
  const emp = EMPLOYEES[exp.employee] || { name: exp.employee, initials: '?', color: '#e5e7eb' };
  const [hover, setHover] = useState(false);
  const gridCols = showStatus
    ? '32px 1.8fr 1fr 1fr 2fr 0.8fr 0.7fr 96px'
    : '32px 1.8fr 1fr 2fr 0.8fr 0.7fr 96px';

  const amountStr = `€ ${exp.amount.toFixed(2).replace('.', ',')}`;

  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onClick={() => onDetail(exp)}
      style={{
        display: 'grid', gridTemplateColumns: gridCols,
        alignItems: 'center', gap: 12, padding: '0 20px', minHeight: 52,
        borderBottom: `1px solid ${P.border}`,
        background: selected ? '#f5f3ff' : hover ? P.bg : P.white,
        cursor: 'pointer',
        transition: `background 0.1s`,
      }}>
      <input type="checkbox" checked={!!selected} onClick={e => e.stopPropagation()} onChange={() => onToggle && onToggle(exp.id)} style={{ cursor: 'pointer', accentColor: P.action }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
        <Avatar employeeId={exp.employee} size={24} style={{ border: '2px solid #fff', boxSizing: 'content-box' }} />
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500, color: P.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.name}</span>
      </div>
      {showStatus && <StatusDot status={exp.status} />}
      <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: P.ink }}>{exp.category}</span>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: P.inkSoft, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exp.description}</span>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: P.ink }}>{amountStr}</span>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: P.inkFaint }}>{exp.submittedAt}</span>
      <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
        {exp.status === 'pending' && (<>
          <button title="Reject" onClick={() => onDetail(exp)}
            onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.borderColor = '#fca5a5'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.borderColor = '#fecaca'; }}
            style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="X" size={14} color="#dc2626" strokeWidth={2.5} />
          </button>
          <button title="Approve" onClick={() => onApprove(exp.id)}
            onMouseEnter={e => { e.currentTarget.style.background = '#dcfce7'; e.currentTarget.style.borderColor = '#86efac'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#f0fdf4'; e.currentTarget.style.borderColor = '#bbf7d0'; }}
            style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #bbf7d0', background: '#f0fdf4', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="Check" size={14} color="#16a34a" strokeWidth={2.5} />
          </button>
        </>)}
      </div>
    </div>
  );
}

// ── Expenses screen ─────────────────────────────────────────────────────────
function ExpensesScreen({ expenses, categories, onApprove, onDetail, onAdd }) {
  const categoryOpts = [['all', 'All categories'], ...categories.map(c => [c, c])];
  const [tab, setTab] = useState('pending');
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [pillLeaving, setPillLeaving] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  useEffect(() => {
    if (selected.size === 0 && !pillLeaving) return;
    if (selected.size > 0) { setPillLeaving(false); return; }
    setPillLeaving(true);
    const t = setTimeout(() => setPillLeaving(false), 120);
    return () => clearTimeout(t);
  }, [selected.size]);
  const pendingCount = expenses.filter(e => e.status === 'pending').length;
  const filtered = (tab === 'pending' ? expenses.filter(e => e.status === 'pending')
    : tab === 'approved' ? expenses.filter(e => e.status === 'approved')
    : tab === 'declined' ? expenses.filter(e => e.status === 'rejected')
    : expenses)
    .filter(e => {
      const emp = EMPLOYEES[e.employee];
      if (searchText.trim() && !(emp?.name || e.employee).toLowerCase().includes(searchText.trim().toLowerCase())) return false;
      if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
      if (deptFilter !== 'all' && emp?.department !== deptFilter) return false;
      return true;
    });
  const showStatus = tab === 'all';
  const gridCols = showStatus
    ? '32px 1.8fr 1fr 1fr 2fr 0.8fr 0.7fr 96px'
    : '32px 1.8fr 1fr 2fr 0.8fr 0.7fr 96px';
  const toggleSelect = (id) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allSelected = filtered.length > 0 && filtered.every(e => selected.has(e.id));
  const toggleAll = () => {
    if (allSelected) setSelected(prev => { const n = new Set(prev); filtered.forEach(e => n.delete(e.id)); return n; });
    else setSelected(prev => new Set([...prev, ...filtered.map(e => e.id)]));
  };
  const selectedPending = [...selected].filter(id => expenses.find(e => e.id === id)?.status === 'pending');

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, position: 'relative', animation: `screenEnter 180ms ${EASE_OUT}` }}>
      <PageHeader
        title="Expenses"
        subtitle="Review and approve team expense claims"
        tabs={
          <TabBar
            tabs={[
              { id: 'pending', label: `Pending${pendingCount > 0 ? ` (${pendingCount})` : ''}` },
              { id: 'approved', label: 'Approved' },
              { id: 'declined', label: 'Declined' },
              { id: 'all', label: 'All expenses' },
            ]}
            activeTab={tab}
            onTabChange={(v) => { setTab(v); setSelected(new Set()); }}
          />
        }
      >
        <button onClick={() => setAddOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 8, border: 'none', background: P.action, color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13 }}>
          <Icon name="Plus" size={14} color="#fff" strokeWidth={2.5} /> Add expense
        </button>
      </PageHeader>
      <FilterToolbar
        searchText={searchText} onSearch={v => { setSearchText(v); setSelected(new Set()); }}
        filter={categoryFilter} onFilter={v => { setCategoryFilter(v); setSelected(new Set()); }} filterOpts={categoryOpts}
        deptFilter={deptFilter} onDeptFilter={v => { setDeptFilter(v); setSelected(new Set()); }}
      />
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
        <div style={{ background: P.white, borderRadius: 12, border: `1px solid ${P.border}`, overflow: 'clip' }}>
          <div style={{ display: 'grid', gridTemplateColumns: gridCols, alignItems: 'center', gap: 12, padding: '0 20px', height: 38, borderBottom: `1px solid ${P.border}`, background: P.bg, position: 'sticky', top: 0, zIndex: 5 }}>
            <input type="checkbox" checked={allSelected} onChange={toggleAll} style={{ cursor: 'pointer', accentColor: P.action }} />
            <TH>Submitted by</TH>
            {showStatus && <TH>Status</TH>}
            <TH>Category</TH>
            <TH>Note</TH>
            <TH>Amount</TH>
            <TH>Date</TH>
            <div />
          </div>
          {filtered.length === 0 ? (
            <div style={{ padding: '60px 24px', textAlign: 'center' }}>
              <Icon name="receipt" size={32} color={P.border} style={{ marginBottom: 12 }} />
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: P.inkFaint }}>No {tab === 'pending' ? 'pending ' : tab === 'approved' ? 'approved ' : tab === 'declined' ? 'declined ' : ''}expenses</div>
            </div>
          ) : filtered.map(exp => (
            <ExpenseRow key={exp.id} exp={exp} onApprove={onApprove} onDetail={onDetail} showStatus={showStatus} selected={selected.has(exp.id)} onToggle={toggleSelect} />
          ))}
        </div>
      </div>
      {/* Bulk action bar */}
      {(selected.size > 0 || pillLeaving) && (
        <div style={{ position: 'absolute', bottom: 16, left: 0, right: 0, display: 'flex', justifyContent: 'center', pointerEvents: 'none', zIndex: 10 }}>
          <div style={{
            pointerEvents: pillLeaving ? 'none' : 'auto',
            background: P.action, borderRadius: 10, padding: '6px 14px',
            display: 'flex', alignItems: 'center', gap: 10,
            boxShadow: '0 6px 24px rgba(15,13,40,0.3)',
            animation: pillLeaving
              ? `pillFadeDown 120ms ${EASE_OUT} forwards`
              : `pillFadeUp 0.15s ${EASE_OUT}`,
          }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12, color: '#fff' }}>
              {selected.size} selected
            </span>
            {selectedPending.length > 0 && (
              <button onClick={() => { selectedPending.forEach(id => onApprove(id)); setSelected(new Set()); }} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 12px', borderRadius: 7, border: 'none',
                background: '#22c55e', color: '#fff', cursor: 'pointer',
                fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 11,
              }}>
                <Icon name="CheckCircle" size={12} color="#fff" strokeWidth={2} />
                Approve{selectedPending.length > 1 ? ` all ${selectedPending.length}` : ''}
              </button>
            )}
            <button onClick={() => setSelected(new Set())} style={{
              padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.25)',
              background: 'transparent', color: '#fff', cursor: 'pointer',
              fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 11,
            }}>Clear</button>
          </div>
        </div>
      )}
      {addOpen && <AddExpenseModal categories={categories} onClose={() => setAddOpen(false)} onSave={(exp) => { onAdd(exp); setAddOpen(false); }} />}
    </div>
  );
}

// ── Requests screen ────────────────────────────────────────────────────────
const PAGE_SIZE = 10;

function RequestsScreen({ requests, onApprove, onDecline, onSave, onCancel, onViewInCalendar, onNav }) {
  const [tab, setTab] = useState('pending');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState(null);
  const [detailDeclineMode, setDetailDeclineMode] = useState(false);
  const [editReq, setEditReq] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [pillLeaving, setPillLeaving] = useState(false);
  useEffect(() => {
    if (selected.size === 0 && !pillLeaving) return;
    if (selected.size > 0) { setPillLeaving(false); return; }
    setPillLeaving(true);
    const t = setTimeout(() => setPillLeaving(false), 120);
    return () => clearTimeout(t);
  }, [selected.size]);
  const prevPendingIdsRef = useRef(new Set());
  const removalTimersRef = useRef(new Set());
  const [removingIds, setRemovingIds] = useState(() => new Set());
  useEffect(() => {
    const currentPendingIds = new Set(requests.filter(r => r.status === 'pending').map(r => r.id));
    const justLeft = [...prevPendingIdsRef.current].filter(id => !currentPendingIds.has(id));
    if (justLeft.length > 0) {
      setRemovingIds(prev => new Set([...prev, ...justLeft]));
      const t = setTimeout(() => {
        setRemovingIds(prev => {
          const next = new Set(prev);
          justLeft.forEach(id => next.delete(id));
          return next;
        });
        removalTimersRef.current.delete(t);
      }, 220);
      removalTimersRef.current.add(t);
    }
    prevPendingIdsRef.current = currentPendingIds;
  }, [requests]);
  useEffect(() => () => { removalTimersRef.current.forEach(clearTimeout); }, []);
  const [searchText, setSearchText] = useState('');
  const [leaveFilter, setLeaveFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const filtered = (tab === 'pending' ? requests.filter(r => r.status === 'pending')
    : tab === 'approved' ? requests.filter(r => r.status === 'approved')
    : tab === 'declined' ? requests.filter(r => r.status === 'rejected')
    : requests)
    .filter(r => {
      const emp = EMPLOYEES[r.employee];
      if (searchText.trim() && !(emp?.name || r.employee).toLowerCase().includes(searchText.trim().toLowerCase())) return false;
      if (leaveFilter !== 'all' && r.type !== leaveFilter) return false;
      if (deptFilter !== 'all' && emp?.department !== deptFilter) return false;
      return true;
    });
  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);
  const safePage = Math.min(page, Math.max(1, pageCount));
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const toggleSelect = (id) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allSelected = paginated.length > 0 && paginated.every(r => selected.has(r.id));
  const toggleAll = () => {
    if (allSelected) setSelected(prev => { const n = new Set(prev); paginated.forEach(r => n.delete(r.id)); return n; });
    else setSelected(prev => new Set([...prev, ...paginated.map(r => r.id)]));
  };
  const selectedPending = [...selected].filter(id => requests.find(r => r.id === id)?.status === 'pending');
  const displayRows = tab === 'pending'
    ? [...paginated, ...[...removingIds].filter(id => !paginated.some(r => r.id === id)).map(id => requests.find(r => r.id === id)).filter(Boolean)]
    : paginated;
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, position: 'relative', animation: `screenEnter 180ms ${EASE_OUT}` }}>
      <PageHeader
        title="Time off requests"
        subtitle="Manage your team's time off"
        tabs={
          <TabBar
            tabs={[
              { id: 'pending', label: `Pending${pendingCount > 0 ? ` (${pendingCount})` : ''}` },
              { id: 'approved', label: 'Approved' },
              { id: 'declined', label: 'Declined' },
              { id: 'all', label: 'All requests' },
            ]}
            activeTab={tab}
            onTabChange={(v) => { setTab(v); setSelected(new Set()); setPage(1); }}
          />
        }
      >
        <button onClick={() => setAddOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 8, border: 'none', background: P.action, color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13 }}>
          <Icon name="Plus" size={14} color="#fff" strokeWidth={2.5} /> Add time off
        </button>
      </PageHeader>
      <FilterToolbar
        searchText={searchText} onSearch={v => { setSearchText(v); setPage(1); }}
        filter={leaveFilter} onFilter={v => { setLeaveFilter(v); setPage(1); }}
        deptFilter={deptFilter} onDeptFilter={v => { setDeptFilter(v); setPage(1); }}
      />
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
      <div style={{ background: P.white, borderRadius: 12, border: `1px solid ${P.border}`, overflow: 'clip' }}>
        <div style={{ display: 'grid', gridTemplateColumns: (tab === 'all' || tab === 'declined') ? '32px 1.8fr 1fr 0.9fr 0.7fr 0.7fr 1fr 1fr 96px' : '32px 1.8fr 0.9fr 0.7fr 0.7fr 1fr 1fr 96px', alignItems: 'center', gap: 12, padding: '0 20px', height: 38, borderBottom: `1px solid ${P.border}`, background: P.bg, position: 'sticky', top: 0, zIndex: 5 }}>
          <input type="checkbox" checked={allSelected} onChange={toggleAll} style={{ cursor: 'pointer', accentColor: P.action }} />
          <TH>Requested by</TH>{(tab === 'all' || tab === 'declined') && <TH>Status</TH>}<TH>Leave type</TH><TH>Duration</TH><TH>Date from</TH><TH>Date to</TH><TH>Also off</TH><div />
        </div>
        {displayRows.length === 0 ? (
          <div style={{ padding: '60px 24px', textAlign: 'center' }}>
            <Icon name="Inbox" size={32} color={P.border} style={{ marginBottom: 12 }} />
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: P.inkFaint }}>No {tab === 'pending' ? 'pending ' : tab === 'approved' ? 'approved ' : tab === 'declined' ? 'declined ' : ''}requests</div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: P.inkFaint, marginTop: 4 }}>{tab === 'pending' ? 'New requests from your team will appear here.' : ''}</div>
          </div>
        ) : displayRows.map(req => (
          <RequestRow key={req.id} req={req} requests={requests} onApprove={onApprove} onDecline={onDecline} onDetail={r => { setDetailDeclineMode(false); setDetail(r); }} onDeclineDirectly={r => { setDetailDeclineMode(true); setDetail(r); }} onEdit={setEditReq} onCancel={onCancel} selected={selected.has(req.id)} onToggle={toggleSelect} onViewInCalendar={onViewInCalendar} showStatus={tab === 'all' || tab === 'declined'} removing={removingIds.has(req.id)} />
        ))}
        {filtered.length > 0 && (
          <div style={{ padding: '8px 16px', borderTop: `1px solid ${P.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: P.inkFaint }}>
              {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length} {filtered.length === 1 ? 'record' : 'records'}
            </span>
            {pageCount > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1} style={{
                  display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6,
                  border: `1px solid ${P.border}`, background: P.white, cursor: safePage === 1 ? 'default' : 'pointer',
                  fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 12,
                  color: safePage === 1 ? P.inkFaint : P.ink, opacity: safePage === 1 ? 0.5 : 1,
                }}>
                  <Icon name="ChevronLeft" size={13} color={safePage === 1 ? P.inkFaint : P.ink} strokeWidth={2} /> Prev
                </button>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 12, color: P.inkSoft, padding: '0 6px' }}>
                  {safePage} / {pageCount}
                </span>
                <button onClick={() => setPage(p => Math.min(pageCount, p + 1))} disabled={safePage === pageCount} style={{
                  display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6,
                  border: `1px solid ${P.border}`, background: P.white, cursor: safePage === pageCount ? 'default' : 'pointer',
                  fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 12,
                  color: safePage === pageCount ? P.inkFaint : P.ink, opacity: safePage === pageCount ? 0.5 : 1,
                }}>
                  Next <Icon name="ChevronRight" size={13} color={safePage === pageCount ? P.inkFaint : P.ink} strokeWidth={2} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      </div>
      {/* Bulk action bar */}
      {(selected.size > 0 || pillLeaving) && (
        <div style={{ position: 'absolute', bottom: 16, left: 0, right: 0, display: 'flex', justifyContent: 'center', pointerEvents: 'none', zIndex: 10 }}>
          <div style={{
            pointerEvents: pillLeaving ? 'none' : 'auto',
            background: P.action, borderRadius: 10, padding: '6px 14px',
            display: 'flex', alignItems: 'center', gap: 10,
            boxShadow: '0 6px 24px rgba(15,13,40,0.3)',
            animation: pillLeaving
              ? `pillFadeDown 120ms ${EASE_OUT} forwards`
              : `pillFadeUp 0.15s ${EASE_OUT}`,
          }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12, color: '#fff' }}>
              {selected.size} selected
            </span>
            {selectedPending.length > 0 && (
              <button onClick={() => { selectedPending.forEach(id => onApprove(id)); setSelected(new Set()); }} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 12px', borderRadius: 7, border: 'none',
                background: '#22c55e', color: '#fff', cursor: 'pointer',
                fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 11,
              }}>
                <Icon name="CheckCircle" size={12} color="#fff" strokeWidth={2} />
                Approve{selectedPending.length > 1 ? ` all ${selectedPending.length}` : ''}
              </button>
            )}
            <button onClick={() => setSelected(new Set())} style={{
              padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.25)',
              background: 'transparent', color: '#fff', cursor: 'pointer',
              fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 11,
            }}>Clear</button>
          </div>
        </div>
      )}
      {detail && (
        <CalendarDrawer key={detail.id} req={detail} requests={requests} onClose={() => { setDetail(null); setDetailDeclineMode(false); }}
          onApprove={(id) => { onApprove(id); setDetail(null); }}
          onDecline={(id, reason) => { onDecline(id, reason); setDetail(null); }}
          onCancel={(id, reason) => { onCancel(id, reason); setDetail(null); }}
          onSave={(req) => { onSave(req); setDetail(req); }}
          initialDeclineMode={detailDeclineMode}
        />
      )}
      {(addOpen || editReq) && (
        <AddTimeOffModal
          existing={editReq || null}
          requests={requests}
          onClose={() => { setAddOpen(false); setEditReq(null); }}
          onSave={(req) => { onSave(req); setAddOpen(false); setEditReq(null); }}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── Team Absences Calendar ─────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

function buildAbsenceMap(requests) {
  const map = {};
  for (const req of requests.filter(r => r.status === 'approved' || r.status === 'pending')) {
    if (!map[req.employee]) map[req.employee] = {};
    if (req._selectedDates && req._selectedDates.length > 0) {
      for (const iso of req._selectedDates) {
        if (!map[req.employee][iso]) {
          map[req.employee][iso] = { type: req.type, status: req.status, requestId: req.id };
        }
      }
    } else {
      const start = parseDisplayDate(req.startDate);
      const end   = parseDisplayDate(req.endDate) || start;
      if (!start) continue;
      for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
        const iso = isoDate(d);
        if (!map[req.employee][iso]) {
          map[req.employee][iso] = { type: req.type, status: req.status, requestId: req.id };
        }
      }
    }
  }
  return map;
}

// ── Month picker ───────────────────────────────────────────────────────────
function MonthPicker({ currentDate, onSelect, onClose }) {
  const [year, setYear] = useState(currentDate.getFullYear());
  const ref = useRef(null);
  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  return (
    <div ref={ref} style={{
      position: 'absolute', top: 48, left: 0, zIndex: 60,
      background: P.white, border: `1px solid ${P.border}`, borderRadius: 12,
      boxShadow: '0 8px 32px rgba(0,0,0,0.12)', padding: '14px', width: 280,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <button onClick={() => setYear(y => y - 1)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 4, display: 'flex' }}>
          <Icon name="ChevronLeft" size={14} color={P.inkSoft} />
        </button>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: P.ink }}>{year}</span>
        <button onClick={() => setYear(y => y + 1)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 4, display: 'flex' }}>
          <Icon name="ChevronRight" size={14} color={P.inkSoft} />
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
        {MONTH_NAMES.map((name, i) => {
          const isCurrent = year === currentDate.getFullYear() && i === currentDate.getMonth();
          return (
            <button key={i} onClick={() => { onSelect(new Date(year, i, 1)); onClose(); }}
              style={{
                padding: '7px 0', borderRadius: 6, border: 'none',
                background: isCurrent ? P.action : 'transparent',
                color: isCurrent ? '#fff' : P.ink,
                cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 12,
              }}
              onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = P.bg; }}
              onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = 'transparent'; }}>
              {name.slice(0, 3)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── View mode switcher ─────────────────────────────────────────────────────
function ViewSwitcher({ mode, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const labels = { month: 'Month', '2week': '2 Weeks', week: 'Week' };

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '5px 11px', border: `1px solid ${P.border}`, borderRadius: 7,
        background: P.action, color: '#fff', cursor: 'pointer',
        fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12,
      }}>
        {labels[mode]}
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 4px)',
          background: P.white, border: `1px solid ${P.border}`, borderRadius: 8,
          boxShadow: '0 4px 16px rgba(15,13,40,0.1)', zIndex: 100, minWidth: 120, overflow: 'hidden',
        }}>
          {Object.entries(labels).map(([val, label]) => (
            <button key={val} onClick={() => { onChange(val); setOpen(false); }} style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '8px 12px', border: 'none', cursor: 'pointer',
              background: mode === val ? '#f4f5f7' : 'transparent',
              fontFamily: 'var(--font-display)', fontWeight: mode === val ? 700 : 500,
              fontSize: 13, color: P.ink,
            }}>{label}</button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Filter toolbar ─────────────────────────────────────────────────────────
const LEAVE_FILTER_OPTS = [['all', 'All time-off types'], ['Time off', 'Time off'], ['ADV / RTT', 'ADV / RTT'], ['Extra-legal leave', 'Extra-legal leave'], ['Sick leave', 'Sick leave'], ['Special leave', 'Special leave']];

function FilterDropdown({ label, active, opts, onSelect, minWidth }) {
  const [open, setOpen] = useState(false);
  const { rendered: menuRendered, visible: menuVisible } = usePopoverTransition(open);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  const isFiltered = active !== opts[0][0];
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '8px 11px', borderRadius: 7,
        border: `1px solid ${isFiltered ? P.ink : P.border}`,
        background: P.white, color: P.ink,
        cursor: 'pointer', fontFamily: 'var(--font-display)',
        fontWeight: isFiltered ? 700 : 500, fontSize: 12,
      }}>
        {opts.find(([v]) => v === active)?.[1] ?? label}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {menuRendered && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 50,
          background: P.white, border: `1px solid ${P.border}`, borderRadius: 8,
          boxShadow: '0 4px 16px rgba(15,13,40,0.10)', minWidth: minWidth || 160, overflow: 'hidden',
          ...popoverStyle(menuVisible, 'top left'),
        }}>
          {opts.map(([val, lbl]) => (
            <button key={val} onClick={() => { onSelect(val); setOpen(false); }} style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '8px 12px', border: 'none', cursor: 'pointer',
              background: active === val ? '#f4f5f7' : 'transparent',
              fontFamily: 'var(--font-display)', fontWeight: active === val ? 700 : 500,
              fontSize: 13, color: P.ink,
            }}>{lbl}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function TabBar({ tabs, activeTab, onTabChange, padding = '0 28px' }) {
  const [ref, rect, animate] = useSlidingIndicator(activeTab);
  return (
    <div ref={ref} style={{ display: 'flex', gap: 24, position: 'relative', padding }}>
      {tabs.map(({ id, label }) => (
        <button key={id} data-key={id} onClick={() => onTabChange(id)} style={{
          padding: '14px 0', border: 'none', background: 'transparent', cursor: 'pointer',
          fontFamily: 'var(--font-display)', fontWeight: activeTab === id ? 700 : 500, fontSize: 13,
          color: activeTab === id ? P.ink : P.inkSoft, marginBottom: -1,
        }}>{label}</button>
      ))}
      <div style={{
        position: 'absolute', bottom: -1, height: 2, background: P.action, borderRadius: 1,
        left: rect.left, width: rect.width,
        transition: animate ? `left 250ms ${EASE_OUT}, width 250ms ${EASE_OUT}` : 'none',
      }} />
    </div>
  );
}

function PageHeader({ title, subtitle, children, tabs }) {
  return (
    <div style={{ flexShrink: 0, borderBottom: `1px solid ${P.border}` }}>
      <div style={{ padding: tabs ? '40px 28px 24px' : '40px 28px 20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, color: P.ink, margin: 0, letterSpacing: '-0.02em' }}>{title}</h1>
          {subtitle && <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: P.inkSoft, margin: '4px 0 0' }}>{subtitle}</p>}
        </div>
        {children}
      </div>
      {tabs}
    </div>
  );
}

function FilterToolbar({ searchText, onSearch, filter, onFilter, filterOpts, deptFilter, onDeptFilter }) {
  const deptOpts = [['all', 'All departments'], ...DEPARTMENTS.map(d => [d, d])];
  const resolvedOpts = filterOpts || LEAVE_FILTER_OPTS;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '24px 20px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, border: `1px solid ${P.border}`, borderRadius: 7, padding: '8px 12px', width: 240, background: P.white }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={P.inkFaint} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input value={searchText} onChange={e => onSearch(e.target.value)} placeholder="Search employee" style={{
          border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--font-body)', fontSize: 12, color: P.ink, width: '100%',
        }} />
      </div>
      <FilterDropdown label={resolvedOpts[0][1]} active={filter} opts={resolvedOpts} onSelect={onFilter} minWidth={170} />
      <FilterDropdown label="All departments" active={deptFilter} opts={deptOpts} onSelect={onDeptFilter} minWidth={160} />
    </div>
  );
}

// ── Team absences screen ───────────────────────────────────────────────────
function TeamAbsencesScreen({ requests, pendingCount, onNav, onShowDetail, activeReqId, onSave, companyEvents = [], onCancelCompanyEvent, initialDate, initialDeptFilter }) {
  const today = new Date(); today.setHours(0,0,0,0);
  const todayISO = isoDate(today);

  // State
  const [viewMode, setViewMode] = useState('week');
  const [viewModeRef, viewModeRect, viewModeAnimate] = useSlidingIndicator(viewMode);
  const [refDate, setRefDate] = useState(() => initialDate || today);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [activeDepts, setActiveDepts] = useState(() => new Set(DEPARTMENTS));
  const [leaveFilter, setLeaveFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState(() => initialDeptFilter || 'all');
  const [expandedDepts, setExpandedDepts] = useState(() => new Set(DEPARTMENTS));
  const [tooltip, setTooltip] = useState(null);
  const [tooltipRendered, setTooltipRendered] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [cellDate, setCellDate] = useState(null);
  const [cellEmpId, setCellEmpId] = useState(null);
  const [hoveredCell, setHoveredCell] = useState(null);
  const [halfHoveredCell, setHalfHoveredCell] = useState(null);
  const [hoveredCol, setHoveredCol] = useState(null);
  const [cellHalfDay, setCellHalfDay] = useState(null);
  const [absencesOnly, setAbsencesOnly] = useState(false);
  const [closureDetail, setClosureDetail] = useState(null);
  const [closureEditOpen, setClosureEditOpen] = useState(null);
  const tooltipTimerRef = useRef(null);
  const tooltipReqIdRef = useRef(null);

  // Keeps the last non-null tooltip content mounted while it fades out, and
  // lets left/top glide via CSS transition when hopping between adjacent
  // bars — instead of the old keyframe `animation` that only played once and
  // then snapped position on every reposition.
  useEffect(() => {
    if (tooltip) { setTooltipRendered(tooltip); return; }
    const t = setTimeout(() => setTooltipRendered(null), 120);
    return () => clearTimeout(t);
  }, [tooltip]);

  // Compute days for current view
  const days = useMemo(() => {
    if (viewMode === 'week') {
      const ws = weekStart(refDate);
      return Array.from({ length: 7 }, (_, i) => addDays(ws, i));
    }
    if (viewMode === '2week') {
      const ws = weekStart(refDate);
      return Array.from({ length: 14 }, (_, i) => addDays(ws, i));
    }
    // month
    const first = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
    const ws = weekStart(first);
    const last = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0);
    const lastDay = last.getDay() || 7;
    const endDate = addDays(last, 7 - lastDay);
    const count = Math.round((endDate - ws) / 86400000);
    return Array.from({ length: count }, (_, i) => addDays(ws, i));
  }, [viewMode, refDate]);

  const dayISOs = useMemo(() => days.map(isoDate), [days]);

  // Build enriched absence map
  const absenceMap = useMemo(() => buildAbsenceMap(requests), [requests]);

  // Build dynamic closure set from company events
  const closureSet = useMemo(() => {
    const set = new Set(_collectiveSet);
    for (const ev of companyEvents) {
      for (const iso of (ev._selectedDates || [])) set.add(iso);
    }
    return set;
  }, [companyEvents]);
  const closureByDate = useMemo(() => {
    const map = {};
    for (const ev of companyEvents) {
      for (const iso of (ev._selectedDates || [])) map[iso] = ev;
    }
    return map;
  }, [companyEvents]);

  // Month label
  const monthLabel = useMemo(() => {
    if (viewMode === 'month') return MONTH_NAMES[refDate.getMonth()] + ' ' + refDate.getFullYear();
    const s = days[0], e = days[days.length - 1];
    const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
    if (sameMonth) return `${s.getDate()} – ${e.getDate()} ${s.toLocaleDateString('en-GB', { month: 'short' })} ${s.getFullYear()}`;
    const sameYear = s.getFullYear() === e.getFullYear();
    return `${s.getDate()} ${s.toLocaleDateString('en-GB', { month: 'short' })}${sameYear ? '' : ' ' + s.getFullYear()} – ${e.getDate()} ${e.toLocaleDateString('en-GB', { month: 'short' })} ${e.getFullYear()}`;
  }, [viewMode, refDate, days]);

  // Navigation step
  const step = (dir) => {
    setRefDate(d => {
      if (viewMode === 'month') return new Date(d.getFullYear(), d.getMonth() + dir, 1);
      if (viewMode === '2week') return addDays(d, dir * 14);
      return addDays(d, dir * 7);
    });
  };
  const goToday = () => setRefDate(new Date(today));

  // Filter employees
  const allDepartments = DEPARTMENTS;
  const toggleDept = (dept) => {
    setActiveDepts(prev => {
      const next = new Set(prev);
      next.has(dept) ? next.delete(dept) : next.add(dept);
      return next;
    });
  };
  const toggleExpand = (dept) => {
    setExpandedDepts(prev => {
      const next = new Set(prev);
      next.has(dept) ? next.delete(dept) : next.add(dept);
      return next;
    });
  };

  const filteredEmployees = useMemo(() => {
    const search = searchText.toLowerCase();
    return Object.entries(EMPLOYEES).filter(([id, emp]) => {
      if (!activeDepts.has(emp.department)) return false;
      if (deptFilter !== 'all' && emp.department !== deptFilter) return false;
      if (search && !emp.name.toLowerCase().includes(search)) return false;
      if (absencesOnly) {
        const hasAbsence = dayISOs.some(iso => {
          const entry = absenceMap[id]?.[iso];
          return entry && (leaveFilter === 'all' || entry.type === leaveFilter);
        });
        if (!hasAbsence) return false;
      }
      return true;
    });
  }, [searchText, activeDepts, deptFilter, absencesOnly, dayISOs, absenceMap, leaveFilter]);

  const grouped = useMemo(() => {
    const groups = {};
    for (const [id, emp] of filteredEmployees) {
      if (!groups[emp.department]) groups[emp.department] = [];
      groups[emp.department].push([id, emp]);
    }
    return groups;
  }, [filteredEmployees]);

  // Summary row — how many people off per day
  const summary = useMemo(() => {
    return dayISOs.map(iso => {
      let out = 0;
      for (const [empId] of filteredEmployees) {
        const entry = absenceMap[empId]?.[iso];
        if (entry && (leaveFilter === 'all' || entry.type === leaveFilter)) out++;
      }
      return out;
    });
  }, [dayISOs, filteredEmployees, absenceMap, leaveFilter]);

  const totalFiltered = filteredEmployees.length;

  const firstNameCount = useMemo(() => {
    const counts = {};
    for (const [, emp] of filteredEmployees) {
      const first = emp.name.split(' ')[0];
      counts[first] = (counts[first] || 0) + 1;
    }
    return counts;
  }, [filteredEmployees]);

  const colCount = days.length;
  const nameColW = viewMode === 'week' ? 200 : 170;
  const gridCols = `${nameColW}px repeat(${colCount}, minmax(${viewMode === 'week' ? 80 : viewMode === '2week' ? 36 : 24}px, 1fr))`;

  const pending = requests.filter(r => r.status === 'pending');

  // Upcoming holidays
  const upcomingHolidays = BELGIAN_HOLIDAYS_2026.filter(h => h >= todayISO).slice(0, 3);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', animation: `screenEnter 180ms ${EASE_OUT}` }}>
      <PageHeader title="Team absences" subtitle="Track and plan team availability">
        <button onClick={() => setAddOpen(true)} style={{
          display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 8, border: 'none',
          background: P.action, color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13,
        }}>
          <Icon name="Plus" size={14} color="#fff" strokeWidth={2.5} /> Add time off
        </button>
      </PageHeader>

      {/* Filter toolbar — full width */}
      <FilterToolbar
        searchText={searchText} onSearch={setSearchText}
        leaveFilter={leaveFilter} onLeaveFilter={setLeaveFilter}
        deptFilter={deptFilter} onDeptFilter={setDeptFilter}
      />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', alignItems: 'flex-start' }}>
        {/* Left: calendar area */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>

          {/* Calendar card */}
          <div style={{ maxHeight: 'calc(100vh - 200px)', margin: '0 20px 20px', background: P.white, border: `1px solid ${P.border}`, borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
            {/* Calendar nav */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderBottom: `1px solid ${P.border}`, flexShrink: 0, position: 'relative' }}>
              {/* Left group: Today, nav arrows, date label, Week/Month */}
              <button onClick={goToday} style={{
                padding: '6px 14px', borderRadius: 7, border: `1px solid ${P.border}`,
                background: 'transparent', cursor: 'pointer',
                fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: P.inkSoft,
              }}>Today</button>
              <button onClick={() => step(-1)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={P.ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <button onClick={() => setMonthPickerOpen(o => !o)} style={{
                border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px 6px', borderRadius: 6,
                fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: P.ink,
                minWidth: 160, textAlign: 'center',
              }}>{monthLabel}</button>
              <button onClick={() => step(1)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={P.ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
              <div ref={viewModeRef} style={{ display: 'flex', border: `1px solid ${P.border}`, borderRadius: 8, overflow: 'hidden', marginLeft: 4, position: 'relative' }}>
                <div style={{
                  position: 'absolute', top: 0, bottom: 0, background: P.action,
                  left: viewModeRect.left, width: viewModeRect.width,
                  transition: viewModeAnimate ? `left 250ms ${EASE_OUT}, width 250ms ${EASE_OUT}` : 'none',
                }} />
                {[['week', 'Week'], ['month', 'Month']].map(([val, label]) => (
                  <button key={val} data-key={val} onClick={() => setViewMode(val)} style={{
                    position: 'relative', padding: '6px 14px', border: 'none', cursor: 'pointer', background: 'transparent',
                    fontFamily: 'var(--font-display)', fontWeight: viewMode === val ? 700 : 500,
                    fontSize: 13, color: viewMode === val ? '#fff' : P.ink,
                    transition: `color 150ms ${EASE_OUT}`,
                  }}>{label}</button>
                ))}
              </div>

              <div style={{ flex: 1 }} />

              {/* Right: Absences only toggle */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 12, color: P.inkSoft }}>Absences only</span>
                <Switch checked={absencesOnly} onChange={() => setAbsencesOnly(v => !v)} />
              </label>

              {monthPickerOpen && (
                <MonthPicker currentDate={refDate} onSelect={d => { setRefDate(d); }} onClose={() => setMonthPickerOpen(false)} />
              )}
            </div>

            {/* Scrollable grid */}
            <div style={{ flex: 1, overflow: 'auto' }} className="hide-scrollbar">
              {/* Day headers */}
              <div style={{ display: 'grid', gridTemplateColumns: gridCols, position: 'sticky', top: 0, zIndex: 10, background: P.white, borderBottom: `1px solid ${P.border}` }}>
                <div style={{ padding: '6px 12px', display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 10, color: P.inkFaint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {filteredEmployees.length} people
                  </span>
                </div>
                {days.map((d, i) => {
                  const iso = dayISOs[i];
                  const isToday = iso === todayISO;
                  const isWknd = d.getDay() === 0 || d.getDay() === 6;
                  const isHoliday = _holidaySet.has(iso);
                  const isCollective = closureSet.has(iso);
                  const closureEv = closureByDate[iso];
                  const isWeekStart = viewMode === 'month' && d.getDay() === 1 && i > 0;
                  return (
                    <div key={i}
                      onClick={closureEv ? () => setClosureDetail(closureEv) : undefined}
                      onMouseEnter={() => setHoveredCol(iso)}
                      onMouseLeave={() => setHoveredCol(null)}
                      style={{
                      padding: '6px 0', textAlign: 'center',
                      background: isCollective ? '#faf6eb' : isHoliday ? '#f3f1fe' : isWknd ? '#fafafa' : hoveredCol === iso ? 'rgba(99,102,241,0.04)' : 'transparent',
                      borderLeft: isWeekStart ? `2px solid ${P.borderStrong}` : `1px solid ${P.border}`,
                      cursor: closureEv ? 'pointer' : undefined,
                    }} title={isHoliday ? BELGIAN_HOLIDAY_NAMES[iso] : closureEv ? (closureEv.name || 'Company closure') : isCollective ? 'Company closed' : ''}>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 9, color: P.inkFaint, letterSpacing: '0.06em' }}>
                        {DAY_LABELS[(d.getDay() + 6) % 7]}
                      </div>
                      <div style={{
                        width: 22, height: 22, borderRadius: '50%', margin: '1px auto 0',
                        background: isToday ? P.action : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: isToday ? 700 : 500, fontSize: 11, color: isToday ? '#fff' : isWknd ? P.inkFaint : P.ink }}>
                          {d.getDate()}
                        </span>
                      </div>
                      {(isHoliday || isCollective) && (
                        <div style={{ fontSize: 8, color: isCollective ? '#92400e' : '#7c3aed', fontFamily: 'var(--font-display)', fontWeight: 600, marginTop: 1 }}>
                          {closureEv ? 'Closed' : isCollective ? 'Closed' : ''}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>


              {/* Employee rows */}
              {filteredEmployees.map(([empId, emp], empIdx) => {
                const employees = [[empId, emp]];
                return (
                  <React.Fragment key={empId}>
                    {employees.map(([empId, emp], empIdx) => (
                      <div key={empId} style={{ display: 'grid', gridTemplateColumns: gridCols, borderBottom: `1px solid ${P.border}`, height: viewMode === 'week' ? 64 : 36 }}>
                        <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', gap: 8, overflow: 'hidden' }}>
                          <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontFamily: 'var(--font-body)', fontSize: viewMode === 'week' ? 12 : 11, fontWeight: viewMode === 'week' ? 500 : 400, color: P.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {(() => {
                                if (viewMode === 'week') return emp.name;
                                const parts = emp.name.split(' ');
                                return firstNameCount[parts[0]] > 1 && parts.length > 1 ? `${parts[0]} ${parts[1].charAt(0)}.` : parts[0];
                              })()}
                            </div>
                          </div>
                        </div>
                        {dayISOs.map((iso, i) => {
                          const d = days[i];
                          const isToday = iso === todayISO;
                          const isWknd = d.getDay() === 0 || d.getDay() === 6;
                          const isHoliday = _holidaySet.has(iso);
                          const isCollective = closureSet.has(iso);
                          const entry = absenceMap[empId]?.[iso];
                          const show = entry && (leaveFilter === 'all' || entry.type === leaveFilter);
                          const barColor = show ? (LEAVE_COLORS[entry.type] || '#2563eb') : null;
                          const isPending = show && entry.status === 'pending';

                          // Connected bar styling
                          const prevEntry = absenceMap[empId]?.[dayISOs[i - 1]];
                          const nextEntry = absenceMap[empId]?.[dayISOs[i + 1]];
                          const isStart = show && (!prevEntry || prevEntry.requestId !== entry.requestId);
                          const isEnd = show && (!nextEntry || nextEntry.requestId !== entry.requestId);
                          const isWeekCard = viewMode === 'week' && isStart;
                          const fullReq = show ? requests.find(function(r) { return r.id === entry.requestId; }) : null;
                          const halfDayForDate = fullReq?._halfDay?.[iso];
                          const isHalfDayCell = !!(halfDayForDate && isWeekCard && isStart && isEnd);
                          const pt = viewMode === 'week' ? 8 : 3;
                          const pad = viewMode === 'week' ? 6 : 3;

                          const closureEv = closureByDate[iso];
                          const cellClickable = !show && closureEv;
                          const cellAddable = !show && !isWknd && !isHoliday && !isCollective;
                          const isHoveredAdd = cellAddable && hoveredCell === `${empId}-${iso}`;
                          const isCellWeekStart = viewMode === 'month' && d.getDay() === 1 && i > 0;

                          return (
                            <div key={iso}
                              onMouseEnter={(e) => {
                                setHoveredCol(iso);
                                if (cellClickable) {
                                  clearTimeout(tooltipTimerRef.current);
                                  const key = 'closure-' + closureEv.id;
                                  if (tooltipReqIdRef.current !== key) {
                                    tooltipReqIdRef.current = key;
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setTooltip({ closure: closureEv, x: rect.left + rect.width / 2, y: rect.top - 4 });
                                  }
                                } else if (cellAddable) {
                                  setHoveredCell(`${empId}-${iso}`);
                                }
                              }}
                              onMouseLeave={() => {
                                setHoveredCol(null);
                                if (cellClickable) {
                                  tooltipTimerRef.current = setTimeout(() => { tooltipReqIdRef.current = null; setTooltip(null); }, 80);
                                } else if (cellAddable) {
                                  setHoveredCell(null);
                                }
                              }}
                              onClick={cellClickable ? () => setClosureDetail(closureEv) : cellAddable ? () => { setCellDate(iso); setCellEmpId(empId); setAddOpen(true); } : undefined}
                              style={{
                              borderLeft: isCellWeekStart ? `2px solid ${P.borderStrong}` : `1px solid ${P.border}`,
                              background: isCollective ? '#faf6eb' : isHoliday ? '#f3f1fe' : isWknd ? '#fafafa' : isHoveredAdd ? P.bg : hoveredCol === iso ? 'rgba(99,102,241,0.04)' : 'transparent',
                              display: 'flex', alignItems: 'stretch',
                              paddingTop: pt, paddingBottom: pt,
                              paddingLeft: isStart ? pad : 0,
                              paddingRight: isEnd ? pad : 0,
                              cursor: (cellClickable || cellAddable) ? 'pointer' : undefined,
                            }}>
                              {!show && isHoveredAdd && (
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <div style={{
                                    width: 22, height: 22, borderRadius: 6,
                                    background: P.white, border: `1px solid ${P.borderStrong}`,
                                    boxShadow: '0 1px 3px rgba(15,13,40,0.08)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                  }}>
                                    <Icon name="Plus" size={12} color={P.inkSoft} strokeWidth={2.5} />
                                  </div>
                                </div>
                              )}
                              {show && isHalfDayCell ? (
                                ['am', 'pm'].map(function(half) {
                                  const isTaken = halfDayForDate === half;
                                  const halfKey = empId + '-' + iso + '-' + half;
                                  const isHalfHov = halfHoveredCell === halfKey;
                                  const barRadius = half === 'am' ? '5px 0 0 5px' : '0 5px 5px 0';
                                  return isTaken ? (
                                    <div key={half}
                                      onMouseEnter={(e) => {
                                        clearTimeout(tooltipTimerRef.current);
                                        if (tooltipReqIdRef.current !== entry.requestId) {
                                          tooltipReqIdRef.current = entry.requestId;
                                          const rect = e.currentTarget.getBoundingClientRect();
                                          if (fullReq) setTooltip({ req: fullReq, x: rect.left + rect.width / 2, y: rect.top - 4 });
                                        }
                                      }}
                                      onMouseLeave={() => {
                                        tooltipTimerRef.current = setTimeout(function() { tooltipReqIdRef.current = null; setTooltip(null); }, 80);
                                      }}
                                      onClick={() => { if (fullReq && onShowDetail) onShowDetail(fullReq); }}
                                      style={{
                                        flex: 1, borderRadius: barRadius, background: barColor,
                                        borderTop: isPending ? `1.5px dashed ${LEAVE_BORDER_COLORS[entry.type] || '#999'}` : 'none',
                                        borderBottom: isPending ? `1.5px dashed ${LEAVE_BORDER_COLORS[entry.type] || '#999'}` : 'none',
                                        borderLeft: isPending && half === 'am' ? `1.5px dashed ${LEAVE_BORDER_COLORS[entry.type] || '#999'}` : 'none',
                                        borderRight: isPending && half === 'pm' ? `1.5px dashed ${LEAVE_BORDER_COLORS[entry.type] || '#999'}` : 'none',
                                        boxShadow: activeReqId && entry.requestId === activeReqId ? `inset 0 0 0 2px ${LEAVE_BORDER_COLORS[entry.type] || P.inkSoft}` : undefined,
                                        cursor: 'pointer',
                                        padding: '5px 8px',
                                        display: 'flex', alignItems: 'center', flexDirection: 'column', justifyContent: 'center',
                                        gap: 2, overflow: 'hidden',
                                      }}>
                                      <WeekCard entry={entry} requestId={entry.requestId} requests={requests} isPending={isPending} />
                                    </div>
                                  ) : (
                                    <div key={half}
                                      onMouseEnter={() => setHalfHoveredCell(halfKey)}
                                      onMouseLeave={() => setHalfHoveredCell(null)}
                                      onClick={() => { setCellDate(iso); setCellEmpId(empId); setCellHalfDay(half); setAddOpen(true); }}
                                      style={{
                                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer', borderRadius: barRadius,
                                      }}>
                                      {isHalfHov && (
                                        <div style={{
                                          width: 22, height: 22, borderRadius: 6,
                                          background: P.white, border: `1px solid ${P.borderStrong}`,
                                          boxShadow: '0 1px 3px rgba(15,13,40,0.08)',
                                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                          <Icon name="Plus" size={12} color={P.inkSoft} strokeWidth={2.5} />
                                        </div>
                                      )}
                                    </div>
                                  );
                                })
                              ) : show ? (
                                <div
                                  onMouseEnter={(e) => {
                                    clearTimeout(tooltipTimerRef.current);
                                    if (tooltipReqIdRef.current !== entry.requestId) {
                                      tooltipReqIdRef.current = entry.requestId;
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      const found = requests.find(function(rr) { return rr.id === entry.requestId; });
                                      if (found) setTooltip({ req: found, x: rect.left + rect.width / 2, y: rect.top - 4 });
                                    }
                                  }}
                                  onMouseLeave={() => {
                                    tooltipTimerRef.current = setTimeout(() => {
                                      tooltipReqIdRef.current = null;
                                      setTooltip(null);
                                    }, 80);
                                  }}
                                  onClick={() => {
                                    const found = requests.find(function(rr) { return rr.id === entry.requestId; });
                                    if (found && onShowDetail) onShowDetail(found);
                                  }}
                                  style={{
                                    width: '100%',
                                    borderRadius: isStart && isEnd ? 5 : isStart ? '5px 0 0 5px' : isEnd ? '0 5px 5px 0' : 0,
                                    background: barColor,
                                    borderTop: isPending ? `1.5px dashed ${LEAVE_BORDER_COLORS[entry.type] || '#999'}` : 'none',
                                    borderBottom: isPending ? `1.5px dashed ${LEAVE_BORDER_COLORS[entry.type] || '#999'}` : 'none',
                                    borderLeft: isPending && isStart ? `1.5px dashed ${LEAVE_BORDER_COLORS[entry.type] || '#999'}` : 'none',
                                    borderRight: isPending && isEnd ? `1.5px dashed ${LEAVE_BORDER_COLORS[entry.type] || '#999'}` : 'none',
                                    boxShadow: activeReqId && entry.requestId === activeReqId ? `inset 0 0 0 2px ${LEAVE_BORDER_COLORS[entry.type] || P.inkSoft}` : undefined,
                                    cursor: 'pointer',
                                    padding: isWeekCard ? '5px 8px' : 0,
                                    display: isWeekCard ? 'flex' : 'block',
                                    alignItems: isWeekCard ? 'center' : undefined,
                                    flexDirection: isWeekCard ? 'column' : undefined,
                                    justifyContent: isWeekCard ? 'center' : undefined,
                                    gap: isWeekCard ? 2 : undefined,
                                    overflow: 'hidden',
                                  }}
                                >
                                  {isWeekCard && (
                                    <WeekCard entry={entry} requestId={entry.requestId} requests={requests} isPending={isPending} />
                                  )}
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Tooltip */}
            {tooltipRendered && (
              <div style={{
                position: 'fixed', left: tooltipRendered.x, top: tooltipRendered.y - 8,
                transform: 'translate(-50%, -100%)', zIndex: 100,
                background: P.action, color: '#fff', padding: '8px 12px', borderRadius: 8,
                boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                fontFamily: 'var(--font-body)', fontSize: 11, lineHeight: 1.5,
                pointerEvents: 'none', whiteSpace: 'nowrap',
                opacity: tooltip ? 1 : 0,
                transition: `opacity 120ms ${EASE_OUT}, left 120ms ${EASE_OUT}, top 120ms ${EASE_OUT}`,
              }}>
                {tooltipRendered.closure ? (
                  <>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, marginBottom: 2 }}>{tooltipRendered.closure.name || 'Company closure'}</div>
                    <div>{tooltipRendered.closure.startDate}{tooltipRendered.closure.startDate !== tooltipRendered.closure.endDate ? ` – ${tooltipRendered.closure.endDate}` : ''} · {tooltipRendered.closure.days} {tooltipRendered.closure.days === 1 ? 'day' : 'days'}</div>
                    <div style={{ color: '#fde68a' }}>All employees</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, marginBottom: 2 }}>
                      {(EMPLOYEES[tooltipRendered.req.employee] || {}).name || tooltipRendered.req.employee}
                    </div>
                    <div>{tooltipRendered.req.type} · {tooltipRendered.req.days} {tooltipRendered.req.days === 1 ? 'day' : 'days'}</div>
                    <div>{tooltipRendered.req.startDate}{tooltipRendered.req.startDate !== tooltipRendered.req.endDate ? ` – ${tooltipRendered.req.endDate}` : ''}</div>
                    <div style={{ color: tooltipRendered.req.status === 'pending' ? '#fbbf24' : '#86efac' }}>
                      {tooltipRendered.req.status === 'pending' ? 'Pending approval' : 'Approved'}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
      {addOpen && (
        <AddTimeOffModal existing={null} requests={requests} defaultDate={cellDate} defaultEmployee={cellEmpId} defaultHalfDay={cellHalfDay} onClose={() => { setAddOpen(false); setCellDate(null); setCellEmpId(null); setCellHalfDay(null); }} onSave={(req) => { onSave(req); setAddOpen(false); setCellDate(null); setCellEmpId(null); setCellHalfDay(null); }} />
      )}

      {closureDetail && (
        <div onClick={() => setClosureDetail(null)} style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(15,13,40,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: P.white, borderRadius: 14, width: 420,
            boxShadow: '0 8px 40px rgba(15,13,40,0.18)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: `1px solid ${P.border}` }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: P.ink }}>Company closure</span>
              <button onClick={() => setClosureDetail(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 4, display: 'flex' }}>
                <Icon name="X" size={18} color={P.inkSoft} />
              </button>
            </div>
            <div style={{ padding: '6px 0' }}>
              {[
                { label: 'Name', value: closureDetail.name || closureDetail.type },
                { label: 'When', value: <span>{closureDetail.startDate}{closureDetail.startDate !== closureDetail.endDate ? ` – ${closureDetail.endDate}` : ''}<br /><span style={{ color: P.inkSoft, fontSize: 12 }}>{closureDetail.days} {closureDetail.days === 1 ? 'day' : 'days'}</span></span> },
                { label: 'Applies to', value: 'All employees' },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'grid', gridTemplateColumns: '130px 1fr', padding: '11px 22px', borderBottom: `1px solid ${P.border}`, alignItems: 'start', gap: 12 }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkSoft, paddingTop: 1 }}>{label}</span>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.ink }}>{value}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 22px', borderTop: `1px solid ${P.border}` }}>
              <button onClick={() => { const ev = closureDetail; setClosureDetail(null); setClosureEditOpen(ev); }} style={{
                padding: '8px 20px', borderRadius: 8, border: `1px solid ${P.border}`,
                background: P.white, cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: P.ink,
              }}>Edit</button>
              <button onClick={() => { onCancelCompanyEvent(closureDetail.id); setClosureDetail(null); }} style={{
                padding: '8px 20px', borderRadius: 8, border: '1px solid #fca5a5',
                background: '#fef2f2', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: '#dc2626',
              }}>Cancel closure</button>
            </div>
          </div>
        </div>
      )}

      {closureEditOpen && (
        <AddTimeOffModal
          existing={closureEditOpen}
          requests={requests}
          onClose={() => setClosureEditOpen(null)}
          onSave={(req) => { onSave(req); setClosureEditOpen(null); }}
        />
      )}
    </div>
  );
}

function fmtBudget(n) {
  return n.toLocaleString('fr-BE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' EUR';
}

function EmployeeRow({ emp, onNav }) {
  const [hover, setHover] = useState(false);
  return (
    <tr
      onClick={() => onNav('employee-detail:' + emp.id)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ borderBottom: `1px solid ${P.border}`, cursor: 'pointer', background: hover ? '#f7f8f7' : 'transparent', transition: `background 120ms ${EASE_OUT}`, height: 52 }}>
      <td style={{ padding: '10px 16px' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: P.ink }}>{emp.name}</span>
      </td>
      <td style={{ padding: '10px 16px', color: P.inkSoft }}>{emp.email}</td>
      <td style={{ padding: '10px 16px', color: P.inkSoft }}>{emp.entity}</td>
      <td style={{ padding: '10px 16px', textAlign: 'right', color: P.ink, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{fmtBudget(emp.budget)}</td>
      <td style={{ padding: '10px 16px', textAlign: 'right' }}>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 500, color: P.inkSoft }}>
          See details
        </span>
      </td>
    </tr>
  );
}

// ── Employees screen ──────────────────────────────────────────────────────
function EmployeesScreen({ requests, onNav }) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('Active');

  const empList = useMemo(() => {
    return Object.entries(EMPLOYEES).map(([id, emp]) => ({ id, ...emp }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const filtered = useMemo(() => {
    return empList.filter(e => {
      if (roleFilter !== 'All' && e.role !== roleFilter) return false;
      if (statusFilter !== 'All' && e.status !== statusFilter) return false;
      if (search && !e.name.toLowerCase().includes(search.toLowerCase()) && !e.email.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [empList, search, roleFilter, statusFilter]);

  const selectStyle = { padding: '7px 28px 7px 10px', border: `1px solid ${P.border}`, borderRadius: 8, fontFamily: 'var(--font-body)', fontSize: 13, color: P.ink, background: P.white, cursor: 'pointer', outline: 'none', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', animation: `screenEnter 180ms ${EASE_OUT}` }}>
      <PageHeader title="Employees" subtitle="Overview">
        <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', border: `1px solid ${P.border}`, borderRadius: 8, background: P.white, color: P.ink, fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            <Icon name="Mail" size={14} /> Invite users
          </button>
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', border: `1px solid ${P.border}`, borderRadius: 8, background: P.white, color: P.ink, fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            <Icon name="Settings2" size={14} /> Bulk actions
          </button>
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', border: 'none', borderRadius: 8, background: P.action, color: P.white, fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <Icon name="Plus" size={14} color={P.white} /> Add a user
          </button>
        </div>
      </PageHeader>

      <div style={{ flex: 1, overflow: 'auto', padding: '20px 20px 20px' }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 220 }}>
            <Icon name="Search" size={14} color={P.inkFaint} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Name"
              style={{ width: '100%', padding: '7px 10px 7px 32px', border: `1px solid ${P.border}`, borderRadius: 8, fontFamily: 'var(--font-body)', fontSize: 13, color: P.ink, outline: 'none', background: P.white }} />
          </div>
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={selectStyle}>
            <option value="All">Role: All</option>
            <option value="Employee">Role: Employee</option>
            <option value="Manager">Role: Manager</option>
            <option value="Admin">Role: Admin</option>
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={selectStyle}>
            <option value="All">Status: All</option>
            <option value="Active">Status: Active</option>
            <option value="Inactive">Status: Inactive</option>
          </select>
        </div>
        <div style={{ background: P.white, border: `1px solid ${P.border}`, borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-body)', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${P.border}` }}>
                <th style={{ textAlign: 'left', padding: '10px 16px', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 11, color: P.inkFaint, textTransform: 'uppercase', letterSpacing: '0.04em' }}>User name</th>
                <th style={{ textAlign: 'left', padding: '10px 16px', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 11, color: P.inkFaint, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Email</th>
                <th style={{ textAlign: 'left', padding: '10px 16px', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 11, color: P.inkFaint, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Entity</th>
                <th style={{ textAlign: 'right', padding: '10px 16px', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 11, color: P.inkFaint, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Budget balance</th>
                <th style={{ textAlign: 'right', padding: '10px 16px', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 11, color: P.inkFaint, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(emp => (
                <EmployeeRow key={emp.id} emp={emp} onNav={onNav} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Edit balances modal ────────────────────────────────────────────────────
const BALANCE_SECTIONS = [
  {
    label: 'Set by you',
    types: ['Time off', 'ADV / RTT', 'Extra-legal leave'],
    editable: true,
  },
  {
    label: 'Set by law',
    types: ['Sick leave', 'Special leave'],
    editable: false,
    badge: 'Belgian law',
    defaults: { 'Sick leave': 30, 'Special leave': null },
  },
];

function EditBalancesModal({ emp, balances, onSave, onClose, isNewEmployee, onConfirm }) {
  const [values, setValues] = useState(() =>
    ['Time off', 'ADV / RTT', 'Extra-legal leave'].reduce((acc, type) => {
      acc[type] = balances[type] != null ? String(balances[type]) : '';
      return acc;
    }, {})
  );

  const hrType = emp.gender === 'f' ? 'Maternity leave' : 'Paternity leave';
  const hrDefault = emp.gender === 'f' ? 105 : 10;
  const sections = [
    ...BALANCE_SECTIONS,
    { label: 'HR-initiated only', types: [hrType], editable: false, defaults: { [hrType]: hrDefault } },
  ];

  const { visible, close } = useModalTransition(onClose);

  const handleSave = () => {
    const next = { ...balances };
    for (const type of ['Time off', 'ADV / RTT', 'Extra-legal leave']) {
      const v = parseInt(values[type], 10);
      next[type] = isNaN(v) ? 0 : Math.max(0, v);
    }
    onSave(next);
    if (isNewEmployee && onConfirm) onConfirm();
    close();
  };

  const year = new Date().getFullYear();

  return (
    <div onClick={close} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(15,13,40,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', ...modalBackdropStyle(visible) }}>
      <div onClick={e => e.stopPropagation()} style={{ background: P.white, borderRadius: 14, width: 480, boxShadow: '0 8px 40px rgba(15,13,40,0.18)', display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflow: 'hidden', ...modalPanelStyle(visible) }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: `1px solid ${P.border}` }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: P.ink }}>{isNewEmployee ? 'Review & confirm balances' : 'Edit balances'}</div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkSoft, marginTop: 2 }}>{emp.name} · {year}</div>
          </div>
          <button onClick={close} style={{
            border: 'none', cursor: 'pointer',
            width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(60,60,67,0.1)',
            backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
          }}>
            <Icon name="X" size={14} color={P.ink} strokeWidth={2.5} />
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto' }}>
          {sections.map((section, si) => (
            <div key={section.label} style={{ borderBottom: si < sections.length - 1 ? `1px solid ${P.border}` : 'none' }}>
              <div style={{ padding: '10px 22px 6px', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 10, color: P.inkFaint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {section.label}
              </div>
              {section.types.map((type, ti) => {
                const dot = LEAVE_COLORS[type] || '#ccc';
                const isLast = ti === section.types.length - 1;
                if (section.editable) {
                  return (
                    <div key={type} style={{ display: 'flex', alignItems: 'center', padding: '10px 22px', borderTop: ti > 0 ? `1px solid ${P.border}` : 'none' }}>
                      <span style={{ width: 9, height: 9, borderRadius: '50%', background: dot, flexShrink: 0, marginRight: 10 }} />
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: P.ink, flex: 1 }}>{type}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input
                          type="number" min="0"
                          value={values[type]}
                          onChange={e => setValues(v => ({ ...v, [type]: e.target.value }))}
                          placeholder="0"
                          style={{ width: 56, padding: '5px 8px', borderRadius: 7, border: `1px solid ${P.border}`, fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, color: P.ink, outline: 'none', textAlign: 'center', background: P.bg }}
                        />
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkSoft }}>days</span>
                      </div>
                    </div>
                  );
                } else {
                  const defaultVal = section.defaults?.[type];
                  const displayVal = balances[type] != null ? balances[type] : defaultVal;
                  return (
                    <div key={type} style={{ display: 'flex', alignItems: 'center', padding: '10px 22px', borderTop: ti > 0 ? `1px solid ${P.border}` : 'none', opacity: 0.7 }}>
                      <span style={{ width: 9, height: 9, borderRadius: '50%', background: dot, flexShrink: 0, marginRight: 10 }} />
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: P.ink, flex: 1 }}>{type}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, color: P.inkSoft }}>{displayVal ?? '—'}</span>
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkSoft }}>days</span>
                      </div>
                    </div>
                  );
                }
              })}
              <div style={{ height: 4 }} />
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 22px', borderTop: `1px solid ${P.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ flex: 1 }} />
          <button onClick={close} style={{ padding: '8px 18px', borderRadius: 8, border: `1px solid ${P.border}`, background: 'transparent', color: P.ink, cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13 }}>Cancel</button>
          <button onClick={handleSave} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: P.action, color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13 }}>{isNewEmployee ? 'Confirm balances' : 'Save balances'}</button>
        </div>
      </div>
    </div>
  );
}

// ── Employee detail screen ────────────────────────────────────────────────
function EmployeeDetailScreen({ employeeId, requests, onNav, onSave, onCancel, onApprove, onDecline, onViewTeamCalendar, employeeBalance, onUpdateBalance, needsSetup, confirmedDate, onConfirmBalances, onToast }) {
  const emp = EMPLOYEES[employeeId];
  const [activeTab, setActiveTab] = useState('choices');
  const [addModal, setAddModal] = useState(null); // null | 'add' | request object (edit)
  const [cancelAction, setCancelAction] = useState(null);
  const [editBalancesOpen, setEditBalancesOpen] = useState(false);
  const [detailReq, setDetailReq] = useState(null);
  const [empMenuOpen, setEmpMenuOpen] = useState(false);
  const [deactivateConfirm, setDeactivateConfirm] = useState(false);
  const empMenuRef = useRef(null);
  const { rendered: empMenuRendered, visible: empMenuVisible } = usePopoverTransition(empMenuOpen);
  useEffect(() => {
    if (!empMenuOpen) return;
    const close = (e) => { if (empMenuRef.current && !empMenuRef.current.contains(e.target)) setEmpMenuOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [empMenuOpen]);

  if (!emp) return <div style={{ padding: 24 }}>Employee not found</div>;

  const empReqs = useMemo(() => {
    return requests.filter(r => r.employee === employeeId)
      .sort((a, b) => {
        const da = parseDisplayDate(a.startDate);
        const db = parseDisplayDate(b.startDate);
        return (db || 0) - (da || 0);
      });
  }, [requests, employeeId]);

  const balances = useMemo(() => {
    return ALL_LEAVE_TYPES.map(type => {
      const active = empReqs.filter(r => r.type === type && r.status !== 'rejected');
      const used = active.reduce((s, r) => s + (r.days || 1), 0);
      const defaultEntitled = type === 'Time off' ? emp.entitlement : type === 'ADV / RTT' ? 12 : type === 'Extra-legal leave' ? 4 : null;
      const entitled = (employeeBalance && employeeBalance[type] !== undefined) ? employeeBalance[type] : defaultEntitled;
      return { type, entitled, used, remaining: entitled != null ? Math.max(0, entitled - used) : null };
    });
  }, [empReqs, emp, employeeBalance]);

  const balancesForModal = useMemo(() =>
    Object.fromEntries(balances.filter(b => b.entitled != null).map(b => [b.type, b.entitled]))
  , [balances]);

  const tabs = [
    { id: 'choices', label: 'Choices' },
    { id: 'budgets', label: 'Budgets' },
    { id: 'salary', label: 'Salary & components' },
    { id: 'details', label: 'Details & roles' },
    { id: 'timeoff', label: 'Leave & absences' },
  ];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', animation: `screenEnter 180ms ${EASE_OUT}` }}>
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${P.border}` }}>
      <div style={{ padding: '24px 32px 0' }}>
        <button onClick={() => onNav('employees')} style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 32, height: 32, flexShrink: 0,
          border: `1px solid ${P.border}`, background: P.white,
          cursor: 'pointer', borderRadius: 8, marginBottom: 24,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={P.ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, color: P.ink, margin: 0, letterSpacing: '-0.02em' }}>{emp.name}</h1>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: P.inkSoft, margin: '2px 0 0' }}>{emp.department}</p>
          </div>
          <div ref={empMenuRef} style={{ position: 'relative', marginTop: 4 }}>
            <button onClick={() => setEmpMenuOpen(o => !o)} style={{
              width: 32, height: 32, borderRadius: 8,
              border: `1px solid ${empMenuOpen ? P.ink : P.border}`,
              background: empMenuOpen ? '#f0f0f2' : P.white,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="Ellipsis" size={15} color={empMenuOpen ? P.ink : P.inkSoft} />
            </button>
            {empMenuRendered && (
              <div style={{
                position: 'absolute', right: 0, top: 38, zIndex: 50,
                background: P.white, border: `1px solid ${P.border}`, borderRadius: 10,
                boxShadow: '0 4px 20px rgba(0,0,0,0.10)', width: 180, overflow: 'hidden',
                ...popoverStyle(empMenuVisible, 'top right'),
              }}>
                <button onClick={() => { setEmpMenuOpen(false); onToast && onToast({ message: `Impersonating ${emp.name.split(' ')[0]}…`, type: 'approve' }); }} style={{
                  display: 'flex', alignItems: 'center', gap: 9,
                  width: '100%', padding: '9px 12px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left',
                }} onMouseEnter={e => e.currentTarget.style.background = P.bg} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <Icon name="monitor-smartphone" size={14} color={P.ink} strokeWidth={1.75} />
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.ink }}>Impersonate user</span>
                </button>
                <div style={{ height: 1, background: P.border, margin: '0 12px' }} />
                <button onClick={() => { setEmpMenuOpen(false); setDeactivateConfirm(true); }} style={{
                  display: 'flex', alignItems: 'center', gap: 9,
                  width: '100%', padding: '9px 12px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left',
                }} onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <Icon name="user-x" size={14} color="#dc2626" strokeWidth={1.75} />
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#dc2626' }}>Deactivate employee</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <TabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} padding="0" />
      </div>
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '40px 32px 32px' }}>
        {activeTab === 'timeoff' ? (
          <div>
            {needsSetup && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: '#92400e' }}>Confirm {emp.name.split(' ')[0]}'s leave balances</div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#78350f', marginTop: 1 }}>These are company defaults — adjust any values if needed, then confirm so {emp.name.split(' ')[0]} can request time off.</div>
                </div>
                <button onClick={() => setEditBalancesOpen(true)} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: P.action, color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, flexShrink: 0, whiteSpace: 'nowrap' }}>
                  Review & confirm
                </button>
              </div>
            )}
            {/* Requested time off */}
            <div style={{ marginBottom: 36 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: P.ink }}>Requested time off</span>
                <button onClick={() => setAddModal('add')} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 8, border: 'none', background: P.action, color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13 }}>
                  <Icon name="Plus" size={14} color="#fff" strokeWidth={2.5} />
                  Add time off
                </button>
              </div>
              {empReqs.filter(r => r.status === 'pending').length > 0 ? (
                <div style={{ background: P.white, border: `1px solid ${P.border}`, borderRadius: 12, overflow: 'visible' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-body)', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${P.border}` }}>
                        <th style={{ width: '20%', textAlign: 'left', padding: '9px 20px', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 11, color: P.inkFaint, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Date from</th>
                        <th style={{ width: '20%', textAlign: 'left', padding: '9px 16px', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 11, color: P.inkFaint, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Date to</th>
                        <th style={{ width: '25%', textAlign: 'left', padding: '9px 16px', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 11, color: P.inkFaint, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Type</th>
                        <th style={{ width: '15%', textAlign: 'center', padding: '9px 16px', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 11, color: P.inkFaint, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Days</th>
                        <th style={{ width: '15%', textAlign: 'left', padding: '9px 16px', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 11, color: P.inkFaint, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Status</th>
                        <th style={{ width: 40 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {empReqs.filter(r => r.status === 'pending').map((req, idx, arr) => (
                        <tr key={req.id} onClick={() => setDetailReq(req)} style={{ borderBottom: idx < arr.length - 1 ? `1px solid ${P.border}` : 'none', cursor: 'pointer' }}>
                          <td style={{ padding: '12px 20px', fontSize: 14, color: P.ink }}>{req.startDate}</td>
                          <td style={{ padding: '12px 16px', fontSize: 14, color: req.endDate && req.endDate !== req.startDate ? P.ink : P.inkFaint }}>
                            {req.endDate && req.endDate !== req.startDate ? req.endDate : '—'}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ width: 10, height: 10, borderRadius: '50%', background: LEAVE_COLORS[req.type] || P.inkFaint, border: `1.5px solid ${LEAVE_BORDER_COLORS[req.type] || P.border}`, flexShrink: 0 }} />
                              <span style={{ fontSize: 14, color: P.ink }}>{req.type}</span>
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: 14, textAlign: 'center', color: P.ink }}>
                            {req.days === 0.5 ? (
                              <span>{'½'}<span style={{ fontSize: 11, color: P.inkFaint, marginLeft: 3 }}>{req.halfDay || ''}</span></span>
                            ) : req.days || 1}
                          </td>
                          <td style={{ padding: '12px 16px' }}><StatusPill status={req.status} /></td>
                          <td style={{ padding: '10px 16px' }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                              <button title="Decline" onClick={() => setDetailReq({ ...req, _declineMode: true })}
                                onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.borderColor = '#fca5a5'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.borderColor = '#fecaca'; }}
                                style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <Icon name="X" size={14} color="#dc2626" strokeWidth={2.5} />
                              </button>
                              <button title="Approve" onClick={() => onApprove(req.id)}
                                onMouseEnter={e => { e.currentTarget.style.background = '#dcfce7'; e.currentTarget.style.borderColor = '#86efac'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = '#f0fdf4'; e.currentTarget.style.borderColor = '#bbf7d0'; }}
                                style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #bbf7d0', background: '#f0fdf4', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <Icon name="Check" size={14} color="#16a34a" strokeWidth={2.5} />
                              </button>
                              <ActionMenu req={req}
                                onApprove={() => onApprove(req.id)}
                                onDecline={() => onDecline(req.id)}
                                onEdit={() => setAddModal(req)}
                                onCancel={() => setCancelAction(req)}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ background: P.white, border: `1px solid ${P.border}`, borderRadius: 12, padding: '24px 20px', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkFaint }}>No pending requests</div>
                </div>
              )}
            </div>

            {/* Balances card */}
            <div style={{ marginBottom: 36 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: P.ink }}>Balances <span style={{ fontWeight: 500, color: P.inkSoft }}>· {new Date().getFullYear()}</span></span>
                  {confirmedDate && (
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: P.inkFaint, marginTop: 2 }}>Confirmed on {confirmedDate}</div>
                  )}
                </div>
                {!needsSetup && (
                  <button onClick={() => setEditBalancesOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 8, border: `1px solid ${P.border}`, background: P.white, color: P.inkSoft, cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13 }}>
                    <Icon name="Pencil" size={14} color={P.inkSoft} />
                    Edit balances
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {balances.filter(b => b.entitled != null || b.type === 'ADV / RTT' || b.type === 'Extra-legal leave').map(b => {
                  const isLimited = b.entitled != null;
                  const isLow = isLimited && b.remaining === 0;
                  return (
                    <div key={b.type} style={{ flex: '1 1 160px', background: P.white, border: `1px solid ${P.border}`, borderRadius: 10, padding: '20px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: LEAVE_COLORS[b.type], border: `1.5px solid ${LEAVE_BORDER_COLORS[b.type] || P.border}`, flexShrink: 0 }} />
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: P.inkSoft }}>{b.type}</span>
                      </div>
                      {isLimited ? (
                        <>
                          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 30, color: isLow ? '#ef4444' : P.ink, lineHeight: 1 }}>
                            {b.remaining ?? 0}
                            <span style={{ fontSize: 14, fontWeight: 500, color: P.inkSoft }}> / {b.entitled} days</span>
                          </div>
                          <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: P.inkFaint, marginTop: 6 }}>{b.used} used</div>
                        </>
                      ) : (
                        <>
                          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 30, color: P.ink, lineHeight: 1 }}>
                            {b.used}
                            <span style={{ fontSize: 14, fontWeight: 500, color: P.inkSoft }}> days</span>
                          </div>
                          <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: P.inkFaint, marginTop: 6 }}>taken · no limit</div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Absence history */}
            <div>
              <div style={{ marginBottom: 12 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: P.ink }}>Absence history</span>
              </div>
              <div style={{ background: P.white, border: `1px solid ${P.border}`, borderRadius: 12, overflow: 'visible' }}>
              {empReqs.filter(r => r.status !== 'pending').length === 0 ? (
                <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                  <Icon name="CalendarOff" size={28} color={P.border} style={{ marginBottom: 8 }} />
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkFaint }}>No absences recorded yet</div>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-body)', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${P.border}` }}>
                      <th style={{ width: '20%', textAlign: 'left', padding: '9px 20px', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 11, color: P.inkFaint, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Date from</th>
                      <th style={{ width: '20%', textAlign: 'left', padding: '9px 16px', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 11, color: P.inkFaint, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Date to</th>
                      <th style={{ width: '25%', textAlign: 'left', padding: '9px 16px', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 11, color: P.inkFaint, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Type</th>
                      <th style={{ width: '15%', textAlign: 'center', padding: '9px 16px', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 11, color: P.inkFaint, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Days</th>
                      <th style={{ width: '15%', textAlign: 'left', padding: '9px 16px', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 11, color: P.inkFaint, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Status</th>
                      <th style={{ width: 40 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {empReqs.filter(r => r.status !== 'pending').map((req, idx, arr) => (
                      <tr key={req.id} onClick={() => setDetailReq(req)} style={{ borderBottom: idx < arr.length - 1 ? `1px solid ${P.border}` : 'none', cursor: 'pointer' }}>
                        <td style={{ padding: '12px 20px', fontSize: 14, color: P.ink }}>{req.startDate}</td>
                        <td style={{ padding: '12px 16px', fontSize: 14, color: req.endDate && req.endDate !== req.startDate ? P.ink : P.inkFaint }}>
                          {req.endDate && req.endDate !== req.startDate ? req.endDate : '—'}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: LEAVE_COLORS[req.type] || P.inkFaint, border: `1.5px solid ${LEAVE_BORDER_COLORS[req.type] || P.border}`, flexShrink: 0 }} />
                            <span style={{ fontSize: 14, color: P.ink }}>{req.type}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 14, textAlign: 'center', color: P.ink }}>
                          {req.days === 0.5 ? (
                            <span>{'½'}<span style={{ fontSize: 11, color: P.inkFaint, marginLeft: 3 }}>{req.halfDay || ''}</span></span>
                          ) : req.days || 1}
                        </td>
                        <td style={{ padding: '12px 16px' }}><StatusPill status={req.status} /></td>
                        <td style={{ padding: '10px 16px' }} onClick={e => e.stopPropagation()}>
                          <ActionMenu req={req}
                            onEdit={() => setAddModal(req)}
                            onCancel={() => setCancelAction(req)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              </div>
            </div>
          </div>
        ) : activeTab === 'choices' ? (
          <div><ChoicesTab empId={employeeId} /></div>
        ) : activeTab === 'budgets' ? (
          <div><BudgetsTab empId={employeeId} /></div>
        ) : activeTab === 'salary' ? (
          <div><SalaryTab empId={employeeId} /></div>
        ) : activeTab === 'details' ? (
          <div><DetailsTab emp={emp} empId={employeeId} /></div>
        ) : (
          <div style={{ background: P.white, border: `1px solid ${P.border}`, borderRadius: 12, padding: 24, maxWidth: 480, color: P.inkFaint, fontFamily: 'var(--font-body)', fontSize: 13 }}>
            Coming soon
          </div>
        )}
      </div>

      {addModal && (
        <AddTimeOffModal
          existing={addModal === 'add' ? { employee: employeeId, _lockEmployee: true } : { ...addModal, _lockEmployee: true }}
          requests={requests}
          onClose={() => setAddModal(null)}
          onSave={(req) => { onSave(req); setAddModal(null); }}
        />
      )}

      {cancelAction && (
        <ReasonModal
          title="Cancel absence"
          description={`You're cancelling ${emp.name}'s ${cancelAction.type}. This cannot be undone.`}
          confirmLabel="Cancel absence"
          onClose={() => setCancelAction(null)}
          onConfirm={(reason) => { onCancel(cancelAction.id, reason); setCancelAction(null); }}
        />
      )}

      {editBalancesOpen && (
        <EditBalancesModal
          emp={emp}
          balances={balancesForModal}
          onSave={onUpdateBalance}
          onClose={() => setEditBalancesOpen(false)}
          isNewEmployee={needsSetup}
          onConfirm={onConfirmBalances}
        />
      )}

      {detailReq && (
        <CalendarDrawer key={detailReq.id}
          req={detailReq}
          requests={requests}
          onClose={() => setDetailReq(null)}
          onApprove={(id) => { onApprove(id); setDetailReq(prev => prev?.id === id ? { ...prev, status: 'approved' } : prev); }}
          onDecline={(id, reason) => { onDecline(id, reason); setDetailReq(null); }}
          onCancel={(id, reason) => { onCancel(id, reason); setDetailReq(null); }}
          onSave={(req) => { onSave(req); setDetailReq(req); }}
        />
      )}

      {deactivateConfirm && (
        <div onClick={() => setDeactivateConfirm(false)} style={{
          position: 'fixed', inset: 0, zIndex: 300,
          background: 'rgba(15,13,40,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: P.white, borderRadius: 14, width: 400, padding: '28px 28px 24px',
            boxShadow: '0 8px 40px rgba(15,13,40,0.2)',
          }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Icon name="user-x" size={18} color="#dc2626" strokeWidth={1.75} />
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: P.ink, marginBottom: 6 }}>Deactivate {emp.name}?</div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkSoft, marginBottom: 24, lineHeight: 1.5 }}>
              {emp.name.split(' ')[0]} will lose access to Payflip immediately. Their data and history will be preserved.
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setDeactivateConfirm(false)} style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${P.border}`, background: P.white, color: P.inkSoft, cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13 }}>
                Cancel
              </button>
              <button onClick={() => { setDeactivateConfirm(false); onToast && onToast({ message: `${emp.name.split(' ')[0]} deactivated`, type: 'decline' }); }} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13 }}>
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Dashboard screen ──────────────────────────────────────────────────────
function DashboardListRow({ onClick, children }) {
  const [hover, setHover] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px',
      borderBottom: `1px solid ${P.border}`, cursor: 'pointer',
      background: hover ? P.bg : 'transparent', transition: `background 120ms ${EASE_OUT}`,
    }}>
      {children}
    </div>
  );
}

const PAYFLIP_CARD_IMG = 'https://www.figma.com/api/mcp/asset/86118957-1a80-4819-b71b-65247513e641';
const TWIKEY_LOGO_IMG = 'https://www.figma.com/api/mcp/asset/717eafe8-6673-4b0e-adb4-8fbbffe6a268';

// Pointer tracked on the outer flat wrapper; inner card rotates via CSS custom props.
// Per transitions-dev/19-card-tilt.md — MAX 14° is tasteful for a credit card.
function CardTilt({ children }) {
  const wrapperRef = useRef(null);
  const [rx, setRx] = React.useState(0);
  const [ry, setRy] = React.useState(0);
  const [gx, setGx] = React.useState(50);
  const [gy, setGy] = React.useState(50);
  const [hover, setHover] = React.useState(false);
  const [tilting, setTilting] = React.useState(false);
  const MAX = 14;

  const track = (e) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const r = wrapperRef.current.getBoundingClientRect();
    const px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    setHover(true); setTilting(true);
    setRx((0.5 - py) * MAX); setRy((px - 0.5) * MAX);
    setGx(px * 100); setGy(py * 100);
  };
  const reset = () => { setHover(false); setTilting(false); setRx(0); setRy(0); };

  return (
    <div ref={wrapperRef} onPointerMove={track} onPointerLeave={reset} style={{ touchAction: 'none', display: 'inline-block', filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.22)) drop-shadow(0 6px 16px rgba(0,0,0,0.14))' }}>
      <div style={{
        position: 'relative',
        transform: `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg)`,
        transformStyle: 'preserve-3d',
        transition: tilting
          ? 'transform 400ms cubic-bezier(0.22, 1, 0.36, 1)'
          : 'transform 1000ms cubic-bezier(0.22, 1, 0.36, 1)',
        willChange: 'transform',
      }}>
        {children}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          opacity: hover ? 0.32 : 0,
          mixBlendMode: 'screen',
          background: `
            radial-gradient(circle 95px at ${gx}% ${gy}%, rgba(255,255,255,0.48), rgba(255,255,255,0.06) 52%, rgba(255,255,255,0) 84%),
            radial-gradient(circle 200px at ${gx}% ${gy}%, rgba(255,255,255,0.22), rgba(255,255,255,0.04) 58%, rgba(255,255,255,0) 78%),
            radial-gradient(circle 360px at ${gx}% ${gy}%, rgba(255,255,255,0.10), rgba(255,255,255,0) 88%)
          `,
          transition: 'opacity 300ms cubic-bezier(0.22, 1, 0.36, 1)',
        }} />
      </div>
    </div>
  );
}

function MobilityLaunchWidget({ onToast }) {
  const [widgetMode, setWidgetMode] = useState('mobility');
  const [step, setStep] = useState(1);
  const [depositAmount, setDepositAmount] = useState('257');
  const [allowPhysical, setAllowPhysical] = useState(false);
  const [step1Open, setStep1Open] = useState(false);
  const [socialSecretariat, setSocialSecretariat] = useState('SD Worx');
  const [secOpen, setSecOpen] = useState(false);
  const [secSearch, setSecSearch] = useState('');
  const [secRect, setSecRect] = useState(null);
  const secTriggerRef = React.useRef(null);
  const [step3Open, setStep3Open] = useState(false);

  const switchMode = (mode) => {
    setWidgetMode(mode);
    setStep(1);
    setStep1Open(false);
    setStep3Open(false);
  };

  // Mobility: simulate first deposit arriving 5s after step 3
  React.useEffect(() => {
    if (widgetMode !== 'mobility' || step !== 3) return;
    const t = setTimeout(() => {
      setStep(4);
      onToast?.({ message: 'Funds received — your account is ready', type: 'approve' });
    }, 5000);
    return () => clearTimeout(t);
  }, [widgetMode, step]);

  // Food: simulate bank approval 5s after step 2
  React.useEffect(() => {
    if (widgetMode !== 'food' || step !== 2) return;
    const t = setTimeout(() => {
      setStep(3);
      onToast?.({ message: 'Mandate approved — select your social secretariat', type: 'approve' });
    }, 5000);
    return () => clearTimeout(t);
  }, [widgetMode, step]);

  const mobilityBadgeLabels = ['Ready to launch', 'Authorise direct debit', 'Awaiting first deposit', 'Ready to invite'];
  const foodBadgeLabels    = ['Ready to launch', 'Awaiting approval', 'Select secretariat', 'Ready to invite'];
  const headerBadgeLabel = (widgetMode === 'mobility' ? mobilityBadgeLabels : foodBadgeLabels)[step - 1];

  // State 1 uses circular badges; states 2+ use square badges
  const badgeRadius = step === 1 ? '999px' : '4px';

  const stepBadgeEl = (n, pop = false) => {
    const done = n < step;
    const active = n === step;
    if (done) return (
      <span style={{ width: 24, height: 24, borderRadius: '4px', background: '#008556', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, animation: pop ? `badgePopIn 400ms cubic-bezier(0.34, 1.36, 0.64, 1)` : undefined }}>
        <Icon name="check" size={12} color="#fff" strokeWidth={2.5} />
      </span>
    );
    return (
      <span style={{ width: 24, height: 24, borderRadius: badgeRadius, background: active ? P.ink : P.white, border: active ? 'none' : `1px solid ${P.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 12, color: active ? '#fff' : P.ink }}>
        {n}
      </span>
    );
  };

  const inactiveBg = '#fafafa';

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Prototype switcher — fixed floating pill, same layer as Employee App button */}
      <div style={{ position: 'fixed', bottom: 20, right: 158, zIndex: 100, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 10px 7px 12px', borderRadius: 20, background: P.action, boxShadow: 'rgba(15,13,40,0.2) 0px 2px 12px' }}>
        <Icon name="wrench" size={12} color="#fff" strokeWidth={2} />
        <div style={{ display: 'flex' }}>
          {['mobility', 'food'].map(m => (
            <button key={m} onClick={() => switchMode(m)} style={{
              padding: '2px 8px', borderRadius: 12, border: 'none',
              background: widgetMode === m ? 'rgba(255,255,255,0.18)' : 'transparent',
              cursor: 'pointer',
              fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12,
              color: widgetMode === m ? '#fff' : 'rgba(255,255,255,0.55)',
              transition: 'background 150ms ease, color 150ms ease',
              textTransform: 'capitalize',
            }}>
              {m === 'mobility' ? 'Mobility' : 'Food'}
            </button>
          ))}
        </div>
      </div>
    <div style={{ background: P.white, border: `1px solid ${P.border}`, borderRadius: 8, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: `1px solid ${P.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, color: P.ink, letterSpacing: '-0.025px' }}>
            Launch {widgetMode} card for your employees
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ background: P.ink, color: '#fff', borderRadius: 8, padding: '2px 8px', fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 12, letterSpacing: '0.06px', whiteSpace: 'nowrap' }}>
            {headerBadgeLabel}
          </span>
          <Icon name="chevron-up" size={24} color={P.ink} strokeWidth={2} />
        </div>
      </div>

      {/* Body */}
      <div style={{ display: 'flex', alignItems: 'stretch' }}>
        {/* Steps column — fixed 480px */}
        <div style={{ width: 480, minWidth: 480, borderRight: `1px solid ${P.border}`, display: 'flex', flexDirection: 'column' }}>
        {widgetMode === 'mobility' ? (<>

          {/* Step 1 */}
          <div style={{ background: step === 1 ? P.white : inactiveBg, borderBottom: `1px solid ${P.border}` }}>
            {step === 1 ? (
              <div key="step1-active" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24, animation: `stepContentEnter 250ms ${EASE_OUT}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {stepBadgeEl(1)}
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, color: P.ink }}>Set deposit amount</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: P.ink, lineHeight: '20px', margin: 0 }}>
                    This is your initial deposit — we'll collect it now to fund your mobility account. After that, direct debit automatically tops up the account whenever the balance runs low, so your employees always have funds available.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <label style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 14, color: P.ink, letterSpacing: '0.035px' }}>Recommended amount to collect</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: `1px solid #bec0c5`, borderRadius: 8, padding: '8px 12px', height: 40, background: P.white }}>
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: P.ink, flexShrink: 0 }}>€</span>
                        <input value={depositAmount} onChange={e => setDepositAmount(e.target.value)} style={{ border: 'none', outline: 'none', fontFamily: 'var(--font-body)', fontSize: 14, color: P.ink, width: '100%', background: 'transparent' }} />
                      </div>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: P.inkSoft, margin: 0, lineHeight: '16px' }}>
                        Based on the employee's 2025 mobility spending for 19 employees with a mobility budget
                      </p>
                    </div>
                    <a href="#" onClick={e => e.preventDefault()} style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: P.ink, textDecoration: 'underline', letterSpacing: '-0.035px' }}>
                      How is this calculated?
                    </a>
                  </div>
                  <button onClick={() => setStep(2)} style={{ width: '100%', padding: '8px 16px', minHeight: 36, borderRadius: 8, border: 'none', background: P.action, color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16 }}>
                    Confirm amount
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ animation: `stepDoneEnter 200ms ${EASE_OUT}` }}>
                <div
                  onClick={step === 2 ? () => setStep1Open(v => !v) : undefined}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 24, cursor: step === 2 ? 'pointer' : 'default' }}
                >
                  {stepBadgeEl(1)}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, color: P.inkSoft }}>Deposit scheduled</span>
                    {step === 2 && <Icon name="chevron-down" size={24} color={P.ink} strokeWidth={2} style={{ transform: step1Open ? 'rotate(180deg)' : 'rotate(0deg)', transition: `transform 200ms ${EASE_OUT}` }} />}
                  </div>
                </div>
                {step === 2 && step1Open && (
                  <div style={{ padding: '0 24px 20px 60px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: P.ink }}>€{depositAmount},00</span>
                    <a href="#" onClick={e => { e.preventDefault(); setStep(1); setStep1Open(false); }} style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: P.ink, textDecoration: 'underline' }}>
                      Edit amount
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Step 2 */}
          <div style={{ background: step === 2 ? P.white : inactiveBg, borderBottom: `1px solid ${P.border}` }}>
            {step === 2 ? (
              <div key="step2-active" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24, animation: `stepContentEnter 250ms ${EASE_OUT}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {stepBadgeEl(2)}
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, color: P.ink }}>Authorise direct debit</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: P.ink, lineHeight: '20px', margin: 0, flex: 1 }}>
                      You're authorising Payflip to collect <strong>€{depositAmount},00</strong> now to fund your mobility account, and to automatically top it up when the balance runs low.
                    </p>
                    <img src={TWIKEY_LOGO_IMG} alt="twikey" style={{ width: 62, height: 27, flexShrink: 0, display: 'block' }} />
                  </div>
                  <a href="#" onClick={e => { e.preventDefault(); setStep(1); }} style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: P.ink, textDecoration: 'underline', letterSpacing: '-0.035px' }}>
                    Edit amount
                  </a>
                </div>
                <button onClick={() => setStep(3)} style={{ width: '100%', padding: '8px 16px', minHeight: 36, borderRadius: 8, border: 'none', background: P.action, color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16 }}>
                  Sign mandate
                </button>
              </div>
            ) : step < 2 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 24 }}>
                {stepBadgeEl(2)}
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 16, color: P.inkSoft }}>Authorise direct debit</span>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 24, animation: `stepDoneEnter 200ms ${EASE_OUT}` }}>
                {stepBadgeEl(2)}
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, color: P.inkSoft }}>Mandate signed</span>
              </div>
            )}
          </div>

          {/* Step 3 */}
          <div style={{ background: step === 3 ? P.white : inactiveBg, borderBottom: `1px solid ${P.border}` }}>
            {step === 3 ? (
              <div key="step3-active" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, animation: `stepContentEnter 250ms ${EASE_OUT}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {stepBadgeEl(3)}
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, color: P.ink }}>Awaiting first deposit</span>
                </div>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: P.inkSoft, lineHeight: '20px', margin: 0 }}>
                  We're handling the bank approval and collecting your first deposit. We'll notify you when the funds are available — usually within 3 business days.
                </p>
              </div>
            ) : step < 3 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 24 }}>
                {stepBadgeEl(3)}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 16, color: P.inkSoft }}>Awaiting bank approval</span>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: P.inkSoft }}>~3 business days</span>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 24, animation: `stepDoneEnter 200ms ${EASE_OUT}` }}>
                {stepBadgeEl(3, step === 4)}
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, color: P.inkSoft }}>Funds received</span>
              </div>
            )}
          </div>

          {/* Step 4 */}
          <div style={{ background: step === 4 ? P.white : inactiveBg, borderBottom: `1px solid ${P.border}` }}>
            {step === 4 ? (
              <div key="step4-active" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, animation: `stepContentEnter 250ms ${EASE_OUT}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {stepBadgeEl(4)}
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, color: P.ink }}>Invite your employees</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: P.inkSoft, lineHeight: '20px', margin: 0 }}>
                    Your mobility account is funded. Employees will receive an email to download the Payflip app and request their own card.
                  </p>
                  {/* Physical card toggle */}
                  <div style={{ border: `1px solid ${P.border}`, borderRadius: 9, padding: 16, display: 'flex', gap: 16, alignItems: 'flex-start', background: P.white }}>
                    <div style={{ width: 40, height: 40, borderRadius: 8, background: '#f7f7f8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon name="credit-card" size={24} color={P.inkSoft} strokeWidth={1.75} />
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 14, color: '#171717', lineHeight: '20px', letterSpacing: '-0.07px' }}>Allow physical card requests</span>
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: P.inkSoft, lineHeight: '16px', letterSpacing: '-0.06px' }}>Employees can request a physical card in addition to their virtual card.</span>
                      </div>
                      <span style={{ fontFamily: 'var(--font-body)', fontStyle: 'italic', fontSize: 12, color: P.ink, lineHeight: '16px', letterSpacing: '-0.06px' }}>A one-time fee of €8 applies per card.</span>
                    </div>
                    {/* Toggle */}
                    <div
                      onClick={() => setAllowPhysical(v => !v)}
                      style={{ width: 33, height: 18, borderRadius: 999, background: allowPhysical ? P.ink : '#eaeaeb', position: 'relative', cursor: 'pointer', flexShrink: 0, marginTop: 1.5, transition: 'background 150ms ease' }}
                    >
                      <div style={{ position: 'absolute', top: 2, left: 2, width: 14, height: 14, borderRadius: '50%', background: '#fff', transform: allowPhysical ? 'translateX(15px)' : 'translateX(0)', transition: 'transform 150ms ease', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
                    </div>
                  </div>
                  <button onClick={() => {}} style={{ width: '100%', padding: '8px 16px', minHeight: 36, borderRadius: 8, border: 'none', background: P.action, color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16 }}>
                    Review and send invites
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 24 }}>
                {stepBadgeEl(4)}
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 16, color: P.inkSoft }}>Invite your employees</span>
              </div>
            )}
          </div>

        </>) : (<>

          {/* Food Step 1 — Authorise direct debit */}
          <div style={{ background: step === 1 ? P.white : inactiveBg, borderBottom: `1px solid ${P.border}` }}>
            {step === 1 ? (
              <div key="food-step1-active" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24, animation: `stepContentEnter 250ms ${EASE_OUT}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {stepBadgeEl(1)}
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, color: P.ink }}>Authorise direct debit</span>
                </div>
                <img src={TWIKEY_LOGO_IMG} alt="twikey" style={{ width: 62, height: 27, display: 'block' }} />
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: P.ink, lineHeight: '20px', margin: 0 }}>
                  This allows Payflip to automatically collect funds from your company account when your employees' card balance runs low — so their budget is always available without manual top-ups. You only need to authorise this once.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <button onClick={() => setStep(2)} style={{ width: '100%', padding: '8px 16px', minHeight: 36, borderRadius: 8, border: 'none', background: P.action, color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16 }}>
                    Sign mandate
                  </button>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkSoft, textAlign: 'center' }}>You'll be redirected to Twikey to sign the mandate.</span>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 24, animation: `stepDoneEnter 200ms ${EASE_OUT}` }}>
                {stepBadgeEl(1)}
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, color: P.inkSoft }}>Mandate signed</span>
              </div>
            )}
          </div>

          {/* Food Step 2 — Awaiting bank approval (auto-advances after 5s) */}
          <div style={{ background: step === 2 ? P.white : inactiveBg, borderBottom: `1px solid ${P.border}` }}>
            {step === 2 ? (
              <div key="food-step2-active" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, animation: `stepContentEnter 250ms ${EASE_OUT}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {stepBadgeEl(2)}
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, color: P.ink }}>Awaiting bank approval</span>
                </div>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: P.ink, lineHeight: '20px', margin: 0 }}>
                  Your bank is reviewing the direct debit mandate. This usually takes a few hours but can take up to 24 hours. We'll notify you once it's approved.
                </p>
              </div>
            ) : step < 2 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 24 }}>
                {stepBadgeEl(2)}
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 16, color: P.inkSoft }}>Awaiting bank approval</span>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 24, animation: `stepDoneEnter 200ms ${EASE_OUT}` }}>
                {stepBadgeEl(2, step === 3)}
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, color: P.inkSoft }}>Mandate approved</span>
              </div>
            )}
          </div>

          {/* Food Step 3 — Select social secretariat */}
          <div style={{ background: step === 3 ? P.white : inactiveBg, borderBottom: `1px solid ${P.border}` }}>
            {step === 3 ? (
              <div key="food-step3-active" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, animation: `stepContentEnter 250ms ${EASE_OUT}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {stepBadgeEl(3)}
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, color: P.ink }}>Select your social secretariat</span>
                </div>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: P.ink, lineHeight: '20px', margin: 0 }}>
                  We use your social secretariat to sync employee data and ensure correct meal voucher calculations.
                </p>
                <div style={{ position: 'relative' }}>
                  <button ref={secTriggerRef} onClick={() => { const r = secTriggerRef.current?.getBoundingClientRect(); setSecRect(r || null); setSecOpen(v => !v); setSecSearch(''); }} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', height: 40, border: `1px solid #bec0c5`, borderRadius: 8, background: P.white, cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 14, color: P.ink }}>
                    <span>{socialSecretariat}</span>
                    <Icon name="chevrons-up-down" size={16} color={P.inkSoft} strokeWidth={2} />
                  </button>
                  {secOpen && secRect && (
                    <div style={{ position: 'fixed', top: secRect.bottom + 4, left: secRect.left, width: secRect.width, zIndex: 1000, background: P.white, border: `1px solid ${P.border}`, borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                      <div style={{ padding: 8, borderBottom: `1px solid ${P.border}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: `1px solid #bec0c5`, borderRadius: 8, padding: '6px 10px' }}>
                          <Icon name="search" size={14} color={P.inkSoft} strokeWidth={2} />
                          <input autoFocus value={secSearch} onChange={e => setSecSearch(e.target.value)} placeholder="Search..." style={{ border: 'none', outline: 'none', fontFamily: 'var(--font-body)', fontSize: 14, color: P.ink, background: 'transparent', width: '100%' }} />
                        </div>
                      </div>
                      <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                        {['SD Worx', 'Securex', 'Partena Professional', 'Acerta', 'Liantis', 'Xerius', 'Group S', 'UCM', 'Zenito'].filter(s => s.toLowerCase().includes(secSearch.toLowerCase())).map(s => (
                          <button key={s} onClick={() => { setSocialSecretariat(s); setSecOpen(false); setSecSearch(''); }} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', border: 'none', background: s === socialSecretariat ? P.bg : P.white, cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-body)', fontSize: 14, color: P.ink }}>
                            <span>{s}</span>
                            {s === socialSecretariat && <Icon name="check" size={16} color={P.ink} strokeWidth={2} />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <button onClick={() => { setSecOpen(false); setStep(4); }} style={{ width: '100%', padding: '8px 16px', minHeight: 36, borderRadius: 8, border: 'none', background: P.action, color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16 }}>
                  Confirm
                </button>
              </div>
            ) : step < 3 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 24 }}>
                {stepBadgeEl(3)}
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 16, color: P.inkSoft }}>Select your social secretariat</span>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 24, animation: `stepDoneEnter 200ms ${EASE_OUT}` }}>
                {stepBadgeEl(3, step === 4)}
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, color: P.inkSoft }}>{socialSecretariat}</span>
                <a href="#" onClick={e => { e.preventDefault(); setStep(3); }} style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: P.ink, textDecoration: 'underline', marginLeft: 'auto' }}>Edit</a>
              </div>
            )}
          </div>

          {/* Food Step 4 — Notify employees */}
          <div style={{ background: step === 4 ? P.white : inactiveBg, borderBottom: `1px solid ${P.border}` }}>
            {step === 4 ? (
              <div key="food-step4-active" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, animation: `stepContentEnter 250ms ${EASE_OUT}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {stepBadgeEl(4)}
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, color: P.ink }}>Notify your employees</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: P.inkSoft, lineHeight: '20px', margin: 0 }}>
                    Invite your employees to download the Payflip app. They'll instantly receive their virtual meal voucher card and can order a physical card directly from the app.
                  </p>
                  <button onClick={() => {}} style={{ width: '100%', padding: '8px 16px', minHeight: 36, borderRadius: 8, border: 'none', background: P.action, color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16 }}>
                    Notify employees
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 24 }}>
                {stepBadgeEl(4)}
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 16, color: P.inkSoft }}>Notify your employees</span>
              </div>
            )}
          </div>

        </>)}

        </div>

        {/* Card image column */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 24px' }}>
          <CardTilt>
            <img src={PAYFLIP_CARD_IMG} alt="Payflip mobility card" style={{ width: 347, height: 218, display: 'block' }} />
          </CardTilt>
        </div>
      </div>
    </div>
    </div>
  );
}

function DashboardScreen({ requests, onNav, onToast }) {
  const today = new Date(); today.setHours(0,0,0,0);
  return (
    <div style={{ flex: 1, overflow: 'auto', animation: `screenEnter 180ms ${EASE_OUT}` }}>
      <PageHeader
        title="Home"
        subtitle={today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      />
      <div style={{ padding: '24px 32px' }}>
        <MobilityLaunchWidget onToast={onToast} />
      </div>
    </div>
  );
}

// ── Stub screens ──────────────────────────────────────────────────────────
// ── Expense category settings ──────────────────────────────────────────────
function CategoryModal({ title, initialVal, initialLimit, onSave, onDelete, onClose }) {
  const { visible, close } = useModalTransition(onClose);
  const [val, setVal] = useState(initialVal);
  const [limitVal, setLimitVal] = useState(initialLimit != null ? String(initialLimit) : '');
  const save = () => {
    const t = val.trim();
    if (!t) return;
    const n = parseFloat(limitVal);
    onSave(t, isNaN(n) ? null : n);
    close();
  };
  return (
    <div onClick={close} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(15,13,40,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', ...modalBackdropStyle(visible) }}>
      <div onClick={e => e.stopPropagation()} style={{ background: P.white, borderRadius: 14, width: 420, boxShadow: '0 8px 40px rgba(15,13,40,0.2)', display: 'flex', flexDirection: 'column', ...modalPanelStyle(visible) }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: `1px solid ${P.border}` }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: P.ink }}>{title}</span>
          <button onClick={close} style={{ border: 'none', cursor: 'pointer', width: 30, height: 30, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(60,60,67,0.1)' }}>
            <Icon name="X" size={14} color={P.ink} strokeWidth={2.5} />
          </button>
        </div>
        <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: P.inkSoft, marginBottom: 6 }}>Name</label>
            <input autoFocus value={val} onChange={e => setVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') close(); }}
              placeholder="Category name"
              style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: `1px solid ${P.border}`, fontFamily: 'var(--font-body)', fontSize: 14, color: P.ink, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: P.inkSoft, marginBottom: 6 }}>Spending limit</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: `1px solid ${P.border}`, borderRadius: 7, padding: '8px 10px' }}>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: P.inkSoft }}>€</span>
              <input type="number" min="0" value={limitVal} onChange={e => setLimitVal(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') close(); }}
                placeholder="No limit"
                style={{ flex: 1, border: 'none', outline: 'none', fontFamily: 'var(--font-body)', fontSize: 14, color: P.ink, background: 'transparent' }} />
            </div>
            <p style={{ margin: '4px 0 0', fontFamily: 'var(--font-body)', fontSize: 12, color: P.inkFaint }}>Leave blank for no limit.</p>
          </div>
        </div>
        <div style={{ padding: '14px 22px', borderTop: `1px solid ${P.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
          {onDelete && (
            <button onClick={() => { onDelete(); close(); }} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: '#dc2626', padding: 0, marginRight: 'auto' }}>
              Delete
            </button>
          )}
          <button onClick={close} style={{ padding: '8px 18px', borderRadius: 8, border: `1px solid ${P.border}`, background: 'transparent', color: P.ink, cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13 }}>Cancel</button>
          <button onClick={save} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: P.action, color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13 }}>Save</button>
        </div>
      </div>
    </div>
  );
}

function PickModal({ title, options, value, onSave, onClose, extraField }) {
  const { visible, close } = useModalTransition(onClose);
  const [selected, setSelected] = useState(value);
  const [extraVal, setExtraVal] = useState(extraField ? String(extraField.defaultValue) : '');
  const save = () => { const n = parseFloat(extraVal); onSave(selected, extraField && selected === extraField.forValue ? (isNaN(n) ? extraField.defaultValue : n) : undefined); close(); };
  return (
    <div onClick={close} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(15,13,40,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', ...modalBackdropStyle(visible) }}>
      <div onClick={e => e.stopPropagation()} style={{ background: P.white, borderRadius: 14, width: 420, boxShadow: '0 8px 40px rgba(15,13,40,0.2)', display: 'flex', flexDirection: 'column', ...modalPanelStyle(visible) }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: `1px solid ${P.border}` }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: P.ink }}>{title}</span>
          <button onClick={close} style={{ border: 'none', cursor: 'pointer', width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(60,60,67,0.1)' }}>
            <Icon name="X" size={14} color={P.ink} strokeWidth={2.5} />
          </button>
        </div>
        <div style={{ padding: '8px 14px' }}>
          {options.map(opt => (
            <React.Fragment key={opt.value}>
            <div onClick={() => setSelected(opt.value)}
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 10px', cursor: 'pointer', borderRadius: 8 }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${selected === opt.value ? P.action : P.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {selected === opt.value && <div style={{ width: 8, height: 8, borderRadius: '50%', background: P.action }} />}
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: P.ink }}>{opt.label}</div>
                {opt.hint && <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkSoft, marginTop: 2 }}>{opt.hint}</div>}
              </div>
            </div>
            {extraField && opt.value === extraField.forValue && selected === extraField.forValue && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 10px 8px 42px' }}>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkSoft }}>{extraField.label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, border: `1px solid ${P.border}`, borderRadius: 7, padding: '5px 8px', background: P.bg }}>
                  <input type="number" min={extraField.min || 1} value={extraVal} onChange={e => setExtraVal(e.target.value)}
                    style={{ width: 48, border: 'none', outline: 'none', fontFamily: 'var(--font-body)', fontSize: 14, color: P.ink, background: 'transparent', textAlign: 'right' }} />
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkSoft }}>{extraField.suffix}</span>
                </div>
              </div>
            )}
            </React.Fragment>
          ))}
        </div>
        <div style={{ padding: '14px 22px', borderTop: `1px solid ${P.border}`, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={close} style={{ padding: '8px 18px', borderRadius: 8, border: `1px solid ${P.border}`, background: 'transparent', color: P.ink, cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13 }}>Cancel</button>
          <button onClick={save} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: P.action, color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13 }}>Save</button>
        </div>
      </div>
    </div>
  );
}

function AmountModal({ title, label, value, onSave, onClose, nullable }) {
  const { visible, close } = useModalTransition(onClose);
  const [val, setVal] = useState(value != null ? String(value) : '');
  const save = () => { const n = parseFloat(val); onSave(isNaN(n) ? null : n); close(); };
  return (
    <div onClick={close} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(15,13,40,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', ...modalBackdropStyle(visible) }}>
      <div onClick={e => e.stopPropagation()} style={{ background: P.white, borderRadius: 14, width: 420, boxShadow: '0 8px 40px rgba(15,13,40,0.2)', display: 'flex', flexDirection: 'column', ...modalPanelStyle(visible) }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: `1px solid ${P.border}` }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: P.ink }}>{title}</span>
          <button onClick={close} style={{ border: 'none', cursor: 'pointer', width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(60,60,67,0.1)' }}>
            <Icon name="X" size={14} color={P.ink} strokeWidth={2.5} />
          </button>
        </div>
        <div style={{ padding: '18px 22px' }}>
          <label style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: P.inkSoft, marginBottom: 6 }}>{label}</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: `1px solid ${P.border}`, borderRadius: 7, padding: '8px 10px' }}>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: P.inkSoft }}>€</span>
            <input autoFocus type="number" min="0" value={val} onChange={e => setVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') close(); }}
              placeholder="0"
              style={{ flex: 1, border: 'none', outline: 'none', fontFamily: 'var(--font-body)', fontSize: 14, color: P.ink, background: 'transparent' }} />
          </div>
          {nullable && <p style={{ margin: '6px 0 0', fontFamily: 'var(--font-body)', fontSize: 12, color: P.inkFaint }}>Leave blank for no limit.</p>}
        </div>
        <div style={{ padding: '14px 22px', borderTop: `1px solid ${P.border}`, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={close} style={{ padding: '8px 18px', borderRadius: 8, border: `1px solid ${P.border}`, background: 'transparent', color: P.ink, cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13 }}>Cancel</button>
          <button onClick={save} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: P.action, color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13 }}>Save</button>
        </div>
      </div>
    </div>
  );
}

const REIMBURSE_OPTS = [
  { value: 'payroll', label: 'With next payroll run', hint: 'Included in the monthly payroll processing' },
  { value: 'weekly',  label: 'Separate bank transfer', hint: 'Processed independently from the payroll cycle' },
  { value: 'manual',  label: 'Manual (on request)', hint: 'Finance triggers payment manually' },
];
const APPROVAL_OPTS = [
  { value: 'manager', label: 'Direct manager', hint: 'Employee\'s line manager receives the request' },
  { value: 'finance', label: 'Finance approver', hint: 'Person assigned in Team & access' },
  { value: 'auto',    label: 'Auto-approve under threshold', hint: 'Expenses below the receipt threshold auto-approve' },
];

function ExpenseCategorySettings({ categories, onSave }) {
  const [items, setItems] = useState(categories);
  const [catModal, setCatModal] = useState(null);       // { idx: number | 'new' }
  const [settingModal, setSettingModal] = useState(null); // 'cycle' | 'threshold' | 'approval' | { limit: cat }

  const [reimburseCycle, setReimburseCycle] = useState('payroll');
  const [receiptThreshold, setReceiptThreshold] = useState(25);
  const [approvalRouting, setApprovalRouting] = useState('manager');
  const [spendingLimits, setSpendingLimits] = useState({});

  const handleCatSave = (val, limit) => {
    const next = catModal.idx === 'new'
      ? [...items, val]
      : items.map((c, i) => i === catModal.idx ? val : c);
    setItems(next); onSave(next);
    const oldName = catModal.idx !== 'new' ? items[catModal.idx] : val;
    setSpendingLimits(prev => {
      const updated = { ...prev };
      if (catModal.idx !== 'new' && oldName !== val) { updated[val] = updated[oldName]; delete updated[oldName]; }
      if (limit != null) updated[val] = limit; else delete updated[val];
      return updated;
    });
  };
  const handleCatDelete = () => {
    const name = items[catModal.idx];
    const next = items.filter((_, i) => i !== catModal.idx);
    setItems(next); onSave(next);
    setSpendingLimits(prev => { const u = { ...prev }; delete u[name]; return u; });
  };

  const SL = { fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 11, color: P.inkSoft, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 };
  const card = { border: `1px solid ${P.border}`, borderRadius: 16, overflow: 'clip', background: P.white };
  const settingRow = (onClick, icon, label, value, last) => (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', borderBottom: last ? 'none' : `1px solid ${P.border}`, cursor: 'pointer' }}>
      <Icon name={icon} size={18} color={P.inkFaint} strokeWidth={1.75} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1, fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 14, color: P.ink }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkSoft, marginRight: 6 }}>{value}</span>
      <Icon name="chevron-right" size={16} color={P.inkFaint} strokeWidth={1.75} style={{ flexShrink: 0 }} />
    </div>
  );

  const cycleLabel = (REIMBURSE_OPTS.find(o => o.value === reimburseCycle) || {}).label || '';
  const approvalLabel = (APPROVAL_OPTS.find(o => o.value === approvalRouting) || {}).label || '';
  const thresholdLabel = receiptThreshold != null ? `€ ${receiptThreshold}` : 'No threshold';

  return (
    <>
    {catModal && (
      <CategoryModal
        title={catModal.idx === 'new' ? 'Add category' : 'Edit category'}
        initialVal={catModal.idx === 'new' ? '' : items[catModal.idx]}
        initialLimit={catModal.idx === 'new' ? null : (spendingLimits[items[catModal.idx]] ?? null)}
        onSave={handleCatSave}
        onDelete={catModal.idx !== 'new' ? handleCatDelete : null}
        onClose={() => setCatModal(null)}
      />
    )}
    {settingModal === 'cycle' && (
      <PickModal title="Reimbursement cycle" options={REIMBURSE_OPTS} value={reimburseCycle} onSave={setReimburseCycle} onClose={() => setSettingModal(null)} />
    )}
    {settingModal === 'threshold' && (
      <AmountModal title="Receipt threshold" label="Require receipt above" value={receiptThreshold} onSave={setReceiptThreshold} onClose={() => setSettingModal(null)} nullable />
    )}
    {settingModal === 'approval' && (
      <PickModal title="Approval routing" options={APPROVAL_OPTS} value={approvalRouting} onSave={setApprovalRouting} onClose={() => setSettingModal(null)} />
    )}
    <div style={{ flex: 1, overflow: 'auto', animation: `screenEnter 180ms ${EASE_OUT}` }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 32px', display: 'flex', flexDirection: 'column', gap: 32 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: P.ink, margin: 0, letterSpacing: '-0.02em' }}>Expenses</h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkFaint, margin: '4px 0 0' }}>Manage expense settings for your company</p>
        </div>

        <div>
          <div style={SL}>Expense categories</div>
          <div style={card}>
            {items.map((cat, idx) => {
              const lim = spendingLimits[cat];
              return (
                <div key={cat + idx} onClick={() => setCatModal({ idx })} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', borderBottom: idx < items.length - 1 ? `1px solid ${P.border}` : 'none', cursor: 'pointer' }}>
                  <Icon name="tag" size={18} color={P.inkFaint} strokeWidth={1.75} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 14, color: P.ink }}>{cat}</span>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: lim != null ? P.inkSoft : P.inkFaint, marginRight: 6 }}>{lim != null ? `€ ${lim}` : 'No limit'}</span>
                  <Icon name="chevron-right" size={16} color={P.inkFaint} strokeWidth={1.75} style={{ flexShrink: 0 }} />
                </div>
              );
            })}
          </div>
          <button onClick={() => setCatModal({ idx: 'new' })} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, padding: '9px 14px', borderRadius: 8, border: `1px solid ${P.border}`, background: P.white, cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: P.ink }}>
            <Icon name="plus" size={14} color={P.ink} strokeWidth={2.5} /> Add category
          </button>
        </div>

        <div>
          <div style={SL}>Reimbursement</div>
          <div style={card}>
            {settingRow(() => setSettingModal('cycle'), 'calendar', 'Reimbursement cycle', cycleLabel, true)}
          </div>
        </div>

        <div>
          <div style={SL}>Receipt policy</div>
          <div style={card}>
            {settingRow(() => setSettingModal('threshold'), 'paperclip', 'Receipt required above', thresholdLabel, true)}
          </div>
        </div>

        <div>
          <div style={SL}>Approval</div>
          <div style={card}>
            {settingRow(() => setSettingModal('approval'), 'check-circle', 'Who approves?', approvalLabel, true)}
          </div>
        </div>

      </div>
    </div>
    </>
  );
}

function PersonPickerModal({ title, value, onSave, onClose }) {
  const { visible, close } = useModalTransition(onClose);
  const [selected, setSelected] = useState(value || []);
  const [search, setSearch] = useState('');
  const save = () => { onSave(selected); close(); };

  const toggle = (key) => setSelected(prev =>
    prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
  );

  const filtered = Object.entries(EMPLOYEES)
    .filter(([, e]) => e.name.toLowerCase().includes(search.toLowerCase()) || e.department.toLowerCase().includes(search.toLowerCase()))
    .map(([key, e]) => ({ value: key, name: e.name, dept: e.department, initials: e.initials, color: e.color }));

  return (
    <div onClick={close} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(15,13,40,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', ...modalBackdropStyle(visible) }}>
      <div onClick={e => e.stopPropagation()} style={{ background: P.white, borderRadius: 14, width: 440, maxHeight: '70vh', boxShadow: '0 8px 40px rgba(15,13,40,0.2)', display: 'flex', flexDirection: 'column', ...modalPanelStyle(visible) }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: `1px solid ${P.border}`, flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: P.ink }}>{title}</div>
            {selected.length > 0 && <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkSoft, marginTop: 2 }}>{selected.length} selected</div>}
          </div>
          <button onClick={close} style={{ border: 'none', cursor: 'pointer', width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(60,60,67,0.1)' }}>
            <Icon name="X" size={14} color={P.ink} strokeWidth={2.5} />
          </button>
        </div>
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${P.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: P.bg, borderRadius: 8, padding: '8px 12px' }}>
            <Icon name="search" size={14} color={P.inkSoft} strokeWidth={2} />
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or department"
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--font-body)', fontSize: 14, color: P.ink }} />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 14px' }}>
          {filtered.map(emp => {
            const on = selected.includes(emp.value);
            return (
              <div key={emp.value} onClick={() => toggle(emp.value)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 10px', cursor: 'pointer', borderRadius: 8 }}>
                <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${on ? P.action : P.border}`, background: on ? P.action : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: `background 120ms, border-color 120ms` }}>
                  {on && <Icon name="check" size={11} color="#fff" strokeWidth={3} />}
                </div>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: emp.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 10, color: P.ink }}>{emp.initials}</span>
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: P.ink }}>{emp.name}</div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkSoft }}>{emp.dept}</div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ padding: '20px 10px', fontFamily: 'var(--font-body)', fontSize: 14, color: P.inkSoft, textAlign: 'center' }}>No results</div>
          )}
        </div>
        <div style={{ padding: '14px 22px', borderTop: `1px solid ${P.border}`, display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0 }}>
          <button onClick={close} style={{ padding: '8px 18px', borderRadius: 8, border: `1px solid ${P.border}`, background: 'transparent', color: P.ink, cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13 }}>Cancel</button>
          <button onClick={save} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: P.action, color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13 }}>Save</button>
        </div>
      </div>
    </div>
  );
}

const ROLE_DEFS = [
  { key: 'finance-approver', label: 'Finance approver', icon: 'banknote',    hint: 'Reviews and approves expense submissions' },
  { key: 'hr-manager',       label: 'HR manager',       icon: 'user-check',  hint: 'Manages time off, people, and HR settings' },
  { key: 'payroll-admin',    label: 'Payroll admin',    icon: 'calculator',  hint: 'Runs payroll and accesses salary data' },
];

const ADMIN_ACCESS = [
  { key: 'full',    label: 'Full access',  hint: 'Can manage all settings and data' },
  { key: 'limited', label: 'Limited',      hint: 'Can view and approve but not change settings' },
];

function TeamAccessSettings() {
  const [roleAssignments, setRoleAssignments] = useState({
    'finance-approver': [],
    'hr-manager': [],
    'payroll-admin': [],
  });
  const [admins, setAdmins] = useState([
    { id: 'bruno-coen', name: 'Bruno Coen', initials: 'BC', color: '#c7d2fe', email: 'bruno@payflip.be', access: 'owner' },
  ]);
  const [roleModal, setRoleModal] = useState(null);
  const [adminModal, setAdminModal] = useState(null);

  const SL = { fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 11, color: P.inkSoft, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 };
  const card = { border: `1px solid ${P.border}`, borderRadius: 16, overflow: 'clip', background: P.white };

  return (
    <>
    {roleModal && (
      <PersonPickerModal
        title={ROLE_DEFS.find(r => r.key === roleModal)?.label}
        value={roleAssignments[roleModal]}
        onSave={v => setRoleAssignments(prev => ({ ...prev, [roleModal]: v }))}
        onClose={() => setRoleModal(null)}
      />
    )}
    {adminModal && (
      <PickModal
        title="Access level"
        options={ADMIN_ACCESS}
        value={admins.find(a => a.id === adminModal)?.access || 'full'}
        onSave={v => setAdmins(prev => prev.map(a => a.id === adminModal ? { ...a, access: v } : a))}
        onClose={() => setAdminModal(null)}
      />
    )}
    <div style={{ flex: 1, overflow: 'auto', animation: `screenEnter 180ms ${EASE_OUT}` }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 32px', display: 'flex', flexDirection: 'column', gap: 32 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: P.ink, margin: 0, letterSpacing: '-0.02em' }}>Team & access</h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkSoft, margin: '4px 0 0' }}>Manage roles and administrator access for your company</p>
        </div>

        <div>
          <div style={SL}>Roles</div>
          <div style={card}>
            {ROLE_DEFS.map((role, idx) => {
              const assignees = roleAssignments[role.key];
              const visible = assignees.slice(0, 3);
              const overflow = assignees.length - 3;
              return (
                <div key={role.key} onClick={() => setRoleModal(role.key)}
                  style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', borderBottom: idx < ROLE_DEFS.length - 1 ? `1px solid ${P.border}` : 'none', cursor: 'pointer' }}>
                  <Icon name={role.icon} size={18} color={P.inkFaint} strokeWidth={1.75} style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 14, color: P.ink }}>{role.label}</div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkSoft, marginTop: 1 }}>{role.hint}</div>
                  </div>
                  {assignees.length > 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', marginRight: 6 }}>
                      <div style={{ display: 'flex', flexDirection: 'row-reverse' }}>
                        {overflow > 0 && (
                          <div style={{ width: 24, height: 24, borderRadius: '50%', background: P.bg, border: `2px solid ${P.white}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: -6 }}>
                            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 9, color: P.inkSoft }}>+{overflow}</span>
                          </div>
                        )}
                        {[...visible].reverse().map(id => {
                          const e = EMPLOYEES[id];
                          return e ? (
                            <div key={id} style={{ width: 24, height: 24, borderRadius: '50%', background: e.color, border: `2px solid ${P.white}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: -6, flexShrink: 0 }}>
                              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 9, color: P.ink }}>{e.initials}</span>
                            </div>
                          ) : null;
                        })}
                      </div>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkSoft, marginLeft: 10 }}>
                        {assignees.length === 1 ? EMPLOYEES[assignees[0]]?.name.split(' ')[0] : `${assignees.length} people`}
                      </span>
                    </div>
                  ) : (
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkFaint, marginRight: 6 }}>Not assigned</span>
                  )}
                  <Icon name="chevron-right" size={16} color={P.inkFaint} strokeWidth={1.75} style={{ flexShrink: 0 }} />
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <div style={SL}>Administrators</div>
          <div style={card}>
            {admins.map((admin, idx) => (
              <div key={admin.id}
                onClick={admin.access !== 'owner' ? () => setAdminModal(admin.id) : undefined}
                style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', borderBottom: idx < admins.length - 1 ? `1px solid ${P.border}` : 'none', cursor: admin.access !== 'owner' ? 'pointer' : 'default' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: admin.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, color: P.ink }}>{admin.initials}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 14, color: P.ink }}>{admin.name}</div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkSoft }}>{admin.email}</div>
                </div>
                {admin.access === 'owner'
                  ? <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12, color: P.inkSoft, background: P.bg, padding: '3px 10px', borderRadius: 20, border: `1px solid ${P.border}` }}>Owner</span>
                  : <>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkSoft, marginRight: 6 }}>{ADMIN_ACCESS.find(a => a.key === admin.access)?.label}</span>
                      <Icon name="chevron-right" size={16} color={P.inkFaint} strokeWidth={1.75} style={{ flexShrink: 0 }} />
                    </>
                }
              </div>
            ))}
          </div>
          <button style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, padding: '9px 14px', borderRadius: 8, border: `1px solid ${P.border}`, background: P.white, cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: P.ink }}>
            <Icon name="plus" size={14} color={P.ink} strokeWidth={2.5} /> Invite admin
          </button>
        </div>

      </div>
    </div>
    </>
  );
}

const TIMEOFF_APPROVAL_OPTS = [
  { value: 'manager', label: 'Direct manager',  hint: "Employee's line manager receives the request" },
  { value: 'hr',      label: 'HR manager',       hint: 'Person assigned in Team & access' },
  { value: 'auto',    label: 'Auto-approve',     hint: 'Requests under 3 days are approved automatically' },
];
const ENTITLEMENT_OPTS = [
  { value: 'legal',   label: 'Legal minimum',    hint: 'Belgian statutory: 20 days for full-time, prorated for part-time' },
  { value: 'company', label: 'Company policy',   hint: 'Set a custom entitlement above the legal minimum' },
];
const CARRYOVER_OPTS = [
  { value: 'forfeit',   label: 'No carry-over',          hint: 'Unused days are forfeited at year end' },
  { value: 'cap',       label: 'Limited carry-over',       hint: 'Set a maximum number of days that roll over to January' },
  { value: 'unlimited', label: 'Carry over all unused',   hint: 'All remaining days roll over' },
  { value: 'payout',    label: 'Pay out unused days',     hint: 'Remaining balance is included in the last payroll of the year' },
];
const STATUTORY_MAX_TYPES = new Set(['Sick leave', 'Funeral leave', 'Paternity leave', 'Maternity leave', 'Special leave']);
const DEFAULT_LEAVE_CONFIGS = Object.fromEntries(
  Object.keys(LEAVE_COLORS).map(name => [name, {
    docRequired: ['Sick leave', 'Funeral leave', 'Paternity leave', 'Maternity leave', 'Special leave'].includes(name),
    maxDays: name === 'Time off' ? 20 : null,
  }])
);

function LeaveTypeModal({ name, color, config, onSave, onClose, showMaxDays = true }) {
  const { visible, close } = useModalTransition(onClose);
  const [cfg, setCfg] = useState({ ...config });
  const save = () => { onSave(cfg); close(); };
  const toggle = (field) => setCfg(prev => ({ ...prev, [field]: !prev[field] }));

  const ToggleRow = ({ label, hint, field, last }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 0', borderBottom: last ? 'none' : `1px solid ${P.border}` }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 14, color: P.ink }}>{label}</div>
        {hint && <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkSoft, marginTop: 2 }}>{hint}</div>}
      </div>
      <div onClick={() => toggle(field)} style={{ width: 38, height: 22, borderRadius: 11, background: cfg[field] ? P.action : P.border, cursor: 'pointer', position: 'relative', transition: `background 180ms ${EASE_OUT}`, flexShrink: 0 }}>
        <div style={{ position: 'absolute', top: 3, left: cfg[field] ? 19 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: `left 180ms ${EASE_OUT}`, boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
      </div>
    </div>
  );

  return (
    <div onClick={close} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(15,13,40,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', ...modalBackdropStyle(visible) }}>
      <div onClick={e => e.stopPropagation()} style={{ background: P.white, borderRadius: 14, width: 440, boxShadow: '0 8px 40px rgba(15,13,40,0.2)', display: 'flex', flexDirection: 'column', ...modalPanelStyle(visible) }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: `1px solid ${P.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, border: `1.5px solid ${LEAVE_BORDER_COLORS[name] || P.border}`, flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: P.ink }}>{name}</span>
          </div>
          <button onClick={close} style={{ border: 'none', cursor: 'pointer', width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(60,60,67,0.1)' }}>
            <Icon name="X" size={14} color={P.ink} strokeWidth={2.5} />
          </button>
        </div>
        <div style={{ padding: '0 22px' }}>
          <ToggleRow label="Document required" hint="Employee must upload proof when submitting this request" field="docRequired" last={!showMaxDays} />
          {showMaxDays && (
          <div style={{ padding: '14px 0' }}>
            <label style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: P.inkSoft, marginBottom: 6 }}>Max days per year</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: `1px solid ${P.border}`, borderRadius: 7, padding: '8px 10px' }}>
              <input type="number" min="0" value={cfg.maxDays ?? ''} onChange={e => setCfg(prev => ({ ...prev, maxDays: e.target.value === '' ? null : parseFloat(e.target.value) }))}
                placeholder="No limit"
                style={{ flex: 1, border: 'none', outline: 'none', fontFamily: 'var(--font-body)', fontSize: 14, color: P.ink, background: 'transparent' }} />
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkSoft }}>days</span>
            </div>
            <p style={{ margin: '4px 0 0', fontFamily: 'var(--font-body)', fontSize: 12, color: P.inkSoft }}>Leave blank for no limit.</p>
          </div>
          )}
        </div>
        <div style={{ padding: '14px 22px', borderTop: `1px solid ${P.border}`, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={close} style={{ padding: '8px 18px', borderRadius: 8, border: `1px solid ${P.border}`, background: 'transparent', color: P.ink, cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13 }}>Cancel</button>
          <button onClick={save} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: P.action, color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13 }}>Save</button>
        </div>
      </div>
    </div>
  );
}

function TimeOffSettings() {
  const [leaveConfigs, setLeaveConfigs] = useState(DEFAULT_LEAVE_CONFIGS);
  const [entitlement, setEntitlement] = useState('legal');
  const [companyDays, setCompanyDays] = useState(25);
  const [carryover, setCarryover] = useState('cap');
  const [carryoverCap, setCarryoverCap] = useState(5);
  const [approval, setApproval] = useState('manager');
  const [leaveModal, setLeaveModal] = useState(null);
  const [settingModal, setSettingModal] = useState(null);

  const SL = { fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 11, color: P.inkSoft, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 };
  const card = { border: `1px solid ${P.border}`, borderRadius: 16, overflow: 'clip', background: P.white };

  const settingRow = (onClick, icon, label, value, last) => (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', borderBottom: last ? 'none' : `1px solid ${P.border}`, cursor: 'pointer' }}>
      <Icon name={icon} size={18} color={P.inkFaint} strokeWidth={1.75} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1, fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 14, color: P.ink }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkSoft, marginRight: 6 }}>{value}</span>
      <Icon name="chevron-right" size={16} color={P.inkFaint} strokeWidth={1.75} style={{ flexShrink: 0 }} />
    </div>
  );

  return (
    <>
    {leaveModal && (
      <LeaveTypeModal
        name={leaveModal}
        color={LEAVE_COLORS[leaveModal]}
        config={leaveConfigs[leaveModal]}
        onSave={cfg => setLeaveConfigs(prev => ({ ...prev, [leaveModal]: cfg }))}
        onClose={() => setLeaveModal(null)}
        showMaxDays={!STATUTORY_MAX_TYPES.has(leaveModal)}
      />
    )}
    {settingModal === 'entitlement' && <PickModal title="Entitlement" options={ENTITLEMENT_OPTS} value={entitlement} onSave={(val, extra) => { setEntitlement(val); if (extra !== undefined) setCompanyDays(extra); }} onClose={() => setSettingModal(null)} extraField={{ forValue: 'company', label: 'Days', defaultValue: companyDays, suffix: 'days', min: 20 }} />}
    {settingModal === 'carryover' && <PickModal title="Unused days" options={CARRYOVER_OPTS} value={carryover} onSave={(val, extra) => { setCarryover(val); if (extra !== undefined) setCarryoverCap(extra); }} onClose={() => setSettingModal(null)} extraField={{ forValue: 'cap', label: 'Max', defaultValue: carryoverCap, suffix: 'days', min: 1 }} />}
    {settingModal === 'approval' && <PickModal title="Who approves?" options={TIMEOFF_APPROVAL_OPTS} value={approval} onSave={setApproval} onClose={() => setSettingModal(null)} />}

    <div style={{ flex: 1, overflow: 'auto', animation: `screenEnter 180ms ${EASE_OUT}` }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 32px', display: 'flex', flexDirection: 'column', gap: 32 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: P.ink, margin: 0, letterSpacing: '-0.02em' }}>Time off</h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkSoft, margin: '4px 0 0' }}>Manage leave types, entitlement and approval for your company</p>
        </div>

        <div>
          <div style={SL}>Leave types</div>
          <div style={card}>
            {Object.keys(LEAVE_COLORS).map((name, idx, arr) => {
              const cfg = leaveConfigs[name];
              const summary = [cfg.docRequired && 'Doc required', cfg.maxDays != null && `${cfg.maxDays}d max`].filter(Boolean).join(' · ') || 'No limits';
              return (
                <div key={name} onClick={() => setLeaveModal(name)}
                  style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', borderBottom: idx < arr.length - 1 ? `1px solid ${P.border}` : 'none', cursor: 'pointer' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: LEAVE_COLORS[name], border: `1.5px solid ${LEAVE_BORDER_COLORS[name] || P.border}`, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 14, color: P.ink }}>{name}</span>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkSoft, marginRight: 6 }}>{summary}</span>
                  <Icon name="chevron-right" size={16} color={P.inkFaint} strokeWidth={1.75} style={{ flexShrink: 0 }} />
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <div style={SL}>Accrual & carry-over</div>
          <div style={card}>
            {settingRow(() => setSettingModal('entitlement'), 'calendar-days', 'Entitlement', entitlement === 'company' ? `${companyDays}d / year` : 'Legal minimum', false)}
            {settingRow(() => setSettingModal('carryover'), 'arrow-right', 'Unused days', carryover === 'cap' ? `Up to ${carryoverCap} days` : (CARRYOVER_OPTS.find(o => o.value === carryover) || {}).label, true)}
          </div>
        </div>

        <div>
          <div style={SL}>Approval</div>
          <div style={card}>
            {settingRow(() => setSettingModal('approval'), 'check-circle', 'Who approves?', (TIMEOFF_APPROVAL_OPTS.find(o => o.value === approval) || {}).label, true)}
          </div>
        </div>

      </div>
    </div>
    </>
  );
}

// ── Choices screen ─────────────────────────────────────────────────────────
function ChoiceRow({ choice, onApprove, onDecline, onDetail, showStatus }) {
  const emp = EMPLOYEES[choice.empId] || { name: choice.empId, initials: '?', color: '#e5e7eb' };
  const [hover, setHover] = useState(false);
  const isPending = choice.status === 'pending';
  const gridCols = showStatus
    ? '1.8fr 2fr 1fr 1fr 1fr 0.9fr 80px'
    : '1.8fr 2fr 1fr 1fr 1fr 80px';
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      onClick={() => onDetail && onDetail(choice)}
      style={{
        display: 'grid', gridTemplateColumns: gridCols,
        alignItems: 'center', gap: 12, padding: '0 20px', minHeight: 52,
        borderBottom: `1px solid ${P.border}`,
        background: hover ? P.bg : P.white,
        transition: 'background 0.1s',
        cursor: 'pointer',
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
        <Avatar employeeId={choice.empId} size={24} style={{ border: '2px solid #fff', boxSizing: 'content-box' }} />
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500, color: P.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.name}</span>
      </div>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: P.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{choice.name}</span>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: P.ink, whiteSpace: 'nowrap' }}>{choice.price}</span>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: P.inkSoft }}>{choice.sDate}</span>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: P.inkSoft }}>{choice.eDate}</span>
      {showStatus && <div style={{ display: 'flex' }}><StatusPill status={choice.status || 'approved'} /></div>}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
        {isPending && (<>
          <button title="Decline" onClick={e => { e.stopPropagation(); onDecline(choice.id); }}
            onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.borderColor = '#fca5a5'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.borderColor = '#fecaca'; }}
            style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="X" size={14} color="#dc2626" strokeWidth={2.5} />
          </button>
          <button title="Approve" onClick={e => { e.stopPropagation(); onApprove(choice.id); }}
            onMouseEnter={e => { e.currentTarget.style.background = '#dcfce7'; e.currentTarget.style.borderColor = '#86efac'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#f0fdf4'; e.currentTarget.style.borderColor = '#bbf7d0'; }}
            style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #bbf7d0', background: '#f0fdf4', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="Check" size={14} color="#16a34a" strokeWidth={2.5} />
          </button>
        </>)}
      </div>
    </div>
  );
}

function ChoicesScreen({ choices, onApprove, onDecline, onDetail }) {
  const [tab, setTab] = useState('pending');
  const [searchText, setSearchText] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const pendingCount = choices.filter(c => c.status === 'pending').length;
  const tabFiltered = tab === 'pending' ? choices.filter(c => c.status === 'pending')
    : tab === 'approved' ? choices.filter(c => c.status === 'approved')
    : tab === 'declined' ? choices.filter(c => c.status === 'declined')
    : choices;
  const filtered = tabFiltered.filter(c => {
    const emp = EMPLOYEES[c.empId];
    if (searchText.trim() && !emp?.name.toLowerCase().includes(searchText.trim().toLowerCase())) return false;
    if (deptFilter !== 'all' && emp?.department !== deptFilter) return false;
    return true;
  });
  const showStatus = tab === 'all';
  const gridCols = showStatus
    ? '1.8fr 2fr 1fr 1fr 1fr 0.9fr 80px'
    : '1.8fr 2fr 1fr 1fr 1fr 80px';
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, animation: `screenEnter 180ms ${EASE_OUT}` }}>
      <PageHeader
        title="Choices"
        subtitle="Review and approve employee benefit elections"
        tabs={
          <TabBar
            tabs={[
              { id: 'pending', label: `Pending${pendingCount > 0 ? ` (${pendingCount})` : ''}` },
              { id: 'approved', label: 'Approved' },
              { id: 'declined', label: 'Declined' },
              { id: 'all', label: 'All choices' },
            ]}
            activeTab={tab}
            onTabChange={v => { setTab(v); }}
          />
        }
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '24px 20px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, border: `1px solid ${P.border}`, borderRadius: 7, padding: '8px 12px', width: 240, background: P.white }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={P.inkFaint} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="Search employee" style={{ border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--font-body)', fontSize: 12, color: P.ink, width: '100%' }} />
        </div>
        <FilterDropdown label="All departments" active={deptFilter} opts={[['all', 'All departments'], ...DEPARTMENTS.map(d => [d, d])]} onSelect={setDeptFilter} minWidth={160} />
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
        <div style={{ background: P.white, borderRadius: 12, border: `1px solid ${P.border}`, overflow: 'clip' }}>
          <div style={{ display: 'grid', gridTemplateColumns: gridCols, alignItems: 'center', gap: 12, padding: '0 20px', height: 38, borderBottom: `1px solid ${P.border}`, background: P.bg, position: 'sticky', top: 0, zIndex: 5 }}>
            <TH>Employee</TH>
            <TH>Choice</TH>
            <TH>Price</TH>
            <TH>Start date</TH>
            <TH>End date</TH>
            {showStatus && <TH>Status</TH>}
            <div />
          </div>
          {filtered.length === 0 ? (
            <div style={{ padding: '60px 24px', textAlign: 'center' }}>
              <Icon name="ListChecks" size={32} color={P.border} />
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: P.inkFaint, marginTop: 12 }}>
                No {tab === 'pending' ? 'pending ' : tab === 'approved' ? 'approved ' : tab === 'declined' ? 'declined ' : ''}choices
              </div>
            </div>
          ) : filtered.map(c => <ChoiceRow key={c.id} choice={c} onApprove={onApprove} onDecline={onDecline} onDetail={onDetail} showStatus={showStatus} />)}
        </div>
      </div>
    </div>
  );
}

function StubScreen({ title, description }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', animation: `screenEnter 180ms ${EASE_OUT}` }}>
      <PageHeader title={title} subtitle={description} />
      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
        <div style={{ background: P.white, border: `1px solid ${P.border}`, borderRadius: 12, padding: 24, maxWidth: 480, color: P.inkFaint, fontFamily: 'var(--font-body)', fontSize: 13 }}>
          Coming soon
        </div>
      </div>
    </div>
  );
}

const SETTINGS_TITLES = {
  'settings-notifications': 'Notifications',
  'settings-account': 'Account settings',
  'settings-entities': 'Entities',
  'settings-budgets': 'Budgets',
  'settings-benefits': 'Benefits',
  'settings-packages': 'Packages',
  'settings-documents': 'Documents',
  'settings-timeoff': 'Time off',
  'settings-payroll': 'Payroll settings',
  'settings-expenses': 'Expenses',
  'settings-cardrules': 'Card rules',
  'settings-integrations': 'Integrations',
  'settings-team': 'Team & access',
};

// ── App switcher pill ──────────────────────────────────────────────────────
// ── Toast ──────────────────────────────────────────────────────────────────
function Toast({ toast, onDone }) {
  const [exiting, setExiting] = useState(false);

  const dismiss = () => {
    setExiting(true);
    setTimeout(onDone, 180);
  };

  useEffect(() => {
    const duration = toast.type === 'decline' ? 5000 : 2500;
    const t = setTimeout(dismiss, duration);
    return () => clearTimeout(t);
  }, [toast.message]);

  const isDecline = toast.type === 'decline';

  return (
    <div style={{
      position: 'fixed', bottom: 24, left: 'calc((100vw + 216px) / 2)',
      transform: exiting ? 'translateX(-50%) translateY(8px)' : 'translateX(-50%) translateY(0)',
      opacity: exiting ? 0 : 1,
      transition: exiting ? `opacity 180ms ${EASE_OUT}, transform 180ms ${EASE_OUT}` : 'none',
      background: P.action, color: '#fff',
      padding: toast.onUndo ? '8px 8px 8px 16px' : '10px 20px',
      borderRadius: 10,
      fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13,
      boxShadow: '0 4px 16px rgba(15,13,40,0.2)', zIndex: 300,
      display: 'flex', alignItems: 'center', gap: 8,
      animation: exiting ? 'none' : 'fadeUp 0.2s ease-out',
      whiteSpace: 'nowrap',
    }}>
      <Icon name={isDecline ? 'X' : 'Check'} size={15} color={isDecline ? '#f87171' : '#4ade80'} strokeWidth={2.5} />
      {toast.message}
      {toast.onUndo && (
        <button onClick={() => { toast.onUndo(); dismiss(); }} style={{
          marginLeft: 4, padding: '5px 12px', borderRadius: 7,
          border: '1px solid rgba(255,255,255,0.25)',
          background: 'transparent', color: '#fff', cursor: 'pointer',
          fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 11,
        }}>Undo</button>
      )}
    </div>
  );
}

function FollowUpBanner({ prompt, onLog, onDismiss }) {
  const emp = EMPLOYEES[prompt.empId];
  const firstName = emp?.name.split(' ')[0] || 'Employee';
  const d = new Date(prompt.iso + 'T00:00:00');
  const dateLabel = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const halfLabel = prompt.half === 'pm' ? 'PM' : 'AM';
  return (
    <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 300, pointerEvents: 'none' }}>
      <div style={{
        pointerEvents: 'auto',
        background: P.action, borderRadius: 10, padding: '8px 8px 8px 18px',
        display: 'flex', alignItems: 'center', gap: 10,
        boxShadow: '0 6px 24px rgba(15,13,40,0.3)',
        animation: `pillFadeUp 150ms ${EASE_OUT}`,
        whiteSpace: 'nowrap',
      }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12, color: '#fff' }}>
          {firstName}'s {dateLabel} {halfLabel} is unlogged
        </span>
        <button onClick={onLog} style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '5px 12px 5px 8px', borderRadius: 7, border: 'none',
          background: '#22c55e', color: '#fff', cursor: 'pointer',
          fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 11,
        }}>
          <Icon name="CalendarPlus" size={12} color="#fff" strokeWidth={2} />
          Log {halfLabel}
        </button>
        <button onClick={onDismiss} style={{
          padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.25)',
          background: 'transparent', color: '#fff', cursor: 'pointer',
          fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 11,
        }}>Dismiss</button>
      </div>
    </div>
  );
}

// ── Root App ───────────────────────────────────────────────────────────────
function App() {
  const [screen, setScreen] = useState('dashboard');
  const [sidebarMode, setSidebarMode] = useState('app');
  const [requests, setRequests] = useState(() => mergeRequests(generatedRequests, readLS()));
  const [companyEvents, setCompanyEvents] = useState([]);
  const [toast, setToast] = useState(null);
  const [calDetail, setCalDetail] = useState(null);
  const [calendarJumpDate, setCalendarJumpDate] = useState(null);
  const [calendarDeptFilter, setCalendarDeptFilter] = useState(null);
  const handleNav = (id) => {
    if (id === 'team-absences') setCalendarJumpDate(null);
    setScreen(id);
  };
  const [choices, setChoices] = useState(CHOICES_SEED);
  const [choiceDetail, setChoiceDetail] = useState(null);
  const approveChoice = (id) => {
    setChoices(prev => prev.map(c => c.id === id ? { ...c, status: 'approved' } : c));
    const ch = choices.find(c => c.id === id);
    if (ch) setToast({ message: `${(EMPLOYEES[ch.empId] || {}).name?.split(' ')[0]}'s choice approved`, type: 'approve' });
  };
  const declineChoice = (id, reason) => {
    setChoices(prev => prev.map(c => c.id === id ? { ...c, status: 'declined', declineReason: reason } : c));
    const ch = choices.find(c => c.id === id);
    if (ch) setToast({ message: `${(EMPLOYEES[ch.empId] || {}).name?.split(' ')[0]}'s choice declined`, type: 'decline' });
  };

  const [expenses, setExpenses] = useState(EXPENSES_SEED);
  const [expenseCategories, setExpenseCategories] = useState(EXPENSE_CATEGORIES_SEED);
  const [expDetail, setExpDetail] = useState(null);

  const approveExpense = (id) => {
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, status: 'approved' } : e));
    const exp = expenses.find(e => e.id === id);
    if (exp) setToast({ message: `${(EMPLOYEES[exp.employee] || { name: exp.employee }).name.split(' ')[0]}'s expense approved`, type: 'approve' });
  };

  const rejectExpense = (id, reason) => {
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, status: 'rejected', rejectReason: reason } : e));
    const exp = expenses.find(e => e.id === id);
    if (exp) setToast({ message: `${(EMPLOYEES[exp.employee] || { name: exp.employee }).name.split(' ')[0]}'s expense rejected`, type: 'decline' });
  };
  const addExpense = (exp) => {
    const id = `exp-${Date.now()}`;
    setExpenses(prev => [{ id, ...exp, status: 'pending' }, ...prev]);
    const name = (EMPLOYEES[exp.employee] || { name: exp.employee }).name.split(' ')[0];
    setToast({ message: `Expense added for ${name}`, type: 'approve' });
  };

  const [pendingAction, setPendingAction] = useState(null); // { type: 'decline'|'cancel', id, empName }
  const [followUpPrompt, setFollowUpPrompt] = useState(null); // { empId, iso, half }
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== LS_KEY) return;
      const live = readLS();
      setRequests(prev => {
        const merged = mergeRequests(prev, live);
        const hasNew = merged.some(r => r.status === 'pending' && !prev.find(p => p.id === r.id));
        if (hasNew) setToast({ message: 'New request received' });
        return merged;
      });
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const approve = (id) => {
    setRequests(prev => {
      const next = prev.map(r => r.id === id ? { ...r, status: 'approved' } : r);
      writeLS(next);
      return next;
    });
    const req = requests.find(r => r.id === id);
    if (req) setToast({ message: `${(EMPLOYEES[req.employee] || { name: req.employee }).name.split(' ')[0]}'s request approved`, type: 'approve' });
  };

  const undoDecline = (id) => {
    setRequests(prev => {
      const next = prev.map(r => r.id === id ? { ...r, status: 'pending', declineReason: undefined } : r);
      writeLS(next);
      return next;
    });
  };

  const decline = (id, reason) => {
    setRequests(prev => {
      const next = prev.map(r => r.id === id ? { ...r, status: 'rejected', declineReason: reason } : r);
      writeLS(next);
      return next;
    });
    const req = requests.find(r => r.id === id);
    if (req) setToast({ message: `${(EMPLOYEES[req.employee] || { name: req.employee }).name.split(' ')[0]}'s request declined`, type: 'decline', onUndo: () => undoDecline(id) });
  };

  // Interceptors — show ReasonModal before acting
  const requestDecline = (id, reason) => {
    if (reason !== undefined) { decline(id, reason); return; }
    const req = requests.find(r => r.id === id);
    const empName = (EMPLOYEES[req?.employee] || { name: req?.employee || '' }).name;
    setPendingAction({ type: 'decline', id, empName });
  };
  const requestCancel = (id, reason) => {
    if (reason !== undefined) { cancelRequest(id, reason); return; }
    const req = requests.find(r => r.id === id);
    const empName = (EMPLOYEES[req?.employee] || { name: req?.employee || '' }).name;
    setPendingAction({ type: 'cancel', id, empName });
  };

  const saveRequest = (req) => {
    if (req._isCompanyEvent) {
      setCompanyEvents(prev => {
        const idx = prev.findIndex(e => e.id === req.id);
        return idx >= 0 ? prev.map(e => e.id === req.id ? req : e) : [req, ...prev];
      });
      setToast({ message: 'Company closure saved' });
      return;
    }
    const wasEdit = requests.some(r => r.id === req.id);
    setRequests(prev => {
      const idx = prev.findIndex(r => r.id === req.id);
      return idx >= 0 ? prev.map(r => r.id === req.id ? req : r) : [req, ...prev];
    });
    setToast({ message: wasEdit ? 'Absence updated' : 'Absence added' });
    if (wasEdit && req._halfDay) {
      const halfEntry = Object.entries(req._halfDay)
        .find(([iso, hv]) => req._selectedDates?.includes(iso) && (hv === 'am' || hv === 'pm'));
      if (halfEntry) {
        const [iso, hv] = halfEntry;
        setFollowUpPrompt({ empId: req.employee, iso, half: hv === 'am' ? 'pm' : 'am' });
        setFollowUpModalOpen(false);
      }
    }
  };

  const cancelRequest = (id, reason) => {
    setRequests(prev => prev.filter(r => r.id !== id));
    setToast({ message: 'Absence cancelled' });
  };

  const cancelCompanyEvent = (id) => {
    setCompanyEvents(prev => prev.filter(e => e.id !== id));
    setToast({ message: 'Company closure cancelled' });
  };

  const [employeeBalances, setEmployeeBalances] = useState(() => {
    const init = {};
    for (const [id, emp] of Object.entries(EMPLOYEES)) {
      init[id] = {
        'Time off': emp.entitlement,
        'Sick leave': null,
        'Special leave': null,
        'Paid absence': null,
        'Unpaid absence': null,
      };
    }
    return init;
  });

  const updateBalances = (empId, newBalances) => {
    setEmployeeBalances(prev => ({ ...prev, [empId]: newBalances }));
    setToast({ message: 'Balances updated' });
  };

  const [needsBalanceSetup, setNeedsBalanceSetup] = useState(new Set(['thomas-vandenberghe']));
  const [balanceConfirmedDates, setBalanceConfirmedDates] = useState({});

  const confirmBalancesFor = (empId) => {
    setNeedsBalanceSetup(prev => { const s = new Set(prev); s.delete(empId); return s; });
    setBalanceConfirmedDates(prev => ({ ...prev, [empId]: '15 Jul 2026' }));
  };

  const pendingRequestsCount = requests.filter(r => r.status === 'pending').length;
  const pendingExpensesCount = expenses.filter(e => e.status === 'pending').length;
  const pendingChoicesCount = choices.filter(c => c.status === 'pending').length;
  const pendingCount = { requests: pendingRequestsCount, expenses: pendingExpensesCount, choices: pendingChoicesCount };

  return (
    <div style={{ display: 'flex', height: '100vh', background: P.bg }}>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateX(-50%) translateY(8px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes pillFadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pillFadeDown {
          from { opacity: 1; transform: translateY(0); }
          to   { opacity: 0; transform: translateY(6px); }
        }
        @keyframes badgePopIn {
          from { opacity: 0; transform: scale(0.75); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes screenEnter {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fileRowIn {
          from { opacity: 0; transform: translateY(5px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes stepContentEnter {
          from { opacity: 0; transform: scale(0.97) translateY(4px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes stepDoneEnter {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        * { box-sizing: border-box; }
        ::placeholder { color: #9ca3af; opacity: 1; }
      `}</style>

      <Sidebar active={screen} onNav={handleNav} pendingCount={pendingCount} sidebarMode={sidebarMode} onSetSidebarMode={setSidebarMode} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        {screen === 'dashboard' && <DashboardScreen requests={requests} onNav={setScreen} onToast={setToast} />}
        {screen === 'team-absences' && <TeamAbsencesScreen requests={requests} pendingCount={pendingRequestsCount} onNav={setScreen} onShowDetail={setCalDetail} activeReqId={calDetail?.id} onSave={saveRequest} companyEvents={companyEvents} onCancelCompanyEvent={cancelCompanyEvent} initialDate={calendarJumpDate} initialDeptFilter={calendarDeptFilter} />}
        {screen === 'requests' && <RequestsScreen requests={requests} onApprove={approve} onDecline={requestDecline} onSave={saveRequest} onCancel={requestCancel} onNav={setScreen} onViewInCalendar={(req) => { const d = req._selectedDates?.[0] || req.startDate; if (d) { const iso = typeof d === 'string' && d.match(/^\d{4}-/) ? d : null; setCalendarJumpDate(iso ? new Date(iso) : parseDisplayDate(d)); } setCalDetail(req); setScreen('team-absences'); }} />}
        {screen === 'employees' && <EmployeesScreen requests={requests} onNav={setScreen} />}
        {screen.startsWith('employee-detail:') && <EmployeeDetailScreen employeeId={screen.split(':')[1]} requests={requests} onNav={setScreen} onSave={saveRequest} onCancel={cancelRequest} onApprove={approve} onDecline={requestDecline} onViewTeamCalendar={(dept) => { setCalendarDeptFilter(dept || null); setScreen('team-absences'); }} employeeBalance={employeeBalances[screen.split(':')[1]]} onUpdateBalance={(newBal) => updateBalances(screen.split(':')[1], newBal)} needsSetup={needsBalanceSetup.has(screen.split(':')[1])} confirmedDate={balanceConfirmedDates[screen.split(':')[1]]} onConfirmBalances={() => confirmBalancesFor(screen.split(':')[1])} onToast={setToast} />}
        {screen === 'expenses' && <ExpensesScreen expenses={expenses} categories={expenseCategories} onApprove={approveExpense} onDetail={(exp) => setExpDetail(exp)} onAdd={addExpense} />}
        {screen === 'choices' && <ChoicesScreen choices={choices} onApprove={approveChoice} onDecline={declineChoice} onDetail={setChoiceDetail} />}
        {screen === 'payroll-overview' && <StubScreen title="Payroll Overview" description="Monthly payroll run and submission" />}
        {screen === 'payroll-reports' && <StubScreen title="Payroll Reports" description="Reporting and exports" />}
        {screen === 'settings-expenses' && <ExpenseCategorySettings categories={expenseCategories} onSave={setExpenseCategories} />}
        {screen === 'settings-team' && <TeamAccessSettings />}
        {screen === 'settings-timeoff' && <TimeOffSettings />}
        {screen.startsWith('settings-') && screen !== 'settings-expenses' && screen !== 'settings-team' && screen !== 'settings-timeoff' && <StubScreen title={SETTINGS_TITLES[screen] || 'Settings'} description={`Configure ${(SETTINGS_TITLES[screen] || 'settings').toLowerCase()}`} />}
      </div>

      {calDetail && (
        <CalendarDrawer
          key={calDetail.id}
          req={calDetail}
          requests={requests}
          onClose={() => setCalDetail(null)}
          onApprove={(id) => { approve(id); setCalDetail(null); }}
          onDecline={(id, reason) => requestDecline(id, reason)}
          onCancel={(id, reason) => requestCancel(id, reason)}
          onSave={(req) => { saveRequest(req); setCalDetail(req); }}
        />
      )}

      {expDetail && (
        <ExpenseDrawer
          key={expDetail.id}
          expense={expDetail}
          onClose={() => setExpDetail(null)}
          onApprove={(id) => { approveExpense(id); setExpDetail(null); }}
          onReject={(id, reason) => { rejectExpense(id, reason); setExpDetail(null); }}
        />
      )}
      {choiceDetail && (
        <ChoiceDrawer
          key={choiceDetail.id}
          choice={choices.find(c => c.id === choiceDetail.id) || choiceDetail}
          onClose={() => setChoiceDetail(null)}
          onApprove={(id) => { approveChoice(id); setChoiceDetail(null); }}
          onDecline={(id, reason) => { declineChoice(id, reason); setChoiceDetail(null); }}
        />
      )}

      {pendingAction && (
        <ReasonModal
          title={pendingAction.type === 'decline' ? 'Decline request' : 'Cancel absence'}
          description={
            pendingAction.type === 'decline'
              ? `You're declining ${pendingAction.empName}'s time off request. The employee will be notified.`
              : `You're cancelling ${pendingAction.empName}'s absence. This cannot be undone.`
          }
          confirmLabel={pendingAction.type === 'decline' ? 'Decline request' : 'Cancel absence'}
          onClose={() => setPendingAction(null)}
          onConfirm={(reason) => {
            if (pendingAction.type === 'decline') {
              decline(pendingAction.id, reason);
              setCalDetail(prev => prev && prev.id === pendingAction.id ? { ...prev, status: 'rejected' } : prev);
            } else {
              cancelRequest(pendingAction.id, reason);
              setCalDetail(prev => prev && prev.id === pendingAction.id ? null : prev);
            }
            setPendingAction(null);
          }}
        />
      )}

      {toast && <Toast toast={toast} onDone={() => setToast(null)} />}
      {followUpPrompt && !followUpModalOpen && (
        <FollowUpBanner
          prompt={followUpPrompt}
          onDismiss={() => setFollowUpPrompt(null)}
          onLog={() => setFollowUpModalOpen(true)}
        />
      )}
      {followUpPrompt && followUpModalOpen && (
        <AddTimeOffModal
          existing={(() => {
            const d = new Date(followUpPrompt.iso + 'T00:00:00');
            const dateLabel = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
            return {
              employee: followUpPrompt.empId,
              _lockEmployee: true,
              startDate: dateLabel,
              endDate: dateLabel,
              _selectedDates: [followUpPrompt.iso],
              _halfDay: { [followUpPrompt.iso]: followUpPrompt.half },
            };
          })()}
          requests={requests}
          onClose={() => { setFollowUpModalOpen(false); setFollowUpPrompt(null); }}
          onSave={(req) => { saveRequest(req); setFollowUpModalOpen(false); setFollowUpPrompt(null); }}
        />
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
