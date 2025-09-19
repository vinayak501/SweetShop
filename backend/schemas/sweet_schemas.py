from pydantic import BaseModel
from typing import Optional



class SweetBase(BaseModel):
    name: str
    category: str
    price: float
    quantity: int


class SweetCreate(SweetBase):
    pass


class SweetUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = None
    quantity: Optional[int] = None


class SweetOut(SweetBase):
    id: int

    class Config:
        orm_mode = True


class PurchaseRequest(BaseModel):
    quantity: int


class RestockRequest(BaseModel):
    quantity: int