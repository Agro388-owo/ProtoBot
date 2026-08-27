const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { CREDIT, formatNumber, clampBalance } = require('./credits.js');

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
        .setDescription('Risk your credits for a chance to win 150x payout!')
        .addStringOption(option =>
            option.setName('amount')
                  .setDescription('Amount of credits to wager')
                  .setRequired(true)
        ),

    async execute(interaction) {
        const user = interaction.user;
        const amountInput = interaction.options.getString('amount');
        const wager = parseBigIntInput(amountInput);
        const db = getDB();

        if (!db[user.id]) db[user.id] = { balance: 1000n, lastDaily: null };

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

        // 2. Roll 1/150 Chance
        const ODDS = 150;
        const roll = Math.floor(Math.random() * ODDS) + 1;

        if (roll === 150) {
            // Net gain: 149x wager added to balance (yielding 150x total wager returned)
            const netWin = wager * 149n;
            db[user.id].balance = clampBalance(db[user.id].balance + netWin);
            saveDB(db);

            return await interaction.reply({
                content: `<:purocute:1536367584369180803> **<@${user.id}>** wagered **${formatNumber(wager)}** ${CREDIT} and HIT THE **1/150 JACKPOT**!\nWon **+${formatNumber(netWin)}** ${CREDIT}! New Balance: **${formatNumber(db[user.id].balance)}** ${CREDIT} <:Puroadorable:1536364133392457818>`
            });
        } else {
            // Deduct wager
            db[user.id].balance = clampBalance(db[user.id].balance - wager);
            saveDB(db);

            return await interaction.reply({
                content: `<:thing:1537616433171796149> **<@${user.id}>** wagered **${formatNumber(wager)}** ${CREDIT}... and lost it all!\nRemaining Balance: **${formatNumber(db[user.id].balance)}** ${CREDIT}. <:puronervous:1536367581995335750>`
            });
        }
    }
};
