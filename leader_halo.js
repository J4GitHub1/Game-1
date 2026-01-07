// Leader Halo System

class LeaderHalo {
    static nextId = 0;

    constructor(leader) {
        this.id = LeaderHalo.nextId++;
        this.leader = leader; // Reference to the leader entity
        this.faction = leader.faction; // Store faction from leader
        this.radius = 50; // 50px radius
        
        // Mode system
        this.mode = 'idle'; // 'idle', 'hooray', 'engage'
        
        // Hooray mode
        this.hoorayCooldown = 0;
        this.hoorayCooldownDuration = 20; // 20 seconds
        this.hooraysCircleRadius = 0; // Expanding circle
        this.hooraysCircleSpeed = 100; // px/second expansion
        this.hooraysAffectedUnits = new Set(); // Track units already affected this activation
        
        // Engage mode
        this.engageCooldown = 0;
        this.engageCooldownDuration = 30; // 30 seconds
        this.engageCircleRadius = 0; // Expanding circle
        this.engageCircleSpeed = 100; // px/second expansion
        this.engageAffectedUnits = new Set(); // Track units already affected this activation
        
        console.log(`LeaderHalo ${this.id} created for leader ${leader.id} (${this.faction})`);
    }

    update(deltaTime, allEntities) {
        // Check if leader is dead - return false to signal removal
        if (this.leader.isDying || this.leader.health <= 0) {
            console.log(`LeaderHalo ${this.id} removed - leader ${this.leader.id} died`);
            return false;
        }
        
        // Update cooldowns
        if (this.hoorayCooldown > 0) {
            this.hoorayCooldown -= deltaTime;
        }
        if (this.engageCooldown > 0) {
            this.engageCooldown -= deltaTime;
        }
        
        // Get same-faction units in radius
        const unitsInRadius = this.getUnitsInRadius(allEntities);
        
        // Update mode based on conditions
        if (this.mode === 'hooray') {
            // Expand hooray circle
            this.hooraysCircleRadius += this.hooraysCircleSpeed * deltaTime;
            
            // Check units touched by expanding circle
            for (const unit of unitsInRadius) {
                if (this.hooraysAffectedUnits.has(unit.id)) continue; // Already affected
                
                const dx = unit.x - this.leader.x;
                const dy = unit.y - this.leader.y;
                const distToUnit = Math.sqrt(dx * dx + dy * dy);
                
                // Check if circle has reached this unit (within 5px tolerance)
                if (Math.abs(distToUnit - this.hooraysCircleRadius) <= 5) {
                    unit.distress = Math.max(0, unit.distress - 30);
                    this.hooraysAffectedUnits.add(unit.id);
                    console.log(`Hooray! Unit ${unit.id} distress reduced by 30 (now ${unit.distress.toFixed(1)})`);
                }
            }
            
            // End hooray mode when circle reaches full radius
            if (this.hooraysCircleRadius >= this.radius) {
                this.mode = 'idle';
                this.hooraysCircleRadius = 0;
                this.hooraysAffectedUnits.clear();
                this.hoorayCooldown = this.hoorayCooldownDuration;
                console.log(`LeaderHalo ${this.id} hooray complete - entering cooldown`);
            }
        } else if (this.mode === 'engage') {
            // Expand engage circle
            this.engageCircleRadius += this.engageCircleSpeed * deltaTime;
            
            // Check units touched by expanding circle
            for (const unit of unitsInRadius) {
                if (this.engageAffectedUnits.has(unit.id)) continue; // Already affected
                
                const dx = unit.x - this.leader.x;
                const dy = unit.y - this.leader.y;
                const distToUnit = Math.sqrt(dx * dx + dy * dy);
                
                // Check if circle has reached this unit (within 5px tolerance)
                if (Math.abs(distToUnit - this.engageCircleRadius) <= 5) {
                    unit.accuracyBuffTimer = 10; // 10 second buff
                    this.engageAffectedUnits.add(unit.id);
                    console.log(`Engage! Unit ${unit.id} received 10s accuracy buff`);
                }
            }
            
            // End engage mode when circle reaches full radius
            if (this.engageCircleRadius >= this.radius) {
                this.mode = 'idle';
                this.engageCircleRadius = 0;
                this.engageAffectedUnits.clear();
                this.engageCooldown = this.engageCooldownDuration;
                console.log(`LeaderHalo ${this.id} engage complete - entering cooldown`);
            }
        } else {
            // Idle mode - apply speed buff to units in radius
            for (const unit of unitsInRadius) {
                if (!unit.speedBuffActive) {
                    unit.speedBuffActive = true;
                    unit.updateVisualProperties(); // Recalculate speed with buff
                }
                unit.speedBuffGraceTimer = 3; // Reset grace timer (3 seconds)
            }
            
            // Check if should transition to hooray
            if (this.hoorayCooldown <= 0) {
                const avgDistress = this.calculateAverageDistress(unitsInRadius);
                if (avgDistress >= 30) {
                    this.mode = 'hooray';
                    this.hooraysCircleRadius = 0;
                    this.hooraysAffectedUnits.clear();
                    console.log(`LeaderHalo ${this.id} activated HOORAY mode (avg distress: ${avgDistress.toFixed(1)})`);
                    return true;
                }
            }
            
            // Check if should transition to engage
            if (this.engageCooldown <= 0) {
                const engagingCount = unitsInRadius.filter(u => this.isEngaging(u)).length;
                if (engagingCount > unitsInRadius.length * 0.3) {
                    this.mode = 'engage';
                    this.engageCircleRadius = 0;
                    this.engageAffectedUnits.clear();
                    console.log(`LeaderHalo ${this.id} activated ENGAGE mode (${engagingCount}/${unitsInRadius.length} engaging)`);
                    return true;
                }
            }
        }
        
        return true; // Still active
    }
    
    getUnitsInRadius(allEntities) {
        const unitsInRadius = [];
        
        for (const entity of allEntities) {
            // Same faction only
            if (entity.faction !== this.faction) continue;
            
            // Not dead
            if (entity.isDying || entity.health <= 0) continue;
            
            // Check distance
            const dx = entity.x - this.leader.x;
            const dy = entity.y - this.leader.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= this.radius) {
                unitsInRadius.push(entity);
            }
        }
        
        return unitsInRadius;
    }
    
    calculateAverageDistress(units) {
        if (units.length === 0) return 0;
        
        let totalDistress = 0;
        for (const unit of units) {
            totalDistress += unit.distress;
        }
        
        return totalDistress / units.length;
    }
    
    isEngaging(unit) {
        // Unit is engaging if:
        // 1. Has a locked target AND
        // 2. Is currently shooting or recently shot (within last 2 seconds)
        
        if (!unit.lockedTarget || unit.lockedTarget.isDying) return false;
        
        // Check if recently shot (shootCooldown > 0 means shot within last second)
        // or is currently shooting (isShooting flag)
        return unit.isShooting || unit.shootCooldown > 0;
    }

    draw(ctx, camera) {
        // Only draw if leader is selected
        if (!this.leader.isSelected) return;
        
        const screenX = this.leader.x - camera.x;
        const screenY = this.leader.y - camera.y;
        
        // White circle with 50% opacity (base halo)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.radius, 0, Math.PI * 2);
        ctx.stroke();
        
        // Optional: subtle fill for better visibility
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw expanding circles based on mode
        if (this.mode === 'hooray' && this.hooraysCircleRadius > 0) {
            // Light green expanding circle
            ctx.strokeStyle = 'rgba(144, 238, 144, 0.8)'; // Light green
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(screenX, screenY, this.hooraysCircleRadius, 0, Math.PI * 2);
            ctx.stroke();
        } else if (this.mode === 'engage' && this.engageCircleRadius > 0) {
            // Red expanding circle
            ctx.strokeStyle = 'rgba(255, 100, 100, 0.8)'; // Red
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(screenX, screenY, this.engageCircleRadius, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
}

class LeaderHaloManager {
    constructor() {
        this.halos = [];
    }

    addHalo(leader) {
        const halo = new LeaderHalo(leader);
        this.halos.push(halo);
        return halo;
    }

    updateAll(deltaTime, allEntities) {
        // Update all halos, remove ones whose leaders died
        for (let i = this.halos.length - 1; i >= 0; i--) {
            const stillActive = this.halos[i].update(deltaTime, allEntities);
            
            if (!stillActive) {
                this.halos.splice(i, 1);
            }
        }
    }

    drawAll(ctx, camera) {
        for (const halo of this.halos) {
            halo.draw(ctx, camera);
        }
    }

    clear() {
        this.halos = [];
        console.log('All leader halos cleared');
    }
}

// Global instance
const leaderHaloManager = new LeaderHaloManager();