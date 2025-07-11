import { categoryEmojis, getPriorityColor, priorityEmojis, typeEmojis } from "./config";

export function createPaginatedEmailEmbed(emails, filter, page = 0) {
    const totalPages = emails.length + 1; // +1 for summary page
    
    if (page === 0) {
        // Summary page (first page)
        return createSummaryEmbed(emails, filter, totalPages);
    } else {
        // Individual email page
        const emailIndex = page - 1;
        const email = emails[emailIndex];
        return createEmailDetailEmbed(email, filter, page, totalPages);
    }
}

function createSummaryEmbed(emails, filter, totalPages) {
    const embed = new EmbedBuilder()
        .setTitle(`📧 Email Summary - ${filter.charAt(0).toUpperCase() + filter.slice(1)}`)
        .setColor(0x0099FF) // Blue
        .setTimestamp();
    
    if (emails.length === 0) {
        embed.setDescription('No emails found for this filter.');
        return embed;
    }
    
    const emailText = emails.map((email, index) => {
        const priorityEmoji = priorityEmojis[email.priority] || '⚪';
        
        return `${priorityEmoji} **${email.company}** - ${email.subject.substring(0, 40)}...`;
    }).join('\n');
    
    embed.setDescription(emailText);
    embed.setFooter({ text: `Page 1/${totalPages} • ${emails.length} emails • Use arrows to view details` });
    
    return embed;
}

function createEmailDetailEmbed(email, filter, currentPage, totalPages) {
    const categoryEmoji = categoryEmojis[email.category] || '📧';
    
    const typeEmoji = typeEmojis[email.type] || '📄';
    
    const embed = new EmbedBuilder()
        .setTitle(`${priorityEmoji} ${email.subject}`)
        .setColor(getPriorityColor(email.priority))
        .setTimestamp();
    
    // Main email details
    embed.addFields(
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
            value: `${priorityEmoji} ${email.priority}`, 
            inline: true 
        },
        { 
            name: '📂 Category', 
            value: `${categoryEmoji} ${email.category}`, 
            inline: true 
        },
        { 
            name: '📋 Type', 
            value: `${typeEmoji} ${email.type}`, 
            inline: true 
        },
        { 
            name: '⏰ Received', 
            value: formatDate(email.created_at), 
            inline: true 
        }
    );
    
    // Action needed section
    if (email.action_needed) {
        embed.addFields({
            name: '🎯 Action Needed',
            value: email.action_needed,
            inline: false
        });
    }
    
    embed.setFooter({ 
        text: `Page ${currentPage}/${totalPages} • Email ID: ${email.id}` 
    });
    
    return embed;
}

function formatDate(dateString) {
    if (!dateString) return 'Unknown';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return dateString;
    }
}

// Usage example with pagination controls
export async function handleEmailCommand(interaction, emails, filter) {
    let currentPage = 0;
    const totalPages = emails.length + 1;
    
    const embed = createPaginatedEmailEmbed(emails, filter, currentPage);
    
    // Create navigation buttons
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
    
    const response = await interaction.reply({
        embeds: [embed],
        components: [row],
        ephemeral: true
    });
    
    // Handle button interactions
    const collector = response.createMessageComponentCollector({
        time: 60000 // 1 minute timeout
    });
    
    collector.on('collect', async (buttonInteraction) => {
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
            await response.edit({
                components: [disabledRow]
            });
        } catch (error) {
            // Message might have been deleted
        }
    });
}