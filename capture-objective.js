// Capturable Objective System
// Objectives that can be captured by teams (flags, artillery, etc.)

class CaptureObjective {
    static nextId = 0;

    constructor(x, y, options = {}) {
        this.id = CaptureObjective.nextId++;
        this.x = x;
        this.y = y;

        // Core properties
        this.is_moveable = options.is_moveable ?? false;
        this.capture_radius = options.capture_radius ?? 50;
        this.capture_amount = options.capture_amount ?? 5;
        this.capture_time = options.capture_time ?? 5.0;
        this.objective_name = options.objective_name ?? "None";
        this.objective_type = options.objective_type ?? "none";

        // Ownership and capture state
        this.faction = "none";  // "none", "blue", "red"
        this.previousFaction = "none";  // Track previous owner for recapture visualization
        this.captureProgress = 0.0;  // -1.0 (red) to +1.0 (blue), 0 = neutral
        this.isCaptureInProgress = false;
        this.capturingFaction = null;

        // Visual properties
        this.iconSize = 10;
        this.collisionRadius = 12;  // Small hitbox for repulsion

        // Success animation
        this.successAnimationActive = false;
        this.successAnimationRadius = 0;
        this.successAnimationDuration = 1.0;  // 1 second
        this.successAnimationTimer = 0;

        console.log(`CaptureObjective ${this.id} created: "${this.objective_name}" at (${Math.floor(x)}, ${Math.floor(y)})`);
    }

    update(deltaTime, entities) {
        // Count units in capture radius by faction
        let blueCount = 0;
        let redCount = 0;

        for (const entity of entities) {
            if (entity.isDying) continue;

            const dx = entity.x - this.x;
            const dy = entity.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance <= this.capture_radius) {
                if (entity.faction === 'blue') blueCount++;
                else if (entity.faction === 'red') redCount++;
            }
        }

        // Determine capture direction based on unit counts
        let captureDirection = 0;  // -1 = toward red, 0 = neutral, +1 = toward blue

        // ONLY ONE FACTION can capture - if contested, move toward neutral but don't capture
        if (blueCount >= this.capture_amount && redCount < this.capture_amount) {
            // Only blue present - can capture
            captureDirection = 1;
            this.capturingFaction = 'blue';
            this.isCaptureInProgress = true;
        } else if (redCount >= this.capture_amount && blueCount < this.capture_amount) {
            // Only red present - can capture
            captureDirection = -1;
            this.capturingFaction = 'red';
            this.isCaptureInProgress = true;
        } else if (blueCount >= this.capture_amount && redCount >= this.capture_amount) {
            // CONTESTED - both factions present
            // Can move toward neutral but CANNOT capture
            const netForce = blueCount - redCount;
           if (netForce !== 0) {
                captureDirection = Math.sign(netForce);
                this.capturingFaction = netForce > 0 ? 'blue' : 'red';
                this.isCaptureInProgress = true;
            } else {
                // Perfectly balanced - no movement
                this.isCaptureInProgress = false;
                this.capturingFaction = null;
            }
        } else {
            // Not enough units from either faction
            this.isCaptureInProgress = false;
            this.capturingFaction = null;
        }

        // Update capture progress
        if (this.isCaptureInProgress) {
            const progressRate = 1.0 / this.capture_time;  // Progress per second
            const oldProgress = this.captureProgress;

            this.captureProgress += captureDirection * progressRate * deltaTime;

            // When contested, clamp progress to prevent capture (stop at ±0.99)
            const isContested = blueCount >= this.capture_amount && redCount >= this.capture_amount;
            if (isContested) {
                // Can move toward neutral but not complete capture
                if (this.captureProgress > 0) {
                    this.captureProgress = Math.max(0, Math.min(0.99, this.captureProgress)); //CHECK
                } else {
                    this.captureProgress = Math.max(-0.99, Math.min(0, this.captureProgress));
                }
            } else {
                // Normal clamp when not contested
                this.captureProgress = Math.max(-1.0, Math.min(1.0, this.captureProgress));
            }

            // RECAPTURE DETECTION: Progress crosses zero from either direction
            if ((oldProgress > 0 && this.captureProgress <= 0) || (oldProgress < 0 && this.captureProgress >= 0)) {
                // Store the previous owner before resetting
                this.previousFaction = this.faction;
                // Reset to neutral when crossing zero during recapture
                this.faction = 'none';
                console.log(`Objective ${this.id} reset to neutral (was: ${this.previousFaction}, recapture in progress)`);
            }

            // Check for capture completion (only when NOT contested)
            if (!isContested) {
                if (this.captureProgress >= 1.0 && this.faction !== 'blue') {
                    this.completeCaptureForFaction('blue', entities);
                } else if (this.captureProgress <= -1.0 && this.faction !== 'red') {
                    this.completeCaptureForFaction('red', entities);
                }
            }
        }

        // Update success animation
        if (this.successAnimationActive) {
            this.successAnimationTimer += deltaTime;
            this.successAnimationRadius = (this.successAnimationTimer / this.successAnimationDuration) * (this.capture_radius * 1.5);

            if (this.successAnimationTimer >= this.successAnimationDuration) {
                this.successAnimationActive = false;
                this.successAnimationTimer = 0;
                this.successAnimationRadius = 0;
            }
        }

        return { stillActive: true };  // Objectives persist
    }

    completeCaptureForFaction(newFaction, entities) {
        const oldFaction = this.faction;
        this.faction = newFaction;
        this.previousFaction = 'none';  // Clear previous faction on successful capture

        console.log(`Objective ${this.id} "${this.objective_name}" captured by ${newFaction} (was: ${oldFaction})`);

        // Start success animation
        this.successAnimationActive = true;
        this.successAnimationTimer = 0;
        this.successAnimationRadius = 0;

        // Apply distress reduction to friendly units
        this.applyDistressReduction(entities, newFaction);
    }

    applyDistressReduction(entities, capturingFaction) {
        const effectRadius = this.capture_radius * 1.5;

        for (const entity of entities) {
            if (entity.faction !== capturingFaction) continue;
            if (entity.isDying) continue;

            const dx = entity.x - this.x;
            const dy = entity.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance <= effectRadius) {
                entity.distress = Math.max(0, entity.distress - 50);
                console.log(`Unit ${entity.id} distress reduced by 50 (capture success)`);
            }
        }
    }

    // Check if unit should be repelled (for collision)
    shouldRepelUnit(unitX, unitY, unitRadius) {
        const dx = unitX - this.x;
        const dy = unitY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        return distance <= this.collisionRadius + unitRadius;
    }

    // Calculate repulsion force for unit
    getRepulsionForce(unitX, unitY) {
        const dx = unitX - this.x;
        const dy = unitY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0) return { x: 0, y: 0 };

        // Normalize and apply force
        const strength = 1.0;  // Constant repulsion strength
        return {
            x: (dx / distance) * strength,
            y: (dy / distance) * strength
        };
    }

    draw(ctx, camera) {
        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;

        // Draw capture radius (dotted white circle)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.capture_radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw capture progress visualization
        // Show circle whenever there's significant progress OR capture in progress
        const shouldShowProgress = this.isCaptureInProgress || Math.abs(this.captureProgress) > 0.05;

        if (shouldShowProgress && Math.abs(this.captureProgress) < 1.0) {
            // Determine if capturing (expanding from center) or recapturing (shrinking from edge)
            let progressRadius;
            let progressColor;

            if (this.faction === 'none') {
                // Initial capture: expand from center to edge
                progressRadius = this.capture_radius * Math.abs(this.captureProgress);
                // Use capturing faction's color
                progressColor = this.capturingFaction === 'blue'
                    ? 'rgba(0, 100, 255, 0.5)'
                    : 'rgba(255, 50, 50, 0.5)';
            } else {
                //Shrinking circle (LOSING team's color) - inward from edge
                
                const factionProgress = this.faction === 'blue' ? this.captureProgress : -this.captureProgress;
                const shrinkRadius = this.capture_radius * Math.abs(factionProgress);

                // Draw shrinking circle (CURRENT OWNER'S color - they are losing)
                if (shrinkRadius > 0) {
                    const losingColor = this.faction === 'blue'
                        ? 'rgba(0, 100, 255, 0.5)'
                        : 'rgba(255, 50, 50, 0.5)';

                    ctx.fillStyle = losingColor;
                    ctx.beginPath();
                    ctx.arc(screenX, screenY, shrinkRadius, 0, Math.PI * 2);
                    ctx.fill();
                }

                
                return;
            }

            // Only draw if radius is positive (for initial capture case)
            if (progressRadius > 0) {
                ctx.fillStyle = progressColor;
                ctx.beginPath();
                ctx.arc(screenX, screenY, progressRadius, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Draw objective icon (10x10 square, colored by faction)
        let iconColor;
        // Icon stays white during active capture
        if (this.isCaptureInProgress && Math.abs(this.captureProgress) < 1.0) {
            iconColor = 'rgb(255, 255, 255)';
        } else if (this.faction === 'blue') {
            iconColor = 'rgb(0, 100, 255)';
        } else if (this.faction === 'red') {
            iconColor = 'rgb(255, 50, 50)';
        } else {
            iconColor = 'rgb(255, 255, 255)';
        }

        ctx.fillStyle = iconColor;
        ctx.fillRect(
            screenX - this.iconSize / 2,
            screenY - this.iconSize / 2,
            this.iconSize,
            this.iconSize
        );

        // Draw success animation (expanding green circle)
        if (this.successAnimationActive) {
            const opacity = 1.0 - (this.successAnimationTimer / this.successAnimationDuration);
            ctx.strokeStyle = `rgba(0, 255, 100, ${opacity * 0.8})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(screenX, screenY, this.successAnimationRadius, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
}

class CaptureObjectiveManager {
    constructor() {
        this.objectives = [];
    }

    addObjective(x, y, options = {}) {
        const objective = new CaptureObjective(x, y, options);
        this.objectives.push(objective);
        return objective;
    }

    updateAll(deltaTime, entities) {
        for (const objective of this.objectives) {
            objective.update(deltaTime, entities);
        }
    }

    drawAll(ctx, camera) {
        for (const objective of this.objectives) {
            objective.draw(ctx, camera);
        }
    }

    getAllObjectives() {
        return this.objectives;
    }

    clear() {
        this.objectives = [];
    }
}

// Global manager instance
const captureObjectiveManager = new CaptureObjectiveManager();
