import { system, world } from "@minecraft/server";

class TpaEmt {
    constructor(requester, recepter, sendTime) {
        this.requester = requester;
        this.recepter = recepter;
        this.sendTime = sendTime;
    }
}

class TpaMap {
    constructor() {
        this.mTpaEmtMap = new Map();
        this.mRcv_Reqs = new Map();
    }
    InsertTpaEmt(tpaEmt) {//添加tpa对象，返回是否添加成功
        this.mTpaEmtMap.set(tpaEmt.requester, tpaEmt);
        if (!this.mRcv_Reqs.has(tpaEmt.recepter))
            this.mRcv_Reqs.set(tpaEmt.recepter, new Set());
        this.mRcv_Reqs.get(tpaEmt.recepter).add(tpaEmt.requester);
    }
    DelTpaEmtInReq(requester) {
        let tpaEmt = this.mTpaEmtMap.get(requester);
        this.mTpaEmtMap.delete(requester);
        this.mRcv_Reqs.get(tpaEmt.recepter).delete(requester);
        if (this.mRcv_Reqs.get(tpaEmt.recepter).size == 0)
            this.mRcv_Reqs.delete(tpaEmt.recepter);
    }
    DelTpaEmtInReqArray(requesterArray) {
        requesterArray.forEach((value) => {
            this.DelTpaEmtInReq(value);
        });
    }
    DelTpaEmtInRcv(recepter) {
        let requesters = this.mRcv_Reqs.get(recepter);
        this.DelTpaEmtInReqArray(requesters);
    }
    AlreadyCntTpaEmd(tpaEmd) {
        if (this.mTpaEmtMap.has(tpaEmd.requester))
            return false;
        return true;
    }
    AlreadyCntReq(requester) {
        if (!this.mTpaEmtMap.has(requester))
            return false;
        return true;
    }
    HaveTpaEmd(recepter, requester) {
        if (!this.mRcv_Reqs.has(recepter))
            return false;
        if (!this.mRcv_Reqs.get(recepter).has(requester))
            return false;
        return true;
    }
    GetTpaEmdByReq(requester) {
        return this.mTpaEmtMap.get(requester);
    }
    GetTpaEmdsByRcv(rcvPlayerName){
        let re = new Array();
        let reqs = this.mRcv_Reqs.get(rcvPlayerName);
        if(reqs==undefined)
            return undefined;
        reqs.forEach(req=>{
            re.push(this.mTpaEmtMap.get(req));
        });
        return re;
    }
    TimeSub() {
        let re = new Array();
        this.mTpaEmtMap.forEach((value, key) => {
            value.sendTime--;
            if (value.sendTime <= 0)
                re.push(key);
        });
        return re;
    }
}

function GetPlayer(playerName) {
    let players = world.getPlayers();
    for (let i = 0; i < players.length; i++) {
        if (players[i].name == playerName)
            return players[i];
    }
    return undefined;
}

let pre = "#";
let tpaMap = new TpaMap();
const prefix = "§7[§bTPA插件§7] §r";
let timeItv = 20;

system.runInterval(() => {
    let requesters = tpaMap.TimeSub();
    requesters.forEach((value) => {//告知过期
        let rcv = tpaMap.GetTpaEmdByReq(value).recepter;
        TellReqOutDate(value, rcv);
        TellRcvOutDate(rcv, value);
    });
    tpaMap.DelTpaEmtInReqArray(requesters);
}, 20);

function TellReqOutDate(playerName, targetPlayerName) {
    let player = GetPlayer(playerName);
    if (player == undefined)
        return;
    player.sendMessage(prefix + "§b你发送给§l§e" + targetPlayerName + "§r§b的传送请求已过期");
}

function TellRcvOutDate(playerName, targetPlayerName) {
    let player = GetPlayer(playerName);
    if (player == undefined)
        return;
    player.sendMessage(prefix + "§l§e" + targetPlayerName + "§r§b发送给你的传送请求已过期");
}

function SayHelp_sub(commandIn, arb) {
    return prefix + "> " + pre + commandIn + "§7| §e" + arb;
}

function SayHelp(player) {
    player.sendMessage(SayHelp_sub("tpa help", "获取tpa指令相关帮助"));
    player.sendMessage(SayHelp_sub("tpa to <name>", "向指定玩家发起传送请求"));
    player.sendMessage(SayHelp_sub("tpa accept [name]", "接受玩家发来的传送请求"));
    player.sendMessage(SayHelp_sub("tpa cancel", "取消发送给玩家的传送请求"));
}

function SayErr(player) {
    player.sendMessage(prefix + "§b指令输入有误,请输入§l§e#tpa help§r§b查看指令用法");
}

function SayNoTargetPlayer(player, targetPlayerName) {
    player.sendMessage(prefix + "§b目标玩家§l§e" + targetPlayerName + "§r§b不存在");
}

function SayTpaMsgRcv(recepter, requester) {
    recepter.sendMessage(prefix + "§l§e" + requester.name + "§r§b向你发送了传送请求。输入§l§e#tpa accept§r§b以接受");
}

function SayTpaMsgSend(requester, recepter) {
    requester.sendMessage(prefix + "§b成功向§l§e" + recepter.name + "§r§b发送了传送请求");
}

function TpaTo(command, player) {
    if (command.length < 3) {
        SayErr(player);
        return;
    }
    //禁止玩家一次发送多个请求
    if (tpaMap.AlreadyCntReq(player.name)) {
        player.sendMessage(prefix + "§b请等待上个传送请求结束,再发送下一个传送请求");
        return;
    }
    let targetPlayerName = command[2];
    let targetPlayer = GetPlayer(targetPlayerName);
    if (targetPlayer == undefined)//目标玩家不存在
    {
        SayNoTargetPlayer(player, targetPlayerName);
        return;
    }
    tpaMap.InsertTpaEmt(new TpaEmt(player.name, targetPlayer.name, timeItv));
    SayTpaMsgSend(player, targetPlayer);
    SayTpaMsgRcv(targetPlayer, player);
}

function TpToDo(rcvPlayer, reqPlayer) {
    system.run(() => {
        try {
            //rcvPlayer.runCommand("tp " + reqPlayer.name + " " + rcvPlayer.name);
            //rcvPlayer.teleport({ x: reqPlayer.location.x, y: reqPlayer.location.y, z: reqPlayer.location.z });
            reqPlayer.teleport({ x: rcvPlayer.location.x, y: rcvPlayer.location.y, z: rcvPlayer.location.z },
                {
                    dimension:rcvPlayer.dimension
                });

        } catch (err) {

            rcvPlayer.sendMessage(prefix + err.name + " " + err.message);
        }
    });
}

function TpaAccept(command, player) {
    if (command.length < 3)//全部接受模式
    {
        let tpaEmts = tpaMap.GetTpaEmdsByRcv(player.name);
        tpaMap.DelTpaEmtInRcv(player.name);
        tpaEmts.forEach((tpaEmt)=>{
            let targetPlayer = GetPlayer(tpaEmt.requester);
            if(targetPlayer==undefined)
                return;
            TpToDo(player,targetPlayer);
            targetPlayer.sendMessage(prefix + "§l§e" + player.name + "§r§b接收了你的传送请求");
        });
        player.sendMessage(prefix + "§b成功接收了所有的传送请求");
        return;
    }
    //接受特定玩家模式
    let targetPlayerName = command[2];
    if (!tpaMap.HaveTpaEmd(player.name, targetPlayerName))//无来自该玩家的传送请求
    {
        player.sendMessage(prefix + "§b当前并未有来自该玩家的传送请求");
    }
    let targetPlayer = GetPlayer(targetPlayerName);
    if (targetPlayer == undefined)//目标玩家不存在
    {
        SayNoTargetPlayer(player, targetPlayerName);
        return;
    }
    //传送
    tpaMap.DelTpaEmtInReq(targetPlayerName);//通过发起者名字，删除传送请求
    TpToDo(player, targetPlayer);
    player.sendMessage(prefix + "§b成功接收§l§e" + targetPlayerName + "§r§b的传送请求");
    targetPlayer.sendMessage(prefix + "§l§e" + player.name + "§r§b接收了你的传送请求");
}

function TpaCancel(command,player)
{
    if(!tpaMap.AlreadyCntReq(player.name))
    {
        player.sendMessage(prefix + "§b你当前并未有请求中的传送请求");
        return;
    }
    let tpaEmt = tpaMap.GetTpaEmdByReq(player.name);
    tpaMap.DelTpaEmtInReq(player.name);
    player.sendMessage(prefix + "§b你取消了自己的传送请求");
    let rcv_er = GetPlayer(tpaEmt.recepter);
    rcv_er.sendMessage(prefix + "§l§e" + player.name + "§r§b取消了发送给你的传送请求");
}

function TpaCmdDeal(command, player) {
    if (command.length < 2) {
        SayErr(player);
        return;
    }
    switch (command[1]) {
        case "help":
            SayHelp(player);
            break;
        case "to":
            TpaTo(command, player);
            break;
        case "accept":
            TpaAccept(command, player);
            break;
        case "cancel":
            TpaCancel(command,player);
            break;
        default:
            SayErr(player);
            return;
    }
}

//获取登录的玩家
//world.afterEvents.playerJoin.subscribe(event => {
//    let iPlayers = world.getPlayers();
//    iPlayers.forEach(player => {
//        player.sendMessage("Hello " + event.playerName + " " + player.name);
//        if (event.playerName == player.name) {
//            players.AddPlayer(player);
//        }
//    });
//});

//获取退出的玩家
//world.afterEvents.playerLeave.subscribe(event => {
//    players.DelPlayer(event.playerName);
//});

world.beforeEvents.chatSend.subscribe(event => {
    const sender = event.sender;
    const message = event.message;
    if (message.substring(0, 1) != pre) {
        return -1;
    }
    const command = message.substring(1).split(" ");
    switch (command[0]) {
        case "tpa":
            event.cancel = true;
            TpaCmdDeal(command, sender);
            break;
        default:
            return -1;
    }
});