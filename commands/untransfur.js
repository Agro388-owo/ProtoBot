const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const tagsFilePath = path.join(__dirname, '../tags.json');

function getTagsDB() {
    if (fs.existsSync(tagsFilePath)) {
        try {
            const raw = fs.readFileSync(tagsFilePath, 'utf8') || '{}';
            return JSON.parse(raw);
        } catch (e) {
            console.error('Failed to load tags.json:', e);
        }
    }
    return {};
}

function saveTagsDB(db) {
    fs.writeFileSync(tagsFilePath, JSON.stringify(db, null, 2), 'utf8');
}

function clearTransfurTagsOnly(userId) {
    const db = getTagsDB();
    if (!db[userId]) return false;

    // Check if user has transfurTags stored
    const hadTransfurTags = db[userId].transfurTags && db[userId].transfurTags.length > 0;

    if (hadTransfurTags) {
        db[userId].transfurTags = [];
        
        // Clean up empty object if no other userTags remain
        if ((!db[userId].userTags || db[userId].userTags.length === 0)) {
            delete db[userId];
        }

        saveTagsDB(db);
        return true;
    }

    return false;
}

function getRandomMessage(array) {
    return array[Math.floor(Math.random() * array.length)];
}

const untransfurSelfMessages = [
    "${senderName} stepped into the decontamination shower and washed off all transfur remnants!",
    "${senderName} used a solvent spray and stripped away their transfur traits, returning to normal!"
];

const untransfurOtherMessages = [
    "${senderName} sprayed ${targetDisplayName} with a high-grade solvent, washing away all transfur tags!",
    "${senderName} pushed ${targetDisplayName} through the emergency decontamination gate, restoring their original form!"
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('untransfur')
        .setDescription('Cleanse transfur tags and restore a user to their original form!')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .addUserOption(option => 
            option.setName('target')
                  .setDescription('Who is getting cleansed? (Leave empty to untransfur yourself)')
                  .setRequired(false)
        ),

    async execute(interaction, senderName, recipientName) {
        const targetUser = interaction.options.getUser('target') || interaction.user;
        const targetDisplayName = targetUser.id === interaction.user.id ? senderName : (recipientName || `<@${targetUser.id}>`);

        // Only removes the tags stored inside the transfurTags array
        const hadTags = clearTransfurTagsOnly(targetUser.id);

        if (interaction.user.id === targetUser.id) {
            const template = getRandomMessage(untransfurSelfMessages);
            const msg = template.replace('${senderName}', senderName);
            return hadTags 
                ? `${msg} ✨ *(Transfur tags removed)*` 
                : `${senderName} tried to untransfur, but they don't have any active transfur tags!`;
        } else {
            const template = getRandomMessage(untransfurOtherMessages);
            const msg = template.replace('${senderName}', senderName).replace('${targetDisplayName}', targetDisplayName);
            return hadTags 
                ? `${msg} ✨ *(Transfur tags removed)*` 
                : `${targetDisplayName} doesn't have any active transfur tags to cleanse!`;
        }
    }
};
