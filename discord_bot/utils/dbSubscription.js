import supabase from "../config/database.js";
import { createSummaryEmbed } from "./embeds.js";

export async function maintainRealtimeConnection(user) {
    console.log('Setting up real-time subscription...');
    while (true) {
        try {
            const result = await setupRealtimeSubscription(user);

            if (result === 'CHANNEL_ERROR') {
                await new Promise(resolve => setTimeout(resolve, 1000)); // try again in 1 second
            }

        } catch (error) {
            console.error('Unexpected error in subscription loop:', error);
            await new Promise(resolve => setTimeout(resolve, 5000)); // try again in 5 seconds
        }
    }
}

async function setupRealtimeSubscription(user) {
    const channel = supabase.channel('summary_sessions');

    return new Promise((resolve) => {
        const subscription = channel
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
                } else if (status === 'CHANNEL_ERROR') {
                    supabase.removeChannel(channel);
                    resolve('CHANNEL_ERROR');
                }
            });
    })
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