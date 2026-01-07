// Equipment asset file - DO NOT REMOVE THIS IDENTIFIER
const EQUIPMENT_ASSET = true;

const equipment = {
    // Identity
    name: "Magazine Rifle",
    display_name: "Five-shot light",
    
    // Type
    type: "ranged",
    
    // Attributes (0-2 range)
    weight: 1.3,      // Rifled musket, slightly lighter
    calibre: 1,     // .58 caliber Minié ball
    magazine: 5,      // Single shot muzzle-loader
    length: 1.3,
    incendiary: false,
    fire_mode: "normal"
};

// Export for game to load
if (typeof module !== 'undefined' && module.exports) {
    module.exports = equipment;
}
