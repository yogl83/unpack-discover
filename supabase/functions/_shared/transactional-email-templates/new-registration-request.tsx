import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'МИЭМ НИУ ВШЭ — Партнёрства'
const PRIMARY_COLOR = '#1a5fb4'
const APP_URL = 'https://miem-partnership.lovable.app'

interface Props {
  adminName?: string
  applicantName?: string
  applicantEmail?: string
}

const NewRegistrationRequestEmail = ({ adminName, applicantName, applicantEmail }: Props) => (
  <Html lang="ru" dir="ltr">
    <Head />
    <Preview>Новая заявка на доступ: {applicantName || 'новый пользователь'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Новая заявка на доступ</Heading>
        <Text style={text}>
          {adminName ? `Здравствуйте, ${adminName}!` : 'Здравствуйте!'}
        </Text>
        <Text style={text}>
          Поступила новая заявка на доступ к системе управления партнёрствами МИЭМ.
        </Text>
        <Text style={detailLabel}>ФИО заявителя:</Text>
        <Text style={detailValue}>{applicantName || '—'}</Text>
        <Text style={detailLabel}>Email:</Text>
        <Text style={detailValue}>{applicantEmail || '—'}</Text>
        <Text style={text}>
          Пожалуйста, рассмотрите заявку в панели администратора.
        </Text>
        <Button style={button} href={`${APP_URL}/admin`}>
          Открыть панель администратора
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
  component: NewRegistrationRequestEmail,
  subject: (data: Record<string, any>) =>
    `Новая заявка на доступ: ${data.applicantName || 'новый пользователь'}`,
  displayName: 'Уведомление админа о новой заявке',
  previewData: { adminName: 'Администратор', applicantName: 'Иван Петров', applicantEmail: 'ivan@example.com' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif' }
const container = { padding: '32px 24px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: PRIMARY_COLOR, margin: '0 0 24px' }
const text = { fontSize: '15px', color: '#333333', lineHeight: '1.6', margin: '0 0 16px' }
const detailLabel = { fontSize: '13px', color: '#666666', margin: '0 0 2px', lineHeight: '1.4' }
const detailValue = { fontSize: '15px', color: '#111111', fontWeight: '600' as const, margin: '0 0 12px', lineHeight: '1.4' }
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
