# Resumen de Correcciones: Flujo de Bitácoras

## 🔴 Problemas Identificados

### 1. **Incompatibilidad de estructura de datos**
- **Problema**: El código frontend transformaba objetos anidados (`nap_1`, `nap_2`, `nap_3`) a columnas planas en la DB, pero la pantalla del coach intentaba leer los datos como objetos anidados.
- **Ubicación**: 
  - `frontend/services/api.ts:234-257` (transformación)
  - `frontend/app/(tabs)/coach-bitacoras.tsx:200-205` (lectura incorrecta)

### 2. **Campo `night_wakings` no se guardaba**
- **Problema**: La columna `night_wakings` (JSONB) existe en la DB pero no se incluía en el payload del INSERT.
- **Ubicación**: `frontend/services/api.ts:259-269`

### 3. **Tipos TypeScript desactualizados**
- **Problema**: La interfaz `DailyBitacora` solo tenía las propiedades anidadas, no las columnas planas que realmente existen en la DB.
- **Ubicación**: `frontend/types/index.ts:80-120`

## ✅ Soluciones Aplicadas

### 1. **Actualización de `createBitacora`** ✓
**Archivo**: `frontend/services/api.ts`

Agregado el campo `night_wakings` al payload:
```typescript
// Keep night_wakings as JSONB array
if (bitacoraData.night_wakings) {
  dbPayload.night_wakings = bitacoraData.night_wakings;
}
```

### 2. **Corrección de `CoachBitacorasScreen`** ✓
**Archivo**: `frontend/app/(tabs)/coach-bitacoras.tsx`

Cambiado de objetos anidados a columnas planas:
```typescript
// ANTES (incorrecto):
{selected.nap_1?.duration_minutes && row('Siesta 1', `${selected.nap_1.duration_minutes} min`)}

// DESPUÉS (correcto):
{selected.nap_1_duration_minutes && row('Siesta 1', `${selected.nap_1_duration_minutes} min`)}
```

### 3. **Actualización de tipos TypeScript** ✓
**Archivo**: `frontend/types/index.ts`

Agregadas las columnas planas al tipo `DailyBitacora`:
```typescript
// Siestas (columnas planas - como están en la DB)
nap_1_laid_down?: string;
nap_1_fell_asleep?: string;
nap_1_how_fell_asleep?: string;
nap_1_woke_up?: string;
nap_1_duration_minutes?: number;
// ... (nap_2 y nap_3 similar)
```

## 📋 Verificación Necesaria

### Pasos para verificar que todo funciona:

1. **Verificar migraciones en Supabase**
   ```bash
   # Ejecutar en Supabase SQL Editor:
   cat supabase/verify_schema.sql
   ```
   
   Esto verificará:
   - ✓ Tabla `bitacoras` existe
   - ✓ Columna `night_wakings` (JSONB) existe
   - ✓ Todas las columnas planas de naps existen
   - ✓ Políticas RLS están configuradas
   - ✓ Índices están creados

2. **Probar flujo completo**
   - Usuario crea una bitácora desde la app
   - Verificar que se guarda en la DB con todos los campos
   - Coach debe poder ver la bitácora en su dashboard
   - Coach debe poder ver detalles completos (siestas, despertares, etc.)

## 🗄️ Estructura de la Base de Datos

### Tabla `bitacoras`
```sql
CREATE TABLE bitacoras (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  day_number INTEGER,
  date TEXT,
  
  -- Columnas planas para siestas
  nap_1_laid_down TEXT,
  nap_1_fell_asleep TEXT,
  nap_1_how_fell_asleep TEXT,
  nap_1_woke_up TEXT,
  nap_1_duration_minutes INTEGER,
  -- (nap_2 y nap_3 similar)
  
  -- Otros campos
  how_baby_ate TEXT,
  baby_mood TEXT,
  number_of_wakings INTEGER,
  night_wakings JSONB,  -- Array de objetos
  morning_wake_time TEXT,
  notes TEXT,
  ai_summary TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Políticas RLS ✓
- ✅ Usuarios pueden crear/ver sus propias bitácoras
- ✅ **Coaches pueden ver TODAS las bitácoras** (líneas 189-198 en `001_initial_schema.sql`)

## 🔍 Archivos Modificados

1. ✅ `frontend/services/api.ts` - Agregado `night_wakings` al payload
2. ✅ `frontend/types/index.ts` - Agregadas columnas planas al tipo
3. ✅ `frontend/app/(tabs)/coach-bitacoras.tsx` - Corregido acceso a columnas planas
4. ✅ `supabase/verify_schema.sql` - Creado script de verificación

## 🚀 Próximos Pasos

1. **Ejecutar el script de verificación** en Supabase SQL Editor
2. **Probar creación de bitácora** desde la app móvil
3. **Verificar visualización** en el dashboard del coach
4. Si hay errores, revisar los logs de Supabase y la consola del navegador/app

## 📝 Notas Importantes

- Los buckets de storage (`avatars`, `message-attachments`) ya están configurados pero no se usan actualmente en bitácoras
- El campo `night_wakings` es un array JSONB, no columnas planas como las siestas
- La transformación de objetos anidados a columnas planas ocurre en `createBitacora` antes del INSERT
