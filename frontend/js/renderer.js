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
        
        // Apply camera offset for all world elements (including ground)
        this.ctx.save();
        this.ctx.translate(this.game.cameraOffset.x, this.game.cameraOffset.y);
        
        this.renderGround();
        this.renderTrunk();
        this.renderBranches();
        this.renderLeaves();
        this.renderFruits();
        this.renderFlowers();
        this.renderLightSource();
        
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
        
        this.ctx.restore();
        
        this.renderUI();
    }
    
    renderGround() {
        const groundHeight = 40;
        const groundY = this.game.height - groundHeight;
        
        this.ctx.fillStyle = '#000000';
        
        // Draw the wavy top edge and extend in all directions
        this.ctx.beginPath();
        this.ctx.moveTo(-1000, groundY); // Start way to the left
        
        for (let x = -1000; x <= this.game.width + 1000; x += 3) {
            const wave = Math.sin(x * 0.01) * 6 + Math.sin(x * 0.03) * 3;
            const y = groundY + wave;
            this.ctx.lineTo(x, y);
        }
        
        // Extend the ground way down and to the sides to fill the entire area
        this.ctx.lineTo(this.game.width + 1000, this.game.height + 1000); // Bottom right
        this.ctx.lineTo(-1000, this.game.height + 1000); // Bottom left
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
    
    renderLightSource() {
        if (this.game.isNightMode) {
            // Render moon
            this.ctx.shadowColor = 'rgba(200, 200, 255, 0.6)';
            this.ctx.shadowBlur = 25;
            this.ctx.fillStyle = '#E6E6FA'; // Light purple/white
            this.ctx.beginPath();
            this.ctx.arc(this.game.lightSource.x, this.game.lightSource.y, this.game.lightSource.radius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        } else {
            // Render sun
            this.ctx.shadowColor = 'rgba(255, 255, 0, 0.8)';
            this.ctx.shadowBlur = 30;
            this.ctx.fillStyle = '#FFD700';
            this.ctx.beginPath();
            this.ctx.arc(this.game.lightSource.x, this.game.lightSource.y, this.game.lightSource.radius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        }
    }
    
    renderHoveredNode() {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.beginPath();
        this.ctx.arc(this.game.hoveredNode.x, this.game.hoveredNode.y, 8, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    renderUI() {
        // Keep text color consistent - it's rendered over the black soil
        this.ctx.fillStyle = '#ecf0f1'; // Light text that shows well over dark soil
        this.ctx.font = '12px "JetBrains Mono", "Source Code Pro", "Fira Code", "Courier New", monospace';
        
        // Position text at top left with same padding as buttons
        const textX = 20; // Same left padding as control buttons
        const textY = 20; // Back to top position
        
        if (this.game.currentTool === 'pan') {
            this.ctx.fillText('pan tool: drag to move around the view', textX, textY);
        } else if (this.game.currentTool === 'growth') {
            this.ctx.fillText('growth tool: hover over nodes and click to grow branches', textX, textY);
        } else if (this.game.currentTool === 'leaves') {
            this.ctx.fillText('leaves tool: hover over nodes and click to add leaves to its branches', textX, textY);
        } else if (this.game.currentTool === 'fruit') {
            this.ctx.fillText('bear fruit of labour: hover over flowers and click to transform them into apples', textX, textY);
        } else if (this.game.currentTool === 'flower') {
            this.ctx.fillText('blossom your knowledge: hover over branch ends and click to add flowers', textX, textY);
        } else if (this.game.currentTool === 'reposition') {
            this.ctx.fillText('reposition tool: drag branch ends to move and resize them', textX, textY);
        } else {
            this.ctx.fillText('cut tool: click and drag to prune branches', textX, textY);
        }
        
        this.ctx.fillText(`branches: ${this.game.tree.branches.length} | leaves: ${this.game.tree.leaves.length} | fruits: ${this.game.tree.fruits.length} | flowers: ${this.game.tree.flowers.length}`, 10, this.game.height - 10);
    }
}
