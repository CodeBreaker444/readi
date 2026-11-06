INSERT INTO public.role_feature_permission (fk_owner_id, role, feature_key, access, updated_at)
SELECT o.owner_id, 'PIC', 'control_center_recent_flights', 'A', now()
FROM public.owner o
ON CONFLICT (fk_owner_id, role, feature_key)
DO UPDATE SET access = 'A', updated_at = now();
