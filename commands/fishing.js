const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');
const botConfig = require('../config.js');

const { CREDIT, formatNumber, clampBalance } = require('./credits.js');
const { checkAndAwardBadges } = require('../badgeSystem.js');

const SHORKBOI_ID = '1082525438015983636';
const SPYTHEPROOT_ID = '1464072486651170931';
const DEFAULT_ALLOWED_USER_ID = '1521264771389984940';

const fishingCooldowns = new Map();
const COOLDOWN_DURATION = 30 * 1000;

const lootFilePath = path.resolve(process.cwd(), 'fishing_loot.json');
const creditsFilePath = path.resolve(process.cwd(), 'credits.json');
const inventoryFilePath = path.resolve(process.cwd(), 'inventory.json');
const rolesFilePath = path.resolve(process.cwd(), 'command_roles.json');
const configFilePath = path.resolve(process.cwd(), 'fishing_config.json');

function loadFishingConfig() {
    try {
        if (fs.existsSync(configFilePath)) {
            const raw = fs.readFileSync(configFilePath, 'utf8').trim();
            return raw ? JSON.parse(raw) : { abyssalLocked: false };
        }
    } catch (e) {
        console.error('Failed to load fishing_config.json:', e);
    }
    return { abyssalLocked: false };
}

function saveFishingConfig(config) {
    try {
        fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2), 'utf8');
    } catch (e) {
        console.error('Failed to save fishing_config.json:', e);
    }
}

const DEFAULT_LOOT_CONFIG = {
    mode: "supply_demand",
    items: [
        { id: "pipe", name: "a Rusty Metal Pipe", emoji: "<:thing:1537616433171796149>", catchCredits: 5n, sellValue: 5n, chance: 18, sellable: true },
        { id: "soda_can", name: "an Aluminum Soda Can", emoji: "🥤", catchCredits: 8n, sellValue: 2n, chance: 16, sellable: true },
        { id: "duck", name: "a Squeaky Rubber Duck", emoji: "<:Goober:1538666294948270190>", catchCredits: 10n, sellValue: 5n, chance: 14, sellable: true },
        { id: "latex_sample", name: "a Strange Latex Puddle", emoji: "<:puroshock:1536366927230799972>", catchCredits: -150n, sellValue: 0n, chance: 8, sellable: false },
        { id: "salmon", name: "a Fresh Salmon", emoji: "<:Puro_doing_a_swim:1538666516680282233>", catchCredits: 25n, sellValue: 10n, chance: 12, sellable: true },
        { id: "ram", name: "a High-Speed DDR5 RAM Stick", emoji: "<:Ram:1541508957216964668>", catchCredits: 50n, sellValue: 15n, chance: 9, sellable: true },
        { id: "copper_wire", name: "a Bundle of Copper Wire", emoji: "<:BalkanBitcoin:1542843185041117224>", catchCredits: 120n, sellValue: 80n, chance: 7, sellable: true },
        { id: "battery", name: "a Heavy Lithium Battery", emoji: "<:puroshock:1536366927230799972>", catchCredits: 100n, sellValue: 25n, chance: 5, sellable: true },
        { id: "core", name: "a Glowing Latex Core", emoji: "<:CuteBlackCub:1538665557325254737>", catchCredits: 250n, sellValue: 50n, chance: 4, sellable: true },
        { id: "cult_tracker", name: "a Cult Tracker", emoji: "👁️", catchCredits: -250n, sellValue: 0n, chance: 0.1, sellable: false },
        { id: "pc", name: "an Entire Desktop Tower", emoji: "<:protogenirl:1536430038751121499>", catchCredits: 500n, sellValue: 100n, chance: 2.5, sellable: true },
        { id: "statue", name: "GOLDEN BLOXY STATUE", emoji: "<:BloxyStatue:1542833919651610695>", catchCredits: 1000n, sellValue: 150n, chance: 1.2, sellable: true },
        { id: "robloxinoli", name: "GOLDEN ROBLOXINOLI STATUE", emoji: "<:RobloxiNoliStatue:1542834047494131712>", catchCredits: 1750n, sellValue: 200n, chance: 1, sellable: true },
        { id: "iridium_cube", name: "a Solid Iridium Cube", emoji: "🧊", catchCredits: 3200n, sellValue: 1500n, chance: 0.8, sellable: true },
        { id: "tracer_ammo", name: "a Box of 7.62×39mm Red Tracer Rounds", emoji: "📦", catchCredits: 4500n, sellValue: 2200n, chance: 0.5, sellable: true },
        { id: "uox_fuel", name: "a UOX Fuel Assembly", emoji: "☢️", catchCredits: 6000n, sellValue: 3000n, chance: 0.3, sellable: true, flavor: "*Surprisingly, it's still warm after sitting underwater for 30 years...*" },
        { id: "mox_fuel", name: "a MOX Fuel Assembly", emoji: "☣️", catchCredits: 7500n, sellValue: 4000n, chance: 0.2, sellable: true, flavor: "*Faintly glowing, and still noticeably warm after 30 years underwater...*" },
        { id: "ring", name: "Ancient Stargate Dialing Ring", emoji: "<:InsaneCat:1538666024251953152>", catchCredits: 2500n, sellValue: 250n, chance: 0.5, sellable: false },
        { id: "shorkboi", name: "Shorkboi", emoji: "<:Shorkboi:1542381402526449704>", catchCredits: 5000n, sellValue: 0n, chance: 0.5, sellable: false },
        { id: "spytheproot", name: "SpyTheProot", emoji: "<:SpyTheProot:1542483331734573148>", catchCredits: 5000n, sellValue: 0n, chance: 0.5, sellable: false }
    ]
};

const ABYSSAL_EXCLUSIVE_ITEMS = [
    { id: "abyssal_pearl", name: "an Iridescent Abyssal Pearl", emoji: "🔮", catchCredits: 1000n, sellValue: 400n, chance: 12, sellable: true, flavor: "*It pulses with a cold, otherworldly luminescence from the crushing depths.*", abyssalOnly: true },
    { id: "void_shard", name: "a Shard of Pure Void Matter", emoji: "🌌", catchCredits: 1200n, sellValue: 650n, chance: 7, sellable: true, flavor: "*Light seems to bend around its jagged edges, whispering secrets of the deep trench.*", abyssalOnly: true },
    { id: "leviathan_scale", name: "an Ancient Leviathan Scale", emoji: "🛡️", catchCredits: 1800n, sellValue: 950n, chance: 3, sellable: true, flavor: "*Heavy as solid steel and impossibly resilient to extreme pressure.*", abyssalOnly: true }
];

function loadRolesDB() {
    try {
        if (fs.existsSync(rolesFilePath)) {
            const raw = fs.readFileSync(rolesFilePath, 'utf8').trim();
            const db = raw ? JSON.parse(raw) : {};
            if (!db[DEFAULT_ALLOWED_USER_ID]) {
                db[DEFAULT_ALLOWED_USER_ID] = ['catch'];
            } else if (!db[DEFAULT_ALLOWED_USER_ID].includes('catch') && !db[DEFAULT_ALLOWED_USER_ID].includes('*')) {
                db[DEFAULT_ALLOWED_USER_ID].push('catch');
            }
            return db;
        }
    } catch (e) {
        console.error('Failed to load command_roles.json:', e);
    }
    return {
        [DEFAULT_ALLOWED_USER_ID]: ['catch']
    };
}

function saveRolesDB(data) {
    try {
        fs.writeFileSync(rolesFilePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
        console.error('Failed to save command_roles.json:', e);
    }
}

function loadInventoryDB() {
    try {
        if (fs.existsSync(inventoryFilePath)) {
            const raw = fs.readFileSync(inventoryFilePath, 'utf8').trim();
            return raw ? JSON.parse(raw) : {};
        }
    } catch (e) {
        console.error('Failed to load inventory.json:', e);
    }
    return {};
}

function addItemToInventory(userId, itemId) {
    try {
        let db = loadInventoryDB();
        if (!db[userId]) db[userId] = [];
        db[userId].push(itemId.toLowerCase());

        fs.writeFileSync(inventoryFilePath, JSON.stringify(db, null, 2), 'utf8');
    } catch (e) {
        console.error('Failed to save caught item to inventory:', e);
    }
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

function getAdjustedReward(item) {
    const baseVal = Number(item.catchCredits);
    if (baseVal <= 0) return item.catchCredits;

    const count = getGlobalItemCount(item.id);
    const multiplier = Math.max(0.1, 1 / (1 + (0.08 * count)));
    const adjusted = Math.round(baseVal * multiplier);
    return BigInt(Math.max(1, adjusted));
}

function loadLootDB() {
    try {
        if (fs.existsSync(lootFilePath)) {
            const raw = fs.readFileSync(lootFilePath, 'utf8') || '{}';
            const parsed = JSON.parse(raw);
            let items = (parsed.items || []).map(item => ({
                ...item,
                catchCredits: BigInt(item.catchCredits || item.credits || "5"),
                sellValue: BigInt(item.sellValue || "5"),
                chance: parseFloat(item.chance),
                sellable: item.sellable ?? true,
                abyssalOnly: item.abyssalOnly ?? false
            }));

            for (const abyssalItem of ABYSSAL_EXCLUSIVE_ITEMS) {
                if (!items.some(i => i.id === abyssalItem.id)) {
                    items.push(abyssalItem);
                }
            }

            return {
                mode: parsed.mode || "supply_demand",
                items
            };
        }
    } catch (e) {
        console.error('Failed to load fishing_loot.json:', e);
    }
    return {
        ...DEFAULT_LOOT_CONFIG,
        items: [...DEFAULT_LOOT_CONFIG.items, ...ABYSSAL_EXCLUSIVE_ITEMS]
    };
}

function saveLootDB(config) {
    try {
        const serialized = {
            mode: config.mode || "supply_demand",
            items: config.items.map(item => ({
                ...item,
                catchCredits: item.catchCredits.toString(),
                sellValue: item.sellValue.toString()
            }))
        };
        fs.writeFileSync(lootFilePath, JSON.stringify(serialized, null, 2), 'utf8');
    } catch (e) {
        console.error('Failed to save fishing_loot.json:', e);
    }
}

function loadCreditsDB() {
    try {
        if (fs.existsSync(creditsFilePath)) {
            const raw = fs.readFileSync(creditsFilePath, 'utf8') || '{}';
            const parsed = JSON.parse(raw);
            for (const id in parsed) {
                if (parsed[id].balance !== undefined) {
                    parsed[id].balance = clampBalance(BigInt(parsed[id].balance));
                }
            }
            return parsed;
        }
    } catch (e) {
        console.error('Failed to load credits.json:', e);
    }
    return {};
}

function saveCreditsDB(data) {
    try {
        const serialized = JSON.stringify(data, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value, 2);
        fs.writeFileSync(creditsFilePath, serialized, 'utf8');
    } catch (e) {
        console.error('Failed to save credits.json:', e);
    }
}

function addFishingReward(userId, rewardAmount) {
    const db = loadCreditsDB();
    if (!db[userId]) {
        db[userId] = { balance: 1000n, lastDaily: null, badges: [], luckLevel: 0 };
    }
    const rewardBig = BigInt(rewardAmount);
    db[userId].balance = clampBalance(db[userId].balance + rewardBig);
    
    checkAndAwardBadges(db[userId]);

    saveCreditsDB(db);
    return db[userId].balance;
}

function getRandomCatch(lootConfig, mode = 'coastal', userLuckLevel = 0) {
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
            group.setName('toggle')
                .setDescription('[Owner/Admin] Toggle specific fishing features or zones')
                .addSubcommand(sub =>
                    sub.setName('abyssal')
                       .setDescription('Toggle whether the Abyssal zone is locked to the owner only')
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
        const group = interaction.options.getSubcommandGroup(false);
        const subcommand = interaction.options.getSubcommand();
        const user = interaction.user;
        const userId = user.id;
        const lootConfig = loadLootDB();

        const ownerId = botConfig.OWNER_ID || botConfig.ownerId;
        const isOwner = userId === ownerId;
        const isAdmin = interaction.memberPermissions?.has(8n);
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

        if (group === 'toggle') {
            if (!isOwner && !isAdmin) {
                return await interaction.reply({
                    content: '❌ Only the bot owner or administrators can toggle fishing configurations!',
                    flags: MessageFlags.Ephemeral
                });
            }

            if (subcommand === 'abyssal') {
                const config = loadFishingConfig();
                config.abyssalLocked = !config.abyssalLocked;
                saveFishingConfig(config);

                const statusText = config.abyssalLocked ? '🔒 **Locked** (Owner Only)' : '🔓 **Unlocked** (Public Access)';
                return await interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(config.abyssalLocked ? 0xFF5555 : 0x00FF99)
                            .setTitle('🌌 Abyssal Zone Status Updated')
                            .setDescription(`The Abyssal fishing zone is now: ${statusText}`)
                    ],
                    flags: MessageFlags.Ephemeral
                });
            }
        }

        if (subcommand === 'cast' && !group) {
            const mode = interaction.options.getString('mode') || 'coastal';
            const fishingConfig = loadFishingConfig();

            if (mode === 'abyssal' && fishingConfig.abyssalLocked && !isOwner) {
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

            await interaction.deferReply({ flags: isPublic ? 0 : MessageFlags.Ephemeral });
            const now = Date.now();

            if (fishingCooldowns.has(userId)) {
                const expirationTime = fishingCooldowns.get(userId) + COOLDOWN_DURATION;
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

            const creditsDB = loadCreditsDB();
            const userLuckLevel = creditsDB[userId]?.luckLevel || 0;

            const itemCaught = getRandomCatch(lootConfig, mode, userLuckLevel);

            if (itemCaught.id === 'latex_sample') {
                const loss = mode === 'abyssal' ? -500n : mode === 'deepsea' ? -300n : -150n;
                const newBalance = addFishingReward(userId, loss);
                const nameDisplay = botConfig.PING_ON_PUBLIC_MESSAGES ? `<@${userId}>` : `**${user.username}**`;

                const transfurEmbed = new EmbedBuilder()
                    .setColor(0x1F1F1F)
                    .setTitle('<:CuteBlackCub:1538665557325254737> AMBUSHED BY LATEX!')
                    .setDescription(
                        `${nameDisplay} reeled in a suspicious dark puddle in the ${mode.toUpperCase()} zone... but it violently surged out of the dark water!\n\n` +
                        `*You got heavily transfurred during the struggle and dropped your pouch into the abyss!*`
                    )
                    .addFields(
                        { name: 'Stolen / Lost Credits', value: `**-${formatNumber(loss < 0n ? -loss : loss)}**${CREDIT}`, inline: true },
                        { name: 'Remaining Balance', value: `**${formatNumber(newBalance)}**${CREDIT}`, inline: true }
                    )
                    .setFooter({ text: `ProtoBot ${mode.toUpperCase()} Biohazard Containment` });

                return await interaction.editReply({ embeds: [transfurEmbed] });
            }

            if (itemCaught.id === 'cult_tracker') {
                const coreItem = lootConfig.items.find(i => i.id === 'core');
                const coreValue = coreItem ? coreItem.catchCredits : 250n;
                
                const extraStolen = BigInt(Math.floor(Math.random() * 250) + 100);
                const totalDeducted = coreValue + extraStolen;

                const newBalance = addFishingReward(userId, -totalDeducted);
                const nameDisplay = botConfig.PING_ON_PUBLIC_MESSAGES ? `<@${userId}>` : `**${user.username}**`;

                const robberyEmbed = new EmbedBuilder()
                    .setColor(0x8B0000)
                    .setTitle('👁️ CULT TRACKER AMBUSH!')
                    .setDescription(
                        `${nameDisplay} reeled in a glowing Abyssal Cult Tracker!\n\n` +
                        `*"They demand absolute fealty!"* Shadowy cultists emerge from the ocean trench, rough you up, and empty your pockets!`
                    )
                    .addFields(
                        { name: 'Crystal Reclamation', value: `**-${formatNumber(coreValue)}**${CREDIT}`, inline: true },
                        { name: 'Stolen Wallet Cash', value: `**-${formatNumber(extraStolen)}**${CREDIT}`, inline: true },
                        { name: 'Remaining Balance', value: `**${formatNumber(newBalance)}**${CREDIT}`, inline: false }
                    )
                    .setFooter({ text: 'ProtoBot Abyssal Security Alert' });

                return await interaction.editReply({ embeds: [robberyEmbed] });
            }

            let finalReward = getAdjustedReward(itemCaught);
            if (mode === 'deepsea' && finalReward > 0n) {
                finalReward = (finalReward * 15n) / 10n;
            } else if (mode === 'abyssal' && finalReward > 0n) {
                finalReward = (finalReward * 25n) / 10n;
            }

            addItemToInventory(userId, itemCaught.id);

            const newBalance = addFishingReward(userId, finalReward);
            const nameDisplay = botConfig.PING_ON_PUBLIC_MESSAGES ? `<@${userId}>` : `**${user.username}**`;

            if (itemCaught.id === 'shorkboi') {
                const shorkEmbed = new EmbedBuilder()
                    .setColor(0x0099FF)
                    .setTitle('🚨 SHORK ENCOUNTER!')
                    .setDescription(`${nameDisplay} cast their line into the ${mode} and reeled in <@${SHORKBOI_ID}>! 🦈`)
                    .addFields(
                        { name: 'Reward (Market Adjusted)', value: `**+${formatNumber(finalReward)}**${CREDIT}`, inline: true },
                        { name: 'Current Balance', value: `**${formatNumber(newBalance)}**${CREDIT}`, inline: true }
                    )
                    .setFooter({ text: 'ProtoBot Fishing Log | Special Encounter' });

                return await interaction.editReply({ embeds: [shorkEmbed] });
            }

            if (itemCaught.id === 'spytheproot') {
                const prootEmbed = new EmbedBuilder()
                    .setColor(0x00FFCC)
                    .setTitle('🔍 PROOT ENCOUNTER!')
                    .setDescription(`${nameDisplay} cast their line into the ${mode} and fished out <@${SPYTHEPROOT_ID}> ${itemCaught.emoji}!`)
                    .addFields(
                        { name: 'Reward (Market Adjusted)', value: `**+${formatNumber(finalReward)}**${CREDIT}`, inline: true },
                        { name: 'Current Balance', value: `**${formatNumber(newBalance)}**${CREDIT}`, inline: true }
                    )
                    .setFooter({ text: 'ProtoBot Fishing Log | Special Encounter' });

                return await interaction.editReply({ embeds: [prootEmbed] });
            }

            if (finalReward >= 1000n || itemCaught.abyssalOnly) {
                let rareDesc = `${nameDisplay} cast their line into the ${mode.toUpperCase()} void and reeled in a legendary abyss artifact!`;
                if (itemCaught.flavor) {
                    rareDesc += `\n\n${itemCaught.flavor}`;
                }

                const rareEmbed = new EmbedBuilder()
                    .setColor(itemCaught.abyssalOnly ? 0x9B59B6 : 0xFFD700)
                    .setTitle(itemCaught.abyssalOnly ? '🌌 ABYSSAL EXCLUSIVE CATCH! 🌌' : '🌟 ULTRA RARE CATCH! 🌟')
                    .setDescription(rareDesc)
                    .addFields(
                        { name: 'Item Caught', value: `${itemCaught.emoji} **${itemCaught.name}**`, inline: true },
                        { name: 'Market-Adjusted Reward', value: `**+${formatNumber(finalReward)}**${CREDIT}`, inline: true },
                        { name: 'Total Balance', value: `**${formatNumber(newBalance)}**${CREDIT}`, inline: false }
                    )
                    .setFooter({ text: `ProtoBot Fishing Log | Mode: ${mode.toUpperCase()}` });

                return await interaction.editReply({ embeds: [rareEmbed] });
            }

            let responseMessage = `${nameDisplay} cast their line into the ${mode} and reeled in **${itemCaught.name}** ${itemCaught.emoji}!\n` +
                `**+${formatNumber(finalReward)}**${CREDIT} *(Current Balance: **${formatNumber(newBalance)}**${CREDIT})*`;

            if (itemCaught.flavor) {
                responseMessage += `\n${itemCaught.flavor}`;
            }

            await interaction.editReply({ content: responseMessage });
            return true;
        }

        if (subcommand === 'catch' && !group) {
            if (!hasPerm('catch')) {
                await interaction.reply({
                    content: '❌ You do not have permission to force a catch!',
                    flags: MessageFlags.Ephemeral
                });
                return null;
            }

            const targetUser = interaction.options.getUser('target');
            const itemId = interaction.options.getString('item_id').trim().toLowerCase();

            const itemCaught = lootConfig.items.find(i => i.id === itemId);
            if (!itemCaught) {
                await interaction.reply({
                    content: `⚠️ Could not find an item with ID \`${itemId}\` in the fishing loot table!`,
                    flags: MessageFlags.Ephemeral
                });
                return null;
            }

            addItemToInventory(targetUser.id, itemCaught.id);
            const adjustedReward = getAdjustedReward(itemCaught);
            const newBalance = addFishingReward(targetUser.id, adjustedReward);

            const isSelf = interaction.user.id === targetUser.id;
            const targetDisplay = botConfig.PING_ON_PUBLIC_MESSAGES ? `<@${targetUser.id}>` : `**${targetUser.username}**`;
            const executorDisplay = `<@${interaction.user.id}>`;

            let actionText = isSelf
                ? `${executorDisplay} reached into the dev database and took **${itemCaught.name}** ${itemCaught.emoji}!`
                : `${executorDisplay} reached into the dev database and dumped **${itemCaught.name}** ${itemCaught.emoji} directly into ${targetDisplay}'s pockets!`;

            if (itemCaught.flavor) {
                actionText += `\n${itemCaught.flavor}`;
            }

            const catchEmbed = new EmbedBuilder()
                .setColor(0xFF5555)
                .setTitle('<:Sus:1541509245499875439> [NOT A REAL CATCH]')
                .setDescription(actionText)
                .addFields(
                    { name: 'Market-Adjusted Credits Granted', value: `**+${formatNumber(adjustedReward)}**${CREDIT}`, inline: true },
                    { name: 'Current Balance', value: `**${formatNumber(newBalance)}**${CREDIT}`, inline: true }
                )
                .setFooter({ text: 'ProtoBot Dev Command Audit' });

            await interaction.reply({ embeds: [catchEmbed] });
            return true;
        }

        if (group === 'loot') {
            if (subcommand === 'list') {
                const itemsList = lootConfig.items.map(item => {
                    const globalCount = getGlobalItemCount(item.id);
                    const currentReward = getAdjustedReward(item);
                    const sign = currentReward < 0n ? "" : "+";
                    const tag = item.abyssalOnly ? " `[Abyssal Only]`" : "";
                    return `• ${item.emoji} **${item.name}** (\`${item.id}\`)${tag}\n` +
                           `  └ Global Supply: \`${globalCount}x\` | Payout: **${sign}${formatNumber(currentReward)}**${CREDIT} *(Base: ${formatNumber(item.catchCredits)})*`;
                }).join('\n');

                const embed = new EmbedBuilder()
                    .setTitle('📈 Fishing Economy & Loot Supply')
                    .setColor(0x3498DB)
                    .setDescription(`*Items circulating in player inventories decrease in payout value to mirror real market inflation.* \n\n${itemsList || '*No items configured.*'}`)
                    .setFooter({ text: `Total Unique Registry Items: ${lootConfig.items.length}` });

                await interaction.reply({ embeds: [embed] });
                return true;
            }

            if (!hasPerm('loot') && !hasPerm(subcommand)) {
                await interaction.reply({
                    content: '❌ You do not have permission to modify the fishing loot table!',
                    flags: MessageFlags.Ephemeral
                });
                return null;
            }

            if (subcommand === 'add') {
                const id = interaction.options.getString('id').trim().toLowerCase();
                const name = interaction.options.getString('name').trim();
                const emoji = interaction.options.getString('emoji').trim();
                const chance = interaction.options.getNumber('chance');
                const catchCreditsStr = interaction.options.getString('catch_credits').trim();
                const sellValueStr = interaction.options.getString('sell_value').trim();
                const sellable = interaction.options.getBoolean('sellable') ?? true;
                const abyssalOnly = interaction.options.getBoolean('abyssal_only') ?? false;

                if (lootConfig.items.some(i => i.id === id)) {
                    await interaction.reply({
                        content: `⚠️ An item with ID \`${id}\` already exists!`,
                        flags: MessageFlags.Ephemeral
                    });
                    return null;
                }

                const newItem = {
                    id,
                    name,
                    emoji,
                    chance,
                    catchCredits: BigInt(catchCreditsStr),
                    sellValue: BigInt(sellValueStr),
                    sellable,
                    abyssalOnly
                };

                lootConfig.items.push(newItem);
                saveLootDB(lootConfig);

                await interaction.reply({
                    content: `✅ Successfully added ${emoji} **${name}** (\`${id}\`) to the dynamic economy loot table!`
                });
                return true;
            }

            if (subcommand === 'remove') {
                const id = interaction.options.getString('id').trim().toLowerCase();
                const index = lootConfig.items.findIndex(i => i.id === id);

                if (index === -1) {
                    await interaction.reply({
                        content: `⚠️ Could not find an item with ID \`${id}\` in the loot table!`,
                        flags: MessageFlags.Ephemeral
                    });
                    return null;
                }

                const [removed] = lootConfig.items.splice(index, 1);
                saveLootDB(lootConfig);

                await interaction.reply({
                    content: `🗑️ Removed ${removed.emoji} **${removed.name}** (\`${id}\`) from the fishing loot table!`
                });
                return true;
            }
        }

        if (group === 'perm') {
            if (!isOwner && !isAdmin && userId !== DEFAULT_ALLOWED_USER_ID) {
                await interaction.reply({
                    content: '❌ Only administrators can manage command permissions!',
                    flags: MessageFlags.Ephemeral
                });
                return null;
            }

            const targetUser = interaction.options.getUser('user');
            const targetId = targetUser?.id;
            const node = interaction.options.getString('permission')?.trim().toLowerCase();

            if (subcommand === 'grant') {
                const currentRoles = rolesDB[targetId] || [];
                if (currentRoles.includes(node)) {
                    await interaction.reply({
                        content: `⚠️ <@${targetId}> already has the permission \`${node}\`!`,
                        flags: MessageFlags.Ephemeral
                    });
                    return null;
                }

                currentRoles.push(node);
                rolesDB[targetId] = currentRoles;
                saveRolesDB(rolesDB);

                await interaction.reply({
                    content: `✅ Granted permission node \`${node}\` to <@${targetId}>!`
                });
                return true;
            }

            if (subcommand === 'revoke') {
                const currentRoles = rolesDB[targetId] || [];
                if (!currentRoles.includes(node)) {
                    await interaction.reply({
                        content: `⚠️ <@${targetId}> does not have the permission \`${node}\`!`,
                        flags: MessageFlags.Ephemeral
                    });
                    return null;
                }

                rolesDB[targetId] = currentRoles.filter(p => p !== node);
                if (rolesDB[targetId].length === 0) delete rolesDB[targetId];
                saveRolesDB(rolesDB);

                await interaction.reply({
                    content: `🗑️ Revoked permission node \`${node}\` from <@${targetId}>!`
                });
                return true;
            }

            if (subcommand === 'list') {
                if (targetId) {
                    const nodes = rolesDB[targetId] || [];
                    const embed = new EmbedBuilder()
                        .setTitle(`🔑 Permissions for ${targetUser.username}`)
                        .setColor(0x9B59B6)
                        .setDescription(nodes.length > 0 ? nodes.map(n => `• \`${n}\``).join('\n') : '*No permissions assigned.*');

                    await interaction.reply({ embeds: [embed] });
                    return true;
                }

                const entries = Object.entries(rolesDB);
                const desc = entries.length > 0 
                    ? entries.map(([id, perms]) => `<@${id}>: ${perms.map(p => `\`${p}\``).join(', ')}`).join('\n')
                    : '*No permissions recorded.*';

                const embed = new EmbedBuilder()
                    .setTitle('🔑 Global Command Permissions Registry')
                    .setColor(0x9B59B6)
                    .setDescription(desc);

                await interaction.reply({ embeds: [embed] });
                return true;
            }
        }
    }
};
