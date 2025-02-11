import { main, IVideoProcessorEvent } from './videoProcessor';
import * as sendMail from '../mailer/sendMail';

jest.mock('aws-sdk', () => {
  const s3Mock = {
    getObject: jest.fn(() => ({
      promise: jest.fn().mockResolvedValue({
        Body: Buffer.from('dummy video content')
      })
    })),
    upload: jest.fn(() => ({
      promise: jest.fn().mockResolvedValue({})
    })),
    getSignedUrlPromise: jest.fn().mockResolvedValue('http://signed.url')
  };

  return {
    S3: jest.fn(() => s3Mock)
  };
});

jest.mock('fluent-ffmpeg', () => {
  const listeners: Record<string, (err?: Error) => void> = {};
  const ffmpegMock: any = jest.fn(() => ({
    on: function (event: string, callback: (err?: Error) => void) {
      listeners[event] = callback;
      return this;
    },
    output: function () {
      return this;
    },
    outputOptions: function () {
      return this;
    },
    run: function () {
      setImmediate(() => {
        if (listeners['end']) {
          listeners['end']();
        }
      });
    },
  }));

  ffmpegMock.setFfmpegPath = jest.fn();

  return ffmpegMock;
});

jest.mock('../mailer/sendMail', () => ({
  main: jest.fn().mockResolvedValue(true)
}));

describe('Video Processor main function', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should process video and send mail successfully', async () => {
    const event: IVideoProcessorEvent = {
      Records: [{
        body: {
          email: 'test@example.com',
          fileName: 'video.mp4',
          fileKey: 'video.mp4'
        }
      }]
    };

    const result = await main(event);
    expect(result).toBe(true);

    expect(sendMail.main).toHaveBeenCalledTimes(1);
    const sendMailArg = (sendMail.main as jest.Mock).mock.calls[0][0];
    expect(sendMailArg.Records[0].body).toMatchObject({
      email: 'test@example.com',
      fileName: 'video.mp4',
      fileKey: 'video.mp4',
      success: true,
      signedUrl: 'http://signed.url'
    });
  });
});