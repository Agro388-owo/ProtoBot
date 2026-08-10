const { SlashCommandBuilder } = require('discord.js');
const botConfig = require('../config.js');

function getRandomMessage(array) {
    return array[Math.floor(Math.random() * array.length)];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kidnap')
        .setDescription('Throw someone into the back of an unmarked van!')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .addUserOption(option => option.setName('target').setDescription('Who are you kidnapping?').setRequired(true)),

    async execute(interaction, senderName, recipientName) {
        const executorId = interaction.user.id;
        const targetUser = interaction.options.getUser('target');

        if (botConfig.kidnapRestricted) {
            const isOwner = executorId === botConfig.OWNER_ID;
            const isAllowedUser = botConfig.allowedUsers.includes(executorId);

            if (botConfig.allowedUsers.length > 0 && !isOwner && !isAllowedUser) {
                await interaction.reply({
                    content: '🔒 You do not have clearance to use this command!',
                    ephemeral: true
                });
                return null;
            }
        }

        if (executorId === targetUser.id) {
            const selfVariants = [
                `🚐 ${senderName} climbed into the trunk of an unmarked van and closed the door themselves...`,
                `📦 ${senderName} stuffed themselves into a cardboard box and closed the flaps!`,
                `🏷️ ${senderName} put a address tag on their own forehead and waited for pickup!`
            ];
            return getRandomMessage(selfVariants);
        }

        const kidnapVariants = [
            `🚐 A black unmarked van pulled up, and ${senderName} shoved ${recipientName} into the trunk!`,
            `📦 ${senderName} threw a sack over ${recipientName}'s head and dragged them away!`,
            `🕳️ ${senderName} opened a trapdoor beneath ${recipientName}! Down they go!`,
            `🏷️ ${senderName} stuffed ${recipientName} into an oversized cardboard box and marked it "Return to Sender"!`,
            `🏎️ ${senderName} sped by on a motorcycle, scooped up ${recipientName}, and vanished into thin air!`
        ];
        return getRandomMessage(kidnapVariants);
    }
};
