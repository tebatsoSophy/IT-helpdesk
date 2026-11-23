package com.company.helpdesk.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Sends the email when a mail server is configured (spring.mail.host); otherwise just logs the notification,
 * which is what you want while developing.
 */
@Component
@Slf4j
public class EmailNotificationListener {

    private final ObjectProvider<JavaMailSender> mailSender;
    private final String from;

    public EmailNotificationListener(ObjectProvider<JavaMailSender> mailSender,
                                     @Value("${app.mail.from}") String from) {
        this.mailSender = mailSender;
        this.from = from;
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onNotification(NotificationEvent event) {
        JavaMailSender sender = mailSender.getIfAvailable();
        if (sender == null) {
            log.info("[notification] to={} subject=\"{}\"", event.to(), event.subject());
            return;
        }
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(from);
            message.setTo(event.to());
            message.setSubject(event.subject());
            message.setText(event.body());
            sender.send(message);
        } catch (Exception ex) {
            log.warn("Could not send notification to {}: {}", event.to(), ex.getMessage());
        }
    }
}
