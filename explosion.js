// Explosion Management System

class Explosion {
    static nextId = 0;

    constructor(x, y, explosion_size = 1, burn = true) {
        this.id = Explosion.nextId++;
        this.x = x;
        this.y = y;
        this.explosion_size = explosion_size;
        this.burn = burn;
        
        // Base stats (scaled by explosion_size)
        this.baseRadius = 30;
        this.baseDamage = 300;
        this.baseDistress = 40;
        this.baseRepulsion = 3;
        
        // Scaled stats
        this.radius = this.baseRadius * explosion_size;
        this.damage = this.baseDamage * explosion_size;
        this.distress = this.baseDistress * explosion_size;
        this.repulsion = this.baseRepulsion * explosion_size;
        
        // Animation timers
        this.flashTimer = 0;
        this.flashDuration = 0.2; // 0.2 seconds
        this.shockwaveTimer = 0;
        this.shockwaveDuration = 1.0; // 1 second
        
        // Shockwave starts at center, expands to radius
        this.shockwaveRadius = 0;
        
        // Track if effects have been applied (one-time application)
        this.effectsApplied = false;
        
        console.log(`Explosion ${this.id} created at (${Math.floor(x)}, ${Math.floor(y)}) - size: ${explosion_size}, radius: ${this.radius.toFixed(1)}px, burn: ${burn}`);
    }

    update(deltaTime, entities, fireManager) {
        // Update animation timers
        this.flashTimer += deltaTime;
        this.shockwaveTimer += deltaTime;
        
        // Update shockwave expansion (starts at 0, expands to 4x radius over 1 second)
        this.shockwaveRadius = (this.shockwaveTimer / this.shockwaveDuration) * this.radius * 4;
        
        // Apply effects once when explosion first triggers
        if (!this.effectsApplied) {
            this.applyEffects(entities, fireManager);
            this.effectsApplied = true;
        }
        
        // Check if animation is complete
        const isComplete = this.flashTimer >= this.flashDuration && 
                          this.shockwaveTimer >= this.shockwaveDuration;
        
        return { stillActive: !isComplete };
    }

    applyEffects(entities, fireManager) {
        // Apply damage, distress, repulsion, and accuracy debuff to entities
        for (const entity of entities) {
            if (entity.isDying) continue;

            const dx = entity.x - this.x;
            const dy = entity.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Check if entity is within explosion radius
            if (distance <= this.radius) {
                // Calculate falloff using inverse square law
                // At center (distance=0): multiplier = 1.0
                // At edge (distance=radius): multiplier ≈ 0
                const normalizedDistance = distance / this.radius; // 0 to 1
                const falloff = 1 / (1 + normalizedDistance * normalizedDistance * 9); // Inverse square with scaling

                // Apply damage
                const damage = this.damage * falloff;
                entity.health -= damage;
                console.log(`Explosion ${this.id} damaged entity ${entity.id} for ${damage.toFixed(1)} (distance: ${distance.toFixed(1)}px, falloff: ${(falloff * 100).toFixed(0)}%)`);

                // Apply distress
                const distressIncrease = this.distress * falloff;
                entity.distress = Math.min(100, entity.distress + distressIncrease);

                // Apply knockback velocity (units will fly through the air)
                if (distance > 0.1) { // Avoid division by zero
                    const knockbackStrength = 150 * falloff; // Strength based on distance
                    const knockbackX = (dx / distance) * knockbackStrength;
                    const knockbackY = (dy / distance) * knockbackStrength;

                    // Apply knockback using entity's physics system
                    if (typeof entity.applyKnockback === 'function') {
                        entity.applyKnockback(knockbackX, knockbackY);
                    } else {
                        // Fallback: instant push if applyKnockback not available
                        entity.x += knockbackX / 10;
                        entity.y += knockbackY / 10;
                    }
                }

                // Apply accuracy debuff (3 seconds, stacking)
                if (typeof entity.accuracyDebuffTimer !== 'undefined') {
                    entity.accuracyDebuffTimer += 3; // Stack by adding 3 seconds
                    console.log(`Entity ${entity.id} accuracy debuff: ${entity.accuracyDebuffTimer.toFixed(1)}s`);
                }
            }
        }

        // Apply damage to cannons (they only take damage from explosions, not gunshots)
        if (typeof lightCannonManager !== 'undefined') {
            for (const cannon of lightCannonManager.cannons) {
                if (cannon.isDying) continue;

                const dx = cannon.x - this.x;
                const dy = cannon.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance <= this.radius) {
                    const normalizedDistance = distance / this.radius;
                    const falloff = 1 / (1 + normalizedDistance * normalizedDistance * 9);

                    const damage = this.damage * falloff;
                    cannon.takeDamage(damage);
                    console.log(`Explosion ${this.id} damaged cannon ${cannon.id} for ${damage.toFixed(1)} (distance: ${distance.toFixed(1)}px)`);
                }
            }
        }

        // Spawn fires if burn = true
        if (this.burn && typeof fireManager !== 'undefined') {
            const numFires = Math.floor(Math.random() * 4); // 0-3 fires
            
            for (let i = 0; i < numFires; i++) {
                // Random position within explosion radius
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * this.radius;
                const fireX = this.x + Math.cos(angle) * distance;
                const fireY = this.y + Math.sin(angle) * distance;
                
                // Check if valid terrain
                if (typeof TerrainManager !== 'undefined') {
                    const terrainType = TerrainManager.getTerrainType(fireX, fireY);
                    
                    if (terrainType !== 'wall' && terrainType !== 'water') {
                        fireManager.addFire(fireX, fireY);
                    }
                } else {
                    fireManager.addFire(fireX, fireY);
                }
            }
            
            console.log(`Explosion ${this.id} spawned ${numFires} fires`);
        }
        
        // Create burn mark
        if (typeof fireManager !== 'undefined') {
            fireManager.burnMarks.push({
                x: this.x,
                y: this.y,
                radius: this.radius * 0.8, // Slightly smaller than explosion radius
                timer: 0,
                fadeDelay: 10,
                fadeDuration: 10
            });
            console.log(`Explosion ${this.id} left burn mark (radius: ${(this.radius * 0.8).toFixed(1)}px)`);
        }
    }

    draw(ctx, camera) {
        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;
        
        // FLASH ANIMATION (0-0.2s)
        if (this.flashTimer < this.flashDuration) {
            const flashProgress = this.flashTimer / this.flashDuration; // 0 to 1
            const flashOpacity = 1.0 - flashProgress; // Fade out
            
            // Outer orange glow
            ctx.fillStyle = `rgba(255, 140, 0, ${flashOpacity * 0.4})`;
            ctx.beginPath();
            ctx.arc(screenX, screenY, this.radius * 1.3, 0, Math.PI * 2);
            ctx.fill();
            
            // Main yellow explosion
            ctx.fillStyle = `rgba(255, 200, 0, ${flashOpacity * 0.7})`;
            ctx.beginPath();
            ctx.arc(screenX, screenY, this.radius, 0, Math.PI * 2);
            ctx.fill();
            
            // Hot white center
            ctx.fillStyle = `rgba(255, 255, 255, ${flashOpacity * 0.9})`;
            ctx.beginPath();
            ctx.arc(screenX, screenY, this.radius * 0.5, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // SHOCKWAVE ANIMATION (0-1s) - Hollow circle, no fill!
        if (this.shockwaveTimer < this.shockwaveDuration) {
            const shockwaveProgress = this.shockwaveTimer / this.shockwaveDuration; // 0 to 1
            const shockwaveOpacity = (1.0 - shockwaveProgress) * 0.5; // Fade out from 50% to 0%
            
            ctx.strokeStyle = `rgba(255, 255, 255, ${shockwaveOpacity})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(screenX, screenY, this.shockwaveRadius, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
}

class ExplosionManager {
    constructor() {
        this.explosions = [];
    }

    addExplosion(x, y, explosion_size = 1, burn = true) {
        const explosion = new Explosion(x, y, explosion_size, burn);
        this.explosions.push(explosion);
        return explosion;
    }

    updateAll(deltaTime, entities, fireManager) {
        // Update all explosions, remove completed ones
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const result = this.explosions[i].update(deltaTime, entities, fireManager);
            
            if (!result.stillActive) {
                console.log(`Explosion ${this.explosions[i].id} animation complete - removing`);
                this.explosions.splice(i, 1);
            }
        }
    }

    drawAll(ctx, camera) {
        // Draw all active explosions
        for (const explosion of this.explosions) {
            explosion.draw(ctx, camera);
        }
    }

    clear() {
        this.explosions = [];
        console.log('All explosions cleared');
    }
}

// Global instance
const explosionManager = new ExplosionManager();