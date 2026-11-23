package com.company.helpdesk.dto;

import com.company.helpdesk.entity.Priority;
import com.company.helpdesk.entity.TicketStatus;

import java.time.LocalDate;

/** Search criteria for ticket lists. Every field is optional. */
public record TicketFilter(
        TicketStatus status,
        Priority priority,
        Long categoryId,
        Long assigneeId,
        Long requesterId,
        Boolean unassigned,
        LocalDate from,
        LocalDate to,
        String q) {

    public TicketFilter withRequester(Long id) {
        return new TicketFilter(status, priority, categoryId, assigneeId, id, unassigned, from, to, q);
    }

    public TicketFilter withAssignee(Long id) {
        return new TicketFilter(status, priority, categoryId, id, requesterId, unassigned, from, to, q);
    }
}
