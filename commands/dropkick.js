const { SlashCommandBuilder } = require('discord.js');

function getRandomMessage(array) {
    return array[Math.floor(Math.random() * array.length)];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dropkick')
        .setDescription('Execute a dramatic airborne dropkick!')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .addUserOption(option => 
            option.setName('target')
                  .setDescription('Who are you dropkicking?')
                  .setRequired(true)
        ),

    async execute(interaction, senderName, recipientName) {
        const targetUser = interaction.options.getUser('target');

        // Self-Dropkick Glitch Logic
        if (interaction.user.id === targetUser.id) {
            const selfVariants = [
                `${senderName} leaped into the air and somehow dropkicked themselves!`,
                `${senderName} dropkicked themselves throught a portal!`
            ];
            return getRandomMessage(selfVariants);
        }

        // Standard Dropkick Variants
        const dropkickVariants = [
            `${senderName} sprinted across the room, took off, and landed a double-leg dropkick squarely on ${recipientName}!`,
            `${senderName} launched off a nearby table and delivered a flying dropkick straight into ${recipientName}!`,
            `${senderName} executed a perfect airborne dropkick, sending ${recipientName} skidding across the floor!`,
            `${senderName} ambushed ${recipientName} out of nowhere with a high-impact dropkick!`,
            `${senderName} channeled pure wrestling energy and dropkicked ${recipientName} through the nearest door!`
        ];

        return getRandomMessage(dropkickVariants);
    }
};
