# PerplexTree - AI-Powered Knowledge Tree Game

A beautiful, interactive web game that combines the meditative puzzle mechanics of "Prune" with AI-powered knowledge exploration. Players grow knowledge trees by pruning branches while leveraging the Perplexity API to discover unique, real-time information on any topic. Each growth session returns fresh, non-redundant search results to build comprehensive understanding.

## Project Summary

**Purpose**: PerplexTree transforms learning into an engaging, visual experience where users cultivate knowledge trees through strategic pruning and AI-enhanced exploration. The game addresses information overload by presenting unique, curated insights through an intuitive tree metaphor.

**Technical Approach**: Built with a modular architecture featuring FastAPI backend and vanilla JavaScript frontend, the application integrates Perplexity's real-time search capabilities to generate unique knowledge areas for each growth session. The system ensures non-redundant information retrieval through intelligent query generation and structured output parsing.

**Perplexity API Integration**: The game leverages Perplexity's reasoning and retrieval capabilities through multiple endpoints:
- **Structured Search**: Uses Perplexity's `sonar-pro` model with JSON schema to generate 5 unique knowledge areas per search
- **Web Search**: Implements real-time web search with result filtering and content summarization
- **Flashcard Generation**: Creates study materials from search results using AI-powered content analysis
- **Unique Results**: Each growth session generates fresh, non-redundant search queries to avoid information repetition

The integration ensures players receive diverse, comprehensive information while maintaining the game's meditative, focused learning experience.

## Features

- **Organic Tree Growth**: Watch your tree grow naturally with smooth, curved branches
- **Interactive Pruning**: Click and drag to prune branches and direct growth
- **Beautiful Visuals**: Minimalist black tree with smooth curves and organic movement
- **Smart Branching**: Branches grow from existing branches with natural limits
- **Clean Pruning**: Disconnected branches disappear completely when pruned
- **AI-Powered Tips**: Get pruning advice using Perplexity AI integration
- **Self-Contained**: Everything in one HTML file - no external dependencies

## Game Mechanics

### Core Gameplay
1. **Tree Growth**: Your tree grows automatically with smooth, curved branches
2. **Pruning**: Click and drag to cut branches that grow away from the light
3. **Light Source**: Guide branches to reach the glowing orange light source
4. **Victory**: When a branch touches the light, you win!
5. **Natural Limits**: Each node can grow at most 6 branches for realistic growth

### Controls
- **Mouse/Touch**: Click and drag to prune branches
- **Start Growing**: Click to begin the game
- **Restart**: Click to restart and try again

## Installation & Setup

### Prerequisites
- Python 3.8+
- Virtual environment (recommended)

### Quick Start

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create and activate a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Run the server:
```bash
python main.py
```

5. Open your browser and go to: `http://localhost:8001`

The game is completely self-contained in one HTML file with no external dependencies!

## Game Levels

### Level 1: First Growth
- **Objective**: Guide your tree to a single light source
- **Difficulty**: Beginner
- **Obstacles**: None

### Level 2: Dual Lights
- **Objective**: Reach both light sources to bloom
- **Difficulty**: Easy
- **Obstacles**: None

### Level 3: First Obstacles
- **Objective**: Navigate around buzzsaws to reach the light
- **Difficulty**: Medium
- **Obstacles**: 2 Buzzsaws

### Level 4: Complex Course
- **Objective**: Avoid multiple obstacles including buzzsaws and orbs
- **Difficulty**: Hard
- **Obstacles**: 2 Buzzsaws, 1 Glowing Orb

### Level 5: Master Level
- **Objective**: Reach two light sources while avoiding a large buzzsaw
- **Difficulty**: Expert
- **Obstacles**: 1 Large Buzzsaw

## API Endpoints

The backend provides several API endpoints:

- `GET /` - Serve the main game
- `GET /api/levels` - Get level configurations
- `POST /api/game/save` - Save game state
- `GET /api/game/load/{session_id}` - Load game state
- `GET /api/leaderboard` - Get high scores
- `POST /api/leaderboard/submit` - Submit a score
- `GET /api/ai-tips` - Get AI-generated pruning tips

## Customization

### Adding Sound Effects
1. Place audio files in `frontend/sounds/`:
   - `prune.mp3` - Pruning sound
   - `bloom.mp3` - Blooming sound
   - `ambient.mp3` - Background music

### Creating New Levels
Modify the `generateLevel()` method in `game.js` to add new levels with custom obstacles and light sources.

### Styling
Customize the game's appearance by modifying `styles.css`. The design uses CSS custom properties for easy theming.

## Technical Details

### Architecture
- **Frontend**: Vanilla JavaScript with HTML5 Canvas
- **Backend**: FastAPI with Python
- **AI Integration**: Perplexity API for dynamic tips
- **Styling**: Modern CSS with responsive design

### Performance
- 60 FPS game loop using `requestAnimationFrame`
- Efficient collision detection algorithms
- Optimized canvas rendering

## Contributing

Feel free to contribute improvements:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Credits

- **Original Game**: Prune by Joel McDonald
- **Web Recreation**: Created for Perplexity Hackathon
- **Inspiration**: The original Prune game's elegant design and meditative gameplay

## License

This project is created for educational and hackathon purposes. The original Prune game is owned by Joel McDonald.

---

*"Cultivate what matters. Cut away the rest."*
