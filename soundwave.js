// Soundwave implementation

// Toggle visibility (key: x, default: off)
let showSoundwaves = false;

class Soundwave {
    static nextID = 0;

    constructor(x, y, loudeness) {
        this.id = Soundwave.nextID++;
        this.x = x;
        this.y = y;
        this.expansionSpeed = 343; // pixels per second
        this.loudeness = loudeness;

        this.currentRadius = 0; // starts at 0 and expands
        this.maxRadius = this.loudeness * 100; // at loudeness=1: 100px, at 0.5: 50px, etc.
        this.isExpired = false;
        this.age = 0; // Time since creation in seconds

        // Track affected entities/cannons to prevent multiple triggers per soundwave
        this.affectedEntityIds = new Set();
        this.affectedCannonIds = new Set();
    }

    update(deltaTime) {
        // Track age
        this.age += deltaTime;

        // Expand the radius based on expansion speed
        this.currentRadius += this.expansionSpeed * deltaTime;

        // Check if soundwave has reached max radius
        if (this.currentRadius >= this.maxRadius) {
            this.isExpired = true;
        }
    }

    applySound(entities, cannons) { // entities and cannons (with crew!) turn towards sound source when hit by the sound wave
        // Process entities
        for (const entity of entities) {
            // Skip if already affected by this soundwave
            if (this.affectedEntityIds.has(entity.id)) continue;

            // Calculate distance from soundwave origin to entity
            const dx = entity.x - this.x;
            const dy = entity.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Check if entity is within the current radius (just touched)
            if (distance <= this.currentRadius) {
                this.affectedEntityIds.add(entity.id);
                this.applyTurnToEntity(entity);
            }
        }

        // Process cannons
        for (const cannon of cannons) {
            // Skip if already affected by this soundwave
            if (this.affectedCannonIds.has(cannon.id)) continue;

            // Calculate distance from soundwave origin to cannon
            const dx = cannon.x - this.x;
            const dy = cannon.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Check if cannon is within the current radius (just touched)
            if (distance <= this.currentRadius) {
                this.affectedCannonIds.add(cannon.id);
                this.applyTurnToCannon(cannon);
            }
        }
    }

    applyTurnToEntity(entity) {
        // Exclusion conditions - entity should NOT turn if any of these are true
        if (entity.stance === 'defensive') return;
        if (entity.isPanicking === true) return;
        if (entity.isDying === true) return;
        if (entity.isMoving === true) return;
        if (entity.lockedTarget !== null) return;
        if (entity.isCrewMember === true) return; // Crew members are busy with the cannon

        // Calculate angle from entity to sound source
        const dx = this.x - entity.x;
        const dy = this.y - entity.y;
        const angleToSound = Math.atan2(dy, dx);

        // Trigger rotation toward sound
        entity.targetHeading = angleToSound;
        entity.isRotating = true;
    }

    applyTurnToCannon(cannon) {
        // Must have crew to turn
        if (cannon.crewIds.length === 0) return;

        // Skip dying cannons
        if (cannon.isDying === true) return;

        // Skip if locked onto an enemy
        if (cannon.lockedTarget !== null) return;

        // Skip if reloading (was just shooting at something)
        if (cannon.isReloading === true) return;

        // Calculate angle from cannon to sound source
        const dx = this.x - cannon.x;
        const dy = this.y - cannon.y;
        const angleToSound = Math.atan2(dy, dx);

        // Trigger rotation toward sound
        cannon.targetHeading = angleToSound;
        cannon.isRotating = true;
    }

    draw(ctx, camera) { // draw toggle key: x, default: no show
        if (!showSoundwaves) return;

        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;

        // Draw hollow white circle
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.currentRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

class SoundwaveManager {
    constructor() {
        this.soundwaves = [];
        this.maxSoundwaves = 10;
    }

    // Check if a similar soundwave was recently emitted nearby
    hasRecentNearbySoundwave(x, y, loudeness) {
        for (const sw of this.soundwaves) {
            // Must be within 1 second old
            if (sw.age > 1.0) continue;

            // Must be same size or larger
            if (sw.loudeness < loudeness) continue;

            // Must be within 100px
            const dx = sw.x - x;
            const dy = sw.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance <= 100) {
                return true;
            }
        }
        return false;
    }

    createSoundwave(x, y, loudeness) {
        // Cancel if a larger/same-size soundwave was emitted nearby recently
        if (this.hasRecentNearbySoundwave(x, y, loudeness)) {
            return null;
        }

        // Remove oldest soundwave if at capacity
        if (this.soundwaves.length >= this.maxSoundwaves) {
            this.soundwaves.shift();
        }

        const soundwave = new Soundwave(x, y, loudeness);
        this.soundwaves.push(soundwave);
        return soundwave;
    }

    updateAll(deltaTime, entities, cannons) {
        // Update all soundwaves
        for (const soundwave of this.soundwaves) {
            soundwave.update(deltaTime);
            soundwave.applySound(entities, cannons);
        }

        // Remove expired soundwaves
        this.soundwaves = this.soundwaves.filter(sw => !sw.isExpired);
    }

    drawAll(ctx, camera) {
        for (const soundwave of this.soundwaves) {
            soundwave.draw(ctx, camera);
        }
    }
}

// Global instance
const soundwaveManager = new SoundwaveManager();

// Console command to test soundwaves
// Usage: testSoundwave(x, y, loudeness) - creates a soundwave at position (x, y) with given loudeness
// Example: testSoundwave(500, 500, 1) - creates a soundwave at (500, 500) that expands to 100px radius
window.testSoundwave = function(x, y, loudeness = 1) {
    const sw = soundwaveManager.createSoundwave(x, y, loudeness);
    if (sw) {
        console.log(`Created soundwave #${sw.id} at (${x}, ${y}) with loudeness=${loudeness}, maxRadius=${sw.maxRadius}px`);
    } else {
        console.log(`Soundwave cancelled - similar soundwave already nearby`);
    }
    return sw;
};