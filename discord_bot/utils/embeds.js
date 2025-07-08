import { EmbedBuilder } from "discord.js";

export function createSummaryEmbed(sessionData, emails) {
    const embed = {
        title: '📧 New Email Summary',
        description: sessionData.summary_text || 'Email summary generated',
        color: sessionData.urgent_count > 0 ? 0xFF0000 : 0x00FF00, // Red if urgent, green otherwise
        timestamp: new Date().toISOString(),
        fields: [
            {
                name: '📊 Summary Stats',
                value: `**Total:** ${sessionData.total_professional_emails}\n**Job Emails:** ${sessionData.job_emails}\n**Urgent:** ${sessionData.urgent_count}`,
                inline: true
            }
        ]
    };

    // Add individual emails (limit to top 5 for readability)
    if (emails && emails.length > 0) {
        const topEmails = emails.slice(0, 5);
        const emailText = topEmails.map(email => {
            const priorityEmoji = {
                'URGENT': '🚨',
                'HIGH': '🔴',
                'MEDIUM': '🟡',
                'LOW': '🔵'
            }[email.priority] || '⚪';
            
            return `${priorityEmoji} **${email.company}** - ${email.subject.substring(0, 50)}${email.subject.length > 50 ? '...' : ''}`;
        }).join('\n');

        embed.fields.push({
            name: `📋 Professional Emails (${emails.length})`,
            value: emailText + (emails.length > 5 ? `\n*... and ${emails.length - 5} more*` : ''),
            inline: false
        });
    }

    return embed;
}


export function createCommandEmbed(emails, filter) {
    const embed = new EmbedBuilder()
        .setTitle(`📧 Email Summary - ${filter.charAt(0).toUpperCase() + filter.slice(1)}`)
        .setColor(0x0099FF)
        .setTimestamp();
    
    if (emails.length === 0) {
        embed.setDescription('No emails found for this filter.');
        return embed;
    }
    
    const emailText = emails.map(email => {
        const priorityEmoji = {
            'URGENT': '🚨',
            'HIGH': '🔴', 
            'MEDIUM': '🟡',
            'LOW': '🔵'
        }[email.priority] || '⚪';
        
        return `${priorityEmoji} **${email.company}** - ${email.subject.substring(0, 40)}...`;
    }).join('\n');
    
    embed.setDescription(emailText);
    embed.setFooter({ text: `Showing ${emails.length} emails` });
    
    return embed;
}