from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from database import get_session
from models.sweet import Sweet
from models.user import User
from schemas.sweet_schemas import SweetCreate, SweetUpdate, SweetOut, PurchaseRequest, RestockRequest
from auth.dependencies import get_current_user, admin_required

router = APIRouter(prefix="/api/sweets", tags=["sweets"])


@router.post("/", response_model=SweetOut)
def create_sweet(
    sweet_in: SweetCreate,
    session: Session = Depends(get_session),
    admin_user: User = Depends(admin_required),
):
    sweet = Sweet(**sweet_in.dict())
    session.add(sweet)
    session.commit()
    session.refresh(sweet)
    return sweet


@router.get("/", response_model=List[SweetOut])
def list_sweets(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    return session.execute(select(Sweet)).scalars().all()


@router.get("/search", response_model=List[SweetOut])
def search_sweets(
    name: Optional[str] = None,
    category: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    stmt = select(Sweet)
    if name:
        stmt = stmt.where(Sweet.name.ilike(f"%{name}%")) #type:ignore
    if category:
        stmt = stmt.where(Sweet.category == category) #type:ignore
    if min_price is not None:
        stmt = stmt.where(Sweet.price >= min_price) #type:ignore
    if max_price is not None:
        stmt = stmt.where(Sweet.price <= max_price) #type:ignore
    return session.execute(stmt).scalars().all()


@router.put("/{sweet_id}", response_model=SweetOut)
def update_sweet(
    sweet_id: int,
    sweet_in: SweetUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    sweet = session.get(Sweet, sweet_id)
    if not sweet:
        raise HTTPException(status_code=404, detail="Sweet not found")

    for key, value in sweet_in.dict(exclude_unset=True).items():
        setattr(sweet, key, value)

    session.add(sweet)
    session.commit()
    session.refresh(sweet)
    return sweet


@router.delete("/{sweet_id}")
def delete_sweet(
    sweet_id: int,
    session: Session = Depends(get_session),
    admin_user: User = Depends(admin_required),
):
    sweet = session.get(Sweet, sweet_id)
    if not sweet:
        raise HTTPException(status_code=404, detail="Sweet not found")

    session.delete(sweet)
    session.commit()
    return {"msg": "Sweet deleted"}


@router.post("/{sweet_id}/purchase")
def purchase_sweet(
    sweet_id: int,
    purchase: PurchaseRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    sweet = session.get(Sweet, sweet_id)
    if not sweet:
        raise HTTPException(status_code=404, detail="Sweet not found")

    if purchase.quantity <= 0 or sweet.quantity < purchase.quantity:
        raise HTTPException(status_code=400, detail="Invalid quantity or not enough stock")

    sweet.quantity -= purchase.quantity
    session.add(sweet)
    session.commit()
    session.refresh(sweet)

    return {"msg": "Purchase successful", "remaining_quantity": sweet.quantity}


@router.post("/{sweet_id}/restock")
def restock_sweet(
    sweet_id: int,
    restock: RestockRequest,
    session: Session = Depends(get_session),
    admin_user: User = Depends(admin_required),
):
    sweet = session.get(Sweet, sweet_id)
    if not sweet:
        raise HTTPException(status_code=404, detail="Sweet not found")

    if restock.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be greater than 0")

    sweet.quantity += restock.quantity
    session.add(sweet)
    session.commit()
    session.refresh(sweet)

    return {"msg": "Restock successful", "new_quantity": sweet.quantity}
