from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import random
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Emergent LLM Key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# Create the main app
app = FastAPI(title="MAMÁ RESPIRA API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ==================== MODELS ====================

class ValidationCard(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    message_es: str
    message_en: Optional[str] = None
    category: str = "general"  # general, sleep, crying, feeding, self_care
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ValidationCardCreate(BaseModel):
    message_es: str
    message_en: Optional[str] = None
    category: str = "general"

class DailyCheckIn(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = "default_user"
    mood: int  # 1=sad, 2=neutral, 3=happy
    sleep_start: Optional[str] = None  # HH:MM format
    sleep_end: Optional[str] = None    # HH:MM format
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
    role: str  # "user" or "assistant"
    content: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ChatMessageCreate(BaseModel):
    session_id: str
    content: str

class CommunityPresence(BaseModel):
    online_count: int
    sample_names: List[str]
    message: str

# ==================== BITÁCORA MODELS (Sleep Coach Log) ====================

class NapEntry(BaseModel):
    laid_down_time: Optional[str] = None      # 🛏 acosté a las
    fell_asleep_time: Optional[str] = None    # 😴 Se durmió a las
    how_fell_asleep: Optional[str] = None     # 💤 Cómo se durmió
    woke_up_time: Optional[str] = None        # 😊 Se despertó
    duration_minutes: Optional[int] = None    # ⏰ Duración

class NightWaking(BaseModel):
    time: Optional[str] = None                # Hora del despertar
    duration_minutes: Optional[int] = None    # Cuánto duró
    what_was_done: Optional[str] = None       # Qué hiciste

class DailyBitacora(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = "default_user"
    day_number: int = 1                       # Bitácora del día #
    date: str                                  # Fecha del registro
    
    # Mañana anterior
    previous_day_wake_time: Optional[str] = None  # ☀️ Hora de despertar día anterior
    
    # Siestas
    nap_1: Optional[NapEntry] = None
    nap_2: Optional[NapEntry] = None
    nap_3: Optional[NapEntry] = None
    
    # Alimentación
    how_baby_ate: Optional[str] = None        # 🥑🥛 Cómo comió a lo largo del día
    
    # Rutina nocturna
    relaxing_routine_start: Optional[str] = None  # 🫧 Rutina relajante (hora que comenzó)
    baby_mood: Optional[str] = None           # 😁 Humor
    last_feeding_time: Optional[str] = None   # ⏰ Última toma del día
    laid_down_for_bed: Optional[str] = None   # 🛏 Le acosté
    fell_asleep_at: Optional[str] = None      # Se durmió
    time_to_fall_asleep_minutes: Optional[int] = None  # Tardó en dormirse
    
    # Despertares nocturnos
    number_of_wakings: Optional[int] = None   # # de Despertares
    night_wakings: Optional[List[NightWaking]] = None  # Detalles de cada despertar
    
    # Mañana siguiente
    morning_wake_time: Optional[str] = None   # ☀️ Hora de despertar hoy por la mañana
    
    # Notas adicionales
    notes: Optional[str] = None
    
    # AI summary for coach
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

# ==================== DEFAULT VALIDATION CARDS ====================

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

Ejemplo de buena respuesta:
Usuaria: "Mi bebé no para de llorar y no sé qué hacer"
Tú: "Ese sonido es agotador, lo sé. Respira profundo. Estás haciendo todo lo posible y eso es suficiente. ¿Quieres que repasemos juntas la lista de cosas básicas?"

Recuerda: Tu objetivo es que la mamá pase de pánico a calma en menos de 30 segundos."""

# ==================== HELPER FUNCTIONS ====================

async def get_ai_response(user_message: str, session_id: str) -> str:
    """Get AI response using Claude via Emergent integration"""
    try:
        # Get chat history for context
        history = await db.chat_messages.find(
            {"session_id": session_id}
        ).sort("created_at", -1).limit(10).to_list(10)
        
        # Build context from history
        context = ""
        if history:
            history.reverse()  # Oldest first
            for msg in history:
                role = "Mamá" if msg["role"] == "user" else "Abuela"
                context += f"{role}: {msg['content']}\n"
        
        full_message = f"{context}\nMamá: {user_message}" if context else user_message
        
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=session_id,
            system_message=AI_SYSTEM_PROMPT
        ).with_model("anthropic", "claude-sonnet-4-20250514")
        
        response = await chat.send_message(UserMessage(text=full_message))
        return response
    except Exception as e:
        logging.error(f"AI Error: {e}")
        return "Lo siento, no pude responder ahora. Recuerda: estás haciendo un gran trabajo. Respira profundo. 💛"

async def get_validation_response(mood: int, brain_dump: Optional[str] = None) -> str:
    """Generate AI validation response based on mood and brain dump"""
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
        
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id="validation_" + str(uuid.uuid4()),
            system_message=AI_SYSTEM_PROMPT
        ).with_model("anthropic", "claude-sonnet-4-20250514")
        
        response = await chat.send_message(UserMessage(text=message))
        return response
    except Exception as e:
        logging.error(f"Validation AI Error: {e}")
        return "Gracias por compartir. Recuerda: cada día que pasas con tu bebé es un día de amor. 💛"

# ==================== ROUTES ====================

@api_router.get("/")
async def root():
    return {"message": "MAMÁ RESPIRA API - Bienvenida"}

# Validation Cards
@api_router.get("/validations/random", response_model=ValidationCard)
async def get_random_validation(category: Optional[str] = None):
    """Get a random validation card"""
    query = {}
    if category:
        query["category"] = category
    
    validations = await db.validation_cards.find(query).to_list(100)
    
    if not validations:
        # Seed default validations if empty
        for v in DEFAULT_VALIDATIONS:
            card = ValidationCard(**v)
            await db.validation_cards.insert_one(card.model_dump())
        validations = await db.validation_cards.find(query).to_list(100)
    
    selected = random.choice(validations)
    return ValidationCard(**selected)

@api_router.get("/validations", response_model=List[ValidationCard])
async def get_all_validations():
    """Get all validation cards"""
    validations = await db.validation_cards.find().to_list(100)
    if not validations:
        for v in DEFAULT_VALIDATIONS:
            card = ValidationCard(**v)
            await db.validation_cards.insert_one(card.model_dump())
        validations = await db.validation_cards.find().to_list(100)
    return [ValidationCard(**v) for v in validations]

# Daily Check-ins
@api_router.post("/checkins", response_model=DailyCheckIn)
async def create_checkin(checkin: DailyCheckInCreate):
    """Create a new daily check-in"""
    # Get AI validation response
    ai_response = await get_validation_response(checkin.mood, checkin.brain_dump)
    
    checkin_obj = DailyCheckIn(
        **checkin.model_dump(),
        ai_response=ai_response
    )
    await db.checkins.insert_one(checkin_obj.model_dump())
    return checkin_obj

@api_router.get("/checkins", response_model=List[DailyCheckIn])
async def get_checkins(limit: int = 7):
    """Get recent check-ins"""
    checkins = await db.checkins.find().sort("created_at", -1).limit(limit).to_list(limit)
    return [DailyCheckIn(**c) for c in checkins]

@api_router.get("/checkins/today", response_model=Optional[DailyCheckIn])
async def get_today_checkin():
    """Get today's check-in if exists"""
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    checkin = await db.checkins.find_one({"created_at": {"$gte": today_start}})
    if checkin:
        return DailyCheckIn(**checkin)
    return None

# Chat
@api_router.post("/chat", response_model=ChatMessage)
async def send_chat_message(message: ChatMessageCreate):
    """Send a message to the AI chatbot"""
    # Save user message
    user_msg = ChatMessage(
        session_id=message.session_id,
        role="user",
        content=message.content
    )
    await db.chat_messages.insert_one(user_msg.model_dump())
    
    # Get AI response
    ai_response = await get_ai_response(message.content, message.session_id)
    
    # Save AI message
    ai_msg = ChatMessage(
        session_id=message.session_id,
        role="assistant",
        content=ai_response
    )
    await db.chat_messages.insert_one(ai_msg.model_dump())
    
    return ai_msg

@api_router.get("/chat/{session_id}", response_model=List[ChatMessage])
async def get_chat_history(session_id: str, limit: int = 50):
    """Get chat history for a session"""
    messages = await db.chat_messages.find(
        {"session_id": session_id}
    ).sort("created_at", 1).limit(limit).to_list(limit)
    return [ChatMessage(**m) for m in messages]

# Community Presence (Simulated)
@api_router.get("/community/presence", response_model=CommunityPresence)
async def get_community_presence():
    """Get simulated community presence based on time of day"""
    current_hour = datetime.now().hour
    
    # More moms awake at night (8pm - 6am)
    if 20 <= current_hour or current_hour < 6:
        base_count = random.randint(45, 120)
    elif 6 <= current_hour < 12:
        base_count = random.randint(25, 60)
    else:
        base_count = random.randint(15, 40)
    
    # Sample Spanish names
    names = [
        "Marta", "Ana", "Lucía", "Carmen", "María", "Paula", "Laura",
        "Elena", "Sara", "Isabel", "Sofía", "Alba", "Nuria", "Andrea",
        "Cristina", "Patricia", "Rosa", "Claudia", "Diana", "Eva"
    ]
    
    sample = random.sample(names, min(3, len(names)))
    
    return CommunityPresence(
        online_count=base_count,
        sample_names=sample,
        message=f"{sample[0]} y {base_count - 1} mamás más están despiertas contigo ahora mismo."
    )

# ==================== BITÁCORA ROUTES (Sleep Coach Log) ====================

async def generate_bitacora_summary(bitacora: DailyBitacora) -> str:
    """Generate AI summary of the daily log for the coach"""
    try:
        summary_parts = []
        
        # Previous wake time
        if bitacora.previous_day_wake_time:
            summary_parts.append(f"Despertó ayer: {bitacora.previous_day_wake_time}")
        
        # Naps
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
        
        # Feeding
        if bitacora.how_baby_ate:
            summary_parts.append(f"Alimentación: {bitacora.how_baby_ate}")
        
        # Night routine
        if bitacora.baby_mood:
            summary_parts.append(f"Humor: {bitacora.baby_mood}")
        if bitacora.time_to_fall_asleep_minutes:
            summary_parts.append(f"Tardó en dormirse: {bitacora.time_to_fall_asleep_minutes}min")
        
        # Night wakings
        if bitacora.number_of_wakings is not None:
            summary_parts.append(f"Despertares nocturnos: {bitacora.number_of_wakings}")
        
        # Morning
        if bitacora.morning_wake_time:
            summary_parts.append(f"Despertó hoy: {bitacora.morning_wake_time}")
        
        summary_text = "\n".join(summary_parts)
        
        # Generate AI insights if we have data
        if summary_parts:
            prompt = f"""Analiza este registro de sueño de un bebé y da un resumen breve (2-3 oraciones) 
para la coach de sueño. Incluye patrones observados y posibles recomendaciones:

{summary_text}

Responde solo con el resumen, sin introducciones."""
            
            chat = LlmChat(
                api_key=EMERGENT_LLM_KEY,
                session_id="bitacora_" + str(uuid.uuid4()),
                system_message="Eres una coach de sueño infantil profesional. Da análisis concisos y útiles."
            ).with_model("anthropic", "claude-sonnet-4-20250514")
            
            response = await chat.send_message(UserMessage(text=prompt))
            return response
        
        return "Registro guardado. La coach revisará los datos."
    except Exception as e:
        logging.error(f"Bitacora AI Error: {e}")
        return "Registro guardado exitosamente."

@api_router.post("/bitacora", response_model=DailyBitacora)
async def create_bitacora(bitacora: DailyBitacoraCreate):
    """Create a new daily bitácora entry"""
    # Get the count for day number
    count = await db.bitacoras.count_documents({"user_id": "default_user"})
    
    bitacora_obj = DailyBitacora(
        **bitacora.model_dump(),
        day_number=count + 1
    )
    
    # Generate AI summary
    ai_summary = await generate_bitacora_summary(bitacora_obj)
    bitacora_obj.ai_summary = ai_summary
    
    await db.bitacoras.insert_one(bitacora_obj.model_dump())
    return bitacora_obj

@api_router.get("/bitacora", response_model=List[DailyBitacora])
async def get_bitacoras(limit: int = 30):
    """Get recent bitácora entries"""
    bitacoras = await db.bitacoras.find().sort("created_at", -1).limit(limit).to_list(limit)
    return [DailyBitacora(**b) for b in bitacoras]

@api_router.get("/bitacora/today", response_model=Optional[DailyBitacora])
async def get_today_bitacora():
    """Get today's bitácora if exists"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    bitacora = await db.bitacoras.find_one({"date": today})
    if bitacora:
        return DailyBitacora(**bitacora)
    return None

@api_router.put("/bitacora/{bitacora_id}", response_model=DailyBitacora)
async def update_bitacora(bitacora_id: str, bitacora: DailyBitacoraCreate):
    """Update an existing bitácora entry"""
    existing = await db.bitacoras.find_one({"id": bitacora_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Bitácora no encontrada")
    
    update_data = bitacora.model_dump()
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    # Regenerate AI summary
    updated_obj = DailyBitacora(**{**existing, **update_data})
    ai_summary = await generate_bitacora_summary(updated_obj)
    update_data["ai_summary"] = ai_summary
    
    await db.bitacoras.update_one(
        {"id": bitacora_id},
        {"$set": update_data}
    )
    
    result = await db.bitacoras.find_one({"id": bitacora_id})
    return DailyBitacora(**result)

@api_router.get("/bitacora/{bitacora_id}", response_model=DailyBitacora)
async def get_bitacora_by_id(bitacora_id: str):
    """Get a specific bitácora entry"""
    bitacora = await db.bitacoras.find_one({"id": bitacora_id})
    if not bitacora:
        raise HTTPException(status_code=404, detail="Bitácora no encontrada")
    return DailyBitacora(**bitacora)

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
