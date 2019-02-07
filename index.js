const cheerio = require('cheerio')
const fs = require('fs')
const path = require('path')
const request = require('request')

const baseURI = 'https://www.pixiv.net'
const alignBy = 'daily'
const fetchIn = '50'
const saveDir = '/assets'

// NOTE: From stackoverflow, original function 'mkDirByPathSync'
const makeTree = target => {
  const sep = '/'
  const directory = {
    init: path.isAbsolute(target) ? sep : '',
    base: '.'
  }

  return target.split(sep).reduce((parent, child) => {
    const current = path.resolve(directory.base, parent, child)

    try {
      fs.mkdirSync(current)
    } catch (error) {
      if (error.code === 'EEXIST') return current
      if (error.code === 'ENOENT') throw new Error(`EACCES: Permission denied for 'mkdirSync ${parent}'`)

      const caughtError = ['EACCES', 'EPERM', 'EISDIR'].indexOf(err.code) > -1
      if (!caughtError || caughtError && current === path.resolve(target)) throw error
    }
  })
}
const makeAgent = uri => {
  return {
    url: uri,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Safari/537.36',
      'Referer': baseURI
    }
  }
}
const fetchRanking = page => {
  return new Promise((resolve, reject) => {
    request(makeAgent(`${baseURI}/ranking.php?mode=${alignBy}&content=illust&p=${page}&format=json`), (error, response, body) => {
      if (error || response.statusCode !== 200) {
        console.error(error || `Returned statusCode: ${response.statusCode}`)
        throw new Error('Pixiv denied connection, please try later. (at function fetchRanking())')
      }
      const ranking = JSON.parse(body).contents

      resolve(ranking)
    })
  })
}
const getImageURL = illust => {
  return new Promise((resolve, reject) => {
    request(makeAgent(`${baseURI}/member_illust.php?mode=medium&illust_id=${illust.illust_id}`), (error, response, body) => {
      if (error || response.statusCode !== 200) {
        console.error(error || `Returned statusCode: ${response.statusCode}`)
        throw new Error('Pixiv denied connection, please try later. (at function fetchRanking())')
      }
      const $ = cheerio.load(body)
      const staticImage = $(`img[alt="${illust.title}\/${illust.user_name}"]`).attr('src').replace('128x128', '600x600')

      resolve(staticImage)
    })
  })
}
const saveAs = (url, path) => {
  return new Promise((resolve, reject) => {
    request(makeAgent(url)).pipe(fs.createWriteStream(`./${saveDir}/${path}.${url.split('.')[url.split('.').length-1]}`))
      .on('finish', () => resolve())
  })
}

// NOTE: Launch
makeTree(saveDir)

for (i = 1; i <= fetchIn / 50; i++) {
  fetchRanking(i).then(dataArray => dataArray.forEach((illust, i) => {
    getImageURL(illust).then(url => saveAs(url, illust.title).then(() => console.log(`Saved illustration(${illust.title}), ${i + 1} of ${fetchIn}...`)))
  }))
}
