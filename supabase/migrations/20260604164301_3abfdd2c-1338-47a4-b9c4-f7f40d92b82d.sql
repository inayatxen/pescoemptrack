
-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- groups
CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  admin_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.groups TO authenticated;
GRANT ALL ON public.groups TO service_role;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- group_members
CREATE TABLE public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_members TO authenticated;
GRANT ALL ON public.group_members TO service_role;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- locations (latest location per user, upsert)
CREATE TABLE public.locations (
  user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  speed DOUBLE PRECISION,
  accuracy DOUBLE PRECISION,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.locations TO authenticated;
GRANT ALL ON public.locations TO service_role;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- Helper: is the current user a member of a group?
CREATE OR REPLACE FUNCTION public.is_group_member(_group_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members WHERE group_id = _group_id AND user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.groups WHERE id = _group_id AND admin_id = _user_id
  );
$$;

-- Helper: do two users share any group?
CREATE OR REPLACE FUNCTION public.shares_group_with(_a UUID, _b UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members gm1
    JOIN public.group_members gm2 ON gm1.group_id = gm2.group_id
    WHERE gm1.user_id = _a AND gm2.user_id = _b
  ) OR EXISTS (
    SELECT 1 FROM public.groups g
    JOIN public.group_members gm ON gm.group_id = g.id
    WHERE (g.admin_id = _a AND gm.user_id = _b) OR (g.admin_id = _b AND gm.user_id = _a)
  );
$$;

-- profiles policies
CREATE POLICY "profiles_select_self_or_shared" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.shares_group_with(auth.uid(), id));
CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- groups policies
CREATE POLICY "groups_select_member_or_admin" ON public.groups FOR SELECT TO authenticated
  USING (admin_id = auth.uid() OR public.is_group_member(id, auth.uid()));
-- allow looking up a group by invite code (to join). Limited fields exposed via app.
CREATE POLICY "groups_select_by_invite" ON public.groups FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "groups_insert_admin" ON public.groups FOR INSERT TO authenticated
  WITH CHECK (admin_id = auth.uid());
CREATE POLICY "groups_update_admin" ON public.groups FOR UPDATE TO authenticated
  USING (admin_id = auth.uid());
CREATE POLICY "groups_delete_admin" ON public.groups FOR DELETE TO authenticated
  USING (admin_id = auth.uid());

-- group_members policies
CREATE POLICY "gm_select_same_group" ON public.group_members FOR SELECT TO authenticated
  USING (public.is_group_member(group_id, auth.uid()));
CREATE POLICY "gm_insert_self" ON public.group_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "gm_delete_self_or_admin" ON public.group_members FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.admin_id = auth.uid())
  );

-- locations policies
CREATE POLICY "locations_select_shared_group" ON public.locations FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.shares_group_with(auth.uid(), user_id));
CREATE POLICY "locations_upsert_self_ins" ON public.locations FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "locations_upsert_self_upd" ON public.locations FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "locations_delete_self" ON public.locations FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1), 'User')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Realtime for locations
ALTER PUBLICATION supabase_realtime ADD TABLE public.locations;
ALTER TABLE public.locations REPLICA IDENTITY FULL;
