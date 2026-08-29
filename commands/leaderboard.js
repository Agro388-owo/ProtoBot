const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

const { CREDIT, formatNumber, clampBalance } = require('./credits.js');

const GLOBAL_CREDIT = '۞';
const creditsFilePath = path.resolve(process.cwd(), 'credits.json');
const globalCreditsFilePath = path.resolve(process.cwd(), 'global_credits.json');

function loadCreditsDB() {
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
    } catch (e) {
        console.error('Failed to load credits.json in leaderboard:', e);
    }
    return {};
}

function loadGlobalCreditsDB() {
    try {
        if (fs.existsSync(globalCreditsFilePath)) {
            const raw = fs.readFileSync(globalCreditsFilePath, 'utf8') || '{}';
            const parsed = JSON.parse(raw);
            for (const id in parsed) {
                if (parsed[id].balance !== undefined) {
                    parsed[id].balance = clampBalance(BigInt(parsed[id].balance));
                }
            }
            return parsed;
        }
    } catch (e) {
        console.error('Failed to load global_credits.json in leaderboard:', e);
    }
    return {};
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View local server or global credit rankings!')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .addSubcommand(sub =>
            sub.setName('server')
               .setDescription('View top credit holders in the current server')
        )
        .addSubcommand(sub =>
            sub.setName('global')
               .setDescription('View top 10 global credit holders across all users')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand(false) || 'server';
        const user = interaction.user;
        const creditsDB = loadCreditsDB();
        const globalCreditsDB = loadGlobalCreditsDB();

        // Combined data view — explicitly defaults to 0n if unregistered in global_credits.json
        const allUserIds = Array.from(new Set([...Object.keys(creditsDB), ...Object.keys(globalCreditsDB)]));
        const combinedData = allUserIds.map(id => ({
            id,
            localBalance: creditsDB[id]?.balance ?? 0n,
            globalBalance: (globalCreditsDB[id] && globalCreditsDB[id].balance !== undefined) 
                ? globalCreditsDB[id].balance 
                : 0n
        }));

        if (combinedData.length === 0) {
            return await interaction.reply({
                content: '🏆 No credit entries registered in the database yet.',
                flags: MessageFlags.Ephemeral
            });
        }

        const userLocal = creditsDB[user.id]?.balance ?? 0n;
        const userGlobal = (globalCreditsDB[user.id] && globalCreditsDB[user.id].balance !== undefined) 
            ? globalCreditsDB[user.id].balance 
            : 0n;

        // Formats users using mentions + cached username fallback for mobile compatibility
        const formatUserDisplay = async (userId) => {
            try {
                const fetchedUser = await interaction.client.users.fetch(userId);
                return `${fetchedUser} (${fetchedUser.username})`;
            } catch {
                return `<@${userId}>`;
            }
        };

        // ==========================================
        // 1. GLOBAL LEADERBOARD (Ranked by Global Credits)
        // ==========================================
        if (subcommand === 'global') {
            await interaction.deferReply();

            const sortedGlobal = [...combinedData].sort((a, b) => 
                (b.globalBalance > a.globalBalance ? 1 : b.globalBalance < a.globalBalance ? -1 : 0)
            );

            const top10 = sortedGlobal.slice(0, 10);
            const medalIcons = ['🥇', '🥈', '🥉'];

            const userRankIndex = sortedGlobal.findIndex(e => e.id === user.id);
            const userRankText = userRankIndex !== -1 ? `#${userRankIndex + 1}` : 'Unranked';

            const lines = await Promise.all(top10.map(async (entry, index) => {
                const rankDisplay = medalIcons[index] || `**#${index + 1}**`;
                const userDisplay = await formatUserDisplay(entry.id);
                return `${rankDisplay} ${userDisplay} — **${formatNumber(entry.globalBalance)}** ${GLOBAL_CREDIT} *(${formatNumber(entry.localBalance)} ${CREDIT})*`;
            }));

            const globalEmbed = new EmbedBuilder()
                .setTitle('🌐 Global Credit Leaderboard (Top 10)')
                .setColor('#00FFC8')
                .setDescription(lines.join('\n') || 'No global rankings available.')
                .setFooter({
                    text: `Your Global Rank: ${userRankText} | Global: ${formatNumber(userGlobal)} ${GLOBAL_CREDIT} | Local: ${formatNumber(userLocal)} ${CREDIT}`
                });

            return await interaction.editReply({ embeds: [globalEmbed] });
        }

        // ==========================================
        // 2. SERVER LEADERBOARD (Ranked by Local Credits)
        // ==========================================
        if (subcommand === 'server') {
            await interaction.deferReply();

            const sortedLocal = [...combinedData].sort((a, b) => 
                (b.localBalance > a.localBalance ? 1 : b.localBalance < a.localBalance ? -1 : 0)
            );

            let serverSorted = sortedLocal;

            if (interaction.guild) {
                try {
                    await interaction.guild.members.fetch();
                    serverSorted = sortedLocal.filter(entry => interaction.guild.members.cache.has(entry.id));
                } catch (e) {
                    serverSorted = sortedLocal.filter(entry => interaction.guild.members.cache.has(entry.id));
                }
            }

            if (serverSorted.length === 0) {
                return await interaction.editReply({
                    content: '🏆 No credit entries found for members in this server.'
                });
            }

            const pageSize = 10;
            const totalPages = Math.ceil(serverSorted.length / pageSize);
            let currentPage = 0;

            const userRankIndex = serverSorted.findIndex(e => e.id === user.id);
            const userRankText = userRankIndex !== -1 ? `#${userRankIndex + 1}` : 'Unranked';

            const generateEmbed = async (page) => {
                const start = page * pageSize;
                const pageEntries = serverSorted.slice(start, start + pageSize);
                const medalIcons = ['🥇', '🥈', '🥉'];

                const lines = await Promise.all(pageEntries.map(async (entry, index) => {
                    const rank = start + index;
                    const rankDisplay = medalIcons[rank] || `**#${rank + 1}**`;
                    const userDisplay = await formatUserDisplay(entry.id);
                    return `${rankDisplay} ${userDisplay} — **${formatNumber(entry.localBalance)}** ${CREDIT} | **${formatNumber(entry.globalBalance)}** ${GLOBAL_CREDIT}`;
                }));

                return new EmbedBuilder()
                    .setTitle(`🏆 ${interaction.guild ? interaction.guild.name : 'Server'} Credit Leaderboard`)
                    .setDescription(lines.join('\n'))
                    .setColor('#FFD700')
                    .setFooter({
                        text: `Page ${page + 1}/${totalPages} | Your Rank: ${userRankText} | Local: ${formatNumber(userLocal)} ${CREDIT} | Global: ${formatNumber(userGlobal)} ${GLOBAL_CREDIT}`
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
                const singleEmbed = await generateEmbed(0);
                return await interaction.editReply({ embeds: [singleEmbed] });
            }

            const initialEmbed = await generateEmbed(currentPage);
            const response = await interaction.editReply({
                embeds: [initialEmbed],
                components: [getButtons(currentPage)]
            });

            const collector = response.createMessageComponentCollector({
                filter: i => i.user.id === interaction.user.id,
                time: 60000
            });

            collector.on('collect', async i => {
                if (i.customId === 'lb_prev') currentPage = Math.max(0, currentPage - 1);
                if (i.customId === 'lb_next') currentPage = Math.min(totalPages - 1, currentPage + 1);

                const updatedEmbed = await generateEmbed(currentPage);
                await i.update({
                    embeds: [updatedEmbed],
                    components: [getButtons(currentPage)]
                });
            });

            collector.on('end', async () => {
                const disabledButtons = getButtons(currentPage);
                disabledButtons.components.forEach(btn => btn.setDisabled(true));
                await interaction.editReply({ components: [disabledButtons] }).catch(() => {});
            });
        }
    }
};
