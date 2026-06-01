-- for tool lookups by owner
CREATE INDEX IF NOT EXISTS idx_tool_owner_active ON tool (fk_owner_id, tool_active);

-- for component lookups by tool
CREATE INDEX IF NOT EXISTS idx_tool_component_tool ON tool_component (fk_tool_id, component_active);
