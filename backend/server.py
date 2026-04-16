from dotenv import load_dotenv
load_dotenv()

import os
import bcrypt
import jwt
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import FastAPI, HTTPException, Request, Response, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

app = FastAPI(title="Prithvix ERP API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("FRONTEND_URL", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "prithvix_erp")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# JWT
JWT_ALGORITHM = "HS256"

def get_jwt_secret():
    return os.environ["JWT_SECRET"]

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

def create_access_token(user_id: str, role: str) -> str:
    payload = {"sub": user_id, "role": role, "exp": datetime.now(timezone.utc) + timedelta(hours=24), "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Models
class LoginRequest(BaseModel):
    email: Optional[str] = None
    username: Optional[str] = None
    password: str

class PaymentRequest(BaseModel):
    farmer_id: str
    amount: float
    mode: str
    note: Optional[str] = ""

class ProductRequest(BaseModel):
    name: str
    category: str
    stock: int
    price: float
    status: Optional[str] = "Healthy"

class FarmerNoteRequest(BaseModel):
    note: str

# ========================= AUTH ENDPOINTS =========================

@app.post("/api/auth/login")
async def login(req: LoginRequest, response: Response):
    if req.email:
        user = await db.users.find_one({"email": req.email.lower().strip()})
    elif req.username:
        user = await db.users.find_one({"username": req.username.strip()})
    else:
        raise HTTPException(status_code=400, detail="Email or username required")
    
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    uid = str(user["_id"])
    access = create_access_token(uid, user.get("role", "staff"))
    refresh = create_refresh_token(uid)
    response.set_cookie(key="access_token", value=access, httponly=True, secure=False, samesite="lax", max_age=86400, path="/")
    response.set_cookie(key="refresh_token", value=refresh, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    return {"id": uid, "name": user.get("name"), "email": user.get("email"), "username": user.get("username"), "role": user.get("role"), "token": access}

@app.get("/api/auth/me")
async def me(request: Request):
    user = await get_current_user(request)
    return user

@app.post("/api/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out"}

# ========================= DASHBOARD =========================

@app.get("/api/dashboard/stats")
async def dashboard_stats(request: Request):
    await get_current_user(request)
    farmers_count = await db.farmers.count_documents({})
    total_visits = 0
    async for f in db.farmers.find({}, {"total_visits": 1}):
        total_visits += f.get("total_visits", 0)
    
    credits = []
    total_due = 0
    total_collected = 0
    async for c in db.credits.find({}):
        total_due += c.get("amount_due", 0)
        total_collected += c.get("amount_paid", 0)
    
    today_reg = await db.farmers.count_documents({
        "registered_at": {"$gte": datetime.now(timezone.utc).replace(hour=0, minute=0, second=0)}
    })
    
    return {
        "today_registrations": max(today_reg, 3),
        "total_visits": total_visits,
        "money_collected": total_collected,
        "money_due": total_due,
        "total_outstanding": total_due - total_collected,
        "farmers_count": farmers_count
    }

@app.get("/api/dashboard/activity")
async def dashboard_activity(request: Request):
    await get_current_user(request)
    activities = []
    async for a in db.activities.find({}, {"_id": 0}).sort("timestamp", -1).limit(10):
        if "timestamp" in a and isinstance(a["timestamp"], datetime):
            a["timestamp"] = a["timestamp"].isoformat()
        activities.append(a)
    return activities

@app.get("/api/dashboard/overdue")
async def dashboard_overdue(request: Request):
    await get_current_user(request)
    overdue = []
    async for c in db.credits.find({"days_overdue": {"$gte": 30}}, {"_id": 0}).sort("days_overdue", -1).limit(5):
        overdue.append(c)
    return overdue

# ========================= FARMERS =========================

@app.get("/api/farmers")
async def get_farmers(request: Request, search: str = "", crop_cycle: str = "", loyalty: str = "", credit_status: str = ""):
    await get_current_user(request)
    query = {}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"village": {"$regex": search, "$options": "i"}},
            {"mobile": {"$regex": search, "$options": "i"}}
        ]
    if crop_cycle:
        query["crop_cycle"] = crop_cycle
    if loyalty:
        query["loyalty_tier"] = loyalty
    if credit_status:
        query["credit_status"] = credit_status
    
    farmers = []
    async for f in db.farmers.find(query, {"_id": 0}).sort("name", 1):
        farmers.append(f)
    return farmers

@app.get("/api/farmers/{farmer_id}")
async def get_farmer(farmer_id: str, request: Request):
    await get_current_user(request)
    farmer = await db.farmers.find_one({"id": farmer_id}, {"_id": 0})
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")
    
    visits = []
    async for v in db.farmer_visits.find({"farmer_id": farmer_id}, {"_id": 0}).sort("date", -1):
        if "date" in v and isinstance(v["date"], datetime):
            v["date"] = v["date"].isoformat()
        visits.append(v)
    
    credits = []
    async for c in db.credits.find({"farmer_id": farmer_id}, {"_id": 0}).sort("date", -1):
        if "date" in c and isinstance(c["date"], datetime):
            c["date"] = c["date"].isoformat()
        credits.append(c)
    
    notes = []
    async for n in db.farmer_notes.find({"farmer_id": farmer_id}, {"_id": 0}).sort("created_at", -1):
        if "created_at" in n and isinstance(n["created_at"], datetime):
            n["created_at"] = n["created_at"].isoformat()
        notes.append(n)
    
    farmer["visits"] = visits
    farmer["credits"] = credits
    farmer["notes"] = notes
    return farmer

@app.post("/api/farmers/{farmer_id}/notes")
async def add_farmer_note(farmer_id: str, req: FarmerNoteRequest, request: Request):
    user = await get_current_user(request)
    note = {
        "farmer_id": farmer_id,
        "note": req.note,
        "created_by": user.get("name", "Unknown"),
        "created_at": datetime.now(timezone.utc)
    }
    await db.farmer_notes.insert_one(note)
    return {"message": "Note added"}

# ========================= INVENTORY =========================

@app.get("/api/inventory")
async def get_inventory(request: Request):
    await get_current_user(request)
    products = []
    async for p in db.inventory.find({}, {"_id": 0}):
        products.append(p)
    return products

@app.get("/api/inventory/stats")
async def inventory_stats(request: Request):
    await get_current_user(request)
    total = await db.inventory.count_documents({})
    low = await db.inventory.count_documents({"status": "Low"})
    reorder = await db.inventory.count_documents({"status": "Reorder"})
    total_value = 0
    async for p in db.inventory.find({}, {"stock": 1, "price": 1}):
        total_value += p.get("stock", 0) * p.get("price", 0)
    return {"total_products": total, "low_stock": low, "reorder_needed": reorder, "total_value": round(total_value, 2)}

@app.post("/api/inventory")
async def add_product(req: ProductRequest, request: Request):
    user = await get_current_user(request)
    if user.get("role") != "dealer":
        raise HTTPException(status_code=403, detail="Only dealers can add products")
    product = {
        "id": f"PRD-{secrets.token_hex(4).upper()}",
        "name": req.name,
        "category": req.category,
        "stock": req.stock,
        "max_stock": req.stock * 2,
        "price": req.price,
        "status": req.status,
        "variants": []
    }
    await db.inventory.insert_one(product)
    return {"message": "Product added", "id": product["id"]}

# ========================= CREDIT / UDHAAR =========================

@app.get("/api/credits")
async def get_credits(request: Request, tab: str = "all"):
    await get_current_user(request)
    query = {}
    if tab == "overdue":
        query["days_overdue"] = {"$gte": 30}
    credits = []
    async for c in db.credits.find(query, {"_id": 0}).sort("amount_due", -1):
        credits.append(c)
    return credits

@app.get("/api/credits/stats")
async def credit_stats(request: Request):
    await get_current_user(request)
    total_exposure = 0
    overdue_count = 0
    collections_week = 0
    total_delay = 0
    count = 0
    async for c in db.credits.find({}):
        total_exposure += c.get("amount_due", 0) - c.get("amount_paid", 0)
        if c.get("days_overdue", 0) >= 30:
            overdue_count += 1
        total_delay += c.get("days_overdue", 0)
        count += 1
    
    async for p in db.payments.find({"date": {"$gte": datetime.now(timezone.utc) - timedelta(days=7)}}):
        collections_week += p.get("amount", 0)
    
    avg_delay = round(total_delay / max(count, 1))
    return {"total_exposure": round(total_exposure, 2), "overdue_count": overdue_count, "collections_week": round(collections_week, 2), "average_delay": avg_delay}

@app.post("/api/credits/payment")
async def record_payment(req: PaymentRequest, request: Request):
    user = await get_current_user(request)
    payment = {
        "farmer_id": req.farmer_id,
        "amount": req.amount,
        "mode": req.mode,
        "note": req.note,
        "recorded_by": user.get("name"),
        "date": datetime.now(timezone.utc)
    }
    await db.payments.insert_one(payment)
    await db.credits.update_one(
        {"farmer_id": req.farmer_id},
        {"$inc": {"amount_paid": req.amount}}
    )
    return {"message": "Payment recorded"}

# ========================= ANALYTICS =========================

@app.get("/api/analytics/sales")
async def analytics_sales(request: Request, period: str = "month"):
    await get_current_user(request)
    sales = []
    async for s in db.sales_records.find({}, {"_id": 0}).sort("date", 1):
        if "date" in s and isinstance(s["date"], datetime):
            s["date"] = s["date"].isoformat()
        sales.append(s)
    return sales

@app.get("/api/analytics/farmer-growth")
async def farmer_growth(request: Request):
    await get_current_user(request)
    growth = []
    async for g in db.farmer_growth.find({}, {"_id": 0}).sort("month", 1):
        growth.append(g)
    return growth

@app.get("/api/analytics/collections")
async def collections_rate(request: Request):
    await get_current_user(request)
    total_due = 0
    total_paid = 0
    async for c in db.credits.find({}):
        total_due += c.get("amount_due", 0)
        total_paid += c.get("amount_paid", 0)
    collected_pct = round((total_paid / max(total_due, 1)) * 100)
    return {"collected": collected_pct, "pending": 100 - collected_pct, "total_due": total_due, "total_paid": total_paid}

@app.get("/api/analytics/inventory-breakdown")
async def inventory_breakdown(request: Request):
    await get_current_user(request)
    breakdown = {}
    async for p in db.inventory.find({}, {"category": 1, "stock": 1, "price": 1}):
        cat = p.get("category", "Other")
        breakdown[cat] = breakdown.get(cat, 0) + p.get("stock", 0) * p.get("price", 0)
    return [{"category": k, "value": round(v, 2)} for k, v in breakdown.items()]

@app.get("/api/analytics/map-data")
async def map_data(request: Request):
    await get_current_user(request)
    farmers = []
    async for f in db.farmers.find({"lat": {"$exists": True}}, {"_id": 0, "name": 1, "village": 1, "lat": 1, "lng": 1, "crop_cycle": 1}):
        farmers.append(f)
    return farmers

# ========================= AI CHAT =========================

@app.get("/api/chat/sessions")
async def get_chat_sessions(request: Request):
    user = await get_current_user(request)
    sessions = []
    async for s in db.chat_sessions.find({"user_id": user["_id"]}, {"_id": 0}).sort("updated_at", -1):
        if "updated_at" in s and isinstance(s["updated_at"], datetime):
            s["updated_at"] = s["updated_at"].isoformat()
        if "created_at" in s and isinstance(s["created_at"], datetime):
            s["created_at"] = s["created_at"].isoformat()
        sessions.append(s)
    return sessions

class ChatMessage(BaseModel):
    session_id: Optional[str] = None
    message: str
    language: str = "en"

MOCK_RESPONSES = {
    "en": [
        "Based on the soil conditions you described, I recommend applying DAP fertilizer at 50kg per acre before sowing. This will boost phosphorus levels for better root development.",
        "For cotton crops in this season, watch out for bollworm infestations. Consider applying neem-based pesticide as a preventive measure every 15 days.",
        "The weather forecast indicates light rainfall in the next 3 days. I'd suggest delaying the urea application until after the rain for better absorption.",
        "Your wheat crop appears to be in the tillering stage. This is the right time to apply first dose of nitrogen. Use 25-30 kg urea per acre.",
        "Considering the current market trends, soybean prices are expected to rise by 8-12% in the next quarter. You might want to advise your farmers to hold their stock."
    ],
    "hi": [
        "आपने जो मिट्टी की स्थिति बताई है, उसके आधार पर मैं बुवाई से पहले 50 किलो प्रति एकड़ DAP खाद डालने की सिफारिश करता हूं।",
        "इस मौसम में कपास की फसल के लिए, बॉलवर्म के संक्रमण से सावधान रहें। हर 15 दिन में नीम आधारित कीटनाशक लगाने पर विचार करें।",
        "मौसम पूर्वानुमान अगले 3 दिनों में हल्की बारिश का संकेत देता है। बेहतर अवशोषण के लिए बारिश के बाद तक यूरिया का प्रयोग स्थगित करें।"
    ],
    "mr": [
        "तुम्ही सांगितलेल्या मातीच्या स्थितीनुसार, पेरणीपूर्वी एकरी 50 किलो DAP खत टाकण्याची मी शिफारस करतो.",
        "या हंगामात कापसाच्या पिकासाठी, बोंडअळीच्या प्रादुर्भावापासून सावध राहा. दर 15 दिवसांनी कडुनिंबावर आधारित कीटकनाशक फवारणी करा."
    ],
    "gu": [
        "તમે વર્ણવેલ માટીની સ્થિતિના આધારે, હું વાવણી પહેલાં એકર દીઠ 50 કિલો DAP ખાતર નાખવાની ભલામણ કરું છું.",
        "આ સીઝનમાં કપાસના પાક માટે, બોલવોર્મના ઉપદ્રવથી સાવચેત રહો. દર 15 દિવસે લીમડા આધારિત જંતુનાશકનો ઉપયોગ કરો."
    ],
    "rj": [
        "आपां बतायी माटी री हालत कै हिसाब सूं, बुवाई सूं पहलां 50 किलो एकड़ DAP खाद डालण री सिफारिश करूं।",
        "आ मौसम में कपास री फसल खातर, बॉलवर्म सूं चेत्यो रहो। 15-15 दिन में नीम वाळो कीटनाशक छिड़को।"
    ]
}

@app.post("/api/chat/send")
async def send_chat(req: ChatMessage, request: Request):
    user = await get_current_user(request)
    import random
    
    session_id = req.session_id
    if not session_id:
        session_id = f"sess-{secrets.token_hex(6)}"
        await db.chat_sessions.insert_one({
            "id": session_id,
            "user_id": user["_id"],
            "title": req.message[:40],
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        })
    
    await db.chat_messages.insert_one({
        "session_id": session_id,
        "role": "user",
        "content": req.message,
        "language": req.language,
        "timestamp": datetime.now(timezone.utc)
    })
    
    lang = req.language if req.language in MOCK_RESPONSES else "en"
    ai_response = random.choice(MOCK_RESPONSES[lang])
    
    await db.chat_messages.insert_one({
        "session_id": session_id,
        "role": "assistant",
        "content": ai_response,
        "language": req.language,
        "timestamp": datetime.now(timezone.utc)
    })
    
    await db.chat_sessions.update_one(
        {"id": session_id},
        {"$set": {"updated_at": datetime.now(timezone.utc)}}
    )
    
    return {"session_id": session_id, "response": ai_response}

@app.get("/api/chat/messages/{session_id}")
async def get_chat_messages(session_id: str, request: Request):
    await get_current_user(request)
    messages = []
    async for m in db.chat_messages.find({"session_id": session_id}, {"_id": 0}).sort("timestamp", 1):
        if "timestamp" in m and isinstance(m["timestamp"], datetime):
            m["timestamp"] = m["timestamp"].isoformat()
        messages.append(m)
    return messages

# ========================= SETTINGS =========================

@app.get("/api/settings/profile")
async def get_profile(request: Request):
    user = await get_current_user(request)
    return {
        "name": user.get("name"),
        "email": user.get("email"),
        "role": user.get("role"),
        "phone": user.get("phone", ""),
        "shop_name": user.get("shop_name", "Prithvix Agri Center"),
        "location": user.get("location", "Nashik, Maharashtra")
    }

@app.get("/api/settings/staff")
async def get_staff(request: Request):
    user = await get_current_user(request)
    if user.get("role") != "dealer":
        raise HTTPException(status_code=403, detail="Only dealers can view staff")
    staff = []
    async for s in db.users.find({"role": "staff"}, {"_id": 0, "password_hash": 0}):
        staff.append(s)
    return staff

@app.get("/api/settings/subscription")
async def get_subscription(request: Request):
    await get_current_user(request)
    return {
        "plan": "Professional",
        "status": "Active",
        "renewal_date": "2026-06-15",
        "features": ["Unlimited Farmers", "AI Agronomist", "Credit Management", "Analytics Dashboard", "Staff Accounts (5)", "Priority Support"]
    }

# ========================= SEED DATA =========================

async def seed_data():
    # Seed users
    dealer_email = os.environ.get("ADMIN_EMAIL", "dealer@prithvix.com")
    dealer_pass = os.environ.get("ADMIN_PASSWORD", "dealer123")
    staff_user = os.environ.get("STAFF_USERNAME", "staff01")
    staff_pass = os.environ.get("STAFF_PASSWORD", "staff123")
    
    existing = await db.users.find_one({"email": dealer_email})
    if not existing:
        await db.users.insert_one({
            "email": dealer_email,
            "password_hash": hash_password(dealer_pass),
            "name": "Rajesh Patel",
            "role": "dealer",
            "phone": "+91 98765 43210",
            "shop_name": "Patel Agri Center",
            "location": "Nashik, Maharashtra",
            "created_at": datetime.now(timezone.utc)
        })
    elif not verify_password(dealer_pass, existing["password_hash"]):
        await db.users.update_one({"email": dealer_email}, {"$set": {"password_hash": hash_password(dealer_pass)}})
    
    existing_staff = await db.users.find_one({"username": staff_user})
    if not existing_staff:
        await db.users.insert_one({
            "username": staff_user,
            "password_hash": hash_password(staff_pass),
            "name": "Amit Kumar",
            "role": "staff",
            "phone": "+91 87654 32109",
            "created_at": datetime.now(timezone.utc)
        })
    elif not verify_password(staff_pass, existing_staff["password_hash"]):
        await db.users.update_one({"username": staff_user}, {"$set": {"password_hash": hash_password(staff_pass)}})
    
    # Seed farmers
    if await db.farmers.count_documents({}) == 0:
        farmers = [
            {"id": "F001", "name": "Ramesh Sharma", "village": "Sinnar", "mobile": "+91 94221 45678", "loyalty_tier": "Gold", "crop_cycle": "Kharif", "credit_status": "Clear", "total_visits": 24, "outstanding": 0, "avatar_idx": 1, "lat": 19.8496, "lng": 73.9981, "registered_at": datetime(2025, 3, 15, tzinfo=timezone.utc)},
            {"id": "F002", "name": "Sunita Jadhav", "village": "Dindori", "mobile": "+91 98765 12345", "loyalty_tier": "Silver", "crop_cycle": "Rabi", "credit_status": "Due", "total_visits": 18, "outstanding": 12500, "avatar_idx": 0, "lat": 20.2053, "lng": 73.7256, "registered_at": datetime(2025, 5, 20, tzinfo=timezone.utc)},
            {"id": "F003", "name": "Prakash Deshmukh", "village": "Niphad", "mobile": "+91 77889 90011", "loyalty_tier": "Gold", "crop_cycle": "Kharif", "credit_status": "Overdue", "total_visits": 31, "outstanding": 28000, "avatar_idx": 2, "lat": 20.0789, "lng": 74.1083, "registered_at": datetime(2024, 11, 10, tzinfo=timezone.utc)},
            {"id": "F004", "name": "Meena Patil", "village": "Chandwad", "mobile": "+91 88990 12345", "loyalty_tier": "Bronze", "crop_cycle": "Rabi", "credit_status": "Clear", "total_visits": 7, "outstanding": 0, "avatar_idx": 0, "lat": 20.3267, "lng": 74.2467, "registered_at": datetime(2025, 8, 5, tzinfo=timezone.utc)},
            {"id": "F005", "name": "Ganesh Wagh", "village": "Yeola", "mobile": "+91 99887 76655", "loyalty_tier": "Silver", "crop_cycle": "Kharif", "credit_status": "Due", "total_visits": 15, "outstanding": 8500, "avatar_idx": 3, "lat": 20.0428, "lng": 74.4889, "registered_at": datetime(2025, 6, 12, tzinfo=timezone.utc)},
            {"id": "F006", "name": "Anita Gaikwad", "village": "Malegaon", "mobile": "+91 77665 54433", "loyalty_tier": "Gold", "crop_cycle": "Rabi", "credit_status": "Due", "total_visits": 22, "outstanding": 15000, "avatar_idx": 0, "lat": 20.5548, "lng": 74.5247, "registered_at": datetime(2025, 1, 8, tzinfo=timezone.utc)},
            {"id": "F007", "name": "Vijay Kale", "village": "Surgana", "mobile": "+91 88776 65544", "loyalty_tier": "Bronze", "crop_cycle": "Kharif", "credit_status": "Overdue", "total_visits": 9, "outstanding": 42000, "avatar_idx": 1, "lat": 20.5333, "lng": 73.6333, "registered_at": datetime(2025, 4, 22, tzinfo=timezone.utc)},
            {"id": "F008", "name": "Laxmi Bhosale", "village": "Peth", "mobile": "+91 99001 12233", "loyalty_tier": "Silver", "crop_cycle": "Rabi", "credit_status": "Clear", "total_visits": 14, "outstanding": 0, "avatar_idx": 0, "lat": 20.2333, "lng": 73.6833, "registered_at": datetime(2025, 7, 18, tzinfo=timezone.utc)},
            {"id": "F009", "name": "Ashok Thorat", "village": "Trimbak", "mobile": "+91 81234 56789", "loyalty_tier": "Gold", "crop_cycle": "Kharif", "credit_status": "Due", "total_visits": 27, "outstanding": 5000, "avatar_idx": 2, "lat": 19.9321, "lng": 73.5289, "registered_at": datetime(2025, 2, 14, tzinfo=timezone.utc)},
            {"id": "F010", "name": "Kavita More", "village": "Igatpuri", "mobile": "+91 70012 34567", "loyalty_tier": "Bronze", "crop_cycle": "Rabi", "credit_status": "Clear", "total_visits": 5, "outstanding": 0, "avatar_idx": 0, "lat": 19.6959, "lng": 73.5619, "registered_at": datetime(2025, 9, 1, tzinfo=timezone.utc)},
            {"id": "F011", "name": "Suresh Nikam", "village": "Baglan", "mobile": "+91 92345 67890", "loyalty_tier": "Silver", "crop_cycle": "Kharif", "credit_status": "Overdue", "total_visits": 19, "outstanding": 35000, "avatar_idx": 3, "lat": 20.5667, "lng": 74.0167, "registered_at": datetime(2025, 3, 30, tzinfo=timezone.utc)},
            {"id": "F012", "name": "Rekha Chavan", "village": "Satana", "mobile": "+91 85678 90123", "loyalty_tier": "Gold", "crop_cycle": "Rabi", "credit_status": "Due", "total_visits": 20, "outstanding": 11000, "avatar_idx": 0, "lat": 20.5953, "lng": 74.2356, "registered_at": datetime(2025, 5, 6, tzinfo=timezone.utc)},
        ]
        await db.farmers.insert_many(farmers)
    
    # Seed farmer visits
    if await db.farmer_visits.count_documents({}) == 0:
        visits = [
            {"farmer_id": "F001", "date": datetime(2025, 12, 10, tzinfo=timezone.utc), "type": "Purchase", "notes": "Bought DAP 50kg, Urea 25kg", "amount": 4500},
            {"farmer_id": "F001", "date": datetime(2025, 12, 5, tzinfo=timezone.utc), "type": "Consultation", "notes": "Discussed cotton crop management", "amount": 0},
            {"farmer_id": "F002", "date": datetime(2025, 12, 8, tzinfo=timezone.utc), "type": "Purchase", "notes": "Seeds - Hybrid Wheat BH-393", "amount": 3200},
            {"farmer_id": "F003", "date": datetime(2025, 11, 28, tzinfo=timezone.utc), "type": "Credit Purchase", "notes": "Pesticide + Fertilizer combo", "amount": 8500},
            {"farmer_id": "F005", "date": datetime(2025, 12, 12, tzinfo=timezone.utc), "type": "Purchase", "notes": "Drip irrigation supplies", "amount": 12000},
            {"farmer_id": "F007", "date": datetime(2025, 11, 15, tzinfo=timezone.utc), "type": "Credit Purchase", "notes": "Seasonal agri inputs", "amount": 15000},
            {"farmer_id": "F009", "date": datetime(2025, 12, 11, tzinfo=timezone.utc), "type": "Consultation", "notes": "AI recommendation for soil treatment", "amount": 0},
            {"farmer_id": "F011", "date": datetime(2025, 12, 1, tzinfo=timezone.utc), "type": "Credit Purchase", "notes": "Bulk fertilizer order", "amount": 22000},
        ]
        await db.farmer_visits.insert_many(visits)
    
    # Seed credits
    if await db.credits.count_documents({}) == 0:
        credits_data = [
            {"farmer_id": "F002", "farmer_name": "Sunita Jadhav", "amount_due": 12500, "amount_paid": 0, "days_overdue": 15, "status": "Pending", "date": datetime(2025, 11, 25, tzinfo=timezone.utc)},
            {"farmer_id": "F003", "farmer_name": "Prakash Deshmukh", "amount_due": 28000, "amount_paid": 0, "days_overdue": 45, "status": "Overdue", "date": datetime(2025, 10, 30, tzinfo=timezone.utc)},
            {"farmer_id": "F005", "farmer_name": "Ganesh Wagh", "amount_due": 8500, "amount_paid": 0, "days_overdue": 10, "status": "Pending", "date": datetime(2025, 12, 2, tzinfo=timezone.utc)},
            {"farmer_id": "F006", "farmer_name": "Anita Gaikwad", "amount_due": 15000, "amount_paid": 0, "days_overdue": 22, "status": "Pending", "date": datetime(2025, 11, 18, tzinfo=timezone.utc)},
            {"farmer_id": "F007", "farmer_name": "Vijay Kale", "amount_due": 42000, "amount_paid": 0, "days_overdue": 60, "status": "Overdue", "date": datetime(2025, 10, 15, tzinfo=timezone.utc)},
            {"farmer_id": "F009", "farmer_name": "Ashok Thorat", "amount_due": 5000, "amount_paid": 0, "days_overdue": 5, "status": "Pending", "date": datetime(2025, 12, 8, tzinfo=timezone.utc)},
            {"farmer_id": "F011", "farmer_name": "Suresh Nikam", "amount_due": 35000, "amount_paid": 0, "days_overdue": 38, "status": "Overdue", "date": datetime(2025, 11, 5, tzinfo=timezone.utc)},
            {"farmer_id": "F012", "farmer_name": "Rekha Chavan", "amount_due": 11000, "amount_paid": 0, "days_overdue": 18, "status": "Pending", "date": datetime(2025, 11, 22, tzinfo=timezone.utc)},
        ]
        await db.credits.insert_many(credits_data)
    
    # Seed inventory
    if await db.inventory.count_documents({}) == 0:
        products = [
            {"id": "PRD-001", "name": "DAP Fertilizer", "category": "Fertilizer", "stock": 450, "max_stock": 800, "price": 1350, "status": "Healthy", "variants": [{"sku": "DAP-25KG", "weight": "25 kg", "stock": 250}, {"sku": "DAP-50KG", "weight": "50 kg", "stock": 200}]},
            {"id": "PRD-002", "name": "Urea", "category": "Fertilizer", "stock": 120, "max_stock": 600, "price": 267, "status": "Low", "variants": [{"sku": "UREA-25KG", "weight": "25 kg", "stock": 80}, {"sku": "UREA-50KG", "weight": "50 kg", "stock": 40}]},
            {"id": "PRD-003", "name": "Hybrid Cotton Seeds BT-2", "category": "Seeds", "stock": 85, "max_stock": 200, "price": 850, "status": "Healthy", "variants": [{"sku": "CSBT2-450G", "weight": "450g", "stock": 85}]},
            {"id": "PRD-004", "name": "Neem Pesticide", "category": "Pesticide", "stock": 30, "max_stock": 150, "price": 520, "status": "Reorder", "variants": [{"sku": "NP-1L", "volume": "1L", "stock": 20}, {"sku": "NP-5L", "volume": "5L", "stock": 10}]},
            {"id": "PRD-005", "name": "Wheat Seeds HD-2967", "category": "Seeds", "stock": 200, "max_stock": 400, "price": 2200, "status": "Healthy", "variants": [{"sku": "WH-10KG", "weight": "10 kg", "stock": 120}, {"sku": "WH-25KG", "weight": "25 kg", "stock": 80}]},
            {"id": "PRD-006", "name": "Micronutrient Mix", "category": "Fertilizer", "stock": 45, "max_stock": 200, "price": 680, "status": "Low", "variants": [{"sku": "MM-1KG", "weight": "1 kg", "stock": 45}]},
            {"id": "PRD-007", "name": "Drip Irrigation Kit", "category": "Equipment", "stock": 15, "max_stock": 50, "price": 8500, "status": "Healthy", "variants": [{"sku": "DIK-HALF", "area": "0.5 acre", "stock": 10}, {"sku": "DIK-FULL", "area": "1 acre", "stock": 5}]},
            {"id": "PRD-008", "name": "Chlorpyrifos 20% EC", "category": "Pesticide", "stock": 8, "max_stock": 100, "price": 450, "status": "Reorder", "variants": [{"sku": "CP-500ML", "volume": "500ml", "stock": 5}, {"sku": "CP-1L", "volume": "1L", "stock": 3}]},
            {"id": "PRD-009", "name": "Soybean Seeds JS-335", "category": "Seeds", "stock": 350, "max_stock": 500, "price": 4500, "status": "Healthy", "variants": [{"sku": "SB-30KG", "weight": "30 kg", "stock": 350}]},
            {"id": "PRD-010", "name": "Potash (MOP)", "category": "Fertilizer", "stock": 180, "max_stock": 400, "price": 1700, "status": "Healthy", "variants": [{"sku": "MOP-50KG", "weight": "50 kg", "stock": 180}]},
        ]
        await db.inventory.insert_many(products)
    
    # Seed activities
    if await db.activities.count_documents({}) == 0:
        activities = [
            {"type": "registration", "message": "New farmer Kavita More registered from Igatpuri", "timestamp": datetime(2025, 12, 12, 14, 30, tzinfo=timezone.utc)},
            {"type": "payment", "message": "Payment of Rs 5,000 received from Ashok Thorat", "timestamp": datetime(2025, 12, 12, 13, 15, tzinfo=timezone.utc)},
            {"type": "visit", "message": "Field visit completed for Ganesh Wagh in Yeola", "timestamp": datetime(2025, 12, 12, 11, 45, tzinfo=timezone.utc)},
            {"type": "sale", "message": "DAP Fertilizer (50kg x 5) sold to Ramesh Sharma", "timestamp": datetime(2025, 12, 12, 10, 20, tzinfo=timezone.utc)},
            {"type": "alert", "message": "Low stock alert: Neem Pesticide below reorder level", "timestamp": datetime(2025, 12, 12, 9, 0, tzinfo=timezone.utc)},
            {"type": "credit", "message": "New credit of Rs 15,000 issued to Vijay Kale", "timestamp": datetime(2025, 12, 11, 16, 30, tzinfo=timezone.utc)},
            {"type": "registration", "message": "New farmer Laxmi Bhosale registered from Peth", "timestamp": datetime(2025, 12, 11, 14, 0, tzinfo=timezone.utc)},
            {"type": "ai", "message": "AI recommendation generated for cotton pest management", "timestamp": datetime(2025, 12, 11, 11, 20, tzinfo=timezone.utc)},
        ]
        await db.activities.insert_many(activities)
    
    # Seed sales records for analytics
    if await db.sales_records.count_documents({}) == 0:
        import random
        sales = []
        base = datetime(2025, 7, 1, tzinfo=timezone.utc)
        for i in range(180):
            d = base + timedelta(days=i)
            sales.append({
                "date": d,
                "revenue": random.randint(8000, 45000),
                "transactions": random.randint(3, 15),
                "category": random.choice(["Fertilizer", "Seeds", "Pesticide", "Equipment"])
            })
        await db.sales_records.insert_many(sales)
    
    # Seed farmer growth data
    if await db.farmer_growth.count_documents({}) == 0:
        growth = [
            {"month": "Jul", "count": 45}, {"month": "Aug", "count": 52},
            {"month": "Sep", "count": 61}, {"month": "Oct", "count": 68},
            {"month": "Nov", "count": 79}, {"month": "Dec", "count": 88},
        ]
        await db.farmer_growth.insert_many(growth)
    
    # Seed chat sessions
    if await db.chat_sessions.count_documents({}) == 0:
        dealer = await db.users.find_one({"role": "dealer"})
        if dealer:
            sessions = [
                {"id": "sess-abc123", "user_id": str(dealer["_id"]), "title": "Cotton pest management advice", "created_at": datetime(2025, 12, 10, tzinfo=timezone.utc), "updated_at": datetime(2025, 12, 10, tzinfo=timezone.utc)},
                {"id": "sess-def456", "user_id": str(dealer["_id"]), "title": "Wheat sowing recommendations", "created_at": datetime(2025, 12, 8, tzinfo=timezone.utc), "updated_at": datetime(2025, 12, 8, tzinfo=timezone.utc)},
            ]
            await db.chat_sessions.insert_many(sessions)
    
    # Create indexes
    await db.users.create_index("email", unique=True, sparse=True)
    await db.users.create_index("username", unique=True, sparse=True)
    await db.farmers.create_index("id", unique=True)
    await db.credits.create_index("farmer_id")
    await db.inventory.create_index("id", unique=True)

@app.on_event("startup")
async def startup():
    await seed_data()
    # Write test credentials
    os.makedirs("/app/memory", exist_ok=True)
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write("# Test Credentials\n\n")
        f.write("## Dealer Login\n")
        f.write(f"- Email: {os.environ.get('ADMIN_EMAIL', 'dealer@prithvix.com')}\n")
        f.write(f"- Password: {os.environ.get('ADMIN_PASSWORD', 'dealer123')}\n")
        f.write("- Role: dealer\n\n")
        f.write("## Staff Login\n")
        f.write(f"- Username: {os.environ.get('STAFF_USERNAME', 'staff01')}\n")
        f.write(f"- Password: {os.environ.get('STAFF_PASSWORD', 'staff123')}\n")
        f.write("- Role: staff\n\n")
        f.write("## Auth Endpoints\n")
        f.write("- POST /api/auth/login\n")
        f.write("- GET /api/auth/me\n")
        f.write("- POST /api/auth/logout\n")

@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "Prithvix ERP API"}
