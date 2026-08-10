const { SlashCommandBuilder } = require('discord.js');

function getRandomMessage(array) {
    return array[Math.floor(Math.random() * array.length)];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kiss')
        .setDescription('Give someone an affectionate kiss!')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .addUserOption(option => option.setName('target').setDescription('Who are you kissing?').setRequired(true)),

    async execute(interaction, senderName, recipientName) {
        const targetUser = interaction.options.getUser('target');

        if (interaction.user.id === targetUser.id) {
            const selfVariants = [
                `${senderName} kissed their own reflection in the mirror!`,
                `${senderName} gave themselves a sweet kiss? How?!`,
                `${senderName} blew a kiss into the air for themselves!`
            ];
            return getRandomMessage(selfVariants);
        }

        const kissVariants = [
            `${senderName} leaned in and gave ${recipientName} a sweet kiss!`,
            `${senderName} pulled ${recipientName} close and planted a soft kiss on their cheek!`,
            `${senderName} gave ${recipientName} a quick, sudden kiss! *Mwah!*`,
            `${senderName} showered ${recipientName} with affection and warm kisses!`,
            `${senderName} blew a big flying kiss across the room directly at ${recipientName}!`
        ];
        return getRandomMessage(kissVariants);
    }
};
