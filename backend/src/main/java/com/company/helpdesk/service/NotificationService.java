package com.company.helpdesk.service;

import com.company.helpdesk.entity.Ticket;
import com.company.helpdesk.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

/** Builds notification emails and publishes them; delivery happens after the transaction commits. */
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final ApplicationEventPublisher publisher;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    public void notifyAbout(User recipient, User actor, Ticket ticket, String headline) {
        if (recipient == null || !recipient.isActive() || recipient.getEmail() == null) {
            return;
        }
        if (actor != null && recipient.getId().equals(actor.getId())) {
            return;   // nobody needs an email about their own action
        }
        String subject = "[Help Desk #%d] %s".formatted(ticket.getId(), headline);
        String body = """
                Hi %s,

                %s

                Ticket #%d: %s
                Open it: %s/tickets/%d
                """.formatted(recipient.getFullName(), headline, ticket.getId(), ticket.getTitle(),
                frontendUrl, ticket.getId());
        publisher.publishEvent(new NotificationEvent(recipient.getEmail(), subject, body));
    }
}
