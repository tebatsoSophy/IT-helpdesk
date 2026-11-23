package com.company.helpdesk.service;

/** Fully rendered message, so the listener never needs a database session. */
public record NotificationEvent(String to, String subject, String body) {
}
