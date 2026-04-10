import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'МИЭМ НИУ ВШЭ — Партнёрства'
const PRIMARY_COLOR = '#1a5fb4'
const APP_URL = 'https://miem-partnership.lovable.app'

interface Props {
  name?: string
}

const AccessApprovedEmail = ({ name }: Props) => (
  <Html lang="ru" dir="ltr">
    <Head />
    <Preview>Ваш доступ к системе подтверждён</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Доступ подтверждён</Heading>
        <Text style={text}>
          {name ? `Здравствуйте, ${name}!` : 'Здравствуйте!'}
        </Text>
        <Text style={text}>
          Ваша заявка на доступ к системе управления партнёрствами МИЭМ одобрена.
          Теперь вы можете войти в систему, используя ваш email и пароль.
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
  component: AccessApprovedEmail,
  subject: 'Доступ к системе подтверждён',
  displayName: 'Доступ одобрен',
  previewData: { name: 'Иван Петров' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif' }
const container = { padding: '32px 24px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: PRIMARY_COLOR, margin: '0 0 24px' }
const text = { fontSize: '15px', color: '#333333', lineHeight: '1.6', margin: '0 0 16px' }
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
