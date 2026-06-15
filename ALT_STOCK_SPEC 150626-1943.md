# ALT Stock — Complete Technical Specification
**For: Amrit Laxmi Textile, Surat**
**Version: 1.4.0 | Build: 2026-04-03 | Data Version: 2**

---

## 1. What This App Is

ALT Stock is a **single-file PWA** (Progressive Web App) for a textile wholesale business. It handles inventory, sales orders, billing, job work (processing), inward stock, CRM/leads, staff task management, and reporting.

The entire application — HTML, CSS, JavaScript — lives in **one file: `index.html`** (~922 KB, ~12,700 lines). No frameworks, no build tools, no backend. It runs entirely in the browser and syncs via Firebase Realtime Database.

**Business:** Amrit Laxmi Textile, B-3 3022, Regent Textile Market, Ring Road, Surat-395002
**GSTIN:** 24AAXPJ5150B1ZU | **Phone:** 9913866366 | **WhatsApp:** 919913866366

---

## 2. Tech Stack

| Concern | Implementation |
|---------|---------------|
| UI Framework | Vanilla HTML + CSS + JS (no React/Vue/Angular) |
| Storage (primary) | `localStorage` via `lsSave/lsGet` helpers |
| Storage (sync) | Firebase Realtime Database REST API (`PUT/GET`) |
| Storage (backup) | Google Apps Script (GAS) web app |
| Auth | Custom SHA-256 password hashing, role-based permissions |
| Fonts | System fonts; JetBrains Mono for SKU/monospace |
| PWA | Service Worker + Web App Manifest for installability |
| PDF/Print | `window.print()` with print-only CSS |
| WhatsApp | `wa.me/` deep links with URL-encoded message |

---

## 3. File Structure

```
index.html          ← The entire application (single file)
ALT_STOCK_SPEC.md   ← This documentation file
```

No other files. No `package.json`, no `node_modules`, no build output.

---

## 4. Global Constants

```js
APP_VERSION = '1.4.0'
APP_BUILD_DATE = '2026-04-03'
DATA_VERSION = 2
GAS_URL = 'https://script.google.com/macros/s/AKfycbzwD4Ap7ACcJlqk-9BtTxPvJYY-yCkWn2KTLeXsqUlTVyoZFjOUQ66uVZ4zMoKIlFLp/exec'
```

Firebase defaults (can be overridden in Settings):
```
URL:    https://alt-stock-default-rtdb.asia-southeast1.firebasedatabase.app
Secret: z50jh3UrEareEAjTDG4IudKUHg2qZtHoPn4Brvm4
```

---

## 5. Core Utility Functions

```js
const el = id => document.getElementById(id)
const uid = () => Date.now().toString(36) + Math.random().toString(36).substr(2,6)
const today = () => Intl.DateTimeFormat('en-CA', {timeZone: STATE.settings.officeTimezone || 'Asia/Calcutta'}).format(new Date())
const fmtDate = d => new Date(d).toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'})
const fmtN = n => Math.round(n||0).toLocaleString('en-IN')
const fmtRs = n => '₹' + Number(n||0).toLocaleString('en-IN', {minimumFractionDigits:2})
const lsSave = (k,v) => localStorage.setItem(k, JSON.stringify(v))
const lsGet = k => JSON.parse(localStorage.getItem(k))
const lsSet = (k,v) => localStorage.setItem(k, v)        // raw string, no JSON
const stamp = obj => { obj._ts = Date.now(); return obj } // marks modified time
const active = arr => arr.filter(x => !x._deleted)        // filter soft-deleted
const genSKU = (iName, rng, cName, code) => [iName,rng,cName,code].map(s => s.toUpperCase().replace(/\s+/g,'_').replace(/[^A-Z0-9_\-]/g,'')).filter(Boolean).join('_')
```

---

## 6. Global STATE Object

All application data lives in a single mutable global object:

```js
let STATE = {
  user: null,               // logged-in user object

  // Master data
  items: [],                // fabric items with ranges/colours/SKUs
  customers: [],            // customer records
  brokers: [],              // broker records
  suppliers: [],            // supplier records
  products: [],             // product catalogue
  custGroups: [],           // party groups (for cross-billing)

  // Transactions
  entries: [],              // ALL stock movement ledger entries (in/out)
  orders: [],               // sales order forms
  bills: [],                // billing records
  payments: [],             // payment records
  jobWork: [],              // job work challans (external processing)

  // CRM
  leads: [],                // sales leads
  recurringLeads: [],       // templates for recurring lead visits

  // Tasks
  taskTemplates: [],        // recurring task blueprints
  taskInstances: [],        // actual task instances (generated daily)
  staffLeave: [],           // leave records

  // System
  users: [],                // all user accounts
  deviceReqs: [],           // device approval requests
  flaggedEntries: [],       // flagged/disputed ledger entries
  mixedSarees: [],          // mixed saree batch tracking

  settings: { /* see Section 7 */ }
}
```

---

## 7. Settings Object

```js
STATE.settings = {
  companyName: 'AMRIT LAXMI TEXTILE',
  gstin: '24AAXPJ5150B1ZU',
  address: 'B-3 3022, REGENT TEXTILE MARKET, RING ROAD, SURAT-395002',
  phone: '9913866366',
  email: 'amritlaxmitextiles@gmail.com',
  adminWhatsApp: '919913866366',

  // Numbering
  orderPrefix: 'B/',
  inwardPrefix: 'GRN/',
  nextInwardNo: 1,

  // Payment terms (defaults)
  discount: 5,
  discountDays: 45,
  nettDays: 120,

  // Stock conversion
  avgMtrPerTaka: 90,       // 1 taka = 90 metres
  avgMtrPerTP: 45,         // thaan-pair conversion

  // Database
  firebaseUrl: '...',
  firebaseSecret: '...',
  gasUrl: '...',
  dbMode: 'firebase',      // 'firebase' | 'sheets'
  lastSync: ISO_STRING,
  forceReloadToken: ISO_STRING,  // triggers auto-reload on other devices

  // Features
  officeTimezone: 'Asia/Calcutta',
  taskRefreshTime: '09:30',      // time when daily tasks generate
  holidays: [],                  // YYYY-MM-DD strings
  currentFY: '2025-26',
  allFYs: ['2024-25', '2025-26'],

  // Auto-cleanup
  autoDeleteWonLeadsDays: 0,     // 0 = never
  autoDeleteLostLeadsDays: 0,

  // Dashboard
  dashConfig: { order: [...], hidden: [...] },
  dashConfigPerUser: { [userId]: { order, hidden } },

  // Staff
  staffTypes: [
    { id: 'salesman', name: 'Salesman', color: '#4F46E5' },
    { id: 'jr_accountant', name: 'Junior Accountant', color: '#0891B2' },
    { id: 'sr_accountant', name: 'Senior Accountant', color: '#059669' },
    { id: 'store_manager', name: 'Store Manager', color: '#D97706' },
    { id: 'mkt_coordinator', name: 'Market Coordinator', color: '#10B981' }
  ],

  permPresets: {
    salesman:        { dash:1, sales_view:1, sales_order:1, sales_bill:0, sales_wa:1, inward:0, jw:0, masters_view:1, masters_edit:0 },
    jr_accountant:   { dash:1, sales_view:1, sales_order:1, sales_bill:1, sales_wa:1, inward:1, jw:0, masters_view:1, masters_edit:0 },
    sr_accountant:   { dash:1, sales_view:1, sales_order:1, sales_bill:1, sales_wa:1, inward:1, jw:1, masters_view:1, masters_edit:1, delete_entry:1, cancel_bill:1 },
    store_manager:   { dash:1, sales_view:1, inward:1, jw:1, masters_view:1, masters_edit:1 },
    mkt_coordinator: { dash:1, sales_order:1, leads_edit:1, leads_view:1, reports:1 },
    admin:           { /* all permissions = 1 */ }
  }
}
```

---

## 8. localStorage Keys

| Key | Contains |
|-----|---------|
| `vs_items` | Items array |
| `vs_entries` | Ledger entries array |
| `vs_customers` | Customers array |
| `vs_brokers` | Brokers array |
| `vs_suppliers` | Suppliers array |
| `vs_products` | Products array |
| `vs_cust_groups` | Party groups |
| `vs_orders` | Orders array |
| `vs_bills` | Bills array |
| `vs_payments` | Payments array |
| `vs_jobwork` | Job work challans |
| `vs_leads` | Leads array |
| `vs_rec_leads` | Recurring leads |
| `vs_task_templates` | Task templates |
| `vs_task_instances` | Task instances |
| `vs_staff_leave` | Leave records |
| `vs_flagged` | Flagged entries |
| `vs_mixed_sarees` | Mixed saree batches |
| `vs_users` | User accounts |
| `vs_deviceReqs` | Device approval requests |
| `vs_settings` | Settings object |
| `vs_session` | `{ user, exp: timestamp }` |
| `vs_did` | Device ID (unique per device) |
| `vs_app_version` | Last seen app version (for cache busting) |
| `vs_frt` | Force-reload token (bulk delete signal) |

---

## 9. Data Models

### Item
```js
{
  id: uid(),
  name: 'FRENDY CHIFFON',
  hsn: '5407',
  _ts: Date.now(),
  _deleted: false,
  colours: [
    {
      name: 'DUSTY PINK',
      code: 'DP01',
      hex: '#E8B4B8',
      range: 'A',
      sku: 'FRENDY_CHIFFON_A_DUSTY_PINK_DP01',
      stock_taka: 45,
      stock_mtrs: 4050,
      _ts: Date.now()
    }
  ]
}
```

### Ledger Entry
```js
{
  id: uid(),
  type: 'mill' | 'jobwork' | 'exchange' | 'sale' | 'transfer' | 'manual',
  direction: 'in' | 'out',
  itemId: '...',
  colIdx: 0,          // index into item.colours
  sku: 'FRENDY_CHIFFON_A_DUSTY_PINK_DP01',
  itemName: 'FRENDY CHIFFON',
  colourName: 'DUSTY PINK',
  taka: 10,
  mtrs: 900,
  date: 'YYYY-MM-DD',
  voucherNo: 'GRN/001',
  party: 'Supplier Name',
  ref: 'challan ref',
  note: '',
  by: 'Username',
  orderId: '...',     // linked order (for sale entries)
  billId: '...',      // linked bill
  _ts: Date.now(),
  _deleted: false
}
```

### Order
```js
{
  id: uid(),
  orderNo: 'B/001',
  date: 'YYYY-MM-DD',
  customerId: '...',
  customerName: '...',
  brokerId: '...',
  brokerName: '...',
  status: 'pending' | 'dispatched' | 'partial' | 'cancelled',
  fy: '2025-26',
  items: [
    {
      itemId, itemName, colIdx, sku, colourName, taka, mtrs, rate,
      amount, discount, discountAmt, netAmount
    }
  ],
  totalTaka: 0,
  totalMtrs: 0,
  totalAmount: 0,
  note: '',
  _ts: Date.now(),
  _deleted: false
}
```

### Bill
```js
{
  id: uid(),
  billNo: 'B/001',
  date: 'YYYY-MM-DD',
  orderId: '...',
  customerId: '...',
  customerName: '...',
  brokerId: '...',
  brokerName: '...',
  gstin: '...',
  state: 'Gujarat',
  gstType: 'same' | 'diff',    // intra/inter state
  items: [ /* same as order items + igst/cgst/sgst */ ],
  subtotal: 0,
  gstAmount: 0,
  totalAmount: 0,
  status: 'active' | 'cancelled',
  _ts: Date.now(),
  _deleted: false
}
```

### Lead
```js
{
  id: uid(),
  name: 'Party Name',
  phone: '9999999999',
  market: 'Ahmedabad',
  interest: 'Chiffon, Georgette',
  source: 'Broker' | 'Direct' | 'Reference' | 'Social Media' | 'Exhibition',
  status: 'Enquiry Received' | 'Salesman Sent' | 'Sample Saree Set Sent' |
          'Salesman Updated' | 'Broker Updated' | 'Follow Up' |
          'Order Received' | 'Not Interested',
  assignedId: userId,
  assignedName: 'Salesman Name',
  brokerId: brokerId,
  brokerName: 'Broker Name',
  followupDate: 'YYYY-MM-DD',
  stageChangedAt: 'YYYY-MM-DD',   // when status last changed
  notes: [
    { id, date, status, note, by, channel: 'call'|'visit'|'whatsapp'|'meeting' }
  ],
  createdAt: 'YYYY-MM-DD',
  updatedAt: 'YYYY-MM-DD',
  _ts: Date.now(),
  _deleted: false
}
```

### Task Template
```js
{
  id: uid(),
  name: 'GST Filing',
  category: 'Accounting' | 'Dispatch' | 'Mill/Stock' | 'Sales' | 'Admin' | 'Compliance' | 'Other',
  description: '...',
  priority: 'High' | 'Medium' | 'Low',
  assignedUserId: userId,
  assignedUserName: 'Name',
  frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly',
  daysOfWeek: [1,2,3,4,5],    // 0=Sun, for weekly
  datesOfMonth: [1, 15],       // for monthly
  deadlineTime: '18:00',
  duration: 1,                 // days
  startDate: 'YYYY-MM-DD',
  active: true,
  _ts: Date.now(),
  _deleted: false
}
```

### Task Instance
```js
{
  id: 'ti_YYYYMMDD_templateId',
  templateId: 'manual' | templateId,
  taskName: '...',
  category: '...',
  description: '...',
  priority: 'High' | 'Medium' | 'Low',
  assignedUserId: userId,
  assignedUserName: 'Name',
  isSubstitute: false,
  generatedDate: 'YYYY-MM-DD',
  deadline: 'YYYY-MM-DDTHH:MM',
  status: 'Pending' | 'Done',
  completedAt: ISO_STRING,
  completedByUserId: userId,
  completedByName: 'Name',
  isOnTime: true | false,
  comments: [
    { id, userId, userName, text, at: ISO_STRING, isCompletionNote: true }
  ],
  createdBy: userId,   // for ad-hoc (manual) tasks
  _ts: Date.now(),
  _deleted: false
}
```

### User
```js
{
  id: uid(),
  name: 'Full Name',
  username: 'login_name',
  password: 'sha256_hash',
  role: 'admin' | 'staff',
  staffTypeId: 'salesman',
  staffType: 'Salesman',   // display label
  phone: '9999999999',
  whatsapp: '919999999999',
  email: '...',
  active: true,
  permissions: { dash:1, sales_view:1, ... },
  _ts: Date.now(),
  _deleted: false
}
```

### Staff Leave
```js
{
  id: uid(),
  userId: '...',
  userName: '...',
  from: 'YYYY-MM-DD',
  to: 'YYYY-MM-DD',
  reason: 'Personal' | 'Medical' | 'Festival' | 'Emergency' | 'Other' | 'Paused by admin',
  substituteId: userId | null,
  substituteName: 'Name' | null,
  _ts: Date.now(),
  _deleted: false
}
```

---

## 10. Navigation & Screen Structure

The app uses a **bottom navigation bar** (`#bn`) with 10 tabs. Each tab is a `<div id="s-{tab}" class="scr">`.

```
Tabs: dash | sales | inward | jw | masters | reports | leads | tasks | admin | research
```

Navigation function:
```js
function setNav(tab) // shows correct screen, hides others, calls init functions
```

### Screen IDs
| Screen | ID | Init function |
|--------|----|--------------|
| Dashboard | `s-dash` | `renderDash()` |
| Sales (Orders/Bills) | `s-sales` | `renderOrders()` |
| Inward | `s-inward` | `renderInRec()` |
| Job Work | `s-jw` | `renderJWLists()` |
| Masters | `s-masters` | various |
| Reports | `s-reports` | various |
| Leads/CRM | `s-leads` | `renderLeads()` |
| Tasks | `s-tasks` | `initTasksScreen()` |
| Admin | `s-admin` | `renderSettingsForm()` |
| Research | `s-research` | `renderResearch()` |

---

## 11. UI Design System

### CSS Variables
```css
--P:  #4F46E5    /* Primary (indigo) */
--Pd: #4338CA    /* Primary dark */
--Pl: #EEF2FF    /* Primary light */
--G:  #059669    /* Green */
--Gd: #065F46
--Gl: #D1FAE5
--A:  #D97706    /* Amber */
--Al: #FEF3C7
--R:  #DC2626    /* Red */
--Rl: #FEE2E2
--t1: #111827    /* Text primary */
--t2: #374151    /* Text secondary */
--t3: #6B7280    /* Text tertiary */
--br: #E5E7EB    /* Border */
--bg: #F8FAFC    /* Background */
--nav-h: 64px
```

### CSS Class Reference
```
.scr    screen container with scroll + padding
.shdr   screen header
.hr     horizontal row (flex, space-between)
.card   white rounded card (border-radius:14px, shadow)
.btn    button base
.bp     button primary (indigo)
.bs     button secondary (grey border)
.bd     button danger (red)
.bsuc   button success (green)
.bgh    button ghost
.bfl    button full-width
.bsm    button small
.wa     WhatsApp green button
.inp    text input
.sel    select dropdown
.ta     textarea
.fg     form group (label + input)
.ir2    two-column input row
.tbb    tab button
.tp     tab panel
.ov     overlay/modal backdrop
.sh     sheet (modal container, slides up)
.shh    sheet header
.shb    sheet body (scrollable)
.shf    sheet footer (action buttons)
.hdl    drag handle bar
.emp    empty state
.emj    emoji for empty state
.bsum   bordered summary grid
.brow   summary grid row
.sku    SKU label (monospace, small)
.mono   monospace font
.fw8    font-weight: 800
.hid    hidden (display:none)
.fab    floating action button
.srch   search bar container
.ndot   navigation dot (notification badge)
```

### Modal System
```js
showMod(id)  // adds .on class, sets body overflow:hidden
hideMod(id)  // removes .on class
ovc(e, o)    // overlay click-outside handler
```

All modals: `<div class="ov" id="m-{name}" onclick="ovc(event,this)">`

---

## 12. Auth System

### Login Flow
1. User enters username + password on login screen
2. `doLogin()` tries 3 methods in order:
   - Local `STATE.users` lookup
   - Google Sheets (GAS) pull
   - Direct API call
3. Password verified against SHA-256 hash
4. `loginOK(user)` saves session to `vs_session` (expires 8 hours)
5. On reload, `checkSess()` restores session automatically

### Offline Credentials
The app stores all users in `localStorage`. After first login with internet, users can log in again offline using the same credentials.

**Default admin:** username `admin`, password `admin123` (change immediately)

### Permission System
```js
const DEFAULT_PERMS = {
  dash:0, sales_view:0, sales_order:0, sales_edit:0, sales_bill:0,
  sales_delete:0, sales_cancel:0, sales_wa:0, inward_view:0, inward:0,
  inward_delete:0, manual_stock:0, jw:0, jw_delete:0, masters_view:0,
  masters_edit:0, masters_delete:0, reports:0, rep_stock:0, rep_vsorder:0,
  rep_daily:0, rep_topsku:0, reports_wa:0, leads_view:0, leads_edit:0,
  leads_assign:0, ledger_view:0, delete_entry:0, cancel_bill:0, edit_bill:0,
  flag_entry:0
}

function hasPerm(permId) // returns true/false based on STATE.user.permissions
```

### Device Approval
New devices generate a unique `deviceId` (stored in `vs_did`). Admin must approve new devices from Admin → Devices. Approved devices are stored in `STATE.users[].approvedDevices`.

---

## 13. Sync Architecture

### Push (local → Firebase)
```js
function autoSyncFirebase()  // debounced 250ms, called after every mutation
// Uses PUT (full replace) to /altstock/data.json
// Sets window._saveLock = true during push to block concurrent pulls
```

### Pull (Firebase → local)
```js
function silentPullFirebase()  // called by 30-second polling interval
function syncFromFirebase()    // manual pull from Database tab
function applyCloudData(d, force)  // merges cloud data into STATE
```

### Merge Logic
```js
function smartMerge(local, remote, uniqueKey)
// For each record: compare _ts timestamps, higher (newer) wins

function mergeItems(local, remote)
// Items use colour-level merge to preserve individual colour edits

function mergeTaskInstances(local, remote)
// Prioritises Done status over Pending to prevent race conditions

function cleanupDeleted(arr)
// Removes _deleted records older than 7 days (hard cleanup)
```

### Force Reload (Admin → All Devices)
When admin does a bulk delete:
1. `forceReloadToken` (ISO timestamp) is written to Firebase settings
2. Each device's 30-second poll checks if token differs from locally stored `vs_frt`
3. If different: apply fresh data → show "🔄 Admin cleared data — reloading in 3s..." toast → reload page
4. Admin's own device stores the token locally so it does NOT self-reload

---

## 14. Stock System

### SKU Format
```
ITEM_NAME_RANGE_COLOUR_NAME_COLOUR_CODE
Example: FRENDY_CHIFFON_A_DUSTY_PINK_DP01
```

### Stock Calculation
Stock is **always recalculated from ledger entries** — never stored as a running total:
```js
function recalcStockFromEntries()
// Iterates all non-deleted entries
// direction 'in' adds taka, 'out' subtracts
// Updates col.stock_taka and col.stock_mtrs on each item colour
```

### Entry Types
| type | direction | description |
|------|-----------|-------------|
| `mill` | in | Purchase from mill (inward) |
| `jobwork` | in | Job work return from processor |
| `exchange` | in | Exchange/return |
| `sale` | out | Dispatched to customer |
| `transfer` | in/out | Internal warehouse transfer |
| `manual` | in/out | Manual stock adjustment |

---

## 15. Sales Module

### Order Form
- Created via `openOrd()` / `saveOrd()`
- Status: `pending` → `dispatched` → `partial` | `cancelled`
- Dispatching an order creates `sale` direction entries in `STATE.entries`
- Order number format: `B/001`, `B/002`... (prefix configurable)

### Billing
- Bills can be created from orders
- GST calculation: same-state = CGST+SGST, inter-state = IGST
- Bill cancellation restores stock (creates reversal entry)
- WA bill message sent via `wa.me/` deep link

### Mixed Sarees
Special feature for tracking mixed (multi-item) saree batches. Stored in `STATE.mixedSarees`.

---

## 16. Inward Module

Records fabric arriving from mills/job work:
- Inward number: `GRN/001` format, auto-incrementing
- Creates `mill` or `jobwork` direction entry
- Grouped by voucher number for deletion
- `deleteVoucherGroup(ids)` soft-deletes all entries in a voucher

---

## 17. Job Work Module

External fabric processing (dyeing, printing, etc.):
- Challan created when fabric sent out
- Challan closed when fabric returned (creates `jobwork` in-entry)
- Status: `pending` | `under_process` | `ready` | `received`

---

## 18. Lead / CRM Module

### Stages (in order)
```js
const LEAD_STAGES = [
  'Enquiry Received',    // S1 — #6366F1 indigo
  'Salesman Sent',       // S2 — #0891B2 cyan
  'Sample Saree Set Sent', // S3 — #F59E0B amber
  'Salesman Updated',    // S4 — #8B5CF6 violet
  'Broker Updated',      // S5 — #D97706 orange
  'Follow Up',           // S6 — #EF4444 red
  'Order Received',      // terminal WIN — #10B981 green
  'Not Interested'       // terminal LOSS — #6B7280 grey
]
```

### Role-Based Tab Visibility
```js
function _isAdminOrCRE()
// Admin: sees All Leads, Won/Lost combined tab, Recurring, Report
// Staff Salesman: sees only My Leads, Follow Up
```

### Lead Card Features
- **Heat indicator:** 🔥 Hot (contacted ≤3 days or follow-up due), ⚡ Warm (≤7 days), 🧊 Cold (8+ days)
- **Stage time:** "5d at this stage" — turns red after 14 days, amber after 7
- **Quick follow-up buttons:** +1d, +3d, +7d, +14d from today
- **WA buttons:** 📲 SM (salesman), 📲 Brk (broker) — opens WhatsApp with pre-filled message
- **Stage dots progress bar:** 6 dots with connecting lines, current stage highlighted
- `quickSetFollowup(leadId, days)` — sets follow-up date without opening detail view
- `quickSetLeadStatus(leadId, status)` — tap-to-change status from card

### Won/Lost Section
- Combined "Won/Lost" tab shows both grouped under collapsible banners
- ✅ Order Received banner (green), ❌ Not Interested banner (red)
- Click banner to expand/collapse cards
- Auto-delete settings: `autoDeleteWonLeadsDays`, `autoDeleteLostLeadsDays` (0 = never)
- `autoCleanLeads()` runs on settings save

### Recurring Leads
Templates for periodic visits (e.g. "visit Ahmedabad market every 2 weeks"). Generates lead reminders on schedule.

---

## 19. Task Management Module

### Generation
```js
function generateTaskInstances(dateStr)
// Called at login and at taskRefreshTime (default 09:30)
// Skips Sundays and holidays
// Checks leave records — routes to substitute if assigned
// Creates instance IDs: 'ti_YYYYMMDD_templateId'
```

### Admin View (`renderAllTasks`)
- Total/Done/Pending/Overdue summary header card
- Overall completion % progress bar
- Per-staff breakdown cards with:
  - 📲 WA button (sends pending task reminder via WhatsApp)
  - ⚡ Assign Task button (opens Quick Task modal pre-filled for that person)
  - ⏸ Pause Today button (creates single-day leave with no substitute)
- Staff filter tabs
- Sort by: Deadline | Priority | Name | Staff

### Staff View (`renderMyTasks`)
- Shows only tasks assigned to logged-in user
- Today's tasks + overdue from previous days
- Grouped by priority (High → Medium → Low)

### Task Completion Flow
```js
// All "Mark Done" buttons call promptTaskDone(instanceId)
// → Shows bottom sheet with optional completion note
// → _confirmTaskDone(instanceId) saves Done status + note as comment
```

### Snooze
From task detail view (Pending tasks): ⏱ +1h, ⏱ +2h, ⏱ +4h buttons call `snoozeTaskDeadline(id, hours)`.

### Quick Task (Ad-hoc)
Admin can create one-off tasks via ⚡ Quick Task button:
- `openAdHocTask(prefillUserId)` — pre-fills assigned person if called from staff card
- `saveAdHocTask()` — creates instance with `templateId: 'manual'`

### Leave System
```js
STATE.staffLeave  // array of leave records
getActiveLeave(userId, dateStr)  // returns leave record if user is on leave
// Connected to generateTaskInstances: if on leave, task routes to substitute
pauseTasksForUser(userId, userName)  // creates same-day leave (no substitute)
```

### WA Reminders
```js
waPendingTaskReminders()  // shows popup with WA buttons for each staff member
waPendingForStaff(userId) // sends reminder for one specific staff member
```

---

## 20. Dashboard Module

### Widgets (configurable, drag-to-reorder)
```js
const DASH_WIDGETS = [
  { id:'stats',      label:'Stats Cards',      icon:'📊' },
  { id:'alerts',     label:'Alerts',           icon:'🔔' },
  { id:'tasks',      label:'My Tasks',         icon:'📋' },
  { id:'followups',  label:'Lead Follow-ups',  icon:'📞' },
  { id:'recurring',  label:'Recurring Visits', icon:'🔁' },
  { id:'shortcuts',  label:'Quick Actions',    icon:'⚡' },
  { id:'stock',      label:'Stock Overview',   icon:'📦' },
  { id:'mixedsarees',label:'Mixed Sarees',     icon:'🎨' },
  { id:'recent',     label:'Recent Activity',  icon:'🕐' }
]
```

Per-user dashboard config saved to `STATE.settings.dashConfigPerUser[userId]`.

### Task Widget (Admin)
Shows all-staff overview with:
- Pending / Done / Overdue count cards
- Overall % completion progress bar (with colour: green bar)
- Per-staff mini breakdown rows with individual progress bars

---

## 21. Admin Module

Tabs: Settings | Users | Devices | Ledger | Database | Fin Year | Flags

### Settings Sections
- Company info (name, GSTIN, address, phone, email)
- Payment terms (discount %, discount days, nett days)
- Stock (avg metres per taka)
- WA (admin WhatsApp number)
- Sync (Firebase URL/Secret, GAS URL)
- Staff types management (add/edit/delete role types)
- Holidays list
- Task settings (refresh time, timezone)
- Lead auto-cleanup (auto-delete won/lost after N days)

### User Management
- Create/edit users, assign role and staff type
- Set custom permissions per user
- Use permission presets from `permPresets`
- Approve/reject device requests

### Database Tab
- Firebase: Save URL/Secret, Test, Push ALL, Pull All
- Google Sheets: Save URL, Test, Push, Pull
- Export backup (JSON download)
- Import backup (JSON upload)
- **Bulk Delete (Danger Zone):**
  - Inward Records, Order Forms, Bills, Ledger Entries, Leads, ALL Business Data
  - Shows record count before deletion
  - Requires double confirmation
  - Hard-removes (not soft-delete) and immediately force-pushes to Firebase
  - Sets `forceReloadToken` to auto-reload all other devices within 30 seconds

### Ledger View
- All stock movement entries
- Searchable, filterable
- Single-entry delete: sets `_deleted: true` + bumps `_ts`
- Flagging system: entries can be flagged for review

---

## 22. Reports Module

Tabs: Stock | vs Orders | Daily Sales | Top SKUs | Trends

- **Stock report:** current stock levels per SKU
- **vs Orders report:** compare stock to pending orders
- **Daily sales:** all dispatched/billed on a given date
- **Top SKUs:** ranking by volume
- **Trends:** 7/14/28/90 day movement charts

---

## 23. Masters Module

Tabs: Items | Customers | Brokers | Suppliers | Products | Party Groups | All SKUs

- **Items:** fabric items with ranges and colour SKUs
  - SKU auto-generated: `ITEM_RANGE_COLOUR_CODE`
  - Each colour has: name, code, hex colour, range, SKU, stock (taka + metres)
  - Discontinue vs Force Delete (force-deletes all ledger entries for SKU)
- **Customers:** name, phone, GSTIN (with state auto-detect), WA, default broker, payment terms override, party group
- **Brokers:** name, phone, WA, commission %
- **Suppliers:** name, GSTIN, address
- **Party Groups:** link multiple firms for cross-billing
- **Products:** product catalogue (separate from items)

---

## 24. Research Module

Market intelligence section with tabs:
- 📊 Pipeline (lead funnel analysis)
- 📈 Trends
- 💰 Market
- 👥 Customers

---

## 25. Modals (Complete List)

| ID | Purpose |
|----|---------|
| `m-item` | Add/edit fabric item |
| `m-rng` | Add range to item |
| `m-aclr` | Add colours to range |
| `m-edit-clr` | Edit colour/SKU |
| `m-cst` | Add/edit customer |
| `m-cust-group` | Add/edit party group |
| `m-brk` | Add/edit broker |
| `m-sup` | Add/edit supplier |
| `m-prd` | Add/edit product |
| `m-ord` | New/edit order form |
| `m-bill` | Create bill from order |
| `m-prog` | Add programme/lot to order |
| `m-inward` | New inward record |
| `m-entry` | Ledger entry detail/edit |
| `m-jw` | New job work challan |
| `m-lead` | New/edit lead |
| `m-lead-det` | Lead detail + contact history |
| `m-qstat` | Quick status change popup |
| `m-task-inst` | Task instance detail |
| `m-task-tpl` | New/edit task template |
| `m-adhoc-task` | Quick ad-hoc task creation |
| `m-leave` | Add staff leave |
| `m-exch` | Exchange/return form |
| `m-qrng` | Quick add range |
| `m-mixed` | Mixed saree batch |
| `m-user` | Add/edit user |
| `m-testing` | Testing checklist |
| `m-prog` | Programme lot |
| `cov` (confirm overlay) | App-wide confirmation dialog |

---

## 26. Key Function Reference

### Core
```js
loadData()              // load all data from localStorage into STATE
persist()               // save all STATE to localStorage + trigger Firebase push
autoSyncFirebase()      // debounced push to Firebase (250ms)
applyCloudData(d,force) // merge Firebase data into STATE
silentPullFirebase()    // 30s poll pull + force-reload check
migrateData()           // run data schema migrations
recalcStockFromEntries()// rebuild stock levels from entries array
verifyStockIntegrity()  // check stock matches entries, auto-correct if not
```

### Auth
```js
doLogin()               // login flow (3-step: local → GAS → API)
loginOK(user)           // set session + init app
checkSess()             // restore session from localStorage
logout()                // save, sync, clear session
hasPerm(permId)         // check permission for current user
refreshCurrentUser()    // update STATE.user from STATE.users after sync
```

### Leads
```js
renderLeads(tab, q)         // render lead list for given tab
openNewLead()               // open new lead modal
saveLead()                  // save lead (create or update)
quickSetLeadStatus(id,s)    // change status without opening detail
quickSetFollowup(id, days)  // set follow-up date from card
updateLeadStatus(id)        // open quick status popup
showLeadDetail(id)          // open lead detail modal
autoCleanLeads()            // delete won/lost leads past configured age
_isAdminOrCRE()             // true if admin or staff with 'cre' in type name
```

### Tasks
```js
initTasksScreen()           // set up tasks screen (admin vs staff view)
generateTaskInstances(date) // create instances from templates for a date
renderMyTasks(q)            // render staff's own tasks
renderAllTasks(staffFilter) // render admin all-tasks view
openTaskInst(id)            // open task detail modal
promptTaskDone(id)          // show completion note prompt
_confirmTaskDone(id)        // mark task done (called from prompt)
markTaskDone(id)            // direct done (no prompt) — still exists
snoozeTaskDeadline(id, h)   // push deadline forward by h hours
openAdHocTask(prefillUserId)// open quick task creation modal
saveAdHocTask()             // save ad-hoc task instance
pauseTasksForUser(uid, name)// create same-day leave (no substitute)
waPendingTaskReminders()    // show WA reminder buttons for all pending staff
waPendingForStaff(uid)      // send WA reminder for one staff member
renderDashTaskWidget()      // render task summary on dashboard
updateTaskDot()             // update tasks badge count in nav
```

### Stock / Ledger
```js
showEntryDetail(entry)      // open ledger entry modal
deleteEntryFromModal()      // soft-delete single entry
deleteVoucherGroup(ids)     // soft-delete all entries in a voucher
bulkDelete(type)            // hard-delete all of a type + force push Firebase
forceRepairStock()          // force recalc stock from entries
```

### Utilities
```js
openWA(phone, msg)          // open WhatsApp deep link
toast(msg, type)            // show toast ('ok'|'er'|'')
appConfirm(title, msg, icon, btnLabel, btnColor) // Promise<bool> confirm dialog
fmtDate(d)                  // format date string to "15 Jun 2026"
fmtRs(n)                    // format as ₹1,23,456.00
fmtN(n)                     // format as 1,23,456
genSKU(item, range, colour, code) // generate SKU string
makeSearchable(selectEl)    // enhance <select> with search
softDelete(arr, id)         // set _deleted:true + update _ts
stamp(obj)                  // set _ts = Date.now()
active(arr)                 // filter out _deleted records
cleanupDeleted(arr)         // remove records deleted >7 days ago
smartMerge(local, remote)   // merge arrays by _ts (newer wins)
rmEl(id)                    // remove element by ID
today()                     // current date as YYYY-MM-DD (timezone-aware)
uid()                       // generate unique ID
```

---

## 27. Safe Area (iOS Notch / Home Indicator)

CSS patch injected after `<style>` to handle iPhone notch and home bar:
```css
#bn { padding-bottom: env(safe-area-inset-bottom, 0px); height: calc(var(--nav-h) + env(safe-area-inset-bottom, 0px)) }
.scr { padding-bottom: calc(var(--nav-h) + env(safe-area-inset-bottom, 0px) + 8px) !important }
.fab { bottom: calc(var(--nav-h) + env(safe-area-inset-bottom, 0px) + 16px) !important }
.shf { padding-bottom: calc(14px + env(safe-area-inset-bottom, 0px)) !important }
```

---

## 28. PWA / Service Worker

The app registers a service worker for offline caching. Version bump in `APP_VERSION` forces a cache clear and page reload:
```js
// On load: if stored version !== APP_VERSION → redirect with ?v=APP_VERSION
window.location.href = window.location.href.split('?')[0] + '?v=' + APP_VERSION;
```

---

## 29. Internationalisation (i18n)

Partial Hindi translation support. UI elements with `data-i18n` attributes get translated based on `STATE.settings.lang` ('en' | 'hi'). Currently English is default.

---

## 30. Financial Year System

- Current FY stored in `STATE.settings.currentFY` (e.g. `'2025-26'`)
- All orders/bills tagged with `fy` field
- Admin can open new FY from Admin → Fin Year
- Ledger and reports can be filtered by FY

---

## 31. Recent Changes (Session Log)

All changes made in the most recent development sessions:

### Lead/CRM Overhaul
- **Stage progress bar:** 6 dot-and-line visual bar; stage name `S4: Salesman Updated` at 12px/800 weight; stage time indicator (turns amber >7d, red >14d)
- **Heat indicator:** 🔥/⚡/🧊 on each lead card based on last contact recency
- **Quick follow-up buttons:** +1d +3d +7d +14d on active lead cards
- **WA Salesman + WA Broker buttons** restored to lead cards (📲 SM, 📲 Brk)
- **Contact history names** enlarged to 14–15px/900 weight in lead detail
- **Won/Lost collapsible:** Click banner to expand; shows count "(5 leads)" when collapsed
- **stageChangedAt tracking:** Recorded when status changes, used for stage time display
- **Auto-delete settings:** `autoDeleteWonLeadsDays` / `autoDeleteLostLeadsDays` in settings

### Task Management Features
- **⚡ Quick Task button:** Admin header button opens `m-adhoc-task` modal to assign one-off tasks to any staff
- **Completion note prompt:** `promptTaskDone()` shows bottom sheet for optional note before marking done
- **Deadline snooze:** +1h +2h +4h buttons in task detail footer (Pending tasks)
- **Staff action buttons** in All Tasks per-staff cards: 📲 WA, ⚡ Assign Task, ⏸ Pause Today
- **Dashboard % bar:** overall completion % progress bar in admin task widget
- **Pause Today:** Creates same-day leave with no substitute for a staff member
- `waPendingForStaff(userId)` — WA reminder for one specific staff

### Database / Sync
- **Bulk Delete (Danger Zone):** In Admin → Database — delete Inward/Orders/Bills/Entries/Leads/All at once
- **Force-reload signal:** After bulk delete, `forceReloadToken` written to Firebase; all other phones auto-reload within 30 seconds (they see new token on next poll, reload themselves)
- **Fixed "entries come back" bug:** Bulk delete now hard-removes + immediately force-pushes to Firebase

### UI Fixes
- Removed stray "hhh" text from HTML head
- Safe area CSS patch for iOS notch/home bar
- App version bumped to 1.4.0

---

## 32. How to Rebuild This App (AI Instructions)

If rebuilding from scratch using this spec:

1. **Single HTML file** — everything in `index.html`. No separate CSS or JS files.

2. **Structure order in the file:**
   ```
   <head> with meta tags, PWA manifest, inline <style>
   <body>
     Login screen (#ls)
     App container (#app)
       Screen divs (#s-dash, #s-sales, ...) — the main content areas
       Bottom nav (#bn)
       All modals (.ov elements)
       Toast (#tst)
       Confirm overlay (#cov)
     <script>
       Constants (APP_VERSION, GAS_URL, etc.)
       Utility functions (uid, today, fmtDate, etc.)
       Sync utilities (smartMerge, cleanupDeleted, etc.)
       STATE object definition
       loadData(), persist(), autoSyncFirebase()
       initApp(), setNav(), renderDash()
       All feature functions (sales, inward, leads, tasks, etc.)
       Service Worker registration
   ```

3. **CSS approach:** Single `<style>` block in `<head>` with all CSS. Use CSS variables for colors. Mobile-first, no media queries needed (always mobile layout).

4. **State management:** All state in global `STATE`. Every mutation calls `lsSave()` then `autoSyncFirebase()`. No reactive framework.

5. **Modal pattern:** Every modal is `<div class="ov" id="m-name">` with `.sh > .shh + .shb + .shf`. Content is always injected via JS (`el('modal-body').innerHTML = ...`).

6. **Firebase integration:** All via REST API. `GET /altstock/data.json?auth=SECRET` to pull. `PUT /altstock/data.json?auth=SECRET` with full payload to push.

7. **Keep it minimal:** No dependencies. The app must work by opening the HTML file directly in a browser (even offline after first load).

---

*Generated: 2026-06-15 | ALT Stock v1.4.0*
