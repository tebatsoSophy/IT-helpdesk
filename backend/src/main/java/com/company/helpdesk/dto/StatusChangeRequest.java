package com.company.helpdesk.dto;

import com.company.helpdesk.entity.TicketStatus;
import jakarta.validation.constraints.NotNull;

public record StatusChangeRequest(@NotNull TicketStatus status) {
}
