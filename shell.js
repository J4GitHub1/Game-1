// Shell Management System

class Shell {
    static nextId = 0;

    constructor(x, y, aimX, aimY, shellType, explosionSize, faction) {
        this.id = Shell.nextId++;
        this.x = x;
        this.y = y;
        this.aimX = aimX;
        this.aimY = aimY;
        this.shellType = shellType; // "cannon_shell" or "mortar_shell"
        this.explosionSize = explosionSize;
        this.faction = faction;

        // Speed based on shell type
        this.baseSpeed = 480; // px/s
        this.speed = shellType === 'mortar_shell' ? this.baseSpeed / 2 : this.baseSpeed;

        // Calculate direction
        const dx = aimX - x;
        const dy = aimY - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        this.dirX = dist > 0 ? dx / dist : 0;
        this.dirY = dist > 0 ? dy / dist : 0;

        // Track distance traveled (for 100px immunity)
        this.distanceTraveled = 0;

        // Store origin and target elevation for cannon_shell terrain check
        this.originElevation = typeof TerrainManager !== 'undefined' ? TerrainManager.getHeightAt(x, y) : 0;
        this.targetElevation = typeof TerrainManager !== 'undefined' ? TerrainManager.getHeightAt(aimX, aimY) : 0;

        this.isDead = false;

        // Trail system - store previous positions
        this.trail = [];
        this.maxTrailLength = 15; // Number of trail segments
        this.trailUpdateTimer = 0;
        this.trailUpdateInterval = 0.02; // Add trail point every 20ms

        // Calculate heading angle for drawing oriented shell
        this.heading = Math.atan2(dy, dx);

        console.log(`Shell ${this.id} (${shellType}) spawned at (${Math.floor(x)}, ${Math.floor(y)}) → (${Math.floor(aimX)}, ${Math.floor(aimY)})`);
    }

    update(deltaTime, entities) {
        if (this.isDead) return false;

        // Update trail system
        this.trailUpdateTimer += deltaTime;
        if (this.trailUpdateTimer >= this.trailUpdateInterval) {
            this.trailUpdateTimer = 0;
            // Add current position to trail
            this.trail.push({ x: this.x, y: this.y });
            // Remove oldest trail points if exceeding max length
            while (this.trail.length > this.maxTrailLength) {
                this.trail.shift();
            }
        }

        // Move shell
        const moveX = this.dirX * this.speed * deltaTime;
        const moveY = this.dirY * this.speed * deltaTime;
        this.x += moveX;
        this.y += moveY;
        this.distanceTraveled += Math.sqrt(moveX * moveX + moveY * moveY);

        // Check for explosion conditions based on shell type
        if (this.shellType === 'cannon_shell') {
            // Check terrain elevation (>2m above BOTH origin AND target = explode)
            if (typeof TerrainManager !== 'undefined') {
                const currentElevation = TerrainManager.getHeightAt(this.x, this.y);
                if (currentElevation > this.originElevation + 2 && currentElevation > this.targetElevation + 2) {
                    this.explode();
                    return false;
                }

                // Check wall collision (always, even in first 100px)
                const terrain = TerrainManager.getTerrainType(this.x, this.y);
                if (terrain === 'wall') {
                    this.explode();
                    return false;
                }
            }

            // Check entity collision (after 100px)
            if (this.distanceTraveled > 100) {
                for (const entity of entities) {
                    if (entity.isDying) continue;
                    const dx = entity.x - this.x;
                    const dy = entity.y - this.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < entity.radius + 3) { // Shell radius ~3
                        this.explode();
                        return false;
                    }
                }

                // Check cannon collision
                if (typeof cannonManager !== 'undefined') {
                    for (const cannon of cannonManager.cannons) {
                        if (cannon.isDying) continue;
                        const dx = cannon.x - this.x;
                        const dy = cannon.y - this.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist < cannon.radius + 3) {
                            this.explode();
                            return false;
                        }
                    }
                }
            }
        }

        // Check arrival at target (both shell types)
        const distToTarget = Math.sqrt(
            (this.aimX - this.x) ** 2 + (this.aimY - this.y) ** 2
        );
        if (distToTarget < 5) {
            this.explode();
            return false;
        }

        // Check shell vs shell collision (both types)
        if (typeof shellManager !== 'undefined') {
            for (const other of shellManager.shells) {
                if (other.id === this.id || other.isDead) continue;
                const dx = other.x - this.x;
                const dy = other.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 6) { // Both shells have radius ~3
                    other.explode();
                    this.explode();
                    return false;
                }
            }
        }

        // Check if shell went past target (overshot)
        const toTargetX = this.aimX - this.x;
        const toTargetY = this.aimY - this.y;
        const dotProduct = toTargetX * this.dirX + toTargetY * this.dirY;
        if (dotProduct < 0) {
            // Shell passed the target
            this.explode();
            return false;
        }

        return true; // Shell still active
    }

    explode() {
        if (this.isDead) return;
        this.isDead = true;

        // Check for water splash
        if (typeof TerrainManager !== 'undefined') {
            const terrain = TerrainManager.getTerrainType(this.x, this.y);
            if (terrain === 'water') {
                // Water splash effect - no explosion
                this.spawnWaterSplash();
                console.log(`Shell ${this.id} splashed in water at (${Math.floor(this.x)}, ${Math.floor(this.y)})`);
                return;
            }
        }

        // Spawn explosion
        if (typeof explosionManager !== 'undefined') {
            explosionManager.addExplosion(this.x, this.y, this.explosionSize, true);
        }

        console.log(`Shell ${this.id} exploded at (${Math.floor(this.x)}, ${Math.floor(this.y)})`);
    }

    spawnWaterSplash() {
        // Create expanding/fading circles effect
        if (typeof shellManager !== 'undefined') {
            shellManager.addWaterSplash(this.x, this.y);
        }
    }

    draw(ctx, camera) {
        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;

        // Draw trail based on shell type
        if (this.shellType === 'mortar_shell') {
            // Mortar shell: fiery trail with flickering particles
            if (this.trail.length > 0) {
                for (let i = 0; i < this.trail.length; i++) {
                    const p = this.trail[i];
                    const progress = i / this.trail.length;

                    // Fire colors: yellow core -> orange -> red -> dark smoke
                    const baseRadius = 2 + progress * 4;
                    const pX = p.x - camera.x;
                    const pY = p.y - camera.y;

                    // Add slight random offset for flickering effect
                    const flickerX = (Math.random() - 0.5) * 2;
                    const flickerY = (Math.random() - 0.5) * 2;

                    // Outer glow (red/orange)
                    const outerOpacity = (1 - progress * 0.7) * 0.4;
                    ctx.fillStyle = `rgba(255, ${80 + progress * 60}, 0, ${outerOpacity})`;
                    ctx.beginPath();
                    ctx.arc(pX + flickerX, pY + flickerY, baseRadius * 1.5, 0, Math.PI * 2);
                    ctx.fill();

                    // Inner core (yellow/orange)
                    const innerOpacity = (1 - progress * 0.5) * 0.6;
                    ctx.fillStyle = `rgba(255, ${150 + progress * 50}, ${50 * progress}, ${innerOpacity})`;
                    ctx.beginPath();
                    ctx.arc(pX + flickerX * 0.5, pY + flickerY * 0.5, baseRadius, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Draw bright core at shell position
                ctx.fillStyle = 'rgba(255, 200, 50, 0.8)';
                ctx.beginPath();
                ctx.arc(screenX, screenY, 4, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = 'rgba(255, 255, 150, 0.9)';
                ctx.beginPath();
                ctx.arc(screenX, screenY, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        } else {
            // Cannon shell: smoke trail (original behavior)
            if (this.trail.length > 1) {
                for (let i = 0; i < this.trail.length - 1; i++) {
                    const p1 = this.trail[i];
                    const p2 = this.trail[i + 1];

                    // Calculate opacity (older = more transparent)
                    const opacity = (i / this.trail.length) * 0.6;

                    // Calculate line width (older = thinner)
                    const lineWidth = 1 + (i / this.trail.length) * 2;

                    ctx.strokeStyle = `rgba(100, 100, 100, ${opacity})`;
                    ctx.lineWidth = lineWidth;
                    ctx.beginPath();
                    ctx.moveTo(p1.x - camera.x, p1.y - camera.y);
                    ctx.lineTo(p2.x - camera.x, p2.y - camera.y);
                    ctx.stroke();
                }

                // Draw line from last trail point to current position
                if (this.trail.length > 0) {
                    const lastTrail = this.trail[this.trail.length - 1];
                    ctx.strokeStyle = 'rgba(100, 100, 100, 0.6)';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.moveTo(lastTrail.x - camera.x, lastTrail.y - camera.y);
                    ctx.lineTo(screenX, screenY);
                    ctx.stroke();
                }
            }
        }

        // Draw shell as oriented elongated shape (bullet-like)
        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.rotate(this.heading);

        if (this.shellType === 'mortar_shell') {
            // Mortar shell: rounder, darker with fiery glow
            ctx.fillStyle = 'rgb(40, 40, 40)';
            ctx.beginPath();
            ctx.arc(0, 0, 4, 0, Math.PI * 2);
            ctx.fill();

            // Fiery rim
            ctx.strokeStyle = 'rgba(255, 150, 50, 0.6)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, 5, 0, Math.PI * 2);
            ctx.stroke();
        } else {
            // Cannon shell: elongated bullet shape (original)
            ctx.fillStyle = 'rgb(60, 60, 60)';
            ctx.beginPath();
            ctx.ellipse(0, 0, 6, 3, 0, 0, Math.PI * 2);
            ctx.fill();

            // Shell tip (pointed front)
            ctx.fillStyle = 'rgb(80, 80, 80)';
            ctx.beginPath();
            ctx.moveTo(6, 0);
            ctx.lineTo(3, -2);
            ctx.lineTo(3, 2);
            ctx.closePath();
            ctx.fill();

            // Highlight on top
            ctx.fillStyle = 'rgba(150, 150, 150, 0.5)';
            ctx.beginPath();
            ctx.ellipse(-1, -1, 3, 1, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}

class WaterSplash {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.rings = [
            { radius: 5, opacity: 0.8 },
            { radius: 3, opacity: 0.6 },
            { radius: 1, opacity: 0.4 }
        ];
        this.expandSpeed = 30; // px/s
        this.fadeSpeed = 0.8; // opacity/s
        this.maxRadius = 40;
    }

    update(deltaTime) {
        let anyVisible = false;
        for (const ring of this.rings) {
            ring.radius += this.expandSpeed * deltaTime;
            ring.opacity -= this.fadeSpeed * deltaTime;
            if (ring.opacity > 0) anyVisible = true;
        }
        return anyVisible;
    }

    draw(ctx, camera) {
        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;

        for (const ring of this.rings) {
            if (ring.opacity <= 0) continue;
            ctx.strokeStyle = `rgba(150, 200, 255, ${ring.opacity})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(screenX, screenY, ring.radius, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
}

class ShellManager {
    constructor() {
        this.shells = [];
        this.waterSplashes = [];
    }

    addShell(x, y, aimX, aimY, shellType, explosionSize, faction) {
        const shell = new Shell(x, y, aimX, aimY, shellType, explosionSize, faction);
        this.shells.push(shell);

        // Create soundwave where shell spawns (cannon firing sound)
        soundwaveManager.createSoundwave(x, y, 10);

        return shell;
    }

    addWaterSplash(x, y) {
        this.waterSplashes.push(new WaterSplash(x, y));
    }

    updateAll(deltaTime, entities) {
        this.shells = this.shells.filter(shell => shell.update(deltaTime, entities));
        this.waterSplashes = this.waterSplashes.filter(splash => splash.update(deltaTime));
    }

    drawAll(ctx, camera) {
        for (const shell of this.shells) {
            shell.draw(ctx, camera);
        }
        for (const splash of this.waterSplashes) {
            splash.draw(ctx, camera);
        }
    }

    clear() {
        this.shells = [];
        this.waterSplashes = [];
    }
}

// Global instance
const shellManager = new ShellManager();
