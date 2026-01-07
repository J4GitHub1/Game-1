// Equipment asset file - DO NOT REMOVE THIS IDENTIFIER
const EQUIPMENT_ASSET = true;

const equipment = {
    // Identity
    name: "Incendiary_Rifle",
    display_name: "Incendiary Rifle",
    
    // Type
    type: "ranged",
    
    // Attributes (0-2 range)
    weight: 1.5,
    calibre: 1,
    magazine: 1,
    length: 1,
    incendiary: true,
    fire_mode: "normal"
};

// Export for game to load
if (typeof module !== 'undefined' && module.exports) {
    module.exports = equipment;
}