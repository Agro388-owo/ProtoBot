const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bloxy')
        .setDescription('Summon Bloxy.'),

    async execute(interaction) {
        const filePath = path.join(__dirname, '..', 'assets/bloxy/Bloxy.png');

        if (!fs.existsSync(filePath)) {
            return interaction.reply({ content: `⚠️ Bloxy.png not found at assets/bloxy/!`, ephemeral: true });
        }

        const file = new AttachmentBuilder(filePath);

        await interaction.reply({ 
            files: [file] 
        });
    }
};
