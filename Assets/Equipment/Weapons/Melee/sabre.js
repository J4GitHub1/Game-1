// Equipment asset file - DO NOT REMOVE THIS IDENTIFIER
const EQUIPMENT_ASSET = true;

const equipment = {
    // Identity
    name: "Sabre",
    display_name: "Sabre",
    
    // Type
    type: "melee",
    
    // Attributes (0-2 range)
    weight: 1,
    length: 1
};

// Export for game to load
if (typeof module !== 'undefined' && module.exports) {
    module.exports = equipment;
}