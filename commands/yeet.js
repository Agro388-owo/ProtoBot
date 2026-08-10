const { SlashCommandBuilder } = require('discord.js');

function getRandomMessage(array) {
    return array[Math.floor(Math.random() * array.length)];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('yeet')
        .setDescription('Launch someone into low Earth orbit!')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .addUserOption(option => 
            option.setName('target')
                  .setDescription('Who are you yeeting?')
                  .setRequired(true)
        ),

    async execute(interaction, senderName, recipientName) {
        const targetUser = interaction.options.getUser('target');

        // Self-Yeet Glitch Logic
        if (interaction.user.id === targetUser.id) {
            const selfVariants = [
                `${senderName} somehow yeeted themselves?!`
            ];
            return getRandomMessage(selfVariants);
        }

        // Far-Away Yeet Variants
        const yeetVariants = [
            `${senderName} grabbed ${recipientName} by the collar and yeeted them straight into the horizon!`,
            `${senderName} wound up like a pitch pitcher and yeeted ${recipientName} across three different time zones!`,
            `${senderName} yeeted ${recipientName}.`
        ];

        return getRandomMessage(yeetVariants);
    }
};
