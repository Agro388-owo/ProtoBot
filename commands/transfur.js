const { SlashCommandBuilder } = require('discord.js');

function getRandomMessage(array) {
    return array[Math.floor(Math.random() * array.length)];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('transfur')
        .setDescription('Initiate a sticky latex transformation sequence on target!')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .addUserOption(option => 
            option.setName('target')
                  .setDescription('Who is being transformed?')
                  .setRequired(true)
        ),

    async execute(interaction, senderName, recipientName) {
        const targetUser = interaction.options.getUser('target');

        // Self-Transfur Glitch Logic
        if (interaction.user.id === targetUser.id) {
            const selfVariants = [
                `${senderName} dropped a puddle of latex, stepped into it, and got transfurred!`
            ];
            return getRandomMessage(selfVariants);
        }

        // Standard Transfur Variants
        const transfurVariants = [
            `${senderName} ambushed ${recipientName} with a wave of black latex, completely transfurring them!`,
            `${senderName} covered ${recipientName} in gooey white latex, transfurring them before they could react!`
        ];

        return getRandomMessage(transfurVariants);
    }
};
