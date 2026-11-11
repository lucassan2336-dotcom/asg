import * as React from 'react'
import { Button, Heading, Link, Text } from '@react-email/components'
import {
  EmailShell,
  buttonStyle,
  headingStyle,
  hintStyle,
  linkStyle,
  textStyle,
} from './brand'

interface EmailChangeEmailProps {
  siteName: string
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  oldEmail,
  email,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <EmailShell preview={`Confirme seu novo e-mail na ${siteName}`}>
    <Heading style={headingStyle}>Confirme seu novo e-mail</Heading>
    <Text style={textStyle}>
      Você pediu para trocar o e-mail da sua conta na {siteName} de{' '}
      <Link href={`mailto:${oldEmail || email}`} style={linkStyle}>
        {oldEmail || email}
      </Link>{' '}
      para{' '}
      <Link href={`mailto:${newEmail}`} style={linkStyle}>
        <strong>{newEmail}</strong>
      </Link>
      .
    </Text>
    <Text style={textStyle}>Clique no botão abaixo para confirmar a alteração:</Text>
    <Button style={buttonStyle} href={confirmationUrl}>
      Confirmar novo e-mail
    </Button>
    <Text style={hintStyle}>
      Se você não pediu essa troca, ignore este e-mail — o endereço atual continua valendo.
    </Text>
  </EmailShell>
)

export default EmailChangeEmail
