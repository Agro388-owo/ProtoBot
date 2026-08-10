const { SlashCommandBuilder } = require('discord.js');

function getRandomMessage(array) {
    return array[Math.floor(Math.random() * array.length)];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bap')
        .setDescription('Playfully bap someone on the head!')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .addUserOption(option => option.setName('target').setDescription('Who do you want to bap?').setRequired(true)),

    async execute(interaction, senderName, recipientName) {
        const targetUser = interaction.options.getUser('target');

        if (interaction.user.id === targetUser.id) {
            const selfVariants = [
                `${senderName} bapped themselves on the forehead! *Ouch!*`,
                `${senderName} hit themselves with a rolled-up newspaper out of pure confusion!`,
                `${senderName} bapped their own head! Self-inflicted boop!`
            ];
            return getRandomMessage(selfVariants);
        }

        const bapVariants = [
            `**${senderName}** baps **${recipientName}** on the head with a rolled-up newspaper!`,
            `**${senderName}** swiftly baps **${recipientName}** across the snout with a baguette!`,
            `**${senderName}** reaches out and gives **${recipientName}** a quick *BAP* on the forehead!`,
            `*BOOP!* **${senderName}** lightly bapped **${recipientName}**. No thoughts, empty head.`,
            `**${senderName}** hits **${recipientName}** with a squeaky toy bap! *SQUEAK!*`
        ];
        return getRandomMessage(bapVariants);
    }
};
