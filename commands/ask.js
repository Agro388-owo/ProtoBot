const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ask')
        .setDescription('Ask ProtoBot a question!')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .addStringOption(option =>
            option.setName('question')
                  .setDescription('The question you want to ask')
                  .setRequired(true)
        ),

    async execute(interaction, senderName) {
        const question = interaction.options.getString('question');

        // Example: Simple automated response or custom logic
        // You can also integrate an AI API here later if you want smart answers!
        return `${senderName} asked: "${question}"\n\nI'm just a simple bot right now, but I'm doing my best to learn! <:purocute:1536367584369180803>`;
    }
};
