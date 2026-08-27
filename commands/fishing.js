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

// Default initial loot table
const DEFAULT_LOOT = [
    { id: "pipe", name: "a Rusty Metal Pipe", emoji: "<:thing:1537616433171796149>", credits: "5", chance: 24 },
    { id: "duck", name: "a Squeaky Rubber Duck", emoji: "<:Goober:1538666294948270190>", credits: "10", chance: 20 },
    { id: "salmon", name: "a Fresh Salmon", emoji: "<:Puro_doing_a_swim:1538666516680282233>", credits: "25", chance: 18 },
    { id: "ram", name: "a High-Speed DDR5 RAM Stick", emoji: "<:Ram:1541508957216964668>", credits: "50", chance: 14 },
    { id: "battery", name: "a Heavy Lithium Battery", emoji: "<:puroshock:1536366927230799972>", credits: "100", chance: 10 },
    { id: "core", name: "a Glowing Latex Core", emoji: "<:CuteBlackCub:1538665557325254737>", credits: "250", chance: 7 },
    { id: "pc", name: "an Entire Desktop Tower", emoji: "<:protogenirl:1536430038751121499>", credits: "500", chance: 4 },
    { id: "statue", name: "GOLDEN BLOXY STATUE", emoji: "<:DrKStare:1538665762162483372>", credits: "1000", chance: 2 },
    { id: "bloxinoli", name: "GOLDEN BLOXINOLI STATUE", emoji: "<:DrKStare:1538665762162483372>", credits: "1750", chance: 1 },
    { id: "ring", name: "Ancient Stargate Dialing Ring", emoji: "<:InsaneCat:1538666024251953152>", credits: "2500", chance: 1 }
];

function loadLootDB() {
    try {
        if (fs.existsSync(lootFilePath)) {
            const raw = fs.readFileSync(lootFilePath, 'utf8') || '[]';
            const parsed = JSON.parse(raw);
            return parsed.map(item => ({
                ...item,
                credits: BigInt(item.credits)
            }));
        }
    } catch (e) {
        console.error('Failed to load fishing_loot.json:', e);
    }
    saveLootDB(DEFAULT_LOOT);
    return DEFAULT_LOOT.map(item => ({ ...item, credits: BigInt(item.credits) }));
}

function saveLootDB(lootArray) {
    try {
        const serialized = JSON.stringify(lootArray, (key, value) =>
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

function getRandomCatch(lootTable) {
    const totalWeight = lootTable.reduce((sum, item) => sum + item.chance, 0);
    let random = Math.floor(Math.random() * totalWeight);

    for (const item of lootTable) {
        if (random < item.chance) {
            return item;
        }
        random -= item.chance;
    }
    return lootTable[0];
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
            group.setName('loot')
                 .setDescription('[ADMIN] Manage the fishing loot table.')
                 .addSubcommand(sub =>
                    sub.setName('add')
                       .setDescription('Add a new item to the active loot table.')
                       .addStringOption(opt => opt.setName('id').setDescription('Unique ID (e.g. keycard)').setRequired(true))
                       .addStringOption(opt => opt.setName('name').setDescription('Display name of the item').setRequired(true))
                       .addStringOption(opt => opt.setName('credits').setDescription('Reward amount in credits').setRequired(true))
                       .addIntegerOption(opt => opt.setName('chance').setDescription('Weight/chance value (higher = more common)').setRequired(true))
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

        const fishingLoot = loadLootDB();

        // 👑 ADMIN LOOT TABLE MANAGEMENT
        if (subcommandGroup === 'loot') {
            if (!isOwner) {
                return await interaction.reply({
                    content: `<:puronervous2:1538551211207430234> Access Denied! Only the bot owner can manage the loot table.`,
                    ephemeral: true
                });
            }

            if (subcommand === 'list') {
                const totalWeight = fishingLoot.reduce((sum, item) => sum + item.chance, 0);
                const itemListStr = fishingLoot.map(item => {
                    const probability = ((item.chance / totalWeight) * 100).toFixed(2);
                    return `• **ID:** \`${item.id}\` | ${item.emoji ? item.emoji + ' ' : ''}**${item.name}**\n  └ Reward: **${formatNumber(item.credits)}**${CREDIT} | Weight: **${item.chance}** (~${probability}%)`;
                }).join('\n');

                const listEmbed = new EmbedBuilder()
                    .setColor(0x0099FF)
                    .setTitle('🎣 Active Fishing Loot Table')
                    .setDescription(itemListStr || 'No items in loot table.')
                    .setFooter({ text: `Total Loot Table Weight: ${totalWeight}` });

                return await interaction.reply({ embeds: [listEmbed], ephemeral: true });
            }

            if (subcommand === 'add') {
                const itemId = interaction.options.getString('id').toLowerCase().trim();
                const name = interaction.options.getString('name').trim();
                const creditsInput = interaction.options.getString('credits').trim();
                const chance = interaction.options.getInteger('chance');
                const emoji = interaction.options.getString('emoji')?.trim() || "🎣";

                if (fishingLoot.some(i => i.id === itemId)) {
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

                fishingLoot.push({ id: itemId, name, emoji, credits: creditsBig, chance });
                saveLootDB(fishingLoot);

                const addEmbed = new EmbedBuilder()
                    .setColor(0x00FF7F)
                    .setTitle('✅ Loot Item Added & Saved')
                    .addFields(
                        { name: 'ID', value: `\`${itemId}\``, inline: true },
                        { name: 'Name', value: `${emoji} ${name}`, inline: true },
                        { name: 'Reward', value: `**${formatNumber(creditsBig)}**${CREDIT}`, inline: true },
                        { name: 'Weight', value: `**${chance}**`, inline: true }
                    );

                return await interaction.reply({ embeds: [addEmbed], ephemeral: true });
            }

            if (subcommand === 'remove') {
                const itemId = interaction.options.getString('id').toLowerCase().trim();
                const index = fishingLoot.findIndex(i => i.id === itemId);

                if (index === -1) {
                    return await interaction.reply({
                        content: `<:puronervous2:1538551211207430234> Item with ID \`${itemId}\` not found in loot table!`,
                        ephemeral: true
                    });
                }

                const removed = fishingLoot.splice(index, 1)[0];
                saveLootDB(fishingLoot);

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
            const itemCaught = fishingLoot.find(i => i.id === selectedId) || fishingLoot[0];
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

            const itemCaught = getRandomCatch(fishingLoot);
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
