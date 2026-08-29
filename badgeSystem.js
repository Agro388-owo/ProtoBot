const fs = require('fs');
const path = require('path');

const CUSTOM_BADGES_FILE = path.join(__dirname, 'custom_badges.json');

// Built-in milestones
const DEFAULT_BADGES = {
    FIRST_STEPS: { id: "FIRST_STEPS", emoji: "<:Goober:1538666294948270190>", name: "Novice", desc: "Earned 5,000 credits", req: 5000n, type: "balance" },
    HIGH_ROLLER: { id: "HIGH_ROLLER", emoji: "<:protogenirl:1536430038751121499>", name: "High Roller", desc: "Earned 1,000,000 credits", req: 1000000n, type: "balance" },
    BILLIONAIRE: { id: "BILLIONAIRE", emoji: "<:puropolice:1538665393986605188>", name: "Billionaire", desc: "Earned 1,000,000,000 credits", req: 1000000000n, type: "balance" },
    MAX_CAP:     { id: "MAX_CAP",     emoji: "<:Sus:1541509245499875439>", name: "Integer Overlord", desc: "Hit absolute credit max cap (10^153)", req: 10n ** 153n, type: "balance" }
};

// Load custom badges from file and parse numerical thresholds into BigInt
function loadCustomBadges() {
    if (!fs.existsSync(CUSTOM_BADGES_FILE)) return {};
    try {
        const raw = fs.readFileSync(CUSTOM_BADGES_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        
        for (const key in parsed) {
            if (parsed[key].req !== undefined) {
                parsed[key].req = BigInt(parsed[key].req);
            }
        }
        return parsed;
    } catch (e) {
        console.error('Failed to load custom_badges.json:', e);
        return {};
    }
}

// Save custom badges to file safely stringifying BigInt values
function saveCustomBadges(badges) {
    try {
        const serialized = JSON.stringify(badges, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value, 2);
        fs.writeFileSync(CUSTOM_BADGES_FILE, serialized, 'utf8');
    } catch (e) {
        console.error('Failed to save custom_badges.json:', e);
    }
}

// Get all active badges merged
function getAllBadges() {
    const custom = loadCustomBadges();
    return { ...DEFAULT_BADGES, ...custom };
}

// Award threshold-based badges dynamically
function checkAndAwardBadges(userData) {
    if (!userData.badges) userData.badges = [];
    
    // Ensure current balance is evaluated as BigInt
    const currentBalance = BigInt(userData.balance || 0);
    const allBadges = getAllBadges();
    const newBadges = [];

    for (const badge of Object.values(allBadges)) {
        if (badge.type === "balance" && badge.req !== undefined) {
            const required = BigInt(badge.req.toString());
            if (!userData.badges.includes(badge.id) && currentBalance >= required) {
                userData.badges.push(badge.id);
                newBadges.push(badge);
            }
        }
    }
    return newBadges;
}

module.exports = {
    DEFAULT_BADGES,
    loadCustomBadges,
    saveCustomBadges,
    getAllBadges,
    checkAndAwardBadges
};
