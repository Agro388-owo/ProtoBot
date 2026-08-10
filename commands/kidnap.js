const { SlashCommandBuilder } = require('discord.js');

function getRandomMessage(array) {
    return array[Math.floor(Math.random() * array.length)];
}

// ----------------------------------------------------
// CONFIGURATION
// ----------------------------------------------------
// 1. Put your Discord User ID here (e.g., '123456789012345678')
const OWNER_ID = '1048579285687996466'; 

// 2. Toggle to enable/disable user restrictions (Only OWNER_ID can toggle this)
let ownerBypassToggle = true; // Set true to enforce ID restrictions, false to allow everyone

// 3. List of allowed Discord User IDs
// If empty ([]), EVERYONE is allowed to use the command regardless of the toggle!
const ALLOWED_USERS = [
     '1230079549123858507',
     '1048579285687996466'
];
// ----------------------------------------------------

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kidnap')
        .setDescription('Throw someone into the back of a unmarked van!')
        .setIntegrationTypes([0, 1]) // Guild & User App
        .setContexts([0, 1, 2])
        .addUserOption(option => 
            option.setName('target')
                  .setDescription('Who are you kidnapping?')
                  .setRequired(true)
        ),

    async execute(interaction, senderName, recipientName) {
        const executorId = interaction.user.id;

        // --- RESTRICTION CHECK ---
        // If ALLOWED_USERS is not empty AND restriction mode is active
        if (ALLOWED_USERS.length > 0 && ownerBypassToggle) {
            const isAllowed = ALLOWED_USERS.includes(executorId) || executorId === OWNER_ID;
            
            if (!isAllowed) {
                await interaction.reply({
                    content: '🔒 You do not have clearance to use this command!',
                    ephemeral: true // Private warning visible only to the runner
                });
                return null; // Prevents index.js from sending a public reply
            }
        }

        // --- MESSAGE VARIANTS ---
        const kidnapVariants = [
            `🚐 A black unmarked van pulled up, and ${senderName} shoved ${recipientName} into the trunk!`,
            `📦 ${senderName} threw a sack over ${recipientName}'s head and dragged them away!`,
            `🕳️ ${senderName} opened a trapdoor beneath ${recipientName}! Down they go!`,
            `🏷️ ${senderName} stuffed ${recipientName} into a oversized cardboard box and marked it "Return to Sender"!`,
            `🏎️ ${senderName} sped by on a motorcycle, scooped up ${recipientName}, and vanished into thin air!`
        ];

        return getRandomMessage(kidnapVariants);
    }
};
