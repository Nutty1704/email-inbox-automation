export const priorityEmojis = {
    'URGENT': '🚨',
    'HIGH': '🔴',
    'MEDIUM': '🟡',
    'LOW': '🔵'
};


export const categoryEmojis = {
    'WORK': '💼',
    'PERSONAL': '👤',
    'MARKETING': '📢',
    'NEWSLETTER': '📰',
    'NOTIFICATION': '🔔',
    'SUPPORT': '🛠️'
}


export const typeEmojis = {
    'RESPONSE_NEEDED': '✋',
    'INFORMATIONAL': 'ℹ️',
    'URGENT': '⚡',
    'MEETING': '📅',
    'TASK': '✅'
}

export function getPriorityColor(priority) {
    const colors = {
        'URGENT': 0xFF0000,  // Red
        'HIGH': 0xFF6600,    // Orange
        'MEDIUM': 0xFFFF00,  // Yellow
        'LOW': 0x0099FF      // Blue
    };
    return colors[priority] || 0x808080; // Gray for unknown
}