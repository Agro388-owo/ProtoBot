const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');
const botConfig = require('../config.js');

const { CREDIT, formatNumber, clampBalance } = require('./credits.js');

const SHORKBOI_ID = '1082525438015983636';
const fishingCooldowns = new Map();
const COOLDOWN_DURATION = 30 * 1000;

const lootFilePath = path.join(__dirname, '../fishing_loot.json');
const creditsFilePath = path.join(__dirname, '../credits.json');

const DEFAULT_LOOT_CONFIG = {
    mode: "relative",
    items: [
        { id: "pipe", name: "a Rusty Metal Pipe", emoji: "<:thing:1537616433171796149>", catchCredits: "5", sellValue: "5", chance: 24, sellable: true },
        { id: "duck", name: "a Squeaky Rubber Duck", emoji: "<:Goober:1538666294948270190>", catchCredits: "10", sellValue: "5", chance: 20, sellable: true },
        { id: "salmon", name: "a Fresh Salmon", emoji: "<:Puro_doing_a_swim:1538666516680282233>", catchCredits: "25", sellValue: "10", chance: 18, sellable: true },
        { id: "ram", name: "a High-Speed DDR5 RAM Stick", emoji: "<:Ram:1541508957216964668>", catchCredits: "50", sellValue: "15", chance: 14, sellable: true },
        { id: "battery", name: "a Heavy Lithium Battery", emoji: "<:puroshock:1536366927230799972>", catchCredits: "100", sellValue: "25", chance: 10, sellable: true },
        { id: "core", name: "a Glowing Latex Core", emoji: "<:CuteBlackCub:1538665557325254737>", catchCredits: "250", sellValue: "50", chance: 7, sellable: true },
        { id: "pc", name: "an Entire Desktop Tower", emoji: "<:protogenirl:1536430038751121499>", catchCredits: "500", sellValue: "100", chance: 4, sellable: true },
        { id: "statue", name: "GOLDEN BLOXY STATUE", emoji: "<:DrKStare:1538665762162483372>", catchCredits: "1000", sellValue: "150", chance: 2, sellable: true },
        { id: "robloxinoli", name: "GOLDEN ROBLOXINOLI STATUE", emoji: "<:DrKStare:1538665762162483372>", catchCredits: "1750", sellValue: "200", chance: 1, sellable: true },
        { id: "shorkboi", name: "Wild Shorkboi", emoji: "<:Shorkboi:1542381402526449704>", catchCredits: "5000", sellValue: "0", chance: 0.1, sellable: false },
        { id: "ring", name: "Ancient Stargate Dialing Ring", emoji: "<:InsaneCat:1538666024251953152>", catchCredits: "2500", sellValue: "250", chance: 0.5, sellable: false }
    ]
};

function loadLootDB() {
    try {
        if (fs.existsSync(lootFilePath)) {
            const raw = fs.readFileSync(lootFilePath, 'utf8') || '{}';
            const parsed = JSON.parse(raw);
            return {
                mode: parsed.mode || "relative",
                items: (parsed.items || []).map(item => ({
                    ...item,
                    catchCredits: BigInt(item.catchCredits || item.credits || "5"),
                    sellValue: BigInt(item.sellValue || "5"),
                    chance: parseFloat(item.chance),
                    sellable: item.sellable ?? true
                }))
            };
        }
    } catch (e) {
        console.error('Failed to load fishing_loot.json:', e);
    }
    return DEFAULT_LOOT_CONFIG;
}

function saveLootDB(config) {
    try {
        const serialized = {
            mode: config.mode || "relative",
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
        db[userId] = { balance: 1000n, lastDaily: null };
    }
    const rewardBig = BigInt(rewardAmount);
    db[userId].balance = clampBalance(db[userId].balance + rewardBig);
    saveCreditsDB(db);
    return db[userId].balance;
}

function getRandomCatch(lootConfig) {
    const { mode, items } = lootConfig;
    if (!items || items.length === 0) return null;

    if (mode === 'relative') {
        const totalWeight = items.reduce((sum, item) => sum + item.chance, 0);
        let random = Math.random() * totalWeight;
        for (const item of items) {
            if (random < item.chance) return item;
            random -= item.chance;
        }
        return items[0];
    }
    return items[0];
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
                       .setDescription('List all catchable items in the fishing loot table')
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
                )
                .addSubcommand(sub =>
                    sub.setName('remove')
                       .setDescription('[Admin] Remove an item from the fishing loot table by ID')
                       .addStringOption(opt => opt.setName('id').setDescription('The ID of the item to remove').setRequired(true))
                )
        ),

    async execute(interaction) {
        const group = interaction.options.getSubcommandGroup(false);
        const subcommand = interaction.options.getSubcommand();
        const user = interaction.user;
        const userId = user.id;
        const lootConfig = loadLootDB();

        // Check ownership/admin permissions
        const ownerId = botConfig.OWNER_ID || botConfig.ownerId;
        const isOwner = userId === ownerId;
        const isAdmin = interaction.memberPermissions?.has(8n);

        // Check configuration for cast privacy
        const isPublic = botConfig.CAST_MESSAGE_PUBLIC ?? true;

        // === 1. CAST SUBCOMMAND (PUBLIC OR EPHEMERAL ACCORDING TO CONFIG) ===
        if (subcommand === 'cast' && !group) {
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

            const itemCaught = getRandomCatch(lootConfig);
            const newBalance = addFishingReward(userId, itemCaught.catchCredits);

            const nameDisplay = botConfig.PING_ON_PUBLIC_MESSAGES ? `<@${userId}>` : `**${user.username}**`;

            if (itemCaught.id === 'shorkboi') {
                return await interaction.editReply({
                    content: `🚨 **SHORK ENCOUNTER!** ${nameDisplay} cast their line and reeled in <@${SHORKBOI_ID}>! 🦈\n` +
                             `**+${formatNumber(itemCaught.catchCredits)}**${CREDIT} *(Current Balance: **${formatNumber(newBalance)}**${CREDIT})*`
                });
            }

            if (itemCaught.catchCredits >= 1000n) {
                const rareEmbed = new EmbedBuilder()
                    .setColor(0xFFD700)
                    .setTitle('🌟 ULTRA RARE CATCH! 🌟')
                    .setDescription(`${nameDisplay} cast their line into the pool and reeled in a legendary artifact!`)
                    .addFields(
                        { name: 'Item Caught', value: `${itemCaught.emoji} **${itemCaught.name}**`, inline: true },
                        { name: 'Reward', value: `**+${formatNumber(itemCaught.catchCredits)}**${CREDIT}`, inline: true },
                        { name: 'Total Balance', value: `**${formatNumber(newBalance)}**${CREDIT}`, inline: false }
                    )
                    .setFooter({ text: 'ProtoBot Fishing Log' });

                return await interaction.editReply({ embeds: [rareEmbed] });
            }

            const responseMessage = `${nameDisplay} cast their line into the pool and reeled in **${itemCaught.name}** ${itemCaught.emoji}!\n` +
                `**+${formatNumber(itemCaught.catchCredits)}**${CREDIT} *(Current Balance: **${formatNumber(newBalance)}**${CREDIT})*`;

            await interaction.editReply({ content: responseMessage });
            return true;
        }

        // === 2. CATCH SUBCOMMAND (ADMIN ONLY) ===
        if (subcommand === 'catch' && !group) {
            if (!isOwner && !isAdmin) {
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

            const newBalance = addFishingReward(targetUser.id, itemCaught.catchCredits);
            const targetDisplay = botConfig.PING_ON_PUBLIC_MESSAGES ? `<@${targetUser.id}>` : `**${targetUser.username}**`;

            await interaction.reply({
                content: `🛠️ **[Admin Force Catch]** ${targetDisplay} was given **${itemCaught.name}** ${itemCaught.emoji}!\n` +
                         `**+${formatNumber(itemCaught.catchCredits)}**${CREDIT} *(Current Balance: **${formatNumber(newBalance)}**${CREDIT})*`
            });
            return true;
        }

        // === 3. LOOT GROUP SUBCOMMANDS ===
        if (group === 'loot') {
            // --- LOOT LIST ---
            if (subcommand === 'list') {
                const itemsList = lootConfig.items.map(item =>
                    `• ${item.emoji} **${item.name}** (\`${item.id}\`)\n` +
                    `  └ Chance: \`${item.chance}%\` | Catch: **+${formatNumber(item.catchCredits)}**${CREDIT} | Value: **${formatNumber(item.sellValue)}**${CREDIT}`
                ).join('\n');

                const embed = new EmbedBuilder()
                    .setTitle('🎣 Fishing Loot Table')
                    .setColor(0x3498DB)
                    .setDescription(itemsList || '*No items configured.*')
                    .setFooter({ text: `Total Items: ${lootConfig.items.length}` });

                await interaction.reply({ embeds: [embed] });
                return true;
            }

            // ADMIN GUARD for add/remove
            if (!isOwner && !isAdmin) {
                await interaction.reply({
                    content: '❌ You do not have permission to modify the fishing loot table!',
                    flags: MessageFlags.Ephemeral
                });
                return null;
            }

            // --- LOOT ADD ---
            if (subcommand === 'add') {
                const id = interaction.options.getString('id').trim().toLowerCase();
                const name = interaction.options.getString('name').trim();
                const emoji = interaction.options.getString('emoji').trim();
                const chance = interaction.options.getNumber('chance');
                const catchCreditsStr = interaction.options.getString('catch_credits').trim();
                const sellValueStr = interaction.options.getString('sell_value').trim();
                const sellable = interaction.options.getBoolean('sellable') ?? true;

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
                    sellable
                };

                lootConfig.items.push(newItem);
                saveLootDB(lootConfig);

                await interaction.reply({
                    content: `✅ Successfully added ${emoji} **${name}** (\`${id}\`) to the fishing loot table!`
                });
                return true;
            }

            // --- LOOT REMOVE ---
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
    }
};
