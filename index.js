const readline = require('readline');
const puppeteer = require('puppeteer');
const fs = require('fs');
const TurndownService = require('turndown');
const axios = require('axios');
const outputDirectory = 'output';
const events = require('events');
let config;
let modifications;

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
  if (fs.existsSync('./modifications.js')) {
    // TODO do we need this anymore for any reason?
  }
  if (!fs.existsSync('./done.txt')) {
    fs.writeFileSync('./done.txt', '');
  }
  const eventsEmitter = new events.EventEmitter();
  eventsEmitter.addListener('ready', () => {
    if (!sentinels.targets || !sentinels.done) return;
    // Remove the pages that we've already crawled from the list of targets.
    const targetsSet = new Set(targets);
    const doneSet = new Set(done);
    for (let element of doneSet) {
      targetsSet.delete(element);
    }
    targets = Array.from(targetsSet);
    migrate(targets, done);
  });
  // TODO(kaycebasques): Delete the old output directory?
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
  // TODO What happens if done.txt doesn't exist?
  const doneFile = readline.createInterface({
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
  if (!config) return;
  // TODO check if the proposed functions already exist on the window object
  // and throw an error if so.
  await page.addScriptTag({
    path: './modifications.js'
  });
  // TODO this logic is convoluted now. Just have the user create their own
  // modifications in modifications.js?
  const targets = config.modifications;
  for (let i = 0; i < targets.length; i++) {
    const target = targets[i];
    const name = target.function;
    await page.$$eval(target.selector, (nodes, name) => {
      nodes.forEach(node => {
        window[name](node);
      });
    }, name);
  }
}

async function cleanup(page) {
  if (!config) return;
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
    const contentSelector = config.content;
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
    fs.writeFileSync('done.txt', done);
  }
  await browser.close();
}

try {
  init();
} catch (error) {
  console.error({error});
}