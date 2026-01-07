// Equipment asset file - DO NOT REMOVE THIS IDENTIFIER
const EQUIPMENT_ASSET = true;

const equipment = {
    // Identity
    name: "Burst_Rifle",
    display_name: "Burst Rifle",
    
    // Type
    type: "ranged",
    
    // Attributes (0-2 range)
    weight: 1.3,
    calibre: 1,
    magazine: 5,
    length: 1.5,
    incendiary: false,
    fire_mode: "burst" 
};

// Export for game to load
if (typeof module !== 'undefined' && module.exports) {
    module.exports = equipment;
}