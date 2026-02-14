-- Create orders table
create table if not exists orders (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  customer_name text not null,
  customer_phone text not null,
  address_data jsonb,
  items jsonb,
  total_amount numeric,
  payment_link text,
  payment_status text default 'pending', -- pending, paid
  infinite_metadata jsonb -- store nsu, slug, etc.
);

-- Enable RLS
alter table orders enable row level security;

-- Policy: Allow anyone to create orders (since we don't force login for checkout)
create policy "Anyone can create orders"
on orders for insert
with check (true);

-- Policy: Allow users to read their own orders (if we had auth, but for now public for the session)
-- Ideally we return the created order and use it immediately.
create policy "Public read for demo"
on orders for select
using (true);
