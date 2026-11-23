package com.company.helpdesk.dto;

import com.company.helpdesk.entity.User;

/** Minimal user info embedded in tickets, comments and history. */
public record UserSummary(Long id, String fullName, String email) {

    public static UserSummary from(User u) {
        return u == null ? null : new UserSummary(u.getId(), u.getFullName(), u.getEmail());
    }
}
