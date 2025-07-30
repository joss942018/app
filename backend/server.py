from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import os
import bcrypt
import jwt
import uuid
from bson import ObjectId

# Database setup
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db = client.lexai_db

app = FastAPI(title="LexAI API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()
SECRET_KEY = "your-secret-key-here"

# Pydantic models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    organization_name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class ChatMessage(BaseModel):
    message: str
    category: Optional[str] = None

class CaseCreate(BaseModel):
    title: str
    client_name: str
    case_type: str
    description: str
    priority: str = "media"

class DocumentAnalysis(BaseModel):
    filename: str
    content: str

# Legal categories data
LEGAL_CATEGORIES = [
    {"id": "familia", "name": "Derecho de Familia", "icon": "👨‍👩‍👧‍👦", "description": "Divorcios, custodia, adopciones"},
    {"id": "laboral", "name": "Derecho Laboral", "icon": "💼", "description": "Despidos, contratos, demandas laborales"},
    {"id": "civil", "name": "Derecho Civil", "icon": "🏛️", "description": "Contratos, responsabilidad civil"},
    {"id": "penal", "name": "Derecho Penal", "icon": "⚖️", "description": "Delitos, defensas penales"},
    {"id": "mercantil", "name": "Derecho Mercantil", "icon": "🏢", "description": "Sociedades, contratos comerciales"},
    {"id": "inmobiliario", "name": "Derecho Inmobiliario", "icon": "🏠", "description": "Compraventa, alquileres, hipotecas"}
]

# Mock AI responses for different categories
MOCK_AI_RESPONSES = {
    "familia": [
        "En casos de divorcio, es importante considerar la distribución de bienes gananciales...",
        "Para temas de custodia, el interés superior del menor es el principio rector...",
        "Los acuerdos prematrimoniales pueden ser una herramienta útil para..."
    ],
    "laboral": [
        "En caso de despido improcedente, tiene derecho a indemnización...",
        "Los contratos temporales no pueden superar los 24 meses...",
        "Las horas extraordinarias deben compensarse según el convenio..."
    ],
    "civil": [
        "En contratos de compraventa, es esencial verificar la capacidad legal...",
        "La responsabilidad civil extracontractual requiere demostrar...",
        "Los vicios ocultos en la compraventa pueden ser causa de..."
    ],
    "penal": [
        "En el proceso penal, es fundamental ejercer el derecho de defensa...",
        "Las medidas cautelares deben ser proporcionales...",
        "La prescripción del delito depende de la pena prevista..."
    ],
    "mercantil": [
        "Para constituir una sociedad limitada se requiere capital mínimo...",
        "Los administradores tienen deberes fiduciarios hacia la sociedad...",
        "Los contratos mercantiles se rigen por principios especiales..."
    ],
    "inmobiliario": [
        "En compraventa inmobiliaria, es esencial verificar cargas...",
        "Los contratos de arrendamiento urbano se rigen por la LAU...",
        "Las hipotecas pueden ser novadas con mejores condiciones..."
    ]
}

# Helper functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=24)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm="HS256")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get("user_id")
        org_id = payload.get("org_id")
        if user_id is None or org_id is None:
            raise HTTPException(status_code=401, detail="Token inválido")
        return {"user_id": user_id, "org_id": org_id}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Token inválido")

# Routes
@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "LexAI API"}

@app.post("/api/auth/register")
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    
    # Create organization
    org_id = str(uuid.uuid4())
    organization = {
        "id": org_id,
        "name": user_data.organization_name,
        "created_at": datetime.utcnow(),
        "active": True
    }
    await db.organizations.insert_one(organization)
    
    # Create user
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "password": hash_password(user_data.password),
        "organization_id": org_id,
        "role": "admin",
        "created_at": datetime.utcnow(),
        "active": True
    }
    await db.users.insert_one(user)
    
    # Create token
    token = create_token({"user_id": user_id, "org_id": org_id})
    
    return {
        "token": token,
        "user": {
            "id": user_id,
            "email": user_data.email,
            "name": user_data.name,
            "organization": user_data.organization_name
        }
    }

@app.post("/api/auth/login")
async def login(login_data: UserLogin):
    user = await db.users.find_one({"email": login_data.email, "active": True})
    if not user or not verify_password(login_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    # Get organization
    org = await db.organizations.find_one({"id": user["organization_id"]})
    
    token = create_token({"user_id": user["id"], "org_id": user["organization_id"]})
    
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "organization": org["name"] if org else "N/A"
        }
    }

@app.get("/api/legal-categories")
async def get_legal_categories(current_user: dict = Depends(get_current_user)):
    return {"categories": LEGAL_CATEGORIES}

@app.post("/api/chat/message")
async def send_chat_message(message_data: ChatMessage, current_user: dict = Depends(get_current_user)):
    import random
    
    # Get responses for category or general
    if message_data.category and message_data.category in MOCK_AI_RESPONSES:
        responses = MOCK_AI_RESPONSES[message_data.category]
    else:
        # General legal responses
        responses = [
            "Basándome en la información proporcionada, le recomiendo consultar la legislación aplicable...",
            "Es importante considerar todos los aspectos legales de su consulta...",
            "Para su caso específico, sería recomendable revisar la jurisprudencia más reciente...",
            "Le sugiero que prepare la siguiente documentación para fortalecer su posición legal..."
        ]
    
    # Select random response
    ai_response = random.choice(responses)
    
    # Save conversation to database
    conversation_id = str(uuid.uuid4())
    conversation = {
        "id": conversation_id,
        "organization_id": current_user["org_id"],
        "user_id": current_user["user_id"],
        "category": message_data.category,
        "messages": [
            {
                "id": str(uuid.uuid4()),
                "type": "user",
                "content": message_data.message,
                "timestamp": datetime.utcnow()
            },
            {
                "id": str(uuid.uuid4()),
                "type": "ai",
                "content": ai_response,
                "timestamp": datetime.utcnow()
            }
        ],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "active": True
    }
    
    await db.conversations.insert_one(conversation)
    
    return {
        "conversation_id": conversation_id,
        "response": ai_response,
        "timestamp": datetime.utcnow()
    }

@app.get("/api/chat/history")
async def get_chat_history(current_user: dict = Depends(get_current_user)):
    conversations = await db.conversations.find({
        "organization_id": current_user["org_id"],
        "active": True
    }).sort("updated_at", -1).to_list(100)
    
    return {"conversations": conversations}

@app.get("/api/chat/conversation/{conversation_id}")
async def get_conversation(conversation_id: str, current_user: dict = Depends(get_current_user)):
    conversation = await db.conversations.find_one({
        "id": conversation_id,
        "organization_id": current_user["org_id"]
    })
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversación no encontrada")
    
    return conversation

@app.post("/api/cases")
async def create_case(case_data: CaseCreate, current_user: dict = Depends(get_current_user)):
    case_id = str(uuid.uuid4())
    case = {
        "id": case_id,
        "organization_id": current_user["org_id"],
        "created_by": current_user["user_id"],
        "title": case_data.title,
        "client_name": case_data.client_name,
        "case_type": case_data.case_type,
        "description": case_data.description,
        "priority": case_data.priority,
        "status": "activo",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "tasks": [],
        "documents": [],
        "important_dates": []
    }
    
    await db.cases.insert_one(case)
    return {"case_id": case_id, "message": "Caso creado exitosamente"}

@app.get("/api/cases")
async def get_cases(current_user: dict = Depends(get_current_user)):
    cases = await db.cases.find({
        "organization_id": current_user["org_id"]
    }).sort("updated_at", -1).to_list(100)
    
    return {"cases": cases}

@app.get("/api/cases/{case_id}")
async def get_case(case_id: str, current_user: dict = Depends(get_current_user)):
    case = await db.cases.find_one({
        "id": case_id,
        "organization_id": current_user["org_id"]
    })
    
    if not case:
        raise HTTPException(status_code=404, detail="Caso no encontrado")
    
    return case

@app.post("/api/documents/analyze")
async def analyze_document(doc_data: DocumentAnalysis, current_user: dict = Depends(get_current_user)):
    import random
    
    # Mock analysis results
    analysis_results = {
        "filename": doc_data.filename,
        "summary": "Este documento contiene información relevante sobre aspectos legales importantes que requieren atención especializada.",
        "key_dates": [
            {"date": "2024-02-15", "description": "Fecha límite para presentar alegaciones"},
            {"date": "2024-03-01", "description": "Vencimiento del plazo de recurso"},
            {"date": "2024-03-15", "description": "Fecha de vista oral programada"}
        ],
        "risks": [
            {"level": "alto", "description": "Posible vencimiento de plazos procesales"},
            {"level": "medio", "description": "Cláusulas que requieren clarificación"},
            {"level": "bajo", "description": "Documentación adicional recomendada"}
        ],
        "jurisprudence": [
            "STS 123/2023 - Criterio relevante para casos similares",
            "SAP Madrid 456/2023 - Interpretación de cláusulas contractuales",
            "STC 789/2023 - Derechos fundamentales aplicables"
        ],
        "clauses": [
            {"type": "estándar", "content": "Cláusula de jurisdicción y competencia"},
            {"type": "atención", "content": "Cláusula de penalización que requiere revisión"},
            {"type": "favorable", "content": "Cláusula de resolución alternativa de conflictos"}
        ]
    }
    
    # Save analysis to database
    analysis_id = str(uuid.uuid4())
    analysis = {
        "id": analysis_id,
        "organization_id": current_user["org_id"],
        "created_by": current_user["user_id"],
        "filename": doc_data.filename,
        "analysis": analysis_results,
        "created_at": datetime.utcnow()
    }
    
    await db.document_analyses.insert_one(analysis)
    
    return analysis_results

@app.get("/api/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    # Count cases by status
    total_cases = await db.cases.count_documents({"organization_id": current_user["org_id"]})
    active_cases = await db.cases.count_documents({"organization_id": current_user["org_id"], "status": "activo"})
    closed_cases = await db.cases.count_documents({"organization_id": current_user["org_id"], "status": "cerrado"})
    
    # Count conversations
    total_conversations = await db.conversations.count_documents({"organization_id": current_user["org_id"]})
    
    return {
        "total_cases": total_cases,
        "active_cases": active_cases,
        "closed_cases": closed_cases,
        "total_conversations": total_conversations,
        "pending_tasks": 5,  # Mock data
        "upcoming_deadlines": 3  # Mock data
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)