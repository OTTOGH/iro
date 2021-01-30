'use strict'

const express = require('express')
const router = express.Router()
const multer = require('multer')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const async = require('async')

const log = require('../log')
const tugOfWar = require('../models/tug-of-war')
const Image = require('../models/image')
const { resolve } = require('path')

router.use(multer({
  dest: './public/uploads/temps/',
  limits: {
    files: 10,
    fileSize: 10 * 1024 * 1024,
    fields: 2
  }
}))

router.get('/', function (req, res, next) {
  const viewsDirname = req.app.get('views')
  res.sendFile(path.normalize(
    `${viewsDirname}/tug-of-war/index.html`
  ), function (err) {
    if (err) return next(err)
  })
})

router.put('/teams/:name/image', async function (req, res, next) {
  const name = req.params.name
  const width = req.body.width
  const height = req.body.height
  const imageFile = req.files && req.files.image

  if (!imageFile)
    return res.sendStatus(400)

  const team = tugOfWar.teams[name]

  if (!team || imageFile.mimetype.indexOf('image/') !== 0) {
    fs.unlink(imageFile.path)
    return res.sendStatus(400)
  }
  try {
    function getImageId() {
      return new Promise((resolve, reject) => {
        const md5 = crypto.createHash('md5')
        const s = fs.ReadStream(imageFile.path)
        s.on('data', function (d) {
          md5.update(d)
        })
        s.on('end', function () {
          resolve(md5.digest('hex'));
        })
      })

    }
    const imageId = await getImageId();
    const image = await Image.findById(imageId, 'fileName') 
    if (image) {
      if (team.image) return res.sendStatus(400)
      team.image = `/uploads/${image.fileName}`
      res.sendStatus(201)
      res.locals.io.emit('update', tugOfWar)
      return
    }
    async function renameFile() {
      const FILE_NAME = `${imageId}${path.extname(imageFile.name)}`
      const IMAGE_SRC = `/uploads/${FILE_NAME}`

      fs.renameSync(
        imageFile.path,
        path.normalize(`${__dirname}/../public${IMAGE_SRC}`))

      if (team.image) return res.sendStatus(400)

      team.image = IMAGE_SRC
      res.sendStatus(201)
      res.locals.io.emit('update', tugOfWar)
      return FILE_NAME;
    }
    const fileName = await renameFile();
    function findByIdAndUpdate() {
      return new Promise(async (resolve, reject) => {
        await Image.findByIdAndUpdate(
          imageId,
          {
            uploadTime: new Date(),
            fileName: fileName,
            width: width,
            height: height
          },
          { upsert: true, select: '_id' },
          function (err) {
            if (err) log(err)
            resolve();
          }
        )
      })
    }
    await findByIdAndUpdate()
  } catch (err) {
    if (err) return next(err)
  }
})

module.exports = router
