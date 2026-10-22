# MealPlan v1.0

A static, mobile-first dinner planner for two people. Each dinner makes four portions, with two reserved for the following day's lunch. No build step or runtime package installation is required.

## Run and test

Serve this directory with any static HTTP server, for example `python3 -m http.server 8765`, and open `http://localhost:8765`. HTTPS or localhost is required for service-worker offline installation.

Run `TZ=America/Chicago node --test tests/*.test.js` with Node 20 or newer.

## Planning

- Saved schedules are generated ahead, rather than recalculated on every render.
- Actual assigned dinners are used for the 14-day repeat window. Recency, protein, dish style, and weekend crockpot preference influence selection. With too few enabled recipes, repeats are permitted instead of failing to produce a plan.
- Replacements and two-day exchanges are explicit changes. They update next-day leftover lunches and shopping periods. A user-selected repeat is permitted.
- Lunch batches provide two portions per day and replace leftover lunches on their dates. They are purchased once and can be marked prepped separately.
- Paused recipes are excluded from new generation; previously saved dinners remain unchanged.

## Shopping and inventory

Bulk shopping occurs every other Sunday, covering Monday through the next 14 days. Local shopping happens weekly for seven days of selected fresh ingredients. The anchor Sunday is editable. The existing store classification is retained.

Shopping deducts available inventory after reserving quantities needed by earlier uncooked meals. The top-up view covers today through the next Sunday. Recording a purchase adds the actual package quantity to inventory, including excess. Cooking deducts only available stock once. Undo restores only what was actually deducted.

Compatible units are converted (pounds/ounces and cups/tablespoons/teaspoons). Mass, volume, and counts are kept separate. Ingredients with different wording can remain separate; this intentionally avoids guessing density, package sizes, or substitutions. Review quantities when importing recipes.

Replacement suggestions reserve inventory for other saved meals. They show missing ingredients before confirmation. Purchased food is never removed just because its original dinner was replaced.

## Data and migration

`mealplan_v2` is stored locally. Legacy keys are retained, and a local legacy backup is recorded before migration. Existing custom recipes, paused recipes, prices, and pantry reference values are retained. Old pantry quantities require a one-time unit review; checked shopping items are not treated as proof of remaining stock. The previous unsaved rotation is not presented as historical cooking records.

Settings supports JSON backup/restore, recipe import, and optional import from the previous Supabase record set. Restore retains a local pre-restore copy.

Cloud sync is opt-in and reuses the existing public Supabase browser connection with a separate `mealplan_v2` row. It uses the last observed `updated_at` value as a conditional-write guard. Pending local changes are never silently replaced by remote data. If another device changed the cloud row, export the local backup and explicitly choose the cloud copy. Keep the Supabase table's existing access policies in mind: this change does not introduce authentication or modify RLS.

## Verification and remaining review

Automated checks cover scheduling, actual swap history, stable reloads, migration, unit conversion, leftovers, batch quantities, reservations, purchase-related view calculations, idempotent cooking/undo, date boundaries, markup escaping, and rendering of the main views/dialogs using a lightweight DOM stub.

A real-browser visual/accessibility pass, iPhone installation/offline smoke test, and live two-device cloud-sync test are still required. The execution environment blocked localhost serving and file-URL browser preview, so these are not claimed as tested. The draft PR should remain unmerged until that review.

Known limits: inventory is quantity-based, not a lot/expiry tracker; leftover storage and freezing are not tracked. Lunch batches leave four-serving dinners unchanged, so surplus dinner leftovers need household management. Legacy unit prices remain backed up; new cart estimates learn prices from purchases and clearly report partial coverage.


## Touch and responsive interface

The mobile navigation uses safe-area spacing and 44px minimum button targets. Recipe and editing dialogs become bottom sheets on phones. The schedule shows seven days starting today. Drag the card stack vertically to browse adjacent seven-day windows, with live movement and a settling animation. A short or cancelled drag returns to the same week. Trackpad/wheel paging waits for the current gesture to finish; arrow buttons and keyboard Page Up/Down remain available. Screen edges remain available for browser navigation. Swipe down on a sheet header to close it, or use its close button. Gestures never purchase, cook, or replace a meal. Keyboard buttons remain available, and reduced-motion preferences disable transitions. Returning from sleep refreshes the plan when the calendar day changes.

The interface has refined phone, tablet, and desktop layouts with consistent SVG navigation icons, accessible focus indicators, larger form text to avoid iPhone input zoom, and self-contained navigation assets. Real-device touch and visual verification remain outstanding because this environment does not permit the local browser preview.

### One-handed navigation

Swipe left/right within the main content to move between Plan, Shopping, Recipes, Kitchen and Settings. Tab swipes lock to the horizontal axis, respect the first/last tab, and never wrap. Vertical swipes in the calendar continue to page weeks. Native vertical scrolling remains available elsewhere. Inputs, forms, open dialogs, and screen-edge browser gestures are excluded from tab swiping. Each tab retains its scroll position and the selected schedule window stays intact. Bottom sheet close controls and meal actions remain reachable near the bottom; recipes opened from a planned day retain cooking and swap controls.

## Release versions

This replacement starts at v1.0. Increment the public app release by 0.1 each release: v1.1, v1.2, and onward (v1.9 is followed by v2.0). Update APP_VERSION in app.js, the visible version badge in index.html, and the service-worker CACHE suffix together. Public release versions are separate from the saved-data schema: retain schema version 2 and existing mealplan_v2 keys to preserve data.
