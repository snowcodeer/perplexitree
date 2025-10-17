# Prune Game - Architecture Documentation

## Project Structure

```
perplexity-hack/
├── backend/
│   └── main.py                 # FastAPI server
├── frontend/
│   ├── index.html             # Main HTML file
│   ├── styles.css             # All CSS styling
│   └── js/
│       ├── app.js             # Main application coordinator
│       ├── game.js            # Core game logic
│       ├── pruning.js         # Pruning system
│       └── renderer.js        # Rendering system
├── venv/                      # Python virtual environment
├── requirements.txt           # Python dependencies
└── README.md                  # Project documentation
```

## Architecture Overview

The application follows a **modular, component-based architecture** with clear separation of concerns:

### 1. **HTML Structure** (`index.html`)
- Clean, semantic HTML structure
- Minimal markup focused on game elements
- Proper document structure with header, main, and script sections

### 2. **CSS Styling** (`styles.css`)
- Centralized styling with CSS custom properties
- Responsive design with mobile-first approach
- Component-based CSS organization
- Modern CSS features (flexbox, grid, transitions)

### 3. **JavaScript Architecture**

#### **App.js** - Application Coordinator
- **Purpose**: Main entry point and system coordinator
- **Responsibilities**:
  - Initialize all game systems
  - Coordinate between different modules
  - Handle application lifecycle

#### **Game.js** - Core Game Logic
- **Purpose**: Main game state and logic management
- **Responsibilities**:
  - Game state management
  - Input handling (mouse events)
  - Game loop and updates
  - Tool system management
  - Node detection and interaction
  - Branch growth logic
  - Leaf management
  - Node repositioning

#### **Pruning.js** - Pruning System
- **Purpose**: Handles all pruning-related functionality
- **Responsibilities**:
  - Branch cutting logic
  - Disconnected branch detection
  - Leaf cleanup after pruning
  - Collision detection for cuts
  - Mathematical calculations for line intersections

#### **Renderer.js** - Rendering System
- **Purpose**: Handles all visual rendering
- **Responsibilities**:
  - Canvas rendering
  - Tree and branch drawing
  - Leaf rendering with animation
  - Ground rendering
  - Light source rendering
  - UI rendering
  - Visual feedback (hover, drag lines)

### 4. **Backend** (`main.py`)
- **FastAPI** server for serving static files
- RESTful API endpoints for game features
- Static file serving with proper routing

## Design Patterns Used

### 1. **Module Pattern**
- Each JavaScript file is a self-contained module
- Clear interfaces between modules
- Dependency injection for loose coupling

### 2. **Component Pattern**
- Each system is a separate component with specific responsibilities
- Components communicate through well-defined interfaces
- Easy to test and maintain individual components

### 3. **Observer Pattern**
- Event-driven architecture for user interactions
- Decoupled event handling from business logic

### 4. **Strategy Pattern**
- Different tools (growth, cut, leaves, reposition) as strategies
- Easy to add new tools without modifying existing code

## Key Features

### **Modularity**
- Each file has a single responsibility
- Easy to locate and modify specific functionality
- Clear separation between game logic, rendering, and pruning

### **Maintainability**
- Well-documented code with clear naming conventions
- Consistent code structure across all files
- Easy to add new features or modify existing ones

### **Performance**
- Efficient rendering with canvas optimization
- Minimal DOM manipulation
- Optimized game loop with requestAnimationFrame

### **Extensibility**
- Easy to add new tools or game mechanics
- Pluggable architecture for new systems
- Clear interfaces for extending functionality

## Best Practices Implemented

### **Code Organization**
- Single Responsibility Principle
- Clear file naming and structure
- Consistent indentation and formatting
- Comprehensive comments and documentation

### **Performance**
- Efficient canvas rendering
- Minimal memory allocations in game loop
- Optimized collision detection algorithms

### **User Experience**
- Responsive design for different screen sizes
- Smooth animations and transitions
- Clear visual feedback for user actions
- Intuitive tool system

### **Development**
- Easy to debug with clear separation of concerns
- Simple to add new features
- Maintainable codebase structure
- Clear dependency management

## File Responsibilities Summary

| File | Primary Responsibility | Key Methods |
|------|----------------------|-------------|
| `app.js` | Application coordination | `init()`, system initialization |
| `game.js` | Game logic and state | `update()`, `handleMouseDown()`, `growBranchesFromNode()` |
| `pruning.js` | Pruning system | `performPruning()`, `findDisconnectedBranchesAfterCut()` |
| `renderer.js` | Visual rendering | `render()`, `renderBranches()`, `renderLeaves()` |
| `styles.css` | Visual styling | Component styles, responsive design |
| `index.html` | Document structure | HTML markup, script loading |

This architecture provides a solid foundation for maintaining and extending the Prune Game while following modern web development best practices.
