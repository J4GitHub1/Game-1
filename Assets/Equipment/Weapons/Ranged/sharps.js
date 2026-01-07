// Equipment asset file - DO NOT REMOVE THIS IDENTIFIER
const EQUIPMENT_ASSET = true;

const equipment = {
    // Identity
    name: "Sharps",
    display_name: "Sharp Shooter's Rifle",
    
    // Type
    type: "ranged",
    
    // Attributes (0-2 range)
    weight: 1.5,      // Lighter breech-loader
    calibre: 1.5,     // .52 caliber
    magazine: 1,      // Single shot breech-loader (faster reload than muzzle-loader)
    length: 2,
    incendiary: false,
    fire_mode: "normal"
};

// Export for game to load
if (typeof module !== 'undefined' && module.exports) {
    module.exports = equipment;
}
