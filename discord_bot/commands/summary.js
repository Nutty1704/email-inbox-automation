import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import supabase from "../config/database.js";
import { createSummaryEmbed, createPaginatedEmailEmbed } from "../utils/embeds.js";
import { getEmailsBySession } from "../utils/db-utils.js";

export default {
    data: new SlashCommandBuilder()
        .setName('summary')
        .setDescription('Get email summaries')
        .addStringOption(option =>
            option.setName('filter')
                .setDescription('Filter type')
                .setRequired(false)
                .addChoices(
                    { name: 'Urgent', value: 'urgent' },
                    { name: 'High Priority', value: 'high' },
                    { name: 'Medium Priority', value: 'medium' },
                    { name: 'Low Priority', value: 'low' },
                    { name: 'Today', value: 'today' },
                    { name: 'Job Emails', value: 'job' },
                    { name: 'LinkedIn', value: 'linkedin' },
                    { name: 'Last Summary', value: 'last' }
                )
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const filter = interaction.options.getString('filter') || 'all';

        // Handle 'last' filter separately (non-paginated)
        if (filter === 'last') {
            try {
                const { data: summary, error } = await supabase
                    .from('summary_sessions')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(1);

                if (error) throw error;

                const { emails, error: emailsError } = await getEmailsBySession(summary[0].id);

                if (emailsError) throw emailsError;

                const embed = createSummaryEmbed(summary[0], emails, 'Last Session Summary');
                await interaction.editReply({ embeds: [embed] });
                return;

            } catch (error) {
                console.error('Command error:', error);
                await interaction.editReply('❌ Error fetching summary.');
                return;
            }
        }

        // Handle paginated email summaries
        try {
            let query = supabase
                .from('email_summaries')
                .select('*');

            // Apply filters
            switch (filter) {
                case 'urgent':
                    query = query.eq('priority', 'URGENT');
                    break;
                case 'high':
                    query = query.eq('priority', 'HIGH');
                    break;
                case 'medium':
                    query = query.eq('priority', 'MEDIUM');
                    break;
                case 'low':
                    query = query.eq('priority', 'LOW');
                    break;
                case 'job':
                    query = query.eq('category', 'job');
                    break;
                case 'linkedin':
                    query = query.eq('category', 'linkedin');
                    break;
                case 'today':
                    const today = new Date().toISOString().split('T')[0];
                    query = query.gte('created_at', today);
                    break;
            }

            const { data: emails, error } = await query
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) throw error;

            const priorityOrder = { 'URGENT': 1, 'HIGH': 2, 'MEDIUM': 3, 'LOW': 4 };
            emails.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

            // Use the paginated system
            await handlePaginatedEmails(interaction, emails, filter);

        } catch (error) {
            console.error('Command error:', error);
            await interaction.editReply('❌ Error fetching email summaries.');
        }
    }
}

async function handlePaginatedEmails(interaction, emails, filter) {
    let currentPage = 0;
    const totalPages = emails.length + 1; // +1 for summary page

    const embed = createPaginatedEmailEmbed(emails, filter, currentPage);
    
    // Create navigation buttons (only if there are emails to paginate)
    let components = [];
    if (emails.length > 0) {
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('prev')
                    .setLabel('◀️ Previous')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentPage === 0),
                new ButtonBuilder()
                    .setCustomId('next')
                    .setLabel('Next ▶️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentPage === totalPages - 1)
            );
        components = [row];
    }
    
    const response = await interaction.editReply({
        embeds: [embed],
        components: components
    });
    
    // Only set up collector if there are emails to paginate
    if (emails.length === 0) return;
    
    // Handle button interactions
    const collector = response.createMessageComponentCollector({
        time: 60 * 2 * 1000, // 2 minutes timeout
    });
    
    collector.on('collect', async (buttonInteraction) => {
        // Check if the user who clicked is the same as who ran the command
        if (buttonInteraction.user.id !== interaction.user.id) {
            await buttonInteraction.reply({
                content: 'You can only navigate your own email summaries!',
                ephemeral: true
            });
            return;
        }

        if (buttonInteraction.customId === 'prev') {
            currentPage = Math.max(0, currentPage - 1);
        } else if (buttonInteraction.customId === 'next') {
            currentPage = Math.min(totalPages - 1, currentPage + 1);
        }
        
        const newEmbed = createPaginatedEmailEmbed(emails, filter, currentPage);
        
        const newRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('prev')
                    .setLabel('◀️ Previous')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentPage === 0),
                new ButtonBuilder()
                    .setCustomId('next')
                    .setLabel('Next ▶️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentPage === totalPages - 1)
            );
        
        await buttonInteraction.update({
            embeds: [newEmbed],
            components: [newRow]
        });
    });
    
    collector.on('end', async () => {
        // Disable buttons after timeout
        const disabledRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('prev')
                    .setLabel('◀️ Previous')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('next')
                    .setLabel('Next ▶️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true)
            );
        
        try {
            await interaction.editReply({
                components: [disabledRow]
            });
        } catch (error) {
            // Message might have been deleted
            console.log('Could not disable buttons - message may have been deleted');
        }
    });
}