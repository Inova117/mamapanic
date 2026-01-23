"""
Script para asignar el rol de coach a un usuario en Supabase
Ejecutar: python assign_coach_role.py
"""

from supabase import create_client
import os
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# Inicializar cliente de Supabase
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')  # Necesitas la service key

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("❌ Error: Faltan variables de entorno SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY")
    print("   Asegúrate de tenerlas en tu archivo .env")
    exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# Email del coach
COACH_EMAIL = "maricruzleons09@gmail.com"

def assign_coach_role():
    """Asigna el rol de coach a un usuario"""
    try:
        # Buscar el usuario por email
        response = supabase.auth.admin.list_users()
        users = response
        
        user_found = None
        for user in users:
            if user.email == COACH_EMAIL:
                user_found = user
                break
        
        if not user_found:
            print(f"❌ No se encontró el usuario con email: {COACH_EMAIL}")
            print("   El usuario debe iniciar sesión al menos una vez antes de asignarle un rol")
            return
        
        # Actualizar el user_metadata con el rol de coach
        response = supabase.auth.admin.update_user_by_id(
            user_found.id,
            {
                "user_metadata": {
                    "role": "coach"
                }
            }
        )
        
        print(f"✅ Rol de coach asignado exitosamente a: {COACH_EMAIL}")
        print(f"   User ID: {user_found.id}")
        print(f"   Metadata actualizado: {response.user_metadata}")
        
        # Crear entrada en la tabla coaches si no existe
        try:
            coach_data = {
                "user_id": user_found.id,
                "email": COACH_EMAIL,
                "name": user_found.user_metadata.get("name", "Coach")
            }
            
            supabase.table("coaches").insert(coach_data).execute()
            print(f"✅ Entrada creada en la tabla 'coaches'")
        except Exception as e:
            if "duplicate key" in str(e).lower():
                print(f"ℹ️  El coach ya existe en la tabla 'coaches'")
            else:
                print(f"⚠️  Advertencia al crear entrada en coaches: {e}")
        
    except Exception as e:
        print(f"❌ Error al asignar rol de coach: {e}")
        print(f"   Detalles: {type(e).__name__}")

def list_all_users():
    """Lista todos los usuarios con sus roles"""
    try:
        response = supabase.auth.admin.list_users()
        
        print("\n📋 Usuarios registrados:")
        print("-" * 80)
        
        for user in response:
            role = user.user_metadata.get("role", "user") if user.user_metadata else "user"
            name = user.user_metadata.get("name", "Sin nombre") if user.user_metadata else "Sin nombre"
            print(f"Email: {user.email}")
            print(f"  Nombre: {name}")
            print(f"  Rol: {role}")
            print(f"  ID: {user.id}")
            print("-" * 80)
            
    except Exception as e:
        print(f"❌ Error al listar usuarios: {e}")

if __name__ == "__main__":
    print("🔧 Asignador de Rol de Coach\n")
    
    # Listar usuarios actuales
    list_all_users()
    
    # Asignar rol de coach
    print(f"\n🎯 Asignando rol de coach a: {COACH_EMAIL}")
    assign_coach_role()
    
    print("\n✨ Proceso completado")
    print("   El usuario debe cerrar sesión y volver a iniciar sesión para ver el dashboard")
