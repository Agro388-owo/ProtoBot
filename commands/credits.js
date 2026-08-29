const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const botConfig = require('../config.js');

const CREDIT = '<:Credit:1541934198791737475>';
const MAX_CREDIT_CAP = 10n ** 153n;
const DEFAULT_BALANCE = 1000n;
const DAILY_REWARD = 250n;
const creditsFilePath = path.join(__dirname, '../credits.json');

const units = [
    { value: 10n ** 60n, symbol: 'Nd' },
    { value: 10n ** 57n, symbol: 'Od' },
    { value: 10n ** 54n, symbol: 'Sp' },
    { value: 10n ** 51n, symbol: 'Sx' },
    { value: 10n ** 48n, symbol: 'Qi' },
    { value: 10n ** 45n, symbol: 'Qa' },
    { value: 10n ** 42n, symbol: 'Td' },
    { value: 10n ** 39n, symbol: 'Dd' },
    { value: 10n ** 36n, symbol: 'Ud' },
    { value: 10n ** 33n, symbol: 'Dc' },
    { value: 10n ** 30n, symbol: 'No' },
    { value: 10n ** 27n, symbol: 'Oc' },
    { value: 10n ** 24n, symbol: 'Sp' },
    { value: 10n ** 21n, symbol: 'Sx' },
    { value: 10n ** 18n, symbol: 'E' },
    { value: 10n ** 15n, symbol: 'P' },
    { value: 10n ** 12n, symbol: 'T' },
    { value: 10n ** 9n,  symbol: 'B' },
    { value: 10n ** 6n,  symbol: 'M' },
    { value: 10n ** 3n,  symbol: 'K' }
];

function formatNumber(num) {
    const n = BigInt(num);
    const abs = n < 0n ? -n : n;
    const sign = n < 0n ? '-' : '';

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
    if (amount > MAX_CREDIT_CAP) return MAX_CREDIT_CAP;
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

function ensureUser(db, userId) {
    if (!db[userId]) {
        db[userId] = { balance: DEFAULT_BALANCE, lastDaily: null };
        saveCredits(db);
    }
    return db[userId];
}

module.exports = {
    CREDIT,
    MAX_CREDIT_CAP,
    clampBalance,
    formatNumber,
    data: new SlashCommandBuilder()
        .setName('credits')
        .setDescription('Manage your wallet, claim daily rewards, send credits, or admin tools!')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .addSubcommand(sub =>
            sub.setName('balance')
               .setDescription('Check your current credit balance')
               .addUserOption(opt => opt.setName('target').setDescription('User to check balance for'))
        )
        .addSubcommand(sub =>
            sub.setName('daily')
               .setDescription('Claim your daily credit reward (12h cooldown)')
        )
        .addSubcommand(sub =>
            sub.setName('leaderboard')
               .setDescription('View top credit holders across the system')
        )
        .addSubcommand(sub =>
            sub.setName('info')
               .setDescription('Display credit unit definitions')
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

        ensureUser(db, user.id);

        // 1. Balance
        if (subcommand === 'balance') {
            const target = interaction.options.getUser('target') || user;
            const targetData = ensureUser(db, target.id);
            
            return await interaction.reply({
                content: `💳 **<@${target.id}>**'s Balance: **${formatNumber(targetData.balance)}**${CREDIT}`,
                ephemeral: true
            });
        }

        // 2. Daily
        if (subcommand === 'daily') {
            const NOW = Date.now();
            const COOLDOWN = 12 * 60 * 60 * 1000;
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

            db[user.id].balance = clampBalance(db[user.id].balance + DAILY_REWARD);
            db[user.id].lastDaily = NOW;
            saveCredits(db);

            return await interaction.reply({
                content: `<:Puro_Blush6:1536430029104353380> You claimed your daily reward of **+${formatNumber(DAILY_REWARD)}**${CREDIT}!\nNew Balance: **${formatNumber(db[user.id].balance)}** ${CREDIT}`,
                ephemeral: true
            });
        }

        // 3. System Info (Only displays the units array structure)
        if (subcommand === 'info') {
            const half = Math.ceil(units.length / 2);
            const unitsPart1 = units.slice(0, half).map(u => `  { value: 10n ** ${u.value.toString().length - 1}n, symbol: '${u.symbol}' }`).join(',\n');
            const unitsPart2 = units.slice(half).map(u => `  { value: 10n ** ${u.value.toString().length - 1}n, symbol: '${u.symbol}' }`).join(',\n');

            const embed = new EmbedBuilder()
                .setTitle('⚙️ Economy Units Scale')
                .setColor('#2B2D31')
                .addFields(
                    { name: '📜 Units Mapping (Part 1)', value: `\`\`\`javascript\nconst units = [\n${unitsPart1},\n\`\`\`` },
                    { name: '📜 Units Mapping (Part 2)', value: `\`\`\`javascript\n${unitsPart2}\n];\`\`\`` }
                )
                .setFooter({ text: 'ProtoBot Economy System' });

            return await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // 4. Leaderboard
        if (subcommand === 'leaderboard') {
            const sorted = Object.entries(db)
                .map(([id, data]) => ({ id, balance: data.balance ?? DEFAULT_BALANCE }))
                .sort((a, b) => (b.balance > a.balance ? 1 : b.balance < a.balance ? -1 : 0));

            if (sorted.length === 0) {
                return await interaction.reply({
                    content: '🏆 No credit entries registered yet.',
                    ephemeral: true
                });
            }

            const pageSize = 10;
            const totalPages = Math.ceil(sorted.length / pageSize);
            let currentPage = 0;

            const userRankIndex = sorted.findIndex(e => e.id === user.id);
            const userRankText = userRankIndex !== -1 ? `#${userRankIndex + 1}` : 'Unranked';

            const generateEmbed = (page) => {
                const start = page * pageSize;
                const pageEntries = sorted.slice(start, start + pageSize);

                const medalIcons = ['🥇', '🥈', '🥉'];
                const lines = pageEntries.map((entry, index) => {
                    const globalRank = start + index;
                    const rankDisplay = medalIcons[globalRank] || `**#${globalRank + 1}**`;
                    return `${rankDisplay} <@${entry.id}> — **${formatNumber(entry.balance)}** ${CREDIT}`;
                });

                return new EmbedBuilder()
                    .setTitle('🏆 Credit Leaderboard')
                    .setDescription(lines.join('\n'))
                    .setColor('#FFD700')
                    .setFooter({ 
                        text: `Page ${page + 1}/${totalPages} | Your Rank: ${userRankText} | Balance: ${formatNumber(db[user.id].balance)}` 
                    });
            };

            const getButtons = (page) => {
                return new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('lb_prev')
                        .setLabel('◀️ Previous')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page === 0),
                    new ButtonBuilder()
                        .setCustomId('lb_next')
                        .setLabel('Next ▶️')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page >= totalPages - 1)
                );
            };

            if (totalPages === 1) {
                return await interaction.reply({ embeds: [generateEmbed(0)] });
            }

            const response = await interaction.reply({
                embeds: [generateEmbed(currentPage)],
                components: [getButtons(currentPage)],
                fetchReply: true
            });

            const collector = response.createMessageComponentCollector({
                filter: i => i.user.id === interaction.user.id,
                time: 60000
            });

            collector.on('collect', async i => {
                if (i.customId === 'lb_prev') currentPage = Math.max(0, currentPage - 1);
                if (i.customId === 'lb_next') currentPage = Math.min(totalPages - 1, currentPage + 1);

                await i.update({
                    embeds: [generateEmbed(currentPage)],
                    components: [getButtons(currentPage)]
                });
            });

            collector.on('end', async () => {
                const disabledButtons = getButtons(currentPage);
                disabledButtons.components.forEach(btn => btn.setDisabled(true));
                await interaction.editReply({ components: [disabledButtons] }).catch(() => {});
            });

            return;
        }

        // 5. Pay
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

            ensureUser(db, target.id);

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
            const ownerId = botConfig.OWNER_ID || botConfig.ownerId;
            if (user.id !== ownerId) {
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
                    content: `<:puronervous2:1538551211207430234> Invalid amount! Enter a valid non-negative number.`,
                    ephemeral: true
                });
            }

            ensureUser(db, target.id);

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
