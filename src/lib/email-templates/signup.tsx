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

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <EmailShell preview={`Confirme seu e-mail para acessar a ${siteName}`}>
    <Heading style={headingStyle}>Confirme seu e-mail</Heading>
    <Text style={textStyle}>
      Obrigado por se cadastrar na{' '}
      <Link href={siteUrl} style={linkStyle}>
        <strong>{siteName}</strong>
      </Link>
      !
    </Text>
    <Text style={textStyle}>
      Para ativar sua conta, confirme o endereço (
      <Link href={`mailto:${recipient}`} style={linkStyle}>
        {recipient}
      </Link>
      ) clicando no botão abaixo:
    </Text>
    <Button style={buttonStyle} href={confirmationUrl}>
      Confirmar e-mail
    </Button>
    <Text style={hintStyle}>
      Se você não criou uma conta, pode ignorar este e-mail com segurança.
    </Text>
  </EmailShell>
)

export default SignupEmail
