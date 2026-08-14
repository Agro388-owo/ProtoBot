const { SlashCommandBuilder } = require('discord.js');
const botConfig = require('../config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('snap')
        .setDescription('Performs a Thanos snap on the channel (or mentioned users)!')
        .addUserOption(option =>
            option.setName('target')
                  .setDescription('Optional specific user to snap')
                  .setRequired(false)
        ),

    async execute(interaction, senderName) {
        // ⚙️ Pulling mass ping setting from your config file
        const configAllowMassPing = botConfig.snapAllowMassPing ?? false; 

        const targetUser = interaction.options.getUser('target');

        // If a specific target is provided
        if (targetUser) {
            const survived = Math.random() < 0.5;
            if (survived) {
                return `${senderName} snapped their fingers at <@${targetUser.id}>... but they were spared by the universe! 🌌 <:purocute:1536367584369180803>`;
            } else {
                return `${senderName} snapped their fingers... and <@${targetUser.id}> turned to dust. <:puro_sad:1536430025635799061>`;
            }
        }

        // Channel-wide snap simulation
        const survived = Math.random() < 0.5;
        
        if (survived) {
            return `${senderName} snapped their fingers... and by a miracle, everyone in the universe was spared! ✨ <:protogenirl:1536430038751121499>`;
        } else {
            if (configAllowMassPing) {
                return `${senderName} snapped their fingers... half of @everyone existence has vanished! <:puroshock:1536366927230799972>`;
            } else {
                return `${senderName} snapped their fingers... half of all existence has vanished into dust. *As all things should be.* 💀 <:Puro_Pathetic6:1536430027468710019>`;
            }
        }
    }
};
