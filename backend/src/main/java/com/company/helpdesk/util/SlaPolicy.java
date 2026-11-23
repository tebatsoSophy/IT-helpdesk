package com.company.helpdesk.util;

import com.company.helpdesk.entity.Priority;
import com.company.helpdesk.entity.Ticket;

import java.time.LocalDateTime;

/** Resolution-time targets per priority. Adjust the hours to match your own SLA. */
public final class SlaPolicy {

    private SlaPolicy() {
    }

    public static int targetHours(Priority priority) {
        return switch (priority) {
            case CRITICAL -> 4;
            case HIGH -> 8;
            case MEDIUM -> 24;
            case LOW -> 72;
        };
    }

    public static LocalDateTime dueAt(Ticket t) {
        return t.getCreatedAt() == null ? null : t.getCreatedAt().plusHours(targetHours(t.getPriority()));
    }

    /** Resolved tickets are judged at resolution time; active tickets against "now"; cancelled/closed-unresolved never breach. */
    public static boolean isBreached(Ticket t) {
        LocalDateTime due = dueAt(t);
        if (due == null) {
            return false;
        }
        if (t.getResolvedAt() != null) {
            return t.getResolvedAt().isAfter(due);
        }
        return t.getStatus().isActive() && LocalDateTime.now().isAfter(due);
    }
}
