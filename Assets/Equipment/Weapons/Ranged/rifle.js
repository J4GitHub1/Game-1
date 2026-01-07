// Equipment asset file - DO NOT REMOVE THIS IDENTIFIER
const EQUIPMENT_ASSET = true;

const equipment = {
    // Identity
    name: "Rifle",
    display_name: "Standard Rifle",
    
    // Type
    type: "ranged",
    
    // Attributes (0-2 range)
    weight: 1,
    calibre: 1,
    magazine: 1,
    length: 1.3,
    incendiary: false,
    fire_mode: "normal" 
};

// Export for game to load
if (typeof module !== 'undefined' && module.exports) {
    module.exports = equipment;
}