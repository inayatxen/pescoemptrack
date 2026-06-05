CREATE TABLE location_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  speed double precision,
  accuracy double precision,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX location_history_user_recorded ON location_history (user_id, recorded_at DESC);

ALTER TABLE location_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_history" ON location_history FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR shares_group_with(auth.uid(), user_id));

CREATE POLICY "insert_own_history" ON location_history FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_history" ON location_history FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own_history" ON location_history FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
