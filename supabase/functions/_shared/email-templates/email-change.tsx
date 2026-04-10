/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body, Button, Container, Head, Heading, Html, Link, Preview, Text,
} from 'npm:@react-email/components@0.0.22'

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({ siteName, email, newEmail, confirmationUrl }: EmailChangeEmailProps) => (
  <Html lang="ru" dir="ltr">
    <Head />
    <Preview>Подтверждение смены email для {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Подтверждение смены email</Heading>
        <Text style={text}>
          Вы запросили изменение адреса электронной почты для {siteName} с{' '}
          <Link href={`mailto:${email}`} style={link}>{email}</Link> на{' '}
          <Link href={`mailto:${newEmail}`} style={link}>{newEmail}</Link>.
        </Text>
        <Text style={text}>Нажмите кнопку ниже для подтверждения:</Text>
        <Button style={button} href={confirmationUrl}>Подтвердить смену email</Button>
        <Text style={footer}>Если вы не запрашивали это изменение, немедленно обезопасьте свою учётную запись.</Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif' }
const container = { padding: '32px 24px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1a5fb4', margin: '0 0 24px' }
const text = { fontSize: '15px', color: '#333333', lineHeight: '1.6', margin: '0 0 20px' }
const link = { color: '#1a5fb4', textDecoration: 'underline' }
const button = { backgroundColor: '#1a5fb4', color: '#ffffff', fontSize: '15px', fontWeight: '600' as const, borderRadius: '6px', padding: '12px 28px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#999999', margin: '24px 0 0' }
