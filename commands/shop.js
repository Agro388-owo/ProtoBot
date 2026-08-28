const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

const { CREDIT, formatNumber, clampBalance } = require('./credits.js');

const lootFilePath = path.resolve(process.cwd(), 'fishing_loot.json');
const creditsFilePath = path.resolve(process.cwd(), 'credits.json');
const globalCreditsFilePath = path.resolve(process.cwd(), 'global_credits.json');
const inventoryFilePath = path.resolve(process.cwd(), 'inventory.json');

const LUCK_UPGRADE_BASE_COST = 2000n;
const LUCK_UPGRADE_COST_MULTIPLIER = 1.8;
const MAX_LUCK_LEVEL = 5;
const EXCHANGE_RATE = 1000n; // Rate: 1,000 Local = 1 Global ۞

// Default items fallback from fishing command
const FALLBACK_ITEMS = [
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
    { id: "uox_fuel", name: "a UOX Fuel Assembly", emoji: "☢️", catchCredits: 6000n, sellValue: 3000n, chance: 0.3, sellable: true },
    { id: "mox_fuel", name: "a MOX Fuel Assembly", emoji: "☣️", catchCredits: 7500n, sellValue: 4000n, chance: 0.2, sellable: true },
    { id: "ring", name: "Ancient Stargate Dialing Ring", emoji: "<:InsaneCat:1538666024251953152>", catchCredits: 2500n, sellValue: 250n, chance: 0.5, sellable: false },
    { id: "shorkboi", name: "Shorkboi", emoji: "<:Shorkboi:1542381402526449704>", catchCredits: 5000n, sellValue: 0n, chance: 0.5, sellable: false },
    { id: "spytheproot", name: "SpyTheProot", emoji: "<:SpyTheProot:1542483331734573148>", catchCredits: 5000n, sellValue: 0n, chance: 0.5, sellable: false }
];

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

function loadGlobalCreditsDB() {
    try {
        if (fs.existsSync(globalCreditsFilePath)) {
            const raw = fs.readFileSync(globalCreditsFilePath, 'utf8') || '{}';
            const parsed = JSON.parse(raw);
            for (const id in parsed) {
                if (parsed[id].balance !== undefined) {
                    parsed[id].balance = clampBalance(BigInt(parsed[id].balance));
                }
            }
            return parsed;
        }
    } catch (e) {
        console.error('Failed to load global_credits.json in shop:', e);
    }
    return {};
}

function saveGlobalCreditsDB(data) {
    try {
        const serialized = JSON.stringify(data, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value, 2);
        fs.writeFileSync(globalCreditsFilePath, serialized, 'utf8');
    } catch (e) {
        console.error('Failed to save global_credits.json in shop:', e);
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
            if (parsed.items && parsed.items.length > 0) {
                return parsed.items.map(item => ({
                    ...item,
                    sellValue: BigInt(item.sellValue || "0"),
                    sellable: item.sellable ?? true
                }));
            }
        }
    } catch (e) {
        console.error('Failed to load fishing_loot.json in shop:', e);
    }

    return FALLBACK_ITEMS.map(item => ({
        ...item,
        sellValue: BigInt(item.sellValue || "0"),
        sellable: item.sellable ?? true
    }));
}

function getUpgradeCost(currentLevel) {
    if (currentLevel >= MAX_LUCK_LEVEL) return null;
    const factor = Math.pow(LUCK_UPGRADE_COST_MULTIPLIER, currentLevel);
    return BigInt(Math.floor(Number(LUCK_UPGRADE_BASE_COST) * factor));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('ProtoBot Marketplace - Buy upgrades, sell salvage, or convert credits!')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .addSubcommand(sub =>
            sub.setName('view')
               .setDescription('View items, upgrades, and currency exchange rates')
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
        )
        .addSubcommand(sub =>
            sub.setName('sell_all')
               .setDescription('Sell all sellable items in your inventory for credits')
        )
        .addSubcommand(sub =>
            sub.setName('exchange')
               .setDescription('Convert credits between Local and Global currencies')
               .addStringOption(opt =>
                   opt.setName('direction')
                      .setDescription('Conversion direction')
                      .setRequired(true)
                      .addChoices(
                          { name: 'Local ➔ Global (1,000 Local = 1 ۞)', value: 'local_to_global' },
                          { name: 'Global ➔ Local (1 ۞ = 1,000 Local)', value: 'global_to_local' }
                      )
               )
               .addIntegerOption(opt =>
                   opt.setName('amount')
                      .setDescription('Amount of target currency units you want to receive')
                      .setRequired(true)
                      .setMinValue(1)
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
            const costDisplay = nextCost !== null ? `**${formatNumber(nextCost)}** ${CREDIT}` : '`MAX LEVEL REACHED`';

            const globalCreditsDB = loadGlobalCreditsDB();
            const userGlobalBalance = globalCreditsDB[userId]?.balance || 0n;

            const embed = new EmbedBuilder()
                .setTitle('🛒 ProtoBot Marketplace')
                .setColor(0x00FFC8)
                .setDescription(
                    `Welcome to the shop! Upgrades auto-apply immediately upon purchase.\n\n` +
                    `Local Balance: **${formatNumber(currentBalance)}** ${CREDIT}\n` +
                    `Global Balance: **${formatNumber(userGlobalBalance)}** ۞`
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
                        name: '💱 Bidirectional Currency Exchange',
                        value: `Convert freely between Local Credits and Global Credits.\n` +
                               `• Local ➔ Global: **1,000** ${CREDIT} ➔ **1** ۞\n` +
                               `• Global ➔ Local: **1** ۞ ➔ **1,000** ${CREDIT}\n` +
                               `*Command:* \`/shop exchange direction:<direction> amount:<amount>\``,
                        inline: false
                    },
                    {
                        name: '💰 Salvage & Resale',
                        value: `Sell caught items directly from your \`/inventory\` for credits.\n` +
                               `• Single Item: \`/shop sell item_id:<ID>\`\n` +
                               `• Bulk Resale: \`/shop sell_all\``,
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
                        content: `❌ You need **${formatNumber(cost)}** ${CREDIT} to purchase a luck upgrade, but you only have **${formatNumber(currentBalance)}** ${CREDIT}!`,
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
                        { name: 'Cost Paid', value: `**-${formatNumber(cost)}** ${CREDIT}`, inline: true },
                        { name: 'Remaining Balance', value: `**${formatNumber(creditsDB[userId].balance)}** ${CREDIT}`, inline: true }
                    )
                    .setFooter({ text: 'ProtoBot Trade Subsystem' });

                return await interaction.reply({ embeds: [embed] });
            }
        }

        // === 3. SELL SUBCOMMAND ===
        if (subcommand === 'sell') {
            const itemId = interaction.options.getString('item_id').trim().toLowerCase();
            const lootItems = loadLootDB();
            const targetItem = lootItems.find(i => i.id.toLowerCase() === itemId);

            if (!targetItem) {
                return await interaction.reply({
                    content: `⚠️ Could not find an item with ID \`${itemId}\` in the market registry!`,
                    flags: MessageFlags.Ephemeral
                });
            }

            const inventoryDB = loadInventoryDB();
            const userInventory = inventoryDB[userId] || [];

            const itemIndex = userInventory.findIndex(item => {
                const storedId = typeof item === 'string' ? item : item?.id;
                return storedId && storedId.toLowerCase() === itemId;
            });

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
                    { name: 'Payout Received', value: `**+${formatNumber(earned)}** ${CREDIT}`, inline: true },
                    { name: 'New Balance', value: `**${formatNumber(creditsDB[userId].balance)}** ${CREDIT}`, inline: true }
                )
                .setFooter({ text: 'ProtoBot Scrapper Network' });

            return await interaction.reply({ embeds: [embed] });
        }

        // === 4. SELL ALL SUBCOMMAND ===
        if (subcommand === 'sell_all') {
            const inventoryDB = loadInventoryDB();
            const userInventory = inventoryDB[userId] || [];

            if (userInventory.length === 0) {
                return await interaction.reply({
                    content: '❌ Your inventory is empty! There is nothing to sell.',
                    flags: MessageFlags.Ephemeral
                });
            }

            const lootItems = loadLootDB();
            const lootMap = new Map(lootItems.map(item => [item.id.toLowerCase(), item]));

            let totalEarned = 0n;
            let soldCount = 0;
            const remainingInventory = [];

            for (const rawItem of userInventory) {
                const itemId = (typeof rawItem === 'string' ? rawItem : rawItem?.id || '').toLowerCase();
                const matchedItem = lootMap.get(itemId);

                if (matchedItem && matchedItem.sellable && matchedItem.sellValue > 0n) {
                    totalEarned += matchedItem.sellValue;
                    soldCount++;
                } else {
                    remainingInventory.push(rawItem);
                }
            }

            if (soldCount === 0) {
                return await interaction.reply({
                    content: '⚠️ You don\'t have any sellable items in your inventory!',
                    flags: MessageFlags.Ephemeral
                });
            }

            // Save updated inventory and balance
            inventoryDB[userId] = remainingInventory;
            saveInventoryDB(inventoryDB);

            creditsDB[userId].balance = clampBalance(currentBalance + totalEarned);
            saveCreditsDB(creditsDB);

            const unsoldKeepers = remainingInventory.length;

            const embed = new EmbedBuilder()
                .setTitle('📦 BULK SALVAGE TRADE COMPLETED')
                .setColor(0x2ECC71)
                .setDescription(`Successfully liquidated all sellable inventory items!`)
                .addFields(
                    { name: 'Items Liquidated', value: `**${soldCount}** item(s)`, inline: true },
                    { name: 'Total Payout', value: `**+${formatNumber(totalEarned)}** ${CREDIT}`, inline: true },
                    { name: 'New Balance', value: `**${formatNumber(creditsDB[userId].balance)}** ${CREDIT}`, inline: true },
                    { name: 'Kept Unsellable Items', value: `**${unsoldKeepers}** item(s) retained`, inline: false }
                )
                .setFooter({ text: 'ProtoBot Scrapper Network' });

            return await interaction.reply({ embeds: [embed] });
        }

        // === 5. EXCHANGE SUBCOMMAND (BIDIRECTIONAL) ===
        if (subcommand === 'exchange') {
            const direction = interaction.options.getString('direction');
            const targetAmount = BigInt(interaction.options.getInteger('amount'));

            const globalCreditsDB = loadGlobalCreditsDB();
            if (!globalCreditsDB[userId]) {
                globalCreditsDB[userId] = { balance: 0n };
            }
            const currentGlobalBalance = globalCreditsDB[userId].balance || 0n;

            // --- LOCAL TO GLOBAL (1,000 Local -> 1 Global) ---
            if (direction === 'local_to_global') {
                const totalLocalCost = targetAmount * EXCHANGE_RATE;

                if (currentBalance < totalLocalCost) {
                    return await interaction.reply({
                        content: `❌ You need **${formatNumber(totalLocalCost)}** ${CREDIT} to receive **${formatNumber(targetAmount)}** ۞, but you only have **${formatNumber(currentBalance)}** ${CREDIT}!`,
                        flags: MessageFlags.Ephemeral
                    });
                }

                creditsDB[userId].balance = clampBalance(currentBalance - totalLocalCost);
                globalCreditsDB[userId].balance = clampBalance(currentGlobalBalance + targetAmount);

                saveCreditsDB(creditsDB);
                saveGlobalCreditsDB(globalCreditsDB);

                const embed = new EmbedBuilder()
                    .setTitle('💱 CURRENCY EXCHANGE (LOCAL ➔ GLOBAL)')
                    .setColor(0x00FFC8)
                    .setDescription(`Converted Local Credits to Global Credits!`)
                    .addFields(
                        { name: 'Converted Cost', value: `**-${formatNumber(totalLocalCost)}** ${CREDIT}`, inline: true },
                        { name: 'Global Received', value: `**+${formatNumber(targetAmount)}** ۞`, inline: true },
                        { name: 'New Local Balance', value: `**${formatNumber(creditsDB[userId].balance)}** ${CREDIT}`, inline: false },
                        { name: 'New Global Balance', value: `**${formatNumber(globalCreditsDB[userId].balance)}** ۞`, inline: false }
                    )
                    .setFooter({ text: 'ProtoBot Exchange Subsystem' });

                return await interaction.reply({ embeds: [embed] });
            }

            // --- GLOBAL TO LOCAL (1 Global -> 1,000 Local) ---
            if (direction === 'global_to_local') {
                const globalCost = targetAmount;
                const localReceived = targetAmount * EXCHANGE_RATE;

                if (currentGlobalBalance < globalCost) {
                    return await interaction.reply({
                        content: `❌ You need **${formatNumber(globalCost)}** ۞ to receive **${formatNumber(localReceived)}** ${CREDIT}, but you only have **${formatNumber(currentGlobalBalance)}** ۞!`,
                        flags: MessageFlags.Ephemeral
                    });
                }

                globalCreditsDB[userId].balance = clampBalance(currentGlobalBalance - globalCost);
                creditsDB[userId].balance = clampBalance(currentBalance + localReceived);

                saveCreditsDB(creditsDB);
                saveGlobalCreditsDB(globalCreditsDB);

                const embed = new EmbedBuilder()
                    .setTitle('💱 CURRENCY EXCHANGE (GLOBAL ➔ LOCAL)')
                    .setColor(0x00FFC8)
                    .setDescription(`Converted Global Credits to Local Credits!`)
                    .addFields(
                        { name: 'Global Spent', value: `**-${formatNumber(globalCost)}** ۞`, inline: true },
                        { name: 'Local Received', value: `**+${formatNumber(localReceived)}** ${CREDIT}`, inline: true },
                        { name: 'New Global Balance', value: `**${formatNumber(globalCreditsDB[userId].balance)}** ۞`, inline: false },
                        { name: 'New Local Balance', value: `**${formatNumber(creditsDB[userId].balance)}** ${CREDIT}`, inline: false }
                    )
                    .setFooter({ text: 'ProtoBot Exchange Subsystem' });

                return await interaction.reply({ embeds: [embed] });
            }
        }
    }
};
