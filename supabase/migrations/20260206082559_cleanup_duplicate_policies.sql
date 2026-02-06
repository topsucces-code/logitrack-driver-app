-- Remove duplicate SELECT policy on logitrack_incident_types
-- (two identical policies: "incident_types_select_all" and "read_incident_types")
DROP POLICY IF EXISTS "read_incident_types" ON logitrack_incident_types;
