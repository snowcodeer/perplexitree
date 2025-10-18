/**
 * UI Manager - Handles all modals, tooltips, and UI interactions
 */
class UIManager {
    constructor(game) {
        this.game = game;
    }
    
    updateStatus(message) {
        const statusElement = document.getElementById('status');
        if (statusElement) {
            statusElement.textContent = message;
        }
    }
    
    showLoadingMessage(message) {
        // Remove any existing loading message
        this.hideLoadingMessage();
        
        // Create loading message element in the same position as flashcard deck
        const loadingElement = document.createElement('div');
        loadingElement.id = 'loading-message';
        loadingElement.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: rgba(26, 26, 26, 0.95);
            border: 2px solid #333;
            border-radius: 10px;
            padding: 15px 20px;
            color: white;
            font-family: 'Inter', sans-serif;
            font-size: 14px;
            font-weight: 500;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            animation: fadeIn 0.3s ease-in;
            min-width: 200px;
        `;
        loadingElement.textContent = message;
        
        // Add CSS animation if not already added
        if (!document.getElementById('loading-styles')) {
            const style = document.createElement('style');
            style.id = 'loading-styles';
            style.textContent = `
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes fadeOut {
                    from { opacity: 1; transform: translateY(0); }
                    to { opacity: 0; transform: translateY(-10px); }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(loadingElement);
    }
    
    hideLoadingMessage() {
        const loadingElement = document.getElementById('loading-message');
        if (loadingElement) {
            loadingElement.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => {
                if (loadingElement.parentNode) {
                    loadingElement.parentNode.removeChild(loadingElement);
                }
            }, 300);
        }
    }
    
    startWelcomeSequence() {
        console.log('UIManager.startWelcomeSequence called');
        this.game.welcomeSequence.isActive = true;
        this.game.welcomeSequence.hasShownPrompt = false;
        this.game.welcomeSequence.originalPanY = this.game.cameraOffset.y;
        // Pan up higher so dirt covers about 60% of screen (show more dirt below)
        this.game.welcomeSequence.targetPanY = -this.game.height * 0.6;
        
        console.log('Starting welcome pan animation');
        // Start panning up
        this.animateWelcomePan();
    }
    
    animateWelcomePan() {
        if (!this.game.welcomeSequence.isActive) return;
        
        const currentY = this.game.cameraOffset.y;
        const targetY = this.game.welcomeSequence.targetPanY;
        const diff = targetY - currentY;
        
        console.log('Welcome pan - currentY:', currentY, 'targetY:', targetY, 'diff:', diff);
        
        if (Math.abs(diff) > 1) {
            // Continue panning
            this.game.cameraOffset.y += diff * 0.05; // Smooth animation
            requestAnimationFrame(() => this.animateWelcomePan());
        } else {
            // Reached target, show prompt
            console.log('Welcome pan complete, showing prompt');
            this.game.cameraOffset.y = targetY;
            this.showWelcomePrompt();
        }
    }
    
    showWelcomePrompt() {
        console.log('showWelcomePrompt called');
        if (this.game.welcomeSequence.hasShownPrompt) return;
        
        this.game.welcomeSequence.hasShownPrompt = true;
        
        // Create prompt box
        const promptBox = document.createElement('div');
        promptBox.id = 'welcomePrompt';
        promptBox.innerHTML = `
            <div class="welcome-prompt-content">
                <h2>Welcome to the root of your knowledge</h2>
                <div class="welcome-prompt-input">
                    <input type="text" id="welcomeInput" placeholder="What would you like to learn?" autofocus>
                    <button id="welcomeSubmit">Enter</button>
                </div>
            </div>
        `;
        
        // Append to canvas container for proper positioning
        const canvasContainer = this.game.canvas.parentElement;
        console.log('Canvas container:', canvasContainer);
        if (canvasContainer) {
            canvasContainer.appendChild(promptBox);
            console.log('Welcome prompt added to DOM');
        } else {
            console.error('Canvas container not found');
        }
        
        // Focus input and handle events
        const input = document.getElementById('welcomeInput');
        const submitBtn = document.getElementById('welcomeSubmit');
        
        const handleSubmit = async () => {
            const userInput = input.value.trim();
            await this.dismissWelcomePrompt(userInput);
        };
        
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSubmit();
            }
        });
        
        submitBtn.addEventListener('click', handleSubmit);
        
        // Auto-focus
        setTimeout(() => input.focus(), 100);
    }
    
    async dismissWelcomePrompt(userInput) {
        // Remove prompt box
        const promptBox = document.getElementById('welcomePrompt');
        if (promptBox) {
            promptBox.remove();
        }
        
        // Pan back up to original position immediately
        this.game.welcomeSequence.targetPanY = this.game.welcomeSequence.originalPanY;
        this.animateWelcomePanBack();
        
        // Call API with user input and wait for results, then grow
        if (userInput) {
            await this.game.fetchSearchResults(userInput);
        }
    }
    
    animateWelcomePanBack() {
        const currentY = this.game.cameraOffset.y;
        const targetY = this.game.welcomeSequence.targetPanY;
        const diff = targetY - currentY;
        
        if (Math.abs(diff) > 1) {
            // Continue panning back up
            this.game.cameraOffset.y += diff * 0.05; // Smooth animation
            requestAnimationFrame(() => this.animateWelcomePanBack());
        } else {
            // Reached original position, mark sequence as complete
            this.game.cameraOffset.y = targetY;
            this.game.welcomeSequence.isActive = false;
            // Don't trigger growth here - wait for search results
        }
    }
    
    showStudyModal(searchResult) {
        const modal = document.getElementById('studyModal');
        const title = document.getElementById('modalTitle');
        const description = document.getElementById('modalDescription');
        const flashcardBtn = document.getElementById('showFlashcardsBtn');
        
        if (modal && title && description) {
            title.textContent = this.toProperCase(searchResult.title);
            const content = searchResult.snippet || searchResult.llm_content || 'No description available';
            
            // Create formatted content
            let formattedContent = this.formatContent(this.toProperCase(content));
            
            description.innerHTML = formattedContent;
            
            // Show/hide flashcard button based on whether flashcards exist for this topic
            if (flashcardBtn) {
                const topicFlashcards = this.game.flashcards.filter(card => 
                    card.category === searchResult.title
                );
                
                if (topicFlashcards.length > 0) {
                    flashcardBtn.style.display = 'block';
                    flashcardBtn.onclick = () => {
                        this.game.flashcardManager.showFlashcardsForTopic(searchResult.title);
                    };
                } else {
                    flashcardBtn.style.display = 'none';
                }
            }
            
            modal.classList.add('show');
        }
    }
    
    hideStudyModal() {
        const modal = document.getElementById('studyModal');
        if (modal) {
            modal.classList.remove('show');
        }
    }
    
    showDeckView() {
        if (this.game.flashcards.length === 0) {
            this.updateStatus('No flashcards created yet');
            return;
        }
        
        // Group flashcards by main topic (parent node) categories
        const groupedFlashcards = {};
        this.game.flashcards.forEach(card => {
            // Find the branch this flashcard was created from
            const branch = card.branch;
            let mainTopic = 'General';
            
            if (branch && branch.searchResult) {
                // If this is a first-generation branch (main topic), use its title
                if (branch.generation === 0 || branch.generation === 1) {
                    mainTopic = branch.searchResult.title;
                } else {
                    // For child branches, find the parent main topic branch
                    const parentBranch = this.game.flashcardManager.findParentMainTopicBranch(branch);
                    if (parentBranch && parentBranch.searchResult) {
                        mainTopic = parentBranch.searchResult.title;
                    } else {
                        mainTopic = branch.searchResult.title; // Fallback
                    }
                }
            } else {
                mainTopic = card.category || 'General';
            }
            
            if (!groupedFlashcards[mainTopic]) {
                groupedFlashcards[mainTopic] = [];
            }
            groupedFlashcards[mainTopic].push(card);
        });
        
        // Create modal with deck view
        const modal = document.createElement('div');
        modal.className = 'deck-view-modal';
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #1a1a1a;
            border: 2px solid #333;
            border-radius: 10px;
            padding: 20px;
            min-width: 500px;
            max-height: 80vh;
            overflow-y: auto;
            z-index: 1000;
            color: white;
        `;
        
        // Create simple deck display
        let deckHTML = `
            <div style="margin-bottom: 15px;">
                <h3 style="margin: 0 0 15px 0; color: #fff; font-size: 16px; font-weight: 600;">📚 Flashcard Decks</h3>
                <div style="display: grid; grid-template-columns: 1fr auto; gap: 10px; margin-bottom: 10px; padding: 8px; background: rgba(255,255,255,0.05); border-radius: 5px; font-weight: 600; color: #ccc;">
                    <div>Deck</div>
                    <div>Cards</div>
                </div>
        `;
        
        Object.keys(groupedFlashcards).forEach(topic => {
            const cards = groupedFlashcards[topic];
            const totalCards = cards.length;
            
            deckHTML += `
                <div style="display: grid; grid-template-columns: 1fr auto; gap: 10px; padding: 8px; border-radius: 5px; cursor: pointer; transition: background 0.2s;" 
                     onmouseover="this.style.background='rgba(255,255,255,0.1)'" 
                     onmouseout="this.style.background='transparent'"
                     onclick="app.game.flashcardManager.showDeckFlashcards('${topic}')">
                    <div style="color: #fff; font-weight: 500;">${this.toProperCase(topic)}</div>
                    <div style="color: #fff; font-weight: 600;">${totalCards}</div>
                    </div>
            `;
        });
        
        deckHTML += `
            </div>
            <div style="text-align: center; margin-top: 10px;">
                <button onclick="app.game.flashcardManager.showAllFlashcards()" style="
                    background: #3b82f6; 
                    color: white; 
                    border: none; 
                    padding: 8px 16px; 
                    border-radius: 5px; 
                    cursor: pointer; 
                    font-family: 'Inter', sans-serif;
                    font-size: 12px;
                    font-weight: 500;
                ">View All Cards</button>
                </div>
            `;
        
        modal.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin: 0; color: #fff;">📚 Flashcard Decks</h3>
                <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: #fff; font-size: 20px; cursor: pointer;">×</button>
            </div>
            ${deckHTML}
        `;
        
        document.body.appendChild(modal);
        
        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    showDeckFlashcards(topic) {
        const deckCards = this.game.flashcards.filter(card => card.category === topic);
        if (deckCards.length === 0) {
            this.updateStatus('No flashcards found for this topic');
            return;
        }
        
        // Create a modal to display flashcards for this specific deck
        const modal = document.createElement('div');
        modal.className = 'deck-flashcards-modal';
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #1a1a1a;
            border: 2px solid #333;
            border-radius: 10px;
            padding: 20px;
            max-width: 800px;
            max-height: 80vh;
            overflow-y: auto;
            z-index: 1000;
            color: white;
            font-family: 'Inter', sans-serif;
        `;
        
        modal.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin: 0; color: #fff;">📚 ${this.toProperCase(topic)} Deck (${deckCards.length} cards)</h3>
                <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: #fff; font-size: 20px; cursor: pointer;">×</button>
            </div>
            <div id="deck-flashcards-container">
                ${deckCards.map((card, index) => `
                    <div class="flashcard" style="border: 1px solid #333; border-radius: 5px; margin: 10px 0; padding: 15px; background: #2a2a2a; cursor: pointer; font-family: 'Inter', sans-serif;" data-node-position='${JSON.stringify(card.node_position)}'>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <span style="color: #3b82f6; font-weight: bold;">Card ${index + 1}</span>
                            <span style="color: #666; font-size: 12px;">${card.difficulty}</span>
                        </div>
                        <div style="margin-bottom: 10px;">
                            <strong style="color: #fff;">Q:</strong> ${this.formatContent(this.toProperCase(card.front))}
                        </div>
                        <div style="margin-bottom: 10px;">
                            <strong style="color: #fff;">A:</strong> ${this.formatContent(this.toProperCase(card.back))}
                        </div>
                        <div style="color: #3b82f6; font-size: 12px; text-align: center; margin-top: 10px; padding-top: 10px; border-top: 1px solid #333;">
                            Click to highlight source node on tree
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add click handlers for flashcards to highlight source nodes
        const flashcardElements = modal.querySelectorAll('.flashcard');
        flashcardElements.forEach(card => {
            card.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent modal close
                const nodePosition = JSON.parse(card.dataset.nodePosition);
                this.game.flashcardManager.highlightNodeAtPosition(nodePosition);
                // Don't close modal - let user continue using the highlight button
            });
        });
        
        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    showAllFlashcards() {
        if (this.game.flashcards.length === 0) {
            this.updateStatus('No flashcards created yet');
            return;
        }
        
        // Group flashcards by main topic (parent node) categories
        const groupedFlashcards = {};
        this.game.flashcards.forEach(card => {
            // Find the branch this flashcard was created from
            const branch = card.branch;
            let mainTopic = 'General';
            
            if (branch && branch.searchResult) {
                // If this is a first-generation branch (main topic), use its title
                if (branch.generation === 0 || branch.generation === 1) {
                    mainTopic = branch.searchResult.title;
                } else {
                    // For child branches, find the parent main topic branch
                    const parentBranch = this.game.flashcardManager.findParentMainTopicBranch(branch);
                    if (parentBranch && parentBranch.searchResult) {
                        mainTopic = parentBranch.searchResult.title;
                    } else {
                        mainTopic = branch.searchResult.title; // Fallback
                    }
                }
            } else {
                mainTopic = card.category || 'General';
            }
            
            if (!groupedFlashcards[mainTopic]) {
                groupedFlashcards[mainTopic] = [];
            }
            groupedFlashcards[mainTopic].push(card);
        });
        
        // Create a comprehensive modal
        const modal = document.createElement('div');
        modal.className = 'all-flashcards-modal';
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #1a1a1a;
            border: 2px solid #333;
            border-radius: 10px;
            padding: 20px;
            max-width: 800px;
            max-height: 80vh;
            overflow-y: auto;
            z-index: 1000;
            color: white;
            font-family: 'Inter', sans-serif;
        `;
        
        let modalHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin: 0; color: #fff;">📚 Complete Flashcard Deck (${this.game.flashcards.length} cards)</h3>
                <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: #fff; font-size: 20px; cursor: pointer;">×</button>
            </div>
        `;
        
        Object.keys(groupedFlashcards).forEach(topic => {
            const cards = groupedFlashcards[topic];
            modalHTML += `
                <div style="margin-bottom: 20px; border: 1px solid #333; border-radius: 5px; padding: 15px;">
                    <h4 style="color: #3b82f6; margin: 0 0 10px 0;">${this.toProperCase(topic)} (${cards.length} cards)</h4>
                    ${cards.map((card, index) => `
                        <div style="border: 1px solid #444; border-radius: 3px; margin: 8px 0; padding: 10px; background: #2a2a2a; font-family: 'Inter', sans-serif;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                <span style="color: #3b82f6; font-weight: bold;">Card ${index + 1}</span>
                                <span style="color: #666; font-size: 12px;">${card.difficulty}</span>
                            </div>
                            <div style="margin-bottom: 8px;">
                                <strong style="color: #fff;">Q:</strong> ${this.formatContent(this.toProperCase(card.front))}
                            </div>
                            <div>
                                <strong style="color: #fff;">A:</strong> ${this.formatContent(this.toProperCase(card.back))}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        });
        
        modal.innerHTML = modalHTML;
        document.body.appendChild(modal);
    }
    
    showFlashcards(flashcards, topic) {
        // Create a simple modal to display flashcards
        const modal = document.createElement('div');
        modal.className = 'flashcard-modal';
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #1a1a1a;
            border: 2px solid #333;
            border-radius: 10px;
            padding: 20px;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            z-index: 1000;
            color: white;
            font-family: 'Inter', sans-serif;
        `;
        
        modal.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin: 0; color: #fff;">Flashcards: ${this.toProperCase(topic)}</h3>
                <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: #fff; font-size: 20px; cursor: pointer;">×</button>
            </div>
            <div id="flashcards-container">
                ${flashcards.map((card, index) => `
                    <div class="flashcard" style="border: 1px solid #333; border-radius: 5px; margin: 10px 0; padding: 15px; background: #2a2a2a; cursor: pointer; font-family: 'Inter', sans-serif;" data-node-position='${JSON.stringify(card.node_position)}'>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <span style="color: #3b82f6; font-weight: bold;">Card ${index + 1}</span>
                            <span style="color: #666; font-size: 12px;">${card.difficulty}</span>
                        </div>
                        <div style="margin-bottom: 10px;">
                            <strong style="color: #fff;">Q:</strong> ${this.formatContent(this.toProperCase(card.front))}
                        </div>
                        <div style="margin-bottom: 10px;">
                            <strong style="color: #fff;">A:</strong> ${this.formatContent(this.toProperCase(card.back))}
                        </div>
                        <div style="color: #3b82f6; font-size: 12px; text-align: center; margin-top: 10px; padding-top: 10px; border-top: 1px solid #333;">
                            Click to highlight source node on tree
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add click handlers for flashcards to highlight source nodes
        const flashcardElements = modal.querySelectorAll('.flashcard');
        flashcardElements.forEach(card => {
            card.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent modal close
                const nodePosition = JSON.parse(card.dataset.nodePosition);
                this.game.flashcardManager.highlightNodeAtPosition(nodePosition);
                // Don't close modal - let user continue using the highlight button
            });
        });
        
        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    formatContent(text) {
        if (!text) return 'No description available';
        
        // Convert markdown-style bold (**text**) to HTML bold
        let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Convert URLs to clickable links
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        formatted = formatted.replace(urlRegex, '<a href="$1" target="_blank" style="color: #3b82f6; text-decoration: underline;">$1</a>');
        
        // Handle paragraph breaks - split on double newlines, periods followed by space and capital letter, or long sentences
        let paragraphs = formatted.split(/\n\s*\n/).filter(p => p.trim().length > 0);
        
        // If no double newlines, try splitting on sentence boundaries for very long text
        if (paragraphs.length === 1 && formatted.length > 200) {
            paragraphs = formatted.split(/\.\s+(?=[A-Z])/).filter(p => p.trim().length > 0);
        }
        
        // Wrap each paragraph in <p> tags
        if (paragraphs.length > 1) {
            formatted = paragraphs.map(p => `<p>${p.trim()}</p>`).join('');
        } else {
            // Single paragraph, just wrap it
            formatted = `<p>${formatted.trim()}</p>`;
        }
        
        return formatted;
    }
    
    toProperCase(str) {
        if (!str) return '';
        return str.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    }
}
