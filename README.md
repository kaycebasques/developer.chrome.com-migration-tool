# docs-migration-tool

An automated tool for converting web pages to Markdown.

## Prerequisite knowledge

This tool requires basic knowledge of JavaScript, HTML, git, and command line interfaces.

## Assumptions

This tool has only been developed and used on macOS Catalina.

## Features

### Remove nodes declaratively

### Modify nodes flexibly

### Save partial progress

Suppose you need to migrate 100 pages. You run the tool
but your screen goes to sleep, or your Wi-Fi fails halfway through.
Set `history` to `true` in `config.json` to instruct the tool to
pick up where you left off.

### Copy images

## Get started

### Installation

1. [Install nvm][nvm].

1. Use nvm to install Node.js version 12.18.4:

       nvm install 12.18.4

1. Use nvm to set 12.18.4 as your active version:

       nvm use 12.18.4

   You can optionally set version 12.18.4 as your default:

       nvm alias default 12.18.4

1. Clone this repository:

       git clone git@github.com:kaycebasques/docs-migration-tool.git

1. Set your working directory to the repository:

       cd path/to/docs-migration-tool

1. Install NPM packages:

       npm install

### Setup

1. Add the list of URLs that you want to migrate to `targets.txt`:

       https://developer.chrome.com/extensions
       https://developer.chrome.com/extensions/getstarted
       https://developer.chrome.com/extensions/overview

1. Open `config.json`.

1. Set the `selector` property to the DOM selector of the main content:

       "selector": "div[itemprop=\"articleBody\"]"

1. Use the `deletions` property to specify any nodes that should be deleted.
   Each item in the array should be a DOM selector:

       "deletions": [
         "nav.inline-toc",
         "a.permalink"
       ]

1. Use the `modifications` property to specify a path to a JavaScript file
   that will modify each page before converting to Markdown:

       "modifications": "modifications/dcc.js"

1. Create your modification script (e.g. `modifications/dcc.js`) and add the modification
   code:

       // Wrap each <pre class="prettyprint"> element in a <code> element
       // so that the Markdown converting tool formats them properly as codeblocks.
       document.querySelectorAll('pre.prettyprint').forEach(target => {
         const code = document.createElement('code');
         code.innerHTML = target.innerHTML;
         target.innerHTML = '';
         target.appendChild(code);
       });

### Usage

1. Run the conversion script:

       npm run convert

[nvm]: https://github.com/nvm-sh/nvm#installing-and-updating