// Fire Management System

class Fire {
    static nextId = 0;

    constructor(x, y, maxDuration = null, generation = 0) {
        this.id = Fire.nextId++;
        this.x = x;
        this.y = y;
        this.radius = 6; // 2× unit radius
        this.generation = generation; // Track fire generation for minimum lifetime
        
        // Duration: random 5-15 seconds, but capped by parent's max duration
        if (maxDuration === null) {
            // New fire (not spread) - full random range, min 5s
            this.duration = 5 + Math.random() * 10;
        } else {
            // Spread fire - generation-based minimum
            // Gen 1: 4.5s, Gen 2: 4s, Gen 3: 3.5s, ... hard minimum 1s
            const minDuration = Math.max(1, 5 - (generation * 0.5));
            const cappedMax = Math.max(minDuration, maxDuration);
            this.duration = minDuration + Math.random() * (cappedMax - minDuration);
        }
        this.timer = 0;
        
        // Animation state
        this.animationTimer = 0;
        this.flickerPhase = Math.random() * Math.PI * 2; // Random start phase
        this.pulsePhase = Math.random() * Math.PI * 2;
        
        // Smoke generation
        this.smokeSpawnTimer = 0;
        this.smokeSpawnInterval = 0.4; // Base interval
        
        // Fire spreading
        this.spreadTimer = 0;
        this.spreadInterval = 1.0; // Check for spreading every second
        
        console.log(`Fire ${this.id} (Gen ${this.generation}) spawned at (${Math.floor(x)}, ${Math.floor(y)}) - duration: ${this.duration.toFixed(1)}s`);
    }

    update(deltaTime, windDirection, windSpeed) {
        this.timer += deltaTime;
        this.animationTimer += deltaTime;
        
        let result = { stillAlive: true, spawnSmoke: false, spreadFire: false, spreadData: [] };
        
        // Smoke generation based on fire lifetime remaining AND generation
        const lifeRemaining = 1 - (this.timer / this.duration); // 1.0 at start, 0.0 at end
        
        // Base smoke rate: 5/sec at start, 1/sec at end
        const baseSmokeRate = 1 + (lifeRemaining * 4);
        
        // Generation penalty: Gen 0 = 100%, Gen 1 = 80%, Gen 2 = 60%, etc. (min 20%)
        const generationModifier = Math.max(0.2, 1 - (this.generation * 0.2));
        
        // Final smoke rate with generation penalty
        const smokeRate = baseSmokeRate * generationModifier;
        const currentInterval = 1 / smokeRate;
        
        this.smokeSpawnTimer += deltaTime;
        
        if (this.smokeSpawnTimer >= currentInterval) {
            this.smokeSpawnTimer = 0;
            result.spawnSmoke = true;
        }
        
        // Fire spreading based on wind speed
        this.spreadTimer += deltaTime;
        
        if (this.spreadTimer >= this.spreadInterval) {
            this.spreadTimer = 0;
            
            // Spread chance: 0% at wind 0, 50% at wind 1
            const spreadChance = windSpeed * 0.25;
            
            if (Math.random() < spreadChance) {
                // Spawn 1 or 2 new fires
                const numFires = Math.random() < 0.5 ? 1 : 2;
                
                // Calculate wind angle
                const windAngle = (windDirection + 1) * Math.PI;
                
                for (let i = 0; i < numFires; i++) {
                    // Random distance 5-10px
                    const distance = 5 + Math.random() * 5;
                    
                    // Random direction offset ±25% (±0.25 radians)
                    const directionOffset = (Math.random() - 0.5) * 0.5 * Math.PI; // ±25% of full circle
                    const finalAngle = windAngle + directionOffset;
                    
                    const newX = this.x + Math.cos(finalAngle) * distance;
                    const newY = this.y + Math.sin(finalAngle) * distance;
                    
                    result.spreadData.push({ x: newX, y: newY });
                }
                
                result.spreadFire = true;
                console.log(`Fire ${this.id} spreading - spawning ${numFires} new fire(s)`);
            }
        }
        
        // Check if expired
        if (this.timer >= this.duration) {
            result.stillAlive = false;
            return result;
        }
        
        return result;
    }

    draw(ctx, camera) {
        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;
        
        // Animation calculations
        const flickerSpeed = 8;
        const pulseSpeed = 3;
        
        const flicker = Math.sin(this.animationTimer * flickerSpeed + this.flickerPhase);
        const pulse = Math.sin(this.animationTimer * pulseSpeed + this.pulsePhase);
        
        // Pulsing radius (base ± 1px)
        const currentRadius = this.radius + pulse * 1;
        
        // Layer 1: Outer orange glow (largest)
        const outerOpacity = 0.3 + flicker * 0.1;
        ctx.fillStyle = `rgba(255, 140, 0, ${outerOpacity})`;
        ctx.beginPath();
        ctx.arc(screenX, screenY, currentRadius * 1.3, 0, Math.PI * 2);
        ctx.fill();
        
        // Layer 2: Main yellow fire
        const mainOpacity = 0.6 + flicker * 0.2;
        ctx.fillStyle = `rgba(255, 200, 0, ${mainOpacity})`;
        ctx.beginPath();
        ctx.arc(screenX, screenY, currentRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Layer 3: Hot white center
        const centerOpacity = 0.4 + flicker * 0.3;
        ctx.fillStyle = `rgba(255, 255, 255, ${centerOpacity})`;
        ctx.beginPath();
        ctx.arc(screenX, screenY, currentRadius * 0.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Red outline (will blend with other fires)
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(screenX, screenY, currentRadius, 0, Math.PI * 2);
        ctx.stroke();
    }
}

class FireManager {
    constructor() {
        this.fires = [];
        this.burnMarks = []; // Permanent scorched ground markers
    }

    addFire(x, y, maxDuration = null, generation = 0) {
        const fire = new Fire(x, y, maxDuration, generation);
        this.fires.push(fire);
        return fire;
    }

    updateAll(deltaTime, windDirection, windSpeed) {
        // Update all fires, remove expired ones
        for (let i = this.fires.length - 1; i >= 0; i--) {
            const result = this.fires[i].update(deltaTime, windDirection, windSpeed);
            
            // Spawn smoke if fire requests it
            if (result.spawnSmoke && typeof smokeManager !== 'undefined') {
                smokeManager.addSmoke(this.fires[i].x, this.fires[i].y, windDirection, windSpeed);
            }
            
            // Spread fire if conditions met
            if (result.spreadFire) {
                const parentFire = this.fires[i];
                const childGeneration = parentFire.generation + 1;
                
                for (const spreadData of result.spreadData) {
                    // Check if valid terrain (not wall or water)
                    if (typeof TerrainManager !== 'undefined') {
                        const terrainType = TerrainManager.getTerrainType(spreadData.x, spreadData.y);
                        
                        if (terrainType !== 'wall' && terrainType !== 'water') {
                            // Pass HALF of parent's duration and increment generation
                            this.addFire(spreadData.x, spreadData.y, parentFire.duration / 2, childGeneration);
                        } else {
                            console.log(`Fire spread blocked by terrain at (${Math.floor(spreadData.x)}, ${Math.floor(spreadData.y)})`);
                        }
                    } else {
                        // Pass HALF of parent's duration and increment generation
                        this.addFire(spreadData.x, spreadData.y, parentFire.duration / 2, childGeneration);
                    }
                }
            }
            
            if (!result.stillAlive) {
                // Fire expired - create burn mark (old way - store in array)
                const fire = this.fires[i];
                
                this.burnMarks.push({
                    x: fire.x,
                    y: fire.y,
                    radius: fire.radius,
                    timer: 0,
                    fadeDelay: 10, // Wait 10 seconds before fading
                    fadeDuration: 10 // Fade out over 10 seconds
                });
                
                console.log(`Fire ${fire.id} (Gen ${fire.generation}) extinguished - burn mark left at (${Math.floor(fire.x)}, ${Math.floor(fire.y)})`);
                
                // Remove from array
                this.fires.splice(i, 1);
            }
        }
    }

    updateBurnMarks(deltaTime) {
        // Update burn mark timers and remove faded ones
        for (let i = this.burnMarks.length - 1; i >= 0; i--) {
            this.burnMarks[i].timer += deltaTime;
            
            // Remove if fully faded (after delay + fade duration)
            const totalLifetime = this.burnMarks[i].fadeDelay + this.burnMarks[i].fadeDuration;
            if (this.burnMarks[i].timer >= totalLifetime) {
                this.burnMarks.splice(i, 1);
            }
        }
    }

    drawAll(ctx, camera) {
        // Draw burn marks first (underneath everything)
        for (const mark of this.burnMarks) {
            const screenX = mark.x - camera.x;
            const screenY = mark.y - camera.y;
            
            // Calculate opacity based on timer
            let opacity = 1.0;
            if (mark.timer > mark.fadeDelay) {
                // Start fading after delay
                const fadeProgress = (mark.timer - mark.fadeDelay) / mark.fadeDuration;
                opacity = 1.0 - fadeProgress;
            }
            
            // Dark scorched circle (larger and darker than corpses)
            ctx.fillStyle = `rgba(20, 20, 20, ${0.8 * opacity})`;
            ctx.beginPath();
            ctx.arc(screenX, screenY, mark.radius * 1.2, 0, Math.PI * 2);
            ctx.fill();
            
            // Inner darker center
            ctx.fillStyle = `rgba(10, 10, 10, ${0.9 * opacity})`;
            ctx.beginPath();
            ctx.arc(screenX, screenY, mark.radius * 0.7, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw fires with blending for merged outlines
        if (this.fires.length > 0) {
            // Draw fire circles first (without outlines)
            for (const fire of this.fires) {
                const screenX = fire.x - camera.x;
                const screenY = fire.y - camera.y;
                
                const flicker = Math.sin(fire.animationTimer * 8 + fire.flickerPhase);
                const pulse = Math.sin(fire.animationTimer * 3 + fire.pulsePhase);
                const currentRadius = fire.radius + pulse * 1;
                
                // Outer orange glow
                const outerOpacity = 0.3 + flicker * 0.1;
                ctx.fillStyle = `rgba(255, 140, 0, ${outerOpacity})`;
                ctx.beginPath();
                ctx.arc(screenX, screenY, currentRadius * 1.3, 0, Math.PI * 2);
                ctx.fill();
                
                // Main yellow fire
                const mainOpacity = 0.6 + flicker * 0.2;
                ctx.fillStyle = `rgba(255, 200, 0, ${mainOpacity})`;
                ctx.beginPath();
                ctx.arc(screenX, screenY, currentRadius, 0, Math.PI * 2);
                ctx.fill();
                
                // Hot white center
                const centerOpacity = 0.4 + flicker * 0.3;
                ctx.fillStyle = `rgba(255, 255, 255, ${centerOpacity})`;
                ctx.beginPath();
                ctx.arc(screenX, screenY, currentRadius * 0.5, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // Draw all outlines with screen blending for merge effect
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            
            for (const fire of this.fires) {
                const screenX = fire.x - camera.x;
                const screenY = fire.y - camera.y;
                
                const pulse = Math.sin(fire.animationTimer * 3 + fire.pulsePhase);
                const currentRadius = fire.radius + pulse * 1;
                
                ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(screenX, screenY, currentRadius, 0, Math.PI * 2);
                ctx.stroke();
            }
            
            ctx.restore();
        }
    }

    getAllFires() {
        return this.fires;
    }

    clear() {
        this.fires = [];
        this.burnMarks = [];
        console.log('All fires and burn marks cleared');
    }
}

// Global instance
const fireManager = new FireManager();