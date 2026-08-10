const { SlashCommandBuilder } = require('discord.js');

function getRandomMessage(array) {
    return array[Math.floor(Math.random() * array.length)];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kiss')
        .setDescription('Give someone a affectionate kiss!')
        .setIntegrationTypes([0, 1]) // Guild & User App
        .setContexts([0, 1, 2])
        .addUserOption(option => option.setName('target').setDescription('Who are you kissing?').setRequired(true)),

    async execute(interaction, senderName, recipientName) {
        const kissVariants = [
            `💋 ${senderName} leaned in and gave ${recipientName} a sweet kiss!`,
            `😚 ${senderName} pulled ${recipientName} close and planted a soft kiss on their cheek!`,
            `✨ ${senderName} gave ${recipientName} a quick, sudden kiss! *Mwah!*`,
            `💖 ${senderName} showered ${recipientName} with affection and warm kisses!`,
            `😘 ${senderName} blew a big flying kiss across the room directly at ${recipientName}!`
        ];

        return getRandomMessage(kissVariants);
    }
};
