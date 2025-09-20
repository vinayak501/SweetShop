from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select
from schemas.user_schemas import UserCreate,UserLogin,UserAdminLogin
from schemas.token import Token
from models.user import User
from database import get_session
from auth.dependencies import get_password_hash, authenticate_user, create_access_token, ADMIN_REGISTER_SECRET
from datetime import timedelta


router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", status_code=201)
def register(user_in: UserCreate, session: Session = Depends(get_session)):
    if session.exec(select(User).where(User.username == user_in.username)).first():
        raise HTTPException(status_code=400, detail="Username already registered")
    if session.exec(select(User).where(User.email == user_in.email)).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    is_admin = user_in.admin_code == ADMIN_REGISTER_SECRET
    user = User(
        username=user_in.username,
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        is_admin=is_admin,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return {"msg": "User registered", "username": user.username, "is_admin": user.is_admin}


@router.post("/login", response_model=Token)
def login(user_in: UserLogin, session: Session = Depends(get_session)):
    print(user_in)
    user = authenticate_user(session, user_in.email, user_in.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=60)
    token = create_access_token({"sub": user.username}, access_token_expires)
    return {"access_token": token, "token_type": "bearer"}

@router.post("/admin-login", response_model=Token)
def admin_login(user_in: UserAdminLogin, session: Session = Depends(get_session)):
    user = authenticate_user(session, user_in.email, user_in.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if user is admin
    if not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Admin privileges required.",
        )
    
    access_token_expires = timedelta(minutes=60)
    token = create_access_token({"sub": user.username}, access_token_expires)
    return {"access_token": token, "token_type": "bearer", "is_admin": user.is_admin, "username": user.username}