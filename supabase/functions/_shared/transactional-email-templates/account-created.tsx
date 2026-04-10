import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Text, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'МИЭМ НИУ ВШЭ — Партнёрства'
const PRIMARY_COLOR = '#1a5fb4'
const APP_URL = 'https://miem-partnership.lovable.app'

interface Props {
  name?: string
  email?: string
  password?: string
  role?: string
}

const AccountCreatedEmail = ({ name, email, password, role }: Props) => (
  <Html lang="ru" dir="ltr">
    <Head />
    <Preview>Для вас создана учётная запись</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Учётная запись создана</Heading>
        <Text style={text}>
          {name ? `Здравствуйте, ${name}!` : 'Здравствуйте!'}
        </Text>
        <Text style={text}>
          Для вас создана учётная запись в системе управления партнёрствами МИЭМ.
        </Text>
        <Section style={credentialsBox}>
          {email && <Text style={credentialLine}><strong>Логин:</strong> {email}</Text>}
          {password && <Text style={credentialLine}><strong>Пароль:</strong> {password}</Text>}
          {role && <Text style={credentialLine}><strong>Роль:</strong> {role}</Text>}
        </Section>
        <Text style={textSmall}>
          Рекомендуем сменить пароль после первого входа.
        </Text>
        <Button style={button} href={`${APP_URL}/auth`}>
          Войти в систему
        </Button>
        <Hr style={hr} />
        <Text style={footer}>
          {SITE_NAME}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AccountCreatedEmail,
  subject: 'Учётная запись создана',
  displayName: 'Аккаунт создан администратором',
  previewData: { name: 'Иван Петров', email: 'ivanov@example.com', password: 'temp123456', role: 'analyst' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif' }
const container = { padding: '32px 24px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: PRIMARY_COLOR, margin: '0 0 24px' }
const text = { fontSize: '15px', color: '#333333', lineHeight: '1.6', margin: '0 0 16px' }
const textSmall = { fontSize: '13px', color: '#666666', lineHeight: '1.5', margin: '0 0 16px' }
const credentialsBox = {
  backgroundColor: '#f3f4f6',
  borderRadius: '8px',
  padding: '16px 20px',
  margin: '0 0 16px',
}
const credentialLine = { fontSize: '14px', color: '#333333', margin: '0 0 6px', lineHeight: '1.5' }
const button = {
  backgroundColor: PRIMARY_COLOR,
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600' as const,
  padding: '12px 28px',
  borderRadius: '6px',
  textDecoration: 'none',
  display: 'inline-block' as const,
  margin: '8px 0 0',
}
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#999999', margin: '0' }
