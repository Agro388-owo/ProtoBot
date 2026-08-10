const { SlashCommandBuilder } = require('discord.js');

function getRandomMessage(array) {
    return array[Math.floor(Math.random() * array.length)];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hug')
        .setDescription('Give someone a warm hug!')
        .setIntegrationTypes([0, 1]) // Guild & User App
        .setContexts([0, 1, 2])
        .addUserOption(option => option.setName('target').setDescription('Who do you want to hug?').setRequired(true)),

    async execute(interaction, senderName, recipientName) {
        const hugVariants = [
            `🫂 **${senderName}** wraps their arms around **${recipientName}** for a big, warm hug!`,
            `🤗 **${senderName}** gives **${recipientName}** a tight squeeze! *Squeeze!*`,
            `✨ **${senderName}** pulls **${recipientName}** into a soft and cozy hug!`,
            `💖 **${senderName}** runs over and tackles **${recipientName}** with a giant bear hug!`,
            `🪽 **${senderName}** gently embraces **${recipientName}**. Everything is going to be alright!` , 
            ` **${senderName}** gives **${recipientName}** a much needed hug. `
        ];

        return getRandomMessage(hugVariants);
    }
};
