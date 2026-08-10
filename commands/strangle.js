const { SlashCommandBuilder } = require('discord.js');

function getRandomMessage(array) {
    return array[Math.floor(Math.random() * array.length)];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('strangle')
        .setDescription('Aggressively grab someone by the throat!')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .addUserOption(option => option.setName('target').setDescription('Who are you strangling?').setRequired(true)),

    async execute(interaction, senderName, recipientName) {
        const targetUser = interaction.options.getUser('target');

        // 🤖 SELF-TARGET CHECK
        if (interaction.user.id === targetUser.id) {
            const selfVariants = [
                `${senderName} tried to strangle themselves... that's not how breathing works!`,
                `${senderName} grabbed their own neck in confusion! *Stop hitting yourself!*`,
                `${senderName} tried to strangle themselves and choked on air instead!`,
                `${senderName} stared in the mirror and aggressively grabbed their own neck...`
            ];
            return getRandomMessage(selfVariants);
        }

        // 👥 NORMAL TARGET VARIANTS
        const strangleVariants = [
            `${senderName} had enough of ${recipientName}'s bullshitery and grabbed them brutally by the throat!`,
            `${senderName} lost their cool and lunged at ${recipientName}'s neck with both hands!`,
            `${senderName} aggressively strangles ${recipientName}! *LISTEN TO ME!*`,
            `${senderName} reached over and squeezed ${recipientName}'s throat! No more talking!`,
            `${senderName} lifts ${recipientName} into the air by their neck Darth Vader style!`
        ];

        return getRandomMessage(strangleVariants);
    }
};
