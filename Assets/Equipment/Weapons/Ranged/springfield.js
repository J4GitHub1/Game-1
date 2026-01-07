// Equipment asset file - DO NOT REMOVE THIS IDENTIFIER
const EQUIPMENT_ASSET = true;

const equipment = {
    // Identity
    name: "Springfield",
    display_name: "Three-shot medium",
    
    // Type
    type: "ranged",
    
    // Attributes (0-2 range)
    weight: 1.3,      // Rifled musket, slightly lighter
    calibre: 1.4,     // .58 caliber Minié ball
    magazine: 3,      // Single shot muzzle-loader
    length: 1.6,
    incendiary: false,
    fire_mode: "normal"
};

// Export for game to load
if (typeof module !== 'undefined' && module.exports) {
    module.exports = equipment;
}
