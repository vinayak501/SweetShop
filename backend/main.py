from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel
from database import engine  # apna DB engine jo tumne banaya hoga
from routers.sweets import router as sweets_router
from routers.users import router as user_router

app = FastAPI(title="Sweet Shop API", version="1.0.0")

# ✅ CORS setup (Angular frontend ko allow karne ke liye)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Production me yaha specific domain dena
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Database tables create karo (sirf ek baar run hoga)
@app.on_event("startup")
def on_startup():
    SQLModel.metadata.create_all(engine)

app.include_router(user_router)
app.include_router(sweets_router)


@app.get("/")
def root():
    return {"msg": "Welcome to Sweet Shop API"}
