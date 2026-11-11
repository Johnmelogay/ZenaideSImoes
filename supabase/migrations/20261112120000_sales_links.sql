begin;

alter table public.products add column if not exists available_sizes text[] not null default '{}';

alter table public.orders add column if not exists delivery_method text;
alter table public.orders add column if not exists delivery_fee numeric(10,2) not null default 0;
alter table public.orders add column if not exists customer_email text;
alter table public.orders add column if not exists sales_link_token text;

alter table public.store_settings add column if not exists delivery_options jsonb not null default '[]'::jsonb;

create table if not exists public.sales_links (
    id uuid primary key default gen_random_uuid(),
    token text not null unique default encode(gen_random_bytes(9), 'hex'),
    product_id bigint references public.products(id) on delete set null,
    title text not null,
    description text,
    price numeric(10,2) not null check (price >= 0),
    image_url text,
    sizes text[] not null default '{}',
    stock integer,
    status text not null default 'active' check (status in ('active', 'sold', 'archived')),
    delivery_options jsonb not null default '[]'::jsonb,
    order_id uuid references public.orders(id) on delete set null,
    expires_at timestamptz,
    created_at timestamptz not null default now()
);

create index if not exists sales_links_status_idx on public.sales_links (status, created_at desc);
create index if not exists orders_sales_link_token_idx on public.orders ( sales_link_token);

alter table public.sales_links enable row level security;
drop policy if exists "Public can read sales links" on public.sales_links;
create policy "Public can read sales links" on public.sales_links for select to anon, authenticated using (true);
drop policy if exists "Admins manage sales links" on public.sales_links;
create policy "Admins manage sales links" on public.sales_links for all to authenticated using (true) with check (true);

create or replace function public.reserve_sales_link_checkout(
    p_token text, p_order_id uuid, p_name text, p_phone text, p_email text,
    p_quantity integer, p_size text, p_delivery_method text, p_delivery_fee numeric, p_address jsonb
) returns table (id uuid, total_amount numeric, payment_link text, checkout_expires_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare
    link public.sales_links%rowtype;
    existing public.orders%rowtype;
    product public.products%rowtype;
    amount numeric;
    order_items jsonb;
begin
    if p_quantity is null or p_quantity < 1 or p_quantity > 20 then
        raise exception 'Escolha uma quantidade entre 1 e 20.';
    end if;
    if p_name is null or length(trim(p_name)) not between 2 and 100 then
        raise exception 'Informe o nome de quem vai receber.';
    end if;
    if p_phone is null or p_phone !~ '^[0-9]{10,11}$' then
        raise exception 'Informe o WhatsApp com DDD.';
    end if;
    if nullif(trim(p_email), '') is not null and p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
        raise exception 'Confira o e-mail informado.';
    end if;

    select * into link from public.sales_links where token = p_token for update;
    if not found or link.status <> 'active' or (link.expires_at is not null and link.expires_at <= now()) then
        raise exception 'Este link de compra não está mais disponível.' using errcode = 'P0002';
    end if;

    select o.* into existing from public.orders o where o.id = p_order_id;
    if found then
        if existing.sales_link_token is distinct from p_token or existing.payment_status <> 'pending'
            or existing.checkout_expires_at <= now() + interval '1 minute' then
            raise exception 'Este link venceu. Tente novamente.' using errcode = 'P0002';
        end if;
        return query select existing.id, existing.total_amount, existing.payment_link, existing.checkout_expires_at;
        return;
    end if;

    if link.stock is not null and link.stock < p_quantity then
        raise exception 'A quantidade escolhida não está mais disponível.';
    end if;
    if link.product_id is not null then
        select p.* into product from public.products p where p.id = link.product_id;
        if found and (product.is_visible is not true or coalesce(product.stock_quantity, 0) < p_quantity) then
            raise exception 'Esta peça acabou de ser vendida. Fale com a Zenaide pelo WhatsApp.';
        end if;
    end if;

    amount := round(link.price, 2) * p_quantity + greatest(coalesce(p_delivery_fee, 0), 0);
    order_items := jsonb_build_array(jsonb_build_object(
        'id', link.product_id, 'name', link.title, 'sku', null,
        'price', round(link.price, 2), 'qty', p_quantity,
        'size_label', nullif(trim(p_size), ''), 'image_url', link.image_url, 'sales_link', true
    ));

    return query insert into public.orders as o (
        id, customer_name, customer_phone, customer_email, items, total_amount, status, payment_status,
        checkout_source, checkout_product_id, checkout_quantity, checkout_expires_at,
        delivery_method, delivery_fee, address_data, sales_link_token
    ) values (
        p_order_id, trim(p_name), p_phone, nullif(trim(p_email), ''), order_items, amount, 'pending', 'pending',
        'sales_link', link.product_id, p_quantity, now() + interval '30 minutes',
        nullif(trim(p_delivery_method), ''), greatest(coalesce(p_delivery_fee, 0), 0),
        coalesce(p_address, '{}'::jsonb), p_token
    ) returning o.id, o.total_amount, o.payment_link, o.checkout_expires_at;

    update public.sales_links as s set order_id = p_order_id where s.id = link.id;
end;
$$;

revoke all on function public.reserve_sales_link_checkout(text, uuid, text, text, text, integer, text, text, numeric, jsonb) from public, anon, authenticated;
grant execute on function public.reserve_sales_link_checkout(text, uuid, text, text, text, integer, text, text, numeric, jsonb) to service_role;

create or replace function public.get_sales_link_order(p_token text)
returns jsonb language sql security definer set search_path = public as $$
    select jsonb_build_object(
        'id', o.id, 'status', o.status, 'payment_status', o.payment_status,
        'total_amount', o.total_amount, 'delivery_fee', o.delivery_fee,
        'delivery_method', o.delivery_method, 'address', o.address_data,
        'items', o.items, 'tracking_code', o.tracking_code,
        'payment_link', case when o.payment_status = 'paid' then null else o.payment_link end,
        'created_at', o.created_at, 'checkout_expires_at', o.checkout_expires_at,
        'customer_name', split_part(o.customer_name, ' ', 1)
    )
    from public.orders o
    where o.sales_link_token = p_token
    order by o.created_at desc
    limit 1;
$$;

revoke all on function public.get_sales_link_order(text) from public;
grant execute on function public.get_sales_link_order(text) to anon, authenticated;

drop function if exists public.reserve_product_checkout(uuid, bigint, integer, text, text);

create or replace function public.reserve_product_checkout(
    p_order_id uuid, p_product_id bigint, p_quantity integer, p_name text, p_phone text, p_size text default null
) returns table (id uuid, items jsonb, total_amount numeric, payment_link text, checkout_expires_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare
    product public.products%rowtype;
    existing public.orders%rowtype;
    held bigint;
    amount numeric;
    order_items jsonb;
    chosen_size text;
begin
    if p_quantity is null or p_quantity not between 1 and 20
        or p_name is null or length(trim(p_name)) not between 2 and 100
        or p_phone is null or p_phone !~ '^[0-9]{10,11}$' then
        raise exception 'Confira o nome, o WhatsApp com DDD e a quantidade.';
    end if;

    select p.* into product from public.products p where p.id = p_product_id for update;
    select o.* into existing from public.orders o where o.id = p_order_id;

    if product.id is null or product.is_visible is distinct from true or coalesce(product.price, 0) < 1 then
        raise exception 'Peça indisponível para compra online.';
    end if;

    chosen_size := nullif(trim(p_size), '');
    if concat_ws(' ', product.category, product.name) ~* '\m(an[eé]is|anel|alian[çc]as?)\M' then
        if chosen_size is null then
            raise exception 'Escolha o tamanho do anel.';
        end if;
        if coalesce(array_length(product.available_sizes, 1), 0) > 0
            and not (chosen_size = any(product.available_sizes)) then
            raise exception 'Este tamanho não está disponível.';
        end if;
    end if;

    if found then
        if existing.checkout_source is distinct from 'product_link'
            or existing.checkout_product_id is distinct from p_product_id
            or existing.checkout_quantity is distinct from p_quantity
            or existing.customer_phone is distinct from p_phone
            or existing.customer_name is distinct from trim(p_name)
            or existing.payment_status is distinct from 'pending'
            or existing.checkout_expires_at <= now() + interval '1 minute' then
            raise exception 'Este link venceu. Tente novamente.' using errcode = 'P0002';
        end if;
        return query select existing.id, existing.items, existing.total_amount, existing.payment_link, existing.checkout_expires_at;
        return;
    end if;

    select coalesce(sum(o.checkout_quantity), 0) into held
    from public.orders o
    where o.checkout_source = 'product_link' and o.checkout_product_id = p_product_id
        and o.payment_status = 'pending' and o.checkout_expires_at > now() - interval '5 minutes';

    if coalesce(product.stock_quantity, 0) - held < p_quantity then
        raise exception 'A quantidade escolhida está indisponível no momento. Fale com a Zenaide pelo WhatsApp.';
    end if;

    amount := round(product.price, 2) * p_quantity;
    order_items := jsonb_build_array(jsonb_build_object(
        'id', product.id, 'name', product.name, 'sku', product.sku, 'price', round(product.price, 2),
        'qty', p_quantity, 'size_label', chosen_size, 'image_url', product.image_url
    ));
    return query insert into public.orders as o (
        id, customer_name, customer_phone, items, total_amount, status, payment_status,
        checkout_source, checkout_product_id, checkout_quantity, checkout_expires_at
    ) values (
        p_order_id, trim(p_name), p_phone, order_items, amount, 'pending', 'pending',
        'product_link', p_product_id, p_quantity, now() + interval '15 minutes'
    ) returning o.id, o.items, o.total_amount, o.payment_link, o.checkout_expires_at;
end;
$$;

revoke execute on function public.reserve_product_checkout(uuid, bigint, integer, text, text, text) from public, anon, authenticated;
grant execute on function public.reserve_product_checkout(uuid, bigint, integer, text, text, text) to service_role;

commit;
