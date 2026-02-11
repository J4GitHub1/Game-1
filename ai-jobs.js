// AI Jobs System - Identifies top 3 most valuable tactical targets

class AIJob {
    constructor(centerTile) {
        this.centerTile = centerTile;
        this.tiles = [];           // 9 tiles in 3x3 area
        this.tileNames = '';       // Formatted tile coordinates
        this.value = 0;            // Sum of all tile scores
        this.objectiveCount = 0;   // Capturable objectives in area
        this.blueUnitCount = 0;    // Blue units (entities + cannons)
        this.totalHP = 0;          // Aggregated HP of blue units
        this.totalDPS = 0;         // Aggregated DPS of blue units
        this.flankable = false;    // Any of 40 surrounding tiles has flankOption
    }
}

class AIJobsManager {
    constructor() {
        this.jobs = [];            // Top 3 AIJob objects
        this.updateTimer = 0;
        this.updateInterval = 5.0; // Update every 5 seconds
    }

    // Main update method called from game loop
    updateAll(deltaTime, allEntities, allCannons, allObjectives) {
        this.updateTimer += deltaTime;

        if (this.updateTimer < this.updateInterval) {
            return;
        }
        this.updateTimer = 0;

        // Check if heatmap manager exists
        if (typeof heatmapManager === 'undefined') {
            return;
        }

        // Find top 3 tiles by score
        const topTiles = this.findTopTiles();

        // Create jobs for each top tile - any with blue units OR non-red objectives
        this.jobs = [];
        for (const tile of topTiles) {
            const job = new AIJob(tile);
            this.calculateJobStats(job, allEntities, allCannons, allObjectives);
            // Create jobs where blue units exist OR non-red objectives exist
            if (job.blueUnitCount > 0 || job.objectiveCount > 0) {
                this.jobs.push(job);
            }
        }
    }

    // Find top 3 highest-score tiles (with minimum separation)
    findTopTiles() {
        const allTiles = [];
        for (let y = 0; y < heatmapManager.gridSize; y++) {
            for (let x = 0; x < heatmapManager.gridSize; x++) {
                allTiles.push(heatmapManager.tiles[y][x]);
            }
        }

        // Sort by score descending
        allTiles.sort((a, b) => b.score - a.score);

        // Get top 3, ensuring they don't overlap (at least 3 tiles apart)
        const selected = [];
        for (const tile of allTiles) {
            if (selected.length >= 3) break;

            // Check if too close to already selected tiles
            const tooClose = selected.some(s =>
                Math.abs(s.gridX - tile.gridX) < 3 &&
                Math.abs(s.gridY - tile.gridY) < 3
            );

            if (!tooClose) {
                selected.push(tile);
            }
        }

        return selected;
    }

    // Calculate all stats for a job's 3x3 area
    calculateJobStats(job, allEntities, allCannons, allObjectives) {
        const cx = job.centerTile.gridX;
        const cy = job.centerTile.gridY;

        // Collect 3x3 tiles
        job.tiles = [];
        job.value = 0;
        const tileLabels = [];

        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const tile = heatmapManager.getTile(cx + dx, cy + dy);
                if (tile) {
                    job.tiles.push(tile);
                    job.value += tile.score;
                    tileLabels.push(`${cx + dx},${cy + dy}`);
                }
            }
        }
        job.tileNames = tileLabels.join(', ');

        // Count objectives, blue units, HP, DPS
        job.objectiveCount = 0;
        job.blueUnitCount = 0;
        job.totalHP = 0;
        job.totalDPS = 0;

        for (const tile of job.tiles) {
            // Count capturable objectives (not red-owned)
            for (const obj of allObjectives) {
                if (obj.faction !== 'red' && tile.containsPoint(obj.x, obj.y)) {
                    job.objectiveCount++;
                }
            }

            // Count blue entities
            for (const entity of allEntities) {
                if (!entity.isDying && entity.faction === 'blue' &&
                    tile.containsPoint(entity.x, entity.y)) {
                    job.blueUnitCount++;
                    job.totalHP += entity.health;
                    job.totalDPS += entity.damagePerSecond || 0;
                }
            }

            // Count blue cannons
            for (const cannon of allCannons) {
                if (!cannon.isDying && cannon.faction === 'blue' &&
                    tile.containsPoint(cannon.x, cannon.y)) {
                    job.blueUnitCount++;
                    job.totalHP += cannon.health || 0;
                    // Cannons have different DPS - could add if needed
                }
            }
        }

        // Check flankable (40 surrounding tiles at distance 2-3)
        job.flankable = this.checkFlankable(cx, cy);
    }

    // Check if any of the 40 indirectly surrounding tiles is flankable
    checkFlankable(centerX, centerY) {
        // Check tiles at Chebyshev distance 2 and 3 (40 tiles total)
        for (let dy = -3; dy <= 3; dy++) {
            for (let dx = -3; dx <= 3; dx++) {
                const dist = Math.max(Math.abs(dx), Math.abs(dy));
                if (dist < 2) continue; // Skip inner 3x3 (distance 0-1)

                const tile = heatmapManager.getTile(centerX + dx, centerY + dy);
                if (tile && tile.flankOption) {
                    return true;
                }
            }
        }
        return false;
    }

    // Draw debug display centered on left side of screen
    draw(ctx, canvas) {
        if (this.jobs.length === 0) return;

        ctx.save();

        // Calculate panel height and center vertically (80px per job to fit assigned groups line)
        const panelHeight = 30 + this.jobs.length * 80;
        const panelY = (canvas.height - panelHeight) / 2;

        // Semi-transparent background for readability
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(5, panelY, 450, panelHeight);

        // Title
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('AI JOBS:', 10, panelY + 10);

        // Job details
        ctx.font = '12px Arial';
        let y = panelY + 30;

        for (let i = 0; i < this.jobs.length; i++) {
            const job = this.jobs[i];
            const flankText = job.flankable ? 'TRUE' : 'FALSE';

            // Job header (gold)
            ctx.fillStyle = '#FFD700';
            ctx.fillText(
                `Job ${i + 1} (Value: ${job.value}):`,
                10, y
            );

            // Job details (white)
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText(
                `Eliminate ${job.blueUnitCount} troops, capture ${job.objectiveCount} objectives`,
                20, y + 15
            );
            ctx.fillText(
                `Tiles: ${job.tileNames}`,
                20, y + 30
            );
            ctx.fillText(
                `HP: ${Math.floor(job.totalHP)} | DPS: ${job.totalDPS.toFixed(1)} | Flankable: ${flankText}`,
                20, y + 45
            );

            // Get assigned groups from coordinator (if available)
            if (typeof aiAssignmentCoordinator !== 'undefined') {
                const assignmentInfo = aiAssignmentCoordinator.getAssignedGroupsForJob(
                    job.centerTile.gridX,
                    job.centerTile.gridY
                );

                if (assignmentInfo.groups.length > 0) {
                    // Build group list with inFight status
                    const groupStrings = assignmentInfo.groups.map(gId => {
                        const inFight = assignmentInfo.inFightGroups.includes(gId);
                        return inFight ? `G${gId}*` : `G${gId}`;
                    });

                    ctx.fillStyle = '#90EE90'; // Light green for assigned groups
                    ctx.fillText(
                        `Assigned: [${groupStrings.join(', ')}] (${assignmentInfo.status})`,
                        20, y + 60
                    );
                } else {
                    ctx.fillStyle = '#888888'; // Gray for unassigned
                    ctx.fillText(
                        `Assigned: none`,
                        20, y + 60
                    );
                }
            }

            y += 80;
        }

        ctx.restore();
    }
}

// Singleton instance
const aiJobsManager = new AIJobsManager();
