export const templates = {
  success: {
    Subject: {
      Charset: "UTF-8",
      Data: 'O processamento do seu vídeo foi concluído',
    },
    Body: {
      Text: {
        Charset: "UTF-8",
        Data: `
            O processamento do seu vídeo {{fileName}} foi concluído.
            Você pode baixar o arquivo clicando no link abaixo:
            
            {{signedUrl}}
            
            Atenciosamente,
            Video Processor Team`
      },
      Html: {
        Charset: "UTF-8",
        Data: `
            <html>
              <body>
                <p>O processamento do seu vídeo <strong>{{fileName}}</strong> foi concluído.</p>
                <p>Você pode baixar o arquivo clicando no link abaixo:</p>
                <br>
                <a href="{{signedUrl}}">Baixar arquivo</a>
                <br>
                <br>
                <p>Atenciosamente,</p>
                <p><strong>Video Processor Team</strong></p>
              </body>
            </html>`
      }
    }
  },
  fail: {
    Subject: {
      Charset: "UTF-8",
      Data: 'Houve um problema no processamento do seu vídeo',
    },
    Body: {
      Text: {
        Charset: "UTF-8",
        Data: `
            Ocorreu um problema no processamento do seu vídeo {{fileName}}
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
                <p>Ocorreu um problema no processamento do seu vídeo <strong>{{fileName}}</strong>.</p>
                <p>Por favor, inicie o processo de upload novamente.</p>
                <p>Caso o problema persista, entre em contato com o suporte.</p>
                <br>
                <p>Atenciosamente,</p>
                <p><strong>Video Processor Team</strong></p>
              </body>
            </html>`
      }
    }
  }
}