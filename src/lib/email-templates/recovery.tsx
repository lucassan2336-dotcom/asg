import * as React from 'react'
import { Button, Heading, Text } from '@react-email/components'
import { EmailShell, buttonStyle, headingStyle, hintStyle, textStyle } from './brand'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ siteName, confirmationUrl }: RecoveryEmailProps) => (
  <EmailShell preview={`Redefina sua senha da ${siteName}`}>
    <Heading style={headingStyle}>Redefinir senha</Heading>
    <Text style={textStyle}>
      Recebemos um pedido para redefinir a senha da sua conta na {siteName}.
    </Text>
    <Text style={textStyle}>Clique no botão abaixo para escolher uma nova senha:</Text>
    <Button style={buttonStyle} href={confirmationUrl}>
      Redefinir senha
    </Button>
    <Text style={hintStyle}>
      Se você não pediu a redefinição, ignore este e-mail — sua senha atual continua valendo.
    </Text>
  </EmailShell>
)

export default RecoveryEmail
