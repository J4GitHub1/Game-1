// Equipment Loader - Dynamically loads equipment from Assets folder
// NOTE: All custom assets must be declared here!

class EquipmentLoader {
    constructor() {
        this.equipment = {
            melee: [],
            ranged: [],
            armor: []
        };
    }

    // Load all equipment files
    async loadAllEquipment() {
        // Define equipment files manually (since you can't scan directories in browser)
        const equipmentFiles = {
            melee: ['sabre.js', 'lance.js'],
            ranged: ['rifle.js', 'brown_bess.js', 'springfield.js', 'sharps.js', 'fire_rifle.js', 'magazine_rifle.js', 'burstgun.js', 'shotgun.js', 'fire_shotgun.js', 'samppa_gun.js'],
            armor: ['light_armor.js', 'heavy_armor.js']
        };

        // Load melee weapons
        for (const file of equipmentFiles.melee) {
            await this.loadEquipmentFile('Melee', file, 'melee');
        }

        // Load ranged weapons
        for (const file of equipmentFiles.ranged) {
            await this.loadEquipmentFile('Ranged', file, 'ranged');
        }

        // Load armor
        for (const file of equipmentFiles.armor) {
            await this.loadEquipmentFile('Armor', file, 'armor');
        }

        // Sort all equipment alphabetically by display_name
        this.equipment.melee.sort((a, b) => a.display_name.localeCompare(b.display_name));
        this.equipment.ranged.sort((a, b) => a.display_name.localeCompare(b.display_name));
        this.equipment.armor.sort((a, b) => a.display_name.localeCompare(b.display_name));

        console.log('Equipment loaded:', this.equipment);
    }

    // Load a single equipment file
    async loadEquipmentFile(category, filename, type) {
        try {
            let path;
            if (type === 'armor') {
                path = `Assets/Equipment/Armor/${filename}`;
            } else {
                path = `Assets/Equipment/Weapons/${category}/${filename}`;
            }

            const response = await fetch(path);
            const text = await response.text();

            // Execute the script to get the equipment object
            const scriptFunc = new Function(text + '; return equipment;');
            const equipmentData = scriptFunc();

            // Verify it's a valid equipment asset
            if (equipmentData) {
                this.equipment[type].push(equipmentData);
            }
        } catch (error) {
            console.error(`Failed to load ${filename}:`, error);
        }
    }

    getEquipment(type) {
        return this.equipment[type] || [];
    }
}

// Create global equipment loader instance
const equipmentLoader = new EquipmentLoader();