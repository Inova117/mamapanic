from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response
from fastapi.security import HTTPBearer
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
import httpx
from datetime import datetime, timezone, timedelta
import random

# Import new auth and AI modules
from auth.jwt_handler import create_access_token, verify_token, extract_token_from_header
from auth.password_handler import hash_password, verify_password
from ai.claude_client import ClaudeClient

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'mama_respira')]

# Anthropic API Key
ANTHROPIC_API_KEY = os.environ.get('ANTHROPIC_API_KEY', '')
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'change-in-production')

# Initialize Claude client
claude_client = ClaudeClient(ANTHROPIC_API_KEY)

# Create the main app
app = FastAPI(title="MAMÁ RESPIRA API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

security = HTTPBearer(auto_error=False)

# ==================== USER MODELS ====================

class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    role: str = "user"  # "user", "premium", "coach"
    password_hash: Optional[str] = None  # Only used internally, not returned in API
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserRegister(BaseModel):
    email: str
    password: str
    name: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserSession(BaseModel):
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SessionDataResponse(BaseModel):
    id: str
    email: str
    name: str
    picture: Optional[str] = None
    session_token: str

# ==================== MESSAGE MODELS (Coach <-> User) ====================

class DirectMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sender_id: str  # user_id of sender
    receiver_id: str  # user_id of receiver
    content: str
    read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DirectMessageCreate(BaseModel):
    receiver_id: str
    content: str

class Conversation(BaseModel):
    user_id: str
    user_name: str
    user_email: str
    user_picture: Optional[str] = None
    last_message: Optional[str] = None
    last_message_at: Optional[datetime] = None
    unread_count: int = 0

# ==================== EXISTING MODELS ====================

class ValidationCard(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    message_es: str
    message_en: Optional[str] = None
    category: str = "general"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DailyCheckIn(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = "default_user"
    mood: int
    sleep_start: Optional[str] = None
    sleep_end: Optional[str] = None
    baby_wakeups: Optional[int] = None
    brain_dump: Optional[str] = None
    ai_response: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DailyCheckInCreate(BaseModel):
    mood: int
    sleep_start: Optional[str] = None
    sleep_end: Optional[str] = None
    baby_wakeups: Optional[int] = None
    brain_dump: Optional[str] = None

class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    user_id: str = "default_user"
    role: str
    content: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ChatMessageCreate(BaseModel):
    session_id: str
    content: str

class CommunityPresence(BaseModel):
    online_count: int
    sample_names: List[str]
    message: str

# ==================== BITÁCORA MODELS ====================

class NapEntry(BaseModel):
    laid_down_time: Optional[str] = None
    fell_asleep_time: Optional[str] = None
    how_fell_asleep: Optional[str] = None
    woke_up_time: Optional[str] = None
    duration_minutes: Optional[int] = None

class NightWaking(BaseModel):
    time: Optional[str] = None
    duration_minutes: Optional[int] = None
    what_was_done: Optional[str] = None

class DailyBitacora(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = "default_user"
    day_number: int = 1
    date: str
    previous_day_wake_time: Optional[str] = None
    nap_1: Optional[NapEntry] = None
    nap_2: Optional[NapEntry] = None
    nap_3: Optional[NapEntry] = None
    how_baby_ate: Optional[str] = None
    relaxing_routine_start: Optional[str] = None
    baby_mood: Optional[str] = None
    last_feeding_time: Optional[str] = None
    laid_down_for_bed: Optional[str] = None
    fell_asleep_at: Optional[str] = None
    time_to_fall_asleep_minutes: Optional[int] = None
    number_of_wakings: Optional[int] = None
    night_wakings: Optional[List[NightWaking]] = None
    morning_wake_time: Optional[str] = None
    notes: Optional[str] = None
    ai_summary: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DailyBitacoraCreate(BaseModel):
    day_number: int = 1
    date: str
    previous_day_wake_time: Optional[str] = None
    nap_1: Optional[NapEntry] = None
    nap_2: Optional[NapEntry] = None
    nap_3: Optional[NapEntry] = None
    how_baby_ate: Optional[str] = None
    relaxing_routine_start: Optional[str] = None
    baby_mood: Optional[str] = None
    last_feeding_time: Optional[str] = None
    laid_down_for_bed: Optional[str] = None
    fell_asleep_at: Optional[str] = None
    time_to_fall_asleep_minutes: Optional[int] = None
    number_of_wakings: Optional[int] = None
    night_wakings: Optional[List[NightWaking]] = None
    morning_wake_time: Optional[str] = None
    notes: Optional[str] = None

# ==================== DEFAULT DATA ====================

DEFAULT_VALIDATIONS = [
    {"message_es": "No lo estás haciendo mal. 9 de cada 10 mamás se sienten exactamente así ahora mismo.", "category": "general"},
    {"message_es": "Tu bebé te eligió como su mamá por una razón. Eres suficiente.", "category": "general"},
    {"message_es": "Las noches difíciles no definen tu maternidad. Son solo noches.", "category": "sleep"},
    {"message_es": "Está bien sentirse abrumada. Esto pasará.", "category": "general"},
    {"message_es": "Tu bebé no necesita una mamá perfecta. Solo te necesita a ti.", "category": "general"},
    {"message_es": "El llanto de tu bebé no es tu culpa. Los bebés lloran, es su forma de comunicarse.", "category": "crying"},
    {"message_es": "Cada día que sobrevives es un día de éxito. Literalmente.", "category": "general"},
    {"message_es": "No estás sola. Hay miles de mamás despiertas contigo ahora mismo.", "category": "general"},
    {"message_es": "Pedir ayuda no es debilidad. Es inteligencia.", "category": "self_care"},
    {"message_es": "Tu cuerpo acaba de crear vida. Mereces descanso y compasión.", "category": "self_care"},
    {"message_es": "Algunas noches el único logro es sobrevivir. Y eso está perfecto.", "category": "sleep"},
    {"message_es": "El amor que sientes por tu bebé, aunque estés agotada, es todo lo que necesita.", "category": "general"},
    {"message_es": "Respira. Este momento pasará. Mañana será un nuevo día.", "category": "general"},
    {"message_es": "No tienes que disfrutar cada momento para ser buena mamá.", "category": "general"},
    {"message_es": "La lactancia es difícil. Sea cual sea tu camino, está bien.", "category": "feeding"},
]

# Coach email - change this to the actual coach email
COACH_EMAIL = "coach@mamarespira.com"

# ==================== AI SYSTEM PROMPT ====================

AI_SYSTEM_PROMPT = """Eres "Abuela Sabia" - una consejera empática y cariñosa para mamás primerizas exhaustas. 

Tu personalidad:
- Cálida como una abuela que ha visto todo
- Honesta pero nunca crítica
- Prioriza la validación emocional SIEMPRE antes de dar consejos
- Hablas en español de forma sencilla y reconfortante
- Usas frases cortas y directas (la mamá está agotada, no puede leer párrafos largos)

Reglas ESTRICTAS:
1. SIEMPRE valida la emoción primero. "Entiendo lo agotada que estás" ANTES de cualquier consejo.
2. NUNCA des consejos médicos directos. Si hay preocupación de salud, sugiere consultar al pediatra.
3. Mantén respuestas CORTAS (máximo 3-4 oraciones).
4. Si detectas señales de depresión postparto severa, menciona gentilmente buscar ayuda profesional.
5. Normaliza los sentimientos difíciles de la maternidad.
6. NUNCA juzgues decisiones de crianza (pecho/biberón, colecho, etc.)

Recuerda: Tu objetivo es que la mamá pase de pánico a calma en menos de 30 segundos."""

# ==================== AUTH HELPERS ====================

async def get_session_token(request: Request) -> Optional[str]:
    """Get JWT token from Authorization header"""
    auth_header = request.headers.get("Authorization")
    return extract_token_from_header(auth_header)

async def get_current_user(request: Request) -> Optional[User]:
    """Get current user from JWT token"""
    token = await get_session_token(request)
    if not token:
        return None
    
    # Verify JWT token
    payload = verify_token(token)
    if not payload:
        return None
    
    # Get user from database
    user_doc = await db.users.find_one(
        {"user_id": payload["user_id"]},
        {"_id": 0, "password_hash": 0}  # Exclude password hash from response
    )
    if user_doc:
        return User(**user_doc)
    return None

async def require_auth(request: Request) -> User:
    """Require authentication"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="No autenticado")
    return user

async def require_premium(request: Request) -> User:
    """Require premium or coach role"""
    user = await require_auth(request)
    if user.role not in ["premium", "coach"]:
        raise HTTPException(status_code=403, detail="Se requiere cuenta premium")
    return user

async def require_coach(request: Request) -> User:
    """Require coach role"""
    user = await require_auth(request)
    if user.role != "coach":
        raise HTTPException(status_code=403, detail="Acceso solo para coach")
    return user

# ==================== AI HELPERS ====================

async def get_ai_response(user_message: str, session_id: str, user_id: str) -> str:
    """Get AI response using Claude via direct Anthropic SDK"""
    try:
        # Get conversation history
        history = await db.chat_messages.find(
            {"session_id": session_id, "user_id": user_id}
        ).sort("created_at", -1).limit(10).to_list(10)
        
        # Format history for Claude
        conversation_history = []
        if history:
            history.reverse()
            for msg in history:
                conversation_history.append({
                    "role": msg["role"],
                    "content": msg["content"]
                })
        
        # Call Claude
        response = await claude_client.send_message(
            system_prompt=AI_SYSTEM_PROMPT,
            user_message=user_message,
            conversation_history=conversation_history
        )
        return response
    except Exception as e:
        logging.error(f"AI Error: {e}")
        return "Lo siento, no pude responder ahora. Recuerda: estás haciendo un gran trabajo. Respira profundo. 💛"

async def get_validation_response(mood: int, brain_dump: Optional[str] = None) -> str:
    """Generate AI validation response based on mood"""
    try:
        mood_context = {
            1: "La mamá se siente muy mal/triste hoy.",
            2: "La mamá se siente regular/neutral hoy.",
            3: "La mamá se siente bien hoy."
        }
        
        message = mood_context.get(mood, "")
        if brain_dump:
            message += f" Ella escribió: '{brain_dump}'"
        message += "\n\nResponde con una validación corta y cariñosa (máximo 2 oraciones)."
        
        response = await claude_client.send_message(
            system_prompt=AI_SYSTEM_PROMPT,
            user_message=message,
            max_tokens=200
        )
        return response
    except Exception as e:
        logging.error(f"Validation AI Error: {e}")
        return "Gracias por compartir. Recuerda: cada día que pasas con tu bebé es un día de amor. 💛"

async def generate_bitacora_summary(bitacora: DailyBitacora) -> str:
    """Generate AI summary of the daily log for the coach"""
    try:
        summary_parts = []
        
        if bitacora.previous_day_wake_time:
            summary_parts.append(f"Despertó ayer: {bitacora.previous_day_wake_time}")
        
        naps_info = []
        for i, nap in enumerate([bitacora.nap_1, bitacora.nap_2, bitacora.nap_3], 1):
            if nap and (nap.laid_down_time or nap.duration_minutes):
                nap_str = f"Siesta {i}"
                if nap.duration_minutes:
                    nap_str += f": {nap.duration_minutes}min"
                if nap.how_fell_asleep:
                    nap_str += f" ({nap.how_fell_asleep})"
                naps_info.append(nap_str)
        if naps_info:
            summary_parts.append("Siestas: " + ", ".join(naps_info))
        
        if bitacora.how_baby_ate:
            summary_parts.append(f"Alimentación: {bitacora.how_baby_ate}")
        if bitacora.baby_mood:
            summary_parts.append(f"Humor: {bitacora.baby_mood}")
        if bitacora.time_to_fall_asleep_minutes:
            summary_parts.append(f"Tardó en dormirse: {bitacora.time_to_fall_asleep_minutes}min")
        if bitacora.number_of_wakings is not None:
            summary_parts.append(f"Despertares nocturnos: {bitacora.number_of_wakings}")
        if bitacora.morning_wake_time:
            summary_parts.append(f"Despertó hoy: {bitacora.morning_wake_time}")
        
        summary_text = "\n".join(summary_parts)
        
        if summary_parts:
            prompt = f"""Analiza este registro de sueño de un bebé y da un resumen breve (2-3 oraciones) 
para la coach de sueño. Incluye patrones observados y posibles recomendaciones:

{summary_text}

Responde solo con el resumen, sin introducciones."""
            
            response = await claude_client.send_message(
                system_prompt="Eres una coach de sueño infantil profesional. Da análisis concisos y útiles.",
                user_message=prompt,
                max_tokens=300
            )
            return response
        
        return "Registro guardado. La coach revisará los datos."
    except Exception as e:
        logging.error(f"Bitacora AI Error: {e}")
        return "Registro guardado exitosamente."

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register")
async def register(user_data: UserRegister):
    """Register a new user with email and password"""
    # Check if email already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email ya registrado")
    
    # Generate user_id
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    
    # Hash password
    password_hashed = hash_password(user_data.password)
    
    # Determine role - check if this is the coach email
    coach_email = os.environ.get('COACH_EMAIL', 'coach@mamarespira.com')
    role = "coach" if user_data.email == coach_email else "user"
    
    # Create user
    user = User(
        user_id=user_id,
        email=user_data.email,
        name=user_data.name,
        role=role,
        password_hash=password_hashed
    )
    
    await db.users.insert_one(user.model_dump())
    
    # Create JWT token
    access_token = create_access_token(user_id, user_data.email)
    
    # Return user without password hash
    user_response = user.model_dump()
    user_response.pop('password_hash', None)
    
    return {
        "user": user_response,
        "access_token": access_token,
        "token_type": "bearer"
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    """Login with email and password"""
    # Find user
    user_doc = await db.users.find_one({"email": credentials.email})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Email o contraseña incorrectos")
    
    # Verify password
    if not verify_password(credentials.password, user_doc.get('password_hash', '')):
        raise HTTPException(status_code=401, detail="Email o contraseña incorrectos")
    
    # Create JWT token
    access_token = create_access_token(user_doc['user_id'], user_doc['email'])
    
    # Return user without password hash
    user_response = {k: v for k, v in user_doc.items() if k not in ['_id', 'password_hash']}
    
    return {
        "user": user_response,
        "access_token": access_token,
        "token_type": "bearer"
    }

@api_router.get("/auth/me")
async def get_me(request: Request):
    """Get current user info"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="No autenticado")
    return user.model_dump(exclude={'password_hash'})

@api_router.post("/auth/logout")
async def logout(request: Request):
    """Logout user (JWT is stateless, so this is mainly for client-side cleanup)"""
    return {"message": "Sesión cerrada"}

@api_router.post("/auth/upgrade-premium")
async def upgrade_to_premium(request: Request):
    """Upgrade user to premium (for testing)"""
    user = await require_auth(request)
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"role": "premium"}}
    )
    return {"message": "Actualizado a premium", "role": "premium"}

# ==================== DIRECT MESSAGES (Coach <-> User) ====================

@api_router.post("/messages", response_model=DirectMessage)
async def send_message(message: DirectMessageCreate, request: Request):
    """Send a direct message (premium users to coach, or coach to users)"""
    user = await require_auth(request)
    
    # Get coach user_id
    coach = await db.users.find_one({"role": "coach"}, {"_id": 0})
    coach_id = coach["user_id"] if coach else None
    
    # Validate sender/receiver
    if user.role == "coach":
        # Coach can send to any user
        receiver = await db.users.find_one({"user_id": message.receiver_id}, {"_id": 0})
        if not receiver:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
    else:
        # Regular users can only send to coach
        if user.role != "premium":
            raise HTTPException(status_code=403, detail="Solo usuarios premium pueden enviar mensajes")
        if message.receiver_id != coach_id:
            raise HTTPException(status_code=403, detail="Solo puedes enviar mensajes a la coach")
    
    msg = DirectMessage(
        sender_id=user.user_id,
        receiver_id=message.receiver_id,
        content=message.content
    )
    await db.direct_messages.insert_one(msg.model_dump())
    return msg

@api_router.get("/messages/conversation/{other_user_id}", response_model=List[DirectMessage])
async def get_conversation(other_user_id: str, request: Request, limit: int = 50):
    """Get conversation with another user"""
    user = await require_auth(request)
    
    # Get messages between current user and other user
    messages = await db.direct_messages.find({
        "$or": [
            {"sender_id": user.user_id, "receiver_id": other_user_id},
            {"sender_id": other_user_id, "receiver_id": user.user_id}
        ]
    }, {"_id": 0}).sort("created_at", 1).limit(limit).to_list(limit)
    
    # Mark messages as read
    await db.direct_messages.update_many(
        {"sender_id": other_user_id, "receiver_id": user.user_id, "read": False},
        {"$set": {"read": True}}
    )
    
    return [DirectMessage(**m) for m in messages]

@api_router.get("/messages/coach-id")
async def get_coach_id(request: Request):
    """Get the coach's user_id"""
    coach = await db.users.find_one({"role": "coach"}, {"_id": 0})
    if not coach:
        raise HTTPException(status_code=404, detail="Coach no encontrada")
    return {"coach_id": coach["user_id"], "coach_name": coach["name"]}

@api_router.get("/messages/unread-count")
async def get_unread_count(request: Request):
    """Get unread message count"""
    user = await require_auth(request)
    count = await db.direct_messages.count_documents({
        "receiver_id": user.user_id,
        "read": False
    })
    return {"unread_count": count}

# ==================== COACH DASHBOARD ROUTES ====================

@api_router.get("/coach/clients", response_model=List[Conversation])
async def get_coach_clients(request: Request):
    """Get all clients for the coach with their conversation status"""
    await require_coach(request)
    
    # Get all premium users
    users = await db.users.find(
        {"role": {"$in": ["premium", "user"]}},
        {"_id": 0}
    ).to_list(1000)
    
    conversations = []
    for user_doc in users:
        # Get last message
        last_msg = await db.direct_messages.find_one(
            {"$or": [
                {"sender_id": user_doc["user_id"]},
                {"receiver_id": user_doc["user_id"]}
            ]},
            {"_id": 0},
            sort=[("created_at", -1)]
        )
        
        # Get unread count
        unread = await db.direct_messages.count_documents({
            "sender_id": user_doc["user_id"],
            "read": False
        })
        
        conversations.append(Conversation(
            user_id=user_doc["user_id"],
            user_name=user_doc["name"],
            user_email=user_doc["email"],
            user_picture=user_doc.get("picture"),
            last_message=last_msg["content"] if last_msg else None,
            last_message_at=last_msg["created_at"] if last_msg else None,
            unread_count=unread
        ))
    
    # Sort by last message time
    conversations.sort(key=lambda x: x.last_message_at or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
    return conversations

@api_router.get("/coach/client/{user_id}/bitacoras", response_model=List[DailyBitacora])
async def get_client_bitacoras(user_id: str, request: Request, limit: int = 30):
    """Get bitácoras for a specific client"""
    await require_coach(request)
    
    bitacoras = await db.bitacoras.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return [DailyBitacora(**b) for b in bitacoras]

@api_router.get("/coach/client/{user_id}/checkins", response_model=List[DailyCheckIn])
async def get_client_checkins(user_id: str, request: Request, limit: int = 30):
    """Get check-ins for a specific client"""
    await require_coach(request)
    
    checkins = await db.checkins.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return [DailyCheckIn(**c) for c in checkins]

@api_router.put("/coach/client/{user_id}/role")
async def update_client_role(user_id: str, request: Request):
    """Toggle client premium status"""
    await require_coach(request)
    
    body = await request.json()
    new_role = body.get("role", "user")
    
    if new_role not in ["user", "premium"]:
        raise HTTPException(status_code=400, detail="Rol inválido")
    
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"role": new_role}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    return {"message": f"Rol actualizado a {new_role}"}

# ==================== EXISTING ROUTES (Updated with auth) ====================

@api_router.get("/")
async def root():
    return {"message": "MAMÁ RESPIRA API - Bienvenida"}

@api_router.get("/validations/random", response_model=ValidationCard)
async def get_random_validation(category: Optional[str] = None):
    """Get a random validation card"""
    query = {}
    if category:
        query["category"] = category
    
    validations = await db.validation_cards.find(query, {"_id": 0}).to_list(100)
    
    if not validations:
        for v in DEFAULT_VALIDATIONS:
            card = ValidationCard(**v)
            await db.validation_cards.insert_one(card.model_dump())
        validations = await db.validation_cards.find(query, {"_id": 0}).to_list(100)
    
    selected = random.choice(validations)
    return ValidationCard(**selected)

@api_router.get("/validations", response_model=List[ValidationCard])
async def get_all_validations():
    """Get all validation cards"""
    validations = await db.validation_cards.find({}, {"_id": 0}).to_list(100)
    if not validations:
        for v in DEFAULT_VALIDATIONS:
            card = ValidationCard(**v)
            await db.validation_cards.insert_one(card.model_dump())
        validations = await db.validation_cards.find({}, {"_id": 0}).to_list(100)
    return [ValidationCard(**v) for v in validations]

@api_router.post("/checkins", response_model=DailyCheckIn)
async def create_checkin(checkin: DailyCheckInCreate, request: Request):
    """Create a new daily check-in"""
    user = await get_current_user(request)
    user_id = user.user_id if user else "default_user"
    
    ai_response = await get_validation_response(checkin.mood, checkin.brain_dump)
    
    checkin_obj = DailyCheckIn(
        **checkin.model_dump(),
        user_id=user_id,
        ai_response=ai_response
    )
    await db.checkins.insert_one(checkin_obj.model_dump())
    return checkin_obj

@api_router.get("/checkins", response_model=List[DailyCheckIn])
async def get_checkins(request: Request, limit: int = 7):
    """Get recent check-ins for current user"""
    user = await get_current_user(request)
    user_id = user.user_id if user else "default_user"
    
    checkins = await db.checkins.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    return [DailyCheckIn(**c) for c in checkins]

@api_router.post("/chat", response_model=ChatMessage)
async def send_chat_message(message: ChatMessageCreate, request: Request):
    """Send a message to the AI chatbot"""
    user = await get_current_user(request)
    user_id = user.user_id if user else "default_user"
    
    user_msg = ChatMessage(
        session_id=message.session_id,
        user_id=user_id,
        role="user",
        content=message.content
    )
    await db.chat_messages.insert_one(user_msg.model_dump())
    
    ai_response = await get_ai_response(message.content, message.session_id, user_id)
    
    ai_msg = ChatMessage(
        session_id=message.session_id,
        user_id=user_id,
        role="assistant",
        content=ai_response
    )
    await db.chat_messages.insert_one(ai_msg.model_dump())
    
    return ai_msg

@api_router.get("/chat/{session_id}", response_model=List[ChatMessage])
async def get_chat_history(session_id: str, request: Request, limit: int = 50):
    """Get chat history for a session"""
    user = await get_current_user(request)
    user_id = user.user_id if user else "default_user"
    
    messages = await db.chat_messages.find(
        {"session_id": session_id, "user_id": user_id},
        {"_id": 0}
    ).sort("created_at", 1).limit(limit).to_list(limit)
    return [ChatMessage(**m) for m in messages]

@api_router.get("/community/presence", response_model=CommunityPresence)
async def get_community_presence():
    """Get simulated community presence"""
    current_hour = datetime.now().hour
    
    if 20 <= current_hour or current_hour < 6:
        base_count = random.randint(45, 120)
    elif 6 <= current_hour < 12:
        base_count = random.randint(25, 60)
    else:
        base_count = random.randint(15, 40)
    
    names = ["Marta", "Ana", "Lucía", "Carmen", "María", "Paula", "Laura",
             "Elena", "Sara", "Isabel", "Sofía", "Alba", "Nuria", "Andrea"]
    
    sample = random.sample(names, min(3, len(names)))
    
    return CommunityPresence(
        online_count=base_count,
        sample_names=sample,
        message=f"{sample[0]} y {base_count - 1} mamás más están despiertas contigo ahora mismo."
    )

@api_router.post("/bitacora", response_model=DailyBitacora)
async def create_bitacora(bitacora: DailyBitacoraCreate, request: Request):
    """Create a new daily bitácora entry"""
    user = await get_current_user(request)
    user_id = user.user_id if user else "default_user"
    
    count = await db.bitacoras.count_documents({"user_id": user_id})
    
    bitacora_obj = DailyBitacora(
        **bitacora.model_dump(),
        user_id=user_id,
        day_number=count + 1
    )
    
    ai_summary = await generate_bitacora_summary(bitacora_obj)
    bitacora_obj.ai_summary = ai_summary
    
    await db.bitacoras.insert_one(bitacora_obj.model_dump())
    return bitacora_obj

@api_router.get("/bitacora", response_model=List[DailyBitacora])
async def get_bitacoras(request: Request, limit: int = 30):
    """Get recent bitácora entries for current user"""
    user = await get_current_user(request)
    user_id = user.user_id if user else "default_user"
    
    bitacoras = await db.bitacoras.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    return [DailyBitacora(**b) for b in bitacoras]

@api_router.get("/bitacora/today", response_model=Optional[DailyBitacora])
async def get_today_bitacora(request: Request):
    """Get today's bitácora if exists"""
    user = await get_current_user(request)
    user_id = user.user_id if user else "default_user"
    
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    bitacora = await db.bitacoras.find_one(
        {"user_id": user_id, "date": today},
        {"_id": 0}
    )
    if bitacora:
        return DailyBitacora(**bitacora)
    return None

# Include the router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
