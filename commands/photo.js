const { SlashCommandBuilder, AttachmentBuilder, MessageFlags } = require('discord.js');
const sharp = require('sharp');
const path = require('path');

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

    async execute(interaction) {
        await interaction.deferReply();

        const targetUser = interaction.options.getUser('user');
        const attachedImage = interaction.options.getAttachment('image');

        const isAttachedGif = attachedImage?.contentType?.includes('gif') || attachedImage?.url?.toLowerCase().endsWith('.gif');
        const target = targetUser || interaction.user;
        const isAvatarGif = target.avatar && target.avatar.startsWith('a_');

        let imageUrl;
        let isGif = false;

        if (attachedImage) {
            imageUrl = attachedImage.url;
            isGif = isAttachedGif;
        } else {
            isGif = isAvatarGif;
            imageUrl = target.displayAvatarURL({ extension: isGif ? 'gif' : 'png', size: 512, forceStatic: false });
        }

        try {
            // Fetch target image/GIF
            const res = await fetch(imageUrl);
            if (!res.ok) throw new Error(`Failed to fetch image: ${res.statusText}`);
            const userImgBuffer = Buffer.from(await res.arrayBuffer());

            const templatePath = path.join(__dirname, '../assets/polaroid.png');
            
            const templateMeta = await sharp(templatePath).metadata();
            const width = templateMeta.width;
            const height = templateMeta.height;

            const photoSize = Math.round(width * 0.38);
            const centerX = Math.round(width * 0.495);
            const centerY = Math.round(height * 0.435);
            const topLeftX = Math.round(centerX - photoSize / 2);
            const topLeftY = Math.round(centerY - photoSize / 2);

            if (isGif) {
                // Resize the user GIF to fit inside the polaroid frame
                const resizedGif = await sharp(userImgBuffer, { animated: true })
                    .resize(photoSize, photoSize, { fit: 'cover' })
                    .toBuffer();

                // Create full-sized canvas matching template dimensions, then layer GIF and template
                const finalGifBuffer = await sharp({
                    create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
                }, { animated: true })
                .composite([
                    { input: resizedGif, top: topLeftY, left: topLeftX, animated: true },
                    { input: templatePath, top: 0, left: 0 }
                ])
                .gif({ loop: 0 })
                .toBuffer();

                const attachment = new AttachmentBuilder(finalGifBuffer, { name: 'polaroid-photo.gif' });
                return await interaction.editReply({ files: [attachment] });

            } else {
                const processedUserImg = await sharp(userImgBuffer)
                    .resize(photoSize, photoSize, { fit: 'cover' })
                    .rotate(5.5, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
                    .toBuffer();

                const finalImageBuffer = await sharp({
                    create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
                })
                .composite([
                    { input: processedUserImg, top: topLeftY, left: topLeftX },
                    { input: templatePath, top: 0, left: 0 }
                ])
                .png()
                .toBuffer();

                const attachment = new AttachmentBuilder(finalImageBuffer, { name: 'polaroid-photo.png' });
                return await interaction.editReply({ files: [attachment] });
            }

        } catch (error) {
            console.error('PHOTO_COMMAND_ERROR:', error);
            
            try {
                await interaction.deleteReply();
                await interaction.followUp({
                    content: `❌ Could not process this image! (Check logs for: ${error.message}) <:Puropreocupado:1536430030916288572>`,
                    flags: MessageFlags.Ephemeral
                });
            } catch (followUpError) {
                console.error('Failed to send ephemeral error:', followUpError);
            }
        }
    }
};
