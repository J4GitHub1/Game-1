// Equipment asset file - DO NOT REMOVE THIS IDENTIFIER
const EQUIPMENT_ASSET = true;

const equipment = {
    // Identity
    name: "Brown_Bess",
    display_name: "Heavy one-shot",
    
    // Type
    type: "ranged",
    
    // Attributes (0-2 range)
    weight: 1.7,      // Heavy smoothbore musket
    calibre: 1.8,     // Large .75 caliber ball
    magazine: 1,      // Single shot muzzle-loader
    length: 0.9,
    incendiary: false,
    fire_mode: "normal"
};

// Export for game to load
if (typeof module !== 'undefined' && module.exports) {
    module.exports = equipment;
}
