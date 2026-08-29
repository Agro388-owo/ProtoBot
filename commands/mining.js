const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');
const botConfig = require('../config.js');
const { CREDIT, formatNumber, clampBalance, loadCredits, saveCredits, ensureUser } = require('./credits.js');

const inventoryFilePath = path.resolve(process.cwd(), 'inventory.json');

const ORE_TABLE = [
    { id: 'raw_iron', name: 'Raw Iron', emoji: '🪙', chance: 35 },
    { id: 'raw_gold', name: 'Raw Gold', emoji: '🧈', chance: 25 },
    { id: 'raw_ram', name: 'Raw RAM Stick', emoji: '<:Ram:1541508957216964668>', chance: 15 },
    { id: 'raw_iridium', name: 'Raw Iridium', emoji: '🧊', chance: 8 },
    { id: 'raw_uranium', name: 'Raw Uranium', emoji: '☢️', chance: 3 },
    { id: 'red_fox', name: 'Red Fox Latex (Benjamin?)', emoji: '🦊', chance: 0.5, special: true }
];

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

function rollOre(luckMultiplier = 1.0) {
    const adjustedTable = ORE_TABLE.map(ore => {
        let weight = ore.chance;
        if (ore.special) {
            weight *= luckMultiplier;
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
        .setDescription('Venture into underground tunnels to mine raw ores!')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2]),

    async execute(interaction) {
        const userId = interaction.user.id;
        const guildId = interaction.guildId;
        const creditsDB = loadCredits();
        const userData = ensureUser(creditsDB, userId);

        const isTargetServer = guildId && botConfig.TARGET_SERVER_ID && guildId === botConfig.TARGET_SERVER_ID;
        const serverLuckMultiplier = isTargetServer ? (botConfig.TARGET_SERVER_LUCK || 1.5) : 1.0;

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

        const foundOre = rollOre(serverLuckMultiplier);

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
};
