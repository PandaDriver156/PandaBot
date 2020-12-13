const crypto = require('crypto');
const Discord = require('discord.js');
const fetch = require('node-fetch');

/**
 * @typedef {object} GuildData
 * @property {Discord.Snowflake} id
 * @property {string} name
 * @property {Discord.Snowflake} owner
 * @property {string} region
 * @property {Discord.Snowflake} afk_channel
 * @property {number} afk_timeout
 * @property {Discord.Snowflake} system_channel
 * @property {Discord.SystemChannelFlags} system_flags
 * @property {Discord.DefaultMessageNotifications} default_notifications
 * @property {ChannelData[]} channels
 * @property {RoleData[]} roles
 * @property {MemberData[]} members
 */

/**
 * @param {Discord.Guild} guild 
 * @returns {GuildData}
 */
exports.getGuildData = (guild) =>
{
    return {
        id: guild.id,
        name: guild.name,
        owner: guild.ownerID,
        region: guild.region,
        afk_channel: guild.afkChannelID,
        afk_timeout: guild.afkTimeout,
        system_channel: guild.systemChannelID,
        system_flags: guild.systemChannelFlags,
        default_notifications: guild.defaultMessageNotifications,
        channels: guild.channels.cache.map(channel => this.getChannelData(channel)),
        roles: guild.roles.cache.map(role => this.getRoleData(role)).sort((a, b) => a.position < b.position ? -1 : 1),
        members: guild.members.cache.map(member => this.getMemberData(member))
    };
};

/**
 * @typedef {object} ChannelData
 * @property {Discord.Snowflake} id
 * @property {"category"|"text"|"voice"} type
 * @property {string} name
 * @property {number} position
 * @property {Discord.PermissionOverwrites[]} permission_overwrites
 * @property {number} bitrate
 * @property {number} userLimit
 */

/**
 * @param {Discord.CategoryChannel|Discord.TextChannel|Discord.VoiceChannel} channel
 * @returns {ChannelData}
 */
exports.getChannelData = (channel) =>
{
    const data = {
        id: channel.id,
        type: channel.type,
        name: channel.name,
        position: channel.position,
        permission_overwrites: channel.permissionOverwrites.array()
    };

    switch (channel.type)
    {
        case "text":
            data.parent = channel.parentID;
            data.topic = channel.topic;
            data.nsfw = channel.nsfw;
            data.rateLimitPerUser = channel.rateLimitPerUser;
            break;
        case "voice":
            data.parent = channel.parentID;
            data.bitrate = channel.bitrate;
            data.userLimit = channel.userLimit;
            break;
    }

    return data;
};

/**
 * @typedef {object} RoleData
 * @property {Discord.Snowflake} id
 * @property {string} name
 * @property {number} color
 * @property {boolean} hoist
 * @property {number} position
 * @property {Discord.PermissionString[]} permissions
 * @property {boolean} mentionable
 * @property {boolean} managed
 */

/**
 * @param {Discord.Role} role
 * @returns {RoleData}
 */
exports.getRoleData = (role) =>
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

/**
 * @typedef {object} MemberData
 * @property {Discord.Snowflake} id
 * @property {string} nickname
 * @property {Discord.Snowflake[]} roles
 */

/**
 * @param {Discord.GuildMember} member
 * @returns {MemberData}
 */
exports.getMemberData = (member) =>
{
    return {
        id: member.id,
        nickname: member.nickname,
        roles: member.roles.cache.filter(role => !role.managed).map(role => role.id)
    }
};

/**
 * @param {string} url
 * @returns {Promise<string>}
 */
exports.getFromUrl = (url) =>
{
    if (!url) return null;
    return new Promise(res =>
    {
        fetch(url).then(resp => resp.buffer()).then(buffer => res(buffer));
    });
};

/**
 * @param {number} length 
 * @param {BufferEncoding} type
 * @returns {string}
 */
exports.generateRandomString = (length, encoding = 'hex') =>
{
    return crypto.randomBytes(length / 2).toString(encoding);
};

exports.wait = (ms) =>
{
    return new Promise(res => setTimeout(() => res(), ms));
};
