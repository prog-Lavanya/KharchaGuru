from fastapi import APIRouter, File, UploadFile, HTTPException
import requests
import os
import shutil
import base64
import json
import re
from dotenv import load_dotenv
from services.smart_entry import parse_smart_entry

load_dotenv()

router = APIRouter(prefix="/ocr", tags=["OCR"])

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

@router.post("/process")
async def process_receipt(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file found")

    mime_type = file.content_type or "image/jpeg"
    if not mime_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image")
    
    file_path = f"temp_{file.filename}"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        if not GEMINI_API_KEY:
            raise HTTPException(status_code=500, detail="AI Config missing on server")

        # Read file and convert to base64 for Gemini
        with open(file_path, "rb") as f:
            image_data = base64.b64encode(f.read()).decode('utf-8')

        # Talk to Gemini Vision API with a structured prompt
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
        
        payload = {
            "contents": [{
                "parts": [
                    { "text": (
                        "You are a financial document parser.\n"
                        "The image may be a receipt, bill, or salary slip.\n"
                        "Return ONLY a valid JSON object with this shape:\n"
                        '{"document_type":"expense_receipt|income_slip|unknown","raw_text":"short extracted text","suggested_entry":{"entry_type":"expense|income","amount":123.45,"description":"short description","category":"category name"},"parsed_items":[{"name":"Item Name","amount":123.45}]}\n'
                        "For salary slips use the net payable / credited salary amount if visible.\n"
                        "For receipts use the final payable total as suggested_entry.amount.\n"
                        "If unreadable, return amount 0 and document_type unknown."
                    )},
                    {
                        "inlineData": {
                            "data": image_data,
                            "mimeType": mime_type
                        }
                    }
                ]
            }]
        }

        response = requests.post(url, json=payload, timeout=30)
        
        if response.status_code != 200:
            print(f"Gemini API Error: {response.status_code} - {response.text}")
            raise HTTPException(status_code=500, detail="AI processing failed at source")

        result = response.json()
        if os.path.exists(file_path):
            os.remove(file_path)
            
        # Extract text from Gemini response
        try:
            ai_text = result['candidates'][0]['content']['parts'][0]['text'].strip()
        except (KeyError, IndexError):
            print(f"Gemini malformed response: {result}")
            raise HTTPException(status_code=500, detail="AI could not parse this receipt")

        # Parse the JSON array returned by Gemini
        parsed_items = []
        suggested_entry = None
        document_type = "unknown"
        try:
            # Strip markdown code fences if present (```json ... ```)
            clean = re.sub(r'```(?:json)?', '', ai_text).strip().strip('`').strip()
            raw_parsed = json.loads(clean)
            if isinstance(raw_parsed, dict):
                document_type = raw_parsed.get("document_type", "unknown")
                parsed_items = [
                    {"name": str(item.get("name", "Item")), "amount": float(item.get("amount", 0))}
                    for item in raw_parsed.get("parsed_items", [])
                    if isinstance(item, dict) and float(item.get("amount", 0)) >= 0
                ]
                suggested_entry = raw_parsed.get("suggested_entry")
            elif isinstance(raw_parsed, list):
                parsed_items = [
                    {"name": str(item.get("name", "Item")), "amount": float(item.get("amount", 0))}
                    for item in raw_parsed
                    if isinstance(item, dict) and float(item.get("amount", 0)) >= 0
                ]

            if not parsed_items and raw_parsed:
                parsed_items = [{"name": "Receipt Scan", "amount": 0.0}]

        except Exception as parse_err:
            print(f"JSON parse failed, falling back to regex. Error: {parse_err}")
            print(f"AI raw text was: {ai_text}")
            # Regex fallback: grab the last number in the text as "total"
            amounts = re.findall(r'(?:total|amount|₹|rs\.?|inr)?\s*(\d+(?:\.\d{1,2})?)', ai_text, re.IGNORECASE)
            if amounts:
                parsed_items = [{"name": "Receipt Total", "amount": float(amounts[-1])}]
            else:
                parsed_items = [{"name": "Receipt Scan", "amount": 0.0}]

        if not suggested_entry:
            fallback_text = ai_text
            fallback = parse_smart_entry(fallback_text)
            if fallback:
                suggested_entry = {
                    "entry_type": fallback["entry_type"],
                    "amount": float(fallback["amount"]),
                    "description": fallback["description"],
                    "category": fallback.get("category"),
                }
            elif parsed_items:
                top_amount = max((item["amount"] for item in parsed_items), default=0)
                suggested_entry = {
                    "entry_type": "expense",
                    "amount": top_amount,
                    "description": "Receipt Scan",
                    "category": "Others",
                }

        return {
            "document_type": document_type,
            "raw_text": ai_text,
            "parsed_items": parsed_items,
            "suggested_entry": suggested_entry,
        }
        
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        print("Backend OCR Error:", str(e))
        raise HTTPException(status_code=500, detail=f"Server Processing Error: {str(e)}")
