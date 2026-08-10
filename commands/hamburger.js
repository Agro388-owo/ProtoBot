const { SlashCommandBuilder } = require('discord.js');

function getRandomMessage(array) {
    return array[Math.floor(Math.random() * array.length)];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hamburger')
        .setDescription('Give someone a delicious hamburger!')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .addUserOption(option => option.setName('target').setDescription('Who gets a hamburger?').setRequired(false)),

    async execute(interaction, senderName, recipientName) {
        const hamburgerVariants = [
            `🍔 **${senderName}** served a nice, warm hamburger to **${recipientName}**! Bon appétit!`,
            `🍔 **${senderName}** slides a double cheeseburger over to **${recipientName}**! Enjoy!`,
            `🍔 **${senderName}** cooked a fresh gourmet burger with extra cheese for **${recipientName}**!`,
            `🍔 **${senderName}** hands **${recipientName}** a mysterious, delicious-looking hamburger!`,
            `🍔 **${senderName}** threw a whole hamburger directly into **${recipientName}**'s hands!`
        ];
        return getRandomMessage(hamburgerVariants);
    }
};
