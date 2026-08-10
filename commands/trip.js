const { SlashCommandBuilder } = require('discord.js');

function getRandomMessage(array) {
    return array[Math.floor(Math.random() * array.length)];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('trip')
        .setDescription('Stick your foot out and trip someone!')
        .setIntegrationTypes([0, 1]) // Guild & User App
        .setContexts([0, 1, 2])
        .addUserOption(option => 
            option.setName('target')
                  .setDescription('Who are you tripping?')
                  .setRequired(true)
        ),

    async execute(interaction, senderName, recipientName) {
        const tripVariants = [
            `🦵 ${senderName} stuck their foot out and sent ${recipientName} flying face-first onto the ground!`,
            `🍌 ${senderName} quietly dropped a banana peel under ${recipientName}'s foot! *WHOOPS!*`,
            `💫 ${senderName} tripped ${recipientName}! They stumbled wildly before hitting the deck!`,
            `👟 ${senderName} tied ${recipientName}'s shoelaces together... down they go!`,
            `⚠️ ${senderName} subtly nudged a hazard into ${recipientName}'s path! Total wipeout!`
        ];

        return getRandomMessage(tripVariants);
    }
};
