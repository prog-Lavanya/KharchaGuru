import speech_recognition as sr
from fastapi import APIRouter, File, UploadFile, HTTPException
import shutil
import os

router = APIRouter(prefix="/voice", tags=["Voice"])

@router.post("/process")
async def process_voice(audio: UploadFile = File(...)):
    if not audio.filename:
        raise HTTPException(status_code=400, detail="No audio file provided")
    
    file_path = f"temp_{audio.filename}"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(audio.file, buffer)

    recognizer = sr.Recognizer()
    try:
        # Pydub might be needed here if audio is not WAV format
        # but modern browsers often use webm or ogg, which need ffmpeg.
        # However, speech_recognition natively works with WAV, AIFF, FLAC.
        # We will attempt to read the file directly if it's WAV.
        # For a robust solution, you'd use pydub to convert to WAV first.
        
        # Let's try basic wav read:
        with sr.AudioFile(file_path) as source:
            audio_data = recognizer.record(source)
            text = recognizer.recognize_google(audio_data, language="en-IN")
            
            # Simple parsing logic
            lower = text.lower()
            if "spent" in lower or "paid" in lower or "expense" in lower:
                entry_type = "expense"
            elif "earned" in lower or "received" in lower or "income" in lower:
                entry_type = "income"
            else:
                entry_type = "expense" # default

            import re
            amount_match = re.search(r'(\d+(?:\.\d{1,2})?)', text)
            amount = float(amount_match.group(1)) if amount_match else 0.0

            os.remove(file_path)
            return {
                "transcript": text,
                "parsed": {
                    "type": entry_type,
                    "amount": amount,
                    "description": text
                }
            }
    except sr.UnknownValueError:
        os.remove(file_path)
        raise HTTPException(status_code=400, detail="Could not understand audio")
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        
        # fallback parsing if pydub/ffmpeg isn't installed and sr throws error
        # In a real setup, ffmpeg handles conversion
        print("Error processing voice:", e)
        raise HTTPException(status_code=500, detail=str(e))
