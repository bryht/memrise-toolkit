"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs-extra");
const readline = require("readline");
const https = require("https");
const cheerio = require("cheerio");
for (var index = 0; index < process.argv.length; index++) {
    var element = process.argv[index];
    if (element.includes('target')) {
        let target = element.split('=')[1];
        console.log(target);
        main(target);
    }
}
function main(target) {
    let worldArray = new Array();
    //Clear the word result file and folder
    fs.writeFile('wordlist-result.txt', '', () => { });
    fs.emptyDir('audio', err => { console.log(err); });
    //Get the word list
    let wordlistStream = fs.createReadStream('wordlist.txt');
    let wordlistReadLine = readline.createInterface(wordlistStream);
    wordlistReadLine.on('line', line => {
        let wordResult = searchWord(line);
        let wordTranslate = translateWord(line);
        wordResult.then(word => {
            let searchWord = word;
            wordTranslate.then(trans => {
                console.log(searchWord.define + trans);
                switch (target) {
                    case 'myself':
                        saveWord(line + "," + searchWord.pos + searchWord.define + trans + "," + searchWord.pron);
                        break;
                    case 'teacher':
                        saveWord(line + ": " + searchWord.define);
                        break;
                    default:
                        break;
                }
            });
        });
    });
    return 0;
}
//Check word from these websites.
//http://www.ldoceonline.com/search/direct/?q=jersey
function searchWord(input) {
    //get the define
    let content = new Promise((resolve, reject) => {
        let options = {
            "method": "GET",
            "hostname": "www.ldoceonline.com",
            "path": "/dictionary/" + input
        };
        let req = https.request(options, function (res) {
            let chunks = [];
            res.on("data", function (chunk) {
                chunks.push(chunk);
            });
            res.on("end", function () {
                let body = Buffer.concat(chunks);
                let $body = cheerio.load(body.toString());
                let pos = "[" + $body('.POS').first().text().trim() + "]";
                let pron = "[" + $body('.PRON').first().text().trim() + "]";
                let define = $body('#' + input + '__1 .DEF').text().replace(/,/g, '.');
                let mp3Url = 'https://www.ldoceonline.com/' + $body('.brefile').first().attr('data-src-mp3');
                saveMp3File(mp3Url, input);
                let word = new WordDefine(pos, define, pron);
                resolve(word);
            });
        });
        req.end();
    });
    return content;
}
function translateWord(input, target = 'zh') {
    let content = new Promise((resolve, reject) => {
        var options = {
            "method": "POST",
            "hostname": "translation.googleapis.com",
            "path": "/language/translate/v2?key=Kkkkkkkkkkkkkkkk&q=" + input + "&target=" + target
        };
        var req = https.request(options, function (res) {
            var chunks = [];
            res.on("data", function (chunk) {
                chunks.push(chunk);
            });
            res.on("end", function () {
                var body = Buffer.concat(chunks);
                let result = JSON.parse(body.toString());
                resolve(result.data.translations[0].translatedText);
            });
        });
        req.end();
    });
    return content;
}
function saveMp3File(url, fileName) {
    var file = fs.createWriteStream('audio/' + fileName + ".mp3");
    file.on('finish', function () {
        file.close(); // close() is async, call cb after close completes.
    });
    var request = https.get(url, res => {
        res.pipe(file);
    });
}
function saveWord(line) {
    fs.appendFile('wordlist-result.txt', line + '\n', function (err) {
        if (err) {
            console.log(err.message);
            throw err;
        }
        console.log(line + ' Saved!');
    });
}
class WordDefine {
    constructor(p, d, pron) {
        this.pos = p;
        this.define = d;
        this.pron = pron;
    }
}
//# sourceMappingURL=SearchWords.js.map