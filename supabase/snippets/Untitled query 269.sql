UPDATE role_feature_permission  -- check the actual table name in your schema
SET access = 'A'
WHERE role = 'PIC' AND feature_key = 'logbook_planned_mission' ;
