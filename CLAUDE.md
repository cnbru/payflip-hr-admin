# HR Admin prototype — working notes for coding agents

This is a single-file React prototype at `app.jsx` (loaded by `index.html` via Babel standalone, no build step). Bump the `?v=N` cache-bust suffix on the `<script src="/hr-admin/app.jsx?v=N">` tag in `index.html` after every edit — the browser won't pick up changes otherwise.

## Shared components — always reuse, never re-hand-roll

Before writing a new button, icon button, badge, settings row, card, drawer, or modal, **search the file for an existing shared component first — or check the live reference at Sidebar → Components (`ComponentLibraryScreen`).** This file grew via many small iterative commits, and the same handful of UI patterns were repeatedly re-implemented inline per-screen with copy-pasted styles that quietly drifted (different icon sizes, different padding, different button treatments) — that drift is exactly what causes "why does this look slightly different" bugs. Don't repeat it.

**`Button`** (variants: `primary`, `secondary`, `danger`, `text`) and **`IconButton`** (circular icon-only, 30px default) — the sanctioned button treatments. Before writing a new `<button style={{...}}>`, use these:

```jsx
<Button variant="primary" icon="plus" onClick={...}>Add category</Button>
<Button variant="secondary" onClick={close}>Cancel</Button>
<IconButton icon="X" onClick={close} blur />
```

**`ModalShell`** — the centered-modal wrapper (backdrop, panel, optional title/close header). Owns its own `useModalTransition` internally and exposes `close` to `children`/`footer` via a render-prop function, since save/cancel handlers usually need to call it after doing their own work:

```jsx
<ModalShell title="Add category" onClose={onClose} width={420}
  footer={close => (<><Button variant="secondary" onClick={close}>Cancel</Button><Button variant="primary" onClick={() => { save(); close(); }}>Save</Button></>)}>
  {close => (<div>...body, can call close() too...</div>)}
</ModalShell>
```
`children`/`footer` can be a plain node if they don't need `close`. Extra props: `maxHeight`, `zIndex` (default 300 — bump for a modal that can stack on top of another, e.g. a delete-confirm over a settings page).

**`DrawerShell`** — the right-side-drawer wrapper (backdrop, panel, pinned header with title + close, optional `onBack` for two-step flows like decline/edit sub-panels). Same render-prop pattern as `ModalShell`, but only `children` (no separate `footer` slot — put the footer inside `children`, since most drawers have more complex body layouts than a simple modal):

```jsx
<DrawerShell title={secondPanel ? 'Reject expense' : 'Expense details'} onClose={onClose} onBack={secondPanel ? exitSecondPanel : undefined}>
  {close => (<div style={{ flex: 1, ... }}>...</div>)}
</DrawerShell>
```

**`SettingsCard` + `SettingsRow`** — the canonical building blocks for any settings screen that lists clickable items (a leave type, an allowance, an expense category, an admin, a benefit type):

```jsx
<SettingsCard>
  <SettingsRow onClick={...} icon="calendar" label="Reimbursement cycle" value="With next payroll run" last />
  <SettingsRow onClick={...} leading={<Avatar .../>} label={admin.name} subtitle={admin.email} trailing={<CustomBadge/>} />
</SettingsCard>
```

`SettingsRow` props: `onClick`, `icon` (lucide name, renders the standard 36px boxed icon), `iconBadgeColor` (small colored dot overlay, e.g. leave type color), `dimmed` (fades icon + label for inactive items), `leading` (fully custom leading element, e.g. `<Avatar/>`, overrides `icon`), `label`, `labelColor`, `subtitle` (secondary line under the label) or `value` (right-aligned secondary text — pick one), `valueColor`, `trailing` (custom trailing content, overrides the default chevron; pass `null` to render nothing), `last` (suppresses the row's bottom border).

**`DotPill`** (+ `StatusPill`, `StatusDot`) — the three sanctioned status/badge treatments, all driven by the shared `StatusMeta` table. `DotPill` props: `bg`/`color` (unfilled: tinted bg + colored text), `filled` (solid `color` bg + white text), `dot` (default `true`, set `false` to drop the leading dot), `border`, `size` (12 default, 11 for a smaller pill), `padding` (explicit override). Don't hand-roll a fourth pill treatment — extend `DotPill` with a prop instead.

**`SL`** — the module-level uppercase section-label style constant (near the top design tokens, with `P.*`). Use it directly (`<div style={SL}>Section</div>`) instead of a local `const SL = {...}` redefinition.

Currently migrated onto `SettingsCard`/`SettingsRow`: `AllowancesListPage`, `ExpenseCategorySettings`, `TimeOffSettings` (leave type rows), `TeamAccessSettings` (admin rows), `BenefitsSettings`, `LeaveTypeSettingsPage` (employee exceptions row).

**Known follow-up debt** — `AllowanceSettingsPage`, `LeaveTypeSettingsPage`, `EntitiesSettings`, `PayrollSettings` still define their own local `card` style object rather than using `SettingsCard` for their main content (their exception/employee lists were migrated; their top-level page card wasn't). `EntitiesSettings` and `PayrollSettings` have accordion/expand behavior and multi-badge rows that don't map cleanly onto `SettingsRow` yet — if you touch those screens, either extend `SettingsRow` to cover the new shape (adding a prop, not a parallel component) or wrap just the card container in `SettingsCard`. Don't add a fifth local `const card = { border: ... }`.

**Deferred — real design decisions, not mechanical extraction, so intentionally left alone this pass:**
- Two divergent "pick one option" patterns: `SelectField` (native `<select>` + fake chevron) vs. `SettingsSelect` (fully custom popover). Same UX need, two different interaction models — pick one canonical pattern before unifying call sites.
- Two divergent "pick an entity" patterns: `EntitySwitcher` (sidebar popover) vs. `EntityPickerModal`/`EntityPageSwitcher` (centered modal). May legitimately be two different contexts (global switcher vs. in-page action) — confirm before assuming it's drift.
- `useOutsideClick` hook opportunity — the same `document.addEventListener('mousedown', ...)` + ref-contains-check boilerplate is reimplemented independently in `ActionMenu`, `SettingsSelect`, `MonthPicker`, `ViewSwitcher`, `FilterDropdown`, and once inline in `EmployeeDetailScreen`.
- Two independent tooltip implementations (`AvatarStack`'s hover tooltip vs. `TeamAbsencesScreen`'s calendar hover card) — the calendar one is complex/fragile (manual timers + refs); consolidating is a bug-surface reduction, not a visual fix.
- Four parallel list-row components (`RequestRow`, `ExpenseRow`, `ChoiceRow`, `EmployeeRow`) not unified into one `DataTableRow` — each has meaningfully different columns, so this is a bigger, more debatable call than the row/button/modal work above.
- Possible dead code to verify before next touch: `StatusBadge`, `DashboardListRow`, `CardTilt` — no call sites found by a `<ComponentName` grep, but double-check for spread/aliased usage before removing.

**Other components worth checking before rebuilding:** `PersonPickerModal` (employee picker with search/dept filter), `useModalTransition` (modal open/close animation hook), `AmountModal` / `PickModal` (single-value setting editors), `AppLink` (black underlined links — never use accent-colored links, see below).

## Entity scoping — required for any screen that lists employees

The sidebar entity switcher (`appEntity`, `null` = "All entities") must scope every employee-linked list in the app. When `appEntity` is set, an employee should only appear if `EMPLOYEES[id].entityId === appEntity`. **This is not optional per-screen — it's the same rule everywhere, and it has been missed repeatedly**, because `appEntity` is easy to leave unwired when a settings screen is first built (the bug is invisible until someone actually switches entities and looks for it).

The established pattern, already used at the `App()` level for `entityFilteredRequests` / `entityFilteredExpenses` / `entityFilteredChoices`:

```js
const visible = allItems.filter(id => {
  const emp = EMPLOYEES[id];
  return emp && (!appEntity || emp.entityId === appEntity);
});
```

**Checklist for any new settings screen (or any screen at all) that renders a list of employees:**
1. Does the component actually receive `appEntity` as a prop? Check every call site — a parent having `appEntity` doesn't mean it got passed down (this exact bug hit `LeaveTypeSettingsPage`, `AllowanceSettingsPage`, and `TeamAccessSettings` — none of them had it wired, or had it wired but never used it).
2. Is every employee list filtered with `!appEntity || emp.entityId === appEntity`? This applies to: read-only lists (e.g. "Employee exceptions"), pickers/candidate pools (e.g. "Assign employees" in `PersonPickerModal`), and already-saved selections being displayed back (e.g. an allowance's `assignedEmployees` — filter the *display*, don't mutate the stored ids, so switching back to "All entities" still shows everything).
3. When showing employees under "All entities" (i.e. `appEntity` is `null`) and the list can span multiple entities, show the entity name next to the department (`[dept, entity].filter(Boolean).join(' · ')`) so the cross-entity spread is visible — drop it back to just department once scoped to one entity, since it'd be redundant there.

**Known gap outside settings, not yet fixed:** `AddTimeOffModal` and `AddExpenseModal` (the "add absence" / "add expense" creation modals) don't receive `appEntity` at all, so their employee pickers aren't entity-scoped either. Same bug class, different surface — fix the same way if you touch those.

## Design conventions

- Links are always `P.ink` (black) + underlined, via the shared `AppLink` component. Never accent/action-colored links.
- `P.inkFaint` is not for readable text — use `P.inkSoft` (min 13px) for hints/descriptions.
- Reuse `ModalShell`/`DrawerShell` (see "Shared components" above) rather than building a new drawer/modal backdrop/panel from scratch.
- Before implementing a UI change, confirm whether it applies to desktop, mobile, or both — this prototype currently only covers desktop HR Admin.

## Documentation

- [CHANGELOG.md](../../CHANGELOG.md) at the repo root — titled "Product Changelog." Records product/UX decisions and the reasoning behind them, plus design-system/consistency changes — not a bug tracker or commit log; mechanical fixes don't belong here unless they reflect an actual decision. Also rendered in-app at Sidebar → Product changelog (`ChangelogScreen` component, `CHANGELOG_ENTRIES` array). Update both when a batch of related decisions lands.
- **Sidebar → Components** (`ComponentLibraryScreen`) — a live, interactive reference for every shared component in this file (buttons, badges, settings rows, modals/drawers, etc.), each with a one-line note on where it's actually used. Check here before building a new UI pattern; add a new section here when you add a new shared component.
