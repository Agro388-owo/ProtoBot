const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { execSync } = require('child_process');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('changelog')
        .setDescription('Display the 5 latest Git commits and updates')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2]),

    async execute(interaction) {
        await interaction.deferReply({ flags: 64 });

        try {
            // Fetch last 5 commits formatted as: Hash | Author | Relative Date | Subject
            const gitLogOutput = execSync('git log -n 5 --pretty=format:"%h|%an|%ar|%s"', { encoding: 'utf8' }).trim();

            if (!gitLogOutput) {
                await interaction.editReply({ content: '⚠️ No Git commit history found in this repository.' });
                return true;
            }

            const commitLines = gitLogOutput.split('\n');
            const embed = new EmbedBuilder()
                .setTitle('📜 Recent Changelog & Updates')
                .setColor(0x00FF88)
                .setTimestamp();

            const formattedCommits = commitLines.map(line => {
                const [hash, author, date, message] = line.split('|');
                return `\`${hash}\` **${message}**\n> 👤 *${author}* • ${date}`;
            }).join('\n\n');

            embed.setDescription(formattedCommits);

            await interaction.editReply({ embeds: [embed] });
            return true;
        } catch (err) {
            console.error('Error fetching git log:', err);
            await interaction.editReply({ content: '❌ Failed to retrieve Git log history. Ensure Git is installed and `.git` repository folder exists.' });
            return true;
        }
    }
};
