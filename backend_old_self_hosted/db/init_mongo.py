"""MongoDB initialization and index creation"""
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone

# Default validation cards
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


async def init_database(mongo_url: str, db_name: str):
    """
    Initialize MongoDB database with indexes and seed data
    
    Args:
        mongo_url: MongoDB connection URL
        db_name: Database name
    """
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print(f"Initializing database: {db_name}")
    
    # Create indexes for users collection
    print("Creating indexes for users...")
    await db.users.create_index("user_id", unique=True)
    await db.users.create_index("email", unique=True)
    await db.users.create_index("role")
    
    # Create indexes for user_sessions collection
    print("Creating indexes for user_sessions...")
    await db.user_sessions.create_index("session_token", unique=True)
    await db.user_sessions.create_index("user_id")
    await db.user_sessions.create_index("expires_at")
    
    # Create indexes for checkins collection
    print("Creating indexes for checkins...")
    await db.checkins.create_index([("user_id", 1), ("created_at", -1)])
    
    # Create indexes for chat_messages collection
    print("Creating indexes for chat_messages...")
    await db.chat_messages.create_index([("session_id", 1), ("created_at", 1)])
    await db.chat_messages.create_index([("user_id", 1), ("created_at", -1)])
    
    # Create indexes for direct_messages collection
    print("Creating indexes for direct_messages...")
    await db.direct_messages.create_index([("sender_id", 1), ("created_at", -1)])
    await db.direct_messages.create_index([("receiver_id", 1), ("created_at", -1)])
    await db.direct_messages.create_index([("receiver_id", 1), ("read", 1)])
    
    # Create indexes for bitacoras collection
    print("Creating indexes for bitacoras...")
    await db.bitacoras.create_index([("user_id", 1), ("date", -1)])
    await db.bitacoras.create_index([("user_id", 1), ("created_at", -1)])
    
    # Create indexes for validation_cards collection
    print("Creating indexes for validation_cards...")
    await db.validation_cards.create_index("category")
    
    # Seed validation cards if collection is empty
    count = await db.validation_cards.count_documents({})
    if count == 0:
        print("Seeding validation cards...")
        import uuid
        for validation in DEFAULT_VALIDATIONS:
            validation['id'] = str(uuid.uuid4())
            validation['created_at'] = datetime.now(timezone.utc)
        await db.validation_cards.insert_many(DEFAULT_VALIDATIONS)
        print(f"Inserted {len(DEFAULT_VALIDATIONS)} validation cards")
    else:
        print(f"Validation cards already exist ({count} cards)")
    
    print("Database initialization complete!")
    client.close()


if __name__ == "__main__":
    # Run initialization
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'mama_respira')
    
    asyncio.run(init_database(mongo_url, db_name))
