/**
 * Main Game Class - Handles the core game logic and rendering
 */
class UltraSimplePrune {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Game state
        this.gameState = 'initialized';
        this.currentTool = 'growth';
        
        // Mouse and interaction
        this.mousePos = { x: 0, y: 0 };
        this.isDragging = false;
        this.dragStart = null;
        this.dragEnd = null;
        this.isRepositioning = false;
        this.repositioningNode = null;
        this.isNightMode = false;
        this.hoveredNode = null;
        
        // Pan functionality
        this.isPanning = false;
        this.panStart = null;
        this.cameraOffset = { x: 0, y: 0 };
        
        // Game objects
        this.tree = null;
        this.lightSource = null;
        
        // Animation
        this.lastTime = 0;
        this.branchCount = 0;
        
        // Welcome sequence state
        this.welcomeSequence = {
            isActive: false,
            hasShownPrompt: false,
            targetPanY: 0,
            originalPanY: 0,
            animationSpeed: 2
        };
        
        // Search results storage
        this.searchResults = [];
        this.originalSearchQuery = null;
        this.usedSearchResults = new Set(); // Track used search result titles to avoid duplicates
        this.currentSessionId = null; // Track current saved session ID
        this.flashcards = []; // Store flashcards for current session
        this.isLoadingGame = false; // Flag to track when loading a saved game
        
        // Initialize managers (will be set by app.js)
        this.uiManager = null;
        this.flashcardManager = null;
        
        this.init();
    }
    
    init() {
        console.log('Initializing game...');
        
        
        this.resizeCanvas();
        window.addEventListener('resize', () => { this.resizeCanvas(); });
        
        this.setupGameObjects();
        this.setupEventListeners();
        this.startGame();
        
        this.gameLoop();
    }
    
    resizeCanvas() {
        const headerHeight = 60;
        const oldWidth = this.width || 0;
        const oldHeight = this.height || 0;
        
        this.width = window.innerWidth;
        this.height = window.innerHeight - headerHeight;
        
        // Store initial height for fixed ground positioning
        if (!this.initialHeight) {
            this.initialHeight = this.height;
        }
        
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        
        if (this.tree) {
            // Store old position before updating
            this.tree.oldX = this.tree.x || 0;
            this.tree.oldY = this.tree.y || 0;
            
            this.tree.x = this.width / 2;
            this.tree.y = this.initialHeight - 40;
            
            // Only update positions if this is not the first resize (when oldTreeX/Y are 0)
            if (this.tree.oldX !== 0 || this.tree.oldY !== 0) {
                this.repositionTreeAssets();
            }
        }
        
        if (this.lightSource) {
            this.lightSource.x = this.width / 2;
        }
        
    }
    
    setupGameObjects() {
        this.tree = {
            x: this.width / 2,
            y: this.initialHeight - 40,
            trunkHeight: 80,
            branches: [],
            leaves: [],
            fruits: [],
            flowers: []
        };
        
        this.lightSource = {
            x: this.width / 2,
            y: 80,
            radius: 25
        };
        
        // If we have existing branches (from loaded game), reposition them relative to the new tree position
        if (this.tree.branches.length > 0) {
            this.repositionTreeAssets();
        }
    }
    
    setupEventListeners() {
        document.getElementById('growthTool').addEventListener('click', () => {
            this.setTool('growth');
        });
        
        document.getElementById('cutTool').addEventListener('click', () => {
            this.setTool('cut');
        });
        
        document.getElementById('leavesTool').addEventListener('click', () => {
            this.setTool('leaves');
        });
        
        document.getElementById('fruitTool').addEventListener('click', () => {
            this.setTool('fruit');
        });
        
        document.getElementById('flowerTool').addEventListener('click', () => {
            this.setTool('flower');
        });
        
        document.getElementById('repositionTool').addEventListener('click', () => {
            this.setTool('reposition');
        });
        
        document.getElementById('panTool').addEventListener('click', () => {
            this.setTool('pan');
        });
        
        document.getElementById('studyTool').addEventListener('click', () => {
            this.setTool('study');
        });
        
        document.getElementById('restartBtn').addEventListener('click', () => {
            this.restartGame();
        });
        
        document.getElementById('dayNightBtn').addEventListener('click', () => {
            this.toggleDayNight();
        });
        
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    }
    
    startGame() {
        console.log('Starting game...');
        this.gameState = 'playing';
        
        // Only show welcome sequence if there are no branches AND we're not loading a game
        if (this.tree.branches.length === 0 && !this.isLoadingGame) {
        this.startWelcomeSequence();
        }
        
        this.loadLeavesFromSavedData();
    }
    
    loadLeavesFromSavedData() {
        // Simple: if there are leaves in the tree data, show them
        if (this.tree.leaves && this.tree.leaves.length > 0) {
            console.log('Loading', this.tree.leaves.length, 'leaves from saved data');
            // Leaves are already in the tree, just need to render them
        }
    }
    
    setTool(tool) {
        this.currentTool = tool;
        
        document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
        this.canvas.style.cursor = 'default';
        
        if (tool === 'growth') {
            document.getElementById('growthTool').classList.add('active');
        } else if (tool === 'cut') {
            document.getElementById('cutTool').classList.add('active');
        } else if (tool === 'leaves') {
            document.getElementById('leavesTool').classList.add('active');
        } else if (tool === 'fruit') {
            document.getElementById('fruitTool').classList.add('active');
        } else if (tool === 'flower') {
            document.getElementById('flowerTool').classList.add('active');
        } else if (tool === 'reposition') {
            document.getElementById('repositionTool').classList.add('active');
        } else if (tool === 'pan') {
            document.getElementById('panTool').classList.add('active');
            this.canvas.style.cursor = 'grab';
        } else if (tool === 'study') {
            document.getElementById('studyTool').classList.add('active');
            this.canvas.style.cursor = 'pointer';
        }
        
        console.log('Tool set to:', tool);
    }
    
    async handleMouseDown(e) {
        if (this.gameState !== 'playing') return;
        
        const rect = this.canvas.getBoundingClientRect();
        this.mousePos = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        if (this.currentTool === 'pan') {
            this.isPanning = true;
            this.panStart = { ...this.mousePos };
            this.canvas.style.cursor = 'grabbing';
        } else if (this.currentTool === 'growth') {
            if (this.hoveredNode) {
                this.growBranchesFromNode(this.hoveredNode);
            }
        } else if (this.currentTool === 'leaves') {
            if (this.hoveredNode) {
                console.log('Leaves tool: clicked on hovered node', this.hoveredNode);
                // Create flashcards AND visual leaves
                if (this.flashcardManager) {
                    await this.flashcardManager.createFlashcardsForNode(this.hoveredNode);
                } else {
                    this.updateStatus('Flashcard manager not initialized yet');
                }
            } else {
                console.log('Leaves tool: no hovered node');
                this.updateStatus('Hover over a node first, then click to create flashcards!');
            }
        } else if (this.currentTool === 'fruit') {
            if (this.hoveredNode) {
                console.log('Fruit tool: clicked on hovered node', this.hoveredNode);
                this.transformFlowerToFruit(this.hoveredNode);
            } else {
                console.log('Fruit tool: no hovered node');
                this.updateStatus('Hover over a flower first, then click to transform it into fruit!');
            }
        } else if (this.currentTool === 'flower') {
            if (this.hoveredNode) {
                console.log('Flower tool: clicked on hovered node', this.hoveredNode);
                this.growFlowerOnNode(this.hoveredNode);
            } else {
                console.log('Flower tool: no hovered node');
                this.updateStatus('Hover over an end node first, then click to blossom knowledge!');
            }
        } else if (this.currentTool === 'reposition') {
            if (this.hoveredNode) {
                this.isRepositioning = true;
                this.repositioningNode = this.hoveredNode;
                console.log('Repositioning node:', this.hoveredNode);
                this.updateStatus('Drag to move and resize the branch!');
            } else {
                this.updateStatus('Hover over a branch end first, then drag to reposition!');
            }
        } else if (this.currentTool === 'cut') {
            this.isDragging = true;
            this.dragStart = { ...this.mousePos };
        } else if (this.currentTool === 'study') {
            if (this.hoveredNode && this.hoveredNode.searchResult) {
                if (this.uiManager) {
                    this.uiManager.showStudyModal(this.hoveredNode.searchResult);
                } else {
                    this.updateStatus('UI manager not initialized yet');
                }
            }
        }
        
        console.log('Mouse down at:', this.mousePos);
    }
    
    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.mousePos = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        if (this.isPanning && this.panStart) {
            const deltaX = this.mousePos.x - this.panStart.x;
            const deltaY = this.mousePos.y - this.panStart.y;
            
            this.cameraOffset.x += deltaX;
            this.cameraOffset.y += deltaY;
            
            // Prevent panning below ground level (ground is at initialHeight - 40)
            const maxPanUp = this.initialHeight - 40; // Can't pan up more than ground level
            if (this.cameraOffset.y > maxPanUp) {
                this.cameraOffset.y = maxPanUp;
            }
            
            this.panStart = { ...this.mousePos };
        } else if (this.currentTool === 'growth' || this.currentTool === 'leaves' || this.currentTool === 'fruit' || this.currentTool === 'flower' || this.currentTool === 'reposition' || this.currentTool === 'study' || this.currentTool === 'pan') {
            this.hoveredNode = this.getNodeAtPosition(this.mousePos);
        }
        
        if (this.currentTool === 'cut' && this.isDragging) {
            this.dragEnd = { ...this.mousePos };
        }
        
        if (this.isRepositioning && this.repositioningNode) {
            this.repositionNode(this.mousePos);
        }
    }
    
    handleMouseUp(e) {
        if (this.gameState !== 'playing') return;
        
        if (this.isDragging) {
            this.dragEnd = { ...this.mousePos };
            this.performPruning();
            this.isDragging = false;
            this.dragStart = null;
            this.dragEnd = null;
            console.log('Mouse up - pruning performed');
        }
        
        if (this.isRepositioning) {
            this.isRepositioning = false;
            this.repositioningNode = null;
            console.log('Mouse up - repositioning finished');
        }
        
        if (this.isPanning) {
            this.isPanning = false;
            this.panStart = null;
            this.canvas.style.cursor = 'default';
        }
    }
    
    updateStatus(message) {
        if (this.uiManager) {
            this.uiManager.updateStatus(message);
        } else {
            // Fallback for when uiManager is not yet initialized
            const statusElement = document.getElementById('status');
            if (statusElement) {
                statusElement.textContent = message;
            }
        }
    }
    
    gameLoop() {
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        this.update(deltaTime);
        
        // Use renderer if available, otherwise use basic render
        if (this.renderer) {
            this.renderer.render();
        } else {
            this.render();
        }
        
        requestAnimationFrame(() => this.gameLoop());
    }
    
    update(deltaTime) {
        if (this.gameState !== 'playing') return;
        
        this.tree.branches.forEach(branch => {
            const growthRate = 1.5 + Math.random() * 0.7;
            branch.length += growthRate * deltaTime * 0.01;
            
            if (branch.length > branch.maxLength) {
                branch.length = branch.maxLength;
            }
            
            const angle = Math.atan2(branch.end.y - branch.start.y, branch.end.x - branch.start.x);
            branch.end.x = branch.start.x + Math.cos(angle) * branch.length;
            branch.end.y = branch.start.y + Math.sin(angle) * branch.length;
        });
        
        // Light source collision check removed
    }
    
    // Light source collision check removed - no win condition
    
    getNodeAtPosition(pos) {
        // Adjust position for camera offset
        const adjustedPos = {
            x: pos.x - this.cameraOffset.x,
            y: pos.y - this.cameraOffset.y
        };
        
        const trunkPoint = { x: this.tree.x, y: this.tree.y - this.tree.trunkHeight };
        
        if (Math.abs(adjustedPos.x - trunkPoint.x) < 8 && Math.abs(adjustedPos.y - trunkPoint.y) < 8) {
            // For any tool, return the trunk with original search query if available
            if (this.originalSearchQuery) {
                return { 
                    x: trunkPoint.x, 
                    y: trunkPoint.y, 
                    searchResult: {
                        title: this.originalSearchQuery,
                        snippet: this.originalSearchQuery, // Just the title for tooltip
                        llm_content: `This is your main topic: ${this.originalSearchQuery}. The branches below represent the 5 primary areas within this field.`
                    }
                };
            }
            return trunkPoint;
        }
        
        // Check for flowers first (if fruit tool is active)
        if (this.currentTool === 'fruit') {
            for (let flower of this.tree.flowers) {
                if (Math.abs(adjustedPos.x - flower.x) < 12 && Math.abs(adjustedPos.y - flower.y) < 12) {
                    return { x: flower.x, y: flower.y, isFlower: true, flower: flower };
                }
            }
        }
        
        for (let branch of this.tree.branches) {
            if (branch.length >= branch.maxLength) {
                if (Math.abs(adjustedPos.x - branch.end.x) < 8 && Math.abs(adjustedPos.y - branch.end.y) < 8) {
                    // For any tool, return the branch object so we can access searchResult
                    if (branch.searchResult) {
                        console.log('Tool found branch with search result:', branch.searchResult);
                        return { x: branch.end.x, y: branch.end.y, searchResult: branch.searchResult };
                    }
                    return { x: branch.end.x, y: branch.end.y };
                }
            }
        }
        
        return null;
    }
    
    growBranchesFromNode(node) {
        console.log('Growing branches from node:', node);
        
        const existingBranches = this.tree.branches.filter(branch => {
            return Math.abs(branch.start.x - node.x) < 5 && 
                   Math.abs(branch.start.y - node.y) < 5;
        });
        
        if (existingBranches.length >= 6) {
            this.updateStatus('Maximum branches reached for this node!');
            return;
        }
        
        // Check if this is the trunk top and it's the first growth
        const trunkTop = {
            x: this.tree.x,
            y: this.tree.y - this.tree.trunkHeight
        };
        const isTrunkTop = Math.abs(node.x - trunkTop.x) < 5 && Math.abs(node.y - trunkTop.y) < 5;
        
        if (isTrunkTop && existingBranches.length === 0) {
            // First growth from trunk - create 5 evenly spaced branches
            this.createInitialFanBranches(node);
        } else {
            // Normal growth - random number of branches
            const branchCount = 3 + Math.floor(Math.random() * 3);
            
            // Create branches first
            const newBranches = [];
            for (let i = 0; i < branchCount; i++) {
                const branch = this.addBranchFromNode(node);
                newBranches.push(branch);
            }
            
            // Trigger web search for the new branches
            this.triggerWebSearchForBranches(this.hoveredNode, newBranches);
            
            this.updateStatus(`Grew ${branchCount} branches from node!`);
        }
    }
    
    createInitialFanBranches(node) {
        const branchCount = 5;
        const angleSpread = Math.PI * 0.8; // 144 degrees total spread
        const startAngle = -angleSpread / 2; // Start from -72 degrees
        
        // Always use the current trunk top position to ensure branches are attached to the trunk
        const trunkTop = {
            x: this.tree.x,
            y: this.tree.y - this.tree.trunkHeight
        };
        
        for (let i = 0; i < branchCount; i++) {
            const angle = startAngle + (angleSpread / (branchCount - 1)) * i;
            const length = 120 + Math.random() * 60; // 120-180 pixels (even longer and more varied)
            
            // Adjust angle to grow upward (subtract π/2 to rotate 90 degrees counterclockwise)
            const upwardAngle = angle - Math.PI / 2;
            
            const branch = {
                start: { x: trunkTop.x, y: trunkTop.y },
                end: {
                    x: trunkTop.x + Math.cos(upwardAngle) * length,
                    y: trunkTop.y + Math.sin(upwardAngle) * length
                },
                length: 0,
                maxLength: length,
                angle: upwardAngle,
                thickness: 15, // Thick initial branches
                generation: 1,
                parent: null
            };
            
            this.tree.branches.push(branch);
        }
        
        // Assign search results to the 5 initial branches
        console.log('Assigning search results to branches. Search results:', this.searchResults);
        console.log('Available branches:', this.tree.branches.length);
        if (this.searchResults && this.searchResults.length > 0) {
            const lastFiveBranches = this.tree.branches.slice(-5);
            console.log('Last 5 branches:', lastFiveBranches);
            lastFiveBranches.forEach((branch, index) => {
                if (this.searchResults[index]) {
                    branch.searchResult = this.searchResults[index];
                    console.log(`Assigned search result ${index} to branch:`, branch.searchResult);
                }
            });
        } else {
            console.log('No search results available to assign');
        }
        
        this.updateStatus(`Grew ${branchCount} branches from trunk!`);
    }
    
    addBranchFromNode(startPoint) {
        const baseLength = 25 + Math.random() * 40;
        const maxLength = baseLength * (2.0 + Math.random() * 1.5);
        
        let angle;
        let parentBranch = null;
        if (Math.abs(startPoint.x - this.tree.x) < 5 && 
            Math.abs(startPoint.y - (this.tree.y - this.tree.trunkHeight)) < 5) {
            angle = (Math.random() - 0.5) * Math.PI * 1.2 - Math.PI * 0.1;
        } else {
            parentBranch = this.tree.branches.find(b => 
                Math.abs(b.end.x - startPoint.x) < 5 && 
                Math.abs(b.end.y - startPoint.y) < 5
            );
            const parentAngle = parentBranch ? 
                Math.atan2(parentBranch.end.y - parentBranch.start.y, parentBranch.end.x - parentBranch.start.x) : 
                0;
            angle = parentAngle + (Math.random() - 0.5) * Math.PI * 0.8;
        }
        
        const thickness = this.calculateBranchThicknessFromParent(startPoint);
        
        const branch = {
            start: { x: startPoint.x, y: startPoint.y },
            end: { 
                x: startPoint.x + Math.cos(angle) * baseLength, 
                y: startPoint.y + Math.sin(angle) * baseLength 
            },
            length: baseLength,
            maxLength: maxLength,
            thickness: thickness,
            generation: parentBranch ? parentBranch.generation + 1 : 1,
            parent: parentBranch
        };
        
        this.tree.branches.push(branch);
        return branch;
    }
    
    calculateBranchThicknessFromParent(startPoint) {
        if (Math.abs(startPoint.x - this.tree.x) < 5 && 
            Math.abs(startPoint.y - (this.tree.y - this.tree.trunkHeight)) < 5) {
            return 10;
        }
        
        const parentBranch = this.tree.branches.find(b => 
            Math.abs(b.end.x - startPoint.x) < 5 && 
            Math.abs(b.end.y - startPoint.y) < 5
        );
        
        if (parentBranch) {
            const parentThickness = parentBranch.thickness || 5;
            // More aggressive thinning: reduce by 2-3 instead of 1, with minimum of 1
            const reduction = parentThickness > 6 ? 3 : 2;
            const newThickness = Math.max(1, parentThickness - reduction);
            return newThickness;
        }
        
        return 5;
    }
    
    growLeavesOnNode(node) {
        console.log('Growing leaves on node at:', node.x, node.y);
        
        const branchesFromNode = this.tree.branches.filter(branch => {
            return Math.abs(branch.start.x - node.x) < 5 && 
                   Math.abs(branch.start.y - node.y) < 5;
        });
        
        if (branchesFromNode.length === 0) {
            this.updateStatus('No branches found at this node!');
            return;
        }
        
        let leavesAdded = 0;
        branchesFromNode.forEach(branch => {
            const leafCount = 2 + Math.floor(Math.random() * 3);
            
            for (let i = 0; i < leafCount; i++) {
                const t = (i + 1) / (leafCount + 1);
                const leafX = branch.start.x + (branch.end.x - branch.start.x) * t;
                const leafY = branch.start.y + (branch.end.y - branch.start.y) * t;
                
                const offsetX = (Math.random() - 0.5) * 6;
                const offsetY = (Math.random() - 0.5) * 6;
                
                this.tree.leaves.push({
                    x: leafX + offsetX,
                    y: leafY + offsetY,
                    size: 8 + Math.random() * 8, // 8-16 pixels (much bigger)
                    angle: Math.random() * Math.PI * 2,
                    sway: Math.random() * Math.PI * 2,
                    branch: branch, // Store reference to the branch
                    t: t, // Store position along branch (0-1)
                    offsetX: offsetX,
                    offsetY: offsetY
                });
                leavesAdded++;
            }
        });
        
        this.updateStatus(`Grew ${leavesAdded} leaves on ${branchesFromNode.length} branches!`);
    }
    
    transformFlowerToFruit(node) {
        console.log('Transforming flower to fruit at:', node.x, node.y);
        
        // Check if we clicked on a flower
        if (!node.isFlower || !node.flower) {
            this.updateStatus('Bear fruit of labour only works on flowers! Click on a flower to transform it.');
            return;
        }
        
        const flower = node.flower;
        
        // Check if fruit already exists on this node
        const existingFruit = this.tree.fruits.find(fruit => {
            return Math.abs(fruit.x - flower.x) < 10 && Math.abs(fruit.y - flower.y) < 10;
        });
        
        if (existingFruit) {
            this.updateStatus('Fruit already exists on this branch end!');
            return;
        }
        
        // Remove the flower
        this.tree.flowers = this.tree.flowers.filter(f => f !== flower);
        
        // Create fruit (always apple) at the same position
        const fruitType = '🍎';
        
        this.tree.fruits.push({
            x: flower.x,
            y: flower.y,
            type: fruitType,
            size: 36 + Math.random() * 16, // 36-52 pixels (even bigger)
            sway: Math.random() * Math.PI * 2,
            branch: flower.branch
        });
        
        this.updateStatus(`Transformed ${flower.type} into ${fruitType} - fruit of labour!`);
    }
    
    growFlowerOnNode(node) {
        console.log('Growing flower on node at:', node.x, node.y);
        
        // Check if this is an end node (not the trunk)
        const trunkPoint = { x: this.tree.x, y: this.tree.y - this.tree.trunkHeight };
        if (Math.abs(node.x - trunkPoint.x) < 5 && Math.abs(node.y - trunkPoint.y) < 5) {
            this.updateStatus('Flowers can only grow on branch ends, not the trunk!');
            return;
        }
        
        // Check if this node is actually a branch end
        const isEndNode = this.tree.branches.some(branch => {
            return Math.abs(branch.end.x - node.x) < 5 && 
                   Math.abs(branch.end.y - node.y) < 5 &&
                   branch.length >= branch.maxLength; // Only on fully grown branches
        });
        
        if (!isEndNode) {
            this.updateStatus('Flowers can only grow on fully grown branch ends!');
            return;
        }
        
        // Check if flower already exists on this node
        const existingFlower = this.tree.flowers.find(flower => {
            return Math.abs(flower.x - node.x) < 10 && Math.abs(flower.y - node.y) < 10;
        });
        
        if (existingFlower) {
            this.updateStatus('Flower already exists on this branch end!');
            return;
        }
        
        // Create flower
        const flowerTypes = ['🌸', '🌺', '🌼'];
        const flowerType = flowerTypes[Math.floor(Math.random() * flowerTypes.length)];
        
        this.tree.flowers.push({
            x: node.x,
            y: node.y,
            type: flowerType,
            size: 28 + Math.random() * 12, // 28-40 pixels (even bigger)
            sway: Math.random() * Math.PI * 2,
            branch: this.tree.branches.find(branch => 
                Math.abs(branch.end.x - node.x) < 5 && 
                Math.abs(branch.end.y - node.y) < 5
            )
        });
        
        this.updateStatus(`Blossomed knowledge with ${flowerType} on branch end!`);
    }
    
    // Flowers no longer fall off when growing branches
    
    // Basic render method as fallback
    render() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Basic rendering - just clear the canvas for now
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Render a simple tree trunk
        if (this.tree) {
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 20;
            this.ctx.beginPath();
            this.ctx.moveTo(this.tree.x, this.tree.y);
            this.ctx.lineTo(this.tree.x, this.tree.y - this.tree.trunkHeight);
            this.ctx.stroke();
        }
    }
    
    repositionNode(newPos) {
        if (!this.repositioningNode) return;
        
        // Adjust position for camera offset
        const adjustedPos = {
            x: newPos.x - this.cameraOffset.x,
            y: newPos.y - this.cameraOffset.y
        };
        
        const trunkPoint = { x: this.tree.x, y: this.tree.y - this.tree.trunkHeight };
        
        if (Math.abs(this.repositioningNode.x - trunkPoint.x) < 5 && 
            Math.abs(this.repositioningNode.y - trunkPoint.y) < 5) {
            this.updateStatus('Cannot reposition the trunk!');
            return;
        }
        
        const branchToReposition = this.tree.branches.find(branch => {
            return Math.abs(branch.end.x - this.repositioningNode.x) < 5 && 
                   Math.abs(branch.end.y - this.repositioningNode.y) < 5;
        });
        
        if (branchToReposition) {
            // Calculate new length based on distance from start point (using adjusted position)
            const dx = adjustedPos.x - branchToReposition.start.x;
            const dy = adjustedPos.y - branchToReposition.start.y;
            const newLength = Math.sqrt(dx * dx + dy * dy);
            
            // Limit the length to reasonable bounds (minimum 5, maximum 200)
            const clampedLength = Math.max(5, Math.min(200, newLength));
            
            // Calculate the direction from start to new position
            const angle = Math.atan2(dy, dx);
            
            // Set new end position based on clamped length
            branchToReposition.end.x = branchToReposition.start.x + Math.cos(angle) * clampedLength;
            branchToReposition.end.y = branchToReposition.start.y + Math.sin(angle) * clampedLength;
            
            // Update the branch length
            branchToReposition.length = clampedLength;
            
            // Always update max length to match the new length (allows both shortening and lengthening)
            branchToReposition.maxLength = clampedLength;
            
            // Update child branches that start from this node
            this.tree.branches.forEach(childBranch => {
                if (Math.abs(childBranch.start.x - this.repositioningNode.x) < 5 && 
                    Math.abs(childBranch.start.y - this.repositioningNode.y) < 5) {
                    childBranch.start.x = branchToReposition.end.x;
                    childBranch.start.y = branchToReposition.end.y;
                }
            });
            
            // Update the repositioning node position
            this.repositioningNode.x = branchToReposition.end.x;
            this.repositioningNode.y = branchToReposition.end.y;
            
            // Update leaves attached to this branch
            this.updateLeavesOnBranch(branchToReposition);
        }
    }
    
    updateLeavesOnBranch(branch) {
        this.tree.leaves.forEach(leaf => {
            if (leaf.branch === branch) {
                // Recalculate leaf position based on new branch position
                const leafX = branch.start.x + (branch.end.x - branch.start.x) * leaf.t;
                const leafY = branch.start.y + (branch.end.y - branch.start.y) * leaf.t;
                
                leaf.x = leafX + leaf.offsetX;
                leaf.y = leafY + leaf.offsetY;
            }
        });
    }
    
    toggleDayNight() {
        this.isNightMode = !this.isNightMode;
        const btn = document.getElementById('dayNightBtn');
        const body = document.body;
        
        if (this.isNightMode) {
            btn.innerHTML = '<i class="fas fa-sun"></i>';
            btn.title = 'switch to day mode';
            btn.style.background = 'rgba(72, 61, 139, 0.9)'; // Purple for night
            body.classList.remove('day-mode');
            this.updateStatus('Switched to night mode - moon is out!');
        } else {
            btn.innerHTML = '<i class="fas fa-moon"></i>';
            btn.title = 'switch to night mode';
            btn.style.background = 'rgba(232, 213, 196, 0.9)'; // Slightly darker warm beige for day
            body.classList.add('day-mode');
            this.updateStatus('Switched to day mode - sun is shining!');
        }
    }
    
    startWelcomeSequence() {
        if (this.uiManager) {
            this.uiManager.startWelcomeSequence();
        } else {
            // Fallback for when uiManager is not yet initialized
            console.warn('uiManager not initialized yet, skipping welcome sequence');
        }
    }
    
    
    
    
    async fetchSearchResults(userInput) {
        console.log('Fetching search results for:', userInput);
        this.originalSearchQuery = userInput; // Store the original search query
        try {
            const response = await fetch('http://localhost:8001/api/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: userInput })
            });
            
            console.log('API response status:', response.status);
            const data = await response.json();
            console.log('API response data:', data);
            
            if (data.results) {
                this.searchResults = data.results;
                console.log('Search results stored:', this.searchResults);
                this.updateStatus(`Found ${data.results.length} topics! Use study tool to explore.`);
                
                // Now trigger the first growth with search results
                this.triggerFirstGrowth();
            }
        } catch (error) {
            console.error('Search error:', error);
            this.updateStatus('Search failed. Please try again.');
        }
    }
    
    
    triggerFirstGrowth() {
        // Trigger growth from the trunk (first node) - same as clicking the first node
        const trunkNode = { x: this.tree.x, y: this.tree.y - this.tree.trunkHeight };
        console.log('Triggering first growth, search results:', this.searchResults);
        this.growBranchesFromNode(trunkNode);
        this.updateStatus('Tree ready! Use growth tool to grow branches, cut tool to prune them.');
    }
    
    restartGame() {
        console.log('Restarting game...');
        // Clear all game data
        this.tree.branches = [];
        this.tree.leaves = [];
        this.tree.fruits = [];
        this.tree.flowers = [];
        this.searchResults = [];
        this.originalSearchQuery = null;
        this.usedSearchResults = new Set();
        this.currentSessionId = null;
        this.flashcards = [];
        
        // Reset game state to welcome
        this.gameState = 'welcome';
        this.panY = 0;
        
        // Show welcome prompt
        if (this.uiManager) {
            this.uiManager.showWelcomePrompt();
        }
        this.updateStatus('Game restarted! Enter a topic to begin learning.');
        
        // Update the flashcard deck display
        if (this.flashcardManager) {
            this.flashcardManager.updateFlashcardDeck();
        }
    }
    
    
    
    
    
    async triggerWebSearchForBranches(parentNode, newBranches) {
        // Get the search topic from the parent node
        let searchTopic = this.originalSearchQuery; // Default to original query
        
        // If parent node has a search result, use that as the topic
        if (parentNode && parentNode.searchResult) {
            searchTopic = parentNode.searchResult.title;
        }
        
        if (!searchTopic) {
            console.log('No search topic available for web search');
            return;
        }
        
        // Use "deep research on" with "in the context of"
        const researchQuery = `deep research on ${searchTopic} in the context of ${this.originalSearchQuery}`;
        
        console.log(`Triggering web search for ${newBranches.length} branches with query: ${researchQuery}`);
        
        try {
            let allResults = [];
            let attempts = 0;
            const maxAttempts = 10; // Prevent infinite loops
            
            // Keep searching until we have enough unique results for all branches
            while (allResults.length < newBranches.length && attempts < maxAttempts) {
                const response = await fetch('http://localhost:8001/api/web-search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        query: researchQuery,
                        count: Math.max(5, newBranches.length - allResults.length + 2) // Get extra results to account for duplicates
                    })
                });
                
                const data = await response.json();
                console.log(`Search attempt ${attempts + 1} results:`, data);
                
                if (data.results && data.results.length > 0) {
                    // Filter out duplicates and add to our collection
                    const uniqueResults = this.filterDuplicateResults(data.results);
                    allResults = this.filterDuplicateResults([...allResults, ...uniqueResults]);
                    console.log(`Total unique results so far: ${allResults.length}`);
                }
                
                attempts++;
            }
            
            console.log('Final unique results:', allResults);
            
            // Assign results to branches
            newBranches.forEach((branch, index) => {
                if (allResults[index]) {
                    branch.searchResult = allResults[index];
                    this.usedSearchResults.add(allResults[index].title.toLowerCase());
                    console.log(`Assigned search result to branch ${index}:`, allResults[index].title);
                } else {
                    console.warn(`No search result available for branch ${index}`);
                }
            });
            
            const assignedCount = Math.min(allResults.length, newBranches.length);
            this.updateStatus(`Found ${assignedCount} unique web search results for new branches!`);
            
        } catch (error) {
            console.error('Web search error:', error);
            this.updateStatus('Web search failed. Branches created without search results.');
        }
    }
    
    filterDuplicateResults(results) {
        const uniqueResults = [];
        const seenTitles = new Set();
        
        for (const result of results) {
            const titleLower = result.title.toLowerCase();
            
            // Skip if we've seen this title before or if it's already been used
            if (!seenTitles.has(titleLower) && !this.usedSearchResults.has(titleLower)) {
                uniqueResults.push(result);
                seenTitles.add(titleLower);
            }
        }
        
        return uniqueResults;
    }
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    async saveGameState() {
        try {
            // Check if we have a valid search query
            if (!this.originalSearchQuery) {
                this.updateStatus('No search query found. Please start a game first.');
                return;
            }
            
            // Prepare search results data
            const searchResultsData = this.searchResults.map(result => ({
                title: result.title,
                url: result.url,
                snippet: result.snippet,
                llm_content: result.llm_content,
                search_query: result.search_query || ""
            }));
            
            // Prepare branches data with hierarchy
            console.log('Saving branches with parent relationships...');
            const branchesData = this.tree.branches.map(branch => {
                console.log(`Saving branch:`, branch.searchResult?.title, 'parent:', branch.parent?.searchResult?.title, 'parentId:', branch.parent?.id);
                return {
                start: { x: branch.start.x, y: branch.start.y },
                end: { x: branch.end.x, y: branch.end.y },
                length: branch.length,
                maxLength: branch.maxLength,
                angle: branch.angle,
                thickness: branch.thickness,
                generation: branch.generation,
                isGrowing: branch.isGrowing,
                growthSpeed: branch.growthSpeed,
                nodeType: branch.nodeType || "branch",
                    parentId: branch.parent?.id || null,
                searchResult: branch.searchResult || null
                };
            });
            
            // Prepare leaves data
            const leavesData = this.tree.leaves.map(leaf => ({
                x: leaf.x,
                y: leaf.y,
                size: leaf.size,
                branchId: leaf.branchId || 1
            }));
            
            // Prepare fruits data
            const fruitsData = this.tree.fruits.map(fruit => ({
                x: fruit.x,
                y: fruit.y,
                type: fruit.type,
                size: fruit.size
            }));
            
            // Prepare flowers data
            const flowersData = this.tree.flowers.map(flower => ({
                x: flower.x,
                y: flower.y,
                type: flower.type,
                size: flower.size
            }));
            
            // Prepare flashcards data
            const flashcardsData = this.flashcards.map(flashcard => ({
                branch_id: flashcard.branch_id,
                front: flashcard.front,
                back: flashcard.back,
                difficulty: flashcard.difficulty,
                category: flashcard.category
            }));
            
            const saveData = {
                    original_search_query: this.originalSearchQuery,
                    search_results: searchResultsData,
                    branches: branchesData,
                    leaves: leavesData,
                    fruits: fruitsData,
                    flowers: flowersData,
                    flashcards: flashcardsData,
                    camera_offset: this.cameraOffset
            };
            
            console.log('Saving game state with data:', saveData);
            
            const response = await fetch('http://localhost:8001/api/save-game-state', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(saveData)
            });
            
            console.log('Save response status:', response.status);
            console.log('Save response headers:', response.headers);
            
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
            
            if (data.success) {
                this.currentSessionId = data.session_id;
                this.updateStatus(`Game state saved! Session ID: ${data.session_id}`);
                console.log('Game state saved successfully:', data);
            } else {
                console.error('Failed to save game state:', data.error);
                this.updateStatus('Failed to save game state');
            }
            
        } catch (error) {
            console.error('Error saving game state:', error);
            this.updateStatus('Error saving game state');
        }
    }
    
    async loadGameState(sessionId) {
        try {
            this.isLoadingGame = true; // Set flag to prevent welcome sequence
            
            // Hide the prompt box if it exists
            const promptBox = document.getElementById('welcomePrompt');
            if (promptBox) {
                promptBox.remove();
            }
            
            const response = await fetch('http://localhost:8001/api/load-game-state', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionId })
            });
            
            const data = await response.json();
            
            if (data.success) {
                const gameState = data.game_state;
                
                // Restore original search query
                this.originalSearchQuery = gameState.original_search_query;
                
                // Reset camera to default position (always load trees from default view)
                this.cameraOffset = { x: 0, y: 0 };
                
                // Restore search results
                this.searchResults = gameState.search_results;
                
                // Clear existing tree elements
                this.tree.branches = [];
                this.tree.leaves = [];
                this.tree.fruits = [];
                this.tree.flowers = [];
                
                // Restore branches
                gameState.branches.forEach(branchData => {
                    const branch = {
                        start: branchData.start,
                        end: branchData.end,
                        length: branchData.length,
                        maxLength: branchData.maxLength,
                        angle: branchData.angle,
                        thickness: branchData.thickness,
                        generation: branchData.generation,
                        isGrowing: branchData.isGrowing,
                        growthSpeed: branchData.growthSpeed,
                        searchResult: branchData.searchResult
                    };
                    this.tree.branches.push(branch);
                });
                
                // Shift the WHOLE tree to connect to trunk
                if (this.tree.branches.length > 0) {
                    // Find the first generation branch to see where the tree base should be
                    const firstGenBranch = this.tree.branches.find(b => b.generation === 1);
                    if (firstGenBranch) {
                        // Calculate offset to move the tree base to the trunk
                        const trunkTopX = this.tree.x;
                        const trunkTopY = this.tree.y - this.tree.trunkHeight;
                        const offsetX = trunkTopX - firstGenBranch.start.x;
                        const offsetY = trunkTopY - firstGenBranch.start.y;
                        
                        // Apply offset to ALL branches to shift the whole tree
                        this.tree.branches.forEach(branch => {
                            branch.start.x += offsetX;
                            branch.start.y += offsetY;
                            branch.end.x += offsetX;
                            branch.end.y += offsetY;
                        });
                        
                        // Store offset for leaves and flowers
                        this.treeOffsetX = offsetX;
                        this.treeOffsetY = offsetY;
                    }
                }
                
                // Restore leaves with proper branch references
                console.log('Loading leaves:', gameState.leaves);
                gameState.leaves.forEach(leafData => {
                    const leaf = {
                        x: leafData.x + (this.treeOffsetX || 0), // Apply tree offset
                        y: leafData.y + (this.treeOffsetY || 0), // Apply tree offset
                        size: leafData.size,
                        branchId: leafData.branchId,
                        sway: Math.random() * Math.PI * 2, // Add sway for animation
                        angle: Math.random() * Math.PI * 2, // Add angle for rotation
                        branch: null // Will be set below
                    };
                    
                    // Try to find the branch this leaf belongs to
                    if (leafData.branchId) {
                        // Find branch by ID (if we have branch IDs)
                        const branch = this.tree.branches.find(b => b.id === leafData.branchId);
                        if (branch) {
                            leaf.branch = branch;
                        }
                    } else {
                        // Find branch by position (fallback)
                        const branch = this.tree.branches.find(branch => 
                            Math.abs(branch.end.x - leaf.x) < 20 && 
                            Math.abs(branch.end.y - leaf.y) < 20
                        );
                        if (branch) {
                            leaf.branch = branch;
                        }
                    }
                    
                    this.tree.leaves.push(leaf);
                });
                console.log('Total leaves after loading:', this.tree.leaves.length);
                
                // Restore fruits
                gameState.fruits.forEach(fruitData => {
                    const fruit = {
                        x: fruitData.x + (this.treeOffsetX || 0), // Apply tree offset
                        y: fruitData.y + (this.treeOffsetY || 0), // Apply tree offset
                        type: fruitData.type,
                        size: fruitData.size
                    };
                    this.tree.fruits.push(fruit);
                });
                
                // Restore flowers
                gameState.flowers.forEach(flowerData => {
                    const flower = {
                        x: flowerData.x + (this.treeOffsetX || 0), // Apply tree offset
                        y: flowerData.y + (this.treeOffsetY || 0), // Apply tree offset
                        type: flowerData.type,
                        size: flowerData.size,
                        sway: Math.random() * Math.PI * 2, // Generate random sway for animation
                        branch: null // Will be set below if we can find the matching branch
                    };
                    
                    // Try to find the branch this flower belongs to
                    const matchingBranch = this.tree.branches.find(branch => 
                        Math.abs(branch.end.x - flower.x) < 10 && 
                        Math.abs(branch.end.y - flower.y) < 10
                    );
                    
                    if (matchingBranch) {
                        flower.branch = matchingBranch;
                    }
                    
                    this.tree.flowers.push(flower);
                });
                
                // Restore flashcards with proper node_position formatting and branch references
                this.flashcards = (gameState.flashcards || []).map(flashcard => {
                    let restoredFlashcard = { ...flashcard };
                    
                    // Convert node_position_x and node_position_y to node_position object
                    if (flashcard.node_position_x !== undefined && flashcard.node_position_y !== undefined) {
                        restoredFlashcard.node_position = {
                            x: flashcard.node_position_x,
                            y: flashcard.node_position_y
                        };
                    }
                    
                    // Try to find the branch this flashcard belongs to
                    if (flashcard.branch_id) {
                        // Find branch by ID (if we have branch IDs)
                        const branch = this.tree.branches.find(b => b.id === flashcard.branch_id);
                        if (branch) {
                            restoredFlashcard.branch = branch;
                            console.log(`Flashcard restored with branch (ID: ${flashcard.branch_id}, generation: ${branch.generation})`);
                        } else {
                            console.warn(`Branch not found for flashcard with branch_id: ${flashcard.branch_id}`);
                        }
                    } else if (restoredFlashcard.node_position) {
                        // Find branch by position (fallback)
                        const branch = this.tree.branches.find(branch => 
                            Math.abs(branch.end.x - restoredFlashcard.node_position.x) < 20 && 
                            Math.abs(branch.end.y - restoredFlashcard.node_position.y) < 20
                        );
                        if (branch) {
                            restoredFlashcard.branch = branch;
                            console.log(`Flashcard restored with branch by position (generation: ${branch.generation})`);
                        } else {
                            console.warn(`Branch not found for flashcard at position:`, restoredFlashcard.node_position);
                        }
                    }
                    
                    return restoredFlashcard;
                });
                
                console.log(`Restored ${this.flashcards.length} flashcards with branch references`);
                
                this.currentSessionId = sessionId;
                this.updateStatus(`Game state loaded! Query: ${this.originalSearchQuery}`);
                console.log('Game state loaded successfully:', data);
                
                // Update the flashcard deck display
                if (this.flashcardManager) {
                    this.flashcardManager.updateFlashcardDeck();
                }
                
            } else {
                console.error('Failed to load game state:', data.error);
                this.updateStatus('Failed to load game state');
            }
            
        } catch (error) {
            console.error('Error loading game state:', error);
            this.updateStatus('Error loading game state');
        } finally {
            this.isLoadingGame = false; // Reset flag
        }
    }
    
    async getGameSessions() {
        try {
            const response = await fetch('http://localhost:8001/api/game-sessions');
            const data = await response.json();
            
            if (data.success) {
                return data.sessions;
            } else {
                console.error('Failed to get game sessions:', data.error);
                return [];
            }
            
        } catch (error) {
            console.error('Error getting game sessions:', error);
            return [];
        }
    }
    
    async deleteGameState(sessionId) {
        try {
            const response = await fetch('http://localhost:8001/api/delete-game-state', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionId })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.updateStatus(`Game session ${sessionId} deleted successfully`);
                console.log('Game session deleted:', data);
            } else {
                console.error('Failed to delete game session:', data.error);
                this.updateStatus('Failed to delete game session');
            }
            
        } catch (error) {
            console.error('Error deleting game session:', error);
            this.updateStatus('Error deleting game session');
        }
    }
    
    
    repositionTreeAssets() {
        if (!this.tree) return;
        
        // Calculate the offset for moving the tree assets
        const treeOffsetX = this.tree.x - (this.tree.oldX || this.tree.x);
        const treeOffsetY = this.tree.y - (this.tree.oldY || this.tree.y);
        
        // Update all branch positions to move with the tree
        this.tree.branches.forEach(branch => {
            branch.start.x += treeOffsetX;
            branch.start.y += treeOffsetY;
            branch.end.x += treeOffsetX;
            branch.end.y += treeOffsetY;
        });
        
        // Update all leaf positions to move with the tree
        this.tree.leaves.forEach(leaf => {
            leaf.x += treeOffsetX;
            leaf.y += treeOffsetY;
        });
        
        // Update all fruit positions to move with the tree
        this.tree.fruits.forEach(fruit => {
            fruit.x += treeOffsetX;
            fruit.y += treeOffsetY;
        });
        
        // Update all flower positions to move with the tree
        this.tree.flowers.forEach(flower => {
            flower.x += treeOffsetX;
            flower.y += treeOffsetY;
        });
        
        // Store current position for next resize
        this.tree.oldX = this.tree.x;
        this.tree.oldY = this.tree.y;
    }
    
    restartGame() {
        // Reset all game state
        this.tree.branches = [];
        this.tree.leaves = [];
        this.tree.fruits = [];
        this.tree.flowers = [];
        this.searchResults = [];
        this.originalSearchQuery = null;
        this.usedSearchResults = new Set();
        this.currentSessionId = null;
        this.flashcards = [];
        this.isLoadingGame = false;
        
        // Reset camera to default position
        this.cameraOffset = { x: 0, y: 0 };
        
        // Reset welcome sequence
        this.welcomeSequence = {
            isActive: false,
            hasShownPrompt: false,
            targetPanY: 0,
            currentPanY: 0,
            panSpeed: 0.02
        };
        
        // Hide any existing modals
        this.hideStudyModal();
        
        // Remove any existing prompt box
        const promptBox = document.getElementById('welcomePrompt');
        if (promptBox) {
            promptBox.remove();
        }
        
        // Remove any existing flashcard deck UI elements
        const flashcardDeckElements = document.querySelectorAll('.flashcard-deck, .flashcard-modal, [id*="flashcard"]');
        flashcardDeckElements.forEach(element => {
            if (element.id !== 'showFlashcardsBtn') { // Don't remove the button in study modal
                element.remove();
            }
        });
        
        // Start the welcome sequence
        this.startWelcomeSequence();
        
        this.updateStatus('Game restarted!');
    }
    
    
    // toggleModalExpansion method removed - modal is now wide by default
}
