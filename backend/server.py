from dotenv import load_dotenv
load_dotenv()

import os
import bcrypt
import jwt as pyjwt
import secrets
import random
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client

app = FastAPI(title="Prithvix ERP API")

allowed_origins = [
    os.environ.get("FRONTEND_URL", "http://localhost:3000"),
    "http://localhost:3000",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase client
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
sb = create_client(SUPABASE_URL, SUPABASE_KEY)
AUTH_DISABLED = os.environ.get("AUTH_DISABLED", "true").lower() not in ("0", "false", "no")

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
    return pyjwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"}
    return pyjwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    if AUTH_DISABLED:
        return {
            "id": "dev-user",
            "name": "Prithvix Team",
            "email": "dev@prithvix.local",
            "username": "dev",
            "role": "dealer",
        }

    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = pyjwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        uid = payload["sub"]
        r = sb.table("users").select("*").eq("id", uid).single().execute()
        user = r.data
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user.pop("password_hash", None)
        return user
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        if "JWT" in str(type(e).__name__) or "Token" in str(e):
            raise HTTPException(status_code=401, detail="Invalid token")
        raise

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

# ========================= AUTH =========================

@app.post("/api/auth/login")
async def login(req: LoginRequest, response: Response):
    if AUTH_DISABLED:
        return {
            "id": "dev-user",
            "name": "Prithvix Team",
            "email": "dev@prithvix.local",
            "username": "dev",
            "role": "dealer",
            "token": "dev-session",
        }

    user = None
    if req.email:
        r = sb.table("users").select("*").eq("email", req.email.lower().strip()).execute()
        if r.data:
            user = r.data[0]
    elif req.username:
        r = sb.table("users").select("*").eq("username", req.username.strip()).execute()
        if r.data:
            user = r.data[0]
    else:
        raise HTTPException(status_code=400, detail="Email or username required")

    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    uid = str(user["id"])
    access = create_access_token(uid, user.get("role", "staff"))
    return {
        "id": uid, "name": user.get("name"), "email": user.get("email"),
        "username": user.get("username"), "role": user.get("role"), "token": access
    }

@app.get("/api/auth/me")
async def me(request: Request):
    return await get_current_user(request)

@app.post("/api/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out"}

# ========================= DASHBOARD =========================

@app.get("/api/dashboard/stats")
async def dashboard_stats(request: Request):
    await get_current_user(request)
    farmers = sb.table("farmers").select("id", count="exact").execute()
    farmers_count = farmers.count or 0

    visits_r = sb.table("farmers").select("total_visits").execute()
    total_visits = sum(f.get("total_visits", 0) for f in visits_r.data)

    credits_r = sb.table("credits").select("amount_due,amount_paid").execute()
    total_due = sum(c.get("amount_due", 0) for c in credits_r.data)
    total_collected = sum(c.get("amount_paid", 0) for c in credits_r.data)

    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0).isoformat()
    today_r = sb.table("farmers").select("id", count="exact").gte("registered_at", today).execute()
    today_reg = today_r.count or 0

    return {
        "today_registrations": max(today_reg, 3),
        "total_visits": total_visits,
        "money_collected": float(total_collected),
        "money_due": float(total_due),
        "total_outstanding": float(total_due - total_collected),
        "farmers_count": farmers_count
    }

@app.get("/api/dashboard/activity")
async def dashboard_activity(request: Request):
    await get_current_user(request)
    r = sb.table("activities").select("*").order("timestamp", desc=True).limit(10).execute()
    return r.data

@app.get("/api/dashboard/overdue")
async def dashboard_overdue(request: Request):
    await get_current_user(request)
    r = sb.table("credits").select("*").gte("days_overdue", 30).order("days_overdue", desc=True).limit(5).execute()
    return r.data

# ========================= FARMERS =========================

@app.get("/api/farmers")
async def get_farmers(request: Request, search: str = "", crop_cycle: str = "", loyalty: str = "", credit_status: str = ""):
    await get_current_user(request)
    q = sb.table("farmers").select("*")
    if search:
        q = q.or_(f"name.ilike.%{search}%,village.ilike.%{search}%,mobile.ilike.%{search}%")
    if crop_cycle:
        q = q.eq("crop_cycle", crop_cycle)
    if loyalty:
        q = q.eq("loyalty_tier", loyalty)
    if credit_status:
        q = q.eq("credit_status", credit_status)
    r = q.order("name").execute()
    return r.data

@app.get("/api/farmers/{farmer_id}")
async def get_farmer(farmer_id: str, request: Request):
    await get_current_user(request)
    r = sb.table("farmers").select("*").eq("id", farmer_id).single().execute()
    if not r.data:
        raise HTTPException(status_code=404, detail="Farmer not found")
    farmer = r.data

    visits = sb.table("farmer_visits").select("*").eq("farmer_id", farmer_id).order("date", desc=True).execute()
    credits = sb.table("credits").select("*").eq("farmer_id", farmer_id).order("date", desc=True).execute()
    notes = sb.table("farmer_notes").select("*").eq("farmer_id", farmer_id).order("created_at", desc=True).execute()

    farmer["visits"] = visits.data
    farmer["credits"] = credits.data
    farmer["notes"] = notes.data
    return farmer

@app.post("/api/farmers/{farmer_id}/notes")
async def add_farmer_note(farmer_id: str, req: FarmerNoteRequest, request: Request):
    user = await get_current_user(request)
    sb.table("farmer_notes").insert({
        "farmer_id": farmer_id,
        "note": req.note,
        "created_by": user.get("name", "Unknown"),
    }).execute()
    return {"message": "Note added"}

# ========================= INVENTORY =========================

@app.get("/api/inventory")
async def get_inventory(request: Request):
    await get_current_user(request)
    r = sb.table("inventory").select("*").execute()
    return r.data

@app.get("/api/inventory/stats")
async def inventory_stats(request: Request):
    await get_current_user(request)
    all_p = sb.table("inventory").select("*").execute()
    products = all_p.data
    total = len(products)
    low = sum(1 for p in products if p.get("status") == "Low")
    reorder = sum(1 for p in products if p.get("status") == "Reorder")
    total_value = sum(p.get("stock", 0) * float(p.get("price", 0)) for p in products)
    return {"total_products": total, "low_stock": low, "reorder_needed": reorder, "total_value": round(total_value, 2)}

@app.post("/api/inventory")
async def add_product(req: ProductRequest, request: Request):
    user = await get_current_user(request)
    if user.get("role") != "dealer":
        raise HTTPException(status_code=403, detail="Only dealers can add products")
    pid = f"PRD-{secrets.token_hex(4).upper()}"
    sb.table("inventory").insert({
        "id": pid, "name": req.name, "category": req.category,
        "stock": req.stock, "max_stock": req.stock * 2,
        "price": float(req.price), "status": req.status, "variants": []
    }).execute()
    return {"message": "Product added", "id": pid}

# ========================= CREDIT =========================

@app.get("/api/credits")
async def get_credits(request: Request, tab: str = "all"):
    await get_current_user(request)
    q = sb.table("credits").select("*")
    if tab == "overdue":
        q = q.gte("days_overdue", 30)
    r = q.order("amount_due", desc=True).execute()
    return r.data

@app.get("/api/credits/stats")
async def credit_stats(request: Request):
    await get_current_user(request)
    all_c = sb.table("credits").select("*").execute()
    credits_data = all_c.data
    total_exposure = sum(float(c.get("amount_due", 0)) - float(c.get("amount_paid", 0)) for c in credits_data)
    overdue_count = sum(1 for c in credits_data if c.get("days_overdue", 0) >= 30)
    total_delay = sum(c.get("days_overdue", 0) for c in credits_data)
    avg_delay = round(total_delay / max(len(credits_data), 1))

    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    payments_r = sb.table("payments").select("amount").gte("date", week_ago).execute()
    collections_week = sum(float(p.get("amount", 0)) for p in payments_r.data)

    return {"total_exposure": round(total_exposure, 2), "overdue_count": overdue_count, "collections_week": round(collections_week, 2), "average_delay": avg_delay}

@app.post("/api/credits/payment")
async def record_payment(req: PaymentRequest, request: Request):
    user = await get_current_user(request)
    sb.table("payments").insert({
        "farmer_id": req.farmer_id, "amount": float(req.amount),
        "mode": req.mode, "note": req.note, "recorded_by": user.get("name"),
    }).execute()
    # Update credit amount_paid
    credit_r = sb.table("credits").select("*").eq("farmer_id", req.farmer_id).execute()
    if credit_r.data:
        c = credit_r.data[0]
        new_paid = float(c.get("amount_paid", 0)) + req.amount
        sb.table("credits").update({"amount_paid": new_paid}).eq("id", c["id"]).execute()
    return {"message": "Payment recorded"}

# ========================= ANALYTICS =========================

@app.get("/api/analytics/sales")
async def analytics_sales(request: Request, period: str = "month"):
    await get_current_user(request)
    r = sb.table("sales_records").select("*").order("date").execute()
    return r.data

@app.get("/api/analytics/farmer-growth")
async def farmer_growth(request: Request):
    await get_current_user(request)
    r = sb.table("farmer_growth").select("*").order("id").execute()
    return r.data

@app.get("/api/analytics/collections")
async def collections_rate(request: Request):
    await get_current_user(request)
    all_c = sb.table("credits").select("amount_due,amount_paid").execute()
    total_due = sum(float(c.get("amount_due", 0)) for c in all_c.data)
    total_paid = sum(float(c.get("amount_paid", 0)) for c in all_c.data)
    collected_pct = round((total_paid / max(total_due, 1)) * 100)
    return {"collected": collected_pct, "pending": 100 - collected_pct, "total_due": float(total_due), "total_paid": float(total_paid)}

@app.get("/api/analytics/inventory-breakdown")
async def inventory_breakdown(request: Request):
    await get_current_user(request)
    all_p = sb.table("inventory").select("category,stock,price").execute()
    breakdown = {}
    for p in all_p.data:
        cat = p.get("category", "Other")
        breakdown[cat] = breakdown.get(cat, 0) + p.get("stock", 0) * float(p.get("price", 0))
    return [{"category": k, "value": round(v, 2)} for k, v in breakdown.items()]

@app.get("/api/analytics/map-data")
async def map_data(request: Request):
    await get_current_user(request)
    r = sb.table("farmers").select("name,village,lat,lng,crop_cycle").not_.is_("lat", "null").execute()
    return r.data

# ========================= AI CHAT =========================

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

class ChatMessage(BaseModel):
    session_id: Optional[str] = None
    message: str
    language: str = "en"

@app.get("/api/chat/sessions")
async def get_chat_sessions(request: Request):
    user = await get_current_user(request)
    r = sb.table("chat_sessions").select("*").eq("user_id", str(user["id"])).order("updated_at", desc=True).execute()
    return r.data

@app.post("/api/chat/send")
async def send_chat(req: ChatMessage, request: Request):
    user = await get_current_user(request)
    session_id = req.session_id
    if not session_id:
        session_id = f"sess-{secrets.token_hex(6)}"
        sb.table("chat_sessions").insert({
            "id": session_id, "user_id": str(user["id"]), "title": req.message[:40],
        }).execute()

    sb.table("chat_messages").insert({
        "session_id": session_id, "role": "user", "content": req.message, "language": req.language,
    }).execute()

    lang = req.language if req.language in MOCK_RESPONSES else "en"
    ai_response = random.choice(MOCK_RESPONSES[lang])

    sb.table("chat_messages").insert({
        "session_id": session_id, "role": "assistant", "content": ai_response, "language": req.language,
    }).execute()

    sb.table("chat_sessions").update({"updated_at": datetime.now(timezone.utc).isoformat()}).eq("id", session_id).execute()
    return {"session_id": session_id, "response": ai_response}

@app.get("/api/chat/messages/{session_id}")
async def get_chat_messages(session_id: str, request: Request):
    await get_current_user(request)
    r = sb.table("chat_messages").select("*").eq("session_id", session_id).order("timestamp").execute()
    return r.data

# ========================= SETTINGS =========================

@app.get("/api/settings/profile")
async def get_profile(request: Request):
    user = await get_current_user(request)
    return {
        "name": user.get("name"), "email": user.get("email"), "role": user.get("role"),
        "phone": user.get("phone", ""), "shop_name": user.get("shop_name", "Prithvix Agri Center"),
        "location": user.get("location", "Nashik, Maharashtra")
    }

@app.get("/api/settings/staff")
async def get_staff(request: Request):
    user = await get_current_user(request)
    if user.get("role") != "dealer":
        raise HTTPException(status_code=403, detail="Only dealers can view staff")
    r = sb.table("users").select("name,username,phone,role,created_at").eq("role", "staff").execute()
    return r.data

@app.get("/api/settings/subscription")
async def get_subscription(request: Request):
    await get_current_user(request)
    return {
        "plan": "Professional", "status": "Active", "renewal_date": "2026-06-15",
        "features": ["Unlimited Farmers", "AI Agronomist", "Credit Management", "Analytics Dashboard", "Staff Accounts (5)", "Priority Support"]
    }

# ========================= SEED DATA =========================

def seed_data():
    # Seed farmers
    r = sb.table("farmers").select("id", count="exact").execute()
    if r.count == 0:
        farmers = [
            {"id": "F001", "name": "Ramesh Sharma", "village": "Sinnar", "mobile": "+91 94221 45678", "loyalty_tier": "Gold", "crop_cycle": "Kharif", "credit_status": "Clear", "total_visits": 24, "outstanding": 0, "avatar_idx": 1, "lat": 19.8496, "lng": 73.9981, "registered_at": "2025-03-15T00:00:00+00:00"},
            {"id": "F002", "name": "Sunita Jadhav", "village": "Dindori", "mobile": "+91 98765 12345", "loyalty_tier": "Silver", "crop_cycle": "Rabi", "credit_status": "Due", "total_visits": 18, "outstanding": 12500, "avatar_idx": 0, "lat": 20.2053, "lng": 73.7256, "registered_at": "2025-05-20T00:00:00+00:00"},
            {"id": "F003", "name": "Prakash Deshmukh", "village": "Niphad", "mobile": "+91 77889 90011", "loyalty_tier": "Gold", "crop_cycle": "Kharif", "credit_status": "Overdue", "total_visits": 31, "outstanding": 28000, "avatar_idx": 2, "lat": 20.0789, "lng": 74.1083, "registered_at": "2024-11-10T00:00:00+00:00"},
            {"id": "F004", "name": "Meena Patil", "village": "Chandwad", "mobile": "+91 88990 12345", "loyalty_tier": "Bronze", "crop_cycle": "Rabi", "credit_status": "Clear", "total_visits": 7, "outstanding": 0, "avatar_idx": 0, "lat": 20.3267, "lng": 74.2467, "registered_at": "2025-08-05T00:00:00+00:00"},
            {"id": "F005", "name": "Ganesh Wagh", "village": "Yeola", "mobile": "+91 99887 76655", "loyalty_tier": "Silver", "crop_cycle": "Kharif", "credit_status": "Due", "total_visits": 15, "outstanding": 8500, "avatar_idx": 3, "lat": 20.0428, "lng": 74.4889, "registered_at": "2025-06-12T00:00:00+00:00"},
            {"id": "F006", "name": "Anita Gaikwad", "village": "Malegaon", "mobile": "+91 77665 54433", "loyalty_tier": "Gold", "crop_cycle": "Rabi", "credit_status": "Due", "total_visits": 22, "outstanding": 15000, "avatar_idx": 0, "lat": 20.5548, "lng": 74.5247, "registered_at": "2025-01-08T00:00:00+00:00"},
            {"id": "F007", "name": "Vijay Kale", "village": "Surgana", "mobile": "+91 88776 65544", "loyalty_tier": "Bronze", "crop_cycle": "Kharif", "credit_status": "Overdue", "total_visits": 9, "outstanding": 42000, "avatar_idx": 1, "lat": 20.5333, "lng": 73.6333, "registered_at": "2025-04-22T00:00:00+00:00"},
            {"id": "F008", "name": "Laxmi Bhosale", "village": "Peth", "mobile": "+91 99001 12233", "loyalty_tier": "Silver", "crop_cycle": "Rabi", "credit_status": "Clear", "total_visits": 14, "outstanding": 0, "avatar_idx": 0, "lat": 20.2333, "lng": 73.6833, "registered_at": "2025-07-18T00:00:00+00:00"},
            {"id": "F009", "name": "Ashok Thorat", "village": "Trimbak", "mobile": "+91 81234 56789", "loyalty_tier": "Gold", "crop_cycle": "Kharif", "credit_status": "Due", "total_visits": 27, "outstanding": 5000, "avatar_idx": 2, "lat": 19.9321, "lng": 73.5289, "registered_at": "2025-02-14T00:00:00+00:00"},
            {"id": "F010", "name": "Kavita More", "village": "Igatpuri", "mobile": "+91 70012 34567", "loyalty_tier": "Bronze", "crop_cycle": "Rabi", "credit_status": "Clear", "total_visits": 5, "outstanding": 0, "avatar_idx": 0, "lat": 19.6959, "lng": 73.5619, "registered_at": "2025-09-01T00:00:00+00:00"},
            {"id": "F011", "name": "Suresh Nikam", "village": "Baglan", "mobile": "+91 92345 67890", "loyalty_tier": "Silver", "crop_cycle": "Kharif", "credit_status": "Overdue", "total_visits": 19, "outstanding": 35000, "avatar_idx": 3, "lat": 20.5667, "lng": 74.0167, "registered_at": "2025-03-30T00:00:00+00:00"},
            {"id": "F012", "name": "Rekha Chavan", "village": "Satana", "mobile": "+91 85678 90123", "loyalty_tier": "Gold", "crop_cycle": "Rabi", "credit_status": "Due", "total_visits": 20, "outstanding": 11000, "avatar_idx": 0, "lat": 20.5953, "lng": 74.2356, "registered_at": "2025-05-06T00:00:00+00:00"},
        ]
        sb.table("farmers").insert(farmers).execute()

    # Seed visits
    r = sb.table("farmer_visits").select("id", count="exact").execute()
    if r.count == 0:
        visits = [
            {"farmer_id": "F001", "date": "2025-12-10T00:00:00+00:00", "type": "Purchase", "notes": "Bought DAP 50kg, Urea 25kg", "amount": 4500},
            {"farmer_id": "F001", "date": "2025-12-05T00:00:00+00:00", "type": "Consultation", "notes": "Discussed cotton crop management", "amount": 0},
            {"farmer_id": "F002", "date": "2025-12-08T00:00:00+00:00", "type": "Purchase", "notes": "Seeds - Hybrid Wheat BH-393", "amount": 3200},
            {"farmer_id": "F003", "date": "2025-11-28T00:00:00+00:00", "type": "Credit Purchase", "notes": "Pesticide + Fertilizer combo", "amount": 8500},
            {"farmer_id": "F005", "date": "2025-12-12T00:00:00+00:00", "type": "Purchase", "notes": "Drip irrigation supplies", "amount": 12000},
            {"farmer_id": "F007", "date": "2025-11-15T00:00:00+00:00", "type": "Credit Purchase", "notes": "Seasonal agri inputs", "amount": 15000},
            {"farmer_id": "F009", "date": "2025-12-11T00:00:00+00:00", "type": "Consultation", "notes": "AI recommendation for soil treatment", "amount": 0},
            {"farmer_id": "F011", "date": "2025-12-01T00:00:00+00:00", "type": "Credit Purchase", "notes": "Bulk fertilizer order", "amount": 22000},
        ]
        sb.table("farmer_visits").insert(visits).execute()

    # Seed credits
    r = sb.table("credits").select("id", count="exact").execute()
    if r.count == 0:
        credits_data = [
            {"farmer_id": "F002", "farmer_name": "Sunita Jadhav", "amount_due": 12500, "amount_paid": 0, "days_overdue": 15, "status": "Pending", "date": "2025-11-25T00:00:00+00:00"},
            {"farmer_id": "F003", "farmer_name": "Prakash Deshmukh", "amount_due": 28000, "amount_paid": 0, "days_overdue": 45, "status": "Overdue", "date": "2025-10-30T00:00:00+00:00"},
            {"farmer_id": "F005", "farmer_name": "Ganesh Wagh", "amount_due": 8500, "amount_paid": 0, "days_overdue": 10, "status": "Pending", "date": "2025-12-02T00:00:00+00:00"},
            {"farmer_id": "F006", "farmer_name": "Anita Gaikwad", "amount_due": 15000, "amount_paid": 0, "days_overdue": 22, "status": "Pending", "date": "2025-11-18T00:00:00+00:00"},
            {"farmer_id": "F007", "farmer_name": "Vijay Kale", "amount_due": 42000, "amount_paid": 0, "days_overdue": 60, "status": "Overdue", "date": "2025-10-15T00:00:00+00:00"},
            {"farmer_id": "F009", "farmer_name": "Ashok Thorat", "amount_due": 5000, "amount_paid": 0, "days_overdue": 5, "status": "Pending", "date": "2025-12-08T00:00:00+00:00"},
            {"farmer_id": "F011", "farmer_name": "Suresh Nikam", "amount_due": 35000, "amount_paid": 0, "days_overdue": 38, "status": "Overdue", "date": "2025-11-05T00:00:00+00:00"},
            {"farmer_id": "F012", "farmer_name": "Rekha Chavan", "amount_due": 11000, "amount_paid": 0, "days_overdue": 18, "status": "Pending", "date": "2025-11-22T00:00:00+00:00"},
        ]
        sb.table("credits").insert(credits_data).execute()

    # Seed inventory
    r = sb.table("inventory").select("id", count="exact").execute()
    if r.count == 0:
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
        sb.table("inventory").insert(products).execute()

    # Seed activities
    r = sb.table("activities").select("id", count="exact").execute()
    if r.count == 0:
        activities = [
            {"type": "registration", "message": "New farmer Kavita More registered from Igatpuri", "timestamp": "2025-12-12T14:30:00+00:00"},
            {"type": "payment", "message": "Payment of Rs 5,000 received from Ashok Thorat", "timestamp": "2025-12-12T13:15:00+00:00"},
            {"type": "visit", "message": "Field visit completed for Ganesh Wagh in Yeola", "timestamp": "2025-12-12T11:45:00+00:00"},
            {"type": "sale", "message": "DAP Fertilizer (50kg x 5) sold to Ramesh Sharma", "timestamp": "2025-12-12T10:20:00+00:00"},
            {"type": "alert", "message": "Low stock alert: Neem Pesticide below reorder level", "timestamp": "2025-12-12T09:00:00+00:00"},
            {"type": "credit", "message": "New credit of Rs 15,000 issued to Vijay Kale", "timestamp": "2025-12-11T16:30:00+00:00"},
            {"type": "registration", "message": "New farmer Laxmi Bhosale registered from Peth", "timestamp": "2025-12-11T14:00:00+00:00"},
            {"type": "ai", "message": "AI recommendation generated for cotton pest management", "timestamp": "2025-12-11T11:20:00+00:00"},
        ]
        sb.table("activities").insert(activities).execute()

    # Seed sales records
    r = sb.table("sales_records").select("id", count="exact").execute()
    if r.count == 0:
        sales = []
        base = datetime(2025, 7, 1, tzinfo=timezone.utc)
        for i in range(180):
            d = base + timedelta(days=i)
            sales.append({
                "date": d.isoformat(),
                "revenue": random.randint(8000, 45000),
                "transactions": random.randint(3, 15),
                "category": random.choice(["Fertilizer", "Seeds", "Pesticide", "Equipment"])
            })
        # Insert in batches of 50
        for i in range(0, len(sales), 50):
            sb.table("sales_records").insert(sales[i:i+50]).execute()

    # Seed farmer growth
    r = sb.table("farmer_growth").select("id", count="exact").execute()
    if r.count == 0:
        growth = [
            {"month": "Jul", "count": 45}, {"month": "Aug", "count": 52},
            {"month": "Sep", "count": 61}, {"month": "Oct", "count": 68},
            {"month": "Nov", "count": 79}, {"month": "Dec", "count": 88},
        ]
        sb.table("farmer_growth").insert(growth).execute()

@app.on_event("startup")
async def startup():
    seed_data()

@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "Prithvix ERP API", "database": "Supabase"}
