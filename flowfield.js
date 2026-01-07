// flowfield.js
// Simple MinHeap for priority queue
class MinHeap {
    constructor() {
        this.heap = [];
    }
    
    push(item) {
        this.heap.push(item);
        this.bubbleUp(this.heap.length - 1);
    }
    
    pop() {
        if (this.heap.length === 0) return null;
        if (this.heap.length === 1) return this.heap.pop();
        
        const min = this.heap[0];
        this.heap[0] = this.heap.pop();
        this.bubbleDown(0);
        return min;
    }
    
    bubbleUp(index) {
        while (index > 0) {
            const parentIndex = Math.floor((index - 1) / 2);
            if (this.heap[index].cost >= this.heap[parentIndex].cost) break;
            
            [this.heap[index], this.heap[parentIndex]] = [this.heap[parentIndex], this.heap[index]];
            index = parentIndex;
        }
    }
    
    bubbleDown(index) {
        while (true) {
            let minIndex = index;
            const leftChild = 2 * index + 1;
            const rightChild = 2 * index + 2;
            
            if (leftChild < this.heap.length && this.heap[leftChild].cost < this.heap[minIndex].cost) {
                minIndex = leftChild;
            }
            if (rightChild < this.heap.length && this.heap[rightChild].cost < this.heap[minIndex].cost) {
                minIndex = rightChild;
            }
            
            if (minIndex === index) break;
            
            [this.heap[index], this.heap[minIndex]] = [this.heap[minIndex], this.heap[index]];
            index = minIndex;
        }
    }
    
    get length() {
        return this.heap.length;
    }
}

class FlowField {
    constructor(goalX, goalY, mapWidth, mapHeight, cellSize = 10) {
        this.goalX = goalX;
        this.goalY = goalY;
        this.cellSize = cellSize;
        this.mapWidth = mapWidth;
        this.mapHeight = mapHeight;
        
        this.cols = Math.ceil(mapWidth / cellSize);
        this.rows = Math.ceil(mapHeight / cellSize);
        
        // Grids
        this.costGrid = []; // Distance to goal
        this.directionGrid = []; // {dx, dy} normalized vectors
        
        // Initialize grids
        for (let row = 0; row < this.rows; row++) {
            this.costGrid[row] = [];
            this.directionGrid[row] = [];
            for (let col = 0; col < this.cols; col++) {
                this.costGrid[row][col] = Infinity;
                this.directionGrid[row][col] = null;
            }
        }
        
        console.log(`FlowField created: ${this.cols}×${this.rows} = ${this.cols * this.rows} cells`);
        
        // Calculate immediately
        this.calculate();
    }
    
    worldToGrid(x, y) {
        return {
            col: Math.floor(x / this.cellSize),
            row: Math.floor(y / this.cellSize)
        };
    }
    
    gridToWorld(col, row) {
        return {
            x: col * this.cellSize + this.cellSize / 2,
            y: row * this.cellSize + this.cellSize / 2
        };
    }
    
    isWalkable(col, row) {
    // Check bounds
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) {
        return false;
    }
    
    // Sample multiple points within the cell (not just center)
    const worldPos = this.gridToWorld(col, row);
    const samplePoints = [
        { x: worldPos.x, y: worldPos.y }, // Center
        { x: worldPos.x - this.cellSize/3, y: worldPos.y - this.cellSize/3 }, // Top-left
        { x: worldPos.x + this.cellSize/3, y: worldPos.y - this.cellSize/3 }, // Top-right
        { x: worldPos.x - this.cellSize/3, y: worldPos.y + this.cellSize/3 }, // Bottom-left
        { x: worldPos.x + this.cellSize/3, y: worldPos.y + this.cellSize/3 }  // Bottom-right
    ];
    
    // Cell is unwalkable if ANY sample point hits a wall
    for (const point of samplePoints) {
        const terrainType = TerrainManager.getTerrainType(point.x, point.y);
        if (terrainType === 'wall' || terrainType === 'water') {
            return false;
        }
    }
    
    return true;
}
    
    calculate() {
        const startTime = performance.now();
        
        // Convert goal to grid coordinates
        const goalGrid = this.worldToGrid(this.goalX, this.goalY);
        
        // Priority queue (min-heap simulation using array)
        const openList = new MinHeap();
        
        // Start at goal with cost 0
        this.costGrid[goalGrid.row][goalGrid.col] = 0;
        openList.push({ col: goalGrid.col, row: goalGrid.row, cost: 0 });
        
        // 8-directional movement (cardinal + diagonal)
        const neighbors = [
            { dcol: -1, drow: 0, cost: 1.0 },    // Left
            { dcol: 1, drow: 0, cost: 1.0 },     // Right
            { dcol: 0, drow: -1, cost: 1.0 },    // Up
            { dcol: 0, drow: 1, cost: 1.0 },     // Down
            { dcol: -1, drow: -1, cost: 1.414 }, // Up-Left
            { dcol: 1, drow: -1, cost: 1.414 },  // Up-Right
            { dcol: -1, drow: 1, cost: 1.414 },  // Down-Left
            { dcol: 1, drow: 1, cost: 1.414 }    // Down-Right
        ];
        
        let processedCells = 0;
        
        // Dijkstra's algorithm (reverse - from goal outward)
        while (openList.length > 0) {
            // Find lowest cost cell (simple approach - could use proper heap)
            const current = openList.pop();
            if (!current) break;
            
            processedCells++;
            
            // Check all neighbors
            for (const neighbor of neighbors) {
                const nextCol = current.col + neighbor.dcol;
                const nextRow = current.row + neighbor.drow;
                
                // Check if walkable
                if (!this.isWalkable(nextCol, nextRow)) {
                    continue;
                }
                
                // Calculate new cost
                const newCost = current.cost + neighbor.cost;
                
                // If this path is better
                if (newCost < this.costGrid[nextRow][nextCol]) {
                    this.costGrid[nextRow][nextCol] = newCost;
                    
                    // Store direction pointing BACK to current (toward goal)
                    // Normalize the direction vector
                    const magnitude = Math.sqrt(neighbor.dcol ** 2 + neighbor.drow ** 2);
                    this.directionGrid[nextRow][nextCol] = {
                        dx: -neighbor.dcol / magnitude, // Negative because we want direction TO parent
                        dy: -neighbor.drow / magnitude
                    };
                    
                    // Add to open list
                    openList.push({ col: nextCol, row: nextRow, cost: newCost });
                }
            }
        }
        
        const endTime = performance.now();
        console.log(`Flow field calculated in ${(endTime - startTime).toFixed(2)}ms (${processedCells} cells processed)`);
    }
    
    getDirection(x, y) {
        const grid = this.worldToGrid(x, y);
        
        // Bounds check
        if (grid.col < 0 || grid.col >= this.cols || grid.row < 0 || grid.row >= this.rows) {
            return null;
        }
        
        return this.directionGrid[grid.row][grid.col];
    }
    
    getCost(x, y) {
        const grid = this.worldToGrid(x, y);
        
        if (grid.col < 0 || grid.col >= this.cols || grid.row < 0 || grid.row >= this.rows) {
            return Infinity;
        }
        
        return this.costGrid[grid.row][grid.col];
    }
    
    // DEBUG VISUALIZATION
    draw(ctx, camera) {
        const arrowSize = this.cellSize * 0.4;
        
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const dir = this.directionGrid[row][col];
                
                if (!dir) continue; // Skip cells with no direction
                
                const worldPos = this.gridToWorld(col, row);
                const screenX = worldPos.x - camera.x;
                const screenY = worldPos.y - camera.y;
                
                // Skip if off-screen
                if (screenX < -50 || screenX > ctx.canvas.width + 50 ||
                    screenY < -50 || screenY > ctx.canvas.height + 50) {
                    continue;
                }
                
                // Draw arrow
                ctx.save();
                ctx.translate(screenX, screenY);
                
                const angle = Math.atan2(dir.dy, dir.dx);
                ctx.rotate(angle);
                
                // Arrow color based on cost (blue = close, red = far)
                const cost = this.costGrid[row][col];
                const maxCost = 500;
                const hue = (1 - Math.min(cost / maxCost, 1)) * 240; // Blue to red
                ctx.strokeStyle = `hsla(${hue}, 80%, 50%, 0.6)`;
                ctx.fillStyle = `hsla(${hue}, 80%, 50%, 0.6)`;
                ctx.lineWidth = 1.5;
                
                // Arrow shaft
                ctx.beginPath();
                ctx.moveTo(-arrowSize / 2, 0);
                ctx.lineTo(arrowSize / 2, 0);
                ctx.stroke();
                
                // Arrow head
                ctx.beginPath();
                ctx.moveTo(arrowSize / 2, 0);
                ctx.lineTo(arrowSize / 4, -arrowSize / 4);
                ctx.lineTo(arrowSize / 4, arrowSize / 4);
                ctx.closePath();
                ctx.fill();
                
                ctx.restore();
            }
        }
        
        // Draw goal marker
        const screenGoalX = this.goalX - camera.x;
        const screenGoalY = this.goalY - camera.y;
        
        ctx.fillStyle = 'rgba(0, 255, 0, 0.5)';
        ctx.beginPath();
        ctx.arc(screenGoalX, screenGoalY, 15, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = 'rgb(0, 255, 0)';
        ctx.lineWidth = 3;
        ctx.stroke();
    }
}