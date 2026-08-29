const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const botConfig = require('../config.js');
const { CREDIT, formatNumber, clampBalance, isInPrison } = require('./credits.js');

const creditsFilePath = path.join(__dirname, '../credits.json');

function getDB() {
    if (fs.existsSync(creditsFilePath)) {
        try {
            const raw = fs.readFileSync(creditsFilePath, 'utf8') || '{}';
            const parsed = JSON.parse(raw);
            for (const id in parsed) {
                if (parsed[id].balance !== undefined) {
                    parsed[id].balance = clampBalance(BigInt(parsed[id].balance));
                }
            }
            return parsed;
        } catch (e) {
            console.error('Failed to parse credits DB:', e);
        }
    }
    return {};
}

function saveDB(db) {
    try {
        const serialized = JSON.stringify(db, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value, 2);
        fs.writeFileSync(creditsFilePath, serialized, 'utf8');
    } catch (e) {
        console.error('Failed to save credits DB:', e);
    }
}

function parseBigIntInput(str) {
    try {
        if (!str) return null;
        const cleaned = str.trim().replace(/,/g, '');
        const val = BigInt(cleaned);
        return val <= 0n ? null : val;
    } catch {
        return null;
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gamble')
        .setDescription('Risk your credits for a chance to win big (influenced by server luck)!')
        .addStringOption(option =>
            option.setName('amount')
                  .setDescription('Amount of credits to wager')
                  .setRequired(true)
        ),

    async execute(interaction) {
        const user = interaction.user;
        const guildId = interaction.guildId;
        const amountInput = interaction.options.getString('amount');
        const wager = parseBigIntInput(amountInput);
        const db = getDB();

        if (!db[user.id]) db[user.id] = { balance: 1000n, lastDaily: null, jailUntil: 0 };

        // Prison Check
        if (isInPrison(db[user.id])) {
            const remainingMs = db[user.id].jailUntil - Date.now();
            const minutes = Math.floor(remainingMs / (1000 * 60));
            const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);
            return await interaction.reply({
                content: `🚨 **PRISON LOCKDOWN!** You are currently in prison! You cannot gamble for another **${minutes}m ${seconds}s**.`,
                ephemeral: true
            });
        }

        // 1. Validation
        if (wager === null) {
            return await interaction.reply({
                content: `<:puronervous2:1538551211207430234> Invalid wager amount! Please enter a positive number.`,
                ephemeral: true
            });
        }

        if (db[user.id].balance < wager) {
            return await interaction.reply({
                content: `<:puronervous2:1538551211207430234> Insufficient funds! You only have **${formatNumber(db[user.id].balance)}** ${CREDIT}`,
                ephemeral: true
            });
        }

        // 2. Dynamic Odds / Luck Calculation for Target Server
        const isTargetServer = guildId && botConfig.TARGET_SERVER_ID && guildId === botConfig.TARGET_SERVER_ID;
        let baseOdds = 150; // default 1/150 chance

        if (isTargetServer && botConfig.TARGET_SERVER_LUCK) {
            // If luck multiplier is > 1.0 (e.g., 2.0x luck), reduce the target odds denominator
            // e.g., 150 / 2.0 = 75 (making it twice as easy to hit)
            baseOdds = Math.max(10, Math.round(150 / botConfig.TARGET_SERVER_LUCK));
        }

        const roll = Math.floor(Math.random() * baseOdds) + 1;
        const winningRoll = baseOdds; // hit condition is top of odds range

        if (roll === winningRoll) {
            const netWin = wager * 149n;
            db[user.id].balance = clampBalance(db[user.id].balance + netWin);
            saveDB(db);

            let bonusText = isTargetServer ? `\n🌟 *Bonus: Server Luck Multiplier Active (${botConfig.TARGET_SERVER_LUCK}x)!*` : '';
            return await interaction.reply({
                content: `<:purocute:1536367584369180803> **<@${user.id}>** wagered **${formatNumber(wager)}** ${CREDIT} and HIT THE **JACKPOT**!\nWon **+${formatNumber(netWin)}** ${CREDIT}! New Balance: **${formatNumber(db[user.id].balance)}** ${CREDIT} <:Puroadorable:1536364133392457818>${bonusText}`
            });
        } else {
            db[user.id].balance = clampBalance(db[user.id].balance - wager);
            saveDB(db);

            return await interaction.reply({
                content: `<:thing:1537616433171796149> **<@${user.id}>** wagered **${formatNumber(wager)}** ${CREDIT}... and lost it all!\nRemaining Balance: **${formatNumber(db[user.id].balance)}** ${CREDIT}. <:puronervous:1536367581995335750>`
            });
        }
    }
};
