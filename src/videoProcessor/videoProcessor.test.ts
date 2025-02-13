import { main } from './videoProcessor'
import AWS from 'aws-sdk'
import fs from 'fs'
import path from 'path'
import ffmpeg from 'fluent-ffmpeg'
import archiver from 'archiver'
import * as sendMail from '../mailer/sendMail'

jest.mock('aws-sdk')
jest.mock('fs')
jest.mock('fluent-ffmpeg')
jest.mock('archiver')
jest.mock('../mailer/sendMail')

describe('Video Processor', () => {
  const s3Mock = AWS.S3 as jest.MockedClass<typeof AWS.S3>
  const sendMailMock = sendMail.main as jest.MockedFunction<typeof sendMail.main>
  const fsMock = fs as jest.Mocked<typeof fs>

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should process the video successfully', async () => {
    const event = {
      Records: [
        {
          body: JSON.stringify({
            email: 'test@example.com',
            fileName: 'video.mp4',
            fileKey: 'videos/video.mp4',
          }), // Make sure to stringify this correctly
        },
      ],
    }

    // Mocking S3 methods
    const getObjectMock = jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({
        Body: Buffer.from('video content'),
      }),
    })

    const uploadMock = jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({}),
    })

    const getSignedUrlMock = jest.fn().mockResolvedValue('https://signedurl.com')

    s3Mock.prototype.getObject = getObjectMock
    s3Mock.prototype.upload = uploadMock
    s3Mock.prototype.getSignedUrlPromise = getSignedUrlMock

    // Mocking fs methods
    fsMock.existsSync.mockReturnValue(false)
    fsMock.mkdirSync.mockImplementation(() => undefined)
    fsMock.writeFileSync.mockImplementation(() => {})
    fsMock.readFileSync.mockReturnValue(Buffer.from('zip content'))

    // Mocking ffmpeg as a function
    const ffmpegMock = ffmpeg as jest.MockedFunction<typeof ffmpeg>
    
    // Mocking the required methods used in your code
    const ffmpegCommandMock = {
      on: jest.fn().mockReturnThis(),
      output: jest.fn().mockReturnThis(),
      outputOptions: jest.fn().mockReturnThis(),
      run: jest.fn().mockReturnThis(),
    }

    ffmpegMock.mockReturnValue(ffmpegCommandMock as any)

    // Mocking archiver as a function
    const archiverMock = archiver as jest.MockedFunction<typeof archiver>
    const archiveMock = {
      pipe: jest.fn(),
      directory: jest.fn(),
      finalize: jest.fn(),
    }

    archiverMock.mockReturnValue(archiveMock as any)

    // Mocking sendMail function
    sendMailMock.mockResolvedValue(true)

    // Calling the main function
    const result = await main(event as any)  // Cast event to `any` to bypass the type check

    expect(result).toBe(true)
    expect(getObjectMock).toHaveBeenCalledWith({
      Bucket: process.env.CLOUD_STORAGE_BUCKET,
      Key: 'videos/video.mp4',
    })
    expect(fsMock.mkdirSync).toHaveBeenCalled()
    expect(ffmpegMock).toHaveBeenCalled()
    expect(archiveMock.finalize).toHaveBeenCalled()
    expect(uploadMock).toHaveBeenCalled()
    expect(sendMailMock).toHaveBeenCalledWith(expect.objectContaining({
      Records: expect.arrayContaining([expect.objectContaining({
        body: expect.objectContaining({
          success: true,
          signedUrl: 'https://signedurl.com',
        }),
      })]),
    }))
  })
})
