import torch
import clip
from PIL import Image
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import os

app = FastAPI()

# Load CLIP model once on startup
device = "cuda" if torch.cuda.is_available() else "cpu"
model, preprocess = clip.load("ViT-B/32", device=device)

class CLIPRequest(BaseModel):
    prompt: str
    path_a: str
    path_b: str

@app.post("/evaluate")
async def evaluate(req: CLIPRequest):
    try:
        if not os.path.exists(req.path_a) or not os.path.exists(req.path_b):
            raise HTTPException(status_code=404, detail="Captured images not found")

        # Preprocess images
        image_a = preprocess(Image.open(req.path_a)).unsqueeze(0).to(device)
        image_b = preprocess(Image.open(req.path_b)).unsqueeze(0).to(device)
        
        # Tokenize the prompt
        text = clip.tokenize([f"A high quality photo of {req.prompt}"]).to(device)

        with torch.no_grad():
            # Calculate similarity scores
            logits_per_image_a, _ = model(image_a, text)
            logits_per_image_b, _ = model(image_b, text)
            
            # Convert to standard python floats
            score_a = float(logits_per_image_a.item())
            score_b = float(logits_per_image_b.item())

        # Decision based on highest similarity
        decision = "A" if score_a > score_b else "B"
        
        return {
            "best": decision,
            "scores": {
                "A": round(score_a, 4),
                "B": round(score_b, 4)
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)