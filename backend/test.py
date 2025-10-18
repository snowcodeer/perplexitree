import os
from dotenv import load_dotenv
from perplexity import Perplexity

load_dotenv()

client = Perplexity() # Uses PERPLEXITY_API_KEY from .env file

search = client.search.create(
    query=[
        "latest AI developments 2024",
        "solar power innovations",
        "wind energy developments"
    ]
)

# Results are combined and ranked
for i, result in enumerate(search.results):
    print(f"{i + 1}. {result.title}")
    print(f"   URL: {result.url}")
    print(f"   Date: {result.date}\n")