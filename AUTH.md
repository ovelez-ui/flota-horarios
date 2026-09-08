# Autenticación y roles

La app exige **iniciar sesión** (Supabase Auth) y tiene dos roles:

| Rol | Acceso |
|---|---|
| **admin** (coordinador/dispatcher) | Todo: Repartidor, Dispatcher (entidades, analítica, cobertura, calendario **editable**, asignación, vacaciones) y Admin. |
| **tienda** | Solo **Repartidor** (consulta por cédula) y **Calendario** (malla del mes, **solo lectura**). |

La restricción se aplica en dos capas: la interfaz oculta lo no permitido, y la
**RLS de Supabase** bloquea las escrituras de quien no es admin (defensa en el servidor).

## Puesta en marcha (una vez, en Supabase)

1. **SQL Editor** → ejecuta [`supabase/auth.sql`](supabase/auth.sql).
   Crea la tabla `profiles` (rol por defecto `tienda`), el disparador que crea el
   perfil al registrarse, la función `is_admin()`, y **cierra el acceso anónimo**
   (a partir de aquí la app pide login).

2. **Auth → Providers → Email**: desactiva **"Confirm email"** para que el ingreso
   por contraseña funcione sin verificación por correo. (Alternativa: al crear cada
   usuario marca **Auto Confirm User**.)

3. **Crea las cuentas** en **Auth → Users → Add user** (correo + contraseña, Auto
   Confirm). Cada cuenta nueva queda como **tienda** automáticamente.

4. **Marca al coordinador como admin** (SQL Editor):
   ```sql
   update public.profiles set role = 'admin' where email = 'ovelez@pasteur.com.co';
   ```

5. Listo: el admin entra y ve todo; las tiendas entran y solo ven Repartidor +
   Calendario (lectura).

## Notas

- El correo `tienda.test@pasteur.com.co` se creó como prueba de este flujo:
  puedes **borrarlo** en Auth → Users.
- Para agregar/quitar admins: `update public.profiles set role='admin'|'tienda' where email='...'`.
- En modo servidor local (sin variables de Supabase) no hay login: acceso
  completo para desarrollo.
