import { EmbedBuilder } from "discord.js";
import { categoryEmojis, priorityEmojis, typeEmojis } from "./embeds/config.js";


export function createPaginatedEmailEmbed(emails, filter, page = 0) {
    const totalPages = emails.length + 1; // +1 for summary page
    
    if (page === 0) {
        // Summary page (first page)
        return createSummaryPageEmbed(emails, filter, totalPages);
    } else {
        // Individual email page
        const emailIndex = page - 1;
        const email = emails[emailIndex];
        return createEmailDetailEmbed(email, filter, page, totalPages);
    }
}

function createSummaryPageEmbed(emails, filter, totalPages) {
    const embed = new EmbedBuilder()
        .setTitle(`📧 Email Summary - ${filter.charAt(0).toUpperCase() + filter.slice(1)}`)
        .setColor(0x0099FF)
        .setTimestamp();
    
    if (emails.length === 0) {
        embed.setDescription('No emails found for this filter.');
        return embed;
    }
    
    const emailText = emails.map((email, index) => {
        const priorityEmoji = priorityEmojis[email.priority] || '⚪';
        
        return `${priorityEmoji} **${email.company || 'Unknown'}** - ${email.subject ? email.subject.substring(0, 40) + '...' : 'No subject'}`;
    }).join('\n');
    
    embed.setDescription(emailText);
    embed.setFooter({ text: `Page 1/${totalPages} • ${emails.length} emails • Use arrows to view details` });
    
    return embed;
}

function createEmailDetailEmbed(email, filter, currentPage, totalPages) {
    const priorityEmoji = priorityEmojis[email.priority] || '⚪';
    
    const categoryEmoji = categoryEmojis[email.category?.toLowerCase()] || '📧';
    
    const typeEmoji = typeEmojis[email.type?.toLowerCase()] || '📄';
    
    const embed = new EmbedBuilder()
        .setTitle(`${priorityEmoji} ${email.subject || 'No Subject'}`)
        .setColor(getPriorityColor(email.priority))
        .setTimestamp();
    
    // Main email details
    const fields = [
        { 
            name: '👤 Sender', 
            value: email.sender || 'Unknown', 
            inline: true 
        },
        { 
            name: '🏢 Company', 
            value: email.company || 'Unknown', 
            inline: true 
        },
        { 
            name: '📊 Priority', 
            value: `${priorityEmoji} ${email.priority || 'Unknown'}`, 
            inline: true 
        }
    ];

    // Add category if available
    if (email.category) {
        fields.push({ 
            name: '📂 Category', 
            value: `${categoryEmoji} ${email.category}`, 
            inline: true 
        });
    }

    // Add type if available
    if (email.type) {
        fields.push({ 
            name: '📋 Type', 
            value: `${typeEmoji} ${email.type}`, 
            inline: true 
        });
    }

    embed.addFields(fields);
    
    // Action needed section
    if (email.action_needed) {
        embed.addFields({
            name: '🎯 Action Needed',
            value: email.action_needed,
            inline: false
        });
    }
    
    embed.setFooter({ 
        text: `Page ${currentPage}/${totalPages} • Email ID: ${email.id || 'Unknown'}` 
    });
    
    return embed;
}

function getPriorityColor(priority) {
    const colors = {
        'URGENT': 0xFF0000,  // Red
        'HIGH': 0xFF6600,    // Orange
        'MEDIUM': 0xFFFF00,  // Yellow
        'LOW': 0x0099FF      // Blue
    };
    return colors[priority] || 0x808080; // Gray for unknown
}

export function createSummaryEmbed(sessionData, emails, title='New Email Summary') {
    const embed = {
        title: `📧 ${title}`,
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
            const priorityEmoji = priorityEmojis[email.priority] || '⚪';
            
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