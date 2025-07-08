import { REST, Routes, Collection } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


export async function loadCommands(client){
    client.commands = new Collection();
    const commands = [];

    const commandsPath = path.join(__dirname, '../commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles){
        const { default: command } = await import(`../commands/${file}`);
        client.commands.set(command.data.name, command);
        commands.push(command.data.toJSON());
    }

    return commands;
}


export async function registerCommands(commands) {
    const rest = new REST().setToken(process.env.DISCORD_TOKEN);
    
    try {
        console.log('Refreshing application commands...');
        
        await rest.put(
            Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
            { body: commands }
        );
        
        console.log('Successfully registered application commands.');
    } catch (error) {
        console.error('Error registering commands:', error);
    }
}
