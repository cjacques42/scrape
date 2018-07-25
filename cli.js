#!/usr/bin/env node

const argv = require('yargs').argv
const chalk = require('chalk');
const async = require('async');
const axios = require('axios');
const fs = require('fs');
// const cheerio = require('cheerio');
var sanitizeHtml = require('sanitize-html');
const uuidv1 = require('uuid/v1');

let directory = 'file';
let { _, i, h, f } = argv;

let option = {
  'i': 5,
}
option.i = (i) ? i : option.i;

if (f && _.length === 0) {
  let data = fs.readFileSync( `${ process.env.PWD }/${f}`, {
    encoding: 'utf8'
  });
  if (data) {
    _ = data.split('\n');
  }
}

let urls = _.slice();
let list = _;
let len = list.length;

if (_.length < option.i) {
  option.i = 1;
}

if (h) {
  console.log(chalk.yellow(`USAGE :\n`));
  console.log(chalk.yellow(`\tscrape https://google.com https://exemple.com http://localhost:3000`));
  console.log(chalk.yellow(`\tscrape -i 6 https://google.com\t// speed of 6 request per second, default: 5`));
  console.log(chalk.yellow(`\tscrape -f file.txt`));
  return;
}

if (urls.length === 0) {
  console.log(chalk.yellow(`scrape -h`));
  return;
}

popAndSaveUrls();
var errors = [];
let q = async.queue(function(obj, callback) {
  axios.get(obj)
    .then(function (response) {
      let dirtyHtml = response.data;
      var dirty = 'some really tacky HTML';
      var clean = sanitizeHtml(dirtyHtml);
      console.log(chalk.green(`${obj} OK`));
      save(clean);
      popAndSaveUrls(obj, callback);
    })
    .catch(function (error) {
      errors.push(obj);
      console.log(chalk.red(`${obj} KO`));
      popAndSaveUrls(obj, callback);
    });
}, option.i);

q.drain = function() {
  let txt = errors.join('\n');
  let fileError = 'error.txt';
  if (txt !== '') {
    fs.writeFileSync(fileError, txt);
    console.log(chalk.yellow('Check error.txt to see problematic url'));
  }
  console.log(chalk.yellow('Finished'));
};

q.push(list);

function popAndSaveUrls(obj, callback) {
  if (obj) {
    let index = urls.indexOf(obj);
    if (index !== -1) {
      urls.splice(index, 1);
    }
  }
  if (urls.length === 0) {
    fs.unlink('urls.txt', (err) => {
      console.log(chalk.green('urls.txt has been deleted'));
      if (callback) {
        callback();
      }
    });
  } else {
    fs.writeFileSync('urls.txt', urls.join('\n'));
    if (callback) {
      callback();
    }
  }
}

function save(html) {
  let randomFilename = uuidv1().split('-').join('');
  if ( !fs.existsSync( `${directory}` ) )
			fs.mkdirSync( `${directory}` );
	fs.writeFileSync( `${directory}/${randomFilename}.html`, html);
}
