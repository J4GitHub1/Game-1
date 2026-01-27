// UI Manager - Resolution-independent UI scaling system
// Scales UI proportionally to a base design resolution (1920x1080)

const AnchorType = {
    TOP_LEFT: 'top-left',
    TOP_RIGHT: 'top-right',
    BOTTOM_LEFT: 'bottom-left',
    BOTTOM_RIGHT: 'bottom-right',
    TOP_CENTER: 'top-center',
    BOTTOM_CENTER: 'bottom-center',
    LEFT_CENTER: 'left-center',
    RIGHT_CENTER: 'right-center',
    CENTER: 'center'
};

class UIManager {
    constructor(options = {}) {
        this.baseWidth = options.baseWidth || 1920;
        this.baseHeight = options.baseHeight || 1080;
        this.minScale = options.minScale || 0.5;
        this.maxScale = options.maxScale || 1.5;

        this.elements = new Map();
        this.viewportWidth = window.innerWidth;
        this.viewportHeight = window.innerHeight;
        this.scaleFactor = 1;

        this.handleResize = this.handleResize.bind(this);
        this.init();
    }

    init() {
        window.addEventListener('resize', this.handleResize);
        this.calculateScale();
    }

    calculateScale() {
        this.viewportWidth = window.innerWidth;
        this.viewportHeight = window.innerHeight;

        const widthRatio = this.viewportWidth / this.baseWidth;
        const heightRatio = this.viewportHeight / this.baseHeight;

        this.scaleFactor = Math.min(widthRatio, heightRatio);
        this.scaleFactor = Math.max(this.minScale, Math.min(this.maxScale, this.scaleFactor));
    }

    register(id, config) {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`UIManager: Element #${id} not found`);
            return null;
        }

        const registration = {
            element,
            id,
            anchor: config.anchor || AnchorType.TOP_LEFT,
            baseX: config.x || 0,
            baseY: config.y || 0,
            baseWidth: config.width,
            baseHeight: config.height,
            draggable: config.draggable || false,
            isDragged: false,
            scaleElement: config.scaleElement !== false,
            scalePosition: config.scalePosition !== false,
            fullWidth: config.fullWidth || false,
            scaleHeight: config.scaleHeight || false
        };

        this.elements.set(id, registration);
        this.positionElement(registration);

        if (config.draggable) {
            this.setupDragging(registration);
        }

        return registration;
    }

    positionElement(reg) {
        const el = reg.element;

        // Handle full-width elements specially (like group tabs)
        if (reg.fullWidth) {
            el.style.left = '0';
            el.style.right = '0';
            el.style.top = '0';
            if (reg.scaleHeight && reg.baseHeight) {
                el.style.height = `${reg.baseHeight * this.scaleFactor}px`;
            }
            if (reg.scaleElement) {
                el.style.transform = `scale(${this.scaleFactor})`;
                el.style.transformOrigin = 'top left';
                // Compensate width for scale
                el.style.width = `${100 / this.scaleFactor}%`;
            }
            return;
        }

        // Skip position update if user has dragged this element
        if (reg.isDragged) {
            if (reg.scaleElement) {
                el.style.transform = `scale(${this.scaleFactor})`;
            }
            return;
        }

        const scaledX = reg.scalePosition ? reg.baseX * this.scaleFactor : reg.baseX;
        const scaledY = reg.scalePosition ? reg.baseY * this.scaleFactor : reg.baseY;

        // Clear positioning
        el.style.top = '';
        el.style.right = '';
        el.style.bottom = '';
        el.style.left = '';
        el.style.marginLeft = '';
        el.style.marginTop = '';

        switch (reg.anchor) {
            case AnchorType.TOP_LEFT:
                el.style.top = `${scaledY}px`;
                el.style.left = `${scaledX}px`;
                el.style.transformOrigin = 'top left';
                break;

            case AnchorType.TOP_RIGHT:
                el.style.top = `${scaledY}px`;
                el.style.right = `${scaledX}px`;
                el.style.transformOrigin = 'top right';
                break;

            case AnchorType.BOTTOM_LEFT:
                el.style.bottom = `${scaledY}px`;
                el.style.left = `${scaledX}px`;
                el.style.transformOrigin = 'bottom left';
                break;

            case AnchorType.BOTTOM_RIGHT:
                el.style.bottom = `${scaledY}px`;
                el.style.right = `${scaledX}px`;
                el.style.transformOrigin = 'bottom right';
                break;

            case AnchorType.TOP_CENTER:
                el.style.top = `${scaledY}px`;
                el.style.left = '50%';
                if (reg.baseWidth) {
                    el.style.marginLeft = `${(-reg.baseWidth / 2) * this.scaleFactor}px`;
                } else {
                    el.style.transform = `translateX(-50%) scale(${this.scaleFactor})`;
                    el.style.transformOrigin = 'top center';
                    return;
                }
                el.style.transformOrigin = 'top center';
                break;

            case AnchorType.BOTTOM_CENTER:
                el.style.bottom = `${scaledY}px`;
                el.style.left = '50%';
                el.style.transform = `translateX(-50%) scale(${this.scaleFactor})`;
                el.style.transformOrigin = 'bottom center';
                return;

            case AnchorType.LEFT_CENTER:
                el.style.left = `${scaledX}px`;
                el.style.top = '50%';
                el.style.transform = `translateY(-50%) scale(${this.scaleFactor})`;
                el.style.transformOrigin = 'left center';
                return;

            case AnchorType.RIGHT_CENTER:
                el.style.right = `${scaledX}px`;
                el.style.top = '50%';
                el.style.transform = `translateY(-50%) scale(${this.scaleFactor})`;
                el.style.transformOrigin = 'right center';
                return;

            case AnchorType.CENTER:
                el.style.top = '50%';
                el.style.left = '50%';
                el.style.transform = `translate(-50%, -50%) scale(${this.scaleFactor})`;
                el.style.transformOrigin = 'center center';
                return;
        }

        if (reg.scaleElement) {
            el.style.transform = `scale(${this.scaleFactor})`;
        }
    }

    setupDragging(reg) {
        const el = reg.element;
        const header = el.querySelector('.dialogue-header');
        if (!header) return;

        let isDragging = false;
        let startMouseX = 0;
        let startMouseY = 0;
        let startElX = 0;
        let startElY = 0;

        header.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('close-btn-red')) return;

            isDragging = true;
            startMouseX = e.clientX;
            startMouseY = e.clientY;

            const rect = el.getBoundingClientRect();
            startElX = rect.left;
            startElY = rect.top;

            header.style.cursor = 'grabbing';
            e.preventDefault();
        });

        const handleMouseMove = (e) => {
            if (!isDragging) return;

            const deltaX = e.clientX - startMouseX;
            const deltaY = e.clientY - startMouseY;

            const newX = startElX + deltaX;
            const newY = startElY + deltaY;

            el.style.left = `${newX}px`;
            el.style.top = `${newY}px`;
            el.style.right = '';
            el.style.bottom = '';
            el.style.marginLeft = '';

            reg.isDragged = true;
        };

        const handleMouseUp = () => {
            if (isDragging) {
                isDragging = false;
                header.style.cursor = 'move';
            }
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }

    resetPosition(id) {
        const reg = this.elements.get(id);
        if (reg) {
            reg.isDragged = false;
            this.positionElement(reg);
        }
    }

    handleResize() {
        this.calculateScale();
        this.elements.forEach(reg => this.positionElement(reg));
    }

    getScale() {
        return this.scaleFactor;
    }

    destroy() {
        window.removeEventListener('resize', this.handleResize);
        this.elements.clear();
    }
}

// UI Element Configuration
const UI_CONFIG = {
    // Top-right buttons (stacked vertically)
    menuButton: { anchor: AnchorType.TOP_RIGHT, x: 20, y: 60, width: 50, height: 50 },
    spawnButton: { anchor: AnchorType.TOP_RIGHT, x: 20, y: 120, width: 50, height: 50 },
    groupButton: { anchor: AnchorType.TOP_RIGHT, x: 20, y: 180, width: 50, height: 50 },
    formationButton: { anchor: AnchorType.TOP_RIGHT, x: 20, y: 240, width: 50, height: 50 },
    enemySpawnButton: { anchor: AnchorType.TOP_RIGHT, x: 20, y: 300, width: 50, height: 50 },
    objectiveSpawnButton: { anchor: AnchorType.TOP_RIGHT, x: 20, y: 360, width: 50, height: 50 },

    // Bottom-right
    godMenuButton: { anchor: AnchorType.BOTTOM_RIGHT, x: 20, y: 20, width: 50, height: 50 },
    godMenuDropdown: { anchor: AnchorType.BOTTOM_RIGHT, x: 20, y: 80, width: 200 },

    // Bottom-left panels
    unitInfoWindow: { anchor: AnchorType.BOTTOM_LEFT, x: 20, y: 20, width: 280 },
    objectInfoWindow: { anchor: AnchorType.BOTTOM_LEFT, x: 20, y: 20, width: 220 },

    // Left-center
    formationBrowser: { anchor: AnchorType.LEFT_CENTER, x: 20, y: 0, width: 140 },

    // Bottom-center
    stanceHUD: { anchor: AnchorType.BOTTOM_CENTER, x: 0, y: 20 },

    // Top-center (draggable)
    formationEditorWindow: { anchor: AnchorType.TOP_CENTER, x: 0, y: 100, width: 1000, draggable: true },

    // Top-right windows (draggable)
    menuWindow: { anchor: AnchorType.TOP_RIGHT, x: 100, y: 100, width: 300, draggable: true },
    spawnWindow: { anchor: AnchorType.TOP_RIGHT, x: 420, y: 100, width: 300, draggable: true },
    groupNameWindow: { anchor: AnchorType.TOP_RIGHT, x: 420, y: 250, width: 300, draggable: true },
    enemyGroupWindow: { anchor: AnchorType.TOP_RIGHT, x: 420, y: 400, width: 300, draggable: true },
    objectiveSpawnWindow: { anchor: AnchorType.TOP_RIGHT, x: 100, y: 250, width: 300, draggable: true },

    // Top edge (full width)
    groupTabsContainer: { anchor: AnchorType.TOP_LEFT, x: 0, y: 0, fullWidth: true, scaleHeight: true, baseHeight: 40 },

    // Top-left (no scaling)
    fpsCounter: { anchor: AnchorType.TOP_LEFT, x: 10, y: 50, scaleElement: false, scalePosition: false }
};

// Initialize UI Manager when DOM is ready
let uiManager = null;

function initUIManager() {
    uiManager = new UIManager({
        baseWidth: 1280,
        baseHeight: 720,
        minScale: 0.7,
        maxScale: 1.5
    });

    // Register all UI elements
    Object.entries(UI_CONFIG).forEach(([id, config]) => {
        uiManager.register(id, config);
    });

    return uiManager;
}
