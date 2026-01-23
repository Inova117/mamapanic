# Configuración de Cuenta Coach

## Objetivo
Crear una cuenta de coach que tenga acceso al dashboard de coach y ver las bitácoras de todas las usuarias.

## Pasos para Crear la Cuenta Coach

### Opción 1: Vía App (Recomendado)

1. **Registra la cuenta normalmente en la app**
   - Email: `coach@mamarespira.com` (o el email que prefieras)
   - Password: (elige una contraseña segura)
   - Nombre: "Coach María" (o el nombre que prefieras)

2. **Actualiza el rol en Supabase**
   - Ve a tu proyecto en Supabase
   - Abre el **SQL Editor**
   - Copia y pega el siguiente SQL:
   
   ```sql
   UPDATE profiles
   SET role = 'coach'
   WHERE email = 'coach@mamarespira.com';
   ```
   
   - Haz clic en **Run**

3. **Verifica que funcionó**
   ```sql
   SELECT id, email, name, role
   FROM profiles
   WHERE role = 'coach';
   ```
   
   Deberías ver tu cuenta de coach listada.

### Opción 2: Vía Supabase Dashboard

1. **Crea el usuario en Authentication**
   - Ve a Supabase → Authentication → Users
   - Click "Add User"
   - Email: `coach@mamarespira.com`
   - Password: (auto-generada o personalizada)
   - Confirma el email automáticamente

2. **Actualiza el perfil**
   - Ve a Table Editor → profiles
   - Encuentra el usuario recién creado (por email)
   - Edita el campo `role` a `coach`
   - Guarda

## Navegación Automática al Dashboard

Ya está implementado! Cuando un usuario con `role = 'coach'` inicia sesión, automáticamente será redirigido a `/coach` (el dashboard de coach).

### Cómo Funciona

En tu código de login/signup, usa:

```typescript
import { navigateToHome } from '@/services/navigation';
import { useRouter } from 'expo-router';

// En tu función de login/signup:
const handleLogin = async () => {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (!error) {
    // Automáticamente navega al dashboard correcto
    await navigateToHome(router);
  }
};
```

### Rutas

- **Coach**: `/coach` → Dashboard de coach
- **Usuario normal**: `/(tabs)` → App principal
- **Usuario premium**: `/(tabs)` → App principal (con features premium)

## Ejemplo de AuthContext Actualizado

```typescript
import { navigateToHome } from '@/services/navigation';

const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) throw error;
  
  // Auto-navega basado en rol
  if (router) {
    await navigateToHome(router);
  }
  
  return data;
};
```

## Permisos del Coach

Con el rol `coach`, el usuario puede:

✅ **Ver bitácoras de todas las usuarias**
```typescript
// Esto funciona automáticamente gracias a RLS
const { data } = await supabase
  .from('bitacoras')
  .select('*, profiles(name, email)')
  .order('created_at', { ascending: false });
```

✅ **Ver mensajes directos de todas las usuarias**
✅ **Acceder al dashboard de coach**
✅ **Ver estadísticas y reportes**

## Verificación

Para verificar que todo funciona:

1. **Inicia sesión como coach**
2. Deberías ser redirigido automáticamente a `/coach`
3. En ese dashboard deberías poder ver:
   - Lista de todas las usuarias
   - Sus bitácoras
   - Mensajes directos
   - Estadísticas

## Múltiples Coaches (Futuro)

Si necesitas más de un coach en el futuro:

```sql
-- Actualiza cualquier usuario a coach
UPDATE profiles
SET role = 'coach'
WHERE email IN ('coach1@ejemplo.com', 'coach2@ejemplo.com');
```

Todos los coaches tendrán los mismos permisos y acceso al dashboard.

## Troubleshooting

### El coach no ve todas las bitácoras
- Verifica que el rol sea exactamente `'coach'` (minúsculas)
- Verifica que las RLS policies estén activas (ya lo están en el schema)

### No se redirige al dashboard
- Verifica que el archivo `app/coach/index.tsx` exista
- Verifica que estés usando `navigateToHome()` después del login

### El perfil no se actualiza
- Asegúrate de que el trigger `on_auth_user_created` esté activo
- Verifica que exista el registro en la tabla `profiles`

## Resumen

1. ✅ Registra la cuenta normalmente
2. ✅ Ejecuta el SQL para cambiar `role = 'coach'`
3. ✅ Usa `navigateToHome()` en tu AuthContext
4. ✅ El coach será redirigido automáticamente a `/coach`

¡Listo! 🎉
