// ── Payflip HR Admin — Desktop Prototype ──────────────────────────────────

const { useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect } = React;

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

// Uppercase section-label style shared by every settings screen (was
// redefined locally 9 times with a silent 8px/10px marginBottom split).
const SL = { fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 11, color: P.inkSoft, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 };

const StatusMeta = {
  pending:  { dot: '#f59e0b', label: 'Pending',  icon: 'Clock', color: '#92400e', bg: '#fde68a' },
  approved: { dot: '#22c55e', label: 'Approved', icon: 'Check', color: '#14532d', bg: '#bbf7d0' },
  rejected: { dot: '#ef4444', label: 'Declined', icon: 'X',     color: '#7f1d1d', bg: '#fecaca' },
  declined: { dot: '#ef4444', label: 'Declined', icon: 'X',     color: '#7f1d1d', bg: '#fecaca' },
  ended:    { dot: '#9ca3af', label: 'Ended',    icon: 'Minus', color: '#374151', bg: '#f3f4f6' },
};

const avatarUrl = (name, gender) => {
  const hash = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const img = gender === 'f' ? (hash % 35) + 1 : (hash % 35) + 36;
  return `https://i.pravatar.cc/64?img=${img}`;
};

const LEAVE_COLORS = {
  'Statutory annual leave':                    '#c5dcfd',
  'ADV / RTT':                   '#fef3c7',
  'Extra-legal leave':           '#ede9fe',
  'Sick leave':                  '#fbd0e4',
  'Paternity leave':                 '#d1fae5',
  'Maternity leave':             '#fce7f3',
  'Wedding':                     '#fde9c8',
  'Funeral leave':               '#d8d3e3',
  'Ceremony':                    '#fef3c7',
  'Civic duty':                  '#c5dcfd',
  'Moving':                      '#fde9c8',
};
const LEAVE_BORDER_COLORS = {
  'Statutory annual leave':                    '#7aafe8',
  'ADV / RTT':                   '#e5c87a',
  'Extra-legal leave':           '#a899e0',
  'Sick leave':                  '#e698b8',
  'Paternity leave':                 '#6ee7b7',
  'Maternity leave':             '#f9a8d4',
  'Wedding':                     '#e0b97a',
  'Funeral leave':               '#a99dba',
  'Ceremony':                    '#e5c87a',
  'Civic duty':                  '#7aafe8',
  'Moving':                      '#e0b97a',
};
// Reverse map: fill color hex → border color hex (for palette swatches)
const COLOR_TO_BORDER = Object.fromEntries(
  Object.entries(LEAVE_COLORS).map(([name, fill]) => [fill, LEAVE_BORDER_COLORS[name]])
);

const SPECIAL_LEAVE_METADATA = {
  'Paternity leave':                 { statutory: true, statutoryDays: 20, statutoryLabel: '20 days', statutoryNote: 'First 3 days paid by employer at full salary — days 4–20 reimbursed by INAMI at 82%. Must be taken within 4 months of birth.' },
  'Maternity leave':             { statutory: true, statutoryDays: null, statutoryLabel: '15 weeks', statutoryNote: 'Pre-natal: up to 6 weeks before due date (1 week mandatory). Post-natal: minimum 9 weeks mandatory. Paid by INAMI at 82% of capped salary.' },
  'Wedding':                    { statutory: true,  statutoryDays: 2,  statutoryLabel: '1–2 days', statutoryNote: "Own wedding: 2 days · Child's, sibling's or parent's wedding: 1 day" },
  'Funeral leave':              { statutory: true,  statutoryDays: 10, statutoryLabel: '1–10 days', statutoryNote: 'Spouse or child: 3 days immediate + 7 flexible (Royal Decree 2021). Parent or in-law: 3 days. Sibling, grandparent: 2 days. Other family: 1 day.' },
  'Ceremony':                   { statutory: true,  statutoryDays: 1,  statutoryLabel: '1 day',    statutoryNote: "Child's solemn communion or humanist coming-of-age ceremony" },
  'Civic duty':                 { statutory: true,  statutoryDays: null, statutoryLabel: 'Duration of duty', statutoryNote: 'For the duration of jury duty, court summons, or other civic obligation — no fixed maximum' },
  'Moving':                     { statutory: false, companyPolicy: true, statutoryDays: 1, statutoryLabel: '1 day', statutoryNote: 'Company benefit — not legally mandated, freely configurable' },
};

const LEAVE_SECTIONS = [
  { id: 'time-off',      label: 'Time off',      typeNames: ['Statutory annual leave', 'ADV / RTT', 'Extra-legal leave'] },
  { id: 'sick-leave',    label: 'Sick leave',     typeNames: ['Sick leave'] },
  { id: 'parental',      label: 'Parental leave', typeNames: ['Paternity leave', 'Maternity leave'] },
  { id: 'special-leave', label: 'Special leave',  typeNames: ['Wedding', 'Funeral leave', 'Ceremony', 'Civic duty', 'Moving'] },
];


const LEAVE_SECTION_ICONS = {
  'time-off':      'palmtree',
  'sick-leave':    'stethoscope',
  'parental':      'baby',
  'special-leave': null, // uses per-name icons below
};
const LEAVE_ICONS = {
  'Wedding':      'heart',
  'Funeral leave':'flower-2',
  'Ceremony':     'book-open',
  'Civic duty':   'landmark',
  'Moving':       'truck',
};

const ALL_LEAVE_TYPES = [
  'Statutory annual leave', 'ADV / RTT', 'Extra-legal leave',
  'Sick leave', 'Paternity leave', 'Maternity leave', 'Special leave',
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
  'Sick leave':       { label: 'Medical certificate', note: 'Required for absences of 2 or more consecutive days' },
  'Special leave':    { label: 'Supporting document', note: 'Marriage/birth certificate or official event proof' },
  'Funeral leave':    { label: 'Death certificate', note: 'Required to process bereavement leave' },
  'Paternity leave':                { label: 'Birth certificate', note: 'Required to record birth leave entitlement' },
  'Maternity leave':  { label: 'Medical certificate', note: 'Required to activate maternity leave entitlement' },
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

// ── Settings list — shared card + row for every settings screen ─────────────
// One canonical row shape (icon box, label, subtitle/value, chevron) so
// settings screens don't each hand-roll their own version with slightly
// different padding, icon size, or hover behavior. Reach for these before
// writing a new row — see CLAUDE.md "Shared components" for the full rule.
function SettingsCard({ children }) {
  return <div style={{ border: `1px solid ${P.border}`, borderRadius: 16, overflow: 'clip', background: P.white }}>{children}</div>;
}

function SettingsRow({ onClick, icon, iconBadgeColor, dimmed, leading, label, labelColor, subtitle, value, valueColor, trailing, last }) {
  const [hovered, setHovered] = useState(false);
  const hasLeading = leading || icon;
  return (
    <div onClick={onClick}
      onMouseEnter={() => onClick && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ display: 'flex', alignItems: 'center', gap: hasLeading ? 16 : 0, padding: 16, borderBottom: last ? 'none' : `1px solid ${P.border}`, cursor: onClick ? 'pointer' : 'default', background: hovered ? '#fafafa' : 'transparent', transition: PREFERS_REDUCED_MOTION ? 'none' : `background 150ms ${EASE_OUT}` }}>
      {leading}
      {!leading && icon && (
        <div style={{ position: 'relative', width: 36, height: 36, flexShrink: 0, opacity: dimmed ? 0.4 : 1 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: P.bg, border: `1px solid ${P.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={icon} size={17} color="#3d4047" strokeWidth={1.5} />
          </div>
          {iconBadgeColor && <div style={{ position: 'absolute', top: -3, right: -3, width: 9, height: 9, borderRadius: '50%', background: iconBadgeColor, boxShadow: '0 0 0 1.5px #fff' }} />}
        </div>
      )}
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 14, color: labelColor || (dimmed ? P.inkSoft : P.ink) }}>{label}</span>
        {subtitle && <span style={{ display: 'block', fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkSoft, marginTop: 2 }}>{subtitle}</span>}
      </span>
      {value != null && <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: valueColor || P.inkSoft, marginRight: 6, whiteSpace: 'nowrap' }}>{value}</span>}
      {trailing !== undefined ? trailing : <Icon name="chevron-right" size={16} color="#3d4047" strokeWidth={1.75} style={{ flexShrink: 0 }} />}
    </div>
  );
}

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

// ── Icon button — the circular icon-only button used for modal/drawer close,
// back navigation, and similar chrome actions. One size/opacity spec so
// close buttons stop drifting between 28px and 30px screen to screen.
function IconButton({ icon, onClick, size = 30, iconSize = 14, color = P.ink, blur, danger, style }) {
  const [hovered, setHovered] = useState(false);
  const isDangerHover = danger && hovered;
  return (
    <button onClick={onClick}
      onMouseEnter={() => danger && setHovered(true)}
      onMouseLeave={() => danger && setHovered(false)}
      style={{
        border: 'none', cursor: 'pointer', width: size, height: size, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: isDangerHover ? '#fee2e2' : 'rgba(60,60,67,0.1)',
        transition: danger ? 'background 120ms' : undefined,
        ...(blur ? { backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' } : {}),
        ...style,
      }}>
      <Icon name={icon} size={iconSize} color={isDangerHover ? '#dc2626' : color} strokeWidth={2.5} />
    </button>
  );
}

// ── Button — the four sanctioned button treatments. Reach for this instead of
// a raw <button style={{...}}> — see CLAUDE.md "Shared components".
const BUTTON_VARIANTS = {
  primary:   { background: P.action, color: '#fff', border: 'none' },
  secondary: { background: 'transparent', color: P.ink, border: `1px solid ${P.border}` },
  danger:    { background: 'transparent', color: '#dc2626', border: 'none' },
  text:      { background: 'transparent', color: P.ink, border: 'none' },
};
function Button({ variant = 'secondary', onClick, children, icon, iconSize = 14, disabled, type = 'button', style }) {
  const v = BUTTON_VARIANTS[variant] || BUTTON_VARIANTS.secondary;
  const flush = variant === 'text' || variant === 'danger';
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{
      display: 'inline-flex', alignItems: 'center', gap: 7,
      padding: flush ? 0 : '9px 18px',
      borderRadius: 8,
      border: v.border, background: v.background, color: v.color,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13,
      ...style,
    }}>
      {icon && <Icon name={icon} size={iconSize} color={v.color} strokeWidth={2.5} />}
      {children}
    </button>
  );
}

// ── Modal shell — the centered-modal wrapper shared by every small dialog
// (pick a value, confirm a delete, edit a category, ...). Owns the backdrop,
// panel, and optional title/close header; body/footer are supplied as
// children/footer, either a plain node or a function receiving `close` (for
// buttons that need to save-then-close). See CLAUDE.md "Shared components".
function ModalShell({ onClose, title, width = 420, maxHeight, zIndex = 300, footer, children }) {
  const { visible, close } = useModalTransition(onClose);
  return (
    <div onClick={close} style={{ position: 'fixed', inset: 0, zIndex, background: 'rgba(15,13,40,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', ...modalBackdropStyle(visible) }}>
      <div onClick={e => e.stopPropagation()} style={{ background: P.white, borderRadius: 14, width, maxHeight, boxShadow: '0 8px 40px rgba(15,13,40,0.2)', display: 'flex', flexDirection: 'column', ...modalPanelStyle(visible) }}>
        {title && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: `1px solid ${P.border}` }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: P.ink }}>{title}</span>
            <IconButton icon="X" onClick={close} blur />
          </div>
        )}
        {typeof children === 'function' ? children(close) : children}
        {footer && (typeof footer === 'function' ? footer(close) : footer)}
      </div>
    </div>
  );
}

// ── Drawer shell — the right-side-drawer wrapper shared by every detail/edit
// drawer. Owns the backdrop, panel, and pinned header (title, optional back
// button for two-step flows, close button); body is supplied as children,
// either a plain node or a function receiving `close`. See CLAUDE.md.
function DrawerShell({ onClose, title, onBack, width = 480, children }) {
  const { visible, close, closing } = useModalTransition(onClose, SHEET_CLOSE_DUR);
  return (
    <div onClick={close} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(15,13,40,0.25)', ...modalBackdropStyle(visible) }}>
      <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', top: 16, bottom: 16, right: 16, width, background: P.white, borderRadius: 20, boxShadow: '0 24px 64px rgba(15,13,40,0.22), 0 0 0 1px rgba(15,13,40,0.06)', display: 'flex', flexDirection: 'column', overflow: 'hidden', ...sheetPanelStyle(visible, closing) }}>
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: `1px solid ${P.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {onBack && <IconButton icon="arrow-left" onClick={onBack} />}
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: P.ink }}>{title}</span>
          </div>
          <IconButton icon="X" onClick={close} blur />
        </div>
        {typeof children === 'function' ? children(close) : children}
      </div>
    </div>
  );
}

// ── Shared toggle switch ─────────────────────────────────────────────────────
function Switch({ checked, onChange, size = 'md', disabled = false }) {
  const dims = size === 'sm' ? { w: 28, h: 16, knob: 12, pad: 2 } : { w: 34, h: 20, knob: 16, pad: 2 };
  return (
    <div onClick={disabled ? undefined : onChange} style={{
      width: dims.w, height: dims.h, borderRadius: dims.h / 2, flexShrink: 0,
      cursor: disabled ? 'not-allowed' : 'pointer',
      background: checked ? P.action : P.borderStrong,
      opacity: disabled ? 0.45 : 1,
      position: 'relative', transition: `background 150ms ${EASE_OUT}, opacity 150ms ${EASE_OUT}`,
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

// ── Shared empty state ───────────────────────────────────────────────────────
function EmptyState({ icon, title, description, action }) {
  return (
    <div style={{ padding: '40px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: P.bg, border: `1px solid ${P.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
        <Icon name={icon} size={20} color={P.inkSoft} strokeWidth={1.5} />
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: P.ink, marginBottom: 4 }}>{title}</div>
      {description && <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkSoft, maxWidth: 280, lineHeight: 1.5, marginBottom: action ? 18 : 0 }}>{description}</div>}
      {action}
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

// ── Entity data ───────────────────────────────────────────────────────────
const ENTITIES = [
  { id: 'lumio-group',  name: 'Lumio Group',       jc: 'PC 200', payrollProvider: 'SD Worx', integrationId: 'SDWX-4821',  country: 'Belgium',     employeeCount: 15 },
  { id: 'lumio-france', name: 'Lumio France',      jc: 'CCN 66', payrollProvider: 'ADP',     integrationId: 'ADP-FR-1192', country: 'France',      employeeCount: 4,  emailDomain: 'lumio.fr' },
  { id: 'lumio-nl',     name: 'Lumio Netherlands', jc: null,     payrollProvider: 'Visma',   integrationId: null,          country: 'Netherlands', employeeCount: 4,  emailDomain: 'lumio.nl' },
];

// ── Employee data ──────────────────────────────────────────────────────────
const DEPARTMENTS = ['Design','Engineering','Marketing'];
const AVATAR_COLORS = ['#bfdbfe','#ddd6fe','#fde68a','#a7f3d0','#fecdd3','#fed7aa','#c7d2fe','#fca5a5','#d9f99d','#99f6e4'];

const EMPLOYEES = {
  // Admin-only (not an employee — contractor)
  'bruno-coen':        { name: 'Bruno Coen',          initials: 'BC', color: '#c7d2fe', email: 'bruno@payflip.be', isEmployee: false, adminAccess: 'full' },
  // Design → Lumio Group (BE)
  'bram-goossens':     { name: 'Bram Goossens',     initials: 'BG', color: '#bfdbfe', entitlement: 23, department: 'Design',       email: 'bram.goossens@lumiogroup.be',     entity: 'Lumio Group', entityId: 'lumio-group', budget: 3750,  role: 'Employee', status: 'Active', gender: 'm' },
  'emma-martens':      { name: 'Emma Martens',       initials: 'EM', color: '#ddd6fe', entitlement: 29, department: 'Design',       email: 'emma.martens@lumiogroup.be',      entity: 'Lumio Group', entityId: 'lumio-group', budget: 0,     role: 'Employee', status: 'Active', gender: 'f', photo: true },
  'mathias-de-smedt':  { name: 'Mathias De Smedt',  initials: 'MD', color: '#fde68a', entitlement: 23, department: 'Design',       email: 'mathias.de-smedt@lumiogroup.be', entity: 'Lumio Group', entityId: 'lumio-group', budget: 6250,  role: 'Employee', status: 'Active', gender: 'm' },
  'thomas-vandenberghe': { name: 'Thomas Vandenberghe', initials: 'TV', color: '#99f6e4', entitlement: 20, department: 'Design',    email: 'thomas.vandenberghe@lumiogroup.be', entity: 'Lumio Group', entityId: 'lumio-group', budget: 0, role: 'Employee', status: 'Active', gender: 'm' },
  'thomas-janssens':     { name: 'Thomas Janssens',    initials: 'TJ', color: '#d9f99d', entitlement: 23, department: 'Design',    email: 'thomas.janssens@lumiogroup.be', entity: 'Lumio Group', entityId: 'lumio-group', budget: 3000, role: 'Employee', status: 'Active', gender: 'm' },
  'charlotte-pieters':   { name: 'Charlotte Pieters',  initials: 'CP', color: '#fecdd3', entitlement: 20, department: 'Design',    email: 'charlotte.pieters@lumiogroup.be', entity: 'Lumio Group', entityId: 'lumio-group', budget: 2500, role: 'Employee', status: 'Active', gender: 'f', fte: 0.8, workSchedule: [1,2,3,4] },
  'lasse-willems':       { name: 'Lasse Willems',      initials: 'LW', color: '#c7d2fe', entitlement: 23, department: 'Design',    email: 'lasse.willems@lumiogroup.be',   entity: 'Lumio Group', entityId: 'lumio-group', budget: 4000, role: 'Employee', status: 'Active', gender: 'm' },
  'nathalie-cox':        { name: 'Nathalie Cox',        initials: 'NC', color: '#a7f3d0', entitlement: 20, department: 'Design',    email: 'nathalie.cox@lumiogroup.be',    entity: 'Lumio Group', entityId: 'lumio-group', budget: 3200, role: 'Employee', status: 'Active', gender: 'f' },
  'ruben-declercq':      { name: 'Ruben Declercq',     initials: 'RD', color: '#fed7aa', entitlement: 25, department: 'Design',    email: 'ruben.declercq@lumiogroup.be',  entity: 'Lumio Group', entityId: 'lumio-group', budget: 5500, role: 'Employee', status: 'Active', gender: 'm' },
  'ines-baert':          { name: 'Inès Baert',          initials: 'IB', color: '#ddd6fe', entitlement: 20, department: 'Design',    email: 'ines.baert@lumiogroup.be',      entity: 'Lumio Group', entityId: 'lumio-group', budget: 2800, role: 'Employee', status: 'Active', gender: 'f' },
  'joachim-nijs':        { name: 'Joachim Nijs',        initials: 'JN', color: '#fde68a', entitlement: 23, department: 'Design',    email: 'joachim.nijs@lumiogroup.be',    entity: 'Lumio Group', entityId: 'lumio-group', budget: 4800, role: 'Employee', status: 'Active', gender: 'm' },
  'sara-verbeke':        { name: 'Sara Verbeke',        initials: 'SV', color: '#bfdbfe', entitlement: 20, department: 'Design',    email: 'sara.verbeke@lumiogroup.be',    entity: 'Lumio Group', entityId: 'lumio-group', budget: 3100, role: 'Employee', status: 'Active', gender: 'f' },
  'wout-desmet':         { name: 'Wout Desmet',         initials: 'WD', color: '#99f6e4', entitlement: 22, department: 'Design',    email: 'wout.desmet@lumiogroup.be',     entity: 'Lumio Group', entityId: 'lumio-group', budget: 4200, role: 'Employee', status: 'Active', gender: 'm' },
  'amber-claes':         { name: 'Amber Claes',         initials: 'AC', color: '#fca5a5', entitlement: 20, department: 'Design',    email: 'amber.claes@lumiogroup.be',     entity: 'Lumio Group', entityId: 'lumio-group', budget: 2900, role: 'Employee', status: 'Active', gender: 'f' },
  'pieter-verheyen':     { name: 'Pieter Verheyen',     initials: 'PV', color: '#d9f99d', entitlement: 25, department: 'Design',    email: 'pieter.verheyen@lumiogroup.be', entity: 'Lumio Group', entityId: 'lumio-group', budget: 6000, role: 'Admin',  status: 'Active', gender: 'm' },
  // Engineering → Lumio France
  'david':             { name: 'David Laurent',      initials: 'DL', color: '#fecdd3', entitlement: 20, department: 'Engineering', email: 'david.laurent@lumio.fr',          entity: 'Lumio France', entityId: 'lumio-france', budget: 4500,  role: 'Employee', status: 'Active', gender: 'm', photo: true },
  'stijn-laurent':     { name: 'Stijn Laurent',      initials: 'SL', color: '#a7f3d0', entitlement: 29, department: 'Engineering', email: 'stijn.laurent@lumio.fr',          entity: 'Lumio France', entityId: 'lumio-france', budget: 1500,  role: 'Employee', status: 'Active', gender: 'm' },
  'jana-goossens':     { name: 'Jana Goossens',      initials: 'JG', color: '#c7d2fe', entitlement: 20, department: 'Engineering', email: 'jana.goossens@lumio.fr',          entity: 'Lumio France', entityId: 'lumio-france', budget: 2000,  role: 'Employee', status: 'Active', gender: 'f' },
  'laura-mertens':     { name: 'Laura Mertens',      initials: 'LM', color: '#fca5a5', entitlement: 20, department: 'Engineering', email: 'laura.mertens@lumio.fr',          entity: 'Lumio France', entityId: 'lumio-france', budget: 750,   role: 'Employee', status: 'Active', gender: 'f' },
  // Marketing → Lumio Netherlands
  'pieter-mertens':    { name: 'Pieter Mertens',     initials: 'PM', color: '#a7f3d0', entitlement: 29, department: 'Marketing',   email: 'pieter.mertens@lumio.nl',         entity: 'Lumio Netherlands', entityId: 'lumio-nl', budget: 8500,  role: 'Admin',  status: 'Active', gender: 'm' },
  'sarah-de-smedt':    { name: 'Sarah De Smedt',     initials: 'SD', color: '#fecdd3', entitlement: 23, department: 'Marketing',   email: 'sarah.de-smedt@lumio.nl',         entity: 'Lumio Netherlands', entityId: 'lumio-nl', budget: 2750,  role: 'Employee', status: 'Active', gender: 'f' },
  'julie-goossens':    { name: 'Julie Goossens',     initials: 'JG', color: '#fed7aa', entitlement: 20, department: 'Marketing',   email: 'julie.goossens@lumio.nl',         entity: 'Lumio Netherlands', entityId: 'lumio-nl', budget: 5000,  role: 'Admin',  status: 'Active', gender: 'f' },
  'noor-de-smedt':     { name: 'Noor De Smedt',      initials: 'ND', color: '#fde68a', entitlement: 20, department: 'Marketing',   email: 'noor.de-smedt@lumio.nl',          entity: 'Lumio Netherlands', entityId: 'lumio-nl', budget: 0,     role: 'Employee', status: 'Active', gender: 'f', fte: 0.8, workSchedule: [1,2,4,5] },
};
const CURRENT_USER = EMPLOYEES['bruno-coen'];

// ── Per-employee supplemental data ────────────────────────────────────────
const EMP_EXTRA = {
  'bram-goossens':       { payrollId: '000041', hireDate: '15/03/2023', lang: 'Dutch'   },
  'emma-martens':        { payrollId: '000040', hireDate: '12/05/2025', lang: 'English' },
  'mathias-de-smedt':    { payrollId: '000032', hireDate: '01/09/2022', lang: 'Dutch'   },
  'thomas-vandenberghe': { payrollId: '000028', hireDate: '04/02/2022', lang: 'Dutch'   },
  'thomas-janssens':     { payrollId: '000044', hireDate: '10/01/2023', lang: 'Dutch'   },
  'david':               { payrollId: '000015', hireDate: '07/11/2020', lang: 'French'  },
  'stijn-laurent':       { payrollId: '000019', hireDate: '14/04/2021', lang: 'Dutch'   },
  'jana-goossens':       { payrollId: '000033', hireDate: '02/11/2022', lang: 'Dutch'   },
  'laura-mertens':       { payrollId: '000038', hireDate: '07/03/2024', lang: 'Dutch'   },
  'pieter-mertens':      { payrollId: '000009', hireDate: '01/06/2019', lang: 'Dutch'   },
  'sarah-de-smedt':      { payrollId: '000025', hireDate: '16/08/2021', lang: 'French'  },
  'julie-goossens':      { payrollId: '000011', hireDate: '03/09/2019', lang: 'Dutch'   },
  'noor-de-smedt':       { payrollId: '000043', hireDate: '22/09/2025', lang: 'Dutch'   },
};
// ── Work regime helpers ───────────────────────────────────────────────────
const COMPANY_REGIME_DEFAULTS = { contractedHours: 40, emailDomain: 'lumiogroup.be' };
function calcAdvDays(companyRegime, emp) {
  const contracted = companyRegime.contractedHours;
  const fullTimeAdv = Math.max(0, ((contracted - 38) / 2) * 12);
  const fte = emp.fte ?? 1.0;
  return Math.round(fullTimeAdv * fte * 10) / 10;
}
function calcLegalLeave(emp) {
  return Math.round(20 * (emp.fte ?? 1.0));
}

function _eseed(id, s) { let h = 0; const k = id + s; for (let i = 0; i < k.length; i++) h = ((h * 31) + k.charCodeAt(i)) >>> 0; return h; }
function _eur(n) { const [i, d] = (n / 100).toFixed(2).split('.'); return i.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ',' + d + ' EUR'; }
function genSalary(id, regimeHours) {
  const h = _eseed(id, 'sal'), base = 3100 + (h % 2300), p1 = base - 50 - (h >> 4 & 127), p2 = p1 - 40 - (h >> 6 & 95);
  const regime = (regimeHours || 40) + ':00', hd = (EMP_EXTRA[id] || {}).hireDate || '01/01/2022';
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
  { name: 'L&D expenses (Payflip)', price: '158,60 EUR', cDate: '19/06/2026', sDate: '19/06/2026', eDate: '—', illustration: 'assets/benefit-learn.png' },
  { name: 'Tablet via Coolblue', price: '369,00 EUR', cDate: '13/05/2026', sDate: '13/05/2026', eDate: '13/05/2028', illustration: 'assets/benefit-tablet.png' },
  { name: 'Individual pension savings', price: '939,96 EUR', cDate: '02/03/2026', sDate: '05/03/2026', eDate: '01/01/2027', illustration: 'assets/benefit-pension.png' },
  { name: 'Alan', price: '1 467,60 EUR', cDate: '26/01/2026', sDate: '01/01/2026', eDate: '31/12/2026' },
  { name: 'L&D expenses (Payflip)', price: '21,78 EUR', cDate: '23/01/2026', sDate: '23/01/2026', eDate: '—', illustration: 'assets/benefit-learn.png' },
  { name: 'Mortgage', price: '844,90 EUR', cDate: '01/01/2026', sDate: '01/01/2026', eDate: '31/12/2026' },
  { name: 'Bike lease via Cowboy', price: '89,00 EUR', cDate: '01/04/2026', sDate: '01/04/2026', eDate: '01/04/2028', illustration: 'assets/benefit-bike.png' },
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
    { id: 'tablet-coolblue-approved', empId: 'charlotte-pieters', name: 'Tablet via Coolblue', price: '369,00 EUR', cDate: '13/05/2026', sDate: '13/05/2026', eDate: '13/05/2028', status: 'approved', illustration: 'assets/benefit-tablet.png', productName: 'Apple iPad (2025) 11 Pouces 128 Go Wifi Argent', productUrl: 'https://www.coolblue.be/nl/product/960489', productNumber: '960489', orderId: '97190251', orderDate: '13/05/2026', depreciation: 24, transactions: [{ label: 'Home office budget', amount: '233,73 EUR', date: '13/05/2026' }, { label: 'End of year premium', amount: '180,55 EUR', date: '13/05/2026' }] },
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
          <EmptyState icon="list" title="No choices recorded yet" />
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
function SalaryTab({ empId, emp, companyRegime, onEmployeeUpdate }) {
  const { history, components } = genSalary(empId, companyRegime?.contractedHours);
  const regime = companyRegime || COMPANY_REGIME_DEFAULTS;
  const [localFte, setLocalFte] = React.useState(emp?.fte ?? 1.0);
  const [localSchedule, setLocalSchedule] = React.useState(emp?.workSchedule ?? [1,2,3,4,5]);
  const DAY_LABELS = ['Mon','Tue','Wed','Thu','Fri'];
  const advDays = calcAdvDays(regime, { ...emp, fte: localFte });
  const legalLeave = calcLegalLeave({ ...emp, fte: localFte });
  const handleFteChange = (newFte) => {
    setLocalFte(newFte);
    const defaultSchedule = newFte >= 1.0 ? [1,2,3,4,5] : newFte >= 0.9 ? [1,2,3,4,5] : newFte >= 0.8 ? [1,2,3,4] : [1,2,3];
    setLocalSchedule(defaultSchedule);
    if (onEmployeeUpdate) onEmployeeUpdate(empId, { fte: newFte, workSchedule: defaultSchedule });
  };
  const toggleDay = (day) => {
    const next = localSchedule.includes(day) ? localSchedule.filter(d => d !== day) : [...localSchedule, day].sort();
    setLocalSchedule(next);
    if (onEmployeeUpdate) onEmployeeUpdate(empId, { fte: localFte, workSchedule: next });
  };
  const fieldStyle = { background: P.white, border: `1px solid ${P.border}`, borderRadius: 8, padding: '10px 14px', fontFamily: 'var(--font-body)', fontSize: 13, color: P.ink };
  const labelStyle = { display: 'block', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: P.ink, marginBottom: 6 };
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
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: P.ink, margin: '0 0 14px' }}>Contract</h3>
        <div style={{ background: P.white, border: `1px solid ${P.border}`, borderRadius: 12, padding: 20 }}>
        <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>FTE</label>
            <select value={localFte} onChange={e => handleFteChange(parseFloat(e.target.value))}
              style={{ ...fieldStyle, width: '100%', cursor: 'pointer', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b6b80' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: 32 }}>
              {[1.0, 0.9, 0.8, 0.6, 0.5].map(v => <option key={v} value={v}>{v === 1.0 ? '1.0 — Full-time' : `${v} — Part-time`}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Contracted hours</label>
            <div style={{ ...fieldStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: P.bg }}>
              <span>{regime.contractedHours}:00 / week</span>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: P.inkFaint, background: P.white, padding: '2px 6px', borderRadius: 4, border: `1px solid ${P.border}` }}>Company default</span>
            </div>
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Work schedule</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {DAY_LABELS.map((label, i) => {
              const day = i + 1;
              const active = localSchedule.includes(day);
              return (
                <button key={day} onClick={() => toggleDay(day)}
                  style={{ width: 48, height: 36, borderRadius: 8, border: `1.5px solid ${active ? P.action : P.border}`, background: active ? '#f3f0ff' : 'transparent', color: active ? P.action : P.inkSoft, fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12, cursor: 'pointer', transition: 'all 120ms ease' }}>
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>ADV entitlement</label>
            <div style={{ ...fieldStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: P.bg }}>
              <span>{advDays} days / year</span>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: '#059669', background: '#ecfdf5', padding: '2px 6px', borderRadius: 4 }}>Auto</span>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Legal leave</label>
            <div style={{ ...fieldStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: P.bg }}>
              <span>{legalLeave} days{localFte < 1.0 ? ` (${localFte} FTE)` : ''}</span>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: '#059669', background: '#ecfdf5', padding: '2px 6px', borderRadius: 4 }}>Auto</span>
            </div>
          </div>
        </div>
        </div>
      </div>
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
                  <span style={{ display: 'inline-flex', alignItems: 'center', background: row.active ? '#f0fdf4' : P.white, color: row.active ? '#16a34a' : P.inkSoft, border: `1px solid ${row.active ? '#bbf7d0' : P.border}`, borderRadius: 6, padding: '2px 6px', fontSize: 11, fontFamily: 'var(--font-display)', fontWeight: 500 }}>
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
function DetailsTab({ emp, empId, onNav, adminAccess, onAdminSave, companyRegime, onEmployeeUpdate }) {
  const [isEmployeeLocal, setIsEmployeeLocal] = React.useState(emp.isEmployee !== false);
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
      {(() => {
        const AREA_LABELS = { 'time-off': 'Time off', 'expenses': 'Expenses', 'payroll': 'Payroll' };
        const isEmployee = isEmployeeLocal;
        const explicitlyRevoked = adminAccess && adminAccess[empId] === 'revoked';
        const isAdmin = !explicitlyRevoked && ((adminAccess && empId in adminAccess && adminAccess[empId] !== 'revoked') || emp.role === 'Admin');
        const currentAccess = adminAccess ? (adminAccess[empId] ?? emp.adminAccess ?? null) : (emp.adminAccess ?? null);
        const accessLabel = currentAccess === 'full'
          ? 'Full admin'
          : Array.isArray(currentAccess) && currentAccess.length > 0
            ? currentAccess.map(a => AREA_LABELS[a] || a).join(' · ')
            : null;
        const cbBox = (checked) => (
          <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${checked ? P.action : P.border}`, background: checked ? P.action : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'border-color 120ms ease, background 120ms ease', marginTop: 2 }}>
            {checked && <Icon name="check" size={10} color="#fff" strokeWidth={3} />}
          </div>
        );
        return (
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: P.ink, margin: '0 0 4px' }}>Roles</h3>
            <div onClick={() => setIsEmployeeLocal(v => !v)}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 0', borderRadius: 8, cursor: 'pointer' }}>
              {cbBox(isEmployee)}
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: P.ink, fontWeight: 500, marginTop: 1 }}>Employee</div>
            </div>
            <div onClick={() => isAdmin ? onAdminSave(empId, 'revoke') : onAdminSave(empId, null)}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 0', borderRadius: 8, cursor: 'pointer' }}>
              {cbBox(isAdmin, true)}
              <div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: P.ink, fontWeight: 500 }}>Admin</div>
                {isAdmin && (
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkSoft }}>
                    {accessLabel ? (
                      <span>
                        <span style={{ color: P.inkSoft }}>{accessLabel}</span>
                        <span style={{ color: P.inkSoft }}> · </span>
                        <span onClick={e => { e.stopPropagation(); onNav('settings-team'); }} style={{ color: P.ink, textDecoration: 'underline', cursor: 'pointer' }}>Manage in Team & access</span>
                      </span>
                    ) : (
                      <span onClick={e => { e.stopPropagation(); onNav('settings-team'); }} style={{ color: P.ink, textDecoration: 'underline', cursor: 'pointer' }}>Assign access level</span>
                    )
                    }
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

const generatedRequests = [
  { id: 'gen-1', employee: 'david', type: 'Statutory annual leave', startDate: 'Mon 1 Jun', endDate: 'Thu 11 Jun', days: 9, status: 'approved', submittedAt: '12 May', note: 'Summer holiday', _selectedDates: ['2026-06-01','2026-06-02','2026-06-03','2026-06-04','2026-06-05','2026-06-08','2026-06-09','2026-06-10','2026-06-11'] },
  { id: 'gen-2', employee: 'emma-martens', type: 'Statutory annual leave', startDate: 'Mon 13 Jul', endDate: 'Fri 17 Jul', days: 5, status: 'pending', submittedAt: '20 Jun', note: '' },
  { id: 'gen-3', employee: 'mathias-de-smedt', type: 'Statutory annual leave', startDate: 'Wed 8 Jul', endDate: 'Wed 8 Jul', days: 1, status: 'approved', submittedAt: '10 Jun', note: '', _selectedDates: ['2026-07-08'] },
  { id: 'gen-4', employee: 'stijn-laurent', type: 'Special leave', startDate: 'Fri 3 Jul', endDate: 'Fri 3 Jul', days: 1, status: 'approved', submittedAt: '25 Jun', note: 'Wedding', _selectedDates: ['2026-07-03'] },
  { id: 'gen-5', employee: 'laura-mertens', type: 'Sick leave', startDate: 'Tue 7 Jul', endDate: 'Tue 7 Jul', days: 1, status: 'approved', submittedAt: '7 Jul', note: '', _selectedDates: ['2026-07-07'] },
  { id: 'gen-11', employee: 'laura-mertens', type: 'Sick leave', startDate: 'Tue 14 Jul', endDate: 'Tue 14 Jul', days: 1, status: 'approved', submittedAt: '14 Jul', note: '', _selectedDates: ['2026-07-14'] },
  { id: 'gen-6c', employee: 'bram-goossens', type: 'Special leave', startDate: 'Thu 19 Mar', endDate: 'Thu 19 Mar', days: 1, status: 'approved', submittedAt: '10 Mar', note: 'Wedding', document: 'wedding_certificate.pdf', _selectedDates: ['2026-03-19'] },
  { id: 'gen-6d', employee: 'bram-goossens', type: 'Sick leave', startDate: 'Mon 5 May', endDate: 'Tue 6 May', days: 2, status: 'approved', submittedAt: '5 May', document: 'medical_certificate.pdf', note: '', _selectedDates: ['2026-05-05','2026-05-06'] },
  { id: 'gen-6b', employee: 'bram-goossens', type: 'Statutory annual leave', startDate: 'Fri 19 Jun', endDate: 'Fri 19 Jun', days: 0.5, halfDay: 'PM', status: 'approved', submittedAt: '18 Jun', note: '', _selectedDates: ['2026-06-19'], _halfDay: { '2026-06-19': 'pm' } },
  { id: 'gen-6', employee: 'bram-goossens', type: 'ADV / RTT', startDate: 'Mon 22 Jun', endDate: 'Tue 23 Jun', days: 2, status: 'approved', submittedAt: '15 Jun', note: '', _selectedDates: ['2026-06-22','2026-06-23'] },
  { id: 'gen-7', employee: 'jana-goossens', type: 'Statutory annual leave', startDate: 'Thu 25 Jun', endDate: 'Fri 27 Jun', days: 3, status: 'approved', submittedAt: '10 Jun', note: 'Long weekend', _selectedDates: ['2026-06-25','2026-06-26','2026-06-27'] },
  { id: 'gen-8', employee: 'pieter-mertens', type: 'Extra-legal leave', startDate: 'Wed 1 Jul', endDate: 'Wed 1 Jul', days: 1, status: 'approved', submittedAt: '28 Jun', note: '', _selectedDates: ['2026-07-01'] },
  { id: 'gen-12', employee: 'pieter-mertens', type: 'Statutory annual leave', startDate: 'Mon 13 Jul', endDate: 'Wed 15 Jul', days: 3, status: 'approved', submittedAt: '1 Jul', note: '', _selectedDates: ['2026-07-13','2026-07-14','2026-07-15'] },
  { id: 'gen-13', employee: 'sarah-de-smedt', type: 'Statutory annual leave', startDate: 'Tue 14 Jul', endDate: 'Thu 16 Jul', days: 3, status: 'approved', submittedAt: '3 Jul', note: '', _selectedDates: ['2026-07-14','2026-07-15','2026-07-16'] },
  { id: 'gen-14', employee: 'jana-goossens', type: 'Statutory annual leave', startDate: 'Thu 16 Jul', endDate: 'Fri 17 Jul', days: 2, status: 'approved', submittedAt: '5 Jul', note: '', _selectedDates: ['2026-07-16','2026-07-17'] },
  { id: 'gen-15', employee: 'julie-goossens', type: 'Statutory annual leave', startDate: 'Wed 22 Jul', endDate: 'Fri 24 Jul', days: 3, status: 'approved', submittedAt: '9 Jul', note: '', _selectedDates: ['2026-07-22','2026-07-23','2026-07-24'] },
  { id: 'gen-9', employee: 'thomas-janssens', type: 'Statutory annual leave', startDate: 'Mon 20 Jul', endDate: 'Fri 24 Jul', days: 5, status: 'pending', submittedAt: '8 Jul', note: 'Family trip', _selectedDates: ['2026-07-20','2026-07-21','2026-07-22','2026-07-23','2026-07-24'] },
  { id: 'gen-10', employee: 'bram-goossens', type: 'Statutory annual leave', startDate: 'Thu 23 Jul', endDate: 'Fri 24 Jul', days: 2, status: 'pending', submittedAt: '10 Jul', note: '', _selectedDates: ['2026-07-23','2026-07-24'] },
  { id: 'gen-16', employee: 'mathias-de-smedt', type: 'Statutory annual leave', startDate: 'Mon 4 Aug', endDate: 'Wed 6 Aug', days: 3, status: 'pending', submittedAt: '14 Jul', note: '', _selectedDates: ['2026-08-04','2026-08-05','2026-08-06'] },
  // Pending: sick leave with medical certificate
  { id: 'req-sick-tv', employee: 'thomas-vandenberghe', type: 'Sick leave', startDate: 'Mon 28 Jul', endDate: 'Wed 30 Jul', days: 3, status: 'pending', submittedAt: '17 Jul', note: '', document: 'medical_certificate.pdf', _selectedDates: ['2026-07-28','2026-07-29','2026-07-30'] },
  // Pending: special leave wedding with many colleagues off
  { id: 'req-wedding-lm', employee: 'laura-mertens', type: 'Special leave', startDate: 'Thu 30 Jul', endDate: 'Fri 1 Aug', days: 2, status: 'pending', submittedAt: '17 Jul', note: "Sister's wedding", document: 'wedding_invitation.pdf', _selectedDates: ['2026-07-30','2026-07-31'] },
  // Approved: Design colleagues off same week as TV sick leave (create conflict)
  { id: 'gen-17', employee: 'emma-martens', type: 'Statutory annual leave', startDate: 'Mon 28 Jul', endDate: 'Wed 30 Jul', days: 3, status: 'approved', submittedAt: '12 Jul', note: '', _selectedDates: ['2026-07-28','2026-07-29','2026-07-30'] },
  // Approved: Engineering colleagues off same days as Laura's wedding (create overlap)
  { id: 'gen-18', employee: 'david', type: 'Statutory annual leave', startDate: 'Mon 28 Jul', endDate: 'Fri 1 Aug', days: 5, status: 'approved', submittedAt: '5 Jul', note: 'Summer break', _selectedDates: ['2026-07-27','2026-07-28','2026-07-29','2026-07-30','2026-07-31'] },
  { id: 'gen-19', employee: 'stijn-laurent', type: 'Statutory annual leave', startDate: 'Mon 27 Jul', endDate: 'Fri 1 Aug', days: 6, status: 'approved', submittedAt: '8 Jul', note: '', _selectedDates: ['2026-07-27','2026-07-28','2026-07-29','2026-07-30','2026-07-31'] },
  { id: 'gen-20', employee: 'jana-goossens', type: 'ADV / RTT', startDate: 'Thu 30 Jul', endDate: 'Fri 31 Jul', days: 2, status: 'approved', submittedAt: '11 Jul', note: '', _selectedDates: ['2026-07-30','2026-07-31'] },
];

const EXPENSE_BUDGET_TYPES = [
  { id: 'mobility', label: 'Mobility' },
  { id: 'work',     label: 'Work expense' },
  { id: 'learning', label: 'Learning & development' },
];

const EXPENSE_CATEGORIES_SEED = [
  { name: 'Private transport',      monthlyLimit: null, budgetType: 'mobility' },
  { name: 'Public transport',       monthlyLimit: null, budgetType: 'mobility' },
  { name: 'Shared mobility',        monthlyLimit: null, budgetType: 'mobility' },
  { name: 'Mobility subscription',  monthlyLimit: null, budgetType: 'mobility' },
  { name: 'Hotel',                  monthlyLimit: null, budgetType: 'work' },
  { name: 'Restaurant',             monthlyLimit: null, budgetType: 'work' },
  { name: 'Taxi / Uber',            monthlyLimit: null, budgetType: 'work' },
  { name: 'Parking',                monthlyLimit: null, budgetType: 'work' },
  { name: 'Other',                  monthlyLimit: null, budgetType: 'work' },
  { name: 'Conference fees',        monthlyLimit: null, budgetType: 'learning' },
  { name: 'Training materials',     monthlyLimit: null, budgetType: 'learning' },
  { name: 'Online courses',         monthlyLimit: null, budgetType: 'learning' },
];

const ALLOWANCE_TYPES = [
  {
    id: 'mileage',
    name: 'Mileage',
    icon: 'car',
    description: 'Reimburse employees for using their private car for business travel.',
    submissionType: 'mileage',
    rateLabel: 'Rate per kilometre',
    defaultRate: 0.4296,
    nsssCeiling: null,
    nsssNote: 'NSSS official rate for 2025: €0.4296/km — no receipt required.',
    unit: 'km',
  },
  {
    id: 'home-office',
    name: 'Home office',
    icon: 'home',
    description: 'Monthly flat-rate for employees who work from home on a structural basis.',
    submissionType: 'auto',
    rateLabel: 'Monthly amount',
    defaultRate: 151.70,
    nsssCeiling: 151.70,
    nsssNote: 'NSSS ceiling 2025: €151.70/month — added to payslip automatically.',
    unit: 'month',
  },
  {
    id: 'mobile-internet',
    name: 'Mobile & internet',
    icon: 'smartphone',
    description: 'Monthly flat-rate for use of a personal phone and home internet for work.',
    submissionType: 'auto',
    rateLabel: 'Monthly amount',
    defaultRate: 30,
    nsssCeiling: 30,
    nsssNote: 'NSSS ceiling 2025: €30/month — added to payslip automatically.',
    unit: 'month',
  },
  {
    id: 'representation',
    name: 'Representation',
    icon: 'briefcase',
    description: 'Monthly allowance for business entertainment, hospitality and client gifts.',
    submissionType: 'auto',
    rateLabel: 'Monthly amount',
    defaultRate: null,
    nsssCeiling: null,
    nsssNote: null,
    unit: 'month',
  },
];

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

function DotPill({ bg, color, children, filled, dot = true, border, size = 12, padding, whiteSpace }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: filled ? color : bg, color: filled ? '#fff' : color,
      border: border ? `1px solid ${border}` : 'none',
      borderRadius: 20, padding: padding || (size === 11 ? '1px 7px' : '2px 8px'), fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: size,
      whiteSpace, flexShrink: 0,
    }}>
      {dot && <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', flexShrink: 0 }} />}
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
        width: 28, height: 28, borderRadius: '50%', background: CURRENT_USER.color, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 10, color: P.ink,
      }}>{CURRENT_USER.initials}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 13, color: P.ink }}>{CURRENT_USER.name}</span>
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

function EntitySwitcher({ value, onChange, mode }) {
  const [open, setOpen] = useState(false);
  const btnRef = React.useRef(null);
  const popRef = React.useRef(null);
  const selected = value ? ENTITIES.find(e => e.id === value) : null;
  const isSettings = mode === 'settings';
  const defaultLabel = isSettings ? 'Company defaults' : 'All entities';
  const defaultSub = isSettings ? 'All entities inherit' : 'Show data across entities';
  const defaultIcon = isSettings ? 'building-2' : 'layers';

  React.useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (!popRef.current?.contains(e.target) && !btnRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const rect = btnRef.current?.getBoundingClientRect();

  return (
    <React.Fragment>
      <button ref={btnRef} onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '16px 20px', width: '100%', border: 'none',
        borderBottom: `1px solid ${P.border}`,
        background: 'transparent', cursor: 'pointer', textAlign: 'left',
      }}>
        <Icon name={defaultIcon} size={14} color={selected ? P.ink : P.inkSoft} strokeWidth={1.75} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12, color: selected ? P.ink : P.inkSoft, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selected ? selected.name : defaultLabel}
          </div>
        </div>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={P.ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && rect && ReactDOM.createPortal(
        <div ref={popRef} style={{
          position: 'fixed', top: rect.top, left: rect.right + 8, zIndex: 500,
          background: P.white, border: `1px solid ${P.border}`, borderRadius: 12,
          boxShadow: '0 8px 32px rgba(15,13,40,0.12)', minWidth: 230, overflow: 'hidden',
        }}>
          <div style={{ padding: '12px 14px 6px', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 11, color: P.inkFaint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Entities
          </div>
          <div style={{ padding: '0 8px 8px' }}>
            <button onClick={() => { onChange(null); setOpen(false); }} style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 8px', border: 'none', borderRadius: 8,
              background: !value ? P.bg : 'transparent', cursor: 'pointer', textAlign: 'left', position: 'relative',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: P.ink }}>{defaultLabel}</div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: P.inkSoft }}>{defaultSub}</div>
              </div>
              {!value && <Icon name="check" size={13} color="#C42BFC" strokeWidth={2.5} />}
            </button>
            {ENTITIES.map(ent => (
              <button key={ent.id} onClick={() => { onChange(ent.id); setOpen(false); }} style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 8px', border: 'none', borderRadius: 8,
                background: value === ent.id ? P.bg : 'transparent', cursor: 'pointer', textAlign: 'left',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: P.ink }}>{ent.name}</div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: P.inkSoft }}>{ent.employeeCount} employees</div>
                </div>
                {value === ent.id && <Icon name="check" size={13} color="#C42BFC" strokeWidth={2.5} />}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </React.Fragment>
  );
}

function AppModeSidebar({ active, onNav, pendingCount, onEnterSettings }) {
  const [timeoffOpen, setTimeoffOpen] = useState(active === 'requests' || active === 'team-absences');
  const [payrollOpen, setPayrollOpen] = useState(active === 'payroll-overview' || active === 'payroll-reports');

  return (
    <React.Fragment>

      <nav style={{ flex: 1, padding: '16px 0 10px', display: 'flex', flexDirection: 'column', gap: 3, overflow: 'auto' }}>
        <SidebarItem icon="house" label="Home" isActive={active === 'dashboard'} onClick={() => onNav('dashboard')} />
        <SidebarItem icon="users" label="People" isActive={active === 'employees' || active === 'employees:admin' || active?.startsWith('employee-detail')} onClick={() => onNav('employees')} />
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

        <div style={{ marginTop: 'auto', paddingTop: 10 }}>
          <SidebarItem icon="blocks" label="Components" isActive={active === 'components'} onClick={() => onNav('components')} />
          <SidebarItem icon="sparkles" label="Product changelog" isActive={active === 'changelog'} onClick={() => onNav('changelog')} />
        </div>
      </nav>
    </React.Fragment>
  );
}

const PERSONAL_IDS = ['settings-notifications', 'settings-account'];
const COMPANY_IDS  = ['settings-entities','settings-budgets','settings-benefits','settings-packages','settings-documents','settings-timeoff','settings-payroll','settings-allowances','settings-expenses','settings-cardrules','settings-integrations','settings-team'];

const ROUTE_MAP = [
  { screen: 'dashboard',              path: '/hr-admin' },
  { screen: 'requests',               path: '/hr-admin/time-off' },
  { screen: 'team-absences',          path: '/hr-admin/time-off/calendar' },
  { screen: 'employees',              path: '/hr-admin/people' },
  { screen: 'expenses',               path: '/hr-admin/expenses' },
  { screen: 'choices',                path: '/hr-admin/choices' },
  { screen: 'payroll-overview',       path: '/hr-admin/payroll' },
  { screen: 'payroll-reports',        path: '/hr-admin/payroll/reports' },
  { screen: 'settings-notifications', path: '/hr-admin/settings/notifications' },
  { screen: 'settings-account',       path: '/hr-admin/settings/account' },
  { screen: 'settings-entities',      path: '/hr-admin/settings/entities' },
  { screen: 'settings-budgets',       path: '/hr-admin/settings/budgets' },
  { screen: 'settings-benefits',      path: '/hr-admin/settings/benefits' },
  { screen: 'settings-packages',      path: '/hr-admin/settings/packages' },
  { screen: 'settings-documents',     path: '/hr-admin/settings/documents' },
  { screen: 'settings-timeoff',       path: '/hr-admin/settings/time-off' },
  { screen: 'settings-payroll',       path: '/hr-admin/settings/payroll' },
  { screen: 'settings-allowances',    path: '/hr-admin/settings/allowances' },
  { screen: 'settings-expenses',      path: '/hr-admin/settings/expenses' },
  { screen: 'settings-cardrules',     path: '/hr-admin/settings/card-rules' },
  { screen: 'settings-integrations',  path: '/hr-admin/settings/integrations' },
  { screen: 'settings-team',          path: '/hr-admin/settings/team' },
  { screen: 'settings-billing',       path: '/hr-admin/settings/billing' },
  { screen: 'changelog',              path: '/hr-admin/changelog' },
  { screen: 'components',             path: '/hr-admin/components' },
];

function screenToPath(screen) {
  if (screen.startsWith('employee-detail:')) return '/hr-admin/people/' + screen.split(':')[1];
  if (screen === 'employees:admin') return '/hr-admin/people';
  const entry = ROUTE_MAP.find(r => r.screen === screen);
  return entry ? entry.path : '/hr-admin';
}

function pathToScreen(path) {
  const clean = path.replace(/\/$/, '') || '/hr-admin';
  const empMatch = clean.match(/^\/hr-admin\/people\/(.+)$/);
  if (empMatch) return 'employee-detail:' + empMatch[1];
  const entry = ROUTE_MAP.find(r => r.path === clean);
  return entry ? entry.screen : 'dashboard';
}

function SettingsModeSidebar({ active, onNav }) {
  const [personalOpen, setPersonalOpen] = useState(true);
  const [companyOpen,  setCompanyOpen]  = useState(true);

  return (
    <React.Fragment>
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
            { id: 'settings-allowances',   label: 'Allowances' },
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
function Sidebar({ active, onNav, pendingCount, sidebarMode, onSetSidebarMode, appEntity, onSetAppEntity }) {
  const inSettings = sidebarMode === 'settings';
  const panelStyle = (offset) => ({
    position: 'absolute', inset: 0,
    display: 'flex', flexDirection: 'column',
    transform: `translateX(${offset})`,
    transition: `transform ${PANEL_DUR}ms ${EASE_DRAWER}`,
  });

  return (
    <div style={{
      width: 255, flexShrink: 0, background: P.white,
      borderRight: `1px solid ${P.border}`,
      display: 'flex', flexDirection: 'column',
      height: '100vh', position: 'sticky', top: 0,
    }}>
      <div style={{ borderBottom: `1px solid ${P.border}`, flexShrink: 0, position: 'relative', height: 53 }}>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', padding: '0 20px', opacity: inSettings ? 0 : 1, transition: `opacity 200ms ${EASE_OUT}`, pointerEvents: inSettings ? 'none' : 'auto' }}>
          <svg width="90" height="22" viewBox="0 0 115 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M45.753 5.26971C48.8202 5.29294 51.0277 7.91867 51.0277 10.5909C51.0277 13.2631 48.8202 15.8888 45.753 15.912H41.8725V22H39.1074V5.26971H45.753ZM45.7065 13.1236C47.1937 13.1236 48.2393 11.8921 48.2393 10.5909C48.2393 9.26639 47.1937 8.03485 45.7065 8.03485H41.8725V13.1236H45.7065ZM60.7159 10.01H63.481V22H60.7159V20.3502C59.8329 21.4656 58.6014 22.1394 57.0677 22.1394C54.1864 22.1394 51.8628 19.4207 51.8628 16.005C51.8628 12.5892 54.1864 9.87054 57.0677 9.87054C58.6014 9.87054 59.8794 10.5909 60.7159 11.683V10.01ZM57.6951 19.3975C59.4146 19.3975 60.7159 17.8871 60.7159 16.005C60.7159 14.1228 59.4146 12.6124 57.6951 12.6124C55.9524 12.6124 54.6511 14.1228 54.6511 16.005C54.6511 17.8871 55.9524 19.3975 57.6951 19.3975ZM77.1976 10.01V21.7444C77.1976 25.2299 74.7346 27.7162 71.4815 27.7162C67.8798 27.7162 65.9512 25.2066 65.8118 22.9062H68.6931C68.879 24.2075 69.8781 25.1369 71.5279 25.1369C73.3404 25.1369 74.4325 23.7195 74.4325 21.8141V20.4432C73.6192 21.4191 72.318 22.1394 70.9238 22.1394C68.1819 22.1394 66.6947 19.9784 66.6947 17.2365V10.01H69.4599V16.8183C69.4599 18.2357 70.552 19.3975 71.9462 19.3975C73.3404 19.3975 74.4325 18.2124 74.4325 16.8183V10.01H77.1976ZM87.1382 10.01V12.4266H84.1639V22H81.3987V12.4266H79.4701V10.01H81.3987V9.12697C81.3987 6.75684 82.9091 5.13029 85.1631 5.13029C86.046 5.13029 86.6037 5.26971 86.9755 5.36265V7.8722C86.7664 7.80249 86.2552 7.6863 85.7672 7.6863C84.8842 7.6863 84.1639 8.01162 84.1639 9.0805V10.01H87.1382ZM92.108 5.26971V22H89.3429V5.26971H92.108ZM96.8158 8.49958C95.7702 8.49958 94.9104 7.66307 94.9104 6.59419C94.9104 5.52531 95.7702 4.66556 96.8158 4.66556C97.9312 4.66556 98.7909 5.52531 98.7909 6.59419C98.7909 7.66307 97.8847 8.49958 96.8158 8.49958ZM98.1868 22H95.4216V10.01H98.1868V22ZM101.595 26.7402V10.01H104.361V11.7295C105.197 10.4282 106.452 9.87054 107.985 9.87054C110.797 9.87054 113.214 12.4498 113.214 16.005C113.214 19.5602 110.797 22.1394 107.985 22.1394C106.452 22.1394 105.127 21.3494 104.361 20.2573V26.7402H101.595ZM107.358 12.5892C105.592 12.5892 104.361 14.1228 104.361 16.005C104.361 17.8871 105.592 19.3975 107.358 19.3975C109.124 19.3975 110.449 17.8871 110.449 16.005C110.449 14.1228 109.124 12.5892 107.358 12.5892Z" fill={P.ink}/>
            <path d="M4.33203 5.57666C6.05531 5.57671 7.54249 7.51885 8.24023 10.3306C8.49527 9.9639 8.77641 9.60597 9.08301 9.26025C12.4138 5.50467 17.5161 4.59001 20.4785 7.21729C21.4856 8.11046 22.1146 9.29844 22.377 10.6245C24.205 7.2415 26.4713 5.13629 27.8652 5.72314C28.6853 6.06841 29.0487 7.28097 28.9775 8.96826C29.5959 6.87093 30.4348 5.53748 31.2529 5.60596C32.5914 5.71859 33.3628 9.54023 32.9756 14.1411C32.5884 18.7414 31.1899 22.3791 29.8516 22.2671C28.5131 22.1545 27.7418 18.3338 28.1289 13.7329C28.1475 13.5121 28.1702 13.2937 28.1934 13.0776C27.9732 13.7849 27.7085 14.514 27.3984 15.2505C25.4779 19.8119 22.573 22.9418 20.9102 22.2417C20.055 21.8815 19.6963 20.5784 19.8096 18.7769C16.4787 22.5311 11.378 23.4448 8.41602 20.8179C8.04583 20.4895 7.72679 20.1213 7.45801 19.7212C6.66956 21.3081 5.56123 22.2963 4.33203 22.2964C1.93956 22.2964 7.5582e-05 18.554 0 13.937C0 9.31987 1.93951 5.57666 4.33203 5.57666Z" fill={P.ink}/>
          </svg>
        </div>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', opacity: inSettings ? 1 : 0, transition: `opacity 200ms ${EASE_OUT}`, pointerEvents: inSettings ? 'auto' : 'none' }}>
          <button onClick={() => { onSetSidebarMode('app'); onNav('dashboard'); }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 20px', width: '100%', height: '100%', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}>
            <Icon name="arrow-left" size={14} color={P.inkSoft} strokeWidth={1.75} />
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 13, color: P.inkSoft }}>Back to app</span>
          </button>
        </div>
      </div>
      <EntitySwitcher value={appEntity} onChange={onSetAppEntity} mode="app" />
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
function ReasonModal({ title, description, confirmLabel, confirmColor = '#dc2626', onConfirm, onClose }) {
  const [reason, setReason] = useState('');
  return (
    <ModalShell title={title} onClose={onClose}
      footer={close => (
        <div style={{ padding: '14px 22px', borderTop: `1px solid ${P.border}`, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={close}>Back</Button>
          <Button variant="primary" disabled={!reason.trim()} onClick={() => { onConfirm(reason.trim()); close(); }}
            style={{ padding: '8px 20px', background: reason.trim() ? confirmColor : P.border, color: reason.trim() ? '#fff' : P.inkFaint }}>
            {confirmLabel}
          </Button>
        </div>
      )}>
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
              border: `1px solid ${P.border}`,
              fontFamily: 'var(--font-body)', fontSize: 13, color: P.ink,
              outline: 'none', resize: 'none', lineHeight: 1.5,
            }}
          />
        </div>
      </div>
    </ModalShell>
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
    approved: { bg: '#bbf7d0', color: '#14532d', label: 'Approved' },
    rejected: { bg: '#fecaca', color: '#7f1d1d', label: 'Declined' },
    pending:  { bg: '#fde68a', color: '#92400e', label: 'Pending'  },
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
                  <DotPill dot={false} color="#92400e" bg="#fef9c3" border="#fde68a">Missing</DotPill>
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
                  ? <DotPill bg="#fde68a" color="#92400e">{overlapping.length} of {teamSize} away</DotPill>
                  : <DotPill bg="#dcfce7" color="#166534">All available</DotPill>
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
    <DrawerShell onClose={onClose}
      title={editMode ? 'Edit request' : cancelMode ? 'Cancel absence' : declineMode ? 'Decline request' : 'Request details'}
      onBack={secondPanel ? (editMode ? exitEdit : cancelMode ? exitCancel : exitDecline) : undefined}>
      {close => (
        <>
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
        </>
      )}
    </DrawerShell>
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

function SettingsSelect({ value, onChange, opts }) {
  const [open, setOpen] = useState(false);
  const { rendered: menuRendered, visible: menuVisible } = usePopoverTransition(open);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  const selected = opts.find(o => o.value === value);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        width: '100%', padding: '9px 12px', borderRadius: 8,
        border: `1px solid ${open ? P.borderStrong : P.border}`, background: P.white, color: P.ink,
        cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 14, textAlign: 'left', boxSizing: 'border-box',
      }}>
        <span>{selected?.label ?? '—'}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={P.inkFaint} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ flexShrink: 0, transition: `transform 150ms ${EASE_OUT}`, transform: open ? 'rotate(180deg)' : 'none' }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {menuRendered && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50,
          background: P.white, border: `1px solid ${P.border}`, borderRadius: 10,
          boxShadow: '0 4px 16px rgba(15,13,40,0.10)', overflow: 'hidden',
          ...popoverStyle(menuVisible, 'top left'),
        }}>
          {opts.map(o => (
            <button key={o.value} onClick={() => { onChange(o.value); setOpen(false); }} style={{
              display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px',
              border: 'none', cursor: 'pointer', background: value === o.value ? P.bg : 'transparent',
              fontFamily: 'var(--font-body)', fontSize: 14, color: P.ink,
            }}>{o.label}</button>
          ))}
        </div>
      )}
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
      emp.name.toLowerCase().includes(q) || (emp.department || '').toLowerCase().includes(q)
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
  const [type, setType]       = useState(existing?.type || 'Statutory annual leave');
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

  const handleSave = (close) => {
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

  React.useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <DrawerShell onClose={onClose}
      title={isEdit ? (allEmployees ? 'Edit company closure' : 'Edit time off') : (allEmployees ? 'Add company closure' : 'Add time off')}>
      {close => (
        <>
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

          {/* Paternity leave / Maternity leave entitlement note */}
          {!allEmployees && (type === 'Paternity leave' || type === 'Maternity leave') && (() => {
            const meta = SPECIAL_LEAVE_METADATA[type];
            return (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, padding: '8px 10px', borderRadius: 7, background: P.bg, border: `1px solid ${P.border}` }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={P.inkSoft} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 1, flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: P.inkSoft, lineHeight: 1.4 }}>
                  Entitlement: {meta.statutoryLabel} — {meta.statutoryNote}
                </span>
              </div>
            );
          })()}

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
          <button onClick={() => handleSave(close)} style={{
            padding: '8px 20px', borderRadius: 8, border: 'none',
            background: P.action, color: '#fff', cursor: 'pointer',
            fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13,
          }}>{isEdit ? (allEmployees ? 'Save closure' : 'Save changes') : (allEmployees ? 'Add closure' : 'Confirm absence')}</button>
        </div>
        </>
      )}
    </DrawerShell>
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
                <DotPill dot={false} size={11} color="#dc2626" bg="#fef2f2" border="#fecaca">⚠ {sameDept.length} overlaps</DotPill>
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
          <StatusPill status={expense.status} />
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
    <DrawerShell onClose={onClose} title={rejectMode ? 'Reject expense' : 'Expense details'} onBack={secondPanel ? () => setRejectMode(false) : undefined}>
      {close => (
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
      )}
    </DrawerShell>
  );
}

// ── Choice drawer ─────────────────────────────────────────────────────────
function ChoiceDrawer({ choice, onClose, onApprove, onDecline }) {
  const emp = EMPLOYEES[choice.empId] || { name: choice.empId, initials: '?', color: '#e5e7eb' };
  const isPending = choice.status === 'pending';
  const isApproved = choice.status === 'approved';

  // null | 'decline' | 'payslip' | 'activity' | 'terminate'
  const [activePanel, setActivePanel] = React.useState(null);
  const [declineReason, setDeclineReason] = React.useState('');
  const [terminateDate, setTerminateDate] = React.useState('2026-07-24');
  const [terminateReason, setTerminateReason] = React.useState('');
  const [terminateAcknowledged, setTerminateAcknowledged] = React.useState(false);

  const SLIDE_DUR = 300;
  const isSecondary = activePanel !== null;
  const detailSlide = isSecondary ? 'translateX(-100%)' : 'translateX(0)';
  const panel2Slide = isSecondary ? 'translateX(0)' : 'translateX(100%)';
  const slideTransition = `transform ${SLIDE_DUR}ms ${EASE_DRAWER}`;

  const panelTitles = { decline: isPending ? 'Decline choice' : 'Reject choice', payslip: 'Impact on payslip', activity: 'Activity log', terminate: 'Terminate early' };
  const headerTitle = activePanel ? panelTitles[activePanel] : 'Choice details';

  // Generate monthly payslip rows from choice dates
  const payslipRows = React.useMemo(() => {
    if (!choice.sDate || !choice.eDate) return [];
    const parts = d => d.split('/').map(Number);
    const [, sm, sy] = parts(choice.sDate);
    const [, em, ey] = parts(choice.eDate);
    const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const totalMonths = choice.depreciation || Math.max(1, (ey - sy) * 12 + (em - sm) + 1);
    const priceNum = parseFloat((choice.price || '0').replace(',', '.').replace(/[^0-9.]/g, '')) || 0;
    const monthly = (priceNum / totalMonths).toFixed(2).replace('.', ',');
    const rows = [];
    let y = sy, m = sm;
    while (y < ey || (y === ey && m <= em)) {
      const past = y < 2026 || (y === 2026 && m < 7);
      rows.push({ period: `${MONTHS[m - 1]} ${y}`, amount: `${monthly} EUR`, past });
      if (++m > 12) { m = 1; y++; }
    }
    return rows;
  }, [choice]);

  // Activity log, most recent first
  const activityLog = React.useMemo(() => {
    const events = [
      { icon: 'pencil', label: 'Created', actor: 'Bruno Coen', date: `${choice.cDate || '—'} 17:58` },
      { icon: 'upload', label: 'Submitted', actor: 'Bruno Coen', date: `${choice.cDate || '—'} 17:58` },
    ];
    if (choice.status === 'approved') events.push({ icon: 'check', label: 'Approved', actor: 'Bruno Coen', date: `${choice.cDate || '—'} 17:58` });
    if (choice.status === 'declined') events.push({ icon: 'x', label: 'Declined', actor: 'Bruno Coen', date: `${choice.cDate || '—'} 17:58` });
    return events.reverse();
  }, [choice]);

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
  const ActionRow = ({ icon, label, onClick }) => (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', padding: '14px 24px', cursor: 'pointer', gap: 12 }}>
      <Icon name={icon} size={15} color={P.inkSoft} strokeWidth={1.75} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1, fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 14, color: P.ink }}>{label}</span>
      <Icon name="chevron-right" size={14} color={P.inkFaint} strokeWidth={2} />
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

  return (
    <DrawerShell onClose={onClose} title={headerTitle} onBack={isSecondary ? () => setActivePanel(null) : undefined}>
      {close => (
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {/* Panel 1 — Detail */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', transform: detailSlide, transition: slideTransition }}>
            <div style={{ flex: 1, overflowY: 'auto' }}>

              {/* Hero */}
              <div style={{ padding: '20px 24px 16px' }}>
                <div style={{ background: P.bg, borderRadius: 16, padding: '20px 20px 20px', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
                    <div style={{ flex: 1, minWidth: 0, paddingBottom: 20, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ marginBottom: 32 }}>
                        <StatusPill status={choice.status || 'approved'} />
                      </div>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: P.ink, lineHeight: 1.35, marginBottom: 8 }}>
                        {choice.name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                        <span style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: 12, color: P.inkSoft }}>via</span>
                        <img src="assets/coolblue-logo.png" alt="Coolblue" style={{ height: 14, objectFit: 'contain', display: 'block' }} />
                        <span style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: 12, color: P.inkSoft }}>Coolblue</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26, color: P.ink, letterSpacing: '-0.02em' }}>{choice.price.replace(' EUR', '')}</span>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: P.inkSoft }}>EUR</span>
                      </div>
                    </div>
                    {choice.illustration
                      ? <img src={choice.illustration} alt="" style={{ width: 110, height: 110, objectFit: 'contain', flexShrink: 0, display: 'block' }} />
                      : <div style={{ width: 90, height: 90, flexShrink: 0, background: P.white, borderRadius: 14, border: `1px solid ${P.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                          <Icon name="gift" size={36} color={P.inkFaint} strokeWidth={1.25} />
                        </div>
                    }
                  </div>
                  <div style={{ height: 1, background: P.border, margin: '16px -20px 0 -20px' }} />
                  <div style={{ display: 'flex', alignItems: 'center', padding: '16px 0 0', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
                      <Icon name="user" size={14} color={P.inkSoft} strokeWidth={1.75} />
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 14, color: P.ink }}>Requested by</span>
                    </div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                      <Avatar employeeId={choice.empId} size={20} />
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 14, color: P.inkSoft }}>{emp.name}</span>
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
                <TableRow label="Start date" icon="calendar">{isPending ? '—' : (choice.sDate || '—')}</TableRow>
                <TableRow label="End date" icon="calendar-x">{isPending ? '—' : (choice.eDate || '—')}</TableRow>
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
                <SectionHeader>Decline reason</SectionHeader>
                <Group>
                  <TableRow label="Reason" icon="message-square">
                    <span style={{ textAlign: 'right', whiteSpace: 'normal', lineHeight: 1.4, color: '#dc2626' }}>{choice.declineReason}</span>
                  </TableRow>
                </Group>
              </>)}

              {/* Admin actions — approved or declined choices */}
              {!isPending && (<>
                <SectionHeader>Admin</SectionHeader>
                <Group>
                  <ActionRow icon="file-text" label="Impact on payslip" onClick={() => setActivePanel('payslip')} />
                  <ActionRow icon="clock" label="Activity log" onClick={() => setActivePanel('activity')} />
                  {isApproved && <ActionRow icon="calendar-x" label="Terminate early" onClick={() => { setTerminateReason(''); setTerminateAcknowledged(false); setActivePanel('terminate'); }} />}
                </Group>
                <div style={{ height: 24 }} />
              </>)}
            </div>

            {/* Footer */}
            {isPending && (
              <div style={{ flexShrink: 0, padding: '12px 20px', borderTop: `1px solid ${P.border}`, display: 'flex', gap: 10 }}>
                <button onClick={() => { setDeclineReason(''); setActivePanel('decline'); }} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Icon name="X" size={13} color="#dc2626" strokeWidth={2.5} /> Decline
                </button>
                <button onClick={() => { onApprove(choice.id); close(); }} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: P.ink, color: P.white, cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Icon name="Check" size={13} color={P.white} strokeWidth={2.5} /> Approve
                </button>
              </div>
            )}
            {isApproved && (
              <div style={{ flexShrink: 0, padding: '12px 20px', borderTop: `1px solid ${P.border}` }}>
                <button onClick={() => { setDeclineReason(''); setActivePanel('decline'); }} style={{ width: '100%', padding: '10px 0', borderRadius: 10, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Icon name="X" size={13} color="#dc2626" strokeWidth={2.5} /> Reject choice
                </button>
              </div>
            )}
          </div>

          {/* Panel 2 — content switches based on activePanel */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', transform: panel2Slide, transition: slideTransition }}>

            {/* Decline / Reject panel */}
            {activePanel === 'decline' && (<>
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 14, color: P.inkSoft, lineHeight: 1.5 }}>
                  {isPending
                    ? <>You're declining <strong style={{ color: P.ink }}>{emp.name}</strong>'s request for {choice.name}.</>
                    : <>You're revoking the approval for <strong style={{ color: P.ink }}>{emp.name}</strong>'s {choice.name}. This cannot be undone.</>
                  }
                </p>
                <div>
                  <label style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 10, color: P.inkFaint, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Reason <span style={{ textTransform: 'none', fontWeight: 400 }}>(optional)</span></label>
                  <textarea value={declineReason} onChange={e => setDeclineReason(e.target.value)} placeholder="Explain why this choice is being declined…" rows={3} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${P.border}`, background: P.bg, fontFamily: 'var(--font-body)', fontSize: 14, color: P.ink, resize: 'none', lineHeight: 1.5, boxSizing: 'border-box', outline: 'none' }} />
                </div>
              </div>
              <div style={{ flexShrink: 0, padding: '12px 20px', borderTop: `1px solid ${P.border}`, display: 'flex', gap: 10 }}>
                <button onClick={() => setActivePanel(null)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: `1px solid ${P.border}`, background: 'transparent', color: P.inkSoft, cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13 }}>Go back</button>
                <button onClick={() => { onDecline(choice.id, declineReason); close(); }} style={{ flex: 2, padding: '10px 0', borderRadius: 10, border: 'none', background: '#dc2626', color: P.white, cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13 }}>
                  {isPending ? 'Confirm decline' : 'Confirm rejection'}
                </button>
              </div>
            </>)}

            {/* Impact on payslip panel */}
            {activePanel === 'payslip' && (
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <div style={{ padding: '16px 24px 12px' }}>
                  <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 14, color: P.inkSoft, lineHeight: 1.5 }}>
                    Benefits may affect your payslip by either boosting your gross salary with reimbursements or reducing it through deductions such as Benefit in Kind.
                  </p>
                </div>
                {payslipRows.length === 0
                  ? <div style={{ padding: '32px 0', textAlign: 'center', color: P.inkFaint, fontFamily: 'var(--font-body)', fontSize: 13 }}>No payslip data available</div>
                  : (() => {
                      const todayIdx = payslipRows.findIndex(r => !r.past);
                      return (
                        <div style={{ paddingBottom: 24 }}>
                          {/* Section header */}
                          <div style={{ padding: '4px 24px 8px', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 10, color: P.inkFaint, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            Benefit in Kind
                          </div>
                          {payslipRows.map((row, i) => (
                            <React.Fragment key={i}>
                              {/* "Today" divider between past and future */}
                              {i === todayIdx && todayIdx > 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 24px' }}>
                                  <div style={{ flex: 1, height: 1, background: P.border }} />
                                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 10, color: P.inkSoft, textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>Today</span>
                                  <div style={{ flex: 1, height: 1, background: P.border }} />
                                </div>
                              )}
                              {i > 0 && i !== todayIdx && (
                                <div style={{ height: 1, background: P.border, marginLeft: 24 }} />
                              )}
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 24px' }}>
                                <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: row.past ? P.inkSoft : P.ink }}>{row.period}</span>
                                <span style={{ fontFamily: 'var(--font-display)', fontWeight: row.past ? 400 : 600, fontSize: 14, color: row.past ? P.inkSoft : P.ink, flexShrink: 0 }}>{row.amount}</span>
                              </div>
                            </React.Fragment>
                          ))}
                        </div>
                      );
                    })()
                }
              </div>
            )}

            {/* Activity log panel */}
            {activePanel === 'activity' && (
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <div style={{ padding: '16px 24px 12px' }}>
                  <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 14, color: P.inkSoft, lineHeight: 1.5 }}>
                    Track all changes and updates to this choice.
                  </p>
                </div>
                <Group>
                  {activityLog.map((event, i) => (
                    <TableRow key={i} icon={event.icon} label={`${event.label} by ${event.actor}`}>
                      {event.date}
                    </TableRow>
                  ))}
                </Group>
              </div>
            )}

            {/* Terminate early panel */}
            {activePanel === 'terminate' && (<>
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 14, color: P.inkSoft, lineHeight: 1.5 }}>
                  Set the termination date and provide a reason to end this choice early.
                </p>
                <div>
                  <label style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: P.ink, marginBottom: 4 }}>Termination date</label>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkSoft, marginBottom: 10 }}>When should this choice officially end?</div>
                  <input type="date" value={terminateDate} onChange={e => setTerminateDate(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${P.border}`, fontFamily: 'var(--font-body)', fontSize: 14, color: P.ink, boxSizing: 'border-box', outline: 'none', background: P.white }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: P.ink, marginBottom: 10 }}>Reason for termination</label>
                  <select value={terminateReason} onChange={e => setTerminateReason(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${terminateReason ? P.border : P.border}`, fontFamily: 'var(--font-body)', fontSize: 14, color: terminateReason ? P.ink : P.inkSoft, boxSizing: 'border-box', outline: 'none', background: P.white, appearance: 'none', cursor: 'pointer' }}>
                    <option value="" disabled>Select a reason</option>
                    {['Broken', 'Other', 'Stolen', 'Terminated by benefit partner'].map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: '12px 14px', display: 'flex', gap: 10 }}>
                  <Icon name="triangle-alert" size={16} color="#ea580c" strokeWidth={1.75} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#9a3412', lineHeight: 1.5 }}>This action cannot be undone. The choice will be permanently terminated on the date specified.</span>
                </div>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                  <input type="checkbox" checked={terminateAcknowledged} onChange={e => setTerminateAcknowledged(e.target.checked)} style={{ marginTop: 2, flexShrink: 0, accentColor: P.action }} />
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkSoft, lineHeight: 1.5 }}>I understand that this does not automatically recalculate payment amounts and that manual changes are still needed.</span>
                </label>
              </div>
              <div style={{ flexShrink: 0, padding: '12px 20px', borderTop: `1px solid ${P.border}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  disabled={!terminateReason || !terminateAcknowledged}
                  onClick={() => close()}
                  style={{ width: '100%', padding: '10px 0', borderRadius: 10, border: 'none', background: (!terminateReason || !terminateAcknowledged) ? P.border : P.ink, color: (!terminateReason || !terminateAcknowledged) ? P.inkSoft : P.white, cursor: (!terminateReason || !terminateAcknowledged) ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13 }}>
                  Confirm termination
                </button>
                <button onClick={() => setActivePanel(null)} style={{ width: '100%', padding: '10px 0', borderRadius: 10, border: '1px solid #fecaca', background: 'transparent', color: '#dc2626', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13 }}>Cancel</button>
              </div>
            </>)}

          </div>
        </div>
      )}
    </DrawerShell>
  );
}

// ── Table row ──────────────────────────────────────────────────────────────
const TH = ({ children, style }) => (
  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 11, color: P.inkSoft, textTransform: 'uppercase', letterSpacing: '0.06em', ...style }}>{children}</div>
);

const AppLink = ({ children, onClick, style }) => (
  <span onClick={onClick} style={{ color: P.ink, textDecoration: 'underline', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', ...style }}>{children}</span>
);

function RequestRow({ req, requests, onApprove, onDecline, onDetail, onDeclineDirectly, onEdit, onCancel, selected, onToggle, onViewInCalendar, showStatus, showEntity, removing }) {
  const emp = EMPLOYEES[req.employee] || { name: req.employee, initials: '?', color: '#e5e7eb', entitlement: 20 };
  const [hover, setHover] = useState(false);
  const usedDays = requests
    .filter(r => r.employee === req.employee && r.id !== req.id && (r.status === 'approved' || r.status === 'pending'))
    .reduce((s, r) => s + r.days, 0);
  const remaining = Math.max(0, emp.entitlement - usedDays - req.days);
  const overlapping = getOverlapping(req, requests);
  const gridCols = showStatus
    ? (showEntity ? '32px 1.8fr 0.8fr 1fr 0.9fr 0.7fr 0.7fr 1fr 1fr 96px' : '32px 1.8fr 1fr 0.9fr 0.7fr 0.7fr 1fr 1fr 96px')
    : (showEntity ? '32px 1.8fr 0.8fr 0.9fr 0.7fr 0.7fr 1fr 1fr 96px' : '32px 1.8fr 0.9fr 0.7fr 0.7fr 1fr 1fr 96px');
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
          {showEntity && <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkSoft, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.entity || '—'}</span>}
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
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const validate = () => {
    const errs = {};
    if (!empId) errs.empId = true;
    if (!category) errs.category = true;
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) errs.amount = true;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const selectStyle = (hasErr) => ({
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: `1px solid ${hasErr ? '#ef4444' : P.border}`,
    background: P.white, fontFamily: 'var(--font-body)', fontSize: 14,
    color: P.ink, outline: 'none', appearance: 'none', cursor: 'pointer',
  });
  const inputStyle = (hasErr) => ({
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: `1px solid ${hasErr ? '#ef4444' : P.border}`,
    background: P.white, fontFamily: 'var(--font-body)', fontSize: 14,
    color: P.ink, outline: 'none', boxSizing: 'border-box',
  });
  const labelStyle = { fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12, color: P.inkSoft, marginBottom: 6, display: 'block' };
  const sortedEmps = Object.entries(EMPLOYEES).sort((a,b) => a[1].name.localeCompare(b[1].name));

  return (
    <DrawerShell onClose={onClose} title="Add expense">
      {close => {
        const submit = () => {
          if (!validate()) return;
          const today = new Date();
          const day = today.getDate();
          const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
          onSave({ employee: empId, category, amount: parseFloat(amount), currency: 'EUR', description: note, receipt: receiptFile ? receiptFile.name : '', submittedAt: `${day} ${months[today.getMonth()]}` });
          close();
        };
        return (
          <>
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
          <Button variant="secondary" onClick={close} style={{ flex: 1, padding: '10px 0', color: P.inkSoft }}>Cancel</Button>
          <Button variant="primary" onClick={submit} style={{ flex: 2, padding: '10px 0' }}>Add expense</Button>
        </div>
          </>
        );
      }}
    </DrawerShell>
  );
}

// ── Expense row ────────────────────────────────────────────────────────────
function ExpenseRow({ exp, onApprove, onDetail, showStatus, showEntity, selected, onToggle }) {
  const emp = EMPLOYEES[exp.employee] || { name: exp.employee, initials: '?', color: '#e5e7eb' };
  const [hover, setHover] = useState(false);
  const gridCols = showStatus
    ? (showEntity ? '32px 1.8fr 0.8fr 1fr 1fr 2fr 0.8fr 0.7fr 96px' : '32px 1.8fr 1fr 1fr 2fr 0.8fr 0.7fr 96px')
    : (showEntity ? '32px 1.8fr 0.8fr 1fr 2fr 0.8fr 0.7fr 96px' : '32px 1.8fr 1fr 2fr 0.8fr 0.7fr 96px');

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
      {showEntity && <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkSoft, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.entity || '—'}</span>}
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
function ExpensesScreen({ expenses, categories, onApprove, onDetail, onAdd, appEntity = null }) {
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
  const showEntity = !appEntity;
  const gridCols = showStatus
    ? (showEntity ? '32px 1.8fr 0.8fr 1fr 1fr 2fr 0.8fr 0.7fr 96px' : '32px 1.8fr 1fr 1fr 2fr 0.8fr 0.7fr 96px')
    : (showEntity ? '32px 1.8fr 0.8fr 1fr 2fr 0.8fr 0.7fr 96px' : '32px 1.8fr 1fr 2fr 0.8fr 0.7fr 96px');
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
        badge={appEntity ? (ENTITIES.find(e => e.id === appEntity)?.name) : null}
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
        <Button variant="primary" icon="Plus" onClick={() => setAddOpen(true)}>Add expense</Button>
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
            {showEntity && <TH>Entity</TH>}
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
            <ExpenseRow key={exp.id} exp={exp} onApprove={onApprove} onDetail={onDetail} showStatus={showStatus} showEntity={showEntity} selected={selected.has(exp.id)} onToggle={toggleSelect} />
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

function RequestsScreen({ requests, onApprove, onDecline, onSave, onCancel, onViewInCalendar, onNav, appEntity = null }) {
  const showEntity = !appEntity;
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
        badge={appEntity ? (ENTITIES.find(e => e.id === appEntity)?.name) : null}
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
        <Button variant="primary" icon="Plus" onClick={() => setAddOpen(true)}>Add time off</Button>
      </PageHeader>
      <FilterToolbar
        searchText={searchText} onSearch={v => { setSearchText(v); setPage(1); }}
        filter={leaveFilter} onFilter={v => { setLeaveFilter(v); setPage(1); }}
        deptFilter={deptFilter} onDeptFilter={v => { setDeptFilter(v); setPage(1); }}
      />
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
      <div style={{ background: P.white, borderRadius: 12, border: `1px solid ${P.border}`, overflow: 'clip' }}>
        <div style={{ display: 'grid', gridTemplateColumns: (() => { const s = tab === 'all' || tab === 'declined'; if (s && showEntity) return '32px 1.8fr 0.8fr 1fr 0.9fr 0.7fr 0.7fr 1fr 1fr 96px'; if (s) return '32px 1.8fr 1fr 0.9fr 0.7fr 0.7fr 1fr 1fr 96px'; if (showEntity) return '32px 1.8fr 0.8fr 0.9fr 0.7fr 0.7fr 1fr 1fr 96px'; return '32px 1.8fr 0.9fr 0.7fr 0.7fr 1fr 1fr 96px'; })(), alignItems: 'center', gap: 12, padding: '0 20px', height: 38, borderBottom: `1px solid ${P.border}`, background: P.bg, position: 'sticky', top: 0, zIndex: 5 }}>
          <input type="checkbox" checked={allSelected} onChange={toggleAll} style={{ cursor: 'pointer', accentColor: P.action }} />
          <TH>Requested by</TH>{showEntity && <TH>Entity</TH>}{(tab === 'all' || tab === 'declined') && <TH>Status</TH>}<TH>Leave type</TH><TH>Duration</TH><TH>Date from</TH><TH>Date to</TH><TH>Also off</TH><div />
        </div>
        {displayRows.length === 0 ? (
          <div style={{ padding: '60px 24px', textAlign: 'center' }}>
            <Icon name="Inbox" size={32} color={P.border} style={{ marginBottom: 12 }} />
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: P.inkFaint }}>No {tab === 'pending' ? 'pending ' : tab === 'approved' ? 'approved ' : tab === 'declined' ? 'declined ' : ''}requests</div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: P.inkFaint, marginTop: 4 }}>{tab === 'pending' ? 'New requests from your team will appear here.' : ''}</div>
          </div>
        ) : displayRows.map(req => (
          <RequestRow key={req.id} req={req} requests={requests} onApprove={onApprove} onDecline={onDecline} onDetail={r => { setDetailDeclineMode(false); setDetail(r); }} onDeclineDirectly={r => { setDetailDeclineMode(true); setDetail(r); }} onEdit={setEditReq} onCancel={onCancel} selected={selected.has(req.id)} onToggle={toggleSelect} onViewInCalendar={onViewInCalendar} showStatus={tab === 'all' || tab === 'declined'} showEntity={showEntity} removing={removingIds.has(req.id)} />
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
const LEAVE_FILTER_OPTS = [['all', 'All time-off types'], ['Statutory annual leave', 'Statutory annual leave'], ['ADV / RTT', 'ADV / RTT'], ['Extra-legal leave', 'Extra-legal leave'], ['Sick leave', 'Sick leave'], ['Special leave', 'Special leave']];

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

function PageHeader({ title, subtitle, badge, children, tabs }) {
  return (
    <div style={{ flexShrink: 0, borderBottom: `1px solid ${P.border}` }}>
      <div style={{ padding: tabs ? '40px 28px 24px' : '40px 28px 20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          {badge && (
            <span style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '2px 8px', borderRadius: 6,
              background: P.white, border: `1px solid ${P.border}`,
              fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: 11, color: P.inkSoft,
              letterSpacing: 0, marginBottom: 24,
            }}>{badge}</span>
          )}
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
function TeamAbsencesScreen({ requests, pendingCount, onNav, onShowDetail, activeReqId, onSave, companyEvents = [], onCancelCompanyEvent, initialDate, initialDeptFilter, appEntity = null, leaveTypes = [] }) {
  const getLvColor = (type) => leaveTypes.find(lt => lt.name === type)?.color || LEAVE_COLORS[type] || '#2563eb';
  const getLvBorder = (type) => COLOR_TO_BORDER[getLvColor(type)] || LEAVE_BORDER_COLORS[type] || '#999';
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
      if (appEntity && emp.entityId !== appEntity) return false;
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
  }, [searchText, activeDepts, deptFilter, absencesOnly, dayISOs, absenceMap, leaveFilter, appEntity]);

  const grouped = useMemo(() => {
    const groups = {};
    for (const [id, emp] of filteredEmployees) {
      if (!groups[emp.department]) groups[emp.department] = [];
      groups[emp.department].push([id, emp]);
    }
    return groups;
  }, [filteredEmployees]);

  const calendarRowItems = useMemo(() => {
    if (appEntity) return filteredEmployees.map(([empId, emp]) => ({ type: 'employee', empId, emp }));
    const items = [];
    for (const entity of ENTITIES) {
      const entityEmps = filteredEmployees.filter(([, emp]) => emp.entityId === entity.id);
      if (!entityEmps.length) continue;
      items.push({ type: 'header', entity, count: entityEmps.length });
      for (const [empId, emp] of entityEmps) items.push({ type: 'employee', empId, emp });
    }
    return items;
  }, [filteredEmployees, appEntity]);

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
      <PageHeader title="Team absences" subtitle="Track and plan team availability" badge={appEntity ? (ENTITIES.find(e => e.id === appEntity)?.name) : null}>
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
              {calendarRowItems.map((item) => {
                if (item.type === 'header') {
                  return (
                    <div key={`entity-header-${item.entity.id}`} style={{ display: 'grid', gridTemplateColumns: gridCols, borderBottom: `1px solid ${P.border}`, background: P.bg }}>
                      <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', padding: '0 12px', height: 26 }}>
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 600, color: P.inkSoft, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{item.entity.name} · {item.count}</span>
                      </div>
                    </div>
                  );
                }
                const { empId, emp } = item;
                return (
                  <React.Fragment key={empId}>
                    {[1].map(() => (
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
                          const barColor = show ? getLvColor(entry.type) : null;
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
                                        borderTop: isPending ? `1.5px dashed ${getLvBorder(entry.type)}` : 'none',
                                        borderBottom: isPending ? `1.5px dashed ${getLvBorder(entry.type)}` : 'none',
                                        borderLeft: isPending && half === 'am' ? `1.5px dashed ${getLvBorder(entry.type)}` : 'none',
                                        borderRight: isPending && half === 'pm' ? `1.5px dashed ${getLvBorder(entry.type)}` : 'none',
                                        boxShadow: activeReqId && entry.requestId === activeReqId ? `inset 0 0 0 2px ${getLvBorder(entry.type)}` : undefined,
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
                                    borderTop: isPending ? `1.5px dashed ${getLvBorder(entry.type)}` : 'none',
                                    borderBottom: isPending ? `1.5px dashed ${getLvBorder(entry.type)}` : 'none',
                                    borderLeft: isPending && isStart ? `1.5px dashed ${getLvBorder(entry.type)}` : 'none',
                                    borderRight: isPending && isEnd ? `1.5px dashed ${getLvBorder(entry.type)}` : 'none',
                                    boxShadow: activeReqId && entry.requestId === activeReqId ? `inset 0 0 0 2px ${getLvBorder(entry.type)}` : undefined,
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
function EmployeesScreen({ requests, onNav, initialRoleFilter = 'All', adminAccess = {}, appEntity = null, onAddEmployee }) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState(initialRoleFilter);
  const [statusFilter, setStatusFilter] = useState('Active');

  const empList = useMemo(() => {
    return Object.entries(EMPLOYEES)
      .filter(([, emp]) => emp.isEmployee !== false && (!appEntity || emp.entityId === appEntity))
      .map(([id, emp]) => ({ id, ...emp }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [appEntity]);

  const filtered = useMemo(() => {
    return empList.filter(e => {
      const revoked = adminAccess && adminAccess[e.id] === 'revoked';
      if (roleFilter !== 'All' && (revoked || (e.role !== roleFilter && !(roleFilter === 'Admin' && adminAccess && e.id in adminAccess && !revoked)))) return false;
      if (statusFilter !== 'All' && e.status !== statusFilter) return false;
      if (search && !e.name.toLowerCase().includes(search.toLowerCase()) && !e.email.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [empList, search, roleFilter, statusFilter]);

  const selectStyle = { padding: '7px 28px 7px 10px', border: `1px solid ${P.border}`, borderRadius: 8, fontFamily: 'var(--font-body)', fontSize: 13, color: P.ink, background: P.white, cursor: 'pointer', outline: 'none', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', animation: `screenEnter 180ms ${EASE_OUT}` }}>
      <PageHeader title="Employees" subtitle="Overview" badge={appEntity ? (ENTITIES.find(e => e.id === appEntity)?.name) : null}>
        <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', border: `1px solid ${P.border}`, borderRadius: 8, background: P.white, color: P.ink, fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            <Icon name="Mail" size={14} /> Invite users
          </button>
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', border: `1px solid ${P.border}`, borderRadius: 8, background: P.white, color: P.ink, fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            <Icon name="Settings2" size={14} /> Bulk actions
          </button>
          <button onClick={onAddEmployee} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', border: 'none', borderRadius: 8, background: P.action, color: P.white, fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
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
    label: 'Auto-calculated',
    types: ['ADV / RTT'],
    editable: false,
    calculated: true,
  },
  {
    label: 'Set by you',
    types: ['Statutory annual leave', 'Extra-legal leave'],
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
    ['Statutory annual leave', 'Extra-legal leave'].reduce((acc, type) => {
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
    for (const type of ['Statutory annual leave', 'Extra-legal leave']) {
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
                const dot = getLvColor(type);
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
                    <div key={type} style={{ display: 'flex', alignItems: 'center', padding: '10px 22px', borderTop: ti > 0 ? `1px solid ${P.border}` : 'none', opacity: section.calculated ? 1 : 0.7 }}>
                      <span style={{ width: 9, height: 9, borderRadius: '50%', background: dot, flexShrink: 0, marginRight: 10 }} />
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: P.ink, flex: 1 }}>{type}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {section.calculated && <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: '#059669', background: '#ecfdf5', padding: '2px 6px', borderRadius: 4 }}>Auto</span>}
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, color: section.calculated ? P.ink : P.inkSoft }}>{displayVal ?? '—'}</span>
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
function EmployeeDetailScreen({ employeeId, requests, onNav, onSave, onCancel, onApprove, onDecline, onViewTeamCalendar, employeeBalance, onUpdateBalance, needsSetup, confirmedDate, onConfirmBalances, onToast, adminAccess, onAdminSave, companyRegime, onEmployeeUpdate, getEmpWithOverrides, initialTab = 'choices' }) {
  const emp = getEmpWithOverrides ? getEmpWithOverrides(employeeId) : EMPLOYEES[employeeId];
  const [activeTab, setActiveTab] = useState(initialTab);
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
      const defaultEntitled = type === 'Statutory annual leave' ? emp.entitlement : type === 'ADV / RTT' ? calcAdvDays(companyRegime || COMPANY_REGIME_DEFAULTS, emp) : type === 'Extra-legal leave' ? 4 : null;
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
    { id: 'salary', label: 'Compensation' },
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
                <Button variant="primary" icon="Plus" onClick={() => setAddModal('add')}>Add time off</Button>
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
                <EmptyState icon="calendar-off" title="No absences recorded yet" />
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
          <div><SalaryTab empId={employeeId} emp={emp} companyRegime={companyRegime || COMPANY_REGIME_DEFAULTS} onEmployeeUpdate={onEmployeeUpdate} /></div>
        ) : activeTab === 'details' ? (
          <div><DetailsTab emp={emp} empId={employeeId} onNav={onNav} adminAccess={adminAccess} onAdminSave={onAdminSave} companyRegime={companyRegime || COMPANY_REGIME_DEFAULTS} onEmployeeUpdate={onEmployeeUpdate} /></div>
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
        <ModalShell onClose={() => setDeactivateConfirm(false)} width={400}>
          {close => (
            <div style={{ padding: '28px 28px 24px' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Icon name="user-x" size={18} color="#dc2626" strokeWidth={1.75} />
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: P.ink, marginBottom: 6 }}>Deactivate {emp.name}?</div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkSoft, marginBottom: 24, lineHeight: 1.5 }}>
                {emp.name.split(' ')[0]} will lose access to Payflip immediately. Their data and history will be preserved.
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <Button variant="secondary" onClick={close} style={{ padding: '8px 16px', color: P.inkSoft }}>Cancel</Button>
                <Button variant="primary" onClick={() => { close(); onToast && onToast({ message: `${emp.name.split(' ')[0]} deactivated`, type: 'decline' }); }} style={{ padding: '8px 16px', background: '#dc2626' }}>
                  Deactivate
                </Button>
              </div>
            </div>
          )}
        </ModalShell>
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

function DashboardScreen({ requests, onNav, onToast, appEntity = null }) {
  const today = new Date(); today.setHours(0,0,0,0);
  return (
    <div style={{ flex: 1, overflow: 'auto', animation: `screenEnter 180ms ${EASE_OUT}` }}>
      <PageHeader
        title="Home"
        subtitle={today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        badge={appEntity ? (ENTITIES.find(e => e.id === appEntity)?.name) : null}
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
  const [val, setVal] = useState(initialVal);
  const [limitVal, setLimitVal] = useState(initialLimit != null ? String(initialLimit) : '');
  return (
    <ModalShell title={title} onClose={onClose}>
      {close => {
        const save = () => {
          const t = val.trim();
          if (!t) return;
          const n = parseFloat(limitVal);
          onSave(t, isNaN(n) ? null : n);
          close();
        };
        return (
          <>
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
                <Button variant="danger" onClick={() => { onDelete(); close(); }} style={{ marginRight: 'auto' }}>Delete</Button>
              )}
              <Button variant="secondary" onClick={close}>Cancel</Button>
              <Button variant="primary" onClick={save}>Save</Button>
            </div>
          </>
        );
      }}
    </ModalShell>
  );
}

function PickModal({ title, options, value, onSave, onClose, extraField }) {
  const [selected, setSelected] = useState(value);
  const [extraVal, setExtraVal] = useState(extraField ? String(extraField.defaultValue) : '');
  return (
    <ModalShell title={title} onClose={onClose}>
      {close => {
        const save = () => { const n = parseFloat(extraVal); onSave(selected, extraField && selected === extraField.forValue ? (isNaN(n) ? extraField.defaultValue : n) : undefined); close(); };
        return (
          <>
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
              <Button variant="secondary" onClick={close}>Cancel</Button>
              <Button variant="primary" onClick={save}>Save</Button>
            </div>
          </>
        );
      }}
    </ModalShell>
  );
}

function AmountModal({ title, label, value, onSave, onClose, nullable }) {
  const [val, setVal] = useState(value != null ? String(value) : '');
  return (
    <ModalShell title={title} onClose={onClose}>
      {close => {
        const save = () => { const n = parseFloat(val); onSave(isNaN(n) ? null : n); close(); };
        return (
          <>
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
              <Button variant="secondary" onClick={close}>Cancel</Button>
              <Button variant="primary" onClick={save}>Save</Button>
            </div>
          </>
        );
      }}
    </ModalShell>
  );
}

const ELIGIBILITY_OPTS = [
  { value: 'all',      label: 'All employees',      hint: 'Every employee in this entity is eligible' },
  { value: 'specific', label: 'Specific employees', hint: 'Assign individually from each employee\'s profile' },
];

const REIMBURSE_OPTS = [
  { value: 'payroll', label: 'With next payroll run', hint: 'Included in the monthly payroll processing' },
  { value: 'weekly',  label: 'Separate bank transfer', hint: 'Processed independently from the payroll cycle' },
  { value: 'manual',  label: 'Manual (on request)', hint: 'Finance triggers payment manually' },
];
const APPROVAL_OPTS = [
  { value: 'manager', label: 'Direct manager',   hint: 'Employee\'s line manager receives the request' },
  { value: 'finance', label: 'Finance approver', hint: 'Person assigned in Team & access' },
  { value: 'auto',    label: 'Auto-approve under threshold', hint: 'Expenses below the receipt threshold auto-approve' },
];

function AllowancesListPage({ allowances, onSaveAllowance, appEntity = null }) {
  const [allowanceModal, setAllowanceModal] = useState(null);

  if (allowanceModal) {
    const typeInfo = ALLOWANCE_TYPES.find(t => t.id === allowanceModal);
    const config = allowances.find(a => a.id === allowanceModal) || { id: allowanceModal, active: false, rate: null };
    return <AllowanceSettingsPage config={config} typeInfo={typeInfo} onSave={onSaveAllowance} onBack={() => setAllowanceModal(null)} backLabel="Allowances" appEntity={appEntity} />;
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', animation: `screenEnter 180ms ${EASE_OUT}` }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 32px', display: 'flex', flexDirection: 'column', gap: 32 }}>
        <div>
          {appEntity && <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 6, background: P.white, border: `1px solid ${P.border}`, fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: 11, color: P.inkSoft, marginBottom: 12 }}>{ENTITIES.find(e => e.id === appEntity)?.name}</span>}
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, color: P.ink, margin: 0, letterSpacing: '-0.02em' }}>Allowances</h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: P.inkSoft, margin: '4px 0 0' }}>Belgian flat-rate allowances — enable only what applies to your company</p>
        </div>
        <div>
          <div style={SL}>Allowance types</div>
          <SettingsCard>
            {ALLOWANCE_TYPES.map((type, i) => {
              const config = allowances.find(a => a.id === type.id) || { active: false, rate: null };
              const valueText = config.active
                ? (config.rate != null ? `€ ${config.rate % 1 === 0 ? config.rate.toFixed(0) : config.rate.toFixed(2)} / ${type.unit}` : 'Enabled')
                : 'Not enabled';
              return (
                <SettingsRow key={type.id}
                  onClick={() => setAllowanceModal(type.id)}
                  icon={type.icon}
                  label={type.name}
                  value={valueText}
                  valueColor={config.active ? P.inkSoft : P.inkFaint}
                  last={i === ALLOWANCE_TYPES.length - 1}
                />
              );
            })}
          </SettingsCard>
        </div>
      </div>
    </div>
  );
}

function ExpenseCategorySettings({ categories, onSave, appEntity = null }) {
  const [items, setItems] = useState(categories);
  const [catModal, setCatModal] = useState(null);
  const [settingModal, setSettingModal] = useState(null);
  const [reimburseCycle, setReimburseCycle] = useState('payroll');
  const [receiptThreshold, setReceiptThreshold] = useState(25);
  const [approvalRouting, setApprovalRouting] = useState('manager');

  const handleCatSave = (val, limit) => {
    const next = catModal.idx === 'new'
      ? [...items, { name: val, monthlyLimit: limit ?? null, budgetType: catModal.budgetType }]
      : items.map((c, i) => i === catModal.idx ? { ...c, name: val, monthlyLimit: limit ?? null } : c);
    setItems(next); onSave(next);
  };
  const handleCatDelete = () => {
    const next = items.filter((_, i) => i !== catModal.idx);
    setItems(next); onSave(next);
  };


  const cycleLabel = (REIMBURSE_OPTS.find(o => o.value === reimburseCycle) || {}).label || '';
  const approvalLabel = (APPROVAL_OPTS.find(o => o.value === approvalRouting) || {}).label || '';
  const thresholdLabel = receiptThreshold != null ? `€ ${receiptThreshold}` : 'No threshold';

  return (
    <>
    {catModal && (
      <CategoryModal
        title={catModal.idx === 'new' ? 'Add category' : 'Edit category'}
        initialVal={catModal.idx === 'new' ? '' : items[catModal.idx].name}
        initialLimit={catModal.idx === 'new' ? null : items[catModal.idx].monthlyLimit}
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
          <div>
            {appEntity && <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 6, background: P.white, border: `1px solid ${P.border}`, fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: 11, color: P.inkSoft, marginBottom: 12 }}>{ENTITIES.find(e => e.id === appEntity)?.name}</span>}
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, color: P.ink, margin: 0, letterSpacing: '-0.02em' }}>Expenses</h1>
          </div>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: P.inkSoft, margin: '4px 0 0' }}>Configure expense categories and reimbursement rules</p>
        </div>

        <div>
          <div style={SL}>Reimbursement</div>
          <SettingsCard>
            <SettingsRow onClick={() => setSettingModal('cycle')} label="Reimbursement cycle" value={cycleLabel} last />
          </SettingsCard>
        </div>

        <div>
          <div style={SL}>Receipt policy</div>
          <SettingsCard>
            <SettingsRow onClick={() => setSettingModal('threshold')} label="Require receipt above" value={thresholdLabel} last />
          </SettingsCard>
        </div>

        {EXPENSE_BUDGET_TYPES.map(bt => {
          const btItems = items.map((c, i) => ({ c, i })).filter(({ c }) => c.budgetType === bt.id);
          return (
            <div key={bt.id}>
              <div style={SL}>{bt.label}</div>
              <SettingsCard>
                {btItems.map(({ c: cat, i: idx }, pos) => (
                  <SettingsRow key={cat.name + idx}
                    onClick={() => setCatModal({ idx, budgetType: bt.id })}
                    icon={getCategoryIcon(cat.name)}
                    label={cat.name}
                    value={cat.monthlyLimit != null ? `€ ${cat.monthlyLimit} / mo` : 'No limit'}
                  />
                ))}
                <SettingsRow onClick={() => setCatModal({ idx: 'new', budgetType: bt.id })}
                  icon="plus" label="Add category" labelColor={P.inkSoft} trailing={null} last />
              </SettingsCard>
            </div>
          );
        })}

      </div>
    </div>
    </>
  );
}

function PersonPickerModal({ title, value, candidates, singleSelect, onSave, onClose, appEntity }) {
  const [selected, setSelected] = useState(singleSelect ? (value ? [value] : []) : (value || []));
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');

  const toggle = (key, close) => {
    if (singleSelect) { onSave(key); close(); return; }
    setSelected(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const pool = candidates || Object.entries(EMPLOYEES)
    .filter(([, e]) => e.adminAccess)
    .map(([key, e]) => ({ value: key, name: e.name, dept: e.department || (e.isEmployee === false ? 'External' : ''), entity: e.entity, initials: e.initials, color: e.color }));

  const depts = [...new Set(pool.map(e => e.dept).filter(Boolean))].sort();

  const filtered = pool.filter(e => {
    const matchesDept = deptFilter === 'all' || e.dept === deptFilter;
    const matchesSearch = !search || e.name.toLowerCase().includes(search.toLowerCase()) || (e.dept || '').toLowerCase().includes(search.toLowerCase());
    return matchesDept && matchesSearch;
  });

  return (
    <ModalShell title={title} onClose={onClose} width={480} maxHeight="70vh">
      {close => {
        const save = () => { onSave(selected); close(); };
        return (
          <>
        {/* Search + department filter */}
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${P.border}`, display: 'flex', gap: 8, flexShrink: 0 }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 5, border: `1px solid ${P.border}`, borderRadius: 7, padding: '8px 11px', background: P.white }}>
            <Icon name="search" size={12} color={P.inkFaint} strokeWidth={2} />
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employees"
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', padding: 0, fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 12, color: P.ink, lineHeight: 1 }} />
            {search && (
              <button onClick={() => setSearch('')} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                <Icon name="x" size={10} color={P.inkFaint} strokeWidth={2.5} />
              </button>
            )}
          </div>
          {depts.length > 1 && (
            <FilterDropdown
              label="All departments"
              active={deptFilter}
              opts={[['all', 'All departments'], ...depts.map(d => [d, d])]}
              onSelect={setDeptFilter}
            />
          )}
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {filtered.map(emp => {
            const on = selected.includes(emp.value);
            const subtitle = appEntity ? emp.dept : [emp.dept, emp.entity].filter(Boolean).join(' · ');
            return (
              <div key={emp.value} onClick={() => toggle(emp.value, close)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px', cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(15,13,40,0.04)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: emp.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 9, color: P.ink }}>{emp.initials}</span>
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'baseline', gap: 5 }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.ink }}>{emp.name}</span>
                  {subtitle && <>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: P.inkFaint }}>·</span>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: P.inkSoft }}>{subtitle}</span>
                  </>}
                </div>
                {singleSelect
                  ? <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${on ? P.action : P.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: `border-color 120ms` }}>
                      {on && <div style={{ width: 8, height: 8, borderRadius: '50%', background: P.action }} />}
                    </div>
                  : <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${on ? P.action : P.border}`, background: on ? P.action : P.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: `background 120ms, border-color 120ms` }}>
                      {on && <Icon name="check" size={11} color="#fff" strokeWidth={3} />}
                    </div>
                }
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ padding: '20px 10px', fontFamily: 'var(--font-body)', fontSize: 14, color: P.inkSoft, textAlign: 'center' }}>No results</div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 22px', borderTop: `1px solid ${P.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          {!singleSelect
            ? <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: selected.length > 0 ? P.ink : P.inkSoft }}>
                {selected.length > 0 ? `${selected.length} selected` : 'None selected'}
              </span>
            : <span />
          }
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="secondary" onClick={close}>Cancel</Button>
            {!singleSelect && <Button variant="primary" onClick={save}>Confirm</Button>}
          </div>
        </div>
          </>
        );
      }}
    </ModalShell>
  );
}

const ROLE_DEFS = [
  { key: 'finance-approver', label: 'Finance approver', icon: 'banknote',    hint: 'Reviews and approves expense submissions' },
  { key: 'hr-manager',       label: 'HR manager',       icon: 'user-check',  hint: 'Manages time off requests and employee records' },
  { key: 'payroll-admin',    label: 'Payroll admin',    icon: 'calculator',  hint: 'Processes payroll and views salary data' },
];

const ADMIN_ACCESS = [
  { value: 'full',    label: 'Full admin',  hint: 'Can access and configure everything in the tool' },
  { value: 'limited', label: 'Role-based',  hint: 'Access is limited to their assigned roles' },
];

const ADMIN_AREAS = [
  { value: 'time-off',  label: 'Time off',  hint: 'Approve and manage time off requests' },
  { value: 'expenses',  label: 'Expenses',  hint: 'Review and approve expense submissions' },
  { value: 'payroll',   label: 'Payroll',   hint: 'Process payroll and view salary data' },
];

function AdminAccessModal({ admin, access, onSave, onClose }) {
  const [step, setStep] = useState(Array.isArray(access) ? 2 : 1);
  const [selectedAreas, setSelectedAreas] = useState(Array.isArray(access) ? access : []);

  const AREA_LABELS = { 'time-off': 'Time off', 'expenses': 'Expenses', 'payroll': 'Payroll' };
  const SLIDE_DUR = 300;
  const onStep2 = step === 2;
  const step1Slide = onStep2 ? 'translateX(-100%)' : 'translateX(0)';
  const step2Slide = onStep2 ? 'translateX(0)' : 'translateX(100%)';
  const slideTransition = `transform ${SLIDE_DUR}ms ${EASE_DRAWER}`;

  const toggleArea = (value) => {
    setSelectedAreas(prev => prev.includes(value) ? prev.filter(a => a !== value) : [...prev, value]);
  };

  const headerAvatarAndName = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <Avatar employeeId={admin.id} size={36} />
      <div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: P.ink }}>{admin.name}</div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: P.inkSoft }}>{admin.email}</div>
      </div>
    </div>
  );

  return (
    <ModalShell onClose={onClose}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {step === 2 && <IconButton icon="chevron-left" onClick={() => setStep(1)} size={28} />}
          {headerAvatarAndName}
        </div>
      }
      footer={close => (
        <div style={{ padding: '12px 22px 16px', borderTop: `1px solid ${P.border}`, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="secondary" onClick={close}>Cancel</Button>
          {step === 2 && (
            <Button variant="primary" disabled={selectedAreas.length === 0}
              onClick={() => { if (selectedAreas.length > 0) { onSave(selectedAreas); close(); } }}
              style={{ background: selectedAreas.length > 0 ? P.action : P.border, color: selectedAreas.length > 0 ? '#fff' : P.inkSoft }}>
              Save
            </Button>
          )}
        </div>
      )}>
      {close => (
        <>
        {/* Sliding content area — height morphs between step 1 and step 2 natural heights */}
        <div style={{ position: 'relative', overflow: 'hidden', height: onStep2 ? 180 : 132, transition: `height ${SLIDE_DUR}ms ${EASE_DRAWER}` }}>

          {/* Step 1: access type */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, transform: step1Slide, transition: slideTransition }}>
            <div style={{ padding: '8px 14px 4px' }}>
              <div onClick={() => { onSave('full'); close(); }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 10px', cursor: 'pointer', borderRadius: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: P.ink, fontWeight: 500 }}>Full admin</div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkSoft }}>Full access to all settings, tools, and approvals</div>
                </div>
                <Icon name="chevron-right" size={16} color={P.inkFaint} strokeWidth={1.75} style={{ flexShrink: 0 }} />
              </div>
              <div onClick={() => setStep(2)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 10px', cursor: 'pointer', borderRadius: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: P.ink, fontWeight: 500 }}>Custom access</div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkSoft }}>
                    {Array.isArray(access) && access.length > 0
                      ? access.map(a => AREA_LABELS[a] || a).join(' · ')
                      : 'Select which areas to manage'}
                  </div>
                </div>
                <Icon name="chevron-right" size={16} color={P.inkFaint} strokeWidth={1.75} style={{ flexShrink: 0 }} />
              </div>
            </div>
          </div>

          {/* Step 2: area checkboxes */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, transform: step2Slide, transition: slideTransition }}>
            <div style={{ padding: '8px 14px 4px' }}>
              {ADMIN_AREAS.map(area => {
                const checked = selectedAreas.includes(area.value);
                return (
                  <div key={area.value} onClick={() => toggleArea(area.value)}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 10px', cursor: 'pointer', borderRadius: 8 }}>
                    <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${checked ? P.action : P.border}`, background: checked ? P.action : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'border-color 120ms ease, background 120ms ease', marginTop: 2 }}>
                      {checked && <Icon name="check" size={10} color="#fff" strokeWidth={3} />}
                    </div>
                    <div>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: P.ink, fontWeight: 500 }}>{area.label}</div>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkSoft }}>{area.hint}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        </>
      )}
    </ModalShell>
  );
}


// ── In-page entity switcher ───────────────────────────────────────────────
// Ghost trigger button + searchable modal. Resets on page navigation.
function EntityPickerModal({ value, onChange, onClose }) {
  const [search, setSearch] = useState('');

  const filtered = ENTITIES.filter(e =>
    !search.trim() || e.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <ModalShell title="Switch entity" onClose={onClose} width={400} maxHeight={560}>
      {close => {
        const pick = (id) => { onChange(id); close(); };
        return (
          <>
        <div style={{ padding: '10px 12px 6px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: `1px solid ${P.border}`, borderRadius: 8, padding: '7px 10px', background: P.bg }}>
            <Icon name="search" size={14} color={P.inkFaint} strokeWidth={1.75} />
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search entities…"
              style={{ border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--font-body)', fontSize: 13, color: P.ink, flex: 1 }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                <Icon name="X" size={13} color={P.inkFaint} strokeWidth={2} />
              </button>
            )}
          </div>
        </div>

        <div style={{ overflowY: 'auto', padding: '4px 8px 8px' }}>
          <button onClick={() => pick(null)} style={{
            display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 12px',
            border: 'none', borderRadius: 8,
            background: !value ? '#f3f0ff' : 'transparent', cursor: 'pointer', textAlign: 'left', marginBottom: 2,
          }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: !value ? '#e9d5ff' : P.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name="building-2" size={15} color={!value ? P.action : P.inkSoft} strokeWidth={1.75} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: !value ? P.action : P.ink }}>Company defaults</div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: P.inkSoft }}>All entities inherit these settings</div>
            </div>
            {!value && <Icon name="check" size={15} color={P.action} strokeWidth={2.5} />}
          </button>

          {filtered.length > 0 && <div style={{ height: 1, background: P.border, margin: '4px 4px 6px' }} />}

          {filtered.map(ent => (
            <button key={ent.id} onClick={() => pick(ent.id)} style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 12px',
              border: 'none', borderRadius: 8,
              background: value === ent.id ? '#f3f0ff' : 'transparent', cursor: 'pointer', textAlign: 'left',
            }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: value === ent.id ? '#e9d5ff' : P.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name="map-pin" size={15} color={value === ent.id ? P.action : P.inkSoft} strokeWidth={1.75} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: value === ent.id ? P.action : P.ink }}>{ent.name}</div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: P.inkSoft }}>{ent.country} · {ent.employeeCount} employees</div>
              </div>
              {value === ent.id && <Icon name="check" size={15} color={P.action} strokeWidth={2.5} />}
            </button>
          ))}

          {filtered.length === 0 && (
            <div style={{ padding: '24px 12px', textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkSoft }}>
              No entities matching "{search}"
            </div>
          )}
        </div>
          </>
        );
      }}
    </ModalShell>
  );
}

function EntityPageSwitcher({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const selected = value ? ENTITIES.find(e => e.id === value) : null;

  return (
    <React.Fragment>
      <button onClick={() => setOpen(true)} style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '7px 14px 7px 12px',
        border: `1px solid ${P.border}`,
        borderRadius: 8,
        background: P.white,
        cursor: 'pointer',
        fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: 13,
        color: P.ink,
      }}>
        <Icon name={selected ? 'map-pin' : 'building-2'} size={13} color={P.inkSoft} strokeWidth={1.75} />
        {selected ? selected.name : 'Company defaults'}
        <Icon name="chevrons-up-down" size={12} color={P.inkFaint} strokeWidth={1.75} />
      </button>

      {open && <EntityPickerModal value={value} onChange={onChange} onClose={() => setOpen(false)} />}
    </React.Fragment>
  );
}

function TeamAccessSettings({ onNav, adminAccess, onAdminSave, appEntity = null }) {
  const admins = useMemo(() =>
    Object.entries(EMPLOYEES)
      .filter(([id, u]) => adminAccess[id] !== 'revoked' && (u.role === 'Admin' || u.isEmployee === false || id in adminAccess))
      .filter(([, u]) => !appEntity || u.entityId === appEntity)
      .map(([id, u]) => ({ id, name: u.name, initials: u.initials, color: u.color, email: u.email, access: id in adminAccess ? adminAccess[id] : (u.adminAccess || null) })),
    [adminAccess, appEntity]
  );

  const [adminModal, setAdminModal] = useState(null);

  const AREA_LABELS = { 'time-off': 'Time off', 'expenses': 'Expenses', 'payroll': 'Payroll' };

  return (
    <>
    {adminModal && (() => { const admin = admins.find(a => a.id === adminModal); return admin ? (
      <AdminAccessModal
        admin={admin}
        access={admin.access}
        onSave={newAccess => { onAdminSave(adminModal, newAccess); setAdminModal(null); }}
        onClose={() => setAdminModal(null)}
      />
    ) : null; })()}

    <div style={{ flex: 1, overflow: 'auto', animation: `screenEnter 180ms ${EASE_OUT}` }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 32px', display: 'flex', flexDirection: 'column', gap: 32 }}>

        <div>
          <div>
            {appEntity && <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 6, background: P.white, border: `1px solid ${P.border}`, fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: 11, color: P.inkSoft, marginBottom: 24 }}>{ENTITIES.find(e => e.id === appEntity)?.name}</span>}
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: P.ink, margin: 0, letterSpacing: '-0.02em' }}>Team & access</h1>
          </div>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkSoft, margin: '4px 0 0' }}>Configure access levels for your admin team</p>
        </div>

        <div>
          <div style={SL}>Administrators</div>
          <SettingsCard>
            {admins.map((admin, idx) => {
              const areas = Array.isArray(admin.access) ? admin.access : null;
              const badge = admin.access === 'full'
                ? { label: 'Full admin', filled: true }
                : areas && areas.length > 0
                  ? { label: areas.map(a => AREA_LABELS[a] || a).join(' · '), filled: false }
                  : null;
              return (
                <SettingsRow key={admin.id}
                  onClick={() => setAdminModal(admin.id)}
                  leading={<Avatar employeeId={admin.id} size={32} />}
                  label={admin.name}
                  subtitle={admin.email}
                  last={idx === admins.length - 1}
                  trailing={<>
                    {badge
                      ? <DotPill dot={false} filled={badge.filled} color={badge.filled ? P.action : P.inkSoft} bg={P.bg} border={badge.filled ? null : P.border} padding="3px 10px" whiteSpace="nowrap">{badge.label}</DotPill>
                      : <span style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 12, color: P.inkFaint, whiteSpace: 'nowrap', flexShrink: 0 }}>No access</span>
                    }
                    <Icon name="chevron-right" size={16} color={P.inkFaint} strokeWidth={1.75} style={{ flexShrink: 0, marginLeft: 16 }} />
                  </>}
                />
              );
            })}
          </SettingsCard>
          <div style={{ marginTop: 10 }}>
            <span onClick={() => onNav('employees:admin')} style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.ink, textDecoration: 'underline', cursor: 'pointer' }}>Manage admin roles in People</span>
          </div>
        </div>

      </div>
    </div>
    </>
  );
}

const TIMEOFF_APPROVAL_OPTS = [
  { value: 'manager', label: 'Direct manager', hint: "Employee's line manager receives the request" },
  { value: 'hr',      label: 'HR manager',     hint: 'Person assigned in Team & access' },
  { value: 'auto',    label: 'Auto-approve',   hint: 'Requests under 3 days are approved automatically' },
];
const BENEFIT_TYPES_SEED = [
  { id: 'home-office', label: 'Home office',              icon: 'monitor',         hint: 'Equipment and furniture for remote work',                              active: true,  requiresApproval: true,  receiptRequired: true,  budgetCap: 500  },
  { id: 'learning',    label: 'Learning & Development',   icon: 'graduation-cap',  hint: 'Courses, books, conferences, and training',                            active: true,  requiresApproval: true,  receiptRequired: true,  budgetCap: null },
  { id: 'mobility',    label: 'Mobility',                 icon: 'bike',            hint: 'Bike lease, public transit, and commuting costs',                      active: true,  requiresApproval: true,  receiptRequired: false, budgetCap: null },
  { id: 'pension',     label: 'Pension savings',          icon: 'piggy-bank',      hint: 'Individual pension savings (fiscale pensioensparen) — capped by law',  active: true,  requiresApproval: false, receiptRequired: false, budgetCap: 990  },
  { id: 'meal',        label: 'Meal vouchers',            icon: 'utensils',        hint: 'Daily meal contribution via Payflip card — up to €8 / day',            active: true,  requiresApproval: false, receiptRequired: false, budgetCap: null },
];

const ENTITLEMENT_OPTS = [
  { value: 'legal',   label: 'Legal minimum',    hint: 'Belgian statutory: 20 days for full-time, prorated for part-time' },
  { value: 'company', label: 'Company policy',   hint: 'Set a custom entitlement above the legal minimum' },
];
const LEAVE_TYPE_AUDIT = {
  'Statutory annual leave': { by: 'Jana Goossens',    at: '3 Feb 2026'  },
  'ADV / RTT':              { by: 'Bruno Coen',       at: '8 Aug 2026'  },
  'Extra-legal leave':      { by: 'Jana Goossens',    at: '12 Mar 2026' },
  'Sick leave':             { by: 'Thomas Janssens',  at: '15 Jan 2026' },
  'Paternity leave':        { by: 'Jana Goossens',    at: '2 Jan 2026'  },
  'Maternity leave':        { by: 'Jana Goossens',    at: '2 Jan 2026'  },
  'Wedding':                { by: 'Bruno Coen',       at: '10 May 2026' },
  'Funeral leave':          { by: 'Jana Goossens',    at: '3 Feb 2026'  },
  'Ceremony':               { by: 'Jana Goossens',    at: '3 Feb 2026'  },
  'Civic duty':             { by: 'Thomas Janssens',  at: '18 Mar 2026' },
  'Moving':                 { by: 'Bruno Coen',       at: '20 Jun 2026' },
};

const LEAVE_TYPE_EXCEPTIONS = {
  'Statutory annual leave': [
    { empId: 'emma-martens',   value: '25 days' },
    { empId: 'stijn-laurent',  value: '29 days' },
    { empId: 'noor-de-smedt',  value: '16 days' },
    { empId: 'ruben-declercq', value: '25 days' },
  ],
};

const CARRYOVER_OPTS = [
  { value: 'q1',        label: 'Carry over until 31 March', hint: 'Unused days must be taken before 31 March of the following year (Belgian statutory requirement)' },
  { value: 'forfeit',   label: 'No carry-over',          hint: 'Unused days are forfeited at year end' },
  { value: 'cap',       label: 'Limited carry-over',       hint: 'Set a maximum number of days that roll over to January' },
  { value: 'unlimited', label: 'Carry over all unused',   hint: 'All remaining days roll over' },
  { value: 'payout',    label: 'Pay out unused days',     hint: 'Remaining balance is included in the last payroll of the year' },
];
const DEFAULT_LEAVE_CONFIGS = {
  'Statutory annual leave':      { requiresApproval: true,  declaration: false, docRequired: false, maxDays: 20,   editRequiresApproval: false, cancelRequiresApproval: false, carryover: 'q1',      allowHalfDay: true,  docThresholdDays: 0 },
  'ADV / RTT':                   { requiresApproval: true,  declaration: false, docRequired: false, maxDays: null, editRequiresApproval: false, cancelRequiresApproval: false, carryover: 'forfeit', allowHalfDay: true,  docThresholdDays: 0, advAwardMethod: 'accrued' },
  'Extra-legal leave':           { requiresApproval: true,  declaration: false, docRequired: false, maxDays: null, editRequiresApproval: false, cancelRequiresApproval: false, carryover: 'forfeit', allowHalfDay: true,  docThresholdDays: 0 },
  'Sick leave':                  { requiresApproval: false, declaration: true,  docRequired: true,  maxDays: null, editRequiresApproval: false, cancelRequiresApproval: false, carryover: null,      allowHalfDay: false, docThresholdDays: 2 },
  'Paternity leave':                 { requiresApproval: false, declaration: false, adminOnly: true, docRequired: false, maxDays: null, editRequiresApproval: false, cancelRequiresApproval: false, carryover: null, allowHalfDay: false, docThresholdDays: 0 },
  'Maternity leave':             { requiresApproval: false, declaration: false, adminOnly: true, docRequired: false, maxDays: null, editRequiresApproval: false, cancelRequiresApproval: false, carryover: null, allowHalfDay: false, docThresholdDays: 0 },
  'Wedding':                     { requiresApproval: false, declaration: false, docRequired: false, maxDays: null, editRequiresApproval: false, cancelRequiresApproval: false, carryover: null, allowHalfDay: false, docThresholdDays: 0 },
  'Funeral leave':               { requiresApproval: false, declaration: false, docRequired: false, maxDays: null, editRequiresApproval: false, cancelRequiresApproval: false, carryover: null, allowHalfDay: false, docThresholdDays: 0 },
  'Ceremony':                    { requiresApproval: false, declaration: false, docRequired: false, maxDays: null, editRequiresApproval: false, cancelRequiresApproval: false, carryover: null, allowHalfDay: false, docThresholdDays: 0 },
  'Civic duty':                  { requiresApproval: false, declaration: false, docRequired: true,  maxDays: null, editRequiresApproval: false, cancelRequiresApproval: false, carryover: null, allowHalfDay: false, docThresholdDays: 0 },
  'Moving':                      { requiresApproval: false, declaration: false, docRequired: false, maxDays: 1,    editRequiresApproval: false, cancelRequiresApproval: false, carryover: 'forfeit', allowHalfDay: true, docThresholdDays: 0 },
};

const LEAVE_COLOR_VALUES = Object.values(LEAVE_COLORS);
const EXTRA_PALETTE_COLORS = [
  '#fee2e2', '#ffedd5', '#fef9c3', '#dcfce7',
  '#ccfbf1', '#e0f2fe', '#e0e7ff', '#f3e8ff',
  '#fce7f3', '#f1f5f9', '#d1d5db', '#ecfccb',
];
const LEAVE_COLOR_ENTRIES = Object.entries(LEAVE_COLORS);

function AllowanceSettingsPage({ config, typeInfo, onSave, onBack, backLabel = 'Expenses', appEntity = null }) {
  const [active, setActive] = useState(config.active);
  const [rate, setRate] = useState(config.rate != null ? String(config.rate) : (typeInfo.defaultRate != null ? String(typeInfo.defaultRate) : ''));
  const [specific, setSpecific] = useState((config.eligibility || 'all') === 'specific');
  const [assignedEmployees, setAssignedEmployees] = useState(config.assignedEmployees || []);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [minKm, setMinKm] = useState(config.minKm != null ? String(config.minKm) : '');
  const [minHours, setMinHours] = useState(config.minHours != null ? String(config.minHours) : '');

  const card = { border: `1px solid ${P.border}`, borderRadius: 16, overflow: 'clip', background: P.white };
  const settingsRowStyle = (last) => ({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '16px 20px', borderBottom: last ? 'none' : `1px solid ${P.border}` });

  const rateNum = parseFloat(rate);
  const rateValid = !isNaN(rateNum) && rateNum > 0;
  const overCeiling = typeInfo.nsssCeiling && rateValid && rateNum > typeInfo.nsssCeiling;
  const rateDiffersFromDefault = typeInfo.defaultRate != null && rateValid && Math.abs(rateNum - typeInfo.defaultRate) > 0.0001;

  const submissionLines = {
    mileage: ['Employees submit trips from their expense screen — origin, destination and kilometres.', 'Approved amounts are added to the next payroll run. No receipt required.'],
    auto:    ['Added automatically to the payslip each month. Employees don\'t submit anything.', 'Pro-rata applies for partial months based on start date, end date, and unpaid leave.'],
    daily:   ['Employees mark the days they worked away from their usual location.', 'Approved days are reimbursed in the next payroll run. No receipt required.'],
  }[typeInfo.submissionType];

  const handleSave = () => {
    onSave({
      id: typeInfo.id, active, rate: rateValid ? rateNum : null,
      eligibility: specific ? 'specific' : 'all',
      assignedEmployees: specific ? assignedEmployees : [],
      minKm: typeInfo.id === 'mileage' && minKm !== '' ? parseFloat(minKm) : undefined,
      minHours: typeInfo.id === 'meal-allowance' && minHours !== '' ? parseFloat(minHours) : undefined,
    });
    onBack();
  };

  const tabsRef = useRef(null);
  useLayoutEffect(() => {
    const bar = tabsRef.current;
    if (!bar) return;
    const pill = bar.querySelector('.t-tabs-pill');
    const activeTab = bar.querySelector('[aria-selected="true"]');
    if (!pill || !activeTab) return;
    if (!pill.style.width) {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const b = tabsRef.current;
        if (!b) return;
        const p = b.querySelector('.t-tabs-pill');
        const t = b.querySelector('[aria-selected="true"]');
        if (!p || !t) return;
        p.style.transition = 'none';
        p.style.transform = `translateX(${t.offsetLeft}px)`;
        p.style.width = `${t.offsetWidth}px`;
        void p.offsetWidth;
        p.style.transition = '';
      }));
    } else {
      pill.style.transform = `translateX(${activeTab.offsetLeft}px)`;
      pill.style.width = `${activeTab.offsetWidth}px`;
    }
  }, [specific, active]);

  const allCandidates = Object.entries(EMPLOYEES)
    .filter(([, e]) => e.isEmployee !== false && (!appEntity || e.entityId === appEntity))
    .map(([id, e]) => ({ value: id, name: e.name, dept: e.department, entity: e.entity, initials: e.initials, color: e.color }));

  return (
    <>
    {pickerOpen && (
      <PersonPickerModal
        title="Assign employees"
        value={assignedEmployees}
        candidates={allCandidates}
        singleSelect={false}
        onSave={ids => setAssignedEmployees(ids)}
        onClose={() => setPickerOpen(false)}
        appEntity={appEntity}
      />
    )}
    <div style={{ flex: 1, overflow: 'auto', animation: `screenEnter 180ms ${EASE_OUT}` }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 32px 80px', display: 'flex', flexDirection: 'column', gap: 32 }}>

        <button onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: P.inkSoft, alignSelf: 'flex-start' }}>
          <Icon name="chevron-left" size={14} color={P.inkSoft} strokeWidth={2.5} />
          {backLabel}
        </button>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, color: P.ink, margin: 0, letterSpacing: '-0.02em' }}>{typeInfo.name}</h1>
            <button onClick={() => setInfoOpen(true)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center', color: P.inkFaint, flexShrink: 0, marginTop: 4 }}>
              <Icon name="info" size={16} color={P.inkFaint} strokeWidth={1.75} />
            </button>
          </div>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: P.inkSoft, margin: 0 }}>{typeInfo.description}</p>
        </div>

        {/* Status */}
        <div>
          <div style={SL}>Status</div>
          <div style={card}>
            <div style={settingsRowStyle(true)}>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 14, color: P.ink }}>Enable {typeInfo.name.toLowerCase()} allowance</div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkSoft, marginTop: 3 }}>Make this allowance available to eligible employees</div>
              </div>
              <Switch size="sm" checked={active} onChange={() => setActive(v => !v)} />
            </div>
          </div>
        </div>

        {active && (<>

          {/* Rate */}
          <div style={{ animation: PREFERS_REDUCED_MOTION ? 'none' : `screenEnter 150ms ${EASE_OUT}` }}>
            <div style={SL}>{typeInfo.rateLabel}</div>
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '14px 20px' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 14, color: P.ink }}>Amount per {typeInfo.unit}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkSoft }}>€</span>
                  <input type="number" step="0.01" min="0" value={rate} onChange={e => setRate(e.target.value)}
                    style={{ width: 90, padding: '7px 10px', borderRadius: 8, border: `1px solid ${overCeiling ? '#fca5a5' : P.border}`, fontFamily: 'var(--font-body)', fontSize: 14, color: P.ink, outline: 'none', textAlign: 'right', background: overCeiling ? '#fff5f5' : P.white }} />
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkSoft }}>/ {typeInfo.unit}</span>
                </div>
              </div>
            </div>
            {overCeiling ? (
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'flex-start', gap: 9, padding: '10px 14px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca' }}>
                <Icon name="triangle-alert" size={13} color="#dc2626" strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: '#dc2626', lineHeight: 1.5 }}>Exceeds the NSSS ceiling of €{typeInfo.nsssCeiling}/{typeInfo.unit}. The excess is subject to social contributions and personal income tax.</span>
              </div>
            ) : (() => {
              // The field above already shows the rate — restating "the official rate is €X"
              // is redundant unless the admin has actually changed it away from default.
              const restatesCurrentValue = !typeInfo.nsssCeiling && typeInfo.defaultRate != null && !rateDiffersFromDefault;
              const noteText = restatesCurrentValue
                ? (typeInfo.id === 'mileage' ? 'This rate is not updated automatically — check the NSSS website each January.' : null)
                : (typeInfo.nsssNote || 'No NSSS ceiling — set any amount.') + (typeInfo.id === 'mileage' ? ' This rate is not updated automatically — check the NSSS website each January.' : '');
              if (!noteText && !(rateDiffersFromDefault && typeInfo.defaultRate)) return null;
              return (
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  {noteText && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                      <Icon name="info" size={13} color={P.inkSoft} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: P.inkSoft, lineHeight: 1.5 }}>{noteText}</span>
                    </div>
                  )}
                  {rateDiffersFromDefault && typeInfo.defaultRate && (
                    <button onClick={() => setRate(String(typeInfo.defaultRate))}
                      style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 12, color: P.action, whiteSpace: 'nowrap', padding: 0, flexShrink: 0 }}>
                      Reset to €{typeInfo.defaultRate}
                    </button>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Mileage-specific */}
          {typeInfo.id === 'mileage' && (
            <div style={{ animation: PREFERS_REDUCED_MOTION ? 'none' : `screenEnter 150ms ${EASE_OUT}` }}>
              <div style={SL}>Trip rules</div>
              <div style={card}>
                <div style={settingsRowStyle(true)}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 14, color: P.ink }}>Minimum km per trip</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input type="number" step="1" min="0" value={minKm} onChange={e => setMinKm(e.target.value)} placeholder="0"
                      style={{ width: 72, padding: '7px 10px', borderRadius: 8, border: `1px solid ${P.border}`, fontFamily: 'var(--font-body)', fontSize: 14, color: P.ink, outline: 'none', textAlign: 'right' }} />
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkSoft }}>km</span>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                <Icon name="info" size={13} color={P.inkSoft} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: P.inkSoft }}>Trips below the minimum are rejected automatically. Leave blank to accept all distances.</span>
              </div>
            </div>
          )}

          {/* Meal allowance-specific */}
          {typeInfo.id === 'meal-allowance' && (
            <div style={{ animation: PREFERS_REDUCED_MOTION ? 'none' : `screenEnter 150ms ${EASE_OUT}` }}>
              <div style={SL}>Eligibility rules</div>
              <div style={card}>
                <div style={settingsRowStyle(true)}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 14, color: P.ink }}>Minimum hours away from office</div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkSoft, marginTop: 3 }}>Only reimburse if employee is away for at least this many hours</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input type="number" step="0.5" min="0" value={minHours} onChange={e => setMinHours(e.target.value)} placeholder="—"
                      style={{ width: 72, padding: '7px 10px', borderRadius: 8, border: `1px solid ${P.border}`, fontFamily: 'var(--font-body)', fontSize: 14, color: P.ink, outline: 'none', textAlign: 'right' }} />
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkSoft }}>hrs</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Eligibility */}
          <div style={{ animation: PREFERS_REDUCED_MOTION ? 'none' : `screenEnter 150ms ${EASE_OUT}` }}>
            <div style={SL}>Eligibility</div>
            <div style={card}>
              <div style={{ padding: '14px 20px', borderBottom: specific ? `1px solid ${P.border}` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 14, color: P.ink }}>Eligible employees</span>
                <div className="t-tabs" ref={tabsRef}>
                  <span className="t-tabs-pill" aria-hidden="true" />
                  {[{ value: false, label: 'All employees' }, { value: true, label: 'Specific employees' }].map(opt => (
                    <button key={String(opt.value)} className="t-tab"
                      role="tab" aria-selected={String(specific === opt.value)}
                      onClick={() => setSpecific(opt.value)}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Revealed content — scoped to the selected entity; "All entities" shows every assignment */}
              <div style={{ display: 'grid', gridTemplateRows: '1fr', transition: PREFERS_REDUCED_MOTION ? 'none' : `grid-template-rows 220ms ${EASE_OUT}`, overflow: 'hidden' }}>
                <div style={{ minHeight: 0 }}>
                  {!specific ? (() => {
                    const allCount = Object.values(EMPLOYEES).filter(e => e.isEmployee !== false && (!appEntity || e.entityId === appEntity)).length;
                    return (
                      <EmptyState icon="users" title="Applies to all employees"
                        description={`Currently ${allCount} employee${allCount === 1 ? '' : 's'}${appEntity ? '' : ' across all entities'} — including anyone hired later.`} />
                    );
                  })() : (() => {
                    const visibleAssigned = assignedEmployees.filter(id => {
                      const emp = EMPLOYEES[id];
                      return emp && (!appEntity || emp.entityId === appEntity);
                    });
                    return <>
                  {/* Truly empty — this allowance currently applies to nobody, not just "nobody visible here" */}
                  {assignedEmployees.length === 0 ? (
                    <EmptyState icon="users" title="No employees assigned"
                      description="This allowance won't apply to anyone until you add at least one."
                      action={<Button variant="primary" icon="plus" onClick={() => setPickerOpen(true)}>Add employees</Button>} />
                  ) : (
                    /* List header: count + edit action */
                    <div style={{ padding: '9px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${P.border}` }}>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 500, color: P.inkSoft }}>
                        {visibleAssigned.length === 0 ? 'No employees in this entity' : `${visibleAssigned.length} employee${visibleAssigned.length === 1 ? '' : 's'}`}
                      </span>
                      <Button variant="text" icon="pencil" iconSize={12} onClick={() => setPickerOpen(true)} style={{ color: P.inkSoft, fontSize: 12 }}>Edit selection</Button>
                    </div>
                  )}
                  {visibleAssigned.map((id, i) => {
                    const emp = EMPLOYEES[id];
                    const subtitle = appEntity ? emp.department : [emp.department, emp.entity].filter(Boolean).join(' · ');
                    return (
                      <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px' }}>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: emp.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 9, color: P.ink }}>{emp.initials}</span>
                        </div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'baseline', gap: 5 }}>
                          <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.ink }}>{emp.name}</span>
                          {subtitle && <>
                            <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: P.inkFaint }}>·</span>
                            <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: P.inkSoft }}>{subtitle}</span>
                          </>}
                        </div>
                        <IconButton icon="x" size={26} iconSize={13} color={P.inkSoft} danger onClick={() => setAssignedEmployees(prev => prev.filter(e => e !== id))} />
                      </div>
                    );
                  })}
                  </>;
                  })()}
                </div>
              </div>
            </div>
          </div>

        </>)}


        {/* Footer */}
        <div style={{ borderTop: `1px solid ${P.border}`, paddingTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          {active ? (
            <>
              <Button variant="secondary" onClick={onBack} style={{ background: P.white }}>Cancel</Button>
              <Button variant="primary" onClick={handleSave} disabled={specific && assignedEmployees.length === 0}>Save changes</Button>
            </>
          ) : (
            <Button variant="secondary" onClick={onBack} style={{ background: P.white }}>Cancel</Button>
          )}
        </div>

      </div>
    </div>

    {/* How it works modal */}
    {infoOpen && (
      <div onClick={() => setInfoOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(15,13,40,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div onClick={e => e.stopPropagation()} style={{ background: P.white, borderRadius: 16, width: 420, boxShadow: '0 8px 40px rgba(15,13,40,0.18)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: `1px solid ${P.border}` }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: P.ink }}>How it works</span>
            <button onClick={() => setInfoOpen(false)} style={{ border: 'none', cursor: 'pointer', width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(60,60,67,0.1)' }}>
              <Icon name="X" size={13} color={P.ink} strokeWidth={2.5} />
            </button>
          </div>
          <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(submissionLines || []).map((line, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: P.inkFaint, flexShrink: 0, marginTop: 7 }} />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: P.inkSoft, lineHeight: 1.6 }}>{line}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )}
    </>
  );
}

function getCategoryIcon(name) {
  const n = (name || '').toLowerCase();
  if (/online cours|e-learning/.test(n)) return 'monitor-smartphone';
  if (/training|cours|learn|seminar|workshop|education|conference|congress/.test(n)) return 'book-open';
  if (/shared mobility|e-bike|e-scooter|scooter|villo|blue.?bike|felyx/.test(n)) return 'bike';
  if (/mobility subscription|transit pass|transport pass|season ticket/.test(n)) return 'credit-card';
  if (/public transport|nmbs|sncb|de lijn|stib|mivb/.test(n)) return 'train';
  if (/private transport/.test(n)) return 'car';
  if (/taxi|cab|uber|bolt|ride/.test(n)) return 'car';
  if (/restaurant|food|meal|lunch|dinner|eat|café|cafe|bistro|brasserie|snack|catering/.test(n)) return 'utensils';
  if (/flight|airline|airport|airfare|travel|trip/.test(n)) return 'plane';
  if (/hotel|accommodation|lodging|hostel|airbnb/.test(n)) return 'building-2';
  if (/\btrain\b|rail|metro|tram/.test(n)) return 'train';
  if (/\bbus\b|coach|shuttle/.test(n)) return 'bus';
  if (/transport|commut/.test(n)) return 'map-pin';
  if (/coffee|beverage|drink|bar/.test(n)) return 'coffee';
  if (/fuel|gas|petrol|diesel/.test(n)) return 'fuel';
  if (/phone|mobile|telecom|internet|broadband/.test(n)) return 'phone';
  if (/software|saas|license/.test(n)) return 'monitor-smartphone';
  if (/laptop|computer|hardware|device/.test(n)) return 'laptop';
  if (/office|supplies|stationery|paper/.test(n)) return 'pencil';
  if (/print/.test(n)) return 'printer';
  if (/health|medical|pharma|doctor|hospital/.test(n)) return 'stethoscope';
  if (/gift|present/.test(n)) return 'gift';
  if (/entertain|movie|film|cinema/.test(n)) return 'film';
  if (/shop|retail/.test(n)) return 'shopping-cart';
  if (/clean|maint|repair/.test(n)) return 'wrench';
  if (/truck|deliver|freight|shipping|cargo/.test(n)) return 'truck';
  if (/parking|park/.test(n)) return 'square-parking';
  return 'receipt';
}

function initLeaveTypes() {
  return LEAVE_SECTIONS.flatMap(section =>
    section.typeNames.map(name => {
      const meta = SPECIAL_LEAVE_METADATA[name];
      const cfg = DEFAULT_LEAVE_CONFIGS[name] || {};
      return {
        name,
        section: section.id,
        color: LEAVE_COLORS[name],
        active: true,
        requiresApproval: cfg.requiresApproval ?? true,
        declaration: cfg.declaration || false,
        adminOnly: cfg.adminOnly || false,
        docRequired: cfg.docRequired || false,
        statutory: meta?.statutory || false,
        companyPolicy: meta?.companyPolicy || false,
        statutoryDays: meta?.statutoryDays || null,
        statutoryLabel: meta?.statutoryLabel || null,
        statutoryNote: meta?.statutoryNote || null,
        limitedDays: !meta?.statutory && cfg.maxDays != null,
        maxDays: cfg.maxDays || 20,
        editRequiresApproval: cfg.editRequiresApproval ?? false,
        cancelRequiresApproval: cfg.cancelRequiresApproval ?? false,
        carryover: cfg.carryover ?? null,
        allowHalfDay: cfg.allowHalfDay ?? true,
        docThresholdDays: cfg.docThresholdDays ?? 0,
        advAwardMethod: cfg.advAwardMethod ?? undefined,
        deletable: !meta?.statutory && !cfg.adminOnly && !cfg.declaration && name !== 'Statutory annual leave',
      };
    })
  );
}

function ConfirmDeleteModal({ name, onConfirm, onClose }) {
  return (
    <ModalShell onClose={onClose} width={380} zIndex={400}
      footer={close => (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '0 16px 16px' }}>
          <Button variant="secondary" onClick={close} style={{ padding: '8px 16px', background: P.white }}>Cancel</Button>
          <Button variant="primary" onClick={onConfirm} style={{ padding: '8px 16px', background: '#dc2626' }}>Delete leave type</Button>
        </div>
      )}>
      <div style={{ padding: '24px 24px 20px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: P.ink, marginBottom: 8 }}>Delete {name}?</div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkSoft, lineHeight: 1.5 }}>
          This will permanently remove the leave type. Existing leave records won't be affected, but employees can no longer request it.
        </div>
      </div>
    </ModalShell>
  );
}

// Set to false to revert to the drawer pattern

function LeaveTypeSettingsPage({ config, allLeaveTypes = [], onSave, onDelete, onBack, companyRegime = COMPANY_REGIME_DEFAULTS, onToast, onNav, appEntity = null }) {
  const isNew = !config;
  const defaults = config || { name: '', color: LEAVE_COLOR_VALUES[0], active: true, requiresApproval: true, declaration: false, adminOnly: false, docRequired: false, limitedDays: false, maxDays: 20, editRequiresApproval: false, cancelRequiresApproval: false, statutory: false, companyPolicy: false, statutoryDays: null, statutoryLabel: null, statutoryNote: null, section: 'time-off', carryover: 'forfeit', allowHalfDay: true, docThresholdDays: 0, deletable: true };
  const [name,                  setName]                  = useState(defaults.name);
  const [color,                 setColor]                 = useState(defaults.color);
  const [active,                setActive]                = useState(defaults.active);
  const [requiresApproval,      setRequiresApproval]      = useState(defaults.requiresApproval);
  const [docRequired,           setDocRequired]           = useState(defaults.docRequired);
  const [docThresholdDays,      setDocThresholdDays]      = useState(defaults.docThresholdDays ?? 0);
  const [limitedDays,           setLimitedDays]           = useState(defaults.limitedDays);
  const [maxDays,               setMaxDays]               = useState(defaults.maxDays);
  const [editRequiresApproval,  setEditRequiresApproval]  = useState(defaults.editRequiresApproval ?? false);
  const [cancelRequiresApproval,setCancelRequiresApproval]= useState(defaults.cancelRequiresApproval ?? false);
  const [carryover,             setCarryover]             = useState(defaults.carryover ?? 'forfeit');
  const [carryoverCap,          setCarryoverCap]          = useState(defaults.carryoverCap ?? 5);
  const [allowHalfDay,          setAllowHalfDay]          = useState(defaults.allowHalfDay ?? true);
  const [advAwardMethod,        setAdvAwardMethod]        = useState(defaults.advAwardMethod ?? 'lump-sum');
  const [confirmDelete,         setConfirmDelete]         = useState(false);
  const [tooltip,               setTooltip]               = useState(null);
  const [dayLimitTip,           setDayLimitTip]           = useState(false);
  const showsAnnualBalance = !defaults.declaration && !defaults.adminOnly && !defaults.statutory && defaults.section !== 'special-leave';

  const uniqueColors = [...new Set([...LEAVE_COLOR_VALUES, ...EXTRA_PALETTE_COLORS])];
  const colorUsers = React.useMemo(() => {
    const map = {};
    allLeaveTypes.forEach(lt => {
      if (lt.name === defaults.name) return;
      if (!map[lt.color]) map[lt.color] = [];
      map[lt.color].push(lt.name);
    });
    return map;
  }, [allLeaveTypes, defaults.name]);

  const save = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), color, active, requiresApproval, declaration: defaults.declaration, adminOnly: defaults.adminOnly, docRequired, docThresholdDays: docRequired ? docThresholdDays : 0, limitedDays, maxDays: (limitedDays || defaults.companyPolicy) ? (maxDays || 1) : null, editRequiresApproval, cancelRequiresApproval, carryover: showsAnnualBalance ? carryover : null, carryoverCap: carryover === 'cap' ? (carryoverCap || 5) : null, allowHalfDay, advAwardMethod: defaults.name === 'ADV / RTT' ? advAwardMethod : undefined, statutory: defaults.statutory, companyPolicy: defaults.companyPolicy, statutoryDays: defaults.statutoryDays, statutoryLabel: defaults.statutoryLabel, statutoryNote: defaults.statutoryNote, section: defaults.section, deletable: defaults.deletable ?? true });
    onToast?.({ message: isNew ? `${name.trim()} created` : `${name.trim()} saved`, type: 'approve' });
    onBack();
  };

  const card = { border: `1px solid ${P.border}`, borderRadius: 16, overflow: 'clip', background: P.white };
  const audit = !isNew ? LEAVE_TYPE_AUDIT[defaults.name] : null;

  const settingsRow = (label, hint, checked, onChange, last) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '16px 20px', borderBottom: last ? 'none' : `1px solid ${P.border}` }}>
      <div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 14, color: P.ink }}>{label}</div>
        {hint && <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkSoft, marginTop: 3 }}>{hint}</div>}
      </div>
      <Switch size="sm" checked={checked} onChange={onChange} />
    </div>
  );

  const stepper = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', border: `1px solid ${P.border}`, borderRadius: 8, overflow: 'hidden' }}>
        <button onClick={() => setMaxDays(v => Math.max(1, (parseInt(v) || 1) - 1))} style={{ width: 32, height: 36, border: 'none', background: P.bg, color: P.inkSoft, cursor: 'pointer', fontSize: 16, fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>−</button>
        <input type="text" inputMode="numeric" value={maxDays} onChange={e => setMaxDays(parseInt(e.target.value) || '')}
          style={{ width: 48, height: 36, border: 'none', borderLeft: `1px solid ${P.border}`, borderRight: `1px solid ${P.border}`, padding: '0 4px', fontFamily: 'var(--font-body)', fontSize: 14, color: P.ink, outline: 'none', textAlign: 'center', background: P.white }} />
        <button onClick={() => setMaxDays(v => (parseInt(v) || 0) + 1)} style={{ width: 32, height: 36, border: 'none', background: P.bg, color: P.inkSoft, cursor: 'pointer', fontSize: 16, fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>+</button>
      </div>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: P.inkSoft }}>days per year</span>
    </div>
  );

  return (
    <div style={{ flex: 1, overflow: 'auto', animation: `screenEnter 180ms ${EASE_OUT}` }}>
      {tooltip && (
        <div style={{ position: 'fixed', left: tooltip.x, top: tooltip.y - 6, transform: 'translateX(-50%) translateY(-100%)', padding: '4px 8px', borderRadius: 6, background: P.ink, color: '#fff', fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-body)', whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 9999 }}>{tooltip.text}</div>
      )}
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 32px 80px', display: 'flex', flexDirection: 'column', gap: 32 }}>

        {/* Back */}
        <button onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: P.inkSoft, alignSelf: 'flex-start' }}>
          <Icon name="chevron-left" size={14} color={P.inkSoft} strokeWidth={2.5} />
          Time off
        </button>

        {/* Header */}
        <div>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, color: P.ink, margin: 0, letterSpacing: '-0.02em' }}>
                  {name || 'New leave type'}
                </h1>
              </div>
              {audit && <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: P.inkSoft, marginTop: 6 }}>Last updated by {audit.by} · {audit.at}</div>}
            </div>
            {!isNew && !defaults.declaration && !defaults.adminOnly && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 6, flexShrink: 0 }}>
                <span key={active ? 'active' : 'inactive'} style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkSoft, animation: PREFERS_REDUCED_MOTION ? 'none' : `labelFadeIn 120ms ${EASE_OUT}` }}>{active ? 'Active' : 'Inactive'}</span>
                <Switch size="sm" checked={active} onChange={() => setActive(v => !v)} />
              </div>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateRows: (!active && !defaults.declaration && !defaults.adminOnly) ? '1fr' : '0fr', transition: PREFERS_REDUCED_MOTION ? 'none' : `grid-template-rows 200ms ${EASE_OUT}`, overflow: 'hidden' }}>
            <div style={{ minHeight: 0 }}>
              <div style={{ marginTop: 14, padding: '12px 16px', borderRadius: 10, background: '#eff6ff', border: '1px solid #bfdbfe', fontFamily: 'var(--font-body)', fontSize: 13, color: '#1d4ed8', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <Icon name="info" size={14} color="#3b82f6" strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
                Approved leave already on record is not affected. Pending requests will need to be handled manually.
              </div>
            </div>
          </div>
        </div>

        {/* Admin-only callout — above all sections */}
        {defaults.adminOnly && (
          <div style={{ padding: '12px 16px', borderRadius: 10, background: '#eff6ff', border: '1px solid #bfdbfe', fontFamily: 'var(--font-body)', fontSize: 13, color: '#1d4ed8', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <Icon name="info" size={14} color="#3b82f6" strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
            This leave type is recorded by HR on behalf of the employee — it cannot be self-requested from the employee app.
          </div>
        )}

        {/* Settings sections — faded when inactive */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32, opacity: active ? 1 : 0.4, transition: PREFERS_REDUCED_MOTION ? 'none' : `opacity 200ms ${EASE_OUT}` }}>

        {/* Appearance */}
        <div>
          <div style={SL}>Appearance</div>
          <div style={card}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${P.border}` }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 14, color: P.ink, marginBottom: 6 }}>Name</div>
              {!isNew && defaults.name === 'Statutory annual leave' ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: P.bg, border: `1px solid ${P.border}`, borderRadius: 8, padding: '9px 12px' }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: P.inkSoft }}>{name}</span>
                  <Icon name="lock" size={13} color={P.inkFaint} strokeWidth={2} />
                </div>
              ) : (
                <input autoFocus={isNew} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Parental leave"
                  style={{ width: '100%', border: `1px solid ${P.border}`, borderRadius: 8, padding: '9px 12px', fontFamily: 'var(--font-body)', fontSize: 14, color: P.ink, outline: 'none', boxSizing: 'border-box' }} />
              )}
            </div>
            <div style={{ padding: '16px 20px' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 14, color: P.ink, marginBottom: 10 }}>Color</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {uniqueColors.map((c) => {
                  const entry = LEAVE_COLOR_ENTRIES.find(([, v]) => v === c);
                  const borderColor = entry ? (LEAVE_BORDER_COLORS[entry[0]] || P.border) : P.border;
                  const usedBy = colorUsers[c];
                  return (
                    <div key={c} onClick={() => setColor(c)}
                      onMouseEnter={e => { if (usedBy) { const r = e.currentTarget.getBoundingClientRect(); setTooltip({ text: `Used by ${usedBy.join(', ')}`, x: r.left + r.width / 2, y: r.top }); } }}
                      onMouseLeave={() => setTooltip(null)}
                      style={{ position: 'relative', width: 22, height: 22, borderRadius: '50%', background: c, cursor: 'pointer', border: `1.5px solid ${borderColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {color === c && <Icon name="check" size={12} color={P.ink} strokeWidth={2.5} style={{ pointerEvents: 'none' }} />}
                    </div>
                  );
                })}
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: P.inkSoft, marginTop: 8 }}>Shown in calendar and leave overview</div>
            </div>
          </div>
        </div>

        {/* Allowance */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={SL}>Allowance</div>

          {/* Day limit card */}
          {(() => {
            const advFT = defaults.name === 'ADV / RTT' ? Math.max(0, ((companyRegime.contractedHours - 38) / 2) * 12) : 0;
            const isLocked = defaults.statutory || defaults.declaration || defaults.name === 'ADV / RTT' || defaults.name === 'Extra-legal leave';
            const isChecked = isLocked ? false : limitedDays;
            const showBelow = isLocked || limitedDays;

            const tooltipText = defaults.statutory
              ? 'Set by Belgian law — cannot be changed'
              : defaults.declaration
              ? 'No legal maximum for this leave type'
              : defaults.name === 'ADV / RTT'
              ? 'Calculated automatically from contracted hours'
              : defaults.name === 'Extra-legal leave'
              ? 'Configured per employee or contract type'
              : null;

            const infoCallout = defaults.statutory
              ? defaults.statutoryNote
              : defaults.declaration
              ? 'Sick leave has no legal maximum under Belgian law'
              : defaults.name === 'ADV / RTT'
              ? (advFT === 0
                  ? 'Your company uses 38h/week contracts — no ADV days are generated. Update contracted hours in Payroll settings.'
                  : `Based on contracted hours (${companyRegime.contractedHours}h/week)`)
              : defaults.name === 'Extra-legal leave'
              ? 'Extra-legal leave is additional vacation above the statutory 20-day minimum. The number of days is configured per employee or contract type under their profile.'
              : null;

            return (
              <div style={card}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '16px 20px', borderBottom: showBelow ? `1px solid ${P.border}` : 'none' }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 14, color: P.ink }}>Limit days per year</div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkSoft, marginTop: 3 }}>Cap the number of days per year — can be overridden per employee</div>
                  </div>
                  <div style={{ flexShrink: 0 }}
                    onMouseEnter={e => { if (isLocked && tooltipText) { const r = e.currentTarget.getBoundingClientRect(); setTooltip({ text: tooltipText, x: r.left + r.width / 2, y: r.top }); } }}
                    onMouseLeave={() => setTooltip(null)}>
                    <Switch size="sm" checked={isChecked} onChange={isLocked ? undefined : () => setLimitedDays(v => !v)} disabled={isLocked} />
                  </div>
                </div>
                {isLocked ? (
                  <div style={{ padding: '14px 20px' }}>
                    {(infoCallout || (defaults.adminOnly && defaults.statutoryLabel)) && (
                      <div style={{ padding: '8px 12px', borderRadius: 8, background: P.bg, border: `1px solid ${P.border}`, fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkSoft, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <Icon name="info" size={14} color={P.inkSoft} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
                        <span>
                          {defaults.adminOnly
                            ? <strong style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>{defaults.statutoryLabel}</strong>
                            : (<>
                                {(defaults.statutory && defaults.statutoryLabel) && <strong style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>{defaults.statutoryLabel} — </strong>}
                                {(defaults.name === 'ADV / RTT' && advFT > 0) && <strong style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>{advFT} days — </strong>}
                                {infoCallout}
                              </>)
                          }
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateRows: limitedDays ? '1fr' : '0fr', transition: PREFERS_REDUCED_MOTION ? 'none' : `grid-template-rows 200ms ${EASE_OUT}`, overflow: 'hidden' }}>
                    <div style={{ minHeight: 0 }}>
                      <div style={{ padding: '14px 20px' }}>
                        {stepper}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ADV Accrual method card */}
          {defaults.name === 'ADV / RTT' && (
            <div style={{ ...card, overflow: 'visible' }}>
              <div style={{ padding: '16px 20px' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 14, color: P.ink, marginBottom: 8 }}>Accrual method</div>
                <SettingsSelect value={advAwardMethod} onChange={setAdvAwardMethod} opts={[
                  { value: 'lump-sum', label: 'Lump-sum upfront' },
                  { value: 'accrued', label: 'Monthly accrual' },
                ]} />
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkSoft, marginTop: 6 }}>
                  {advAwardMethod === 'lump-sum'
                    ? 'All days granted upfront — employees can book days not yet earned, requiring year-end corrections'
                    : 'Days unlock month by month — employees can only book what they\'ve earned so far'}
                </div>
              </div>
            </div>
          )}

          {/* Carry-over card */}
          {showsAnnualBalance && (
            <div style={{ ...card, overflow: 'visible' }}>
              <div style={{ padding: '16px 20px', borderBottom: carryover === 'cap' ? `1px solid ${P.border}` : 'none' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 14, color: P.ink, marginBottom: 8 }}>Roll over unused days</div>
                <SettingsSelect value={carryover} onChange={setCarryover} opts={CARRYOVER_OPTS} />
                {CARRYOVER_OPTS.find(o => o.value === carryover)?.hint && (
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkSoft, marginTop: 6 }}>{CARRYOVER_OPTS.find(o => o.value === carryover)?.hint}</div>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateRows: carryover === 'cap' ? '1fr' : '0fr', transition: PREFERS_REDUCED_MOTION ? 'none' : `grid-template-rows 200ms ${EASE_OUT}`, overflow: 'hidden' }}>
                <div style={{ minHeight: 0 }}>
                  <div style={{ padding: '14px 20px' }}>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkSoft, marginBottom: 8 }}>Maximum days that roll over</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', border: `1px solid ${P.border}`, borderRadius: 8, overflow: 'hidden' }}>
                        <button onClick={() => setCarryoverCap(v => Math.max(1, (parseInt(v) || 1) - 1))} style={{ width: 32, height: 36, border: 'none', background: P.bg, color: P.inkSoft, cursor: 'pointer', fontSize: 16, fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>−</button>
                        <input type="text" inputMode="numeric" value={carryoverCap} onChange={e => setCarryoverCap(parseInt(e.target.value) || '')}
                          style={{ width: 48, height: 36, border: 'none', borderLeft: `1px solid ${P.border}`, borderRight: `1px solid ${P.border}`, padding: '0 4px', fontFamily: 'var(--font-body)', fontSize: 14, color: P.ink, outline: 'none', textAlign: 'center', background: P.white }} />
                        <button onClick={() => setCarryoverCap(v => (parseInt(v) || 0) + 1)} style={{ width: 32, height: 36, border: 'none', background: P.bg, color: P.inkSoft, cursor: 'pointer', fontSize: 16, fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>+</button>
                      </div>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: P.inkSoft }}>days</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Requests */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={SL}>Requests</div>

          {!defaults.declaration && !defaults.adminOnly && (
            <div style={card}>
              {settingsRow('Require approval', 'Each request must be approved before leave is confirmed', requiresApproval, () => setRequiresApproval(v => !v), !requiresApproval)}
              <div style={{ display: 'grid', gridTemplateRows: requiresApproval ? '1fr' : '0fr', transition: PREFERS_REDUCED_MOTION ? 'none' : `grid-template-rows 200ms ${EASE_OUT}`, overflow: 'hidden' }}>
                <div style={{ minHeight: 0 }}>
                  <div>
                    {settingsRow('Require approval to edit', 'Changes to approved leave are sent back for HR review', editRequiresApproval, () => setEditRequiresApproval(v => !v), false)}
                  </div>
                  {settingsRow('Require approval to cancel', 'HR must approve before days are returned to balance', cancelRequiresApproval, () => setCancelRequiresApproval(v => !v), true)}
                </div>
              </div>
            </div>
          )}

          <div style={card}>
            {settingsRow(
              defaults.adminOnly ? 'Request document from employee' : 'Require a supporting document',
              defaults.adminOnly ? 'Employee receives a document request when this leave is recorded' : 'Employee must attach a supporting document',
              docRequired, () => setDocRequired(v => !v), true
            )}
          </div>

          {!defaults.adminOnly && (
            <div style={card}>
              {settingsRow('Allow half-day requests', 'Employees can request a morning or afternoon instead of a full day', allowHalfDay, () => setAllowHalfDay(v => !v), true)}
            </div>
          )}
        </div>

        </div>{/* end fading sections */}

        {/* Employee exceptions — scoped to the selected entity; "All entities" shows every exception */}
        {!isNew && (() => {
          const exceptions = (LEAVE_TYPE_EXCEPTIONS[defaults.name] || [])
            .filter(exc => {
              const emp = EMPLOYEES[exc.empId];
              return emp && (!appEntity || emp.entityId === appEntity);
            });
          if (!exceptions.length) return null;
          return (
            <div>
              <div style={{ ...SL, marginBottom: 12 }}>Employee exceptions</div>
              <SettingsCard>
                {exceptions.map((exc, i) => {
                  const emp = EMPLOYEES[exc.empId];
                  return (
                    <SettingsRow key={exc.empId}
                      onClick={() => onNav?.('employee-detail:' + exc.empId + ':timeoff')}
                      leading={<div style={{ width: 32, height: 32, borderRadius: '50%', background: emp.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, color: P.ink, flexShrink: 0 }}>{emp.initials}</div>}
                      label={emp.name}
                      subtitle={appEntity ? emp.department : [emp.department, emp.entity].filter(Boolean).join(' · ')}
                      value={exc.value}
                      last={i === exceptions.length - 1}
                    />
                  );
                })}
              </SettingsCard>
              <div style={{ marginTop: 8, fontFamily: 'var(--font-body)', fontSize: 12, color: P.inkSoft }}>Exceptions are set per employee and override these defaults.</div>
            </div>
          );
        })()}

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 }}>
          <div>
            {!isNew && onDelete && defaults.deletable && (
              <Button variant="danger" onClick={() => setConfirmDelete(true)}>Delete leave type</Button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {isNew && (
              <Button variant="secondary" onClick={onBack} style={{ padding: '9px 20px' }}>Cancel</Button>
            )}
            <Button variant="primary" onClick={save} disabled={!name.trim()} style={{ padding: '9px 20px' }}>
              {isNew ? 'Create leave type' : 'Save changes'}
            </Button>
          </div>
        </div>
        {confirmDelete && (
          <ConfirmDeleteModal name={name} onConfirm={onDelete} onClose={() => setConfirmDelete(false)} />
        )}

      </div>
    </div>
  );
}

function TimeOffSettings({ appEntity = null, companyRegime = COMPANY_REGIME_DEFAULTS, onToast, onNav, leaveTypes, setLeaveTypes }) {
  const [leaveModal, setLeaveModal] = useState(null); // index or 'new'
  const [tab, setTab] = useState('active');

  const handleSave = (updated) => {
    if (leaveModal === 'new') {
      setLeaveTypes(prev => [...prev, updated]);
    } else {
      setLeaveTypes(prev => prev.map((lt, i) => i === leaveModal ? updated : lt));
    }
  };

  const handleDelete = () => {
    setLeaveTypes(prev => prev.filter((_, i) => i !== leaveModal));
    setLeaveModal(null);
  };

  if (leaveModal != null) {
    return (
      <LeaveTypeSettingsPage
        config={leaveModal === 'new' ? null : leaveTypes[leaveModal]}
        allLeaveTypes={leaveTypes}
        onSave={handleSave}
        onDelete={leaveModal !== 'new' ? handleDelete : null}
        onBack={() => setLeaveModal(null)}
        companyRegime={companyRegime}
        onToast={onToast}
        onNav={onNav}
        appEntity={appEntity}
      />
    );
  }

  const activeCount = leaveTypes.filter(lt => lt.active).length;
  const inactiveCount = leaveTypes.length - activeCount;

  return (
    <>
    <div style={{ flex: 1, overflow: 'auto', animation: `screenEnter 180ms ${EASE_OUT}` }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 32px', display: 'flex', flexDirection: 'column', gap: 32 }}>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            {appEntity && <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 6, background: P.white, border: `1px solid ${P.border}`, fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: 11, color: P.inkSoft, marginBottom: 12 }}>{ENTITIES.find(e => e.id === appEntity)?.name}</span>}
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, color: P.ink, margin: 0, letterSpacing: '-0.02em' }}>Time off</h1>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: P.inkSoft, margin: '4px 0 0' }}>Configure the leave types available to your employees</p>
          </div>
          <Button variant="primary" icon="plus" onClick={() => setLeaveModal('new')} style={{ flexShrink: 0 }}>Add leave type</Button>
        </div>

        <div style={{ borderBottom: `1px solid ${P.border}` }}>
          <TabBar
            tabs={[
              { id: 'active', label: `Active${activeCount > 0 ? ` (${activeCount})` : ''}` },
              { id: 'inactive', label: `Inactive${inactiveCount > 0 ? ` (${inactiveCount})` : ''}` },
            ]}
            activeTab={tab}
            onTabChange={setTab}
            padding="0"
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {tab === 'inactive' && inactiveCount === 0 && (
            <div style={{ background: P.white, border: `1px solid ${P.border}`, borderRadius: 16 }}>
              <EmptyState icon="moon" title="No inactive leave types" />
            </div>
          )}
          {LEAVE_SECTIONS.map(section => {
            const sectionTypes = leaveTypes.filter(lt => lt.section === section.id && lt.active === (tab === 'active'));
            if (sectionTypes.length === 0) return null;
            return (
              <div key={section.id}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 11, color: P.inkSoft, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>{section.label}</div>
                <SettingsCard>
                  {sectionTypes.map((lt, i) => {
                    const globalIdx = leaveTypes.indexOf(lt);
                    const subtitle = (() => {
                      const parts = [];
                      if (lt.adminOnly) parts.push('Admin only');
                      else if (lt.declaration) parts.push('Declaration');
                      else if (lt.requiresApproval) parts.push('Approval required');
                      if (lt.statutory && lt.statutoryLabel) parts.push(lt.statutoryLabel);
                      else if (lt.name === 'ADV / RTT') {
                        const advFT = Math.max(0, ((companyRegime.contractedHours - 38) / 2) * 12);
                        if (advFT > 0) parts.push(`${advFT} days`);
                      } else if (lt.companyPolicy && lt.maxDays) parts.push(`${lt.maxDays} ${lt.maxDays === 1 ? 'day' : 'days'}`);
                      else if (lt.limitedDays && lt.maxDays) parts.push(`${lt.maxDays} ${lt.maxDays === 1 ? 'day' : 'days'}`);
                      if (lt.docRequired) parts.push('Doc required');
                      return parts.length > 0 ? parts.join(' · ') : null;
                    })();
                    return (
                      <SettingsRow key={lt.name + globalIdx}
                        onClick={() => setLeaveModal(globalIdx)}
                        icon={LEAVE_SECTION_ICONS[lt.section] || LEAVE_ICONS[lt.name] || 'calendar'}
                        iconBadgeColor={lt.color}
                        dimmed={!lt.active}
                        label={lt.name}
                        subtitle={subtitle}
                        last={i === sectionTypes.length - 1}
                      />
                    );
                  })}
                </SettingsCard>
              </div>
            );
          })}
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

function ChoicesScreen({ choices, onApprove, onDecline, onDetail, appEntity = null }) {
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
        badge={appEntity ? (ENTITIES.find(e => e.id === appEntity)?.name) : null}
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


// ── Entities settings screen ──────────────────────────────────────────────
function EntitiesSettings({ onNav, appEntity = null, companyRegime = COMPANY_REGIME_DEFAULTS, onRegimeChange }) {
  const [expandedId, setExpandedId] = useState(null);
  const [editingDomain, setEditingDomain] = useState(false);
  const [domainInput, setDomainInput] = useState(companyRegime.emailDomain || '');
  const saveDomain = () => {
    const v = domainInput.trim().toLowerCase().replace(/^@/, '');
    if (v) onRegimeChange?.({ ...companyRegime, emailDomain: v });
    setEditingDomain(false);
  };

  const ENTITY_OVERRIDES_DEMO = {
    'lumio-france': ['Entitlement', 'Approval workflow'],
    'lumio-nl': [],
    'lumio-group': [],
  };

  const card = { border: `1px solid ${P.border}`, borderRadius: 16, overflow: 'clip', background: P.white };

  return (
    <div style={{ flex: 1, overflow: 'auto', animation: `screenEnter 180ms ${EASE_OUT}` }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 32px', display: 'flex', flexDirection: 'column', gap: 32 }}>
        <div>
          <div>
            {appEntity && <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 6, background: P.white, border: `1px solid ${P.border}`, fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: 11, color: P.inkSoft, marginBottom: 24 }}>{ENTITIES.find(e => e.id === appEntity)?.name}</span>}
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: P.ink, margin: 0, letterSpacing: '-0.02em' }}>Entities</h1>
          </div>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkSoft, margin: '4px 0 0' }}>Manage your company's legal entities</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', borderRadius: 10, background: '#f0f4ff', border: '1px solid #dbe4ff' }}>
          <Icon name="info" size={15} color="#4c6ef5" strokeWidth={1.75} style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: '#364fc7', lineHeight: 1.5 }}>
            Settings are configured at the company level by default. Entity-specific overrides can be added per setting where needed.
          </div>
        </div>

        <div>
          <div style={SL}>All entities</div>
          <div style={{ ...card, marginBottom: 8 }}>
            <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: P.inkSoft, marginBottom: 4 }}>Email domain</div>
                {editingDomain ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      autoFocus
                      value={domainInput}
                      onChange={e => setDomainInput(e.target.value.toLowerCase().replace(/^@/, ''))}
                      onKeyDown={e => { if (e.key === 'Enter') saveDomain(); if (e.key === 'Escape') setEditingDomain(false); }}
                      placeholder="company.com"
                      style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 13, color: P.ink, border: `1px solid ${P.action}`, borderRadius: 6, padding: '4px 8px', outline: 'none', width: 180 }}
                    />
                    <button onClick={saveDomain} style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12, color: P.white, background: P.action, border: 'none', borderRadius: 6, padding: '5px 12px', cursor: 'pointer' }}>Save</button>
                    <button onClick={() => setEditingDomain(false)} style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12, color: P.ink, background: 'transparent', border: `1px solid ${P.border}`, borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>Cancel</button>
                  </div>
                ) : (
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 13, color: P.ink }}>{companyRegime.emailDomain}</div>
                )}
                {!editingDomain && <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: P.inkSoft, marginTop: 3 }}>Used to validate work emails during employee onboarding. Entities can override this with their own domain.</div>}
              </div>
              {editingDomain ? null : (
                <button onClick={() => { setDomainInput(companyRegime.emailDomain || ''); setEditingDomain(true); }}
                  style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12, color: P.ink, background: 'transparent', border: `1px solid ${P.border}`, borderRadius: 6, padding: '4px 10px', cursor: 'pointer', flexShrink: 0 }}>
                  Edit
                </button>
              )}
            </div>
          </div>
          <div style={card}>
            {ENTITIES.map((ent, idx) => {
              const isExpanded = expandedId === ent.id;
              const overrides = ENTITY_OVERRIDES_DEMO[ent.id] || [];
              return (
                <React.Fragment key={ent.id}>
                  <div onClick={() => setExpandedId(isExpanded ? null : ent.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', borderBottom: (idx < ENTITIES.length - 1 || isExpanded) ? `1px solid ${P.border}` : 'none', cursor: 'pointer' }}>
                    <Icon name="map-pin" size={16} color={P.inkFaint} strokeWidth={1.75} style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: P.ink }}>{ent.name}</div>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: P.inkSoft, marginTop: 1 }}>
                        {[ent.jc, ent.country].filter(Boolean).join(' · ') || ent.country}
                      </div>
                    </div>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: P.inkFaint, whiteSpace: 'nowrap' }}>{ent.employeeCount} employees</span>
                    {overrides.length > 0 && (
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 11, color: P.action, background: '#f3f0ff', padding: '2px 8px', borderRadius: 10, whiteSpace: 'nowrap' }}>
                        {overrides.length} override{overrides.length > 1 ? 's' : ''}
                      </span>
                    )}
                    <Icon name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={P.inkFaint} strokeWidth={1.75} style={{ flexShrink: 0 }} />
                  </div>
                  {isExpanded && (
                    <div style={{ padding: '12px 20px 16px', background: P.bg, borderBottom: idx < ENTITIES.length - 1 ? `1px solid ${P.border}` : 'none' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
                        {[
                          ['Country', ent.country],
                          ['Joint committee', ent.jc || '—'],
                          ['Payroll provider', ent.payrollProvider],
                          ['Integration ID', ent.integrationId || '—'],
                          ['Email domain', ent.emailDomain ? `${ent.emailDomain} (override)` : `${companyRegime.emailDomain} (inherited)`],
                          ['Employees', `${ent.employeeCount}`],
                          ['Overrides', overrides.length > 0 ? overrides.join(', ') : 'None — fully inherited'],
                        ].map(([label, value]) => (
                          <div key={label}>
                            <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: P.inkSoft, marginBottom: 2 }}>{label}</div>
                            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 13, color: P.ink }}>{value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={() => {}} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 8, border: `1px solid ${P.border}`, background: P.white,
            cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: P.ink,
          }}>
            <Icon name="plus" size={14} color={P.ink} strokeWidth={2} />
            Add entity
          </button>
        </div>
      </div>
    </div>
  );
}

function AddDocumentModal({ appEntity, title, saveLabel, onSave, onClose, initialValues, onDeactivate, isDeactivated, readOnly }) {
  const [name, setName] = useState(initialValues?.name || '');
  const [language, setLanguage] = useState(initialValues?.language && initialValues.language !== '—' ? initialValues.language : '');
  const [type, setType] = useState(initialValues?.type || 'File');
  const [scope, setScope] = useState(initialValues?.scope !== undefined ? initialValues.scope : (appEntity || ''));
  const [file, setFile] = useState(initialValues?.fileName ? { name: initialValues.fileName, size: 0 } : null);

  const fakeUpload = () => {
    if (file) { setFile(null); return; }
    const slug = name.trim() ? name.trim().toLowerCase().replace(/\s+/g, '-') : 'document';
    setFile({ name: `${slug}.pdf`, size: (0.8 + Math.random() * 2.4) * 1024 * 1024 });
  };

  return (
    <ModalShell title={title || `Add document${entityName ? ` for ${entityName}` : ''}`} onClose={onClose} width={440}>
      {close => {
        const handleSave = () => {
          if (!name.trim()) return;
          const id = initialValues?.id || `doc-${Date.now()}`;
          onSave({ ...(initialValues || {}), id, name: name.trim(), language: language || '—', type, fileName: file?.name, scope: scope || null });
          close();
        };
        return (
          <>
        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 12, color: P.inkSoft, marginBottom: 6 }}>Name</label>
            <input autoFocus={!readOnly} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Work authorization" disabled={readOnly}
              style={{ width: '100%', border: `1px solid ${P.border}`, borderRadius: 8, padding: '8px 12px', fontFamily: 'var(--font-body)', fontSize: 13, color: P.ink, outline: 'none', background: readOnly ? P.bg : P.white, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 12, color: P.inkSoft, marginBottom: 6 }}>Scope</label>
            <select value={scope} onChange={e => setScope(e.target.value)} disabled={readOnly}
              style={{ width: '100%', border: `1px solid ${P.border}`, borderRadius: 8, padding: '8px 12px', fontFamily: 'var(--font-body)', fontSize: 13, color: P.ink, outline: 'none', background: readOnly ? P.bg : P.white }}>
              <option value="">Company-wide</option>
              {ENTITIES.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 12, color: P.inkSoft, marginBottom: 6 }}>Language</label>
              <select value={language} onChange={e => setLanguage(e.target.value)} disabled={readOnly}
                style={{ width: '100%', border: `1px solid ${P.border}`, borderRadius: 8, padding: '8px 12px', fontFamily: 'var(--font-body)', fontSize: 13, color: P.ink, outline: 'none', background: readOnly ? P.bg : P.white }}>
                <option value="">—</option>
                <option value="NL">NL</option>
                <option value="FR">FR</option>
                <option value="EN">EN</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 12, color: P.inkSoft, marginBottom: 6 }}>Type</label>
              <select value={type} onChange={e => setType(e.target.value)} disabled={readOnly}
                style={{ width: '100%', border: `1px solid ${P.border}`, borderRadius: 8, padding: '8px 12px', fontFamily: 'var(--font-body)', fontSize: 13, color: P.ink, outline: 'none', background: readOnly ? P.bg : P.white }}>
                <option value="File">File</option>
                <option value="Url">URL</option>
              </select>
            </div>
          </div>
          {!readOnly && <div onClick={fakeUpload} style={{ border: `1px dashed ${file ? P.action : P.border}`, borderRadius: 8, padding: '16px', textAlign: 'center', background: file ? '#f5f3ff' : P.bg, cursor: 'pointer', transition: 'border-color 120ms, background 120ms' }}>
            {file ? (
              <>
                <Icon name="file-check" size={18} color={P.action} strokeWidth={1.5} />
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: P.ink, marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: P.inkFaint, marginTop: 2 }}>{(file.size / 1024 / 1024).toFixed(1)} MB · Click to change</div>
              </>
            ) : (
              <>
                <Icon name="upload" size={18} color={P.inkFaint} strokeWidth={1.5} />
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: P.inkSoft, marginTop: 6 }}>Upload file <span style={{ color: P.inkFaint }}>(optional)</span></div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: P.inkFaint, marginTop: 2 }}>PDF, DOCX up to 10 MB</div>
              </>
            )}
          </div>}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '14px 22px', borderTop: `1px solid ${P.border}` }}>
          <div>
            {onDeactivate && (
              <button onClick={() => { onDeactivate(); close(); }} style={{ padding: '7px 14px', border: `1px solid ${isDeactivated ? '#bbf7d0' : '#fecaca'}`, borderRadius: 8, background: isDeactivated ? '#f0fdf4' : '#fef2f2', fontFamily: 'var(--font-body)', fontSize: 13, color: isDeactivated ? '#16a34a' : '#dc2626', cursor: 'pointer' }}>
                {isDeactivated ? 'Reactivate' : 'Deactivate'}
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" onClick={close} style={{ padding: '7px 16px', background: P.white }}>{readOnly ? 'Close' : 'Cancel'}</Button>
            {!readOnly && (
              <Button variant="primary" onClick={handleSave} disabled={!name.trim()} style={{ padding: '7px 16px' }}>
                {saveLabel || (title ? title.split(' for ')[0] : 'Add document')}
              </Button>
            )}
          </div>
        </div>
          </>
        );
      }}
    </ModalShell>
  );
}

function TableFadeIn({ children }) {
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setReady(true)));
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <div style={{
      opacity: ready ? 1 : 0,
      transform: ready ? 'translateY(0)' : 'translateY(6px)',
      transition: PREFERS_REDUCED_MOTION
        ? `opacity 200ms ${EASE_OUT}`
        : `opacity 200ms ${EASE_OUT}, transform 200ms ${EASE_OUT}`,
    }}>
      {children}
    </div>
  );
}

function DocumentsSettings({ appEntity = null, documents = [], onDocumentsChange }) {
  const setDocuments = onDocumentsChange;
  const [tab, setTab] = useState('templates');
  const [addOpen, setAddOpen] = useState(false);
  const [editDoc, setEditDoc] = useState(null);
  const [docFilter, setDocFilter] = useState('active');

  const entityName = appEntity ? (ENTITIES.find(e => e.id === appEntity) || {}).name : null;

  const th = { textAlign: 'left', padding: '9px 16px', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 11, color: P.inkFaint, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' };
  const td = { padding: '14px 16px', color: P.ink, verticalAlign: 'middle', fontFamily: 'var(--font-body)', fontSize: 13 };
  const tdMuted = { ...td, color: P.inkFaint, opacity: 0.6 };

  const ActionBtn = ({ icon, label, onClick, danger }) => (
    <button onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', border: `1px solid ${danger ? '#fecaca' : P.border}`, borderRadius: 6, background: danger ? '#fef2f2' : P.white, fontFamily: 'var(--font-body)', fontSize: 12, color: danger ? '#dc2626' : P.ink, cursor: 'pointer', whiteSpace: 'nowrap' }}>
      <Icon name={icon} size={12} color={danger ? '#dc2626' : P.inkSoft} strokeWidth={1.75} />
      {label}
    </button>
  );

  const badge = { display: 'inline-flex', alignItems: 'center', padding: '2px 6px', borderRadius: 6, background: P.white, border: `1px solid ${P.border}`, fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 11, color: P.inkSoft, marginLeft: 6 };

  const iconBtn = { border: 'none', background: 'transparent', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4 };

  const DocTable = ({ rows, onEdit, showScope }) => (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-body)', fontSize: 13 }}>
      <thead>
        <tr style={{ borderBottom: `1px solid ${P.border}` }}>
          <th style={th}>Name</th>
          {showScope && <th style={th}>Scope</th>}
          <th style={th}>Language</th>
          <th style={th}>Type</th>
          <th style={th}></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((doc, idx) => {
          const isLast = idx === rows.length - 1;
          const scopeEntity = doc.scope ? ENTITIES.find(e => e.id === doc.scope) : null;
          return (
            <tr key={doc.id} style={{ borderBottom: isLast ? 'none' : `1px solid ${P.border}` }}>
              <td style={td}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Icon name={doc.type === 'Url' ? 'link' : 'file-text'} size={14} color={P.inkSoft} strokeWidth={1.75} />
                  {doc.name}
                  {doc.deactivated && <span style={badge}>Deactivated</span>}
                </div>
              </td>
              {showScope && (
                <td style={td}>
                  {scopeEntity
                    ? <span style={badge}>{scopeEntity.name}</span>
                    : <span style={{ color: P.inkFaint, fontSize: 12 }}>—</span>}
                </td>
              )}
              <td style={td}>{doc.language || '—'}</td>
              <td style={td}>{doc.type}</td>
              <td style={{ ...td, textAlign: 'right' }}>
                <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', alignItems: 'center' }}>
                  {!doc.deactivated && (
                    doc.type === 'Url'
                      ? <button style={iconBtn}><Icon name="external-link" size={14} color={P.inkSoft} strokeWidth={1.75} /></button>
                      : <button style={iconBtn}><Icon name="download" size={14} color={P.inkSoft} strokeWidth={1.75} /></button>
                  )}
                  {onEdit && <button style={iconBtn} onClick={() => onEdit(doc)}><Icon name="chevron-right" size={16} color={P.inkSoft} strokeWidth={1.75} /></button>}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  const DocEmptyState = ({ tabId }) => (
    <div style={{ background: P.white, border: `1px solid ${P.border}`, borderRadius: 12 }}>
      <EmptyState
        icon="file-text"
        title={`No ${tabId === 'templates' ? 'templates' : 'documents'} yet`}
        description={tabId === 'templates'
          ? 'Add contract templates and policy documents your team can download.'
          : 'Add documents employees are required to provide, like ID copies or signed contracts.'}
        action={
          <button onClick={() => setAddOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: `1px solid ${P.border}`, borderRadius: 8, padding: '7px 14px', background: P.white, fontFamily: 'var(--font-body)', fontSize: 13, color: P.ink, cursor: 'pointer' }}>
            <Icon name="plus" size={14} color={P.inkSoft} strokeWidth={2} />
            Add {tabId === 'templates' ? 'template' : 'document'}{appEntity ? ` for ${entityName}` : ''}
          </button>
        }
      />
    </div>
  );

  const tabs = [
    { id: 'templates', label: 'Templates' },
    { id: 'company',   label: 'Documents' },
  ];

  const applyFilter = (rows) => docFilter === 'deactivated'
    ? rows.filter(d => d.deactivated)
    : rows.filter(d => !d.deactivated);

  const tabDocs = documents.filter(d => d.tab === tab);
  const visibleDocs = appEntity
    ? tabDocs.filter(d => !d.scope || d.scope === appEntity)
    : tabDocs;
  const rows = applyFilter(visibleDocs);
  const hasDeactivated = visibleDocs.some(d => d.deactivated);

  return (
    <div style={{ flex: 1, overflow: 'auto', animation: `screenEnter 180ms ${EASE_OUT}` }}>
      {addOpen && (
        <AddDocumentModal
          appEntity={appEntity}
          title={tab === 'templates' ? 'Add template' : 'Add document'}
          onSave={doc => {
            setDocuments(prev => [...prev, { ...doc, tab }]);
            setAddOpen(false);
          }}
          onClose={() => setAddOpen(false)}
        />
      )}
      {editDoc && (
        <AddDocumentModal
          appEntity={appEntity}
          title={`Edit ${tab === 'templates' ? 'template' : 'document'}`}
          saveLabel="Save changes"
          initialValues={editDoc}
          onSave={doc => {
            setDocuments(prev => [...prev.filter(d => d.id !== doc.id), { ...doc, tab }]);
            setEditDoc(null);
          }}
          onDeactivate={() => {
            setDocuments(prev => prev.map(d => d.id === editDoc.id ? { ...d, deactivated: !d.deactivated } : d));
            if (editDoc.deactivated) setDocFilter('active');
          }}
          isDeactivated={editDoc.deactivated}
          onClose={() => setEditDoc(null)}
        />
      )}

      <div style={{ maxWidth: 780, margin: '0 auto', padding: '40px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        <div>
          {appEntity && (
            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 6, background: P.white, border: `1px solid ${P.border}`, fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: 11, color: P.inkSoft, marginBottom: 24 }}>
              {entityName}
            </span>
          )}
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: P.ink, margin: 0, letterSpacing: '-0.02em' }}>Documents</h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkSoft, margin: '4px 0 0' }}>Manage document templates and employee requirements</p>
        </div>

        {/* Tabs */}
        <div style={{ borderBottom: `1px solid ${P.border}`, marginBottom: 8 }}>
          <TabBar tabs={tabs} activeTab={tab} onTabChange={v => { setTab(v); setDocFilter('active'); }} padding="0" />
        </div>

        {/* Status filter — only shown once there's something deactivated */}
        {hasDeactivated && (
          <div style={{ display: 'flex' }}>
            <FilterDropdown
              label="Active"
              active={docFilter}
              opts={[['active', 'Active'], ['deactivated', 'Deactivated']]}
              onSelect={setDocFilter}
              minWidth={140}
            />
          </div>
        )}

        {/* Templates tab */}
        {tab === 'templates' && (
          rows.length === 0 ? <DocEmptyState tabId="templates" /> : (
            <React.Fragment>
              <TableFadeIn key={appEntity ?? 'all'}>
                <div style={{ background: P.white, border: `1px solid ${P.border}`, borderRadius: 12, overflow: 'clip' }}>
                  <DocTable rows={rows} onEdit={setEditDoc} showScope={!appEntity} />
                </div>
              </TableFadeIn>
              {docFilter === 'active' && (
                <div>
                  <button onClick={() => setAddOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: `1px solid ${P.border}`, borderRadius: 8, padding: '7px 14px', background: P.white, fontFamily: 'var(--font-body)', fontSize: 13, color: P.ink, cursor: 'pointer' }}>
                    <Icon name="plus" size={14} color={P.inkSoft} strokeWidth={2} />
                    Add template
                  </button>
                </div>
              )}
            </React.Fragment>
          )
        )}

        {/* Documents tab */}
        {tab === 'company' && (
          rows.length === 0 ? <DocEmptyState tabId="company" /> : (
            <React.Fragment>
              <TableFadeIn key={appEntity ?? 'all'}>
                <div style={{ background: P.white, border: `1px solid ${P.border}`, borderRadius: 12, overflow: 'clip' }}>
                  <DocTable rows={rows} onEdit={setEditDoc} showScope={!appEntity} />
                </div>
              </TableFadeIn>
              {docFilter === 'active' && (
                <div>
                  <button onClick={() => setAddOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: `1px solid ${P.border}`, borderRadius: 8, padding: '7px 14px', background: P.white, fontFamily: 'var(--font-body)', fontSize: 13, color: P.ink, cursor: 'pointer' }}>
                    <Icon name="plus" size={14} color={P.inkSoft} strokeWidth={2} />
                    Add document
                  </button>
                </div>
              )}
            </React.Fragment>
          )
        )}

      </div>
    </div>
  );
}

function PayrollSettings({ companyRegime, onRegimeChange, appEntity = null, onToast }) {
  const card = { border: `1px solid ${P.border}`, borderRadius: 16, overflow: 'clip', background: P.white };
  const advDays = Math.max(0, ((companyRegime.contractedHours - 38) / 2) * 12);
  const HOUR_OPTIONS = [
    { value: 38, label: '38h / week', sub: 'Standard — no ADV days' },
    { value: 39, label: '39h / week', sub: '6 ADV days / year' },
    { value: 40, label: '40h / week', sub: '12 ADV days / year' },
  ];
  return (
    <div style={{ flex: 1, overflow: 'auto', animation: `screenEnter 180ms ${EASE_OUT}` }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 32px', display: 'flex', flexDirection: 'column', gap: 32 }}>
        <div>
          {appEntity && <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 6, background: P.white, border: `1px solid ${P.border}`, fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: 11, color: P.inkSoft, marginBottom: 24 }}>{ENTITIES.find(e => e.id === appEntity)?.name}</span>}
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: P.ink, margin: 0, letterSpacing: '-0.02em' }}>Payroll</h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkSoft, margin: '4px 0 0' }}>Configure work regime and payroll integration</p>
        </div>

        <div>
          <div style={SL}>Work regime</div>
          <div style={card}>
            <div style={{ padding: 20 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: P.ink, marginBottom: 4 }}>Contracted hours</div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkSoft, marginBottom: 16 }}>The weekly hours in your employment contracts. Hours above the 38h legal standard generate ADV days.</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {HOUR_OPTIONS.map(opt => {
                  const active = companyRegime.contractedHours === opt.value;
                  return (
                    <button key={opt.value} onClick={() => { onRegimeChange({ ...companyRegime, contractedHours: opt.value }); onToast?.({ message: 'Work regime saved', type: 'approve' }); }}
                      style={{ flex: 1, padding: '12px 14px', borderRadius: 10, border: `1.5px solid ${active ? P.action : P.border}`, background: active ? '#f3f0ff' : 'transparent', cursor: 'pointer', textAlign: 'left' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: active ? P.action : P.ink }}>{opt.label}</div>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: active ? P.action : P.inkSoft, marginTop: 2, opacity: active ? 0.85 : 1 }}>{opt.sub}</div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ borderTop: `1px solid ${P.border}`, padding: '12px 20px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <Icon name="info" size={14} color={P.inkSoft} strokeWidth={1.75} style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: P.inkSoft, lineHeight: 1.5 }}>
                Under PC 200, employees working more than 38h/week are entitled to ADV days. The balance is calculated automatically per employee based on FTE and the contracted hours above.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BenefitTypeDrawer({ config, onSave, onDelete, onClose }) {
  const isNew = !config;
  const defaults = config || { id: '', label: '', icon: 'gift', hint: '', active: true, requiresApproval: true, receiptRequired: false, budgetCap: null };
  const [label, setLabel] = useState(defaults.label);
  const [hint, setHint] = useState(defaults.hint);
  const [active, setActive] = useState(defaults.active);
  const [requiresApproval, setRequiresApproval] = useState(defaults.requiresApproval);
  const [receiptRequired, setReceiptRequired] = useState(defaults.receiptRequired);
  const [hasBudget, setHasBudget] = useState(defaults.budgetCap != null);
  const [budgetCap, setBudgetCap] = useState(defaults.budgetCap ?? 500);
  const [confirmDelete, setConfirmDelete] = useState(false);

  React.useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const labelStyle = { display: 'block', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: P.inkSoft, marginBottom: 6 };
  const inputStyle = { width: '100%', border: `1px solid ${P.border}`, borderRadius: 8, padding: '9px 12px', fontFamily: 'var(--font-body)', fontSize: 14, color: P.ink, outline: 'none', boxSizing: 'border-box' };
  const toggleRow = (rowLabel, rowHint, checked, onChange, last) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '14px 0', borderBottom: last ? 'none' : `1px solid ${P.border}` }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 14, color: P.ink }}>{rowLabel}</div>
        {rowHint && <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkSoft, marginTop: 2 }}>{rowHint}</div>}
      </div>
      <Switch size="sm" checked={checked} onChange={onChange} />
    </div>
  );

  return (
    <DrawerShell onClose={onClose}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name={defaults.icon} size={18} color={P.inkSoft} strokeWidth={1.75} />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: P.ink }}>
            {isNew ? 'New benefit type' : (label || defaults.label)}
          </span>
        </div>
      }>
      {close => {
        const save = () => {
          if (!label.trim()) return;
          onSave({ ...defaults, label: label.trim(), hint: hint.trim(), active, requiresApproval, receiptRequired, budgetCap: hasBudget ? (budgetCap || 1) : null });
          close();
        };
        return (
          <>
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {/* Enabled */}
          <div style={{ paddingBottom: 20, marginBottom: 20, borderBottom: `1px solid ${P.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 14, color: P.ink }}>Enabled</div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkSoft, marginTop: 2 }}>
                  {active ? 'Employees can request this benefit' : 'Employees cannot submit new requests for this benefit'}
                </div>
              </div>
              <Switch size="sm" checked={active} onChange={() => setActive(v => !v)} />
            </div>
            {!active && (
              <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 8, background: '#eff6ff', border: '1px solid #bfdbfe', fontFamily: 'var(--font-body)', fontSize: 13, color: '#1d4ed8', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <Icon name="info" size={14} color="#3b82f6" strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
                Existing approved benefits are not affected.
              </div>
            )}
          </div>

          {/* General */}
          <div style={SL}>General</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
            <div>
              <label style={labelStyle}>Name</label>
              <input autoFocus={isNew} value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Wellbeing" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Description</label>
              <input value={hint} onChange={e => setHint(e.target.value)} placeholder="Short description shown to employees" style={inputStyle} />
            </div>
          </div>

          {/* Budget */}
          <div style={{ borderTop: `1px solid ${P.border}`, paddingTop: 24, marginBottom: 0 }}>
            <div style={SL}>Budget</div>
            {toggleRow('Annual budget cap', 'Limit how much each employee can request per year', hasBudget, () => setHasBudget(v => !v), !hasBudget)}
            {hasBudget && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 0 14px' }}>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: P.inkSoft }}>€</span>
                <div style={{ display: 'inline-flex', alignItems: 'center', border: `1px solid ${P.border}`, borderRadius: 8, overflow: 'hidden' }}>
                  <button onClick={() => setBudgetCap(v => Math.max(1, (parseInt(v) || 1) - 50))} style={{ width: 32, height: 36, border: 'none', background: P.bg, color: P.inkSoft, cursor: 'pointer', fontSize: 16, fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>−</button>
                  <input type="number" min={1} value={budgetCap} onChange={e => setBudgetCap(parseInt(e.target.value) || '')}
                    style={{ width: 64, height: 36, border: 'none', borderLeft: `1px solid ${P.border}`, borderRight: `1px solid ${P.border}`, padding: '0 4px', fontFamily: 'var(--font-body)', fontSize: 14, color: P.ink, outline: 'none', textAlign: 'center', background: P.white }} />
                  <button onClick={() => setBudgetCap(v => (parseInt(v) || 0) + 50)} style={{ width: 32, height: 36, border: 'none', background: P.bg, color: P.inkSoft, cursor: 'pointer', fontSize: 16, fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>+</button>
                </div>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: P.inkSoft }}>per employee / year</span>
              </div>
            )}
          </div>

          {/* Rules */}
          <div style={{ borderTop: `1px solid ${P.border}`, paddingTop: 24 }}>
            <div style={SL}>Rules</div>
            {toggleRow('Approval required', 'Each request must be approved before the benefit is granted', requiresApproval, () => setRequiresApproval(v => !v), false)}
            {toggleRow('Receipt required', 'Employee must attach proof of purchase or invoice', receiptRequired, () => setReceiptRequired(v => !v), true)}
          </div>
        </div>

        <div style={{ flexShrink: 0, padding: '14px 22px', borderTop: `1px solid ${P.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
          {!isNew && onDelete && (
            confirmDelete ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 'auto' }}>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkSoft }}>Delete this benefit type?</span>
                <button onClick={onDelete} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: '#dc2626', padding: 0 }}>Confirm</button>
                <button onClick={() => setConfirmDelete(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: P.inkSoft, padding: 0 }}>Cancel</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: '#dc2626', padding: 0, marginRight: 'auto' }}>Delete</button>
            )
          )}
          <Button variant="secondary" onClick={close}>Cancel</Button>
          <Button variant="primary" onClick={save}>Save</Button>
        </div>
          </>
        );
      }}
    </DrawerShell>
  );
}

function BenefitsSettings({ appEntity = null }) {
  const [benefits, setBenefits] = useState(BENEFIT_TYPES_SEED);
  const [modal, setModal] = useState(null); // index or 'new'


  const handleSave = (updated) => {
    if (modal === 'new') {
      setBenefits(prev => [...prev, { ...updated, id: updated.label.toLowerCase().replace(/\s+/g, '-') }]);
    } else {
      setBenefits(prev => prev.map((b, i) => i === modal ? updated : b));
    }
    setModal(null);
  };

  const handleDelete = () => {
    setBenefits(prev => prev.filter((_, i) => i !== modal));
    setModal(null);
  };

  const activeCount  = benefits.filter(b => b.active).length;
  const inactiveCount = benefits.length - activeCount;
  const [tab, setTab] = useState('active');

  return (
    <>
    {modal != null && (
      <BenefitTypeDrawer
        config={modal === 'new' ? null : benefits[modal]}
        onSave={handleSave}
        onDelete={modal !== 'new' ? handleDelete : null}
        onClose={() => setModal(null)}
      />
    )}

    <div style={{ flex: 1, overflow: 'auto', animation: `screenEnter 180ms ${EASE_OUT}` }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 32px', display: 'flex', flexDirection: 'column', gap: 32 }}>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            {appEntity && <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 6, background: P.white, border: `1px solid ${P.border}`, fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: 11, color: P.inkSoft, marginBottom: 12 }}>{ENTITIES.find(e => e.id === appEntity)?.name}</span>}
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, color: P.ink, margin: 0, letterSpacing: '-0.02em' }}>Benefits</h1>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: P.inkSoft, margin: '4px 0 0' }}>Configure the benefit types employees can request</p>
          </div>
          <Button variant="primary" icon="plus" onClick={() => setModal('new')} style={{ flexShrink: 0 }}>Add benefit type</Button>
        </div>

        <div style={{ borderBottom: `1px solid ${P.border}` }}>
          <TabBar
            tabs={[
              { id: 'active',   label: `Active${activeCount > 0 ? ` (${activeCount})` : ''}` },
              { id: 'inactive', label: `Inactive${inactiveCount > 0 ? ` (${inactiveCount})` : ''}` },
            ]}
            activeTab={tab}
            onTabChange={setTab}
            padding="0"
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {tab === 'inactive' && inactiveCount === 0 && (
            <div style={{ background: P.white, border: `1px solid ${P.border}`, borderRadius: 16 }}>
              <EmptyState icon="moon" title="No inactive benefit types" />
            </div>
          )}
          {(() => {
            const visible = benefits.filter(b => b.active === (tab === 'active'));
            if (visible.length === 0) return null;
            return (
              <SettingsCard>
                {visible.map((b, visIdx) => {
                  const globalIdx = benefits.indexOf(b);
                  const budgetLabel = b.budgetCap != null ? `€ ${b.budgetCap} / year` : 'No cap';
                  const rulesParts = [];
                  if (b.requiresApproval) rulesParts.push('Approval required');
                  if (b.receiptRequired) rulesParts.push('Receipt required');
                  const subtitle = [budgetLabel, ...rulesParts].join(' · ');
                  return (
                    <SettingsRow key={b.id + globalIdx}
                      onClick={() => setModal(globalIdx)}
                      icon={b.icon}
                      dimmed={!b.active}
                      label={b.label}
                      subtitle={subtitle}
                      last={visIdx === visible.length - 1}
                    />
                  );
                })}
              </SettingsCard>
            );
          })()}
        </div>

      </div>
    </div>
    </>
  );
}

// ── Changelog ──────────────────────────────────────────────────────────────
const CHANGELOG_ENTRIES = [
  {
    date: '9 Aug 2026',
    title: 'Design system: consolidating on shared components, and a Components page',
    items: [
      { summary: 'Every centered modal and side drawer now shares one wrapper component', detail: '(ModalShell, DrawerShell), replacing 16 independently hand-copied backdrop/panel/header implementations.', why: 'These were pixel-identical markup blocks, mechanically copy-pasted every time — one had no animation at all, since it was the one place someone forgot to wire up the shared transition hook.' },
      { summary: 'A real Button and IconButton system', detail: 'Replacing dozens of independently-styled buttons that had drifted into at least 5 different "Cancel" treatments and 2 different close-button sizes with no rule for which screens got which.', why: 'Buttons are the highest-frequency UI element in the app — inconsistency here is the most visible kind of "this doesn\'t feel like one product."' },
      { summary: 'Settings section labels (SL) hoisted to one shared constant', detail: 'Removing 9 local redefinitions — including inside screens already migrated to shared row components, where the row got fixed but the label above it didn\'t.' },
      { summary: 'Badge/pill treatments consolidated onto DotPill/StatusPill', detail: 'Extended with filled/border/size props to absorb ad-hoc pills that had been built from scratch instead of reusing them.' },
      { summary: 'New in-app Components page added, linked from the sidebar', detail: 'A live interactive reference for every shared component — click a button to see its states, open a real example modal/drawer, toggle a real switch.', why: '"Does this already exist" needs a fast, visual answer, not a file search.' },
      { summary: 'Deliberately deferred: two cases needing a UX decision, not just extraction', detail: 'The native-select vs. custom-popover pattern, and the sidebar-popover vs. centered-modal entity picker. Documented as open decisions in CLAUDE.md rather than resolved by assumption.' },
    ],
  },
  {
    date: '9 Aug 2026',
    title: 'Allowances: surfacing legal ceiling risk, and where reference info belongs',
    items: [
      { summary: 'NSSS ceiling feedback redesigned as callouts that escalate from neutral to red.', why: "Admins configure these rates rarely, and the ceiling warning previously looked identical to routine informational text — it needed to visually escalate so it can't be missed the one time it actually matters." },
      { summary: '"How it works" info moved out of an always-visible card and into an on-demand modal', detail: 'Triggered by a small ⓘ next to the page title.', why: "This is reference info, not a setting. A white card and a card-less inline version were both tried first and still read as competing with the actual settings — information that explains a feature shouldn't cost permanent space or look interactive." },
      { summary: 'Eligible employees list redesigned', detail: 'Count + inline edit/add action in the header, explicit remove control per row.', why: 'The previous layout had no clear "how many, how do I change this" entry point.' },
    ],
  },
  {
    date: '9 Aug 2026',
    title: 'Settings screens: consistency, and getting multi-entity scoping right',
    items: [
      { summary: 'Multi-entity data isolation enforced for employee-linked settings lists', detail: '(leave type exceptions, Team & access admins, allowance eligibility).', why: 'A hard product rule, not a preference — an admin scoped to one legal entity must never see or assign employees belonging to a different entity. Two of three affected screens weren\'t enforcing this yet. Under "All entities," rows now show department · entity so a cross-entity list reads intentionally instead of looking like an unscoped mistake.' },
      { summary: 'Row and icon treatment unified across every settings list screen', detail: '(Allowances, Expenses, Time off, Team & access, Benefits).', why: 'These screens evolved independently and drifted apart in small ways nobody chose deliberately (Benefits had a smaller icon box than everywhere else). Now backed by one shared component, so a fix in one place reaches all of them.' },
      { summary: 'Expenses settings: company-wide policy moved above the category list', detail: 'Reimbursement cycle and receipt threshold split into their own sections, since they aren\'t related to each other.', why: 'They\'re global policy, not a list to manage — below a variable-length category list, they could scroll off-screen and go unnoticed.' },
      { summary: 'Design tokens: Switch track and segmented-control background unified', detail: 'Onto the existing border tokens instead of two near-identical one-off grays, tuned per role — a switch track needs contrast to read as a control, a tab bar background stays lighter as a passive surface.' },
      { summary: 'In-app Product Changelog page added, linked from the sidebar', detail: 'So this document is visible to the whole team without opening a markdown file.' },
    ],
  },
  {
    date: '7–9 Aug 2026',
    title: 'Leave type settings: from drawer to full settings page',
    items: [
      { summary: 'Drawer replaced with a full settings page per leave type.', why: 'Configuration had accumulated too many interdependent fields (approval, day limits, document requirements, employee permissions, Belgian statutory sub-types) to fit a drawer without feeling cramped. This became the pattern later reused for Allowances.' },
      { summary: '"Requires approval" reframing', detail: 'Replaced generic "edit/cancel" toggles with copy stating the actual behavior and payroll consequence, after the generic toggles proved unclear about what they actually controlled.' },
      { summary: 'Belgian special leave sub-types added', detail: 'With their own statutory fields, grouped under clear section headers.', why: '"Special leave" isn\'t one thing legally — it\'s several distinct entitlements, each with its own rules.' },
      { summary: 'Employee-level exceptions added', detail: "So an admin can override a leave type's default rules for one employee without cloning an entire separate leave type.", why: 'A new leave type per exception doesn\'t scale and obscures that it\'s still the same underlying leave type with a tweak.' },
      { summary: 'Day limit pattern unified', detail: 'One consistent sub-field style across all leave types, after several inline-input variants were tried along the way.' },
    ],
  },
  {
    date: '28 Jul 2026',
    title: 'Entity switcher: one consistent mechanism for multi-entity data',
    items: [
      { summary: 'Entity switcher rebuilt as a right-side popover', detail: 'Replacing an inline accordion that pushed the rest of the sidebar down when expanded.', why: "An always-present, frequently-used control shouldn't reflow the nav around it." },
      { summary: 'Removed the per-screen "time off override" pattern', detail: 'In favor of one consistent multi-entity mechanism used everywhere.', why: 'Letting one screen handle multi-entity data differently from the rest is exactly the kind of inconsistency that later causes scoping bugs — better to solve it once, centrally.' },
      { summary: 'Documents scope model unified', detail: 'Replaced an ambiguous "inherited" scope concept with a single explicit scope field.', why: "\"Inherited\" didn't answer the question an admin actually has: which entity does this document apply to, right now." },
    ],
  },
  {
    date: '24–26 Jul 2026',
    title: 'Team & Access: settling the admin permission model',
    items: [
      { summary: 'Admin access management went through the heaviest iteration of any feature in this prototype (~35 commits across three days) before landing on its current shape — worth documenting in full, since several plausible models were tried and rejected before this one stuck.' },
      { summary: 'User/role model unified', detail: 'Admin access now lives on the same employee record via adminAccess, instead of a parallel user list.', why: 'Avoided two sources of truth for "is this person an admin."' },
      { summary: 'Settled on a single 4-option access model', detail: '(Full admin vs. role-based, with multi-role support for non-full admins) — after trying and discarding an owner/admin distinction, a by-department approval option, and a revoke-access flow, none of which matched how admins actually think about access.' },
      { summary: 'Grant flow simplified to a two-step modal', detail: 'Pick a person, then configure their access — replacing several earlier attempts (radio-only picker, immediate role config, separate revoke action) that each solved part of the flow but not the whole thing.' },
      { summary: 'Employee detail page shows admin status read-only, cross-linked to Team & Access', detail: 'Rather than duplicating the configuration UI in two places.', why: 'There should be exactly one place where access is actually configured.' },
    ],
  },
  {
    date: '22–23 Jul 2026',
    title: 'Team calendar, Expenses, Choices',
    items: [
      { summary: 'CalendarDrawer overhauled', detail: 'To unify request detail, team availability, and overlap warnings into one drawer.', why: 'An admin reviewing a time-off request needs team context — who else is out — to make the call, without leaving the drawer to go find it.' },
      { summary: 'Team availability indicator settled on a two-state color system', detail: '(red tint + count when someone\'s out, green tint + "All available" otherwise), after an initial red-badge-only version didn\'t communicate the common case — nobody\'s out — as clearly as the exception case.' },
      { summary: 'Link styling standardized', detail: 'On a shared AppLink component (black, underlined), replacing every accent-colored link app-wide.', why: 'Links were competing visually with primary actions.' },
      { summary: 'Expenses added as a new top-level screen.', why: 'A scope decision to bring expense management to parity with time-off/choices rather than leave it as an afterthought.' },
      { summary: 'Choices added as a new top-level screen', detail: 'Including a food-benefit onboarding flow that routes through the social secretariat step Belgian payroll actually requires.', why: 'The flow had to reflect a real compliance step, not just the happy path.' },
    ],
  },
  {
    date: '14–17 Jul 2026',
    title: 'Time off & employee detail: matching production reality',
    items: [
      { summary: 'Belgian leave types matched to the employee-facing app', detail: '(ADV/RTT, extra-legal leave added; generic "paid/unpaid absence" removed).', why: 'HR admin and the employee app need to describe leave the same way, or admins and employees end up talking past each other about the same request.' },
      { summary: 'Edit balances modal redesigned', detail: 'With a "no limit" toggle and negative-balance clamping.', why: "The previous flat form allowed balances to go negative or unbounded — not a state a leave balance can actually be in." },
      { summary: 'Requests table redesigned', detail: 'For inline approve/decline, replacing a table that required opening each request just to act on it.', why: "The common action shouldn't require a navigation." },
    ],
  },
  {
    date: '19 Jun – 3 Jul 2026',
    title: 'Initial HR Admin prototype: scope and structure',
    items: [
      { summary: 'HR Admin desktop prototype started from scratch', detail: 'Scoped to an approval inbox and core navigation first, with an app switcher linking to the employee-facing app.' },
      { summary: '"Time off" split into two sub-items', detail: '(requests vs. team calendar).', why: '"Things I need to act on" and "what\'s the team\'s status" are different questions an admin asks — one view was already fighting that distinction.' },
      { summary: 'Employee identity fields locked once a record exists.', why: 'A deliberate constraint to prevent accidental identity changes to an employee record after creation, not an oversight.' },
    ],
  },
];

function ChangelogScreen() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', animation: `screenEnter 180ms ${EASE_OUT}` }}>
      <PageHeader title="Product Changelog" subtitle="Product and UX decisions behind the HR Admin prototype — what we decided, and why." />
      <div style={{ flex: 1, overflow: 'auto', padding: '28px 28px 60px' }}>
        <div style={{ maxWidth: 680, display: 'flex', flexDirection: 'column', gap: 36 }}>
          {CHANGELOG_ENTRIES.map((entry, i) => (
            <div key={i} style={{ display: 'flex', gap: 24 }}>
              <div style={{ width: 108, flexShrink: 0, paddingTop: 2 }}>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: P.inkFaint, fontWeight: 500 }}>{entry.date}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0, borderLeft: `1px solid ${P.border}`, paddingLeft: 20 }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: P.ink, margin: '0 0 12px' }}>{entry.title}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {entry.items.map((item, j) => (
                    <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ width: 4, height: 4, borderRadius: '50%', background: P.inkFaint, flexShrink: 0, marginTop: 7 }} />
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkSoft, lineHeight: 1.6 }}>
                        <span style={{ color: P.ink, fontWeight: 500 }}>{item.summary}</span>
                        {item.detail && ' ' + item.detail}
                        {item.why && <span style={{ display: 'block', marginTop: 2, color: P.inkSoft }}>Why: {item.why}</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Component library — live reference for every shared component. Check
// here before building a new row/button/modal/badge — see CLAUDE.md.
function LibrarySection({ title, usage, children }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: P.ink, margin: '0 0 4px' }}>{title}</h3>
      {usage && <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkSoft, margin: '0 0 16px' }}>{usage}</p>}
      <div style={{ border: `1px solid ${P.border}`, borderRadius: 12, padding: 24, background: P.white }}>
        {children}
      </div>
    </div>
  );
}

function ComponentLibraryScreen() {
  const [switchOn, setSwitchOn] = useState(true);
  const [switchOnSm, setSwitchOnSm] = useState(false);
  const [exampleModalOpen, setExampleModalOpen] = useState(false);
  const [exampleDrawerOpen, setExampleDrawerOpen] = useState(false);
  const [rowValue, setRowValue] = useState('');
  const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${P.border}`, fontFamily: 'var(--font-body)', fontSize: 14, color: P.ink, outline: 'none', boxSizing: 'border-box', background: P.white };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', animation: `screenEnter 180ms ${EASE_OUT}` }}>
      <PageHeader title="Components" subtitle="Live reference for every shared component — check here before building a new one from scratch." />
      <div style={{ flex: 1, overflow: 'auto', padding: '28px 28px 60px' }}>
        <div style={{ maxWidth: 680 }}>

          <LibrarySection title="Buttons" usage="Used everywhere an action is taken — modal/drawer footers, page headers, form submissions. Never a raw <button style={{...}}>.">
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="text">Text</Button>
              <Button variant="primary" icon="plus">With icon</Button>
              <Button variant="primary" disabled>Disabled</Button>
            </div>
          </LibrarySection>

          <LibrarySection title="Icon buttons" usage="Circular icon-only button — modal/drawer close, back navigation. One size (30px) and opacity everywhere.">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <IconButton icon="X" onClick={() => {}} />
              <IconButton icon="arrow-left" onClick={() => {}} />
              <IconButton icon="chevron-left" onClick={() => {}} />
            </div>
          </LibrarySection>

          <LibrarySection title="Switch" usage="Toggle for on/off settings. sm size for inline settings rows, md for standalone use.">
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Switch size="md" checked={switchOn} onChange={() => setSwitchOn(v => !v)} />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkSoft }}>md</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Switch size="sm" checked={switchOnSm} onChange={() => setSwitchOnSm(v => !v)} />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkSoft }}>sm</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Switch size="sm" checked={true} onChange={() => {}} disabled />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkSoft }}>disabled</span>
              </div>
            </div>
          </LibrarySection>

          <LibrarySection title="Badges & pills" usage="Three sanctioned status treatments, all driven by the same StatusMeta table — don't add a fourth.">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: P.inkFaint, marginBottom: 8 }}>StatusDot</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                  {Object.keys(StatusMeta).map(s => <StatusDot key={s} status={s} />)}
                </div>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: P.inkFaint, marginBottom: 8 }}>StatusPill</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {Object.keys(StatusMeta).map(s => <StatusPill key={s} status={s} />)}
                </div>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: P.inkFaint, marginBottom: 8 }}>DotPill — unfilled and filled variants</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <DotPill bg="#fde68a" color="#92400e">Unfilled</DotPill>
                  <DotPill dot={false} filled color={P.action}>Filled</DotPill>
                  <DotPill dot={false} color="#dc2626" bg="#fef2f2" border="#fecaca">Bordered</DotPill>
                </div>
              </div>
            </div>
          </LibrarySection>

          <LibrarySection title="Settings rows" usage="SettingsCard + SettingsRow — the canonical settings-list pattern used by Allowances, Expenses, Time off, Team & access, Benefits.">
            <SettingsCard>
              <SettingsRow icon="calendar" label="With a value" value="With next payroll run" />
              <SettingsRow icon="users" iconBadgeColor="#a7f3d0" label="With a colored badge + subtitle" subtitle="Approval required · 20 days" />
              <SettingsRow leading={<Avatar employeeId="emma-martens" size={32} />} label="With a custom leading element" subtitle="emma.martens@lumiogroup.be" last />
            </SettingsCard>
          </LibrarySection>

          <LibrarySection title="Avatar" usage="Circular avatar — photo if available, initials-on-color otherwise.">
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <Avatar employeeId="emma-martens" size={22} />
              <Avatar employeeId="emma-martens" size={32} />
              <Avatar employeeId="emma-martens" size={44} />
              <Avatar employeeId="unknown-id" size={32} />
            </div>
          </LibrarySection>

          <LibrarySection title="Empty state" usage="Centered icon + title + description for empty lists — e.g. no inactive leave types.">
            <EmptyState icon="moon" title="No results" description="Nothing to show here yet." />
          </LibrarySection>

          <LibrarySection title="Form inputs" usage="Canonical text input styling used across settings screens.">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 280 }}>
              <label style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12, color: P.inkSoft }}>Label</label>
              <input value={rowValue} onChange={e => setRowValue(e.target.value)} placeholder="Placeholder text" style={inputStyle} />
            </div>
          </LibrarySection>

          <LibrarySection title="Modals & drawers" usage="ModalShell for centered dialogs, DrawerShell for right-side panels. Both own their own open/close animation — pass onClose, title, and children.">
            <div style={{ display: 'flex', gap: 10 }}>
              <Button variant="secondary" onClick={() => setExampleModalOpen(true)}>Open example modal</Button>
              <Button variant="secondary" onClick={() => setExampleDrawerOpen(true)}>Open example drawer</Button>
            </div>
          </LibrarySection>

        </div>
      </div>

      {exampleModalOpen && (
        <ModalShell title="Example modal" onClose={() => setExampleModalOpen(false)}
          footer={close => (
            <div style={{ padding: '14px 22px', borderTop: `1px solid ${P.border}`, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={close}>Cancel</Button>
              <Button variant="primary" onClick={close}>Save</Button>
            </div>
          )}>
          <div style={{ padding: '18px 22px', fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkSoft, lineHeight: 1.5 }}>
            This is a live ModalShell instance — the same backdrop, panel, and header chrome used by every centered dialog in the app.
          </div>
        </ModalShell>
      )}

      {exampleDrawerOpen && (
        <DrawerShell title="Example drawer" onClose={() => setExampleDrawerOpen(false)}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkSoft, lineHeight: 1.5 }}>
            This is a live DrawerShell instance — the same right-side panel chrome used by every drawer in the app (request details, add expense, benefit types, etc).
          </div>
        </DrawerShell>
      )}
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
  'settings-allowances': 'Allowances',
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
      position: 'fixed', bottom: 24, left: 'calc((100vw + 255px) / 2)',
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

// ── Add Employee Wizard ────────────────────────────────────────────────────
const ENTITY_DOMAINS = {
  'lumio-group':  'lumiogroup.be',
  'lumio-france': 'lumio.fr',
  'lumio-nl':     'lumio.nl',
};

function AddEmployeeWizard({ onClose, onCreated, companyRegime }) {
  const { visible, close } = useModalTransition(onClose, SHEET_CLOSE_DUR);
  const [step, setStep] = useState(1);
  const stepDirRef = React.useRef('forward');
  const [emailFlash, setEmailFlash] = useState(false);

  const goForward = () => { stepDirRef.current = 'forward';  setStep(s => s + 1); };
  const goBack    = () => { stepDirRef.current = 'backward'; setStep(s => s - 1); };

  // Inject CSS keyframes once
  React.useEffect(() => {
    if (!document.getElementById('wiz-anims')) {
      const s = document.createElement('style');
      s.id = 'wiz-anims';
      s.textContent = `
        @keyframes wizSlideFromRight { from { opacity:0; transform:translateX(28px); } to { opacity:1; transform:translateX(0); } }
        @keyframes wizSlideFromLeft  { from { opacity:0; transform:translateX(-28px); } to { opacity:1; transform:translateX(0); } }
        @keyframes wizFadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes wizEmailFlash { 0%,20% { background:#f3f0ff; } 100% { background:#fff; } }
      `;
      document.head.appendChild(s);
    }
  }, []);

  // Step 1 — Personal info
  const [firstName, setFirstName]       = useState('');
  const [lastName,  setLastName]        = useState('');
  const [dob,       setDob]             = useState('');
  const [gender,    setGender]          = useState('');
  const [lang,      setLang]            = useState('Dutch');
  const [niss,      setNiss]            = useState('');
  const [iban,      setIban]            = useState('');

  // Step 2 — Employment
  const [entityId,        setEntityId]        = useState('lumio-group');
  const [department,      setDepartment]      = useState('');
  const [startDate,       setStartDate]       = useState('08/08/2026');
  const [roles,           setRoles]           = useState(['Employee']);
  const [contractType,    setContractType]    = useState('cdi');
  const [contractEndDate, setContractEndDate] = useState('');

  // Step 3 — Schedule
  const [fte,          setFte]          = useState(1.0);
  const [workSchedule, setWorkSchedule] = useState([1,2,3,4,5]);

  // Step 4 — Compensation
  const suggestedWorkEmail = React.useMemo(() => {
    const domain = ENTITIES.find(e => e.id === entityId)?.emailDomain ?? (companyRegime || COMPANY_REGIME_DEFAULTS).emailDomain ?? 'company.com';
    const f = firstName.trim().toLowerCase().replace(/\s+/g, '').replace(/[^a-z]/g, '');
    const l = lastName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z-]/g, '');
    return f && l ? `${f}.${l}@${domain}` : '';
  }, [firstName, lastName, entityId]);
  const [workEmail,      setWorkEmail]      = useState('');
  const [grossSalary,    setGrossSalary]    = useState('');
  const [employerNsso,   setEmployerNsso]   = useState('25.00');
  const [employeeNsso,   setEmployeeNsso]   = useState('13.07');
  const [components,     setComponents]     = useState(['meal-vouchers']);
  const [sendInvite,     setSendInvite]     = useState(true);

  // Auto-populate work email when reaching step 2
  React.useEffect(() => {
    if (step === 2 && !workEmail && suggestedWorkEmail) {
      setWorkEmail(suggestedWorkEmail);
      setEmailFlash(true);
      const t = setTimeout(() => setEmailFlash(false), 800);
      return () => clearTimeout(t);
    }
  }, [step]);

  const regime = companyRegime || COMPANY_REGIME_DEFAULTS;

  React.useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [close]);

  const step1Valid = firstName.trim() && lastName.trim() && dob.trim() && gender && niss.trim();
  const entityDomain = ENTITIES.find(e => e.id === entityId)?.emailDomain ?? (companyRegime || COMPANY_REGIME_DEFAULTS).emailDomain;
  const emailDomainValid = !workEmail.trim() || !entityDomain || workEmail.trim().toLowerCase().endsWith('@' + entityDomain);
  const step2Valid = department && startDate.trim() && workEmail.trim() && emailDomainValid;
  const step3Valid = true;
  const step4Valid = grossSalary.trim() && parseFloat(grossSalary) > 0;
  const canAdvance = step === 1 ? step1Valid : step === 2 ? step2Valid : step === 3 ? step3Valid : step4Valid;

  const handleCreate = () => {
    const slug = firstName.toLowerCase().replace(/\s+/g, '-') + '-' + lastName.toLowerCase().replace(/\s+/g, '-');
    const id   = slug + '-' + String(Date.now()).slice(-5);
    const palette = ['#bfdbfe','#ddd6fe','#fde68a','#a7f3d0','#fecdd3','#fed7aa','#c7d2fe'];
    const color = palette[id.charCodeAt(0) % palette.length];
    const entity = ENTITIES.find(e => e.id === entityId);
    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    onCreated(id, {
      name: fullName,
      initials: `${firstName[0]}${lastName[0]}`.toUpperCase(),
      color,
      email: workEmail.trim(),
      entitlement: 20,
      department,
      entity: entity?.name || entityId,
      entityId,
      budget: 0,
      role: roles.includes('Admin') ? 'Admin' : 'Employee',
      status: 'Active',
      gender: gender === 'M' ? 'm' : 'f',
      fte,
      workSchedule,
      dob: dob.trim(),
      niss: niss.trim(),
      iban: iban.trim(),
      contractType,
      contractEndDate: contractType === 'cdd' ? contractEndDate : undefined,
      grossSalary: parseFloat(grossSalary),
      employerNsso: parseFloat(employerNsso),
      employeeNsso: parseFloat(employeeNsso),
      components,
    }, {
      payrollId: String(100000 + id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 900000),
      hireDate: startDate,
      lang,
    }, fullName);
    close();
  };

  const inputStyle = { width: '100%', border: `1px solid ${P.border}`, borderRadius: 8, padding: '9px 12px', fontFamily: 'var(--font-body)', fontSize: 14, color: P.ink, outline: 'none', boxSizing: 'border-box', background: P.white };
  const labelStyle = { display: 'block', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12, color: P.inkSoft, marginBottom: 6, letterSpacing: '0.01em' };
  const SL2        = { fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 11, color: P.inkSoft, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 20 };
  const StepHeading = ({ title, sub }) => (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: P.ink, marginBottom: 4 }}>{title}</div>
      {sub && <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkSoft }}>{sub}</div>}
    </div>
  );
  const hint       = { fontFamily: 'var(--font-body)', fontSize: 12, color: P.inkSoft, marginTop: 5 };
  const fieldIn    = (i) => ({ animation: 'wizFadeUp 220ms ease-out both', animationDelay: `${i * 50}ms` });
  const segBtn     = (active) => ({ flex: 1, padding: '9px 14px', borderRadius: 8, border: `1.5px solid ${active ? P.action : P.border}`, background: active ? '#f3f0ff' : 'transparent', color: active ? P.action : P.ink, fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, cursor: 'pointer', transition: 'all 120ms ease' });
  const chevron    = { ...inputStyle, appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b6b80' stroke-width='2.5'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: 32, cursor: 'pointer' };

  const StepDots = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {[1,2,3,4].map((s, i) => (
        <React.Fragment key={s}>
          {i > 0 && (
            <div style={{ width: 20, height: 1, background: P.border, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, background: P.action, transformOrigin: 'left center', transform: s <= step ? 'scaleX(1)' : 'scaleX(0)', transition: 'transform 280ms ease-out' }} />
            </div>
          )}
          <div style={{ width: s === step ? 8 : 6, height: s === step ? 8 : 6, borderRadius: '50%', background: s <= step ? P.action : P.border, transition: 'all 280ms cubic-bezier(0.34,1.56,0.64,1)' }} />
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 201, background: P.bg, display: 'flex', flexDirection: 'column', opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(16px)', transition: `opacity ${SHEET_CLOSE_DUR}ms ${EASE_OUT}, transform ${SHEET_CLOSE_DUR}ms ${EASE_OUT}` }}>

      {/* Header */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', height: 60, borderBottom: `1px solid ${P.border}` }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: P.ink, minWidth: 140 }}>Add employee</div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
          <StepDots />
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: P.inkSoft }}>Step {step} of 4</div>
        </div>
        <div style={{ minWidth: 140, display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={close} style={{ border: 'none', cursor: 'pointer', width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(60,60,67,0.1)' }}>
            <Icon name="X" size={14} color={P.ink} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 32px' }}>
        <form autoComplete="off" onSubmit={e => e.preventDefault()} style={{ maxWidth: 560, margin: '0 auto', padding: '48px 0 80px' }}>
        <div key={step} style={{ animation: `${stepDirRef.current === 'forward' ? 'wizSlideFromRight' : 'wizSlideFromLeft'} 200ms ease-out both` }}>

          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <StepHeading title="Personal info" sub="Identity and banking details required for payroll and Dimona declaration." />
              <div style={{ ...fieldIn(0), display: 'flex', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>First name</label>
                  <input autoFocus autoComplete="off" value={firstName} onChange={e => setFirstName(e.target.value)} style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Last name</label>
                  <input autoComplete="off" value={lastName} onChange={e => setLastName(e.target.value)} style={inputStyle} />
                </div>
              </div>
              <div style={{ ...fieldIn(1), display: 'flex', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Date of birth</label>
                  <input autoComplete="off" value={dob} onChange={e => setDob(e.target.value)} placeholder="DD/MM/YYYY" style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Gender</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['M','F'].map(g => (
                      <button key={g} onClick={() => setGender(g)} style={segBtn(gender === g)}>{g === 'M' ? 'Male' : 'Female'}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div style={fieldIn(2)}>
                <label style={labelStyle}>Language</label>
                <select value={lang} onChange={e => setLang(e.target.value)} style={chevron}>
                  <option value="Dutch">Dutch</option>
                  <option value="French">French</option>
                  <option value="English">English</option>
                </select>
              </div>
              <div style={fieldIn(3)}>
                <label style={labelStyle}>NISS number</label>
                <input autoComplete="off" value={niss} onChange={e => setNiss(e.target.value)} placeholder="XX.XX.XX-XXX.XX" style={inputStyle} />
                <div style={hint}>National registry number — required for Dimona declaration.</div>
              </div>
              <div style={fieldIn(4)}>
                <label style={labelStyle}>Bank account (IBAN)</label>
                <input autoComplete="off" value={iban} onChange={e => setIban(e.target.value.toUpperCase())} placeholder="BE68 5390 0754 7034" style={inputStyle} />
                <div style={hint}>Used for salary payments. Can be added later if not available now.</div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <StepHeading title="Employment" sub="Contract details and access level within Payflip." />
              <div style={fieldIn(0)}>
                <label style={labelStyle}>Entity</label>
                <select value={entityId} onChange={e => setEntityId(e.target.value)} style={chevron}>
                  {ENTITIES.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div style={fieldIn(1)}>
                <label style={labelStyle}>Department</label>
                <select value={department} onChange={e => setDepartment(e.target.value)} style={chevron}>
                  <option value="">Select department…</option>
                  {['Design','Engineering','Marketing','Operations','Finance','HR'].map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div style={fieldIn(2)}>
                <label style={labelStyle}>Start date</label>
                <input autoComplete="off" value={startDate} onChange={e => setStartDate(e.target.value)} placeholder="DD/MM/YYYY" style={inputStyle} />
              </div>
              <div style={fieldIn(3)}>
                <label style={labelStyle}>Work email</label>
                <input autoComplete="off" value={workEmail} onChange={e => setWorkEmail(e.target.value)} placeholder={`name@${entityDomain || 'company.com'}`} type="email" style={{ ...inputStyle, animation: emailFlash ? 'wizEmailFlash 700ms ease-out forwards' : 'none', borderColor: workEmail.trim() && !emailDomainValid ? '#ef4444' : undefined }} />
                {workEmail.trim() && !emailDomainValid
                  ? <div style={{ ...hint, color: '#ef4444' }}>Must use a {entityDomain} address — personal emails cause SSO issues.</div>
                  : <div style={hint}>Used for payslips and Payflip account login.</div>
                }
              </div>
              <div style={fieldIn(4)}>
                <label style={labelStyle}>Access</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['Employee','Admin'].map(r => {
                    const active = roles.includes(r);
                    return (
                      <button key={r} onClick={() => setRoles(prev => active ? prev.filter(x => x !== r) : [...prev, r])} style={segBtn(active)}>{r}</button>
                    );
                  })}
                </div>
                <div style={hint}>Employee access: view payslips, request leave. Admin: manage the team in Payflip.</div>
              </div>
              <div style={fieldIn(5)}>
                <label style={labelStyle}>Contract type</label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  {[{v:'cdi',l:'CDI'},{v:'cdd',l:'CDD'}].map(ct => (
                    <button key={ct.v} onClick={() => setContractType(ct.v)} style={segBtn(contractType === ct.v)}>{ct.l}</button>
                  ))}
                </div>
                <div style={hint}>{contractType === 'cdi' ? 'Unlimited duration — standard Belgian employment contract.' : 'Fixed-term — specify an end date below.'}</div>
              </div>
              {contractType === 'cdd' && (
                <div style={fieldIn(6)}>
                  <label style={labelStyle}>Contract end date</label>
                  <input autoComplete="off" value={contractEndDate} onChange={e => setContractEndDate(e.target.value)} placeholder="DD/MM/YYYY" style={inputStyle} />
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <StepHeading title="Schedule" sub="Working regime and contracted hours for payroll." />
              <div style={fieldIn(0)}>
                <label style={labelStyle}>Working regime</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[{v:1.0,l:'Full-time',sub:'5 days'},{v:0.8,l:'4 days',sub:'per week'},{v:0.6,l:'3 days',sub:'per week'},{v:0.5,l:'Half-time',sub:'2½ days'}].map(opt => (
                    <button key={opt.v} onClick={() => { setFte(opt.v); setWorkSchedule(opt.v === 1.0 ? [1,2,3,4,5] : opt.v === 0.8 ? [1,2,3,4] : opt.v === 0.6 ? [1,2,3] : [1,2,3]); }}
                      style={{ ...segBtn(fte === opt.v), flexDirection: 'column', display: 'flex', alignItems: 'center', gap: 2 }}>
                      <span>{opt.l}</span>
                      <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.7 }}>{opt.sub}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div style={fieldIn(1)}>
                <label style={labelStyle}>Contracted hours</label>
                <div style={{ border: `1px solid ${P.border}`, borderRadius: 8, padding: '9px 12px', background: P.bg, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: P.ink }}>{regime.contractedHours}h / week</span>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: P.inkSoft, background: P.white, padding: '2px 8px', borderRadius: 4, border: `1px solid ${P.border}` }}>Company default</span>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <StepHeading title="Compensation" sub="Gross salary, social contributions, and benefits." />
                <div style={fieldIn(0)}>
                  <label style={labelStyle}>Monthly gross salary</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontFamily: 'var(--font-body)', fontSize: 14, color: P.inkSoft }}>€</span>
                    <input autoComplete="off" value={grossSalary} onChange={e => setGrossSalary(e.target.value)} placeholder="0,00" type="number" min="0" step="0.01" style={{ ...inputStyle, paddingLeft: 28 }} />
                  </div>
                  <div style={hint}>Gross amount before social contributions, paid on the last working day of the month.</div>
                </div>
                <div style={fieldIn(1)}>
                  <label style={labelStyle}>Social contributions</label>
                  <div style={{ border: `1px solid ${P.border}`, borderRadius: 8, overflow: 'hidden' }}>
                    {[
                      {label:'Employer NSSO', value: employerNsso, set: setEmployerNsso},
                      {label:'Employee NSSO', value: employeeNsso, set: setEmployeeNsso},
                    ].map((row, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', borderTop: i > 0 ? `1px solid ${P.border}` : 'none', background: P.bg, gap: 12 }}>
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.ink, whiteSpace: 'nowrap' }}>{row.label}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <input
                            autoComplete="off"
                            value={row.value}
                            onChange={e => row.set(e.target.value)}
                            type="number" min="0" max="100" step="0.01"
                            style={{ width: 72, border: `1px solid ${P.border}`, borderRadius: 6, padding: '4px 8px', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: P.ink, outline: 'none', background: P.white, textAlign: 'right' }}
                          />
                          <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.inkSoft }}>%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={hint}>Belgian statutory rates — adjust only if this employee has a special regime.</div>
                </div>
              </div>
            </div>
          )}

        </div>
        </form>
      </div>

      {/* Footer */}
      <div style={{ flexShrink: 0, padding: '14px 32px', borderTop: `1px solid ${P.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: P.white }}>
        {step > 1
          ? <button onClick={goBack} style={{ padding: '8px 18px', borderRadius: 8, border: `1px solid ${P.border}`, background: 'transparent', color: P.ink, cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13 }}>Back</button>
          : <div />
        }
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {step === 4 && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <div onClick={() => setSendInvite(v => !v)}
                style={{ width: 18, height: 18, borderRadius: 4, border: `1.5px solid ${sendInvite ? P.action : P.border}`, background: sendInvite ? P.action : P.white, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 120ms ease' }}>
                {sendInvite && <Icon name="Check" size={11} color={P.white} strokeWidth={3} />}
              </div>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: P.ink }}>Send invite email</span>
            </label>
          )}
          {step < 4
            ? <button onClick={goForward} disabled={!canAdvance} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: canAdvance ? P.action : P.border, color: P.white, cursor: canAdvance ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, transition: 'background 150ms ease' }}>Next</button>
            : <button onClick={handleCreate} disabled={!canAdvance} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: canAdvance ? P.action : P.border, color: P.white, cursor: canAdvance ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13 }}>{sendInvite ? 'Create & send invite' : 'Create employee'}</button>
          }
        </div>
      </div>
    </div>
  );
}

// ── Root App ───────────────────────────────────────────────────────────────
function App() {
  const [screen, setScreen] = useState(() => pathToScreen(window.location.pathname));
  const [adminAccess, setAdminAccess] = useState(() =>
    Object.entries(EMPLOYEES)
      .filter(([, u]) => u.adminAccess)
      .reduce((acc, [id, u]) => ({ ...acc, [id]: u.adminAccess }), {})
  );
  const handleAdminSave = (adminId, newAccess) => {
    setAdminAccess(prev => {
      if (newAccess === 'revoke') return { ...prev, [adminId]: 'revoked' };
      return { ...prev, [adminId]: newAccess };
    });
  };
  const [companyRegime, setCompanyRegime] = useState(COMPANY_REGIME_DEFAULTS);
  const [leaveTypes, setLeaveTypes] = useState(initLeaveTypes);
  const [employeeOverrides, setEmployeeOverrides] = useState({});
  const handleEmployeeUpdate = (empId, overrides) => {
    setEmployeeOverrides(prev => ({ ...prev, [empId]: { ...(prev[empId] || {}), ...overrides } }));
  };
  const getEmpWithOverrides = (empId) => {
    const base = EMPLOYEES[empId];
    const over = employeeOverrides[empId];
    return over ? { ...base, ...over } : base;
  };
  const [sidebarMode, setSidebarMode] = useState('app');
  const [appEntity, setAppEntity] = useState(null);
  const [requests, setRequests] = useState(() => mergeRequests(generatedRequests, readLS()));
  const [companyEvents, setCompanyEvents] = useState([]);
  const [toast, setToast] = useState(null);
  const [addEmployeeOpen, setAddEmployeeOpen] = useState(false);
  const [freshEmployeeId, setFreshEmployeeId] = useState(null);
  const handleAddEmployee = (id, emp, extra, fullName) => {
    EMPLOYEES[id] = emp;
    EMP_EXTRA[id] = extra;
    setFreshEmployeeId(id);
    setScreen('employee-detail:' + id);
    setToast({ message: sendInvite ? `${fullName} added — invite sent` : `${fullName} added`, type: 'approve' });
  };
  const [calDetail, setCalDetail] = useState(null);
  const [calendarJumpDate, setCalendarJumpDate] = useState(null);
  const [calendarDeptFilter, setCalendarDeptFilter] = useState(null);
  const handleNav = (id) => {
    if (id === 'team-absences') setCalendarJumpDate(null);
    setScreen(id);
    history.pushState({ screen: id }, '', screenToPath(id));
  };
  React.useEffect(() => {
    history.replaceState({ screen }, '', screenToPath(screen));
    const onPop = (e) => {
      const s = e.state?.screen ?? pathToScreen(window.location.pathname);
      if (s === 'team-absences') setCalendarJumpDate(null);
      setScreen(s);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
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

  const [settingsDocuments, setSettingsDocuments] = useState([]);

  const [expenses, setExpenses] = useState(EXPENSES_SEED);
  const [expenseCategories, setExpenseCategories] = useState(EXPENSE_CATEGORIES_SEED);
  const [allowances, setAllowances] = useState(ALLOWANCE_TYPES.map(t => ({ id: t.id, active: false, rate: t.defaultRate })));
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
        'Statutory annual leave': emp.entitlement,
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

  const entityFilteredRequests = appEntity ? requests.filter(r => EMPLOYEES[r.employee]?.entityId === appEntity) : requests;
  const entityFilteredExpenses = appEntity ? expenses.filter(e => EMPLOYEES[e.employee]?.entityId === appEntity) : expenses;
  const entityFilteredChoices = appEntity ? choices.filter(c => EMPLOYEES[c.empId]?.entityId === appEntity) : choices;

  const pendingRequestsCount = entityFilteredRequests.filter(r => r.status === 'pending').length;
  const pendingExpensesCount = entityFilteredExpenses.filter(e => e.status === 'pending').length;
  const pendingChoicesCount = entityFilteredChoices.filter(c => c.status === 'pending').length;
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
        :root {
          --tabs-dur: 250ms;
          --tabs-ease: cubic-bezier(0.22, 1, 0.36, 1);
          --tabs-text-muted: #50545e;
          --tabs-text-active: rgb(34, 10, 53);
          --tabs-bar-bg: ${P.border};
          --tabs-pill-bg: #ffffff;
        }
        .t-tabs {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 3px;
          padding: 3px;
          border-radius: 48px;
          background: var(--tabs-bar-bg);
        }
        .t-tab {
          position: relative;
          appearance: none;
          border: 0;
          background: transparent;
          height: 28px;
          padding: 4px 12px;
          color: var(--tabs-text-muted);
          cursor: pointer;
          border-radius: 48px;
          z-index: 1;
          font-family: var(--font-display);
          font-weight: 600;
          font-size: 12px;
          transition: color var(--tabs-dur) var(--tabs-ease);
          white-space: nowrap;
        }
        .t-tab:not([aria-selected="true"]):hover,
        .t-tab[aria-selected="true"] { color: var(--tabs-text-active); }
        .t-tabs-pill {
          position: absolute;
          top: 3px;
          left: 0;
          height: 28px;
          width: 0;
          background: var(--tabs-pill-bg);
          border-radius: 48px;
          box-shadow: 0 1px 3px rgba(15, 13, 40, 0.12), 0 0 0 0.5px rgba(15, 13, 40, 0.06);
          transform: translateX(0);
          transition:
            transform var(--tabs-dur) var(--tabs-ease),
            width     var(--tabs-dur) var(--tabs-ease);
          will-change: transform, width;
          z-index: 0;
          pointer-events: none;
        }
        @media (prefers-reduced-motion: reduce) {
          .t-tabs-pill, .t-tab { transition: none !important; }
        }
        @keyframes tableEnter {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes tableEnterReduced {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes labelFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
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

      <Sidebar active={screen} onNav={handleNav} pendingCount={pendingCount} sidebarMode={sidebarMode} onSetSidebarMode={setSidebarMode} appEntity={appEntity} onSetAppEntity={setAppEntity} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        {screen === 'dashboard' && <DashboardScreen key={appEntity ?? 'all'} requests={entityFilteredRequests} onNav={setScreen} onToast={setToast} appEntity={appEntity} />}
        {screen === 'team-absences' && <TeamAbsencesScreen key={appEntity ?? 'all'} requests={entityFilteredRequests} pendingCount={pendingRequestsCount} onNav={setScreen} onShowDetail={setCalDetail} activeReqId={calDetail?.id} onSave={saveRequest} companyEvents={companyEvents} onCancelCompanyEvent={cancelCompanyEvent} initialDate={calendarJumpDate} initialDeptFilter={calendarDeptFilter} appEntity={appEntity} leaveTypes={leaveTypes} />}
        {screen === 'requests' && <RequestsScreen key={appEntity ?? 'all'} requests={entityFilteredRequests} onApprove={approve} onDecline={requestDecline} onSave={saveRequest} onCancel={requestCancel} onNav={setScreen} onViewInCalendar={(req) => { const d = req._selectedDates?.[0] || req.startDate; if (d) { const iso = typeof d === 'string' && d.match(/^\d{4}-/) ? d : null; setCalendarJumpDate(iso ? new Date(iso) : parseDisplayDate(d)); } setCalDetail(req); setScreen('team-absences'); }} appEntity={appEntity} />}
        {(screen === 'employees' || screen === 'employees:admin') && <EmployeesScreen key={appEntity ?? 'all'} requests={entityFilteredRequests} onNav={setScreen} initialRoleFilter={screen === 'employees:admin' ? 'Admin' : 'All'} adminAccess={adminAccess} appEntity={appEntity} onAddEmployee={() => setAddEmployeeOpen(true)} />}
        {screen.startsWith('employee-detail:') && (() => { const [, detailEmpId, detailTab] = screen.split(':'); return <EmployeeDetailScreen employeeId={detailEmpId} requests={requests} onNav={setScreen} onSave={saveRequest} onCancel={cancelRequest} onApprove={approve} onDecline={requestDecline} onViewTeamCalendar={(dept) => { setCalendarDeptFilter(dept || null); setScreen('team-absences'); }} employeeBalance={employeeBalances[detailEmpId]} onUpdateBalance={(newBal) => updateBalances(detailEmpId, newBal)} needsSetup={needsBalanceSetup.has(detailEmpId)} confirmedDate={balanceConfirmedDates[detailEmpId]} onConfirmBalances={() => confirmBalancesFor(detailEmpId)} onToast={setToast} adminAccess={adminAccess} onAdminSave={handleAdminSave} companyRegime={companyRegime} onEmployeeUpdate={handleEmployeeUpdate} getEmpWithOverrides={getEmpWithOverrides} initialTab={detailTab || (freshEmployeeId === detailEmpId ? 'details' : 'choices')} />; })()}
        {screen === 'expenses' && <ExpensesScreen key={appEntity ?? 'all'} expenses={entityFilteredExpenses} categories={expenseCategories} onApprove={approveExpense} onDetail={(exp) => setExpDetail(exp)} onAdd={addExpense} appEntity={appEntity} />}
        {screen === 'choices' && <ChoicesScreen key={appEntity ?? 'all'} choices={entityFilteredChoices} onApprove={approveChoice} onDecline={declineChoice} onDetail={setChoiceDetail} appEntity={appEntity} />}
        {screen === 'payroll-overview' && <StubScreen title="Payroll Overview" description="Monthly payroll run and submission" />}
        {screen === 'payroll-reports' && <StubScreen title="Payroll Reports" description="Reporting and exports" />}
        {screen === 'settings-allowances' && <AllowancesListPage key={appEntity ?? 'all'} allowances={allowances} onSaveAllowance={updated => setAllowances(prev => prev.map(a => a.id === updated.id ? updated : a))} appEntity={appEntity} />}
        {screen === 'settings-expenses' && <ExpenseCategorySettings key={appEntity ?? 'all'} categories={expenseCategories} onSave={setExpenseCategories} appEntity={appEntity} />}
        {screen === 'settings-team' && <TeamAccessSettings key={appEntity ?? 'all'} onNav={setScreen} adminAccess={adminAccess} onAdminSave={handleAdminSave} appEntity={appEntity} />}
        {screen === 'settings-entities' && <EntitiesSettings key={appEntity ?? 'all'} onNav={setScreen} appEntity={appEntity} companyRegime={companyRegime} onRegimeChange={setCompanyRegime} />}
        {screen === 'settings-timeoff' && <TimeOffSettings key={appEntity ?? 'all'} appEntity={appEntity} companyRegime={companyRegime} onToast={setToast} onNav={(target) => { setSidebarMode('app'); handleNav(target); }} leaveTypes={leaveTypes} setLeaveTypes={setLeaveTypes} />}
        {screen === 'settings-documents' && <DocumentsSettings key={appEntity ?? 'all'} appEntity={appEntity} documents={settingsDocuments} onDocumentsChange={setSettingsDocuments} />}
        {screen === 'settings-payroll' && <PayrollSettings companyRegime={companyRegime} onRegimeChange={setCompanyRegime} appEntity={appEntity} onToast={setToast} />}
        {screen === 'settings-benefits' && <BenefitsSettings key={appEntity ?? 'all'} appEntity={appEntity} />}
        {screen === 'changelog' && <ChangelogScreen />}
        {screen === 'components' && <ComponentLibraryScreen />}
        {screen.startsWith('settings-') && screen !== 'settings-allowances' && screen !== 'settings-expenses' && screen !== 'settings-team' && screen !== 'settings-timeoff' && screen !== 'settings-entities' && screen !== 'settings-documents' && screen !== 'settings-payroll' && screen !== 'settings-benefits' && <StubScreen title={SETTINGS_TITLES[screen] || 'Settings'} description={`Configure ${(SETTINGS_TITLES[screen] || 'settings').toLowerCase()}`} />}
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

      {addEmployeeOpen && <AddEmployeeWizard onClose={() => setAddEmployeeOpen(false)} onCreated={handleAddEmployee} companyRegime={companyRegime} />}
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
