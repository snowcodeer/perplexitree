const API_BASE_URL = (() => {
    const origin = window.location.origin || "";
    const isLocalHost = /localhost|127\.0\.0\.1|0\.0\.0\.0/.test(origin);
    if (!origin || origin === "null" || origin.startsWith("file:")) {
        return "http://localhost:8001";
    }
    return isLocalHost ? "http://localhost:8001" : "";
})();

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
        
        // Search / session state
        this.currentSessionId = null; // Track current saved session ID
        this.isLoadingGame = false; // Flag to track when loading a saved game

        this.highlightedNode = null;
        this.highlightStartTime = null;
        this.highlightTimeout = null;

        this.flashcardManager = new FlashcardManager(this, API_BASE_URL);
        this.quizManager = new QuizManager(this, this.flashcardManager, API_BASE_URL);
        this.searchManager = new SearchManager(this, API_BASE_URL);
        this.welcomeManager = new WelcomeManager(this, this.searchManager);
        
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
            this.welcomeManager.startSequence();
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
                await this.flashcardManager.createFlashcardsForNode(this.hoveredNode);
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
            const originalQuery = this.searchManager.getOriginalQuery();
            if (originalQuery) {
                return {
                    x: trunkPoint.x,
                    y: trunkPoint.y,
                    searchResult: {
                        title: originalQuery,
                        snippet: originalQuery,
                        llm_content: `This is your main topic: ${originalQuery}. The branches below represent the 5 primary areas within this field.`
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
            this.searchManager.assignResultsToBranches(node, newBranches);
            
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
        const lastFiveBranches = this.tree.branches.slice(-5);
        this.searchManager.assignInitialResults(lastFiveBranches);
        
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
        
        // Get flashcards for this session to create a quiz
        if (!this.flashcardManager.hasFlashcards()) {
            this.updateStatus('No flashcards available for quiz! Create some flashcards first.');
            return;
        }
        
        // Create a quiz from the flashcards
        await this.quizManager.startQuizFromFlashcards();
    }
    
    async createQuizFromFlashcards() {
        return this.quizManager.startQuizFromFlashcards();
    }
    
    getRandomFlashcards(count) {
        return this.flashcardManager.getRandomFlashcards(count);
    }
    
    async generateMultipleChoiceQuestions(flashcards) {
        return this.quizManager.generateMultipleChoiceQuestions(flashcards);
    }
    
    generateSimpleQuestions(flashcards) {
        return this.quizManager.generateSimpleQuestions(flashcards);
    }
    
    showQuizModal(questions) {
        return this.quizManager.showQuizModal(questions);
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
    
    triggerFirstGrowth() {
        // Trigger growth from the trunk (first node) - same as clicking the first node
        const trunkNode = { x: this.tree.x, y: this.tree.y - this.tree.trunkHeight };
        console.log('Triggering first growth, search results:', this.searchManager.getInitialResults());
        this.growBranchesFromNode(trunkNode);
        this.updateStatus('Tree ready! Use growth tool to grow branches, cut tool to prune them.');
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
            if (flashcardBtn && this.flashcardManager) {
                const topicFlashcards = this.flashcardManager.getFlashcardsForTopic(searchResult.title);
                
                if (topicFlashcards.length > 0) {
                    flashcardBtn.style.display = 'block';
                    flashcardBtn.onclick = () => {
                        this.flashcardManager.showFlashcardsForTopic(searchResult.title);
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
        if (!this.flashcardManager) {
            return;
        }
        this.hideStudyModal();
        this.flashcardManager.showFlashcardsForTopic(topic);
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
    
    async createFlashcardsForNode(node) {
        if (this.flashcardManager) {
            return this.flashcardManager.createFlashcardsForNode(node);
        }
        console.warn('Flashcard manager unavailable');
        return null;
    }
    
    showLoadingMessage(message) {
        if (this.flashcardManager) {
            this.flashcardManager.showLoadingMessage(message);
        }
    }
    
    hideLoadingMessage() {
        if (this.flashcardManager) {
            this.flashcardManager.hideLoadingMessage();
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
        if (this.flashcardManager) {
            this.flashcardManager.updateFlashcardDeck();
        }
    }
    
    findParentMainTopicBranch(childBranch) {
        if (this.flashcardManager) {
            return this.flashcardManager.findParentMainTopicBranch(childBranch);
        }
        return childBranch || null;
    }
    
    showDeckView() {
        if (this.flashcardManager) {
            this.flashcardManager.showDeckView();
        }
    }
    
    showDeckFlashcards(topic) {
        if (this.flashcardManager) {
            this.flashcardManager.showDeckFlashcards(topic);
        }
    }
    
    showAllFlashcards() {
        if (this.flashcardManager) {
            this.flashcardManager.showAllFlashcards();
        }
    }
    
    showFlashcards(flashcards, topic) {
        if (this.flashcardManager) {
            this.flashcardManager.showFlashcards(flashcards, topic);
        }
    }
    
    highlightNodeAtPosition(nodePosition) {
        if (this.flashcardManager) {
            this.flashcardManager.highlightNodeFromFlashcard(nodePosition);
        }
    }
    
    closeAllDeckModals() {
        if (this.flashcardManager) {
            this.flashcardManager.closeAllDeckModals();
        }
    }
    
    async saveGameState() {
        this.updateStatus('Saving is temporarily disabled while we upgrade storage.');
        console.warn('saveGameState called but feature is disabled');
    }
    
    async loadGameState(sessionId) {
        try {
            this.isLoadingGame = true;
            this.updateStatus('Loading is temporarily disabled while we upgrade storage.');
            console.warn('loadGameState called but feature is disabled');
        } finally {
            this.isLoadingGame = false;
        }
    }
    
    async getGameSessions() {
        console.warn('getGameSessions called but feature is disabled');
        return [];
    }
    
    async deleteGameState(sessionId) {
        console.warn('deleteGameState called but feature is disabled');
        this.updateStatus('Deleting saves is temporarily disabled.');
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
        this.currentSessionId = null;
        this.isLoadingGame = false;
        this.gameState = 'welcome';
        this.panY = 0;
        
        if (this.flashcardManager) {
            this.flashcardManager.reset();
        }
        if (this.searchManager) {
            this.searchManager.reset();
        }
        if (this.welcomeManager) {
            this.welcomeManager.reset();
        }
        
        // Reset camera to default position
        this.cameraOffset = { x: 0, y: 0 };
        
        // Hide any existing modals
        this.hideStudyModal();
        
        // Remove any existing flashcard deck UI elements
        if (this.flashcardManager) {
            this.flashcardManager.closeAllDeckModals();
        }

        // Start the welcome sequence
        this.welcomeManager.startSequence();
        
        this.updateStatus('Game restarted! Enter a topic to begin learning.');
    }
    
    
    // toggleModalExpansion method removed - modal is now wide by default
}
