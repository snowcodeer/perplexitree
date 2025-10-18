/**
 * Main Application - Initializes and coordinates all game systems
 */
class PruneApp {
    constructor() {
        console.log('PruneApp constructor called');
        this.game = null;
        this.renderer = null;
        this.pruningSystem = null;
        this.audioManager = null;
        console.log('PruneApp constructor completed');
    }
    
    init() {
        console.log('Initializing Prune Game App...');
        
        // Initialize managers first
        this.uiManager = new UIManager(null); // Will be set after game is created
        this.flashcardManager = new FlashcardManager(null); // Will be set after game is created
        // Temporarily disable AudioManager to debug
        // this.audioManager = new AudioManager();
        this.audioManager = null;
        
        // Initialize game systems
        this.game = new UltraSimplePrune();
        this.renderer = new Renderer(this.game);
        this.pruningSystem = new PruningSystem(this.game);
        
        // Set managers in game instance and update their game references
        this.game.uiManager = this.uiManager;
        this.game.flashcardManager = this.flashcardManager;
        this.game.audioManager = this.audioManager;
        this.uiManager.game = this.game;
        this.flashcardManager.game = this.game;
        
        console.log('Managers set in game - uiManager:', !!this.game.uiManager, 'flashcardManager:', !!this.game.flashcardManager);
        
        // Override the game's performPruning method to use our pruning system
        this.game.performPruning = () => this.pruningSystem.performPruning();
        
        // Store reference to renderer in game for game loop
        this.game.renderer = this.renderer;
        
        // Initialize modal event listeners
        this.initModalListeners();
        
        // Initialize save/load button listeners
        this.initSaveLoadListeners();
        
        // Initialize audio button listeners (only if audioManager exists)
        if (this.audioManager) {
            this.initAudioListeners();
        }
        
        // Enable audio on first user interaction
        this.enableAudioOnInteraction();
        
        console.log('Prune Game App initialized successfully!');
    }
    
    initModalListeners() {
        // Close modal button
        const closeBtn = document.getElementById('closeModal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.uiManager.hideStudyModal();
            });
        }
        
        // Flashcard button - handled dynamically in showStudyModal
        
        // Close modal when clicking outside
        const modal = document.getElementById('studyModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.uiManager.hideStudyModal();
                }
            });
        }
        
        // Close modal with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.uiManager.hideStudyModal();
            }
        });
    }
    
    initSaveLoadListeners() {
        // Restart button
        const restartBtn = document.getElementById('restartBtn');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => {
                this.restartGame();
            });
        }
        
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
    
    initAudioListeners() {
        // Only proceed if audioManager exists
        if (!this.audioManager) return;
        
        // Music toggle button
        const musicToggle = document.getElementById('musicToggle');
        if (musicToggle) {
            musicToggle.addEventListener('click', () => {
                this.audioManager.enableAudio(); // Enable audio context on first interaction
                this.audioManager.toggleMusic();
                this.audioManager.playClickSound();
            });
        }
        
        // Sound toggle button
        const soundToggle = document.getElementById('soundToggle');
        if (soundToggle) {
            soundToggle.addEventListener('click', () => {
                this.audioManager.enableAudio(); // Enable audio context on first interaction
                this.audioManager.toggleSound();
                this.audioManager.playClickSound();
            });
        }
        
        // Add click sounds to all buttons
        document.querySelectorAll('button').forEach(button => {
            button.addEventListener('click', () => {
                this.audioManager.enableAudio();
                this.audioManager.playClickSound();
            });
        });
        
        // Initialize button states
        this.audioManager.updateMusicButton();
        this.audioManager.updateSoundButton();
    }
    
    enableAudioOnInteraction() {
        // Enable audio on first click anywhere (only if audioManager exists)
        if (!this.audioManager) return;
        
        const enableAudio = () => {
            this.audioManager.enableAudio();
            // Remove listeners after first interaction
            document.removeEventListener('click', enableAudio);
            document.removeEventListener('keydown', enableAudio);
        };
        
        document.addEventListener('click', enableAudio);
        document.addEventListener('keydown', enableAudio);
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
        this.uiManager.showAllFlashcards();
    }
    
    showDeckFlashcards(topic) {
        this.flashcardManager.showDeckFlashcards(topic);
    }
    
    showDeckView() {
        this.uiManager.showDeckView();
    }
    
    restartGame() {
        // Reset the game state
        this.game.restartGame();
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    
    try {
        window.app = new PruneApp();
        console.log('PruneApp created successfully');
        window.app.init();
        console.log('PruneApp initialized successfully');
    } catch (error) {
        console.error('Error initializing app:', error);
    }
});
