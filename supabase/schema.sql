-- Esquema de la plataforma Flota Horarios para Supabase (Postgres).
-- Ejecuta esto en el SQL Editor del proyecto Supabase.

create table if not exists public.zones (
  id    text primary key,
  code  text,
  name  text not null,
  city  text,
  color text
);

create table if not exists public.points_of_sale (
  id          text primary key,
  name        text not null,
  zone_id     text references public.zones(id) on delete restrict,
  address     text,
  min_drivers int not null default 1
);

create table if not exists public.drivers (
  id           text primary key,               -- cédula
  name         text not null,
  base_pos_id  text references public.points_of_sale(id) on delete restrict,
  zone_id      text references public.zones(id) on delete restrict,
  status       text not null default 'ACTIVE',
  monthly_cap  int  not null default 192,
  phone        text
);

create table if not exists public.shifts (
  id         text primary key,                 -- "<driverId>-<date>"
  driver_id  text not null references public.drivers(id) on delete cascade,
  date       date not null,
  weekday    text,
  code       text not null,
  start_h    real,
  end_h      real,
  hours      real not null default 0,
  kind       text,
  pos_id     text,
  zone_id    text,
  unique (driver_id, date)
);

create index if not exists idx_shifts_driver on public.shifts(driver_id);
create index if not exists idx_shifts_date   on public.shifts(date);
create index if not exists idx_shifts_zone   on public.shifts(zone_id);

-- RLS. Inicialmente abierto al rol anónimo para poder VALIDAR rápido.
-- ⚠️ Antes de un despliegue amplio, cambia a políticas `to authenticated`
--    y activa Supabase Auth (ver PAGES.md).
alter table public.zones          enable row level security;
alter table public.points_of_sale enable row level security;
alter table public.drivers        enable row level security;
alter table public.shifts         enable row level security;

do $$
declare t text;
begin
  foreach t in array array['zones','points_of_sale','drivers','shifts'] loop
    execute format('drop policy if exists "anon_all_%1$s" on public.%1$s;', t);
    execute format(
      'create policy "anon_all_%1$s" on public.%1$s for all to anon using (true) with check (true);', t);
  end loop;
end $$;
