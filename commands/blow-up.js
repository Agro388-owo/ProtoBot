const { SlashCommandBuilder } = require('discord.js');

function getRandomMessage(array) {
    return array[Math.floor(Math.random() * array.length)];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('blow-up')
        .setDescription('Explode someone into tiny pieces!')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .addUserOption(option => option.setName('target').setDescription('Target to explode').setRequired(true)),

    async execute(interaction, senderName, recipientName) {
        const targetUser = interaction.options.getUser('target');

        if (interaction.user.id === targetUser.id) {
            const selfVariants = [
                `${senderName} held onto the grenade for too long! *BOOM!*`,
                `${senderName} accidentally lit the fuse backwards...`,
                `${senderName} stepped on a landmine!`
            ];
            return getRandomMessage(selfVariants);
        }

        const blowUpVariants = [
            `**${senderName}** threw a bomb at **${recipientName}**! *BOOM!*`,
            `**${senderName}** launched **${recipientName}** directly into the stratosphere! *KABOOM!*`,
            `**${senderName}** lit a fuse right under **${recipientName}**! Disintegrated into dust!`,
            `**${senderName}** pressed the red button... **${recipientName}** instantly blew up into tiny pixels!`,
            `**${senderName}** summoned a tactical strike on **${recipientName}**'s position! Zero remains found.`
        ];
        return getRandomMessage(blowUpVariants);
    }
};
