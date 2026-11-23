package com.company.helpdesk.dto;

import com.company.helpdesk.entity.Role;
import com.company.helpdesk.entity.User;

import java.time.LocalDateTime;

public record UserResponse(Long id, String email, String fullName, Role role, boolean active, LocalDateTime createdAt) {

    public static UserResponse from(User u) {
        return new UserResponse(u.getId(), u.getEmail(), u.getFullName(), u.getRole(), u.isActive(), u.getCreatedAt());
    }
}
