const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');
const botConfig = require('../config.js');
const { CREDIT, formatNumber, loadCredits, saveCredits, ensureUser } = require('./credits.js');

const inventoryFilePath = path.resolve(process.cwd(), 'inventory.json');

const ORE_TABLE = [
    { id: 'raw_iron', name: 'Raw Iron', emoji: '🪙', smeltInto: 'iron_bar', smeltVal: 45n, chance: 35 },
    { id: 'raw_gold', name: 'Raw Gold', emoji: '🧈', smeltInto: 'gold_bar', smeltVal: 120n, chance: 25 },
    { id: 'raw_ram', name: 'Raw RAM Stick', emoji: '<:Ram:1541508957216964668>', smeltInto: 'overclocked_ram', smeltVal: 250n, chance: 15 },
    { id: 'raw_iridium', name: 'Raw Iridium', emoji: '🧊', smeltInto: 'iridium_bar', smeltVal: 600n, chance: 8 },
    { id: 'raw_uranium', name: 'Raw Uranium', emoji: '☢️', smeltInto: 'enriched_uranium', smeltVal: 1500n, chance: 3 },
    { id: 'red_fox', name: 'Red Fox Latex (Benjamin?)', emoji: '🦊', smeltInto: null, smeltVal: 5000n, chance: 0.5, special: true }
];

const BAR_CATALOG = {
    iron_bar: { name: 'Iron Bar', emoji: '🧱', value: 45n },
    gold_bar: { name: 'Gold Bar', emoji: '🟡', value: 120n },
    overclocked_ram: { name: 'Overclocked RAM Block', emoji: '<:Ram:1541508957216964668>', value: 250n },
    iridium_bar: { name: 'Iridium Bar', emoji: '🔷', value: 600n },
    enriched_uranium: { name: 'Enriched Uranium Cell', emoji: '⚡', value: 1500n }
};

// Mining Upgrade Tiers & Costs (in local credits)
const MINING_UPGRADES = {
    pickaxe: {
        name: 'Laser-Edge Pickaxe Tier',
        maxLevel: 5,
        cost: level => BigInt(level * 500),
        benefit: level => `+${level * 2}% better rare ore extraction rates`
    },
    filter: {
        name: 'Advanced Slag Separator',
        maxLevel: 3,
        cost: level => BigInt(level * 1200),
        benefit: level => `Reduces common ore weight by ${level * 5}%`
    }
};

const BASE_MAX_CHARGES = 5;
const RECHARGE_TIME = 25 * 1000; // 25 seconds per charge

function loadInventoryDB() {
    try {
        if (fs.existsSync(inventoryFilePath)) {
            const raw = fs.readFileSync(inventoryFilePath, 'utf8').trim();
            return raw ? JSON.parse(raw) : {};
        }
    } catch (e) {}
    return {};
}

function saveInventoryDB(data) {
    fs.writeFileSync(inventoryFilePath, JSON.stringify(data, null, 2), 'utf8');
}

function rollOre(luckMultiplier = 1.0, pickaxeLevel = 0) {
    // Modify drop chances dynamically based on pickaxe level and server luck
    const adjustedTable = ORE_TABLE.map(ore => {
        let weight = ore.chance;
        if (!ore.special && pickaxeLevel > 0) {
            weight *= (1.0 - (pickaxeLevel * 0.02)); // slightly reduce common weights
        } else if (ore.special) {
            weight *= luckMultiplier * (1.0 + (pickaxeLevel * 0.1));
        }
        return { ...ore, effectiveChance: weight };
    });

    const totalWeight = adjustedTable.reduce((sum, o) => sum + o.effectiveChance, 0);
    let roll = Math.random() * totalWeight;

    for (const ore of adjustedTable) {
        if (roll <= ore.effectiveChance) return ore;
        roll -= ore.effectiveChance;
    }
    return ORE_TABLE[0];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mine')
        .setDescription('Venture into underground tunnels to mine raw ores, upgrade gear, and smelt bars!')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .addSubcommand(sub =>
            sub.setName('tunnel')
               .setDescription('Go mining for raw ores and minerals (Charges up to 5, 25s per charge)')
        )
        .addSubcommand(sub =>
            sub.setName('smelt')
               .setDescription('Smelt raw ores from your inventory into high-value bars')
               .addStringOption(opt =>
                   opt.setName('ore')
                      .setDescription('The raw ore to smelt')
                      .setRequired(true)
                      .addChoices(
                          { name: '🪙 Raw Iron ➔ Iron Bar', value: 'raw_iron' },
                          { name: '🧈 Raw Gold ➔ Gold Bar', value: 'raw_gold' },
                          { name: '💻 Raw RAM ➔ Overclocked RAM', value: 'raw_ram' },
                          { name: '🧊 Raw Iridium ➔ Iridium Bar', value: 'raw_iridium' },
                          { name: '☢️ Raw Uranium ➔ Enriched Uranium', value: 'raw_uranium' }
                      )
               )
        )
        .addSubcommand(sub =>
            sub.setName('upgrade')
               .setDescription('Purchase mining equipment upgrades using local credits')
               .addStringOption(opt =>
                   opt.setName('type')
                      .setDescription('The equipment upgrade to level up')
                      .setRequired(true)
                      .addChoices(
                          { name: '⛏️ Laser-Edge Pickaxe (Rarity Boost)', value: 'pickaxe' },
                          { name: '⚙️ Slag Separator (Yield Efficiency)', value: 'filter' }
                      )
               )
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        const guildId = interaction.guildId;
        const creditsDB = loadCredits();
        const userData = ensureUser(creditsDB, userId);

        // Check target Discord Server configuration link if defined in botConfig
        const isTargetServer = guildId && botConfig.TARGET_SERVER_ID && guildId === botConfig.TARGET_SERVER_ID;
        const serverLuckMultiplier = isTargetServer ? (botConfig.TARGET_SERVER_LUCK || 1.5) : 1.0;

        if (subcommand === 'tunnel') {
            const NOW = Date.now();
            
            if (userData.mineCharges === undefined) {
                userData.mineCharges = BASE_MAX_CHARGES;
                userData.lastMineRefill = NOW;
            }

            const elapsed = NOW - (userData.lastMineRefill || NOW);
            const recoveredCharges = Math.floor(elapsed / RECHARGE_TIME);

            if (recoveredCharges > 0) {
                userData.mineCharges = Math.min(BASE_MAX_CHARGES, userData.mineCharges + recoveredCharges);
                userData.lastMineRefill = (userData.lastMineRefill || NOW) + (recoveredCharges * RECHARGE_TIME);
            }

            if (userData.mineCharges <= 0) {
                const nextRefillIn = Math.ceil((RECHARGE_TIME - (NOW - userData.lastMineRefill)) / 1000);
                return await interaction.reply({
                    content: `⛏️ Out of pickaxe charges! Next charge recharges in **${nextRefillIn}s** (Max ${BASE_MAX_CHARGES}).`,
                    flags: MessageFlags.Ephemeral
                });
            }

            userData.mineCharges -= 1;
            if (userData.mineCharges === BASE_MAX_CHARGES - 1 && recoveredCharges === 0) {
                userData.lastMineRefill = NOW;
            }
            saveCredits(creditsDB);

            const pickaxeLevel = userData.upgrades?.pickaxe || 0;
            const foundOre = rollOre(serverLuckMultiplier, pickaxeLevel);

            const inventoryDB = loadInventoryDB();
            if (!inventoryDB[userId]) inventoryDB[userId] = [];
            inventoryDB[userId].push({ id: foundOre.id, name: foundOre.name, emoji: foundOre.emoji });
            saveInventoryDB(inventoryDB);

            const embed = new EmbedBuilder()
                .setTitle('⛏️ Mining Expedition')
                .setColor(foundOre.special ? 0xFF0055 : 0x7F8C8D)
                .setDescription(foundOre.special 
                    ? `🚨 **RARE ENCOUNTER!** You struck a hidden chamber and found **${foundOre.emoji} ${foundOre.name}**!`
                    : `You swing your pickaxe deep into the rock face and extract **${foundOre.emoji} ${foundOre.name}**!`)
                .addFields(
                    { name: 'Item Added', value: `${foundOre.emoji} ${foundOre.name} (\`${foundOre.id}\`)`, inline: true },
                    { name: 'Charges Left', value: `🔋 **${userData.mineCharges}/${BASE_MAX_CHARGES}**`, inline: true }
                );

            if (isTargetServer) {
                embed.setFooter({ text: '🌟 Target Server Bonus Active: Increased Rare Drop Rates!' });
            }

            return await interaction.reply({ embeds: [embed] });
        }

        if (subcommand === 'smelt') {
            const oreKey = interaction.options.getString('ore');
            const targetOre = ORE_TABLE.find(o => o.id === oreKey);
            if (!targetOre || !targetOre.smeltInto) {
                return await interaction.reply({ content: '❌ Invalid ore selected for smelting.', flags: MessageFlags.Ephemeral });
            }

            const inventoryDB = loadInventoryDB();
            const userInventory = inventoryDB[userId] || [];
            const index = userInventory.findIndex(item => (typeof item === 'string' ? item : item?.id) === oreKey);

            if (index === -1) {
                return await interaction.reply({
                    content: `❌ You don't have **${targetOre.name}** (${targetOre.emoji}) in your inventory to smelt!`,
                    flags: MessageFlags.Ephemeral
                });
            }

            userInventory.splice(index, 1);
            const barInfo = BAR_CATALOG[targetOre.smeltInto];
            userInventory.push({ id: targetOre.smeltInto, name: barInfo.name, emoji: barInfo.emoji });
            saveInventoryDB(inventoryDB);

            return await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('🔥 Smelting Furnace')
                        .setColor(0xE67E22)
                        .setDescription(`Successfully melted **${targetOre.emoji} ${targetOre.name}** down in the furnace!`)
                        .addFields(
                            { name: 'Produced Item', value: `${barInfo.emoji} **${barInfo.name}**`, inline: true },
                            { name: 'Resale Value', value: `**${formatNumber(barInfo.value)}** ${CREDIT}`, inline: true }
                        )
                ]
            });
        }

        if (subcommand === 'upgrade') {
            const upgradeType = interaction.options.getString('type');
            const upgradeConfig = MINING_UPGRADES[upgradeType];
            
            if (!userData.upgrades) userData.upgrades = {};
            const currentLevel = userData.upgrades[upgradeType] || 0;

            if (currentLevel >= upgradeConfig.maxLevel) {
                return await interaction.reply({
                    content: `❌ Your **${upgradeConfig.name}** is already at maximum level (**Level ${upgradeConfig.maxLevel}**)[span_0](start_span)[span_0](end_span)!`,
                    flags: MessageFlags.Ephemeral
                });
            }

            const cost = upgradeConfig.cost(currentLevel + 1);
            const userBalance = userData.balance ? BigInt(userData.balance) : 0n;

            if (userBalance < cost) {
                return await interaction.reply({
                    content: `❌ Insufficient funds! Upgrading **${upgradeConfig.name}** to Level ${currentLevel + 1} costs **${formatNumber(cost)}** ${CREDIT} (You have **${formatNumber(userBalance)}** ${CREDIT}).`,
                    flags: MessageFlags.Ephemeral
                });
            }

            userData.balance = (userBalance - cost).toString();
            userData.upgrades[upgradeType] = currentLevel + 1;
            saveCredits(creditsDB);

            return await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('🛠️ Mining Equipment Upgraded')
                        .setColor(0x00FFC8)
                        .setDescription(`Successfully upgraded **${upgradeConfig.name}** to **Level ${currentLevel + 1}**!`)
                        .addFields(
                            { name: 'New Benefit', value: upgradeConfig.benefit(currentLevel + 1), inline: false },
                            { name: 'Cost Paid', value: `**${formatNumber(cost)}** ${CREDIT}`, inline: true },
                            { name: 'Remaining Balance', value: `**${formatNumber(BigInt(userData.balance))}** ${CREDIT}`, inline: true }
                        )
                ]
            });
        }
    }
};
