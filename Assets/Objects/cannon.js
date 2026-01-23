// Cannon - Stationary artillery piece (supports light and heavy variants)

class Cannon {
    static nextId = 0;

    // Type configurations for different cannon variants
    static TYPES = {
        light: {
            weaponRange: 750,
            reloadingBaseTime: 10,
            explosionSize: 1,
            speedDivisor: 2,
            knockbackDistance: 5,
            deathExplosionSize: 0.5,
            shellType: 'cannon_shell',
            skipFriendlyFireCheck: false,
            accuracyMultiplier: 1.0,
            // Visual dimensions
            squareSize: 8,
            carriageWidth: 8,
            carriageHeight: 6,
            barrelThickness: 3,
            barrelExtendLeft: 2,
            barrelExtendRight: 6
        },
        heavy: {
            weaponRange: 1000,
            reloadingBaseTime: 20,
            explosionSize: 2,
            speedDivisor: 2.75,
            knockbackDistance: 7,
            deathExplosionSize: 0.75,
            shellType: 'cannon_shell',
            skipFriendlyFireCheck: false,
            accuracyMultiplier: 1.0,
            // Visual dimensions
            squareSize: 8,
            carriageWidth: 12,
            carriageHeight: 6,
            barrelThickness: 4,
            barrelExtendLeft: 4,
            barrelExtendRight: 6
        },
        mortar: {
            weaponRange: 750,
            reloadingBaseTime: 10,
            explosionSize: 1,
            speedDivisor: 2,
            knockbackDistance: 5,
            deathExplosionSize: 0.5,
            shellType: 'mortar_shell',
            skipFriendlyFireCheck: true, // Mortar shells arc over allies
            accuracyMultiplier: 3.0, // 3x less accurate than cannons (indirect fire)
            // Visual dimensions (same as light, but shorter barrel)
            squareSize: 8,
            carriageWidth: 8,
            carriageHeight: 6,
            barrelThickness: 4,
            barrelExtendLeft: 0,
            barrelExtendRight: 3
        }
    };

    constructor(x, y, faction = 'none', type = 'light') {
        this.id = Cannon.nextId++;
        this.x = x;
        this.y = y;
        this.type = type;

        // Get configuration for this cannon type
        const config = Cannon.TYPES[type] || Cannon.TYPES.light;

        // Faction: 'none', 'blue', or 'red'
        this.faction = faction;

        // Visual properties
        this.radius = 4;
        this.barrelLength = 7;
        this.heading = 0; // Direction the cannon faces (radians)

        // Type-specific visual properties
        this.squareSize = config.squareSize;
        this.carriageWidth = config.carriageWidth;
        this.carriageHeight = config.carriageHeight;
        this.barrelThickness = config.barrelThickness;
        this.barrelExtendLeft = config.barrelExtendLeft;
        this.barrelExtendRight = config.barrelExtendRight;

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
        this.baseCollisionRadius = 12;         // Default repulsion radius for cannon objectives
        this.expandedCollisionRadius = 16;     // Expanded repulsion radius when crew backs away before firing

        // Crew system
        this.crewIds = [];
        this.maxCrew = 5;
        this.recruitmentCooldown = 0;
        this.recruitmentInterval = 1.0; // 1 second between recruitment attempts
        this.crewGroupId = null; // ID of the auto-created crew group

        // Movement system
        this.targetX = null;
        this.targetY = null;
        this.finalTargetX = null;
        this.finalTargetY = null;
        this.velocity = { x: 0, y: 0 };
        this.flowField = null;
        this.isMoving = false;
        this.targetHeading = 0;
        this.isRotating = false;
        this.rotationSpeed = Math.PI * 0.5; // radians/second (slower, realistic artillery)

        // Type-specific movement
        this.speedDivisor = config.speedDivisor;

        // TARGETING SYSTEM
        this.lockedTarget = null;              // Current target entity (auto or manual)
        this.hasManualTarget = false;          // Flag: manual override active?
        this.manualTarget = null;              // Reference to manually targeted entity

        // TARGET COOLDOWN (prevent jitter)
        this.targetLockTimer = 0;              // Counts up to targetLockDuration
        this.targetLockDuration = 1.0;         // 1 second between retargets

        // FIELD OF VIEW
        this.viewAngle = (160 * Math.PI) / 180; // 160° FOV in radians
        this.weaponRange = config.weaponRange;  // Maximum engagement range (type-specific)
        this.minimumRange = 100;               // Minimum engagement range (shell immunity)

        // SHOOTING SYSTEM
        this.shotDelayTimer = 0;
        this.isLoaded = true;
        this.isReloading = false;
        this.shootCooldown = 0;

        // RELOAD SYSTEM
        this.reloadTimer = 0;                  // Current reload progress (seconds)
        this.reloadDuration = 0;               // Target reload time (calculated)
        this.reloadingBaseTime = config.reloadingBaseTime; // Base reload (type-specific)
        this.noCrewLogged = false;             // Prevent "NO CREW" log spam

        // ACCURACY & EFFECTS
        this.cannonAccuracyModifier = 0.15;
        this.accuracyMultiplier = config.accuracyMultiplier || 1.0; // Type-specific accuracy multiplier
        this.smokeCloudCount = 0;
        this.accuracyDebuffTimer = 0;
        this.accuracyBuffTimer = 0;
        this.muzzleFlashTimer = 0;
        this.smokePuffs = [];

        // Shell explosion size (type-specific)
        this.explosionSize = config.explosionSize;

        // Death explosion size (type-specific)
        this.deathExplosionSize = config.deathExplosionSize;

        // Knockback distance (type-specific)
        this.knockbackDistance = config.knockbackDistance;

        // Shell type (type-specific)
        this.shellType = config.shellType;

        // Whether to skip friendly fire check (mortars arc over allies)
        this.skipFriendlyFireCheck = config.skipFriendlyFireCheck;

        const typeName = type.charAt(0).toUpperCase() + type.slice(1);
        console.log(`${typeName} Cannon ${this.id} spawned at (${x}, ${y}) with faction: ${faction}`);
    }

    // Get display name for this cannon type
    getTypeName() {
        return this.type.charAt(0).toUpperCase() + this.type.slice(1) + ' Cannon';
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

    update(deltaTime, allEntities) {
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

        // === TARGETING SYSTEM ===
        if (!this.isDying && this.faction !== 'none' && allEntities) {

            // MANUAL TARGET VALIDATION (priority)
            if (this.hasManualTarget && this.manualTarget) {
                if (this.manualTarget.isDying || this.manualTarget.health <= 0) {
                    console.log(`Cannon ${this.id}: Manual target died - reverting to auto`);
                    this.hasManualTarget = false;
                    this.manualTarget = null;
                    this.lockedTarget = null;
                    this.targetLockTimer = 0;
                    if (this.shotDelayTimer > 0) {
                        console.log(`Cannon ${this.id}: Shot delay cancelled (target died)`);
                        this.shotDelayTimer = 0;
                    }
                } else {
                    this.lockedTarget = this.manualTarget;

                    const dx = this.manualTarget.x - this.x;
                    const dy = this.manualTarget.y - this.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    // Move toward out-of-range manual target
                    if (distance > this.weaponRange && this.targetX === null) {
                        console.log(`Cannon ${this.id}: Moving toward out-of-range manual target`);
                        this.moveTo(this.manualTarget.x, this.manualTarget.y);
                    }

                    // Stop movement when target enters range
                    if (distance <= this.weaponRange && this.isMoving &&
                        this.finalTargetX === this.manualTarget.x && this.finalTargetY === this.manualTarget.y) {
                        console.log(`Cannon ${this.id}: Manual target in range - stopping movement`);
                        this.targetX = null;
                        this.targetY = null;
                        this.finalTargetX = null;
                        this.finalTargetY = null;
                        this.isMoving = false;
                        this.velocity = { x: 0, y: 0 };
                    }
                }
            }

            // AUTOMATIC TARGETING (if no manual target)
            if (!this.hasManualTarget) {
                this.targetLockTimer += deltaTime;

                if (this.targetLockTimer >= this.targetLockDuration) {
                    this.targetLockTimer = 0;

                    const enemiesInFOV = this.scanForEnemies(allEntities);

                    if (enemiesInFOV && enemiesInFOV.length > 0) {
                        enemiesInFOV.sort((a, b) => a.distance - b.distance);
                        this.lockedTarget = enemiesInFOV[0].entity;
                        console.log(`Cannon ${this.id}: Locked onto entity ${this.lockedTarget.id} at ${enemiesInFOV[0].distance.toFixed(0)}px`);
                    } else {
                        this.lockedTarget = null;
                    }
                }

                // Validate automatic target
                if (this.lockedTarget) {
                    if (this.lockedTarget.isDying || this.lockedTarget.health <= 0) {
                        console.log(`Cannon ${this.id}: Target died - clearing`);
                        this.lockedTarget = null;
                        this.targetLockTimer = 0;
                        if (this.shotDelayTimer > 0) {
                            console.log(`Cannon ${this.id}: Shot delay cancelled (target died)`);
                            this.shotDelayTimer = 0;
                        }
                    } else {
                        const dx = this.lockedTarget.x - this.x;
                        const dy = this.lockedTarget.y - this.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);

                        if (distance > this.weaponRange) {
                            console.log(`Cannon ${this.id}: Target moved out of range`);
                            this.lockedTarget = null;
                            this.targetLockTimer = 0;
                        }
                    }
                }
            }

            // ROTATION TOWARD TARGET (only when loaded and not moving/reloading)
            if (this.lockedTarget && !this.lockedTarget.isDying) {
                if (this.isLoaded && !this.isReloading && !this.isMoving) {
                    const dx = this.lockedTarget.x - this.x;
                    const dy = this.lockedTarget.y - this.y;
                    this.targetHeading = Math.atan2(dy, dx);
                    this.isRotating = true;
                } else if (this.isReloading) {
                    // Reloading - stop rotation
                    this.isRotating = false;
                }
            }

            // === EXTERNAL MODIFIER UPDATES ===
            if (this.accuracyDebuffTimer > 0) {
                this.accuracyDebuffTimer -= deltaTime;
                this.accuracyDebuffTimer = Math.max(0, this.accuracyDebuffTimer);
            }

            if (this.accuracyBuffTimer > 0) {
                this.accuracyBuffTimer -= deltaTime;
                this.accuracyBuffTimer = Math.max(0, this.accuracyBuffTimer);
            }

            if (this.shootCooldown > 0) {
                this.shootCooldown -= deltaTime;
                this.shootCooldown = Math.max(0, this.shootCooldown);
            }

            // Count smoke clouds
            this.smokeCloudCount = 0;
            if (typeof smokeManager !== 'undefined') {
                const smokeClouds = smokeManager.getAllSmoke();
                for (const smoke of smokeClouds) {
                    const dx = this.x - smoke.x;
                    const dy = this.y - smoke.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance <= smoke.currentRadius + this.radius) {
                        this.smokeCloudCount++;
                    }
                }
            }

            // === SHOT TRIGGER ===
            if (this.canFire()) {
                if (this.shotDelayTimer === 0) {
                    this.shotDelayTimer = 1.0 + Math.random();
                    console.log(`Cannon ${this.id}: Shot delay started (${this.shotDelayTimer.toFixed(2)}s)`);
                }
            } else {
                if (this.shotDelayTimer > 0) {
                    console.log(`Cannon ${this.id}: Shot delay cancelled`);
                    this.shotDelayTimer = 0;
                }
            }

            // === EXECUTE DELAYED SHOT ===
            if (this.shotDelayTimer > 0) {
                this.shotDelayTimer -= deltaTime;
                if (this.shotDelayTimer <= 0) {
                    this.shotDelayTimer = 0;
                    if (this.canFire()) {
                        this.fire(allEntities);
                    }
                }
            }

            // === UPDATE SMOKE PUFFS ===
            for (let i = this.smokePuffs.length - 1; i >= 0; i--) {
                this.smokePuffs[i].timer += deltaTime;
                if (this.smokePuffs[i].timer >= this.smokePuffs[i].maxTimer) {
                    this.smokePuffs.splice(i, 1);
                }
            }

            // === UPDATE MUZZLE FLASH ===
            if (this.muzzleFlashTimer > 0) {
                this.muzzleFlashTimer -= deltaTime;
            }

            // === RELOAD SYSTEM ===
            if (this.isReloading) {
                // Only increment timer if crew exists
                if (this.crewIds.length > 0) {
                    this.reloadTimer += deltaTime;

                    // Check if reload complete
                    if (this.reloadTimer >= this.reloadDuration) {
                        // Reload finished
                        this.isLoaded = true;
                        this.isReloading = false;
                        this.reloadTimer = 0;
                        this.reloadDuration = 0;

                        console.log(`Cannon ${this.id}: Reload complete - ready to fire`);
                    }
                } else {
                    // No crew - freeze reload timer at 0
                    this.reloadTimer = 0;
                    // reloadDuration stays at Infinity

                    // Log only once (prevent spam)
                    if (!this.noCrewLogged) {
                        console.log(`Cannon ${this.id}: Reload frozen - NO CREW`);
                        this.noCrewLogged = true;
                    }
                }
            }

            // === UPDATE REPULSION RADIUS (crew backs away before firing) ===
            if (this.captureObjective) {
                // Expand repulsion when loaded, has target, not moving (crew preparing to fire)
                if (this.isLoaded && !this.isReloading && this.lockedTarget && !this.lockedTarget.isDying && !this.isMoving) {
                    this.captureObjective.collisionRadius = this.expandedCollisionRadius;
                } else {
                    this.captureObjective.collisionRadius = this.baseCollisionRadius;
                }
            }
        }

        // Movement update
        if (this.isMoving && !this.isDying && this.crewIds.length > 0) {
            const speed = this.calculateMovementSpeed();

            if (speed > 0) {
                // Check arrival
                const distToTarget = Math.sqrt(
                    (this.targetX - this.x) ** 2 +
                    (this.targetY - this.y) ** 2
                );

                if (distToTarget < 5) {
                    this.isMoving = false;
                    this.velocity = { x: 0, y: 0 };
                    this.finalTargetX = null;
                    this.finalTargetY = null;
                    console.log(`Cannon ${this.id} arrived at destination`);
                } else {
                    // Get direction
                    let dirX, dirY;
                    const hasLOS = this.hasLineOfSightToPosition(this.targetX, this.targetY);

                    if (hasLOS) {
                        dirX = (this.targetX - this.x) / distToTarget;
                        dirY = (this.targetY - this.y) / distToTarget;
                    } else if (this.flowField) {
                        const flowDir = this.flowField.getDirection(this.x, this.y);
                        dirX = flowDir.dx;
                        dirY = flowDir.dy;
                    } else {
                        dirX = (this.targetX - this.x) / distToTarget;
                        dirY = (this.targetY - this.y) / distToTarget;
                    }

                    // Apply wall repulsion
                    const wallRepulsion = this.calculateWallRepulsion();

                    // Combine forces
                    const desiredX = dirX * speed + wallRepulsion.x;
                    const desiredY = dirY * speed + wallRepulsion.y;

                    // Smooth velocity transition
                    const smoothing = 0.3;
                    this.velocity.x = this.velocity.x * (1 - smoothing) + desiredX * smoothing;
                    this.velocity.y = this.velocity.y * (1 - smoothing) + desiredY * smoothing;

                    // Clamp to max speed
                    const currentSpeed = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
                    if (currentSpeed > speed) {
                        this.velocity.x = (this.velocity.x / currentSpeed) * speed;
                        this.velocity.y = (this.velocity.y / currentSpeed) * speed;
                    }

                    // Apply position
                    let newX = this.x + this.velocity.x * deltaTime;
                    let newY = this.y + this.velocity.y * deltaTime;

                    // Terrain check
                    if (typeof TerrainManager !== 'undefined') {
                        const terrain = TerrainManager.getTerrainType(newX, newY);
                        if (terrain !== 'wall' && terrain !== 'water') {
                            this.x = newX;
                            this.y = newY;

                            // Update heading to face movement direction while moving
                            if (Math.abs(this.velocity.x) > 0.1 || Math.abs(this.velocity.y) > 0.1) {
                                const moveHeading = Math.atan2(this.velocity.y, this.velocity.x);

                                let headingDiff = moveHeading - this.heading;
                                while (headingDiff > Math.PI) headingDiff -= 2 * Math.PI;
                                while (headingDiff < -Math.PI) headingDiff += 2 * Math.PI;

                                this.heading += headingDiff * 0.15;

                                while (this.heading < 0) this.heading += 2 * Math.PI;
                                while (this.heading >= 2 * Math.PI) this.heading -= 2 * Math.PI;
                            }
                        } else {
                            this.velocity.x *= 0.5;
                            this.velocity.y *= 0.5;
                        }
                    } else {
                        this.x = newX;
                        this.y = newY;

                        // Update heading to face movement direction while moving
                        if (Math.abs(this.velocity.x) > 0.1 || Math.abs(this.velocity.y) > 0.1) {
                            const moveHeading = Math.atan2(this.velocity.y, this.velocity.x);

                            let headingDiff = moveHeading - this.heading;
                            while (headingDiff > Math.PI) headingDiff -= 2 * Math.PI;
                            while (headingDiff < -Math.PI) headingDiff += 2 * Math.PI;

                            this.heading += headingDiff * 0.15;

                            while (this.heading < 0) this.heading += 2 * Math.PI;
                            while (this.heading >= 2 * Math.PI) this.heading -= 2 * Math.PI;
                        }
                    }
                }
            }
        } else if (this.crewIds.length === 0 && this.isMoving) {
            // No crew - stop moving
            this.isMoving = false;
            this.velocity = { x: 0, y: 0 };
        }

        // Heading rotation (manual rotation commands override movement-based heading)
        if (this.isRotating) {
            let angleDiff = this.targetHeading - this.heading;
            // Normalize to [-PI, PI]
            while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
            while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

            const rotateAmount = this.rotationSpeed * deltaTime;
            if (Math.abs(angleDiff) < rotateAmount) {
                this.heading = this.targetHeading;
                this.isRotating = false;
            } else {
                this.heading += Math.sign(angleDiff) * rotateAmount;
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
        const previousCrewCount = this.crewIds.length;
        const needed = this.maxCrew - this.crewIds.length;
        const toRecruit = Math.min(needed, eligible.length, 5);

        for (let i = 0; i < toRecruit; i++) {
            const entity = eligible[i];

            // Remove from group if in one
            if (entity.groupId !== null) {
                const group = entityManager.groups.find(g => g.id === entity.groupId);
                if (group) {
                    group.removeEntity(entity.id);
                    console.log(`Entity ${entity.id} removed from group ${group.id} (recruited as crew)`);
                }
                entity.groupId = null;
            }

            entity.isCrewMember = true;
            entity.assignedCannonId = this.id;
            entity.stance = 'none'; // Crew members always have 'none' stance
            entity.lockedTarget = null; // Clear any locked target
            entity.hasManualTarget = false;
            this.crewIds.push(entity.id);
            console.log(`Entity ${entity.id} recruited as crew for cannon ${this.id}`);
        }

        if (toRecruit > 0) {
            console.log(`Cannon ${this.id} recruited ${toRecruit} crew (total: ${this.crewIds.length}/${this.maxCrew})`);

            // Handle crew returning during reload
            if (previousCrewCount === 0 && this.crewIds.length > 0) {
                // First crew member assigned to zero-crew cannon
                console.log(`Cannon ${this.id}: First crew member assigned`);
                this.noCrewLogged = false; // Reset log flag

                // If cannon was locked in reload, resume from 0
                if (this.isReloading && this.reloadDuration === Infinity) {
                    this.reloadTimer = 0;
                    this.reloadDuration = this.calculateReloadTime();
                    console.log(`Cannon ${this.id}: Reload resumed with ${this.crewIds.length} crew (${this.reloadDuration.toFixed(1)}s)`);
                }
            } else if (this.isReloading) {
                // Additional crew added during reload - reset timer and recalculate
                this.reloadTimer = 0;
                this.reloadDuration = this.calculateReloadTime();
                console.log(`Cannon ${this.id}: Crew increased - reload reset (${this.reloadDuration.toFixed(1)}s)`);
            }

            // Create crew group if first recruitment
            if (this.crewGroupId === null) {
                entityManager.createCannonCrewGroup(this);
                if (typeof updateGroupTabs === 'function') updateGroupTabs();
            }

            // Sync group membership
            entityManager.syncCannonCrewGroup(this);
            if (typeof updateGroupTabs === 'function') updateGroupTabs();
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

    // Movement methods
    calculateMovementSpeed() {
        if (this.crewIds.length === 0) return 0;

        // Get average crew speed
        let totalSpeed = 0;
        let validCrew = 0;
        for (const crewId of this.crewIds) {
            const entity = entityManager.getEntity(crewId);
            if (entity && !entity.isDying) {
                totalSpeed += entity.movement_speed;
                validCrew++;
            }
        }

        if (validCrew === 0) return 0;

        const avgSpeed = totalSpeed / validCrew;
        const baseSpeed = avgSpeed / this.speedDivisor; // Use type-specific speed divisor

        // -20% for each missing crew member
        const missingCrew = this.maxCrew - validCrew;
        const penalty = 1 - (0.2 * missingCrew);

        return baseSpeed * Math.max(0, penalty);
    }

    moveTo(x, y) {
        if (this.crewIds.length === 0) return; // No crew = no movement

        this.targetX = x;
        this.targetY = y;
        this.finalTargetX = x;
        this.finalTargetY = y;
        this.isMoving = true;

        // Calculate target heading
        const dx = x - this.x;
        const dy = y - this.y;
        if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
            this.targetHeading = Math.atan2(dy, dx);
            this.isRotating = true;
        }

        console.log(`Cannon ${this.id} moving to (${Math.floor(x)}, ${Math.floor(y)})`);
    }

    setFlowField(flowField) {
        this.flowField = flowField;
    }

    hasLineOfSightToPosition(targetX, targetY) {
        if (typeof TerrainManager === 'undefined') return true;

        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 10) return true;

        const steps = Math.ceil(distance / 10);
        const stepX = dx / steps;
        const stepY = dy / steps;

        for (let i = 1; i < steps; i++) {
            const checkX = this.x + stepX * i;
            const checkY = this.y + stepY * i;
            const terrain = TerrainManager.getTerrainType(checkX, checkY);

            if (terrain === 'wall') {
                return false;
            }
        }

        return true;
    }

    scanForEnemies(allEntities) {
        if (this.isDying || this.health <= 0) return null;

        const enemies = allEntities.filter(e =>
            e.faction !== this.faction &&
            e.faction !== 'none' &&
            !e.isDying
        );

        if (enemies.length === 0) return null;

        const enemiesInFOV = [];

        for (const enemy of enemies) {
            const dx = enemy.x - this.x;
            const dy = enemy.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < this.minimumRange || distance > this.weaponRange) continue;

            const angleToEnemy = Math.atan2(dy, dx);
            let angleDiff = angleToEnemy - this.heading;
            while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
            while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

            if (Math.abs(angleDiff) <= this.viewAngle / 2) {
                if (this.hasLineOfSightToPosition(enemy.x, enemy.y)) {
                    enemiesInFOV.push({ entity: enemy, distance: distance });
                }
            }
        }

        return enemiesInFOV.length > 0 ? enemiesInFOV : null;
    }

    canFire() {
        // Must have locked target
        if (!this.lockedTarget || this.lockedTarget.isDying) return false;

        // Must be loaded
        if (!this.isLoaded) return false;

        // Must not be reloading
        if (this.isReloading) return false;

        // Must not be moving
        if (this.isMoving) return false;

        // Cooldown must be expired
        if (this.shootCooldown > 0) return false;

        // Target must be in range
        const dx = this.lockedTarget.x - this.x;
        const dy = this.lockedTarget.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.minimumRange || distance > this.weaponRange) return false;

        // Target must be in FOV cone
        const angleToTarget = Math.atan2(dy, dx);
        let angleDiff = angleToTarget - this.heading;
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

        if (Math.abs(angleDiff) > this.viewAngle / 2) return false;

        return true;
    }

    calculateShotCone() {
        let shotConeAngle = this.cannonAccuracyModifier; // 0.15 rad base

        // Elevation modifier
        if (this.lockedTarget && typeof TerrainManager !== 'undefined') {
            const myElevation = TerrainManager.getHeightAt(this.x, this.y);
            const targetElevation = TerrainManager.getHeightAt(this.lockedTarget.x, this.lockedTarget.y);
            const elevationDiff = myElevation - targetElevation;
            const elevationModifier = 1.0 + (elevationDiff * 0.015);
            shotConeAngle *= elevationModifier;
        }

        // Smoke modifier
        if (this.smokeCloudCount > 0) {
            const smokeModifier = 1.0 + (this.smokeCloudCount * 0.1);
            shotConeAngle *= smokeModifier;
        }

        // Explosion debuff modifier
        if (this.accuracyDebuffTimer > 0) {
            const debuffModifier = 1.0 + (this.accuracyDebuffTimer * 0.1);
            shotConeAngle *= debuffModifier;
        }

        // Leader halo buff modifier
        if (this.accuracyBuffTimer > 0) {
            const buffModifier = 1.0 / (1.0 + (this.accuracyBuffTimer * 0.05));
            shotConeAngle *= buffModifier;
        }

        return shotConeAngle;
    }

    countAlliesInLineOfFire(aimX, aimY, allEntities) {
        const allies = allEntities.filter(e =>
            e.faction === this.faction &&
            !e.isDying
        );

        // Get friendly cannons from the unified manager
        let friendlyCannons = [];
        if (typeof cannonManager !== 'undefined') {
            friendlyCannons = cannonManager.cannons.filter(c =>
                c.faction === this.faction &&
                !c.isDying &&
                c.id !== this.id
            );
        }

        const allAllies = [...allies, ...friendlyCannons];
        if (allAllies.length === 0) return 0;

        const dx = aimX - this.x;
        const dy = aimY - this.y;
        const lineLength = Math.sqrt(dx * dx + dy * dy);

        let blockingCount = 0;
        const blockRadius = 5;

        for (const ally of allAllies) {
            const toAllyX = ally.x - this.x;
            const toAllyY = ally.y - this.y;
            const projection = (toAllyX * dx + toAllyY * dy) / (lineLength * lineLength);

            if (projection > 0.1 && projection < 0.9) {
                const closestX = this.x + projection * dx;
                const closestY = this.y + projection * dy;
                const distance = Math.sqrt((ally.x - closestX) ** 2 + (ally.y - closestY) ** 2);

                if (distance <= blockRadius) {
                    blockingCount++;
                }
            }
        }

        return blockingCount;
    }

    applyKnockback() {
        const knockbackX = this.x - Math.cos(this.heading) * this.knockbackDistance;
        const knockbackY = this.y - Math.sin(this.heading) * this.knockbackDistance;

        if (typeof TerrainManager !== 'undefined') {
            const terrain = TerrainManager.getTerrainType(knockbackX, knockbackY);

            if (terrain === 'wall') {
                console.log(`Cannon ${this.id}: Knockback blocked by wall`);
                return;
            }

            if (terrain === 'water') {
                console.log(`Cannon ${this.id}: Knockback into water - cannon destroyed!`);
                this.x = knockbackX;
                this.y = knockbackY;
                this.moveCrewWithKnockback(-Math.cos(this.heading) * this.knockbackDistance, -Math.sin(this.heading) * this.knockbackDistance);
                this.health = 0;
                this.startDying();
                return;
            }
        }

        this.x = knockbackX;
        this.y = knockbackY;
        this.moveCrewWithKnockback(-Math.cos(this.heading) * this.knockbackDistance, -Math.sin(this.heading) * this.knockbackDistance);
    }

    moveCrewWithKnockback(offsetX, offsetY) {
        if (this.crewIds && this.crewIds.length > 0) {
            for (const crewId of this.crewIds) {
                const crewEntity = entityManager.getEntity(crewId);
                if (crewEntity && !crewEntity.isDying) {
                    crewEntity.x += offsetX;
                    crewEntity.y += offsetY;
                }
            }
        }
    }

    calculateReloadTime() {
        const currentCrew = this.crewIds.length;
        const missingCrew = this.maxCrew - currentCrew;

        // Formula: baseTime × (1 + missingCrew × 0.5)
        const reloadTime = this.reloadingBaseTime * (1 + (missingCrew * 0.5));

        console.log(`Cannon ${this.id}: Reload time calculated: ${reloadTime.toFixed(1)}s (${currentCrew}/${this.maxCrew} crew)`);

        return reloadTime;
    }

    spawnSmokePuffs(shotAngle) {
        const numPuffs = 10 + Math.floor(Math.random() * 6);
        const puffDistance = 80 + Math.random() * 40;

        for (let i = 0; i < numPuffs; i++) {
            const t = i / (numPuffs - 1);
            const puffX = this.x + Math.cos(shotAngle) * (puffDistance * t);
            const puffY = this.y + Math.sin(shotAngle) * (puffDistance * t);
            const offsetX = (Math.random() - 0.5) * 5;
            const offsetY = (Math.random() - 0.5) * 5;

            this.smokePuffs.push({
                x: puffX + offsetX,
                y: puffY + offsetY,
                timer: 0,
                maxTimer: 3 + Math.random() * 5,
                initialRadius: 3 + Math.random() * 2
            });
        }
    }

    fire(allEntities) {
        if (!this.lockedTarget || this.lockedTarget.isDying) {
            console.log(`Cannon ${this.id}: Fire aborted - no valid target`);
            return;
        }

        const dx = this.lockedTarget.x - this.x;
        const dy = this.lockedTarget.y - this.y;
        const distanceToTarget = Math.sqrt(dx * dx + dy * dy);
        const baseAngle = Math.atan2(dy, dx);

        // Apply accuracy multiplier (mortars have 3x inaccuracy)
        const shotConeAngle = this.calculateShotCone() * this.accuracyMultiplier;
        const randomDeviation = (Math.random() - 0.5) * shotConeAngle;
        const adjustedAngle = baseAngle + randomDeviation;

        // Calculate aim point based on shell type
        let aimX, aimY;
        if (this.shellType === 'mortar_shell') {
            // Mortar: indirect fire - aim at target distance with deviation (shell "falls from above")
            aimX = this.x + Math.cos(adjustedAngle) * distanceToTarget;
            aimY = this.y + Math.sin(adjustedAngle) * distanceToTarget;
        } else {
            // Cannon: direct fire - shell travels to max range
            aimX = this.x + Math.cos(adjustedAngle) * this.weaponRange;
            aimY = this.y + Math.sin(adjustedAngle) * this.weaponRange;
        }

        console.log(`Cannon ${this.id}: Firing with ${(randomDeviation * 180 / Math.PI).toFixed(1)}° deviation`);

        // Check for allies in line of fire (skip for mortars - they arc over)
        if (!this.skipFriendlyFireCheck) {
            const blockingAllies = this.countAlliesInLineOfFire(aimX, aimY, allEntities);
            if (blockingAllies >= 1) {
                console.log(`Cannon ${this.id}: Shot blocked - ${blockingAllies} allies in line of fire`);
                this.shootCooldown = 1.5;
                return;
            }
        }

        if (typeof shellManager !== 'undefined') {
            shellManager.addShell(this.x, this.y, aimX, aimY, this.shellType, this.explosionSize, this.faction);
            console.log(`Cannon ${this.id}: ${this.shellType} spawned`);
        }

        this.applyKnockback();
        this.muzzleFlashTimer = 0.15;
        this.spawnSmokePuffs(adjustedAngle);

        // Start reload cycle
        this.isLoaded = false;
        this.isReloading = true;
        this.reloadTimer = 0;

        // Calculate reload duration based on current crew
        if (this.crewIds.length > 0) {
            this.reloadDuration = this.calculateReloadTime();
            console.log(`Cannon ${this.id}: FIRED successfully (entering reload: ${this.reloadDuration.toFixed(1)}s)`);
        } else {
            // No crew - reload never completes
            this.reloadDuration = Infinity;
            console.log(`Cannon ${this.id}: FIRED successfully (entering reload: NO CREW - locked)`);
        }
    }

    calculateWallRepulsion() {
        const repulsion = { x: 0, y: 0 };
        if (typeof TerrainManager === 'undefined') return repulsion;

        const checkRadius = 30;
        const samples = 16;

        for (let i = 0; i < samples; i++) {
            const angle = (i / samples) * Math.PI * 2;
            const checkX = this.x + Math.cos(angle) * checkRadius;
            const checkY = this.y + Math.sin(angle) * checkRadius;

            const terrain = TerrainManager.getTerrainType(checkX, checkY);
            if (terrain === 'wall' || terrain === 'water') {
                const dx = this.x - checkX;
                const dy = this.y - checkY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 0) {
                    const strength = (checkRadius - dist) / checkRadius;
                    repulsion.x += (dx / dist) * strength * 20;
                    repulsion.y += (dy / dist) * strength * 20;
                }
            }
        }

        return repulsion;
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

        // Use type-specific visual dimensions
        const squareSize = this.squareSize;
        const carriageWidth = this.carriageWidth;
        const carriageHeight = this.carriageHeight;
        const barrelThickness = this.barrelThickness;
        const barrelExtendLeft = this.barrelExtendLeft;
        const barrelExtendRight = this.barrelExtendRight;

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

        // Draw red line to movement target (like entities)
        if (this.isSelected && this.finalTargetX !== null && this.finalTargetY !== null && !this.isDying) {
            ctx.strokeStyle = 'rgb(255, 0, 0)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(screenX, screenY);
            ctx.lineTo(this.finalTargetX - camera.x, this.finalTargetY - camera.y);
            ctx.stroke();
        }

        // Draw targeting info when selected
        if (this.isSelected && !this.isDying) {
            // Draw FOV cone
            ctx.save();
            ctx.translate(screenX, screenY);
            ctx.rotate(this.heading);

            ctx.fillStyle = 'rgba(200, 200, 255, 0.1)';
            ctx.strokeStyle = 'rgba(200, 200, 255, 0.4)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, this.weaponRange, -this.viewAngle / 2, this.viewAngle / 2);
            ctx.lineTo(0, 0);
            ctx.fill();
            ctx.stroke();

            // Minimum range circle
            ctx.strokeStyle = 'rgba(255, 100, 100, 0.4)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(0, 0, this.minimumRange, 0, Math.PI * 2);
            ctx.stroke();

            ctx.restore();

            // Line to locked target
            if (this.lockedTarget && !this.lockedTarget.isDying) {
                const targetScreenX = this.lockedTarget.x - camera.x;
                const targetScreenY = this.lockedTarget.y - camera.y;

                const lineColor = this.hasManualTarget ? 'rgba(0, 255, 255, 0.7)' : 'rgba(255, 255, 0, 0.7)';

                ctx.strokeStyle = lineColor;
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.moveTo(screenX, screenY);
                ctx.lineTo(targetScreenX, targetScreenY);
                ctx.stroke();
                ctx.setLineDash([]);

                // Crosshair on target
                ctx.strokeStyle = lineColor;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(targetScreenX - 8, targetScreenY);
                ctx.lineTo(targetScreenX + 8, targetScreenY);
                ctx.moveTo(targetScreenX, targetScreenY - 8);
                ctx.lineTo(targetScreenX, targetScreenY + 8);
                ctx.stroke();
            }
        }

        // Draw smoke puffs
        for (const puff of this.smokePuffs) {
            const progress = puff.timer / puff.maxTimer;
            const opacity = (1 - progress) * 0.4;
            const radius = puff.initialRadius + (progress * 8);
            const grayValue = 150 + Math.floor(progress * 100);

            const puffScreenX = puff.x - camera.x;
            const puffScreenY = puff.y - camera.y;

            ctx.fillStyle = `rgba(${grayValue}, ${grayValue}, ${grayValue}, ${opacity})`;
            ctx.beginPath();
            ctx.arc(puffScreenX, puffScreenY, radius, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw muzzle flash
        if (this.muzzleFlashTimer > 0) {
            const flashProgress = this.muzzleFlashTimer / 0.15;
            const flashOpacity = flashProgress * 0.9;

            ctx.fillStyle = `rgba(255, 200, 100, ${flashOpacity * 0.5})`;
            ctx.beginPath();
            ctx.arc(screenX, screenY, 12, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = `rgba(255, 255, 200, ${flashOpacity * 0.7})`;
            ctx.beginPath();
            ctx.arc(screenX, screenY, 8, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = `rgba(255, 255, 255, ${flashOpacity})`;
            ctx.beginPath();
            ctx.arc(screenX, screenY, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw trajectory preview when selected (always visible with locked target)
        if (this.isSelected && this.lockedTarget && !this.lockedTarget.isDying) {
            const dx = this.lockedTarget.x - this.x;
            const dy = this.lockedTarget.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const baseAngle = Math.atan2(dy, dx);
            const shotConeAngle = this.calculateShotCone();

            // Line color based on range validity
            let lineColor = 'rgba(255, 200, 100, 0.7)';
            if (distance >= this.minimumRange && distance <= this.weaponRange) {
                lineColor = 'rgba(100, 255, 100, 0.7)';
            } else {
                lineColor = 'rgba(255, 100, 100, 0.7)';
            }

            const targetScreenX = this.lockedTarget.x - camera.x;
            const targetScreenY = this.lockedTarget.y - camera.y;

            ctx.strokeStyle = lineColor;
            ctx.lineWidth = 2;
            ctx.setLineDash([10, 5]);
            ctx.beginPath();
            ctx.moveTo(screenX, screenY);
            ctx.lineTo(targetScreenX, targetScreenY);
            ctx.stroke();
            ctx.setLineDash([]);

            // Accuracy cone edges
            const maxAimX1 = this.x + Math.cos(baseAngle + shotConeAngle / 2) * this.weaponRange;
            const maxAimY1 = this.y + Math.sin(baseAngle + shotConeAngle / 2) * this.weaponRange;
            const maxAimX2 = this.x + Math.cos(baseAngle - shotConeAngle / 2) * this.weaponRange;
            const maxAimY2 = this.y + Math.sin(baseAngle - shotConeAngle / 2) * this.weaponRange;

            ctx.strokeStyle = 'rgba(255, 200, 100, 0.3)';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(screenX, screenY);
            ctx.lineTo(maxAimX1 - camera.x, maxAimY1 - camera.y);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(screenX, screenY);
            ctx.lineTo(maxAimX2 - camera.x, maxAimY2 - camera.y);
            ctx.stroke();
            ctx.setLineDash([]);
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

        // Spawn explosion on death (type-specific size)
        if (typeof explosionManager !== 'undefined') {
            explosionManager.addExplosion(this.x, this.y, this.deathExplosionSize, false);
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
                entity.groupId = null;
                console.log(`Entity ${entity.id} released from destroyed cannon ${this.id}`);
            }
        }
        this.crewIds = [];

        // Dissolve cannon crew group
        if (this.crewGroupId !== null) {
            entityManager.dissolveCannonCrewGroup(this);
            if (typeof updateGroupTabs === 'function') updateGroupTabs();
        }
    }

    // Check if a point is within the cannon (for selection)
    containsPoint(worldX, worldY) {
        const dx = worldX - this.x;
        const dy = worldY - this.y;
        return Math.sqrt(dx * dx + dy * dy) <= this.radius + 4;
    }

    select() {
        this.isSelected = true;
    }

    deselect() {
        this.isSelected = false;
    }
}

// Manager class for handling multiple cannons (all types)
class CannonManager {
    constructor() {
        this.cannons = [];
        this.selectedCannon = null; // Only one cannon can be selected at a time
    }

    addCannon(x, y, faction = 'none', type = 'light') {
        const cannon = new Cannon(x, y, faction, type);

        // Create linked capture objective (object type)
        const typeName = type.charAt(0).toUpperCase() + type.slice(1);
        const objective = captureObjectiveManager.addObjective(x, y, {
            objective_type: 'object',
            objective_name: `${typeName} Cannon ${cannon.id}`,
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

    updateAll(deltaTime, allEntities) {
        // Update all cannons and remove dead ones
        this.cannons = this.cannons.filter(cannon => {
            const keepCannon = cannon.update(deltaTime, allEntities);

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

    // Selection management
    selectCannon(cannon) {
        // Deselect previous cannon if any
        if (this.selectedCannon) {
            this.selectedCannon.deselect();
        }
        this.selectedCannon = cannon;
        cannon.select();
        console.log(`Cannon ${cannon.id} selected`);
    }

    deselectCannon() {
        if (this.selectedCannon) {
            this.selectedCannon.deselect();
            console.log(`Cannon ${this.selectedCannon.id} deselected`);
            this.selectedCannon = null;
        }
    }

    getSelectedCannon() {
        return this.selectedCannon;
    }

    // Get cannons within a rectangle (for box selection)
    getCannonsInRect(x1, y1, x2, y2) {
        const minX = Math.min(x1, x2);
        const maxX = Math.max(x1, x2);
        const minY = Math.min(y1, y2);
        const maxY = Math.max(y1, y2);

        return this.cannons.filter(cannon => {
            return cannon.x >= minX && cannon.x <= maxX &&
                   cannon.y >= minY && cannon.y <= maxY;
        });
    }
}

// Create global manager instance
const cannonManager = new CannonManager();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Cannon, CannonManager, cannonManager };
}
