const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const botConfig = require('../config.js');

// Import currency utilities directly from credits.js
const { CREDIT, formatNumber, clampBalance } = require('./credits.js');

// Cooldown map to prevent spamming (in-memory)
const fishingCooldowns = new Map();
const COOLDOWN_DURATION = 30 * 1000; // 30 seconds

// Exact path matching credits.js
const creditsFilePath = path.join(__dirname, '../credits.json');

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

// Loot table with drop rates, custom bot emojis, and credit rewards
const FISHING_LOOT = [
    { id: "pipe", name: "a Rusty Metal Pipe", emoji: "<:thing:1537616433171796149>", credits: 5n, chance: 24 },
    { id: "duck", name: "a Squeaky Rubber Duck", emoji: "<:Goober:1538666294948270190>", credits: 10n, chance: 20 },
    { id: "salmon", name: "a Fresh Salmon", emoji: "<:Puro_doing_a_swim:1538666516680282233>", credits: 25n, chance: 18 },
    { id: "ram", name: "a High-Speed DDR5 RAM Stick", emoji: "<:Ram:1541508957216964668>", credits: 50n, chance: 14 },
    { id: "battery", name: "a Heavy Lithium Battery", emoji: "<:puroshock:1536366927230799972>", credits: 100n, chance: 10 },
    { id: "core", name: "a Glowing Latex Core", emoji: "<:CuteBlackCub:1538665557325254737>", credits: 250n, chance: 7 },
    { id: "pc", name: "an Entire Desktop Tower", emoji: "<:protogenirl:1536430038751121499>", credits: 500n, chance: 4 },
    { id: "statue", name: "GOLDEN BLOXY STATUE", emoji: "<:DrKStare:1538665762162483372>", credits: 1000n, chance: 2 },
    { id: "ring", name: "Ancient Stargate Dialing Ring", emoji: "<:InsaneCat:1538666024251953152>", credits: 2500n, chance: 1 }
];

function getRandomCatch() {
    const totalWeight = FISHING_LOOT.reduce((sum, item) => sum + item.chance, 0);
    let random = Math.floor(Math.random() * totalWeight);

    for (const item of FISHING_LOOT) {
        if (random < item.chance) {
            return item;
        }
        random -= item.chance;
    }
    return FISHING_LOOT[0];
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
        .addSubcommand(sub =>
            sub.setName('catch')
               .setDescription('[ADMIN] Rig your line to catch a specific item.')
               .addStringOption(opt =>
                    opt.setName('item')
                       .setDescription('Select the exact item to reel in')
                       .setRequired(true)
                       .addChoices(
                           ...FISHING_LOOT.map(item => ({
                               name: `${item.name} (${formatNumber(item.credits)})`,
                               value: item.id
                           }))
                       )
               )
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        const isOwner = userId === botConfig.OWNER_ID;

        // 👑 Owner-Only /fishing catch command
        if (subcommand === 'catch') {
            if (!isOwner) {
                return await interaction.reply({
                    content: `<:puronervous2:1538551211207430234> Access Denied! Only the bot owner can rig fishing catches.`,
                    ephemeral: true
                });
            }

            await interaction.deferReply();

            const selectedId = interaction.options.getString('item');
            const itemCaught = FISHING_LOOT.find(i => i.id === selectedId) || FISHING_LOOT[0];
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

            // ⏱️ Cooldown Check
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

            // 🎣 Catch random item
            const itemCaught = getRandomCatch();
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
