-- Create categories table
CREATE TABLE IF NOT EXISTS public.categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    image_url TEXT DEFAULT '',
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Categories are publicly readable"
    ON public.categories
    FOR SELECT
    USING (true);

-- Allow anon to insert/update/delete (admin uses anon key)
CREATE POLICY "Categories are editable by anon"
    ON public.categories
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Seed with current categories
INSERT INTO public.categories (name, image_url, display_order) VALUES
    ('Novidades', 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&q=80&w=200', 1),
    ('Rommanel', 'https://rommanel.vtexassets.com/arquivos/Borboleta.png', 2),
    ('Casa', 'https://lilicasa.cdn.magazord.com.br/img/2024/08/produto/5044/centro-de-mesa-decoracao-ceramica-lili-home-decor.jpg?ims=fit-in/630x840/filters:fill(white)', 3),
    ('Presentes', 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&q=80&w=200', 4),
    ('Promo', 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&q=80&w=200', 5),
    ('Brincos', '', 6),
    ('Colares', '', 7),
    ('Pulseiras', '', 8),
    ('Anéis', '', 9),
    ('Conjuntos', '', 10)
ON CONFLICT (name) DO NOTHING;
