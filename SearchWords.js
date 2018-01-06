"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs-extra");
const readline = require("readline");
const https = require("https");
const cheerio = require("cheerio");
let directFlag = false;
for (var index = 0; index < process.argv.length; index++) {
    var element = process.argv[index];
    if (element.includes('target')) {
        let target = element.split('=')[1];
        console.log(target);
        main(target);
        directFlag = true;
    }
}
if (directFlag == false) {
    main('');
}
function main(target) {
    let worldArray = new Array();
    //Clear the word result file and folder
    fs.writeFile('wordlist-result.txt', '', () => { });
    fs.emptyDir('audio', err => { console.log(err); });
    //Get the word list
    let wordlistStream = fs.createReadStream('wordlist.txt');
    let wordlistReadLine = readline.createInterface(wordlistStream);
    wordlistReadLine.on('line', word => {
        searchWord(word)
            .then(resultWord => {
            return translateWord(resultWord);
        })
            .then(resultWord => {
            console.log(resultWord.define + resultWord.zh);
            switch (target) {
                case 'teacher':
                    saveWord(resultWord.word + ": " + resultWord.define);
                    break;
                default:
                    saveWord(resultWord.word + "," + resultWord.pos + resultWord.define + "," + "[" + resultWord.zh + "]" + resultWord.pron + "," + resultWord.exp);
                    break;
            }
        });
    });
    return 0;
}
//Check word from these websites.
//http://www.ldoceonline.com/search/direct/?q=jersey
function searchWord(word) {
    //get the define
    let content = new Promise((resolve, reject) => {
        let options = {
            "method": "GET",
            "hostname": "www.ldoceonline.com",
            "path": "/dictionary/" + word
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
                let pron = "[" + $body('.PRON').first().text().replace(/,/g, '-').trim() + "]";
                let define = $body('#' + word + '__1 .DEF').text().replace(/,/g, '.');
                let mp3Url = 'https://www.ldoceonline.com/' + $body('.brefile').first().attr('data-src-mp3');
                let exp = $body('#' + word + '__1 .EXAMPLE').first().text().replace(/,/g, '.').replace(word, '[xxx]').trim();
                if (exp.length == 0) {
                    exp = $body('.cexa1g1[info=UK]').first().text().replace(/,/g, '.').replace(word, '[xxx]').trim();
                }
                saveMp3File(mp3Url, word);
                let result = new WordDefine(word, pos, define, pron, exp);
                resolve(result);
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
            "path": "/language/translate/v2?key=AIzaSyD5EXQV1KyxJLo09v05r5eWFGLfkvj2y_o&q=" + input.word + "&target=" + target
        };
        var req = https.request(options, function (res) {
            var chunks = [];
            res.on("data", function (chunk) {
                chunks.push(chunk);
            });
            res.on("end", function () {
                var body = Buffer.concat(chunks);
                let result = JSON.parse(body.toString());
                input.zh = result.data.translations[0].translatedText;
                resolve(input);
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
    constructor(word, p, d, pron, exp = '') {
        this.word = word;
        this.pos = p;
        this.define = d;
        this.pron = pron;
        this.exp = exp;
    }
}
//# sourceMappingURL=SearchWords.js.map