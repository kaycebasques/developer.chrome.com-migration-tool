const readline = require('readline');
const puppeteer = require('puppeteer');
const fs = require('fs');
const TurndownService = require('turndown');
const axios = require('axios');
const outputDirectory = 'output';
const events = require('events');

function init() {
  let targets = [];
  let done = [];
  let sentinels = {
    targets: false,
    done: false
  };
  function updateTargets() {
    const targetsSet = new Set(targets);
    const doneSet = new Set(done);
    for (let element of doneSet) {
      targetsSet.delete(element);
    }
    targets = Array.from(targetsSet);
  }
  const eventsEmitter = new events.EventEmitter();
  eventsEmitter.addListener('ready', () => {
    if (!sentinels.targets || !sentinels.done) return;
    updateTargets();
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
  await page.$$eval('pre.prettyprint', targets => {
    targets.forEach(target => {
      const code = document.createElement('code');
      code.innerHTML = target.innerHTML;
      target.innerHTML = '';
      target.appendChild(code);
    });
  });
}

async function cleanup(page) {
  const selectors = [
    'nav.inline-toc',
    'a.permalink'
  ];
  for (let i = 0; i < selectors.length; i++) {
    const selector = selectors[i];
    await page.$$eval(selector, nodes => nodes.forEach(node => node.remove()));
  }
}

async function migrate(targets, done) {
  const browser = await puppeteer.launch({
    headless: false
  });
  const page = await browser.newPage();
  done = `${done.join('\n')}\n`;
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
    const contentSelector = 'div[itemprop="articleBody"]';
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