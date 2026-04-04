export const SCHEMA_KNOWLEDGE: Record<string, string> = {

  PIC: `
      TABLE: pilot_mission — Individual flight missions flown by this pilot.
        pilot_mission_id: unique mission ID
        fk_pilot_user_id: the pilot's user ID (ALWAYS filter by logged-in user)
        fk_planning_id: links to the planning/flight plan
        fk_tool_id: the drone/tool used
        mission_code: unique mission code
        mission_name: title of the mission
        status_name: Completed | Cancelled | In Progress | Planned
        flight_duration: flight time in MINUTES
        distance_flown: distance in km
        max_altitude: altitude in metres
        scheduled_start: planned start datetime
        actual_start / actual_end: real start and end datetimes
        location: text location description
        fuel_used: fuel consumed
        pre_flight_check_ok / post_flight_check_ok: boolean checks
        notes: additional notes
        fk_owner_id: organisation ID

      TABLE: pilot_mission_result — Data/results collected from a mission.
        fk_pilot_mission_id: links to pilot_mission
        result_type: category of result
        quality_score: 0-100 rating
        data_size: bytes of data collected

      TABLE: planning — Flight plans created for missions.
        planning_id: unique plan ID
        planning_name: plan name
        planning_status: status of the plan
        planning_type: type of planning
        planned_date: target date
        planning_description: details
        fk_owner_id: organisation ID

      TABLE: planning_logbook — Detailed mission plans with waypoints.
        fk_planning_id: links to planning
        mission_planning_code: code of the mission plan
        mission_planning_desc: description
        waypoints: JSON waypoint data
        flight_parameters: JSON flight parameters

      TABLE: pilot_declaration — Pilot declarations before/after missions.
        declaration_type: type of declaration
        declaration_status: status
        declaration_date: date

      TABLE: notification — System notifications for this pilot.
        notification_type: type of notification
        notification_message: the message
        is_read: whether read
        created_at: when sent

      TABLE: repository_file — Uploaded files and documents.
        file_name: name of the file
        file_type: type/extension
        file_size: size in bytes
        description: file description
        tags: JSON tags
`,

  OPM: `
    TABLE: pilot_mission — All flight missions across the organisation.
      pilot_mission_id: unique mission ID
      fk_pilot_user_id: which pilot flew it
      mission_name: title of the mission
      status_name: Completed | Cancelled | In Progress | Planned
      flight_duration: flight time in MINUTES
      distance_flown: distance in km
      max_altitude: altitude in metres
      scheduled_start: planned start datetime
      actual_start / actual_end: real start and end datetimes
      location: text location
      fk_owner_id: organisation ID

    TABLE: planning — Flight plans.
      planning_name: plan name
      planning_status: status
      planning_type: type
      planned_date: target date
      planning_description: details

    TABLE: planning_logbook — Detailed mission plans with waypoints.
      fk_planning_id: links to planning
      mission_planning_desc: description
      waypoints: JSON waypoint data
      flight_parameters: JSON flight parameters

    TABLE: pilot_mission_result — Mission results and collected data.
      fk_pilot_mission_id: links to pilot_mission
      result_type: category
      quality_score: 0-100
      data_size: bytes of data collected

    TABLE: calendar_shift — Crew shift schedules.
      shift_date: date of shift
      shift_type: type of shift
      shift_status: status

    TABLE: checklist — Operational checklists.
      checklist_name: name
      checklist_type: type
      checklist_status: status

    TABLE: luc_document — LUC (Light UAS Certificate) documents.
      document_name: name
      document_type: type
      document_status: status
      expiry_date: when it expires

    TABLE: client — Client and customer info (Admin Only).
      client_name: name
      client_code: unique code
      contact_email: contact address
      client_active: Y/N status

    TABLE: users — System users and staff.
      user_id: unique user ID
      first_name / last_name: name
      email: email address
      user_role: their role
      user_active: Y/N active status

    TABLE: tool — Drones and equipment inventory.
      tool_name: name of the drone/equipment
      tool_code: asset code
      tool_serial_number: serial number
      tool_description: description
      warranty_expiry: warranty end date
      last_calibration_date / next_calibration_date: calibration dates
      location: storage location
      tool_active: Y/N

    TABLE: tool_maintenance — Maintenance records for drones.
      maintenance_type: preventive | corrective | inspection | calibration
      maintenance_status: scheduled | in_progress | completed
      scheduled_date: when scheduled
      maintenance_description: details
      next_maintenance_date: next scheduled

    TABLE: audit — Organisational audits.
      audit_type: internal | external | surveillance
      audit_status: planned | in_progress | completed
      audit_date: when conducted
      findings_summary: summary

    TABLE: compliance_requirement — Regulatory compliance tracking.
      requirement_name: name
      requirement_description: details
      compliance_status: compliant | non_compliant

    TABLE: safety_report — Incidents and hazard observations.
      report_type: incident | hazard | observation
      severity: critical | high | medium | low
      incident_date: when it occurred
      report_status: open | closed
      description: what happened

    TABLE: alert_log — System alerts and warnings.
      alert_type: category
      alert_severity: emergency | warning | info
      alert_status: open | resolved
      alert_message: description

    TABLE: training — Training courses and programs.
      training_name: name of the course
      training_type: type of training
      training_duration: hours
      training_active: Y/N

    TABLE: notification — System-wide notifications.
      notification_message: the message
      is_read: whether read
      created_at: timestamp

    TABLE: repository_file — Operational documents and uploads.
      file_name: name
      file_type: type
      description: details
`,

  SM: `
      TABLE: safety_report — Safety incidents, hazards, and observations.
      report_id: unique report ID
      report_type: incident | hazard | observation
      severity: critical | high | medium | low
      incident_date: when it occurred
      report_status: open | under_investigation | closed
      description: what happened
      root_cause: identified root cause
      immediate_actions: actions taken immediately
      fk_owner_id: organisation ID
      fk_pilot_mission_id: related mission (if any)

    TABLE: safety_action — Corrective actions after safety reports.
      fk_report_id: links to safety_report
      action_type: type of action
      action_description: details
      action_priority: priority level
      action_status: pending | in_progress | completed
      assigned_to_user_id: who is assigned
      due_date: deadline
      completed_date: when completed

    TABLE: spi_kpi — Actual measured KPI/SPI values.
      fk_definition_id: links to spi_kpi_definition
      measurement_date: when measured
      actual_value: the measured number
      target_value: what the target is
      threshold_min / threshold_max: acceptable range
      status: on_track | at_risk | breached
      trend: improving | declining | stable
      fk_owner_id: organisation ID

    TABLE: spi_kpi_definition — KPI definitions and what they measure.
      definition_id: unique definition ID
      kpi_name: name of the KPI
      kpi_description: what it measures
      kpi_category: safety | operational | compliance
      kpi_type: type of KPI
      measurement_unit: %, count, hours etc
      frequency: how often measured
      is_active: whether active

    TABLE: spi_kpi_log — Historical log of KPI changes.
      fk_kpi_id: links to spi_kpi
      log_date: when logged
      previous_value / new_value: value change

    TABLE: alert_log — System alerts and warnings.
      alert_type: alert category
      alert_severity: emergency | warning | info
      alert_status: open | acknowledged | resolved
      alert_message: description
      created_at: when created

    TABLE: pilot_mission — Missions (for cross-referencing with safety data).
      pilot_mission_id: unique ID
      mission_name: title
      status_name: status
      fk_pilot_user_id: pilot
      scheduled_start: when planned

    TABLE: tool — Maintenance context for safety.
      tool_name: drone name
      tool_serial_number: serial
      tool_active: Y/N

    TABLE: maintenance_ticket — Maintenance history for risk assessment.
      ticket_title: issue description
      ticket_status: status
      reported_at: when reported

    TABLE: training — Pilot qualifications.
      training_name: course title
      training_type: category

    TABLE: training_attendance — Individual certification records.
      fk_user_id: links to user
      completion_status: completed | failed
      certification_expiry: expiration date
`,

  AM: `
TABLE: pilot_mission — Flight missions overview.
  pilot_mission_id: unique mission ID
  mission_name: title
  status_name: Completed | Cancelled | In Progress | Planned
  flight_duration: minutes
  scheduled_start: when planned
  fk_owner_id: organisation ID

TABLE: planning — Flight plans.
  planning_name: plan name
  planning_status: status
  planned_date: target date

TABLE: tool — Drones and equipment.
  tool_id: unique tool ID
  tool_name: name of the drone/equipment
  tool_code: asset code
  tool_serial_number: serial number
  tool_description: description
  warranty_expiry: warranty end date
  last_calibration_date / next_calibration_date: calibration dates
  location: where stored
  tool_active: Y/N whether active
  fk_owner_id: organisation ID

TABLE: tool_maintenance — Maintenance records for tools.
  fk_tool_id: which tool
  maintenance_type: type of maintenance
  maintenance_status: status
  scheduled_date: when scheduled
  completed_date: when completed
  maintenance_description: details
  next_maintenance_date: next scheduled

TABLE: luc_document — LUC documents.
  document_name: name
  document_type: type
  document_status: status
  expiry_date: expiry

TABLE: audit — Audit records.
  audit_id: unique ID
  audit_type: type of audit
  audit_status: status
  audit_date: when conducted
  findings_summary: summary

TABLE: compliance_requirement — Regulatory compliance requirements.
  requirement_name: name
  requirement_description: details
  compliance_status: current status
  due_date: deadline
  regulation_reference: which regulation

TABLE: notification — Service notifications.
  notification_message: message
  created_at: sent time
`,

  CMM: `
    TABLE: audit — Audit records and plans.
      audit_id: unique ID
      audit_type: internal | external | surveillance
      audit_status: planned | in_progress | completed | cancelled
      audit_date: date of audit
      audit_scope: scope description
      findings_summary: summary of findings
      fk_owner_id: organisation ID

    TABLE: audit_finding — Individual findings from audits.
      fk_audit_id: links to audit
      finding_type: observation | non_conformity | opportunity
      finding_severity: critical | major | minor
      finding_description: details
      corrective_action: required action
      finding_status: open | in_progress | closed
      due_date: deadline

    TABLE: compliance_requirement — Regulatory requirements to track.
      requirement_name: name
      requirement_description: details
      compliance_status: compliant | non_compliant | partially_compliant
      due_date: deadline
      regulation_reference: which regulation
      fk_owner_id: organisation ID

    TABLE: compliance_evidence — Evidence uploaded for compliance.
      fk_requirement_id: links to compliance_requirement
      evidence_type: type of evidence
      evidence_description: details
      uploaded_at: when uploaded

    TABLE: compliance_status_log — History of compliance status changes.
      fk_requirement_id: links to compliance_requirement
      previous_status / new_status: status change
      changed_at: when changed
      changed_by_user_id: who changed it

    TABLE: spi_kpi — KPI measurements (for compliance metrics).
      measurement_date: when measured
      actual_value: measured value
      target_value: target
      status: on_track | at_risk | breached
      trend: improving | declining | stable

    TABLE: spi_kpi_definition — KPI definitions.
      kpi_name: name
      kpi_description: description
      kpi_category: safety | operational | compliance
      measurement_unit: unit of measure
`,

  MM: `
    TABLE: tool — Drones and equipment inventory.
      tool_id: unique tool ID
      tool_name: name of the drone/equipment
      tool_code: asset code
      tool_serial_number: serial number
      tool_description: description
      warranty_expiry: warranty end date
      last_calibration_date: last calibration
      next_calibration_date: next calibration due
      location: where stored
      tool_active: Y/N
      fk_owner_id: organisation ID

    TABLE: tool_maintenance — Maintenance records.
      maintenance_id: unique maintenance ID
      fk_tool_id: which tool
      maintenance_type: preventive | corrective | inspection | calibration
      maintenance_description: details
      maintenance_status: scheduled | in_progress | completed
      scheduled_date: when scheduled
      completed_date: when completed
      maintenance_cost: cost
      next_maintenance_date: next scheduled

    TABLE: tool_component — Components of a tool/drone.
      fk_tool_id: which tool
      component_name: name
      component_type: type
      serial_number: serial
      installation_date: when installed
      expected_lifespan_hours: expected lifetime
      current_usage_hours: current usage
      next_replacement_date: when to replace
      component_active: Y/N

    TABLE: maintenance_ticket — Maintenance issue tickets.
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
      fk_owner_id: organisation ID

    TABLE: maintenance_ticket_event — Events/updates on tickets.
      fk_ticket_id: links to maintenance_ticket
      event_type: type of event
      event_description: details
      event_date: when occurred

    TABLE: maintenance_ticket_item — Parts/items used in ticket resolution.
      fk_ticket_id: links to maintenance_ticket
      item_name: name of part
      item_quantity: quantity used
      item_type: type of part

TABLE: pilot_mission — Wear and tear tracking via flight hours.
  mission_name: mission title
  status_name: status
  flight_duration: flight time in MINUTES (track for wear and tear)
  scheduled_start: when flwon

TABLE: alert_log — System-critical equipment alerts.
  alert_message: alert details
  alert_severity: severity
`,

  TM: `
TABLE: training — Training courses and programs.
  training_id: unique training ID
  training_name: name of the course
  training_description: what the training covers
  training_type: type of training
  training_duration: duration in hours
  training_active: Y/N whether active
  fk_owner_id: organisation ID

TABLE: training_attendance — Records of who attended what training.
  fk_training_id: links to training
  fk_user_id: which user attended
  training_session_date: date of session
  attendance_status: present | absent | excused
  completion_status: completed | in_progress | failed
  score: score achieved (0-100)
  certification_issued: whether cert was issued
  certification_number: cert number
  certification_date: when issued
  certification_expiry: when cert expires

TABLE: spi_kpi — KPI measurements (for training metrics).
  measurement_date: when measured
  actual_value: measured value
  target_value: target
  status: on_track | at_risk | breached

TABLE: users — Staff information.
  user_id: unique user ID
  first_name / last_name: name
  email: email
  user_role: role
  user_active: Y/N

TABLE: users_profile — Extended user profile.
  fk_user_id: links to users
  certifications: JSON certifications held
  skills: JSON skills list
  date_of_birth: DOB
  user_primary_certification: primary certification
`,

  DC: `
    TABLE: users — All system users.
      user_id: unique user ID
      username: login username
      first_name / last_name: name
      email: email address
      user_role: role in system
      user_active: Y/N
      user_type: type of user
      fk_owner_id: organisation ID
      fk_user_profile_id: profile ID (determines role)
      is_viewer: Y/N viewer-only access
      is_manager: Y/N manager flag

    TABLE: users_profile — Extended user profile data.
      fk_user_id: links to users
      address / city / state / postal_code: location
      certifications: JSON certifications
      skills: JSON skills
      date_of_birth: DOB

    TABLE: user_permessi — User permissions.
      fk_user_id: which user
      permission_code: permission code
      permission_desc: description
      permission_active: Y/N
      granted_at: when granted
      expires_at: when expires

    TABLE: pilot_mission — Missions (for user activity tracking).
      pilot_mission_id: unique ID
      fk_pilot_user_id: pilot
      mission_name: title
      status_name: status

    TABLE: planning_logbook — Mission plans.
      mission_planning_code: code
      mission_planning_desc: description

    TABLE: repository_file — Documents and files.
      file_name: name
      file_type: type
      file_size: size
      description: description
      tags: JSON tags
    `,

  SLA: `
    TABLE: pilot_mission — Flight missions for SLA monitoring.
      pilot_mission_id: unique ID
      mission_name: title
      status_name: Completed | Cancelled | In Progress | Planned
      flight_duration: minutes
      scheduled_start: planned start
      actual_start / actual_end: actual times
      fk_owner_id: organisation ID

    TABLE: tool — Equipment and drones.
      tool_name: name
      tool_code: asset code
      tool_active: Y/N
      warranty_expiry: warranty end
      next_calibration_date: next calibration

    TABLE: maintenance_ticket — Maintenance tickets for SLA tracking.
      ticket_title: title
      ticket_status: open | in_progress | resolved | closed
      ticket_priority: high | medium | low
      reported_at: when reported
      completed_at: when completed
      actual_hours: hours spent
      fk_owner_id: organisation ID

    TABLE: spi_kpi — KPI measurements for SLA metrics.
      measurement_date: when measured
      actual_value: measured value
      target_value: target
      status: on_track | at_risk | breached
      trend: improving | declining | stable

    TABLE: alert_log — System alerts.
      alert_type: type
      alert_severity: emergency | warning | info
      alert_status: open | acknowledged | resolved
      alert_message: description
      created_at: when created

    TABLE: client — Client/customer information.
      client_name: name
      client_code: code
      client_type: type
      client_active: Y/N
      contact_email: email
      contact_phone: phone
`,
};
