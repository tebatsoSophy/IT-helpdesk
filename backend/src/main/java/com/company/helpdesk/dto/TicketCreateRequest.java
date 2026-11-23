package com.company.helpdesk.dto;

import com.company.helpdesk.entity.Priority;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** {@code priority} defaults to MEDIUM when omitted. */
public record TicketCreateRequest(
        @NotBlank @Size(max = 255) String title,
        @NotBlank @Size(max = 4000) String description,
        Priority priority,
        Long categoryId) {
}
