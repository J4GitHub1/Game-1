// Light Cannon - Stationary artillery piece

class LightCannon {
    static nextId = 0;

    constructor(x, y, faction = 'none') {
        this.id = LightCannon.nextId++;
        this.x = x;
        this.y = y;

        // Faction: 'none', 'blue', or 'red'
        this.faction = faction;

        // Visual properties
        this.radius = 4;
        this.barrelLength = 7;
        this.heading = 0; // Direction the cannon faces (radians)

        // Selection state
        this.isSelected = false;

        // Health
        this.health = 200;
        this.maxHealth = 200;
        this.isDying = false;
        this.deathTimer = 0;
        this.deathDuration = 0.5; // Shorter death animation for cannon

        // Linked capture objective (created automatically)
        this.captureObjective = null;

        // Crew system
        this.crewIds = [];
        this.maxCrew = 5;
        this.recruitmentCooldown = 0;
        this.recruitmentInterval = 1.0; // 1 second between recruitment attempts

        console.log(`LightCannon ${this.id} spawned at (${x}, ${y}) with faction: ${faction}`);
    }

    // Get color based on faction
    getFactionColor(opacity = 1.0) {
        switch (this.faction) {
            case 'blue':
                return `rgba(0, 0, 255, ${opacity})`;
            case 'red':
                return `rgba(255, 0, 0, ${opacity})`;
            case 'none':
            default:
                return `rgba(255, 255, 255, ${opacity})`;
        }
    }

    update(deltaTime) {
        // Handle death animation
        if (this.isDying) {
            this.deathTimer += deltaTime;
            if (this.deathTimer >= this.deathDuration) {
                return false; // Signal removal
            }
        }

        // Fire damage (same logic as entities)
        if (!this.isDying && typeof fireManager !== 'undefined') {
            const fires = fireManager.getAllFires();

            for (const fire of fires) {
                const dx = this.x - fire.x;
                const dy = this.y - fire.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                // Check if cannon is within fire radius
                if (distance <= fire.radius + this.radius) {
                    // Apply damage: 10 HP/second (same as entities)
                    const damage = 10 * deltaTime;
                    this.takeDamage(damage);

                    // Log first damage instance per fire
                    if (!fire.damagedCannons) fire.damagedCannons = new Set();
                    if (!fire.damagedCannons.has(this.id)) {
                        fire.damagedCannons.add(this.id);
                        console.log(`Cannon ${this.id} entered fire ${fire.id} - taking fire damage`);
                    }
                }
            }
        }

        // Update recruitment cooldown
        if (this.recruitmentCooldown > 0) {
            this.recruitmentCooldown -= deltaTime;
        }

        // Attempt recruitment if faction is set, crew not full, and cooldown expired
        if (this.faction !== 'none' &&
            this.crewIds.length < this.maxCrew &&
            this.recruitmentCooldown <= 0 &&
            !this.isDying) {
            this.attemptRecruitment();
        }

        // Health regeneration: 1 HP/s only if 5 crew AND all crew are inside capture radius
        if (!this.isDying && this.health < this.maxHealth && this.crewIds.length === this.maxCrew) {
            const captureRadius = this.captureObjective?.capture_radius || 25;
            let allCrewInRadius = true;

            for (const crewId of this.crewIds) {
                const crewEntity = entityManager.getEntity(crewId);
                if (!crewEntity || crewEntity.isDying) {
                    allCrewInRadius = false;
                    break;
                }

                const dx = crewEntity.x - this.x;
                const dy = crewEntity.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance > captureRadius) {
                    allCrewInRadius = false;
                    break;
                }
            }

            if (allCrewInRadius) {
                const regenAmount = 1 * deltaTime;
                this.health = Math.min(this.maxHealth, this.health + regenAmount);
            }
        }

        return true;
    }

    attemptRecruitment() {
        const entities = entityManager.getAllEntities();
        const captureRadius = this.captureObjective?.capture_radius || 25;

        // Find eligible entities: same faction, in range, not dying, not already crew
        const eligible = entities.filter(e => {
            if (e.isDying || e.isCrewMember) return false;
            if (e.faction !== this.faction) return false;

            const dx = e.x - this.x;
            const dy = e.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return distance <= captureRadius;
        });

        // Shuffle for random selection (Fisher-Yates)
        for (let i = eligible.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [eligible[i], eligible[j]] = [eligible[j], eligible[i]];
        }

        // Recruit missing personnel (max 5 per operation)
        const needed = this.maxCrew - this.crewIds.length;
        const toRecruit = Math.min(needed, eligible.length, 5);

        for (let i = 0; i < toRecruit; i++) {
            const entity = eligible[i];
            entity.isCrewMember = true;
            entity.assignedCannonId = this.id;
            this.crewIds.push(entity.id);
            console.log(`Entity ${entity.id} recruited as crew for cannon ${this.id}`);
        }

        if (toRecruit > 0) {
            console.log(`Cannon ${this.id} recruited ${toRecruit} crew (total: ${this.crewIds.length}/${this.maxCrew})`);
        }

        // Always set cooldown after attempt
        this.recruitmentCooldown = this.recruitmentInterval;
    }

    getCrewCount() {
        return this.crewIds.length;
    }

    removeFromCrew(entityId) {
        this.crewIds = this.crewIds.filter(id => id !== entityId);
    }

    draw(ctx, camera) {
        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;

        // Calculate opacity for death animation
        let opacity = 1.0;
        if (this.isDying) {
            opacity = 1.0 - (this.deathTimer / this.deathDuration);
        }

        // Get color based on faction and selection
        let color;
        if (this.isSelected && !this.isDying) {
            color = 'rgb(0, 255, 0)'; // Selected = green
        } else {
            color = this.getFactionColor(opacity);
        }

        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.rotate(this.heading);

        const squareSize = 8;
        const carriageWidth = 12;
        const carriageHeight = 6;
        const barrelThickness = 4;
        const barrelExtendLeft = 4;
        const barrelExtendRight = 6;

        ctx.fillStyle = color;

        // 1. Draw square (centered at origin)
        ctx.fillRect(-squareSize / 2, -squareSize / 2, squareSize, squareSize);

        // 2. Draw carriage rectangle (extends from square center to the right)
        ctx.fillRect(0, -carriageHeight / 2, carriageWidth, carriageHeight);

        // 3. Draw barrel (thin rectangle through the middle, extending beyond both edges)
        ctx.fillRect(-squareSize / 2 - barrelExtendLeft, -barrelThickness / 2,
                     squareSize / 2 + carriageWidth + barrelExtendLeft + barrelExtendRight, barrelThickness);

        ctx.restore();

        // Draw selection indicator
        if (this.isSelected && !this.isDying) {
            ctx.strokeStyle = 'rgb(0, 255, 0)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(screenX, screenY, 12, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    // Set the direction the cannon faces
    setHeading(angle) {
        this.heading = angle;
    }

    // Point cannon toward a target position
    aimAt(targetX, targetY) {
        this.heading = Math.atan2(targetY - this.y, targetX - this.x);
    }

    // Take damage
    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0 && !this.isDying) {
            this.startDying();
        }
    }

    startDying() {
        this.isDying = true;
        this.deathTimer = 0;

        // Spawn explosion on death (size 0.5, no burn)
        if (typeof explosionManager !== 'undefined') {
            explosionManager.addExplosion(this.x, this.y, 0.5, false);
            console.log(`Cannon ${this.id} destroyed - explosion spawned`);
        }

        // Remove capture objective
        if (this.captureObjective) {
            const index = captureObjectiveManager.objectives.indexOf(this.captureObjective);
            if (index !== -1) {
                captureObjectiveManager.objectives.splice(index, 1);
                console.log(`Cannon ${this.id} capture objective removed`);
            }
            this.captureObjective = null;
        }

        // Clear crew (they become normal entities again)
        for (const crewId of this.crewIds) {
            const entity = entityManager.getEntity(crewId);
            if (entity) {
                entity.isCrewMember = false;
                entity.assignedCannonId = null;
                console.log(`Entity ${entity.id} released from destroyed cannon ${this.id}`);
            }
        }
        this.crewIds = [];
    }

    // Check if a point is within the cannon (for selection)
    containsPoint(worldX, worldY) {
        const dx = worldX - this.x;
        const dy = worldY - this.y;
        return Math.sqrt(dx * dx + dy * dy) <= this.radius + 4;
    }
}

// Manager class for handling multiple cannons
class LightCannonManager {
    constructor() {
        this.cannons = [];
    }

    addCannon(x, y, faction = 'none') {
        const cannon = new LightCannon(x, y, faction);

        // Create linked capture objective (object type)
        const objective = captureObjectiveManager.addObjective(x, y, {
            objective_type: 'object',
            objective_name: `Light Cannon ${cannon.id}`,
            linkedObject: cannon
        });

        // Set initial faction on the objective to match cannon
        objective.faction = faction;
        if (faction === 'blue') {
            objective.captureProgress = 1.0;
        } else if (faction === 'red') {
            objective.captureProgress = -1.0;
        }

        // Link cannon back to objective
        cannon.captureObjective = objective;

        this.cannons.push(cannon);
        return cannon;
    }

    removeCannon(cannon) {
        const index = this.cannons.indexOf(cannon);
        if (index !== -1) {
            this.cannons.splice(index, 1);
        }
    }

    updateAll(deltaTime) {
        // Update all cannons and remove dead ones
        this.cannons = this.cannons.filter(cannon => {
            const keepCannon = cannon.update(deltaTime);

            // If cannon is being removed, clear its crew
            if (!keepCannon && cannon.crewIds.length > 0) {
                this.clearCrewOnCannonRemoval(cannon);
            }

            return keepCannon;
        });
    }

    clearCrewOnCannonRemoval(cannon) {
        for (const crewId of cannon.crewIds) {
            const entity = entityManager.getEntity(crewId);
            if (entity) {
                entity.isCrewMember = false;
                entity.assignedCannonId = null;
                console.log(`Entity ${entity.id} released from destroyed cannon ${cannon.id}`);
            }
        }
        cannon.crewIds = [];
    }

    drawAll(ctx, camera) {
        for (const cannon of this.cannons) {
            cannon.draw(ctx, camera);
        }
    }

    getCannonAt(worldX, worldY) {
        for (const cannon of this.cannons) {
            if (cannon.containsPoint(worldX, worldY)) {
                return cannon;
            }
        }
        return null;
    }

    getAllCannons() {
        return this.cannons;
    }
}

// Create global manager instance
const lightCannonManager = new LightCannonManager();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LightCannon, LightCannonManager, lightCannonManager };
}
