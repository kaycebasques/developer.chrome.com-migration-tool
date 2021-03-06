// TODO handle <kbd>

const readline = require('readline');
const puppeteer = require('puppeteer');
const fs = require('fs');
const TurndownService = require('turndown');
const axios = require('axios');
let outputDirectory = 'output';
const events = require('events');
const prettier = require('prettier');
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
  if (config.output) outputDirectory = config.output;
  // TODO(kaycebasques): How do we handle this when the user has indicated that
  // they want to save progress? Should we not delete the output directory?
  // fs.rmdirSync(outputDirectory, {recursive: true});
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
  try {
    const response = await axios({
      url: image,
      method: 'GET',
      responseType: 'stream'
    });
    const writer = fs.createWriteStream(destination);
    response.data.pipe(writer);
  } catch (error) {
    console.error(`Error while attempting to download ${image}`);
    return null;
  }
}

async function modify(page) {
  if (!config || !config.modifications || !fs.existsSync(config.modifications)) return;
  await page.addScriptTag({
    path: config.modifications
  });
  // TODO(kaycebasques): Document that the modifying script needs to set window.modificationsDone
  // to signal when we can proceed. E.g. without this we just insert the modification script
  // without waiting for it to finish.
  await page.waitForFunction(() => 'modificationsDone' in window);
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
    let frontmatter = '---\n';

    if (config.layouts) {
      for (const layout in config.layouts) {
        if (target.includes(layout)) frontmatter += `layout: "${config.layouts[layout]}"\n`;
      }
    }

    console.info(`Scraping ${target}`);
    const pathname = new URL(target).pathname;
    // const destination = `${outputDirectory}${pathname}`;
    // fs.mkdirSync(destination, {recursive: true});
    try {
      const response = await page.goto(target, {
        waitUntil: 'networkidle0'
      });
      const url = await page.url();
      if (url !== target) {
        console.error(`Skipping because of redirection to ${url}`);
        continue;
      }
    } catch (error) {
      console.error(`Error visiting ${target}`);
      continue;
    }
    // Modification needs to happen before the authors logic because the author nodes
    // don't exist until the modification script runs.
    await modify(page);
    // Need to extract the title before cleanup() so that we don't have duplicate titles on the page
    if (config.selectors.title) {
      const title = await page.$eval(config.selectors.title, element => element.textContent);
      frontmatter += `title: "${title}"\n`;
    }
    if (config.selectors.author) {
      const authors = await page.$$eval(config.selectors.author, elements => elements.map(element => element.textContent));
      if (authors.length > 0) {
        frontmatter += `authors:\n`;
        frontmatter += `${authors.map(author => `  - ${author}\n`)}`;
      }
    }
    await cleanup(page);
    // TODO move to config.json
    const contentSelector = config.selectors.main;
    let html;
    try {
      html = await page.$eval(contentSelector, element => element.innerHTML);
    } catch (error) {
      console.error('Main selector not found.');
      continue;
    }
    if (config.selectors.date) {
      // Added this because in the case of developers.google.com/web, we do a network request
      // to fetch the creation date and insert that information into the page.
      // TODO(kaycebasques): Just loop through all user-provided selectors and wait for them all?
      await page.waitForSelector(config.selectors.date);
      const date = await page.$eval(config.selectors.date, element => element.textContent);
      frontmatter += `date: ${date}\n`;
    } else {
      frontmatter += `#date: TODO\n`;
    }
    if (config.selectors.update) {
      await page.waitForSelector(config.selectors.update);
      const update = await page.$eval(config.selectors.update, element => element.textContent);
      frontmatter += `updated: ${update}\n`;
    } else {
      frontmatter += `#updated: TODO\n`;
    }
    if (config.selectors.authors) {
      await page.waitForSelector(config.selectors.authors);
      const authors = await page.$$eval(config.selectors.authors, nodes => nodes.map(node => node.textContent));
      console.log({authors});
      // frontmatter += `updated: ${update}\n`;
    }
    if (config.selectors.description) {
      try {
        await page.waitForSelector(config.selectors.description.selector);
        const description = await page.$eval(config.selectors.description.selector, (element, property) => element[property], config.selectors.description.property);
        frontmatter += `description: "${description}"\n`;
      } catch (error) {
        console.error('Description element not found.');
        frontmatter += `#description: TODO\n`;
      }
    }
    // try {
    //   const description = await page.$eval('meta[name="description"]', element => element.content);
    //   frontmatter += `description: ${description}\n`;
    // } catch (error) {
    //   console.error('Description element not found.');
    // }
    const destination = `${outputDirectory}${pathname}`;
    fs.mkdirSync(destination, {recursive: true});
    const images = await page.$$eval(`${contentSelector} img`, images => images.map(image => image.src));
    for (let i = 0; i < images.length; i++) {
      await download(images[i], destination);
    }
    const turndownService = TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      linkStyle: 'referenced',
      linkReferenceStyle: 'full'
    });
    turndownService.keep(['table', 'kbd']);
    // TODO(kaycebasques): Refactor this DCC-specific code.
    // turndownService.keep(node => {
    //   return node.nodeName === 'DIV' && node.classList.contains('aside--note');
    // });
    // turndownService.keep(node => {
    //   return node.nodeName === 'DIV' && node.classList.contains('aside--caution');
    // });
    // turndownService.keep(node => {
    //   return node.nodeName === 'DIV' && node.classList.contains('aside--warning');
    // });
    // Not working. Can't get a newline after first !!! characters.
    turndownService.addRule('notes', {
      filter: node => {
        return node.nodeName === 'ASIDE' && node.classList.contains('note');
      },
      replacement: (content, node) => {
        return `!!!.aside.aside--note\n\n${content}\n\n!!!\n\n`
      }
    });
    turndownService.addRule('videos', {
      filter: node => {
        return node.nodeName === 'P' && node.classList.contains('docs-migration-tool-video');
      },
      replacement: (content, node) => {
        return `{% youtube id="${content}" %}\n\n`;
      }
    });
    turndownService.addRule('cautions', {
      filter: node => {
        return node.nodeName === 'ASIDE' && node.classList.contains('caution');
      },
      replacement: (content, node) => {
        return `!!!.aside.aside--caution\n\n${content}\n\n!!!\n\n`;
      }
    });
    turndownService.addRule('warnings', {
      filter: node => {
        return node.nodeName === 'ASIDE' && node.classList.contains('warning');
      },
      replacement: (content, node) => {
        return `!!!.aside.aside--warning\n\n${content}\n\n!!!\n\n`
      }
    });
    turndownService.addRule('h2', {
      filter: node => {
        return node.nodeName === 'H2' && node.hasAttribute('id');
      },
      replacement: (content, node) => {
        return `## ${content} {: #${node.id} }\n\n`;
      }
    });
    turndownService.addRule('h3', {
      filter: node => {
        return node.nodeName === 'H3' && node.hasAttribute('id');
      },
      replacement: (content, node) => {
        return `### ${content} {: #${node.id} }\n\n`;
      }
    });
    turndownService.addRule('h4', {
      filter: node => {
        return node.nodeName === 'H4' && node.hasAttribute('id');
      },
      replacement: (content, node) => {
        return `#### ${content} {: #${node.id} }\n\n`;
      }
    });
    turndownService.addRule('h5', {
      filter: node => {
        return node.nodeName === 'H5' && node.hasAttribute('id');
      },
      replacement: (content, node) => {
        return `##### ${content} {: #${node.id} }\n\n`;
      }
    });
    // turndownService.addRule('dt', {
    //   filter: 'dt',
    //   replacement: function (content) {
    //     return '\n\n' + content + '\n\n';
    //   }
    // });
    // turndownService.addRule('dd', {
    //   filter: 'dd',
    //   replacement: function (content) {
    //     return `: ${content}`;
    //   }
    // });
    let markdown = turndownService.turndown(html);
    // Remove smart quotes.
    markdown = markdown.replace(/’/g, "'");
    markdown = markdown.replace(/“/g, '"');
    markdown = markdown.replace(/”/g, '"');
    frontmatter += '---\n\n';
    let output = `${markdown}`;
    if (config.frontmatter) output = `${frontmatter}${output}`; 
    const formattedOutput = prettier.format(output, { 
      parser: 'markdown', 
      proseWrap: 'always',
      printWidth: 100
    });
    fs.writeFileSync(`${destination}/index.md`, formattedOutput);
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