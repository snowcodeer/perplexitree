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
        this.width = window.innerWidth;
        this.height = window.innerHeight - headerHeight;
        
        // Store initial height for fixed ground positioning
        if (!this.initialHeight) {
            this.initialHeight = this.height;
        }
        
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        
        if (this.tree) {
            this.tree.x = this.width / 2;
            this.tree.y = this.initialHeight - 40;
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
        this.startWelcomeSequence();
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
    
    handleMouseDown(e) {
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
                this.growLeavesOnNode(this.hoveredNode);
            } else {
                console.log('Leaves tool: no hovered node');
                this.updateStatus('Hover over a node first, then click to add leaves!');
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
        } else if (this.currentTool === 'growth' || this.currentTool === 'leaves' || this.currentTool === 'fruit' || this.currentTool === 'flower' || this.currentTool === 'reposition' || this.currentTool === 'study') {
            this.hoveredNode = this.getNodeAtPosition(this.mousePos);
        } else if (this.currentTool === 'cut' && this.isDragging) {
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
        
        for (let i = 0; i < branchCount; i++) {
            const angle = startAngle + (angleSpread / (branchCount - 1)) * i;
            const length = 120 + Math.random() * 60; // 120-180 pixels (even longer and more varied)
            
            // Adjust angle to grow upward (subtract π/2 to rotate 90 degrees counterclockwise)
            const upwardAngle = angle - Math.PI / 2;
            
            const branch = {
                start: { x: node.x, y: node.y },
                end: {
                    x: node.x + Math.cos(upwardAngle) * length,
                    y: node.y + Math.sin(upwardAngle) * length
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
        if (Math.abs(startPoint.x - this.tree.x) < 5 && 
            Math.abs(startPoint.y - (this.tree.y - this.tree.trunkHeight)) < 5) {
            angle = (Math.random() - 0.5) * Math.PI * 1.2 - Math.PI * 0.1;
        } else {
            const parentBranch = this.tree.branches.find(b => 
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
            thickness: thickness
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
        this.tree.branches = [];
        this.tree.leaves = [];
        this.tree.fruits = [];
        this.tree.flowers = [];
        this.gameState = 'playing';
        this.updateStatus('Game restarted! Use growth tool to grow branches.');
    }
    
    showStudyModal(searchResult) {
        const modal = document.getElementById('studyModal');
        const title = document.getElementById('modalTitle');
        const description = document.getElementById('modalDescription');
        
        if (modal && title && description) {
            title.textContent = this.toProperCase(searchResult.title);
            const content = searchResult.snippet || searchResult.llm_content || 'No description available';
            
            // Create formatted content
            let formattedContent = this.formatContent(this.toProperCase(content));
            
            // Add clickable link to the source URL at the top only if it's a web search result (has a real URL)
            if (searchResult.url && searchResult.url.startsWith('http')) {
                const sourceLink = `<p><a href="${searchResult.url}" target="_blank" style="color: #3b82f6; text-decoration: underline; font-weight: 500;">Read more at source →</a></p>`;
                formattedContent = sourceLink + formattedContent;
            }
            
            description.innerHTML = formattedContent;
            modal.classList.add('show');
        }
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
    
    hideStudyModal() {
        const modal = document.getElementById('studyModal');
        if (modal) {
            modal.classList.remove('show');
        }
    }
    
    toggleModalExpansion() {
        const modalContent = document.querySelector('.modal-content');
        if (modalContent) {
            modalContent.classList.toggle('expanded');
        }
    }
}
