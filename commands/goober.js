const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gobber')
        .setDescription('Summon the Gobber.'),

    async execute(interaction, senderName) {
        // Use '../gobber.jpeg' to step out of the 'commands' folder and into the root folder!
        const file = new AttachmentBuilder(path.join(__dirname, '../gobber.jpeg'));
        
        await interaction.reply({ 
            content: `${senderName} summons **Gobber**! 🐾`, 
            files: [file] 
        });
    }
};
