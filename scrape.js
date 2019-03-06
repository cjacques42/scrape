#!/usr/bin/env node

const Nightmare = require('nightmare');
const argv = require('yargs').argv;
const cheerio = require('cheerio');
const chalk = require('chalk');
const async = require('async');
const fs = require('fs');
const sanitizeHtml = require('sanitize-html');
const uuidv1 = require('uuid/v1');

let directory = 'file';
let { _: urls } = argv;

let options = {
  h: argv.h,
  i: argv.i || 5,
  f: argv.f,
  length: urls.length
};

let errors = [];
let q = async.queue(function(obj, callback) {
  request(obj, function(err, res) {
    if (err) {
      errors.push(obj);
      console.log(chalk.red(`${obj} KO`));
      return popAndSaveUrls(obj, callback);
    }
    save(res);
    console.log(chalk.green(`${obj} OK`));
    popAndSaveUrls(obj, callback);
  });
}, options.i);

q.drain = function() {
  let file = 'error.txt';
  if (errors.length) {
    let txt = errors.join('\n');
    try {
      fs.writeFileSync(file, txt);
      console.log(chalk.yellow('Check error.txt to see problematic url'));
    } catch (e) {
      console.log(chalk.yellow(`File: "${file}" can't be created/writed ...\n`));
    }
  }
  console.log();
  console.log(chalk.yellow(`urls ${options.length - errors.length}/${options.length}`), chalk.red(`errors ${errors.length}/${options.length}`));
};

if (options.f && !options.length) {
  try {
    let data = fs.readFileSync( `${ process.env.PWD }/${options.f}`, { encoding: 'utf8' });
    urls = data.split('\n').filter((el) => el);
    options.length = urls.length;
  } catch (e) {
    console.log(chalk.yellow(`File: "${options.f}" doesn't exists ...\n`));
  }
}

if (options.h) {
  console.log(chalk.yellow(`Usage: scrape <url> <url> <url> ...\n`));
  console.log(chalk.yellow(`\tscrape https://google.com https://exemple.com http://localhost:3000`));
  console.log(chalk.yellow(`\tscrape -i 6 https://google.com\t// speed of 6 request per second, default: 5`));
  console.log(chalk.yellow(`\tscrape -f file.txt\t// One url per line in the file`));
} else if (!urls.length) {
  console.log(chalk.yellow(`scrape -h`));
} else {
  console.log(chalk.blue('Loading ..\n'));
  popAndSaveUrls();
  q.push(urls);
}

function popAndSaveUrls(obj, callback) {
  if (obj) {
    let index = urls.indexOf(obj);
    if (index !== -1) {
      urls.splice(index, 1);
    }
  }
  if (urls.length === 0) {
    fs.unlink('urls.txt', (err) => {
      console.log();
      console.log(chalk.blue('urls.txt has been deleted'));
      callback && callback();
    });
  } else {
    fs.writeFileSync('urls.txt', urls.join('\n'));
    callback && callback();
  }
}

function save(html) {
  var withoutTags = sanitizeHtml(html);
  let uuid = uuidv1().split('-').join('');
  if ( !fs.existsSync( `${directory}` ) ) {
    fs.mkdirSync( `${directory}` );
  }
	fs.writeFileSync( `${directory}/${uuid}.html`, withoutTags);
}

function request(url, callback) {
  const nightmare = Nightmare({ show: false });
  nightmare
    .goto(url)
    .wait(2000)
    .evaluate(() => document.body.innerHTML)
    .end()
    .then(function(obj) {
      callback(null, obj);
    })
    .catch(error => {
      callback(error);
    });
}
