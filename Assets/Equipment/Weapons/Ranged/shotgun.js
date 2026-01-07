// Equipment asset file - DO NOT REMOVE THIS IDENTIFIER
const EQUIPMENT_ASSET = true;

const equipment = {
    // Identity
    name: "Shotgun",
    display_name: "Shotgun",
    
    // Type
    type: "ranged",
    
    // Attributes (0-2 range)
    weight: 1.7,
    calibre: 1.3,
    magazine: 5,
    length: 1,
    incendiary: false,
    fire_mode: "scatter" 
};

// Export for game to load
if (typeof module !== 'undefined' && module.exports) {
    module.exports = equipment;
}