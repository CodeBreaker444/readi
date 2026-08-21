CREATE INDEX IF NOT EXISTS idx_evaluation_action_evaluation
  ON public.evaluation_action (fk_evaluation_id);

CREATE INDEX IF NOT EXISTS idx_evaluation_file_evaluation
  ON public.evaluation_file (fk_evaluation_id);

CREATE INDEX IF NOT EXISTS idx_communication_general_owner_evaluation
  ON public.communication_general (fk_owner_id, fk_evaluation_id);

CREATE INDEX IF NOT EXISTS idx_communication_general_owner_planning
  ON public.communication_general (fk_owner_id, fk_planning_id);

CREATE INDEX IF NOT EXISTS idx_planning_logbook_planning_owner
  ON public.planning_logbook (fk_planning_id, fk_owner_id);
