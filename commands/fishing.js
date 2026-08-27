const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const botConfig = require('../config.js');

// Import currency utilities directly from credits.js
const { CREDIT, formatNumber, clampBalance } = require('./credits.js');

// Cooldown map to prevent spamming (in-memory)
const fishingCooldowns = new Map();
const COOLDOWN_DURATION = 30 * 1000; // 30 seconds

// File paths
const creditsFilePath = path.join(__dirname, '../credits.json');
const lootFilePath = path.join(__dirname, '../fishing_loot.json');

// Default initial loot table configuration
const DEFAULT_LOOT_CONFIG = {
    mode: "relative", // "relative" | "fixed_100" | "independent"
    items: [
        { id: "pipe", name: "a Rusty Metal Pipe", emoji: "<:thing:1537616433171796149>", credits: "5", chance: 24 },
        { id: "duck", name: "a Squeaky Rubber Duck", emoji: "<:Goober:1538666294948270190>", credits: "10", chance: 20 },
        { id: "salmon", name: "a Fresh Salmon", emoji: "<:Puro_doing_a_swim:1538666516680282233>", credits: "25", chance: 18 },
        { id: "ram", name: "a High-Speed DDR5 RAM Stick", emoji: "<:Ram:1541508957216964668>", credits: "50", chance: 14 },
        { id: "battery", name: "a Heavy Lithium Battery", emoji: "<:puroshock:1536366927230799972>", credits: "100", chance: 10 },
        { id: "core", name: "a Glowing Latex Core", emoji: "<:CuteBlackCub:1538665557325254737>", credits: "250", chance: 7 },
        { id: "pc", name: "an Entire Desktop Tower", emoji: "<:protogenirl:1536430038751121499>", credits: "500", chance: 4 },
        { id: "statue", name: "GOLDEN BLOXY STATUE", emoji: "<:DrKStare:1538665762162483372>", credits: "1000", chance: 2 },
        { id: "bloxinoli", name: "GOLDEN BLOXINOLI STATUE", emoji: "<:DrKStare:1538665762162483372>", credits: "1750", chance: 1 },
        { id: "ring", name: "Ancient Stargate Dialing Ring", emoji: "<:InsaneCat:1538666024251953152>", credits: "2500", chance: 0.5 }
    ]
};

function loadLootDB() {
    try {
        if (fs.existsSync(lootFilePath)) {
            const raw = fs.readFileSync(lootFilePath, 'utf8') || '{}';
            const parsed = JSON.parse(raw);

            // Handle legacy array format if migrated
            if (Array.isArray(parsed)) {
                return {
                    mode: "relative",
                    items: parsed.map(item => ({
                        ...item,
                        credits: BigInt(item.credits),
                        chance: parseFloat(item.chance)
                    }))
                };
            }

            return {
                mode: parsed.mode || "relative",
                items: (parsed.items || []).map(item => ({
                    ...item,
                    credits: BigInt(item.credits),
                    chance: parseFloat(item.chance)
                }))
            };
        }
    } catch (e) {
        console.error('Failed to load fishing_loot.json:', e);
    }

    saveLootDB(DEFAULT_LOOT_CONFIG);
    return {
        mode: DEFAULT_LOOT_CONFIG.mode,
        items: DEFAULT_LOOT_CONFIG.items.map(item => ({
            ...item,
            credits: BigInt(item.credits),
            chance: parseFloat(item.chance)
        }))
    };
}

function saveLootDB(lootConfig) {
    try {
        const serialized = JSON.stringify(lootConfig, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value, 2);
        fs.writeFileSync(lootFilePath, serialized, 'utf8');
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
        console.error('Failed to load credits.json in fishing:', e);
    }
    return {};
}

function saveCreditsDB(data) {
    try {
        const serialized = JSON.stringify(data, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value, 2);
        fs.writeFileSync(creditsFilePath, serialized, 'utf8');
    } catch (e) {
        console.error('Failed to save credits.json in fishing:', e);
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

// 🎣 Dynamic System-Based Catch Logic
function getRandomCatch(lootConfig) {
    const { mode, items } = lootConfig;
    if (!items || items.length === 0) return null;

    // Mode 1: Relative Weight System (Default)
    if (mode === 'relative') {
        const totalWeight = items.reduce((sum, item) => sum + item.chance, 0);
        let random = Math.random() * totalWeight;

        for (const item of items) {
            if (random < item.chance) {
                return item;
            }
            random -= item.chance;
        }
        return items[0];
    }

    // Mode 2: Fixed 100% Direct Scale (Out of 100)
    if (mode === 'fixed_100') {
        const roll = Math.random() * 100; // Roll 0 - 100
        let cumulative = 0;

        for (const item of items) {
            cumulative += item.chance;
            if (roll < cumulative) {
                return item;
            }
        }
        // Fallback to lowest item if cumulative sum is under 100 and roll misses all thresholds
        return items[0];
    }

    // Mode 3: Independent Individual Drop Rolls
    if (mode === 'independent') {
        // Sort rarest first (lowest chance value) so rare items check priority
        const sortedItems = [...items].sort((a, b) => a.chance - b.chance);

        for (const item of sortedItems) {
            const roll = Math.random() * 100;
            if (roll < item.chance) {
                return item;
            }
        }
        // Fallback to most common item if no rolls pass
        return sortedItems[sortedItems.length - 1];
    }

    return items[0];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fishing')
        .setDescription('Cast your line into the water to catch items and earn credits!')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .addSubcommand(sub =>
            sub.setName('cast')
               .setDescription('Cast your fishing line into the water!')
        )
        .addSubcommandGroup(group =>
            group.setName('system')
                 .setDescription('[ADMIN] Manage drop system modes and mechanics.')
                 .addSubcommand(sub =>
                    sub.setName('mode')
                       .setDescription('Change the drop chance calculation system.')
                       .addStringOption(opt =>
                            opt.setName('type')
                               .setDescription('Select drop calculation system')
                               .setRequired(true)
                               .addChoices(
                                   { name: 'Relative Weight (Default: Weight / Total Weight)', value: 'relative' },
                                   { name: 'Strict Percentage (Exact X out of 100)', value: 'fixed_100' },
                                   { name: 'Independent Rolls (RNG roll per item)', value: 'independent' }
                               )
                       )
                 )
                 .addSubcommand(sub =>
                    sub.setName('list')
                       .setDescription('Displays details on how each drop calculation mode works.')
                 )
        )
        .addSubcommandGroup(group =>
            group.setName('loot')
                 .setDescription('[ADMIN] Manage the fishing loot table.')
                 .addSubcommand(sub =>
                    sub.setName('add')
                       .setDescription('Add a new item to the active loot table.')
                       .addStringOption(opt => opt.setName('id').setDescription('Unique ID (e.g. keycard)').setRequired(true))
                       .addStringOption(opt => opt.setName('name').setDescription('Display name of the item').setRequired(true))
                       .addStringOption(opt => opt.setName('credits').setDescription('Reward amount in credits').setRequired(true))
                       .addNumberOption(opt => opt.setName('chance').setDescription('Weight/chance value (e.g., 0.5)').setRequired(true))
                       .addStringOption(opt => opt.setName('emoji').setDescription('Custom emoji format (optional)').setRequired(false))
                 )
                 .addSubcommand(sub =>
                    sub.setName('remove')
                       .setDescription('Remove an item from the active loot table by ID.')
                       .addStringOption(opt => opt.setName('id').setDescription('ID of the item to remove').setRequired(true))
                 )
                 .addSubcommand(sub =>
                    sub.setName('list')
                       .setDescription('Display all loot items and their calculated drop probabilities.')
                 )
        )
        .addSubcommand(sub =>
            sub.setName('catch')
               .setDescription('[ADMIN] Rig your line to catch a specific item.')
               .addStringOption(opt =>
                    opt.setName('item')
                       .setDescription('Enter the exact item ID to reel in')
                       .setRequired(true)
               )
        ),

    async execute(interaction) {
        const subcommandGroup = interaction.options.getSubcommandGroup();
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        const isOwner = userId === botConfig.OWNER_ID;

        const lootConfig = loadLootDB();

        // 👑 ADMIN DROP SYSTEM MANAGEMENT
        if (subcommandGroup === 'system') {
            if (!isOwner) {
                return await interaction.reply({
                    content: `<:puronervous2:1538551211207430234> Access Denied! Only the bot owner can configure system mechanics.`,
                    ephemeral: true
                });
            }

            if (subcommand === 'list') {
                const infoEmbed = new EmbedBuilder()
                    .setColor(0x00D2FF)
                    .setTitle('⚙️ Fishing Drop System Modes')
                    .setDescription(`**Active Mode:** \`${lootConfig.mode.toUpperCase()}\`\n\nHere is how each probability system functions:`)
                    .addFields(
                        { 
                            name: '1. Relative Weight (`relative`) - Default', 
                            value: 'Adds all item weights into a total sum. An item’s probability equals `(item_chance / total_weight) * 100`. Adding new items dilutes existing chances.' 
                        },
                        { 
                            name: '2. Strict Percentage (`fixed_100`)', 
                            value: 'Treats the chance directly as a percentage out of 100%. Rolls a single number between 0 and 100. Sum of all items should ideally equal 100%.' 
                        },
                        { 
                            name: '3. Independent Rolls (`independent`)', 
                            value: 'Rolls an individual percentage check for each item starting from rarest to most common. If an item passes its roll, it drops instantly.' 
                        }
                    )
                    .setFooter({ text: 'ProtoBot System Engine' });

                return await interaction.reply({ embeds: [infoEmbed], ephemeral: true });
            }

            if (subcommand === 'mode') {
                const newMode = interaction.options.getString('type');
                lootConfig.mode = newMode;
                saveLootDB(lootConfig);

                const modeEmbed = new EmbedBuilder()
                    .setColor(0x00FF7F)
                    .setTitle('✅ Drop System Updated')
                    .setDescription(`Successfully switched fishing probability mode to **\`${newMode.toUpperCase()}\`**.`)
                    .setFooter({ text: 'ProtoBot System Engine' });

                return await interaction.reply({ embeds: [modeEmbed], ephemeral: true });
            }
        }

        // 👑 ADMIN LOOT TABLE MANAGEMENT
        if (subcommandGroup === 'loot') {
            if (!isOwner) {
                return await interaction.reply({
                    content: `<:puronervous2:1538551211207430234> Access Denied! Only the bot owner can manage the loot table.`,
                    ephemeral: true
                });
            }

            if (subcommand === 'list') {
                const items = lootConfig.items;
                const totalWeight = items.reduce((sum, item) => sum + item.chance, 0);

                const itemListStr = items.map(item => {
                    let probStr = '';
                    if (lootConfig.mode === 'relative') {
                        probStr = `~${((item.chance / totalWeight) * 100).toFixed(2)}%`;
                    } else if (lootConfig.mode === 'fixed_100') {
                        probStr = `${item.chance}% (fixed)`;
                    } else if (lootConfig.mode === 'independent') {
                        probStr = `${item.chance}% per roll`;
                    }

                    return `• **ID:** \`${item.id}\` | ${item.emoji ? item.emoji + ' ' : ''}**${item.name}**\n  └ Reward: **${formatNumber(item.credits)}**${CREDIT} | Weight/Chance: **${item.chance}** (${probStr})`;
                }).join('\n');

                const listEmbed = new EmbedBuilder()
                    .setColor(0x0099FF)
                    .setTitle(`🎣 Active Fishing Loot Table (${lootConfig.mode.toUpperCase()})`)
                    .setDescription(itemListStr || 'No items in loot table.')
                    .setFooter({ text: `Total Summed Weight: ${totalWeight.toFixed(2)} | Active Mode: ${lootConfig.mode}` });

                return await interaction.reply({ embeds: [listEmbed], ephemeral: true });
            }

            if (subcommand === 'add') {
                const itemId = interaction.options.getString('id').toLowerCase().trim();
                const name = interaction.options.getString('name').trim();
                const creditsInput = interaction.options.getString('credits').trim();
                const chance = interaction.options.getNumber('chance');
                const emoji = interaction.options.getString('emoji')?.trim() || "🎣";

                if (lootConfig.items.some(i => i.id === itemId)) {
                    return await interaction.reply({
                        content: `<:puronervous2:1538551211207430234> An item with ID \`${itemId}\` already exists!`,
                        ephemeral: true
                    });
                }

                let creditsBig;
                try {
                    creditsBig = BigInt(creditsInput.replace(/,/g, ''));
                } catch {
                    return await interaction.reply({
                        content: `<:puronervous2:1538551211207430234> Invalid credit amount provided!`,
                        ephemeral: true
                    });
                }

                lootConfig.items.push({ id: itemId, name, emoji, credits: creditsBig, chance });
                saveLootDB(lootConfig);

                const addEmbed = new EmbedBuilder()
                    .setColor(0x00FF7F)
                    .setTitle('✅ Loot Item Added & Saved')
                    .addFields(
                        { name: 'ID', value: `\`${itemId}\``, inline: true },
                        { name: 'Name', value: `${emoji} ${name}`, inline: true },
                        { name: 'Reward', value: `**${formatNumber(creditsBig)}**${CREDIT}`, inline: true },
                        { name: 'Weight/Chance', value: `**${chance}**`, inline: true },
                        { name: 'System Mode', value: `\`${lootConfig.mode}\``, inline: true }
                    );

                return await interaction.reply({ embeds: [addEmbed], ephemeral: true });
            }

            if (subcommand === 'remove') {
                const itemId = interaction.options.getString('id').toLowerCase().trim();
                const index = lootConfig.items.findIndex(i => i.id === itemId);

                if (index === -1) {
                    return await interaction.reply({
                        content: `<:puronervous2:1538551211207430234> Item with ID \`${itemId}\` not found in loot table!`,
                        ephemeral: true
                    });
                }

                const removed = lootConfig.items.splice(index, 1)[0];
                saveLootDB(lootConfig);

                return await interaction.reply({
                    content: `🗑️ Successfully removed **${removed.name}** (\`${removed.id}\`) from the loot table.`,
                    ephemeral: true
                });
            }
        }

        // 👑 Owner-Only /fishing catch command
        if (subcommand === 'catch') {
            if (!isOwner) {
                return await interaction.reply({
                    content: `<:puronervous2:1538551211207430234> Access Denied! Only the bot owner can rig fishing catches.`,
                    ephemeral: true
                });
            }

            await interaction.deferReply();

            const selectedId = interaction.options.getString('item').toLowerCase().trim();
            const itemCaught = lootConfig.items.find(i => i.id === selectedId) || lootConfig.items[0];
            const newBalance = addFishingReward(userId, itemCaught.credits);

            if (itemCaught.credits >= 1000n) {
                const rareEmbed = new EmbedBuilder()
                    .setColor(0xFFD700)
                    .setTitle('🌟 ULTRA RARE CATCH! 🌟')
                    .setDescription(`<@${userId}> (Owner Rigged) reeled in a legendary artifact!`)
                    .addFields(
                        { name: 'Item Caught', value: `${itemCaught.emoji} **${itemCaught.name}**`, inline: true },
                        { name: 'Reward', value: `**+${formatNumber(itemCaught.credits)}**${CREDIT}`, inline: true },
                        { name: 'Total Balance', value: `**${formatNumber(newBalance)}**${CREDIT}`, inline: false }
                    )
                    .setFooter({ text: 'ProtoBot Fishing Log [OVERRIDE]' });

                return await interaction.editReply({ embeds: [rareEmbed] });
            }

            const responseMessage = `<@${userId}> rigged their line and reeled in **${itemCaught.name}** ${itemCaught.emoji}!\n` +
                `**+${formatNumber(itemCaught.credits)}**${CREDIT} *(Current Balance: **${formatNumber(newBalance)}**${CREDIT})*`;

            await interaction.editReply({ content: responseMessage });
            return true;
        }

        // Standard /fishing cast workflow
        if (subcommand === 'cast') {
            await interaction.deferReply();
            const now = Date.now();

            if (fishingCooldowns.has(userId)) {
                const expirationTime = fishingCooldowns.get(userId) + COOLDOWN_DURATION;
                if (now < expirationTime) {
                    const timeLeft = Math.ceil((expirationTime - now) / 1000);

                    const cooldownEmbed = new EmbedBuilder()
                        .setColor(0xFFA500)
                        .setTitle('<:puronervous2:1538551211207430234> Fishing Line Tangled!')
                        .setDescription(`Your line is caught on underwater debris! Please wait before casting again.`)
                        .addFields({ name: 'Cooldown Remaining', value: `⏳ **${timeLeft} seconds**`, inline: true })
                        .setFooter({ text: 'ProtoBot Aquatic Systems' });

                    return await interaction.editReply({ embeds: [cooldownEmbed] });
                }
            }

            fishingCooldowns.set(userId, now);

            const itemCaught = getRandomCatch(lootConfig);
            const newBalance = addFishingReward(userId, itemCaught.credits);

            if (itemCaught.credits >= 1000n) {
                const rareEmbed = new EmbedBuilder()
                    .setColor(0xFFD700)
                    .setTitle('🌟 ULTRA RARE CATCH! 🌟')
                    .setDescription(`<@${userId}> cast their line into the pool and reeled in a legendary artifact!`)
                    .addFields(
                        { name: 'Item Caught', value: `${itemCaught.emoji} **${itemCaught.name}**`, inline: true },
                        { name: 'Reward', value: `**+${formatNumber(itemCaught.credits)}**${CREDIT}`, inline: true },
                        { name: 'Total Balance', value: `**${formatNumber(newBalance)}**${CREDIT}`, inline: false }
                    )
                    .setFooter({ text: 'ProtoBot Fishing Log' });

                return await interaction.editReply({ embeds: [rareEmbed] });
            }

            const responseMessage = `<@${userId}> cast their line into the pool and reeled in **${itemCaught.name}** ${itemCaught.emoji}!\n` +
                `**+${formatNumber(itemCaught.credits)}**${CREDIT} *(Current Balance: **${formatNumber(newBalance)}**${CREDIT})*`;

            await interaction.editReply({ content: responseMessage });
            return true;
        }
    }
};
