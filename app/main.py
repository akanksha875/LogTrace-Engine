import json
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.services.ai_service import analyze_log_with_ai

app = FastAPI(
    title="LogTrace AI API",
    description="Backend engine for processing server logs and visualizing architectures",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"status": "online", "message": "LogTrace AI Backend is running."}

@app.post("/api/upload-log")
async def upload_log(file: UploadFile = File(...)):
    if not file.filename.endswith(('.log', '.txt')):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a .log or .txt file.")
    
    try:
        contents = await file.read()
        log_text = contents.decode("utf-8")
        
        # --- NEW CODE: Run the log text through our Gemini AI Service ---
        ai_raw_json = analyze_log_with_ai(log_text)
        
        # Convert the raw AI string back into a real Python dictionary to send to the browser
        structured_analysis = json.loads(ai_raw_json)
        
        return {
            "filename": file.filename,
            "status": "analysis_completed",
            "analysis": structured_analysis
        }
        
    except ValueError as ve:
        raise HTTPException(status_code=500, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process log via AI: {str(e)}")