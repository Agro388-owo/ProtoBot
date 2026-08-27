const { SlashCommandBuilder, AttachmentBuilder, InteractionContextType } = require('discord.js');
const path = require('path');
const fs = require('fs');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bloxy')
        .setDescription('Summon Bloxy.')
        .setContexts([
            InteractionContextType.Guild,
            InteractionContextType.BotDM,
            InteractionContextType.PrivateChannel
        ]),

    async execute(interaction) {
        const filePath = path.join(__dirname, '..', 'assets/goober/Bloxy.png');

        if (!fs.existsSync(filePath)) {
            return interaction.reply({ content: `⚠️ Bloxy.png not found at assets/goober/!`, ephemeral: true });
        }

        const file = new AttachmentBuilder(filePath);

        await interaction.reply({ 
            files: [file] 
        });
    }
};
