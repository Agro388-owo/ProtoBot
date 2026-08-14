const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('thing')
        .setDescription('Summon **The Thing.**'),

    async execute(interaction, senderName) {
        const rootPath = path.join(__dirname, '..');
        const primaryPath = path.join(rootPath, 'thing.png');

        if (!fs.existsSync(primaryPath)) {
            return interaction.reply({ content: `⚠️ thing.png not found in the root directory!`, ephemeral: true });
        }

        const file = new AttachmentBuilder(primaryPath);

        await interaction.reply({ 
            content: `${senderName} summoned **Thing**! 🐾`, 
            files: [file] 
        });
    }
};
