# Notifications Catalog (Phase 1)

## Scope

This document inventories current notification emitters, types, and delivery channels.
It is a baseline for consolidation in Phase 2.

## Delivery Channels

- Toast (ephemeral, local UI)
- In-app (persistent, stored in enhanced_notifications)
- SMS (Twilio via Node endpoint)
- Email (SendGrid via Node endpoint)
- Push (PWA simulated via service worker message)

## Emitters (current)

- AlertService (deadline and overdue alerts)
- PaymentService (payment status notifications)
- DataService (execution date proposal/approval notifications)
- WorkflowServiceSimplified (service assignment notifications)
- NotificationService (toast only)
- InAppNotificationService (enhanced notifications + realtime subscription)

## Notification Types (used)

- deadline_warning
  - Source: AlertService -> notifyServiceRequestStakeholders
  - Channel: in-app (enhanced_notifications)
  - Dedupe: daily (deadline_alerts_sent + RPC)
- overdue_alert
  - Source: AlertService -> notifyServiceRequestStakeholders
  - Channel: in-app (enhanced_notifications)
  - Dedupe: daily (deadline_alerts_sent + RPC)
- payment_due
  - Source: PaymentService -> notifyServiceRequestStakeholders / notifyByRole
  - Channel: in-app (enhanced_notifications)
- payment_completed
  - Source: PaymentService -> notifyServiceRequestStakeholders
  - Channel: in-app (enhanced_notifications)
- execution_date_proposal
  - Source: DataService -> createEnhancedNotification
  - Channel: in-app (enhanced_notifications)
- execution_date_approved
  - Source: DataService -> createEnhancedNotification
  - Channel: in-app (enhanced_notifications)
- execution_date_rejected
  - Source: DataService -> createEnhancedNotification
  - Channel: in-app (enhanced_notifications)
- service_assigned
  - Source: WorkflowServiceSimplified -> InAppNotificationService.createNotification
  - Channel: in-app (enhanced_notifications)

## Notification Types (defined but not clearly emitted)

These exist in NotificationType but were not found as emitters in the current scan:

- quote_request, quote_sent, quote_approved, quote_rejected
- professional_assigned, professional_accepted, professional_rejected
- work_scheduled, work_started, work_completed
- evaluation_pending
- clarification_requested, clarification_provided
- general

## Recipient Rules (current)

- AlertService uses service status to decide stakeholders and priority, then calls notifyServiceRequestStakeholders.
- PaymentService targets client/professional/admin depending on payment event.
- DataService targets admin and professional for execution date flow.

## Dedupe Strategy (current)

- AlertService stores daily keys in service_requests.deadline_alerts_sent
- AlertService also uses RPC mark_service_request_daily_alert_sent to avoid duplicate sends across sessions

## Dedupe Key (proposed)

Use a canonical dedupe key for idempotent notifications:

- `user_id`, `type`, `service_request_id`, `dedupe_date`

Suggested unique index (example):

```
create unique index if not exists enhanced_notifications_dedupe
on enhanced_notifications (user_id, type, service_request_id, dedupe_date);
```

Notes:

- `dedupe_date` can be a generated column derived from `created_at::date`.
- For non-daily notifications, omit `dedupe_date` and use a different key.

## Gaps / Mismatches

- InAppNotificationService.createNotification accepted string for type (now typed to NotificationType)
- UI icon mapping contains types that are not currently emitted (service_accepted, service_scheduled, service_completed, payment_received)

## Phase 2 Follow-up

- Consolidate enhanced_notifications writes to a single service
- Add explicit dedupe keys for all types that need idempotency
- Align UI icon mapping with actual emitted types
