import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'МИЭМ НИУ ВШЭ — Партнёрства'
const PRIMARY_COLOR = '#1a5fb4'

interface Props {
  name?: string
}

const RegistrationReceivedEmail = ({ name }: Props) => (
  <Html lang="ru" dir="ltr">
    <Head />
    <Preview>Ваша заявка на доступ принята</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Заявка принята</Heading>
        <Text style={text}>
          {name ? `Здравствуйте, ${name}!` : 'Здравствуйте!'}
        </Text>
        <Text style={text}>
          Ваша заявка на доступ к системе управления партнёрствами МИЭМ успешно зарегистрирована.
        </Text>
        <Text style={text}>
          Администратор рассмотрит вашу заявку в ближайшее время. После одобрения вы получите
          уведомление на этот адрес электронной почты.
        </Text>
        <Hr style={hr} />
        <Text style={footer}>
          {SITE_NAME}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: RegistrationReceivedEmail,
  subject: 'Заявка на доступ принята',
  displayName: 'Заявка на регистрацию принята',
  previewData: { name: 'Иван Петров' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif' }
const container = { padding: '32px 24px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: PRIMARY_COLOR, margin: '0 0 24px' }
const text = { fontSize: '15px', color: '#333333', lineHeight: '1.6', margin: '0 0 16px' }
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#999999', margin: '0' }
