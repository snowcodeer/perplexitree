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

app = FastAPI(title="Prune Game API", description="A web recreation of the Prune game")

# Mount static files
import os
frontend_path = os.path.join(os.path.dirname(__file__), "..", "frontend")
app.mount("/static", StaticFiles(directory=frontend_path), name="static")

# The ultra-simple game is self-contained in one HTML file

# Game state storage (in production, use a database)
game_sessions = {}

class GameState(BaseModel):
    level: int
    score: int
    bloom_count: int
    branches: List[Dict[str, Any]]
    light_sources: List[Dict[str, Any]]
    obstacles: List[Dict[str, Any]]

class GameSession(BaseModel):
    session_id: str
    game_state: GameState
    player_name: str = "Anonymous"

@app.get("/", response_class=HTMLResponse)
async def serve_game():
    """Serve the main game page"""
    frontend_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "index.html")
    return FileResponse(frontend_path)

@app.get("/api/levels")
async def get_levels():
    """Get available levels configuration"""
    levels = {
        1: {
            "name": "First Growth",
            "description": "Guide your tree to the light",
            "light_sources": [{"x": 400, "y": 100, "radius": 30}],
            "obstacles": [],
            "required_blooms": 1
        },
        2: {
            "name": "Dual Lights",
            "description": "Reach both light sources",
            "light_sources": [
                {"x": 200, "y": 120, "radius": 25},
                {"x": 600, "y": 120, "radius": 25}
            ],
            "obstacles": [],
            "required_blooms": 2
        },
        3: {
            "name": "First Obstacles",
            "description": "Avoid the buzzsaws",
            "light_sources": [{"x": 400, "y": 100, "radius": 30}],
            "obstacles": [
                {"type": "buzzsaw", "x": 300, "y": 200, "radius": 20},
                {"type": "buzzsaw", "x": 500, "y": 200, "radius": 20}
            ],
            "required_blooms": 1
        },
        4: {
            "name": "Complex Course",
            "description": "Navigate through multiple obstacles",
            "light_sources": [{"x": 400, "y": 80, "radius": 35}],
            "obstacles": [
                {"type": "buzzsaw", "x": 200, "y": 250, "radius": 25},
                {"type": "buzzsaw", "x": 600, "y": 250, "radius": 25},
                {"type": "orb", "x": 400, "y": 300, "radius": 15}
            ],
            "required_blooms": 1
        },
        5: {
            "name": "Master Level",
            "description": "The ultimate challenge",
            "light_sources": [
                {"x": 300, "y": 100, "radius": 30},
                {"x": 500, "y": 100, "radius": 30}
            ],
            "obstacles": [
                {"type": "buzzsaw", "x": 400, "y": 200, "radius": 30}
            ],
            "required_blooms": 2
        }
    }
    return levels

@app.post("/api/game/save")
async def save_game_state(session: GameSession):
    """Save game state for a session"""
    game_sessions[session.session_id] = session
    return {"status": "saved", "session_id": session.session_id}

@app.get("/api/game/load/{session_id}")
async def load_game_state(session_id: str):
    """Load game state for a session"""
    if session_id not in game_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    return game_sessions[session_id]

@app.get("/api/leaderboard")
async def get_leaderboard():
    """Get high scores leaderboard"""
    # In a real app, this would come from a database
    leaderboard = [
        {"player": "TreeMaster", "score": 2500, "level": 5},
        {"player": "PrunePro", "score": 2200, "level": 4},
        {"player": "BranchBender", "score": 1800, "level": 3},
        {"player": "LightSeeker", "score": 1500, "level": 3},
        {"player": "GrowGuru", "score": 1200, "level": 2}
    ]
    return leaderboard

@app.post("/api/leaderboard/submit")
async def submit_score(player_name: str, score: int, level: int):
    """Submit a high score"""
    # In a real app, this would save to a database
    return {
        "status": "submitted",
        "player": player_name,
        "score": score,
        "level": level,
        "rank": 1  # Would calculate actual rank
    }

@app.get("/api/ai-tips")
async def get_ai_tips():
    """Get AI-generated tips for the game using Perplexity"""
    try:
        client = Perplexity()
        search = client.search.create(
            query="tree pruning techniques and plant growth optimization tips",
            max_results=3
        )
        
        tips = []
        for result in search.results:
            tips.append({
                "title": result.title,
                "content": result.content[:200] + "..." if len(result.content) > 200 else result.content,
                "url": result.url
            })
        
        return {"tips": tips}
    except Exception as e:
        return {"tips": [
            {
                "title": "Pruning Basics",
                "content": "Strategic pruning helps direct growth toward light sources. Remove branches that grow away from your target.",
                "url": ""
            },
            {
                "title": "Growth Patterns",
                "content": "Trees naturally grow toward light. Use this to your advantage by creating clear paths to light sources.",
                "url": ""
            }
        ]}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)