import supabase from "../config/database.js";
import { createSummaryEmbed } from "./embeds.js";


export function setupRealtimeSubscription(user) {
    console.log('Setting up real-time subscription...');
    
    const subscription = supabase
        .channel('summary_sessions')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'summary_sessions'
        }, async (payload) => {            
            // Send notification to user
            setTimeout(async () => {
                await handleNewSummary(user, payload.new);
            }, 60000);
        })
        .subscribe((status) => {
            console.log('Subscription status:', status);
            if (status === 'SUBSCRIBED') {
                console.log('Real-time subscription active!');
            }
        });
}

async function handleNewSummary(user, sessionData) {
    try {
        // Get the email summaries for this session
        const { data: emails, error } = await supabase
            .from('email_summaries')
            .select('*')
            .eq('session_id', sessionData.id);

        if (emails) {
            const priorityOrder = { 'URGENT': 1, 'HIGH': 2, 'MEDIUM': 3, 'LOW': 4 };
            emails.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
        }

        if (error) {
            console.error('Error fetching emails:', error);
            return;
        }

        // Create Discord embed
        const embed = createSummaryEmbed(sessionData, emails);
        
        // Send to user
        await user.send({ embeds: [embed] });
        
        console.log(`Sent summary notification with ${emails.length} emails`);
        
    } catch (error) {
        console.error('Error handling new summary:', error);
    }
}