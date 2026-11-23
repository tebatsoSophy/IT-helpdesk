package com.company.helpdesk.dto;

public record MyTicketSummary(long total, long open, long inProgress, long waitingForUser, long resolved,
                              long closed, long cancelled) {
}
