const { SlashCommandBuilder } = require('discord.js');

function getRandomMessage(array) {
    return array[Math.floor(Math.random() * array.length)];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hamburger')
        .setDescription('Offer or force-feed someone a hamburger!')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .addUserOption(option => 
            option.setName('target')
                  .setDescription('Who are you giving a hamburger to?')
                  .setRequired(true)
        ),

    async execute(interaction, senderName, recipientName) {
        const targetUser = interaction.options.getUser('target');

        if (interaction.user.id === targetUser.id) {
            const selfVariants = [
                `${senderName} ordered a triple cheeseburger and ate the whole thing by themselves!`,
                `${senderName} unwrapped a fresh hamburger and took a huge bite.`,
                `${senderName} pulled a hamburger out of nowhere and devoured it instantly.`
            ];
            return getRandomMessage(selfVariants);
        }

        const hamburgerVariants = [
            `${senderName} handed a hot, freshly grilled hamburger to ${recipientName}!`,
            `${senderName} aggressively shoved a double cheeseburger directly into ${recipientName}'s mouth!`,
            `${senderName} ordered a complete burger meal with extra cheese and shared it with ${recipientName}!`,
            `${senderName} tossed a wrapped hamburger across the room and ${recipientName} caught it clean!`,
            `${senderName} offered ${recipientName} a delicious hamburger with extra pickles!`
        ];

        return getRandomMessage(hamburgerVariants);
    }
};
