const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
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

        // Check if the source is animated
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
            // Fetch input image buffer
            const res = await fetch(imageUrl);
            if (!res.ok) throw new Error('Failed to fetch target image');
            const userImgBuffer = Buffer.from(await res.arrayBuffer());

            const templatePath = path.join(__dirname, '../assets/polaroid.png');

            // Template dimensions & composition coordinates
            const templateMeta = await sharp(templatePath).metadata();
            const width = templateMeta.width;
            const height = templateMeta.height;

            const photoSize = Math.round(width * 0.38);
            const centerX = Math.round(width * 0.495);
            const centerY = Math.round(height * 0.435);

            // Compute top-left placement box for composite
            const topLeftX = Math.round(centerX - photoSize / 2);
            const topLeftY = Math.round(centerY - photoSize / 2);

            if (isGif) {
                // Resize animated user GIF frame-by-frame & rotate
                const processedUserGif = await sharp(userImgBuffer, { animated: true })
                    .resize(photoSize, photoSize, { fit: 'cover' })
                    .rotate(5.5, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
                    .toBuffer();

                // Composite the template frame overlay over the animated GIF
                const finalGifBuffer = await sharp(processedUserGif, { animated: true })
                    .extend({
                        top: topLeftY,
                        bottom: Math.max(0, height - (topLeftY + photoSize)),
                        left: topLeftX,
                        right: Math.max(0, width - (topLeftX + photoSize)),
                        background: { r: 0, g: 0, b: 0, alpha: 0 }
                    })
                    .composite([{
                        input: templatePath,
                        top: 0,
                        left: 0
                    }])
                    .gif()
                    .toBuffer();

                const attachment = new AttachmentBuilder(finalGifBuffer, { name: 'polaroid-photo.gif' });
                return await interaction.editReply({ files: [attachment] });

            } else {
                // Static image workflow
                const processedUserImg = await sharp(userImgBuffer)
                    .resize(photoSize, photoSize, { fit: 'cover' })
                    .rotate(5.5, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
                    .toBuffer();

                const finalImageBuffer = await sharp({
                    create: {
                        width: width,
                        height: height,
                        channels: 4,
                        background: { r: 0, g: 0, b: 0, alpha: 0 }
                    }
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
            console.error('Failed to generate photo command:', error);
            await interaction.editReply({
                content: `❌ Could not process this image or GIF! <:Puropreocupado:1536430030916288572>`
            });
        }
    }
};
