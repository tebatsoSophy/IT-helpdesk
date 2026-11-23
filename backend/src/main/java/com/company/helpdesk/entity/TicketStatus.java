package com.company.helpdesk.entity;

public enum TicketStatus {
    OPEN, IN_PROGRESS, WAITING_FOR_USER, RESOLVED, CLOSED, CANCELLED;

    /** Closed and cancelled tickets accept no further changes. */
    public boolean isFinal() {
        return this == CLOSED || this == CANCELLED;
    }

    /** Tickets that still need work (the SLA clock is running). */
    public boolean isActive() {
        return this == OPEN || this == IN_PROGRESS || this == WAITING_FOR_USER;
    }
}
