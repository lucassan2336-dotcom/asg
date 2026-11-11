import * as React from 'react'
import { Body, Container, Head, Html, Img, Preview, Section, Text } from '@react-email/components'

export const SITE_NAME = 'A.S.G. — Skatistas de Guararema'

export const colors = {
  ink: '#1a1714',
  cream: '#f5efe1',
  capy: '#a2662f',
  muted: '#5b554c',
}

export function EmailShell({
  preview,
  children,
}: {
  preview: string
  children: React.ReactNode
}) {
  return (
    <Html lang="pt-BR" dir="ltr">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Img src="https://assgma.app/logo-asg.png" width="96" height="96" alt="A.S.G." style={logoImg} />
            <Text style={logo}>A.S.G.</Text>
            <Text style={tagline}>Associação dos Skatistas de Guararema</Text>
          </Section>
          <Section style={content}>{children}</Section>
          <Text style={footer}>
            A.S.G. — Associação dos Skatistas de Guararema · Guararema/SP
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = {
  margin: '0 auto',
  maxWidth: '520px',
  border: `2px solid ${colors.ink}`,
  borderRadius: '8px',
  overflow: 'hidden' as const,
}
const logoImg = { display: 'block', margin: '0 auto 8px', borderRadius: '50%' }

const header = {
  backgroundColor: colors.cream,
  borderBottom: `2px solid ${colors.ink}`,
  padding: '20px 25px',
  textAlign: 'center' as const,
}
const logo = {
  fontSize: '28px',
  fontWeight: 'bold' as const,
  color: colors.ink,
  letterSpacing: '0.04em',
  margin: '0',
}
const tagline = {
  fontSize: '11px',
  color: colors.muted,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.12em',
  margin: '4px 0 0',
}
const content = { padding: '24px 25px 8px' }
const footer = {
  fontSize: '11px',
  color: '#999999',
  textAlign: 'center' as const,
  padding: '0 25px',
  margin: '24px 0 20px',
}

export const headingStyle = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: colors.ink,
  margin: '0 0 16px',
}

export const textStyle = {
  fontSize: '14px',
  color: colors.muted,
  lineHeight: '1.5',
  margin: '0 0 20px',
}

export const buttonStyle = {
  backgroundColor: colors.capy,
  color: colors.cream,
  fontSize: '14px',
  fontWeight: 'bold' as const,
  border: `2px solid ${colors.ink}`,
  borderRadius: '6px',
  padding: '12px 22px',
  textDecoration: 'none',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.06em',
}

export const hintStyle = { fontSize: '12px', color: '#999999', margin: '24px 0 0' }

export const linkStyle = { color: 'inherit', textDecoration: 'underline' }
