const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
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
// Added GuildMessageReactions intent so the bot can see when you react with ❌
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions
    ]
});

const TOKEN = process.env.TOKEN;

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

    const { commandName, member, user } = interaction;
    
    // Get Display Names (falls back to global displayName or username)
    const senderName = member?.displayName || user.displayName || user.username;

    const targetUser = interaction.options.getUser('target');
    const targetMember = interaction.options.getMember('target');
    const recipientName = targetMember?.displayName || targetUser?.displayName || targetUser?.username || 'themselves';

    let selectedMessage = '';

    if (commandName === 'bap') {
        const bapVariants = [
            `💥 **${senderName}** baps **${recipientName}** on the head with a rolled-up newspaper!`,
            `🥖 **${senderName}** swiftly baps **${recipientName}** across the snout with a baguette!`,
            `🐾 **${senderName}** reaches out and gives **${recipientName}** a quick *BAP* on the forehead!`,
            `🗞️ *BOOP!* **${senderName}** lightly bapped **${recipientName}**. No thoughts, empty head.`,
            `💥 **${senderName}** hits **${recipientName}** with a squeaky toy bap! *SQUEAK!*`
        ];
        selectedMessage = getRandomMessage(bapVariants);
    }

    else if (commandName === 'pet') {
        const petVariants = [
            `🫳 **${senderName}** gently pats **${recipientName}** on the head. Good job!`,
            `✨ **${senderName}** gives **${recipientName}** soft and cozy headpats!`,
            `😸 **${senderName}** aggressively pets **${recipientName}**! *Pat pat pat pat!*`,
            `💖 **${senderName}** places a hand on **${recipientName}**'s head and pets them carefully.`,
            `👑 **${senderName}** adjusts **${recipientName}**'s hair and gives them gentle pats.`
        ];
        selectedMessage = getRandomMessage(petVariants);
    }

    else if (commandName === 'blow-up') {
        const blowUpVariants = [
            `💥 💣 **${senderName}** threw a bomb at **${recipientName}**! *BOOM!*`,
            `🚀 **${senderName}** launched **${recipientName}** directly into the stratosphere! *KABOOM!*`,
            `🧨 **${senderName}** lit a fuse right under **${recipientName}**! Disintegrated into dust!`,
            `💥 **${senderName}** pressed the red button... **${recipientName}** instantly blew up into tiny pixels!`,
            `⚡ **${senderName}** summoned a tactical strike on **${recipientName}**'s position! Zero remains found.`
        ];
        selectedMessage = getRandomMessage(blowUpVariants);
    }

    else if (commandName === 'hamburger') {
        const hamburgerVariants = [
            `🍔 **${senderName}** served a nice, warm hamburger to **${recipientName}**! Bon appétit!`,
            `🍔 **${senderName}** slides a double cheeseburger over to **${recipientName}**! Enjoy!`,
            `🍔 **${senderName}** cooked a fresh gourmet burger with extra cheese for **${recipientName}**!`,
            `🍔 **${senderName}** hands **${recipientName}** a mysterious, delicious-looking hamburger!`,
            `🍔 **${senderName}** threw a whole hamburger directly into **${recipientName}**'s hands!`
        ];
        selectedMessage = getRandomMessage(hamburgerVariants);
    }

    // Send reply as plain text and wait for message object
    const responseMessage = await interaction.reply({ content: selectedMessage, fetchReply: true });

    // Set up reaction collector: Only the author can delete it using ❌
    const filter = (reaction, reactUser) => {
        return (reaction.emoji.name === '❌' || reaction.emoji.name === '✖️') && reactUser.id === user.id;
    };

    const collector = responseMessage.createReactionCollector({ filter, time: 60000 }); // Active for 60 seconds

    collector.on('collect', async () => {
        try {
            await interaction.deleteReply();
        } catch (error) {
            console.error('Failed to delete message:', error);
        }
    });
});

// Log into Discord
client.login(TOKEN);
