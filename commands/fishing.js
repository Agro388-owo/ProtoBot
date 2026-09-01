const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');
const botConfig = require('../config.js');

const { CREDIT, formatNumber, clampBalance, isInPrison } = require('./credits.js');
const { checkAndAwardBadges } = require('../badgeSystem.js');

const SHORKBOI_ID = '1082525438015983636';
const SPYTHEPROOT_ID = '1464072486651170931';
const DEFAULT_ALLOWED_USER_ID = '1521264771389984940';

const fishingCooldowns = new Map();
const BASE_COOLDOWN_DURATION = 30 * 1000;

const lootFilePath = path.resolve(process.cwd(), 'fishing_loot.json');
const creditsFilePath = path.resolve(process.cwd(), 'credits.json');
const inventoryFilePath = path.resolve(process.cwd(), 'inventory.json');
const rolesFilePath = path.resolve(process.cwd(), 'command_roles.json');
const configFilePath = path.resolve(process.cwd(), 'fishing_config.json');
const accessConfigFilePath = path.resolve(process.cwd(), 'fishing_access.json');

const METAL_ITEMS = ['pipe', 'soda_can', 'ram', 'copper_wire', 'battery', 'pc', 'iridium_cube'];

// ---------------------------------------------------------------------
// Safe Writer Helper (Auto-creates missing folders & safely formats JSON)
// ---------------------------------------------------------------------
function safeWriteJSON(filePath, data) {
    try {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        const serialized = JSON.stringify(data, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value, 2);
        fs.writeFileSync(filePath, serialized, 'utf8');
    } catch (e) {
        console.error(`Failed to write file at ${filePath}:`, e);
    }
}

// ---------------------------------------------------------------------
// Server / Global Access Storage Helpers
// ---------------------------------------------------------------------
function loadServerAccessConfig() {
    try {
        if (fs.existsSync(accessConfigFilePath)) {
            const raw = fs.readFileSync(accessConfigFilePath, 'utf8').trim();
            if (raw) return JSON.parse(raw);
        }
    } catch (e) {
        console.error('Failed to load fishing_access.json:', e);
    }
    const defaultConfig = { access_mode: 'all', allowed_servers: [] };
    safeWriteJSON(accessConfigFilePath, defaultConfig);
    return defaultConfig;
}

function saveServerAccessConfig(config) {
    safeWriteJSON(accessConfigFilePath, config);
}

// ---------------------------------------------------------------------
// Fishing Config Helpers
// ---------------------------------------------------------------------
function loadFishingConfig() {
    try {
        if (fs.existsSync(configFilePath)) {
            const raw = fs.readFileSync(configFilePath, 'utf8').trim();
            if (raw) return JSON.parse(raw);
        }
    } catch (e) {
        console.error('Failed to load fishing_config.json:', e);
    }
    const defaultConfig = { abyssalLocked: false, prizeMode: "economy" };
    safeWriteJSON(configFilePath, defaultConfig);
    return defaultConfig;
}

function saveFishingConfig(config) {
    safeWriteJSON(configFilePath, config);
}

const DEFAULT_LOOT_CONFIG = {
    mode: "economy",
    items: [
        { id: "pipe", name: "a Rusty Metal Pipe", emoji: "<:oldrustypipe:1544043459219038308>", catchCredits: 5n, sellValue: 5n, chance: 18, sellable: true },
        { id: "soda_can", name: "an Aluminum Soda Can", emoji: "<:alluminiumcan:1544043457746575401>", catchCredits: 8n, sellValue: 2n, chance: 16, sellable: true },
        { id: "duck", name: "a Squeaky Rubber Duck", emoji: "<:rubberduck:1544043460678651944>", catchCredits: 10n, sellValue: 5n, chance: 14, sellable: true },
        { id: "latex_sample", name: "a Strange Latex Puddle", emoji: "<:puroshock:1536366927230799972>", catchCredits: -150n, sellValue: 0n, chance: 8, sellable: false },
        { id: "salmon", name: "a Fresh Salmon", emoji: "<:salmon:1544043465195913287>", catchCredits: 25n, sellValue: 10n, chance: 12, sellable: true },
        { id: "ram", name: "a High-Speed DDR5 RAM Stick", emoji: "<:newram:1544043463790825555>", catchCredits: 50n, sellValue: 15n, chance: 9, sellable: true },
        { id: "copper_wire", name: "a Bundle of Copper Wire", emoji: "<:copperwire:1544043462259773622>", catchCredits: 120n, sellValue: 80n, chance: 7, sellable: true },
        { id: "battery", name: "a Heavy Lithium Battery", emoji: "<:lithiumbattery:1544043469801001104>", catchCredits: 100n, sellValue: 25n, chance: 5, sellable: true },
        { id: "core", name: "a Glowing Latex Core", emoji: "<:latexcore:1544043468329058364>", catchCredits: 250n, sellValue: 50n, chance: 4, sellable: true },
        { id: "cult_tracker", name: "a Cult Tracker", emoji: "<:culttracker:1544043441334263896>", catchCredits: -250n, sellValue: 0n, chance: 0.1, sellable: false },
        { id: "pc", name: "an Entire Desktop Tower", emoji: "<:desktoppc:1544043466726711487>", catchCredits: 500n, sellValue: 100n, chance: 2.5, sellable: true },
        { id: "statue", name: "GOLDEN BLOXY STATUE", emoji: "<:BloxyStatue:1542833919651610695>", catchCredits: 1000n, sellValue: 150n, chance: 1.2, sellable: true },
        { id: "robloxinoli", name: "GOLDEN ROBLOXINOLI STATUE", emoji: "<:RobloxiNoliStatue:1542834047494131712>", catchCredits: 1750n, sellValue: 200n, chance: 1, sellable: true },
        { id: "iridium_cube", name: "a Solid Iridium Cube", emoji: "<:iridiumcube:1544043430886375425>", catchCredits: 3200n, sellValue: 1500n, chance: 0.8, sellable: true },
        { id: "tracer_ammo", name: "a Box of 7.62×39mm Red Tracer Rounds", emoji: "<:762x39ammo:1544043435235872948>", catchCredits: 4500n, sellValue: 2200n, chance: 0.5, sellable: true },
        { id: "uox_fuel", name: "a UOX Fuel Assembly", emoji: "<:uox:1544043433453289473>", catchCredits: 6000n, sellValue: 3000n, chance: 0.3, sellable: true, flavor: "*Surprisingly, it's still warm after sitting underwater for 30 years...*" },
        { id: "mox_fuel", name: "a MOX Fuel Assembly", emoji: "<:mox:1544043436599017652>", catchCredits: 7500n, sellValue: 4000n, chance: 0.2, sellable: true, flavor: "*Faintly glowing, and still noticeably warm after 30 years underwater...*" },
        { id: "ring", name: "Ancient Stargate Dialing Ring", emoji: "<:dialring:1544043437978816512>", catchCredits: 2500n, sellValue: 250n, chance: 0.5, sellable: false },
        { id: "shorkboi", name: "Shorkboi", emoji: "<:Shorkboi:1542381402526449704>", catchCredits: 5000n, sellValue: 0n, chance: 0.5, sellable: false },
        { id: "spytheproot", name: "SpyTheProot", emoji: "<:SpyTheProot:1542483331734573148>", catchCredits: 5000n, sellValue: 0n, chance: 0.5, sellable: false }
    ]
};

const ABYSSAL_EXCLUSIVE_ITEMS = [
    { id: "abyssal_pearl", name: "an Iridescent Abyssal Pearl", emoji: "<:abyssalpearl:1544043445004279938>", catchCredits: 750n, sellValue: 400n, chance: 12, sellable: true, flavor: "*It pulses with a cold, otherworldly luminescence from the crushing depths.*", abyssalOnly: true },
    { id: "void_shard", name: "a Shard of Pure Void Matter", emoji: "<:voidmatter:1544043446472540272>", catchCredits: 1200n, sellValue: 650n, chance: 7, sellable: true, flavor: "*Light seems to bend around its jagged edges, whispering secrets of the deep trench.*", abyssalOnly: true },
    { id: "leviathan_scale", name: "an Ancient Leviathan Scale", emoji: "<:leviatanscale:1544043443511107695>", catchCredits: 1800n, sellValue: 950n, chance: 3, sellable: true, flavor: "*Heavy as solid steel and impossibly resilient to extreme pressure.*", abyssalOnly: true }
];

function loadRolesDB() {
    try {
        if (fs.existsSync(rolesFilePath)) {
            const raw = fs.readFileSync(rolesFilePath, 'utf8').trim();
            if (raw) {
                const db = JSON.parse(raw);
                if (!db[DEFAULT_ALLOWED_USER_ID]) {
                    db[DEFAULT_ALLOWED_USER_ID] = ['catch'];
                } else if (!db[DEFAULT_ALLOWED_USER_ID].includes('catch') && !db[DEFAULT_ALLOWED_USER_ID].includes('*')) {
                    db[DEFAULT_ALLOWED_USER_ID].push('catch');
                }
                return db;
            }
        }
    } catch (e) {
        console.error('Failed to load command_roles.json:', e);
    }
    const defaultRoles = { [DEFAULT_ALLOWED_USER_ID]: ['catch'] };
    safeWriteJSON(rolesFilePath, defaultRoles);
    return defaultRoles;
}

function saveRolesDB(data) {
    safeWriteJSON(rolesFilePath, data);
}

function loadInventoryDB() {
    try {
        if (fs.existsSync(inventoryFilePath)) {
            const raw = fs.readFileSync(inventoryFilePath, 'utf8').trim();
            if (raw) return JSON.parse(raw);
        }
    } catch (e) {
        console.error('Failed to load inventory.json:', e);
    }
    const defaultInv = {};
    safeWriteJSON(inventoryFilePath, defaultInv);
    return defaultInv;
}

function addItemToInventory(userId, itemId) {
    let db = loadInventoryDB();
    if (!db[userId]) db[userId] = [];
    db[userId].push(itemId.toLowerCase());
    safeWriteJSON(inventoryFilePath, db);
}

function getGlobalItemCount(itemId) {
    const db = loadInventoryDB();
    let count = 0;
    for (const userId in db) {
        if (Array.isArray(db[userId])) {
            count += db[userId].filter(item => item.toLowerCase() === itemId.toLowerCase()).length;
        }
    }
    return count;
}

function getCalculatedReward(item) {
    const config = loadFishingConfig();
    const mode = config.prizeMode || "economy";
    const baseVal = Number(item.catchCredits);

    if (baseVal <= 0) return item.catchCredits;
    if (mode === "old") return item.catchCredits;

    if (mode === "relative") {
        const count = getGlobalItemCount(item.id);
        const scalingFactor = Math.max(0.05, 1 - (count * 0.02));
        const adjusted = Math.round(baseVal * scalingFactor);
        return BigInt(Math.max(1, adjusted));
    }

    const count = getGlobalItemCount(item.id);
    const multiplier = Math.max(0.1, 1 / (1 + (0.08 * count)));
    const adjusted = Math.round(baseVal * multiplier);
    return BigInt(Math.max(1, adjusted));
}

function loadLootDB() {
    const defaultMasterList = [...DEFAULT_LOOT_CONFIG.items, ...ABYSSAL_EXCLUSIVE_ITEMS];
    
    try {
        if (fs.existsSync(lootFilePath)) {
            const raw = fs.readFileSync(lootFilePath, 'utf8').trim();
            if (raw) {
                const parsed = JSON.parse(raw);
                const fileItems = parsed.items || [];

                let items = defaultMasterList.map(defaultItem => {
                    const savedMatch = fileItems.find(i => i.id === defaultItem.id);
                    return {
                        ...savedMatch,
                        ...defaultItem, // Prioritizes code defaults for name, emoji, values, chance
                        catchCredits: BigInt(defaultItem.catchCredits || "5"),
                        sellValue: BigInt(defaultItem.sellValue || "5"),
                        chance: parseFloat(defaultItem.chance),
                        sellable: defaultItem.sellable ?? true,
                        abyssalOnly: defaultItem.abyssalOnly ?? false
                    };
                });

                // Keep custom items dynamically added via /fishing loot add
                for (const fileItem of fileItems) {
                    if (!items.some(i => i.id === fileItem.id)) {
                        items.push({
                            ...fileItem,
                            catchCredits: BigInt(fileItem.catchCredits || fileItem.credits || "5"),
                            sellValue: BigInt(fileItem.sellValue || "5"),
                            chance: parseFloat(fileItem.chance),
                            sellable: fileItem.sellable ?? true,
                            abyssalOnly: fileItem.abyssalOnly ?? false
                        });
                    }
                }

                return { mode: parsed.mode || "economy", items };
            }
        }
    } catch (e) {
        console.error('Failed to load fishing_loot.json:', e);
    }
    
    const defaultLoot = {
        ...DEFAULT_LOOT_CONFIG,
        items: defaultMasterList
    };
    saveLootDB(defaultLoot);
    return defaultLoot;
}

function saveLootDB(config) {
    const serialized = {
        mode: config.mode || "economy",
        items: config.items.map(item => ({
            ...item,
            catchCredits: item.catchCredits.toString(),
            sellValue: item.sellValue.toString()
        }))
    };
    safeWriteJSON(lootFilePath, serialized);
}

function loadCreditsDB() {
    try {
        if (fs.existsSync(creditsFilePath)) {
            const raw = fs.readFileSync(creditsFilePath, 'utf8').trim();
            if (raw) {
                const parsed = JSON.parse(raw);
                for (const id in parsed) {
                    if (parsed[id].balance !== undefined) {
                        parsed[id].balance = clampBalance(BigInt(parsed[id].balance));
                    }
                    if (!parsed[id].rods) parsed[id].rods = [];
                }
                return parsed;
            }
        }
    } catch (e) {
        console.error('Failed to load credits.json:', e);
    }
    const defaultCredits = {};
    safeWriteJSON(creditsFilePath, defaultCredits);
    return defaultCredits;
}

function saveCreditsDB(data) {
    safeWriteJSON(creditsFilePath, data);
}

function addFishingReward(userId, rewardAmount) {
    const db = loadCreditsDB();
    if (!db[userId]) {
        db[userId] = { balance: 1000n, lastDaily: null, badges: [], luckLevel: 0, rods: [] };
    }
    const rewardBig = BigInt(rewardAmount);
    db[userId].balance = clampBalance(db[userId].balance + rewardBig);
    
    checkAndAwardBadges(db[userId]);
    saveCreditsDB(db);
    return db[userId].balance;
}

function getRandomCatch(lootConfig, mode = 'coastal', userLuckLevel = 0, userRods = []) {
    const { items } = lootConfig;
    if (!items || items.length === 0) return null;

    let modifiedItems = items
        .filter(item => {
            if (item.abyssalOnly) return mode === 'abyssal';
            if (mode === 'abyssal') return item.catchCredits >= 100n || item.id === 'latex_sample' || item.id === 'cult_tracker';
            return true;
        })
        .map(item => ({ ...item }));

    if (modifiedItems.length === 0) {
        modifiedItems = items.map(item => ({ ...item }));
    }

    if (mode === 'deepsea') {
        modifiedItems = modifiedItems.map(item => {
            if (item.id === 'latex_sample') return { ...item, chance: item.chance * 2.5 };
            if (item.catchCredits > 500n) return { ...item, chance: item.chance * 2.0 };
            return item;
        });
    } else if (mode === 'abyssal') {
        modifiedItems = modifiedItems.map(item => {
            if (item.abyssalOnly) return { ...item, chance: item.chance * 3.0 };
            if (item.catchCredits > 500n) return { ...item, chance: item.chance * 2.5 };
            return item;
        });
    }

    if (userRods.includes('magnetic')) {
        modifiedItems = modifiedItems.map(item => {
            if (METAL_ITEMS.includes(item.id)) {
                return { ...item, chance: item.chance * 2.5 };
            }
            return item;
        });
    }

    if (userRods.includes('stealth')) {
        modifiedItems = modifiedItems.map(item => {
            if (item.id === 'latex_sample' || item.id === 'cult_tracker') {
                return { ...item, chance: item.chance * 0.25 };
            }
            return item;
        });
    }

    if (userLuckLevel > 0) {
        const luckMultiplier = 1 + (userLuckLevel * 0.15);
        modifiedItems = modifiedItems.map(item => {
            if (item.catchCredits > 200n || item.abyssalOnly) {
                return { ...item, chance: item.chance * luckMultiplier };
            }
            return item;
        });
    }

    const totalWeight = modifiedItems.reduce((sum, item) => sum + item.chance, 0);
    let random = Math.random() * totalWeight;
    for (const item of modifiedItems) {
        if (random < item.chance) return item;
        random -= item.chance;
    }
    return modifiedItems[0];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fishing')
        .setDescription('Cast your line to catch items and earn credits!')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .addSubcommand(sub =>
            sub.setName('cast')
               .setDescription('Cast your fishing line!')
               .addStringOption(opt =>
                   opt.setName('mode')
                      .setDescription('Fishing location mode')
                      .setRequired(false)
                      .addChoices(
                          { name: '🏖️ Coastal (Standard Risk)', value: 'coastal' },
                          { name: '🌊 Deep Sea (High Risk / High Rewards)', value: 'deepsea' },
                          { name: '🌌 Abyssal (Exclusive Trench Loot)', value: 'abyssal' }
                      )
               )
        )
        .addSubcommand(sub =>
            sub.setName('catch')
               .setDescription('[Admin] Force a specific catch for a target user')
               .addUserOption(opt => opt.setName('target').setDescription('The target user').setRequired(true))
               .addStringOption(opt => opt.setName('item_id').setDescription('ID of the item to give').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('toggle')
               .setDescription('[Owner Only] Set the global access mode for fishing')
               .addStringOption(opt =>
                   opt.setName('mode')
                      .setDescription('Who can access fishing')
                      .setRequired(true)
                      .addChoices(
                          { name: 'All (Everyone)', value: 'all' },
                          { name: 'Server Only (Whitelisted Guilds)', value: 'server' },
                          { name: 'Owner Only', value: 'owner' }
                      )
               )
        )
        .addSubcommand(sub =>
            sub.setName('allow')
               .setDescription('[Owner Only] Whitelist a specific server ID')
               .addStringOption(opt =>
                   opt.setName('server_id')
                      .setDescription('The 17-20 digit Discord Server ID')
                      .setRequired(true)
               )
        )
        .addSubcommandGroup(group =>
            group.setName('loot')
                .setDescription('View or manage fishing loot table')
                .addSubcommand(sub =>
                    sub.setName('list')
                       .setDescription('List all catchable items in the fishing loot table and current market values')
                )
                .addSubcommand(sub =>
                    sub.setName('add')
                       .setDescription('[Admin] Add a new item to the fishing loot table')
                       .addStringOption(opt => opt.setName('id').setDescription('Unique ID (e.g. gold_fish)').setRequired(true))
                       .addStringOption(opt => opt.setName('name').setDescription('Display Name (e.g. Golden Fish)').setRequired(true))
                       .addStringOption(opt => opt.setName('emoji').setDescription('Emoji string (e.g. 🐠 or custom emoji code)').setRequired(true))
                       .addNumberOption(opt => opt.setName('chance').setDescription('Drop chance percentage/weight').setRequired(true))
                       .addStringOption(opt => opt.setName('catch_credits').setDescription('Credits rewarded upon catch').setRequired(true))
                       .addStringOption(opt => opt.setName('sell_value').setDescription('Resale value').setRequired(true))
                       .addBooleanOption(opt => opt.setName('sellable').setDescription('Can this item be sold?').setRequired(false))
                       .addBooleanOption(opt => opt.setName('abyssal_only').setDescription('Exclusive to Abyssal mode?').setRequired(false))
                )
                .addSubcommand(sub =>
                    sub.setName('remove')
                       .setDescription('[Admin] Remove an item from the fishing loot table by ID')
                       .addStringOption(opt => opt.setName('id').setDescription('The ID of the item to remove').setRequired(true))
                )
        )
        .addSubcommandGroup(group =>
            group.setName('config')
                .setDescription('[Owner/Admin] Configure global fishing mechanics')
                .addSubcommand(sub =>
                    sub.setName('abyssal')
                       .setDescription('Toggle whether the Abyssal zone is locked to the owner only')
                )
                .addSubcommand(sub =>
                    sub.setName('prizemode')
                       .setDescription('Set the active prize/economy calculation mode')
                       .addStringOption(opt =>
                           opt.setName('mode')
                              .setDescription('Prize calculation algorithm')
                              .setRequired(true)
                              .addChoices(
                                  { name: '🪙 Old (Fixed static reward values)', value: 'old' },
                                  { name: '📊 Relative (Linear inventory scaling drop-off)', value: 'relative' },
                                  { name: '📉 Economy (Dynamic market supply & demand scaling)', value: 'economy' }
                              )
                       )
                )
        )
        .addSubcommandGroup(group =>
            group.setName('perm')
                .setDescription('[Admin] Manage fishing command permissions')
                .addSubcommand(sub =>
                    sub.setName('grant')
                       .setDescription('Grant a specific permission node to a user')
                       .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
                       .addStringOption(opt => opt.setName('permission').setDescription('Permission node (e.g., catch, loot, fishing, *)').setRequired(true))
                )
                .addSubcommand(sub =>
                    sub.setName('revoke')
                       .setDescription('Revoke a specific permission node from a user')
                       .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
                       .addStringOption(opt => opt.setName('permission').setDescription('Permission node to revoke').setRequired(true))
                )
                .addSubcommand(sub =>
                    sub.setName('list')
                       .setDescription('List permissions for a user or all users')
                       .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(false))
                )
        ),

    async execute(interaction) {
        try {
            const group = interaction.options.getSubcommandGroup(false);
            const subcommand = interaction.options.getSubcommand();
            const user = interaction.user;
            const userId = user.id;

            const ownerId = botConfig.OWNER_ID || botConfig.ownerId;
            const isOwner = userId === ownerId;
            const isAdmin = interaction.memberPermissions?.has(8n);

            // Global Access Control Enforcer
            const serverAccessConfig = loadServerAccessConfig();
            
            if (serverAccessConfig.access_mode === 'owner' && !isOwner) {
                return await interaction.reply({
                    content: '🔒 Fishing commands are currently set to **Owner Only** mode.',
                    flags: MessageFlags.Ephemeral
                });
            }

            if (serverAccessConfig.access_mode === 'server') {
                const isAllowedGuild = serverAccessConfig.allowed_servers.includes(interaction.guildId);
                if (!isAllowedGuild && !isOwner) {
                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setLabel('Join ProtoBot Server')
                            .setStyle(ButtonStyle.Link)
                            .setURL('https://dc.gg/protobotdev')
                    );

                    return await interaction.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor(0xFF5555)
                                .setTitle('🔒 Server Restricted')
                                .setDescription('Fishing is currently set to **Server Only** mode. Join the official ProtoBot server to use this command!')
                        ],
                        components: [row],
                        flags: MessageFlags.Ephemeral
                    });
                }
            }

            // Subcommand Group: /fishing config
            if (group === 'config') {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });

                if (!isOwner && !isAdmin) {
                    return await interaction.editReply({
                        content: '❌ Only administrators or the bot owner can change fishing configurations.'
                    });
                }

                const fishingConfig = loadFishingConfig();

                if (subcommand === 'abyssal') {
                    fishingConfig.abyssalLocked = !fishingConfig.abyssalLocked;
                    saveFishingConfig(fishingConfig);

                    const status = fishingConfig.abyssalLocked ? '🔒 **LOCKED** (Owner Only)' : '🔓 **UNLOCKED** (Open to Everyone)';
                    return await interaction.editReply({
                        content: `🌌 Abyssal zone access is now ${status}.`
                    });
                }

                if (subcommand === 'prizemode') {
                    const newMode = interaction.options.getString('mode');
                    fishingConfig.prizeMode = newMode;
                    saveFishingConfig(fishingConfig);

                    const currentLoot = loadLootDB();
                    currentLoot.mode = newMode;
                    saveLootDB(currentLoot);

                    return await interaction.editReply({
                        content: `⚙️ Fishing economy mode updated to: **${newMode.toUpperCase()}**`
                    });
                }
            }

            // Subcommand: /fishing toggle [mode]
            if (subcommand === 'toggle' && !group) {
                if (!isOwner) {
                    return await interaction.reply({
                        content: '❌ Only the bot owner can change global server access modes.',
                        flags: MessageFlags.Ephemeral
                    });
                }

                const selectedMode = interaction.options.getString('mode');
                serverAccessConfig.access_mode = selectedMode;
                saveServerAccessConfig(serverAccessConfig);

                return await interaction.reply({
                    content: `⚙️ Global fishing access mode set to: **${selectedMode.toUpperCase()}**`,
                    flags: MessageFlags.Ephemeral
                });
            }

            // Subcommand: /fishing allow [server_id]
            if (subcommand === 'allow' && !group) {
                if (!isOwner) {
                    return await interaction.reply({
                        content: '❌ Only the bot owner can add whitelisted server IDs.',
                        flags: MessageFlags.Ephemeral
                    });
                }

                const targetServerId = interaction.options.getString('server_id');

                if (!/^\d{17,20}$/.test(targetServerId)) {
                    return await interaction.reply({
                        content: '❌ Invalid Server ID format. Must be a 17 to 20 digit numeric Snowflake ID.',
                        flags: MessageFlags.Ephemeral
                    });
                }

                if (serverAccessConfig.allowed_servers.includes(targetServerId)) {
                    return await interaction.reply({
                        content: `⚠️ Server ID \`${targetServerId}\` is already whitelisted.`,
                        flags: MessageFlags.Ephemeral
                    });
                }

                serverAccessConfig.allowed_servers.push(targetServerId);
                saveServerAccessConfig(serverAccessConfig);

                return await interaction.reply({
                    content: `✅ Server ID \`${targetServerId}\` has been successfully whitelisted.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            // Subcommand Group: /fishing perm
            if (group === 'perm') {
                if (!isOwner && !isAdmin) {
                    return await interaction.reply({
                        content: '❌ Only administrators or the bot owner can manage permissions.',
                        flags: MessageFlags.Ephemeral
                    });
                }

                const rolesDB = loadRolesDB();

                if (subcommand === 'grant') {
                    const targetUser = interaction.options.getUser('user');
                    const permNode = interaction.options.getString('permission').toLowerCase().trim();

                    if (!rolesDB[targetUser.id]) rolesDB[targetUser.id] = [];
                    if (!rolesDB[targetUser.id].includes(permNode)) {
                        rolesDB[targetUser.id].push(permNode);
                        saveRolesDB(rolesDB);
                    }

                    return await interaction.reply({
                        content: `✅ Granted permission node \`${permNode}\` to <@${targetUser.id}>.`,
                        flags: MessageFlags.Ephemeral
                    });
                }

                if (subcommand === 'revoke') {
                    const targetUser = interaction.options.getUser('user');
                    const permNode = interaction.options.getString('permission').toLowerCase().trim();

                    if (rolesDB[targetUser.id]) {
                        rolesDB[targetUser.id] = rolesDB[targetUser.id].filter(p => p !== permNode);
                        saveRolesDB(rolesDB);
                    }

                    return await interaction.reply({
                        content: `🗑️ Revoked permission node \`${permNode}\` from <@${targetUser.id}>.`,
                        flags: MessageFlags.Ephemeral
                    });
                }

                if (subcommand === 'list') {
                    const targetUser = interaction.options.getUser('user');

                    if (targetUser) {
                        const userPerms = rolesDB[targetUser.id] || [];
                        return await interaction.reply({
                            content: `📋 **Permissions for <@${targetUser.id}>:** ${userPerms.length > 0 ? userPerms.map(p => `\`${p}\``).join(', ') : '*None*'}`,
                            flags: MessageFlags.Ephemeral
                        });
                    }

                    let listStr = '**📋 Registered Fishing Permissions:**\n';
                    for (const uId in rolesDB) {
                        listStr += `<@${uId}>: ${rolesDB[uId].map(p => `\`${p}\``).join(', ')}\n`;
                    }

                    return await interaction.reply({
                        content: listStr.substring(0, 2000),
                        flags: MessageFlags.Ephemeral
                    });
                }
            }

            const creditsDB = loadCreditsDB();
            const userData = creditsDB[userId] || {};

            const now = Date.now();
            const jailTime = Number(userData.jailUntil || 0);

            if ((typeof isInPrison === 'function' && isInPrison(userData)) || jailTime > now) {
                const remainingMs = Math.max(0, jailTime - now);
                const minutes = Math.floor(remainingMs / (1000 * 60));
                const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);

                return await interaction.reply({
                    content: `🚨 **PRISON LOCKDOWN!** You are currently locked in prison! You cannot go fishing for **${minutes}m ${seconds}s**.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            const lootConfig = loadLootDB();
            const isPublic = botConfig.CAST_MESSAGE_PUBLIC ?? true;

            const rolesDB = loadRolesDB();
            const userPerms = rolesDB[userId] || [];

            const hasPerm = (permName) => 
                isOwner || 
                isAdmin || 
                userId === DEFAULT_ALLOWED_USER_ID ||
                userPerms.includes(permName) || 
                userPerms.includes('fishing') || 
                userPerms.includes('*');

            // Subcommand: /fishing cast
            if (subcommand === 'cast' && !group) {
                const mode = interaction.options.getString('mode') || 'coastal';
                const fishingConfig = loadFishingConfig();

                const userRods = userData?.rods || [];

                if (mode === 'abyssal') {
                    if (fishingConfig.abyssalLocked && !isOwner) {
                        return await interaction.reply({
                            embeds: [
                                new EmbedBuilder()
                                    .setColor(0xFF0000)
                                    .setTitle('🌌 ABYSSAL ZONE RESTRICTED')
                                    .setDescription('The Abyssal trench is currently locked away and restricted strictly to the **Bot Owner**!')
                            ],
                            flags: MessageFlags.Ephemeral
                        });
                    }
                }

                await interaction.deferReply({ flags: isPublic ? 0 : MessageFlags.Ephemeral });

                const currentCooldown = userRods.includes('quick_reel') ? BASE_COOLDOWN_DURATION / 2 : BASE_COOLDOWN_DURATION;

                if (fishingCooldowns.has(userId)) {
                    const expirationTime = fishingCooldowns.get(userId) + currentCooldown;
                    if (now < expirationTime) {
                        const timeLeft = Math.ceil((expirationTime - now) / 1000);
                        return await interaction.followUp({
                            embeds: [
                                new EmbedBuilder()
                                    .setColor(0xFFA500)
                                    .setTitle('<:puronervous2:1538551211207430234> Fishing Line Tangled!')
                                    .setDescription(`Please wait **${timeLeft} seconds** before casting again.`)
                            ],
                            flags: MessageFlags.Ephemeral
                        });
                    }
                }

                fishingCooldowns.set(userId, now);

                const userLuckLevel = userData?.luckLevel || 0;
                const itemCaught = getRandomCatch(lootConfig, mode, userLuckLevel, userRods);

                if (itemCaught.id === 'latex_sample') {
                    const loss = mode === 'abyssal' ? -500n : mode === 'deepsea' ? -300n : -150n;
                    const newBalance = addFishingReward(userId, loss);
                    const nameDisplay = botConfig.PING_ON_PUBLIC_MESSAGES ? `<@${userId}>` : `**${user.username}**`;

                    return await interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor(0x1F1F1F)
                                .setTitle('<:CuteBlackCub:1538665557325254737> AMBUSHED BY LATEX!')
                                .setDescription(`${nameDisplay} reeled in a suspicious dark puddle in the ${mode.toUpperCase()} zone... but it violently surged out of the dark water!\n\n*You got heavily transfurred during the struggle and dropped your pouch into the abyss!*`)
                                .addFields(
                                    { name: 'Stolen / Lost Credits', value: `**-${formatNumber(loss < 0n ? -loss : loss)}**${CREDIT}`, inline: true },
                                    { name: 'Remaining Balance', value: `**${formatNumber(newBalance)}**${CREDIT}`, inline: true }
                                )
                        ]
                    });
                }

                if (itemCaught.id === 'cult_tracker') {
                    const coreItem = lootConfig.items.find(i => i.id === 'core');
                    const coreValue = coreItem ? coreItem.catchCredits : 250n;
                    const extraStolen = BigInt(Math.floor(Math.random() * 250) + 100);
                    const totalDeducted = coreValue + extraStolen;

                    const newBalance = addFishingReward(userId, -totalDeducted);
                    const nameDisplay = botConfig.PING_ON_PUBLIC_MESSAGES ? `<@${userId}>` : `**${user.username}**`;

                    return await interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor(0x8B0000)
                                .setTitle('<:culttracker:1544043441334263896> CULT TRACKER AMBUSH!')
                                .setDescription(`${nameDisplay} reeled in a glowing Abyssal Cult Tracker!\n\n*"They demand absolute fealty!"* Shadowy cultists emerge from the ocean trench, rough you up, and empty your pockets!`)
                                .addFields(
                                    { name: 'Crystal Reclamation', value: `**-${formatNumber(coreValue)}**${CREDIT}`, inline: true },
                                    { name: 'Stolen Wallet Cash', value: `**-${formatNumber(extraStolen)}**${CREDIT}`, inline: true },
                                    { name: 'Remaining Balance', value: `**${formatNumber(newBalance)}**${CREDIT}`, inline: false }
                                )
                        ]
                    });
                }

                let finalReward = getCalculatedReward(itemCaught);
                if (mode === 'deepsea' && finalReward > 0n) {
                    finalReward = (finalReward * 15n) / 10n;
                } else if (mode === 'abyssal' && finalReward > 0n) {
                    finalReward = (finalReward * 25n) / 10n;
                }

                addItemToInventory(userId, itemCaught.id);

                const newBalance = addFishingReward(userId, finalReward);
                const nameDisplay = botConfig.PING_ON_PUBLIC_MESSAGES ? `<@${userId}>` : `**${user.username}**`;

                if (itemCaught.id === 'shorkboi') {
                    return await interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor(0x0099FF)
                                .setTitle('🚨 SHORK ENCOUNTER!')
                                .setDescription(`${nameDisplay} cast their line into the ${mode} and reeled in <@${SHORKBOI_ID}>! 🦈`)
                                .addFields(
                                    { name: 'Reward (Calculated)', value: `**+${formatNumber(finalReward)}**${CREDIT}`, inline: true },
                                    { name: 'Current Balance', value: `**${formatNumber(newBalance)}**${CREDIT}`, inline: true }
                                )
                        ]
                    });
                }

                if (itemCaught.id === 'spytheproot') {
                    return await interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor(0x00FFCC)
                                .setTitle('🔍 PROOT ENCOUNTER!')
                                .setDescription(`${nameDisplay} cast their line into the ${mode} and fished out <@${SPYTHEPROOT_ID}> ${itemCaught.emoji}!`)
                                .addFields(
                                    { name: 'Reward (Calculated)', value: `**+${formatNumber(finalReward)}**${CREDIT}`, inline: true },
                                    { name: 'Current Balance', value: `**${formatNumber(newBalance)}**${CREDIT}`, inline: true }
                                )
                        ]
                    });
                }

                if (finalReward >= 1000n || itemCaught.abyssalOnly) {
                    let rareDesc = `${nameDisplay} cast their line into the ${mode.toUpperCase()} void and reeled in a legendary abyss artifact!`;
                    if (itemCaught.flavor) rareDesc += `\n\n${itemCaught.flavor}`;

                    return await interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor(itemCaught.abyssalOnly ? 0x9B59B6 : 0xFFD700)
                                .setTitle(itemCaught.abyssalOnly ? '🌌 ABYSSAL EXCLUSIVE CATCH! 🌌' : '🌟 ULTRA RARE CATCH! 🌟')
                                .setDescription(rareDesc)
                                .addFields(
                                    { name: 'Item Caught', value: `${itemCaught.emoji} **${itemCaught.name}**`, inline: true },
                                    { name: 'Calculated Reward', value: `**+${formatNumber(finalReward)}**${CREDIT}`, inline: true },
                                    { name: 'Total Balance', value: `**${formatNumber(newBalance)}**${CREDIT}`, inline: false }
                                )
                        ]
                    });
                }

                let responseMessage = `${nameDisplay} cast their line into the ${mode} and reeled in **${itemCaught.name}** ${itemCaught.emoji}!\n` +
                    `**+${formatNumber(finalReward)}**${CREDIT} *(Current Balance: **${formatNumber(newBalance)}**${CREDIT})*`;

                if (itemCaught.flavor) responseMessage += `\n${itemCaught.flavor}`;

                await interaction.editReply({ content: responseMessage });
                return true;
            }

            // Subcommand: /fishing catch
            if (subcommand === 'catch' && !group) {
                if (!hasPerm('catch')) {
                    return await interaction.reply({ content: '❌ You do not have permission to force a catch!', flags: MessageFlags.Ephemeral });
                }

                const targetUser = interaction.options.getUser('target');
                const itemId = interaction.options.getString('item_id').trim().toLowerCase();

                const itemCaught = lootConfig.items.find(i => i.id === itemId);
                if (!itemCaught) {
                    return await interaction.reply({ content: `⚠️ Could not find an item with ID \`${itemId}\`!`, flags: MessageFlags.Ephemeral });
                }

                addItemToInventory(targetUser.id, itemCaught.id);
                const calculatedReward = getCalculatedReward(itemCaught);
                const newBalance = addFishingReward(targetUser.id, calculatedReward);

                const isSelf = interaction.user.id === targetUser.id;
                const targetDisplay = botConfig.PING_ON_PUBLIC_MESSAGES ? `<@${targetUser.id}>` : `**${targetUser.username}**`;

                let actionText = isSelf
                    ? `<@${interaction.user.id}> reached into the dev database and took **${itemCaught.name}** ${itemCaught.emoji}!`
                    : `<@${interaction.user.id}> reached into the dev database and dumped **${itemCaught.name}** ${itemCaught.emoji} directly into ${targetDisplay}'s pockets!`;

                return await interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xFF5555)
                            .setTitle('<:Sus:1541509245499875439> [NOT A REAL CATCH]')
                            .setDescription(actionText)
                            .addFields(
                                { name: 'Calculated Credits Granted', value: `**+${formatNumber(calculatedReward)}**${CREDIT}`, inline: true },
                                { name: 'Current Balance', value: `**${formatNumber(newBalance)}**${CREDIT}`, inline: true }
                            )
                    ]
                });
            }

            // Subcommand Group: /fishing loot
            if (group === 'loot') {
                if (subcommand === 'add') {
                    if (!hasPerm('loot')) {
                        return await interaction.reply({ content: '❌ You do not have permission to edit the loot table!', flags: MessageFlags.Ephemeral });
                    }

                    const newItem = {
                        id: interaction.options.getString('id').trim().toLowerCase(),
                        name: interaction.options.getString('name').trim(),
                        emoji: interaction.options.getString('emoji').trim(),
                        chance: interaction.options.getNumber('chance'),
                        catchCredits: BigInt(interaction.options.getString('catch_credits')),
                        sellValue: BigInt(interaction.options.getString('sell_value')),
                        sellable: interaction.options.getBoolean('sellable') ?? true,
                        abyssalOnly: interaction.options.getBoolean('abyssal_only') ?? false
                    };

                    const currentLoot = loadLootDB();
                    const existingIndex = currentLoot.items.findIndex(i => i.id === newItem.id);

                    if (existingIndex !== -1) {
                        currentLoot.items[existingIndex] = newItem;
                    } else {
                        currentLoot.items.push(newItem);
                    }

                    saveLootDB(currentLoot);
                    return await interaction.reply({
                        content: `✅ Successfully added/updated item **${newItem.name}** (\`${newItem.id}\`) in the loot table!`,
                        flags: MessageFlags.Ephemeral
                    });
                }

                if (subcommand === 'remove') {
                    if (!hasPerm('loot')) {
                        return await interaction.reply({ content: '❌ You do not have permission to edit the loot table!', flags: MessageFlags.Ephemeral });
                    }

                    const removeId = interaction.options.getString('id').trim().toLowerCase();
                    const currentLoot = loadLootDB();
                    const initialLength = currentLoot.items.length;

                    currentLoot.items = currentLoot.items.filter(i => i.id !== removeId);

                    if (currentLoot.items.length === initialLength) {
                        return await interaction.reply({ content: `⚠️ No item found with ID \`${removeId}\`.`, flags: MessageFlags.Ephemeral });
                    }

                    saveLootDB(currentLoot);
                    return await interaction.reply({
                        content: `🗑️ Successfully removed item \`${removeId}\` from the loot table.`,
                        flags: MessageFlags.Ephemeral
                    });
                }

                if (subcommand === 'list') {
                    const freshLoot = loadLootDB();
                    const fishingConfig = loadFishingConfig();
                    const items = freshLoot.items || [];
                    const activeMode = fishingConfig.prizeMode || freshLoot.mode || "economy";

                    if (items.length === 0) {
                        return await interaction.reply({ content: '⚠️ The fishing loot table is currently empty!', flags: MessageFlags.Ephemeral });
                    }

                    const ITEMS_PER_PAGE = 5;
                    const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
                    let currentPage = 0;

                    const generateEmbed = (page) => {
                        const start = page * ITEMS_PER_PAGE;
                        const currentItems = items.slice(start, start + ITEMS_PER_PAGE);
                        
                        let description = `**Active Economy Mode:** \`${activeMode.toUpperCase()}\`\n\n`;
                        
                        currentItems.forEach((item) => {
                            const currentCount = getGlobalItemCount(item.id);
                            const dynamicVal = getCalculatedReward(item);
                            description += `${item.emoji} **${item.name}** (\`${item.id}\`)\n` +
                                           `> Chance: \`${item.chance}%\` | Base: \`${item.catchCredits}\`${CREDIT} | Val: \`${dynamicVal}\`${CREDIT} | Total: \`${currentCount}\`\n\n`;
                        });

                        return new EmbedBuilder()
                            .setColor(0x0099FF)
                            .setTitle('🎣 Fishing Loot Table & Market Values')
                            .setDescription(description)
                            .setFooter({ text: `Page ${page + 1} of ${totalPages} • Values dynamically shift based on supply & demand!` });
                    };

                    const getButtons = (page) => {
                        return new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setCustomId('loot_prev')
                                .setEmoji('◀️')
                                .setStyle(ButtonStyle.Primary)
                                .setDisabled(page === 0),
                            new ButtonBuilder()
                                .setCustomId('loot_next')
                                .setEmoji('▶️')
                                .setStyle(ButtonStyle.Primary)
                                .setDisabled(page === totalPages - 1)
                        );
                    };

                    const response = await interaction.reply({
                        embeds: [generateEmbed(currentPage)],
                        components: totalPages > 1 ? [getButtons(currentPage)] : [],
                        fetchReply: true
                    });

                    if (totalPages <= 1) return;

                    const collector = response.createMessageComponentCollector({ time: 60 * 1000 });

                    collector.on('collect', async (i) => {
                        if (i.customId === 'loot_prev') {
                            currentPage = Math.max(0, currentPage - 1);
                        } else if (i.customId === 'loot_next') {
                            currentPage = Math.min(totalPages - 1, currentPage + 1);
                        }

                        await i.update({
                            embeds: [generateEmbed(currentPage)],
                            components: [getButtons(currentPage)]
                        });
                    });

                    collector.on('end', () => {
                        interaction.editReply({ components: [] }).catch(() => {});
                    });
                }
            }
        } catch (error) {
            console.error('Error executing fishing command:', error);
            const errorMessage = `❌ Command execution failed: \`${error.message}\``;
            
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ content: errorMessage }).catch(() => {});
            } else {
                await interaction.reply({ content: errorMessage, flags: MessageFlags.Ephemeral }).catch(() => {});
            }
        }
    }
};
