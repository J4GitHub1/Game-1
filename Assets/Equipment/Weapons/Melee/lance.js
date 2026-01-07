// Equipment asset file - DO NOT REMOVE THIS IDENTIFIER
const EQUIPMENT_ASSET = true;

const equipment = {
    // Identity
    name: "Lance",
    display_name:"Lance",
    
    // Type
    type: "melee",
    
    // Attributes (0-2 range)
    weight: 1.5,
    length: 2
};

// Export for game to load
if (typeof module !== 'undefined' && module.exports) {
    module.exports = equipment;
}