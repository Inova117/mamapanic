# Backend setup — Mamá Respira (proyecto Supabase nuevo)

Sigue estos pasos para levantar el backend desde cero, de forma segura.

## 1. Crear el proyecto Supabase
- [supabase.com](https://supabase.com) → **New project**.
- Región: la más cercana a México (ej. `East US` o `South America`).
- Guarda en lugar seguro: **Project URL**, **anon public key**, **service_role key**.

## 2. Crear el esquema (un solo archivo)
- Dashboard → **SQL Editor** → **New query**.
- Pega y ejecuta el contenido de [`supabase/schema_complete.sql`](supabase/schema_complete.sql).
- Crea todo: tablas, RLS endurecido, triggers, **buckets de storage**, funciones de rate-limit/audit, y el seed. Es idempotente.

## 3. Verificar
- **Table editor**: deben existir `profiles, validation_cards, checkins, chat_messages, direct_messages, bitacoras, rate_limits, audit_logs` (todas con candado RLS).
- **Storage**: deben existir los buckets `avatars` (público) y `message-attachments` (privado).
- `validation_cards` debe tener 15 filas.

## 4. Auth
- **Authentication → Providers → Email**: habilitado (Confirm email según prefieras; si lo activas, las usuarias deben confirmar correo).
- **Authentication → URL Configuration**:
  - **Site URL**: `https://entresuenosec.netlify.app`
  - **Redirect URLs**: agrega **ambas**:
    - `https://entresuenosec.netlify.app/auth/reset-password` (web)
    - `entresuenos://auth/reset-password` (deep link nativo del APK)

## 5. Crear la coach
1. Regístrate en la app con el correo de la coach (como usuaria normal).
2. SQL Editor:
   ```sql
   UPDATE profiles SET role = 'coach' WHERE email = 'maricruzleons09@gmail.com';
   ```
   (Se hace por SQL a propósito: la RLS impide que una usuaria se auto-promueva.)

## 6. Variables de entorno del frontend (`frontend/.env`)
- `EXPO_PUBLIC_SUPABASE_URL` = Project URL del paso 1
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` = anon key del paso 1
- **Quita `SUPABASE_SERVICE_ROLE_KEY` de `frontend/.env`.** Esa llave NO debe vivir junto al código del cliente. Guárdala aparte (la usaremos como secreto en la Edge Function de la Fase 6).
- `EXPO_PUBLIC_SENTRY_*`: déjalas; con los cambios nuevos Sentry no envía nada en desarrollo y ya no graba video ni PII.

## 7. Groq (Fase 0.3)
- [console.groq.com](https://console.groq.com) → **API Keys** → crea una key nueva (revoca la vieja).
- Pon un **spending limit**/alertas en Settings.
- `EXPO_PUBLIC_GROQ_API_KEY` = la nueva (temporal, hasta la Edge Function de la Fase 6).

## 8. Probar
- `cd frontend && yarn start` (o `npx expo start`).
- Crea una usuaria, haz un check-in, una bitácora, y chatea con la Abuela Sabia.
- Inicia sesión con la coach y verifica que ve las bitácoras/mensajes.

---

## 9. Edge Function de Groq (saca la key del cliente) — Fase 6

El cliente ya **no** usa `EXPO_PUBLIC_GROQ_API_KEY`; llama a una Edge Function que guarda la key como secreto del servidor. Para activarla:

1. Instala la CLI de Supabase si no la tienes: `npm i -g supabase` (o `brew install supabase/tap/supabase`).
2. Enlaza el proyecto (una vez): `supabase link --project-ref nenmhcfbzysotgagamjb`
3. Pon la key de Groq como secreto:
   ```bash
   supabase secrets set GROQ_API_KEY=gsk_tu_key_nueva
   ```
4. Despliega la función:
   ```bash
   supabase functions deploy groq-proxy
   ```
5. Prueba el chat con la "Abuela Sabia" en la app. (Mientras no despliegues, la IA responde con un mensaje de respaldo, no se rompe.)
6. Cuando funcione, **borra `EXPO_PUBLIC_GROQ_API_KEY` de `frontend/.env`** (ya no se usa).

> El código de la función está en `supabase/functions/groq-proxy/index.ts`. Requiere JWT de usuaria y aplica rate-limit (30 llamadas / 10 min por usuaria).

---

Cuando termines, **pásame la `EXPO_PUBLIC_SUPABASE_URL` y la `ANON_KEY`** (no la service_role, no la de Groq) para ayudarte a verificar la app contra el backend nuevo y seguir con las fases 3–7.
