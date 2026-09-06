const { SlashCommandBuilder } = require('discord.js');

function getRandomMessage(array) {
    return array[Math.floor(Math.random() * array.length)];
}

const untransfurSelfMessages = [
    "${senderName} stepped into the decontamination shower and washed off all transfur remnants!",
    "${senderName} used a solvent spray and stripped away their transfur traits, returning to normal!"
];

const untransfurOtherMessages = [
    "${senderName} sprayed ${targetDisplayName} with a high-grade solvent, washing away all latex goo!",
    "${senderName} somehow untransfurred ${targetDisplayName}!"
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('untransfur')
        .setDescription('Cleanse transfur traits and restore a user to their original form!')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .addUserOption(option => 
            option.setName('target')
                  .setDescription('Who is getting cleansed? (Leave empty to untransfur yourself)')
                  .setRequired(false)
        ),

    async execute(interaction, senderName, recipientName) {
        const targetUser = interaction.options.getUser('target') || interaction.user;
        const targetDisplayName = targetUser.id === interaction.user.id ? senderName : (recipientName || `<@${targetUser.id}>`);

        if (interaction.user.id === targetUser.id) {
            const template = getRandomMessage(untransfurSelfMessages);
            return template.replace('${senderName}', senderName) + ' ✨';
        } else {
            const template = getRandomMessage(untransfurOtherMessages);
            return template.replace('${senderName}', senderName).replace('${targetDisplayName}', targetDisplayName) + ' ✨';
        }
    }
};
