import AWS from 'aws-sdk'
import { main } from './sendMail'

// Mock do AWS SDK
jest.mock('aws-sdk', () => {
  const mockSES = {
    sendEmail: jest.fn().mockReturnThis(),
    promise: jest.fn(),
  }

  return {
    SES: jest.fn(() => mockSES),
  }
})

// Mock das variáveis de ambiente
jest.mock('dotenv', () => ({
  config: jest.fn(),
}))

// Mock dos templates de email
jest.mock('./mailTemplatesHelper', () => ({
  templates: {
    success: {
      Body: {
        Text: {
          Data: 'Success {{fileName}} {{signedUrl}}',
          Charset: 'UTF-8',
        },
        Html: {
          Data: '<p>Success {{fileName}} {{signedUrl}}</p>',
          Charset: 'UTF-8',
        },
      },
      Subject: 'Success Subject',
    },
    fail: {
      Body: {
        Text: {
          Data: 'Fail {{fileName}} {{signedUrl}}',
          Charset: 'UTF-8',
        },
        Html: {
          Data: '<p>Fail {{fileName}} {{signedUrl}}</p>',
          Charset: 'UTF-8',
        },
      },
      Subject: 'Fail Subject',
    },
  },
}))

const mockedSES = new AWS.SES() as jest.Mocked<AWS.SES>
const mockedSendEmail = mockedSES.sendEmail as jest.Mock

describe('Email Service', () => {
  beforeEach(() => {
    process.env.CLOUD_ACCESS_KEY = 'test-key'
    process.env.CLOUD_SECRET_KEY = 'test-secret'
    process.env.CLOUD_REGION = 'test-region'
    process.env.CLOUD_EMAIL = 'no-reply@example.com'

    jest.clearAllMocks()
  })

  it('should initialize SES', () => {
    new AWS.SES()
    expect(AWS.SES).toHaveBeenCalled()
  })

  it('should send success email with replaced parameters', async () => {
    const mockEvent = {
      Records: [{
        body: {
          email: 'user@example.com',
          fileName: 'video.mp4',
          success: true,
          signedUrl: 'https://example.com/video.mp4',
        }
      }]
    } as any

    mockedSendEmail.mockImplementation(() => ({
      promise: jest.fn().mockResolvedValueOnce({}),
    }))

    const result = await main(mockEvent)

    expect(result).toBe(true)
    expect(mockedSendEmail).toHaveBeenCalledWith({
      Destination: {
        ToAddresses: ['user@example.com'],
      },
      Message: {
        Body: {
          Text: {
            Data: 'Success video.mp4 https://example.com/video.mp4',
            Charset: 'UTF-8',
          },
          Html: {
            Data: '<p>Success video.mp4 https://example.com/video.mp4</p>',
            Charset: 'UTF-8',
          },
        },
        Subject: 'Success Subject',
      },
      Source: 'no-reply@example.com',
    })
  })

  it('should send fail email with replaced parameters', async () => {
    const mockEvent = {
      Records: [{
        body: {
          email: 'user@example.com',
          fileName: 'video.mp4',
          success: false,
        }
      }]
    } as any

    mockedSendEmail.mockImplementation(() => ({
      promise: jest.fn().mockResolvedValueOnce({}),
    }))

    const result = await main(mockEvent)

    expect(result).toBe(true)
    expect(mockedSendEmail).toHaveBeenCalledWith({
      Destination: {
        ToAddresses: ['user@example.com'],
      },
      Message: {
        Body: {
          Text: {
            Data: 'Fail video.mp4 undefined',
            Charset: 'UTF-8',
          },
          Html: {
            Data: '<p>Fail video.mp4 undefined</p>',
            Charset: 'UTF-8',
          },
        },
        Subject: 'Fail Subject',
      },
      Source: 'no-reply@example.com',
    })
  })

  it('should return false when missing email or fileName', async () => {
    const mockEvent = {
      Records: [{
        body: {
          success: true,
          signedUrl: 'https://example.com/video.mp4',
        }
      }]
    } as any

    const result = await main(mockEvent)

    expect(result).toBe(false)
    expect(mockedSendEmail).not.toHaveBeenCalled()
  })

  it('should return false when SES fails', async () => {
    const mockEvent = {
      Records: [{
        body: {
          email: 'user@example.com',
          fileName: 'video.mp4',
          success: true,
          signedUrl: 'https://example.com/video.mp4',
        }
      }]
    } as any

    mockedSendEmail.mockImplementation(() => ({
      promise: jest.fn().mockRejectedValueOnce(new Error('SES Error')),
    }))

    const result = await main(mockEvent)

    expect(result).toBe(false)
  })
})