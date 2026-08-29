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
    { value: 10n ** 60n, symbol: 'Nd', name: 'Novemdicillion', exp: '1e60' },
    { value: 10n ** 57n, symbol: 'Od', name: 'Octodecillion',  exp: '1e57' },
    { value: 10n ** 54n, symbol: 'Sp', name: 'Septendecillion',exp: '1e54' },
    { value: 10n ** 51n, symbol: 'Sx', name: 'Sexdecillion',   exp: '1e51' },
    { value: 10n ** 48n, symbol: 'Qi', name: 'Quindecillion',  exp: '1e48' },
    { value: 10n ** 45n, symbol: 'Qa', name: 'Quattuordecillion', exp: '1e45' },
    { value: 10n ** 42n, symbol: 'Td', name: 'Tredecillion',   exp: '1e42' },
    { value: 10n ** 39n, symbol: 'Dd', name: 'Duodecillion',   exp: '1e39' },
    { value: 10n ** 36n, symbol: 'Ud', name: 'Undecillion',    exp: '1e36' },
    { value: 10n ** 33n, symbol: 'Dc', name: 'Decillion',      exp: '1e33' },
    { value: 10n ** 30n, symbol: 'No', name: 'Nonillion',      exp: '1e30' },
    { value: 10n ** 27n, symbol: 'Oc', name: 'Octillion',      exp: '1e27' },
    { value: 10n ** 24n, symbol: 'Sp', name: 'Septillion',     exp: '1e24' },
    { value: 10n ** 21n, symbol: 'Sx', name: 'Sextillion',     exp: '1e21' },
    { value: 10n ** 18n, symbol: 'E',  name: 'Quintillion',    exp: '1e18' },
    { value: 10n ** 15n, symbol: 'P',  name: 'Quadrillion',    exp: '1e15' },
    { value: 10n ** 12n, symbol: 'T',  name: 'Trillion',       exp: '1e12' },
    { value: 10n ** 9n,  symbol: 'B',  name: 'Billion',        exp: '1e9'  },
    { value: 10n ** 6n,  symbol: 'M',  name: 'Million',        exp: '1e6'  },
    { value: 10n ** 3n,  symbol: 'K',  name: 'Thousand',       exp: '1e3'  }
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
            if (!parsed._config) {
                parsed._config = { prisonDurationMs: 5 * 60 * 1000 }; // Default: 5 minutes
            }
            for (const id in parsed) {
                if (id === '_config') continue;
                if (parsed[id].balance !== undefined) {
                    parsed[id].balance = clampBalance(BigInt(parsed[id].balance));
                }
            }
            return parsed;
        }
    } catch (e) {}
    return { _config: { prisonDurationMs: 5 * 60 * 1000 } };
}

function saveCredits(data) {
    const serialized = JSON.stringify(data, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value, 2);
    fs.writeFileSync(creditsFilePath, serialized, 'utf8');
}

function ensureUser(db, userId) {
    if (!db[userId]) {
        db[userId] = { balance: DEFAULT_BALANCE, lastDaily: null, jailUntil: 0, lastSteal: 0 };
        saveCredits(db);
    }
    return db[userId];
}

function isInPrison(userEntry) {
    if (!userEntry || !userEntry.jailUntil) return false;
    return Date.now() < userEntry.jailUntil;
}

module.exports = {
    CREDIT,
    MAX_CREDIT_CAP,
    clampBalance,
    formatNumber,
    isInPrison,
    data: new SlashCommandBuilder()
        .setName('credits')
        .setDescription('Manage your wallet, claim daily rewards, send credits, steal, bail, or admin tools!')
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
            sub.setName('steal')
               .setDescription('Attempt a risky heist to steal credits from a target (24h cooldown)')
               .addUserOption(opt => opt.setName('target').setDescription('User to steal from').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('bail')
               .setDescription('Bail a user out of prison for a random fine (1k - 5k credits)')
               .addUserOption(opt => opt.setName('target').setDescription('User to bail out').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('leaderboard')
               .setDescription('View top credit holders across the system')
        )
        .addSubcommand(sub =>
            sub.setName('units')
               .setDescription('Display credit unit suffixes and notation scale')
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
        )
        .addSubcommand(sub =>
            sub.setName('prison_time')
               .setDescription('[ADMIN] Set the prison duration on failed steal (0 = no prison)')
               .addIntegerOption(opt => opt.setName('duration').setDescription('Amount of time (0 to disable)').setRequired(true))
               .addStringOption(opt => opt.setName('unit')
                   .setDescription('Time unit')
                   .setRequired(true)
                   .addChoices(
                       { name: 'Minutes', value: 'm' },
                       { name: 'Seconds', value: 's' }
                   ))
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const user = interaction.user;
        const db = loadCredits();

        const userData = ensureUser(db, user.id);

        // Prison Lockdown Enforcement
        if (isInPrison(userData) && subcommand !== 'bail') {
            const remainingMs = userData.jailUntil - Date.now();
            const minutes = Math.floor(remainingMs / (1000 * 60));
            const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);
            return await interaction.reply({
                content: `🚨 **PRISON LOCKDOWN!** You were caught attempting theft! You cannot perform economic actions for **${minutes}m ${seconds}s**.`,
                ephemeral: true
            });
        }

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
            const lastDaily = userData.lastDaily || 0;

            if (NOW - lastDaily < COOLDOWN) {
                const remainingMs = COOLDOWN - (NOW - lastDaily);
                const hours = Math.floor(remainingMs / (1000 * 60 * 60));
                const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
                return await interaction.reply({
                    content: `<:puronervous:1536367581995335750> You already claimed your daily payout! Try again in **${hours}h ${minutes}m**.`,
                    ephemeral: true
                });
            }

            userData.balance = clampBalance(userData.balance + DAILY_REWARD);
            userData.lastDaily = NOW;
            saveCredits(db);

            return await interaction.reply({
                content: `<:Puro_Blush6:1536430029104353380> You claimed your daily reward of **+${formatNumber(DAILY_REWARD)}**${CREDIT}!\nNew Balance: **${formatNumber(userData.balance)}** ${CREDIT}`,
                ephemeral: true
            });
        }

        // 3. Steal
        if (subcommand === 'steal') {
            const target = interaction.options.getUser('target');
            const NOW = Date.now();
            const STEAL_COOLDOWN = 24 * 60 * 60 * 1000;
            const PRISON_DURATION = db._config?.prisonDurationMs ?? (5 * 60 * 1000);
            const SUCCESS_CHANCE = 0.08;

            if (target.id === user.id) {
                return await interaction.reply({
                    content: `<:Puroadorable:1536364133392457818> You can't steal from yourself!`,
                    ephemeral: true
                });
            }
            if (target.bot) {
                return await interaction.reply({
                    content: `<:puronervous:1536367581995335750> You can't steal from bots!`,
                    ephemeral: true
                });
            }

            const targetData = ensureUser(db, target.id);
            const lastSteal = userData.lastSteal || 0;

            if (NOW - lastSteal < STEAL_COOLDOWN) {
                const remainingMs = STEAL_COOLDOWN - (NOW - lastSteal);
                const hours = Math.floor(remainingMs / (1000 * 60 * 60));
                const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
                return await interaction.reply({
                    content: `<:puronervous:1536367581995335750> High security alert! You can attempt another theft in **${hours}h ${minutes}m**.`,
                    ephemeral: true
                });
            }

            if (targetData.balance <= 0n) {
                return await interaction.reply({
                    content: `<:puronervous2:1538551211207430234> **<@${target.id}>** has no credits to steal!`,
                    ephemeral: true
                });
            }

            userData.lastSteal = NOW;

            if (Math.random() < SUCCESS_CHANCE) {
                const percentToSteal = BigInt(Math.floor(Math.random() * 11) + 5);
                const stolenAmount = (targetData.balance * percentToSteal) / 100n || 1n;

                userData.balance = clampBalance(userData.balance + stolenAmount);
                targetData.balance = clampBalance(targetData.balance - stolenAmount);
                saveCredits(db);

                return await interaction.reply({
                    content: `🥷 **HEIST SUCCESSFUL!** <@${user.id}> sneaked past security and stole **${formatNumber(stolenAmount)}** ${CREDIT} from <@${target.id}>!`
                });
            } else {
                if (PRISON_DURATION > 0) {
                    userData.jailUntil = NOW + PRISON_DURATION;
                    saveCredits(db);

                    const prisonMin = Math.floor(PRISON_DURATION / (1000 * 60));
                    const prisonSec = Math.floor((PRISON_DURATION % (1000 * 60)) / 1000);
                    const timeStr = prisonMin > 0 ? `${prisonMin} minutes` : `${prisonSec} seconds`;

                    return await interaction.reply({
                        content: `🚨 **HEIST FAILED!** <@${user.id}> was caught trying to steal from <@${target.id}>! You have been sent to **PRISON** 🚔 for **${timeStr}** and cannot gamble, fish, or steal!`
                    });
                } else {
                    saveCredits(db);
                    return await interaction.reply({
                        content: `🚨 **HEIST FAILED!** <@${user.id}> was caught trying to steal from <@${target.id}>! Luckily, the prison system is disabled right now so you escaped!`
                    });
                }
            }
        }

        // 4. Bail
        if (subcommand === 'bail') {
            const target = interaction.options.getUser('target');

            if (target.id === user.id) {
                return await interaction.reply({
                    content: `<:puronervous2:1538551211207430234> You can't bail yourself out! Someone else must pay your bail.`,
                    ephemeral: true
                });
            }

            if (target.bot) {
                return await interaction.reply({
                    content: `<:puronervous:1536367581995335750> Bots can't be put in prison!`,
                    ephemeral: true
                });
            }

            const targetData = ensureUser(db, target.id);

            if (!isInPrison(targetData)) {
                return await interaction.reply({
                    content: `<:Puroadorable:1536364133392457818> **<@${target.id}>** is not currently in prison!`,
                    ephemeral: true
                });
            }

            const minBail = 1000n;
            const randomMultiplier = BigInt(Math.floor(Math.random() * 4001));
            const bailCost = minBail + randomMultiplier;

            if (userData.balance < bailCost) {
                return await interaction.reply({
                    content: `<:puronervous2:1538551211207430234> The judge set the bail fee to **${formatNumber(bailCost)}** ${CREDIT}, but you only have **${formatNumber(userData.balance)}** ${CREDIT}!`,
                    ephemeral: true
                });
            }

            userData.balance = clampBalance(userData.balance - bailCost);
            targetData.jailUntil = 0;
            saveCredits(db);

            return await interaction.reply({
                content: `🔓 **BAIL POSTED!** <@${user.id}> paid **${formatNumber(bailCost)}** ${CREDIT} to bail <@${target.id}> out of prison! <@${target.id}> is now free to gamble, fish, and steal again.`
            });
        }

        // 5. Units Scale
        if (subcommand === 'units') {
            const half = Math.ceil(units.length / 2);
            
            const col1 = units.slice(0, half)
                .map(u => `\`${u.symbol.padEnd(2)}\` ➔ **${u.name}** (\`${u.exp}\`)`)
                .join('\n');
                
            const col2 = units.slice(half)
                .map(u => `\`${u.symbol.padEnd(2)}\` ➔ **${u.name}** (\`${u.exp}\`)`)
                .join('\n');

            const embed = new EmbedBuilder()
                .setTitle('⚙️ Economy Units Scale')
                .setColor('#FFD700')
                .setDescription('Reference key for currency suffix symbols and exponential scales:')
                .addFields(
                    { name: 'Higher Scale', value: col1, inline: true },
                    { name: 'Lower Scale', value: col2, inline: true }
                )
                .setFooter({ text: 'ProtoBot Economy System' });

            return await interaction.reply({ embeds: [embed] });
        }

        // 6. Leaderboard
        if (subcommand === 'leaderboard') {
            const sorted = Object.entries(db)
                .filter(([id]) => id !== '_config')
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
                        text: `Page ${page + 1}/${totalPages} | Your Rank: ${userRankText} | Balance: ${formatNumber(userData.balance)}` 
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

        // 7. Pay
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
            if (userData.balance < amount) {
                return await interaction.reply({
                    content: `<:puronervous2:1538551211207430234> Insufficient funds! You only have **${formatNumber(userData.balance)}**${CREDIT}`,
                    ephemeral: true
                });
            }

            const targetData = ensureUser(db, target.id);

            userData.balance = clampBalance(userData.balance - amount);
            targetData.balance = clampBalance(targetData.balance + amount);
            saveCredits(db);

            return await interaction.reply({
                content: `<:Puro_Blush6:1536430029104353380> **<@${user.id}>** transferred **${formatNumber(amount)}**${CREDIT} to **<@${target.id}>**!`
            });
        }

        // Admin Subcommands
        const adminSubcommands = ['add', 'remove', 'set', 'prison_time'];
        if (adminSubcommands.includes(subcommand)) {
            const ownerId = botConfig.OWNER_ID || botConfig.ownerId;
            if (user.id !== ownerId) {
                return await interaction.reply({
                    content: `<:puronervous2:1538551211207430234> Access Denied! Only the bot owner can use admin commands.`,
                    ephemeral: true
                });
            }

            if (subcommand === 'prison_time') {
                const duration = interaction.options.getInteger('duration');
                const unit = interaction.options.getString('unit');

                if (duration < 0) {
                    return await interaction.reply({
                        content: `<:puronervous2:1538551211207430234> Duration cannot be negative!`,
                        ephemeral: true
                    });
                }

                if (duration === 0) {
                    db._config.prisonDurationMs = 0;
                    saveCredits(db);
                    return await interaction.reply({
                        content: `⚙️ **[ADMIN]** Prison lockdown has been **disabled** (0 duration set). Failed steals will no longer lock users out.`,
                        ephemeral: true
                    });
                }

                const multiplier = unit === 'm' ? 60 * 1000 : 1000;
                const durationMs = duration * multiplier;

                db._config.prisonDurationMs = durationMs;
                saveCredits(db);

                const label = unit === 'm' ? 'minutes' : 'seconds';
                return await interaction.reply({
                    content: `⚙️ **[ADMIN]** Prison duration for failed steals has been set to **${duration} ${label}**!`,
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

            const targetData = ensureUser(db, target.id);

            if (subcommand === 'add') {
                targetData.balance = clampBalance(targetData.balance + amount);
                saveCredits(db);
                return await interaction.reply({
                    content: `⚙️ **[ADMIN]** Added **+${formatNumber(amount)}** ${CREDIT} to **<@${target.id}>**!\nNew Balance: **${formatNumber(targetData.balance)}**${CREDIT}`,
                    ephemeral: true
                });
            }

            if (subcommand === 'remove') {
                targetData.balance = clampBalance(targetData.balance - amount);
                saveCredits(db);
                return await interaction.reply({
                    content: `⚙️ **[ADMIN]** Removed **-${formatNumber(amount)}** ${CREDIT} from **<@${target.id}>**!\nNew Balance: **${formatNumber(targetData.balance)}**${CREDIT}`,
                    ephemeral: true
                });
            }

            if (subcommand === 'set') {
                targetData.balance = clampBalance(amount);
                saveCredits(db);
                return await interaction.reply({
                    content: `⚙️ **[ADMIN]** Set **<@${target.id}>**'s balance to **${formatNumber(targetData.balance)}**${CREDIT}!`,
                    ephemeral: true
                });
            }
        }
    }
};
