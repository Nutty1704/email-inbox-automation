import 'dotenv/config';

import { Client, GatewayIntentBits } from 'discord.js';
import { setupRealtimeSubscription } from './utils/dbSubscription.js';
import { loadCommands, registerCommands } from './handlers/commandHandlers.js';


const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages]
});

client.once('ready', async () => {
    console.log("Bot is online!");

    const commands = await loadCommands(client);
    await registerCommands(commands);

    const user_id = process.env.DISCORD_USER_ID;
    const user = await client.users.fetch(user_id);
    
    setupRealtimeSubscription(user);
});


// Handle slash commands
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    
    try {
        await command.execute(interaction);
    } catch (error) {
        console.error('Command execution error:', error);
    }
});

client.login(process.env.DISCORD_TOKEN);