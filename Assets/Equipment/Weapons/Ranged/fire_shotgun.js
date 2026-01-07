// Equipment asset file - DO NOT REMOVE THIS IDENTIFIER
const EQUIPMENT_ASSET = true;

const equipment = {
    // Identity
    name: "Incendiary_Shotgun",
    display_name: "Incendiary Shotgun",
    
    // Type
    type: "ranged",
    
    // Attributes (0-2 range)
    weight: 1.9,
    calibre: 1.3,
    magazine: 3,
    length: 1,
    incendiary: true,
    fire_mode: "scatter" 
};

// Export for game to load
if (typeof module !== 'undefined' && module.exports) {
    module.exports = equipment;
}