const { Client, GatewayIntentBits, REST, Routes, Collection } = require('discord.js');
const express = require('express');
const fs = require('fs');
const path = require('path');

// ==========================================
// 1. EXPRESS HTTP SERVER (For Render Hosting)
// ==========================================
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('ProtoBot v0.0.1 is active and running 24/7!');
});

app.listen(PORT, () => {
    console.log(`HTTP server listening on port ${PORT}`);
});

// ==========================================
// 2. DISCORD BOT SETUP
// ==========================================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions
    ]
});

const TOKEN = process.env.TOKEN;

// Create a collection to hold commands dynamically
client.commands = new Collection();
const commandsArray = [];

// Load all command files from the ./commands folder
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        commandsArray.push(command.data.toJSON());
    } else {
        console.warn(`[WARNING] The command at ${filePath} is missing "data" or "execute".`);
    }
}

// Register Commands Globally on Startup
client.once('ready', async () => {
    console.log(`ProtoBot v0.0.1 logged in as ${client.user.tag}!`);

    if (!TOKEN) {
        console.error('ERROR: TOKEN environment variable is missing!');
        return;
    }

    const rest = new REST({ version: '10' }).setToken(TOKEN);
    try {
        console.log('Registering slash commands for Guild & User Apps...');
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commandsArray }
        );
        console.log('Slash commands registered successfully!');
    } catch (error) {
        console.error('Failed to register commands:', error);
    }
});

// Handle Slash Command Interactions
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    const { member, user } = interaction;
    
    // Get Display Names
    const senderName = member?.displayName || user.displayName || user.username;
    const targetUser = interaction.options.getUser('target');
    const targetMember = interaction.options.getMember('target');
    const recipientName = targetMember?.displayName || targetUser?.displayName || targetUser?.username || 'themselves';

    try {
        const selectedMessage = await command.execute(interaction, senderName, recipientName);

        // Send reply
        const responseMessage = await interaction.reply({ content: selectedMessage, fetchReply: true });

        // Set up reaction collector: Only the author can delete it using ❌
        const filter = (reaction, reactUser) => {
            return (reaction.emoji.name === '❌' || reaction.emoji.name === '✖️') && reactUser.id === user.id;
        };

        const collector = responseMessage.createReactionCollector({ filter, time: 60000 });

        collector.on('collect', async () => {
            try {
                await interaction.deleteReply();
            } catch (error) {
                console.error('Failed to delete message:', error);
            }
        });

    } catch (error) {
        console.error(`Error executing ${interaction.commandName}:`, error);
        await interaction.reply({ content: 'There was an error executing this command!', ephemeral: true });
    }
});

// Log into Discord
client.login(TOKEN);
