/**
 * Flashcard Manager - Manages flashcard creation, storage, and display
 */
class FlashcardManager {
    constructor(game) {
        this.game = game;
    }
    
    async createFlashcardsForNode(node) {
        try {
            // Find the branch that corresponds to this node
            const branch = this.game.tree.branches.find(b => 
                Math.abs(b.end.x - node.x) < 8 && Math.abs(b.end.y - node.y) < 8
            );
            
            if (!branch || !branch.searchResult) {
                this.game.uiManager.updateStatus('No search data available for this node');
                return;
            }
            
            console.log('Branch search result:', branch.searchResult);
            
            // Validate search result data
            if (!branch.searchResult.title || (!branch.searchResult.llm_content && !branch.searchResult.snippet)) {
                this.game.uiManager.updateStatus('Insufficient search data for flashcard creation');
                console.error('Invalid search result data:', branch.searchResult);
                return;
            }
            
            // Show loading message
            this.game.uiManager.showLoadingMessage('Loading flashcards...');
            
            // Get the correct coordinates (node might have x,y or end.x,end.y)
            const nodeX = node.x || node.end?.x || 0;
            const nodeY = node.y || node.end?.y || 0;
            
            // Add visual leaves to the tree first (immediate feedback)
            this.addLeavesToNode(node, 5); // Add 5 leaves immediately
            console.log('Added leaves to node, total leaves now:', this.game.tree.leaves.length);
            
        // Use the unified endpoint that works with both database and frontend data
        const flashcardData = {
                    search_result: branch.searchResult,
            count: 5,
            node_position: { x: nodeX, y: nodeY } // Include node position for linking
        };
            
            console.log('CACHE BUSTED: Sending flashcard request with data:', flashcardData);
            console.log('Node position being stored:', { x: nodeX, y: nodeY });
            
            const response = await fetch('http://localhost:8001/api/create-flashcards', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
                },
                body: JSON.stringify(flashcardData)
            });
            
            console.log('Response status:', response.status);
            console.log('Response headers:', response.headers);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const responseText = await response.text();
            console.log('Raw response text:', responseText);
            
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (parseError) {
                console.error('JSON parse error:', parseError);
                console.error('Response text that failed to parse:', responseText);
                throw new Error('Failed to parse JSON response');
            }
            
            console.log('Flashcard creation response:', data);
            
            if (data.success) {
                // Add branch reference to each flashcard
                const flashcardsWithBranch = data.flashcards.map(flashcard => ({
                    ...flashcard,
                    branch: branch // Add branch reference for pruning
                }));
                
                this.game.flashcards = [...this.game.flashcards, ...flashcardsWithBranch];
                this.game.uiManager.updateStatus(`Created ${data.flashcards.length} flashcards for ${branch.searchResult.title}`);
                console.log('Flashcards created:', flashcardsWithBranch);
                console.log('Total flashcards now:', this.game.flashcards.length);
                
                // Show success message
                this.game.uiManager.showLoadingMessage('Flashcards ready!');
                setTimeout(() => this.game.uiManager.hideLoadingMessage(), 2000); // Hide after 2 seconds
                
                // Update the flashcard deck display (no popup)
                this.updateFlashcardDeck();
            } else {
                console.error('Failed to create flashcards:', data.error);
                this.game.uiManager.updateStatus(`Failed to create flashcards: ${data.error}`);
                this.game.uiManager.hideLoadingMessage();
            }
            
        } catch (error) {
            console.error('Error creating flashcards:', error);
            this.game.uiManager.updateStatus('Error creating flashcards');
            this.game.uiManager.hideLoadingMessage();
        }
    }
    
    addLeavesToNode(node, count) {
        // Get the correct coordinates (node might have x,y or end.x,end.y)
        const nodeX = node.x || node.end?.x || 0;
        const nodeY = node.y || node.end?.y || 0;
        
        // Find the branch this node belongs to
        const branch = this.game.tree.branches.find(branch => 
            Math.abs(branch.end.x - nodeX) < 5 && 
            Math.abs(branch.end.y - nodeY) < 5
        );
        
        if (!branch) {
            console.log('No branch found for node, creating standalone leaves');
            // Add visual leaves around the node without branch reference
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const distance = 15 + Math.random() * 10; // 15-25 pixels from node
                const leafX = nodeX + Math.cos(angle) * distance;
                const leafY = nodeY + Math.sin(angle) * distance;
            
            this.game.tree.leaves.push({
                x: leafX,
                y: leafY,
                    size: 8 + Math.random() * 4, // 8-12 size
                sway: Math.random() * Math.PI * 2,
                    angle: Math.random() * Math.PI * 2,
                    branch: null // No branch reference
                });
            }
            return;
        }
        
        // Add leaves along the branch (similar to growLeavesOnNode)
        for (let i = 0; i < count; i++) {
            const t = (i + 1) / (count + 1); // Position along branch (0-1)
            const leafX = branch.start.x + (branch.end.x - branch.start.x) * t;
            const leafY = branch.start.y + (branch.end.y - branch.start.y) * t;
            
            const offsetX = (Math.random() - 0.5) * 6;
            const offsetY = (Math.random() - 0.5) * 6;
            
            this.game.tree.leaves.push({
                x: leafX + offsetX,
                y: leafY + offsetY,
                size: 8 + Math.random() * 8, // 8-16 pixels (same as growLeavesOnNode)
                angle: Math.random() * Math.PI * 2,
                sway: Math.random() * Math.PI * 2,
                branch: branch, // Store reference to the branch
                t: t, // Store position along branch (0-1)
                offsetX: offsetX,
                offsetY: offsetY
            });
        }
    }
    
    updateFlashcardDeck() {
        // Create or update the flashcard deck button
        let deckElement = document.getElementById('flashcard-deck');
        if (!deckElement) {
            deckElement = document.createElement('div');
            deckElement.id = 'flashcard-deck';
            deckElement.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 20px;
                z-index: 100;
            `;
            document.body.appendChild(deckElement);
        }
        
        if (this.game.flashcards.length === 0) {
            deckElement.innerHTML = '';
            return;
        }
        
        // Group flashcards by main topic (parent node) categories
        const groupedFlashcards = {};
        console.log('Grouping flashcards:', this.game.flashcards.length, 'total cards');
        this.game.flashcards.forEach(card => {
            // Find the branch this flashcard was created from
            const branch = card.branch;
            let mainTopic = 'General';
            
            console.log('Processing flashcard:', card.front, 'branch:', branch);
            
            if (branch && branch.searchResult) {
                console.log('Branch has searchResult:', branch.searchResult.title, 'generation:', branch.generation);
                // Always try to find the parent main topic branch first
                const parentBranch = this.findParentMainTopicBranch(branch);
                if (parentBranch && parentBranch.searchResult) {
                    mainTopic = parentBranch.searchResult.title;
                    console.log('Using parent main topic branch title:', mainTopic);
                } else if (branch.generation === 0 || branch.generation === 1) {
                    // If this is already a main topic branch, use its title
                    mainTopic = branch.searchResult.title;
                    console.log('Using current branch as main topic (generation 0/1):', mainTopic);
                } else {
                    // Fallback to current branch title
                    mainTopic = branch.searchResult.title;
                    console.log('Using fallback branch title as main topic:', mainTopic);
                }
            } else {
                mainTopic = card.category || 'General';
                console.log('Using card category as main topic:', mainTopic);
            }
            
            if (!groupedFlashcards[mainTopic]) {
                groupedFlashcards[mainTopic] = [];
            }
            groupedFlashcards[mainTopic].push(card);
        });
        
        console.log('Grouped flashcards:', groupedFlashcards);
        
        const totalCards = this.game.flashcards.length;
        const totalDecks = Object.keys(groupedFlashcards).length;
        
        // Create simple button that shows deck view when clicked
        deckElement.innerHTML = `
            <button onclick="app.game.uiManager.showDeckView()" style="
                background: rgba(26, 26, 26, 0.95);
                border: 2px solid #333;
                border-radius: 10px;
                padding: 12px 20px;
                color: white;
                font-family: 'Inter', sans-serif;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                transition: background 0.2s;
            " onmouseover="this.style.background='rgba(40, 40, 40, 0.95)'" onmouseout="this.style.background='rgba(26, 26, 26, 0.95)'">
                📚 Flashcard Decks (${totalDecks} decks, ${totalCards} cards)
            </button>
        `;
    }
    
    findParentMainTopicBranch(childBranch) {
        // Find the parent main topic branch by traversing up the tree using parent relationships
        // Main topic branches are generation 0 or 1
        let currentBranch = childBranch;
        console.log('Finding parent main topic for branch:', childBranch.searchResult?.title, 'generation:', childBranch.generation);
        
        while (currentBranch) {
            // Check if this is a main topic branch
            if (currentBranch.generation === 0 || currentBranch.generation === 1) {
                console.log('Found main topic branch:', currentBranch.searchResult?.title, 'generation:', currentBranch.generation);
                return currentBranch;
            }
            
            // Use the parent relationship instead of coordinate matching
            if (currentBranch.parent) {
                console.log('Found parent branch:', currentBranch.parent.searchResult?.title, 'generation:', currentBranch.parent.generation);
                currentBranch = currentBranch.parent;
            } else {
                console.log('No parent branch found for:', currentBranch.searchResult?.title);
                break; // No parent found
            }
        }
        
        console.log('No main topic branch found for:', childBranch.searchResult?.title);
        return null; // No main topic branch found
    }
    
    showFlashcardsForTopic(topic) {
        // Find flashcards for this specific topic
        const topicFlashcards = this.game.flashcards.filter(card => 
            card.category === topic
        );
        
        if (topicFlashcards.length === 0) {
            this.game.uiManager.updateStatus('No flashcards found for this topic');
            return;
        }
        
        // Close the study modal first
        this.game.uiManager.hideStudyModal();
        
        // Show the flashcards for this topic
        this.game.uiManager.showFlashcards(topicFlashcards, topic);
    }
    
    highlightNodeAtPosition(nodePosition) {
        console.log('Attempting to highlight node at position:', nodePosition);
        if (!nodePosition || !nodePosition.x || !nodePosition.y) {
            console.warn('Invalid node position for highlighting:', nodePosition);
            return;
        }
        
        // Close all deck modals
        this.closeAllDeckModals();
        
        console.log('Available branches:', this.game.tree.branches.length);
        console.log('Branch positions:', this.game.tree.branches.map(b => ({ x: b.end.x, y: b.end.y })));
        
        // Find the node at the given position (increased tolerance)
        const targetNode = this.game.tree.branches.find(branch => {
            const distanceX = Math.abs(branch.end.x - nodePosition.x);
            const distanceY = Math.abs(branch.end.y - nodePosition.y);
            console.log(`Checking branch at (${branch.end.x}, ${branch.end.y}) vs target (${nodePosition.x}, ${nodePosition.y}) - distances: ${distanceX}, ${distanceY}`);
            return distanceX < 20 && distanceY < 20;
        });
        
        if (!targetNode) {
            console.warn('No node found at position:', nodePosition);
            console.log('Tried to find node within 20 pixels of:', nodePosition);
            this.game.uiManager.updateStatus('Source node not found on tree');
            return;
        }
        
        console.log('Found target node:', targetNode);
        
        // Center the camera on the target node
        this.game.cameraOffset.x = -targetNode.end.x + this.game.canvas.width / 2;
        this.game.cameraOffset.y = -targetNode.end.y + this.game.canvas.height / 2;
        
        // Add a temporary highlight effect
        this.game.highlightedNode = targetNode;
        this.game.highlightStartTime = Date.now();
        
        // Clear any existing highlight timeout
        if (this.game.highlightTimeout) {
            clearTimeout(this.game.highlightTimeout);
        }
        
        // Remove highlight after 3 seconds
        this.game.highlightTimeout = setTimeout(() => {
            this.game.highlightedNode = null;
            this.game.highlightStartTime = null;
        }, 3000);
        
        this.game.uiManager.updateStatus(`Highlighted source node: ${targetNode.searchResult.title}`);
    }
    
    closeAllDeckModals() {
        // Close all deck-related modals
        const deckModals = document.querySelectorAll('.deck-view-modal, .deck-flashcards-modal, .flashcard-modal, .all-flashcards-modal');
        deckModals.forEach(modal => modal.remove());
    }
}
