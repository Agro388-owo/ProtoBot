const { SlashCommandBuilder } = require('discord.js');

function getRandomMessage(array) {
    return array[Math.floor(Math.random() * array.length)];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('trip')
        .setDescription('Trip someone right onto the floor!')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .addUserOption(option => 
            option.setName('target')
                  .setDescription('Who is tripping?')
                  .setRequired(true)
        ),

    async execute(interaction, senderName, recipientName) {
        const targetUser = interaction.options.getUser('target');

        if (interaction.user.id === targetUser.id) {
            const selfVariants = [
                `${senderName} managed to trip over nothing and started spinning out of control! <:puro_spin:1536429933562175648>`,
                `${senderName} tripped themselves up and tumbled through space! <:Puropreocupado:1536430030916288572>`
            ];
            return getRandomMessage(selfVariants);
        }

        const tripVariants = [
            `${senderName} tripped ${recipientName} right onto the floor! <:puro_spin:1536429933562175648>`,
            `${senderName} sent ${recipientName} tumbling through space! <:Puropreocupado:1536430030916288572>`
        ];

        return getRandomMessage(tripVariants);
    }
};
