from pydantic import BaseModel, EmailStr
from typing import Optional, List

class SweetCreate(BaseModel):
    name: str
    category: str
    price: float
    quantity: int = 0


class SweetUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = None
    quantity: Optional[int] = None

class PurchaseRequest(BaseModel):
    quantity: int = 1


class RestockRequest(BaseModel):
    quantity: int