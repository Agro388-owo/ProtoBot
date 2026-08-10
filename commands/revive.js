const { SlashCommandBuilder } = require('discord.js');

function getRandomMessage(array) {
    return array[Math.floor(Math.random() * array.length)];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('revive')
        .setDescription('Bring someone back to life!')
        .setIntegrationTypes([0, 1]) // Guild & User App
        .setContexts([0, 1, 2])
        .addUserOption(option => option.setName('target').setDescription('Who are you reviving?').setRequired(true)),

    async execute(interaction, senderName, recipientName) {
        const reviveVariants = [
            `✨ ${senderName} cast a resurrection spell on ${recipientName}! Welcome back to life!`,
            `⚡ ${senderName} brought out the defibrillator and shocked ${recipientName} back into consciousness! *CLEAR!*`,
            `🧪 ${senderName} splashed a health potion on ${recipientName}! Back on full HP!`,
            `🕊️ ${senderName} pulled ${recipientName} back from the afterlife just in time!`,
            `🟩 ${senderName} held down the revive button on ${recipientName}! Back on their feet!`
        ];

        return getRandomMessage(reviveVariants);
    }
};
