const fs = require('fs');
const path = require('path');

const CUSTOM_BADGES_FILE = path.join(__dirname, 'custom_badges.json');

// Built-in milestones and manual badges
const DEFAULT_BADGES = {
    // Automated Balance Badges
    FIRST_STEPS:  { id: "FIRST_STEPS",  emoji: "<:Goober:1538666294948270190>",          name: "Novice",                desc: "Earned 5,000 credits",                              req: 5000n,            type: "balance" },
    HIGH_ROLLER:  { id: "HIGH_ROLLER",  emoji: "<:protogenirl:1536430038751121499>",     name: "High Roller",           desc: "Earned 1,000,000 credits",                          req: 1000000n,         type: "balance" },
    BILLIONAIRE:  { id: "BILLIONAIRE",  emoji: "<:puropolice:1538665393986605188>",      name: "Billionaire",           desc: "Earned 1,000,000,000 credits",                      req: 1000000000n,      type: "balance" },
    MAX_CAP:      { id: "MAX_CAP",      emoji: "<:Sus:1541509245499875439>",             name: "Integer Overlord",      desc: "Hit absolute credit max cap (10^153)",              req: 10n ** 153n,      type: "balance" },

    // Manual Award Badges
    CONTRIBUTOR:  { id: "CONTRIBUTOR",  emoji: "<:ShiziSleeping:1538665475167486035>",   name: "Contributor",           desc: "Contributed to the bot in any way",                 type: "manual" },
    OWNER:        { id: "OWNER",        emoji: "<:Agro388:1542396105738948689>",         name: "Owner",                 desc: "Owner of the bot",                                  type: "manual" },
    STEVEN:       { id: "STEVEN",       emoji: "<:Steven130:1542399890783604787>",       name: "Steven130",             desc: "<:Steven130:1542399890783604787>",                   type: "manual" },
    BENJAMIN:     { id: "BENJAMIN",     emoji: "<:Benjamin391:1542399892381507665>",     name: "Benjamin391",           desc: "<:Benjamin391:1542399892381507665>",                 type: "manual" },
    GAMBLER:      { id: "GAMBLER",      emoji: "<:Credit:1541934198791737475>",          name: "Gambler",               desc: "Gamble away all your saving for no reason.",        type: "manual" },
    SPYTHEPROOT:  { id: "SPYTHEPROOT",  emoji: "<:SpyTheProot:1542483331734573148>",     name: "Spy",                   desc: "<:SpyTheProot:1542483331734573148>",                 type: "manual" },
    AGRO388:      { id: "AGRO388",      emoji: "<:Agro388:1542396105738948689>",         name: "Agro388",               desc: "Agro388",                                           type: "manual" },
    INSERVER:     { id: "INSERVER",     emoji: "<:Puro_doing_a_swim:1538666516680282233>", name: "ProtoBot Server Member", desc: "Join the official ProtoBot Dev server :3",         type: "manual" }
};

// Load custom badges from file; auto-creates empty JSON file if non-existent
function loadCustomBadges() {
    if (!fs.existsSync(CUSTOM_BADGES_FILE)) {
        saveCustomBadges({});
        return {};
    }
    try {
        const raw = fs.readFileSync(CUSTOM_BADGES_FILE, 'utf8');
        const parsed = JSON.parse(raw || '{}');
        
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

// Save custom badges to file safely stringifying BigInt values (ensures directory & file exist)
function saveCustomBadges(badges) {
    try {
        const dirPath = path.dirname(CUSTOM_BADGES_FILE);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }

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
