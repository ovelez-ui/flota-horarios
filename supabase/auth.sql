-- Autenticación y roles para Flota Horarios (Supabase).
-- Ejecutar en el SQL Editor DESPUÉS de schema.sql.
-- Cierra el acceso anónimo: a partir de aquí la app exige iniciar sesión.

-- 1. Perfiles con rol (admin | tienda). Rol por defecto: tienda (menor privilegio).
create table if not exists public.profiles (
  id    uuid primary key references auth.users(id) on delete cascade,
  email text,
  role  text not null default 'tienda' check (role in ('admin', 'tienda'))
);

alter table public.profiles enable row level security;
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = auth.uid());

-- 2. ¿El usuario actual es admin? (security definer: lee profiles saltando RLS)
create or replace function public.is_admin() returns boolean
  language sql security definer stable set search_path = public as $$
    select exists (
      select 1 from public.profiles where id = auth.uid() and role = 'admin'
    );
$$;

-- 3. Crear el perfil automáticamente al registrarse un usuario (rol tienda).
create or replace function public.handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'tienda')
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4. RLS de datos: lectura para autenticados; escritura solo para admins.
do $$
declare t text;
begin
  foreach t in array array['zones', 'points_of_sale', 'drivers', 'shifts'] loop
    execute format('drop policy if exists "anon_all_%1$s" on public.%1$s;', t);
    execute format('drop policy if exists "read_%1$s" on public.%1$s;', t);
    execute format('drop policy if exists "write_%1$s" on public.%1$s;', t);
    execute format(
      'create policy "read_%1$s" on public.%1$s for select to authenticated using (true);', t);
    execute format(
      'create policy "write_%1$s" on public.%1$s for all to authenticated using (public.is_admin()) with check (public.is_admin());', t);
  end loop;
end $$;

-- 5. Marca al coordinador como admin (ajusta el correo).
--    (El resto de cuentas quedan como 'tienda' automáticamente.)
-- update public.profiles set role = 'admin' where email = 'ovelez@pasteur.com.co';
