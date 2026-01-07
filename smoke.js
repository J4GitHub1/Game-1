// Smoke Management System

class SmokeCloud {
    static nextId = 0;

    constructor(x, y, windDirection, windSpeed) {
        this.id = SmokeCloud.nextId++;
        
        // Random spawn offset (0-15px)
        const offsetAngle = Math.random() * Math.PI * 2;
        const offsetDist = Math.random() * 15;
        this.x = x + Math.cos(offsetAngle) * offsetDist;
        this.y = y + Math.sin(offsetAngle) * offsetDist;
        
        // Random size (2× gun smoke dimensions)
        this.initialRadius = 4 + Math.random() * 4; // 4-8px initial
        this.maxRadius = 16 + Math.random() * 16; // 16-32px max (2× gun smoke)
        this.currentRadius = this.initialRadius;
        
        // Duration: random 5-20 seconds
        this.duration = 5 + Math.random() * 15;
        this.timer = 0;
        
        // Wind-based velocity
        // Convert wind direction slider to radians: angle = (windDirection + 1) * PI
        const windAngle = (windDirection + 1) * Math.PI;
        const baseSpeed = windSpeed * 50; // 0-50 px/s
        
        // Random movement modifier ±10%
        const speedModifier = 0.9 + Math.random() * 0.2; // 0.9 to 1.1
        const finalSpeed = baseSpeed * speedModifier;
        
        // Random direction variance ±5% (±0.05 radians ≈ ±2.87°)
        const directionVariance = (Math.random() - 0.5) * 0.1 * Math.PI; // ±5% of full circle
        const finalAngle = windAngle + directionVariance;
        
        this.velocityX = Math.cos(finalAngle) * finalSpeed;
        this.velocityY = Math.sin(finalAngle) * finalSpeed;
        
        // Animation
        this.animationTimer = 0;
        this.flickerPhase = Math.random() * Math.PI * 2;
        
        console.log(`Smoke ${this.id} spawned at (${Math.floor(this.x)}, ${Math.floor(this.y)}) - duration: ${this.duration.toFixed(1)}s, speed: ${finalSpeed.toFixed(1)}px/s`);
    }

    update(deltaTime, mapWidth, mapHeight) {
        this.timer += deltaTime;
        this.animationTimer += deltaTime;
        
        // Move with wind (no terrain collision)
        this.x += this.velocityX * deltaTime;
        this.y += this.velocityY * deltaTime;
        
        // Growing animation (grow throughout lifetime)
        const progress = this.timer / this.duration;
        this.currentRadius = this.initialRadius + (this.maxRadius - this.initialRadius) * progress;
        
        // Remove if off-map (with 100px buffer)
        if (this.x < -100 || this.x > mapWidth + 100 || 
            this.y < -100 || this.y > mapHeight + 100) {
            console.log(`Smoke ${this.id} drifted off-map at (${Math.floor(this.x)}, ${Math.floor(this.y)}) - removing`);
            return false;
        }
        
        // Check if expired
        if (this.timer >= this.duration) {
            return false; // Signal for removal
        }
        
        return true; // Still alive
    }

    draw(ctx, camera) {
        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;
        
        // Fade out in last 20% of lifetime
        const progress = this.timer / this.duration;
        let opacity = 1.0;
        if (progress > 0.8) {
            opacity = 1.0 - ((progress - 0.8) / 0.2); // Fade 1.0 -> 0.0
        }
        
        // Flickering effect
        const flicker = Math.sin(this.animationTimer * 2 + this.flickerPhase);
        const flickerOpacity = opacity * (0.9 + flicker * 0.1);
        
        // Darker gray smoke (darker than gun smoke)
        // Outer layer
        const outerGray = 60 + Math.floor(progress * 40); // 60-100 (darker)
        ctx.fillStyle = `rgba(${outerGray}, ${outerGray}, ${outerGray}, ${flickerOpacity * 0.4})`;
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.currentRadius * 1.2, 0, Math.PI * 2);
        ctx.fill();
        
        // Main layer
        const mainGray = 70 + Math.floor(progress * 50); // 70-120
        ctx.fillStyle = `rgba(${mainGray}, ${mainGray}, ${mainGray}, ${flickerOpacity * 0.5})`;
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.currentRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner lighter core
        const coreGray = 90 + Math.floor(progress * 60); // 90-150
        ctx.fillStyle = `rgba(${coreGray}, ${coreGray}, ${coreGray}, ${flickerOpacity * 0.3})`;
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.currentRadius * 0.5, 0, Math.PI * 2);
        ctx.fill();
    }
}

class SmokeManager {
    constructor() {
        this.smokeClouds = [];
    }

    addSmoke(x, y, windDirection, windSpeed) {
        const smoke = new SmokeCloud(x, y, windDirection, windSpeed);
        this.smokeClouds.push(smoke);
        return smoke;
    }

    updateAll(deltaTime, mapWidth = 5000, mapHeight = 5000) {
        // Update all smoke clouds, remove expired ones
        for (let i = this.smokeClouds.length - 1; i >= 0; i--) {
            const stillAlive = this.smokeClouds[i].update(deltaTime, mapWidth, mapHeight);
            
            if (!stillAlive) {
                const smoke = this.smokeClouds[i];
                console.log(`Smoke ${smoke.id} dissipated at (${Math.floor(smoke.x)}, ${Math.floor(smoke.y)})`);
                this.smokeClouds.splice(i, 1);
            }
        }
    }

    drawAll(ctx, camera) {
        for (const smoke of this.smokeClouds) {
            smoke.draw(ctx, camera);
        }
    }

    getAllSmoke() {
        return this.smokeClouds;
    }

    clear() {
        this.smokeClouds = [];
        console.log('All smoke clouds cleared');
    }
}

// Global instance
const smokeManager = new SmokeManager();