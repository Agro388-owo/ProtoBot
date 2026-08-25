const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { CREDIT } = require('./credits.js');

const creditsFilePath = path.join(__dirname, '../credits.json');

function getDB() {
    if (fs.existsSync(creditsFilePath)) {
        try { return JSON.parse(fs.readFileSync(creditsFilePath, 'utf8') || '{}'); } catch (e) {}
    }
    return {};
}

function saveDB(db) {
    fs.writeFileSync(creditsFilePath, JSON.stringify(db, null, 2), 'utf8');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lottery')
        .setDescription('Lottery system with custom prizes and RNG rolls!')
        .addSubcommand(subcommand =>
            subcommand
                .setName('buy')
                .setDescription('Roll a lottery ticket!')
                .addStringOption(option =>
                    option.setName('ticket_type')
                          .setDescription('Choose what type of ticket to buy')
                          .setRequired(true)
                          .addChoices(
                              { name: 'Lottery Ticket (Costs 50 Credits - Win Jackpot)', value: 'credit_ticket' },
                              { name: 'RAM Ticket (Free - Try to win RAM)', value: 'ram_ticket' },
                              { name: 'Microchip Ticket (Free - Try to win Microchips)', value: 'chip_ticket' },
                              { name: 'Fun Ticket (Free - Pure RNG Roll)', value: 'fun_ticket' }
                          )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('prizes')
                .setDescription('View the available prize pool and species-specific snacks!')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const user = interaction.user;
        const member = interaction.member;

        const isVisorBeast = member?.roles?.cache?.some(role => 
            /protogen|primagen|synth/i.test(role.name)
        ) || /protogen|primagen|synth/i.test(member?.displayName || user.username);

        if (subcommand === 'prizes') {
            return await interaction.reply({
                content: `${CREDIT} **-- LOTTERY PRIZE POOL --** ${CREDIT}\n` +
                       `• <:purocute:1536367584369180803> **Grand Jackpot:** 1,000,000 ${CREDIT} *(1 in 500,000)* — *Paid Ticket Only*\n` +
                       `• <:Ram:1541508957216964668> **Cyber Tier:** Overclocked DDR5 RAM Stick *(1 in 500)* — *Free*\n` +
                       `• <:protogenirl:1536430038751121499> **Hardware Tier:** Box of Crunchy Microchips *(1 in 100)* — *Free*\n` +
                       `• <:Puro_Blush6:1536430029104353380> **Consolation:** 50 ${CREDIT} *(1 in 100)* — *Paid Ticket Only*\n\n` +
                       `*Ticket Cost:* **50** ${CREDIT} for Credit Ticket`
            });
        }

        if (subcommand === 'buy') {
            const ticketType = interaction.options.getString('ticket_type');
            const db = getDB();

            if (!db[user.id]) db[user.id] = { balance: 100, lastDaily: null };

            // 1. CREDIT LOTTERY TICKET (Consumes Balance)
            if (ticketType === 'credit_ticket') {
                const TICKET_COST = 50;

                if (db[user.id].balance < TICKET_COST) {
                    return await interaction.reply({
                        content: `<:puronervous2:1538551211207430234> You don't have enough to buy a credit ticket! (Cost: **${TICKET_COST}** ${CREDIT} | Balance: **${db[user.id].balance}** ${CREDIT})`
                    });
                }

                db[user.id].balance -= TICKET_COST;

                const ODDS = 500000;
                const roll = Math.floor(Math.random() * ODDS) + 1;

                if (roll === 77777) {
                    const prize = 1000000;
                    db[user.id].balance += prize;
                    saveDB(db);
                    return await interaction.reply({
                        content: `<:purocute:1536367584369180803> **<@${user.id}>** HIT THE **1 IN 500,000 GRAND JACKPOT**! You won **1,000,000** ${CREDIT}! <:Puroadorable:1536364133392457818>`
                    });
                }

                if (roll % 100 === 0) {
                    const prize = 50;
                    db[user.id].balance += prize;
                    saveDB(db);
                    return await interaction.reply({
                        content: `${CREDIT} **<@${user.id}>** rolled **#${roll.toLocaleString()}** and won back their **50** ${CREDIT}! <:purocute:1536367584369180803>`
                    });
                }

                saveDB(db);
                return await interaction.reply({
                    content: `<:thing:1537616433171796149> **<@${user.id}>** bought a Credit Lottery Ticket for 50 ${CREDIT}... and rolled **#${roll.toLocaleString()}** out of **500,000**.\nRemaining Balance: **${db[user.id].balance}** ${CREDIT}. <:puronervous:1536367581995335750>`
                });
            }

            // 2. FUN TICKETS (Free - No Credits Used)
            if (ticketType === 'ram_ticket') {
                const roll = Math.floor(Math.random() * 500) + 1;
                if (roll === 500) {
                    const snackMsg = isVisorBeast 
                        ? `*(You try not to eat it immediately... but it looks delicious! <:Ram:1541508957216964668><:Sus:1541509245499875439>)*` 
                        : `*(Keep it away from local protogens! <:NoRamForU:1541510983908987031>)*`;
                    return await interaction.reply({
                        content: `<:Ram:1541508957216964668> **<@${user.id}>** rolled **#${roll}/500** on their RAM Ticket and won an **[Ultra-Fast DDR5 64GB RAM Stick]**! ${snackMsg}`
                    });
                }
                return await interaction.reply({
                    content: `<:puronervous:1536367581995335750> **<@${user.id}>** rolled **#${roll}/500** on a RAM Ticket... No RAM this time!`
                });
            }

            if (ticketType === 'chip_ticket') {
                const roll = Math.floor(Math.random() * 100) + 1;
                if (roll === 100) {
                    const snackMsg = isVisorBeast 
                        ? `*(Crunchy microchips! A perfect snack. <:protogenirl:1536430038751121499><:Puro_Blush6:1536430029104353380>)*` 
                        : `*(Looks useful for circuit work!)*`;
                    return await interaction.reply({
                        content: `<:protogenirl:1536430038751121499> **<@${user.id}>** rolled **#${roll}/100** on their Microchip Ticket and won a **[Crispy Microchip Pack]**! ${snackMsg}`
                    });
                }
                return await interaction.reply({
                    content: `<:thing:1537616433171796149> **<@${user.id}>** rolled **#${roll}/100** on a Microchip Ticket... Empty wrapper!`
                });
            }

            if (ticketType === 'fun_ticket') {
                const MIN = 1;
                const MAX = 1000000;
                const randomNumber = Math.floor(Math.random() * (MAX - MIN + 1)) + MIN;

                return await interaction.reply({
                    content: `<:Goober:1538666294948270190> **<@${user.id}>** got number: **#${randomNumber.toLocaleString()}**! <:Puroadorable:1536364133392457818>`
                });
            }
        }
    }
};
