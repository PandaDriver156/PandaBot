import * as fs from "fs";
import { CollectorFilter, Guild, GuildMember, TextChannel } from "discord.js";
import * as utility from "../utility";
import { AccessLevels, BaseCommand, Message } from "../types";

export default class BackupCommand implements BaseCommand
{
    async execute(message: Message, args: string[])
    {
        const action = args[0];
        switch (action)
        {
            case "create":
                const guildData = utility.getGuildData(message.guild);
                const info = {
                    author: message.author.id,
                    guild: message.guild.id,
                    createdAt: Date.now()
                };
                const iconUrl = message.guild.iconURL({ format: 'png' });

                if (!fs.existsSync('backups'))
                    fs.mkdirSync('backups');

                const backupHash = utility.generateRandomString(16);
                const backupDir = `backups/${backupHash}`;
                fs.mkdirSync(backupDir);
                fs.writeFileSync(`${backupDir}/data.json`, JSON.stringify(guildData, null, 4));
                fs.writeFileSync(`${backupDir}/info.json`, JSON.stringify(info, null, 4));
                if (iconUrl)
                {
                    const icon = await utility.getFromUrl(iconUrl);
                    const iconExtension = iconUrl.split('.').pop();
                    fs.writeFileSync(`${backupDir}/icon.${iconExtension}`, icon);
                }

                message.react("✅").catch(() => { });
                try
                {
                    await message.author.send(backupHash);
                    await message.author.send(
                        `This is your backup code. You can restore it on your servers by typing: \`${message.client.commander.prefix}backup restore ${backupHash}\``
                    );
                }
                catch
                {

                    message.channel.send(":question: Failed to sent you the backup code. You probably disabled receiving DMs from this server.");
                }
                break;
            case "load":
            case "restore":
                if (message.author.id !== message.guild.ownerID) return message.channel.send(":x: Only the owner of a server can restore a backup.");
                if (!message.guild.me.permissions.has('ADMINISTRATOR')) return message.channel.send(":x: I need Administrator permissions to restore a backup.");
                const backup = args[1];
                let exists;
                exists = fs.existsSync("backups") && fs.existsSync(`backups/${backup}`);
                if (exists)
                {
                    const info = require(`../../backups/${backup}/info.json`);
                    if (info.author !== message.author.id)
                        return message.channel.send(":x: This backup was not made by you. For privacy reasons, you cannot restore that backup.");

                    const confirmMsg = await message.channel.send("Are you sure you want to restore this backup? This will delete all roles and channels!");
                    const filter: CollectorFilter = (reaction, user) => user.id === message.author.id && reaction.emoji.name.match(/(✅|❌)/);
                    const collector = confirmMsg.createReactionCollector(filter, { time: 30 * 1000 });
                    collector.on('collect', reaction =>
                    {
                        if (reaction.emoji.name === '❌')
                        {
                            collector.stop('cancel');
                            confirmMsg.reactions.removeAll();
                            confirmMsg.edit("Cancelled.");
                        }
                        else
                        {
                            collector.stop('confirm');
                            restoreBackup(message.guild, backup, message.member);
                        }
                    });
                    collector.on('end', (collected, reason) =>
                    {
                        if (reason === 'time')
                        {
                            message.reactions.removeAll();
                            message.channel.send("Cancelled due to inactivity.");
                        }
                    });
                    await confirmMsg.react('✅');
                    await confirmMsg.react('❌');
                }
                else message.channel.send(":x: Backup does not exist.");
                break;
            default:
                message.channel.send(":x: Valid actions: create, load");
                break;
        }
    };

    info = {
        level: AccessLevels.ServerOwner
    };
}

async function restoreBackup(guild: Guild, backupHash: string, initiator: GuildMember)
{
    const warnings: string[] = [];

    const data: utility.GuildData = require(`../../backups/${backupHash}/data.json`);

    // Delete existing roles and channels
    for (const role of guild.roles.cache
        .filter(r => r.position !== guild.me.roles.highest.position)
        .values())
    {
        if (role.name === "@everyone" && role.position === 0) continue;
        await role.delete().catch(() => { });
        await utility.wait(300);
    }
    for (const channel of guild.channels.cache.values())
    {
        await channel.delete();
        await utility.wait(300);
    }

    // Restore roles and channels
    const roleIDs: { [key: string]: string } = {};
    for (const role of data.roles.sort((a, b) => a.position < b.position ? 1 : -1))
    {
        if (role.name === "@everyone" && role.position === 0) continue;
        if (role.managed) continue;
        const createdRole = await guild.roles.create({
            data:
            {
                name: role.name,
                color: role.color,
                hoist: role.hoist,
                mentionable: role.mentionable,
                permissions: role.permissions,
                position: 1
            }
        });
        roleIDs[role.id] = createdRole.id;
        await utility.wait(500);
    }

    for (const member of data.members)
    {
        const guildMember = guild.members.cache.get(member.id);
        if (!guildMember) continue;

        if (member.nickname)
            guildMember.setNickname(member.nickname).catch(() =>
            {
                if (!warnings.includes("nicknames"))
                    warnings.push("nicknames");
            });
        if (member.roles.length)
            await guildMember.roles.add(member.roles.filter(r => roleIDs[r] !== undefined).map(r => roleIDs[r])).catch(() =>
            {
                if (!warnings.includes("member roles"))
                    warnings.push("member roles");
            });
        await utility.wait(500);
    }

    const channelIDs: { [key: string]: string } = {};
    let firstChannelID;

    for (const channel of data.channels
        .filter(c => c.type === "category")
        .sort((a, b) => a.position < b.position ? -1 : 1))
    {
        const createdChannel = await guild.channels.create(channel.name, {
            type: "category",
            position: 0,
            permissionOverwrites: channel.permission_overwrites
                .filter(ow => ow.id === data.id || roleIDs[ow.id] || guild.members.cache.has(ow.id))
                .map(ow =>
                {
                    // the @everyone role has the same ID as the guild
                    if (ow.id === data.id) ow.id = guild.id;
                    else if (roleIDs[ow.id]) ow.id = roleIDs[ow.id];
                    // If the overwrite is neither for @everyone nor a regular role, then it is for a specific user who is a member of the current guild (as filtered by .filer() above)
                    return ow;
                })
        });
        channelIDs[channel.id] = createdChannel.id;
        await utility.wait(500);
    }
    for (const channel of data.channels
        .filter(c => c.type !== "category")
        .sort((a, b) => a.position < b.position ? -1 : 1))
    {
        const createdChannel = await guild.channels.create(channel.name, {
            type: channel.type,
            topic: channel.topic,
            parent: channelIDs[channel.parent],
            position: 0,
            nsfw: channel.nsfw,
            rateLimitPerUser: channel.rateLimitPerUser,
            bitrate: channel.bitrate,
            userLimit: channel.userLimit,
            permissionOverwrites: channel.permission_overwrites
                .filter(ow => ow.id === data.id || roleIDs[ow.id] || guild.members.cache.has(ow.id))
                .map(ow =>
                {
                    // the @everyone role has the same ID as the guild
                    if (ow.id === data.id) ow.id = guild.id;
                    else if (roleIDs[ow.id]) ow.id = roleIDs[ow.id];
                    // If the overwrite is neither for @everyone nor a regular role, then it is for a specific user who is a member of the current guild (as filtered by .filer() above)
                    return ow;
                })
        });
        channelIDs[channel.id] = createdChannel.id;
        if (!firstChannelID && channel.type === "text") firstChannelID = createdChannel.id;
        await utility.wait(500);
    }

    if (data.afk_channel)
        await guild.setAFKChannel(channelIDs[data.afk_channel]);

    if (data.afk_timeout)
        await guild.setAFKTimeout(data.afk_timeout);

    if (data.system_channel)
        await guild.setSystemChannel(channelIDs[data.system_channel]);

    if (data.system_flags)
        await guild.setSystemChannelFlags(data.system_flags);

    if (data.default_notifications)
        await guild.setDefaultMessageNotifications(data.default_notifications);

    if (guild.name !== data.name)
        await guild.setName(data.name);

    const icon = fs.readdirSync(`backups/${backupHash}`)
        .find(f => f
            .split('.')
            .slice(0, -1)
            .join('') === 'icon');

    if (icon)
        await guild.setIcon(`backups/${backupHash}/${icon}`);

    const notifyChannel: TextChannel = (guild.channels.cache.get(firstChannelID) || initiator) as TextChannel;


    notifyChannel.send(":white_check_mark: Backup restored!");
    if (warnings.length) notifyChannel.send(`:warning: __Warnings__: \n${warnings.map(w => '\t- Some ' + w + " couldn't be restored").join('\n')}`);
}
