from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from schemas import SmartEntryParseRequest, SmartEntryPayload, SmartEntryResponse
from security import get_current_user
from services.smart_entry import apply_smart_entry, parse_smart_entry

router = APIRouter(prefix="/smart-entries", tags=["Smart Entries"])


@router.post("/parse", response_model=SmartEntryResponse)
def parse_entry(request: SmartEntryParseRequest):
    parsed = parse_smart_entry(request.text)
    if not parsed:
        raise HTTPException(status_code=400, detail="Could not detect a valid amount or action.")
    return parsed


@router.post("/apply")
def apply_entry(
    payload: SmartEntryPayload,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = apply_smart_entry(db, current_user, payload.model_dump())
    return {
        "message": result["message"],
        "entry_type": payload.entry_type,
        "entity_id": result["entity_id"],
    }
