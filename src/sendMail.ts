import AWS from "aws-sdk"
import dotenv from "dotenv"

dotenv.config()

export const main = async (event: any): Promise<boolean> => {
  const ses = new AWS.SES({
    accessKeyId: process.env.CLOUD_ACCESS_KEY,
    secretAccessKey: process.env.CLOUD_SECRET_KEY,
    region: process.env.CLOUD_REGION,
  })

  try {
    const { email, fileName } = JSON.parse(JSON.stringify(event.Records[0].body))

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
            Charset: "UTF-8",
            Data: `
            Ocorreu um problema no processamento do seu vídeo ${fileName}
            Por favor, inicie o processo de upload novamente.
            
            Caso o problema persista, entre em contato com o suporte.
            
            Atenciosamente,
            Video Processor Team`
          },
          Html: {
            Charset: "UTF-8",
            Data: `
            <html>
              <body>
                <p>Ocorreu um problema no processamento do seu vídeo <strong>${fileName}</strong>.</p>
                <p>Por favor, inicie o processo de upload novamente.</p>
                <p>Caso o problema persista, entre em contato com o suporte.</p>
                <br>
                <p>Atenciosamente,</p>
                <p><strong>Video Processor Team</strong></p>
              </body>
            </html>`
          }
        },
        Subject: {
          Charset: "UTF-8",
          Data: "Houve um problema no processamento do seu vídeo"
        }
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