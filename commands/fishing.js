const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');
const botConfig = require('../config.js');

const { CREDIT, formatNumber, clampBalance, isInPrison } = require('./credits.js');
const { checkAndAwardBadges } = require('../badgeSystem.js');

const DEFAULT_ALLOWED_USER_ID = '1521264771389984940';

const fishingCooldowns = new Map();
const BASE_COOLDOWN_DURATION = 30 * 1000; // 30s base

const lootFilePath = path.resolve(process.cwd(), 'fishing_loot.json');
const creditsFilePath = path.resolve(process.cwd(), 'credits.json');
const inventoryFilePath = path.resolve(process.cwd(), 'inventory.json');
const rolesFilePath = path.resolve(process.cwd(), 'command_roles.json');
const configFilePath = path.resolve(process.cwd(), 'fishing_config.json');
const accessConfigFilePath = path.resolve(process.cwd(), 'fishing_access.json');

const METAL_ITEMS = ['pipe', 'soda_can', 'ram', 'copper_wire', 'battery', 'pc', 'iridium_cube'];

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
        { id: "cult_tracker", name: "a Cult Tracker", emoji: "<:dialring:1544043437978816512>", catchCredits: -250n, sellValue: 0n, chance: 0.1, sellable: false },
        { id: "pc", name: "an Entire Desktop Tower", emoji: "<:desktoppc:1544043466726711487>", catchCredits: 500n, sellValue: 100n, chance: 2.5, sellable: true },
        { id: "statue", name: "GOLDEN BLOXY STATUE", emoji: "<:BloxyStatue:1542833919651610695>", catchCredits: 1000n, sellValue: 150n, chance: 1.2, sellable: true },
        { id: "robloxinoli", name: "GOLDEN ROBLOXINOLI STATUE", emoji: "<:RobloxiNoliStatue:1542834047494131712>", catchCredits: 1750n, sellValue: 200n, chance: 1, sellable: true },
        { id: "iridium_cube", name: "a Solid Iridium Cube", emoji: "<:iridiumcube:1544043430886375425>", catchCredits: 3200n, sellValue: 1500n, chance: 0.8, sellable: true },
        { id: "tracer_ammo", name: "a Box of 7.62×39mm Red Tracer Rounds", emoji: "<:762x39ammo:1544043435235872948>", catchCredits: 4500n, sellValue: 2200n, chance: 0.5, sellable: true },
        { id: "uox_fuel", name: "a UOX Fuel Assembly", emoji: "<:uox:1544043433453289473>", catchCredits: 6000n, sellValue: 3000n, chance: 0.3, sellable: true, flavor: "*Surprisingly, it's still warm after sitting underwater for 30 years...*" },
        { id: "mox_fuel", name: "a MOX Fuel Assembly", emoji: "<:mox:1544043436599017652>", catchCredits: 7500n, sellValue: 4000n, chance: 0.2, sellable: true, flavor: "*Faintly glowing, and still noticeably warm after 30 years underwater...*" },
        { id: "ring", name: "Ancient Stargate Dialing Ring", emoji: "<:culttracker:1544043441334263898>", catchCredits: 2500n, sellValue: 250n, chance: 0.5, sellable: false },
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
                        ...defaultItem,
                        catchCredits: BigInt(defaultItem.catchCredits || "5"),
                        sellValue: BigInt(defaultItem.sellValue || "5"),
                        chance: parseFloat(defaultItem.chance),
                        sellable: defaultItem.sellable ?? true,
                        abyssalOnly: defaultItem.abyssalOnly ?? false
                    };
                });

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

            if (group === 'loot') {
                const lootDB = loadLootDB();

                if (subcommand === 'list') {
                    const embed = new EmbedBuilder()
                        .setColor(0x0099FF)
                        .setTitle('🎣 Fishing Loot Table & Market Values')
                        .setDescription(`Active Prize Mode: **${(lootDB.mode || 'economy').toUpperCase()}**\n\u200B`);

                    let listText = '';
                    for (const item of lootDB.items) {
                        const calculatedReward = getCalculatedReward(item);
                        listText += `${item.emoji} **${item.name}** (\`${item.id}\`)\n` +
                            `└ Chance: \`${item.chance}%\` | Reward: \`${formatNumber(calculatedReward)} C\` | Sell: \`${formatNumber(item.sellValue)} C\`\n`;
                    }

                    embed.setDescription(embed.data.description + listText.substring(0, 3900));

                    return await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                }

                if (subcommand === 'add') {
                    if (!isOwner && !isAdmin) {
                        return await interaction.reply({ content: '❌ Permission denied.', flags: MessageFlags.Ephemeral });
                    }

                    const newItem = {
                        id: interaction.options.getString('id').toLowerCase().trim(),
                        name: interaction.options.getString('name'),
                        emoji: interaction.options.getString('emoji'),
                        chance: interaction.options.getNumber('chance'),
                        catchCredits: BigInt(interaction.options.getString('catch_credits')),
                        sellValue: BigInt(interaction.options.getString('sell_value')),
                        sellable: interaction.options.getBoolean('sellable') ?? true,
                        abyssalOnly: interaction.options.getBoolean('abyssal_only') ?? false
                    };

                    lootDB.items = lootDB.items.filter(i => i.id !== newItem.id);
                    lootDB.items.push(newItem);
                    saveLootDB(lootDB);

                    return await interaction.reply({
                        content: `✅ Successfully added/updated item **${newItem.name}** (\`${newItem.id}\`) in the loot table!`,
                        flags: MessageFlags.Ephemeral
                    });
                }

                if (subcommand === 'remove') {
                    if (!isOwner && !isAdmin) {
                        return await interaction.reply({ content: '❌ Permission denied.', flags: MessageFlags.Ephemeral });
                    }

                    const targetId = interaction.options.getString('id').toLowerCase().trim();
                    const initialCount = lootDB.items.length;
                    lootDB.items = lootDB.items.filter(i => i.id !== targetId);

                    if (lootDB.items.length === initialCount) {
                        return await interaction.reply({ content: `⚠️ Item ID \`${targetId}\` not found.`, flags: MessageFlags.Ephemeral });
                    }

                    saveLootDB(lootDB);
                    return await interaction.reply({ content: `🗑️ Removed item \`${targetId}\` from loot table.`, flags: MessageFlags.Ephemeral });
                }
            }

            if (subcommand === 'catch' && !group) {
                const rolesDB = loadRolesDB();
                const userPerms = rolesDB[userId] || [];
                const hasCatchPerm = isOwner || isAdmin || userPerms.includes('catch') || userPerms.includes('*');

                if (!hasCatchPerm) {
                    return await interaction.reply({ content: '❌ You do not have permission to use the `/fishing catch` command.', flags: MessageFlags.Ephemeral });
                }

                const targetUser = interaction.options.getUser('target');
                const itemId = interaction.options.getString('item_id').toLowerCase().trim();
                const lootDB = loadLootDB();
                const item = lootDB.items.find(i => i.id === itemId);

                if (!item) {
                    return await interaction.reply({ content: `❌ Item ID \`${itemId}\` does not exist in the loot table.`, flags: MessageFlags.Ephemeral });
                }

                addItemToInventory(targetUser.id, item.id);
                const reward = getCalculatedReward(item);
                const newBalance = addFishingReward(targetUser.id, reward);

                return await interaction.reply({
                    content: `🎣 Forced catch: **${item.name}** ${item.emoji} given to <@${targetUser.id}>!\nEarned: **${formatNumber(reward)} Credits**. New balance: **${formatNumber(newBalance)} Credits**.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            if (subcommand === 'cast' && !group) {
                if (isInPrison && isInPrison(userId)) {
                    return await interaction.reply({ content: '🔒 You cannot go fishing while in prison!', flags: MessageFlags.Ephemeral });
                }

                const creditsDB = loadCreditsDB();
                const userData = creditsDB[userId] || { luckLevel: 0, rods: [] };

                let activeCooldownDuration = BASE_COOLDOWN_DURATION;
                if (userData.rods && userData.rods.includes('quick_reel')) {
                    activeCooldownDuration = 15 * 1000;
                }

                const now = Date.now();
                const userCooldown = fishingCooldowns.get(userId);
                if (userCooldown && now < userCooldown) {
                    const remaining = Math.ceil((userCooldown - now) / 1000);
                    return await interaction.reply({ content: `⏳ You need to wait **${remaining}s** before fishing again.`, flags: MessageFlags.Ephemeral });
                }

                const mode = interaction.options.getString('mode') || 'coastal';
                const fishingConfig = loadFishingConfig();

                if (mode === 'abyssal' && fishingConfig.abyssalLocked && !isOwner) {
                    return await interaction.reply({ content: '🔒 The Abyssal Trench is currently locked by the administrator.', flags: MessageFlags.Ephemeral });
                }

                const lootConfig = loadLootDB();
                const item = getRandomCatch(lootConfig, mode, userData.luckLevel, userData.rods);

                if (!item) {
                    return await interaction.reply({ content: '🌊 You cast your line, but nothing bit today.', flags: MessageFlags.Ephemeral });
                }

                fishingCooldowns.set(userId, now + activeCooldownDuration);
                addItemToInventory(userId, item.id);

                const reward = getCalculatedReward(item);
                const newBalance = addFishingReward(userId, reward);

                const embed = new EmbedBuilder()
                    .setColor(reward >= 0n ? 0x00FF00 : 0xFF0000)
                    .setTitle('🎣 Fishing Results')
                    .setDescription(`You cast your line into the **${mode.toUpperCase()}** waters...\n\nYou caught **${item.name}** ${item.emoji}!`)
                    .addFields(
                        { name: 'Reward', value: `${formatNumber(reward)} Credits`, inline: true },
                        { name: 'New Balance', value: `${formatNumber(newBalance)} Credits`, inline: true }
                    );

                if (item.flavor) embed.setFooter({ text: item.flavor });

                return await interaction.reply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Error executing fishing command:', error);
            const response = { content: '❌ An error occurred while executing this command.', flags: MessageFlags.Ephemeral };
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply(response).catch(() => {});
            } else {
                await interaction.reply(response).catch(() => {});
            }
        }
    }
};

