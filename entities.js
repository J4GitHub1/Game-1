// Entity Management System

// Entity Management System

class Entity {
    static nextId = 0;

    constructor(x, y, equipment, faction = 'blue') {
        this.id = Entity.nextId++;
        this.x = x;
        this.y = y;
        
        // Line of Sight Optimization
        this.losCheckCounter = 0;
        this.cachedHasLOS = false;

        // Heading (angle in radians)
        this.heading = 0;
        this.targetHeading = 0;
        this.desiredHeading = null; // For formation facing
        this.isRotating = false;
        this.rotationSpeed = Math.PI * 1.5; // Rotation Speed
        
        // Movement and pathfinding
            this.targetX = null;
            this.targetY = null;
            this.finalTargetX = null;
            this.finalTargetY = null;
            this.isMoving = false;
            this.stuckCounter = 0;
            this.isStationary = true; // Track if unit is stationary
            this.formationPosition = null; // Assigned formation position
            this.flowField = null;

        // Advanced obstacle avoidance
            this.velocity = { x: 0, y: 0 };
            this.desiredVelocity = { x: 0, y: 0 };
            this.smoothedWallRepulsion = { x: 0, y: 0 }; //smooth Repulsion

        // Knockback system (from explosions)
            this.knockbackVelocity = { x: 0, y: 0 };
            this.isKnockedBack = false;
        
        // Selection
        this.isSelected = false;
        
        // Grouping
        this.groupId = null;

        // Crew assignment (for cannon crew system)
        this.isCrewMember = false;
        this.assignedCannonId = null;
        this.crewStopDelay = 0; // Timer for delayed stop when re-entering capture radius

        // Stance system
        this.stance = faction === 'red' ? 'offensive' : 'none'; // Enemies offensive by default, friendlies none
        this.lockedTarget = null; // Entity being tracked by FOV
        this.targetLockTimer = 0; // Timer for re-picking random targets in 'none' stance
        this.targetLockDuration = 3 + Math.random() * 2; // 3-5 seconds between re-picks
        this.hasManualTarget = false; // Flag for player-issued targeted fire command

        // AI Auto-engagement system (offensive stance)
        this.aiControlled = false;          // Whether AI is currently controlling this unit
        this.aiTargetX = null;              // AI-calculated movement target
        this.aiTargetY = null;              // AI-calculated movement target
        this.aiTargetEnemies = [];          // Enemies used to calculate AI target
        this.aiLastFOVCheck = 0;            // Time since last visibility check
        this.aiFOVCheckInterval = 0.5;      // Check every 0.5 seconds
        this.aiLastTargetUpdate = 0;        // Time since last target update
        this.aiTargetUpdateInterval = 0.5;  // Update every 0.5 seconds

        // AI Retreat system (activated when overwhelmed)
        this.isRetreating = false;           // Whether in retreat mode
        this.retreatTimer = 0;                // Time spent in current retreat interval
        this.retreatInterval = 0.5;           // Check every 0.5 seconds
        this.retreatStartX = null;            // Position when retreat started (for distance tracking)
        this.retreatStartY = null;

        // Combat state
        this.isShooting = false;
        this.isReloading = false;
        this.shootCooldown = 0; // Timer for 0.5s between shots
        this.reloadTimer = 0; // Tracks reload progress
        this.shotsInBurst = 0; // Tracks shots fired in current burst

        // Burst firing state
        this.isBurstFiring = false;        // Whether currently in a burst sequence
        this.burstShotsRemaining = 0;      // Shots left in current burst
        this.burstDelayTimer = 0;          // Time until next shot in burst
        this.burstDelay = 0.3;             // 0.3s between burst shots

        // Debug bullet rays
        this.bulletRays = [];              // Array of {startX, startY, endX, endY, timer, mode}
        this.bulletRayDuration = 0.3;      // Rays visible for 0.3 seconds

       // Visual effects
        this.muzzleFlashTimer = 0; // Brief flash when firing (~0.1s)
        this.smokePuffs = []; // Array of {x, y, timer, maxTimer, initialRadius}
        this.shotDelayTimer = 0; // Random delay before executing shot (0-0.5s)
        this.meleeHitFlashTimer = 0; // Brief flash when hit by melee
        this.chargeImpactTimer = 0; // Cavalry charge impact visual
        this.chargeImpactX = 0; // Impact location X
        this.chargeImpactY = 0; // Impact location Y
        
        // Mounted speed debuff system
        this.mountedHitDebuffStacks = 0; // Number of active "hit while mounted" debuffs
        this.mountedChargeDebuffStacks = 0; // Number of active "charge attack" debuffs
        this.mountedDebuffTimers = []; // Array of {type: 'hit'|'charge', timer: float}

        // Faction and status
        this.faction = faction; // 'blue' or 'red'
        this.elevation = 0; // Height in meters (0-25)
        this.previousElevation = 0; // Track elevation changes
        this.distress = 0; // Distress level (not yet used)
        this.accuracyDebuffTimer = 0; // Explosion shockwave accuracy debuff (stacking)
        this.accuracyBuffTimer = 0; // Halo "Engage" accuracy buff (from leader halo)
        this.speedBuffActive = false; // Halo "Idle" speed buff active
        this.speedBuffGraceTimer = 0; // Grace period after leaving halo radius (3 seconds)
        
        // NEW ATTRIBUTES
        this.mounted = false; // Whether unit is mounted (horse, etc.)
        this.leader = false; // Whether unit is a leader/officer
        this.item = null; // Inventory item (grenades, etc.) - default: none
        
        // Melee combat
        this.isInMelee = false; // Currently engaged in melee combat
        this.meleeTarget = null; // Current melee opponent
        this.meleeCooldownTimer = 0; // Time until next melee swing
        this.meleeHitChance = 0.6; // 60% base hit chance
        this.chargedTargets = new Set(); // Track enemies already charged (for cavalry)
        this.lastChargeTime = 0; // Timestamp of last charge attack
        this.chargeCooldown = 2.0; // 1 second cooldown between charges
        
        // Visual properties (affected by mounted/leader status)
        this.baseRadius = 3; // Base physical radius
        this.visualRadius = 3; // Display radius (changes with mounted/leader)
        this.updateVisualProperties(); // Set initial size based on attributes
        
        // Death animation
        this.isDying = false;
        this.deathTimer = 0;
        this.deathDuration = 1.0; // 1 second death animation

        // Panic state
        this.isPanicking = false;
        this.panicTargetX = null;
        this.panicTargetY = null;
        this.baseMovementSpeed = 0; // Store original speed for restoration
        this.panicFlashTimer = 0; // Smooth flash animation timer
        // Elevation check optimization
        this.elevationCheckCounter = 0;
        this.elevationCheckInterval = 25; // Check every 15 frames (~4 times per second at 60fps)

        // Field of view (dynamic based on stance - see getViewAngle())
        this.weaponRangeAngle = (120 * Math.PI) / 180; // Weapon cone stays 120°
        this.weaponRange = 20; // Will be updated in calculateAttributes based on weapon
        
        // Collision
        this.radius = this.baseRadius; // Physical radius - units cannot overlap this
        this.personalSpaceRadius = this.baseRadius * 2; // Preferred spacing scales with unit size
        
        // Calculate attributes based on equipment
        this.calculateAttributes(equipment);
        
        // Apply random speed variation (-5% to +5%)
        const speedVariation = 0.95 + Math.random() * 0.05; // 0.95 to 1.05
        this.movement_speed *= speedVariation;

        console.log(`Entity ${this.id} spawned at (${x}, ${y}) with attributes:`, this);
    }

    updateVisualProperties() {
        // Update physical radius based on mounted/leader status
        if (this.leader) {
            this.radius = this.baseRadius * 1.5; // 150% size for leaders
            this.visualRadius = this.baseRadius * 1.5;
        } else if (this.mounted) {
            this.radius = this.baseRadius * 1.2; // 120% size for mounted
            this.visualRadius = this.baseRadius * 1.2;
        } else {
            this.radius = this.baseRadius; // Normal size
            this.visualRadius = this.baseRadius;
        }
        
        // Update personal space radius to scale with unit size
        this.personalSpaceRadius = this.radius * 2;
        
        // Update movement speed based on mounted status and halo buff
        if (this.baseMovementSpeed > 0) {
            let speed = this.baseMovementSpeed;
            
            // Add mounted bonus
            if (this.mounted) {
                speed += 20; // +20 px/s for mounted
            }
            
            // Apply halo idle buff (10% boost)
            if (this.speedBuffActive) {
                speed *= 1.1; // +10% from halo
            }
            
            // Apply mounted speed debuffs (stacking)
            if (this.mounted) {
                const hitDebuffPercent = this.mountedHitDebuffStacks * 0.10; // 10% per stack
                const chargeDebuffPercent = this.mountedChargeDebuffStacks * 0.15; // 15% per stack
                const totalDebuffPercent = hitDebuffPercent + chargeDebuffPercent;
                
                // Apply debuff, but enforce minimum 30% speed
                const debuffMultiplier = Math.max(0.3, 1.0 - totalDebuffPercent);
                speed *= debuffMultiplier;
                
                if (totalDebuffPercent > 0) {
                    console.log(`Entity ${this.id} mounted speed debuff: ${(totalDebuffPercent * 100).toFixed(0)}% (hit stacks: ${this.mountedHitDebuffStacks}, charge stacks: ${this.mountedChargeDebuffStacks}), speed: ${speed.toFixed(1)}`);
                }
            }
            
            this.movement_speed = speed;
        }
    }

    calculateAttributes(equipment) {
        const armor = equipment.armor || { weight: 0, protection: 0 };
        const melee = equipment.melee || { weight: 0, length: 0 };
        const ranged = equipment.ranged || { weight: 0, calibre: 0, magazine: 0, length: 0};

        this.armor_protection = armor.protection;
        this.melee_range = melee.length * 10; // Convert length to pixel range
        this.melee_base_damage = 20 + (melee.length * 15); // Base melee damage
        this.melee_cooldown_duration = 1.5 * melee.weight; // Attack speed
        this.ranged_magazine_max = ranged.magazine;

        const totalWeight = armor.weight + melee.weight + ranged.weight;
        this.entity_weight = (totalWeight / 3) + 0.5;

        this.ranged_range = ((1 * ranged.length * ranged.calibre) / 2) * 400; // Multiply by 100 for proper range
        this.weaponRange = this.ranged_range > 0 ? this.ranged_range : 20; // Set weapon range, default 20px if no ranged weapon
        this.ranged_base_damage = (5 * ranged.calibre) + 10;
        this.ranged_magazine_current = this.ranged_magazine_max;
        this.ranged_reloading_time = ((ranged.weight) * ( 0.5 * this.ranged_magazine_max)) + 3;
        this.ranged_incendiary = ranged.incendiary || false;
        this.ranged_fire_mode = ranged.fire_mode || "normal";

        // Add 3s penalty for burst/scatter modes
        if (this.ranged_fire_mode === 'burst' || this.ranged_fire_mode === 'scatter') {
            this.ranged_reloading_time += 2;
        }
        this.ranged_cooldown = 1;
        this.melee_cooldown = 1 * melee.weight;

        // Health calculation with armor protection
        this.health = (armor.protection / 2 + 1) * 100;
        this.movement_speed = 8 / (0.5*this.entity_weight);
        
        // Apply random speed variation (-5% to +5%)
        const speedVariation = 0.95 + Math.random() * 0.1; // 0.95 to 1.05
        this.movement_speed *= speedVariation;
        
        this.baseMovementSpeed = this.movement_speed;

        this.equipment = equipment;
        
        // Apply mounted/leader bonuses after base stats calculated
        this.updateVisualProperties();
    }

    update(deltaTime, allEntities) {
    // Handle knockback (takes priority over all other movement)
    if (this.isKnockedBack) {
        // Apply knockback velocity with friction
        const friction = 0.92; // Slow down over time
        this.knockbackVelocity.x *= friction;
        this.knockbackVelocity.y *= friction;
        
        // Apply knockback movement
        let newX = this.x + this.knockbackVelocity.x * deltaTime;
        let newY = this.y + this.knockbackVelocity.y * deltaTime;
        
        // Terrain collision
        const terrainType = TerrainManager.getTerrainType(newX, newY);
        if (terrainType === 'wall' || terrainType === 'water') {
            // Bounce off walls
            this.knockbackVelocity.x *= -0.5;
            this.knockbackVelocity.y *= -0.5;
        } else {
            this.x = newX;
            this.y = newY;
        }
        
        // Stop knockback when velocity is very low
        const speed = Math.sqrt(this.knockbackVelocity.x ** 2 + this.knockbackVelocity.y ** 2);
        if (speed < 5) {
            this.isKnockedBack = false;
            this.knockbackVelocity = { x: 0, y: 0 };
        }
        
        // Skip normal movement while knocked back
        if (this.isKnockedBack) {
            this.updateElevation();
            return;
        }
    }
    
    // Handle rotation
    if (this.isRotating) {
        const angleDiff = this.targetHeading - this.heading;
        
        let normalizedDiff = angleDiff;
        while (normalizedDiff > Math.PI) normalizedDiff -= 2 * Math.PI;
        while (normalizedDiff < -Math.PI) normalizedDiff += 2 * Math.PI;
        
        const rotationAmount = this.rotationSpeed * deltaTime;
        
        if (Math.abs(normalizedDiff) < rotationAmount) {
            this.heading = this.targetHeading;
            this.isRotating = false;
        } else {
            this.heading += Math.sign(normalizedDiff) * rotationAmount;
            
            while (this.heading < 0) this.heading += 2 * Math.PI;
            while (this.heading >= 2 * Math.PI) this.heading -= 2 * Math.PI;
        }
    }
    // PANIC BEHAVIOR - Check distress level
    if (this.distress >= 100 && !this.isPanicking && !this.isDying) {
        // Enter panic state
        this.isPanicking = true;
        console.log(`Entity ${this.id} is panicking!`);

        // Clear AI state when entering panic
        this.aiControlled = false;
        this.aiTargetX = null;
        this.aiTargetY = null;
        this.aiTargetEnemies = [];

        // Clear retreat state when entering panic
        if (this.isRetreating) {
            this.isRetreating = false;
            this.retreatTimer = 0;
            this.retreatStartX = null;
            this.retreatStartY = null;
        }

        // Clear burst state when entering panic
        if (this.isBurstFiring) {
            this.isBurstFiring = false;
            this.burstShotsRemaining = 0;
            this.burstDelayTimer = 0;
        }

        // Pick random point within 50px radius (minimum 15px to ensure movement)
        const angle = Math.random() * Math.PI * 2;
        const distance = 15 + Math.random() * 85; // 15-100px range
        this.panicTargetX = this.x + Math.cos(angle) * distance;
        this.panicTargetY = this.y + Math.sin(angle) * distance;
        
        // Move to panic target
        this.moveTo(this.panicTargetX, this.panicTargetY);
    }
    
    // Check if panic should end (distress below 75)
    if (this.isPanicking && this.distress < 75) {
        this.isPanicking = false;
        this.panicTargetX = null;
        this.panicTargetY = null;
        this.updateVisualProperties(); // Restore speed properly (accounts for mounted/leader)
        console.log(`Entity ${this.id} recovered from panic (distress: ${this.distress.toFixed(1)})`);
    }
    
    // Check if reached panic target
    if (this.isPanicking && this.panicTargetX !== null) {
        const dx = this.panicTargetX - this.x;
        const dy = this.panicTargetY - this.y;
        const distToTarget = Math.sqrt(dx * dx + dy * dy);
        
        if (distToTarget < 5) {
            // Reached panic spot - freeze
            this.movement_speed = 0;
            this.isMoving = false;
            this.isStationary = true;
            this.velocity = { x: 0, y: 0 };
            console.log(`Entity ${this.id} frozen in panic at (${Math.floor(this.x)}, ${Math.floor(this.y)})`);
        }
    }

// FIRE REPULSION - Always apply, even when stationary
    if (!this.isDying && !this.isPanicking && typeof fireManager !== 'undefined') {
        const fireRepulsion = this.calculateFireRepulsion();
        const fireRepulsionMagnitude = Math.sqrt(fireRepulsion.x ** 2 + fireRepulsion.y ** 2);
        
        // If there's significant fire repulsion force, move away even if stationary
        if (fireRepulsionMagnitude > 0.1) {
            const newX = this.x + fireRepulsion.x * deltaTime;
            const newY = this.y + fireRepulsion.y * deltaTime;
            
            // Check if new position is valid terrain
            const terrainAtNewPos = TerrainManager.getTerrainType(newX, newY);
            
            if (terrainAtNewPos !== 'wall' && terrainAtNewPos !== 'water') {
                // Check for collisions with other units
                let collision = false;
                for (const other of allEntities) {
                    if (other.id === this.id) continue;
                    const dist = Math.sqrt((newX - other.x) ** 2 + (newY - other.y) ** 2);
                    if (dist < this.radius + other.radius) {
                        collision = true;
                        break;
                    }
                }
                
                if (!collision) {
                    this.x = newX;
                    this.y = newY;
                    
                    // Update heading to face away from fire
                    if (Math.abs(fireRepulsion.x) > 0.1 || Math.abs(fireRepulsion.y) > 0.1) {
                        const repelHeading = Math.atan2(fireRepulsion.y, fireRepulsion.x);
                        this.heading = repelHeading;
                    }
                }
            }
        }
    }

    // === RETREAT MOVEMENT ===
    if (this.isRetreating && !this.isDying && !this.isPanicking) {
        this.retreatTimer += deltaTime;

        // Calculate retreat direction
        // Mounted units: move forward (already turned around)
        // Foot units: move backward (facing forward)
        const retreatDirection = this.mounted ? this.heading : this.heading + Math.PI;
        const retreatSpeed = this.movement_speed * 0.5; // Half speed

        // Calculate retreat velocity
        const retreatVelocityX = Math.cos(retreatDirection) * retreatSpeed;
        const retreatVelocityY = Math.sin(retreatDirection) * retreatSpeed;

        // Proposed new position
        const proposedX = this.x + retreatVelocityX * deltaTime;
        const proposedY = this.y + retreatVelocityY * deltaTime;

        // Check terrain at proposed position
        const terrainAtProposed = TerrainManager.getTerrainType(proposedX, proposedY);

        // WALL STOPS RETREAT (but not water!)
        if (terrainAtProposed === 'wall') {
            console.log(`Unit ${this.id}: Retreat stopped - wall hit`);
            this.stopRetreat(allEntities);
        } else {
            // Apply backwards movement (no heading change!)
            this.x = proposedX;
            this.y = proposedY;

            // Update velocity for rendering/collision purposes
            this.velocity.x = retreatVelocityX;
            this.velocity.y = retreatVelocityY;

            // Check if interval elapsed
            if (this.retreatTimer >= this.retreatInterval) {
                this.retreatTimer = 0;

                // Recheck enemy count in retreat cone
                const enemiesInFOV = this.scanForEnemies(allEntities);
                let enemiesInRetreatCone = 0;

                if (enemiesInFOV && enemiesInFOV.length > 0) {
                    for (const enemyData of enemiesInFOV) {
                        if (this.isInRetreatCone(enemyData.entity.x, enemyData.entity.y)) {
                            enemiesInRetreatCone++;
                        }
                    }
                }

                // Stop if fewer than 3 enemies
                if (enemiesInRetreatCone < 3) {
                    console.log(`Unit ${this.id}: Retreat stopped - only ${enemiesInRetreatCone} enemies in cone`);
                    this.stopRetreat(allEntities);
                } else {
                    console.log(`Unit ${this.id}: Retreat continuing - ${enemiesInRetreatCone} enemies in cone`);
                }
            }
        }
    }

    // Handle movement with push mechanics
    if (this.isMoving && this.targetX !== null && this.targetY !== null) {
        this.isStationary = false;
        
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const distanceToTarget = Math.sqrt(dx * dx + dy * dy);

        // Check if we reached the target
        if (distanceToTarget < 2) {
            this.x = this.targetX;
            this.y = this.targetY;
            this.isMoving = false;
            this.isStationary = true;
            this.targetX = null;
            this.targetY = null;
            this.finalTargetX = null;
            this.finalTargetY = null;
            this.velocity = { x: 0, y: 0 };
            this.stuckCounter = 0;
            this.flowField = null;

            // Apply desired heading if set (for formations)
            if (this.desiredHeading !== null) {
                this.targetHeading = this.desiredHeading;
                this.isRotating = true;
                this.desiredHeading = null;
            }

            return;
        }

        
// Calculate desired velocity (towards target)
// Use flow field if available, otherwise direct movement
const hasLineOfSight = this.hasLineOfSightToPosition(this.targetX, this.targetY);

if (hasLineOfSight) {
    // Clear path - use direct movement (most efficient)
    //console.log(`Unit ${this.id}: Line of sight - direct movement`);
    this.desiredVelocity = {
        x: (dx / distanceToTarget) * this.movement_speed,
        y: (dy / distanceToTarget) * this.movement_speed
    };
} else if (this.flowField) {
    //console.log(`Unit ${this.id}: Using flow field`);
    const flowDir = this.flowField.getDirection(this.x, this.y);
    
    if (flowDir) {
        // Use flow field direction
        this.desiredVelocity = {
            x: flowDir.dx * this.movement_speed,
            y: flowDir.dy * this.movement_speed
        };
    } else {
        // Fallback to direct movement if outside flow field
        this.desiredVelocity = {
            x: (dx / distanceToTarget) * this.movement_speed,
            y: (dy / distanceToTarget) * this.movement_speed
        };
    }
} else {
    // No flow field - use direct movement (old behavior)
    this.desiredVelocity = {
        x: (dx / distanceToTarget) * this.movement_speed,
        y: (dy / distanceToTarget) * this.movement_speed
    };
}

        // Apply separation force (avoid other entities)
        const separationForce = this.calculateSeparation(allEntities);
        
// Apply collision avoidance (look ahead and avoid)
const avoidanceForce = this.calculateCollisionAvoidance(allEntities);

// Apply wall repulsion (avoid obstacles)
const wallRepulsion = this.calculateWallRepulsion();

// Apply fire repulsion (avoid fires)
const fireRepulsion = this.calculateFireRepulsion();

// Combine forces - potential field navigation!
const targetWeight = 1.5; // Pull toward goal (reduced so walls can push back)
const separationWeight = 1.2; // Avoid other units (increased from 0.8 for more natural spacing)
const avoidanceWeight = 0.6; // Predict collisions
const wallRepulsionWeight = 1.1; // Push away from walls (VERY strong - stronger than target!)
const fireRepulsionWeight = 1.0; // Push away from fires (moderate - less than target attraction)

const combinedForce = {
    x: this.desiredVelocity.x * targetWeight + 
        separationForce.x * separationWeight + 
        avoidanceForce.x * avoidanceWeight +
        wallRepulsion.x * wallRepulsionWeight +
        fireRepulsion.x * fireRepulsionWeight,
    y: this.desiredVelocity.y * targetWeight + 
        separationForce.y * separationWeight + 
        avoidanceForce.y * avoidanceWeight +
        wallRepulsion.y * wallRepulsionWeight +
        fireRepulsion.y * fireRepulsionWeight
};

        // Normalize and apply speed limit
        const forceMag = Math.sqrt(combinedForce.x ** 2 + combinedForce.y ** 2);
        if (forceMag > this.movement_speed) {
            combinedForce.x = (combinedForce.x / forceMag) * this.movement_speed;
            combinedForce.y = (combinedForce.y / forceMag) * this.movement_speed;
        }

        // Smooth velocity transition
        const smoothing = 0.5;
        this.velocity.x = this.velocity.x * (1 - smoothing) + combinedForce.x * smoothing;
        this.velocity.y = this.velocity.y * (1 - smoothing) + combinedForce.y * smoothing;

        // Apply velocity
        let newX = this.x + this.velocity.x * deltaTime;
        let newY = this.y + this.velocity.y * deltaTime;

        const checkRadius = this.radius + 2; // Check slightly beyond unit radius
        const terrainAtNewPos = TerrainManager.getTerrainType(newX, newY);

        if (terrainAtNewPos === 'wall' || terrainAtNewPos === 'water') {
            // About to hit wall - don't move
            console.log(`Unit ${this.id} blocked by terrain at (${Math.floor(newX)}, ${Math.floor(newY)})`);
            newX = this.x;
            newY = this.y;
            this.velocity.x *= 0.5; // Reduce velocity
            this.velocity.y *= 0.5;
            this.stuckCounter++;
        }

        // Check for collisions and apply push mechanics
        let totalPushX = 0;
        let totalPushY = 0;
        
        for (const other of allEntities) {
            if (other.id === this.id) continue;
            
            const dist = Math.sqrt((newX - other.x) ** 2 + (newY - other.y) ** 2);
            const minDist = this.radius + other.radius;
            
            if (dist < minDist) {
                // Collision detected
                const overlap = minDist - dist;
                const pushX = (newX - other.x) / dist;
                const pushY = (newY - other.y) / dist;
                
                if (other.isStationary && !this.isStationary) {
                    // We're moving, they're stationary - push them gently
                    const pushStrength = overlap * 0.5; // Split the push
                    other.x -= pushX * pushStrength * 0.3; // They move a bit
                    totalPushX += pushX * pushStrength * 0.7; // We move more
                    totalPushY += pushY * pushStrength * 0.7;
                } else if (!other.isStationary && this.isStationary) {
                    // They're moving, we're stationary - we get pushed
                    totalPushX += pushX * overlap * 0.3;
                    totalPushY += pushY * overlap * 0.3;
                } else {
                    // Both moving or both stationary - split equally
                    totalPushX += pushX * overlap * 0.5;
                    totalPushY += pushY * overlap * 0.5;
                }
            }
        }
        
        // Apply pushes
        newX += totalPushX;
        newY += totalPushY;
        
        // Wall repulsion handles obstacle avoidance - no hard barrier needed!
        
        // Final collision check - if still overlapping, don't move
        let finalCollision = false;
        for (const other of allEntities) {
            if (other.id === this.id) continue;
            const dist = Math.sqrt((newX - other.x) ** 2 + (newY - other.y) ** 2);
            if (dist < this.radius + other.radius - 0.5) { // Small tolerance
                finalCollision = true;
                break;
            }
        }
        
        if (!finalCollision) {
            // Can move - update position
            this.x = newX;
            this.y = newY;
            this.stuckCounter = 0;
            
            // Update heading to match movement direction
            // Skip if offensive stance with locked target (they aim at enemies while moving)
            const isAimingAtEnemy = this.stance === 'offensive' && this.lockedTarget && !this.lockedTarget.isDying;

            if (!isAimingAtEnemy && (Math.abs(this.velocity.x) > 0.1 || Math.abs(this.velocity.y) > 0.1)) {
                const moveHeading = Math.atan2(this.velocity.y, this.velocity.x);

                let headingDiff = moveHeading - this.heading;
                while (headingDiff > Math.PI) headingDiff -= 2 * Math.PI;
                while (headingDiff < -Math.PI) headingDiff += 2 * Math.PI;

                this.heading += headingDiff * 0.15;

                while (this.heading < 0) this.heading += 2 * Math.PI;
                while (this.heading >= 2 * Math.PI) this.heading -= 2 * Math.PI;
            }
        } else {
            // Still stuck after push - try micro-adjustment
            this.stuckCounter++;
            
            if (this.stuckCounter > 30) { // Reduced from 60 - give up sooner
                // Try a small sidestep
                const sideStepAngle = Math.atan2(dy, dx) + (Math.random() > 0.5 ? Math.PI / 2 : -Math.PI / 2);
                const sideStepDist = 5;
                const sideX = this.x + Math.cos(sideStepAngle) * sideStepDist;
                const sideY = this.y + Math.sin(sideStepAngle) * sideStepDist;
                
                // Check if sidestep is clear
                let sideStepClear = true;
                for (const other of allEntities) {
                    if (other.id === this.id) continue;
                    const dist = Math.sqrt((sideX - other.x) ** 2 + (sideY - other.y) ** 2);
                    if (dist < this.radius + other.radius) {
                        sideStepClear = false;
                        break;
                    }
                }
                
                if (sideStepClear) {
                    this.x = sideX;
                    this.y = sideY;
                    this.stuckCounter = 0;
                } else if (this.stuckCounter > 90) {
                    // Really stuck - stop
                    console.log(`Entity ${this.id} stopped - cannot reach target`);
                    this.isMoving = false;
                    this.isStationary = true;
                    this.targetX = null;
                    this.targetY = null;
                    this.finalTargetX = null;
                    this.finalTargetY = null;
                    this.velocity = { x: 0, y: 0 };
                    this.stuckCounter = 0;
                    this.flowField = null;
                    
                    if (this.desiredHeading !== null) {
                        this.targetHeading = this.desiredHeading;
                        this.isRotating = true;
                        this.desiredHeading = null;
                    }
                }
            }
        }
    } else {
        // Not moving
        this.isStationary = true;
    }

    this.updateElevation(); // Update Elevation

    // Distress decay (1 per second normally, 3 per second in defensive stance, 10 per second for leaders, 0 in melee)
    if (this.distress > 0 && !this.isInMelee) {
        let decayRate = 1; // Base decay
        if (this.stance === 'defensive') {
            decayRate = 3;
        }
        if (this.leader) {
            decayRate = 10; // Leaders have -10/sec decay (overrides stance)
        }
        this.distress = Math.max(0, this.distress - (decayRate * deltaTime));
    }
    
    // Accuracy debuff decay (from explosion shockwaves)
    if (this.accuracyDebuffTimer > 0) {
        this.accuracyDebuffTimer -= deltaTime;
        this.accuracyDebuffTimer = Math.max(0, this.accuracyDebuffTimer);
    }
    
    // Accuracy buff decay (from leader halo "Engage")
    if (this.accuracyBuffTimer > 0) {
        this.accuracyBuffTimer -= deltaTime;
        this.accuracyBuffTimer = Math.max(0, this.accuracyBuffTimer);
    }
    
    // Speed buff grace timer (keeps buff for 3s after leaving halo)
    if (this.speedBuffGraceTimer > 0) {
        this.speedBuffGraceTimer -= deltaTime;
        if (this.speedBuffGraceTimer <= 0) {
            this.speedBuffActive = false;
            this.updateVisualProperties(); // Recalculate speed without buff
        }
    }
    
    // FIRE DAMAGE & DISTRESS - Check if unit is touching or near any fire
    if (!this.isDying && typeof fireManager !== 'undefined') {
        const fires = fireManager.getAllFires();
        let nearFire = false; // Track if ANY fire is nearby (for distress)
        
        for (const fire of fires) {
            const dx = this.x - fire.x;
            const dy = this.y - fire.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Check if unit is within fire radius (touching)
            if (distance <= fire.radius + this.radius) {
                // Apply damage: 10 HP/second
                const damage = 10 * deltaTime;
                this.health -= damage;
                
                // Log first damage instance per fire (don't spam console)
                if (!fire.damagedUnits) fire.damagedUnits = new Set();
                if (!fire.damagedUnits.has(this.id)) {
                    fire.damagedUnits.add(this.id);
                    console.log(`Entity ${this.id} entered fire ${fire.id} - taking ${damage.toFixed(1)} damage/frame`);
                }
            }
            
            // Check if unit is near fire (30px radius for distress)
            if (distance <= 30) {
                nearFire = true;
            }
        }
        
        // Apply distress if near ANY fire (only once, regardless of fire count)
        if (nearFire) {
            const distressIncrease = 5 * deltaTime;
            this.distress = Math.min(100, this.distress + distressIncrease);
        }
    }

    // SMOKE ACCURACY PENALTY - Count smoke clouds touching unit
    this.smokeCloudCount = 0; // Reset each frame
    if (!this.isDying && typeof smokeManager !== 'undefined') {
        const smokeClouds = smokeManager.getAllSmoke();

        for (const smoke of smokeClouds) {
            const dx = this.x - smoke.x;
            const dy = this.y - smoke.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Check if unit is within smoke radius
            if (distance <= smoke.currentRadius + this.radius) {
                this.smokeCloudCount++;
            }
        }
    }

    // CAPTURE OBJECTIVE REPULSION
    if (typeof captureObjectiveManager !== 'undefined') {
        const objectives = captureObjectiveManager.getAllObjectives();

        for (const objective of objectives) {
            if (objective.is_moveable) continue;  // Skip moveable objectives

            if (objective.shouldRepelUnit(this.x, this.y, this.radius)) {
                const force = objective.getRepulsionForce(this.x, this.y);

                // Apply repulsion (similar to fire avoidance)
                this.x += force.x * deltaTime * 20;  // Moderate repulsion strength
                this.y += force.y * deltaTime * 20;
            }
        }
    }

    // CANNON CREW BEHAVIOR - crew follows cannon when outside capture radius
    // Skip all crew behavior when panicking - let them run free
    if (this.isCrewMember && this.assignedCannonId !== null && !this.isPanicking && typeof cannonManager !== 'undefined') { //ASK CLAUDE
        const cannon = cannonManager.cannons.find(c => c.id === this.assignedCannonId);
        if (cannon && cannon.captureObjective) {
            const captureRadius = cannon.captureObjective.capture_radius;
            const dx = this.x - cannon.x;
            const dy = this.y - cannon.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // OUTSIDE CAPTURE RADIUS - use full movement system to return to cannon
            if (distance > captureRadius) {
                // Reset stop delay when outside
                this.crewStopDelay = 0;

                // Check if we need to start moving toward cannon (or update target if cannon moved)
                const needsNewTarget = !this.isMoving ||
                    this.targetX === null ||
                    (Math.abs(this.targetX - cannon.x) > 5 || Math.abs(this.targetY - cannon.y) > 5);

                if (needsNewTarget) {
                    // Set movement target to cannon position
                    this.targetX = cannon.x;
                    this.targetY = cannon.y;
                    this.finalTargetX = cannon.x;
                    this.finalTargetY = cannon.y;
                    this.isMoving = true;

                    // Calculate target heading toward cannon
                    this.targetHeading = Math.atan2(-dy, -dx);
                    while (this.targetHeading < 0) this.targetHeading += 2 * Math.PI;
                    while (this.targetHeading >= 2 * Math.PI) this.targetHeading -= 2 * Math.PI;
                    this.isRotating = true;

                    // Use cannon's flow field if available for pathfinding
                    if (cannon.flowField) {
                        this.flowField = cannon.flowField;
                    }
                }
                // Movement will be handled by the normal movement update logic above
            } else {
                // INSIDE CAPTURE RADIUS - use attraction/separation behavior
                // Stop movement with 0.5s delay after re-entering capture radius
                if (this.isMoving && this.targetX === cannon.x && this.targetY === cannon.y) {
                    this.crewStopDelay += deltaTime;
                    if (this.crewStopDelay >= 0.5) {
                        this.isMoving = false;
                        this.targetX = null;
                        this.targetY = null;
                        this.finalTargetX = null;
                        this.finalTargetY = null;
                        this.velocity = { x: 0, y: 0 };
                        this.flowField = null;
                        this.crewStopDelay = 0;
                    }
                }

                // Calculate separation from other crew members (dispersion)
                let separationX = 0;
                let separationY = 0;
                let crewCount = 0;
                const crewSpacingRadius = this.personalSpaceRadius * 1.2;

                for (const crewId of cannon.crewIds) {
                    if (crewId === this.id) continue;
                    const otherCrew = entityManager.getEntity(crewId);
                    if (!otherCrew || otherCrew.isDying) continue;

                    const cdx = this.x - otherCrew.x;
                    const cdy = this.y - otherCrew.y;
                    const crewDist = Math.sqrt(cdx * cdx + cdy * cdy);

                    if (crewDist > 0 && crewDist < crewSpacingRadius) {
                        const distWeight = 1 - (crewDist / crewSpacingRadius);
                        separationX += (cdx / crewDist) * distWeight;
                        separationY += (cdy / crewDist) * distWeight;
                        crewCount++;
                    }
                }

                // Normalize and apply separation
                if (crewCount > 0) {
                    separationX /= crewCount;
                    separationY /= crewCount;
                    const sepMag = Math.sqrt(separationX * separationX + separationY * separationY);
                    if (sepMag > 0) {
                        separationX /= sepMag;
                        separationY /= sepMag;
                    }
                    this.x += separationX * deltaTime * 15;
                    this.y += separationY * deltaTime * 15;
                }

                // Apply attraction if near the capture radius edge (60%+)
                if (distance > captureRadius * 0.6 && distance > 0.1) {
                    const pullStrength = (distance - captureRadius * 0.6) / (captureRadius * 0.4);
                    const clampedStrength = Math.min(pullStrength, 1.0);
                    const attractX = -(dx / distance) * clampedStrength;
                    const attractY = -(dy / distance) * clampedStrength;
                    this.x += attractX * deltaTime * 10;
                    this.y += attractY * deltaTime * 10;
                }

                // Orient outward when inside capture radius (face away from cannon)
                if (distance > 0.1) {
                    const outwardAngle = Math.atan2(dy, dx);
                    this.targetHeading = outwardAngle;
                }
            }
        }
    }

    // Update panic flash timer
    if (this.isPanicking) {
        // Flash speed scales with distress (50-100 range)
        const distressNormalized = (this.distress - 50) / 50; // 0 to 1
        const minFlashSpeed = 0.5;
        const maxFlashSpeed = 3;
        const flashSpeed = minFlashSpeed + (distressNormalized * (maxFlashSpeed - minFlashSpeed));
        
        this.panicFlashTimer += deltaTime * flashSpeed;
    } else {
        this.panicFlashTimer = 0;
    }

    // UPDATE VISUAL EFFECT TIMERS
    if (this.muzzleFlashTimer > 0) {
        this.muzzleFlashTimer -= deltaTime;
    }
    
    if (this.meleeHitFlashTimer > 0) {
        this.meleeHitFlashTimer -= deltaTime;
    }
    
    if (this.chargeImpactTimer > 0) {
        this.chargeImpactTimer -= deltaTime;
    }
    
    // Update mounted speed debuff timers
    if (this.mounted && this.mountedDebuffTimers.length > 0) {
        for (let i = this.mountedDebuffTimers.length - 1; i >= 0; i--) {
            this.mountedDebuffTimers[i].timer -= deltaTime;
            
            // Remove expired debuffs
            if (this.mountedDebuffTimers[i].timer <= 0) {
                const expiredType = this.mountedDebuffTimers[i].type;
                this.mountedDebuffTimers.splice(i, 1);
                
                // Update stack counts
                if (expiredType === 'hit') {
                    this.mountedHitDebuffStacks = Math.max(0, this.mountedHitDebuffStacks - 1);
                } else if (expiredType === 'charge') {
                    this.mountedChargeDebuffStacks = Math.max(0, this.mountedChargeDebuffStacks - 1);
                }
                
                // Recalculate speed when debuffs change
                this.updateVisualProperties();
            }
        }
    }

    // Update smoke puffs
    for (let i = this.smokePuffs.length - 1; i >= 0; i--) {
        this.smokePuffs[i].timer += deltaTime;
        
        // Remove expired puffs
        if (this.smokePuffs[i].timer >= this.smokePuffs[i].maxTimer) {
            this.smokePuffs.splice(i, 1);
        }
    }

// RELOAD LOGIC
if (this.isReloading && !this.isDying && !this.isPanicking) {
    this.reloadTimer += deltaTime;
    
    // Calculate reload time based on weapon weight and magazine size
    const reloadTime = this.ranged_reloading_time * (1 + (this.distress / 100)); // CHECK IF WORKED 
    
    if (this.reloadTimer >= reloadTime) {
        // Reload complete
        this.ranged_magazine_current = this.ranged_magazine_max;
        this.isReloading = false;
        this.reloadTimer = 0;
        this.shootCooldown = 1; // 1s cooldown after reload before can shoot again
        console.log(`Entity ${this.id} finished reloading - magazine refilled to ${this.ranged_magazine_max}`);
    }
}

// Decrement shoot cooldown
    if (this.shootCooldown > 0) {
        this.shootCooldown -= deltaTime;
    }

    // Update bullet ray timers
    for (let i = this.bulletRays.length - 1; i >= 0; i--) {
        this.bulletRays[i].timer += deltaTime;
        if (this.bulletRays[i].timer >= this.bulletRayDuration) {
            this.bulletRays.splice(i, 1);
        }
    }

    // Decrement melee cooldown
    if (this.meleeCooldownTimer > 0) {
        this.meleeCooldownTimer -= deltaTime;
    }

// MANUAL TARGET VALIDATION - Check if manual target should be cleared
if (this.hasManualTarget && this.lockedTarget) {
    // Clear manual target if target is dead
    if (this.lockedTarget.isDying || this.lockedTarget.health <= 0) {
        console.log(`Entity ${this.id} manual target died - reverting to stance behavior`);
        this.hasManualTarget = false;
        this.lockedTarget = null;
    } 
    // Clear manual target if target is no longer in FOV (lost sight)
    else {
        const enemiesInFOV = this.scanForEnemies(allEntities);
        const targetInFOV = enemiesInFOV && enemiesInFOV.find(e => e.entity.id === this.lockedTarget.id);
        
        if (!targetInFOV) {
            console.log(`Entity ${this.id} lost sight of manual target - reverting to stance behavior`);
            this.hasManualTarget = false;
            this.lockedTarget = null;
        }
    }
}

// FOV TARGET LOCKING BASED ON STANCE
if (!this.isDying && !this.isPanicking && !this.hasManualTarget) {
    const enemiesInFOV = this.scanForEnemies(allEntities);
    
    if (this.stance === 'none') {
        // NONE: Lock onto random enemy, re-pick every 3-5 seconds
        if (enemiesInFOV && enemiesInFOV.length > 0) {
            // Update timer
            this.targetLockTimer += deltaTime;
            
            // Check if we need to pick a new target
            const needsNewTarget = !this.lockedTarget || 
                                   !enemiesInFOV.find(e => e.entity.id === this.lockedTarget.id) ||
                                   this.targetLockTimer >= this.targetLockDuration;
            
            if (needsNewTarget) {
                // Pick random enemy from FOV
                const randomIndex = Math.floor(Math.random() * enemiesInFOV.length);
                this.lockedTarget = enemiesInFOV[randomIndex].entity;
                
                // Reset timer with new random duration
                this.targetLockTimer = 0;
                this.targetLockDuration = 3 + Math.random() * 2; // 3-5 seconds
            }
            
            // Turn to face locked target (only when stationary)
            if (this.lockedTarget && !this.lockedTarget.isDying && !this.isMoving) {
                const dx = this.lockedTarget.x - this.x;
                const dy = this.lockedTarget.y - this.y;
                const targetAngle = Math.atan2(dy, dx);
                
                this.targetHeading = targetAngle;
                this.isRotating = true;
            }
        } else {
            // No enemies in FOV - clear lock and reset timer
            this.lockedTarget = null;
            this.targetLockTimer = 0;
        }
        
    } else if (this.stance === 'defensive') {
        // DEFENSIVE: FOV stays fixed, but engage enemies in view
        this.targetLockTimer = 0;
        
        if (enemiesInFOV && enemiesInFOV.length > 0) {
            // Sort by distance, pick nearest (but don't rotate toward them)
            enemiesInFOV.sort((a, b) => a.distance - b.distance);
            this.lockedTarget = enemiesInFOV[0].entity;
            // Note: set lockedTarget but DON'T rotate (no isRotating = true)
        } else {
            // No enemies in FOV - clear lock
            this.lockedTarget = null;
        }
        
    } else if (this.stance === 'offensive') {
        // OFFENSIVE: Always scan and lock nearest enemy
        this.targetLockTimer = 0;
        
        if (enemiesInFOV && enemiesInFOV.length > 0) {
            // Sort by distance, pick nearest
            enemiesInFOV.sort((a, b) => a.distance - b.distance);
            this.lockedTarget = enemiesInFOV[0].entity;
            
            // Turn to face locked target (even while moving)
            if (this.lockedTarget && !this.lockedTarget.isDying) {
                const dx = this.lockedTarget.x - this.x;
                const dy = this.lockedTarget.y - this.y;
                const targetAngle = Math.atan2(dy, dx);
                
                this.targetHeading = targetAngle;
                this.isRotating = true;
            }
        } else {
            // No enemies in FOV - clear lock
            this.lockedTarget = null;
        }
    }
}

// === AI AUTO-ENGAGEMENT (OFFENSIVE STANCE) ===
// Check if AI should control this unit
const canAIControl = (
    this.stance === 'offensive' &&
    !this.isDying &&
    !this.isPanicking &&
    this.weaponRange > 20 &&        // Exclude melee-only units
    this.targetX === null &&
    this.targetY === null &&
    !this.hasManualTarget
);

if (canAIControl) {
    const enemiesInFOV = this.scanForEnemies(allEntities);

    if (enemiesInFOV && enemiesInFOV.length > 0) {
        // Sort by distance (nearest first)
        enemiesInFOV.sort((a, b) => a.distance - b.distance);

        // Calculate target: average position of nearest 1-3 enemies
        const numToAverage = Math.min(enemiesInFOV.length, 3);
        const targetEnemies = enemiesInFOV.slice(0, numToAverage);

        let avgX = 0, avgY = 0;
        for (const enemyData of targetEnemies) {
            avgX += enemyData.entity.x;
            avgY += enemyData.entity.y;
        }
        avgX /= numToAverage;
        avgY /= numToAverage;

        this.aiTargetX = avgX;
        this.aiTargetY = avgY;
        this.aiTargetEnemies = targetEnemies.map(e => e.entity);

        // Check if ANY enemy is in objective cone
        let anyEnemyInCone = false;
        for (const enemy of this.aiTargetEnemies) {
            if (this.isInObjectiveCone(enemy.x, enemy.y)) {
                anyEnemyInCone = true;
                break;
            }
        }

        if (anyEnemyInCone) {
            // STOP - enemy in optimal firing range, and disperse
            this.aiControlled = false;
            this.isMoving = false;
            this.targetX = null;
            this.targetY = null;
            this.disperseFromFriendlies(allEntities);
            console.log(`AI Unit ${this.id}: Enemy in objective cone - STOPPING`);
        } else {
            // MOVE - pursue enemies
            this.aiControlled = true;
            this.targetX = this.aiTargetX;
            this.targetY = this.aiTargetY;
            this.isMoving = true;
            this.aiLastTargetUpdate = 0; // Reset update timer

            const dx = this.aiTargetX - this.x;
            const dy = this.aiTargetY - this.y;
            this.targetHeading = Math.atan2(dy, dx);
            this.isRotating = true;
            console.log(`AI Unit ${this.id}: Pursuing enemies at (${Math.floor(avgX)}, ${Math.floor(avgY)})`);
        }
    } else {
        // No enemies visible - stop and clear AI state
        if (this.aiControlled) {
            this.aiControlled = false;
            this.isMoving = false;
            this.targetX = null;
            this.targetY = null;
            this.aiTargetX = null;
            this.aiTargetY = null;
            this.aiTargetEnemies = [];
        }
    }
}

// THROTTLED AI FOV CHECK - Stop if enemies no longer visible
if (this.aiControlled && this.isMoving) {
    this.aiLastFOVCheck += deltaTime;

    if (this.aiLastFOVCheck >= this.aiFOVCheckInterval) {
        this.aiLastFOVCheck = 0;

        const enemiesInFOV = this.scanForEnemies(allEntities);

        if (!enemiesInFOV || enemiesInFOV.length === 0) {
            // No enemies visible - stop immediately and disperse
            this.aiControlled = false;
            this.isMoving = false;
            this.targetX = null;
            this.targetY = null;
            this.aiTargetX = null;
            this.aiTargetY = null;
            this.aiTargetEnemies = [];
            this.disperseFromFriendlies(allEntities);
            console.log(`AI Unit ${this.id}: No enemies in FOV - STOPPING`);
        }
    }
}

// CONTINUOUS TARGET TRACKING & OBJECTIVE CONE CHECK
if (this.aiControlled && this.isMoving && this.targetX !== null) {
    this.aiLastTargetUpdate += deltaTime;

    if (this.aiLastTargetUpdate >= this.aiTargetUpdateInterval) {
        this.aiLastTargetUpdate = 0;

        const enemiesInFOV = this.scanForEnemies(allEntities);

        if (enemiesInFOV && enemiesInFOV.length > 0) {
            // Recalculate target
            enemiesInFOV.sort((a, b) => a.distance - b.distance);
            const numToAverage = Math.min(enemiesInFOV.length, 3);
            const targetEnemies = enemiesInFOV.slice(0, numToAverage);

            let avgX = 0, avgY = 0;
            for (const enemyData of targetEnemies) {
                avgX += enemyData.entity.x;
                avgY += enemyData.entity.y;
            }
            avgX /= numToAverage;
            avgY /= numToAverage;

            // Update AI target info
            this.aiTargetX = avgX;
            this.aiTargetY = avgY;
            this.aiTargetEnemies = targetEnemies.map(e => e.entity);

            // CHECK OBJECTIVE CONE - Critical addition!
            let anyEnemyInCone = false;
            for (const enemy of this.aiTargetEnemies) {
                if (this.isInObjectiveCone(enemy.x, enemy.y)) {
                    anyEnemyInCone = true;
                    break;
                }
            }

            if (anyEnemyInCone) {
                // STOP - enemy reached optimal firing range, and disperse
                this.aiControlled = false;
                this.isMoving = false;
                this.targetX = null;
                this.targetY = null;
                this.disperseFromFriendlies(allEntities);
                console.log(`AI Unit ${this.id}: Enemy entered objective cone - STOPPING`);
            } else {
                // Continue pursuing - update target position
                this.targetX = avgX;
                this.targetY = avgY;

                // Update heading
                const dx = avgX - this.x;
                const dy = avgY - this.y;
                this.targetHeading = Math.atan2(dy, dx);
            }
        }
    }
}

// === AI RETREAT DETECTION ===
// Check if should enter retreat mode (3+ enemies in retreat cone)
const canRetreat = (
    !this.isDying &&
    !this.isPanicking &&
    !this.isRetreating &&
    this.weaponRange > 20 &&        // Exclude melee-only units
    !this.hasManualTarget &&
    this.targetX === null &&        // No manual movement orders
    this.targetY === null
);

if (canRetreat) {
    const enemiesInFOV = this.scanForEnemies(allEntities);

    if (enemiesInFOV && enemiesInFOV.length > 0) {
        // Count enemies in retreat cone
        let enemiesInRetreatCone = 0;
        for (const enemyData of enemiesInFOV) {
            if (this.isInRetreatCone(enemyData.entity.x, enemyData.entity.y)) {
                enemiesInRetreatCone++;
            }
        }

        // Trigger retreat if 3+ enemies in cone
        if (enemiesInRetreatCone >= 3) {
            console.log(`Unit ${this.id}: ${enemiesInRetreatCone} enemies in retreat cone - RETREATING`);
            this.startRetreat(allEntities);
        }
    }
}

    // COMBAT: CHECK IF ENEMY IN WEAPON RANGE AND FIRE
    if (!this.isDying && !this.isPanicking && this.lockedTarget && !this.lockedTarget.isDying) {
        // Check if target is within weapon range cone
        const dx = this.lockedTarget.x - this.x;
        const dy = this.lockedTarget.y - this.y;
        const distanceToTarget = Math.sqrt(dx * dx + dy * dy);
        
        // Check if target is within range
        if (distanceToTarget <= this.weaponRange) {
            // Check if target is within 120° weapon cone
            const angleToTarget = Math.atan2(dy, dx);
            let angleDiff = angleToTarget - this.heading;
            while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
            while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
            
            if (Math.abs(angleDiff) <= this.weaponRangeAngle / 2) {
                // Target is in weapon range cone - attempt to fire
                if (!this.isReloading && this.shootCooldown <= 0 && this.ranged_magazine_current > 0) {
                    // Start shot delay timer if not already counting
                    if (this.shotDelayTimer === 0) {
                        this.shotDelayTimer = Math.random() * 0.5; // Random 0-0.5s delay
                    }
                }
            }
        }
    }

    // EXECUTE DELAYED SHOT (with burst support)
    // Handle burst firing sequence
    if (this.isBurstFiring) {
        this.burstDelayTimer -= deltaTime;

        if (this.burstDelayTimer <= 0 && this.burstShotsRemaining > 0) {
            this.fire(allEntities);
            this.burstShotsRemaining--;
            this.burstDelayTimer = this.burstDelay; // Reset for next shot

            // End burst if no shots remaining
            if (this.burstShotsRemaining <= 0) {
                this.isBurstFiring = false;
            }
        }
    } else {
        // Normal/Scatter: execute delayed shot
        if (this.shotDelayTimer > 0) {
            this.shotDelayTimer -= deltaTime;

            if (this.shotDelayTimer <= 0) {
                this.shotDelayTimer = 0;
                // Fire now
                if (!this.isReloading && this.shootCooldown <= 0 && this.ranged_magazine_current > 0 && this.lockedTarget && !this.lockedTarget.isDying) {
                    this.fire(allEntities);
                }
            }
        }
    }


    // MELEE COMBAT SYSTEM
    if (!this.isDying && !this.isPanicking && this.melee_range > 0) {
        // Find closest enemy within melee range AND in FOV
        const enemiesInFOV = this.scanForEnemies(allEntities);
        let closestMeleeEnemy = null;
        let closestDistance = Infinity;
        
        if (enemiesInFOV) {
            for (const enemyData of enemiesInFOV) {
                const enemy = enemyData.entity;
                const distance = enemyData.distance;
                
                // Check if within melee range
                if (distance <= this.melee_range && distance < closestDistance) {
                    closestDistance = distance;
                    closestMeleeEnemy = enemy;
                }
            }
        }
        
        // Update melee state
        if (closestMeleeEnemy) {
            // Check if target changed
            const targetChanged = this.meleeTarget && this.meleeTarget.id !== closestMeleeEnemy.id;
            
            // Enter or continue melee
            this.isInMelee = true;
            this.meleeTarget = closestMeleeEnemy;
            
            // If target changed mid-melee, log it
            if (targetChanged) {
                console.log(`Entity ${this.id} switched melee target to ${closestMeleeEnemy.id} (closest changed)`);
            }
            
            // Verify target is still alive before attacking
            if (this.meleeTarget.isDying || this.meleeTarget.health <= 0) {
                // Target died - clear and find new target next frame
                this.meleeTarget = null;
                this.isInMelee = false;
            } else if (this.meleeCooldownTimer <= 0) {
                // Attempt melee attack if cooldown ready
                this.performMeleeAttack();
            }
        } else {
            // No enemies in melee range - exit melee
            if (this.isInMelee) {
                this.isInMelee = false;
                this.meleeTarget = null;
                this.chargedTargets.clear(); // Reset charge tracking when leaving melee
                console.log(`Entity ${this.id} exited melee - charge targets cleared`);
            }
        }
    }
}

performMeleeAttack() {
    if (!this.meleeTarget || this.meleeTarget.isDying) {
        return;
    }
    
    // Check if target is in direct melee range or if we can reach over (pike)
    if (!this.canReachTarget()) {
        return; // Can't attack this target
    }
    
    // Check if this is a cavalry charge
    const isCharging = this.isPerformingCharge();
    
    // Cavalry charges always hit, normal attacks are 60%
    let hitRoll = Math.random();
    let didHit = isCharging ? true : (hitRoll < this.meleeHitChance);
    
    if (didHit) {
        // Calculate damage with cavalry charge bonus and anti-cavalry bonus
        let damage = this.melee_base_damage;
        let chargeMultiplier = 1.0;
        let antiCavalryMultiplier = 1.0;
        
        // Anti-cavalry bonus: Pike weapons (length >= 1.75) deal 2x damage to mounted units
        if (this.equipment.melee && this.equipment.melee.length >= 1.75 && this.meleeTarget.mounted) {
            antiCavalryMultiplier = 2.0;
            console.log(`Entity ${this.id} ANTI-CAVALRY pike bonus against mounted unit ${this.meleeTarget.id} (2x damage)`);
        }
        
        if (isCharging) {
            // Calculate charge speed multiplier
            const currentSpeed = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
            const speedRatio = currentSpeed / this.baseMovementSpeed;
            chargeMultiplier = 0.5 + speedRatio; // 1x to 2x based on speed
            
            // Mounted bonus (+50%)
            const mountedMultiplier = 1.5;
            
            // Combined multiplier (charge × mounted × anti-cavalry)
            const totalMultiplier = chargeMultiplier * mountedMultiplier * antiCavalryMultiplier;
            damage *= totalMultiplier;
            
            // Mark this target as charged (no bonus on subsequent hits)
            this.chargedTargets.add(this.meleeTarget.id);
            
            // Update last charge time
            this.lastChargeTime = performance.now() / 1000; // Convert to seconds
            
            // Trigger charge impact visual
            this.chargeImpactTimer = 0.2; // 0.2 second impact effect
            this.chargeImpactX = this.meleeTarget.x;
            this.chargeImpactY = this.meleeTarget.y;
            
            console.log(`Entity ${this.id} CAVALRY CHARGE hit entity ${this.meleeTarget.id} for ${damage.toFixed(1)} damage (${totalMultiplier.toFixed(2)}x multiplier, speed: ${currentSpeed.toFixed(1)})`);
        } else {
            // Apply anti-cavalry bonus to base damage if not charging
            damage *= antiCavalryMultiplier;
            console.log(`Entity ${this.id} melee HIT entity ${this.meleeTarget.id} for ${damage.toFixed(1)} damage (${hitRoll.toFixed(2)} < ${this.meleeHitChance})`);
        }
        
        this.meleeTarget.health -= damage;
        
        // Visual hit flash
        this.meleeTarget.meleeHitFlashTimer = 0.2; // 0.2 second flash
        
        // Apply mounted speed debuffs
        if (this.meleeTarget.mounted) {
            // Target hit by melee gets hit debuff
            this.meleeTarget.mountedHitDebuffStacks++;
            this.meleeTarget.mountedDebuffTimers.push({ type: 'hit', timer: 5 }); // 5 second debuff
            this.meleeTarget.updateVisualProperties();
        }
        
        if (this.mounted && isCharging) {
            // Attacker performing charge gets charge debuff
            this.mountedChargeDebuffStacks++;
            this.mountedDebuffTimers.push({ type: 'charge', timer: 2 }); // 2 second debuff
            this.updateVisualProperties();
        }
        
        // Turn target towards attacker (melee reaction)
        const dx = this.x - this.meleeTarget.x;
        const dy = this.y - this.meleeTarget.y;
        const angleToAttacker = Math.atan2(dy, dx);
        
        this.meleeTarget.targetHeading = angleToAttacker;
        this.meleeTarget.isRotating = true;
        
        // Target locks onto attacker if not already in combat
        if (!this.meleeTarget.isInMelee || !this.meleeTarget.meleeTarget) {
            this.meleeTarget.meleeTarget = this;
            this.meleeTarget.isInMelee = true;
            console.log(`Entity ${this.meleeTarget.id} counter-engaged attacker ${this.id} (melee reaction)`);
        }
    } else {
        console.log(`Entity ${this.id} melee MISS entity ${this.meleeTarget.id} (${hitRoll.toFixed(2)} >= ${this.meleeHitChance})`);
    }
    
    // Reset cooldown
    this.meleeCooldownTimer = this.melee_cooldown_duration;
}

isPerformingCharge() {
    // Requirements for cavalry charge:
    // 1. Unit must be mounted
    if (!this.mounted) return false;
    
    // 2. Must be moving faster than 50% base speed
    const currentSpeed = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
    const speedThreshold = this.baseMovementSpeed * 0.5;
    if (currentSpeed < speedThreshold) return false;
    
    // 3. Must not have already charged this target
    if (this.chargedTargets.has(this.meleeTarget.id)) return false;
    
    // 4. Charge cooldown must be ready (1 second between charges)
    const currentTime = performance.now() / 1000; // Convert to seconds
    if (currentTime - this.lastChargeTime < this.chargeCooldown) return false;
    
    return true;
}

canReachTarget() {
    if (!this.meleeTarget) return false;
    
    const dx = this.meleeTarget.x - this.x;
    const dy = this.meleeTarget.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Direct melee range - always can attack
    if (distance <= this.melee_range) {
        return true;
    }
    
    // Pike reach-over check (length >= 1.75 can reach over allies)
    if (this.equipment.melee && this.equipment.melee.length >= 1.75) {
        // Check if there's a friendly unit between us and target
        const allEntities = entityManager.getAllEntities();
        
        for (const ally of allEntities) {
            // Skip self
            if (ally.id === this.id) continue;
            
            // Only same faction
            if (ally.faction !== this.faction) continue;
            
            // Not dead
            if (ally.isDying || ally.health <= 0) continue;
            
            // Check if ally is on the line between attacker and target
            const distToAlly = this.pointToLineDistance(
                { x: ally.x, y: ally.y },
                { x: this.x, y: this.y },
                { x: this.meleeTarget.x, y: this.meleeTarget.y }
            );
            
            // If ally is within 5px of the attack line, we can reach over them
            if (distToAlly <= 5) {
                // Verify ally is actually between us and target (not behind)
                const distToTarget = Math.sqrt(dx * dx + dy * dy);
                const allyDx = ally.x - this.x;
                const allyDy = ally.y - this.y;
                const distToAllyFromUs = Math.sqrt(allyDx * allyDx + allyDy * allyDy);
                
                if (distToAllyFromUs < distToTarget) {
                    console.log(`Entity ${this.id} pike REACH OVER ally ${ally.id} to attack ${this.meleeTarget.id}`);
                    return true;
                }
            }
        }
    }
    
    return false;
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

    // Separation: avoid crowding neighbors
calculateSeparation(allEntities) {
    let steerX = 0;
    let steerY = 0;
    let count = 0;

    for (const other of allEntities) {
        if (other.id === this.id) continue;

        const dx = this.x - other.x;
        const dy = this.y - other.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0 && dist < this.personalSpaceRadius) {
            // Always full separation (removed stationary penalty to prevent blobbing)
            const weight = 1.0;
            const distWeight = (1 - (dist / this.personalSpaceRadius)) * weight;
            
            steerX += (dx / dist) * distWeight;
            steerY += (dy / dist) * distWeight;
            count++;
        }
    }

    if (count > 0) {
        steerX /= count;
        steerY /= count;
        
        const mag = Math.sqrt(steerX ** 2 + steerY ** 2);
        if (mag > 0) {
            steerX = (steerX / mag) * this.movement_speed;
            steerY = (steerY / mag) * this.movement_speed;
        }
    }

    return { x: steerX, y: steerY };
}

// Collision avoidance: predict and avoid future collisions
calculateCollisionAvoidance(allEntities) {
    const lookAheadTime = 0.5; // seconds
    const avoidDistance = this.radius * 3;
    
    // Predict future position
    const futureX = this.x + this.velocity.x * lookAheadTime;
    const futureY = this.y + this.velocity.y * lookAheadTime;
    
    let steerX = 0;
    let steerY = 0;
    let mostThreatening = null;
    let closestDist = Infinity;

    for (const other of allEntities) {
        if (other.id === this.id) continue;

        // Predict other's future position
        const otherFutureX = other.x + other.velocity.x * lookAheadTime;
        const otherFutureY = other.y + other.velocity.y * lookAheadTime;

        // Distance to predicted collision point
        const dx = futureX - otherFutureX;
        const dy = futureY - otherFutureY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < avoidDistance && dist < closestDist) {
            closestDist = dist;
            mostThreatening = { x: otherFutureX, y: otherFutureY, dist: dist };
        }
    }

    if (mostThreatening) {
        // Steer perpendicular to the collision course
        const toThreatX = mostThreatening.x - this.x;
        const toThreatY = mostThreatening.y - this.y;
        
        // Perpendicular vector (rotate 90 degrees)
        const perpX = -toThreatY;
        const perpY = toThreatX;
        
        // Determine which direction to turn
        const toTargetX = this.targetX - this.x;
        const toTargetY = this.targetY - this.y;
        
        const dotProduct = perpX * toTargetX + perpY * toTargetY;
        const direction = dotProduct >= 0 ? 1 : -1;
        
        // Calculate avoidance force
        const weight = 1 - (mostThreatening.dist / avoidDistance);
        const perpMag = Math.sqrt(perpX ** 2 + perpY ** 2);
        
        if (perpMag > 0) {
            steerX = (perpX / perpMag) * this.movement_speed * weight * direction;
            steerY = (perpY / perpMag) * this.movement_speed * weight * direction;
        }
    }

    return { x: steerX, y: steerY };
}

    // Wall Repulsion: treat walls like repelling magnets
calculateWallRepulsion() {
    if (typeof TerrainManager === 'undefined') {
        return { x: 0, y: 0 };
    }

    const sampleRadius = 50;
    const samplePoints = 32;
    let repulsionX = 0;
    let repulsionY = 0;

    // Get movement direction to determine "forward"
    const moveDirX = this.velocity.x;
    const moveDirY = this.velocity.y;
    const moveMag = Math.sqrt(moveDirX ** 2 + moveDirY ** 2);

    for (let i = 0; i < samplePoints; i++) {
        const angle = (i / samplePoints) * Math.PI * 2;
        const checkX = Math.floor(this.x + Math.cos(angle) * sampleRadius);
        const checkY = Math.floor(this.y + Math.sin(angle) * sampleRadius);

        const terrainType = TerrainManager.getTerrainType(checkX, checkY);

        if (terrainType === 'wall' || terrainType === 'water') {
            const dx = checkX - this.x;
            const dy = checkY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 0) {
                let strength = Math.pow(1 - (dist / sampleRadius), 2);
                
                if (moveMag > 0.1) {
                    const wallDirX = dx / dist;
                    const wallDirY = dy / dist;
                    const moveDirNormX = moveDirX / moveMag;
                    const moveDirNormY = moveDirY / moveMag;
                    
                    const dotProduct = wallDirX * moveDirNormX + wallDirY * moveDirNormY;
                    
                    if (dotProduct < 0.3) {
                        strength *= 0.2;
                    }
                }
                
                repulsionX -= (dx / dist) * strength;
                repulsionY -= (dy / dist) * strength;
            }
        }
    }

    // Normalize
    const mag = Math.sqrt(repulsionX ** 2 + repulsionY ** 2);
    if (mag > 0) {
        repulsionX = (repulsionX / mag) * this.movement_speed;
        repulsionY = (repulsionY / mag) * this.movement_speed;
    }

    // SMOOTH THE FORCE - blend with previous frame
    const smoothing = 0.75; // Higher = smoother but slower response (0.5 - 0.8 range)
    this.smoothedWallRepulsion.x = this.smoothedWallRepulsion.x * smoothing + repulsionX * (1 - smoothing);
    this.smoothedWallRepulsion.y = this.smoothedWallRepulsion.y * smoothing + repulsionY * (1 - smoothing);

    return { x: this.smoothedWallRepulsion.x, y: this.smoothedWallRepulsion.y };
}

// Fire Repulsion: avoid fires unless ordered to move through them
calculateFireRepulsion() {
    if (typeof fireManager === 'undefined') {
        return { x: 0, y: 0 };
    }
    
    const fires = fireManager.getAllFires();
    if (fires.length === 0) {
        return { x: 0, y: 0 };
    }
    
    let repulsionX = 0;
    let repulsionY = 0;
    const detectionRadius = 20; // Start repelling at 20px from fire center
    
    for (const fire of fires) {
        const dx = this.x - fire.x;
        const dy = this.y - fire.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Only repel if within detection radius
        if (distance > 0 && distance < detectionRadius) {
            // Inverse square law - stronger when closer
            const strength = Math.pow(1 - (distance / detectionRadius), 2);
            
            repulsionX += (dx / distance) * strength;
            repulsionY += (dy / distance) * strength;
        }
    }
    
    // Normalize
    const mag = Math.sqrt(repulsionX ** 2 + repulsionY ** 2);
    if (mag > 0) {
        repulsionX = (repulsionX / mag) * this.movement_speed;
        repulsionY = (repulsionY / mag) * this.movement_speed;
    }
    
    return { x: repulsionX, y: repulsionY };
}

// Check line of sight to a specific position (blocked by walls only, NOT water)
hasLineOfSightToPosition(targetX, targetY) {
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < 1) return true;
    
    const samples = Math.ceil(distance / 10); // Check every 10px
    
    for (let i = 1; i <= samples; i++) {
        const t = i / samples;
        const checkX = this.x + dx * t;
        const checkY = this.y + dy * t;
        
        const terrainType = TerrainManager.getTerrainType(checkX, checkY);
        
        if (terrainType === 'wall') {
            return false; // Blocked by wall only
        }
    }
    
    return true; // Clear line of sight
}

updateElevation() {
    // Only check every N frames for performance
    this.elevationCheckCounter++;
    if (this.elevationCheckCounter < this.elevationCheckInterval) {
        return;
    }
    this.elevationCheckCounter = 0;
    
    // Check terrain pixel at current position
    if (typeof TerrainManager === 'undefined') {
        this.elevation = 0;
        return;
    }
    
    const terrainType = TerrainManager.getTerrainType(this.x, this.y);
    
    // Only calculate elevation for valid terrain (not walls or water)
    if (terrainType === 'terrain') {
        const height = TerrainManager.getHeightAt(this.x, this.y);
        this.elevation = height; // getHeightAt already does floor(r/10)
    } else {
        this.elevation = 0; // Walls and water have no elevation
    }
    
    // Check for deadly height change - unit fell into hole/water/wall
    if (this.elevation === 0 && this.previousElevation > 0 && !this.isDying) {
        console.log(`Entity ${this.id} (${this.faction}) fell to elevation 0 - perishing!`);
        this.health = 0; // Will trigger death in next update cycle
    }
    
    // Update previous elevation for next check
    this.previousElevation = this.elevation;
}

// Scan for enemy units in field of view
scanForEnemies(allEntities) {
    if (this.isDying || this.isPanicking) return null;
    
    const enemies = allEntities.filter(e => 
        e.faction !== this.faction && 
        !e.isDying
        // Removed !e.isPanicking - now can lock panicking enemies
    );
    
    if (enemies.length === 0) return null;
    
    const enemiesInFOV = [];
    const maxViewDistance = 1000; // Maximum vision range
    
    for (const enemy of enemies) {
        // Check if enemy is in FOV cone
        const dx = enemy.x - this.x;
        const dy = enemy.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 1 || distance > maxViewDistance) continue; // Too close or too far
        
        const angleToEnemy = Math.atan2(dy, dx);
        
        // Calculate angle difference
        let angleDiff = angleToEnemy - this.heading;
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
        
        // Check if within FOV angle
        if (Math.abs(angleDiff) <= this.getViewAngle() / 2) {
            // Check line of sight (blocked by obstacles)
            if (this.hasLineOfSightToPosition(enemy.x, enemy.y)) {
                enemiesInFOV.push({ entity: enemy, distance: distance });
            }
        }
    }
    
    return enemiesInFOV.length > 0 ? enemiesInFOV : null;
}

// Check if position is within the objective cone (90% weapon range, stance FOV)
isInObjectiveCone(targetX, targetY) {
    // Scatter weapons stop closer (75%), others at 90%
    const rangeMultiplier = (this.ranged_fire_mode === 'scatter') ? 0.75 : 0.9;
    const objectiveConeRadius = this.weaponRange * rangeMultiplier;
    const objectiveConeAngle = this.getViewAngle(); // 90° for offensive

    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > objectiveConeRadius) return false;

    const angleToTarget = Math.atan2(dy, dx);
    let angleDiff = angleToTarget - this.heading;
    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

    return Math.abs(angleDiff) <= objectiveConeAngle / 2;
}

// Check if position is within the retreat cone (50% weapon range, vision FOV)
isInRetreatCone(targetX, targetY) {
    const retreatConeRadius = this.weaponRange * 0.5;
    const retreatConeAngle = this.getViewAngle(); // Uses stance-based FOV

    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > retreatConeRadius) return false;

    const angleToTarget = Math.atan2(dy, dx);
    let angleDiff = angleToTarget - this.heading;
    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

    return Math.abs(angleDiff) <= retreatConeAngle / 2;
}

// Disperse from nearby friendlies when AI deactivates
disperseFromFriendlies(allEntities) {
    const nearbyFriendlies = allEntities.filter(e =>
        e !== this &&
        e.faction === this.faction &&
        !e.isDying
    );

    let disperseX = 0;
    let disperseY = 0;
    const disperseRadius = 15; // Check within 15px
    let count = 0;

    for (const friendly of nearbyFriendlies) {
        const dx = this.x - friendly.x;
        const dy = this.y - friendly.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0 && distance < disperseRadius) {
            // Push away from friendly
            const strength = (1 - distance / disperseRadius) * 5; // Max 5px push
            disperseX += (dx / distance) * strength;
            disperseY += (dy / distance) * strength;
            count++;
        }
    }

    if (count > 0) {
        // Apply small dispersion offset
        this.x += disperseX;
        this.y += disperseY;
        console.log(`Unit ${this.id}: Dispersed from ${count} nearby friendlies`);
    }
}

// Start retreat behavior
startRetreat(allEntities) {
    // Override AI movement
    if (this.aiControlled) {
        this.aiControlled = false;
        this.aiTargetX = null;
        this.aiTargetY = null;
        this.aiTargetEnemies = [];
    }

    // Enter retreat state
    this.isRetreating = true;
    this.retreatTimer = 0;
    this.retreatStartX = this.x;
    this.retreatStartY = this.y;

    // Clear any existing movement targets
    this.targetX = null;
    this.targetY = null;
    this.isMoving = false;

    // Mounted units turn around (horses can't walk backwards)
    if (this.mounted) {
        this.heading += Math.PI; // Turn 180°
        // Normalize heading to 0-2π range
        while (this.heading >= 2 * Math.PI) this.heading -= 2 * Math.PI;
        while (this.heading < 0) this.heading += 2 * Math.PI;
    }

    console.log(`Unit ${this.id}: Retreat started at (${Math.floor(this.x)}, ${Math.floor(this.y)})${this.mounted ? ' (mounted - turned around)' : ''}`);
}

// Stop retreat behavior
stopRetreat(allEntities) {
    if (!this.isRetreating) return;

    // Mounted units turn back around
    if (this.mounted) {
        this.heading += Math.PI; // Turn 180° back to original direction
        // Normalize heading to 0-2π range
        while (this.heading >= 2 * Math.PI) this.heading -= 2 * Math.PI;
        while (this.heading < 0) this.heading += 2 * Math.PI;
    }

    this.isRetreating = false;
    this.retreatTimer = 0;
    this.retreatStartX = null;
    this.retreatStartY = null;
    this.isMoving = false;
    this.targetX = null;
    this.targetY = null;

    // Disperse from friendlies (same as AI movement end)
    this.disperseFromFriendlies(allEntities);

    console.log(`Unit ${this.id}: Retreat stopped at (${Math.floor(this.x)}, ${Math.floor(this.y)})${this.mounted ? ' (mounted - turned back)' : ''}`);
}

fire(allEntities) {
    const fireMode = this.ranged_fire_mode || 'normal';

    if (fireMode === 'burst') {
        this.fireBurst(allEntities);
    } else if (fireMode === 'scatter') {
        this.fireScatter(allEntities);
    } else {
        this.fireNormal(allEntities);
    }
}

fireNormal(allEntities) {
    // Start shooting
    this.isShooting = true;
    
    // Calculate shot cone angle based on barrel length
    const weaponLength = this.equipment.ranged ? this.equipment.ranged.length : 1;
    let shotConeAngle = (2 - weaponLength) * 0.1; // Narrower cone for longer barrels

    // Burst mode: 20% accuracy penalty
    if (this.ranged_fire_mode === 'burst') {
        shotConeAngle *= 1.2;
    }

    // ELEVATION MODIFIER: Adjust accuracy based on height difference
    if (this.lockedTarget) {
        const elevationDiff = this.elevation - this.lockedTarget.elevation; // Positive = shooting downhill
        const accuracyModifier = 1 + (elevationDiff * 0.015); // Uphill = wider cone, downhill = tighter cone
       shotConeAngle *= accuracyModifier;
        
        // Log significant elevation differences
        if (Math.abs(elevationDiff) > 5) {
            console.log(`Entity ${this.id} elevation advantage: ${elevationDiff.toFixed(1)}m, accuracy mod: ${(accuracyModifier * 100).toFixed(0)}%`);
        }
    }
    
    // SMOKE MODIFIER: Reduce accuracy based on smoke clouds
    if (this.smokeCloudCount > 0) {
        const smokeModifier = 1 + (this.smokeCloudCount * 0.1);
        shotConeAngle *= smokeModifier;
        console.log(`Entity ${this.id} firing through ${this.smokeCloudCount} smoke cloud(s) - accuracy penalty: ${(smokeModifier * 100).toFixed(0)}%`);
    }
    
    // EXPLOSION DEBUFF MODIFIER: Reduce accuracy if affected by explosion shockwave
    if (this.accuracyDebuffTimer > 0) {
        const debuffModifier = 1 + (this.accuracyDebuffTimer * 0.1); // Stacks: 3s = 1.3x, 6s = 1.6x, etc.
        shotConeAngle *= debuffModifier;
        console.log(`Entity ${this.id} firing with explosion debuff: ${this.accuracyDebuffTimer.toFixed(1)}s remaining, accuracy penalty: ${(debuffModifier * 100).toFixed(0)}%`);
    }
    
    // HALO ENGAGE BUFF: Improve accuracy if buffed by leader halo
    if (this.accuracyBuffTimer > 0) {
        const buffModifier = 1 / (1 + (this.accuracyBuffTimer * 0.05)); // 10s = 0.67x (33% better), 5s = 0.8x (20% better)
        shotConeAngle *= buffModifier;
        console.log(`Entity ${this.id} firing with halo engage buff: ${this.accuracyBuffTimer.toFixed(1)}s remaining, accuracy bonus: ${((1 - buffModifier) * 100).toFixed(0)}%`);
    }
    
    // Pick random angle within shot cone
    const randomAngle = this.heading + (Math.random() - 0.5) * shotConeAngle;
    
    // Calculate endpoint of shot at weapon range
    const endX = this.x + Math.cos(randomAngle) * this.weaponRange;
    const endY = this.y + Math.sin(randomAngle) * this.weaponRange;
    
    // CHECK FOR FRIENDLY UNITS BLOCKING LINE OF FIRE
    const blockingAllies = this.countAlliesInLineOfFire(this.x, this.y, endX, endY, allEntities);
    if (blockingAllies >= 3) {
        console.log(`Entity ${this.id} cannot fire - ${blockingAllies} allies blocking line of fire`);
        this.shootCooldown = 1.5; // Short cooldown before trying again
        this.isShooting = false;
        return; // Abort shot
    }

    // VISUAL EFFECTS: Muzzle flash and smoke puff trail
    this.muzzleFlashTimer = 0.1; // 0.1 second flash

    // Create smoke puffs near muzzle only (2-6 puffs)
    const numPuffs = 2 + Math.floor(Math.random() * 6); // Random 2-5 puffs
    const puffDistance = 40+Math.random()*40; // Puffs only extend 40-80px from muzzle
    const dx = endX - this.x;
    const dy = endY - this.y;

    for (let i = 0; i < numPuffs; i++) {
        const t = i / (numPuffs - 1); // 0 to 1 along short distance
        const puffX = this.x + Math.cos(randomAngle) * (puffDistance * t);
        const puffY = this.y + Math.sin(randomAngle) * (puffDistance * t);
        
        // Random variations for more organic look
        const offsetX = (Math.random() - 0.5) * 5;
        const offsetY = (Math.random() - 0.5) * 5;
        
        this.smokePuffs.push({
            x: puffX + offsetX,
            y: puffY + offsetY,
            timer: 0,
            maxTimer: 1 + Math.random() * 4, // Linger 1-5 seconds
            initialRadius: 2 + Math.random() * 2 // Start small, will expand
        });
    }

    // INCENDIARY WEAPONS: 1/5 chance to spawn fire at impact point
    if (this.ranged_incendiary && Math.random() < 0.1) {
        // Raycast to find impact point (either enemy or endpoint)
        const hitEntity = this.raycastForHit(this.x, this.y, endX, endY, allEntities);
        
        let fireX, fireY;
        if (hitEntity) {
            // Hit an enemy - spawn fire at enemy location
            fireX = hitEntity.x;
            fireY = hitEntity.y;
        } else {
            // Missed - spawn fire at endpoint
            fireX = endX;
            fireY = endY;
        }
        
        // Check if valid terrain (not wall or water)
        if (typeof TerrainManager !== 'undefined') {
            const terrainType = TerrainManager.getTerrainType(fireX, fireY);
            
            if (terrainType !== 'wall' && terrainType !== 'water') {
                if (typeof fireManager !== 'undefined') {
                    fireManager.addFire(fireX, fireY);
                    console.log(`Entity ${this.id} incendiary shot started fire at (${Math.floor(fireX)}, ${Math.floor(fireY)})`);
                }
            }
        }
    }
    
    // Raycast from unit to random endpoint - check for hits
    const hitEntity = this.raycastForHit(this.x, this.y, endX, endY, allEntities);
    
    if (hitEntity) {
        // Hit detected!
        const criticalHit = Math.random() < 0.05; // 5% chance instant kill
        
        if (criticalHit) {
            console.log(`Entity ${this.id} scored CRITICAL HIT on entity ${hitEntity.id}!`);
            hitEntity.health = 0; // Instant kill
        } else {
            const damage = this.ranged_base_damage;
            hitEntity.health -= damage;
            console.log(`Entity ${this.id} hit entity ${hitEntity.id} for ${damage} damage (health: ${hitEntity.health.toFixed(1)})`);
            
            // Apply mounted speed debuff if target is mounted
            if (hitEntity.mounted) {
                hitEntity.mountedHitDebuffStacks++;
                hitEntity.mountedDebuffTimers.push({ type: 'hit', timer: 5 }); // 5 second debuff
                hitEntity.updateVisualProperties(); // Recalculate speed
            }
        }
        
        // Check if hit was from outside FOV (flanking attack)
        const dx = this.x - hitEntity.x;
        const dy = this.y - hitEntity.y;
        const angleToAttacker = Math.atan2(dy, dx);
        
        let angleDiff = angleToAttacker - hitEntity.heading;
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
        
        const isFlanking = Math.abs(angleDiff) > hitEntity.viewAngle / 2;
        
        // Raise distress on being hit (multiplied if flanked)
        let distressIncrease = 10;
        if (isFlanking) {
            distressIncrease *= 1.5; // Flanking modifier
            console.log(`Entity ${hitEntity.id} FLANKED by entity ${this.id}! Distress x1.5`);
        }
        hitEntity.distress = Math.min(100, hitEntity.distress + distressIncrease);
        
        // Rotate hit entity towards attacker (if not dying or panicking)
        if (!hitEntity.isDying && !hitEntity.isPanicking) {
            hitEntity.targetHeading = angleToAttacker;
            hitEntity.isRotating = true;
            
            // Clear old target and lock onto attacker
            hitEntity.lockedTarget = this;
            hitEntity.targetLockTimer = 0;
            hitEntity.hasManualTarget = true; // Treat as manual target to override stance
        }
    }
    
    // Decrement magazine
    this.ranged_magazine_current--;
    this.shotsInBurst++;
    
    console.log(`Entity ${this.id} fired! Magazine: ${this.ranged_magazine_current}/${this.ranged_magazine_max}`);
    
    // Set cooldown
    this.shootCooldown = 1.5;
    
    // Check if magazine empty - start reload
    if (this.ranged_magazine_current <= 0) {
        this.isReloading = true;
        this.reloadTimer = 0;
        this.shotsInBurst = 0;
        console.log(`Entity ${this.id} magazine empty - reloading...`);
    }
    
    // Reset shooting flag after brief moment (will be used for visual feedback in step 4)
    setTimeout(() => {
        this.isShooting = false;
    }, 100);

    // Add bullet ray for debug visualization (endX, endY already defined above)
    if (typeof showBulletRays !== 'undefined' && showBulletRays) {
        this.bulletRays.push({
            startX: this.x,
            startY: this.y,
            endX: endX,
            endY: endY,
            timer: 0,
            mode: 'normal'
        });
    }
}

fireBurst(allEntities) {
    // Check if this is the first shot (starting burst)
    if (!this.isBurstFiring) {
        // Start burst sequence
        this.isBurstFiring = true;
        this.burstShotsRemaining = this.ranged_magazine_current - 1;
        this.burstDelayTimer = this.burstDelay;
    }

    this.isShooting = true;
    const weaponLength = this.equipment.ranged ? this.equipment.ranged.length : 1;
    let shotConeAngle = (2 - weaponLength) * 0.1;
    shotConeAngle *= 1.2; // Burst penalty

    // Apply modifiers
    if (this.lockedTarget) {
        shotConeAngle *= (1 + (this.elevation - this.lockedTarget.elevation) * 0.015);
    }
    if (this.smokeCloudCount > 0) shotConeAngle *= (1 + this.smokeCloudCount * 0.1);
    if (this.accuracyDebuffTimer > 0) shotConeAngle *= (1 + this.accuracyDebuffTimer * 0.1);
    if (this.accuracyBuffTimer > 0) shotConeAngle *= (1 / (1 + this.accuracyBuffTimer * 0.05));

    const randomAngle = this.heading + (Math.random() - 0.5) * shotConeAngle;
    const endX = this.x + Math.cos(randomAngle) * this.weaponRange;
    const endY = this.y + Math.sin(randomAngle) * this.weaponRange;

    if (this.countAlliesInLineOfFire(this.x, this.y, endX, endY, allEntities) >= 3) {
        this.shootCooldown = 1.5;
        this.isBurstFiring = false;
        this.burstShotsRemaining = 0;
        return;
    }

    this.muzzleFlashTimer = 0.1;
    for (let i = 0; i < 4; i++) {
        const t = i / 3;
        const dist = 40 + Math.random() * 40;
        this.smokePuffs.push({
            x: this.x + Math.cos(randomAngle) * (dist * t) + (Math.random() - 0.5) * 5,
            y: this.y + Math.sin(randomAngle) * (dist * t) + (Math.random() - 0.5) * 5,
            timer: 0,
            maxTimer: 1 + Math.random() * 4,
            initialRadius: 2 + Math.random() * 2
        });
    }

    if (this.ranged_incendiary && Math.random() < 0.1) {
        const hit = this.raycastForHit(this.x, this.y, endX, endY, allEntities);
        const firePos = hit ? {x: hit.x, y: hit.y} : {x: endX, y: endY};
        if (typeof TerrainManager !== 'undefined' && typeof fireManager !== 'undefined') {
            const terrain = TerrainManager.getTerrainType(firePos.x, firePos.y);
            if (terrain !== 'wall' && terrain !== 'water') fireManager.addFire(firePos.x, firePos.y);
        }
    }

    const hitEntity = this.raycastForHit(this.x, this.y, endX, endY, allEntities);
    if (hitEntity) {
        if (Math.random() < 0.05) {
            hitEntity.health = 0;
        } else {
            hitEntity.health -= this.ranged_base_damage;
            if (hitEntity.mounted) {
                hitEntity.mountedHitDebuffStacks++;
                hitEntity.mountedDebuffTimers.push({type: 'hit', timer: 5});
                hitEntity.updateVisualProperties();
            }
        }
        const angleToAttacker = Math.atan2(this.y - hitEntity.y, this.x - hitEntity.x);
        hitEntity.distress = Math.min(100, hitEntity.distress + 10);
        if (!hitEntity.isDying && !hitEntity.isPanicking) {
            hitEntity.targetHeading = angleToAttacker;
            hitEntity.isRotating = true;
            hitEntity.lockedTarget = this;
            hitEntity.targetLockTimer = 0;
            hitEntity.hasManualTarget = true;
        }
    }

    this.ranged_magazine_current--;
    this.shotsInBurst++;

    if (typeof showBulletRays !== 'undefined' && showBulletRays) {
        this.bulletRays.push({
            startX: this.x,
            startY: this.y,
            endX: endX,
            endY: endY,
            timer: 0,
            mode: 'burst'
        });
    }

    if (this.ranged_magazine_current <= 0) {
        this.isReloading = true;
        this.reloadTimer = 0;
        this.shotsInBurst = 0;
        this.isBurstFiring = false;
        this.burstShotsRemaining = 0;
        return;
    }

    if (this.burstShotsRemaining <= 0) {
        this.shootCooldown = this.ranged_cooldown;
    }

    setTimeout(() => { this.isShooting = false; }, 100);
}

fireScatter(allEntities) {
    const shotsToFire = this.ranged_magazine_current;
    if (shotsToFire <= 0) return;

    const weaponLength = this.equipment.ranged ? this.equipment.ranged.length : 1;
    let shotConeAngle = (2 - weaponLength) * 0.1;

    if (this.lockedTarget) shotConeAngle *= (1 + (this.elevation - this.lockedTarget.elevation) * 0.015);
    if (this.smokeCloudCount > 0) shotConeAngle *= (1 + this.smokeCloudCount * 0.1);
    if (this.accuracyDebuffTimer > 0) shotConeAngle *= (1 + this.accuracyDebuffTimer * 0.1);
    if (this.accuracyBuffTimer > 0) shotConeAngle *= (1 / (1 + this.accuracyBuffTimer * 0.05));

    const baseAngle = this.heading;
    const baseTrajEndX = this.x + Math.cos(baseAngle) * this.weaponRange;
    const baseTrajEndY = this.y + Math.sin(baseAngle) * this.weaponRange;

    if (this.countAlliesInLineOfFire(this.x, this.y, baseTrajEndX, baseTrajEndY, allEntities) >= 3) {
        this.shootCooldown = 1.5;
        return;
    }

    this.muzzleFlashTimer = 0.1;
    for (let i = 0; i < 4; i++) {
        const t = i / 3;
        const dist = 40 + Math.random() * 40;
        this.smokePuffs.push({
            x: this.x + Math.cos(baseAngle) * (dist * t) + (Math.random() - 0.5) * 5,
            y: this.y + Math.sin(baseAngle) * (dist * t) + (Math.random() - 0.5) * 5,
            timer: 0,
            maxTimer: 1 + Math.random() * 4,
            initialRadius: 2 + Math.random() * 2
        });
    }

    for (let i = 0; i < shotsToFire; i++) {
        // Each pellet gets wide scatter spread: 0 to ±0.3 radians from base angle
        const minSpreadRadians = 0;  
        const maxSpreadRadians = 0.3;  
        const spreadMagnitude = minSpreadRadians + Math.random() * (maxSpreadRadians - minSpreadRadians);
        const spreadDirection = Math.random() < 0.5 ? -1 : 1;  // Random positive or negative
        const pelletAngle = baseAngle + (spreadMagnitude * spreadDirection);
        const endX = this.x + Math.cos(pelletAngle) * this.weaponRange;
        const endY = this.y + Math.sin(pelletAngle) * this.weaponRange;

        // Scatter pellets use thicker hit detection (+8px) to simulate shotgun spread
        const hitEntity = this.raycastForHit(this.x, this.y, endX, endY, allEntities, 8);
        if (hitEntity) {
            if (this.ranged_incendiary && Math.random() < 0.1 && typeof TerrainManager !== 'undefined' && typeof fireManager !== 'undefined') {
                const terrain = TerrainManager.getTerrainType(hitEntity.x, hitEntity.y);
                if (terrain !== 'wall' && terrain !== 'water') fireManager.addFire(hitEntity.x, hitEntity.y);
            }

            if (Math.random() < 0.05) {
                hitEntity.health = 0;
            } else {
                // Calculate distance to target for damage falloff
                const distanceToTarget = Math.sqrt((hitEntity.x - this.x) ** 2 + (hitEntity.y - this.y) ** 2);
                // Linear interpolation: 2.25x at 0px to 0.75x at max range (1.5 range of multiplier)
                const damageMultiplier = 2.25 - (1.5 * (distanceToTarget / this.weaponRange));
                // Clamp between 0.75 and 2.25 to handle edge cases
                const clampedMultiplier = Math.max(0.75, Math.min(2.25, damageMultiplier));

                hitEntity.health -= this.ranged_base_damage * clampedMultiplier;
                if (hitEntity.mounted) {
                    hitEntity.mountedHitDebuffStacks++;
                    hitEntity.mountedDebuffTimers.push({type: 'hit', timer: 5});
                    hitEntity.updateVisualProperties();
                }
            }

            if (i === 0) {
                const angleToAttacker = Math.atan2(this.y - hitEntity.y, this.x - hitEntity.x);
                hitEntity.distress = Math.min(100, hitEntity.distress + 10);
                if (!hitEntity.isDying && !hitEntity.isPanicking) {
                    hitEntity.targetHeading = angleToAttacker;
                    hitEntity.isRotating = true;
                    hitEntity.lockedTarget = this;
                    hitEntity.targetLockTimer = 0;
                    hitEntity.hasManualTarget = true;
                }
            }
        }

        if (typeof showBulletRays !== 'undefined' && showBulletRays) {
            this.bulletRays.push({
                startX: this.x,
                startY: this.y,
                endX: endX,
                endY: endY,
                timer: 0,
                mode: 'scatter'
            });
        }
    }

    this.ranged_magazine_current = 0;
    this.shotsInBurst = shotsToFire;
    this.isReloading = true;
    this.reloadTimer = 0;
    this.shootCooldown = this.ranged_cooldown;

    setTimeout(() => { this.isShooting = false; }, 100);
}

raycastForHit(startX, startY, endX, endY, allEntities, extraThickness = 0) {
    // Get all enemy entities
    const enemies = allEntities.filter(e =>
        e.faction !== this.faction &&
        !e.isDying &&
        e.id !== this.id
        //Can shoot panicking enemies
    );

    if (enemies.length === 0) return null;

    // Check each enemy to see if ray intersects them
    const dx = endX - startX;
    const dy = endY - startY;
    const rayLength = Math.sqrt(dx * dx + dy * dy);

    let closestHit = null;
    let closestDistance = Infinity;

    for (const enemy of enemies) {
        // Calculate distance from enemy to ray line
        const toEnemyX = enemy.x - startX;
        const toEnemyY = enemy.y - startY;

        // Project enemy position onto ray
        const projection = (toEnemyX * dx + toEnemyY * dy) / (rayLength * rayLength);

        // Check if projection is along the ray (between 0 and 1)
        if (projection >= 0 && projection <= 1) {
            // Calculate closest point on ray to enemy
            const closestX = startX + projection * dx;
            const closestY = startY + projection * dy;

            // Calculate distance from enemy to closest point
            const distX = enemy.x - closestX;
            const distY = enemy.y - closestY;
            const distance = Math.sqrt(distX * distX + distY * distY);

            // Check if ray passes through enemy's radius (with extra thickness for scatter weapons)
            if (distance <= enemy.radius + 2 + extraThickness) {
                // Calculate distance along ray
                const distanceAlongRay = Math.sqrt(
                    (closestX - startX) ** 2 + (closestY - startY) ** 2
                );

                // Keep track of closest hit
                if (distanceAlongRay < closestDistance) {
                    closestDistance = distanceAlongRay;
                    closestHit = enemy;
                }
            }
        }
    }

    return closestHit;
}

countAlliesInLineOfFire(startX, startY, endX, endY, allEntities) {
    // Get all same-faction units (excluding self)
    const allies = allEntities.filter(e => 
        e.faction === this.faction && 
        !e.isDying && 
        e.id !== this.id
    );
    
    if (allies.length === 0) return 0;
    
    // Calculate line of fire
    const dx = endX - startX;
    const dy = endY - startY;
    const lineLength = Math.sqrt(dx * dx + dy * dy);
    
    let blockingCount = 0;
    const blockRadius = 5; // How close to line counts as blocking (slightly larger than unit radius)
    
    for (const ally of allies) {
        // Calculate distance from ally to line of fire
        const toAllyX = ally.x - startX;
        const toAllyY = ally.y - startY;
        
        // Project ally position onto firing line
        const projection = (toAllyX * dx + toAllyY * dy) / (lineLength * lineLength);
        
        // Check if projection is along the line (between shooter and target)
        if (projection > 0.1 && projection < 0.9) { // Ignore very close to shooter or target
            // Calculate closest point on line to ally
            const closestX = startX + projection * dx;
            const closestY = startY + projection * dy;
            
            // Calculate distance from ally to closest point
            const distX = ally.x - closestX;
            const distY = ally.y - closestY;
            const distance = Math.sqrt(distX * distX + distY * distY);
            
            // If ally is close to line of fire, they're blocking
            if (distance <= blockRadius) {
                blockingCount++;
            }
        }
    }
    
    return blockingCount;
}

startDying() {
    if (this.isDying) return; // Already dying
    
    this.isDying = true;
    this.deathTimer = 0;
    this.isMoving = false;
    this.isStationary = true;
    this.velocity = { x: 0, y: 0 };
    
    console.log(`Entity ${this.id} (${this.faction}) started dying at (${Math.floor(this.x)}, ${Math.floor(this.y)})`);
}

setDesiredHeading(angle) {
    if (angle !== null && angle !== undefined) {
        this.desiredHeading = angle;
    }
}

setFlowField(flowField) {
    this.flowField = flowField;
}

getViewAngle() {
    // Dynamic FOV based on stance
    if (this.stance === 'offensive') {
        return (90 * Math.PI) / 180; // 90° - narrow focus
    } else if (this.stance === 'defensive') {
        return (160 * Math.PI) / 180; // 160° - wide awareness
    } else {
        return (120 * Math.PI) / 180; // 120° - default balanced
    }
}

moveTo(x, y) {
    this.targetX = x;
    this.targetY = y;
    this.finalTargetX = x;
    this.finalTargetY = y;

    // Clear manual target on new movement order
    if (this.hasManualTarget) {
        console.log(`Entity ${this.id} received move order - clearing manual target`);
        this.hasManualTarget = false;
    }

    // Clear locked target and reset timer on move order (for 'none' stance)
    if (this.stance === 'none') {
        this.lockedTarget = null;
        this.targetLockTimer = 0;
    }

    // Disable AI control on manual movement order
    if (this.aiControlled) {
        this.aiControlled = false;
        this.aiTargetX = null;
        this.aiTargetY = null;
        this.aiTargetEnemies = [];
    }

    // Disable retreat on manual movement order
    if (this.isRetreating) {
        this.stopRetreat(allEntities); // Includes dispersion
    }

    const dx = x - this.x;
    const dy = y - this.y;
    this.targetHeading = Math.atan2(dy, dx);
    
    while (this.targetHeading < 0) this.targetHeading += 2 * Math.PI;
    while (this.targetHeading >= 2 * Math.PI) this.targetHeading -= 2 * Math.PI;
    
    this.isRotating = true;
    this.isMoving = true;
}

    

    select() {
        this.isSelected = true;
    }

    deselect() {
        this.isSelected = false;
    }

    isPointInside(worldX, worldY) {
        const dx = worldX - this.x;
        const dy = worldY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance <= 5;
    }

    draw(ctx, camera) {
        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;

        if (this.isSelected && !this.isDying) {
            ctx.save();
            ctx.translate(screenX, screenY);
            
            // Color based on combat state: red (normal), orange (shooting), yellow (reloading)
            let coneColor, strokeColor;
            if (this.isReloading) {
                coneColor = 'rgba(255, 255, 0, 0.15)'; // Yellow when reloading
                strokeColor = 'rgba(255, 255, 0, 0.5)';
            } else if (this.isShooting) {
                coneColor = 'rgba(255, 165, 0, 0.2)'; // Orange when shooting
                strokeColor = 'rgba(255, 165, 0, 0.6)';
            } else {
                coneColor = 'rgba(255, 0, 0, 0.1)'; // Red when normal
                strokeColor = 'rgba(255, 0, 0, 0.4)';
            }
            
            ctx.fillStyle = coneColor;
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(
                0, 0,
                this.weaponRange, // Use weaponRange instead of obstacleDetectionRange
                this.heading - this.weaponRangeAngle / 2,
                this.heading + this.weaponRangeAngle / 2
            );
            ctx.lineTo(0, 0);
            ctx.fill();
            ctx.stroke();
            
            ctx.restore();
        }

        // Calculate opacity for death animation
        let opacity = 1.0;
        if (this.isDying) {
            opacity = 1.0 - (this.deathTimer / this.deathDuration);
        }

        // Color based on faction and selection
        let outlineColor;
        if (this.isSelected && !this.isDying) {
            outlineColor = 'rgb(0, 255, 0)'; // Selected = green
        } else if (this.faction === 'red') {
            outlineColor = `rgba(255, 0, 0, ${opacity})`; // Enemy = red (fading)
        } else {
            outlineColor = `rgba(0, 0, 255, ${opacity})`; // Friendly = blue (fading)
        }

        // Draw unit shape based on mounted status
        if (this.mounted) {
            // Mounted units: triangle pointing in heading direction
            ctx.save();
            ctx.translate(screenX, screenY);
            ctx.rotate(this.heading);
            
            ctx.fillStyle = outlineColor;
            ctx.beginPath();
            ctx.moveTo(this.visualRadius, 0); // Point
            ctx.lineTo(-this.visualRadius, -this.visualRadius * 0.8); // Back left
            ctx.lineTo(-this.visualRadius, this.visualRadius * 0.8); // Back right
            ctx.closePath();
            ctx.fill();
            
            // Inner black triangle
            ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
            ctx.beginPath();
            ctx.moveTo(this.visualRadius * 0.5, 0);
            ctx.lineTo(-this.visualRadius * 0.5, -this.visualRadius * 0.4);
            ctx.lineTo(-this.visualRadius * 0.5, this.visualRadius * 0.4);
            ctx.closePath();
            ctx.fill();
            
            ctx.restore();
        } else {
            // Non-mounted units: circle (normal)
            ctx.fillStyle = outlineColor;
            ctx.beginPath();
            ctx.arc(screenX, screenY, this.visualRadius, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
            ctx.beginPath();
            ctx.arc(screenX, screenY, this.visualRadius * 0.5, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw distress circle if unit is distressed
        if (this.distress > 10 && !this.isDying) {
            const distressIntensity = this.distress / 100;
            ctx.strokeStyle = `rgba(255, 200, 0, ${distressIntensity * 0.6})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(screenX, screenY, 8, 0, Math.PI * 2);
            ctx.stroke();
        }
        
 // Draw panic indicator (flashing yellow circle - slows as distress decreases)
    if (this.isPanicking && !this.isDying) {
        const flashIntensity = (Math.sin(this.panicFlashTimer * Math.PI * 2) + 1) / 2; // 0 to 1
        
        ctx.strokeStyle = `rgba(255, 255, 0, ${flashIntensity * 0.8})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(screenX, screenY, 10, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    // Draw melee hit flash
    if (this.meleeHitFlashTimer > 0 && !this.isDying) {
        const flashProgress = this.meleeHitFlashTimer / 0.2; // 0 to 1
        const flashOpacity = flashProgress * 0.8; // Fade out
        
        ctx.fillStyle = `rgba(255, 255, 255, ${flashOpacity})`;
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.visualRadius * 1.3, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Draw cavalry charge impact
    if (this.chargeImpactTimer > 0) {
        const impactScreenX = this.chargeImpactX - camera.x;
        const impactScreenY = this.chargeImpactY - camera.y;
        const impactProgress = this.chargeImpactTimer / 0.2; // 0 to 1
        const impactOpacity = impactProgress * 0.9; // Fade out
        
        // Gold starburst effect
        ctx.strokeStyle = `rgba(255, 215, 0, ${impactOpacity})`;
        ctx.lineWidth = 3;
        
        // Draw radiating lines (8-pointed star)
        const impactRadius = (1 - impactProgress) * 20; // Expand outward
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(impactScreenX, impactScreenY);
            ctx.lineTo(
                impactScreenX + Math.cos(angle) * impactRadius,
                impactScreenY + Math.sin(angle) * impactRadius
            );
            ctx.stroke();
        }
        
        // Center flash
        ctx.fillStyle = `rgba(255, 215, 0, ${impactOpacity * 0.6})`;
        ctx.beginPath();
        ctx.arc(impactScreenX, impactScreenY, 8, 0, Math.PI * 2);
        ctx.fill();
    }

        if (this.isSelected && this.finalTargetX !== null && this.finalTargetY !== null && !this.isDying) {
            ctx.strokeStyle = 'rgb(255, 0, 0)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(screenX, screenY);
            ctx.lineTo(this.finalTargetX - camera.x, this.finalTargetY - camera.y);
            ctx.stroke();
        }

        // Draw line to locked target if selected (works even without V key)
        if (this.isSelected && this.lockedTarget && !this.lockedTarget.isDying && !this.isDying) {
            const targetScreenX = this.lockedTarget.x - camera.x;
            const targetScreenY = this.lockedTarget.y - camera.y;
            
            ctx.strokeStyle = this.faction === 'red' ? 'rgba(255, 0, 0, 0.6)' : 'rgba(255, 255, 0, 0.6)';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(screenX, screenY);
            ctx.lineTo(targetScreenX, targetScreenY);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        
        // Draw crew assignment line (magenta dashed) if crew member is selected
        if (this.isCrewMember && this.assignedCannonId !== null && this.isSelected && !this.isDying) {
            const cannon = cannonManager.cannons.find(c => c.id === this.assignedCannonId); //ASK CLAUDE
            if (cannon && !cannon.isDying) {
                const cannonScreenX = cannon.x - camera.x;
                const cannonScreenY = cannon.y - camera.y;

                ctx.strokeStyle = 'rgba(255, 0, 255, 0.6)'; // Magenta
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.moveTo(screenX, screenY);
                ctx.lineTo(cannonScreenX, cannonScreenY);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }

        // Draw melee engagement line (red dashed) if either unit selected
        if (this.isInMelee && this.meleeTarget && !this.meleeTarget.isDying && !this.isDying) {
            if (this.isSelected || this.meleeTarget.isSelected) {
                const targetScreenX = this.meleeTarget.x - camera.x;
                const targetScreenY = this.meleeTarget.y - camera.y;
                
                // Thicker line for pike reach-over attacks
                const isPikeReachOver = this.equipment.melee && this.equipment.melee.length >= 1.75;
                const lineWidth = isPikeReachOver ? 3 : 2;
                
                ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
                ctx.lineWidth = lineWidth;
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.moveTo(screenX, screenY);
                ctx.lineTo(targetScreenX, targetScreenY);
                ctx.stroke();
                ctx.setLineDash([]);
                
                // Draw pike indicator dot at midpoint
                if (isPikeReachOver) {
                    const midX = (screenX + targetScreenX) / 2;
                    const midY = (screenY + targetScreenY) / 2;
                    
                    ctx.fillStyle = 'rgba(255, 0, 0, 0.6)';
                    ctx.beginPath();
                    ctx.arc(midX, midY, 4, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        // MUZZLE FLASH - At shooter's position
        if (this.muzzleFlashTimer > 0 && !this.isDying) {
            const flashProgress = this.muzzleFlashTimer / 0.1; // 0 to 1
            const flashOpacity = flashProgress * 0.8; // Fade out
            
            // Yellow/white flash at shooter's position
            ctx.fillStyle = `rgba(255, 255, 200, ${flashOpacity})`;
            ctx.beginPath();
            ctx.arc(screenX, screenY, 6, 0, Math.PI * 2);
            ctx.fill();
            
            // Bright white center
            ctx.fillStyle = `rgba(255, 255, 255, ${flashOpacity})`;
            ctx.beginPath();
            ctx.arc(screenX, screenY, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // SMOKE PUFFS - Draw this entity's smoke trail
        for (const puff of this.smokePuffs) {
            const progress = puff.timer / puff.maxTimer; // 0 to 1
            const opacity = (1 - progress) * 0.4; // Fade out over time
            const radius = puff.initialRadius + progress * 8; // Expand as they age
            
            const puffScreenX = puff.x - camera.x;
            const puffScreenY = puff.y - camera.y;
            
            // Gray/white smoke color
            const grayValue = 150 + Math.floor(progress * 100); // Lighter as it ages
            ctx.fillStyle = `rgba(${grayValue}, ${grayValue}, ${grayValue}, ${opacity})`;
            ctx.beginPath();
            ctx.arc(puffScreenX, puffScreenY, radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    applyKnockback(forceX, forceY) {
        // Apply knockback force
        this.knockbackVelocity.x += forceX;
        this.knockbackVelocity.y += forceY;
        this.isKnockedBack = true;
        
        // Cancel current movement orders
        this.isMoving = false;
        this.targetX = null;
        this.targetY = null;
        this.velocity = { x: 0, y: 0 };
    }
}

class Group {
    static nextId = 0;

    constructor(name, entities, options = {}) {
        this.id = Group.nextId++;
        this.name = name;
        this.entityIds = entities.map(e => e.id);
        this.lastFormationId = 'none'; // Remember last formation used

        // Cannon crew group properties
        this.isCannonCrewGroup = options.isCannonCrewGroup ?? false;
        this.linkedCannonId = options.linkedCannonId ?? null;

        for (const entity of entities) {
            entity.groupId = this.id;
        }

        console.log(`Group created: ID=${this.id}, Name="${name}", Entities=[${this.entityIds.join(', ')}]${this.isCannonCrewGroup ? ' (Cannon Crew Group)' : ''}`);
    }

    addEntity(entity) {
        if (!this.entityIds.includes(entity.id)) {
            this.entityIds.push(entity.id);
            entity.groupId = this.id;
        }
    }

    removeEntity(entityId) {
        this.entityIds = this.entityIds.filter(id => id !== entityId);
    }

    getEntities(entityManager) {
        return this.entityIds.map(id => entityManager.getEntity(id)).filter(e => e !== undefined);
    }
    
    setLastFormation(formationId) {
        this.lastFormationId = formationId;
    }
    
    getLastFormation() {
        return this.lastFormationId;
    }
}

class EntityManager {
    constructor() {
        this.entities = [];
        this.selectedEntities = [];
        this.groups = [];
        this.corpses = [];
       
        //Flow Field Cache
        this.flowFieldCache = new Map();
        this.currentFlowField = null;
        this.maxCacheSize = 10;
       
        // Formation preview
        this.formationPreview = {
            active: false,
            formation: null,
            x: 0,
            y: 0,
            rotation: 0,
            scale: 1.0,
            minScale: 1.0,
            maxScale: 10.0,
            isValid: true
        };
    }

    addEntity(x, y, equipment, faction = 'blue') {
        const entity = new Entity(x, y, equipment, faction);
        this.entities.push(entity);
        return entity;
    }

    getEntity(id) {
        return this.entities.find(e => e.id === id);
    }

    getAllEntities() {
        return this.entities;
    }

updateAll(deltaTime) {
    // Update all entities
    for (const entity of this.entities) {
        entity.update(deltaTime, this.entities);
        
        // Check if entity should start dying
        if (entity.health <= 0 && !entity.isDying) {
            entity.startDying();
            
            // Propagate distress to nearby same-faction units
            this.propagateDistress(entity);
        }
        
        // Update death timer for dying entities
        if (entity.isDying) {
            entity.deathTimer += deltaTime;
        }
    }
    
    // Remove entities that finished dying
    const finishedDying = this.entities.filter(e => e.isDying && e.deathTimer >= e.deathDuration);
    
    for (const deadEntity of finishedDying) {
        console.log(`Entity ${deadEntity.id} finished dying animation - removing`);
        
        // Store corpse in array (old way - draw every frame)
        this.corpses.push({
            x: deadEntity.x,
            y: deadEntity.y,
            faction: deadEntity.faction,
            timer: 0,
            fadeDelay: 10, // Wait 10 seconds before fading
            fadeDuration: 10 // Fade out over 10 seconds
        });
        
        // Remove from selection if selected
        if (deadEntity.isSelected) {
            const index = this.selectedEntities.indexOf(deadEntity);
            if (index > -1) {
                this.selectedEntities.splice(index, 1);
            }
        }
        
        // Remove from group if in one
        if (deadEntity.groupId !== null) {
            const group = this.groups.find(g => g.id === deadEntity.groupId);
            if (group) {
                group.removeEntity(deadEntity.id);
                console.log(`Entity ${deadEntity.id} removed from group ${group.id}`);
            }
        }

        // Remove from cannon crew if assigned
        if (deadEntity.isCrewMember && deadEntity.assignedCannonId !== null) {
            const cannon = cannonManager.cannons.find(c => c.id === deadEntity.assignedCannonId); //ASK CLAUDE
            if (cannon) {
                cannon.crewIds = cannon.crewIds.filter(id => id !== deadEntity.id);
                console.log(`Entity ${deadEntity.id} removed from cannon ${cannon.id} crew (died)`);

                // If cannon was reloading, RESET reload cycle
                if (cannon.isReloading) {
                    console.log(`Cannon ${cannon.id}: Reload reset due to crew death`);
                    cannon.reloadTimer = 0; // Start over from 0

                    // Recalculate duration with new crew count
                    if (cannon.crewIds.length > 0) {
                        cannon.reloadDuration = cannon.calculateReloadTime();
                    } else {
                        // Last crew member died - freeze reload
                        cannon.reloadDuration = Infinity;
                        cannon.noCrewLogged = false; // Will log "NO CREW" next frame
                    }
                }

                // Sync cannon crew group membership
                this.syncCannonCrewGroup(cannon);
                if (typeof updateGroupTabs === 'function') updateGroupTabs();
            }
        }

        // Remove from entities array
        this.entities = this.entities.filter(e => e.id !== deadEntity.id);
    }
    
    // Clean up groups with no living members (except cannon crew groups which are managed by the cannon)
    const deadGroups = this.groups.filter(g => {
        // Skip cannon crew groups - they are managed by cannon lifecycle
        if (g.isCannonCrewGroup) return false;

        const members = g.getEntities(this);
        const livingMembers = members.filter(e => !e.isDying && e.health > 0);
        return livingMembers.length === 0;
    });

    for (const deadGroup of deadGroups) {
        console.log(`Group "${deadGroup.name}" disbanded (no living members)`);
        this.groups = this.groups.filter(g => g.id !== deadGroup.id);
    }
}

updateCorpses(deltaTime) {
        // Update corpse timers and remove faded ones
        for (let i = this.corpses.length - 1; i >= 0; i--) {
            this.corpses[i].timer += deltaTime;
            
            // Remove if fully faded (after delay + fade duration)
            const totalLifetime = this.corpses[i].fadeDelay + this.corpses[i].fadeDuration;
            if (this.corpses[i].timer >= totalLifetime) {
                this.corpses.splice(i, 1);
            }
        }
    }

propagateDistress(deadEntity) {
    const distressRadius = 50; // Units within 50px get distressed
    const distressAmount = 15;
    
    console.log(`Propagating distress from entity ${deadEntity.id} death...`);
    
    for (const entity of this.entities) {
        // Skip the dying entity itself
        if (entity.id === deadEntity.id) continue;
        
        // Only affect same faction
        if (entity.faction !== deadEntity.faction) continue;
        
        // Check distance
        const dx = entity.x - deadEntity.x;
        const dy = entity.y - deadEntity.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= distressRadius) {
            entity.distress = Math.min(100, entity.distress + distressAmount);
            console.log(`Entity ${entity.id} distress increased to ${entity.distress.toFixed(1)}`);
        }
    }
}

    selectEntity(entity, addToSelection = false) {
        console.log(`selectEntity called: entity.id=${entity.id}, addToSelection=${addToSelection}, groupId=${entity.groupId}`);

        if (!addToSelection) {
            for (const e of this.selectedEntities) {
                e.deselect();
            }
            this.selectedEntities = [];
        }

        // Select only the individual entity (group selection happens via Tab key)
        if (!this.selectedEntities.includes(entity)) {
            entity.select();
            this.selectedEntities.push(entity);
        }

        console.log(`Selected entities count: ${this.selectedEntities.length}`);
    }

    selectEntities(entities, addToSelection = false) {
        if (!addToSelection) {
            for (const e of this.selectedEntities) {
                e.deselect();
            }
            this.selectedEntities = [];
        }

        for (const entity of entities) {
            if (!this.selectedEntities.includes(entity)) {
                entity.select();
                this.selectedEntities.push(entity);
            }
        }
    }

    deselectAll() {
        for (const e of this.selectedEntities) {
            e.deselect();
        }
        this.selectedEntities = [];
    }

    getEntityAtPosition(worldX, worldY) {
        for (let i = this.entities.length - 1; i >= 0; i--) {
            if (this.entities[i].isPointInside(worldX, worldY)) {
                return this.entities[i];
            }
        }
        return null;
    }

    getEntitiesInRect(x1, y1, x2, y2) {
        const minX = Math.min(x1, x2);
        const maxX = Math.max(x1, x2);
        const minY = Math.min(y1, y2);
        const maxY = Math.max(y1, y2);

        return this.entities.filter(e => 
            e.x >= minX && e.x <= maxX && e.y >= minY && e.y <= maxY
        );
    }

    moveSelectedEntities(x, y) {
    // Filter out crew members - they cannot receive movement orders
    const movableEntities = this.selectedEntities.filter(e => !e.isCrewMember);

    // Check if cannon is selected and can move
    let selectedCannon = null;
    if (typeof cannonManager !== 'undefined') { //ASK CLAUDE
        selectedCannon = cannonManager.getSelectedCannon();
        if (selectedCannon && (selectedCannon.faction === 'none' || selectedCannon.crewIds.length === 0)) {
            selectedCannon = null; // Can't move: no faction or no crew
        }
    }

    // Return early only if BOTH no movable entities AND no movable cannon
    if (movableEntities.length === 0 && !selectedCannon) return;

    // Check if we're using a formation
    if (this.formationPreview.active && this.formationPreview.formation) {
        this.moveEntitiesInFormation(x, y);
        return;
    }

    // Create flow field for pathfinding
    // Cache key: grid-quantized position (groups nearby destinations)
    const gridSize = 50; // 50px grid for caching
    const cacheKey = `${Math.floor(x / gridSize)}_${Math.floor(y / gridSize)}`;
    
    // Check cache first
    let flowField = this.flowFieldCache.get(cacheKey);
    
    if (!flowField) {
        console.log(`Creating new flow field for destination (${x}, ${y})...`);
        const startTime = performance.now();
        
        // Create new flow field
        flowField = new FlowField(x, y, MAP_WIDTH, MAP_HEIGHT);
        
        const calcTime = performance.now() - startTime;
        console.log(`Flow field calculated in ${calcTime.toFixed(2)}ms`);
        
        // Add to cache
        this.flowFieldCache.set(cacheKey, flowField);
        
        // Limit cache size (FIFO eviction)
        if (this.flowFieldCache.size > this.maxCacheSize) {
            const firstKey = this.flowFieldCache.keys().next().value;
            this.flowFieldCache.delete(firstKey);
            console.log(`Cache full - evicted oldest flow field (${firstKey})`);
        }
    } else {
        console.log(`Using cached flow field for (${x}, ${y})`);
    }
    
    this.currentFlowField = flowField;

    // Assign flow field to all movable units (not crew)
    for (const entity of movableEntities) {
        entity.setFlowField(flowField);
    }

    // Move units to their positions
    if (movableEntities.length === 1) {
        movableEntities[0].moveTo(x, y);
    } else if (movableEntities.length > 1) {
        // No formation - use randomized grid movement
        const spacing = 12;
        const numEntities = movableEntities.length;
        const cols = Math.ceil(Math.sqrt(numEntities));

        for (let i = 0; i < numEntities; i++) {
            const row = Math.floor(i / cols);
            const col = i % cols;

            // Add random offset to make it less orderly
            const randomOffsetX = (Math.random() - 0.5) * spacing * 0.6;
            const randomOffsetY = (Math.random() - 0.5) * spacing * 0.6;

            const offsetX = (col - (cols - 1) / 2) * spacing + randomOffsetX;
            const offsetY = (row - Math.floor(numEntities / cols) / 2) * spacing + randomOffsetY;

            movableEntities[i].moveTo(x + offsetX, y + offsetY);
        }
    }

    // Move selected cannon (using the selectedCannon we determined earlier)
    if (selectedCannon) {
        selectedCannon.setFlowField(flowField);
        selectedCannon.moveTo(x, y);
    }
}

moveEntitiesInFormation(centerX, centerY) {
    const formation = this.formationPreview.formation;
    const rotation = this.formationPreview.rotation;
    const scale = this.formationPreview.scale;

    // Filter out crew members - they cannot participate in formations
    const movableEntities = this.selectedEntities.filter(e => !e.isCrewMember);

    // Check if cannon is selected and can move
    let selectedCannon = null; //ASK CLAUDE
    if (typeof cannonManager !== 'undefined') {
        selectedCannon = cannonManager.getSelectedCannon();
        if (selectedCannon && (selectedCannon.faction === 'none' || selectedCannon.crewIds.length === 0)) {
            selectedCannon = null;
        }
    }

    // Return early only if BOTH no movable entities AND no movable cannon
    if (movableEntities.length === 0 && !selectedCannon) return;

    // CREATE FLOW FIELD FOR FORMATION MOVEMENT - ADD THIS BLOCK
    const gridSize = 50;
    const cacheKey = `${Math.floor(centerX / gridSize)}_${Math.floor(centerY / gridSize)}`;
    
    let flowField = this.flowFieldCache.get(cacheKey);
    
    if (!flowField) {
        console.log(`Creating flow field for formation at (${centerX}, ${centerY})...`);
        const startTime = performance.now();
        flowField = new FlowField(centerX, centerY, MAP_WIDTH, MAP_HEIGHT);
        const calcTime = performance.now() - startTime;
        console.log(`Flow field calculated in ${calcTime.toFixed(2)}ms`);
        
        this.flowFieldCache.set(cacheKey, flowField);
        
        if (this.flowFieldCache.size > this.maxCacheSize) {
            const firstKey = this.flowFieldCache.keys().next().value;
            this.flowFieldCache.delete(firstKey);
        }
    }
    
    this.currentFlowField = flowField;
    // END OF NEW BLOCK
    
    // Get unit positions within the formation
    const positions = this.calculateFormationPositions(formation);

    // Assign each unit to a position (using movableEntities, not selectedEntities)
    for (let i = 0; i < movableEntities.length && i < positions.length; i++) {
        const entity = movableEntities[i];
        const localPos = positions[i];

        // Apply rotation
        const rotatedX = localPos.x * Math.cos(rotation) - localPos.y * Math.sin(rotation);
        const rotatedY = localPos.x * Math.sin(rotation) + localPos.y * Math.cos(rotation);

        // Apply scale
        const scaledX = rotatedX * scale;
        const scaledY = rotatedY * scale;

        // Apply position offset
        const worldX = centerX + scaledX;
        const worldY = centerY + scaledY;

        // ASSIGN FLOW FIELD - ADD THIS LINE
        entity.setFlowField(flowField);

        // Move entity to position
        entity.moveTo(worldX, worldY);

        // Calculate facing direction based on nearest selected edge
        if (formation.selectedEdges && formation.selectedEdges.length > 0) {
            const facingAngle = this.calculateFacingAngle(localPos, formation, rotation);
            entity.setDesiredHeading(facingAngle);
        }
    }

    if (movableEntities.length > 0) {
        console.log(`${movableEntities.length} units moving in formation to (${centerX}, ${centerY})`);
    }

    // Move selected cannon (using the selectedCannon we determined earlier)
    if (selectedCannon) {
        selectedCannon.setFlowField(flowField);
        selectedCannon.moveTo(centerX, centerY);
    }
}

calculateFacingAngle(position, formation, formationRotation) {
    // Find the nearest selected edge
    const selectedEdges = formation.selectedEdges || [];
    if (selectedEdges.length === 0) return null;
    
    const corners = formation.corners.map(c => ({
        x: c.x - 230,
        y: c.y - 230
    }));
    
    let nearestEdge = null;
    let minDistance = Infinity;
    
    for (const edgeIndex of selectedEdges) {
        const start = corners[edgeIndex];
        const end = corners[(edgeIndex + 1) % corners.length];
        
        // Calculate distance from position to edge
        const dist = this.pointToLineSegmentDistance(position, start, end);
        
        if (dist < minDistance) {
            minDistance = dist;
            nearestEdge = { start, end };
        }
    }
    
    if (!nearestEdge) return null;
    
    // Calculate perpendicular direction pointing toward the edge
    const edgeVectorX = nearestEdge.end.x - nearestEdge.start.x;
    const edgeVectorY = nearestEdge.end.y - nearestEdge.start.y;
    
    // Perpendicular vector (rotate 90 degrees)
    const perpX = -edgeVectorY;
    const perpY = edgeVectorX;
    
    // Direction from position to edge midpoint
    const edgeMidX = (nearestEdge.start.x + nearestEdge.end.x) / 2;
    const edgeMidY = (nearestEdge.start.y + nearestEdge.end.y) / 2;
    const toEdgeX = edgeMidX - position.x;
    const toEdgeY = edgeMidY - position.y;
    
    // Determine which perpendicular direction points toward the edge
    const dot = perpX * toEdgeX + perpY * toEdgeY;
    const dirX = dot > 0 ? perpX : -perpX;
    const dirY = dot > 0 ? perpY : -perpY;
    
    // Calculate angle and apply formation rotation
    const angle = Math.atan2(dirY, dirX) + formationRotation;
    
    return angle;
}

pointToLineSegmentDistance(point, lineStart, lineEnd) {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    if (length === 0) return Math.sqrt((point.x - lineStart.x) ** 2 + (point.y - lineStart.y) ** 2);
    
    // Calculate projection parameter
    const t = Math.max(0, Math.min(1, 
        ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (length * length)
    ));
    
    const projX = lineStart.x + t * dx;
    const projY = lineStart.y + t * dy;
    
    return Math.sqrt((point.x - projX) ** 2 + (point.y - projY) ** 2);
}

    createGroup(name) {
    if (this.selectedEntities.length < 2) {
        console.log('Need at least 2 entities to create a group');
        return null;
    }

    // Prevent creating groups with enemy units
    const hasEnemies = this.selectedEntities.some(e => e.faction === 'red');
    if (hasEnemies) {
        console.log('Cannot create groups containing enemy units');
        return null;
    }

    const group = new Group(name, this.selectedEntities);
    this.groups.push(group);
    console.log(`Group "${name}" created with ${this.selectedEntities.length} entities. Group ID: ${group.id}`);
    return group;
}

    disbandGroup(groupId) {
    const group = this.groups.find(g => g.id === groupId);
    if (!group) {
        console.log(`Group ${groupId} not found`);
        return;
    }

    // Cannon crew groups cannot be manually disbanded
    if (group.isCannonCrewGroup) {
        console.log(`Cannot disband cannon crew group "${group.name}" manually`);
        return;
    }

    const entities = group.getEntities(this);

    // Check if this is an enemy group (check first entity's faction)
    const isEnemyGroup = entities.length > 0 && entities[0].faction === 'red';

    if (isEnemyGroup) {
        // Enemy group - kill all units
        console.log(`Enemy group "${group.name}" disbanded - killing all units`);
        for (const entity of entities) {
            entity.health = 0; // Will be removed in next updateAll()
        }
    } else {
        // Friendly group - just remove group membership
        console.log(`Friendly group "${group.name}" disbanded - units survive`);
        for (const entity of entities) {
            entity.groupId = null;
        }
    }

    // Remove group from list
    this.groups = this.groups.filter(g => g.id !== groupId);
}

    selectGroup(groupId) {
        console.log(`selectGroup called with groupId=${groupId}`);
        console.log(`Available groups:`, this.groups.map(g => ({ id: g.id, name: g.name })));

        const group = this.groups.find(g => g.id === groupId);
        if (!group) {
            console.log(`Group ${groupId} not found!`);
            return;
        }

        console.log(`Found group: ${group.name}`);
        this.deselectAll();

        // For cannon crew groups, also select the cannon
        if (group.isCannonCrewGroup && typeof cannonManager !== 'undefined') { //ASK CLAUDE
            const cannon = cannonManager.cannons.find(c => c.id === group.linkedCannonId);
            if (cannon) {
                cannonManager.selectCannon(cannon);
            }
        } else {
            // Deselect cannon for normal groups
            if (typeof cannonManager !== 'undefined') { //ASK CLAUDE
                cannonManager.deselectCannon();
            }
        }

        const entities = group.getEntities(this);
        console.log(`Group has ${entities.length} entities`);
        this.selectEntities(entities, false);
    }

    createCannonCrewGroup(cannon) {
        const name = `Cannon #${cannon.id}`;
        const group = new Group(name, [], {
            isCannonCrewGroup: true,
            linkedCannonId: cannon.id
        });
        this.groups.push(group);
        cannon.crewGroupId = group.id;
        console.log(`Cannon crew group "${name}" created for cannon ${cannon.id}`);
        return group;
    }

    syncCannonCrewGroup(cannon) {
        if (cannon.crewGroupId === null) return;

        const group = this.groups.find(g => g.id === cannon.crewGroupId);
        if (!group) return;

        // Sync entityIds with cannon's crewIds
        group.entityIds = [...cannon.crewIds];

        // Update groupId on all crew members
        for (const crewId of cannon.crewIds) {
            const entity = this.getEntity(crewId);
            if (entity) entity.groupId = group.id;
        }
    }

    dissolveCannonCrewGroup(cannon) {
        if (cannon.crewGroupId === null) return;

        // Remove group from list
        this.groups = this.groups.filter(g => g.id !== cannon.crewGroupId);
        console.log(`Cannon crew group dissolved for cannon ${cannon.id}`);
        cannon.crewGroupId = null;
    }

drawAll(ctx, camera) {
    // Draw corpses first (under everything)
    for (const corpse of this.corpses) {
        const screenX = corpse.x - camera.x;
        const screenY = corpse.y - camera.y;
        
        // Calculate opacity based on timer
        let opacity = 1.0;
        if (corpse.timer > corpse.fadeDelay) {
            // Start fading after delay
            const fadeProgress = (corpse.timer - corpse.fadeDelay) / corpse.fadeDuration;
            opacity = 1.0 - fadeProgress;
        }
        
        // Dark grey corpse marker
        ctx.fillStyle = `rgba(60, 60, 60, ${0.6 * opacity})`;
        ctx.beginPath();
        ctx.arc(screenX, screenY, 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = `rgba(40, 40, 40, ${0.8 * opacity})`;
        ctx.beginPath();
        ctx.arc(screenX, screenY, 1, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Draw distress propagation circles (expanding grey circles)
    for (const entity of this.entities) {
        if (entity.isDying && entity.deathTimer < 0.5) {
            const screenX = entity.x - camera.x;
            const screenY = entity.y - camera.y;
            
            // Expanding circle
            const progress = entity.deathTimer / 0.5; // 0 to 1 over 0.5 seconds
            const radius = progress * 50; // Expands to distress radius
            const opacity = 1.0 - progress; // Fades out
            
            ctx.strokeStyle = `rgba(180, 180, 180, ${opacity * 0.5})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
    
    // Draw FOVs if enabled (V key)
    if (showFOVs) {
        for (const entity of this.entities) {
            if (entity.isDying || entity.isPanicking) continue;
            
            const screenX = entity.x - camera.x;
            const screenY = entity.y - camera.y;
            
            // Color based on faction and stance
            let fovColor;
            if (entity.faction === 'red') {
                fovColor = 'rgba(255, 0, 0, 0.15)';
            } else if (entity.stance === 'defensive') {
                fovColor = 'rgba(0, 0, 255, 0.15)';
            } else if (entity.stance === 'offensive') {
                fovColor = 'rgba(255, 200, 0, 0.15)';
            } else {
                fovColor = 'rgba(0, 255, 0, 0.15)';
            }
            
            // Draw infinite FOV cone (reaches edge of screen)
            const fovLength = 2000; // Very long range
            
            ctx.save();
            ctx.translate(screenX, screenY);
            ctx.rotate(entity.heading);
            
            ctx.fillStyle = fovColor;
            ctx.strokeStyle = fovColor.replace('0.15', '0.4');
            ctx.lineWidth = 1;
            
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, fovLength, -entity.getViewAngle() / 2, entity.getViewAngle() / 2);
            ctx.lineTo(0, 0);
            ctx.fill();
            ctx.stroke();
            
            ctx.restore();
            
            // Draw line to locked target if any
            if (entity.lockedTarget && !entity.lockedTarget.isDying) {
                const targetScreenX = entity.lockedTarget.x - camera.x;
                const targetScreenY = entity.lockedTarget.y - camera.y;
                
                ctx.strokeStyle = entity.faction === 'red' ? 'rgba(255, 0, 0, 0.6)' : 'rgba(255, 255, 0, 0.6)';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.moveTo(screenX, screenY);
                ctx.lineTo(targetScreenX, targetScreenY);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }
    }

    // Draw entities
    for (const entity of this.entities) {
        entity.draw(ctx, camera);
    }
}

    setFormationPreview(formation) {
    if (!formation || formation === 'none') {
        this.formationPreview.active = false;
        this.formationPreview.formation = null;
        return;
    }
    
    this.formationPreview.active = true;
    this.formationPreview.formation = formation;
    this.formationPreview.rotation = 0;
    
    // Calculate min scale based on number of selected units
    const numUnits = this.selectedEntities.length;
    this.formationPreview.minScale = Math.max(0.05, Math.sqrt(numUnits) * 0.05); // Halved from 0.2 and 0.1
    this.formationPreview.maxScale = this.formationPreview.minScale * 5;
    this.formationPreview.scale = this.formationPreview.minScale * 2;
    
    console.log(`Formation preview set. Min scale: ${this.formationPreview.minScale.toFixed(2)}, Max scale: ${this.formationPreview.maxScale.toFixed(2)}`);
}
    
    updateFormationPreviewPosition(x, y) {
        if (this.formationPreview.active) {
            this.formationPreview.x = x;
            this.formationPreview.y = y;
            this.formationPreview.isValid = this.isFormationPlacementValid(); //Validate placement
        }
    }
    
    rotateFormationPreview(deltaAngle) {
        if (this.formationPreview.active) {
            this.formationPreview.rotation += deltaAngle;
            // Normalize to 0-2Ï€
            while (this.formationPreview.rotation < 0) this.formationPreview.rotation += Math.PI * 2;
            while (this.formationPreview.rotation >= Math.PI * 2) this.formationPreview.rotation -= Math.PI * 2;
        }
    }
    
    scaleFormationPreview(deltaScale) {
        if (this.formationPreview.active) {
            this.formationPreview.scale += deltaScale;
            this.formationPreview.scale = Math.max(
                this.formationPreview.minScale,
                Math.min(this.formationPreview.maxScale, this.formationPreview.scale)
            );
        }
    }
    
    drawFormationPreview(ctx, camera) {
    if (!this.formationPreview.active || !this.formationPreview.formation) return;
    
    const formation = this.formationPreview.formation;
    const screenX = this.formationPreview.x - camera.x;
    const screenY = this.formationPreview.y - camera.y;
    const isValid = this.formationPreview.isValid;
    
    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.rotate(this.formationPreview.rotation);
    ctx.scale(this.formationPreview.scale, this.formationPreview.scale);
    
    // CHANGE COLORS BASED ON VALIDITY
    if (isValid) {
        // Valid placement - blue
        ctx.strokeStyle = 'rgba(0, 100, 255, 0.6)';
        ctx.fillStyle = 'rgba(0, 100, 255, 0.1)';
    } else {
        // Invalid placement - grayscale
        ctx.strokeStyle = 'rgba(128, 128, 128, 0.6)';
        ctx.fillStyle = 'rgba(128, 128, 128, 0.1)';
    }
    ctx.lineWidth = 3 / this.formationPreview.scale;
    
    // Draw edges
    ctx.beginPath();
    ctx.moveTo(formation.corners[0].x - 230, formation.corners[0].y - 230);
    for (let i = 1; i < formation.corners.length; i++) {
        ctx.lineTo(formation.corners[i].x - 230, formation.corners[i].y - 230);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
    
    // Draw selected edges - gray if invalid, yellow if valid
    if (formation.selectedEdges && formation.selectedEdges.length > 0) {
        ctx.strokeStyle = isValid ? 'rgba(255, 255, 0, 0.8)' : 'rgba(128, 128, 128, 0.8)';
        ctx.lineWidth = 4 / this.formationPreview.scale;
        
        for (const edgeIndex of formation.selectedEdges) {
            const start = formation.corners[edgeIndex];
            const end = formation.corners[(edgeIndex + 1) % formation.corners.length];
            
            ctx.beginPath();
            ctx.moveTo(start.x - 230, start.y - 230);
            ctx.lineTo(end.x - 230, end.y - 230);
            ctx.stroke();
        }
    }
    
    // Draw unit positions - gray if invalid, blue if valid
    const unitPositions = this.calculateFormationPositions(formation);
    ctx.fillStyle = isValid ? 'rgba(0, 150, 255, 0.5)' : 'rgba(128, 128, 128, 0.5)';
    const dotRadius = 3 / this.formationPreview.scale;
    
    for (const pos of unitPositions) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, dotRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw outline
        ctx.strokeStyle = isValid ? 'rgba(0, 100, 255, 0.8)' : 'rgba(128, 128, 128, 0.8)';
        ctx.lineWidth = 2 / this.formationPreview.scale;
        ctx.stroke();
    }
    
    ctx.restore();
}

    // Check if formation placement is valid (no units on walls)
isFormationPlacementValid() {
    if (!this.formationPreview.active || !this.formationPreview.formation) {
        return true;
    }
    
    const formation = this.formationPreview.formation;
    const unitPositions = this.calculateFormationPositions(formation);
    const rotation = this.formationPreview.rotation;
    const scale = this.formationPreview.scale;
    const centerX = this.formationPreview.x;
    const centerY = this.formationPreview.y;
    
    // Check each unit position
    for (const localPos of unitPositions) {
        // Apply rotation
        const rotatedX = localPos.x * Math.cos(rotation) - localPos.y * Math.sin(rotation);
        const rotatedY = localPos.x * Math.sin(rotation) + localPos.y * Math.cos(rotation);
        
        // Apply scale
        const scaledX = rotatedX * scale;
        const scaledY = rotatedY * scale;
        
        // Get world position
        const worldX = centerX + scaledX;
        const worldY = centerY + scaledY;
        
        // Check terrain at this position
        const terrainType = TerrainManager.getTerrainType(worldX, worldY);
        
        if (terrainType === 'wall' || terrainType === 'water') {
            return false; // Invalid placement
        }
    }
    
    return true; // All positions are valid
}
    
calculateFormationPositions(formation) {
    const numUnits = this.selectedEntities.length;
    const positions = [];
    
    if (numUnits === 0 || !formation.corners || formation.corners.length < 3) {
        return positions;
    }
    
    // Calculate formation center (offset from canvas center)
    const corners = formation.corners.map(c => ({
        x: c.x - 230,
        y: c.y - 230
    }));
    
    // Use Poisson disc sampling for better distribution
    // First, get bounding box
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    for (const corner of corners) {
        minX = Math.min(minX, corner.x);
        minY = Math.min(minY, corner.y);
        maxX = Math.max(maxX, corner.x);
        maxY = Math.max(maxY, corner.y);
    }
    
    const width = maxX - minX;
    const height = maxY - minY;
    const area = this.calculatePolygonArea(corners);
    
    // Calculate minimum spacing based on area and unit count
    const targetSpacing = Math.sqrt(area / numUnits) * 0.8;
    
    // Generate candidate points with better distribution
    const candidates = [];
    const gridResolution = Math.max(width, height) / 50; // Finer grid
    
    for (let x = minX; x <= maxX; x += gridResolution) {
        for (let y = minY; y <= maxY; y += gridResolution) {
            if (this.isPointInPolygon({x, y}, corners)) {
                candidates.push({x, y});
            }
        }
    }
    
    // If we have enough candidates, select evenly distributed ones
    if (candidates.length >= numUnits) {
        // Use greedy farthest-point sampling for even distribution
        positions.push(candidates[Math.floor(candidates.length / 2)]); // Start with center-ish point
        
        while (positions.length < numUnits && candidates.length > 0) {
            let farthestPoint = null;
            let maxMinDistance = -Infinity;
            
            for (const candidate of candidates) {
                // Find minimum distance to any already selected point
                let minDist = Infinity;
                for (const pos of positions) {
                    const dist = Math.sqrt((candidate.x - pos.x) ** 2 + (candidate.y - pos.y) ** 2);
                    minDist = Math.min(minDist, dist);
                }
                
                // Keep track of candidate with maximum minimum distance
                if (minDist > maxMinDistance) {
                    maxMinDistance = minDist;
                    farthestPoint = candidate;
                }
            }
            
            if (farthestPoint) {
                positions.push(farthestPoint);
                // Remove nearby candidates to speed up next iteration
                const index = candidates.indexOf(farthestPoint);
                if (index > -1) candidates.splice(index, 1);
            } else {
                break;
            }
        }
    } else {
        // Not enough interior points, distribute on perimeter
        positions.push(...candidates);
        
        const remainingUnits = numUnits - positions.length;
        if (remainingUnits > 0) {
            // Calculate perimeter length
            let perimeterLength = 0;
            for (let i = 0; i < corners.length; i++) {
                const start = corners[i];
                const end = corners[(i + 1) % corners.length];
                perimeterLength += Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2);
            }
            
            // Distribute evenly along perimeter
            const spacing = perimeterLength / remainingUnits;
            let currentDistance = 0;
            
            for (let i = 0; i < remainingUnits; i++) {
                const targetDistance = i * spacing;
                let accumulatedDistance = 0;
                
                for (let edgeIndex = 0; edgeIndex < corners.length; edgeIndex++) {
                    const start = corners[edgeIndex];
                    const end = corners[(edgeIndex + 1) % corners.length];
                    const edgeLength = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2);
                    
                    if (accumulatedDistance + edgeLength >= targetDistance) {
                        const t = (targetDistance - accumulatedDistance) / edgeLength;
                        positions.push({
                            x: start.x + (end.x - start.x) * t,
                            y: start.y + (end.y - start.y) * t
                        });
                        break;
                    }
                    
                    accumulatedDistance += edgeLength;
                }
            }
        }
    }
    
    return positions.slice(0, numUnits);
}

calculatePolygonArea(corners) {
    let area = 0;
    for (let i = 0; i < corners.length; i++) {
        const j = (i + 1) % corners.length;
        area += corners[i].x * corners[j].y;
        area -= corners[j].x * corners[i].y;
    }
    return Math.abs(area / 2);
}
    
    isPointInPolygon(point, polygon) {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].x, yi = polygon[i].y;
            const xj = polygon[j].x, yj = polygon[j].y;
            
            const intersect = ((yi > point.y) !== (yj > point.y))
                && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }
}

const entityManager = new EntityManager();