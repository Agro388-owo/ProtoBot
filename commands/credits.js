const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Local Emoji Declarations
const CREDIT = '<:Credit:1541924089256607785>';
const puronervous = '<:puronervous:1536367581995335750>';
const puronervous2 = '<:puronervous2:1538551211207430234>';
const Puro_Blush = '<:Puro_Blush6:1536430029104353380>';
const Puroadorable = '<:Puroadorable:1536364133392457818>';

const creditsFilePath = path.join(__dirname, '../credits.json');

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

        if (!db[user.id]) db[user.id] = { balance: 100, lastDaily: null };

        // 1. Balance
        if (subcommand === 'balance') {
            const target = interaction.options.getUser('target') || user;
            const bal = db[target.id]?.balance ?? 0;
            return await interaction.reply({
                content: `💳 **<@${target.id}>**'s Balance: **${bal.toLocaleString()}** ${CREDIT}`
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
                    content: `${puronervous} You already claimed your daily payout! Try again in **${hours}h ${minutes}m**.`
                });
            }

            const REWARD = 250;
            db[user.id].balance += REWARD;
            db[user.id].lastDaily = NOW;
            saveCredits(db);

            return await interaction.reply({
                content: `${Puro_Blush} **<@${user.id}>** claimed their daily reward of **+${REWARD}** ${CREDIT}!\nNew Balance: **${db[user.id].balance.toLocaleString()}** ${CREDIT}`
            });
        }

        // 3. Pay
        if (subcommand === 'pay') {
            const target = interaction.options.getUser('target');
            const amount = interaction.options.getInteger('amount');

            if (target.id === user.id) return await interaction.reply({ content: `${Puroadorable} You cannot send funds to yourself!` });
            if (target.bot) return await interaction.reply({ content: `${puronervous} Bots don't need currency!` });
            if (db[user.id].balance < amount) {
                return await interaction.reply({
                    content: `${puronervous2} Insufficient funds! You only have **${db[user.id].balance.toLocaleString()}** ${CREDIT}`
                });
            }

            if (!db[target.id]) db[target.id] = { balance: 100, lastDaily: null };

            db[user.id].balance -= amount;
            db[target.id].balance += amount;
            saveCredits(db);

            return await interaction.reply({
                content: `${Puro_Blush} **<@${user.id}>** transferred **${amount.toLocaleString()}** ${CREDIT} to **<@${target.id}>**!`
            });
        }
    }
};
