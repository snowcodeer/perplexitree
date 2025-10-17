/**
 * Rendering System - Handles all visual rendering
 */
class Renderer {
    constructor(game) {
        this.game = game;
        this.ctx = game.ctx;
    }
    
    render() {
        this.ctx.clearRect(0, 0, this.game.width, this.game.height);
        
        this.renderGround();
        this.renderTrunk();
        this.renderBranches();
        this.renderLeaves();
        this.renderFruits();
        this.renderFlowers();
        
        if ((this.game.currentTool === 'growth' || this.game.currentTool === 'leaves' || this.game.currentTool === 'fruit' || this.game.currentTool === 'flower' || this.game.currentTool === 'reposition') && this.game.hoveredNode) {
            this.renderHoveredNode();
        }
        
        if (this.game.currentTool === 'cut' && this.game.isDragging && this.game.dragStart && this.game.dragEnd) {
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
            this.ctx.lineWidth = 3;
            this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath();
            this.ctx.moveTo(this.game.dragStart.x, this.game.dragStart.y);
            this.ctx.lineTo(this.game.dragEnd.x, this.game.dragEnd.y);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }
        
        this.renderUI();
    }
    
    renderGround() {
        const groundHeight = 40;
        const groundY = this.game.height - groundHeight;
        
        this.ctx.fillStyle = '#000000';
        this.ctx.beginPath();
        this.ctx.moveTo(0, groundY);
        
        for (let x = 0; x <= this.game.width; x += 3) {
            const wave = Math.sin(x * 0.01) * 6 + Math.sin(x * 0.03) * 3;
            const y = groundY + wave;
            this.ctx.lineTo(x, y);
        }
        
        this.ctx.lineTo(this.game.width, this.game.height);
        this.ctx.lineTo(0, this.game.height);
        this.ctx.closePath();
        this.ctx.fill();
    }
    
    renderTrunk() {
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 20;
        this.ctx.lineCap = 'square';
        this.ctx.lineJoin = 'miter';
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.game.tree.x, this.game.tree.y);
        
        const controlX = this.game.tree.x + 5;
        const controlY = this.game.tree.y - this.game.tree.trunkHeight * 0.5;
        const endX = this.game.tree.x;
        const endY = this.game.tree.y - this.game.tree.trunkHeight;
        
        this.ctx.quadraticCurveTo(controlX, controlY, endX, endY);
        this.ctx.stroke();
    }
    
    renderBranches() {
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineCap = 'square';
        this.ctx.lineJoin = 'miter';
        
        this.game.tree.branches.forEach((branch, index) => {
            this.ctx.lineWidth = branch.thickness || 3;
            
            this.ctx.beginPath();
            this.ctx.moveTo(branch.start.x, branch.start.y);
            
            const dx = branch.end.x - branch.start.x;
            const dy = branch.end.y - branch.start.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx);
            
            const seed1 = (branch.start.x + branch.start.y + index) * 0.1;
            const seed2 = (branch.end.x + branch.end.y + index) * 0.15;
            
            const curveIntensity = length * 0.25;
            const curveAngle1 = angle + Math.sin(seed1) * 0.3;
            const curveAngle2 = angle + Math.sin(seed2) * 0.4;
            
            const control1X = branch.start.x + Math.cos(curveAngle1) * curveIntensity * 0.6;
            const control1Y = branch.start.y + Math.sin(curveAngle1) * curveIntensity * 0.6;
            
            const control2X = branch.start.x + dx * 0.6 + Math.cos(curveAngle2) * curveIntensity * 0.4;
            const control2Y = branch.start.y + dy * 0.6 + Math.sin(curveAngle2) * curveIntensity * 0.4;
            
            this.ctx.bezierCurveTo(control1X, control1Y, control2X, control2Y, branch.end.x, branch.end.y);
            this.ctx.stroke();
        });
    }
    
    renderLeaves() {
        this.game.tree.leaves.forEach(leaf => {
            // Update leaf position based on current branch position (for growing branches)
            if (leaf.branch && leaf.t !== undefined) {
                const leafX = leaf.branch.start.x + (leaf.branch.end.x - leaf.branch.start.x) * leaf.t;
                const leafY = leaf.branch.start.y + (leaf.branch.end.y - leaf.branch.start.y) * leaf.t;
                
                leaf.x = leafX + leaf.offsetX;
                leaf.y = leafY + leaf.offsetY;
            }
            
            const swayX = Math.sin(Date.now() * 0.002 + leaf.sway) * 1;
            const swayY = Math.cos(Date.now() * 0.0015 + leaf.sway) * 0.5;
            
            this.ctx.save();
            this.ctx.translate(leaf.x + swayX, leaf.y + swayY);
            this.ctx.rotate(leaf.angle + Math.sin(Date.now() * 0.003 + leaf.sway) * 0.1);
            
            this.ctx.fillStyle = '#2d5016';
            this.ctx.beginPath();
            this.ctx.ellipse(0, 0, leaf.size, leaf.size * 0.6, 0, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.strokeStyle = '#1a3009';
            this.ctx.lineWidth = 0.5;
            this.ctx.beginPath();
            this.ctx.moveTo(0, -leaf.size * 0.6);
            this.ctx.lineTo(0, leaf.size * 0.6);
            this.ctx.stroke();
            
            this.ctx.restore();
        });
    }
    
    renderFruits() {
        this.game.tree.fruits.forEach(fruit => {
            // Update fruit position if branch moved
            if (fruit.branch) {
                fruit.x = fruit.branch.end.x;
                fruit.y = fruit.branch.end.y;
            }
            
            const swayX = Math.sin(Date.now() * 0.001 + fruit.sway) * 2;
            const swayY = Math.cos(Date.now() * 0.0015 + fruit.sway) * 1;
            
            this.ctx.save();
            this.ctx.translate(fruit.x + swayX, fruit.y + swayY);
            
            // Draw fruit with emoji
            this.ctx.font = `${fruit.size}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(fruit.type, 0, 0);
            
            this.ctx.restore();
        });
    }
    
    renderFlowers() {
        this.game.tree.flowers.forEach(flower => {
            // Update flower position if branch moved
            if (flower.branch) {
                flower.x = flower.branch.end.x;
                flower.y = flower.branch.end.y;
            }
            
            const swayX = Math.sin(Date.now() * 0.0008 + flower.sway) * 3;
            const swayY = Math.cos(Date.now() * 0.0012 + flower.sway) * 2;
            
            this.ctx.save();
            this.ctx.translate(flower.x + swayX, flower.y + swayY);
            
            // Draw flower with emoji
            this.ctx.font = `${flower.size}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(flower.type, 0, 0);
            
            this.ctx.restore();
        });
    }
    
    // Light source rendering removed
    
    renderHoveredNode() {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.beginPath();
        this.ctx.arc(this.game.hoveredNode.x, this.game.hoveredNode.y, 8, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    renderUI() {
        this.ctx.fillStyle = '#ecf0f1';
        this.ctx.font = '14px Arial';
        
        if (this.game.currentTool === 'growth') {
            this.ctx.fillText('Growth Tool: Hover over nodes and click to grow branches', 10, 20);
        } else if (this.game.currentTool === 'leaves') {
            this.ctx.fillText('Leaves Tool: Hover over nodes and click to add leaves to its branches', 10, 20);
        } else if (this.game.currentTool === 'fruit') {
            this.ctx.fillText('Bear Fruit of Labour: Hover over flowers and click to transform them into apples', 10, 20);
        } else if (this.game.currentTool === 'flower') {
            this.ctx.fillText('Blossom Your Knowledge: Hover over branch ends and click to add flowers', 10, 20);
        } else if (this.game.currentTool === 'reposition') {
            this.ctx.fillText('Reposition Tool: Drag branch ends to move and resize them', 10, 20);
        } else {
            this.ctx.fillText('Cut Tool: Click and drag to prune branches', 10, 20);
        }
        
        this.ctx.fillText(`Branches: ${this.game.tree.branches.length} | Leaves: ${this.game.tree.leaves.length} | Fruits: ${this.game.tree.fruits.length} | Flowers: ${this.game.tree.flowers.length}`, 10, this.game.height - 10);
    }
}
