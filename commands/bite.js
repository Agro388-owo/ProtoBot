const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bite')
        .setDescription('Agressively chomp down on someone!')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .addUserOption(option =>
            option.setName('target')
                  .setDescription('Who to bite')
                  .setRequired(true)),

    async execute(interaction, senderName, recipientName) {
        const targetUser = interaction.options.getUser('target');

        if (targetUser.id === interaction.user.id || recipientName === 'themselves') {
            return `${senderName} agressively bit their own tail! <:puroshock:1536366927230799972>`;
        }

        const biteMessages = [
            `${senderName} ferociously sinks their teeth into ${recipientName}! <:InsaneCat:1538666024251953152>`,
            `${senderName} HARD-CHOMPS ${recipientName} without warning! <:puronervous2:1538551211207430234>`,
            `${senderName} agressively tackles and bites ${recipientName}! <:puro_sad:1536430025635799061>`
        ];

        return biteMessages[Math.floor(Math.random() * biteMessages.length)];
    }
};
