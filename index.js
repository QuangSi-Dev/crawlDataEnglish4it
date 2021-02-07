"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const puppeteer_1 = __importDefault(require("puppeteer"));
require("ts-replace-all");
const xlsx_1 = __importDefault(require("xlsx"));
const getURL = (unit, workspace) => `https://www.english4it.com/module/core/unit/${unit}/${workspace}`;
const logger = (workspace, data) => console.log(`${workspace}:`, data);
const GetVocabulary = (page, unit) => __awaiter(void 0, void 0, void 0, function* () {
    const workspace = 'vocabulary';
    yield page.goto(getURL(unit, workspace));
    // Get the "viewport" of the page, as reported by the page.
    return page.evaluate(() => {
        var _a, _b, _c;
        const elemClass = ".dictionary-lightbox";
        const listElement = Array.from(document.querySelectorAll(elemClass));
        const listData = [];
        for (const iterator of listElement) {
            const layer0 = iterator.children[0];
            const layer1 = iterator.children[3];
            const idString = (_a = layer0.querySelector('audio')) === null || _a === void 0 ? void 0 : _a.getAttribute('id');
            const id = idString ? idString.split(/[--]/)[1] : null;
            const vocabulary = layer0.children[1].children[0].innerHTML.replace('\n', '').trim();
            const dictionary = layer0.querySelectorAll('source');
            const dictionaryAudioUS = dictionary[0].getAttribute('src');
            const dictionaryAudioUK = dictionary[1].getAttribute('src');
            const dictionaryEntry = (_b = layer0.querySelector('dd')) === null || _b === void 0 ? void 0 : _b.innerHTML.replace('\n', '').trim();
            const exampleSentences = layer1.querySelectorAll('source');
            const exampleSentencesAudioUS = exampleSentences[0].getAttribute('src');
            const exampleSentencesAudioUK = exampleSentences[1].getAttribute('src');
            const exampleSentencesContent = (_c = layer1.querySelector('.noborder')) === null || _c === void 0 ? void 0 : _c.innerHTML.replace('\n', '').trim();
            const data = {
                id,
                unit: 0,
                vocabulary,
                dictionaryEntry,
                dictionaryAudioUK,
                dictionaryAudioUS,
                exampleSentencesContent,
                exampleSentencesAudioUS,
                exampleSentencesAudioUK,
            };
            listData.push(data);
        }
        return listData;
    });
});
const getReadingData = (page, unit) => __awaiter(void 0, void 0, void 0, function* () {
    const workspace = 'reading';
    yield page.goto(getURL(unit, workspace));
    // Get the "viewport" of the page, as reported by the page.
    return page.evaluate(() => {
        var _a, _b, _c;
        const removeSymbol = (str) => {
            const resultString = str.replaceAll(/\r?\n|\t/g, '').replaceAll(/\\t|\\n|<(?!br).+?>/g, '');
            const isMultipleLine = resultString.includes('<br>');
            if (isMultipleLine) {
                resultString.split('<br>').forEach(elem => {
                    return removeSymbol(elem);
                });
            }
            return resultString;
        };
        const removeSy = (str) => {
            const temp = str.replaceAll(/<a(?!br).+?>/g, `<a class="lightbox__modal" onclick="window.handleClick(this)">`);
            return temp.replaceAll(/\r?\n|\t/g, '');
        };
        const audioFIle = document.querySelectorAll('source')[0].getAttribute('src');
        const textContent = document.querySelector('.reading-well');
        const title = (_a = textContent === null || textContent === void 0 ? void 0 : textContent.querySelector('h2')) === null || _a === void 0 ? void 0 : _a.innerHTML.replaceAll('\n', '').trim();
        const arrContent = [];
        const arrPTag = textContent === null || textContent === void 0 ? void 0 : textContent.querySelectorAll('p');
        if (arrPTag) {
            for (const elem of arrPTag) {
                const isChildren = ((_b = elem.parentElement) === null || _b === void 0 ? void 0 : _b.tagName) === 'UL';
                (_c = elem.parentElement) === null || _c === void 0 ? void 0 : _c.tagName;
                const content = elem.innerHTML.trim();
                if (!content)
                    continue;
                if (isChildren) {
                    elem.innerHTML.split('<br>').forEach(item => {
                        arrContent.push({
                            id: 0,
                            plainText: removeSymbol(item),
                            plainTag: removeSy(`<p>${item}</p>`),
                            isChildren,
                        });
                    });
                }
                else {
                    const fullData = {
                        id: 0,
                        plainText: removeSymbol(content),
                        plainTag: removeSy(elem.outerHTML),
                        isChildren,
                    };
                    arrContent.push(fullData);
                }
            }
        }
        return {
            unit: 0,
            audioFIle,
            title,
            arrContent,
        };
    });
});
const loginFunction = (page) => {
    const emailLogin = 'xaythixin@gmail.com';
    const passwork = '28012011';
    return new Promise((resolve, reject) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            yield page.setViewport({ width: 1200, height: 720 });
            yield page.goto('https://www.english4it.com/login', { waitUntil: 'networkidle2' }); // wait until page load
            yield page.type('#email', emailLogin);
            yield page.type('#password', passwork);
            yield Promise.all([
                page.click('#login-button'),
                page.waitForNavigation({ waitUntil: 'networkidle0' }),
            ]);
            resolve(true);
        }
        catch (error) {
            reject('login fail');
        }
    }));
};
const mergeListTranslateToSlsxFormat = (arrVocabulary, arrReading) => {
    const tempArrTranslate = [];
    arrVocabulary.forEach((item) => {
        const { id, unit, vocabulary, dictionaryEntry, exampleSentencesContent, } = item;
        tempArrTranslate.push({
            id, english: vocabulary, translation: '', unit, sheet: 'vocabulary', noteType: 1,
        });
        tempArrTranslate.push({
            id, english: dictionaryEntry, translation: '', unit, sheet: 'vocabulary', noteType: 2,
        });
        tempArrTranslate.push({
            id, english: exampleSentencesContent, translation: '', unit, sheet: 'vocabulary', noteType: 3,
        });
    });
    for (const iterator of arrReading) {
        const { unit, title, arrContent, } = iterator;
        tempArrTranslate.push({
            id: `0`, english: title, translation: '', unit, sheet: 'reading', noteType: 0,
        });
        arrContent.forEach((item, index) => {
            item.id = ++index;
            const { id, plainText, } = item;
            tempArrTranslate.push({
                id, english: plainText, translation: '', unit, sheet: 'reading', noteType: 4,
            });
        });
    }
    writeToxlsx(tempArrTranslate, `translate`);
};
const writeToxlsx = (data, sheetName, fileName = './crawlData.xlsx') => {
    const file = xlsx_1.default.readFile(fileName);
    const ws = xlsx_1.default.utils.json_to_sheet(data);
    xlsx_1.default.utils.book_append_sheet(file, ws, sheetName);
    xlsx_1.default.writeFile(file, fileName);
};
const main = () => __awaiter(void 0, void 0, void 0, function* () {
    const arrUnit = [1, 2];
    const arrVocabulary = [];
    const arrReading = [];
    try {
        const browser = yield puppeteer_1.default.launch({ headless: false }); //{ headless: false }
        const page = yield browser.newPage();
        yield loginFunction(page);
        for (const unit of arrUnit) {
            const vocabularyDataResult = yield GetVocabulary(page, unit);
            vocabularyDataResult.forEach(ele => {
                ele.unit = unit;
                arrVocabulary.push(ele);
            });
            logger(`vocabulary_unit_${unit}`, vocabularyDataResult);
            writeToxlsx(vocabularyDataResult, `vocabulary_${unit}`);
            const readingDataResult = yield getReadingData(page, unit);
            readingDataResult.unit = unit;
            arrReading.push(readingDataResult);
            logger(`reading_unit_${unit}`, readingDataResult);
            writeToxlsx(readingDataResult.arrContent, `reading_${unit}`);
        }
        mergeListTranslateToSlsxFormat(arrVocabulary, arrReading);
        yield browser.close();
    }
    catch (error) {
        console.log(error);
    }
});
main();
