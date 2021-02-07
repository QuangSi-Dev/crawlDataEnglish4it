import puppeteer from 'puppeteer'
import { Page } from 'puppeteer/lib/cjs/puppeteer/common/Page';
import 'ts-replace-all'
import reader from 'xlsx'

const getURL = (unit: number, workspace: string): string => `https://www.english4it.com/module/core/unit/${unit}/${workspace}`;

const logger = (workspace: string, data: any): void => console.log(`${workspace}:`, data);

const GetVocabulary = async (page: Page, unit: number) => {
    const workspace = 'vocabulary';
    await page.goto(getURL(unit, workspace));
    // Get the "viewport" of the page, as reported by the page.
    return page.evaluate(() => {
        const elemClass = ".dictionary-lightbox"
        const listElement = Array.from(document.querySelectorAll(elemClass));
        const listData = [];

        for (const iterator of listElement) {
            const layer0 = iterator.children[0];
            const layer1 = iterator.children[3];
            const idString = layer0.querySelector('audio')?.getAttribute('id');
            const id = idString ? idString.split(/[--]/)[1] : null;
            const vocabulary = layer0.children[1].children[0].innerHTML.replace('\n', '').trim();
            const dictionary = layer0.querySelectorAll('source');
            const dictionaryAudioUS = dictionary[0].getAttribute('src');
            const dictionaryAudioUK = dictionary[1].getAttribute('src');

            const dictionaryEntry = layer0.querySelector('dd')?.innerHTML.replace('\n', '').trim();

            const exampleSentences = layer1.querySelectorAll('source');
            const exampleSentencesAudioUS = exampleSentences[0].getAttribute('src');
            const exampleSentencesAudioUK = exampleSentences[1].getAttribute('src');

            const exampleSentencesContent = layer1.querySelector('.noborder')?.innerHTML.replace('\n', '').trim();

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
            }
            listData.push(data);
        }
        return listData;
    });
}

const getReadingData = async (page: Page, unit: number) => {
    const workspace = 'reading';
    await page.goto(getURL(unit, workspace));
    // Get the "viewport" of the page, as reported by the page.
    return page.evaluate(() => {

        const removeSymbol = (str: string): any => {
            const resultString = str.replaceAll(/\r?\n|\t/g, '').replaceAll(/\\t|\\n|<(?!br).+?>/g, '')
            const isMultipleLine = resultString.includes('<br>')
            if (isMultipleLine) {
                resultString.split('<br>').forEach(elem => {
                    return removeSymbol(elem)
                })
            }
            return resultString
        }

        const removeSy = (str: string) => {
            const temp = str.replaceAll(/<a(?!br).+?>/g, `<a class="lightbox__modal" onclick="window.handleClick(this)">`)
            return temp.replaceAll(/\r?\n|\t/g, '');
        }

        const audioFIle = document.querySelectorAll('source')[0].getAttribute('src');
        const textContent = document.querySelector('.reading-well');

        const title = textContent?.querySelector('h2')?.innerHTML.replaceAll('\n', '').trim();

        const arrContent = [];

        const arrPTag = textContent?.querySelectorAll('p')

        if (arrPTag) {
            for (const elem of arrPTag) {
                const isChildren = elem.parentElement?.tagName === 'UL'
                elem.parentElement?.tagName
                const content = elem.innerHTML.trim();
                if (!content) continue;

                if (isChildren) {
                    elem.innerHTML.split('<br>').forEach(item => {
                        arrContent.push({
                            id: 0,
                            plainText: removeSymbol(item),
                            plainTag: removeSy(`<p>${item}</p>`),
                            isChildren,
                        });
                    })

                } else {
                    const fullData = {
                        id: 0,
                        plainText: removeSymbol(content),
                        plainTag: removeSy(elem.outerHTML),
                        isChildren,
                    }
                    arrContent.push(fullData);
                }
            }
        }

        return {
            unit: 0,
            audioFIle,
            title,
            arrContent,
        }
    });
}

const loginFunction = (page: Page): Promise<boolean> => {
    const emailLogin = 'xaythixin@gmail.com'
    const passwork = '28012011'
    return new Promise(async (resolve, reject) => {
        try {
            await page.setViewport({ width: 1200, height: 720 });
            await page.goto('https://www.english4it.com/login', { waitUntil: 'networkidle2' }); // wait until page load
            await page.type('#email', emailLogin);
            await page.type('#password', passwork);

            await Promise.all([
                page.click('#login-button'),
                page.waitForNavigation({ waitUntil: 'networkidle0' }),
            ]);
            resolve(true)
        } catch (error) {
            reject('login fail')
        }
    })
}

const mergeListTranslateToSlsxFormat = (arrVocabulary: any[], arrReading: any) => {
    const tempArrTranslate: { id: any; english: any; translation: string; unit: any; sheet: string; noteType?: number; }[] = [];
    arrVocabulary.forEach((item) => {
        const { id,
            unit,
            vocabulary,
            dictionaryEntry,
            exampleSentencesContent, } = item
        tempArrTranslate.push({
            id, english: vocabulary, translation: '', unit, sheet: 'vocabulary', noteType: 1,
        });
        tempArrTranslate.push({
            id, english: dictionaryEntry, translation: '', unit, sheet: 'vocabulary', noteType: 2,
        })
        tempArrTranslate.push({
            id, english: exampleSentencesContent, translation: '', unit, sheet: 'vocabulary', noteType: 3,
        })
    });

    for (const iterator of arrReading) {
        const { unit,
            title,
            arrContent, } = iterator;

        tempArrTranslate.push({
            id: `0`, english: title, translation: '', unit, sheet: 'reading', noteType: 0,
        })

        arrContent.forEach((item: any, index: number) => {
            item.id = ++index;
            const { id, plainText, } = item
            tempArrTranslate.push({
                id, english: plainText, translation: '', unit, sheet: 'reading', noteType: 4,
            });
        });
    }

    writeToxlsx(tempArrTranslate, `translate`);


}

const writeToxlsx = (data: any[], sheetName: string, fileName: string = './crawlData.xlsx') => {
    const file = reader.readFile(fileName)
    const ws = reader.utils.json_to_sheet(data)
    reader.utils.book_append_sheet(file, ws, sheetName)
    reader.writeFile(file, fileName)
}

const main = async () => {
    const arrUnit = [1, 2];
    const arrVocabulary: any[] = [];
    const arrReading: any[] = [];
    try {
        const browser = await puppeteer.launch({ headless: false });//{ headless: false }
        const page = await browser.newPage();

        await loginFunction(page);

        for (const unit of arrUnit) {
            const vocabularyDataResult = await GetVocabulary(page, unit);
            vocabularyDataResult.forEach(ele => {
                ele.unit = unit;
                arrVocabulary.push(ele)
            });
            logger(`vocabulary_unit_${unit}`, vocabularyDataResult)
            writeToxlsx(vocabularyDataResult, `vocabulary_${unit}`);

            const readingDataResult = await getReadingData(page, unit);
            readingDataResult.unit = unit;
            arrReading.push(readingDataResult);
            logger(`reading_unit_${unit}`, readingDataResult)
            writeToxlsx(readingDataResult.arrContent, `reading_${unit}`);
        }
        mergeListTranslateToSlsxFormat(arrVocabulary, arrReading)
        await browser.close();
    } catch (error) {
        console.log(error)
    }
}

main();
