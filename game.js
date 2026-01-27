let frameCount = 0;
let fpsUpdateTime = performance.now();
let currentFPS = 60;

// Get the canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ===== CANVAS SETUP WITH DPR HANDLING =====
let canvasDPR = 1;

function setupCanvas() {
    canvasDPR = window.devicePixelRatio || 1;
    const cssWidth = window.innerWidth;
    const cssHeight = window.innerHeight;

    canvas.width = cssWidth * canvasDPR;
    canvas.height = cssHeight * canvasDPR;
    canvas.style.width = '100%';
    canvas.style.height = '100%';

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(canvasDPR, canvasDPR);
}

setupCanvas();

// Initialize UI Manager
initUIManager();

// Handle resize
window.addEventListener('resize', () => {
    setupCanvas();
});

// Map dimensions
const MAP_WIDTH = 5000;
const MAP_HEIGHT = 5000;

// Camera position
let camera = {
    x: 0,
    y: 0
};

// Camera movement speed
const CAMERA_SPEED = 8;

// Background image
let backgroundImage = null;

// Terrain System
let terrainImageData = null; // Stores pixel data for terrain height calculation
let terrainWidth = 0;
let terrainHeight = 0;
let obstacleCanvas = null; // Pre-rendered obstacle overlay
let obstacleCtx = null;

// Terrain Manager - queries terrain at any position
const TerrainManager = {
    // Get terrain height at world coordinates (returns 0-25)
    getHeightAt(x, y) {
        if (!terrainImageData || x < 0 || y < 0 || x >= terrainWidth || y >= terrainHeight) {
            return 0;
        }
        
        const pixelX = Math.floor(x);
        const pixelY = Math.floor(y);
        const index = (pixelY * terrainWidth + pixelX) * 4;
        
        const r = terrainImageData.data[index];
        const g = terrainImageData.data[index + 1];
        const b = terrainImageData.data[index + 2];
        
        // Check if grayscale (R = G = B)
        if (r === g && g === b) {
            // Grayscale terrain - calculate height
            return Math.floor(r / 10);
        } else {
            // Non-grayscale terrain - height is 0
            return 0;
        }
    },
    
    // Check if position is on a specific terrain type
    getTerrainType(x, y) {
        if (!terrainImageData || x < 0 || y < 0 || x >= terrainWidth || y >= terrainHeight) {
            return 'unknown';
        }
        
        const pixelX = Math.floor(x);
        const pixelY = Math.floor(y);
        const index = (pixelY * terrainWidth + pixelX) * 4;
        
        const r = terrainImageData.data[index];
        const g = terrainImageData.data[index + 1];
        const b = terrainImageData.data[index + 2];
        
        // Check for red (wall) - allow JPEG artifacts
        // Pure red: high R, low G and B
        if (r > 200 && g < 50 && b < 50) {
            return 'wall';
        }
        
        // Check for blue (water) - allow JPEG artifacts  
        // Pure blue: low R and G, high B
        if (r < 50 && g < 50 && b > 200) {
            return 'water';
        }
        
        // Check if grayscale
        if (r === g && g === b) {
            return 'terrain';
        }
        
        return 'unknown';
    }
};

// Group tabs update throttle
let groupTabsUpdateTimer = 0;
const groupTabsUpdateInterval = 1.0; // Update once per second

// Flow Field 
let showFlowField = false;
let debugFlowField = null;

// FOV visualization
let showFOVs = false;

// Objective Cone visualization
let showObjectiveCones = false;

// Retreat Cone visualization
let showRetreatCones = false;

// Bullet ray visualization
let showBulletRays = false;

// Heatmap visualization
let showHeatmap = false;

// Formation movement with arrows
let formationMoveDistance = 0;
let formationMoveAngle = 0;
let isFormationMoving = false;
let formationMoveIsValid = true;

// Cannon movement with arrows
let cannonMoveDistance = 0;
let cannonMoveAngle = 0;
let isCannonMoving = false;
let cannonMoveIsValid = true;

// Keyboard state
const keys = {};

// Mouse drag state
let isDraggingMap = false;
let isSelecting = false;
let selectionStartX = 0;
let selectionStartY = 0;
let selectionCurrentX = 0;
let selectionCurrentY = 0;
let dragStartX = 0;
let dragStartY = 0;
let dragCameraStartX = 0;
let dragCameraStartY = 0;

// Selection mode
let selectRedMode = false; // Track if shift is held during selection

// Right-click hold to move
let rightClickHoldStart = null;
let rightClickHoldX = 0;
let rightClickHoldY = 0;
let isHoldingRightClick = false;

// Formation rotation/scaling
let isRotatingFormation = false;
let isScalingFormation = false;
let rotationStartAngle = 0;
let scaleStartDistance = 0;
let scaleStartValue = 1.0;

// Track mouse position
let lastMouseX = 0;
let lastMouseY = 0;

// Spawn mode
let spawnMode = false;
let spawnEquipment = null;
let spawnTroopCount = 1;
let placeholderX = 0;
let placeholderY = 0;

// Enemy spawn mode
let enemySpawnMode = false;
let enemySpawnEquipment = null;
let enemySpawnTroopCount = 10;
let enemySpawnGroupName = '';

// Objective spawn mode
let objectiveSpawnMode = false;
let objectiveSpawnType = 'none';

// Explosion spawn mode
let explosionSpawnMode = false;
let explosionSize = 1.0;
let explosionBurn = true;

// God menu state
let godMenuOpen = false;
let godMenuSelectedItem = null; // 'fire', etc.

// Wind system
let windDirection = 0; // -1 to 1 slider value
let windSpeed = 0; // 0 to 1

// Time tracking
let lastTime = performance.now();

// UI elements
const unitInfoWindow = document.getElementById('unitInfoWindow');
const infoRanged = document.getElementById('infoRanged');
const infoMelee = document.getElementById('infoMelee');
const infoArmor = document.getElementById('infoArmor');
const infoHealth = document.getElementById('infoHealth');
const infoSpeed = document.getElementById('infoSpeed');
const infoTerrainHeight = document.getElementById('infoTerrainHeight');
const infoDistress = document.getElementById('infoDistress');
const infoStance = document.getElementById('infoStance');
const infoMagazine = document.getElementById('infoMagazine');
const infoCrewStatus = document.getElementById('infoCrewStatus');

// Object info panel elements
const objectInfoWindow = document.getElementById('objectInfoWindow');
const objectInfoType = document.getElementById('objectInfoType');
const objectInfoId = document.getElementById('objectInfoId');
const objectInfoFaction = document.getElementById('objectInfoFaction');
const objectInfoHealth = document.getElementById('objectInfoHealth');
const objectInfoCrew = document.getElementById('objectInfoCrew');
const objectInfoSpeed = document.getElementById('objectInfoSpeed');
const objectInfoStatus = document.getElementById('objectInfoStatus');

const groupButton = document.getElementById('groupButton');
const groupTabsContainer = document.getElementById('groupTabsContainer');
const groupNameWindow = document.getElementById('groupNameWindow');
const groupNameInput = document.getElementById('groupNameInput');
const createGroupBtn = document.getElementById('createGroupBtn');

function updateUnitInfo() {
    const selected = entityManager.selectedEntities;
    const selectedCannon = cannonManager.getSelectedCannon();

    // Check if a cannon is selected - use object info panel
    if (selectedCannon) {
        // Hide unit info, show object info
        unitInfoWindow.classList.add('hidden');
        objectInfoWindow.classList.remove('hidden');
        groupButton.classList.add('hidden');
        entityManager.formationPreview.active = false;

        // Display cannon info in object panel
        objectInfoType.textContent = selectedCannon.getTypeName();
        objectInfoId.textContent = `#${selectedCannon.id}`;

        // Faction with color
        const factionNames = { 'none': 'Neutral', 'blue': 'Blue', 'red': 'Red' };
        objectInfoFaction.textContent = factionNames[selectedCannon.faction] || selectedCannon.faction;
        if (selectedCannon.faction === 'blue') {
            objectInfoFaction.style.color = 'rgb(100, 150, 255)';
        } else if (selectedCannon.faction === 'red') {
            objectInfoFaction.style.color = 'rgb(255, 100, 100)';
        } else {
            objectInfoFaction.style.color = 'white';
        }

        // Health
        objectInfoHealth.textContent = `${Math.round(selectedCannon.health)} / ${selectedCannon.maxHealth}`;

        // Crew count
        objectInfoCrew.textContent = `${selectedCannon.crewIds.length} / ${selectedCannon.maxCrew}`;

        // Speed (calculated from crew)
        const cannonSpeed = selectedCannon.calculateMovementSpeed();
        if (cannonSpeed > 0) {
            objectInfoSpeed.textContent = `${cannonSpeed.toFixed(1)} px/s`;
            objectInfoSpeed.style.color = 'white';
        } else {
            objectInfoSpeed.textContent = 'Immobile';
            objectInfoSpeed.style.color = 'rgb(150, 150, 150)';
        }

        // Status based on reload state, crew and health
        if (selectedCannon.isReloading) {
            if (selectedCannon.crewIds.length === 0) {
                objectInfoStatus.textContent = 'NO CREW';
                objectInfoStatus.style.color = 'rgb(255, 100, 100)'; // Red
            } else {
                // Show reload progress
                const remainingTime = selectedCannon.reloadDuration - selectedCannon.reloadTimer;
                objectInfoStatus.textContent = `Reloading: ${remainingTime.toFixed(1)}s`;
                objectInfoStatus.style.color = 'rgb(255, 200, 100)'; // Orange
            }
        } else if (selectedCannon.isLoaded) {
            if (selectedCannon.crewIds.length === selectedCannon.maxCrew) {
                if (selectedCannon.health < selectedCannon.maxHealth) {
                    objectInfoStatus.textContent = 'Repairing (LOADED)';
                    objectInfoStatus.style.color = 'rgb(100, 255, 100)'; // Green
                } else {
                    objectInfoStatus.textContent = 'LOADED';
                    objectInfoStatus.style.color = 'rgb(100, 255, 100)'; // Green
                }
            } else if (selectedCannon.faction !== 'none') {
                objectInfoStatus.textContent = 'Recruiting (LOADED)';
                objectInfoStatus.style.color = 'rgb(255, 200, 100)'; // Orange
            } else {
                objectInfoStatus.textContent = 'Unclaimed';
                objectInfoStatus.style.color = 'white';
            }
        } else {
            objectInfoStatus.textContent = 'Ready';
            objectInfoStatus.style.color = 'white';
        }

        // Show hold fire HUD for friendly cannons (cannon mode - only hold fire button)
        const stanceHUD = document.getElementById('stanceHUD');
        if (selectedCannon.faction === 'blue') {
            stanceHUD.classList.remove('hidden');
            stanceHUD.classList.add('cannon-mode');
            updateHoldFireButton();
        } else {
            stanceHUD.classList.add('hidden');
        }

        updateFormationBrowserVisibility();
        return;
    }

    // No cannon selected - hide object info panel
    objectInfoWindow.classList.add('hidden');

    if (selected.length === 0) {
        unitInfoWindow.classList.add('hidden');
        groupButton.classList.add('hidden');
        entityManager.formationPreview.active = false;
    } else if (selected.length === 1) {
        unitInfoWindow.classList.remove('hidden');
        groupButton.classList.add('hidden');
        entityManager.formationPreview.active = false;
        
        const entity = selected[0];
        const rangedName = entity.equipment.ranged ? entity.equipment.ranged.display_name : 'None';
        const meleeName = entity.equipment.melee ? entity.equipment.melee.display_name : 'None';
        const armorName = entity.equipment.armor ? entity.equipment.armor.display_name : 'None';
        
        infoRanged.textContent = rangedName;
        infoMelee.textContent = meleeName;
        infoArmor.textContent = armorName;
        infoHealth.textContent = Math.round(entity.health) + ' / 100';
        infoSpeed.textContent = entity.movement_speed.toFixed(2) + ' px/s';
        infoTerrainHeight.textContent = entity.elevation + 'm';
    
        // Color-code distress display
        const distressValue = Math.round(entity.distress);
        infoDistress.textContent = distressValue;
        
        // Change color based on distress level
        const distressElement = document.getElementById('infoDistress');
        if (distressValue >= 75) {
            distressElement.style.color = 'rgb(255, 100, 100)'; // Red
        } else if (distressValue >= 50) {
            distressElement.style.color = 'rgb(255, 200, 100)'; // Orange
        } else if (distressValue >= 25) {
            distressElement.style.color = 'rgb(255, 255, 100)'; // Yellow
        } else {
            distressElement.style.color = 'white'; // Normal
        }
        
        // Display stance
        const stanceNames = {
            'defensive': 'Defensive',
            'none': 'None',
            'offensive': 'Offensive'
        };

        infoStance.textContent = stanceNames[entity.stance] || entity.stance;
        infoStance.textContent = entity.stance.charAt(0).toUpperCase() + entity.stance.slice(1);
    
        // Magazine display - NEW BLOCK
        if (entity.isReloading) {
            const reloadTime = entity.ranged_reloading_time * (1 + (entity.distress / 100)); // CHECK IF WORKED 
            const remainingTime = (reloadTime - entity.reloadTimer).toFixed(1);
            infoMagazine.textContent = `Reloading... ${remainingTime}s`;
        } else if (entity.ranged_magazine_max > 0) {
            infoMagazine.textContent = `${entity.ranged_magazine_current}/${entity.ranged_magazine_max}`;
        } else {
            infoMagazine.textContent = 'No ranged weapon';
        }
        
        // Smoke cloud count display
        const infoSmoke = document.getElementById('infoSmoke');
        if (infoSmoke) {
            if (entity.smokeCloudCount > 0) {
                infoSmoke.textContent = entity.smokeCloudCount;
                infoSmoke.style.color = 'rgb(255, 200, 100)'; // Orange warning
            } else {
                infoSmoke.textContent = '0';
                infoSmoke.style.color = 'white';
            }
        }

        // Crew status display
        if (infoCrewStatus) {
            if (entity.isCrewMember && entity.assignedCannonId !== null) {
                infoCrewStatus.textContent = `Cannon #${entity.assignedCannonId}`;
                infoCrewStatus.style.color = 'rgb(255, 0, 255)'; // Magenta
            } else {
                infoCrewStatus.textContent = 'None';
                infoCrewStatus.style.color = 'white';
            }
        }

    } else {
        // Multiple units selected
        unitInfoWindow.classList.add('hidden');
        
        // Check if ANY selected entities are enemies
        const hasEnemies = selected.some(e => e.faction === 'red');
        
        if (hasEnemies) {
            groupButton.classList.add('hidden');
        } else {
            groupButton.classList.remove('hidden');
        }
    }
    
        // Show/hide stance HUD
    const stanceHUD = document.getElementById('stanceHUD');
    if (selected.length > 0) {
        // Check if all selected are friendly
        const allFriendly = selected.every(e => e.faction === 'blue');
        // Check if all selected are crew members (crew can't change stance)
        const allCrewMembers = selected.every(e => e.isCrewMember);

        if (allFriendly && !allCrewMembers) {
            stanceHUD.classList.remove('hidden');
            stanceHUD.classList.remove('cannon-mode'); // Show full HUD for units
            updateStanceButtons();
        } else {
            stanceHUD.classList.add('hidden');
        }
    } else {
        stanceHUD.classList.add('hidden');
    }

    updateFormationBrowserVisibility();
}

function updateStanceButtons() {
    const selected = entityManager.selectedEntities;
    if (selected.length === 0) return;
    
    // Get the stance of the first selected unit
    const currentStance = selected[0].stance;
    
    // Update button active states
    document.getElementById('stanceDefensiveBtn').classList.remove('active');
    document.getElementById('stanceNoneBtn').classList.remove('active');
    document.getElementById('stanceOffensiveBtn').classList.remove('active');
    
    // Highlight the current stance button
    if (currentStance === 'defensive') {
        document.getElementById('stanceDefensiveBtn').classList.add('active');
    } else if (currentStance === 'none') {
        document.getElementById('stanceNoneBtn').classList.add('active');
    } else if (currentStance === 'offensive') {
        document.getElementById('stanceOffensiveBtn').classList.add('active');
    }

    // Also update hold fire button state
    updateHoldFireButton();
}

function updateGroupTabs() {
    groupTabsContainer.innerHTML = '';

    // Separate friendly and enemy groups
    const friendlyGroups = [];
    const enemyGroups = [];

    for (const group of entityManager.groups) { //ASK CLAUDE
        let faction = 'blue'; // default

        if (group.isCannonCrewGroup) {
            // Get faction from linked cannon
            const cannon = cannonManager.cannons.find(c => c.id === group.linkedCannonId);
            faction = cannon?.faction ?? 'none';
            // Skip if cannon is neutral (shouldn't happen but just in case)
            if (faction === 'none') continue;
        } else {
            // Normal group - check first entity
            const groupEntities = group.getEntities(entityManager);
            if (groupEntities.length === 0) continue;
            faction = groupEntities[0].faction;
        }

        if (faction === 'red') {
            enemyGroups.push(group);
        } else {
            friendlyGroups.push(group);
        }
    }

    // Create friendly group tabs
    for (const group of friendlyGroups) {
        const tab = document.createElement('div');
        tab.className = 'group-tab';
        tab.dataset.groupId = group.id;

        const name = document.createElement('span');
        name.className = 'group-tab-name';
        name.textContent = group.name;

        tab.appendChild(name);

        // Only add delete button for non-cannon-crew groups
        if (!group.isCannonCrewGroup) {
            const deleteBtn = document.createElement('span');
            deleteBtn.className = 'group-tab-delete';
            deleteBtn.textContent = 'x';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                entityManager.disbandGroup(group.id);
                updateGroupTabs();
                updateUnitInfo();
            });
            tab.appendChild(deleteBtn);
        }

        tab.addEventListener('click', (e) => {
            if (e.target.classList.contains('group-tab-delete')) return;
            console.log(`Tab clicked for group ${group.id}`);
            entityManager.selectGroup(group.id);
            updateUnitInfo();
        });

        groupTabsContainer.appendChild(tab);
    }

    // Create enemy group tabs (below friendly tabs)
    for (const group of enemyGroups) {
        const tab = document.createElement('div');
        tab.className = 'group-tab enemy';
        tab.dataset.groupId = group.id;

        const name = document.createElement('span');
        name.className = 'group-tab-name';
        name.textContent = group.name;

        tab.appendChild(name);

        // Only add delete button for non-cannon-crew groups
        if (!group.isCannonCrewGroup) {
            const deleteBtn = document.createElement('span');
            deleteBtn.className = 'group-tab-delete';
            deleteBtn.textContent = 'x';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                entityManager.disbandGroup(group.id);
                updateGroupTabs();
                updateUnitInfo();
            });
            tab.appendChild(deleteBtn);
        }

        tab.addEventListener('click', (e) => {
            if (e.target.classList.contains('group-tab-delete')) return;
            console.log(`Tab clicked for enemy group ${group.id}`);
            entityManager.selectGroup(group.id);
            updateUnitInfo();
        });

        groupTabsContainer.appendChild(tab);
    }
}

async function init() {
    await equipmentLoader.loadAllEquipment();
    populateEquipmentDropdowns();

    // Initialize heatmap with map dimensions
    heatmapManager.initialize(MAP_WIDTH, MAP_HEIGHT);

    gameLoop();
}

function populateEquipmentDropdowns() {
    const rangedSelect = document.getElementById('rangedSelect');
    const meleeSelect = document.getElementById('meleeSelect');
    const armorSelect = document.getElementById('armorSelect');

    equipmentLoader.getEquipment('ranged').forEach(weapon => {
        const option = document.createElement('option');
        option.value = weapon.name;
        option.textContent = weapon.display_name;
        rangedSelect.appendChild(option);
    });

    equipmentLoader.getEquipment('melee').forEach(weapon => {
        const option = document.createElement('option');
        option.value = weapon.name;
        option.textContent = weapon.display_name;
        meleeSelect.appendChild(option);
    });

    equipmentLoader.getEquipment('armor').forEach(armor => {
        const option = document.createElement('option');
        option.value = armor.name;
        option.textContent = armor.display_name;
        armorSelect.appendChild(option);
    });
}

function drawBackground() {
    ctx.fillStyle = 'rgb(0, 0, 0)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.translate(-camera.x, -camera.y);
    
    if (backgroundImage) {
        ctx.drawImage(backgroundImage, 0, 0, MAP_WIDTH, MAP_HEIGHT);
    } else {
        ctx.fillStyle = 'rgb(0, 0, 0)';
        ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
    }
    
    ctx.restore();
}

function drawObstacles() {
    if (!obstacleCanvas) return;
    
    // Only draw visible portion of obstacle canvas
    const padding = 100;
    const sourceX = Math.max(0, Math.floor(camera.x - padding));
    const sourceY = Math.max(0, Math.floor(camera.y - padding));
    const sourceWidth = Math.min(obstacleCanvas.width - sourceX, canvas.width + padding * 2);
    const sourceHeight = Math.min(obstacleCanvas.height - sourceY, canvas.height + padding * 2);
    
    if (sourceWidth > 0 && sourceHeight > 0) {
        ctx.drawImage(
            obstacleCanvas,
            sourceX, sourceY, sourceWidth, sourceHeight,
            sourceX - camera.x, sourceY - camera.y, sourceWidth, sourceHeight
        );
    }
}

function generateObstacleOverlay() {
    if (!terrainImageData || !backgroundImage) return;
    
    console.log('Generating obstacle overlay...');
    const startTime = performance.now();
    
    let wallCount = 0;
    let waterCount = 0;
    
    // Create off-screen canvas for obstacles
    obstacleCanvas = document.createElement('canvas');
    obstacleCanvas.width = terrainWidth;
    obstacleCanvas.height = terrainHeight;
    obstacleCtx = obstacleCanvas.getContext('2d');
    
    // Sample every N pixels for performance
    const sampleRate = 3; // Lower = more detail, higher = faster
    
    for (let y = 0; y < terrainHeight; y += sampleRate) {
        for (let x = 0; x < terrainWidth; x += sampleRate) {
            const terrainType = TerrainManager.getTerrainType(x, y);
            
            if (terrainType === 'wall') {
                obstacleCtx.fillStyle = 'rgba(255, 0, 0, 0.4)';
                obstacleCtx.fillRect(x, y, sampleRate, sampleRate);
                wallCount++;
            } else if (terrainType === 'water') {
                obstacleCtx.fillStyle = 'rgba(0, 100, 255, 0.3)';
                obstacleCtx.fillRect(x, y, sampleRate, sampleRate);
                waterCount++;
            }
        }
    }
    
    const endTime = performance.now();
    console.log(`Obstacle overlay generated in ${(endTime - startTime).toFixed(0)}ms`);
    console.log(`Found ${wallCount} wall pixels and ${waterCount} water pixels`);
}

function drawPlaceholder() {
    if (spawnMode && placeholderX && placeholderY) {
        ctx.fillStyle = 'rgba(150, 150, 150, 0.5)';
        ctx.beginPath();
        ctx.arc(placeholderX, placeholderY, 8, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // God menu spawn preview
    if (godMenuSelectedItem && lastMouseX && lastMouseY) {
        const screenX = lastMouseX - camera.x;
        const screenY = lastMouseY - camera.y;
        
        if (godMenuSelectedItem === 'fire') {
            // Check terrain validity
            const terrainType = TerrainManager.getTerrainType(lastMouseX, lastMouseY);
            const isValid = terrainType !== 'wall' && terrainType !== 'water';
            
            const fireRadius = 6;
            
            // Outer glow
            ctx.fillStyle = isValid ? 'rgba(255, 140, 0, 0.3)' : 'rgba(150, 150, 150, 0.3)';
            ctx.beginPath();
            ctx.arc(screenX, screenY, fireRadius * 1.3, 0, Math.PI * 2);
            ctx.fill();
            
            // Main circle
            ctx.fillStyle = isValid ? 'rgba(255, 200, 0, 0.4)' : 'rgba(150, 150, 150, 0.4)';
            ctx.beginPath();
            ctx.arc(screenX, screenY, fireRadius, 0, Math.PI * 2);
            ctx.fill();
            
            // Center
            ctx.fillStyle = isValid ? 'rgba(255, 255, 255, 0.5)' : 'rgba(200, 200, 200, 0.5)';
            ctx.beginPath();
            ctx.arc(screenX, screenY, fireRadius * 0.5, 0, Math.PI * 2);
            ctx.fill();
            
            // Outline
            ctx.strokeStyle = isValid ? 'rgba(255, 0, 0, 0.8)' : 'rgba(255, 0, 0, 0.4)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(screenX, screenY, fireRadius, 0, Math.PI * 2);
            ctx.stroke();
            
            // Invalid X mark
            if (!isValid) {
                ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
                ctx.lineWidth = 3;
                const crossSize = 8;
                
                ctx.beginPath();
                ctx.moveTo(screenX - crossSize, screenY - crossSize);
                ctx.lineTo(screenX + crossSize, screenY + crossSize);
                ctx.moveTo(screenX + crossSize, screenY - crossSize);
                ctx.lineTo(screenX - crossSize, screenY + crossSize);
                ctx.stroke();
            }
        }

        else if (godMenuSelectedItem === 'smoke') {
            // Smoke preview (always valid, no terrain check)
            const smokeRadius = 20; // Preview size
            
            // Outer layer
            ctx.fillStyle = 'rgba(100, 100, 100, 0.3)';
            ctx.beginPath();
            ctx.arc(screenX, screenY, smokeRadius * 1.2, 0, Math.PI * 2);
            ctx.fill();
            
            // Main circle
            ctx.fillStyle = 'rgba(120, 120, 120, 0.4)';
            ctx.beginPath();
            ctx.arc(screenX, screenY, smokeRadius, 0, Math.PI * 2);
            ctx.fill();
            
            // Inner core
            ctx.fillStyle = 'rgba(140, 140, 140, 0.3)';
            ctx.beginPath();
            ctx.arc(screenX, screenY, smokeRadius * 0.5, 0, Math.PI * 2);
            ctx.fill();
        }
        
        else if (godMenuSelectedItem === 'explosion') {
            // Explosion preview (shows blast radius)
            const explosionRadius = 30; // Default size 1.0 = 30px radius
            
            // Outer shockwave ring
            ctx.strokeStyle = 'rgba(255, 200, 0, 0.5)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(screenX, screenY, explosionRadius * 1.3, 0, Math.PI * 2);
            ctx.stroke();
            
            // Main blast radius
            ctx.fillStyle = 'rgba(255, 140, 0, 0.2)';
            ctx.strokeStyle = 'rgba(255, 140, 0, 0.6)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(screenX, screenY, explosionRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            // Hot center
            ctx.fillStyle = 'rgba(255, 200, 0, 0.4)';
            ctx.beginPath();
            ctx.arc(screenX, screenY, explosionRadius * 0.6, 0, Math.PI * 2);
            ctx.fill();
            
            // White core
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.beginPath();
            ctx.arc(screenX, screenY, explosionRadius * 0.3, 0, Math.PI * 2);
            ctx.fill();
            
            // Crosshair at center
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
            ctx.lineWidth = 2;
            const crossSize = 8;
            ctx.beginPath();
            ctx.moveTo(screenX - crossSize, screenY);
            ctx.lineTo(screenX + crossSize, screenY);
            ctx.moveTo(screenX, screenY - crossSize);
            ctx.lineTo(screenX, screenY + crossSize);
            ctx.stroke();
        }

        else if (godMenuSelectedItem === 'shell') {
            // Shell preview - shows target crosshair and incoming trajectory hint
            const explosionRadius = 30; // Expected explosion radius

            // Dashed circle showing explosion radius
            ctx.strokeStyle = 'rgba(255, 100, 0, 0.4)';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(screenX, screenY, explosionRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);

            // Target crosshair
            ctx.strokeStyle = 'rgba(255, 50, 50, 0.8)';
            ctx.lineWidth = 2;
            const crossSize = 12;
            ctx.beginPath();
            ctx.moveTo(screenX - crossSize, screenY);
            ctx.lineTo(screenX + crossSize, screenY);
            ctx.moveTo(screenX, screenY - crossSize);
            ctx.lineTo(screenX, screenY + crossSize);
            ctx.stroke();

            // Shell icon at center
            ctx.fillStyle = 'rgba(80, 80, 80, 0.8)';
            ctx.beginPath();
            ctx.arc(screenX, screenY, 4, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    if (isHoldingRightClick && rightClickHoldStart) {
        const holdDuration = performance.now() - rightClickHoldStart;
        const progress = Math.min(holdDuration / 500, 1);
        
        const screenX = rightClickHoldX - camera.x;
        const screenY = rightClickHoldY - camera.y;
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(screenX, screenY, 15, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.strokeStyle = progress >= 1 ? 'rgba(0, 255, 0, 0.8)' : 'rgba(255, 255, 0, 0.8)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(screenX, screenY, 15, -Math.PI / 2, -Math.PI / 2 + (progress * Math.PI * 2));
        ctx.stroke();
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(screenX, screenY, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawWindArrow() {
    // Convert wind direction slider (-1 to 1) to angle (0° to 360°)
    // -1 = 0° (East), -0.5 = 90° (South), 0 = 180° (West), 0.5 = 270° (North), 1 = 360° (East)
    const angle = (windDirection + 1) * Math.PI; // Convert to radians
    
    // Position: Bottom left, below unit info window
    const arrowX = 40;
    const arrowY = canvas.height - 40;
    
    // Only draw if wind speed > 0
    if (windSpeed > 0) {
        ctx.save();
        ctx.translate(arrowX, arrowY);
        ctx.rotate(angle);
        
        // Arrow size based on wind speed
        const arrowLength = 30 + windSpeed * 20; // 30-50px
        const arrowWidth = 15;
        
        // Arrow shaft
        ctx.strokeStyle = 'rgba(200, 200, 255, 0.8)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-arrowLength / 2, 0);
        ctx.lineTo(arrowLength / 2, 0);
        ctx.stroke();
        
        // Arrow head
        ctx.fillStyle = 'rgba(200, 200, 255, 0.8)';
        ctx.beginPath();
        ctx.moveTo(arrowLength / 2, 0);
        ctx.lineTo(arrowLength / 2 - arrowWidth, -arrowWidth / 2);
        ctx.lineTo(arrowLength / 2 - arrowWidth, arrowWidth / 2);
        ctx.closePath();
        ctx.fill();
        
        // Circle base
        ctx.strokeStyle = 'rgba(200, 200, 255, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
    } else {
        // No wind - draw small static circle
        ctx.strokeStyle = 'rgba(150, 150, 150, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(arrowX, arrowY, 8, 0, Math.PI * 2);
        ctx.stroke();
    }
}

function drawSelectionBox() {
    if (!isSelecting) return;

    // Red selection box when shift held, green otherwise
    if (selectRedMode) {
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
        ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
    } else {
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
        ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
    }
    
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    
    const width = selectionCurrentX - selectionStartX;
    const height = selectionCurrentY - selectionStartY;
    
    ctx.fillRect(selectionStartX, selectionStartY, width, height);
    ctx.strokeRect(selectionStartX, selectionStartY, width, height);
    
    ctx.setLineDash([]);
}

function drawFormationMoveIndicator() {
    if (!isFormationMoving || entityManager.selectedEntities.length === 0) return;
    
    let centerX = 0;
    let centerY = 0;
    for (const entity of entityManager.selectedEntities) {
        centerX += entity.x;
        centerY += entity.y;
    }
    centerX /= entityManager.selectedEntities.length;
    centerY /= entityManager.selectedEntities.length;
    
    const targetX = centerX + Math.cos(formationMoveAngle) * formationMoveDistance;
    const targetY = centerY + Math.sin(formationMoveAngle) * formationMoveDistance;
    
    const screenCenterX = centerX - camera.x;
    const screenCenterY = centerY - camera.y;
    const screenTargetX = targetX - camera.x;
    const screenTargetY = targetY - camera.y;
    
    // CHANGE COLORS BASED ON VALIDITY
    const strokeColor = formationMoveIsValid ? 'rgba(0, 255, 255, 0.8)' : 'rgba(128, 128, 128, 0.8)';
    const fillColor = formationMoveIsValid ? 'rgba(0, 255, 255, 0.8)' : 'rgba(128, 128, 128, 0.8)';
    
    // Draw arrow
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(screenCenterX, screenCenterY);
    ctx.lineTo(screenTargetX, screenTargetY);
    ctx.stroke();
    
    // Draw arrowhead
    const arrowSize = 15;
    const angle = formationMoveAngle;
    ctx.fillStyle = fillColor;
    ctx.beginPath();
    ctx.moveTo(screenTargetX, screenTargetY);
    ctx.lineTo(
        screenTargetX - arrowSize * Math.cos(angle - Math.PI / 6),
        screenTargetY - arrowSize * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
        screenTargetX - arrowSize * Math.cos(angle + Math.PI / 6),
        screenTargetY - arrowSize * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
}

function drawCannonMoveIndicator() {
    const selectedCannon = cannonManager.getSelectedCannon();
    if (!isCannonMoving || !selectedCannon || selectedCannon.isDying) return;

    const targetX = selectedCannon.x + Math.cos(cannonMoveAngle) * cannonMoveDistance;
    const targetY = selectedCannon.y + Math.sin(cannonMoveAngle) * cannonMoveDistance;

    const screenCenterX = selectedCannon.x - camera.x;
    const screenCenterY = selectedCannon.y - camera.y;
    const screenTargetX = targetX - camera.x;
    const screenTargetY = targetY - camera.y;

    // Change colors based on validity (orange for cannon)
    const strokeColor = cannonMoveIsValid ? 'rgba(255, 165, 0, 0.8)' : 'rgba(128, 128, 128, 0.8)';
    const fillColor = cannonMoveIsValid ? 'rgba(255, 165, 0, 0.8)' : 'rgba(128, 128, 128, 0.8)';

    // Draw arrow
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(screenCenterX, screenCenterY);
    ctx.lineTo(screenTargetX, screenTargetY);
    ctx.stroke();

    // Draw arrowhead
    const arrowSize = 15;
    const angle = cannonMoveAngle;
    ctx.fillStyle = fillColor;
    ctx.beginPath();
    ctx.moveTo(screenTargetX, screenTargetY);
    ctx.lineTo(
        screenTargetX - arrowSize * Math.cos(angle - Math.PI / 6),
        screenTargetY - arrowSize * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
        screenTargetX - arrowSize * Math.cos(angle + Math.PI / 6),
        screenTargetY - arrowSize * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
}

function gameLoop() {
    const currentTime = performance.now();
    const deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    // PERFORMANCE TIMING - DECLARE AT TOP
    const timings = {};
    let t0, t1;

    frameCount++;
    if (currentTime - fpsUpdateTime > 1000) {
        currentFPS = frameCount;
        frameCount = 0;
        fpsUpdateTime = currentTime;
        
        const fpsElement = document.getElementById('fpsValue');
        if (fpsElement) {
            fpsElement.textContent = currentFPS;
            fpsElement.style.color = currentFPS < 50 ? 'red' : currentFPS < 55 ? 'yellow' : 'lime';
        }

        if (currentFPS < 50) {
            console.warn(`FPS: ${currentFPS} (below target!)`);
        }
    }

    // Handle keyboard movement - disable if Ctrl is held for formation movement
    t0 = performance.now();
    if (!keys['Control']) {
        if (keys['ArrowUp'] || keys['w'] || keys['W']) {
            camera.y = Math.max(0, camera.y - CAMERA_SPEED);
        }
        if (keys['ArrowDown'] || keys['s'] || keys['S']) {
            camera.y = Math.min(MAP_HEIGHT - canvas.height, camera.y + CAMERA_SPEED);
        }
        if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
            camera.x = Math.max(0, camera.x - CAMERA_SPEED);
        }
        if (keys['ArrowRight'] || keys['d'] || keys['D']) {
            camera.x = Math.min(MAP_WIDTH - canvas.width, camera.x + CAMERA_SPEED);
        }
    }
    t1 = performance.now();
    timings['Camera'] = (t1 - t0).toFixed(2) + 'ms';
    
    // Update entities
    t0 = performance.now();
    entityManager.updateAll(deltaTime);
    entityManager.updateCorpses(deltaTime);
    fireManager.updateBurnMarks(deltaTime);
    leaderHaloManager.updateAll(deltaTime, entityManager.getAllEntities()); // Update leader halos with entity list
    heatmapManager.updateAll(deltaTime, entityManager.entities, cannonManager.cannons, captureObjectiveManager.objectives); // Update heatmap territorial control
    t1 = performance.now();
    timings['Entities update'] = (t1 - t0).toFixed(2) + 'ms';

    // Update group tabs once per second
    t0 = performance.now();
    groupTabsUpdateTimer += deltaTime;
    if (groupTabsUpdateTimer >= groupTabsUpdateInterval) {
        updateGroupTabs();
        groupTabsUpdateTimer = 0;
    }
    t1 = performance.now();
    timings['Group tabs'] = (t1 - t0).toFixed(2) + 'ms';
    
    // Formation arrow movement
    t0 = performance.now();
    if (isFormationMoving) {
        formationMoveDistance += 2;
        formationMoveDistance = Math.min(formationMoveDistance, 1000);
        formationMoveIsValid = validateFormationArrowMovement();
    }
    t1 = performance.now();
    timings['Formation arrow'] = (t1 - t0).toFixed(2) + 'ms';

    // Cannon arrow movement
    if (isCannonMoving) {
        cannonMoveDistance += 2;
        cannonMoveDistance = Math.min(cannonMoveDistance, 1000);
        cannonMoveIsValid = validateCannonArrowMovement();
    }

    // Update fire
    t0 = performance.now();
    fireManager.updateAll(deltaTime, windDirection, windSpeed);
    t1 = performance.now();
    timings['Fire update'] = (t1 - t0).toFixed(2) + 'ms';

    // Update smoke
    t0 = performance.now();
    smokeManager.updateAll(deltaTime, MAP_WIDTH, MAP_HEIGHT);
    t1 = performance.now();
    timings['Smoke update'] = (t1 - t0).toFixed(2) + 'ms';

    // Update explosions
    t0 = performance.now();
    explosionManager.updateAll(deltaTime, entityManager.getAllEntities(), fireManager);

    t1 = performance.now();
    timings['Explosion update'] = (t1 - t0).toFixed(2) + 'ms';

    // Update shells
    shellManager.updateAll(deltaTime, entityManager.getAllEntities());

    // Update capture objectives
    captureObjectiveManager.updateAll(deltaTime, entityManager.getAllEntities());

    // Update cannons
    cannonManager.updateAll(deltaTime, entityManager.getAllEntities());

    // Update soundwaves
    soundwaveManager.updateAll(deltaTime, entityManager.getAllEntities(), cannonManager.cannons);

    // DRAWING PHASE
    t0 = performance.now();
    drawBackground();
    t1 = performance.now();
    timings['Draw background'] = (t1 - t0).toFixed(2) + 'ms';
    
    t0 = performance.now();
    drawObstacles();
    t1 = performance.now();
    timings['Draw obstacles'] = (t1 - t0).toFixed(2) + 'ms';
    
    // Draw burn marks (old way - every frame)
    t0 = performance.now();
    ctx.save();
    ctx.translate(-camera.x, -camera.y);
    for (const mark of fireManager.burnMarks) {
        // Outer scorched circle (black)
        ctx.fillStyle = 'rgba(20, 20, 20, 0.7)';
        ctx.beginPath();
        ctx.arc(mark.x, mark.y, mark.radius * 1.2, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner ash circle (darker black)
        ctx.fillStyle = 'rgba(10, 10, 10, 0.78)';
        ctx.beginPath();
        ctx.arc(mark.x, mark.y, mark.radius * 0.7, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
    t1 = performance.now();
    timings['Draw burn marks'] = (t1 - t0).toFixed(2) + 'ms';
    
    // Draw flow field debug
    t0 = performance.now();
    if (showFlowField && debugFlowField) {
        debugFlowField.draw(ctx, camera);
    }
    t1 = performance.now();
    timings['Draw flow field'] = (t1 - t0).toFixed(2) + 'ms';

    // Draw fires
    t0 = performance.now();
    fireManager.drawAll(ctx, camera);
    t1 = performance.now();
    timings['Draw fires'] = (t1 - t0).toFixed(2) + 'ms';

    // Draw entities
    t0 = performance.now();
    ctx.save();
    ctx.translate(-camera.x, -camera.y);
    entityManager.drawAll(ctx, { x: 0, y: 0 });
    ctx.restore();
    t1 = performance.now();
    timings['Draw entities'] = (t1 - t0).toFixed(2) + 'ms';
    
    // Draw leader halos (after entities, before smoke)
    t0 = performance.now();
    leaderHaloManager.drawAll(ctx, camera);
    t1 = performance.now();
    timings['Draw halos'] = (t1 - t0).toFixed(2) + 'ms';

    // Draw heatmap (Y key toggle) - above entities, below UI
    if (showHeatmap) {
        heatmapManager.draw(ctx, camera);
    }

    // Draw cannons
    cannonManager.drawAll(ctx, camera);

    // Draw objective cones (O key toggle)
    if (showObjectiveCones) {
        const entities = entityManager.entities;
        for (const entity of entities) {
            if (entity.stance === 'offensive' && !entity.isDying) {
                const screenX = entity.x - camera.x;
                const screenY = entity.y - camera.y;

                const objectiveConeRadius = entity.weaponRange * 0.9; // Updated from 0.75 to 0.9
                const objectiveConeAngle = entity.getViewAngle();

                ctx.save();
                ctx.translate(screenX, screenY);
                ctx.rotate(entity.heading);

                // Cyan cone fill
                ctx.fillStyle = 'rgba(0, 255, 255, 0.1)';
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.arc(0, 0, objectiveConeRadius, -objectiveConeAngle / 2, objectiveConeAngle / 2);
                ctx.lineTo(0, 0);
                ctx.fill();

                // Cyan cone outline
                ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.arc(0, 0, objectiveConeRadius, -objectiveConeAngle / 2, objectiveConeAngle / 2);
                ctx.lineTo(0, 0);
                ctx.stroke();

                ctx.restore();

                // Draw AI target line if active
                if (entity.aiControlled && entity.aiTargetX !== null) {
                    const targetScreenX = entity.aiTargetX - camera.x;
                    const targetScreenY = entity.aiTargetY - camera.y;

                    ctx.strokeStyle = 'rgba(0, 255, 255, 0.6)';
                    ctx.lineWidth = 2;
                    ctx.setLineDash([10, 5]);
                    ctx.beginPath();
                    ctx.moveTo(screenX, screenY);
                    ctx.lineTo(targetScreenX, targetScreenY);
                    ctx.stroke();
                    ctx.setLineDash([]);

                    // Target marker
                    ctx.fillStyle = 'rgba(0, 255, 255, 0.5)';
                    ctx.beginPath();
                    ctx.arc(targetScreenX, targetScreenY, 5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
    }

    // Draw retreat cones (B key toggle)
    if (showRetreatCones) {
        const entities = entityManager.entities;
        for (const entity of entities) {
            if ((entity.stance === 'offensive' || entity.stance === 'none') && !entity.isDying) {
                const screenX = entity.x - camera.x;
                const screenY = entity.y - camera.y;

                const retreatConeRadius = entity.weaponRange * 0.5;
                const retreatConeAngle = entity.getViewAngle();

                ctx.save();
                ctx.translate(screenX, screenY);
                ctx.rotate(entity.heading);

                // Magenta cone fill
                ctx.fillStyle = 'rgba(255, 0, 255, 0.1)';
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.arc(0, 0, retreatConeRadius, -retreatConeAngle / 2, retreatConeAngle / 2);
                ctx.lineTo(0, 0);
                ctx.fill();

                // Magenta cone outline
                ctx.strokeStyle = 'rgba(255, 0, 255, 0.5)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.arc(0, 0, retreatConeRadius, -retreatConeAngle / 2, retreatConeAngle / 2);
                ctx.lineTo(0, 0);
                ctx.stroke();

                ctx.restore();
            }
        }
    }

    // Draw retreat indicators (B key toggle)
    if (showRetreatCones) {
        const entities = entityManager.entities;
        for (const entity of entities) {
            if (entity.isRetreating && !entity.isDying) {
                const screenX = entity.x - camera.x;
                const screenY = entity.y - camera.y;

                ctx.save();
                ctx.translate(screenX, screenY);
                ctx.rotate(entity.heading + Math.PI); // Point backwards

                // Red arrow
                ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
                ctx.fillStyle = 'rgba(255, 0, 0, 0.6)';
                ctx.lineWidth = 2;

                ctx.beginPath();
                ctx.moveTo(10, 0);
                ctx.lineTo(0, -5);
                ctx.lineTo(0, 5);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                ctx.restore();
            }
        }
    }

    // Draw bullet rays (P key toggle)
    if (showBulletRays) {
        const entities = entityManager.entities;
        for (const entity of entities) {
            if (entity.bulletRays && entity.bulletRays.length > 0) {
                for (const ray of entity.bulletRays) {
                    const startScreenX = ray.startX - camera.x;
                    const startScreenY = ray.startY - camera.y;
                    const endScreenX = ray.endX - camera.x;
                    const endScreenY = ray.endY - camera.y;

                    // Fade out over duration
                    const fadeProgress = ray.timer / entity.bulletRayDuration;
                    const opacity = 1.0 - fadeProgress;

                    // Color and thickness by mode
                    let color;
                    let lineWidth;
                    if (ray.mode === 'burst') {
                        color = `rgba(255, 100, 0, ${opacity})`; // Orange for burst
                        lineWidth = 1;
                    } else if (ray.mode === 'scatter') {
                        color = `rgba(255, 255, 0, ${opacity})`; // Yellow for scatter
                        lineWidth = 3; // Thicker rays for scatter to show spread
                    } else {
                        color = `rgba(255, 255, 255, ${opacity})`; // White for normal
                        lineWidth = 1;
                    }

                    ctx.strokeStyle = color;
                    ctx.lineWidth = lineWidth;
                    ctx.beginPath();
                    ctx.moveTo(startScreenX, startScreenY);
                    ctx.lineTo(endScreenX, endScreenY);
                    ctx.stroke();
                }
            }
        }
    }

    // Draw smoke
    t0 = performance.now();
    smokeManager.drawAll(ctx, camera);
    t1 = performance.now();
    timings['Draw smoke'] = (t1 - t0).toFixed(2) + 'ms';
    
    // Draw explosions
    t0 = performance.now();
    explosionManager.drawAll(ctx, camera);
    t1 = performance.now();
    timings['Draw explosions'] = (t1 - t0).toFixed(2) + 'ms';

    // Draw shells and water splashes
    shellManager.drawAll(ctx, camera);

    // Draw capture objectives
    captureObjectiveManager.drawAll(ctx, camera);

    // Draw soundwaves
    soundwaveManager.drawAll(ctx, camera);

    // Draw UI elements
    t0 = performance.now();
    entityManager.drawFormationPreview(ctx, camera);
    drawSelectionBox();
    drawPlaceholder();
    drawFormationMoveIndicator();
    drawCannonMoveIndicator();
    drawWindArrow(ctx);
    t1 = performance.now();
    timings['Draw UI'] = (t1 - t0).toFixed(2) + 'ms';
    
    // LOG TIMINGS WHEN FPS IS LOW
    if (currentFPS < 50) {
        console.log('=== PERFORMANCE BREAKDOWN ===');
        for (const [key, value] of Object.entries(timings)) {
            console.log(`${key}: ${value}`);
        }
        console.log('=============================');
    }
    
    if (entityManager.selectedEntities.length === 1) {
        updateUnitInfo();  // CHECK
    }
    
    
    requestAnimationFrame(gameLoop);
}

console.log('Game launched! Map size: ' + MAP_WIDTH + 'x' + MAP_HEIGHT);

// ===== KEYBOARD HANDLERS =====

window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    
    if (e.key === 'Shift' && isSelecting) {
            selectRedMode = true;
    }

    if (e.key === 'f' || e.key === 'F') {
        showFlowField = !showFlowField;
        console.log('Flow field visualization:', showFlowField ? 'ON' : 'OFF');
     }

    if (e.key === 'v' || e.key === 'V') {
        showFOVs = !showFOVs;
        console.log('FOV visualization:', showFOVs ? 'ON' : 'OFF');
    }

    if (e.key === 'o' || e.key === 'O') {
        showObjectiveCones = !showObjectiveCones;
        console.log('Objective cone visualization:', showObjectiveCones ? 'ON' : 'OFF');
    }

    if (e.key === 'b' || e.key === 'B') {
        showRetreatCones = !showRetreatCones;
        console.log('Retreat cone visualization:', showRetreatCones ? 'ON' : 'OFF');
    }

    if (e.key === 'p' || e.key === 'P') {
        showBulletRays = !showBulletRays;
        console.log('Bullet ray visualization:', showBulletRays ? 'ON' : 'OFF');
    }

    if (e.key === 'x' || e.key === 'X') {
        showSoundwaves = !showSoundwaves;
        console.log('Soundwave visualization:', showSoundwaves ? 'ON' : 'OFF');
    }

    if (e.key === 'y' || e.key === 'Y') {
        showHeatmap = !showHeatmap;
        console.log('Heatmap visualization:', showHeatmap ? 'ON' : 'OFF');
    }

    if (e.ctrlKey && entityManager.selectedEntities.length > 1) {
        const firstEntity = entityManager.selectedEntities[0];
        if (firstEntity.groupId !== null) {
            let angle = null;

            if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
                angle = -Math.PI / 2;
                e.preventDefault();
            } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
                angle = Math.PI / 2;
                e.preventDefault();
            } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
                angle = Math.PI;
                e.preventDefault();
            } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
                angle = 0;
                e.preventDefault();
            }

            if (angle !== null && !isFormationMoving) { // Only initialize if not already moving
                isFormationMoving = true;
                formationMoveAngle = angle;
                formationMoveDistance = 1;
            }
        }
    }

    // Ctrl+Arrow key movement for selected cannon
    if (e.ctrlKey) { //ASK CLAUDE
        const selectedCannon = cannonManager.getSelectedCannon();
        if (selectedCannon && !selectedCannon.isDying && selectedCannon.crewIds.length > 0) {
            let angle = null;

            if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
                angle = -Math.PI / 2;
                e.preventDefault();
            } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
                angle = Math.PI / 2;
                e.preventDefault();
            } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
                angle = Math.PI;
                e.preventDefault();
            } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
                angle = 0;
                e.preventDefault();
            }

            if (angle !== null && !isCannonMoving) {
                isCannonMoving = true;
                cannonMoveAngle = angle;
                cannonMoveDistance = 1;
            }
        }
    }
});

window.addEventListener('keyup', (e) => {
    delete keys[e.key];

    if (e.key === 'Shift') {
        selectRedMode = false;
    }

    if (isFormationMoving && (
        e.key === 'ArrowUp' || e.key === 'ArrowDown' ||
        e.key === 'ArrowLeft' || e.key === 'ArrowRight' ||
        e.key === 'w' || e.key === 'W' || e.key === 's' || e.key === 'S' ||
        e.key === 'a' || e.key === 'A' || e.key === 'd' || e.key === 'D' ||
        e.key === 'Control'
    )) {
        executeFormationMovement();
        isFormationMoving = false;
        formationMoveDistance = 0;
    }

    if (isCannonMoving && (
        e.key === 'ArrowUp' || e.key === 'ArrowDown' ||
        e.key === 'ArrowLeft' || e.key === 'ArrowRight' ||
        e.key === 'w' || e.key === 'W' || e.key === 's' || e.key === 'S' ||
        e.key === 'a' || e.key === 'A' || e.key === 'd' || e.key === 'D' ||
        e.key === 'Control'
    )) {
        executeCannonMovement();
        isCannonMoving = false;
        cannonMoveDistance = 0;
    }
});

function executeFormationMovement() {
    if (entityManager.selectedEntities.length === 0) return;
    
    if (!formationMoveIsValid) {
        console.log('Formation movement blocked - would place units on walls/water');
        return; // Don't execute movement
    }

    let centerX = 0;
    let centerY = 0;
    for (const entity of entityManager.selectedEntities) {
        centerX += entity.x;
        centerY += entity.y;
    }
    centerX /= entityManager.selectedEntities.length;
    centerY /= entityManager.selectedEntities.length;
    
    const targetX = centerX + Math.cos(formationMoveAngle) * formationMoveDistance;
    const targetY = centerY + Math.sin(formationMoveAngle) * formationMoveDistance;
    
    // CREATE FLOW FIELD FOR FORMATION MOVEMENT - NEW BLOCK
    const gridSize = 50;
    const cacheKey = `${Math.floor(targetX / gridSize)}_${Math.floor(targetY / gridSize)}`;
    
    let flowField = entityManager.flowFieldCache.get(cacheKey);
    
    if (!flowField) {
        console.log(`Creating flow field for Ctrl+Arrow movement to (${Math.floor(targetX)}, ${Math.floor(targetY)})...`);
        const startTime = performance.now();
        flowField = new FlowField(targetX, targetY, MAP_WIDTH, MAP_HEIGHT);
        const calcTime = performance.now() - startTime;
        console.log(`Flow field calculated in ${calcTime.toFixed(2)}ms`);
        
        entityManager.flowFieldCache.set(cacheKey, flowField);
        
        if (entityManager.flowFieldCache.size > entityManager.maxCacheSize) {
            const firstKey = entityManager.flowFieldCache.keys().next().value;
            entityManager.flowFieldCache.delete(firstKey);
        }
    } else {
        console.log(`Using cached flow field for Ctrl+Arrow movement`);
    }
    
    entityManager.currentFlowField = flowField;
    debugFlowField = flowField; // Set for 'f' key visualization
    // END NEW BLOCK
    
    for (const entity of entityManager.selectedEntities) {
        const relativeX = entity.x - centerX;
        const relativeY = entity.y - centerY;
        
        // Assign flow field to entity - NEW LINE
        entity.setFlowField(flowField);
        
        entity.moveTo(targetX + relativeX, targetY + relativeY);
    }
    
    console.log(`Formation moved ${formationMoveDistance}px at angle ${(formationMoveAngle * 180 / Math.PI).toFixed(0)}°`);
}

function validateFormationArrowMovement() {
    if (entityManager.selectedEntities.length === 0) return true;
    
    let centerX = 0;
    let centerY = 0;
    for (const entity of entityManager.selectedEntities) {
        centerX += entity.x;
        centerY += entity.y;
    }
    centerX /= entityManager.selectedEntities.length;
    centerY /= entityManager.selectedEntities.length;
    
    const targetX = centerX + Math.cos(formationMoveAngle) * formationMoveDistance;
    const targetY = centerY + Math.sin(formationMoveAngle) * formationMoveDistance;
    
    // Check if target center position is valid
    const terrainType = TerrainManager.getTerrainType(targetX, targetY);
    if (terrainType === 'wall' || terrainType === 'water') {
        return false;
    }
    
    // Check each unit's destination
    for (const entity of entityManager.selectedEntities) {
        const relativeX = entity.x - centerX;
        const relativeY = entity.y - centerY;
        const destX = targetX + relativeX;
        const destY = targetY + relativeY;
        
        const destTerrain = TerrainManager.getTerrainType(destX, destY);
        if (destTerrain === 'wall' || destTerrain === 'water') {
            return false;
        }
    }
    
    return true;
}

function executeCannonMovement() {
    const selectedCannon = cannonManager.getSelectedCannon();
    if (!selectedCannon || selectedCannon.isDying || selectedCannon.crewIds.length === 0) return;

    if (!cannonMoveIsValid) {
        console.log('Cannon movement blocked - would place on walls/water');
        return;
    }

    const targetX = selectedCannon.x + Math.cos(cannonMoveAngle) * cannonMoveDistance;
    const targetY = selectedCannon.y + Math.sin(cannonMoveAngle) * cannonMoveDistance;

    // Create flow field for cannon movement
    const gridSize = 50;
    const cacheKey = `${Math.floor(targetX / gridSize)}_${Math.floor(targetY / gridSize)}`;

    let flowField = entityManager.flowFieldCache.get(cacheKey);

    if (!flowField) {
        console.log(`Creating flow field for cannon Ctrl+Arrow movement to (${Math.floor(targetX)}, ${Math.floor(targetY)})...`);
        const startTime = performance.now();
        flowField = new FlowField(targetX, targetY, MAP_WIDTH, MAP_HEIGHT);
        const calcTime = performance.now() - startTime;
        console.log(`Flow field calculated in ${calcTime.toFixed(2)}ms`);

        entityManager.flowFieldCache.set(cacheKey, flowField);

        if (entityManager.flowFieldCache.size > entityManager.maxCacheSize) {
            const firstKey = entityManager.flowFieldCache.keys().next().value;
            entityManager.flowFieldCache.delete(firstKey);
        }
    } else {
        console.log(`Using cached flow field for cannon Ctrl+Arrow movement`);
    }

    selectedCannon.setFlowField(flowField);
    debugFlowField = flowField; // Set for 'f' key visualization
    selectedCannon.moveTo(targetX, targetY);

    console.log(`Cannon ${selectedCannon.id} moved ${cannonMoveDistance}px at angle ${(cannonMoveAngle * 180 / Math.PI).toFixed(0)}°`);
}

function validateCannonArrowMovement() { //ASK CLAUDE
    const selectedCannon = cannonManager.getSelectedCannon();
    if (!selectedCannon || selectedCannon.isDying) return true;

    const targetX = selectedCannon.x + Math.cos(cannonMoveAngle) * cannonMoveDistance;
    const targetY = selectedCannon.y + Math.sin(cannonMoveAngle) * cannonMoveDistance;

    const terrainType = TerrainManager.getTerrainType(targetX, targetY);
    if (terrainType === 'wall' || terrainType === 'water') {
        return false;
    }

    return true;
}

// ===== MOUSE HANDLERS =====

canvas.addEventListener('mousemove', (e) => {
    lastMouseX = e.clientX + camera.x;
    lastMouseY = e.clientY + camera.y;
    
    if (spawnMode) {
        placeholderX = e.clientX;
        placeholderY = e.clientY;
    }
    
    if (isSelecting) {
        selectionCurrentX = e.clientX;
        selectionCurrentY = e.clientY;
    }
    
    if (isDraggingMap) {
        const deltaX = e.clientX - dragStartX;
        const deltaY = e.clientY - dragStartY;
        
        camera.x = Math.max(0, Math.min(MAP_WIDTH - canvas.width, dragCameraStartX - deltaX));
        camera.y = Math.max(0, Math.min(MAP_HEIGHT - canvas.height, dragCameraStartY - deltaY));
    }
    
    if (entityManager.formationPreview.active) {
        const worldX = e.clientX + camera.x;
        const worldY = e.clientY + camera.y;
        
        // Check if Ctrl is currently pressed to switch between rotate/scale
        if (e.ctrlKey && isRotatingFormation && !isScalingFormation) {
            isRotatingFormation = false;
            isScalingFormation = true;
            scaleStartDistance = Math.sqrt(
                (worldX - entityManager.formationPreview.x) ** 2 +
                (worldY - entityManager.formationPreview.y) ** 2
            );
            scaleStartValue = entityManager.formationPreview.scale;
            canvas.style.cursor = 'nwse-resize';
        } else if (!e.ctrlKey && isScalingFormation && !isRotatingFormation) {
            isScalingFormation = false;
            isRotatingFormation = true;
            const dx = worldX - entityManager.formationPreview.x;
            const dy = worldY - entityManager.formationPreview.y;
            rotationStartAngle = Math.atan2(dy, dx) - entityManager.formationPreview.rotation;
            canvas.style.cursor = 'grabbing';
        }
        
        if (isRotatingFormation) {
            const dx = worldX - entityManager.formationPreview.x;
            const dy = worldY - entityManager.formationPreview.y;
            const currentAngle = Math.atan2(dy, dx);
            entityManager.formationPreview.rotation = currentAngle - rotationStartAngle;
        } else if (isScalingFormation) {
            const currentDistance = Math.sqrt(
                (worldX - entityManager.formationPreview.x) ** 2 +
                (worldY - entityManager.formationPreview.y) ** 2
            );
            
            const deltaDistance = currentDistance - scaleStartDistance;
            const scaleChange = deltaDistance * 0.002;
            
            entityManager.formationPreview.scale = scaleStartValue + scaleChange;
            entityManager.formationPreview.scale = Math.max(
                entityManager.formationPreview.minScale,
                Math.min(entityManager.formationPreview.maxScale, entityManager.formationPreview.scale)
            );
        } else {
            entityManager.updateFormationPreviewPosition(worldX, worldY);
        }
    }
});

canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

canvas.addEventListener('mousedown', (e) => {
    if (e.button === 2) {

        const worldX = e.clientX + camera.x;
        const worldY = e.clientY + camera.y;
        
        // GOD MENU SPAWN MODE
        if (godMenuSelectedItem) {
            e.preventDefault();

            if (godMenuSelectedItem === 'fire') {
                // Check if valid terrain (not wall or water)
                const terrainType = TerrainManager.getTerrainType(worldX, worldY);

                if (terrainType === 'wall' || terrainType === 'water') {
                    console.log('Cannot spawn fire on wall or water');
                    return;
                }

                // Spawn fire
                fireManager.addFire(worldX, worldY);
                console.log(`Fire spawned at (${Math.floor(worldX)}, ${Math.floor(worldY)})`);
            } else if (godMenuSelectedItem === 'smoke') {
                // Smoke can spawn anywhere (no terrain restriction)
                smokeManager.addSmoke(worldX, worldY, windDirection, windSpeed);
                console.log(`Smoke spawned at (${Math.floor(worldX)}, ${Math.floor(worldY)})`);
            } else if (godMenuSelectedItem === 'explosion') {
                // Explosion spawns with default settings (size=1.0, burn=true)
                explosionManager.addExplosion(worldX, worldY, 1.0, true);
                console.log(`Explosion spawned at (${Math.floor(worldX)}, ${Math.floor(worldY)})`);
            } else if (godMenuSelectedItem === 'shell') {
                // Shell spawns from random point 1000px away, aimed at click location
                const spawnDistance = 1000;
                const randomAngle = Math.random() * Math.PI * 2;
                const spawnX = worldX + Math.cos(randomAngle) * spawnDistance;
                const spawnY = worldY + Math.sin(randomAngle) * spawnDistance;

                shellManager.addShell(spawnX, spawnY, worldX, worldY, 'cannon_shell', 1.0, 'none');
                console.log(`Shell spawned at (${Math.floor(spawnX)}, ${Math.floor(spawnY)}) → (${Math.floor(worldX)}, ${Math.floor(worldY)})`);
            }

            return; // Don't process other right-click actions
        }

        // OBJECTIVE SPAWN MODE
        if (objectiveSpawnMode) {
            e.preventDefault();

            if (objectiveSpawnType === 'light_cannon') {
                // Spawn light cannon (automatically creates linked capture objective)
                cannonManager.addCannon(worldX, worldY, 'none', 'light');
                console.log(`Light Cannon spawned at (${Math.floor(worldX)}, ${Math.floor(worldY)})`);
            } else if (objectiveSpawnType === 'heavy_cannon') {
                // Spawn heavy cannon (automatically creates linked capture objective)
                cannonManager.addCannon(worldX, worldY, 'none', 'heavy');
                console.log(`Heavy Cannon spawned at (${Math.floor(worldX)}, ${Math.floor(worldY)})`);
            } else if (objectiveSpawnType === 'mortar_cannon') {
                // Spawn mortar (automatically creates linked capture objective)
                cannonManager.addCannon(worldX, worldY, 'none', 'mortar');
                console.log(`Mortar spawned at (${Math.floor(worldX)}, ${Math.floor(worldY)})`);
            } else {
                // Spawn regular capture objective (flag)
                const options = {
                    objective_type: objectiveSpawnType,
                    objective_name: objectiveSpawnType === 'none' ? 'Flag' : objectiveSpawnType
                };
                captureObjectiveManager.addObjective(worldX, worldY, options);
                console.log(`Objective spawned at (${Math.floor(worldX)}, ${Math.floor(worldY)})`);
            }

            objectiveSpawnMode = false;
            objectiveSpawnType = 'none';
            canvas.style.cursor = 'crosshair';

            return;
        }
        
        if (entityManager.formationPreview.active) {
            if (e.ctrlKey) {
                isScalingFormation = true;
                scaleStartDistance = Math.sqrt(
                    (worldX - entityManager.formationPreview.x) ** 2 +
                    (worldY - entityManager.formationPreview.y) ** 2
                );
                scaleStartValue = entityManager.formationPreview.scale;
                canvas.style.cursor = 'nwse-resize';
            } else {
                isRotatingFormation = true;
                const dx = worldX - entityManager.formationPreview.x;
                const dy = worldY - entityManager.formationPreview.y;
                rotationStartAngle = Math.atan2(dy, dx) - entityManager.formationPreview.rotation;
                canvas.style.cursor = 'grabbing';
            }
            
            rightClickHoldStart = performance.now();
            rightClickHoldX = worldX;
            rightClickHoldY = worldY;
            isHoldingRightClick = true;
            
            e.preventDefault();

        } else if (spawnMode && spawnEquipment) {
            spawnMultipleEntities(worldX, worldY, spawnEquipment, spawnTroopCount);
            spawnMode = false;
            spawnEquipment = null;
            spawnTroopCount = 1;
            window.spawnAttributes = null; // Clear attributes
            canvas.style.cursor = 'crosshair';
        } else if (enemySpawnMode && enemySpawnEquipment) {
            spawnEnemyGroup(worldX, worldY, enemySpawnEquipment, enemySpawnTroopCount, enemySpawnGroupName);
            enemySpawnMode = false;
            enemySpawnEquipment = null;
            enemySpawnTroopCount = 10;
            enemySpawnGroupName = '';
            canvas.style.cursor = 'crosshair';
        } else {
            // Check if cannon is selected FIRST (cannon takes priority over crew selection)
            const selectedCannon = cannonManager.getSelectedCannon(); //ASK CLAUDE
            if (selectedCannon && !selectedCannon.isDying) {
                const clickedEntity = entityManager.getEntityAtPosition(worldX, worldY);

                if (clickedEntity && clickedEntity.faction !== selectedCannon.faction && clickedEntity.faction !== 'none') {
                    // Manual target enemy - cannon takes priority
                    selectedCannon.hasManualTarget = true;
                    selectedCannon.manualTarget = clickedEntity;
                    selectedCannon.lockedTarget = clickedEntity;
                    selectedCannon.targetLockTimer = 0;

                    console.log(`Cannon ${selectedCannon.id}: Manual target set to entity ${clickedEntity.id}`);
                    e.preventDefault();
                    return;
                }

                // Right-click on terrain clears manual target
                if (selectedCannon.hasManualTarget) {
                    console.log(`Cannon ${selectedCannon.id}: Manual target cleared`);
                    selectedCannon.hasManualTarget = false;
                    selectedCannon.manualTarget = null;
                }
            }

            // Check for entity targeting (when no cannon selected or cannon didn't handle click)
            if (entityManager.selectedEntities.length > 0) {
                // Check if right-clicking on an enemy unit for targeted fire
                const clickedEntity = entityManager.getEntityAtPosition(worldX, worldY);

                if (clickedEntity && clickedEntity.faction !== entityManager.selectedEntities[0].faction) {
                    // Targeted fire - lock all selected units onto this enemy
                    for (const entity of entityManager.selectedEntities) {
                        entity.lockedTarget = clickedEntity;
                        entity.targetLockTimer = 0;
                        entity.hasManualTarget = true; // Mark as manual target

                        // Rotate to face target if not moving
                        if (!entity.isMoving) {
                            const dx = clickedEntity.x - entity.x;
                            const dy = clickedEntity.y - entity.y;
                            entity.targetHeading = Math.atan2(dy, dx);
                            entity.isRotating = true;
                        }
                    }
                    console.log(`${entityManager.selectedEntities.length} units ordered to target entity ${clickedEntity.id}`);
                    e.preventDefault();
                    return;
                }
            }

            // Not clicking on enemy - proceed with normal movement order
            rightClickHoldStart = performance.now();
            rightClickHoldX = worldX;
            rightClickHoldY = worldY;
            isHoldingRightClick = true;
        }
        return;
    }

    if (e.button !== 0) return;
    if (spawnMode) return;
    
    // Exit god menu spawn mode on left-click
    if (godMenuSelectedItem) {
        godMenuSelectedItem = null;
        const godMenuItems = document.querySelectorAll('.god-menu-item');
        godMenuItems.forEach(i => i.classList.remove('selected'));
        canvas.style.cursor = 'crosshair';
        console.log('God menu spawn mode exited');
        return;
    }

    // Exit objective spawn mode on left-click
    if (objectiveSpawnMode) {
        objectiveSpawnMode = false;
        objectiveSpawnType = 'none';
        canvas.style.cursor = 'crosshair';
        console.log('Objective spawn mode exited');
        return;
    }

    const worldX = e.clientX + camera.x;
    const worldY = e.clientY + camera.y;

    if (e.ctrlKey && e.shiftKey) {
        isDraggingMap = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        dragCameraStartX = camera.x;
        dragCameraStartY = camera.y;
        canvas.classList.add('dragging');
        e.preventDefault();
        return;
    }

    // Check for cannon click first (cannons have priority)
    const clickedCannon = cannonManager.getCannonAt(worldX, worldY); //ASK CLAUDE

    if (clickedCannon) {
        // Deselect all entities first
        entityManager.deselectAll();

        // Select the cannon
        cannonManager.selectCannon(clickedCannon); //ASK CLAUDE

        // Auto-select all crew members
        for (const crewId of clickedCannon.crewIds) {
            const crewEntity = entityManager.getEntity(crewId);
            if (crewEntity && !crewEntity.isDying) {
                entityManager.selectEntity(crewEntity, true); // Additive selection
            }
        }

        updateUnitInfo();
    } else {
        const clickedEntity = entityManager.getEntityAtPosition(worldX, worldY);

        if (clickedEntity) {
            // Deselect cannon when selecting entity
            cannonManager.deselectCannon();

            const additive = e.ctrlKey;
            entityManager.selectEntity(clickedEntity, additive);
            updateUnitInfo();
        } else {
            isSelecting = true;
            selectRedMode = e.shiftKey; // Capture shift state when selection starts
            selectionStartX = e.clientX;
            selectionStartY = e.clientY;
            selectionCurrentX = e.clientX;
            selectionCurrentY = e.clientY;
        }
    }
});

window.addEventListener('mouseup', (e) => {
    if (e.button === 2) {
        if (isHoldingRightClick) {
            const holdDuration = performance.now() - rightClickHoldStart;
            if (holdDuration >= 500) {
                if (entityManager.formationPreview.active && !entityManager.formationPreview.isValid) {
                    console.log('Formation placement blocked - units would be on walls/water');
                    // Don't execute movement
                } else {
                    entityManager.moveSelectedEntities(rightClickHoldX, rightClickHoldY);
                }
            }
            
            isRotatingFormation = false;
            isScalingFormation = false;
            isHoldingRightClick = false;
            rightClickHoldStart = null;
            canvas.style.cursor = 'crosshair';
        }
        return;
    }

    if (e.button !== 0) return;

    if (isDraggingMap) {
        isDraggingMap = false;
        canvas.classList.remove('dragging');
    }

    if (isSelecting) {
        const worldX1 = selectionStartX + camera.x;
        const worldY1 = selectionStartY + camera.y;
        const worldX2 = selectionCurrentX + camera.x;
        const worldY2 = selectionCurrentY + camera.y;

        // Get all entities in selection box
        let selectedEntities = entityManager.getEntitiesInRect(worldX1, worldY1, worldX2, worldY2);

        // Selection hierarchy: normal blue > blue crew > normal red > red crew > cannons
        const blueNormal = selectedEntities.filter(e => e.faction === 'blue' && !e.isCrewMember);
        const blueCrew = selectedEntities.filter(e => e.faction === 'blue' && e.isCrewMember);
        const redNormal = selectedEntities.filter(e => e.faction === 'red' && !e.isCrewMember);
        const redCrew = selectedEntities.filter(e => e.faction === 'red' && e.isCrewMember);

        if (selectRedMode) {
            // Shift held - select red units (normal first, then crew)
            if (redNormal.length > 0) {
                selectedEntities = redNormal;
            } else if (redCrew.length > 0) {
                selectedEntities = redCrew;
            } else {
                selectedEntities = [];
            }
        } else {
            // Normal mode - hierarchy: blue normal > blue crew > red normal > red crew
            if (blueNormal.length > 0) {
                selectedEntities = blueNormal;
            } else if (blueCrew.length > 0) {
                selectedEntities = blueCrew;
            } else if (redNormal.length > 0) {
                selectedEntities = redNormal;
            } else if (redCrew.length > 0) {
                selectedEntities = redCrew;
            } else {
                selectedEntities = [];
            }
        }

        // If entities found, select them (deselect cannon)
        if (selectedEntities.length > 0) {
            cannonManager.deselectCannon();
            const additive = e.ctrlKey;
            entityManager.selectEntities(selectedEntities, additive);
        } else {
            // No entities - check for cannons (lowest priority)
            const selectedCannons = cannonManager.getCannonsInRect(worldX1, worldY1, worldX2, worldY2); //ASK CLAUDE

            if (selectedCannons.length === 1) {
                const cannon = selectedCannons[0];

                // Deselect all entities first
                entityManager.deselectAll();
                cannonManager.selectCannon(cannon); //ASK CLAUDE

                // Auto-select all crew members
                for (const crewId of cannon.crewIds) {
                    const crewEntity = entityManager.getEntity(crewId);
                    if (crewEntity && !crewEntity.isDying) {
                        entityManager.selectEntity(crewEntity, true);
                    }
                }
            } else {
                // No cannon or multiple cannons - just deselect
                cannonManager.deselectCannon();
                entityManager.deselectAll();
            }
        }
        
        isSelecting = false;
        selectRedMode = false; // Reset mode after selection
        updateUnitInfo();
    }
});

// ===== UI BUTTONS =====

const menuButton = document.getElementById('menuButton');
const spawnButton = document.getElementById('spawnButton');
const menuWindow = document.getElementById('menuWindow');
const spawnWindow = document.getElementById('spawnWindow');

menuButton.addEventListener('click', () => {
    menuWindow.classList.toggle('hidden');
});

spawnButton.addEventListener('click', () => {
    spawnWindow.classList.toggle('hidden');
});

const enemySpawnButton = document.getElementById('enemySpawnButton');
const enemyGroupWindow = document.getElementById('enemyGroupWindow');

enemySpawnButton.addEventListener('click', () => {
    enemyGroupWindow.classList.toggle('hidden');
    if (!enemyGroupWindow.classList.contains('hidden')) {
        document.getElementById('enemyGroupNameInput').focus();
    }
});

const spawnEnemyGroupBtn = document.getElementById('spawnEnemyGroupBtn');
const enemyTroopCountInput = document.getElementById('enemyTroopCountInput');
const enemyGroupNameInput = document.getElementById('enemyGroupNameInput');

spawnEnemyGroupBtn.addEventListener('click', () => {
    const troopCount = parseInt(enemyTroopCountInput.value);
    const groupName = enemyGroupNameInput.value.trim();
    
    // Validate troop count
    if (isNaN(troopCount) || troopCount < 2 || troopCount > 100) {
        alert('Troop count must be between 2 and 100');
        return;
    }
    
    // Validate group name
    if (groupName.length === 0) {
        alert('Please enter a group name');
        return;
    }
    
    // Set enemy spawn mode variables
    enemySpawnMode = true;
    enemySpawnTroopCount = troopCount;
    enemySpawnGroupName = groupName;
    
    // Preset equipment for enemies (rifle, sabre, light armor)
    enemySpawnEquipment = {
        ranged: equipmentLoader.getEquipment('ranged').find(w => w.name === 'Rifle'),
        melee: equipmentLoader.getEquipment('melee').find(w => w.name === 'Sabre'),
        armor: equipmentLoader.getEquipment('armor').find(w => w.name === 'Light_Armor')
    };
    
    // Close dialogue and activate spawn mode
    enemyGroupWindow.classList.add('hidden');
    canvas.style.cursor = 'crosshair';
    
    console.log(`Enemy spawn mode activated: ${troopCount} units in group "${groupName}"`);
});

enemyGroupNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        spawnEnemyGroupBtn.click();
    }
});

// OBJECTIVE SPAWN BUTTON
const objectiveSpawnButton = document.getElementById('objectiveSpawnButton');
const objectiveSpawnWindow = document.getElementById('objectiveSpawnWindow');
const closeObjectiveSpawnWindow = document.getElementById('closeObjectiveSpawnWindow');
const spawnObjectiveBtn = document.getElementById('spawnObjectiveBtn');
const objectiveTypeSelect = document.getElementById('objectiveTypeSelect');

objectiveSpawnButton.addEventListener('click', () => {
    objectiveSpawnWindow.classList.toggle('hidden');
});

closeObjectiveSpawnWindow.addEventListener('click', () => {
    objectiveSpawnWindow.classList.add('hidden');
});

spawnObjectiveBtn.addEventListener('click', () => {
    const selectedType = objectiveTypeSelect.value;

    // Activate objective spawn mode
    objectiveSpawnMode = true;
    objectiveSpawnType = selectedType;

    objectiveSpawnWindow.classList.add('hidden');
    canvas.style.cursor = 'crosshair';

    console.log(`Objective spawn mode activated: type="${selectedType}"`);
});

enemyTroopCountInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        spawnEnemyGroupBtn.click();
    }
});

groupButton.addEventListener('click', () => {
    groupNameWindow.classList.remove('hidden');
    groupNameInput.value = '';
    groupNameInput.focus();
});

// ===== FORMATION EDITOR =====

const formationButton = document.getElementById('formationButton');
const formationEditorWindow = document.getElementById('formationEditorWindow');
const formationCanvas = document.getElementById('formationCanvas');
const resetFormationBtn = document.getElementById('resetFormationBtn');
const saveFormationBtn = document.getElementById('saveFormationBtn');
const formationNameInput = document.getElementById('formationNameInput');
const savedFormationsList = document.getElementById('savedFormationsList');

formationButton.addEventListener('click', () => {
    formationEditorWindow.classList.toggle('hidden');
    
    if (!formationEditor && !formationEditorWindow.classList.contains('hidden')) {
        formationEditor = new FormationEditor(formationCanvas);
    }
    
    if (!formationEditorWindow.classList.contains('hidden')) {
        updateFormationsList();
    }
});

resetFormationBtn.addEventListener('click', () => {
    if (formationEditor) {
        formationEditor.reset();
    }
});

saveFormationBtn.addEventListener('click', () => {
    const name = formationNameInput.value.trim();
    
    if (name.length === 0) return;
    if (!formationEditor) return;
    
    const formationData = formationEditor.getFormationData();
    if (!formationData) return;
    
    const saved = formationManager.saveFormation(name, formationData);
    
    if (saved) {
        formationNameInput.value = '';
        formationEditor.reset();
        updateFormationsList();
    }
});

formationNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        saveFormationBtn.click();
    }
});

function updateFormationsList() {
    const formations = formationManager.getAllFormations();
    
    if (formations.length === 0) {
        savedFormationsList.innerHTML = '<p style="color: rgba(255,255,255,0.5); font-size: 12px; text-align: center; margin: 10px;">No formations saved yet</p>';
        return;
    }
    
    savedFormationsList.innerHTML = '';
    
    formations.forEach(formation => {
        const item = document.createElement('div');
        item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 8px; margin: 3px 0; background: rgba(70,70,70,0.6); border-radius: 4px; border: 1px solid rgba(255,255,255,0.2);';
        
        const nameSpan = document.createElement('span');
        nameSpan.textContent = formation.name;
        nameSpan.style.cssText = 'color: white; font-size: 13px; flex: 1;';
        
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'x';
        deleteBtn.style.cssText = 'background: none; border: none; color: rgb(255,0,0); font-size: 20px; font-weight: bold; cursor: pointer; padding: 0; width: 25px; height: 25px;';
        deleteBtn.title = 'Delete formation';
        
        deleteBtn.addEventListener('click', () => {
            formationManager.deleteFormation(formation.id);
            updateFormationsList();
            updateFormationBrowser();
        });
        
        deleteBtn.addEventListener('mouseenter', () => {
            deleteBtn.style.color = 'rgb(255,100,100)';
        });
        
        deleteBtn.addEventListener('mouseleave', () => {
            deleteBtn.style.color = 'rgb(255,0,0)';
        });
        
        item.appendChild(nameSpan);
        item.appendChild(deleteBtn);
        savedFormationsList.appendChild(item);
    });
    
    updateFormationBrowser();
}

// ===== GOD MENU BUTTON =====

const godMenuButton = document.getElementById('godMenuButton');
const godMenuDropdown = document.getElementById('godMenuDropdown');

godMenuButton.addEventListener('click', () => {
    godMenuDropdown.classList.toggle('hidden');
    godMenuOpen = !godMenuDropdown.classList.contains('hidden');
    console.log('God menu:', godMenuOpen ? 'opened' : 'closed');
});

// God menu close button
const godMenuCloseBtn = godMenuDropdown.querySelector('.close-btn-red');
godMenuCloseBtn.addEventListener('click', () => {
    godMenuDropdown.classList.add('hidden');
    godMenuOpen = false;
    console.log('God menu closed');
});

// God menu item selection
const godMenuItems = godMenuDropdown.querySelectorAll('.god-menu-item');
godMenuItems.forEach(item => {
    item.addEventListener('click', () => {
        const spawnType = item.dataset.spawnType;
        
        // Toggle selection
        if (godMenuSelectedItem === spawnType) {
            // Deselect
            item.classList.remove('selected');
            godMenuSelectedItem = null;
            canvas.style.cursor = 'crosshair';
            console.log('God menu: deselected', spawnType);
        } else {
            // Select new item
            godMenuItems.forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');
            godMenuSelectedItem = spawnType;
            canvas.style.cursor = 'crosshair';
            console.log('God menu: selected', spawnType);
        }
        
        // Close dropdown after selection
        godMenuDropdown.classList.add('hidden');
        godMenuOpen = false;
    });
});

// Wind control sliders
const windDirectionSlider = document.getElementById('windDirectionSlider');
const windSpeedSlider = document.getElementById('windSpeedSlider');
const windDirectionValue = document.getElementById('windDirectionValue');
const windSpeedValue = document.getElementById('windSpeedValue');

windDirectionSlider.addEventListener('input', (e) => {
    windDirection = parseFloat(e.target.value);
    windDirectionValue.textContent = windDirection.toFixed(2);
    console.log(`Wind direction: ${windDirection.toFixed(2)}`);
});

windSpeedSlider.addEventListener('input', (e) => {
    windSpeed = parseFloat(e.target.value);
    windSpeedValue.textContent = windSpeed.toFixed(2);
    console.log(`Wind speed: ${windSpeed.toFixed(2)}`);
});

createGroupBtn.addEventListener('click', () => {
    const name = groupNameInput.value.trim();
    if (name.length === 0) {
        alert('Please enter a group name');
        return;
    }

    // Check if any selected entities are enemies
    const hasEnemies = entityManager.selectedEntities.some(e => e.faction === 'red');
    if (hasEnemies) {
        alert('Cannot create or modify enemy groups manually');
        groupNameWindow.classList.add('hidden');
        return;
    }
    
    const group = entityManager.createGroup(name);
    if (group) {
        groupNameWindow.classList.add('hidden');
        updateGroupTabs();
        updateUnitInfo();
    }
});

groupNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const name = groupNameInput.value.trim();
        if (name.length === 0) {
            alert('Please enter a group name');
            return;
        }
        
        // Check if any selected entities are enemies
        const hasEnemies = entityManager.selectedEntities.some(e => e.faction === 'red');
        if (hasEnemies) {
            alert('Cannot create or modify enemy groups manually');
            groupNameWindow.classList.add('hidden');
            return;
        }
        
        const group = entityManager.createGroup(name);
        if (group) {
            groupNameWindow.classList.add('hidden');
            updateGroupTabs();
            updateUnitInfo();
        }
    }
});

// ===== FORMATION BROWSER =====

const formationBrowser = document.getElementById('formationBrowser');
const formationBrowserList = document.getElementById('formationBrowserList');
let selectedFormationId = 'none';

function updateFormationBrowser() {
    formationBrowserList.innerHTML = '';
    
    const formations = formationManager.getAllFormations();
    
    formations.forEach(formation => {
        const item = document.createElement('div');
        item.className = 'formation-item';
        item.dataset.formationId = formation.id;
        
        const previewDiv = document.createElement('div');
        previewDiv.className = 'formation-preview';
        const previewCanvas = generateFormationPreview(formation, 120, 80);
        previewDiv.appendChild(previewCanvas);
        
        const nameDiv = document.createElement('div');
        nameDiv.className = 'formation-name';
        nameDiv.textContent = formation.name;
        
        item.appendChild(previewDiv);
        item.appendChild(nameDiv);
        
        item.addEventListener('click', () => {
            selectFormationInBrowser(formation.id);
        });
        
        formationBrowserList.appendChild(item);
    });
    
    updateFormationBrowserSelection();
}

function selectFormationInBrowser(formationId) {
    selectedFormationId = formationId;
    updateFormationBrowserSelection();
    
    if (entityManager.selectedEntities.length > 0) {
        const firstEntity = entityManager.selectedEntities[0];
        if (firstEntity.groupId !== null) {
            const group = entityManager.groups.find(g => g.id === firstEntity.groupId);
            if (group) {
                group.setLastFormation(formationId);
            }
        }
    }
    
    if (formationId === 'none') {
        entityManager.setFormationPreview(null);
    } else {
        const formation = formationManager.getFormation(formationId);
        entityManager.setFormationPreview(formation);
        entityManager.updateFormationPreviewPosition(lastMouseX, lastMouseY);
    }
    
    console.log(`Formation selected: ${formationId === 'none' ? 'None' : formationId}`);
}

function updateFormationBrowserSelection() {
    const allItems = formationBrowser.querySelectorAll('.formation-item');
    allItems.forEach(item => item.classList.remove('selected'));
    
    const selectedItem = formationBrowser.querySelector(`[data-formation-id="${selectedFormationId}"]`);
    if (selectedItem) {
        selectedItem.classList.add('selected');
    }
}

function updateFormationBrowserVisibility() {
    if (entityManager.selectedEntities.length > 1) {
        const firstEntity = entityManager.selectedEntities[0];
        if (firstEntity.groupId !== null) {
            const group = entityManager.groups.find(g => g.id === firstEntity.groupId);

            // Hide formation browser for cannon crew groups
            if (group && group.isCannonCrewGroup) {
                formationBrowser.classList.add('hidden');
                return;
            }

            formationBrowser.classList.remove('hidden');
            updateFormationBrowser();

            if (group) {
                const lastFormationId = group.getLastFormation();

                if (lastFormationId === 'none') {
                    selectFormationInBrowser('none');
                } else {
                    const formation = formationManager.getFormation(lastFormationId);
                    if (formation) {
                        selectFormationInBrowser(lastFormationId);
                    } else {
                        group.setLastFormation('none');
                        selectFormationInBrowser('none');
                    }
                }
            }

            return;
        }
    }

    formationBrowser.classList.add('hidden');
}

function spawnMultipleEntities(centerX, centerY, equipment, count) {
    if (count === 1) {
        const entity = entityManager.addEntity(centerX, centerY, equipment);
        
        // Apply attributes if spawn mode is active
        if (window.spawnAttributes) {
            entity.mounted = window.spawnAttributes.mounted;
            entity.leader = window.spawnAttributes.leader;
            entity.item = window.spawnAttributes.item;
            entity.updateVisualProperties();
            
            // Create halo if leader
            if (entity.leader) {
                leaderHaloManager.addHalo(entity);
            }
            
            console.log(`Spawned single unit ${entity.id} - mounted: ${entity.mounted}, leader: ${entity.leader}, speed: ${entity.movement_speed.toFixed(1)}`);
        }
        return;
    }
    const spacing = 8;
    const entityRadius = 3;
    const totalSpacing = spacing + entityRadius * 2;
    
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    
    const gridWidth = (cols - 1) * totalSpacing;
    const gridHeight = (rows - 1) * totalSpacing;
    
    const startX = centerX - gridWidth / 2;
    const startY = centerY - gridHeight / 2;
    
    let spawnedCount = 0;
    
    for (let row = 0; row < rows && spawnedCount < count; row++) {
        for (let col = 0; col < cols && spawnedCount < count; col++) {
            const x = startX + col * totalSpacing;
            const y = startY + row * totalSpacing;
            
            const entity = entityManager.addEntity(x, y, equipment);
            
            // Apply attributes if spawn mode is active
            if (window.spawnAttributes) {
                entity.mounted = window.spawnAttributes.mounted;
                entity.leader = window.spawnAttributes.leader;
                entity.item = window.spawnAttributes.item;
                entity.updateVisualProperties();
                
                // Create halo if leader
                if (entity.leader) {
                    leaderHaloManager.addHalo(entity);
                }
                
                console.log(`Spawned unit ${entity.id} - mounted: ${entity.mounted}, leader: ${entity.leader}, speed: ${entity.movement_speed.toFixed(1)}`);
            }
            
            spawnedCount++;
        }
    }
    
    console.log(`Spawned ${spawnedCount} entities at (${centerX}, ${centerY})`);
}

function spawnEnemyGroup(centerX, centerY, equipment, count, groupName) {
    const spacing = 8;
    const entityRadius = 3;
    const totalSpacing = spacing + entityRadius * 2;
    
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    
    const gridWidth = (cols - 1) * totalSpacing;
    const gridHeight = (rows - 1) * totalSpacing;
    
    const startX = centerX - gridWidth / 2;
    const startY = centerY - gridHeight / 2;
    
    const spawnedEntities = [];
    let spawnedCount = 0;
    
    for (let row = 0; row < rows && spawnedCount < count; row++) {
        for (let col = 0; col < cols && spawnedCount < count; col++) {
            const x = startX + col * totalSpacing;
            const y = startY + row * totalSpacing;
            
            // Spawn with 'red' faction
            const entity = entityManager.addEntity(x, y, equipment, 'red');
            
            // Make middle unit a leader (floored index, 0-based)
            const leaderIndex = Math.floor(count / 2);
            if (spawnedCount === leaderIndex) {
                entity.leader = true;
                entity.updateVisualProperties();
                
                // Create halo for enemy leader
                leaderHaloManager.addHalo(entity);
                
                console.log(`Enemy unit ${entity.id} is now a leader (${spawnedCount + 1} of ${count})`);
            }
            
            spawnedEntities.push(entity);
            spawnedCount++;
        }
    }
    
    // Create enemy group if 2+ units spawned
    if (spawnedEntities.length >= 2) {
        const group = new Group(groupName, spawnedEntities);
        entityManager.groups.push(group);
        updateGroupTabs();
        console.log(`Enemy group "${groupName}" created with ${spawnedEntities.length} units. Group ID: ${group.id}`);
    }
    
    console.log(`Spawned ${spawnedCount} enemy entities at (${centerX}, ${centerY})`);
}

const noFormationItem = formationBrowser.querySelector('[data-formation-id="none"]');
if (noFormationItem) {
    noFormationItem.addEventListener('click', () => {
        selectFormationInBrowser('none');
    });
}

// ===== MENU SYSTEM =====

const restartBtn = document.getElementById('restartBtn');
const importMapBtn = document.getElementById('importMapBtn');
const fileInput = document.getElementById('fileInput');

restartBtn.addEventListener('click', () => {
    console.log('Restart clicked - no function yet!');
});

importMapBtn.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    
    if (!file) return;
    
    if (!file.type.match('image/jpeg') && !file.type.match('image/jpg')) {
        alert('Please select a JPG/JPEG image.');
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
        const img = new Image();
        
        img.onload = () => {
            console.log('Image loaded successfully:', img.width, 'x', img.height);
            
            if (img.width > MAP_WIDTH || img.height > MAP_HEIGHT) {
                alert(`Image too large! Maximum size is ${MAP_WIDTH}x${MAP_HEIGHT} pixels.`);
                return;
            }
            
            // Create off-screen canvas to extract pixel data
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = img.width;
            tempCanvas.height = img.height;
            const tempCtx = tempCanvas.getContext('2d');
            
            // Draw image to extract pixels
            tempCtx.drawImage(img, 0, 0);
            
            // Extract pixel data for terrain system
            terrainImageData = tempCtx.getImageData(0, 0, img.width, img.height);
            terrainWidth = img.width;
            terrainHeight = img.height;
            
            backgroundImage = img;
            
            // Generate obstacle overlay (do this after backgroundImage is set)
            generateObstacleOverlay();
            
            camera.x = 0;
            camera.y = 0;
            menuWindow.classList.add('hidden');
            
            console.log(`Map imported: ${img.width}x${img.height}`);
            console.log(`Terrain data extracted: ${terrainImageData.data.length / 4} pixels`);
        };
        
        img.onerror = (err) => {
            console.error('Image failed to load:', err);
            alert('Failed to load image. Please try again.');
        };
        
        img.src = e.target.result;
    };
    
    reader.onerror = (err) => {
        console.error('FileReader error:', err);
        alert('Failed to read file. Please try again.');
    };
    
    reader.readAsDataURL(file);
    fileInput.value = '';
});

// ===== SPAWN ENTITY BUTTON =====

const spawnEntityBtn = document.getElementById('spawnEntityBtn');
const rangedSelect = document.getElementById('rangedSelect');
const meleeSelect = document.getElementById('meleeSelect');
const armorSelect = document.getElementById('armorSelect');
const troopCountInput = document.getElementById('troopCountInput');

spawnEntityBtn.addEventListener('click', () => {
    const selectedRanged = rangedSelect.value;
    const selectedMelee = meleeSelect.value;
    const selectedArmor = armorSelect.value;
    const troopCount = parseInt(troopCountInput.value) || 1;

    if (troopCount < 1 || troopCount > 100) {
        alert('Troop count must be between 1 and 100');
        return;
    }

    const equipment = {};

    if (selectedRanged !== 'nothing') {
        equipment.ranged = equipmentLoader.getEquipment('ranged').find(w => w.name === selectedRanged);
    }

    if (selectedMelee !== 'nothing') {
        equipment.melee = equipmentLoader.getEquipment('melee').find(w => w.name === selectedMelee);
    }

    if (selectedArmor !== 'nothing') {
        equipment.armor = equipmentLoader.getEquipment('armor').find(a => a.name === selectedArmor);
    }

    // Get attribute settings
    const mounted = document.getElementById('mountedCheckbox').checked;
    const leader = document.getElementById('leaderCheckbox').checked;
    const inventory = document.getElementById('inventorySelect').value;

    spawnMode = true;
    spawnEquipment = equipment;
    spawnTroopCount = troopCount;
    window.spawnAttributes = { mounted, leader, item: inventory === 'none' ? null : inventory };
    canvas.style.cursor = 'crosshair';

    spawnWindow.classList.add('hidden');

    console.log(`Spawn mode activated. Right-click to place ${troopCount} entities.`, equipment);
});

// ===== CLOSE BUTTONS =====

document.querySelectorAll('.close-btn-red').forEach((btn) => {
    btn.addEventListener('click', () => {
        const dialogueWindow = btn.closest('.dialogue-window');
        if (dialogueWindow) {
            dialogueWindow.classList.add('hidden');
        }
        
        if (btn.closest('#spawnWindow')) {
            spawnMode = false;
            spawnEquipment = null;
            spawnTroopCount = 1;
            troopCountInput.value = 1;
            canvas.style.cursor = 'crosshair';
        }
        
        if (btn.closest('#enemyGroupWindow')) {
            enemySpawnMode = false;
            enemySpawnEquipment = null;
            enemySpawnTroopCount = 10;
            enemyTroopCountInput.value = 10;
            enemyGroupNameInput.value = '';
            canvas.style.cursor = 'crosshair';
        }
    });
});

// ===== STANCE BUTTON HANDLERS =====

const stanceDefensiveBtn = document.getElementById('stanceDefensiveBtn');
const stanceNoneBtn = document.getElementById('stanceNoneBtn');
const stanceOffensiveBtn = document.getElementById('stanceOffensiveBtn');

stanceDefensiveBtn.addEventListener('click', () => {
    setSelectedStance('defensive');
});

stanceNoneBtn.addEventListener('click', () => {
    setSelectedStance('none');
});

stanceOffensiveBtn.addEventListener('click', () => {
    setSelectedStance('offensive');
});

function setSelectedStance(stance) {
    const selected = entityManager.selectedEntities;
    
    // Only change stance for friendly units
    // Filter: friendly units that are NOT crew members (crew always have 'none' stance)
    const friendlyUnits = selected.filter(e => e.faction === 'blue' && !e.isCrewMember);

    if (friendlyUnits.length === 0) {
        console.log('No friendly units selected to change stance (crew members cannot change stance)');
        return;
    }

    // Change stance for all friendly units (excluding crew)
    for (const entity of friendlyUnits) {
        entity.stance = stance;
        entity.lockedTarget = null; // Clear any locked target when changing stance
        entity.hasManualTarget = false; // Clear manual target flag
        console.log(`Entity ${entity.id} stance changed to: ${stance}`);
    }
    
    // Update UI
    updateStanceButtons();
    updateUnitInfo(); // CHECK
}

// ===== HOLD FIRE BUTTON HANDLER =====

const holdFireBtn = document.getElementById('holdFireBtn');

holdFireBtn.addEventListener('click', () => {
    toggleHoldFire();
});

function toggleHoldFire() {
    const selectedCannon = cannonManager.getSelectedCannon();

    // Handle cannon hold fire
    if (selectedCannon && selectedCannon.faction === 'blue') {
        selectedCannon.holdFire = !selectedCannon.holdFire;
        console.log(`Cannon ${selectedCannon.id} holdFire: ${selectedCannon.holdFire}`);
        updateHoldFireButton();
        return;
    }

    // Handle unit hold fire
    const selected = entityManager.selectedEntities;
    const friendlyUnits = selected.filter(e => e.faction === 'blue' && !e.isCrewMember);

    if (friendlyUnits.length === 0) return;

    // Toggle: if any have holdFire off, turn all on; otherwise turn all off
    const anyNotHolding = friendlyUnits.some(e => !e.holdFire);

    for (const entity of friendlyUnits) {
        entity.holdFire = anyNotHolding;
        console.log(`Entity ${entity.id} holdFire: ${entity.holdFire}`);
    }

    updateHoldFireButton();
}

function updateHoldFireButton() {
    const holdFireBtn = document.getElementById('holdFireBtn');
    const selectedCannon = cannonManager.getSelectedCannon();

    // Handle cannon selection
    if (selectedCannon) {
        if (selectedCannon.holdFire) {
            holdFireBtn.classList.add('active');
        } else {
            holdFireBtn.classList.remove('active');
        }
        return;
    }

    // Handle unit selection
    const selected = entityManager.selectedEntities;

    if (selected.length === 0) {
        holdFireBtn.classList.remove('active');
        return;
    }

    const anyHolding = selected.some(e => e.holdFire);

    if (anyHolding) {
        holdFireBtn.classList.add('active');
    } else {
        holdFireBtn.classList.remove('active');
    }
}

init();


   // TEMPORARY TEST CODE - Remove after testing
   window.testFire = function() {
       const centerX = camera.x + canvas.width / 2;
       const centerY = camera.y + canvas.height / 2;
       fireManager.addFire(centerX, centerY);
       console.log('Test fire spawned at screen center');
   };