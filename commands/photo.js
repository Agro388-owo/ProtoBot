const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const path = require('path');
const botConfig = require('../config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('photo')
        .setDescription('Puts a profile picture or image into a Changed polaroid frame!')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .addUserOption(option =>
            option.setName('user')
                  .setDescription('User whose avatar to use')
                  .setRequired(false)
        )
        .addAttachmentOption(option =>
            option.setName('image')
                  .setDescription('An image file to use')
                  .setRequired(false)
        ),

    async execute(interaction, senderName) {
        await interaction.deferReply();

        const targetUser = interaction.options.getUser('user');
        const attachedImage = interaction.options.getAttachment('image');

        // Resolve target image URL
        let imageUrl;
        if (attachedImage) {
            imageUrl = attachedImage.url;
        } else if (targetUser) {
            imageUrl = targetUser.displayAvatarURL({ extension: 'png', size: 512 });
        } else {
            imageUrl = interaction.user.displayAvatarURL({ extension: 'png', size: 512 });
        }

        try {
            // Load user image and template from the root assets folder
            const userImg = await loadImage(imageUrl);
            const templatePath = path.join(__dirname, '../assets/polaroid.png');
            const templateImg = await loadImage(templatePath);

            // Create canvas matching the template image resolution
            const canvas = createCanvas(templateImg.width, templateImg.height);
            const ctx = canvas.getContext('2d');

            // --- 1. Draw User Image (Positioned & Rotated to fit the frame) ---
            ctx.save();
            
            const centerX = templateImg.width * 0.495;
            const centerY = templateImg.height * 0.435;
            const photoSize = templateImg.width * 0.38; 

            ctx.translate(centerX, centerY);
            ctx.rotate(5.5 * (Math.PI / 180));

            ctx.drawImage(
                userImg, 
                -photoSize / 2, 
                -photoSize / 2, 
                photoSize, 
                photoSize
            );
            ctx.restore();

            // --- 2. Draw Polaroid Overlay Frame on Top ---
            ctx.drawImage(templateImg, 0, 0, templateImg.width, templateImg.height);

            // --- 3. Build & Send Attachment ---
            const buffer = await canvas.encode('png');
            const attachment = new AttachmentBuilder(buffer, { name: 'polaroid-photo.png' });

            await interaction.editReply({
                content: ``,
                files: [attachment]
            });

        } catch (error) {
            console.error('Failed to generate photo command:', error);
            await interaction.editReply({
                content: `❌ Could not load the image or template file. Ensure \`assets/polaroid.png\` exists in your root folder!`
            });
        }
    }
};
