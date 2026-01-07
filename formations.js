// Formation Management System

class FormationEditor {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.corners = [];
        this.selectedEdges = []; // Array of edge indices that are selected
        this.maxCorners = 12;
        this.isClosed = false;
        this.gridSize = 20;
        this.cornerRadius = 6;
        this.edgeClickRadius = 8; // How close you need to click to select an edge
        
        this.setupEventListeners();
        this.draw();
    }

    setupEventListeners() {
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        this.canvas.addEventListener('contextmenu', (e) => this.handleRightClick(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    }

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    handleClick(e) {
        const pos = this.getMousePos(e);

        // If shape is closed, handle edge selection
        if (this.isClosed) {
            const edgeIndex = this.getEdgeAtPosition(pos);
            if (edgeIndex !== null) {
                // Toggle edge selection
                if (this.selectedEdges.includes(edgeIndex)) {
                    // Already selected, do nothing (deselect with right-click)
                } else {
                    this.selectedEdges.push(edgeIndex);
                    console.log(`Edge ${edgeIndex} selected`);
                }
                this.draw();
            }
            return;
        }

        // Check if clicking on first corner to close shape
        if (this.corners.length >= 3) {
            const firstCorner = this.corners[0];
            const dist = Math.sqrt((pos.x - firstCorner.x) ** 2 + (pos.y - firstCorner.y) ** 2);
            
            if (dist <= this.cornerRadius * 2) {
                this.isClosed = true;
                console.log('Formation shape closed!');
                this.draw();
                return;
            }
        }

        // Add new corner
        if (this.corners.length < this.maxCorners) {
            this.corners.push({ x: pos.x, y: pos.y });
            console.log(`Corner ${this.corners.length} placed at (${pos.x}, ${pos.y})`);
            this.draw();
        }
    }

    handleRightClick(e) {
        e.preventDefault();
        const pos = this.getMousePos(e);

        // If shape is closed, handle edge deselection
        if (this.isClosed) {
            const edgeIndex = this.getEdgeAtPosition(pos);
            if (edgeIndex !== null && this.selectedEdges.includes(edgeIndex)) {
                // Remove from selected edges
                this.selectedEdges = this.selectedEdges.filter(i => i !== edgeIndex);
                console.log(`Edge ${edgeIndex} deselected`);
                this.draw();
            }
            return;
        }

        // Find and remove corner if clicked
        for (let i = 0; i < this.corners.length; i++) {
            const corner = this.corners[i];
            const dist = Math.sqrt((pos.x - corner.x) ** 2 + (pos.y - corner.y) ** 2);
            
            if (dist <= this.cornerRadius * 2) {
                this.corners.splice(i, 1);
                console.log(`Corner ${i + 1} removed`);
                this.draw();
                return;
            }
        }
    }

    getEdgeAtPosition(pos) {
        // Check each edge to see if the position is close to it
        for (let i = 0; i < this.corners.length; i++) {
            const start = this.corners[i];
            const end = this.corners[(i + 1) % this.corners.length];
            
            const dist = this.pointToLineDistance(pos, start, end);
            
            if (dist <= this.edgeClickRadius) {
                return i;
            }
        }
        return null;
    }

    pointToLineDistance(point, lineStart, lineEnd) {
        const dx = lineEnd.x - lineStart.x;
        const dy = lineEnd.y - lineStart.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        if (length === 0) return Math.sqrt((point.x - lineStart.x) ** 2 + (point.y - lineStart.y) ** 2);
        
        // Calculate projection of point onto line
        const t = Math.max(0, Math.min(1, 
            ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (length * length)
        ));
        
        const projX = lineStart.x + t * dx;
        const projY = lineStart.y + t * dy;
        
        return Math.sqrt((point.x - projX) ** 2 + (point.y - projY) ** 2);
    }

    handleMouseMove(e) {
        const pos = this.getMousePos(e);
        let hovering = false;

        if (this.isClosed) {
            // Check if hovering over an edge
            const edgeIndex = this.getEdgeAtPosition(pos);
            hovering = edgeIndex !== null;
        } else {
            // Check if hovering over any corner
            for (const corner of this.corners) {
                const dist = Math.sqrt((pos.x - corner.x) ** 2 + (pos.y - corner.y) ** 2);
                if (dist <= this.cornerRadius * 2) {
                    hovering = true;
                    break;
                }
            }

            // Check if hovering over first corner when we have 3+ corners
            if (!hovering && this.corners.length >= 3) {
                const firstCorner = this.corners[0];
                const dist = Math.sqrt((pos.x - firstCorner.x) ** 2 + (pos.y - firstCorner.y) ** 2);
                if (dist <= this.cornerRadius * 2) {
                    hovering = true;
                }
            }
        }

        this.canvas.style.cursor = hovering ? 'pointer' : 'crosshair';
    }

    draw() {
        // Clear canvas
        this.ctx.fillStyle = 'rgba(20, 20, 20, 0.9)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw grid
        this.drawGrid();

        // Draw shape
        if (this.corners.length > 1) {
            // Draw all edges
            for (let i = 0; i < this.corners.length; i++) {
                const start = this.corners[i];
                const end = this.corners[(i + 1) % this.corners.length];
                
                // Don't draw the closing edge if shape isn't closed
                if (!this.isClosed && i === this.corners.length - 1) break;
                
                // Determine edge color
                const isSelected = this.selectedEdges.includes(i);
                this.ctx.strokeStyle = isSelected ? 'rgb(255, 255, 0)' : 'rgb(255, 0, 0)';
                this.ctx.lineWidth = this.isClosed ? 3 : 2;
                
                this.ctx.beginPath();
                this.ctx.moveTo(start.x, start.y);
                this.ctx.lineTo(end.x, end.y);
                this.ctx.stroke();
            }
            
            // Fill shape if closed
            if (this.isClosed) {
                this.ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
                this.ctx.beginPath();
                this.ctx.moveTo(this.corners[0].x, this.corners[0].y);
                for (let i = 1; i < this.corners.length; i++) {
                    this.ctx.lineTo(this.corners[i].x, this.corners[i].y);
                }
                this.ctx.closePath();
                this.ctx.fill();
            }
        }

        // Draw corners
        for (let i = 0; i < this.corners.length; i++) {
            const corner = this.corners[i];
            
            // Highlight first corner if we can close the shape
            const isFirstCorner = i === 0;
            const canClose = !this.isClosed && this.corners.length >= 3;
            
            if (isFirstCorner && canClose) {
                // Draw larger highlight for first corner
                this.ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
                this.ctx.beginPath();
                this.ctx.arc(corner.x, corner.y, this.cornerRadius * 2, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            // Draw corner
            this.ctx.fillStyle = isFirstCorner ? 'rgb(0, 255, 0)' : 'rgb(255, 255, 255)';
            this.ctx.beginPath();
            this.ctx.arc(corner.x, corner.y, this.cornerRadius, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Draw corner number
            this.ctx.fillStyle = 'rgb(0, 0, 0)';
            this.ctx.font = 'bold 10px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText((i + 1).toString(), corner.x, corner.y);
        }

        // Draw status text
        this.ctx.fillStyle = 'rgb(255, 255, 255)';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'top';
        this.ctx.fillText(`Corners: ${this.corners.length}/${this.maxCorners}`, 10, 10);
        
        if (this.isClosed) {
            this.ctx.fillStyle = 'rgb(0, 255, 0)';
            this.ctx.fillText('Shape Closed!', 10, 30);
            
            if (this.selectedEdges.length > 0) {
                this.ctx.fillStyle = 'rgb(255, 255, 0)';
                this.ctx.fillText(`Selected Edges: ${this.selectedEdges.length}`, 10, 50);
            }
        }
    }

    drawGrid() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;

        // Vertical lines
        for (let x = 0; x <= this.canvas.width; x += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }

        // Horizontal lines
        for (let y = 0; y <= this.canvas.height; y += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }

    reset() {
        this.corners = [];
        this.selectedEdges = [];
        this.isClosed = false;
        this.draw();
        console.log('Formation editor reset');
    }

    getFormationData() {
        if (!this.isClosed) {
            console.log('Cannot get formation data - shape not closed');
            return null;
        }

        return {
            corners: this.corners.map(c => ({ x: c.x, y: c.y })),
            selectedEdges: [...this.selectedEdges],
            isClosed: this.isClosed
        };
    }
}

// Formation Storage Manager
class FormationManager {
    constructor() {
        this.formations = []; // Array of saved formations
        this.nextId = 0;
    }

    saveFormation(name, formationData) {
        if (!formationData || !formationData.isClosed) {
            console.log('Cannot save - formation not complete');
            return null;
        }

        const formation = {
            id: this.nextId++,
            name: name,
            corners: formationData.corners,
            selectedEdges: formationData.selectedEdges,
            timestamp: Date.now()
        };

        this.formations.push(formation);
        console.log(`Formation "${name}" saved with ID ${formation.id}`);
        return formation;
    }

    deleteFormation(id) {
        const index = this.formations.findIndex(f => f.id === id);
        if (index !== -1) {
            const name = this.formations[index].name;
            this.formations.splice(index, 1);
            console.log(`Formation "${name}" deleted`);
            return true;
        }
        return false;
    }

    getFormation(id) {
        return this.formations.find(f => f.id === id);
    }

    getAllFormations() {
        return this.formations;
    }

    clear() {
        this.formations = [];
        this.nextId = 0;
        console.log('All formations cleared');
    }
}

// Global instances
let formationEditor = null;
const formationManager = new FormationManager();

// Generate a mini preview of a formation
function generateFormationPreview(formation, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    // Clear with dark background
    ctx.fillStyle = 'rgba(20, 20, 20, 0.9)';
    ctx.fillRect(0, 0, width, height);
    
    if (!formation.corners || formation.corners.length < 3) {
        return canvas;
    }
    
    // Calculate bounding box
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    for (const corner of formation.corners) {
        minX = Math.min(minX, corner.x);
        minY = Math.min(minY, corner.y);
        maxX = Math.max(maxX, corner.x);
        maxY = Math.max(maxY, corner.y);
    }
    
    const shapeWidth = maxX - minX;
    const shapeHeight = maxY - minY;
    
    // Calculate scale to fit preview with padding
    const padding = 10;
    const scaleX = (width - padding * 2) / shapeWidth;
    const scaleY = (height - padding * 2) / shapeHeight;
    const scale = Math.min(scaleX, scaleY);
    
    // Calculate offset to center the shape
    const offsetX = (width - shapeWidth * scale) / 2 - minX * scale;
    const offsetY = (height - shapeHeight * scale) / 2 - minY * scale;
    
    // Draw edges
    for (let i = 0; i < formation.corners.length; i++) {
        const start = formation.corners[i];
        const end = formation.corners[(i + 1) % formation.corners.length];
        
        const isSelected = formation.selectedEdges && formation.selectedEdges.includes(i);
        ctx.strokeStyle = isSelected ? 'rgb(255, 255, 0)' : 'rgb(255, 0, 0)';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.moveTo(start.x * scale + offsetX, start.y * scale + offsetY);
        ctx.lineTo(end.x * scale + offsetX, end.y * scale + offsetY);
        ctx.stroke();
    }
    
    // Fill shape
    ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
    ctx.beginPath();
    ctx.moveTo(
        formation.corners[0].x * scale + offsetX,
        formation.corners[0].y * scale + offsetY
    );
    for (let i = 1; i < formation.corners.length; i++) {
        ctx.lineTo(
            formation.corners[i].x * scale + offsetX,
            formation.corners[i].y * scale + offsetY
        );
    }
    ctx.closePath();
    ctx.fill();
    
    return canvas;
}