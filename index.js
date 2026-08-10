const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const express = require('express');

// ==========================================
// 1. EXPRESS HTTP SERVER (For Render Hosting)
// ==========================================
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Bot is active and running!');
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

// Helper function to pick a random message variant
function getRandomMessage(array) {
    return array[Math.floor(Math.random() * array.length)];
}

// Handle Slash Command Interactions
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, user } = interaction;
    const target = interaction.options.getUser('target');
    const recipientName = target ? target.username : 'themselves';

    if (commandName === 'bap') {
        const bapVariants = [
            `💥 **${user.username}** baps **${target.username}** on the head with a rolled-up newspaper!`,
            `🥖 **${user.username}** swiftly baps **${target.username}** across the snout with a baguette!`,
            `🐾 **${user.username}** reaches out and gives **${target.username}** a quick *BAP* on the forehead!`,
            `🗞️ *BOOP!* **${user.username}** lightly bapped **${target.username}**. No thoughts, empty head.`,
            `💥 **${user.username}** hits **${target.username}** with a squeaky toy bap! *SQUEAK!*`
        ];

        const embed = new EmbedBuilder()
            .setColor(0xFFA500)
            .setDescription(getRandomMessage(bapVariants));
        await interaction.reply({ embeds: [embed] });
    }

    else if (commandName === 'pet') {
        const petVariants = [
            `🫳 **${user.username}** gently pats **${target.username}** on the head. Good job!`,
            `✨ **${user.username}** gives **${target.username}** soft and cozy headpats!`,
            `😸 **${user.username}** aggressively pets **${target.username}**! *Pat pat pat pat!*`,
            `💖 **${user.username}** places a hand on **${target.username}**'s head and pets them carefully.`,
            `👑 **${user.username}** adjusts **${target.username}**'s hair and gives them gentle pats.`
        ];

        const embed = new EmbedBuilder()
            .setColor(0xFFC0CB)
            .setDescription(getRandomMessage(petVariants));
        await interaction.reply({ embeds: [embed] });
    }

    else if (commandName === 'blow-up') {
        const blowUpVariants = [
            `💥 💣 **${user.username}** threw a bomb at **${target.username}**! *BOOM!*`,
            `🚀 **${user.username}** launched **${target.username}** directly into the stratosphere! *KABOOM!*`,
            `🧨 **${user.username}** lit a fuse right under **${target.username}**! Disintegrated into dust!`,
            `💥 **${user.username}** pressed the red button... **${target.username}** instantly blew up into tiny pixels!`,
            `⚡ **${user.username}** summoned a tactical strike on **${target.username}**'s position! Zero remains found.`
        ];

        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setDescription(getRandomMessage(blowUpVariants));
        await interaction.reply({ embeds: [embed] });
    }

    else if (commandName === 'hamburger') {
        const hamburgerVariants = [
            `🍔 **${user.username}** served a nice, warm hamburger to **${recipientName}**! Bon appétit!`,
            `🍔 **${user.username}** slides a double cheeseburger over to **${recipientName}**! Enjoy!`,
            `🍔 **${user.username}** cooked a fresh gourmet burger with extra cheese for **${recipientName}**!`,
            `🍔 **${user.username}** hands **${recipientName}** a mysterious, delicious-looking hamburger!`,
            `🍔 **${user.username}** threw a whole hamburger directly into **${recipientName}**'s hands!`
        ];

        const embed = new EmbedBuilder()
            .setColor(0x8B4513)
            .setDescription(getRandomMessage(hamburgerVariants));
        await interaction.reply({ embeds: [embed] });
    }
});

// Log into Discord
client.login(TOKEN);
