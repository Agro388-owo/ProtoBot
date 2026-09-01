const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leash')
        .setDescription('Put a leash on someone (or let them leash themselves)!')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user you want to put a leash on')
                .setRequired(true)
        )
        .addBooleanOption(option =>
            option.setName('silent')
                .setDescription('Set to true to hide the command output from others')
                .setRequired(false)
        ),

    async execute(interaction) {
        try {
            const author = interaction.user;
            const target = interaction.options.getUser('target');
            const isSilent = interaction.options.getBoolean('silent') ?? false;

            let responseText = '';

            // Check if user is leashing themselves
            if (author.id === target.id) {
                responseText = `<@${author.id}> decided they wanted to submit by their own hand ._.`;
            } else {
                responseText = `<@${author.id}> puts a leash on <@${target.id}>! bad <@${target.id}> :(`;
            }

            const leashEmbed = new EmbedBuilder()
                .setColor(0x95A5A6)
                .setDescription(responseText)
                .setTimestamp();

            await interaction.reply({
                embeds: [leashEmbed],
                flags: isSilent ? MessageFlags.Ephemeral : 0
            });

        } catch (error) {
            console.error('Error executing leash command:', error);
            const errorMessage = `❌ Failed to execute leash: \`${error.message}\``;
            
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ content: errorMessage }).catch(() => {});
            } else {
                await interaction.reply({ content: errorMessage, flags: MessageFlags.Ephemeral }).catch(() => {});
            }
        }
    }
};
