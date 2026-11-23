package com.company.helpdesk.dto;

import com.company.helpdesk.entity.Priority;
import jakarta.validation.constraints.NotNull;

public record PriorityChangeRequest(@NotNull Priority priority) {
}
