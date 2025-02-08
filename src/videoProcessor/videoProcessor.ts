import AWS from "aws-sdk"
import dotenv from "dotenv"

dotenv.config()
import * as sendMail from '../mailer/sendMail'
import fs from "fs"
import path from "path"
import ffmpeg from 'fluent-ffmpeg'
import ffmpegStatic from 'ffmpeg-static'
import archiver from 'archiver'

interface IEvent {
  videoId: number,
  fileKey: string
}

const s3 = new AWS.S3({
  accessKeyId: process.env.CLOUD_ACCESS_KEY,
  secretAccessKey: process.env.CLOUD_SECRET_KEY,
})

export const main = async (event: any): Promise<boolean> => {
  try {
    // Configurar o caminho do binário ffmpeg
    ffmpeg.setFfmpegPath(ffmpegStatic as string)
    console.log('ffmpegPath', ffmpegStatic)

    if (!event) {
      throw new Error('Evento não informado')
    }

    const record = event.Records[0]

    const body = typeof record.body === 'string' ? JSON.parse(record.body) : record.body
    const { fileKey } = body

    if (!body.fileKey) {
      throw new Error('fileKey não informado')
    }

    const tmpDir = path.join('/tmp', 'video-processor')

    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir)
    } else {
      console.log(`Directory ${tmpDir} already exists. No need to create.`);
    }

    const videoPath = path.join(tmpDir, `video.${fileKey.split('.')[1]}`)

    const videoData = await s3.getObject({
      Bucket: process.env.CLOUD_STORAGE_BUCKET ?? '',
      Key: fileKey
    }).promise()

    if (!videoData || !videoData.Body) {
      throw new Error('Vídeo não encontrado')
    }

    fs.writeFileSync(videoPath, Buffer.from(videoData.Body as any))

    const framesDir = path.join(tmpDir, 'frames')

    if (!fs.existsSync(framesDir)) {
      fs.mkdirSync(framesDir)
    } else {
      console.log(`Directory ${framesDir} already exists. No need to create.`);
    }

    await new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .on('end', resolve)
        .on('error', reject)
        .output(path.join(framesDir, 'frame_%04d.jpg'))
        .outputOptions('-vf', 'fps=20')
        .run()
    })

    const zipPath = path.join(tmpDir, 'output.zip')
    const output = fs.createWriteStream(zipPath)
    const archive = archiver('zip', {
      zlib: { level: 9 }
    })

    output.on('close', () => {
      console.log(`Created zip file with ${archive.pointer()} total bytes`)
    })

    archive.on('error', (err) => {
      throw err
    })

    archive.pipe(output)
    archive.directory(framesDir, false)
    await archive.finalize()

    const zipKey = `processed/${fileKey.split('.')[0]}.zip`

    const zipFile = fs.readFileSync(zipPath)

    await s3.upload({
      Bucket: process.env.CLOUD_STORAGE_BUCKET ?? '',
      Key: zipKey,
      Body: zipFile
    }).promise()

    const signedUrl = await s3.getSignedUrlPromise('getObject', {
      Bucket: process.env.CLOUD_STORAGE_BUCKET ?? '',
      Key: zipKey,
      Expires: 60 * 5
    })

    if (signedUrl) {
      await sendMail.main({
        ...event,
        Records: [{
          body: {
            ...body,
            success: true,
            signedUrl
          }
        }]
      })
    }

    return true

  } catch (error) {
    console.error('Error:', error)
    throw new Error(JSON.stringify(error))
  }
}
