const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

const { CREDIT, formatNumber, clampBalance } = require('./credits.js');

const lootFilePath = path.resolve(process.cwd(), 'fishing_loot.json');
const creditsFilePath = path.resolve(process.cwd(), 'credits.json');
const inventoryFilePath = path.resolve(process.cwd(), 'inventory.json');

const LUCK_UPGRADE_BASE_COST = 2000n;
const LUCK_UPGRADE_COST_MULTIPLIER = 1.8;
const MAX_LUCK_LEVEL = 5;

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
        console.error('Failed to load credits.json in shop:', e);
    }
    return {};
}

function saveCreditsDB(data) {
    try {
        const serialized = JSON.stringify(data, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value, 2);
        fs.writeFileSync(creditsFilePath, serialized, 'utf8');
    } catch (e) {
        console.error('Failed to save credits.json in shop:', e);
    }
}

function loadInventoryDB() {
    try {
        if (fs.existsSync(inventoryFilePath)) {
            const raw = fs.readFileSync(inventoryFilePath, 'utf8').trim();
            return raw ? JSON.parse(raw) : {};
        }
    } catch (e) {
        console.error('Failed to load inventory.json in shop:', e);
    }
    return {};
}

function saveInventoryDB(data) {
    try {
        fs.writeFileSync(inventoryFilePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
        console.error('Failed to save inventory.json in shop:', e);
    }
}

function loadLootDB() {
    try {
        if (fs.existsSync(lootFilePath)) {
            const raw = fs.readFileSync(lootFilePath, 'utf8') || '{}';
            const parsed = JSON.parse(raw);
            return (parsed.items || []).map(item => ({
                ...item,
                sellValue: BigInt(item.sellValue || "0"),
                sellable: item.sellable ?? true
            }));
        }
    } catch (e) {
        console.error('Failed to load fishing_loot.json in shop:', e);
    }
    return [];
}

function getUpgradeCost(currentLevel) {
    if (currentLevel >= MAX_LUCK_LEVEL) return null;
    const factor = Math.pow(LUCK_UPGRADE_COST_MULTIPLIER, currentLevel);
    return BigInt(Math.floor(Number(LUCK_UPGRADE_BASE_COST) * factor));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('ProtoBot Marketplace - Buy upgrades or sell salvage!')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .addSubcommand(sub =>
            sub.setName('view')
               .setDescription('View items and upgrades available in the shop')
        )
        .addSubcommand(sub =>
            sub.setName('buy')
               .setDescription('Buy an upgrade or item from the shop')
               .addStringOption(opt =>
                   opt.setName('item')
                      .setDescription('The item or upgrade to purchase')
                      .setRequired(true)
                      .addChoices(
                          { name: '🍀 Fishing Luck Upgrade (+15% Rare Catch Chance)', value: 'luck_upgrade' }
                      )
               )
        )
        .addSubcommand(sub =>
            sub.setName('sell')
               .setDescription('Sell an item from your inventory for credits')
               .addStringOption(opt =>
                   opt.setName('item_id')
                      .setDescription('The ID of the item in your inventory to sell')
                      .setRequired(true)
               )
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        const creditsDB = loadCreditsDB();

        if (!creditsDB[userId]) {
            creditsDB[userId] = { balance: 1000n, lastDaily: null, badges: [], luckLevel: 0 };
        }

        const userLuckLevel = creditsDB[userId].luckLevel || 0;
        const currentBalance = creditsDB[userId].balance;

        // === 1. VIEW SHOP ===
        if (subcommand === 'view') {
            const nextCost = getUpgradeCost(userLuckLevel);
            const costDisplay = nextCost !== null ? `**${formatNumber(nextCost)}**${CREDIT}` : '`MAX LEVEL REACHED`';

            const embed = new EmbedBuilder()
                .setTitle('🛒 ProtoBot Marketplace')
                .setColor(0x00FFC8)
                .setDescription(
                    `Welcome to the shop! Upgrades auto-apply immediately upon purchase.\n` +
                    `Your Balance: **${formatNumber(currentBalance)}**${CREDIT}`
                )
                .addFields(
                    {
                        name: '🍀 Fishing Luck Upgrade (Auto-Applied)',
                        value: `Current Level: **${userLuckLevel} / ${MAX_LUCK_LEVEL}** (+${userLuckLevel * 15}% rare drop chance)\n` +
                               `Next Level Cost: ${costDisplay}\n` +
                               `*Command:* \`/shop buy item:luck_upgrade\``,
                        inline: false
                    },
                    {
                        name: '💰 Salvage & Resale',
                        value: `Sell caught items directly from your \`/inventory\` for credits.\n` +
                               `*Command:* \`/shop sell item_id:<ID>\``,
                        inline: false
                    }
                )
                .setFooter({ text: 'ProtoBot Trade Subsystem' });

            return await interaction.reply({ embeds: [embed] });
        }

        // === 2. BUY SUBCOMMAND ===
        if (subcommand === 'buy') {
            const itemKey = interaction.options.getString('item');

            if (itemKey === 'luck_upgrade') {
                if (userLuckLevel >= MAX_LUCK_LEVEL) {
                    return await interaction.reply({
                        content: `⚠️ Your Fishing Luck is already maxed out (**Level ${MAX_LUCK_LEVEL}**)!`,
                        flags: MessageFlags.Ephemeral
                    });
                }

                const cost = getUpgradeCost(userLuckLevel);

                if (currentBalance < cost) {
                    return await interaction.reply({
                        content: `❌ You need **${formatNumber(cost)}**${CREDIT} to purchase a luck upgrade, but you only have **${formatNumber(currentBalance)}**${CREDIT}!`,
                        flags: MessageFlags.Ephemeral
                    });
                }

                const newLuckLevel = userLuckLevel + 1;
                creditsDB[userId].balance = clampBalance(currentBalance - cost);
                creditsDB[userId].luckLevel = newLuckLevel;
                saveCreditsDB(creditsDB);

                const embed = new EmbedBuilder()
                    .setTitle('🍀 LUCK UPGRADE PURCHASED')
                    .setColor(0x2ECC71)
                    .setDescription(
                        `Upgraded Fishing Luck to **Level ${newLuckLevel} / ${MAX_LUCK_LEVEL}**!\n` +
                        `*Effect auto-applied: Your rare drop chance in \`/fishing cast\` is now increased by **+${newLuckLevel * 15}%**.*`
                    )
                    .addFields(
                        { name: 'Cost Paid', value: `**-${formatNumber(cost)}**${CREDIT}`, inline: true },
                        { name: 'Remaining Balance', value: `**${formatNumber(creditsDB[userId].balance)}**${CREDIT}`, inline: true }
                    )
                    .setFooter({ text: 'ProtoBot Trade Subsystem' });

                return await interaction.reply({ embeds: [embed] });
            }
        }

        // === 3. SELL SUBCOMMAND ===
        if (subcommand === 'sell') {
            const itemId = interaction.options.getString('item_id').trim().toLowerCase();
            const lootItems = loadLootDB();
            const targetItem = lootItems.find(i => i.id === itemId);

            if (!targetItem) {
                return await interaction.reply({
                    content: `⚠️ Could not find an item with ID \`${itemId}\` in the market registry!`,
                    flags: MessageFlags.Ephemeral
                });
            }

            const inventoryDB = loadInventoryDB();
            const userInventory = inventoryDB[userId] || [];
            const itemIndex = userInventory.findIndex(i => i.toLowerCase() === itemId);

            if (itemIndex === -1) {
                return await interaction.reply({
                    content: `❌ You do not have **${targetItem.name}** in your \`/inventory\`!`,
                    flags: MessageFlags.Ephemeral
                });
            }

            if (!targetItem.sellable || targetItem.sellValue <= 0n) {
                return await interaction.reply({
                    content: `❌ **${targetItem.name}** ${targetItem.emoji} cannot be sold!`,
                    flags: MessageFlags.Ephemeral
                });
            }

            userInventory.splice(itemIndex, 1);
            inventoryDB[userId] = userInventory;
            saveInventoryDB(inventoryDB);

            const earned = targetItem.sellValue;
            creditsDB[userId].balance = clampBalance(currentBalance + earned);
            saveCreditsDB(creditsDB);

            const embed = new EmbedBuilder()
                .setTitle('💰 SALVAGE TRADE COMPLETED')
                .setColor(0xF1C40F)
                .setDescription(`Sold ${targetItem.emoji} **${targetItem.name}** from your inventory!`)
                .addFields(
                    { name: 'Payout Received', value: `**+${formatNumber(earned)}**${CREDIT}`, inline: true },
                    { name: 'New Balance', value: `**${formatNumber(creditsDB[userId].balance)}**${CREDIT}`, inline: true }
                )
                .setFooter({ text: 'ProtoBot Scrapper Network' });

            return await interaction.reply({ embeds: [embed] });
        }
    }
};
