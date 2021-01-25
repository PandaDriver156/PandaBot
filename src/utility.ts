import * as crypto from "crypto";
import * as Discord from "discord.js";
import fetch from "node-fetch";
import { PresenceData } from "./types";

export interface GuildData
{
    id: Discord.Snowflake,
    name: string,
    owner: Discord.Snowflake,
    region: string,
    afk_channel: Discord.Snowflake,
    afk_timeout: number,
    system_channel: Discord.Snowflake,
    system_flags: Discord.SystemChannelFlags,
    default_notifications: Discord.DefaultMessageNotifications,
    channels: ChannelData[],
    roles: RoleData[],
    members: MemberData[]
}

export function getGuildData(guild: Discord.Guild): GuildData
{
    return {
        id: guild.id,
        name: guild.name,
        owner: guild.ownerID,
        region: guild.region,
        afk_channel: guild.afkChannelID,
        afk_timeout: guild.afkTimeout,
        system_channel: guild.systemChannelID,
        system_flags: guild.systemChannelFlags as Discord.SystemChannelFlags,
        default_notifications: guild.defaultMessageNotifications as Discord.DefaultMessageNotifications,
        channels: guild.channels.cache.map(channel => getChannelData(channel)),
        roles: guild.roles.cache.map(role => this.getRoleData(role)).sort((a, b) => a.position < b.position ? -1 : 1),
        members: guild.members.cache.map(member => this.getMemberData(member))
    };
};

export interface ChannelData
{
    id: Discord.Snowflake,
    type: Exclude<keyof typeof ChannelType, 'dm' | 'group' | 'unknown'>,
    name: string,
    position: number,
    permission_overwrites: Discord.PermissionOverwrites[],
    bitrate?: number,
    userLimit?: number,
    parent?: Discord.Snowflake
    topic?: string,
    nsfw?: boolean,
    rateLimitPerUser?: number
}

export function getChannelData(channel: Discord.CategoryChannel | Discord.TextChannel | Discord.VoiceChannel | Discord.GuildChannel): ChannelData
{
    const data: ChannelData = {
        id: channel.id,
        type: channel.type,
        name: channel.name,
        position: channel.position,
        permission_overwrites: channel.permissionOverwrites.array()
    };

    if (channel instanceof Discord.TextChannel)
    {
        data.parent = channel.parentID;
        data.topic = channel.topic;
        data.nsfw = channel.nsfw;
        data.rateLimitPerUser = channel.rateLimitPerUser;
    }
    else if (channel instanceof Discord.VoiceChannel)
    {
        data.parent = channel.parentID;
        data.bitrate = channel.bitrate;
        data.userLimit = channel.userLimit;
    }

    return data;
};

export interface RoleData
{
    id: Discord.Snowflake,
    name: string,
    color: number,
    hoist: boolean,
    position: number,
    permissions: Discord.PermissionString[],
    mentionable: boolean,
    managed: boolean
}

export function getRoleData(role: Discord.Role): RoleData
{
    return {
        id: role.id,
        name: role.name,
        position: role.position,
        color: role.color,
        hoist: role.hoist,
        mentionable: role.mentionable,
        permissions: role.permissions.toArray(),
        managed: role.managed
    };
};

export interface MemberData
{
    id: Discord.Snowflake,
    nickname: string,
    roles: Discord.Snowflake[]
}


export function getMemberData(member: Discord.GuildMember)
{
    return {
        id: member.id,
        nickname: member.nickname,
        roles: member.roles.cache.filter(role => !role.managed).map(role => role.id)
    }
};

export function getPresenceData(presence: Discord.Presence): PresenceData
{
    return {
        status: presence.status,
        activities: presence.activities,
        devices: presence.clientStatus
    };
}

export function arraysMatch(array1: any[], array2: any[])
{
    if (array1.length !== array2.length) return false;
    for (let i = 0; i < array1.length; i++)
    {
        if (array1[i] !== array2[i]) return false;
    }
    return true;
}

export function getFromUrl(url: string): Promise<Buffer>
{
    if (!url) return null;
    return new Promise(res =>
    {
        fetch(url).then(resp => resp.buffer()).then(buffer => res(buffer));
    });
};

export function generateRandomString(length: number, encoding: BufferEncoding = 'hex')
{
    return crypto.randomBytes(length / 2).toString(encoding);
};

export function wait(ms: number): Promise<null>
{
    return new Promise(res => setTimeout(() => res(null), ms));
};
