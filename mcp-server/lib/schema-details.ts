export const TABLE_SCHEMA: Record<string, string> = {

    pilot_mission: `
  pilot_mission_id: unique mission ID
  fk_pilot_user_id: the pilot's user ID
  fk_planning_id: links to the planning/flight plan
  fk_tool_id: the drone/tool used
  mission_code: unique mission code
  mission_name: title of the mission
  status_name: Completed | Cancelled | In Progress | Planned
  flight_duration: flight time in MINUTES
  distance_flown: distance in km
  max_altitude: altitude in metres
  scheduled_start: planned start datetime
  actual_start: real start datetime
  actual_end: real end datetime
  location: text location description
  fuel_used: fuel consumed
  pre_flight_check_ok: boolean
  post_flight_check_ok: boolean
  notes: additional notes
  fk_owner_id: organisation ID`,

    pilot_mission_result: `
  fk_pilot_mission_id: links to pilot_mission
  result_type: category of result
  quality_score: 0-100 rating
  data_size: bytes of data collected`,

    planning: `
  planning_id: unique plan ID
  planning_name: plan name
  planning_status: status of the plan
  planning_type: type of planning
  planned_date: target date
  planning_description: details
  fk_owner_id: organisation ID`,

    planning_logbook: `
  fk_planning_id: links to planning
  mission_planning_code: code of the mission plan
  mission_planning_desc: description
  waypoints: JSON waypoint data
  flight_parameters: JSON flight parameters`,

    pilot_declaration: `
  declaration_type: type of declaration
  declaration_status: status
  declaration_date: date`,

    notification: `
  notification_type: type of notification
  notification_message: the message
  is_read: whether read
  created_at: when sent`,

    repository_file: `
  file_name: name of the file
  description: file description
  tags: JSON tags`,

    calendar_shift: `
  shift_date: date of shift
  shift_type: type of shift
  shift_status: status`,

    checklist: `
  checklist_name: name
  checklist_type: type
  checklist_status: status`,

    luc_document: `
  document_name: name
  document_type: type
  document_status: status
  expiry_date: when it expires`,

    client: `
  client_name: name
  client_code: unique code
  client_type: type
  contact_email: contact address
  contact_phone: phone number
  client_active: Y/N status`,

    users: `
  user_id: unique user ID
  first_name: first name
  last_name: last name
  email: email address
  user_role: their role
  user_active: Y/N active status
  user_type: type of user
  is_viewer: Y/N viewer-only access
  is_manager: Y/N manager flag
  fk_owner_id: organisation ID`,

    users_profile: `
  fk_user_id: links to users
  certifications: JSON certifications held
  skills: JSON skills list
  date_of_birth: DOB
  user_primary_certification: primary certification
  address: address
  city: city
  state: state
  postal_code: postal code`,

    user_permessi: `
  fk_user_id: which user
  permission_code: permission code
  permission_desc: description
  permission_active: Y/N
  granted_at: when granted
  expires_at: when expires`,

    tool: `
  tool_id: unique tool ID
  tool_name: name of the drone/equipment
  tool_code: asset code
  tool_serial_number: serial number
  tool_description: description
  warranty_expiry: warranty end date
  last_calibration_date: last calibration
  next_calibration_date: next calibration due
  location: storage location
  tool_active: Y/N
  fk_owner_id: organisation ID`,

    tool_maintenance: `
  maintenance_id: unique maintenance ID
  fk_tool_id: which tool
  maintenance_type: preventive | corrective | inspection | calibration
  maintenance_description: details
  maintenance_status: scheduled | in_progress | completed
  scheduled_date: when scheduled
  completed_date: when completed
  maintenance_cost: cost
  next_maintenance_date: next scheduled`,

    tool_component: `
  fk_tool_id: which tool
  component_name: name
  component_type: type
  serial_number: serial
  installation_date: when installed
  expected_lifespan_hours: expected lifetime
  current_usage_hours: current usage
  next_replacement_date: when to replace
  component_active: Y/N`,

    audit: `
  audit_id: unique ID
  audit_type: internal | external | surveillance
  audit_status: planned | in_progress | completed | cancelled
  audit_date: date of audit
  audit_scope: scope description
  findings_summary: summary of findings
  fk_owner_id: organisation ID`,

    audit_finding: `
  fk_audit_id: links to audit
  finding_type: observation | non_conformity | opportunity
  finding_severity: critical | major | minor
  finding_description: details
  corrective_action: required action
  finding_status: open | in_progress | closed
  due_date: deadline`,

    compliance_requirement: `
  requirement_name: name
  requirement_description: details
  compliance_status: compliant | non_compliant | partially_compliant
  due_date: deadline
  regulation_reference: which regulation
  fk_owner_id: organisation ID`,

    compliance_evidence: `
  fk_requirement_id: links to compliance_requirement
  evidence_type: type of evidence
  evidence_description: details
  uploaded_at: when uploaded`,

    compliance_status_log: `
  fk_requirement_id: links to compliance_requirement
  previous_status: old status
  new_status: new status
  changed_at: when changed
  changed_by_user_id: who changed it`,

    safety_report: `
  report_id: unique report ID
  report_type: incident | hazard | observation
  severity: critical | high | medium | low
  incident_date: when it occurred
  report_status: open | under_investigation | closed
  description: what happened
  root_cause: identified root cause
  immediate_actions: actions taken immediately
  fk_owner_id: organisation ID
  fk_pilot_mission_id: related mission (if any)`,

    safety_action: `
  fk_report_id: links to safety_report
  action_type: type of action
  action_description: details
  action_priority: priority level
  action_status: pending | in_progress | completed
  assigned_to_user_id: who is assigned
  due_date: deadline
  completed_date: when completed`,

    spi_kpi: `
  fk_definition_id: links to spi_kpi_definition
  measurement_date: when measured
  actual_value: the measured number
  target_value: what the target is
  threshold_min: minimum acceptable
  threshold_max: maximum acceptable
  status: on_track | at_risk | breached
  trend: improving | declining | stable
  fk_owner_id: organisation ID`,

    spi_kpi_definition: `
  definition_id: unique definition ID
  kpi_name: name of the KPI
  kpi_description: what it measures
  kpi_category: safety | operational | compliance
  kpi_type: type of KPI
  measurement_unit: %, count, hours etc
  frequency: how often measured
  is_active: whether active`,

    spi_kpi_log: `
  fk_kpi_id: links to spi_kpi
  log_date: when logged
  previous_value: old value
  new_value: new value`,

    alert_log: `
  alert_id: unique alert ID
  alert_type: LINK_LOSS | LOW_BATTERY | MAINTENANCE | WIND_ALERT | CERT_EXPIRY | GEOFENCE (the category of the alert)
  alert_severity: HIGH | MEDIUM | LOW (NOTE: "critical" or "urgent" from users means HIGH, "minor" means LOW)
  alert_source: FlytBase | System | Weather (where the alert originated)
  alert_message: human-readable description of the alert
  alert_status: OPEN | ACKNOWLEDGED | RESOLVED (current resolution state)
  created_at: when the alert was created`,

    maintenance_ticket: `
  ticket_id: unique ticket ID
  fk_tool_id: which tool
  ticket_number: ticket number
  ticket_title: title
  ticket_description: description
  ticket_type: type of issue
  ticket_priority: high | medium | low
  ticket_status: open | in_progress | resolved | closed
  reported_at: when reported
  completed_at: when completed
  actual_hours: hours spent
  resolution_notes: how it was resolved
  fk_owner_id: organisation ID`,

    maintenance_ticket_event: `
  fk_ticket_id: links to maintenance_ticket
  event_type: type of event
  event_description: details
  event_date: when occurred`,

    maintenance_ticket_item: `
  fk_ticket_id: links to maintenance_ticket
  item_name: name of part
  item_quantity: quantity used
  item_type: type of part`,

    training: `
  training_id: unique training ID
  training_name: name of the course
  training_description: what the training covers
  training_type: type of training
  training_duration: duration in hours
  training_active: Y/N whether active
  fk_owner_id: organisation ID`,

    training_attendance: `
  fk_training_id: links to training
  fk_user_id: which user attended
  training_session_date: date of session
  attendance_status: present | absent | excused
  completion_status: completed | in_progress | failed
  score: score achieved (0-100)
  certification_issued: whether cert was issued
  certification_number: cert number
  certification_date: when issued
  certification_expiry: when cert expires`,
};

export const ROLE_QUERY_RULES: Record<string, string> = {
    PIC: "The PIC can only see their own missions. This is enforced automatically so you do NOT need to filter by user ID. You can freely use extra_filter for other things instead.",
    OPM: "The OPM can see all data across the organisation. No special filters needed.",
    SM: "Focus on safety-related data. When querying pilot_mission, it is for cross-referencing with safety reports.",
    AM: "Focus on audits, compliance, and equipment oversight.",
    CMM: "Focus on compliance monitoring and audit management.",
    MM: "Focus on maintenance and equipment. When querying pilot_mission, it is for tracking wear and tear via flight hours.",
    TM: "Focus on training data and staff qualifications.",
    DC: "Focus on user management and data governance.",
    SLA: "Focus on SLA metrics, performance tracking, and service levels.",
};
