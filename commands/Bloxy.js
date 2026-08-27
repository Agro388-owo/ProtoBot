const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bloxy')
        .setDescription('Summon a Bloxy.'),

    async execute(interaction) {
        const folderPath = path.join(__dirname, '..', 'assets/goober');

        if (!fs.existsSync(folderPath)) {
            return interaction.reply({ content: `⚠️ Folder not found: assets/goober/`, ephemeral: true });
        }

        const bloxyFiles = fs.readdirSync(folderPath)
            .filter(file => file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.png'))
            .map(file => path.join(folderPath, file));

        if (bloxyFiles.length === 0) {
            return interaction.reply({ content: `⚠️ No images found in assets/goober/!`, ephemeral: true });
        }

        // Pick a random image
        const chosenBloxyPath = bloxyFiles[Math.floor(Math.random() * bloxyFiles.length)];
        const file = new AttachmentBuilder(chosenBloxyPath);

        await interaction.reply({ 
            files: [file] 
        });
    }
};
