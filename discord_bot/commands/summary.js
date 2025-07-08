import { SlashCommandBuilder } from "discord.js";
import supabase from "../config/database.js";
import { createCommandEmbed } from "../utils/embeds.js";

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
                    { name: 'LinkedIn', value: 'linkedin' }
                )
        ),

        async execute(interaction) {
            await interaction.deferReply();

            const filter = interaction.options.getString('filter') || 'all';

            try {
                let query = supabase
                    .from('email_summaries')
                    .select(`
                        *,
                        summary_sessions!inner(created_at, summary_text)    
                    `);

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

                const embed = createCommandEmbed(emails, filter);
                await interaction.editReply({ embeds: [embed] });
            } catch (error) {
                console.error('Command error:', error);
                await interaction.editReply('❌ Error fetching email summaries.');
            }
        }
}