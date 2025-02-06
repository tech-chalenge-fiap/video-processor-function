import AWS from "aws-sdk"
import dotenv from "dotenv"

dotenv.config()
import { execSync } from "child_process"
import fs from "fs"
import path from "path"
import ffmpeg from 'ffmpeg'
import ffpmegStatic from '@ffmpeg-installer/ffmpeg'

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
    console.log('ffmpegPath', ffpmegStatic.path)

    const { fileKey } = JSON.parse(JSON.stringify(event.Records[0].body))

    if (!event) {
      throw new Error('Evento não informado')
    }

    const tmpDir = path.join(__dirname, 'tmp');

    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir)
    } else {
      console.log(`Directory ${tmpDir} already exists. No need to create.`);
    }

    const videoPath = path.join(tmpDir, 'video.mp4');

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


    new ffmpeg(videoPath, (err, video) => {
      if (err) {
        console.log('Error: ' + err)
      }

      video.fnExtractFrameToJPG(framesDir, {
        frame_rate: 20,
        file_name: 'my_frame_%t_%s'
      }, (error, files) => {
        if (error) console.log('Error: ' + error)
      })

    })

    const zipPath = path.join(tmpDir, 'output.zip')
    execSync(`cd ${framesDir} && zip -r ${zipPath} .`)

    const zipKey = `processed/${fileKey.split('.')[0]}.zip`

    const zipFile = fs.readFileSync(zipPath)

    await s3.upload({
      Bucket: process.env.CLOUD_STORAGE_BUCKET ?? '',
      Key: zipKey,
      Body: zipFile
    }).promise()

    return true


  } catch (error) {
    throw new Error(JSON.stringify(error))
  }
}
