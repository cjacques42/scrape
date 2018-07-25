#!/usr/bin/env node

const Nightmare = require('nightmare')
const argv = require('yargs').argv
const chalk = require('chalk');
const async = require('async');
const fs = require('fs');
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
  console.log(chalk.yellow(`Usage: scrape <url> <url> <url> ...\n`));
  console.log(chalk.yellow(`\tscrape https://google.com https://exemple.com http://localhost:3000`));
  console.log(chalk.yellow(`\tscrape -i 6 https://google.com\t// speed of 6 request per second, default: 5`));
  console.log(chalk.yellow(`\tscrape -f file.txt\t// One url per line in the file`));
  return;
}

if (urls.length === 0) {
  console.log(chalk.yellow(`scrape -h`));
  return;
}

console.log(chalk.green('Loading ..\n'));
popAndSaveUrls();
var errors = [];
let q = async.queue(function(obj, callback) {
  request(obj, function(err, res) {
    if (err) {
      errors.push(obj);
      console.log(chalk.red(`${obj} KO`));
      popAndSaveUrls(obj, callback);
      return;
    }
    var clean = sanitizeHtml(res);
    console.log(chalk.green(`${obj} OK`));
    save(clean);
    popAndSaveUrls(obj, callback);
  });
  //   headers : {
  //     'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.110 Safari/537.36'
  //   }
}, option.i);

q.drain = function() {
  let txt = errors.join('\n');
  let fileError = 'error.txt';
  if (txt !== '') {
    fs.writeFileSync(fileError, txt);
    console.log(chalk.yellow('Check error.txt to see problematic url'));
  }
  console.log();
  console.log(chalk.yellow(`urls ${list.length - errors.length}/${list.length}`));
  console.log(chalk.red(`errors ${errors.length}`));
  console.log(chalk.yellow('Finished !'));
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
    console.log();
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

function request(url, callback) {
  const nightmare = Nightmare({ show: false })
  nightmare
    .goto(url)
    .wait(2000)
    .evaluate(function() {
      return document.body.innerHTML
    })
    .end()
    .then(function(obj) {
      callback(null, obj);
    })
    .catch(error => {
      callback(error);
    });
}
