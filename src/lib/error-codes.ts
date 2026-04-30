/**
 * Central error-code registry.
 *
 * Category prefixes
 * ─────────────────
 *  AU  Authentication
 *  PX  Permission / Access Control
 *  VL  Validation
 *  NF  Not Found
 *  DB  Database
 *  SV  Internal Server
 *  BL  Business Logic
 *  DC  DCC Integration
 *  CF  Configuration
 *  UP  Upload / Storage
 *  NT  Notification
 *  SS  Session
 */

export type ErrorCategory =
  | 'Authentication'
  | 'Permission'
  | 'Validation'
  | 'NotFound'
  | 'Database'
  | 'Server'
  | 'BusinessLogic'
  | 'DCC'
  | 'Configuration'
  | 'Upload'
  | 'Notification'
  | 'Session';

export interface ErrorEntry {
  code: string;
  category: ErrorCategory;
  message: string;
  detail: string;
}

export const E = {

  // ── Authentication (AU) ──────────────────────────────────────────────────

  /** requireAuth: session is absent — generic authenticated endpoints. */
  AU001: { code: 'AU001', category: 'Authentication', message: 'Authentication required', detail: 'requireAuth: getUserSession returned null; session cookie absent or invalid.' },

  /** requirePermission: session absent before permission check. */
  AU002: { code: 'AU002', category: 'Authentication', message: 'Authentication required', detail: 'requirePermission: getUserSession returned null; evaluated before role check.' },

  /** requireAnyPermission: session absent before any-permission check. */
  AU003: { code: 'AU003', category: 'Authentication', message: 'Authentication required', detail: 'requireAnyPermission: getUserSession returned null; evaluated before role check.' },

  /** Login — email or password field missing in request body. */
  AU004: { code: 'AU004', category: 'Authentication', message: 'Email and password are required', detail: 'POST /api/auth/login: email or password absent in request body before any DB lookup.' },

  /** Login — no matching user row found for the provided email. */
  AU005: { code: 'AU005', category: 'Authentication', message: 'Invalid email or password', detail: 'POST /api/auth/login: users table query returned no row for provided email.' },

  /** Login — bcrypt comparison returned false (wrong password). */
  AU006: { code: 'AU006', category: 'Authentication', message: 'Invalid email or password', detail: 'POST /api/auth/login: bcrypt.compare returned false for provided password.' },

  /** Login — user record found but user_active is not "Y". */
  AU007: { code: 'AU007', category: 'Authentication', message: 'This account has been deactivated', detail: 'POST /api/auth/login: user_active flag is "N"; login blocked at application layer.' },

  /** Password update — Supabase auth provider call failed. */
  AU008: { code: 'AU008', category: 'Authentication', message: 'Password could not be updated', detail: 'POST /api/auth/update-password: Supabase auth.admin.updateUserById returned an error.' },

  /** Registration — email already exists in users table. */
  AU009: { code: 'AU009', category: 'Authentication', message: 'Email address is already registered', detail: 'POST /api/team/user/add or registration route: duplicate email detected before insert.' },

  /** JWT decode/verify failed in jwt-utils. */
  AU010: { code: 'AU010', category: 'Authentication', message: 'Token is invalid or expired', detail: 'jwt-utils.ts: JWT signature verification or expiry check threw or returned null.' },

  /** getUserSession threw an unexpected exception. */
  AU011: { code: 'AU011', category: 'Authentication', message: 'Authentication required', detail: 'getUserSession: unexpected exception in session retrieval (cookie store error, etc.).' },

  // ── Permission (PX) ──────────────────────────────────────────────────────

  /** requirePermission: role does not have the required permission flag. */
  PX001: { code: 'PX001', category: 'Permission', message: 'You do not have permission to perform this action', detail: 'requirePermission: roleHasPermission returned false for the required Permission.' },

  /** requireAnyPermission: role has none of the required permission flags. */
  PX002: { code: 'PX002', category: 'Permission', message: 'You do not have permission to perform this action', detail: 'requireAnyPermission: roleHasPermission returned false for all provided Permissions.' },

  /** Resource owner_id does not match requesting user's ownerId. */
  PX003: { code: 'PX003', category: 'Permission', message: 'Access denied', detail: 'Cross-tenant guard: resource.owner_id !== session.user.ownerId; non-superadmin blocked.' },

  /** Endpoint restricted to SUPERADMIN only. */
  PX004: { code: 'PX004', category: 'Permission', message: 'Super admin access required', detail: 'Route explicitly checks role === "SUPERADMIN" and the requesting user does not qualify.' },

  /** API key provided is invalid or revoked. */
  PX005: { code: 'PX005', category: 'Permission', message: 'Access denied', detail: 'api-key-auth.ts: provided API key not found in valid-keys store or has been revoked.' },

  // ── Validation (VL) ──────────────────────────────────────────────────────

  /** Generic Zod validation failure — fieldErrors forwarded to client. */
  VL001: { code: 'VL001', category: 'Validation', message: 'Validation failed', detail: 'Zod safeParse failed on request body; fieldErrors included in response "errors" key.' },

  /** Route param (id) could not be parsed as integer. */
  VL002: { code: 'VL002', category: 'Validation', message: 'Invalid identifier', detail: 'parseInt / Number() on a route segment returned NaN; rejected before DB lookup.' },

  /** Route param could not be parsed as valid UUID. */
  VL003: { code: 'VL003', category: 'Validation', message: 'Invalid identifier format', detail: 'UUID regex or Zod uuid() failed on a route parameter value.' },

  /** Query string parameters failed Zod parse. */
  VL004: { code: 'VL004', category: 'Validation', message: 'Invalid query parameters', detail: 'Zod safeParse on URL searchParams returned an error.' },

  /** Date/time field failed ISO 8601 parse. */
  VL005: { code: 'VL005', category: 'Validation', message: 'Invalid date or time value', detail: 'new Date(value).isNaN() or Zod datetime() failed for a scheduling/log field.' },

  /** File MIME type not in allowed list. */
  VL006: { code: 'VL006', category: 'Validation', message: 'File type is not permitted', detail: 'Multipart upload MIME type check failed; type not in ALLOWED_MIME_TYPES constant.' },

  /** File size exceeds configured maximum. */
  VL007: { code: 'VL007', category: 'Validation', message: 'File size exceeds the limit', detail: 'file.size > MAX_FILE_BYTES check failed in upload handler.' },

  /** Component add payload failed schema validation. */
  VL008: { code: 'VL008', category: 'Validation', message: 'Validation failed', detail: 'POST /api/system/component/add: ComponentSchema.safeParse returned error.' },

  /** Component update payload failed schema validation. */
  VL009: { code: 'VL009', category: 'Validation', message: 'Validation failed', detail: 'PATCH /api/system/component/[id]/update: ComponentSchema.safeParse returned error.' },

  /** Mission creation payload failed schema. */
  VL010: { code: 'VL010', category: 'Validation', message: 'Validation failed', detail: 'POST /api/missions: MissionSchema.safeParse returned error.' },

  /** Operation payload failed schema. */
  VL011: { code: 'VL011', category: 'Validation', message: 'Validation failed', detail: 'POST/PATCH /api/operation: OperationSchema.safeParse returned error.' },

  /** Planning payload failed schema. */
  VL012: { code: 'VL012', category: 'Validation', message: 'Validation failed', detail: 'POST/PATCH /api/planning: PlanningSchema.safeParse returned error.' },

  /** Flight request payload failed schema. */
  VL013: { code: 'VL013', category: 'Validation', message: 'Validation failed', detail: 'POST /api/planning/flight-request: FlightRequestSchema.safeParse returned error.' },

  /** Team/user payload failed schema. */
  VL014: { code: 'VL014', category: 'Validation', message: 'Validation failed', detail: 'POST/PATCH /api/team/user: UserSchema.safeParse returned error.' },

  /** Client payload failed schema. */
  VL015: { code: 'VL015', category: 'Validation', message: 'Validation failed', detail: 'POST/PATCH /api/client: ClientSchema.safeParse returned error.' },

  /** Document payload failed schema. */
  VL016: { code: 'VL016', category: 'Validation', message: 'Validation failed', detail: 'POST/PATCH /api/document: DocumentSchema.safeParse returned error.' },

  /** Checklist payload failed schema. */
  VL017: { code: 'VL017', category: 'Validation', message: 'Validation failed', detail: 'POST/PATCH /api/compliance: ChecklistSchema.safeParse returned error.' },

  /** Maintenance ticket payload failed schema. */
  VL018: { code: 'VL018', category: 'Validation', message: 'Validation failed', detail: 'POST/PATCH /api/system/maintenance: MaintenanceSchema.safeParse returned error.' },

  /** Settings/config payload failed schema. */
  VL019: { code: 'VL019', category: 'Validation', message: 'Validation failed', detail: 'POST/PATCH /api/settings: SettingsSchema.safeParse returned error.' },

  /** DCC report-bug payload missing required fields. */
  VL020: { code: 'VL020', category: 'Validation', message: 'Validation failed', detail: 'POST /api/dcc/report-bug: title or dcc field absent from request body.' },

  // ── Not Found (NF) ───────────────────────────────────────────────────────

  /** users table returned null for given user_id. */
  NF001: { code: 'NF001', category: 'NotFound', message: 'User not found', detail: 'Supabase SELECT on users table returned null for the supplied user_id.' },

  /** owner table returned null for given owner_id. */
  NF002: { code: 'NF002', category: 'NotFound', message: 'Organization not found', detail: 'Supabase SELECT on owner table returned null for the supplied owner_id.' },

  /** pilot_mission returned null. */
  NF003: { code: 'NF003', category: 'NotFound', message: 'Mission not found', detail: 'Supabase SELECT on pilot_mission table returned null for the supplied mission_id.' },

  /** operation table returned null. */
  NF004: { code: 'NF004', category: 'NotFound', message: 'Operation not found', detail: 'Supabase SELECT on operation table returned null for the supplied operation_id.' },

  /** planning table returned null. */
  NF005: { code: 'NF005', category: 'NotFound', message: 'Planning record not found', detail: 'Supabase SELECT on planning table returned null for the supplied planning_id.' },

  /** flight_requests table returned null. */
  NF006: { code: 'NF006', category: 'NotFound', message: 'Flight request not found', detail: 'Supabase SELECT on flight_requests table returned null.' },

  /** documents table returned null. */
  NF007: { code: 'NF007', category: 'NotFound', message: 'Document not found', detail: 'Supabase SELECT on documents table returned null for the supplied document_id.' },

  /** tool table returned null. */
  NF008: { code: 'NF008', category: 'NotFound', message: 'System not found', detail: 'Supabase SELECT on tool table returned null for the supplied tool_id.' },

  /** tool_component table returned null. */
  NF009: { code: 'NF009', category: 'NotFound', message: 'Component not found', detail: 'Supabase SELECT on tool_component table returned null for the supplied component_id.' },

  /** client table returned null. */
  NF010: { code: 'NF010', category: 'NotFound', message: 'Client not found', detail: 'Supabase SELECT on client table returned null for the supplied client_id.' },

  /** checklist table returned null. */
  NF011: { code: 'NF011', category: 'NotFound', message: 'Checklist not found', detail: 'Supabase SELECT on checklist table returned null for the supplied checklist_id.' },

  /** maintenance_ticket table returned null. */
  NF012: { code: 'NF012', category: 'NotFound', message: 'Maintenance ticket not found', detail: 'Supabase SELECT on maintenance_ticket table returned null.' },

  /** shift table returned null. */
  NF013: { code: 'NF013', category: 'NotFound', message: 'Shift not found', detail: 'Supabase SELECT on shift table returned null for the supplied shift_id.' },

  /** training table returned null. */
  NF014: { code: 'NF014', category: 'NotFound', message: 'Training record not found', detail: 'Supabase SELECT on training table returned null.' },

  /** evaluation table returned null. */
  NF015: { code: 'NF015', category: 'NotFound', message: 'Evaluation not found', detail: 'Supabase SELECT on evaluation table returned null.' },

  /** notifications table returned null. */
  NF016: { code: 'NF016', category: 'NotFound', message: 'Notification not found', detail: 'Supabase SELECT on notifications table returned null.' },

  /** logbook table returned null. */
  NF017: { code: 'NF017', category: 'NotFound', message: 'Logbook entry not found', detail: 'Supabase SELECT on logbook table returned null.' },

  /** luc_procedures / organization_procedure table returned null. */
  NF018: { code: 'NF018', category: 'NotFound', message: 'Procedure not found', detail: 'Supabase SELECT on procedures table returned null for the supplied procedure_id.' },

  /** safety_report table returned null. */
  NF019: { code: 'NF019', category: 'NotFound', message: 'Safety report not found', detail: 'Supabase SELECT on safety_report table returned null.' },

  /** assignment table returned null. */
  NF020: { code: 'NF020', category: 'NotFound', message: 'Assignment not found', detail: 'Supabase SELECT on assignment table returned null for the supplied assignment_id.' },

  /** Generic not-found fallback for tables without a dedicated code. */
  NF021: { code: 'NF021', category: 'NotFound', message: 'Record not found', detail: 'Generic fallback: query returned null and no specific NF0xx code applies.' },

  // ── Database (DB) ────────────────────────────────────────────────────────

  /** SELECT query returned a Supabase error (non-null .error). */
  DB001: { code: 'DB001', category: 'Database', message: 'A database error occurred', detail: 'Supabase SELECT returned a non-null error object; raw message logged server-side.' },

  /** INSERT returned a Supabase error. */
  DB002: { code: 'DB002', category: 'Database', message: 'Failed to create the record', detail: 'Supabase INSERT returned a non-null error object; raw message logged server-side.' },

  /** UPDATE returned a Supabase error. */
  DB003: { code: 'DB003', category: 'Database', message: 'Failed to update the record', detail: 'Supabase UPDATE returned a non-null error object; raw message logged server-side.' },

  /** DELETE returned a Supabase error. */
  DB004: { code: 'DB004', category: 'Database', message: 'Failed to delete the record', detail: 'Supabase DELETE returned a non-null error object; raw message logged server-side.' },

  /** Postgres unique_violation (23505). */
  DB005: { code: 'DB005', category: 'Database', message: 'This record already exists', detail: 'Supabase error code 23505 (unique_violation) — duplicate key on INSERT or UPDATE.' },

  /** Postgres foreign_key_violation (23503). */
  DB006: { code: 'DB006', category: 'Database', message: 'Cannot complete — a dependency exists', detail: 'Supabase error code 23503 (foreign_key_violation) — referenced row missing or record in use.' },

  /** Catch-all for unexpected Postgres/PostgREST error codes. */
  DB007: { code: 'DB007', category: 'Database', message: 'A database error occurred', detail: 'Supabase returned an error code not specifically handled; raw details logged server-side.' },

  // ── Internal Server (SV) ─────────────────────────────────────────────────

  /** Top-level catch in an API route handler. */
  SV001: { code: 'SV001', category: 'Server', message: 'An unexpected error occurred', detail: 'Outermost catch block in a GET/POST/PATCH/DELETE route handler caught an unhandled exception.' },

  /** Service layer propagated an exception to the route. */
  SV002: { code: 'SV002', category: 'Server', message: 'An unexpected error occurred', detail: 'Service function threw; caught in route handler and mapped here to avoid leaking internals.' },

  /** Required environment variable not set. */
  SV003: { code: 'SV003', category: 'Server', message: 'Service configuration error', detail: 'process.env lookup returned undefined for a required variable at startup or request time.' },

  /** Catch in a background/non-request async task. */
  SV004: { code: 'SV004', category: 'Server', message: 'An unexpected error occurred', detail: 'Background task (cron, event handler) catch block; not tied to a specific HTTP request.' },

  /** Serialization error outside request body parsing. */
  SV005: { code: 'SV005', category: 'Server', message: 'An unexpected error occurred', detail: 'JSON.parse / JSON.stringify threw outside of normal request/response flow.' },

  // ── Business Logic (BL) ──────────────────────────────────────────────────

  /** Explicit pre-insert duplicate check found a matching record. */
  BL001: { code: 'BL001', category: 'BusinessLogic', message: 'This record already exists', detail: 'Application-level duplicate check (before DB insert) found a conflicting row — e.g. duplicate mission external_id.' },

  /** Resource is soft-deleted / inactive, mutation blocked. */
  BL002: { code: 'BL002', category: 'BusinessLogic', message: 'This resource is inactive', detail: 'Resource active flag is "N"; modification or assignment blocked at route/service level.' },

  /** Workflow transition not permitted from current state. */
  BL003: { code: 'BL003', category: 'BusinessLogic', message: 'This action is not permitted in the current state', detail: 'State machine check failed — e.g. attempting COMPLETE on a mission that is not IN_PROGRESS.' },

  /** Hard/soft delete blocked due to child records. */
  BL004: { code: 'BL004', category: 'BusinessLogic', message: 'Cannot delete — this record is referenced elsewhere', detail: 'Pre-delete check found dependent rows (FK children); delete would violate referential integrity.' },

  /** Tool has an open maintenance ticket. */
  BL005: { code: 'BL005', category: 'BusinessLogic', message: 'System is currently under maintenance', detail: 'Assigned tool has a maintenance_ticket with ticket_status != "CLOSED"; operation blocked.' },

  /** Tool has no active DRONE component. */
  BL006: { code: 'BL006', category: 'BusinessLogic', message: 'No drone attached to this system', detail: 'tool_component query found no row with component_type = "DRONE" and component_active = "Y".' },

  /** End date before start date. */
  BL007: { code: 'BL007', category: 'BusinessLogic', message: 'Date range is invalid', detail: 'end_date / end_time is before or equal to start_date / start_time in the payload.' },

  /** Time-slot overlap detected. */
  BL008: { code: 'BL008', category: 'BusinessLogic', message: 'Schedule conflict detected', detail: 'Requested time range overlaps an existing confirmed booking for the same resource.' },

  /** Mission already assigned to another operator. */
  BL009: { code: 'BL009', category: 'BusinessLogic', message: 'Mission is already assigned', detail: 'Attempted assignment where an active fk_user_id already exists on pilot_mission.' },

  /** Organization quota reached. */
  BL010: { code: 'BL010', category: 'BusinessLogic', message: 'Organization limit reached', detail: 'Action would exceed the configured quota for this owner (seats, active missions, etc.).' },

  // ── DCC Integration (DC) ─────────────────────────────────────────────────

  /** getDccCallbackUrl returned null — URL not configured. */
  DC001: { code: 'DC001', category: 'DCC', message: 'DCC integration is not configured for this organization', detail: 'getDccCallbackUrl returned null; no DCC base URL set in owner settings.' },

  /** DCC endpoint returned non-2xx HTTP status. */
  DC002: { code: 'DC002', category: 'DCC', message: 'DCC request failed', detail: 'fetch() to DCC endpoint received !res.ok; status and body logged server-side.' },

  /** fetch() to DCC threw a network/timeout error. */
  DC003: { code: 'DC003', category: 'DCC', message: 'DCC request could not be sent', detail: 'fetch() threw (AbortSignal timeout, DNS failure, connection refused); logged server-side.' },

  /** DRONE tool_component exists but dcc_drone_id UUID is null. */
  DC004: { code: 'DC004', category: 'DCC', message: 'Drone ID not configured on this system', detail: 'tool_component row found for DRONE type but dcc_drone_id column is NULL; must be set in settings.' },

  /** No flight_request row links this planning_id to an external_mission_id. */
  DC005: { code: 'DC005', category: 'DCC', message: 'External mission ID not found', detail: 'flight_requests.external_mission_id is null or no row exists for this planning_id.' },

  /** report-bug route catch block. */
  DC006: { code: 'DC006', category: 'DCC', message: 'Failed to log DCC error report', detail: 'POST /api/dcc/report-bug: logEvent call or session fetch threw an exception.' },

  // ── Configuration (CF) ───────────────────────────────────────────────────

  /** Supabase env vars missing. */
  CF001: { code: 'CF001', category: 'Configuration', message: 'Service configuration error', detail: 'NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set in environment.' },

  /** Email provider credentials missing. */
  CF002: { code: 'CF002', category: 'Configuration', message: 'Service configuration error', detail: 'SMTP host/user/pass or SendGrid API key absent from environment variables.' },

  /** Storage bucket config missing. */
  CF003: { code: 'CF003', category: 'Configuration', message: 'Service configuration error', detail: 'STORAGE_BUCKET or cloud provider key not set; upload path cannot be resolved.' },

  // ── Upload / Storage (UP) ────────────────────────────────────────────────

  /** Supabase Storage upload() returned error. */
  UP001: { code: 'UP001', category: 'Upload', message: 'File upload failed', detail: 'Supabase Storage upload() returned a non-null error; raw storage error logged server-side.' },

  /** createSignedUrl / getPublicUrl failed. */
  UP002: { code: 'UP002', category: 'Upload', message: 'Could not generate file URL', detail: 'Supabase Storage URL generation returned an error; logged server-side.' },

  /** Storage remove() failed. */
  UP003: { code: 'UP003', category: 'Upload', message: 'File could not be deleted', detail: 'Supabase Storage remove() returned an error when deleting an existing object.' },

  /** FormData parse or file field missing. */
  UP004: { code: 'UP004', category: 'Upload', message: 'File upload failed', detail: 'req.formData() threw or the expected file field was absent from the multipart body.' },

  // ── Notification (NT) ────────────────────────────────────────────────────

  /** Push notification dispatch failed. */
  NT001: { code: 'NT001', category: 'Notification', message: 'Notification could not be sent', detail: 'FCM/APNS or web-push call returned error or non-2xx response.' },

  /** Email dispatch failed. */
  NT002: { code: 'NT002', category: 'Notification', message: 'Notification could not be sent', detail: 'Email provider SDK returned an error or non-2xx HTTP response.' },

  /** Notification route/service unhandled catch. */
  NT003: { code: 'NT003', category: 'Notification', message: 'An unexpected error occurred', detail: 'Catch block in notification API route or notification service threw an unhandled exception.' },

  // ── Session (SS) ─────────────────────────────────────────────────────────

  /** getUserSession threw unexpectedly. */
  SS001: { code: 'SS001', category: 'Session', message: 'Session error', detail: 'getUserSession threw an unexpected exception (cookie store unavailable, jwt-utils crashed).' },

  /** Session token decoded but required fields missing. */
  SS002: { code: 'SS002', category: 'Session', message: 'Session data is invalid', detail: 'JWT decoded successfully but userId, role, or ownerId fields are absent from the payload.' },

  /** Logout failed to clear session. */
  SS003: { code: 'SS003', category: 'Session', message: 'Could not end session', detail: 'POST /api/auth/logout: cookie deletion or token revocation threw an exception.' },

} as const satisfies Record<string, ErrorEntry>;

export type ErrorCodeKey = keyof typeof E;
