const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const botConfig = require('../config.js');

const CREDIT = '<:Credit:1541934198791737475>';
const MAX_64BIT_INT = 9223372036854775807n; // 2^63 - 1 (64-bit Integer Cap)
const creditsFilePath = path.join(__dirname, '../credits.json');

function formatNumber(num) {
    const n = BigInt(num);
    const abs = n < 0n ? -n : n;
    const sign = n < 0n ? '-' : '';

    const units = [
        { value: 10n ** 18n, symbol: 'E' }, // Quintillion / Exa (64-bit max)
        { value: 10n ** 15n, symbol: 'P' }, // Quadrillion / Peta
        { value: 10n ** 12n, symbol: 'T' }, // Trillion / Tera
        { value: 10n ** 9n,  symbol: 'B' }, // Billion / Giga
        { value: 10n ** 6n,  symbol: 'M' }, // Million / Mega
        { value: 10n ** 3n,  symbol: 'K' }  // Thousand / Kilo
    ];

    for (const { value, symbol } of units) {
        if (abs >= value) {
            const scaled = (abs * 100n) / value;
            const integerPart = scaled / 100n;
            const decimalPart = scaled % 100n;

            const decString = decimalPart > 0n 
                ? `.${decimalPart.toString().padStart(2, '0')}`.replace(/\.?0+$/, '') 
                : '';

            return `${sign}${integerPart}${decString}${symbol}`;
        }
    }

    return n.toLocaleString();
}

function clampBalance(amount) {
    if (amount > MAX_64BIT_INT) return MAX_64BIT_INT;
    if (amount < 0n) return 0n;
    return amount;
}

function parseBigIntInput(str) {
    try {
        if (!str) return null;
        const cleaned = str.trim().replace(/,/g, '');
        const val = BigInt(cleaned);
        return val < 0n ? null : val;
    } catch {
        return null;
    }
}

function loadCredits() {
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
    } catch (e) {}
    return {};
}

function saveCredits(data) {
    const serialized = JSON.stringify(data, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value, 2);
    fs.writeFileSync(creditsFilePath, serialized, 'utf8');
}

module.exports = {
    CREDIT,
    MAX_64BIT_INT,
    clampBalance,
    formatNumber,
    data: new SlashCommandBuilder()
        .setName('credits')
        .setDescription('Manage your wallet, claim daily rewards, send credits, or admin tools!')
        .setIntegrationTypes([0, 1]) // Guild install (0) and User app install (1)
        .setContexts([0, 1, 2])         // Guild channels (0), Bot DM (1), and Private Channels/Group DMs (2)
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
               .addStringOption(opt => opt.setName('amount').setDescription('Amount to send').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('add')
               .setDescription('[ADMIN] Add credits to a user')
               .addUserOption(opt => opt.setName('target').setDescription('User to give credits to').setRequired(true))
               .addStringOption(opt => opt.setName('amount').setDescription('Amount to add').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('remove')
               .setDescription('[ADMIN] Remove credits from a user')
               .addUserOption(opt => opt.setName('target').setDescription('User to take credits from').setRequired(true))
               .addStringOption(opt => opt.setName('amount').setDescription('Amount to remove').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('set')
               .setDescription('[ADMIN] Set a user\'s credit balance')
               .addUserOption(opt => opt.setName('target').setDescription('User balance to modify').setRequired(true))
               .addStringOption(opt => opt.setName('amount').setDescription('Amount to set').setRequired(true))
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const user = interaction.user;
        const db = loadCredits();

        if (!db[user.id]) db[user.id] = { balance: 1000n, lastDaily: null };

        // 1. Balance
        if (subcommand === 'balance') {
            const target = interaction.options.getUser('target') || user;
            const bal = db[target.id]?.balance ?? 0n;
            return await interaction.reply({
                content: `💳 **<@${target.id}>**'s Balance: **${formatNumber(bal)}**${CREDIT}`,
                ephemeral: true
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
                    content: `<:puronervous:1536367581995335750> You already claimed your daily payout! Try again in **${hours}h ${minutes}m**.`,
                    ephemeral: true
                });
            }

            const REWARD = 250n;
            db[user.id].balance = clampBalance(db[user.id].balance + REWARD);
            db[user.id].lastDaily = NOW;
            saveCredits(db);

            return await interaction.reply({
                content: `<:Puro_Blush6:1536430029104353380> You claimed your daily reward of **+${formatNumber(REWARD)}**${CREDIT}!\nNew Balance: **${formatNumber(db[user.id].balance)}** ${CREDIT}`,
                ephemeral: true
            });
        }

        // 3. Pay
        if (subcommand === 'pay') {
            const target = interaction.options.getUser('target');
            const amountInput = interaction.options.getString('amount');
            const amount = parseBigIntInput(amountInput);

            if (amount === null || amount <= 0n) {
                return await interaction.reply({
                    content: `<:puronervous2:1538551211207430234> Invalid amount! Please provide a positive whole number.`,
                    ephemeral: true
                });
            }

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
                    content: `<:puronervous2:1538551211207430234> Insufficient funds! You only have **${formatNumber(db[user.id].balance)}**${CREDIT}`,
                    ephemeral: true
                });
            }

            if (!db[target.id]) db[target.id] = { balance: 1000n, lastDaily: null };

            db[user.id].balance = clampBalance(db[user.id].balance - amount);
            db[target.id].balance = clampBalance(db[target.id].balance + amount);
            saveCredits(db);

            return await interaction.reply({
                content: `<:Puro_Blush6:1536430029104353380> **<@${user.id}>** transferred **${formatNumber(amount)}**${CREDIT} to **<@${target.id}>**!`
            });
        }

        // Admin Subcommands (Owner Only)
        const adminSubcommands = ['add', 'remove', 'set'];
        if (adminSubcommands.includes(subcommand)) {
            if (user.id !== botConfig.OWNER_ID) {
                return await interaction.reply({
                    content: `<:puronervous2:1538551211207430234> Access Denied! Only the bot owner can use admin commands.`,
                    ephemeral: true
                });
            }

            const target = interaction.options.getUser('target');
            const amountInput = interaction.options.getString('amount');
            const amount = parseBigIntInput(amountInput);

            if (amount === null) {
                return await interaction.reply({
                    content: `<:puronervous2:1538551211207430234> Invalid amount! Enter a valid non-negative number up to \`9223372036854775807\`.`,
                    ephemeral: true
                });
            }

            if (!db[target.id]) db[target.id] = { balance: 1000n, lastDaily: null };

            if (subcommand === 'add') {
                db[target.id].balance = clampBalance(db[target.id].balance + amount);
                saveCredits(db);
                return await interaction.reply({
                    content: `⚙️ **[ADMIN]** Added **+${formatNumber(amount)}** ${CREDIT} to **<@${target.id}>**!\nNew Balance: **${formatNumber(db[target.id].balance)}**${CREDIT}`,
                    ephemeral: true
                });
            }

            if (subcommand === 'remove') {
                db[target.id].balance = clampBalance(db[target.id].balance - amount);
                saveCredits(db);
                return await interaction.reply({
                    content: `⚙️ **[ADMIN]** Removed **-${formatNumber(amount)}** ${CREDIT} from **<@${target.id}>**!\nNew Balance: **${formatNumber(db[target.id].balance)}**${CREDIT}`,
                    ephemeral: true
                });
            }

            if (subcommand === 'set') {
                db[target.id].balance = clampBalance(amount);
                saveCredits(db);
                return await interaction.reply({
                    content: `⚙️ **[ADMIN]** Set **<@${target.id}>**'s balance to **${formatNumber(db[target.id].balance)}**${CREDIT}!`,
                    ephemeral: true
                });
            }
        }
    }
};
