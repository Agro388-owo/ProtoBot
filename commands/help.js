const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const botConfig = require('../config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Displays all available ProtoBot features with interactive pages')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .addIntegerOption(option =>
            option.setName('index')
                .setDescription('Optional: Enter a command index number to lookup details')
                .setRequired(false)),

    async execute(interaction) {
        const indexInput = interaction.options.getInteger('index');
        const commandsCollection = interaction.client.commands;

        if (!commandsCollection || commandsCollection.size === 0) {
            await interaction.reply({ content: '⚠️ No registered commands found in memory!', flags: 64 });
            return null;
        }

        const helpItems = Array.from(commandsCollection.values()).map(cmd => ({
            name: `/${cmd.data.name}`,
            description: cmd.data.description || 'No description provided.'
        }));

        // Lookup specific command by index if requested
        if (indexInput !== null) {
            const itemIndex = indexInput - 1;
            if (itemIndex >= 0 && itemIndex < helpItems.length) {
                const targetCommand = helpItems[itemIndex];
                let debugExtra = botConfig.debugMode ? `\n⚙️ *[Debug Diagnostic]*: Command object loaded successfully.` : '';
                await interaction.reply({
                    content: `📖 **Command Index #${indexInput}:**\n🔹 **Name:** ${targetCommand.name}\n📝 **Description:** ${targetCommand.description}${debugExtra}`,
                    flags: 64
                });
                return null;
            } else {
                await interaction.reply({
                    content: `❌ Invalid index number! Choose a number between 1 and ${helpItems.length}.`,
                    flags: 64
                });
                return null;
            }
        }

        // Pagination setup (5 commands per page)
        const ITEMS_PER_PAGE = 5;
        const totalPages = Math.ceil(helpItems.length / ITEMS_PER_PAGE);
        let currentPage = 0;

        const generateEmbed = (page) => {
            const start = page * ITEMS_PER_PAGE;
            const end = start + ITEMS_PER_PAGE;
            const currentItems = helpItems.slice(start, end);

            const embed = new EmbedBuilder()
                .setTitle('🤖 ProtoBot Command Directory')
                .setColor(0x5865F2)
                .setFooter({ text: `Page ${page + 1} of ${totalPages} • Total Commands: ${helpItems.length}` })
                .setTimestamp();

            currentItems.forEach((item, idx) => {
                embed.addFields({
                    name: `${start + idx + 1}. ${item.name}`,
                    value: item.description,
                    inline: false
                });
            });

            return embed;
        };

        const generateComponents = (page) => {
            // Dropdown menu for page selection
            const selectOptions = helpItems.map((item, idx) => ({
                label: `${idx + 1}. ${item.name}`,
                description: item.description.slice(0, 50),
                value: idx.toString()
            })).slice(page * ITEMS_PER_PAGE, (page * ITEMS_PER_PAGE) + ITEMS_PER_PAGE);

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('help_select')
                .setPlaceholder('Select a command for details...')
                .addOptions(selectOptions);

            const prevButton = new ButtonBuilder()
                .setCustomId('help_prev')
                .setLabel('◀️ Previous')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page === 0);

            const nextButton = new ButtonBuilder()
                .setCustomId('help_next')
                .setLabel('Next ▶️')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page === totalPages - 1);

            const row1 = new ActionRowBuilder().addComponents(selectMenu);
            const row2 = new ActionRowBuilder().addComponents(prevButton, nextButton);

            return [row1, row2];
        };

        const response = await interaction.reply({
            embeds: [generateEmbed(currentPage)],
            components: generateComponents(currentPage),
            withResponse: true
        });

        const replyMessage = response.resource ? response.resource.message : response;

        // Interactive Component Collector (active for 2 minutes)
        const collector = replyMessage.createMessageComponentCollector({ time: 120000 });

        collector.on('collect', async (i) => {
            if (i.user.id !== interaction.user.id) {
                await i.reply({ content: '❌ You cannot control this help menu.', flags: 64 });
                return;
            }

            if (i.customId === 'help_prev') {
                currentPage = Math.max(0, currentPage - 1);
                await i.update({
                    embeds: [generateEmbed(currentPage)],
                    components: generateComponents(currentPage)
                });
            } else if (i.customId === 'help_next') {
                currentPage = Math.min(totalPages - 1, currentPage + 1);
                await i.update({
                    embeds: [generateEmbed(currentPage)],
                    components: generateComponents(currentPage)
                });
            } else if (i.customId === 'help_select') {
                const selectedIndex = parseInt(i.values[0], 10);
                const target = helpItems[selectedIndex];
                await i.reply({
                    content: `📖 **Command Lookup:**\n🔹 **Name:** ${target.name}\n📝 **Description:** ${target.description}`,
                    flags: 64
                });
            }
        });

        collector.on('end', async () => {
            try {
                await replyMessage.edit({ components: [] });
            } catch (e) {}
        });

        return null;
    }
};
