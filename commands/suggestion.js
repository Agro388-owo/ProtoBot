const { SlashCommandBuilder } = require('discord.js');
const botConfig = require('../config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('suggest')
        .setDescription('Submit a suggestion for ProtoBot!')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .addStringOption(option =>
            option.setName('idea')
                  .setDescription('Describe your suggestion or feature idea')
                  .setRequired(true)
        ),

    async execute(interaction, senderName) {
        const suggestionText = interaction.options.getString('idea');
        const ownerId = botConfig.OWNER_ID;

        // Try to DM the owner with the suggestion
        try {
            const owner = await interaction.client.users.fetch(ownerId);
            if (owner) {
                await owner.send(`📥 **New Suggestion from ${senderName}** (${interaction.user.tag}):\n> ${suggestionText}`);
            }
        } catch (error) {
            console.error('Failed to send suggestion DM to owner:', error);
        }

        return `✅ Thank you, ${senderName}! Your suggestion has been successfully sent to the developer. <:purocute:1536367584369180803>`;
    }
};
