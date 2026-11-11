import * as React from 'react'
import { Heading, Text } from '@react-email/components'
import { EmailShell, headingStyle, hintStyle, textStyle } from './brand'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <EmailShell preview="Seu código de verificação">
    <Heading style={headingStyle}>Código de verificação</Heading>
    <Text style={textStyle}>Use o código abaixo para confirmar que é você:</Text>
    <Text style={codeStyle}>{token}</Text>
    <Text style={hintStyle}>
      Se você não fez esta solicitação, ignore este e-mail com segurança.
    </Text>
  </EmailShell>
)

const codeStyle = {
  fontSize: '32px',
  fontWeight: 'bold' as const,
  letterSpacing: '0.3em',
  textAlign: 'center' as const,
  color: '#1a1714',
  backgroundColor: '#f5efe1',
  border: '2px solid #1a1714',
  borderRadius: '6px',
  padding: '14px 0',
  margin: '0 0 20px',
}

export default ReauthenticationEmail
