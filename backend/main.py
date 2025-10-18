import os
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
from pydantic import BaseModel
from typing import List, Dict, Any
import json
from dotenv import load_dotenv
from perplexity import Perplexity

load_dotenv()

app = FastAPI(title="Perplexitree API", description="A tree growth game with Perplexity AI integration")

# Mount static files
frontend_path = os.path.join(os.path.dirname(__file__), "..", "frontend")
app.mount("/static", StaticFiles(directory=frontend_path), name="static")

@app.get("/", response_class=HTMLResponse)
async def serve_game():
    """Serve the main game page"""
    frontend_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "index.html")
    return FileResponse(frontend_path)

class QueryRequest(BaseModel):
    query: str

@app.post("/api/query")
async def query_perplexity(request: QueryRequest):
    """Test endpoint to query Perplexity with any question"""
    try:
        client = Perplexity()
        search = client.search.create(
            query=request.query,
            max_results=5
        )
        
        results = []
        for result in search.results:
            results.append({
                "title": result.title,
                "content": result.content,
                "url": result.url
            })
        
        return {"query": request.query, "results": results}
    except Exception as e:
        return {"error": str(e), "query": request.query}

@app.get("/api/test-plant-biology")
async def test_plant_biology():
    """Test endpoint with plant biology queries"""
    try:
        client = Perplexity()
        search = client.search.create(
            query=[
                "plant reproductive system",
                "seed dispersion"
            ]
        )
        
        results = []
        for i, result in enumerate(search.results):
            results.append({
                "rank": i + 1,
                "title": result.title,
                "url": result.url,
                "date": result.date,
                "content": result.content
            })
        
        return {"queries": ["plant reproductive system", "seed dispersion"], "results": results}
    except Exception as e:
        return {"error": str(e), "queries": ["plant reproductive system", "seed dispersion"]}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)