// Equipment asset file - DO NOT REMOVE THIS IDENTIFIER
const EQUIPMENT_ASSET = true;

const equipment = {
    // Identity
    name: "Heavy_Armor",
    display_name: "Heavy Armor",
    
    // Type
    type: "armor",
    
    // Attributes (0-2 range)
    weight: 2,
    protection: 2
};

// Export for game to load
if (typeof module !== 'undefined' && module.exports) {
    module.exports = equipment;
}