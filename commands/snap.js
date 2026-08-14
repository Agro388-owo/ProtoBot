const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('snap')
        .setDescription('Performs a Thanos snap on the channel (or mentioned users)!')
        .addUserOption(option =>
            option.setName('target')
                  .setDescription('Optional specific user to snap')
                  .setRequired(false)
        ),

    async execute(interaction, senderName, client) {
        // ⚙️ Pulling mass ping setting from your bot's global/guild config system
        // Assumes client.config or a database stores this. Defaults to false if not set.
        const configAllowMassPing = client.config?.allowMassPing ?? false; 

        const targetUser = interaction.options.getUser('target');

        // If a specific target is provided
        if (targetUser) {
            const survived = Math.random() < 0.5;
            if (survived) {
                return `${senderName} snapped their fingers at <@${targetUser.id}>... but they were spared by the universe! 🌌`;
            } else {
                return `${senderName} snapped their fingers... and <@${targetUser.id}> turned to dust. *As all things should be.* 💀`;
            }
        }

        // Channel-wide snap simulation
        const survived = Math.random() < 0.5;
        
        if (survived) {
            return `${senderName} snapped their fingers... and by a miracle, everyone in the universe was spared! ✨`;
        } else {
            if (configAllowMassPing) {
                return `${senderName} snapped their fingers... half of @everyone existence has vanished!`;
            } else {
                return `${senderName} snapped their fingers... half of all existence has vanished into dust. *As all things should be.* 💀`;
            }
        }
    }
};
