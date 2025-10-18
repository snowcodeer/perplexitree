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
        
        // Initialize save/load button listeners
        this.initSaveLoadListeners();
        
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
        
        // Flashcard button - handled dynamically in showStudyModal
        
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
    
    initSaveLoadListeners() {
        // Save button
        const saveBtn = document.getElementById('saveBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.game.saveGameState();
            });
        }
        
        // Load button
        const loadBtn = document.getElementById('loadBtn');
        if (loadBtn) {
            loadBtn.addEventListener('click', async () => {
                await this.showLoadModal();
            });
        }
        
        // Close load modal button
        const closeLoadBtn = document.getElementById('closeLoadModal');
        if (closeLoadBtn) {
            closeLoadBtn.addEventListener('click', () => {
                this.hideLoadModal();
            });
        }
        
        // Close load modal when clicking outside
        const loadModal = document.getElementById('loadModal');
        if (loadModal) {
            loadModal.addEventListener('click', (e) => {
                if (e.target === loadModal) {
                    this.hideLoadModal();
                }
            });
        }
    }
    
    async showLoadModal() {
        const modal = document.getElementById('loadModal');
        const sessionsList = document.getElementById('sessionsList');
        
        if (modal && sessionsList) {
            // Show loading state
            sessionsList.innerHTML = '<p>Loading sessions...</p>';
            modal.classList.add('show');
            
            // Load sessions
            const sessions = await this.game.getGameSessions();
            
            if (sessions.length === 0) {
                sessionsList.innerHTML = '<p>No saved sessions found.</p>';
            } else {
                sessionsList.innerHTML = sessions.map(session => `
                    <div class="session-item" style="padding: 10px; border: 1px solid #333; margin: 5px 0; border-radius: 5px; display: flex; justify-content: space-between; align-items: center;">
                        <div style="flex: 1; cursor: pointer;">
                            <strong>${session.original_search_query}</strong><br>
                            <small>Created: ${new Date(session.created_at).toLocaleString()}</small><br>
                            <small>Updated: ${new Date(session.updated_at).toLocaleString()}</small>
                        </div>
                        <div style="display: flex; gap: 10px;">
                            <button onclick="app.loadSession(${session.id})" style="background: #3b82f6; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">Load</button>
                            <button onclick="app.deleteSession(${session.id})" style="background: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">Delete</button>
                        </div>
                    </div>
                `).join('');
            }
        }
    }
    
    hideLoadModal() {
        const modal = document.getElementById('loadModal');
        if (modal) {
            modal.classList.remove('show');
        }
    }
    
    async loadSession(sessionId) {
        await this.game.loadGameState(sessionId);
        this.hideLoadModal();
    }
    
    async deleteSession(sessionId) {
        if (confirm('Are you sure you want to delete this game session? This action cannot be undone.')) {
            await this.game.deleteGameState(sessionId);
            // Refresh the load modal to show updated list
            await this.showLoadModal();
        }
    }
    
    showAllFlashcards() {
        this.game.showAllFlashcards();
    }
    
    showDeckFlashcards(topic) {
        this.game.showDeckFlashcards(topic);
    }
    
    showDeckView() {
        this.game.showDeckView();
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    
    window.app = new PruneApp();
    window.app.init();
});
