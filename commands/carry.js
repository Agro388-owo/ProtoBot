const { SlashCommandBuilder } = require('discord.js');

function getRandomMessage(array) {
    return array[Math.floor(Math.random() * array.length)];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('carry')
        .setDescription('Pick someone up and carry them around!')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .addUserOption(option => 
            option.setName('target')
                  .setDescription('Who are you carrying?')
                  .setRequired(true)
        ),

    async execute(interaction, senderName, recipientName) {
        const targetUser = interaction.options.getUser('target');

        // Glitch Physics Self-Carry
        if (interaction.user.id === targetUser.id) {
            const selfVariants = [
                `${senderName} discovered a physics glitch, picked themselves up and carried themselves into the sky!`
            ];
            return getRandomMessage(selfVariants);
        }

        // Standard Carry Variants
        const carryVariants = [
            `${senderName} scooped up ${recipientName} and carried them bridal style!`,
            `${senderName} hoisted ${recipientName} over their shoulder like a sack of potatoes!`,
            `${senderName} picked up ${recipientName} and carried them across the room effortlessly!`,
            `${senderName} gave ${recipientName} a piggyback ride to their destination!`,
            `${senderName} lifted ${recipientName} into the air and started carrying them around!`
        ];

        return getRandomMessage(carryVariants);
    }
};
