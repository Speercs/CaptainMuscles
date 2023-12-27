// util_logging

// Thanks to U-238
// global.Utils = {
    
//     roomLink(roomName, color = '#70a5ff') {
//         const shardName = Game.shard.name;
//         return `<a href="#!/room/${shardName}/${roomName}"><font color="${color}">${roomName}</font></a>`;
//     }

//     // ...
// }

// console.log(`☢ Nuclear launch detected! ☢ ${Utils.roomLink(nuke.launchRoomName)}, land in ${nuke.timeToLand} ticks`);

module.exports =
{
    roomLink: function(roomName, color = '#70a5ff')
    {
        const shardName = Game.shard.name;
        return `<a href="#!/room/${shardName}/${roomName}"><font color="${color}">${roomName}</font></a>`;
    },
}