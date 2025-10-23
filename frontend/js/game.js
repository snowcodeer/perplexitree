/**
 * Main Game Class - Handles the core game logic and rendering
 */
class UltraSimplePrune {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // API configuration
        this.apiBaseUrl = this.getApiBaseUrl();
        
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
        
        this.init();
    }
    
    getApiBaseUrl() {
        // Check if we're in development (localhost) or production
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'http://localhost:8001';
        } else {
            // For production, use the current domain
            return window.location.origin;
        }
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
        
        document.getElementById('harvestTool').addEventListener('click', () => {
            this.setTool('harvest');
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
        } else if (tool === 'harvest') {
            document.getElementById('harvestTool').classList.add('active');
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
                await this.createFlashcardsForNode(this.hoveredNode);
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
        } else if (this.currentTool === 'harvest') {
            if (this.hoveredNode && this.hoveredNode.isFruit) {
                console.log('Harvest tool: clicked on fruit', this.hoveredNode);
                this.harvestFruit(this.hoveredNode);
            } else {
                this.updateStatus('Hover over an apple first, then click to harvest knowledge!');
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
                this.showStudyModal(this.hoveredNode.searchResult);
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
        } else if (this.currentTool === 'growth' || this.currentTool === 'leaves' || this.currentTool === 'fruit' || this.currentTool === 'harvest' || this.currentTool === 'flower' || this.currentTool === 'reposition' || this.currentTool === 'study' || this.currentTool === 'pan') {
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
        const statusElement = document.getElementById('status');
        if (statusElement) {
            statusElement.textContent = message;
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
        
        // Check for fruits first (if harvest tool is active)
        if (this.currentTool === 'harvest') {
            for (let fruit of this.tree.fruits) {
                if (Math.abs(adjustedPos.x - fruit.x) < 15 && Math.abs(adjustedPos.y - fruit.y) < 15) {
                    return { x: fruit.x, y: fruit.y, isFruit: true, fruit: fruit };
                }
            }
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
        
        // Assign search results to the 5 initial branches (FIRST 5 NODES HAVE NO SOURCE LINKS)
        console.log('Assigning search results to branches. Search results:', this.searchResults);
        console.log('Available branches:', this.tree.branches.length);
        if (this.searchResults && this.searchResults.length > 0) {
            const lastFiveBranches = this.tree.branches.slice(-5);
            console.log('Last 5 branches:', lastFiveBranches);
            lastFiveBranches.forEach((branch, index) => {
                if (this.searchResults[index]) {
                    // Remove URL from first 5 search results (no source links for initial topics)
                    const searchResult = { ...this.searchResults[index] };
                    delete searchResult.url;
                    branch.searchResult = searchResult;
                    console.log(`Assigned search result ${index} to branch (NO URL):`, branch.searchResult);
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
    
    async harvestFruit(node) {
        console.log('Harvesting fruit at:', node.x, node.y);
        
        // Check if we clicked on a fruit
        if (!node.isFruit || !node.fruit) {
            this.updateStatus('Harvest tool only works on apples! Click on an apple to harvest knowledge.');
            return;
        }
        
        const fruit = node.fruit;
        
        // Get flashcards for this session to create a quiz
        if (this.flashcards.length === 0) {
            this.updateStatus('No flashcards available for quiz! Create some flashcards first.');
            return;
        }
        
        // Create a quiz from the flashcards
        await this.createQuizFromFlashcards();
    }
    
    async createQuizFromFlashcards() {
        try {
            // Select 5 random flashcards for the quiz
            const quizFlashcards = this.getRandomFlashcards(5);
            
            if (quizFlashcards.length === 0) {
                this.updateStatus('No flashcards available for quiz!');
                return;
            }
            
            // Create multiple choice questions from flashcards
            const quizQuestions = await this.generateMultipleChoiceQuestions(quizFlashcards);
            
            // Show the quiz modal
            this.showQuizModal(quizQuestions);
            
        } catch (error) {
            console.error('Error creating quiz:', error);
            this.updateStatus('Error creating quiz. Please try again.');
        }
    }
    
    getRandomFlashcards(count) {
        const shuffled = [...this.flashcards].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, Math.min(count, this.flashcards.length));
    }
    
    async generateMultipleChoiceQuestions(flashcards) {
        try {
            // Use AI to generate quiz questions based on the flashcards
            const response = await fetch('/api/generate-quiz', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    flashcards: flashcards
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to generate quiz');
            }
            
            const data = await response.json();
            return data.questions || [];
            
        } catch (error) {
            console.error('Error generating AI quiz:', error);
            // Fallback to simple shuffling if AI fails
            return this.generateSimpleQuestions(flashcards);
        }
    }
    
    generateSimpleQuestions(flashcards) {
        const questions = [];
        
        for (const flashcard of flashcards) {
            // Create a multiple choice question from the flashcard
            const question = {
                question: flashcard.front,
                correctAnswer: flashcard.back,
                options: [flashcard.back]
            };
            
            // Add 3 wrong answers from other flashcards
            const otherFlashcards = this.flashcards.filter(f => f !== flashcard);
            const wrongAnswers = this.getRandomFlashcards(3).map(f => f.back);
            
            // Remove duplicates and ensure we have 4 options
            const allOptions = [...new Set([...question.options, ...wrongAnswers])];
            question.options = allOptions.slice(0, 4);
            
            // Shuffle the options
            question.options = question.options.sort(() => 0.5 - Math.random());
            
            questions.push(question);
        }
        
        return questions;
    }
    
    showQuizModal(questions) {
        const modal = document.getElementById('quizModal');
        const questionElement = document.getElementById('quizQuestion');
        const optionsElement = document.getElementById('quizOptions');
        const resultElement = document.getElementById('quizResult');
        const scoreElement = document.getElementById('quizScore');
        
        // Reset modal state
        resultElement.style.display = 'none';
        scoreElement.style.display = 'none';
        
        let currentQuestionIndex = 0;
        let score = 0;
        let selectedAnswer = null;
        
        const showQuestion = () => {
            if (currentQuestionIndex >= questions.length) {
                // Quiz completed
                showScore();
                return;
            }
            
            const question = questions[currentQuestionIndex];
            questionElement.textContent = `Question ${currentQuestionIndex + 1}: ${question.question}`;
            
            optionsElement.innerHTML = '';
            question.options.forEach((option, index) => {
                const optionElement = document.createElement('div');
                optionElement.className = 'quiz-option';
                optionElement.textContent = option;
                optionElement.addEventListener('click', () => selectAnswer(option, optionElement));
                optionsElement.appendChild(optionElement);
            });
        };
        
        const selectAnswer = (answer, element) => {
            // Remove previous selection
            optionsElement.querySelectorAll('.quiz-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            
            // Add selection to clicked option
            element.classList.add('selected');
            selectedAnswer = answer;
            
            // Show result after a short delay
            setTimeout(() => {
                showResult();
            }, 500);
        };
        
        const showResult = () => {
            const question = questions[currentQuestionIndex];
            const isCorrect = selectedAnswer === question.correctAnswer;
            
            if (isCorrect) {
                score++;
            }
            
            // Highlight correct and incorrect answers
            optionsElement.querySelectorAll('.quiz-option').forEach(opt => {
                if (opt.textContent === question.correctAnswer) {
                    opt.classList.add('correct');
                } else if (opt.textContent === selectedAnswer && !isCorrect) {
                    opt.classList.add('incorrect');
                }
            });
            
            // Show result message
            resultElement.textContent = isCorrect ? 'Correct! 🎉' : `Incorrect. The correct answer is: ${question.correctAnswer}`;
            resultElement.className = `quiz-result ${isCorrect ? 'correct' : 'incorrect'}`;
            resultElement.style.display = 'block';
            
            // Move to next question after delay
            setTimeout(() => {
                currentQuestionIndex++;
                showQuestion();
            }, 2000);
        };
        
        const showScore = () => {
            questionElement.textContent = 'Quiz Complete!';
            optionsElement.innerHTML = '';
            resultElement.style.display = 'none';
            
            const percentage = Math.round((score / questions.length) * 100);
            scoreElement.innerHTML = `
                <div>Your Score: ${score}/${questions.length}</div>
                <div>Percentage: ${percentage}%</div>
                <div>${percentage >= 80 ? 'Excellent! 🌟' : percentage >= 60 ? 'Good job! 👍' : 'Keep studying! 📚'}</div>
            `;
            scoreElement.style.display = 'block';
        };
        
        // Show first question
        showQuestion();
        
        // Show modal
        modal.style.display = 'flex';
        
        // Close modal event listener
        document.getElementById('closeQuizModal').onclick = () => {
            modal.style.display = 'none';
        };
        
        // Close modal when clicking outside
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        };
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
        this.welcomeSequence.isActive = true;
        this.welcomeSequence.hasShownPrompt = false;
        this.welcomeSequence.originalPanY = this.cameraOffset.y;
        // Pan up higher so dirt covers about 60% of screen (show more dirt below)
        this.welcomeSequence.targetPanY = -this.height * 0.6;
        
        // Start panning up
        this.animateWelcomePan();
    }
    
    animateWelcomePan() {
        if (!this.welcomeSequence.isActive) return;
        
        const currentY = this.cameraOffset.y;
        const targetY = this.welcomeSequence.targetPanY;
        const diff = targetY - currentY;
        
        if (Math.abs(diff) > 1) {
            // Continue panning
            this.cameraOffset.y += diff * 0.05; // Smooth animation
            requestAnimationFrame(() => this.animateWelcomePan());
        } else {
            // Reached target, show prompt
            this.cameraOffset.y = targetY;
            this.showWelcomePrompt();
        }
    }
    
    showWelcomePrompt() {
        if (this.welcomeSequence.hasShownPrompt) return;
        
        this.welcomeSequence.hasShownPrompt = true;
        
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
        const canvasContainer = this.canvas.parentElement;
        canvasContainer.appendChild(promptBox);
        
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
        this.welcomeSequence.targetPanY = this.welcomeSequence.originalPanY;
        this.animateWelcomePanBack();
        
        // Call API with user input and wait for results, then grow
        if (userInput) {
            await this.fetchSearchResults(userInput);
        }
    }
    
    async fetchSearchResults(userInput) {
        console.log('Fetching search results for:', userInput);
        this.originalSearchQuery = userInput; // Store the original search query
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/search`, {
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
    
    animateWelcomePanBack() {
        const currentY = this.cameraOffset.y;
        const targetY = this.welcomeSequence.targetPanY;
        const diff = targetY - currentY;
        
        if (Math.abs(diff) > 1) {
            // Continue panning back up
            this.cameraOffset.y += diff * 0.05; // Smooth animation
            requestAnimationFrame(() => this.animateWelcomePanBack());
        } else {
            // Reached original position, mark sequence as complete
            this.cameraOffset.y = targetY;
            this.welcomeSequence.isActive = false;
            // Don't trigger growth here - wait for search results
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
        this.showWelcomePrompt();
        this.updateStatus('Game restarted! Enter a topic to begin learning.');
        
        // Update the flashcard deck display
        this.updateFlashcardDeck();
    }
    
    showStudyModal(searchResult) {
        const modal = document.getElementById('studyModal');
        const title = document.getElementById('modalTitle');
        const description = document.getElementById('modalDescription');
        const flashcardBtn = document.getElementById('showFlashcardsBtn');
        const readFromSourceBtn = document.getElementById('readFromSourceBtn');
        
        if (modal && title && description) {
            title.textContent = searchResult.title;
            const content = searchResult.snippet || searchResult.llm_content || 'No description available';
            
            // Create formatted content
            let formattedContent = this.formatContent(content);
            
            description.innerHTML = formattedContent;
            
            // Show/hide flashcard button based on whether flashcards exist for this topic
            if (flashcardBtn) {
                const topicFlashcards = this.flashcards.filter(card => 
                    card.category === searchResult.title
                );
                
                if (topicFlashcards.length > 0) {
                    flashcardBtn.style.display = 'block';
                    flashcardBtn.onclick = () => {
                        this.showFlashcardsForTopic(searchResult.title);
                    };
                } else {
                    flashcardBtn.style.display = 'none';
                }
            }
            
            // Show/hide read from source button - only for searched nodes (not first 5)
            if (readFromSourceBtn) {
                if (searchResult.url) {
                    readFromSourceBtn.style.display = 'block';
                    readFromSourceBtn.onclick = () => {
                        window.open(searchResult.url, '_blank');
                    };
                } else {
                    readFromSourceBtn.style.display = 'none';
                }
            }
            
            modal.classList.add('show');
        }
    }
    
    showFlashcardsForTopic(topic) {
        // Find flashcards for this specific topic
        const topicFlashcards = this.flashcards.filter(card => 
            card.category === topic
        );
        
        if (topicFlashcards.length === 0) {
            this.updateStatus('No flashcards found for this topic');
            return;
        }
        
        // Close the study modal first
        this.hideStudyModal();
        
        // Show the flashcards for this topic
        this.showFlashcards(topicFlashcards, topic);
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
        if (!str) return str;
        return str.replace(/\w\S*/g, (txt) => {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        });
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
            let negativePrompts = []; // Track existing search results to exclude
            
            // Keep searching until we have enough unique results for all branches
            while (allResults.length < newBranches.length && attempts < maxAttempts) {
                // Build negative prompts from existing results
                const currentNegativePrompts = allResults.map(result => result.title);
                
                const response = await fetch(`${this.apiBaseUrl}/api/web-search`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        query: researchQuery,
                        count: Math.max(5, newBranches.length - allResults.length + 2), // Get extra results to account for duplicates
                        negative_prompts: currentNegativePrompts
                    })
                });
                
                const data = await response.json();
                console.log(`Search attempt ${attempts + 1} results:`, data);
                console.log(`Using negative prompts:`, currentNegativePrompts);
                
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
            if (attempts > 1) {
                this.updateStatus(`Found ${assignedCount} unique web search results after ${attempts} attempts with negative prompts!`);
            } else {
                this.updateStatus(`Found ${assignedCount} unique web search results for new branches!`);
            }
            
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
    
    async createFlashcardsForNode(node) {
        try {
            // Find the branch that corresponds to this node
            const branch = this.tree.branches.find(b => 
                Math.abs(b.end.x - node.x) < 8 && Math.abs(b.end.y - node.y) < 8
            );
            
            if (!branch || !branch.searchResult) {
                this.updateStatus('No search data available for this node');
                return;
            }
            
            console.log('Branch search result:', branch.searchResult);
            
            // Validate search result data
            if (!branch.searchResult.title || (!branch.searchResult.llm_content && !branch.searchResult.snippet)) {
                this.updateStatus('Insufficient search data for flashcard creation');
                console.error('Invalid search result data:', branch.searchResult);
                return;
            }
            
            // Show loading message
            this.showLoadingMessage('Loading flashcards...');
            
            // Get the correct coordinates (node might have x,y or end.x,end.y)
            const nodeX = node.x || node.end?.x || 0;
            const nodeY = node.y || node.end?.y || 0;
            
            // Add visual leaves to the tree first (immediate feedback)
            this.addLeavesToNode(node, 5); // Add 5 leaves immediately
            console.log('Added leaves to node, total leaves now:', this.tree.leaves.length);
            
        // Use the unified endpoint that works with both database and frontend data
        const flashcardData = {
                    search_result: branch.searchResult,
            count: 5,
            node_position: { x: nodeX, y: nodeY } // Include node position for linking
        };
            
            console.log('CACHE BUSTED: Sending flashcard request with data:', flashcardData);
            console.log('Node position being stored:', { x: nodeX, y: nodeY });
            
            const response = await fetch(`${this.apiBaseUrl}/api/create-flashcards`, {
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
                // Add branch reference to each flashcard and fix casing
                const flashcardsWithBranch = data.flashcards.map(flashcard => ({
                    ...flashcard,
                    front: this.toProperCase(flashcard.front),
                    back: this.toProperCase(flashcard.back),
                    branch: branch // Add branch reference for pruning
                }));
                
                this.flashcards = [...this.flashcards, ...flashcardsWithBranch];
                this.updateStatus(`Created ${data.flashcards.length} flashcards for ${branch.searchResult.title}`);
                console.log('Flashcards created:', flashcardsWithBranch);
                console.log('Total flashcards now:', this.flashcards.length);
                
                // Show success message
                this.showLoadingMessage('Flashcards ready!');
                setTimeout(() => this.hideLoadingMessage(), 2000); // Hide after 2 seconds
                
                // Update the flashcard deck display (no popup)
                this.updateFlashcardDeck();
            } else {
                console.error('Failed to create flashcards:', data.error);
                this.updateStatus(`Failed to create flashcards: ${data.error}`);
                this.hideLoadingMessage();
            }
            
        } catch (error) {
            console.error('Error creating flashcards:', error);
            this.updateStatus('Error creating flashcards');
            this.hideLoadingMessage();
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
    
    addLeavesToNode(node, count) {
        // Get the correct coordinates (node might have x,y or end.x,end.y)
        const nodeX = node.x || node.end?.x || 0;
        const nodeY = node.y || node.end?.y || 0;
        
        // Find the branch this node belongs to
        const branch = this.tree.branches.find(branch => 
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
            
            this.tree.leaves.push({
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
            
            this.tree.leaves.push({
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
        
        if (this.flashcards.length === 0) {
            deckElement.innerHTML = '';
            return;
        }
        
        // Group flashcards by main topic (parent node) categories
        const groupedFlashcards = {};
        console.log('Grouping flashcards:', this.flashcards.length, 'total cards');
        this.flashcards.forEach(card => {
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
        
        const totalCards = this.flashcards.length;
        const totalDecks = Object.keys(groupedFlashcards).length;
        
        // Create simple button that shows deck view when clicked
        deckElement.innerHTML = `
            <button onclick="app.showDeckView()" style="
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
    
    toProperCase(str) {
        if (!str) return '';
        return str.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
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
    
    showDeckView() {
        if (this.flashcards.length === 0) {
            this.updateStatus('No flashcards created yet');
            return;
        }
        
        // Group flashcards by main topic (parent node) categories
        const groupedFlashcards = {};
        this.flashcards.forEach(card => {
            // Find the branch this flashcard was created from
            const branch = card.branch;
            let mainTopic = 'General';
            
            if (branch && branch.searchResult) {
                // If this is a first-generation branch (main topic), use its title
                if (branch.generation === 0 || branch.generation === 1) {
                    mainTopic = branch.searchResult.title;
                } else {
                    // For child branches, find the parent main topic branch
                    const parentBranch = this.findParentMainTopicBranch(branch);
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
                     onclick="app.showDeckFlashcards('${topic}')">
                    <div style="color: #fff; font-weight: 500;">${topic}</div>
                    <div style="color: #fff; font-weight: 600;">${totalCards}</div>
                    </div>
            `;
        });
        
        deckHTML += `
            </div>
            <div style="text-align: center; margin-top: 10px;">
                <button onclick="app.showAllFlashcards()" style="
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
        const deckCards = this.flashcards.filter(card => card.category === topic);
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
                <h3 style="margin: 0; color: #fff;">📚 ${topic} Deck (${deckCards.length} cards)</h3>
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
                            <strong style="color: #fff;">Q:</strong> ${this.formatContent(card.front)}
                        </div>
                        <div style="margin-bottom: 10px;">
                            <strong style="color: #fff;">A:</strong> ${this.formatContent(card.back)}
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
                this.highlightNodeAtPosition(nodePosition);
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
        if (this.flashcards.length === 0) {
            this.updateStatus('No flashcards created yet');
            return;
        }
        
        // Group flashcards by main topic (parent node) categories
        const groupedFlashcards = {};
        this.flashcards.forEach(card => {
            // Find the branch this flashcard was created from
            const branch = card.branch;
            let mainTopic = 'General';
            
            if (branch && branch.searchResult) {
                // If this is a first-generation branch (main topic), use its title
                if (branch.generation === 0 || branch.generation === 1) {
                    mainTopic = branch.searchResult.title;
                } else {
                    // For child branches, find the parent main topic branch
                    const parentBranch = this.findParentMainTopicBranch(branch);
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
                <h3 style="margin: 0; color: #fff;">📚 Complete Flashcard Deck (${this.flashcards.length} cards)</h3>
                <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: #fff; font-size: 20px; cursor: pointer;">×</button>
            </div>
        `;
        
        Object.keys(groupedFlashcards).forEach(topic => {
            const cards = groupedFlashcards[topic];
            modalHTML += `
                <div style="margin-bottom: 20px; border: 1px solid #333; border-radius: 5px; padding: 15px;">
                    <h4 style="color: #3b82f6; margin: 0 0 10px 0;">${topic} (${cards.length} cards)</h4>
                    ${cards.map((card, index) => `
                        <div style="border: 1px solid #444; border-radius: 3px; margin: 8px 0; padding: 10px; background: #2a2a2a; font-family: 'Inter', sans-serif;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                <span style="color: #3b82f6; font-weight: bold;">Card ${index + 1}</span>
                                <span style="color: #666; font-size: 12px;">${card.difficulty}</span>
                            </div>
                            <div style="margin-bottom: 8px;">
                                <strong style="color: #fff;">Q:</strong> ${this.formatContent(card.front)}
                            </div>
                            <div>
                                <strong style="color: #fff;">A:</strong> ${this.formatContent(card.back)}
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
                <h3 style="margin: 0; color: #fff;">Flashcards: ${topic}</h3>
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
                            <strong style="color: #fff;">Q:</strong> ${this.formatContent(card.front)}
                        </div>
                        <div style="margin-bottom: 10px;">
                            <strong style="color: #fff;">A:</strong> ${this.formatContent(card.back)}
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
                this.highlightNodeAtPosition(nodePosition);
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
    
    highlightNodeAtPosition(nodePosition) {
        console.log('Attempting to highlight node at position:', nodePosition);
        if (!nodePosition || !nodePosition.x || !nodePosition.y) {
            console.warn('Invalid node position for highlighting:', nodePosition);
            return;
        }
        
        // Close all deck modals
        this.closeAllDeckModals();
        
        console.log('Available branches:', this.tree.branches.length);
        console.log('Branch positions:', this.tree.branches.map(b => ({ x: b.end.x, y: b.end.y })));
        
        // Find the node at the given position (increased tolerance)
        const targetNode = this.tree.branches.find(branch => {
            const distanceX = Math.abs(branch.end.x - nodePosition.x);
            const distanceY = Math.abs(branch.end.y - nodePosition.y);
            console.log(`Checking branch at (${branch.end.x}, ${branch.end.y}) vs target (${nodePosition.x}, ${nodePosition.y}) - distances: ${distanceX}, ${distanceY}`);
            return distanceX < 20 && distanceY < 20;
        });
        
        if (!targetNode) {
            console.warn('No node found at position:', nodePosition);
            console.log('Tried to find node within 20 pixels of:', nodePosition);
            this.updateStatus('Source node not found on tree');
            return;
        }
        
        console.log('Found target node:', targetNode);
        
        // Center the camera on the target node
        this.cameraOffset.x = -targetNode.end.x + this.canvas.width / 2;
        this.cameraOffset.y = -targetNode.end.y + this.canvas.height / 2;
        
        // Add a temporary highlight effect
        this.highlightedNode = targetNode;
        this.highlightStartTime = Date.now();
        
        // Clear any existing highlight timeout
        if (this.highlightTimeout) {
            clearTimeout(this.highlightTimeout);
        }
        
        // Remove highlight after 3 seconds
        this.highlightTimeout = setTimeout(() => {
            this.highlightedNode = null;
            this.highlightStartTime = null;
        }, 3000);
        
        this.updateStatus(`Highlighted source node: ${targetNode.searchResult.title}`);
    }
    
    closeAllDeckModals() {
        // Close all deck-related modals
        const deckModals = document.querySelectorAll('.deck-view-modal, .deck-flashcards-modal, .flashcard-modal, .all-flashcards-modal');
        deckModals.forEach(modal => modal.remove());
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
            
            const response = await fetch(`${this.apiBaseUrl}/api/save-game-state`, {
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
            
            const response = await fetch(`${this.apiBaseUrl}/api/load-game-state`, {
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
                this.updateFlashcardDeck();
                
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
            const response = await fetch(`${this.apiBaseUrl}/api/game-sessions`);
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
            const response = await fetch(`${this.apiBaseUrl}/api/delete-game-state`, {
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
    
    hideStudyModal() {
        const modal = document.getElementById('studyModal');
        if (modal) {
            modal.classList.remove('show');
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
