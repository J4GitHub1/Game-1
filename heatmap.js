// Heatmap Territorial Control System
// 400 tiles (20x20 grid) showing faction control

class HeatmapTile {
    constructor(gridX, gridY, tileWidth, tileHeight) {
        this.gridX = gridX;
        this.gridY = gridY;
        this.tileWidth = tileWidth;
        this.tileHeight = tileHeight;

        // World position of tile's top-left corner
        this.worldX = gridX * tileWidth;
        this.worldY = gridY * tileHeight;

        // World position of tile's center
        this.centerX = this.worldX + tileWidth / 2;
        this.centerY = this.worldY + tileHeight / 2;

        // Faction: 'none', 'blue', or 'red'
        this.faction = 'none';

        // Score for strategic AI (0-50)
        this.score = 0;

        // Arrow pointing to nearest tile with blue units (for tiles at distance 2-3)
        this.arrowTarget = null; // {gridX, gridY} or null

        // Flank option: tile has arrow but is NOT in any blue vision cone
        this.flankOption = false;

        // Danger zone: immediate neighbor of tile with blue units (but not if this tile has blue units)
        this.dangerZone = false;
    }

    // Check if a point (x, y) is inside this tile
    containsPoint(x, y) {
        return x >= this.worldX &&
               x < this.worldX + this.tileWidth &&
               y >= this.worldY &&
               y < this.worldY + this.tileHeight;
    }

    // Check if an entity is inside this tile
    containsEntity(entity) {
        return entity.x >= this.worldX &&
               entity.x < this.worldX + this.tileWidth &&
               entity.y >= this.worldY &&
               entity.y < this.worldY + this.tileHeight;
    }

    // Find the nearest entity from tile center
    findNearestEntity(allEntities) {
        let nearest = null;
        let nearestDistSq = Infinity;

        for (const entity of allEntities) {
            if (entity.isDying) continue;

            const dx = entity.x - this.centerX;
            const dy = entity.y - this.centerY;
            const distSq = dx * dx + dy * dy;

            if (distSq < nearestDistSq) {
                nearestDistSq = distSq;
                nearest = entity;
            }
        }

        return nearest;
    }

    // Update tile faction based on entities
    // Returns true if faction changed, false otherwise
    updateFaction(allEntities) {
        const oldFaction = this.faction;

        // Get entities inside this tile (excluding dying entities)
        const entitiesInside = allEntities.filter(e => !e.isDying && this.containsEntity(e));

        if (entitiesInside.length > 0) {
            const blueCount = entitiesInside.filter(e => e.faction === 'blue').length;
            const redCount = entitiesInside.filter(e => e.faction === 'red').length;

            if (blueCount >= 10) {
                // Blue-only advantage: 10+ blue always wins
                this.faction = 'blue';
            } else {
                // Otherwise majority wins
                if (blueCount > redCount) {
                    this.faction = 'blue';
                } else if (redCount > blueCount) {
                    this.faction = 'red';
                } else {
                    this.faction = 'none';
                }
            }
        } else {
            // No entities inside - use nearest entity's faction (no distance limit)
            const nearest = this.findNearestEntity(allEntities);
            this.faction = nearest ? nearest.faction : 'none';
        }

        return this.faction !== oldFaction;
    }

    // Update tile score based on objectives, cannons, units, and neighbors
    updateScore(allEntities, allCannons, allObjectives, getNeighborsFn) {
        let score = 0;

        // +10 for each flag (capture objective with objective_type === 'none')
        const flagsInTile = allObjectives.filter(o =>
            o.objective_type === 'none' && this.containsPoint(o.x, o.y)
        );
        score += flagsInTile.length * 20;

        // +10 for each cannon (all types)
        const cannonsInTile = allCannons.filter(c =>
            !c.isDying && this.containsPoint(c.x, c.y)
        );
        score += cannonsInTile.length * 10;

        // Only count units of this tile's faction
        if (this.faction !== 'none') {
            const factionEntities = allEntities.filter(e =>
                !e.isDying && e.faction === this.faction && this.containsEntity(e)
            );
            const regularUnits = factionEntities.filter(e => !e.mounted).length;
            const mountedUnits = factionEntities.filter(e => e.mounted).length;

            // +2 for every 20 regular units
            score += Math.floor(regularUnits / 4) * 2;
            // +4 for every 10 mounted units
            score += Math.floor(mountedUnits / 10) * 4;
        }

        // -1 for each neighboring tile of same faction
        const neighbors = getNeighborsFn(this.gridX, this.gridY);
        const sameFactionNeighbors = neighbors.filter(n => n.faction === this.faction);
        score -= sameFactionNeighbors.length;

        // +2 for each neighboring tile of opposing faction (not 'none')
        // Blue gains from red neighbors, red gains from blue neighbors
        if (this.faction === 'blue') {
            const redNeighbors = neighbors.filter(n => n.faction === 'red');
            score += redNeighbors.length * 2;
        } else if (this.faction === 'red') {
            const blueNeighbors = neighbors.filter(n => n.faction === 'blue');
            score += blueNeighbors.length * 2;
        }

        // Clamp to [0, 50]
        this.score = Math.max(0, Math.min(50, score));
    }

    // Check if tile has any non-dying entities inside
    hasEntitiesInside(allEntities) {
        return allEntities.some(e => !e.isDying && this.containsEntity(e));
    }

    // Check if tile has any cannons inside
    hasCannonsInside(allCannons) {
        return allCannons.some(c => !c.isDying && this.containsPoint(c.x, c.y));
    }

    // Check if tile has any flags inside (objective_type === 'none')
    hasFlagsInside(allObjectives) {
        return allObjectives.some(o => o.objective_type === 'none' && this.containsPoint(o.x, o.y));
    }

    // Check if tile has any game objects that should trigger updates
    hasObjectsInside(allEntities, allCannons, allObjectives) {
        return this.hasEntitiesInside(allEntities) ||
               this.hasCannonsInside(allCannons) ||
               this.hasFlagsInside(allObjectives);
    }

    // Check if tile has any blue units (entities or cannons) inside
    hasBlueUnitsInside(allEntities, allCannons) {
        const hasBlueEntities = allEntities.some(e =>
            !e.isDying && e.faction === 'blue' && this.containsEntity(e)
        );
        if (hasBlueEntities) return true;

        const hasBlueCannons = allCannons.some(c =>
            !c.isDying && c.faction === 'blue' && this.containsPoint(c.x, c.y)
        );
        return hasBlueCannons;
    }

    // Count blue units (entities + cannons) inside this tile
    countBlueUnitsInside(allEntities, allCannons) {
        let count = 0;

        for (const entity of allEntities) {
            if (!entity.isDying && entity.faction === 'blue' && this.containsEntity(entity)) {
                count++;
            }
        }

        for (const cannon of allCannons) {
            if (!cannon.isDying && cannon.faction === 'blue' && this.containsPoint(cannon.x, cannon.y)) {
                count++;
            }
        }

        return count;
    }

    // Check if there's a wall or water between this tile and target tile within 750px
    // Uses TerrainManager.getTerrainType to sample along the line
    hasObstacleTowardTarget(targetTile) {
        if (!targetTile) return false;

        const dx = targetTile.centerX - this.centerX;
        const dy = targetTile.centerY - this.centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0) return false;

        // Normalize direction
        const dirX = dx / distance;
        const dirY = dy / distance;

        // Check distance to obstacle (max 750px or distance to target, whichever is smaller)
        const checkDistance = Math.min(750, distance);

        // Sample every 50 pixels along the line
        const stepSize = 50;
        const steps = Math.ceil(checkDistance / stepSize);

        for (let i = 1; i <= steps; i++) {
            const checkDist = Math.min(i * stepSize, checkDistance);
            const checkX = this.centerX + dirX * checkDist;
            const checkY = this.centerY + dirY * checkDist;

            // Use TerrainManager to check terrain type
            if (typeof TerrainManager !== 'undefined') {
                const terrainType = TerrainManager.getTerrainType(checkX, checkY);
                if (terrainType === 'wall' || terrainType === 'water') {
                    return true;
                }
            }
        }

        return false;
    }

    // Check if this tile's center is inside a vision cone from another tile
    // Cone parameters: 145-degree angle, 1000px radius
    isInsideVisionCone(coneTile, coneHeading) {
        if (coneHeading === null) return false;

        const dx = this.centerX - coneTile.centerX;
        const dy = this.centerY - coneTile.centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Check if within cone radius (1000px)
        if (distance > 1250) return false;

        // Check if within cone angle (145 degrees = 72.5 degrees each side)
        const angleToTile = Math.atan2(dy, dx);
        let angleDiff = angleToTile - coneHeading;

        // Normalize angle difference to [-PI, PI]
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

        const halfAngle = (145 / 2) * (Math.PI / 180); // 72.5 degrees in radians
        return Math.abs(angleDiff) <= halfAngle;
    }

    // Calculate average facing direction of blue entities and cannons in this tile
    calculateAverageBlueFacing(allEntities, allCannons) {
        let sinSum = 0;
        let cosSum = 0;
        let count = 0;

        // Check blue entities in this tile
        for (const entity of allEntities) {
            if (entity.isDying || entity.faction !== 'blue') continue;
            if (!this.containsEntity(entity)) continue;

            sinSum += Math.sin(entity.heading);
            cosSum += Math.cos(entity.heading);
            count++;
        }

        // Check blue cannons in this tile
        for (const cannon of allCannons) {
            if (cannon.isDying || cannon.faction !== 'blue') continue;
            if (!this.containsPoint(cannon.x, cannon.y)) continue;

            sinSum += Math.sin(cannon.heading);
            cosSum += Math.cos(cannon.heading);
            count++;
        }

        if (count === 0) return null;

        // Calculate average angle using circular mean
        return Math.atan2(sinSum / count, cosSum / count);
    }

    // Draw a 145-degree cone with 1250px radius from tile center
    drawCone(ctx, camera, avgHeading) {
        if (avgHeading === null) return;

        const screenCenterX = this.centerX - camera.x;
        const screenCenterY = this.centerY - camera.y;
        const radius = 1250;
        const halfAngle = (145 / 2) * (Math.PI / 180); // 72.5 degrees in radians

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(screenCenterX, screenCenterY);
        ctx.arc(
            screenCenterX,
            screenCenterY,
            radius,
            avgHeading - halfAngle,
            avgHeading + halfAngle
        );
        ctx.closePath();

        ctx.fillStyle = 'rgba(0, 100, 255, 0.15)';
        ctx.fill();

        ctx.strokeStyle = 'rgba(0, 100, 255, 0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
    }

    // Calculate which tile this tile's arrow should point to
    // Called for tiles at distance 2-3 from tiles with blue units
    calculateArrow(allEntities, allCannons, getTileFn, getNeighborsFn) {
        // Reset arrow target
        this.arrowTarget = null;

        // Condition 1: If this tile has blue units, no arrow
        if (this.hasBlueUnitsInside(allEntities, allCannons)) {
            return;
        }

        // Condition 2: If any immediate neighbor has blue units, no arrow
        const neighbors = getNeighborsFn(this.gridX, this.gridY);
        for (const neighbor of neighbors) {
            if (neighbor.hasBlueUnitsInside(allEntities, allCannons)) {
                return;
            }
        }

        // Find all tiles with blue units within distance 3 (Chebyshev)
        const candidates = [];
        for (let dy = -3; dy <= 3; dy++) {
            for (let dx = -3; dx <= 3; dx++) {
                if (dx === 0 && dy === 0) continue;
                const dist = Math.max(Math.abs(dx), Math.abs(dy));
                if (dist > 3) continue;

                const tile = getTileFn(this.gridX + dx, this.gridY + dy);
                if (tile && tile.hasBlueUnitsInside(allEntities, allCannons)) {
                    const unitCount = tile.countBlueUnitsInside(allEntities, allCannons);
                    candidates.push({
                        gridX: tile.gridX,
                        gridY: tile.gridY,
                        distance: dist,
                        unitCount: unitCount
                    });
                }
            }
        }

        if (candidates.length === 0) {
            return;
        }

        // Sort by distance (ascending), then by unit count (descending)
        candidates.sort((a, b) => {
            if (a.distance !== b.distance) {
                return a.distance - b.distance; // Closer first
            }
            return b.unitCount - a.unitCount; // More units first
        });

        // Check for tie: if top two have same distance AND same unit count, no arrow
        if (candidates.length >= 2) {
            const first = candidates[0];
            const second = candidates[1];
            if (first.distance === second.distance && first.unitCount === second.unitCount) {
                return; // Tie, no arrow
            }
        }

        // Check if arrow would point at a wall or water within 750px
        const targetTile = getTileFn(candidates[0].gridX, candidates[0].gridY);
        if (this.hasObstacleTowardTarget(targetTile)) {
            return; // Obstacle blocks the arrow, no arrow
        }

        // Set arrow target to the winner
        this.arrowTarget = {
            gridX: candidates[0].gridX,
            gridY: candidates[0].gridY
        };
    }

    // Draw arrow pointing toward arrowTarget tile
    drawArrow(ctx, camera, getTileFn) {
        if (!this.arrowTarget) return;

        const targetTile = getTileFn(this.arrowTarget.gridX, this.arrowTarget.gridY);
        if (!targetTile) return;

        const screenCenterX = this.centerX - camera.x;
        const screenCenterY = this.centerY - camera.y;
        const targetScreenX = targetTile.centerX - camera.x;
        const targetScreenY = targetTile.centerY - camera.y;

        // Calculate direction
        const dx = targetScreenX - screenCenterX;
        const dy = targetScreenY - screenCenterY;
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length === 0) return;

        const dirX = dx / length;
        const dirY = dy / length;

        // Arrow line length (80% of tile width, capped)
        const arrowLength = Math.min(this.tileWidth * 0.8, length * 0.4);
        const endX = screenCenterX + dirX * arrowLength;
        const endY = screenCenterY + dirY * arrowLength;

        // Draw arrow line
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 100, 255, 0.6)';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(screenCenterX, screenCenterY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Draw arrowhead
        const headLength = 10;
        const headAngle = Math.PI / 6; // 30 degrees
        const angle = Math.atan2(dirY, dirX);

        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(
            endX - headLength * Math.cos(angle - headAngle),
            endY - headLength * Math.sin(angle - headAngle)
        );
        ctx.moveTo(endX, endY);
        ctx.lineTo(
            endX - headLength * Math.cos(angle + headAngle),
            endY - headLength * Math.sin(angle + headAngle)
        );
        ctx.stroke();

        ctx.restore();
    }

    // Draw the tile
    draw(ctx, camera) {
        const screenX = this.worldX - camera.x;
        const screenY = this.worldY - camera.y;

        // Calculate opacity based on score: 0.1 at score 0, 0.75 at score 50
        const opacity = 0.1 + (this.score / 50) * 0.65;

        // Determine color based on faction
        let fillColor;
        switch (this.faction) {
            case 'blue':
                fillColor = `rgba(0, 0, 255, ${opacity})`;
                break;
            case 'red':
                fillColor = `rgba(255, 0, 0, ${opacity})`;
                break;
            default:
                fillColor = `rgba(255, 255, 255, ${opacity})`;
        }

        ctx.fillStyle = fillColor;
        ctx.fillRect(screenX, screenY, this.tileWidth, this.tileHeight);
    }

    // Draw yellow outline for flank option tiles
    drawFlankOutline(ctx, camera) {
        if (!this.flankOption) return;

        const screenX = this.worldX - camera.x;
        const screenY = this.worldY - camera.y;

        ctx.save();
        ctx.strokeStyle = 'rgba(255, 220, 0, 0.8)';
        ctx.lineWidth = 3;
        ctx.strokeRect(screenX + 1.5, screenY + 1.5, this.tileWidth - 3, this.tileHeight - 3);
        ctx.restore();
    }

    // Draw red outline for danger zone tiles
    drawDangerOutline(ctx, camera) {
        if (!this.dangerZone) return;

        const screenX = this.worldX - camera.x;
        const screenY = this.worldY - camera.y;

        ctx.save();
        ctx.strokeStyle = 'rgba(255, 50, 50, 0.8)';
        ctx.lineWidth = 3;
        ctx.strokeRect(screenX + 1.5, screenY + 1.5, this.tileWidth - 3, this.tileHeight - 3);
        ctx.restore();
    }
}

class Heatmap {
    constructor() {
        this.tiles = [];
        this.tileWidth = 0;
        this.tileHeight = 0;
        this.gridSize = 20; // 20x20 = 400 tiles
        this.globalUpdateTimer = 0; // Global timer for all tile updates
    }

    // Initialize or reinitialize the heatmap
    initialize(mapWidth, mapHeight) {
        this.tileWidth = Math.floor(mapWidth / this.gridSize);
        this.tileHeight = Math.floor(mapHeight / this.gridSize);

        // Create 2D array of tiles
        this.tiles = [];
        for (let y = 0; y < this.gridSize; y++) {
            const row = [];
            for (let x = 0; x < this.gridSize; x++) {
                row.push(new HeatmapTile(x, y, this.tileWidth, this.tileHeight));
            }
            this.tiles.push(row);
        }

        console.log(`Heatmap initialized: ${this.gridSize}x${this.gridSize} tiles, each ${this.tileWidth}x${this.tileHeight}px`);
    }

    // Get a tile by grid coordinates (with bounds checking)
    getTile(gridX, gridY) {
        if (gridX < 0 || gridX >= this.gridSize || gridY < 0 || gridY >= this.gridSize) {
            return null;
        }
        return this.tiles[gridY][gridX];
    }

    // Get all valid neighboring tiles (up to 8)
    getNeighbors(gridX, gridY) {
        const neighbors = [];
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const neighbor = this.getTile(gridX + dx, gridY + dy);
                if (neighbor) {
                    neighbors.push(neighbor);
                }
            }
        }
        return neighbors;
    }

    // Get tiles at Chebyshev distance [minDist, maxDist] from a grid position
    // Returns array of {tile, distance}
    getTilesAtDistance(gridX, gridY, minDist, maxDist) {
        const result = [];
        for (let dy = -maxDist; dy <= maxDist; dy++) {
            for (let dx = -maxDist; dx <= maxDist; dx++) {
                const dist = Math.max(Math.abs(dx), Math.abs(dy)); // Chebyshev distance
                if (dist >= minDist && dist <= maxDist) {
                    const tile = this.getTile(gridX + dx, gridY + dy);
                    if (tile) {
                        result.push({ tile, distance: dist });
                    }
                }
            }
        }
        return result;
    }

    // Update tiles selectively based on content (global timer)
    updateAll(deltaTime, allEntities, allCannons = [], allObjectives = []) {
        // Increment global timer
        this.globalUpdateTimer += deltaTime;

        // Only update every 1 second
        if (this.globalUpdateTimer < 1.0) {
            return;
        }
        this.globalUpdateTimer = 0;

        // Helper function for score calculation
        const getNeighborsFn = (gridX, gridY) => this.getNeighbors(gridX, gridY);

        // Track which tiles were updated this cycle (to prevent cascade)
        const updatedThisCycle = new Set();

        // First pass: find and update tiles that have entities, cannons, or flags inside
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const tile = this.tiles[y][x];

                // Only process tiles with objects inside
                if (tile.hasObjectsInside(allEntities, allCannons, allObjectives)) {
                    tile.updateFaction(allEntities);
                    tile.updateScore(allEntities, allCannons, allObjectives, getNeighborsFn);
                    updatedThisCycle.add(`${x},${y}`);
                }
            }
        }

        // Second pass: update neighbors of tiles that were updated (no cascade)
        const neighborsToUpdate = new Set();
        for (const key of updatedThisCycle) {
            const [x, y] = key.split(',').map(Number);
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    const neighborKey = `${x + dx},${y + dy}`;
                    // Only add if not already updated in first pass
                    if (!updatedThisCycle.has(neighborKey)) {
                        neighborsToUpdate.add(neighborKey);
                    }
                }
            }
        }

        // Update the neighbors
        for (const key of neighborsToUpdate) {
            const [nx, ny] = key.split(',').map(Number);
            const neighbor = this.getTile(nx, ny);
            if (neighbor) {
                neighbor.updateFaction(allEntities);
                neighbor.updateScore(allEntities, allCannons, allObjectives, getNeighborsFn);
            }
        }

        // Third pass: Calculate arrows for tiles at distance 2-3 from tiles with blue units
        const getTileFn = (gridX, gridY) => this.getTile(gridX, gridY);

        // First, clear all arrow targets, flank options, and danger zones
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                this.tiles[y][x].arrowTarget = null;
                this.tiles[y][x].flankOption = false;
                this.tiles[y][x].dangerZone = false;
            }
        }

        // Find tiles with blue units and notify tiles at distance 2-3
        const tilesToCalculateArrows = new Set();
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const tile = this.tiles[y][x];
                if (tile.hasBlueUnitsInside(allEntities, allCannons)) {
                    // Get tiles at distance 2-3 (not immediate neighbors)
                    const distantTiles = this.getTilesAtDistance(x, y, 2, 3);
                    for (const { tile: distantTile } of distantTiles) {
                        tilesToCalculateArrows.add(`${distantTile.gridX},${distantTile.gridY}`);
                    }
                }
            }
        }

        // Calculate arrows for those tiles
        for (const key of tilesToCalculateArrows) {
            const [tx, ty] = key.split(',').map(Number);
            const tile = this.getTile(tx, ty);
            if (tile) {
                tile.calculateArrow(allEntities, allCannons, getTileFn, getNeighborsFn);
            }
        }

        // Fourth pass: Calculate flankOption for tiles with arrows
        // Collect blue tiles with their vision cone headings
        const blueVisionCones = [];
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const tile = this.tiles[y][x];
                if (tile.hasBlueUnitsInside(allEntities, allCannons)) {
                    const heading = tile.calculateAverageBlueFacing(allEntities, allCannons);
                    if (heading !== null) {
                        blueVisionCones.push({ tile, heading });
                    }
                }
            }
        }

        // For each tile with an arrow, check if it's inside any vision cone
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const tile = this.tiles[y][x];
                if (tile.arrowTarget) {
                    // Check if inside any blue vision cone
                    let insideCone = false;
                    for (const { tile: coneTile, heading } of blueVisionCones) {
                        if (tile.isInsideVisionCone(coneTile, heading)) {
                            insideCone = true;
                            break;
                        }
                    }
                    // Flank option = has arrow AND NOT inside any cone
                    tile.flankOption = !insideCone;
                }
            }
        }

        // Fifth pass: Calculate dangerZone for immediate neighbors of tiles with blue units
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const tile = this.tiles[y][x];
                if (tile.hasBlueUnitsInside(allEntities, allCannons)) {
                    // Mark all immediate neighbors as danger zones (unless they have blue units)
                    const neighbors = this.getNeighbors(x, y);
                    for (const neighbor of neighbors) {
                        if (!neighbor.hasBlueUnitsInside(allEntities, allCannons)) {
                            neighbor.dangerZone = true;
                        }
                    }
                }
            }
        }
    }

    // Draw all tiles
    draw(ctx, camera) {
        // First pass: draw all tile backgrounds
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                this.tiles[y][x].draw(ctx, camera);
            }
        }

        // Second pass: draw arrows for tiles pointing to blue units
        const getTileFn = (gridX, gridY) => this.getTile(gridX, gridY);
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const tile = this.tiles[y][x];
                if (tile.arrowTarget) {
                    tile.drawArrow(ctx, camera, getTileFn);
                }
            }
        }

        // Third pass: draw yellow outlines for flank option tiles
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                this.tiles[y][x].drawFlankOutline(ctx, camera);
            }
        }

        // Fourth pass: draw red outlines for danger zone tiles
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                this.tiles[y][x].drawDangerOutline(ctx, camera);
            }
        }
    }
}

// Singleton instance
const heatmapManager = new Heatmap();
