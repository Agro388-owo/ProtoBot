const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

const { CREDIT, formatNumber, clampBalance } = require('./credits.js');

const creditsFilePath = path.resolve(process.cwd(), 'credits.json');

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
    } catch (e) {
        console.error('Failed to load credits.json in leaderboard:', e);
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
               .setDescription('View top 10 credit holders globally across all users')
        ),

    async execute(interaction) {
        // Fallback to 'server' if executed without an explicit subcommand
        const subcommand = interaction.options.getSubcommand(false) || 'server';
        const user = interaction.user;
        const db = loadCredits();

        // Sort all registered users globally by balance descending
        const allSorted = Object.entries(db)
            .map(([id, data]) => ({ id, balance: data.balance ?? 0n }))
            .sort((a, b) => (b.balance > a.balance ? 1 : b.balance < a.balance ? -1 : 0));

        if (allSorted.length === 0) {
            return await interaction.reply({
                content: '🏆 No credit entries registered in the database yet.',
                flags: MessageFlags.Ephemeral
            });
        }

        // ==========================================
        // 1. GLOBAL LEADERBOARD (Top 10 Across All Users)
        // ==========================================
        if (subcommand === 'global') {
            const top10 = allSorted.slice(0, 10);
            const medalIcons = ['🥇', '🥈', '🥉'];

            const globalUserRankIndex = allSorted.findIndex(e => e.id === user.id);
            const globalRankText = globalUserRankIndex !== -1 ? `#${globalUserRankIndex + 1}` : 'Unranked';
            const userBalance = db[user.id]?.balance ?? 0n;

            const lines = top10.map((entry, index) => {
                const rankDisplay = medalIcons[index] || `**#${index + 1}**`;
                return `${rankDisplay} <@${entry.id}> — **${formatNumber(entry.balance)}** ${CREDIT}`;
            });

            const globalEmbed = new EmbedBuilder()
                .setTitle('🌐 Global Credit Leaderboard (Top 10)')
                .setColor('#00FFC8')
                .setDescription(lines.join('\n') || 'No global rankings available.')
                .setFooter({
                    text: `Your Global Rank: ${globalRankText} | Balance: ${formatNumber(userBalance)}`
                });

            return await interaction.reply({ embeds: [globalEmbed] });
        }

        // ==========================================
        // 2. SERVER LEADERBOARD (Default / Guild Members)
        // ==========================================
        if (subcommand === 'server') {
            let serverSorted = allSorted;

            // Filter entries to guild members if executed inside a server
            if (interaction.guild) {
                try {
                    await interaction.guild.members.fetch();
                    serverSorted = allSorted.filter(entry => interaction.guild.members.cache.has(entry.id));
                } catch (e) {
                    // Fallback to cache if member fetch fails
                    serverSorted = allSorted.filter(entry => interaction.guild.members.cache.has(entry.id));
                }
            }

            if (serverSorted.length === 0) {
                return await interaction.reply({
                    content: '🏆 No credit entries found for members in this server.',
                    flags: MessageFlags.Ephemeral
                });
            }

            const pageSize = 10;
            const totalPages = Math.ceil(serverSorted.length / pageSize);
            let currentPage = 0;

            const userRankIndex = serverSorted.findIndex(e => e.id === user.id);
            const userRankText = userRankIndex !== -1 ? `#${userRankIndex + 1}` : 'Unranked';
            const userBalance = db[user.id]?.balance ?? 0n;

            const generateEmbed = (page) => {
                const start = page * pageSize;
                const pageEntries = serverSorted.slice(start, start + pageSize);
                const medalIcons = ['🥇', '🥈', '🥉'];

                const lines = pageEntries.map((entry, index) => {
                    const rank = start + index;
                    const rankDisplay = medalIcons[rank] || `**#${rank + 1}**`;
                    return `${rankDisplay} <@${entry.id}> — **${formatNumber(entry.balance)}** ${CREDIT}`;
                });

                return new EmbedBuilder()
                    .setTitle(`🏆 ${interaction.guild ? interaction.guild.name : 'Server'} Credit Leaderboard`)
                    .setDescription(lines.join('\n'))
                    .setColor('#FFD700')
                    .setFooter({
                        text: `Page ${page + 1}/${totalPages} | Your Rank: ${userRankText} | Balance: ${formatNumber(userBalance)}`
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
        }
    }
};
