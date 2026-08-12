const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('goober')
        .setDescription('Summon a Goober.')
        .addIntegerOption(option => 
            option.setName('number')
                  .setDescription('Pick a specific Goober number')
                  .setRequired(false)),

    async execute(interaction, senderName) {
        const rootPath = path.join(__dirname, '..');
        const folderPath = path.join(rootPath, 'assets/goober');

        let gooberFiles = [];
        
        // Primary gobber.jpeg in root becomes #1
        const primaryPath = path.join(rootPath, 'gobber.jpeg');
        if (fs.existsSync(primaryPath)) {
            gooberFiles.push({ name: 'gobber.jpeg', fullPath: primaryPath });
        }

        // Additional goobers in assets/goober/ folder
        if (fs.existsSync(folderPath)) {
            const extraFiles = fs.readdirSync(folderPath)
                .filter(file => file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.png'))
                .map(file => ({ name: file, fullPath: path.join(folderPath, file) }));
            
            gooberFiles.push(...extraFiles);
        }

        if (gooberFiles.length === 0) {
            return interaction.reply({ content: `⚠️ No goober images found anywhere!`, ephemeral: true });
        }

        let chosenGoober;
        const numberInput = interaction.options.getInteger('number');

        if (numberInput !== null) {
            const index = numberInput - 1;
            if (index >= 0 && index < gooberFiles.length) {
                chosenGoober = gooberFiles[index];
            } else {
                return interaction.reply({ content: `⚠️ Goober #${numberInput} doesn't exist! I only have ${gooberFiles.length} goober(s) available.`, ephemeral: true });
            }
        } else {
            // Pick a random one if no number is specified
            chosenGoober = gooberFiles[Math.floor(Math.random() * gooberFiles.length)];
        }

        const file = new AttachmentBuilder(chosenGoober.fullPath);
        const actualIndex = gooberFiles.indexOf(chosenGoober) + 1;

        await interaction.reply({ 
            content: `${senderName} summoned **Goober**! 🐾`, 
            files: [file] 
        });
    }
};
