const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const express = require('express');

// ==========================================
// 1. EXPRESS HTTP SERVER (For Render Hosting)
// ==========================================
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Bot is active and running 24/7!');
});

app.listen(PORT, () => {
    console.log(`HTTP server listening on port ${PORT}`);
});

// ==========================================
// 2. DISCORD BOT SETUP
// ==========================================
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const TOKEN = process.env.TOKEN; // Retrieved safely from Render's Environment Variables

// Define Slash Commands
const commands = [
    new SlashCommandBuilder()
        .setName('bap')
        .setDescription('Playfully bap someone on the head!')
        .addUserOption(option => option.setName('target').setDescription('Who do you want to bap?').setRequired(true)),

    new SlashCommandBuilder()
        .setName('pet')
        .setDescription('Give someone headpats!')
        .addUserOption(option => option.setName('target').setDescription('Who gets pats?').setRequired(true)),

    new SlashCommandBuilder()
        .setName('blow-up')
        .setDescription('Explode someone into tiny pieces!')
        .addUserOption(option => option.setName('target').setDescription('Target to explode').setRequired(true)),

    new SlashCommandBuilder()
        .setName('hamburger')
        .setDescription('Give someone a delicious hamburger!')
        .addUserOption(option => option.setName('target').setDescription('Who gets a hamburger?').setRequired(false))
];

// Register Commands Globally on Startup
client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);

    if (!TOKEN) {
        console.error('ERROR: TOKEN environment variable is missing!');
        return;
    }

    const rest = new REST({ version: '10' }).setToken(TOKEN);
    try {
        console.log('Registering slash commands...');
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );
        console.log('Slash commands registered successfully!');
    } catch (error) {
        console.error('Failed to register commands:', error);
    }
});

// Handle Slash Command Interactions
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, user } = interaction;
    const target = interaction.options.getUser('target');

    if (commandName === 'bap') {
        const embed = new EmbedBuilder()
            .setColor(0xFFA500)
            .setDescription(`💥 **${user.username}** baps **${target.username}** on the head with a rolled-up newspaper!`);
        await interaction.reply({ embeds: [embed] });
    }

    else if (commandName === 'pet') {
        const embed = new EmbedBuilder()
            .setColor(0xFFC0CB)
            .setDescription(`🫳 **${user.username}** gently pats **${target.username}** on the head. Good job!`);
        await interaction.reply({ embeds: [embed] });
    }

    else if (commandName === 'blow-up') {
        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setDescription(`💥 💣 **${user.username}** threw a bomb at **${target.username}**! *BOOM!*`);
        await interaction.reply({ embeds: [embed] });
    }

    else if (commandName === 'hamburger') {
        const recipient = target ? target.username : 'themselves';
        const embed = new EmbedBuilder()
            .setColor(0x8B4513)
            .setDescription(`🍔 **${user.username}** served a nice, warm hamburger to **${recipient}**! Bon appétit!`);
        await interaction.reply({ embeds: [embed] });
    }
});

// Log into Discord
client.login(TOKEN);
