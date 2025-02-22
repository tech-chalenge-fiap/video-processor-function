import AWS from "aws-sdk"
import dotenv from "dotenv"
import { templates } from "./mailTemplatesHelper"
import { IVideoProcessorEvent } from "../videoProcessor/videoProcessor"

dotenv.config()

export const main = async (event: IVideoProcessorEvent): Promise<boolean> => {
  const ses = new AWS.SES({
    accessKeyId: process.env.CLOUD_ACCESS_KEY,
    secretAccessKey: process.env.CLOUD_SECRET_KEY,
    region: process.env.CLOUD_REGION,
  })

  try {
    const record = event.Records[0]
    const body = typeof record.body === 'string' ? JSON.parse(record.body) : record.body

    const { email, fileName, success, signedUrl } = body

    const { Body, Subject } = templates[success ? 'success' : 'fail']

    console.log(record, record)
    console.log('eventParams', {
      email,
      fileName,
      event: JSON.stringify(event)
    })

    if (!email || !fileName) {
      throw new Error('Faltam informações para enviar o email')
    }

    const params = {
      Destination: {
        ToAddresses: [email]
      },
      Message: {
        Body: {
          Text: {
            ...Body.Text,
            Data: Body.Text.Data.replace('{{fileName}}', fileName).replace('{{signedUrl}}', signedUrl)
          },
          Html: {
            ...Body.Html,
            Data: Body.Html.Data.replace('{{fileName}}', fileName).replace('{{signedUrl}}', signedUrl)
          }
        },
        Subject
      },
      Source: process.env.CLOUD_EMAIL ?? ''
    }

    await ses.sendEmail(params).promise()

    return true
  } catch (error) {
    console.error('Error sending email', error)
    return false
  }
}