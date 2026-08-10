const { SlashCommandBuilder } = require('discord.js');

function getRandomMessage(array) {
    return array[Math.floor(Math.random() * array.length)];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pet')
        .setDescription('Give someone headpats!')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .addUserOption(option => option.setName('target').setDescription('Who gets pats?').setRequired(true)),

    async execute(interaction, senderName, recipientName) {
        const petVariants = [
            `🫳 **${senderName}** gently pats **${recipientName}** on the head. Good job!`,
            `✨ **${senderName}** gives **${recipientName}** soft and cozy headpats!`,
            `😸 **${senderName}** aggressively pets **${recipientName}**! *Pat pat pat pat!*`,
            `💖 **${senderName}** places a hand on **${recipientName}**'s head and pets them carefully.`,
            `👑 **${senderName}** adjusts **${recipientName}**'s hair and gives them gentle pats.`
        ];
        return getRandomMessage(petVariants);
    }
};
