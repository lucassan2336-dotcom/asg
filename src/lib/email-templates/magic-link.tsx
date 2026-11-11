import * as React from 'react'
import { Button, Heading, Text } from '@react-email/components'
import { EmailShell, buttonStyle, headingStyle, hintStyle, textStyle } from './brand'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ siteName, confirmationUrl }: MagicLinkEmailProps) => (
  <EmailShell preview={`Seu link de acesso à ${siteName}`}>
    <Heading style={headingStyle}>Seu link de acesso</Heading>
    <Text style={textStyle}>
      Clique no botão abaixo para entrar na sua conta da {siteName}, sem precisar de senha:
    </Text>
    <Button style={buttonStyle} href={confirmationUrl}>
      Entrar na minha conta
    </Button>
    <Text style={hintStyle}>
      Se você não solicitou este link, pode ignorar este e-mail com segurança.
    </Text>
  </EmailShell>
)

export default MagicLinkEmail
