package com.company.helpdesk.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Self-service profile update. Changing the password requires the current one. */
public record UpdateProfileRequest(
        @NotBlank @Size(max = 255) String fullName,
        String currentPassword,
        @Size(min = 8, max = 100) String newPassword) {
}
