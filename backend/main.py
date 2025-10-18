from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from perplexity import Perplexity
from dotenv import load_dotenv
import os
import json

load_dotenv()
app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Mount frontend
frontend_path = os.path.join(os.path.dirname(__file__), "..", "frontend")
app.mount("/static", StaticFiles(directory=frontend_path), name="static")

@app.get("/")
async def serve_game():
    return FileResponse(os.path.join(os.path.dirname(__file__), "..", "frontend", "index.html"))

class SearchRequest(BaseModel):
    query: str

@app.post("/api/search")
async def search(request: SearchRequest):
    try:
        client = Perplexity()
        
        # Define the JSON schema for structured output
        schema = {
            "type": "object",
            "properties": {
                "areas": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "description": {"type": "string"},
                            "search_query": {"type": "string"}
                        },
                        "required": ["name", "description", "search_query"]
                    },
                    "minItems": 5,
                    "maxItems": 5
                }
            },
            "required": ["areas"]
        }
        
        # Use structured outputs to get exactly 5 areas with descriptions
        completion = client.chat.completions.create(
            model="sonar-pro",
            messages=[
                {"role": "user", "content": f"What are the primary 5 areas in {request.query}? Please provide exactly 5 distinct areas, each with a brief description and a relevant search query for further research. Return the data as a JSON object with the following structure: areas array with 5 objects, each containing name, description, and search_query fields."}
            ],
            response_format={
                "type": "json_schema",
                "json_schema": {"schema": schema}
            }
        )
        
        # Parse the structured JSON response
        response_content = completion.choices[0].message.content
        try:
            structured_data = json.loads(response_content)
        except json.JSONDecodeError as e:
            # Fallback to generic results
            structured_data = None
        
        # Create results from structured data
        results = []
        if structured_data and "areas" in structured_data:
            for i, area in enumerate(structured_data["areas"]):
                results.append({
                    "id": i,
                    "title": area["name"],
                    "url": f"https://example.com/{request.query.replace(' ', '-')}-{area['name'].lower().replace(' ', '-').replace('(', '').replace(')', '')}",
                    "date": "2024-01-01",
                    "snippet": area["description"],
                    "llm_content": f"**{area['name']}**\n\n{area['description']}"
                })
        else:
            # Fallback to generic results
            for i in range(5):
                results.append({
                    "id": i,
                    "title": f"{request.query} - Area {i+1}",
                    "url": f"https://example.com/{request.query.replace(' ', '-')}-area-{i+1}",
                    "date": "2024-01-01",
                    "snippet": f"Primary area {i+1} in {request.query}",
                    "llm_content": response_content
                })
        
        return {"query": request.query, "results": results, "structured_data": structured_data}
    except Exception as e:
        return {"error": str(e), "query": request.query}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)