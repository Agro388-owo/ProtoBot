const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');
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

const MAX_CHARGES = 5;
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

function rollOre() {
    const roll = Math.random() * 100;
    let cumulative = 0;
    for (const ore of ORE_TABLE) {
        cumulative += ore.chance;
        if (roll <= cumulative) return ore;
    }
    return ORE_TABLE[0];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mine')
        .setDescription('Venture into underground tunnels to mine raw ores, smelt bars, and find rare items!')
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
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        const creditsDB = loadCredits();
        const userData = ensureUser(creditsDB, userId);

        if (subcommand === 'tunnel') {
            const NOW = Date.now();
            
            if (userData.mineCharges === undefined) {
                userData.mineCharges = MAX_CHARGES;
                userData.lastMineRefill = NOW;
            }

            const elapsed = NOW - (userData.lastMineRefill || NOW);
            const recoveredCharges = Math.floor(elapsed / RECHARGE_TIME);

            if (recoveredCharges > 0) {
                userData.mineCharges = Math.min(MAX_CHARGES, userData.mineCharges + recoveredCharges);
                userData.lastMineRefill = (userData.lastMineRefill || NOW) + (recoveredCharges * RECHARGE_TIME);
            }

            if (userData.mineCharges <= 0) {
                const nextRefillIn = Math.ceil((RECHARGE_TIME - (NOW - userData.lastMineRefill)) / 1000);
                return await interaction.reply({
                    content: `⛏️ Out of pickaxe charges! Next charge recharges in **${nextRefillIn}s** (Max ${MAX_CHARGES}).`,
                    flags: MessageFlags.Ephemeral
                });
            }

            userData.mineCharges -= 1;
            if (userData.mineCharges === MAX_CHARGES - 1 && recoveredCharges === 0) {
                // If dropping from max and no chunk was timed prior, sync timer
                userData.lastMineRefill = NOW;
            }
            saveCredits(creditsDB);

            const foundOre = rollOre();
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
                    { name: 'Charges Left', value: `🔋 **${userData.mineCharges}/${MAX_CHARGES}**`, inline: true }
                );

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
    }
};
