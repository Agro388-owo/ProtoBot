const { SlashCommandBuilder } = require('discord.js');

function getRandomMessage(array) {
    return array[Math.floor(Math.random() * array.length)];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('strangle')
        .setDescription('Aggressively grab someone by the throat!')
        .setIntegrationTypes([0, 1]) // Guild & User App
        .setContexts([0, 1, 2])
        .addUserOption(option => option.setName('target').setDescription('Who are you strangling?').setRequired(true)),

    async execute(interaction) {
        const sender = interaction.user;
        const targetUser = interaction.options.getUser('target');

        // Formats as actual Discord mentions (<@ID>)
        const senderMention = `<@${sender.id}>`;
        const targetMention = `<@${targetUser.id}>`;

        const strangleVariants = [
            `👀 ${senderMention} had enough of ${targetMention}'s bullshitery and grabbed them brutally by the throat!`,
            `💥 ${senderMention} lost their cool and lunged at ${targetMention}'s neck with both hands!`,
            `☠️ ${senderMention} aggressively strangles ${targetMention}! *LISTEN TO ME!*`,
            `💢 ${senderMention} reached over and squeezed ${targetMention}'s throat! No more talking!`,
            `🤏 ${senderMention} lifts ${targetMention} into the air by their neck Darth Vader style!`
        ];

        return getRandomMessage(strangleVariants);
    }
};
