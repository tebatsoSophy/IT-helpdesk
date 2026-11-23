package com.company.helpdesk.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TicketUpdateRequest(
        @NotBlank @Size(max = 255) String title,
        @NotBlank @Size(max = 4000) String description,
        Long categoryId) {
}
