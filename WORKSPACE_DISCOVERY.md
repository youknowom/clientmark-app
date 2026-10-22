# Workspace Discovery: Configurable Workspaces, Pipelines, Stages & Dynamic Roles

> **Status**: READ-ONLY Discovery & Architecture Proposal  
> **Context**: Investigating requirements for transitioning from hardcoded agency roles (`Admin`, `Telecaller`, `BDE`, `Developer`) and fixed lead stages (`NEW`, `TELECALLING`, `SALES`, `CLOSED`) to dynamic, tenant-configurable pipelines, stages, and role-agnostic permissions.

---

## Section A: Hardcoded Stages Audit

In the current implementation, lead workflow stages are tightly coupled to three specific role designations (`Admin` -> `Telecaller` -> `BDE`). The stage values in the database are strings (`"NEW"`, `"TELECALLING"`, `"SALES"`, `"CLOSED"`).

### 1. Schema Default Values
- [backend/models/leadModel.js:78-81](file:///d:/React_Project/crm/backend/models/leadModel.js#L78-L81): `leadStage` defaults to `"NEW"`. (Note: `leadStatus` also defaults to `"NEW"`, and `callStatus` defaults to `"PENDING"`).
- [backend/models/leadModel.js:88-91](file:///d:/React_Project/crm/backend/models/leadModel.js#L88-L91): `leadStatus` field default.

### 2. Creation & Import
- [backend/controllers/leadController.js:106](file:///d:/React_Project/crm/backend/controllers/leadController.js#L106): `createLead` sets `leadStage: "NEW"`.
- [backend/controllers/leadController.js:387](file:///d:/React_Project/crm/backend/controllers/leadController.js#L387): CSV/Excel import fallback sets `leadStage: "NEW"`.
- [backend/controllers/leadController.js:625, 648](file:///d:/React_Project/crm/backend/controllers/leadController.js#L625-L648): Excel exporter headers format `leadStage`.

### 3. Stage Transfer Endpoints
- [backend/controllers/leadController.js:769-787](file:///d:/React_Project/crm/backend/controllers/leadController.js#L769-L787) (`manyAdminToTelecaller`):
  - Line 769: Checks `if (lead.leadStage !== "NEW")` — rejects if not in `NEW`.
  - Line 787: Updates `$set: { leadStage: "TELECALLING", assignedToTelecaller: telecallerId }`.
- [backend/controllers/leadController.js:962-980](file:///d:/React_Project/crm/backend/controllers/leadController.js#L962-L980) (`manyTelecallerToBde`):
  - Line 963: Checks `if (lead.leadStage !== "TELECALLING")` — rejects if not in `TELECALLING`.
  - Line 980: Updates `$set: { leadStage: "SALES", assignedToBDE: bdeId }`.
- [backend/controllers/leadController.js:1187-1204](file:///d:/React_Project/crm/backend/controllers/leadController.js#L1187-L1204) (`manyBdeToAdmin`):
  - Line 1188: Checks `if (lead.leadStage !== "SALES")` — rejects if not in `SALES`.
  - Line 1204: Updates `$set: { leadStage: "CLOSED", assignedToTelecaller: null, assignedToBDE: null }`.
- [backend/controllers/leadController.js:1325-1337](file:///d:/React_Project/crm/backend/controllers/leadController.js#L1325-L1337) (`singleTelecallerToBde`):
  - Line 1325: Checks `if (leadDetail.leadStage !== "TELECALLING")`.
  - Line 1337: Updates `$set: { leadStage: "SALES", assignedToBDE: bdeId }`.

### 4. Realtime Socket Emissions
- [backend/controllers/leadController.js:889](file:///d:/React_Project/crm/backend/controllers/leadController.js#L889): `emitToTenant(tenantId, "lead:transferred", { type: "admin-to-telecaller" })`.
- [backend/controllers/leadController.js:1058](file:///d:/React_Project/crm/backend/controllers/leadController.js#L1058): `emitToTenant(tenantId, "lead:transferred", { type: "telecaller-to-bde" })`.
- [backend/controllers/leadController.js:1276](file:///d:/React_Project/crm/backend/controllers/leadController.js#L1276): `emitToTenant(tenantId, "lead:transferred", { type: "bde-to-admin" })`.
- [backend/controllers/leadController.js:1351](file:///d:/React_Project/crm/backend/controllers/leadController.js#L1351): `emitToTenant(tenantId, "lead:transferred", { type: "telecaller-to-bde", leadId })`.

### 5. History Records
- [backend/models/leadHistoryModel.js:3-30](file:///d:/React_Project/crm/backend/models/leadHistoryModel.js#L3-L30): Tracks user assignment changes (`leadId`, `assignToId`, `assignById`), but does **not** have an explicit `stageId` or `stageName` field; stage progression is inferred purely from assignment changes.

### 6. Dashboard Aggregations
- [backend/controllers/leadController.js:1464, 1469](file:///d:/React_Project/crm/backend/controllers/leadController.js#L1464-L1469) (`getTelecallerLeadReport`): Aggregates pipeline conversion using `{ $in: ["$leadStage", ["SALES", "CLOSED"]] }` and `{ $eq: ["$leadStage", "TELECALLING"] }`.
- [backend/controllers/leadController.js:1593, 1598](file:///d:/React_Project/crm/backend/controllers/leadController.js#L1593-L1598) (`exportTelecallerLeadReport`): Same hardcoded stage conditions in Excel export.
- [backend/controllers/leadController.js:1741, 1746, 1751](file:///d:/React_Project/crm/backend/controllers/leadController.js#L1741-L1751) (`getBdeLeadReport`): Hardcoded stage filters on `"SALES"`, `"CLOSED"`.
- [backend/controllers/leadController.js:1870, 1875, 1880](file:///d:/React_Project/crm/backend/controllers/leadController.js#L1870-L1880) (`exportBdeLeadReport`): Same hardcoded stage filters in Excel export.
- [backend/config/seedDemoTenant.js:322-455](file:///d:/React_Project/crm/backend/config/seedDemoTenant.js#L322-L455): Seeds demo leads explicitly partitioned across `"NEW"`, `"TELECALLING"`, `"SALES"`, `"CLOSED"`.

---

## Section B: Role Names vs. Permission Codes

### 1. Where Role Names Drive Business Logic (Hardcoded Couplings)
1. **Billing & Subscription Management**:
   - [backend/controllers/subscriptionController.js:213](file:///d:/React_Project/crm/backend/controllers/subscriptionController.js#L213): `if (roleName !== "Admin")` blocks order creation.
   - [backend/controllers/subscriptionController.js:325](file:///d:/React_Project/crm/backend/controllers/subscriptionController.js#L325): `if (roleName !== "Admin")` blocks payment verification.
   - [backend/controllers/subscriptionController.js:447](file:///d:/React_Project/crm/backend/controllers/subscriptionController.js#L447): `if (roleName !== "Admin")` blocks cancellation.
   - [backend/controllers/subscriptionController.js:682](file:///d:/React_Project/crm/backend/controllers/subscriptionController.js#L682): `if (roleName !== "Admin")` blocks Stripe checkout session creation.
2. **Scheduled Workers**:
   - [backend/workers/scheduledNotifications.js:52](file:///d:/React_Project/crm/backend/workers/scheduledNotifications.js#L52): `RoleModel.find({ roleName: "Developer" })` filters recipients for morning/afternoon quotes and daily project upload reminders.
3. **Workspace Provisioning**:
   - [backend/controllers/tenantController.js:149, 155, 173, 188](file:///d:/React_Project/crm/backend/controllers/tenantController.js#L149-L188): Auto-provisions 4 fixed roles: `"Admin"`, `"BDE"`, `"Telecaller"`, `"Developer"`.
   - [backend/config/seedDemoTenant.js:35-150](file:///d:/React_Project/crm/backend/config/seedDemoTenant.js#L35-L150): Seeds identical 4 role names.
4. **Lead Assignment & Transfer**:
   - `leadRouter.js` assumes the workflow is strictly Admin -> Telecaller -> BDE -> Admin.
   - [backend/controllers/userController.js:948](file:///d:/React_Project/crm/backend/controllers/userController.js#L948): Lookups query `RoleModel.findOne({ roleName, tenantId })` to populate telecaller and BDE dropdowns.

### 2. Where Permission Codes Drive Access Control (Decoupled & Extensible)
- [backend/middlewares/authMiddleware.js:107-133](file:///d:/React_Project/crm/backend/middlewares/authMiddleware.js#L107-L133) (`authAccess(permissionCode)`): Validates `user.roleId.permissions.includes(code)`.
- [backend/routers/leadRouter.js:44, 46, 47, 48, 49, 59, 64, 69, 74, 79, 84, 95, 100](file:///d:/React_Project/crm/backend/routers/leadRouter.js#L44-L100): Protected with granular codes:
  - `view:lead`, `add:lead`, `update:lead`, `delete:lead`
  - `view:telecaller-lead-report`, `view:bde-lead-report`, `view:lead-status-report`
  - `view:whatsapp-chat-record`
- [backend/routers/projectRouter.js:29-87](file:///d:/React_Project/crm/backend/routers/projectRouter.js#L29-L87): Protected with granular codes:
  - `view:project`, `add:project`, `update:project`, `delete:project`
  - `view:timeline`, `add:timeline`, `update:timeline`, `delete:timeline`
- [backend/routers/userRouter.js:29-82](file:///d:/React_Project/crm/backend/routers/userRouter.js#L29-L82): Protected with granular codes:
  - `view:user`, `add:user`, `update:user`, `delete:user`
  - `view:role-permission`, `add:role-permission`, `update:role-permission`

---

## Section C: Lead & Project Schema Linkages

### 1. `LeadModel` ([backend/models/leadModel.js](file:///d:/React_Project/crm/backend/models/leadModel.js))
- **Stage Fields**:
  - `leadStage`: String enum-like string (`"NEW"`, `"TELECALLING"`, `"SALES"`, `"CLOSED"`).
  - `callStatus`: String (`"PENDING"`, `"CONNECTED"`, `"BUSY"`, etc.).
  - `leadStatus`: String (`"NEW"`, `"HOT"`, `"WARM"`, `"COLD"`).
- **Assignees**:
  - `assignedToTelecaller`: ObjectId referencing `users`.
  - `assignedToBDE`: ObjectId referencing `users`.
  - (No generic assignee array or dynamic role assignment map exists).

### 2. `LeadHistoryModel` ([backend/models/leadHistoryModel.js](file:///d:/React_Project/crm/backend/models/leadHistoryModel.js))
- Contains only:
  - `tenantId`: Ref `tenants`
  - `leadId`: Ref `leads`
  - `assignToId`: Ref `users`
  - `assignById`: Ref `users`
- **Gaps**: Does not store the previous or new `leadStage`, timestamp of stage transition, or remarks entered at the moment of stage handover.

### 3. `ProjectModel` Linkages ([backend/models/projectModel.js](file:///d:/React_Project/crm/backend/models/projectModel.js))
- **Direct User Links**:
  - `AssignedProjectManagerId`: ObjectId referencing `users`.
  - `AssignedDevelopers`: `[ObjectId]` referencing `users`.
- **Client Link**:
  - Direct embedded fields: `ClientName`, `email`, `mobileNo`, `whatsappNo`, `city`, `address`.
  - **No `leadId` field exists in `ProjectModel`**. When a deal or lead closes, the project is created either manually or by cloning the client contact info by value rather than by foreign key relation.

---

## Section D: Frontend Role Couplings & Routing

### 1. Root Dashboard Resolver ([frontend/src/views/sidebarpages/Dashboard.js:47-57](file:///d:/React_Project/crm/frontend/src/views/sidebarpages/Dashboard.js#L47-L57))
The component renders the dashboard strictly via `switch/if-else` matching literal role names:
```javascript
if (userData.roleId.roleName === 'Admin') {
  setDashboardComponent(() => AdminDashboard)
} else if (userData.roleId.roleName === 'TeleCaller') {
  setDashboardComponent(() => TeleCallerDashboard)
} else if (userData.roleId.roleName === 'Developer') {
  setDashboardComponent(() => DeveloperDashboard)
} else if (userData.roleId.roleName === 'BDE') {
  setDashboardComponent(() => BDEDashboard)
} else {
  setNotAllowed(true) // Redirects to /pagenotfound !
}
```
*Impact*: Any user assigned a custom or renamed role (e.g. `"Support"`, `"Account Executive"`, `"Manager"`) is immediately locked out and redirected to `/pagenotfound`.

### 2. Admin Dashboard String Parsing ([frontend/src/views/sidebarpages/AdminDashboard.jsx](file:///d:/React_Project/crm/frontend/src/views/sidebarpages/AdminDashboard.jsx))
Instead of checking capabilities or permissions, the dashboard classifies users into UI cards by string heuristics:
- **Developers** (lines 141-147, 710-717): Checks if `roleName.includes('developer') || roleName.includes('dev') || roleName === 'programmer' || roleName.includes('engineer') || roleName.includes('coder')`.
- **Sales & Telecallers** (lines 618-626): Checks if `roleName.includes('telecaller') || roleName.includes('tele') || roleName.includes('bde') || roleName.includes('business') || roleName.includes('sales') || roleName.includes('call') || roleName.includes('lead')`.

### 3. Other Hardcoded Role Checks in UI
- [frontend/src/views/sidebarpages/BillingPage.jsx:27](file:///d:/React_Project/crm/frontend/src/views/sidebarpages/BillingPage.jsx#L27): `const isAdmin = userData?.roleId?.roleName === 'Admin'` (disables billing management for non-Admins).
- [frontend/src/views/sidebarpages/UserProfile.jsx:251](file:///d:/React_Project/crm/frontend/src/views/sidebarpages/UserProfile.jsx#L251): `formData.roleName !== 'Admin'` hides fields.
- [frontend/src/views/sidebarpages/ProjectDetails.jsx:175](file:///d:/React_Project/crm/frontend/src/views/sidebarpages/ProjectDetails.jsx#L175): `roleRes.data.data.find((r) => r.roleName === 'Developer')` to populate assigned developer select box.
- [frontend/src/views/sidebarpages/ProjectDetails.jsx:375](file:///d:/React_Project/crm/frontend/src/views/sidebarpages/ProjectDetails.jsx#L375): `isStrictAdmin = (userData?.roleId?.roleName || '').toLowerCase().includes('admin')`.
- [frontend/src/views/sidebarpages/AssignmentModal.jsx:27](file:///d:/React_Project/crm/frontend/src/views/sidebarpages/AssignmentModal.jsx#L27): Queries for users with `roleName: 'TeleCaller'`.

---

## Section E: Minimal Architecture Proposal (Dynamic Pipelines & Stages)

### 1. Schema Design

#### A. `PipelineModel`
```javascript
const PipelineSchema = new mongoose.Schema({
  tenantId: { type: ObjectId, ref: 'tenants', required: true, index: true },
  name: { type: String, required: true, trim: true }, // e.g. "Default Agency Pipeline", "Enterprise Sales"
  isDefault: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });
PipelineSchema.index({ tenantId: 1, isDefault: 1 });
```

#### B. `StageModel`
```javascript
const StageSchema = new mongoose.Schema({
  tenantId: { type: ObjectId, ref: 'tenants', required: true, index: true },
  pipelineId: { type: ObjectId, ref: 'pipelines', required: true, index: true },
  name: { type: String, required: true, trim: true }, // e.g. "New", "Contacted", "Proposal Sent", "Closed Won"
  slug: { type: String, required: true }, // Normalized identifier: "new", "telecalling", "sales", "closed"
  order: { type: Number, required: true, default: 0 },
  category: { 
    type: String, 
    enum: ["open", "in_progress", "won", "lost"], 
    default: "open" 
  }, // For reporting & revenue forecasting
  allowedAssigneeRoles: [{ type: ObjectId, ref: 'roles' }], // Dynamic: which roles can be assigned leads in this stage
  isSystemStage: { type: Boolean, default: false }, // Preserves backwards compatibility slugs
}, { timestamps: true });
StageSchema.index({ tenantId: 1, pipelineId: 1, order: 1 });
StageSchema.index({ tenantId: 1, slug: 1 });
```

### 2. Backwards-Compatible Transfer Endpoints

Existing clients/mobile apps rely on the specific endpoints:
- `POST /lead/many-admin-to-telecaller`
- `POST /lead/many-telecaller-to-bde`
- `POST /lead/many-bde-to-admin`
- `POST /lead/single-telecaller-to-bde`

**Adapter Strategy**:
- Instead of removing these endpoints, retain them as thin wrappers around a unified transfer service:
  ```javascript
  // Unified transfer handler:
  transferLeads({ tenantId, leadIds, targetStageSlug: "telecalling", targetUserId, currentUserId })
  ```
- Map legacy stage strings (`"NEW"`, `"TELECALLING"`, `"SALES"`, `"CLOSED"`) to the corresponding `stage.slug` in the tenant's default pipeline.
- New endpoints can support generic drag-and-drop:
  ```http
  POST /lead/transfer
  { "leadIds": [...], "targetStageId": "...", "assigneeId": "..." }
  ```

### 3. Role-Agnostic Dashboard Resolution Strategy
- Replace the literal `roleName` switch in `Dashboard.js` with:
  1. **Primary Capability/Permission Check**:
     - Has `manage:tenant` or `admin:dashboard` -> `AdminDashboard`
     - Has `view:sales-pipeline` or assigned BDE leads -> `BDEDashboard`
     - Has `view:calls` or assigned telecalling leads -> `TeleCallerDashboard`
     - Has `view:project-tasks` or assigned developer projects -> `DeveloperDashboard`
  2. **Configurable Default Dashboard**: Store `defaultDashboard` (`"admin"`, `"sales"`, `"telecalling"`, `"developer"`) on `RoleModel` so any newly created role can choose its home screen view.

### 4. Zero-Downtime Migration Plan
1. **Script**: `scripts/backfillPipelinesAndStages.js` (with `--dry-run` support, 100% idempotent):
   - For every existing tenant in `tenants`:
     - Checks if a default `PipelineModel` exists; if not, creates `"Default Pipeline"`.
     - Creates the 4 canonical stages (`"NEW"`, `"TELECALLING"`, `"SALES"`, `"CLOSED"`) with matching slugs.
     - Adds `pipelineId` and `stageId` to `LeadModel` while keeping the legacy `leadStage` string field in sync via Mongoose pre-save middleware.
2. **Read/Write Compatibility**:
   - Reads: Read from `stageId.name` or fallback to legacy `leadStage`.
   - Writes: Updates set both `leadStage` (string) and `stageId` (ObjectId) simultaneously.

### 5. Risk Assessment & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| **Breaking third-party API / mobile consumers** | High | Keep legacy `/lead/many-admin-to-telecaller` endpoints operational as proxies to `transferLeads`. Dual-write `leadStage` string alongside `stageId`. |
| **Existing dashboard charts reporting inaccurate counts** | High | Update aggregation pipelines (`getTelecallerLeadReport`, `getBdeLeadReport`) to query by `stage.category` (`"won"`, `"in_progress"`, `"lost"`) instead of hardcoded strings. |
| **User lockout on role rename** | High | Decouple `Dashboard.js` from `roleName === 'Admin'` before allowing UI role renames. Fallback to a generic workspace overview if no role-specific dashboard is assigned. |
| **Orphaned lead history records** | Medium | Enhance `LeadHistoryModel` to capture `fromStageId`, `toStageId`, and transition notes. |

---
*Awaiting user review and authorization before any code changes.*
