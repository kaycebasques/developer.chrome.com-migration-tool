# docs-migration-tool

## Features

* Saves partial progress. Suppose you need to migrate 100 pages. You run the tool
  but your Wi-Fi fails halfway through. The next time you run the tool, it
  will pick up where you left off.

## TODO

### Add flag to disable done.txt

It's getting in the way during development.

### Configurability?

Perhaps we should accept a config file:

```
{
  "deletions": [
    "nav.inline-toc",
    "a.permalink"
  ],
  "modifications": [
    {
      "selector": "foo.bar",
      "function: "test"
    }
  ]
}
```

And allow the user to specify nodes to be deleted or modified.
We would also need to accept a JS file, e.g. `modifications.js`,
where they would specify how to modify each node.

It would make the tool reusable. But would add a significant amount
of development effort.

https://stackoverflow.com/questions/46088351/puppeteer-pass-variable-in-evaluate
https://github.com/puppeteer/puppeteer/blob/main/docs/api.md#class-jshandle