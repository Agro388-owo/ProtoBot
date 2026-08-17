const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('meow')
        .setDescription('Meow at someone or just meow in general!')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .addUserOption(option =>
            option.setName('target')
                  .setDescription('Who to meow at')
                  .setRequired(false)),

    async execute(interaction, senderName, recipientName) {
        const targetUser = interaction.options.getUser('target');

        const meowMessages = [
            `Meow! <:purocute:1536367584369180803>`,
            `Nyaa~ <:puroadorable:1536364133392457818>`,
            `*Soft meows* <:puroblush:1536364136613806090>`,
            `Mrrp? <:MingCat:1538665942945366016>`
        ];

        const randomMeow = meowMessages[Math.floor(Math.random() * meowMessages.length)];

        if (!targetUser || recipientName === 'themselves') {
            return `${senderName} says: ${randomMeow}`;
        }

        return `${senderName} meows at ${recipientName}! ${randomMeow}`;
    }
};
