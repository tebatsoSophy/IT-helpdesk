package com.company.helpdesk.dto;

import com.company.helpdesk.entity.Role;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Admin update. Leave {@code password} null to keep the current one. */
public record UpdateUserRequest(
        @NotBlank @Size(max = 255) String fullName,
        @NotNull Role role,
        @Size(min = 8, max = 100) String password) {
}
