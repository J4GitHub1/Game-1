// AI Assignment Coordinator
// Connects AIJobsManager (targets) with AIGroupManager (groups) for coordinated attacks
// Includes Rally & Muster system to prevent groups from being picked off one-by-one

// ============================================================================
// Helper Functions
// ============================================================================

// Calculate arrow angle from arrowTarget object
function getArrowAngle(tile) {
    if (!tile.arrowTarget) return null;
    const targetTile = heatmapManager.getTile(tile.arrowTarget.gridX, tile.arrowTarget.gridY);
    if (!targetTile) return null;
    return Math.atan2(
        targetTile.centerY - tile.centerY,
        targetTile.centerX - tile.centerX
    );
}

// Move all entities in a group to target position WITH SCATTER
// Skips crew members (they follow their cannon automatically)
// Moves any red cannons whose crew belong to this group
function issueGroupMovement(groupId, x, y, entityManager, scatterRadius = 50) {
    const group = entityManager.groups.find(g => g.id === groupId);
    if (!group) return;
    const entities = group.getEntities(entityManager);
    const movedCannonIds = new Set();

    for (const entity of entities) {
        if (!entity.isDying && entity.health > 0) {
            // Skip crew members - they follow their cannon automatically
            if (entity.isCrewMember) {
                // Move the cannon instead (once per cannon)
                if (entity.assignedCannonId != null && !movedCannonIds.has(entity.assignedCannonId)) {
                    movedCannonIds.add(entity.assignedCannonId);
                    const cannon = cannonManager.cannons.find(c => c.id === entity.assignedCannonId);
                    if (cannon && !cannon.isDying && cannon.health > 0) {
                        const angle = Math.random() * Math.PI * 2;
                        const distance = Math.random() * scatterRadius;
                        cannon.moveTo(x + Math.cos(angle) * distance, y + Math.sin(angle) * distance);
                    }
                }
                continue;
            }

            // Add random scatter offset for each entity
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * scatterRadius;
            const scatteredX = x + Math.cos(angle) * distance;
            const scatteredY = y + Math.sin(angle) * distance;
            entity.moveTo(scatteredX, scatteredY);
        }
    }

    // Also move red cannons linked to this group (cannon crew groups)
    if (group.isCannonCrewGroup && group.linkedCannonId != null && !movedCannonIds.has(group.linkedCannonId)) {
        const cannon = cannonManager.cannons.find(c => c.id === group.linkedCannonId);
        if (cannon && !cannon.isDying && cannon.health > 0) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * scatterRadius;
            cannon.moveTo(x + Math.cos(angle) * distance, y + Math.sin(angle) * distance);
        }
    }
}

// NOTE: We no longer forcibly stop entities - this was causing the freezing bug.
// Instead, we just stop issuing movement commands (via inFight flag) and let
// the micro behavior naturally take over as entities engage enemies.

// Set orientation for all entities in a group
function setGroupOrientation(groupId, angle, entityManager) {
    const group = entityManager.groups.find(g => g.id === groupId);
    if (!group) return;
    for (const entity of group.getEntities(entityManager)) {
        if (!entity.isDying && entity.health > 0) {
            entity.targetHeading = angle;
            entity.isRotating = true;
        }
    }
}

// Calculate distance between two points
function coordinatorCalculateDistance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// Calculate group strength (HP + DPS weighted)
function calculateGroupStrength(groupStats) {
    return groupStats.totalHP + (groupStats.totalDPS * 10);
}

// Check line of sight between two points (blocked by walls only)
function hasLineOfSightBetweenPoints(x1, y1, x2, y2) {
    if (typeof TerrainManager === 'undefined') return true;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 1) return true;

    const samples = Math.ceil(distance / 10); // Check every 10px

    for (let i = 1; i <= samples; i++) {
        const t = i / samples;
        const checkX = x1 + dx * t;
        const checkY = y1 + dy * t;

        const terrainType = TerrainManager.getTerrainType(checkX, checkY);

        if (terrainType === 'wall') {
            return false; // Blocked by wall
        }
    }

    return true; // Clear line of sight
}

// ============================================================================
// JobAssignment Class - Tracks assignment by tile position (not job ID)
// ============================================================================

class JobAssignment {
    constructor(targetGridX, targetGridY) {
        this.targetGridX = targetGridX;      // Job center tile X
        this.targetGridY = targetGridY;      // Job center tile Y
        this.assignedGroupIds = [];
        this.rallyPoint = null;              // {x, y, gridX, gridY}
        this.status = 'collecting';          // collecting -> mustered -> executing

        this.groupsAtRally = new Set();
        this.musterStartTime = null;
        this.musterTimeout = 90.0;           // Max wait seconds

        this.requiredStrength = 0;
        this.arrivedStrength = 0;

        // Track which groups are in combat (inFight)
        this.groupsInFight = new Set();
    }

    // Find current job matching this assignment's position
    getCurrentJob() {
        return aiJobsManager.jobs.find(job =>
            job.centerTile.gridX === this.targetGridX &&
            job.centerTile.gridY === this.targetGridY
        );
    }
}

// ============================================================================
// AIAssignmentCoordinator Class - Main coordinator
// ============================================================================

class AIAssignmentCoordinator {
    constructor() {
        this.jobAssignments = new Map();  // "gridX,gridY" -> JobAssignment
        this.updateTimer = 0;
        this.updateInterval = 5.0;
        this.enabled = false;             // Toggle via god menu
        this.debugEnabled = false;

        // Vision range for rally point distance calculation (110% of this)
        // Rally points must be beyond vision range so units don't lock onto enemies while collecting
        this.TYPICAL_VISION_RANGE = 1500;  // pixels - entity FOV/engagement range
        this.RALLY_DISTANCE_MULTIPLIER = 1;  // 100% of vision range 
    }

    // Generate key for position-based tracking
    positionKey(gridX, gridY) {
        return `${gridX},${gridY}`;
    }

    // Main update method - called every frame
    updateAll(deltaTime, entityManager) {
        if (!this.enabled) return;

        // Clean up dead groups and finished assignments every frame
        this.cleanupAssignments();

        // Update inFight status for all assigned groups
        this.updateInFightStatus(entityManager);

        // Always update phase transitions every frame
        this.updatePhases(deltaTime, entityManager);

        this.updateTimer += deltaTime;
        if (this.updateTimer < this.updateInterval) {
            return;
        }
        this.updateTimer = 0;

        // Re-evaluate assignments every 5 seconds
        this.evaluateAssignments(entityManager);
    }

    // ========================================================================
    // InFight Detection
    // ========================================================================

    updateInFightStatus(entityManager) {
        for (const [, assignment] of this.jobAssignments) {
            for (const groupId of assignment.assignedGroupIds) {
                const isInFight = this.checkGroupInFight(groupId, entityManager);

                if (isInFight) {
                    if (!assignment.groupsInFight.has(groupId)) {
                        assignment.groupsInFight.add(groupId);

                        // If entering hold due to danger zone, stop movement so units actually halt
                        if (this.isGroupOnDangerTile(groupId)) {
                            this.haltGroup(groupId, entityManager);
                            console.log(`[AI Coordinator] Group ${groupId} HOLDING on danger tile`);
                        } else {
                            console.log(`[AI Coordinator] Group ${groupId} entered combat (inFight) - micro behavior active`);
                        }
                    }
                } else {
                    if (assignment.groupsInFight.has(groupId)) {
                        assignment.groupsInFight.delete(groupId);
                        console.log(`[AI Coordinator] Group ${groupId} exited combat (inFight cleared)`);
                    }
                }
            }
        }
    }

    checkGroupInFight(groupId, entityManager) {
        const group = entityManager.groups.find(g => g.id === groupId);
        if (!group) return false;

        const entities = group.getEntities(entityManager);
        const livingEntities = entities.filter(e => !e.isDying && e.health > 0);

        if (livingEntities.length === 0) return false;

        // Condition 1: Any entity has locked onto a blue unit
        for (const entity of livingEntities) {
            if (entity.lockedTarget &&
                entity.lockedTarget.faction === 'blue' &&
                !entity.lockedTarget.isDying) {
                return true;
            }
        }

        // Condition 2: Any blue entity has locked onto a member of this group (under attack)
        const groupEntityIds = new Set(livingEntities.map(e => e.id));
        for (const entity of entityManager.entities) {
            if (entity.isDying || entity.faction !== 'blue') continue;
            if (entity.lockedTarget && groupEntityIds.has(entity.lockedTarget.id)) {
                return true;  // A blue unit is targeting our group
            }
        }

        // Condition 3: Any entity is responding to a capture objective's call (captureMovementActive)
        for (const entity of livingEntities) {
            if (entity.captureMovementActive || entity.captureMovementPending) {
                return true;  // Entity is moving to capture
            }
        }

        // Condition 4: Group average position is on dangerZone tile - hold regardless of LOS
        const stats = aiGroupManager.getGroupStats(groupId);
        if (!stats) return false;

        // Get the tile at group's average position
        const groupTile = heatmapManager.getTile(stats.tileGridX, stats.tileGridY);
        if (!groupTile) return false;

        if (groupTile.dangerZone) {
            return true;
        }

        return false;
    }

    // Check if a group is currently in fight (used by evaluateAssignments)
    isGroupInFight(groupId) {
        for (const assignment of this.jobAssignments.values()) {
            if (assignment.groupsInFight.has(groupId)) {
                return true;
            }
        }
        return false;
    }

    // Check if a group's center is on a danger tile
    isGroupOnDangerTile(groupId) {
        const stats = aiGroupManager.getGroupStats(groupId);
        if (!stats) return false;
        const tile = heatmapManager.getTile(stats.tileGridX, stats.tileGridY);
        return tile ? tile.dangerZone : false;
    }

    // Stop all movement for a group (one-time halt, not per-frame)
    // Each unit stops after a random 0-2s delay so it looks organic
    // Skips crew members - halts cannons instead
    haltGroup(groupId, entityManager) {
        const group = entityManager.groups.find(g => g.id === groupId);
        if (!group) return;
        const entities = group.getEntities(entityManager);
        const scheduledCannonIds = new Set();

        for (const entity of entities) {
            if (!entity.isDying && entity.health > 0) {
                const delay = Math.random() * 2000; // 0-2 seconds

                if (entity.isCrewMember) {
                    // Halt the cannon instead (once per cannon)
                    if (entity.assignedCannonId != null && !scheduledCannonIds.has(entity.assignedCannonId)) {
                        scheduledCannonIds.add(entity.assignedCannonId);
                        const cannonId = entity.assignedCannonId;
                        setTimeout(() => {
                            const cannon = cannonManager.cannons.find(c => c.id === cannonId);
                            if (cannon) {
                                cannon.isMoving = false;
                                cannon.targetX = null;
                                cannon.targetY = null;
                            }
                        }, delay);
                    }
                    continue;
                }

                const ent = entity;
                setTimeout(() => {
                    if (!ent.isDying && ent.health > 0) {
                        ent.isMoving = false;
                        ent.targetX = null;
                        ent.targetY = null;
                    }
                }, delay);
            }
        }

        // Also halt cannon linked to crew group
        if (group.isCannonCrewGroup && group.linkedCannonId != null && !scheduledCannonIds.has(group.linkedCannonId)) {
            const cannonId = group.linkedCannonId;
            const delay = Math.random() * 2000;
            setTimeout(() => {
                const cannon = cannonManager.cannons.find(c => c.id === cannonId);
                if (cannon) {
                    cannon.isMoving = false;
                    cannon.targetX = null;
                    cannon.targetY = null;
                }
            }, delay);
        }
    }

    // ========================================================================
    // Assignment Logic
    // ========================================================================

    evaluateAssignments(entityManager) {
        const jobs = aiJobsManager.jobs;
        const allGroupStats = aiGroupManager.getAllRedGroupStats();

        if (jobs.length === 0 || allGroupStats.length === 0) return;

        // Filter jobs that have actual targets (enemies OR objectives)
        const activeJobs = jobs.filter(job =>
            job.blueUnitCount > 0 || job.objectiveCount > 0
        );

        if (activeJobs.length === 0) {
            this.cleanupAssignments();
            return;
        }

        // Step 1: Update requiredStrength for all existing assignments (enemy strength may have changed)
        for (const [, assignment] of this.jobAssignments) {
            const job = assignment.getCurrentJob();
            if (job) {
                assignment.requiredStrength = job.totalHP + (job.totalDPS * 10);
            }
        }

        // Step 2: Rebalance - release excess groups from over-strength assignments
        // Only release groups that are NOT inFight (fighting groups stay committed)
        for (const [, assignment] of this.jobAssignments) {
            if (assignment.assignedGroupIds.length <= 1) continue; // Keep at least 1 group

            let assignedStrength = 0;
            const groupStrengths = [];
            for (const gid of assignment.assignedGroupIds) {
                const gs = aiGroupManager.getGroupStats(gid);
                const strength = gs ? calculateGroupStrength(gs) : 0;
                assignedStrength += strength;
                groupStrengths.push({ groupId: gid, strength });
            }

            // Release groups if we have more than 150% of required strength (clear overkill)
            const excessThreshold = assignment.requiredStrength * 1.5;
            if (assignedStrength > excessThreshold && assignment.assignedGroupIds.length > 1) {
                // Sort weakest first - release weakest groups to where they're needed more
                groupStrengths.sort((a, b) => a.strength - b.strength);

                for (const { groupId, strength } of groupStrengths) {
                    // Don't release groups that are actively fighting
                    if (assignment.groupsInFight.has(groupId)) continue;
                    // Keep at least one group
                    if (assignment.assignedGroupIds.length <= 1) break;
                    // Stop releasing if we'd drop below 110% required
                    if (assignedStrength - strength < assignment.requiredStrength * 1.1) break;

                    // Release this group
                    assignment.assignedGroupIds = assignment.assignedGroupIds.filter(id => id !== groupId);
                    assignment.groupsAtRally.delete(groupId);
                    assignment.groupsInFight.delete(groupId);
                    assignedStrength -= strength;

                    console.log(`[AI Coordinator] Released group ${groupId} from job at (${assignment.targetGridX}, ${assignment.targetGridY}) - over-strength`);
                }
            }
        }

        // Step 3: Build available groups list (unassigned, alive, not inFight)
        const assignedGroupIds = new Set();
        for (const assignment of this.jobAssignments.values()) {
            assignment.assignedGroupIds.forEach(id => assignedGroupIds.add(id));
        }

        const availableGroups = allGroupStats.filter(stats =>
            !assignedGroupIds.has(stats.groupId) &&
            stats.entityCount > 0 &&
            !this.isGroupInFight(stats.groupId)
        );

        // Step 4: Ensure every active job has at least one assignment
        for (const job of activeJobs) {
            const key = this.positionKey(job.centerTile.gridX, job.centerTile.gridY);

            if (!this.jobAssignments.has(key)) {
                if (availableGroups.length === 0) continue;

                const bestGroup = this.selectGroupForJob(job, availableGroups);
                if (!bestGroup) continue;

                const assignment = new JobAssignment(
                    job.centerTile.gridX,
                    job.centerTile.gridY
                );
                assignment.assignedGroupIds.push(bestGroup.groupId);
                assignment.requiredStrength = job.totalHP + (job.totalDPS * 10);
                assignment.rallyPoint = this.selectRallyPoint(job, [bestGroup]);

                this.jobAssignments.set(key, assignment);

                console.log(`[AI Coordinator] Assigned group ${bestGroup.groupId} to job at (${job.centerTile.gridX}, ${job.centerTile.gridY})`);

                const idx = availableGroups.indexOf(bestGroup);
                if (idx > -1) availableGroups.splice(idx, 1);
            }
        }

        // Step 5: Reinforce under-strength assignments (regardless of phase)
        // Prioritize biggest strength deficit first
        while (availableGroups.length > 0) {
            let assignedAny = false;

            const jobsByNeed = activeJobs
                .map(job => {
                    const key = this.positionKey(job.centerTile.gridX, job.centerTile.gridY);
                    const assignment = this.jobAssignments.get(key);
                    if (!assignment) return null;

                    let assignedStrength = 0;
                    for (const gid of assignment.assignedGroupIds) {
                        const gs = aiGroupManager.getGroupStats(gid);
                        if (gs) assignedStrength += calculateGroupStrength(gs);
                    }

                    const deficit = assignment.requiredStrength - assignedStrength;
                    return { job, assignment, key, deficit };
                })
                .filter(e => e !== null && e.deficit > 0) // Only reinforce jobs that actually need it
                .sort((a, b) => b.deficit - a.deficit);

            for (const { job, assignment } of jobsByNeed) {
                if (availableGroups.length === 0) break;

                const bestGroup = this.selectGroupForJob(job, availableGroups);
                if (!bestGroup) continue;

                assignment.assignedGroupIds.push(bestGroup.groupId);

                console.log(`[AI Coordinator] Reinforcing job at (${job.centerTile.gridX}, ${job.centerTile.gridY}) with group ${bestGroup.groupId} [${assignment.status}] - now has ${assignment.assignedGroupIds.length} groups`);

                const idx = availableGroups.indexOf(bestGroup);
                if (idx > -1) availableGroups.splice(idx, 1);

                assignedAny = true;
            }

            if (!assignedAny) break;
        }
    }

    selectGroupForJob(job, availableGroups) {
        // Prefer groups closer to the job, with sufficient strength
        let best = null;
        let bestScore = -Infinity;

        for (const stats of availableGroups) {
            const distance = coordinatorCalculateDistance(
                stats.avgX, stats.avgY,
                job.centerTile.centerX, job.centerTile.centerY
            );
            const strength = calculateGroupStrength(stats);

            // Score: strength matters more than distance
            const score = strength - (distance * 0.1);

            if (score > bestScore) {
                bestScore = score;
                best = stats;
            }
        }

        return best;
    }

    // ========================================================================
    // Rally Point Selection
    // ========================================================================

    selectRallyPoint(job, assignedGroups) {
        const candidates = [];

        // Minimum distance from job target: 110% of typical weapon range
        // This ensures units reach rally before locking onto enemies
        const minDistanceFromJob = this.TYPICAL_VISION_RANGE * this.RALLY_DISTANCE_MULTIPLIER;

        // Search tiles at distance 2-6 from job center (expanded range to find far enough tiles)
        for (let distance = 2; distance <= 6; distance++) {
            for (let dy = -distance; dy <= distance; dy++) {
                for (let dx = -distance; dx <= distance; dx++) {
                    // Only check perimeter (not interior already checked)
                    if (Math.abs(dx) < distance && Math.abs(dy) < distance) continue;

                    const tile = heatmapManager.getTile(
                        job.centerTile.gridX + dx,
                        job.centerTile.gridY + dy
                    );
                    if (!tile) continue;

                    // Check actual pixel distance from rally point to job center
                    const pixelDistToJob = coordinatorCalculateDistance(
                        tile.centerX, tile.centerY,
                        job.centerTile.centerX, job.centerTile.centerY
                    );

                    // Skip if too close - units would lock onto enemies before reaching rally
                    if (pixelDistToJob < minDistanceFromJob) continue;

                    const safety = this.evaluateTileSafety(tile);
                    if (safety > 0.5) {
                        candidates.push({ tile, safety, distance, pixelDistToJob });
                    }
                }
            }
        }

        if (candidates.length === 0) {
            return this.findFallbackRallyPoint(job, assignedGroups);
        }

        // Select best rally point
        let best = candidates[0];
        let bestScore = -Infinity;

        const avgGroupX = assignedGroups.reduce((sum, g) => sum + g.avgX, 0) / assignedGroups.length;
        const avgGroupY = assignedGroups.reduce((sum, g) => sum + g.avgY, 0) / assignedGroups.length;

        for (const rally of candidates) {
            let score = rally.safety * 100;

            // Prefer tiles that are just beyond minimum distance (not too far)
            // Ideal distance is minDistanceFromJob + 50px buffer
            const idealDist = minDistanceFromJob + 50;
            const distanceBonus = 1.0 - Math.abs(rally.pixelDistToJob - idealDist) / 200;
            score += distanceBonus * 30;

            // Prefer rally points closer to groups (minimize travel)
            const centralityDist = coordinatorCalculateDistance(
                rally.tile.centerX, rally.tile.centerY,
                avgGroupX, avgGroupY
            );
            score -= centralityDist / 50;

            if (score > bestScore) {
                bestScore = score;
                best = rally;
            }
        }

        return {
            x: best.tile.centerX,
            y: best.tile.centerY,
            gridX: best.tile.gridX,
            gridY: best.tile.gridY
        };
    }

    evaluateTileSafety(tile) {
        let safety = 1.0;

        // Major safety penalties
        if (tile.dangerZone) safety -= 0.8;
        if (tile.faction === 'blue') safety -= 0.4;

        // Check neighboring tiles for safety buffer
        const neighbors = heatmapManager.getNeighbors(tile.gridX, tile.gridY);
        let dangerousNeighbors = 0;
        for (const neighbor of neighbors) {
            if (neighbor.dangerZone) dangerousNeighbors++;
        }
        safety -= dangerousNeighbors * 0.1;

        return Math.max(safety, 0.0);
    }

    findFallbackRallyPoint(job, assignedGroups) {
        // Use average group position as fallback, but ensure minimum distance from job
        const avgX = assignedGroups.reduce((sum, g) => sum + g.avgX, 0) / assignedGroups.length;
        const avgY = assignedGroups.reduce((sum, g) => sum + g.avgY, 0) / assignedGroups.length;

        const minDistanceFromJob = this.TYPICAL_VISION_RANGE * this.RALLY_DISTANCE_MULTIPLIER;

        // Check if group position is already far enough from job
        const distToJob = coordinatorCalculateDistance(avgX, avgY, job.centerTile.centerX, job.centerTile.centerY);

        let rallyX = avgX;
        let rallyY = avgY;

        if (distToJob < minDistanceFromJob) {
            // Group is too close - push rally point away from job
            const dx = avgX - job.centerTile.centerX;
            const dy = avgY - job.centerTile.centerY;
            const angle = Math.atan2(dy, dx);

            // Place rally at minimum safe distance in direction away from job
            rallyX = job.centerTile.centerX + Math.cos(angle) * minDistanceFromJob;
            rallyY = job.centerTile.centerY + Math.sin(angle) * minDistanceFromJob;
        }

        // Try to get tile at position for grid coordinates
        let gridX = 0, gridY = 0;
        if (typeof heatmapManager.getTileAtPosition === 'function') {
            const tile = heatmapManager.getTileAtPosition(rallyX, rallyY);
            if (tile) {
                gridX = tile.gridX;
                gridY = tile.gridY;
            }
        }

        return {
            x: rallyX,
            y: rallyY,
            gridX: gridX,
            gridY: gridY
        };
    }

    // ========================================================================
    // Phase Execution
    // ========================================================================

    updatePhases(deltaTime, entityManager) {
        const currentTime = performance.now() / 1000;

        for (const [key, assignment] of this.jobAssignments) {
            const job = assignment.getCurrentJob();
            if (!job) continue;

            switch (assignment.status) {
                case 'collecting':
                    this.executeRallyPhase(assignment, entityManager, currentTime);
                    break;
                case 'mustered':
                    this.executeAdvancePhase(assignment, job, entityManager);
                    break;
                case 'executing':
                    this.maintainAdvance(assignment, job, entityManager);
                    break;
            }
        }
    }

    executeRallyPhase(assignment, entityManager, currentTime) {
        const RALLY_RADIUS = 100;

        for (const groupId of assignment.assignedGroupIds) {
            // Skip movement for groups that are inFight - let them fight normally
            if (assignment.groupsInFight.has(groupId)) {
                continue;
            }

            const stats = aiGroupManager.getGroupStats(groupId);
            if (!stats) continue;

            const distanceToRally = coordinatorCalculateDistance(
                stats.avgX, stats.avgY,
                assignment.rallyPoint.x, assignment.rallyPoint.y
            );

            if (distanceToRally < RALLY_RADIUS) {
                // Group has arrived at rally point
                if (!assignment.groupsAtRally.has(groupId)) {
                    assignment.groupsAtRally.add(groupId);
                    console.log(`[AI Coordinator] Group ${groupId} arrived at rally (${assignment.groupsAtRally.size}/${assignment.assignedGroupIds.length})`);
                }
            }

            // Keep moving toward rally (with scatter)
            issueGroupMovement(groupId, assignment.rallyPoint.x, assignment.rallyPoint.y, entityManager, 40);
        }

        // Check muster conditions
        if (this.checkMusterConditions(assignment, currentTime)) {
            assignment.status = 'mustered';
            console.log(`[AI Coordinator] Force mustered (${assignment.groupsAtRally.size} groups, ${Math.floor(assignment.arrivedStrength)} strength), ready to advance`);
        }
    }

    checkMusterConditions(assignment, currentTime) {
        // Recalculate arrived strength from living groups actually at rally
        assignment.arrivedStrength = 0;
        for (const groupId of assignment.groupsAtRally) {
            const gs = aiGroupManager.getGroupStats(groupId);
            if (gs) assignment.arrivedStrength += calculateGroupStrength(gs);
        }

        // Strength threshold must ALWAYS be met (90%)
        const hasMinimumStrength = assignment.arrivedStrength >= assignment.requiredStrength * 0.9;

        // Single group - advance once at rally IF strength met
        if (assignment.assignedGroupIds.length === 1 && assignment.groupsAtRally.size === 1) {
            return hasMinimumStrength;
        }

        // Start timeout on first arrival
        if (assignment.groupsAtRally.size > 0 && assignment.musterStartTime === null) {
            assignment.musterStartTime = currentTime;
        }

        // Check timeout - but ONLY advance if strength threshold is also met
        if (assignment.musterStartTime !== null) {
            const waitTime = currentTime - assignment.musterStartTime;
            if (waitTime > assignment.musterTimeout && hasMinimumStrength) {
                console.log(`[AI Coordinator] Muster timeout (${waitTime.toFixed(1)}s) + strength met, advancing with ${assignment.groupsAtRally.size} available groups`);
                return true;
            }
        }

        const hasMultipleGroups = assignment.groupsAtRally.size >= 2;

        return hasMinimumStrength && hasMultipleGroups;
    }

    executeAdvancePhase(assignment, job, entityManager) {
        console.log(`[AI Coordinator] COORDINATED ADVANCE - ${assignment.groupsAtRally.size} groups moving to target`);

        for (const groupId of assignment.assignedGroupIds) {
            // Skip movement for groups that are inFight - let them fight normally
            if (assignment.groupsInFight.has(groupId)) {
                continue;
            }

            // Only advance groups that are at rally
            if (!assignment.groupsAtRally.has(groupId)) continue;

            // Move to job center (with scatter)
            issueGroupMovement(groupId, job.centerTile.centerX, job.centerTile.centerY, entityManager, 60);

            // If flankable, orient using arrow angle
            if (job.flankable) {
                const flankTile = this.findFlankTile(job);
                if (flankTile) {
                    const angle = getArrowAngle(flankTile);
                    if (angle !== null) {
                        setGroupOrientation(groupId, angle, entityManager);
                    }
                }
            }
        }

        assignment.status = 'executing';
    }

    findFlankTile(job) {
        // Search for flank option tiles at distance 2-3 from job center
        for (let dy = -3; dy <= 3; dy++) {
            for (let dx = -3; dx <= 3; dx++) {
                const dist = Math.max(Math.abs(dx), Math.abs(dy));
                if (dist < 2 || dist > 3) continue;

                const tile = heatmapManager.getTile(
                    job.centerTile.gridX + dx,
                    job.centerTile.gridY + dy
                );
                if (tile && tile.flankOption) return tile;
            }
        }
        return null;
    }

    maintainAdvance(assignment, job, entityManager) {
        // Reissue movement for all assigned groups (including reinforcements that joined mid-execution)
        for (const groupId of assignment.assignedGroupIds) {
            // Skip movement for groups that are inFight - let them fight normally
            if (assignment.groupsInFight.has(groupId)) {
                continue;
            }

            const stats = aiGroupManager.getGroupStats(groupId);
            if (!stats) continue;

            const distance = coordinatorCalculateDistance(
                stats.avgX, stats.avgY,
                job.centerTile.centerX, job.centerTile.centerY
            );

            // Send all non-fighting groups toward target (reinforcements skip rally)
            if (distance > 200) {
                issueGroupMovement(groupId, job.centerTile.centerX, job.centerTile.centerY, entityManager, 60);
            }
        }
    }

    // ========================================================================
    // Cleanup
    // ========================================================================

    cleanupAssignments() {
        for (const [key, assignment] of this.jobAssignments) {
            // Remove if job no longer exists
            const job = assignment.getCurrentJob();
            if (!job) {
                this.jobAssignments.delete(key);
                console.log(`[AI Coordinator] Assignment removed (job no longer exists)`);
                continue;
            }

            // JOB DONE CHECK: Remove if job has no more enemies AND no more objectives
            if (job.blueUnitCount === 0 && job.objectiveCount === 0) {
                this.jobAssignments.delete(key);
                console.log(`[AI Coordinator] Assignment removed (job DONE - area cleared)`);
                continue;
            }

            // Remove dead groups from assignment
            assignment.assignedGroupIds = assignment.assignedGroupIds.filter(id =>
                aiGroupManager.getGroupStats(id) !== null
            );

            assignment.groupsAtRally = new Set(
                [...assignment.groupsAtRally].filter(id =>
                    assignment.assignedGroupIds.includes(id)
                )
            );

            // Also clean up groupsInFight
            assignment.groupsInFight = new Set(
                [...assignment.groupsInFight].filter(id =>
                    assignment.assignedGroupIds.includes(id)
                )
            );

            // Recalculate arrivedStrength from living groups at rally
            assignment.arrivedStrength = 0;
            for (const groupId of assignment.groupsAtRally) {
                const gs = aiGroupManager.getGroupStats(groupId);
                if (gs) assignment.arrivedStrength += calculateGroupStrength(gs);
            }

            // Remove if all groups dead
            if (assignment.assignedGroupIds.length === 0) {
                this.jobAssignments.delete(key);
                console.log(`[AI Coordinator] Assignment removed (all groups destroyed)`);
            }
        }
    }

    // ========================================================================
    // Get assigned groups for a job (used by AIJobsManager for debug display)
    // ========================================================================

    getAssignedGroupsForJob(jobGridX, jobGridY) {
        const key = this.positionKey(jobGridX, jobGridY);
        const assignment = this.jobAssignments.get(key);
        if (!assignment) return { groups: [], inFightGroups: [] };

        return {
            groups: [...assignment.assignedGroupIds],
            inFightGroups: [...assignment.groupsInFight],
            status: assignment.status
        };
    }

    // ========================================================================
    // Debug Visualization
    // ========================================================================

    draw(ctx, camera) {
        if (!this.debugEnabled) return;

        for (const [key, assignment] of this.jobAssignments) {
            if (!assignment.rallyPoint) continue;

            const rallyX = assignment.rallyPoint.x - camera.x;
            const rallyY = assignment.rallyPoint.y - camera.y;

            ctx.save();

            // Draw rally point circle (gold, dashed)
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 3;
            ctx.setLineDash([10, 5]);

            ctx.beginPath();
            ctx.arc(rallyX, rallyY, 80, 0, Math.PI * 2);
            ctx.stroke();

            // Draw rally flag marker
            ctx.fillStyle = '#FFD700';
            ctx.setLineDash([]);
            ctx.fillRect(rallyX - 2, rallyY - 40, 4, 40);  // Flag pole

            // Flag triangle
            ctx.beginPath();
            ctx.moveTo(rallyX, rallyY - 40);
            ctx.lineTo(rallyX + 20, rallyY - 30);
            ctx.lineTo(rallyX, rallyY - 20);
            ctx.fill();

            // Status text
            ctx.font = 'bold 12px Arial';
            ctx.fillStyle = '#FFFFFF';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 3;

            const inFightCount = assignment.groupsInFight.size;
            const statusText = `${assignment.groupsAtRally.size}/${assignment.assignedGroupIds.length} ready [${assignment.status}]${inFightCount > 0 ? ` (${inFightCount} fighting)` : ''}`;
            ctx.strokeText(statusText, rallyX + 25, rallyY);
            ctx.fillText(statusText, rallyX + 25, rallyY);

            // Phase-specific visualization
            if (assignment.status === 'collecting') {
                // Draw lines from groups to rally (faded yellow, red for inFight)
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.globalAlpha = 0.4;

                for (const groupId of assignment.assignedGroupIds) {
                    const stats = aiGroupManager.getGroupStats(groupId);
                    if (!stats) continue;

                    const groupX = stats.avgX - camera.x;
                    const groupY = stats.avgY - camera.y;

                    // Use red for inFight groups, yellow for others
                    ctx.strokeStyle = assignment.groupsInFight.has(groupId) ? '#FF4444' : '#FFD700';

                    ctx.beginPath();
                    ctx.moveTo(groupX, groupY);
                    ctx.lineTo(rallyX, rallyY);
                    ctx.stroke();
                }
            } else if (assignment.status === 'mustered' || assignment.status === 'executing') {
                // Draw advance arrow to target (bold red)
                const job = assignment.getCurrentJob();
                if (job) {
                    const targetX = job.centerTile.centerX - camera.x;
                    const targetY = job.centerTile.centerY - camera.y;

                    ctx.strokeStyle = '#FF6B6B';
                    ctx.lineWidth = 4;
                    ctx.setLineDash([10, 5]);
                    ctx.globalAlpha = 0.8;

                    ctx.beginPath();
                    ctx.moveTo(rallyX, rallyY);
                    ctx.lineTo(targetX, targetY);
                    ctx.stroke();

                    // Arrowhead
                    const angle = Math.atan2(targetY - rallyY, targetX - rallyX);
                    const arrowSize = 20;

                    ctx.fillStyle = '#FF6B6B';
                    ctx.setLineDash([]);
                    ctx.beginPath();
                    ctx.moveTo(targetX, targetY);
                    ctx.lineTo(
                        targetX - arrowSize * Math.cos(angle - Math.PI / 6),
                        targetY - arrowSize * Math.sin(angle - Math.PI / 6)
                    );
                    ctx.lineTo(
                        targetX - arrowSize * Math.cos(angle + Math.PI / 6),
                        targetY - arrowSize * Math.sin(angle + Math.PI / 6)
                    );
                    ctx.fill();
                }
            }

            ctx.restore();
        }
    }
}

// Create singleton instance
const aiAssignmentCoordinator = new AIAssignmentCoordinator();
