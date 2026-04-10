/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body, Container, Head, Heading, Html, Preview, Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="ru" dir="ltr">
    <Head />
    <Preview>Код подтверждения</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Подтверждение личности</Heading>
        <Text style={text}>Используйте код ниже для подтверждения:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>Код действует ограниченное время. Если вы не запрашивали его, проигнорируйте это письмо.</Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif' }
const container = { padding: '32px 24px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1a5fb4', margin: '0 0 24px' }
const text = { fontSize: '15px', color: '#333333', lineHeight: '1.6', margin: '0 0 20px' }
const codeStyle = { fontFamily: 'Courier, monospace', fontSize: '24px', fontWeight: 'bold' as const, color: '#1a5fb4', margin: '0 0 24px', letterSpacing: '4px' }
const footer = { fontSize: '12px', color: '#999999', margin: '24px 0 0' }
