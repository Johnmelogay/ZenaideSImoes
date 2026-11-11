begin;

alter table public.products add column if not exists size_label text;
alter table public.products add column if not exists studio_image_url text;
alter table public.products add column if not exists studio_image_source text;
alter table public.store_settings add column if not exists product_checkout_enabled boolean not null default false;

alter table public.orders add column if not exists checkout_source text;
alter table public.orders add column if not exists checkout_expires_at timestamptz;
alter table public.orders add column if not exists checkout_product_id bigint;
alter table public.orders add column if not exists checkout_quantity integer;
alter table public.orders add column if not exists checkout_link_started_at timestamptz;
alter table public.orders add column if not exists stock_needs_review boolean not null default false;

alter table public.orders enable row level security;
create policy "Keep product link orders private"
    on public.orders as restrictive for all to anon
    using (checkout_source is distinct from 'product_link')
    with check (checkout_source is distinct from 'product_link');

create index orders_product_link_holds on public.orders (checkout_product_id, checkout_expires_at)
    where checkout_source = 'product_link' and payment_status = 'pending';

create function public.reserve_product_checkout(
    p_order_id uuid, p_product_id bigint, p_quantity integer, p_name text, p_phone text
)
returns table (id uuid, items jsonb, total_amount numeric, payment_link text, checkout_expires_at timestamptz)
language plpgsql
set search_path = public
as $$
declare
    product public.products%rowtype;
    existing public.orders%rowtype;
    held bigint;
    amount numeric;
    order_items jsonb;
begin
    if p_quantity is null or p_quantity not between 1 and 20
        or p_name is null or length(trim(p_name)) not between 2 and 100
        or p_phone is null or p_phone !~ '^[0-9]{10,11}$' then
        raise exception 'Confira o nome, o WhatsApp com DDD e a quantidade.';
    end if;

    select p.* into product from public.products p where p.id = p_product_id for update;
    select o.* into existing from public.orders o where o.id = p_order_id;

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

    if product.id is null or product.is_visible is distinct from true or coalesce(product.price, 0) < 1 then
        raise exception 'Peça indisponível para compra online.';
    end if;
    if concat_ws(' ', product.category, product.name) ~* '\m(an[eé]is|anel|alian[çc]as?)\M'
        and nullif(trim(product.size_label), '') is null then
        raise exception 'Confirme o tamanho com a Zenaide pelo WhatsApp.';
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
        'qty', p_quantity, 'size_label', product.size_label, 'image_url', product.image_url
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

revoke execute on function public.reserve_product_checkout(uuid, bigint, integer, text, text) from public, anon, authenticated;
grant execute on function public.reserve_product_checkout(uuid, bigint, integer, text, text) to service_role;

create function public.record_verified_payment(p_order_id uuid, p_transaction text, p_amount_cents bigint)
returns text
language plpgsql
set search_path = public
as $$
declare
    target public.orders%rowtype;
    line record;
    needs_review boolean := false;
begin
    select o.* into target from public.orders o where o.id = p_order_id for update;
    if not found then return 'missing'; end if;
    if target.total_amount is null or round(target.total_amount * 100) <> p_amount_cents then
        return 'amount_mismatch';
    end if;
    if target.payment_status = 'paid' then
        if target.payment_id = p_transaction then return 'already_paid'; end if;
        return 'different_transaction';
    end if;

    for line in
        select (item->>'id')::bigint as product_id,
            sum(case when item->>'qty' ~ '^[1-9][0-9]{0,2}$' then (item->>'qty')::integer else 1 end)::integer as quantity
        from jsonb_array_elements(coalesce(target.items, '[]'::jsonb)) item
        where item->>'id' ~ '^[0-9]{1,15}$'
        group by 1
        order by 1
    loop
        update public.products p set stock_quantity = p.stock_quantity - line.quantity
        where p.id = line.product_id and p.stock_quantity >= line.quantity;
        if not found then needs_review := true; end if;
    end loop;

    update public.orders o set payment_status = 'paid', payment_id = p_transaction,
        status = case when o.status in ('shipped', 'delivered', 'processing') then o.status else 'paid' end,
        stock_needs_review = needs_review
    where o.id = p_order_id;
    return case when needs_review then 'paid_stock_review' else 'paid' end;
end;
$$;

revoke execute on function public.record_verified_payment(uuid, text, bigint) from public, anon, authenticated;
grant execute on function public.record_verified_payment(uuid, text, bigint) to service_role;

commit;
