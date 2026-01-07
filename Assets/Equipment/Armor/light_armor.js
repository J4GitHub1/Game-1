// Equipment asset file - DO NOT REMOVE THIS IDENTIFIER
const EQUIPMENT_ASSET = true;

const equipment = {
    // Identity
    name: "Light_Armor",
    display_name: "Light Armor",
    
    // Type
    type: "armor",
    
    // Attributes (0-2 range)
    weight: 1,
    protection: 1
};

// Export for game to load
if (typeof module !== 'undefined' && module.exports) {
    module.exports = equipment;
}