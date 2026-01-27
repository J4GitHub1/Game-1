// AI Group Manager - Tracks tactical stats for red faction groups

class RedGroupStats {
    constructor(groupId) {
        this.groupId = groupId;

        // Core stats
        this.totalHP = 0;
        this.totalMaxHP = 0;
        this.totalDPS = 0;
        this.avgMovementSpeed = 0;

        // Position data
        this.avgX = 0;
        this.avgY = 0;
        this.tileGridX = 0;
        this.tileGridY = 0;

        // Tile status
        this.isInBlueTerritory = false;
        this.isInDangerZone = false;

        // Composition
        this.entityCount = 0;
        this.includesCannons = false;
        this.linkedCannonIds = [];

        // Timestamps
        this.lastUpdated = 0;
    }
}

class AIGroupManager {
    constructor() {
        this.redGroupStats = new Map(); // groupId -> RedGroupStats
        this.updateTimer = 0;
        this.updateInterval = 2.0; // 2 seconds
    }

    // Check if a group belongs to the red faction
    isRedGroup(group, entityManager, cannonManager) {
        if (group.isCannonCrewGroup) {
            const cannon = cannonManager.cannons.find(c => c.id === group.linkedCannonId);
            return cannon?.faction === 'red';
        } else {
            const entities = group.getEntities(entityManager);
            return entities.length > 0 && entities[0].faction === 'red';
        }
    }

    // Called on new red group creation
    registerGroup(group) {
        if (!this.redGroupStats.has(group.id)) {
            this.redGroupStats.set(group.id, new RedGroupStats(group.id));
            console.log(`AIGroupManager: Registered red group ${group.id}`);
        }
    }

    // Called when a group is disbanded or all members die
    unregisterGroup(groupId) {
        if (this.redGroupStats.has(groupId)) {
            this.redGroupStats.delete(groupId);
            console.log(`AIGroupManager: Unregistered group ${groupId}`);
        }
    }

    // Update stats for a specific group
    updateGroupStats(group, entityManager, cannonManager, heatmapManager) {
        const stats = this.redGroupStats.get(group.id);
        if (!stats) return;

        const entities = group.getEntities(entityManager);
        const aliveEntities = entities.filter(e => !e.isDying && e.health > 0);

        // Handle empty groups
        if (aliveEntities.length === 0) {
            this.unregisterGroup(group.id);
            return;
        }

        // Reset accumulators
        let totalHP = 0;
        let totalMaxHP = 0;
        let totalDPS = 0;
        let totalSpeed = 0;
        let sumX = 0;
        let sumY = 0;

        // Calculate entity stats
        for (const entity of aliveEntities) {
            totalHP += entity.health;
            totalMaxHP += entity.maxHealth;
            totalDPS += entity.damagePerSecond;
            totalSpeed += entity.movement_speed;
            sumX += entity.x;
            sumY += entity.y;
        }

        stats.entityCount = aliveEntities.length;
        stats.totalHP = totalHP;
        stats.totalMaxHP = totalMaxHP;
        stats.totalDPS = totalDPS;
        stats.avgMovementSpeed = totalSpeed / aliveEntities.length;
        stats.avgX = sumX / aliveEntities.length;
        stats.avgY = sumY / aliveEntities.length;

        // Calculate heatmap tile position
        const tileWidth = heatmapManager.tileWidth;
        const tileHeight = heatmapManager.tileHeight;
        stats.tileGridX = Math.floor(stats.avgX / tileWidth);
        stats.tileGridY = Math.floor(stats.avgY / tileHeight);

        // Get tile status
        const tile = heatmapManager.getTile(stats.tileGridX, stats.tileGridY);
        if (tile) {
            stats.isInBlueTerritory = tile.faction === 'blue';
            stats.isInDangerZone = tile.dangerZone === true;
        } else {
            stats.isInBlueTerritory = false;
            stats.isInDangerZone = false;
        }

        // Check for cannons (cannon crew groups)
        stats.includesCannons = group.isCannonCrewGroup;
        stats.linkedCannonIds = [];

        if (group.isCannonCrewGroup && group.linkedCannonId !== null) {
            const cannon = cannonManager.cannons.find(c => c.id === group.linkedCannonId);
            if (cannon && !cannon.isDying) {
                stats.linkedCannonIds.push(cannon.id);
            }
        }

        stats.lastUpdated = performance.now();
    }

    // Main update method called from game loop
    updateAll(deltaTime, entityManager, cannonManager, heatmapManager) {
        this.updateTimer += deltaTime;

        if (this.updateTimer < this.updateInterval) {
            return;
        }
        this.updateTimer = 0;

        // Clean up any stale group references
        const validGroupIds = new Set(entityManager.groups.map(g => g.id));
        for (const groupId of this.redGroupStats.keys()) {
            if (!validGroupIds.has(groupId)) {
                this.unregisterGroup(groupId);
            }
        }

        // Update all red groups
        for (const group of entityManager.groups) {
            if (this.isRedGroup(group, entityManager, cannonManager)) {
                // Auto-register if not already tracked
                if (!this.redGroupStats.has(group.id)) {
                    this.registerGroup(group);
                }
                this.updateGroupStats(group, entityManager, cannonManager, heatmapManager);
            }
        }
    }

    // Get stats for a specific group
    getGroupStats(groupId) {
        return this.redGroupStats.get(groupId) || null;
    }

    // Get all red group stats
    getAllRedGroupStats() {
        return Array.from(this.redGroupStats.values());
    }

    // Draw debug visualization (light green crosses at average positions)
    draw(ctx, camera) {
        const crossSize = 15;
        const lineWidth = 3;

        ctx.save();
        ctx.strokeStyle = '#90EE90'; // Light green
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';

        for (const stats of this.redGroupStats.values()) {
            const screenX = stats.avgX - camera.x;
            const screenY = stats.avgY - camera.y;

            // Draw cross
            ctx.beginPath();
            // Horizontal line
            ctx.moveTo(screenX - crossSize, screenY);
            ctx.lineTo(screenX + crossSize, screenY);
            // Vertical line
            ctx.moveTo(screenX, screenY - crossSize);
            ctx.lineTo(screenX, screenY + crossSize);
            ctx.stroke();
        }

        ctx.restore();
    }
}

// Singleton instance
const aiGroupManager = new AIGroupManager();
