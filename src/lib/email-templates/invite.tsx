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

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ siteName, siteUrl, confirmationUrl }: InviteEmailProps) => (
  <EmailShell preview={`Você foi convidado para a ${siteName}`}>
    <Heading style={headingStyle}>Você foi convidado!</Heading>
    <Text style={textStyle}>
      Você recebeu um convite para participar da{' '}
      <Link href={siteUrl} style={linkStyle}>
        <strong>{siteName}</strong>
      </Link>
      .
    </Text>
    <Text style={textStyle}>Clique no botão abaixo para aceitar o convite e criar sua conta:</Text>
    <Button style={buttonStyle} href={confirmationUrl}>
      Aceitar convite
    </Button>
    <Text style={hintStyle}>Se você não esperava este convite, pode ignorar este e-mail.</Text>
  </EmailShell>
)

export default InviteEmail
