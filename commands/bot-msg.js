const { SlashCommandBuilder } = require('discord.js');
const botConfig = require('../config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bot-msg')
        .setDescription('Sends a message as ProtoBot.')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .addStringOption(option =>
            option.setName('message')
                  .setDescription('The message you want the bot to say')
                  .setRequired(true)
        ),

    async execute(interaction, senderName) {
        // Replace with your actual Discord User ID, or pull it from your botConfig
        const OWNER_ID = botConfig.ownerId || 'YOUR_DISCORD_USER_ID';

        // Check if the user running the command is the owner
        if (interaction.user.id !== OWNER_ID) {
            return await interaction.reply({
                content: `❌ Only the bot owner can use this command!`,
                ephemeral: true
            });
        }

        const textToSend = interaction.options.getString('message');

        try {
            await interaction.channel.send(textToSend);
            await interaction.reply({
                content: `✅ Sent your message as ProtoBot!`,
                ephemeral: true
            });
        } catch (error) {
            console.error('Failed to send bot message:', error);
            await interaction.reply({
                content: `❌ Failed to send the message. Make sure I have permission to send messages here!`,
                ephemeral: true
            });
        }
    }
};
