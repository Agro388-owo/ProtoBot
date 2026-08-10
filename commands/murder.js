const { SlashCommandBuilder } = require('discord.js');

function getRandomMessage(array) {
    return array[Math.floor(Math.random() * array.length)];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('murder')
        .setDescription('Eliminate someone in cold blood!')
        .setIntegrationTypes([0, 1]) // Guild & User App
        .setContexts([0, 1, 2])
        .addUserOption(option => option.setName('target').setDescription('Who is the victim?').setRequired(true)),

    async execute(interaction, senderName, recipientName) {
        const murderVariants = [
            `🔪 ${senderName} snuck up behind ${recipientName} and finished them off in cold blood!`,
            `☠️ ${senderName} cast a lethal curse on ${recipientName}! Out cold instantly!`,
            `🎯 ${senderName} hit a 360 no-scope on ${recipientName}! Elimination confirmed!`,
            `🗡️ ${senderName} challenged ${recipientName} to a duel and left them lying in the dust!`,
            `🩸 ${senderName} eliminated ${recipientName}! Zero health points remaining.`
        ];

        return getRandomMessage(murderVariants);
    }
};
