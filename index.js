const { Client, GatewayIntentBits, REST, Routes, Collection, ActivityType } = require('discord.js');
const express = require('express');
const fs = require('fs');
const path = require('path');
const botConfig = require('./config'); // ⚙️ Import your status config

// ==========================================
// 1. EXPRESS HTTP SERVER & WEBSITE API (SSE)
// ==========================================
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static website files from the "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// Keep track of connected website clients for live updates
let sseClients = [];

// SSE Endpoint for instant live updates
app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    sseClients.push(res);

    req.on('close', () => {
        sseClients = sseClients.filter(client => client !== res);
    });
});

// Standard initial fetch endpoint
app.get('/api/status', (req, res) => {
    res.json(getStatusPayload());
});

function getStatusPayload() {
    let activityTypeString = 'Playing';
    if (botConfig.activityType === 1) activityTypeString = 'Streaming';
    if (botConfig.activityType === 2) activityTypeString = 'Listening to';
    if (botConfig.activityType === 3) activityTypeString = 'Watching';
    if (botConfig.activityType === 5) activityTypeString = 'Competing in';

    const uptimeSeconds = client.uptime ? Math.floor(client.uptime / 1000) : 0;
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = uptimeSeconds % 60;

    return {
        online: client.isReady(),
        activityName: botConfig.activityName,
        activityTypeString: activityTypeString,
        status: botConfig.status,
        uptime: client.isReady() ? `${hours}h ${minutes}m ${seconds}s` : 'Starting up...',
        avatarUrl: client.user ? client.user.displayAvatarURL({ size: 256 }) : null,
        bannerUrl: client.user ? client.user.bannerURL({ size: 512 }) : null,
    };
}

// Broadcast function to push live updates to all open website visitors instantly
function broadcastStatusUpdate() {
    const payload = JSON.stringify(getStatusPayload());
    sseClients.forEach(client => client.write(`data: ${payload}\n\n`));
}

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
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildPresences
    ]
});

const TOKEN = process.env.TOKEN;

// Create a collection to hold commands dynamically
client.commands = new Collection();
const commandsArray = [];

// Load all command files from the ./commands folder
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

console.log('--- Loading Commands ---');

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        commandsArray.push(command.data.toJSON());
        console.log(`[LOADED] Command activated: /${command.data.name} (${file})`);
    } else {
        console.warn(`[WARNING] The command at ${filePath} is missing "data" or "execute".`);
    }
}

console.log(`--- Total Commands Loaded: ${client.commands.size} ---`);

// Register Commands Globally on Startup
client.once('ready', async () => {
    console.log(`ProtoBot v0.0.2 logged in as ${client.user.tag}!`);

    client.user.setPresence({
        activities: [
            {
                name: 'customstatus',
                type: ActivityType.Custom,
                state: 'Living my best life 🤖'
            },
            { 
                name: botConfig.activityName, 
                type: botConfig.activityType 
            }
        ],
        status: botConfig.status,
    });
    console.log(`[STATUS] Status set to: ${botConfig.status} | Playing: ${botConfig.activityName}`);

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

    const { user } = interaction;
    const senderName = `<@${user.id}>`;
    const targetUser = interaction.options.getUser('target');
    const recipientName = targetUser ? `<@${targetUser.id}>` : 'themselves';

    try {
        const selectedMessage = await command.execute(interaction, senderName, recipientName);

        if (selectedMessage) {
            const responseMessage = await interaction.reply({ content: selectedMessage, fetchReply: true });

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
        }

    } catch (error) {
        console.error(`Error executing ${interaction.commandName}:`, error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: 'There was an error executing this command!', ephemeral: true });
        }
    }
});

// Log into Discord
client.login(TOKEN);

// Export client and broadcast helper for external command use
module.exports = { client, broadcastStatusUpdate };
