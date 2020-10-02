const readline = require('readline');
const puppeteer = require('puppeteer');
const fs = require('fs');
const TurndownService = require('turndown');
const axios = require('axios');
const outputDirectory = 'output';
const events = require('events');
let config;

function init() {
  let targets = [];
  let done = [];
  let sentinels = {
    targets: false,
    done: false
  };
  if (fs.existsSync('./config.json')) {
    config = require('./config.json');
  }
  if (config.history && !fs.existsSync('./done.txt')) {
    fs.writeFileSync('./done.txt', '');
  }
  const eventsEmitter = new events.EventEmitter();
  eventsEmitter.addListener('ready', () => {
    // User has indicated that they want to record progress but we're not yet done
    // reading the done.txt file, so there's no work to do yet.
    if (config.history && !sentinels.done) return;
    if (!sentinels.targets) return;
    // Remove the pages that we've already crawled from the list of targets.
    const targetsSet = new Set(targets);
    const doneSet = new Set(done);
    for (let element of doneSet) {
      targetsSet.delete(element);
    }
    targets = Array.from(targetsSet);
    migrate(targets, done);
  });
  // TODO(kaycebasques): How do we handle this when the user has indicated that
  // they want to save progress? Should we not delete the output directory?
  fs.rmdirSync(outputDirectory, {recursive: true});
  const targetsFile = readline.createInterface({
    input: fs.createReadStream('targets.txt')
  });
  targetsFile.on('line', line => {
    targets.push(line);
  });
  targetsFile.on('close', () => {
    sentinels.targets = true;
    eventsEmitter.emit('ready');
  });
  let doneFile;
  if (config.history) {
    donefile = readline.createInterface({
      input: fs.createReadStream('done.txt')
    });
    doneFile.on('line', line => {
      done.push(line);
    });
    doneFile.on('close', () => {
      sentinels.done = true;
      eventsEmitter.emit('ready');
    });
  }
}

async function download(image, destinationDirectory) {
  const pathname = new URL(image).pathname;
  const filename = pathname.substring(pathname.lastIndexOf('/') + 1);
  const destination = `${destinationDirectory}/${filename}`;
  const writer = fs.createWriteStream(destination);
  const response = await axios({
    url: image,
    method: 'GET',
    responseType: 'stream'
  });
  response.data.pipe(writer);
}

async function modify(page) {
  if (!config || !config.modifications || !fs.existsSync(config.modifications)) return;
  await page.addScriptTag({
    path: config.modifications
  });
}

async function cleanup(page) {
  if (!config || !config.deletions) return;
  const selectors = config.deletions;
  for (let i = 0; i < selectors.length; i++) {
    const selector = selectors[i];
    await page.$$eval(selector, nodes => nodes.forEach(node => node.remove()));
  }
}

async function migrate(targets, done) {
  // TODO get the config if it exists and use its deletion/modification directions
  //const config = require('./config.json');
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true
  });
  const page = await browser.newPage();
  // TODO move to init? And expose page as a global?
  done = done.length > 0 ? `${done.join('\n')}` : '';
  for (let i = 0; i < targets.length; i++) {
    const target = targets[i];
    const pathname = new URL(target).pathname;
    const destination = `${outputDirectory}${pathname}`;
    fs.mkdirSync(destination, {recursive: true});
    await page.goto(target, {
      waitUntil: 'networkidle2'
    });
    await cleanup(page);
    await modify(page);
    // TODO move to config.json
    const contentSelector = config.selector;
    const html = await page.$eval(contentSelector, element => element.innerHTML);
    const images = await page.$$eval(`${contentSelector} img`, images => images.map(image => image.src));
    for (let i = 0; i < images.length; i++) {
      await download(images[i], destination);
    }
    const turndownService = TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      linkStyle: 'referenced'
    });
    const markdown = turndownService.turndown(html);
    fs.writeFileSync(`${destination}/index.md`, markdown);
    done += `${target}\n`;
    if (config.history) fs.writeFileSync('done.txt', done);
  }
  await browser.close();
}

try {
  init();
} catch (error) {
  console.error({error});
}