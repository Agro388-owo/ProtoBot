const { SlashCommandBuilder } = require('discord.js');
const botConfig = require('../config.js');

// Registry of all bot commands and features
const helpItems = [
    { name: '/help', description: 'Displays this comprehensive feature index guide.' },
    { name: '/config', description: 'Admin panel to configure bot status, restrictions, and debug modes.' },
    { name: '/kidnap', description: 'Playfully abducts target users with reaction-delete support.' }
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Displays all available ProtoBot features and command lists')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .addIntegerOption(option =>
            option.setName('index')
                .setDescription('Optional: Enter a command index number to lookup details')
                .setRequired(false)),

    async execute(interaction, senderName) {
        const indexInput = interaction.options.getInteger('index');

        // If a specific index number was requested
        if (indexInput !== null) {
            const itemIndex = indexInput - 1; // Convert to 0-based array index
            if (itemIndex >= 0 && itemIndex < helpItems.length) {
                const targetCommand = helpItems[itemIndex];
                let debugExtra = botConfig.debugMode ? `\n⚙️ *[Debug Diagnostic]*: Command object loaded successfully from memory registry.` : '';
                return `📖 **Command Index #${indexInput}:**\n` +
                       `🔹 **Name:** ${targetCommand.name}\n` +
                       `📝 **Description:** ${targetCommand.description}${debugExtra}`;
            } else {
                return `❌ Invalid index number! Please choose a number between 1 and ${helpItems.length}.`;
            }
        }

        // Otherwise, list all available features
        let listText = '🤖 **ProtoBot Feature & Command Directory:**\n';
        helpItems.forEach((item, idx) => {
            listText += `**${idx + 1}.** \`${item.name}\` — ${item.description}\n`;
        });

        if (botConfig.debugMode) {
            listText += `\n🛠️ **[Debug Diagnostics Active]:** Type \`/help index:<number>\` to query specific command components.`;
        }

        return listText;
    }
};
