const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const botConfig = require('../config.js');

const CREDIT = '<:Credit:1541934198791737475>';
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
        .setDescription('Manage your wallet, claim daily rewards, send credits, or admin tools!')
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
        )
        // Admin Subcommands (Owner Only)
        .addSubcommand(sub =>
            sub.setName('add')
               .setDescription('[ADMIN] Add credits to a user')
               .addUserOption(opt => opt.setName('target').setDescription('User to give credits to').setRequired(true))
               .addIntegerOption(opt => opt.setName('amount').setDescription('Amount to add').setRequired(true).setMinValue(1))
        )
        .addSubcommand(sub =>
            sub.setName('remove')
               .setDescription('[ADMIN] Remove credits from a user')
               .addUserOption(opt => opt.setName('target').setDescription('User to take credits from').setRequired(true))
               .addIntegerOption(opt => opt.setName('amount').setDescription('Amount to remove').setRequired(true).setMinValue(1))
        )
        .addSubcommand(sub =>
            sub.setName('set')
               .setDescription('[ADMIN] Set a user\'s credit balance')
               .addUserOption(opt => opt.setName('target').setDescription('User balance to modify').setRequired(true))
               .addIntegerOption(opt => opt.setName('amount').setDescription('Exact amount to set').setRequired(true).setMinValue(0))
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const user = interaction.user;
        const db = loadCredits();

        if (!db[user.id]) db[user.id] = { balance: 1000, lastDaily: null };

        // --- PUBLIC / USER SUBCOMMANDS ---

        // 1. Balance (Ephemeral)
        if (subcommand === 'balance') {
            const target = interaction.options.getUser('target') || user;
            const bal = db[target.id]?.balance ?? 0;
            return await interaction.reply({
                content: `💳 **<@${target.id}>**'s Balance: **${formatNumber(bal)}** ${CREDIT}`,
                ephemeral: true
            });
        }

        // 2. Daily (Ephemeral)
        if (subcommand === 'daily') {
            const NOW = Date.now();
            const COOLDOWN = 24 * 60 * 60 * 1000;
            const lastDaily = db[user.id].lastDaily || 0;

            if (NOW - lastDaily < COOLDOWN) {
                const remainingMs = COOLDOWN - (NOW - lastDaily);
                const hours = Math.floor(remainingMs / (1000 * 60 * 60));
                const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
                return await interaction.reply({
                    content: `<:puronervous:1536367581995335750> You already claimed your daily payout! Try again in **${hours}h ${minutes}m**.`,
                    ephemeral: true
                });
            }

            const REWARD = 250;
            db[user.id].balance += REWARD;
            db[user.id].lastDaily = NOW;
            saveCredits(db);

            return await interaction.reply({
                content: `<:Puro_Blush6:1536430029104353380> You claimed your daily reward of **+${formatNumber(REWARD)}** ${CREDIT}!\nNew Balance: **${formatNumber(db[user.id].balance)}** ${CREDIT}`,
                ephemeral: true
            });
        }

        // 3. Pay
        if (subcommand === 'pay') {
            const target = interaction.options.getUser('target');
            const amount = interaction.options.getInteger('amount');

            if (target.id === user.id) {
                return await interaction.reply({ 
                    content: `<:Puroadorable:1536364133392457818> You cannot send funds to yourself!`,
                    ephemeral: true 
                });
            }
            if (target.bot) {
                return await interaction.reply({ 
                    content: `<:puronervous:1536367581995335750> Bots don't need currency!`,
                    ephemeral: true 
                });
            }
            if (db[user.id].balance < amount) {
                return await interaction.reply({
                    content: `<:puronervous2:1538551211207430234> Insufficient funds! You only have **${formatNumber(db[user.id].balance)}** ${CREDIT}`,
                    ephemeral: true
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

        // --- ADMIN / OWNER SUBCOMMANDS ---

        const adminSubcommands = ['add', 'remove', 'set'];
        if (adminSubcommands.includes(subcommand)) {
            // Check if executing user matches OWNER_ID
            if (user.id !== botConfig.OWNER_ID) {
                return await interaction.reply({
                    content: `<:puronervous2:1538551211207430234> Access Denied! Only the bot owner can use admin commands.`,
                    ephemeral: true
                });
            }

            const target = interaction.options.getUser('target');
            const amount = interaction.options.getInteger('amount');

            if (!db[target.id]) db[target.id] = { balance: 1000, lastDaily: null };

            if (subcommand === 'add') {
                db[target.id].balance += amount;
                saveCredits(db);
                return await interaction.reply({
                    content: `⚙️ **[ADMIN]** Added **+${formatNumber(amount)}** ${CREDIT} to **<@${target.id}>**!\nNew Balance: **${formatNumber(db[target.id].balance)}** ${CREDIT}`,
                    ephemeral: true
                });
            }

            if (subcommand === 'remove') {
                db[target.id].balance = Math.max(0, db[target.id].balance - amount);
                saveCredits(db);
                return await interaction.reply({
                    content: `⚙️ **[ADMIN]** Removed **-${formatNumber(amount)}** ${CREDIT} from **<@${target.id}>**!\nNew Balance: **${formatNumber(db[target.id].balance)}** ${CREDIT}`,
                    ephemeral: true
                });
            }

            if (subcommand === 'set') {
                db[target.id].balance = amount;
                saveCredits(db);
                return await interaction.reply({
                    content: `⚙️ **[ADMIN]** Set **<@${target.id}>**'s balance to **${formatNumber(amount)}** ${CREDIT}!`,
                    ephemeral: true
                });
            }
        }
    }
};
