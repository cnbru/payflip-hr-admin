# HR Admin prototype — working notes for coding agents

This is a single-file React prototype at `app.jsx` (loaded by `index.html` via Babel standalone, no build step). Bump the `?v=N` cache-bust suffix on the `<script src="/hr-admin/app.jsx?v=N">` tag in `index.html` after every edit — the browser won't pick up changes otherwise.

## Shared components — always reuse, never re-hand-roll

Before writing a new settings row, card, drawer, or modal, **search the file for an existing shared component first.** This file grew via many small iterative commits, and rows/cards were repeatedly re-implemented inline per-screen with copy-pasted styles that quietly drifted (different icon sizes, different padding, different hover behavior) — that drift is exactly what causes "why does this look slightly different" bugs. Don't repeat it.

**`SettingsCard` + `SettingsRow`** (defined near the top of `app.jsx`, just after the `Icon` component) — the canonical building blocks for any settings screen that lists clickable items (a leave type, an allowance, an expense category, an admin, a benefit type). Before adding a new settings list anywhere in this app, use these instead of writing a new `<div style={{...}}>` row:

```jsx
<SettingsCard>
  <SettingsRow onClick={...} icon="calendar" label="Reimbursement cycle" value="With next payroll run" last />
  <SettingsRow onClick={...} leading={<Avatar .../>} label={admin.name} subtitle={admin.email} trailing={<CustomBadge/>} />
</SettingsCard>
```

`SettingsRow` props: `onClick`, `icon` (lucide name, renders the standard 36px boxed icon), `iconBadgeColor` (small colored dot overlay, e.g. leave type color), `dimmed` (fades icon + label for inactive items), `leading` (fully custom leading element, e.g. `<Avatar/>`, overrides `icon`), `label`, `labelColor`, `subtitle` (secondary line under the label) or `value` (right-aligned secondary text — pick one), `valueColor`, `trailing` (custom trailing content, overrides the default chevron; pass `null` to render nothing), `last` (suppresses the row's bottom border).

Currently migrated to these components: `AllowancesListPage`, `ExpenseCategorySettings`, `TimeOffSettings` (leave type rows), `TeamAccessSettings` (admin rows), `BenefitsSettings`.

**Known follow-up debt** — `AllowanceSettingsPage`, `LeaveTypeSettingsPage`, `EntitiesSettings`, `PayrollSettings` still define their own local `card` style object rather than using `SettingsCard`. `EntitiesSettings` and `PayrollSettings` have accordion/expand behavior and multi-badge rows that don't map cleanly onto `SettingsRow` yet — if you touch those screens, either extend `SettingsRow` to cover the new shape (adding a prop, not a parallel component) or wrap just the card container in `SettingsCard`. Don't add a fifth local `const card = { border: ... }` — that's the exact duplication this file exists to stop.

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
- Reuse the existing drawer/modal shell (see `AddTimeOffModal`) rather than building a new drawer/modal from scratch.
- Before implementing a UI change, confirm whether it applies to desktop, mobile, or both — this prototype currently only covers desktop HR Admin.

## Documentation

- [CHANGELOG.md](../../CHANGELOG.md) at the repo root — dated log of what changed and why, written for the product team. Also rendered in-app at Sidebar → Changelog (`ChangelogScreen` component, `CHANGELOG_ENTRIES` array). Update both when a batch of related changes lands.
