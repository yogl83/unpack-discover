/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as registrationReceived } from './registration-received.tsx'
import { template as accessApproved } from './access-approved.tsx'
import { template as accountCreated } from './account-created.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'registration-received': registrationReceived,
  'access-approved': accessApproved,
  'account-created': accountCreated,
}
