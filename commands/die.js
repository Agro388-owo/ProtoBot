const { SlashCommandBuilder, MessageFlags } = require('discord.js');

const DEFAULT_REASONS = [
    "spontaneously combusted into a pile of ash.",
    "forgot how to breathe.",
    "tried to swim in lava while looking for diamonds.",
    "dived headfirst into the abyss.",
    "was crushed by an anvil falling from the sky.",
    "pressed the big red button they were explicitly told not to press."
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('die')
        .setDescription('Meet a terrible fate (or send someone else to one)!')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user who meets their end (leave empty to die yourself)')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Custom cause of death')
                .setRequired(false)
        )
        .addBooleanOption(option =>
            option.setName('silent')
                .setDescription('Set to true to hide the output from others')
                .setRequired(false)
        ),

    async execute(interaction) {
        try {
            const author = interaction.user;
            const target = interaction.options.getUser('target') || author;
            const customReason = interaction.options.getString('reason');
            const isSilent = interaction.options.getBoolean('silent') ?? false;

            let cause = customReason;

            if (!cause) {
                const randomIndex = Math.floor(Math.random() * DEFAULT_REASONS.length);
                cause = DEFAULT_REASONS[randomIndex];
            }

            let responseText = '';

            if (target.id === author.id) {
                responseText = `☠️ <@${author.id}> ${cause}`;
            } else {
                responseText = `☠️ <@${author.id}> made <@${target.id}> ${cause}`;
            }

            await interaction.reply({
                content: responseText,
                flags: isSilent ? MessageFlags.Ephemeral : 0
            });

        } catch (error) {
            console.error('Error executing die command:', error);
            const errorMessage = `❌ Failed to execute die: \`${error.message}\``;
            
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ content: errorMessage }).catch(() => {});
            } else {
                await interaction.reply({ content: errorMessage, flags: MessageFlags.Ephemeral }).catch(() => {});
            }
        }
    }
};
