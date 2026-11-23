package com.company.helpdesk.dto;

import com.company.helpdesk.entity.Priority;
import com.company.helpdesk.entity.Ticket;
import com.company.helpdesk.entity.TicketStatus;
import com.company.helpdesk.util.SlaPolicy;

import java.time.LocalDateTime;

public record TicketResponse(
        Long id,
        String title,
        String description,
        TicketStatus status,
        Priority priority,
        CategoryResponse category,
        UserSummary requester,
        UserSummary assignee,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        LocalDateTime resolvedAt,
        String resolutionNotes,
        Long resolutionMinutes,
        LocalDateTime slaDueAt,
        boolean slaBreached) {

    public static TicketResponse from(Ticket t) {
        LocalDateTime due = SlaPolicy.dueAt(t);
        Long minutes = t.getResolvedAt() == null
                ? null
                : java.time.Duration.between(t.getCreatedAt(), t.getResolvedAt()).toMinutes();
        return new TicketResponse(
                t.getId(), t.getTitle(), t.getDescription(), t.getStatus(), t.getPriority(),
                CategoryResponse.from(t.getCategory()),
                UserSummary.from(t.getRequester()),
                UserSummary.from(t.getAssignee()),
                t.getCreatedAt(), t.getUpdatedAt(), t.getResolvedAt(), t.getResolutionNotes(),
                minutes, due, SlaPolicy.isBreached(t));
    }
}
