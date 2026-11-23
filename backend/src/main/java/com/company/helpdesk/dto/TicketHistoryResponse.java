package com.company.helpdesk.dto;

import com.company.helpdesk.entity.TicketHistory;

import java.time.LocalDateTime;

public record TicketHistoryResponse(Long id, UserSummary changedBy, String field, String oldValue, String newValue,
                                    LocalDateTime changedAt) {

    public static TicketHistoryResponse from(TicketHistory h) {
        return new TicketHistoryResponse(h.getId(), UserSummary.from(h.getChangedBy()), h.getFieldName(),
                h.getOldValue(), h.getNewValue(), h.getChangedAt());
    }
}
