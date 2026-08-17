const { Client, GatewayIntentBits, REST, Routes, Collection, ActivityType } = require('discord.js');
const express = require('express');
const fs = require('fs');
const path = require('path');
const botConfig = require('./config');
const { addClient, removeClient, broadcast } = require('./websocket');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

// SSE Endpoint for instant live website streaming
app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    addClient(res);

    req.on('close', () => {
        removeClient(res);
    });
});

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
        debugMode: botConfig.debugMode
    };
}

// 🟢 Continuous uptime ticker: Pushes live uptime to the website every second automatically!
setInterval(() => {
    if (client.isReady()) {
        broadcast(getStatusPayload());
    }
}, 1000);

app.listen(PORT, () => {
    console.log(`HTTP server listening on port ${PORT}`);
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildPresences
    ]
});

const TOKEN = process.env.TOKEN;
client.commands = new Collection();
const commandsArray = [];

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

// 🐙 GitHub Integration Helper to sync users.json to your repo
async function saveUsersToGitHub(jsonContent) {
    const owner = "Agro388-owo";
    const repo = "ProtoBot";
    const filePath = "users.json";
    const branch = "main";
    const token = botConfig.GITHUB_TOKEN || process.env.GITHUB_TOKEN;

    if (!token) {
        console.warn('[GITHUB SYNC] GITHUB_TOKEN not found. Skipping remote sync.');
        return;
    }

    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

    try {
        // 1. Fetch current file SHA if it exists on GitHub
        let sha = null;
        const getRes = await fetch(apiUrl, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "User-Agent": "ProtoBot-UserLogger"
            }
        });

        if (getRes.ok) {
            const fileData = await getRes.json();
            sha = fileData.sha;
        }

        // 2. Commit updated JSON content to GitHub
        const contentEncoded = Buffer.from(jsonContent).toString('base64');
        const putRes = await fetch(apiUrl, {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
                "User-Agent": "ProtoBot-UserLogger"
            },
            body: JSON.stringify({
                message: "update: Sync users.json database",
                content: contentEncoded,
                sha: sha,
                branch: branch
            })
        });

        if (putRes.ok) {
            console.log('[GITHUB SYNC] Successfully updated users.json on GitHub!');
        } else {
            const errBody = await putRes.text();
            console.error('[GITHUB SYNC ERROR] GitHub API responded with:', errBody);
        }
    } catch (err) {
        console.error('[GITHUB SYNC ERROR] Failed pushing to GitHub:', err);
    }
}

// 📝 Helper function to load, sync, and log users to users.json (Local + GitHub)
async function syncAndLogUsers(currentUser = null) {
    const filePath = path.join(__dirname, 'users.json');
    let usersData = [];

    try {
        if (fs.existsSync(filePath)) {
            const rawData = fs.readFileSync(filePath, 'utf8');
            if (rawData.trim()) {
                usersData = JSON.parse(rawData);
            }
        }

        const processUser = (user, isCommandUser = false) => {
            if (!user || user.bot) return;

            const existingIndex = usersData.findIndex(u => u.id === user.id);
            const isStillActive = client.users.cache.has(user.id);
            const statusText = isStillActive ? 'Active (Reachable)' : 'Inactive';

            if (existingIndex !== -1) {
                usersData[existingIndex].tag = user.tag;
                usersData[existingIndex].username = user.username;
                usersData[existingIndex].status = statusText;
                if (isCommandUser) {
                    usersData[existingIndex].lastSeen = new Date().toISOString();
                }
            } else {
                usersData.push({
                    id: user.id,
                    username: user.username,
                    tag: user.tag,
                    status: statusText,
                    firstSeen: new Date().toISOString(),
                    lastSeen: new Date().toISOString()
                });
                console.log(`[USER LOGGER] Recorded user: ${user.tag} (${user.id})`);
            }
        };

        // 1. Process active command user immediately
        if (currentUser) {
            processUser(currentUser, true);
        }

        // 2. Scan cached members across shared servers
        client.guilds.cache.forEach(guild => {
            guild.members.cache.forEach(member => {
                processUser(member.user, false);
            });
        });

        const formattedJson = JSON.stringify(usersData, null, 2);

        // Save locally
        fs.writeFileSync(filePath, formattedJson, 'utf8');

        // Sync directly to GitHub repository
        await saveUsersToGitHub(formattedJson);

    } catch (err) {
        console.error('[USER LOGGER ERROR] Failed to update users.json:', err);
    }
}

client.once('ready', async () => {
    console.log(`ProtoBot logged in as ${client.user.tag}!`);

    // 📝 Scan and sync existing users to users.json on startup
    await syncAndLogUsers();

    client.user.setPresence({
        activities: [
            { 
                name: 'customstatus', 
                type: ActivityType.Custom, 
                state: botConfig.debugMode ? '🛠️ Debug Mode Active' : botConfig.customStatus 
            },
            { name: botConfig.activityName, type: botConfig.activityType }
        ],
        status: botConfig.status,
    });

    if (!TOKEN) {
        console.error('ERROR: TOKEN environment variable is missing!');
        return;
    }

    const rest = new REST({ version: '10' }).setToken(TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commandsArray });
        console.log('Slash commands registered successfully!');
    } catch (error) {
        console.error('Failed to register commands:', error);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    // 📝 Automatically log/update command user in users.json & sync to GitHub
    syncAndLogUsers(interaction.user).catch(err => console.error(err));

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    const { user } = interaction;
    const senderName = `<@${user.id}>`;
    const targetUser = interaction.options.getUser('target');
    const recipientName = targetUser ? `<@${targetUser.id}>` : 'themselves';

    if (botConfig.debugMode) {
        console.log(`[DEBUG TRACE] User ${user.tag} (${user.id}) executed /${interaction.commandName}`);
    }

    try {
        let selectedMessage = await command.execute(interaction, senderName, recipientName);

        // 🛠️ ONLY trigger number suffix matching if debugMode is enabled!
        if (botConfig.debugMode) {
            for (const [optName, optVal] of interaction.options.data.entries?.() || []) {
                if (typeof optVal.value === 'string' && /^\d+$/.test(optVal.value.trim())) {
                    const numericCode = parseInt(optVal.value.trim(), 10);
                    selectedMessage += `\n🔢 **[Debug Number Match]:** Recognized sequence ID **#${numericCode}** from option \`${optVal.name}\`.`;
                }
            }
        }

        if (selectedMessage) {
            const response = await interaction.reply({ content: selectedMessage, withResponse: true });
            const responseMessage = response.resource ? response.resource.message : response;

            if (responseMessage && typeof responseMessage.createReactionCollector === 'function') {
                const filter = (reaction, reactUser) => {
                    return (reaction.emoji.name === '❌' || reaction.emoji.name === '✖️') && reactUser.id === user.id;
                };

                const collector = responseMessage.createReactionCollector({ filter, time: 60000 });
                collector.on('collect', async () => {
                    try { await interaction.deleteReply(); } catch (e) {}
                });
            }
        }
    } catch (error) {
        console.error(`Error executing ${interaction.commandName}:`, error);
        if (botConfig.debugMode) {
            await interaction.reply({ content: `🛠️ **[DEBUG ERROR TRACE]:** \`\`\`${error.stack}\`\`\``, flags: 64 });
        } else if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: 'There was an error executing this command!', flags: 64 });
        }
    }
});

client.login(TOKEN);
