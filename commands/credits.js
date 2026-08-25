const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const CREDIT = '<:Credit:1541924089256607785>';
const creditsFilePath = path.join(__dirname, '../credits.json');

function formatNumber(num) {
    if (num >= 1e12) return (num / 1e12).toFixed(2).replace(/\.00$/, '') + 'T';
    if (num >= 1e9)  return (num / 1e9).toFixed(2).replace(/\.00$/, '') + 'B';
    if (num >= 1e6)  return (num / 1e6).toFixed(2).replace(/\.00$/, '') + 'M';
    if (num >= 1e3)  return (num / 1e3).toFixed(2).replace(/\.00$/, '') + 'K';
    return num.toLocaleString();
}

function loadCredits() {
    try {
        if (fs.existsSync(creditsFilePath)) {
            return JSON.parse(fs.readFileSync(creditsFilePath, 'utf8') || '{}');
        }
    } catch (e) {}
    return {};
}

function saveCredits(data) {
    fs.writeFileSync(creditsFilePath, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = {
    CREDIT,
    data: new SlashCommandBuilder()
        .setName('credits')
        .setDescription('Manage your wallet, claim daily rewards, or send credits!')
        .addSubcommand(sub =>
            sub.setName('balance')
               .setDescription('Check your current credit balance')
               .addUserOption(opt => opt.setName('target').setDescription('User to check balance for'))
        )
        .addSubcommand(sub =>
            sub.setName('daily')
               .setDescription('Claim your daily credit reward (24h cooldown)')
        )
        .addSubcommand(sub =>
            sub.setName('pay')
               .setDescription('Transfer credits to another user')
               .addUserOption(opt => opt.setName('target').setDescription('User to pay').setRequired(true))
               .addIntegerOption(opt => opt.setName('amount').setDescription('Amount to send').setRequired(true).setMinValue(1))
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const user = interaction.user;
        const db = loadCredits();

        // Updated default balance to 1,000 (1k)
        if (!db[user.id]) db[user.id] = { balance: 1000, lastDaily: null };

        // 1. Balance
        if (subcommand === 'balance') {
            const target = interaction.options.getUser('target') || user;
            const bal = db[target.id]?.balance ?? 0;
            return await interaction.reply({
                content: `💳 **<@${target.id}>**'s Balance: **${formatNumber(bal)}** ${CREDIT}`
            });
        }

        // 2. Daily
        if (subcommand === 'daily') {
            const NOW = Date.now();
            const COOLDOWN = 24 * 60 * 60 * 1000;
            const lastDaily = db[user.id].lastDaily || 0;

            if (NOW - lastDaily < COOLDOWN) {
                const remainingMs = COOLDOWN - (NOW - lastDaily);
                const hours = Math.floor(remainingMs / (1000 * 60 * 60));
                const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
                return await interaction.reply({
                    content: `<:puronervous:1536367581995335750> You already claimed your daily payout! Try again in **${hours}h ${minutes}m**.`
                });
            }

            const REWARD = 250;
            db[user.id].balance += REWARD;
            db[user.id].lastDaily = NOW;
            saveCredits(db);

            return await interaction.reply({
                content: `<:Puro_Blush6:1536430029104353380> **<@${user.id}>** claimed their daily reward of **+${formatNumber(REWARD)}** ${CREDIT}!\nNew Balance: **${formatNumber(db[user.id].balance)}** ${CREDIT}`
            });
        }

        // 3. Pay
        if (subcommand === 'pay') {
            const target = interaction.options.getUser('target');
            const amount = interaction.options.getInteger('amount');

            if (target.id === user.id) return await interaction.reply({ content: `<:Puroadorable:1536364133392457818> You cannot send funds to yourself!` });
            if (target.bot) return await interaction.reply({ content: `<:puronervous:1536367581995335750> Bots don't need currency!` });
            if (db[user.id].balance < amount) {
                return await interaction.reply({
                    content: `<:puronervous2:1538551211207430234> Insufficient funds! You only have **${formatNumber(db[user.id].balance)}** ${CREDIT}`
                });
            }

            if (!db[target.id]) db[target.id] = { balance: 1000, lastDaily: null };

            db[user.id].balance -= amount;
            db[target.id].balance += amount;
            saveCredits(db);

            return await interaction.reply({
                content: `<:Puro_Blush6:1536430029104353380> **<@${user.id}>** transferred **${formatNumber(amount)}** ${CREDIT} to **<@${target.id}>**!`
            });
        }
    }
};
