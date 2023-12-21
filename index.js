const { ChatClient, AlternateMessageModifier, SlowModeRateLimiter } = require('@kararty/dank-twitch-irc');
const chalk = require('chalk');
const editJsonFile = require("edit-json-file");
const reload = require('auto-reload');
const redCross = "❌";
const checkMark = "✔️";
var config = reload("./config.json", 3000);
var bingo = reload("./bingo.json", 1000);
let file = editJsonFile(`${__dirname}/config.json`, {
    autosave: true
});
let bingoFile = editJsonFile(`${__dirname}/bingo.json`, {
    autosave: true
});
let bingosFlag = true;
// declare client
let client = new ChatClient({
    username: config.username,
    password: `oauth:${config.oauth}`,
    rateLimits: "default"
});
const randomSelection = (n) => {
    let newArr = [];    
    for (let i = 0; i < n; i++) {
        let newElem = Math.floor(Math.random() * bingo.bingos.length);
        while (newArr.includes(newElem)) {
            newElem = Math.floor(Math.random() * bingo.bingos.length);
        }
        newArr.push(newElem);
    }
    return newArr;
}
const buildUserBingo = (n) => {
    let string = "";
    for (let i = 0; i < bingo.usersBingos[n].length; i++) {
        string = string + bingo.bingos[bingo.usersBingos[n][i]]
        if (bingo.selectedBingos.indexOf(bingo.usersBingos[n][i]) > -1) {
            string = string + " " + checkMark + " ";
        } else {
            string = string + " " + redCross + " ";
        }
    }
    return string;
}
// events on client
client.use(new AlternateMessageModifier(client));
client.use(new SlowModeRateLimiter(client, 10));

client.on("ready", async () => {
    console.log(chalk.greenBright("Pomyślnie połączono do czatu:") + chalk.blueBright(` ${config.channels[0]}`));    
    client.say(config.channels[0], config.connect);
});
client.on("close", async (error) => {
    if (error !== null){
        console.error(`Client closed due to error`, error);
    }
});



client.on("PRIVMSG", async (msg) => {
           
//commands
    if (msg.messageText.startsWith(config.prefix))
    {
        const args = msg.messageText.slice(config.prefix.length).trim().split(/\s+/);
        const command = args.shift().toLowerCase();
        switch (command)
        {
            case "joinbingo":
                if (config.openFlag == 1) {
                    if (bingoFile.get(`userFlags.${msg.senderUsername}`) != 1) {
                        if (bingo.users.indexOf(msg.senderUsername) <= -1) {
                            bingoFile.append("users", msg.senderUsername);
                            let randombingos = randomSelection(config.bingosPerUser);
                            bingoFile.append("usersBingos", randombingos);
                            client.say(msg.channelName, `@${msg.senderUsername}, Dołączono do bingo!`);
                        } else {
                            client.say(msg.channelName, `@${msg.senderUsername}, Już bierzesz udział, twoje bingo: ${buildUserBingo(bingo.users.indexOf(msg.senderUsername))}`);
                        }
                        bingoFile.set(`userFlags.${msg.senderUsername}`, 1);
                        setTimeout(() => { bingoFile.set(`userFlags.${msg.senderUsername}`, 0) }, 1000 * config.userCooldown);
                    }
                } else {
                    client.say(msg.channelName, `@${msg.senderUsername}, Nie można już dołączyć`);
                }               
                break;
            case "mojebingo":
                if (bingo.users.indexOf(msg.senderUsername) <= -1) {
                    client.say(msg.channelName, `@${msg.senderUsername}, nie bierzesz udziału, aby dołączyć wpisz !joinbingo`);
                } else {
                    client.say(msg.channelName, `@${msg.senderUsername}, twoje bingo: ${buildUserBingo(bingo.users.indexOf(msg.senderUsername)) }`);
                }
                break;
            case "zaznacz":
                if (config.bingoModeratorNames.indexOf(msg.senderUsername) > -1) {
                    client.say(msg.channelName, `@${msg.senderUsername}, zaznaczono: ${bingo.bingos[args[0]]}`);
                    bingoFile.append("selectedBingos", parseInt(args[0]));
                }
                break;
            case "odznacz":
                if (config.bingoModeratorNames.indexOf(msg.senderUsername) > -1) {
                    
                    let index = bingo.selectedBingos.indexOf(parseInt(args[0]));                    
                    let array = [];
                    if (index == -1) {
                        client.say(msg.channelName, `@${msg.senderUsername}, fraza nie była zaznaczona`);
                        return;
                    }
                    for (let i = 0; i < bingo.selectedBingos.length; i++) {
                        if (i != index) {
                            array.push(bingo.selectedBingos[i]);
                        }
                    }
                    bingoFile.unset("selectedBingos");
                    bingoFile.set("selectedBingos", array);
                    client.say(msg.channelName, `@${msg.senderUsername}, odznaczono: ${bingo.bingos[parseInt(args[0])]}`);
                }
                break;
            case "bingos":
                if (bingosFlag == true) {
                    if (bingoFile.get(`userFlags.${msg.senderUsername}`) != 1) {
                        let string = "";
                        for (let i = 0; i < bingo.bingos.length; i++) {
                            string = string + i + ": " + bingo.bingos[i];
                            if (bingo.selectedBingos.indexOf(i) > -1) {
                                string = string + " " + checkMark + " ";
                            } else {
                                string = string + " " + redCross + " ";
                            }
                        }
                        client.say(msg.channelName, `@${msg.senderUsername}, wszystkie frazy: ${string}`);
                        bingosFlag = false;
                        bingoFile.set(`userFlags.${msg.senderUsername}`, 1);
                        setTimeout(() => { bingosFlag = true }, 1000 * config.globalCooldown);
                        setTimeout(() => { bingoFile.set(`userFlags.${msg.senderUsername}`, 0) }, 1000 * config.userCooldown);
                    }                   
                }               
                break;
            case "clearbingo":
                if (config.bingoModeratorNames.indexOf(msg.senderUsername) > -1) {
                    bingoFile.set("users", []);
                    bingoFile.set("usersBingos", []);
                    bingoFile.set("selectedBingos", []);
                }
                break;
            case "openbingo":
                if (config.bingoModeratorNames.indexOf(msg.senderUsername) > -1) {
                    file.set("openFlag", 1);
                }
                break;
            case "closebingo":
                if (config.bingoModeratorNames.indexOf(msg.senderUsername) > -1) {
                    file.set("openFlag", 0);
                }
                break;
        }
    }
});

client.connect();
client.joinAll(config.channels);
