-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 1. Admin Access (Authenticated)
DROP POLICY IF EXISTS "Enable all for authenticated users" ON orders;
CREATE POLICY "Enable all for authenticated users" ON orders
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- 2. Customer Access (Anonymous) - INSERT only
DROP POLICY IF EXISTS "Enable insert for anon" ON orders;
CREATE POLICY "Enable insert for anon" ON orders
FOR INSERT TO anon
WITH CHECK (true); -- FIXED: Removed USING(true) which is invalid for INSERT

-- 3. Customer Access (Anonymous) - SELECT (for Success page)
DROP POLICY IF EXISTS "Enable select for anon" ON orders;
CREATE POLICY "Enable select for anon" ON orders
FOR SELECT TO anon
USING (true);

-- 4. InfinitePay Webhook (Service Role) - Bypasses RLS automatically.
