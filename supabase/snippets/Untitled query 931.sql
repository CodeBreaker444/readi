-- Feature permission matrix: schema-only migration.
-- Run this against every environment's database (local + any remote copies) before deploying.
-- A separate seed file (002_feature_permissions_seed.sql) populates role_feature_permission defaults.

CREATE TABLE IF NOT EXISTS public.role_feature_permission (
  id SERIAL PRIMARY KEY,
  role VARCHAR(50) NOT NULL,
  feature_key VARCHAR(100) NOT NULL,
  access CHAR(1) NOT NULL DEFAULT 'R',
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT role_feature_permission_role_feature_key_key UNIQUE (role, feature_key)
);

CREATE TABLE IF NOT EXISTS public.user_feature_permission (
  id SERIAL PRIMARY KEY,
  fk_user_id INTEGER NOT NULL,
  feature_key VARCHAR(100) NOT NULL,
  access CHAR(1) NOT NULL DEFAULT 'R',
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT user_feature_permission_fk_user_id_feature_key_key UNIQUE (fk_user_id, feature_key),
  CONSTRAINT user_feature_permission_fk_user_id_fkey
    FOREIGN KEY (fk_user_id) REFERENCES public.users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_feature_permission_fk_user_id
  ON public.user_feature_permission (fk_user_id);

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS has_custom_permissions BOOLEAN DEFAULT false;
  
 
ALTER TABLE public.role_feature_permission
  ADD COLUMN IF NOT EXISTS fk_owner_id INTEGER;

-- 2. Backfill: the table (seeded by 002_feature_permissions_seed.sql) was global, i.e. one
--    row per (role, feature_key) shared by every company. Fan those rows out to every
--    existing company so nobody loses their current effective permissions.
INSERT INTO public.role_feature_permission (fk_owner_id, role, feature_key, access)
SELECT o.owner_id, rfp.role, rfp.feature_key, rfp.access
FROM public.role_feature_permission rfp
CROSS JOIN public.owner o
WHERE rfp.fk_owner_id IS NULL
ON CONFLICT DO NOTHING;

-- 3. Drop the now-obsolete global rows.
DELETE FROM public.role_feature_permission WHERE fk_owner_id IS NULL;

-- 4. Enforce the column and re-key uniqueness/indexes per company.
ALTER TABLE public.role_feature_permission
  ALTER COLUMN fk_owner_id SET NOT NULL;

ALTER TABLE public.role_feature_permission
  DROP CONSTRAINT IF EXISTS role_feature_permission_role_feature_key_key;

ALTER TABLE public.role_feature_permission
  ADD CONSTRAINT role_feature_permission_owner_role_feature_key_key UNIQUE (fk_owner_id, role, feature_key);

ALTER TABLE public.role_feature_permission
  ADD CONSTRAINT role_feature_permission_fk_owner_id_fkey
    FOREIGN KEY (fk_owner_id) REFERENCES public.owner(owner_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_role_feature_permission_fk_owner_id
  ON public.role_feature_permission (fk_owner_id);


INSERT INTO public.role_feature_permission (fk_owner_id, role, feature_key, access)
VALUES
-- AM (Account Manager) - Read access to all features
(15, 'AM', 'dashboard_analytics', 'R'),
(15, 'AM', 'dashboard_shi_kpi', 'R'),
(15, 'AM', 'planning_new_evaluation', 'R'),
(15, 'AM', 'planning_evaluation', 'R'),
(15, 'AM', 'planning_dashboard', 'R'),
(15, 'AM', 'planning_mission_templates', 'R'),
(15, 'AM', 'operation_mission_table', 'R'),
(15, 'AM', 'operation_daily_board', 'R'),
(15, 'AM', 'operation_flight_requests', 'R'),
(15, 'AM', 'operation_calendar', 'R'),
(15, 'AM', 'logbook_planned_mission', 'R'),
(15, 'AM', 'logbook_flight', 'R'),
(15, 'AM', 'logbook_battery', 'R'),
(15, 'AM', 'safety_spi_kpi_definitions', 'R'),
(15, 'AM', 'emergency_contact_list', 'R'),
(15, 'AM', 'compliance_general_audit_plan', 'R'),
(15, 'AM', 'compliance_safety_target_review', 'R'),
(15, 'AM', 'compliance_requirements_evidence', 'R'),
(15, 'AM', 'compliance_calendar', 'R'),
(15, 'AM', 'control_center_settings', 'R'),
(15, 'AM', 'control_center_recent_flights', 'R'),
(15, 'AM', 'drone_atc', 'R'),
(15, 'AM', 'training_courses', 'R'),
(15, 'AM', 'training_calendar', 'R'),
(15, 'AM', 'notifications', 'R'),
(15, 'AM', 'document_repository', 'R'),
(15, 'AM', 'audit_logs', 'R'),
(15, 'AM', 'org_chart', 'R'),
(15, 'AM', 'org_procedures', 'R'),
(15, 'AM', 'org_checklist', 'R'),
(15, 'AM', 'org_assignments', 'R'),
(15, 'AM', 'org_communication', 'R'),
(15, 'AM', 'mission_type', 'R'),
(15, 'AM', 'mission_category', 'R'),
(15, 'AM', 'mission_status', 'R'),
(15, 'AM', 'mission_result', 'R'),
(15, 'AM', 'systems_manage', 'R'),
(15, 'AM', 'systems_map', 'R'),
(15, 'AM', 'systems_maintenance_dashboard', 'R'),
(15, 'AM', 'systems_maintenance_tickets', 'R'),
(15, 'AM', 'team_personnel', 'R'),
(15, 'AM', 'team_client', 'R'),
(15, 'AM', 'settings_security_api_keys', 'R'),
(15, 'AM', 'settings_integrations', 'R'),
-- SM (Safety Manager)
(15, 'SM', 'dashboard_analytics', 'R'),
(15, 'SM', 'dashboard_shi_kpi', 'R'),
(15, 'SM', 'planning_new_evaluation', 'A'),
(15, 'SM', 'planning_evaluation', 'A'),
(15, 'SM', 'planning_dashboard', 'A'),
(15, 'SM', 'planning_mission_templates', 'A'),
(15, 'SM', 'operation_mission_table', 'A'),
(15, 'SM', 'operation_daily_board', 'A'),
(15, 'SM', 'operation_flight_requests', 'A'),
(15, 'SM', 'operation_calendar', 'A'),
(15, 'SM', 'logbook_planned_mission', 'A'),
(15, 'SM', 'logbook_flight', 'A'),
(15, 'SM', 'logbook_battery', 'A'),
(15, 'SM', 'safety_spi_kpi_definitions', 'A'),
(15, 'SM', 'emergency_contact_list', 'A'),
(15, 'SM', 'compliance_general_audit_plan', 'A'),
(15, 'SM', 'compliance_safety_target_review', 'A'),
(15, 'SM', 'compliance_requirements_evidence', 'A'),
(15, 'SM', 'compliance_calendar', 'A'),
(15, 'SM', 'control_center_settings', 'A'),
(15, 'SM', 'control_center_recent_flights', 'A'),
(15, 'SM', 'drone_atc', 'R'),
(15, 'SM', 'training_courses', 'A'),
(15, 'SM', 'training_calendar', 'A'),
(15, 'SM', 'notifications', 'A'),
(15, 'SM', 'document_repository', 'A'),
(15, 'SM', 'audit_logs', 'A'),
(15, 'SM', 'org_chart', 'A'),
(15, 'SM', 'org_procedures', 'A'),
(15, 'SM', 'org_checklist', 'A'),
(15, 'SM', 'org_assignments', 'A'),
(15, 'SM', 'org_communication', 'A'),
(15, 'SM', 'mission_type', 'R'),
(15, 'SM', 'mission_category', 'R'),
(15, 'SM', 'mission_status', 'R'),
(15, 'SM', 'mission_result', 'R'),
(15, 'SM', 'systems_manage', 'R'),
(15, 'SM', 'systems_map', 'R'),
(15, 'SM', 'systems_maintenance_dashboard', 'R'),
(15, 'SM', 'systems_maintenance_tickets', 'R'),
(15, 'SM', 'team_personnel', 'A'),
(15, 'SM', 'team_client', 'A'),
(15, 'SM', 'settings_security_api_keys', 'A'),
(15, 'SM', 'settings_integrations', 'A'),
-- OM (Operations Manager)
(15, 'OM', 'dashboard_analytics', 'R'),
(15, 'OM', 'dashboard_shi_kpi', 'R'),
(15, 'OM', 'planning_new_evaluation', 'A'),
(15, 'OM', 'planning_evaluation', 'A'),
(15, 'OM', 'planning_dashboard', 'A'),
(15, 'OM', 'planning_mission_templates', 'A'),
(15, 'OM', 'operation_mission_table', 'A'),
(15, 'OM', 'operation_daily_board', 'R'),
(15, 'OM', 'operation_flight_requests', 'A'),
(15, 'OM', 'operation_calendar', 'A'),
(15, 'OM', 'logbook_planned_mission', 'A'),
(15, 'OM', 'logbook_flight', 'A'),
(15, 'OM', 'logbook_battery', 'A'),
(15, 'OM', 'emergency_contact_list', 'A'),
(15, 'OM', 'control_center_settings', 'A'),
(15, 'OM', 'control_center_recent_flights', 'A'),
(15, 'OM', 'drone_atc', 'R'),
(15, 'OM', 'notifications', 'A'),
(15, 'OM', 'document_repository', 'A'),
(15, 'OM', 'audit_logs', 'A'),
(15, 'OM', 'org_chart', 'A'),
(15, 'OM', 'org_procedures', 'A'),
(15, 'OM', 'org_checklist', 'A'),
(15, 'OM', 'org_assignments', 'A'),
(15, 'OM', 'org_communication', 'A'),
(15, 'OM', 'mission_type', 'A'),
(15, 'OM', 'mission_category', 'A'),
(15, 'OM', 'mission_status', 'A'),
(15, 'OM', 'mission_result', 'A'),
(15, 'OM', 'systems_manage', 'R'),
(15, 'OM', 'systems_map', 'R'),
(15, 'OM', 'systems_maintenance_dashboard', 'R'),
(15, 'OM', 'systems_maintenance_tickets', 'R'),
(15, 'OM', 'team_personnel', 'R'),
(15, 'OM', 'team_client', 'R'),
(15, 'OM', 'settings_security_api_keys', 'A'),
(15, 'OM', 'settings_integrations', 'A'),
-- MM (Maintenance Manager)
(15, 'MM', 'dashboard_analytics', 'R'),
(15, 'MM', 'dashboard_shi_kpi', 'R'),
(15, 'MM', 'operation_mission_table', 'R'),
(15, 'MM', 'operation_calendar', 'R'),
(15, 'MM', 'logbook_planned_mission', 'R'),
(15, 'MM', 'logbook_flight', 'R'),
(15, 'MM', 'logbook_battery', 'R'),
(15, 'MM', 'drone_atc', 'R'),
(15, 'MM', 'notifications', 'A'),
(15, 'MM', 'document_repository', 'A'),
(15, 'MM', 'audit_logs', 'A'),
(15, 'MM', 'systems_manage', 'A'),
(15, 'MM', 'systems_map', 'A'),
(15, 'MM', 'systems_maintenance_dashboard', 'A'),
(15, 'MM', 'systems_maintenance_tickets', 'A'),
(15, 'MM', 'settings_security_api_keys', 'A'),
(15, 'MM', 'settings_integrations', 'A'),
-- TM (Training Manager)
(15, 'TM', 'dashboard_analytics', 'R'),
(15, 'TM', 'dashboard_shi_kpi', 'R'),
(15, 'TM', 'logbook_planned_mission', 'R'),
(15, 'TM', 'logbook_flight', 'R'),
(15, 'TM', 'logbook_battery', 'R'),
(15, 'TM', 'drone_atc', 'R'),
(15, 'TM', 'training_courses', 'A'),
(15, 'TM', 'training_calendar', 'A'),
(15, 'TM', 'notifications', 'A'),
(15, 'TM', 'document_repository', 'A'),
(15, 'TM', 'audit_logs', 'A'),
(15, 'TM', 'settings_security_api_keys', 'A'),
(15, 'TM', 'settings_integrations', 'A'),
-- CMM (Compliance Manager)
(15, 'CMM', 'dashboard_analytics', 'R'),
(15, 'CMM', 'dashboard_shi_kpi', 'R'),
(15, 'CMM', 'planning_new_evaluation', 'R'),
(15, 'CMM', 'planning_evaluation', 'R'),
(15, 'CMM', 'planning_dashboard', 'R'),
(15, 'CMM', 'planning_mission_templates', 'R'),
(15, 'CMM', 'operation_mission_table', 'R'),
(15, 'CMM', 'operation_calendar', 'R'),
(15, 'CMM', 'logbook_planned_mission', 'R'),
(15, 'CMM', 'logbook_flight', 'R'),
(15, 'CMM', 'logbook_battery', 'R'),
(15, 'CMM', 'compliance_general_audit_plan', 'A'),
(15, 'CMM', 'compliance_safety_target_review', 'A'),
(15, 'CMM', 'compliance_requirements_evidence', 'A'),
(15, 'CMM', 'compliance_calendar', 'A'),
(15, 'CMM', 'drone_atc', 'R'),
(15, 'CMM', 'notifications', 'A'),
(15, 'CMM', 'document_repository', 'A'),
(15, 'CMM', 'audit_logs', 'A'),
(15, 'CMM', 'systems_manage', 'R'),
(15, 'CMM', 'systems_map', 'R'),
(15, 'CMM', 'systems_maintenance_dashboard', 'R'),
(15, 'CMM', 'systems_maintenance_tickets', 'R'),
(15, 'CMM', 'team_personnel', 'R'),
(15, 'CMM', 'team_client', 'R'),
(15, 'CMM', 'settings_security_api_keys', 'A'),
(15, 'CMM', 'settings_integrations', 'A'),
-- DC (Data Coordinator)
(15, 'DC', 'dashboard_analytics', 'R'),
(15, 'DC', 'dashboard_shi_kpi', 'R'),
(15, 'DC', 'operation_mission_table', 'R'),
(15, 'DC', 'logbook_planned_mission', 'R'),
(15, 'DC', 'logbook_flight', 'R'),
(15, 'DC', 'logbook_battery', 'R'),
(15, 'DC', 'drone_atc', 'R'),
(15, 'DC', 'notifications', 'A'),
(15, 'DC', 'document_repository', 'A'),
(15, 'DC', 'audit_logs', 'A'),
(15, 'DC', 'settings_security_api_keys', 'A'),
(15, 'DC', 'settings_integrations', 'A'),
-- VM (Viewer)
(15, 'VM', 'dashboard_analytics', 'R'),
(15, 'VM', 'dashboard_shi_kpi', 'R'),
(15, 'VM', 'logbook_flight', 'R'),
(15, 'VM', 'logbook_battery', 'R'),
(15, 'VM', 'drone_atc', 'R'),
(15, 'VM', 'notifications', 'A'),
(15, 'VM', 'document_repository', 'A'),
(15, 'VM', 'settings_security_api_keys', 'A'),
(15, 'VM', 'settings_integrations', 'A'),
-- PIC (Pilot in Command)
(15, 'PIC', 'dashboard_analytics', 'R'),
(15, 'PIC', 'planning_dashboard', 'A'),
(15, 'PIC', 'planning_mission_templates', 'A'),
(15, 'PIC', 'operation_mission_table', 'A'),
(15, 'PIC', 'operation_daily_board', 'A'),
(15, 'PIC', 'operation_calendar', 'R'),
(15, 'PIC', 'logbook_planned_mission', 'R'),
(15, 'PIC', 'logbook_flight', 'R'),
(15, 'PIC', 'logbook_battery', 'R'),
(15, 'PIC', 'drone_atc', 'R'),
(15, 'PIC', 'notifications', 'A'),
(15, 'PIC', 'systems_maintenance_dashboard', 'R'),
(15, 'PIC', 'systems_maintenance_tickets', 'A'),
(15, 'PIC', 'settings_security_api_keys', 'A'),
(15, 'PIC', 'settings_integrations', 'A')
ON CONFLICT (fk_owner_id, role, feature_key) DO UPDATE SET access = EXCLUDED.access, updated_at = now();
