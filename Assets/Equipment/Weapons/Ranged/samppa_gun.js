// Equipment asset file - DO NOT REMOVE THIS IDENTIFIER
const EQUIPMENT_ASSET = true;

const equipment = {
    // Identity
    name: "Samppa",
    display_name: "Samppa",
    
    // Type
    type: "ranged",
    
    // Attributes (0-2 range)
    weight: 1,
    calibre: 2,
    magazine: 5,
    length: 2,
    incendiary: true,
    fire_mode: "burst" 
};

// Export for game to load
if (typeof module !== 'undefined' && module.exports) {
    module.exports = equipment;
}