-- Drop all recursive policies and replace with direct expressions

-- group_members: the old policy called is_group_member() which queries group_members → infinite recursion
DROP POLICY IF EXISTS "gm_select_same_group" ON public.group_members;

-- A user can see group_members rows if:
-- 1. The row is for themselves, OR
-- 2. They are the admin of that group, OR  
-- 3. They are also a member of the same group (self-join, no function call)
CREATE POLICY "gm_select_same_group" ON public.group_members FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = group_id AND g.admin_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.group_members me
      WHERE me.group_id = group_members.group_id AND me.user_id = auth.uid()
    )
  );

-- groups: keep is_group_member for groups table (only queries group_members + groups, no recursion there)
-- but also ensure the simpler direct check works
DROP POLICY IF EXISTS "groups_select_member_or_admin" ON public.groups;
CREATE POLICY "groups_select_member_or_admin" ON public.groups FOR SELECT TO authenticated
  USING (
    admin_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = groups.id AND gm.user_id = auth.uid()
    )
  );

-- profiles: shares_group_with calls group_members which has RLS → chain failure
-- Replace with a direct expression
DROP POLICY IF EXISTS "profiles_select_self_or_shared" ON public.profiles;
CREATE POLICY "profiles_select_self_or_shared" ON public.profiles FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.group_members gm1
      JOIN public.group_members gm2 ON gm1.group_id = gm2.group_id
      WHERE gm1.user_id = auth.uid() AND gm2.user_id = profiles.id
    )
    OR EXISTS (
      SELECT 1 FROM public.groups g
      JOIN public.group_members gm ON gm.group_id = g.id
      WHERE (g.admin_id = auth.uid() AND gm.user_id = profiles.id)
         OR (g.admin_id = profiles.id AND gm.user_id = auth.uid())
    )
  );

-- locations: same issue with shares_group_with
DROP POLICY IF EXISTS "locations_select_shared_group" ON public.locations;
CREATE POLICY "locations_select_shared_group" ON public.locations FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.group_members gm1
      JOIN public.group_members gm2 ON gm1.group_id = gm2.group_id
      WHERE gm1.user_id = auth.uid() AND gm2.user_id = locations.user_id
    )
    OR EXISTS (
      SELECT 1 FROM public.groups g
      JOIN public.group_members gm ON gm.group_id = g.id
      WHERE (g.admin_id = auth.uid() AND gm.user_id = locations.user_id)
         OR (g.admin_id = locations.user_id AND gm.user_id = auth.uid())
    )
  );

-- location_history: same
DROP POLICY IF EXISTS "select_own_history" ON public.location_history;
CREATE POLICY "select_own_history" ON public.location_history FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.group_members gm1
      JOIN public.group_members gm2 ON gm1.group_id = gm2.group_id
      WHERE gm1.user_id = auth.uid() AND gm2.user_id = location_history.user_id
    )
    OR EXISTS (
      SELECT 1 FROM public.groups g
      JOIN public.group_members gm ON gm.group_id = g.id
      WHERE (g.admin_id = auth.uid() AND gm.user_id = location_history.user_id)
         OR (g.admin_id = location_history.user_id AND gm.user_id = auth.uid())
    )
  );
