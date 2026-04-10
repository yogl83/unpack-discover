/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body, Button, Container, Head, Heading, Html, Link, Preview, Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({ siteName, siteUrl, recipient, confirmationUrl }: SignupEmailProps) => (
  <Html lang="ru" dir="ltr">
    <Head />
    <Preview>Подтвердите email для {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Подтверждение email</Heading>
        <Text style={text}>
          Спасибо за регистрацию в{' '}
          <Link href={siteUrl} style={link}><strong>{siteName}</strong></Link>!
        </Text>
        <Text style={text}>
          Пожалуйста, подтвердите ваш адрес (<Link href={`mailto:${recipient}`} style={link}>{recipient}</Link>), нажав кнопку ниже:
        </Text>
        <Button style={button} href={confirmationUrl}>Подтвердить email</Button>
        <Text style={footer}>Если вы не создавали учётную запись, проигнорируйте это письмо.</Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif' }
const container = { padding: '32px 24px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1a5fb4', margin: '0 0 24px' }
const text = { fontSize: '15px', color: '#333333', lineHeight: '1.6', margin: '0 0 20px' }
const link = { color: '#1a5fb4', textDecoration: 'underline' }
const button = { backgroundColor: '#1a5fb4', color: '#ffffff', fontSize: '15px', fontWeight: '600' as const, borderRadius: '6px', padding: '12px 28px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#999999', margin: '24px 0 0' }
