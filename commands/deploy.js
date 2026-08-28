const { SlashCommandBuilder, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const botConfig = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('deploy')
    .setDescription('Hot-reloads command files and updates Discord slash commands (Owner Only).'),

  async execute(interaction) {
    // 🔒 Strict Owner Guard matching botConfig.OWNER_ID
    if (interaction.user.id !== botConfig.OWNER_ID) {
      return await interaction.reply({
        content: '⛔ **Access Denied:** Only the bot owner can execute this command.',
        flags: 64 // Ephemeral (visible only to you)
      });
    }

    await interaction.deferReply({ flags: 64 });

    const commandsPath = path.join(__dirname, '../commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    const newCommandsArray = [];
    const client = interaction.client;

    // Clear active in-memory commands collection
    client.commands.clear();

    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);

      // Flush Node's module cache so fresh code is read directly from disk
      delete require.cache[require.resolve(filePath)];

      try {
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
          client.commands.set(command.data.name, command);
          newCommandsArray.push(command.data.toJSON());
        }
      } catch (err) {
        console.error(`[DEPLOY ERROR] Failed to load ${file}:`, err);
      }
    }

    // Sync updated command schemas directly to Discord's API
    const token = process.env.TOKEN || botConfig.TOKEN;
    const rest = new REST({ version: '10' }).setToken(token);

    try {
      await rest.put(
        Routes.applicationCommands(client.user.id),
        { body: newCommandsArray }
      );

      return await interaction.editReply({
        content: `✅ **Deploy Complete:** Hot-reloaded **${client.commands.size}** command(s) and synced with Discord!`
      });
    } catch (error) {
      console.error('[DEPLOY ERROR] REST sync failed:', error);
      return await interaction.editReply({
        content: `❌ **Sync Failed:** \`${error.message}\``
      });
    }
  }
};
