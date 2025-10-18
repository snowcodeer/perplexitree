/**
 * Main Application - Initializes and coordinates all game systems
 */
class PruneApp {
    constructor() {
        this.game = null;
        this.renderer = null;
        this.pruningSystem = null;
    }
    
    init() {
        console.log('Initializing Prune Game App...');
        
        // Initialize game systems
        this.game = new UltraSimplePrune();
        this.renderer = new Renderer(this.game);
        this.pruningSystem = new PruningSystem(this.game);
        
        // Override the game's performPruning method to use our pruning system
        this.game.performPruning = () => this.pruningSystem.performPruning();
        
        // Store reference to renderer in game for game loop
        this.game.renderer = this.renderer;
        
        // Initialize modal event listeners
        this.initModalListeners();
        
        console.log('Prune Game App initialized successfully!');
    }
    
    initModalListeners() {
        // Close modal button
        const closeBtn = document.getElementById('closeModal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.game.hideStudyModal();
            });
        }
        
        // Expand modal button
        const expandBtn = document.getElementById('expandModal');
        if (expandBtn) {
            expandBtn.addEventListener('click', () => {
                this.game.toggleModalExpansion();
            });
        }
        
        // Close modal when clicking outside
        const modal = document.getElementById('studyModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.game.hideStudyModal();
                }
            });
        }
        
        // Close modal with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.game.hideStudyModal();
            }
        });
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    
    const app = new PruneApp();
    app.init();
});
